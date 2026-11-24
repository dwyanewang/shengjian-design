import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
const ROOT = path.resolve(process.argv[2]);
const b = await launch();
try {
  await b.viewport(390, 844, true, 2, false);
  await b.open('file://' + path.join(ROOT, 'index.html'));
  await sleep(900);
  const X = `document.querySelector('.scr[data-scene=live]')._bench`;
  const g = await b.eval(`(() => { const x = ${X}; x.scr.scrollIntoView({block:'start'}); window.resetLive(); x.hideCoach(); x.view.a.snap(800); x.view.b.snap(1100); x.kick(); const c = x.cv.getBoundingClientRect(), gg = x.geom(); return { cx: c.left, cy: c.top, W: x.W, y: c.top + gg.mainY + gg.mainH * 0.45 }; })()`);
  await sleep(300);
  const x0 = g.cx + 120, x1 = g.cx + g.W - 52;
  await b.touch('touchStart', x0, g.y); await sleep(30);
  for (let i = 1; i <= 14; i++) { await b.touch('touchMove', x0 + (x1 - x0) * i / 14, g.y); await sleep(20); }
  for (let t = 0; t < 8; t++) { await sleep(500); console.log(await b.eval(`(() => { const x = ${X}; return JSON.stringify({ va: Math.round(x.view.a.v), vb: Math.round(x.view.b.v), sel: x.sel, drag: !!x.drag, raf: !!x._raf }); })()`)); }
  await b.touch('touchEnd', x1, g.y); await sleep(400);
  console.log(await b.eval(`JSON.stringify(${X}.sel)`), JSON.stringify(b.errors));
} finally { await b.close(); }
