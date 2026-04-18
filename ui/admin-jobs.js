(async () => {
const adminUser = await ensureAdmin();
if (!adminUser) return;

setDefaultTheme();

const jobsList = document.getElementById('jobs-list');
const jobDetails = document.getElementById('job-details');
const jobSearchInput = document.getElementById('job-search');
const jobTypeFilter = document.getElementById('job-type-filter');
const jobsPrev = document.getElementById('jobs-prev');
const jobsNext = document.getElementById('jobs-next');
const jobsPage = document.getElementById('jobs-page');
const quickFilters = document.querySelectorAll('.quick-filter');

let allJobs = [];
let stats = {};
let selectedJobId = null;
let jobPage = 1;
let activeQuickFilter = 'all';
const JOBS_PER_PAGE = 20;

function normalizeUrl(url) {
  if (!url || typeof url !== 'string') return url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    const origin = window.location.origin;
    return url.replace(/^https?:\/\/(getadly\.com|127\.0\.0\.1:\d+|localhost:\d+)/i, origin);
  }
  return url;
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

function formatDuration(ms) {
  if (!ms) return '—';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return hours + 'h ' + (minutes % 60) + 'm';
  if (minutes > 0) return minutes + 'm ' + (seconds % 60) + 's';
  return seconds + 's';
}

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr.replace(' ', 'T'));
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return diffMins + 'm ago';
  if (diffHours < 24) return diffHours + 'h ago';
  if (diffDays < 7) return diffDays + 'd ago';
  return date.toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function getTimeClass(ms) {
  if (!ms) return '';
  if (ms > 300000) return 'very-slow';
  if (ms > 120000) return 'slow';
  if (ms < 60000) return 'fast';
  return '';
}

function getStageBadgeClass(stage) {
  if (['generate_design', 'generate_ad_copy', 'generate_multi_variants', 'publishing'].includes(stage)) return 'processing';
  if (['await_design_approval', 'await_copy_approval', 'await_publish_approval', 'await_user_input'].includes(stage)) return 'waiting';
  if (stage === 'completed') return 'completed';
  if (stage === 'rejected') return 'failed';
  return '';
}

function getJobTypeEmoji(type) {
  const emojis = { announcement: '📢', product_sale: '🛒', from_image: '🖼️', before_after: '↔️', ugc_video: '🎬', multi_mode: '📦', tips_carousel: '💡', reel: '🎥', video: '🎬', content_strategy: '📋' };
  return emojis[type] || '📄';
}

function renderEditHistory(edits, designVariations) {
  if (!edits || edits.length === 0) return '';
  
  let html = '<div class="detail-section">' +
    '<div class="detail-section-title">✏️ Edit History (' + edits.length + ' edits)</div>' +
    '<div class="edit-history">';
  
  edits.forEach((edit, index) => {
    const statusIcon = edit.status === 'completed' ? '✅' : edit.status === 'failed' ? '❌' : edit.status === 'pending' ? '⏳' : '⏭️';
    const statusClass = edit.status === 'completed' ? 'completed' : edit.status === 'failed' ? 'failed' : 'pending';
    const processingTime = edit.processing_seconds ? formatDuration(edit.processing_seconds * 1000) : '—';
    
    // Try to get the result image - either from result_image_url or infer from designVariations
    // Original designs are at the start, edits come after
    let imageUrl = edit.result_image_url;
    if (!imageUrl && designVariations && designVariations.length > 0) {
      // Edits are appended, so edit #1 corresponds to design_variations[original_count + 0]
      // We assume first 1-2 images are original, rest are edits
      const estimatedIndex = Math.min(index + 1, designVariations.length - 1);
      if (designVariations[estimatedIndex]) {
        imageUrl = designVariations[estimatedIndex];
      }
    }
    
    html += '<div class="edit-item ' + statusClass + '">' +
      '<div class="edit-header">' +
        '<span class="edit-number">#' + (index + 1) + ' ' + statusIcon + '</span>' +
        '<span class="edit-time">' + formatDateTime(edit.requested_at) + '</span>' +
        (edit.processing_seconds ? '<span class="edit-duration">' + processingTime + '</span>' : '') +
      '</div>' +
      '<div class="edit-request">"' + (edit.user_edit || '').substring(0, 150) + (edit.user_edit && edit.user_edit.length > 150 ? '...' : '') + '"</div>' +
      (edit.error_message ? '<div class="edit-error">⚠️ ' + edit.error_message + '</div>' : '') +
      (imageUrl ? '<img class="edit-thumb" src="' + normalizeUrl(imageUrl) + '" alt="Edit result">' : '') +
    '</div>';
  });
  
  html += '</div></div>';
  return html;
}

function updateStats() {
  document.getElementById('stat-today').textContent = stats.jobs_today || 0;
  document.getElementById('stat-week').textContent = stats.jobs_week || 0;
  document.getElementById('stat-completed').textContent = stats.completed_count || 0;
  if (stats.avg_processing_ms) {
    document.getElementById('stat-avg-time').textContent = formatDuration(stats.avg_processing_ms);
    document.getElementById('stat-time-range').textContent = 'Min: ' + formatDuration(stats.min_processing_ms) + ' / Max: ' + formatDuration(stats.max_processing_ms);
  } else {
    document.getElementById('stat-avg-time').textContent = '—';
    document.getElementById('stat-time-range').textContent = 'No data';
  }
  const stuckCard = document.getElementById('stuck-card');
  if (stats.stuck_jobs > 0) { stuckCard.style.display = 'block'; document.getElementById('stat-stuck').textContent = stats.stuck_jobs; }
  else { stuckCard.style.display = 'none'; }
  const slowCard = document.getElementById('slow-card');
  if (stats.slow_jobs > 0) { slowCard.style.display = 'block'; document.getElementById('stat-slow').textContent = stats.slow_jobs; }
  else { slowCard.style.display = 'none'; }
}

function filterJobs(jobs) {
  const term = (jobSearchInput.value || '').toLowerCase();
  const typeFilter = jobTypeFilter.value;
  return jobs.filter((job) => {
    if (typeFilter !== 'all' && job.job_type !== typeFilter) return false;
    if (activeQuickFilter === 'processing' && !['generate_design', 'generate_ad_copy', 'generate_multi_variants', 'publishing'].includes(job.current_stage)) return false;
    if (activeQuickFilter === 'waiting' && !['await_design_approval', 'await_copy_approval', 'await_publish_approval', 'await_user_input'].includes(job.current_stage)) return false;
    if (activeQuickFilter === 'completed' && job.current_stage !== 'completed') return false;
    if (activeQuickFilter === 'slow' && (!job.processing_time_ms || job.processing_time_ms < 120000)) return false;
    if (activeQuickFilter === 'failed' && job.current_stage !== 'rejected') return false;
    const haystack = [job.business_name, job.owner_emails, job.owner_names, job.user_message, job.job_type, '#' + job.id].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(term);
  });
}

function renderJobs() {
  jobsList.innerHTML = '';
  const filtered = filterJobs(allJobs);
  const totalPages = Math.max(1, Math.ceil(filtered.length / JOBS_PER_PAGE));
  if (jobPage > totalPages) jobPage = totalPages;
  const start = (jobPage - 1) * JOBS_PER_PAGE;
  const pageItems = filtered.slice(start, start + JOBS_PER_PAGE);
  if (!pageItems.length) {
    jobsList.innerHTML = '<div class="muted" style="text-align: center; padding: 40px;">No jobs found matching your filters.</div>';
    if (jobsPage) jobsPage.textContent = 'Page ' + jobPage + ' of ' + totalPages;
    if (jobsPrev) jobsPrev.disabled = jobPage <= 1;
    if (jobsNext) jobsNext.disabled = jobPage >= totalPages;
    return;
  }
  pageItems.forEach((job) => {
    const item = document.createElement('div');
    const timeClass = getTimeClass(job.processing_time_ms);
    item.className = 'admin-job-item' + (selectedJobId === job.id ? ' selected' : '') + (timeClass ? ' ' + timeClass : '');
    const designVariations = job.design_variations ? JSON.parse(job.design_variations) : [];
    const designThumb = designVariations[job.approved_design_index || 0] || designVariations[0];
    const stageBadgeClass = getStageBadgeClass(job.current_stage);
    let displayTime = '', timeLabel = '', timeValueClass = '';
    if (job.processing_time_ms) {
      displayTime = formatDuration(job.processing_time_ms); timeLabel = 'PROCESSED'; timeValueClass = getTimeClass(job.processing_time_ms);
    } else if (job.completed_at) {
      const diff = new Date(job.completed_at.replace(' ', 'T')) - new Date(job.created_at.replace(' ', 'T'));
      displayTime = formatDuration(diff); timeLabel = 'TOTAL TIME'; timeValueClass = diff > 300000 ? 'very-slow' : diff > 120000 ? 'slow' : 'fast';
    } else {
      const diff = new Date() - new Date(job.created_at.replace(' ', 'T'));
      displayTime = formatDuration(diff); timeLabel = 'WAITING'; timeValueClass = diff > 3600000 ? 'very-slow' : diff > 600000 ? 'slow' : '';
    }
    item.innerHTML = '<div>' + (designThumb ? '<img class="job-thumb-small" src="' + normalizeUrl(designThumb) + '" alt="">' : '<div class="job-thumb-placeholder">' + getJobTypeEmoji(job.job_type) + '</div>') + '</div>' +
      '<div class="job-main-info">' +
        '<div class="job-title"><span>#' + job.id + '</span><span class="stage-badge ' + stageBadgeClass + '">' + stageIcon(job.current_stage) + ' ' + formatStage(job.current_stage) + '</span></div>' +
        '<div class="job-meta"><strong>' + (job.business_name || 'No brand') + '</strong> · ' + (job.owner_emails ? job.owner_emails.split(',')[0] : 'No owner') + '</div>' +
        (job.user_message ? '<div class="job-message">💬 ' + job.user_message + '</div>' : '') +
      '</div>' +
      '<div class="job-timing">' +
        '<div class="time-value ' + timeValueClass + '">' + displayTime + '</div>' +
        '<div class="time-label">' + timeLabel + '</div>' +
        '<div class="job-date">' + timeAgo(job.created_at) + '</div>' +
      '</div>';
    item.addEventListener('click', () => renderJobDetails(job.id));
    jobsList.appendChild(item);
  });
  if (jobsPage) jobsPage.textContent = 'Page ' + jobPage + ' of ' + totalPages + ' (' + filtered.length + ' jobs)';
  if (jobsPrev) jobsPrev.disabled = jobPage <= 1;
  if (jobsNext) jobsNext.disabled = jobPage >= totalPages;
}

async function renderJobDetails(jobId) {
  selectedJobId = jobId;
  renderJobs();
  jobDetails.innerHTML = '<div class="muted" style="text-align: center; padding: 40px;">Loading job details...</div>';
  try {
    const data = await apiRequest('/web_admin_jobs.php?job_id=' + jobId);
    const job = data.item;
    if (!job) { jobDetails.innerHTML = '<div class="muted">Job not found.</div>'; return; }
    const designVariations = job.design_variations ? JSON.parse(job.design_variations) : [];
    const designUrl = designVariations[job.approved_design_index || 0] || designVariations[0];
    const adCopyParsed = parseAdCopy(job.ad_copy);
    const facebookLink = job.facebook_post_id ? 'https://facebook.com/' + job.facebook_post_id : null;
    const instagramLink = job.instagram_permalink || (job.instagram_post_id ? 'https://instagram.com/p/' + job.instagram_post_id : null);
    let timelineHtml = '';
    const events = [{ time: job.created_at, event: 'Job Created', icon: '🆕' }];
    if (job.design_approved_at) events.push({ time: job.design_approved_at, event: 'Design Approved', icon: '🎨' });
    if (job.ad_copy_approved_at) events.push({ time: job.ad_copy_approved_at, event: 'Copy Approved', icon: '✍️' });
    if (job.completed_at) events.push({ time: job.completed_at, event: 'Processing Complete', icon: '✅' });
    if (job.published_at) events.push({ time: job.published_at, event: 'Published', icon: '🚀' });
    events.sort((a, b) => new Date(a.time) - new Date(b.time));
    for (let i = 0; i < events.length; i++) {
      const current = new Date(events[i].time.replace(' ', 'T'));
      const prev = i > 0 ? new Date(events[i-1].time.replace(' ', 'T')) : null;
      const duration = prev ? formatDuration(current - prev) : '';
      timelineHtml += '<div class="timeline-item ' + (i === events.length - 1 ? 'active' : 'completed') + '"><div class="timeline-event">' + events[i].icon + ' ' + events[i].event + '</div><div class="timeline-time">' + formatDateTime(events[i].time) + (duration ? '<span class="timeline-duration">+' + duration + '</span>' : '') + '</div></div>';
    }
    let totalTime = '—', totalTimeClass = '';
    if (job.processing_time_ms) { totalTime = formatDuration(job.processing_time_ms); totalTimeClass = getTimeClass(job.processing_time_ms); }
    else if (job.completed_at && job.created_at) { const diff = new Date(job.completed_at.replace(' ', 'T')) - new Date(job.created_at.replace(' ', 'T')); totalTime = formatDuration(diff); totalTimeClass = diff > 300000 ? 'very-slow' : diff > 120000 ? 'slow' : 'fast'; }
    jobDetails.innerHTML = 
      '<div class="detail-section">' +
        '<div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">' +
          '<div><h3 style="margin: 0; font-size: 18px;">Job #' + job.id + '</h3><div class="muted" style="font-size: 12px; margin-top: 2px;">' + (job.business_name || 'No brand') + '</div></div>' +
          '<div class="stage-badge ' + getStageBadgeClass(job.current_stage) + '" style="font-size: 12px; padding: 4px 12px;">' + stageIcon(job.current_stage) + ' ' + formatStage(job.current_stage) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="detail-section">' +
        '<div class="detail-section-title">⏱️ Performance</div>' +
        '<div class="detail-row"><span class="detail-label">Total Time</span><span class="detail-value ' + totalTimeClass + '" style="font-size: 16px; font-weight: 700;">' + totalTime + '</span></div>' +
        (job.processing_time_ms ? '<div class="detail-row"><span class="detail-label">AI Processing</span><span class="detail-value">' + formatDuration(job.processing_time_ms) + '</span></div>' : '') +
      '</div>' +
      '<div class="detail-section">' +
        '<div class="detail-section-title">📋 Job Info</div>' +
        '<div class="detail-row"><span class="detail-label">Type</span><span class="detail-value">' + getJobTypeEmoji(job.job_type) + ' ' + (job.job_type || '').replace(/_/g, ' ') + '</span></div>' +
        '<div class="detail-row"><span class="detail-label">Size</span><span class="detail-value">' + (job.image_size || 'post') + '</span></div>' +
        '<div class="detail-row"><span class="detail-label">Language</span><span class="detail-value">' + (job.language || '—') + '</span></div>' +
        '<div class="detail-row"><span class="detail-label">Owner</span><span class="detail-value">' + (job.owner_emails || '—') + '</span></div>' +
      '</div>' +
      (job.user_message ? '<div class="detail-section"><div class="detail-section-title">💬 User Brief</div><div class="ad-copy-preview" style="background: #fef3c7;">' + job.user_message + '</div></div>' : '') +
      '<div class="detail-section"><div class="detail-section-title">📅 Timeline</div><div class="timeline">' + timelineHtml + '</div></div>' +
      (designUrl ? '<div class="detail-section"><div class="detail-section-title">🎨 Design</div><img class="detail-preview" src="' + normalizeUrl(designUrl) + '" alt="Design preview"></div>' : '') +
      renderEditHistory(job.edit_history, designVariations) +
      (adCopyParsed ? '<div class="detail-section"><div class="detail-section-title">✍️ Ad Copy</div><div class="ad-copy-preview"><strong>' + (adCopyParsed.headline || '') + '</strong><br><br>' + (adCopyParsed.body || '') + '<br><br><em>' + (adCopyParsed.cta || '') + '</em></div></div>' : '') +
      ((facebookLink || instagramLink) ? '<div class="detail-section"><div class="detail-section-title">🔗 Published Links</div><div class="row" style="gap: 8px;">' + (facebookLink ? '<a class="button secondary" href="' + facebookLink + '" target="_blank" rel="noopener">📘 Facebook</a>' : '') + (instagramLink ? '<a class="button secondary" href="' + instagramLink + '" target="_blank" rel="noopener">📸 Instagram</a>' : '') + '</div></div>' : '');
  } catch (error) { jobDetails.innerHTML = '<div class="muted">' + error.message + '</div>'; }
}

async function loadJobs() {
  jobsList.innerHTML = '<div class="muted" style="text-align: center; padding: 40px;">Loading jobs...</div>';
  try {
    const data = await apiRequest('/web_admin_jobs.php');
    allJobs = data.items || [];
    stats = data.stats || {};
    updateStats();
    renderJobs();
  } catch (error) { jobsList.innerHTML = '<div class="muted" style="color: red;">' + error.message + '</div>'; }
}

jobSearchInput.addEventListener('input', () => { jobPage = 1; renderJobs(); });
jobTypeFilter.addEventListener('change', () => { jobPage = 1; renderJobs(); });
quickFilters.forEach(btn => {
  btn.addEventListener('click', () => {
    quickFilters.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeQuickFilter = btn.dataset.filter;
    jobPage = 1;
    renderJobs();
  });
});
if (jobsPrev) { jobsPrev.addEventListener('click', () => { if (jobPage > 1) { jobPage -= 1; renderJobs(); } }); }
if (jobsNext) { jobsNext.addEventListener('click', () => { jobPage += 1; renderJobs(); }); }
setInterval(loadJobs, 30000);
loadJobs();
})();
