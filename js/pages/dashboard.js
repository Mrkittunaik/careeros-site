// dashboard.js
import { requireAuth } from '../api/auth.js';
import { getJobApplications } from '../api/jobs.js';
import { getDailyLimit } from '../api/jobs.js';
import { getSessions, getHrContacts } from '../api/dashboard.js';
import { showToast } from '../components/toast.js';
import { icon } from '../components/icons.js';
import { renderSidebar, bindSidebarEvents } from '../components/sidebar.js';
import { openModal } from '../components/modal.js';
import { ApiError } from '../api/client.js';
import { DashboardSocket } from '../ws/dashboardSocket.js';

requireAuth();

document.getElementById('page-layout').insertAdjacentHTML('afterbegin', renderSidebar('dashboard'));
bindSidebarEvents();

// ---- Element refs ----
const botStatusDot = document.getElementById('bot-status-dot');
const botLastSeen = document.getElementById('bot-last-seen');

const statScanned = document.getElementById('stat-scanned');
const statApplied = document.getElementById('stat-applied');
const statSkipped = document.getElementById('stat-skipped');
const statFailed = document.getElementById('stat-failed');
const statHrEmails = document.getElementById('stat-hr-emails');

const searchInput = document.getElementById('search-input');
const searchIcon = document.getElementById('search-icon');
const statusFilter = document.getElementById('status-filter');

const applicationsTableWrap = document.getElementById('applications-table-wrap');
const applicationsSkeleton = document.getElementById('applications-skeleton');
const applicationsTbody = document.getElementById('applications-tbody');
const applicationsMobileList = document.getElementById('applications-mobile-list');
const applicationsEmpty = document.getElementById('applications-empty');
const applicationsEmptyIcon = document.getElementById('applications-empty-icon');

const hrTableWrap = document.getElementById('hr-table-wrap');
const hrSkeleton = document.getElementById('hr-skeleton');
const hrTbody = document.getElementById('hr-tbody');
const hrMobileList = document.getElementById('hr-mobile-list');
const hrEmpty = document.getElementById('hr-empty');
const hrEmptyIcon = document.getElementById('hr-empty-icon');

// Static icon slots
searchIcon.innerHTML = icon('search', 16);
applicationsEmptyIcon.innerHTML = icon('briefcase', 28);
hrEmptyIcon.innerHTML = icon('mail', 28);

// ---- State ----
// NOTE ON FILTERING STRATEGY: the full applications list is fetched once on load and kept
// in memory. Search + status filtering below run client-side against this in-memory list
// rather than refetching via getJobApplications(filters) on every keystroke/change — this
// avoids network round-trips and flicker while typing. Live WebSocket updates (upserts)
// also mutate this same in-memory list, so filters stay consistent with real-time data.
let allApplications = [];
let hrContacts = [];

const STATUS_DOT_MODIFIER = {
  submitted: 'online',
  skipped: 'skipped',
  failed: 'failed',
  needs_attention: 'skipped',
  pending: 'pending',
};

function statusLabel(status) {
  if (!status) return 'pending';
  return status.replace(/_/g, ' ');
}

function statusDotModifier(status) {
  return STATUS_DOT_MODIFIER[status] || 'pending';
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (err) {
    return dateStr;
  }
}

// ---- Bot status ----
function setBotStatus(online, lastSeen) {
  botStatusDot.className = `status-dot status-dot--${online ? 'online' : 'offline'}`;
  botStatusDot.textContent = online ? 'bot connected' : 'bot offline';

  if (!online && lastSeen) {
    botLastSeen.textContent = `Last seen: ${formatDate(lastSeen)}`;
    botLastSeen.hidden = false;
  } else {
    botLastSeen.hidden = true;
  }
}

// ---- Stats ----
function computeAndRenderStats(dailyLimitData) {
  const scanned = allApplications.length;
  const applied = allApplications.filter((a) => a.status === 'submitted').length;
  const skipped = allApplications.filter((a) => a.status === 'skipped').length;
  const failed = allApplications.filter((a) => a.status === 'failed').length;

  statScanned.textContent = scanned;
  statApplied.textContent = dailyLimitData && dailyLimitData.applied_today !== undefined
    ? dailyLimitData.applied_today
    : applied;
  statSkipped.textContent = skipped;
  statFailed.textContent = failed;
  statHrEmails.textContent = hrContacts.length;
}

function updateStat(el, value) {
  el.textContent = value;
}

// ---- Applications rendering ----
function getFilteredApplications() {
  const search = searchInput.value.trim().toLowerCase();
  const status = statusFilter.value;

  return allApplications.filter((app) => {
    const matchesStatus = status === 'all' || app.status === status;
    const matchesSearch =
      !search ||
      (app.role && app.role.toLowerCase().includes(search)) ||
      (app.company && app.company.toLowerCase().includes(search));
    return matchesStatus && matchesSearch;
  });
}

function renderApplications() {
  applicationsSkeleton.hidden = true;

  const filtered = getFilteredApplications();

  if (filtered.length === 0) {
    applicationsTableWrap.hidden = true;
    applicationsEmpty.hidden = false;
    return;
  }

  applicationsTableWrap.hidden = false;
  applicationsEmpty.hidden = true;

  applicationsTbody.innerHTML = filtered.map(applicationRowDesktop).join('');
  applicationsMobileList.innerHTML = filtered.map(applicationRowMobile).join('');

  wireApplicationRowEvents();
}

function applicationRowDesktop(app) {
  return `
    <tr data-app-id="${app.id}">
      <td>${app.role || '—'}</td>
      <td>${app.company || '—'}</td>
      <td><span class="badge">${app.site || '—'}</span></td>
      <td>
        <span class="status-dot status-dot--${statusDotModifier(app.status)}">${statusLabel(app.status)}</span>
      </td>
      <td>${formatDate(app.applied_at)}</td>
      <td>
        ${app.link ? `<a class="cell-link" href="${app.link}" target="_blank" rel="noopener noreferrer" aria-label="Open job link">${icon('external-link', 16)}</a>` : '—'}
      </td>
      <td>
        ${app.reply_received ? `<button type="button" class="cell-reply" data-reply-app-id="${app.id}" aria-label="View reply">${icon('mail', 16)}</button>` : ''}
      </td>
    </tr>
  `;
}

function applicationRowMobile(app) {
  return `
    <div class="table-mobile-card__item" data-app-id="${app.id}">
      <div class="table-mobile-card__row">
        <span class="table-mobile-card__row-label">Role</span>
        <span class="table-mobile-card__row-value">${app.role || '—'}</span>
      </div>
      <div class="table-mobile-card__row">
        <span class="table-mobile-card__row-label">Company</span>
        <span class="table-mobile-card__row-value">${app.company || '—'}</span>
      </div>
      <div class="table-mobile-card__row">
        <span class="table-mobile-card__row-label">Site</span>
        <span class="table-mobile-card__row-value"><span class="badge">${app.site || '—'}</span></span>
      </div>
      <div class="table-mobile-card__row">
        <span class="table-mobile-card__row-label">Status</span>
        <span class="table-mobile-card__row-value">
          <span class="status-dot status-dot--${statusDotModifier(app.status)}">${statusLabel(app.status)}</span>
        </span>
      </div>
      <div class="table-mobile-card__row">
        <span class="table-mobile-card__row-label">Applied</span>
        <span class="table-mobile-card__row-value">${formatDate(app.applied_at)}</span>
      </div>
      <div class="table-mobile-card__row">
        <span class="table-mobile-card__row-label">Link</span>
        <span class="table-mobile-card__row-value table-mobile-card__row-value--link">
          ${app.link ? `<a class="cell-link" href="${app.link}" target="_blank" rel="noopener noreferrer" aria-label="Open job link">${icon('external-link', 16)}</a>` : '—'}
        </span>
      </div>
      ${
        app.reply_received
          ? `<div class="table-mobile-card__row">
               <span class="table-mobile-card__row-label">Reply</span>
               <span class="table-mobile-card__row-value table-mobile-card__row-value--reply">
                 <button type="button" class="cell-reply" data-reply-app-id="${app.id}" aria-label="View reply">${icon('mail', 16)}</button>
               </span>
             </div>`
          : ''
      }
    </div>
  `;
}

function wireApplicationRowEvents() {
  document.querySelectorAll('[data-reply-app-id]').forEach((btn) => {
    btn.addEventListener('click', () => openReplyModal(btn.dataset.replyAppId));
  });
}

function openReplyModal(appId) {
  const app = allApplications.find((a) => String(a.id) === String(appId));
  if (!app) return;

  const snippet = app.reply_snippet || 'No preview available.';
  const gmailUrl = 'https://mail.google.com/mail/u/0/#search/' + encodeURIComponent(app.company || '');

  openModal({
    title: `Reply from ${app.company || 'recruiter'}`,
    bodyHtml: `
      <div class="modal-reply-snippet">${snippet}</div>
      <a class="modal-reply-gmail-link" href="${gmailUrl}" target="_blank" rel="noopener noreferrer">
        Open in Gmail
      </a>
    `,
    confirmText: 'Close',
    onConfirm: () => {},
  });
}

// ---- HR contacts rendering ----
function renderHrContacts() {
  hrSkeleton.hidden = true;

  if (hrContacts.length === 0) {
    hrTableWrap.hidden = true;
    hrEmpty.hidden = false;
    return;
  }

  hrTableWrap.hidden = false;
  hrEmpty.hidden = true;

  hrTbody.innerHTML = hrContacts.map(hrRowDesktop).join('');
  hrMobileList.innerHTML = hrContacts.map(hrRowMobile).join('');
}

function hrRowDesktop(contact) {
  return `
    <tr data-hr-id="${contact.id}">
      <td>${contact.email || '—'}</td>
      <td>${contact.company || '—'}</td>
      <td>
        ${contact.source ? `<a class="cell-link" href="${contact.source}" target="_blank" rel="noopener noreferrer">${icon('external-link', 16)}</a>` : '—'}
      </td>
      <td>${formatDate(contact.found_at)}</td>
    </tr>
  `;
}

function hrRowMobile(contact) {
  return `
    <div class="table-mobile-card__item" data-hr-id="${contact.id}">
      <div class="table-mobile-card__row">
        <span class="table-mobile-card__row-label">Email</span>
        <span class="table-mobile-card__row-value">${contact.email || '—'}</span>
      </div>
      <div class="table-mobile-card__row">
        <span class="table-mobile-card__row-label">Company</span>
        <span class="table-mobile-card__row-value">${contact.company || '—'}</span>
      </div>
      <div class="table-mobile-card__row">
        <span class="table-mobile-card__row-label">Source job</span>
        <span class="table-mobile-card__row-value table-mobile-card__row-value--link">
          ${contact.source ? `<a class="cell-link" href="${contact.source}" target="_blank" rel="noopener noreferrer">${icon('external-link', 16)}</a>` : '—'}
        </span>
      </div>
      <div class="table-mobile-card__row">
        <span class="table-mobile-card__row-label">Found</span>
        <span class="table-mobile-card__row-value">${formatDate(contact.found_at)}</span>
      </div>
    </div>
  `;
}

// ---- Filter row wiring ----
searchInput.addEventListener('input', renderApplications);
statusFilter.addEventListener('change', renderApplications);

// ---- Initial data load ----
async function loadInitialData() {
  const results = await Promise.allSettled([getSessions(), getJobApplications({}), getHrContacts(), getDailyLimit()]);

  const [sessionsResult, applicationsResult, hrResult, limitResult] = results;

  // Bot status from sessions
  if (sessionsResult.status === 'fulfilled') {
    const sessions = sessionsResult.value;
    const activeSession = Array.isArray(sessions) ? sessions.find((s) => s.online) : sessions && sessions[0];
    if (activeSession) {
      setBotStatus(!!activeSession.online, activeSession.last_seen);
    } else {
      setBotStatus(false, null);
    }
  } else {
    setBotStatus(false, null);
    showToast('Could not load bot status.', 'error');
  }

  // Applications
  if (applicationsResult.status === 'fulfilled') {
    const data = applicationsResult.value;
    allApplications = Array.isArray(data) ? data : (data && data.applications) || [];
  } else {
    allApplications = [];
    showToast('Could not load job applications.', 'error');
  }

  // HR contacts
  if (hrResult.status === 'fulfilled') {
    const data = hrResult.value;
    hrContacts = Array.isArray(data) ? data : (data && data.contacts) || [];
  } else {
    hrContacts = [];
    showToast('Could not load HR contacts.', 'error');
  }

  renderApplications();
  renderHrContacts();

  // Stats (daily limit feeds "applied" if available)
  const limitData = limitResult.status === 'fulfilled' ? limitResult.value : null;
  computeAndRenderStats(limitData);
}

// ---- WebSocket live updates ----
const socket = new DashboardSocket();

socket.on('bot_status', (payload) => {
  const data = payload && payload.bot_status ? payload.bot_status : payload;
  if (data) {
    setBotStatus(!!data.online, data.last_seen);
  }
});

socket.on('job_progress_update', (payload) => {
  const app = payload && payload.job_application ? payload.job_application : payload;
  if (!app || app.id === undefined) return;

  const existingIndex = allApplications.findIndex((a) => String(a.id) === String(app.id));
  if (existingIndex !== -1) {
    allApplications[existingIndex] = { ...allApplications[existingIndex], ...app };
  } else {
    allApplications.unshift(app);
  }

  renderApplications();
  computeAndRenderStats(null);
});

socket.on('hr_contact_added', (payload) => {
  const contact = payload && payload.hr_contact ? payload.hr_contact : payload;
  if (!contact) return;

  hrContacts.unshift(contact);
  renderHrContacts();
  updateStat(statHrEmails, hrContacts.length);
});

socket.on('daily_counter_update', (payload) => {
  const data = payload || {};
  if (data.applied_today !== undefined) {
    updateStat(statApplied, data.applied_today);
  }
});

socket.on('application_reply_received', (payload) => {
  const data = payload || {};
  const appId = data.job_application_id;
  if (appId === undefined) return;

  const app = allApplications.find((a) => String(a.id) === String(appId));
  if (app) {
    app.reply_received = true;
    app.reply_snippet = data.reply_snippet;
    renderApplications();
    showToast('New reply received.', 'info');
  }
});

// ---- Init ----
loadInitialData();
socket.connect();

// Disconnect cleanly if the user navigates away
window.addEventListener('beforeunload', () => {
  socket.disconnect();
});
