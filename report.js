/* CII Kerala AI Adoption Panel Survey: one-click branded PDF report (generated from the admin panel).
   Builds two A4 pages in a hidden container, renders them with html2canvas and packs them into a PDF with jsPDF.
   Libraries load from cdnjs only when someone clicks Download. Depends on globals from audit-data.js and app.js. */
const LIBS = [
  "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
];
const MARK_DARK = "/cii-mark.svg";
const PAL = { pot: "#0F3D73", "pot-fill": "rgba(15,61,115,.14)", obs: "#5C86B8", "obs-fill": "rgba(92,134,184,.35)", line: "#DCE3EC",
  ink: "#141A22", muted: "#5B6472", surface: "#F6F9FC", "ok-bg": "rgba(15,61,115,.08)", ok: "#0F3D73" };

function loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[data-src="${src}"]`)) return res();
    const s = document.createElement("script");
    s.src = src; s.async = true; s.dataset.src = src; s.crossOrigin = "anonymous";
    s.onload = () => res(); s.onerror = () => rej(new Error("Could not load " + src));
    document.head.appendChild(s);
  });
}
async function loadLibs() {
  if (!window.html2canvas) await loadScript(LIBS[0]);
  if (!(window.jspdf && window.jspdf.jsPDF)) await loadScript(LIBS[1]);
}
/* Chart SVGs use CSS variables; resolve them and turn the SVG into an image so the renderer draws it exactly. */
function svgImg(svg, width) {
  const fixed = svg.replace(/var\(--([a-z-]+)\)/g, (m, n) => PAL[n] || "#141A22")
    .replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ')
    .replace(/font-family:[^;"}]+/g, "font-family:Helvetica,Arial,sans-serif");
  return `<img alt="" data-svg="chart" style="width:${width}px;height:${Math.round(width * 460 / 560)}px;display:block" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(fixed)}">`;
}
/* html2canvas can't reliably draw SVG images (Chrome skips SVGs without explicit size), so rasterise them to PNG first. */
async function svgToPng(svgText, w, h) {
  let t = svgText.replace(/<svg([^>]*?)\swidth="[^"]*"/, "<svg$1").replace(/<svg([^>]*?)\sheight="[^"]*"/, "<svg$1");
  if (!/xmlns=/.test(t)) t = t.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  t = t.replace("<svg", `<svg width="${w}" height="${h}"`);
  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(t);
  await img.decode();
  const c = document.createElement("canvas"); c.width = w * 2; c.height = h * 2;
  const g = c.getContext("2d"); g.scale(2, 2); g.drawImage(img, 0, 0, w, h);
  return c.toDataURL("image/png");
}
async function rasteriseImages(root) {
  let mark = null;
  for (const im of root.querySelectorAll("img[data-svg]")) {
    const kind = im.dataset.svg;
    if (kind === "mark") {
      if (!mark) mark = await svgToPng(await (await fetch(MARK_DARK)).text(), 128, 84);
      im.src = mark;
    } else {
      im.src = await svgToPng(decodeURIComponent(im.getAttribute("src").split(",").slice(1).join(",")), 560, 460);
    }
  }
}
const rEsc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
const fmtDateLong = () => new Date((typeof state !== "undefined" && state && state.__reportDate) || Date.now()).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

const RCSS = `
.rp{width:794px;height:1123px;background:#FFFFFF;color:#141A22;font:400 13.5px/1.55 Inter,Helvetica,Arial,sans-serif;position:relative;overflow:hidden;box-sizing:border-box}
.rp *{box-sizing:border-box}
.rp .band{background:#0F3D73;color:#FFFFFF;padding:34px 48px 30px;position:relative;overflow:hidden}
.rp .brand{display:flex;align-items:center;gap:10px}
.rp .brand img{height:22px;width:auto;background:#FFFFFF;padding:3px 6px;border-radius:3px}
.rp .wm{font:700 17px Inter,Helvetica,Arial,sans-serif;letter-spacing:.02em}
.rp .mono{font-family:Inter,Helvetica,Arial,sans-serif;letter-spacing:.02em;font-size:10.5px}
.rp .eb{font-family:Inter,Helvetica,Arial,sans-serif;font-weight:600;letter-spacing:.02em;font-size:10.5px;color:#0F3D73;display:flex;align-items:center;gap:10px}
.rp .eb:after{content:"";flex:1;height:1px;background:currentColor;opacity:.3}
.rp .band .eb{color:#FFFFFF}
.rp h1{font:700 34px/1.1 Inter,Helvetica,Arial,sans-serif;letter-spacing:0;margin:18px 0 0;max-width:620px}
.rp .for{margin-top:12px;color:#D9E6F4;font-size:13px}
.rp .body{padding:30px 48px}
.rp .lead{font-size:15px;max-width:640px}
.rp .lead b{font-weight:600}
.rp .stats{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #DCE3EC;margin-top:20px;background:#F6F9FC}
.rp .stat{padding:12px 14px;border-left:1px solid #DCE3EC}
.rp .stat:first-child{border-left:0}
.rp .stat b{display:block;font:600 24px/1.1 Inter,Helvetica,Arial,sans-serif}
.rp .stat span{font-family:Inter,Helvetica,Arial,sans-serif;letter-spacing:.02em;font-size:9.5px;color:#5B6472}
.rp .grid{display:grid;grid-template-columns:330px 1fr;gap:26px;margin-top:22px;align-items:start}
.rp .card{background:#F6F9FC;border:1px solid #DCE3EC;padding:12px}
.rp .leg{display:flex;gap:14px;margin-top:6px;font-family:Inter,Helvetica,Arial,sans-serif;letter-spacing:.02em;font-size:9px;color:#5B6472}
.rp .leg i{display:inline-block;width:9px;height:9px;margin-right:5px;vertical-align:-1px}
.rp .rows{display:grid;gap:9px}
.rp .rw .n{display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:3px}
.rp .rw .n b{font-weight:600}
.rp .rw .n span{font-family:Inter,Helvetica,Arial,sans-serif;font-size:11px;color:#5B6472}
.rp .trk{height:7px;background:#EAF0F7;position:relative}
.rp .trk i{position:absolute;left:0;top:0;bottom:0;background:rgba(15,61,115,.2);border-right:2px solid #0F3D73}
.rp .trk i.o{background:#5C86B8;border:0}
.rp .trk i.b{background:#0F3D73;border:0}
.rp h3{font-family:Inter,Helvetica,Arial,sans-serif;letter-spacing:.02em;font-size:11.5px;font-weight:600;color:#0F3D73;margin:0 0 10px}
.rp .opp{display:grid;grid-template-columns:26px 1fr;gap:2px 10px;padding:9px 0;border-top:1px solid #DCE3EC}
.rp .opp .no{grid-row:span 2;width:22px;height:22px;border-radius:50%;background:#0F3D73;color:#FFFFFF;font:600 11px/22px Inter,Helvetica,Arial,sans-serif;text-align:center}
.rp .opp .t{font-weight:600;font-size:13px}
.rp .opp .t small{font-family:Inter,Helvetica,Arial,sans-serif;letter-spacing:.02em;font-size:9px;font-weight:600;color:#5B6472;margin-left:6px;padding:2px 5px;background:#EAF0F7}
.rp .opp .h{color:#5B6472;font-size:11.5px;line-height:1.45}
.rp ul{margin:0;padding-left:16px;color:#5B6472;font-size:12px;display:grid;gap:3px}
.rp .note{font-size:10.5px;color:#5B6472;line-height:1.5}
.rp .foot{position:absolute;left:0;right:0;bottom:0;background:#0A2C54;color:#AEC4DC;padding:14px 48px;display:flex;justify-content:space-between;align-items:center}
.rp .foot .brand{color:#FFFFFF}
.rp .foot img{height:16px;width:auto}
`;

function header(company, sub) {
  return `<div class="band"><div class="brand" style="position:relative"><img data-svg="mark" src="${MARK_DARK}" alt=""><span class="wm">CII Kerala</span></div>
    <div class="eb" style="margin-top:26px;position:relative">AI Adoption Panel Survey · report</div>
    <h1 style="position:relative">${rEsc(company)}</h1>
    <div class="for" style="position:relative">${sub}</div></div>`;
}
function footer(n) {
  return `<div class="foot"><span class="brand" style="display:flex;gap:8px;align-items:center"><img data-svg="mark" src="${MARK_DARK}" alt=""><span class="mono">CII Kerala</span></span>
    <span class="mono">In association with CII Kerala</span><span class="mono">Page ${n} of 2</span></div>`;
}
const GUARDRAILS = `<ul><li>A person approves payments, hiring decisions and contracts. Always.</li><li>AI writes to your systems only after someone approves, until error rates are measured.</li><li>Use official connectors with the narrowest access that does the job.</li><li>Personal data stays within your DPDP Act obligations.</li><li>Measure rework, not only speed.</li></ul>`;
const LEGEND = (b, r) => `<div class="leg"><span><i style="background:#0F3D73;border-radius:50%"></i>${b}</span><span><i style="background:#5C86B8"></i>${r}</span><span><i style="height:0;border-top:2px dashed #5C86B8;width:14px"></i>Typical company</span></div>`;

function execPages() {
  const x = state.cxo, s = execSummary();
  const rows = ORDER.map((k) => [k, xscore(k)]).filter((r) => r[1] && !r[1].absent).sort((a, b) => b[1].hours - a[1].hours);
  const max = rows.length ? rows[0][1].hours || 1 : 1, unsure = rows.filter((r) => r[1].unsure).map((r) => DEPTS[r[0]].name);
  const sub = `Executive snapshot · prepared for ${rEsc(state.person.name)} · ${fmtDateLong()}`;
  const axes = cxoAxes();
  const chartHtml = axes.length >= 3 ? svgImg(radar(axes, "Company AI coverage"), 304) : `<p class="note">Add at least three teams to see the chart.</p>`;
  const p1 = `<div class="rp">${header(x.company, sub)}<div class="body">
    <p class="lead">About <b>${Math.round((s.hours || 0) / 10) * 10} hours a week</b> of your teams' work is within reach of AI today. You use <b>${s.inUse ?? 0}%</b> of what's possible. A typical company uses ${s.typical ?? 0}%.</p>
    <div class="stats"><div class="stat"><b style="color:#0F3D73">${s.possible ?? "–"}%</b><span>Possible</span></div><div class="stat"><b>${s.inUse ?? "–"}%</b><span>In use</span></div>
      <div class="stat"><b>${s.typical ?? "–"}%</b><span>Typical company</span></div><div class="stat"><b>${s.readiness ?? "–"}%</b><span>Readiness</span></div></div>
    <div class="grid"><div class="card">${chartHtml}${LEGEND("Possible", "You")}</div>
      <div><h3>Where the hours are</h3><div class="rows">${rows.map(([k, r]) => `<div class="rw"><div class="n"><b>${DEPTS[k].name}${r.unsure ? " · blind spot" : ""}</b><span>${Math.round(r.hours)} hrs/wk</span></div><div class="trk"><i class="b" style="width:${(r.hours / max) * 100}%"></i></div></div>`).join("")}</div>
      ${unsure.length ? `<p class="note" style="margin-top:12px">Blind spot: you couldn't tell how ${rEsc(unsure.join(", "))} use AI today. Usage there is likely individual and unmanaged.</p>` : ""}</div></div>
    </div>${footer(1)}</div>`;
  const top = (s.top || []);
  const p2 = `<div class="rp"><div class="body" style="padding-top:44px">
    <h3>Where to start</h3>
    ${top.map((t, i) => { const k = ORDER.find((q) => DEPTS[q].name === t), r = xscore(k) || {};
      return `<div class="opp"><div class="no">${i + 1}</div><div class="t">${rEsc(t)}<small>${Math.round(r.hours || 0)} hrs/wk in reach</small></div><div class="h">${rEsc(PROOF[k] || "")}. Connects today: ${rEsc(CONNECT[k] || "")}. Recommended next: a task-by-task department audit.</div></div>`; }).join("") || `<p class="note">Answer more teams to see priorities.</p>`}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:26px;margin-top:22px"><div><h3>Guardrails</h3>${GUARDRAILS}</div>
      <div><h3>How to read this</h3><p class="note">"Possible" is how much of each team's work AI can carry today with a person reviewing, based on published occupational benchmarks (Anthropic, Labour Market Impacts of AI, 2026; McKinsey; JetBrains) and blended estimates. "In use" scales that by how teams use AI today. Hours a week = team size × 40 × the gap × 0.5, assuming half the gap is realistically captured.</p></div></div>
    </div>${footer(2)}</div>`;
  return [p1, p2];
}

function deptPages() {
  const s = deptSummary(), sel = state.selected;
  const sub = `Department audit · prepared for ${rEsc(state.person.name)} · ${fmtDateLong()}`;
  const axes = companyAxes();
  const chartHtml = axes.length >= 3 ? svgImg(radar(axes, "Company AI coverage by department"), 304) : "";
  const all = []; sel.forEach((k) => { const sc = score(k); if (sc) sc.items.forEach((it) => { if (it.gap > 0) all.push(it); }); });
  all.sort((a, b) => b.score - a.score);
  const top = all.slice(0, 7);
  const teamRows = sel.map((k) => { const sc = score(k); return sc ? `<div class="rw"><div class="n"><b>${DEPTS[k].name}</b><span>${Math.round(sc.obs * 100)}% of ${Math.round(sc.pot * 100)}%${sc.hours ? ` · ${Math.round(sc.hours)} hrs/wk` : ""}</span></div><div class="trk"><i style="width:${sc.pot * 100}%"></i><i class="o" style="width:${sc.obs * 100}%"></i></div></div>` : ""; }).join("");
  const p1 = `<div class="rp">${header(state.company, sub)}<div class="body">
    <p class="lead">Across the ${sel.length} team${sel.length > 1 ? "s" : ""} you audited, about <b>${Math.round((s.hours || 0) / 10) * 10} hours a week</b> are within reach of AI. Your teams use <b>${s.inUse ?? 0}%</b> of a possible <b>${s.possible ?? 0}%</b>.</p>
    <div class="stats"><div class="stat"><b style="color:#0F3D73">${s.possible ?? "–"}%</b><span>Possible</span></div><div class="stat"><b>${s.inUse ?? "–"}%</b><span>In use</span></div>
      <div class="stat"><b>${s.hours ?? "–"}</b><span>Hours a week</span></div><div class="stat"><b>${s.teamsDone}</b><span>Teams audited</span></div></div>
    <div class="grid" style="${chartHtml ? "" : "grid-template-columns:1fr"}">${chartHtml ? `<div class="card">${chartHtml}${LEGEND("Possible", "In use")}</div>` : ""}
      <div><h3>By team · in use of possible</h3><div class="rows">${teamRows}</div>
      <p class="note" style="margin-top:12px">Team size drives the hours estimate. Teams without a size show percentages only.</p></div></div>
    </div>${footer(1)}</div>`;
  const p2 = `<div class="rp"><div class="body" style="padding-top:40px">
    <h3>Where to start</h3>
    ${top.map((it, i) => `<div class="opp"><div class="no">${i + 1}</div><div class="t">${DEPTS[it.k].name} · ${rEsc(it.name)}<small>${rEsc(tagOf(it)[1])}</small>${it.hrs ? `<small>${Math.round(it.hrs)} hrs/wk</small>` : ""}</div><div class="h">${rEsc(it.how)}</div></div>`).join("") || `<p class="note">Answer the Work tab for each team to see priorities.</p>`}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:26px;margin-top:18px"><div><h3>Guardrails</h3>${GUARDRAILS}</div>
      <div><h3>How to read this</h3><p class="note">Each task has a benchmark for how much of it AI can carry today with a person reviewing. "Possible" is the average weighted by where the team spends time; "In use" scales each task by how it gets done today. Quick win: a task AI can largely carry, in a team that scored 50% or more on setup.</p></div></div>
    </div>${footer(2)}</div>`;
  return [p1, p2];
}

async function downloadReport(kind, btn, opts) {
  const label = btn ? btn.textContent : "";
  const setBtn = (t, dis) => { if (btn) { btn.textContent = t; btn.disabled = dis; } };
  setBtn("Preparing report", true);
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "position:fixed;left:-12000px;top:0;z-index:-1;pointer-events:none";
  try {
    await loadLibs();
    host.innerHTML = `<style>${RCSS}</style>` + (kind === "executive" ? execPages() : deptPages()).join("");
    document.body.appendChild(host);
    try { await document.fonts.ready; } catch (e) { /* fonts optional */ }
    await rasteriseImages(host);
    await Promise.all([...host.querySelectorAll("img")].map((im) => im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; })));
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
    const pages = [...host.querySelectorAll(".rp")];
    for (let i = 0; i < pages.length; i++) {
      const pg = pages[i];
      const canvas = await window.html2canvas(pg, { scale: 2, backgroundColor: "#FFFFFF", useCORS: true, logging: false, width: 794, height: 1123, windowWidth: 794 });
      if (i) pdf.addPage();
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, 210, 297);
    }
    pdf.setProperties({ title: `CII Kerala AI Adoption Panel Survey · ${kind === "executive" ? state.cxo.company : state.company}`, author: "CII Kerala", subject: "AI Adoption Panel Survey report" });
    const company = (kind === "executive" ? state.cxo.company : state.company).trim().replace(/[^\w\- ]+/g, "").replace(/\s+/g, "-") || "Company";
    pdf.save(`CII-AI-Audit-${company}.pdf`);
    if (!(opts && opts.track === false) && typeof markReport === "function") markReport(kind);
    setBtn("Downloaded ✓", false);
    setTimeout(() => setBtn(label, false), 2500);
  } catch (e) {
    console.error(e);
    setBtn("Couldn't create the PDF. Try again", false);
    setTimeout(() => setBtn(label, false), 4000);
  } finally {
    host.remove();
  }
}

/* ---- Admin: rebuild a saved response into the same report the visitor would have gotten ---- */
const BLANK_DEPT = () => ({ head: "", tools: "", who: "", a: {}, r: {}, step: 0 });
function stateFromResponse(resp) {
  const a = resp.answers || {}, sum = resp.summary || {};
  const st = {
    person: { name: resp.name || "", email: resp.email || "" },
    company: resp.company || "", selected: [], depts: {}, sample: false,
    cxo: { company: resp.company || "", size: {}, lvl: {}, org: {}, step: 0, done: true, reportAt: sum.reportDownloadedAt || null },
    reportAt: sum.reportDownloadedAt || null,
    __reportDate: resp.completed_at || resp.updated_at || null,
  };
  ORDER.forEach((k) => { st.depts[k] = BLANK_DEPT(); });
  if (resp.kind === "executive") {
    st.cxo.size = a.size || {}; st.cxo.lvl = a.lvl || {}; st.cxo.org = a.org || {};
  } else {
    st.selected = (a.selected || []).filter((k) => DEPTS[k]);
    st.selected.forEach((k) => { st.depts[k] = Object.assign(BLANK_DEPT(), (a.depts || {})[k] || {}); });
  }
  return st;
}
/* Swaps the saved answers in as the current state, builds the identical PDF, then puts the state back. */
async function downloadReportFor(resp, btn) {
  const prev = typeof state !== "undefined" ? state : null;
  state = stateFromResponse(resp);
  try {
    await downloadReport(resp.kind, btn, { track: false });
  } finally {
    state = prev;
  }
}
