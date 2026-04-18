<?php
require_once '../config.php';
require_once __DIR__ . '/ai_helpers.php';
require_once __DIR__ . '/prompts.php';

session_start();

if (!isset($_SESSION['web_user_id'])) {
    json_error('Unauthorized', 401);
}

$db = get_db();
$user_id = (int)$_SESSION['web_user_id'];

function ensure_brand_owner(PDO $db, int $user_id, int $client_id) {
    $stmt = $db->prepare("
        SELECT client_id
        FROM web_user_clients
        WHERE web_user_id = ? AND client_id = ?
    ");
    $stmt->execute([$user_id, $client_id]);
    if (!$stmt->fetch()) {
        json_error('Brand not found', 404);
    }
}

function save_logo_from_base64(string $base64, int $client_id, string $suffix): array {
    $binary = base64_decode($base64);
    if ($binary === false) {
        json_error('Failed to decode logo data', 500);
    }
    $filename = 'web_logo_option_' . $client_id . '_' . $suffix . '.png';
    $path = LOGO_DIR . $filename;
    if (file_put_contents($path, $binary) === false) {
        json_error('Failed to save logo', 500);
    }
    return [
        'filename' => $filename,
        'url' => BASE_URL . '/uploads/logos/' . $filename
    ];
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $client_id = isset($_GET['client_id']) ? (int)$_GET['client_id'] : 0;
    if (!$client_id) {
        json_error('client_id required');
    }
    ensure_brand_owner($db, $user_id, $client_id);
    $stmt = $db->prepare("
        SELECT id, image_url, status, created_at
        FROM web_logo_options
        WHERE client_id = ?
        ORDER BY created_at DESC
    ");
    $stmt->execute([$client_id]);
    json_response(['items' => $stmt->fetchAll()]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed', 405);
}

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';
$client_id = (int)($input['client_id'] ?? 0);

if (!$client_id) {
    json_error('client_id required');
}

ensure_brand_owner($db, $user_id, $client_id);

$stmt = $db->prepare("
    SELECT c.*,
           wbp.category,
           wbp.website,
           wbp.instagram_handle,
           wbp.target_audience,
           wbp.price_range,
           wbp.facebook_page_url,
           wbp.instagram_page_url,
           wbp.country
    FROM clients c
    LEFT JOIN web_brand_profiles wbp ON wbp.client_id = c.id
    WHERE c.id = ?
");
$stmt->execute([$client_id]);
$client = $stmt->fetch();
if (!$client) {
    json_error('Brand not found', 404);
}

if ($action === 'generate' || $action === 'regenerate') {
    $batch_id = time();
    $variant_hints = ['Concept A', 'Concept B', 'Concept C'];
    if ($action === 'regenerate') {
        $stmt = $db->prepare("UPDATE web_logo_options SET status = 'superseded' WHERE client_id = ?");
        $stmt->execute([$client_id]);
    }
    $items = [];
    foreach ($variant_hints as $idx => $hint) {
        $prompt = build_logo_prompt($client, $client, $hint);
        $response = call_gemini_image($prompt, [], GOOGLE_IMAGE_MODEL, ['TEXT', 'IMAGE'], [
            'aspectRatio' => '1:1',
            'imageSize' => '1K'
        ]);
        $image_data = extract_gemini_image_base64($response);
        if (!$image_data) {
            json_error('Gemini did not return logo data');
        }
        $saved = save_logo_from_base64($image_data, $client_id, $batch_id . '_' . ($idx + 1));
        $stmt = $db->prepare("
            INSERT INTO web_logo_options (client_id, batch_id, image_url, prompt, status, created_at)
            VALUES (?, ?, ?, ?, 'option', NOW())
        ");
        $stmt->execute([$client_id, $batch_id, $saved['url'], $prompt]);
        $items[] = [
            'id' => (int)$db->lastInsertId(),
            'image_url' => $saved['url'],
            'status' => 'option'
        ];
    }
    json_response(['status' => 'generated', 'items' => $items]);
}

if ($action === 'edit') {
    $option_id = (int)($input['option_id'] ?? 0);
    $edit_text = trim($input['edit_text'] ?? '');
    if (!$option_id || $edit_text === '') {
        json_error('option_id and edit_text required');
    }
    $stmt = $db->prepare("SELECT image_url FROM web_logo_options WHERE id = ? AND client_id = ?");
    $stmt->execute([$option_id, $client_id]);
    $row = $stmt->fetch();
    if (!$row) {
        json_error('Logo option not found', 404);
    }
    $image = fetch_url_base64($row['image_url']);
    if (!$image) {
        json_error('Failed to load source logo', 500);
    }
    $inline = [
        [
            'inlineData' => [
                'mimeType' => $image['mime'],
                'data' => $image['data']
            ]
        ]
    ];
    $prompt = build_logo_prompt($client, $client, 'Edit', $edit_text);
    $response = call_gemini_image($prompt, $inline, GOOGLE_IMAGE_MODEL, ['TEXT', 'IMAGE'], [
        'aspectRatio' => '1:1',
        'imageSize' => '1K'
    ]);
    $image_data = extract_gemini_image_base64($response);
    if (!$image_data) {
        json_error('Gemini did not return logo data');
    }
    $saved = save_logo_from_base64($image_data, $client_id, time() . '_edit');
    $stmt = $db->prepare("
        INSERT INTO web_logo_options (client_id, batch_id, image_url, prompt, status, created_at)
        VALUES (?, ?, ?, ?, 'option', NOW())
    ");
    $stmt->execute([$client_id, time(), $saved['url'], $prompt]);
    json_response([
        'status' => 'edited',
        'item' => [
            'id' => (int)$db->lastInsertId(),
            'image_url' => $saved['url'],
            'status' => 'option'
        ]
    ]);
}

if ($action === 'approve') {
    $option_id = (int)($input['option_id'] ?? 0);
    if (!$option_id) {
        json_error('option_id required');
    }
    // Hard limit: logo can be changed at most 3 times per brand.
    $stmt = $db->prepare("
        SELECT COUNT(*) AS count
        FROM activity_log
        WHERE client_id = ? AND event_type = 'logo_changed'
    ");
    $stmt->execute([$client_id]);
    $logo_changes = (int)($stmt->fetch()['count'] ?? 0);
    if ($logo_changes >= 3) {
        json_error('Logo change limit reached (max 3).');
    }
    $stmt = $db->prepare("SELECT image_url FROM web_logo_options WHERE id = ? AND client_id = ?");
    $stmt->execute([$option_id, $client_id]);
    $row = $stmt->fetch();
    if (!$row) {
        json_error('Logo option not found', 404);
    }
    $url = $row['image_url'];
    $filename = basename(parse_url($url, PHP_URL_PATH));
    $stmt = $db->prepare("UPDATE clients SET logo_filename = ? WHERE id = ?");
    $stmt->execute([$filename, $client_id]);
    $stmt = $db->prepare("UPDATE web_logo_options SET status = 'approved' WHERE id = ?");
    $stmt->execute([$option_id]);
    log_activity($client_id, null, 'logo_changed', [
        'source' => 'approve',
        'filename' => $filename
    ]);
    json_response(['status' => 'approved', 'logo_url' => $url]);
}

json_error('Invalid action', 400);
?>
