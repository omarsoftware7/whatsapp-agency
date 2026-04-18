<?php
// ================================================================
// GET WHATSAPP MEDIA - Convert WhatsApp media ID to downloadable URL
// Upload to: /public_html/api/get_whatsapp_media.php
// ================================================================

require_once '../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed', 405);
}

// Check API key (n8n calls this)
$api_key = get_api_key_from_request();
if (!check_api_key($api_key)) {
    json_error('Unauthorized', 401);
}

$input = json_decode(file_get_contents('php://input'), true);
$media_id = $input['media_id'] ?? null;
$save_to_server = $input['save_to_server'] ?? true;
$filename = $input['filename'] ?? null;

if (!$media_id) {
    json_error('media_id required');
}

// ================================================================
// STEP 1: Get media URL from WhatsApp API
// ================================================================
$media_url_endpoint = "https://graph.facebook.com/" . META_GRAPH_API_VERSION . "/{$media_id}";

$ch = curl_init($media_url_endpoint);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . WA_ACCESS_TOKEN
]);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($http_code !== 200) {
    json_error('Failed to get media URL from WhatsApp: ' . $response, $http_code);
}

$media_data = json_decode($response, true);
$media_download_url = $media_data['url'] ?? null;
$mime_type = $media_data['mime_type'] ?? 'image/jpeg';

if (!$media_download_url) {
    json_error('Media URL not found in response');
}

// ================================================================
// STEP 2: Download the actual media file
// ================================================================
$ch = curl_init($media_download_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . WA_ACCESS_TOKEN
]);

$file_data = curl_exec($ch);
$download_http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($download_http_code !== 200 || !$file_data) {
    json_error('Failed to download media file', $download_http_code);
}

// ================================================================
// STEP 3: Save to server (optional)
// ================================================================
if ($save_to_server) {
    // Determine file extension from mime type
    $extension_map = [
        'image/jpeg' => 'jpg',
        'image/jpg' => 'jpg',
        'image/png' => 'png',
        'image/gif' => 'gif',
        'image/webp' => 'webp',
        'video/mp4' => 'mp4',
        'audio/ogg' => 'ogg',
        'audio/mpeg' => 'mp3',
        'application/pdf' => 'pdf'
    ];
    
    $extension = $extension_map[$mime_type] ?? 'bin';
    
    // Generate filename if not provided
    if (!$filename) {
        $filename = 'whatsapp_' . time() . '_' . uniqid() . '.' . $extension;
    } elseif (!pathinfo($filename, PATHINFO_EXTENSION)) {
        $filename .= '.' . $extension;
    }
    
    // Determine save directory based on mime type
    if (strpos($mime_type, 'image/') === 0) {
        $save_dir = PRODUCT_DIR;  // For product images
    } elseif (strpos($mime_type, 'video/') === 0) {
        $save_dir = GENERATED_DIR;  // For videos
    } else {
        $save_dir = UPLOAD_DIR;  // General uploads
    }
    
    $save_path = $save_dir . $filename;
    
    if (!file_put_contents($save_path, $file_data)) {
        json_error('Failed to save file to server');
    }
    
    $public_url = BASE_URL . '/uploads/' . 
                  (strpos($save_path, '/logos/') !== false ? 'logos/' : 
                   (strpos($save_path, '/products/') !== false ? 'products/' : 
                    (strpos($save_path, '/generated/') !== false ? 'generated/' : ''))). 
                  $filename;
    
    json_response([
        'status' => 'success',
        'media_id' => $media_id,
        'mime_type' => $mime_type,
        'filename' => $filename,
        'saved_path' => $save_path,
        'public_url' => $public_url,
        'file_size' => strlen($file_data)
    ]);
} else {
    // Just return base64 encoded data
    json_response([
        'status' => 'success',
        'media_id' => $media_id,
        'mime_type' => $mime_type,
        'base64_data' => base64_encode($file_data),
        'file_size' => strlen($file_data)
    ]);
}
?>