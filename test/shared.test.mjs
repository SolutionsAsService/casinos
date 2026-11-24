import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { merge } from '../src/shared/data.js';
import { LEVELS, isOpen, symbolPath, SHAPE } from '../src/shared/levels.js';
const read = p => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const { data, S } = merge(read('data/casinos.json'), read('data/ledger.json'));
test('the merged dataset is the one the baseline pages show', () => {
  assert.equal(data.casinos.length, 68);
  const n = Object.fromEntries(LEVELS.map(l => [l, data.casinos.filter(c => c.level === l).length]));
  assert.deepEqual(n, { documented: 4, alleged: 20, none: 33, unsupported: 11 });
});
test('every citation resolves to a verified source with a URL', () => {
  for (const c of data.casinos) for (const id of (c.ledger.label && c.ledger.label.sources) || []) { assert.ok(S[id], `${c.name}: unknown source ${id}`); assert.match(S[id].url, /^https?:\/\//); }
});
test('a documented label always has a source', () => { for (const c of data.casinos.filter(x => x.level === 'documented')) assert.ok(c.sourced, `${c.name} is documented without a source`); });
test('each level has its own shape, so colour is never the only cue', () => { assert.equal(new Set(LEVELS.map(l => SHAPE[l])).size, 4); for (const l of LEVELS) assert.match(symbolPath(l, 6), /^M/); });
test('open years follow opened/closed', () => { assert.ok(isOpen({ opened: 1950, closed: null }, 1960)); assert.ok(!isOpen({ opened: 1950, closed: 1960 }, 1960)); });
test('the directory never labels a venue and keeps no people as operators', () => {
  const d = read('data/directory.json'); assert.ok(d.venues.length > 200); assert.match(d.note, /NOT assessed/);
  for (const v of d.venues) { assert.ok(!('level' in v) && !('mob' in v), `${v.name} carries a label`); assert.ok(Number.isFinite(v.lat) && Number.isFinite(v.lon)); }
});
