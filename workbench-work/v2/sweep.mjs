// Taps every tool in every context of the live phone, then every control in the view it opens; reports throws and taps that change nothing.
import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
const ROOT = path.resolve(process.argv[2]);
const b = await launch();
try {
  await b.viewport(1440, 900, false, 1, false);
  await b.open('file://' + path.join(ROOT, 'index.html'));
  await sleep(700);
  const res = await b.eval(`(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const scr = document.querySelector('.scr[data-scene=live]'), x = scr._bench, S = window.SCENES;
    const out = { throws: [], silent: [], tried: 0, controls: 0 };
    const snap = () => JSON.stringify([x.hi, x.hist.length, x.stack.map(v => v.t + (v.ctx || '') + (v.k || '')), x.sel, x.track, x.marker, x.loop, x.spec, x.speed, x.beats, !!x.mhost.innerHTML, x.toastEl.classList.contains('show') && x.toastEl.textContent, (() => { let h = 0; const t = x.areaEl.innerHTML; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return h; })(), x.hand && x.hand.at, JSON.stringify(x.exp), x.work && JSON.stringify(Object.assign({}, x.work.layer, { v: x.work.layer.v instanceof Set ? [...x.work.layer.v] : x.work.layer.v })), document.activeElement && document.activeElement.tagName, x.ph, x.view.a.t, x.view.b.t, x.where, x.rwhere, !!x.hand, !!x.rec, x.compareHold]);
    const ctxs = { rest: [], edit: ['edit'], sound: ['sound'], add: ['add'], range: [], track: [], audio: [], play: [], music: ['add', 'music'], marker: [] };
    const prep = ctx => {
      x.reset(S.live.doc()); x.toastEl.classList.remove('show');
      x.ph = 620;
      if (ctx === 'range') { x.sel = [315, 440]; }
      if (ctx === 'track') { x.addTrack({ src: 'music1', name: '轻快的早晨', lane: 1 }); }
      if (ctx === 'marker') { x.onTool('marker'); x.marker = x.doc.markers[0].id; }
      if (ctx === 'audio' || ctx === 'play') { x.stack = [{ t: 'strip', ctx }]; x.renderArea(true); return; }
      x.stack = [x.rootView()].concat(ctxs[ctx].map(c => ({ t: 'strip', ctx: c }))); x.renderArea(true);
    };
    for (const ctx of Object.keys(ctxs)) {
      prep(ctx);
      const keys = [...x.areaEl.querySelectorAll('[data-a=tool]')].map(e => e.dataset.k);
      for (const k of keys) {
        prep(ctx); out.tried++;
        const before = snap();
        try { x.areaEl.querySelector('[data-a=tool][data-k="' + k + '"]').click(); } catch (e) { out.throws.push(ctx + ':' + k + ' ' + e.message); continue; }
        await wait(30);
        if (snap() === before) out.silent.push(ctx + ':' + k);
        // every control in the view it opened (not the ones that leave it)
        const view = x.stack.map(v => v.t + (v.ctx || '') + (v.k || '')).join('/');
        const ctrls = [...x.areaEl.querySelectorAll('[data-a]')].map((e, i) => i);
        for (const i of ctrls) {
          const els = [...x.areaEl.querySelectorAll('[data-a]')]; const e = els[i]; if (!e) continue;
          const a = e.dataset.a; if (['tool', 'pop'].includes(a)) continue;
          out.controls++;
          const b0 = snap();
          try { e.click(); } catch (err) { out.throws.push(ctx + ':' + k + ' > ' + a + ' ' + err.message); }
          await wait(20);
          if (snap() === b0 && !['ok', 'cancel'].includes(a)) out.silent.push(ctx + ':' + k + ' > ' + a + (e.dataset.k ? '[' + e.dataset.k + ']' : ''));
          x.closeModal();
          // put the view back for the next control
          prep(ctx); try { x.areaEl.querySelector('[data-a=tool][data-k="' + k + '"]').click(); } catch (err) { /* checked above */ } await wait(10);
        }
      }
    }
    // header and transport
    for (const sel of ['[data-a=leave]', '[data-a=title]', '[data-a=time]', '[data-a=export]', '[data-a=play]']) {
      prep('rest'); const b0 = snap(); try { scr.querySelector(sel).click(); } catch (e) { out.throws.push(sel + ' ' + e.message); } await wait(30); if (snap() === b0) out.silent.push(sel); out.tried++;
      x.stopPlay();
    }
    return out;
  })()`);
  console.log(JSON.stringify(res, null, 1));
  console.log('page errors', JSON.stringify(b.errors));
} finally { await b.close(); }
