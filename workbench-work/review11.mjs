import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
const ROOT = path.resolve(process.argv[2]); const OUT = path.resolve(process.argv[3]);
const want = process.argv.slice(4);
const b = await launch();
try {
  await b.viewport(390, 844, true, 2, false);
  await b.open('file://' + path.join(ROOT, 'index.html'));
  await sleep(800);
  for (const s of want) {
    const r = await b.rect(`.scr[data-scene="${s}"]`);
    await sleep(150);
    await b.shot(path.join(OUT, `${s}.png`), { x: r.x, y: r.y, width: r.width, height: r.height });
  }
  console.log('errors:', JSON.stringify(b.errors));
} finally { await b.close(); }
