import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
const ROOT = path.resolve(process.argv[2]), OUT = path.resolve(process.argv[3]);
const b = await launch();
try {
  // a small Android phone, reduced motion
  await b.viewport(360, 780, true, 2, true);
  await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
  await b.open('file://' + path.join(ROOT, 'index.html'));
  const rep = await b.eval(`(() => { const out = { docW: document.documentElement.scrollWidth, over: [] };
    document.querySelectorAll('.scr *').forEach(e => { const r = e.getBoundingClientRect(), p = e.closest('.scr').getBoundingClientRect();
      if (r.width && (r.right > p.right + 1 || r.left < p.left - 1) && getComputedStyle(e).position !== 'absolute' && !e.closest('.sheet:not(.show)') && !e.closest('canvas')) out.over.push(e.closest('.scr').dataset.scene + ' ' + e.tagName + '.' + e.className + ' ' + Math.round(r.right - p.right)); });
    out.over = out.over.slice(0, 20); return out; })()`);
  console.log('360 report', JSON.stringify(rep));
  for (const s of ['s2-sel', 's5-tools', 's6-speed', 's8-new']) {
    await b.eval(`document.querySelector('.scr[data-scene="${s}"]').scrollIntoView({block:'center'})`); await sleep(250);
    const g = await b.eval(`(() => { const r = document.querySelector('.scr[data-scene="${s}"]').getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height }; })()`);
    await b.shot(path.join(OUT, `p360-${s}.png`), g, false);
  }
  // reduced motion: a drag still lands
  await b.eval(`document.querySelector('.scr[data-scene="s3-live"]').scrollIntoView({block:'center'})`); await sleep(300);
  const g = await b.eval(`(() => { const c = document.querySelector('.scr[data-scene="s3-live"] canvas').getBoundingClientRect(); return {x: c.left, y: c.top, w: c.width, h: c.height}; })()`);
  const x0 = g.x + 300 / 900 * g.w, y = g.y + 60 + (g.h - 82) / 2;
  await b.touch('touchStart', x0, y); await sleep(600);
  for (let i = 1; i <= 10; i++) { await b.touch('touchMove', x0 + i * 14, y); await sleep(30); }
  await b.touch('touchEnd', x0 + 140, y); await sleep(500);
  console.log('reduced-motion drag', await b.eval(`(() => { const bn = document.querySelector('.scr[data-scene="s3-live"]')._bench; const p = bn.proj(); return JSON.stringify({ top: p.hist[p.idx].label, sel: bn.st.selection, drag: !!bn.drag }); })()`));
  console.log('errors', JSON.stringify(b.errors));
} finally { await b.close(); }
