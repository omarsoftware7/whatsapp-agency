<?php

/**
 * Returns strict logo protection rules to be included in all design prompts.
 * This ensures the AI never modifies, translates, or alters the logo in any way.
 */
function get_logo_protection_rules(): string {
    return "**🚨 CRITICAL - LOGO PROTECTION RULES (MUST FOLLOW):**\n" .
        "The business logo is a SACRED, IMMUTABLE element. You MUST follow these rules:\n" .
        "1. NEVER modify, edit, alter, or change ANY part of the logo\n" .
        "2. NEVER translate, transliterate, or change any text/words within the logo - even if the logo text is in a different language than the job language\n" .
        "3. NEVER change the logo's colors, fonts, shapes, or any visual elements\n" .
        "4. NEVER redraw, regenerate, or recreate the logo - use it EXACTLY as provided\n" .
        "5. The logo may contain text in Hebrew, Arabic, English, or any language - this is INTENTIONAL and must be preserved exactly\n" .
        "6. The 'language' setting (Arabic/Hebrew/English) applies ONLY to NEW text overlays (headlines, CTAs, prices) - NOT to the logo\n" .
        "7. Treat the logo as a protected trademark that cannot be altered under any circumstances\n\n";
}

function get_currency_for_country(string $country): string {
    $map = [
        'israel' => '₪',
        'saudi arabia' => '﷼',
        'united arab emirates' => 'د.إ',
        'qatar' => 'ر.ق',
        'kuwait' => 'د.ك',
        'bahrain' => 'ب.د',
        'oman' => 'ر.ع.',
        'jordan' => 'د.ا',
        'egypt' => 'ج.م',
        'lebanon' => 'ل.ل',
        'united states' => '$',
        'usa' => '$',
        'uk' => '£',
        'united kingdom' => '£',
        'europe' => '€',
        'germany' => '€',
        'france' => '€',
        'italy' => '€',
        'spain' => '€'
    ];
    $key = strtolower(trim($country));
    return $map[$key] ?? '₪';
}

function normalize_language(?string $language): string {
    $lang = strtolower(trim((string)$language));
    return in_array($lang, ['en', 'ar', 'he'], true) ? $lang : 'en';
}

function language_label(string $language): string {
    return match ($language) {
        'ar' => 'Arabic',
        'he' => 'Hebrew',
        default => 'English',
    };
}

function build_product_design_prompt(array $client, string $user_text): string {
    $business_name = $client['business_name'] ?? 'Business';
    $industry = $client['industry'] ?? 'general';
    $brand_tone = $client['brand_tone'] ?? 'professional';
    $primary_color = $client['primary_color'] ?? '#000000';
    $secondary_color = $client['secondary_color'] ?? '#FFFFFF';

    $tone_guidelines = [];
    if ($brand_tone === 'luxury') {
        $tone_guidelines[] = 'Elegant, sophisticated, premium feel with gold/metallic accents';
    }
    if ($brand_tone === 'playful') {
        $tone_guidelines[] = 'Vibrant, energetic, fun with bold colors and dynamic shapes';
    }
    if ($brand_tone === 'minimal') {
        $tone_guidelines[] = 'Clean, simple, lots of white space, subtle elements';
    }
    if ($brand_tone === 'professional') {
        $tone_guidelines[] = 'Clean, trustworthy, modern with balanced composition';
    }
    $tone_text = $tone_guidelines ? implode("\n   - ", $tone_guidelines) : '';

    return "Create a stunning Instagram/Facebook product advertisement.\n\n" .
        "**CRITICAL FORMAT REQUIREMENTS:**\n" .
        "- Design MUST extend to all 4 edges (full bleed)\n" .
        "- NO white borders, margins, or padding around the image\n" .
        "- NO frame or border effects\n" .
        "- Content should reach the very edge of the canvas\n" .
        "- Background elements must fill the entire square completely\n" .
        "- Think \"edge-to-edge\" design\n\n" .
        "**PRODUCT CONTEXT:**\n" .
        "Business: {$business_name}\n" .
        "Industry: {$industry}\n" .
        "Brand Tone: {$brand_tone}\n" .
        "Brand Colors: Primary {$primary_color}, Secondary {$secondary_color}\n\n" .
        "**USER REQUEST:**\n" .
        "{$user_text}\n\n" .
        "**DESIGN REQUIREMENTS:**\n\n" .
        "1. **Product Placement:**\n" .
        "   - Feature the product image prominently (center or slightly off-center)\n" .
        "   - Product should occupy 40-50% of the design space\n" .
        "   - Ensure product is well-lit and clearly visible\n" .
        "   - Add subtle shadow/depth to make product pop\n\n" .
        "2. **Logo Integration:**\n" .
        "   - Place business logo at TOP CENTER (50-70px from top)\n" .
        "   - Logo size: 160-200px wide, maintain aspect ratio\n" .
        "   - Ensure logo doesn't overlap with product\n" .
        "   - Logo should be clearly visible with good contrast\n\n" .
        "3. **Visual Design:**\n" .
        "   - Use brand colors ({$primary_color}, {$secondary_color}) as accent colors\n" .
        "   - Create a {$brand_tone} aesthetic that matches the brand\n" .
        "   - Add elegant geometric shapes or patterns as background elements\n" .
        "   - Ensure high contrast between product and background\n" .
        "   - Use subtle gradients or textures for depth\n" .
        "   - Modern, clean, professional composition\n\n" .
        "4. **Layout:**\n" .
        "   - Leave space at bottom (200-250px) for text overlay later\n" .
        "   - Balanced composition with proper white space\n" .
        "   - Visual hierarchy: Logo → Product → Background elements\n" .
        "   - Ensure design works well on both Instagram and Facebook\n\n" .
        "5. **Style Guidelines:**\n" .
        ($tone_text ? "   - {$tone_text}\n" : '') .
        "   - High-quality, print-ready appearance\n" .
        "   - Instagram-worthy aesthetic\n\n" .
        get_logo_protection_rules() .
        "**CRITICAL:**\n" .
        "- DO NOT add any text (besides logo text if it exists)\n" .
        "- Product must be the hero element\n" .
        "- Background should complement, not compete with product\n" .
        "- Maintain brand identity throughout\n" .
        "- Ensure design is eye-catching and scroll-stopping";
}

function build_announcement_design_prompt(array $client, string $user_text, string $image_size = 'post', ?string $language = null, ?string $country = null): string {
    $business_name = $client['business_name'] ?? 'Business';
    $industry = $client['industry'] ?? 'general';
    $brand_tone = $client['brand_tone'] ?? 'professional';
    $primary_color = $client['primary_color'] ?? '#000000';
    $secondary_color = $client['secondary_color'] ?? '#FFFFFF';

    $tone_guidelines = [];
    if ($brand_tone === 'luxury') {
        $tone_guidelines[] = 'Elegant, refined, premium with metallic/gold accents, rich colors';
    }
    if ($brand_tone === 'playful') {
        $tone_guidelines[] = 'Vibrant, energetic, fun with bold shapes, dynamic movement';
    }
    if ($brand_tone === 'minimal') {
        $tone_guidelines[] = 'Clean, simple, sophisticated with generous white space';
    }
    if ($brand_tone === 'professional') {
        $tone_guidelines[] = 'Modern, trustworthy, polished with balanced design';
    }
    $tone_text = $tone_guidelines ? implode("\n   - ", $tone_guidelines) : '';

    $lower = mb_strtolower($user_text);
    $sale_keywords = ['sale', 'discount', 'offer', '%', '1+1', 'buy', 'deal', 'promo', 'special', 'خصم', 'تخفيض', 'تنزيلات', 'عرض', 'تصفية', 'اشتر', 'مجانا', '٪', '1+1'];
    $nonpromo_keywords = ['closed', 'closure', 'holiday', 'notice', 'announcement', 'important', 'strike', 'solidarity', 'mourning', 'condolence', 'apology', 'delay', 'update',
        'مغلق', 'اغلاق', 'إغلاق', 'عطلة', 'تنويه', 'تنبيه', 'هام', 'مهم', 'اضراب', 'إضراب', 'تضامن', 'حداد', 'تعزية', 'وفاة', 'اعتذار', 'تأجيل', 'تحديث'];
    $is_sale = false;
    foreach ($sale_keywords as $kw) {
        if (strpos($lower, $kw) !== false) {
            $is_sale = true;
            break;
        }
    }
    $is_nonpromo = false;
    foreach ($nonpromo_keywords as $kw) {
        if (strpos($lower, $kw) !== false) {
            $is_nonpromo = true;
            break;
        }
    }

    $sale_hint = $is_sale ? 'Energetic, exciting elements suggesting value and urgency (badges/tags allowed only if sale intent is explicit)' : '';
    $launch_hint = (strpos($lower, 'new') !== false || strpos($lower, 'launch') !== false || strpos($lower, 'جديد') !== false)
        ? 'Fresh, innovative elements suggesting novelty'
        : '';
    $event_hint = (strpos($lower, 'event') !== false || strpos($lower, 'celebration') !== false || strpos($lower, 'حفل') !== false || strpos($lower, 'احتفال') !== false)
        ? 'Festive, celebratory elements with dynamic composition'
        : '';
    $nonpromo_hint = $is_nonpromo ? 'Respectful, minimal, calm layout with clear hierarchy and plenty of breathing room' : '';

    $background_hints = array_filter([$sale_hint, $launch_hint, $event_hint, $nonpromo_hint]);
    $background_text = $background_hints ? "   - " . implode("\n   - ", $background_hints) . "\n" : '';

    $avoid_promo_text = $is_sale
        ? ''
        : "   - Do NOT use price tags, discount badges, offer ribbons, or promotional sticker shapes\n" .
          "   - Do NOT include any sales language or English text like \"Special Offer\"\n";

    $language = normalize_language($language);
    $language_name = language_label($language);
    $currency = get_currency_for_country($country ?? '');
    $format_text = $image_size === 'story'
        ? "   - Perfect 1080x1920px vertical format (9:16)\n"
        : "   - Perfect 1080x1080px square format\n";

    return "Create a stunning Instagram/Facebook announcement post.\n\n" .
        "**CRITICAL FORMAT REQUIREMENTS:**\n" .
        "- Design MUST extend to all 4 edges (full bleed)\n" .
        "- NO white borders, margins, or padding around the image\n" .
        "- NO frame or border effects\n" .
        "- Content should reach the very edge of the canvas\n" .
        "- Background elements must fill the entire canvas completely\n" .
        "- Think \"edge-to-edge\" design\n\n" .
        "**INTENT INTERPRETATION:**\n" .
        "- This is an announcement without a product image. Infer the user's intent and design an on-brand announcement template that matches the message tone.\n" .
        "- If the user mentions sales/discounts, convey urgency/value through visual motifs (badges, tags, ribbons) without showing any product.\n" .
        "- If the user mentions closure, holidays, events, or solidarity, use respectful, minimal, and clear visual hierarchy.\n" .
        "- If the intent is ambiguous, choose the safest on-brand announcement style for {$industry}.\n\n" .
        "**BUSINESS CONTEXT:**\n" .
        "Business: {$business_name}\n" .
        "Industry: {$industry}\n" .
        "Brand Tone: {$brand_tone}\n" .
        "Brand Colors: Primary {$primary_color}, Secondary {$secondary_color}\n\n" .
        "**ANNOUNCEMENT:**\n" .
        "{$user_text}\n\n" .
        "**DESIGN REQUIREMENTS:**\n\n" .
        "0. **Language & Currency:**\n" .
        "   - All text must be in {$language_name}.\n" .
        "   - Use the currency symbol {$currency} for any prices shown.\n\n" .
        "0. **Announcement Text Usage:**\n" .
        "   - Read the full user announcement and decide if it should appear on the image.\n" .
        "   - If the message is short/clear (e.g. hours, closure, sale notice), include it as the main headline and supporting line.\n" .
        "   - If the message is long or complex, summarize into 1–2 concise lines and include those instead.\n" .
        "   - If adding text would reduce clarity or conflict with the layout, keep the space for text overlay and do NOT add text.\n" .
        "   - When you add text, use the original language and respect RTL for Arabic/Hebrew.\n\n" .
        "1. **Logo Placement:**\n" .
        "   - Place business logo at TOP CENTER (50-70px from top)\n" .
        "   - Logo size: 180-220px wide, maintain aspect ratio\n" .
        "   - Ensure logo is the primary focal point\n" .
        "   - Clear contrast with background for visibility\n\n" .
        "2. **Visual Design:**\n" .
        "   - Use brand colors ({$primary_color}, {$secondary_color}) as dominant palette\n" .
        "   - Create a {$brand_tone} atmosphere that reflects the announcement mood\n" .
        "   - Add elegant geometric shapes, patterns, or abstract elements\n" .
        "   - Build visual interest through layering and depth\n" .
        "   - Use gradients, textures, or subtle effects for sophistication\n" .
        "   - Modern, eye-catching, scroll-stopping aesthetic\n\n" .
        "3. **Composition:**\n" .
        "   - Center-focused layout with logo as anchor\n" .
        "   - Leave large space in middle/bottom (400-500px) for text overlay later\n" .
        "   - Balanced visual weight across the design\n" .
        "   - Clear visual hierarchy and flow\n" .
        "   - Proper breathing room around elements\n\n" .
        "4. **Background Elements:**\n" .
        "   - Create an engaging background that matches the announcement theme\n" .
        $background_text .
        $avoid_promo_text .
        "   - Use shapes, lines, dots, or abstract forms\n" .
        "   - Ensure background supports but doesn't overpower\n\n" .
        "5. **Style Guidelines:**\n" .
        ($tone_text ? "   - {$tone_text}\n" : '') .
        "   - Instagram-worthy, shareable quality\n" .
        "   - Consistent with {$industry} industry standards\n\n" .
        "6. **Technical:**\n" .
        $format_text .
        "   - High resolution, crisp edges\n" .
        "   - Optimized for mobile viewing\n" .
        "   - Works well with text overlay\n\n" .
        get_logo_protection_rules() .
        "**CRITICAL:**\n" .
        "- Text is allowed ONLY if it directly reflects the announcement and improves clarity.\n" .
        "- DO NOT add any English words or offer labels\n" .
        "- DO NOT add any product or product placeholders\n" .
        "- Design should be versatile for any announcement message\n" .
        "- Background must allow text to be readable when added later\n" .
        "- Maintain brand identity and recognition\n" .
        "- Create emotional connection through design";
}

function build_from_image_prompt(array $client, string $user_text, string $image_size = 'post', ?string $language = null, ?string $country = null): string {
    $business_name = $client['business_name'] ?? 'Business';
    $industry = $client['industry'] ?? 'general';
    $brand_tone = $client['brand_tone'] ?? 'professional';
    $primary_color = $client['primary_color'] ?? '#000000';
    $secondary_color = $client['secondary_color'] ?? '#FFFFFF';
    $business_phone = $client['business_phone'] ?? ($client['phone_number'] ?? '');
    if (str_starts_with((string)$business_phone, 'web')) {
        $business_phone = '';
    }
    $business_address = $client['business_address'] ?? '';
    $lang_label = language_label(normalize_language($language));
    $currency = $country ? get_currency_for_country($country) : 'ILS';
    $size_hint = $image_size === 'story' ? '9:16 vertical story (1080x1920)' : '1:1 square post (1080x1080)';

    return "Edit the provided creative image to produce a new, on-brand design.\n\n" .
        "BRAND: {$business_name}\n" .
        "INDUSTRY: {$industry}\n" .
        "TONE: {$brand_tone}\n" .
        "COLORS: {$primary_color}, {$secondary_color}\n" .
        "LANGUAGE FOR NEW TEXT OVERLAYS: {$lang_label}\n" .
        "CURRENCY SYMBOL: {$currency}\n" .
        "FORMAT: {$size_hint}\n" .
        ($business_address ? "ADDRESS: {$business_address}\n" : '') .
        ($business_phone ? "PHONE: {$business_phone}\n" : '') .
        "\n" .
        get_logo_protection_rules() .
        "USER REQUEST:\n{$user_text}\n\n" .
        "RULES:\n" .
        "- Use the provided image as the base and build on top of it\n" .
        "- Include the business logo EXACTLY as provided - do NOT modify or translate any text in the logo\n" .
        "- Preserve the overall composition while applying the requested changes\n" .
        "- Keep it clean, modern, and brand-aligned\n" .
        "- The LANGUAGE setting above applies ONLY to new text overlays you add (headlines, CTAs) - NOT to the logo\n" .
        "- If the logo contains text in a different language than the job language, that is INTENTIONAL - preserve it exactly\n" .
        "- No borders, no frames, full-bleed design\n" .
        "- Output only the final design";
}

function build_before_after_prompt(array $client, string $user_text, string $image_size = 'post', ?string $language = null, ?string $country = null): string {
    $business_name = $client['business_name'] ?? 'Business';
    $industry = $client['industry'] ?? 'general';
    $brand_tone = $client['brand_tone'] ?? 'professional';
    $primary_color = $client['primary_color'] ?? '#000000';
    $secondary_color = $client['secondary_color'] ?? '#FFFFFF';
    $business_phone = $client['business_phone'] ?? ($client['phone_number'] ?? '');
    if (str_starts_with((string)$business_phone, 'web')) {
        $business_phone = '';
    }
    $business_address = $client['business_address'] ?? '';
    $lang_label = language_label(normalize_language($language));
    $currency = $country ? get_currency_for_country($country) : 'ILS';
    $size_hint = $image_size === 'story' ? '9:16 vertical story (1080x1920)' : '1:1 square post (1080x1080)';

    return "Create a before/after transformation creative using the two provided images.\n\n" .
        "BRAND: {$business_name}\n" .
        "INDUSTRY: {$industry}\n" .
        "TONE: {$brand_tone}\n" .
        "COLORS: {$primary_color}, {$secondary_color}\n" .
        "LANGUAGE FOR NEW TEXT OVERLAYS: {$lang_label}\n" .
        "CURRENCY SYMBOL: {$currency}\n" .
        "FORMAT: {$size_hint}\n" .
        ($business_address ? "ADDRESS: {$business_address}\n" : '') .
        ($business_phone ? "PHONE: {$business_phone}\n" : '') .
        "\n" .
        get_logo_protection_rules() .
        "USER REQUEST:\n{$user_text}\n\n" .
        "RULES:\n" .
        "- Image 1 is BEFORE, Image 2 is AFTER\n" .
        "- Include the business logo EXACTLY as provided - do NOT modify or translate any text in the logo\n" .
        "- Create a clean split layout (left before, right after) with a subtle divider\n" .
        "- Keep the original images recognizable and realistic\n" .
        "- The LANGUAGE setting above applies ONLY to new text overlays you add - NOT to the logo\n" .
        "- Use minimal labels like \"Before\" and \"After\" only if requested\n" .
        "- No borders, no frames, full-bleed design\n" .
        "- Output only the final design";
}

function build_tips_carousel_prompt(array $client, string $topic, array $tips, int $slide_number, int $total_slides, ?string $language = null, ?string $country = null): string {
    $business_name = $client['business_name'] ?? 'Business';
    $industry = $client['industry'] ?? 'general';
    $brand_tone = $client['brand_tone'] ?? 'professional';
    $primary_color = $client['primary_color'] ?? '#000000';
    $secondary_color = $client['secondary_color'] ?? '#FFFFFF';
    $business_phone = $client['business_phone'] ?? ($client['phone_number'] ?? '');
    if (str_starts_with((string)$business_phone, 'web')) {
        $business_phone = '';
    }
    $business_address = $client['business_address'] ?? '';
    $lang_label = language_label(normalize_language($language));
    
    // Get the specific tip for this slide
    $tip_text = $tips[$slide_number - 1] ?? '';
    
    // Determine if this is first, middle, or last slide for visual consistency
    $slide_type = 'middle';
    if ($slide_number === 1) {
        $slide_type = 'first';
    } elseif ($slide_number === $total_slides) {
        $slide_type = 'last';
    }
    
    $slide_hints = '';
    if ($slide_type === 'first' && $topic !== '') {
        $slide_hints = "- This is the FIRST slide (cover): Feature the topic title \"{$topic}\" prominently. Add a subtitle like \"Swipe for tips →\" or equivalent in {$lang_label}.\n";
    } elseif ($slide_type === 'last') {
        $slide_hints = "- This is the LAST slide: Include a call-to-action like \"Follow for more tips\" or \"Save this post\". Include contact info if provided.\n";
    } else {
        $slide_hints = "- This is slide {$slide_number} of {$total_slides}: Focus on presenting the tip clearly and memorably.\n";
    }

    return "Create slide {$slide_number} of {$total_slides} for a tips/educational Instagram carousel.\n\n" .
        "**BRAND:**\n" .
        "Business: {$business_name}\n" .
        "Industry: {$industry}\n" .
        "Tone: {$brand_tone}\n" .
        "Colors: Primary {$primary_color}, Secondary {$secondary_color}\n" .
        "Language for tip text: {$lang_label}\n" .
        ($business_address ? "Address: {$business_address}\n" : '') .
        ($business_phone ? "Phone: {$business_phone}\n" : '') .
        "\n" .
        get_logo_protection_rules() .
        "**TOPIC:** " . ($topic ?: 'Tips & Advice') . "\n" .
        "**THIS SLIDE'S TIP:** {$tip_text}\n" .
        "**SLIDE NUMBER:** {$slide_number} of {$total_slides}\n\n" .
        "**DESIGN REQUIREMENTS:**\n" .
        "- Perfect 1080x1080px square format\n" .
        "- Full-bleed design, NO white borders or margins\n" .
        "- Include the business logo EXACTLY as provided - do NOT modify or translate any text in the logo\n" .
        "- Large, readable tip number indicator (e.g., \"Tip {$slide_number}\" or just the number in a circle)\n" .
        "- The tip text should be the HERO element - large, clear, and easy to read\n" .
        "- Keep text to 1-3 sentences maximum per slide\n" .
        "- Use brand colors consistently\n" .
        "- Maintain visual consistency with other slides in the series (same layout structure, fonts, colors)\n" .
        "{$slide_hints}" .
        "\n" .
        "**STYLE GUIDELINES:**\n" .
        "- Clean, modern, educational aesthetic\n" .
        "- Good text contrast for readability\n" .
        "- Subtle background patterns or gradients (not plain solid colors)\n" .
        "- Professional but approachable\n" .
        "- Support RTL text if language requires it - but NEVER change the logo\n" .
        "\n" .
        "Output ONLY the final design image.";
}

function build_logo_prompt(array $client, array $profile = [], string $variant_hint = '', ?string $edit_request = null): string {
    $business_name = $client['business_name'] ?? 'Business';
    $industry = $client['industry'] ?? ($profile['category'] ?? 'general');
    $description = $client['business_description'] ?? '';
    $brand_tone = $client['brand_tone'] ?? 'professional';
    $primary_color = $client['primary_color'] ?? '#000000';
    $secondary_color = $client['secondary_color'] ?? '#FFFFFF';
    $target_audience = $profile['target_audience'] ?? '';

    $tone = match ($brand_tone) {
        'luxury' => 'luxury, elegant, premium',
        'playful' => 'playful, friendly, energetic',
        'minimal' => 'minimal, clean, modern',
        default => 'professional, modern, clean'
    };

    $rtl = preg_match('/[\\x{0600}-\\x{06FF}\\x{0590}-\\x{05FF}]/u', $business_name) ? 'Yes' : 'No';
    $edit_text = $edit_request ? "EDIT REQUEST: {$edit_request}\n" : '';
    $variant_text = $variant_hint ? "VARIANT: {$variant_hint}\n" : '';

    return "Design a premium brand logo.\n\n" .
        "{$variant_text}" .
        "{$edit_text}" .
        "BRAND NAME: {$business_name}\n" .
        "INDUSTRY: {$industry}\n" .
        ($description ? "DESCRIPTION: {$description}\n" : '') .
        ($target_audience ? "TARGET AUDIENCE: {$target_audience}\n" : '') .
        "TONE: {$tone}\n" .
        "BRAND COLORS: {$primary_color}, {$secondary_color}\n" .
        "RTL TEXT: {$rtl}\n\n" .
        "REQUIREMENTS:\n" .
        "- Create a clean, professional, vector-style logo\n" .
        "- Use 1-2 colors maximum (prefer brand colors)\n" .
        "- Provide a flat logo (no 3D, no shadows, no mockups)\n" .
        "- Centered on a clean white background\n" .
        "- Only include the exact brand name as text (no extra words)\n" .
        "- If the brand name is Arabic or Hebrew, use correct, readable lettering\n" .
        "- Keep shapes simple and memorable\n" .
        "- No gradients unless very subtle\n" .
        "- Output only the logo, no surrounding UI or scene";
}

function build_ad_copy_prompt(string $user_message, array $business_info, string $image_context = '', ?string $language = null, ?string $country = null): string {
    $business_name = $business_info['business_name'] ?? 'Business';
    $industry = $business_info['industry'] ?? 'general';
    $brand_tone = $business_info['brand_tone'] ?? 'professional';
    $business_phone = $business_info['business_phone'] ?? ($business_info['phone_number'] ?? '');
    if (str_starts_with((string)$business_phone, 'web')) {
        $business_phone = '';
    }
    $business_address = $business_info['business_address'] ?? '';
    $business_website = $business_info['website'] ?? '';
    $language = normalize_language($language);
    $language_name = language_label($language);
    $currency = get_currency_for_country($country ?? '');

    $image_block = $image_context !== '' ? "Image context:\n{$image_context}\n\n" : '';

    return "You are a professional social media copywriter.\n\n" .
        "Create engaging ad copy for this announcement: " . addslashes($user_message) . "\n\n" .
        "Business: {$business_name}\n" .
        "Industry: {$industry}\n" .
        "Brand Tone: {$brand_tone}\n\n" .
        $image_block .
        "IMPORTANT: Write the ad copy ONLY in {$language_name}.\n" .
        "Use the currency symbol {$currency} for any prices.\n" .
        "Return ONLY a single JSON object, no options, no rationale, no extra text.\n\n" .
        "Generate:\n" .
        "1. A catchy headline (1 line, max 80 chars)\n" .
        "2. Body text (3-5 sentences, max 350 chars)\n" .
        "3. Call-to-action (1 line, max 140 chars)\n\n" .
        "CTA MUST include available contact details (website, address, phone). Never omit a phone if provided.\n" .
        "Include suitable emojis for the CTA and contact details (e.g. 📍 📞 🌐 🔗).\n" .
        "CONTACT DETAILS (values only):\n" .
        "{$business_website}\n" .
        "{$business_address}\n" .
        "{$business_phone}\n\n" .
        "Use emojis appropriately.\n\n" .
        "Format your response as JSON:\n" .
        "{\n" .
        "  \"headline\": \"...\",\n" .
        "  \"body\": \"...\",\n" .
        "  \"cta\": \"...\"\n" .
        "}";
}

function build_ad_copy_edit_prompt(
    string $current_copy,
    string $user_edit,
    array $business_info,
    string $image_context = '',
    ?string $language = null,
    ?string $country = null,
    bool $allow_language_change = false
): string {
    $business_name = $business_info['business_name'] ?? 'Business';
    $industry = $business_info['industry'] ?? 'general';
    $brand_tone = $business_info['brand_tone'] ?? 'professional';
    $business_phone = $business_info['business_phone'] ?? ($business_info['phone_number'] ?? '');
    if (str_starts_with((string)$business_phone, 'web')) {
        $business_phone = '';
    }
    $business_address = $business_info['business_address'] ?? '';
    $business_website = $business_info['website'] ?? '';
    $image_block = $image_context !== '' ? "Image context:\n{$image_context}\n\n" : '';
    $language = normalize_language($language);
    $language_name = language_label($language);
    $currency = get_currency_for_country($country ?? '');

    return "You are a professional social media copywriter.\n\n" .
        "The current ad copy is:\n" .
        $current_copy . "\n\n" .
        "User feedback:\n" .
        $user_edit . "\n\n" .
        "Business: {$business_name}\n" .
        "Industry: {$industry}\n" .
        "Brand Tone: {$brand_tone}\n\n" .
        $image_block .
        "Revise the ad copy to satisfy the feedback while keeping it concise.\n" .
        ($allow_language_change
            ? "If the user explicitly requests a language, write ONLY in that language. Otherwise keep the current language (default: {$language_name}).\n"
            : "Write the ad copy ONLY in {$language_name}.\n") .
        "Use the currency symbol {$currency} for any prices.\n" .
        "Return ONLY a single JSON object, no options, no rationale, no extra text.\n" .
        "CTA MUST include available contact details (website, address, phone). Never omit a phone if provided.\n" .
        "Include suitable emojis for the CTA and contact details (e.g. 📍 📞 🌐 🔗).\n" .
        "CONTACT DETAILS (values only):\n" .
        "{$business_website}\n" .
        "{$business_address}\n" .
        "{$business_phone}\n" .
        "Return JSON with:\n" .
        "{\n" .
        "  \"headline\": \"...\",\n" .
        "  \"body\": \"...\",\n" .
        "  \"cta\": \"...\"\n" .
        "}";
}

function build_business_info_prompt(array $client): string {
    $business_name = $client['business_name'] ?? '';
    $business_address = $client['business_address'] ?? '';
    $business_phone = $client['phone_number'] ?? '';
    $industry = $client['industry'] ?? 'general';
    $brand_tone = $client['brand_tone'] ?? 'professional';
    $primary_color = $client['primary_color'] ?? '#000000';
    $secondary_color = $client['secondary_color'] ?? '#FFFFFF';
    $country = $client['country'] ?? '';

    $lines = [];
    foreach ([
        $business_name,
        $business_address,
        $business_phone,
        $industry,
        $brand_tone,
        trim($primary_color . ', ' . $secondary_color, ', '),
        $country
    ] as $value) {
        $value = trim((string)$value);
        if ($value !== '') {
            $lines[] = $value;
        }
    }
    return trim(implode("\n", $lines));
}

function build_image_analysis_prompt(): string {
    return "Describe the product and brand in this image in full detail. Fully ignore the background. Focus ONLY on the product. \n" .
        "if the Image is the business logo describe it.";
}

function build_initial_prompt_system(): string {
    return "## 🎨 SYSTEM PROMPT: Image ad template Prompt Generator for Product Creatives\n\n" .
        "A – Ask:\n" .
        "  Generate an image ad template prompt (stringified as JSON), plus a short caption and a structured creative summary, based on a product reference image and the user’s creative intent.\n\n" .
        "G – Guidance:\n" .
        "  role: Seasoned creative director with deep expertise in visual storytelling, branding, and advertising\n" .
        "  output_count: 1\n" .
        "  character_limit: No hard limit, but each output should remain focused and readable\n\n" .
        "  constraints:\n" .
        "    - Do not quote the creative brief verbatim. Try to analyse it, improve it, extract its main ideas and prompt based on it. Assume users are stupid or ignorant. Users are speaking to you as if you were a person, try to understand their requets and not verbatim doing it. If the user's brief is without a product (is an announcement or general content post request) try to think of a design that fits the barand, its products and audiance. For example include some unspecified random unbranded prodcuts for a perfume shop's announcement about closure or whatever.\n" .
        "    - Prioritise dynamic backgrounds and elements, with scenes that are fully detailed out (unless otherwise specified by the user)\n" .
        "    - Reference image must be mentioned and used for detailed visual context\n" .
        "    - Preserve product label, color, and packaging fidelity\n" .
        "    - LOGO IS SACRED: The logo must NEVER be modified, translated, or altered in ANY way. Even if the logo contains text in a different language than the job language, preserve it EXACTLY as provided. The language setting applies ONLY to new text overlays, NOT to the logo.\n" .
        "    - Avoid vague, generic, or brand-inaccurate descriptions\n" .
        "    - If the reference image contains background elements, ignore them unless essential—focus solely on the product as the visual centerpiece\n" .
        "    - If the user’s brief lacks detail, creatively interpret their intent and propose a well-directed image and video concept. Be imaginative — act like a creative director, not a mirror.\n" .
        "    - When the brief is vague, choose from one of the provided inspirational examples below and adapt its style, tone, and structure to fit the specific product and context.\n" .
        "    - The image setting must align with the image setting\n" .
        "    - Infer from the creative brief all details such as address, website url, sale terms, phone numbers, contact details, prices, old prices, or other marketing or contact info and add them to the imgage prompt, to be inserted where suitable but not on the produt or behind it bur rather in the best position in the template. All inferred details must be included.\n" .
        "    - Any inferred element is to be placed not on the product. Nothing can be printed or put on top of the product.\n" .
        "    - Inferred info must be professionally formatted and made to sell. Prices in price stickers matching the design. Address and contact elements the same on top of good elements that are good for social medial. If the user gives before and after price extract them without the words, price only.\n" .
        "    - ALL inferred element MUST be included\n" .
        "    - business info: do not prompt or output keys, only their values (e.g. no need for ADDRESS: TEL AVIV just write the address)\n\n" .
        "    - \"image_prompt\" must be a string and include the following. Make sure to mention to Keep the product’s packaging, label, text, logo and all design details 100% sharp, clear and untouched. Make sure the background color matches or complements the dominant packaging color. Use realistic shadows and depth. :\n" .
        "      - description\n" .
        "      - inferred elements\n" .
        "      - setting\n" .
        "      - background\n" .
        "      - composition\n" .
        "      - elements\n" .
        "      - lighting\n" .
        "      - camera_type\n" .
        "      - camera_settings\n" .
        "      - effects\n" .
        "      - style\n\n" .
        "    - \"creative_summary\" must begin with a short, non-technical paragraph summarizing where the image is, what's the style. Then use:\n\n" .
        "      🖼️ IMAGE:\n" .
        "      - just summarize the image prompt above but in bullet points\n\n" .
        "    - \"caption\" must include at least one emoji and 1–2 relevant hashtags. Keep it punchy and optimized for social sharing.\n\n" .
        "E – Examples:\n" .
        "  Eye-Catchy Product Video:\n" .
        "  Capture a cinematic shot of a sunlit Scandinavian bedroom. A sealed IKEA box trembles, opens, and flat pack furniture assembles rapidly into a serene, styled room highlighted by a yellow IKEA throw on the bed. Elements include a fixed wide-angle camera, natural warm lighting with cool accents, and details such as the IKEA box (logo visible), bed with yellow throw, bedside tables, lamps, wardrobe, shelves, mirror, art, rug, curtains, reading chair, and plants. The motion features the box opening and furniture assembling precisely and rapidly. It ends in a calm, modern space with the signature yellow IKEA accent. Keywords include 16:9, IKEA, Scandinavian, fast assembly, no text, warm & cool tones. No text should appear on screen.\n\n" .
        "  Product Photoshoot:\n" .
        "  Create a hyper-realistic, high-energy product photo using my exact product from the reference image I provide. Keep the product’s packaging, label, text, logo and all design details 100% sharp, clear and untouched — do NOT blur or change any part of the label or text. Place the product in the center with an explosion of its natural flavor ingredients (for example: cereal balls, chocolate pieces, milk splashes, strawberries, or other matching ingredients). Make sure the background color matches or complements the dominant packaging color. Add dynamic lighting and a vivid splash effect to create energy, but keep the product label perfectly readable and in focus. Use realistic shadows and depth. The final image should feel delicious, fun and eye-catching, with every product detail fully visible and sharp. On the bototm left add the provided price (250 ILS) and on the bottom right add the contact details: Phone icon followed by 05454515506\n\n" .
        "  Street Style Product Ad:\n" .
        "  Capture a cinematic eyewear portrait from a low angle as a model looks skyward, chin raised in defiance beneath thick, acid-toned sunglasses that wrap tightly across their face. Behind them, rooftops and textures fade into bokeh, contrasting with the glossy sharpness of the sculptural frames. Style with street-meets-sci-fi minimalism — raw skin, matte or sweaty, with clean-lined hair and expressive stillness. Let harsh midday or early golden light cast crisp shadows across the scene. Overlay the warped, melting GlassEye™ logo across the lens or subtly floating in space — a symbol of visual rebellion. Mood: confident, elusive, and hyper-modern.\n\n" .
        "N – Notation:\n" .
        "  format: JSON\n" .
        "  example_output: |\n" .
        "      {\n" .
        "        \"image_prompt\": \"string\",\n" .
        "        \"caption\": \"short caption\",\n" .
        "        \"creative_summary\": \"summary of the combined visual concept\",\n" .
        "      }\n\n" .
        "T – Tools:\n" .
        "  You have access to the following tools. Each one is described clearly:\n" .
        "  - Think Tool: Use this to reflect and reason before responding.";
}

function build_initial_prompt_user(string $user_text, string $business_prompt, string $image_description, ?string $language = null, ?string $country = null): string {
    $language = normalize_language($language);
    $language_name = language_label($language);
    $currency = get_currency_for_country($country ?? '');
    return "This is the initial creative brief:\n" .
        json_encode($user_text) . "\n" .
        "Here is the Business info:\n" .
        $business_prompt . "\n\n" .
        "Description of the product/business logo:\n" .
        $image_description . "\n\n" .
        "Language: {$language_name}\n" .
        "Currency symbol: {$currency}\n\n" .
        "*business info: do not prompt or output keys, only their values (e.g. no need for ADDRESS: TEL AVIV just write the address)\n" .
        "For a product image:\n" .
        "Use the Think tool to double check your output. Make sure the model understand this is a template to be generated with all inferred info, and then we place the prodcut in the center. Inferred info cannot cover, be a part of, on top of, or behind the product. \n\n" .
        "For a logo image:\n" .
        "Use the Think tool to double check your output. Make sure the model understand this is a template to be generated with all inferred info, make sure the user request is fulfilled. \n" .
        "Then Deside where is the optimal place for the logo.\n\n" .
        "Rules:\n\n" .
        "CRITICAL LOGO PROTECTION:\n" .
        "- The logo is a SACRED element and must NEVER be modified, translated, or altered in any way.\n" .
        "- If the logo contains text in Hebrew, Arabic, or any language, it must remain EXACTLY as provided.\n" .
        "- The language setting ({$language_name}) applies ONLY to NEW text overlays you create - NOT to the logo.\n" .
        "- Even if the logo text is in a different language than {$language_name}, DO NOT translate or change it.\n\n" .
        "The given images (product image or logo) should never be altered.";
}

function build_final_prompt(string $image_prompt, bool $has_product, ?string $language = null, ?string $currency = null): string {
    $normalized = str_replace(["\r\n", "\r", "\n"], "\\n", $image_prompt);
    $normalized = trim($normalized);
    $base = $has_product
        ? "Take the product or service image or provided image or reference image in the first image and place it in this scenario: {$normalized}.\n"
        : "Create an announcement design template based on this scenario: {$normalized}.\n" .
          "Do NOT add any product or product placeholders.\n";
    $language = normalize_language($language);
    $language_name = language_label($language);
    $currency = $currency ?: get_currency_for_country('');

    return $base .
        "\n" . get_logo_protection_rules() .
        "then Place the second image [logo] where suitable - USE IT EXACTLY AS PROVIDED, DO NOT MODIFY IT.\n" .
        "- NEW TEXT OVERLAYS (headlines, CTAs, prices) must be in {$language_name}.\n" .
        "- The language setting does NOT apply to the logo - the logo text must remain exactly as provided even if in a different language.\n" .
        "- Use the currency symbol {$currency} for any prices.\n" .
        "- non-numeric characters: Output in exact origin language.\n" .
        "- numbers: output only only in english\n" .
        "- phone numbers: output in local not international format (e.g. 972545451508 becoems 0545451508)\n" .
        "- ABSOLUTELY NO CHANGES CAN BE DONE TO THE PRODUCT IMAGE OR LOGO. NO REGENERATION, NO TRANSLATION, NO MODIFICATION.\n" .
        "- Never modify, alter, or change any human faces, human bodies, animals, or living beings in any image";
}

function build_multi_swap_prompt(array $client, array $product): string {
    $business_name = $client['business_name'] ?? 'Business';
    $primary_color = $client['primary_color'] ?? '#000000';
    $secondary_color = $client['secondary_color'] ?? '#FFFFFF';
    $brand_tone = $client['brand_tone'] ?? 'professional';
    $name = $product['product_name'] ?? '';
    $price = $product['price'] ?? '';
    $old_price = $product['old_price'] ?? '';
    $notes = $product['notes'] ?? '';

    return "You are editing a finished ad template to swap in a different product.\n\n" .
        get_logo_protection_rules() .
        "STRICT INSTRUCTIONS:\n" .
        "- Keep the layout, colors, logo placement, typography style, and background EXACTLY the same.\n" .
        "- The LOGO must remain EXACTLY as it is - do NOT modify, translate, or change any part of it.\n" .
        "- Replace ONLY the product image and the product text fields.\n" .
        "- The product name MUST be included as visible text on the design.\n" .
        "- Keep the product name text in the EXACT same position and size as the original template.\n" .
        "- Use the provided product image as the new product.\n" .
        "- Update the text to match the new product details below.\n" .
        "- If old price is empty, remove the old price element.\n" .
        "- If notes are empty, remove the notes element.\n" .
        "- Preserve brand style: {$brand_tone}. Brand colors: {$primary_color}, {$secondary_color}.\n\n" .
        "BUSINESS: {$business_name}\n" .
        "PRODUCT NAME: {$name}\n" .
        "PRICE: {$price}\n" .
        "OLD PRICE: {$old_price}\n" .
        "NOTES: {$notes}\n\n" .
        "TEXT RULES:\n" .
        "- Use the original language for all text overlays.\n" .
        "- Respect RTL for Arabic/Hebrew text overlays.\n" .
        "- NEVER change the logo text, even if it's in a different language.\n";
}

function build_editor_system_prompt(): string {
    return "You are 'AdlyEditor', an expert image prompt refinement specialist. Your sole and highly constrained function is to edit an existing, structured image generation prompt based on a user's short, descriptive editing request.\n\n" .
        "**1. Your Goal:**\n" .
        "To receive an existing image generation prompt (userPrompt) and a short editing instruction from the user. You must then output the SINGLE revised prompt string that integrates the user's requested changes.\n\n" .
        "**2. Tool Parameters You Will Receive:**\n" .
        "You receive these two mandatory parameters from the main AI Agent:\n" .
        "* **userPrompt (string):** The full, current image generation prompt that needs editing. This prompt is structured, highly detailed, and designed for a generative AI model (like Google Gemini).\n" .
        "* **imageUrl (string):** The url of the image currently being reviewed. This url is provided for context only; you MUST NOT use it in your output.\n\n" .
        "**3. Your Output (Strict Requirement):**\n" .
        "Your final and ONLY output must be a single JSON object containing the revised prompt string.\n\n" .
        "* **Output Parameter:** \"prompt\"\n" .
        "* **Output Format:**\n" .
        "{\n" .
        "  \"prompt\": \"<the fully revised image generation prompt>\"\n" .
        "}\n\n" .
        "**4. Critical Rules:**\n" .
        "- You MUST preserve the entire original prompt structure unless it conflicts with the user's request.\n" .
        "- You MUST implement ONLY the requested edits.\n" .
        "- You MUST NOT remove essential design constraints (edges, layout, no-text rules) unless explicitly requested.\n" .
        "- CRITICAL: NEVER add instructions to modify, translate, or change the logo in any way. The logo is SACRED and must remain exactly as provided.\n" .
        "- If the user asks to change text, this applies ONLY to overlay text (headlines, CTAs) - NEVER to the logo.\n" .
        "- Do NOT output anything besides the JSON object.";
}

function build_ugc_system_prompt(): string {
    return "Your task: Create video prompts as guided by your system guidelines.\n\n" .
        "Make sure that the reference image is depicted as ACCURATELY as possible in the resulting images, especially all text.\n\n" .
        "For each of the scenes, make sure the dialogue runs continuously and makes sense. And always have the character just talk about the product and its benefits based on what you understand about the brand, and how it's used. So if it's a drink, talk about the taste; if it's a bag, talk about the design; if it's tech, talk about its features, and so on.\n\n" .
        "If the character will mention the brand name, only do so in the FIRST scene.\n\n" .
        "Unless stated by the user, do not have the character open or eat or use the product. they are just showing it to the camera.\n\n" .
        "If the number of videos is not stated, generate 3 scenes.";
}

function build_ugc_scene_system_prompt(): string {
    return "system_prompt: |\n" .
        "  ## SYSTEM PROMPT: UGC-Style Veo3/Veo3_fast Prompt Generator (Video-Only)\n\n" .
        "  You are a UGC (User-Generated Content) AI agent.\n" .
        "  Your task: Take the reference image or the product in the reference image and place it into realistic, casual scenes as if captured by everyday content creators or influencers.\n\n" .
        "  All outputs must feel natural, candid, and unpolished — avoiding professional or overly staged looks. This means:\n\n" .
        "    - Everyday realism with authentic, relatable settings\n" .
        "    - Amateur-quality iPhone photo/video style\n" .
        "    - Slightly imperfect framing and lighting\n" .
        "    - Candid poses and genuine expressions\n" .
        "    - Visible imperfections (blemishes, messy hair, uneven skin)\n" .
        "    - Real-world environments left as-is (clutter, busy backgrounds)\n\n" .
        "  We need these videos to look natural and real. So in the prompts, have the Camera parameter always use keywords like these: unremarkable amateur iPhone photos, reddit image, snapchat video, Casual iPhone selfie, slightly uneven framing, Authentic share, slightly blurry, Amateur quality phone photo\n\n" .
        "  If the dialogue is not provided by the user or you are explicitly asked to create it, generate a casual, conversational line under 150 characters, as if a person were speaking naturally to a friend while talking about the product. Avoid overly formal or sales-like language. The tone should feel authentic, spontaneous, and relatable, matching the UGC style. Use ... to indicate pauses, and avoid special characters like em dashes or hyphens. If the dialogue language was specified by the user, use it in the langauge: paramter in the prompt. If no lanaguge was set by the user, make dialoge language the same languaeg as the user's prompt language.\n\n" .
        "Except for the user's required dialogue script (if provided and needs to be passed in the prompt verbatim) or required language, the prompt itself should always be generated in English.\n\n" .
        "  A – Ask:\n" .
        "    Generate only video generation instructions for AI models (no image prompts). Infer aspect ratios from vertical/horizontal context; default to vertical if unspecified.\n\n" .
        "    Scene count rule:\n" .
        "    - Read the user's requested total video duration and the per-video length (in seconds).\n" .
        "    - Calculate the required number of videos by dividing total duration by per-video length, rounding up to the nearest integer.\n" .
        "    - Output exactly that many scenes.\n" .
        "    - Never output more or fewer scenes than requested.\n\n" .
        "  G – Guidance:\n" .
        "    - Always follow UGC-style casual realism principles listed above.\n" .
        "    - Ensure diversity in gender, ethnicity, and hair color when applicable. Default to actors in 21 to 38 years old unless specified otherwise.\n" .
        "    - Use provided scene list when available.\n" .
        "    - Do not use double quotes in any part of the prompts.\n\n" .
        "  N – Notation:\n" .
        "    - Final output is a scenes array at the root level.\n" .
        "    - The array must contain exactly scene_count objects, where scene_count is the user-calculated number.\n" .
        "    - Each scene contains:\n" .
        "      - video_prompt → stringified YAML with: dialogue, emotion, voice_type, action, character, setting, camera\n" .
        "      - aspect_ratio_video → 9:16 or 16:9 (default vertical → 9:16)\n" .
        "      - model → veo3 or veo3_fast\n\n" .
        "  T – Tools:\n" .
        "    - Think Tool: Double-check output for completeness, diversity, adherence to style, and that the number of scenes exactly matches the requested count.";
}

function build_ugc_scene_user_prompt(string $user_text, string $image_description, int $scene_count, ?string $spoken_language, ?string $accent): string {
    $spoken_language = $spoken_language ?: 'auto';
    $accent = $accent ?: 'auto';
    return "Your task: Create video prompts as guided by your system guidelines.\n\n" .
        "Make sure that the reference image is depicted as ACCURATELY as possible in the resulting images, especially all text.\n\n" .
        "For each of the scenes, make sure the dialogue runs continuously and makes sense. And always have the character just talk about the product and its benefits based on what you understand about the brand, and how it's used. So if it's a drink, talk about the taste; if it's a bag, talk about the design; if it's tech, talk about its features, and so on.\n\n" .
        "If the character will mention the brand name, only do so in the FIRST scene.\n\n" .
        "Unless stated by the user, do not have the character open or eat or use the product. they are just showing it to the camera.\n\n" .
        "If the number of videos is not stated, generate {$scene_count} scenes.\n\n" .
        "***\n\n" .
        "These are the user's instructions\n" .
        ($user_text ?: 'No explicit instructions provided.') . "\n" .
        "Make sure actor and voice stay the same in all scenes. Do not add on-screen text or captions unless the user explicitly requested it.\n\n" .
        "***\n\n" .
        "Count of videos to create: {$scene_count}. Each video will be 8 seconds long.\n\n" .
        "***\n" .
        "Description of the reference image/s. Just use this to understand who the product or character is, don't use it as basis for the dialogue.\n" .
        ($image_description ?: 'No image description available.') . "\n\n" .
        "***\n" .
        "The user's preferred aspect ratio: vertical by default unless stated.\n\n" .
        "The user's preferred model: veo3_fast by default unless stated.\n\n" .
        "The user's preferred dialogue script: inferred based on their message above, suggest a script.\n\n" .
        "Narration language: {$spoken_language}\n" .
        "Voice accent: {$accent}\n\n" .
        "***\n" .
        "Use the Think tool to double check your output.";
}

function build_landing_page_prompt(array $brand, string $user_text, string $slug, array $image_urls = []): string {
    $business_name = $brand['business_name'] ?? 'Business';
    $industry = $brand['industry'] ?? 'general';
    $brand_tone = $brand['brand_tone'] ?? 'professional';
    $primary_color = $brand['primary_color'] ?? '#9333ea';
    $secondary_color = $brand['secondary_color'] ?? '#ec4899';
    $description = $brand['business_description'] ?? '';
    $website = $brand['website'] ?? '';
    $instagram = $brand['instagram_handle'] ?? '';
    $target_audience = $brand['target_audience'] ?? '';
    $location = $brand['business_address'] ?? '';
    $phone = $brand['business_phone'] ?? '';
    $logo_url = $brand['logo_url'] ?? '';

    $images_text = '';
    if ($image_urls) {
        $images_text = "USER IMAGES (must be embedded in the page):\n" .
            implode("\n", array_map(static fn($url) => "- {$url}", $image_urls)) . "\n\n";
    }

    return "You are an expert conversion-focused landing page designer.\n\n" .
        "Generate a SHORT, high-converting landing page for a service or offer. The page must be mobile-first, clean, and direct.\n\n" .
        "BUSINESS INFO (values only):\n" .
        "{$business_name}\n" .
        "{$industry}\n" .
        "{$brand_tone}\n" .
        "{$primary_color}, {$secondary_color}\n" .
        "{$description}\n" .
        "{$website}\n" .
        "{$instagram}\n" .
        "{$target_audience}\n" .
        "{$location}\n" .
        "{$phone}\n" .
        "{$logo_url}\n\n" .
        "OFFER DESCRIPTION (from client):\n" .
        "{$user_text}\n\n" .
        $images_text .
        "STRICT REQUIREMENTS:\n" .
        "- Output MUST be a full HTML document (include <!DOCTYPE html>, <head>, <style>, <body>).\n" .
        "- Use ONLY inline CSS in a <style> tag. No external JS.\n" .
        "- Use a Google Font for typography. For Arabic/Hebrew, choose a high-quality Arabic/Hebrew Google Font (e.g. Cairo, Tajawal, Assistant) and import it with @import inside <style>.\n" .
        "- Keep the page short and focused: hero, benefits, social proof, and a lead form.\n" .
        "- Ensure the design is fully responsive and looks great on mobile.\n" .
        "- Use the brand colors and tone in the design.\n" .
        "- Include a lead capture form with name, email, phone, and a submit button.\n" .
        "- If user images are provided, place up to TWO images in the layout where suitable (hero/supporting section). Never stretch or distort them.\n" .
        "- The form MUST post to {{FORM_ACTION}} and MUST include a hidden input named landing_page_slug with value {$slug}.\n" .
        "- Do NOT include any analytics scripts.\n" .
        "- Make it visually premium: strong spacing rhythm, elegant typography scale, subtle gradients, soft shadows, rounded cards, and clear hierarchy.\n" .
        "- If the language is Arabic or Hebrew, set dir=\"rtl\" and ensure proper RTL alignment.\n\n" .
        "- Use clear CTAs and concise copy.\n\n" .
        "OUTPUT FORMAT:\n" .
        "Return ONLY the full HTML document. Do NOT wrap in JSON or code fences.\n";
}

function build_content_plan_prompt(array $brand, string $mode, ?string $user_text = null): string {
    $business_name = $brand['business_name'] ?? 'Business';
    $industry = $brand['industry'] ?? 'general';
    $brand_tone = $brand['brand_tone'] ?? 'professional';
    $description = $brand['business_description'] ?? '';
    $website = $brand['website'] ?? '';
    $instagram = $brand['instagram_handle'] ?? '';
    $target_audience = $brand['target_audience'] ?? '';
    $country = $brand['country'] ?? '';

    $mode_text = $mode === 'manual'
        ? "The user has provided a brief. Use it to craft the plan."
        : "The user chose auto mode. You decide the themes based on brand info.";

    $user_text = $user_text ? "USER BRIEF:\n{$user_text}\n\n" : '';

    return "You are a social media strategist.\n\n" .
        "Create a 4-item content plan for the next month. Each item must be suitable for Instagram/Facebook.\n\n" .
        "BRAND INFO:\n" .
        "Name: {$business_name}\n" .
        "Industry: {$industry}\n" .
        "Brand tone: {$brand_tone}\n" .
        "Description: {$description}\n" .
        "Website: {$website}\n" .
        "Instagram: {$instagram}\n" .
        "Target audience: {$target_audience}\n" .
        "Country: {$country}\n\n" .
        $user_text .
        "MODE:\n{$mode_text}\n\n" .
        "REQUIREMENTS:\n" .
        "- Return exactly 4 ideas.\n" .
        "- Each idea must include a short title, a 1-2 sentence description, and a job_type.\n" .
        "- job_type must be one of: announcement, product_sale, from_image, before_after.\n" .
        "- Keep ideas realistic and on-brand.\n" .
        "- Do not include markdown or extra commentary.\n\n" .
        "OUTPUT FORMAT (JSON only):\n" .
        "{\n" .
        "  \"ideas\": [\n" .
        "    {\"title\": \"...\", \"description\": \"...\", \"job_type\": \"announcement\"}\n" .
        "  ]\n" .
        "}\n";
}
?>
