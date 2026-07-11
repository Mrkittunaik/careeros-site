// views/chat.js
import { getConversations, createConversation, deleteConversation, getConversationHistory, getChatHistory, sendChatMessage } from '../api/chat.js';
import { showToast } from '../components/toast.js';
import { icon } from '../components/icons.js';
import { ApiError } from '../api/client.js';

export function template() {
  return `
    <div class="chat-view">
      <aside class="chat-sidebar" id="chat-sidebar">
        <button class="btn btn-primary chat-sidebar__new" id="chat-new-btn">
          ${icon('plus', 16)}
          <span>New chat</span>
        </button>
        <div class="chat-sidebar__list" id="chat-thread-list">
          <div class="chat-sidebar__loading">Loading…</div>
        </div>
      </aside>

      <section class="chat-main">
        <header class="chat-topbar">
          <div class="chat-topbar__left">
            <button class="chat-topbar__menu-btn" id="chat-sidebar-toggle" aria-label="Toggle chat history">
              ${icon('message-square', 18)}
            </button>
            <div>
              <h1 id="chat-thread-title">Chat</h1>
              <p class="chat-view__subtitle" id="chat-thread-subtitle">Tell it what you're looking for — e.g. "Find me backend engineer jobs on LinkedIn and Indeed".</p>
            </div>
          </div>
          <div class="chat-status" id="chat-status">
            <span class="chat-status__dot chat-status__dot--online" id="chat-status-dot"></span>
            <span id="chat-status-text">Online</span>
          </div>
        </header>

        <div class="chat-card">
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
        </div>
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

function formatThreadTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function init(root) {
  const sidebar = root.querySelector('#chat-sidebar');
  const sidebarToggle = root.querySelector('#chat-sidebar-toggle');
  const threadListEl = root.querySelector('#chat-thread-list');
  const newChatBtn = root.querySelector('#chat-new-btn');
  const threadTitleEl = root.querySelector('#chat-thread-title');
  const threadSubtitleEl = root.querySelector('#chat-thread-subtitle');

  const statusDot = root.querySelector('#chat-status-dot');
  const statusText = root.querySelector('#chat-status-text');

  const messagesEl = root.querySelector('#chat-messages');
  const emptyEl = root.querySelector('#chat-empty');
  const typingEl = root.querySelector('#chat-typing');
  const composer = root.querySelector('#chat-composer');
  const input = root.querySelector('#chat-input');
  const sendBtn = root.querySelector('#chat-send-btn');

  let lastRole = null;
  let currentConversationId = null;
  let conversations = [];

  // ---- online/offline status (browser connectivity) ----
  function setStatus(state) {
    // state: 'online' | 'offline' | 'sending'
    statusDot.className = `chat-status__dot chat-status__dot--${state === 'sending' ? 'online' : state}`;
    if (state === 'online') statusText.textContent = 'Online';
    else if (state === 'offline') statusText.textContent = 'Offline';
    else if (state === 'sending') statusText.textContent = 'Sending…';
  }
  window.addEventListener('online', () => setStatus('online'));
  window.addEventListener('offline', () => setStatus('offline'));
  setStatus(navigator.onLine === false ? 'offline' : 'online');

  // ---- sidebar collapse (mobile) ----
  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('chat-sidebar--open');
  });

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function clearMessages() {
    messagesEl.innerHTML = `
      <div class="chat-empty" id="chat-empty">
        ${icon('message-square', 32)}
        <p>Ask for a job search, or just say hi.</p>
      </div>
    `;
    lastRole = null;
  }

  function renderMessage(role, content, createdAt) {
    const emptyNode = messagesEl.querySelector('#chat-empty');
    if (emptyNode) emptyNode.remove();

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

  // ---- sidebar thread list ----
  function renderThreadList() {
    if (conversations.length === 0) {
      threadListEl.innerHTML = `<div class="chat-sidebar__empty">No past chats yet</div>`;
      return;
    }

    threadListEl.innerHTML = '';
    conversations.forEach((c) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = `chat-thread-item${c.id === currentConversationId ? ' chat-thread-item--active' : ''}`;
      item.dataset.id = c.id;
      item.innerHTML = `
        <span class="chat-thread-item__icon">${icon('message-square', 14)}</span>
        <span class="chat-thread-item__body">
          <span class="chat-thread-item__title"></span>
          <span class="chat-thread-item__time"></span>
        </span>
        <span class="chat-thread-item__delete" data-delete="${c.id}" aria-label="Delete chat">${icon('trash', 13)}</span>
      `;
      item.querySelector('.chat-thread-item__title').textContent = c.title || 'New chat';
      item.querySelector('.chat-thread-item__time').textContent = formatThreadTime(c.updated_at);

      item.addEventListener('click', (e) => {
        if (e.target.closest('[data-delete]')) return;
        openConversation(c.id);
        sidebar.classList.remove('chat-sidebar--open');
      });

      item.querySelector('[data-delete]').addEventListener('click', async (e) => {
        e.stopPropagation();
        await handleDeleteThread(c.id);
      });

      threadListEl.appendChild(item);
    });
  }

  async function handleDeleteThread(id) {
    const wasActive = id === currentConversationId;
    try {
      await deleteConversation(id);
      conversations = conversations.filter((c) => c.id !== id);
      renderThreadList();
      if (wasActive) {
        if (conversations.length > 0) {
          openConversation(conversations[0].id);
        } else {
          startNewChatLocal();
        }
      }
      showToast('Chat deleted.', 'success');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not delete chat.';
      showToast(message, 'error');
    }
  }

  function updateHeaderForThread() {
    const active = conversations.find((c) => c.id === currentConversationId);
    threadTitleEl.textContent = active && active.title ? active.title : 'New chat';
    threadSubtitleEl.textContent = 'Tell it what you\'re looking for — e.g. "Find me backend engineer jobs on LinkedIn and Indeed".';
  }

  async function openConversation(id) {
    currentConversationId = id;
    clearMessages();
    renderThreadList();
    updateHeaderForThread();
    try {
      const history = await getConversationHistory(id);
      if (history && history.length > 0) {
        history.forEach((m) => renderMessage(m.role, m.content, m.created_at));
      }
    } catch (err) {
      // Thread may have just been created client-side with nothing sent
      // yet — no messages is a fine state, don't toast an error for it.
    }
  }

  function startNewChatLocal() {
    // Don't hit the create-conversation endpoint until the user actually
    // sends a message — an empty "New chat" thread with nothing in it
    // isn't worth persisting or cluttering the sidebar with.
    currentConversationId = null;
    clearMessages();
    renderThreadList();
    threadTitleEl.textContent = 'New chat';
    input.focus();
  }

  newChatBtn.addEventListener('click', () => {
    startNewChatLocal();
    sidebar.classList.remove('chat-sidebar--open');
  });

  async function loadConversations() {
    try {
      conversations = await getConversations();
    } catch (err) {
      conversations = [];
    }

    if (conversations.length === 0) {
      // Nothing yet — fall back to legacy single-thread history (messages
      // written before conversations existed), shown as a read-only-ish
      // starting thread so returning users don't lose context.
      try {
        const legacy = await getChatHistory();
        if (legacy && legacy.length > 0) {
          renderThreadList();
          legacy.forEach((m) => renderMessage(m.role, m.content, m.created_at));
          threadTitleEl.textContent = 'Chat';
          return;
        }
      } catch (err) {
        // no legacy history either — totally fresh user, fine
      }
      renderThreadList();
      startNewChatLocal();
      return;
    }

    renderThreadList();
    openConversation(conversations[0].id);
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
    setStatus('sending');

    try {
      const result = await sendChatMessage(text, currentConversationId);
      showTyping(false);
      setStatus(navigator.onLine === false ? 'offline' : 'online');
      renderMessage('assistant', result.reply, result.created_at || new Date().toISOString());
      if (result.intent === 'job_search' && result.job_request_id) {
        renderJobConfirmation(result);
      }

      const isNewThread = !currentConversationId;
      currentConversationId = result.conversation_id || currentConversationId;

      if (isNewThread && currentConversationId) {
        // Thread was just created server-side on first send — refresh the
        // sidebar list so it shows up with its auto-generated title.
        try {
          conversations = await getConversations();
        } catch (err) {
          // non-fatal — sidebar just won't reflect the new thread until next load
        }
        renderThreadList();
        updateHeaderForThread();
      } else {
        // Bump this thread to the top / refresh its title+time in the list
        // without a full reload.
        const idx = conversations.findIndex((c) => c.id === currentConversationId);
        if (idx !== -1) {
          const [c] = conversations.splice(idx, 1);
          c.updated_at = result.created_at || new Date().toISOString();
          conversations.unshift(c);
          renderThreadList();
        }
      }
    } catch (err) {
      showTyping(false);
      setStatus(navigator.onLine === false ? 'offline' : 'online');
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

  loadConversations();
  input.focus();
}
