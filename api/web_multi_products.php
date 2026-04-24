<?php
require_once '../config.php';

session_start();

if (!isset($_SESSION['web_user_id'])) {
    json_error('Unauthorized', 401);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Method not allowed', 405);
}

$job_id = isset($_GET['job_id']) ? (int)$_GET['job_id'] : 0;
if (!$job_id) {
    json_error('job_id required');
}

$db = get_db();
$stmt = $db->prepare("SELECT client_id FROM creative_jobs WHERE id = ?");
$stmt->execute([$job_id]);
$job = $stmt->fetch();
if (!$job) {
    json_error('Job not found', 404);
}

$user_role = $_SESSION['web_user_role'] ?? 'user';
if ($user_role !== 'admin') {
    $stmt = $db->prepare("
        SELECT client_id
        FROM web_user_clients
        WHERE web_user_id = ? AND client_id = ?
    ");
    $stmt->execute([(int)$_SESSION['web_user_id'], (int)$job['client_id']]);
    if (!$stmt->fetch()) {
        json_error('Brand not found', 404);
    }
}

$stmt = $db->prepare("
    SELECT id,
           job_id,
           sort_order,
           product_image_url,
           product_name,
           price,
           old_price,
           notes,
           generated_image_url,
           status,
           error_message,
           created_at,
           updated_at
    FROM web_multi_products
    WHERE job_id = ?
    ORDER BY sort_order ASC, id ASC
");
$stmt->execute([$job_id]);
$items = $stmt->fetchAll();

json_response(['items' => $items]);
?>
