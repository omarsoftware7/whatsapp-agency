<?php
require_once '../config.php';

session_start();

if (!isset($_SESSION['web_user_id'])) {
    json_error('Unauthorized', 401);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed', 405);
}

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';

$db = get_db();
$user_id = (int)$_SESSION['web_user_id'];

if ($action === 'update_profile') {
    $first_name = trim($input['first_name'] ?? '');
    $last_name = trim($input['last_name'] ?? '');
    $theme_mode = $input['theme_mode'] ?? 'brand';
    if (!in_array($theme_mode, ['brand', 'default'], true)) {
        $theme_mode = 'brand';
    }
    $stmt = $db->prepare("
        UPDATE web_users
        SET first_name = ?,
            last_name = ?,
            theme_mode = ?,
            updated_at = NOW()
        WHERE id = ?
    ");
    $stmt->execute([
        $first_name ?: null,
        $last_name ?: null,
        $theme_mode,
        $user_id
    ]);
    $_SESSION['web_user_first_name'] = $first_name ?: null;
    $_SESSION['web_user_last_name'] = $last_name ?: null;
    $_SESSION['web_user_theme_mode'] = $theme_mode;
    json_response(['status' => 'updated']);
}

if ($action === 'change_password') {
    $current = $input['current_password'] ?? '';
    $next = $input['new_password'] ?? '';
    if (strlen($next) < 6) {
        json_error('Password must be at least 6 characters');
    }
    $stmt = $db->prepare("SELECT password_hash FROM web_users WHERE id = ?");
    $stmt->execute([$user_id]);
    $row = $stmt->fetch();
    if (!$row || !password_verify($current, $row['password_hash'])) {
        json_error('Current password is incorrect', 401);
    }
    $hash = password_hash($next, PASSWORD_DEFAULT);
    $stmt = $db->prepare("UPDATE web_users SET password_hash = ?, updated_at = NOW() WHERE id = ?");
    $stmt->execute([$hash, $user_id]);
    json_response(['status' => 'password_updated']);
}

if ($action === 'delete_account') {
    $password = $input['password'] ?? '';
    $stmt = $db->prepare("SELECT password_hash FROM web_users WHERE id = ?");
    $stmt->execute([$user_id]);
    $row = $stmt->fetch();
    if (!$row || !password_verify($password, $row['password_hash'])) {
        json_error('Password is incorrect', 401);
    }
    $stmt = $db->prepare("DELETE FROM web_users WHERE id = ?");
    $stmt->execute([$user_id]);
    session_unset();
    session_destroy();
    json_response(['status' => 'deleted']);
}

if ($action === 'stats') {
    $stmt = $db->prepare("
        SELECT client_id
        FROM web_user_clients
        WHERE web_user_id = ?
    ");
    $stmt->execute([$user_id]);
    $client_ids = array_map('intval', array_column($stmt->fetchAll(), 'client_id'));
    if (!$client_ids) {
        json_response([
            'status' => 'ok',
            'stats' => [
                'designs' => 0,
                'ad_copies' => 0,
                'videos' => 0,
                'uploads' => 0,
                'library_files' => 0,
                'published_posts' => 0,
                'leads_registered' => 0,
                'business_cards' => 0,
                'landing_pages' => 0,
                'referrals' => 0,
                'brands_created' => 0,
                'sample_media' => []
            ]
        ]);
    }

    $placeholders = implode(',', array_fill(0, count($client_ids), '?'));
    $stmt = $db->prepare("
        SELECT id,
               user_images,
               product_images,
               design_variations,
               reel_video_url,
               ad_copy,
               facebook_post_id,
               instagram_post_id,
               published_at
        FROM creative_jobs
        WHERE client_id IN ($placeholders)
    ");
    $stmt->execute($client_ids);
    $jobs = $stmt->fetchAll();

    $uploads = 0;
    $designs = 0;
    $videos = 0;
    $copies = 0;
    $published = 0;

    $sample_media = [];
    foreach ($jobs as $job) {
        foreach (['user_images', 'product_images'] as $field) {
            if (!empty($job[$field])) {
                $decoded = json_decode($job[$field], true);
                if (is_array($decoded)) {
                    $uploads += count($decoded);
                }
            }
        }
        if (!empty($job['design_variations'])) {
            $decoded = json_decode($job['design_variations'], true);
            if (is_array($decoded)) {
                $designs += count($decoded);
                foreach ($decoded as $url) {
                    if ($url && count($sample_media) < 4) {
                        $sample_media[] = $url;
                    }
                }
            }
        }
        if (!empty($job['reel_video_url'])) {
            $videos += 1;
            if (count($sample_media) < 4) {
                $sample_media[] = $job['reel_video_url'];
            }
        }
        if (!empty($job['ad_copy'])) {
            $copies += 1;
        }
        if (!empty($job['facebook_post_id']) || !empty($job['instagram_post_id']) || !empty($job['published_at'])) {
            $published += 1;
        }
    }

    $stmt = $db->prepare("
        SELECT COUNT(*) as count
        FROM web_multi_products mp
        JOIN creative_jobs cj ON mp.job_id = cj.id
        WHERE cj.client_id IN ($placeholders)
          AND mp.generated_image_url IS NOT NULL
    ");
    $stmt->execute($client_ids);
    $multi_count = (int)($stmt->fetch()['count'] ?? 0);
    $designs += $multi_count;

    $library_files = $uploads + $designs + $videos + $copies;
    $brands_created = count($client_ids);

    $stmt = $db->prepare("
        SELECT COUNT(*) as count
        FROM web_landing_page_leads
        WHERE client_id IN ($placeholders)
    ");
    $stmt->execute($client_ids);
    $leads = (int)($stmt->fetch()['count'] ?? 0);
    try {
        $stmt = $db->prepare("
            SELECT COUNT(*) as count
            FROM web_manual_leads
            WHERE client_id IN ($placeholders)
        ");
        $stmt->execute($client_ids);
        $leads += (int)($stmt->fetch()['count'] ?? 0);
    } catch (Throwable $e) {
        // ignore manual leads if table is missing
    }

    $stmt = $db->prepare("
        SELECT COUNT(*) as count
        FROM web_business_cards
        WHERE client_id IN ($placeholders)
    ");
    $stmt->execute($client_ids);
    $business_cards = (int)($stmt->fetch()['count'] ?? 0);

    $stmt = $db->prepare("
        SELECT COUNT(*) as count
        FROM web_landing_pages
        WHERE client_id IN ($placeholders)
    ");
    $stmt->execute($client_ids);
    $landing_pages = (int)($stmt->fetch()['count'] ?? 0);

    $referrals = 0;
    try {
        $stmt = $db->prepare("
            SELECT COUNT(*) as count
            FROM web_referrals
            WHERE referrer_user_id = ? AND status = 'rewarded'
        ");
        $stmt->execute([$user_id]);
        $referrals = (int)($stmt->fetch()['count'] ?? 0);
    } catch (Throwable $e) {
        $referrals = 0;
    }

    json_response([
        'status' => 'ok',
        'stats' => [
            'designs' => $designs,
            'ad_copies' => $copies,
            'videos' => $videos,
            'uploads' => $uploads,
            'library_files' => $library_files,
            'published_posts' => $published,
            'leads_registered' => $leads,
            'business_cards' => $business_cards,
            'landing_pages' => $landing_pages,
            'referrals' => $referrals,
            'brands_created' => $brands_created,
            'sample_media' => $sample_media
        ]
    ]);
}

if ($action === 'usage_history') {
    $days = max(1, min(3650, (int)($input['days'] ?? 30)));
    $page = max(1, (int)($input['page'] ?? 1));
    $per_page = max(1, min(31, (int)($input['per_page'] ?? 7)));
    $sort = strtolower((string)($input['sort'] ?? 'desc')) === 'asc' ? 'ASC' : 'DESC';
    $stmt = $db->prepare("
        SELECT client_id
        FROM web_user_clients
        WHERE web_user_id = ?
    ");
    $stmt->execute([$user_id]);
    $client_ids = array_map('intval', array_column($stmt->fetchAll(), 'client_id'));
    if (!$client_ids) {
        json_response(['status' => 'ok', 'items' => [], 'total_days' => 0]);
    }
    $placeholders = implode(',', array_fill(0, count($client_ids), '?'));
    $offset = ($page - 1) * $per_page;
    $stmt = $db->prepare("
        SELECT COUNT(DISTINCT DATE(created_at)) AS total_days
        FROM activity_log
        WHERE client_id IN ($placeholders)
          AND event_type IN ('design_generated_web','copy_generated_web','ugc_generated_web','multi_mode_generated_web','landing_page_created')
          AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    ");
    $stmt->execute(array_merge($client_ids, [$days]));
    $total_days = (int)($stmt->fetch()['total_days'] ?? 0);

    $stmt = $db->prepare("
        SELECT DATE(created_at) AS day,
               SUM(event_type = 'copy_generated_web') AS text,
               SUM(event_type IN ('design_generated_web','multi_mode_generated_web')) AS image,
               SUM(event_type = 'ugc_generated_web') AS video,
               SUM(event_type = 'landing_page_created') AS landing
        FROM activity_log
        WHERE client_id IN ($placeholders)
          AND event_type IN ('design_generated_web','copy_generated_web','ugc_generated_web','multi_mode_generated_web','landing_page_created')
          AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY day
        ORDER BY day $sort
        LIMIT ? OFFSET ?
    ");
    $stmt->execute(array_merge($client_ids, [$days, $per_page, $offset]));
    $rows = $stmt->fetchAll();
    $items = array_map(function ($row) {
        $row['text'] = (int)($row['text'] ?? 0);
        $row['image'] = (int)($row['image'] ?? 0);
        $row['video'] = (int)($row['video'] ?? 0);
        $row['landing'] = (int)($row['landing'] ?? 0);
        $row['total'] = $row['text'] + $row['image'] + $row['video'] + $row['landing'];
        return $row;
    }, $rows);
    json_response(['status' => 'ok', 'items' => $items, 'total_days' => $total_days]);
}

if ($action === 'limits') {
    $stmt = $db->prepare("SELECT max_brands, landing_credits_remaining, plan_tier FROM web_users WHERE id = ?");
    $stmt->execute([$user_id]);
    $user = $stmt->fetch() ?: [];
    $plan_limits = plan_limits($user['plan_tier'] ?? 'expired');
    $plan_max_brands = (int)($plan_limits['max_brands'] ?? 0);
    $brands_limit = (int)($user['max_brands'] ?? 0);
    if ($plan_max_brands > 0) {
        if ($brands_limit <= 0 || $brands_limit > $plan_max_brands) {
            $brands_limit = $plan_max_brands;
        }
    } elseif ($brands_limit <= 0) {
        $brands_limit = 0;
    }
    $brands_unlimited = $plan_max_brands <= 0;
    $landing_plan_limit = (int)($plan_limits['landing'] ?? 0);
    $cards_enabled = plan_allows_business_card($user['plan_tier'] ?? 'expired');

    $stmt = $db->prepare("SELECT COUNT(*) AS count FROM web_user_clients WHERE web_user_id = ?");
    $stmt->execute([$user_id]);
    $brands_used = (int)($stmt->fetch()['count'] ?? 0);

    $client_ids = [];
    if ($brands_used > 0) {
        $stmt = $db->prepare("
            SELECT client_id
            FROM web_user_clients
            WHERE web_user_id = ?
        ");
        $stmt->execute([$user_id]);
        $client_ids = array_map('intval', array_column($stmt->fetchAll(), 'client_id'));
    }

    $cards_used = 0;
    $landing_used = 0;
    if ($client_ids) {
        $placeholders = implode(',', array_fill(0, count($client_ids), '?'));
        $stmt = $db->prepare("SELECT COUNT(*) AS count FROM web_business_cards WHERE client_id IN ($placeholders)");
        $stmt->execute($client_ids);
        $cards_used = (int)($stmt->fetch()['count'] ?? 0);

        $stmt = $db->prepare("
            SELECT COUNT(*) AS count
            FROM web_landing_pages lp
            LEFT JOIN web_deleted_landing_pages d
              ON d.landing_page_id = lp.id
            WHERE lp.client_id IN ($placeholders)
              AND d.landing_page_id IS NULL
        ");
        $stmt->execute($client_ids);
        $landing_used = (int)($stmt->fetch()['count'] ?? 0);
    }

    $landing_unlimited = $landing_plan_limit <= 0;
    $landing_limit = $landing_unlimited ? null : $landing_plan_limit;
    $cards_limit = $cards_enabled
        ? ($brands_unlimited ? null : $brands_limit)
        : 0;

    json_response([
        'status' => 'ok',
        'limits' => [
            'brands_used' => $brands_used,
            'brands_limit' => $brands_unlimited ? null : $brands_limit,
            'cards_used' => $cards_used,
            'cards_limit' => $cards_limit,
            'landing_used' => $landing_used,
            'landing_limit' => $landing_limit,
            'cards_enabled' => $cards_enabled
        ]
    ]);
}

if ($action === 'retention_offer_status') {
    $db->exec("
        CREATE TABLE IF NOT EXISTS web_retention_offers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            web_user_id INT NOT NULL UNIQUE,
            accepted_at TIMESTAMP NULL DEFAULT NULL,
            declined_at TIMESTAMP NULL DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    $stmt = $db->prepare("SELECT accepted_at, declined_at FROM web_retention_offers WHERE web_user_id = ? LIMIT 1");
    $stmt->execute([$user_id]);
    $row = $stmt->fetch();
    $status = 'available';
    if ($row) {
        if (!empty($row['accepted_at'])) {
            $status = 'accepted';
        } elseif (!empty($row['declined_at'])) {
            $status = 'declined';
        } else {
            $status = 'used';
        }
    }
    json_response(['status' => 'ok', 'offer' => ['state' => $status]]);
}

if ($action === 'retention_offer_accept' || $action === 'retention_offer_decline') {
    $db->exec("
        CREATE TABLE IF NOT EXISTS web_retention_offers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            web_user_id INT NOT NULL UNIQUE,
            accepted_at TIMESTAMP NULL DEFAULT NULL,
            declined_at TIMESTAMP NULL DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    $column = $action === 'retention_offer_accept' ? 'accepted_at' : 'declined_at';
    $stmt = $db->prepare("
        INSERT INTO web_retention_offers (web_user_id, {$column}, created_at)
        VALUES (?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE {$column} = NOW()
    ");
    $stmt->execute([$user_id]);
    json_response(['status' => 'ok']);
}

if ($action === 'cancel_feedback') {
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $reason = trim((string)($input['reason'] ?? ''));
    $detail = trim((string)($input['detail'] ?? ''));
    $db->exec("
        CREATE TABLE IF NOT EXISTS web_cancel_feedback (
            id INT AUTO_INCREMENT PRIMARY KEY,
            web_user_id INT NOT NULL,
            reason VARCHAR(64) DEFAULT NULL,
            detail TEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            KEY idx_user (web_user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    $stmt = $db->prepare("
        INSERT INTO web_cancel_feedback (web_user_id, reason, detail, created_at)
        VALUES (?, ?, ?, NOW())
    ");
    $stmt->execute([$user_id, $reason !== '' ? $reason : null, $detail !== '' ? $detail : null]);
    json_response(['status' => 'ok']);
}

json_error('Invalid action', 400);
?>
