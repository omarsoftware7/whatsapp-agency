<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/prompts.php';
require_once __DIR__ . '/ai_helpers.php';

set_time_limit(180);
ini_set('max_execution_time', '180');

$is_cli = PHP_SAPI === 'cli';
if (!$is_cli && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed', 405);
}

if ($is_cli) {
    $job_id = isset($argv[1]) ? (int)$argv[1] : 0;
} else {
    $input = json_decode(file_get_contents('php://input'), true);
    $job_id = isset($input['job_id']) ? (int)$input['job_id'] : 0;
}

if (!$job_id) {
    json_error('job_id required');
}

$db = get_db();
$stmt = $db->prepare("SELECT * FROM creative_jobs WHERE id = ?");
$stmt->execute([$job_id]);
$job = $stmt->fetch();
if (!$job) {
    json_error('Job not found', 404);
}

if ($job['job_type'] !== 'multi_mode') {
    json_error('Job is not multi_mode', 400);
}
if ($job['current_stage'] === 'rejected') {
    json_response(['status' => 'cancelled']);
}
if (!client_has_active_web_user((int)$job['client_id'])) {
    json_response(['status' => 'blocked']);
}

$stmt = $db->prepare("SELECT * FROM clients WHERE id = ?");
$stmt->execute([$job['client_id']]);
$client = $stmt->fetch();
if (!$client) {
    json_error('Client not found', 404);
}

$template_url = null;
if (!empty($job['design_variations'])) {
    $variations = json_decode($job['design_variations'], true);
    if (is_array($variations) && count($variations) > 0) {
        $index = isset($job['approved_design_index']) ? (int)$job['approved_design_index'] : 0;
        $template_url = $variations[$index] ?? $variations[0];
    }
}

if (!$template_url) {
    json_error('Template image not available');
}

$stmt = $db->prepare("
    SELECT id,
           sort_order,
           product_image_url,
           product_name,
           price,
           old_price,
           notes
    FROM web_multi_products
    WHERE job_id = ?
    ORDER BY sort_order ASC, id ASC
");
$stmt->execute([$job_id]);
$items = $stmt->fetchAll();

if (!$items) {
    json_error('No multi products found');
}

$template_image = fetch_url_base64($template_url);
if (!$template_image) {
    json_error('Failed to download template image');
}

$failed = 0;
$noCredits = false;
foreach ($items as $item) {
    if (!charge_client_credits($db, (int)$job['client_id'], 'image', 1)) {
        $db->prepare("
            UPDATE web_multi_products
            SET status = 'failed',
                error_message = 'Not enough image credits.'
            WHERE job_id = ? AND status IN ('pending','generating')
        ")->execute([$job_id]);
        $db->prepare("
            UPDATE creative_jobs
            SET error_message = ?,
                current_stage = 'await_user_input'
            WHERE id = ?
        ")->execute(['Not enough image credits to generate all variants.', $job_id]);
        $noCredits = true;
        break;
    }
    $stmt = $db->prepare("SELECT current_stage FROM creative_jobs WHERE id = ?");
    $stmt->execute([$job_id]);
    $stageRow = $stmt->fetch();
    if ($stageRow && $stageRow['current_stage'] === 'rejected') {
        $db->prepare("
            UPDATE web_multi_products
            SET status = 'failed',
                error_message = 'Cancelled'
            WHERE job_id = ? AND status IN ('pending','generating')
        ")->execute([$job_id]);
        json_response(['status' => 'cancelled']);
    }

    $db->prepare("
        UPDATE web_multi_products
        SET status = 'generating',
            error_message = NULL
        WHERE id = ?
    ")->execute([$item['id']]);

    $product_image = fetch_url_base64($item['product_image_url']);
    if (!$product_image) {
        $failed++;
        $db->prepare("
            UPDATE web_multi_products
            SET status = 'failed',
                error_message = 'Failed to download product image'
            WHERE id = ?
        ")->execute([$item['id']]);
        continue;
    }

    $prompt = build_multi_swap_prompt($client, $item);
    $inline_parts = [
        [
            'inlineData' => [
                'mimeType' => $template_image['mime'],
                'data' => $template_image['data']
            ]
        ],
        [
            'inlineData' => [
                'mimeType' => $product_image['mime'],
                'data' => $product_image['data']
            ]
        ]
    ];

    $gemini_image = call_gemini_image($prompt, $inline_parts, null, ['TEXT', 'IMAGE'], null);
    if (isset($gemini_image['error'])) {
        $failed++;
        $error_message = $gemini_image['error'];
        if (!empty($gemini_image['status'])) {
            $error_message .= ' (status ' . $gemini_image['status'] . ')';
        }
        $db->prepare("
            UPDATE web_multi_products
            SET status = 'failed',
                error_message = ?
            WHERE id = ?
        ")->execute([$error_message, $item['id']]);
        continue;
    }

    $base64 = extract_gemini_image_base64($gemini_image);
    if (!$base64) {
        $failed++;
        $db->prepare("
            UPDATE web_multi_products
            SET status = 'failed',
                error_message = 'Gemini did not return image data'
            WHERE id = ?
        ")->execute([$item['id']]);
        continue;
    }

    $binary = base64_decode($base64);
    $filename = 'multi_job' . $job_id . '_item' . $item['id'] . '_' . time() . '.png';
    $path = GENERATED_DIR . $filename;
    file_put_contents($path, $binary);
    $url = BASE_URL . '/uploads/generated/' . $filename;

    $db->prepare("
        UPDATE web_multi_products
        SET status = 'completed',
            generated_image_url = ?,
            error_message = NULL
        WHERE id = ?
    ")->execute([$url, $item['id']]);
}

$stmt = $db->prepare("SELECT current_stage FROM creative_jobs WHERE id = ?");
$stmt->execute([$job_id]);
$finalStage = $stmt->fetch();
if ($noCredits) {
    json_response(['status' => 'no_credits']);
}
if (!$finalStage || $finalStage['current_stage'] === 'rejected') {
    json_response(['status' => 'cancelled']);
}

$db->prepare("
    UPDATE creative_jobs
    SET current_stage = 'generate_ad_copy',
        completed_at = NULL
    WHERE id = ?
")->execute([$job_id]);

$cmd = escapeshellcmd(PHP_BINARY) . ' ' . escapeshellarg(__DIR__ . '/tool_generate_ad_copy.php') . ' ' . escapeshellarg((string)$job_id) . ' > /dev/null 2>&1 &';
exec($cmd);

log_activity($job['client_id'], $job_id, 'multi_mode_generated_web', [
    'total' => count($items),
    'failed' => $failed
]);

json_response([
    'status' => 'completed',
    'job_id' => $job_id,
    'failed' => $failed
]);
?>
