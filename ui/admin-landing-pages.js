(async () => {
const adminUser = await ensureAdmin();
if (!adminUser) return;

setDefaultTheme();

const lpList = document.getElementById('lp-list');
const lpSearch = document.getElementById('lp-search');
const lpStatus = document.getElementById('lp-status');

let allPages = [];

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function renderList() {
  lpList.innerHTML = '';
  const term = (lpSearch.value || '').toLowerCase();
  const statusFilter = lpStatus.value;
  const filtered = allPages.filter((page) => {
    if (statusFilter !== 'all' && page.status !== statusFilter) return false;
    const haystack = [
      page.business_name,
      page.owner_emails,
      page.title
    ].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(term);
  });
  if (!filtered.length) {
    lpList.innerHTML = '<div class="muted">No landing pages found.</div>';
    return;
  }
  filtered.forEach((page) => {
    const link = `${window.location.origin}/landing.php?slug=${encodeURIComponent(page.public_slug)}`;
    const row = document.createElement('div');
    row.className = 'landing-card';
    const statusLabel = page.status || 'published';
    const statusText = String(statusLabel).toLowerCase() === 'published' ? 'Published' : statusLabel;
    row.innerHTML = `
      <div class="landing-card-header">
        <div>
          <div class="landing-title">${page.title || 'Landing page'}</div>
          <div class="muted">${page.business_name || 'Brand'} · ${page.owner_emails || '—'}</div>
          <div class="muted">Updated ${formatDate(page.updated_at || page.created_at)}</div>
        </div>
        <div class="status-pill ${statusLabel}">${statusText}</div>
      </div>
      ${page.error_message ? `<div class="alert error">${page.error_message}</div>` : ''}
      <div class="landing-actions">
        <a class="button secondary" href="${link}" target="_blank" rel="noopener">Open page</a>
        <a class="button secondary" href="/ui/landing-pages.html?client_id=${page.client_id}">Open in brand</a>
      </div>
    `;
    lpList.appendChild(row);
  });
}

async function loadPages() {
  const data = await apiRequest('/web_admin_landing_pages.php');
  allPages = data.items || [];
  renderList();
}

lpSearch.addEventListener('input', renderList);
lpStatus.addEventListener('change', renderList);

loadPages();
})();