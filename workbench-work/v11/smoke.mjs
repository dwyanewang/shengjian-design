// Opens the page, reports page errors, photographs a list of screens (scene names) at one size.
import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
import fs from 'node:fs';
const ROOT = path.resolve(process.argv[2]), OUT = path.resolve(process.argv[3]);
const [w, h, dark, only, q] = [+process.argv[4] || 390, +process.argv[5] || 844, process.argv[6] === 'dark', (process.argv[7] || 'live').split(','), process.argv[8] || ''];
fs.mkdirSync(OUT, { recursive: true });
const b = await launch();
try {
  await b.viewport(w, h, true, 2, dark);
  await b.open('file://' + path.join(ROOT, 'index.html') + (q ? '?' + q : ''));
  await sleep(1000);
  const have = await b.eval(`[...document.querySelectorAll('.scr[data-scene]')].map(e => e.dataset.scene)`);
  for (const s of only) {
    if (!have.includes(s)) { console.log('missing scene', s); continue; }
    await b.eval(`(() => { const e = document.querySelector('.scr[data-scene="${s}"]'); const st = e.closest('.strip'); if (st) st.scrollLeft = e.closest('.step').offsetLeft - st.offsetLeft; e.scrollIntoView({block:'start'}); })()`);
    await sleep(250);
    const r = await b.eval(`(() => { const q = document.querySelector('.scr[data-scene="${s}"]').getBoundingClientRect(); return {x: q.left + scrollX, y: q.top + scrollY, width: q.width, height: q.height}; })()`);
    await b.shot(path.join(OUT, `${w}${dark ? 'd' : 'l'}${q ? '-' + q.replace(/[^a-z0-9]/gi, '') : ''}-${s}.png`), r);
  }
  console.log('errors', JSON.stringify(b.errors));
} finally { await b.close(); }
