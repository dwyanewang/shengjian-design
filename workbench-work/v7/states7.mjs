// Drive the live phone through the states and photograph each (for design review).
import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
const ROOT = path.resolve(process.argv[2]), W = +process.argv[3] || 360, H = +process.argv[4] || 780, DARK = process.argv[5] === 'dark', TAG = process.argv[6] || '';
const b = await launch();
try {
  await b.viewport(W, H, true, 2, false);
  await b.open('file://' + path.join(ROOT, 'index.html') + (TAG ? '?' + TAG : ''));
  await sleep(1000);
  if (DARK) await b.eval(`document.documentElement.dataset.theme = 'dark'; document.dispatchEvent(new Event('themechange'))`);
  const clip = await b.eval(`(() => { const s = document.querySelector('.scr[data-scene=live]'); s.scrollIntoView(); const r = s.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; })()`);
  const steps = {
    rest: `window.resetLive()`,
    playing: `window.resetLive(); x.hideCoach(); x.ph = 2400; x.play()`,
    range: `window.resetLive(); x.hideCoach(); x.sel = [315, 440]; x.stack = [x.rootView()]; x.renderArea()`,
    denoise: `window.resetLive(); x.hideCoach(); x.toolsEl.querySelector('[data-k=dn]').click()`,
    tts: `window.resetLive(); x.hideCoach(); x.cat = 'add'; x.renderArea(); x.toolsEl.querySelector('[data-k=tts]').click()`,
    export: `window.resetLive(); x.hideCoach(); x.sel = [315, 440]; x.stack = [x.rootView()]; x.renderArea(); x.openExport(); x.exp.open = 'quality'; x.renderArea()`,
    say: `window.resetLive(); x.hideCoach(); x.sayEl.click()`,
    tracks: `window.resetLive(); x.hideCoach(); ['music1','music1','music1','music1','music1'].forEach((s, i) => x.addTrack({ src: s, name: ['轻快的早晨','配音','补录','掌声','环境声'][i], lane: [1,3,4,2,5][i] })); x.renderArea()`,
    tracksScrolled: `window.resetLive(); x.hideCoach(); ['music1','music1','music1','music1','music1'].forEach((s, i) => x.addTrack({ src: s, name: ['轻快的早晨','配音','补录','掌声','环境声'][i], lane: [1,3,4,2,5][i] })); x.renderArea(); x.measure(); x.draw(); x.scrollLanes(200)`,
    move: `window.resetLive(); x.hideCoach(); x.sel = [315, 440]; x.stack = [x.rootView()]; x.renderArea(); x.toolsEl.querySelector('[data-k=move]').click()`,
  };
  for (const [k, js] of Object.entries(steps)) {
    await b.eval(`(() => { const scr = document.querySelector('.scr[data-scene=live]'), x = scr._bench; ${js}; })()`);
    await sleep(900);
    await b.shot(path.resolve(`shots/st-${W}${DARK ? 'd' : 'l'}${TAG ? '-' + TAG.replace(/[^a-z0-9]/g, '') : ''}-${k}.png`), clip);
  }
  console.log('errors', JSON.stringify(b.errors));
} finally { await b.close(); }
