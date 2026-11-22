'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {sampleTelemetry,chargingTotals,getChargingStats}=require('../src/insights');
const {layout}=require('../public/charts');

test('time sampling retains actual endpoint SOC, short spikes, regeneration and boundaries',()=>{
  const start=Date.parse('2026-11-22T07:00:00Z');
  const rows=Array.from({length:10000},(_,i)=>({at:new Date(start+i*250),level:i<5000?95:83,speedKmh:40,powerKw:5,anchor:i===103||i===9003}));
  rows[303].powerKw=206;rows[304].powerKw=-62;
  const result=sampleTelemetry(rows,{limit:600,keys:['speedKmh','powerKw','level']});
  assert.ok(result.length<=600);assert.equal(result[0].at.getTime(),start);assert.equal(result.at(-1).level,83);
  for(const i of [103,303,304,9003])assert.ok(result.some(r=>+r.at===+rows[i].at));
  assert.ok(result.every(r=>rows.some(original=>original.at===r.at&&original.level===r.level)));
  assert.ok(result.every(r=>!r.breakBefore));
});
test('gaps are retained without inventing averages or connections across missing readings',()=>{
  const sampled=sampleTelemetry([{at:0,level:98},{at:1000,level:97},{at:100000,level:83}],{limit:100,gap:30000});
  assert.equal(sampled[2].breakBefore,true);
  const plot=layout([{x:0,y:10},{x:1000,y:null},{x:2000,y:5}]);
  assert.equal(plot.points[1].breakBefore,true);
});
test('power geometry includes negative regeneration and the positive peak',()=>{
  const plot=layout([{x:1,y:-62},{x:2,y:206}]);
  assert.ok(plot.min<=-62&&plot.max>=206);
  assert.ok(plot.coords.every(p=>p.y>=plot.T&&p.y<=plot.H-plot.B));
});
test('charging totals distinguish missing, free and partly recorded costs',()=>{
  assert.equal(chargingTotals([]).cost,0);
  assert.equal(chargingTotals([{added:20,cost:null}]).cost,null);
  assert.equal(chargingTotals([{added:20,cost:0}]).cost,0);
  const mixed=chargingTotals([{added:20,cost:1.58},{added:null,cost:null}]);
  assert.equal(mixed.cost,1.58);assert.equal(mixed.costSamples,1);assert.equal(mixed.energySamples,1);assert.equal(mixed.sessions,2);
});
test('charging calendar includes empty days and retains unknown costs instead of zero',async()=>{
  const result=await getChargingStats({query:async()=>({rows:[{day:'2026-03-30',added:20,cost:null,geofence_id:1,place:'Home',rate:.072,billing:'per_kwh'}]})},1,7,'Europe/London',new Date('2026-03-29T23:30:00Z'));
  assert.equal(result.to,'2026-03-30');assert.equal(result.from,'2026-03-24');assert.equal(result.daily.length,7);
  assert.equal(result.daily[0].cost,0);assert.equal(result.daily.at(-1).cost,null);assert.equal(result.locations[0].name,'Home');
});
test('large protected sets remain bounded and retain first and latest readings',()=>{
  const rows=Array.from({length:5000},(_,i)=>({at:i,level:i%100,anchor:true}));
  const result=sampleTelemetry(rows,{limit:600});
  assert.equal(result.length,600);assert.equal(result[0].at,0);assert.equal(result.at(-1).at,4999);
});
test('downsampling keeps missing-signal transitions so charts cannot bridge them',()=>{
  const rows=Array.from({length:10000},(_,i)=>({at:i*250,powerKw:i>=102&&i<=108?null:10}));
  const sampled=sampleTelemetry(rows,{limit:600,keys:['powerKw']});
  for(const i of [101,102,108,109])assert.ok(sampled.some(p=>p.at===rows[i].at));
  const plot=layout(sampled.map(p=>({x:p.at,y:p.powerKw})));
  assert.equal(plot.points.find(p=>p.x===rows[109].at).breakBefore,true);
});
