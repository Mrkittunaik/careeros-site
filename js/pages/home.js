// home.js
// Public marketing page — no requireAuth() here, this page must be reachable while logged out.
import { icon } from '../components/icons.js';

document.querySelectorAll('[data-icon]').forEach((el) => {
  el.innerHTML = icon(el.dataset.icon, 22);
});
