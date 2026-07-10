// settings.js
import { request } from './client.js';

/**
 * Fetches current settings.
 * @returns {Promise<Object>}
 */
export async function getSettings() {
  return request('GET', '/settings');
}

/**
 * Regenerates the overlay/bot token. Returns the raw token once.
 * @returns {Promise<{token: string}>}
 */
export async function regenerateBotToken() {
  return request('POST', '/overlay/regenerate-token');
}

/**
 * Updates the storage mode (e.g. hosted vs self-hosted Mongo).
 * @param {string} mode
 * @param {string} [mongoUrl]
 * @returns {Promise<Object>}
 */
export async function updateStorageMode(mode, mongoUrl) {
  return request('POST', '/settings/storage', { storage_mode: mode, mongo_url: mongoUrl });
}

/**
 * Updates the AI provider and optional API key.
 * @param {string} provider
 * @param {string} [apiKey]
 * @returns {Promise<Object>}
 */
export async function updateAiProvider(provider, apiKey) {
  return request('POST', '/settings/ai-provider', { ai_provider: provider, api_key: apiKey });
}

/**
 * Fetches the Gmail OAuth connect URL.
 * @returns {Promise<{oauth_url: string}>}
 */
export async function getGmailConnectUrl() {
  return request('GET', '/settings/gmail/connect');
}

/**
 * Disconnects the linked Gmail account.
 * @returns {Promise<Object>}
 */
export async function disconnectGmail() {
  return request('POST', '/settings/gmail/disconnect');
}

/**
 * Triggers a manual Gmail scan.
 * @returns {Promise<Object>}
 */
export async function triggerGmailScan() {
  return request('POST', '/gmail/scan');
}
