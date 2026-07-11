// views/chat.js
import { getChatHistory, sendChatMessage } from '../api/chat.js';
import { showToast } from '../components/toast.js';
import { icon } from '../components/icons.js';
import { ApiError } from '../api/client.js';

export function template() {
  return `
    <div class="chat-view">
      <h1>Chat</h1>
      <p class="chat-view__subtitle">Tell it what you're looking for — e.g. "Find me backend engineer jobs on LinkedIn and Indeed".</p>

      <section class="card chat-card">
        <div class="chat-messages" id="chat-messages">
          <div class="chat-empty" id="chat-empty">
            ${icon('message-square', 32)}
            <p>Ask for a job search, or just say hi.</p>
          </div>
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

export function init(root) {
  const messagesEl = root.querySelector('#chat-messages');
  const emptyEl = root.querySelector('#chat-empty');
  const composer = root.querySelector('#chat-composer');
  const input = root.querySelector('#chat-input');
  const sendBtn = root.querySelector('#chat-send-btn');

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function renderMessage(role, content) {
    if (emptyEl) emptyEl.remove();
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble chat-bubble--${role === 'user' ? 'user' : 'assistant'}`;
    bubble.textContent = content;
    messagesEl.appendChild(bubble);
    scrollToBottom();
  }

  function renderJobConfirmation(data) {
    const note = document.createElement('div');
    note.className = 'chat-job-note';
    const sites = (data.target_sites || []).join(', ');
    note.innerHTML = `
      ${icon('briefcase', 16)}
      <span>Job search queued — <strong>${escapeHtml(data.job_type || '')}</strong> (${escapeHtml(data.experience_level || 'any')}) on ${escapeHtml(sites)}</span>
    `;
    messagesEl.appendChild(note);
    scrollToBottom();
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  async function loadHistory() {
    try {
      const history = await getChatHistory();
      if (history && history.length > 0) {
        history.forEach((m) => renderMessage(m.role, m.content));
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

    renderMessage('user', text);
    input.value = '';
    input.disabled = true;
    sendBtn.disabled = true;

    try {
      const result = await sendChatMessage(text);
      renderMessage('assistant', result.reply);
      if (result.intent === 'job_search' && result.job_request_id) {
        renderJobConfirmation(result);
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not send message.';
      showToast(message, 'error');
      renderMessage('assistant', "Sorry, something went wrong on my end — please try again.");
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
