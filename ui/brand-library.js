const brandHeader = document.getElementById('brand-header');
const uploadsList = document.getElementById('uploads-list');
const generatedImages = document.getElementById('generated-images');
const generatedVideos = document.getElementById('generated-videos');
const generatedCopies = document.getElementById('generated-copies');
const imageModal = document.getElementById('image-modal');
const modalImage = document.getElementById('modal-image');

const ITEMS_PER_PAGE = 10;
const paginationState = {
  uploads: 1,
  images: 1,
  videos: 1,
  copies: 1
};

function paginate(items, page) {
  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * ITEMS_PER_PAGE;
  return {
    page: safePage,
    totalPages,
    items: items.slice(start, start + ITEMS_PER_PAGE)
  };
}

function normalizeUrl(url) {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    const origin = window.location.origin;
    return url.replace(/^https?:\/\/(getadly\.com|127\.0\.0\.1:\d+|localhost:\d+)/i, origin);
  }
  return url;
}

function getClientId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('client_id');
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

function renderImageGrid(container, items, emptyText, paginationKey) {
  container.innerHTML = '';
  if (!items.length) {
    container.innerHTML = `<div class="muted">${emptyText}</div>`;
    return;
  }
  const paged = paginate(items, paginationState[paginationKey] || 1);
  paginationState[paginationKey] = paged.page;
  paged.items.forEach((url) => {
    const card = document.createElement('div');
    card.className = 'library-item';
    const img = document.createElement('img');
    img.className = 'library-image';
    img.src = normalizeUrl(url);
    img.alt = t('library_image_alt');
    img.addEventListener('click', () => {
      modalImage.src = normalizeUrl(url);
      imageModal.classList.add('open');
    });
    card.appendChild(img);
    container.appendChild(card);
  });
  updatePagination(paginationKey, paged.page, paged.totalPages);
}

function renderVideoGrid(container, items, emptyText, paginationKey) {
  container.innerHTML = '';
  if (!items.length) {
    container.innerHTML = `<div class="muted">${emptyText}</div>`;
    return;
  }
  const paged = paginate(items, paginationState[paginationKey] || 1);
  paginationState[paginationKey] = paged.page;
  paged.items.forEach((url) => {
    const card = document.createElement('div');
    card.className = 'library-item';
    const video = document.createElement('video');
    video.className = 'library-video';
    video.src = normalizeUrl(url);
    video.controls = true;
    card.appendChild(video);
    container.appendChild(card);
  });
  updatePagination(paginationKey, paged.page, paged.totalPages);
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

function renderCopyList(container, items, paginationKey) {
  container.innerHTML = '';
  if (!items.length) {
    container.innerHTML = `<div class="muted">${t('library_no_ad_copies')}</div>`;
    return;
  }
  const paged = paginate(items, paginationState[paginationKey] || 1);
  paginationState[paginationKey] = paged.page;
  paged.items.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'library-item copy-item';
    const parsed = parseAdCopy(item.ad_copy);
    const text = parsed
      ? `${parsed.headline}\n\n${parsed.body}\n\n${parsed.cta}`
      : item.ad_copy || '';
    card.innerHTML = `
      <div class="copy-header">
        <div class="muted" style="font-size:12px;">${t('library_job_label')} #${item.job_id}</div>
        <button class="copy-icon" title="${t('common_copy')}" data-copy="${encodeURIComponent(text)}">${iconSvg('icon-copy')}</button>
      </div>
      <div class="library-copy">${text || t('library_copy_missing')}</div>
    `;
    container.appendChild(card);
  });
  updatePagination(paginationKey, paged.page, paged.totalPages);
}

function updatePagination(key, page, totalPages) {
  const wrapper = document.querySelector(`[data-pagination="${key}"]`);
  if (!wrapper) return;
  const info = wrapper.querySelector('[data-page="info"]');
  const prev = wrapper.querySelector('[data-page="prev"]');
  const next = wrapper.querySelector('[data-page="next"]');
  if (info) info.textContent = t('common_page_of', { page, total: totalPages });
  if (prev) prev.disabled = page <= 1;
  if (next) next.disabled = page >= totalPages;
}

function bindPagination(key, renderFn) {
  const wrapper = document.querySelector(`[data-pagination="${key}"]`);
  if (!wrapper) return;
  if (wrapper.dataset.bound === 'true') return;
  wrapper.dataset.bound = 'true';
  const prev = wrapper.querySelector('[data-page="prev"]');
  const next = wrapper.querySelector('[data-page="next"]');
  if (prev) {
    prev.addEventListener('click', () => {
      paginationState[key] = Math.max(1, paginationState[key] - 1);
      renderFn();
    });
  }
  if (next) {
    next.addEventListener('click', () => {
      paginationState[key] = paginationState[key] + 1;
      renderFn();
    });
  }
}

function bindCollapsers() {
  const toggles = document.querySelectorAll('.section-toggle');
  toggles.forEach((btn) => {
    if (btn.dataset.bound === 'true') return;
    btn.dataset.bound = 'true';
    btn.removeAttribute('data-i18n');
    const updateToggle = (collapsed) => {
      btn.textContent = collapsed ? '▴' : '▾';
      btn.setAttribute('aria-label', collapsed ? t('common_expand') : t('common_collapse'));
      btn.setAttribute('title', collapsed ? t('common_expand') : t('common_collapse'));
    };
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const target = document.getElementById(targetId);
      if (!target) return;
      const collapsed = target.classList.toggle('collapsed');
      const header = btn.closest('.section-header');
      const scope = header ? header.parentElement : btn.parentElement;
      if (scope) {
        scope.querySelectorAll('.pagination').forEach((el) => {
          el.classList.toggle('collapsed', collapsed);
        });
      }
      updateToggle(collapsed);
    });
    const targetId = btn.getAttribute('data-target');
    const target = document.getElementById(targetId);
    updateToggle(target ? target.classList.contains('collapsed') : false);
  });
}

function toggleLibrarySection(btn) {
  if (!btn) return;
  const targetId = btn.getAttribute('data-target');
  const target = document.getElementById(targetId);
  if (!target) return;
  const collapsed = target.classList.toggle('collapsed');
  const header = btn.closest('.section-header');
  const scope = header ? header.parentElement : btn.parentElement;
  if (scope) {
    scope.querySelectorAll('.pagination').forEach((el) => {
      el.classList.toggle('collapsed', collapsed);
    });
  }
  btn.textContent = collapsed ? '▴' : '▾';
  btn.setAttribute('aria-label', collapsed ? t('common_expand') : t('common_collapse'));
  btn.setAttribute('title', collapsed ? t('common_expand') : t('common_collapse'));
}

window.toggleLibrarySection = toggleLibrarySection;

document.addEventListener('click', (event) => {
  const btn = event.target.closest('.section-toggle');
  if (!btn) return;
  const targetId = btn.getAttribute('data-target');
  const target = document.getElementById(targetId);
  if (!target) return;
  const collapsed = target.classList.toggle('collapsed');
  const header = btn.closest('.section-header');
  const scope = header ? header.parentElement : btn.parentElement;
  if (scope) {
    scope.querySelectorAll('.pagination').forEach((el) => {
      el.classList.toggle('collapsed', collapsed);
    });
  }
  btn.textContent = collapsed ? '▴' : '▾';
  btn.setAttribute('aria-label', collapsed ? t('common_expand') : t('common_collapse'));
  btn.setAttribute('title', collapsed ? t('common_expand') : t('common_collapse'));
});

async function loadLibrary() {
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

  const data = await apiRequest(`/web_library.php?client_id=${clientId}`);
  const uploads = data.uploads || [];
  const images = data.images || [];
  const videos = data.videos || [];
  const copies = data.copies || [];
  renderImageGrid(uploadsList, uploads, t('library_no_uploads'), 'uploads');
  renderImageGrid(generatedImages, images, t('library_no_images'), 'images');
  renderVideoGrid(generatedVideos, videos, t('library_no_videos'), 'videos');
  renderCopyList(generatedCopies, copies, 'copies');
  bindPagination('uploads', () => renderImageGrid(uploadsList, uploads, t('library_no_uploads'), 'uploads'));
  bindPagination('images', () => renderImageGrid(generatedImages, images, t('library_no_images'), 'images'));
  bindPagination('videos', () => renderVideoGrid(generatedVideos, videos, t('library_no_videos'), 'videos'));
  bindPagination('copies', () => renderCopyList(generatedCopies, copies, 'copies'));
  bindCollapsers();
}

loadLibrary();

imageModal.addEventListener('click', (event) => {
  if (event.target === imageModal) {
    imageModal.classList.remove('open');
  }
});

const imageModalClose = document.getElementById('image-modal-close');
if (imageModalClose) {
  imageModalClose.addEventListener('click', () => {
    imageModal.classList.remove('open');
  });
}

const imageModalCard = imageModal.querySelector('.modal-card');
if (imageModalCard) {
  imageModalCard.addEventListener('click', (event) => {
    event.stopPropagation();
  });
}

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
    }, 1500);
  } catch (error) {
    // Fallback: select text
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    button.textContent = '✅';
    setTimeout(() => {
    button.innerHTML = iconSvg('icon-copy');
    }, 1500);
  }
});
