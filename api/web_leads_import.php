<?php
require_once '../config.php';
require_once __DIR__ . '/security_helpers.php';

session_start();

if (!isset($_SESSION['web_user_id'])) {
    json_error('Unauthorized', 401);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed', 405);
}

$db = get_db();
$user_id = (int)$_SESSION['web_user_id'];
$user_role = $_SESSION['web_user_role'] ?? 'user';
$client_id = isset($_POST['client_id']) ? (int)$_POST['client_id'] : 0;
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

if (!isset($_FILES['file'])) {
    json_error('CSV file required', 400);
}

// Validate CSV upload (max 5MB, CSV validation only - not image)
$allowed = ['csv'];
$validation = validate_upload($_FILES['file'], $allowed, 5 * 1024 * 1024, false);
if (!$validation['valid']) {
    json_error($validation['error'], 400);
}

$tmp = $_FILES['file']['tmp_name'];
$handle = fopen($tmp, 'r');
if (!$handle) {
    json_error('Failed to read upload', 400);
}

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

$header = fgetcsv($handle);
$name_index = null;
$email_index = null;
$phone_index = null;
$source_index = null;

if (is_array($header)) {
    $normalized = array_map(fn($v) => strtolower(trim((string)$v)), $header);
    $name_index = array_search('name', $normalized, true);
    $email_index = array_search('email', $normalized, true);
    $phone_index = array_search('phone', $normalized, true);
    $source_index = array_search('source', $normalized, true);
    if ($name_index === false && $email_index === false && $phone_index === false) {
        rewind($handle);
    }
} else {
    rewind($handle);
}

$insert = $db->prepare("
    INSERT INTO web_manual_leads (client_id, name, email, phone, source_label, created_at)
    VALUES (?, ?, ?, ?, ?, NOW())
");

$count = 0;
while (($row = fgetcsv($handle)) !== false) {
    if ($count >= 500) {
        break;
    }
    $name = $name_index !== null && isset($row[$name_index]) ? trim((string)$row[$name_index]) : trim((string)($row[0] ?? ''));
    $email = $email_index !== null && isset($row[$email_index]) ? trim((string)$row[$email_index]) : trim((string)($row[1] ?? ''));
    $phone = $phone_index !== null && isset($row[$phone_index]) ? trim((string)$row[$phone_index]) : trim((string)($row[2] ?? ''));
    $source = $source_index !== null && isset($row[$source_index]) ? trim((string)$row[$source_index]) : 'Manual import';
    if ($name === '') {
        continue;
    }
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $email = null;
    }
    $insert->execute([
        $client_id,
        $name,
        $email !== '' ? $email : null,
        $phone !== '' ? $phone : null,
        $source !== '' ? $source : null
    ]);
    $count += 1;
}
fclose($handle);

json_response(['status' => 'ok', 'count' => $count]);
