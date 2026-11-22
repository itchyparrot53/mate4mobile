'use strict';
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;else root.TeslaCharts=api;
})(globalThis,function(){
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function nearestIndex(points,value) {
    if(!points.length)return -1;
    let lo=0,hi=points.length-1;
    while(lo<hi){const mid=Math.floor((lo+hi)/2);if(points[mid].x<value)lo=mid+1;else hi=mid;}
    return lo>0&&Math.abs(points[lo-1].x-value)<=Math.abs(points[lo].x-value)?lo-1:lo;
  }
  function layout(input,options={},now=Date.now()) {
    let missing=false;
    let points=input.filter(p=>Number.isFinite(p.x)).sort((a,b)=>a.x-b.x).flatMap(p=>{if(!Number.isFinite(p.y)){missing=true;return [];}const point={...p,breakBefore:!!p.breakBefore||missing};missing=false;return [point];});
    const W=440,H=180,L=39,R=13,T=13,B=30;
    const xMax=options.xMax??(options.windowHours?now:points.at(-1)?.x);
    const xMin=options.xMin??(options.windowHours?xMax-options.windowHours*3600000:points[0]?.x);
    if(options.windowHours)points=points.filter(p=>p.x>=xMin&&p.x<=xMax);
    const lowest=points.length?Math.min(...points.map(p=>p.y)):0,highest=points.length?Math.max(...points.map(p=>p.y)):1;
    const padding=Math.max(1,(highest-lowest)*.05);
    const min=options.min??Math.floor(lowest-padding);
    const max=Math.max(min+1,options.max??Math.ceil(highest+padding));
    const inset=options.bar?10:0;
    const left=L+inset,right=W-R-inset;
    const x=value=>xMin===xMax?(left+right)/2:left+(value-xMin)/Math.max(1,xMax-xMin)*(right-left);
    const y=value=>H-B-(value-min)/(max-min)*(H-T-B);
    const coords=points.map(p=>({x:x(p.x),y:y(p.y)}));
    return {points,coords,W,H,L,R,T,B,min,max,xMin,xMax,x,y,left,right};
  }
  function render(host,input,options,format) {
    if(!host||host.contains(document.activeElement)||host.dataset.dragging==='true')return;
    const plot=layout(input,options),{points:pts,coords,W,H,L,R,T,B,min,max,xMin,xMax,x}=plot;
    if(!pts.length){host.innerHTML='<div class="chart-empty">No readings for this period yet.</div>';return;}
    const {number:n}=format;
    const previous=host.dataset.chartPinned==='true'&&host.dataset.chartKey===(options.selectionKey||options.label)?Number(host.dataset.chartTime):NaN;
    let selected=Number.isFinite(previous)?nearestIndex(pts,previous):pts.length-1;
    host.dataset.chartKey=options.selectionKey||options.label;
    const line=coords.map((p,i)=>i===0||pts[i].breakBefore||(options.gap&&pts[i].x-pts[i-1].x>options.gap)?`M${p.x},${p.y}`:options.step?`H${p.x}V${p.y}`:`L${p.x},${p.y}`).join(' ');
    const bands=(options.events||[]).filter(e=>e.start<xMax&&(e.end??xMax)>xMin).map(e=>`<rect class="chart-event ${e.type}" x="${x(Math.max(xMin,e.start))}" y="${T}" width="${Math.max(2,x(Math.min(xMax,e.end??xMax))-x(Math.max(xMin,e.start)))}" height="${H-T-B}"><title>${esc(e.type==='drive'?'Driving':'Charging')}</title></rect>`).join('');
    const zero=min<0&&max>0?`<line class="chart-zero" x1="${L}" x2="${W-R}" y1="${plot.y(0)}" y2="${plot.y(0)}"/>`:'';
    const grid=[0,.5,1].map(f=>{const yy=T+f*(H-T-B);return `<line class="chart-grid" x1="${L}" x2="${W-R}" y1="${yy}" y2="${yy}"/><text class="chart-axis" x="${L-8}" y="${yy+4}" text-anchor="end">${n(max-f*(max-min))}</text>`;}).join('');
    const ticks=xMin===xMax?[xMin]:[xMin,(xMin+xMax)/2,xMax];
    const axis=ticks.map((v,i)=>`<text class="chart-axis" x="${x(v)}" y="${H-5}" text-anchor="${ticks.length===1?'middle':i===0?'start':i===ticks.length-1?'end':'middle'}">${esc(options.xLabel(v))}</text>`).join('');
    const barWidth=Math.min(18,Math.max(4,(W-L-R)/(coords.length*1.8)));
    const shape=options.bar?coords.map(p=>`<rect class="chart-bar" x="${p.x-barWidth/2}" y="${p.y}" width="${barWidth}" height="${Math.max(0,H-B-p.y)}" rx="2"/>`).join(''):`<path class="chart-line" d="${line}"/>${(pts.length<30?coords:[]).map(p=>`<circle class="chart-point" cx="${p.x}" cy="${p.y}" r="${pts.length===1?4:2}"/>`).join('')}`;
    host.innerHTML=`<div class="chart-readout"><output><strong></strong><span></span></output></div><svg class="touch-chart ${options.bar?'bar-chart':''}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(options.label)} (${esc(options.unit)})"><title>${esc(options.label)}</title>${bands}${grid}${zero}${shape}${axis}<g class="chart-marker" aria-hidden="true"><line y1="${T}" y2="${H-B}"/><circle r="5"/></g></svg><div class="chart-inspector"><input class="chart-slider" type="range" min="0" max="${pts.length-1}" value="${selected}" aria-label="Inspect ${esc(options.label.toLowerCase())}"><span class="chart-hint">Drag chart or slide to explore</span></div>`;
    const svg=host.querySelector('svg'),slider=host.querySelector('input'),output=host.querySelector('output');
    const crosshair=host.querySelector('.chart-marker line'),dot=host.querySelector('.chart-marker circle'),bars=host.querySelectorAll('.chart-bar');
    function inspect(index) {
      selected=Math.max(0,Math.min(pts.length-1,index));
      const point=pts[selected],coord=coords[selected];
      host.dataset.chartTime=String(point.x);slider.value=String(selected);slider.setAttribute('aria-valuetext',point.label);
      output.querySelector('strong').textContent=options.formatValue?options.formatValue(point.y):`${n(point.y,options.digits??(options.unit==='%'?0:1))}${options.unit==='%'?'':' '}${options.unit}`;
      output.querySelector('span').textContent=point.caption||point.label.split(' · ')[0];
      crosshair.setAttribute('x1',coord.x);crosshair.setAttribute('x2',coord.x);
      dot.setAttribute('cx',coord.x);dot.setAttribute('cy',coord.y);
      bars.forEach((bar,i)=>bar.classList.toggle('selected',i===selected));
      options.onInspect?.(point);
    }
    function inspectPointer(event) {
      host.dataset.chartPinned='true';
      // SVG CTM accounts for desktop max-height letterboxing and any CSS scale.
      const matrix=svg.getScreenCTM();if(!matrix)return;
      const point=svg.createSVGPoint();point.x=event.clientX;point.y=event.clientY;
      const local=point.matrixTransform(matrix.inverse());
      inspect(nearestIndex(coords,local.x));
    }
    let pointer=null;
    svg.addEventListener('pointerdown',event=>{
      if(!event.isPrimary||event.button!==0)return;
      pointer=event.pointerId;host.dataset.dragging='true';svg.setPointerCapture(pointer);inspectPointer(event);
    });
    svg.addEventListener('pointermove',event=>{if(event.pointerId===pointer||event.pointerType==='mouse'&&pointer===null)inspectPointer(event);});
    const release=event=>{if(event.pointerId!==pointer)return;pointer=null;delete host.dataset.dragging;};
    svg.addEventListener('pointerup',release);svg.addEventListener('pointercancel',release);svg.addEventListener('lostpointercapture',release);
    slider.addEventListener('input',()=>{host.dataset.chartPinned='true';inspect(Number(slider.value));});
    inspect(selected);
  }
  return {nearestIndex,layout,render};
});
