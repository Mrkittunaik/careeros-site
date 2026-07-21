// views/job-request.js
import { getDailyLimit, submitJobRequest } from '../api/jobs.js';
import { getCustomSites, addCustomSite, getSiteCredentials, setSiteCredentials } from '../api/sites.js';
import { showToast } from '../components/toast.js';
import { icon } from '../components/icons.js';
import { ApiError } from '../api/client.js';

const BUILT_IN_SITES = [
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
            <div class="site-credentials-panel" id="site-credentials-panel" hidden></div>
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
  const credentialsPanel = root.querySelector('#site-credentials-panel');
  const submitBtn = root.querySelector('#submit-btn');

  const formView = root.querySelector('#form-view');
  const successView = root.querySelector('#success-view');
  const successIcon = root.querySelector('#success-icon');

  successIcon.innerHTML = icon('check-circle', 40);

  let remaining = 0;
  let limit = 0;
  const selectedSites = new Set();
  let customSites = []; // [{ title, url }] loaded from backend
  let siteCredentials = {}; // { [siteLower]: { needs_login, credential_mode, ... } } loaded from backend
  let addingSite = false; // whether the "+" tile's inline form is open
  let openCredentialsSite = null; // which site's credentials panel is expanded, or null

  function allSiteNames() {
    return [...BUILT_IN_SITES, ...customSites.map((s) => s.title)];
  }

  function renderSiteGrid() {
    const tiles = allSiteNames()
      .map(
        (site) => `
      <label class="site-option" data-site="${site}">
        <span class="checkbox-box" data-checkbox="${site}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
            <path d="m5 13 4 4L19 7"/>
          </svg>
        </span>
        <span class="site-option__label">${site}</span>
        <button type="button" class="site-option__key" data-key-for="${site}" title="Login settings for ${site}" aria-label="Login settings for ${site}" hidden>
          ${icon('key', 12)}
        </button>
      </label>
    `
      )
      .join('');

    const addTile = addingSite
      ? `
      <div class="site-option site-option--add-form" id="add-site-form">
        <input type="text" class="input input--sm" id="add-site-title" placeholder="Title (e.g. AngelList)" />
        <input type="text" class="input input--sm" id="add-site-url" placeholder="https://..." />
        <div class="site-option__add-actions">
          <button type="button" class="btn btn-secondary btn--sm" id="add-site-cancel">Cancel</button>
          <button type="button" class="btn btn-primary btn--sm" id="add-site-save">Save</button>
        </div>
      </div>
    `
      : `
      <label class="site-option site-option--add" id="add-site-tile">
        <span class="site-option__add-icon">+</span>
        <span class="site-option__label">Add site</span>
      </label>
    `;

    siteGrid.innerHTML = tiles + addTile;

    siteGrid.querySelectorAll('.site-option[data-site]').forEach((optionEl) => {
      optionEl.addEventListener('click', (e) => {
        if (e.target.closest('.site-option__key')) return; // key icon handles its own click below
        toggleSite(optionEl.dataset.site);
      });
    });

    siteGrid.querySelectorAll('.site-option__key').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const site = btn.dataset.keyFor;
        openCredentialsSite = openCredentialsSite === site ? null : site;
        renderCredentialsPanel();
      });
    });

    const addTileEl = siteGrid.querySelector('#add-site-tile');
    if (addTileEl) {
      addTileEl.addEventListener('click', () => {
        addingSite = true;
        renderSiteGrid();
      });
    }
    const cancelBtn = siteGrid.querySelector('#add-site-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        addingSite = false;
        renderSiteGrid();
      });
    }
    const saveBtn = siteGrid.querySelector('#add-site-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', handleSaveCustomSite);
    }

    updateSiteVisuals();
  }

  async function handleSaveCustomSite() {
    const titleInput = siteGrid.querySelector('#add-site-title');
    const urlInput = siteGrid.querySelector('#add-site-url');
    const title = titleInput.value.trim();
    const url = urlInput.value.trim();

    if (!title || !url) {
      showToast('Enter both a title and a URL.', 'error');
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      showToast('URL must start with http:// or https://', 'error');
      return;
    }

    try {
      customSites = await addCustomSite(title, url);
      addingSite = false;
      selectedSites.add(title); // select it immediately — user just added it to use it
      renderSiteGrid();
      updateSubmitState();
      showToast(`${title} added.`, 'success');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not save site.';
      showToast(message, 'error');
    }
  }

  function toggleSite(site) {
    if (selectedSites.has(site)) {
      selectedSites.delete(site);
      if (openCredentialsSite === site) {
        openCredentialsSite = null;
        renderCredentialsPanel();
      }
    } else {
      selectedSites.add(site);
    }
    updateSiteVisuals();
    updateSubmitState();
  }

  function updateSiteVisuals() {
    siteGrid.querySelectorAll('.site-option[data-site]').forEach((optionEl) => {
      const site = optionEl.dataset.site;
      const isSelected = selectedSites.has(site);
      optionEl.classList.toggle('is-selected', isSelected);
      const box = optionEl.querySelector('.checkbox-box');
      box.classList.toggle('is-checked', isSelected);
      // The login-settings key only makes sense once a site is actually
      // selected for this run — keeps the grid uncluttered otherwise.
      const keyBtn = optionEl.querySelector('.site-option__key');
      if (keyBtn) keyBtn.hidden = !isSelected;
    });
  }

  // ---------- Per-site login credentials panel ----------
  function renderCredentialsPanel() {
    if (!openCredentialsSite) {
      credentialsPanel.hidden = true;
      credentialsPanel.innerHTML = '';
      return;
    }

    const site = openCredentialsSite;
    const siteKey = site.toLowerCase();
    const existing = siteCredentials[siteKey] || { needs_login: false, credential_mode: 'auto' };

    credentialsPanel.hidden = false;
    credentialsPanel.innerHTML = `
      <div class="site-credentials-card">
        <div class="site-credentials-card__header">
          <span>Login settings — ${site}</span>
          <button type="button" class="site-credentials-card__close" id="cred-close" aria-label="Close">&times;</button>
        </div>

        <label class="site-credentials-toggle">
          <input type="checkbox" id="cred-needs-login" ${existing.needs_login ? 'checked' : ''} />
          <span>This site asks for login/sign-in</span>
        </label>

        <div class="site-credentials-mode" id="cred-mode-wrap" ${existing.needs_login ? '' : 'hidden'}>
          <label class="radio-row">
            <input type="radio" name="cred-mode-${siteKey}" value="auto" ${existing.credential_mode !== 'manual' ? 'checked' : ''} />
            <span>Auto — use my CareerOS account email, password generated automatically</span>
          </label>
          <label class="radio-row">
            <input type="radio" name="cred-mode-${siteKey}" value="manual" ${existing.credential_mode === 'manual' ? 'checked' : ''} />
            <span>Manual — set my own username &amp; password for ${site}</span>
          </label>

          <div class="site-credentials-manual" id="cred-manual-wrap" ${existing.credential_mode === 'manual' ? '' : 'hidden'}>
            <input type="text" class="input input--sm" id="cred-username" placeholder="Username / email" />
            <input type="password" class="input input--sm" id="cred-password" placeholder="Password" />
            ${existing.has_manual_password ? `<div class="muted" style="font-size:11px;">Saved: ${existing.manual_username || 'a password is already saved'} — leave blank to keep it</div>` : ''}
          </div>
        </div>

        <div class="site-credentials-card__actions">
          <button type="button" class="btn btn-primary btn--sm" id="cred-save">Save</button>
        </div>
      </div>
    `;

    credentialsPanel.querySelector('#cred-close').addEventListener('click', () => {
      openCredentialsSite = null;
      renderCredentialsPanel();
    });

    const needsLoginCheckbox = credentialsPanel.querySelector('#cred-needs-login');
    const modeWrap = credentialsPanel.querySelector('#cred-mode-wrap');
    needsLoginCheckbox.addEventListener('change', () => {
      modeWrap.hidden = !needsLoginCheckbox.checked;
    });

    const manualWrap = credentialsPanel.querySelector('#cred-manual-wrap');
    credentialsPanel.querySelectorAll(`input[name="cred-mode-${siteKey}"]`).forEach((radio) => {
      radio.addEventListener('change', () => {
        manualWrap.hidden = radio.value !== 'manual' || !radio.checked;
      });
    });

    credentialsPanel.querySelector('#cred-save').addEventListener('click', () => handleSaveCredentials(site, siteKey));
  }

  async function handleSaveCredentials(site, siteKey) {
    const needsLogin = credentialsPanel.querySelector('#cred-needs-login').checked;
    const modeInput = credentialsPanel.querySelector(`input[name="cred-mode-${siteKey}"]:checked`);
    const credentialMode = modeInput ? modeInput.value : 'auto';

    let manualUsername = null;
    let manualPassword = null;
    if (credentialMode === 'manual') {
      manualUsername = credentialsPanel.querySelector('#cred-username').value.trim();
      manualPassword = credentialsPanel.querySelector('#cred-password').value;

      if (!manualUsername || !manualPassword) {
        showToast('Enter both username and password for manual login.', 'error');
        return;
      }
    }

    try {
      await setSiteCredentials(site, { needsLogin, credentialMode, manualUsername, manualPassword });
      siteCredentials = await getSiteCredentials();
      showToast(`Login settings saved for ${site}.`, 'success');
      openCredentialsSite = null;
      renderCredentialsPanel();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not save login settings.';
      showToast(message, 'error');
    }
  }

  function updateSubmitState() {
    const hasJobType = jobTypeInput.value.trim().length > 0;
    const hasSites = selectedSites.size > 0;
    const canSubmit = remaining > 0 && hasJobType && hasSites;
    submitBtn.disabled = !canSubmit;
  }

  jobTypeInput.addEventListener('input', updateSubmitState);

  async function loadCustomSitesAndCredentials() {
    try {
      const [sites, creds] = await Promise.all([getCustomSites(), getSiteCredentials()]);
      customSites = sites;
      siteCredentials = creds;
      renderSiteGrid();
    } catch (err) {
      // Non-fatal — built-in sites still work fine without this.
      renderSiteGrid();
    }
  }

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

  loadCustomSitesAndCredentials();
  loadDailyLimit();
}
