// Screenshot every phone screen at a phone width (each screen fills the width) and the page at a desktop width.
import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
import fs from 'node:fs';
const ROOT = path.resolve(process.argv[2]), OUT = path.resolve(process.argv[3]);
const [w, h, mobile, dark, only] = [+process.argv[4] || 390, +process.argv[5] || 844, process.argv[6] !== 'desk', process.argv[7] === 'dark', process.argv[8]];
fs.mkdirSync(OUT, { recursive: true });
const b = await launch();
try {
  await b.viewport(w, h, mobile, mobile ? 2 : 1, dark);
  await b.open('file://' + path.join(ROOT, 'index.html'));
  await sleep(900);
  const tag = `${w}${dark ? 'd' : 'l'}`;
  if (mobile) {
    const scenes = await b.eval(`[...document.querySelectorAll('.scr[data-scene]')].map(e => e.dataset.scene)`);
    for (const s of scenes) {
      if (only && !only.split(',').includes(s)) continue;
      const r = await b.eval(`(() => { const e = document.querySelector('.scr[data-scene="${s}"]'); const st = e.closest('.strip'); if (st) st.scrollLeft = e.closest('.step').offsetLeft - st.offsetLeft; e.scrollIntoView({block:'start'}); const q = e.getBoundingClientRect(); return {x: q.left + scrollX, y: q.top + scrollY, width: q.width, height: q.height}; })()`);
      await sleep(120);
      const r2 = await b.eval(`(() => { const q = document.querySelector('.scr[data-scene="${s}"]').getBoundingClientRect(); return {x: q.left + scrollX, y: q.top + scrollY, width: q.width, height: q.height}; })()`);
      await b.shot(path.join(OUT, `${tag}-${s}.png`), r2);
    }
  } else {
    const H = await b.eval('document.documentElement.scrollHeight');
    for (let y = 0, i = 0; y < H; y += 1800, i++) await b.shot(path.join(OUT, `${tag}-page-${i}.png`), { x: 0, y, width: w, height: Math.min(1800, H - y) });
  }
  console.log('errors', JSON.stringify(b.errors));
} finally { await b.close(); }
