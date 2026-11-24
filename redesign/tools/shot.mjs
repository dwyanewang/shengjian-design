// Usage: node shot.mjs <page.html> <outDir> [width=1600] [height=1000] [scale=1] [--dark] [--wait=ms]
// Full-page screenshot plus viewport-height slices (screen-NN.png), and a list of page errors (errors.txt).
import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
import fs from 'node:fs';
const [, , page, out, W = '1600', H = '1000', S = '1', ...rest] = process.argv;
const dark = rest.includes('--dark');
const wait = +(rest.find(a => a.startsWith('--wait=')) || '--wait=900').slice(7);
fs.mkdirSync(out, { recursive: true });
const b = await launch();
try {
  await b.viewport(+W, +H, false, +S, dark);
  await b.open('file://' + path.resolve(page));
  await sleep(wait);
  const full = await b.eval('Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)');
  const docW = await b.eval('document.documentElement.scrollWidth');
  await b.shot(path.join(out, 'full.png'), { x: 0, y: 0, width: +W, height: full });
  let n = 0;
  for (let y = 0; y < full; y += +H) {
    n++;
    await b.shot(path.join(out, `screen-${String(n).padStart(2, '0')}.png`), { x: 0, y, width: +W, height: Math.min(+H, full - y) });
  }
  fs.writeFileSync(path.join(out, 'errors.txt'), b.errors.join('\n'));
  console.log(JSON.stringify({ fullHeight: full, docWidth: docW, viewport: +W, screens: n, errors: b.errors.length }));
  if (b.errors.length) console.log(b.errors.slice(0, 10).join('\n'));
} finally { await b.close(); }
