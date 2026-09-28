const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** Escape user content before putting it in HTML emails. */
export const escapeHtml = (s = '') => String(s).replace(/[&<>"']/g, (c) => MAP[c]);
