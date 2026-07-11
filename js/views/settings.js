// views/settings.js
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
import { openModal } from '../components/modal.js';
import { ApiError } from '../api/client.js';
import { DashboardSocket } from '../ws/dashboardSocket.js';

export function template() {
  return `
    <div class="settings" id="settings-root">
      <h1>Settings</h1>

      <section class="card settings-card">
        <h2>Connections overview</h2>
        <div class="overview-list" id="overview-list">
          <div class="overview-row" data-row="bot">
            <span class="overview-row__icon" data-icon="cpu"></span>
            <span class="overview-row__label">Bot pairing</span>
            <span class="status-dot status-dot--pending" data-status="bot">checking…</span>
          </div>
          <div class="overview-row" data-row="database">
            <span class="overview-row__icon" data-icon="database"></span>
            <span class="overview-row__label">Database</span>
            <span class="status-dot status-dot--pending" data-status="database">checking…</span>
          </div>
          <div class="overview-row" data-row="ai">
            <span class="overview-row__icon" data-icon="cpu"></span>
            <span class="overview-row__label">AI provider</span>
            <span class="status-dot status-dot--pending" data-status="ai">checking…</span>
          </div>
          <div class="overview-row" data-row="gmail">
            <span class="overview-row__icon" data-icon="mail"></span>
            <span class="overview-row__label">Gmail</span>
            <span class="status-dot status-dot--pending" data-status="gmail">checking…</span>
          </div>
        </div>
      </section>

      <section class="card settings-card settings-card--detail">
        <h2>Bot pairing key</h2>
        <p class="settings-card__hint">This key pairs your desktop bot with your CareerOS account.</p>

        <div class="token-display" id="token-display">
          <span class="token-display__value" id="masked-token">••••••••••••••••</span>
        </div>

        <div class="copyable-box" id="new-token-box" hidden>
          <input class="input" type="text" id="new-token-input" readonly />
          <button type="button" class="btn btn-secondary copy-btn" id="copy-token-btn" aria-label="Copy token">
            <span data-icon="link"></span>
          </button>
        </div>
        <p class="settings-card__warning" id="new-token-warning" hidden>copy this now — you won't see it again.</p>

        <div class="settings-card__actions">
          <button type="button" class="btn btn-destructive" id="regenerate-key-btn">Regenerate key</button>
        </div>
      </section>

      <section class="card settings-card settings-card--detail">
        <h2>Data storage</h2>
        <p class="settings-card__hint">Choose where your application data lives.</p>

        <div class="option-grid">
          <button type="button" class="option-toggle" id="storage-option-our" data-value="our">
            <span class="toggle-box" data-toggle="our"></span>
            <span>Our database</span>
          </button>
          <button type="button" class="option-toggle" id="storage-option-own" data-value="own">
            <span class="toggle-box" data-toggle="own"></span>
            <span>My own MongoDB</span>
          </button>
        </div>

        <div class="reveal-section" id="mongo-url-section" hidden>
          <div class="input-group">
            <label class="input-label" for="mongo-url-input">MongoDB connection URL</label>
            <div class="password-field">
              <input class="input" type="password" id="mongo-url-input" placeholder="mongodb+srv://..." autocomplete="off" />
              <button type="button" class="password-field__toggle" id="mongo-url-toggle" aria-label="Show connection URL">
                <span data-icon="eye"></span>
              </button>
            </div>
          </div>
          <div class="settings-card__actions settings-card__actions--between">
            <span class="status-dot" id="storage-test-status"></span>
            <button type="button" class="btn btn-primary btn-small" id="test-save-storage-btn">Test &amp; save</button>
          </div>
        </div>
      </section>

      <section class="card settings-card settings-card--detail">
        <h2>AI provider</h2>
        <p class="settings-card__hint">Choose which AI provider generates your applications and emails.</p>

        <div class="option-grid">
          <button type="button" class="option-toggle" id="ai-option-ours" data-value="ours">
            <span class="toggle-box" data-toggle="ours"></span>
            <span>Use our AI</span>
          </button>
          <button type="button" class="option-toggle" id="ai-option-own" data-value="own">
            <span class="toggle-box" data-toggle="own"></span>
            <span>Bring your own key</span>
          </button>
        </div>

        <div class="reveal-section" id="ai-provider-section" hidden>
          <div class="input-group">
            <label class="input-label" for="ai-provider-select">Provider</label>
            <select class="input" id="ai-provider-select">
              <option value="groq">Groq</option>
              <option value="openai">OpenAI</option>
              <option value="claude">Claude</option>
            </select>
          </div>
          <div class="input-group">
            <label class="input-label" for="ai-api-key-input">API key</label>
            <div class="password-field">
              <input class="input" type="password" id="ai-api-key-input" placeholder="sk-..." autocomplete="off" />
              <button type="button" class="password-field__toggle" id="ai-api-key-toggle" aria-label="Show API key">
                <span data-icon="eye"></span>
              </button>
            </div>
          </div>
          <div class="settings-card__actions">
            <button type="button" class="btn btn-primary btn-small" id="save-ai-provider-btn">Save</button>
          </div>
        </div>
      </section>

      <section class="card settings-card settings-card--detail">
        <h2>Gmail</h2>
        <p class="settings-card__hint">Connect Gmail so CareerOS can watch for replies from recruiters.</p>

        <div id="gmail-disconnected-view">
          <button type="button" class="btn btn-primary" id="connect-gmail-btn">
            <span data-icon="mail"></span>
            <span>Connect Gmail</span>
          </button>
        </div>

        <div id="gmail-connected-view" hidden>
          <div class="gmail-status-row">
            <span class="gmail-status-row__email" id="gmail-connected-email"></span>
            <span class="status-dot status-dot--online">connected</span>
          </div>
          <p class="settings-card__hint" id="gmail-last-checked"></p>
          <div class="settings-card__actions">
            <button type="button" class="btn btn-secondary" id="scan-now-btn">Scan now</button>
            <button type="button" class="btn btn-destructive" id="disconnect-gmail-btn">Disconnect</button>
          </div>
        </div>
      </section>
    </div>
  `;
}

export function init(root) {
  root.querySelectorAll('[data-icon]').forEach((el) => {
    el.innerHTML = icon(el.dataset.icon, 18);
  });

  const maskedTokenEl = root.querySelector('#masked-token');
  const newTokenBox = root.querySelector('#new-token-box');
  const newTokenInput = root.querySelector('#new-token-input');
  const newTokenWarning = root.querySelector('#new-token-warning');
  const copyTokenBtn = root.querySelector('#copy-token-btn');
  const regenerateKeyBtn = root.querySelector('#regenerate-key-btn');

  const storageOptionOur = root.querySelector('#storage-option-our');
  const storageOptionOwn = root.querySelector('#storage-option-own');
  const mongoUrlSection = root.querySelector('#mongo-url-section');
  const mongoUrlInput = root.querySelector('#mongo-url-input');
  const mongoUrlToggle = root.querySelector('#mongo-url-toggle');
  const testSaveStorageBtn = root.querySelector('#test-save-storage-btn');
  const storageTestStatus = root.querySelector('#storage-test-status');

  const aiOptionOurs = root.querySelector('#ai-option-ours');
  const aiOptionOwn = root.querySelector('#ai-option-own');
  const aiProviderSection = root.querySelector('#ai-provider-section');
  const aiProviderSelect = root.querySelector('#ai-provider-select');
  const aiApiKeyInput = root.querySelector('#ai-api-key-input');
  const aiApiKeyToggle = root.querySelector('#ai-api-key-toggle');
  const saveAiProviderBtn = root.querySelector('#save-ai-provider-btn');

  const gmailDisconnectedView = root.querySelector('#gmail-disconnected-view');
  const gmailConnectedView = root.querySelector('#gmail-connected-view');
  const gmailConnectedEmail = root.querySelector('#gmail-connected-email');
  const gmailLastChecked = root.querySelector('#gmail-last-checked');
  const connectGmailBtn = root.querySelector('#connect-gmail-btn');
  const scanNowBtn = root.querySelector('#scan-now-btn');
  const disconnectGmailBtn = root.querySelector('#disconnect-gmail-btn');

  const settingsRoot = root.querySelector('#settings-root');

  const overviewStatus = {
    bot: root.querySelector('[data-status="bot"]'),
    database: root.querySelector('[data-status="database"]'),
    ai: root.querySelector('[data-status="ai"]'),
    gmail: root.querySelector('[data-status="gmail"]'),
  };

  function setOverviewStatus(key, text, dotModifier) {
    const el = overviewStatus[key];
    if (!el) return;
    el.textContent = text;
    el.className = `status-dot status-dot--${dotModifier}`;
  }

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
    if (settings.bot_online) {
      setOverviewStatus('bot', 'connected', 'online');
    } else {
      setOverviewStatus('bot', 'not paired', 'offline');
    }

    if (settings.storage_mode === 'own') {
      setOverviewStatus('database', 'self-hosted MongoDB', 'online');
    } else {
      setOverviewStatus('database', 'our database', 'online');
    }

    if (settings.ai_provider && settings.ai_provider !== 'ours') {
      setOverviewStatus('ai', settings.ai_provider, 'online');
    } else {
      setOverviewStatus('ai', 'using our AI', 'online');
    }

    if (settings.gmail_connected) {
      setOverviewStatus('gmail', 'connected', 'online');
    } else {
      setOverviewStatus('gmail', 'not connected', 'offline');
    }
  }

  function populateBotPairing(settings) {
    if (settings.masked_bot_token) {
      maskedTokenEl.textContent = settings.masked_bot_token;
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

  function wirePasswordToggle(input, toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      toggleBtn.innerHTML = icon(isHidden ? 'eye-off' : 'eye', 18);
      toggleBtn.setAttribute('aria-label', isHidden ? 'Hide value' : 'Show value');
    });
  }

  wirePasswordToggle(mongoUrlInput, mongoUrlToggle);
  wirePasswordToggle(aiApiKeyInput, aiApiKeyToggle);

  function setStorageOption(value) {
    storageOptionOur.classList.toggle('is-selected', value === 'our');
    storageOptionOwn.classList.toggle('is-selected', value === 'own');
    storageOptionOur.querySelector('.toggle-box').classList.toggle('is-checked', value === 'our');
    storageOptionOwn.querySelector('.toggle-box').classList.toggle('is-checked', value === 'own');
    mongoUrlSection.hidden = value !== 'own';
    mongoUrlInput.disabled = value !== 'own';
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

  function setAiOption(value) {
    aiOptionOurs.classList.toggle('is-selected', value === 'ours');
    aiOptionOwn.classList.toggle('is-selected', value === 'own');
    aiOptionOurs.querySelector('.toggle-box').classList.toggle('is-checked', value === 'ours');
    aiOptionOwn.querySelector('.toggle-box').classList.toggle('is-checked', value === 'own');
    aiProviderSection.hidden = value !== 'own';
    // Belt-and-braces: disable the inputs too, so they can't be typed into
    // even if the section is ever made visible via other means.
    aiProviderSelect.disabled = value !== 'own';
    aiApiKeyInput.disabled = value !== 'own';
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

  loadSettings();

  // Live bot pairing status — event-driven off /ws/dashboard's bot_status
  // events, no polling. GET /settings above only gives the initial snapshot;
  // this keeps it accurate afterwards without refetching.
  const socket = new DashboardSocket();
  socket.on('bot_status', (data) => {
    if (!data) return;
    if (data.online) {
      setOverviewStatus('bot', 'connected', 'online');
    } else {
      setOverviewStatus('bot', 'not paired', 'offline');
    }
  });
  socket.connect();

  // Returned to the router — called automatically when navigating away from this view.
  return () => {
    socket.disconnect();
  };
}
