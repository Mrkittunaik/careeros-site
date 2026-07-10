// views/profile.js
import { getProfile, updateProfile, uploadDocument, linkDocument, deleteDocument } from '../api/profile.js';
import { showToast } from '../components/toast.js';
import { icon } from '../components/icons.js';
import { openModal } from '../components/modal.js';
import { ApiError } from '../api/client.js';

export function template() {
  return `
    <div class="profile" id="profile-root">
      <h1>Profile</h1>

      <!-- About -->
      <section class="card profile-card">
        <h2>About you</h2>
        <p class="settings-card__hint">This is used by the AI to tailor applications and emails to recruiters.</p>

        <div class="input-group">
          <label class="input-label" for="about-input">About paragraph</label>
          <textarea class="input profile-textarea" id="about-input" rows="5" placeholder="A short summary of your background, skills, and what you're looking for."></textarea>
        </div>

        <div class="settings-card__actions">
          <button type="button" class="btn btn-primary btn-small" id="save-about-btn">Save</button>
        </div>
      </section>

      <!-- Locked key-style fields -->
      <section class="card profile-card">
        <h2>Account keys</h2>
        <p class="settings-card__hint">These identify your account and cannot be edited once set. Use view to check the value.</p>

        <div class="key-field" data-key-field="account-id">
          <label class="input-label">Account ID</label>
          <div class="key-box">
            <span class="key-box__value" data-key-value data-key-masked="••••••••••••••••" data-key-real="">••••••••••••••••</span>
            <button type="button" class="key-box__toggle" data-key-toggle aria-label="Show value">
              <span data-toggle-icon></span>
            </button>
          </div>
        </div>

        <div class="key-field" data-key-field="referral-code">
          <label class="input-label">Referral code</label>
          <div class="key-box">
            <span class="key-box__value" data-key-value data-key-masked="••••••••••••••••" data-key-real="">••••••••••••••••</span>
            <button type="button" class="key-box__toggle" data-key-toggle aria-label="Show value">
              <span data-toggle-icon></span>
            </button>
          </div>
        </div>
      </section>

      <!-- Documents -->
      <section class="card profile-card">
        <h2>Documents</h2>
        <p class="settings-card__hint">Resumes, cover letters, or portfolio links used during applications.</p>

        <div class="skeleton-stack" id="documents-skeleton">
          <div class="skeleton" style="height: 44px;"></div>
        </div>

        <div id="documents-list-wrap" hidden>
          <div class="documents-list" id="documents-list"></div>
        </div>

        <div class="empty-state" id="documents-empty" hidden>
          <span id="documents-empty-icon"></span>
          <span class="empty-state__text">no documents yet</span>
        </div>

        <div class="profile-add-document">
          <div class="option-grid">
            <button type="button" class="option-toggle" id="doc-mode-upload" data-value="upload">
              <span class="toggle-box" data-toggle="upload"></span>
              <span>Upload file</span>
            </button>
            <button type="button" class="option-toggle" id="doc-mode-link" data-value="link">
              <span class="toggle-box" data-toggle="link"></span>
              <span>Add link</span>
            </button>
          </div>

          <div class="input-group">
            <label class="input-label" for="doc-title-input">Title</label>
            <input class="input" type="text" id="doc-title-input" placeholder="e.g. Resume 2026" />
          </div>

          <div class="reveal-section" id="doc-upload-section">
            <div class="input-group">
              <label class="input-label" for="doc-file-input">File</label>
              <input class="input" type="file" id="doc-file-input" />
            </div>
          </div>

          <div class="reveal-section" id="doc-link-section" hidden>
            <div class="input-group">
              <label class="input-label" for="doc-link-input">Link</label>
              <input class="input" type="text" id="doc-link-input" placeholder="https://..." />
            </div>
          </div>

          <div class="settings-card__actions">
            <button type="button" class="btn btn-primary btn-small" id="add-document-btn">Add document</button>
          </div>
        </div>
      </section>
    </div>
  `;
}

export function init(root) {
  const aboutInput = root.querySelector('#about-input');
  const saveAboutBtn = root.querySelector('#save-about-btn');

  const documentsSkeleton = root.querySelector('#documents-skeleton');
  const documentsListWrap = root.querySelector('#documents-list-wrap');
  const documentsList = root.querySelector('#documents-list');
  const documentsEmpty = root.querySelector('#documents-empty');
  const documentsEmptyIcon = root.querySelector('#documents-empty-icon');

  const docModeUpload = root.querySelector('#doc-mode-upload');
  const docModeLink = root.querySelector('#doc-mode-link');
  const docUploadSection = root.querySelector('#doc-upload-section');
  const docLinkSection = root.querySelector('#doc-link-section');
  const docTitleInput = root.querySelector('#doc-title-input');
  const docFileInput = root.querySelector('#doc-file-input');
  const docLinkInput = root.querySelector('#doc-link-input');
  const addDocumentBtn = root.querySelector('#add-document-btn');

  documentsEmptyIcon.innerHTML = icon('briefcase', 28);

  let docMode = 'upload';
  let documents = [];

  // ---- Locked key fields: view/hide toggle, never editable ----
  root.querySelectorAll('[data-key-field]').forEach((fieldEl) => {
    const valueEl = fieldEl.querySelector('[data-key-value]');
    const toggleBtn = fieldEl.querySelector('[data-key-toggle]');
    const toggleIconEl = fieldEl.querySelector('[data-toggle-icon]');

    toggleIconEl.innerHTML = icon('compass', 16); // placeholder replaced below once state known
    setToggleIcon(toggleIconEl, false);

    toggleBtn.addEventListener('click', () => {
      const isShown = valueEl.dataset.shown === 'true';
      const real = valueEl.dataset.keyReal;

      if (!isShown) {
        if (!real) {
          showToast('No value set for this field.', 'info');
          return;
        }
        valueEl.textContent = real;
        valueEl.dataset.shown = 'true';
        setToggleIcon(toggleIconEl, true);
      } else {
        valueEl.textContent = valueEl.dataset.keyMasked;
        valueEl.dataset.shown = 'false';
        setToggleIcon(toggleIconEl, false);
      }
    });
  });

  function setToggleIcon(el, shown) {
    el.innerHTML = icon(shown ? 'x-circle' : 'compass', 16);
    el.parentElement.setAttribute('aria-label', shown ? 'Hide value' : 'Show value');
  }

  function setKeyFieldValue(key, value) {
    const fieldEl = root.querySelector(`[data-key-field="${key}"]`);
    if (!fieldEl) return;
    const valueEl = fieldEl.querySelector('[data-key-value]');
    valueEl.dataset.keyReal = value || '';
    // stays masked until the user explicitly requests to view it
  }

  // ---- About ----
  async function loadProfile() {
    try {
      const profile = await getProfile();
      aboutInput.value = (profile && profile.about_paragraph) || '';
      setKeyFieldValue('account-id', profile && profile.account_id);
      setKeyFieldValue('referral-code', profile && profile.referral_code);

      documents = (profile && profile.documents) || [];
      renderDocuments();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not load profile.';
      showToast(message, 'error');
      documentsSkeleton.hidden = true;
      documentsEmpty.hidden = false;
    }
  }

  saveAboutBtn.addEventListener('click', async () => {
    const value = aboutInput.value.trim();
    saveAboutBtn.disabled = true;
    const originalText = saveAboutBtn.textContent;
    saveAboutBtn.textContent = 'Saving…';

    try {
      await updateProfile(value);
      showToast('Profile updated.', 'success');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not save profile.';
      showToast(message, 'error');
    } finally {
      saveAboutBtn.disabled = false;
      saveAboutBtn.textContent = originalText;
    }
  });

  // ---- Documents ----
  function renderDocuments() {
    documentsSkeleton.hidden = true;

    if (documents.length === 0) {
      documentsListWrap.hidden = true;
      documentsEmpty.hidden = false;
      return;
    }

    documentsListWrap.hidden = false;
    documentsEmpty.hidden = true;

    documentsList.innerHTML = documents.map(documentRow).join('');

    documentsList.querySelectorAll('[data-delete-doc-id]').forEach((btn) => {
      btn.addEventListener('click', () => confirmDeleteDocument(btn.dataset.deleteDocId));
    });
  }

  function documentRow(doc) {
    return `
      <div class="documents-list__item" data-doc-id="${doc.id}">
        <span class="documents-list__icon">${icon(doc.link ? 'link' : 'upload', 16)}</span>
        <span class="documents-list__title">${doc.title || 'Untitled'}</span>
        ${doc.link ? `<a class="cell-link" href="${doc.link}" target="_blank" rel="noopener noreferrer" aria-label="Open document">${icon('external-link', 16)}</a>` : ''}
        <button type="button" class="documents-list__delete" data-delete-doc-id="${doc.id}" aria-label="Delete document">
          ${icon('trash', 16)}
        </button>
      </div>
    `;
  }

  function confirmDeleteDocument(docId) {
    openModal({
      title: 'Delete document',
      bodyHtml: '<p>This document will be removed from your profile. Continue?</p>',
      confirmText: 'Delete',
      destructive: true,
      onConfirm: () => handleDeleteDocument(docId),
    });
  }

  async function handleDeleteDocument(docId) {
    try {
      await deleteDocument(docId);
      documents = documents.filter((d) => String(d.id) !== String(docId));
      renderDocuments();
      showToast('Document deleted.', 'success');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not delete document.';
      showToast(message, 'error');
    }
  }

  function setDocMode(value) {
    docMode = value;
    docModeUpload.classList.toggle('is-selected', value === 'upload');
    docModeLink.classList.toggle('is-selected', value === 'link');
    docModeUpload.querySelector('.toggle-box').classList.toggle('is-checked', value === 'upload');
    docModeLink.querySelector('.toggle-box').classList.toggle('is-checked', value === 'link');
    docUploadSection.hidden = value !== 'upload';
    docLinkSection.hidden = value !== 'link';
  }

  docModeUpload.addEventListener('click', () => setDocMode('upload'));
  docModeLink.addEventListener('click', () => setDocMode('link'));
  setDocMode('upload');

  addDocumentBtn.addEventListener('click', async () => {
    const title = docTitleInput.value.trim();
    if (!title) {
      showToast('Enter a title.', 'error');
      return;
    }

    addDocumentBtn.disabled = true;
    const originalText = addDocumentBtn.textContent;
    addDocumentBtn.textContent = 'Adding…';

    try {
      let result;
      if (docMode === 'upload') {
        const file = docFileInput.files && docFileInput.files[0];
        if (!file) {
          showToast('Choose a file.', 'error');
          return;
        }
        result = await uploadDocument(file, title);
      } else {
        const link = docLinkInput.value.trim();
        if (!link) {
          showToast('Enter a link.', 'error');
          return;
        }
        result = await linkDocument(link, title);
      }

      if (result) {
        documents.unshift(result);
        renderDocuments();
      }

      docTitleInput.value = '';
      docFileInput.value = '';
      docLinkInput.value = '';
      showToast('Document added.', 'success');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not add document.';
      showToast(message, 'error');
    } finally {
      addDocumentBtn.disabled = false;
      addDocumentBtn.textContent = originalText;
    }
  });

  loadProfile();
}
