<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/ai_helpers.php';
require_once __DIR__ . '/prompts.php';

session_start();

if (!isset($_SESSION['web_user_id'])) {
    json_error('Unauthorized', 401);
}

$db = get_db();
$user_id = (int)$_SESSION['web_user_id'];

function ensure_brand_owner(PDO $db, int $user_id, int $client_id) {
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

function fetch_brand_profile(PDO $db, int $client_id): array {
    $stmt = $db->prepare("
        SELECT c.*,
               wbp.category,
               wbp.website,
               wbp.instagram_handle,
               wbp.target_audience,
               wbp.price_range,
               wbp.facebook_page_url,
               wbp.instagram_page_url,
               wbp.country
        FROM clients c
        LEFT JOIN web_brand_profiles wbp ON wbp.client_id = c.id
        WHERE c.id = ?
    ");
    $stmt->execute([$client_id]);
    $brand = $stmt->fetch();
    if (!$brand) {
        json_error('Brand not found', 404);
    }
    return $brand;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $client_id = isset($_GET['client_id']) ? (int)$_GET['client_id'] : 0;
    if (!$client_id) {
        json_error('client_id required');
    }
    ensure_brand_owner($db, $user_id, $client_id);
    $plan_stmt = $db->prepare("
        SELECT *
        FROM web_content_plans
        WHERE client_id = ?
        ORDER BY created_at DESC
        LIMIT 1
    ");
    $plan_stmt->execute([$client_id]);
    $plan = $plan_stmt->fetch();
    if (!$plan) {
        json_response(['plan' => null, 'items' => []]);
    }
    $items_stmt = $db->prepare("
        SELECT *
        FROM web_content_plan_items
        WHERE plan_id = ?
        ORDER BY id ASC
    ");
    $items_stmt->execute([$plan['id']]);
    json_response(['plan' => $plan, 'items' => $items_stmt->fetchAll()]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed', 405);
}

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';
$client_id = (int)($input['client_id'] ?? 0);

if (!$client_id) {
    json_error('client_id required');
}

ensure_brand_owner($db, $user_id, $client_id);
$brand = fetch_brand_profile($db, $client_id);

if ($action === 'generate') {
    $mode = $input['mode'] === 'manual' ? 'manual' : 'auto';
    $user_prompt = trim($input['user_prompt'] ?? '');
    if ($mode === 'manual' && $user_prompt === '') {
        json_error('Describe what you want or switch to auto.');
    }
    
    // Check and deduct 4 text credits
    $CONTENT_PLAN_COST = 4;
    $credit_stmt = $db->prepare("SELECT text_credits_remaining FROM web_users WHERE id = ?");
    $credit_stmt->execute([$user_id]);
    $credits = $credit_stmt->fetchColumn();
    if ($credits === false || (int)$credits < $CONTENT_PLAN_COST) {
        json_error("Not enough text credits. You need {$CONTENT_PLAN_COST} text credits to generate a content plan.");
    }
    
    $prompt = build_content_plan_prompt($brand, $mode, $user_prompt ?: null);
    $response = call_gemini_text($prompt);
    if (isset($response['error'])) {
        json_response([
            'error' => $response['error'],
            'status' => $response['status'] ?? null,
            'response' => $response['response'] ?? null
        ], 502);
    }
    $text = extract_gemini_text($response) ?? '';
    $json_match = preg_match('/\{[\s\S]*\}/', $text, $matches);
    if (!$json_match) {
        json_error('Failed to parse content plan');
    }
    $plan_json = json_decode($matches[0], true);
    $ideas = $plan_json['ideas'] ?? [];
    if (!is_array($ideas) || count($ideas) < 1) {
        json_error('Plan did not return ideas');
    }

    // Deduct credits after successful AI response
    $deduct_stmt = $db->prepare("
        UPDATE web_users
        SET text_credits_remaining = GREATEST(0, text_credits_remaining - ?),
            credits_remaining = GREATEST(0, credits_remaining - ?)
        WHERE id = ?
    ");
    $deduct_stmt->execute([$CONTENT_PLAN_COST, $CONTENT_PLAN_COST, $user_id]);
    
    // Update session
    $_SESSION['web_user_text_credits'] = max(0, ($_SESSION['web_user_text_credits'] ?? 0) - $CONTENT_PLAN_COST);
    $_SESSION['web_user_credits_remaining'] = max(0, ($_SESSION['web_user_credits_remaining'] ?? 0) - $CONTENT_PLAN_COST);
    
    $plan_stmt = $db->prepare("
        INSERT INTO web_content_plans (client_id, web_user_id, mode, user_prompt, created_at)
        VALUES (?, ?, ?, ?, NOW())
    ");
    $plan_stmt->execute([$client_id, $user_id, $mode, $user_prompt ?: null]);
    $plan_id = (int)$db->lastInsertId();

    $insert = $db->prepare("
        INSERT INTO web_content_plan_items (plan_id, client_id, title, idea_text, job_type, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'draft', NOW())
    ");
    $items = [];
    foreach (array_slice($ideas, 0, 4) as $idea) {
        $title = trim($idea['title'] ?? '');
        $desc = trim($idea['description'] ?? '');
        $job_type = $idea['job_type'] ?? 'announcement';
        if ($title === '' || $desc === '') {
            continue;
        }
        if (!in_array($job_type, ['announcement', 'product_sale', 'from_image', 'before_after'], true)) {
            $job_type = 'announcement';
        }
        $insert->execute([$plan_id, $client_id, $title, $desc, $job_type]);
        $items[] = [
            'id' => (int)$db->lastInsertId(),
            'title' => $title,
            'idea_text' => $desc,
            'job_type' => $job_type,
            'status' => 'draft',
            'job_id' => null
        ];
    }
    json_response([
        'status' => 'generated',
        'plan' => [
            'id' => $plan_id,
            'mode' => $mode,
            'user_prompt' => $user_prompt
        ],
        'items' => $items
    ]);
}

if ($action === 'update_item') {
    $item_id = (int)($input['item_id'] ?? 0);
    $title = trim($input['title'] ?? '');
    $idea_text = trim($input['idea_text'] ?? '');
    if (!$item_id || $title === '' || $idea_text === '') {
        json_error('item_id, title, idea_text required');
    }
    $stmt = $db->prepare("
        UPDATE web_content_plan_items
        SET title = ?, idea_text = ?, updated_at = NOW()
        WHERE id = ? AND client_id = ?
    ");
    $stmt->execute([$title, $idea_text, $item_id, $client_id]);
    json_response(['status' => 'updated']);
}

if ($action === 'approve_item') {
    $item_id = (int)($input['item_id'] ?? 0);
    if (!$item_id) {
        json_error('item_id required');
    }
    $stmt = $db->prepare("
        UPDATE web_content_plan_items
        SET status = 'approved', updated_at = NOW()
        WHERE id = ? AND client_id = ?
    ");
    $stmt->execute([$item_id, $client_id]);
    json_response(['status' => 'approved']);
}

if ($action === 'create_job') {
    $item_id = (int)($input['item_id'] ?? 0);
    if (!$item_id) {
        json_error('item_id required');
    }
    $stmt = $db->prepare("
        SELECT * FROM web_content_plan_items
        WHERE id = ? AND client_id = ?
    ");
    $stmt->execute([$item_id, $client_id]);
    $item = $stmt->fetch();
    if (!$item) {
        json_error('Item not found', 404);
    }
    if (!in_array($item['status'], ['approved', 'created'], true)) {
        json_error('Approve the idea before creating the job.');
    }
    if (!empty($item['job_id'])) {
        json_response(['status' => 'exists', 'job_id' => (int)$item['job_id']]);
    }
    $job_type = $item['job_type'] ?: 'announcement';
    $user_message = $item['idea_text'];
    $current_stage = $user_message ? 'generate_design' : 'await_user_input';
    $stmt = $db->prepare("
        INSERT INTO creative_jobs (
            client_id,
            job_type,
            user_message,
            current_stage,
            created_at
        )
        VALUES (?, ?, ?, ?, NOW())
    ");
    $stmt->execute([$client_id, $job_type, $user_message, $current_stage]);
    $job_id = (int)$db->lastInsertId();
    $stmt = $db->prepare("
        UPDATE web_content_plan_items
        SET status = 'created', job_id = ?, updated_at = NOW()
        WHERE id = ?
    ");
    $stmt->execute([$job_id, $item_id]);
    json_response(['status' => 'created', 'job_id' => $job_id]);
}

json_error('Invalid action', 400);
?>
