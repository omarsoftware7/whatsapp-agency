<?php
/**
 * Admin Metrics API - Comprehensive SaaS Analytics
 * 
 * Key Metrics Categories:
 * 1. Revenue Metrics - MRR, ARR, ARPU, revenue by tier
 * 2. Growth Metrics - Signups, conversion rates, upgrades
 * 3. Engagement Metrics - Active users, jobs/user, feature adoption
 * 4. Retention Metrics - Churn, NRR, cohort analysis
 * 5. Product Health - Jobs, designs, landing pages, etc.
 * 6. Acquisition Metrics - Source attribution, referrals
 */

require_once '../config.php';

session_start();

if (!isset($_SESSION['web_user_id']) || ($_SESSION['web_user_role'] ?? 'user') !== 'admin') {
    json_error('Unauthorized', 401);
}

$db = get_db();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Method not allowed', 405);
}

$period = $_GET['period'] ?? '30d'; // 7d, 30d, 90d, 12m
$compare = (bool)($_GET['compare'] ?? false);

// Define time ranges
$ranges = [
    '7d' => 7,
    '30d' => 30,
    '90d' => 90,
    '12m' => 365
];
$days = $ranges[$period] ?? 30;

// Pricing per tier (monthly)
$tier_prices = [
    'starter' => PLAN_STARTER_PRICE_ILS ?? 179,
    'growth' => PLAN_GROWTH_PRICE_ILS ?? 449,
    'pro' => PLAN_PRO_PRICE_ILS ?? 899,
    'agency' => PLAN_AGENCY_PRICE_ILS ?? 1499
];

// ============================================
// 1. REVENUE METRICS
// ============================================

// Active subscribers by tier
$tier_counts = ['starter' => 0, 'growth' => 0, 'pro' => 0, 'agency' => 0];
try {
    $stmt = $db->query("
        SELECT plan_tier, COUNT(*) as count
        FROM web_users
        WHERE subscription_status = 'active'
          AND plan_tier IN ('starter', 'growth', 'pro', 'agency')
        GROUP BY plan_tier
    ");
    foreach ($stmt->fetchAll() as $row) {
        $tier = $row['plan_tier'];
        if (isset($tier_counts[$tier])) {
            $tier_counts[$tier] = (int)$row['count'];
        }
    }
} catch (Throwable $e) {}

// Calculate MRR
$mrr = 0;
$mrr_by_tier = [];
foreach ($tier_prices as $tier => $price) {
    $count = $tier_counts[$tier] ?? 0;
    $tier_mrr = $count * $price;
    $mrr += $tier_mrr;
    $mrr_by_tier[$tier] = [
        'count' => $count,
        'price' => $price,
        'mrr' => $tier_mrr
    ];
}

$arr = $mrr * 12;

// Total paying users
$total_paying = array_sum($tier_counts);
$arpu = $total_paying > 0 ? round($mrr / $total_paying, 2) : 0;

// Total payments received (lifetime)
$total_payments = 0;
$payments_this_month = 0;
try {
    $stmt = $db->query("SELECT COALESCE(SUM(amount), 0) as total FROM web_payments WHERE status = 'success'");
    $total_payments = (float)($stmt->fetch()['total'] ?? 0);
    
    $stmt = $db->query("
        SELECT COALESCE(SUM(amount), 0) as total
        FROM web_payments
        WHERE status = 'success'
          AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    ");
    $payments_this_month = (float)($stmt->fetch()['total'] ?? 0);
} catch (Throwable $e) {}

// ============================================
// 2. GROWTH METRICS
// ============================================

// Total users
$total_users = 0;
try {
    $stmt = $db->query("SELECT COUNT(*) as count FROM web_users");
    $total_users = (int)($stmt->fetch()['count'] ?? 0);
} catch (Throwable $e) {}

// New signups by period
$signups_today = 0;
$signups_week = 0;
$signups_month = 0;
$signups_period = 0;
try {
    $stmt = $db->query("SELECT COUNT(*) as count FROM web_users WHERE DATE(created_at) = CURDATE()");
    $signups_today = (int)($stmt->fetch()['count'] ?? 0);
    
    $stmt = $db->query("SELECT COUNT(*) as count FROM web_users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)");
    $signups_week = (int)($stmt->fetch()['count'] ?? 0);
    
    $stmt = $db->query("SELECT COUNT(*) as count FROM web_users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)");
    $signups_month = (int)($stmt->fetch()['count'] ?? 0);
    
    $stmt = $db->prepare("SELECT COUNT(*) as count FROM web_users WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)");
    $stmt->execute([$days]);
    $signups_period = (int)($stmt->fetch()['count'] ?? 0);
} catch (Throwable $e) {}

// Conversion rate (trial → paid)
$trial_users = 0;
$converted_users = 0;
try {
    $stmt = $db->query("SELECT COUNT(*) as count FROM web_users WHERE subscription_status = 'trial'");
    $trial_users = (int)($stmt->fetch()['count'] ?? 0);
    
    // Users who were on trial and are now active
    $stmt = $db->query("
        SELECT COUNT(*) as count
        FROM web_users
        WHERE subscription_status = 'active'
          AND plan_tier IN ('starter', 'growth', 'pro', 'agency')
    ");
    $converted_users = (int)($stmt->fetch()['count'] ?? 0);
} catch (Throwable $e) {}

$total_signups_ever = $total_users;
$conversion_rate = $total_signups_ever > 0 ? round(($converted_users / $total_signups_ever) * 100, 1) : 0;

// Referral signups
$referral_signups = 0;
$referral_conversions = 0;
try {
    $stmt = $db->query("SELECT COUNT(*) as count FROM web_referrals");
    $referral_signups = (int)($stmt->fetch()['count'] ?? 0);
    
    $stmt = $db->query("SELECT COUNT(*) as count FROM web_referrals WHERE status = 'rewarded'");
    $referral_conversions = (int)($stmt->fetch()['count'] ?? 0);
} catch (Throwable $e) {}

$referral_conversion_rate = $referral_signups > 0 ? round(($referral_conversions / $referral_signups) * 100, 1) : 0;

// Signups by source
$signups_by_source = [];
try {
    $stmt = $db->query("
        SELECT COALESCE(wum.heard_about, 'unknown') as source, COUNT(*) as count
        FROM web_users u
        LEFT JOIN web_user_meta wum ON wum.user_id = u.id
        GROUP BY COALESCE(wum.heard_about, 'unknown')
        ORDER BY count DESC
    ");
    $signups_by_source = $stmt->fetchAll();
} catch (Throwable $e) {}

// ============================================
// 3. ENGAGEMENT METRICS (Leading Indicators)
// ============================================

// Daily/Weekly/Monthly Active Users (based on activity_log)
$dau = 0;
$wau = 0;
$mau = 0;
try {
    // DAU - users with activity today
    $stmt = $db->query("
        SELECT COUNT(DISTINCT wuc.web_user_id) as count
        FROM activity_log al
        JOIN web_user_clients wuc ON wuc.client_id = al.client_id
        WHERE DATE(al.created_at) = CURDATE()
    ");
    $dau = (int)($stmt->fetch()['count'] ?? 0);
    
    // WAU
    $stmt = $db->query("
        SELECT COUNT(DISTINCT wuc.web_user_id) as count
        FROM activity_log al
        JOIN web_user_clients wuc ON wuc.client_id = al.client_id
        WHERE al.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    ");
    $wau = (int)($stmt->fetch()['count'] ?? 0);
    
    // MAU
    $stmt = $db->query("
        SELECT COUNT(DISTINCT wuc.web_user_id) as count
        FROM activity_log al
        JOIN web_user_clients wuc ON wuc.client_id = al.client_id
        WHERE al.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    ");
    $mau = (int)($stmt->fetch()['count'] ?? 0);
} catch (Throwable $e) {}

// Jobs per active user (this month)
$jobs_this_month = 0;
$jobs_per_active_user = 0;
try {
    $stmt = $db->query("
        SELECT COUNT(*) as count
        FROM creative_jobs
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    ");
    $jobs_this_month = (int)($stmt->fetch()['count'] ?? 0);
    $jobs_per_active_user = $mau > 0 ? round($jobs_this_month / $mau, 1) : 0;
} catch (Throwable $e) {}

// Average time to first job (hours from signup to first job)
$avg_time_to_first_job = null;
try {
    $stmt = $db->query("
        SELECT AVG(TIMESTAMPDIFF(HOUR, u.created_at, first_job.created_at)) as avg_hours
        FROM web_users u
        JOIN web_user_clients wuc ON wuc.web_user_id = u.id
        JOIN (
            SELECT client_id, MIN(created_at) as created_at
            FROM creative_jobs
            GROUP BY client_id
        ) first_job ON first_job.client_id = wuc.client_id
        WHERE u.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
    ");
    $row = $stmt->fetch();
    $avg_time_to_first_job = $row['avg_hours'] !== null ? round((float)$row['avg_hours'], 1) : null;
} catch (Throwable $e) {}

// Publishing rate (% of jobs that get published)
$total_jobs_period = 0;
$published_jobs_period = 0;
try {
    $stmt = $db->prepare("
        SELECT COUNT(*) as count
        FROM creative_jobs
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    ");
    $stmt->execute([$days]);
    $total_jobs_period = (int)($stmt->fetch()['count'] ?? 0);
    
    $stmt = $db->prepare("
        SELECT COUNT(*) as count
        FROM creative_jobs
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
          AND (facebook_post_id IS NOT NULL OR instagram_post_id IS NOT NULL OR published_at IS NOT NULL)
    ");
    $stmt->execute([$days]);
    $published_jobs_period = (int)($stmt->fetch()['count'] ?? 0);
} catch (Throwable $e) {}
$publishing_rate = $total_jobs_period > 0 ? round(($published_jobs_period / $total_jobs_period) * 100, 1) : 0;

// Credit utilization (avg % of credits used)
$avg_credit_utilization = 0;
try {
    $stmt = $db->query("
        SELECT 
            AVG(
                CASE 
                    WHEN (text_credits_remaining + image_credits_remaining + video_credits_remaining) = 0 THEN 100
                    ELSE 100 - (
                        (text_credits_remaining + image_credits_remaining + video_credits_remaining) * 100.0 /
                        NULLIF(credits_remaining + text_credits_remaining + image_credits_remaining + video_credits_remaining, 0)
                    )
                END
            ) as avg_util
        FROM web_users
        WHERE subscription_status = 'active'
    ");
    $avg_credit_utilization = round((float)($stmt->fetch()['avg_util'] ?? 0), 1);
} catch (Throwable $e) {}

// Multi-feature users (users who used 2+ different job types this month)
$multi_feature_users = 0;
try {
    $stmt = $db->query("
        SELECT COUNT(*) as count
        FROM (
            SELECT wuc.web_user_id, COUNT(DISTINCT cj.job_type) as feature_count
            FROM creative_jobs cj
            JOIN web_user_clients wuc ON wuc.client_id = cj.client_id
            WHERE cj.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY wuc.web_user_id
            HAVING feature_count >= 2
        ) multi_users
    ");
    $multi_feature_users = (int)($stmt->fetch()['count'] ?? 0);
} catch (Throwable $e) {}
$multi_feature_rate = $mau > 0 ? round(($multi_feature_users / $mau) * 100, 1) : 0;

// ============================================
// 4. RETENTION METRICS
// ============================================

// Churn rate (users who canceled in last 30 days / active users at start of period)
$churn_rate = 0;
$churned_users = 0;
try {
    $stmt = $db->query("
        SELECT COUNT(*) as count
        FROM web_users
        WHERE subscription_status IN ('canceled', 'expired')
          AND plan_end_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          AND plan_tier IN ('starter', 'growth', 'pro', 'agency')
    ");
    $churned_users = (int)($stmt->fetch()['count'] ?? 0);
} catch (Throwable $e) {}

$total_at_start = $total_paying + $churned_users;
$churn_rate = $total_at_start > 0 ? round(($churned_users / $total_at_start) * 100, 1) : 0;

// Net Revenue Retention (NRR) - approximation
// (MRR from existing customers / MRR from same customers last month) * 100
// For simplicity, we'll estimate based on upgrades/downgrades
$nrr = 100 - $churn_rate; // Simplified

// ============================================
// 5. PRODUCT HEALTH METRICS
// ============================================

// Total jobs created (all time)
$total_jobs = 0;
try {
    $stmt = $db->query("SELECT COUNT(*) as count FROM creative_jobs");
    $total_jobs = (int)($stmt->fetch()['count'] ?? 0);
} catch (Throwable $e) {}

// Feature usage breakdown (last 30 days)
$feature_usage = [];
try {
    $stmt = $db->prepare("
        SELECT job_type, COUNT(*) as count
        FROM creative_jobs
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY job_type
        ORDER BY count DESC
    ");
    $stmt->execute([$days]);
    $feature_usage = $stmt->fetchAll();
} catch (Throwable $e) {}

// Landing pages created
$landing_pages_total = 0;
$landing_pages_period = 0;
try {
    $stmt = $db->query("SELECT COUNT(*) as count FROM web_landing_pages");
    $landing_pages_total = (int)($stmt->fetch()['count'] ?? 0);
    
    $stmt = $db->prepare("SELECT COUNT(*) as count FROM web_landing_pages WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)");
    $stmt->execute([$days]);
    $landing_pages_period = (int)($stmt->fetch()['count'] ?? 0);
} catch (Throwable $e) {}

// Business cards created
$cards_total = 0;
$cards_period = 0;
try {
    $stmt = $db->query("SELECT COUNT(*) as count FROM web_business_cards");
    $cards_total = (int)($stmt->fetch()['count'] ?? 0);
    
    $stmt = $db->prepare("SELECT COUNT(*) as count FROM web_business_cards WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)");
    $stmt->execute([$days]);
    $cards_period = (int)($stmt->fetch()['count'] ?? 0);
} catch (Throwable $e) {}

// Leads generated
$leads_total = 0;
$leads_period = 0;
try {
    $stmt = $db->query("SELECT COUNT(*) as count FROM web_landing_page_leads");
    $leads_total = (int)($stmt->fetch()['count'] ?? 0);
    
    $stmt = $db->prepare("SELECT COUNT(*) as count FROM web_landing_page_leads WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)");
    $stmt->execute([$days]);
    $leads_period = (int)($stmt->fetch()['count'] ?? 0);
} catch (Throwable $e) {}

// Brands created
$brands_total = 0;
$brands_period = 0;
try {
    $stmt = $db->query("SELECT COUNT(*) as count FROM web_user_clients");
    $brands_total = (int)($stmt->fetch()['count'] ?? 0);
    
    $stmt = $db->prepare("SELECT COUNT(*) as count FROM web_user_clients WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)");
    $stmt->execute([$days]);
    $brands_period = (int)($stmt->fetch()['count'] ?? 0);
} catch (Throwable $e) {}

// ============================================
// 6. TREND DATA (for charts)
// ============================================

// Signups trend (daily for 7d, weekly for 30d/90d, monthly for 12m)
$signups_trend = [];
try {
    if ($days <= 7) {
        // Daily for last 7 days
        $stmt = $db->query("
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM web_users
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        ");
    } elseif ($days <= 30) {
        // Daily for last 30 days
        $stmt = $db->query("
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM web_users
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        ");
    } elseif ($days <= 90) {
        // Weekly for last 90 days
        $stmt = $db->query("
            SELECT YEARWEEK(created_at, 1) as week, MIN(DATE(created_at)) as date, COUNT(*) as count
            FROM web_users
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
            GROUP BY YEARWEEK(created_at, 1)
            ORDER BY week ASC
        ");
    } else {
        // Monthly for last 12 months
        $stmt = $db->query("
            SELECT DATE_FORMAT(created_at, '%Y-%m') as month, MIN(DATE(created_at)) as date, COUNT(*) as count
            FROM web_users
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY month ASC
        ");
    }
    $signups_trend = $stmt->fetchAll();
} catch (Throwable $e) {}

// Jobs trend
$jobs_trend = [];
try {
    if ($days <= 7) {
        $stmt = $db->query("
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM creative_jobs
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        ");
    } elseif ($days <= 30) {
        $stmt = $db->query("
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM creative_jobs
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        ");
    } elseif ($days <= 90) {
        $stmt = $db->query("
            SELECT YEARWEEK(created_at, 1) as week, MIN(DATE(created_at)) as date, COUNT(*) as count
            FROM creative_jobs
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
            GROUP BY YEARWEEK(created_at, 1)
            ORDER BY week ASC
        ");
    } else {
        $stmt = $db->query("
            SELECT DATE_FORMAT(created_at, '%Y-%m') as month, MIN(DATE(created_at)) as date, COUNT(*) as count
            FROM creative_jobs
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY month ASC
        ");
    }
    $jobs_trend = $stmt->fetchAll();
} catch (Throwable $e) {}

// Revenue trend (from payments)
$revenue_trend = [];
try {
    if ($days <= 30) {
        $stmt = $db->query("
            SELECT DATE(created_at) as date, COALESCE(SUM(amount), 0) as amount
            FROM web_payments
            WHERE status = 'success'
              AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        ");
    } elseif ($days <= 90) {
        $stmt = $db->query("
            SELECT YEARWEEK(created_at, 1) as week, MIN(DATE(created_at)) as date, COALESCE(SUM(amount), 0) as amount
            FROM web_payments
            WHERE status = 'success'
              AND created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
            GROUP BY YEARWEEK(created_at, 1)
            ORDER BY week ASC
        ");
    } else {
        $stmt = $db->query("
            SELECT DATE_FORMAT(created_at, '%Y-%m') as month, MIN(DATE(created_at)) as date, COALESCE(SUM(amount), 0) as amount
            FROM web_payments
            WHERE status = 'success'
              AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY month ASC
        ");
    }
    $revenue_trend = $stmt->fetchAll();
} catch (Throwable $e) {}

// Active users trend
$active_users_trend = [];
try {
    if ($days <= 30) {
        $stmt = $db->query("
            SELECT DATE(al.created_at) as date, COUNT(DISTINCT wuc.web_user_id) as count
            FROM activity_log al
            JOIN web_user_clients wuc ON wuc.client_id = al.client_id
            WHERE al.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(al.created_at)
            ORDER BY date ASC
        ");
    } else {
        $stmt = $db->query("
            SELECT YEARWEEK(al.created_at, 1) as week, MIN(DATE(al.created_at)) as date, COUNT(DISTINCT wuc.web_user_id) as count
            FROM activity_log al
            JOIN web_user_clients wuc ON wuc.client_id = al.client_id
            WHERE al.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
            GROUP BY YEARWEEK(al.created_at, 1)
            ORDER BY week ASC
        ");
    }
    $active_users_trend = $stmt->fetchAll();
} catch (Throwable $e) {}

// Jobs per active user trend
$jobs_per_user_trend = [];
try {
    if ($days <= 30) {
        $stmt = $db->query("
            SELECT 
                DATE(cj.created_at) as date,
                COUNT(cj.id) as jobs_count,
                COUNT(DISTINCT wuc.web_user_id) as active_users,
                ROUND(COUNT(cj.id) / NULLIF(COUNT(DISTINCT wuc.web_user_id), 0), 2) as jobs_per_user
            FROM creative_jobs cj
            JOIN web_user_clients wuc ON wuc.client_id = cj.client_id
            WHERE cj.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(cj.created_at)
            ORDER BY date ASC
        ");
    } else {
        $stmt = $db->query("
            SELECT 
                YEARWEEK(cj.created_at, 1) as week,
                MIN(DATE(cj.created_at)) as date,
                COUNT(cj.id) as jobs_count,
                COUNT(DISTINCT wuc.web_user_id) as active_users,
                ROUND(COUNT(cj.id) / NULLIF(COUNT(DISTINCT wuc.web_user_id), 0), 2) as jobs_per_user
            FROM creative_jobs cj
            JOIN web_user_clients wuc ON wuc.client_id = cj.client_id
            WHERE cj.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
            GROUP BY YEARWEEK(cj.created_at, 1)
            ORDER BY week ASC
        ");
    }
    $jobs_per_user_trend = $stmt->fetchAll();
} catch (Throwable $e) {}

// Publishing rate trend (already have this in publishing_trend)

// Multi-feature users trend
$multi_feature_trend = [];
try {
    if ($days <= 30) {
        $stmt = $db->query("
            SELECT 
                DATE(cj.created_at) as date,
                COUNT(DISTINCT wuc.web_user_id) as active_users,
                COUNT(DISTINCT CASE WHEN feature_counts.feature_count >= 2 THEN feature_counts.web_user_id END) as multi_users
            FROM creative_jobs cj
            JOIN web_user_clients wuc ON wuc.client_id = cj.client_id
            LEFT JOIN (
                SELECT wuc2.web_user_id, DATE(cj2.created_at) as job_date, COUNT(DISTINCT cj2.job_type) as feature_count
                FROM creative_jobs cj2
                JOIN web_user_clients wuc2 ON wuc2.client_id = cj2.client_id
                WHERE cj2.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY wuc2.web_user_id, DATE(cj2.created_at)
            ) feature_counts ON feature_counts.web_user_id = wuc.web_user_id AND feature_counts.job_date = DATE(cj.created_at)
            WHERE cj.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(cj.created_at)
            ORDER BY date ASC
        ");
    } else {
        $stmt = $db->query("
            SELECT 
                YEARWEEK(cj.created_at, 1) as week,
                MIN(DATE(cj.created_at)) as date,
                COUNT(DISTINCT wuc.web_user_id) as active_users,
                COUNT(DISTINCT CASE WHEN feature_counts.feature_count >= 2 THEN feature_counts.web_user_id END) as multi_users
            FROM creative_jobs cj
            JOIN web_user_clients wuc ON wuc.client_id = cj.client_id
            LEFT JOIN (
                SELECT wuc2.web_user_id, YEARWEEK(cj2.created_at, 1) as job_week, COUNT(DISTINCT cj2.job_type) as feature_count
                FROM creative_jobs cj2
                JOIN web_user_clients wuc2 ON wuc2.client_id = cj2.client_id
                WHERE cj2.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
                GROUP BY wuc2.web_user_id, YEARWEEK(cj2.created_at, 1)
            ) feature_counts ON feature_counts.web_user_id = wuc.web_user_id AND feature_counts.job_week = YEARWEEK(cj.created_at, 1)
            WHERE cj.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
            GROUP BY YEARWEEK(cj.created_at, 1)
            ORDER BY week ASC
        ");
    }
    $raw_multi = $stmt->fetchAll();
    foreach ($raw_multi as $row) {
        $active = (int)($row['active_users'] ?? 0);
        $multi = (int)($row['multi_users'] ?? 0);
        $rate = $active > 0 ? round(($multi / $active) * 100, 1) : 0;
        $multi_feature_trend[] = [
            'date' => $row['date'],
            'active_users' => $active,
            'multi_users' => $multi,
            'multi_rate' => $rate
        ];
    }
} catch (Throwable $e) {}

// Conversion rate trend (trial to paid over time)
$conversion_trend = [];
try {
    if ($days <= 30) {
        $stmt = $db->query("
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as total_signups,
                SUM(CASE WHEN subscription_status = 'active' AND plan_tier IN ('starter','growth','pro','agency') THEN 1 ELSE 0 END) as converted
            FROM web_users
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        ");
    } else {
        $stmt = $db->query("
            SELECT 
                YEARWEEK(created_at, 1) as week,
                MIN(DATE(created_at)) as date,
                COUNT(*) as total_signups,
                SUM(CASE WHEN subscription_status = 'active' AND plan_tier IN ('starter','growth','pro','agency') THEN 1 ELSE 0 END) as converted
            FROM web_users
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
            GROUP BY YEARWEEK(created_at, 1)
            ORDER BY week ASC
        ");
    }
    $raw_conv = $stmt->fetchAll();
    foreach ($raw_conv as $row) {
        $total = (int)($row['total_signups'] ?? 0);
        $conv = (int)($row['converted'] ?? 0);
        $rate = $total > 0 ? round(($conv / $total) * 100, 1) : 0;
        $conversion_trend[] = [
            'date' => $row['date'],
            'total_signups' => $total,
            'converted' => $conv,
            'conversion_rate' => $rate
        ];
    }
} catch (Throwable $e) {}

// ============================================
// 7. TOP PERFORMERS
// ============================================

// Most active clients (brands)
$top_clients = [];
try {
    $stmt = $db->prepare("
        SELECT c.id, c.business_name, COUNT(j.id) as jobs_count
        FROM creative_jobs j
        JOIN clients c ON c.id = j.client_id
        WHERE j.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY c.id
        ORDER BY jobs_count DESC
        LIMIT 10
    ");
    $stmt->execute([$days]);
    $top_clients = $stmt->fetchAll();
} catch (Throwable $e) {}

// Most active users
$top_users = [];
try {
    $stmt = $db->prepare("
        SELECT u.id, u.email, u.plan_tier, COUNT(DISTINCT cj.id) as jobs_count, COUNT(DISTINCT wuc.client_id) as brands_count
        FROM web_users u
        JOIN web_user_clients wuc ON wuc.web_user_id = u.id
        JOIN creative_jobs cj ON cj.client_id = wuc.client_id
        WHERE cj.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY u.id
        ORDER BY jobs_count DESC
        LIMIT 10
    ");
    $stmt->execute([$days]);
    $top_users = $stmt->fetchAll();
} catch (Throwable $e) {}

// ============================================
// 8. REFERRAL METRICS
// ============================================

// Top referring users
$top_referrers = [];
try {
    $stmt = $db->query("
        SELECT u.id, u.email, 
               COUNT(r.id) as referrals_count,
               SUM(CASE WHEN r.status = 'rewarded' THEN 1 ELSE 0 END) as successful_referrals
        FROM web_users u
        JOIN web_referrals r ON r.referrer_user_id = u.id
        GROUP BY u.id
        ORDER BY referrals_count DESC
        LIMIT 10
    ");
    $top_referrers = $stmt->fetchAll();
} catch (Throwable $e) {}

// Credits lost to referrals (rewards given)
$referral_credits_given = ['image' => 0, 'video' => 0, 'text' => 0, 'total_referrals' => 0];
try {
    $stmt = $db->query("SELECT COUNT(*) as count FROM web_referrals WHERE status = 'rewarded'");
    $count = (int)($stmt->fetch()['count'] ?? 0);
    // Each reward is 20 image, 5 video, 20 text
    $referral_credits_given = [
        'image' => $count * 20,
        'video' => $count * 5,
        'text' => $count * 20,
        'total_referrals' => $count
    ];
} catch (Throwable $e) {}

// ============================================
// 9. AUTH METHOD METRICS
// ============================================

// Google vs Email login ratio
$google_users = 0;
$email_users = 0;
try {
    $stmt = $db->query("SELECT COUNT(*) as count FROM web_users WHERE google_id IS NOT NULL AND google_id != ''");
    $google_users = (int)($stmt->fetch()['count'] ?? 0);
    
    $stmt = $db->query("SELECT COUNT(*) as count FROM web_users WHERE google_id IS NULL OR google_id = ''");
    $email_users = (int)($stmt->fetch()['count'] ?? 0);
} catch (Throwable $e) {}

$google_login_rate = ($google_users + $email_users) > 0 
    ? round(($google_users / ($google_users + $email_users)) * 100, 1) 
    : 0;

// ============================================
// 10. PUBLISHING SUCCESS TREND
// ============================================

$publishing_trend = [];
try {
    if ($days <= 30) {
        $stmt = $db->query("
            SELECT DATE(created_at) as date,
                   COUNT(*) as total_jobs,
                   SUM(CASE WHEN facebook_post_id IS NOT NULL OR instagram_post_id IS NOT NULL OR published_at IS NOT NULL THEN 1 ELSE 0 END) as published_jobs
            FROM creative_jobs
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        ");
    } elseif ($days <= 90) {
        $stmt = $db->query("
            SELECT YEARWEEK(created_at, 1) as week, MIN(DATE(created_at)) as date,
                   COUNT(*) as total_jobs,
                   SUM(CASE WHEN facebook_post_id IS NOT NULL OR instagram_post_id IS NOT NULL OR published_at IS NOT NULL THEN 1 ELSE 0 END) as published_jobs
            FROM creative_jobs
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
            GROUP BY YEARWEEK(created_at, 1)
            ORDER BY week ASC
        ");
    } else {
        $stmt = $db->query("
            SELECT DATE_FORMAT(created_at, '%Y-%m') as month, MIN(DATE(created_at)) as date,
                   COUNT(*) as total_jobs,
                   SUM(CASE WHEN facebook_post_id IS NOT NULL OR instagram_post_id IS NOT NULL OR published_at IS NOT NULL THEN 1 ELSE 0 END) as published_jobs
            FROM creative_jobs
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY month ASC
        ");
    }
    $raw_trend = $stmt->fetchAll();
    // Calculate percentage for each period
    foreach ($raw_trend as $row) {
        $total = (int)($row['total_jobs'] ?? 0);
        $published = (int)($row['published_jobs'] ?? 0);
        $pct = $total > 0 ? round(($published / $total) * 100, 1) : 0;
        $publishing_trend[] = [
            'date' => $row['date'],
            'total_jobs' => $total,
            'published_jobs' => $published,
            'publish_rate' => $pct
        ];
    }
} catch (Throwable $e) {}

// ============================================
// BUILD RESPONSE
// ============================================

json_response([
    'period' => $period,
    'days' => $days,
    
    // Revenue metrics
    'revenue' => [
        'mrr' => $mrr,
        'arr' => $arr,
        'arpu' => $arpu,
        'total_payments' => $total_payments,
        'payments_period' => $payments_this_month,
        'by_tier' => $mrr_by_tier
    ],
    
    // Growth metrics
    'growth' => [
        'total_users' => $total_users,
        'signups_today' => $signups_today,
        'signups_week' => $signups_week,
        'signups_month' => $signups_month,
        'signups_period' => $signups_period,
        'conversion_rate' => $conversion_rate,
        'referral_signups' => $referral_signups,
        'referral_conversions' => $referral_conversions,
        'referral_conversion_rate' => $referral_conversion_rate,
        'signups_by_source' => $signups_by_source
    ],
    
    // Engagement metrics (leading indicators)
    'engagement' => [
        'dau' => $dau,
        'wau' => $wau,
        'mau' => $mau,
        'jobs_per_user' => $jobs_per_active_user,
        'avg_time_to_first_job_hours' => $avg_time_to_first_job,
        'publishing_rate' => $publishing_rate,
        'credit_utilization' => $avg_credit_utilization,
        'multi_feature_users' => $multi_feature_users,
        'multi_feature_rate' => $multi_feature_rate
    ],
    
    // Retention metrics
    'retention' => [
        'total_paying' => $total_paying,
        'trial_users' => $trial_users,
        'churned_users' => $churned_users,
        'churn_rate' => $churn_rate,
        'nrr' => $nrr
    ],
    
    // Product health
    'product' => [
        'total_jobs' => $total_jobs,
        'jobs_period' => $total_jobs_period,
        'published_period' => $published_jobs_period,
        'landing_pages_total' => $landing_pages_total,
        'landing_pages_period' => $landing_pages_period,
        'cards_total' => $cards_total,
        'cards_period' => $cards_period,
        'leads_total' => $leads_total,
        'leads_period' => $leads_period,
        'brands_total' => $brands_total,
        'brands_period' => $brands_period,
        'feature_usage' => $feature_usage
    ],
    
    // Trends
    'trends' => [
        'signups' => $signups_trend,
        'jobs' => $jobs_trend,
        'revenue' => $revenue_trend,
        'active_users' => $active_users_trend,
        'publishing' => $publishing_trend,
        'jobs_per_user' => $jobs_per_user_trend,
        'multi_feature' => $multi_feature_trend,
        'conversion' => $conversion_trend
    ],
    
    // Top performers
    'top_clients' => $top_clients,
    'top_users' => $top_users,
    'top_referrers' => $top_referrers,
    
    // Referral costs
    'referral_costs' => $referral_credits_given,
    
    // Auth methods
    'auth' => [
        'google_users' => $google_users,
        'email_users' => $email_users,
        'google_login_rate' => $google_login_rate
    ]
]);
?>
