// views/job-request.js
import { getDailyLimit, submitJobRequest } from '../api/jobs.js';
import { showToast } from '../components/toast.js';
import { icon } from '../components/icons.js';
import { ApiError } from '../api/client.js';

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

export function template() {
  return `
    <div class="job-request">
      <h1>Start a new job search</h1>

      <div class="card limit-card" id="limit-card">
        <div class="skeleton limit-card__skeleton" id="limit-skeleton" style="height: 48px;"></div>
        <div class="limit-card__content" id="limit-content" hidden>
          <span class="stat-number" id="limit-number">— of —</span>
          <span class="stat-label" id="limit-label">jobs left today</span>
          <span class="limit-card__note" id="limit-note" hidden></span>
        </div>
      </div>

      <section class="card job-request-card" id="job-request-card">
        <div id="form-view">
          <h2>Job details</h2>

          <div class="input-group">
            <label class="input-label" for="job-type-input">Job type</label>
            <input class="input" type="text" id="job-type-input" placeholder="e.g. Product Manager, Backend Engineer" />
          </div>

          <div class="input-group">
            <label class="input-label" for="experience-select">Experience level</label>
            <select class="input" id="experience-select">
              <option value="fresher">Fresher</option>
              <option value="experienced">Experienced</option>
              <option value="any">Any</option>
            </select>
          </div>

          <div class="input-group">
            <label class="input-label">Target sites</label>
            <div class="site-grid" id="site-grid"></div>
          </div>

          <div class="job-request-card__actions">
            <button type="button" class="btn btn-primary" id="submit-btn" disabled>
              Start job search
            </button>
          </div>
        </div>

        <div id="success-view" class="success-view" hidden>
          <span class="success-view__icon" id="success-icon"></span>
          <h2>Queued</h2>
          <p>Bot will start shortly.</p>
        </div>
      </section>
    </div>
  `;
}

export function init(root) {
  const limitCard = root.querySelector('#limit-card');
  const limitSkeleton = root.querySelector('#limit-skeleton');
  const limitContent = root.querySelector('#limit-content');
  const limitNumber = root.querySelector('#limit-number');
  const limitNote = root.querySelector('#limit-note');

  const jobTypeInput = root.querySelector('#job-type-input');
  const experienceSelect = root.querySelector('#experience-select');
  const siteGrid = root.querySelector('#site-grid');
  const submitBtn = root.querySelector('#submit-btn');

  const formView = root.querySelector('#form-view');
  const successView = root.querySelector('#success-view');
  const successIcon = root.querySelector('#success-icon');

  successIcon.innerHTML = icon('check-circle', 40);

  let remaining = 0;
  let limit = 0;
  const selectedSites = new Set();

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

  function updateSubmitState() {
    const hasJobType = jobTypeInput.value.trim().length > 0;
    const hasSites = selectedSites.size > 0;
    const canSubmit = remaining > 0 && hasJobType && hasSites;
    submitBtn.disabled = !canSubmit;
  }

  jobTypeInput.addEventListener('input', updateSubmitState);

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

  renderSiteGrid();
  loadDailyLimit();
}
