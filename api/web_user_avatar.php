<?php
require_once '../config.php';
require_once __DIR__ . '/security_helpers.php';

session_start();

if (!isset($_SESSION['web_user_id'])) {
    json_error('Unauthorized', 401);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed', 405);
}

if (!isset($_FILES['avatar'])) {
    json_error('avatar required');
}

// Validate upload with security checks
$allowed = ['png', 'jpg', 'jpeg'];
$validation = validate_upload($_FILES['avatar'], $allowed, MAX_UPLOAD_SIZE, true);

if (!$validation['valid']) {
    json_error($validation['error']);
}

$user_id = (int)$_SESSION['web_user_id'];
$ext = $validation['ext'];

// Generate safe filename (no user input)
$filename = generate_safe_filename('avatar', $ext, $user_id);
$path = AVATAR_DIR . $filename;

// Move with secure permissions
if (!secure_move_upload($_FILES['avatar']['tmp_name'], $path)) {
    json_error('Failed to save file');
}

$url = BASE_URL . '/uploads/avatars/' . $filename;
$db = get_db();
$stmt = $db->prepare("UPDATE web_users SET avatar_url = ?, updated_at = NOW() WHERE id = ?");
$stmt->execute([$url, $user_id]);
$_SESSION['web_user_avatar_url'] = $url;

json_response(['status' => 'uploaded', 'avatar_url' => $url]);
?>
