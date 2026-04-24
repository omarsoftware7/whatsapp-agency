<?php
/**
 * Generate Video for "video" job type
 * Creates video from source image, then proceeds to ad copy generation
 */
require_once __DIR__ . '/../config.php';

function log_video_gen(string $message, array $context = []): void {
    $path = __DIR__ . '/../storage/video_generate.log';
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

// Allow long-running video generation
set_time_limit(300);
ini_set('max_execution_time', '300');

// CLI only
$is_cli = PHP_SAPI === 'cli' || (PHP_SAPI === 'litespeed' && empty($_SERVER['REQUEST_METHOD']));
if (!$is_cli) {
    json_error('CLI only', 400);
}

$job_id = isset($argv[1]) ? (int)$argv[1] : 0;
if (!$job_id) {
    log_video_gen('error', ['message' => 'job_id required']);
    exit(1);
}

if (KIE_API_KEY === 'YOUR_KIE_API_KEY_HERE') {
    log_video_gen('error', ['message' => 'KIE_API_KEY not configured']);
    exit(1);
}

$db = get_db();
$stmt = $db->prepare("SELECT * FROM creative_jobs WHERE id = ?");
$stmt->execute([$job_id]);
$job = $stmt->fetch();

if (!$job) {
    log_video_gen('error', ['job_id' => $job_id, 'message' => 'Job not found']);
    exit(1);
}

if ($job['job_type'] !== 'video') {
    log_video_gen('error', ['job_id' => $job_id, 'message' => 'Not a video job']);
    exit(1);
}

if ($job['current_stage'] !== 'generate_video') {
    log_video_gen('skip', ['job_id' => $job_id, 'stage' => $job['current_stage']]);
    exit(0);
}

// Get source image - prefer user_images, fallback to product_images
$user_images = $job['user_images'] ? json_decode($job['user_images'], true) : [];
$product_images = $job['product_images'] ? json_decode($job['product_images'], true) : [];
$source_images = is_array($user_images) && count($user_images) > 0 ? $user_images : $product_images;

if (!is_array($source_images) || count($source_images) === 0) {
    log_video_gen('error', ['job_id' => $job_id, 'message' => 'No source image found']);
    $db->prepare("UPDATE creative_jobs SET current_stage = 'await_user_input', error_message = 'No source image provided' WHERE id = ?")->execute([$job_id]);
    exit(1);
}

$source_image_url = $source_images[0];
log_video_gen('start', [
    'job_id' => $job_id,
    'client_id' => (int)$job['client_id'],
    'source_image' => $source_image_url
]);

// Get client info
$stmt = $db->prepare("SELECT * FROM clients WHERE id = ?");
$stmt->execute([$job['client_id']]);
$client = $stmt->fetch();

// Determine video size from image_size field
// 'story' or 'reel' = 9:16, 'post' or 'square' = 1:1
$image_size = $job['image_size'] ?? 'story';
$is_vertical = in_array($image_size, ['story', 'reel'], true);
$aspect_ratio = $is_vertical ? '9:16' : '1:1';

// Build video prompt
$user_message = $job['user_message'] ?? '';
$business_name = $client['business_name'] ?? 'the brand';

$prompt = $user_message ?: "Create an eye-catching promotional video for {$business_name}.";
$prompt .= "\n\nCreate smooth, professional motion effects. ";
$prompt .= $is_vertical 
    ? "Vertical format perfect for Instagram Reels, TikTok, and Stories. "
    : "Square format perfect for Instagram feed and Facebook posts. ";
$prompt .= "Add subtle animations like gentle zoom, soft parallax, or floating elements. ";
$prompt .= "Do NOT add any new text overlays unless explicitly requested by the user. ";
$prompt .= "Keep any existing text or logos sharp and readable. ";
$prompt .= "Duration: 5 seconds. Style: modern, premium, scroll-stopping.";

// Get public URL for the image
$public_image_url = $source_image_url;

// URL-only mode for KIE (use public URL)
$image_loaded_locally = false;
$image_base64 = null;
$image_mime = 'image/jpeg';

// Convert localhost URLs to production for KIE
if (strpos($source_image_url, '127.0.0.1') !== false || strpos($source_image_url, 'localhost') !== false) {
    $public_image_url = str_replace(
        ['http://127.0.0.1:8000', 'http://localhost:8000', 'http://localhost:5173', 'http://localhost'],
        'https://getadly.com',
        $source_image_url
    );
    log_video_gen('url_converted', ['from' => $source_image_url, 'to' => $public_image_url]);
}

log_video_gen('calling_kie', [
    'job_id' => $job_id,
    'aspect_ratio' => $aspect_ratio,
    'image_url' => $public_image_url
]);

// Call KIE API
$payload = [
    'prompt' => $prompt,
    'model' => 'veo3_fast',
    'aspectRatio' => $aspect_ratio
];

$payload['imageUrls'] = [$public_image_url];
log_video_gen('sending_url_image', ['url' => $public_image_url]);

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

log_video_gen('kie_response', [
    'job_id' => $job_id,
    'http_code' => $code,
    'response' => substr($response, 0, 500)
]);

if ($code !== 200) {
    $error_msg = 'Video generation failed: ' . ($curl_error ?: "HTTP $code");
    log_video_gen('kie_error', ['job_id' => $job_id, 'error' => $error_msg, 'response' => $response]);
    $db->prepare("UPDATE creative_jobs SET current_stage = 'await_user_input', error_message = ?, processing_lock = 0, processing_lock_at = NULL WHERE id = ?")->execute([$error_msg, $job_id]);
    exit(1);
}

$result = json_decode($response, true);
if (($result['code'] ?? 200) !== 200) {
    $error_msg = 'Video API error: ' . ($result['msg'] ?? 'Unknown error');
    log_video_gen('kie_error', ['job_id' => $job_id, 'response' => $result]);
    $db->prepare("UPDATE creative_jobs SET current_stage = 'await_user_input', error_message = ?, processing_lock = 0, processing_lock_at = NULL WHERE id = ?")->execute([$error_msg, $job_id]);
    exit(1);
}

$task_id = $result['data']['taskId'] ?? null;
if (!$task_id) {
    log_video_gen('no_task_id', ['job_id' => $job_id, 'response' => $result]);
    $db->prepare("UPDATE creative_jobs SET current_stage = 'await_user_input', error_message = 'Video API did not return task ID', processing_lock = 0, processing_lock_at = NULL WHERE id = ?")->execute([$job_id]);
    exit(1);
}

log_video_gen('task_created', ['job_id' => $job_id, 'task_id' => $task_id]);

// Poll for completion (up to 5 minutes)
$video_url = null;
$max_attempts = 30;

for ($i = 0; $i < $max_attempts; $i++) {
    sleep(10);
    
    $poll = curl_init('https://api.kie.ai/api/v1/veo/record-info?taskId=' . urlencode($task_id));
    curl_setopt($poll, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($poll, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($poll, CURLOPT_TIMEOUT, 15);
    $poll_response = curl_exec($poll);
    $poll_code = curl_getinfo($poll, CURLINFO_HTTP_CODE);
    curl_close($poll);
    
    if ($i % 3 === 0) {
        log_video_gen('polling', ['job_id' => $job_id, 'attempt' => $i + 1]);
    }
    
    if ($poll_code !== 200) {
        continue;
    }
    
    $poll_result = json_decode($poll_response, true);
    
    if (($poll_result['data']['successFlag'] ?? 0) == 1) {
        $video_url = $poll_result['data']['response']['resultUrls'][0] ?? null;
        if ($video_url) {
            log_video_gen('video_ready', ['job_id' => $job_id, 'video_url' => $video_url]);
            break;
        }
    }
    
    if (isset($poll_result['data']['failFlag']) && $poll_result['data']['failFlag'] == 1) {
        $error_msg = $poll_result['data']['errorMsg'] ?? 'Video generation failed';
        log_video_gen('generation_failed', ['job_id' => $job_id, 'error' => $error_msg]);
        $db->prepare("UPDATE creative_jobs SET current_stage = 'await_user_input', error_message = ?, processing_lock = 0, processing_lock_at = NULL WHERE id = ?")->execute([$error_msg, $job_id]);
        exit(1);
    }
}

if (!$video_url) {
    log_video_gen('timeout', ['job_id' => $job_id, 'task_id' => $task_id]);
    $db->prepare("UPDATE creative_jobs SET current_stage = 'await_user_input', error_message = 'Video generation timed out', processing_lock = 0, processing_lock_at = NULL WHERE id = ?")->execute([$job_id]);
    exit(1);
}

// Save video and source image, move to design approval
// Store source image in product_images for future edits
$stmt = $db->prepare("
    UPDATE creative_jobs
    SET design_variations = ?,
        product_images = ?,
        media_type = 'video',
        current_stage = 'await_design_approval',
        error_message = NULL,
        processing_lock = 0,
        processing_lock_at = NULL
    WHERE id = ?
");
$stmt->execute([
    json_encode([$video_url]),
    json_encode($source_images), // Keep source images for re-generation
    $job_id
]);

log_activity($job['client_id'], $job_id, 'video_generated', [
    'video_url' => $video_url,
    'source_image' => $source_image_url,
    'aspect_ratio' => $aspect_ratio
]);

log_video_gen('complete', ['job_id' => $job_id, 'video_url' => $video_url]);
?>
