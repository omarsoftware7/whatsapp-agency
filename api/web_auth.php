<?php
require_once '../config.php';
require_once __DIR__ . '/security_helpers.php';

function request_base_url(): string {
    // Use ALLOWED_HOSTS to prevent host header injection
    $allowed_hosts = defined('ALLOWED_HOSTS') ? ALLOWED_HOSTS : [];
    return get_safe_base_url($allowed_hosts);
}

$base_url = request_base_url();
$host = parse_url($base_url, PHP_URL_HOST) ?: '';
$cookie_domain = '';
if ($host !== '' && $host !== 'localhost' && filter_var($host, FILTER_VALIDATE_IP) === false) {
    $cookie_domain = $host;
}
$is_https = str_starts_with($base_url, 'https://');
session_name('adly_web');
$cookie_params = session_get_cookie_params();
session_set_cookie_params([
    'lifetime' => $cookie_params['lifetime'],
    'path' => '/',
    'domain' => $cookie_domain,
    'secure' => $is_https,
    'httponly' => true,
    'samesite' => 'Lax'
]);

session_start();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$input = $method === 'POST' ? (json_decode(file_get_contents('php://input'), true) ?: []) : [];
$action = $input['action'] ?? ($_GET['action'] ?? ($_GET['Action'] ?? null));

if ($method !== 'POST' && $action !== 'me') {
    json_error('Method not allowed', 405);
}

if (!$action) {
    json_error('action required');
}

function sanitize_email($email) {
    $email = trim(strtolower($email));
    return filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : null;
}

function ensure_referral_tables(PDO $db): void {
    $db->exec("
        CREATE TABLE IF NOT EXISTS web_referral_codes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL UNIQUE,
            code VARCHAR(32) NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    $db->exec("
        CREATE TABLE IF NOT EXISTS web_referrals (
            id INT AUTO_INCREMENT PRIMARY KEY,
            referrer_user_id INT NOT NULL,
            referred_user_id INT NOT NULL,
            code VARCHAR(32) NOT NULL,
            status VARCHAR(16) NOT NULL DEFAULT 'pending',
            discount_applied TINYINT(1) NOT NULL DEFAULT 0,
            rewarded_at TIMESTAMP NULL DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_referred (referred_user_id),
            KEY idx_referrer (referrer_user_id),
            KEY idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    $db->exec("
        CREATE TABLE IF NOT EXISTS web_user_meta (
            user_id INT PRIMARY KEY,
            heard_about VARCHAR(64) DEFAULT NULL,
            referral_code_used VARCHAR(32) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
}

function get_or_create_referral_code(PDO $db, int $user_id): string {
    $stmt = $db->prepare("SELECT code FROM web_referral_codes WHERE user_id = ?");
    $stmt->execute([$user_id]);
    $row = $stmt->fetch();
    if ($row && !empty($row['code'])) {
        return $row['code'];
    }
    $attempts = 0;
    do {
        $code = strtoupper(bin2hex(random_bytes(4)));
        $stmt = $db->prepare("SELECT id FROM web_referral_codes WHERE code = ?");
        $stmt->execute([$code]);
        $exists = $stmt->fetch();
        $attempts += 1;
    } while ($exists && $attempts < 5);
    $stmt = $db->prepare("INSERT INTO web_referral_codes (user_id, code) VALUES (?, ?)");
    $stmt->execute([$user_id, $code]);
    return $code;
}

function apply_billing_cycle_if_needed(PDO $db, array $user): array {
    if (($user['subscription_status'] ?? '') !== 'active') {
        return $user;
    }
    $tier = $user['plan_tier'] ?? 'expired';
    if (!in_array($tier, ['starter', 'growth', 'pro', 'agency'], true)) {
        return $user;
    }
    $now = time();
    $plan_end = $user['plan_end_at'] ? strtotime($user['plan_end_at']) : null;
    $interval = $user['plan_interval'] ?? 'monthly';
    if ($plan_end && $plan_end > $now) {
        return apply_credit_reset_if_needed($db, $user);
    }
    $add = $interval === 'yearly' ? '+1 year' : '+1 month';
    $new_end = date('Y-m-d H:i:s', strtotime($add, $now));
    $limits = plan_limits($tier);
    $next_reset = date('Y-m-d H:i:s', strtotime('+1 month', $now));
    $total = (int)$limits['text'] + (int)$limits['image'] + (int)$limits['video'] + (int)$limits['landing'];
    $stmt = $db->prepare("
        UPDATE web_users
        SET credits_remaining = ?,
            text_credits_remaining = ?,
            image_credits_remaining = ?,
            video_credits_remaining = ?,
            landing_credits_remaining = ?,
            credits_reset_at = ?,
            plan_end_at = ?,
            trial_end_at = NULL
        WHERE id = ?
    ");
    $stmt->execute([
        $total,
        (int)$limits['text'],
        (int)$limits['image'],
        (int)$limits['video'],
        (int)$limits['landing'],
        $next_reset,
        $new_end,
        (int)$user['id']
    ]);
    $user['credits_remaining'] = $total;
    $user['text_credits_remaining'] = (int)$limits['text'];
    $user['image_credits_remaining'] = (int)$limits['image'];
    $user['video_credits_remaining'] = (int)$limits['video'];
    $user['landing_credits_remaining'] = (int)$limits['landing'];
    $user['credits_reset_at'] = $next_reset;
    $user['plan_end_at'] = $new_end;
    $user['trial_end_at'] = null;
    return $user;
}

if ($action === 'me') {
    if (!isset($_SESSION['web_user_id'])) {
        if (defined('DEBUG_MODE') && DEBUG_MODE) {
            $sess_path = session_save_path();
            $sess_file = $sess_path ? rtrim($sess_path, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'sess_' . session_id() : null;
            $sess_exists = $sess_file ? file_exists($sess_file) : false;
            $sess_contents = $sess_exists ? file_get_contents($sess_file) : '';
            json_response([
                'error' => 'Unauthorized',
                'debug' => [
                    'host' => $_SERVER['HTTP_HOST'] ?? '',
                    'cookie_domain' => $cookie_domain,
                    'session_id' => session_id(),
                    'cookies' => $_COOKIE,
                    'session_save_path' => $sess_path,
                    'session_file' => $sess_file,
                    'session_file_exists' => $sess_exists,
                    'session_raw' => $sess_contents
                ]
            ], 401);
        }
        json_error('Unauthorized', 401);
    }
    $db = get_db();
    // Check if registration_method column exists
    $has_registration_method = false;
    try {
        $check = $db->query("SHOW COLUMNS FROM web_users LIKE 'registration_method'");
        $has_registration_method = ($check && $check->rowCount() > 0);
    } catch (Throwable $e) {
        $has_registration_method = false;
    }
    
    $select_cols = "id, email, role, max_brands, first_name, last_name, avatar_url, theme_mode, 
                    plan_tier, plan_interval, subscription_status, trial_end_at, plan_end_at, 
                    credits_remaining, text_credits_remaining, image_credits_remaining, 
                    video_credits_remaining, landing_credits_remaining, credits_reset_at, payment_provider";
    if ($has_registration_method) {
        $select_cols .= ", registration_method";
    }
    
    $stmt = $db->prepare("SELECT $select_cols FROM web_users WHERE id = ? LIMIT 1");
    $stmt->execute([(int)$_SESSION['web_user_id']]);
    $user = $stmt->fetch();
    if (!$user) {
        json_error('Unauthorized', 401);
    }
    $user = apply_billing_cycle_if_needed($db, $user);
    $user = apply_credit_reset_if_needed($db, $user);
    
    // Referral data - all wrapped in try-catch for safety
    $referral_code = '';
    $referrals_count = 0;
    try {
        ensure_referral_tables($db);
        $referral_code = get_or_create_referral_code($db, (int)$user['id']);
        
        $stmt = $db->prepare("
            SELECT COUNT(*) AS count
            FROM web_referrals
            WHERE referrer_user_id = ? AND status = 'rewarded'
        ");
        $stmt->execute([(int)$user['id']]);
        $referrals_count = (int)($stmt->fetch()['count'] ?? 0);
    } catch (Throwable $e) {
        // Referral system not available, continue with defaults
        $referral_code = '';
        $referrals_count = 0;
    }
    
    // Fetch user meta (referral code used, heard_about)
    $meta = [];
    try {
        $stmt = $db->prepare("SELECT heard_about, referral_code_used FROM web_user_meta WHERE user_id = ?");
        $stmt->execute([(int)$user['id']]);
        $meta = $stmt->fetch() ?: [];
    } catch (Throwable $e) {
        $meta = [];
    }

    $plan_limits = plan_limits($user['plan_tier'] ?? 'expired');
    $plan_max_brands = (int)($plan_limits['max_brands'] ?? 0);
    $max_brands = (int)($user['max_brands'] ?? 0);
    if ($plan_max_brands > 0) {
        if ($max_brands <= 0 || $max_brands > $plan_max_brands) {
            $max_brands = $plan_max_brands;
        }
    } elseif ($max_brands <= 0) {
        $max_brands = 0;
    }
    $_SESSION['web_user_email'] = $user['email'];
    $_SESSION['web_user_role'] = $user['role'] ?? 'user';
    $_SESSION['web_user_max_brands'] = $max_brands;
    $_SESSION['web_user_first_name'] = $user['first_name'] ?? null;
    $_SESSION['web_user_last_name'] = $user['last_name'] ?? null;
    $_SESSION['web_user_avatar_url'] = $user['avatar_url'] ?? null;
    $_SESSION['web_user_theme_mode'] = $user['theme_mode'] ?? 'brand';
    $_SESSION['web_user_plan_tier'] = $user['plan_tier'] ?? 'expired';
    $_SESSION['web_user_plan_interval'] = $user['plan_interval'] ?? 'monthly';
    $_SESSION['web_user_subscription_status'] = $user['subscription_status'] ?? 'expired';
    $_SESSION['web_user_trial_end_at'] = $user['trial_end_at'] ?? null;
    $_SESSION['web_user_plan_end_at'] = $user['plan_end_at'] ?? null;
    $_SESSION['web_user_credits_remaining'] = $user['credits_remaining'] ?? 0;
    $_SESSION['web_user_text_credits'] = $user['text_credits_remaining'] ?? 0;
    $_SESSION['web_user_image_credits'] = $user['image_credits_remaining'] ?? 0;
    $_SESSION['web_user_video_credits'] = $user['video_credits_remaining'] ?? 0;
    $_SESSION['web_user_landing_credits'] = $user['landing_credits_remaining'] ?? 0;
    $_SESSION['web_user_credits_reset_at'] = $user['credits_reset_at'] ?? null;
    $_SESSION['web_user_payment_provider'] = $user['payment_provider'] ?? null;

    json_response([
        'status' => 'ok',
        'user' => [
            'id' => $user['id'],
            'email' => $user['email'],
            'role' => $user['role'] ?? 'user',
            'max_brands' => $max_brands,
            'first_name' => $user['first_name'] ?? null,
            'last_name' => $user['last_name'] ?? null,
            'avatar_url' => $user['avatar_url'] ?? null,
            'theme_mode' => $user['theme_mode'] ?? 'brand',
            'plan_tier' => $user['plan_tier'] ?? 'expired',
            'plan_interval' => $user['plan_interval'] ?? 'monthly',
            'subscription_status' => $user['subscription_status'] ?? 'expired',
            'trial_end_at' => $user['trial_end_at'] ?? null,
            'plan_end_at' => $user['plan_end_at'] ?? null,
            'credits_remaining' => $user['credits_remaining'] ?? 0,
            'text_credits_remaining' => $user['text_credits_remaining'] ?? 0,
            'image_credits_remaining' => $user['image_credits_remaining'] ?? 0,
            'video_credits_remaining' => $user['video_credits_remaining'] ?? 0,
            'landing_credits_remaining' => $user['landing_credits_remaining'] ?? 0,
            'credits_reset_at' => $user['credits_reset_at'] ?? null,
            'payment_provider' => $user['payment_provider'] ?? null,
            'business_card_enabled' => plan_allows_business_card($user['plan_tier'] ?? 'expired'),
            'referral_code' => $referral_code,
            'referrals_count' => $referrals_count,
            'registration_method' => $user['registration_method'] ?? 'email',
            'heard_about' => $meta['heard_about'] ?? null,
            'referral_code_used' => $meta['referral_code_used'] ?? null
        ]
    ]);
}

if ($action === 'apply_referral') {
    if (!isset($_SESSION['web_user_id'])) {
        json_error('Unauthorized', 401);
    }
    $referral_code_input = strtoupper(trim((string)($input['referral_code'] ?? '')));
    if (!$referral_code_input) {
        json_error('Referral code required');
    }
    $db = get_db();
    ensure_referral_tables($db);
    
    $user_id = (int)$_SESSION['web_user_id'];
    
    // Check if user already used a referral code
    $stmt = $db->prepare("SELECT referral_code_used FROM web_user_meta WHERE user_id = ?");
    $stmt->execute([$user_id]);
    $existing = $stmt->fetch();
    if ($existing && $existing['referral_code_used']) {
        json_error('You have already applied a referral code');
    }
    
    // Check if already in web_referrals
    $stmt = $db->prepare("SELECT id FROM web_referrals WHERE referred_user_id = ? LIMIT 1");
    $stmt->execute([$user_id]);
    if ($stmt->fetch()) {
        json_error('Referral code already applied');
    }
    
    // Validate the referral code exists
    $stmt = $db->prepare("SELECT user_id FROM web_referral_codes WHERE code = ?");
    $stmt->execute([$referral_code_input]);
    $referrer = $stmt->fetch();
    if (!$referrer) {
        json_error('Invalid referral code');
    }
    
    $referrer_id = (int)$referrer['user_id'];
    if ($referrer_id === $user_id) {
        json_error('You cannot use your own referral code');
    }
    
    // Insert the referral record
    $stmt = $db->prepare("
        INSERT INTO web_referrals (referrer_user_id, referred_user_id, code, status, discount_applied)
        VALUES (?, ?, ?, 'pending', 0)
    ");
    $stmt->execute([$referrer_id, $user_id, $referral_code_input]);
    
    // Also save to web_user_meta so we can show it in profile
    $stmt = $db->prepare("
        INSERT INTO web_user_meta (user_id, referral_code_used)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE referral_code_used = VALUES(referral_code_used)
    ");
    $stmt->execute([$user_id, $referral_code_input]);
    
    json_response(['status' => 'ok', 'message' => 'Referral code applied successfully']);
}

if ($action === 'logout') {
    session_unset();
    session_destroy();
    json_response(['status' => 'logged_out']);
}

$db = get_db();

if ($action === 'register') {
    $email = sanitize_email($input['email'] ?? '');
    $password = $input['password'] ?? '';
    $full_name = trim($input['full_name'] ?? '');
    $account_type = $input['account_type'] ?? '';
    $heard_about = trim((string)($input['heard_about'] ?? ''));
    $referral_code_input = strtoupper(trim((string)($input['referral_code'] ?? '')));
    $allowed_account_types = ['agency', 'freelancer', 'business'];

    if (!$email) {
        json_error('Valid email required');
    }
    if (strlen($password) < 6) {
        json_error('Password must be at least 6 characters');
    }
    if ($full_name === '') {
        json_error('Full name required');
    }
    if (!in_array($account_type, $allowed_account_types, true)) {
        json_error('Account type required');
    }

    $stmt = $db->prepare("SELECT id FROM web_users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        json_error('Email already registered', 409);
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $name_parts = preg_split('/\s+/', $full_name);
    $first_name = $name_parts[0] ?? '';
    $last_name = count($name_parts) > 1 ? trim(implode(' ', array_slice($name_parts, 1))) : '';
    ensure_referral_tables($db);
    $referrer_user_id = null;
    if ($referral_code_input !== '') {
        $stmt = $db->prepare("SELECT user_id FROM web_referral_codes WHERE code = ?");
        $stmt->execute([$referral_code_input]);
        $ref = $stmt->fetch();
        if (!$ref) {
            json_error('Invalid referral code');
        }
        $referrer_user_id = (int)$ref['user_id'];
    }
    $stmt = $db->prepare("
        INSERT INTO web_users (
            email,
            password_hash,
            first_name,
            last_name,
            account_type,
            plan_tier,
            plan_interval,
            subscription_status,
            trial_end_at,
            credits_remaining,
            text_credits_remaining,
            image_credits_remaining,
            video_credits_remaining,
            landing_credits_remaining,
            credits_reset_at,
            role,
            max_brands,
            is_active,
            theme_mode,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, 'expired', 'monthly', 'expired', NULL, 0, 0, 0, 0, 0, NULL, 'user', 1, 1, 'brand', NOW())
    ");
    $stmt->execute([
        $email,
        $hash,
        $first_name ?: null,
        $last_name ?: null,
        $account_type
    ]);

    $new_user_id = (int)$db->lastInsertId();
    get_or_create_referral_code($db, $new_user_id);
    if ($referrer_user_id) {
        $stmt = $db->prepare("
            INSERT INTO web_referrals (referrer_user_id, referred_user_id, code, status, discount_applied)
            VALUES (?, ?, ?, 'pending', 0)
        ");
        $stmt->execute([$referrer_user_id, $new_user_id, $referral_code_input]);
    }
    $stmt = $db->prepare("
        INSERT INTO web_user_meta (user_id, heard_about, referral_code_used)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE heard_about = VALUES(heard_about), referral_code_used = VALUES(referral_code_used)
    ");
    $stmt->execute([$new_user_id, $heard_about !== '' ? $heard_about : null, $referral_code_input !== '' ? $referral_code_input : null]);

    // Regenerate session ID to prevent session fixation attacks
    secure_session_regenerate();
    
    $_SESSION['web_user_id'] = $new_user_id;
    $_SESSION['web_user_email'] = $email;
    $_SESSION['web_user_role'] = 'user';
    $_SESSION['web_user_max_brands'] = 1;
    $_SESSION['web_user_first_name'] = $first_name ?: null;
    $_SESSION['web_user_last_name'] = $last_name ?: null;
    $_SESSION['web_user_avatar_url'] = null;
    $_SESSION['web_user_theme_mode'] = 'brand';
    $_SESSION['web_user_plan_tier'] = 'expired';
    $_SESSION['web_user_plan_interval'] = 'monthly';
    $_SESSION['web_user_subscription_status'] = 'expired';
    $_SESSION['web_user_trial_end_at'] = null;
    $_SESSION['web_user_plan_end_at'] = null;
    $_SESSION['web_user_credits_remaining'] = 0;
    $_SESSION['web_user_text_credits'] = 0;
    $_SESSION['web_user_image_credits'] = 0;
    $_SESSION['web_user_video_credits'] = 0;
    $_SESSION['web_user_landing_credits'] = 0;
    $_SESSION['web_user_credits_reset_at'] = null;

    json_response(['status' => 'registered']);
}

if ($action === 'login') {
    $email = sanitize_email($input['email'] ?? '');
    $password = $input['password'] ?? '';

    if (!$email || !$password) {
        json_error('Email and password required');
    }

    $stmt = $db->prepare("SELECT id, password_hash, is_active, role, max_brands, first_name, last_name, avatar_url, theme_mode, plan_tier, plan_interval, subscription_status, trial_end_at, plan_end_at, credits_remaining, text_credits_remaining, image_credits_remaining, video_credits_remaining, landing_credits_remaining, credits_reset_at, last_login_at, payment_provider FROM web_users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !(int)$user['is_active'] || !password_verify($password, $user['password_hash'])) {
        json_error('Invalid credentials', 401);
    }

    $user = apply_billing_cycle_if_needed($db, $user);
    $user = apply_credit_reset_if_needed($db, $user);
    
    // Regenerate session ID to prevent session fixation attacks
    secure_session_regenerate();
    
    $_SESSION['web_user_id'] = (int)$user['id'];
    $_SESSION['web_user_email'] = $email;
    $_SESSION['web_user_role'] = $user['role'] ?? 'user';
    $_SESSION['web_user_max_brands'] = $user['max_brands'];
    $_SESSION['web_user_first_name'] = $user['first_name'] ?? null;
    $_SESSION['web_user_last_name'] = $user['last_name'] ?? null;
    $_SESSION['web_user_avatar_url'] = $user['avatar_url'] ?? null;
    $_SESSION['web_user_theme_mode'] = $user['theme_mode'] ?? 'brand';
    $_SESSION['web_user_plan_tier'] = $user['plan_tier'] ?? 'expired';
    $_SESSION['web_user_plan_interval'] = $user['plan_interval'] ?? 'monthly';
    $_SESSION['web_user_subscription_status'] = $user['subscription_status'] ?? 'expired';
    $_SESSION['web_user_trial_end_at'] = $user['trial_end_at'] ?? null;
    $_SESSION['web_user_plan_end_at'] = $user['plan_end_at'] ?? null;
    $_SESSION['web_user_credits_remaining'] = $user['credits_remaining'] ?? 0;
    $_SESSION['web_user_text_credits'] = $user['text_credits_remaining'] ?? 0;
    $_SESSION['web_user_image_credits'] = $user['image_credits_remaining'] ?? 0;
    $_SESSION['web_user_video_credits'] = $user['video_credits_remaining'] ?? 0;
    $_SESSION['web_user_landing_credits'] = $user['landing_credits_remaining'] ?? 0;
    $_SESSION['web_user_credits_reset_at'] = $user['credits_reset_at'] ?? null;
    $_SESSION['web_user_payment_provider'] = $user['payment_provider'] ?? null;

    $db->prepare("UPDATE web_users SET last_login_at = NOW() WHERE id = ?")->execute([$_SESSION['web_user_id']]);

    json_response(['status' => 'logged_in']);
}

json_error('Invalid action', 400);
?>
