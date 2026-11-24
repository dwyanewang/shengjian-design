import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
const ROOT = path.resolve(process.argv[2]), OUT = path.resolve(process.argv[3]);
const b = await launch();
try {
  await b.viewport(1440, 900, false, 1, true);
  await b.open('file://' + path.join(ROOT, 'index.html'));
  for (const id of ['s1', 's3', 's6', 's9', 's10']) {
    const r = await b.eval(`(() => { const e = document.getElementById('${id}'); const b = e.getBoundingClientRect(); return {x: 0, y: b.top + scrollY, width: innerWidth, height: Math.min(b.height, 2600)}; })()`);
    await b.shot(path.join(OUT, `desk-sec-${id}.png`), r);
  }
  await b.shot(path.join(OUT, 'desk-head.png'), { x: 0, y: 0, width: 1440, height: 900 });
  console.log('errors', JSON.stringify(b.errors));
} finally { await b.close(); }
