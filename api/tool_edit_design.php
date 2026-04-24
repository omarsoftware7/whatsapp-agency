<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/prompts.php';
require_once __DIR__ . '/ai_helpers.php';

function log_edit_debug(string $message, array $context = []): void {
    $path = __DIR__ . '/../storage/edit_design_debug.log';
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

// Allow long-running image edits without killing the PHP server.
set_time_limit(180);
ini_set('max_execution_time', '180');

$is_cli = PHP_SAPI === 'cli' || (PHP_SAPI === 'litespeed' && empty($_SERVER['REQUEST_METHOD']));
if (!$is_cli && ($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    json_error('Method not allowed', 405);
}

if ($is_cli) {
    $job_id = isset($argv[1]) ? (int)$argv[1] : 0;
    $user_edit = isset($argv[2]) ? trim((string)$argv[2]) : '';
    $image_url = isset($argv[3]) ? trim((string)$argv[3]) : '';
    $edit_mode = strtolower(trim((string)($argv[4] ?? 'recreate')));
} else {
    $input = json_decode(file_get_contents('php://input'), true);
    $job_id = isset($input['job_id']) ? (int)$input['job_id'] : 0;
    $user_edit = trim($input['user_edit'] ?? '');
    $image_url = trim($input['image_url'] ?? '');
    $edit_mode = strtolower(trim($input['edit_mode'] ?? 'recreate'));
}
if (!in_array($edit_mode, ['edit', 'recreate'], true)) {
    $edit_mode = 'edit';
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
log_edit_debug('start', [
    'job_id' => $job_id,
    'client_id' => (int)$job['client_id'],
    'job_type' => $job['job_type'] ?? null,
    'edit_mode' => $edit_mode,
    'user_edit' => $user_edit
]);
if ($job['current_stage'] === 'rejected') {
    log_edit_debug('cancelled', ['job_id' => $job_id]);
    json_response(['status' => 'cancelled']);
}
if (!client_has_active_web_user((int)$job['client_id'])) {
    log_edit_debug('blocked', ['job_id' => $job_id]);
    json_response(['status' => 'blocked']);
}

if (!charge_client_credits($db, (int)$job['client_id'], 'image', 1)) {
    log_edit_debug('no_credits', ['job_id' => $job_id]);
    $db->prepare("
        UPDATE creative_jobs
        SET error_message = ?,
            current_stage = 'await_user_input'
        WHERE id = ?
    ")->execute(['Not enough image credits to edit a design.', $job_id]);
    json_response(['status' => 'no_credits']);
}

// Fetch client info for business context
$stmt = $db->prepare("SELECT * FROM clients WHERE id = ?");
$stmt->execute([$job['client_id']]);
$client = $stmt->fetch();
if (!$client) {
    json_error('Client not found', 404);
}
$stmt = $db->prepare("SELECT * FROM web_brand_profiles WHERE client_id = ?");
$stmt->execute([$job['client_id']]);
$profile = $stmt->fetch() ?: [];
$client = array_merge($client, $profile);

$design_prompt = $job['design_prompt'] ?? '';
if ($design_prompt === '') {
    log_edit_debug('missing_design_prompt', ['job_id' => $job_id]);
    json_error('design_prompt missing for job');
}

if ($job['design_variations']) {
    $variations = json_decode($job['design_variations'], true);
    if (is_array($variations) && count($variations) > 0) {
        $image_url = $variations[count($variations) - 1];
    }
}

if ($image_url === '') {
    log_edit_debug('missing_image_url', ['job_id' => $job_id]);
    json_error('image_url required');
}

$editor_prompt = build_editor_system_prompt();
$logo_protection = get_logo_protection_rules();
$business_info = build_business_info_prompt($client);

$revision_prompt = $editor_prompt . "\n\n" . $logo_protection . 
    "\n\n**BUSINESS CONTEXT (must be maintained in the design):**\n" . $business_info .
    "\n\nOriginal Prompt:\n" . $design_prompt . "\n\nUser Edit:\n" . $user_edit;

$gemini = call_gemini_text($revision_prompt);
if (isset($gemini['error'])) {
    log_edit_debug('gemini_text_error', [
        'job_id' => $job_id,
        'status' => $gemini['status'] ?? null,
        'error' => $gemini['error']
    ]);
    json_error($gemini['error']);
}

$text = $gemini['candidates'][0]['content']['parts'][0]['text'] ?? '';
$log_text = $text ? mb_substr($text, 0, 1200) : '';
log_edit_debug('editor_response', [
    'job_id' => $job_id,
    'edit_mode' => $edit_mode,
    'text' => $log_text
]);
$revised_prompt = '';

if ($text) {
    // Try to extract JSON from markdown code blocks first
    if (preg_match('/```(?:json)?\s*(\{[\s\S]*?\})\s*```/', $text, $code_matches)) {
        $decoded = json_decode($code_matches[1], true);
        if (isset($decoded['prompt']) && is_string($decoded['prompt'])) {
            $revised_prompt = trim($decoded['prompt']);
        }
    }
    
    // If not found, try to find JSON anywhere in the text
    if ($revised_prompt === '' && preg_match('/\{[\s\S]*\}/', $text, $matches)) {
        $decoded = json_decode($matches[0], true);
        if (isset($decoded['prompt']) && is_string($decoded['prompt'])) {
            $revised_prompt = trim($decoded['prompt']);
        }
    }
    
    // If still not found, try to extract just the prompt value directly
    if ($revised_prompt === '' && preg_match('/"prompt"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/', $text, $prompt_matches)) {
        $revised_prompt = trim(stripslashes($prompt_matches[1]));
    }
}

// Fallback: if we can't parse the response, use original prompt (user edit will be appended later if needed)
if ($revised_prompt === '') {
    log_edit_debug('missing_revised_prompt_fallback', [
        'job_id' => $job_id,
        'response_length' => strlen($text),
        'response_preview' => mb_substr($text, 0, 200)
    ]);
    // Use original prompt as fallback (user edit will be appended by edit_mode logic below)
    $revised_prompt = $design_prompt;
    log_edit_debug('using_fallback_prompt', ['job_id' => $job_id]);
}

// Add business context to the final prompt for image generation
$revised_prompt = "**BUSINESS CONTEXT (must be maintained in the design):**\n" . $business_info . "\n\n" .
    get_logo_protection_rules() . "\n" .
    $revised_prompt;

if ($edit_mode === 'recreate') {
    $revised_prompt .= "\n\nUSER EDIT REQUEST (must be applied):\n" . $user_edit;
    $revised_prompt .= "\n\nREMINDER: The logo must NEVER be modified, translated, or changed in any way. Preserve it exactly as provided.";
}

$image_base64 = fetch_url_base64($image_url);
if (!$image_base64) {
    log_edit_debug('base_image_fetch_failed', ['job_id' => $job_id, 'url' => $image_url]);
    json_error('Failed to download base image');
}

$inline_parts = [
    [
        'inlineData' => [
            'mimeType' => $image_base64['mime'],
            'data' => $image_base64['data']
        ]
    ]
];

// Include logo if available for reference
$logo_loaded = false;
if (!empty($client['logo_filename'])) {
    // Use logo_filename to read directly from disk (works on any environment)
    $logo_path = LOGO_DIR . $client['logo_filename'];
    if (is_file($logo_path)) {
        $logo_data = @file_get_contents($logo_path);
        if ($logo_data) {
            $ext = strtolower(pathinfo($client['logo_filename'], PATHINFO_EXTENSION));
            $mime = ($ext === 'png') ? 'image/png' : 'image/jpeg';
            $inline_parts[] = [
                'inlineData' => [
                    'mimeType' => $mime,
                    'data' => base64_encode($logo_data)
                ]
            ];
            $revised_prompt .= "\n\nIMPORTANT: The second image is the business LOGO. If the user asks to add the logo, place THIS EXACT logo in the design. NEVER modify, redraw, or translate any text in the logo.";
            $logo_loaded = true;
            log_edit_debug('logo_loaded', ['job_id' => $job_id, 'path' => $logo_path]);
        }
    }
}
// Fallback to URL fetch if logo_filename didn't work
if (!$logo_loaded && !empty($client['logo_url'])) {
    $logo = fetch_url_base64($client['logo_url']);
    if ($logo) {
        $inline_parts[] = [
            'inlineData' => [
                'mimeType' => $logo['mime'],
                'data' => $logo['data']
            ]
        ];
        $revised_prompt .= "\n\nIMPORTANT: The second image is the business LOGO. If the user asks to add the logo, place THIS EXACT logo in the design. NEVER modify, redraw, or translate any text in the logo.";
        log_edit_debug('logo_loaded_from_url', ['job_id' => $job_id, 'url' => $client['logo_url']]);
    } else {
        log_edit_debug('logo_fetch_failed', ['job_id' => $job_id, 'url' => $client['logo_url']]);
    }
}

log_edit_debug('final_prompt', [
    'job_id' => $job_id,
    'edit_mode' => $edit_mode,
    'model' => $edit_mode === 'recreate' ? GOOGLE_IMAGE_MODEL : GOOGLE_EDIT_IMAGE_MODEL,
    'prompt' => $revised_prompt
]);

$image_model = $edit_mode === 'recreate' ? null : GOOGLE_EDIT_IMAGE_MODEL;
$response_modalities = $edit_mode === 'recreate' ? ['TEXT', 'IMAGE'] : ['IMAGE'];
$gemini_image = call_gemini_image($revised_prompt, $inline_parts, $image_model, $response_modalities, null);
if (isset($gemini_image['error'])) {
    $error_message = $gemini_image['error'];
    if (!empty($gemini_image['status']) || !empty($gemini_image['response'])) {
        $error_message .= ' (status ' . ($gemini_image['status'] ?? 'n/a') . ')';
    }
    log_edit_debug('gemini_image_error', [
        'job_id' => $job_id,
        'status' => $gemini_image['status'] ?? null,
        'error' => $gemini_image['error']
    ]);
    $db->prepare("
        UPDATE web_design_edit_requests
        SET status = 'failed',
            error_message = ?
        WHERE id = (
            SELECT id FROM (
                SELECT id
                FROM web_design_edit_requests
                WHERE job_id = ? AND status = 'pending'
                ORDER BY id DESC
                LIMIT 1
            ) t
        )
    ")->execute([$error_message, $job_id]);
    json_response([
        'error' => $gemini_image['error'],
        'status' => $gemini_image['status'] ?? null,
        'response' => $gemini_image['response'] ?? null
    ], 502);
}

$base64 = extract_gemini_image_base64($gemini_image);
if (!$base64) {
    log_edit_debug('missing_image_data', ['job_id' => $job_id]);
    json_error('Gemini did not return image data');
}

$binary = base64_decode($base64);
$filename = 'design_edit_job' . $job_id . '_' . time() . '.png';
$path = GENERATED_DIR . $filename;
file_put_contents($path, $binary);
$url = BASE_URL . '/uploads/generated/' . $filename;

$existing_variations = $job['design_variations'] ? json_decode($job['design_variations'], true) : [];
if (!is_array($existing_variations)) {
    $existing_variations = [];
}
$updated_variations = array_values(array_filter(array_merge($existing_variations, [$url])));
$approved_index = max(0, count($updated_variations) - 1);

$stmt = $db->prepare("
    UPDATE creative_jobs
    SET design_variations = ?,
        approved_design_index = ?,
        design_prompt = ?,
        media_type = 'image',
        current_stage = 'await_design_approval'
    WHERE id = ?
");
$stmt->execute([json_encode($updated_variations), $approved_index, $revised_prompt, $job_id]);

$db->prepare("
    UPDATE web_design_edit_requests
    SET status = 'completed',
        completed_at = NOW(),
        result_image_url = ?
    WHERE id = (
        SELECT id FROM (
            SELECT id
            FROM web_design_edit_requests
            WHERE job_id = ? AND status = 'pending'
            ORDER BY id DESC
            LIMIT 1
        ) t
    )
")->execute([$url, $job_id]);

log_activity($job['client_id'], $job_id, 'design_edited_web', [
    'design_url' => $url
]);
log_edit_debug('edit_saved', [
    'job_id' => $job_id,
    'design_url' => $url
]);

json_response([
    'status' => 'design_saved',
    'job_id' => $job_id,
    'design_variations' => [$url],
    'next_step' => 'await_design_approval'
]);
?>
