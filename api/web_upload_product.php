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

if (!isset($_FILES['product_images'])) {
    json_error('product_images required');
}

$files = $_FILES['product_images'];
$urls = [];
$allowed = ['png', 'jpg', 'jpeg'];

// Validate all uploads first
$validation = validate_multiple_uploads($files, $allowed, MAX_UPLOAD_SIZE, true);

if (empty($validation['valid'])) {
    $error_msg = 'No valid images uploaded';
    if (!empty($validation['errors'])) {
        $first_error = reset($validation['errors']);
        $error_msg = $first_error;
    }
    json_error($error_msg);
}

// Process valid uploads
foreach ($validation['valid'] as $index) {
    $tmp_name = $files['tmp_name'][$index];
    $original_name = $files['name'][$index];
    $ext = strtolower(pathinfo($original_name, PATHINFO_EXTENSION));
    
    // Generate safe filename
    $filename = generate_safe_filename('product', $ext, $client_id);
    $path = PRODUCT_DIR . $filename;
    
    // Move with secure permissions
    if (secure_move_upload($tmp_name, $path)) {
        $urls[] = BASE_URL . '/uploads/products/' . $filename;
    }
}

if (!$urls) {
    json_error('Failed to save images');
}

json_response([
    'status' => 'uploaded',
    'urls' => $urls
]);
?>
