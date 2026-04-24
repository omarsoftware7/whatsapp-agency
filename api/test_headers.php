<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once '../config.php';

echo "Testing Headers...<br><br>";

echo "All Headers:<br><pre>";
print_r(getallheaders());
echo "</pre><br>";

echo "API Key from function:<br>";
$api_key = get_api_key_from_request();
var_dump($api_key);
echo "<br><br>";

if ($api_key) {
    echo "Checking if valid...<br>";
    $valid = check_api_key($api_key);
    echo "Valid: " . ($valid ? "YES" : "NO");
} else {
    echo "No API key found in request!";
}
?>