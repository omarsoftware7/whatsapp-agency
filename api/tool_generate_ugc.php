<?php
require_once '../config.php';
require_once './prompts.php';
require_once './ai_helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed', 405);
}

$input = json_decode(file_get_contents('php://input'), true);
$job_id = isset($input['job_id']) ? (int)$input['job_id'] : 0;

if (!$job_id) {
    json_error('job_id required');
}

if (KIE_API_KEY === 'YOUR_KIE_API_KEY_HERE') {
    json_error('KIE_API_KEY not configured', 400);
}

$db = get_db();
$stmt = $db->prepare("SELECT * FROM creative_jobs WHERE id = ?");
$stmt->execute([$job_id]);
$job = $stmt->fetch();
if (!$job) {
    json_error('Job not found', 404);
}
if ($job['current_stage'] === 'rejected') {
    json_response(['status' => 'cancelled']);
}
if (!client_has_active_web_user((int)$job['client_id'])) {
    json_response(['status' => 'blocked']);
}

if (!charge_client_credits($db, (int)$job['client_id'], 'video', 1)) {
    $db->prepare("
        UPDATE creative_jobs
        SET error_message = ?,
            current_stage = 'await_user_input'
        WHERE id = ?
    ")->execute(['Not enough video credits to generate a UGC video.', $job_id]);
    json_response(['status' => 'no_credits']);
}

$product_images = $job['product_images'] ? json_decode($job['product_images'], true) : [];
if (!is_array($product_images) || count($product_images) === 0) {
    json_error('product_images required for UGC');
}

$image_url = $product_images[count($product_images) - 1];

// Describe the reference image for better UGC prompting
$image_description = '';
$image_data = fetch_url_base64($image_url);
if ($image_data) {
    $analysis_prompt = build_image_analysis_prompt();
    $analysis_parts = [[
        'inlineData' => [
            'mimeType' => $image_data['mime'],
            'data' => $image_data['data']
        ]
    ]];
    $analysis_response = call_gemini_text_with_images($analysis_prompt, $analysis_parts);
    if (!isset($analysis_response['error'])) {
        $image_description = extract_gemini_text($analysis_response) ?? '';
    }
}

$extracted = $job['extracted_data'] ? json_decode($job['extracted_data'], true) : [];
$spoken_language = $extracted['ugc_language'] ?? null;
$accent = $extracted['ugc_accent'] ?? null;
$ugc_auto = !empty($extracted['ugc_auto']);

$system_prompt = build_ugc_scene_system_prompt();
$user_prompt = build_ugc_scene_user_prompt(
    $ugc_auto ? '' : ($job['user_message'] ?? ''),
    $image_description,
    1,
    $spoken_language,
    $accent
);
$prompt_response = call_gemini_text_with_options($system_prompt . "\n\n" . $user_prompt, 2048, 0.4);
if (isset($prompt_response['error'])) {
    json_error('UGC prompt generation failed', 502);
}
$prompt_text = extract_gemini_text($prompt_response) ?? '';
$json_match = preg_match('/\{[\s\S]*\}/', $prompt_text, $matches);
$scene_prompt = null;
$scene_ratio = '9:16';
$scene_model = 'veo3_fast';
if ($json_match) {
    $json = json_decode($matches[0], true);
    if (isset($json['scenes'][0]['video_prompt'])) {
        $scene_prompt = $json['scenes'][0]['video_prompt'];
        $scene_ratio = $json['scenes'][0]['aspect_ratio_video'] ?? $scene_ratio;
        $scene_model = $json['scenes'][0]['model'] ?? $scene_model;
    }
}
if (!$scene_prompt) {
    $scene_prompt = "dialogue: " . ($job['user_message'] ?? 'Introduce the product in a casual, friendly way.') . "\n";
    $scene_prompt .= "action: person holds the product and talks to camera\n";
    $scene_prompt .= "camera: amateur iphone selfie video, slightly uneven framing\n";
    $scene_prompt .= "emotion: friendly, relaxed\n";
}
if ($spoken_language) {
    $scene_prompt .= "\n" . "narration language: {$spoken_language}";
}
if ($accent) {
    $scene_prompt .= "\n" . "voice accent: {$accent}";
}

$public_image_url = $image_url;
if (strpos($image_url, '127.0.0.1') !== false || strpos($image_url, 'localhost') !== false) {
    $public_image_url = str_replace(
        ['http://127.0.0.1:8000', 'http://localhost:8000', 'http://localhost:5173', 'http://localhost'],
        'https://getadly.com',
        $image_url
    );
}

$payload = [
    'prompt' => $scene_prompt,
    'model' => $scene_model,
    'aspectRatio' => $scene_ratio,
    'imageUrls' => [$public_image_url]
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
$response = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($code !== 200) {
    json_error('KIE generate failed', $code);
}

$result = json_decode($response, true);
$task_id = $result['data']['taskId'] ?? null;
if (!$task_id) {
    json_error('KIE taskId missing');
}

$video_url = null;
for ($i = 0; $i < 6; $i++) {
    sleep(10);
    $poll = curl_init('https://api.kie.ai/api/v1/veo/record-info?taskId=' . urlencode($task_id));
    curl_setopt($poll, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($poll, CURLOPT_HTTPHEADER, $headers);
    $poll_response = curl_exec($poll);
    $poll_code = curl_getinfo($poll, CURLINFO_HTTP_CODE);
    curl_close($poll);
    if ($poll_code !== 200) {
        continue;
    }
    $poll_result = json_decode($poll_response, true);
    if (($poll_result['data']['successFlag'] ?? 0) == 1) {
        $video_url = $poll_result['data']['response']['resultUrls'][0] ?? null;
        break;
    }
}

if (!$video_url) {
    json_error('UGC generation timed out', 408);
}

$stmt = $db->prepare("
    UPDATE creative_jobs
    SET design_variations = ?,
        design_prompt = ?,
        media_type = 'video',
        current_stage = 'await_design_approval'
    WHERE id = ?
");
$stmt->execute([json_encode([$video_url]), $scene_prompt, $job_id]);

log_activity($job['client_id'], $job_id, 'ugc_generated_web', [
    'video_url' => $video_url
]);

json_response([
    'status' => 'design_saved',
    'job_id' => $job_id,
    'design_variations' => [$video_url],
    'next_step' => 'await_design_approval'
]);
?>
