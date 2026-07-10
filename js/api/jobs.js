// jobs.js
import { request } from './client.js';

/**
 * Submits a new job search request.
 * @param {string} jobType
 * @param {string} experienceLevel
 * @param {string[]} targetSites
 * @returns {Promise<Object>}
 */
export async function submitJobRequest(jobType, experienceLevel, targetSites) {
  return request('POST', '/jobs/request', {
    job_type: jobType,
    experience_level: experienceLevel,
    target_sites: targetSites,
  });
}

/**
 * Fetches job applications, optionally filtered by status and/or search term.
 * @param {Object} filters
 * @param {string} [filters.status]
 * @param {string} [filters.search]
 * @returns {Promise<Object>}
 */
export async function getJobApplications(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.search) params.set('search', filters.search);
  const query = params.toString();
  return request('GET', `/jobs${query ? `?${query}` : ''}`);
}

/**
 * Fetches the daily job application limit and current usage.
 * @returns {Promise<Object>}
 */
export async function getDailyLimit() {
  return request('GET', '/jobs/limit');
}
