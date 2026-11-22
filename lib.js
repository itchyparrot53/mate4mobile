'use strict';

function thinPoints(points, limit = 250) {
  if (limit <= 0) return [];
  if (limit === 1) return points.length ? [points[points.length-1]] : [];
  if (points.length <= limit) return points;
  return Array.from({ length: limit }, (_, i) => points[Math.round(i * (points.length - 1) / (limit - 1))]);
}

function cleanRoute(rows) {
  return thinPoints(rows.filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180).map(p => [p.lat, p.lng]));
}

function averagePower(points) {
  let energy = 0, duration = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const seconds = (new Date(b.at) - new Date(a.at)) / 1000;
    if (seconds > 0 && Number.isFinite(a.powerKw) && Number.isFinite(b.powerKw)) {
      energy += (a.powerKw + b.powerKw) / 2 * seconds;
      duration += seconds;
    }
  }
  return duration ? Number((energy / duration).toFixed(1)) : null;
}

module.exports = { thinPoints, cleanRoute, averagePower };
