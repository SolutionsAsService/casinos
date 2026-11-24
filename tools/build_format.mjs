// Build one framework edition: node tools/build_format.mjs 01-map-svelte  (output: formats/<slug>/, plain static files)
import { build } from 'vite';
import { existsSync } from 'node:fs';
const slug = process.argv[2];
const cfg = slug && new URL(`../src/formats/${slug}/vite.config.js`, import.meta.url);
if (!cfg || !existsSync(cfg)) { console.error('usage: node tools/build_format.mjs <slug>'); process.exit(1); }
await build({ configFile: cfg.pathname, logLevel: 'warn' });
console.log('built formats/' + slug);
