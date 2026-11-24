import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
const ROOT = path.resolve(process.argv[2]);
const b = await launch();
try {
  await b.viewport(360, 780, true, 2, false);
  await b.open('file://' + path.join(ROOT, 'index.html'));
  await sleep(900);
  const r = await b.eval(`(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const scr = document.querySelector('.scr[data-scene=live]'), x = scr._bench; window.resetLive(); await wait(300);
    const out = {};
    for (const [cat, k] of [['add', 'sil'], ['ctx', 'fade'], ['ctx', 'dn']]) {
      x.back(true); x.cat = cat; x.renderArea(); await wait(50);
      x.toolsEl.querySelector('[data-k=' + k + ']').click(); await wait(700);
      const vb = x.areaEl.querySelector('.vb'), vr = vb.getBoundingClientRect();
      const deep = [...vb.querySelectorAll('*')].map(e => { const q = e.getBoundingClientRect(); return [e.className || e.tagName, Math.round(q.bottom - vr.top)]; }).sort((a, b) => b[1] - a[1]).slice(0, 3);
      out[k] = { sh: vb.scrollHeight, ch: vb.clientHeight, pad: getComputedStyle(vb).paddingBottom, deep };
    }
    return out; })()`);
  console.log(JSON.stringify(r));
} finally { await b.close(); }
