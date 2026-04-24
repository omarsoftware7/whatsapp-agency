const brandSelect = document.getElementById('brand-select');
const brandSummary = document.getElementById('brand-summary');
const jobsList = document.getElementById('jobs');
const jobDetails = document.getElementById('job-details');
const jobDetailsCard = document.getElementById('job-details-card');
const createForm = document.getElementById('create-form');
const createAlert = document.getElementById('create-alert');
const createPanel = document.getElementById('create-panel');
const createToggle = document.getElementById('create-toggle');
const jobsTitle = document.getElementById('jobs-title');
const jobTypeSelect = document.getElementById('job_type');
const multiSection = document.getElementById('multi-products-section');
const multiList = document.getElementById('multi-products-list');
const addMultiButton = document.getElementById('add-multi-product');
const tipsSection = document.getElementById('tips-section');
const tipsContent = document.getElementById('tips_content');
const tipsCount = document.getElementById('tips_count');
const imageSizeField = document.getElementById('image-size-field');
const languageField = document.getElementById('language-field');
const ugcLanguageField = document.getElementById('ugc-language-field');
const ugcAccentField = document.getElementById('ugc-accent-field');
const ugcLanguageSelect = document.getElementById('ugc_language');
const ugcAccentSelect = document.getElementById('ugc_accent');
const ugcAutoField = document.getElementById('ugc-auto-field');
const ugcAutoCheckbox = document.getElementById('ugc_auto');
const creativeDirectionField = document.getElementById('creative-direction-field');
const userMessageInput = document.getElementById('user_message');
const baseImageField = document.getElementById('base-image-field');
const baseImageInput = document.getElementById('base_image');
const baseImageTitle = baseImageField?.querySelector('.upload-box-title');
const baseImageSubtitle = baseImageField?.querySelector('.upload-box-subtitle');
const baseImageHint = baseImageField?.querySelector('.hint');
const productImagesInput = document.getElementById('product_images');
const productImagesPreview = document.getElementById('product-images-preview');
const baseImagePreview = document.getElementById('base-image-preview');
const productImagesBox = document.querySelector('label[for="product_images"]');
const baseImageBox = document.querySelector('label[for="base_image"]');
const jobSearchInput = document.getElementById('job-search');
const jobStatusFilter = document.getElementById('job-status-filter');
const jobsPrev = document.getElementById('jobs-prev');
const jobsNext = document.getElementById('jobs-next');
const jobsPage = document.getElementById('jobs-page');
const brandCollapseToggle = document.getElementById('brand-collapse-toggle');
const brandSummaryCard = document.getElementById('brand-summary-card');
const logoutButton = document.getElementById('logout');
const adminUsersLink = document.getElementById('admin-users-link');
const imageModal = document.getElementById('image-modal');
const modalImage = document.getElementById('modal-image');
const imageModalClose = document.getElementById('image-modal-close');
const userChip = document.getElementById('user-chip');
const userAvatar = document.getElementById('user-avatar');
const userWelcome = document.getElementById('user-welcome');
const userName = document.getElementById('user-name');
const brandSelectLogo = document.getElementById('brand-select-logo');
const langSelect = document.getElementById('lang-select');
const sidebar = document.getElementById('sidebar');
const navToggle = document.getElementById('nav-toggle');
const sidebarClose = document.getElementById('sidebar-close');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const navCredits = document.getElementById('nav-credits');
const mobileCredits = document.getElementById('mobile-credits');
const headerBrandName = document.getElementById('header-brand-name');
const adminNav = document.getElementById('admin-nav');
const adminBrandsLink = document.getElementById('admin-brands-link');
const adminJobsLink = document.getElementById('admin-jobs-link');
const adminLandingLink = document.getElementById('admin-landing-link');
const adminMetricsLink = document.getElementById('admin-metrics-link');
const adminCardsLink = document.getElementById('admin-cards-link');
const headerCredits = document.getElementById('header-credits');
const brandSwitcher = document.getElementById('brand-switcher');
const brandSwitcherSlotSidebar = document.getElementById('brand-switcher-slot-sidebar');
const sidebarBrandName = document.getElementById('sidebar-brand-name');
const sidebarBrandLogo = document.getElementById('sidebar-brand-logo');

let brands = [];
let currentBrand = null;
let currentJobs = [];
let selectedJobId = null;
let jobDetailsModal = null;
let jobDetailsModalBody = null;
const jobDetailsHost = jobDetailsCard?.parentElement || null;
const jobDetailsNextSibling = jobDetailsCard?.nextSibling || null;
let currentMultiPreviewUrl = null;
let jobSearchTerm = '';
let jobStatus = 'all';
let jobPage = 1;
let lastCreatedJobId = null;
let lastCreatedJobTimer = null;
const LAST_CREATED_JOB_KEY = 'lastCreatedJobId';
const LAST_CREATED_JOB_TIME_KEY = 'lastCreatedJobAt';
const JOBS_PER_PAGE = 6;
const pendingCopyEdits = new Set();
let userThemeMode = 'brand';
let userPlan = {
  plan_tier: 'trial',
  subscription_status: 'trial',
  credits_remaining: 0,
  text_credits_remaining: 0,
  image_credits_remaining: 0,
  video_credits_remaining: 0,
  landing_credits_remaining: 0,
  trial_end_at: null,
  plan_end_at: null
};
let planLimits = null;

function hasActivePlan() {
  if (userPlan.subscription_status === 'trial') {
    if (!userPlan.trial_end_at) return false;
    const hasCredits = (userPlan.text_credits_remaining + userPlan.image_credits_remaining + userPlan.video_credits_remaining + userPlan.landing_credits_remaining) > 0;
    return new Date(userPlan.trial_end_at).getTime() >= Date.now() && hasCredits;
  }
  if (userPlan.subscription_status === 'active') {
    if (!userPlan.plan_end_at) return true;
    return new Date(userPlan.plan_end_at).getTime() >= Date.now();
  }
  return false;
}

function hasCreditsForJobType(jobType) {
  if (jobType === 'ugc_video') {
    return userPlan.video_credits_remaining > 0;
  }
  if (jobType === 'reel') {
    return userPlan.video_credits_remaining > 0;
  }
  return userPlan.image_credits_remaining > 0 && userPlan.text_credits_remaining > 0;
}

function updateHeaderBrand() {
  // Re-query elements each time since shared.js may replace them via innerHTML
  const headerName = document.getElementById('header-brand-name');
  const sidebarName = document.getElementById('sidebar-brand-name');
  const sidebarLogo = document.getElementById('sidebar-brand-logo');
  const logoWrap = document.querySelector('.brand-logo');
  
  if (headerName) {
    headerName.textContent = currentBrand?.business_name || 'Adly';
  }
  if (sidebarName) {
    sidebarName.textContent = currentBrand?.business_name || 'Adly';
  }
  
  // Update logo - handle both img element and placeholder div
  if (currentBrand?.logo_url) {
    const logoUrl = normalizeUrl(currentBrand.logo_url);
    if (sidebarLogo?.tagName === 'IMG') {
      sidebarLogo.src = logoUrl;
    } else if (logoWrap) {
      logoWrap.innerHTML = `<img id="sidebar-brand-logo" src="${logoUrl}" alt="Brand logo">`;
    }
  } else if (logoWrap) {
    // Show placeholder when no logo
    logoWrap.innerHTML = `<div id="sidebar-brand-logo" class="brand-logo-placeholder">Ad</div>`;
  }
}

function updateNavLinks() {
  const brandId = currentBrand?.id;
  document.querySelectorAll('[data-client-link]').forEach((link) => {
    const base = link.getAttribute('data-client-link');
    if (!base) return;
    link.setAttribute('href', brandId ? `${base}?client_id=${brandId}` : base);
  });
}

function renderCredits(container) {
  if (!container) return;
  const items = [
    { icon: iconSvg('icon-pencil', 'credit-icon'), value: userPlan.text_credits_remaining, label: t('credits_text') },
    { icon: iconSvg('icon-image', 'credit-icon'), value: userPlan.image_credits_remaining, label: t('credits_image') },
    { icon: iconSvg('icon-video', 'credit-icon'), value: userPlan.video_credits_remaining, label: t('credits_video') },
    { icon: iconSvg('icon-globe', 'credit-icon'), value: userPlan.landing_credits_remaining, label: t('credits_landing') }
  ];
  if (planLimits) {
    const brandValue = planLimits.brands_limit > 0
      ? `${planLimits.brands_used}/${planLimits.brands_limit}`
      : `${planLimits.brands_used}/∞`;
    const cardsValue = planLimits.cards_enabled === false
      ? t('profile_not_available')
      : (planLimits.cards_limit > 0 ? `${planLimits.cards_used}/${planLimits.cards_limit}` : `${planLimits.cards_used}/∞`);
    const landingValue = planLimits.landing_limit > 0
      ? `${planLimits.landing_used}/${planLimits.landing_limit}`
      : `${planLimits.landing_used}/∞`;
    items.push(
      { icon: iconSvg('icon-library', 'credit-icon'), value: brandValue, label: t('credits_brands_limit') },
      { icon: iconSvg('icon-globe', 'credit-icon'), value: landingValue, label: t('credits_landing_limit') },
      { icon: iconSvg('icon-image', 'credit-icon'), value: cardsValue, label: t('credits_cards_limit') }
    );
  }
  container.innerHTML = items.map((item) => {
    const value = item.value ?? 0;
    const label = item.label || 'Credits';
    return `
      <div class="credit-pill" data-tooltip="${label}: ${value}" tabindex="0" aria-label="${label}: ${value}">
        <span class="credit-icon">${item.icon}</span>
        <span class="credit-value">${value}</span>
      </div>
    `;
  }).join('');
}

function renderMiniCredits(container) {
  if (!container) return;
  const items = [
    { icon: iconSvg('icon-pencil', 'credit-icon'), value: userPlan.text_credits_remaining, label: t('credits_text') },
    { icon: iconSvg('icon-image', 'credit-icon'), value: userPlan.image_credits_remaining, label: t('credits_image') },
    { icon: iconSvg('icon-video', 'credit-icon'), value: userPlan.video_credits_remaining, label: t('credits_video') },
    { icon: iconSvg('icon-globe', 'credit-icon'), value: userPlan.landing_credits_remaining, label: t('credits_landing') }
  ];
  container.innerHTML = items.map((item) => {
    const value = item.value ?? 0;
    const label = item.label || 'Credits';
    return `
      <span class="credit-mini" title="${label}: ${value}">
        <span class="credit-icon">${item.icon}</span>
        <span class="credit-value">${value}</span>
      </span>
    `;
  }).join('');
}

function placeBrandSwitcher() {
  if (!brandSwitcher) return;
  const target = brandSwitcherSlotSidebar;
  if (target && brandSwitcher.parentElement !== target) {
    target.appendChild(brandSwitcher);
  }
}
const urlParams = new URLSearchParams(window.location.search);
const initialJobId = urlParams.get('job_id');
if (initialJobId) {
  selectedJobId = Number(initialJobId);
}

function normalizeUrl(url) {
  if (!url || typeof url !== 'string') return url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    const origin = window.location.origin;
    return url.replace(/^https?:\/\/(getadly\.com|127\.0\.0\.1:\d+|localhost:\d+)/i, origin);
  }
  return url;
}

function safeJsonParse(value, fallback = []) {
  if (!value) return fallback;
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    try {
      const unescaped = value.replace(/\\\"/g, '"').replace(/\\\\/g, '\\');
      return JSON.parse(unescaped);
    } catch (error2) {
      return fallback;
    }
  }
}

function renderUploadPreview(files, container, box) {
  if (!container) return;
  const items = Array.from(files || []);
  if (!items.length) {
    container.innerHTML = '';
    if (box) box.classList.remove('has-file');
    return;
  }
  if (box) box.classList.add('has-file');
  const previews = items.map((file) => {
    const url = URL.createObjectURL(file);
    return `
      <div class="upload-thumb">
        <img src="${url}" alt="${file.name}">
        <div class="upload-meta">
          <div class="upload-name">${file.name}</div>
          <div class="muted">${Math.round(file.size / 1024)} KB</div>
        </div>
      </div>
    `;
  }).join('');
  container.innerHTML = previews;
}

function openSidebar() {
  document.body.classList.add('sidebar-open');
}

function closeSidebar() {
  document.body.classList.remove('sidebar-open');
}

// Publish type selection modal
let publishTypeResolve = null;

function showPublishTypeModal(job) {
  const isMulti = job.job_type === 'multi_mode';
  const isSquare = job.image_size !== 'story';
  
  return new Promise((resolve) => {
    publishTypeResolve = resolve;
    
    // Create modal if it doesn't exist
    let modal = document.getElementById('publish-type-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'publish-type-modal';
      modal.className = 'modal';
      document.body.appendChild(modal);
    }
    
    const storyDisabled = isMulti;
    const showSquareWarning = isSquare && !isMulti;
    
    modal.innerHTML = `
      <div class="modal-card publish-type-card">
        <div class="modal-header">
          <h3>${t('publish_type_title')}</h3>
          <button class="modal-close" id="publish-type-close">✕</button>
        </div>
        <div class="modal-body">
          <p class="publish-type-subtitle">${t('publish_type_subtitle')}</p>
          <div class="publish-type-options">
            <button class="publish-type-option" data-type="post">
              <span class="publish-type-icon">📱</span>
              <span class="publish-type-label">${t('publish_type_post')}</span>
              <span class="publish-type-desc">${t('publish_type_post_desc')}</span>
            </button>
            <button class="publish-type-option ${storyDisabled ? 'disabled' : ''}" data-type="story" ${storyDisabled ? 'disabled' : ''}>
              <span class="publish-type-icon">📖</span>
              <span class="publish-type-label">${t('publish_type_story')}</span>
              <span class="publish-type-desc">${t('publish_type_story_desc')}</span>
              ${storyDisabled ? `<span class="publish-type-disabled-note">${t('publish_type_story_multi_disabled')}</span>` : ''}
            </button>
          </div>
          ${showSquareWarning ? `
            <div class="publish-type-warning-box" id="story-warning" style="display:none;">
              <div class="warning-icon">⚠️</div>
              <div class="warning-content">
                <div class="warning-title">${t('publish_type_square_warning_title')}</div>
                <div class="warning-text">${t('publish_type_square_warning')}</div>
                <label class="warning-checkbox">
                  <input type="checkbox" id="story-confirm-check">
                  <span>${t('publish_type_square_confirm')}</span>
                </label>
                <button class="button publish-type-confirm-btn" id="story-confirm-btn" disabled>${t('publish_type_story_confirm')}</button>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
    
    modal.classList.add('open');
    
    // Event handlers
    const closeBtn = modal.querySelector('#publish-type-close');
    const postOption = modal.querySelector('.publish-type-option[data-type="post"]');
    const storyOption = modal.querySelector('.publish-type-option[data-type="story"]:not(.disabled)');
    const storyWarning = modal.querySelector('#story-warning');
    const storyConfirmCheck = modal.querySelector('#story-confirm-check');
    const storyConfirmBtn = modal.querySelector('#story-confirm-btn');
    
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('open');
      publishTypeResolve(null);
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('open');
        publishTypeResolve(null);
      }
    });
    
    // Post option - direct selection
    if (postOption) {
      postOption.addEventListener('click', () => {
        modal.classList.remove('open');
        publishTypeResolve('post');
      });
    }
    
    // Story option - may need confirmation for square images
    if (storyOption) {
      storyOption.addEventListener('click', () => {
        if (showSquareWarning && storyWarning) {
          // Show warning box and require confirmation
          storyWarning.style.display = 'flex';
          storyOption.classList.add('selected');
          if (postOption) postOption.classList.add('dimmed');
        } else {
          // No warning needed, proceed directly
          modal.classList.remove('open');
          publishTypeResolve('story');
        }
      });
    }
    
    // Checkbox enables confirm button
    if (storyConfirmCheck && storyConfirmBtn) {
      storyConfirmCheck.addEventListener('change', () => {
        storyConfirmBtn.disabled = !storyConfirmCheck.checked;
      });
      
      storyConfirmBtn.addEventListener('click', () => {
        modal.classList.remove('open');
        publishTypeResolve('story');
      });
    }
  });
}

function closePublishTypeModal() {
  const modal = document.getElementById('publish-type-modal');
  if (modal) {
    modal.classList.remove('open');
  }
  if (publishTypeResolve) {
    publishTypeResolve(null);
  }
}

async function loadEditHistory(jobId, container, designVariations) {
  try {
    const data = await apiRequest(`/web_jobs.php?action=edit_history&job_id=${jobId}`);
    const edits = data.edit_history || [];
    if (!edits.length) {
      container.innerHTML = '';
      return;
    }
    
    let html = `
      <div class="edit-history-section">
        <button class="edit-history-toggle" type="button">
          <span>📝 ${t('edit_history_title')} (${edits.length})</span>
          <span class="toggle-icon">▼</span>
        </button>
        <div class="edit-history-list collapsed">
    `;
    
    edits.forEach((edit, index) => {
      const statusIcon = edit.status === 'completed' ? '✅' : edit.status === 'failed' ? '❌' : '⏳';
      const statusClass = edit.status === 'completed' ? 'completed' : edit.status === 'failed' ? 'failed' : 'pending';
      const timeStr = edit.requested_at ? new Date(edit.requested_at.replace(' ', 'T')).toLocaleString() : '';
      
      // Get result image URL
      let imageUrl = edit.result_image_url;
      if (!imageUrl && edit.status === 'completed' && designVariations.length > index + 1) {
        imageUrl = designVariations[index + 1];
      }
      
      html += `
        <div class="edit-history-item ${statusClass}">
          <div class="edit-history-header">
            <span class="edit-number">${statusIcon} ${t('edit_request')} #${index + 1}</span>
            <span class="edit-time">${timeStr}</span>
          </div>
          <div class="edit-request-text">"${(edit.user_edit || '').substring(0, 200)}${edit.user_edit && edit.user_edit.length > 200 ? '...' : ''}"</div>
          ${edit.error_message ? `<div class="edit-error">⚠️ ${edit.error_message}</div>` : ''}
          ${imageUrl ? `<img class="edit-result-thumb clickable-thumb" src="${normalizeUrl(imageUrl)}" alt="${t('edit_result')}" data-full-url="${normalizeUrl(imageUrl)}">` : ''}
        </div>
      `;
    });
    
    html += '</div></div>';
    container.innerHTML = html;
    
    // Toggle expand/collapse
    const toggle = container.querySelector('.edit-history-toggle');
    const list = container.querySelector('.edit-history-list');
    if (toggle && list) {
      toggle.addEventListener('click', () => {
        list.classList.toggle('collapsed');
        toggle.querySelector('.toggle-icon').textContent = list.classList.contains('collapsed') ? '▼' : '▲';
      });
    }
    
    // Make thumbnails clickable to expand
    const thumbs = container.querySelectorAll('.clickable-thumb');
    thumbs.forEach((thumb) => {
      thumb.addEventListener('click', () => {
        const fullUrl = thumb.getAttribute('data-full-url');
        if (fullUrl && imageModal && modalImage) {
          modalImage.src = fullUrl;
          imageModal.classList.add('open');
        }
      });
    });
  } catch (error) {
    console.error('Failed to load edit history:', error);
    container.innerHTML = '';
  }
}

function createMultiRow(data = {}) {
  const row = document.createElement('div');
  row.className = 'multi-product-row';
  row.innerHTML = `
    <div class="multi-image-section">
      <div class="multi-image-preview">
        <span class="multi-image-placeholder">${iconSvg('icon-image')}</span>
      </div>
      <label class="multi-image-upload">
        <input type="file" accept="image/png,image/jpeg" class="multi-image" hidden>
        <span class="button secondary compact">${t('common_upload')}</span>
      </label>
    </div>
    <div class="multi-fields">
      <div class="multi-field">
        <label>${t('multi_name')}</label>
        <input type="text" class="multi-name" value="${data.name || ''}" placeholder="${t('multi_product_name')}">
      </div>
      <div class="multi-field">
        <label>${t('multi_price')}</label>
        <input type="text" class="multi-price" value="${data.price || ''}" placeholder="${t('multi_product_price')}">
      </div>
      <div class="multi-field">
        <label>${t('multi_old_price')}</label>
        <input type="text" class="multi-old-price" value="${data.old_price || ''}" placeholder="${t('multi_product_old_price')}">
      </div>
      <div class="multi-field full">
        <label>${t('multi_notes')}</label>
        <input type="text" class="multi-notes" value="${data.notes || ''}" placeholder="${t('multi_product_notes')}">
      </div>
    </div>
    <button type="button" class="button secondary compact multi-remove">${t('common_remove')}</button>
  `;
  
  // Handle image preview
  const imageInput = row.querySelector('.multi-image');
  const previewEl = row.querySelector('.multi-image-preview');
  
  imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      previewEl.innerHTML = `<img src="${url}" alt="Product preview">`;
      previewEl.classList.add('has-image');
      previewEl.style.cursor = 'pointer';
      previewEl.onclick = () => {
        if (imageModal && modalImage) {
          modalImage.src = url;
          imageModal.classList.add('open');
        }
      };
    } else {
      previewEl.innerHTML = `<span class="multi-image-placeholder">${iconSvg('icon-image')}</span>`;
      previewEl.classList.remove('has-image');
      previewEl.style.cursor = 'default';
      previewEl.onclick = null;
    }
  });
  
  row.querySelector('.multi-remove').addEventListener('click', () => {
    row.remove();
  });
  return row;
}

function setMultiMode(enabled) {
  if (!multiSection) return;
  multiSection.style.display = enabled ? 'block' : 'none';
  if (productImagesInput) {
    productImagesInput.closest('.field').style.display = enabled ? 'none' : 'block';
  }
  if (enabled) {
    renderUploadPreview([], productImagesPreview, productImagesBox);
  }
  if (imageSizeField) {
    imageSizeField.style.display = enabled ? 'none' : 'block';
  }
  if (enabled && multiList && !multiList.children.length) {
    multiList.appendChild(createMultiRow());
  }
}

function setTipsMode(enabled) {
  if (!tipsSection) return;
  tipsSection.style.display = enabled ? 'block' : 'none';
  if (productImagesInput) {
    productImagesInput.closest('.field').style.display = enabled ? 'none' : 'block';
  }
  if (enabled) {
    renderUploadPreview([], productImagesPreview, productImagesBox);
  }
  // Tips mode always uses post size (carousel)
  if (imageSizeField) {
    imageSizeField.style.display = enabled ? 'none' : 'block';
  }
}

function setFromImageMode(enabled, isBeforeAfter = false, isVideo = false) {
  if (baseImageField) {
    baseImageField.style.display = enabled ? 'block' : 'none';
  }
  if (productImagesInput) {
    productImagesInput.closest('.field').style.display = enabled ? 'none' : 'block';
  }
  if (!enabled) {
    renderUploadPreview([], baseImagePreview, baseImageBox);
  }
  if (enabled && baseImageInput) {
    baseImageInput.multiple = isBeforeAfter;
    if (baseImageTitle) {
      baseImageTitle.textContent = isBeforeAfter
        ? 'Drop two images (before + after) or click to upload'
        : (isVideo
          ? t('video_upload_title')
          : 'Drop a creative image here or click to upload');
    }
    if (baseImageSubtitle) {
      baseImageSubtitle.textContent = isBeforeAfter
        ? 'We will compose a before/after layout'
        : (isVideo
          ? t('video_upload_subtitle')
          : 'We will create on top of this image');
    }
    if (baseImageHint) {
      baseImageHint.textContent = isBeforeAfter
        ? 'Required for Before / After. Upload exactly 2 images.'
        : (isVideo
          ? t('video_upload_hint')
          : 'Required for Create From Image.');
    }
  }
}

function setUgcMode(enabled) {
  if (ugcLanguageField) {
    ugcLanguageField.style.display = enabled ? 'block' : 'none';
  }
  if (ugcAccentField) {
    ugcAccentField.style.display = enabled ? 'block' : 'none';
  }
  if (ugcAutoField) {
    ugcAutoField.style.display = enabled ? 'block' : 'none';
  }
  if (!enabled && creativeDirectionField) {
    creativeDirectionField.style.display = 'block';
  }
  if (enabled && ugcAutoCheckbox && creativeDirectionField) {
    creativeDirectionField.style.display = ugcAutoCheckbox.checked ? 'none' : 'block';
  }
}

function syncUgcAutoUI() {
  if (!ugcAutoCheckbox || !creativeDirectionField) return;
  const isAuto = ugcAutoCheckbox.checked;
  creativeDirectionField.style.display = isAuto ? 'none' : 'block';
  if (userMessageInput) {
    userMessageInput.disabled = isAuto;
    if (isAuto) userMessageInput.value = '';
  }
}

function setVideoMode(enabled) {
  const imageSizeSelect = document.getElementById('image_size');
  const imageSizeLabel = imageSizeSelect?.closest('.field')?.querySelector('label');
  if (!imageSizeSelect) return;
  
  if (enabled) {
    // Change size options to Reel/Square for video
    imageSizeSelect.innerHTML = `
      <option value="story" data-i18n="size_reel">${t('size_reel')}</option>
      <option value="post" data-i18n="size_square">${t('size_square')}</option>
    `;
    if (imageSizeLabel) {
      imageSizeLabel.setAttribute('data-i18n', 'app_video_size');
      imageSizeLabel.textContent = t('app_video_size');
    }
  } else {
    // Restore image size options
    imageSizeSelect.innerHTML = `
      <option value="post" data-i18n="app_size_post">${t('app_size_post')}</option>
      <option value="story" data-i18n="app_size_story">${t('app_size_story')}</option>
    `;
    if (imageSizeLabel) {
      imageSizeLabel.setAttribute('data-i18n', 'app_image_size');
      imageSizeLabel.textContent = t('app_image_size');
    }
  }
}

if (productImagesInput) {
  productImagesInput.addEventListener('change', () => {
    renderUploadPreview(productImagesInput.files, productImagesPreview, productImagesBox);
  });
}
if (baseImageInput) {
  baseImageInput.addEventListener('change', () => {
    renderUploadPreview(baseImageInput.files, baseImagePreview, baseImageBox);
  });
}

async function ensureAuth() {
  try {
    const auth = await apiRequest('/web_auth.php', {
      method: 'POST',
      body: JSON.stringify({ action: 'me' })
    });
    const user = auth.user || {};
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    const displayName = firstName || lastName || user.email || 'User';
    if (userWelcome && userName) {
      userWelcome.textContent = t('welcome_label');
      userName.textContent = displayName;
    } else if (userWelcome) {
      userWelcome.dataset.i18nName = displayName;
      userWelcome.textContent = t('welcome_user', { name: displayName });
    }
    if (userAvatar) {
      if (user.avatar_url) {
        userAvatar.innerHTML = `<img src="${user.avatar_url}" alt="User avatar">`;
      } else {
        userAvatar.textContent = (displayName || 'U').slice(0, 1).toUpperCase();
      }
    }
    userThemeMode = user.theme_mode || 'brand';
    userPlan = {
      plan_tier: user.plan_tier || 'trial',
      subscription_status: user.subscription_status || 'trial',
      credits_remaining: Number(user.credits_remaining || 0),
      text_credits_remaining: Number(user.text_credits_remaining || 0),
      image_credits_remaining: Number(user.image_credits_remaining || 0),
      video_credits_remaining: Number(user.video_credits_remaining || 0),
      landing_credits_remaining: Number(user.landing_credits_remaining || 0),
      trial_end_at: user.trial_end_at || null,
      plan_end_at: user.plan_end_at || null
    };
    const planBanner = document.getElementById('plan-banner');
    if (planBanner) {
      planBanner.style.display = 'none';
    }
    renderCredits(navCredits);
    renderCredits(headerCredits);
    if (typeof renderMobileCredits === 'function') {
      renderMobileCredits(mobileCredits, userPlan, planLimits);
    } else {
      renderCredits(mobileCredits);
    }
    await loadPlanLimits();
    if (jobTypeSelect) {
      const multiOption = jobTypeSelect.querySelector('option[value="multi_mode"]');
      if (multiOption) {
        multiOption.disabled = false;
        multiOption.textContent = t('job_multi_mode');
      }
    }
    if (auth.user && auth.user.role === 'admin') {
      if (adminNav) adminNav.style.display = 'flex';
      if (adminUsersLink) adminUsersLink.style.display = 'flex';
      if (adminBrandsLink) adminBrandsLink.style.display = 'flex';
      if (adminJobsLink) adminJobsLink.style.display = 'flex';
      if (adminLandingLink) adminLandingLink.style.display = 'flex';
      if (adminMetricsLink) adminMetricsLink.style.display = 'flex';
      if (adminCardsLink) adminCardsLink.style.display = 'flex';
    }
  } catch (error) {
    window.location.href = './login.html';
  }
}

async function loadPlanLimits() {
  try {
    const data = await apiRequest('/web_profile.php', {
      method: 'POST',
      body: JSON.stringify({ action: 'limits' })
    });
    planLimits = data.limits || null;
    renderCredits(navCredits);
    renderCredits(headerCredits);
    if (typeof renderMobileCredits === 'function') {
      renderMobileCredits(mobileCredits, userPlan, planLimits);
    } else {
      renderCredits(mobileCredits);
    }
  } catch (error) {
    planLimits = null;
  }
}

function renderBrandOptions() {
  brandSelect.innerHTML = '';
  brands.forEach((brand) => {
    const option = document.createElement('option');
    option.value = brand.id;
    option.textContent = brand.business_name || `Brand ${brand.id}`;
    brandSelect.appendChild(option);
  });
  if (currentBrand) {
    brandSelect.value = currentBrand.id;
  }
}

function updateBrandTheme(brand) {
  if (userThemeMode === 'default') {
    setDefaultTheme();
    if (brandSelectLogo) {
      brandSelectLogo.src = brand.logo_url ? normalizeUrl(brand.logo_url) : '';
    }
    if (typeof updateBrandLogoWarning === 'function') {
      updateBrandLogoWarning(brand);
    }
    return;
  }
  setTheme({
    primary: brand.primary_color || DEFAULT_THEME.primary,
    secondary: brand.secondary_color || DEFAULT_THEME.secondary,
    logoUrl: brand.logo_url || null,
    name: brand.business_name || DEFAULT_THEME.name
  });
  if (brandSelectLogo) {
    brandSelectLogo.src = brand.logo_url ? normalizeUrl(brand.logo_url) : '';
  }
  if (typeof updateBrandLogoWarning === 'function') {
    updateBrandLogoWarning(brand);
  }
}

function renderBrandSummary(brand) {
  if (!brand) {
    brandSummary.innerHTML = `<div class="muted">${t('brand_none_selected')}</div>`;
    if (jobsTitle) jobsTitle.textContent = t('app_jobs_for_brand');
    return;
  }
  const logo = brand.logo_url ? normalizeUrl(brand.logo_url) : null;
  const initial = (brand.business_name || 'B').slice(0, 1).toUpperCase();
  const nameRtl = isRtlText(brand.business_name || '');
  const industryRtl = isRtlText(brand.industry || '');
  const descRtl = isRtlText(brand.business_description || '');
  if (jobsTitle) {
    jobsTitle.innerHTML = `
      <span class="jobs-title">
        <span class="jobs-title-logo">${logo ? `<img src="${logo}" alt="Brand logo">` : initial}</span>
        <span>${t('jobs_for_brand', { name: brand.business_name || t('brand_this_brand') })}</span>
      </span>
    `;
  }
  if (brandSummaryCard) {
    brandSummaryCard.classList.toggle('brand-summary-rtl', nameRtl);
  }
  const compactLogo = document.getElementById('brand-summary-compact-logo');
  const compactName = document.getElementById('brand-summary-compact-name');
  if (compactLogo) {
    compactLogo.innerHTML = logo ? `<img src="${logo}" alt="Brand logo">` : initial;
  }
  if (compactName) {
    compactName.textContent = brand.business_name || t('common_untitled_brand');
  }
  const descText = (brand.business_description || t('brand_add_description')).trim();
  brandSummary.innerHTML = `
    <div class="brand-card">
      <div class="brand-summary-name ${nameRtl ? 'rtl' : ''}" ${nameRtl ? 'dir="rtl"' : ''}>
        ${brand.business_name || t('common_untitled_brand')}
      </div>
      <div class="brand-summary-row ${nameRtl ? 'rtl-row' : ''}">
        <div class="brand-summary-logo large">
          ${logo ? `<img src="${logo}" alt="Brand logo">` : initial}
        </div>
        <div class="brand-summary-meta ${industryRtl ? 'rtl' : ''}" ${industryRtl ? 'dir="rtl"' : ''}>
          ${brand.industry || t('common_category_not_set')}
        </div>
      </div>
      <div class="brand-card-body">
        <div class="brand-desc-wrap">
          <div class="brand-desc muted ${descRtl ? 'rtl' : ''}" ${descRtl ? 'dir="rtl"' : ''}>${descText}</div>
        </div>
      </div>
    </div>
  `;
  const editButton = document.getElementById('edit-brand-top');
  if (editButton) {
    editButton.onclick = () => {
      window.location.href = `/ui/onboarding.html?client_id=${brand.id}`;
    };
  }
}

function hideJobDetails() {
  selectedJobId = null;
  if (jobDetails) {
    jobDetails.dataset.jobId = '';
    jobDetails.innerHTML = `<div class="muted">${t('app_select_job')}</div>`;
  }
  closeJobDetailsModal();
}

function isMobileView() {
  return window.matchMedia('(max-width: 960px)').matches;
}

function ensureJobDetailsModal() {
  if (jobDetailsModal) return;
  jobDetailsModal = document.createElement('div');
  jobDetailsModal.className = 'modal hidden job-details-modal';
  jobDetailsModal.id = 'job-details-modal';
  jobDetailsModal.innerHTML = `
    <div class="modal-backdrop" data-close></div>
    <div class="modal-card">
      <button class="modal-close" data-close aria-label="${t('common_close')}">✕</button>
      <div class="job-details-modal-body" id="job-details-modal-body"></div>
    </div>
  `;
  document.body.appendChild(jobDetailsModal);
  jobDetailsModalBody = jobDetailsModal.querySelector('#job-details-modal-body');
  jobDetailsModal.querySelectorAll('[data-close]').forEach((el) => {
    el.addEventListener('click', closeJobDetailsModal);
  });
}

function openJobDetailsModal() {
  if (!jobDetailsCard) return;
  ensureJobDetailsModal();
  if (!jobDetailsModal || !jobDetailsModalBody) return;
  jobDetailsModalBody.appendChild(jobDetailsCard);
  jobDetailsModal.classList.remove('hidden');
  jobDetailsModal.style.display = 'flex';
  document.body.classList.add('modal-open');
}

function closeJobDetailsModal() {
  if (!jobDetailsModal) return;
  jobDetailsModal.classList.add('hidden');
  jobDetailsModal.style.display = 'none';
  document.body.classList.remove('modal-open');
  if (jobDetailsCard && jobDetailsHost && jobDetailsCard.parentElement !== jobDetailsHost) {
    jobDetailsHost.insertBefore(jobDetailsCard, jobDetailsNextSibling);
  }
}

function renderJobs() {
  jobsList.innerHTML = '';
  if (lastCreatedJobId && lastCreatedJobTimer === null) {
    const createdAt = Number(localStorage.getItem(LAST_CREATED_JOB_TIME_KEY) || 0);
    if (createdAt && Date.now() - createdAt > 5 * 60 * 1000) {
      lastCreatedJobId = null;
      localStorage.removeItem(LAST_CREATED_JOB_KEY);
      localStorage.removeItem(LAST_CREATED_JOB_TIME_KEY);
    }
  }
  const filtered = currentJobs.filter((job) => {
    if (jobStatus !== 'all' && job.current_stage !== jobStatus) return false;
    if (!jobSearchTerm) return true;
    const term = jobSearchTerm.toLowerCase();
    const jobType = (job.job_type || '').toLowerCase();
    const message = (job.user_message || '').toLowerCase();
    const adCopyParsed = parseAdCopy(job.ad_copy);
    const adCopyText = adCopyParsed
      ? `${adCopyParsed.headline || ''} ${adCopyParsed.body || ''} ${adCopyParsed.cta || ''}`.toLowerCase()
      : (job.ad_copy || '').toLowerCase();
    return jobType.includes(term) || message.includes(term) || adCopyText.includes(term);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / JOBS_PER_PAGE));
  if (jobPage > totalPages) jobPage = totalPages;
  const start = (jobPage - 1) * JOBS_PER_PAGE;
  const pageItems = filtered.slice(start, start + JOBS_PER_PAGE);

  if (!pageItems.length) {
    jobsList.innerHTML = `<div class="muted">${t('jobs_empty')}</div>`;
    if (jobsPage) jobsPage.textContent = t('common_page_of', { page: jobPage, total: totalPages });
    if (jobsPrev) jobsPrev.disabled = jobPage <= 1;
    if (jobsNext) jobsNext.disabled = jobPage >= totalPages;
    return;
  }
  pageItems.forEach((job) => {
    const item = document.createElement('div');
    item.className = `job-item${selectedJobId === job.id ? ' selected' : ''}`;
    const createdAt = job.created_at ? formatJobDate(job.created_at) : '';
    const sizeValue = job.image_size || 'post';
    const isVideoJobItem = job.job_type === 'video';
    const sizeLabel = isVideoJobItem 
      ? (sizeValue === 'story' || sizeValue === 'reel' ? t('size_reel') : t('size_square'))
      : (sizeValue === 'story' ? t('size_story') : t('size_post'));
    const sizeClass = (sizeValue === 'story' || sizeValue === 'reel') ? 'rect' : 'square';
    const isMultiMode = job.job_type === 'multi_mode';
    const jobTitle = t(`job_${job.job_type}`) || titleCase(job.job_type || '');
    const editPending = job.edit_status === 'pending';
    const requestPending = `${iconSvg('icon-pencil', 'inline-icon')} ${t('job_request_pending')}`;
    const messageText = editPending
      ? requestPending
      : (job.current_stage === 'generate_design' && Number(job.rejection_count || 0) > 0
        ? requestPending
        : (job.job_type === 'multi_mode'
          ? `${t('job_multi_mode')} · ${job.product_images_count || 0} ${t('common_products')}`
          : (job.user_message ? job.user_message.slice(0, 80) : t('job_message_empty'))));
    const designVariations = safeJsonParse(job.design_variations, []);
    const userImages = safeJsonParse(job.user_images, []);
    const approvedIndex = job.approved_design_index || 0;
    const designThumb = designVariations[approvedIndex] || designVariations[0];
    const originalThumb = job.job_type === 'from_image' && Array.isArray(userImages) ? userImages[0] : null;
    const adCopyParsed = parseAdCopy(job.ad_copy);
    const adCopyText = adCopyParsed
      ? `${adCopyParsed.headline} ${adCopyParsed.body} ${adCopyParsed.cta}`.trim()
      : job.ad_copy || '';
    const isVideoJob = job.job_type === 'video';
    const thumbHtml = `
      <div class="job-thumbs">
        ${originalThumb ? `<img class="job-thumb" src="${normalizeUrl(originalThumb)}" alt="Original image">` : ''}
        ${designThumb && !isVideoJob ? `<img class="job-thumb" src="${normalizeUrl(designThumb)}" alt="Design preview">` : ''}
        ${isVideoJob && designThumb ? `<div class="job-thumb video-thumb" title="${t('job_video')}">🎬</div>` : ''}
        ${adCopyText ? `<div class="job-thumb text" title="${adCopyText.replace(/"/g, '&quot;')}">Aa</div>` : ''}
      </div>
    `;
    const isNewJob = lastCreatedJobId && String(job.id) === String(lastCreatedJobId);
    const newBadge = isNewJob
      ? `<span class="new-badge">${t('common_new')}</span>`
      : '';
    item.innerHTML = `
      <div class="job-item-header">
        <div class="job-item-title">
          <strong>${jobTitle}</strong>
          ${newBadge}
          <span class="size-indicator ${sizeClass}${isMultiMode ? ' multi' : ''}" title="${isMultiMode ? t('job_multi_mode') : sizeLabel}"></span>
        </div>
        ${createdAt ? `<div class="muted">${createdAt}</div>` : ''}
      </div>
      <div class="muted">${messageText}</div>
      <div class="job-item-footer">
        <div class="status-pill">${stageIcon(job.current_stage)} ${formatStage(job.current_stage)}</div>
        ${designThumb || adCopyText ? thumbHtml : ''}
      </div>
    `;
    item.addEventListener('click', () => renderJobDetails(job));
    jobsList.appendChild(item);
  });
  if (jobsPage) jobsPage.textContent = `Page ${jobPage} of ${totalPages}`;
  if (jobsPrev) jobsPrev.disabled = jobPage <= 1;
  if (jobsNext) jobsNext.disabled = jobPage >= totalPages;
}

function renderJobDetails(job) {
  if (!job) return;
  selectedJobId = job.id;
  if (lastCreatedJobId && String(job.id) === String(lastCreatedJobId)) {
    lastCreatedJobId = null;
    localStorage.removeItem(LAST_CREATED_JOB_KEY);
    localStorage.removeItem(LAST_CREATED_JOB_TIME_KEY);
    if (lastCreatedJobTimer) {
      clearTimeout(lastCreatedJobTimer);
      lastCreatedJobTimer = null;
    }
  }
  renderJobs();
  jobDetails.dataset.jobId = job.id;
  const isMulti = job.job_type === 'multi_mode';
  const editPending = job.edit_status === 'pending';
  const canProcess = !editPending && ['generate_design', 'generate_ad_copy', 'publishing', 'generate_multi_variants', 'generate_video'].includes(job.current_stage);
  const canCancel = !['completed', 'rejected'].includes(job.current_stage);
  const canReset = job.current_stage === 'rejected';
  const canApproveDesign = job.current_stage === 'await_design_approval';
  const canApproveCopy = job.current_stage === 'await_copy_approval';
  const lockDesignEdits = ['await_copy_approval', 'generate_ad_copy'].includes(job.current_stage);
  const canPublish = job.current_stage === 'await_publish_approval';
  const canUndoDesign = ['await_copy_approval', 'generate_ad_copy'].includes(job.current_stage);
  const canUndoCopy = job.current_stage === 'await_publish_approval';
  const canRetryVideo = job.job_type === 'video' && job.error_message && job.current_stage !== 'generate_video';
  const designVariations = safeJsonParse(job.design_variations, []);
  const approvedIndex = Number.isFinite(Number(job.approved_design_index))
    ? Number(job.approved_design_index)
    : 0;
  const safeDesignIndex = designVariations.length
    ? Math.min(Math.max(approvedIndex, 0), designVariations.length - 1)
    : 0;
  const rawDesignUrl = designVariations[safeDesignIndex];
  const designUrl = normalizeUrl(rawDesignUrl);
  let selectedDesignIndex = safeDesignIndex;
  const previewImageUrl = isMulti && currentMultiPreviewUrl ? normalizeUrl(currentMultiPreviewUrl) : designUrl;
  const adCopyParsed = parseAdCopy(job.ad_copy);
  const adCopyText = adCopyParsed
    ? `${adCopyParsed.headline}\n\n${adCopyParsed.body}\n\n${adCopyParsed.cta}`
    : job.ad_copy;
  const copyEditPending = pendingCopyEdits.has(job.id);
  const copyRtl = isRtlText(adCopyText);
  const copyDirAttr = copyRtl ? 'dir="rtl"' : 'dir="ltr"';
  const copyClass = copyRtl ? 'rtl' : '';
  const brandName = currentBrand?.business_name || 'Brand';
  const brandHandle = brandName.toLowerCase().replace(/\s+/g, '_');
  const isPublished = Boolean(job.facebook_post_id || job.instagram_post_id || job.instagram_permalink);
  const facebookUrl = job.facebook_post_id ? `https://facebook.com/${job.facebook_post_id}` : '';
  const instagramUrl = job.instagram_permalink || '';
  const messageLabel = editPending
    ? `✏️ ${t('job_request_pending')}`
    : (job.current_stage === 'generate_design' && Number(job.rejection_count || 0) > 0
      ? `✏️ ${t('job_request_pending')}`
      : `${t('job_message_label')}: ${job.user_message || t('job_message_empty')}`);
  let initialScope = lockDesignEdits ? 'copy' : 'design';
  if (isMulti) {
    if (['generate_multi_variants'].includes(job.current_stage)) {
      initialScope = 'products';
    }
    if (job.current_stage === 'await_copy_approval') {
      initialScope = 'copy';
    }
  }
  const designTabActive = initialScope === 'design' ? 'active' : '';
  const copyTabActive = initialScope === 'copy' ? 'active' : '';
  const productsTabActive = initialScope === 'products' ? 'active' : '';
  const designPanelActive = initialScope === 'design' ? 'active' : '';
  const copyPanelActive = initialScope === 'copy' ? 'active' : '';
  const productsPanelActive = initialScope === 'products' ? 'active' : '';
  const showDesignActions = initialScope === 'design' ? '' : 'style="display:none;"';
  const showCopyActions = initialScope === 'copy' ? '' : 'style="display:none;"';
  const designThumbsHtml = designVariations.length > 1
    ? `
      <div class="design-thumbs" id="design-thumbs">
        ${designVariations.map((url, index) => `
          <button class="design-thumb ${index === safeDesignIndex ? 'active' : ''}" type="button" data-idx="${index}">
            <img src="${normalizeUrl(url)}" alt="Design version ${index + 1}">
          </button>
        `).join('')}
      </div>
    `
    : '';
  const hasVideoCredits = userPlan.video_credits_remaining > 0;
  const isGeneratingVideo = job.current_stage === 'generate_video';
  const isVideoJobType = job.job_type === 'video';
  const hasVideo = job.reel_video_url || (isVideoJobType && job.design_variations);
  // Video creation only available after publish approval (design+copy both approved)
  const canCreateVideoFromDesign = canPublish && designUrl && !['ugc_video', 'reel', 'video'].includes(job.job_type) && hasVideoCredits && !isGeneratingVideo && !hasVideo;
  
  // Video preview section only shows existing video
  let videoSectionHtml = '';
  if (hasVideo && !isVideoJobType) {
    const videoUrl = normalizeUrl(job.reel_video_url);
    videoSectionHtml = `
      <div class="video-preview-section">
        <div class="video-preview-label">${iconSvg('icon-film', 'action-icon')} ${t('job_video_created')}</div>
        <video class="video-preview" controls playsinline>
          <source src="${videoUrl}" type="video/mp4">
        </video>
        <a href="${videoUrl}" download class="button secondary video-download-btn" target="_blank">
          ${iconSvg('icon-download', 'action-icon')} Download Video
        </a>
      </div>
    `;
  } else if (isGeneratingVideo && !isVideoJobType) {
    videoSectionHtml = `<div class="loading-pill video-loading"><span class="loading-hourglass">⏳</span>${t('stage_generate_video')}...</div>`;
  }
  // For video job type, the design_variations contains video URLs
  const videoJobVideoUrl = isVideoJobType && designVariations.length > 0 ? normalizeUrl(designVariations[0]) : null;
  
  let designPreviewHtml;
  if (job.current_stage === 'generate_design') {
    designPreviewHtml = `<div class="loading-pill"><span class="loading-hourglass">⏳</span>${t('stage_generate_design')}...</div>`;
  } else if (job.current_stage === 'generate_video' || (isVideoJobType && job.current_stage === 'await_user_input' && !videoJobVideoUrl)) {
    designPreviewHtml = `<div class="loading-pill"><span class="loading-hourglass">⏳</span>${t('stage_generate_video')}...</div>`;
  } else if (isVideoJobType && videoJobVideoUrl) {
    // Video job type - show the video preview
    designPreviewHtml = `
      <div class="design-preview-wrap video-preview-wrap">
        <video class="video-preview" controls playsinline id="video-preview">
          <source src="${videoJobVideoUrl}" type="video/mp4">
        </video>
        <a href="${videoJobVideoUrl}" download class="button secondary video-download-btn" target="_blank">
          ${iconSvg('icon-download', 'action-icon')} Download Video
        </a>
      </div>
    `;
  } else if (designUrl) {
    designPreviewHtml = `
      <div class="design-preview-wrap">
        <img src="${designUrl}" alt="Generated design" class="image-preview compact design-preview-animate" id="design-preview">
        ${designThumbsHtml}
        ${videoSectionHtml}
      </div>
    `;
  } else {
    designPreviewHtml = `<div class="muted">${t('job_design_not_ready')}</div>`;
  }
  jobDetails.innerHTML = `
    <div class="job-header">
      <div class="job-stage-row">
        <div class="job-stage">${stageIcon(job.current_stage)} ${formatStage(job.current_stage)}</div>
        ${isPublished ? `<div class="status-pill published">${iconSvg('icon-check', 'action-icon')} ${t('job_tab_published')}</div>` : ''}
      </div>
      <div class="job-meta">
        <div class="job-meta-item">
          <span class="job-meta-label">${t('job_size_label')}</span>
          <span class="size-indicator ${job.image_size === 'story' ? 'rect' : 'square'}" title="${job.image_size === 'story' ? t('size_story') : t('size_post')}"></span>
          ${job.job_type === 'multi_mode' ? `<span class="size-indicator multi" title="${t('job_multi_mode')}"></span>` : ''}
        </div>
        <div class="job-meta-item">
          <span class="job-meta-label">${t('job_images_label')}</span>
          <span class="job-meta-value">${job.product_images_count || 0}</span>
        </div>
      </div>
    </div>
    <div class="muted job-message">${messageLabel}${job.user_message ? `<button class="copy-prompt-btn" data-prompt="${job.user_message.replace(/"/g, '&quot;')}" title="${t('common_copy')}">${iconSvg('icon-copy', 'copy-icon')}</button>` : ''}</div>
    ${job.error_message ? `<div class="alert error">${job.error_message}${canRetryVideo ? ` <button class="button secondary small" id="retry-video">${t('common_try_again')}</button>` : ''}</div>` : ''}
    <div class="tabs">
      <div class="tab-step ${job.design_variations ? 'completed' : ''}">
        <button class="tab-button ${designTabActive}" data-tab="design">${t('job_tab_design')}</button>
        <span class="tab-connector"></span>
      </div>
      ${isMulti ? `
        <div class="tab-step ${job.multi_products_complete ? 'completed' : ''}">
          <button class="tab-button ${productsTabActive}" data-tab="products">${t('job_tab_products')}</button>
          <span class="tab-connector"></span>
        </div>
      ` : ''}
      <div class="tab-step ${job.ad_copy ? 'completed' : ''}">
        <button class="tab-button ${copyTabActive}" data-tab="copy">${t('job_tab_copy')}</button>
        <span class="tab-connector"></span>
      </div>
      <div class="tab-step ${job.facebook_post_id || job.instagram_post_id || job.current_stage === 'completed' ? 'completed' : ''}">
        <button class="tab-button" data-tab="preview">${t('job_tab_preview')}</button>
        <span class="tab-connector"></span>
      </div>
      <div class="tab-step ${isPublished ? 'completed' : ''}">
        <button class="tab-button published-tab" type="button" disabled>
          ${isPublished ? `${iconSvg('icon-check', 'action-icon')} ${t('job_tab_published')}` : t('job_tab_published')}
        </button>
      </div>
    </div>
    ${isPublished ? `
      <div class="tab-links-row">
        ${facebookUrl ? `
          <a class="tab-link" href="${facebookUrl}" target="_blank" rel="noopener" title="Open Facebook post">
            <img class="social-logo" src="/assets/Facebook_Logo_(2019).png" alt="Facebook">
          </a>
        ` : ''}
        ${instagramUrl ? `
          <a class="tab-link" href="${instagramUrl}" target="_blank" rel="noopener" title="Open Instagram post">
            <img class="social-logo" src="/assets/instagram-logo-colored.jpg" alt="Instagram">
          </a>
        ` : ''}
      </div>
    ` : ''}
    <div class="tab-panel ${designPanelActive}" data-panel="design">
      ${designPreviewHtml}
    </div>
    ${isMulti ? `
      <div class="tab-panel ${productsPanelActive}" data-panel="products">
        <div class="multi-products-header">
          <div class="section-title">Generated products</div>
          <button class="button-icon-primary" id="download-multi" title="Download all">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 3v12"></path>
              <path d="M8 11l4 4 4-4"></path>
              <path d="M4 19h16"></path>
            </svg>
          </button>
        </div>
        <div id="multi-products" class="stack"></div>
      </div>
    ` : ''}
    <div class="tab-panel ${copyPanelActive}" data-panel="copy">
      ${copyEditPending
        ? `<div class="loading-pill"><span class="loading-hourglass">⏳</span>${t('stage_updating_copy')}...</div>`
        : (job.current_stage === 'generate_ad_copy'
          ? `<div class="loading-pill"><span class="loading-hourglass">⏳</span>${t('stage_generate_ad_copy')}...</div>`
          : (adCopyText ? `<div class="card ad-copy-card ${copyClass}" style="padding:16px;" id="ad-copy-card"><div class="section-title">${t('job_ad_copy_title')}</div><div class="muted" style="white-space:pre-wrap;" ${copyDirAttr}>${adCopyText}</div></div>` : `<div class="muted">${t('job_ad_copy_not_ready')}</div>`))
      }
    </div>
    <div class="tab-panel" data-panel="preview">
      ${previewImageUrl && adCopyText ? `
        <div class="preview-tabs">
          <button class="tab-button active" data-preview-tab="insta">
            <img class="social-logo" src="/assets/instagram-logo-colored.jpg" alt="">
            <span>Instagram</span>
          </button>
          <button class="tab-button" data-preview-tab="facebook">
            <img class="social-logo" src="/assets/Facebook_Logo_(2019).png" alt="">
            <span>Facebook</span>
          </button>
        </div>
        <div id="preview-panels">
          <div class="preview-item active" data-preview="insta">
            <div class="social-preview">
              <div class="social-header">
                <div class="social-avatar">${currentBrand?.logo_url ? `<img src="${normalizeUrl(currentBrand.logo_url)}" alt="Logo">` : brandName[0]}</div>
                <div>
                  <div class="social-handle">@${brandHandle}</div>
                  <div class="social-meta">Sponsored · Instagram</div>
                </div>
              </div>
              <div class="social-image-container">
                <img class="social-image" src="${previewImageUrl}" alt="Design preview" id="preview-social-image">
                ${isMulti ? `
                  <button class="carousel-nav-btn carousel-prev" type="button" id="multi-preview-prev">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                  </button>
                  <button class="carousel-nav-btn carousel-next" type="button" id="multi-preview-next">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </button>
                  <div class="carousel-counter" id="multi-preview-counter">1 / 1</div>
                ` : ''}
              </div>
              <div class="social-actions">
                ${iconSvg('icon-heart')}
                ${iconSvg('icon-message')}
                ${iconSvg('icon-upload')}
              </div>
              <div class="social-likes">1,274 likes</div>
              <div class="social-caption ${copyClass}" ${copyDirAttr}><strong>@${brandHandle}</strong> ${adCopyText}</div>
            </div>
          </div>
          <div class="preview-item" data-preview="facebook">
            <div class="social-preview facebook">
              <div class="social-header facebook">
                <div class="social-avatar">${currentBrand?.logo_url ? `<img src="${normalizeUrl(currentBrand.logo_url)}" alt="Logo">` : brandName[0]}</div>
                <div>
                  <div class="social-handle">${brandName}</div>
                  <div class="social-meta">Sponsored · Facebook</div>
                </div>
              </div>
              <div class="social-caption ${copyClass}" ${copyDirAttr}>${adCopyText}</div>
              <div class="social-image-container">
                <img class="social-image" src="${previewImageUrl}" alt="Design preview" id="preview-social-image-fb">
                ${isMulti ? `
                  <button class="carousel-nav-btn carousel-prev" type="button" id="multi-preview-prev-fb">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                  </button>
                  <button class="carousel-nav-btn carousel-next" type="button" id="multi-preview-next-fb">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </button>
                  <div class="carousel-counter" id="multi-preview-counter-fb">1 / 1</div>
                ` : ''}
              </div>
              <div class="social-actions facebook">
                <span>${iconSvg('icon-heart', 'inline-icon')} Like</span>
                <span>${iconSvg('icon-message', 'inline-icon')} Comment</span>
                <span>${iconSvg('icon-upload', 'inline-icon')} Share</span>
              </div>
            </div>
          </div>
        </div>
      ` : `<div class="muted">${isMulti ? t('job_preview_wait_multi') : t('job_preview_wait_single')}</div>`}
    </div>
    ${canApproveDesign ? `
      <div class="action-row" data-action-scope="design" ${showDesignActions}>
        <button class="button secondary action-pill" id="approve-design">${iconSvg('icon-check', 'action-icon')} ${isMulti ? t('job_approve_template') : t('job_approve_design')}</button>
        <button class="button secondary action-pill" id="reject-design">${iconSvg('icon-pencil', 'action-icon')} ${t('job_request_changes')}</button>
      </div>
    ` : ''}
    ${canApproveDesign ? `<div class="field feedback-box" id="design-feedback" data-action-scope="design" ${showDesignActions}>
      <label>${t('job_describe_changes')}</label>
      <textarea id="design-feedback-text" class="full-width"></textarea>
      <button class="button secondary" id="submit-feedback">${t('job_send_changes')}</button>
      <div id="design-feedback-status" class="muted"></div>
    </div>` : ''}
    <div id="edit-history-container" data-action-scope="design" ${showDesignActions}></div>
    ${canApproveCopy ? `
      <div class="action-row" data-action-scope="copy" ${showCopyActions}>
        <button class="button secondary action-pill" id="approve-copy">${iconSvg('icon-check', 'action-icon')} ${t('job_approve_copy')}</button>
        <button class="button secondary action-pill" id="reject-copy">${iconSvg('icon-pencil', 'action-icon')} ${t('job_request_changes')}</button>
        <button class="button secondary action-pill undo-button" id="undo-design-approval">${iconSvg('icon-undo', 'action-icon')} ${t('job_edit_design')}</button>
      </div>
    ` : ''}
    ${canApproveCopy ? `
      <div class="field feedback-box" id="copy-feedback" data-action-scope="copy" ${showCopyActions}>
        <label>${t('job_describe_copy_changes')}</label>
        <textarea id="copy-feedback-text" class="full-width"></textarea>
        <label class="checkbox-line">
          <input type="checkbox" id="copy-allow-language-change">
          ${t('job_allow_language_change')}
        </label>
        <button class="button secondary" id="submit-copy-feedback">${t('job_send_changes')}</button>
        <div id="copy-feedback-status" class="muted"></div>
      </div>
    ` : ''}
    ${canPublish ? `
      <div class="publish-section">
        <div class="publish-header">${t('job_schedule')}</div>
        <div class="publish-row">
          <button class="button publish" id="publish-now">${iconSvg('icon-send', 'action-icon')} ${t('job_publish_now')}</button>
          <div class="schedule-group">
            <input id="publish-schedule" type="datetime-local">
            <button class="button secondary" id="schedule-job">${iconSvg('icon-clock', 'action-icon')} ${t('job_schedule')}</button>
          </div>
        </div>
        <div class="publish-actions">
          <button class="button secondary action-pill undo-button" id="undo-copy-approval">${iconSvg('icon-pencil', 'action-icon')} ${t('job_edit_copy')}</button>
          <button class="button secondary action-pill undo-button" id="undo-design-approval-publish">${iconSvg('icon-image', 'action-icon')} ${t('job_edit_design')}</button>
          ${canCreateVideoFromDesign ? `<button class="button secondary action-pill undo-button" id="create-video-btn">${iconSvg('icon-film', 'action-icon')} ${t('job_create_video')}</button>` : ''}
          ${isGeneratingVideo ? `<span class="loading-pill video-loading"><span class="loading-hourglass">⏳</span>${t('stage_generate_video')}...</span>` : ''}
        </div>
      </div>
      <div id="job-status" class="muted">
        ${job.current_stage === 'generate_ad_copy' ? 'Generating ad copy...' : ''}
        ${job.current_stage === 'generate_multi_variants' ? 'Generating product variations...' : ''}
      </div>
    ` : ''}
    ${!canPublish ? `
      <div id="job-status" class="muted">
        ${job.current_stage === 'generate_ad_copy' ? 'Generating ad copy...' : ''}
        ${job.current_stage === 'generate_multi_variants' ? 'Generating product variations...' : ''}
      </div>
    ` : ''}
    ${(canCancel || canReset) ? `
      <div class="job-danger-row">
        <button class="button secondary job-danger-button" id="job-danger" data-action="${canReset ? 'delete' : 'cancel'}">
          <span class="job-danger-icon">${canReset ? iconSvg('icon-trash') : iconSvg('icon-x')}</span>
          <span>${canReset ? t('job_delete') : t('job_cancel')}</span>
        </button>
      </div>
    ` : ''}
  `;
  const staleEditMode = jobDetails.querySelector('#design-edit-mode');
  if (staleEditMode) {
    const wrapper = staleEditMode.closest('.field');
    if (wrapper) {
      wrapper.remove();
    } else {
      staleEditMode.remove();
    }
  }
  if (isMobileView()) {
    openJobDetailsModal();
  }
  if (jobDetailsCard) {
    jobDetailsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  
  // Copy prompt button handler
  const copyPromptBtn = jobDetails.querySelector('.copy-prompt-btn');
  if (copyPromptBtn) {
    copyPromptBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const prompt = copyPromptBtn.getAttribute('data-prompt');
      if (prompt) {
        try {
          await navigator.clipboard.writeText(prompt);
          copyPromptBtn.classList.add('copied');
          setTimeout(() => copyPromptBtn.classList.remove('copied'), 1500);
        } catch (err) {
          console.error('Failed to copy:', err);
        }
      }
    });
  }
  
  let activeDesignUrl = designUrl;
  if (designUrl) {
    const preview = document.getElementById('design-preview');
    if (preview) {
      preview.addEventListener('click', () => {
        modalImage.src = activeDesignUrl;
        imageModal.classList.add('open');
      });
    }
  }
  const thumbButtons = jobDetails.querySelectorAll('.design-thumb');
  if (thumbButtons.length) {
    thumbButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const index = Number(btn.getAttribute('data-idx') || 0);
        const nextUrl = designVariations[index];
        if (!nextUrl) return;
        activeDesignUrl = normalizeUrl(nextUrl);
        selectedDesignIndex = index;
        const preview = document.getElementById('design-preview');
        if (preview) {
          preview.src = activeDesignUrl;
          preview.classList.remove('design-preview-animate');
          void preview.offsetWidth;
          preview.classList.add('design-preview-animate');
        }
        thumbButtons.forEach((thumb) => thumb.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }
  
  // Load and display edit history (may include failed edits)
  const editHistoryContainer = document.getElementById('edit-history-container');
  if (editHistoryContainer && designVariations.length >= 1) {
    loadEditHistory(job.id, editHistoryContainer, designVariations);
  }
  const statusEl = document.getElementById('job-status');
  if (statusEl && !['generate_ad_copy', 'publishing', 'await_publish_approval'].includes(job.current_stage)) {
    statusEl.textContent = '';
    statusEl.className = 'muted';
  }
  const publishLinksEl = document.getElementById('publish-links');
  if (publishLinksEl) {
    publishLinksEl.innerHTML = '';
  }
  const tabButtons = jobDetails.querySelectorAll('[data-tab]');
  const panels = jobDetails.querySelectorAll('[data-panel]');
  const scopedActions = jobDetails.querySelectorAll('[data-action-scope]');
  const setActiveScope = (scope) => {
    let resolvedScope = scope;
    if (lockDesignEdits) {
      resolvedScope = scope === 'copy' ? 'copy' : 'none';
    }
    scopedActions.forEach((el) => {
      el.style.display = el.getAttribute('data-action-scope') === resolvedScope ? '' : 'none';
    });
  };
  setActiveScope(initialScope);
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabButtons.forEach((b) => b.classList.remove('active'));
      panels.forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.getAttribute('data-tab');
      const panel = jobDetails.querySelector(`[data-panel="${target}"]`);
      if (panel) panel.classList.add('active');
      if (target === 'copy') {
        setActiveScope('copy');
      } else if (target === 'products') {
        setActiveScope('products');
      } else if (target === 'design') {
        setActiveScope('design');
      } else {
        setActiveScope(lockDesignEdits ? 'copy' : 'design');
      }
    });
  });

  const previewTabs = jobDetails.querySelectorAll('[data-preview-tab]');
  const previewPanels = jobDetails.querySelectorAll('.preview-item');
  if (previewTabs.length && previewPanels.length) {
    previewTabs.forEach((btn) => {
      btn.addEventListener('click', () => {
        previewTabs.forEach((b) => b.classList.remove('active'));
        previewPanels.forEach((p) => p.classList.remove('active'));
        btn.classList.add('active');
        const target = btn.getAttribute('data-preview-tab');
        const panel = jobDetails.querySelector(`[data-preview="${target}"]`);
        if (panel) panel.classList.add('active');
      });
    });
  }
  if (isMulti) {
    loadMultiProducts(job.id);
    const downloadButton = document.getElementById('download-multi');
    if (downloadButton) {
      downloadButton.addEventListener('click', async () => {
        try {
          const result = await apiRequest(`/web_multi_download.php?job_id=${job.id}`);
          if (result.url) {
            window.open(result.url, '_blank');
          }
        } catch (error) {
          showAlert(createAlert, error.message);
        }
      });
    }
    // Multi-mode preview carousel
    const prevBtn = document.getElementById('multi-preview-prev');
    const nextBtn = document.getElementById('multi-preview-next');
    const prevBtnFb = document.getElementById('multi-preview-prev-fb');
    const nextBtnFb = document.getElementById('multi-preview-next-fb');
    const counter = document.getElementById('multi-preview-counter');
    const counterFb = document.getElementById('multi-preview-counter-fb');
    const socialImageInsta = document.getElementById('preview-social-image');
    const socialImageFb = document.getElementById('preview-social-image-fb');
    let multiPreviewUrls = [];
    let currentPreviewIndex = 0;

    async function loadMultiPreviewUrls() {
      try {
        const data = await apiRequest(`/web_multi_products.php?job_id=${job.id}`);
        const items = data.items || [];
        multiPreviewUrls = items.filter(item => item.status === 'completed' && item.generated_image_url).map(item => normalizeUrl(item.generated_image_url));
        if (multiPreviewUrls.length) {
          if (counter) counter.textContent = `1 / ${multiPreviewUrls.length}`;
          if (counterFb) counterFb.textContent = `1 / ${multiPreviewUrls.length}`;
        }
      } catch (e) {
        // ignore
      }
    }

    function updatePreviewImage() {
      if (!multiPreviewUrls.length) return;
      const url = multiPreviewUrls[currentPreviewIndex];
      if (socialImageInsta) socialImageInsta.src = url;
      if (socialImageFb) socialImageFb.src = url;
      if (counter) counter.textContent = `${currentPreviewIndex + 1} / ${multiPreviewUrls.length}`;
      if (counterFb) counterFb.textContent = `${currentPreviewIndex + 1} / ${multiPreviewUrls.length}`;
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentPreviewIndex > 0) {
          currentPreviewIndex--;
          updatePreviewImage();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (currentPreviewIndex < multiPreviewUrls.length - 1) {
          currentPreviewIndex++;
          updatePreviewImage();
        }
      });
    }

    if (prevBtnFb) {
      prevBtnFb.addEventListener('click', () => {
        if (currentPreviewIndex > 0) {
          currentPreviewIndex--;
          updatePreviewImage();
        }
      });
    }

    if (nextBtnFb) {
      nextBtnFb.addEventListener('click', () => {
        if (currentPreviewIndex < multiPreviewUrls.length - 1) {
          currentPreviewIndex++;
          updatePreviewImage();
        }
      });
    }

    loadMultiPreviewUrls();
  }
  if (canProcess) {
    autoProcessJob(job);
  }
  if (job.current_stage === 'generate_design') {
    pollForDesignUpdate(job.id, designUrl || '', null, null, null);
  }
  if (job.current_stage === 'generate_multi_variants') {
    pollForMultiUpdate(job.id);
  }
  if (job.current_stage === 'generate_video') {
    pollForVideoUpdate(job.id);
  }
  if (canCancel) {
    // handled by delegated click below
  }
  // handled by delegated click below
  if (canApproveDesign) {
    const rejectButton = document.getElementById('reject-design');
    const feedbackBox = document.getElementById('design-feedback');
    const feedbackText = document.getElementById('design-feedback-text');
    const submitFeedback = document.getElementById('submit-feedback');
    const feedbackStatus = document.getElementById('design-feedback-status');
    const previousDesignUrl = designUrl;

    if (rejectButton && feedbackBox && feedbackText) {
      rejectButton.addEventListener('click', () => {
        feedbackBox.classList.add('is-open');
        feedbackBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        feedbackText.focus();
      });
    }

    if (submitFeedback && feedbackText) {
      submitFeedback.addEventListener('click', async (event) => {
      event.preventDefault();
      const text = feedbackText.value.trim();
      if (!text) {
        showAlert(createAlert, 'Please describe the change you want.');
        return;
      }
      try {
        submitFeedback.disabled = true;
        submitFeedback.textContent = 'Sending...';
        feedbackText.disabled = true;
        if (feedbackStatus) feedbackStatus.textContent = 'Sending request...';
        
        // Use different endpoint for video jobs
        const isVideoJob = job.job_type === 'video';
        if (isVideoJob) {
          setJobStatus('Sending changes... Generating updated video...');
          const response = await apiRequest('/tool_edit_video.php', {
            method: 'POST',
            body: JSON.stringify({
              job_id: job.id,
              edit_instructions: text
            })
          });
          if (response.status === 'processing') {
            setJobStatus('Edit received. Generating updated video...');
            if (feedbackStatus) {
              feedbackStatus.innerHTML = `<span class="loading-pill"><span class="loading-hourglass">⏳</span>${t('stage_generate_video')}...</span>`;
            }
            pollForVideoUpdate(job.id, 0, submitFeedback, feedbackText, feedbackStatus);
          }
        } else {
          setJobStatus('Sending changes... Generating updated design...');
          const response = await apiRequest('/web_edit_design.php', {
            method: 'POST',
            body: JSON.stringify({
              job_id: job.id,
              user_edit: text,
              image_url: designUrl
            })
          });
          if (response.status === 'queued') {
            setJobStatus('Edit received. Generating updated design...');
            if (feedbackStatus) {
              feedbackStatus.innerHTML = `<span class="loading-pill"><span class="loading-hourglass">⏳</span>${t('stage_updating_design')}...</span>`;
            }
            pollForDesignUpdate(job.id, previousDesignUrl, submitFeedback, feedbackText, feedbackStatus);
          }
        }
        await loadJobs();
      } catch (error) {
        showAlert(createAlert, error.message);
        setJobStatus(error.message, 'error');
        submitFeedback.disabled = false;
        submitFeedback.textContent = 'Send changes';
        feedbackText.disabled = false;
        if (feedbackStatus) feedbackStatus.textContent = '';
      }
      });
    }
  }
  if (canApproveDesign) {
    const approveButton = document.getElementById('approve-design');
    if (approveButton) {
      approveButton.addEventListener('click', async () => {
      try {
        approveButton.disabled = true;
        approveButton.classList.add('loading');
        approveButton.textContent = isMulti ? 'Approving template' : 'Generating ad copy';
        setJobStatus('Approving design...');
        await apiRequest('/jobs.php', {
          method: 'POST',
          headers: {
            'X-API-Key': 'AQOVOOZlS8PK0suJq9NtmpkUGOiEvm8c'
          },
          body: JSON.stringify({
            action: 'approve_design',
            job_id: job.id,
            approved_index: Number.isFinite(Number(selectedDesignIndex)) ? Number(selectedDesignIndex) : 0
          })
        });
        if (isMulti) {
          approveButton.disabled = false;
          approveButton.classList.remove('loading');
          approveButton.textContent = t('job_approve_template');
          const confirm = window.confirm(
            'Template approved! Generate product variants now?\n\n' +
            `This will generate ${job.product_images_count || 0} product images and cost ${job.product_images_count || 0} image credits.\n\n` +
            'Click OK to generate now, or Cancel to do it later.'
          );
          if (confirm) {
            approveButton.textContent = 'Generating products';
            approveButton.disabled = true;
            approveButton.classList.add('loading');
            setJobStatus('Template approved. Generating products...');
            const productsTab = document.querySelector('[data-tab="multi"]');
            if (productsTab) productsTab.click();
            pollForMultiUpdate(job.id);
          } else {
            setJobStatus('Template approved. Ready to generate products.');
          }
        } else {
          setJobStatus('Design approved. Generating ad copy...');
          pollForCopyUpdate(job.id, job.ad_copy, null, null, null);
        }
        await loadJobs();
      } catch (error) {
        setJobStatus(error.message, 'error');
        approveButton.disabled = false;
        approveButton.classList.remove('loading');
        approveButton.textContent = isMulti ? t('job_approve_template') : t('job_approve_design');
      }
      });
    }
  }
  
  // Create video from image button - shows size selection modal
  const createVideoBtn = document.getElementById('create-video-btn');
  if (createVideoBtn) {
    createVideoBtn.addEventListener('click', () => {
      showVideoSizeModal(job.id, selectedDesignIndex);
    });
  }
  
  if (canApproveCopy) {
    const approveCopyButton = document.getElementById('approve-copy');
    if (approveCopyButton) {
      approveCopyButton.addEventListener('click', async () => {
      try {
        setJobStatus('Approving copy...');
        const result = await apiRequest('/jobs.php', {
          method: 'POST',
          headers: {
            'X-API-Key': 'AQOVOOZlS8PK0suJq9NtmpkUGOiEvm8c'
          },
          body: JSON.stringify({ action: 'approve_copy', job_id: job.id })
        });
        const warning = result.warning ? ` (Note: ${result.warning})` : '';
        setJobStatus(`Copy approved. Waiting for publish approval...${warning}`);
        await loadJobs();
        const previewTab = document.querySelector('[data-tab="preview"]');
        if (previewTab) previewTab.click();
      } catch (error) {
        setJobStatus(error.message, 'error');
      }
      });
    }

    const rejectCopyButton = document.getElementById('reject-copy');
    const copyFeedbackBox = document.getElementById('copy-feedback');
    const copyFeedbackText = document.getElementById('copy-feedback-text');
    const copyAllowLanguageChange = document.getElementById('copy-allow-language-change');
    const submitCopyFeedback = document.getElementById('submit-copy-feedback');
    const copyFeedbackStatus = document.getElementById('copy-feedback-status');

    if (rejectCopyButton && copyFeedbackBox && copyFeedbackText) {
      rejectCopyButton.addEventListener('click', () => {
        copyFeedbackBox.classList.add('is-open');
        copyFeedbackText.focus();
      });
    }

    if (submitCopyFeedback && copyFeedbackText) {
      submitCopyFeedback.addEventListener('click', async (event) => {
      event.preventDefault();
      const text = copyFeedbackText.value.trim();
      if (!text) {
        showAlert(createAlert, 'Please describe the copy changes.');
        return;
      }
      const copyPanel = jobDetails.querySelector('[data-panel="copy"]');
      try {
        submitCopyFeedback.disabled = true;
        submitCopyFeedback.textContent = 'Sending...';
        copyFeedbackText.disabled = true;
        if (copyFeedbackStatus) copyFeedbackStatus.textContent = 'Sending request...';
        const response = await apiRequest('/web_edit_copy.php', {
          method: 'POST',
          body: JSON.stringify({
            job_id: job.id,
            user_edit: text,
            allow_language_change: copyAllowLanguageChange?.checked || false
          })
        });
        if (response.status === 'queued') {
          setJobStatus('Copy edit queued. Generating updated copy...');
          pendingCopyEdits.add(job.id);
          if (copyFeedbackStatus) {
            copyFeedbackStatus.innerHTML = `<span class="loading-pill"><span class="loading-hourglass">⏳</span>${t('stage_updating_copy')}...</span>`;
          }
          if (copyPanel) {
            copyPanel.innerHTML = `<div class="loading-pill"><span class="loading-hourglass">⏳</span>${t('stage_updating_copy')}...</div>`;
          }
          pollForCopyUpdate(job.id, job.ad_copy, submitCopyFeedback, copyFeedbackText, copyFeedbackStatus);
        }
        await loadJobs();
      } catch (error) {
        showAlert(createAlert, error.message);
        setJobStatus(error.message, 'error');
        submitCopyFeedback.disabled = false;
        submitCopyFeedback.textContent = 'Send changes';
        copyFeedbackText.disabled = false;
        if (copyFeedbackStatus) copyFeedbackStatus.textContent = '';
      }
      });
    }
  }
  if (canPublish) {
    const publishNowButton = document.getElementById('publish-now');
    const scheduleButton = document.getElementById('schedule-job');
    const scheduleInput = document.getElementById('publish-schedule');
    
    const runPublish = async (publishType = 'post') => {
      try {
        setJobStatus('Checking Meta connection...', 'notice');
        const meta = await apiRequest(`/web_meta_oauth.php?client_id=${currentBrand.id}`);
        if (!meta.connected) {
          setJobStatus('Meta not connected. Redirecting to connect...', 'notice');
          window.location.href = `/api/web_meta_oauth_complete.php?action=start&client_id=${currentBrand.id}`;
          return;
        }
        const statusMsg = publishType === 'story' 
          ? 'Publishing Story to Facebook & Instagram...' 
          : 'Publishing Post to Facebook & Instagram...';
        setJobStatus(statusMsg, 'notice');
        const publishResult = await apiRequest('/web_publish.php', {
          method: 'POST',
          body: JSON.stringify({ job_id: job.id, publish_type: publishType })
        });
        if (publishResult.status === 'published') {
          setJobStatus('Published successfully.', 'success');
        } else {
          const fbError = publishResult.results?.facebook?.error;
          const igError = publishResult.results?.instagram?.error;
          const message = `Publish completed with issues.${fbError ? ` Facebook: ${fbError}.` : ''}${igError ? ` Instagram: ${igError}.` : ''}`;
          setJobStatus(message, 'error');
        }
        await loadJobs();
        await loadScheduledPosts();
      } catch (error) {
        setJobStatus(error.message, 'error');
      }
    };
    
    if (publishNowButton) {
      publishNowButton.addEventListener('click', async () => {
        const publishType = await showPublishTypeModal(job);
        if (publishType) {
          runPublish(publishType);
        }
      });
    }
    if (scheduleButton) {
      scheduleButton.addEventListener('click', async () => {
        try {
          const scheduledAt = scheduleInput?.value;
          if (!scheduledAt) {
            showAlert(createAlert, 'Pick a date and time to schedule.');
            return;
          }
          // Show publish type modal for scheduling too
          const publishType = await showPublishTypeModal(job);
          if (!publishType) return;
          
          setJobStatus('Scheduling post...', 'notice');
          await apiRequest('/web_schedule.php', {
            method: 'POST',
            body: JSON.stringify({ action: 'schedule', job_id: job.id, scheduled_at: scheduledAt, publish_type: publishType })
          });
          setJobStatus('Scheduled successfully.', 'success');
          await loadScheduledPosts();
        } catch (error) {
          setJobStatus(error.message, 'error');
        }
      });
    }
  }

  jobDetails.onclick = async (event) => {
    event.stopPropagation();
    const target = event.target.closest('#job-danger, #publish-now, #schedule-job, #retry-publish, #undo-design-approval, #undo-design-approval-publish, #undo-copy-approval, #create-video-btn, #retry-video');
    if (!target || !(target instanceof HTMLElement)) return;
    const jobId = Number(jobDetails.dataset.jobId || 0);
    if (!jobId) return;

    if (target.id === 'create-video-btn') {
      showVideoSizeModal(jobId, selectedDesignIndex);
      return;
    }

    if (target.id === 'retry-video') {
      try {
        target.setAttribute('disabled', 'true');
        setJobStatus('Retrying video generation...');
        await apiRequest('/web_jobs.php', {
          method: 'POST',
          body: JSON.stringify({ action: 'retry_video', job_id: jobId })
        });
        pollForVideoUpdate(jobId);
      } catch (error) {
        setJobStatus(error.message, 'error');
        target.removeAttribute('disabled');
      }
      return;
    }

    if (target.id === 'job-danger' && target.dataset.action === 'cancel') {
      const confirmed = window.confirm(t('job_cancel_confirm') || 'Cancel this job?');
      if (!confirmed) {
        return;
      }
      try {
        target.setAttribute('disabled', 'true');
        target.textContent = '…';
        setJobStatus('Cancelling job...');
        await apiRequest('/web_jobs.php', {
          method: 'POST',
          body: JSON.stringify({ action: 'cancel', job_id: jobId })
        });
        currentJobs = currentJobs.map((item) =>
          String(item.id) === String(jobId)
            ? { ...item, current_stage: 'rejected' }
            : item
        );
        setJobStatus('Job cancelled.');
        renderJobs();
        const updated = currentJobs.find((item) => String(item.id) === String(jobId));
        if (updated) renderJobDetails(updated);
      } catch (error) {
        showAlert(createAlert, error.message);
        setJobStatus(error.message, 'error');
        target.removeAttribute('disabled');
        target.innerHTML = `<span class="job-danger-icon">${iconSvg('icon-x')}</span><span>${t('job_cancel')}</span>`;
      }
      return;
    }

    if (target.id === 'job-danger' && target.dataset.action === 'delete') {
      try {
        target.setAttribute('disabled', 'true');
        target.textContent = '…';
        await apiRequest('/web_jobs.php', {
          method: 'POST',
          body: JSON.stringify({ action: 'delete', job_id: jobId })
        });
        currentJobs = currentJobs.filter((item) => String(item.id) !== String(jobId));
        renderJobs();
        hideJobDetails();
      } catch (error) {
        showAlert(createAlert, error.message);
        target.removeAttribute('disabled');
        target.innerHTML = `<span class="job-danger-icon">${iconSvg('icon-trash')}</span><span>${t('job_delete')}</span>`;
      }
      return;
    }

    // Undo design approval - go back to edit design
    if (target.id === 'undo-design-approval' || target.id === 'undo-design-approval-publish') {
      try {
        target.setAttribute('disabled', 'true');
        target.textContent = t('common_loading');
        await apiRequest('/jobs.php', {
          method: 'POST',
          headers: { 'X-API-Key': 'AQOVOOZlS8PK0suJq9NtmpkUGOiEvm8c' },
          body: JSON.stringify({ action: 'undo_design_approval', job_id: jobId })
        });
        setJobStatus(t('job_design_approval_undone'));
        await loadJobs();
      } catch (error) {
        showAlert(createAlert, error.message);
        setJobStatus(error.message, 'error');
        target.removeAttribute('disabled');
        target.innerHTML = `${iconSvg('icon-undo', 'action-icon')} ${t('job_edit_design')}`;
      }
      return;
    }

    // Undo copy approval - go back to edit copy
    if (target.id === 'undo-copy-approval') {
      try {
        target.setAttribute('disabled', 'true');
        target.textContent = t('common_loading');
        await apiRequest('/jobs.php', {
          method: 'POST',
          headers: { 'X-API-Key': 'AQOVOOZlS8PK0suJq9NtmpkUGOiEvm8c' },
          body: JSON.stringify({ action: 'undo_copy_approval', job_id: jobId })
        });
        setJobStatus(t('job_copy_approval_undone'));
        await loadJobs();
      } catch (error) {
        showAlert(createAlert, error.message);
        setJobStatus(error.message, 'error');
        target.removeAttribute('disabled');
        target.innerHTML = `${iconSvg('icon-undo', 'action-icon')} ${t('job_edit_copy')}`;
      }
      return;
    }
  };
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

function titleCase(value) {
  return (value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatJobDate(value) {
  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return '';
  const pad = (num) => String(num).padStart(2, '0');
  return `${date.getDate()}.${date.getMonth() + 1}.${String(date.getFullYear()).slice(-2)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function setJobStatus(message, type = 'muted') {
  const statusEl = document.getElementById('job-status');
  if (!statusEl) return;
  if (type === 'notice') {
    statusEl.className = 'job-status-notice';
  } else if (type === 'success') {
    statusEl.className = 'job-status-notice success';
  } else if (type === 'error') {
    statusEl.className = 'job-status-notice error';
  } else {
    statusEl.className = 'muted';
  }
  statusEl.textContent = message;
}

function renderMultiProducts(container, items) {
  if (!container) return;
  if (!items.length) {
    container.innerHTML = '<div class="muted">No products found.</div>';
    return;
  }
  currentMultiPreviewUrl = items.find((item) => item.generated_image_url)?.generated_image_url || null;
  const rows = items
    .map((item) => {
      const statusLabel = item.status === 'completed' ? 'Complete' : (item.status ? item.status.replace('_', ' ') : 'pending');
      const imageUrl = normalizeUrl(item.generated_image_url || item.product_image_url);
      return `
        <div class="multi-card">
          <div class="multi-card-image">
            ${imageUrl ? `<img src="${imageUrl}" alt="${item.product_name}">` : '<div class="muted">No image</div>'}
          </div>
          <div class="multi-card-body">
            <div class="multi-product-name">${item.product_name}</div>
            <div class="multi-product-price">
              <span class="price-current">${item.price}</span>
              ${item.old_price ? `<span class="price-old">${item.old_price}</span>` : ''}
            </div>
            ${item.notes ? `<div class="multi-product-notes">${item.notes}</div>` : ''}
            <div class="status-pill ${item.status === 'completed' ? 'status-complete' : ''}">${statusLabel}</div>
            ${item.error_message ? `<div class="alert error">${item.error_message}</div>` : ''}
          </div>
        </div>
      `;
    })
    .join('');
  container.innerHTML = `<div class="multi-grid">${rows}</div>`;
}

async function loadMultiProducts(jobId) {
  const container = document.getElementById('multi-products');
  if (!container) return;
  container.innerHTML = '<div class="muted">Loading products...</div>';
  try {
    const data = await apiRequest(`/web_multi_products.php?job_id=${jobId}`);
    renderMultiProducts(container, data.items || []);
    const previewImages = document.querySelectorAll('.social-image');
    if (currentMultiPreviewUrl && previewImages.length) {
      previewImages.forEach((img) => {
        img.src = normalizeUrl(currentMultiPreviewUrl);
      });
    }
  } catch (error) {
    container.innerHTML = `<div class="alert error">${error.message}</div>`;
  }
  const detailsCard = document.getElementById('job-details-card');
  if (detailsCard) {
    requestAnimationFrame(() => {
      const rect = detailsCard.getBoundingClientRect();
      const offset = window.innerHeight * 0.25;
      const targetTop = window.scrollY + rect.top - offset;
      window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
    });
  }
}

async function uploadSingleProductImage(file) {
  const payload = new FormData();
  payload.append('client_id', currentBrand.id);
  payload.append('product_images[]', file);
  const response = await fetch(`${API_BASE}/web_upload_product.php`, {
    method: 'POST',
    credentials: 'include',
    body: payload
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Upload failed');
  }
  const url = data.urls?.[0];
  if (!url) {
    throw new Error('Upload failed');
  }
  return url;
}

async function pollForDesignUpdate(jobId, previousDesignUrl, submitButton, feedbackText, feedbackStatus, attempt = 0) {
  const maxAttempts = 10;
  const waitMs = 6000;
  if (attempt >= maxAttempts) {
    if (feedbackStatus) feedbackStatus.textContent = 'Still processing. Try again in a moment.';
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'Send changes';
    }
    if (feedbackText) feedbackText.disabled = false;
    return;
  }

  try {
    const data = await apiRequest(`/web_jobs.php?client_id=${currentBrand.id}`);
    currentJobs = data.items || [];
    renderJobs();
    const job = currentJobs.find((item) => String(item.id) === String(jobId));
    const variations = safeJsonParse(job?.design_variations, []);
    const latestUrl = variations[variations.length - 1];
    if (latestUrl && latestUrl !== previousDesignUrl) {
      if (feedbackStatus) feedbackStatus.textContent = 'New design ready.';
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Send changes';
      }
      if (feedbackText) feedbackText.disabled = false;
      renderJobDetails(job);
      const preview = document.getElementById('design-preview');
      if (preview) {
        preview.classList.remove('design-preview-animate');
        void preview.offsetWidth;
        preview.classList.add('design-preview-animate');
      }
      return;
    }
  } catch (e) {
    // ignore and retry
  }

  setTimeout(() => {
    pollForDesignUpdate(jobId, previousDesignUrl, submitButton, feedbackText, feedbackStatus, attempt + 1);
  }, waitMs);
}

async function pollForVideoUpdate(jobId, attempt = 0, submitButton = null, feedbackText = null, feedbackStatus = null) {
  const maxAttempts = 30; // 5 minutes with 10 second intervals
  const waitMs = 10000;
  if (attempt >= maxAttempts) {
    if (feedbackStatus) feedbackStatus.textContent = 'Video generation taking longer. Please refresh to check status.';
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'Send changes';
    }
    if (feedbackText) feedbackText.disabled = false;
    return;
  }

  try {
    const data = await apiRequest(`/web_jobs.php?client_id=${currentBrand.id}`);
    currentJobs = data.items || [];
    renderJobs();
    const job = currentJobs.find((item) => String(item.id) === String(jobId));
    
    // Check if video is ready (stage changed from generate_video)
    if (job && job.current_stage !== 'generate_video') {
      if (feedbackStatus) feedbackStatus.textContent = 'Video ready!';
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Send changes';
      }
      if (feedbackText) feedbackText.disabled = false;
      renderJobDetails(job);
      return;
    }
  } catch (e) {
    // ignore and retry
  }

  setTimeout(() => {
    pollForVideoUpdate(jobId, attempt + 1, submitButton, feedbackText, feedbackStatus);
  }, waitMs);
}

async function pollForCopyUpdate(jobId, previousCopy, submitButton, feedbackText, feedbackStatus, attempt = 0) {
  const maxAttempts = 10;
  const waitMs = 6000;
  if (attempt >= maxAttempts) {
    if (feedbackStatus) feedbackStatus.textContent = 'Still processing. Try again in a moment.';
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'Send changes';
    }
    if (feedbackText) feedbackText.disabled = false;
    return;
  }

  try {
    const data = await apiRequest(`/web_jobs.php?client_id=${currentBrand.id}`);
    currentJobs = data.items || [];
    renderJobs();
    const job = currentJobs.find((item) => String(item.id) === String(jobId));
    if (job && job.ad_copy && job.ad_copy !== previousCopy) {
      pendingCopyEdits.delete(jobId);
      if (feedbackStatus) feedbackStatus.textContent = 'Updated copy ready.';
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Send changes';
      }
      if (feedbackText) feedbackText.disabled = false;
      renderJobDetails(job);
      const copyCard = document.getElementById('ad-copy-card');
      if (copyCard) {
        copyCard.classList.remove('ad-copy-card');
        void copyCard.offsetWidth;
        copyCard.classList.add('ad-copy-card');
      }
      return;
    }
  } catch (e) {
    // ignore and retry
  }

  setTimeout(() => {
    pollForCopyUpdate(jobId, previousCopy, submitButton, feedbackText, feedbackStatus, attempt + 1);
  }, waitMs);
}

// Video size selection modal
function showVideoSizeModal(jobId, imageIndex) {
  // Remove existing modal if any
  const existing = document.getElementById('video-size-modal');
  if (existing) existing.remove();
  
  const modal = document.createElement('div');
  modal.id = 'video-size-modal';
  modal.className = 'modal open';
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-card video-size-modal">
      <button class="modal-close" id="video-modal-close">&times;</button>
      <h3 class="modal-title">${t('job_video_size_title')}</h3>
      <div class="modal-disclaimer">
        <p>${t('job_video_disclaimer')}</p>
      </div>
      <div class="video-size-options">
        <button class="video-size-option" data-size="reel">
          <div class="video-size-preview reel">
            ${iconSvg('icon-film', 'video-icon')}
          </div>
          <div class="video-size-info">
            <div class="video-size-name">${t('job_video_size_reel')}</div>
            <div class="video-size-desc">${t('job_video_size_reel_desc')}</div>
          </div>
        </button>
        <button class="video-size-option" data-size="square">
          <div class="video-size-preview square">
            ${iconSvg('icon-film', 'video-icon')}
          </div>
          <div class="video-size-info">
            <div class="video-size-name">${t('job_video_size_square')}</div>
            <div class="video-size-desc">${t('job_video_size_square_desc')}</div>
          </div>
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Close button
  modal.querySelector('#video-modal-close').addEventListener('click', () => {
    modal.remove();
  });
  
  // Click outside to close
  modal.querySelector('.modal-backdrop').addEventListener('click', () => {
    modal.remove();
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  
  // Size selection
  modal.querySelectorAll('.video-size-option').forEach(btn => {
    btn.addEventListener('click', async () => {
      const size = btn.dataset.size;
      modal.remove();
      await startVideoGeneration(jobId, size, imageIndex);
    });
  });
}

async function startVideoGeneration(jobId, videoSize, imageIndex) {
  const createVideoBtn = document.getElementById('create-video-btn');
  
  try {
    if (createVideoBtn) {
      createVideoBtn.disabled = true;
      createVideoBtn.innerHTML = `${iconSvg('icon-film', 'action-icon')} ${t('job_creating_video')}`;
    }
    setJobStatus(t('job_creating_video'));

    const sourceJob = currentJobs.find((item) => String(item.id) === String(jobId));
    const designVariations = sourceJob?.design_variations ? JSON.parse(sourceJob.design_variations) : [];
    const imageUrl = designVariations[imageIndex] || designVariations[0];
    if (!imageUrl) {
      throw new Error('No design image available to create a video.');
    }

    const newJob = await apiRequest('/web_jobs.php', {
      method: 'POST',
      body: JSON.stringify({
        action: 'create',
        client_id: currentBrand?.id,
        job_type: 'video',
        user_message: sourceJob?.user_message || '',
        user_images: [imageUrl],
        image_size: videoSize === 'square' ? 'post' : 'story',
        language: sourceJob?.language || 'en'
      })
    });

    await loadJobs();
    const createdJob = currentJobs.find((item) => String(item.id) === String(newJob.job_id));
    if (createdJob) {
      renderJobDetails(createdJob);
      pollForVideoUpdate(createdJob.id);
    } else {
      setJobStatus('Video job created. Refreshing list...');
    }
  } catch (error) {
    setJobStatus(error.message, 'error');
    if (createVideoBtn) {
      createVideoBtn.disabled = false;
      createVideoBtn.innerHTML = `${iconSvg('icon-film', 'action-icon')} ${t('job_create_video')}`;
    }
  }
}

async function pollForVideoUpdate(jobId, attempt = 0) {
  const maxAttempts = 60; // 5 minutes at 5 second intervals
  const waitMs = 5000;
  
  if (attempt >= maxAttempts) {
    setJobStatus('Video generation taking longer than expected. Check back soon.');
    await loadJobs();
    return;
  }
  
  try {
    const data = await apiRequest(`/web_jobs.php?client_id=${currentBrand?.id || ''}`);
    const job = (data.items || []).find(j => j.id === jobId);
    
    if (job) {
      // Check if video is done (stage changed back from generate_video)
      if (job.current_stage !== 'generate_video') {
        if (job.reel_video_url) {
          setJobStatus(t('job_video_created'));
          showAlert(createAlert, t('job_video_created'), 'success');
        } else if (job.error_message) {
          setJobStatus(job.error_message, 'error');
        }
        await loadJobs();
        const updatedJob = currentJobs.find(j => j.id === jobId);
        if (updatedJob) renderJobDetails(updatedJob);
        return;
      }
      
      // Still generating - update status
      const dots = '.'.repeat((attempt % 3) + 1);
      setJobStatus(`${t('job_video_generating')}${dots}`);
    }
  } catch (e) {
    // ignore and retry
  }
  
  setTimeout(() => {
    pollForVideoUpdate(jobId, attempt + 1);
  }, waitMs);
}

async function pollForMultiUpdate(jobId, attempt = 0) {
  const maxAttempts = 20;
  const waitMs = 6000;
  if (attempt >= maxAttempts) {
    setJobStatus('Still generating products. Refresh in a moment.');
    return;
  }
  try {
    const data = await apiRequest(`/web_multi_products.php?job_id=${jobId}`);
    const items = data.items || [];
    const allDone = items.length && items.every((item) => ['completed', 'failed'].includes(item.status));
    renderMultiProducts(document.getElementById('multi-products'), items);
    if (allDone) {
      await loadJobs();
      const job = currentJobs.find((item) => String(item.id) === String(jobId));
      if (job) renderJobDetails(job);
      return;
    }
  } catch (e) {
    // ignore and retry
  }
  setTimeout(() => {
    pollForMultiUpdate(jobId, attempt + 1);
  }, waitMs);
}

async function autoProcessJob(job) {
  const key = `adly_job_run_${job.id}`;
  const lastRun = Number(localStorage.getItem(key) || 0);
  const now = Date.now();
  if (now - lastRun < 30000) {
    return;
  }
  localStorage.setItem(key, String(now));
  if (job.current_stage === 'publishing') {
    setJobStatus('Publishing to Facebook & Instagram...', 'notice');
  } else if (job.current_stage === 'generate_ad_copy') {
    setJobStatus('Generating ad copy...');
  } else if (job.current_stage === 'generate_video') {
    setJobStatus('Generating video...');
  } else if (job.current_stage === 'generate_multi_variants') {
    setJobStatus('Generating product variations...');
  } else if (job.current_stage === 'generate_design') {
    setJobStatus('Generating design...');
  } else {
    setJobStatus('Running next step...');
  }
  try {
    if (job.current_stage === 'publishing') {
      const publishResult = await apiRequest('/web_publish.php', {
        method: 'POST',
        body: JSON.stringify({ job_id: job.id })
      });
      if (publishResult.status === 'published') {
        setJobStatus('Published successfully.');
      } else {
        const fbError = publishResult.results?.facebook?.error;
        const igError = publishResult.results?.instagram?.error;
        const message = `Publish completed with issues.${fbError ? ` Facebook: ${fbError}.` : ''}${igError ? ` Instagram: ${igError}.` : ''}`;
        setJobStatus(message, 'error');
        renderPublishRetry(job);
      }
    } else {
      const response = await apiRequest('/process_job.php', {
        method: 'POST',
        body: JSON.stringify({ job_id: job.id })
      });
      if (response.status === 'queued') {
        setJobStatus('Processing started. This can take a few minutes...');
      } else {
        setJobStatus('Step completed. Refreshing jobs...');
      }
    }
    await loadJobs();
  } catch (error) {
    setJobStatus(error.message, 'error');
  }
}

async function loadBrands() {
  const data = await apiRequest('/web_brands.php');
  brands = data.items || [];
  if (!brands.length) {
    // No brands yet - show empty state, don't redirect
    currentBrand = null;
    renderBrandOptions();
    renderEmptyBrandState();
    return;
  }

  const storedId = getSelectedBrandId();
  currentBrand = brands.find((brand) => String(brand.id) === String(storedId)) || brands[0];
  saveSelectedBrandId(currentBrand.id);
  renderBrandOptions();
  updateBrandTheme(currentBrand);
  updateHeaderBrand();
  updateNavLinks();
  renderBrandSummary(currentBrand);
  await loadJobs();
}

function renderEmptyBrandState() {
  const jobList = document.getElementById('job-list');
  const brandSummaryCard = document.getElementById('brand-summary-card');
  const brandSummary = document.getElementById('brand-summary');
  const collapseToggle = document.getElementById('brand-collapse-toggle');
  const editBrandTop = document.getElementById('edit-brand-top');
  const compactSummary = document.getElementById('brand-summary-compact');
  const jobsSection = document.querySelector('.jobs-split')?.parentElement;
  const createPanel = document.getElementById('create-panel');
  const createToggle = document.getElementById('create-toggle');

  // Hide buttons that don't make sense without a brand
  if (collapseToggle) collapseToggle.style.display = 'none';
  if (editBrandTop) editBrandTop.style.display = 'none';
  if (compactSummary) compactSummary.style.display = 'none';
  if (createToggle) createToggle.style.display = 'none';
  if (createPanel) createPanel.classList.add('hidden');

  // Show welcome message in brand summary area
  if (brandSummary) {
    brandSummary.innerHTML = `
      <div class="empty-state" style="text-align:center;padding:48px 24px;">
        <div style="font-size:48px;margin-bottom:16px;">🚀</div>
        <h2 style="margin-bottom:8px;">${t('dashboard_no_brand_title') || 'Create your first brand'}</h2>
        <p class="muted" style="margin-bottom:24px;">${t('dashboard_no_brand_desc') || 'Add a brand to start generating content, landing pages, and more.'}</p>
        <a class="button" href="/ui/onboarding.html">${t('common_add_brand') || 'Add Brand'}</a>
      </div>
    `;
  }

  // Hide jobs section completely
  if (jobsSection) jobsSection.style.display = 'none';
  if (jobList) jobList.innerHTML = '';
}

async function loadJobs() {
  if (!currentBrand) return;
  const data = await apiRequest(`/web_jobs.php?client_id=${currentBrand.id}`);
  currentJobs = data.items || [];
  renderJobs();
  if (selectedJobId) {
    const selected = currentJobs.find((job) => String(job.id) === String(selectedJobId));
    if (selected) {
      renderJobDetails(selected);
    } else {
      hideJobDetails();
    }
  }
}

async function loadScheduledPosts() {
  if (!currentBrand) return;
  try {
    await apiRequest(`/web_posts.php?client_id=${currentBrand.id}`);
  } catch (error) {
    // No scheduled posts UI on this page; ignore background errors.
  }
}


document.addEventListener('change', async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement)) return;
  if (target.id !== 'brand-select') return;

  const selectedId = target.value;
  const nextBrand = brands.find((brand) => String(brand.id) === String(selectedId));
  if (!nextBrand) return;

  currentBrand = nextBrand;
  saveSelectedBrandId(currentBrand.id);
  updateBrandTheme(currentBrand);
  updateHeaderBrand();
  updateNavLinks();
  renderBrandSummary(currentBrand);
  hideJobDetails();
  await loadJobs();
});

if (jobTypeSelect) {
  setMultiMode(jobTypeSelect.value === 'multi_mode');
  setTipsMode(jobTypeSelect.value === 'tips_carousel');
  setFromImageMode(jobTypeSelect.value === 'from_image' || jobTypeSelect.value === 'before_after' || jobTypeSelect.value === 'video', jobTypeSelect.value === 'before_after', jobTypeSelect.value === 'video');
  setVideoMode(jobTypeSelect.value === 'video');
  setUgcMode(jobTypeSelect.value === 'ugc_video');
  syncUgcAutoUI();
  jobTypeSelect.addEventListener('change', () => {
    setMultiMode(jobTypeSelect.value === 'multi_mode');
    setTipsMode(jobTypeSelect.value === 'tips_carousel');
    setFromImageMode(jobTypeSelect.value === 'from_image' || jobTypeSelect.value === 'before_after' || jobTypeSelect.value === 'video', jobTypeSelect.value === 'before_after', jobTypeSelect.value === 'video');
    setVideoMode(jobTypeSelect.value === 'video');
    setUgcMode(jobTypeSelect.value === 'ugc_video');
    syncUgcAutoUI();
  });
}

if (ugcAutoCheckbox) {
  ugcAutoCheckbox.addEventListener('change', () => {
    syncUgcAutoUI();
  });
}

if (navToggle) {
  navToggle.addEventListener('click', openSidebar);
}

if (sidebarClose) {
  sidebarClose.addEventListener('click', closeSidebar);
}

if (sidebarOverlay) {
  sidebarOverlay.addEventListener('click', closeSidebar);
}

if (createToggle && createPanel) {
  createToggle.addEventListener('click', () => {
    createPanel.classList.toggle('hidden');
    if (!createPanel.classList.contains('hidden')) {
      const headerOffset = 120;
      const y = createPanel.getBoundingClientRect().top + window.scrollY - headerOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  });
}

placeBrandSwitcher();
window.addEventListener('resize', placeBrandSwitcher);

if (addMultiButton) {
  addMultiButton.addEventListener('click', () => {
    if (!multiList) return;
    const currentRows = multiList.querySelectorAll('.multi-product-row').length;
    if (currentRows >= 10) {
      alert('Maximum 10 products allowed per multi-mode job.');
      return;
    }
    multiList.appendChild(createMultiRow());
  });
}

if (jobSearchInput) {
  jobSearchInput.addEventListener('input', () => {
    jobSearchTerm = jobSearchInput.value.trim();
    jobPage = 1;
    renderJobs();
  });
}

if (jobStatusFilter) {
  jobStatusFilter.addEventListener('change', () => {
    jobStatus = jobStatusFilter.value;
    jobPage = 1;
    renderJobs();
  });
}

if (jobsPrev) {
  jobsPrev.addEventListener('click', () => {
    if (jobPage > 1) {
      jobPage -= 1;
      renderJobs();
    }
  });
}

if (jobsNext) {
  jobsNext.addEventListener('click', () => {
    jobPage += 1;
    renderJobs();
  });
}

if (brandCollapseToggle && brandSummaryCard) {
  brandCollapseToggle.addEventListener('click', () => {
    brandSummaryCard.classList.toggle('brand-collapsed');
    brandCollapseToggle.textContent = brandSummaryCard.classList.contains('brand-collapsed') ? '▾' : '▴';
    const compact = document.getElementById('brand-summary-compact');
    if (compact) {
      compact.style.display = brandSummaryCard.classList.contains('brand-collapsed') ? 'flex' : 'none';
    }
  });
}

if (createForm) {
  createForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearAlert(createAlert);

  if (!currentBrand) {
    showAlert(createAlert, 'Select a brand first.');
    return;
  }

  if (!hasActivePlan()) {
    showAlert(createAlert, 'Your trial ended or you have no active plan. Choose a plan to create.');
    window.location.href = '/ui/pricing.html';
    return;
  }

  const jobType = createForm.job_type.value;
  if (!hasCreditsForJobType(jobType)) {
    showAlert(createAlert, 'Not enough credits for this job type.');
    return;
  }
  const userMessage = createForm.user_message.value.trim();
  const imageSize = createForm.image_size?.value || 'post';
  const languageValue = (createForm.querySelector('input[name="language"]:checked')?.value || 'en');
  const ugcLanguageValue = ugcLanguageSelect?.value || '';
  const ugcAccentValue = ugcAccentSelect?.value || '';
  const ugcAuto = !!ugcAutoCheckbox?.checked;
  let productImageUrls = [];
  let userImageUrls = [];
  let multiProducts = [];

  if (jobType === 'multi_mode') {
    const rows = multiList ? Array.from(multiList.querySelectorAll('.multi-product-row')) : [];
    if (!rows.length) {
      showAlert(createAlert, 'Add at least one product.');
      return;
    }
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const fileInput = row.querySelector('.multi-image');
      const name = row.querySelector('.multi-name')?.value.trim();
      const price = row.querySelector('.multi-price')?.value.trim();
      const oldPrice = row.querySelector('.multi-old-price')?.value.trim();
      const notes = row.querySelector('.multi-notes')?.value.trim();
      const file = fileInput?.files?.[0];
      if (!file || !name || !price) {
        showAlert(createAlert, 'Each product needs an image, name, and price.');
        return;
      }
      try {
        const imageUrl = await uploadSingleProductImage(file);
        multiProducts.push({
          image_url: imageUrl,
          name,
          price,
          old_price: oldPrice || '',
          notes: notes || '',
          sort_order: i
        });
        productImageUrls.push(imageUrl);
      } catch (error) {
        showAlert(createAlert, error.message);
        return;
      }
    }
  } else if (jobType === 'from_image' || jobType === 'before_after' || jobType === 'video') {
    const files = baseImageInput?.files ? Array.from(baseImageInput.files) : [];
    const expectedCount = jobType === 'before_after' ? 2 : 1;
    if (files.length !== expectedCount) {
      showAlert(createAlert, jobType === 'before_after'
        ? 'Upload exactly two images (before + after).'
        : (jobType === 'video' ? t('video_upload_hint') : 'Upload a base creative image.'));
      return;
    }
    try {
      for (const file of files) {
        const imageUrl = await uploadSingleProductImage(file);
        userImageUrls.push(imageUrl);
      }
    } catch (error) {
      showAlert(createAlert, error.message);
      return;
    }
  } else {
  const files = document.getElementById('product_images').files;
  if (files.length) {
    const payload = new FormData();
    payload.append('client_id', currentBrand.id);
    Array.from(files).forEach((file) => payload.append('product_images[]', file));

    const response = await fetch(`${API_BASE}/web_upload_product.php`, {
      method: 'POST',
      credentials: 'include',
      body: payload
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      showAlert(createAlert, data.error || 'Upload failed');
      return;
    }
    productImageUrls = data.urls || [];
    }
  }

  if (jobType === 'ugc_video') {
    if (!ugcLanguageValue || !ugcAccentValue) {
      showAlert(createAlert, t('ugc_language_required'));
      return;
    }
    if (!ugcAuto && !userMessage) {
      showAlert(createAlert, t('ugc_prompt_required'));
      return;
    }
  }

  // Get tips data if tips_carousel mode
  let tipsContentValue = '';
  let tipsCountValue = 5;
  if (jobType === 'tips_carousel') {
    tipsContentValue = tipsContent?.value?.trim() || '';
    tipsCountValue = parseInt(tipsCount?.value || '5', 10) || 5;
    if (!tipsContentValue) {
      showAlert(createAlert, 'Please enter your tips or a prompt for AI to generate them.');
      return;
    }
  }

  const payload = {
    action: 'create',
    client_id: currentBrand.id,
    job_type: jobType,
    user_message: userMessage,
    user_images: userImageUrls,
    product_images: productImageUrls,
    image_size: (jobType === 'multi_mode' || jobType === 'tips_carousel') ? 'post' : imageSize,
    language: jobType === 'multi_mode' ? null : languageValue,
    ugc_language: jobType === 'ugc_video' ? ugcLanguageValue : null,
    ugc_accent: jobType === 'ugc_video' ? ugcAccentValue : null,
    ugc_auto: jobType === 'ugc_video' ? ugcAuto : null,
    multi_products: multiProducts,
    tips_content: tipsContentValue,
    tips_count: tipsCountValue
  };

  try {
    const created = await apiRequest('/web_jobs.php', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    lastCreatedJobId = created?.job_id || null;
    if (lastCreatedJobTimer) {
      clearTimeout(lastCreatedJobTimer);
    }
    if (lastCreatedJobId) {
      localStorage.setItem(LAST_CREATED_JOB_KEY, String(lastCreatedJobId));
      localStorage.setItem(LAST_CREATED_JOB_TIME_KEY, String(Date.now()));
      lastCreatedJobTimer = setTimeout(() => {
        lastCreatedJobId = null;
        localStorage.removeItem(LAST_CREATED_JOB_KEY);
        localStorage.removeItem(LAST_CREATED_JOB_TIME_KEY);
        lastCreatedJobTimer = null;
        renderJobs();
      }, 5 * 60 * 1000);
    }
    createForm.reset();
    if (createPanel) {
      createPanel.classList.add('hidden');
    }
    if (multiList) {
      multiList.innerHTML = '';
    }
    if (tipsContent) tipsContent.value = '';
    if (tipsCount) tipsCount.value = '5';
    jobPage = 1;
    setMultiMode(jobTypeSelect.value === 'multi_mode');
    setTipsMode(jobTypeSelect.value === 'tips_carousel');
    setFromImageMode(jobTypeSelect.value === 'from_image' || jobTypeSelect.value === 'before_after' || jobTypeSelect.value === 'video', jobTypeSelect.value === 'before_after', jobTypeSelect.value === 'video');
    setVideoMode(jobTypeSelect.value === 'video');
    setUgcMode(jobTypeSelect.value === 'ugc_video');
    await loadJobs();
  } catch (error) {
    showAlert(createAlert, error.message);
  }
  });
}

if (logoutButton) {
  logoutButton.addEventListener('click', async () => {
    try {
      await apiRequest('/web_auth.php', {
        method: 'POST',
        body: JSON.stringify({ action: 'logout' })
      });
    } catch (error) {
      // ignore
    }
    window.location.href = './login.html';
  });
}

const storedLastCreatedJobId = localStorage.getItem(LAST_CREATED_JOB_KEY);
const storedLastCreatedJobAt = Number(localStorage.getItem(LAST_CREATED_JOB_TIME_KEY) || 0);
if (storedLastCreatedJobId && storedLastCreatedJobAt && Date.now() - storedLastCreatedJobAt <= 5 * 60 * 1000) {
  lastCreatedJobId = storedLastCreatedJobId;
} else {
  localStorage.removeItem(LAST_CREATED_JOB_KEY);
  localStorage.removeItem(LAST_CREATED_JOB_TIME_KEY);
}

ensureAuth().then(loadBrands);

if (imageModal) {
  imageModal.addEventListener('click', () => {
    imageModal.classList.remove('open');
  });
  if (imageModalClose) {
    imageModalClose.addEventListener('click', (event) => {
      event.stopPropagation();
      imageModal.classList.remove('open');
    });
  }
  const imageModalCard = imageModal.querySelector('.modal-card');
  if (imageModalCard) {
    imageModalCard.addEventListener('click', (event) => {
      event.stopPropagation();
    });
  }
}
