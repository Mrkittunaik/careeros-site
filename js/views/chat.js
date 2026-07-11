// views/chat.js
import { getChatHistory, sendChatMessage } from '../api/chat.js';
import { showToast } from '../components/toast.js';
import { icon } from '../components/icons.js';
import { ApiError } from '../api/client.js';

export function template() {
  return `
    <div class="chat-view">
      <header class="chat-view__header">
        <h1>Chat</h1>
        <p class="chat-view__subtitle">Tell it what you're looking for — e.g. "Find me backend engineer jobs on LinkedIn and Indeed".</p>
      </header>

      <section class="chat-card">
        <div class="chat-messages" id="chat-messages">
          <div class="chat-empty" id="chat-empty">
            ${icon('message-square', 32)}
            <p>Ask for a job search, or just say hi.</p>
          </div>
        </div>

        <div class="chat-typing" id="chat-typing" hidden>
          <span class="chat-avatar chat-avatar--assistant">${icon('message-square', 14)}</span>
          <span class="chat-typing__dots"><span></span><span></span><span></span></span>
        </div>

        <form class="chat-composer" id="chat-composer">
          <input
            class="input chat-composer__input"
            type="text"
            id="chat-input"
            placeholder="Type a message…"
            autocomplete="off"
          />
          <button type="submit" class="btn btn-primary chat-composer__send" id="chat-send-btn" aria-label="Send">
            ${icon('send', 18)}
          </button>
        </form>
      </section>
    </div>
  `;
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function init(root) {
  const messagesEl = root.querySelector('#chat-messages');
  const emptyEl = root.querySelector('#chat-empty');
  const typingEl = root.querySelector('#chat-typing');
  const composer = root.querySelector('#chat-composer');
  const input = root.querySelector('#chat-input');
  const sendBtn = root.querySelector('#chat-send-btn');

  let lastRole = null;

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function renderMessage(role, content, createdAt) {
    if (emptyEl) emptyEl.remove();

    const row = document.createElement('div');
    row.className = `chat-row chat-row--${role === 'user' ? 'user' : 'assistant'}`;

    const showAvatar = role !== lastRole;
    lastRole = role;

    row.innerHTML = `
      ${role === 'assistant' && showAvatar ? `<span class="chat-avatar chat-avatar--assistant">${icon('message-square', 14)}</span>` : '<span class="chat-avatar chat-avatar--spacer"></span>'}
      <div class="chat-bubble-group">
        <div class="chat-bubble chat-bubble--${role}"></div>
        ${createdAt ? `<span class="chat-timestamp">${formatTime(createdAt)}</span>` : ''}
      </div>
    `;
    row.querySelector('.chat-bubble').textContent = content;

    messagesEl.appendChild(row);
    scrollToBottom();
  }

  function renderJobConfirmation(data) {
    const note = document.createElement('div');
    note.className = 'chat-job-note';
    const sites = (data.target_sites || []).join(', ');
    note.innerHTML = `
      ${icon('briefcase', 16)}
      <span>Job search queued — <strong></strong> (<span class="chat-job-note__exp"></span>) on <span class="chat-job-note__sites"></span></span>
    `;
    note.querySelector('strong').textContent = data.job_type || '';
    note.querySelector('.chat-job-note__exp').textContent = data.experience_level || 'any';
    note.querySelector('.chat-job-note__sites').textContent = sites;
    messagesEl.appendChild(note);
    lastRole = null;
    scrollToBottom();
  }

  function showTyping(visible) {
    typingEl.hidden = !visible;
    if (visible) scrollToBottom();
  }

  async function loadHistory() {
    try {
      const history = await getChatHistory();
      if (history && history.length > 0) {
        history.forEach((m) => renderMessage(m.role, m.content, m.created_at));
      }
    } catch (err) {
      // Silent — an empty chat with no history is a fine starting state,
      // no need to toast an error for what's likely just a first-time user.
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    renderMessage('user', text, new Date().toISOString());
    input.value = '';
    input.disabled = true;
    sendBtn.disabled = true;
    showTyping(true);

    try {
      const result = await sendChatMessage(text);
      showTyping(false);
      renderMessage('assistant', result.reply, result.created_at || new Date().toISOString());
      if (result.intent === 'job_search' && result.job_request_id) {
        renderJobConfirmation(result);
      }
    } catch (err) {
      showTyping(false);
      const message = err instanceof ApiError ? err.message : 'Could not send message.';
      showToast(message, 'error');
      renderMessage('assistant', "Sorry, something went wrong on my end — please try again.", new Date().toISOString());
    } finally {
      input.disabled = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  composer.addEventListener('submit', handleSend);

  loadHistory();
  input.focus();
}
