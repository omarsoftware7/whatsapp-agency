<?php
// ================================================================
// META PUBLISHING - Publish to Facebook & Instagram
// Upload to: /public_html/api/publish.php
// ================================================================

require_once '../config.php';
require_once __DIR__ . '/publish_helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed', 405);
}

// Check API key
$api_key = get_api_key_from_request();
if (!check_api_key($api_key)) {
    json_error('Unauthorized', 401);
}

$input = json_decode(file_get_contents('php://input'), true);
$job_id = $input['job_id'] ?? null;

if (!$job_id) {
    json_error('job_id required');
}

$db = get_db();

// Get job and client
$stmt = $db->prepare("
    SELECT j.*, c.* 
    FROM creative_jobs j
    JOIN clients c ON j.client_id = c.id
    WHERE j.id = ?
");
$stmt->execute([$job_id]);
$data = $stmt->fetch();

if (!$data) {
    json_error('Job not found', 404);
}

// Check Meta tokens
if (!$data['meta_tokens_valid'] || !$data['meta_page_token']) {
    json_error('Meta tokens not configured', 400);
}

// Get the approved design
$designs = json_decode($data['design_variations'], true);
$approved_index = $data['approved_design_index'] ?? 0;
$image_url = $designs[$approved_index] ?? null;

if (!$image_url) {
    json_error('No approved design found', 400);
}

$ad_copy = format_ad_copy_caption((string)($data['ad_copy'] ?? ''));
$page_token = $data['meta_page_token'];
$page_id = $data['meta_page_id'];
$ig_account_id = $data['instagram_account_id'];

$results = [];

// ================================================================
// Publish to Facebook Page
// ================================================================
if ($page_id) {
    $fb_url = "https://graph.facebook.com/" . META_GRAPH_API_VERSION . "/{$page_id}/photos";
    
    $fb_data = [
        'url' => $image_url,
        'caption' => $ad_copy,
        'access_token' => $page_token
    ];
    
    $ch = curl_init($fb_url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($fb_data));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $fb_response = curl_exec($ch);
    $fb_result = json_decode($fb_response, true);
    curl_close($ch);
    
    if (isset($fb_result['id'])) {
        $results['facebook'] = [
            'success' => true,
            'post_id' => $fb_result['id']
        ];
        
        // Save to database
        $db->prepare("UPDATE creative_jobs SET facebook_post_id = ? WHERE id = ?")
           ->execute([$fb_result['id'], $job_id]);
    } else {
        $results['facebook'] = [
            'success' => false,
            'error' => $fb_result['error']['message'] ?? 'Unknown error'
        ];
    }
}
// ================================================================
// Publish to Instagram (2-step process) - FIXED WITH PERMALINK
// ================================================================
if ($ig_account_id) {
    // Step 1: Create container
    $ig_url = "https://graph.facebook.com/" . META_GRAPH_API_VERSION . "/{$ig_account_id}/media";
    
    $ig_data = [
        'image_url' => $image_url,
        'caption' => $ad_copy,
        'access_token' => $page_token
    ];
    
    $ch = curl_init($ig_url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($ig_data));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    $ig_response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curl_error = curl_error($ch);
    curl_close($ch);
    
    if ($ig_response === false) {
        $results['instagram'] = [
            'success' => false,
            'error' => 'Connection failed: ' . $curl_error
        ];
    } else {
        $ig_result = json_decode($ig_response, true);
        
        if (isset($ig_result['id']) && $http_code == 200) {
            $container_id = $ig_result['id'];
            
            // Step 2: Poll for container status
            $max_attempts = 30;
            $attempt = 0;
            $container_ready = false;
            $last_error = null;
            
            while ($attempt < $max_attempts && !$container_ready) {
                sleep(2);
                
                $status_url = "https://graph.facebook.com/" . META_GRAPH_API_VERSION . "/{$container_id}?fields=status_code&access_token={$page_token}";
                
                $ch = curl_init($status_url);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_TIMEOUT, 10);
                $status_response = curl_exec($ch);
                $status_http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);
                
                if ($status_response === false || $status_http_code != 200) {
                    $last_error = "Failed to check status (HTTP {$status_http_code})";
                    $attempt++;
                    continue;
                }
                
                $status_data = json_decode($status_response, true);
                
                if (!isset($status_data['status_code'])) {
                    $last_error = "Invalid status response";
                    $attempt++;
                    continue;
                }
                
                if ($status_data['status_code'] === 'FINISHED') {
                    $container_ready = true;
                } elseif ($status_data['status_code'] === 'ERROR') {
                    $last_error = "Container processing failed";
                    break;
                }
                
                $attempt++;
            }
            
            if ($container_ready) {
                // Step 3: Publish container
                $publish_url = "https://graph.facebook.com/" . META_GRAPH_API_VERSION . "/{$ig_account_id}/media_publish";
                
                $publish_data = [
                    'creation_id' => $container_id,
                    'access_token' => $page_token
                ];
                
                $ch = curl_init($publish_url);
                curl_setopt($ch, CURLOPT_POST, true);
                curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($publish_data));
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_TIMEOUT, 30);
                $publish_response = curl_exec($ch);
                $publish_http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);
                
                if ($publish_response === false) {
                    $results['instagram'] = [
                        'success' => false,
                        'error' => 'Publish connection failed'
                    ];
                } else {
                    $publish_result = json_decode($publish_response, true);
                    
                    if (isset($publish_result['id']) && $publish_http_code == 200) {
                        $media_id = $publish_result['id'];
                        
                        // Step 4: Get permalink - FIXED VERSION
                        $permalink = null;
                        
                        // Wait a moment for Instagram to process
                        sleep(2);
                        
                        $permalink_url = "https://graph.facebook.com/" . META_GRAPH_API_VERSION . "/{$media_id}?fields=permalink&access_token={$page_token}";
                        
                        $ch = curl_init($permalink_url);
                        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
                        $permalink_response = curl_exec($ch);
                        $permalink_http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                        curl_close($ch);
                        
                        if ($permalink_response && $permalink_http_code == 200) {
                            $permalink_data = json_decode($permalink_response, true);
                            $permalink = $permalink_data['permalink'] ?? null;
                        }
                        
                        $results['instagram'] = [
                            'success' => true,
                            'post_id' => $media_id,
                            'permalink' => $permalink
                        ];
                        
                        // Save to database
                        $db->prepare("UPDATE creative_jobs SET instagram_post_id = ?, instagram_permalink = ? WHERE id = ?")
                           ->execute([$media_id, $permalink, $job_id]);
                    } else {
                        $results['instagram'] = [
                            'success' => false,
                            'error' => $publish_result['error']['message'] ?? 'Publish failed',
                            'error_code' => $publish_result['error']['code'] ?? null
                        ];
                    }
                }
            } else {
                $results['instagram'] = [
                    'success' => false,
                    'error' => $last_error ?? 'Container processing timeout'
                ];
            }
        } else {
            $results['instagram'] = [
                'success' => false,
                'error' => $ig_result['error']['message'] ?? 'Container creation failed',
                'error_code' => $ig_result['error']['code'] ?? null,
                'http_code' => $http_code
            ];
        }
    }
}

// ================================================================
// Mark job as completed
// ================================================================
$all_success = true;
foreach ($results as $platform => $result) {
    if (!$result['success']) {
        $all_success = false;
        break;
    }
}

if ($all_success) {
    $db->prepare("
        UPDATE creative_jobs 
        SET current_stage = 'completed', 
            published_at = NOW(),
            processing_time_ms = TIMESTAMPDIFF(MICROSECOND, created_at, NOW()) / 1000
        WHERE id = ?
    ")->execute([$job_id]);
    
    // Deduct credit
    $db->prepare("
        UPDATE clients 
        SET trial_credits = GREATEST(trial_credits - 1, 0),
            monthly_credits = IF(trial_credits > 0, monthly_credits, GREATEST(monthly_credits - 1, 0))
        WHERE id = ?
    ")->execute([$data['client_id']]);
    
    // Increment content strategy counter if applicable
    if ($data['job_type'] === 'content_strategy') {
        $db->prepare("
            UPDATE clients 
            SET content_posts_this_week = content_posts_this_week + 1 
            WHERE id = ?
        ")->execute([$data['client_id']]);
    }
}

log_activity($data['client_id'], $job_id, 'published', $results);

json_response([
    'status' => $all_success ? 'published' : 'partial_failure',
    'job_id' => $job_id,
    'results' => $results
]);
?>
