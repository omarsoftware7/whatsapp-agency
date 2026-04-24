<?php
// ================================================================
// META OAUTH COMPLETE - Full OAuth Flow for Facebook Pages
// Upload to: /public_html/api/meta_oauth_complete.php
// ================================================================

require_once '../config.php';

// ================================================================
// STEP 1: GENERATE LOGIN URL (GET with action=start)
// ================================================================
if ($_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['action'] ?? '') === 'start') {
    $client_id = $_GET['client_id'] ?? null;
    
    if (!$client_id) {
        json_error('client_id required');
    }
    
    // Verify client exists
    $db = get_db();
    $stmt = $db->prepare("SELECT id FROM clients WHERE id = ?");
    $stmt->execute([$client_id]);
    if (!$stmt->fetch()) {
        json_error('Client not found', 404);
    }
    
    // Meta OAuth parameters
    $meta_app_id = META_APP_ID;
    $redirect_uri = BASE_URL . '/api/meta_oauth_complete.php?action=callback';
    
    // State parameter includes client_id for security
    $state = base64_encode(json_encode([
        'client_id' => $client_id,
        'timestamp' => time()
    ]));
    
    // Required permissions for posting
    $scope = implode(',', [
        'pages_show_list',           // List pages
        'pages_read_engagement',     // Read page data
        'pages_manage_posts',        // Post to page
        'pages_manage_engagement',   // Manage comments
        'instagram_basic',           // Instagram basic access
        'instagram_content_publish', // Post to Instagram
        'business_management'        // Manage business assets
    ]);
    
    // Build OAuth URL
    $oauth_url = 'https://www.facebook.com/v21.0/dialog/oauth?' . http_build_query([
        'client_id' => $meta_app_id,
        'redirect_uri' => $redirect_uri,
        'state' => $state,
        'scope' => $scope,
        'response_type' => 'code'
    ]);
    
    // Return the URL to send to user
   /* json_response([
        'oauth_url' => $oauth_url,
        'client_id' => $client_id,
        'instructions' => 'Send this URL to the user. After they authorize, tokens will be automatically saved.'
    ]);*/
    
    
    // Return a simple UI page with a clickable button
die("
<html>
<head>
    <meta name='viewport' content='width=device-width, initial-scale=1' />
    <style>
        body{
            font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
            padding:40px;
            text-align:center;
            background:#f6f7fb;
            margin:0;
        }
        .card{
            background:#fff;
            border-radius:16px;
            padding:32px;
            max-width:520px;
            margin:40px auto;
            box-shadow:0 12px 40px rgba(0,0,0,0.12);
        }
        h1{margin:0 0 10px;color:#1f2937;font-size:22px;}
        p{margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.4;}
        a.btn{
            display:inline-block;
            padding:14px 18px;
            border-radius:12px;
            text-decoration:none;
            font-weight:700;
            background:#2563eb;
            color:#fff;
        }
        .meta{margin-top:18px;color:#9ca3af;font-size:12px}
    </style>
</head>
<body>
    <div class='card'>
        <h1>Connect your Facebook Page</h1>
        <p>Click below to finish the integration.</p>
        <a class='btn' href='".htmlspecialchars($oauth_url, ENT_QUOTES, 'UTF-8')."'>Finish Integration</a>
        <div class='meta'>Client ID: ".htmlspecialchars($client_id, ENT_QUOTES, 'UTF-8')."</div>
    </div>
</body>
</html>
");

}

// ================================================================
// STEP 2: HANDLE CALLBACK FROM META (GET with action=callback)
// ================================================================
if ($_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['action'] ?? '') === 'callback') {
    $code = $_GET['code'] ?? null;
    $state = $_GET['state'] ?? null;
    $error = $_GET['error'] ?? null;
    
    // Handle user denial
    if ($error) {
        die("
        <html>
        <body style='font-family: sans-serif; padding: 40px; text-align: center;'>
            <h1>❌ Authorization Cancelled</h1>
            <p>You chose not to connect your Facebook page.</p>
            <p>Error: " . htmlspecialchars($error) . "</p>
        </body>
        </html>
        ");
    }
    
    if (!$code || !$state) {
        die("Invalid callback - missing code or state");
    }
    
    // Decode state to get client_id
    $state_data = json_decode(base64_decode($state), true);
    $client_id = $state_data['client_id'] ?? null;
    
    if (!$client_id) {
        die("Invalid state parameter");
    }
    
    // Exchange code for short-lived user access token
    $token_url = 'https://graph.facebook.com/v21.0/oauth/access_token?' . http_build_query([
        'client_id' => META_APP_ID,
        'client_secret' => META_APP_SECRET,
        'redirect_uri' => BASE_URL . '/api/meta_oauth_complete.php?action=callback',
        'code' => $code
    ]);
    
    $ch = curl_init($token_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);
    curl_close($ch);
    
    $token_data = json_decode($response, true);
    
    if (!isset($token_data['access_token'])) {
        die("Failed to get access token: " . $response);
    }
    
    $short_lived_token = $token_data['access_token'];
    
    // Get user's Facebook pages
    $pages_url = 'https://graph.facebook.com/v21.0/me/accounts?access_token=' . $short_lived_token;
    
    $ch = curl_init($pages_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $pages_response = curl_exec($ch);
    curl_close($ch);
    
    $pages_data = json_decode($pages_response, true);
    
    if (empty($pages_data['data'])) {
        die("
        <html>
        <body style='font-family: sans-serif; padding: 40px; text-align: center;'>
            <h1>⚠️ No Pages Found</h1>
            <p>Your Facebook account doesn't have any pages.</p>
            <p>Please create a Facebook page first, then try again.</p>
        </body>
        </html>
        ");
    }
    
    // For simplicity, use first page (in production, let user choose)
    $page = $pages_data['data'][0];
    $page_id = $page['id'];
    $page_token = $page['access_token']; // This is already a long-lived page token
    $page_name = $page['name'];
    
    // Get Instagram account linked to this page
    $instagram_url = "https://graph.facebook.com/v21.0/{$page_id}?fields=instagram_business_account&access_token={$page_token}";
    
    $ch = curl_init($instagram_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $instagram_response = curl_exec($ch);
    curl_close($ch);
    
    $instagram_data = json_decode($instagram_response, true);
    $instagram_account_id = $instagram_data['instagram_business_account']['id'] ?? null;
    
    // Page tokens don't expire unless password changed or permissions revoked
    // Set expiry to 60 days from now for tracking purposes
    $token_expires = date('Y-m-d H:i:s', strtotime('+60 days'));
    
    // Save to database
    $db = get_db();
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
        $page_token, // TODO: Encrypt this in production!
        $token_expires,
        $instagram_account_id,
        $client_id
    ]);
    
    // Log activity
    log_activity($client_id, null, 'meta_connected', [
        'page_id' => $page_id,
        'page_name' => $page_name,
        'has_instagram' => !empty($instagram_account_id)
    ]);
    
    // Success page
    die("
    <html>
    <head>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                padding: 40px;
                text-align: center;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                margin: 0;
            }
            .card {
                background: white;
                border-radius: 20px;
                padding: 40px;
                max-width: 500px;
                margin: 50px auto;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            }
            h1 { color: #2d3748; margin-bottom: 20px; }
            .success { font-size: 80px; margin-bottom: 20px; }
            .details {
                background: #f7fafc;
                border-radius: 10px;
                padding: 20px;
                margin: 20px 0;
                text-align: left;
            }
            .details div {
                padding: 8px 0;
                border-bottom: 1px solid #e2e8f0;
            }
            .details div:last-child { border-bottom: none; }
            .label { 
                font-weight: bold; 
                color: #4a5568; 
                display: inline-block;
                width: 120px;
            }
            .value { color: #2d3748; }
        </style>
    </head>
    <body>
        <div class='card'>
            <div class='success'>✅</div>
            <h1>Successfully Connected!</h1>
            <p>Your Facebook page is now connected to Adly.</p>
            
            <div class='details'>
                <div>
                    <span class='label'>Page:</span>
                    <span class='value'>{$page_name}</span>
                </div>
                <div>
                    <span class='label'>Page ID:</span>
                    <span class='value'>{$page_id}</span>
                </div>
                <div>
                    <span class='label'>Instagram:</span>
                    <span class='value'>" . ($instagram_account_id ? '✅ Connected' : '❌ Not linked') . "</span>
                </div>
                <div>
                    <span class='label'>Status:</span>
                    <span class='value'>Ready to post!</span>
                </div>
            </div>
            
            <p style='color: #718096; font-size: 14px; margin-top: 30px;'>
                You can close this window and return to WhatsApp.
            </p>
        </div>
    </body>
    </html>
    ");
}

// ================================================================
// STEP 3: CHECK TOKEN STATUS (GET without action)
// ================================================================
if ($_SERVER['REQUEST_METHOD'] === 'GET' && !isset($_GET['action'])) {
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

json_error('Invalid request', 400);
?>