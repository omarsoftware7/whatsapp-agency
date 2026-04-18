<?php
require_once '../config.php';
require_once __DIR__ . '/ai_helpers.php';

session_start();

if (!isset($_SESSION['web_user_id'])) {
    json_error('Unauthorized', 401);
}

$db = get_db();
$user_id = (int)$_SESSION['web_user_id'];
$user_role = $_SESSION['web_user_role'] ?? 'user';
$user_max_brands = $_SESSION['web_user_max_brands'] ?? 1;

function generate_web_phone(PDO $db) {
    for ($i = 0; $i < 5; $i++) {
        $candidate = 'web' . base_convert((string)(time() . rand(100, 999)), 10, 36);
        $candidate = substr($candidate, 0, 20);
        $stmt = $db->prepare("SELECT id FROM clients WHERE phone_number = ?");
        $stmt->execute([$candidate]);
        if (!$stmt->fetch()) {
            return $candidate;
        }
    }
    return 'web' . substr(uniqid(), -16);
}

function ensure_brand_owner(PDO $db, int $user_id, int $client_id, string $role = 'user') {
    if ($role === 'admin') {
        return;
    }
    $stmt = $db->prepare("
        SELECT client_id
        FROM web_user_clients
        WHERE web_user_id = ? AND client_id = ?
    ");
    $stmt->execute([$user_id, $client_id]);
    if (!$stmt->fetch()) {
        json_error('Brand not found', 404);
    }
}

function infer_brand_profile(string $description, string $category, string $country): array {
    $result = [
        'brand_tone' => 'professional',
        'font_preference' => 'modern-sans',
        'default_language' => 'en'
    ];
    
    // Infer language from country
    $arabic_countries = ['Saudi Arabia', 'United Arab Emirates', 'Qatar', 'Kuwait', 'Bahrain', 'Oman', 'Jordan', 'Egypt', 'Lebanon'];
    if ($country === 'Israel') {
        $result['default_language'] = 'he';
    } elseif (in_array($country, $arabic_countries)) {
        $result['default_language'] = 'ar';
    }
    
    // Use Gemini to infer brand tone and font preference
    try {
        $prompt = "Based on this business description and category, determine the brand personality.\n\n" .
            "Category: {$category}\n" .
            "Description: {$description}\n\n" .
            "Analyze and return ONLY a JSON object with:\n" .
            "- brand_tone: one of 'professional', 'playful', 'luxury', 'minimal', 'vibrant'\n" .
            "- font_preference: one of 'modern-sans', 'elegant-serif', 'bold-display'\n\n" .
            "Example: {\"brand_tone\": \"professional\", \"font_preference\": \"modern-sans\"}";
        
        $response = call_gemini_text($prompt);
        
        if (isset($response['candidates'][0]['content']['parts'][0]['text'])) {
            $text = $response['candidates'][0]['content']['parts'][0]['text'];
            
            // Extract brand_tone
            if (preg_match('/"brand_tone"\s*:\s*"(professional|playful|luxury|minimal|vibrant)"/i', $text, $match)) {
                $result['brand_tone'] = strtolower($match[1]);
            }
            
            // Extract font_preference
            if (preg_match('/"font_preference"\s*:\s*"(modern-sans|elegant-serif|bold-display)"/i', $text, $match)) {
                $result['font_preference'] = strtolower($match[1]);
            }
        }
    } catch (Exception $e) {
        error_log("Brand profile inference failed: " . $e->getMessage());
    }
    
    return $result;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $client_id = isset($_GET['client_id']) ? (int)$_GET['client_id'] : 0;
    if ($client_id) {
        ensure_brand_owner($db, $user_id, $client_id, $user_role);
        $stmt = $db->prepare("
            SELECT c.*,
                   wbp.category,
                   wbp.website,
                   wbp.instagram_handle,
                   wbp.target_audience,
                   wbp.price_range,
                   wbp.facebook_page_url,
                   wbp.instagram_page_url,
                   wbp.country,
                   wbp.heard_about
            FROM clients c
            LEFT JOIN web_brand_profiles wbp ON wbp.client_id = c.id
            WHERE c.id = ?
            LIMIT 1
        ");
        $stmt->execute([$client_id]);
        $item = $stmt->fetch();
        json_response(['items' => $item ? [$item] : []]);
    }

    $stmt = $db->prepare("
        SELECT c.*,
               wbp.category,
               wbp.website,
               wbp.instagram_handle,
               wbp.target_audience,
               wbp.price_range,
               wbp.facebook_page_url,
               wbp.instagram_page_url,
               wbp.country,
               wbp.heard_about
        FROM web_user_clients wuc
        JOIN clients c ON c.id = wuc.client_id
        LEFT JOIN web_brand_profiles wbp ON wbp.client_id = c.id
        WHERE wuc.web_user_id = ?
        ORDER BY c.created_at DESC
    ");
    $stmt->execute([$user_id]);
    $items = $stmt->fetchAll();
    json_response(['items' => $items]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed', 405);
}

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? 'create';

if ($action === 'create') {
    if ($user_role !== 'admin') {
        $stmt = $db->prepare("SELECT COUNT(*) as count FROM web_user_clients WHERE web_user_id = ?");
        $stmt->execute([$user_id]);
        $count = (int)($stmt->fetch()['count'] ?? 0);
        if ($user_max_brands !== null && $user_max_brands > 0 && $count >= $user_max_brands) {
            json_error('Brand limit reached. Contact us to upgrade your plan.');
        }
    }
    $business_name = trim($input['business_name'] ?? '');
    $category = trim($input['category'] ?? '');
    $description = trim($input['description'] ?? '');
    $location = trim($input['location'] ?? '');
    $business_phone = trim($input['business_phone'] ?? '');
    $country = trim($input['country'] ?? 'Israel');

    if ($business_name === '' || $category === '' || $description === '') {
        json_error('business_name, category, and description required');
    }

    $phone_number = trim($input['business_phone'] ?? '');
    if ($phone_number === '') {
        $phone_number = generate_web_phone($db);
    }
    $onboarding_complete = !empty($input['onboarding_complete']) ? 1 : 0;
    $onboarding_step = $onboarding_complete ? 'complete' : 'web_onboarding';
    
    // Infer brand profile from description
    $inferred = infer_brand_profile($description, $category, $country);

    $stmt = $db->prepare("
        INSERT INTO clients (
            phone_number,
            business_name,
            industry,
            business_description,
            business_address,
            business_phone,
            brand_tone,
            font_preference,
            default_language,
            onboarding_complete,
            onboarding_step,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    $stmt->execute([
        $phone_number,
        $business_name,
        $category,
        $description,
        $location,
        $business_phone ?: null,
        $inferred['brand_tone'],
        $inferred['font_preference'],
        $inferred['default_language'],
        $onboarding_complete,
        $onboarding_step
    ]);

    $client_id = (int)$db->lastInsertId();

    $owner_user_id = $user_id;
    if ($user_role === 'admin' && !empty($input['owner_user_id'])) {
        $owner_user_id = (int)$input['owner_user_id'];
        $check = $db->prepare("SELECT id FROM web_users WHERE id = ?");
        $check->execute([$owner_user_id]);
        if (!$check->fetch()) {
            json_error('owner_user_id not found');
        }
    }
    $stmt = $db->prepare("
        INSERT INTO web_user_clients (web_user_id, client_id, created_at)
        VALUES (?, ?, NOW())
    ");
    $stmt->execute([$owner_user_id, $client_id]);

    $profile_stmt = $db->prepare("
        INSERT INTO web_brand_profiles (
            client_id,
            category,
            website,
            instagram_handle,
            target_audience,
            price_range,
            facebook_page_url,
            instagram_page_url,
            country,
            heard_about,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    $profile_stmt->execute([
        $client_id,
        $category,
        trim($input['website'] ?? ''),
        trim($input['instagram'] ?? ''),
        trim($input['target_audience'] ?? ''),
        $input['price_range'] ?? 'unknown',
        trim($input['facebook_page_url'] ?? ''),
        trim($input['instagram_page_url'] ?? ''),
        $country,
        trim($input['heard_about'] ?? '')
    ]);

    json_response([
        'status' => 'created',
        'client_id' => $client_id
    ]);
}

if ($action === 'update_profile') {
    $client_id = (int)($input['client_id'] ?? 0);
    if (!$client_id) {
        json_error('client_id required');
    }
    ensure_brand_owner($db, $user_id, $client_id, $user_role);

    $business_name = trim($input['business_name'] ?? '');
    $category = trim($input['category'] ?? '');
    $description = trim($input['description'] ?? '');
    $location = trim($input['location'] ?? '');
    $business_phone = trim($input['business_phone'] ?? '');
    $country = trim($input['country'] ?? 'Israel');
    $onboarding_complete = !empty($input['onboarding_complete']) ? 1 : 0;
    $onboarding_step = $onboarding_complete ? 'complete' : 'web_onboarding';
    
    // Re-infer brand profile from updated description
    $inferred = infer_brand_profile($description, $category, $country);

    $stmt = $db->prepare("
        UPDATE clients
        SET business_name = ?,
            industry = ?,
            business_description = ?,
            business_address = ?,
            business_phone = ?,
            brand_tone = ?,
            font_preference = ?,
            default_language = ?,
            onboarding_complete = ?,
            onboarding_step = ?
        WHERE id = ?
    ");
    $stmt->execute([
        $business_name,
        $category,
        $description,
        $location,
        $business_phone ?: null,
        $inferred['brand_tone'],
        $inferred['font_preference'],
        $inferred['default_language'],
        $onboarding_complete,
        $onboarding_step,
        $client_id
    ]);

    $profile_stmt = $db->prepare("
        INSERT INTO web_brand_profiles (
            client_id,
            category,
            website,
            instagram_handle,
            target_audience,
            price_range,
            facebook_page_url,
            instagram_page_url,
            country,
            heard_about,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
            category = VALUES(category),
            website = VALUES(website),
            instagram_handle = VALUES(instagram_handle),
            target_audience = VALUES(target_audience),
            price_range = VALUES(price_range),
            facebook_page_url = VALUES(facebook_page_url),
            instagram_page_url = VALUES(instagram_page_url),
            country = VALUES(country),
            heard_about = VALUES(heard_about),
            updated_at = NOW()
    ");
    $profile_stmt->execute([
        $client_id,
        $category,
        trim($input['website'] ?? ''),
        trim($input['instagram'] ?? ''),
        trim($input['target_audience'] ?? ''),
        $input['price_range'] ?? 'unknown',
        trim($input['facebook_page_url'] ?? ''),
        trim($input['instagram_page_url'] ?? ''),
        $country,
        trim($input['heard_about'] ?? '')
    ]);

    json_response([
        'status' => 'updated',
        'client_id' => $client_id
    ]);
}

if ($action === 'delete') {
    $client_id = (int)($input['client_id'] ?? 0);
    if (!$client_id) {
        json_error('client_id required');
    }
    ensure_brand_owner($db, $user_id, $client_id, $user_role);
    $stmt = $db->prepare("DELETE FROM clients WHERE id = ?");
    $stmt->execute([$client_id]);
    json_response(['status' => 'deleted']);
}

json_error('Invalid action', 400);
?>
