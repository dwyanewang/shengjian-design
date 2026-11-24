import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
const ROOT = path.resolve(process.argv[2]);
const b = await launch();
try {
  for (const [w, h, m, n] of [[1440, 900, false, 'desk'], [390, 844, true, 'm390']]) {
    await b.viewport(w, h, m, m ? 2 : 1, false);
    await b.open('file://' + path.join(ROOT, 'index.html'));
    await sleep(900);
    await b.eval(`document.getElementById('ba').scrollIntoView({ block: 'start' })`);
    await sleep(400);
    const ok = await b.eval(`[...document.querySelectorAll('#ba img')].map(i => i.complete && i.naturalWidth > 0).every(Boolean) && document.documentElement.scrollWidth <= innerWidth`);
    console.log(n, 'images loaded and no sideways scroll:', ok);
    await b.shot(path.resolve('shots/ba-' + n + '.png'));
  }
  console.log('errors', JSON.stringify(b.errors));
} finally { await b.close(); }
