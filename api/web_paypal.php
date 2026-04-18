<?php
function log_paypal_debug(string $message, array $context = []): void {
    $path = __DIR__ . '/../storage/paypal_debug.log';
    $dir = dirname($path);
    if (!file_exists($dir)) {
        mkdir($dir, 0777, true);
    }
    $line = date('Y-m-d H:i:s') . ' ' . $message;
    if ($context) {
        $line .= ' ' . json_encode($context, JSON_UNESCAPED_UNICODE);
    }
    file_put_contents($path, $line . PHP_EOL, FILE_APPEND);
}

require_once '../config.php';

session_start();

log_paypal_debug('request:incoming', [
    'method' => $_SERVER['REQUEST_METHOD'] ?? '',
    'session_id' => session_id(),
    'has_user' => isset($_SESSION['web_user_id']),
    'path' => $_SERVER['REQUEST_URI'] ?? ''
]);

if (!isset($_SESSION['web_user_id'])) {
    json_error('Unauthorized', 401);
}

$db = get_db();
$user_id = (int)$_SESSION['web_user_id'];
$user_role = $_SESSION['web_user_role'] ?? 'user';

function paypal_api_base(): string {
    return PAYPAL_MODE === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';
}

function paypal_access_token(): string {
    $api_base = paypal_api_base();
    $ch = curl_init($api_base . '/v1/oauth2/token');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_USERPWD, PAYPAL_CLIENT_ID . ':' . PAYPAL_CLIENT_SECRET);
    curl_setopt($ch, CURLOPT_POSTFIELDS, 'grant_type=client_credentials');
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    if (defined('DEBUG_MODE') && DEBUG_MODE) {
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
    }
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    
    log_paypal_debug('paypal_auth_attempt', [
        'api_base' => $api_base,
        'mode' => PAYPAL_MODE,
        'client_id_prefix' => substr(PAYPAL_CLIENT_ID, 0, 10) . '...',
        'code' => $code,
        'error' => $err,
        'response_length' => strlen($response ?: '')
    ]);
    
    if ($response === false) {
        log_paypal_debug('paypal_auth_curl_failed', ['error' => $err]);
        json_error('PayPal auth request failed: ' . $err, 502);
    }
    if ($code !== 200) {
        $detail = json_decode($response, true)['error_description'] ?? $response;
        log_paypal_debug('paypal_auth_http_error', ['code' => $code, 'detail' => $detail]);
        json_error('PayPal auth failed: ' . $detail, 502);
    }
    $data = json_decode($response, true) ?: [];
    if (empty($data['access_token'])) {
        json_error('PayPal auth failed: missing access token', 502);
    }
    return $data['access_token'];
}

function paypal_request(string $method, string $path, ?array $payload = null): array {
    $token = paypal_access_token();
    $url = paypal_api_base() . $path;
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, strtoupper($method));
    $headers = [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $token
    ];
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    if ($payload !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    }
    if (defined('DEBUG_MODE') && DEBUG_MODE) {
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
    }
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    log_paypal_debug('paypal_request', [
        'method' => strtoupper($method),
        'path' => $path,
        'code' => $code,
        'error' => $err,
        'response' => $response
    ]);
    return [
        'code' => $code,
        'data' => json_decode($response, true) ?: [],
        'raw' => $response,
        'error' => $err
    ];
}

function paypal_plan_store_path(): string {
    return __DIR__ . '/../storage/paypal_plans.json';
}

function load_paypal_plan_store(): array {
    $path = paypal_plan_store_path();
    if (!file_exists($path)) {
        return [];
    }
    $raw = file_get_contents($path);
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function save_paypal_plan_store(array $data): void {
    $path = paypal_plan_store_path();
    $dir = dirname($path);
    if (!file_exists($dir)) {
        mkdir($dir, 0777, true);
    }
    file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function plan_config(string $tier): array {
    $limits = plan_limits($tier);
    $plan_id = match ($tier) {
        'starter' => PAYPAL_PLAN_STARTER_ID,
        'growth' => PAYPAL_PLAN_GROWTH_ID,
        'pro' => PAYPAL_PLAN_PRO_ID,
        'agency' => PAYPAL_PLAN_AGENCY_ID,
        default => PAYPAL_PLAN_STARTER_ID
    };
    $price = match ($tier) {
        'starter' => PLAN_STARTER_PRICE_ILS,
        'growth' => PLAN_GROWTH_PRICE_ILS,
        'pro' => PLAN_PRO_PRICE_ILS,
        'agency' => PLAN_AGENCY_PRICE_ILS,
        default => PLAN_STARTER_PRICE_ILS
    };
    return [
        'plan_id' => $plan_id,
        'plan_tier' => $tier,
        'price' => $price,
        'text' => $limits['text'],
        'image' => $limits['image'],
        'video' => $limits['video'],
        'landing' => $limits['landing']
    ];
}

function resolve_plan_id(string $tier): ?string {
    $store = load_paypal_plan_store();
    if (!empty($store['plans'][$tier])) {
        return $store['plans'][$tier];
    }
    $plan = plan_config($tier);
    if (!empty($plan['plan_id']) && !str_starts_with($plan['plan_id'], 'YOUR_PAYPAL')) {
        return $plan['plan_id'];
    }
    return null;
}

function resolve_tier_from_plan_id(string $plan_id, array $store): string {
    foreach ($store as $group) {
        if (!is_array($group)) {
            continue;
        }
        foreach ($group as $tier => $stored_id) {
            if ($stored_id === $plan_id) {
                return $tier;
            }
        }
    }
    return match ($plan_id) {
        PAYPAL_PLAN_STARTER_ID => 'starter',
        PAYPAL_PLAN_GROWTH_ID => 'growth',
        PAYPAL_PLAN_PRO_ID => 'pro',
        PAYPAL_PLAN_AGENCY_ID => 'agency',
        default => 'starter'
    };
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
}

function fetch_referral_discount(PDO $db, int $user_id): array {
    ensure_referral_tables($db);
    $stmt = $db->prepare("
        SELECT id
        FROM web_referrals
        WHERE referred_user_id = ? AND discount_applied = 0
        LIMIT 1
    ");
    $stmt->execute([$user_id]);
    $row = $stmt->fetch();
    if (!$row) {
        return [0, null];
    }
    return [10, (int)$row['id']];
}

function mark_referral_discount_applied(PDO $db, int $referral_id): void {
    $stmt = $db->prepare("UPDATE web_referrals SET discount_applied = 1 WHERE id = ?");
    $stmt->execute([$referral_id]);
}

function attach_referral_code(PDO $db, int $user_id, string $referral_code): void {
    $code = strtoupper(trim($referral_code));
    if ($code === '') {
        return;
    }
    ensure_referral_tables($db);
    $stmt = $db->prepare("SELECT id FROM web_referrals WHERE referred_user_id = ? LIMIT 1");
    $stmt->execute([$user_id]);
    if ($stmt->fetch()) {
        json_error('Referral code already applied.');
    }
    $stmt = $db->prepare("SELECT user_id FROM web_referral_codes WHERE code = ?");
    $stmt->execute([$code]);
    $row = $stmt->fetch();
    if (!$row) {
        json_error('Invalid referral code.');
    }
    $referrer_id = (int)$row['user_id'];
    if ($referrer_id === $user_id) {
        json_error('Referral code cannot be your own.');
    }
    $stmt = $db->prepare("
        INSERT INTO web_referrals (referrer_user_id, referred_user_id, code, status, discount_applied)
        VALUES (?, ?, ?, 'pending', 0)
    ");
    $stmt->execute([$referrer_id, $user_id, $code]);
}

function paypal_get_or_create_product(): string {
    $store = load_paypal_plan_store();
    if (!empty($store['product_id'])) {
        return $store['product_id'];
    }
    $payload = [
        'name' => 'Adly Subscription',
        'type' => 'SERVICE',
        'category' => 'SOFTWARE',
        'description' => 'Adly subscription plans'
    ];
    $result = paypal_request('POST', '/v1/catalogs/products', $payload);
    if ($result['code'] < 200 || $result['code'] >= 300) {
        $detail = $result['data']['message'] ?? $result['error'] ?? $result['raw'];
        json_error('PayPal product creation failed: ' . $detail, 502);
    }
    $product_id = $result['data']['id'] ?? '';
    if (!$product_id) {
        json_error('PayPal product creation failed: missing product id', 502);
    }
    $store['product_id'] = $product_id;
    save_paypal_plan_store($store);
    return $product_id;
}

function ensure_paypal_plans_exist(int $trial_days, bool $allow_create, string $store_key = 'plans', int $discount_percent = 0): array {
    $store = load_paypal_plan_store();
    $store[$store_key] = $store[$store_key] ?? [];
    $tiers = ['starter', 'growth', 'pro', 'agency'];
    $missing = array_filter($tiers, fn($tier) => empty($store[$store_key][$tier]));
    if (!$missing) {
        return $store;
    }
    if (!$allow_create) {
        json_error('PayPal plan IDs not configured');
    }
    $currency = 'ILS';
    $product_id = paypal_get_or_create_product();
    foreach ($missing as $tier) {
        $plan = plan_config($tier);
        $billing_cycles = [];
        $sequence = 1;
        if ($trial_days > 0) {
            $billing_cycles[] = [
                'frequency' => [
                    'interval_unit' => 'DAY',
                    'interval_count' => $trial_days
                ],
                'tenure_type' => 'TRIAL',
                'sequence' => $sequence,
                'total_cycles' => 1,
                'pricing_scheme' => [
                    'fixed_price' => [
                        'value' => '0',
                        'currency_code' => $currency
                    ]
                ]
            ];
            $sequence += 1;
        }
        if ($discount_percent > 0) {
            $discounted = round($plan['price'] * (1 - ($discount_percent / 100)), 2);
            $billing_cycles[] = [
                'frequency' => [
                    'interval_unit' => 'MONTH',
                    'interval_count' => 1
                ],
                'tenure_type' => 'REGULAR',
                'sequence' => $sequence,
                'total_cycles' => 1,
                'pricing_scheme' => [
                    'fixed_price' => [
                        'value' => number_format($discounted, 2, '.', ''),
                        'currency_code' => $currency
                    ]
                ]
            ];
            $sequence += 1;
        }
        $billing_cycles[] = [
            'frequency' => [
                'interval_unit' => 'MONTH',
                'interval_count' => 1
            ],
            'tenure_type' => 'REGULAR',
            'sequence' => $sequence,
            'total_cycles' => 0,
            'pricing_scheme' => [
                'fixed_price' => [
                    'value' => (string)$plan['price'],
                    'currency_code' => $currency
                ]
            ]
        ];
        $payload = [
            'product_id' => $product_id,
            'name' => ucfirst($tier) . ' plan',
            'description' => 'Adly ' . ucfirst($tier) . ' subscription',
            'billing_cycles' => $billing_cycles,
            'payment_preferences' => [
                'auto_bill_outstanding' => true,
                'setup_fee_failure_action' => 'CONTINUE',
                'payment_failure_threshold' => 2
            ],
            'taxes' => [
                'percentage' => '0',
                'inclusive' => false
            ]
        ];
        $result = paypal_request('POST', '/v1/billing/plans', $payload);
        if ($result['code'] < 200 || $result['code'] >= 300) {
            $detail = $result['data']['message'] ?? $result['error'] ?? $result['raw'];
            json_error('PayPal plan creation failed: ' . $detail, 502);
        }
        $plan_id = $result['data']['id'] ?? '';
        if (!$plan_id) {
            json_error('PayPal plan creation failed: missing plan id', 502);
        }
        $store[$store_key][$tier] = $plan_id;
    }
    $store['product_id'] = $store['product_id'] ?? $product_id;
    save_paypal_plan_store($store);
    return $store;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed', 405);
}

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';
log_paypal_debug('request:action', [
    'action' => $action,
    'tier' => $input['tier'] ?? null,
    'trial_days' => $input['trial_days'] ?? null
]);

if ($action === 'create_plans') {
    if ($user_role !== 'admin' && !(defined('DEBUG_MODE') && DEBUG_MODE) && !(defined('PAYPAL_AUTO_CREATE_PLANS') && PAYPAL_AUTO_CREATE_PLANS)) {
        json_error('Unauthorized', 401);
    }
    $trial_days = max(0, (int)($input['trial_days'] ?? PLAN_TRIAL_DAYS));
    $store = ensure_paypal_plans_exist($trial_days, true);
    json_response([
        'status' => 'created',
        'product_id' => $store['product_id'] ?? null,
        'plans' => $store['plans']
    ]);
}

if ($action === 'create_subscription') {
    $tier = $input['tier'] ?? 'starter';
    if (!in_array($tier, ['starter', 'growth', 'pro', 'agency'], true)) {
        json_error('Invalid plan tier.');
    }
    attach_referral_code($db, $user_id, (string)($input['referral_code'] ?? ''));
    $trial_days = max(0, (int)($input['trial_days'] ?? 0));
    $plan = plan_config($tier);
    $allow_create = (defined('PAYPAL_AUTO_CREATE_PLANS') && PAYPAL_AUTO_CREATE_PLANS)
        || $user_role === 'admin'
        || (defined('DEBUG_MODE') && DEBUG_MODE);
    [$discount_percent, $discount_referral_id] = fetch_referral_discount($db, $user_id);
    $store_key = $discount_percent > 0 ? "plans_discount_{$discount_percent}_trial_{$trial_days}" : 'plans';
    $store = $allow_create
        ? ensure_paypal_plans_exist($trial_days, true, $store_key, $discount_percent)
        : load_paypal_plan_store();
    $plan_id = $store[$store_key][$tier] ?? null;
    if (!$plan_id) {
        $discount_percent = 0;
        $discount_referral_id = null;
        $store_key = 'plans';
        $store = $allow_create ? ensure_paypal_plans_exist($trial_days, true, $store_key) : $store;
        $plan_id = $store[$store_key][$tier] ?? resolve_plan_id($tier);
    }
    if (!$plan_id) {
        json_error('PayPal plan IDs not configured');
    }
    $payload = [
        'plan_id' => $plan_id,
        'application_context' => [
            'brand_name' => 'Adly',
            'locale' => 'en-US',
            'user_action' => 'SUBSCRIBE_NOW',
            'return_url' => BASE_URL . '/ui/profile.html?payment=success',
            'cancel_url' => BASE_URL . '/ui/profile.html?payment=cancel'
        ]
    ];
    if ($trial_days > 0) {
        $payload['start_time'] = gmdate('Y-m-d\TH:i:s\Z', strtotime('+' . $trial_days . ' days'));
    }
    log_paypal_debug('create_subscription:start', [
        'tier' => $tier,
        'trial_days' => $trial_days,
        'plan_id' => $plan_id,
        'discount_percent' => $discount_percent,
        'user_id' => $user_id
    ]);
    $result = paypal_request('POST', '/v1/billing/subscriptions', $payload);
    if (
        $allow_create
        && $result['code'] >= 400
        && (($result['data']['name'] ?? '') === 'RESOURCE_NOT_FOUND'
            || (($result['data']['details'][0]['issue'] ?? '') === 'INVALID_RESOURCE_ID'))
    ) {
        $store = ensure_paypal_plans_exist($trial_days, true);
        $plan_id = $store['plans'][$tier] ?? null;
        if ($plan_id) {
            $payload['plan_id'] = $plan_id;
            $result = paypal_request('POST', '/v1/billing/subscriptions', $payload);
        }
    }
    log_paypal_debug('create_subscription:result', [
        'code' => $result['code'],
        'name' => $result['data']['name'] ?? null,
        'message' => $result['data']['message'] ?? null,
        'links' => isset($result['data']['links']) ? count($result['data']['links']) : 0
    ]);
    if ($result['code'] < 200 || $result['code'] >= 300) {
        $detail = $result['data']['message'] ?? $result['error'] ?? $result['raw'];
        json_error('PayPal subscription failed: ' . $detail, 502);
    }
    $approve = null;
    foreach ($result['data']['links'] ?? [] as $link) {
        $rel = $link['rel'] ?? '';
        if ($rel === 'approve' || $rel === 'payer-action') {
            $approve = $link['href'] ?? null;
            break;
        }
    }
    if (!$approve) {
        $detail = $result['data']['message'] ?? $result['error'] ?? $result['raw'];
        json_response([
            'error' => 'PayPal approval URL missing',
            'details' => $detail,
            'raw' => $result['raw']
        ], 502);
    }
    if ($discount_referral_id && $discount_percent > 0) {
        mark_referral_discount_applied($db, $discount_referral_id);
    }
    json_response([
        'status' => 'created',
        'approval_url' => $approve,
        'subscription_id' => $result['data']['id'] ?? null,
        'tier' => $plan['plan_tier']
    ]);
}

if ($action === 'complete') {
    $subscription_id = trim($input['subscription_id'] ?? '');
    if ($subscription_id === '') {
        json_error('subscription_id required');
    }
    $result = paypal_request('GET', '/v1/billing/subscriptions/' . urlencode($subscription_id));
    if ($result['code'] < 200 || $result['code'] >= 300) {
        json_error('Failed to fetch subscription');
    }
    $plan_id = $result['data']['plan_id'] ?? '';
    $store = load_paypal_plan_store();
    $tier = resolve_tier_from_plan_id($plan_id, $store);
    $plan = plan_config($tier);
    $total = $plan['text'] + $plan['image'] + $plan['video'] + $plan['landing'];
    $trial_credits = [
        'text' => PLAN_TRIAL_TEXT_CREDITS,
        'image' => PLAN_TRIAL_IMAGE_CREDITS,
        'video' => PLAN_TRIAL_VIDEO_CREDITS,
        'landing' => PLAN_TRIAL_LANDING_CREDITS
    ];
    $trial_total = array_sum($trial_credits);
    $trial_days = max(0, (int)($input['trial_days'] ?? PLAN_TRIAL_DAYS));
    $trial_end_at = $trial_days > 0 ? date('Y-m-d H:i:s', strtotime('+' . $trial_days . ' days')) : null;
    $stmt = $db->prepare("
        UPDATE web_users
        SET plan_tier = ?,
            subscription_status = ?,
            subscription_started_at = NOW(),
            plan_end_at = ?,
            trial_end_at = ?,
            credits_remaining = ?,
            text_credits_remaining = ?,
            image_credits_remaining = ?,
            video_credits_remaining = ?,
            landing_credits_remaining = ?,
            credits_reset_at = ?,
            paypal_subscription_id = ?,
            payment_provider = 'paypal',
            updated_at = NOW()
        WHERE id = ?
    ");
    $is_trial = $trial_days > 0;
    $status = $is_trial ? 'trial' : 'active';
    $plan_end_at = $is_trial ? null : date('Y-m-d H:i:s', strtotime('+30 days'));
    $credits_remaining = $is_trial ? $trial_total : $total;
    $text_credits = $is_trial ? $trial_credits['text'] : $plan['text'];
    $image_credits = $is_trial ? $trial_credits['image'] : $plan['image'];
    $video_credits = $is_trial ? $trial_credits['video'] : $plan['video'];
    $landing_credits = $is_trial ? $trial_credits['landing'] : $plan['landing'];
    $credits_reset_at = $is_trial ? $trial_end_at : date('Y-m-d H:i:s', strtotime('+30 days'));
    $stmt->execute([
        $plan['plan_tier'],
        $status,
        $plan_end_at,
        $trial_end_at,
        $credits_remaining,
        $text_credits,
        $image_credits,
        $video_credits,
        $landing_credits,
        $credits_reset_at,
        $subscription_id,
        $user_id
    ]);
    $_SESSION['web_user_plan_tier'] = $plan['plan_tier'];
    $_SESSION['web_user_subscription_status'] = $status;
    $_SESSION['web_user_trial_end_at'] = $trial_end_at;
    $_SESSION['web_user_plan_end_at'] = $plan_end_at;
    $_SESSION['web_user_credits_remaining'] = $credits_remaining;
    $_SESSION['web_user_text_credits'] = $text_credits;
    $_SESSION['web_user_image_credits'] = $image_credits;
    $_SESSION['web_user_video_credits'] = $video_credits;
    $_SESSION['web_user_landing_credits'] = $landing_credits;
    $_SESSION['web_user_credits_reset_at'] = $credits_reset_at;
    $_SESSION['web_user_payment_provider'] = 'paypal';

    if (!$is_trial) {
        $db->prepare("
            INSERT INTO web_payments (web_user_id, provider, amount, currency, status, reference, created_at)
            VALUES (?, 'paypal', ?, 'ILS', 'success', ?, NOW())
        ")->execute([$user_id, $plan['price'], $subscription_id]);
    }
    json_response(['status' => $status]);
}

if ($action === 'cancel_subscription') {
    $stmt = $db->prepare("SELECT paypal_subscription_id FROM web_users WHERE id = ?");
    $stmt->execute([$user_id]);
    $row = $stmt->fetch();
    $sub_id = $row['paypal_subscription_id'] ?? '';
    if ($sub_id) {
        paypal_request('POST', '/v1/billing/subscriptions/' . urlencode($sub_id) . '/cancel', [
            'reason' => 'User requested cancellation'
        ]);
    }
    $db->prepare("
        UPDATE web_users
        SET subscription_status = 'canceled',
            plan_end_at = NOW(),
            updated_at = NOW()
        WHERE id = ?
    ")->execute([$user_id]);
    $_SESSION['web_user_subscription_status'] = 'canceled';
    $_SESSION['web_user_plan_end_at'] = date('Y-m-d H:i:s');
    json_response(['status' => 'canceled']);
}

if ($action === 'start_paid_now') {
    $tier = $input['tier'] ?? 'starter';
    if (!in_array($tier, ['starter', 'growth', 'pro', 'agency'], true)) {
        json_error('Invalid plan tier.');
    }
    attach_referral_code($db, $user_id, (string)($input['referral_code'] ?? ''));
    $trial_days = 0;
    $allow_create = (defined('PAYPAL_AUTO_CREATE_PLANS') && PAYPAL_AUTO_CREATE_PLANS)
        || $user_role === 'admin'
        || (defined('DEBUG_MODE') && DEBUG_MODE);
    [$discount_percent, $discount_referral_id] = fetch_referral_discount($db, $user_id);
    $store_key = $discount_percent > 0 ? "paid_plans_discount_{$discount_percent}" : 'paid_plans';
    $store = $allow_create
        ? ensure_paypal_plans_exist($trial_days, true, $store_key, $discount_percent)
        : load_paypal_plan_store();
    $plan_id = $store[$store_key][$tier] ?? null;
    if (!$plan_id) {
        $discount_percent = 0;
        $discount_referral_id = null;
        $store_key = 'paid_plans';
        $store = $allow_create ? ensure_paypal_plans_exist($trial_days, true, $store_key) : $store;
        $plan_id = $store[$store_key][$tier] ?? resolve_plan_id($tier);
    }
    if (!$plan_id) {
        json_error('PayPal plan IDs not configured');
    }
    // Cancel current subscription if present (trial or active).
    $stmt = $db->prepare("SELECT paypal_subscription_id FROM web_users WHERE id = ?");
    $stmt->execute([$user_id]);
    $row = $stmt->fetch();
    $sub_id = $row['paypal_subscription_id'] ?? '';
    if ($sub_id) {
        paypal_request('POST', '/v1/billing/subscriptions/' . urlencode($sub_id) . '/cancel', [
            'reason' => 'User requested immediate paid plan'
        ]);
    }
    $payload = [
        'plan_id' => $plan_id,
        'application_context' => [
            'brand_name' => 'Adly',
            'locale' => 'en-US',
            'user_action' => 'SUBSCRIBE_NOW',
            'return_url' => BASE_URL . '/ui/profile.html?payment=success&paid_now=1',
            'cancel_url' => BASE_URL . '/ui/profile.html?payment=cancel'
        ]
    ];
    $result = paypal_request('POST', '/v1/billing/subscriptions', $payload);
    if ($result['code'] < 200 || $result['code'] >= 300) {
        $detail = $result['data']['message'] ?? $result['error'] ?? $result['raw'];
        json_error('PayPal subscription failed: ' . $detail, 502);
    }
    $approve = null;
    foreach ($result['data']['links'] ?? [] as $link) {
        $rel = $link['rel'] ?? '';
        if ($rel === 'approve' || $rel === 'payer-action') {
            $approve = $link['href'] ?? null;
            break;
        }
    }
    if (!$approve) {
        $detail = $result['data']['message'] ?? $result['error'] ?? $result['raw'];
        json_response([
            'error' => 'PayPal approval URL missing',
            'details' => $detail,
            'raw' => $result['raw']
        ], 502);
    }
    if ($discount_referral_id && $discount_percent > 0) {
        mark_referral_discount_applied($db, $discount_referral_id);
    }
    json_response([
        'status' => 'created',
        'approval_url' => $approve,
        'subscription_id' => $result['data']['id'] ?? null,
        'tier' => $tier
    ]);
}

if ($action === 'apply_retention_offer') {
    $stmt = $db->prepare("SELECT paypal_subscription_id, plan_tier FROM web_users WHERE id = ?");
    $stmt->execute([$user_id]);
    $row = $stmt->fetch();
    $subscription_id = $row['paypal_subscription_id'] ?? '';
    $tier = $row['plan_tier'] ?? 'starter';
    if ($subscription_id === '') {
        json_error('No active PayPal subscription found', 400);
    }
    if (!in_array($tier, ['starter', 'growth', 'pro', 'agency'], true)) {
        $tier = 'starter';
    }
    $discount_percent = 20;
    $store_key = "retention_plans_discount_{$discount_percent}";
    $allow_create = (defined('PAYPAL_AUTO_CREATE_PLANS') && PAYPAL_AUTO_CREATE_PLANS)
        || $user_role === 'admin'
        || (defined('DEBUG_MODE') && DEBUG_MODE);
    $store = $allow_create
        ? ensure_paypal_plans_exist(0, true, $store_key, $discount_percent)
        : load_paypal_plan_store();
    $plan_id = $store[$store_key][$tier] ?? null;
    if (!$plan_id) {
        json_error('Retention plan not configured', 500);
    }
    $result = paypal_request('POST', '/v1/billing/subscriptions/' . urlencode($subscription_id) . '/revise', [
        'plan_id' => $plan_id
    ]);
    if ($result['code'] < 200 || $result['code'] >= 300) {
        $detail = $result['data']['message'] ?? $result['error'] ?? $result['raw'];
        json_error('PayPal plan update failed: ' . $detail, 502);
    }
    json_response(['status' => 'ok']);
}

json_error('Invalid action', 400);
?>
