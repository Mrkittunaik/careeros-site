// toast.js
import { icon } from './icons.js';

const CONTAINER_ID = 'toast-container';
const AUTO_DISMISS_MS = 4000;

const TYPE_ICONS = {
  success: 'check-circle',
  error: 'x-circle',
  info: 'clock',
};

function getOrCreateContainer() {
  let container = document.getElementById(CONTAINER_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = CONTAINER_ID;
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

/**
 * Shows a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 */
export function showToast(message, type = 'info') {
  const container = getOrCreateContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    ${icon(TYPE_ICONS[type] || TYPE_ICONS.info, 18)}
    <span class="toast__message">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, AUTO_DISMISS_MS);

  return toast;
}
