import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
const ROOT = path.resolve(process.argv[2]);
const b = await launch();
try {
  await b.viewport(390, 844, true, 2, false);
  await b.open('file://' + path.join(ROOT, 'index.html'));
  await b.eval(`document.querySelector('.scr[data-scene="s3-live"]').scrollIntoView({block:'center'})`); await sleep(400);
  await b.eval(`window.__ev = []; ['click','pointerdown','pointerup','pointercancel','contextmenu','touchstart','touchend','touchcancel'].forEach(t => document.addEventListener(t, e => __ev.push(t + ':' + ((e.target.closest && e.target.closest('[data-a]')) ? e.target.closest('[data-a]').dataset.a : e.target.tagName)), true))`);
  const g = await b.eval(`(() => { const c = document.querySelector('.scr[data-scene="s3-live"] canvas').getBoundingClientRect(); return {x: c.left, y: c.top, w: c.width, h: c.height}; })()`);
  const x0 = g.x + 300 / 900 * g.w, y = g.y + 60 + (g.h - 82) / 2;
  await b.touch('touchStart', x0, y); await sleep(650);
  for (let i = 1; i <= 10; i++) { await b.touch('touchMove', x0 + i * 10, y); await sleep(30); }
  await b.touch('touchEnd', x0 + 100, y); await sleep(1300);
  console.log('after drag', await b.eval('JSON.stringify(__ev.filter(e => !e.startsWith("touchmove")))'));
  await b.eval('__ev = []');
  const r = await b.eval(`(() => { const e = document.querySelector('.scr[data-scene="s3-live"] [data-a=undo]'); const q = e.getBoundingClientRect(); return {x: q.left + q.width/2, y: q.top + q.height/2}; })()`);
  for (let k = 0; k < 2; k++) {
    await b.touch('touchStart', r.x, r.y); await sleep(60); await b.touch('touchEnd', r.x, r.y); await sleep(500);
    console.log('tap', k, await b.eval('JSON.stringify(__ev)'));
    await b.eval('__ev = []');
  }
} finally { await b.close(); }
