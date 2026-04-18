<?php
require_once '../config.php';

session_start();

if (!isset($_SESSION['web_user_id']) || ($_SESSION['web_user_role'] ?? 'user') !== 'admin') {
    json_error('Unauthorized', 401);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Method not allowed', 405);
}

$db = get_db();
$stmt = $db->query("
    SELECT lp.id,
           lp.client_id,
           lp.title,
           lp.user_prompt,
           lp.status,
           lp.public_slug,
           lp.error_message,
           lp.created_at,
           lp.updated_at,
           c.business_name,
           GROUP_CONCAT(DISTINCT u.email ORDER BY u.email SEPARATOR ', ') AS owner_emails
    FROM web_landing_pages lp
    JOIN clients c ON c.id = lp.client_id
    LEFT JOIN web_user_clients wuc ON wuc.client_id = lp.client_id
    LEFT JOIN web_users u ON u.id = wuc.web_user_id
    GROUP BY lp.id
    ORDER BY lp.created_at DESC
    LIMIT 200
");
$items = $stmt->fetchAll();
json_response(['items' => $items]);
?>
