# Formats: seventeen editions, one framework each

Interpretation of the owner's brief ("make it seventeen format, one at a time, we redo them as different JS frameworks"): seventeen presentations of the same verified data, each rebuilt in a different framework, delivered one per round. If the intent was seventeen whole-site editions, the same kernel serves that too.

Rules: every edition imports `src/shared` (merge, levels, shapes, geo), builds with `node tools/build_format.mjs <slug>` into `formats/<slug>/` as plain static files, and must pass `node tools/check_formats.js` (loads, renders, no console errors, no sideways scroll at 1280 and 390). `npm test` pins the shared numbers.

| # | Format | Framework | Status |
|---|---|---|---|
| 1 | Map and timeline | Svelte 5 | built |
| 2 | Threads (lineage) | SolidJS | planned |
| 3 | Venue table | Preact | planned |
| 4 | Source browser | Lit | planned |
| 5 | Corrections log | Alpine.js | planned |
| 6 | Name changes by year | Vue 3 | planned |
| 7 | Label chart | Mithril | planned |
| 8 | State by state | React | planned |
| 9 | Cards | Astro | planned |
| 10 | Compare two venues | Inferno | planned |
| 11 | Quote wall | Hyperapp | planned |
| 12 | Print book | Eleventy | planned |
| 13 | Search | Qwik | planned |
| 14 | Heat by decade | Angular | planned |
| 15 | Operator index | Riot.js | planned |
| 16 | Directory (unassessed) | Stencil | planned |
| 17 | Story mode | Ember | planned |

The unassessed directory (`data/directory.json`, 313 Wikidata venues, CC0) carries no label and is never described as having ties.
