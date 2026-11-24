// Lists the interview's pauses (quiet runs) so scenes can be anchored to them.
import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
const ROOT = path.resolve(process.argv[2]);
const b = await launch();
try {
  await b.viewport(390, 844, true, 1, false);
  await b.open('file://' + path.join(ROOT, 'index.html'));
  await sleep(700);
  const r = await b.eval(`(() => { const W = window.WB, d = { pieces: [{ src: 'voice', s: 0, e: W.SRC.voice.n }], layers: [], tracks: [], markers: [] };
    const p3 = W.pausesOf(d, 3).map(([a, c]) => (a / 10).toFixed(1) + '-' + (c / 10).toFixed(1));
    const p10 = W.pausesOf(d, 10).map(([a, c]) => (a / 10).toFixed(1) + '-' + (c / 10).toFixed(1) + '(' + ((c - a) / 10).toFixed(1) + ')');
    return 'over 0.3 s: ' + p3.join(' ') + '\\nover 1 s (' + p10.length + '): ' + p10.join(' '); })()`);
  console.log(r);
  console.log('errors', JSON.stringify(b.errors));
} finally { await b.close(); }
