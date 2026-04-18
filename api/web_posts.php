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

$scheduledStmt = $db->prepare("
    SELECT sp.id AS schedule_id,
           sp.job_id,
           sp.scheduled_at,
           sp.status,
           sp.created_at,
           sp.published_at,
           j.job_type,
           j.user_message,
           j.design_variations,
           j.approved_design_index,
           j.ad_copy,
           j.facebook_post_id,
           j.instagram_post_id,
           j.instagram_permalink
    FROM web_scheduled_posts sp
    JOIN creative_jobs j ON j.id = sp.job_id
    WHERE sp.client_id = ?
    ORDER BY sp.scheduled_at DESC
");
$scheduledStmt->execute([$client_id]);
$scheduled = $scheduledStmt->fetchAll();

$publishedStmt = $db->prepare("
    SELECT id,
           job_type,
           user_message,
           design_variations,
           approved_design_index,
           ad_copy,
           facebook_post_id,
           instagram_post_id,
           instagram_permalink,
           published_at,
           created_at,
           current_stage
    FROM creative_jobs
    WHERE client_id = ?
      AND (
        published_at IS NOT NULL
        OR facebook_post_id IS NOT NULL
        OR instagram_post_id IS NOT NULL
        OR current_stage = 'completed'
      )
    ORDER BY published_at DESC, created_at DESC
");
$publishedStmt->execute([$client_id]);
$published = $publishedStmt->fetchAll();

json_response([
    'scheduled' => $scheduled,
    'published' => $published
]);
?>
