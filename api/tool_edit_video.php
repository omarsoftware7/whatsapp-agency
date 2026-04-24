<?php
/**
 * Edit Video - Regenerate video from source image with updated prompt
 * For video jobs, we store the original source image and regenerate with new instructions
 */
require_once __DIR__ . '/../config.php';

function log_video_edit(string $message, array $context = []): void {
    $path = __DIR__ . '/../storage/video_edit.log';
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

// Allow long-running video generation
set_time_limit(300);
ini_set('max_execution_time', '300');

// Accept both CLI and POST
$is_cli = PHP_SAPI === 'cli';
$input = [];

if ($is_cli) {
    $job_id = isset($argv[1]) ? (int)$argv[1] : 0;
    $edit_instructions = isset($argv[2]) ? $argv[2] : '';
} else {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        json_error('Method not allowed', 405);
    }
    $input = json_decode(file_get_contents('php://input'), true);
    $job_id = isset($input['job_id']) ? (int)$input['job_id'] : 0;
    $edit_instructions = isset($input['edit_instructions']) ? trim($input['edit_instructions']) : '';
}

if (!$job_id) {
    log_video_edit('error', ['message' => 'job_id required']);
    if (!$is_cli) json_error('job_id required');
    exit(1);
}

if (!$edit_instructions) {
    log_video_edit('error', ['message' => 'edit_instructions required']);
    if (!$is_cli) json_error('edit_instructions required');
    exit(1);
}

if (KIE_API_KEY === 'YOUR_KIE_API_KEY_HERE') {
    log_video_edit('error', ['message' => 'KIE_API_KEY not configured']);
    if (!$is_cli) json_error('KIE_API_KEY not configured', 500);
    exit(1);
}

$db = get_db();
$stmt = $db->prepare("SELECT * FROM creative_jobs WHERE id = ?");
$stmt->execute([$job_id]);
$job = $stmt->fetch();

if (!$job) {
    log_video_edit('error', ['job_id' => $job_id, 'message' => 'Job not found']);
    if (!$is_cli) json_error('Job not found', 404);
    exit(1);
}

if ($job['job_type'] !== 'video') {
    log_video_edit('error', ['job_id' => $job_id, 'message' => 'Not a video job']);
    if (!$is_cli) json_error('Not a video job');
    exit(1);
}

// Get source images (stored in product_images)
$product_images = $job['product_images'] ? json_decode($job['product_images'], true) : [];
if (!is_array($product_images) || count($product_images) === 0) {
    // Fallback to user_images
    $user_images = $job['user_images'] ? json_decode($job['user_images'], true) : [];
    if (!is_array($user_images) || count($user_images) === 0) {
        log_video_edit('error', ['job_id' => $job_id, 'message' => 'No source image found']);
        if (!$is_cli) json_error('No source image to edit from');
        exit(1);
    }
    $product_images = $user_images;
}

$source_image_url = $product_images[0];

log_video_edit('start', [
    'job_id' => $job_id,
    'source_image' => $source_image_url,
    'edit_instructions' => $edit_instructions
]);

// Check video credits
if (!charge_client_credits($db, (int)$job['client_id'], 'video', 1)) {
    log_video_edit('no_credits', ['job_id' => $job_id]);
    if (!$is_cli) json_error('Not enough video credits');
    exit(1);
}

// Get client info
$stmt = $db->prepare("SELECT * FROM clients WHERE id = ?");
$stmt->execute([$job['client_id']]);
$client = $stmt->fetch();

// Determine video size
$image_size = $job['image_size'] ?? 'story';
$is_vertical = in_array($image_size, ['story', 'reel'], true);
$kie_ratio = $is_vertical ? '720:1280' : '960:960';

// Build video prompt with edit instructions
$user_message = $job['user_message'] ?? '';
$business_name = $client['business_name'] ?? 'the brand';

$prompt = $user_message ?: "Create an eye-catching promotional video for {$business_name}.";
$prompt .= "\n\nADDITIONAL EDIT INSTRUCTIONS:\n" . $edit_instructions;
$prompt .= "\n\nCreate smooth, professional motion effects. ";
$prompt .= $is_vertical 
    ? "Vertical format perfect for Instagram Reels, TikTok, and Stories. "
    : "Square format perfect for Instagram feed and Facebook posts. ";
$prompt .= "Add subtle animations like gentle zoom, soft parallax, or floating elements. ";
$prompt .= "Do NOT add any new text overlays unless explicitly requested by the user. ";
$prompt .= "Keep any existing text or logos sharp and readable. ";
$prompt .= "Duration: 5 seconds. Style: modern, premium, scroll-stopping.";

// Convert localhost URLs to production for KIE
$public_image_url = $source_image_url;
if (strpos($source_image_url, '127.0.0.1') !== false || strpos($source_image_url, 'localhost') !== false) {
    $public_image_url = str_replace(
        ['http://127.0.0.1:8000', 'http://localhost:8000', 'http://localhost'],
        'https://getadly.com',
        $source_image_url
    );
    log_video_edit('url_converted', ['from' => $source_image_url, 'to' => $public_image_url]);
}

// Set stage to generating
$db->prepare("UPDATE creative_jobs SET current_stage = 'generate_video', error_message = NULL WHERE id = ?")->execute([$job_id]);

// If not CLI, return immediately and let polling handle the rest
if (!$is_cli) {
    // Store edit in edit_history
    $edit_history = $job['edit_history'] ? json_decode($job['edit_history'], true) : [];
    $edit_history[] = [
        'type' => 'video_edit',
        'request' => $edit_instructions,
        'timestamp' => date('c')
    ];
    $db->prepare("UPDATE creative_jobs SET edit_history = ? WHERE id = ?")->execute([
        json_encode($edit_history, JSON_UNESCAPED_UNICODE),
        $job_id
    ]);
    
    // Dispatch background process
    $script = __FILE__;
    $cmd = escapeshellcmd(PHP_BINARY) . ' ' . escapeshellarg($script) . ' ' . escapeshellarg((string)$job_id) . ' ' . escapeshellarg($edit_instructions) . ' > /dev/null 2>&1 &';
    exec($cmd);
    
    json_response(['status' => 'processing', 'job_id' => $job_id]);
}

// CLI mode - do the actual work
log_video_edit('calling_kie', [
    'job_id' => $job_id,
    'kie_ratio' => $kie_ratio,
    'image_url' => $public_image_url
]);

$payload = [
    'prompt' => $prompt,
    'model' => 'veo3_fast',
    'aspectRatio' => $kie_ratio,
    'imageUrls' => $public_image_url
];

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

log_video_edit('kie_response', [
    'job_id' => $job_id,
    'http_code' => $code,
    'response' => substr($response, 0, 500)
]);

if ($code !== 200) {
    $error_msg = 'Video edit failed: ' . ($curl_error ?: "HTTP $code");
    log_video_edit('kie_error', ['job_id' => $job_id, 'error' => $error_msg]);
    $db->prepare("UPDATE creative_jobs SET current_stage = 'await_design_approval', error_message = ? WHERE id = ?")->execute([$error_msg, $job_id]);
    exit(1);
}

$result = json_decode($response, true);
$task_id = $result['data']['taskId'] ?? null;

if (!$task_id) {
    log_video_edit('no_task_id', ['job_id' => $job_id, 'response' => $result]);
    $db->prepare("UPDATE creative_jobs SET current_stage = 'await_design_approval', error_message = 'Video API error' WHERE id = ?")->execute([$job_id]);
    exit(1);
}

log_video_edit('task_created', ['job_id' => $job_id, 'task_id' => $task_id]);

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
        log_video_edit('polling', ['job_id' => $job_id, 'attempt' => $i + 1]);
    }
    
    if ($poll_code !== 200) {
        continue;
    }
    
    $poll_result = json_decode($poll_response, true);
    
    if (($poll_result['data']['successFlag'] ?? 0) == 1) {
        $video_url = $poll_result['data']['response']['resultUrls'][0] ?? null;
        if ($video_url) {
            log_video_edit('video_ready', ['job_id' => $job_id, 'video_url' => $video_url]);
            break;
        }
    }
    
    if (isset($poll_result['data']['failFlag']) && $poll_result['data']['failFlag'] == 1) {
        $error_msg = $poll_result['data']['errorMsg'] ?? 'Video edit failed';
        log_video_edit('generation_failed', ['job_id' => $job_id, 'error' => $error_msg]);
        $db->prepare("UPDATE creative_jobs SET current_stage = 'await_design_approval', error_message = ? WHERE id = ?")->execute([$error_msg, $job_id]);
        exit(1);
    }
}

if (!$video_url) {
    log_video_edit('timeout', ['job_id' => $job_id, 'task_id' => $task_id]);
    $db->prepare("UPDATE creative_jobs SET current_stage = 'await_design_approval', error_message = 'Video edit timed out' WHERE id = ?")->execute([$job_id]);
    exit(1);
}

// Get current design_variations to keep history
$current_variations = $job['design_variations'] ? json_decode($job['design_variations'], true) : [];
if (!is_array($current_variations)) {
    $current_variations = [];
}
// Add new video to the front of the list
array_unshift($current_variations, $video_url);

// Save updated video
$stmt = $db->prepare("
    UPDATE creative_jobs
    SET design_variations = ?,
        approved_design_index = 0,
        media_type = 'video',
        current_stage = 'await_design_approval',
        error_message = NULL
    WHERE id = ?
");
$stmt->execute([
    json_encode($current_variations),
    $job_id
]);

log_activity($job['client_id'], $job_id, 'video_edited', [
    'video_url' => $video_url,
    'source_image' => $source_image_url,
    'edit_instructions' => $edit_instructions
]);

log_video_edit('complete', ['job_id' => $job_id, 'video_url' => $video_url]);
?>
