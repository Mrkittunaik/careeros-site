// chat.js
import { request } from './client.js';

/**
 * Lists all chat conversations (threads) for the current user, newest first.
 * @returns {Promise<Array>}
 */
export async function getConversations() {
  return request('GET', '/chat/conversations');
}

/**
 * Creates a new empty conversation thread.
 * @returns {Promise<Object>}
 */
export async function createConversation() {
  return request('POST', '/chat/conversations');
}

/**
 * Deletes a conversation thread and its messages.
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function deleteConversation(id) {
  return request('DELETE', `/chat/conversations/${id}`);
}

/**
 * Fetches message history for one conversation thread.
 * @param {string} conversationId
 * @returns {Promise<Array>}
 */
export async function getConversationHistory(conversationId) {
  return request('GET', `/chat/conversations/${conversationId}/history`);
}

/**
 * Fetches the user's legacy (pre-conversations) chat history, if any.
 * @returns {Promise<Array>}
 */
export async function getChatHistory() {
  return request('GET', '/chat/history');
}

/**
 * Sends a chat message within a conversation thread. The backend may
 * respond with a plain reply, or with intent: "job_search" if the message
 * was understood as a request to start a job search — in which case a
 * job_requests document was already created server-side.
 * @param {string} message
 * @param {string|null} conversationId - omit to let the backend start a new thread
 * @returns {Promise<Object>}
 */
export async function sendChatMessage(message, conversationId = null) {
  return request('POST', '/chat', { message, conversation_id: conversationId });
}
