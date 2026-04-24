<?php
require_once '../config.php';

session_start();

if (!isset($_SESSION['web_user_id'])) {
    json_error('Unauthorized', 401);
}

$db = get_db();
$user_id = (int)$_SESSION['web_user_id'];

function sumit_post(string $path, array $payload): array {
    $url = rtrim(SUMIT_API_BASE, '/') . $path;
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return [
        'code' => $code,
        'data' => json_decode($response, true) ?: [],
        'raw' => $response
    ];
}

function plan_details(string $tier): array {
    $tier = in_array($tier, ['starter', 'growth', 'pro', 'agency'], true) ? $tier : 'starter';
    $price_map = [
        'starter' => PLAN_STARTER_PRICE_ILS,
        'growth' => PLAN_GROWTH_PRICE_ILS,
        'pro' => PLAN_PRO_PRICE_ILS,
        'agency' => PLAN_AGENCY_PRICE_ILS
    ];
    $price = $price_map[$tier] ?? PLAN_STARTER_PRICE_ILS;
    $limits = plan_limits($tier);
    return [
        'tier' => $tier,
        'price' => $price,
        'text' => $limits['text'],
        'image' => $limits['image'],
        'video' => $limits['video'],
        'landing' => $limits['landing']
    ];
}

function find_value_recursive($data, string $key) {
    if (is_array($data)) {
        foreach ($data as $k => $v) {
            if ($k === $key) {
                return $v;
            }
            $found = find_value_recursive($v, $key);
            if ($found !== null) {
                return $found;
            }
        }
    }
    return null;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed', 405);
}

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';

if ($action === 'create_subscription') {
    $tier = $input['tier'] ?? 'starter';
    $plan = plan_details($tier);
    $name = trim($input['name'] ?? '');
    $email = trim($input['email'] ?? '');
    $phone = trim($input['phone'] ?? '');
    $token = trim($input['single_use_token'] ?? '');
    $card_number = trim($input['card_number'] ?? '');
    $exp_month = (int)($input['exp_month'] ?? 0);
    $exp_year = (int)($input['exp_year'] ?? 0);
    $cvv = trim($input['cvv'] ?? '');
    $citizen_id = trim($input['citizen_id'] ?? '');

    if ($name === '') {
        json_error('Name required');
    }
    if ($token === '' && $card_number === '') {
        json_error('Card token or card details required');
    }

    $trial_days = max(0, (int)($input['trial_days'] ?? 0));
    $payload = [
        'Customer' => [
            'ExternalIdentifier' => 'web_user_' . $user_id,
            'SearchMode' => 0,
            'Name' => $name,
            'Phone' => $phone !== '' ? $phone : null,
            'EmailAddress' => $email !== '' ? $email : null
        ],
        'PaymentMethod' => $token !== '' ? null : [
            'CreditCard_Number' => $card_number,
            'CreditCard_ExpirationMonth' => $exp_month,
            'CreditCard_ExpirationYear' => $exp_year,
            'CreditCard_CVV' => $cvv,
            'CreditCard_CitizenID' => $citizen_id,
            'Type' => 1
        ],
        'SingleUseToken' => $token !== '' ? $token : null,
        'Items' => [
            [
                'Item' => [
                    'Duration_Months' => 1,
                    'Name' => 'Adly ' . ucfirst($plan['tier']) . ' Plan'
                ],
                'Quantity' => 1,
                'UnitPrice' => $plan['price'],
                'Recurrence' => 12
            ]
        ],
        'VATIncluded' => true,
        'Credentials' => [
            'CompanyID' => SUMIT_COMPANY_ID,
            'APIKey' => SUMIT_PRIVATE_KEY
        ]
    ];

    $result = sumit_post('/billing/recurring/charge/', $payload);
    $status = $result['data']['Status'] ?? null;
    if (!($status === 0 || $status === 'Success' || (is_string($status) && str_contains($status, 'Success')))) {
        $error = $result['data']['UserErrorMessage'] ?? 'Payment failed';
        json_error($error, 400);
    }

    $recurring_id = find_value_recursive($result['data'], 'RecurringCustomerItemID');
    $customer_id = find_value_recursive($result['data'], 'CustomerID');
    $last4 = $card_number !== '' ? substr($card_number, -4) : null;

    $stmt = $db->prepare("
        UPDATE web_users
        SET plan_tier = ?,
            subscription_status = 'active',
            subscription_started_at = NOW(),
            plan_end_at = DATE_ADD(NOW(), INTERVAL 30 DAY),
            credits_remaining = ?,
            text_credits_remaining = ?,
            image_credits_remaining = ?,
            video_credits_remaining = ?,
            landing_credits_remaining = ?,
            credits_reset_at = DATE_ADD(NOW(), INTERVAL 30 DAY),
            payment_provider = 'sumit',
            sumit_customer_id = ?,
            sumit_recurring_id = ?,
            payment_last4 = ?,
            updated_at = NOW()
        WHERE id = ?
    ");
    $total = $plan['text'] + $plan['image'] + $plan['video'] + $plan['landing'];
    $stmt->execute([
        $plan['tier'],
        $total,
        $plan['text'],
        $plan['image'],
        $plan['video'],
        $plan['landing'],
        $customer_id,
        $recurring_id,
        $last4,
        $user_id
    ]);

    $db->prepare("
        INSERT INTO web_payments (web_user_id, provider, amount, currency, status, reference, created_at)
        VALUES (?, 'sumit', ?, 'ILS', 'success', ?, NOW())
    ")->execute([$user_id, $plan['price'], $recurring_id]);
    $_SESSION['web_user_plan_tier'] = $plan['tier'];
    $_SESSION['web_user_subscription_status'] = 'active';
    $_SESSION['web_user_plan_end_at'] = date('Y-m-d H:i:s', strtotime('+30 days'));
    $_SESSION['web_user_credits_remaining'] = $total;
    $_SESSION['web_user_text_credits'] = $plan['text'];
    $_SESSION['web_user_image_credits'] = $plan['image'];
    $_SESSION['web_user_video_credits'] = $plan['video'];
    $_SESSION['web_user_landing_credits'] = $plan['landing'];
    $_SESSION['web_user_credits_reset_at'] = date('Y-m-d H:i:s', strtotime('+30 days'));

    json_response(['status' => 'active']);
}

if ($action === 'cancel_subscription') {
    $stmt = $db->prepare("SELECT sumit_recurring_id, sumit_customer_id FROM web_users WHERE id = ?");
    $stmt->execute([$user_id]);
    $row = $stmt->fetch();
    $recurring_id = $row['sumit_recurring_id'] ?? null;
    if (!$recurring_id) {
        json_error('No active subscription found');
    }
    $payload = [
        'Credentials' => [
            'CompanyID' => SUMIT_COMPANY_ID,
            'APIKey' => SUMIT_PRIVATE_KEY
        ],
        'Customer' => [
            'ID' => $row['sumit_customer_id'] ?? null,
            'ExternalIdentifier' => 'web_user_' . $user_id,
            'SearchMode' => 0
        ],
        'RecurringCustomerItemID' => $recurring_id
    ];
    $result = sumit_post('/billing/recurring/cancel/', $payload);
    $status = $result['data']['Status'] ?? null;
    if (!($status === 0 || $status === 'Success' || (is_string($status) && str_contains($status, 'Success')))) {
        $error = $result['data']['UserErrorMessage'] ?? 'Cancel failed';
        json_error($error, 400);
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

json_error('Invalid action', 400);
?>
