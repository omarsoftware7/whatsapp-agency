<?php
require_once '../config.php';

function log_process_debug(string $message, array $context = []): void {
    $path = __DIR__ . '/../storage/process_job.log';
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

session_start();

if (!isset($_SESSION['web_user_id'])) {
    json_error('Unauthorized', 401);
}

// Allow long-running AI steps without killing the PHP built-in server.
set_time_limit(180);
ini_set('max_execution_time', '180');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed', 405);
}

$input = json_decode(file_get_contents('php://input'), true);
$job_id = isset($input['job_id']) ? (int)$input['job_id'] : 0;

if (!$job_id) {
    json_error('job_id required');
}

$db = get_db();
$user_id = (int)$_SESSION['web_user_id'];
$user_role = $_SESSION['web_user_role'] ?? 'user';
$stmt = $db->prepare("SELECT * FROM creative_jobs WHERE id = ?");
$stmt->execute([$job_id]);
$job = $stmt->fetch();

if (!$job) {
    json_error('Job not found', 404);
}
log_process_debug('process_start', [
    'job_id' => $job_id,
    'stage' => $job['current_stage'] ?? null,
    'job_type' => $job['job_type'] ?? null
]);

$stmt = $db->prepare("SELECT is_active FROM web_users WHERE id = ?");
$stmt->execute([$user_id]);
$user = $stmt->fetch();
if ($user && (int)$user['is_active'] !== 1) {
    json_error('Account disabled. Contact support to re-enable generation.', 403);
}

if ($user_role !== 'admin') {
    $stmt = $db->prepare("
        SELECT client_id
        FROM web_user_clients
        WHERE web_user_id = ? AND client_id = ?
    ");
    $stmt->execute([$user_id, $job['client_id']]);
    if (!$stmt->fetch()) {
        json_error('Brand not found', 404);
    }
}

if (!client_has_active_web_user((int)$job['client_id'])) {
    json_error('Account disabled. Contact support to re-enable generation.', 403);
}

$stage = $job['current_stage'];
// Always use BASE_URL to prevent host header injection
$base_url = BASE_URL;

if ($stage === 'generate_design') {
    $script = ($job['job_type'] === 'ugc_video')
        ? __DIR__ . '/tool_generate_ugc.php'
        : __DIR__ . '/tool_generate_design.php';
    $cmd = escapeshellcmd(PHP_BINARY) . ' ' . escapeshellarg($script) . ' ' . escapeshellarg((string)$job_id) . ' > /dev/null 2>&1 &';
    log_process_debug('dispatch', [
        'job_id' => $job_id,
        'stage' => $stage,
        'cmd' => $cmd
    ]);
    exec($cmd);
    json_response(['status' => 'queued', 'step' => 'generate_design']);
}

if ($stage === 'generate_multi_variants') {
    $script = __DIR__ . '/tool_generate_multi_variants.php';
    $cmd = escapeshellcmd(PHP_BINARY) . ' ' . escapeshellarg($script) . ' ' . escapeshellarg((string)$job_id) . ' > /dev/null 2>&1 &';
    log_process_debug('dispatch', [
        'job_id' => $job_id,
        'stage' => $stage,
        'cmd' => $cmd
    ]);
    exec($cmd);
    json_response(['status' => 'queued', 'step' => 'generate_multi_variants']);
}

if ($stage === 'generate_video') {
    $lock = $db->prepare("
        UPDATE creative_jobs
        SET processing_lock = 1,
            processing_lock_at = NOW()
        WHERE id = ?
          AND current_stage = 'generate_video'
          AND (processing_lock = 0 OR processing_lock_at < (NOW() - INTERVAL 15 MINUTE))
    ");
    $lock->execute([$job_id]);
    if ($lock->rowCount() === 0) {
        json_response(['status' => 'locked', 'step' => 'generate_video']);
    }
    $script = __DIR__ . '/tool_generate_video.php';
    $cmd = escapeshellcmd(PHP_BINARY) . ' ' . escapeshellarg($script) . ' ' . escapeshellarg((string)$job_id) . ' > /dev/null 2>&1 &';
    log_process_debug('dispatch', [
        'job_id' => $job_id,
        'stage' => $stage,
        'cmd' => $cmd
    ]);
    exec($cmd);
    json_response(['status' => 'queued', 'step' => 'generate_video']);
}

if ($stage === 'generate_ad_copy') {
    $script = __DIR__ . '/tool_generate_ad_copy.php';
    $cmd = escapeshellcmd(PHP_BINARY) . ' ' . escapeshellarg($script) . ' ' . escapeshellarg((string)$job_id) . ' > /dev/null 2>&1 &';
    log_process_debug('dispatch', [
        'job_id' => $job_id,
        'stage' => $stage,
        'cmd' => $cmd
    ]);
    exec($cmd);
    json_response(['status' => 'queued', 'step' => 'generate_ad_copy']);
}

if ($stage === 'publishing') {
    $payload = json_encode(['job_id' => $job_id]);
    $ch = curl_init($base_url . '/api/publish.php');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'X-API-Key: ' . ADMIN_API_KEY
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($code !== 200) {
        log_process_debug('publish_failed', [
            'job_id' => $job_id,
            'http_code' => $code
        ]);
        json_error('Failed to publish', $code);
    }
    json_response(['status' => 'published', 'response' => json_decode($response, true)]);
}

log_process_debug('no_action', [
    'job_id' => $job_id,
    'stage' => $stage
]);
json_response([
    'status' => 'no_action',
    'current_stage' => $stage
]);
?>
