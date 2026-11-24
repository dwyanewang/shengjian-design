import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
const ROOT = path.resolve(process.argv[2]);
const b = await launch();
try {
  await b.viewport(360, 780, true, 2, false);
  await b.open('file://' + path.join(ROOT, 'index.html'));
  await sleep(1200);
  const r = await b.eval(`(() => { const scr = document.querySelector('.scr[data-scene=live]'), x = scr._bench; const g = x.geom(); return { W: x.W, H: x.H, restTop: x._restTop, dockTop: x._dockTop, blockY: g.blockY, blockH: g.blockH, handleY: g.handleY, aw: x.toolsEl.querySelector('.strip-s').style.getPropertyValue('--aw') }; })()`);
  console.log(JSON.stringify(r));
  await b.eval(`document.querySelector('.scr[data-scene=live]').scrollIntoView()`);
  await b.shot(path.resolve('shots/smoke-live.png'), await b.eval(`(() => { const r = document.querySelector('.scr[data-scene=live]').getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; })()`));
  console.log('errors', JSON.stringify(b.errors));
} finally { await b.close(); }
