// Photographs the dock's top edge at rest (and with five tracks under it) in both themes, blur on and off, at 360 and
// 390, and writes where the edge is; sep.py measures the separation on the pixels.
import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
import fs from 'node:fs';
const ROOT = path.resolve(process.argv[2]);
const b = await launch(), out = [];
try {
  for (const [w, h] of [[360, 780], [390, 844]]) for (const theme of ['light', 'dark']) for (const blur of ['blur', 'noblur']) for (const kind of ['rest', 'tracks']) {
    await b.viewport(w, h, true, 2, false);
    await b.open('file://' + path.join(ROOT, 'index.html'));
    await sleep(800);
    const r = await b.eval(`(async () => { document.documentElement.dataset.theme = '${theme}'; document.body.classList.toggle('noblur', '${blur}' === 'noblur'); document.dispatchEvent(new Event('themechange'));
      const scr = document.querySelector('.scr[data-scene=live]'), x = scr._bench, S = window.SCENES; window.resetLive(); await new Promise(r => setTimeout(r, 150)); x.hideCoach();
      if ('${kind}' === 'tracks') { x.reset(S.kTracks5.doc()); x.stack = [x.rootView()]; x.renderArea(true); }
      scr.scrollIntoView(); await new Promise(r => setTimeout(r, 400)); x.measure(); x.draw();
      const s = scr.getBoundingClientRect(), d = x.botEl.getBoundingClientRect();
      return { clip: { x: s.left, y: s.top, width: s.width, height: s.height }, edge: d.top - s.top, left: d.left - s.left, width: d.width }; })()`);
    const file = path.resolve(`shots/sep-${w}-${theme}-${blur}-${kind}.png`);
    await b.shot(file, r.clip);
    out.push({ file, w, theme, blur, kind, edge: r.edge, width: r.width });
  }
  fs.writeFileSync('sep.json', JSON.stringify(out));
  console.log('errors', JSON.stringify(b.errors));
} finally { await b.close(); }
