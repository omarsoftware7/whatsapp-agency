<?php
require_once '../config.php';
require_once __DIR__ . '/ai_helpers.php';
require_once __DIR__ . '/security_helpers.php';

session_start();

if (!isset($_SESSION['web_user_id'])) {
    json_error('Unauthorized', 401);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed', 405);
}

$db = get_db();
$user_id = (int)$_SESSION['web_user_id'];
$client_id = isset($_POST['client_id']) ? (int)$_POST['client_id'] : 0;

if (!$client_id) {
    json_error('client_id required');
}

$stmt = $db->prepare("
    SELECT client_id
    FROM web_user_clients
    WHERE web_user_id = ? AND client_id = ?
");
$stmt->execute([$user_id, $client_id]);
if (!$stmt->fetch()) {
    json_error('Brand not found', 404);
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

if (!isset($_FILES['logo'])) {
    json_error('logo file required');
}

// Validate upload with security checks
$allowed = ['png', 'jpg', 'jpeg'];
$validation = validate_upload($_FILES['logo'], $allowed, MAX_UPLOAD_SIZE, true);

if (!$validation['valid']) {
    json_error($validation['error']);
}

$ext = $validation['ext'];

// Generate safe filename (no user input)
$filename = generate_safe_filename('logo', $ext, $client_id);
$path = LOGO_DIR . $filename;

// Move with secure permissions
if (!secure_move_upload($_FILES['logo']['tmp_name'], $path)) {
    json_error('Failed to save logo', 500);
}

$logo_url = BASE_URL . '/uploads/logos/' . $filename;

// Analyze logo colors with Gemini
$primary_color = null;
$secondary_color = null;

try {
    $logo_base64 = base64_encode(file_get_contents($path));
    $mime_type = ($ext === 'png') ? 'image/png' : 'image/jpeg';
    
    $inline_parts = [
        [
            'inlineData' => [
                'mimeType' => $mime_type,
                'data' => $logo_base64
            ]
        ]
    ];
    
    $prompt = "Analyze this logo image and extract the brand colors. " .
        "Identify the PRIMARY brand color and SECONDARY brand color. " .
        "Ignore white (#FFFFFF) and black (#000000) backgrounds - pick meaningful brand colors. " .
        "If the logo only has one color, use a complementary shade as secondary. " .
        "Return ONLY a JSON object with this exact format: " .
        "{\"primary_color\": \"#HEXCODE\", \"secondary_color\": \"#HEXCODE\"}";
    
    $response = call_gemini_image($prompt, $inline_parts, GOOGLE_IMAGE_MODEL, ['TEXT'], null);
    
    if (isset($response['candidates'][0]['content']['parts'])) {
        foreach ($response['candidates'][0]['content']['parts'] as $part) {
            if (isset($part['text'])) {
                $text = $part['text'];
                // Extract JSON from response
                if (preg_match('/\{[^}]*"primary_color"\s*:\s*"(#[0-9A-Fa-f]{6})"[^}]*"secondary_color"\s*:\s*"(#[0-9A-Fa-f]{6})"[^}]*\}/s', $text, $matches)) {
                    $primary_color = $matches[1];
                    $secondary_color = $matches[2];
                } elseif (preg_match('/"primary_color"\s*:\s*"(#[0-9A-Fa-f]{6})"/s', $text, $match1) &&
                          preg_match('/"secondary_color"\s*:\s*"(#[0-9A-Fa-f]{6})"/s', $text, $match2)) {
                    $primary_color = $match1[1];
                    $secondary_color = $match2[1];
                }
                break;
            }
        }
    }
} catch (Exception $e) {
    // Color analysis failed, continue without colors
    error_log("Logo color analysis failed for client $client_id: " . $e->getMessage());
}

// Update client with logo and colors (if extracted)
if ($primary_color && $secondary_color) {
    $stmt = $db->prepare("UPDATE clients SET logo_filename = ?, primary_color = ?, secondary_color = ? WHERE id = ?");
    $stmt->execute([$filename, $primary_color, $secondary_color, $client_id]);
} else {
    $stmt = $db->prepare("UPDATE clients SET logo_filename = ? WHERE id = ?");
    $stmt->execute([$filename, $client_id]);
}

log_activity($client_id, null, 'logo_changed', [
    'source' => 'upload',
    'filename' => $filename,
    'colors_extracted' => ($primary_color && $secondary_color),
    'primary_color' => $primary_color,
    'secondary_color' => $secondary_color
]);

json_response([
    'status' => 'logo_saved',
    'logo_url' => $logo_url,
    'primary_color' => $primary_color,
    'secondary_color' => $secondary_color
]);
?>
