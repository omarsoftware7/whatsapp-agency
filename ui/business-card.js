const brandHeader = document.getElementById('brand-header');
const form = document.getElementById('card-form');
const alertBox = document.getElementById('card-alert');
const preview = document.getElementById('card-preview');
const phoneFrame = document.querySelector('.phone-frame');
const copyLinkButton = document.getElementById('card-copy-link');
const cardList = document.getElementById('card-list');

const titleInput = document.getElementById('card-title');
const subtitleInput = document.getElementById('card-subtitle');
const phone1Input = document.getElementById('card-phone-1');
const phone2Input = document.getElementById('card-phone-2');
const addressInput = document.getElementById('card-address');
const locationInput = document.getElementById('card-location');
const facebookInput = document.getElementById('card-facebook');
const instagramInput = document.getElementById('card-instagram');
const whatsappInput = document.getElementById('card-whatsapp');
const headerUpload = document.getElementById('card-header-upload');
const galleryUpload = document.getElementById('card-gallery-upload');
const headerPreview = document.getElementById('card-header-preview');
const galleryPreview = document.getElementById('card-gallery-preview');

let galleryImages = [];
let headerImageUrl = '';
let publicSlug = '';
let lastCards = [];
let brandLogoUrl = '';
let brandInitial = 'B';
let previewLightboxReady = false;

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
  if (!value) return '';
  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function renderBrandHeader(brand) {
  if (!brandHeader) return;
  const logo = brand.logo_url ? normalizeUrl(brand.logo_url) : null;
  const initial = (brand.business_name || 'B').slice(0, 1).toUpperCase();
  brandLogoUrl = logo || '';
  brandInitial = initial;
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

function renderHeaderPreview(url) {
  headerPreview.innerHTML = '';
  if (!url) return;
  headerPreview.innerHTML = `
    <div class="upload-thumb">
      <img src="${normalizeUrl(url)}" alt="Header image">
    </div>
  `;
}

function renderGalleryPreview() {
  galleryPreview.innerHTML = '';
  if (!galleryImages.length) return;
  galleryPreview.innerHTML = galleryImages.map((url, idx) => `
    <div class="upload-thumb">
      <img src="${normalizeUrl(url)}" alt="Gallery image">
      <button class="remove-thumb" data-index="${idx}">✕</button>
    </div>
  `).join('');
  galleryPreview.querySelectorAll('.remove-thumb').forEach((btn) => {
    btn.addEventListener('click', () => {
      const index = Number(btn.dataset.index);
      galleryImages = galleryImages.filter((_, i) => i !== index);
      renderGalleryPreview();
      renderCardPreview();
    });
  });
}

function renderCardPreview() {
  const rawTitle = titleInput.value.trim();
  const title = rawTitle || t('card_title_fallback');
  const subtitle = subtitleInput.value.trim();
  const isRtl = ['ar', 'he'].includes(getLanguage());
  const phone1 = phone1Input.value.trim();
  const phone2 = phone2Input.value.trim();
  const address = addressInput.value.trim();
  const locationUrl = locationInput.value.trim();
  const facebookUrl = facebookInput.value.trim();
  const instagramUrl = instagramInput.value.trim();
  const whatsapp = whatsappInput.value.trim();
  const phoneFrame = preview.closest('.phone-frame');
  const hasLogo = !!brandLogoUrl;
  const hasContent = [
    rawTitle,
    subtitle,
    phone1,
    phone2,
    address,
    locationUrl,
    facebookUrl,
    instagramUrl,
    whatsapp,
    ...(galleryImages || [])
  ].some((value) => (value || '').toString().trim() !== '');
  
  // Check requirements FIRST before any rendering
  if (!hasLogo || !hasContent) {
    if (phoneFrame) phoneFrame.classList.add('preview-warning');
    preview.classList.add('preview-warning');
    preview.innerHTML = `<div class="alert warning">${t('card_preview_requirements')}</div>`;
    return;
  }
  
  // Requirements met, remove warning classes and render
  if (phoneFrame) phoneFrame.classList.remove('preview-warning');
  preview.classList.remove('preview-warning');
  const facebookIcon = '/assets/Facebook_Logo_(2019).png';
  const instagramIcon = '/assets/instagram-logo-colored.jpg';
  const whatsappIcon = '/assets/WhatsApp.svg%20(1).webp';
  preview.innerHTML = `
    <div class="business-card ${isRtl ? 'rtl' : ''}" ${isRtl ? 'dir="rtl"' : ''}>
      <div class="business-card-header">
        ${headerImageUrl ? `<img class="business-card-cover" src="${normalizeUrl(headerImageUrl)}" alt="Header image">` : ''}
        <div class="business-card-logo">
          ${brandLogoUrl ? `<img src="${brandLogoUrl}" alt="Brand logo">` : brandInitial}
        </div>
        <div class="business-card-title">${title}</div>
        ${subtitle ? `<div class="business-card-subtitle">${subtitle}</div>` : ''}
      </div>
      <div class="business-card-body">
        <div class="action-grid">
          ${phone1 ? `
            <a class="action-tile" href="tel:${phone1.replace(/\\s+/g, '')}">
              <span class="action-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.86 19.86 0 0 1 3 5.18 2 2 0 0 1 5 3h3a2 2 0 0 1 2 1.72c.12.81.3 1.6.54 2.36a2 2 0 0 1-.45 2.11L9 10a16 16 0 0 0 5 5l.81-1.09a2 2 0 0 1 2.11-.45c.76.24 1.55.42 2.36.54A2 2 0 0 1 22 16.92z"></path>
                </svg>
              </span>
              <span class="action-text">${phone1}</span>
            </a>
          ` : ''}
          ${phone2 ? `
            <a class="action-tile" href="tel:${phone2.replace(/\\s+/g, '')}">
              <span class="action-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.86 19.86 0 0 1 3 5.18 2 2 0 0 1 5 3h3a2 2 0 0 1 2 1.72c.12.81.3 1.6.54 2.36a2 2 0 0 1-.45 2.11L9 10a16 16 0 0 0 5 5l.81-1.09a2 2 0 0 1 2.11-.45c.76.24 1.55.42 2.36.54A2 2 0 0 1 22 16.92z"></path>
                </svg>
              </span>
              <span class="action-text">${phone2}</span>
            </a>
          ` : ''}
          ${(address || locationUrl) ? `
            ${locationUrl ? `<a class="action-tile" href="${locationUrl}" target="_blank" rel="noopener">` : `<div class="action-tile">`}
              <span class="action-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 22s8-4.5 8-11a8 8 0 1 0-16 0c0 6.5 8 11 8 11z"></path>
                  <circle cx="12" cy="11" r="3"></circle>
                </svg>
              </span>
              <span class="action-text">${address || t('card_location')}</span>
            ${locationUrl ? `</a>` : `</div>`}
          ` : ''}
          ${facebookUrl ? `
            <a class="action-tile" href="${facebookUrl}" target="_blank" rel="noopener">
              <img class="action-icon" src="${facebookIcon}" alt="Facebook">
              <span class="action-text">${t('card_facebook')}</span>
            </a>
          ` : ''}
          ${instagramUrl ? `
            <a class="action-tile" href="${instagramUrl}" target="_blank" rel="noopener">
              <img class="action-icon" src="${instagramIcon}" alt="Instagram">
              <span class="action-text">${t('card_instagram')}</span>
            </a>
          ` : ''}
          ${whatsapp ? `
            <a class="action-tile whatsapp" href="https://wa.me/${whatsapp.replace(/\\D+/g, '')}" target="_blank" rel="noopener">
              <img class="action-icon" src="${whatsappIcon}" alt="WhatsApp">
              <span class="action-text">${t('card_whatsapp')}</span>
            </a>
          ` : ''}
        </div>
        ${galleryImages.length ? `
          <div class="card-gallery">
            ${galleryImages.map((url) => `<img src="${normalizeUrl(url)}" alt="Gallery image">`).join('')}
          </div>
        ` : ''}
      </div>
      <div class="card-footer">
        <a href="https://getadly.com" target="_blank" rel="noopener">Built with Adly</a>
        &middot; Get yours now
      </div>
    </div>
  `;
  bindPreviewLightbox();
}

function bindPreviewLightbox() {
  if (!preview || previewLightboxReady) return;
  previewLightboxReady = true;
  let lightbox = document.getElementById('card-lightbox-preview');
  if (!lightbox) {
    lightbox = document.createElement('div');
    lightbox.className = 'modal';
    lightbox.id = 'card-lightbox-preview';
    lightbox.innerHTML = `
      <div class="modal-card card-lightbox-modal-card">
        <button class="modal-close card-lightbox-close" type="button" aria-label="Close">✕</button>
        <button class="lightbox-nav prev" type="button" aria-label="Previous">‹</button>
        <button class="lightbox-nav next" type="button" aria-label="Next">›</button>
        <img id="card-lightbox-preview-img" src="" alt="Preview">
      </div>
    `;
    document.body.appendChild(lightbox);
  }
  const lightboxImg = lightbox.querySelector('#card-lightbox-preview-img');
  const closeBtn = lightbox.querySelector('.modal-close');
  const prevBtn = lightbox.querySelector('.lightbox-nav.prev');
  const nextBtn = lightbox.querySelector('.lightbox-nav.next');
  let currentIndex = 0;
  let currentImages = [];
  
  const updateLightbox = () => {
    if (currentImages.length === 0) return;
    lightboxImg.src = currentImages[currentIndex];
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === currentImages.length - 1;
    prevBtn.style.display = currentImages.length > 1 ? 'flex' : 'none';
    nextBtn.style.display = currentImages.length > 1 ? 'flex' : 'none';
  };
  
  const openLightbox = (src, allImages) => {
    if (!src) return;
    currentImages = allImages || [src];
    currentIndex = currentImages.indexOf(src);
    if (currentIndex === -1) currentIndex = 0;
    updateLightbox();
    lightbox.classList.add('open');
  };
  
  const closeLightbox = () => {
    lightbox.classList.remove('open');
    lightboxImg.src = '';
    currentImages = [];
    currentIndex = 0;
  };
  
  closeBtn.addEventListener('click', closeLightbox);
  prevBtn.addEventListener('click', () => {
    if (currentIndex > 0) {
      currentIndex--;
      updateLightbox();
    }
  });
  nextBtn.addEventListener('click', () => {
    if (currentIndex < currentImages.length - 1) {
      currentIndex++;
      updateLightbox();
    }
  });
  
  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) {
      closeLightbox();
    }
  });
  
  preview.addEventListener('click', (event) => {
    const target = event.target;
    if (target && target.tagName === 'IMG' && target.closest('.card-gallery')) {
      const galleryImgs = Array.from(preview.querySelectorAll('.card-gallery img')).map(img => img.src);
      openLightbox(target.src, galleryImgs);
    }
  });
}

function renderCardList(items) {
  if (!cardList) return;
  lastCards = items;
  cardList.innerHTML = '';
  if (!items.length) {
    cardList.innerHTML = `<div class="muted">${t('card_no_cards')}</div>`;
    return;
  }
  items.forEach((card) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'landing-card';
    const status = card.status || 'published';
    const statusLabel = status.replace(/_/g, ' ');
    const statusText = statusLabel.toLowerCase() === 'published' ? 'Published' : statusLabel;
    const link = card.public_slug ? `${window.location.origin}/business-card.php?slug=${encodeURIComponent(card.public_slug)}` : '';
    wrapper.innerHTML = `
      <div class="landing-card-header">
        <div>
          <div class="landing-title">${card.title || t('card_title_fallback')}</div>
          <div class="muted">${t('common_updated')} ${formatDate(card.updated_at || card.created_at)}</div>
        </div>
        <div class="status-pill ${status}">${statusText}</div>
      </div>
      ${card.error_message ? `<div class="alert error">${card.error_message}</div>` : ''}
      <div class="landing-actions">
        ${link ? `<a class="button secondary" href="${link}" target="_blank" rel="noopener">${t('common_open')}</a>` : `<span class="muted">${t('common_generating')}</span>`}
        ${link ? `<button class="button secondary copy-link" data-link="${encodeURIComponent(link)}">${t('common_copy')}</button>` : ''}
      </div>
    `;
    const copyBtn = wrapper.querySelector('.copy-link');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const url = decodeURIComponent(copyBtn.dataset.link || '');
        navigator.clipboard.writeText(url).then(() => {
          showAlert(alertBox, t('common_link_copied'), 'success');
        }).catch(() => {
          showAlert(alertBox, t('common_copy_failed'));
        });
      });
    }
    cardList.appendChild(wrapper);
  });
}

async function uploadImages(files) {
  const clientId = getClientId();
  const payload = new FormData();
  payload.append('client_id', clientId);
  Array.from(files).forEach((file) => payload.append('product_images[]', file));
  const response = await fetch(`${API_BASE}/web_upload_product.php`, {
    method: 'POST',
    credentials: 'include',
    body: payload
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || t('common_upload_failed'));
  }
  return data.urls || [];
}

async function loadBrand() {
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
  renderBrandHeader(brand);
  setTheme({
    primary: brand.primary_color || DEFAULT_THEME.primary,
    secondary: brand.secondary_color || DEFAULT_THEME.secondary,
    logoUrl: brand.logo_url || null,
    name: brand.business_name || DEFAULT_THEME.name
  });
}

async function loadCard() {
  const clientId = getClientId();
  if (!clientId) return;
  const data = await apiRequest(`/web_business_cards.php?client_id=${clientId}`);
  const card = data.card;
  renderCardList(data.items || (card ? [card] : []));
  if (!card) {
    renderCardPreview();
    return;
  }
  titleInput.value = card.title || '';
  subtitleInput.value = card.subtitle || '';
  phone1Input.value = card.phone_1 || '';
  phone2Input.value = card.phone_2 || '';
  addressInput.value = card.address || '';
  locationInput.value = card.location_url || '';
  facebookInput.value = card.facebook_url || '';
  instagramInput.value = card.instagram_url || '';
  whatsappInput.value = card.whatsapp_number || '';
  headerImageUrl = card.header_image_url || '';
  galleryImages = card.gallery_images || [];
  publicSlug = card.public_slug || '';
  renderHeaderPreview(headerImageUrl);
  renderGalleryPreview();
  renderCardPreview();
  if (publicSlug) {
    copyLinkButton.style.display = 'inline-flex';
  }
}

form.addEventListener('input', () => {
  renderCardPreview();
});

if (headerUpload) {
  headerUpload.addEventListener('change', async () => {
    if (!headerUpload.files || !headerUpload.files.length) return;
    try {
      const urls = await uploadImages(headerUpload.files);
      headerImageUrl = urls[0] || '';
      renderHeaderPreview(headerImageUrl);
      renderCardPreview();
    } catch (err) {
      showAlert(alertBox, err.message || t('common_request_failed'));
    } finally {
      headerUpload.value = '';
    }
  });
}

if (galleryUpload) {
  galleryUpload.addEventListener('change', async () => {
    if (!galleryUpload.files || !galleryUpload.files.length) return;
    try {
      const remaining = 10 - galleryImages.length;
      if (remaining <= 0) {
        showAlert(alertBox, t('card_gallery_limit'));
        galleryUpload.value = '';
        return;
      }
      const files = Array.from(galleryUpload.files).slice(0, remaining);
      const urls = await uploadImages(files);
      galleryImages = [...galleryImages, ...urls].slice(0, 10);
      renderGalleryPreview();
      renderCardPreview();
    } catch (err) {
      showAlert(alertBox, err.message || t('common_request_failed'));
    } finally {
      galleryUpload.value = '';
    }
  });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const clientId = getClientId();
  if (!clientId) {
    showAlert(alertBox, t('common_client_missing'));
    return;
  }
  const pendingCard = {
    title: titleInput.value.trim() || t('card_title_fallback'),
    status: 'generating',
    public_slug: '',
    created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    updated_at: null
  };
  renderCardList([pendingCard, ...lastCards]);
  const saveButton = document.getElementById('card-save');
  saveButton.disabled = true;
  saveButton.textContent = t('common_saving');
  try {
    const payload = {
      action: 'save',
      client_id: Number(clientId),
      title: titleInput.value.trim(),
      subtitle: subtitleInput.value.trim(),
      header_image_url: headerImageUrl,
      phone_1: phone1Input.value.trim(),
      phone_2: phone2Input.value.trim(),
      address: addressInput.value.trim(),
      location_url: locationInput.value.trim(),
      facebook_url: facebookInput.value.trim(),
      instagram_url: instagramInput.value.trim(),
      whatsapp_number: whatsappInput.value.trim(),
      gallery_images: galleryImages
    };
    const data = await apiRequest('/web_business_cards.php', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    publicSlug = data.public_slug || publicSlug;
    copyLinkButton.style.display = publicSlug ? 'inline-flex' : 'none';
    await loadCard();
    showAlert(alertBox, t('card_saved'), 'success');
  } catch (err) {
    showAlert(alertBox, err.message || t('common_request_failed'));
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = t('common_save');
  }
});

if (copyLinkButton) {
  copyLinkButton.addEventListener('click', async () => {
    if (!publicSlug) return;
    const url = `${window.location.origin}/business-card.php?slug=${encodeURIComponent(publicSlug)}`;
    try {
      await navigator.clipboard.writeText(url);
      showAlert(alertBox, t('common_link_copied'), 'success');
    } catch (err) {
      showAlert(alertBox, t('common_copy_failed'));
    }
  });
}

// Load brand first so brandLogoUrl is set before renderCardPreview
loadBrand().then(() => loadCard());
