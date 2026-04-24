<?php
require_once 'config.php';

$slug = trim($_GET['slug'] ?? '');
if ($slug === '') {
    http_response_code(404);
    echo 'Landing page not found.';
    exit;
}

$db = get_db();
$stmt = $db->prepare("
    SELECT id, html
    FROM web_landing_pages
    WHERE public_slug = ? AND status = 'published'
    LIMIT 1
");
$stmt->execute([$slug]);
$page = $stmt->fetch();

if (!$page) {
    http_response_code(404);
    echo 'Landing page not found.';
    exit;
}

$html = $page['html'];

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
            "  <form action=\"/api/web_landing_page_leads.php\" method=\"post\">\n" .
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

$parsed = extract_html_from_response($html);
if ($parsed && !empty($parsed['html'])) {
    $html = $parsed['html'];
}
$needs_decode = strpos($html, '\\n') !== false && (stripos($html, '<!DOCTYPE html') !== false || stripos($html, '<html') !== false);
if ($needs_decode) {
    $html = decode_escaped_html($html);
}
$html = repair_landing_html($html, $slug);
if (!empty($_GET['thanks'])) {
    $lang = 'en';
    if (preg_match('/<html[^>]*lang=["\']?([a-zA-Z-]+)["\']?/i', $html, $matches)) {
        $lang = strtolower(substr($matches[1], 0, 2));
    } elseif (preg_match('/dir=["\']rtl["\']/i', $html)) {
        $lang = 'ar';
    } elseif (preg_match('/[\x{0590}-\x{05FF}]/u', $html)) {
        $lang = 'he';
    } elseif (preg_match('/[\x{0600}-\x{06FF}]/u', $html)) {
        $lang = 'ar';
    }
    $messages = [
        'en' => 'Thanks! We received your details and will contact you soon.',
        'ar' => 'شكرًا لك! تم استلام بياناتك وسنتواصل معك قريبًا.',
        'he' => 'תודה! קיבלנו את הפרטים וניצור קשר בקרוב.'
    ];
    $text = $messages[$lang] ?? $messages['en'];
    $message = '<div style="padding:14px 16px;margin:12px auto;max-width:560px;border-radius:12px;background:#f0fdf4;color:#14532d;border:1px solid #bbf7d0;font-family:Arial,sans-serif;text-align:center;">' . htmlspecialchars($text, ENT_QUOTES, 'UTF-8') . '</div>';
    $html = preg_replace('/<body([^>]*)>/i', '<body$1>' . $message, $html, 1);
}

echo $html;
?>
