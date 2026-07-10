// sidebar.js
import { icon } from './icons.js';
import { logout } from '../api/auth.js';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'home', href: 'dashboard.html' },
  { key: 'job-request', label: 'Start job search', icon: 'briefcase', href: 'job-request.html' },
  { key: 'settings', label: 'Settings', icon: 'settings', href: 'settings.html' },
];

/**
 * Returns the current page's filename, e.g. "dashboard.html".
 */
function currentFilename() {
  const path = window.location.pathname;
  return path.substring(path.lastIndexOf('/') + 1) || 'index.html';
}

/**
 * Renders both the desktop sidebar and mobile bottom tab bar markup.
 * CSS media queries control which is visible.
 * @param {string} activePage - key matching a NAV_ITEMS.key, or filename to match against.
 * @returns {string} HTML string
 */
export function renderSidebar(activePage) {
  const active = activePage || currentFilename().replace('.html', '');

  const isActive = (item) =>
    item.key === active || item.href === `${active}.html` || item.href === currentFilename();

  const sidebarNavItems = NAV_ITEMS.map(
    (item) => `
      <a class="sidebar__nav-item${isActive(item) ? ' is-active' : ''}" href="${item.href}">
        ${icon(item.icon, 18)}
        <span>${item.label}</span>
      </a>`
  ).join('');

  const bottomTabItems = NAV_ITEMS.map(
    (item) => `
      <a class="bottom-tab-bar__item${isActive(item) ? ' is-active' : ''}" href="${item.href}" aria-label="${item.label}">
        ${icon(item.icon, 20)}
      </a>`
  ).join('');

  return `
    <nav class="sidebar">
      <div class="sidebar__logo">
        <img src="assets/logo.svg" alt="CareerOS" width="24" height="24" />
        <span>CareerOS</span>
      </div>
      <div class="sidebar__nav">
        ${sidebarNavItems}
      </div>
      <div class="sidebar__nav" style="margin-top: auto;">
        <a class="sidebar__nav-item" href="#" id="sidebar-logout-btn">
          ${icon('logout', 18)}
          <span>Log out</span>
        </a>
      </div>
    </nav>

    <nav class="bottom-tab-bar">
      ${bottomTabItems}
      <a class="bottom-tab-bar__item" href="#" id="bottom-tab-logout-btn" aria-label="Log out">
        ${icon('logout', 20)}
      </a>
    </nav>
  `;
}

/**
 * Attaches logout click handlers. Call after renderSidebar() markup is inserted into the DOM.
 */
export function bindSidebarEvents() {
  const handlers = ['sidebar-logout-btn', 'bottom-tab-logout-btn'];
  handlers.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
      });
    }
  });
}
