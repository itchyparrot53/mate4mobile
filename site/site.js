'use strict';

document.querySelectorAll('[data-copy]').forEach(button=>{
 const label=button.textContent;
 let reset;
 button.addEventListener('click',async()=>{
  const target=document.getElementById(button.dataset.copy);
  const text=target instanceof HTMLTextAreaElement?target.value:target.textContent;
  const status=document.getElementById(button.dataset.copyStatus||'copy-status');
  try{
   await navigator.clipboard.writeText(text);
   button.textContent='Copied';
   status.textContent=button.dataset.copySuccess||'Command copied';
   clearTimeout(reset);reset=setTimeout(()=>button.textContent=label,2200);
  }catch{
   const details=target.closest('details');if(details)details.open=true;
   if(target instanceof HTMLTextAreaElement){target.focus();target.select();}
   else{const range=document.createRange();range.selectNodeContents(target);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);}
   status.textContent=button.dataset.copyFallback||'Copy unavailable. The command is selected; copy it manually.';
  }
 });
});
const readings={speed:['42 <small>mph</small>','A moment along an illustrative journey.'],power:['−12 <small>kW</small>','Negative power shows regeneration.'],battery:['84<small>%</small>','Battery level at this moment in the drive.']};
document.querySelectorAll('[data-reading]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-reading]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));const [value,note]=readings[button.dataset.reading];document.getElementById('sample-reading').innerHTML=value;document.getElementById('reading-note').textContent=note;}));
