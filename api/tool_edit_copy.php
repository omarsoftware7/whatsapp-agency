<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/prompts.php';
require_once __DIR__ . '/ai_helpers.php';

function log_copy_edit_debug(string $message, array $context = []): void {
    $path = __DIR__ . '/../storage/edit_copy_debug.log';
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

// Allow long-running text edits without killing the PHP server.
set_time_limit(180);
ini_set('max_execution_time', '180');

$is_cli = PHP_SAPI === 'cli' || (PHP_SAPI === 'litespeed' && empty($_SERVER['REQUEST_METHOD']));
if (!$is_cli && ($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    json_error('Method not allowed', 405);
}

if ($is_cli) {
    $job_id = isset($argv[1]) ? (int)$argv[1] : 0;
    $user_edit = isset($argv[2]) ? trim((string)$argv[2]) : '';
    $allow_language_change = isset($argv[3]) && (string)$argv[3] === '1';
} else {
    $input = json_decode(file_get_contents('php://input'), true);
    $job_id = isset($input['job_id']) ? (int)$input['job_id'] : 0;
    $user_edit = trim($input['user_edit'] ?? '');
    $allow_language_change = !empty($input['allow_language_change']);
}

if (!$job_id || $user_edit === '') {
    json_error('job_id and user_edit required');
}

$db = get_db();
$stmt = $db->prepare("SELECT * FROM creative_jobs WHERE id = ?");
$stmt->execute([$job_id]);
$job = $stmt->fetch();

if (!$job) {
    json_error('Job not found', 404);
}
log_copy_edit_debug('start', [
    'job_id' => $job_id,
    'client_id' => (int)$job['client_id'],
    'job_type' => $job['job_type'] ?? null,
    'allow_language_change' => $allow_language_change
]);
if ($job['current_stage'] === 'rejected') {
    log_copy_edit_debug('cancelled', ['job_id' => $job_id]);
    json_response(['status' => 'cancelled']);
}
if (!client_has_active_web_user((int)$job['client_id'])) {
    log_copy_edit_debug('blocked', ['job_id' => $job_id]);
    json_response(['status' => 'blocked']);
}

if (!charge_client_credits($db, (int)$job['client_id'], 'text', 1)) {
    log_copy_edit_debug('no_credits', ['job_id' => $job_id]);
    $db->prepare("
        UPDATE creative_jobs
        SET error_message = ?,
            current_stage = 'await_user_input'
        WHERE id = ?
    ")->execute(['Not enough text credits to edit ad copy.', $job_id]);
    json_response(['status' => 'no_credits']);
}

$stmt = $db->prepare("SELECT * FROM clients WHERE id = ?");
$stmt->execute([$job['client_id']]);
$client = $stmt->fetch();
if (!$client) {
    json_error('Client not found', 404);
}

$stmt = $db->prepare("SELECT * FROM web_brand_profiles WHERE client_id = ?");
$stmt->execute([$job['client_id']]);
$profile = $stmt->fetch() ?: [];

$business_info = array_merge($client, $profile);
$language = $job['language'] ?? null;
$currency_country = $business_info['country'] ?? '';

$current_copy = $job['ad_copy'] ?? '';
if ($current_copy === '') {
    log_copy_edit_debug('missing_ad_copy', ['job_id' => $job_id]);
    json_error('ad_copy missing for job');
}

$image_context = '';
$image_parts = [];
$design_variations = $job['design_variations'] ? json_decode($job['design_variations'], true) : [];
if (is_array($design_variations) && count($design_variations) > 0) {
    $design_url = $design_variations[$job['approved_design_index'] ?? (count($design_variations) - 1)];
    if ($design_url) {
        $image_data = fetch_url_base64($design_url);
        if ($image_data) {
            $image_parts[] = [
                'inlineData' => [
                    'mimeType' => $image_data['mime'],
                    'data' => $image_data['data']
                ]
            ];
        }
    }
}

if ($image_parts) {
    $analysis_prompt = "Describe the design in this image in full detail. Focus on product, offer, and style. Ignore any background elements that are not central to the ad.";
    $analysis = call_gemini_text_with_images($analysis_prompt, $image_parts);
    if (!isset($analysis['error'])) {
        $image_context = extract_gemini_text($analysis) ?? '';
    }
}

$prompt = build_ad_copy_edit_prompt(
    $current_copy,
    $user_edit,
    $business_info,
    $image_context,
    $language,
    $currency_country,
    $allow_language_change
);
$gemini = $image_parts
    ? call_gemini_text_with_images($prompt, $image_parts)
    : call_gemini_text($prompt);
if (isset($gemini['error'])) {
    log_copy_edit_debug('gemini_error', [
        'job_id' => $job_id,
        'status' => $gemini['status'] ?? null,
        'error' => $gemini['error']
    ]);
    json_response([
        'error' => $gemini['error'],
        'status' => $gemini['status'] ?? null,
        'response' => $gemini['response'] ?? null
    ], 502);
}

$text = '';
if (isset($gemini['candidates'][0]['content']['parts'])) {
    foreach ($gemini['candidates'][0]['content']['parts'] as $part) {
        if (isset($part['text'])) {
            $text .= $part['text'];
        }
    }
}
$ad_copy = null;
if ($text) {
    if (preg_match('/\{[\s\S]*\}/', $text, $matches)) {
        $ad_copy = $matches[0];
    }
}

if (!$ad_copy) {
    log_copy_edit_debug('missing_copy', ['job_id' => $job_id]);
    json_error('Failed to update ad copy');
}

$stmt = $db->prepare("
    UPDATE creative_jobs
    SET ad_copy = ?,
        current_stage = 'await_copy_approval'
    WHERE id = ?
");
$stmt->execute([$ad_copy, $job_id]);

log_activity($job['client_id'], $job_id, 'copy_edited_web', []);
log_copy_edit_debug('copy_saved', [
    'job_id' => $job_id
]);

json_response([
    'status' => 'copy_updated',
    'job_id' => $job_id,
    'ad_copy' => $ad_copy,
    'next_step' => 'await_copy_approval'
]);
?>
