// settings.js
import { requireAuth } from '../api/auth.js';
import {
  getSettings,
  regenerateBotToken,
  updateStorageMode,
  updateAiProvider,
  getGmailConnectUrl,
  disconnectGmail,
  triggerGmailScan,
} from '../api/settings.js';
import { showToast } from '../components/toast.js';
import { icon } from '../components/icons.js';
import { renderSidebar, bindSidebarEvents } from '../components/sidebar.js';
import { openModal } from '../components/modal.js';
import { ApiError } from '../api/client.js';

requireAuth();

document.getElementById('page-layout').insertAdjacentHTML('afterbegin', renderSidebar('settings'));
bindSidebarEvents();

// Render all static icon slots
document.querySelectorAll('[data-icon]').forEach((el) => {
  el.innerHTML = icon(el.dataset.icon, 18);
});

// ---- Element refs ----
const maskedTokenEl = document.getElementById('masked-token');
const newTokenBox = document.getElementById('new-token-box');
const newTokenInput = document.getElementById('new-token-input');
const newTokenWarning = document.getElementById('new-token-warning');
const copyTokenBtn = document.getElementById('copy-token-btn');
const regenerateKeyBtn = document.getElementById('regenerate-key-btn');

const storageOptionOur = document.getElementById('storage-option-our');
const storageOptionOwn = document.getElementById('storage-option-own');
const mongoUrlSection = document.getElementById('mongo-url-section');
const mongoUrlInput = document.getElementById('mongo-url-input');
const testSaveStorageBtn = document.getElementById('test-save-storage-btn');
const storageTestStatus = document.getElementById('storage-test-status');

const aiOptionOurs = document.getElementById('ai-option-ours');
const aiOptionOwn = document.getElementById('ai-option-own');
const aiProviderSection = document.getElementById('ai-provider-section');
const aiProviderSelect = document.getElementById('ai-provider-select');
const aiApiKeyInput = document.getElementById('ai-api-key-input');
const saveAiProviderBtn = document.getElementById('save-ai-provider-btn');

const gmailDisconnectedView = document.getElementById('gmail-disconnected-view');
const gmailConnectedView = document.getElementById('gmail-connected-view');
const gmailConnectedEmail = document.getElementById('gmail-connected-email');
const gmailLastChecked = document.getElementById('gmail-last-checked');
const connectGmailBtn = document.getElementById('connect-gmail-btn');
const scanNowBtn = document.getElementById('scan-now-btn');
const disconnectGmailBtn = document.getElementById('disconnect-gmail-btn');

const settingsRoot = document.getElementById('settings-root');

const overviewStatus = {
  bot: document.querySelector('[data-status="bot"]'),
  database: document.querySelector('[data-status="database"]'),
  ai: document.querySelector('[data-status="ai"]'),
  gmail: document.querySelector('[data-status="gmail"]'),
};

function setOverviewStatus(key, text, dotModifier) {
  const el = overviewStatus[key];
  if (!el) return;
  el.textContent = text;
  el.className = `status-dot status-dot--${dotModifier}`;
}

// ---- Load settings ----
async function loadSettings() {
  settingsRoot.classList.add('is-loading');
  try {
    const settings = await getSettings();
    populateOverview(settings);
    populateBotPairing(settings);
    populateStorage(settings);
    populateAiProvider(settings);
    populateGmail(settings);
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Could not load settings.';
    showToast(message, 'error');
  } finally {
    settingsRoot.classList.remove('is-loading');
  }
}

function populateOverview(settings) {
  // Bot pairing
  if (settings.bot_online) {
    setOverviewStatus('bot', 'connected', 'online');
  } else {
    setOverviewStatus('bot', 'not paired', 'offline');
  }

  // Database
  if (settings.storage_mode === 'own') {
    setOverviewStatus('database', 'self-hosted MongoDB', 'online');
  } else {
    setOverviewStatus('database', 'our database', 'online');
  }

  // AI provider
  if (settings.ai_provider && settings.ai_provider !== 'ours') {
    setOverviewStatus('ai', settings.ai_provider, 'online');
  } else {
    setOverviewStatus('ai', 'using our AI', 'online');
  }

  // Gmail
  if (settings.gmail_connected) {
    setOverviewStatus('gmail', 'connected', 'online');
  } else {
    setOverviewStatus('gmail', 'not connected', 'offline');
  }
}

function populateBotPairing(settings) {
  if (settings.bot_token_masked) {
    maskedTokenEl.textContent = settings.bot_token_masked;
  }
}

function populateStorage(settings) {
  const mode = settings.storage_mode || 'our';
  setStorageOption(mode);
  if (settings.mongo_url) {
    mongoUrlInput.value = settings.mongo_url;
  }
}

function populateAiProvider(settings) {
  const usesOwn = settings.ai_provider && settings.ai_provider !== 'ours';
  setAiOption(usesOwn ? 'own' : 'ours');
  if (usesOwn) {
    aiProviderSelect.value = settings.ai_provider;
  }
}

function populateGmail(settings) {
  if (settings.gmail_connected) {
    gmailDisconnectedView.hidden = true;
    gmailConnectedView.hidden = false;
    gmailConnectedEmail.textContent = settings.gmail_email || '';
    gmailLastChecked.textContent = settings.gmail_last_checked
      ? `Last checked: ${settings.gmail_last_checked}`
      : '';
  } else {
    gmailDisconnectedView.hidden = false;
    gmailConnectedView.hidden = true;
  }
}

// ---- Bot pairing key: regenerate flow ----
regenerateKeyBtn.addEventListener('click', () => {
  openModal({
    title: 'Regenerate pairing key',
    bodyHtml: '<p>This will disconnect your current bot, continue?</p>',
    confirmText: 'Regenerate',
    destructive: true,
    onConfirm: handleRegenerateToken,
  });
});

async function handleRegenerateToken() {
  try {
    const result = await regenerateBotToken();
    if (result && result.token) {
      newTokenInput.value = result.token;
      newTokenBox.hidden = false;
      newTokenWarning.hidden = false;
    }
    showToast('Pairing key regenerated.', 'success');
    setOverviewStatus('bot', 'not paired', 'offline');
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Could not regenerate key.';
    showToast(message, 'error');
  }
}

copyTokenBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(newTokenInput.value);
    showToast('Copied to clipboard.', 'success');
  } catch (err) {
    newTokenInput.select();
    showToast('Select and copy the key manually.', 'info');
  }
});

// ---- Storage mode ----
function setStorageOption(value) {
  storageOptionOur.classList.toggle('is-selected', value === 'our');
  storageOptionOwn.classList.toggle('is-selected', value === 'own');
  storageOptionOur.querySelector('.toggle-box').classList.toggle('is-checked', value === 'our');
  storageOptionOwn.querySelector('.toggle-box').classList.toggle('is-checked', value === 'own');
  mongoUrlSection.hidden = value !== 'own';
}

storageOptionOur.addEventListener('click', () => setStorageOption('our'));
storageOptionOwn.addEventListener('click', () => setStorageOption('own'));

testSaveStorageBtn.addEventListener('click', async () => {
  const mongoUrl = mongoUrlInput.value.trim();
  if (!mongoUrl) {
    showToast('Enter a MongoDB connection URL.', 'error');
    return;
  }

  testSaveStorageBtn.disabled = true;
  const originalText = testSaveStorageBtn.textContent;
  testSaveStorageBtn.textContent = 'Testing…';
  storageTestStatus.className = 'status-dot status-dot--pending';
  storageTestStatus.textContent = 'testing…';

  try {
    await updateStorageMode('own', mongoUrl);
    storageTestStatus.className = 'status-dot status-dot--online';
    storageTestStatus.textContent = 'connected';
    setOverviewStatus('database', 'self-hosted MongoDB', 'online');
    showToast('Storage settings saved.', 'success');
  } catch (err) {
    storageTestStatus.className = 'status-dot status-dot--failed';
    storageTestStatus.textContent = 'connection failed';
    const message = err instanceof ApiError ? err.message : 'Could not connect to MongoDB.';
    showToast(message, 'error');
  } finally {
    testSaveStorageBtn.disabled = false;
    testSaveStorageBtn.textContent = originalText;
  }
});

// ---- AI provider ----
function setAiOption(value) {
  aiOptionOurs.classList.toggle('is-selected', value === 'ours');
  aiOptionOwn.classList.toggle('is-selected', value === 'own');
  aiOptionOurs.querySelector('.toggle-box').classList.toggle('is-checked', value === 'ours');
  aiOptionOwn.querySelector('.toggle-box').classList.toggle('is-checked', value === 'own');
  aiProviderSection.hidden = value !== 'own';
}

aiOptionOurs.addEventListener('click', async () => {
  setAiOption('ours');
  try {
    await updateAiProvider('ours');
    setOverviewStatus('ai', 'using our AI', 'online');
    showToast('AI provider updated.', 'success');
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Could not update AI provider.';
    showToast(message, 'error');
  }
});

aiOptionOwn.addEventListener('click', () => setAiOption('own'));

saveAiProviderBtn.addEventListener('click', async () => {
  const provider = aiProviderSelect.value;
  const apiKey = aiApiKeyInput.value.trim();

  if (!apiKey) {
    showToast('Enter an API key.', 'error');
    return;
  }

  saveAiProviderBtn.disabled = true;
  const originalText = saveAiProviderBtn.textContent;
  saveAiProviderBtn.textContent = 'Saving…';

  try {
    await updateAiProvider(provider, apiKey);
    setOverviewStatus('ai', provider, 'online');
    showToast('AI provider saved.', 'success');
    aiApiKeyInput.value = '';
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Could not save AI provider.';
    showToast(message, 'error');
  } finally {
    saveAiProviderBtn.disabled = false;
    saveAiProviderBtn.textContent = originalText;
  }
});

// ---- Gmail ----
connectGmailBtn.addEventListener('click', async () => {
  connectGmailBtn.disabled = true;
  try {
    const result = await getGmailConnectUrl();
    if (result && result.oauth_url) {
      window.location.href = result.oauth_url;
    } else {
      showToast('Could not get Gmail connect URL.', 'error');
      connectGmailBtn.disabled = false;
    }
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Could not connect Gmail.';
    showToast(message, 'error');
    connectGmailBtn.disabled = false;
  }
});

scanNowBtn.addEventListener('click', async () => {
  scanNowBtn.disabled = true;
  const originalText = scanNowBtn.textContent;
  scanNowBtn.textContent = 'Scanning…';

  try {
    await triggerGmailScan();
    showToast('Gmail scan started.', 'success');
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Could not start Gmail scan.';
    showToast(message, 'error');
  } finally {
    scanNowBtn.disabled = false;
    scanNowBtn.textContent = originalText;
  }
});

disconnectGmailBtn.addEventListener('click', () => {
  openModal({
    title: 'Disconnect Gmail',
    bodyHtml: '<p>CareerOS will stop scanning for recruiter replies. Continue?</p>',
    confirmText: 'Disconnect',
    destructive: true,
    onConfirm: handleDisconnectGmail,
  });
});

async function handleDisconnectGmail() {
  try {
    await disconnectGmail();
    gmailDisconnectedView.hidden = false;
    gmailConnectedView.hidden = true;
    setOverviewStatus('gmail', 'not connected', 'offline');
    showToast('Gmail disconnected.', 'success');
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Could not disconnect Gmail.';
    showToast(message, 'error');
  }
}

// ---- Init ----
loadSettings();
