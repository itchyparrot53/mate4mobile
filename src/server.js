'use strict';

const http = require('http');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const { Pool, types } = require('pg');
const { getCurrencyCode } = require('../public/money');
const CURRENCY = getCurrencyCode(process.env.CURRENCY);
const { thinPoints, cleanRoute, averagePower } = require('./lib');
const { parseCursor, getActivity } = require('./activity');
const {sampleTelemetry,getBatterySeries,getChargingStats}=require('./insights');

// TeslaMate stores naive UTC in `timestamp without time zone` columns.
// Tell pg to read those as UTC instead of the server's local zone.
types.setTypeParser(1114, (s) => new Date(s.replace(' ', 'T') + 'Z'));

const PORT = parseInt(process.env.PORT || '8099', 10);
const HOST = process.env.HOST || '127.0.0.1';
const APP_PASS = process.env.APP_PASS || '';
const APP_SECRET = process.env.APP_SECRET || '';
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const CAR_ID = process.env.CAR_ID ? parseInt(process.env.CAR_ID, 10) : null;
const COOKIE = process.env.SESSION_COOKIE || 'tm_session';

if (!APP_PASS || APP_SECRET.length < 32) throw new Error('APP_PASS and a persistent APP_SECRET (at least 32 characters) are required');

const pool = new Pool({ max: 4, statement_timeout: 5000, query_timeout: 7000, options: '-c default_transaction_read_only=on' });
pool.on('error', (e) => console.error('[pg] idle client error:', e.message));

/* ---------------------------------------------------------------- auth ---- */

function sign(value) {
  return crypto.createHmac('sha256', APP_SECRET).update(value).digest('hex');
}

function issueToken(days = 30) {
  const exp = Date.now() + days * 864e5;
  return `${exp}.${sign(String(exp))}`;
}

function validToken(token) {
  if (typeof token !== 'string' || !/^\d{13}\.[a-f0-9]{64}$/.test(token)) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig) return false;
  const want = sign(exp);
  if (sig.length !== want.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return false;
  return Date.now() <= Number(exp);
}

// Only mark the cookie Secure when the client really is on HTTPS (directly or
// via the trusted loopback Caddy proxy). Over plain HTTP a
// Secure cookie would be silently dropped by the browser, breaking login.
function secureAttr(req) {
  const proto = trustedProxy(req) ? String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() : '';
  return process.env.COOKIE_SECURE === '1' || proto === 'https' || req.socket.encrypted ? '; Secure' : '';
}

function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie;
  if (!raw) return out;
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    try { out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); } catch { /* invalid cookie is unauthenticated */ }
  }
  return out;
}

const attempts = new Map();

function trustedProxy(req) {
  const address = String(req.socket.remoteAddress || '').replace(/^::ffff:/, '');
  const allowed = ['127.0.0.1', '::1', ...(process.env.TRUSTED_PROXY_IPS || '').split(',').map(ip=>ip.trim()).filter(Boolean)];
  return allowed.includes(address);
}

function failedLogin(ip) {
  for (const [key, value] of attempts) if (Date.now() > value.reset) attempts.delete(key);
  if (attempts.size > 10000) attempts.delete(attempts.keys().next().value);
  const rec = attempts.get(ip) || { count: 0, reset: Date.now() + 15 * 60e3 };
  rec.count++;
  attempts.set(ip, rec);
}

/* --------------------------------------------------------------- queries -- */

async function getCar(client) {
  const params = [];
  let where = '';
  if (CAR_ID) {
    params.push(CAR_ID);
    where = 'where c.id = $1';
  }
  const { rows } = await (client || pool).query(
    `select c.id, c.name, c.vin, c.model, c.marketing_name, c.exterior_color, c.efficiency::float8 as efficiency,
            s.unit_of_length::text   as unit_of_length,
            s.unit_of_temperature::text as unit_of_temperature,
            s.unit_of_pressure::text as unit_of_pressure,
            s.preferred_range::text  as preferred_range
       from cars c
       left join (select * from settings order by id limit 1) s on true
       ${where}
      order by c.id
      limit 1`,
    params
  );
  return rows[0] || null;
}

async function getSummary() {
  const car = await getCar();
  if (!car) return { car: null, reason: 'no_car' };

  const carId = car.id;
  const [stateQ, posQ, driveQ, chargeQ] = await Promise.all([
    pool.query(
      `select state::text as state, start_date
         from states
        where car_id = $1
        order by start_date desc
        limit 1`,
      [carId]
    ),
    pool.query(
      `select date, battery_level, usable_battery_level, odometer,
              ideal_battery_range_km::float8 as ideal_km,
              rated_battery_range_km::float8 as rated_km,
              est_battery_range_km::float8   as est_km,
              inside_temp::float8  as inside_c,
              outside_temp::float8 as outside_c,
              power, speed, elevation, latitude::float8 as latitude, longitude::float8 as longitude,
              is_climate_on, fan_status,
              driver_temp_setting::float8 as setpoint_c,
              tpms_pressure_fl::float8 as tpms_fl,
              tpms_pressure_fr::float8 as tpms_fr,
              tpms_pressure_rl::float8 as tpms_rl,
              tpms_pressure_rr::float8 as tpms_rr
         from positions
        where car_id = $1
        order by date desc, id desc
        limit 1`,
      [carId]
    ),
    pool.query(
      `select id, start_date from drives
        where car_id = $1 and end_date is null
        order by start_date desc limit 1`,
      [carId]
    ),
    pool.query(
      `select id, start_date from charging_processes
        where car_id = $1 and end_date is null
        order by start_date desc limit 1`,
      [carId]
    )
  ]);

  const pos = posQ.rows[0] || null;
  const stateRow = stateQ.rows[0] || null;
  const openDrive = driveQ.rows[0] || null;
  const openCharge = chargeQ.rows[0] || null;

  // Software version + last-24h state breakdown for the "vitals" card.
  const UTC_NOW = "(now() at time zone 'utc')";
  const [softwareQ, dayQ] = await Promise.all([
    pool.query(
      `select version, coalesce(end_date, start_date) as at
         from updates
        where car_id = $1
        order by coalesce(end_date, start_date) desc
        limit 1`,
      [carId]
    ),
    pool.query(
      `select state::text as state,
              coalesce(sum(extract(epoch from (
                least(coalesce(end_date, ${UTC_NOW}), ${UTC_NOW})
                - greatest(start_date, ${UTC_NOW} - interval '24 hours')
              )) / 60), 0)::int as mins
         from states
        where car_id = $1
          and coalesce(end_date, ${UTC_NOW}) > ${UTC_NOW} - interval '24 hours'
          and start_date < ${UTC_NOW}
        group by state`,
      [carId]
    )
  ]);

  const day = { asleep: 0, online: 0, offline: 0 };
  for (const row of dayQ.rows) {
    if (row.state in day) day[row.state] = row.mins;
  }
  const software = softwareQ.rows[0]
    ? { version: softwareQ.rows[0].version, at: softwareQ.rows[0].at }
    : null;

  let charging = null;
  let chargeRow = null;
  if (openCharge) {
    const [latest, first] = await Promise.all([
      pool.query(
        `select date, charger_power, charge_energy_added::float8 as added_kwh,
                battery_level, usable_battery_level, fast_charger_present,
                conn_charge_cable, charger_voltage, charger_actual_current,
                rated_battery_range_km::float8 as rated_km, ideal_battery_range_km::float8 as ideal_km
           from charges
          where charging_process_id = $1
          order by date desc limit 1`,
        [openCharge.id]
      ),
      pool.query(
        `select battery_level, charge_energy_added::float8 as added_kwh, date
           from charges
          where charging_process_id = $1
          order by date asc limit 1`,
        [openCharge.id]
      )
    ]);
    chargeRow = latest.rows[0] || null;
    const firstRow = first.rows[0] || null;
    charging = {
      active: true,
      at: chargeRow ? chargeRow.date : null,
      startedAt: openCharge.start_date,
      powerKw: chargeRow ? chargeRow.charger_power : null,
      addedKwh: chargeRow ? chargeRow.added_kwh : null,
      startLevel: firstRow ? firstRow.battery_level : null,
      currentLevel: chargeRow ? chargeRow.battery_level : null,
      fast: chargeRow ? chargeRow.fast_charger_present : null,
      cable: chargeRow ? chargeRow.conn_charge_cable : null,
      voltage: chargeRow ? chargeRow.charger_voltage : null,
      amps: chargeRow ? chargeRow.charger_actual_current : null
    };
  }

  let status = stateRow ? stateRow.state : 'unknown';
  if (openDrive) status = 'driving';
  else if (openCharge) status = 'charging';

  const preferred = car.preferred_range === 'ideal' ? 'ideal' : 'rated';
  let rangeKm = pos
    ? (preferred === 'ideal' ? pos.ideal_km : pos.rated_km) ?? pos.est_km ?? pos.ideal_km
    : null;

  const at = pos ? pos.date : null;
  const newerCharge = chargeRow && (!at || chargeRow.date > at);
  const batteryAt = newerCharge ? chargeRow.date : at;
  if (newerCharge) rangeKm = (preferred === 'ideal' ? chargeRow.ideal_km : chargeRow.rated_km) ?? rangeKm;
  const stale = batteryAt ? Date.now() - batteryAt.getTime() > 15 * 60e3 : true;
  let location = null;
  if (pos && Number.isFinite(pos.latitude) && Number.isFinite(pos.longitude)) {
    // Reuse TeslaMate's recorded addresses, only if within 100m. No external geocoding.
    const address = await pool.query(`select display_name,
        power((latitude::float8 - $1) * 111320, 2) + power((longitude::float8 - $2) * 111320 * cos(radians($1)), 2) as distance_sq
        from addresses where latitude between $1 - 0.002 and $1 + 0.002
        and longitude between $2 - 0.02 and $2 + 0.02
        order by distance_sq limit 1`, [pos.latitude, pos.longitude]);
    const nearest = address.rows[0];
    const geofence=await pool.query(`select name from geofences where
      power((latitude::float8-$1)*111320,2)+power((longitude::float8-$2)*111320*cos(radians($1)),2)<=power(radius,2)
      order by radius,id limit 1`,[pos.latitude,pos.longitude]);
    location = { lat: pos.latitude, lng: pos.longitude, at, name:geofence.rows[0]?.name||null,
      address: nearest && nearest.distance_sq <= 10000 ? nearest.display_name : null };
  }

  return {
    generatedAt: new Date(),
    demo: process.env.PGDATABASE === 'teslamate_fixture',
    car: {
      id: car.id,
      name: car.name || car.vin || 'Tesla',
      model: car.model || car.marketing_name || '',
      exteriorColor: car.exterior_color
    },
    settings: {
      units: car.unit_of_length || 'km',
      temperature: car.unit_of_temperature || 'C',
      preferredRange: preferred,
      timezone: process.env.TZ || 'Europe/London',
      currency: CURRENCY
    },
    status: {
      state: status,
      since: openDrive ? openDrive.start_date : openCharge ? openCharge.start_date : stateRow ? stateRow.start_date : null,
      stale
    },
    telemetry: pos
      ? {
          at,
          batteryAt,
          battery: newerCharge ? chargeRow.battery_level ?? pos.battery_level : pos.battery_level,
          usableBattery: newerCharge ? chargeRow.usable_battery_level ?? pos.usable_battery_level : pos.usable_battery_level,
          odometerKm: pos.odometer,
          rangeKm,
          insideC: pos.inside_c,
          outsideC: pos.outside_c,
          powerKw: pos.power,
          speedKmh: pos.speed,
          elevationM: pos.elevation
        }
      : null,
    charging,
    location,
    vitals: pos
      ? {
          climate: {
            on: !!pos.is_climate_on,
            setpointC: pos.setpoint_c,
            fan: pos.fan_status,
            insideC: pos.inside_c
          },
          tpms: {
            fl: pos.tpms_fl,
            fr: pos.tpms_fr,
            rl: pos.tpms_rl,
            rr: pos.tpms_rr,
            unit: car.unit_of_pressure || 'bar'
          }
        }
      : null,
    software,
    day
  };
}

async function getDrives(limit, offset = 0) {
  const car = await getCar();
  if (!car) return [];
  const { rows } = await pool.query(
    `select d.id, d.start_date, d.end_date,
            d.distance::float8 as distance_km,
            d.duration_min,
            d.start_ideal_range_km::float8 as start_ideal_km,
            d.end_ideal_range_km::float8   as end_ideal_km,
            d.start_rated_range_km::float8 as start_rated_km,
            d.end_rated_range_km::float8   as end_rated_km,
            d.ascent, d.descent, d.speed_max,
            d.outside_temp_avg::float8 as outside_c,
            sa.display_name as start_address,
            ea.display_name as end_address, sg.name as start_place, eg.name as end_place,
            sp.battery_level as start_level, ep.battery_level as end_level
       from drives d
       left join addresses sa on sa.id = d.start_address_id
       left join addresses ea on ea.id = d.end_address_id
       left join geofences sg on sg.id=d.start_geofence_id
       left join geofences eg on eg.id=d.end_geofence_id
       left join positions sp on sp.id=d.start_position_id
       left join positions ep on ep.id=d.end_position_id
      where d.car_id = $1 and d.end_date is not null
      order by d.start_date desc
      limit $2 offset $3`,
    [car.id, limit, offset]
  );
  return rows.map((r) => ({
    id: r.id,
    start: r.start_date,
    end: r.end_date,
    distanceKm: r.distance_km,
    durationMin: r.duration_min,
    startPlace:r.start_place, endPlace:r.end_place, startLevel:r.start_level, endLevel:r.end_level,
    startAddress: r.start_address,
    endAddress: r.end_address,
    ascent: r.ascent,
    descent: r.descent,
    speedMax: r.speed_max,
    outsideC: r.outside_c,
    ratedUsedKm:
      r.start_rated_km != null && r.end_rated_km != null
        ? Number((r.start_rated_km - r.end_rated_km).toFixed(1))
        : null
  }));
}

async function getCharges(limit, offset = 0, days = null) {
  const car = await getCar();
  if (!car) return [];
  const { rows } = await pool.query(
    `select cp.id, cp.start_date, cp.end_date,
            cp.charge_energy_added::float8 as added_kwh,
            cp.charge_energy_used::float8  as used_kwh,
            cp.start_battery_level, cp.end_battery_level,
            cp.duration_min, cp.cost::float8 as cost,
            a.display_name as address, g.name as place, g.cost_per_unit::float8 as rate, g.billing_type::text as billing, g.session_fee::float8 as fee
       from charging_processes cp
       left join addresses a on a.id = cp.address_id
       left join geofences g on g.id=cp.geofence_id
      where cp.car_id = $1 and cp.end_date is not null
        and ($4::int is null or cp.end_date >= ((date_trunc('day',now() at time zone $5)-(($4::int-1)*interval '1 day')) at time zone $5) at time zone 'UTC')
      order by cp.end_date desc, cp.id desc
      limit $2 offset $3`,
    [car.id, limit, offset, days, process.env.TZ||'Europe/London']
  );
  return rows.map((r) => ({
    id: r.id,
    start: r.start_date,
    end: r.end_date,
    addedKwh: r.added_kwh,
    usedKwh: r.used_kwh,
    startLevel: r.start_battery_level,
    endLevel: r.end_battery_level,
    durationMin: r.duration_min,
    cost: r.cost,
    place:r.place, rate:r.rate, billing:r.billing, fee:r.fee,
    address: r.address
  }));
}

async function getBatteryHealth() {
  const car = await getCar();
  if (!car) return null;

  // Implied full range: rated range at the current SOC extrapolated to 100%.
  // Only positions above 20% SOC are used - extrapolating from very low SOC
  // amplifies rounding error.
  const trend = await pool.query(
    `select date_trunc('day', date) as day,
            percentile_cont(0.5) within group (order by rated_battery_range_km / nullif(battery_level, 0) * 100)::float8 as full_range_km
       from positions
      where car_id = $1
        and rated_battery_range_km is not null
        and battery_level > 20
      group by 1
      order by 1`,
    [car.id]
  );

  // Implied usable capacity from completed charges: kWh added per unit of SOC.
  const capacity = await pool.query(
    `select percentile_cont(0.5) within group (
              order by charge_energy_added / nullif(end_battery_level - start_battery_level, 0) * 100
            )::float8 as kwh,
            count(*)::int as samples,
            percentile_cont(0.5) within group (
              order by charge_energy_added / nullif(charge_energy_used, 0)
            )::float8 as charge_efficiency
       from charging_processes
      where car_id = $1
        and end_date is not null
        and charge_energy_added > 1
        and end_battery_level > start_battery_level + 5`,
    [car.id]
  );

  const coverage=await pool.query(`select min(date) as first,max(date) as last from positions where car_id=$1`,[car.id]);
  const firstReading=coverage.rows[0]?.first,lastReading=coverage.rows[0]?.last;
  const historyDays=firstReading&&lastReading?Math.max(0,(lastReading-firstReading)/864e5):0;
  const points = trend.rows.map((r) => ({ at: r.day, fullRangeKm: r.full_range_km }));
  const latest = points.length ? points[points.length - 1].fullRangeKm : null;
  const first = points.length ? points[0].fullRangeKm : null;
  const c = capacity.rows[0] || {};

  return {
    firstReading,lastReading,historyDays,consumptionReady:Number.isFinite(car.efficiency)&&car.efficiency>0,
    baselineReady:historyDays>=14 && (c.samples||0)>=5,
    fullRangeKm: latest,
    changeKm:
      latest != null && first != null && points.length > 1
        ? Number((latest - first).toFixed(1))
        : null,
    capacityKwh: c.kwh != null ? Number(c.kwh.toFixed(1)) : null,
    capacitySamples: c.samples || 0,
    chargeEfficiencyPct:
      c.charge_efficiency != null ? Number((c.charge_efficiency * 100).toFixed(1)) : null,
    trend: points,
    firstSample: points.length ? points[0].at : null
  };
}

async function getDriveDetail(id) {
  const car = await getCar();
  if (!car) return null;
  const { rows } = await pool.query(
    `select d.id, d.start_date, d.end_date,
            d.distance::float8 as distance_km, d.duration_min,
            d.start_km, d.end_km, d.ascent, d.descent,
            d.speed_max, d.power_max, d.power_min,
            d.outside_temp_avg::float8 as outside_c,
            d.inside_temp_avg::float8  as inside_c,
            d.start_ideal_range_km::float8 as start_ideal,
            d.end_ideal_range_km::float8   as end_ideal,
            d.start_rated_range_km::float8 as start_rated,
            d.end_rated_range_km::float8   as end_rated,
            sa.display_name as start_address,
            ea.display_name as end_address, sg.name as start_place, eg.name as end_place,
            sp.battery_level as start_level, ep.battery_level as end_level
       from drives d
       left join addresses sa on sa.id = d.start_address_id
       left join addresses ea on ea.id = d.end_address_id
       left join geofences sg on sg.id=d.start_geofence_id
       left join geofences eg on eg.id=d.end_geofence_id
       left join positions sp on sp.id=d.start_position_id
       left join positions ep on ep.id=d.end_position_id
      where d.id = $1 and d.car_id = $2`,
    [id, car.id]
  );
  const r = rows[0];
  if (!r) return null;

  // Route polyline for the map, thinned so a long drive doesn't ship thousands
  // of points to a phone.
  const routeQ = await pool.query(
    `select latitude::float8 as lat, longitude::float8 as lng, date as at,
         speed as "speedKmh", power as "powerKw", battery_level as level
       from positions
      where drive_id = $1
      order by date`,
    [id]
  );
  const route = cleanRoute(routeQ.rows);

  const durationMin = r.end_date ? (r.end_date-r.start_date)/60000 : r.duration_min || 0;
  return {
    id: r.id,
    start: r.start_date,
    end: r.end_date,
    distanceKm: r.distance_km,
    durationMin: r.duration_min,
    avgSpeedKmh: durationMin > 0 ? Number((r.distance_km / (durationMin / 60)).toFixed(1)) : null,
    speedMax: r.speed_max,
    powerMax: r.power_max,
    powerMin: r.power_min,
    startKm: r.start_km,
    endKm: r.end_km,
    ascent: r.ascent,
    descent: r.descent,
    outsideC: r.outside_c,
    insideC: r.inside_c,
    startIdealKm: r.start_ideal,
    endIdealKm: r.end_ideal,
    startRatedKm: r.start_rated,
    endRatedKm: r.end_rated,
    ratedUsedKm:
      r.start_rated != null && r.end_rated != null
        ? Number((r.start_rated - r.end_rated).toFixed(1))
        : null,
    startPlace:r.start_place, endPlace:r.end_place, startLevel:r.start_level, endLevel:r.end_level,
    startAddress: r.start_address,
    endAddress: r.end_address,
    telemetry:sampleTelemetry(routeQ.rows,{limit:600,keys:['speedKmh','powerKw','level']}),
    route
  };
}

async function getChargeDetail(id) {
  const car = await getCar();
  if (!car) return null;
  const { rows } = await pool.query(
    `select cp.id, cp.start_date, cp.end_date,
            cp.charge_energy_added::float8 as added_kwh,
            cp.charge_energy_used::float8  as used_kwh,
            cp.start_battery_level, cp.end_battery_level,
            cp.duration_min, cp.cost::float8 as cost,
            cp.start_rated_range_km::float8 as start_rated,
            cp.end_rated_range_km::float8   as end_rated,
            a.display_name as address, g.name as place, g.cost_per_unit::float8 as rate, g.billing_type::text as billing, g.session_fee::float8 as fee
       from charging_processes cp
       left join addresses a on a.id = cp.address_id
       left join geofences g on g.id=cp.geofence_id
      where cp.id = $1 and cp.car_id = $2`,
    [id, car.id]
  );
  const r = rows[0];
  if (!r) return null;

  const curve = await pool.query(
    `select battery_level, usable_battery_level, charger_power,
            charger_voltage, charger_actual_current,
            charge_energy_added::float8 as added_kwh,
            fast_charger_present, date
       from charges
      where charging_process_id = $1
      order by date`,
    [id]
  );

  const points = curve.rows.map((c) => ({
    level: c.battery_level,
    usable: c.usable_battery_level,
    powerKw: c.charger_power,
    voltage: c.charger_voltage,
    amps: c.charger_actual_current,
    addedKwh: c.added_kwh,
    fast: c.fast_charger_present,
    at: c.date
  }));

  const powers = points.map((p) => p.powerKw).filter((x) => x != null);
  const efficiency =
    r.added_kwh > 0 && r.used_kwh > 0
      ? Number(((r.added_kwh / r.used_kwh) * 100).toFixed(1))
      : null;

  return {
    id: r.id,
    start: r.start_date,
    end: r.end_date,
    addedKwh: r.added_kwh,
    usedKwh: r.used_kwh,
    startLevel: r.start_battery_level,
    endLevel: r.end_battery_level,
    durationMin: r.duration_min,
    cost: r.cost,
    startRatedKm: r.start_rated,
    endRatedKm: r.end_rated,
    place:r.place, rate:r.rate, billing:r.billing, fee:r.fee,
    address: r.address,
    fast: points.some((p) => p.fast === true) ? true : points.some((p) => p.fast === false) ? false : null,
    maxPowerKw: powers.length ? Math.max(...powers) : null,
    avgPowerKw: averagePower(points),
    efficiencyPct: efficiency,
    curve: thinPoints(points, 600)
  };
}

async function getSeries(hours) {
  const car=await getCar();
  return getBatterySeries(pool,car?.id,hours);
}

async function getStats(days) {
  const car = await getCar();
  if (!car) return null;
  const [d, c, a, daily] = await Promise.all([
    pool.query(
      `select count(*)::int as drives,
              coalesce(sum(distance)::float8, 0) as km,
              coalesce(sum(duration_min)::int, 0) as minutes,
              coalesce(sum(ascent)::int, 0) as ascent
         from drives
        where car_id = $1 and end_date is not null
          and end_date >= ((date_trunc('day',now() at time zone $3)-(($2::int-1)*interval '1 day')) at time zone $3) at time zone 'UTC'
          and end_date <= (now() at time zone 'UTC')`,
      [car.id, days, process.env.TZ||'Europe/London']
    ),
    pool.query(
      `select count(*)::int as sessions,
              coalesce(sum(charge_energy_added)::float8, 0) as kwh,
              sum(cost)::float8 as cost,
              count(cost)::int as cost_samples,
              coalesce(avg(charge_energy_added)::float8, 0) as avg_kwh
         from charging_processes
        where car_id = $1 and end_date is not null
          and end_date >= ((date_trunc('day',now() at time zone $3)-(($2::int-1)*interval '1 day')) at time zone $3) at time zone 'UTC'
          and end_date <= (now() at time zone 'UTC')`,
      [car.id, days, process.env.TZ||'Europe/London']
    ),
    pool.query(
      `select
         (select count(*) from drives where car_id = $1 and end_date is not null)::int as drives,
         (select coalesce(sum(distance), 0)::float8 from drives where car_id = $1 and end_date is not null) as km,
         (select count(*) from charging_processes where car_id = $1 and end_date is not null)::int as sessions,
         (select coalesce(sum(charge_energy_added), 0)::float8 from charging_processes where car_id = $1 and end_date is not null) as kwh,
         (select sum(cost)::float8 from charging_processes where car_id = $1 and end_date is not null) as cost,
         (select coalesce(max(odometer), 0)::float8 from positions where car_id = $1) as odometer_km,
         (select count(*) from updates where car_id = $1)::int as updates`,
      [car.id]
    ),
    pool.query(`select date_trunc('day',end_date at time zone 'UTC' at time zone $3) at time zone $3 as at,
        sum(charge_energy_added)::float8 as kwh, sum(cost)::float8 as cost
        from charging_processes where car_id = $1 and end_date is not null
        and end_date >= ((date_trunc('day',now() at time zone $3)-(($2::int-1)*interval '1 day')) at time zone $3) at time zone 'UTC'
          and end_date <= (now() at time zone 'UTC')
        group by 1 order by 1`, [car.id, days, process.env.TZ||'Europe/London'])
  ]);
  return {
    days,
    drives: d.rows[0],
    charging: c.rows[0],
    allTime: a.rows[0],
    daily: daily.rows
  };
}

/* -------------------------------------------------------------- plumbing -- */

function json(res, code, body, headers = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(payload),
    ...headers
  });
  res.end(payload);
}

function readBody(req, limit = 4096) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

async function serveStatic(req, res, pathname) {
  let rel;
  try { rel = decodeURIComponent(pathname); } catch { return json(res, 400, { error: 'invalid path' }); }
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.resolve(PUBLIC_DIR, '.' + rel);
  if (!file.startsWith(PUBLIC_DIR + path.sep) || rel.includes('\0') || rel.split(/[\\/]/).some(p => p.startsWith('.'))) {
    res.writeHead(403).end('forbidden');
    return;
  }
  try {
    const stat = await fsp.stat(file);
    if (!stat.isFile()) throw new Error('not a file');
    const ext = path.extname(file).toLowerCase();
    const immutable = ['.png', '.webp', '.woff2'].includes(ext);
    const headers = {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': immutable ? 'public, max-age=3600' : 'no-cache'
    };
    if (ext === '.js' && rel === '/sw.js') headers['Cache-Control'] = 'no-cache';
    res.writeHead(200, headers);
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found');
  }
}

function authed(req) {
  return validToken(parseCookies(req)[COOKIE]);
}

const server = http.createServer(async (req, res) => {
  let pathname = '';
  const ip = trustedProxy(req) ? String(req.headers['x-forwarded-for'] || req.socket.remoteAddress).split(',').pop().trim() : req.socket.remoteAddress || 'unknown';
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // OSM requires a valid referring origin for browser tile requests.
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://tile.openstreetmap.org; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");

  // Access log (no credentials, no query strings) so failures are diagnosable.
  res.on('finish', () => {
    console.log(`[req] ${req.method} ${pathname} -> ${res.statusCode} from ${ip}`);
  });

  try {
    const url = new URL(req.url, 'http://localhost');
    pathname = url.pathname;
    if (!['GET', 'HEAD', 'POST'].includes(req.method)) return json(res, 405, { error: 'method not allowed' });
    if (pathname.startsWith('/api/') && !['/api/login','/api/logout'].includes(pathname) && req.method !== 'GET') return json(res, 405, { error: 'method not allowed' });
    if (['/api/login','/api/logout'].includes(pathname) && req.method !== 'POST') return json(res, 405, { error: 'method not allowed' });
    if (req.method === 'POST' && req.headers.origin) {
      let sameOrigin = false;
      try { sameOrigin = new URL(req.headers.origin).host === req.headers.host; } catch { /* reject malformed origins */ }
      if (!sameOrigin) return json(res, 403, { error: 'origin not allowed' });
    }
    if (pathname === '/healthz') {
      await pool.query('select 1');
      return json(res, 200, { ok: true, version: '2.4.1', ts: new Date().toISOString() });
    }

    if (pathname === '/api/login' && req.method === 'POST') {
      const attempt = attempts.get(ip);
      if (attempt && attempt.count >= 5 && Date.now() < attempt.reset) return json(res, 429, { error: 'try again later' }, { 'Retry-After': String(Math.ceil((attempt.reset - Date.now()) / 1000)) });
      const body = await readBody(req);
      let pass = '';
      try {
        const parsed = JSON.parse(body);
        if (!parsed || typeof parsed.pass !== 'string') return json(res, 400, { error: 'pass must be a string' });
        pass = parsed.pass;
      } catch {
        return json(res, 400, { error: 'bad request' });
      }
      const a = Buffer.from(String(pass));
      const b = Buffer.from(APP_PASS);
      const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
      if (!ok) { failedLogin(ip); return json(res, 401, { error: 'wrong passphrase' }); }
      attempts.delete(ip);
      return json(res, 200, { ok: true }, {
        'Set-Cookie': `${COOKIE}=${issueToken()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${30 * 86400}${secureAttr(req)}`
      });
    }

    if (pathname === '/api/logout' && req.method === 'POST') {
      return json(res, 200, { ok: true }, {
        'Set-Cookie': `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secureAttr(req)}`
      });
    }

    if (pathname.startsWith('/api/')) {
      if (pathname !== '/api/session' && !authed(req)) {
        return json(res, 401, { error: 'unauthorized' });
      }
      if (pathname === '/api/session') {
        return json(res, 200, { authenticated: authed(req) });
      }
      if (pathname === '/api/health') {
        return json(res, 200, await getBatteryHealth());
      }
      if (pathname === '/api/summary') {
        return json(res, 200, await getSummary());
      }
      if (pathname === '/api/activity') {
        let cursor;
        try { cursor=parseCursor(url.searchParams.get('before')); } catch { return json(res,400,{error:'invalid activity cursor'}); }
        const limit=Math.min(Math.max(parseInt(url.searchParams.get('limit')||'25',10)||25,1),100);
        const car=await getCar();
        return json(res,200,await getActivity(pool,car?.id,{limit,cursor,timezone:process.env.TZ||'Europe/London'}));
      }
      if (pathname === '/api/drives') {
        const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 1), 100);
        const offset = Math.min(Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0), 1000000);
        const rows = await getDrives(limit + 1, offset);
        return json(res, 200, { drives: rows.slice(0, limit), hasMore: rows.length > limit });
      }
      if (pathname === '/api/charges') {
        const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 1), 100);
        const offset = Math.min(Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0), 1000000);
        const rawDays=url.searchParams.get('days');
        const days=rawDays?Math.min(Math.max(parseInt(rawDays,10)||30,1),365):null;
        const rows = await getCharges(limit + 1, offset,days);
        return json(res, 200, { charges: rows.slice(0, limit), hasMore: rows.length > limit });
      }
      if (pathname === '/api/series') {
        const hours = Math.min(Math.max(parseInt(url.searchParams.get('hours') || '24', 10) || 24, 1), 720);
        return json(res, 200, await getSeries(hours));
      }
      if(pathname === '/api/charging-stats') {
        const days=Math.min(Math.max(parseInt(url.searchParams.get('days')||'30',10)||30,1),365);
        const car=await getCar();
        return json(res,200,await getChargingStats(pool,car?.id,days,process.env.TZ||'Europe/London'));
      }
      if (pathname === '/api/stats') {
        const days = Math.min(Math.max(parseInt(url.searchParams.get('days') || '30', 10) || 30, 1), 365);
        return json(res, 200, await getStats(days));
      }
      const detail = pathname.match(/^\/api\/(drives|charges)\/(\d+)$/);
      if (detail) {
        const id = parseInt(detail[2], 10);
        const payload = detail[1] === 'drives'
          ? await getDriveDetail(id)
          : await getChargeDetail(id);
        if (!payload) return json(res, 404, { error: 'not found' });
        return json(res, 200, payload);
      }

      return json(res, 404, { error: 'no such endpoint' });
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return json(res, 405, { error: 'method not allowed' });
    }
    return await serveStatic(req, res, pathname);
  } catch (err) {
    console.error('[error]', pathname, err.message);
    if (!res.headersSent) json(res, pathname === '/healthz' ? 503 : 500, { error: 'temporarily unavailable' });
    else res.end();
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[tm-mobile] listening on ${HOST}:${server.address().port}`);
});

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    console.log(`[tm-mobile] ${sig} - closing`);
    server.close(() => pool.end().then(() => process.exit(0)));
    setTimeout(() => process.exit(0), 5000).unref();
  });
}
