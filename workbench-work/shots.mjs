// Render every phone screen at a phone viewport and a desktop viewport, plus full-page overviews.
import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
import fs from 'node:fs';

const ROOT = path.resolve(process.argv[2]);
const OUT = path.resolve(process.argv[3]);
const mode = process.argv[4] || 'all';
fs.mkdirSync(OUT, { recursive: true });
const url = 'file://' + path.join(ROOT, 'index.html');

const b = await launch();
try {
  for (const [vp, w, h, mobile, dark] of [['phone', 390, 844, true, false], ['desk', 1440, 900, false, true]]) {
    if (mode !== 'all' && mode !== vp) continue;
    await b.viewport(w, h, mobile, mobile ? 2 : 1, dark);
    await b.open(url);
    const scenes = await b.eval(`Array.from(document.querySelectorAll('.scr[data-scene]')).map(e => e.dataset.scene)`);
    for (const s of scenes) {
      const r = await b.rect(`.scr[data-scene="${s}"]`);
      await sleep(120);
      await b.shot(path.join(OUT, `${vp}-${s}.png`), { x: r.x, y: r.y, width: r.width, height: r.height });
    }
    // overflow check: any element wider than the viewport, or text clipped inside the phones
    const report = await b.eval(`(() => {
      const out = { docW: document.documentElement.scrollWidth, vw: innerWidth, wide: [], clipped: [] };
      document.querySelectorAll('body *').forEach(e => { const r = e.getBoundingClientRect(); if (r.right > innerWidth + 1 && !e.closest('.inv-wrap')) out.wide.push(e.tagName + '.' + e.className + ' ' + Math.round(r.right)); });
      document.querySelectorAll('.scr *').forEach(e => {
        if (!e.childElementCount && e.textContent.trim() && (e.scrollWidth > e.clientWidth + 1) && getComputedStyle(e).overflow !== 'visible') out.clipped.push(e.closest('.scr').dataset.scene + ': ' + e.textContent.trim().slice(0, 40) + ' (' + e.scrollWidth + '>' + e.clientWidth + ')');
      });
      out.wide = out.wide.slice(0, 15); out.clipped = out.clipped.slice(0, 40);
      return out;
    })()`);
    fs.writeFileSync(path.join(OUT, `${vp}-report.json`), JSON.stringify(report, null, 1));
    console.log(vp, 'docW', report.docW, 'vw', report.vw, 'wide', report.wide.length, 'clipped', report.clipped.length);
    await b.eval('scrollTo(0,0)');
    await b.shot(path.join(OUT, `${vp}-top.png`), { x: 0, y: 0, width: w, height: Math.min(1800, h * 2) });
  }
  console.log('errors:', JSON.stringify(b.errors));
} finally { await b.close(); }
