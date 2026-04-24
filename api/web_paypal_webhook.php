<?php
require_once '../config.php';

$db = get_db();

function paypal_api_base(): string {
    return PAYPAL_MODE === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';
}

function paypal_access_token(): string {
    $ch = curl_init(paypal_api_base() . '/v1/oauth2/token');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_USERPWD, PAYPAL_CLIENT_ID . ':' . PAYPAL_CLIENT_SECRET);
    curl_setopt($ch, CURLOPT_POSTFIELDS, 'grant_type=client_credentials');
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($code !== 200) {
        return '';
    }
    $data = json_decode($response, true) ?: [];
    return $data['access_token'] ?? '';
}

function paypal_request(string $method, string $path, ?array $payload = null): array {
    $token = paypal_access_token();
    if ($token === '') {
        return ['code' => 0, 'data' => [], 'raw' => ''];
    }
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
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return [
        'code' => $code,
        'data' => json_decode($response, true) ?: [],
        'raw' => $response
    ];
}

function load_paypal_plan_store(): array {
    $path = __DIR__ . '/../storage/paypal_plans.json';
    if (!file_exists($path)) {
        return [];
    }
    $raw = file_get_contents($path);
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function header_value(string $name): ?string {
    foreach (getallheaders() as $key => $value) {
        if (strcasecmp($key, $name) === 0) {
            return $value;
        }
    }
    return null;
}

function plan_from_paypal_id(string $plan_id): string {
    $store = load_paypal_plan_store();
    if (is_array($store)) {
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
    }
    return match ($plan_id) {
        PAYPAL_PLAN_STARTER_ID => 'starter',
        PAYPAL_PLAN_GROWTH_ID => 'growth',
        PAYPAL_PLAN_PRO_ID => 'pro',
        PAYPAL_PLAN_AGENCY_ID => 'agency',
        default => 'starter'
    };
}

function plan_price_ils(string $tier): float {
    return match ($tier) {
        'growth' => PLAN_GROWTH_PRICE_ILS,
        'pro' => PLAN_PRO_PRICE_ILS,
        'agency' => PLAN_AGENCY_PRICE_ILS,
        default => PLAN_STARTER_PRICE_ILS
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

function apply_referral_rewards(PDO $db, int $referred_user_id): void {
    ensure_referral_tables($db);
    $stmt = $db->prepare("
        SELECT id, referrer_user_id, status
        FROM web_referrals
        WHERE referred_user_id = ?
        LIMIT 1
    ");
    $stmt->execute([$referred_user_id]);
    $referral = $stmt->fetch();
    if (!$referral || ($referral['status'] ?? '') === 'rewarded') {
        return;
    }
    $referrer_id = (int)$referral['referrer_user_id'];
    $credits = [
        'text' => 20,
        'image' => 20,
        'video' => 5
    ];
    $stmt = $db->prepare("
        UPDATE web_users
        SET text_credits_remaining = text_credits_remaining + ?,
            image_credits_remaining = image_credits_remaining + ?,
            video_credits_remaining = video_credits_remaining + ?,
            credits_remaining = credits_remaining + ?,
            updated_at = NOW()
        WHERE id = ?
    ");
    $total_add = $credits['text'] + $credits['image'] + $credits['video'];
    $stmt->execute([
        $credits['text'],
        $credits['image'],
        $credits['video'],
        $total_add,
        $referrer_id
    ]);
    $stmt = $db->prepare("
        UPDATE web_referrals
        SET status = 'rewarded',
            rewarded_at = NOW()
        WHERE id = ?
    ");
    $stmt->execute([(int)$referral['id']]);
}

function extract_subscription_id(array $event): string {
    $resource = $event['resource'] ?? [];
    $paths = [
        $resource['id'] ?? null,
        $resource['subscription_id'] ?? null,
        $resource['billing_agreement_id'] ?? null,
        $resource['agreement_id'] ?? null
    ];
    foreach ($paths as $value) {
        if (!empty($value)) {
            return (string)$value;
        }
    }
    $related = $resource['supplementary_data']['related_ids']['billing_agreement_id'] ?? null;
    return $related ? (string)$related : '';
}

function resolve_next_billing(array $subscription): string {
    $next = $subscription['billing_info']['next_billing_time'] ?? '';
    if ($next) {
        return date('Y-m-d H:i:s', strtotime($next));
    }
    return date('Y-m-d H:i:s', strtotime('+30 days'));
}

function apply_active_plan(PDO $db, int $user_id, string $tier, string $subscription_id, string $plan_end_at): void {
    $limits = plan_limits($tier);
    $total = $limits['text'] + $limits['image'] + $limits['video'] + $limits['landing'];
    $stmt = $db->prepare("
        UPDATE web_users
        SET plan_tier = ?,
            subscription_status = 'active',
            subscription_started_at = IFNULL(subscription_started_at, NOW()),
            plan_end_at = ?,
            trial_end_at = NULL,
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
    $stmt->execute([
        $tier,
        $plan_end_at,
        $total,
        $limits['text'],
        $limits['image'],
        $limits['video'],
        $limits['landing'],
        $plan_end_at,
        $subscription_id,
        $user_id
    ]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$raw = file_get_contents('php://input');
$event = json_decode($raw, true);
if (!$event) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid payload']);
    exit;
}

$bypass = false;
if (defined('DEBUG_MODE') && DEBUG_MODE) {
    $bypass = header_value('X-Adly-Bypass-Verify') === '1';
}

if (!$bypass) {
    if (!PAYPAL_WEBHOOK_ID || str_starts_with(PAYPAL_WEBHOOK_ID, 'YOUR_PAYPAL')) {
        http_response_code(500);
        echo json_encode(['error' => 'Webhook ID not configured']);
        exit;
    }
    $verifyPayload = [
        'auth_algo' => header_value('PayPal-Auth-Algo'),
        'cert_url' => header_value('PayPal-Cert-Url'),
        'transmission_id' => header_value('PayPal-Transmission-Id'),
        'transmission_sig' => header_value('PayPal-Transmission-Sig'),
        'transmission_time' => header_value('PayPal-Transmission-Time'),
        'webhook_id' => PAYPAL_WEBHOOK_ID,
        'webhook_event' => $event
    ];
    $verify = paypal_request('POST', '/v1/notifications/verify-webhook-signature', $verifyPayload);
    if (($verify['data']['verification_status'] ?? '') !== 'SUCCESS') {
        http_response_code(400);
        echo json_encode(['error' => 'Webhook verification failed']);
        exit;
    }
}

$event_type = $event['event_type'] ?? '';
$subscription_id = extract_subscription_id($event);
if ($subscription_id === '') {
    http_response_code(200);
    echo json_encode(['status' => 'ignored']);
    exit;
}

$stmt = $db->prepare("SELECT id FROM web_users WHERE paypal_subscription_id = ? LIMIT 1");
$stmt->execute([$subscription_id]);
$user = $stmt->fetch();
if (!$user) {
    http_response_code(200);
    echo json_encode(['status' => 'ignored']);
    exit;
}

$subscription = paypal_request('GET', '/v1/billing/subscriptions/' . urlencode($subscription_id));
$subscription_data = $subscription['data'] ?? [];
$plan_id = $subscription_data['plan_id'] ?? '';
$tier = plan_from_paypal_id($plan_id);
$plan_end_at = resolve_next_billing($subscription_data);

switch ($event_type) {
    case 'BILLING.SUBSCRIPTION.ACTIVATED':
    case 'BILLING.SUBSCRIPTION.RE-ACTIVATED':
        apply_active_plan($db, (int)$user['id'], $tier, $subscription_id, $plan_end_at);
        break;
    case 'BILLING.SUBSCRIPTION.UPDATED':
        $status = strtoupper($subscription_data['status'] ?? '');
        if ($status === 'ACTIVE') {
            apply_active_plan($db, (int)$user['id'], $tier, $subscription_id, $plan_end_at);
        } elseif (in_array($status, ['SUSPENDED', 'CANCELLED', 'EXPIRED'], true)) {
            $db->prepare("
                UPDATE web_users
                SET subscription_status = ?,
                    plan_end_at = NOW(),
                    updated_at = NOW()
                WHERE id = ?
            ")->execute([
                $status === 'SUSPENDED' ? 'past_due' : strtolower($status),
                (int)$user['id']
            ]);
        }
        break;
    case 'BILLING.SUBSCRIPTION.CANCELLED':
        $db->prepare("
            UPDATE web_users
            SET subscription_status = 'canceled',
                plan_end_at = NOW(),
                updated_at = NOW()
            WHERE id = ?
        ")->execute([(int)$user['id']]);
        break;
    case 'BILLING.SUBSCRIPTION.SUSPENDED':
        $db->prepare("
            UPDATE web_users
            SET subscription_status = 'past_due',
                plan_end_at = NOW(),
                updated_at = NOW()
            WHERE id = ?
        ")->execute([(int)$user['id']]);
        break;
    case 'BILLING.SUBSCRIPTION.EXPIRED':
        $db->prepare("
            UPDATE web_users
            SET subscription_status = 'expired',
                plan_end_at = NOW(),
                updated_at = NOW()
            WHERE id = ?
        ")->execute([(int)$user['id']]);
        break;
    case 'PAYMENT.SALE.COMPLETED':
        apply_active_plan($db, (int)$user['id'], $tier, $subscription_id, $plan_end_at);
        apply_referral_rewards($db, (int)$user['id']);
        $db->prepare("
            INSERT INTO web_payments (web_user_id, provider, amount, currency, status, reference, created_at)
            VALUES (?, 'paypal', ?, 'ILS', 'success', ?, NOW())
        ")->execute([(int)$user['id'], plan_price_ils($tier), $subscription_id]);
        break;
    case 'PAYMENT.SALE.DENIED':
        $db->prepare("
            UPDATE web_users
            SET subscription_status = 'past_due',
                plan_end_at = NOW(),
                updated_at = NOW()
            WHERE id = ?
        ")->execute([(int)$user['id']]);
        $db->prepare("
            INSERT INTO web_payments (web_user_id, provider, amount, currency, status, reference, created_at)
            VALUES (?, 'paypal', ?, 'ILS', 'failed', ?, NOW())
        ")->execute([(int)$user['id'], plan_price_ils($tier), $subscription_id]);
        break;
}

http_response_code(200);
echo json_encode(['status' => 'ok']);
