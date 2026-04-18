<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "Testing config.php load...<br><br>";

if (file_exists('../config.php')) {
    echo "✓ config.php EXISTS<br>";
    require_once '../config.php';
    echo "✓ config.php LOADED successfully<br><br>";
    
    // Test if functions exist
    if (function_exists('get_api_key_from_request')) {
        echo "✓ Function get_api_key_from_request EXISTS<br>";
    } else {
        echo "✗ Function get_api_key_from_request NOT FOUND<br>";
    }
    
    if (function_exists('check_api_key')) {
        echo "✓ Function check_api_key EXISTS<br>";
    } else {
        echo "✗ Function check_api_key NOT FOUND<br>";
    }
    
    if (function_exists('json_error')) {
        echo "✓ Function json_error EXISTS<br>";
    } else {
        echo "✗ Function json_error NOT FOUND<br>";
    }
    
    if (function_exists('json_response')) {
        echo "✓ Function json_response EXISTS<br>";
    } else {
        echo "✗ Function json_response NOT FOUND<br>";
    }
    
    if (function_exists('get_db')) {
        echo "✓ Function get_db EXISTS<br>";
    } else {
        echo "✗ Function get_db NOT FOUND<br>";
    }
    
    // Test database connection
    echo "<br>Testing database connection...<br>";
    try {
        $db = get_db();
        echo "✓ Database connected successfully<br>";
    } catch (Exception $e) {
        echo "✗ Database connection failed: " . $e->getMessage() . "<br>";
    }
    
} else {
    echo "✗ config.php NOT FOUND at ../config.php<br>";
    echo "Current directory: " . getcwd() . "<br>";
    
    // List files in parent directory
    echo "<br>Files in parent directory:<br>";
    $files = scandir('..');
    foreach ($files as $file) {
        echo "- $file<br>";
    }
}
?>