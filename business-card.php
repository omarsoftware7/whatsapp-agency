<?php
require_once __DIR__ . '/config.php';

$slug = isset($_GET['slug']) ? trim($_GET['slug']) : '';
if ($slug === '') {
    http_response_code(404);
    echo 'Not found';
    exit;
}

$db = get_db();
$stmt = $db->prepare("
    SELECT b.*,
           c.business_name,
           c.primary_color,
           c.secondary_color,
           c.logo_filename,
           c.business_phone,
           c.business_address
    FROM web_business_cards b
    JOIN clients c ON c.id = b.client_id
    WHERE b.public_slug = ?
    LIMIT 1
");
$stmt->execute([$slug]);
$card = $stmt->fetch();
if (!$card) {
    http_response_code(404);
    echo 'Not found';
    exit;
}

$gallery = [];
if (!empty($card['gallery_images'])) {
    $gallery = json_decode($card['gallery_images'], true) ?: [];
}

$primary = $card['primary_color'] ?: '#9333ea';
$secondary = $card['secondary_color'] ?: '#ec4899';
$logoUrl = $card['logo_filename']
    ? BASE_URL . '/uploads/logos/' . $card['logo_filename']
    : null;
$assetBase = BASE_URL . '/assets';
$facebookIcon = $assetBase . '/Facebook_Logo_(2019).png';
$instagramIcon = $assetBase . '/instagram-logo-colored.jpg';
$whatsappIcon = $assetBase . '/WhatsApp.svg%20(1).webp';

$title = $card['title'] ?: $card['business_name'];
$subtitle = $card['subtitle'] ?: '';
$address = $card['address'] ?: $card['business_address'];
$phone1 = $card['phone_1'] ?: $card['business_phone'];
$phone2 = $card['phone_2'];
$whatsapp = $card['whatsapp_number'];
$facebook = $card['facebook_url'];
$instagram = $card['instagram_url'];
$locationUrl = $card['location_url'];
$header = $card['header_image_url'];

?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?php echo htmlspecialchars($title ?: 'Business card', ENT_QUOTES); ?></title>
  <style>
    :root {
      --brand-primary: <?php echo htmlspecialchars($primary, ENT_QUOTES); ?>;
      --brand-secondary: <?php echo htmlspecialchars($secondary, ENT_QUOTES); ?>;
      --brand-on-primary: #ffffff;
    }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      margin: 0;
      background: #f4f5fb;
      color: #1f2430;
      display: flex;
      justify-content: center;
      padding: 24px;
    }
    .phone-frame {
      background: #0f1222;
      border-radius: 40px;
      padding: 20px 16px 24px;
      box-shadow: 0 28px 70px rgba(15, 18, 34, 0.35);
      max-width: 760px;
      width: 100%;
      margin: 0 auto;
    }
    .phone-notch {
      width: 140px;
      height: 18px;
      background: #0f1222;
      border-radius: 0 0 16px 16px;
      margin: 0 auto 12px;
    }
    .phone-screen {
      background: #f4f5fb;
      border-radius: 30px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .card {
      width: min(720px, 100%);
      background: #fff;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 24px 60px rgba(15, 18, 30, 0.12);
      border: 1px solid #e8eaf3;
    }
    .header {
      background: linear-gradient(120deg, var(--brand-primary), var(--brand-secondary));
      color: var(--brand-on-primary);
      padding: 28px;
      position: relative;
      text-align: center;
    }
    .header-image {
      width: 100%;
      max-height: 220px;
      object-fit: cover;
      border-radius: 16px;
      margin-bottom: 18px;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .logo {
      width: 64px;
      height: 64px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.16);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      margin: 0 auto 12px;
    }
    .logo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .title {
      font-size: 28px;
      font-weight: 700;
      margin: 0;
    }
    .subtitle {
      margin-top: 8px;
      font-size: 16px;
      opacity: 0.85;
    }
    .content {
      padding: 24px 28px;
      display: grid;
      gap: 16px;
    }
    .action-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }
    .action-tile {
      padding: 12px;
      border-radius: 16px;
      background: #f6f7fb;
      color: #1f2430;
      text-decoration: none;
      font-weight: 600;
      border: 1px solid #e1e5f2;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      text-align: center;
      min-height: 88px;
      justify-content: center;
    }
    .action-tile.primary {
      background: var(--brand-primary);
      color: var(--brand-on-primary);
      border: none;
    }
    .action-icon {
      width: 22px;
      height: 22px;
      display: block;
    }
    .action-icon svg {
      width: 22px;
      height: 22px;
      stroke: currentColor;
      fill: none;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .action-text {
      font-size: 13px;
      line-height: 1.2;
      word-break: break-word;
    }
    @media (max-width: 640px) {
      .action-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    .gallery {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 12px;
    }
    .gallery img {
      width: 100%;
      border-radius: 14px;
      border: 1px solid #e6e8f0;
      object-fit: cover;
      aspect-ratio: 1 / 1;
      cursor: pointer;
    }
    .card-footer {
      padding: 12px 20px 18px;
      text-align: center;
      font-size: 12px;
      color: #8a90a5;
      border-top: 1px solid #edf0f7;
    }
    .card-footer a {
      color: inherit;
      text-decoration: none;
      font-weight: 600;
    }
    .lightbox {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.75);
      display: none;
      align-items: center;
      justify-content: center;
      padding: 24px;
      z-index: 999;
    }
    .lightbox.open {
      display: flex;
    }
    .lightbox-card {
      position: relative;
      max-width: 900px;
      width: 100%;
      background: #ffffff;
      border-radius: 18px;
      padding: 12px;
      box-shadow: 0 24px 60px rgba(15, 18, 30, 0.35);
    }
    .lightbox-card img {
      width: 100%;
      border-radius: 14px;
      display: block;
    }
    .lightbox-close {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: none;
      background: rgba(15, 23, 42, 0.85);
      color: #ffffff;
      font-size: 18px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="phone-frame">
    <div class="phone-notch"></div>
    <div class="phone-screen">
      <div class="card">
        <div class="header">
          <?php if ($header): ?>
            <img class="header-image" src="<?php echo htmlspecialchars($header, ENT_QUOTES); ?>" alt="Header image">
          <?php endif; ?>
          <div class="logo">
            <?php if ($logoUrl): ?>
              <img src="<?php echo htmlspecialchars($logoUrl, ENT_QUOTES); ?>" alt="Logo">
            <?php else: ?>
              <?php echo htmlspecialchars(mb_substr($title ?: 'B', 0, 1), ENT_QUOTES); ?>
            <?php endif; ?>
          </div>
          <h1 class="title"><?php echo htmlspecialchars($title ?: '', ENT_QUOTES); ?></h1>
          <?php if ($subtitle): ?>
            <div class="subtitle"><?php echo htmlspecialchars($subtitle, ENT_QUOTES); ?></div>
          <?php endif; ?>
        </div>
        <div class="content">
      <div class="action-grid">
        <?php if ($phone1): ?>
          <a class="action-tile" href="tel:<?php echo htmlspecialchars(preg_replace('/\s+/', '', $phone1), ENT_QUOTES); ?>">
            <span class="action-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.86 19.86 0 0 1 3 5.18 2 2 0 0 1 5 3h3a2 2 0 0 1 2 1.72c.12.81.3 1.6.54 2.36a2 2 0 0 1-.45 2.11L9 10a16 16 0 0 0 5 5l.81-1.09a2 2 0 0 1 2.11-.45c.76.24 1.55.42 2.36.54A2 2 0 0 1 22 16.92z"></path>
              </svg>
            </span>
            <span class="action-text"><?php echo htmlspecialchars($phone1, ENT_QUOTES); ?></span>
          </a>
        <?php endif; ?>
        <?php if ($phone2): ?>
          <a class="action-tile" href="tel:<?php echo htmlspecialchars(preg_replace('/\s+/', '', $phone2), ENT_QUOTES); ?>">
            <span class="action-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.86 19.86 0 0 1 3 5.18 2 2 0 0 1 5 3h3a2 2 0 0 1 2 1.72c.12.81.3 1.6.54 2.36a2 2 0 0 1-.45 2.11L9 10a16 16 0 0 0 5 5l.81-1.09a2 2 0 0 1 2.11-.45c.76.24 1.55.42 2.36.54A2 2 0 0 1 22 16.92z"></path>
              </svg>
            </span>
            <span class="action-text"><?php echo htmlspecialchars($phone2, ENT_QUOTES); ?></span>
          </a>
        <?php endif; ?>
        <?php if ($address || $locationUrl): ?>
          <?php if ($locationUrl): ?>
            <a class="action-tile" href="<?php echo htmlspecialchars($locationUrl, ENT_QUOTES); ?>" target="_blank" rel="noopener">
          <?php else: ?>
            <div class="action-tile">
          <?php endif; ?>
              <span class="action-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 22s8-4.5 8-11a8 8 0 1 0-16 0c0 6.5 8 11 8 11z"></path>
                  <circle cx="12" cy="11" r="3"></circle>
                </svg>
              </span>
              <span class="action-text"><?php echo htmlspecialchars($address ?: 'Location', ENT_QUOTES); ?></span>
          <?php if ($locationUrl): ?>
            </a>
          <?php else: ?>
            </div>
          <?php endif; ?>
        <?php endif; ?>
        <?php if ($facebook): ?>
          <a class="action-tile" href="<?php echo htmlspecialchars($facebook, ENT_QUOTES); ?>" target="_blank" rel="noopener">
            <img class="action-icon" src="<?php echo htmlspecialchars($facebookIcon, ENT_QUOTES); ?>" alt="Facebook">
            <span class="action-text">Facebook</span>
          </a>
        <?php endif; ?>
        <?php if ($instagram): ?>
          <a class="action-tile" href="<?php echo htmlspecialchars($instagram, ENT_QUOTES); ?>" target="_blank" rel="noopener">
            <img class="action-icon" src="<?php echo htmlspecialchars($instagramIcon, ENT_QUOTES); ?>" alt="Instagram">
            <span class="action-text">Instagram</span>
          </a>
        <?php endif; ?>
        <?php if ($whatsapp): ?>
          <a class="action-tile whatsapp" href="https://wa.me/<?php echo htmlspecialchars(preg_replace('/\D+/', '', $whatsapp), ENT_QUOTES); ?>" target="_blank" rel="noopener">
            <img class="action-icon" src="<?php echo htmlspecialchars($whatsappIcon, ENT_QUOTES); ?>" alt="WhatsApp">
            <span class="action-text">WhatsApp</span>
          </a>
        <?php endif; ?>
      </div>
      <?php if (!empty($gallery)): ?>
        <div class="gallery">
          <?php foreach ($gallery as $image): ?>
            <img src="<?php echo htmlspecialchars($image, ENT_QUOTES); ?>" alt="Gallery image">
          <?php endforeach; ?>
        </div>
      <?php endif; ?>
        </div>
        <div class="card-footer">
          <a href="https://getadly.com" target="_blank" rel="noopener">Built with Adly</a>
          &middot; Get yours now
        </div>
      </div>
    </div>
  </div>
  <div class="lightbox" id="card-lightbox" aria-hidden="true">
    <div class="lightbox-card">
      <button class="lightbox-close" type="button" aria-label="Close">✕</button>
      <img id="card-lightbox-img" src="" alt="Preview">
    </div>
  </div>
  <script>
    const lightbox = document.getElementById('card-lightbox');
    const lightboxImg = document.getElementById('card-lightbox-img');
    const closeBtn = lightbox.querySelector('.lightbox-close');
    document.querySelectorAll('.gallery img').forEach((img) => {
      img.addEventListener('click', () => {
        lightboxImg.src = img.src;
        lightbox.classList.add('open');
        lightbox.setAttribute('aria-hidden', 'false');
      });
    });
    function closeLightbox() {
      lightbox.classList.remove('open');
      lightbox.setAttribute('aria-hidden', 'true');
      lightboxImg.src = '';
    }
    closeBtn.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (event) => {
      if (event.target === lightbox) {
        closeLightbox();
      }
    });
  </script>
</body>
</html>
