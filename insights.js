'use strict';
const {thinPoints}=require('./lib');

// Select actual observations in equal TIME buckets, never sample-weighted averages.
// Protect session/gap boundaries, endpoints and per-signal extrema.
function sampleTelemetry(input,{limit=600,keys=['level'],gap=30000}={}) {
  const points=input.filter(p=>Number.isFinite(new Date(p.at).getTime())).sort((a,b)=>new Date(a.at)-new Date(b.at));
  if(!points.length)return [];
  const mandatory=new Set([0,points.length-1]);
  for(let i=0;i<points.length;i++) {
    if(points[i].anchor)mandatory.add(i);
    if(i && keys.some(key=>Number.isFinite(points[i][key])!==Number.isFinite(points[i-1][key]))){mandatory.add(i-1);mandatory.add(i);}
    if(i && new Date(points[i].at)-new Date(points[i-1].at)>gap){mandatory.add(i-1);mandatory.add(i);points[i]={...points[i],breakBefore:true};}
  }
  if(points.length<=limit)return points;
  const keep=new Set(mandatory);
  const bucketCount=Math.max(1,Math.floor((limit-keep.size)/(2+keys.length*2)));
  const start=+new Date(points[0].at),span=Math.max(1,+new Date(points.at(-1).at)-start);
  const buckets=new Map();
  points.forEach((p,i)=>{const key=Math.min(bucketCount-1,Math.floor((+new Date(p.at)-start)/span*bucketCount));if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(i);});
  for(const indices of buckets.values()) {
    keep.add(indices[0]);keep.add(indices.at(-1));
    for(const key of keys){const valid=indices.filter(i=>Number.isFinite(points[i][key]));if(!valid.length)continue;
      keep.add(valid.reduce((a,b)=>points[a][key]<=points[b][key]?a:b));keep.add(valid.reduce((a,b)=>points[a][key]>=points[b][key]?a:b));}
  }
  // Pathological histories can contain more boundaries than the payload budget.
  // Retain a bounded endpoint-preserving series and mark every resulting gap.
  const indices=keep.size<=limit?[...keep].sort((a,b)=>a-b):mandatory.size>=limit?thinPoints([...mandatory].sort((a,b)=>a-b),limit):[...mandatory,...thinPoints([...keep].filter(i=>!mandatory.has(i)).sort((a,b)=>a-b),limit-mandatory.size)].sort((a,b)=>a-b);
  return indices.map(index=>points[index]);
}

const BATTERY_SQL=`with charge_samples as (
  select c.date as at,c.battery_level as level,c.usable_battery_level as usable,2 as source,
    row_number() over(partition by cp.id order by c.date,c.id)=1 or row_number() over(partition by cp.id order by c.date desc,c.id desc)=1 as anchor
  from charges c join charging_processes cp on cp.id=c.charging_process_id
  where cp.car_id=$1 and c.date >= $3::timestamp-($2::int*interval '1 hour') and c.date <= $3::timestamp and c.battery_level is not null
), observations as (
  select p.date as at,p.battery_level as level,p.usable_battery_level as usable,1 as source,
    coalesce(p.id=d.start_position_id or p.id=d.end_position_id,false) as anchor
  from positions p left join drives d on d.id=p.drive_id
  where p.car_id=$1 and p.date >= $3::timestamp-($2::int*interval '1 hour') and p.date <= $3::timestamp and p.battery_level is not null
  union all select * from charge_samples
), distinct_samples as (
  select distinct on(at) * from observations where level between 0 and 100 order by at,source desc
), spaced as (
  select *,at-lag(at) over(order by at)>interval '30 minutes' as break_before,
    lead(at) over(order by at)-at>interval '30 minutes' as before_gap,
    floor(extract(epoch from at)/greatest(60,$2::int*3600/180)) as bucket from distinct_samples
), ranked as (
  select *,row_number() over(partition by bucket order by at) as first,
    row_number() over(partition by bucket order by at desc) as last,
    row_number() over(partition by bucket order by level,at) as low,
    row_number() over(partition by bucket order by level desc,at) as high from spaced
)
select at,level,usable,(anchor or coalesce(break_before,false) or coalesce(before_gap,false)) as anchor,
  coalesce(break_before,false) as "breakBefore" from ranked
where anchor or break_before or before_gap or first=1 or last=1 or low=1 or high=1 order by at`;

async function getBatterySeries(db,carId,hours,now=new Date()) {
  if(!carId)return {series:[],events:[]};
  const stamp=now.toISOString().replace('Z','');
  const [samples,events]=await Promise.all([
    db.query(BATTERY_SQL,[carId,hours,stamp]),
    db.query(`select id,'drive' as type,start_date as start,end_date as end from drives where car_id=$1 and coalesce(end_date,$3::timestamp)>$3::timestamp-($2::int*interval '1 hour') and start_date<=$3::timestamp
      union all select id,'charge',start_date,end_date from charging_processes where car_id=$1 and coalesce(end_date,$3::timestamp)>$3::timestamp-($2::int*interval '1 hour') and start_date<=$3::timestamp
      order by start desc limit 300`,[carId,hours,stamp])
  ]);
  return {series:sampleTelemetry(samples.rows,{limit:1200,gap:Infinity}),events:events.rows,asOf:now.toISOString()};
}

const CHARGING_SQL=`with bounds as (
 select ((date_trunc('day',$4::timestamptz at time zone $3)-(($2::int-1)*interval '1 day')) at time zone $3) at time zone 'UTC' as since,
 ($4::timestamptz at time zone 'UTC') as until
)
select cp.id,cp.end_date,cp.charge_energy_added::float8 as added,cp.charge_energy_used::float8 as used,
 cp.cost::float8 as cost,cp.geofence_id,g.name as place,
 g.cost_per_unit::float8 as rate,g.session_fee::float8 as fee,g.billing_type::text as billing,
 to_char(cp.end_date at time zone 'UTC' at time zone $3,'YYYY-MM-DD') as day
from charging_processes cp left join geofences g on g.id=cp.geofence_id,bounds
where cp.car_id=$1 and cp.end_date>=since and cp.end_date<=until order by cp.end_date`;

function chargingTotals(rows) {
  const sum=key=>rows.length?rows.some(r=>r[key]!=null)?rows.reduce((a,r)=>a+(r[key]??0),0):null:0;
  return {sessions:rows.length,addedKwh:sum('added'),usedKwh:sum('used'),cost:sum('cost'),costSamples:rows.filter(r=>r.cost!=null).length,energySamples:rows.filter(r=>r.added!=null).length};
}

async function getChargingStats(db,carId,days,timezone='Europe/London',now=new Date()) {
  const {rows}=carId?await db.query(CHARGING_SQL,[carId,days,timezone,now.toISOString()]):{rows:[]};
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const part=key=>parts.find(p=>p.type===key).value;
  const end=`${part('year')}-${part('month')}-${part('day')}`;
  const daily=Array.from({length:days},(_,i)=>{const d=new Date(end+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-days+1+i);const day=d.toISOString().slice(0,10);return {day,...chargingTotals(rows.filter(r=>r.day===day))};});
  const groups=new Map();for(const row of rows){const key=row.geofence_id??'other';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
  const locations=[...groups.values()].map(group=>({name:group[0].place||'Other locations',rate:group[0].rate,billing:group[0].billing,fee:group[0].fee,...chargingTotals(group)}));
  return {days,timezone,from:daily[0].day,to:end,...chargingTotals(rows),daily,locations};
}

module.exports={sampleTelemetry,BATTERY_SQL,getBatterySeries,CHARGING_SQL,chargingTotals,getChargingStats};
