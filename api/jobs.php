<?php
// ================================================================
// JOB MANAGEMENT ENDPOINTS
// Upload to: /public_html/api/jobs.php
// ================================================================

require_once '../config.php';

// ================================================================
// Helper function: Download WhatsApp media using existing endpoint
// ================================================================
function download_whatsapp_media($media_id, $job_id) {
    // Generate unique filename for this design
    $filename = 'design_job' . $job_id . '_' . time() . '_' . $media_id;
    
    // Call the existing get_whatsapp_media.php endpoint
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://getadly.com/api/get_whatsapp_media.php');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'X-API-Key: ' . ADMIN_API_KEY  // Use admin key for internal calls
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'media_id' => $media_id,
        'save_to_server' => true,
        'filename' => $filename
    ]));
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($http_code !== 200) {
        error_log("Failed to download WhatsApp media {$media_id}: HTTP {$http_code}");
        return null;
    }
    
    $result = json_decode($response, true);
    return $result['public_url'] ?? null;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed', 405);
}

// Check API key
$api_key = get_api_key_from_request();
if (!check_api_key($api_key)) {
    json_error('Unauthorized', 401);
}

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? null;
$job_id = $input['job_id'] ?? null;

if (!$action) {
    json_error('action required');
}

if (!$job_id) {
    json_error('job_id required');
}

$db = get_db();

// ================================================================
// Get job details
// ================================================================
if ($action === 'get_job') {
    $stmt = $db->prepare("SELECT * FROM creative_jobs WHERE id = ?");
    $stmt->execute([$job_id]);
    $job = $stmt->fetch();
    
    if (!$job) {
        json_error('Job not found', 404);
    }
    
    // Parse design_variations as array and convert to URLs if needed
    if ($job['design_variations']) {
        $variations = json_decode($job['design_variations'], true);
        
        if (is_array($variations)) {
            $publicUrls = [];
            
            foreach ($variations as $variation) {
                // Check if it's already a URL
                if (strpos($variation, 'http') === 0) {
                    $publicUrls[] = $variation;
                } else {
                    // It's a WhatsApp media ID - convert to URL
                    $publicUrl = download_whatsapp_media($variation, $job_id);
                    $publicUrls[] = $publicUrl ?: $variation; // Fallback to ID if conversion fails
                }
            }
            
            $job['design_variations'] = $publicUrls;
            
            // Compute approved_design_url from variations and index
            if (isset($job['approved_design_index'])) {
                $approvedIndex = (int)$job['approved_design_index'];
                $job['approved_design_url'] = $publicUrls[$approvedIndex] ?? null;
            }
        }
    }
    
    json_response(['job' => $job]);
}

// ================================================================
// Set processing lock (does NOT change current_stage)
// ================================================================
if ($action === 'set_lock') {
    $stmt = $db->prepare("
        UPDATE creative_jobs 
        SET processing_lock = TRUE,
            processing_lock_at = NOW()
        WHERE id = ?
    ");
    $stmt->execute([$job_id]);
    
    json_response([
        'status' => 'lock_set',
        'job_id' => $job_id
    ]);
}

// ================================================================
// Release processing lock (does NOT change current_stage)
// ================================================================
if ($action === 'release_lock') {
    $stmt = $db->prepare("
        UPDATE creative_jobs 
        SET processing_lock = FALSE,
            processing_lock_at = NULL
        WHERE id = ?
    ");
    $stmt->execute([$job_id]);
    
    json_response([
        'status' => 'lock_released',
        'job_id' => $job_id
    ]);
}


// ================================================================
// Save user input (text or images) -> optionally move to generate_design
// ================================================================
if ($action === 'save_input') {
    $user_message = $input['user_message'] ?? null;
    $user_images  = $input['user_images'] ?? null;
    $advance      = isset($input['advance']) ? (bool)$input['advance'] : true;

    // Detect if user_message is just a menu choice (1–4)
    $is_menu_choice = in_array(trim($user_message), ['1', '2', '3', '4'], true);

    // Verify job exists first
    $stmt = $db->prepare("SELECT id FROM creative_jobs WHERE id = ?");
    $stmt->execute([$job_id]);
    if (!$stmt->fetch()) {
        json_error('Job not found', 404);
    }

    try {
        // If the message is a menu choice, do not advance yet
        if ($is_menu_choice) {
            $advance = false;
        }

        $stmt = $db->prepare("
        UPDATE creative_jobs
        SET user_message = ?,
            user_images = ?,
            current_stage = 'generate_design'
        WHERE id = ?
        ");

        // if ($advance) {
        //     $stmt = $db->prepare("
        //         UPDATE creative_jobs
        //         SET user_message = ?,
        //             user_images = ?,
        //             current_stage = 'generate_design'
        //         WHERE id = ?
        //     ");
        // } else {
        //     $stmt = $db->prepare("
        //         UPDATE creative_jobs
        //         SET user_message = ?,
        //             user_images = ?,
        //             current_stage = 'await_user_input'
        //         WHERE id = ?
        //     ");
        // }

        $stmt->execute([
            $user_message,
            $user_images ? json_encode($user_images) : null,
            $job_id
        ]);

        log_activity(null, $job_id, 'input_saved', [
            'has_message' => !empty($user_message),
            'image_count' => $user_images ? count($user_images) : 0,
            'advance'     => $advance,
            'is_menu_choice' => $is_menu_choice
        ]);

        json_response([
            'status'    => 'input_saved',
            'job_id'    => $job_id,
            'next_step' => $advance ? 'generate_design' : 'await_user_input'
        ]);
    } catch (Throwable $e) {
        json_error('Database error during save_input: ' . $e->getMessage(), 500);
    }
}


// ================================================================
// Save generated design variations (Images or Videos)
// ================================================================
if ($action === 'save_design') {
    $design_variations = $input['design_variations'] ?? null;
    $design_prompt = $input['design_prompt'] ?? null;
    $media_type = $input['media_type'] ?? 'image'; // default to image
    
    if (!$design_variations || !is_array($design_variations)) {
        json_error('design_variations array required');
    }

    // Validate design_variations - accept both URLs and IDs
    foreach ($design_variations as $variation) {
        if (empty($variation)) {
            json_error('Empty value in design_variations');
        }
        
        // Accept either valid URL or numeric ID
        $is_url = filter_var($variation, FILTER_VALIDATE_URL);
        $is_id = is_numeric($variation);
        
        if (!$is_url && !$is_id) {
            json_error('Invalid value in design_variations - must be URL or numeric ID');
        }
    }

    $stmt = $db->prepare("
        UPDATE creative_jobs 
        SET design_variations = ?, 
            design_prompt = ?,
            media_type = ?,
            current_stage = 'await_design_approval'
        WHERE id = ?
    ");
    $stmt->execute([
        json_encode($design_variations),
        $design_prompt,
        $media_type,
        $job_id
    ]);
    
    log_activity(null, $job_id, 'design_generated', [
        'variation_count' => count($design_variations),
        'media_type' => $media_type,
        'urls' => $design_variations
    ]);
    
    json_response([
        'status' => 'design_saved',
        'job_id' => $job_id,
        'variation_count' => count($design_variations),
        'media_type' => $media_type,
        'next_step' => 'await_design_approval'
    ]);
}

// ================================================================
// User approves design
// ================================================================
if ($action === 'approve_design') {
    try {
        $approved_index = $input['approved_index'] ?? 0;

        // Validate job_id exists and get current design variations
        $stmt = $db->prepare("SELECT id, design_variations, job_type FROM creative_jobs WHERE id = ?");
        $stmt->execute([$job_id]);
        $job = $stmt->fetch();
        
        if (!$job) {
            json_error("Job not found for job_id: {$job_id}", 404);
        }

        // Convert all design variations to public URLs
        $publicUrls = [];
        $approvedDesignUrl = null;
        $conversionErrors = [];
        
        if ($job['design_variations']) {
            $variations = json_decode($job['design_variations'], true);
            
            if (is_array($variations)) {
                foreach ($variations as $index => $variation) {
                    $publicUrl = null;
                    
                    // Check if it's already a URL
                    if (strpos($variation, 'http') === 0) {
                        $publicUrl = $variation;
                    } else {
                        // It's a WhatsApp media ID - download and save it
                        $publicUrl = download_whatsapp_media($variation, $job_id);
                        
                        if (!$publicUrl) {
                            // Failed to download, log error but continue
                            $conversionErrors[] = "Failed to download media ID: {$variation}";
                            // Fallback: keep the media ID as-is
                            $publicUrl = $variation;
                        }
                    }
                    
                    $publicUrls[] = $publicUrl;
                    
                    // Get the approved design URL
                    if ($index === $approved_index) {
                        $approvedDesignUrl = $publicUrl;
                    }
                }
            }
        }

        // Update job: save public URLs, mark as approved
        $next_stage = $job['job_type'] === 'multi_mode' ? 'generate_multi_variants' : 'generate_ad_copy';
        $stmt = $db->prepare("
            UPDATE creative_jobs 
            SET design_approved = TRUE,
                design_approved_at = NOW(),
                approved_design_index = ?,
                design_variations = ?,
                template_approved = CASE WHEN job_type = 'multi_mode' THEN TRUE ELSE template_approved END,
                current_stage = ?
            WHERE id = ?
        ");
        $stmt->execute([
            $approved_index, 
            json_encode($publicUrls),
            $next_stage,
            $job_id
        ]);

        // Log activity
        try {
            log_activity(null, $job_id, 'design_approved', [
                'index' => $approved_index,
                'design_url' => $approvedDesignUrl,
                'total_variations' => count($publicUrls),
                'conversion_errors' => $conversionErrors
            ]);
        } catch (Throwable $logError) {
            // Don't break flow — include log warning
            $log_warn = "Warning: Failed to log activity: " . $logError->getMessage();
        }

        // Return success response
        $response = [
            'status' => 'design_approved',
            'job_id' => $job_id,
            'approved_index' => $approved_index,
            'approved_design_url' => $approvedDesignUrl,
            'design_variations' => $publicUrls,
            'next_step' => $next_stage
        ];

        // Include conversion errors if any
        if (!empty($conversionErrors)) {
            $response['warnings'] = $conversionErrors;
        }

        // Attach optional log warning if occurred
        if (!empty($log_warn)) {
            $response['debug'] = $log_warn;
        }

        json_response($response);

    } catch (PDOException $e) {
        json_error("Database error while approving design: " . $e->getMessage(), 500);
    } catch (Throwable $e) {
        json_error("Unexpected error during design approval: " . $e->getMessage(), 500);
    }
}

// ================================================================
// User rejects design - regenerate (with URL conversion)
// ================================================================
if ($action === 'reject_design') {
    try {
        $approved_index = $input['approved_index'] ?? 0;

        // Validate job_id exists and get current design variations
        $stmt = $db->prepare("SELECT id, design_variations FROM creative_jobs WHERE id = ?");
        $stmt->execute([$job_id]);
        $job = $stmt->fetch();
        
        if (!$job) {
            json_error("Job not found for job_id: {$job_id}", 404);
        }

        // Convert all design variations to public URLs (same as approve_design)
        $publicUrls = [];
        $conversionErrors = [];
        
        if ($job['design_variations']) {
            $variations = json_decode($job['design_variations'], true);
            
            if (is_array($variations)) {
                foreach ($variations as $index => $variation) {
                    $publicUrl = null;
                    
                    // Check if it's already a URL
                    if (strpos($variation, 'http') === 0) {
                        $publicUrl = $variation;
                    } else {
                        // It's a WhatsApp media ID - download and save it
                        $publicUrl = download_whatsapp_media($variation, $job_id);
                        
                        if (!$publicUrl) {
                            // Failed to download, log error but continue
                            $conversionErrors[] = "Failed to download media ID: {$variation}";
                            // Fallback: keep the media ID as-is
                            $publicUrl = $variation;
                        }
                    }
                    
                    $publicUrls[] = $publicUrl;
                }
            }
        }

        // Update job: increment rejection count, save URLs, return to generate_design
        $stmt = $db->prepare("
            UPDATE creative_jobs 
            SET rejection_count = COALESCE(rejection_count, 0) + 1,
                current_stage = 'generate_design',
                design_approved = FALSE,
                design_variations = ?
            WHERE id = ?
        ");
        $stmt->execute([
            json_encode($publicUrls),
            $job_id
        ]);

        // Log activity
        try {
            log_activity(null, $job_id, 'design_rejected', [
                'rejection_count' => ($job['rejection_count'] ?? 0) + 1,
                'design_urls' => $publicUrls,
                'conversion_errors' => $conversionErrors
            ]);
        } catch (Throwable $logError) {
            // Don't break flow
            $log_warn = "Warning: Failed to log activity: " . $logError->getMessage();
        }

        // Return success response
        $response = [
            'status' => 'generate_design',
            'job_id' => $job_id,
            'next_step' => 'regenerate_or_edit_design',
            'design_variations' => $publicUrls
        ];

        // Include conversion errors if any
        if (!empty($conversionErrors)) {
            $response['warnings'] = $conversionErrors;
        }

        // Attach optional log warning if occurred
        if (!empty($log_warn)) {
            $response['debug'] = $log_warn;
        }

        json_response($response);

    } catch (PDOException $e) {
        json_error("Database error while rejecting design: " . $e->getMessage(), 500);
    } catch (Throwable $e) {
        json_error("Unexpected error during design rejection: " . $e->getMessage(), 500);
    }
}

// ================================================================
// Save generated ad copy
// ================================================================
if ($action === 'save_copy') {
    $ad_copy = $input['ad_copy'] ?? null;
    
    if (!$ad_copy) {
        json_error('ad_copy required');
    }
    
    $stmt = $db->prepare("
        UPDATE creative_jobs 
        SET ad_copy = ?,
            current_stage = 'await_copy_approval'
        WHERE id = ?
    ");
    $stmt->execute([$ad_copy, $job_id]);
    
    log_activity(null, $job_id, 'copy_generated', []);
    
    json_response([
        'status' => 'copy_saved',
        'job_id' => $job_id,
        'ad_copy' => $ad_copy,
        'next_step' => 'await_copy_approval'
    ]);
}

// ================================================================
// User approves ad copy
// ================================================================
if ($action === 'approve_copy') {
    try {
        // Validate job_id exists and get current ad copy
        $stmt = $db->prepare("SELECT id, ad_copy FROM creative_jobs WHERE id = ?");
        $stmt->execute([$job_id]);
        $job = $stmt->fetch();
        
        if (!$job) {
            json_error("Job not found for job_id: {$job_id}", 404);
        }

        // Convert ad_copy to public URL if it's a media ID
        $adCopyUrl = null;
        $conversionError = null;
        
        if ($job['ad_copy']) {
            // Check if it's already a URL
            if (strpos($job['ad_copy'], 'http') === 0) {
                $adCopyUrl = $job['ad_copy'];
            } else {
                // It's a WhatsApp media ID - download and save it
                $adCopyUrl = download_whatsapp_media($job['ad_copy'], $job_id);
                
                if (!$adCopyUrl) {
                    // Failed to download, log error but continue
                    $conversionError = "Failed to download media ID: {$job['ad_copy']}";
                    // Fallback: keep the media ID as-is
                    $adCopyUrl = $job['ad_copy'];
                }
            }
        }

        // Update job: save public URL, mark as approved
        $stmt = $db->prepare("
            UPDATE creative_jobs 
            SET ad_copy_approved = TRUE,
                ad_copy_approved_at = NOW(),
                ad_copy = ?,
                current_stage = 'await_publish_approval'
            WHERE id = ?
        ");
        $stmt->execute([$adCopyUrl, $job_id]);

        // Log activity
        try {
            log_activity(null, $job_id, 'copy_approved', [
                'ad_copy_url' => $adCopyUrl,
                'conversion_error' => $conversionError
            ]);
        } catch (Throwable $logError) {
            $log_warn = "Warning: Failed to log activity: " . $logError->getMessage();
        }

        // Return success response
        $response = [
            'status' => 'copy_approved',
            'job_id' => $job_id,
            'ad_copy_url' => $adCopyUrl,
            'next_step' => 'await_publish_approval'
        ];

        if ($conversionError) {
            $response['warning'] = $conversionError;
        }

        if (!empty($log_warn)) {
            $response['debug'] = $log_warn;
        }

        json_response($response);

    } catch (PDOException $e) {
        json_error("Database error while approving copy: " . $e->getMessage(), 500);
    } catch (Throwable $e) {
        json_error("Unexpected error during copy approval: " . $e->getMessage(), 500);
    }
}

// ================================================================
// User undoes design approval - go back to edit design
// ================================================================
if ($action === 'undo_design_approval') {
    try {
        $stmt = $db->prepare("SELECT id, current_stage FROM creative_jobs WHERE id = ?");
        $stmt->execute([$job_id]);
        $job = $stmt->fetch();
        
        if (!$job) {
            json_error("Job not found for job_id: {$job_id}", 404);
        }

        // Only allow undo from stages after design approval
        $allowed_stages = ['generate_ad_copy', 'await_copy_approval'];
        if (!in_array($job['current_stage'], $allowed_stages)) {
            json_error("Cannot undo design approval from current stage: {$job['current_stage']}", 400);
        }

        // Revert to await_design_approval stage
        $stmt = $db->prepare("
            UPDATE creative_jobs 
            SET current_stage = 'await_design_approval',
                design_approved = FALSE,
                design_approved_at = NULL
            WHERE id = ?
        ");
        $stmt->execute([$job_id]);

        // Log activity
        try {
            log_activity(null, $job_id, 'design_approval_undone', [
                'previous_stage' => $job['current_stage']
            ]);
        } catch (Throwable $logError) {
            // ignore
        }

        json_response([
            'status' => 'design_approval_undone',
            'job_id' => $job_id,
            'current_stage' => 'await_design_approval'
        ]);

    } catch (PDOException $e) {
        json_error("Database error while undoing design approval: " . $e->getMessage(), 500);
    } catch (Throwable $e) {
        json_error("Unexpected error during undo: " . $e->getMessage(), 500);
    }
}

// ================================================================
// User undoes copy approval - go back to edit copy
// ================================================================
if ($action === 'undo_copy_approval') {
    try {
        $stmt = $db->prepare("SELECT id, current_stage FROM creative_jobs WHERE id = ?");
        $stmt->execute([$job_id]);
        $job = $stmt->fetch();
        
        if (!$job) {
            json_error("Job not found for job_id: {$job_id}", 404);
        }

        // Only allow undo from publish approval stage
        if ($job['current_stage'] !== 'await_publish_approval') {
            json_error("Cannot undo copy approval from current stage: {$job['current_stage']}", 400);
        }

        // Revert to await_copy_approval stage
        $stmt = $db->prepare("
            UPDATE creative_jobs 
            SET current_stage = 'await_copy_approval',
                ad_copy_approved = FALSE,
                ad_copy_approved_at = NULL
            WHERE id = ?
        ");
        $stmt->execute([$job_id]);

        // Log activity
        try {
            log_activity(null, $job_id, 'copy_approval_undone', []);
        } catch (Throwable $logError) {
            // ignore
        }

        json_response([
            'status' => 'copy_approval_undone',
            'job_id' => $job_id,
            'current_stage' => 'await_copy_approval'
        ]);

    } catch (PDOException $e) {
        json_error("Database error while undoing copy approval: " . $e->getMessage(), 500);
    } catch (Throwable $e) {
        json_error("Unexpected error during undo: " . $e->getMessage(), 500);
    }
}

// ================================================================
// User rejects ad copy - regenerate
// ================================================================
if ($action === 'reject_copy') {
    try {
        // Validate job_id exists and get current ad copy
        $stmt = $db->prepare("SELECT id, ad_copy, rejection_count FROM creative_jobs WHERE id = ?");
        $stmt->execute([$job_id]);
        $job = $stmt->fetch();
        
        if (!$job) {
            json_error("Job not found for job_id: {$job_id}", 404);
        }

        // Convert ad_copy to public URL if it's a media ID
        $adCopyUrl = null;
        $conversionError = null;
        
        if ($job['ad_copy']) {
            // Check if it's already a URL
            if (strpos($job['ad_copy'], 'http') === 0) {
                $adCopyUrl = $job['ad_copy'];
            } else {
                // It's a WhatsApp media ID - download and save it
                $adCopyUrl = download_whatsapp_media($job['ad_copy'], $job_id);
                
                if (!$adCopyUrl) {
                    // Failed to download, log error but continue
                    $conversionError = "Failed to download media ID: {$job['ad_copy']}";
                    // Fallback: keep the media ID as-is
                    $adCopyUrl = $job['ad_copy'];
                }
            }
        }

        // Update job: increment rejection count, save URL, return to generate_ad_copy
        $stmt = $db->prepare("
            UPDATE creative_jobs 
            SET rejection_count = COALESCE(rejection_count, 0) + 1,
                ad_copy = ?,
                current_stage = 'await_copy_approval'
            WHERE id = ?
        ");
        $stmt->execute([$adCopyUrl, $job_id]);

        // Log activity
        try {
            log_activity(null, $job_id, 'copy_rejected', [
                'rejection_count' => ($job['rejection_count'] ?? 0) + 1,
                'ad_copy_url' => $adCopyUrl,
                'conversion_error' => $conversionError
            ]);
        } catch (Throwable $logError) {
            $log_warn = "Warning: Failed to log activity: " . $logError->getMessage();
        }

        // Return success response
        $response = [
            'status' => 'await_copy_approval',
            'job_id' => $job_id,
            'ad_copy_url' => $adCopyUrl,
            'next_step' => 'regenerate_copy'
        ];

        if ($conversionError) {
            $response['warning'] = $conversionError;
        }

        if (!empty($log_warn)) {
            $response['debug'] = $log_warn;
        }

        json_response($response);

    } catch (PDOException $e) {
        json_error("Database error while rejecting copy: " . $e->getMessage(), 500);
    } catch (Throwable $e) {
        json_error("Unexpected error during copy rejection: " . $e->getMessage(), 500);
    }
}


// ================================================================
// User approves publishing
// ================================================================
if ($action === 'approve_publish') {
    $stmt = $db->prepare("
        UPDATE creative_jobs 
        SET publish_approved = TRUE,
            publish_approved_at = NOW(),
            current_stage = 'publishing'
        WHERE id = ?
    ");
    $stmt->execute([$job_id]);
    
    log_activity(null, $job_id, 'publish_approved', []);
    
    json_response([
        'status' => 'publish_approved',
        'job_id' => $job_id,
        'next_step' => 'publish_to_meta'
    ]);
}

// ================================================================
// Save bulk products (for product sale)
// ================================================================
if ($action === 'save_bulk_products') {
    $products = $input['products'] ?? null;
    
    if (!$products || !is_array($products)) {
        json_error('products array required');
    }
    
    $stmt = $db->prepare("
        UPDATE creative_jobs 
        SET bulk_products = ?,
            is_bulk_sale = TRUE
        WHERE id = ?
    ");
    $stmt->execute([json_encode($products), $job_id]);
    
    log_activity(null, $job_id, 'bulk_products_saved', ['count' => count($products)]);
    
    json_response([
        'status' => 'products_saved',
        'job_id' => $job_id,
        'product_count' => count($products),
        'next_step' => 'generate_template_design'
    ]);
}

// ================================================================
// Approve template (for product sale)
// ================================================================
if ($action === 'approve_template') {
    $stmt = $db->prepare("
        UPDATE creative_jobs 
        SET template_approved = TRUE
        WHERE id = ?
    ");
    $stmt->execute([$job_id]);
    
    log_activity(null, $job_id, 'template_approved', []);
    
    json_response([
        'status' => 'template_approved',
        'job_id' => $job_id,
        'next_step' => 'generate_all_product_images'
    ]);
}

// ================================================================
// Save Reel video URL
// ================================================================
if ($action === 'save_reel') {
    $reel_url = $input['reel_url'] ?? null;
    $duration = $input['duration_seconds'] ?? null;
    
    if (!$reel_url) {
        json_error('reel_url required');
    }
    
    $stmt = $db->prepare("
        UPDATE creative_jobs 
        SET reel_video_url = ?,
            reel_duration_seconds = ?
        WHERE id = ?
    ");
    $stmt->execute([$reel_url, $duration, $job_id]);
    
    log_activity(null, $job_id, 'reel_saved', ['duration' => $duration]);
    
    json_response([
        'status' => 'reel_saved',
        'job_id' => $job_id,
        'reel_url' => $reel_url
    ]);
}

json_error('Invalid action: ' . $action);