<?php
// ================================================================
// JOB MANAGEMENT ENDPOINTS
// Upload to: /public_html/api/jobs.php
// ================================================================

require_once '../config.php';

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
    
    json_response(['job' => $job]);
}

// ================================================================
// Save user input (text or images)
// ================================================================
if ($action === 'save_input') {
    $user_message = $input['user_message'] ?? null;
    $user_images = $input['user_images'] ?? null;  // Array of image URLs or filenames
    
    $stmt = $db->prepare("
        UPDATE creative_jobs 
        SET user_message = ?, user_images = ?, current_stage = 'generating_design'
        WHERE id = ?
    ");
    $stmt->execute([
        $user_message,
        $user_images ? json_encode($user_images) : null,
        $job_id
    ]);
    
    log_activity(null, $job_id, 'input_saved', [
        'has_message' => !empty($user_message),
        'image_count' => $user_images ? count($user_images) : 0
    ]);
    
    json_response([
        'status' => 'input_saved',
        'job_id' => $job_id,
        'next_step' => 'generate_design'
    ]);
}

// ================================================================
// Save generated design variations
// ================================================================
if ($action === 'save_design') {
    $design_variations = $input['design_variations'] ?? null;  // Array of image/video URLs
    $design_prompt = $input['design_prompt'] ?? null;
    
    if (!$design_variations || !is_array($design_variations)) {
        json_error('design_variations array required');
    }
    
    $stmt = $db->prepare("
        UPDATE creative_jobs 
        SET design_variations = ?, 
            design_prompt = ?,
            current_stage = 'awaiting_design_approval'
        WHERE id = ?
    ");
    $stmt->execute([
        json_encode($design_variations),
        $design_prompt,
        $job_id
    ]);
    
    log_activity(null, $job_id, 'design_generated', [
        'variation_count' => count($design_variations)
    ]);
    
    json_response([
        'status' => 'design_saved',
        'job_id' => $job_id,
        'variation_count' => count($design_variations),
        'next_step' => 'await_user_approval'
    ]);
}

// ================================================================
// User approves design
// ================================================================
if ($action === 'approve_design') {
    $approved_index = $input['approved_index'] ?? 0;  // Which variation (0, 1, 2)
    
    $stmt = $db->prepare("
        UPDATE creative_jobs 
        SET design_approved = TRUE,
            design_approved_at = NOW(),
            approved_design_index = ?,
            current_stage = 'generating_copy'
        WHERE id = ?
    ");
    $stmt->execute([$approved_index, $job_id]);
    
    log_activity(null, $job_id, 'design_approved', ['index' => $approved_index]);
    
    json_response([
        'status' => 'design_approved',
        'job_id' => $job_id,
        'approved_index' => $approved_index,
        'next_step' => 'generate_ad_copy'
    ]);
}

// ================================================================
// User rejects design - regenerate
// ================================================================
if ($action === 'reject_design') {
    $stmt = $db->prepare("
        UPDATE creative_jobs 
        SET rejection_count = rejection_count + 1,
            current_stage = 'generating_design'
        WHERE id = ?
    ");
    $stmt->execute([$job_id]);
    
    log_activity(null, $job_id, 'design_rejected', []);
    
    json_response([
        'status' => 'design_rejected',
        'job_id' => $job_id,
        'next_step' => 'regenerate_design'
    ]);
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
            current_stage = 'awaiting_copy_approval'
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
    $stmt = $db->prepare("
        UPDATE creative_jobs 
        SET ad_copy_approved = TRUE,
            ad_copy_approved_at = NOW(),
            current_stage = 'awaiting_publish_approval'
        WHERE id = ?
    ");
    $stmt->execute([$job_id]);
    
    log_activity(null, $job_id, 'copy_approved', []);
    
    json_response([
        'status' => 'copy_approved',
        'job_id' => $job_id,
        'next_step' => 'ask_publish_confirmation'
    ]);
}

// ================================================================
// User rejects ad copy - regenerate
// ================================================================
if ($action === 'reject_copy') {
    $stmt = $db->prepare("
        UPDATE creative_jobs 
        SET rejection_count = rejection_count + 1,
            current_stage = 'generating_copy'
        WHERE id = ?
    ");
    $stmt->execute([$job_id]);
    
    log_activity(null, $job_id, 'copy_rejected', []);
    
    json_response([
        'status' => 'copy_rejected',
        'job_id' => $job_id,
        'next_step' => 'regenerate_copy'
    ]);
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
    $products = $input['products'] ?? null;  // Array of {image, price, product_name}
    
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
// Approve template (for product sale) - then generate all products
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