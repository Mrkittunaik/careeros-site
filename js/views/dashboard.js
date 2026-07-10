// views/dashboard.js
import { getJobApplications, getDailyLimit } from '../api/jobs.js';
import { getSessions, getHrContacts } from '../api/dashboard.js';
import { showToast } from '../components/toast.js';
import { icon } from '../components/icons.js';
import { openModal } from '../components/modal.js';
import { ApiError } from '../api/client.js';
import { DashboardSocket } from '../ws/dashboardSocket.js';

export function template() {
  return `
    <div class="dashboard">
      <h1>Dashboard</h1>

      <section class="card bot-status-card">
        <span class="status-dot status-dot--offline" id="bot-status-dot">checking…</span>
        <span class="bot-status-card__last-seen" id="bot-last-seen" hidden></span>
      </section>

      <div class="stat-row dashboard-stat-row">
        <div class="stat-card">
          <span class="stat-number" id="stat-scanned">0</span>
          <span class="stat-label">Scanned</span>
        </div>
        <div class="stat-card">
          <span class="stat-number" id="stat-applied">0</span>
          <span class="stat-label">Applied</span>
        </div>
        <div class="stat-card">
          <span class="stat-number" id="stat-skipped">0</span>
          <span class="stat-label">Skipped</span>
        </div>
        <div class="stat-card">
          <span class="stat-number" id="stat-failed">0</span>
          <span class="stat-label">Failed</span>
        </div>
        <div class="stat-card">
          <span class="stat-number" id="stat-hr-emails">0</span>
          <span class="stat-label">HR emails collected</span>
        </div>
      </div>

      <section class="card applications-card">
        <h2>Job applications</h2>

        <div class="filter-row">
          <div class="filter-row__search">
            <span class="filter-row__search-icon" id="search-icon"></span>
            <input class="input" type="text" id="search-input" placeholder="Search role or company" />
          </div>
          <select class="input filter-row__status" id="status-filter">
            <option value="all">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="skipped">Skipped</option>
            <option value="failed">Failed</option>
            <option value="needs_attention">Needs attention</option>
          </select>
        </div>

        <div class="skeleton-stack" id="applications-skeleton">
          <div class="skeleton" style="height: 44px;"></div>
          <div class="skeleton" style="height: 44px;"></div>
          <div class="skeleton" style="height: 44px;"></div>
        </div>

        <div id="applications-table-wrap" hidden>
          <table class="table" id="applications-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Company</th>
                <th>Site</th>
                <th>Status</th>
                <th>Applied</th>
                <th>Link</th>
                <th>Reply</th>
              </tr>
            </thead>
            <tbody id="applications-tbody"></tbody>
          </table>
          <div class="table-mobile-card" id="applications-mobile-list"></div>
        </div>

        <div class="empty-state" id="applications-empty" hidden>
          <span id="applications-empty-icon"></span>
          <span class="empty-state__text">nothing here yet</span>
        </div>
      </section>

      <section class="card hr-contacts-card">
        <h2>HR contacts</h2>

        <div class="skeleton-stack" id="hr-skeleton">
          <div class="skeleton" style="height: 44px;"></div>
          <div class="skeleton" style="height: 44px;"></div>
        </div>

        <div id="hr-table-wrap" hidden>
          <table class="table" id="hr-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Company</th>
                <th>Source job</th>
                <th>Found</th>
              </tr>
            </thead>
            <tbody id="hr-tbody"></tbody>
          </table>
          <div class="table-mobile-card" id="hr-mobile-list"></div>
        </div>

        <div class="empty-state" id="hr-empty" hidden>
          <span id="hr-empty-icon"></span>
          <span class="empty-state__text">nothing here yet</span>
        </div>
      </section>
    </div>
  `;
}

/**
 * @param {HTMLElement} root
 * @returns {Function} destroy callback (disconnects the live-update socket)
 */
export function init(root) {
  const botStatusDot = root.querySelector('#bot-status-dot');
  const botLastSeen = root.querySelector('#bot-last-seen');

  const statScanned = root.querySelector('#stat-scanned');
  const statApplied = root.querySelector('#stat-applied');
  const statSkipped = root.querySelector('#stat-skipped');
  const statFailed = root.querySelector('#stat-failed');
  const statHrEmails = root.querySelector('#stat-hr-emails');

  const searchInput = root.querySelector('#search-input');
  const searchIcon = root.querySelector('#search-icon');
  const statusFilter = root.querySelector('#status-filter');

  const applicationsTableWrap = root.querySelector('#applications-table-wrap');
  const applicationsSkeleton = root.querySelector('#applications-skeleton');
  const applicationsTbody = root.querySelector('#applications-tbody');
  const applicationsMobileList = root.querySelector('#applications-mobile-list');
  const applicationsEmpty = root.querySelector('#applications-empty');
  const applicationsEmptyIcon = root.querySelector('#applications-empty-icon');

  const hrTableWrap = root.querySelector('#hr-table-wrap');
  const hrSkeleton = root.querySelector('#hr-skeleton');
  const hrTbody = root.querySelector('#hr-tbody');
  const hrMobileList = root.querySelector('#hr-mobile-list');
  const hrEmpty = root.querySelector('#hr-empty');
  const hrEmptyIcon = root.querySelector('#hr-empty-icon');

  searchIcon.innerHTML = icon('search', 16);
  applicationsEmptyIcon.innerHTML = icon('briefcase', 28);
  hrEmptyIcon.innerHTML = icon('mail', 28);

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
    root.querySelectorAll('[data-reply-app-id]').forEach((btn) => {
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

  searchInput.addEventListener('input', renderApplications);
  statusFilter.addEventListener('change', renderApplications);

  async function loadInitialData() {
    const results = await Promise.allSettled([getSessions(), getJobApplications({}), getHrContacts(), getDailyLimit()]);

    const [sessionsResult, applicationsResult, hrResult, limitResult] = results;

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

    if (applicationsResult.status === 'fulfilled') {
      const data = applicationsResult.value;
      allApplications = Array.isArray(data) ? data : (data && data.applications) || [];
    } else {
      allApplications = [];
      showToast('Could not load job applications.', 'error');
    }

    if (hrResult.status === 'fulfilled') {
      const data = hrResult.value;
      hrContacts = Array.isArray(data) ? data : (data && data.contacts) || [];
    } else {
      hrContacts = [];
      showToast('Could not load HR contacts.', 'error');
    }

    renderApplications();
    renderHrContacts();

    const limitData = limitResult.status === 'fulfilled' ? limitResult.value : null;
    computeAndRenderStats(limitData);
  }

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

  loadInitialData();
  socket.connect();

  // Returned to the router — called automatically when navigating away from this view.
  return () => {
    socket.disconnect();
  };
}
