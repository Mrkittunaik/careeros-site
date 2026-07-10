// modal.js
import { icon } from './icons.js';

const OVERLAY_ID = 'active-modal-overlay';

/**
 * Opens a modal dialog.
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.bodyHtml
 * @param {string} [options.confirmText='confirm']
 * @param {boolean} [options.destructive=false]
 * @param {Function} [options.onConfirm]
 */
export function openModal({ title, bodyHtml, confirmText = 'confirm', destructive = false, onConfirm }) {
  closeModal();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = OVERLAY_ID;

  const confirmClass = destructive ? 'btn-destructive' : 'btn-primary';

  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="${title || ''}">
      <div class="modal__header">
        <h3>${title || ''}</h3>
        <button type="button" class="modal__close" aria-label="Close">
          ${icon('x', 18)}
        </button>
      </div>
      <div class="modal__body">${bodyHtml || ''}</div>
      <div class="modal__footer">
        <button type="button" class="btn btn-secondary" data-modal-cancel>Cancel</button>
        <button type="button" class="btn ${confirmClass}" data-modal-confirm>${confirmText}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const closeBtn = overlay.querySelector('.modal__close');
  const cancelBtn = overlay.querySelector('[data-modal-cancel]');
  const confirmBtn = overlay.querySelector('[data-modal-confirm]');

  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);

  confirmBtn.addEventListener('click', () => {
    if (typeof onConfirm === 'function') {
      onConfirm();
    }
    closeModal();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });

  document.addEventListener('keydown', handleEscape);
}

function handleEscape(e) {
  if (e.key === 'Escape') {
    closeModal();
  }
}

/**
 * Closes and removes the currently open modal, if any.
 */
export function closeModal() {
  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay) {
    overlay.remove();
  }
  document.removeEventListener('keydown', handleEscape);
}
