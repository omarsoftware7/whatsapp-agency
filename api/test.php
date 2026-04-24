<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "PHP is working!<br>";

// Test writing to current directory
$test1 = file_put_contents('test_current.txt', 'Test in current dir: ' . date('Y-m-d H:i:s'));
echo "Write to current dir: " . ($test1 ? "SUCCESS" : "FAILED") . "<br>";

// Test writing one level up
$test2 = file_put_contents('../test_parent.txt', 'Test in parent dir: ' . date('Y-m-d H:i:s'));
echo "Write to parent dir: " . ($test2 ? "SUCCESS" : "FAILED") . "<br>";

// Show current directory
echo "Current directory: " . getcwd() . "<br>";

// Show permissions
echo "Directory permissions: " . substr(sprintf('%o', fileperms('.')), -4) . "<br>";

phpinfo();
?>