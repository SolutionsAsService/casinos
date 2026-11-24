import { geoAlbersUsa, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
export const W = 975, H = 610;
/** Project venues onto the 975x610 map and push overlapping markers apart (the same relaxation as the baseline page). */
export function layout(us, venues) {
  const nation = feature(us, us.objects.nation);
  const proj = geoAlbersUsa().fitExtent([[8, 8], [W - 8, H - 8]], nation); const path = geoPath(proj);
  const states = feature(us, us.objects.states).features.map(f => path(f)).filter(Boolean);
  const placed = []; const pos = {};
  for (const c of venues) { const p = proj([c.lon, c.lat]); if (p) { pos[c.id] = { x: p[0], y: p[1] }; placed.push(c); } }
  const ids = placed.map(c => c.id), R = 7.5;
  for (let it = 0; it < 60; it += 1) for (let a = 0; a < ids.length; a += 1) for (let b = a + 1; b < ids.length; b += 1) {
    const p = pos[ids[a]], q = pos[ids[b]]; let dx = q.x - p.x, dy = q.y - p.y; const d = Math.sqrt(dx * dx + dy * dy) || .01;
    if (d < R * 2) { const m = (R * 2 - d) / 2; let ux = dx / d, uy = dy / d; if (d < .02) { ux = 1; uy = 0; } p.x -= ux * m * .5; p.y -= uy * m * .5; q.x += ux * m * .5; q.y += uy * m * .5; }
  }
  return { states, pos, placed, project: proj };
}
