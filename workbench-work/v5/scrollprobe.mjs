// At 360x780: which ordinary controls scroll inside the reserve, and how much each reading-and-deciding one borrows.
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
      const scr = document.querySelector('.scr[data-scene=live]'), x = scr._bench, S = window.SCENES; scr.scrollIntoView({ block: 'start' });
      const ROOMY = ['export', 'say', 'plan', 'tts', 'sub', 'clone', 'list', 'music', 'online', 'history', 'details'];
      const settle = () => { x.tlEl.getAnimations().forEach(a => a.finish()); x.areaEl.getAnimations({ subtree: true }).forEach(a => a.finish()); };
      const prep = (ctx, cat) => { x.reset(S.live.doc()); x.ph = 620; if (ctx === 'range') x.sel = [315, 440]; if (ctx === 'track') x.addTrack({ src: 'music1', name: '轻快的早晨', lane: 1 }); x.stack = [x.rootView()]; x.renderArea(true); x.cat = cat; x.renderArea(true); settle(); };
      prep('rest', 'ctx'); const tl0 = Math.round(x.tlEl.getBoundingClientRect().height);
      const scrolls = new Set(), borrow = {};
      for (const ctx of ['rest', 'range', 'track']) for (const cat of ['ctx', 'edit', 'sound', 'add', 'more']) {
        if (ctx === 'track' && cat !== 'ctx') continue;
        prep(ctx, cat); const keys = [...x.toolsEl.querySelectorAll('[data-a=tool]')].map(e => e.dataset.k);
        const base = Math.round(x.tlEl.getBoundingClientRect().height);
        for (const k of keys) {
          prep(ctx, cat); x.toolsEl.querySelector('[data-a=tool][data-k="' + k + '"]').click(); await wait(10); x.closeModal && x.closeModal(); settle();
          if (x.stack.length < 2) continue;
          const t = x.top.t, vb = x.areaEl.querySelector('.vb');
          if (ROOMY.includes(t)) { const d = base - Math.round(x.tlEl.getBoundingClientRect().height); if (d > 0) borrow[t] = Math.max(borrow[t] || 0, d); }
          else if (vb && vb.scrollHeight > vb.clientHeight + 2) scrolls.add(t + (t === 'p' ? ':' + k : '') + ' +' + (vb.scrollHeight - vb.clientHeight));
        }
      }
      return { tl0, scrolls: [...scrolls], borrow };
    })()`);
    console.log(w + 'x' + h, JSON.stringify(r));
  }
  console.log('errors', JSON.stringify(b.errors));
} finally { await b.close(); }
