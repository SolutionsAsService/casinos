// Gate for the framework editions: each loads, renders its map and slider, has no console errors, and does not scroll sideways at 1280 and 390.
// Usage: NODE_PATH=$(npm root -g) node tools/check_formats.js [slug ...]   (serves the repository itself on a local port)
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer((q, r) => {
  const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
});
const given = process.argv.slice(2);
const slugs = given.length ? given : fs.readdirSync(path.join(root, 'formats'), { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}/`; const b = await chromium.launch(); let bad = 0;
  for (const slug of slugs) for (const w of [1280, 390]) {
    const p = await (await b.newContext({ viewport: { width: w, height: 900 } })).newPage(); const errs = [];
    p.on('console', m => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', e => errs.push(String(e)));
    await p.goto(`${base}formats/${slug}/`); await p.waitForSelector('svg .marker', { timeout: 8000 }).catch(() => errs.push('no markers'));
    const r = await p.evaluate(() => ({ markers: document.querySelectorAll('svg .marker').length, slider: !!document.querySelector('input[type=range]'), over: document.documentElement.scrollWidth > innerWidth + 1 }));
    const ok = !errs.length && r.markers > 20 && r.slider && !r.over; if (!ok) bad++;
    console.log(ok ? 'OK ' : 'BAD', slug, w, JSON.stringify(r), errs.join('|'));
  }
  await b.close(); server.close(); process.exitCode = bad ? 1 : 0;
});
