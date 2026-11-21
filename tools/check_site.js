const { chromium } = require('playwright');
const path = require('path'), http = require('http'), fs = require('fs');
const root = path.resolve(__dirname, '..');
const server = http.createServer((q, r) => {
  const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'Content-Type': f.endsWith('.json') ? 'application/json' : f.endsWith('.js') ? 'text/javascript' : 'text/html' }); r.end(d); } });
});
server.listen(0, async () => {
  const port = server.address().port, errs = [], problems = [];
  const b = await chromium.launch(); const out = [];
  for (const [w, h] of [[1280, 800], [390, 800]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
    p.on('console', m => { if (m.type() === 'error' && !/tile|net::|Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 200)); });
    await p.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' }).catch(e => errs.push(String(e)));
    await p.waitForTimeout(4000);
    const info = await p.evaluate(() => ({ svg: !!document.querySelector('svg'), states: document.querySelectorAll('svg path').length, range: !!document.querySelector('input[type=range]'),
      markers: document.querySelectorAll('svg circle').length, hscroll: document.documentElement.scrollWidth > innerWidth + 2, text: document.body.innerText.length }));
    if (!info.svg || info.states < 40) problems.push(`${w}px: US map did not draw (svg paths: ${info.states}); load vendor/d3-array.min.js, vendor/d3-geo.min.js, vendor/topojson-client.min.js with script tags and fetch vendor/states-10m.json`);
    if (!info.range) problems.push(`${w}px: no year slider (input type=range)`);
    if (info.markers < 5) problems.push(`${w}px: fewer than 5 svg circles drawn at the default year (found ${info.markers}); the default year must show venues`);
    if (info.hscroll) problems.push(`${w}px: horizontal page scroll`);
    out.push(JSON.stringify(info));
    if (w === 1280) await p.screenshot({ path: path.join(root, 'site-shot.png') });
  }
  await b.close(); server.close();
  if (errs.length) problems.push('console errors: ' + errs.slice(0, 4).join(' | '));
  console.log(out.join('\n')); if (problems.length) { console.log(problems.join('\n')); process.exit(1); }
});
