const brandHeader = document.getElementById('brand-header');
const createForm = document.getElementById('landing-create-form');
const createAlert = document.getElementById('create-alert');
const landingPrompt = document.getElementById('landing-prompt');
const landingPagesList = document.getElementById('landing-pages-list');
let landingPollTimer = null;
let lastLandingPages = [];
const landingImagesInput = document.getElementById('landing-images');
const landingImagesPreview = document.getElementById('landing-images-preview');
const landingImagesBox = document.querySelector('label[for="landing-images"]');

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

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function renderLandingPages(items, clientId) {
  lastLandingPages = items;
  landingPagesList.innerHTML = '';
  if (!items.length) {
    landingPagesList.innerHTML = `<div class="muted">${t('lp_no_pages')}</div>`;
    return;
  }
  items.forEach((page) => {
    const card = document.createElement('div');
    card.className = 'landing-card';
    const link = `${window.location.origin}/landing.php?slug=${encodeURIComponent(page.public_slug)}`;
    const statusLabel = page.status || 'published';
    const statusText = statusLabel.replace(/_/g, ' ');
    const statusTextFinal = statusText.toLowerCase() === 'published'
      ? 'Published'
      : statusText;
    const canOpen = statusLabel === 'published' && page.public_slug;
    const canEdit = statusLabel === 'published' || statusLabel === 'failed';
    card.innerHTML = `
      <div class="landing-card-header">
        <div>
          <div class="landing-title">${page.title || t('lp_title_fallback')}</div>
          <div class="muted">${t('common_updated')} ${formatDate(page.updated_at || page.created_at)}</div>
        </div>
        <div class="status-pill ${statusLabel}">${statusTextFinal}</div>
      </div>
      ${page.error_message ? `<div class="alert error">${page.error_message}</div>` : ''}
      <div class="landing-actions">
        ${canOpen ? `<a class="button secondary" href="${link}" target="_blank" rel="noopener"><span class="action-icon">↗</span><span>${t('common_open')}</span></a>` : `<span class="muted">${t('common_generating')}</span>`}
        ${canOpen ? `<button class="button secondary copy-link" data-link="${encodeURIComponent(link)}">${iconSvg('icon-copy', 'action-icon')}<span>Copy URL</span></button>` : ''}
        ${canEdit ? `<button class="button secondary" data-action="edit">${iconSvg('icon-pencil', 'action-icon')}<span>${t('common_edit')}</span></button>` : ''}
      </div>
      <div class="landing-danger-row">
        <button class="button secondary landing-danger-button" data-action="delete">${iconSvg('icon-trash', 'action-icon')}<span>Delete</span></button>
      </div>
      <div class="landing-edit" style="display:none;">
        <div class="field">
          <label>${t('lp_edit_label')}</label>
          <textarea class="landing-edit-input" placeholder="${t('lp_edit_placeholder')}"></textarea>
        </div>
        <button class="button" data-action="submit-edit">${t('common_send_changes')}</button>
      </div>
    `;
    const editToggle = card.querySelector('[data-action="edit"]');
    const deleteBtn = card.querySelector('[data-action="delete"]');
    const editSection = card.querySelector('.landing-edit');
    const submitEdit = card.querySelector('[data-action="submit-edit"]');
    const editInput = card.querySelector('.landing-edit-input');
    const copyBtn = card.querySelector('.copy-link');

    if (editToggle && editSection) {
      editToggle.addEventListener('click', () => {
        editSection.style.display = editSection.style.display === 'none' ? 'block' : 'none';
      });
    }
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const url = decodeURIComponent(copyBtn.dataset.link || '');
        navigator.clipboard.writeText(url).then(() => {
          showAlert(null, t('common_link_copied'), 'success');
        }).catch(() => {
          showAlert(null, t('common_copy_failed'));
        });
      });
    }
    if (submitEdit) {
      submitEdit.addEventListener('click', async () => {
      const prompt = (editInput.value || '').trim();
      if (!prompt) {
        showAlert(createAlert, t('lp_edit_prompt_required'));
        return;
      }
      submitEdit.disabled = true;
      submitEdit.textContent = t('common_updating');
      try {
        await apiRequest('/web_landing_pages.php', {
          method: 'POST',
          body: JSON.stringify({
            action: 'edit',
            client_id: Number(clientId),
            landing_page_id: Number(page.id),
            user_prompt: prompt
          })
        });
        editInput.value = '';
        editSection.style.display = 'none';
        await loadLandingPages();
        showAlert(null, t('lp_updated'), 'success');
      } catch (err) {
        showAlert(createAlert, err.message || t('common_request_failed'));
      } finally {
        submitEdit.disabled = false;
        submitEdit.textContent = t('common_send_changes');
      }
      });
    }
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        if (!confirm('Delete this landing page?')) return;
        try {
          deleteBtn.disabled = true;
          deleteBtn.textContent = 'Deleting...';
          await apiRequest('/web_landing_pages.php', {
            method: 'POST',
            body: JSON.stringify({
              action: 'delete',
              client_id: Number(clientId),
              landing_page_id: Number(page.id)
            })
          });
          await loadLandingPages();
        } catch (err) {
          showAlert(createAlert, err.message || t('common_request_failed'));
        } finally {
          deleteBtn.disabled = false;
          deleteBtn.textContent = 'Delete';
        }
      });
    }
    landingPagesList.appendChild(card);
  });
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

async function loadLandingPages() {
  const clientId = getClientId();
  if (!clientId) {
    landingPagesList.innerHTML = `<div class="muted">${t('common_client_missing')}</div>`;
    return;
  }
  const pages = await apiRequest(`/web_landing_pages.php?client_id=${clientId}`);
  renderLandingPages(pages.items || [], clientId);
  if (landingPollTimer) {
    clearTimeout(landingPollTimer);
    landingPollTimer = null;
  }
  if ((pages.items || []).some((page) => page.status === 'generating')) {
    landingPollTimer = setTimeout(loadLandingPages, 4000);
  }
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

createForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const clientId = getClientId();
  const prompt = (landingPrompt.value || '').trim();
  if (!clientId) {
    showAlert(createAlert, t('common_client_missing'));
    return;
  }
  if (!prompt) {
    showAlert(createAlert, t('lp_prompt_required'));
    return;
  }
  const submitBtn = createForm.querySelector('button[type="submit"]');
  const files = landingImagesInput?.files ? Array.from(landingImagesInput.files) : [];
  if (files.length > 2) {
    showAlert(createAlert, t('lp_max_images'));
    return;
  }
  submitBtn.disabled = true;
  submitBtn.textContent = t('common_generating');
  try {
    const tempItem = {
      title: files.length ? t('common_uploading') : t('lp_generating_title'),
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      updated_at: null,
      status: files.length ? 'uploading' : 'generating',
      public_slug: ''
    };
    renderLandingPages([tempItem, ...lastLandingPages], clientId);
    let imageUrls = [];
    if (files.length) {
      const payload = new FormData();
      payload.append('client_id', clientId);
      files.forEach((file) => payload.append('product_images[]', file));
      const response = await fetch(`${API_BASE}/web_upload_product.php`, {
        method: 'POST',
        credentials: 'include',
        body: payload
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = data.error || t('common_upload_failed');
        tempItem.status = 'failed';
        tempItem.error_message = message;
        renderLandingPages([tempItem, ...lastLandingPages], clientId);
        throw new Error(message);
      }
      imageUrls = data.urls || [];
    }
    if (files.length) {
      tempItem.status = 'generating';
      tempItem.title = t('lp_generating_title');
      renderLandingPages([tempItem, ...lastLandingPages], clientId);
    }
    await apiRequest('/web_landing_pages.php', {
      method: 'POST',
      body: JSON.stringify({
        action: 'create',
        client_id: Number(clientId),
        user_prompt: prompt,
        user_images: imageUrls
      })
    });
    landingPrompt.value = '';
    if (landingImagesInput) landingImagesInput.value = '';
    renderUploadPreview([], landingImagesPreview, landingImagesBox);
    await loadLandingPages();
    showAlert(null, t('lp_queued'), 'success');
  } catch (err) {
    showAlert(createAlert, err.message || t('common_request_failed'));
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = t('lp_generate_button');
  }
});

loadBrand();
loadLandingPages();

if (landingImagesInput) {
  landingImagesInput.addEventListener('change', () => {
    renderUploadPreview(landingImagesInput.files, landingImagesPreview, landingImagesBox);
  });
}
