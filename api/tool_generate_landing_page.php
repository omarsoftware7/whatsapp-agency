<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/ai_helpers.php';
require_once __DIR__ . '/prompts.php';

function log_landing_worker(string $message, array $context = []): void {
    $path = __DIR__ . '/../storage/landing_worker.log';
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

function extract_json_block(string $text): ?string {
    if (preg_match('/```(?:json)?\s*(\{.*?\})\s*```/is', $text, $matches)) {
        return $matches[1];
    }
    $start = strpos($text, '{');
    if ($start === false) {
        return null;
    }
    $depth = 0;
    $in_string = false;
    $escape = false;
    $len = strlen($text);
    for ($i = $start; $i < $len; $i++) {
        $ch = $text[$i];
        if ($in_string) {
            if ($escape) {
                $escape = false;
                continue;
            }
            if ($ch === '\\\\') {
                $escape = true;
                continue;
            }
            if ($ch === '"') {
                $in_string = false;
            }
            continue;
        }
        if ($ch === '"') {
            $in_string = true;
            continue;
        }
        if ($ch === '{') {
            $depth++;
        } elseif ($ch === '}') {
            $depth--;
            if ($depth === 0) {
                return substr($text, $start, $i - $start + 1);
            }
        }
    }
    return null;
}

function parse_model_json(string $text): ?array {
    $json = extract_json_block($text);
    if (!$json) {
        return null;
    }
    $data = json_decode($json, true);
    return json_last_error() === JSON_ERROR_NONE ? $data : null;
}

function extract_html_from_response(string $text): ?array {
    $parsed = parse_model_json($text);
    if ($parsed && (isset($parsed['html']) || isset($parsed['title']))) {
        return $parsed;
    }
    if (preg_match('/"html"\s*:\s*"((?:\\\\.|[^"])*)"/s', $text, $matches)) {
        $decoded_html = json_decode('"' . $matches[1] . '"');
        if (is_string($decoded_html) && $decoded_html !== '') {
            $title = null;
            if (preg_match('/"title"\s*:\s*"((?:\\\\.|[^"])*)"/s', $text, $titleMatch)) {
                $title = json_decode('"' . $titleMatch[1] . '"');
            }
            return [
                'title' => is_string($title) ? $title : null,
                'html' => $decoded_html
            ];
        }
    }
    $html_start = null;
    foreach (['<!DOCTYPE html', '<html', '<body'] as $marker) {
        $pos = stripos($text, $marker);
        if ($pos !== false) {
            $html_start = $pos;
            break;
        }
    }
    if ($html_start !== null) {
        $end_pos = strripos($text, '</html>');
        $html = $end_pos !== false
            ? substr($text, $html_start, $end_pos - $html_start + 7)
            : substr($text, $html_start);
        return ['title' => null, 'html' => $html];
    }
    return null;
}

function decode_escaped_html(string $html): string {
    $html = str_replace(['\\r\\n', '\\n', '\\r', '\\t'], ["\r\n", "\n", "\r", "\t"], $html);
    $html = str_replace('\\"', '"', $html);
    $html = str_replace('\\\\', '\\', $html);
    return $html;
}

function extract_title_from_html(string $html): ?string {
    if (preg_match('/<title[^>]*>(.*?)<\/title>/is', $html, $matches)) {
        $title = trim(strip_tags($matches[1]));
        return $title !== '' ? $title : null;
    }
    return null;
}

function repair_landing_html(string $html, string $slug): string {
    if (stripos($html, '<style') !== false && stripos($html, '</style>') === false) {
        if (stripos($html, '</head>') !== false) {
            $html = preg_replace('/<\/head>/i', "</style>\n</head>", $html, 1);
        } else {
            $html .= "\n</style>";
        }
    }
    if (stripos($html, '<head') !== false && stripos($html, '</head>') === false) {
        if (stripos($html, '<body') !== false) {
            $html = preg_replace('/<body/i', "</head>\n<body", $html, 1);
        } else {
            $html .= "\n</head>";
        }
    }
    if (stripos($html, '<form') === false) {
        $form = "\n<div class=\"form-container\">\n" .
            "  <h2>احجز الآن</h2>\n" .
            "  <form action=\"{{FORM_ACTION}}\" method=\"post\">\n" .
            "    <input type=\"hidden\" name=\"landing_page_slug\" value=\"" . htmlspecialchars($slug, ENT_QUOTES) . "\">\n" .
            "    <div class=\"form-group\"><label>الاسم</label><input type=\"text\" name=\"name\" required></div>\n" .
            "    <div class=\"form-group\"><label>البريد الإلكتروني</label><input type=\"email\" name=\"email\" required></div>\n" .
            "    <div class=\"form-group\"><label>رقم الهاتف</label><input type=\"tel\" name=\"phone\" required></div>\n" .
            "    <button type=\"submit\">إرسال</button>\n" .
            "  </form>\n" .
            "</div>\n";
        if (stripos($html, '</body>') !== false) {
            $html = preg_replace('/<\/body>/i', $form . "\n</body>", $html, 1);
        } else {
            $html .= $form;
        }
    }
    if (stripos($html, '</body>') === false) {
        $html .= "\n</body>";
    }
    if (stripos($html, '</html>') === false) {
        $html .= "\n</html>";
    }
    return $html;
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

set_time_limit(180);
ini_set('max_execution_time', '180');

$is_cli = PHP_SAPI === 'cli' || (PHP_SAPI === 'litespeed' && empty($_SERVER['REQUEST_METHOD']));
if (!$is_cli && ($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    json_error('Method not allowed', 405);
}

$page_id = 0;
if ($is_cli) {
    $page_id = isset($argv[1]) ? (int)$argv[1] : 0;
} else {
    $input = json_decode(file_get_contents('php://input'), true);
    $page_id = isset($input['landing_page_id']) ? (int)$input['landing_page_id'] : 0;
}

if (!$page_id) {
    json_error('landing_page_id required');
}

$db = get_db();
$stmt = $db->prepare("SELECT * FROM web_landing_pages WHERE id = ?");
$stmt->execute([$page_id]);
$page = $stmt->fetch();
if (!$page) {
    json_error('Landing page not found', 404);
}
log_landing_worker('start', [
    'landing_page_id' => $page_id,
    'client_id' => (int)$page['client_id']
]);

if (!charge_client_credits($db, (int)$page['client_id'], 'landing', 1)) {
    log_landing_worker('no_credits', ['landing_page_id' => $page_id]);
    $db->prepare("
        UPDATE web_landing_pages
        SET status = 'failed',
            error_message = ?
        WHERE id = ?
    ")->execute(['Not enough landing page credits.', $page_id]);
    json_response(['status' => 'no_credits']);
}

if (!client_has_active_web_user((int)$page['client_id'])) {
    log_landing_worker('blocked', ['landing_page_id' => $page_id]);
    $db->prepare("UPDATE web_landing_pages SET status = 'failed', error_message = ? WHERE id = ?")
        ->execute(['Account disabled', $page_id]);
    json_response(['status' => 'blocked']);
}

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
$stmt->execute([(int)$page['client_id']]);
$brand = $stmt->fetch();
if (!$brand) {
    log_landing_worker('brand_not_found', ['landing_page_id' => $page_id]);
    json_error('Brand not found', 404);
}
if (!empty($brand['logo_filename'])) {
    $brand['logo_url'] = BASE_URL . '/uploads/logos/' . $brand['logo_filename'];
}

$image_urls = [];
if (!empty($page['user_images'])) {
    $decoded = json_decode($page['user_images'], true);
    if (is_array($decoded)) {
        $image_urls = array_values(array_filter(array_map('trim', $decoded)));
    }
}
$prompt = build_landing_page_prompt($brand, (string)$page['user_prompt'], (string)$page['public_slug'], $image_urls);
$response = call_gemini_text_with_options($prompt, 4096, 0.7);
$text = extract_gemini_text($response);
if (!$text) {
    log_landing_worker('empty_response', ['landing_page_id' => $page_id]);
    $db->prepare("UPDATE web_landing_pages SET status = 'failed', error_message = ? WHERE id = ?")
        ->execute(['Empty AI response', $page_id]);
    json_error('AI failed to generate landing page');
}

$parsed = extract_html_from_response($text);
$html = $parsed['html'] ?? $text;
$title = trim((string)($parsed['title'] ?? $brand['business_name'] ?? 'Landing page'));
$needs_decode = strpos($html, '\\n') !== false && (stripos($html, '<!DOCTYPE html') !== false || stripos($html, '<html') !== false);
if ($needs_decode) {
    $html = decode_escaped_html($html);
}
$derived_title = extract_title_from_html($html);
if ($derived_title) {
    $title = $derived_title;
}
$html = repair_landing_html($html, (string)$page['public_slug']);
$html = normalize_landing_html($html, (string)$page['public_slug']);

$stmt = $db->prepare("
    UPDATE web_landing_pages
    SET title = ?,
        html = ?,
        status = 'published',
        error_message = NULL,
        updated_at = NOW()
    WHERE id = ?
");
$stmt->execute([$title, $html, $page_id]);
log_landing_worker('completed', [
    'landing_page_id' => $page_id,
    'slug' => $page['public_slug']
]);

json_response(['status' => 'completed', 'landing_page_id' => $page_id]);
?>
