<?php
require_once '../config.php';
require_once __DIR__ . '/publish_helpers.php';

session_start();

if (!isset($_SESSION['web_user_id'])) {
    json_error('Unauthorized', 401);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed', 405);
}

$input = json_decode(file_get_contents('php://input'), true);
$job_id = $input['job_id'] ?? null;
$publish_type = $input['publish_type'] ?? 'post'; // 'post' or 'story'

if (!$job_id) {
    json_error('job_id required');
}

// Validate publish_type
if (!in_array($publish_type, ['post', 'story'], true)) {
    $publish_type = 'post';
}

$db = get_db();
$user_id = (int)$_SESSION['web_user_id'];

$stmt = $db->prepare("
    SELECT j.*, c.id AS client_id
    FROM creative_jobs j
    JOIN clients c ON j.client_id = c.id
    WHERE j.id = ?
");
$stmt->execute([$job_id]);
$job = $stmt->fetch();

if (!$job) {
    json_error('Job not found', 404);
}

$stmt = $db->prepare("
    SELECT client_id
    FROM web_user_clients
    WHERE web_user_id = ? AND client_id = ?
");
$stmt->execute([$user_id, $job['client_id']]);
if (!$stmt->fetch()) {
    json_error('Brand not found', 404);
}

$profileStmt = $db->prepare("
    SELECT meta_page_id,
           meta_page_token,
           meta_page_token_expires,
           instagram_account_id,
           meta_tokens_valid
    FROM web_brand_profiles
    WHERE client_id = ?
");
$profileStmt->execute([$job['client_id']]);
$profile = $profileStmt->fetch();

if (empty($profile['meta_tokens_valid']) || empty($profile['meta_page_token'])) {
    json_error('Meta tokens not configured', 400);
}

$db->prepare("
    UPDATE creative_jobs 
    SET publish_approved = TRUE,
        publish_approved_at = NOW(),
        current_stage = 'publishing'
    WHERE id = ?
")->execute([$job_id]);

$image_url = null;
$multi_images = [];
if ($job['job_type'] === 'multi_mode') {
    $stmt = $db->prepare("
        SELECT generated_image_url
        FROM web_multi_products
        WHERE job_id = ? AND generated_image_url IS NOT NULL
        ORDER BY sort_order ASC, id ASC
    ");
    $stmt->execute([$job_id]);
    $multi_images = array_map(static function ($row) {
        return $row['generated_image_url'];
    }, $stmt->fetchAll());
    $multi_images = array_values(array_filter($multi_images));
    if (count($multi_images) > 10) {
        $multi_images = array_slice($multi_images, 0, 10);
    }
    if (!$multi_images) {
        json_error('No generated images found', 400);
    }
} else {
    $designs = json_decode($job['design_variations'], true);
    $approved_index = $job['approved_design_index'] ?? 0;
    $image_url = $designs[$approved_index] ?? null;
    if (!$image_url) {
        json_error('No approved design found', 400);
    }
}

$ad_copy = format_ad_copy_caption((string)($job['ad_copy'] ?? ''));
$page_token = $profile['meta_page_token'];
$page_id = $profile['meta_page_id'];
$ig_account_id = $profile['instagram_account_id'];

$results = [];

if ($page_id) {
    // Multi-mode: always post (no story support)
    if ($job['job_type'] === 'multi_mode') {
        $attached = [];
        foreach ($multi_images as $url) {
            $fb_url = "https://graph.facebook.com/" . META_GRAPH_API_VERSION . "/{$page_id}/photos";
            $fb_data = [
                'url' => $url,
                'published' => 'false',
                'access_token' => $page_token
            ];
            $ch = curl_init($fb_url);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($fb_data));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            $fb_response = curl_exec($ch);
            $fb_result = json_decode($fb_response, true);
            curl_close($ch);
            if (!empty($fb_result['id'])) {
                $attached[] = ['media_fbid' => $fb_result['id']];
            }
        }
        if (!$attached) {
            $results['facebook'] = [
                'success' => false,
                'error' => 'Failed to upload images'
            ];
        } else {
            $feed_url = "https://graph.facebook.com/" . META_GRAPH_API_VERSION . "/{$page_id}/feed";
            $feed_data = [
                'message' => $ad_copy,
                'attached_media' => json_encode($attached),
                'access_token' => $page_token
            ];
            $ch = curl_init($feed_url);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($feed_data));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            $feed_response = curl_exec($ch);
            $feed_result = json_decode($feed_response, true);
            curl_close($ch);
            if (!empty($feed_result['id'])) {
                $results['facebook'] = [
                    'success' => true,
                    'post_id' => $feed_result['id']
                ];
                $db->prepare("UPDATE creative_jobs SET facebook_post_id = ? WHERE id = ?")
                   ->execute([$feed_result['id'], $job_id]);
            } else {
                $results['facebook'] = [
                    'success' => false,
                    'error' => $feed_result['error']['message'] ?? 'Unknown error'
                ];
            }
        }
    } elseif ($publish_type === 'story') {
        // Publish as Facebook Page Story
        $fb_url = "https://graph.facebook.com/" . META_GRAPH_API_VERSION . "/{$page_id}/photo_stories";
        $fb_data = [
            'photo_url' => $image_url,
            'access_token' => $page_token
        ];

        $ch = curl_init($fb_url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($fb_data));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        $fb_response = curl_exec($ch);
        $fb_result = json_decode($fb_response, true);
        curl_close($ch);

        if (isset($fb_result['post_id']) || isset($fb_result['id'])) {
            $story_id = $fb_result['post_id'] ?? $fb_result['id'];
            $results['facebook'] = [
                'success' => true,
                'post_id' => $story_id,
                'type' => 'story'
            ];
            $db->prepare("UPDATE creative_jobs SET facebook_post_id = ? WHERE id = ?")
               ->execute([$story_id, $job_id]);
        } else {
            $results['facebook'] = [
                'success' => false,
                'error' => $fb_result['error']['message'] ?? 'Story creation failed'
            ];
        }
    } else {
        // Regular post
        $fb_url = "https://graph.facebook.com/" . META_GRAPH_API_VERSION . "/{$page_id}/photos";
        $fb_data = [
            'url' => $image_url,
            'caption' => $ad_copy,
            'access_token' => $page_token
        ];

        $ch = curl_init($fb_url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($fb_data));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        $fb_response = curl_exec($ch);
        $fb_result = json_decode($fb_response, true);
        curl_close($ch);

        if (isset($fb_result['id'])) {
            $results['facebook'] = [
                'success' => true,
                'post_id' => $fb_result['id']
            ];

            $db->prepare("UPDATE creative_jobs SET facebook_post_id = ? WHERE id = ?")
               ->execute([$fb_result['id'], $job_id]);
        } else {
            $results['facebook'] = [
                'success' => false,
                'error' => $fb_result['error']['message'] ?? 'Unknown error'
            ];
        }
    }
}

if ($ig_account_id) {
    // Multi-mode: always carousel post (no story support)
    if ($job['job_type'] === 'multi_mode') {
        $child_ids = [];
        foreach ($multi_images as $url) {
            $child_url = "https://graph.facebook.com/" . META_GRAPH_API_VERSION . "/{$ig_account_id}/media";
            $child_data = [
                'image_url' => $url,
                'is_carousel_item' => 'true',
                'access_token' => $page_token
            ];
            $ch = curl_init($child_url);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($child_data));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            $child_response = curl_exec($ch);
            $child_result = json_decode($child_response, true);
            curl_close($ch);
            if (!empty($child_result['id'])) {
                $child_ids[] = $child_result['id'];
            }
        }
        if (!$child_ids) {
            $results['instagram'] = [
                'success' => false,
                'error' => 'Failed to create carousel items'
            ];
        } else {
            $carousel_url = "https://graph.facebook.com/" . META_GRAPH_API_VERSION . "/{$ig_account_id}/media";
            $carousel_data = [
                'media_type' => 'CAROUSEL',
                'children' => implode(',', $child_ids),
                'caption' => $ad_copy,
                'access_token' => $page_token
            ];
            $ch = curl_init($carousel_url);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($carousel_data));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 30);
            $carousel_response = curl_exec($ch);
            $carousel_http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            $carousel_result = json_decode($carousel_response, true);

            if (!empty($carousel_result['id']) && $carousel_http_code == 200) {
                $container_id = $carousel_result['id'];
                $container_ready = false;
                $last_error = null;
                for ($i = 0; $i < 10; $i++) {
                    sleep(2);
                    $status_url = "https://graph.facebook.com/" . META_GRAPH_API_VERSION . "/{$container_id}?fields=status_code&access_token={$page_token}";
                    $ch = curl_init($status_url);
                    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                    $status_response = curl_exec($ch);
                    curl_close($ch);
                    $status_result = json_decode($status_response, true);
                    $status = $status_result['status_code'] ?? null;
                    if ($status === 'FINISHED') {
                        $container_ready = true;
                        break;
                    }
                    if ($status === 'ERROR') {
                        $last_error = $status_result['error']['message'] ?? 'Container error';
                        break;
                    }
                }
                if ($container_ready) {
                    $publish_url = "https://graph.facebook.com/" . META_GRAPH_API_VERSION . "/{$ig_account_id}/media_publish";
                    $publish_data = [
                        'creation_id' => $container_id,
                        'access_token' => $page_token
                    ];
                    $ch = curl_init($publish_url);
                    curl_setopt($ch, CURLOPT_POST, true);
                    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($publish_data));
                    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
                    $publish_response = curl_exec($ch);
                    $publish_http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                    curl_close($ch);
                    if ($publish_response === false) {
                        $results['instagram'] = [
                            'success' => false,
                            'error' => 'Publish connection failed'
                        ];
                    } else {
                        $publish_result = json_decode($publish_response, true);
                        if (isset($publish_result['id']) && $publish_http_code == 200) {
                            $media_id = $publish_result['id'];
                            $permalink = null;
                            sleep(2);
                            $permalink_url = "https://graph.facebook.com/" . META_GRAPH_API_VERSION . "/{$media_id}?fields=permalink&access_token={$page_token}";
                            $ch = curl_init($permalink_url);
                            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
                            $permalink_response = curl_exec($ch);
                            $permalink_http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                            curl_close($ch);
                            if ($permalink_response && $permalink_http_code == 200) {
                                $permalink_data = json_decode($permalink_response, true);
                                $permalink = $permalink_data['permalink'] ?? null;
                            }
                            $results['instagram'] = [
                                'success' => true,
                                'post_id' => $media_id,
                                'permalink' => $permalink
                            ];
                            $db->prepare("UPDATE creative_jobs SET instagram_post_id = ?, instagram_permalink = ? WHERE id = ?")
                               ->execute([$media_id, $permalink, $job_id]);
                        } else {
                            $results['instagram'] = [
                                'success' => false,
                                'error' => $publish_result['error']['message'] ?? 'Publish failed',
                                'error_code' => $publish_result['error']['code'] ?? null
                            ];
                        }
                    }
                } else {
                    $results['instagram'] = [
                        'success' => false,
                        'error' => $last_error ?? 'Container processing timeout'
                    ];
                }
            } else {
                $results['instagram'] = [
                    'success' => false,
                    'error' => $carousel_result['error']['message'] ?? 'Carousel creation failed',
                    'error_code' => $carousel_result['error']['code'] ?? null,
                    'http_code' => $carousel_http_code
                ];
            }
        }
    } else {
        // Single image: story or regular post
        $ig_url = "https://graph.facebook.com/" . META_GRAPH_API_VERSION . "/{$ig_account_id}/media";
        
        if ($publish_type === 'story') {
            // Instagram Story - no caption support
            $ig_data = [
                'image_url' => $image_url,
                'media_type' => 'STORIES',
                'access_token' => $page_token
            ];
            $is_story = true;
        } else {
            // Regular Instagram post
            $ig_data = [
                'image_url' => $image_url,
                'caption' => $ad_copy,
                'access_token' => $page_token
            ];
            $is_story = false;
        }

        $ch = curl_init($ig_url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($ig_data));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        $ig_response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_error = curl_error($ch);
        curl_close($ch);

        if ($ig_response === false) {
            $results['instagram'] = [
                'success' => false,
                'error' => 'Connection failed: ' . $curl_error
            ];
        } else {
            $ig_result = json_decode($ig_response, true);
            if (isset($ig_result['id']) && $http_code == 200) {
                $container_id = $ig_result['id'];
                $container_ready = false;
                $last_error = null;

                for ($i = 0; $i < 10; $i++) {
                    sleep(2);
                    $status_url = "https://graph.facebook.com/" . META_GRAPH_API_VERSION . "/{$container_id}?fields=status_code&access_token={$page_token}";
                    $ch = curl_init($status_url);
                    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                    $status_response = curl_exec($ch);
                    curl_close($ch);
                    $status_result = json_decode($status_response, true);
                    $status = $status_result['status_code'] ?? null;
                    if ($status === 'FINISHED') {
                        $container_ready = true;
                        break;
                    }
                    if ($status === 'ERROR') {
                        $last_error = $status_result['error']['message'] ?? 'Container error';
                        break;
                    }
                }

                if ($container_ready) {
                    $publish_url = "https://graph.facebook.com/" . META_GRAPH_API_VERSION . "/{$ig_account_id}/media_publish";
                    $publish_data = [
                        'creation_id' => $container_id,
                        'access_token' => $page_token
                    ];

                    $ch = curl_init($publish_url);
                    curl_setopt($ch, CURLOPT_POST, true);
                    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($publish_data));
                    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
                    $publish_response = curl_exec($ch);
                    $publish_http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                    curl_close($ch);

                    if ($publish_response === false) {
                        $results['instagram'] = [
                            'success' => false,
                            'error' => 'Publish connection failed'
                        ];
                    } else {
                        $publish_result = json_decode($publish_response, true);
                        if (isset($publish_result['id']) && $publish_http_code == 200) {
                            $media_id = $publish_result['id'];
                            $permalink = null;
                            sleep(2);
                            $permalink_url = "https://graph.facebook.com/" . META_GRAPH_API_VERSION . "/{$media_id}?fields=permalink&access_token={$page_token}";
                            $ch = curl_init($permalink_url);
                            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
                            $permalink_response = curl_exec($ch);
                            $permalink_http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                            curl_close($ch);
                            if ($permalink_response && $permalink_http_code == 200) {
                                $permalink_data = json_decode($permalink_response, true);
                                $permalink = $permalink_data['permalink'] ?? null;
                            }

                            $results['instagram'] = [
                                'success' => true,
                                'post_id' => $media_id,
                                'permalink' => $permalink,
                                'type' => $is_story ? 'story' : 'post'
                            ];

                            $db->prepare("UPDATE creative_jobs SET instagram_post_id = ?, instagram_permalink = ? WHERE id = ?")
                               ->execute([$media_id, $permalink, $job_id]);
                        } else {
                            $results['instagram'] = [
                                'success' => false,
                                'error' => $publish_result['error']['message'] ?? 'Publish failed',
                                'error_code' => $publish_result['error']['code'] ?? null
                            ];
                        }
                    }
                } else {
                    $results['instagram'] = [
                        'success' => false,
                        'error' => $last_error ?? 'Container processing timeout'
                    ];
                }
            } else {
                $results['instagram'] = [
                    'success' => false,
                    'error' => $ig_result['error']['message'] ?? 'Container creation failed',
                    'error_code' => $ig_result['error']['code'] ?? null,
                    'http_code' => $http_code
                ];
            }
        }
    }
}

$all_success = true;
foreach ($results as $result) {
    if (empty($result['success'])) {
        $all_success = false;
        break;
    }
}

if ($all_success) {
    $db->prepare("
        UPDATE creative_jobs 
        SET current_stage = 'completed', 
            published_at = NOW(),
            processing_time_ms = TIMESTAMPDIFF(MICROSECOND, created_at, NOW()) / 1000
        WHERE id = ?
    ")->execute([$job_id]);
}

log_activity($job['client_id'], $job_id, 'published_web', $results);

$facebook_url = '';
$instagram_url = '';
if (!empty($results['facebook']['success']) && !empty($results['facebook']['post_id'])) {
    $facebook_url = 'https://facebook.com/' . $results['facebook']['post_id'];
}
if (!empty($results['instagram']['success'])) {
    $instagram_url = $results['instagram']['permalink'] ?? '';
}

json_response([
    'status' => $all_success ? 'published' : 'partial_failure',
    'job_id' => $job_id,
    'results' => $results,
    'facebook_url' => $facebook_url,
    'instagram_url' => $instagram_url
]);
?>
