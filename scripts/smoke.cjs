'use strict';
const assert=require('node:assert/strict');
const base=process.env.BASE || 'http://127.0.0.1:8099';
(async()=>{
  const login=await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pass:process.env.APP_PASS}),signal:AbortSignal.timeout(10000)});
  assert.equal(login.status,200,'login');
  const cookie=login.headers.get('set-cookie').split(';')[0];
  for(const endpoint of ['/healthz','/api/summary','/api/activity','/api/charging-stats','/api/drives','/api/charges','/api/stats','/api/stats?days=90','/api/series','/api/health']){
    const r=await fetch(base+endpoint,{headers:{cookie},signal:AbortSignal.timeout(10000)});
    assert.equal(r.status,200,endpoint);await r.json();console.log('PASS '+endpoint);
  }
  assert.equal((await fetch(base+'/api/summary')).status,401);
  console.log('PASS authentication boundary');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
