<?php
// ================================================================
// META OAUTH - Connect Facebook Page & Instagram Account
// Upload to: /public_html/api/meta_oauth.php
// ================================================================

require_once '../config.php';

// ================================================================
// STEP 1: Save tokens after OAuth (called by n8n after user authorizes)
// ================================================================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Check API key
    $api_key = get_api_key_from_request();
    if (!check_api_key($api_key)) {
        json_error('Unauthorized', 401);
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    $client_id = $input['client_id'] ?? null;
    $page_token = $input['page_token'] ?? null;
    $page_id = $input['page_id'] ?? null;
    $instagram_account_id = $input['instagram_account_id'] ?? null;
    $token_expires = $input['token_expires'] ?? null;  // Unix timestamp
    
    if (!$client_id || !$page_token || !$page_id) {
        json_error('client_id, page_token, and page_id required');
    }
    
    $db = get_db();
    
    $expires_datetime = $token_expires ? date('Y-m-d H:i:s', $token_expires) : null;
    
    $stmt = $db->prepare("
        UPDATE clients 
        SET meta_page_id = ?,
            meta_page_token = ?,
            meta_page_token_expires = ?,
            instagram_account_id = ?,
            meta_tokens_valid = TRUE
        WHERE id = ?
    ");
    $stmt->execute([
        $page_id,
        $page_token,  // In production, encrypt this!
        $expires_datetime,
        $instagram_account_id,
        $client_id
    ]);
    
    log_activity($client_id, null, 'meta_connected', [
        'page_id' => $page_id,
        'has_instagram' => !empty($instagram_account_id)
    ]);
    
    json_response([
        'status' => 'tokens_saved',
        'client_id' => $client_id,
        'page_id' => $page_id,
        'instagram_account_id' => $instagram_account_id,
        'expires' => $expires_datetime
    ]);
}

// ================================================================
// GET: Check token status
// ================================================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $client_id = $_GET['client_id'] ?? null;
    
    if (!$client_id) {
        json_error('client_id required');
    }
    
    $db = get_db();
    $stmt = $db->prepare("
        SELECT meta_page_id, instagram_account_id, meta_tokens_valid, meta_page_token_expires 
        FROM clients 
        WHERE id = ?
    ");
    $stmt->execute([$client_id]);
    $client = $stmt->fetch();
    
    if (!$client) {
        json_error('Client not found', 404);
    }
    
    $expires_soon = false;
    if ($client['meta_page_token_expires']) {
        $days_until_expiry = (strtotime($client['meta_page_token_expires']) - time()) / 86400;
        $expires_soon = $days_until_expiry < 7;
    }
    
    json_response([
        'connected' => $client['meta_tokens_valid'],
        'page_id' => $client['meta_page_id'],
        'instagram_account_id' => $client['instagram_account_id'],
        'expires' => $client['meta_page_token_expires'],
        'expires_soon' => $expires_soon
    ]);
}

json_error('Invalid request method', 405);
?>