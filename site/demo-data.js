'use strict';
// This file is ONLY copied into the static showcase. Production never loads it.
// All names, routes, amounts and readings are invented. No database connection.
(function(){
 const now=Date.now(), H=3600000,D=24*H,iso=t=>new Date(t).toISOString();
 const today=new Date();today.setHours(0,0,0,0);const midnight=+today;
 const stamp=(days,hours)=>midnight-days*D+hours*H;
 // Place completed events before now, even when viewing the demo at midnight.
 const end=now-.15*H;
 const drives=Array.from({length:12},(_,i)=>{const finish=end-i*26*H,mins=i%2?24:38,km=i%2?18.4:34.6;return{id:100+i,type:'drive',start:iso(finish-mins*60000),end:iso(finish),sortStamp:iso(finish),durationMin:mins,distanceKm:km,startLevel:90-i%4,endLevel:82-i%4,startPlace:i%2?'Riverside':'Home',endPlace:i%2?'Home':'Riverside',startAddress:'Illustrative location',endAddress:'Illustrative location',avgSpeedKmh:km/(mins/60),speedMax:92,powerMax:82,powerMin:-28,startKm:24100,endKm:24100+km,ascent:64,descent:52,outsideC:12,insideC:20};});
 const charges=Array.from({length:9},(_,i)=>{const finish=end-(i*3+1)*D,added=18.6+i%3*4.2,cost=+(added*.085).toFixed(2);return{id:200+i,type:'charge',start:iso(finish-3*H),end:iso(finish),sortStamp:iso(finish),durationMin:180,addedKwh:added,usedKwh:+(added*1.08).toFixed(1),cost,startLevel:47,endLevel:85,place:i%3?'Home':'Destination',address:'Illustrative location',rate:.085,fee:null,billing:'per_kwh',fast:false,avgPowerKw:7.1,maxPowerKw:7.4,efficiencyPct:92.6};});
 const items=[...drives,...charges].sort((a,b)=>b.end.localeCompare(a.end));
 const total=rows=>({sessions:rows.length,addedKwh:rows.reduce((a,x)=>a+x.addedKwh,0),usedKwh:rows.reduce((a,x)=>a+x.usedKwh,0),cost:rows.reduce((a,x)=>a+x.cost,0),costSamples:rows.length,energySamples:rows.length});
 const day=t=>new Date(t).toLocaleDateString('en-CA');
 const daily=days=>Array.from({length:days},(_,i)=>{const date=day(stamp(days-1-i,12));return {day:date,...total(charges.filter(c=>day(c.end)===date))};});
 const summary={generatedAt:iso(now),demo:true,car:{id:1,name:'Your Model 3',model:'Model 3',exteriorColor:'Black'},settings:{units:'mi',temperature:'C',preferredRange:'rated',timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,currency:'GBP'},status:{state:'asleep',since:iso(end),stale:false},telemetry:{at:iso(end),batteryAt:iso(end),battery:82,usableBattery:82,odometerKm:24134.6,rangeKm:344,insideC:20,outsideC:12,powerKw:0,speedKmh:0,elevationM:45},charging:{active:false},location:{name:'Riverside',address:'Illustrative location',lat:51.51,lng:-.11},vitals:{climate:{on:false},tpms:{fl:2.9,fr:2.9,rl:3,rr:3,unit:'bar'}},day:{asleep:1080,online:210,offline:150},software:{version:'2026.38'}};
 function detail(d){
  if(d.type==='charge')return {...d,curve:Array.from({length:60},(_,i)=>({at:iso(+new Date(d.start)+i*3*60000),powerKw:7.4-(i>47?(i-47)*.3:0),level:Math.round(47+i*38/59)}))};
  const telemetry=Array.from({length:100},(_,i)=>({at:iso(+new Date(d.start)+i*d.durationMin*60000/99),lat:51.492+i*.00024,lng:-.148+i*.00055+Math.sin(i/12)*.004,speedKmh:Math.max(0,55+25*Math.sin(i/8)-(i>93?50:0)),powerKw:18+28*Math.sin(i/6),level:Math.round(d.startLevel-i*(d.startLevel-d.endLevel)/99),breakBefore:false}));
  return {...d,telemetry,route:telemetry.map(p=>({lat:p.lat,lng:p.lng,at:p.at}))};
 }
 function response(url){
  const part=url.pathname.split('/api/')[1],days=Number(url.searchParams.get('days')||30);
  const selectedCharges=charges.filter(c=>+new Date(c.end)>stamp(days-1,0));
  switch(part){
   case 'session':return{authenticated:true};case 'login':case 'logout':return{ok:true};
   case 'summary':return summary;
   case 'activity':{const td=drives.filter(d=>+new Date(d.end)>=midnight),tc=charges.filter(d=>+new Date(d.end)>=midnight);return{items,hasMore:false,nextCursor:null,asOf:iso(now),today:{date:day(now),timezone:summary.settings.timezone,drives:td.length,charges:tc.length,distanceKm:td.reduce((s,d)=>s+d.distanceKm,0),driveMinutes:td.reduce((s,d)=>s+d.durationMin,0),addedKwh:tc.reduce((s,d)=>s+d.addedKwh,0),distanceSamples:td.length,energySamples:tc.length}};}
   case 'drives':return{drives,hasMore:false};case 'charges':return{charges:selectedCharges,hasMore:false};
   case 'series':{const hours=Number(url.searchParams.get('hours')||24);return{series:Array.from({length:97},(_,i)=>({at:iso(now-hours*H+i*hours*H/96),level:i<32?58:i<48?58+Math.round((i-32)*2):i<67?90:i<80?86:82,usable:82})),events:items.filter(d=>+new Date(d.start)>now-hours*H).map(d=>({id:d.id,type:d.type,start:d.start,end:d.end}))};}
   case 'charging-stats':return{days,timezone:summary.settings.timezone,from:day(stamp(days-1,12)),to:day(now),...total(selectedCharges),daily:daily(days),locations:['Home','Destination'].map(name=>({name,rate:.085,billing:'per_kwh',fee:null,...total(selectedCharges.filter(c=>c.place===name))})).filter(l=>l.sessions)};
   case 'stats':{const km=drives.reduce((s,d)=>s+d.distanceKm,0),minutes=drives.reduce((s,d)=>s+d.durationMin,0),t=total(selectedCharges);return{days,drives:{km,minutes,drives:drives.length},charging:{kwh:t.addedKwh,cost:t.cost,cost_samples:t.costSamples,sessions:t.sessions},allTime:{km,kwh:total(charges).addedKwh,cost:total(charges).cost,drives:drives.length,sessions:charges.length,odometer_km:24134.6},daily:[]};}
   case 'health':return{historyDays:27,capacitySamples:9,consumptionReady:false,baselineReady:true,firstReading:iso(now-27*D),lastReading:iso(now),fullRangeKm:420,capacityKwh:57.2,chargeEfficiencyPct:92.6,trend:Array.from({length:28},(_,i)=>({at:iso(now-(27-i)*D),fullRangeKm:420+Math.sin(i)*2}))};
   default:{const m=part.match(/^(drives|charges)\/(\d+)$/);const item=m&&(m[1]==='drives'?drives:charges).find(d=>d.id===Number(m[2]));return item?detail(item):null;}
  }
 }
 const original=window.fetch.bind(window);
 window.fetch=async(input,options)=>{const url=new URL(typeof input==='string'?input:input.url,location.href);if(url.origin===location.origin&&url.pathname.includes('/api/')){const data=response(url);return new Response(JSON.stringify(data||{error:'Demo endpoint unavailable'}),{status:data?200:404,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});}return original(input,options);};
})();
