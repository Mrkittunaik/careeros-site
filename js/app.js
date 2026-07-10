// app.js — entry point for app.html
import { requireAuth } from './api/auth.js';
import { renderSidebar, bindSidebarEvents } from './components/sidebar.js';
import { registerRoute, startRouter } from './router.js';

import * as dashboardView from './views/dashboard.js';
import * as jobRequestView from './views/job-request.js';
import * as profileView from './views/profile.js';
import * as settingsView from './views/settings.js';

requireAuth();

// Sidebar is inserted exactly once and never touched again by route changes.
document.getElementById('page-layout').insertAdjacentHTML('afterbegin', renderSidebar());
bindSidebarEvents();

registerRoute('/dashboard', dashboardView);
registerRoute('/job-request', jobRequestView);
registerRoute('/profile', profileView);
registerRoute('/settings', settingsView);

startRouter();
