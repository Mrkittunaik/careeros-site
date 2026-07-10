// router.js
// Minimal hash router for the app shell.
// The sidebar is rendered once in app.html and is never touched again.
// Every navigation only swaps the HTML inside #view-root, with a fade/slide
// animation, then runs that view's init(root) function.
import { setActiveNav } from './components/sidebar.js';

const VIEW_ROOT_ID = 'view-root';
const DEFAULT_ROUTE = '/dashboard';

// Each entry: { template: () => string, init: (root) => void|Function, destroy?: Function }
// init() may return a destroy function (e.g. to close a websocket) — if so it is
// called automatically right before the next view is mounted.
const routes = {};
let currentDestroy = null;
let currentRoute = null;
let navToken = 0; // guards against out-of-order async view loads

/**
 * Registers a view for a given route.
 * @param {string} route - e.g. "/dashboard"
 * @param {{template: Function, init: Function}} viewModule
 */
export function registerRoute(route, viewModule) {
  routes[route] = viewModule;
}

function parseRoute() {
  const hash = window.location.hash || '';
  const route = hash.startsWith('#') ? hash.slice(1) : hash;
  return route && routes[route] ? route : DEFAULT_ROUTE;
}

/**
 * Mounts a route into #view-root with an open/close animation.
 * Safe to call repeatedly (e.g. from hashchange) — only ever runs the latest request.
 */
async function navigate() {
  const route = parseRoute();
  if (route === currentRoute) return;

  const myToken = ++navToken;
  const root = document.getElementById(VIEW_ROOT_ID);
  const viewModule = routes[route];

  if (!viewModule) return;

  // Clean up the outgoing view (stop sockets/intervals etc.)
  if (typeof currentDestroy === 'function') {
    try {
      currentDestroy();
    } catch (err) {
      console.error('View destroy() error:', err);
    }
    currentDestroy = null;
  }

  // Play the "closing" animation on the current content, then swap.
  if (root.firstElementChild) {
    root.classList.add('view-transition--out');
    await wait(120);
  }

  if (myToken !== navToken) return; // a newer navigation started while we waited

  root.innerHTML = viewModule.template();
  root.classList.remove('view-transition--out');
  root.classList.add('view-transition--in');

  // Force reflow so the animation reliably restarts on every navigation
  void root.offsetWidth;
  root.classList.remove('view-transition--in');

  const result = viewModule.init(root);
  if (typeof result === 'function') {
    currentDestroy = result;
  }

  currentRoute = route;
  setActiveNav(route);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Starts the router: listens for hash changes and performs the initial navigation.
 */
export function startRouter() {
  window.addEventListener('hashchange', navigate);
  if (!window.location.hash) {
    window.location.hash = `#${DEFAULT_ROUTE}`;
  } else {
    navigate();
  }
}
