// onboarding.js
import { requireAuth } from '../api/auth.js';
import { getProfile, updateProfile, uploadDocument, linkDocument, deleteDocument } from '../api/profile.js';
import { showToast } from '../components/toast.js';
import { icon } from '../components/icons.js';
import { renderSidebar, bindSidebarEvents } from '../components/sidebar.js';
import { ApiError } from '../api/client.js';

requireAuth();

// Render sidebar with no active nav item — onboarding is intentionally not part of the
// nav list (see master prompt), but we still show the sidebar so the user isn't trapped.
document.getElementById('page-layout').insertAdjacentHTML('afterbegin', renderSidebar(''));
bindSidebarEvents();

// ---- Element refs ----
const aboutTextarea = document.getElementById('about-textarea');
const charCounter = document.getElementById('char-counter');
const saveAboutBtn = document.getElementById('save-about-btn');

const tabUpload = document.getElementById('tab-upload');
const tabLink = document.getElementById('tab-link');
const modeUpload = document.getElementById('mode-upload');
const modeLink = document.getElementById('mode-link');

const uploadTitleInput = document.getElementById('upload-title-input');
const fileInput = document.getElementById('file-input');
const fileInputLabel = document.getElementById('file-input-label');
const fileInputWrapper = document.querySelector('.file-input-wrapper');
const uploadDocBtn = document.getElementById('upload-doc-btn');

const linkTitleInput = document.getElementById('link-title-input');
const linkUrlInput = document.getElementById('link-url-input');
const saveLinkBtn = document.getElementById('save-link-btn');

const docListEl = document.getElementById('doc-list');
const continueBtn = document.getElementById('continue-btn');

const MAX_CHARS = 2000;

// ---- State ----
let hasAboutParagraph = false;
let documents = [];

// ---- Character counter ----
function updateCharCounter() {
  const len = aboutTextarea.value.length;
  charCounter.textContent = `${len} / ${MAX_CHARS}`;
}

aboutTextarea.addEventListener('input', updateCharCounter);

// ---- Tab switching ----
function setTab(tab) {
  const isUpload = tab === 'upload';
  tabUpload.classList.toggle('is-active', isUpload);
  tabLink.classList.toggle('is-active', !isUpload);
  modeUpload.hidden = !isUpload;
  modeLink.hidden = isUpload;
}

tabUpload.addEventListener('click', () => setTab('upload'));
tabLink.addEventListener('click', () => setTab('link'));

// ---- File input label ----
fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (file) {
    fileInputLabel.textContent = file.name;
    fileInputWrapper.classList.add('has-file');
  } else {
    fileInputLabel.textContent = 'Choose a file';
    fileInputWrapper.classList.remove('has-file');
  }
});

// ---- Continue button gating ----
function updateContinueState() {
  const canContinue = hasAboutParagraph && documents.length > 0;
  continueBtn.disabled = !canContinue;
}

// ---- Document list rendering ----
function renderDocList() {
  if (documents.length === 0) {
    docListEl.innerHTML = `
      <div class="empty-state">
        ${icon('upload', 28)}
        <span class="empty-state__text">nothing here yet</span>
      </div>
    `;
    return;
  }

  docListEl.innerHTML = documents
    .map(
      (doc) => `
      <div class="doc-list__item" data-doc-id="${doc.id}">
        <span class="doc-list__item-title">${doc.title}</span>
        <button type="button" class="doc-list__item-delete" data-doc-id="${doc.id}" aria-label="Delete document">
          ${icon('trash', 16)}
        </button>
      </div>
    `
    )
    .join('');

  docListEl.querySelectorAll('.doc-list__item-delete').forEach((btn) => {
    btn.addEventListener('click', () => handleDeleteDocument(btn.dataset.docId));
  });
}

// ---- Load existing profile ----
async function loadProfile() {
  try {
    const profile = await getProfile();
    if (profile) {
      if (profile.about_paragraph) {
        aboutTextarea.value = profile.about_paragraph;
        hasAboutParagraph = true;
        updateCharCounter();
      }
      if (Array.isArray(profile.documents)) {
        documents = profile.documents;
      }
    }
  } catch (err) {
    // New user, likely no profile record yet — not an error state worth surfacing.
  }
  renderDocList();
  updateContinueState();
}

// ---- Save about paragraph ----
saveAboutBtn.addEventListener('click', async () => {
  const value = aboutTextarea.value.trim();
  if (!value) {
    showToast('Write a short paragraph about yourself first.', 'error');
    return;
  }

  saveAboutBtn.disabled = true;
  const originalText = saveAboutBtn.textContent;
  saveAboutBtn.textContent = 'Saving…';

  try {
    await updateProfile(value);
    hasAboutParagraph = true;
    updateContinueState();
    showToast('About you saved.', 'success');
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Could not save your profile.';
    showToast(message, 'error');
  } finally {
    saveAboutBtn.disabled = false;
    saveAboutBtn.textContent = originalText;
  }
});

// ---- Upload document (file) ----
uploadDocBtn.addEventListener('click', async () => {
  const title = uploadTitleInput.value.trim();
  const file = fileInput.files[0];

  if (!title || !file) {
    showToast('Add a title and choose a file.', 'error');
    return;
  }

  uploadDocBtn.disabled = true;
  const originalText = uploadDocBtn.textContent;
  uploadDocBtn.textContent = 'Uploading…';

  try {
    const result = await uploadDocument(file, title);
    const newDoc = result && result.id ? result : { id: Date.now().toString(), title };
    documents.push(newDoc);
    renderDocList();
    updateContinueState();
    showToast('Document uploaded.', 'success');

    uploadTitleInput.value = '';
    fileInput.value = '';
    fileInputLabel.textContent = 'Choose a file';
    fileInputWrapper.classList.remove('has-file');
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Could not upload document.';
    showToast(message, 'error');
  } finally {
    uploadDocBtn.disabled = false;
    uploadDocBtn.textContent = originalText;
  }
});

// ---- Save document (link) ----
saveLinkBtn.addEventListener('click', async () => {
  const title = linkTitleInput.value.trim();
  const url = linkUrlInput.value.trim();

  if (!title || !url) {
    showToast('Add a title and a URL.', 'error');
    return;
  }

  saveLinkBtn.disabled = true;
  const originalText = saveLinkBtn.textContent;
  saveLinkBtn.textContent = 'Saving…';

  try {
    const result = await linkDocument(url, title);
    const newDoc = result && result.id ? result : { id: Date.now().toString(), title };
    documents.push(newDoc);
    renderDocList();
    updateContinueState();
    showToast('Link saved.', 'success');

    linkTitleInput.value = '';
    linkUrlInput.value = '';
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Could not save link.';
    showToast(message, 'error');
  } finally {
    saveLinkBtn.disabled = false;
    saveLinkBtn.textContent = originalText;
  }
});

// ---- Delete document ----
async function handleDeleteDocument(id) {
  try {
    await deleteDocument(id);
    documents = documents.filter((doc) => doc.id !== id);
    renderDocList();
    updateContinueState();
    showToast('Document deleted.', 'success');
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Could not delete document.';
    showToast(message, 'error');
  }
}

// ---- Continue to dashboard ----
continueBtn.addEventListener('click', () => {
  if (continueBtn.disabled) return;
  window.location.href = '../app/app.html#/dashboard';
});

// ---- Init ----
loadProfile();
