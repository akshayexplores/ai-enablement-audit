/* CII Kerala research audit admin: OTP login, list, detail, CSV export. Data comes from /api/admin/* (server checks the session cookie). */
const $ = (s) => document.querySelector(s);
const escH = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const fmtDate = (d) => d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
const KIND = { executive: 'Executive snapshot', department: 'Department audit' };
let rows = [], filtered = [], selectedId = null;
const f = { q: '', kind: '', status: '' };
const dl = (x) => (x.summary || {}).reportDownloadedAt || null;

async function api(path, opts) {
  const r = await fetch(path, { credentials: 'same-origin', ...opts });
  let data = {};
  try { data = await r.json(); } catch { /* empty */ }
  return { status: r.status, ok: r.ok, data };
}

function viewLoginEmail(msg) {
  $('#navright').innerHTML = '';
  $('#root').innerHTML = `<form class="login" id="loginForm"><div class="eyebrow">Admin</div><h1>Log in</h1>
    <p class="help" style="margin-bottom:1rem">Enter your email and we'll send you a one-time code.</p>
    <label class="field"><span>Email</span><input type="email" id="loginEmail" autocomplete="email" autofocus required></label>
    <div class="err" id="loginErr" role="alert">${escH(msg || '')}</div>
    <div style="margin-top:.6rem"><button class="btn" type="submit" id="loginBtn">Send code</button></div></form>`;
  $('#loginEmail').focus();
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#loginEmail').value.trim();
    $('#loginBtn').disabled = true; $('#loginErr').textContent = '';
    const r = await api('/api/admin/request-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    $('#loginBtn').disabled = false;
    if (r.ok) return viewLoginCode(email);
    $('#loginErr').textContent = r.data.error || 'Could not send the code';
  });
}

function viewLoginCode(email) {
  $('#root').innerHTML = `<form class="login" id="codeForm"><div class="eyebrow">Admin</div><h1>Enter code</h1>
    <p class="help" style="margin-bottom:1rem">We sent a 6-digit code to <b>${escH(email)}</b>. It expires in 10 minutes.</p>
    <label class="field"><span>Code</span><input type="text" id="loginCode" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="one-time-code" autofocus required></label>
    <div class="err" id="loginErr" role="alert"></div>
    <div style="margin-top:.6rem;display:flex;gap:.9rem;align-items:center">
      <button class="btn" type="submit" id="loginBtn">Log in</button>
      <button class="link" type="button" id="backBtn">Use a different email</button>
    </div></form>`;
  $('#loginCode').focus();
  $('#backBtn').onclick = () => viewLoginEmail();
  $('#codeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = $('#loginCode').value.trim();
    $('#loginBtn').disabled = true; $('#loginErr').textContent = '';
    const r = await api('/api/admin/verify-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code }) });
    $('#loginBtn').disabled = false;
    if (r.ok) return load();
    $('#loginErr').textContent = r.data.error || 'Could not log in';
  });
}

async function load() {
  $('#root').innerHTML = `<p class="empty-state mono">Loading responses</p>`;
  const r = await api('/api/admin/responses');
  if (r.status === 401) return viewLoginEmail();
  if (!r.ok) { $('#root').innerHTML = `<p class="empty-state">${escH(r.data.error || 'Something went wrong')}. <button class="link" id="retry">Retry</button></p>`; $('#retry').onclick = load; return; }
  rows = r.data.responses || [];
  $('#navright').innerHTML = `<button id="refresh">Refresh</button><span style="opacity:.5">·</span><button id="logout">Log out</button>`;
  $('#refresh').onclick = load;
  $('#logout').onclick = async () => { await api('/api/admin/logout', { method: 'POST' }); rows = []; closePanel(); viewLoginEmail(); };
  viewList();
}

function applyFilters() {
  const q = f.q.trim().toLowerCase();
  filtered = rows.filter((x) => (!f.kind || x.kind === f.kind) && (!f.status || (f.status === 'report' ? !!dl(x) : x.status === f.status)) &&
    (!q || [x.name, x.email, x.company].some((v) => String(v || '').toLowerCase().includes(q))));
}

function viewList() {
  applyFilters();
  const done = rows.filter((x) => x.status === 'completed').length;
  const companies = new Set(rows.map((x) => String(x.company).trim().toLowerCase())).size;
  const wk = rows.filter((x) => Date.now() - new Date(x.created_at) < 7 * 864e5).length;
  const reports = rows.filter(dl).length;
  $('#root').innerHTML = `<div class="top"><div><div class="eyebrow">AI Adoption Panel Survey</div><h1>Responses</h1></div>
    <button class="btn ghost" id="csv" ${filtered.length ? '' : 'disabled'}>Export CSV (${filtered.length})</button></div>
    <div class="kpis"><div class="kpi"><b>${rows.length}</b><span>Responses</span></div><div class="kpi"><b>${done}</b><span>Completed</span></div>
    <div class="kpi"><b>${reports}</b><span>Report downloads · hot leads</span></div><div class="kpi"><b>${companies}</b><span>Companies · ${wk} this week</span></div></div>
    <div class="filters"><input type="text" id="q" placeholder="Search name, email, company" value="${escH(f.q)}" aria-label="Search">
      <select id="kind" aria-label="Type"><option value="">All types</option><option value="executive">Executive</option><option value="department">Department</option></select>
      <select id="status" aria-label="Status"><option value="">Any status</option><option value="completed">Completed</option><option value="in_progress">In progress</option><option value="report">Downloaded report</option></select></div>
    <div id="table"></div>`;
  $('#kind').value = f.kind; $('#status').value = f.status;
  $('#q').addEventListener('input', (e) => { f.q = e.target.value; renderTable(); });
  $('#kind').addEventListener('change', (e) => { f.kind = e.target.value; renderTable(); });
  $('#status').addEventListener('change', (e) => { f.status = e.target.value; renderTable(); });
  $('#csv').onclick = exportCsv;
  renderTable();
}

function renderTable() {
  applyFilters();
  const b = $('#csv'); if (b) { b.textContent = `Export CSV (${filtered.length})`; b.disabled = !filtered.length; }
  if (!rows.length) { $('#table').innerHTML = `<div class="tbl-wrap"><p class="empty-state">No responses yet. Share the audit link and they'll show up here as people answer.</p></div>`; return; }
  if (!filtered.length) { $('#table').innerHTML = `<div class="tbl-wrap"><p class="empty-state">Nothing matches these filters.</p></div>`; return; }
  $('#table').innerHTML = `<div class="tbl-wrap"><table><thead><tr><th>Updated</th><th>Person</th><th>Company</th><th>Type</th><th>Status</th><th>Hrs/wk in reach</th><th>Possible / in use</th></tr></thead><tbody>
    ${filtered.map((x) => { const s = x.summary || {}; return `<tr data-id="${x.id}" tabindex="0" aria-selected="${x.id === selectedId}">
      <td class="num">${escH(fmtDate(x.updated_at))}</td>
      <td>${escH(x.name)}<span class="sm">${escH(x.email)}</span></td>
      <td>${escH(x.company)}</td>
      <td>${escH(KIND[x.kind] || x.kind)}</td>
      <td><span class="pill ${x.status === 'completed' ? 'done' : ''}">${x.status === 'completed' ? 'Completed' : `${x.progress}%`}</span>${dl(x) ? `<span class="pill hot" title="Downloaded the PDF report">Report ↓</span>` : ''}</td>
      <td class="num">${s.hours != null ? s.hours : '–'}</td>
      <td class="num">${s.possible != null ? s.possible + '%' : '–'} / ${s.inUse != null ? s.inUse + '%' : '–'}</td></tr>`; }).join('')}
    </tbody></table></div>`;
  document.querySelectorAll('tbody tr[data-id]').forEach((tr) => {
    tr.addEventListener('click', () => openPanel(tr.dataset.id));
    tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') openPanel(tr.dataset.id); });
  });
}

/* ---- answers → readable tables ---- */
function execAnswers(a) {
  a = a || {}; const size = a.size || {}, lvl = a.lvl || {}, org = a.org || {};
  const teams = ORDER.filter((k) => size[k] != null).map((k) => `<tr><td>${DEPTS[k].name}</td><td>${escH(X_SIZE[size[k]] ? X_SIZE[size[k]][0] : '')}</td><td>${size[k] === 0 ? '–' : escH(lvl[k] != null && X_LVL[lvl[k]] ? X_LVL[lvl[k]][0] : 'Not answered')}</td></tr>`).join('');
  const orgs = X_ORG.map((q, i) => `<tr><td>${escH(q[0])}</td><td colspan="2">${org[i] != null ? escH(q[1][org[i]]) : '<span class="muted">Not answered</span>'}</td></tr>`).join('');
  return `<div class="sec"><h3>Teams</h3><div class="tbl-wrap"><table class="ans"><thead><tr><th>Team</th><th>Size</th><th>AI use today</th></tr></thead><tbody>${teams || '<tr><td colspan="3" class="muted">No answers yet</td></tr>'}</tbody></table></div></div>
    <div class="sec"><h3>Company</h3><div class="tbl-wrap"><table class="ans"><tbody>${orgs}</tbody></table></div></div>`;
}
function deptAnswers(a) {
  a = a || {}; const sel = (a.selected || []).filter((k) => DEPTS[k]);
  if (!sel.length) return `<p class="muted sec">No teams selected yet.</p>`;
  return sel.map((k) => {
    const d = (a.depts || {})[k] || {}, ans = d.a || {}, rd = d.r || {};
    const acts = DEPTS[k].acts.map((x, i) => { const v = ans[i]; return `<tr><td>${escH(SHORT[k][i])}</td><td>${v && v.t != null ? T[v.t] : '<span class="muted">–</span>'}</td><td>${v && v.t > 0 ? escH(C[v.c || 0][0]) : '<span class="muted">–</span>'}</td></tr>`; }).join('');
    const ready = READY.map((q, i) => `<tr><td>${escH(q[0])}</td><td colspan="2">${rd[i] != null ? escH(q[1][rd[i]]) : '<span class="muted">–</span>'}</td></tr>`).join('');
    return `<div class="sec"><h3>${DEPTS[k].name}${d.head ? ` · ${escH(d.head)} people` : ''}</h3>${d.tools ? `<p class="help" style="margin-bottom:.5rem">Tools: ${escH(d.tools)}</p>` : ''}
      <div class="tbl-wrap"><table class="ans"><thead><tr><th>Task</th><th>Time</th><th>How it's done today</th></tr></thead><tbody>${acts}</tbody></table></div>
      <div class="tbl-wrap" style="margin-top:.5rem"><table class="ans"><thead><tr><th colspan="3">Setup</th></tr></thead><tbody>${ready}</tbody></table></div></div>`;
  }).join('');
}
function summaryHtml(x) {
  const s = x.summary || {};
  const top = (s.top || []).map((t) => typeof t === 'string' ? escH(t) : `${escH(t.team)}: ${escH(t.task)}${t.hours ? ` (${t.hours} hrs/wk)` : ''}`);
  return `<div class="kpis" style="grid-template-columns:repeat(3,1fr)"><div class="kpi"><b>${s.hours != null ? s.hours : '–'}</b><span>Hrs/wk in reach</span></div>
    <div class="kpi"><b>${s.possible != null ? s.possible + '%' : '–'}</b><span>Possible</span></div><div class="kpi"><b>${s.inUse != null ? s.inUse + '%' : '–'}</b><span>In use</span></div></div>
    ${top.length ? `<div class="sec"><h3>${x.kind === 'executive' ? 'Teams to audit next' : 'Where to start'}</h3><ol style="margin:0;padding-left:1.2rem;display:grid;gap:.3rem">${top.map((t) => `<li>${t}</li>`).join('')}</ol></div>` : ''}`;
}
function openPanel(id) {
  const x = rows.find((r) => r.id === id); if (!x) return;
  selectedId = id; renderTable();
  const m = x.meta || {};
  $('#panel').innerHTML = `<div class="x"><span class="mono">${escH(KIND[x.kind] || x.kind)}</span><button class="link" id="close">Close</button></div>
    <h2>${escH(x.company)}</h2>
    <dl class="kv"><dt>Name</dt><dd>${escH(x.name)}</dd><dt>Email</dt><dd><a href="mailto:${escH(x.email)}">${escH(x.email)}</a></dd>
      <dt>Status</dt><dd>${x.status === 'completed' ? 'Completed ' + escH(fmtDate(x.completed_at)) : `In progress · ${x.progress}%`}</dd>
      ${dl(x) ? `<dt>Report</dt><dd><b>Downloaded</b> ${escH(fmtDate(dl(x)))} · hot lead</dd>` : ''}
      <dt>Started</dt><dd>${escH(fmtDate(x.created_at))}</dd><dt>Last activity</dt><dd>${escH(fmtDate(x.updated_at))}</dd>
      ${m.city || m.country ? `<dt>Location</dt><dd>${escH([m.city, m.country].filter(Boolean).join(', '))}</dd>` : ''}
      ${m.referrer ? `<dt>Came from</dt><dd>${escH(m.referrer)}</dd>` : ''}</dl>
    <div class="sec">${summaryHtml(x)}</div>
    ${x.kind === 'executive' ? execAnswers(x.answers) : deptAnswers(x.answers)}`;
  $('#panel').classList.add('open');
  $('#close').onclick = closePanel;
  $('#close').focus();
}
function closePanel() { selectedId = null; $('#panel').classList.remove('open'); if (rows.length && $('#table')) renderTable(); }
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePanel(); });

/* ---- CSV: one row per response, answers flattened into readable columns ---- */
function exportCsv() {
  const base = ['Started', 'Last activity', 'Completed at', 'Report downloaded at', 'Name', 'Email', 'Company', 'Type', 'Status', 'Progress %', 'Hours/wk in reach', 'Possible %', 'In use %', 'Readiness %', 'Top priorities', 'Country', 'City'];
  const teamCols = []; ORDER.forEach((k) => { const n = DEPTS[k].name; teamCols.push(`${n}: team size`, `${n}: AI use / answered`, `${n}: possible %`, `${n}: in use %`, `${n}: hrs/wk`); });
  const orgCols = X_ORG.map((q) => q[0]);
  const head = [...base, ...teamCols, ...orgCols, 'Raw answers (JSON)'];
  const lines = filtered.map((x) => {
    const s = x.summary || {}, m = x.meta || {}, a = x.answers || {};
    const top = (s.top || []).map((t) => typeof t === 'string' ? t : `${t.team}: ${t.task}`).join('; ');
    const row = [x.created_at, x.updated_at, x.completed_at || '', dl(x) || '', x.name, x.email, x.company, KIND[x.kind] || x.kind, x.status, x.progress, s.hours, s.possible, s.inUse, s.readiness, top, m.country, m.city];
    ORDER.forEach((k) => {
      const t = (s.teams || {})[DEPTS[k].name] || {};
      if (x.kind === 'executive') row.push(t.size || '', t.usage || '', '', '', t.hours != null ? t.hours : '');
      else row.push(t.teamSize || '', t.answered || '', t.possible != null ? t.possible : '', t.inUse != null ? t.inUse : '', t.hours != null ? t.hours : '');
    });
    X_ORG.forEach((q, i) => { const v = x.kind === 'executive' && a.org ? a.org[i] : null; row.push(v != null ? q[1][v] : ''); });
    row.push(JSON.stringify(a));
    return row;
  });
  const cell = (v) => { let t = v == null ? '' : String(v); if (/^[=+\-@]/.test(t)) t = "'" + t; return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  const csv = '﻿' + [head, ...lines].map((r) => r.map(cell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const el = document.createElement('a'); el.href = url; el.download = `cii-audit-responses-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(el); el.click(); el.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

load();
