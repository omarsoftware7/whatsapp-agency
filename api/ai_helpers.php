<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/security_helpers.php';

function detect_mime_from_bytes(string $data): string {
    if (strncmp($data, "\x89PNG", 4) === 0) {
        return 'image/png';
    }
    if (strncmp($data, "\xFF\xD8\xFF", 3) === 0) {
        return 'image/jpeg';
    }
    if (strncmp($data, "GIF87a", 6) === 0 || strncmp($data, "GIF89a", 6) === 0) {
        return 'image/gif';
    }
    if (strncmp($data, "RIFF", 4) === 0 && substr($data, 8, 4) === "WEBP") {
        return 'image/webp';
    }
    return 'image/png';
}

function fetch_url_base64(string $url): ?array {
    $data = null;
    $base = rtrim(BASE_URL, '/');
    
    // Try local file first (uploads from our server)
    if (str_starts_with($url, $base . '/uploads/')) {
        $relative = substr($url, strlen($base . '/uploads/'));
        // Sanitize: prevent directory traversal
        $relative = str_replace(['..', "\0"], '', $relative);
        $local = UPLOAD_DIR . $relative;
        if (is_file($local) && str_starts_with(realpath($local), realpath(UPLOAD_DIR))) {
            $data = @file_get_contents($local);
        }
    }
    
    // Fetch remote URL with SSRF protection
    if ($data === null) {
        // Validate URL for SSRF - block private IPs
        $validation = validate_url_for_fetch($url);
        if (!$validation['valid']) {
            error_log("SSRF blocked: {$url} - {$validation['error']}");
            return null;
        }
        
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false); // Don't follow redirects automatically (SSRF risk)
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
        curl_setopt($ch, CURLOPT_TIMEOUT, 20);
        curl_setopt($ch, CURLOPT_USERAGENT, 'adly-fetch/1.0');
        curl_setopt($ch, CURLOPT_PROTOCOLS, CURLPROTO_HTTP | CURLPROTO_HTTPS);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
        $data = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($data === false || $code >= 400) {
            return null;
        }
    }
    
    if (class_exists('finfo')) {
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->buffer($data) ?: 'image/png';
    } else {
        $mime = detect_mime_from_bytes($data);
    }
    return [
        'mime' => $mime,
        'data' => base64_encode($data)
    ];
}

function normalize_gemini_model(string $model): string {
    return preg_replace('/^models\\//', '', $model);
}

function call_gemini_text(string $prompt): array {
    set_time_limit(120);
    $model = normalize_gemini_model(GOOGLE_TEXT_MODEL);
    $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key=" . urlencode(GOOGLE_API_KEY);
    $payload = [
        'contents' => [
            [
                'parts' => [
                    ['text' => $prompt]
                ]
            ]
        ],
        'generationConfig' => [
            'temperature' => 0.8,
            'topK' => 40,
            'topP' => 0.95,
            'maxOutputTokens' => 1024
        ]
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if ($code !== 200) {
        return ['error' => 'Gemini text API error', 'status' => $code, 'response' => $response];
    }
    return json_decode($response, true) ?: ['error' => 'Invalid Gemini response'];
}

function call_gemini_text_with_options(string $prompt, int $max_tokens = 1024, float $temperature = 0.8): array {
    set_time_limit(120);
    $model = normalize_gemini_model(GOOGLE_TEXT_MODEL);
    $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key=" . urlencode(GOOGLE_API_KEY);
    $payload = [
        'contents' => [
            [
                'parts' => [
                    ['text' => $prompt]
                ]
            ]
        ],
        'generationConfig' => [
            'temperature' => $temperature,
            'topK' => 40,
            'topP' => 0.95,
            'maxOutputTokens' => $max_tokens
        ]
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if ($code !== 200) {
        return ['error' => 'Gemini text API error', 'status' => $code, 'response' => $response];
    }
    return json_decode($response, true) ?: ['error' => 'Invalid Gemini response'];
}

function call_gemini_text_with_images(string $prompt, array $inline_parts = [], ?string $model_override = null): array {
    set_time_limit(120);
    $model = normalize_gemini_model($model_override ?: GOOGLE_TEXT_MODEL);
    $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key=" . urlencode(GOOGLE_API_KEY);
    $parts = array_merge([['text' => $prompt]], $inline_parts);
    $payload = [
        'contents' => [
            [
                'parts' => $parts
            ]
        ],
        'generationConfig' => [
            'temperature' => 0.7,
            'topK' => 40,
            'topP' => 0.95,
            'maxOutputTokens' => 1024
        ]
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if ($code !== 200) {
        return ['error' => 'Gemini text API error', 'status' => $code, 'response' => $response];
    }
    return json_decode($response, true) ?: ['error' => 'Invalid Gemini response'];
}

function extract_gemini_text(array $response): ?string {
    $parts = $response['candidates'][0]['content']['parts'] ?? [];
    $text = '';
    foreach ($parts as $part) {
        if (isset($part['text'])) {
            $text .= $part['text'];
        }
    }
    return $text !== '' ? $text : null;
}

function call_gemini_image(
    string $prompt,
    array $inline_parts = [],
    ?string $model_override = null,
    ?array $response_modalities = null,
    ?array $image_config = null
): array {
    set_time_limit(120);
    $model = normalize_gemini_model($model_override ?: GOOGLE_IMAGE_MODEL);
    $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key=" . urlencode(GOOGLE_API_KEY);
    $parts = array_merge([['text' => $prompt]], $inline_parts);
    $modalities = $response_modalities ?: ['TEXT', 'IMAGE'];
    $payload = [
        'contents' => [
            [
                'parts' => $parts
            ]
        ],
        'generationConfig' => [
            'responseModalities' => $modalities
        ]
    ];
    if ($image_config !== null) {
        $payload['generationConfig']['imageConfig'] = $image_config;
    }

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if ($code !== 200) {
        return ['error' => 'Gemini image API error', 'status' => $code, 'response' => $response];
    }
    return json_decode($response, true) ?: ['error' => 'Invalid Gemini response'];
}

function extract_gemini_image_base64(array $response): ?string {
    $parts = $response['candidates'][0]['content']['parts'] ?? [];
    foreach ($parts as $part) {
        if (isset($part['inlineData']['data'])) {
            return $part['inlineData']['data'];
        }
        if (isset($part['inline_data']['data'])) {
            return $part['inline_data']['data'];
        }
    }
    return null;
}
?>
