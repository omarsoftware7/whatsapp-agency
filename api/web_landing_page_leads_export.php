<?php
require_once '../config.php';

session_start();

if (!isset($_SESSION['web_user_id'])) {
    json_error('Unauthorized', 401);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Method not allowed', 405);
}

$client_id = isset($_GET['client_id']) ? (int)$_GET['client_id'] : 0;
if (!$client_id) {
    json_error('client_id required');
}

$db = get_db();
$user_id = (int)$_SESSION['web_user_id'];
$user_role = $_SESSION['web_user_role'] ?? 'user';

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
    SELECT l.name,
           l.email,
           l.phone,
           l.created_at,
           p.title AS landing_title,
           p.public_slug
    FROM web_landing_page_leads l
    JOIN web_landing_pages p ON p.id = l.landing_page_id
    WHERE l.client_id = ?
    ORDER BY l.created_at DESC
");
$stmt->execute([$client_id]);
$items = $stmt->fetchAll();

header('Content-Type: application/vnd.ms-excel; charset=utf-8');
header('Content-Disposition: attachment; filename="leads-' . $client_id . '.xls"');
echo "Name\tEmail\tPhone\tLanding Page\tSlug\tRegistered At\n";
foreach ($items as $row) {
    $line = [
        $row['name'] ?? '',
        $row['email'] ?? '',
        $row['phone'] ?? '',
        $row['landing_title'] ?? '',
        $row['public_slug'] ?? '',
        $row['created_at'] ?? ''
    ];
    $line = array_map(static fn($v) => str_replace(["\t", "\n", "\r"], ' ', (string)$v), $line);
    echo implode("\t", $line) . "\n";
}
exit;
?>
