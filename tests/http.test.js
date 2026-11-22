'use strict';
const {test,before,after} = require('node:test');
const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
let child,base,port;
before(async()=>{
  child=spawn(process.execPath,['src/server.js'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,HOST:'127.0.0.1',PORT:'0',APP_PASS:'test-only-pass',APP_SECRET:'test-only-secret-'.repeat(3),PGHOST:'127.0.0.1',PGPORT:'65534'},stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('server did not start')),5000);
    child.stdout.on('data',chunk=>{const match=String(chunk).match(/listening on 127.0.0.1:(\d+)/);if(match){port=Number(match[1]);base=`http://127.0.0.1:${port}`;clearTimeout(timer);resolve();}});
    child.once('exit',code=>{if(!base){clearTimeout(timer);reject(new Error('server exited '+code));}});
  });
});
after(async()=>{if(child){child.kill();await new Promise(resolve=>child.once('exit',resolve));}});
const login=pass=>fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pass})});
test('valid repeated sign-ins do not consume the failed-attempt allowance',async()=>{
  for(let i=0;i<7;i++) assert.equal((await login('test-only-pass')).status,200);
});
test('auth cookie is HttpOnly and HTTPS-aware',async()=>{
  const response=await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json','X-Forwarded-Proto':'https'},body:JSON.stringify({pass:'test-only-pass'})});
  assert.match(response.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);
  assert.match(response.headers.get('set-cookie'),/; Secure/);
});
test('malformed cookies are rejected without a server error',async()=>{
  for(const cookie of ['tm_session=%ZZ','tm_session=123.'+'é'.repeat(64),'tm_session=123.fake']) {
    assert.equal((await fetch(base+'/api/summary',{headers:{cookie}})).status,401);
  }
});
test('POST cannot invoke read endpoints; foreign origins cannot sign in',async()=>{
  assert.equal((await fetch(base+'/api/stats',{method:'POST'})).status,405);
  assert.equal((await fetch(base+'/api/login',{method:'POST',headers:{Origin:'https://example.invalid'}})).status,403);
});
test('static paths, response headers, and HEAD are safe',async()=>{
  const ok=await fetch(base+'/app.js');assert.equal(ok.status,200);
  assert.equal(ok.headers.get('x-content-type-options'),'nosniff');assert.match(ok.headers.get('content-security-policy'),/frame-ancestors 'none'/);
  assert.match(ok.headers.get('cache-control'),/no-cache/);
  assert.equal(await (await fetch(base+'/app.js',{method:'HEAD'})).text(),'');
  assert.equal((await fetch(base+'/%ZZ')).status,400);
  assert.equal((await fetch(base+'/.env')).status,403);
  assert.equal((await fetch(base+'/..%2fpublic-leak/probe.txt')).status,403);
});
test('malformed Host does not crash the process',async()=>{
  const status=await new Promise((resolve,reject)=>{http.get({host:'127.0.0.1',port,path:'/',headers:{host:'['}},res=>{res.resume();resolve(res.statusCode);}).on('error',reject);});
  assert.equal(status,200);assert.equal((await fetch(base+'/')).status,200);
});
test('health detects database failure',async()=>{assert.equal((await fetch(base+'/healthz')).status,503);});
test('shell asset references exist on disk',async()=>{
  for(const file of ['money.js','assets/model-3.png','assets/inter-latin.woff2','vendor/leaflet.js','vendor/leaflet.css','manifest.webmanifest']) {
    assert.equal((await fetch(base+'/'+file)).status,200);
  }
});
