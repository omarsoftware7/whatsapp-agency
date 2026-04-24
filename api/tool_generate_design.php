<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/prompts.php';
require_once __DIR__ . '/ai_helpers.php';

function log_design_debug(string $message, array $context = []): void {
    $path = __DIR__ . '/../storage/design_debug.log';
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

// Allow long-running image generation without killing the PHP server.
set_time_limit(180);
ini_set('max_execution_time', '180');

$is_cli = PHP_SAPI === 'cli' || (PHP_SAPI === 'litespeed' && empty($_SERVER['REQUEST_METHOD']));
if (!$is_cli && ($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    json_error('Method not allowed', 405);
}

if ($is_cli) {
    $job_id = isset($argv[1]) ? (int)$argv[1] : 0;
} else {
    $input = json_decode(file_get_contents('php://input'), true);
    $job_id = isset($input['job_id']) ? (int)$input['job_id'] : 0;
}

if (!$job_id) {
    json_error('job_id required');
}

$db = get_db();
$stmt = $db->prepare("SELECT * FROM creative_jobs WHERE id = ?");
$stmt->execute([$job_id]);
$job = $stmt->fetch();

if (!$job) {
    json_error('Job not found', 404);
}
log_design_debug('start', [
    'job_id' => $job_id,
    'client_id' => (int)$job['client_id'],
    'job_type' => $job['job_type'] ?? null
]);
if ($job['current_stage'] === 'rejected') {
    log_design_debug('cancelled', ['job_id' => $job_id]);
    json_response(['status' => 'cancelled']);
}
if (!client_has_active_web_user((int)$job['client_id'])) {
    log_design_debug('blocked', ['job_id' => $job_id]);
    json_response(['status' => 'blocked']);
}

if (!charge_client_credits($db, (int)$job['client_id'], 'image', 1)) {
    log_design_debug('no_credits', ['job_id' => $job_id]);
    $db->prepare("
        UPDATE creative_jobs
        SET error_message = ?,
            current_stage = 'await_user_input'
        WHERE id = ?
    ")->execute(['Not enough image credits to generate a design.', $job_id]);
    json_response(['status' => 'no_credits']);
}

$stmt = $db->prepare("SELECT * FROM clients WHERE id = ?");
$stmt->execute([$job['client_id']]);
$client = $stmt->fetch();
if (!$client) {
    json_error('Client not found', 404);
}
$stmt = $db->prepare("SELECT * FROM web_brand_profiles WHERE client_id = ?");
$stmt->execute([$job['client_id']]);
$profile = $stmt->fetch() ?: [];
$client = array_merge($client, $profile);

$job_type = $job['job_type'];
$user_text = trim($job['user_message'] ?? '');
$product_images = $job['product_images'] ? json_decode($job['product_images'], true) : [];
if (!is_array($product_images)) {
    $product_images = [];
}
$user_images = $job['user_images'] ? json_decode($job['user_images'], true) : [];
if (!is_array($user_images)) {
    $user_images = [];
}

if ($job_type === 'multi_mode') {
    $stmt = $db->prepare("
        SELECT product_image_url,
               product_name,
               price,
               old_price,
               notes
        FROM web_multi_products
        WHERE job_id = ?
        ORDER BY sort_order ASC, id ASC
        LIMIT 1
    ");
    $stmt->execute([$job_id]);
    $first_product = $stmt->fetch();
    if ($first_product) {
        $product_images = [$first_product['product_image_url']];
        $multi_text = "Multi mode template. Use this product image for the template only.\n" .
            "IMPORTANT: Do NOT edit, repaint, relabel, or alter the product image in any way.\n" .
            "IMPORTANT: The product name and price must be rendered as separate text elements on the design, NOT written or printed on the product itself.\n" .
            "IMPORTANT: If a product name is provided, it MUST be included in the design text and clearly visible.\n" .
            "Product name (display as text): {$first_product['product_name']}\n" .
            "Price (display as text): {$first_product['price']}\n" .
            "Old price (display as text if present): " . ($first_product['old_price'] ?? '') . "\n" .
            "Notes: " . ($first_product['notes'] ?? '');
        $user_text = trim($user_text . "\n\n" . $multi_text);
    }
}

$prompt = '';
$inline_parts = [];

if ($job_type === 'from_image' || $job_type === 'before_after') {
    $base_image_url = $user_images[0] ?? null;
    if (!$base_image_url) {
        log_design_debug('missing_base_image', ['job_id' => $job_id]);
        json_error('Base image required');
    }
    $base_image = fetch_url_base64($base_image_url);
    if (!$base_image) {
        log_design_debug('base_image_fetch_failed', ['job_id' => $job_id, 'url' => $base_image_url]);
        json_error('Failed to load base image');
    }
    $inline_parts[] = [
        'inlineData' => [
            'mimeType' => $base_image['mime'],
            'data' => $base_image['data']
        ]
    ];
    if ($job_type === 'before_after') {
        $after_url = $user_images[1] ?? null;
        if (!$after_url) {
            log_design_debug('missing_after_image', ['job_id' => $job_id]);
            json_error('Before and after images required');
        }
        $after_image = fetch_url_base64($after_url);
        if (!$after_image) {
            log_design_debug('after_image_fetch_failed', ['job_id' => $job_id, 'url' => $after_url]);
            json_error('Failed to load after image');
        }
        $inline_parts[] = [
            'inlineData' => [
                'mimeType' => $after_image['mime'],
                'data' => $after_image['data']
            ]
        ];
    }
    
    // Add business logo - prefer local file first
    $logo = null;
    $logo_loaded = false;
    
    if (!empty($client['logo_filename'])) {
        $local_logo_path = LOGO_DIR . $client['logo_filename'];
        if (file_exists($local_logo_path)) {
            $logo_data = file_get_contents($local_logo_path);
            if ($logo_data) {
                $finfo = new finfo(FILEINFO_MIME_TYPE);
                $mime = $finfo->buffer($logo_data);
                $logo = [
                    'data' => base64_encode($logo_data),
                    'mime' => $mime
                ];
                $logo_loaded = true;
                log_design_debug('logo_loaded_local', ['path' => $local_logo_path]);
            }
        }
    }
    
    if (!$logo_loaded && !empty($client['logo_url'])) {
        $logo = fetch_url_base64($client['logo_url']);
        if ($logo) {
            log_design_debug('logo_loaded_url', ['url' => $client['logo_url']]);
        }
    }
    
    if ($logo) {
        $inline_parts[] = [
            'inlineData' => [
                'mimeType' => $logo['mime'],
                'data' => $logo['data']
            ]
        ];
    }
    
    $image_size = $job['image_size'] ?? 'post';
    $prompt = $job_type === 'before_after'
        ? build_before_after_prompt(
            $client,
            $user_text,
            $image_size,
            $job['language'] ?? null,
            $client['country'] ?? null
        )
        : build_from_image_prompt(
            $client,
            $user_text,
            $image_size,
            $job['language'] ?? null,
            $client['country'] ?? null
        );
    $aspect = $image_size === 'story' ? '9:16' : '1:1';
    $gemini = call_gemini_image($prompt, $inline_parts, null, ['TEXT', 'IMAGE'], [
        'aspectRatio' => $aspect,
        'imageSize' => '1K'
    ]);
    if (isset($gemini['error'])) {
        log_design_debug('gemini_error', [
            'job_id' => $job_id,
            'status' => $gemini['status'] ?? null,
            'error' => $gemini['error']
        ]);
        json_response([
            'error' => $gemini['error'],
            'status' => $gemini['status'] ?? null,
            'response' => $gemini['response'] ?? null
        ], 502);
    }
    $base64 = extract_gemini_image_base64($gemini);
    if (!$base64) {
        log_design_debug('missing_image_data', ['job_id' => $job_id]);
        json_error('Gemini did not return image data');
    }
    $binary = base64_decode($base64);
    $filename = 'design_job' . $job_id . '_' . time() . '.png';
    $path = GENERATED_DIR . $filename;
    file_put_contents($path, $binary);
    $url = BASE_URL . '/uploads/generated/' . $filename;

    $stmt = $db->prepare("SELECT current_stage FROM creative_jobs WHERE id = ?");
    $stmt->execute([$job_id]);
    $stageRow = $stmt->fetch();
    if (!$stageRow || $stageRow['current_stage'] === 'rejected') {
        json_response(['status' => 'cancelled']);
    }

    $stmt = $db->prepare("
        UPDATE creative_jobs
        SET design_variations = ?,
            design_prompt = ?,
            media_type = 'image',
            current_stage = 'await_design_approval'
        WHERE id = ?
    ");
    $stmt->execute([json_encode([$url]), $prompt, $job_id]);

    log_activity($job['client_id'], $job_id, 'design_generated_web', [
        'design_url' => $url,
        'source' => 'from_image'
    ]);
    log_design_debug('design_saved', [
        'job_id' => $job_id,
        'design_url' => $url
    ]);

    json_response([
        'status' => 'design_saved',
        'job_id' => $job_id,
        'design_variations' => [$url],
        'next_step' => 'await_design_approval'
    ]);
}

if ($job_type === 'announcement') {
    $image_size = $job['image_size'] ?? 'post';
    $prompt = build_announcement_design_prompt(
        $client,
        $user_text,
        $image_size,
        $job['language'] ?? null,
        $client['country'] ?? null
    );
    $log_dir = UPLOAD_DIR . 'logs/';
    if (!file_exists($log_dir)) {
        mkdir($log_dir, 0777, true);
    }
    $log_path = $log_dir . 'announcement_job' . $job_id . '_prompt.txt';
    file_put_contents($log_path, $prompt);

    $aspect = $image_size === 'story' ? '9:16' : '1:1';

    // Load logo - prefer local file first, then URL
    $logo = null;
    $logo_loaded = false;
    
    // Try local file first
    if (!empty($client['logo_filename'])) {
        $local_logo_path = LOGO_DIR . $client['logo_filename'];
        log_design_debug('trying_local_logo', ['path' => $local_logo_path, 'exists' => file_exists($local_logo_path)]);
        if (file_exists($local_logo_path)) {
            $logo_data = file_get_contents($local_logo_path);
            if ($logo_data) {
                $finfo = new finfo(FILEINFO_MIME_TYPE);
                $mime = $finfo->buffer($logo_data);
                $logo = [
                    'data' => base64_encode($logo_data),
                    'mime' => $mime
                ];
                $logo_loaded = true;
                log_design_debug('logo_loaded_local', ['path' => $local_logo_path, 'mime' => $mime]);
            }
        }
    }
    
    // Fallback to URL if local file not available
    if (!$logo_loaded && !empty($client['logo_url'])) {
        log_design_debug('trying_logo_url', ['url' => $client['logo_url']]);
        $logo = fetch_url_base64($client['logo_url']);
        if ($logo) {
            $logo_loaded = true;
            log_design_debug('logo_loaded_url', ['url' => $client['logo_url']]);
        } else {
            log_design_debug('logo_url_failed', ['url' => $client['logo_url']]);
        }
    }
    
    if ($logo) {
        $inline_parts[] = [
            'inlineData' => [
                'mimeType' => $logo['mime'],
                'data' => $logo['data']
            ]
        ];
        // Add reminder about logo in prompt
        $prompt .= "\n\n**REMINDER:** The business logo has been provided as an image. Use it EXACTLY as provided at the top of the design.";
    } else {
        log_design_debug('no_logo_available', ['job_id' => $job_id]);
    }

    $gemini = call_gemini_image($prompt, $inline_parts, null, ['TEXT', 'IMAGE'], [
        'aspectRatio' => $aspect,
        'imageSize' => '1K'
    ]);

    if (isset($gemini['error'])) {
        log_design_debug('gemini_error', [
            'job_id' => $job_id,
            'status' => $gemini['status'] ?? null,
            'error' => $gemini['error']
        ]);
        json_response([
            'error' => $gemini['error'],
            'status' => $gemini['status'] ?? null,
            'response' => $gemini['response'] ?? null
        ], 502);
    }

    $base64 = extract_gemini_image_base64($gemini);
    if (!$base64) {
        log_design_debug('missing_image_data', ['job_id' => $job_id]);
        json_error('Gemini did not return image data');
    }

    $binary = base64_decode($base64);
    $filename = 'design_job' . $job_id . '_' . time() . '.png';
    $path = GENERATED_DIR . $filename;
    file_put_contents($path, $binary);
    $url = BASE_URL . '/uploads/generated/' . $filename;

    $stmt = $db->prepare("SELECT current_stage FROM creative_jobs WHERE id = ?");
    $stmt->execute([$job_id]);
    $stageRow = $stmt->fetch();
    if (!$stageRow || $stageRow['current_stage'] === 'rejected') {
        json_response(['status' => 'cancelled']);
    }

    $stmt = $db->prepare("
        UPDATE creative_jobs
        SET design_variations = ?,
            design_prompt = ?,
            media_type = 'image',
            current_stage = 'await_design_approval'
        WHERE id = ?
    ");
    $stmt->execute([json_encode([$url]), $prompt, $job_id]);

    log_activity($job['client_id'], $job_id, 'design_generated_web', [
        'design_url' => $url
    ]);
    log_design_debug('design_saved', [
        'job_id' => $job_id,
        'design_url' => $url
    ]);

    json_response([
        'status' => 'design_saved',
        'job_id' => $job_id,
        'design_variations' => [$url],
        'next_step' => 'await_design_approval'
    ]);
}

// Tips carousel - generate all slides in sequence
if ($job_type === 'tips_carousel') {
    // Parse tips data from product_images JSON
    $tips_data = json_decode($job['product_images'], true);
    if (!is_array($tips_data)) {
        json_error('Tips data not found or invalid');
    }
    
    $tips_mode = $tips_data['mode'] ?? 'explicit';
    $tips = $tips_data['tips'] ?? [];
    $tips_count = $tips_data['count'] ?? 5;
    $tips_prompt = $tips_data['prompt'] ?? '';
    $topic = $job['user_message'] ?? '';
    $language = $job['language'] ?? 'en';
    $country = $job['country'] ?? null;
    
    // If AI mode, generate tips first
    if ($tips_mode === 'ai_generate' || count($tips) < 2) {
        // Auto-detect count if 0 or not specified
        $count_instruction = ($tips_count > 0) 
            ? "Generate exactly {$tips_count} tips"
            : "Generate 4-7 tips (choose the best number for the topic)";
        
        log_design_debug('generating_tips_via_ai', [
            'job_id' => $job_id,
            'prompt' => mb_substr($tips_prompt ?: $topic, 0, 200),
            'count' => $tips_count
        ]);
        
        $gen_prompt = "{$count_instruction}/advice points based on this request:\n\n" .
            ($tips_prompt ?: $topic) . "\n\n" .
            "Requirements:\n" .
            "- Each tip should be 1-2 sentences max\n" .
            "- Tips should be actionable and valuable\n" .
            "- Language: " . language_label(normalize_language($language)) . "\n" .
            "- Industry context: " . ($client['industry'] ?? 'general') . "\n" .
            "- Business: " . ($client['business_name'] ?? 'Business') . "\n\n" .
            "Output format: Return ONLY a JSON array of strings, nothing else. Example:\n" .
            "[\"Tip 1 text here\", \"Tip 2 text here\", \"Tip 3 text here\"]\n";
        
        $gen_response = call_gemini_text($gen_prompt);
        if (isset($gen_response['error'])) {
            log_design_debug('tips_generation_error', ['job_id' => $job_id, 'error' => $gen_response['error']]);
            json_error('Failed to generate tips: ' . $gen_response['error']);
        }
        
        $gen_text = $gen_response['candidates'][0]['content']['parts'][0]['text'] ?? '';
        
        // Extract JSON array from response
        if (preg_match('/\[[\s\S]*\]/', $gen_text, $matches)) {
            $generated_tips = json_decode($matches[0], true);
            if (is_array($generated_tips) && count($generated_tips) >= 2) {
                $tips = array_slice($generated_tips, 0, 10); // Cap at 10
                log_design_debug('tips_generated', [
                    'job_id' => $job_id,
                    'count' => count($tips),
                    'tips' => array_map(fn($t) => mb_substr($t, 0, 50), $tips)
                ]);
            }
        }
        
        if (count($tips) < 2) {
            json_error('AI could not generate enough tips. Please try a more specific prompt.');
        }
        
        // Update the stored tips data
        $tips_data['tips'] = $tips;
        $tips_data['mode'] = 'explicit'; // Now we have explicit tips
        $db->prepare("UPDATE creative_jobs SET product_images = ? WHERE id = ?")
           ->execute([json_encode($tips_data), $job_id]);
    }
    
    $total_slides = count($tips);
    
    // Fetch logo once for all slides - prefer local file
    $logo_base64 = null;
    if (!empty($client['logo_filename'])) {
        $local_logo_path = LOGO_DIR . $client['logo_filename'];
        if (file_exists($local_logo_path)) {
            $logo_data = file_get_contents($local_logo_path);
            if ($logo_data) {
                $finfo = new finfo(FILEINFO_MIME_TYPE);
                $mime = $finfo->buffer($logo_data);
                $logo_base64 = [
                    'data' => base64_encode($logo_data),
                    'mime' => $mime
                ];
            }
        }
    }
    if (!$logo_base64 && !empty($client['logo_url'])) {
        $logo_base64 = fetch_url_base64($client['logo_url']);
    }
    
    $generated_urls = [];
    
    // Generate each slide
    for ($slide_num = 1; $slide_num <= $total_slides; $slide_num++) {
        // Check if job was cancelled
        $stmt = $db->prepare("SELECT current_stage FROM creative_jobs WHERE id = ?");
        $stmt->execute([$job_id]);
        $stageRow = $stmt->fetch();
        if (!$stageRow || $stageRow['current_stage'] === 'rejected') {
            json_response(['status' => 'cancelled']);
        }
        
        log_design_debug('generating_tip_slide', [
            'job_id' => $job_id,
            'slide' => $slide_num,
            'total' => $total_slides,
            'tip' => mb_substr($tips[$slide_num - 1], 0, 100)
        ]);
        
        $prompt = build_tips_carousel_prompt($client, $topic, $tips, $slide_num, $total_slides, $language, $country);
        
        $inline_parts = [];
        if ($logo_base64) {
            $inline_parts[] = [
                'inlineData' => [
                    'mimeType' => $logo_base64['mime'],
                    'data' => $logo_base64['data']
                ]
            ];
        }
        
        $gemini = call_gemini_image($prompt, $inline_parts);
        if (isset($gemini['error'])) {
            log_design_debug('gemini_error_slide', [
                'job_id' => $job_id,
                'slide' => $slide_num,
                'error' => $gemini['error']
            ]);
            // Continue to next slide on error, but log it
            continue;
        }
        
        $base64 = extract_gemini_image_base64($gemini);
        if (!$base64) {
            log_design_debug('no_image_data_slide', ['job_id' => $job_id, 'slide' => $slide_num]);
            continue;
        }
        
        $binary = base64_decode($base64);
        $filename = 'tips_job' . $job_id . '_slide' . $slide_num . '_' . time() . '.png';
        $path = GENERATED_DIR . $filename;
        file_put_contents($path, $binary);
        $url = BASE_URL . '/uploads/generated/' . $filename;
        $generated_urls[] = $url;
        
        log_design_debug('slide_generated', [
            'job_id' => $job_id,
            'slide' => $slide_num,
            'url' => $url
        ]);
    }
    
    if (count($generated_urls) < 2) {
        json_error('Failed to generate enough carousel slides');
    }
    
    // Save all slides to design_variations
    $stmt = $db->prepare("
        UPDATE creative_jobs
        SET design_variations = ?,
            design_prompt = ?,
            media_type = 'image',
            current_stage = 'await_design_approval'
        WHERE id = ?
    ");
    $stmt->execute([json_encode($generated_urls), "Tips carousel: {$topic}", $job_id]);
    
    log_activity($job['client_id'], $job_id, 'tips_carousel_generated_web', [
        'slides' => count($generated_urls)
    ]);
    log_design_debug('tips_carousel_saved', [
        'job_id' => $job_id,
        'total_slides' => count($generated_urls)
    ]);
    
    json_response([
        'status' => 'design_saved',
        'job_id' => $job_id,
        'design_variations' => $generated_urls,
        'next_step' => 'await_design_approval'
    ]);
}

if ($job_type === 'ugc_video') {
    json_error('UGC video generation not implemented in this endpoint', 400);
} else {
    $product = null;
    if (in_array($job_type, ['product_sale', 'multi_mode'], true)) {
        if (empty($product_images)) {
            json_error('product_images required for product_sale or multi_mode');
        }
        $product = fetch_url_base64($product_images[0]);
        if ($product) {
            $inline_parts[] = [
                'inlineData' => [
                    'mimeType' => $product['mime'],
                    'data' => $product['data']
                ]
            ];
        }
    }

    // Load logo - prefer local file first
    $logo = null;
    $logo_loaded = false;
    
    if (!empty($client['logo_filename'])) {
        $local_logo_path = LOGO_DIR . $client['logo_filename'];
        if (file_exists($local_logo_path)) {
            $logo_data = file_get_contents($local_logo_path);
            if ($logo_data) {
                $finfo = new finfo(FILEINFO_MIME_TYPE);
                $mime = $finfo->buffer($logo_data);
                $logo = [
                    'data' => base64_encode($logo_data),
                    'mime' => $mime
                ];
                $logo_loaded = true;
                log_design_debug('logo_loaded_local_product', ['path' => $local_logo_path]);
            }
        }
    }
    
    if (!$logo_loaded && !empty($client['logo_url'])) {
        $logo = fetch_url_base64($client['logo_url']);
        if ($logo) {
            log_design_debug('logo_loaded_url_product', ['url' => $client['logo_url']]);
        }
    }
    
    if ($logo) {
        $inline_parts[] = [
            'inlineData' => [
                'mimeType' => $logo['mime'],
                'data' => $logo['data']
            ]
        ];
    }

    $analysis_parts = [];
    if ($product) {
        $analysis_parts[] = [
            'inlineData' => [
                'mimeType' => $product['mime'],
                'data' => $product['data']
            ]
        ];
    } elseif ($logo) {
        $analysis_parts[] = [
            'inlineData' => [
                'mimeType' => $logo['mime'],
                'data' => $logo['data']
            ]
        ];
    }

    $image_description = '';
    if ($analysis_parts) {
        $analysis_prompt = build_image_analysis_prompt();
        $analysis_response = call_gemini_text_with_images($analysis_prompt, $analysis_parts);
        if (!isset($analysis_response['error'])) {
            $image_description = extract_gemini_text($analysis_response) ?? '';
        }
    }

    $business_prompt = build_business_info_prompt($client);
    $system_prompt = build_initial_prompt_system();
    $user_prompt = build_initial_prompt_user(
        $user_text,
        $business_prompt,
        $image_description,
        $job['language'] ?? null,
        $client['country'] ?? null
    );
    $initial_response = call_gemini_text($system_prompt . "\n\n" . $user_prompt);

    if (isset($initial_response['error'])) {
        log_design_debug('prompt_build_error', [
            'job_id' => $job_id,
            'status' => $initial_response['status'] ?? null,
            'error' => $initial_response['error']
        ]);
        json_response([
            'error' => $initial_response['error'],
            'status' => $initial_response['status'] ?? null,
            'response' => $initial_response['response'] ?? null
        ], 502);
    }

    $initial_text = extract_gemini_text($initial_response) ?? '';
    $json_match = null;
    if (preg_match('/\{[\s\S]*\}/', $initial_text, $matches)) {
        $json_match = $matches[0];
    }
    $parsed = $json_match ? json_decode($json_match, true) : null;
    if (!$parsed || empty($parsed['image_prompt'])) {
        log_design_debug('missing_image_prompt', ['job_id' => $job_id]);
        json_error('Failed to build image prompt');
    }

    $has_product = $product !== null;
    $prompt = build_final_prompt(
        $parsed['image_prompt'],
        $has_product,
        $job['language'] ?? null,
        get_currency_for_country($client['country'] ?? '')
    );
    $image_size = $job['image_size'] ?? 'post';
    $prompt .= $image_size === 'story'
        ? "\n\nOutput size: 1080x1920 vertical (9:16) story."
        : "\n\nOutput size: 1080x1080 square (1:1) post.";
}

$image_size = $job['image_size'] ?? 'post';
$aspect = $image_size === 'story' ? '9:16' : '1:1';
$gemini = call_gemini_image($prompt, $inline_parts, null, ['TEXT', 'IMAGE'], [
    'aspectRatio' => $aspect,
    'imageSize' => '1K'
]);
if (isset($gemini['error'])) {
    log_design_debug('gemini_error', [
        'job_id' => $job_id,
        'status' => $gemini['status'] ?? null,
        'error' => $gemini['error']
    ]);
    json_response([
        'error' => $gemini['error'],
        'status' => $gemini['status'] ?? null,
        'response' => $gemini['response'] ?? null
    ], 502);
}

$base64 = extract_gemini_image_base64($gemini);
if (!$base64) {
    log_design_debug('missing_image_data', ['job_id' => $job_id]);
    json_error('Gemini did not return image data');
}

$stmt = $db->prepare("SELECT current_stage FROM creative_jobs WHERE id = ?");
$stmt->execute([$job_id]);
$stageRow = $stmt->fetch();
if (!$stageRow || $stageRow['current_stage'] === 'rejected') {
    json_response(['status' => 'cancelled']);
}

$binary = base64_decode($base64);
$filename = 'design_job' . $job_id . '_' . time() . '.png';
$path = GENERATED_DIR . $filename;
file_put_contents($path, $binary);
$url = BASE_URL . '/uploads/generated/' . $filename;

$stmt = $db->prepare("
    UPDATE creative_jobs
    SET design_variations = ?,
        design_prompt = ?,
        media_type = 'image',
        current_stage = 'await_design_approval'
    WHERE id = ?
");
$stmt->execute([json_encode([$url]), $prompt, $job_id]);

log_activity($job['client_id'], $job_id, 'design_generated_web', [
    'design_url' => $url
]);
log_design_debug('design_saved', [
    'job_id' => $job_id,
    'design_url' => $url
]);

json_response([
    'status' => 'design_saved',
    'job_id' => $job_id,
    'design_variations' => [$url],
    'next_step' => 'await_design_approval'
]);
?>
