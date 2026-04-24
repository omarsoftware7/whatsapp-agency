<?php

function format_ad_copy_caption(string $ad_copy): string {
    $ad_copy = trim($ad_copy);
    if ($ad_copy === '') {
        return '';
    }

    $payload = json_decode($ad_copy, true);
    if (!is_array($payload)) {
        if (preg_match('/\{[\s\S]*\}/', $ad_copy, $matches)) {
            $payload = json_decode($matches[0], true);
        }
    }

    if (is_array($payload)) {
        $parts = [];
        foreach (['headline', 'body', 'cta'] as $key) {
            if (isset($payload[$key]) && is_string($payload[$key])) {
                $value = trim($payload[$key]);
                if ($value !== '') {
                    $parts[] = $value;
                }
            }
        }
        if ($parts) {
            return trim(implode("\n\n", $parts));
        }
    }

    return $ad_copy;
}
