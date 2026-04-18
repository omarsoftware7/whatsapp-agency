<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/security_helpers.php';

function log_oauth_event(string $message, array $context = []): void {
    // Only log if DEBUG_MODE is enabled (in production, this should be disabled or write to private dir)
    if (!defined('DEBUG_MODE') || !DEBUG_MODE) {
        return;
    }
    $log_file = __DIR__ . '/oauth_debug.log';
    $context['time'] = date('c');
    $line = $message . ' ' . json_encode($context, JSON_UNESCAPED_SLASHES) . PHP_EOL;
    @file_put_contents($log_file, $line, FILE_APPEND);
}

function mask_value(string $value): string {
    if ($value === '') {
        return '';
    }
    $prefix = substr($value, 0, 6);
    $suffix = substr($value, -4);
    return $prefix . '...' . $suffix;
}

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
log_oauth_event('session_start', [
    'host' => $host,
    'base_url' => $base_url,
    'cookie_domain' => $cookie_domain,
    'secure' => $is_https,
    'session_id' => session_id(),
    'cookies_present' => array_keys($_COOKIE),
    'query' => array_keys($_GET),
]);

function google_redirect_uri(): string {
    $base_url = request_base_url();
    return $base_url . '/api/web_google_oauth.php?action=callback';
}

function google_auth_url(): string {
    $params = [
        'client_id' => GOOGLE_OAUTH_CLIENT_ID,
        'redirect_uri' => google_redirect_uri(),
        'response_type' => 'code',
        'scope' => 'openid email profile',
        'access_type' => 'offline',
        'prompt' => 'consent'
    ];
    return 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query($params);
}

function google_token(string $code): array {
    $payload = [
        'code' => $code,
        'client_id' => GOOGLE_OAUTH_CLIENT_ID,
        'client_secret' => GOOGLE_OAUTH_CLIENT_SECRET,
        'redirect_uri' => google_redirect_uri(),
        'grant_type' => 'authorization_code'
    ];
    $ch = curl_init('https://oauth2.googleapis.com/token');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($payload));
    $response = curl_exec($ch);
    $curl_error = curl_error($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    return [
        'code' => $code,
        'data' => json_decode($response, true) ?: [],
        'curl_error' => $curl_error
    ];
}

function google_token_info(string $id_token): array {
    $url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($id_token);
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    return [
        'code' => $code,
        'data' => json_decode($response, true) ?: []
    ];
}

$db = get_db();

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

$action = $_GET['action'] ?? 'start';

if ($action === 'start') {
    if (GOOGLE_OAUTH_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID') {
        log_oauth_event('missing_client_id');
        json_error('Google OAuth client ID not configured', 500);
    }
    $_SESSION['google_oauth_state'] = bin2hex(random_bytes(16));
    if (!empty($_GET['heard_about'])) {
        $_SESSION['registration_heard_about'] = trim((string)$_GET['heard_about']);
    }
    if (!empty($_GET['referral_code'])) {
        $_SESSION['registration_referral_code'] = strtoupper(trim((string)$_GET['referral_code']));
    }
    log_oauth_event('start', [
        'state' => $_SESSION['google_oauth_state'],
        'session_id' => session_id()
    ]);
    $url = google_auth_url() . '&state=' . urlencode($_SESSION['google_oauth_state']);
    header('Location: ' . $url);
    exit;
}

if ($action !== 'callback') {
    json_error('Invalid action', 400);
}

if (isset($_GET['error'])) {
    log_oauth_event('google_error', ['error' => $_GET['error']]);
    json_error('Google auth canceled', 400);
}

if (empty($_GET['state']) || empty($_SESSION['google_oauth_state']) || $_GET['state'] !== $_SESSION['google_oauth_state']) {
    log_oauth_event('state_mismatch', [
        'get_state' => $_GET['state'] ?? '',
        'session_state' => $_SESSION['google_oauth_state'] ?? '',
        'session_id' => session_id()
    ]);
    json_error('Invalid OAuth state', 400);
}
unset($_SESSION['google_oauth_state']);

$auth_code = $_GET['code'] ?? '';
if ($auth_code === '') {
    log_oauth_event('missing_auth_code');
    json_error('Missing auth code', 400);
}

$token = google_token($auth_code);
if ($token['code'] < 200 || $token['code'] >= 300) {
    log_oauth_event('token_exchange_failed', [
        'http_code' => $token['code'],
        'error' => $token['data']['error'] ?? null,
        'error_description' => $token['data']['error_description'] ?? null,
        'curl_error' => $token['curl_error'],
        'auth_code' => mask_value($auth_code)
    ]);
    $detail = $token['data']['error_description'] ?? $token['data']['error'] ?? 'Google token exchange failed';
    json_error($detail, 502);
}

$id_token = $token['data']['id_token'] ?? '';
if ($id_token === '') {
    log_oauth_event('missing_id_token', [
        'auth_code' => mask_value($auth_code),
        'token_keys' => array_keys($token['data'])
    ]);
    json_error('Missing id_token', 502);
}

$info = google_token_info($id_token);
if ($info['code'] < 200 || $info['code'] >= 300) {
    log_oauth_event('token_validation_failed', [
        'http_code' => $info['code'],
        'info_error' => $info['data']['error'] ?? null,
        'id_token' => mask_value($id_token)
    ]);
    json_error('Google token validation failed', 502);
}

$email = strtolower(trim($info['data']['email'] ?? ''));
$google_id = $info['data']['sub'] ?? '';
$full_name = trim($info['data']['name'] ?? '');

if ($email === '' || $google_id === '') {
    log_oauth_event('missing_profile_data', [
        'email_present' => $email !== '',
        'google_id_present' => $google_id !== ''
    ]);
    json_error('Google account missing email', 400);
}

$stmt = $db->prepare("SELECT * FROM web_users WHERE email = ? LIMIT 1");
$stmt->execute([$email]);
$user = $stmt->fetch();

if ($user) {
    if (!(int)$user['is_active']) {
        json_error('Account disabled', 403);
    }
    if (empty($user['google_id'])) {
        $db->prepare("UPDATE web_users SET google_id = ? WHERE id = ?")->execute([$google_id, $user['id']]);
    }
} else {
    $name_parts = preg_split('/\s+/', $full_name);
    $first_name = $name_parts[0] ?? '';
    $last_name = count($name_parts) > 1 ? trim(implode(' ', array_slice($name_parts, 1))) : '';
    $password_hash = password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT);
    $stmt = $db->prepare("
        INSERT INTO web_users (
            email,
            password_hash,
            google_id,
            first_name,
            last_name,
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
        $password_hash,
        $google_id,
        $first_name,
        $last_name
    ]);
    $user = [
        'id' => $db->lastInsertId(),
        'email' => $email,
        'role' => 'user',
        'max_brands' => 1,
        'first_name' => $first_name,
        'last_name' => $last_name,
        'avatar_url' => null,
        'theme_mode' => 'brand',
        'plan_tier' => 'expired',
        'plan_interval' => 'monthly',
        'subscription_status' => 'expired',
        'trial_end_at' => null,
        'plan_end_at' => null,
        'credits_remaining' => 0,
        'text_credits_remaining' => 0,
        'image_credits_remaining' => 0,
        'video_credits_remaining' => 0,
        'landing_credits_remaining' => 0,
        'credits_reset_at' => null,
        'payment_provider' => null
    ];
    ensure_referral_tables($db);
    $new_user_id = (int)$user['id'];
    get_or_create_referral_code($db, $new_user_id);
    $heard_about = trim((string)($_SESSION['registration_heard_about'] ?? ''));
    $referral_code = strtoupper(trim((string)($_SESSION['registration_referral_code'] ?? '')));
    if ($referral_code !== '') {
        $stmt = $db->prepare("SELECT user_id FROM web_referral_codes WHERE code = ?");
        $stmt->execute([$referral_code]);
        $referrer = $stmt->fetch();
        if ($referrer && (int)$referrer['user_id'] !== $new_user_id) {
            $stmt = $db->prepare("
                INSERT INTO web_referrals (referrer_user_id, referred_user_id, code, status, discount_applied)
                VALUES (?, ?, ?, 'pending', 0)
            ");
            $stmt->execute([(int)$referrer['user_id'], $new_user_id, $referral_code]);
        }
    }
    $stmt = $db->prepare("
        INSERT INTO web_user_meta (user_id, heard_about, referral_code_used)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE heard_about = VALUES(heard_about), referral_code_used = VALUES(referral_code_used)
    ");
    $stmt->execute([
        $new_user_id,
        $heard_about !== '' ? $heard_about : null,
        $referral_code !== '' ? $referral_code : null
    ]);
}

unset($_SESSION['registration_heard_about'], $_SESSION['registration_referral_code']);

// Regenerate session ID to prevent session fixation attacks
secure_session_regenerate();

$_SESSION['web_user_id'] = (int)$user['id'];
$_SESSION['web_user_email'] = $user['email'];
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

session_regenerate_id(true);
session_write_close();
header('Location: ' . $base_url . '/ui/app.html');
exit;
