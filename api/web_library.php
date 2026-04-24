<?php
require_once '../config.php';

session_start();

if (!isset($_SESSION['web_user_id'])) {
    json_error('Unauthorized', 401);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Method not allowed', 405);
}

$client_id = isset($_GET['client_id']) ? (int)$_GET['client_id'] : 0;
if (!$client_id) {
    json_error('client_id required');
}

$db = get_db();
$user_id = (int)$_SESSION['web_user_id'];
$user_role = $_SESSION['web_user_role'] ?? 'user';

if ($user_role !== 'admin') {
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

$stmt = $db->prepare("
    SELECT id,
           user_images,
           product_images,
           design_variations,
           reel_video_url,
           ad_copy,
           created_at
    FROM creative_jobs
    WHERE client_id = ?
    ORDER BY created_at DESC
");
$stmt->execute([$client_id]);
$jobs = $stmt->fetchAll();

$uploads = [];
$images = [];
$videos = [];
$copies = [];

foreach ($jobs as $job) {
    foreach (['user_images', 'product_images'] as $field) {
        if (empty($job[$field])) {
            continue;
        }
        $decoded = json_decode($job[$field], true);
        if (is_array($decoded)) {
            $uploads = array_merge($uploads, $decoded);
        }
    }

    if (!empty($job['design_variations'])) {
        $decoded = json_decode($job['design_variations'], true);
        if (is_array($decoded)) {
            $images = array_merge($images, $decoded);
        }
    }

    if (!empty($job['reel_video_url'])) {
        $videos[] = $job['reel_video_url'];
    }

    if (!empty($job['ad_copy'])) {
        $copies[] = [
            'job_id' => (int)$job['id'],
            'ad_copy' => $job['ad_copy'],
            'created_at' => $job['created_at']
        ];
    }
}

$stmt = $db->prepare("
    SELECT mp.generated_image_url
    FROM web_multi_products mp
    JOIN creative_jobs cj ON mp.job_id = cj.id
    WHERE cj.client_id = ?
      AND mp.generated_image_url IS NOT NULL
");
$stmt->execute([$client_id]);
$multi_images = $stmt->fetchAll();
foreach ($multi_images as $row) {
    if (!empty($row['generated_image_url'])) {
        $images[] = $row['generated_image_url'];
    }
}

$uploads = array_values(array_unique($uploads));
$images = array_values(array_unique($images));
$videos = array_values(array_unique($videos));

json_response([
    'uploads' => $uploads,
    'images' => $images,
    'videos' => $videos,
    'copies' => $copies
]);
?>
