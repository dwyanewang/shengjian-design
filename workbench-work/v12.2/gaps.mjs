// The two numbers of v12.1: from the ruler to the tallest bar, and from the main line (its echo) to the first track.
// Usage: node gaps.mjs ROOT
import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
const ROOT = path.resolve(process.argv[2]);
const b = await launch();
try {
  for (const [w, h, dark] of [[390, 844, false], [360, 780, true]]) {
    await b.viewport(w, h, true, 2, dark);
    await b.open('file://' + path.join(ROOT, 'index.html'));
    await sleep(900);
    const r = await b.eval(`(() => { const out = [];
      for (const sc of ['live', 't6a', 'kTracks5', 't5c', 'kTracks8', 'kLong']) {
        const scr = document.querySelector('.scr[data-scene="' + sc + '"]'); if (!scr) continue; const x = scr._bench; x.laneOff = 0; x.measure(); x.draw();
        const g = x.geom(), cols = x._cols || [], top = Math.min(...cols.map(c => g.mid - Math.min(1, c[1]) * g.amp));
        const rulerBottom = g.rBot !== undefined ? g.rBot : g.ruler;
        const echoBottom = Math.max(...cols.map(c => g.mid + 1.2 + Math.max(0.9, Math.min(1, c[1]) * g.amp * 0.5) * 0.85));
        out.push(sc + ': ruler bottom ' + rulerBottom + ', tallest bar ' + Math.round(top) + ' (gap ' + Math.round(top - rulerBottom) + ')' + (g.lanes.length ? ', echo bottom ' + Math.round(echoBottom) + ', band bottom ' + g.bandBot + ', first track ' + Math.round(g.laneTop) + ' (gap from echo ' + Math.round(g.laneTop - echoBottom) + ', from band ' + Math.round(g.laneTop - g.bandBot) + ')' : ''));
      } return out.join('\\n'); })()`);
    console.log(w + (dark ? ' dark' : ' light') + '\n' + r);
  }
  console.log('errors', JSON.stringify(b.errors));
} finally { await b.close(); }
