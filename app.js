/* SIP-S1 dashboard — render puro (sem libs, SVG na mão) sobre window.SIPS1 */
(function(){
'use strict';
var D = window.SIPS1 || {};
var arr = function(x){ return Array.isArray(x) ? x : (x ? [x] : []); };
var clamp = function(x){ return Math.max(0, Math.min(1, x)); };
var nf0 = new Intl.NumberFormat('pt-BR');
var nf1 = new Intl.NumberFormat('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
var nf2 = new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
var money = function(v){ return 'R$ ' + nf2.format(v||0); };
var money0 = function(v){ return 'R$ ' + nf0.format(Math.round(v||0)); };
var intf = function(v){ return nf0.format(Math.round(v||0)); };
var pct = function(v){ return nf1.format(v||0) + '%'; };
var dv = function(a,b){ return b>0 ? a/b : 0; };
function fmtBR(iso){ if(!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso; var p=iso.split('-'); return p[2]+'/'+p[1]; }
function el(id){ return document.getElementById(id); }
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }

var COL={cy:'#22d3ee',cy2:'#67e8f9',vi:'#8b7cf0',vi2:'#a99bf7',good:'#34d399',warn:'#f5b041',bad:'#f2637e'};

var daily = arr(D.daily), grain = arr(D.grain), totals = D.totals||{};
var isDate = function(x){ return /^\d{4}-\d{2}-\d{2}$/.test(x); };
var allDates = daily.map(function(d){return d.date;}).filter(isDate).sort();
var maxDate = D.dateMax || allDates[allDates.length-1] || '';
var minDate = D.dateMin || allDates[0] || '';
function addDays(iso,n){ var p=iso.split('-'); var dt=new Date(Date.UTC(+p[0],+p[1]-1,+p[2])); dt.setUTCDate(dt.getUTCDate()+n); return dt.toISOString().slice(0,10); }
function daysBetween(a,b){ var pa=a.split('-'),pb=b.split('-'); return Math.round((Date.UTC(+pb[0],+pb[1]-1,+pb[2])-Date.UTC(+pa[0],+pa[1]-1,+pa[2]))/86400000); }
function inRange(dt,r){ return dt>=r[0] && dt<=r[1]; }

var PRESETS = [
  {k:'hoje',label:'Hoje'},{k:'ontem',label:'Ontem'},{k:'7d',label:'7 dias'},
  {k:'30d',label:'30 dias'},{k:'tudo',label:'Tudo'}
];
var period = 'tudo', customRange = null;
function rangeFor(k){
  if(k==='custom' && customRange) return customRange;
  if(k==='tudo')  return [minDate, maxDate];
  if(k==='hoje')  return [maxDate, maxDate];
  if(k==='ontem'){ var y=addDays(maxDate,-1); return [y,y]; }
  if(k==='7d')    return [addDays(maxDate,-6),  maxDate];
  if(k==='30d')   return [addDays(maxDate,-29), maxDate];
  return [minDate, maxDate];
}
function prevRange(rng){ var len=daysBetween(rng[0],rng[1])+1; var pe=addDays(rng[0],-1); return [addDays(pe,-(len-1)), pe]; }

var channel='geral';   // geral | meta | google
function chMatch(d){ return channel==='geral' || d.channel===channel; }
var CHMETS=['spend','impr','reach','clicks','lpv','platLeads','leads','mLeads','gLeads'];
function daysInRange(rng){
  var map={};
  daily.forEach(function(d){ if(!isDate(d.date)||!inRange(d.date,rng)||!chMatch(d)) return;
    var o=map[d.date]; if(!o){ o={date:d.date}; CHMETS.forEach(function(k){o[k]=0;}); map[d.date]=o; }
    o.spend+=d.spend||0;o.impr+=d.impr||0;o.reach+=d.reach||0;o.clicks+=d.clicks||0;o.lpv+=d.lpv||0;o.platLeads+=d.platLeads||0;o.leads+=d.leads||0;
    if(d.channel==='meta')o.mLeads+=d.leads||0; else if(d.channel==='google')o.gLeads+=d.leads||0;
  });
  return Object.keys(map).sort().map(function(k){return map[k];});
}
function aggDaily(rng){ var o={}; CHMETS.forEach(function(k){o[k]=0;});
  daysInRange(rng).forEach(function(d){ CHMETS.forEach(function(k){o[k]+=(d[k]||0);}); }); return o; }
function chLabel(){ return channel==='meta'?'Meta Ads':(channel==='google'?'Google Ads':'Geral (Meta + Google)'); }
function hasReach(a){ return (a.reach||0)>0; }
function hasLPV(a){ return (a.lpv||0)>0; }
function median(xs){ var a=xs.filter(function(x){return x!=null&&isFinite(x);}).sort(function(x,y){return x-y;}); if(!a.length)return 0; var m=Math.floor(a.length/2); return a.length%2?a[m]:(a[m-1]+a[m])/2; }
function relClass(v,med){ if(v==null||!isFinite(v)||v<=0||med<=0) return 'cpl-n'; var r=v/med; if(r<=0.85)return 'cpl-g'; if(r<=1.3)return 'cpl-a'; return 'cpl-r'; }

/* ---------- trend ---------- */
function trendHTML(cur, prev, higherBetter){
  if(prev==null || !isFinite(prev) || prev===0 || !isFinite(cur)) return '';
  var ch=(cur-prev)/Math.abs(prev)*100; if(Math.abs(ch)<0.1) return '';
  var up=ch>0, good = higherBetter?up:!up;
  return '<span class="trend '+(good?'up':'down')+'">'+(up?'▲':'▼')+' '+nf1.format(Math.abs(ch))+'%</span>';
}

/* =================== KPI COLUMN =================== */
function subRow(l,v,tr){ return '<div class="sub-row"><span class="s-l">'+l+'</span><span class="s-v">'+v+(tr||'')+'</span></div>'; }
function kpiCard(hl,label,val,subs){
  return '<div class="kpi-card'+(hl?' hl':'')+'"><div class="kpi-main"><div class="m-lab">'+label+'</div><div class="m-val">'+val+'</div></div>'
    +'<div class="kpi-sub">'+subs+'</div></div>';
}
function renderKpiCol(a, p){
  var cpl=dv(a.spend,a.leads);
  var heroLab = channel==='google' ? 'Investimento Google (sem imposto)'
             : channel==='meta'   ? 'Investimento Meta (com imposto)'
             : 'Investimento · Meta c/ imposto + Google s/ imposto';
  var platLab = channel==='google' ? 'Conversões Google' : (channel==='meta' ? 'Leads pixel Meta' : 'Leads plataforma');
  var hero='<div class="kpi-hero"><div class="h-lab">'+heroLab+'</div>'
    +'<div class="h-val">'+money(a.spend)+'</div>'
    +'<div class="h-foot"><span>CPL <b>'+(a.leads?money(cpl):'—')+'</b></span>'
    +'<span>'+platLab+' <b>'+intf(a.platLeads)+'</b></span></div></div>';

  var cards='';
  cards+=kpiCard(false,'Impressões',intf(a.impr),
    subRow('CPM', money(dv(a.spend,a.impr)*1000), trendHTML(dv(a.spend,a.impr)*1000, dv(p.spend,p.impr)*1000, false))
    + subRow('CTR', pct(dv(a.clicks,a.impr)*100), trendHTML(dv(a.clicks,a.impr), dv(p.clicks,p.impr), true)));
  if(hasReach(a)) cards+=kpiCard(false,'Alcance'+(channel==='geral'?' <small style="color:var(--muted2)">(Meta)</small>':''),intf(a.reach),
    subRow('Frequência', nf1.format(dv(a.impr,a.reach))+'x', trendHTML(dv(a.impr,a.reach), dv(p.impr,p.reach), false))
    + subRow('Custo / mil alcançados', money(dv(a.spend,a.reach)*1000), trendHTML(dv(a.spend,a.reach)*1000, dv(p.spend,p.reach)*1000, false)));
  cards+=kpiCard(false,'Cliques',intf(a.clicks),
    subRow('CPC', money(dv(a.spend,a.clicks)), trendHTML(dv(a.spend,a.clicks), dv(p.spend,p.clicks), false))
    + (hasLPV(a)? subRow('Connect rate <small>(LP÷clique)</small>', pct(dv(a.lpv,a.clicks)*100), trendHTML(dv(a.lpv,a.clicks), dv(p.lpv,p.clicks), true))
                : subRow('CTR', pct(dv(a.clicks,a.impr)*100), '')));
  if(hasLPV(a)) cards+=kpiCard(false,'Landing Page Views',intf(a.lpv),
    subRow('Custo/LPV', money(dv(a.spend,a.lpv)), trendHTML(dv(a.spend,a.lpv), dv(p.spend,p.lpv), false))
    + subRow('LPV → Lead', pct(dv(a.leads,a.lpv)*100), trendHTML(dv(a.leads,a.lpv), dv(p.leads,p.lpv), true)));
  var originSub = channel==='geral'
    ? subRow('Por canal', '<small><b class="chip-pago">'+intf(a.mLeads)+' Meta</b> · <b class="chip-org">'+intf(a.gLeads)+' Google</b></small>','')
    : subRow('Conversão clique→lead', pct(dv(a.leads,a.clicks)*100),'');
  cards+=kpiCard(true,'Leads (formulário)',intf(a.leads),
    subRow('CPL', money(cpl), trendHTML(cpl, dv(p.spend,p.leads), false))
    + subRow('Clique → Lead', pct(dv(a.leads,a.clicks)*100), trendHTML(dv(a.leads,a.clicks), dv(p.leads,p.clicks), true))
    + originSub);
  el('kpiCol').innerHTML = hero + cards;
}

/* =================== CHARTS (SVG) =================== */
function xticks(days){ var n=days.length; if(n<=1) return [0]; var step=Math.max(1,Math.round(n/7)); var t=[]; for(var i=0;i<n;i+=step)t.push(i); if(t[t.length-1]!==n-1)t.push(n-1); return t; }
var _tip=null;
function tipEl(){ if(!_tip){ _tip=document.createElement('div'); _tip.className='chart-tip'; _tip.style.display='none'; document.body.appendChild(_tip); } return _tip; }
function tipShow(html,x,y){ var t=tipEl(); t.innerHTML=html; t.style.display='block'; var w=t.offsetWidth,h=t.offsetHeight,nx=x+14,ny=y+14;
  if(nx+w>window.innerWidth-8) nx=x-w-14; if(ny+h>window.innerHeight-8) ny=y-h-14; t.style.left=Math.max(6,nx)+'px'; t.style.top=Math.max(6,ny)+'px'; }
function tipHide(){ if(_tip) _tip.style.display='none'; }
function hitRects(days,pl,gw,pt,ph){ var s=''; for(var i=0;i<days.length;i++){ s+='<rect class="hit" data-i="'+i+'" x="'+(pl+gw*i).toFixed(1)+'" y="'+pt+'" width="'+gw.toFixed(1)+'" height="'+ph+'" fill="transparent" pointer-events="all"/>'; } return s; }
function bindHits(containerId,days,fmt){ var c=el(containerId); if(!c) return;
  Array.prototype.forEach.call(c.querySelectorAll('.hit'),function(r){
    r.addEventListener('mousemove',function(e){ var i=+r.getAttribute('data-i'); if(days[i]) tipShow(fmt(days[i]),e.clientX,e.clientY); });
    r.addEventListener('mouseleave',tipHide); }); }
function tipLeads(d){
  var s='<div class="tt-d">'+fmtBR(d.date)+'</div>'
    +'<div class="tt-r"><span style="color:'+COL.cy2+'">Leads</span><b>'+intf(d.leads)+'</b></div>';
  if(channel==='geral'){ s+='<div class="tt-r"><span style="color:'+COL.cy+'">Meta</span><b>'+intf(d.mLeads)+'</b></div>'
    +'<div class="tt-r"><span style="color:'+COL.vi2+'">Google</span><b>'+intf(d.gLeads)+'</b></div>'; }
  return s+'<div class="tt-sub">Investimento '+money0(d.spend)+' · CPL '+(d.leads?money(dv(d.spend,d.leads)):'—')+'</div>'; }
function tipInvest(d){
  return '<div class="tt-d">'+fmtBR(d.date)+'</div>'
    +'<div class="tt-r"><span style="color:'+COL.cy2+'">Investimento</span><b>'+money0(d.spend)+'</b></div>'
    +'<div class="tt-r"><span style="color:'+COL.warn+'">CPL</span><b>'+(d.leads>0?money(dv(d.spend,d.leads)):'—')+'</b></div>'
    +'<div class="tt-sub">Leads '+intf(d.leads)+' · CPM '+money(dv(d.spend,d.impr)*1000)+'</div>'; }

function renderChartLeads(days){
  var W=600,H=210,pl=30,pr=10,pt=12,pb=22,pw=W-pl-pr,ph=H-pt-pb,base=pt+ph;
  var maxL=Math.max.apply(null,days.map(function(d){return d.leads||0;}).concat([1]));
  var n=days.length||1,gw=pw/n,bw=Math.max(3,Math.min(20,gw*0.5));
  var s='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMid meet">';
  [0,0.5,1].forEach(function(f){ var y=pt+ph*(1-f); s+='<line x1="'+pl+'" y1="'+y+'" x2="'+(W-pr)+'" y2="'+y+'" stroke="#182034" stroke-dasharray="2 3"/>'; s+='<text x="'+(pl-4)+'" y="'+(y+3)+'" text-anchor="end" fill="#586a8c" font-size="9">'+Math.round(maxL*f)+'</text>'; });
  var single = channel!=='geral', sColor = channel==='google'?COL.vi:COL.cy;
  days.forEach(function(d,i){
    var xc=pl+gw*i+gw/2;
    if(single){ var h=ph*dv(d.leads,maxL); if(d.leads>0) s+='<rect x="'+(xc-bw/2).toFixed(1)+'" y="'+(base-h).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+h.toFixed(1)+'" rx="1.5" fill="'+sColor+'"/>'; }
    else { var hm=ph*dv(d.mLeads,maxL), hg=ph*dv(d.gLeads,maxL);
      if(d.mLeads>0) s+='<rect x="'+(xc-bw/2).toFixed(1)+'" y="'+(base-hm).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+hm.toFixed(1)+'" rx="1.5" fill="'+COL.cy+'"/>';
      if(d.gLeads>0) s+='<rect x="'+(xc-bw/2).toFixed(1)+'" y="'+(base-hm-hg).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+hg.toFixed(1)+'" rx="1.5" fill="'+COL.vi+'"/>'; }
  });
  xticks(days).forEach(function(i){ var xc=pl+gw*i+gw/2; s+='<text x="'+xc.toFixed(1)+'" y="'+(H-6)+'" text-anchor="middle" fill="#586a8c" font-size="9">'+fmtBR(days[i].date)+'</text>'; });
  s+=hitRects(days,pl,gw,pt,ph)+'</svg>';
  var legend = single ? '<span><span class="dot" style="background:'+sColor+'"></span>Leads</span>'
    : '<span><span class="dot" style="background:'+COL.cy+'"></span>Meta</span><span><span class="dot" style="background:'+COL.vi+'"></span>Google</span>';
  el('chartLeads').innerHTML='<div class="chart">'+s+'</div><div class="chart-legend">'+legend+'</div>';
  bindHits('chartLeads',days,tipLeads);
}
function renderChartInvest(days){
  var W=600,H=210,pl=34,pr=38,pt=12,pb=22,pw=W-pl-pr,ph=H-pt-pb,base=pt+ph;
  var maxS=Math.max.apply(null,days.map(function(d){return d.spend||0;}).concat([1]));
  var cpls=days.map(function(d){ return d.leads>0?dv(d.spend,d.leads):null; });
  var maxC=Math.max.apply(null,cpls.filter(function(x){return x!=null;}).concat([1]));
  var n=days.length||1,gw=pw/n,bw=Math.max(3,Math.min(20,gw*0.55));
  var s='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMid meet">';
  [0,0.5,1].forEach(function(f){ var y=pt+ph*(1-f); s+='<line x1="'+pl+'" y1="'+y+'" x2="'+(W-pr)+'" y2="'+y+'" stroke="#182034" stroke-dasharray="2 3"/>';
    s+='<text x="'+(pl-4)+'" y="'+(y+3)+'" text-anchor="end" fill="#586a8c" font-size="9">'+Math.round(maxS*f)+'</text>';
    s+='<text x="'+(W-pr+4)+'" y="'+(y+3)+'" text-anchor="start" fill="#c98a2a" font-size="9">'+Math.round(maxC*f)+'</text>'; });
  days.forEach(function(d,i){ var xc=pl+gw*i+gw/2, sh=ph*dv(d.spend,maxS);
    if(d.spend>0) s+='<rect x="'+(xc-bw/2).toFixed(1)+'" y="'+(base-sh).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+sh.toFixed(1)+'" rx="1.5" fill="rgba(34,211,238,.34)"/>'; });
  var pts=[]; days.forEach(function(d,i){ if(cpls[i]!=null){ var xc=pl+gw*i+gw/2, y=base-ph*dv(cpls[i],maxC); pts.push([xc,y]); } });
  if(pts.length>1){ var dpath='M'+pts.map(function(pp){return pp[0].toFixed(1)+' '+pp[1].toFixed(1);}).join(' L'); s+='<path d="'+dpath+'" fill="none" stroke="'+COL.warn+'" stroke-width="2"/>'; }
  pts.forEach(function(pp){ s+='<circle cx="'+pp[0].toFixed(1)+'" cy="'+pp[1].toFixed(1)+'" r="2.6" fill="'+COL.warn+'"/>'; });
  xticks(days).forEach(function(i){ var xc=pl+gw*i+gw/2; s+='<text x="'+xc.toFixed(1)+'" y="'+(H-6)+'" text-anchor="middle" fill="#586a8c" font-size="9">'+fmtBR(days[i].date)+'</text>'; });
  s+=hitRects(days,pl,gw,pt,ph)+'</svg>';
  el('chartInvest').innerHTML='<div class="chart">'+s+'</div><div class="chart-legend"><span><span class="dot" style="background:rgba(34,211,238,.55)"></span>Investimento</span><span><span class="ln" style="background:'+COL.warn+'"></span>CPL</span></div>';
  bindHits('chartInvest',days,tipInvest);
}

/* =================== DAILY HEATMAP =================== */
function heatBg(rgb,frac){ return 'background:rgba('+rgb+','+(0.10+0.42*clamp(frac)).toFixed(3)+')'; }
function renderDaily(rng){
  var rows=daysInRange(rng).slice().sort(function(a,b){return b.date.localeCompare(a.date);});
  var maxS=Math.max.apply(null,rows.map(function(r){return r.spend||0;}).concat([1]));
  var maxL=Math.max.apply(null,rows.map(function(r){return r.leads||0;}).concat([1]));
  var medCpl=median(rows.map(function(r){return r.leads>0?dv(r.spend,r.leads):null;}));
  var medCpm=median(rows.map(function(r){return r.impr>0?dv(r.spend,r.impr)*1000:null;}));
  var head='<thead><tr><th>Dia</th><th>Gasto</th><th>Impressões</th><th>Cliques</th><th>Leads</th><th>CPL</th><th>CPM</th><th>CTR</th></tr></thead>';
  var body=rows.map(function(r){
    var cpl=r.leads>0?dv(r.spend,r.leads):null, cpm=dv(r.spend,r.impr)*1000, ctr=dv(r.clicks,r.impr)*100;
    return '<tr><td>'+fmtBR(r.date)+'</td>'
      +'<td class="num"><span class="heatcell" style="'+heatBg('34,211,238',r.spend/maxS)+'">'+money0(r.spend)+'</span></td>'
      +'<td class="num">'+intf(r.impr)+'</td>'
      +'<td class="num">'+intf(r.clicks)+'</td>'
      +'<td class="num"><span class="heatcell" style="'+heatBg('103,232,249',r.leads/maxL)+'">'+intf(r.leads)+'</span></td>'
      +'<td class="num">'+(cpl!=null?'<span class="cpl-pill '+relClass(cpl,medCpl)+'">'+money0(cpl)+'</span>':'—')+'</td>'
      +'<td class="num"><span class="cpl-pill '+relClass(cpm,medCpm)+'">'+money(cpm)+'</span></td>'
      +'<td class="num">'+pct(ctr)+'</td></tr>';
  }).join('');
  if(!rows.length) body='<tr><td colspan="8" class="empty">Sem dados no período.</td></tr>';
  el('dailyTbl').innerHTML=head+'<tbody>'+body+'</tbody>';
}

/* =================== OTIMIZAÇÃO (árvore inline) =================== */
function prettyName(x){ return x==='SEM_RASTREIO' ? '— sem rastreio (orgânico) —' : x; }
function newNode(name,full){ return {name:name,full:full,spend:0,impr:0,reach:0,clicks:0,lpv:0,leads:0,kids:{}}; }
function accum(n,r){ n.spend+=r.spend||0;n.impr+=r.impr||0;n.reach+=r.reach||0;n.clicks+=r.clicks||0;n.lpv+=r.lpv||0;n.leads+=r.leads||0; }
var expanded={}, treeInited=false;
function buildTree(rows){ var c={}; rows.forEach(function(r){
  var cn=c[r.campaign]||(c[r.campaign]=newNode(prettyName(r.campaign),r.campaign)); accum(cn,r);
  var sn=cn.kids[r.adset]||(cn.kids[r.adset]=newNode(prettyName(r.adset),r.adset)); accum(sn,r);
  var an=sn.kids[r.ad]||(sn.kids[r.ad]=newNode(prettyName(r.ad),r.ad)); accum(an,r); }); return c; }
function actTag(n,med){
  if(n.spend===0 && n.leads>0) return {t:'—',c:'act-ins'};
  if(n.spend>0 && n.leads===0) return {t:'Atenção',c:'act-at'};
  if(n.leads<3) return {t:'Dado insuf.',c:'act-ins'};
  if(med<=0) return {t:'—',c:'act-ins'};
  var r=dv(n.spend,n.leads)/med;
  if(r<=0.8) return {t:'Acelerar',c:'act-acel'};
  if(r>=1.35) return {t:'Revisar',c:'act-rev'};
  return {t:'Manter',c:'act-mant'};
}
function metricsCells(n,med){ var cpl=n.leads>0?dv(n.spend,n.leads):null, ctr=dv(n.clicks,n.impr)*100, conn=dv(n.lpv,n.clicks)*100, tag=actTag(n,med);
  return '<td class="num">'+money0(n.spend)+'</td>'
    +'<td class="num">'+intf(n.leads)+'</td>'
    +'<td class="num">'+(cpl!=null?'<span class="cpl-pill '+relClass(cpl,med)+'">'+money0(cpl)+'</span>':'—')+'</td>'
    +'<td class="num">'+(n.impr?pct(ctr):'—')+'</td>'
    +'<td class="num">'+(n.clicks?pct(conn):'—')+'</td>'
    +'<td class="num"><span class="act '+tag.c+'">'+tag.t+'</span></td>'; }
function treeRow(n,lvl,key,hasKids,med){
  var caret=hasKids?'<span class="caret'+(expanded[key]?' open':'')+'">▶</span>':'<span class="caret" style="opacity:.2">•</span>';
  return '<tr class="lvl'+lvl+(hasKids?' parent':'')+'" data-key="'+encodeURIComponent(key)+'">'
    +'<td><span class="name" title="'+esc(n.full||n.name)+'">'+caret+' '+esc(n.name)+'</span></td>'+metricsCells(n,med)+'</tr>';
}
function sortKids(obj){ return Object.keys(obj).sort(function(x,y){ return (obj[y].leads)-(obj[x].leads) || obj[y].spend-obj[x].spend; }); }
function renderTree(rng){
  var rows=grain.filter(function(r){return inRange(r.date,rng)&&chMatch(r);});
  var camps=buildTree(rows), order=sortKids(camps);
  var leafCpls=[]; order.forEach(function(cK){ if(cK==='SEM_RASTREIO')return; var c=camps[cK]; Object.keys(c.kids).forEach(function(sK){ var sN=c.kids[sK]; Object.keys(sN.kids).forEach(function(aK){ var an=sN.kids[aK]; if(an.spend>0&&an.leads>0) leafCpls.push(dv(an.spend,an.leads)); }); }); });
  var med=median(leafCpls);
  if(!treeInited){ order.forEach(function(cK){ expanded['c:'+cK]=true; }); treeInited=true; }
  var head='<thead><tr><th>Campanha › Conjunto/Grupo › Anúncio</th><th>Gasto</th><th>Leads</th><th>CPL</th><th>CTR</th><th>Connect</th><th>Ação</th></tr></thead>';
  var out=[];
  order.forEach(function(cK){ var c=camps[cK],cKey='c:'+cK,cHas=Object.keys(c.kids).length>0; out.push(treeRow(c,0,cKey,cHas,med));
    if(expanded[cKey]){ sortKids(c.kids).forEach(function(sK){ var sN=c.kids[sK],sKey=cKey+'|s:'+sK,sHas=Object.keys(sN.kids).length>0; out.push(treeRow(sN,1,sKey,sHas,med));
      if(expanded[sKey]){ sortKids(sN.kids).forEach(function(aK){ out.push(treeRow(sN.kids[aK],2,sKey+'|a:'+aK,false,med)); }); } }); } });
  if(!out.length) out.push('<tr><td colspan="7" class="empty">Sem dados no período.</td></tr>');
  el('treeTbl').innerHTML=head+'<tbody>'+out.join('')+'</tbody>';
  el('treeLegend').innerHTML='<span><span class="act act-acel">Acelerar</span> CPL baixo</span>'
    +'<span><span class="act act-mant">Manter</span> CPL na média</span>'
    +'<span><span class="act act-rev">Revisar</span> CPL alto</span>'
    +'<span style="color:var(--muted2)">CPL colorido vs. mediana dos anúncios · ordenado por volume de leads</span>';
  Array.prototype.forEach.call(el('treeTbl').querySelectorAll('tr.parent'),function(tr){
    tr.addEventListener('click',function(){ var k=decodeURIComponent(tr.getAttribute('data-key')); expanded[k]=!expanded[k]; renderTree(rangeFor(period)); }); });
}

/* =================== LEADS · VISÃO GERAL (base completa) =================== */
function donut(frac,color,cv,cl,size){ size=size||150; var sw=14,r=(size-sw)/2,cx=size/2,c=2*Math.PI*r,off=c*(1-clamp(frac));
  return '<div class="gauge" style="width:'+size+'px;height:'+size+'px"><svg width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'">'
    +'<circle cx="'+cx+'" cy="'+cx+'" r="'+r+'" fill="none" stroke="#182240" stroke-width="'+sw+'"/>'
    +'<circle cx="'+cx+'" cy="'+cx+'" r="'+r+'" fill="none" stroke="'+color+'" stroke-width="'+sw+'" stroke-linecap="round" stroke-dasharray="'+c+'" stroke-dashoffset="'+off+'" transform="rotate(-90 '+cx+' '+cx+')"/></svg>'
    +'<div class="gauge-num"><span class="g-val" style="color:'+color+'">'+cv+'</span><span class="g-lab" style="color:'+color+'">'+cl+'</span></div></div>'; }
function barList(list,cls,total){ list=arr(list); var max=Math.max.apply(null,list.map(function(x){return x.n;}).concat([1]));
  if(!list.length) return '<div class="empty">Sem dados.</div>';
  return list.map(function(x){ var p= total? ' <small>'+pct(dv(x.n,total)*100)+'</small>':'';
    return '<div class="qbar"><div class="qbar-top"><span class="l" title="'+esc(x.label)+'">'+esc(x.label)+'</span><span class="n">'+intf(x.n)+p+'</span></div>'
      +'<div class="qbar-track '+(cls||'')+'"><span style="width:'+Math.max(4,x.n/max*100)+'%"></span></div></div>'; }).join('');
}
function mountLeads(){
  var t=totals, total=t.leads||0, paid=t.paid||0, org=t.organic||0, spend=t.spend||0;
  var paidFrac=dv(paid,total);
  var geo=arr(D.geo), topState=geo[0];
  // veredito
  var big = paid>=org ? 'A maioria vem do TRÁFEGO PAGO' : 'A maioria é ORGÂNICA';
  el('verdict').innerHTML=donut(paidFrac,COL.cy,total?pct(paidFrac*100):'—','pago',150)
    +'<div class="v-txt"><div class="v-big">'+intf(total)+' leads captados</div>'
    +'<div class="v-sub">'+big+' · <b class="chip-pago">'+intf(paid)+' pago</b> · <b class="chip-org">'+intf(org)+' orgânico</b>'
    +(topState?' · estado líder <b style="color:var(--ink2)">'+esc(topState.label)+'</b> ('+intf(topState.n)+')':'')+'</div>'
    +'<div class="v-sub">'+intf(t.attributed||0)+' leads atribuídos a um anúncio · alcance em <b style="color:var(--ink2)">'+intf(t.states||0)+' estados</b> e '+intf(t.cities||0)+' cidades</div></div>';
  // stats
  el('leadsStats').innerHTML='<div class="stat-row">'
    +'<div class="stat"><div class="s-v">'+intf(total)+'</div><div class="s-l">Leads captados</div></div>'
    +'<div class="stat pago"><div class="s-v">'+intf(paid)+'</div><div class="s-l">Tráfego pago</div></div>'
    +'<div class="stat org"><div class="s-v">'+intf(org)+'</div><div class="s-l">Orgânico</div></div>'
    +'<div class="stat geo"><div class="s-v">'+intf(t.states||0)+'</div><div class="s-l">Estados alcançados</div></div></div>';
  // pago x organico thermo + tabela
  el('thermoSrc').innerHTML='<div class="thermo">'
    +(paid>0?'<span style="width:'+(dv(paid,total)*100).toFixed(1)+'%;background:'+COL.cy+'" title="Pago: '+paid+'">'+(dv(paid,total)>0.08?intf(paid):'')+'</span>':'')
    +(org>0?'<span style="width:'+(dv(org,total)*100).toFixed(1)+'%;background:'+COL.vi+'" title="Orgânico: '+org+'">'+(dv(org,total)>0.08?intf(org):'')+'</span>':'')
    +'</div><div class="thermo-leg"><span><span class="dot" style="background:'+COL.cy+'"></span>Pago · '+intf(paid)+'</span><span><span class="dot" style="background:'+COL.vi+'"></span>Orgânico · '+intf(org)+'</span></div>';
  var head='<thead><tr><th>Fonte</th><th>Leads</th><th>% do total</th><th>CPL</th></tr></thead>';
  var body='<tr><td><span class="chip-pago">Tráfego pago (Meta)</span></td><td class="num">'+intf(paid)+'</td><td class="num">'+(total?pct(dv(paid,total)*100):'—')+'</td><td class="num">'+(paid?money0(dv(spend,paid)):'—')+'</td></tr>'
    +'<tr><td><span class="chip-org">Orgânico / sem rastreio</span></td><td class="num">'+intf(org)+'</td><td class="num">'+(total?pct(dv(org,total)*100):'—')+'</td><td class="num">—</td></tr>'
    +'<tr style="font-weight:800"><td>Total</td><td class="num">'+intf(total)+'</td><td class="num">100%</td><td class="num">'+(total?money0(dv(spend,total)):'—')+'</td></tr>';
  el('sourceTbl').innerHTML=head+'<tbody>'+body+'</tbody>';
  // canais
  el('channelBars').innerHTML=barList(arr(D.channels),'vi',total);
  // geo
  el('geoBars').innerHTML=barList(geo.slice(0,14),'gr',total);
  // ranking de anuncios
  renderAdRank();
}
function renderAdRank(){
  var rows=grain.filter(function(r){return r.ad!=='SEM_RASTREIO';}), ads={};
  rows.forEach(function(r){ var k=r.ad+'##'+r.campaign; var n=ads[k]||(ads[k]={ad:prettyName(r.ad),camp:r.campaign,spend:0,leads:0,clicks:0,lpv:0}); n.spend+=r.spend||0;n.leads+=r.leads||0;n.clicks+=r.clicks||0;n.lpv+=r.lpv||0; });
  var list=Object.keys(ads).map(function(k){return ads[k];}).filter(function(n){return n.leads>0||n.spend>0;}).sort(function(x,y){return y.leads-x.leads||y.spend-x.spend;});
  var head='<thead><tr><th>Anúncio</th><th>Gasto</th><th>Leads</th><th>CPL</th><th>Connect</th></tr></thead>';
  var body=list.map(function(n){ var cpl=n.leads>0?dv(n.spend,n.leads):null, conn=dv(n.lpv,n.clicks)*100;
    return '<tr><td><span class="name" title="'+esc(n.ad)+'">'+esc(n.ad)+'</span></td>'
      +'<td class="num">'+money0(n.spend)+'</td><td class="num">'+intf(n.leads)+'</td>'
      +'<td class="num">'+(cpl!=null?money0(cpl):'—')+'</td>'
      +'<td class="num">'+(n.clicks?pct(conn):'—')+'</td></tr>'; }).join('');
  if(!list.length) body='<tr><td colspan="5" class="empty">Nenhum anúncio rastreado.</td></tr>';
  el('adRankTbl').innerHTML=head+'<tbody>'+body+'</tbody>';
}

/* =================== PESQUISA & GRUPOS =================== */
function renderRateChart(elId, rows, getBar, getRate, barColor, barName){
  var W=600,H=210,pl=32,pr=46,pt=12,pb=22,pw=W-pl-pr,ph=H-pt-pb,base=pt+ph;
  var maxB=Math.max.apply(null,rows.map(getBar).concat([1]));
  var maxR=Math.max.apply(null,rows.map(getRate).concat([0.01]));
  var n=rows.length||1,gw=pw/n,bw=Math.max(4,Math.min(26,gw*0.5));
  var s='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMid meet">';
  [0,0.5,1].forEach(function(f){ var y=pt+ph*(1-f); s+='<line x1="'+pl+'" y1="'+y+'" x2="'+(W-pr)+'" y2="'+y+'" stroke="#182034" stroke-dasharray="2 3"/>';
    s+='<text x="'+(pl-4)+'" y="'+(y+3)+'" text-anchor="end" fill="#586a8c" font-size="9">'+Math.round(maxB*f)+'</text>';
    s+='<text x="'+(W-pr+4)+'" y="'+(y+3)+'" text-anchor="start" fill="#c98a2a" font-size="9">'+Math.round(maxR*100*f)+'%</text>'; });
  rows.forEach(function(r,i){ var xc=pl+gw*i+gw/2, bh=ph*dv(getBar(r),maxB);
    if(getBar(r)>0) s+='<rect x="'+(xc-bw/2).toFixed(1)+'" y="'+(base-bh).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+bh.toFixed(1)+'" rx="1.5" fill="'+barColor+'" fill-opacity="0.55"/>'; });
  var pts=[]; rows.forEach(function(r,i){ var xc=pl+gw*i+gw/2, y=base-ph*dv(getRate(r),maxR); pts.push([xc,y]); });
  if(pts.length>1){ var dpath='M'+pts.map(function(pp){return pp[0].toFixed(1)+' '+pp[1].toFixed(1);}).join(' L'); s+='<path d="'+dpath+'" fill="none" stroke="'+COL.warn+'" stroke-width="2"/>'; }
  pts.forEach(function(pp){ s+='<circle cx="'+pp[0].toFixed(1)+'" cy="'+pp[1].toFixed(1)+'" r="2.6" fill="'+COL.warn+'"/>'; });
  xticks(rows).forEach(function(i){ var xc=pl+gw*i+gw/2; s+='<text x="'+xc.toFixed(1)+'" y="'+(H-6)+'" text-anchor="middle" fill="#586a8c" font-size="9">'+fmtBR(rows[i].date)+'</text>'; });
  s+=hitRects(rows,pl,gw,pt,ph)+'</svg>';
  el(elId).innerHTML='<div class="chart">'+s+'</div><div class="chart-legend"><span><span class="dot" style="background:'+barColor+';opacity:.6"></span>'+barName+'/dia</span><span><span class="ln" style="background:'+COL.warn+'"></span>Taxa (÷ leads)</span></div>';
  bindHits(elId, rows, function(r){
    return '<div class="tt-d">'+fmtBR(r.date)+'</div>'
      +'<div class="tt-r"><span style="color:'+barColor+'">'+barName+'</span><b>'+intf(getBar(r))+'</b></div>'
      +'<div class="tt-r"><span style="color:'+COL.warn+'">Taxa</span><b>'+pct(dv(getBar(r),r.leads)*100)+'</b></div>'
      +'<div class="tt-sub">Leads no dia '+intf(r.leads)+'</div>';
  });
}
function renderEngTable(rows){
  var head='<thead><tr><th>Dia</th><th>Leads</th><th>Respostas</th><th>Taxa resp.</th><th>Entraram</th><th>Saíram</th><th>Líquido grupos</th><th>Taxa grupos</th></tr></thead>';
  var body=rows.slice().sort(function(a,b){return b.date.localeCompare(a.date);}).map(function(r){ var net=r.groupIn-r.groupOut;
    return '<tr><td>'+fmtBR(r.date)+'</td>'
      +'<td class="num">'+intf(r.leads)+'</td>'
      +'<td class="num chip-pago">'+(r.survey||'·')+'</td>'
      +'<td class="num">'+(r.leads?pct(dv(r.survey,r.leads)*100):'—')+'</td>'
      +'<td class="num" style="color:var(--good)">'+intf(r.groupIn)+'</td>'
      +'<td class="num" style="color:var(--bad)">'+(r.groupOut||'·')+'</td>'
      +'<td class="num">'+intf(net)+'</td>'
      +'<td class="num">'+(r.leads?pct(dv(r.groupIn,r.leads)*100):'—')+'</td></tr>'; }).join('');
  if(!rows.length) body='<tr><td colspan="8" class="empty">Sem dados.</td></tr>';
  el('engTbl').innerHTML=head+'<tbody>'+body+'</tbody>';
}
function mountEngage(){
  var E=D.engage||{}, sv=E.survey||{}, gp=E.groups||{}, rows=arr(E.byDay), leads=E.leads||0;
  var svRate=dv(sv.completed,leads), gpRate=dv(gp.entered,leads);
  el('engStats').innerHTML='<div class="stat-row" style="grid-template-columns:repeat(3,1fr)">'
    +'<div class="stat"><div class="s-v">'+intf(leads)+'</div><div class="s-l">Leads captados</div></div>'
    +'<div class="stat resp"><div class="s-v">'+intf(sv.completed)+'</div><div class="s-l">Respostas de pesquisa</div></div>'
    +'<div class="stat grp"><div class="s-v">'+intf(gp.net)+'</div><div class="s-l">Pessoas nos grupos</div></div></div>';
  var sh=el('surveyHero'); sh.className='rate-hero cy';
  sh.innerHTML='<span class="rh-val">'+pct(svRate*100)+'</span>'
    +'<span class="rh-det"><b>'+intf(sv.completed)+'</b> respostas completas de <b>'+intf(leads)+'</b> leads'+(sv.incomplete?' · '+intf(sv.incomplete)+' incompletas':'')
    +'<br>'+intf(sv.respondedLeads)+' leads distintos responderam <b>('+pct(dv(sv.respondedLeads,sv.distinctLeads)*100)+' dos leads)</b></span>';
  renderRateChart('chartSurvey', rows, function(r){return r.survey;}, function(r){return dv(r.survey,r.leads);}, COL.cy, 'Respostas');
  var gh=el('groupHero'); gh.className='rate-hero gr';
  gh.innerHTML='<span class="rh-val">'+pct(gpRate*100)+'</span>'
    +'<span class="rh-det"><b>'+intf(gp.entered)+'</b> entradas de <b>'+intf(leads)+'</b> leads'
    +'<br>'+intf(gp.entered)+' entraram · '+intf(gp.left)+' saíram · <b>'+intf(gp.net)+'</b> ativos no grupo</span>';
  renderRateChart('chartGroup', rows, function(r){return r.groupIn;}, function(r){return dv(r.groupIn,r.leads);}, COL.good, 'Entradas');
  renderEngTable(rows);
}

/* =================== CHROME =================== */
function periodsHTML(){
  return PRESETS.map(function(p){return '<button data-k="'+p.k+'" class="pbtn">'+p.label+'</button>';}).join('')
    + '<span class="daterange" id="daterange"><span class="dr-l">De</span> <input type="date" id="dtDe" min="'+minDate+'" max="'+maxDate+'"> <span class="dr-l">até</span> <input type="date" id="dtAte" min="'+minDate+'" max="'+maxDate+'"></span>';
}
function syncPeriodUI(){
  var rng=rangeFor(period);
  Array.prototype.forEach.call(el('periods').querySelectorAll('.pbtn'),function(b){ b.classList.toggle('on', period===b.getAttribute('data-k')); });
  var drEl=el('daterange'); if(drEl) drEl.classList.toggle('on', period==='custom');
  var de=el('dtDe'), ate=el('dtAte'); if(de&&ate){ de.value=rng[0]; ate.value=rng[1]; }
}
function initPeriods(){
  el('periods').innerHTML=periodsHTML();
  Array.prototype.forEach.call(el('periods').querySelectorAll('.pbtn'),function(b){
    b.addEventListener('click',function(){ period=b.getAttribute('data-k'); customRange=null; syncPeriodUI(); renderAll(); });
  });
  var de=el('dtDe'), ate=el('dtAte');
  function onDate(){
    var s=de.value, e=ate.value; if(!s||!e) return;
    if(s>e){ var t=s; s=e; e=t; }
    if(s<minDate) s=minDate; if(e>maxDate) e=maxDate;
    customRange=[s,e]; period='custom'; syncPeriodUI(); renderAll();
  }
  de.addEventListener('change',onDate); ate.addEventListener('change',onDate);
  syncPeriodUI();
}
var CHANNELS=[{k:'geral',label:'Geral',dot:''},{k:'meta',label:'Meta Ads',dot:COL.cy},{k:'google',label:'Google Ads',dot:COL.vi}];
function syncChannelUI(){ Array.prototype.forEach.call(el('chbar').querySelectorAll('.chbtn'),function(b){ b.classList.toggle('on', channel===b.getAttribute('data-ch')); }); }
function initChannels(){
  var qp=(location.search.match(/[?&]channel=(geral|meta|google)/)||[])[1]; if(qp) channel=qp;
  el('chbar').innerHTML='<span class="chlab">Canal</span>'+CHANNELS.map(function(c){
    return '<button data-ch="'+c.k+'" class="chbtn '+c.k+'">'+(c.dot?'<span class="cdot" style="background:'+c.dot+'"></span>':'')+c.label+'</button>'; }).join('');
  Array.prototype.forEach.call(el('chbar').querySelectorAll('.chbtn'),function(b){
    b.addEventListener('click',function(){ channel=b.getAttribute('data-ch'); treeInited=false; syncChannelUI(); renderAll(); }); });
  syncChannelUI();
}
function renderAll(){ var rng=rangeFor(period), a=aggDaily(rng), p=aggDaily(prevRange(rng)), days=daysInRange(rng);
  renderKpiCol(a,p); renderChartLeads(days); renderChartInvest(days); renderDaily(rng); renderTree(rng); }
var TABS=['funil','leads','engaje'];
function activateTab(id){ Array.prototype.forEach.call(document.querySelectorAll('.tab'),function(x){x.classList.toggle('active',x.getAttribute('data-tab')===id);});
  TABS.forEach(function(k){ el('tab-'+k).classList.toggle('hidden',k!==id); }); }
function initTabs(){ Array.prototype.forEach.call(document.querySelectorAll('.tab'),function(t){ t.addEventListener('click',function(){ var id=t.getAttribute('data-tab'); activateTab(id); if(history.replaceState)history.replaceState(null,'','#'+id); }); });
  var h=(location.hash||'').replace('#',''); if(TABS.indexOf(h)>=0)activateTab(h);
  window.addEventListener('hashchange',function(){ var k=(location.hash||'').replace('#',''); if(TABS.indexOf(k)>=0)activateTab(k); }); }
function initCoverage(){ el('updated').textContent=D.generatedAtBR||'—'; el('taxf').textContent=(D.taxMultiplier||1.1385).toFixed(4).replace('.',',');
  var msg='';
  if((D.leadDateMin||'')!==(minDate||'') || (D.leadDateMax||'')!==(maxDate||'')){
    msg='Leads registrados: <b>'+fmtBR(D.leadDateMin||'')+' → '+fmtBR(D.leadDateMax||'')+'</b> · Tráfego/gasto: <b>'+fmtBR(minDate)+' → '+fmtBR(maxDate)+'</b>. Em dias sem lead o CPL fica "—".';
  } else {
    var bc=arr(D.byChannel), m=null,g=null; bc.forEach(function(x){ if(x.ch==='meta')m=x; if(x.ch==='google')g=x; });
    var chTxt = (m&&g) ? ' · <b class="chip-pago">Meta '+money0(m.spend)+'</b> + <b class="chip-org">Google '+money0(g.spend)+'</b> (Google s/ imposto)' : '';
    msg='Funil <b>SIP-S1</b> · <b>'+fmtBR(minDate)+' → '+fmtBR(maxDate)+'</b> · <b>'+intf(totals.leads||0)+'</b> leads ('+intf(totals.paid||0)+' pago · '+intf(totals.organic||0)+' org)'+chTxt+'.';
  }
  el('coverage').innerHTML=msg; }

if(!daily.length && !grain.length){ el('coverage').innerHTML='<b>Sem dados.</b> Rode o build.ps1 para gerar o data.js.'; }
else { initCoverage(); initPeriods(); initChannels(); initTabs(); renderAll(); mountLeads(); mountEngage(); }
})();
