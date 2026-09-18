/* ---------- State ---------- */
const KEY="cii-audit-v1";
const blank=()=>({head:"",tools:"",who:"",a:{},r:{},step:0});
function fresh(){const s={view:"home",person:{name:"",email:""},company:"",rid:null,tok:null,ridKey:"",reportAt:null,selected:[],sample:false,depts:{},cxo:{company:"",rid:null,tok:null,ridKey:"",reportAt:null,step:0,size:{},lvl:{},org:{},done:false}};ORDER.forEach(k=>s.depts[k]=blank());return s;}
let state=fresh();
try{const s=JSON.parse(localStorage.getItem(KEY)||"null");if(s&&s.depts){const f=fresh();state=Object.assign(f,s);state.person=Object.assign(f.person,s.person||{});state.cxo=Object.assign(f.cxo,s.cxo||{});ORDER.forEach(k=>state.depts[k]=Object.assign(blank(),s.depts[k]||{}));}}catch(e){}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){}sync();}

/* ---------- Details + backend sync ---------- */
const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const okName=()=>state.person.name.trim().length>=2,okEmail=()=>EMAIL_RE.test(state.person.email.trim());
const okDetails=c=>okName()&&okEmail()&&!!String(c||"").trim();
const uuid=()=>(crypto.randomUUID?crypto.randomUUID():"10000000-1000-4000-8000-100000000000".replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16)));
const tokenStr=()=>Array.from(crypto.getRandomValues(new Uint8Array(24)),b=>b.toString(16).padStart(2,"0")).join("");
/* one database row per flow; a new row if the person or company changes */
function claim(o,company){const key=(state.person.email.trim().toLowerCase()+"|"+String(company).trim().toLowerCase());
  if(!o.rid||o.ridKey!==key){o.rid=uuid();o.tok=tokenStr();o.ridKey=key;o.reportAt=null;}}
/* called by report.js after a PDF is generated: recorded in the summary so the admin page can flag it */
function markReport(kind){const o=kind==="executive"?state.cxo:state;o.reportAt=new Date().toISOString();save();flush();}
function detailsHtml(companyField,companyVal,enter){
  const n=state.person.name,e=state.person.email,showE=e&&!okEmail();
  return `<div class="fields"><label class="field"><span>Your name</span><input type="text" data-f="pname" data-enter="${enter}" value="${esc(n)}" placeholder="Full name" autocomplete="name" autofocus></label>
  <label class="field"><span>Work email</span><input type="email" data-f="pemail" data-enter="${enter}" class="${showE?"bad":""}" value="${esc(e)}" placeholder="you@company.com" autocomplete="email"><span class="err" id="emailerr">${showE?"Check this email address":""}</span></label>
  <label class="field full"><span>Company</span><input class="big" type="text" data-f="${companyField}" data-enter="${enter}" value="${esc(companyVal)}" placeholder="Company name" autocomplete="organization"></label></div>
  <p class="privacy">We save your answers as you go so you can pick up where you left off. This research study, prepared in association with CII, uses your name, email and answers to prepare your results and may contact you about them. We don't sell your data.</p>`;
}
function execSummary(){
  const x=state.cxo,rows=ORDER.map(k=>[k,xscore(k)]).filter(r=>r[1]&&!r[1].absent);
  const heads=rows.reduce((s,r)=>s+r[1].head,0),w=f=>heads?Math.round(rows.reduce((s,r)=>s+f(r)*r[1].head,0)/heads*100):null;
  const ov=Object.values(x.org),teams={};
  ORDER.forEach(k=>{const sz=x.size[k];if(sz==null)return;const s=xscore(k),l=x.lvl[k];teams[DEPTS[k].name]={size:X_SIZE[sz][0],usage:l==null?null:X_LVL[l][0],hours:s&&!s.absent?Math.round(s.hours):0};});
  return {hours:Math.round(rows.reduce((s,r)=>s+r[1].hours,0)),possible:w(r=>r[1].pot),inUse:w(r=>r[1].obs),typical:w(r=>TYP[r[0]]),
    readiness:ov.length?Math.round(ov.reduce((s,v)=>s+v,0)/(ov.length*3)*100):null,
    top:rows.sort((a,b)=>b[1].hours-a[1].hours).slice(0,3).map(r=>DEPTS[r[0]].name),teams,reportDownloadedAt:x.reportAt||null};
}
function deptSummary(){
  const teams={},all=[];let hours=0,P=0,O=0,n=0;
  state.selected.forEach(k=>{const s=score(k),p=progress(k);
    teams[DEPTS[k].name]={answered:p.done+" of "+p.total,possible:s?Math.round(s.pot*100):null,inUse:s?Math.round(s.obs*100):null,readiness:s&&s.ready!=null?Math.round(s.ready*100):null,teamSize:parseFloat(state.depts[k].head)||null,hours:s&&s.hours?Math.round(s.hours):null};
    if(s){n++;P+=s.pot;O+=s.obs;hours+=s.hours||0;s.items.forEach(it=>{if(it.gap>0)all.push(it);});}});
  all.sort((a,b)=>b.score-a.score);
  return {hours:Math.round(hours),possible:n?Math.round(P/n*100):null,inUse:n?Math.round(O/n*100):null,
    teamsDone:state.selected.filter(k=>{const p=progress(k);return p.done===p.total;}).length+" of "+state.selected.length,
    top:all.slice(0,5).map(it=>({team:DEPTS[it.k].name,task:SHORT[it.k][it.i],tag:tagOf(it)[1],hours:it.hrs?Math.round(it.hrs):null})),teams,reportDownloadedAt:state.reportAt||null};
}
function payloads(){
  const out=[],p={name:state.person.name.trim(),email:state.person.email.trim().toLowerCase()},x=state.cxo;
  if(x.rid&&okDetails(x.company))out.push({id:x.rid,token:x.tok,kind:"executive",status:x.done?"completed":"in_progress",...p,company:x.company.trim(),
    progress:x.done?100:Math.round(x.step/(ORDER.length+2)*100),answers:{size:x.size,lvl:x.lvl,org:x.org},summary:execSummary()});
  if(state.rid&&!state.sample&&okDetails(state.company)&&state.selected.length){
    const pr=state.selected.map(progress),done=pr.reduce((s,q)=>s+q.done,0),tot=pr.reduce((s,q)=>s+q.total,0);
    out.push({id:state.rid,token:state.tok,kind:"department",status:done===tot?"completed":"in_progress",...p,company:state.company.trim(),
      progress:tot?Math.round(done/tot*100):0,answers:{selected:state.selected,depts:Object.fromEntries(state.selected.map(k=>[k,state.depts[k]]))},summary:deptSummary()});}
  return out;
}
const sent={},pending={};let syncTimer=null,saveState="";
function setSaveState(t){saveState=t;const el=document.getElementById("savestate");if(el){el.textContent=t==="err"?"Not saved, retrying":t==="saving"?"Saving":t==="ok"?"Saved":"";el.className="saving"+(t==="err"?" err":"");}}
function sync(){
  payloads().forEach(pl=>{const body=JSON.stringify(pl);if(sent[pl.id]!==body)pending[pl.id]=body;});
  if(!Object.keys(pending).length)return;
  clearTimeout(syncTimer);syncTimer=setTimeout(flush,1200);
}
async function flush(){
  clearTimeout(syncTimer);const ids=Object.keys(pending);if(!ids.length)return;setSaveState("saving");let failed=false;
  for(const id of ids){const body=pending[id];delete pending[id];
    try{const r=await fetch("/api/save",{method:"POST",headers:{"Content-Type":"application/json"},body,keepalive:body.length<60000});
      if(!r.ok)throw new Error(r.status);sent[id]=body;}
    catch(e){if(!pending[id])pending[id]=body;failed=true;}}
  if(failed){setSaveState("err");syncTimer=setTimeout(flush,8000);}else setSaveState("ok");
}
function beacon(){Object.keys(pending).forEach(id=>{try{if(navigator.sendBeacon&&navigator.sendBeacon("/api/save",new Blob([pending[id]],{type:"text/plain"}))){sent[id]=pending[id];delete pending[id];}}catch(e){}});}
window.addEventListener("pagehide",beacon);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")beacon();});
let touch=-1,lastView="";

/* ---------- Scoring ---------- */
const pct=x=>Math.round(x*100)+"%";
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
function score(k){
  const d=state.depts[k],acts=DEPTS[k].acts;let W=0,P=0,O=0;const items=[];
  acts.forEach((a,i)=>{const ans=d.a[i];if(!ans||ans.t==null)return;const w=ans.t,c=C[ans.c||0][1];W+=w;P+=w*a[1];O+=w*a[1]*c;if(w>0)items.push({k,i,name:SHORT[k][i],how:a[2],w,p:a[1],c,gap:w*a[1]*(1-c)});});
  if(!W)return null;
  const rv=Object.values(d.r),ready=rv.length?rv.reduce((s,x)=>s+x,0)/(rv.length*3):null;
  const pot=P/W,obs=O/W,head=parseFloat(d.head)||0;
  items.forEach(it=>{it.share=it.gap/W;it.ready=ready;it.score=it.share*(head||1);it.hrs=head?head*40*it.share*.5:0;});
  return {pot,obs,ready,head,hours:head?head*40*(pot-obs)*.5:null,items:items.sort((a,b)=>b.gap-a.gap)};
}
function progress(k){const d=state.depts[k],n=DEPTS[k].acts.length;const a=Object.values(d.a).filter(x=>x&&x.t!=null).length,r=Object.keys(d.r).length,h=d.head?1:0;return {a,r,h,n,done:a+r+h,total:n+READY.length+1};}
function xscore(k){const x=state.cxo,s=x.size[k],l=x.lvl[k];if(s==null)return null;if(s===0)return {absent:true};if(l==null)return null;
  const pot=THEO[k],obs=pot*X_LVL[l][1],head=X_SIZE[s][1];return {pot,obs,head,unsure:l===5,hours:head*40*(pot-obs)*.5};}
function tagOf(it){
  if((HITL[it.k]||[]).includes(it.i))return ["hitl","Human signs off"];
  if(it.p>=.8)return it.ready==null?["","High potential"]:it.ready>=.5?["win","Quick win"]:["","Needs setup first"];
  return it.p>=.5?["","AI assists"]:["","Keep human"];}

/* ---------- Charts ---------- */
function wrap(t){if(t.length<=13)return [t];const m=t.length/2;let best=-1;for(let i=0;i<t.length;i++)if(t[i]===" "&&(best<0||Math.abs(i-m)<Math.abs(best-m)))best=i;return best<0?[t]:[t.slice(0,best),t.slice(best+1)];}
function radar(axes,label){
  const n=axes.length,W=560,H=460,cx=280,cy=232,R=148;
  const ang=i=>-Math.PI/2+i*2*Math.PI/n,pt=(i,v)=>[cx+Math.cos(ang(i))*R*v,cy+Math.sin(ang(i))*R*v];
  let g="";
  [.25,.5,.75,1].forEach(v=>{g+=`<circle cx="${cx}" cy="${cy}" r="${R*v}" fill="none" stroke="var(--line)" stroke-width="${v===1?1.5:1}"/>`;if(v<1)g+=`<text x="${cx+4}" y="${cy-R*v-3}" font-size="10" fill="var(--muted)">${v*100}</text>`;});
  axes.forEach((a,i)=>{const [x,y]=pt(i,1);g+=`<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="var(--line)"/>`;
    const [lx,ly]=pt(i,1.12),co=Math.cos(ang(i)),si=Math.sin(ang(i)),anchor=Math.abs(co)<.2?"middle":co>0?"start":"end";
    const lines=wrap(a.label),y0=ly+4-(lines.length-1)*(si<-.3?14:si>.3?0:7);
    g+=`<text ${a.act?`data-act="${a.act}" data-k="${a.k}" tabindex="0" role="button"`:""} text-anchor="${anchor}" font-size="12.5" font-weight="${a.bold?700:500}" fill="${a.dim?"var(--muted)":"var(--ink)"}">${lines.map((l,j)=>`<tspan x="${lx}" y="${y0+j*14}">${esc(l)}</tspan>`).join("")}</text>`;});
  const poly=f=>axes.map((a,i)=>pt(i,a[f]||0).map(z=>z.toFixed(1)).join(",")).join(" ");
  g+=`<polygon points="${poly("pot")}" fill="var(--pot-fill)" stroke="var(--pot)" stroke-width="2" stroke-linejoin="round"/>`;
  if(axes.some(a=>a.typ!=null))g+=`<polygon points="${poly("typ")}" fill="none" stroke="var(--obs)" stroke-width="1.5" stroke-dasharray="5 4" stroke-linejoin="round" opacity=".75"/>`;
  g+=`<polygon points="${poly("obs")}" fill="var(--obs-fill)" stroke="var(--obs)" stroke-width="2" stroke-linejoin="round"/>`;
  axes.forEach((a,i)=>{const [x,y]=pt(i,a.pot);g+=`<circle cx="${x}" cy="${y}" r="4.5" fill="${a.hollow?"var(--surface)":"var(--pot)"}" stroke="var(--pot)" stroke-width="2"/>`;
    if(!a.hollow){const [ox,oy]=pt(i,a.obs||0);g+=`<rect x="${ox-4}" y="${oy-4}" width="8" height="8" fill="var(--obs)"/>`;}});
  return `<svg class="rad" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}"><style>text{font-family:Inter,system-ui,sans-serif}</style>${g}</svg>`;
}
function hbars(axes){return `<div class="hbars">${axes.map(a=>`<div class="hbar"><div class="n"><span>${esc(a.label)}</span><span class="muted">${a.hollow?pct(a.pot):pct(a.obs)+" of "+pct(a.pot)}</span></div><div class="trk"><i style="width:${a.pot*100}%"></i>${a.hollow?"":`<i class="o" style="width:${a.obs*100}%"></i>`}</div></div>`).join("")}</div>`;}
const chart=(axes,label)=>axes.length>=3?radar(axes,label):hbars(axes);
const LEG=(blue,red,extra)=>`<div class="legend"><span><i class="sw" style="background:var(--pot)"></i>${blue}</span><span><i class="sw sq" style="background:var(--obs)"></i>${red}</span>${extra||""}</div>`;
const L_TYP=`<span><i class="sw dash"></i>Typical company</span>`,L_HOL=`<span><i class="sw hollow"></i>Not answered</span>`;
function quad(items){
  const W=560,H=300,l=34,r=14,t=14,b=30,max=Math.max(...items.map(x=>x.score))||1;
  let g=`<rect x="${l}" y="${t}" width="${(W-l-r)/2}" height="${(H-t-b)/2}" fill="none"/><rect x="${l+(W-l-r)/2}" y="${t}" width="${(W-l-r)/2}" height="${(H-t-b)/2}" fill="var(--ok-bg)"/>`;
  g+=`<line x1="${l}" y1="${t+(H-t-b)/2}" x2="${W-r}" y2="${t+(H-t-b)/2}" stroke="var(--line)"/><line x1="${l+(W-l-r)/2}" y1="${t}" x2="${l+(W-l-r)/2}" y2="${H-b}" stroke="var(--line)"/>`;
  g+=`<text x="${W-r-8}" y="${t+18}" text-anchor="end" font-size="12" font-weight="600" fill="var(--ok)">Quick wins</text><text x="${l+8}" y="${t+18}" font-size="12" fill="var(--muted)">Big bets</text><text x="${W-r-8}" y="${H-b-8}" text-anchor="end" font-size="12" fill="var(--muted)">Easy extras</text><text x="${l+8}" y="${H-b-8}" font-size="12" fill="var(--muted)">Later</text>`;
  g+=`<text x="${(W+l-r)/2}" y="${H-8}" text-anchor="middle" font-size="11" fill="var(--muted)">Easier to automate →</text><text transform="translate(14 ${(H-b+t)/2}) rotate(-90)" text-anchor="middle" font-size="11" fill="var(--muted)">More hours →</text>`;
  items.forEach((it,n)=>{const ease=Math.min(1,Math.max(0,(.6*it.p+.4*(it.ready==null?.4:it.ready)-.3)/.65)),x=l+12+ease*(W-l-r-24),y=H-b-12-(it.score/max)*(H-t-b-24);
    g+=`<circle cx="${x}" cy="${y}" r="11" fill="var(--pot)"/><text x="${x}" y="${y+4}" text-anchor="middle" font-size="11.5" font-weight="600" fill="#F3F0E8">${n+1}</text>`;});
  return `<svg class="quad" viewBox="0 0 ${W} ${H}" role="img" aria-label="Opportunities by ease and hours"><style>text{font-family:Inter,system-ui,sans-serif}</style>${g}</svg>`;
}
const homeAxes=()=>ORDER.map(k=>({label:DEPTS[k].name,pot:THEO[k],obs:TYP[k]}));
function companyAxes(){return state.selected.map(k=>{const s=score(k);return {label:DEPTS[k].name,pot:s?s.pot:THEO[k],obs:s?s.obs:0,typ:TYP[k],hollow:!s,act:"open",k};});}
function deptAxes(k){const d=state.depts[k];return DEPTS[k].acts.map((a,i)=>{const ans=d.a[i],set=ans&&ans.t!=null;return {label:SHORT[k][i],pot:a[1],obs:set&&ans.t>0?a[1]*C[ans.c||0][1]:0,hollow:!set,dim:set&&ans.t===0,bold:i===touch};});}
function cxoAxes(cur){return ORDER.filter(k=>!(xscore(k)||{}).absent).map(k=>{const s=xscore(k);return {label:DEPTS[k].name,pot:THEO[k],obs:s?s.obs:0,typ:TYP[k],hollow:!s,bold:k===cur};});}

/* ---------- Shared ---------- */
function seg(kind,i,sel,opts,cls,max){return `<div class="seg ${cls||""}" role="group">${opts.map((o,j)=>`<button type="button" data-act="ans" data-kind="${kind}" data-i="${i}" data-j="${j}" aria-pressed="${sel===j}">${max?meter(j,max):""}${esc(o)}</button>`).join("")}</div>`;}
function oppList(items,showDept){
  if(!items.length)return `<p class="empty">Answer the Work tab to see this.</p>`;
  return items.map((it,n)=>{const tg=tagOf(it);return `<div class="opp"><div class="no">${n+1}</div><div class="t">${showDept?`<span class="muted" style="font-weight:500">${DEPTS[it.k].name}</span>`:""}${esc(it.name)}<span class="tag ${tg[0]}">${tg[1]}</span>${it.hrs?`<span class="tag">${Math.round(it.hrs)} hrs/wk</span>`:""}</div><div class="h">${esc(it.how)}</div></div>`;}).join("");}
function stats3(a,b,c){return `<div class="stats"><div class="stat pot"><b>${a[0]}</b><span>${a[1]}</span></div><div class="stat obs"><b>${b[0]}</b><span>${b[1]}</span></div><div class="stat"><b>${c[0]}</b><span>${c[1]}</span></div></div>`;}

/* ---------- Views ---------- */
function vHome(){
  const started=state.selected.length&&state.selected.some(k=>progress(k).done)&&!state.sample,doneN=state.selected.filter(k=>{const p=progress(k);return p.done===p.total;}).length;
  let resume="";
  if(started)resume+=`<div class="resume"><span>${esc(state.company)||"Department audit"}: ${doneN}/${state.selected.length} teams done</span><button class="btn" data-act="hub">Continue</button></div>`;
  if(state.cxo.done||state.cxo.step>0)resume+=`<div class="resume"><span>Executive snapshot${state.cxo.company?": "+esc(state.cxo.company):""}</span><button class="btn ghost" data-act="${state.cxo.done?"cxo-result":"cxo"}">${state.cxo.done?"Results":"Continue"}</button></div>`;
  const theo=ORDER.reduce((s,k)=>s+THEO[k],0)/8,typ=ORDER.reduce((s,k)=>s+TYP[k],0)/8;
  const rays=`<svg class="rays" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g stroke="#F3F0E8" stroke-width=".7" fill="none" opacity=".6">${[[1420,-60],[1480,60],[1540,200],[1540,340],[1500,500],[1440,640],[1360,720],[620,-120],[440,-40],[300,120],[520,700],[720,740]].map(q=>`<line x1="880" y1="300" x2="${q[0]}" y2="${q[1]}"/>`).join("")}<circle cx="880" cy="300" r="26"/><circle cx="880" cy="300" r="46" stroke-dasharray="2 5"/></g></svg>`;
  return `<div class="hero">${rays}<div><div class="eyebrow">AI enablement audit · a CII research study</div><h1>How much of your work could AI do?</h1>
    <div class="lede"><span><b style="color:var(--pot)">${pct(theo)}</b>of desk work is within reach of AI today</span><span><b style="color:var(--obs)">${pct(typ)}</b>is what a typical company uses</span></div></div>
    <div>${radar(homeAxes(),"AI potential versus typical adoption by department")}</div></div>
  <div class="paths">
    <button class="path" data-act="cxo"><span class="who">${ico("user",18)}CEO, COO, founder</span><h2>Executive snapshot</h2><p>The whole company at a glance.</p>
      <svg class="art" viewBox="0 0 112 96" aria-hidden="true"><g fill="none" stroke="var(--line)"><circle cx="56" cy="48" r="40"/><circle cx="56" cy="48" r="22"/><path d="M56 8v80M16 48h80M28 20l56 56M84 20L28 76"/></g><polygon points="56,10 82,22 92,48 78,70 56,80 36,68 26,48 32,24" fill="var(--pot-fill)" stroke="var(--pot)" stroke-width="2"/><polygon points="56,36 66,38 68,48 62,54 56,58 48,56 44,48 46,38" fill="var(--obs-fill)" stroke="var(--obs)" stroke-width="2"/></svg>
      <span class="go"><span>Start</span><span class="badge">3 min</span></span></button>
    <button class="path" data-act="setup"><span class="who">${ico("hr",18)}Department heads</span><h2>Department audit</h2><p>One team in depth, task by task.</p>
      <svg class="art" viewBox="0 0 112 96" aria-hidden="true"><g fill="currentColor">${[0,1,2,3].map(r=>`<rect x="4" y="${10+r*21}" width="30" height="6" rx="3" opacity=".5"/>${[0,1,2,3].map(c=>`<rect x="${42+c*17}" y="${6+r*21}" width="13" height="13" rx="3" opacity="${c===[3,1,2,0][r]?1:.22}"/>`).join("")}`).join("")}</g></svg>
      <span class="go"><span>Set up</span><span class="badge">10 min per team</span></span></button>
  </div>${resume?`<div class="resumes">${resume}</div>`:""}
  <div class="row" style="margin-top:1.25rem;justify-content:space-between"><button class="link" data-act="sample">See a finished sample</button></div>`;
}

function vCxo(){
  const x=state.cxo,st=x.step,total=ORDER.length+2;let body="",canNext=true;
  if(st===0){canNext=okDetails(x.company);
    body=`<div class="eyebrow">Executive snapshot · 3 min</div><h2 style="margin-top:.9rem">Who's taking the audit?</h2>${detailsHtml("xcompany",x.company,"cxo-next")}`;}
  else if(st<=ORDER.length){const k=ORDER[st-1],s=x.size[k];canNext=s===0||(s!=null&&x.lvl[k]!=null);
    body=`<div class="title">${ico(k,30)}<h2>${DEPTS[k].name}</h2></div>
    <div class="ask"><p>Team size</p><div class="opts inline">${X_SIZE.map((o,j)=>`<button class="opt" data-act="x-size" data-k="${k}" data-j="${j}" aria-pressed="${s===j}">${o[0]}</button>`).join("")}</div></div>
    ${s>0?`<div class="ask"><p>How do they use AI today?</p><div class="opts">${X_LVL.map((o,j)=>`<button class="opt" data-act="x-lvl" data-k="${k}" data-j="${j}" aria-pressed="${x.lvl[k]===j}">${meter(o[2],4)}${o[0]}</button>`).join("")}</div></div>`:""}`;}
  else{canNext=Object.keys(x.org).length===X_ORG.length;
    body=`<h2>Three last questions</h2>${X_ORG.map((q,i)=>`<div class="ask"><p>${q[0]}</p><div class="opts inline" style="grid-template-columns:repeat(auto-fit,minmax(10rem,1fr))">${q[1].map((o,j)=>`<button class="opt" data-act="x-org" data-i="${i}" data-j="${j}" aria-pressed="${x.org[i]===j}">${meter(j,3)}${o}</button>`).join("")}</div></div>`).join("")}`;}
  const cur=st>=1&&st<=ORDER.length?ORDER[st-1]:null;
  return `<div class="work"><aside class="viz">${radar(cxoAxes(cur),"Company AI coverage so far")}${LEG("Possible","You",L_TYP)}</aside>
  <div><div class="prog"><i style="width:${(st+1)/total*100}%"></i></div>${body}
  <div class="foot">${st>0?`<button class="btn ghost" data-act="cxo-back">Back</button>`:`<span></span>`}<button class="btn" data-act="cxo-next" ${canNext?"":"disabled"}>${st===total-1?"See results":"Next"}</button></div></div></div>`;
}

function vCxoResult(){
  const x=state.cxo,rows=ORDER.map(k=>[k,xscore(k)]).filter(r=>r[1]&&!r[1].absent).sort((a,b)=>b[1].hours-a[1].hours);
  const hrs=rows.reduce((s,r)=>s+r[1].hours,0),heads=rows.reduce((s,r)=>s+r[1].head,0)||1,unsure=rows.filter(r=>r[1].unsure);
  const pot=rows.reduce((s,r)=>s+r[1].pot*r[1].head,0)/heads,obs=rows.reduce((s,r)=>s+r[1].obs*r[1].head,0)/heads,typ=rows.reduce((s,r)=>s+TYP[r[0]]*r[1].head,0)/heads;
  const ov=Object.values(x.org),ready=ov.length?ov.reduce((s,v)=>s+v,0)/(ov.length*3):0,max=rows.length?rows[0][1].hours:1,top=rows.slice(0,3).map(r=>r[0]);
  return `<div class="work"><aside class="viz">${chart(cxoAxes(),"Company AI coverage")}${LEG("Possible","You",L_TYP)}${stats3([pct(pot),"possible"],[pct(obs),"in use"],[pct(ready),"readiness"])}</aside>
  <div><div class="eyebrow">Executive snapshot · results</div><h2 style="margin-top:.9rem">${esc(x.company)}: about ${Math.round(hrs/10)*10} hours a week within reach</h2>
  <p class="help" style="margin-top:.6rem">You use ${pct(obs)}. A typical company uses ${pct(typ)}. ${pct(pot)} is possible.</p>
  <section class="block"><h3>Where the hours are</h3><div class="hbars">${rows.map(([k,s])=>`<div class="hbar"><div class="n"><span>${ico(k,18)}<b>${DEPTS[k].name}</b>${s.unsure?`<span class="tag hitl">Blind spot</span>`:""}</span><span class="muted">${Math.round(s.hours)} hrs/wk</span></div><div class="trk"><i class="b" style="width:${s.hours/max*100}%"></i></div></div>`).join("")}</div></section>
  ${unsure.length?`<p class="help">Blind spot means you couldn't tell how the team uses AI. Usage there is likely individual and unmanaged.</p>`:""}
  ${CLOSING_NOTE}
  <section class="block"><h3>Next: audit ${top.map(k=>DEPTS[k].name).join(", ")}</h3>
  <div class="row"><button class="btn" data-act="cxo-to-dept" data-top="${top.join(",")}">Set up department audit</button><button class="btn ghost" data-act="cxo-redo">Edit answers</button></div></section></div></div>`;
}

const CLOSING_NOTE=`<section class="block"><h3>Your report</h3><p class="help">Thanks for completing the audit. Our team will email you a detailed report at the earliest possible.</p></section>`;
function vSetup(){
  const ok=okDetails(state.company)&&state.selected.length;
  return `<div class="narrow"><div class="eyebrow">Department audit · setup</div><h2 style="margin-top:.9rem">Set up the audit</h2>
  ${detailsHtml("company",state.company,"")}
  <div class="ask"><p>Teams to audit</p><div class="tiles">${ORDER.map(k=>`<button class="tile" data-act="toggle" data-k="${k}" aria-pressed="${state.selected.includes(k)}">${ico(k,26)}${DEPTS[k].name}</button>`).join("")}</div>
  <button class="link" data-act="toggle-all">${state.selected.length===ORDER.length?"Clear":"Select all"}</button></div>
  <div class="foot"><button class="btn ghost" data-act="home">Back</button><button class="btn" id="begin" data-act="hub" ${ok?"":"disabled"}>Continue</button></div></div>`;
}

function vHub(){
  const sel=state.selected,sc=sel.map(k=>[k,score(k)]),done=sc.filter(r=>r[1]),hrs=done.reduce((s,r)=>s+(r[1].hours||0),0);
  const complete=sel.filter(k=>{const p=progress(k);return p.done===p.total;}).length;
  const all=[];done.forEach(([k,s])=>s.items.forEach(it=>{if(it.gap>0)all.push(it);}));all.sort((a,b)=>b.score-a.score);const top=all.slice(0,8);
  let code="";try{code=btoa(unescape(encodeURIComponent(JSON.stringify({company:state.company,selected:state.selected,depts:state.depts}))));}catch(e){}
  const avg=f=>done.length?pct(done.reduce((s,r)=>s+r[1][f],0)/done.length):"–";
  return `${state.sample?`<div class="banner"><span>Sample: a typical mid-size company.</span><button class="btn" data-act="reset">Start my own</button></div>`:""}
  <div class="work"><aside class="viz">${chart(companyAxes(),"Company AI coverage by department")}${LEG("Possible","In use",L_TYP)}${stats3([avg("pot"),"possible"],[avg("obs"),"in use"],[hrs?Math.round(hrs):"–","hours a week"])}</aside>
  <div><div class="dhead"><h2>${esc(state.company)}</h2><span class="count">${complete}/${sel.length} teams done</span></div>
  <div class="dlist">${sel.map(k=>{const p=progress(k),s=score(k),full=p.done===p.total;
    return `<button class="dcard" data-act="open" data-k="${k}">${ico(k,26)}<span><span class="nm">${DEPTS[k].name}</span><br><span class="st ${full?"done":""}">${full?"Done":p.done?`${p.done}/${p.total}`:"Not started"}</span></span>
    <span class="nums">${s?`<span class="p">${pct(s.pot)}</span> possible<br><span class="o">${pct(s.obs)}</span> in use`:`<span class="muted">Start</span>`}</span><span class="pb"><i style="width:${p.done/p.total*100}%"></i></span></button>`;}).join("")}</div>
  <p style="margin-top:.8rem"><button class="link" data-act="setup">Add or remove teams</button></p>
  ${state.sample?"":complete===sel.length&&sel.length?CLOSING_NOTE:`<section class="block"><h3>Your report</h3><p class="help">Finish every team (${complete}/${sel.length} done). Once complete, our team will email you a detailed report at the earliest possible.</p></section>`}
  ${top.length?`<section class="block"><h3>Where to start</h3>${quad(top)}<div style="margin-top:.5rem">${oppList(top,true)}</div></section>`:""}
  <section class="block"><details><summary>Collect answers from others</summary><div><p class="help">Answers stay in this browser. Each person copies their code and sends it to you.</p><textarea id="out" readonly aria-label="Answers code">${code}</textarea><div class="row"><button class="btn ghost" data-act="copy">Copy my code</button><span class="msg" id="copymsg" role="status"></span></div>
    <textarea id="in" aria-label="Paste a code" placeholder="Paste a code you received"></textarea><div class="row"><button class="btn ghost" data-act="merge">Add their answers</button><span class="msg" id="mergemsg" role="status"></span></div></div></details>
  <details><summary>Guardrails</summary><div><ul><li>A person approves payments, hiring decisions and contracts. Always.</li><li>AI writes to your systems only after someone approves, until error rates are measured.</li><li>Use official connectors with the narrowest access that does the job.</li><li>Personal data stays within your DPDP Act obligations.</li><li>Measure rework, not only speed.</li></ul></div></details>
  <details><summary>How scores work</summary><div><p class="note">Each task has a benchmark for how much of it AI can carry today with a person reviewing. "Possible" is the average of those, weighted by where the team spends time. "In use" scales each task by how it gets done today. Hours a week = team size × 40 × the gap × 0.5, assuming half the gap is realistically captured. A quick win is a task AI can largely carry, in a team that scored 50% or more on setup.</p></div></details>
  <details><summary>Start over</summary><div><div class="row"><button class="btn ghost" data-act="reset">Clear this audit</button></div></div></details></section></div></div>`;
}

const STEPS=["Work","Setup","Results"];
function vDept(k){
  const D=DEPTS[k],d=state.depts[k],p=progress(k),st=Math.min(d.step||0,2),s=score(k);
  const ck=[p.a===p.n,p.r===READY.length&&p.h===1,false];let body="",endBtns="";
  if(st===0)body=`<p class="help" style="margin-bottom:.4rem">How much of the team's week goes here? Then, how is it done today?</p>
    ${D.acts.map((a,i)=>{const ans=d.a[i]||{};return `<div class="act ${i===touch?"hot":""}"><div class="name">${esc(SHORT[k][i])}</div><div class="sub">${esc(a[0])}</div><div class="q"><span class="lab">Time</span>${seg("t",i,ans.t,T,"",3)}</div>${ans.t>0?`<div class="q"><span class="lab">Today</span>${seg("c",i,ans.c==null?-1:ans.c,C.map(x=>x[0]),"c",4)}</div>`:""}</div>`;}).join("")}`;
  if(st===1)body=`${READY.map((q,i)=>`<div class="rq"><p>${esc(q[0])}</p>${seg("r",i,d.r[i],q[1],"",3)}</div>`).join("")}
    <div class="pair"><label>Team size<input type="number" min="0" data-f="head" value="${esc(d.head)}" placeholder="People"></label><label>Main tools (optional)<input type="text" data-f="tools" value="${esc(d.tools)}" placeholder="e.g. ${esc(CONNECT[k].split(",")[0])}"></label></div>`;
  if(st===2){const nxt=state.selected.find(x=>x!==k&&progress(x).done<progress(x).total),items=s?s.items.filter(x=>x.gap>0).slice(0,5):[];
    body=`<div class="proof"><div>${ico("quote",18)}<span>${esc(PROOF[k])}</span></div><div>${ico("plug",18)}<span>Connects today: ${esc(CONNECT[k])}</span></div></div>
    ${!d.head&&s?`<div class="pair" style="border:0;padding:0 0 .5rem"><label>Team size, to see hours<input type="number" min="0" data-f="head" data-rerender="1" placeholder="People"></label></div>`:""}
    <h3 style="margin:1rem 0 .2rem">Where to start</h3>${oppList(items)}
    ${p.done<p.total?`<p class="help" style="margin-top:.8rem">${p.total-p.done} unanswered.</p>`:""}`;
    endBtns=nxt?`<button class="btn" data-act="open" data-k="${nxt}">Next: ${DEPTS[nxt].name}</button>`:`<button class="btn" data-act="hub">Company overview</button>`;}
  return `<div class="work"><aside class="viz" id="viz">${vizDept(k)}</aside>
  <div><div class="dhead"><div class="title">${ico(k,30)}<h2>${D.name}</h2></div><span class="count">${p.done}/${p.total}</span></div>
  <div class="steps">${STEPS.map((n,i)=>`<button data-act="step" data-n="${i}" aria-current="${st===i}">${ck[i]?`<span class="ck">✓</span>`:""}${n}</button>`).join("")}</div>
  ${body}
  <div class="foot">${st>0?`<button class="btn ghost" data-act="step" data-n="${st-1}">Back</button>`:`<span></span>`}${st<2?`<button class="btn" data-act="step" data-n="${st+1}">Next</button>`:endBtns}</div></div></div>`;
}
function vizDept(k){const s=score(k);return radar(deptAxes(k),DEPTS[k].name+" AI coverage by task")+LEG("Possible","In use",L_HOL)+(s?stats3([pct(s.pot),"possible"],[pct(s.obs),"in use"],[s.hours?Math.round(s.hours):s.ready==null?"–":pct(s.ready),s.hours?"hours a week":"setup"]):"");}

/* ---------- Render ---------- */
function bar(){
  const v=state.view;let right="";
  if(v.startsWith("dept:"))right=`<span class="crumb"><button data-act="hub">${esc(state.company)||"Company"}</button><span>›</span>${DEPTS[v.slice(5)].name}</span>`;
  else if(v==="hub"||v==="setup")right=`<span>Department audit</span>`;
  else if(v==="cxo"||v==="cxoResult")right=`<span>Executive snapshot</span>`;
  document.getElementById("bar").innerHTML=`<button class="brand" data-act="home" aria-label="AI enablement audit, home"><img src="/cii-mark.svg" alt="" width="40" height="26"><span class="wordmark">CII</span></button><span class="sep"></span><span class="prod">AI enablement research</span><span style="flex:1"></span><span class="right">${right}<span id="savestate" class="saving"></span></span>`;
  setSaveState(saveState);
}
function render(keepScroll){
  if((state.view==="hub"||state.view.startsWith("dept:"))&&!state.sample&&!state.rid)state.view="setup";
  if(state.view==="cxoResult"&&!state.cxo.rid){state.cxo.step=0;state.cxo.done=false;state.view="cxo";}
  if(state.view==="cxo"&&state.cxo.step>0&&!state.cxo.rid)state.cxo.step=0;
  const v=state.view,app=document.getElementById("app"),y=window.scrollY;bar();
  app.innerHTML=v==="home"?vHome():v==="cxo"?vCxo():v==="cxoResult"?vCxoResult():v==="setup"?vSetup():v==="hub"?vHub():vDept(v.slice(5));
  const key=v+(v==="cxo"?state.cxo.step:"")+(v.startsWith("dept:")?state.depts[v.slice(5)].step:"");
  if(key!==lastView){app.classList.remove("enter");void app.offsetWidth;app.classList.add("enter");window.scrollTo(0,0);const af=app.querySelector("[autofocus]");if(af)af.focus();}
  else if(keepScroll)window.scrollTo(0,y);
  lastView=key;save();
}
function go(v){state.view=v;touch=-1;render();}
const sortSel=()=>state.selected.sort((p,q)=>ORDER.indexOf(p)-ORDER.indexOf(q));
function wipe(){const c=state.cxo,p=state.person;state=fresh();state.cxo=c;state.person=p;}

/* ---------- Actions ---------- */
let timer=null;
function act(b){
  const a=b.dataset.act,x=state.cxo;clearTimeout(timer);
  if(a==="home")return go("home");
  if(a==="cxo"){if(x.done){x.done=false;x.step=0;}return go("cxo");}
  if(a==="cxo-result")return go("cxoResult");
  if(a==="cxo-redo"){x.done=false;x.step=0;return go("cxo");}
  if(a==="cxo-back"){x.step=Math.max(0,x.step-1);return render();}
  if(a==="cxo-next"){if(b.disabled)return;if(x.step===0){if(!okDetails(x.company))return;claim(x,x.company);}if(x.step>=ORDER.length+1){x.done=true;save();flush();return go("cxoResult");}x.step++;return render();}
  if(a==="x-size"){const k=b.dataset.k,j=+b.dataset.j;x.size[k]=j;render(true);if(j===0)timer=setTimeout(()=>{x.step++;render();},300);return;}
  if(a==="x-lvl"){x.lvl[b.dataset.k]=+b.dataset.j;render(true);timer=setTimeout(()=>{x.step++;render();},350);return;}
  if(a==="x-org"){x.org[+b.dataset.i]=+b.dataset.j;return render(true);}
  if(a==="cxo-to-dept"){if(state.sample)wipe();if(!state.company)state.company=x.company;b.dataset.top.split(",").filter(Boolean).forEach(k=>{if(!state.selected.includes(k))state.selected.push(k);});sortSel();return go("setup");}
  if(a==="setup"){if(state.sample&&state.view==="home")wipe();return go("setup");}
  if(a==="toggle"){const k=b.dataset.k,i=state.selected.indexOf(k);if(i<0)state.selected.push(k);else state.selected.splice(i,1);sortSel();return render(true);}
  if(a==="toggle-all"){state.selected=state.selected.length===ORDER.length?[]:ORDER.slice();return render(true);}
  if(a==="hub"){if(b.disabled)return;if(state.view==="setup"){if(!okDetails(state.company)||!state.selected.length)return;claim(state,state.company);}
    else if(!state.sample&&!state.rid)return go("setup");return go(state.selected.length?"hub":"setup");}
  if(a==="open")return go("dept:"+b.dataset.k);
  if(a==="step"){state.depts[state.view.slice(5)].step=+b.dataset.n;touch=-1;return render();}
  if(a==="ans"){const d=state.depts[state.view.slice(5)],i=+b.dataset.i,j=+b.dataset.j,kind=b.dataset.kind;
    if(kind==="r")d.r[i]=j;else{d.a[i]=d.a[i]||{};d.a[i][kind]=j;if(kind==="t"&&d.a[i].c==null)d.a[i].c=0;touch=i;}
    return render(true);}
  if(a==="sample"){wipe();state.company="Typical mid-size company";state.sample=true;state.selected=ORDER.slice();
    ORDER.forEach(k=>{const t=TYPICAL[k],d=state.depts[k];d.head=String(t.head);d.tools=t.tools;t.a.forEach((v,i)=>d.a[i]={t:v[0],c:v[1]});t.r.forEach((v,i)=>d.r[i]=v);d.step=2;});return go("hub");}
  if(a==="reset"){flush();wipe();return go("setup");}
  if(a==="copy"){const t=document.getElementById("out");t.select();let ok=false;try{ok=document.execCommand("copy");}catch(_){}
    if(navigator.clipboard)navigator.clipboard.writeText(t.value).then(()=>{},()=>{});document.getElementById("copymsg").textContent=ok?"Copied":"Selected. Press Ctrl or Cmd + C.";return;}
  if(a==="merge"){const m=document.getElementById("mergemsg");
    try{const inc=JSON.parse(decodeURIComponent(escape(atob(document.getElementById("in").value.trim())))),got=[];
      ORDER.forEach(k=>{const d=inc.depts&&inc.depts[k];if(d&&(Object.keys(d.a||{}).length||Object.keys(d.r||{}).length)){state.depts[k]=Object.assign(blank(),d);if(!state.selected.includes(k))state.selected.push(k);got.push(DEPTS[k].name);}});sortSel();
      if(got.length){render(true);const d=document.querySelector("details");if(d)d.open=true;document.getElementById("mergemsg").textContent="Added "+got.join(", ");}else m.textContent="No answers in that code.";
    }catch(_){m.style.color="var(--obs)";m.textContent="Couldn't read that code. Check all of it was pasted.";}return;}
}
document.addEventListener("click",e=>{const b=e.target.closest("[data-act]");if(b)act(b);});
document.addEventListener("keydown",e=>{if(e.key!=="Enter")return;const t=e.target;
  if(t.dataset&&t.dataset.enter){const b=document.querySelector(`.foot [data-act="${t.dataset.enter}"]`);if(b&&!b.disabled)act(b);}
  else if(t.tagName==="text"&&t.dataset.act)act(t);});
document.addEventListener("input",e=>{const f=e.target.dataset&&e.target.dataset.f;if(!f)return;const v=e.target.value;
  if(f==="pname"||f==="pemail"||f==="xcompany"||f==="company"){
    if(f==="pname")state.person.name=v;else if(f==="pemail"){state.person.email=v;e.target.classList.remove("bad");const er=document.getElementById("emailerr");if(er)er.textContent="";}
    else if(f==="xcompany")state.cxo.company=v;else state.company=v;
    const n=document.querySelector('.foot [data-act="cxo-next"]');if(n&&state.view==="cxo")n.disabled=!okDetails(state.cxo.company);
    const g=document.getElementById("begin");if(g)g.disabled=!(okDetails(state.company)&&state.selected.length);}
  else{const k=state.view.slice(5);if(!state.depts[k])return;state.depts[k][f]=v;if(f==="head"){const z=document.getElementById("viz");if(z)z.innerHTML=vizDept(k);}}
  save();});
document.addEventListener("change",e=>{if(e.target.dataset&&e.target.dataset.rerender)render(true);});
document.addEventListener("focusout",e=>{if(e.target.dataset&&e.target.dataset.f==="pemail"&&state.person.email&&!okEmail()){e.target.classList.add("bad");const er=document.getElementById("emailerr");if(er)er.textContent="Check this email address";}});
render();
