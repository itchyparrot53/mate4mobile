'use strict';


function parseCursor(raw) {
  if (!raw) return null;
  if (raw.length > 256 || !/^[A-Za-z0-9_-]+$/.test(raw)) throw new Error('invalid cursor');
  let value;
  try { value = JSON.parse(Buffer.from(raw,'base64url').toString('utf8')); } catch { throw new Error('invalid cursor'); }
  if (!Array.isArray(value) || value.length !== 3) throw new Error('invalid cursor');
  const [stamp,type,id] = value;
  if (typeof stamp !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}$/.test(stamp) ||
      !['drive','charge'].includes(type) || !Number.isSafeInteger(id) || id < 1 || id > 2147483647) throw new Error('invalid cursor');
  const date = new Date(stamp+'Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,19) !== stamp.slice(0,19)) throw new Error('invalid cursor');
  return {stamp,type,id};
}

const cursorFor = row => Buffer.from(JSON.stringify([row.stamp,row.type,row.id])).toString('base64url');

// Keep the original microseconds in the cursor: JS Date alone would skip tied events.
const EVENTS_SQL = `with events as (
  select d.id, 'drive'::text as type, d.start_date, d.end_date,
    d.duration_min::float8 as minutes, d.distance::float8 as distance,
    null::float8 as added, null::float8 as cost, sp.battery_level as start_level, ep.battery_level as end_level,
    coalesce(sg.name,sa.display_name) as origin, coalesce(eg.name,ea.display_name) as destination
  from drives d left join addresses sa on sa.id=d.start_address_id left join addresses ea on ea.id=d.end_address_id
  left join geofences sg on sg.id=d.start_geofence_id left join geofences eg on eg.id=d.end_geofence_id
  left join positions sp on sp.id=d.start_position_id left join positions ep on ep.id=d.end_position_id
  where d.car_id=$1 and d.end_date is not null
  union all
  select cp.id, 'charge'::text, cp.start_date, cp.end_date,
    cp.duration_min::float8, null::float8, cp.charge_energy_added::float8, cp.cost::float8,
    cp.start_battery_level::integer, cp.end_battery_level::integer, null::text, coalesce(g.name,a.display_name)
  from charging_processes cp left join addresses a on a.id=cp.address_id
  left join geofences g on g.id=cp.geofence_id
  where cp.car_id=$1 and cp.end_date is not null
)
select *, to_char(end_date,'YYYY-MM-DD"T"HH24:MI:SS.US') as stamp from events
where ($2::timestamp is null or (end_date,type,id)<($2::timestamp,$3::text,$4::integer))
order by end_date desc,type desc,id desc limit $5`;

// TeslaMate timestamps are naive UTC. Compute local midnight before comparing them.
const TODAY_SQL = `with bounds as (
  select ((date_trunc('day',$3::timestamptz at time zone $2) at time zone $2) at time zone 'UTC') as since,
    ($3::timestamptz at time zone 'UTC') as until
), d as (
  select count(*)::int as drives, count(distance)::int as distance_samples,
    case when count(*)=0 then 0 else sum(distance)::float8 end as distance,
    case when count(*)=0 then 0 else sum(duration_min)::float8 end as minutes
  from drives,bounds where car_id=$1 and end_date>=since and end_date<=until
), c as (
  select count(*)::int as charges, count(charge_energy_added)::int as energy_samples,
    case when count(*)=0 then 0 else sum(charge_energy_added)::float8 end as added
  from charging_processes,bounds where car_id=$1 and end_date>=since and end_date<=until
)
select d.*,c.*,to_char($3::timestamptz at time zone $2,'YYYY-MM-DD') as date from d,c`;

async function getActivity(db,carId,{limit=25,cursor=null,timezone='Europe/London',now=new Date()}={}) {
  if (!carId) return {items:[],hasMore:false,nextCursor:null,today:null,asOf:now.toISOString()};
  const [events,totals] = await Promise.all([
    db.query(EVENTS_SQL,[carId,cursor?.stamp||null,cursor?.type||null,cursor?.id||null,limit+1]),
    cursor ? null : db.query(TODAY_SQL,[carId,timezone,now.toISOString()])
  ]);
  const page=events.rows.slice(0,limit), hasMore=events.rows.length>limit;
  const items=page.map(row=>({id:row.id,type:row.type,sortStamp:row.stamp,start:row.start_date,end:row.end_date,durationMin:row.minutes,
    distanceKm:row.distance,addedKwh:row.added,cost:row.cost,startLevel:row.start_level,endLevel:row.end_level,
    startAddress:row.origin,endAddress:row.destination,address:row.destination}));
  const t=totals?.rows[0];
  return {items,hasMore,nextCursor:hasMore?cursorFor(page.at(-1)):null,asOf:now.toISOString(),
    ...(t?{today:{date:t.date,timezone,drives:t.drives,charges:t.charges,distanceKm:t.distance,driveMinutes:t.minutes,
      addedKwh:t.added,distanceSamples:t.distance_samples,energySamples:t.energy_samples}}:{})};
}

module.exports={parseCursor,cursorFor,getActivity,EVENTS_SQL,TODAY_SQL};
