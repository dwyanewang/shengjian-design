// Prints the canvas geometry of a few scenes (single audio, tracks) at 360 and 390.
import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
const ROOT = path.resolve(process.argv[2]), SC = (process.argv[3] || 'live,t1b,kTracks5').split(',');
const b = await launch();
try {
  for (const [w, h] of [[390, 844], [360, 780]]) {
    await b.viewport(w, h, true, 2, false);
    await b.open('file://' + path.join(ROOT, 'index.html'));
    await sleep(900);
    const r = await b.eval(`(() => SCENES && ${JSON.stringify(SC)}.map(sc => { const scr = document.querySelector('.scr[data-scene="' + sc + '"]'); const x = scr._bench; x.measure(); const g = x.geom(); const pr = x.playEl.getBoundingClientRect(), tr = x.tlEl.getBoundingClientRect();
      return sc + ': W ' + g.W + ' H ' + g.H + ' ruler ' + g.ruler + ' main ' + g.blockY + '+' + g.blockH + ' handleY ' + g.handleY + ' dockTop ' + g.dockTop + ' waterTop ' + g.waterTop + ' play ' + Math.round(pr.top - tr.top) + '-' + Math.round(pr.bottom - tr.top) + ' lanes ' + g.lanes.map(l => l.y + '+' + l.h).join(','); }).join('\\n'))()`);
    console.log(w, '\n' + r);
  }
  console.log('errors', JSON.stringify(b.errors));
} finally { await b.close(); }
