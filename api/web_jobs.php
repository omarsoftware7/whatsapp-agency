<?php
require_once '../config.php';

function log_jobs_debug(string $message, array $context = []): void {
    $path = __DIR__ . '/../storage/jobs_debug.log';
    $dir = dirname($path);
    if (!file_exists($dir)) {
        mkdir($dir, 0777, true);
    }
    $line = date('Y-m-d H:i:s') . ' ' . $message;
    if ($context) {
        $line .= ' ' . json_encode($context, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
    file_put_contents($path, $line . PHP_EOL, FILE_APPEND);
}

session_start();

if (!isset($_SESSION['web_user_id'])) {
    json_error('Unauthorized', 401);
}

$db = get_db();
$user_id = (int)$_SESSION['web_user_id'];
$user_role = $_SESSION['web_user_role'] ?? 'user';

function ensure_brand_owner(PDO $db, int $user_id, int $client_id, string $role = 'user') {
    if ($role === 'admin') {
        return;
    }
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

function get_user_plan(PDO $db, int $user_id): array {
    $stmt = $db->prepare("
        SELECT plan_tier,
               subscription_status,
               trial_end_at,
               plan_end_at,
               text_credits_remaining,
               image_credits_remaining,
               video_credits_remaining,
               landing_credits_remaining,
               is_active
        FROM web_users
        WHERE id = ?
    ");
    $stmt->execute([$user_id]);
    return $stmt->fetch() ?: [];
}

function is_trial_active(array $user): bool {
    if (($user['subscription_status'] ?? '') !== 'trial') {
        return false;
    }
    if (empty($user['trial_end_at'])) {
        return false;
    }
    $total = (int)($user['text_credits_remaining'] ?? 0)
        + (int)($user['image_credits_remaining'] ?? 0)
        + (int)($user['video_credits_remaining'] ?? 0)
        + (int)($user['landing_credits_remaining'] ?? 0);
    return strtotime($user['trial_end_at']) >= time() && $total > 0;
}

function is_plan_active(array $user): bool {
    if (($user['subscription_status'] ?? '') !== 'active') {
        return false;
    }
    if (empty($user['plan_end_at'])) {
        return true;
    }
    return strtotime($user['plan_end_at']) >= time();
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Fetch edit history for a specific job
    if (isset($_GET['action']) && $_GET['action'] === 'edit_history') {
        $job_id = isset($_GET['job_id']) ? (int)$_GET['job_id'] : 0;
        if (!$job_id) {
            json_error('job_id required');
        }
        // Verify user owns this job's brand
        $stmt = $db->prepare("
            SELECT cj.client_id 
            FROM creative_jobs cj
            JOIN web_user_clients wuc ON wuc.client_id = cj.client_id AND wuc.web_user_id = ?
            WHERE cj.id = ?
        ");
        $stmt->execute([$user_id, $job_id]);
        if (!$stmt->fetch()) {
            json_error('Job not found', 404);
        }
        // Fetch all edit requests for this job
        $editStmt = $db->prepare("
            SELECT id, user_edit, status, error_message, result_image_url,
                   requested_at, completed_at
            FROM web_design_edit_requests
            WHERE job_id = ?
            ORDER BY id ASC
        ");
        $editStmt->execute([$job_id]);
        $edits = $editStmt->fetchAll();
        json_response(['edit_history' => $edits]);
    }
    
    $client_id = isset($_GET['client_id']) ? (int)$_GET['client_id'] : 0;
    if (!$client_id) {
        json_error('client_id required');
    }
    try {
    ensure_brand_owner($db, $user_id, $client_id, $user_role);

    $query = "
        SELECT id,
               client_id,
               job_type,
               user_message,
               user_images,
               product_images,
               design_variations,
               approved_design_index,
               reel_video_url,
               ad_copy,
                   error_message,
                   facebook_post_id,
                   instagram_post_id,
                   instagram_permalink,
               current_stage,
               created_at,
               product_images_count,
               image_size,
               language,
               (
                 SELECT status
                 FROM web_design_edit_requests
                 WHERE job_id = creative_jobs.id
                 ORDER BY id DESC
                 LIMIT 1
               ) AS edit_status,
               (
                 SELECT user_edit
                 FROM web_design_edit_requests
                 WHERE job_id = creative_jobs.id
                 ORDER BY id DESC
                 LIMIT 1
               ) AS edit_user_edit,
               (
                 SELECT error_message
                 FROM web_design_edit_requests
                 WHERE job_id = creative_jobs.id
                 ORDER BY id DESC
                 LIMIT 1
               ) AS edit_error_message,
               (
                 SELECT COUNT(*) = SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AND COUNT(*) > 0
                 FROM web_multi_products
                 WHERE job_id = creative_jobs.id
               ) AS multi_products_complete
        FROM creative_jobs
        WHERE client_id = ?
    ";
    $params = [$client_id];
    if ($user_role !== 'admin') {
        $query .= " AND NOT EXISTS (
            SELECT 1 FROM web_deleted_jobs dj
            WHERE dj.job_id = creative_jobs.id AND dj.web_user_id = ?
        )";
        $params[] = $user_id;
    }
    $query .= " ORDER BY created_at DESC";
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $items = $stmt->fetchAll();
    json_response(['items' => $items]);
    } catch (Throwable $e) {
        log_jobs_debug('get_failed', [
            'client_id' => $client_id,
            'user_id' => $user_id,
            'error' => $e->getMessage()
        ]);
        json_error('Failed to load jobs', 500);
    }
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed', 405);
}

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? null;

if (!$action) {
    json_error('action required');
}

if ($action === 'create') {
    $client_id = (int)($input['client_id'] ?? 0);
    $job_type = $input['job_type'] ?? null;
    $user_message = trim($input['user_message'] ?? '');
    $user_images = $input['user_images'] ?? [];
    $product_images = $input['product_images'] ?? [];
    $multi_products = $input['multi_products'] ?? [];
    $tips_content = trim($input['tips_content'] ?? '');
    $tips_count = (int)($input['tips_count'] ?? 5);
    if ($tips_count < 3) $tips_count = 3;
    if ($tips_count > 10) $tips_count = 10;
    $image_size = $input['image_size'] ?? 'post';
    $language = $input['language'] ?? 'en';
    $ugc_language = $input['ugc_language'] ?? null;
    $ugc_accent = $input['ugc_accent'] ?? null;
    $ugc_auto = !empty($input['ugc_auto']);

    log_jobs_debug('create_request', [
        'user_id' => $user_id,
        'client_id' => $client_id,
        'job_type' => $job_type,
        'image_size' => $image_size,
        'language' => $language,
        'user_message_len' => strlen($user_message),
        'user_images_count' => is_array($user_images) ? count($user_images) : 0,
        'product_images_count' => is_array($product_images) ? count($product_images) : 0
    ]);

    if (!$client_id || !$job_type) {
        json_error('client_id and job_type required');
    }
    ensure_brand_owner($db, $user_id, $client_id, $user_role);

    $valid_job_types = ['announcement', 'product_sale', 'from_image', 'before_after', 'reel', 'content_strategy', 'ugc_video', 'multi_mode', 'video'];
    if (!in_array($job_type, $valid_job_types, true)) {
        json_error('Invalid job type');
    }

    $user_plan = get_user_plan($db, $user_id);
    if ((int)($user_plan['is_active'] ?? 1) !== 1) {
        json_error('Account disabled. Contact support to re-enable generation.');
    }
    $plan_tier = $user_plan['plan_tier'] ?? 'expired';
    // Multi mode enabled for all plans.

    $valid_sizes = ['post', 'story'];
    if (!in_array($image_size, $valid_sizes, true)) {
        $image_size = 'post';
    }
    if ($job_type === 'multi_mode') {
        $image_size = 'post';
    }

    $valid_languages = ['en', 'ar', 'he'];
    if (!in_array($language, $valid_languages, true)) {
        $language = 'en';
    }
    if ($job_type === 'multi_mode') {
        $language = null;
    }

    $has_text = $user_message !== '';
    if (in_array($job_type, ['announcement', 'from_image', 'content_strategy'], true) && !$has_text) {
        json_error('Creative direction is required for this job type.');
    }
    $has_user_images = is_array($user_images) && count($user_images) > 0;
    $has_images = is_array($product_images) && count($product_images) > 0;
    $has_multi_products = is_array($multi_products) && count($multi_products) > 0;
    if ($job_type === 'multi_mode' && !$has_multi_products) {
        json_error('multi_products required for multi_mode');
    }
    if ($job_type === 'multi_mode' && count($multi_products) > 10) {
        json_error('Maximum 10 products allowed per multi-mode job');
    }
    
    // Parse tips for tips_carousel mode
    $parsed_tips = [];
    $tips_mode = 'explicit'; // 'explicit' or 'ai_generate'
    if ($job_type === 'tips_carousel') {
        if ($tips_content === '') {
            json_error('Tips content or prompt is required for Tips/Educational carousel');
        }
        // Try to parse tips - split by newlines, filter empty, clean up
        $lines = preg_split('/\r?\n/', $tips_content);
        foreach ($lines as $line) {
            $line = trim($line);
            // Remove leading numbers/bullets (1. 2. - • etc)
            $cleaned = preg_replace('/^[\d]+[\.\)]\s*/', '', $line);
            $cleaned = preg_replace('/^[-•*]\s*/', '', $cleaned);
            $cleaned = trim($cleaned);
            if ($cleaned !== '') {
                $parsed_tips[] = $cleaned;
            }
        }
        
        // If we got fewer than 2 tips, treat content as AI generation prompt
        if (count($parsed_tips) < 2) {
            $tips_mode = 'ai_generate';
            // Store the raw content as the prompt, will be processed during design generation
            $parsed_tips = []; // Clear - will be generated by AI
            $user_message = $tips_content; // Store prompt in user_message
        } else {
            // Explicit tips provided
            if (count($parsed_tips) > 10) {
                $parsed_tips = array_slice($parsed_tips, 0, 10); // Cap at 10
            }
        }
        
        // Force post size for carousels
        $image_size = 'post';
    }

    $ready = false;
    if (in_array($job_type, ['product_sale'], true)) {
        $ready = $has_text && $has_images;
    } elseif ($job_type === 'ugc_video') {
        $ready = $has_images && ($has_text || $ugc_auto);
    } elseif ($job_type === 'from_image') {
        $ready = $has_text && $has_user_images;
    } elseif ($job_type === 'before_after') {
        $ready = $has_text && $has_user_images && count($user_images) === 2;
    } elseif ($job_type === 'video') {
        // Video job needs an image source (user_images or product_images)
        $ready = ($has_user_images || $has_images);
    } elseif ($job_type === 'multi_mode') {
        $ready = $has_multi_products;
    } elseif ($job_type === 'tips_carousel') {
        $ready = count($parsed_tips) >= 2;
    } elseif ($job_type === 'announcement') {
        $ready = $has_text || $has_images;
    } else {
        $ready = $has_text;
    }

    $current_stage = $ready 
        ? ($job_type === 'video' ? 'generate_video' : 'generate_design') 
        : 'await_user_input';
    $credits_cost = 1;
    if ($job_type === 'multi_mode') {
        $credits_cost = max(1, count($multi_products));
    }
    if ($job_type === 'tips_carousel') {
        // For AI-generated tips, use the requested count; for explicit, use actual count
        $credits_cost = ($tips_mode === 'ai_generate') 
            ? max(1, $tips_count ?: 5)  // Use requested count or default 5
            : max(1, count($parsed_tips));
    }
    if ($ready) {
        $has_active = is_trial_active($user_plan) || is_plan_active($user_plan);
        if (!$has_active) {
            json_error('No active plan. Subscribe to start creating.');
        }
        $requires_video = in_array($job_type, ['ugc_video', 'reel', 'video'], true);
        $requires_image = !$requires_video;
        if ($requires_video && (int)($user_plan['video_credits_remaining'] ?? 0) < 1) {
            json_error('Not enough video credits. Upgrade your plan.');
        }
        if ($requires_image && (int)($user_plan['image_credits_remaining'] ?? 0) < 1) {
            json_error('Not enough image credits. Upgrade your plan.');
        }
        if ((int)($user_plan['text_credits_remaining'] ?? 0) < 1) {
            json_error('Not enough text credits. Upgrade your plan.');
        }
    }
    if ($job_type === 'multi_mode') {
        $product_images = array_values(array_filter(array_map(static function ($item) {
            return $item['image_url'] ?? null;
        }, $multi_products)));
        $has_images = count($product_images) > 0;
    }
    
    // For tips_carousel, store tips data in product_images JSON
    $tips_json = null;
    if ($job_type === 'tips_carousel') {
        $tips_data = [
            'mode' => $tips_mode,
            'tips' => $parsed_tips,
            'count' => $tips_count,
            'prompt' => $tips_mode === 'ai_generate' ? $tips_content : null
        ];
        $tips_json = json_encode($tips_data);
    }

    $user_images_json = $has_user_images ? json_encode($user_images) : null;
    $product_images_json = $has_images ? json_encode($product_images) : ($tips_json ?: null);
    $extracted_data_json = null;
    if ($job_type === 'ugc_video') {
        $allowed_ugc_languages = ['ar', 'en', 'he'];
        $allowed_ugc_accents = [
            'ar_msa', 'ar_egypt', 'ar_levant', 'ar_gulf', 'ar_saudi', 'ar_uae',
            'ar_qatar', 'ar_kuwait', 'ar_iraq', 'ar_morocco', 'ar_tunisia',
            'ar_algeria', 'ar_sudan', 'ar_yemen', 'ar_palestine', 'ar_jordan',
            'ar_lebanon', 'ar_syria', 'ar_libya', 'ar_oman', 'ar_bahrain',
            'en_us', 'en_uk', 'he_il'
        ];
        if (!in_array($ugc_language, $allowed_ugc_languages, true)) {
            json_error('ugc_language required');
        }
        if (!in_array($ugc_accent, $allowed_ugc_accents, true)) {
            json_error('ugc_accent required');
        }
        $extracted_data_json = json_encode([
            'ugc_language' => $ugc_language,
            'ugc_accent' => $ugc_accent,
            'ugc_auto' => $ugc_auto ? 1 : 0
        ], JSON_UNESCAPED_UNICODE);
    }

    try {
    $stmt = $db->prepare("
        INSERT INTO creative_jobs (
            client_id,
            job_type,
            user_message,
            user_images,
            product_images,
            extracted_data,
            product_images_count,
            image_size,
            language,
            current_stage,
            credits_cost,
            credits_charged,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    $stmt->execute([
        $client_id,
        $job_type,
        $user_message ?: null,
        $user_images_json,
        $product_images_json,
        $extracted_data_json,
        $has_images ? count($product_images) : ($job_type === 'tips_carousel' ? count($parsed_tips) : 0),
        $image_size,
        $language,
        $current_stage,
        $credits_cost,
        $ready ? 1 : 0
    ]);

    $job_id = (int)$db->lastInsertId();

    if ($job_type === 'multi_mode' && $multi_products) {
        $insert = $db->prepare("
            INSERT INTO web_multi_products (
                job_id,
                sort_order,
                product_image_url,
                product_name,
                price,
                old_price,
                notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        foreach ($multi_products as $index => $item) {
            $image_url = trim((string)($item['image_url'] ?? ''));
            $name = trim((string)($item['name'] ?? ''));
            $price = trim((string)($item['price'] ?? ''));
            $old_price = trim((string)($item['old_price'] ?? ''));
            $notes = trim((string)($item['notes'] ?? ''));
            if ($image_url === '' || $name === '' || $price === '') {
                continue;
            }
            $insert->execute([
                $job_id,
                (int)($item['sort_order'] ?? $index),
                $image_url,
                $name,
                $price,
                $old_price !== '' ? $old_price : null,
                $notes !== '' ? $notes : null
            ]);
        }
    }

    log_activity($client_id, $job_id, 'job_created_web', [
        'ready_for_processing' => $ready
    ]);

    log_jobs_debug('create_success', [
        'job_id' => $job_id,
        'client_id' => $client_id,
        'job_type' => $job_type,
        'current_stage' => $current_stage
    ]);

    json_response([
        'status' => 'created',
        'job_id' => $job_id,
        'current_stage' => $current_stage
    ]);
    } catch (Throwable $e) {
        log_jobs_debug('create_failed', [
            'error' => $e->getMessage()
        ]);
        json_error('Failed to create job', 500);
    }
}

if ($action === 'cancel') {
    $job_id = (int)($input['job_id'] ?? 0);
    if (!$job_id) {
        json_error('job_id required');
    }
    $stmt = $db->prepare("SELECT client_id, current_stage FROM creative_jobs WHERE id = ?");
    $stmt->execute([$job_id]);
    $job = $stmt->fetch();
    if (!$job) {
        json_error('Job not found', 404);
    }
    ensure_brand_owner($db, $user_id, (int)$job['client_id'], $user_role);

    if (in_array($job['current_stage'], ['completed', 'rejected'], true)) {
        json_response(['status' => 'already_closed', 'job_id' => $job_id]);
    }

    $stmt = $db->prepare("
        UPDATE creative_jobs
        SET current_stage = 'rejected',
            completed_at = NOW()
        WHERE id = ?
    ");
    $stmt->execute([$job_id]);

    log_activity($job['client_id'], $job_id, 'job_cancelled_web', [
        'previous_stage' => $job['current_stage']
    ]);

    json_response(['status' => 'cancelled', 'job_id' => $job_id]);
}

if ($action === 'reset') {
    $job_id = (int)($input['job_id'] ?? 0);
    if (!$job_id) {
        json_error('job_id required');
    }
    $stmt = $db->prepare("SELECT client_id, current_stage FROM creative_jobs WHERE id = ?");
    $stmt->execute([$job_id]);
    $job = $stmt->fetch();
    if (!$job) {
        json_error('Job not found', 404);
    }
    ensure_brand_owner($db, $user_id, (int)$job['client_id'], $user_role);

    if ($job['current_stage'] !== 'rejected') {
        json_error('Only cancelled jobs can be reset');
    }

    $stmt = $db->prepare("
        UPDATE creative_jobs
        SET current_stage = 'await_user_input',
            user_message = NULL,
            user_images = NULL,
            product_images = NULL,
            product_images_count = 0,
            design_variations = NULL,
            design_prompt = NULL,
            design_approved = 0,
            design_approved_at = NULL,
            approved_design_index = NULL,
            ad_copy = NULL,
            ad_copy_approved = 0,
            ad_copy_approved_at = NULL,
            publish_approved = 0,
            publish_approved_at = NULL,
            processing_lock = 0,
            processing_lock_at = NULL,
            rejection_count = 0,
            error_message = NULL,
            completed_at = NULL
        WHERE id = ?
    ");
    $stmt->execute([$job_id]);

    log_activity($job['client_id'], $job_id, 'job_reset_web', [
        'previous_stage' => $job['current_stage']
    ]);

    json_response(['status' => 'reset', 'job_id' => $job_id]);
}

if ($action === 'retry_video') {
    $job_id = (int)($input['job_id'] ?? 0);
    if (!$job_id) {
        json_error('job_id required');
    }
    $stmt = $db->prepare("SELECT client_id, current_stage, job_type FROM creative_jobs WHERE id = ?");
    $stmt->execute([$job_id]);
    $job = $stmt->fetch();
    if (!$job) {
        json_error('Job not found', 404);
    }
    ensure_brand_owner($db, $user_id, (int)$job['client_id'], $user_role);
    if ($job['job_type'] !== 'video') {
        json_error('Only video jobs can be retried');
    }
    $stmt = $db->prepare("
        UPDATE creative_jobs
        SET current_stage = 'generate_video',
            error_message = NULL,
            completed_at = NULL
        WHERE id = ?
    ");
    $stmt->execute([$job_id]);
    json_response(['status' => 'queued', 'job_id' => $job_id]);
}

if ($action === 'delete') {
    $job_id = (int)($input['job_id'] ?? 0);
    if (!$job_id) {
        json_error('job_id required');
    }
    $stmt = $db->prepare("SELECT client_id, current_stage FROM creative_jobs WHERE id = ?");
    $stmt->execute([$job_id]);
    $job = $stmt->fetch();
    if (!$job) {
        json_error('Job not found', 404);
    }
    ensure_brand_owner($db, $user_id, (int)$job['client_id']);
    if ($job['current_stage'] !== 'rejected') {
        json_error('Only cancelled jobs can be deleted');
    }
    $stmt = $db->prepare("
        INSERT INTO web_deleted_jobs (job_id, web_user_id, client_id, deleted_at)
        VALUES (?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE deleted_at = VALUES(deleted_at)
    ");
    $stmt->execute([$job_id, $user_id, (int)$job['client_id']]);
    json_response(['status' => 'deleted', 'job_id' => $job_id]);
}

json_error('Invalid action', 400);
?>
