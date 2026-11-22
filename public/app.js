'use strict';

(() => {
  const $ = id => document.getElementById(id);
  const paths = {
    car: '<path d="m4 10 2-6h12l2 6M3 10h18v8H3zM6 18v2m12-2v2M6 13h2m8 0h2M5 10h14"/>',
    bolt: '<path d="m13 2-8 12h6l-1 8 9-13h-6z"/>',
    route: '<circle cx="6" cy="5" r="2"/><circle cx="18" cy="19" r="2"/><path d="M8 5h7a4 4 0 0 1 0 8H9a3 3 0 0 0 0 6h7"/>',
    chart: '<path d="M4 20V10m5 10V4m6 16v-7m5 7V7"/>',
    activity: '<path d="M8 5h12M8 12h12M8 19h12"/><circle cx="3" cy="5" r="1"/><circle cx="3" cy="12" r="1"/><circle cx="3" cy="19" r="1"/>',
    pin: '<path d="M19 10c0 5-7 12-7 12S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    climate: '<path d="M12 2v20M3.34 7l17.32 10M3.34 17 20.66 7M9 4l3 3 3-3M9 20l3-3 3 3M4 10l4-1-1-4m10 14-1-4 4-1M4 14l4 1-1 4m10-14-1 4 4 1"/>',
    arrow: '<path d="m9 5 7 7-7 7"/>', back: '<path d="m14 5-7 7 7 7"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2 6M20 4v7h-7"/>',
    settings: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="9" cy="18" r="2"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    battery: '<rect x="2" y="6" width="18" height="12" rx="2"/><path d="M23 10v4M5 9h12v6H5z"/>',
    sleep: '<path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>'
  };
  const icon = (name, extra = '') => `<svg class="icon ${extra}" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.info}</svg>`;
  document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const stored = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const save = (key, value) => { try { localStorage.setItem(key, value); } catch { /* preferences remain available in memory */ } };
  const state = { authed: false, generation: 0, view: 'now', units: stored('tm_units'), summary: null, hours: 24, days: 30,
    series: [], batteryEvents:[], chargeDays:30, chargeMode:'energy', chargingStats:null, stats: {}, health: null, drives: null, charges: null, activity:null, today:null, activityCursor:null, activityMore:false, activityAsOf:null,
    more: {}, busy: new Map(), errors: new Set(), lastOk: 0 };
  const titles = { now: 'Vehicle', activity:'Activity', drives: 'Drives', charges: 'Charging', stats: 'Energy' };
  const units = () => ['mi','km'].includes(state.units) ? state.units : state.summary?.settings?.units || 'km';
  const distance = km => km == null ? null : Number(km) / (units() === 'mi' ? 1.609344 : 1);
  const n = (value, digits = 0) => value == null || !Number.isFinite(Number(value)) ? '—' : Number(value).toLocaleString('en-GB', {minimumFractionDigits: digits, maximumFractionDigits: digits});
  const dist = (km, digits = 0) => n(distance(km), digits);
  const temp = c => c == null ? '—' : `${n(state.summary?.settings?.temperature === 'F' ? c * 1.8 + 32 : c)}°${state.summary?.settings?.temperature === 'F' ? 'F' : 'C'}`;
  const currencyCode = () => state.summary?.settings?.currency || 'GBP';
  const currency = value => window.MateMoney.formatMoney(value, currencyCode());
  const date = (iso, options = {}) => iso ? new Date(iso).toLocaleString('en-GB', {timeZone:state.summary?.settings?.timezone || 'Europe/London', ...options}) : '—';
  const day = iso => date(iso,{day:'numeric',month:'short',year:'numeric'});
  const time = iso => date(iso,{hour:'2-digit',minute:'2-digit'});
  const ageMinutes = iso => iso ? Math.max(0, (Date.now()-new Date(iso).getTime())/60000) : Infinity;
  const ago = iso => { const m = ageMinutes(iso); return !Number.isFinite(m) ? 'not recorded' : m < 1 ? 'just now' : m < 60 ? `${Math.floor(m)} min ago` : m < 1440 ? `${Math.floor(m/60)} hr ago` : `${Math.floor(m/1440)} days ago`; };
  const duration = mins => { if(mins==null)return '—';const rounded=Math.round(mins);return rounded<60?`${rounded} min`:`${Math.floor(rounded/60)}h${rounded%60?' '+rounded%60+'m':''}`; };
  const place=(name,full)=>{if(name)return name;if(!full)return 'Location not recorded';const parts=full.split(',').map(s=>s.trim());return /^\d+[A-Za-z]?$/.test(parts[0])?parts.slice(0,2).join(' '):parts[0];};
  const socUsed=d=>d.startLevel!=null&&d.endLevel!=null?d.startLevel-d.endLevel:null;
  const batteryChange=d=>socUsed(d)==null?'Battery not recorded':`${n(d.startLevel)}% → ${n(d.endLevel)}%`;
  const tariff = d => window.MateMoney.formatTariff(d, currencyCode());
  const address = a => a ? a.split(',').map(s=>s.trim()).filter(s=>s && !['United Kingdom','UK'].includes(s)).slice(0,3).join(', ') : 'Location not recorded';
  const set = (id,text) => { $(id).textContent = text; $(id).classList.remove('skeleton'); };
  const metric = (label,value,unit='',note='') => `<div class="metric"><span class="metric-value">${esc(value)}${unit ? `<span class="metric-unit">${esc(unit)}</span>` : ''}</span><span class="metric-label">${esc(label)}</span>${note ? `<div class="metric-note">${esc(note)}</div>` : ''}</div>`;
  const rows = pairs => `<dl class="detail-rows">${pairs.map(([k,v])=>`<div class="detail-row"><dt>${esc(k)}</dt><dd>${esc(v ?? '—')}</dd></div>`).join('')}</dl>`;
  const empty = (symbol,title,body,retry=false) => `<div class="empty-state">${icon(symbol)}<h3>${esc(title)}</h3><p>${esc(body)}</p>${retry ? '<button class="secondary" data-action="retry">Try again</button>' : ''}</div>`;
  let toastTimer, pollTimer, freshTimer, sheetSequence = 0, activeMap = null, sheetSource = null, currentDrive=null, routeMarker=null;
  function toast(message) { $('toast').textContent=message; $('toast').classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3200); }

  async function api(path, options={}) {
    const response=await fetch(path,{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(12000),...options});
    if(response.status===401){lock();throw new Error('unauthorized');}
    if(!response.ok) throw new Error(`Request failed (${response.status})`);
    return response.json();
  }
  function connection() {
    const banner=$('connection-banner');
    const failure=state.errors.size>0 || !navigator.onLine;
    banner.classList.toggle('hidden',!failure);
    if(failure) banner.innerHTML=`${!navigator.onLine ? 'You’re offline.' : 'Some data could not be refreshed.'} ${state.lastOk ? `Showing the last successful readings from ${esc(time(state.lastOk))}.` : 'Connect to your home network and try again.'}<button data-action="retry">Retry</button>`;
  }
  async function request(key,path,apply) {
    if(state.busy.has(key)) return state.busy.get(key);
    const generation=state.generation;
    const work=(async()=>{
      try { const data=await api(path); if(generation!==state.generation || !state.authed) return false; apply(data); state.errors.delete(key); return true; }
      catch(error){ if(generation===state.generation && error.message!=='unauthorized'){state.errors.add(key); console.error(`[TeslaMate] ${key}`,error.message);} return false; }
      finally { if(state.busy.get(key)===work)state.busy.delete(key); if(generation===state.generation) connection(); }
    })();
    state.busy.set(key,work); return work;
  }
  async function refreshSummary() {
    return request('summary','/api/summary',data=>{const settingsChanged=JSON.stringify(state.summary?.settings)!==JSON.stringify(data.settings);state.summary=data;state.lastOk=Date.now();renderSummary();if(settingsChanged){renderTotals();renderCharging();renderStats();renderHealth();renderList('drives');renderList('charges');}});
  }
  async function loadSeries() {
    const hours=state.hours;
    const ok=await request(`series-${hours}`,`/api/series?hours=${hours}`,data=>{if(hours===state.hours){state.series=data.series;state.batteryEvents=data.events||[];renderBattery();}});
    if(!ok && !state.series.length) $('battery-chart').innerHTML='<div class="chart-empty">Battery history is unavailable. Try refreshing.</div>';
    return ok;
  }
  async function loadStats(days=state.days) {
    return request(`stats-${days}`,`/api/stats?days=${days}`,data=>{state.stats[days]=data; renderTotals(); if(state.view==='stats') renderStats();});
  }
  async function loadChargingStats() {
    const days=state.chargeDays;
    const ok=await request(`charging-stats-${days}`,`/api/charging-stats?days=${days}`,data=>{if(days===state.chargeDays){state.chargingStats=data;renderCharging();}});
    if(!ok&&!state.chargingStats)$('charge-totals').innerHTML='<p class="summary-empty">Charging totals are unavailable. Refresh to try again.</p>';
    return ok;
  }
  async function loadList(type,more=false) {
    const button=$(`more-${type}`); button.disabled=true;
    if(!state[type]) $(`${type}-list`).innerHTML='<div class="chart-skeleton skeleton" aria-label="Loading history"></div>';
    const chargeDays=state.chargeDays;
    const offset=more ? state[type]?.length || 0 : 0;
    const limit=more ? 25 : Math.max(25,Math.min(100,state[type]?.length || 25));
    const ok=await request(type==='charges'?`charges-${chargeDays}`:type,`/api/${type}?limit=${limit}&offset=${offset}${type==='charges'?'&days='+chargeDays:''}`,data=>{
      if(type==='charges'&&chargeDays!==state.chargeDays)return;
      const items=more ? [...(state[type] || []),...data[type]] : data[type];
      state[type]=[...new Map(items.map(item=>[item.id,item])).values()];
      state.more[type]=data.hasMore; renderList(type);
    });
    if(type==='charges'&&chargeDays!==state.chargeDays)return ok;
    button.disabled=false;
    if(!ok && !state[type]) $(`${type}-list`).innerHTML=empty(type==='drives'?'route':'bolt','History unavailable','Your recorded history is safe. Reconnect and try again.',true);
    return ok;
  }
  const activityKey=item=>`${item.type}-${item.id}`;
  async function loadActivity(more=false) {
    const button=$('more-activity');
    if(more&&!state.activityCursor)return false;
    button.disabled=true;
    const cursor=more?state.activityCursor:null;
    const ok=await request('activity',`/api/activity?limit=25${cursor?'&before='+encodeURIComponent(cursor):''}`,data=>{
      const existing=state.activity||[],keys=new Set(existing.map(activityKey));
      // A refresh merges through an overlap. If more than one page arrived, restart
      // pagination rather than silently leaving a gap in the timeline.
      const overlap=data.items.some(item=>keys.has(activityKey(item)));
      const keep=more||overlap;
      const merged=new Map((keep?existing:[]).map(item=>[activityKey(item),item]));
      data.items.forEach(item=>merged.set(activityKey(item),item));
      state.activity=[...merged.values()].sort((a,b)=>b.sortStamp.localeCompare(a.sortStamp)||b.type.localeCompare(a.type)||b.id-a.id);
      if(more||!overlap||existing.length<=data.items.length){state.activityCursor=data.nextCursor;state.activityMore=data.hasMore;}
      if(!more){state.today=data.today;state.activityAsOf=data.asOf;}
      renderHomeSummary();renderActivity();
    });
    button.disabled=false;
    if(!ok&&!state.activity){
      $('home-summary-body').innerHTML='<p class="summary-empty">Today’s activity is unavailable. Refresh to try again.</p>';
      $('activity-list').innerHTML=empty('activity','Activity unavailable','Reconnect and refresh to load your recorded journeys and charges.',true);
    }
    return ok;
  }
  async function loadView() {
    if(state.view==='now') return Promise.all([refreshSummary(),loadSeries(),loadActivity()]);
    if(state.view==='activity') return Promise.all([refreshSummary(),loadActivity()]);
    if(state.view==='charges')return Promise.all([refreshSummary(),loadList('charges'),loadChargingStats()]);
    if(state.view==='drives') return Promise.all([refreshSummary(),loadList('drives'),loadStats(30)]);
    return Promise.all([refreshSummary(),loadStats(),request('health','/api/health',data=>{state.health=data;renderHealth();})]);
  }
  async function refresh(manual=false) {
    if(!state.authed) return;
    $('refresh').classList.add('refreshing');
    try { const result=await loadView(); if(manual) toast(result.every(Boolean)?'Up to date':'Some data could not be refreshed'); }
    finally { $('refresh').classList.remove('refreshing'); }
  }
  function lock() {
    state.authed=false; state.generation++; state.summary=null; state.drives=null; state.charges=null; state.health=null; state.stats={}; state.series=[]; state.lastOk=0; state.errors.clear(); state.busy.clear();
    state.batteryEvents=[];state.chargingStats=null;
    state.activity=null;state.today=null;state.activityCursor=null;state.activityMore=false;state.activityAsOf=null;
    clearInterval(pollTimer); clearInterval(freshTimer); destroySheet();
    $('boot').classList.add('hidden'); $('shell').classList.add('hidden'); $('login').classList.remove('hidden');
    ['charge-totals','charge-locations','charging-coverage','battery-events','baseline-status','logging-coverage','drive-totals','drives-list','charges-list','stats-grid','health-grid','alltime-grid','battery-chart','health-chart','charging-chart','charging-active','home-menu','desktop-nav','home-summary-body','activity-list','activity-current'].forEach(id=>{$(id).replaceChildren();});
    $('more-activity').classList.add('hidden');set('activity-updated','');
    ['soc','range','odometer','sidebar-odometer','sidebar-range','software-version','live-power','live-added','live-since'].forEach(id=>set(id,'—'));
    set('screen-title','Your Tesla');set('sidebar-name','Your Tesla');set('vehicle-state','Connecting…');set('sidebar-state','TeslaMate');set('freshness','Reading the latest recorded data');set('quick-climate','Climate');
    $('live-charge').classList.add('hidden');$('connection-banner').classList.add('hidden');$('demo-banner').classList.add('hidden');$('battery-fill').style.width='0%';
    $('login-pass').focus();
  }
  function unlock() {
    state.authed=true; state.generation++; $('boot').classList.add('hidden'); $('login').classList.add('hidden'); $('shell').classList.remove('hidden');
    const initial=location.hash.slice(1); state.view=titles[initial]?initial:'now';
    history.replaceState({view:state.view},'',`#${state.view}`); renderNavigation(); showView(state.view,false,false);
    clearInterval(pollTimer); clearInterval(freshTimer);
    pollTimer=setInterval(()=>{if(document.visibilityState==='visible') refresh();},60000);
    freshTimer=setInterval(()=>{if(document.visibilityState==='visible') renderFreshness();},15000);
  }
  async function boot() {
    try { const response=await fetch('/api/session',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error('Session unavailable');const data=await response.json();if(data.authenticated)unlock();else lock(); }
    catch { lock(); $('login-error').textContent='Connect to your home network to unlock your vehicle history.'; }
  }
  $('login-form').addEventListener('submit',async event=>{
    event.preventDefault(); $('login-btn').disabled=true; $('login-btn').textContent='Connecting…'; $('login-error').textContent='';
    try {
      const response=await fetch('/api/login',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({pass:$('login-pass').value}),signal:AbortSignal.timeout(10000)});
      if(response.ok){$('login-pass').value='';unlock();}
      else $('login-error').textContent=response.status===429?'Too many attempts. Please wait 15 minutes.':'That passphrase didn’t match. Try again.';
    } catch { $('login-error').textContent='Cannot reach TeslaMate. Check your home network connection.'; }
    finally { $('login-btn').disabled=false; $('login-btn').textContent='Connect'; }
  });

  function renderNavigation() {
    const s=state.summary, t=s?.telemetry;
    const menu=[
      ['now','car','Vehicle',t?`${temp(t.insideC)} inside · ${temp(t.outsideC)} outside`:'Climate & tyre pressure'],
      ['activity','activity','Activity','Your drives & charging, together'],
      ['drives','route','Drives','Routes, distance & journey history'],
      ['charges','bolt','Charging',s?.charging?.active?`${n(s.charging.powerKw)} kW · Charging`:'Sessions & charging curves'],
      ['stats','chart','Energy','Usage & battery estimates'],
      ['location','pin','Location',s?.location?place(s.location.name,s.location.address):'Last recorded position']
    ];
    const item=([key,symbol,title,subtitle],home=false)=>`<button class="menu-row" ${key==='location'?'data-sheet="location"':key==='now'&&home?'data-sheet="vehicle"':`data-view="${key}"`} ${state.view===key&&!home?'aria-current="page"':''}>${icon(symbol)}<span class="menu-copy"><span class="menu-title">${title}</span><span class="menu-subtitle">${esc(subtitle)}</span></span>${icon('arrow','chevron')}</button>`;
    // Preserve focus when a background poll updates the menu.
    for(const [id,home] of [['desktop-nav',false],['home-menu',true]]) if(!$(id).contains(document.activeElement)) $(id).innerHTML=menu.map(row=>item(row,home)).join('');
  }
  function showView(view,push=true,focus=true) {
    if(!titles[view])return;
    destroySheet(); state.view=view;
    if(push) history.pushState({view},'',`#${view}`);
    Object.keys(titles).forEach(name=>$(`view-${name}`).classList.toggle('hidden',name!==view));
    $('back').classList.toggle('hidden',view==='now'); document.querySelector('.topbar').classList.toggle('has-back',view!=='now');
    set('screen-title',view==='now'?(state.summary?.car?.name || 'Your Tesla'):titles[view]);
    renderNavigation(); window.scrollTo({top:0,behavior:'instant'}); if(focus)$('screen-title').focus({preventScroll:true});
    refresh();
  }
  function renderFreshness() {
    const s=state.summary; if(!s?.car)return;
    const at=s.telemetry?.batteryAt || s.telemetry?.at;
    const stale=ageMinutes(at)>15;
    $('freshness').classList.toggle('stale',stale);
    set('freshness',stale?`Last recorded ${ago(at)}${s.status.state==='asleep'?' · Car asleep':''}`:`Updated ${ago(at)}`);
    $('freshness').title=at?date(at,{dateStyle:'medium',timeStyle:'short'}):'No telemetry recorded';
  }
  function renderSummary() {
    const s=state.summary;
    if(!s?.car){ set('screen-title','Your Tesla'); set('vehicle-state','No car recorded yet'); set('freshness','Your vehicle will appear when TeslaMate starts logging.'); set('soc','—'); set('range','—'); return; }
    const t=s.telemetry, charge=s.charging;
    set('sidebar-name',s.car.name); if(state.view==='now')set('screen-title',s.car.name);
    set('soc',`${n(t?.battery)}${t?.battery!=null?'%':''}`); set('range',t?.rangeKm!=null?`${dist(t.rangeKm)} ${units()}`:'Range not recorded');
    $('battery-fill').style.width=`${Math.max(0,Math.min(100,t?.battery || 0))}%`;
    $('battery-icon').classList.toggle('charging',s.status.state==='charging'); $('battery-icon').classList.toggle('low',t?.battery<20);
    const names={online:'Parked',offline:'Offline',asleep:'Asleep',driving:'Driving',charging:'Charging',unknown:'Status unavailable'};
    const label=names[s.status.state]||'Status unavailable';
    set('vehicle-state',`${label}${charge?.powerKw!=null?' · '+n(charge.powerKw)+' kW':''}`);
    $('vehicle-state').classList.toggle('charging',s.status.state==='charging'); set('sidebar-state',label);
    set('sidebar-range',`${n(t?.battery)}% · ${dist(t?.rangeKm)} ${units()}`);
    set('odometer',`${dist(t?.odometerKm)} ${units()} odometer`); set('sidebar-odometer',`${dist(t?.odometerKm)} ${units()} odometer`);
    set('software-version',s.software?`Software ${s.software.version}`:'Software not recorded');
    set('quick-climate',t?.insideC!=null?`${temp(t.insideC)} inside`:'Climate');
    $('demo-banner').classList.toggle('hidden',!s.demo);
    $('live-charge').classList.toggle('hidden',!charge?.active);
    if(charge?.active){set('live-power',`${n(charge.powerKw)} kW`);set('live-added',charge.addedKwh!=null?`${n(charge.addedKwh,1)} kWh added`:'Energy not recorded');set('live-since',`Since ${time(charge.startedAt)}`);$('live-fill').style.width=`${Math.max(0,Math.min(100,charge.currentLevel||0))}%`;}
    renderFreshness(); renderNavigation(); renderActiveCharge(); renderActivityCurrent(); renderHomeSummary(); renderActivity();
  }
  function renderActiveCharge() {
    const c=state.summary?.charging;
    $('charging-active').innerHTML=c?.active?`<section class="current-charge"><h2>${icon('bolt')}Charging now</h2><div class="metrics-strip">${metric('Power',n(c.powerKw),'kW')}${metric('Added',n(c.addedKwh,1),'kWh')}${metric('Battery',n(c.currentLevel),'%')}</div><div class="progress-track"><span style="width:${Math.max(0,Math.min(100,c.currentLevel||0))}%"></span></div><p class="fine">${esc(c.fast?'DC fast charging':'AC charging')} · Since ${esc(time(c.startedAt))} · Updated ${esc(ago(c.at))}</p></section>`:'';
  }
  function dateKey(iso) {
    const parts=new Intl.DateTimeFormat('en-GB',{timeZone:state.today?.timezone||state.summary?.settings?.timezone||'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(iso));
    const part=type=>parts.find(p=>p.type===type).value;return `${part('year')}-${part('month')}-${part('day')}`;
  }
  function activityDay(iso) {
    const key=dateKey(iso),today=state.today?.date||dateKey(Date.now());
    const yesterday=new Date(today+'T12:00:00Z');yesterday.setUTCDate(yesterday.getUTCDate()-1);
    if(key===today)return 'Today';
    if(key===yesterday.toISOString().slice(0,10))return 'Yesterday';
    return day(iso);
  }
  function activityRow(item,compact=false) {
    const driving=item.type==='drive';
    const value=driving?`${dist(item.distanceKm,1)} ${units()}`:`${n(item.addedKwh,1)} kWh`;
    const subtitle=driving?`${duration(item.durationMin)} · ${batteryChange(item)}`:`${n(item.startLevel)}% → ${n(item.endLevel)}% · ${duration(item.durationMin)}`;
    const location=driving?`${place(item.startPlace,item.startAddress)} → ${place(item.endPlace,item.endAddress)}`:place(item.place,item.address);
    const stamp=compact?`${activityDay(item.end)} · ${time(item.end)}`:time(item.end);
    return `<button class="activity-row ${compact?'latest-row':''}" data-detail="${item.type}" data-id="${item.id}"><span class="activity-symbol ${item.type}">${icon(driving?'route':'bolt')}</span><span class="activity-copy"><span class="activity-kind">${compact?'Latest '+(driving?'drive':'charge'):driving?'Drive':'Charge'}<span class="activity-time">${esc(stamp)}</span></span><span class="activity-value">${esc(value)}<span>${esc(subtitle)}</span></span><span class="activity-address">${esc(location)}</span>${!driving&&item.cost!=null?`<span class="activity-cost">${esc(currency(item.cost))} recorded cost</span>`:''}</span>${icon('arrow','chevron')}</button>`;
  }
  function renderHomeSummary() {
    const host=$('home-summary-body');
    if(host.contains(document.activeElement)||$('sheet').open&&host.children.length)return;
    if(!state.activity)return;
    const t=state.today;
    if(!t){host.innerHTML='<p class="summary-empty">Your day will appear once a vehicle is recorded.</p>';return;}
    const missing=t.distanceSamples<t.drives||t.energySamples<t.charges;
    host.innerHTML=`<div class="today-metrics">${metric('Driven',dist(t.distanceKm,1),units())}${metric('Drive time',duration(t.driveMinutes))}${metric('Added',n(t.addedKwh,1),'kWh')}</div><p class="summary-context">${n(t.drives)} ${t.drives===1?'drive':'drives'} · ${n(t.charges)} ${t.charges===1?'charge':'charges'} completed today${missing?' · Some readings missing':''}</p>${state.activity.length?activityRow(state.activity[0],true):'<p class="summary-empty">Your next completed journey or charge will appear here.</p>'}`;
    host.title=`Sessions completed today in ${t.timezone}. Overnight sessions count on the day they finish.`;
  }
  function renderActivityCurrent() {
    const c=state.summary?.charging,s=state.summary?.status;
    $('activity-current').innerHTML=c?.active?`<button class="activity-live" data-view="charges">${icon('bolt')}<span><strong>Charging now</strong><span>${esc(n(c.powerKw))} kW · ${esc(n(c.addedKwh,1))} kWh added · Since ${esc(time(c.startedAt))}</span></span>${icon('arrow','chevron')}</button>`:s?.state==='driving'?`<div class="activity-live">${icon('route')}<span><strong>Journey in progress</strong><span>Started ${esc(time(s.since))}. Details appear when it finishes.</span></span></div>`:'';
  }
  function renderActivity() {
    const host=$('activity-list');
    if(!state.activity)return;
    if(host.contains(document.activeElement)||$('sheet').open&&host.children.length)return;
    $('more-activity').classList.toggle('hidden',!state.activityMore);
    set('activity-updated',`Newest first · Completed sessions${state.activityAsOf?' · Updated '+time(state.activityAsOf):''}`);
    if(!state.activity.length){host.innerHTML=empty('activity','Your story starts here','Completed drives and charges will appear together, grouped by the day they finished.');return;}
    let previous='';
    host.innerHTML=state.activity.map(item=>{
      const key=dateKey(item.end),heading=key!==previous?`<h2 class="activity-day">${esc(activityDay(item.end))}</h2>`:'';previous=key;
      return heading+activityRow(item);
    }).join('');
  }
  function renderTotals() {
    const s=state.stats[30]; if(!s||!state.summary)return;
    $('drive-totals').innerHTML=metric('Distance · 30 days',dist(s.drives.km,1),units())+metric('Drive time',duration(s.drives.minutes))+metric('Drives',n(s.drives.drives));
  }
  function renderCharging() {
    const c=state.chargingStats;if(!c||!state.summary)return;
    const spend=state.chargeMode==='spend';
    $('charge-totals').innerHTML=`<div class="charge-hero"><span class="hero-label">${spend?'Recorded spend':'Energy added'}</span><div class="hero-number">${esc(spend?currency(c.cost):n(c.addedKwh,1))}${spend?'':'<span>kWh</span>'}</div><p>${n(c.sessions)} ${c.sessions===1?'session':'sessions'} · Last ${c.days} days</p></div><div class="charge-support">${metric(spend?'Energy added':'Recorded spend',spend?n(c.addedKwh,1):currency(c.cost),spend?'kWh':'')}<span class="period-caption">${esc(day(c.from+'T12:00:00Z'))}<br>${esc(day(c.to+'T12:00:00Z'))}</span></div>`;
    const pts=c.daily.map(p=>({x:+new Date(p.day+'T12:00:00Z'),y:spend?p.cost:p.addedKwh,caption:`${day(p.day+'T12:00:00Z')} · ${p.sessions} ${p.sessions===1?'session':'sessions'}${spend&&p.costSamples<p.sessions?' · Partial cost':''}`,label:`${day(p.day+'T12:00:00Z')} · ${spend?currency(p.cost):n(p.addedKwh,1)+' kWh'}`}));
    drawChart('charging-chart',pts,{label:spend?'Daily recorded charging spend':'Daily charging energy',unit:spend?currencyCode():'kWh',formatValue:spend?currency:null,bar:true,min:0,xMin:+new Date(c.from+'T12:00:00Z'),xMax:+new Date(c.to+'T12:00:00Z'),xLabel:x=>date(x,{day:'numeric',month:'short'})});
    $('charging-coverage').textContent=c.costSamples<c.sessions?`Costs recorded for ${c.costSamples} of ${c.sessions} sessions. Missing costs are excluded from spend.`:'Completed sessions · Grouped by the day charging finished';
    $('charge-history-period').textContent=`Last ${c.days} days`;
    $('charge-locations').innerHTML=c.locations.length?c.locations.map(l=>`<div class="charge-place"><div class="place-heading">${icon('bolt')}<h3>${esc(l.name)}</h3><span>${esc(n(l.sessions))} ${l.sessions===1?'session':'sessions'}</span></div><div class="place-values"><strong>${esc(spend?currency(l.cost):n(l.addedKwh,1)+' kWh')}</strong><span>${esc(spend?n(l.addedKwh,1)+' kWh added':currency(l.cost)+' recorded')}</span></div><p>${esc(l.rate!=null?'Current tariff · '+tariff(l):'No tariff recorded')}${l.costSamples<l.sessions?' · Partial cost coverage':''}</p></div>`).join(''):'<p class="summary-empty">Charging locations appear after your first completed session.</p>';
  }

  function renderList(type) {
    const data=state[type]; if(!data||!state.summary)return;
    if($(`${type}-list`).contains(document.activeElement)||$('sheet').open&&$(`${type}-list`).children.length)return;
    $(`more-${type}`).classList.toggle('hidden',!state.more[type]);
    if(!data.length){$(`${type}-list`).innerHTML=empty(type==='drives'?'route':'bolt',type==='drives'?'Your next journey starts here':'Your charging history starts here',type==='drives'?'Completed drives will appear here with their route, distance and time.':'Completed sessions will appear here. An active charge stays at the top until it finishes.');return;}
    let previous='';
    $(`${type}-list`).innerHTML=data.map(item=>{
      const heading=day(item.end), group=heading!==previous?`<h3 class="history-day">${esc(heading)}</h3>`:'';previous=heading;
      const driving=type==='drives';
      const value=driving?`${dist(item.distanceKm,1)} ${units()}`:`${n(item.addedKwh,1)} kWh`;
      const subtitle=driving?`${duration(item.durationMin)} · ${batteryChange(item)}`:`${n(item.startLevel)}% → ${n(item.endLevel)}% · ${duration(item.durationMin)}`;
      const location=driving?`${place(item.startPlace,item.startAddress)} → ${place(item.endPlace,item.endAddress)}`:place(item.place,item.address);
      return `${group}<button class="history-row" data-detail="${driving?'drive':'charge'}" data-id="${item.id}"><span class="history-symbol">${icon(driving?'route':'bolt')}</span><span class="history-main"><span class="history-value">${esc(value)}</span><span class="history-secondary">${esc(subtitle)}</span><span class="history-address" style="display:block">${esc(location)}</span></span><span class="history-meta">${esc(time(item.start))}${!driving&&item.cost!=null?`<br>${esc(currency(item.cost))}`:''}${icon('arrow','chevron')}</span></button>`;
    }).join('');
  }
  function renderStats() {
    const s=state.stats[state.days]; if(!s||!state.summary)return;
    $('stats-grid').innerHTML=metric('Distance',dist(s.drives.km,1),units())+metric('Drive time',duration(s.drives.minutes))+metric('Drives',n(s.drives.drives))+metric('Energy added',n(s.charging.kwh,1),'kWh')+metric('Recorded cost',currency(s.charging.cost),'',s.charging.cost_samples<s.charging.sessions?'Some costs not recorded':'')+metric('Charging sessions',n(s.charging.sessions));
    const a=s.allTime;
    $('alltime-grid').innerHTML=metric('Distance',dist(a.km,1),units())+metric('Energy added',n(a.kwh,1),'kWh')+metric('Recorded cost',currency(a.cost))+metric('Drives',n(a.drives))+metric('Charging sessions',n(a.sessions))+metric('Odometer',dist(a.odometer_km),units());
    renderHealth();
  }
  function renderHealth() {
    const h=state.health;if(!h||!state.summary)return;
    const history=h.historyDays<1?`${n(h.historyDays*24)} hours`:`${n(h.historyDays)} days`;
    $('baseline-status').innerHTML=`<div class="baseline-heading">${icon('battery')}<div><span class="eyebrow">BATTERY INSIGHTS</span><h2>${h.baselineReady?'Your longer-term picture':'Building your baseline'}</h2></div></div><p>${h.baselineReady?'Follow recorded estimates over time. Short-term changes do not measure degradation.':'More driving and charging will give these estimates useful context. Your first readings are available below.'}</p><div class="baseline-facts"><span>${esc(history)} of history</span><span>${n(h.capacitySamples)} ${h.capacitySamples===1?'charge sampled':'charges sampled'}</span></div><p class="consumption-status">${h.consumptionReady?'TeslaMate consumption calibration is available.':'Consumption estimates are still being established by TeslaMate.'}</p>`;
    $('logging-coverage').textContent=h.firstReading?`Recording since ${day(h.firstReading)} · ${history} of history`:'Waiting for the first recorded reading';
    $('health-grid').innerHTML=metric('Estimated full rated range',dist(h.fullRangeKm),units())+metric('Inferred capacity',n(h.capacityKwh,1),'kWh')+metric('Added / used energy',n(h.chargeEfficiencyPct,1),'%')+metric('Charges sampled',n(h.capacitySamples));
    drawChart('health-chart',(h.trend||[]).map(p=>({x:+new Date(p.at),y:distance(p.fullRangeKm),label:`${day(p.at)} · ${dist(p.fullRangeKm,1)} ${units()}`})),{label:'Estimated full rated range over time',unit:units(),xLabel:x=>date(x,{day:'numeric',month:'short'})});
  }
  function renderBattery() {
    const events=state.batteryEvents.map(e=>({...e,start:+new Date(e.start),end:e.end?+new Date(e.end):null}));
    drawChart('battery-chart',state.series.map(p=>({x:+new Date(p.at),y:p.level,breakBefore:p.breakBefore,label:`${day(p.at)} ${time(p.at)} · ${n(p.level)}%`})),{label:`Battery level over ${state.hours===24?'24 hours':'7 days'}`,unit:'%',min:0,max:100,step:true,windowHours:state.hours,events,xLabel:x=>state.hours===24?time(x):date(x,{day:'numeric',month:'short'})});
    $('battery-events').innerHTML=`<div class="chart-legend"><span class="legend-drive">Driving</span><span class="legend-charge">Charging</span><span>Recorded readings</span></div>${state.batteryEvents.filter(e=>e.end).slice(0,3).map(e=>`<button class="event-chip" data-detail="${e.type}" data-id="${e.id}">${icon(e.type==='drive'?'route':'bolt')}<span>${e.type==='drive'?'Drive':'Charge'} · ${esc(time(e.start))}</span></button>`).join('')}`;
  }
  function drawChart(id,input,options) {
    window.TeslaCharts.render($(id),input,options,{number:n});
  }

  function destroySheet() {
    sheetSequence++; currentDrive=null;routeMarker=null;$('sheet').classList.remove('journey-sheet','charge-sheet'); if(activeMap){activeMap.remove();activeMap=null;}
    const wasOpen=$('sheet').open;
    if(wasOpen)$('sheet').close(); $('sheet-body').replaceChildren(); document.body.style.overflow='';
    if(wasOpen&&state.authed&&!sheetSource?.classList.contains('activity-row')){renderHomeSummary();renderActivity();}
  }
  function openSheet(title,body,push=true) {
    if(!$('sheet').open){sheetSource=document.activeElement;if(push)history.pushState({view:state.view,sheet:true},'',location.hash);}
    if(activeMap){activeMap.remove();activeMap=null;}
    currentDrive=null;routeMarker=null;$('sheet').classList.remove('journey-sheet','charge-sheet');
    const seq=++sheetSequence; $('sheet-title').textContent=title;$('sheet-body').innerHTML=body;
    if(!$('sheet').open)$('sheet').showModal(); document.body.style.overflow='hidden'; $('sheet-body').scrollTop=0;$('sheet-close').focus();return seq;
  }
  function closeSheet() { if(history.state?.sheet)history.back();else{destroySheet();sheetSource?.focus();} }
  function showSettings() {
    openSheet('Preferences',`${window.TeslaAppearance.settingsHTML()}<div class="setting-row"><label for="distance-units">Distance & speed</label><select id="distance-units"><option value="mi" ${units()==='mi'?'selected':''}>Miles · mph</option><option value="km" ${units()==='km'?'selected':''}>Kilometres · km/h</option></select></div><div class="setting-row"><span>Currency</span><span>${esc(currencyCode())}</span></div><p class="settings-note">Currency follows this installation. Prices are not converted.</p><p class="settings-note">Saved on this device. Temperatures and tyre pressure follow your TeslaMate settings.</p><button class="secondary" data-action="retry">${icon('refresh')} &nbsp; Refresh all readings</button><button class="secondary" data-action="install" id="install-button" ${installPrompt?'':'hidden'}>Install Mate4Mobile</button><p class="settings-note">Mate4Mobile displays recorded data without waking your car. Vehicle controls remain in the Tesla app.</p><button class="secondary" data-action="logout">${icon('lock')} &nbsp; Lock this device</button><p class="fine" style="margin-top:24px">Mate4Mobile 2.4.2 · Independent companion<br>Vehicle imagery © Tesla. Not affiliated with Tesla or TeslaMate.</p>`);
    window.TeslaAppearance.mount();
  }
  function showVehicle() {
    const s=state.summary;if(!s?.telemetry){openSheet('Vehicle',empty('car','No readings yet','Vehicle information appears once TeslaMate records it.'));return;}
    const t=s.telemetry,v=s.vitals,press=v?.tpms;
    const pressure=value=>value==null?'—':`${n(press.unit==='psi'?value*14.5038:value,press.unit==='psi'?0:1)} ${press.unit}`;
    openSheet('Vehicle',`<p>Last recorded ${esc(ago(t.at))}</p><div class="metrics-strip">${metric('Inside',temp(t.insideC))}${metric('Outside',temp(t.outsideC))}${metric('Climate',v?.climate?.on?'On':'Off')}</div><h3>Tyre pressure</h3><div class="tyres">${[['Front left',press?.fl],['Front right',press?.fr],['Rear left',press?.rl],['Rear right',press?.rr]].map(([label,value])=>`<div><strong>${esc(pressure(value))}</strong><span>${label}</span></div>`).join('')}</div>${rows([['Battery',`${n(t.battery)}%`],['Usable battery',t.usableBattery==null?'—':`${n(t.usableBattery)}%`],['Odometer',`${dist(t.odometerKm)} ${units()}`],['Asleep · last 24 hours',duration(s.day?.asleep)],['Online · last 24 hours',duration(s.day?.online)],['Offline · last 24 hours',duration(s.day?.offline)],['Software',s.software?.version]])}`);
  }
  let leafletPromise;
  function loadLeaflet() {
    if(window.L)return Promise.resolve(window.L);
    if(!leafletPromise)leafletPromise=new Promise((resolve,reject)=>{
      const css=document.createElement('link');css.rel='stylesheet';css.href='/vendor/leaflet.css';document.head.append(css);
      const script=document.createElement('script');script.src='/vendor/leaflet.js';script.onload=()=>resolve(window.L);script.onerror=()=>{leafletPromise=null;script.remove();reject(new Error('Map library unavailable'));};document.head.append(script);
    });return leafletPromise;
  }
  async function mapRoute(route,seq,single=false) {
    try {
      const L=await loadLeaflet();if(seq!==sheetSequence||!$('map-frame'))return;
      const motion=!matchMedia('(prefers-reduced-motion: reduce)').matches;
      activeMap=L.map('map-frame',{zoomControl:true,scrollWheelZoom:false,zoomAnimation:motion,fadeAnimation:motion});
      const map=activeMap;
      const tile=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'}).addTo(map);
      tile.on('tileerror',()=>{if(seq===sheetSequence&&$('map-message')){$('map-message').textContent='Map tiles are unavailable. Your recorded position or route is still shown.';$('map-message').classList.remove('hidden');}});
      const line=L.polyline(route,{color:'#69d590',weight:4}).addTo(map);
      L.circleMarker(route[0],{radius:5,color:'#fff',fillColor:'#5ac77e',fillOpacity:1,weight:2}).addTo(map);
      if(route.length>1)L.circleMarker(route.at(-1),{radius:5,color:'#fff',fillColor:'#3e6ae1',fillOpacity:1,weight:2}).addTo(map);
      if(currentDrive)routeMarker=L.circleMarker(route.at(-1),{radius:7,color:'#fff',fillColor:'#3e6ae1',fillOpacity:1,weight:3}).addTo(map);
      if(single||route.length===1)map.setView(route[0],15);else map.fitBounds(line.getBounds(),{padding:[25,25],maxZoom:16});
      setTimeout(()=>{if(seq===sheetSequence)map.invalidateSize();},360);
    }catch {if(seq===sheetSequence&&$('map-frame'))$('map-frame').innerHTML=empty('pin','Map unavailable','The recorded details are shown below.');}
  }
  const mapMarkup=()=>'<div class="map"><div id="map-frame" class="map-frame" role="region" aria-label="Recorded location map"></div></div><p id="map-message" class="map-message hidden"></p>';
  function showLocation() {
    const l=state.summary?.location;if(!l){openSheet('Location',empty('pin','No location recorded','Your car’s last recorded position will appear here.'));return;}
    const seq=openSheet('Location',mapMarkup()+`<h3>${esc(place(l.name,l.address))}</h3><p>Last seen ${esc(ago(l.at))}</p>${rows([['Latitude',n(l.lat,5)],['Longitude',n(l.lng,5)],['Recorded',date(l.at,{dateStyle:'medium',timeStyle:'short'})]])}<a class="map-link" target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query=${l.lat},${l.lng}">Open in Maps</a>`);
    mapRoute([[l.lat,l.lng]],seq,true);
  }
  const disclosure=(title,body)=>`<details class="disclosure"><summary>${esc(title)}</summary>${body}</details>`;
  function batteryRail(d) {
    return `<div class="soc-transition"><div><span>Battery</span><strong>${esc(batteryChange(d))}</strong></div><div class="soc-track"><span style="width:${Math.max(0,Math.min(100,d.startLevel||0))}%"></span><span style="width:${Math.max(0,Math.min(100,d.endLevel||0))}%"></span></div></div>`;
  }
  function renderJourneyChart(mode='speed') {
    const d=currentDrive;if(!d)return;
    const config={speed:{key:'speedKmh',unit:units()==='mi'?'mph':'km/h',label:'Journey speed',min:0},power:{key:'powerKw',unit:'kW',label:'Journey power'},battery:{key:'level',unit:'%',label:'Journey battery',min:0,max:100}}[mode];
    const points=(d.telemetry||[]).map(p=>({x:+new Date(p.at),y:mode==='speed'?distance(p[config.key]):p[config.key],breakBefore:p.breakBefore,lat:p.lat,lng:p.lng,caption:`${time(p.at)}${mode==='power'&&p.powerKw<0?' · Regeneration':''}`,label:`${time(p.at)} · ${n(mode==='speed'?distance(p[config.key]):p[config.key])} ${config.unit}`}));
    $('journey-chart').dataset.mode=mode;
    drawChart('journey-chart',points,{...config,selectionKey:'journey',digits:0,step:mode==='battery',xLabel:time,onInspect:p=>{if(routeMarker&&Number.isFinite(p.lat)&&Number.isFinite(p.lng))routeMarker.setLatLng([p.lat,p.lng]);}});
    $('journey-chart-note').textContent=mode==='power'?'Negative power shows regeneration. Drag to follow your route.':mode==='battery'?'Recorded battery percentage, from departure to arrival.':'Drag the chart to follow your position along the route.';
  }
  async function showDetail(type,id) {
    const seq=openSheet(type==='drive'?'Journey':'Charging session','<div class="chart-skeleton skeleton" aria-label="Loading details"></div>');
    try {
      const d=await api(`/api/${type==='drive'?'drives':'charges'}/${id}`);if(seq!==sheetSequence)return;
      if(type==='drive') {
        currentDrive=d;$('sheet').classList.add('journey-sheet');
        $('sheet-body').innerHTML=`<div class="journey-heading"><p class="session-date">${esc(day(d.start))} · ${esc(time(d.start))}–${esc(time(d.end))}</p><div class="journey-places"><span>${esc(place(d.startPlace,d.startAddress))}</span>${icon('arrow')}<strong>${esc(place(d.endPlace,d.endAddress))}</strong></div></div><div class="journey-layout"><div class="journey-map">${d.route.length?mapMarkup():empty('pin','Route not recorded','The journey readings are shown alongside.')}</div><div class="journey-analysis"><div class="metrics-strip journey-metrics">${metric('Distance',dist(d.distanceKm,1),units())}${metric('Duration',duration(d.durationMin))}${metric(socUsed(d)<0?'Battery gained':'Battery used',n(socUsed(d)==null?null:Math.abs(socUsed(d))),'%')}</div>${batteryRail(d)}<div class="segmented journey-tabs" aria-label="Journey chart"><button data-journey-chart="speed" aria-pressed="true">Speed</button><button data-journey-chart="power" aria-pressed="false">Power</button><button data-journey-chart="battery" aria-pressed="false">Battery</button></div><div id="journey-chart" class="chart-host"></div><p id="journey-chart-note" class="fine"></p></div><div class="journey-more">${disclosure('More journey details',rows([['Average speed',`${dist(d.avgSpeedKmh)} ${units()==='mi'?'mph':'km/h'}`],['Maximum speed',`${dist(d.speedMax)} ${units()==='mi'?'mph':'km/h'}`],['Peak power',d.powerMax==null?'—':`${n(d.powerMax)} kW`],['Ascent',d.ascent==null?'—':`${n(units()==='mi'?d.ascent*3.28084:d.ascent)} ${units()==='mi'?'ft':'m'}`],['Descent',d.descent==null?'—':`${n(units()==='mi'?d.descent*3.28084:d.descent)} ${units()==='mi'?'ft':'m'}`],['Outside',temp(d.outsideC)],['Odometer',`${dist(d.endKm)} ${units()}`]]))}${disclosure('Addresses & times',rows([['From',d.startAddress||'Location not recorded'],['To',d.endAddress||'Location not recorded'],['Started',`${day(d.start)} · ${time(d.start)}`],['Arrived',`${day(d.end)} · ${time(d.end)}`]]))}</div></div>`;
        renderJourneyChart();if(d.route.length)mapRoute(d.route,seq);
      } else {
        $('sheet').classList.add('charge-sheet');
        $('sheet-body').innerHTML=`<div class="session-heading"><span class="session-icon">${icon('bolt')}</span><div><h3>${esc(place(d.place,d.address))}</h3><p class="session-date">${esc(day(d.start))} · ${esc(time(d.start))}–${esc(time(d.end))}</p></div></div><div class="metrics-strip charge-metrics">${metric('Energy added',n(d.addedKwh,1),'kWh')}${metric('Recorded cost',currency(d.cost))}${metric('Duration',duration(d.durationMin))}</div>${batteryRail(d)}<div class="section-head"><h3>Charging power</h3><span class="muted">${d.fast==null?'Recorded session':d.fast?'DC fast charging':'AC charging'}</span></div><div id="curve-chart" class="chart-host"></div><div class="energy-comparison"><div><span>Added to battery</span><strong>${esc(n(d.addedKwh,1))} kWh</strong></div><div><span>Recorded energy used</span><strong>${esc(n(d.usedKwh,1))} kWh</strong></div><p>Energy used is recorded by TeslaMate. It is not a separate wall-meter reading.</p></div>${disclosure('Session details',rows([['Average power',d.avgPowerKw==null?'—':`${n(d.avgPowerKw,1)} kW`],['Peak power',d.maxPowerKw==null?'—':`${n(d.maxPowerKw)} kW`],['Added / used energy',d.efficiencyPct==null?'—':`${n(d.efficiencyPct,1)}%`],['Current location tariff',tariff(d)],['Location',d.address||'Location not recorded'],['Started',`${day(d.start)} · ${time(d.start)}`],['Ended',`${day(d.end)} · ${time(d.end)}`]]))}`;
        drawChart('curve-chart',d.curve.map(p=>({x:+new Date(p.at),y:p.powerKw,caption:`${time(p.at)} · ${n(p.level)}% battery`,label:`${time(p.at)} · ${n(p.powerKw)} kW · ${n(p.level)}%`})),{label:'Charging power over time',unit:'kW',min:0,xLabel:time});
      }
    }catch(error){if(seq===sheetSequence)$('sheet-body').innerHTML=empty('info','Details unavailable','Reconnect and open this session again.');}
  }

  document.addEventListener('click',async event=>{
    const button=event.target.closest('button');if(!button)return;
    if(button.dataset.view){showView(button.dataset.view);return;}
    if(button.dataset.detail){showDetail(button.dataset.detail,button.dataset.id);return;}
    if(button.dataset.sheet){const actions={settings:showSettings,vehicle:showVehicle,location:showLocation,estimates:()=>openSheet('About these estimates','<p>Rated range is extrapolated from recorded battery percentage. The chart uses each day’s median estimate. Weather, calibration and rounding affect it.</p><p>Usable capacity is the median energy added per percentage gained, using completed charges that add more than 1 kWh and 5 percentage points. Charge efficiency compares energy added with recorded energy used.</p><p>Short-term changes are not evidence of battery degradation. These estimates are useful for following longer-term patterns, not measuring battery health.</p>')};actions[button.dataset.sheet]?.();return;}
    if(button.dataset.journeyChart){document.querySelectorAll('[data-journey-chart]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));renderJourneyChart(button.dataset.journeyChart);return;}
    if(button.dataset.chargeMode){state.chargeMode=button.dataset.chargeMode;document.querySelectorAll('[data-charge-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));renderCharging();return;}
    if(button.dataset.chargeDays){state.chargeDays=Number(button.dataset.chargeDays);state.charges=null;state.chargingStats=null;document.querySelectorAll('[data-charge-days]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));$('charge-totals').innerHTML='<div class="chart-skeleton skeleton"></div>';$('charging-chart').replaceChildren();$('charge-locations').replaceChildren();$('charging-coverage').textContent='';$('charge-history-period').textContent=`Last ${state.chargeDays} days`;$('more-charges').classList.add('hidden');loadChargingStats();loadList('charges');return;}
    if(button.dataset.hours){state.hours=Number(button.dataset.hours);document.querySelectorAll('[data-hours]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.hours)===state.hours)));loadSeries();return;}
    if(button.dataset.days){state.days=Number(button.dataset.days);document.querySelectorAll('[data-days]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.days)===state.days)));loadStats();return;}
    if(button.dataset.action==='retry'){refresh(true);return;}
    if(button.dataset.action==='install'&&installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;button.hidden=true;return;}
    if(button.dataset.action==='logout') {
      button.disabled=true;
      try {await api('/api/logout',{method:'POST'});if('caches'in window){const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('tm-mobile')).map(async key=>{const cache=await caches.open(key);const requests=await cache.keys();await Promise.all(requests.filter(r=>new URL(r.url).pathname.startsWith('/api/')).map(r=>cache.delete(r)));}));}lock();}
      catch {button.disabled=false;toast('Connect to TeslaMate to lock this device securely.');}
    }
  });
  document.addEventListener('change',event=>{
    if(event.target.id==='distance-units'){state.units=event.target.value;save('tm_units',state.units);renderSummary();renderTotals();renderCharging();renderStats();renderHealth();renderList('drives');renderList('charges');toast(`Distances shown in ${units()==='mi'?'miles':'kilometres'}`);}
  });
  $('refresh').addEventListener('click',()=>refresh(true));
  $('back').addEventListener('click',()=>showView('now'));
  $('more-drives').addEventListener('click',()=>loadList('drives',true));
  $('more-charges').addEventListener('click',()=>loadList('charges',true));
  $('more-activity').addEventListener('click',()=>loadActivity(true));
  $('sheet-close').addEventListener('click',closeSheet);
  $('sheet').addEventListener('cancel',event=>{event.preventDefault();closeSheet();});
  $('sheet').addEventListener('click',event=>{if(event.target===$('sheet')){const box=$('sheet').getBoundingClientRect();if(event.clientY<box.top||event.clientX<box.left||event.clientX>box.right)closeSheet();}});
  window.addEventListener('popstate',event=>{destroySheet();if(event.state?.view&&event.state.view!==state.view)showView(event.state.view,false);else sheetSource?.focus();});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&state.authed)refresh();});
  window.addEventListener('online',()=>{connection();if(state.authed)refresh();});window.addEventListener('offline',connection);
  // Pull down from the sheet header. Scrolling the details never dismisses it.
  let dragStart=null;
  document.querySelector('.sheet-head').addEventListener('pointerdown',event=>{if(event.pointerType==='touch'&&!event.target.closest('button')){dragStart=event.clientY;event.currentTarget.setPointerCapture(event.pointerId);}});
  document.querySelector('.sheet-head').addEventListener('pointermove',event=>{if(dragStart!=null)$('sheet').style.transform=`translateY(${Math.max(0,event.clientY-dragStart)}px)`;});
  document.querySelector('.sheet-head').addEventListener('pointerup',event=>{if(dragStart!=null&&event.clientY-dragStart>80)closeSheet();dragStart=null;$('sheet').style.transform='';});
  document.querySelector('.sheet-head').addEventListener('pointercancel',()=>{dragStart=null;$('sheet').style.transform='';});
  // Pull to refresh from the top of a mobile page, keeping maps and charts independent.
  let pullStart=null;
  $('main').addEventListener('touchstart',event=>{if(window.scrollY===0&&!event.target.closest('input,button,a,.map,.chart-host'))pullStart=event.touches[0].clientY;},{passive:true});
  $('main').addEventListener('touchend',event=>{if(pullStart!=null&&event.changedTouches[0].clientY-pullStart>110)refresh(true);pullStart=null;},{passive:true});
  let installPrompt=null;
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;if($('install-button'))$('install-button').hidden=false;});
  if('serviceWorker'in navigator && (location.protocol==='https:'||location.hostname==='localhost')) {
    let reloading=false;
    navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!reloading&&navigator.serviceWorker.controller){reloading=true;location.reload();}});
    navigator.serviceWorker.register('/sw.js').catch(error=>console.warn('Offline shell unavailable:',error.message));
  }
  boot();
})();
