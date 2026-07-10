// dashboardSocket.js
import { API_BASE } from '../api/client.js';
import { getToken, logout } from '../api/auth.js';

const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;

// Known event types this socket dispatches
const EVENT_TYPES = [
  'bot_status',
  'job_progress_update',
  'hr_contact_added',
  'daily_counter_update',
  'application_reply_received',
];

// WebSocket close codes/reasons that indicate an auth problem
const AUTH_CLOSE_CODES = new Set([4001, 4003, 1008]);
const AUTH_REASON_KEYWORDS = ['auth', 'unauthorized', 'token', 'forbidden'];

/**
 * Derives the ws:// or wss:// base URL from API_BASE (http(s) -> ws(s), strips /api/v1 path).
 */
function deriveWsBase() {
  const url = new URL(API_BASE);
  const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${url.host}`;
}

export class DashboardSocket {
  constructor() {
    this._ws = null;
    this._listeners = {};
    EVENT_TYPES.forEach((type) => {
      this._listeners[type] = [];
    });

    this._active = false; // true while this instance should be connected/reconnecting
    this._reconnectDelay = RECONNECT_BASE_DELAY_MS;
    this._reconnectTimer = null;
    this._connected = false;
  }

  /**
   * Opens the WebSocket connection to /ws/dashboard.
   */
  connect() {
    this._active = true;
    this._openSocket();
  }

  _openSocket() {
    if (!this._active) return;

    const token = getToken();
    const wsBase = deriveWsBase();
    const url = `${wsBase}/ws/dashboard?token=${encodeURIComponent(token || '')}`;

    let socket;
    try {
      socket = new WebSocket(url);
    } catch (err) {
      this._scheduleReconnect();
      return;
    }

    this._ws = socket;

    socket.addEventListener('open', () => {
      this._connected = true;
      this._reconnectDelay = RECONNECT_BASE_DELAY_MS; // reset backoff on success
    });

    socket.addEventListener('message', (event) => {
      this._handleMessage(event);
    });

    socket.addEventListener('close', (event) => {
      this._connected = false;

      if (this._isAuthClose(event)) {
        this._active = false;
        this._clearReconnectTimer();
        logout();
        return;
      }

      if (this._active) {
        this._scheduleReconnect();
      }
    });

    socket.addEventListener('error', () => {
      // let the close handler drive reconnect logic
      try {
        socket.close();
      } catch (err) {
        /* no-op */
      }
    });
  }

  _isAuthClose(event) {
    if (AUTH_CLOSE_CODES.has(event.code)) return true;
    const reason = (event.reason || '').toLowerCase();
    return AUTH_REASON_KEYWORDS.some((keyword) => reason.includes(keyword));
  }

  _handleMessage(event) {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch (err) {
      return;
    }

    const type = data && data.type;
    if (!type || !this._listeners[type]) return;

    const payload = data.payload !== undefined ? data.payload : data;
    this._listeners[type].forEach((callback) => {
      try {
        callback(payload);
      } catch (err) {
        console.error(`DashboardSocket listener error for "${type}":`, err);
      }
    });
  }

  _scheduleReconnect() {
    this._clearReconnectTimer();
    this._reconnectTimer = setTimeout(() => {
      this._openSocket();
    }, this._reconnectDelay);

    this._reconnectDelay = Math.min(this._reconnectDelay * 2, RECONNECT_MAX_DELAY_MS);
  }

  _clearReconnectTimer() {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
  }

  /**
   * Subscribes a callback to a given event type.
   * @param {string} eventType - one of bot_status, job_progress_update, hr_contact_added,
   *                              daily_counter_update, application_reply_received
   * @param {Function} callback
   */
  on(eventType, callback) {
    if (!this._listeners[eventType]) {
      console.warn(`DashboardSocket.on(): unknown event type "${eventType}"`);
      this._listeners[eventType] = [];
    }
    this._listeners[eventType].push(callback);
  }

  /**
   * Removes a previously subscribed callback for a given event type.
   * @param {string} eventType
   * @param {Function} callback
   */
  off(eventType, callback) {
    if (!this._listeners[eventType]) return;
    this._listeners[eventType] = this._listeners[eventType].filter((cb) => cb !== callback);
  }

  /**
   * Closes the connection cleanly and stops reconnect attempts.
   */
  disconnect() {
    this._active = false;
    this._clearReconnectTimer();
    this._reconnectDelay = RECONNECT_BASE_DELAY_MS;

    if (this._ws) {
      try {
        this._ws.close(1000, 'client disconnect');
      } catch (err) {
        /* no-op */
      }
      this._ws = null;
    }
    this._connected = false;
  }

  /**
   * @returns {boolean} true if the socket is currently open
   */
  isConnected() {
    return this._connected && this._ws && this._ws.readyState === WebSocket.OPEN;
  }
}
