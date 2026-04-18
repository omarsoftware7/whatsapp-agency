<?php
require_once '../config.php';

session_start();

if (!isset($_SESSION['web_user_id'])) {
    json_error('Unauthorized', 401);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Method not allowed', 405);
}

$client_id = $_GET['client_id'] ?? null;
if (!$client_id) {
    json_error('client_id required');
}

$db = get_db();
$user_id = (int)$_SESSION['web_user_id'];

$stmt = $db->prepare("
    SELECT client_id
    FROM web_user_clients
    WHERE web_user_id = ? AND client_id = ?
");
$stmt->execute([$user_id, $client_id]);
if (!$stmt->fetch()) {
    json_error('Brand not found', 404);
}

$stmt = $db->prepare("
    SELECT meta_page_id,
           instagram_account_id,
           meta_tokens_valid,
           meta_page_token_expires
    FROM web_brand_profiles
    WHERE client_id = ?
");
$stmt->execute([$client_id]);
$profile = $stmt->fetch();

$expires_soon = false;
if (!empty($profile['meta_page_token_expires'])) {
    $days_until_expiry = (strtotime($profile['meta_page_token_expires']) - time()) / 86400;
    $expires_soon = $days_until_expiry < 7;
}

json_response([
    'connected' => !empty($profile['meta_tokens_valid']),
    'page_id' => $profile['meta_page_id'] ?? null,
    'instagram_account_id' => $profile['instagram_account_id'] ?? null,
    'expires' => $profile['meta_page_token_expires'] ?? null,
    'expires_soon' => $expires_soon
]);
?>
