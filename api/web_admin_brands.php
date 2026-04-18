<?php
require_once '../config.php';

session_start();

if (!isset($_SESSION['web_user_id']) || ($_SESSION['web_user_role'] ?? 'user') !== 'admin') {
    json_error('Unauthorized', 401);
}

$db = get_db();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Method not allowed', 405);
}

$stmt = $db->query("
    SELECT c.id,
           c.business_name,
           c.industry,
           c.business_description,
           c.logo_filename,
           c.primary_color,
           c.secondary_color,
           c.onboarding_complete,
           c.created_at,
           c.updated_at,
           wbp.website,
           wbp.instagram_handle,
           wbp.target_audience,
           wbp.price_range,
           wbp.facebook_page_url,
           wbp.instagram_page_url,
           wbp.country,
           GROUP_CONCAT(DISTINCT u.email ORDER BY u.email SEPARATOR ', ') AS owner_emails,
           GROUP_CONCAT(DISTINCT u.id ORDER BY u.id SEPARATOR ',') AS owner_ids,
           COUNT(DISTINCT wuc.web_user_id) AS owner_count
    FROM web_user_clients wuc
    JOIN clients c ON c.id = wuc.client_id
    LEFT JOIN web_brand_profiles wbp ON wbp.client_id = c.id
    LEFT JOIN web_users u ON u.id = wuc.web_user_id
    GROUP BY c.id
    ORDER BY c.created_at DESC
");
$items = $stmt->fetchAll();
json_response(['items' => $items]);
?>
