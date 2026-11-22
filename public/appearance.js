'use strict';
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./vehicle-catalog.js'));
  else root.TeslaAppearance = factory(root.TeslaVehicleCatalog);
})(globalThis, function (models) {
  const DEFAULT = {model: 'm3-refresh', paint: 'PBSB'};
  const KEY = 'tm_appearance';
  const findModel = id => models.find(model => model.id === id);
  function resolve(value) {
    const model = findModel(value?.model) || findModel(DEFAULT.model);
    const paint = model.paints.find(paint => paint.code === value?.paint) || model.paints.find(paint => paint.code === DEFAULT.paint) || model.paints[0];
    return {model: model.id, paint: paint.code};
  }
  function parse(value) { try { return resolve(JSON.parse(value)); } catch { return resolve(DEFAULT); } }
  function details(value) {
    const selection = resolve(value), model = findModel(selection.model);
    return {model, paint: model.paints.find(paint => paint.code === selection.paint)};
  }
  const families = {PBSB:'black',PX02:'black',PPSW:'white',PMNG:'grey',PN01:'grey',PPSB:'blue',PB00:'blue',PPMR:'red',PR01:'red',PN00:'silver',PN02:'silver'};
  function changeModel(value, id) {
    const current = details(value), model = findModel(id) || current.model;
    const paint = model.paints.find(paint => paint.code === current.paint.code) || model.paints.find(paint => families[paint.code] === families[current.paint.code]);
    return resolve({model: model.id, paint: paint?.code});
  }
  const api = {models, DEFAULT, resolve, parse, details, changeModel};
  if (typeof document === 'undefined') return api;

  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let selection; try { selection = parse(localStorage.getItem(KEY)); } catch { selection = resolve(DEFAULT); }
  let committed = selection, sequence = 0, loading = false;
  let status = 'Saved on this device.';
  function imageMarkup() {
    const {model, paint} = details(committed);
    return `<div class="car-art appearance-preview" style="--car-width:${model.crop.width}%;--car-left:${model.crop.left}%;--car-top:${model.crop.top}%"><img data-vehicle-image src="${esc(paint.src)}" alt="${esc(paint.label+' '+model.label)}" width="1440" height="810"></div>`;
  }
  function swatches() {
    const {model} = details(selection);
    return model.paints.map(paint => `<button class="paint-swatch" type="button" data-vehicle-paint="${esc(paint.code)}" aria-label="${esc(paint.label)}" aria-pressed="${paint.code===selection.paint}" title="${esc(paint.label)}"><span style="--paint:${esc(paint.hex)}"></span></button>`).join('');
  }
  function settingsHTML() {
    return `<section class="appearance-settings" aria-labelledby="appearance-heading"><h3 id="appearance-heading">Vehicle appearance</h3>${imageMarkup()}<div class="setting-row"><label for="vehicle-model">Model & generation</label><select id="vehicle-model">${models.map(model=>`<option value="${esc(model.id)}" ${model.id===selection.model?'selected':''}>${esc(model.model+' · '+model.generation.split(' · ').pop())}</option>`).join('')}</select><span id="vehicle-generation" class="fine">${esc(details(selection).model.label)}</span></div><div class="paint-heading"><span id="paint-heading">Paint</span><span id="paint-name">${esc(details(selection).paint.label)}</span></div><div id="paint-swatches" class="paint-swatches" role="group" aria-labelledby="paint-heading">${swatches()}</div><p id="appearance-status" class="fine" role="status">${esc(status)}</p><p class="fine appearance-note">Choose the look shown in your dashboard. Year ranges are a guide; designs vary by market. Your recorded vehicle data stays the same.</p><button class="text-button" data-appearance-reset>Reset appearance</button></section>`;
  }
  function mount(rebuild=false) {
    const select = document.getElementById('vehicle-model');
    if (!select) return;
    select.value = selection.model;
    document.getElementById('vehicle-generation').textContent = details(selection).model.label;
    if(rebuild) document.getElementById('paint-swatches').innerHTML = swatches();
    document.querySelectorAll('[data-vehicle-paint]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.vehiclePaint===selection.paint)));
    document.getElementById('paint-name').textContent = details(selection).paint.label;
    document.getElementById('appearance-status').textContent = status;
    document.querySelector('.appearance-settings').setAttribute('aria-busy',String(loading));
  }
  function applyImages(value) {
    const {model, paint} = details(value);
    document.querySelectorAll('[data-vehicle-image]').forEach(img => {
      const frame = img.closest('.car-art');
      frame.style.setProperty('--car-width',model.crop.width+'%');
      frame.style.setProperty('--car-left',model.crop.left+'%');
      frame.style.setProperty('--car-top',model.crop.top+'%');
      img.src = paint.src;
      img.alt = paint.label+' '+model.label;
      img.classList.remove('image-unavailable');
    });
    document.querySelectorAll('[data-vehicle-wordmark]').forEach(el => { el.textContent=model.model.toUpperCase(); });
  }
  function preload(src) {
    return new Promise((accept,reject) => {
      const image = new Image();
      const timer = setTimeout(()=>reject(new Error('timeout')),12000);
      image.onload = () => {clearTimeout(timer);accept();};
      image.onerror = () => {clearTimeout(timer);reject(new Error('image unavailable'));};
      image.src = src;
    });
  }
  async function choose(value, persist=true) {
    const ticket = ++sequence, previous = committed;
    const rebuild = selection.model !== value.model;
    selection = resolve(value); loading = true; status = 'Loading preview…'; mount(rebuild);
    document.querySelectorAll('.car-art').forEach(el=>el.classList.add('vehicle-loading'));
    try {
      await preload(details(selection).paint.src);
      if(ticket!==sequence) return;
      committed = selection; applyImages(committed);
      status = 'Saved on this device.';
      if(persist) {
        try {localStorage.setItem(KEY,JSON.stringify(committed));}
        catch {status = 'Applied for this visit. Device storage is unavailable.';}
      }
    } catch {
      if(ticket!==sequence) return;
      selection = previous;
      status = 'Image unavailable. Reconnect and try again.';
      if(!persist) {
        // Do not silently show a different model when a saved image is unavailable offline.
        document.querySelectorAll('[data-vehicle-image]').forEach(img=>{img.classList.add('image-unavailable');img.alt='Saved vehicle image unavailable';});
      }
    } finally {
      if(ticket===sequence) {
        loading = false; mount(selection.model!==value.model);
        document.querySelectorAll('.car-art').forEach(el=>el.classList.remove('vehicle-loading'));
      }
    }
  }
  document.addEventListener('change',event=>{
    if(event.target.id==='vehicle-model') choose(changeModel(selection,event.target.value));
  });
  document.addEventListener('click',event=>{
    const paint=event.target.closest('[data-vehicle-paint]');
    if(paint) choose({...selection,paint:paint.dataset.vehiclePaint});
    if(event.target.closest('[data-appearance-reset]')) choose(DEFAULT);
  });
  // Retry a saved image after reconnecting, without changing the saved choice.
  window.addEventListener('online',()=>choose(committed,false));
  choose(selection,false);
  return {...api,settingsHTML,mount};
});
