<?php
/**
 * Runway Gen-4 Video Generator - All-in-One File
 * Upload image, customize prompt, and generate TikTok-style videos
 */

// Configuration
$runwayApiKey = 'key_5875f8dbf7b83417af98c97ad3a47f7b58cc4d8bfa8653dd7ca75992bc71109905dec9d9a411314512d19d42b88769091d10ae880c043dbb00a1862aca678c59';

// Check if form was submitted
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['imageFile'])) {
    
    // Handle file upload
    if ($_FILES['imageFile']['error'] !== UPLOAD_ERR_OK) {
        $error = '❌ Please upload an image file.';
    } else {
        $imageFile = $_FILES['imageFile'];
        $prompt = $_POST['prompt'] ?? 'Young woman enthusiastically presenting product to camera';
        $ratio = $_POST['ratio'] ?? '720:1280';
        $duration = intval($_POST['duration'] ?? 5);
        
        // Validate file type
        $allowedTypes = ['image/jpeg', 'image/png'];
        if (!in_array($imageFile['type'], $allowedTypes)) {
            $error = '❌ Only JPG and PNG images are allowed.';
        } elseif ($imageFile['size'] > 16 * 1024 * 1024) {
            $error = '❌ Image must be less than 16MB.';
        } else {
            // Convert image to base64
            $imageData = file_get_contents($imageFile['tmp_name']);
            $base64Image = 'data:' . $imageFile['type'] . ';base64,' . base64_encode($imageData);
            
            // Start generating video
            $generating = true;
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Runway Gen-4 Video Generator</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            color: #333;
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }

        .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
        }

        .header p {
            opacity: 0.9;
            font-size: 14px;
        }

        .content {
            padding: 40px;
        }

        .form-section {
            margin-bottom: 30px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 12px;
        }

        .form-section h3 {
            margin-bottom: 15px;
            color: #667eea;
            font-size: 16px;
        }

        .input-group {
            margin-bottom: 20px;
        }

        .input-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            font-size: 14px;
            color: #555;
        }

        .input-group input[type="file"],
        .input-group textarea,
        .input-group select {
            width: 100%;
            padding: 12px;
            border: 2px solid #e1e8ed;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.3s;
        }

        .input-group textarea {
            resize: vertical;
            min-height: 100px;
            font-family: inherit;
        }

        .input-group input:focus,
        .input-group textarea:focus,
        .input-group select:focus {
            outline: none;
            border-color: #667eea;
        }

        .generate-btn {
            width: 100%;
            padding: 16px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .generate-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
        }

        .output-section {
            margin-top: 30px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 12px;
        }

        .status-line {
            display: block;
            margin-bottom: 10px;
            padding: 10px 12px;
            background: white;
            border-radius: 8px;
            font-size: 14px;
            line-height: 1.8;
        }

        .video-link {
            display: inline-block;
            margin: 15px 0;
            padding: 14px 28px;
            background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            transition: transform 0.2s;
        }

        .video-link:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(72, 187, 120, 0.4);
        }

        .error {
            padding: 15px;
            background: #fed7d7;
            color: #c53030;
            border-radius: 8px;
            margin-bottom: 20px;
        }

        .info-badge {
            display: inline-block;
            padding: 4px 10px;
            background: #eef2ff;
            color: #667eea;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            margin-left: 8px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎬 Runway Gen-4 Video Generator</h1>
            <p>Upload an image and generate stunning TikTok-style UGC videos</p>
        </div>

        <div class="content">
            <?php if (isset($error)): ?>
                <div class="error"><?php echo $error; ?></div>
            <?php endif; ?>

            <?php if (!isset($generating)): ?>
                <!-- Form Section -->
                <form method="POST" enctype="multipart/form-data">
                    <!-- Image Upload -->
                    <div class="form-section">
                        <h3>📸 Upload Product Image</h3>
                        <div class="input-group">
                            <label for="imageFile">Select Image (JPG, PNG - max 16MB)</label>
                            <input type="file" id="imageFile" name="imageFile" accept="image/jpeg,image/png" required>
                        </div>
                    </div>

                    <!-- Prompt -->
                    <div class="form-section">
                        <h3>✍️ Video Prompt</h3>
                        <div class="input-group">
                            <label for="prompt">Describe the motion you want</label>
                            <textarea id="prompt" name="prompt" required>Young woman enthusiastically presenting beauty product to camera, natural hand gestures showing product, bright smile, casual authentic UGC style, soft natural lighting, vertical video composition</textarea>
                        </div>
                    </div>

                    <!-- Settings -->
                    <div class="form-section">
                        <h3>⚙️ Video Settings</h3>
                        
                        <div class="input-group">
                            <label for="ratio">
                                Aspect Ratio
                                <span class="info-badge">TikTok: 720:1280</span>
                            </label>
                            <select id="ratio" name="ratio">
                                <option value="720:1280" selected>720:1280 (9:16 - TikTok Portrait)</option>
                                <option value="1280:720">1280:720 (16:9 - Landscape)</option>
                                <option value="832:1104">832:1104 (Portrait)</option>
                                <option value="1104:832">1104:832 (Landscape)</option>
                                <option value="960:960">960:960 (1:1 - Square)</option>
                                <option value="1584:672">1584:672 (Ultra-wide)</option>
                            </select>
                        </div>

                        <div class="input-group">
                            <label for="duration">
                                Duration
                                <span class="info-badge" id="costBadge">25 credits</span>
                            </label>
                            <select id="duration" name="duration" onchange="updateCost()">
                                <option value="5" selected>5 seconds (25 credits)</option>
                                <option value="10">10 seconds (50 credits)</option>
                            </select>
                        </div>
                    </div>

                    <button type="submit" class="generate-btn">
                        🎬 Generate Video
                    </button>
                </form>
            <?php else: ?>
                <!-- Output Section -->
                <div class="output-section">
                    <?php
                    // Display status messages
                    echo '<div class="status-line">✅ Image uploaded successfully.</div>';
                    echo '<div class="status-line">📸 Product image: ' . htmlspecialchars($imageFile['name']) . '</div>';
                    echo '<div class="status-line">✍️ Prompt: ' . htmlspecialchars($prompt) . '</div>';
                    echo '<div class="status-line">⚙️ Aspect Ratio: ' . htmlspecialchars($ratio) . '</div>';
                    echo '<div class="status-line">⏱️ Duration: ' . $duration . ' seconds</div>';
                    echo '<div class="status-line">💰 Cost: ' . ($duration * 5) . ' credits</div>';
                    echo '<div class="status-line">' . str_repeat('─', 80) . '</div>';
                    echo '<div class="status-line">🎬 Creating video generation task...</div>';
                    
                    flush();
                    ob_flush();
                    
                    // Step 1: Create the image-to-video task
                    $createTaskUrl = 'https://api.dev.runwayml.com/v1/image_to_video';
                    
                    $requestData = [
                        'model' => 'gen4_turbo',
                        'promptImage' => $base64Image,
                        'promptText' => $prompt,
                        'ratio' => $ratio,
                        'duration' => $duration
                    ];
                    
                    $ch = curl_init($createTaskUrl);
                    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                    curl_setopt($ch, CURLOPT_POST, true);
                    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($requestData));
                    curl_setopt($ch, CURLOPT_HTTPHEADER, [
                        'Content-Type: application/json',
                        'Authorization: Bearer ' . $runwayApiKey,
                        'X-Runway-Version: 2024-11-06'
                    ]);
                    
                    $response = curl_exec($ch);
                    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                    curl_close($ch);
                    
                    if ($httpCode !== 200) {
                        echo '<div class="status-line">❌ Failed to create task. HTTP Code: ' . $httpCode . '</div>';
                        echo '<div class="status-line">❌ Response: ' . htmlspecialchars($response) . '</div>';
                    } else {
                        $taskData = json_decode($response, true);
                        $taskId = $taskData['id'];
                        
                        echo '<div class="status-line">✅ Task created successfully!</div>';
                        echo '<div class="status-line">🆔 Task ID: ' . htmlspecialchars($taskId) . '</div>';
                        echo '<div class="status-line">⏳ Initial Status: ' . htmlspecialchars($taskData['status']) . '</div>';
                        echo '<div class="status-line">' . str_repeat('─', 80) . '</div>';
                        echo '<div class="status-line">⏱️ Waiting for video generation (this takes 30-60 seconds)...</div>';
                        echo '<div class="status-line">⏱️ Please wait, do not close this page...</div>';
                        
                        flush();
                        ob_flush();
                        
                        // Step 2: Poll for task completion
                        $checkTaskUrl = "https://api.dev.runwayml.com/v1/tasks/$taskId";
                        $maxAttempts = 120;
                        $attempt = 0;
                        
                        while ($attempt < $maxAttempts) {
                            sleep(2);
                            
                            $ch = curl_init($checkTaskUrl);
                            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                                'Authorization: Bearer ' . $runwayApiKey,
                                'X-Runway-Version: 2024-11-06'
                            ]);
                            
                            $response = curl_exec($ch);
                            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                            curl_close($ch);
                            
                            if ($httpCode !== 200) {
                                echo '<div class="status-line">❌ Failed to check task status. HTTP Code: ' . $httpCode . '</div>';
                                break;
                            }
                            
                            $taskStatus = json_decode($response, true);
                            $status = $taskStatus['status'];
                            
                            if ($status === 'SUCCEEDED') {
                                echo '<div class="status-line"> </div>';
                                echo '<div class="status-line">🎉 Video generation complete!</div>';
                                echo '<div class="status-line">✅ Final Status: ' . htmlspecialchars($status) . '</div>';
                                echo '<div class="status-line">' . str_repeat('─', 80) . '</div>';
                                
                                if (isset($taskStatus['output']) && !empty($taskStatus['output'])) {
                                    $videoUrl = $taskStatus['output'][0];
                                    echo '<div class="status-line">🎥 Video is ready!</div>';
                                    echo '<div class="status-line"><a href="' . htmlspecialchars($videoUrl) . '" target="_blank" class="video-link">📥 Click Here to Download Your Video</a></div>';
                                    echo '<div class="status-line"> </div>';
                                } else {
                                    echo '<div class="status-line">⚠️ No output received.</div>';
                                }
                                
                                echo '<div class="status-line">' . str_repeat('─', 80) . '</div>';
                                echo '<div class="status-line">📊 Task Details:</div>';
                                echo '<div class="status-line">📊 Model: ' . ($taskStatus['model'] ?? 'N/A') . '</div>';
                                echo '<div class="status-line">📊 Duration: ' . ($taskStatus['duration'] ?? 'N/A') . 's</div>';
                                echo '<div class="status-line">📊 Aspect Ratio: ' . ($taskStatus['ratio'] ?? 'N/A') . '</div>';
                                echo '<div class="status-line">📊 Created: ' . ($taskStatus['createdAt'] ?? 'N/A') . '</div>';
                                echo '<div class="status-line">📊 Completed: ' . ($taskStatus['lastUpdatedAt'] ?? 'N/A') . '</div>';
                                
                                break;
                                
                            } elseif ($status === 'FAILED') {
                                echo '<div class="status-line"> </div>';
                                echo '<div class="status-line">❌ Video generation failed!</div>';
                                echo '<div class="status-line">❌ Error: ' . ($taskStatus['failure']['message'] ?? 'Unknown error') . '</div>';
                                echo '<div class="status-line"> </div>';
                                echo '<div class="status-line">💡 Possible reasons:</div>';
                                echo '<div class="status-line">💡 • The image might not be compatible</div>';
                                echo '<div class="status-line">💡 • The prompt might violate content policies</div>';
                                echo '<div class="status-line">💡 • API rate limits might be exceeded</div>';
                                echo '<div class="status-line">💡 • Insufficient credits in account</div>';
                                break;
                            }
                            
                            $attempt++;
                        }
                        
                        if ($attempt >= $maxAttempts) {
                            echo '<div class="status-line"> </div>';
                            echo '<div class="status-line">⏱️ Timeout: Video generation took too long.</div>';
                            echo '<div class="status-line">💡 Task ID: ' . htmlspecialchars($taskId) . '</div>';
                            echo '<div class="status-line">💡 Your video might still be processing.</div>';
                        }
                    }
                    ?>
                    
                    <div style="margin-top: 20px; text-align: center;">
                        <a href="<?php echo $_SERVER['PHP_SELF']; ?>" class="generate-btn" style="display: inline-block; text-decoration: none; width: auto; padding: 12px 24px;">
                            🔄 Generate Another Video
                        </a>
                    </div>
                </div>
            <?php endif; ?>
        </div>
    </div>

    <script>
        function updateCost() {
            const duration = parseInt(document.getElementById('duration').value);
            document.getElementById('costBadge').textContent = (duration * 5) + ' credits';
        }
    </script>
</body>
</html>