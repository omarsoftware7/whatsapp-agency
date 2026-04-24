<?php
require_once 'config.php';

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed', 405);
}

// Get and validate input data
$name = trim($_POST['name'] ?? '');
$phone = trim($_POST['phone'] ?? '');
$email = trim($_POST['email'] ?? '');
$interest = $_POST['interest'] ?? '';
$business_type = $_POST['business_type'] ?? '';
$ad_spend = $_POST['ad_spend'] ?? null;
$agency_payment = $_POST['agency_payment'] ?? null;

// Validation
$errors = [];

if (empty($name)) {
    $errors[] = 'الاسم مطلوب';
}

if (empty($phone)) {
    $errors[] = 'رقم الهاتف مطلوب';
} elseif (!preg_match('/^[\+]?[0-9\s\-\(\)]{10,}$/', $phone)) {
    $errors[] = 'رقم الهاتف غير صحيح';
}

if (empty($email)) {
    $errors[] = 'البريد الإلكتروني مطلوب';
} elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'البريد الإلكتروني غير صحيح';
}

if (!in_array($interest, ['ugc_ads', 'auto_publishing', 'ai_agency', 'auto_campaigns', 'other'])) {
    $errors[] = 'يرجى اختيار مجال الاهتمام';
}

if (!in_array($business_type, ['business', 'agency'])) {
    $errors[] = 'يرجى تحديد نوع العمل';
}

// Validate financial fields based on business type
if ($business_type === 'agency' && (empty($ad_spend) || !is_numeric($ad_spend) || $ad_spend <= 0)) {
    $errors[] = 'يرجى إدخال إجمالي مبلغ الإعلانات للعملاء';
}

if ($business_type === 'business' && (empty($agency_payment) || !is_numeric($agency_payment) || $agency_payment <= 0)) {
    $errors[] = 'يرجى إدخال المبلغ المدفوع للوكالة حالياً';
}

if (!empty($errors)) {
    json_error(implode(', ', $errors), 400);
}

try {
    $db = get_db();
    
    // Check if email already exists
    $stmt = $db->prepare("SELECT id FROM leads WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        json_error('هذا البريد الإلكتروني مسجل مسبقاً', 400);
    }
    
    // Insert new lead
    $stmt = $db->prepare("
        INSERT INTO leads (name, phone, email, interest, business_type, ad_spend, agency_payment, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, 'new')
    ");
    
    $stmt->execute([
        $name,
        $phone,
        $email,
        $interest,
        $business_type,
        $business_type === 'agency' ? $ad_spend : null,
        $business_type === 'business' ? $agency_payment : null
    ]);
    
    $lead_id = $db->lastInsertId();
    
    // Log the activity
    log_activity($lead_id, null, 'lead_created', [
        'name' => $name,
        'email' => $email,
        'interest' => $interest,
        'business_type' => $business_type
    ]);
    
    json_response([
        'success' => true,
        'message' => 'تم تسجيل طلبك بنجاح',
        'lead_id' => $lead_id
    ]);
    
} catch (PDOException $e) {
    if (DEBUG_MODE) {
        json_error('Database error: ' . $e->getMessage(), 500);
    } else {
        json_error('حدث خطأ في النظام، يرجى المحاولة لاحقاً', 500);
    }
}
?>