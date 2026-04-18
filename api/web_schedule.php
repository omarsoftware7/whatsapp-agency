<?php
require_once '../config.php';

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

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $client_id = isset($_GET['client_id']) ? (int)$_GET['client_id'] : 0;
    if (!$client_id) {
        json_error('client_id required');
    }
    ensure_brand_owner($db, $user_id, $client_id);
    $stmt = $db->prepare("
        SELECT sp.id,
               sp.job_id,
               sp.scheduled_at,
               sp.status,
               sp.created_at,
               sp.published_at,
               j.job_type,
               j.user_message
        FROM web_scheduled_posts sp
        JOIN creative_jobs j ON j.id = sp.job_id
        WHERE sp.client_id = ?
        ORDER BY sp.scheduled_at ASC
    ");
    $stmt->execute([$client_id]);
    json_response(['items' => $stmt->fetchAll()]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed', 405);
}

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';

if ($action === 'schedule') {
    $job_id = (int)($input['job_id'] ?? 0);
    $scheduled_at = trim($input['scheduled_at'] ?? '');
    $publish_type = $input['publish_type'] ?? 'post';
    
    // Validate publish_type
    if (!in_array($publish_type, ['post', 'story'], true)) {
        $publish_type = 'post';
    }
    
    if (!$job_id || $scheduled_at === '') {
        json_error('job_id and scheduled_at required');
    }
    $stmt = $db->prepare("SELECT id, client_id, job_type FROM creative_jobs WHERE id = ?");
    $stmt->execute([$job_id]);
    $job = $stmt->fetch();
    if (!$job) {
        json_error('Job not found', 404);
    }
    
    // Multi-mode only supports post, not story
    if ($job['job_type'] === 'multi_mode') {
        $publish_type = 'post';
    }
    
    ensure_brand_owner($db, $user_id, (int)$job['client_id']);
    $stmt = $db->prepare("
        INSERT INTO web_scheduled_posts (job_id, client_id, scheduled_at, publish_type, status, created_at)
        VALUES (?, ?, ?, ?, 'pending', NOW())
        ON DUPLICATE KEY UPDATE scheduled_at = VALUES(scheduled_at), publish_type = VALUES(publish_type), status = 'pending'
    ");
    $stmt->execute([$job_id, (int)$job['client_id'], $scheduled_at, $publish_type]);
    json_response(['status' => 'scheduled']);
}

if ($action === 'cancel') {
    $schedule_id = (int)($input['schedule_id'] ?? 0);
    if (!$schedule_id) {
        json_error('schedule_id required');
    }
    $stmt = $db->prepare("
        SELECT client_id
        FROM web_scheduled_posts
        WHERE id = ?
    ");
    $stmt->execute([$schedule_id]);
    $row = $stmt->fetch();
    if (!$row) {
        json_error('Scheduled post not found', 404);
    }
    ensure_brand_owner($db, $user_id, (int)$row['client_id']);
    $stmt = $db->prepare("UPDATE web_scheduled_posts SET status = 'cancelled' WHERE id = ?");
    $stmt->execute([$schedule_id]);
    json_response(['status' => 'cancelled']);
}

json_error('Invalid action', 400);
?>
