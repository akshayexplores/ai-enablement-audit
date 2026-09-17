/* Vajra AI enablement audit: scoring, summaries and charts.
   Shared by the audit (app.js) and the admin page (admin.js + report.js) so both render identical numbers and charts.

   Everything lives inside this function and is published on `window` ONLY if the page has not
   defined it already, so app.js keeps its own copies and nothing can clash. Each function reads
   the global `state` the page provides. */
(function () {
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
const homeAxes=()=>ORDER.map(k=>({label:DEPTS[k].name,pot:THEO[k],obs:TYP[k]}));
function companyAxes(){return state.selected.map(k=>{const s=score(k);return {label:DEPTS[k].name,pot:s?s.pot:THEO[k],obs:s?s.obs:0,typ:TYP[k],hollow:!s,act:"open",k};});}
function cxoAxes(cur){return ORDER.filter(k=>!(xscore(k)||{}).absent).map(k=>{const s=xscore(k);return {label:DEPTS[k].name,pot:THEO[k],obs:s?s.obs:0,typ:TYP[k],hollow:!s,bold:k===cur};});}

  const EXPORTS = { execSummary, deptSummary, pct, esc, score, progress, xscore, tagOf, wrap, radar, hbars, chart, homeAxes, companyAxes, cxoAxes };
  Object.keys(EXPORTS).forEach((k) => { if (typeof window[k] === "undefined") window[k] = EXPORTS[k]; });
})();
