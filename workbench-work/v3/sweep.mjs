// Every tool in every context: open its level, check the bar's shape, tap every control, then leave by the bar's back and by system Back.
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
    const out = { throws: [], silent: [], tried: 0, controls: 0, levels: 0, backFail: [], sysBackFail: [], shape: [], decisions: new Set() };
    const hash = () => { let h = 0; const t = x.areaEl.innerHTML + x.leadEl.innerHTML; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return h; };
    const snap = () => JSON.stringify([x.hi, x.hist.length, x.stack.map(v => v.t + (v.ctx || '') + (v.k || '')), x.sel, x.track, x.marker, x.loop, x.spec, x.speed, x.beats, x.snapBeats, !!x.mhost.innerHTML, x.toastEl.classList.contains('show') && x.toastEl.textContent, hash(), x.ph, x.view.a.t, x.view.b.t, x.where, x.rwhere, x.hand && x.hand.at, !!x.rec, JSON.stringify(x.exp), document.activeElement && document.activeElement.tagName, JSON.stringify(x.recSet)]);
    const ctxs = { rest: [], edit: ['edit'], sound: ['sound'], add: ['add'], range: [], track: [], audio: [], play: [], music: ['add', 'music'], marker: [] };
    const prep = ctx => {
      x.reset(S.live.doc()); x.toastEl.classList.remove('show');
      x.ph = 620;
      if (ctx === 'range') x.sel = [315, 440];
      if (ctx === 'track') x.addTrack({ src: 'music1', name: '轻快的早晨', lane: 1 });
      if (ctx === 'marker') { x.onTool('marker'); x.marker = x.doc.markers[0].id; }
      if (ctx === 'audio' || ctx === 'play') { x.stack = [{ t: 'strip', ctx }]; x.renderArea(true); return; }
      x.stack = [x.rootView()].concat(ctxs[ctx].map(c => ({ t: 'strip', ctx: c }))); x.renderArea(true);
    };
    const shapeCheck = (where) => {
      // one bar: no headings with close/confirm icons; the leading end is the clock or a way back
      if (x.areaEl.querySelector('.vh, [data-a=ok], [data-a=cancel]')) out.shape.push(where + ': dialog-style header');
      const lead = x.leadEl.querySelector('[data-a=back], [data-a=time], .tm');
      if (!lead) out.shape.push(where + ': no back at the leading end');
      if (x.stack.length > 1 || x.top.t !== 'strip' || x.top.ctx !== 'rest') { if (!x.leadEl.querySelector('[data-a=back]') && !(x.hand && x.hand.mode === 'lift')) out.shape.push(where + ': not rest but no back'); }
      x.areaEl.querySelectorAll('.bigbtn').forEach(e => out.decisions.add(e.textContent.trim()));
    };
    for (const ctx of Object.keys(ctxs)) {
      prep(ctx);
      const keys = [...x.areaEl.querySelectorAll('[data-a=tool]')].map(e => e.dataset.k);
      shapeCheck(ctx);
      for (const k of keys) {
        prep(ctx); out.tried++;
        const before = snap();
        try { x.areaEl.querySelector('[data-a=tool][data-k="' + k + '"]').click(); } catch (e) { out.throws.push(ctx + ':' + k + ' ' + e.message); continue; }
        await wait(30);
        if (snap() === before) out.silent.push(ctx + ':' + k);
        if (x.mhost.innerHTML) { x.closeModal(); continue; }   // system pickers and the one confirm
        out.levels++;
        const where = ctx + ':' + k;
        shapeCheck(where);
        // controls inside the level
        const n = x.areaEl.querySelectorAll('[data-a]').length;
        for (let i = 0; i < n; i++) {
          const e = x.areaEl.querySelectorAll('[data-a]')[i]; if (!e) continue;
          const a = e.dataset.a; if (a === 'tool') continue;
          out.controls++;
          const b0 = snap();
          try { e.click(); } catch (err) { out.throws.push(where + ' > ' + a + ' ' + err.message); }
          await wait(20);
          if (snap() === b0) out.silent.push(where + ' > ' + a + (e.dataset.k ? '[' + e.dataset.k + ']' : ''));
          x.closeModal();
          prep(ctx); try { x.areaEl.querySelector('[data-a=tool][data-k="' + k + '"]').click(); } catch (err) { /* checked above */ } await wait(10); if (x.mhost.innerHTML) x.closeModal();
        }
        // leave by the bar's back, then by system Back (Esc)
        for (const how of ['bar', 'system']) {
          prep(ctx); x.areaEl.querySelector('[data-a=tool][data-k="' + k + '"]').click(); await wait(20); if (x.mhost.innerHTML) x.closeModal();
          const d0 = x.stack.length, t0 = x.top.t + (x.top.ctx || '');
          const wasRoot = d0 === 1 && x.top.t === 'strip' && x.top.ctx === 'rest';
          try {
            if (how === 'bar') { const bb = x.leadEl.querySelector('[data-a=back]'); if (bb) bb.click(); else if (!wasRoot) throw new Error('no back'); }
            else window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
          } catch (err) { (how === 'bar' ? out.backFail : out.sysBackFail).push(where + ' ' + err.message); continue; }
          await wait(20);
          const t1 = x.top.t + (x.top.ctx || '');
          const left = x.stack.length < d0 || t1 !== t0 || wasRoot;
          if (!left) (how === 'bar' ? out.backFail : out.sysBackFail).push(where + ' stayed at ' + t1);
        }
      }
    }
    out.decisions = [...out.decisions];
    return out;
  })()`);
  console.log(JSON.stringify(res, null, 1));
  console.log('page errors', JSON.stringify(b.errors));
} finally { await b.close(); }
