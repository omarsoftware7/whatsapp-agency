<?php
require_once '../config.php';

session_start();

if (!isset($_SESSION['web_user_id']) || ($_SESSION['web_user_role'] ?? 'user') !== 'admin') {
    json_error('Unauthorized', 401);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Method not allowed', 405);
}

$user_id = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0;
if (!$user_id) {
    json_error('user_id required');
}

$db = get_db();

// Get user's brands/clients
$stmt = $db->prepare("SELECT client_id FROM web_user_clients WHERE web_user_id = ?");
$stmt->execute([$user_id]);
$client_rows = $stmt->fetchAll();
$client_ids = array_map(static fn($row) => (int)$row['client_id'], $client_rows);

// Also get brands the user owns from clients table
try {
    $stmt = $db->prepare("SELECT id FROM clients WHERE web_user_id = ?");
    $stmt->execute([$user_id]);
    foreach ($stmt->fetchAll() as $row) {
        $cid = (int)$row['id'];
        if (!in_array($cid, $client_ids, true)) {
            $client_ids[] = $cid;
        }
    }
} catch (Throwable $e) {
    // ignore if clients.web_user_id doesn't exist
}

$jobs = [];
$activity = [];
$design_requests = [];
$landing_requests = [];
$brands = [];

if ($client_ids) {
    $placeholders = implode(',', array_fill(0, count($client_ids), '?'));

    // Get brands info
    try {
        $stmt = $db->prepare("SELECT id, business_name, created_at FROM clients WHERE id IN ($placeholders)");
        $stmt->execute($client_ids);
        $brands = $stmt->fetchAll();
    } catch (Throwable $e) {
        // ignore
    }

    // Jobs
    try {
        $jobs_stmt = $db->prepare("
            SELECT cj.id,
                   cj.client_id,
                   c.business_name,
                   cj.job_type,
                   cj.current_stage,
                   cj.user_message,
                   cj.rejection_count,
                   cj.created_at,
                   dj.deleted_at
            FROM creative_jobs cj
            JOIN clients c ON c.id = cj.client_id
            LEFT JOIN web_deleted_jobs dj ON dj.job_id = cj.id AND dj.web_user_id = ?
            WHERE cj.client_id IN ($placeholders)
            ORDER BY cj.created_at DESC
            LIMIT 50
        ");
        $jobs_stmt->execute(array_merge([$user_id], $client_ids));
        $jobs = $jobs_stmt->fetchAll();
    } catch (Throwable $e) {
        // Table might not exist
    }

    // Activity log
    try {
        $activity_stmt = $db->prepare("
            SELECT al.id,
                   al.client_id,
                   c.business_name,
                   al.job_id,
                   al.event_type,
                   al.event_data,
                   al.created_at
            FROM activity_log al
            JOIN clients c ON c.id = al.client_id
            WHERE al.client_id IN ($placeholders)
            ORDER BY al.created_at DESC
            LIMIT 50
        ");
        $activity_stmt->execute($client_ids);
        $activity = $activity_stmt->fetchAll();
    } catch (Throwable $e) {
        // Table might not exist
    }

    // Design edit requests
    try {
        $design_stmt = $db->prepare("
            SELECT dr.id,
                   dr.job_id,
                   dr.client_id,
                   c.business_name,
                   dr.user_edit,
                   dr.status,
                   dr.error_message,
                   dr.requested_at,
                   dr.completed_at
            FROM web_design_edit_requests dr
            JOIN clients c ON c.id = dr.client_id
            WHERE dr.client_id IN ($placeholders)
            ORDER BY dr.requested_at DESC
            LIMIT 50
        ");
        $design_stmt->execute($client_ids);
        $design_requests = $design_stmt->fetchAll();
    } catch (Throwable $e) {
        // Table might not exist
    }

    // Landing page edit requests
    try {
        $landing_stmt = $db->prepare("
            SELECT lr.id,
                   lr.landing_page_id,
                   lr.client_id,
                   c.business_name,
                   lp.title AS landing_title,
                   lr.user_prompt,
                   lr.status,
                   lr.error_message,
                   lr.created_at,
                   lr.completed_at
            FROM web_landing_page_edits lr
            JOIN web_landing_pages lp ON lp.id = lr.landing_page_id
            JOIN clients c ON c.id = lr.client_id
            WHERE lr.client_id IN ($placeholders)
            ORDER BY lr.created_at DESC
            LIMIT 50
        ");
        $landing_stmt->execute($client_ids);
        $landing_requests = $landing_stmt->fetchAll();
    } catch (Throwable $e) {
        // Table might not exist
    }
}

// Get user's payments
$payments = [];
try {
    $stmt = $db->prepare("
        SELECT id, amount, currency, paypal_subscription_id, status, created_at
        FROM web_payments
        WHERE web_user_id = ?
        ORDER BY created_at DESC
        LIMIT 20
    ");
    $stmt->execute([$user_id]);
    $payments = $stmt->fetchAll();
} catch (Throwable $e) {
    // Table might not exist
}

// Get user's login history
$logins = [];
try {
    $stmt = $db->prepare("
        SELECT id, ip_address, user_agent, login_at
        FROM web_login_history
        WHERE web_user_id = ?
        ORDER BY login_at DESC
        LIMIT 20
    ");
    $stmt->execute([$user_id]);
    $logins = $stmt->fetchAll();
} catch (Throwable $e) {
    // Table might not exist
}

// Get user's referral info
$referrals_made = [];
try {
    $stmt = $db->prepare("
        SELECT r.id, r.referred_user_id, r.status, r.rewarded_at, r.created_at, u.email AS referred_email
        FROM web_referrals r
        LEFT JOIN web_users u ON u.id = r.referred_user_id
        WHERE r.referrer_user_id = ?
        ORDER BY r.created_at DESC
        LIMIT 20
    ");
    $stmt->execute([$user_id]);
    $referrals_made = $stmt->fetchAll();
} catch (Throwable $e) {
    // Table might not exist
}

json_response([
    'jobs' => $jobs,
    'activity' => $activity,
    'design_requests' => $design_requests,
    'landing_requests' => $landing_requests,
    'brands' => $brands,
    'payments' => $payments,
    'logins' => $logins,
    'referrals_made' => $referrals_made,
    'client_ids' => $client_ids // debug info
]);
?>
