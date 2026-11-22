'use strict';
document.querySelectorAll('[data-copy]').forEach(button=>button.addEventListener('click',async()=>{
 const text=document.getElementById(button.dataset.copy).textContent;
 try{await navigator.clipboard.writeText(text);button.textContent='Copied';document.getElementById('copy-status').textContent='Command copied';setTimeout(()=>button.textContent='Copy',2200);}catch{document.getElementById('copy-status').textContent='Copy unavailable. Select the command to copy it manually.';const range=document.createRange();range.selectNodeContents(document.getElementById(button.dataset.copy));const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);}
}));
const readings={speed:['42 <small>mph</small>','A moment along an illustrative journey.'],power:['−12 <small>kW</small>','Negative power shows regeneration.'],battery:['84<small>%</small>','Battery level at this moment in the drive.']};
document.querySelectorAll('[data-reading]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-reading]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));const [value,note]=readings[button.dataset.reading];document.getElementById('sample-reading').innerHTML=value;document.getElementById('reading-note').textContent=note;}));
