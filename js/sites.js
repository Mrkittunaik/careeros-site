// api/sites.js
import { request } from './client.js';

/** Custom sites the user added via the "+" tile — { title, url }[] */
export async function getCustomSites() {
  const data = await request('GET', '/settings/custom-sites');
  return (data && data.custom_sites) || [];
}

export async function addCustomSite(title, url) {
  const data = await request('POST', '/settings/custom-sites', { title, url });
  return (data && data.custom_sites) || [];
}

export async function removeCustomSite(title) {
  const data = await request('DELETE', `/settings/custom-sites/${encodeURIComponent(title)}`);
  return (data && data.custom_sites) || [];
}

/**
 * Per-site login credentials, keyed by lowercase site name.
 * Shape per site: { needs_login, credential_mode, manual_username (masked), has_manual_password }
 */
export async function getSiteCredentials() {
  const data = await request('GET', '/settings/site-credentials');
  return (data && data.site_credentials) || {};
}

export async function setSiteCredentials(site, { needsLogin, credentialMode, manualUsername, manualPassword }) {
  return request('POST', '/settings/site-credentials', {
    site,
    needs_login: needsLogin,
    credential_mode: credentialMode,
    manual_username: manualUsername || null,
    manual_password: manualPassword || null,
  });
}

export async function removeSiteCredentials(site) {
  return request('DELETE', `/settings/site-credentials/${encodeURIComponent(site)}`);
}
