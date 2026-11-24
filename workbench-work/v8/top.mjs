import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
const ROOT = path.resolve(process.argv[2]), OUT = path.resolve(process.argv[3]);
const b = await launch();
try {
  for (const [w, h, dark] of [[390, 844, false], [360, 780, true]]) {
    await b.viewport(w, h, true, 2, dark);
    await b.open('file://' + path.join(ROOT, 'index.html'));
    await sleep(800);
    await b.shot(path.join(OUT, `top-${w}.png`), { x: 0, y: 0, width: w, height: h }, false);
    const sx = await b.eval('document.documentElement.scrollWidth > window.innerWidth');
    console.log(w, 'horizontal page overflow:', sx, await b.eval(`(() => { const r = document.querySelector('.scr.live').getBoundingClientRect(); return [r.top, r.height, window.innerHeight]; })()`));
  }
  console.log('errors', JSON.stringify(b.errors));
} finally { await b.close(); }
