<?php
require_once '../config.php';

session_start();

if (!isset($_SESSION['web_user_id']) || ($_SESSION['web_user_role'] ?? 'user') !== 'admin') {
    json_error('Unauthorized', 401);
}

$db = get_db();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $db->query("
        SELECT u.id,
               u.email,
               u.first_name,
               u.last_name,
               u.role,
               u.max_brands,
               u.is_active,
               u.created_at,
               u.last_login_at,
               u.plan_tier,
               u.subscription_status,
               u.trial_end_at,
               u.plan_end_at,
               u.credits_remaining,
               u.text_credits_remaining,
               u.image_credits_remaining,
               u.video_credits_remaining,
               u.landing_credits_remaining,
               u.plan_interval,
               u.credits_reset_at,
               u.payment_provider,
               u.account_type,
               CASE WHEN u.password_hash IS NULL OR u.password_hash = '' THEN 'google' ELSE 'email' END AS registration_method,
               wum.heard_about,
               (
                 SELECT COUNT(*)
                 FROM web_user_clients wuc
                 WHERE wuc.web_user_id = u.id
               ) AS brand_count
        FROM web_users u
        LEFT JOIN web_user_meta wum ON wum.user_id = u.id
        ORDER BY u.created_at DESC
    ");
    $items = $stmt->fetchAll();
    if (!$items) {
        json_response(['items' => []]);
    }

    $payments_map = [];
    $payments_stmt = $db->query("
        SELECT web_user_id,
               COUNT(*) AS payments_count,
               COALESCE(SUM(amount), 0) AS payments_total
        FROM web_payments
        WHERE status = 'success'
        GROUP BY web_user_id
    ");
    foreach ($payments_stmt->fetchAll() as $row) {
        $payments_map[(int)$row['web_user_id']] = [
            'payments_count' => (int)$row['payments_count'],
            'payments_total' => (float)$row['payments_total']
        ];
    }

    $referrals_map = [];
    try {
        $ref_stmt = $db->query("
            SELECT referrer_user_id,
                   COUNT(*) AS referrals_count
            FROM web_referrals
            WHERE status = 'rewarded'
            GROUP BY referrer_user_id
        ");
        foreach ($ref_stmt->fetchAll() as $row) {
            $referrals_map[(int)$row['referrer_user_id']] = (int)$row['referrals_count'];
        }
    } catch (Throwable $e) {
        $referrals_map = [];
    }

    $referrer_map = [];
    try {
        $ref_by_stmt = $db->query("
            SELECT r.referred_user_id,
                   u.email AS referrer_email
            FROM web_referrals r
            JOIN web_users u ON u.id = r.referrer_user_id
        ");
        foreach ($ref_by_stmt->fetchAll() as $row) {
            $referrer_map[(int)$row['referred_user_id']] = $row['referrer_email'] ?? null;
        }
    } catch (Throwable $e) {
        $referrer_map = [];
    }

    $last_activity_map = [];
    try {
        $last_stmt = $db->query("
            SELECT wuc.web_user_id,
                   MAX(al.created_at) AS last_activity_at
            FROM activity_log al
            JOIN web_user_clients wuc ON wuc.client_id = al.client_id
            GROUP BY wuc.web_user_id
        ");
        foreach ($last_stmt->fetchAll() as $row) {
            $last_activity_map[(int)$row['web_user_id']] = $row['last_activity_at'] ?? null;
        }
    } catch (Throwable $e) {
        // activity_log table might not exist
    }

    $service_map = [];
    try {
        $service_stmt = $db->query("
            SELECT wuc.web_user_id,
                   SUM(al.event_type IN ('design_generated_web','multi_mode_generated_web')) AS designs_count,
                   SUM(al.event_type = 'copy_generated_web') AS ad_copies_count,
                   SUM(al.event_type = 'ugc_generated_web') AS videos_count,
                   SUM(al.event_type = 'landing_page_created') AS landing_created_count
            FROM activity_log al
            JOIN web_user_clients wuc ON wuc.client_id = al.client_id
            GROUP BY wuc.web_user_id
        ");
        foreach ($service_stmt->fetchAll() as $row) {
            $service_map[(int)$row['web_user_id']] = [
                'designs_count' => (int)$row['designs_count'],
                'ad_copies_count' => (int)$row['ad_copies_count'],
                'videos_count' => (int)$row['videos_count'],
                'landing_created_count' => (int)$row['landing_created_count']
            ];
        }
    } catch (Throwable $e) {
        // activity_log table might not exist
    }

    $cards_map = [];
    try {
        $cards_stmt = $db->query("
            SELECT wuc.web_user_id,
                   COUNT(*) AS cards_count
            FROM web_business_cards bc
            JOIN web_user_clients wuc ON wuc.client_id = bc.client_id
            GROUP BY wuc.web_user_id
        ");
        foreach ($cards_stmt->fetchAll() as $row) {
            $cards_map[(int)$row['web_user_id']] = (int)$row['cards_count'];
        }
    } catch (Throwable $e) {
        // table might not exist
    }

    $landing_map = [];
    try {
        $landing_stmt = $db->query("
            SELECT wuc.web_user_id,
                   COUNT(*) AS landing_pages_count
            FROM web_landing_pages lp
            JOIN web_user_clients wuc ON wuc.client_id = lp.client_id
            GROUP BY wuc.web_user_id
        ");
        foreach ($landing_stmt->fetchAll() as $row) {
            $landing_map[(int)$row['web_user_id']] = (int)$row['landing_pages_count'];
        }
    } catch (Throwable $e) {
        // table might not exist
    }

    $leads_map = [];
    try {
        $leads_stmt = $db->query("
            SELECT wuc.web_user_id,
                   COUNT(*) AS leads_count
            FROM web_landing_page_leads l
            JOIN web_user_clients wuc ON wuc.client_id = l.client_id
            GROUP BY wuc.web_user_id
        ");
        foreach ($leads_stmt->fetchAll() as $row) {
            $leads_map[(int)$row['web_user_id']] = (int)$row['leads_count'];
        }
    } catch (Throwable $e) {
        // table might not exist
    }
    try {
        $manual_stmt = $db->query("
            SELECT wuc.web_user_id,
                   COUNT(*) AS leads_count
            FROM web_manual_leads l
            JOIN web_user_clients wuc ON wuc.client_id = l.client_id
            GROUP BY wuc.web_user_id
        ");
        foreach ($manual_stmt->fetchAll() as $row) {
            $uid = (int)$row['web_user_id'];
            $leads_map[$uid] = ($leads_map[$uid] ?? 0) + (int)$row['leads_count'];
        }
    } catch (Throwable $e) {
        // optional table
    }

    $published_map = [];
    try {
        $published_stmt = $db->query("
            SELECT wuc.web_user_id,
                   COUNT(*) AS published_posts_count
            FROM creative_jobs cj
            JOIN web_user_clients wuc ON wuc.client_id = cj.client_id
            WHERE cj.facebook_post_id IS NOT NULL
               OR cj.instagram_post_id IS NOT NULL
               OR cj.published_at IS NOT NULL
            GROUP BY wuc.web_user_id
        ");
        foreach ($published_stmt->fetchAll() as $row) {
            $published_map[(int)$row['web_user_id']] = (int)$row['published_posts_count'];
        }
    } catch (Throwable $e) {
        // table might not exist
    }

    $active_jobs_map = [];
    try {
        $active_stmt = $db->query("
            SELECT wuc.web_user_id,
                   COUNT(*) AS active_jobs_count
            FROM creative_jobs cj
            JOIN web_user_clients wuc ON wuc.client_id = cj.client_id
            WHERE cj.current_stage NOT IN ('published', 'cancelled')
            GROUP BY wuc.web_user_id
        ");
        foreach ($active_stmt->fetchAll() as $row) {
            $active_jobs_map[(int)$row['web_user_id']] = (int)$row['active_jobs_count'];
        }
    } catch (Throwable $e) {
        // table might not exist
    }

    // Leading indicators per user
    $indicators_map = [];
    try {
        $indicators_stmt = $db->query("
            SELECT wuc.web_user_id,
                   COUNT(cj.id) AS total_jobs,
                   SUM(CASE WHEN cj.facebook_post_id IS NOT NULL OR cj.instagram_post_id IS NOT NULL OR cj.published_at IS NOT NULL THEN 1 ELSE 0 END) AS published_jobs,
                   COUNT(DISTINCT cj.job_type) AS job_types_used,
                   MIN(cj.created_at) AS first_job_at
            FROM creative_jobs cj
            JOIN web_user_clients wuc ON wuc.client_id = cj.client_id
            GROUP BY wuc.web_user_id
        ");
        foreach ($indicators_stmt->fetchAll() as $row) {
            $total = (int)$row['total_jobs'];
            $published = (int)$row['published_jobs'];
            $indicators_map[(int)$row['web_user_id']] = [
                'total_jobs' => $total,
                'published_jobs' => $published,
                'publishing_rate' => $total > 0 ? round(($published / $total) * 100, 1) : 0,
                'job_types_used' => (int)$row['job_types_used'],
                'first_job_at' => $row['first_job_at']
            ];
        }
    } catch (Throwable $e) {
        // table might not exist
    }

    // Time to first job (hours from registration to first job)
    $time_to_first_job_map = [];
    try {
        $ttfj_stmt = $db->query("
            SELECT u.id AS web_user_id,
                   u.created_at AS registered_at,
                   MIN(cj.created_at) AS first_job_at
            FROM web_users u
            JOIN web_user_clients wuc ON wuc.web_user_id = u.id
            JOIN creative_jobs cj ON cj.client_id = wuc.client_id
            GROUP BY u.id
        ");
        foreach ($ttfj_stmt->fetchAll() as $row) {
            if ($row['first_job_at'] && $row['registered_at']) {
                $reg = strtotime($row['registered_at']);
                $first = strtotime($row['first_job_at']);
                $hours = round(($first - $reg) / 3600, 1);
                $time_to_first_job_map[(int)$row['web_user_id']] = $hours > 0 ? $hours : 0;
            }
        }
    } catch (Throwable $e) {
        // optional
    }

    foreach ($items as &$item) {
        $uid = (int)$item['id'];
        $item['payments_count'] = $payments_map[$uid]['payments_count'] ?? 0;
        $item['payments_total'] = $payments_map[$uid]['payments_total'] ?? 0;
        $item['referrals_count'] = $referrals_map[$uid] ?? 0;
        $item['referrer_email'] = $referrer_map[$uid] ?? null;
        $item['last_activity_at'] = $last_activity_map[$uid] ?? null;
        $item['designs_count'] = $service_map[$uid]['designs_count'] ?? 0;
        $item['ad_copies_count'] = $service_map[$uid]['ad_copies_count'] ?? 0;
        $item['videos_count'] = $service_map[$uid]['videos_count'] ?? 0;
        $item['landing_created_count'] = $service_map[$uid]['landing_created_count'] ?? 0;
        $item['cards_count'] = $cards_map[$uid] ?? 0;
        $item['landing_pages_count'] = $landing_map[$uid] ?? 0;
        $item['leads_count'] = $leads_map[$uid] ?? 0;
        $item['published_posts_count'] = $published_map[$uid] ?? 0;
        $item['active_jobs_count'] = $active_jobs_map[$uid] ?? 0;
        // Leading indicators
        $item['total_jobs'] = $indicators_map[$uid]['total_jobs'] ?? 0;
        $item['publishing_rate'] = $indicators_map[$uid]['publishing_rate'] ?? 0;
        $item['job_types_used'] = $indicators_map[$uid]['job_types_used'] ?? 0;
        $item['first_job_at'] = $indicators_map[$uid]['first_job_at'] ?? null;
        $item['time_to_first_job_hours'] = $time_to_first_job_map[$uid] ?? null;
    }
    unset($item);

    json_response(['items' => $items]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed', 405);
}

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? null;

if (!in_array($action, ['update', 'create'], true)) {
    json_error('Invalid action');
}

if ($action === 'create') {
    $email = trim(strtolower((string)($input['email'] ?? '')));
    $password = (string)($input['password'] ?? '');
    $role = $input['role'] ?? 'user';
    $max_brands = $input['max_brands'] ?? 1;
    $plan_tier = $input['plan_tier'] ?? 'trial';
    $subscription_status = $input['subscription_status'] ?? 'trial';
    $credits_remaining = $input['credits_remaining'] ?? 0;
    $text_credits_remaining = $input['text_credits_remaining'] ?? PLAN_TRIAL_TEXT_CREDITS;
    $image_credits_remaining = $input['image_credits_remaining'] ?? PLAN_TRIAL_IMAGE_CREDITS;
    $video_credits_remaining = $input['video_credits_remaining'] ?? PLAN_TRIAL_VIDEO_CREDITS;
    $landing_credits_remaining = $input['landing_credits_remaining'] ?? PLAN_TRIAL_LANDING_CREDITS;
    $plan_interval = $input['plan_interval'] ?? 'monthly';
    $is_active = (int)($input['is_active'] ?? 1);

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_error('Valid email required');
    }
    if (strlen($password) < 6) {
        json_error('Password must be at least 6 characters');
    }
    if (!in_array($role, ['admin', 'user'], true)) {
        json_error('Invalid role');
    }
    if (!in_array($plan_tier, ['trial', 'starter', 'growth', 'pro', 'agency', 'expired'], true)) {
        json_error('Invalid plan_tier');
    }
    if (!in_array($subscription_status, ['trial', 'active', 'canceled', 'expired', 'past_due'], true)) {
        json_error('Invalid subscription_status');
    }
    if (!is_int($credits_remaining) && !ctype_digit((string)$credits_remaining)) {
        json_error('Invalid credits_remaining');
    }
    if (!in_array($plan_interval, ['monthly', 'yearly'], true)) {
        json_error('Invalid plan_interval');
    }
    if ($max_brands !== null && (!is_int($max_brands) && !ctype_digit((string)$max_brands))) {
        json_error('Invalid max_brands');
    }

    $stmt = $db->prepare("SELECT id FROM web_users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        json_error('Email already registered', 409);
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $trial_end_at = $subscription_status === 'trial'
        ? date('Y-m-d H:i:s', strtotime('+' . PLAN_TRIAL_DAYS . ' days'))
        : null;
    $plan_end_at = $subscription_status === 'active'
        ? date('Y-m-d H:i:s', strtotime('+1 month'))
        : null;
    if ($subscription_status === 'active' && in_array($plan_tier, ['starter', 'growth', 'pro', 'agency'], true)) {
        $limits = plan_limits($plan_tier);
        $text_credits_remaining = $limits['text'];
        $image_credits_remaining = $limits['image'];
        $video_credits_remaining = $limits['video'];
        $landing_credits_remaining = $limits['landing'];
        $credits_remaining = $text_credits_remaining + $image_credits_remaining + $video_credits_remaining + $landing_credits_remaining;
    }
    $stmt = $db->prepare("
        INSERT INTO web_users (
            email,
            password_hash,
            role,
            max_brands,
            plan_tier,
            subscription_status,
            trial_end_at,
            plan_end_at,
            credits_remaining,
            text_credits_remaining,
            image_credits_remaining,
            video_credits_remaining,
            landing_credits_remaining,
            plan_interval,
            credits_reset_at,
            is_active,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    $credits_reset_at = $subscription_status === 'active' ? date('Y-m-d H:i:s', strtotime('+1 month')) : null;
    $stmt->execute([
        $email,
        $hash,
        $role,
        $max_brands === null ? null : (int)$max_brands,
        $plan_tier,
        $subscription_status,
        $trial_end_at,
        $plan_end_at,
        (int)$credits_remaining,
        (int)$text_credits_remaining,
        (int)$image_credits_remaining,
        (int)$video_credits_remaining,
        (int)$landing_credits_remaining,
        $plan_interval,
        $credits_reset_at,
        $is_active
    ]);

    json_response(['status' => 'created']);
}

$user_id = (int)($input['user_id'] ?? 0);
$role = $input['role'] ?? 'user';
$max_brands = $input['max_brands'];
$is_active = (int)($input['is_active'] ?? 1);
$plan_tier = $input['plan_tier'] ?? null;
$subscription_status = $input['subscription_status'] ?? null;
$credits_remaining = $input['credits_remaining'] ?? null;
$text_credits_remaining = $input['text_credits_remaining'] ?? null;
$image_credits_remaining = $input['image_credits_remaining'] ?? null;
$video_credits_remaining = $input['video_credits_remaining'] ?? null;
$landing_credits_remaining = $input['landing_credits_remaining'] ?? null;
$plan_interval = $input['plan_interval'] ?? null;
$credits_reset_at = $input['credits_reset_at'] ?? null;
$plan_end_at = $input['plan_end_at'] ?? null;
$trial_end_at = $input['trial_end_at'] ?? null;

if (!$user_id) {
    json_error('user_id required');
}
if (!in_array($role, ['admin', 'user'], true)) {
    json_error('Invalid role');
}
if ($max_brands !== null && (!is_int($max_brands) && !ctype_digit((string)$max_brands))) {
    json_error('Invalid max_brands');
}

$max_brands_value = $max_brands === null ? null : (int)$max_brands;

$stmt = $db->prepare("
    SELECT plan_tier,
           subscription_status,
           plan_end_at,
           trial_end_at,
           text_credits_remaining,
           image_credits_remaining,
           video_credits_remaining,
           landing_credits_remaining,
           credits_remaining
    FROM web_users
    WHERE id = ?
");
$stmt->execute([$user_id]);
$current = $stmt->fetch() ?: [];
$prev_plan = $current['plan_tier'] ?? null;
$prev_status = $current['subscription_status'] ?? null;

$fields = ['role = ?', 'max_brands = ?', 'is_active = ?'];
$values = [$role, $max_brands_value, $is_active];

if ($plan_tier !== null || $subscription_status !== null) {
    $next_plan = $plan_tier ?? $prev_plan;
    $next_status = $subscription_status ?? $prev_status;
    $moved_to_active = $next_status === 'active' && $prev_status !== 'active';
    $plan_changed = $plan_tier !== null && $plan_tier !== $prev_plan;
    if ($next_status === 'active' && in_array($next_plan, ['starter', 'growth', 'pro', 'agency'], true) && ($moved_to_active || $plan_changed)) {
        $limits = plan_limits($next_plan);
        $plan_rank = ['expired' => 0, 'trial' => 1, 'starter' => 2, 'growth' => 3, 'pro' => 4, 'agency' => 5];
        $prev_rank = $plan_rank[$prev_plan ?? 'expired'] ?? 0;
        $next_rank = $plan_rank[$next_plan ?? 'expired'] ?? 0;
        if ($next_rank > $prev_rank && !$moved_to_active) {
            $prev_limits = plan_limits($prev_plan ?? 'expired');
            $delta_text = max(0, $limits['text'] - ($prev_limits['text'] ?? 0));
            $delta_image = max(0, $limits['image'] - ($prev_limits['image'] ?? 0));
            $delta_video = max(0, $limits['video'] - ($prev_limits['video'] ?? 0));
            $delta_landing = max(0, $limits['landing'] - ($prev_limits['landing'] ?? 0));
            $fields[] = 'text_credits_remaining = ?';
            $values[] = (int)($current['text_credits_remaining'] ?? 0) + $delta_text;
            $fields[] = 'image_credits_remaining = ?';
            $values[] = (int)($current['image_credits_remaining'] ?? 0) + $delta_image;
            $fields[] = 'video_credits_remaining = ?';
            $values[] = (int)($current['video_credits_remaining'] ?? 0) + $delta_video;
            $fields[] = 'landing_credits_remaining = ?';
            $values[] = (int)($current['landing_credits_remaining'] ?? 0) + $delta_landing;
            $fields[] = 'credits_remaining = ?';
            $values[] = (int)($current['credits_remaining'] ?? 0) + $delta_text + $delta_image + $delta_video + $delta_landing;
        } else {
            $total = $limits['text'] + $limits['image'] + $limits['video'] + $limits['landing'];
            $fields[] = 'credits_remaining = ?';
            $values[] = $total;
            $fields[] = 'text_credits_remaining = ?';
            $values[] = $limits['text'];
            $fields[] = 'image_credits_remaining = ?';
            $values[] = $limits['image'];
            $fields[] = 'video_credits_remaining = ?';
            $values[] = $limits['video'];
            $fields[] = 'landing_credits_remaining = ?';
            $values[] = $limits['landing'];
        }
        $fields[] = 'credits_reset_at = ?';
        $values[] = date('Y-m-d H:i:s', strtotime('+1 month'));
        if ($plan_end_at === null || $plan_end_at === '') {
            $fields[] = 'plan_end_at = ?';
            $values[] = date('Y-m-d H:i:s', strtotime('+1 month'));
        }
        $fields[] = 'trial_end_at = ?';
        $values[] = null;
    }
}

if ($plan_tier !== null) {
    if (!in_array($plan_tier, ['trial', 'starter', 'growth', 'pro', 'agency', 'expired'], true)) {
        json_error('Invalid plan_tier');
    }
    $fields[] = 'plan_tier = ?';
    $values[] = $plan_tier;
}
if ($subscription_status !== null) {
    if (!in_array($subscription_status, ['trial', 'active', 'canceled', 'expired', 'past_due'], true)) {
        json_error('Invalid subscription_status');
    }
    $fields[] = 'subscription_status = ?';
    $values[] = $subscription_status;
}
if ($credits_remaining !== null) {
    if (!is_int($credits_remaining) && !ctype_digit((string)$credits_remaining)) {
        json_error('Invalid credits_remaining');
    }
    $fields[] = 'credits_remaining = ?';
    $values[] = (int)$credits_remaining;
}
if ($text_credits_remaining !== null) {
    $fields[] = 'text_credits_remaining = ?';
    $values[] = (int)$text_credits_remaining;
}
if ($image_credits_remaining !== null) {
    $fields[] = 'image_credits_remaining = ?';
    $values[] = (int)$image_credits_remaining;
}
if ($video_credits_remaining !== null) {
    $fields[] = 'video_credits_remaining = ?';
    $values[] = (int)$video_credits_remaining;
}
if ($landing_credits_remaining !== null) {
    $fields[] = 'landing_credits_remaining = ?';
    $values[] = (int)$landing_credits_remaining;
}
if ($plan_interval !== null) {
    if (!in_array($plan_interval, ['monthly', 'yearly'], true)) {
        json_error('Invalid plan_interval');
    }
    $fields[] = 'plan_interval = ?';
    $values[] = $plan_interval;
}
if ($credits_reset_at !== null) {
    $fields[] = 'credits_reset_at = ?';
    $values[] = $credits_reset_at !== '' ? $credits_reset_at : null;
}
if ($plan_end_at !== null) {
    $fields[] = 'plan_end_at = ?';
    $values[] = $plan_end_at !== '' ? $plan_end_at : null;
}
if ($trial_end_at !== null) {
    $fields[] = 'trial_end_at = ?';
    $values[] = $trial_end_at !== '' ? $trial_end_at : null;
}

$values[] = $user_id;
$stmt = $db->prepare("
    UPDATE web_users
    SET " . implode(', ', $fields) . "
    WHERE id = ?
");
$stmt->execute($values);

json_response(['status' => 'updated']);
?>
