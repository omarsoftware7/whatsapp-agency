<?php
require_once '../config.php';

session_start();

if (!isset($_SESSION['web_user_id']) || ($_SESSION['web_user_role'] ?? 'user') !== 'admin') {
    json_error('Unauthorized', 401);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Method not allowed', 405);
}

$db = get_db();
$job_id = isset($_GET['job_id']) ? (int)$_GET['job_id'] : 0;

if ($job_id) {
    $stmt = $db->prepare("
        SELECT cj.*,
               c.business_name,
               c.logo_filename,
               c.logo_url,
               c.primary_color,
               c.secondary_color,
               GROUP_CONCAT(DISTINCT u.email ORDER BY u.email SEPARATOR ', ') AS owner_emails,
               GROUP_CONCAT(DISTINCT u.first_name ORDER BY u.email SEPARATOR ', ') AS owner_names
        FROM creative_jobs cj
        JOIN clients c ON c.id = cj.client_id
        LEFT JOIN web_user_clients wuc ON wuc.client_id = cj.client_id
        LEFT JOIN web_users u ON u.id = wuc.web_user_id
        WHERE cj.id = ?
        GROUP BY cj.id
        LIMIT 1
    ");
    $stmt->execute([$job_id]);
    $job = $stmt->fetch();
    if (!$job) {
        json_error('Job not found', 404);
    }
    
    // Fetch design edit history for this job
    $editStmt = $db->prepare("
        SELECT id, user_edit, status, error_message, result_image_url,
               requested_at, completed_at,
               TIMESTAMPDIFF(SECOND, requested_at, completed_at) as processing_seconds
        FROM web_design_edit_requests
        WHERE job_id = ?
        ORDER BY id ASC
    ");
    $editStmt->execute([$job_id]);
    $job['edit_history'] = $editStmt->fetchAll();
    
    json_response(['item' => $job]);
}

// Get stats for dashboard
$stats = [];

// Total jobs today
$stmt = $db->query("SELECT COUNT(*) FROM creative_jobs WHERE DATE(created_at) = CURDATE()");
$stats['jobs_today'] = (int)$stmt->fetchColumn();

// Total jobs this week
$stmt = $db->query("SELECT COUNT(*) FROM creative_jobs WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)");
$stats['jobs_week'] = (int)$stmt->fetchColumn();

// Average processing time (completed jobs in last 7 days)
$stmt = $db->query("
    SELECT AVG(processing_time_ms) as avg_time, 
           MIN(processing_time_ms) as min_time, 
           MAX(processing_time_ms) as max_time,
           COUNT(*) as completed_count
    FROM creative_jobs 
    WHERE completed_at IS NOT NULL 
    AND completed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
");
$timeStats = $stmt->fetch();
$stats['avg_processing_ms'] = $timeStats['avg_time'] ? (int)$timeStats['avg_time'] : null;
$stats['min_processing_ms'] = $timeStats['min_time'] ? (int)$timeStats['min_time'] : null;
$stats['max_processing_ms'] = $timeStats['max_time'] ? (int)$timeStats['max_time'] : null;
$stats['completed_count'] = (int)$timeStats['completed_count'];

// Jobs by stage
$stmt = $db->query("
    SELECT current_stage, COUNT(*) as count
    FROM creative_jobs
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    GROUP BY current_stage
");
$stats['by_stage'] = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

// Jobs stuck in PROCESSING (model hasn't responded) - not user-waiting stages
$stmt = $db->query("
    SELECT COUNT(*) FROM creative_jobs 
    WHERE current_stage IN ('generate_design', 'generate_ad_copy', 'generate_multi_variants', 'publishing')
    AND created_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE)
");
$stats['stuck_jobs'] = (int)$stmt->fetchColumn();

// Slow jobs (> 5 minutes processing)
$stmt = $db->query("
    SELECT COUNT(*) FROM creative_jobs 
    WHERE processing_time_ms > 300000
    AND completed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
");
$stats['slow_jobs'] = (int)$stmt->fetchColumn();

// Failed jobs (rejected or errored) this week
$stmt = $db->query("
    SELECT COUNT(*) FROM creative_jobs 
    WHERE current_stage = 'rejected'
    AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
");
$stats['failed_jobs'] = (int)$stmt->fetchColumn();

// Get all jobs with timing info
$stmt = $db->query("
    SELECT cj.id,
           cj.client_id,
           cj.job_type,
           cj.user_message,
           cj.current_stage,
           cj.created_at,
           cj.completed_at,
           cj.processing_time_ms,
           cj.design_approved_at,
           cj.ad_copy_approved_at,
           cj.published_at,
           cj.design_variations,
           cj.approved_design_index,
           cj.ad_copy,
           cj.image_size,
           cj.language,
           cj.facebook_post_id,
           cj.instagram_post_id,
           cj.instagram_permalink,
           c.business_name,
           c.logo_filename,
           c.logo_url,
           GROUP_CONCAT(DISTINCT u.email ORDER BY u.email SEPARATOR ', ') AS owner_emails,
           GROUP_CONCAT(DISTINCT u.first_name ORDER BY u.email SEPARATOR ', ') AS owner_names
    FROM creative_jobs cj
    JOIN clients c ON c.id = cj.client_id
    LEFT JOIN web_user_clients wuc ON wuc.client_id = cj.client_id
    LEFT JOIN web_users u ON u.id = wuc.web_user_id
    GROUP BY cj.id
    ORDER BY cj.created_at DESC
    LIMIT 500
");
$items = $stmt->fetchAll();
json_response(['items' => $items, 'stats' => $stats]);
?>
