// sidebar.js
// Renders ONE persistent sidebar for the whole app shell (app.html).
// Nav items are hash links handled by router.js — clicking one never reloads the page,
// it only swaps the content inside #view-root and re-renders is-active state here.
import { icon } from './icons.js';
import { logout } from '../api/auth.js';

export const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'home', route: '/dashboard' },
  { key: 'chat', label: 'Chat', icon: 'message-square', route: '/chat' },
  { key: 'job-request', label: 'Start job search', icon: 'briefcase', route: '/job-request' },
  { key: 'profile', label: 'Profile', icon: 'key', route: '/profile' },
  { key: 'settings', label: 'Settings', icon: 'settings', route: '/settings' },
];

/**
 * True when the current page IS the SPA shell (app.html), where router.js is
 * listening for hashchange. False on standalone pages like onboarding.html or
 * login.html, where a bare "#/dashboard" href would just rewrite the hash and
 * do nothing.
 * @returns {boolean}
 */
function isInsideAppShell() {
  const path = window.location.pathname;
  return path.endsWith('/app.html') || path.endsWith('/app') || path.endsWith('/app/');
}

/**
 * Renders both the desktop sidebar and mobile bottom tab bar markup.
 * This is rendered ONCE into the app shell — it is never removed or re-inserted
 * when the active view changes, only the .is-active classes update.
 * @returns {string} HTML string
 */
export function renderSidebar() {
  // On app.html, links are bare hashes so router.js can intercept them without
  // a page reload. On any other page (onboarding, login, etc.), the SPA router
  // isn't running, so links must point back to the app shell itself.
  const hrefFor = (route) =>
    isInsideAppShell() ? `#${route}` : `../app/app.html#${route}`;

  const navItems = NAV_ITEMS.map(
    (item) => `
      <a class="sidebar__nav-item" href="${hrefFor(item.route)}" data-route="${item.route}">
        ${icon(item.icon, 18)}
        <span>${item.label}</span>
      </a>`
  ).join('');

  const bottomTabItems = NAV_ITEMS.map(
    (item) => `
      <a class="bottom-tab-bar__item" href="${hrefFor(item.route)}" data-route="${item.route}" aria-label="${item.label}">
        ${icon(item.icon, 20)}
      </a>`
  ).join('');

  return `
    <nav class="sidebar">
      <div class="sidebar__logo">
        <img src="../assets/logo.svg" alt="CareerOS" width="24" height="24" />
        <span>CareerOS</span>
      </div>
      <div class="sidebar__nav">
        ${navItems}
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
 * Updates which nav item is marked is-active, in both the desktop sidebar
 * and the mobile bottom tab bar. Call this on every route change.
 * @param {string} route - e.g. "/dashboard"
 */
export function setActiveNav(route) {
  document.querySelectorAll('[data-route]').forEach((el) => {
    el.classList.toggle('is-active', el.dataset.route === route);
  });
}

/**
 * Attaches logout click handlers. Call once, when the sidebar is first inserted.
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
