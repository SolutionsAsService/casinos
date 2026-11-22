const { chromium } = require('playwright');
const path = require('path'), http = require('http'), fs = require('fs');
const root = path.resolve(__dirname, '..');
const mime = { '.json': 'application/json', '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html' };
const server = http.createServer((q, r) => {
  let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html';
  const f = path.join(root, u);
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'Content-Type': mime[path.extname(f)] || 'text/plain' }); r.end(d); } });
});
const pages = [['index.html', 'svg circle', 5], ['lineage.html', 'svg g.seg', 40], ['venues.html', 'tbody tr', 40], ['venue.html?id=desert-inn', '.src', 1], ['venue.html?id=flamingo-las-vegas', '.src', 1], ['sources.html', '.src', 100], ['method.html', 'h3', 3]];
server.listen(0, async () => {
  const port = server.address().port, b = await chromium.launch(); let bad = 0;
  for (const [w, h] of [[1280, 900], [390, 900]]) for (const [pg, sel, min] of pages) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); const errs = [];
    p.on('pageerror', e => errs.push(String(e).slice(0, 160)));
    p.on('console', m => { if (m.type() === 'error' && !/tile|net::|Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 160)); });
    await p.goto(`http://localhost:${port}/${pg}`, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1800);
    const n = await p.evaluate(s => document.querySelectorAll(s).length, sel);
    const hs = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2 && !document.querySelector('.thread-wrap'));
    const ok = n >= min && !errs.length && !hs; if (!ok) bad++;
    console.log(ok ? 'OK ' : 'BAD', w, pg, 'count', n, hs ? 'HSCROLL' : '', errs.join(' | '));
    if (w === 1280 && /lineage|venue\.html\?id=desert/.test(pg)) await p.screenshot({ path: `/tmp/claude-0/pg_${pg.replace(/\W/g, '_')}.png`, fullPage: true });
    await p.close();
  }
  await b.close(); server.close(); process.exit(bad ? 1 : 0);
});
