// Renders interaction states the static scenes cannot show: a grip held (magnified), a very short selection, a grip
// turned at a screen edge. Usage: node states.mjs ROOT OUT W H [dark]
import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
import fs from 'node:fs';
const ROOT = path.resolve(process.argv[2]), OUT = path.resolve(process.argv[3]), W = +process.argv[4] || 390, H = +process.argv[5] || 844, dark = process.argv[6] === 'dark';
fs.mkdirSync(OUT, { recursive: true });
const b = await launch();
try {
  await b.viewport(W, H, true, 2, dark);
  await b.open('file://' + path.join(ROOT, 'index.html'));
  await sleep(900);
  const tag = `${W}${dark ? 'd' : 'l'}`;
  const shot = async n => { const r = await b.eval(`(() => { const q = document.querySelector('.scr[data-scene=live]').getBoundingClientRect(); return { x: q.left + scrollX, y: q.top + scrollY, width: q.width, height: q.height }; })()`); await b.shot(path.join(OUT, `${tag}-${n}.png`), r); };
  const X = `document.querySelector('.scr[data-scene=live]')._bench`;
  await b.eval(`(() => { const x = ${X}; x.scr.scrollIntoView({ block: 'start' }); window.resetLive(); x.hideCoach(); return 1; })()`); await sleep(300);
  // 1 a short selection (one short sentence, 是街坊吧。): the grips point outward and never overlap
  await b.eval(`(() => { const x = ${X}; x.hideCoach(); x.sel = [621, 638]; x.ph = 621; x.stack = [x.rootView()]; x.renderArea(); x.draw(); return 1; })()`); await sleep(250); await shot('short');
  // 2 a selection from the very start: the start grip turns inward; it meets the end's, so it goes to the top
  await b.eval(`(() => { const x = ${X}; x.sel = [0, 40]; x.stack = [x.rootView()]; x.renderArea(); x.draw(); return 1; })()`); await sleep(250); await shot('start');
  // 3 holding the end grip still: time magnifies around it
  await b.eval(`(() => { const x = ${X}; x.sel = [398, 585]; x.ph = 398; x.stack = [x.rootView()]; x.renderArea(); x.draw(); return 1; })()`); await sleep(250);
  const q = await b.eval(`(() => { const x = ${X}, c = x.cv.getBoundingClientRect(), r = x.handleRect(1); return { x: c.left + (r.l + r.r) / 2, y: c.top + (r.t + r.b) / 2 }; })()`);
  await b.touch('touchStart', q.x, q.y); await sleep(900);
  await shot('held');
  await b.touch('touchMove', q.x - 30, q.y); await sleep(500); await shot('held-moved');
  await b.touch('touchEnd', q.x - 30, q.y); await sleep(900); await shot('released');
  console.log(await b.eval(`(() => { const x = ${X}; return JSON.stringify({ sel: x.sel, va: x.view.a.v, vb: x.view.b.v }); })()`));
  console.log('errors', JSON.stringify(b.errors));
} finally { await b.close(); }
