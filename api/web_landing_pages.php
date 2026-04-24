<?php
require_once '../config.php';
require_once __DIR__ . '/ai_helpers.php';
require_once __DIR__ . '/prompts.php';

function log_landing_debug(string $message, array $context = []): void {
    $path = __DIR__ . '/../storage/landing_debug.log';
    $dir = dirname($path);
    if (!file_exists($dir)) {
        mkdir($dir, 0777, true);
    }
    $line = date('Y-m-d H:i:s') . ' ' . $message;
    if ($context) {
        $line .= ' ' . json_encode($context, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
    file_put_contents($path, $line . PHP_EOL, FILE_APPEND);
}

session_start();

if (!isset($_SESSION['web_user_id'])) {
    json_error('Unauthorized', 401);
}

$db = get_db();
$user_id = (int)$_SESSION['web_user_id'];
$user_role = $_SESSION['web_user_role'] ?? 'user';

$stmt = $db->prepare("SELECT is_active FROM web_users WHERE id = ?");
$stmt->execute([$user_id]);
$user_status = $stmt->fetch();
if ($user_status && (int)$user_status['is_active'] !== 1) {
    json_error('Account disabled. Contact support to re-enable generation.', 403);
}

function ensure_brand_owner(PDO $db, int $user_id, int $client_id, string $role = 'user'): void {
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

function slugify(string $text): string {
    $text = strtolower(trim($text));
    $text = preg_replace('/[^a-z0-9]+/i', '-', $text);
    $text = trim($text, '-');
    return $text !== '' ? $text : 'landing';
}

function generate_unique_slug(PDO $db, string $base): string {
    $slug = $base;
    $tries = 0;
    while ($tries < 5) {
        $stmt = $db->prepare("SELECT id FROM web_landing_pages WHERE public_slug = ?");
        $stmt->execute([$slug]);
        if (!$stmt->fetch()) {
            return $slug;
        }
        $slug = $base . '-' . substr(bin2hex(random_bytes(4)), 0, 6);
        $tries++;
    }
    return $base . '-' . substr(bin2hex(random_bytes(6)), 0, 8);
}

function parse_model_json(string $text): ?array {
    $clean = trim($text);
    $clean = preg_replace('/^```(?:json)?/i', '', $clean);
    $clean = preg_replace('/```$/', '', $clean);
    $start = strpos($clean, '{');
    $end = strrpos($clean, '}');
    if ($start === false || $end === false || $end <= $start) {
        return null;
    }
    $json = substr($clean, $start, $end - $start + 1);
    $data = json_decode($json, true);
    return json_last_error() === JSON_ERROR_NONE ? $data : null;
}

function normalize_landing_html(string $html, string $slug): string {
    $form_action = '/api/web_landing_page_leads.php';
    if (strpos($html, '{{FORM_ACTION}}') !== false) {
        $html = str_replace('{{FORM_ACTION}}', $form_action, $html);
    }
    if (strpos($html, 'landing_page_slug') === false) {
        $html = preg_replace(
            '/<\/form>/i',
            '<input type="hidden" name="landing_page_slug" value="' . htmlspecialchars($slug, ENT_QUOTES) . '"></form>',
            $html,
            1
        );
    }
    $has_form_action = preg_match('/<form[^>]*action=/i', $html) === 1;
    $has_form_method = preg_match('/<form[^>]*method=/i', $html) === 1;
    if (!$has_form_action || !$has_form_method) {
        $html = preg_replace_callback(
            '/<form([^>]*)>/i',
            function ($matches) use ($form_action, $has_form_action, $has_form_method) {
                $attrs = $matches[1];
                if (!$has_form_action) {
                    $attrs .= ' action="' . $form_action . '"';
                }
                if (!$has_form_method) {
                    $attrs .= ' method="post"';
                }
                return '<form' . $attrs . '>';
            },
            $html,
            1
        );
    }
    return $html;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $client_id = isset($_GET['client_id']) ? (int)$_GET['client_id'] : 0;
    if (!$client_id) {
        json_error('client_id required');
    }
    ensure_brand_owner($db, $user_id, $client_id, $user_role);

    if ($user_role === 'admin') {
        $stmt = $db->prepare("
            SELECT id,
                   client_id,
                   title,
                   user_prompt,
                   status,
                   error_message,
                   public_slug,
                   created_at,
                   updated_at
            FROM web_landing_pages
            WHERE client_id = ?
            ORDER BY created_at DESC
        ");
        $stmt->execute([$client_id]);
    } else {
        $stmt = $db->prepare("
            SELECT lp.id,
                   lp.client_id,
                   lp.title,
                   lp.user_prompt,
                   lp.status,
                   lp.error_message,
                   lp.public_slug,
                   lp.created_at,
                   lp.updated_at
            FROM web_landing_pages lp
            LEFT JOIN web_deleted_landing_pages dl
              ON dl.landing_page_id = lp.id AND dl.web_user_id = ?
            WHERE lp.client_id = ? AND dl.id IS NULL
            ORDER BY lp.created_at DESC
        ");
        $stmt->execute([$user_id, $client_id]);
    }
    $items = $stmt->fetchAll();
    json_response(['items' => $items]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed', 405);
}

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? null;
if (!$action) {
    json_error('action required');
}

if ($action === 'create' || $action === 'edit') {
    $client_id = (int)($input['client_id'] ?? 0);
    $user_prompt = trim((string)($input['user_prompt'] ?? ''));
    $user_images = $input['user_images'] ?? [];
    if (!$client_id || $user_prompt === '') {
        json_error('client_id and user_prompt required');
    }
    if (!is_array($user_images)) {
        $user_images = [];
    }
    $user_images = array_values(array_filter(array_map('trim', $user_images)));
    if (count($user_images) > 2) {
        $user_images = array_slice($user_images, 0, 2);
    }
    ensure_brand_owner($db, $user_id, $client_id, $user_role);

    $stmt = $db->prepare("
        SELECT c.*,
               p.category,
               p.website,
               p.instagram_handle,
               p.target_audience,
               p.price_range,
               p.country,
               p.facebook_page_url,
               p.instagram_page_url
        FROM clients c
        LEFT JOIN web_brand_profiles p ON p.client_id = c.id
        WHERE c.id = ?
    ");
    $stmt->execute([$client_id]);
    $brand = $stmt->fetch();
    if (!$brand) {
        json_error('Brand not found', 404);
    }

    if (!empty($brand['logo_filename'])) {
        $brand['logo_url'] = BASE_URL . '/uploads/logos/' . $brand['logo_filename'];
    }

    // Check landing credits BEFORE creating (only for new pages, not edits)
    if ($action === 'create') {
        $credit_stmt = $db->prepare("SELECT landing_credits_remaining FROM web_users WHERE id = ?");
        $credit_stmt->execute([$user_id]);
        $landing_credits = $credit_stmt->fetchColumn();
        if ($landing_credits === false || (int)$landing_credits < 1) {
            json_error("Not enough landing page credits. You need at least 1 landing page credit to create a new landing page.");
        }
    }

    if ($action === 'edit') {
        $page_id = (int)($input['landing_page_id'] ?? 0);
        if (!$page_id) {
            json_error('landing_page_id required');
        }
        $stmt = $db->prepare("SELECT id, public_slug, html FROM web_landing_pages WHERE id = ? AND client_id = ?");
        $stmt->execute([$page_id, $client_id]);
        $page = $stmt->fetch();
        if (!$page) {
            json_error('Landing page not found', 404);
        }
        $slug = $page['public_slug'];

        $stmt = $db->prepare("
            INSERT INTO web_landing_page_edits (landing_page_id, client_id, user_prompt, status, created_at)
            VALUES (?, ?, ?, 'pending', NOW())
        ");
        $stmt->execute([$page_id, $client_id, $user_prompt]);

        $stmt = $db->prepare("
            UPDATE web_landing_pages
            SET user_prompt = ?, user_images = ?, status = 'generating', error_message = NULL, updated_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$user_prompt, $user_images ? json_encode($user_images) : null, $page_id]);

        $disabled = array_map('trim', explode(',', (string)ini_get('disable_functions')));
        if (!function_exists('exec') || in_array('exec', $disabled, true)) {
            log_landing_debug('exec_disabled', ['client_id' => $client_id, 'action' => $action]);
            json_error('Server cannot run background generation (exec disabled).', 500);
        }
        $cmd = escapeshellcmd(PHP_BINARY) . ' ' .
            escapeshellarg(__DIR__ . '/tool_generate_landing_page.php') . ' ' .
            escapeshellarg((string)$page_id) . ' > /dev/null 2>&1 &';
        log_landing_debug('dispatch', [
            'action' => $action,
            'client_id' => $client_id,
            'landing_page_id' => $page_id,
            'cmd' => $cmd
        ]);
        exec($cmd);

        json_response([
            'status' => 'queued',
            'landing_page_id' => $page_id,
            'public_slug' => $slug
        ]);
    }

    $base_slug = slugify(($brand['business_name'] ?? 'landing') . '-' . substr(md5($user_prompt), 0, 6));
    $slug = generate_unique_slug($db, $base_slug);

    $stmt = $db->prepare("
        INSERT INTO web_landing_pages (client_id, title, user_prompt, user_images, html, status, public_slug, created_at, updated_at)
        VALUES (?, ?, ?, ?, '', 'generating', ?, NOW(), NOW())
    ");
    $stmt->execute([$client_id, $brand['business_name'] ?? 'Landing page', $user_prompt, $user_images ? json_encode($user_images) : null, $slug]);

    $page_id = (int)$db->lastInsertId();
    log_activity($client_id, null, 'landing_page_created', [
        'landing_page_id' => $page_id,
        'slug' => $slug
    ]);

    $disabled = array_map('trim', explode(',', (string)ini_get('disable_functions')));
    if (!function_exists('exec') || in_array('exec', $disabled, true)) {
        log_landing_debug('exec_disabled', ['client_id' => $client_id, 'action' => $action]);
        json_error('Server cannot run background generation (exec disabled).', 500);
    }
    $cmd = escapeshellcmd(PHP_BINARY) . ' ' .
        escapeshellarg(__DIR__ . '/tool_generate_landing_page.php') . ' ' .
        escapeshellarg((string)$page_id) . ' > /dev/null 2>&1 &';
    log_landing_debug('dispatch', [
        'action' => $action,
        'client_id' => $client_id,
        'landing_page_id' => $page_id,
        'cmd' => $cmd
    ]);
    exec($cmd);

    json_response([
        'status' => 'queued',
        'landing_page_id' => $page_id,
        'public_slug' => $slug
    ]);
}

if ($action === 'delete') {
    $client_id = (int)($input['client_id'] ?? 0);
    $page_id = (int)($input['landing_page_id'] ?? 0);
    if (!$client_id || !$page_id) {
        json_error('client_id and landing_page_id required');
    }
    ensure_brand_owner($db, $user_id, $client_id, $user_role);

    $stmt = $db->prepare("SELECT id FROM web_landing_pages WHERE id = ? AND client_id = ?");
    $stmt->execute([$page_id, $client_id]);
    if (!$stmt->fetch()) {
        json_error('Landing page not found', 404);
    }

    $stmt = $db->prepare("
        INSERT INTO web_deleted_landing_pages (web_user_id, landing_page_id)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE deleted_at = NOW()
    ");
    $stmt->execute([$user_id, $page_id]);
    json_response(['status' => 'deleted']);
}

json_error('Invalid action', 400);
?>
