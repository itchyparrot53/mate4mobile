'use strict';
// Real Docker integration test. All containers, roles and data are disposable.
const {spawnSync}=require('node:child_process');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),id='m4m-test-'+crypto.randomBytes(4).toString('hex'),network=id+'-net';
const bash=process.env.BASH_EXE||(process.platform==='win32'?'C:/Program Files/Git/bin/bash.exe':'bash');
let tmp,created=false,networkCreated=false;
function run(cmd,args,options={}){const r=spawnSync(cmd,args,{encoding:'utf8',timeout:300000,...options});if(r.status!==0)throw new Error(`${cmd} ${args[0]} failed: ${(r.stderr||r.stdout||r.error||'').toString().slice(-2200)}`);return r.stdout.trim();}
function sql(query){return run('docker',['exec','-i',id,'psql','-X','-v','ON_ERROR_STOP=1','-U','postgres','-d','teslamate','-At'],{input:query});}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 try{
  run('docker',['version','--format','{{.Server.Version}}']);
  run('docker',['network','create',network]);networkCreated=true;
  run('docker',['run','-d','--name',id,'--network',network,'-e','POSTGRES_HOST_AUTH_METHOD=trust','-e','POSTGRES_DB=teslamate','postgres:17-alpine']);created=true;
  let ready=false;for(let i=0;i<30;i++){const result=spawnSync('docker',['exec',id,'pg_isready','-U','postgres'],{encoding:'utf8'});if(result.status===0){ready=true;break;}await sleep(1000);}if(!ready)throw new Error('Fixture PostgreSQL did not start');
  sql(`CREATE TABLE cars(id integer); CREATE TABLE settings(id integer); CREATE TABLE states(id integer); CREATE TABLE positions(id integer,battery_level integer,usable_battery_level integer,drive_id integer,power integer,speed integer,date timestamp); CREATE TABLE drives(id integer); CREATE TABLE charging_processes(id integer,charge_energy_added numeric,charge_energy_used numeric,start_battery_level integer,end_battery_level integer,cost numeric); CREATE TABLE charges(id integer); CREATE TABLE updates(id integer); CREATE TABLE addresses(id integer); CREATE TABLE geofences(id integer,cost_per_unit numeric,session_fee numeric,billing_type text); CREATE TABLE tokens(id integer,secret text); INSERT INTO tokens VALUES(1,'synthetic-not-a-real-token');`);
  tmp=await fs.mkdtemp(path.join(os.tmpdir(),'mate4mobile-test-'));
  for(const name of ['scripts','public','Dockerfile','compose.yml','.dockerignore','package.json','package-lock.json','server.js','activity.js','insights.js','lib.js'])await fs.cp(path.join(root,name),path.join(tmp,name),{recursive:true});
  console.log('Testing setup against an isolated PostgreSQL 17 container…');
  const setup=['scripts/setup.sh','--container',id,'--network',network,'--db-admin','postgres','--no-start'];
  run(bash,setup,{cwd:tmp});
  const envBefore=await fs.readFile(path.join(tmp,'.env'));
  const rerun=spawnSync(bash,setup,{cwd:tmp,encoding:'utf8'});if(rerun.status===0)throw new Error('Setup must refuse to overwrite .env');
  if(!envBefore.equals(await fs.readFile(path.join(tmp,'.env'))))throw new Error('Rerun changed credentials');
  if(sql("SELECT has_table_privilege('mate4mobile_reader','tokens','SELECT')")!=='f')throw new Error('Reader can access tokens');
  if(sql("SELECT has_table_privilege('mate4mobile_reader','cars','UPDATE')")!=='f')throw new Error('Reader can write cars');
  run('docker',['build','-t',id,tmp]);
  console.log('Testing the built image, database doctor and HTTPS cookie policy…');
  run('docker',['run','--rm','--network',network,'--env-file',path.join(tmp,'.env'),id,'node','scripts/doctor.cjs']);
  run('docker',['run','-d','--name',id+'-app','--network',network,'--env-file',path.join(tmp,'.env'),'-p','127.0.0.1::8099','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true',id]);
  const address=run('docker',['port',id+'-app','8099/tcp']),base='http://'+address;
  let healthy=false;for(let i=0;i<40;i++){try{if((await fetch(base+'/healthz',{signal:AbortSignal.timeout(1500)})).ok){healthy=true;break;}}catch{}await sleep(500);}if(!healthy){console.error(run('docker',['logs','--tail','15',id+'-app']));console.error(run('docker',['inspect','--format','{{json .NetworkSettings.Ports}}',id+'-app']));throw new Error('Image health check failed');}
  if((await fetch(base+'/api/summary')).status!==401)throw new Error('Authentication boundary failed');
  const pass=envBefore.toString().match(/^APP_PASS=(.+)$/m)[1];
  const login=await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pass})});
  if(login.status!==200||!login.headers.get('set-cookie').includes('; Secure'))throw new Error('Secure cookie policy failed');
  // Excess grants must be detected, even when inherited through PUBLIC.
  sql('GRANT SELECT ON tokens TO PUBLIC');
  const bad=spawnSync('docker',['run','--rm','--network',network,'--env-file',path.join(tmp,'.env'),id,'node','scripts/doctor.cjs'],{encoding:'utf8'});
  if(bad.status===0)throw new Error('Doctor accepted token access through PUBLIC');
  console.log('PASS installation, restricted grants, rerun protection, built image, health, auth, secure cookie and excessive-grant detection.');
 }finally{
  spawnSync('docker',['rm','-f',id+'-app'],{stdio:'ignore'});
  if(created)spawnSync('docker',['rm','-f',id],{stdio:'ignore'});
  if(networkCreated)spawnSync('docker',['network','rm',network],{stdio:'ignore'});
  spawnSync('docker',['image','rm',id],{stdio:'ignore'});
  // Only our exact, freshly allocated temp directory may be removed.
  if(tmp&&path.dirname(tmp)===path.resolve(os.tmpdir())&&path.basename(tmp).startsWith('mate4mobile-test-'))await fs.rm(tmp,{recursive:true,force:true});
 }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
