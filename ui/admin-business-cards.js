(async () => {
const adminUser = await ensureAdmin();
if (!adminUser) return;

setDefaultTheme();

const cardsTable = document.getElementById('cards-table');
const alertBox = document.getElementById('alert');
const searchInput = document.getElementById('card-search');
const brandSelect = document.getElementById('card-brand-select');
const openEditorButton = document.getElementById('card-open-editor');

let allCards = [];
let allBrands = [];

async function loadCards() {
  clearAlert(alertBox);
  try {
    const data = await apiRequest('/web_business_cards.php?action=admin_list');
    allCards = data.items || [];
    renderCards();
  } catch (error) {
    showAlert(alertBox, error.message);
  }
}

async function loadBrands() {
  try {
    const data = await apiRequest('/web_admin_brands.php');
    allBrands = data.items || [];
    renderBrandSelect();
  } catch (error) {
    showAlert(alertBox, error.message);
  }
}

function renderBrandSelect() {
  brandSelect.innerHTML = '';
  if (!allBrands.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = t('common_no_brands');
    brandSelect.appendChild(option);
    brandSelect.disabled = true;
    openEditorButton.disabled = true;
    return;
  }
  brandSelect.disabled = false;
  openEditorButton.disabled = false;

  allBrands.forEach((brand) => {
    const option = document.createElement('option');
    option.value = brand.id;
    option.textContent = `${brand.business_name || 'Brand'}${brand.owner_emails ? ` · ${brand.owner_emails}` : ''}`;
    brandSelect.appendChild(option);
  });
}

function matchesSearch(card, term) {
  if (!term) return true;
  const haystack = [
    card.business_name,
    card.title,
    card.subtitle,
    card.owner_emails,
    card.status
  ].filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(term);
}

function renderCards() {
  cardsTable.innerHTML = '';
  const term = (searchInput.value || '').trim().toLowerCase();
  const filtered = allCards.filter((card) => matchesSearch(card, term));

  if (!filtered.length) {
    cardsTable.innerHTML = `<div class="muted">${t('admin_business_cards_empty')}</div>`;
    return;
  }

  const header = document.createElement('div');
  header.className = 'admin-table-header';
  header.innerHTML = `
    <div>${t('common_brands')}</div>
    <div>${t('common_title')}</div>
    <div>${t('common_status')}</div>
    <div>${t('admin_last_update')}</div>
    <div>${t('admin_actions')}</div>
  `;
  cardsTable.appendChild(header);

  filtered.forEach((card) => {
    const row = document.createElement('div');
    row.className = 'admin-table-row';
    const updatedAt = card.updated_at || card.created_at || '—';
    const publicUrl = card.public_slug ? `/business-card.php?slug=${encodeURIComponent(card.public_slug)}` : null;
    row.innerHTML = `
      <div class="admin-cell main">
        <strong>${card.business_name || 'Brand'}</strong>
        <div class="muted">${card.owner_emails || '—'}</div>
      </div>
      <div>${card.title || '—'}</div>
      <div>${card.status || 'draft'}</div>
      <div>${updatedAt}</div>
      <div class="row" style="gap:8px;">
        <a class="button secondary" href="/ui/business-card.html?client_id=${card.client_id}">${t('admin_business_cards_open_editor')}</a>
        ${publicUrl ? `<a class="button secondary" target="_blank" href="${publicUrl}">${t('admin_business_cards_open_public')}</a>` : ''}
      </div>
    `;
    cardsTable.appendChild(row);
  });
}

openEditorButton.addEventListener('click', () => {
  const clientId = brandSelect.value;
  if (!clientId) return;
  window.location.href = `/ui/business-card.html?client_id=${clientId}`;
});

searchInput.addEventListener('input', renderCards);

loadBrands();
loadCards();
})();