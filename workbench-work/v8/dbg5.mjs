import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
const ROOT = path.resolve(process.argv[2]);
const b = await launch();
try {
  await b.viewport(360, 780, true, 2, false);
  await b.open('file://' + path.join(ROOT, 'index.html'));
  await sleep(1200);
  console.log(JSON.stringify(await b.eval(`[...document.querySelectorAll('.scr[data-scene]')].slice(0, 4).map(scr => { const g = scr.querySelector('.tools .strip-s'); return [scr.dataset.scene, g && g.offsetHeight, g && g.scrollWidth, g && g.clientWidth, g && g.scrollLeft, g && g.style.getPropertyValue('--aw')]; })`)));
} finally { await b.close(); }
