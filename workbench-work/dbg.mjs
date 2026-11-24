import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
const ROOT = path.resolve(process.argv[2]);
const b = await launch();
try {
  await b.viewport(390, 844, true, 2, false);
  await b.open('file://' + path.join(ROOT, 'index.html'));
  await b.eval(`document.querySelector('.scr[data-scene="s3-live"]').scrollIntoView({block:'center'})`); await sleep(400);
  await b.eval(`window.__clicks = []; document.addEventListener('click', e => __clicks.push((e.target.closest('[data-a]')||{dataset:{}}).dataset.a || e.target.className), true)`);
  for (const sel of ['[data-a=undo]', '[data-a=redo]', '[data-a=play]', '.selbar [data-a=delete]']) {
    const r = await b.eval(`(() => { const e = document.querySelector('.scr[data-scene="s3-live"]').querySelector('${sel}'); const q = e.getBoundingClientRect(); const x = q.left + q.width/2, y = q.top + q.height/2; const h = document.elementFromPoint(x, y); return {x, y, hit: h && (h.closest('[data-a]')||h).outerHTML.slice(0, 80)}; })()`);
    console.log(sel, JSON.stringify(r));
    await b.touch('touchStart', r.x, r.y); await sleep(60); await b.touch('touchEnd', r.x, r.y); await sleep(400);
    console.log(' clicks', await b.eval('JSON.stringify(__clicks)'));
  }
} finally { await b.close(); }
