// icons.js
// Inline outline-style SVG icon registry. Stroke ~1.5px, currentColor, no fill.
// Usage: icon('home', 20)

const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',

  briefcase: '<rect x="2.5" y="7" width="19" height="13" rx="2"/><path d="M8 7V5.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5V7"/><path d="M2.5 12.5h19"/>',

  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>',

  mail: '<rect x="2.5" y="4.5" width="19" height="15" rx="2"/><path d="m3 6 9 6.5L21 6"/>',

  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.9 12.1 20 3"/><path d="M17 6l3 3"/><path d="M14 9l3 3"/>',

  database: '<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5V18c0 1.66 3.58 3 8 3s8-1.34 8-3V5.5"/><path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3"/>',

  cpu: '<rect x="6" y="6" width="12" height="12" rx="1.5"/><rect x="9.5" y="9.5" width="5" height="5" rx="0.5"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',

  'check-circle': '<circle cx="12" cy="12" r="9.5"/><path d="m8 12.5 2.5 2.5L16 9.5"/>',

  'x-circle': '<circle cx="12" cy="12" r="9.5"/><path d="m9 9 6 6M15 9l-6 6"/>',

  clock: '<circle cx="12" cy="12" r="9.5"/><path d="M12 7v5l3.5 2"/>',

  refresh: '<path d="M3.5 12a8.5 8.5 0 0 1 14.6-6"/><path d="M20.5 12a8.5 8.5 0 0 1-14.6 6"/><path d="M18.5 3v3.5H15"/><path d="M5.5 21v-3.5H9"/>',

  link: '<path d="M9.5 14.5 14.5 9.5"/><path d="M11 6.5 13 4.5a4 4 0 0 1 5.66 5.66l-2 2"/><path d="M13 17.5l-2 2a4 4 0 0 1-5.66-5.66l2-2"/>',

  upload: '<path d="M12 16V4"/><path d="M7 8.5 12 3.5l5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',

  'chevron-right': '<path d="m9 5.5 7 6.5-7 6.5"/>',

  'chevron-down': '<path d="M5.5 9 12 16l6.5-7"/>',

  plus: '<path d="M12 5v14M5 12h14"/>',

  'external-link': '<path d="M18 13.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5.5"/><path d="M15 3h6v6"/><path d="M10.5 13.5 21 3"/>',

  wifi: '<path d="M2.5 8.5a15 15 0 0 1 19 0"/><path d="M5.7 12a10.5 10.5 0 0 1 12.6 0"/><path d="M8.9 15.5a6 6 0 0 1 6.2 0"/><circle cx="12" cy="19" r="1"/>',

  'wifi-off': '<path d="M2.5 2.5 21.5 21.5"/><path d="M5.7 12a10.5 10.5 0 0 1 4.5-2.4"/><path d="M13.9 9.6a10.5 10.5 0 0 1 5.4 2.4"/><path d="M2.5 8.5a15 15 0 0 1 4.3-2.7"/><path d="M17.2 5.8a15 15 0 0 1 4.3 2.7"/><path d="M8.9 15.5a6 6 0 0 1 6.2 0"/><circle cx="12" cy="19" r="1"/>',

  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',

  trash: '<path d="M4 7h16"/><path d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/><path d="M10 11v6M14 11v6"/>',

  search: '<circle cx="10.5" cy="10.5" r="7"/><path d="m20.5 20.5-4.9-4.9"/>',

  filter: '<path d="M3 4.5h18l-7 8.5V19l-4 2v-8L3 4.5Z"/>',

  x: '<path d="M6 6l12 12M18 6 6 18"/>',
};

const FILLED_ICONS = {
  google: `
    <path fill="#4285F4" d="M21.6 12.23c0-.75-.07-1.47-.19-2.16H12v4.09h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.23c1.89-1.74 2.99-4.3 2.99-7.46Z"/>
    <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.43l-3.23-2.51c-.9.6-2.05.96-3.39.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A9.99 9.99 0 0 0 12 22Z"/>
    <path fill="#FBBC05" d="M6.41 13.9a6 6 0 0 1 0-3.8V7.51H3.07a10 10 0 0 0 0 8.98l3.34-2.59Z"/>
    <path fill="#EA4335" d="M12 5.98c1.47 0 2.79.5 3.83 1.49l2.87-2.87C16.96 2.93 14.7 2 12 2a9.99 9.99 0 0 0-8.93 5.51l3.34 2.59C7.2 7.74 9.4 5.98 12 5.98Z"/>
  `,
};

/**
 * Returns an inline SVG string for the given icon name.
 * @param {string} name
 * @param {number} size
 * @returns {string}
 */
export function icon(name, size = 20) {
  const isFilled = Object.prototype.hasOwnProperty.call(FILLED_ICONS, name);
  const body = isFilled ? FILLED_ICONS[name] : ICONS[name];

  if (!body) {
    console.warn(`icon(): unknown icon name "${name}"`);
    return '';
  }

  const strokeAttrs = isFilled
    ? ''
    : 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';

  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" ${strokeAttrs} xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}
