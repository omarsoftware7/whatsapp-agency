<?php
require_once '../config.php';

// ================================================================
// WEB META OAUTH COMPLETE - Facebook/Instagram OAuth for web brands
// ================================================================

session_start();

function render_meta_page_picker(int $client_id, array $pages): void {
    $options = '';
    foreach ($pages as $page) {
        $page_id = htmlspecialchars((string)($page['id'] ?? ''), ENT_QUOTES, 'UTF-8');
        $page_name = htmlspecialchars((string)($page['name'] ?? $page_id), ENT_QUOTES, 'UTF-8');
        $options .= "<label style='display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:10px;cursor:pointer;'>
            <input type='radio' name='page_id' value='{$page_id}' required>
            <span style='font-weight:600;color:#111827;'>{$page_name}</span>
            <span style='color:#9ca3af;font-size:12px;'>ID: {$page_id}</span>
        </label>";
    }
    echo "
    <html>
    <head>
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <style>
            body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:40px;text-align:center;background:#f6f7fb;margin:0;}
            .card{background:#fff;border-radius:16px;padding:32px;max-width:640px;margin:40px auto;box-shadow:0 12px 40px rgba(0,0,0,0.12);text-align:left;}
            h1{margin:0 0 10px;color:#1f2937;font-size:22px;text-align:center;}
            p{margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.4;text-align:center;}
            .btn{display:inline-block;padding:12px 16px;border-radius:12px;text-decoration:none;font-weight:700;background:#2563eb;color:#fff;border:none;width:100%;cursor:pointer;}
        </style>
    </head>
    <body>
        <div class='card'>
            <h1>Select the Facebook Page to publish</h1>
            <p>This brand can only publish to one page at a time. You can reconnect later to switch.</p>
            <form method='POST' action='/api/web_meta_oauth_complete.php'>
                <input type='hidden' name='action' value='select'>
                <input type='hidden' name='client_id' value='{$client_id}'>
                {$options}
                <button class='btn' type='submit'>Connect selected page</button>
            </form>
        </div>
    </body>
    </html>";
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'select') {
    $client_id = (int)($_POST['client_id'] ?? 0);
    $page_id = $_POST['page_id'] ?? '';
    if (!$client_id || $page_id === '') {
        die('Missing page selection.');
    }
    $pages = $_SESSION['meta_pages'][$client_id]['pages'] ?? [];
    if (!$pages) {
        die('Page selection expired. Please reconnect.');
    }
    $selected = null;
    foreach ($pages as $page) {
        if ((string)($page['id'] ?? '') === (string)$page_id) {
            $selected = $page;
            break;
        }
    }
    if (!$selected) {
        die('Selected page not found. Please reconnect.');
    }
    $page_token = $selected['access_token'] ?? '';
    if ($page_token === '') {
        die('Missing page access token. Please reconnect.');
    }

    $instagram_account_id = null;
    $instagram_url = "https://graph.facebook.com/v21.0/{$page_id}?fields=instagram_business_account&access_token={$page_token}";
    $ch = curl_init($instagram_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $instagram_response = curl_exec($ch);
    curl_close($ch);
    $instagram_data = json_decode($instagram_response, true);
    $instagram_account_id = $instagram_data['instagram_business_account']['id'] ?? null;

    $db = get_db();
    $stmt = $db->prepare("
        INSERT INTO web_brand_profiles (
            client_id,
            meta_page_id,
            meta_page_token,
            meta_page_token_expires,
            instagram_account_id,
            meta_tokens_valid
        ) VALUES (?, ?, ?, NULL, ?, TRUE)
        ON DUPLICATE KEY UPDATE
            meta_page_id = VALUES(meta_page_id),
            meta_page_token = VALUES(meta_page_token),
            meta_page_token_expires = VALUES(meta_page_token_expires),
            instagram_account_id = VALUES(instagram_account_id),
            meta_tokens_valid = VALUES(meta_tokens_valid)
    ");
    $stmt->execute([
        $client_id,
        $page_id,
        $page_token,
        $instagram_account_id
    ]);
    unset($_SESSION['meta_pages'][$client_id]);
    log_activity($client_id, null, 'meta_connected_web', [
        'page_id' => $page_id,
        'has_instagram' => !empty($instagram_account_id)
    ]);
    die("
    <html>
    <body style='font-family: sans-serif; padding: 40px; text-align: center;'>
        <h1>✅ Integration Complete</h1>
        <p>Your Facebook and Instagram accounts are now connected.</p>
        <a href='/ui/app.html'>Return to dashboard</a>
    </body>
    </html>
    ");
}

// STEP 1: GENERATE LOGIN URL (GET with action=start)
if ($_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['action'] ?? '') === 'start') {
    $client_id = $_GET['client_id'] ?? null;

    if (!$client_id) {
        json_error('client_id required');
    }

    $db = get_db();
    $stmt = $db->prepare("SELECT id FROM clients WHERE id = ?");
    $stmt->execute([$client_id]);
    if (!$stmt->fetch()) {
        json_error('Client not found', 404);
    }

    $meta_app_id = META_APP_ID;
    $redirect_uri = BASE_URL . '/api/web_meta_oauth_complete.php?action=callback';

    $state = base64_encode(json_encode([
        'client_id' => $client_id,
        'timestamp' => time()
    ]));

    $scope = implode(',', [
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_posts',
        'pages_manage_engagement',
        'instagram_basic',
        'instagram_content_publish',
        'business_management'
    ]);

    $oauth_url = 'https://www.facebook.com/v21.0/dialog/oauth?' . http_build_query([
        'client_id' => $meta_app_id,
        'redirect_uri' => $redirect_uri,
        'state' => $state,
        'scope' => $scope,
        'response_type' => 'code'
    ]);

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
</html>");
}

// STEP 2: HANDLE CALLBACK FROM META (GET with action=callback)
if ($_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['action'] ?? '') === 'callback') {
    $code = $_GET['code'] ?? null;
    $state = $_GET['state'] ?? null;
    $error = $_GET['error'] ?? null;

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

    $state_data = json_decode(base64_decode($state), true);
    $client_id = $state_data['client_id'] ?? null;

    if (!$client_id) {
        die("Invalid state parameter");
    }

    $token_url = 'https://graph.facebook.com/v21.0/oauth/access_token?' . http_build_query([
        'client_id' => META_APP_ID,
        'client_secret' => META_APP_SECRET,
        'redirect_uri' => BASE_URL . '/api/web_meta_oauth_complete.php?action=callback',
        'code' => $code
    ]);

    $ch = curl_init($token_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);

    $token_data = json_decode($response, true);
    if (!isset($token_data['access_token'])) {
        die("Failed to get access token: " . $response);
    }

    $short_lived_token = $token_data['access_token'];

    $pages_url = 'https://graph.facebook.com/v21.0/me/accounts?access_token=' . $short_lived_token;

    $ch = curl_init($pages_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $pages_response = curl_exec($ch);

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
    if (count($pages_data['data']) > 1) {
        $_SESSION['meta_pages'][$client_id] = [
            'pages' => $pages_data['data'],
            'stored_at' => time()
        ];
        render_meta_page_picker((int)$client_id, $pages_data['data']);
    }

    $page = $pages_data['data'][0];
    $page_id = $page['id'];
    $page_token = $page['access_token'];

    $instagram_url = "https://graph.facebook.com/v21.0/{$page_id}?fields=instagram_business_account&access_token={$page_token}";

    $ch = curl_init($instagram_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $instagram_response = curl_exec($ch);

    $instagram_data = json_decode($instagram_response, true);
    $instagram_account_id = $instagram_data['instagram_business_account']['id'] ?? null;

    $db = get_db();
    $stmt = $db->prepare("
        INSERT INTO web_brand_profiles (
            client_id,
            meta_page_id,
            meta_page_token,
            meta_page_token_expires,
            instagram_account_id,
            meta_tokens_valid
        ) VALUES (?, ?, ?, NULL, ?, TRUE)
        ON DUPLICATE KEY UPDATE
            meta_page_id = VALUES(meta_page_id),
            meta_page_token = VALUES(meta_page_token),
            meta_page_token_expires = VALUES(meta_page_token_expires),
            instagram_account_id = VALUES(instagram_account_id),
            meta_tokens_valid = VALUES(meta_tokens_valid)
    ");
    $stmt->execute([
        $client_id,
        $page_id,
        $page_token,
        $instagram_account_id
    ]);

    log_activity($client_id, null, 'meta_connected_web', [
        'page_id' => $page_id,
        'has_instagram' => !empty($instagram_account_id)
    ]);

    die("
    <html>
    <body style='font-family: sans-serif; padding: 40px; text-align: center;'>
        <h1>✅ Integration Complete</h1>
        <p>Your Facebook and Instagram accounts are now connected.</p>
        <a href='/ui/app.html'>Return to dashboard</a>
    </body>
    </html>
    ");
}

json_error('Invalid request method', 405);
?>
