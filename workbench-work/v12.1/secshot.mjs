// Screenshot one section of the page at a desktop width. Usage: node secshot.mjs ROOT ID OUT
import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
const ROOT = path.resolve(process.argv[2]), ID = process.argv[3], OUT = path.resolve(process.argv[4]);
const b = await launch();
try {
  await b.viewport(1440, 900, false, 1, false);
  await b.open('file://' + path.join(ROOT, 'index.html'));
  await sleep(900);
  const r = await b.eval(`(() => { const e = document.getElementById('${ID}'); const q = e.getBoundingClientRect(); return { x: 0, y: q.top + scrollY, width: 1440, height: Math.min(2400, q.height) }; })()`);
  await b.shot(OUT, r);
  console.log('errors', JSON.stringify(b.errors));
} finally { await b.close(); }
