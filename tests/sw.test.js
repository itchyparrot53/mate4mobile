'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
test('offline API request never falls back to a cached private response',async()=>{
  const handlers={};let cacheTouched=false,promise;
  const context={self:{location:{origin:'https://teslamate.local'},addEventListener:(name,fn)=>handlers[name]=fn},URL,Response,fetch:async()=>{throw new Error('offline');},caches:{open:()=>{cacheTouched=true;throw new Error('private cache accessed');}}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../public/sw.js'),'utf8'),context);
  handlers.fetch({request:{method:'GET',url:'https://teslamate.local/api/session'},respondWith:p=>{promise=p;}});
  const response=await promise;
  assert.equal(response.status,503);assert.equal(cacheTouched,false);assert.equal((await response.json()).error,'offline');
});
test('worker only deletes its own old caches on activation',async()=>{
  const handlers={},deleted=[];let promise;
  const context={self:{addEventListener:(n,fn)=>handlers[n]=fn,clients:{claim:async()=>{}}},caches:{keys:async()=>['tm-mobile-v1','tm-mobile-v2','unrelated-cache'],delete:async key=>deleted.push(key)}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../public/sw.js'),'utf8'),context);
  handlers.activate({waitUntil:p=>{promise=p;}});await promise;
  assert.deepEqual(deleted,['tm-mobile-v1','tm-mobile-v2']);
});

test('vehicle images cache on demand, work offline, and failed downloads are not cached',async()=>{
  const handlers={},saved=new Map();let promise,online=true,fetches=0;
  const cache={match:async request=>saved.get(request.url)?.clone(),put:async(request,response)=>saved.set(request.url,response)};
  const context={self:{location:{origin:'https://teslamate.local'},addEventListener:(n,fn)=>handlers[n]=fn},URL,Response,
    fetch:async request=>{fetches++;if(!online)throw new Error('offline');return request.url.includes('missing')?new Response('missing',{status:404}):new Response('image',{headers:{'Content-Type':'image/png'}});},caches:{open:async()=>cache}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../public/sw.js'),'utf8'),context);
  const request=async pathname=>{handlers.fetch({request:{method:'GET',url:'https://teslamate.local'+pathname},respondWith:p=>{promise=p;}});return promise;};
  const image='/assets/vehicles/m3-chrome-PPSW.png';
  assert.equal((await request(image)).status,200);assert.equal(saved.size,1);
  online=false;assert.equal(await(await request(image)).text(),'image');assert.equal(fetches,1);
  online=true;assert.equal((await request('/assets/vehicles/missing-PPSW.png')).status,404);assert.equal(saved.size,1);
  promise=null;handlers.fetch({request:{method:'GET',url:'https://teslamate.local/assets/vehicles/private.json'},respondWith:p=>{promise=p;}});assert.equal(promise,null);
});
