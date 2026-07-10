// job-request.js
import { requireAuth } from '../api/auth.js';
import { getDailyLimit, submitJobRequest } from '../api/jobs.js';
import { showToast } from '../components/toast.js';
import { icon } from '../components/icons.js';
import { renderSidebar, bindSidebarEvents } from '../components/sidebar.js';
import { ApiError } from '../api/client.js';

requireAuth();

document.getElementById('page-layout').insertAdjacentHTML('afterbegin', renderSidebar('job-request'));
bindSidebarEvents();

const SITES = [
  'LinkedIn',
  'Indeed',
  'Glassdoor',
  'Naukri',
  'Monster',
  'ZipRecruiter',
  'Wellfound',
  'Dice',
  'SimplyHired',
];

// ---- Element refs ----
const limitCard = document.getElementById('limit-card');
const limitSkeleton = document.getElementById('limit-skeleton');
const limitContent = document.getElementById('limit-content');
const limitNumber = document.getElementById('limit-number');
const limitNote = document.getElementById('limit-note');

const jobTypeInput = document.getElementById('job-type-input');
const experienceSelect = document.getElementById('experience-select');
const siteGrid = document.getElementById('site-grid');
const submitBtn = document.getElementById('submit-btn');

const formView = document.getElementById('form-view');
const successView = document.getElementById('success-view');
const successIcon = document.getElementById('success-icon');

successIcon.innerHTML = icon('check-circle', 40);

// ---- State ----
let remaining = 0;
let limit = 0;
const selectedSites = new Set();

// ---- Render site checkboxes ----
function renderSiteGrid() {
  siteGrid.innerHTML = SITES.map(
    (site) => `
    <label class="site-option" data-site="${site}">
      <span class="checkbox-box" data-checkbox="${site}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
          <path d="m5 13 4 4L19 7"/>
        </svg>
      </span>
      <span class="site-option__label">${site}</span>
    </label>
  `
  ).join('');

  siteGrid.querySelectorAll('.site-option').forEach((optionEl) => {
    optionEl.addEventListener('click', () => toggleSite(optionEl.dataset.site));
  });
}

function toggleSite(site) {
  if (selectedSites.has(site)) {
    selectedSites.delete(site);
  } else {
    selectedSites.add(site);
  }
  updateSiteVisuals();
  updateSubmitState();
}

function updateSiteVisuals() {
  siteGrid.querySelectorAll('.site-option').forEach((optionEl) => {
    const isSelected = selectedSites.has(optionEl.dataset.site);
    optionEl.classList.toggle('is-selected', isSelected);
    const box = optionEl.querySelector('.checkbox-box');
    box.classList.toggle('is-checked', isSelected);
  });
}

// ---- Submit button gating ----
function updateSubmitState() {
  const hasJobType = jobTypeInput.value.trim().length > 0;
  const hasSites = selectedSites.size > 0;
  const canSubmit = remaining > 0 && hasJobType && hasSites;
  submitBtn.disabled = !canSubmit;
}

jobTypeInput.addEventListener('input', updateSubmitState);

// ---- Load daily limit ----
async function loadDailyLimit() {
  try {
    const data = await getDailyLimit();
    limit = (data && data.limit) || 0;
    remaining = limit - ((data && data.applied_today) || 0);
    if (remaining < 0) remaining = 0;

    renderLimitBadge();
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Could not load daily limit.';
    showToast(message, 'error');
    // Fail safe: assume no remaining jobs so the form doesn't allow submission blindly
    remaining = 0;
    limit = 0;
    renderLimitBadge();
  } finally {
    limitSkeleton.hidden = true;
    limitContent.hidden = false;
    updateSubmitState();
  }
}

function renderLimitBadge() {
  limitNumber.textContent = `${remaining} of ${limit}`;
  limitCard.classList.remove('limit-card--plenty', 'limit-card--low', 'limit-card--zero');

  if (remaining === 0) {
    limitCard.classList.add('limit-card--zero');
    limitNote.textContent = 'resumes tomorrow';
    limitNote.hidden = false;
  } else if (limit > 0 && remaining / limit <= 0.25) {
    limitCard.classList.add('limit-card--low');
    limitNote.hidden = true;
  } else {
    limitCard.classList.add('limit-card--plenty');
    limitNote.hidden = true;
  }
}

// ---- Submit ----
submitBtn.addEventListener('click', async () => {
  const jobType = jobTypeInput.value.trim();
  const experienceLevel = experienceSelect.value;
  const targetSites = Array.from(selectedSites);

  if (!jobType || targetSites.length === 0 || remaining <= 0) {
    updateSubmitState();
    return;
  }

  submitBtn.disabled = true;
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Starting…';

  try {
    await submitJobRequest(jobType, experienceLevel, targetSites);
    formView.hidden = true;
    successView.hidden = false;
    showToast('Job search queued.', 'success');
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Could not start job search.';
    showToast(message, 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});

// ---- Init ----
renderSiteGrid();
loadDailyLimit();
