<?php
require_once '../config.php';

session_start();

if (!isset($_SESSION['web_user_id'])) {
    json_error('Unauthorized', 401);
}

$db = get_db();
$user_id = (int)$_SESSION['web_user_id'];
$user_role = $_SESSION['web_user_role'] ?? 'user';

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

if ($user_role !== 'admin') {
    $user = get_user_plan($db, $user_id);
    if ((int)($user['is_active'] ?? 1) !== 1) {
        json_error('Account is disabled.', 403);
    }
    $has_active = is_trial_active($user) || is_plan_active($user);
    if (!$has_active) {
        json_error('Your subscription is not active.', 403);
    }
    if (!plan_allows_business_card($user['plan_tier'] ?? 'expired')) {
        json_error('Business cards are not included in your plan.', 403);
    }
}

function ensure_brand_owner(PDO $db, int $user_id, int $client_id, string $role = 'user'): void {
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

function slugify(string $text): string {
    $text = strtolower(trim($text));
    $text = preg_replace('/[^a-z0-9]+/i', '-', $text);
    $text = trim($text, '-');
    return $text !== '' ? $text : 'card';
}

function generate_unique_slug(PDO $db, string $base): string {
    $slug = $base;
    $tries = 0;
    while ($tries < 5) {
        $stmt = $db->prepare("SELECT id FROM web_business_cards WHERE public_slug = ?");
        $stmt->execute([$slug]);
        if (!$stmt->fetch()) {
            return $slug;
        }
        $slug = $base . '-' . substr(bin2hex(random_bytes(4)), 0, 6);
        $tries++;
    }
    return $base . '-' . substr(bin2hex(random_bytes(6)), 0, 8);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? null;
    if ($action === 'admin_list') {
        if ($user_role !== 'admin') {
            json_error('Unauthorized', 401);
        }
        $stmt = $db->query("
            SELECT bc.id,
                   bc.client_id,
                   bc.title,
                   bc.subtitle,
                   bc.header_image_url,
                   bc.phone_1,
                   bc.phone_2,
                   bc.address,
                   bc.location_url,
                   bc.facebook_url,
                   bc.instagram_url,
                   bc.whatsapp_number,
                   bc.gallery_images,
                   bc.status,
                   bc.error_message,
                   bc.public_slug,
                   bc.created_at,
                   bc.updated_at,
                   c.business_name,
                   GROUP_CONCAT(DISTINCT u.email ORDER BY u.email SEPARATOR ', ') AS owner_emails
            FROM web_business_cards bc
            JOIN clients c ON c.id = bc.client_id
            LEFT JOIN web_user_clients wuc ON wuc.client_id = bc.client_id
            LEFT JOIN web_users u ON u.id = wuc.web_user_id
            GROUP BY bc.id
            ORDER BY bc.created_at DESC
            LIMIT 500
        ");
        $items = $stmt->fetchAll();
        foreach ($items as &$item) {
            $item['gallery_images'] = $item['gallery_images'] ? (json_decode($item['gallery_images'], true) ?: []) : [];
        }
        unset($item);
        json_response(['items' => $items]);
    }

    $client_id = isset($_GET['client_id']) ? (int)$_GET['client_id'] : 0;
    if (!$client_id) {
        json_error('client_id required');
    }
    ensure_brand_owner($db, $user_id, $client_id, $user_role);

    $stmt = $db->prepare("
        SELECT id,
               client_id,
               title,
               subtitle,
               header_image_url,
               phone_1,
               phone_2,
               address,
               location_url,
               facebook_url,
               instagram_url,
               whatsapp_number,
               gallery_images,
               status,
               error_message,
               public_slug,
               created_at,
               updated_at
        FROM web_business_cards
        WHERE client_id = ?
        LIMIT 1
    ");
    $stmt->execute([$client_id]);
    $card = $stmt->fetch();
    if ($card && $card['gallery_images']) {
        $card['gallery_images'] = json_decode($card['gallery_images'], true) ?: [];
    } else if ($card) {
        $card['gallery_images'] = [];
    }
    $items = $card ? [$card] : [];
    json_response(['card' => $card, 'items' => $items]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed', 405);
}

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? null;
if ($action !== 'save') {
    json_error('action required');
}

$client_id = (int)($input['client_id'] ?? 0);
if (!$client_id) {
    json_error('client_id required');
}
ensure_brand_owner($db, $user_id, $client_id, $user_role);

$gallery_images = $input['gallery_images'] ?? [];
if (!is_array($gallery_images)) {
    $gallery_images = [];
}
$gallery_images = array_values(array_filter(array_map('trim', $gallery_images)));
if (count($gallery_images) > 10) {
    $gallery_images = array_slice($gallery_images, 0, 10);
}

$payload = [
    trim((string)($input['title'] ?? '')),
    trim((string)($input['subtitle'] ?? '')),
    trim((string)($input['header_image_url'] ?? '')),
    trim((string)($input['phone_1'] ?? '')),
    trim((string)($input['phone_2'] ?? '')),
    trim((string)($input['address'] ?? '')),
    trim((string)($input['location_url'] ?? '')),
    trim((string)($input['facebook_url'] ?? '')),
    trim((string)($input['instagram_url'] ?? '')),
    trim((string)($input['whatsapp_number'] ?? '')),
    json_encode($gallery_images, JSON_UNESCAPED_UNICODE),
    $client_id
];

$stmt = $db->prepare("SELECT id, public_slug FROM web_business_cards WHERE client_id = ?");
$stmt->execute([$client_id]);
$existing = $stmt->fetch();

if ($existing) {
    $stmt = $db->prepare("
        UPDATE web_business_cards
        SET title = ?,
            subtitle = ?,
            header_image_url = ?,
            phone_1 = ?,
            phone_2 = ?,
            address = ?,
            location_url = ?,
            facebook_url = ?,
            instagram_url = ?,
            whatsapp_number = ?,
            gallery_images = ?,
            status = 'published',
            error_message = NULL,
            updated_at = NOW()
        WHERE client_id = ?
    ");
    $stmt->execute($payload);
    json_response(['status' => 'updated', 'public_slug' => $existing['public_slug']]);
}

// Create new card
$brandStmt = $db->prepare("SELECT business_name FROM clients WHERE id = ?");
$brandStmt->execute([$client_id]);
$brand = $brandStmt->fetch();
$base = slugify((string)($brand['business_name'] ?? 'card'));
$slug = generate_unique_slug($db, $base);

$stmt = $db->prepare("
    INSERT INTO web_business_cards
      (client_id, title, subtitle, header_image_url, phone_1, phone_2, address, location_url, facebook_url, instagram_url, whatsapp_number, gallery_images, status, public_slug)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?)
");
$stmt->execute([
    $client_id,
    $payload[0],
    $payload[1],
    $payload[2],
    $payload[3],
    $payload[4],
    $payload[5],
    $payload[6],
    $payload[7],
    $payload[8],
    $payload[9],
    $payload[10],
    $slug
]);

json_response(['status' => 'created', 'public_slug' => $slug]);
