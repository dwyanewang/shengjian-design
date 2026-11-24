// Photographs a static screen after re-setting its bench with a script (to show the same state in an older round that
// lacks the scene). Usage: node hijack.mjs ROOT OUT.png W H light|dark SCENE 'js using b and S'
import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
const [ROOT, OUT, w, h, theme, scene, js] = [path.resolve(process.argv[2]), path.resolve(process.argv[3]), +process.argv[4], +process.argv[5], process.argv[6], process.argv[7], process.argv[8]];
const b = await launch();
try {
  await b.viewport(w, h, true, 2, theme === 'dark');
  await b.open('file://' + path.join(ROOT, 'index.html'));
  await sleep(1000);
  const r = await b.eval(`(async () => { const scr = document.querySelector('.scr[data-scene="${scene}"]'), b = scr._bench, S = window.SCENES;
    ${js}
    b.anim = null; b.view.a.snap(b.view.a.t); b.view.b.snap(b.view.b.t); b.renderArea(true); b.measure(); b.draw();
    scr.scrollIntoView({ block: 'start' }); await new Promise(r => setTimeout(r, 300)); b.measure(); b.draw();
    const q = scr.getBoundingClientRect(); return { x: q.left + scrollX, y: q.top + scrollY, width: q.width, height: q.height }; })()`);
  await b.shot(OUT, r);
  console.log('errors', JSON.stringify(b.errors.filter(e => !/ERR_FILE/.test(e))));
} finally { await b.close(); }
