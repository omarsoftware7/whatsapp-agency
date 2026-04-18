<?php
/**
 * Security Helpers for Upload Validation and SSRF Prevention
 * 
 * This file provides secure upload handling and URL validation functions.
 */

// ============================================================
// UPLOAD SECURITY
// ============================================================

/**
 * Validate and securely process an uploaded file
 * 
 * @param array $file - The $_FILES entry for a single file
 * @param array $allowed_extensions - e.g. ['png', 'jpg', 'jpeg']
 * @param int $max_size - Maximum file size in bytes (default: MAX_UPLOAD_SIZE)
 * @param bool $validate_image - Whether to validate as image with getimagesize()
 * @return array ['valid' => bool, 'error' => string|null, 'mime' => string|null, 'ext' => string|null]
 */
function validate_upload(array $file, array $allowed_extensions, ?int $max_size = null, bool $validate_image = true): array {
    $max_size = $max_size ?? (defined('MAX_UPLOAD_SIZE') ? MAX_UPLOAD_SIZE : 10 * 1024 * 1024);
    
    // Check upload error
    if (!isset($file['error']) || $file['error'] !== UPLOAD_ERR_OK) {
        $error_messages = [
            UPLOAD_ERR_INI_SIZE => 'File exceeds server limit',
            UPLOAD_ERR_FORM_SIZE => 'File exceeds form limit',
            UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
            UPLOAD_ERR_NO_FILE => 'No file was uploaded',
            UPLOAD_ERR_NO_TMP_DIR => 'Server configuration error',
            UPLOAD_ERR_CANT_WRITE => 'Failed to write file',
            UPLOAD_ERR_EXTENSION => 'Upload blocked by extension',
        ];
        $code = $file['error'] ?? UPLOAD_ERR_NO_FILE;
        return ['valid' => false, 'error' => $error_messages[$code] ?? 'Upload failed', 'mime' => null, 'ext' => null];
    }
    
    // Check file exists and is uploaded file
    if (!isset($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
        return ['valid' => false, 'error' => 'Invalid upload', 'mime' => null, 'ext' => null];
    }
    
    // Check file size BEFORE reading content
    $size = filesize($file['tmp_name']);
    if ($size === false || $size > $max_size) {
        return ['valid' => false, 'error' => 'File too large (max ' . round($max_size / 1024 / 1024, 1) . 'MB)', 'mime' => null, 'ext' => null];
    }
    
    // Validate extension
    $original_name = $file['name'] ?? '';
    $ext = strtolower(pathinfo($original_name, PATHINFO_EXTENSION));
    if (!in_array($ext, $allowed_extensions, true)) {
        return ['valid' => false, 'error' => 'Invalid file type. Allowed: ' . implode(', ', $allowed_extensions), 'mime' => null, 'ext' => null];
    }
    
    // Validate MIME type using finfo (not trusting browser-provided type)
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $detected_mime = $finfo->file($file['tmp_name']);
    
    $allowed_mimes = [
        'png' => ['image/png'],
        'jpg' => ['image/jpeg'],
        'jpeg' => ['image/jpeg'],
        'gif' => ['image/gif'],
        'webp' => ['image/webp'],
        'csv' => ['text/csv', 'text/plain', 'application/csv'],
        'xls' => ['application/vnd.ms-excel'],
        'xlsx' => ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    ];
    
    $valid_mimes = $allowed_mimes[$ext] ?? [];
    if (!empty($valid_mimes) && !in_array($detected_mime, $valid_mimes, true)) {
        return ['valid' => false, 'error' => 'File content does not match extension', 'mime' => $detected_mime, 'ext' => $ext];
    }
    
    // For images, validate integrity with getimagesize()
    if ($validate_image && in_array($ext, ['png', 'jpg', 'jpeg', 'gif', 'webp'], true)) {
        $image_info = @getimagesize($file['tmp_name']);
        if ($image_info === false) {
            return ['valid' => false, 'error' => 'Invalid or corrupted image file', 'mime' => $detected_mime, 'ext' => $ext];
        }
        
        // Additional check: detected MIME should match getimagesize MIME
        $image_mime = $image_info['mime'] ?? '';
        if (!in_array($image_mime, $valid_mimes, true)) {
            return ['valid' => false, 'error' => 'Image format mismatch', 'mime' => $detected_mime, 'ext' => $ext];
        }
    }
    
    return ['valid' => true, 'error' => null, 'mime' => $detected_mime, 'ext' => $ext];
}

/**
 * Generate a safe filename (no user input in the name)
 * 
 * @param string $prefix - e.g. 'avatar', 'logo', 'product'
 * @param string $ext - File extension
 * @param int|null $id - Optional ID to include (user_id, client_id)
 * @return string
 */
function generate_safe_filename(string $prefix, string $ext, ?int $id = null): string {
    $unique = bin2hex(random_bytes(8));
    $timestamp = date('YmdHis');
    $id_part = $id !== null ? "_{$id}" : '';
    return "{$prefix}{$id_part}_{$timestamp}_{$unique}.{$ext}";
}

/**
 * Securely move uploaded file with proper permissions
 * 
 * @param string $tmp_name - Temporary file path
 * @param string $destination - Final destination path
 * @param int $file_perms - File permissions (default: 0644 for web-accessible files)
 * @return bool
 */
function secure_move_upload(string $tmp_name, string $destination, int $file_perms = 0644): bool {
    // Ensure destination directory exists with proper permissions
    $dir = dirname($destination);
    if (!is_dir($dir)) {
        mkdir($dir, 0750, true);
    }
    
    // Move the file
    if (!move_uploaded_file($tmp_name, $destination)) {
        return false;
    }
    
    // Set secure permissions
    chmod($destination, $file_perms);
    
    return true;
}

/**
 * Validate multiple uploaded files
 * 
 * @param array $files - $_FILES array for multiple files
 * @param array $allowed_extensions
 * @param int|null $max_size
 * @param bool $validate_image
 * @return array ['valid' => array of valid indices, 'errors' => array of errors by index]
 */
function validate_multiple_uploads(array $files, array $allowed_extensions, ?int $max_size = null, bool $validate_image = true): array {
    $valid_indices = [];
    $errors = [];
    
    if (!isset($files['tmp_name']) || !is_array($files['tmp_name'])) {
        return ['valid' => [], 'errors' => ['No files uploaded']];
    }
    
    foreach ($files['tmp_name'] as $index => $tmp_name) {
        $single_file = [
            'tmp_name' => $tmp_name,
            'name' => $files['name'][$index] ?? '',
            'error' => $files['error'][$index] ?? UPLOAD_ERR_NO_FILE,
            'size' => $files['size'][$index] ?? 0,
        ];
        
        $result = validate_upload($single_file, $allowed_extensions, $max_size, $validate_image);
        
        if ($result['valid']) {
            $valid_indices[] = $index;
        } else {
            $errors[$index] = $result['error'];
        }
    }
    
    return ['valid' => $valid_indices, 'errors' => $errors];
}

// ============================================================
// SSRF PREVENTION
// ============================================================

/**
 * Check if an IP address is private/internal
 * 
 * @param string $ip
 * @param bool $allow_localhost - If true, allows 127.0.0.1 (for local development)
 * @return bool
 */
function is_private_ip(string $ip, bool $allow_localhost = false): bool {
    // In development mode, allow localhost
    if ($allow_localhost && ($ip === '127.0.0.1' || $ip === '::1' || $ip === '0:0:0:0:0:0:0:1')) {
        return false;
    }
    
    // IPv4 private ranges
    $private_ranges = [
        '10.0.0.0/8',      // 10.0.0.0 – 10.255.255.255
        '172.16.0.0/12',   // 172.16.0.0 – 172.31.255.255
        '192.168.0.0/16',  // 192.168.0.0 – 192.168.255.255
        '127.0.0.0/8',     // Loopback
        '169.254.0.0/16',  // Link-local
        '0.0.0.0/8',       // Invalid
    ];
    
    // Check IPv6 loopback
    if ($ip === '::1' || $ip === '0:0:0:0:0:0:0:1') {
        return true;
    }
    
    // IPv4 check
    $ip_long = ip2long($ip);
    if ($ip_long === false) {
        return true; // Invalid IP, treat as private
    }
    
    foreach ($private_ranges as $range) {
        [$subnet, $bits] = explode('/', $range);
        $subnet_long = ip2long($subnet);
        $mask = -1 << (32 - (int)$bits);
        if (($ip_long & $mask) === ($subnet_long & $mask)) {
            return true;
        }
    }
    
    return false;
}

/**
 * Validate a URL for safe fetching (SSRF prevention)
 * 
 * @param string $url
 * @param array $allowed_hosts - Allowlist of hosts (empty = allow all public hosts)
 * @return array ['valid' => bool, 'error' => string|null, 'host' => string|null, 'ip' => string|null]
 */
function validate_url_for_fetch(string $url, array $allowed_hosts = []): array {
    // In DEBUG_MODE, allow localhost for local development
    $allow_localhost = defined('DEBUG_MODE') && DEBUG_MODE;
    
    // Parse URL
    $parsed = parse_url($url);
    if ($parsed === false || !isset($parsed['host'])) {
        return ['valid' => false, 'error' => 'Invalid URL', 'host' => null, 'ip' => null];
    }
    
    // Only allow http/https
    $scheme = strtolower($parsed['scheme'] ?? '');
    if (!in_array($scheme, ['http', 'https'], true)) {
        return ['valid' => false, 'error' => 'Only HTTP/HTTPS allowed', 'host' => $parsed['host'], 'ip' => null];
    }
    
    $host = $parsed['host'];
    
    // In development, allow localhost explicitly
    if ($allow_localhost && ($host === 'localhost' || $host === '127.0.0.1')) {
        return ['valid' => true, 'error' => null, 'host' => $host, 'ip' => '127.0.0.1'];
    }
    
    // Check allowlist if provided
    if (!empty($allowed_hosts) && !in_array($host, $allowed_hosts, true)) {
        return ['valid' => false, 'error' => 'Host not in allowlist', 'host' => $host, 'ip' => null];
    }
    
    // Resolve DNS
    $ip = gethostbyname($host);
    if ($ip === $host) {
        // DNS resolution failed
        return ['valid' => false, 'error' => 'Could not resolve host', 'host' => $host, 'ip' => null];
    }
    
    // Check if IP is private (with localhost exception in dev mode)
    if (is_private_ip($ip, $allow_localhost)) {
        return ['valid' => false, 'error' => 'Private IP addresses not allowed', 'host' => $host, 'ip' => $ip];
    }
    
    return ['valid' => true, 'error' => null, 'host' => $host, 'ip' => $ip];
}

/**
 * Safely fetch content from a URL with SSRF protection
 * 
 * @param string $url
 * @param array $allowed_hosts - Empty array allows all public hosts
 * @param int $timeout - Request timeout in seconds
 * @param bool $follow_redirects - Whether to follow redirects (with re-validation)
 * @return array ['success' => bool, 'content' => string|null, 'error' => string|null]
 */
function safe_url_fetch(string $url, array $allowed_hosts = [], int $timeout = 10, bool $follow_redirects = false): array {
    // Validate URL first
    $validation = validate_url_for_fetch($url, $allowed_hosts);
    if (!$validation['valid']) {
        return ['success' => false, 'content' => null, 'error' => $validation['error']];
    }
    
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => $timeout,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_FOLLOWLOCATION => $follow_redirects,
        CURLOPT_MAXREDIRS => $follow_redirects ? 3 : 0,
        CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ]);
    
    $content = curl_exec($ch);
    $error = curl_error($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($content === false) {
        return ['success' => false, 'content' => null, 'error' => $error ?: 'Request failed'];
    }
    
    if ($code < 200 || $code >= 300) {
        return ['success' => false, 'content' => null, 'error' => "HTTP {$code}"];
    }
    
    return ['success' => true, 'content' => $content, 'error' => null];
}

// ============================================================
// HOST VALIDATION
// ============================================================

/**
 * Get validated base URL (prevents host header injection)
 * 
 * @param array $allowed_hosts - Allowlist of valid hosts
 * @return string - Returns BASE_URL if host is not in allowlist
 */
function get_safe_base_url(array $allowed_hosts = []): string {
    // Always fall back to BASE_URL if no allowlist
    if (empty($allowed_hosts)) {
        return defined('BASE_URL') ? BASE_URL : '';
    }
    
    $host = $_SERVER['HTTP_HOST'] ?? '';
    
    // Strip port if present for comparison
    $host_no_port = explode(':', $host)[0];
    
    // Check allowlist
    if (!in_array($host_no_port, $allowed_hosts, true)) {
        return defined('BASE_URL') ? BASE_URL : '';
    }
    
    // Determine scheme
    $is_https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    
    $scheme = $is_https ? 'https' : 'http';
    return $scheme . '://' . $host;
}

// ============================================================
// SESSION SECURITY
// ============================================================

/**
 * Regenerate session ID securely (call on login/register/privilege change)
 * 
 * @return bool
 */
function secure_session_regenerate(): bool {
    if (session_status() !== PHP_SESSION_ACTIVE) {
        return false;
    }
    return session_regenerate_id(true);
}
