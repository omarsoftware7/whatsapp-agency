<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once '../config.php';

echo "Testing API Key Function...<br><br>";

// Test the n8n key
$test_key = 'Og8OqdpZepiltEft4xFzBH8dupZHymc5';
echo "Testing key: $test_key<br>";

$result = check_api_key($test_key);
echo "Result: " . ($result ? "VALID" : "INVALID") . "<br><br>";

// Check database directly
$db = get_db();
$stmt = $db->prepare("SELECT * FROM api_keys WHERE key_value = ?");
$stmt->execute([$test_key]);
$key_data = $stmt->fetch();

echo "Database lookup:<br>";
echo "<pre>";
print_r($key_data);
echo "</pre>";

// Check if it's the is_active issue
$stmt2 = $db->prepare("SELECT * FROM api_keys WHERE key_value = ? AND is_active = 1");
$stmt2->execute([$test_key]);
$key_data2 = $stmt2->fetch();

echo "With is_active=1 check:<br>";
echo "<pre>";
print_r($key_data2);
echo "</pre>";
?>