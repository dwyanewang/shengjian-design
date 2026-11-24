// Which controls take height from the audio, at 360x780 and 390x844, and how the audio height moves over time.
import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
const ROOT = path.resolve(process.argv[2]);
const b = await launch();
try {
  for (const [w, h] of [[360, 780], [390, 844]]) {
    await b.viewport(w, h, true, 2, false);
    await b.open('file://' + path.join(ROOT, 'index.html'));
    await sleep(900);
    const r = await b.eval(`(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const scr = document.querySelector('.scr[data-scene=live]'), x = scr._bench; scr.scrollIntoView({ block: 'start' });
      window.resetLive(); await wait(300);
      const tl = () => Math.round(x.tlEl.getBoundingClientRect().height);
      const rest = tl(), out = { rest, moved: {}, frames: [] };
      const cats = { ctx: null, edit: null, sound: null, add: null, more: null };
      for (const sel of [null, [315, 440]]) for (const c of Object.keys(cats)) {
        x.back(true); x.sel = sel; x.stack = [x.rootView()]; x.cat = c; x.renderArea(); await wait(30);
        const keys = [...x.toolsEl.querySelectorAll('[data-a=tool]')].map(e => e.dataset.k);
        for (const k of keys) {
          x.back(true); x.sel = sel; x.stack = [x.rootView()]; x.cat = c; x.renderArea(); await wait(20);
          const el = x.toolsEl.querySelector('[data-a=tool][data-k="' + k + '"]'); if (!el) continue;
          el.click(); await wait(20); x.closeModal && x.closeModal();
          if (x.stack.length < 2) continue;
          await wait(700); const t = tl(); if (t !== rest) out.moved[(sel ? 'sel:' : '') + c + ':' + k] = t;
        }
      }
      x.back(true); x.sel = null; x.stack = [x.rootView()]; x.cat = 'ctx'; x.renderArea(); await wait(600);
      // the sentence and export
      x.catsEl.querySelector('[data-k=say]').click(); await wait(700); out.moved.say = tl(); x.back(true); await wait(600);
      x.openExport(); await wait(700); out.moved.export = tl();
      x.exp.open = 'quality'; x.renderArea(); await wait(700); out.moved['export+quality'] = tl();
      x.back(true); await wait(100);
      x.openExport(); const t0 = performance.now();
      for (let i = 0; i < 12; i++) { await wait(50); out.frames.push(tl()); }
      x.back(true); await wait(700); out.after = tl();
      return out; })()`);
    console.log(w + 'x' + h, JSON.stringify(r));
  }
  console.log('page errors:', JSON.stringify(b.errors));
} finally { await b.close(); }
