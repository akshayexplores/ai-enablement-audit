/* CII Kerala research audit admin: OTP login, list, detail, CSV export. Data comes from /api/admin/* (server checks the session cookie). */
const $ = (s) => document.querySelector(s);
const escH = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const fmtDate = (d) => d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
const KIND = { executive: 'Executive snapshot', department: 'Department audit' };
