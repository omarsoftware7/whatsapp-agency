<?php
// ================================================================
// ONBOARDING - Process logo upload and business description
// Upload to: /public_html/api/onboarding.php
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
$client_id = $input['client_id'] ?? null;
$step = $input['step'] ?? null;

if (!$client_id) {
    json_error('client_id required');
}

$db = get_db();
$stmt = $db->prepare("SELECT * FROM clients WHERE id = ?");
$stmt->execute([$client_id]);
$client = $stmt->fetch();

if (!$client) {
    json_error('Client not found', 404);
}

// ================================================================
// STEP 1: Logo uploaded - save file and extract colors via GPT-5
// ================================================================
if ($step === 'logo_uploaded') {
    $logo_url = $input['logo_url'] ?? null;  // WhatsApp media URL
    $logo_filename = $input['logo_filename'] ?? 'logo_' . $client_id . '.png';
    
    if (!$logo_url) {
        json_error('logo_url required');
    }
    
    // Download logo from WhatsApp
    $logo_data = file_get_contents($logo_url);
    if (!$logo_data) {
        json_error('Failed to download logo');
    }
    
    // Save logo
    $logo_path = LOGO_DIR . $logo_filename;
    file_put_contents($logo_path, $logo_data);
    
    // Update client
    $stmt = $db->prepare("
        UPDATE clients 
        SET logo_filename = ?, onboarding_step = 'describe_business' 
        WHERE id = ?
    ");
    $stmt->execute([$logo_filename, $client_id]);
    
    log_activity($client_id, null, 'logo_uploaded', ['filename' => $logo_filename]);
    
    json_response([
        'status' => 'logo_saved',
        'client_id' => $client_id,
        'logo_filename' => $logo_filename,
        'logo_path' => $logo_path,
        'next_step' => 'analyze_logo_with_gpt5',
        'gpt5_instructions' => 'Analyze this logo image and extract: 1) Primary brand color (hex), 2) Secondary color (hex), 3) Ignore white/black backgrounds, pick meaningful brand colors'
    ]);
}

// ================================================================
// STEP 2: GPT-5 analyzed logo - save colors
// ================================================================
if ($step === 'logo_analyzed') {
    $primary_color = $input['primary_color'] ?? null;
    $secondary_color = $input['secondary_color'] ?? null;
    
    if (!$primary_color || !$secondary_color) {
        json_error('primary_color and secondary_color required');
    }
    
    $stmt = $db->prepare("
        UPDATE clients 
        SET primary_color = ?, secondary_color = ? 
        WHERE id = ?
    ");
    $stmt->execute([$primary_color, $secondary_color, $client_id]);
    
    json_response([
        'status' => 'colors_saved',
        'client_id' => $client_id,
        'next_step' => 'ask_for_business_description'
    ]);
}

// ================================================================
// STEP 3: Business description received - GPT-5 infers everything
// ================================================================
if ($step === 'business_described') {
    $description = $input['business_description'] ?? null;
    
    if (!$description) {
        json_error('business_description required');
    }
    
    // Save description
    $stmt = $db->prepare("UPDATE clients SET business_description = ? WHERE id = ?");
    $stmt->execute([$description, $client_id]);
    
    json_response([
        'status' => 'description_saved',
        'client_id' => $client_id,
        'description' => $description,
        'next_step' => 'infer_brand_profile_with_gpt5',
        'gpt5_instructions' => 'From this business description, infer: 1) business_name, 2) industry, 3) brand_tone (professional/playful/luxury/minimal/vibrant), 4) font_preference (modern-sans/elegant-serif/bold-display), 5) default_language (ar/he/en), 6) business_phone (if mentioned), 7) business_address (if mentioned)'
    ]);
}

// ================================================================
// STEP 4: GPT-5 inferred brand profile - save everything
// ================================================================
if ($step === 'profile_inferred') {
    $profile = $input['brand_profile'] ?? null;
    
    if (!$profile) {
        json_error('brand_profile required');
    }
    
    // Update all fields
    $stmt = $db->prepare("
        UPDATE clients 
        SET business_name = ?,
            industry = ?,
            brand_tone = ?,
            font_preference = ?,
            default_language = ?,
            business_phone = ?,
            business_address = ?,
            onboarding_complete = TRUE,
            onboarding_step = 'complete'
        WHERE id = ?
    ");
    $stmt->execute([
        $profile['business_name'] ?? null,
        $profile['industry'] ?? null,
        $profile['brand_tone'] ?? 'professional',
        $profile['font_preference'] ?? 'modern-sans',
        $profile['default_language'] ?? 'en',
        $profile['business_phone'] ?? null,
        $profile['business_address'] ?? null,
        $client_id
    ]);
    
    log_activity($client_id, null, 'onboarding_complete', $profile);
    
    json_response([
        'status' => 'onboarding_complete',
        'client_id' => $client_id,
        'brand_profile' => $profile,
        'message' => 'Client can now create content'
    ]);
}

json_error('Invalid step: ' . $step);
?>