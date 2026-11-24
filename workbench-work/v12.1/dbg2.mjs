import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
const ROOT = path.resolve(process.argv[2]);
const b = await launch();
try {
  await b.viewport(390, 844, true, 2, false);
  await b.open('file://' + path.join(ROOT, 'index.html'));
  await sleep(900);
  const r = await b.eval(`(() => { const x = document.querySelector('.scr[data-scene=live]')._bench; const s = x.toolsEl.querySelector('.strip-s'); const out = [];
    for (let i = 0; i < 4; i++) { x.sizeRows(); const acts = [...s.querySelectorAll('.act')]; out.push(s.style.getPropertyValue('--aw') + ' ' + acts.slice(0, 7).map(a => a.offsetWidth).join(',') + ' cs ' + getComputedStyle(acts[0]).minWidth + ' ' + getComputedStyle(acts[0]).width); }
    return out.join('\\n'); })()`);
  console.log(r);
} finally { await b.close(); }
