// Builds data/directory.json: US casinos that have a Wikidata record with coordinates (CC0), kept apart from the researched venues.
// A directory venue has NOT been assessed for organised-crime ties: the site never labels it. Only company operators are kept (no people).
import { writeFile, readFile } from 'node:fs/promises';
const UA = 'LedgerOfTheHouseBuilder/0.1 (https://github.com/SolutionsAsService/casinos; static dataset snapshot)';
async function q(query) { for (let k = 0; k < 4; k += 1) { const r = await fetch('https://query.wikidata.org/sparql', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/sparql-results+json', 'User-Agent': UA }, body: new URLSearchParams({ query }) }); if (r.ok) return (await r.json()).results.bindings; if (r.status === 429 || r.status >= 500) { await new Promise(x => setTimeout(x, 4000 * (k + 1))); continue; } throw new Error(r.status); } throw new Error('retries'); }
const lab = (v, a, b) => `OPTIONAL { ${v} rdfs:label ${a}. FILTER(LANG(${a})="en") } OPTIONAL { ${v} rdfs:label ${b}. FILTER(LANG(${b})="mul") }`;
const base = await q(`SELECT ?c ?l1 ?l2 ?coord ?inc ?dis ?sl1 ?sl2 ?site WHERE { ?c wdt:P31/wdt:P279* wd:Q133215; wdt:P17 wd:Q30; wdt:P625 ?coord. OPTIONAL{?c wdt:P571 ?inc} OPTIONAL{?c wdt:P576 ?dis} OPTIONAL{?c wdt:P856 ?site}
  OPTIONAL{?c wdt:P131* ?s. ?s wdt:P31 wd:Q35657. ${lab('?s', '?sl1', '?sl2')}} ${lab('?c', '?l1', '?l2')} }`);
const ops = await q(`SELECT ?c ?o ?ol1 ?ol2 ?p WHERE { ?c wdt:P31/wdt:P279* wd:Q133215; wdt:P17 wd:Q30. { ?c wdt:P137 ?o. BIND("operator" AS ?p) } UNION { ?c wdt:P127 ?o. BIND("owner" AS ?p) } FILTER NOT EXISTS { ?o wdt:P31 wd:Q5 } ${lab('?o', '?ol1', '?ol2')} }`);
const id = u => u.split('/').pop(); const v = (r, k) => r[k]?.value; const yr = s => (s ? Number(s.slice(0, 4)) : null);
const by = new Map();
for (const r of base) { const k = id(v(r, 'c')); const name = v(r, 'l1') || v(r, 'l2'); if (!name || /^Q\d+$/.test(name)) continue; const m = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(v(r, 'coord')); if (!m) continue;
  const e = by.get(k) || { qid: k, name, lon: +(+m[1]).toFixed(4), lat: +(+m[2]).toFixed(4), opened: yr(v(r, 'inc')), closed: yr(v(r, 'dis')), state: v(r, 'sl1') || v(r, 'sl2') || '', site: v(r, 'site') || '', operators: [] }; if (!e.state) e.state = v(r, 'sl1') || v(r, 'sl2') || ''; by.set(k, e); }
for (const r of ops) { const e = by.get(id(v(r, 'c'))); const n = v(r, 'ol1') || v(r, 'ol2'); if (e && n && !/^Q\d+$/.test(n) && !e.operators.some(o => o.name === n)) e.operators.push({ name: n, role: v(r, 'p') }); }
// drop records that are already researched venues (same normalised name or within 1.5 km)
const mine = JSON.parse(await readFile(new URL('../data/casinos.json', import.meta.url), 'utf8')).casinos;
const norm = s => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\b(hotel|casino|resort|and|the|las vegas|atlantic city)\b/g, '').trim();
const km = (a, b) => { const R = 6371, d = Math.PI / 180, x = (b.lon - a.lon) * d * Math.cos((a.lat + b.lat) / 2 * d), y = (b.lat - a.lat) * d; return R * Math.hypot(x, y); };
const out = [...by.values()].filter(d => !mine.some(m => norm(m.name) && norm(m.name) === norm(d.name) || km(m, d) < 0.3 && (norm(m.name).includes(norm(d.name)) || norm(d.name).includes(norm(m.name))))).sort((a, b) => a.state.localeCompare(b.state) || a.name.localeCompare(b.name));
await writeFile(new URL('../data/directory.json', import.meta.url), JSON.stringify({ generated: new Date().toISOString().slice(0, 10), source: { name: 'Wikidata', license: 'CC0 1.0', url: 'https://www.wikidata.org', query: 'instance of casino (or a subclass), country United States, with coordinates; company operators and owners only' }, note: 'Directory venues are NOT assessed for organised-crime ties and carry no label.', venues: out }, null, 0));
console.log('directory venues', out.length, 'of', by.size, 'Wikidata casinos;', out.filter(d => d.opened).length, 'with an opening year;', out.filter(d => d.operators.length).length, 'with an operator');
