<?php
require_once '../config.php';

function log_copy_edit_dispatch(string $message, array $context = []): void {
    $path = __DIR__ . '/../storage/edit_copy_dispatch.log';
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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed', 405);
}

$input = json_decode(file_get_contents('php://input'), true);
$job_id = isset($input['job_id']) ? (int)$input['job_id'] : 0;
$user_edit = trim($input['user_edit'] ?? '');
$allow_language_change = !empty($input['allow_language_change']);

if (!$job_id || $user_edit === '') {
    json_error('job_id and user_edit required');
}
log_copy_edit_dispatch('request', [
    'job_id' => $job_id,
    'user_id' => $_SESSION['web_user_id'] ?? null,
    'allow_language_change' => $allow_language_change
]);

$db = get_db();
$user_id = (int)$_SESSION['web_user_id'];

$stmt = $db->prepare("SELECT is_active FROM web_users WHERE id = ?");
$stmt->execute([$user_id]);
$user_status = $stmt->fetch();
if ($user_status && (int)$user_status['is_active'] !== 1) {
    log_copy_edit_dispatch('blocked_user', ['job_id' => $job_id, 'user_id' => $user_id]);
    json_error('Account disabled. Contact support to re-enable generation.', 403);
}

$stmt = $db->prepare("SELECT client_id FROM creative_jobs WHERE id = ?");
$stmt->execute([$job_id]);
$job = $stmt->fetch();
if (!$job) {
    log_copy_edit_dispatch('job_not_found', ['job_id' => $job_id]);
    json_error('Job not found', 404);
}

$stmt = $db->prepare("
    SELECT client_id
    FROM web_user_clients
    WHERE web_user_id = ? AND client_id = ?
");
$stmt->execute([$user_id, $job['client_id']]);
if (!$stmt->fetch()) {
    log_copy_edit_dispatch('brand_not_found', ['job_id' => $job_id, 'user_id' => $user_id]);
    json_error('Brand not found', 404);
}

$primary_user = get_primary_web_user_for_client($db, (int)$job['client_id']);
if (!$primary_user) {
    log_copy_edit_dispatch('no_primary_user', ['job_id' => $job_id, 'client_id' => (int)$job['client_id']]);
    json_error('No active user for this brand.', 403);
}
$primary_user = apply_credit_reset_if_needed($db, $primary_user);
if ((int)($primary_user['text_credits_remaining'] ?? 0) < 1) {
    log_copy_edit_dispatch('no_credits', ['job_id' => $job_id, 'client_id' => (int)$job['client_id']]);
    json_error('Not enough text credits to edit ad copy.');
}

$disabled = array_map('trim', explode(',', (string)ini_get('disable_functions')));
if (!function_exists('exec') || in_array('exec', $disabled, true)) {
    log_copy_edit_dispatch('exec_disabled', ['job_id' => $job_id]);
    json_error('Server cannot run background edits (exec disabled).', 500);
}

log_activity($job['client_id'], $job_id, 'copy_edit_requested_web', [
    'user_edit' => $user_edit
]);

$cmd = escapeshellcmd(PHP_BINARY) . ' ' .
    escapeshellarg(__DIR__ . '/tool_edit_copy.php') . ' ' .
    escapeshellarg((string)$job_id) . ' ' .
    escapeshellarg($user_edit) . ' ' .
    escapeshellarg($allow_language_change ? '1' : '0') .
    ' > /dev/null 2>&1 &';
log_copy_edit_dispatch('dispatch', [
    'job_id' => $job_id,
    'cmd' => $cmd
]);
exec($cmd);

json_response([
    'status' => 'queued',
    'job_id' => $job_id
]);
?>
