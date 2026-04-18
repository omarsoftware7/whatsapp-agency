<?php
// ================================================================
// GET CLIENT INFO - Retrieve complete client information
// Upload to: /public_html/api/get_client_info.php
// ================================================================

require_once '../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed', 405);
}

// Check API key
$api_key = get_api_key_from_request();
if (!check_api_key($api_key)) {
    json_error('Unauthorized', 401);
}

// Get client_id
$client_id = $_GET['client_id'] ?? $_POST['client_id'] ?? null;

// Support JSON body for POST requests
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !$client_id) {
    $input = json_decode(file_get_contents('php://input'), true);
    $client_id = $input['client_id'] ?? null;
}

if (!$client_id) {
    json_error('client_id required');
}

$db = get_db();

// Get client by ID
$stmt = $db->prepare("SELECT * FROM clients WHERE id = ?");
$stmt->execute([$client_id]);

$client = $stmt->fetch();

if (!$client) {
    json_error('Client not found', 404);
}

$client_id = $client['id'];

// Get active jobs count
$stmt = $db->prepare("
    SELECT COUNT(*) as active_jobs 
    FROM creative_jobs 
    WHERE client_id = ? 
    AND current_stage NOT IN ('published', 'cancelled')
");
$stmt->execute([$client_id]);
$job_stats = $stmt->fetch();

// Get latest job if exists
$stmt = $db->prepare("
    SELECT * 
    FROM creative_jobs 
    WHERE client_id = ? 
    ORDER BY created_at DESC 
    LIMIT 1
");
$stmt->execute([$client_id]);
$latest_job = $stmt->fetch();

// Get total published jobs
$stmt = $db->prepare("
    SELECT COUNT(*) as total_published 
    FROM creative_jobs 
    WHERE client_id = ? 
    AND current_stage = 'published'
");
$stmt->execute([$client_id]);
$published_stats = $stmt->fetch();

// Get recent activity (last 10 events)
$stmt = $db->prepare("
    SELECT * 
    FROM activity_log 
    WHERE client_id = ? 
    ORDER BY created_at DESC 
    LIMIT 10
");
$stmt->execute([$client_id]);
$recent_activity = $stmt->fetchAll();

// Calculate total credits
$total_credits = $client['trial_credits'] + $client['monthly_credits'];

// Build response
$response = [
    'status' => 'success',
    'client' => [
        'id' => $client['id'],
        'phone_number' => $client['phone_number'],
        'whatsapp_name' => $client['whatsapp_name'],
        'created_at' => $client['created_at']
    ],
    'onboarding' => [
        'complete' => (bool)$client['onboarding_complete'],
        'current_step' => $client['onboarding_step'],
        'logo_url' => $client['logo_url']
    ],
    'business_info' => [
        'business_name' => $client['business_name'],
        'industry' => $client['industry'],
        'brand_tone' => $client['brand_tone'],
        'font_preference' => $client['font_preference'],
        'default_language' => $client['default_language'],
        'business_phone' => $client['business_phone'],
        'business_address' => $client['business_address']
    ],
    'brand_assets' => [
        'logo_url' => $client['logo_url'],
        'primary_color' => $client['primary_color'],
        'secondary_color' => $client['secondary_color'],
        'accent_color' => $client['accent_color']
    ],
    'subscription' => [
        'status' => $client['subscription_status'],
        'trial_credits' => (int)$client['trial_credits'],
        'monthly_credits' => (int)$client['monthly_credits'],
        'total_credits' => $total_credits,
        'subscription_start' => $client['subscription_start_date'],
        'subscription_end' => $client['subscription_end_date']
    ],
    'content_limits' => [
        'posts_this_week' => (int)$client['content_posts_this_week'],
        'week_reset_date' => $client['content_week_reset_date'],
        'weekly_limit' => 4
    ],
    'meta_integration' => [
        'connected' => (bool)$client['meta_tokens_valid'],
        'page_id' => $client['meta_page_id'],
        'instagram_account_id' => $client['instagram_account_id'],
        'token_expires' => $client['meta_page_token_expires']
    ],
    'job_statistics' => [
        'active_jobs' => (int)$job_stats['active_jobs'],
        'total_published' => (int)$published_stats['total_published']
    ],
    'latest_job' => $latest_job ? [
        'job_id' => $latest_job['id'],
        'job_type' => $latest_job['job_type'],
        'current_stage' => $latest_job['current_stage'],
        'created_at' => $latest_job['created_at'],
        'design_approved' => (bool)$latest_job['design_approved'],
        'copy_approved' => (bool)$latest_job['copy_approved']
    ] : null,
    'recent_activity' => array_map(function($activity) {
        return [
            'action' => $activity['action'],
            'details' => json_decode($activity['details'], true),
            'timestamp' => $activity['created_at']
        ];
    }, $recent_activity)
];

json_response($response);
?>