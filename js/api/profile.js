// profile.js
import { request } from './client.js';

/**
 * Fetches the current user's profile.
 * @returns {Promise<Object>}
 */
export async function getProfile() {
  return request('GET', '/profile');
}

/**
 * Updates the profile's about paragraph.
 * @param {string} aboutParagraph
 * @returns {Promise<Object>}
 */
export async function updateProfile(aboutParagraph) {
  return request('POST', '/profile', { about_paragraph: aboutParagraph });
}

/**
 * Uploads a document file to the profile.
 * @param {File} file
 * @param {string} title
 * @returns {Promise<Object>}
 */
export async function uploadDocument(file, title) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', title);
  return request('POST', '/profile/documents', formData, true);
}

/**
 * Adds a document to the profile via a link instead of a file upload.
 * @param {string} url
 * @param {string} title
 * @returns {Promise<Object>}
 */
export async function linkDocument(url, title) {
  return request('POST', '/profile/documents', { link: url, title });
}

/**
 * Deletes a profile document by id.
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function deleteDocument(id) {
  return request('DELETE', `/profile/documents/${id}`);
}
