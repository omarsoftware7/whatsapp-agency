(async () => {
const adminUser = await ensureAdmin();
if (!adminUser) return;

setDefaultTheme();

const table = document.getElementById('brands-table');
const alertBox = document.getElementById('alert');
const searchInput = document.getElementById('brand-search');
const prevBtn = document.getElementById('brands-prev');
const nextBtn = document.getElementById('brands-next');
const pageLabel = document.getElementById('brands-page');

let allBrands = [];
let brandPage = 1;
const BRANDS_PER_PAGE = 10;

function normalizeUrl(url) {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    const origin = window.location.origin;
    return url.replace(/^https?:\/\/(getadly\.com|127\.0\.0\.1:\d+|localhost:\d+)/i, origin);
  }
  return url;
}

function renderBrands() {
  table.innerHTML = '';
  const term = (searchInput.value || '').toLowerCase();
  let items = allBrands.filter((brand) => {
    const name = (brand.business_name || '').toLowerCase();
    const owners = (brand.owner_emails || '').toLowerCase();
    return name.includes(term) || owners.includes(term);
  });
  const totalPages = Math.max(1, Math.ceil(items.length / BRANDS_PER_PAGE));
  if (brandPage > totalPages) brandPage = totalPages;
  const start = (brandPage - 1) * BRANDS_PER_PAGE;
  items = items.slice(start, start + BRANDS_PER_PAGE);
  if (!items.length) {
    table.innerHTML = `<div class="muted">${t('admin_no_brands')}</div>`;
    if (pageLabel) pageLabel.textContent = t('common_page_of', { page: brandPage, total: totalPages });
    if (prevBtn) prevBtn.disabled = brandPage <= 1;
    if (nextBtn) nextBtn.disabled = brandPage >= totalPages;
    return;
  }
  items.forEach((brand) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'job-item';
    const logo = brand.logo_filename ? normalizeUrl(`/uploads/logos/${brand.logo_filename}`) : '';
    const owners = brand.owner_emails || '—';
    wrapper.innerHTML = `
      <div class="row admin-user-row">
        <div class="brand-summary-logo small">
          ${logo ? `<img src="${logo}" alt="Brand logo">` : (brand.business_name || 'B').slice(0, 1).toUpperCase()}
        </div>
        <div>
          <strong>${brand.business_name || t('common_untitled_brand')}</strong>
          <div class="muted">${brand.industry || t('common_category_not_set')}</div>
        </div>
        <div class="muted">${t('admin_owners')}: ${owners}</div>
        <div class="muted">${t('admin_onboarding')}: ${brand.onboarding_complete ? t('admin_onboarding_complete') : t('admin_onboarding_pending')}</div>
        <button class="button secondary" data-toggle>${t('admin_actions')}</button>
      </div>
      <div class="stack admin-details collapsed">
        <div class="brand-actions" style="margin-top:10px;">
          <a class="button secondary" href="/ui/onboarding.html?client_id=${brand.id}">${t('admin_edit_brand')}</a>
          <a class="button secondary" href="/ui/brand-library.html?client_id=${brand.id}">${t('library_title')}</a>
          <a class="button secondary" href="/ui/brand-posts.html?client_id=${brand.id}">${t('posts_title')}</a>
          <a class="button secondary" href="/ui/landing-pages.html?client_id=${brand.id}">${t('common_landing_pages')}</a>
          <a class="button secondary" href="/ui/leads.html?client_id=${brand.id}">${t('leads_my_leads')}</a>
        </div>
        <div class="muted" style="margin-top:10px;">${brand.business_description || t('common_no_description')}</div>
      </div>
    `;
    wrapper.querySelector('[data-toggle]').addEventListener('click', () => {
      wrapper.querySelector('.admin-details').classList.toggle('collapsed');
    });
    table.appendChild(wrapper);
  });
  if (pageLabel) pageLabel.textContent = t('common_page_of', { page: brandPage, total: totalPages });
  if (prevBtn) prevBtn.disabled = brandPage <= 1;
  if (nextBtn) nextBtn.disabled = brandPage >= totalPages;
}

async function loadBrands() {
  clearAlert(alertBox);
  try {
    const data = await apiRequest('/web_admin_brands.php');
    allBrands = data.items || [];
    renderBrands();
  } catch (error) {
    showAlert(alertBox, error.message);
  }
}

searchInput.addEventListener('input', () => {
  brandPage = 1;
  renderBrands();
});
if (prevBtn) {
  prevBtn.addEventListener('click', () => {
    if (brandPage > 1) {
      brandPage -= 1;
      renderBrands();
    }
  });
}
if (nextBtn) {
  nextBtn.addEventListener('click', () => {
    brandPage += 1;
    renderBrands();
  });
}

loadBrands();
})();
