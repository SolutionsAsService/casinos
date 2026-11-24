// The shared data kernel. It reproduces what assets/common.js does for the baseline pages (same merge, same rules), as an ES module that every
// framework edition imports, so no edition can drift from the others. test/shared.test.mjs pins the numbers.
export function merge(casinosJson, ledgerJson) {
  const d = structuredClone(casinosJson); const L = ledgerJson || { sources: [], venues: {} }; const S = {};
  L.sources.forEach((s, i) => { s.n = i + 1; S[s.id] = s; });
  d.casinos.forEach(c => {
    const v = L.venues[c.id] || {}; c.ledger = v;
    c.names = v.names && v.names.length ? v.names : [{ name: c.name, from: c.opened, to: c.closed, operator: '', note: '', sources: [] }];
    c.level = v.label && v.label.level ? v.label.level : c.mob.level;
    if (c.state === 'NY' && /Saratoga/.test(c.city)) c.hotspot = 'Saratoga Springs';
    c.sourced = !!(v.label && v.label.sources && v.label.sources.length);
    if (v.opened != null) c.opened = v.opened;
    if (v.closed !== undefined && v.opened != null) c.closed = v.closed;
  });
  return { data: d, ledger: L, S };
}
/** Fetch everything an edition needs. `base` is the path from the page to the repository root (for example '../../'). */
export async function loadAll(base = '../../') {
  const j = u => fetch(base + u).then(r => { if (!r.ok) throw new Error(`${u}: HTTP ${r.status}`); return r.json(); });
  const [c, l, dir, us] = await Promise.all([j('data/casinos.json'), j('data/ledger.json').catch(() => null), j('data/directory.json').catch(() => ({ venues: [] })), j('vendor/states-10m.json')]);
  return { ...merge(c, l), directory: dir, us };
}
