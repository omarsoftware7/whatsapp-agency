const brandHeader = document.getElementById('brand-header');
const leadsList = document.getElementById('leads-list');
const exportButton = document.getElementById('export-leads');
const importOpen = document.getElementById('import-leads');
const importModal = document.getElementById('leads-import-modal');
const importFile = document.getElementById('leads-import-file');
const importButton = document.getElementById('leads-import-submit');
const importAlert = document.getElementById('leads-import-alert');

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

function renderLeads(items) {
  if (!items.length) {
    leadsList.innerHTML = `<div class="muted">${t('leads_no_leads')}</div>`;
    return;
  }
  const rows = items.map((lead) => {
    const link = lead.public_slug
      ? `${window.location.origin}/landing.php?slug=${encodeURIComponent(lead.public_slug)}`
      : '';
    const email = lead.email || '-';
    const phone = lead.phone || '-';
    const sourceLabel = lead.source_type === 'manual'
      ? (lead.source_label || t('leads_source_manual'))
      : (lead.landing_title || t('lp_title_fallback'));
    return `
      <div class="leads-row">
        <div class="leads-cell">
          <div class="lead-name">${lead.name || '-'}</div>
          <div class="leads-inline">
            <span class="muted">${email}</span>
      ${email !== '-' ? `<button class="copy-icon small" data-copy="${encodeURIComponent(email)}" title="Copy email">${iconSvg('icon-copy')}</button>` : ''}
          </div>
        </div>
        <div class="leads-cell">
          <div class="leads-inline">
            <span>${phone}</span>
      ${phone !== '-' ? `<button class="copy-icon small" data-copy="${encodeURIComponent(phone)}" title="Copy phone">${iconSvg('icon-copy')}</button>` : ''}
          </div>
        </div>
        <div class="leads-cell">
          ${link ? `
            <a href="${link}" class="lead-link" target="_blank" rel="noopener">
              <span>${sourceLabel}</span>
              <span class="link-icon" aria-hidden="true">↗</span>
            </a>
          ` : `<span class="muted">${sourceLabel}</span>`}
        </div>
        <div class="leads-cell">${formatDate(lead.created_at)}</div>
      </div>
    `;
  }).join('');

  leadsList.innerHTML = `
    <div class="leads-header">
      <div>${t('leads_name_email')}</div>
      <div>${t('leads_phone')}</div>
      <div>${t('leads_source')}</div>
      <div>${t('leads_date')}</div>
    </div>
    ${rows}
  `;
}

async function loadLeads() {
  const clientId = getClientId();
  if (!clientId) {
    leadsList.innerHTML = `<div class="muted">${t('common_client_missing')}</div>`;
    return;
  }
  const data = await apiRequest(`/web_landing_page_leads.php?client_id=${clientId}`);
  renderLeads(data.items || []);
}

async function importLeads() {
  const clientId = getClientId();
  if (!clientId) {
    showAlert(importAlert, t('common_client_missing'));
    return;
  }
  if (!importFile?.files?.length) {
    showAlert(importAlert, t('leads_import_required'));
    return;
  }
  importButton.disabled = true;
  importButton.textContent = t('leads_importing');
  try {
    const payload = new FormData();
    payload.append('client_id', clientId);
    payload.append('file', importFile.files[0]);
    const response = await fetch(`${API_BASE}/web_leads_import.php`, {
      method: 'POST',
      credentials: 'include',
      body: payload
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || t('common_request_failed'));
    }
    showAlert(importAlert, t('leads_import_success', { count: data.count || 0 }), 'success');
    importFile.value = '';
    await loadLeads();
  } catch (error) {
    showAlert(importAlert, error.message || t('common_request_failed'));
  } finally {
    importButton.disabled = false;
    importButton.textContent = t('leads_import_button');
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

loadBrand();
loadLeads();

document.addEventListener('click', async (event) => {
  const button = event.target.closest('.copy-icon');
  if (!button) return;
  const encoded = button.getAttribute('data-copy') || '';
  const text = decodeURIComponent(encoded);
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = '✅';
    setTimeout(() => {
    button.innerHTML = iconSvg('icon-copy');
    }, 1200);
  } catch (error) {
    showAlert(null, t('common_copy_failed'));
  }
});

if (exportButton) {
  exportButton.addEventListener('click', () => {
    const clientId = getClientId();
    if (!clientId) {
      showAlert(null, t('common_client_missing'));
      return;
    }
    window.location.href = `/api/web_landing_page_leads_export.php?client_id=${clientId}`;
  });
}

if (importButton) {
  importButton.addEventListener('click', importLeads);
}

if (importOpen && importModal) {
  importOpen.addEventListener('click', () => {
    importModal.classList.remove('hidden');
    importModal.classList.add('open');
  });
  importModal.querySelectorAll('[data-import-close]').forEach((el) => {
    el.addEventListener('click', () => {
      importModal.classList.add('hidden');
      importModal.classList.remove('open');
    });
  });
}
