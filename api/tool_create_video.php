<?php
/**
 * Create Video from Image using KIE.ai Veo3 API
 * Runs as background job - takes job_id from CLI or queues via POST
 */
require_once __DIR__ . '/../config.php';

function log_video_debug(string $message, array $context = []): void {
    $path = __DIR__ . '/../storage/video_debug.log';
    $dir = dirname($path);
    if (!file_exists($dir)) {
        mkdir($dir, 0777, true);
    }
    $line = date('Y-m-d H:i:s') . ' ' . $message;
    if ($context) {
        $line .= ' ' . json_encode($context, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
    file_put_contents($path, $line . PHP_EOL, FILE_APPEND);
}

function encode_image_for_kie(string $path, string $aspect_ratio): ?array {
    if (!is_file($path)) {
        return null;
    }
    $raw = @file_get_contents($path);
    if (!$raw) {
        return null;
    }
    $info = @getimagesize($path);
    $width = $info[0] ?? 0;
    $height = $info[1] ?? 0;
    if (!$width || !$height) {
        return null;
    }
    if (!function_exists('imagecreatefromstring')) {
        return null;
    }
    // KIE appears to be strict with payload size; keep a small target and compress.
    $max_bytes = 200 * 1024; // 200KB safety limit
    $target_w = $aspect_ratio === '1:1' ? 512 : 576;
    $target_h = $aspect_ratio === '1:1' ? 512 : 1024;
    $scale = min($target_w / $width, $target_h / $height, 1);
    $new_w = (int)max(1, floor($width * $scale));
    $new_h = (int)max(1, floor($height * $scale));
    $src = @imagecreatefromstring($raw);
    if (!$src) {
        return null;
    }
    $dst = imagecreatetruecolor($target_w, $target_h);
    $bg = imagecolorallocate($dst, 255, 255, 255);
    imagefill($dst, 0, 0, $bg);
    $dst_x = (int)(($target_w - $new_w) / 2);
    $dst_y = (int)(($target_h - $new_h) / 2);
    imagecopyresampled($dst, $src, $dst_x, $dst_y, 0, 0, $new_w, $new_h, $width, $height);
    imagedestroy($src);

    $qualities = [80, 65, 50, 40];
    foreach ($qualities as $quality) {
        ob_start();
        imagejpeg($dst, null, $quality);
        $jpeg_data = ob_get_clean();
        if ($jpeg_data && strlen($jpeg_data) <= $max_bytes) {
            imagedestroy($dst);
            return [
                'base64' => base64_encode($jpeg_data),
                'mime' => 'image/jpeg',
                'size' => strlen($jpeg_data),
                'width' => $target_w,
                'height' => $target_h,
                'quality' => $quality
            ];
        }
    }
    imagedestroy($dst);
    return null;
}

// Log PHP warnings/fatal errors to the video debug log for easier diagnosis
set_error_handler(function ($severity, $message, $file, $line) {
    log_video_debug('php_warning', [
        'severity' => $severity,
        'message' => $message,
        'file' => $file,
        'line' => $line
    ]);
    return false;
});

register_shutdown_function(function () {
    $error = error_get_last();
    if ($error) {
        log_video_debug('php_shutdown_error', $error);
    }
});

// Allow long-running video generation
set_time_limit(300);
ini_set('max_execution_time', '300');

// Support both CLI (background) and HTTP (queue) modes
$is_cli = PHP_SAPI === 'cli' || (PHP_SAPI === 'litespeed' && empty($_SERVER['REQUEST_METHOD']));

if ($is_cli) {
    // Background execution - do the actual work
    $job_id = isset($argv[1]) ? (int)$argv[1] : 0;
    $cli_video_size = isset($argv[2]) ? $argv[2] : 'reel';
    $cli_image_index = isset($argv[3]) ? (int)$argv[3] : 0;
} else {
    // HTTP request - just queue the job
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        json_error('Method not allowed', 405);
        exit;
    }
    
    $raw_input = file_get_contents('php://input');
    $input = json_decode($raw_input, true);
    if (!is_array($input)) {
        $input = [];
    }
    log_video_debug('http_request', [
        'method' => $_SERVER['REQUEST_METHOD'] ?? 'unknown',
        'raw_length' => strlen($raw_input),
        'input' => $input
    ]);
    $job_id = isset($input['job_id']) ? (int)$input['job_id'] : 0;
    $video_size = $input['video_size'] ?? 'reel'; // 'reel' (9:16) or 'square' (1:1)
    $image_index = isset($input['image_index']) ? (int)$input['image_index'] : 0;
    
    if (!$job_id) {
        json_error('job_id required');
        exit;
    }
    
    if (KIE_API_KEY === 'YOUR_KIE_API_KEY_HERE') {
        json_error('KIE_API_KEY not configured', 400);
        exit;
    }
    
    $db = get_db();
    $stmt = $db->prepare("SELECT * FROM creative_jobs WHERE id = ?");
    $stmt->execute([$job_id]);
    $job = $stmt->fetch();
    
    if (!$job) {
        json_error('Job not found', 404);
        exit;
    }
    
    if (!client_has_active_web_user((int)$job['client_id'])) {
        json_error('No active subscription');
        exit;
    }
    
    // Check video credits upfront
    if (!charge_client_credits($db, (int)$job['client_id'], 'video', 1)) {
        json_error('Not enough video credits to create a video.');
        exit;
    }
    
    // Set stage to generate_video so UI shows progress
    $stmt = $db->prepare("
        UPDATE creative_jobs 
        SET current_stage = 'generate_video',
            error_message = NULL
        WHERE id = ?
    ");
    $stmt->execute([$job_id]);
    
    // Dispatch background job immediately
    $script = __FILE__;
    $cmd = escapeshellcmd(PHP_BINARY) . ' ' 
        . escapeshellarg($script) . ' ' 
        . escapeshellarg((string)$job_id) . ' '
        . escapeshellarg($video_size) . ' '
        . escapeshellarg((string)$image_index)
        . ' > /dev/null 2>&1 &';
    
    log_video_debug('dispatching', [
        'job_id' => $job_id,
        'video_size' => $video_size,
        'image_index' => $image_index,
        'cmd' => $cmd
    ]);
    
    exec($cmd);
    
    // Return immediately
    json_response([
        'status' => 'queued',
        'job_id' => $job_id,
        'message' => 'Video generation started'
    ]);
    exit;
}

// ============================================================
// CLI Background Execution
// ============================================================

if (!$job_id) {
    log_video_debug('error', ['message' => 'job_id required']);
    exit(1);
}

$db = get_db();
$stmt = $db->prepare("SELECT * FROM creative_jobs WHERE id = ?");
$stmt->execute([$job_id]);
$job = $stmt->fetch();

if (!$job) {
    log_video_debug('error', ['job_id' => $job_id, 'message' => 'Job not found']);
    exit(1);
}

if ($job['current_stage'] !== 'generate_video') {
    log_video_debug('skip', ['job_id' => $job_id, 'stage' => $job['current_stage']]);
    exit(0);
}

// Use CLI arguments for video settings
$video_size = $cli_video_size ?? 'reel';
$image_index = $cli_image_index ?? 0;
$aspect_ratio = $video_size === 'square' ? '1:1' : '9:16';

log_video_debug('start', [
    'job_id' => $job_id,
    'client_id' => (int)$job['client_id'],
    'video_size' => $video_size,
    'aspect_ratio' => $aspect_ratio,
    'image_index' => $image_index
]);

// Get the source image
$design_variations = $job['design_variations'] ? json_decode($job['design_variations'], true) : [];
if (!is_array($design_variations) || count($design_variations) === 0) {
    log_video_debug('error', ['job_id' => $job_id, 'message' => 'No design images found']);
    $db->prepare("UPDATE creative_jobs SET current_stage = 'await_design_approval', error_message = 'No design image available for video' WHERE id = ?")->execute([$job_id]);
    exit(1);
}

$image_url = $design_variations[$image_index] ?? $design_variations[0];

// URL-only mode for KIE (use public URL)
$image_base64 = null;
$image_mime = 'image/jpeg';

// If couldn't load from disk, use the public URL (must be accessible)
$public_image_url = $image_url;
if (strpos($image_url, '127.0.0.1') !== false || strpos($image_url, 'localhost') !== false) {
    // Replace localhost with production URL for KIE to access
    $public_image_url = str_replace(
        ['http://127.0.0.1:8000', 'http://localhost:8000', 'http://localhost:5173', 'http://localhost'],
        'https://getadly.com',
        $image_url
    );
    log_video_debug('url_converted', ['job_id' => $job_id, 'from' => $image_url, 'to' => $public_image_url]);
}

// Get client info for context
$stmt = $db->prepare("SELECT * FROM clients WHERE id = ?");
$stmt->execute([$job['client_id']]);
$client = $stmt->fetch();

$business_name = $client['business_name'] ?? 'the brand';

// Build video prompt based on size
if ($aspect_ratio === '1:1') {
    $prompt = "Create a smooth, professional motion effect for this square marketing image. ";
    $prompt .= "Add subtle, elegant animations like gentle zoom, soft parallax layers, or floating elements. ";
    $prompt .= "Perfect for Instagram feed posts. ";
} else {
    $prompt = "Create a dynamic, eye-catching motion effect for this vertical marketing image. ";
    $prompt .= "Add smooth animations like cinematic zoom, parallax depth, or subtle floating elements. ";
    $prompt .= "Perfect for Instagram Reels and TikTok. ";
}
$prompt .= "Do NOT add any new text overlays unless explicitly requested by the user. ";
$prompt .= "Keep the brand logo and any existing text sharp and readable throughout. ";
$prompt .= "The motion should feel premium and suitable for social media ads. ";
$prompt .= "Duration: 5 seconds. Style: modern, clean, scroll-stopping.";

log_video_debug('calling_kie', [
    'job_id' => $job_id,
    'aspect_ratio' => $aspect_ratio,
    'image_url' => $public_image_url,
    'has_base64' => !empty($image_base64)
]);

// Call KIE API
$payload = [
    'prompt' => $prompt,
    'model' => 'veo3_fast',
    'aspectRatio' => $aspect_ratio
];

// URL-only mode for KIE
$payload['imageUrls'] = [$public_image_url];
log_video_debug('sending_url_image', ['job_id' => $job_id, 'url' => $public_image_url]);

$headers = [
    'Content-Type: application/json',
    'Authorization: Bearer ' . KIE_API_KEY,
    'X-API-Key: ' . KIE_API_KEY
];

$ch = curl_init('https://api.kie.ai/api/v1/veo/generate');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
$response = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_error = curl_error($ch);
curl_close($ch);

log_video_debug('kie_response', [
    'job_id' => $job_id,
    'http_code' => $code,
    'response' => $response,
    'curl_error' => $curl_error
]);

if ($code !== 200) {
    $error_msg = 'Video generation failed: ' . ($curl_error ?: "HTTP $code");
    log_video_debug('kie_error', ['job_id' => $job_id, 'error' => $error_msg]);
    $db->prepare("UPDATE creative_jobs SET current_stage = 'await_design_approval', error_message = ? WHERE id = ?")->execute([$error_msg, $job_id]);
    exit(1);
}

$result = json_decode($response, true);
if (($result['code'] ?? 200) !== 200) {
    $error_msg = 'Video API error: ' . ($result['msg'] ?? 'Unknown error');
    log_video_debug('kie_error', ['job_id' => $job_id, 'response' => $result]);
    $db->prepare("UPDATE creative_jobs SET current_stage = 'await_design_approval', error_message = ? WHERE id = ?")->execute([$error_msg, $job_id]);
    exit(1);
}

$task_id = $result['data']['taskId'] ?? null;
if (!$task_id) {
    log_video_debug('no_task_id', ['job_id' => $job_id, 'response' => $result]);
    $db->prepare("UPDATE creative_jobs SET current_stage = 'await_design_approval', error_message = 'Video API did not return task ID' WHERE id = ?")->execute([$job_id]);
    exit(1);
}

log_video_debug('task_created', ['job_id' => $job_id, 'task_id' => $task_id]);

// Poll for completion (up to 5 minutes)
$video_url = null;
$max_attempts = 30; // 30 x 10 seconds = 5 minutes

for ($i = 0; $i < $max_attempts; $i++) {
    sleep(10);
    
    $poll = curl_init('https://api.kie.ai/api/v1/veo/record-info?taskId=' . urlencode($task_id));
    curl_setopt($poll, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($poll, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($poll, CURLOPT_TIMEOUT, 15);
    $poll_response = curl_exec($poll);
    $poll_code = curl_getinfo($poll, CURLINFO_HTTP_CODE);
    curl_close($poll);
    
    if ($i % 1 === 0) { // Log every attempt for debugging
        log_video_debug('polling', [
            'job_id' => $job_id,
            'attempt' => $i + 1,
            'http_code' => $poll_code,
            'response' => $poll_response
        ]);
    }
    
    if ($poll_code !== 200) {
        continue;
    }
    
    $poll_result = json_decode($poll_response, true);
    
    // Check for success
    if (($poll_result['data']['successFlag'] ?? 0) == 1) {
        $video_url = $poll_result['data']['response']['resultUrls'][0] ?? null;
        if ($video_url) {
            log_video_debug('video_ready', ['job_id' => $job_id, 'video_url' => $video_url]);
            break;
        }
    }
    
    // Check for failure
    if (isset($poll_result['data']['failFlag']) && $poll_result['data']['failFlag'] == 1) {
        $error_msg = $poll_result['data']['errorMsg'] ?? 'Video generation failed';
        log_video_debug('generation_failed', ['job_id' => $job_id, 'error' => $error_msg]);
        $db->prepare("UPDATE creative_jobs SET current_stage = 'await_design_approval', error_message = ? WHERE id = ?")->execute([$error_msg, $job_id]);
        exit(1);
    }
}

if (!$video_url) {
    log_video_debug('timeout', ['job_id' => $job_id, 'task_id' => $task_id]);
    $db->prepare("UPDATE creative_jobs SET current_stage = 'await_design_approval', error_message = 'Video generation timed out' WHERE id = ?")->execute([$job_id]);
    exit(1);
}

// Save video URL and restore stage
$stmt = $db->prepare("
    UPDATE creative_jobs
    SET reel_video_url = ?,
        current_stage = 'await_design_approval',
        error_message = NULL
    WHERE id = ?
");
$stmt->execute([$video_url, $job_id]);

log_activity($job['client_id'], $job_id, 'video_created_from_image', [
    'video_url' => $video_url,
    'aspect_ratio' => $aspect_ratio
]);

log_video_debug('complete', ['job_id' => $job_id, 'video_url' => $video_url]);
?>
