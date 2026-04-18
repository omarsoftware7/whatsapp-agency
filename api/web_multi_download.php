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
$user_id = (int)$_SESSION['web_user_id'];

$stmt = $db->prepare("SELECT client_id FROM creative_jobs WHERE id = ?");
$stmt->execute([$job_id]);
$job = $stmt->fetch();
if (!$job) {
    json_error('Job not found', 404);
}

$stmt = $db->prepare("
    SELECT client_id
    FROM web_user_clients
    WHERE web_user_id = ? AND client_id = ?
");
$stmt->execute([$user_id, (int)$job['client_id']]);
if (!$stmt->fetch()) {
    json_error('Brand not found', 404);
}

$stmt = $db->prepare("
    SELECT generated_image_url
    FROM web_multi_products
    WHERE job_id = ? AND generated_image_url IS NOT NULL
    ORDER BY sort_order ASC, id ASC
");
$stmt->execute([$job_id]);
$rows = $stmt->fetchAll();

if (!$rows) {
    json_error('No generated images yet');
}

$zip_name = 'multi_job' . $job_id . '_' . time() . '.zip';
$zip_path = GENERATED_DIR . $zip_name;
$zip = new ZipArchive();
if ($zip->open($zip_path, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
    json_error('Failed to create zip');
}

foreach ($rows as $index => $row) {
    $url = $row['generated_image_url'];
    if (!$url) {
        continue;
    }
    $path = null;
    if (strpos($url, BASE_URL . '/uploads/') === 0) {
        $relative = substr($url, strlen(BASE_URL . '/uploads/'));
        $path = UPLOAD_DIR . $relative;
    }
    if (!$path || !file_exists($path)) {
        continue;
    }
    $zip->addFile($path, 'image_' . ($index + 1) . '.png');
}

$zip->close();

json_response([
    'status' => 'ready',
    'url' => BASE_URL . '/uploads/generated/' . $zip_name
]);
?>
