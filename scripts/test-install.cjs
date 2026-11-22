'use strict';

// Real Docker integration test. All containers, roles and data are disposable.
const {spawnSync}=require('node:child_process');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),id='m4m-test-'+crypto.randomBytes(4).toString('hex'),network=id+'-net';
const bash=process.env.BASH_EXE||(process.platform==='win32'?'C:/Program Files/Git/bin/bash.exe':'bash');
let tmp,created=false,networkCreated=false,composeStarted=false;
function compose(args,options={}){return run('docker',['compose','-p',id,'-f','compose.yml','-f','compose.test.yml',...args],{cwd:tmp,...options});}
function run(cmd,args,options={}){const r=spawnSync(cmd,args,{encoding:'utf8',timeout:300000,...options});if(r.status!==0)throw new Error(`${cmd} ${args[0]} failed (exit ${r.status ?? 'unknown'}): ${[r.stdout,r.stderr,r.error?.message].filter(Boolean).join('\n').slice(-4000)}`);return r.stdout.trim();}
function sql(query){return run('docker',['exec','-i',id,'psql','-X','-v','ON_ERROR_STOP=1','-U','postgres','-d','teslamate','-At'],{input:query});}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 try{
  run('docker',['version','--format','{{.Server.Version}}']);
  run('docker',['network','create',network]);networkCreated=true;
  tmp=await fs.mkdtemp(path.join(os.tmpdir(),'mate4mobile-test-'));
  // Force the startup race to remain reproducible on fast and slow runners:
  // the bootstrap socket accepts connections before the target DB is created,
  // and remains available briefly before the final TCP server starts.
  const initSql=path.join(tmp,'delayed-init.sql');
  await fs.writeFile(initSql,'SELECT pg_sleep(3);\nCREATE DATABASE teslamate;\nSELECT pg_sleep(2);\n');
  run('docker',['create','--name',id,'--network',network,'-e','POSTGRES_HOST_AUTH_METHOD=trust','-e','POSTGRES_DB=postgres','postgres:17-alpine']);created=true;
  run('docker',['cp',initSql,id+':/docker-entrypoint-initdb.d/00-delayed-database.sql']);
  run('docker',['start',id]);
  // The official image starts a socket-only bootstrap server before creating
  // POSTGRES_DB, then restarts. pg_isready alone can accept that temporary server.
  // A successful query over TCP proves the target DB and final server are ready.
  let ready=false,lastReadinessError='';const deadline=Date.now()+60000;
  while(Date.now()<deadline){
   const result=spawnSync('docker',['exec',id,'psql','-X','-h','127.0.0.1','-U','postgres','-d','teslamate','-v','ON_ERROR_STOP=1','-Atqc','SELECT 1'],{encoding:'utf8',timeout:5000});
   if(result.status===0&&result.stdout.trim()==='1'){ready=true;break;}
   lastReadinessError=(result.stderr||result.error?.message||'No query result').trim();
   await sleep(500);
  }
  if(!ready){
   const logs=spawnSync('docker',['logs','--tail','30',id],{encoding:'utf8',timeout:5000});
   throw new Error(`Fixture PostgreSQL did not become query-ready: ${lastReadinessError}\n${logs.stdout||''}\n${logs.stderr||''}`);
  }
  console.log('Fixture PostgreSQL is accepting queries over TCP.');
  sql(`CREATE TABLE cars(id integer); CREATE TABLE settings(id integer); CREATE TABLE states(id integer); CREATE TABLE positions(id integer,battery_level integer,usable_battery_level integer,drive_id integer,power integer,speed integer,date timestamp); CREATE TABLE drives(id integer); CREATE TABLE charging_processes(id integer,charge_energy_added numeric,charge_energy_used numeric,start_battery_level integer,end_battery_level integer,cost numeric); CREATE TABLE charges(id integer); CREATE TABLE updates(id integer); CREATE TABLE addresses(id integer); CREATE TABLE geofences(id integer,cost_per_unit numeric,session_fee numeric,billing_type text); CREATE TABLE tokens(id integer,secret text); INSERT INTO tokens VALUES(1,'synthetic-not-a-real-token');`);
  for(const name of ['scripts','public','src','deploy','compose.yml','.dockerignore','package.json','package-lock.json'])await fs.cp(path.join(root,name),path.join(tmp,name),{recursive:true});
  console.log('Testing setup against an isolated PostgreSQL 17 container…');
  const setup=['scripts/setup.sh','--container',id,'--network',network,'--db-admin','postgres','--currency','eur','--no-start'];
  run(bash,setup,{cwd:tmp});
  const envBefore=await fs.readFile(path.join(tmp,'.env'));
  if(!/^CURRENCY=EUR$/m.test(envBefore.toString()))throw new Error('Setup did not normalize the selected currency');
  const rerun=spawnSync(bash,setup,{cwd:tmp,encoding:'utf8'});if(rerun.status===0)throw new Error('Setup must refuse to overwrite .env');
  if(!envBefore.equals(await fs.readFile(path.join(tmp,'.env'))))throw new Error('Rerun changed credentials');
  if(sql("SELECT has_table_privilege('mate4mobile_reader','tokens','SELECT')")!=='f')throw new Error('Reader can access tokens');
  if(sql("SELECT has_table_privilege('mate4mobile_reader','cars','UPDATE')")!=='f')throw new Error('Reader can write cars');
  // Exercise the shipped Compose settings, with only the image tag and host
  // port isolated so tests never reuse a real Mate4Mobile installation.
  await fs.writeFile(path.join(tmp,'compose.test.yml'),`services:\n  app:\n    image: ${id}\n`);
  await fs.writeFile(path.join(tmp,'.env'),envBefore.toString().replace(/^HTTP_PORT=.+$/m,'HTTP_PORT=0'),{mode:0o600});
  composeStarted=true;
  compose(['build','app']);
  console.log('Testing the built image, database doctor and HTTPS cookie policy…');
  compose(['run','--rm','--no-deps','app','node','scripts/doctor.cjs']);
  compose(['up','-d','--wait','--wait-timeout','90','app']);
  const appId=compose(['ps','-q','app']);
  if(run('docker',['exec',appId,'node','-e',"console.log(require('./public/money').getCurrencyCode(process.env.CURRENCY))"])!=='EUR')throw new Error('Currency did not reach the deployed app');
  const address=run('docker',['port',appId,'8099/tcp']),base='http://'+address;
  let healthy=false;for(let i=0;i<40;i++){try{if((await fetch(base+'/healthz',{signal:AbortSignal.timeout(1500)})).ok){healthy=true;break;}}catch{}await sleep(500);}if(!healthy){console.error(run('docker',['logs','--tail','15',appId]));console.error(run('docker',['inspect','--format','{{json .NetworkSettings.Ports}}',appId]));throw new Error('Image health check failed');}
  if((await fetch(base+'/api/summary',{signal:AbortSignal.timeout(10000)})).status!==401)throw new Error('Authentication boundary failed');
  const pass=envBefore.toString().match(/^APP_PASS=(.+)$/m)[1];
  const login=await fetch(base+'/api/login',{method:'POST',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json'},body:JSON.stringify({pass})});
  if(login.status!==200||!(login.headers.get('set-cookie')||'').includes('; Secure'))throw new Error('Secure cookie policy failed');
  // Excess grants must be detected, even when inherited through PUBLIC.
  sql('GRANT SELECT ON tokens TO PUBLIC');
  const bad=spawnSync('docker',['compose','-p',id,'-f','compose.yml','-f','compose.test.yml','run','--rm','--no-deps','app','node','scripts/doctor.cjs'],{cwd:tmp,encoding:'utf8',timeout:30000});
  if(bad.status!==1||!bad.stdout.includes('FAIL No read access to unneeded tables'))throw new Error('Doctor did not reject token access through PUBLIC for the expected reason');
  console.log('PASS installation, restricted grants, rerun protection, Compose deployment, health, auth, secure cookie and excessive-grant detection.');
 }finally{
  if(composeStarted)spawnSync('docker',['compose','-p',id,'-f','compose.yml','-f','compose.test.yml','down','--volumes','--remove-orphans'],{cwd:tmp,stdio:'ignore',timeout:30000});
  if(created)spawnSync('docker',['rm','-fv',id],{stdio:'ignore'});
  if(networkCreated)spawnSync('docker',['network','rm',network],{stdio:'ignore'});
  spawnSync('docker',['image','rm',id],{stdio:'ignore'});
  // Only our exact, freshly allocated temp directory may be removed.
  if(tmp&&path.dirname(tmp)===path.resolve(os.tmpdir())&&path.basename(tmp).startsWith('mate4mobile-test-'))await fs.rm(tmp,{recursive:true,force:true});
 }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
