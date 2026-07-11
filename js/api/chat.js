// chat.js
import { request } from './client.js';

/**
 * Fetches the user's chat history with the AI assistant.
 * @returns {Promise<Array>}
 */
export async function getChatHistory() {
  return request('GET', '/chat/history');
}

/**
 * Sends a chat message. The backend may respond with a plain reply, or with
 * intent: "job_search" if the message was understood as a request to start
 * a job search — in which case a job_requests document was already created
 * server-side.
 * @param {string} message
 * @returns {Promise<Object>}
 */
export async function sendChatMessage(message) {
  return request('POST', '/chat', { message });
}
