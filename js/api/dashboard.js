// dashboard.js
import { request } from './client.js';

/**
 * Fetches bot sessions.
 * @returns {Promise<Object>}
 */
export async function getSessions() {
  return request('GET', '/sessions');
}

/**
 * Fetches discovered HR contacts.
 * @returns {Promise<Object>}
 */
export async function getHrContacts() {
  return request('GET', '/hr-contacts');
}
