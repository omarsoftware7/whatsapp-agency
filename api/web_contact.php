<?php
require_once '../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed', 405);
}

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$name = trim((string)($input['name'] ?? ''));
$email = trim((string)($input['email'] ?? ''));
$company = trim((string)($input['company'] ?? ''));
$role = trim((string)($input['role'] ?? ''));
$team_size = trim((string)($input['team_size'] ?? ''));
$website = trim((string)($input['website'] ?? ''));
$subject = trim((string)($input['subject'] ?? ''));
$message = trim((string)($input['message'] ?? ''));
$honeypot = trim((string)($input['honeypot'] ?? ''));

if ($honeypot !== '') {
    json_response(['status' => 'ok']);
}

if ($name === '' || $email === '' || $company === '' || $team_size === '' || $subject === '' || $message === '') {
    json_error('Missing required fields', 400);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_error('Invalid email', 400);
}
if ($website !== '' && !filter_var($website, FILTER_VALIDATE_URL)) {
    json_error('Invalid website URL', 400);
}

$db = get_db();
$db->exec("
    CREATE TABLE IF NOT EXISTS web_contact_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        company VARCHAR(255) NOT NULL,
        role VARCHAR(255) DEFAULT NULL,
        team_size VARCHAR(32) DEFAULT NULL,
        website VARCHAR(255) DEFAULT NULL,
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        ip_address VARCHAR(64) DEFAULT NULL,
        user_agent VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

$ip = $_SERVER['REMOTE_ADDR'] ?? '';
$user_agent = substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255);
$stmt = $db->prepare("
    SELECT COUNT(*) as count
    FROM web_contact_requests
    WHERE ip_address = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)
");
$stmt->execute([$ip]);
$count = (int)($stmt->fetch()['count'] ?? 0);
if ($count >= 5) {
    json_error('Too many requests. Please try again later.', 429);
}

$stmt = $db->prepare("
    INSERT INTO web_contact_requests
      (name, email, company, role, team_size, website, subject, message, ip_address, user_agent, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
");
$stmt->execute([
    $name,
    $email,
    $company,
    $role !== '' ? $role : null,
    $team_size !== '' ? $team_size : null,
    $website !== '' ? $website : null,
    $subject,
    $message,
    $ip !== '' ? $ip : null,
    $user_agent !== '' ? $user_agent : null
]);

json_response(['status' => 'ok']);
