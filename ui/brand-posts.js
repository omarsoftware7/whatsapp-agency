const brandHeader = document.getElementById('brand-header');
const scheduledPosts = document.getElementById('scheduled-posts');
const publishedPosts = document.getElementById('published-posts');

function getClientId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('client_id');
}

function normalizeUrl(url) {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    const origin = window.location.origin;
    return url.replace(/^https?:\/\/(getadly\.com|127\.0\.0\.1:\d+|localhost:\d+)/i, origin);
  }
  return url;
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (num) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatJobType(type) {
  if (!type) return t('posts_type_post');
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseAdCopy(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    if (parsed && parsed.headline) return parsed;
  } catch (e) {
    return null;
  }
  return null;
}

function renderBrandHeader(brand) {
  if (!brandHeader) return;
  const logo = brand.logo_url ? normalizeUrl(brand.logo_url) : null;
  const initial = (brand.business_name || 'B').slice(0, 1).toUpperCase();
  brandHeader.innerHTML = `
    <div class="brand-card">
      <div class="brand-card-header">
        <div class="brand-summary-logo large">
          ${logo ? `<img src="${logo}" alt="Brand logo">` : initial}
        </div>
        <div class="brand-summary-details">
          <div class="section-title">${brand.business_name || t('common_untitled_brand')}</div>
          <div class="muted">${brand.industry || t('common_category_not_set')}</div>
        </div>
      </div>
      <div class="muted">${brand.business_description || t('common_no_description')}</div>
    </div>
  `;
}

function renderPosts(container, items, emptyText, type) {
  container.innerHTML = '';
  if (!items.length) {
    container.innerHTML = `<div class="muted">${emptyText}</div>`;
    return;
  }
  items.forEach((item) => {
    const jobId = item.job_id || item.id;
    const status = item.status || (type === 'published' ? 'published' : 'scheduled');
    const facebookLink = item.facebook_post_id ? `https://facebook.com/${item.facebook_post_id}` : null;
    const instagramLink = item.instagram_permalink || null;
    const designVariations = item.design_variations ? JSON.parse(item.design_variations) : [];
    const designThumb = designVariations[item.approved_design_index || 0] || designVariations[0];
    const adCopyParsed = parseAdCopy(item.ad_copy);
    const adCopyText = adCopyParsed
      ? `${adCopyParsed.headline}\n\n${adCopyParsed.body}\n\n${adCopyParsed.cta}`
      : item.ad_copy || '';
    const card = document.createElement('div');
    card.className = 'post-card';
    const statusLabel = t(`posts_status_${status}`) || status.replace(/_/g, ' ');
    card.innerHTML = `
      <div class="post-card-header">
        <div>
          <div class="post-title">${formatJobType(item.job_type)} · ${t('posts_job_label')} #${jobId}</div>
          <div class="muted">${item.user_message || t('posts_no_description')}</div>
        </div>
        <div class="post-status ${status}">${statusLabel}</div>
      </div>
      ${(designThumb || adCopyText) ? `
        <div class="post-preview">
          ${designThumb ? `<img class="post-preview-image" src="${normalizeUrl(designThumb)}" alt="${t('posts_design_preview')}">` : ''}
          ${adCopyText ? `<div class="post-preview-copy">${adCopyText.replace(/\n/g, '<br>')}</div>` : ''}
        </div>
      ` : ''}
      <div class="post-details">
        <div><span class="muted">${t('posts_scheduled_label')}:</span> ${formatDate(item.scheduled_at)}</div>
        <div><span class="muted">${t('posts_published_label')}:</span> ${formatDate(item.published_at)}</div>
        <div><span class="muted">${t('posts_created_label')}:</span> ${formatDate(item.created_at)}</div>
      </div>
      <div class="post-links">
        ${facebookLink ? `<a class="button secondary small" href="${facebookLink}" target="_blank" rel="noreferrer">${t('posts_facebook')}</a>` : ''}
        ${instagramLink ? `<a class="button secondary small" href="${instagramLink}" target="_blank" rel="noreferrer">${t('posts_instagram')}</a>` : ''}
      </div>
    `;
    container.appendChild(card);
  });
}

async function loadPosts() {
  const clientId = getClientId();
  if (!clientId) {
    if (brandHeader) {
      brandHeader.innerHTML = `<div class="muted">${t('common_client_missing')}</div>`;
    }
    return;
  }

  const brands = await apiRequest(`/web_brands.php?client_id=${clientId}`);
  const brand = (brands.items || [])[0];
  if (!brand) {
    if (brandHeader) {
      brandHeader.innerHTML = `<div class="muted">${t('common_brand_not_found')}</div>`;
    }
    return;
  }

  setTheme({
    primary: brand.primary_color || DEFAULT_THEME.primary,
    secondary: brand.secondary_color || DEFAULT_THEME.secondary,
    logoUrl: brand.logo_url ? normalizeUrl(brand.logo_url) : null,
    name: brand.business_name || DEFAULT_THEME.name
  });

  renderBrandHeader(brand);

  const data = await apiRequest(`/web_posts.php?client_id=${clientId}`);
  renderPosts(scheduledPosts, data.scheduled || [], t('posts_no_scheduled'), 'scheduled');
  renderPosts(publishedPosts, data.published || [], t('posts_no_published'), 'published');
}

loadPosts();
