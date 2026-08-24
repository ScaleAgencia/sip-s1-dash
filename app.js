/* SIP dashboard — render puro (sem libs, SVG na mão) sobre window.SIP (2 funis) */
(function(){
'use strict';
var arr = function(x){ return Array.isArray(x) ? x : (x ? [x] : []); };
var isDate = function(x){ return /^\d{4}-\d{2}-\d{2}$/.test(x); };
/* ---- fonte: window.SIP {funnels:[{key,label}], data:{key:payload}} ---- */
var FUN = window.SIP || null;
if(!FUN && window.SIPS1){ FUN={generatedAtBR:window.SIPS1.generatedAtBR,defaultFunnel:'s1',funnels:[{key:'s1',label:'SIP-S1'}],data:{s1:window.SIPS1}}; } /* compat */
FUN = FUN || {data:{},funnels:[]};
var funnels = arr(FUN.funnels);
var funKey = FUN.defaultFunnel || (funnels[0]&&funnels[0].key) || 's1';
var D = (FUN.data&&FUN.data[funKey]) || {};
function funLabel(k){ for(var i=0;i<funnels.length;i++){ if(funnels[i].key===k) return funnels[i].label; } return String(k||'').toUpperCase(); }
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

var COL={cy:'#22d3ee',cy2:'#67e8f9',vi:'#8b7cf0',vi2:'#a99bf7',good:'#34d399',warn:'#f5b041',bad:'#f2637e',gold:'#f0b64d',gold2:'#ffd27a'};
/* leadscoring A/B/C (docs L17-L20): A=perseguir, B=miolo, C=cortar */
var ABC={A:'#34d399',B:'#f5b041',C:'#f2637e'};
/* aba Perfil do Lead: legenda das respostas (pos = índice na linha resp [date,cls,idade,mom,renda,dispon,invest,curso])
   buyer = distribuição % das respostas entre COMPRADORES Prosperus (L17–L20, 595 compradores cruzados) */
var PROFQ=[
  {pos:2, q:'Idade', opts:['18 a 24','25 a 30','31 a 39','40 a 49','50 anos ou +'], buyer:[2,6.2,14.2,34.3,43.2]},
  {pos:3, q:'Momento profissional', opts:['CLT','Autônomo / MEI','Servidor público','Não trabalhando','Estudante','Aposentado / Pensionista','Outro'], buyer:[28,26.2,21.1,10.3,1,7.1,6.2]},
  {pos:4, q:'Renda mensal', opts:['Não possui','Menos de R$1k','R$1–2k','R$2–5k','R$5–10k','Mais de R$10k'], buyer:[2.5,4.1,18.3,41,23.2,10.8]},
  {pos:5, q:'Disponível p/ investir', opts:['Até R$100','R$100–500','R$500–1k','R$1–5k','Mais de R$5k'], buyer:[14.9,39,26.8,13.8,5.4]},
  {pos:6, q:'Patrimônio já investido', opts:['Ainda não','Até R$10k','R$10–50k','R$50–100k','R$100–500k','R$500k–1M','Mais de R$1M'], buyer:[54.5,24.2,10.8,5.2,3,1.4,0.8]},
  {pos:7, q:'Já comprou curso', opts:['Não','Sim','Sim, sou aluno'], buyer:[67.6,26.1,6.3]}
];
var PROSPERUS_ABC={A:53.1,B:43.7,C:3.2};  // A/B/C dos compradores

var daily = arr(D.daily), grain = arr(D.grain), totals = D.totals||{};
var allDates = daily.map(function(d){return d.date;}).filter(isDate).sort();
var maxDate = D.dateMax || allDates[allDates.length-1] || '';
var minDate = D.dateMin || allDates[0] || '';
function setFunnelVars(){
  D = (FUN.data&&FUN.data[funKey]) || {};
  daily = arr(D.daily); grain = arr(D.grain); totals = D.totals||{};
  allDates = daily.map(function(d){return d.date;}).filter(isDate).sort();
  maxDate = D.dateMax || allDates[allDates.length-1] || '';
  minDate = D.dateMin || allDates[0] || '';
}
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
var fase='all';        // filtro global de FASE (turma): 'all' ou a tag (SIP-S1/SIP-S2/...)
function faseMatch(d){ return fase==='all' || d.fase===fase; }
function faseLabel(k){ return String(k).replace(/^SIP-/i,''); }
function faseSpend(){ var s=0; daily.forEach(function(d){ if(faseMatch(d)) s+=d.spend||0; }); return s; }
/* agregado de leads da fase selecionada (aba Leads/coverage) */
function leadAgg(){
  if(fase==='all') return {leads:totals.leads||0,paid:totals.paid||0,organic:totals.organic||0,attributed:totals.attributed||0,states:totals.states||0,channels:arr(D.channels),geo:arr(D.geo),cities:arr(D.cities)};
  var fa=(D.faseAgg&&D.faseAgg[fase])||{};
  return {leads:fa.leads||0,paid:fa.paid||0,organic:fa.organic||0,attributed:fa.attributed||0,states:fa.states||0,channels:arr(fa.channels),geo:arr(fa.geo),cities:arr(fa.cities)};
}
var CHMETS=['spend','impr','reach','clicks','lpv','platLeads','leads','la','lb','lc','mLeads','gLeads'];
function daysInRange(rng){
  var map={};
  daily.forEach(function(d){ if(!isDate(d.date)||!inRange(d.date,rng)||!chMatch(d)||!faseMatch(d)) return;
    var o=map[d.date]; if(!o){ o={date:d.date}; CHMETS.forEach(function(k){o[k]=0;}); map[d.date]=o; }
    o.spend+=d.spend||0;o.impr+=d.impr||0;o.reach+=d.reach||0;o.clicks+=d.clicks||0;o.lpv+=d.lpv||0;o.platLeads+=d.platLeads||0;o.leads+=d.leads||0;
    o.la+=d.la||0;o.lb+=d.lb||0;o.lc+=d.lc||0;
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
/* ---------- métricas úteis (impressão/alcance ficam ocultos; só ratios) ---------- */
function ctrOf(n){ return dv(n.clicks,n.impr)*100; }              // CTR = clique/impressão
function cpmOf(n){ return dv(n.spend,n.impr)*1000; }              // CPM = custo/mil impressões
function convPag(n){ return dv(n.leads,n.clicks)*100; }           // conversão de página = clique→lead
function convQual(n){ return dv(n.la,n.clicks)*100; }             // conv. de página dos qualificados = clique→Lead A

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
  // Mídia — só CTR + CPM (impressões/alcance ocultos, a pedido)
  cards+=kpiCard(false,'CTR <small>(clique / impressão)</small>', pct(ctrOf(a)),
    subRow('CPM <small>(custo / mil impressões)</small>', money(cpmOf(a)), trendHTML(cpmOf(a), cpmOf(p), false)));
  // Leads (formulário)
  var originSub = channel==='geral'
    ? subRow('Por canal', '<small><b class="chip-pago">'+intf(a.mLeads)+' Meta</b> · <b class="chip-org">'+intf(a.gLeads)+' Google</b></small>','')
    : '';
  cards+=kpiCard(true,'Leads (formulário)',intf(a.leads),
    subRow('CPL', money(cpl), trendHTML(cpl, dv(p.spend,p.leads), false))
    + subRow('Conversão de página <small>(clique→lead)</small>', pct(convPag(a)), trendHTML(convPag(a), convPag(p), true))
    + originSub);
  // ---- Lead A / B / C (perfil comprador · docs L17-L20) ----
  var cpa=dv(a.spend,a.la), cpaP=dv(p.spend,p.la), qr=a.la+a.lb+a.lc;
  cards+='<div class="kpi-card acard"><div class="kpi-main"><div class="m-lab">Lead A <span class="qtag">o alvo · perseguir</span></div><div class="m-val">'+intf(a.la)+'</div></div>'
    +'<div class="kpi-sub">'
    + subRow('<b>Custo por Lead A</b>', a.la?money(cpa):'—', trendHTML(cpa, cpaP, false))
    + subRow('Conv. de página qualif. <small>(clique→Lead A)</small>', pct(convQual(a)), trendHTML(convQual(a), convQual(p), true))
    + subRow('Mix A·B·C <small>(quem respondeu)</small>', '<b class="cA">'+intf(a.la)+'</b> · <b class="cB">'+intf(a.lb)+'</b> · <b class="cC">'+intf(a.lc)+'</b> <small>'+(qr?pct(dv(a.la,qr)*100)+' A':'')+'</small>','')
    + '</div></div>';
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
  var head='<thead><tr><th>Dia</th><th>Gasto</th><th>Leads</th><th>CPL</th><th>CPM</th><th>CTR</th><th>Conv. pág.</th></tr></thead>';
  var body=rows.map(function(r){
    var cpl=r.leads>0?dv(r.spend,r.leads):null, cpm=dv(r.spend,r.impr)*1000, ctr=dv(r.clicks,r.impr)*100, cvp=dv(r.leads,r.clicks)*100;
    return '<tr><td>'+fmtBR(r.date)+'</td>'
      +'<td class="num"><span class="heatcell" style="'+heatBg('34,211,238',r.spend/maxS)+'">'+money0(r.spend)+'</span></td>'
      +'<td class="num"><span class="heatcell" style="'+heatBg('103,232,249',r.leads/maxL)+'">'+intf(r.leads)+'</span></td>'
      +'<td class="num">'+(cpl!=null?'<span class="cpl-pill '+relClass(cpl,medCpl)+'">'+money0(cpl)+'</span>':'—')+'</td>'
      +'<td class="num"><span class="cpl-pill '+relClass(cpm,medCpm)+'">'+money(cpm)+'</span></td>'
      +'<td class="num">'+pct(ctr)+'</td>'
      +'<td class="num">'+(r.clicks>0?pct(cvp):'—')+'</td></tr>';
  }).join('');
  if(!rows.length) body='<tr><td colspan="7" class="empty">Sem dados no período.</td></tr>';
  el('dailyTbl').innerHTML=head+'<tbody>'+body+'</tbody>';
}

/* =================== OTIMIZAÇÃO (árvore inline) =================== */
function prettyName(x){ return x==='SEM_RASTREIO' ? '— sem rastreio (orgânico) —' : x; }
function newNode(name,full){ return {name:name,full:full,spend:0,impr:0,reach:0,clicks:0,lpv:0,leads:0,la:0,lb:0,lc:0,kids:{}}; }
function accum(n,r){ n.spend+=r.spend||0;n.impr+=r.impr||0;n.reach+=r.reach||0;n.clicks+=r.clicks||0;n.lpv+=r.lpv||0;n.leads+=r.leads||0;n.la+=r.la||0;n.lb+=r.lb||0;n.lc+=r.lc||0; }
var expanded={}, treeInited=false;
/* ordenação da árvore de otimização (clique no cabeçalho) · dir -1=maior→menor, 1=menor→maior */
var treeSort={key:'leads',dir:-1};
var TREECOLS=[{k:'name',lab:'Campanha › Conjunto/Grupo › Anúncio',cls:''},
  {k:'spend',lab:'Gasto',cls:'num'},{k:'leads',lab:'Leads',cls:'num'},
  {k:'ctr',lab:'CTR',cls:'num'},{k:'cpm',lab:'CPM',cls:'num'},{k:'convp',lab:'Conv. pág.',cls:'num'},
  {k:'la',lab:'Lead A · B · C',cls:'num'},{k:'cpla',lab:'Custo Lead A',cls:'num'},{k:'convq',lab:'Conv. qualif.',cls:'num'},
  {k:null,lab:'Ação',cls:'num'}];
function treeMetric(n,key){ switch(key){
  case 'spend': return n.spend||0; case 'leads': return n.leads||0;
  case 'la': return n.la||0; case 'lb': return n.lb||0; case 'lc': return n.lc||0;
  case 'ctr':   return n.impr>0   ? n.clicks/n.impr     : -1;
  case 'cpm':   return n.impr>0   ? n.spend/n.impr*1000 : Infinity;  // sem impr = "infinitamente caro"
  case 'convp': return n.clicks>0 ? n.leads/n.clicks    : -1;
  case 'convq': return n.clicks>0 ? n.la/n.clicks       : -1;
  case 'cpla':  return n.la>0 ? n.spend/n.la : Infinity;   // sem Lead A = "infinitamente caro"
  default: return 0; } }
function treeDefaultDir(key){ return (key==='cpm'||key==='cpla'||key==='name') ? 1 : -1; } // custos e nome sobem (melhor primeiro), o resto desce
function sortLabel(){ var c=null; for(var i=0;i<TREECOLS.length;i++){ if(TREECOLS[i].k===treeSort.key) c=TREECOLS[i]; }
  if(!c) return 'ordenado por leads';
  var better = treeSort.dir===treeDefaultDir(treeSort.key);
  return 'ordenado por '+(c.k==='name'?'nome':c.lab)+' · '+(treeSort.dir===-1?'maior→menor':'menor→maior')+(better?' (melhor→pior)':' (pior→melhor)'); }
function buildTree(rows){ var c={}; rows.forEach(function(r){
  var cn=c[r.campaign]||(c[r.campaign]=newNode(prettyName(r.campaign),r.campaign)); accum(cn,r);
  var sn=cn.kids[r.adset]||(cn.kids[r.adset]=newNode(prettyName(r.adset),r.adset)); accum(sn,r);
  var an=sn.kids[r.ad]||(sn.kids[r.ad]=newNode(prettyName(r.ad),r.ad)); accum(an,r); }); return c; }
// Ação: perseguir Lead A barato (Acelerar) · cortar quem traz Lead C em massa (Pausar)
function actTag(n,medA){
  var q=(n.la||0)+(n.lb||0)+(n.lc||0);
  if(q<5) return {t:'Dado insuf.',c:'act-ins'};
  var shareC=dv(n.lc,q), shareA=dv(n.la,q), cpla=n.la>0?dv(n.spend,n.la):Infinity;
  if(shareC>=0.40 || (n.la===0 && n.spend>0) || (shareA<0.12 && q>=15)) return {t:'Pausar',c:'act-rev'};  // Lead C em massa / pouco ou nenhum Lead A
  if(medA>0 && n.la>=3 && cpla<=medA*0.85 && shareC<0.30) return {t:'Acelerar',c:'act-acel'};   // Lead A barato → perseguir
  if(medA>0 && isFinite(cpla) && cpla>=medA*1.6) return {t:'Pausar',c:'act-rev'};               // Lead A caro demais
  return {t:'Manter',c:'act-mant'};
}
function abcCell(v,cls){ return '<td class="num">'+(v?'<b class="c'+cls+'">'+intf(v)+'</b>':'<span class="muted3">0</span>')+'</td>'; }
function abcMixCell(n){ return '<td class="num abc-mix"><b class="cA">'+intf(n.la)+'</b><small class="muted3"> · '+intf(n.lb)+' · '+intf(n.lc)+'</small></td>'; }
function metricsCells(n,medA){
  var cpla=n.la>0?dv(n.spend,n.la):null, tag=actTag(n,medA);
  var cA  = cpla!=null?'<span class="cpl-pill '+relClass(cpla,medA)+'">'+money0(cpla)+'</span>':'—';
  var ctr = n.impr>0?   pct(dv(n.clicks,n.impr)*100)   : '—';
  var cpm = n.impr>0?   money0(dv(n.spend,n.impr)*1000): '—';
  var cvp = n.clicks>0? pct(dv(n.leads,n.clicks)*100)  : '—';
  var cvq = n.clicks>0? pct(dv(n.la,n.clicks)*100)     : '—';
  return '<td class="num">'+money0(n.spend)+'</td>'
    +'<td class="num">'+intf(n.leads)+'</td>'
    +'<td class="num">'+ctr+'</td>'
    +'<td class="num">'+cpm+'</td>'
    +'<td class="num">'+cvp+'</td>'
    +abcMixCell(n)
    +'<td class="num">'+cA+'</td>'
    +'<td class="num">'+cvq+'</td>'
    +'<td class="num"><span class="act '+tag.c+'">'+tag.t+'</span></td>'; }
function treeRow(n,lvl,key,hasKids,medA,medB,medC){
  var caret=hasKids?'<span class="caret'+(expanded[key]?' open':'')+'">▶</span>':'<span class="caret" style="opacity:.2">•</span>';
  return '<tr class="lvl'+lvl+(hasKids?' parent':'')+'" data-key="'+encodeURIComponent(key)+'">'
    +'<td><span class="name" title="'+esc(n.full||n.name)+'">'+caret+' '+esc(n.name)+'</span></td>'+metricsCells(n,medA,medB,medC)+'</tr>';
}
function cmpNodes(a,b){
  if(treeSort.key==='name'){ return treeSort.dir * String(a.name).localeCompare(String(b.name),'pt',{numeric:true}); }
  var va=treeMetric(a,treeSort.key), vb=treeMetric(b,treeSort.key);
  if(va===vb || (!isFinite(va)&&!isFinite(vb))) return (b.leads-a.leads) || (b.spend-a.spend); // desempate estável
  if(!isFinite(va)) return 1; if(!isFinite(vb)) return -1;   // "—" (sem lead) sempre no fim
  return treeSort.dir*(va-vb);
}
function sortKids(obj){ return Object.keys(obj).sort(function(x,y){ return cmpNodes(obj[x],obj[y]); }); }
function renderTree(rng){
  var rows=grain.filter(function(r){return inRange(r.date,rng)&&chMatch(r)&&faseMatch(r);});
  var camps=buildTree(rows), order=sortKids(camps);
  var lA=[],lB=[],lC=[]; order.forEach(function(cK){ if(cK==='SEM_RASTREIO')return; var c=camps[cK]; Object.keys(c.kids).forEach(function(sK){ var sN=c.kids[sK]; Object.keys(sN.kids).forEach(function(aK){ var an=sN.kids[aK]; if(an.spend>0&&an.la>0) lA.push(dv(an.spend,an.la)); if(an.spend>0&&an.lb>0) lB.push(dv(an.spend,an.lb)); if(an.spend>0&&an.lc>0) lC.push(dv(an.spend,an.lc)); }); }); });
  var medA=median(lA), medB=median(lB), medC=median(lC);
  if(!treeInited){ order.forEach(function(cK){ expanded['c:'+cK]=true; }); treeInited=true; }
  var head='<thead><tr>'+TREECOLS.map(function(c){
    if(!c.k) return '<th class="'+c.cls+'">'+c.lab+'</th>';
    var act=treeSort.key===c.k, car=act?('<span class="sort-caret">'+(treeSort.dir===-1?'▼':'▲')+'</span>'):'<span class="sort-caret dim">▾</span>';
    return '<th class="'+c.cls+' sortable'+(act?' act':'')+'" data-sort="'+c.k+'" title="Clique p/ ordenar">'+c.lab+car+'</th>';
  }).join('')+'</tr></thead>';
  var out=[];
  order.forEach(function(cK){ var c=camps[cK],cKey='c:'+cK,cHas=Object.keys(c.kids).length>0; out.push(treeRow(c,0,cKey,cHas,medA,medB,medC));
    if(expanded[cKey]){ sortKids(c.kids).forEach(function(sK){ var sN=c.kids[sK],sKey=cKey+'|s:'+sK,sHas=Object.keys(sN.kids).length>0; out.push(treeRow(sN,1,sKey,sHas,medA,medB,medC));
      if(expanded[sKey]){ sortKids(sN.kids).forEach(function(aK){ out.push(treeRow(sN.kids[aK],2,sKey+'|a:'+aK,false,medA,medB,medC)); }); } }); } });
  if(!out.length) out.push('<tr><td colspan="'+TREECOLS.length+'" class="empty">Sem dados no período.</td></tr>');
  el('treeTbl').innerHTML=head+'<tbody>'+out.join('')+'</tbody>';
  el('treeLegend').innerHTML='<span><b class="cA">A</b> perseguir · <b class="cB">B</b> miolo · <b class="cC">C</b> cortar</span>'
    +'<span><span class="act act-acel">Acelerar</span> Lead A barato</span>'
    +'<span><span class="act act-rev">Pausar</span> Lead C em massa / A caro</span>'
    +'<span style="color:var(--muted2)"><b>Custo Lead A</b> colorido vs. mediana (verde = A barato = perseguir) · '+sortLabel()+' · clique nos títulos p/ ordenar</span>';
  Array.prototype.forEach.call(el('treeTbl').querySelectorAll('tr.parent'),function(tr){
    tr.addEventListener('click',function(){ var k=decodeURIComponent(tr.getAttribute('data-key')); expanded[k]=!expanded[k]; renderTree(rangeFor(period)); }); });
  Array.prototype.forEach.call(el('treeTbl').querySelectorAll('th.sortable'),function(th){
    th.addEventListener('click',function(){ var k=th.getAttribute('data-sort');
      if(treeSort.key===k){ treeSort.dir=-treeSort.dir; } else { treeSort.key=k; treeSort.dir=treeDefaultDir(k); }
      renderTree(rangeFor(period)); }); });
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
/* fontes de leads: cor + tipo por rótulo (label vem do Channel() no build) */
var SRCMETA={
  'Facebook Ads':{kind:'ads',dot:'#22d3ee'}, 'Google Ads':{kind:'ads',dot:'#8b7cf0'},
  'TikTok':{kind:'org',dot:'#00d1c9'}, 'Instagram':{kind:'org',dot:'#e46aa7'}, 'YouTube':{kind:'org',dot:'#ff5a5a'},
  'ManyChat':{kind:'msg',dot:'#5b8def'}, 'WhatsApp':{kind:'msg',dot:'#25d366'}
};
var KINDLAB={ads:'Pago',org:'Orgânico',msg:'Mensageria',out:'Outros'};
function srcMeta(l){ return SRCMETA[l] || {kind:'out',dot:'#8093b3'}; }
function renderSources(list,total){
  list=arr(list).slice().sort(function(a,b){return b.n-a.n;});
  if(!list.length){ el('sourcesBox').innerHTML='<div class="empty">Sem dados.</div>'; el('srcMix').innerHTML=''; return; }
  var max=Math.max.apply(null,list.map(function(x){return x.n;}).concat([1]));
  var mix={ads:0,org:0,msg:0,out:0}; list.forEach(function(x){ mix[srcMeta(x.label).kind]+=x.n; });
  el('srcMix').innerHTML=[['ads','Pago (ads)'],['org','Orgânico'],['msg','Mensageria'],['out','Outros']].filter(function(k){return mix[k[0]]>0;}).map(function(k){
    return '<div class="mixpill '+k[0]+'"><span class="mx-v">'+intf(mix[k[0]])+'</span><span class="mx-l">'+k[1]+' · '+pct(dv(mix[k[0]],total)*100)+'</span></div>'; }).join('');
  el('sourcesBox').innerHTML=list.map(function(x){ var m=srcMeta(x.label);
    return '<div class="srcrow"><div class="src-l"><span class="dot" style="background:'+m.dot+'"></span><b>'+esc(x.label)+'</b><span class="src-kind '+m.kind+'">'+KINDLAB[m.kind]+'</span></div>'
      +'<div class="src-track"><span style="width:'+Math.max(3,x.n/max*100)+'%;background:'+m.dot+'"></span></div>'
      +'<div class="src-n">'+intf(x.n)+' <small>'+pct(dv(x.n,total)*100)+'</small></div></div>'; }).join('');
}
/* diário empilhado por rede / pago x orgânico */
var REDECOLOR={ 'Facebook Ads':'#22d3ee','Google Ads':'#8b7cf0','TikTok':'#00d1c9','Insta bio':'#e46aa7','Insta direct':'#f59ecb','Instagram':'#e46aa7','YouTube':'#ff5a5a','ManyChat':'#5b8def','WhatsApp':'#25d366' };
function makeRedeColorer(keys){ var pal=['#f5b041','#a99bf7','#67e8f9','#f2637e','#5eead4','#fca5a5','#c4b5fd'],u=0,map={};
  keys.forEach(function(k){ if(REDECOLOR[k])map[k]=REDECOLOR[k]; else {map[k]=pal[u%pal.length];u++;} }); return function(k){ return map[k]||'#8093b3'; }; }
function renderStacked(elId, rows, keys, colorOf, labelOf, percent){
  labelOf=labelOf||function(k){return k;};
  var W=760,H=248,pl=34,pr=10,pt=14,pb=24,pw=W-pl-pr,ph=H-pt-pb,base=pt+ph;
  var tot=rows.map(function(r){ var s=0; keys.forEach(function(k){s+=(r.seg[k]||0);}); return s; });
  var maxT=Math.max.apply(null,tot.concat([1])), n=rows.length||1, gw=pw/n, bw=Math.max(4,Math.min(34,gw*0.62));
  var s='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMid meet">';
  [0,0.5,1].forEach(function(f){ var y=pt+ph*(1-f); s+='<line x1="'+pl+'" y1="'+y+'" x2="'+(W-pr)+'" y2="'+y+'" stroke="#182034" stroke-dasharray="2 3"/>'; s+='<text x="'+(pl-4)+'" y="'+(y+3)+'" text-anchor="end" fill="#586a8c" font-size="9">'+(percent?Math.round(f*100)+'%':Math.round(maxT*f))+'</text>'; });
  rows.forEach(function(r,i){ var xc=pl+gw*i+gw/2, yTop=base, denom=percent?tot[i]:maxT; if(percent && !denom) return;
    keys.forEach(function(k){ var v=r.seg[k]||0; if(v<=0) return; var h=ph*v/denom;
      s+='<rect x="'+(xc-bw/2).toFixed(1)+'" y="'+(yTop-h).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+h.toFixed(1)+'" fill="'+colorOf(k)+'"/>'; yTop-=h; }); });
  xticks(rows).forEach(function(i){ var xc=pl+gw*i+gw/2; s+='<text x="'+xc.toFixed(1)+'" y="'+(H-6)+'" text-anchor="middle" fill="#586a8c" font-size="9">'+fmtBR(rows[i].date)+'</text>'; });
  s+=hitRects(rows,pl,gw,pt,ph)+'</svg>';
  var legend=keys.map(function(k){ return '<span><span class="dot" style="background:'+colorOf(k)+'"></span>'+esc(labelOf(k))+'</span>'; }).join('');
  el(elId).innerHTML='<div class="chart">'+s+'</div><div class="chart-legend wrap">'+legend+'</div>';
  bindHits(elId, rows, function(r){ var t=0; keys.forEach(function(k){t+=(r.seg[k]||0);});
    var h='<div class="tt-d">'+fmtBR(r.date)+' · '+intf(t)+' leads</div>';
    keys.forEach(function(k){ var v=r.seg[k]||0; if(v>0) h+='<div class="tt-r"><span style="color:'+colorOf(k)+'">'+esc(labelOf(k))+'</span><b>'+(percent?pct(dv(v,t)*100):intf(v))+'</b></div>'; });
    return h; });
}
function mountSourceDaily(){
  var srcOrder=arr(D.srcOrder), srcDaily=arr(D.srcDaily);
  var rows=srcDaily.map(function(d){ var seg={}; if(d.vals){ for(var k in d.vals){ seg[k]=+d.vals[k]||0; } } return {date:d.date,seg:seg}; });
  var keys=srcOrder.slice(0,9);
  if(srcOrder.length>9){ var rest=srcOrder.slice(9); keys.push('Outros'); rows.forEach(function(r){ var o=0; rest.forEach(function(k){o+=(r.seg[k]||0); delete r.seg[k];}); if(o>0)r.seg['Outros']=o; }); }
  if(!rows.length||!keys.length){ el('chartSrcDaily').innerHTML='<div class="empty">Sem dados.</div>'; }
  else renderStacked('chartSrcDaily', rows, keys, makeRedeColorer(keys));
  var paidDaily=arr(D.paidDaily);
  var prows=paidDaily.map(function(d){ return {date:d.date,seg:{'Tráfego pago':+d.pago||0,'Orgânico':+d.org||0}}; });
  if(!prows.length){ el('chartPaidDaily').innerHTML='<div class="empty">Sem dados.</div>'; }
  else renderStacked('chartPaidDaily', prows, ['Tráfego pago','Orgânico'], function(k){ return k==='Tráfego pago'?COL.cy:COL.vi; });
}
function mountLeads(){
  var LA=leadAgg(), total=LA.leads||0, paid=LA.paid||0, org=LA.organic||0, spend=faseSpend();
  var paidFrac=dv(paid,total), citiesN=arr(LA.cities).length;
  var geo=LA.geo, topState=geo[0];
  // veredito
  var big = paid>=org ? 'A maioria vem do TRÁFEGO PAGO' : 'A maioria é ORGÂNICA';
  el('verdict').innerHTML=donut(paidFrac,COL.cy,total?pct(paidFrac*100):'—','pago',150)
    +'<div class="v-txt"><div class="v-big">'+intf(total)+' leads captados</div>'
    +'<div class="v-sub">'+big+' · <b class="chip-pago">'+intf(paid)+' pago</b> · <b class="chip-org">'+intf(org)+' orgânico</b>'
    +(topState?' · estado líder <b style="color:var(--ink2)">'+esc(topState.label)+'</b> ('+intf(topState.n)+')':'')+'</div>'
    +'<div class="v-sub">'+intf(LA.attributed||0)+' leads atribuídos a um anúncio · alcance em <b style="color:var(--ink2)">'+intf(LA.states||0)+' estados</b> e '+intf(citiesN)+' cidades</div></div>';
  // stats
  el('leadsStats').innerHTML='<div class="stat-row">'
    +'<div class="stat"><div class="s-v">'+intf(total)+'</div><div class="s-l">Leads captados</div></div>'
    +'<div class="stat pago"><div class="s-v">'+intf(paid)+'</div><div class="s-l">Tráfego pago</div></div>'
    +'<div class="stat org"><div class="s-v">'+intf(org)+'</div><div class="s-l">Orgânico</div></div>'
    +'<div class="stat geo"><div class="s-v">'+intf(LA.states||0)+'</div><div class="s-l">Estados alcançados</div></div></div>';
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
  // fontes de leads (rico, por utm_source · utm vazia = TikTok)
  renderSources(LA.channels, total);
  // diario empilhado por rede + pago x organico
  mountSourceDaily();
  // geo
  el('geoBars').innerHTML=barList(geo.slice(0,14),'gr',total);
  // ranking de anuncios
  renderAdRank();
}
function renderAdRank(){
  var rows=grain.filter(function(r){return r.ad!=='SEM_RASTREIO'&&faseMatch(r);}), ads={};
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
  var resp=(sv.respondents!=null?sv.respondents:sv.completed)||0, svRate=dv(resp,leads), gpRate=dv(gp.entered,leads);
  el('engStats').innerHTML='<div class="stat-row" style="grid-template-columns:repeat(3,1fr)">'
    +'<div class="stat"><div class="s-v">'+intf(leads)+'</div><div class="s-l">Leads captados</div></div>'
    +'<div class="stat resp"><div class="s-v">'+intf(resp)+'</div><div class="s-l">Responderam a pesquisa <small>(completas)</small></div></div>'
    +'<div class="stat grp"><div class="s-v">'+intf(gp.net)+'</div><div class="s-l">Pessoas nos grupos</div></div></div>';
  var sh=el('surveyHero'); sh.className='rate-hero cy';
  sh.innerHTML='<span class="rh-val">'+pct(svRate*100)+'</span>'
    +'<span class="rh-det"><b>'+intf(resp)+'</b> responderam a pesquisa (completa) de <b>'+intf(leads)+'</b> leads'+(sv.incomplete?' · '+intf(sv.incomplete)+' incompletas (não classificadas)':'')
    +'<br>é essa base de <b>'+intf(resp)+'</b> que alimenta a classificação A/B/C da aba <b>Perfil do Lead</b></span>';
  renderRateChart('chartSurvey', rows, function(r){return r.survey;}, function(r){return dv(r.survey,r.leads);}, COL.cy, 'Respostas');
  var gh=el('groupHero'); gh.className='rate-hero gr';
  gh.innerHTML='<span class="rh-val">'+pct(gpRate*100)+'</span>'
    +'<span class="rh-det"><b>'+intf(gp.entered)+'</b> entradas de <b>'+intf(leads)+'</b> leads'
    +'<br>'+intf(gp.entered)+' entraram · '+intf(gp.left)+' saíram · <b>'+intf(gp.net)+'</b> ativos no grupo</span>';
  renderRateChart('chartGroup', rows, function(r){return r.groupIn;}, function(r){return dv(r.groupIn,r.leads);}, COL.good, 'Entradas');
  renderEngTable(rows);
}

/* =================== PERFIL DO LEAD (A/B/C, filtrável por período) =================== */
var profPeriod='tudo', profSrc=-1, profMed=-1, profCamp=-1;   // filtros UTM (-1 = todas)
function profSel(id,label,list,cur){ var o='<option value="-1">todas</option>'; arr(list).forEach(function(v,i){ o+='<option value="'+i+'"'+(cur==i?' selected':'')+'>'+esc(v)+'</option>'; });
  return '<span class="prof-sel-w"><span class="ps-l">'+label+'</span><select class="prof-sel" id="'+id+'">'+o+'</select></span>'; }
function profBounds(){ var ds=arr(D.resp).map(function(r){return r[0];}).filter(isDate).sort(); return [ds[0]||minDate, ds[ds.length-1]||maxDate]; }
function profRangeFor(k){ var b=profBounds(), mn=b[0], mx=b[1];
  if(k==='hoje') return [mx,mx]; if(k==='ontem'){var y=addDays(mx,-1);return [y,y];}
  if(k==='7d') return [addDays(mx,-6),mx]; if(k==='30d') return [addDays(mx,-29),mx]; return [mn,mx]; }
function abcOf(c){ return c==='A'?'A':(c==='C'?'C':'B'); }
function abcCard(cls,title,sub,n,tot,color){
  return '<div class="abc-card '+cls+'"><div class="abc-badge">'+cls+'</div>'
    +'<div class="abc-n">'+intf(n)+'</div><div class="abc-t">'+title+'<br><span class="muted">'+sub+'</span></div>'
    +'<div class="abc-p">'+pct(dv(n,tot)*100)+'</div></div>'; }
function mountProfile(){
  if(!el('profStats')) return;
  var rng=profRangeFor(profPeriod), fIdx=(fase==='all')?-1:arr(D.fases).indexOf(fase);
  var rows=arr(D.resp).filter(function(r){ return isDate(r[0]) && inRange(r[0],rng)
    && (profSrc<0 || r[8]==profSrc) && (profMed<0 || r[9]==profMed) && (profCamp<0 || r[10]==profCamp)
    && (fIdx<0 || r[11]==fIdx); });
  el('profPeriods').innerHTML=PRESETS.map(function(pp){return '<button data-k="'+pp.k+'" class="pbtn'+(profPeriod===pp.k?' on':'')+'">'+pp.label+'</button>';}).join('');
  Array.prototype.forEach.call(el('profPeriods').querySelectorAll('.pbtn'),function(b){ b.addEventListener('click',function(){ profPeriod=b.getAttribute('data-k'); mountProfile(); }); });
  // filtros por UTM (fonte / meio / campanha do lead)
  if(el('profFilters')){ var leg=D.respLeg||{};
    var clr=(profSrc>=0||profMed>=0||profCamp>=0)?'<button class="prof-clr" id="pfClr">limpar ✕</button>':'';
    el('profFilters').innerHTML='<span class="pf-h">Filtrar por UTM:</span>'+profSel('pfSrc','Fonte',leg.src,profSrc)+profSel('pfMed','Meio',leg.med,profMed)+profSel('pfCamp','Campanha',leg.camp,profCamp)+clr;
    el('pfSrc').onchange=function(){ profSrc=+this.value; mountProfile(); };
    el('pfMed').onchange=function(){ profMed=+this.value; mountProfile(); };
    el('pfCamp').onchange=function(){ profCamp=+this.value; mountProfile(); };
    if(el('pfClr')) el('pfClr').onclick=function(){ profSrc=-1; profMed=-1; profCamp=-1; mountProfile(); };
  }
  var cA=0,cB=0,cC=0; rows.forEach(function(r){ var c=abcOf(r[1]); if(c==='A')cA++;else if(c==='C')cC++;else cB++; });
  var tot=cA+cB+cC||1;
  el('profStats').innerHTML='<div class="abc-cards">'
    +abcCard('A','Lead A','perseguir',cA,tot,ABC.A)+abcCard('B','Lead B','miolo',cB,tot,ABC.B)+abcCard('C','Lead C','cortar',cC,tot,ABC.C)
    +'<div class="abc-card tot"><div class="abc-n">'+intf(tot)+'</div><div class="abc-t">responderam<br><span class="muted">no período</span></div></div></div>';
  // gráfico diário empilhado A/B/C
  var byDay={}; rows.forEach(function(r){ var d=r[0]; if(!byDay[d])byDay[d]={date:d,seg:{A:0,B:0,C:0}}; byDay[d].seg[abcOf(r[1])]++; });
  var drows=Object.keys(byDay).sort().map(function(k){return byDay[k];});
  if(drows.length) renderStacked('profChart', drows, ['A','B','C'], function(k){return ABC[k];}, function(k){return 'Lead '+k;}, true);
  else el('profChart').innerHTML='<div class="empty">Sem respostas no período.</div>';
  // distribuição das respostas (o que os leads respondem), colorida por A/B/C
  var html='';
  PROFQ.forEach(function(Q){
    var dist={}, maxT=1;
    rows.forEach(function(r){ var i=r[Q.pos]; if(i==null||i<0) return; if(!dist[i])dist[i]={A:0,B:0,C:0,t:0}; dist[i][abcOf(r[1])]++; dist[i].t++; });
    Object.keys(dist).forEach(function(i){ maxT=Math.max(maxT,dist[i].t); });
    var bars=Q.opts.map(function(opt,i){ var d=dist[i]||{A:0,B:0,C:0,t:0};
      return '<div class="pf-row"><span class="pf-l" title="'+esc(opt)+'">'+esc(opt)+'</span>'
        +'<span class="pf-track">'
          +(d.A?'<i style="width:'+(dv(d.A,maxT)*100).toFixed(1)+'%;background:'+ABC.A+'" title="A '+d.A+'"></i>':'')
          +(d.B?'<i style="width:'+(dv(d.B,maxT)*100).toFixed(1)+'%;background:'+ABC.B+'" title="B '+d.B+'"></i>':'')
          +(d.C?'<i style="width:'+(dv(d.C,maxT)*100).toFixed(1)+'%;background:'+ABC.C+'" title="C '+d.C+'"></i>':'')
        +'</span><span class="pf-n">'+intf(d.t)+' <small>'+(tot?pct(dv(d.t,tot)*100):'')+'</small></span></div>';
    }).join('');
    html+='<div class="pf-q"><div class="pf-qh">'+esc(Q.q)+'</div>'+bars+'</div>';
  });
  el('profDist').innerHTML=html;
  renderProfileCompare(rows, tot);
}
/* ---- comparação leads agora × compradores Prosperus (pizzas por pergunta) ---- */
function rampColor(t){ var s=[[242,99,126],[245,176,65],[52,211,153]],a,b,f;
  if(t<=0.5){a=s[0];b=s[1];f=t*2;}else{a=s[1];b=s[2];f=(t-0.5)*2;}
  return 'rgb('+Math.round(a[0]+(b[0]-a[0])*f)+','+Math.round(a[1]+(b[1]-a[1])*f)+','+Math.round(a[2]+(b[2]-a[2])*f)+')'; }
function optColors(n){ var c=[]; for(var i=0;i<n;i++)c.push(rampColor(n>1?i/(n-1):0.5)); return c; }
function adColor(v){ return v>=75?ABC.A:(v>=58?ABC.B:ABC.C); }
function pieSvg(pcts, colors, size, labels){
  var cx=size/2, cy=size/2, rO=size/2-2, rI=rO*0.58, tot=0; pcts.forEach(function(v){tot+=(v||0);});
  var s='<svg width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'">';
  if(tot<=0){ return s+'<circle cx="'+cx+'" cy="'+cy+'" r="'+((rO+rI)/2).toFixed(1)+'" fill="none" stroke="#1a2740" stroke-width="'+(rO-rI).toFixed(1)+'"/></svg>'; }
  var ang=-Math.PI/2;
  pcts.forEach(function(v,i){ if(!v||v<=0)return; var frac=v/tot, a1=ang+frac*2*Math.PI, ti='<title>'+esc(labels[i])+' '+nf1.format(frac*100)+'%</title>';
    if(frac>=0.999){ s+='<circle cx="'+cx+'" cy="'+cy+'" r="'+((rO+rI)/2).toFixed(1)+'" fill="none" stroke="'+colors[i]+'" stroke-width="'+(rO-rI).toFixed(1)+'">'+ti+'</circle>'; ang=a1; return; }
    var large=(a1-ang)>Math.PI?1:0, x0=(cx+rO*Math.cos(ang)).toFixed(1), y0=(cy+rO*Math.sin(ang)).toFixed(1), x1=(cx+rO*Math.cos(a1)).toFixed(1), y1=(cy+rO*Math.sin(a1)).toFixed(1),
        xi1=(cx+rI*Math.cos(a1)).toFixed(1), yi1=(cy+rI*Math.sin(a1)).toFixed(1), xi0=(cx+rI*Math.cos(ang)).toFixed(1), yi0=(cy+rI*Math.sin(ang)).toFixed(1);
    s+='<path d="M'+x0+' '+y0+' A'+rO+' '+rO+' 0 '+large+' 1 '+x1+' '+y1+' L'+xi1+' '+yi1+' A'+rI+' '+rI+' 0 '+large+' 0 '+xi0+' '+yi0+' Z" fill="'+colors[i]+'">'+ti+'</path>'; ang=a1; });
  return s+'</svg>';
}
function renderProfileCompare(rows, tot){
  if(!el('profPies')) return;
  var cA=0; rows.forEach(function(r){ if(abcOf(r[1])==='A')cA++; });
  var aNow=dv(cA,tot)*100, aBuy=PROSPERUS_ABC.A, overlaps=[], pies='';
  PROFQ.forEach(function(Q){
    var n=Q.opts.length, cnt=[]; for(var i=0;i<n;i++)cnt[i]=0; var qt=0;
    rows.forEach(function(r){ var idx=r[Q.pos]; if(idx==null||idx<0||idx>=n)return; cnt[idx]++; qt++; });
    var leadPct=cnt.map(function(c){return dv(c,qt)*100;}), buyPct=Q.buyer, cols=optColors(n), ov=0;
    for(var i=0;i<n;i++) ov+=Math.min(leadPct[i]||0, buyPct[i]||0);
    overlaps.push(ov);
    var leg=Q.opts.map(function(o,i){ return '<span class="pc-lg"><i style="background:'+cols[i]+'"></i>'+esc(o)+'</span>'; }).join('');
    pies+='<div class="pcmp"><div class="pcmp-h">'+esc(Q.q)+' <span class="pcmp-ad" style="color:'+adColor(ov)+'">'+Math.round(ov)+'% igual</span></div>'
      +'<div class="pcmp-body"><figure>'+pieSvg(leadPct,cols,118,Q.opts)+'<figcaption>Leads agora</figcaption></figure>'
      +'<figure>'+pieSvg(buyPct,cols,118,Q.opts)+'<figcaption class="buyer">Prosperus</figcaption></figure></div>'
      +'<div class="pcmp-leg">'+leg+'</div></div>';
  });
  var macro=overlaps.reduce(function(s,x){return s+x;},0)/(overlaps.length||1);
  var verd = macro>=82?'Muito perto do perfil comprador':(macro>=70?'Perto do perfil comprador':(macro>=58?'Aderência média — dá pra melhorar':'Longe do perfil — mix precisa mudar'));
  el('profMacro').innerHTML='<div class="macro"><div class="macro-gauge">'+pieSvg([macro,100-macro],[adColor(macro),'#1a2740'],154,['aderência',''])
      +'<div class="mg-c"><span class="mg-v" style="color:'+adColor(macro)+'">'+Math.round(macro)+'%</span><span class="mg-l">aderência</span></div></div>'
    +'<div class="macro-txt"><div class="macro-big" style="color:'+adColor(macro)+'">'+verd+'</div>'
      +'<div class="macro-sub">O quanto o mix de leads de agora se parece com quem realmente comprou (<b>Prosperus</b>) — média das 6 perguntas. 100% = idêntico ao comprador.</div>'
      +'<div class="macro-a"><div class="ma-lab">% de <b class="cA">Lead A</b> (o perfil que mais compra)</div>'
        +'<div class="ma-row"><span>Leads agora</span><div class="ma-tr"><i style="width:'+Math.min(100,aNow).toFixed(1)+'%"></i></div><b>'+nf1.format(aNow)+'%</b></div>'
        +'<div class="ma-row"><span>Prosperus</span><div class="ma-tr"><i class="buy" style="width:'+Math.min(100,aBuy).toFixed(1)+'%"></i></div><b>'+nf1.format(aBuy)+'%</b></div>'
      +'</div></div></div>';
  el('profPies').innerHTML=pies;
}

/* =================== META DE INVESTIMENTO (pacing) =================== */
function todayISO(){ var d=new Date(),m=d.getMonth()+1,day=d.getDate(); return d.getFullYear()+'-'+(m<10?'0'+m:m)+'-'+(day<10?'0'+day:day); }
function mountGoal(){
  var box=el('goalWrap'); if(!box) return;
  var G=D.goal||{}, goal=+G.spend||0, deadline=G.date||'';
  if(!(goal>0) || !deadline){ box.innerHTML=''; return; }
  var spent=totals.spend||0, tISO=todayISO();
  var remaining=Math.max(0,goal-spent), pctDone=clamp(goal>0?spent/goal:0);
  var daysLeft = tISO<=deadline ? daysBetween(tISO,deadline)+1 : 0;      // inclui hoje
  var dailyNeeded = daysLeft>0 ? remaining/daysLeft : 0;
  var byDate={}; daily.forEach(function(d){ if(!isDate(d.date))return; byDate[d.date]=(byDate[d.date]||0)+(d.spend||0); });
  var dts=Object.keys(byDate).sort(), last7=dts.slice(-7);
  var recentAvg = last7.length ? last7.reduce(function(s,k){return s+byDate[k];},0)/last7.length : 0;
  var projected = spent + recentAvg*daysLeft, deltaDaily = dailyNeeded-recentAvg, dl=fmtBR(deadline);
  var done=spent>=goal, over=daysLeft<=0;
  var heroVal = done?'Meta atingida 🎉':over?'Prazo encerrado':money0(dailyNeeded)+'<span class="gh-u">/dia</span>';
  var heroLab = done?'você já bateu os '+money0(goal):over?'o prazo de '+dl+' passou':'invista por dia até <b>'+dl+'</b> p/ bater a meta';
  var start=dts.length?dts[0]:tISO, totalDays=Math.max(1,daysBetween(start,deadline)+1), elapsed=Math.max(0,Math.min(totalDays,daysBetween(start,tISO)+1));
  var idealFrac=clamp(elapsed/totalDays), idealSpent=goal*idealFrac, behind=spent<idealSpent;
  var paceNote;
  if(done){ paceNote='Investimento acumulado já alcançou a meta.'; }
  else if(over){ paceNote='Faltaram <b>'+money0(remaining)+'</b> para a meta de '+money0(goal)+'.'; }
  else {
    paceNote='No ritmo atual (~<b>'+money0(recentAvg)+'</b>/dia) você chega a <b>'+money0(projected)+'</b> em '+dl+' — '
      +(projected>=goal?'<b class="g-ok">supera a meta</b>.':'<b class="g-bad">'+money0(goal-projected)+' abaixo</b>.')
      +(deltaDaily>1?' Precisa <b class="g-bad">acelerar +'+money0(deltaDaily)+'/dia</b> ('+nf1.format(recentAvg>0?dailyNeeded/recentAvg:0)+'× o ritmo de hoje).':' O ritmo atual já cobre o necessário ✓.');
  }
  box.innerHTML='<div class="card goalcard">'
    +'<div class="card-h">🎯 Meta de investimento <span class="hint">R$ '+nf0.format(goal)+' (com impostos) até '+dl+' · o valor/dia se reajusta sozinho a cada dia e a cada atualização</span></div>'
    +'<div class="goal-grid">'
      +'<div class="goal-hero'+(behind&&!done&&!over?' behind':(done?' okdone':''))+'"><div class="gh-val">'+heroVal+'</div><div class="gh-lab">'+heroLab+'</div></div>'
      +'<div class="goal-side">'
        +'<div class="goal-bar"><div class="gb-track"><span class="gb-fill" style="width:'+(pctDone*100).toFixed(1)+'%"></span>'
          +(idealFrac>0&&idealFrac<1?'<span class="gb-ideal" style="left:'+(idealFrac*100).toFixed(1)+'%"></span>':'')+'</div>'
          +'<div class="gb-legend"><span>Investido <b>'+money0(spent)+'</b> ('+pct(pctDone*100)+')</span><span class="gb-ideal-l">▏ritmo ideal hoje</span><span>Meta <b>'+money0(goal)+'</b></span></div></div>'
        +'<div class="goal-chips">'
          +'<div class="gchip"><div class="gc-v">'+money0(remaining)+'</div><div class="gc-l">falta investir</div></div>'
          +'<div class="gchip"><div class="gc-v">'+intf(daysLeft)+'</div><div class="gc-l">dias restantes</div></div>'
          +'<div class="gchip"><div class="gc-v">'+money0(recentAvg)+'</div><div class="gc-l">ritmo atual /dia</div></div>'
        +'</div>'
      +'</div>'
    +'</div>'
    +'<div class="goal-note">'+paceNote+'</div></div>';
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
/* ---- filtro global de FASE (turma: SIP-S1 / SIP-S2 / ...) ---- */
function syncFaseUI(){ if(!el('fasebar'))return; Array.prototype.forEach.call(el('fasebar').querySelectorAll('.fbtn2'),function(b){ b.classList.toggle('on', fase===b.getAttribute('data-f')); }); }
function applyFase(){ treeInited=false; syncFaseUI(); initCoverage(); renderAll(); mountLeads(); mountProfile(); mountAcomp(); }
function initFases(){ var box=el('fasebar'); if(!box) return; var fs=arr(D.fases);
  if(fs.length<2){ box.innerHTML=''; box.style.display='none'; fase='all'; return; }
  box.style.display='';
  box.innerHTML='<span class="fase-lab">Fase</span><button class="fbtn2" data-f="all">Todas</button>'
    +fs.map(function(k){ return '<button class="fbtn2" data-f="'+esc(k)+'">'+esc(faseLabel(k))+'</button>'; }).join('')
    +'<span class="fase-hint">turma de captação · tag do lead na planilha</span>';
  Array.prototype.forEach.call(box.querySelectorAll('.fbtn2'),function(b){
    b.addEventListener('click',function(){ fase=b.getAttribute('data-f'); applyFase(); }); });
  syncFaseUI();
}
/* =================== ACOMPANHAMENTO GERAL (saúde da captação · foco Lead A) =================== */
var acompWin=7;
function acompAgg(days){ var o={spend:0,leads:0,la:0,lb:0,lc:0,clicks:0,impr:0};
  days.forEach(function(d){ o.spend+=d.spend||0;o.leads+=d.leads||0;o.la+=d.la||0;o.lb+=d.lb||0;o.lc+=d.lc||0;o.clicks+=d.clicks||0;o.impr+=d.impr||0; }); return o; }
function acompMetrics(o){ var q=o.la+o.lb+o.lc; return {
  volA:o.la, cplA:(o.la>0?o.spend/o.la:null), pctA:(q>0?o.la/q*100:null),
  aPer100:(o.leads>0?o.la/o.leads*100:null), leads:o.leads, spend:o.spend, q:q }; }
function acTrend(cur,prev,hb){ // hb: true=maior melhor, false=menor melhor, null=neutro
  if(prev==null||cur==null||!isFinite(prev)||!isFinite(cur)||prev===0) return '';
  var c=(cur-prev)/Math.abs(prev)*100; if(Math.abs(c)<0.5) return '';
  var up=c>0, cls=(hb===null)?'flat':((hb?up:!up)?'up':'down');
  var txt=Math.abs(c)>300?'&gt;300%':(nf1.format(Math.abs(c))+'%');   // capa exageros (funil novo)
  return '<span class="trend '+cls+'">'+(up?'▲':'▼')+' '+txt+'</span>'; }
function acCard(lab,val,cur,prev,hb,sub){
  return '<div class="ac-card"><div class="ac-lab">'+lab+'</div><div class="ac-val">'+val+' '+acTrend(cur,prev,hb)+'</div><div class="ac-sub">'+(sub||'')+'</div></div>'; }
function mountAcomp(){
  if(!el('acompStats')) return;
  var all=daysInRange([minDate,maxDate]);   // dias com dados (asc) · respeita canal + fase
  var wins=[{n:7,l:'7 dias'},{n:14,l:'14 dias'},{n:30,l:'30 dias'}];
  el('acompWin').innerHTML='<span class="pf-h">Comparar janela de:</span>'+wins.map(function(w){return '<button data-n="'+w.n+'" class="pbtn'+(acompWin===w.n?' on':'')+'">'+w.l+'</button>';}).join('');
  Array.prototype.forEach.call(el('acompWin').querySelectorAll('.pbtn'),function(b){ b.addEventListener('click',function(){ acompWin=+b.getAttribute('data-n'); mountAcomp(); }); });
  var N=acompWin;
  var cur=all.slice(Math.max(0,all.length-N)), prev=all.slice(Math.max(0,all.length-2*N),Math.max(0,all.length-N));
  var mc=acompMetrics(acompAgg(cur)), mp=acompMetrics(acompAgg(prev));
  var qUp=(mc.pctA!=null&&mp.pctA!=null)?mc.pctA>mp.pctA:null;
  var cheaper=(mc.cplA!=null&&mp.cplA!=null)?mc.cplA<mp.cplA:null;
  var status,cls,msg;
  if(qUp===true&&cheaper===true){ status='MELHORANDO'; cls='hh-good'; msg='Mais Lead A <b>e</b> mais barato que a janela anterior — a captação está esquentando. Continue escalando o que traz Lead A.'; }
  else if(qUp===false&&cheaper===false){ status='PIORANDO'; cls='hh-bad'; msg='Menos Lead A qualificado <b>e</b> mais caro — a qualidade da captação está caindo. Reveja/pause o que traz Lead C em massa.'; }
  else if(qUp===null||cheaper===null){ status='POUCOS DADOS'; cls='hh-mid'; msg='Ainda faltam respostas de pesquisa nesta janela p/ um veredito firme. Veja a tendência abaixo.'; }
  else { status='ESTÁVEL / MISTO'; cls='hh-mid'; msg='Sinais mistos entre <b>qualidade</b> (% Lead A) e <b>custo</b> (R$/Lead A). Olhe os cards e a evolução diária.'; }
  var hero='<div class="health-hero '+cls+'"><div class="hh-badge">'+status+'</div>'
    +'<div class="hh-txt"><b>Saúde da captação · '+esc(funLabel(funKey))+'</b> — últimos <b>'+N+'</b> dias vs '+N+' dias anteriores.<br>'+msg
    +'<br><small>Lead A = perfil do nosso comprador (Prosperus, docs L17–L20). Objetivo: <b>volume de Lead A subindo</b> e <b>custo por Lead A caindo</b>.</small></div></div>';
  var cards='<div class="ac-grid">'
    + acCard('Volume de Lead A', intf(mc.volA), mc.volA, mp.volA, true, N+'d anteriores: '+intf(mp.volA))
    + acCard('Custo por Lead A', mc.cplA!=null?money(mc.cplA):'—', mc.cplA, mp.cplA, false, mp.cplA!=null?('antes: '+money(mp.cplA)):'sem base')
    + acCard('% Lead A <small>(entre respondentes)</small>', mc.pctA!=null?pct(mc.pctA):'—', mc.pctA, mp.pctA, true, mp.pctA!=null?('antes: '+pct(mp.pctA)):'sem base')
    + acCard('Lead A por 100 leads', mc.aPer100!=null?nf1.format(mc.aPer100):'—', mc.aPer100, mp.aPer100, true, 'rendimento de Lead A')
    + acCard('Leads captados', intf(mc.leads), mc.leads, mp.leads, true, N+'d anteriores: '+intf(mp.leads))
    + acCard('Investimento', money0(mc.spend), mc.spend, mp.spend, null, 'gasto na janela')
    + '</div>';
  el('acompStats').innerHTML=hero+cards;
  acompChart(all); acompWeeks(all);
}
function tipAcomp(d){
  var q=(d.la||0)+(d.lb||0)+(d.lc||0);
  return '<div class="tt-d">'+fmtBR(d.date)+'</div>'
    +'<div class="tt-r"><span style="color:#34d399">Lead A</span><b>'+intf(d.la||0)+'</b></div>'
    +'<div class="tt-r"><span style="color:'+COL.warn+'">Custo por Lead A</span><b>'+(d.la>0?money(dv(d.spend,d.la)):'—')+'</b></div>'
    +'<div class="tt-sub">Leads '+intf(d.leads||0)+' · % Lead A '+(q>0?pct(dv(d.la,q)*100):'—')+' · Invest. '+money0(d.spend)+'</div>'; }
function acompChart(days){
  if(!el('acompChart')) return;
  var d2=days.slice(Math.max(0,days.length-45));
  var W=760,H=230,pl=34,pr=44,pt=14,pb=24,pw=W-pl-pr,ph=H-pt-pb,base=pt+ph;
  var maxA=Math.max.apply(null,d2.map(function(d){return d.la||0;}).concat([1]));
  var cpls=d2.map(function(d){return d.la>0?dv(d.spend,d.la):null;});
  var maxC=Math.max.apply(null,cpls.filter(function(x){return x!=null;}).concat([1]));
  var n=d2.length||1,gw=pw/n,bw=Math.max(3,Math.min(22,gw*0.6));
  var s='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMid meet">';
  [0,0.5,1].forEach(function(f){ var y=pt+ph*(1-f); s+='<line x1="'+pl+'" y1="'+y+'" x2="'+(W-pr)+'" y2="'+y+'" stroke="#182034" stroke-dasharray="2 3"/>';
    s+='<text x="'+(pl-4)+'" y="'+(y+3)+'" text-anchor="end" fill="#586a8c" font-size="9">'+Math.round(maxA*f)+'</text>';
    s+='<text x="'+(W-pr+4)+'" y="'+(y+3)+'" text-anchor="start" fill="#c98a2a" font-size="9">'+Math.round(maxC*f)+'</text>'; });
  d2.forEach(function(d,i){ var xc=pl+gw*i+gw/2,h=ph*dv(d.la,maxA);
    if(d.la>0) s+='<rect x="'+(xc-bw/2).toFixed(1)+'" y="'+(base-h).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+h.toFixed(1)+'" rx="1.5" fill="rgba(52,211,153,.42)"/>'; });
  var pts=[]; d2.forEach(function(d,i){ if(cpls[i]!=null){ var xc=pl+gw*i+gw/2,y=base-ph*dv(cpls[i],maxC); pts.push([xc,y]); } });
  if(pts.length>1) s+='<path d="M'+pts.map(function(pp){return pp[0].toFixed(1)+' '+pp[1].toFixed(1);}).join(' L')+'" fill="none" stroke="'+COL.warn+'" stroke-width="2"/>';
  pts.forEach(function(pp){ s+='<circle cx="'+pp[0].toFixed(1)+'" cy="'+pp[1].toFixed(1)+'" r="2.4" fill="'+COL.warn+'"/>'; });
  xticks(d2).forEach(function(i){ var xc=pl+gw*i+gw/2; s+='<text x="'+xc.toFixed(1)+'" y="'+(H-6)+'" text-anchor="middle" fill="#586a8c" font-size="9">'+fmtBR(d2[i].date)+'</text>'; });
  s+=hitRects(d2,pl,gw,pt,ph)+'</svg>';
  el('acompChart').innerHTML='<div class="chart">'+s+'</div><div class="chart-legend"><span><span class="dot" style="background:rgba(52,211,153,.7)"></span>Lead A / dia</span><span><span class="ln" style="background:'+COL.warn+'"></span>Custo por Lead A</span></div>';
  bindHits('acompChart', d2, tipAcomp);
}
function acompWeeks(days){
  if(!el('acompWeeks')) return;
  var weeks=[]; for(var end=days.length; end>0 && weeks.length<8; end-=7){ var seg=days.slice(Math.max(0,end-7),end); if(seg.length) weeks.push(seg); }
  var rows=weeks.map(function(seg){ return {ini:seg[0].date, fim:seg[seg.length-1].date, m:acompMetrics(acompAgg(seg))}; });
  var head='<thead><tr><th>Semana</th><th class="num">Lead A</th><th class="num">Custo Lead A</th><th class="num">% Lead A</th><th class="num">Leads</th><th class="num">Invest.</th></tr></thead>';
  var body=rows.map(function(r,i){ var pm=(i+1<rows.length)?rows[i+1].m:null;
    return '<tr><td>'+fmtBR(r.ini)+' – '+fmtBR(r.fim)+'</td>'
      +'<td class="num"><b class="cA">'+intf(r.m.volA)+'</b>'+(pm?acTrend(r.m.volA,pm.volA,true):'')+'</td>'
      +'<td class="num">'+(r.m.cplA!=null?money0(r.m.cplA):'—')+(pm&&pm.cplA!=null?acTrend(r.m.cplA,pm.cplA,false):'')+'</td>'
      +'<td class="num">'+(r.m.pctA!=null?pct(r.m.pctA):'—')+(pm&&pm.pctA!=null?acTrend(r.m.pctA,pm.pctA,true):'')+'</td>'
      +'<td class="num">'+intf(r.m.leads)+'</td><td class="num">'+money0(r.m.spend)+'</td></tr>'; }).join('');
  if(!rows.length) body='<tr><td colspan="6" class="empty">Sem dados.</td></tr>';
  el('acompWeeks').innerHTML=head+'<tbody>'+body+'</tbody>';
}
function renderAll(){ var rng=rangeFor(period), a=aggDaily(rng), p=aggDaily(prevRange(rng)), days=daysInRange(rng);
  renderKpiCol(a,p); renderChartLeads(days); renderChartInvest(days); renderDaily(rng); renderTree(rng); }
var TABS=['funil','leads','perfil','acomp','engaje'];
function activateTab(id){ Array.prototype.forEach.call(document.querySelectorAll('.tab'),function(x){x.classList.toggle('active',x.getAttribute('data-tab')===id);});
  TABS.forEach(function(k){ el('tab-'+k).classList.toggle('hidden',k!==id); }); }
function initTabs(){ Array.prototype.forEach.call(document.querySelectorAll('.tab'),function(t){ t.addEventListener('click',function(){ var id=t.getAttribute('data-tab'); activateTab(id); if(history.replaceState)history.replaceState(null,'','#'+id); }); });
  var h=(location.hash||'').replace('#',''); if(TABS.indexOf(h)>=0)activateTab(h);
  window.addEventListener('hashchange',function(){ var k=(location.hash||'').replace('#',''); if(TABS.indexOf(k)>=0)activateTab(k); }); }
function initCoverage(){ el('updated').textContent=D.generatedAtBR||FUN.generatedAtBR||'—'; el('taxf').textContent=(D.taxMultiplier||1.1385).toFixed(4).replace('.',',');
  var lab=funLabel(funKey);
  var bc=arr(D.byChannel), m=null,g=null; bc.forEach(function(x){ if(x.ch==='meta')m=x; if(x.ch==='google')g=x; });
  var chTxt = (m&&g) ? ' · <b class="chip-pago">Meta '+money0(m.spend)+'</b> + <b class="chip-org">Google '+money0(g.spend)+'</b> (Google s/ imposto)' : '';
  var msg='';
  if(D.leadsOk===false){
    msg='<span class="cov-warn">⚠ Leads do <b>'+esc(lab)+'</b> ainda não carregados</span> — a planilha de leads está privada. Libere o acesso ("Qualquer pessoa com o link · Leitor") para ver leads, pesquisa e grupos. <b>Tráfego já disponível:</b> <b>'+fmtBR(minDate)+' → '+fmtBR(maxDate)+'</b>'+chTxt+'.';
  } else if((D.leadDateMin||'')!==(minDate||'') || (D.leadDateMax||'')!==(maxDate||'')){
    msg='Funil <b>'+esc(lab)+'</b> · Leads registrados: <b>'+fmtBR(D.leadDateMin||'')+' → '+fmtBR(D.leadDateMax||'')+'</b> · Tráfego/gasto: <b>'+fmtBR(minDate)+' → '+fmtBR(maxDate)+'</b>. Em dias sem lead o CPL fica "—".';
  } else {
    var LA=leadAgg();
    msg='Funil <b>'+esc(lab)+'</b> · <b>'+fmtBR(minDate)+' → '+fmtBR(maxDate)+'</b> · <b>'+intf(LA.leads||0)+'</b> leads ('+intf(LA.paid||0)+' pago · '+intf(LA.organic||0)+' org)'+chTxt+'.';
  }
  if(fase!=='all') msg+=' <b class="cov-fase">▸ Fase '+esc(faseLabel(fase))+'</b>';
  el('coverage').innerHTML=msg; }

/* =================== FUNNEL SWITCH (topo) =================== */
function updateBranding(){
  var lab=funLabel(funKey), suf=lab.replace(/^SIP[-\s]?/i,'')||lab;
  var badge=el('funBadge'); if(badge) badge.textContent=suf;
  var eb=el('editband'); if(eb) eb.textContent='Funil de Captação · '+lab+' · Meta + Google Ads';
  try{ document.title='SIP · '+suf+' — Dashboard de Captação'; }catch(e){}
}
function syncFunnelUI(){ Array.prototype.forEach.call(el('funnelbar').querySelectorAll('.fbtn'),function(b){ b.classList.toggle('on', funKey===b.getAttribute('data-fn')); }); }
function switchFunnel(key){
  if(key===funKey || !(FUN.data&&FUN.data[key])) return;
  funKey=key; setFunnelVars();
  period='tudo'; customRange=null; channel='geral'; treeInited=false; expanded={};
  updateBranding(); syncFunnelUI(); syncChannelUI();
  profPeriod='tudo'; profSrc=-1; profMed=-1; profCamp=-1; fase='all'; acompWin=7;
  initFases(); initPeriods(); initCoverage(); renderAll(); mountLeads(); mountEngage(); mountProfile(); mountGoal(); mountAcomp();
  if(history.replaceState){ history.replaceState(null,'', location.pathname+'?funnel='+key+(location.hash||'')); }
}
function initFunnels(){
  var qp=(location.search.match(/[?&]funnel=([a-z0-9]+)/i)||[])[1];
  if(qp && FUN.data && FUN.data[qp.toLowerCase()]) funKey=qp.toLowerCase();
  el('funnelbar').innerHTML='<span class="fnlab">Funil</span>'+funnels.map(function(f){
    return '<button data-fn="'+f.key+'" class="fbtn"><b>'+esc(f.label)+'</b></button>'; }).join('')
    + '<span class="fnhint">escolha o funil · cada um tem suas próprias fontes</span>';
  Array.prototype.forEach.call(el('funnelbar').querySelectorAll('.fbtn'),function(b){
    b.addEventListener('click',function(){ switchFunnel(b.getAttribute('data-fn')); }); });
  syncFunnelUI();
}

if(!funnels.length || (!daily.length && !grain.length)){ el('coverage').innerHTML='<b>Sem dados.</b> Rode o build.ps1 para gerar o data.js.'; }
else { initFunnels(); setFunnelVars(); updateBranding(); initChannels(); initFases(); initPeriods(); initTabs(); initCoverage(); renderAll(); mountLeads(); mountEngage(); mountProfile(); mountGoal(); mountAcomp(); }
})();
