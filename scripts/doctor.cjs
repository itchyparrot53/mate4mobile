'use strict';
const {Client}=require('pg');
const tables=['cars','settings','states','positions','drives','charging_processes','charges','updates','addresses','geofences'];
(async()=>{
 const client=new Client({connectionTimeoutMillis:6000,statement_timeout:8000});
 let failures=0;const check=(ok,message)=>{console.log(`${ok?'PASS':'FAIL'} ${message}`);if(!ok)failures++;};
 try{
  await client.connect();
  const {rows:[r]}=await client.query('SELECT rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls FROM pg_roles WHERE rolname=current_user');
  check(!Object.values(r).some(Boolean),'Database role has no administrative privileges');
  const readonly=await client.query('SHOW default_transaction_read_only');check(readonly.rows[0].default_transaction_read_only==='on','Read-only transactions are the role default');
  const memberships=await client.query('SELECT 1 FROM pg_auth_members WHERE member=(SELECT oid FROM pg_roles WHERE rolname=current_user)');check(!memberships.rowCount,'Reader has no other role memberships');
  check(!(await client.query("SELECT has_schema_privilege('public','CREATE') AS allowed")).rows[0].allowed,'No CREATE privilege in public schema');
  check(!(await client.query("SELECT has_database_privilege(current_database(),'CREATE') AS allowed")).rows[0].allowed,'No CREATE privilege on database');
  const all=await client.query("SELECT c.relname,has_table_privilege(c.oid,'SELECT') AS readable,has_table_privilege(c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS writable FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f')");
  check(all.rows.every(row=>!row.writable),'No write privileges on public tables');
  check(all.rows.filter(row=>!tables.includes(row.relname)).every(row=>!row.readable),'No read access to unneeded tables (including tokens)');
  for(const table of tables){const row=all.rows.find(row=>row.relname===table);check(Boolean(row?.readable),`Required table: ${table}`);}
  // Preparing these zero-row projections verifies the feature-critical schema.
  for(const sql of ['SELECT battery_level,usable_battery_level,drive_id,power,speed,date FROM positions LIMIT 0','SELECT cost_per_unit,session_fee,billing_type FROM geofences LIMIT 0','SELECT charge_energy_added,charge_energy_used,start_battery_level,end_battery_level,cost FROM charging_processes LIMIT 0'])await client.query(sql);
  console.log('PASS Core telemetry columns are available');
  try{new Intl.DateTimeFormat('en-GB',{timeZone:process.env.TZ||'Europe/London'}).format();new Intl.NumberFormat('en-GB',{style:'currency',currency:process.env.CURRENCY||'GBP'}).format(0);console.log('PASS Timezone and currency');}catch{check(false,'Timezone and currency must be valid');}
 }catch(error){console.error(`FAIL ${error.code||'connection/schema'}: Check database settings, grants and TeslaMate schema. No credentials were logged.`);failures++;}
 finally{await client.end().catch(()=>{});}
 if(failures){console.error('Doctor found issues. See docs/TROUBLESHOOTING.md. No data or grants were changed.');process.exitCode=1;}else console.log('Mate4Mobile database checks passed.');
})().catch(()=>{console.error('Doctor could not finish.');process.exitCode=1;});
