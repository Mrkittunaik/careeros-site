// client.js

export const API_BASE = 'http://localhost:8000/api/v1';

const TOKEN_KEY = 'careeros_token';

/**
 * Custom error type for non-2xx API responses.
 */
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Core fetch wrapper for all API calls.
 * @param {string} method - HTTP method, e.g. 'GET', 'POST'
 * @param {string} path - path relative to API_BASE, e.g. '/profile'
 * @param {Object|FormData|null} body - request body
 * @param {boolean} isMultipart - if true, sends body as FormData (no Content-Type header)
 * @returns {Promise<any>} parsed JSON response
 */
export async function request(method, path, body = null, isMultipart = false) {
  const token = localStorage.getItem(TOKEN_KEY);

  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fetchOptions = {
    method,
    headers,
  };

  if (body !== null && body !== undefined) {
    if (isMultipart) {
      // body is expected to already be a FormData instance
      fetchOptions.body = body;
      // Do NOT set Content-Type — the browser sets the correct multipart boundary
    } else {
      headers['Content-Type'] = 'application/json';
      fetchOptions.body = JSON.stringify(body);
    }
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, fetchOptions);
  } catch (networkErr) {
    throw new ApiError('Network error — could not reach the server.', 0);
  }

  let data = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch (parseErr) {
      data = null;
    }
  }

  if (!response.ok) {
    const message =
      (data && (data.message || data.detail || data.error)) ||
      `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status);
  }

  return data;
}
