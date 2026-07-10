// auth.js
import { request } from './client.js';

const TOKEN_KEY = 'careeros_token';

/**
 * Logs in with email/password. Stores JWT on success.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{token: string}>}
 */
export async function login(email, password) {
  const data = await request('POST', '/auth/login', { email, password });
  if (data && data.token) {
    localStorage.setItem(TOKEN_KEY, data.token);
  }
  return data;
}

/**
 * Logs in with a Google ID token. Stores JWT on success.
 * @param {string} googleIdToken
 * @returns {Promise<{token: string}>}
 */
export async function loginWithGoogle(googleIdToken) {
  const data = await request('POST', '/auth/google', { google_id_token: googleIdToken });
  if (data && data.token) {
    localStorage.setItem(TOKEN_KEY, data.token);
  }
  return data;
}

/**
 * Signs up with email/password. Stores JWT on success.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{token: string}>}
 */
export async function signup(email, password) {
  const data = await request('POST', '/auth/signup', { email, password });
  if (data && data.token) {
    localStorage.setItem(TOKEN_KEY, data.token);
  }
  return data;
}

/**
 * Clears the stored token and redirects to the login page.
 */
export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  window.location.href = '../index.html';
}

/**
 * Reads the current JWT from storage.
 * @returns {string|null}
 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * @returns {boolean} true if a token is present
 */
export function isAuthenticated() {
  return !!getToken();
}

/**
 * Call at the top of every protected page's JS.
 * Redirects to index.html if the user is not authenticated.
 */
export function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = '../index.html';
  }
}
