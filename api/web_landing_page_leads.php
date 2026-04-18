<?php
require_once '../config.php';

$db = get_db();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    session_start();
    if (!isset($_SESSION['web_user_id'])) {
        json_error('Unauthorized', 401);
    }
    $user_id = (int)$_SESSION['web_user_id'];
    $user_role = $_SESSION['web_user_role'] ?? 'user';
    $client_id = isset($_GET['client_id']) ? (int)$_GET['client_id'] : 0;
    if (!$client_id) {
        json_error('client_id required');
    }

    if ($user_role !== 'admin') {
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

    $stmt = $db->prepare("
        SELECT l.id,
               l.name,
               l.email,
               l.phone,
               l.source_url,
               l.created_at,
               p.title AS landing_title,
               p.public_slug,
               'landing' AS source_type,
               NULL AS source_label
        FROM web_landing_page_leads l
        JOIN web_landing_pages p ON p.id = l.landing_page_id
        WHERE l.client_id = ?
        ORDER BY l.created_at DESC
    ");
    $stmt->execute([$client_id]);
    $items = $stmt->fetchAll();

    try {
        $db->exec("
            CREATE TABLE IF NOT EXISTS web_manual_leads (
                id INT AUTO_INCREMENT PRIMARY KEY,
                client_id INT NOT NULL,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) DEFAULT NULL,
                phone VARCHAR(64) DEFAULT NULL,
                source_label VARCHAR(255) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                KEY idx_client (client_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ");
        $stmt = $db->prepare("
            SELECT id,
                   name,
                   email,
                   phone,
                   NULL AS source_url,
                   created_at,
                   NULL AS landing_title,
                   NULL AS public_slug,
                   'manual' AS source_type,
                   source_label
            FROM web_manual_leads
            WHERE client_id = ?
            ORDER BY created_at DESC
        ");
        $stmt->execute([$client_id]);
        $manual_items = $stmt->fetchAll();
        $items = array_merge($items, $manual_items);
        usort($items, fn($a, $b) => strtotime($b['created_at']) <=> strtotime($a['created_at']));
    } catch (Throwable $e) {
        // ignore manual leads if table is missing
    }
    json_response(['items' => $items]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed', 405);
}

$name = trim($_POST['name'] ?? '');
$email = trim($_POST['email'] ?? '');
$phone = trim($_POST['phone'] ?? '');
$slug = trim($_POST['landing_page_slug'] ?? '');
$source_url = trim($_POST['source_url'] ?? ($_SERVER['HTTP_REFERER'] ?? ''));

if ($name === '' || $email === '' || $phone === '' || $slug === '') {
    json_error('Missing required fields', 400);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_error('Invalid email', 400);
}

$stmt = $db->prepare("SELECT id, client_id FROM web_landing_pages WHERE public_slug = ?");
$stmt->execute([$slug]);
$page = $stmt->fetch();
if (!$page) {
    json_error('Landing page not found', 404);
}

$stmt = $db->prepare("
    INSERT INTO web_landing_page_leads (landing_page_id, client_id, name, email, phone, source_url, created_at)
    VALUES (?, ?, ?, ?, ?, ?, NOW())
");
$stmt->execute([
    (int)$page['id'],
    (int)$page['client_id'],
    $name,
    $email,
    $phone,
    $source_url !== '' ? $source_url : null
]);

log_activity((int)$page['client_id'], null, 'landing_page_lead_created', [
    'landing_page_id' => (int)$page['id'],
    'name' => $name,
    'email' => $email
]);

header('Location: /landing.php?slug=' . urlencode($slug) . '&thanks=1');
exit;
?>
