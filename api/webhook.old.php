<?php
// ================================================================
// WHATSAPP WEBHOOK - Receives messages from WhatsApp Business API
// Upload to: /public_html/api/webhook.php
// ================================================================

require_once '../config.php';

// TEMPORARY DEBUG LOGGING
file_put_contents('../webhook_debug.txt',
    date('Y-m-d H:i:s') . "\n" .
    "Method: " . $_SERVER['REQUEST_METHOD'] . "\n" .
    "Input: " . file_get_contents('php://input') . "\n\n",
    FILE_APPEND
);

// Verify webhook (GET request from Meta)
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $mode = $_GET['hub_mode'] ?? '';
    $token = $_GET['hub_verify_token'] ?? '';
    $challenge = $_GET['hub_challenge'] ?? '';

    if ($mode === 'subscribe' && $token === WA_VERIFY_TOKEN) {
        echo $challenge;
        exit;
    } else {
        http_response_code(403);
        exit;
    }
}

// Handle incoming messages (POST request)
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed', 405);
}

/* If you want API key back later, re-enable:
$api_key = get_api_key_from_request();
if (!check_api_key($api_key)) {
    json_error('Unauthorized', 401);
}
*/

// Get webhook payload
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    json_error('Invalid JSON');
}

// Parse WhatsApp message structure
$entry    = $data['entry'][0]   ?? null;
$changes  = $entry['changes'][0] ?? null;
$value    = $changes['value']    ?? null;
$messages = $value['messages']   ?? [];

// If no user message events → ONLY now return "ignored"
if (empty($messages)) {
    json_response(['status' => 'ignored', 'reason' => 'no_messages']);
}

$message       = $messages[0];
$from          = $message['from'] ?? '';                // phone
$message_type  = $message['type'] ?? 'text';
$text          = '';

// Handle text messages
if (isset($message['text']['body']) && is_string($message['text']['body'])) {
    $text = trim($message['text']['body']);
}


// Handle image messages
$image_url = null;
$image_caption = '';

if ($message_type === 'image') {
    $media_id = $message['image']['id'] ?? null;
    $image_caption = $message['image']['caption'] ?? ''; // Extract caption
    
    // Download image from WhatsApp
    if ($media_id) {
        $media_url_endpoint = "https://graph.facebook.com/" . META_GRAPH_API_VERSION . "/{$media_id}";
        
        $ch = curl_init($media_url_endpoint);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . WA_ACCESS_TOKEN
        ]);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($http_code === 200) {
            $media_data = json_decode($response, true);
            $media_download_url = $media_data['url'] ?? null;
            
            if ($media_download_url) {
                // Download actual file
                $ch = curl_init($media_download_url);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_HTTPHEADER, [
                    'Authorization: Bearer ' . WA_ACCESS_TOKEN
                ]);
                
                $file_data = curl_exec($ch);
                curl_close($ch);
                
                if ($file_data) {
                    // Save to server
                    $filename = 'product_' . time() . '_' . uniqid() . '.png';
                    $save_path = PRODUCT_DIR . $filename;
                    file_put_contents($save_path, $file_data);
                    
                    $image_url = BASE_URL . '/uploads/products/' . $filename;
                }
            }
        }
    }
}

// Get or create client
$db = get_db();
$stmt = $db->prepare("SELECT * FROM clients WHERE phone_number = ?");
$stmt->execute([$from]);
$client = $stmt->fetch();


function get_active_job(PDO $db, int $client_id) {
    $stmt = $db->prepare("
        SELECT *
        FROM creative_jobs
        WHERE client_id = ? AND completed_at IS NULL
        ORDER BY id DESC
        LIMIT 1
    ");
    $stmt->execute([$client_id]);
    return $stmt->fetch();
}

function get_current_status(PDO $db, int $client_id, int $job_id): ?string {
    $stmt = $db->prepare("
        SELECT event_type
        FROM activity_log
        WHERE client_id = ? AND job_id = ?
        ORDER BY created_at DESC
        LIMIT 1
    ");
    $stmt->execute([$client_id, $job_id]);
    $row = $stmt->fetch();
    return $row['event_type'] ?? null;
}

if (!$client) {
    // New client - create record
    $name = $value['contacts'][0]['profile']['name'] ?? 'Unknown';
    $stmt = $db->prepare("
        INSERT INTO clients (phone_number, whatsapp_name, created_at)
        VALUES (?, ?, NOW())
    ");
    $stmt->execute([$from, $name]);
    $client_id = $db->lastInsertId();

    log_activity($client_id, null, 'client_created', ['phone' => $from]);

    // Start onboarding
    json_response([
        'status'    => 'onboarding_required',
        'client_id' => (int)$client_id,
        'phone'     => $from,
        'step'      => 'upload_logo',
        'message'   => 'New client needs onboarding'
    ]);
}

$client_id = (int)$client['id'];

// If onboarding not complete → ALWAYS return onboarding_required
if (!(int)$client['onboarding_complete']) {
    json_response([
        'status'        => 'onboarding_required',
        'client_id'     => $client_id,
        'phone'         => $from,
        'step'          => $client['onboarding_step'],
        'message_type'  => $message_type,
        'message_data'  => $message
    ]);
}

// Credits check (no_credits if no active sub and no balance)
$total_credits = (int)$client['trial_credits'] + (int)$client['monthly_credits'];
if ($total_credits <= 0 && $client['subscription_status'] !== 'active') {
    json_response([
        'status'    => 'no_credits',
        'client_id' => $client_id,
        'phone'     => $from,
        'message'   => 'Subscription required - no credits remaining'
    ]);
}

// // Log the message
// log_activity($client_id, null, 'message_received', [
//     'message_type' => $message_type,
//     'text'         => $text
// ]);

if (strtolower($text) === 'abort#') {
    try {
        $activeJob = get_active_job($db, (int)$client['id']);
        if ($activeJob) {
            $stmt = $db->prepare("DELETE FROM creative_jobs WHERE id = ?");
            $stmt->execute([$activeJob['id']]);
            log_activity($client_id, null, 'job_aborted', ['job_id' => $activeJob['id']]);
        }

        // Tell the user the job was cancelled and show menu options
        $menu_message = "❌ Your previous job has been cancelled.\n\n" .
                        "Let's start again!\n\n" .
                        "What would you like to create?\n\n" .
                        "1️⃣ Announcement\n" .
                        "2️⃣ Product Sale\n" .
                        "3️⃣ Reel Video\n" .
                        "4️⃣ Content Strategy Post\n\n" .
                        "5️⃣ UGC Video\n\n" .
                        "Reply with a number (1–4).\n\n" .
                        "💡 Tip: You can restart anytime\n" .
                        "• Send *abort#* to cancel your current job\n" .
                        "• Send *forget#* to restart onboarding";


        json_response([
            'status'     => 'show_menu',
            'client_id'  => $client_id,
            'phone'      => $from,
            'message'    => $menu_message
        ]);
    } catch (Throwable $e) {
        json_error('abort_failed: ' . $e->getMessage(), 500);
    }
}

if (strtolower($text) === 'forget#') {
    try {
        $stmt = $db->prepare("
            UPDATE clients
            SET onboarding_complete = 0,
                onboarding_step = 'upload_logo'
            WHERE id = ?
        ");
        $stmt->execute([$client_id]);

        log_activity($client_id, null, 'onboarding_reset', []);

        json_response([
            'status' => 'onboarding_required',
            'client_id' => $client_id,
            'phone' => $from,
            'step' => 'upload_logo',
            'message' => "Your onboarding has been reset. Let's begin again.\n\n$notify_message"
        ]);
    } catch (Throwable $e) {
        json_error('forget_failed: ' . $e->getMessage(), 500);
    }
}

// Menu selection (strict)
if (in_array($text, ['1', '2', '3', '4', '5'], true)) {
    $job_types = [
        '1' => 'announcement',
        '2' => 'product_sale',
        '3' => 'reel',
        '4' => 'content_strategy',
        '5' => 'ugc_video'
    ];
    $job_type = $job_types[$text];

    // Weekly limit for content strategy
    if ($job_type === 'content_strategy') {
        $week_reset = $client['content_week_reset_date']; // Y-m-d or null
        $today = date('Y-m-d');

        // Initialize/reset window if missing or passed
        if (!$week_reset || $week_reset < $today) {
            $week_reset = date('Y-m-d', strtotime('+7 days'));
            $upd = $db->prepare("
                UPDATE clients
                SET content_posts_this_week = 0,
                    content_week_reset_date = ?
                WHERE id = ?
            ");
            $upd->execute([$week_reset, $client_id]);
            $client['content_posts_this_week'] = 0;
        }

        if ((int)$client['content_posts_this_week'] >= 4) {
            $days_left = max(0, (int)ceil((strtotime($week_reset) - time()) / 86400));
            json_response([
                'status'  => 'limit_reached',
                'message' => 'Content strategy limit: 4 posts per week. Resets in ' . $days_left . ' day(s)'
            ]);
        }
    }

    // Create job (stage value here doesn't matter—frontend only expects "job_created")
    $stmt = $db->prepare("
        INSERT INTO creative_jobs (client_id, job_type, current_stage, created_at)
        VALUES (?, ?, 'pending', NOW())
    ");
    $stmt->execute([$client_id, $job_type]);
    $job_id = (int)$db->lastInsertId();

    log_activity($client_id, $job_id, 'job_created', ['job_type' => $job_type]);

    json_response([
        'status'     => 'job_created',
        'job_id'     => $job_id,
        'client_id'  => $client_id,
        'phone'      => $from,
        'job_type'   => $job_type,
        'next_step'  => 'await_user_input',
        'user_message'  => $text
    ]);
}


// If there is an active job, return latest event type; fallback to current_stage
try {
    $activeJob = get_active_job($db, $client_id);
} catch (Throwable $e) {
    json_error('db_error_active_job: ' . $e->getMessage(), 500);
}

if ($activeJob) {
    // Determine current stage (normalize legacy)
    $current_stage = $activeJob['current_stage'] ?? 'await_user_input';
    
    if ($current_stage === 'pending' || !$current_stage) {
        $current_stage = 'await_user_input';
    }

    // Handle product/UGC image upload
    if ($message_type === 'image' && $image_url) {
        $job_type = $activeJob['job_type'];
        
        // Check if this job type accepts images (product_sale OR ugc_video)
        if (in_array($job_type, ['product_sale', 'ugc_video'])) {
            // Get existing product images
            $product_images = json_decode($activeJob['product_images'] ?? '[]', true);
            if (!is_array($product_images)) {
                $product_images = [];
            }
            
            // Add new image
            $product_images[] = $image_url;
            
            // Determine user text: caption if exists, otherwise empty
            $user_message_to_save = !empty($image_caption) ? trim($image_caption) : '';
            
            // Update job with image and text
            $stmt = $db->prepare("
                UPDATE creative_jobs 
                SET product_images = ?, 
                    user_images = ?,
                    user_message = CASE 
                        WHEN user_message IS NULL OR user_message = '' 
                        THEN ? 
                        ELSE CONCAT(user_message, ' ', ?) 
                    END
                WHERE id = ?
            ");
            $stmt->execute([
                json_encode($product_images),
                json_encode($product_images),
                $user_message_to_save,
                $user_message_to_save,
                $activeJob['id']
            ]);
    
            log_activity($client_id, $activeJob['id'], 'product_image_received', [
                'image_url' => $image_url,
                'has_caption' => !empty($image_caption)
            ]);
    
            // Return status with product image
            json_response([
                'status'        => 'product_image_received',
                'job_id'        => (int)$activeJob['id'],
                'client_id'     => $client_id,
                'phone'         => $from,
                'job_type'      => $job_type,
                'next_step'     => $current_stage,
                'product_image' => $image_url,
                'product_images' => $product_images, // Array of all images
                'user_message'     => $user_message_to_save, // Caption if exists
                'has_caption'   => !empty($image_caption),
                'message_type'  => 'image'
            ]);
        }
    }
    
    // Fetch latest activity event
    $event_status = null;
    try {
        $event_status = get_current_status($db, $client_id, (int)$activeJob['id']);
    } catch (Throwable $e) {
        $log_warn = 'warn: get_current_status failed: ' . $e->getMessage();
    }

    // Build response
    $resp = [
        'status'        => $event_status ?? $current_stage,
        'job_id'        => (int)$activeJob['id'],
        'client_id'     => $client_id,
        'phone'         => $from,
        'job_type'      => $activeJob['job_type'],
        'next_step'     => $current_stage,
        'user_message'  => $text,
        'message_type'  => $message_type,
        'product_images' => json_decode($activeJob['product_images'] ?? '[]', true)
    ];

    if ($image_url) {
        $resp['image_url'] = $image_url;
    }

    if (!empty($log_warn)) {
        $resp['debug'] = $log_warn;
    }

    json_response($resp);
}


// Any other message → show menu (no stage/status leaking)
json_response([
    'status'    => 'show_menu',
    'client_id' => $client_id,
    'phone'     => $from,
    'message'   => $text
]);
