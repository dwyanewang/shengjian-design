// Every tool in every category and context: what it opens, that its tool is marked, that no row holds a back control,
// and that it can be left by the visible means (the marked tool again, or the worded way out) and by system Back (Esc).
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
    const TALL = ['export', 'say', 'plan', 'tts', 'sub', 'clone', 'list']; const out = { throws: [], tried: 0, controls: 0, opened: [], notMarked: [], backInRows: [], visibleFail: [], sysFail: [], silent: [], playMoved: [], decisions: new Set() };
    const contexts = ['rest', 'range', 'piece', 'track', 'marker'], cats = ['ctx', 'edit', 'sound', 'add', 'more'];
    const prep = (ctx, cat) => {
      x.reset(S.live.doc()); x.toastEl.classList.remove('show'); x.ph = 620;
      if (ctx === 'range') x.sel = [315, 440];
      if (ctx === 'piece') { x.doc = Object.assign({}, x.doc, { pieces: [{ src: 'voice', s: 0, e: 480 }, { src: 'voice', s: 480, e: 1010 }, { src: 'voice', s: 1010, e: 1610 }] }); x.hist[0].doc = x.doc; x.sel = [480, 1010]; }
      if (ctx === 'track') { x.addTrack({ src: 'music1', name: '轻快的早晨', lane: 1 }); }
      if (ctx === 'marker') { x.onTool('marker'); x.marker = x.doc.markers[0].id; }
      x.stack = [x.rootView()]; x.renderArea(true); x.cat = cat; x.renderArea(true);
    };
    // where play comes to rest: the audio's own height animation is run to its end first
    const pos = () => { x.tlEl.getAnimations().forEach(a => a.finish()); const p = x.playEl.getBoundingClientRect(); return Math.round(p.left) + ',' + Math.round(p.top); };
    const hash = () => { let h = 0; const t = x.areaEl.innerHTML + x.toolsEl.innerHTML + x.tmEl.innerHTML; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return h; };
    const snap = () => JSON.stringify([x.hi, x.hist.length, x.stack.map(v => v.t + (v.ctx || '')), x.sel, x.track, x.marker, x.loop, x.spec, x.speed, !!x.mhost.innerHTML, x.toastEl.classList.contains('show') && x.toastEl.textContent, hash(), x.ph, x.view.a.t, x.view.b.t, x.cat, x.markTool]);
    for (const ctx of contexts) for (const cat of cats) {
      if ((ctx === 'track' || ctx === 'marker') && cat !== 'ctx') continue;
      prep(ctx, cat);
      const keys = [...x.toolsEl.querySelectorAll('[data-a=tool]')].map(e => e.dataset.k).concat(['say']);
      for (const k of keys) {
        prep(ctx, cat); out.tried++;
        const p0 = pos(), before = snap();
        const el = k === 'say' ? x.catsEl.querySelector('[data-k=say]') : x.toolsEl.querySelector('[data-a=tool][data-k="' + k + '"]');
        try { el.click(); } catch (e) { out.throws.push(ctx + '/' + cat + ':' + k + ' ' + e.message); continue; }
        await wait(20);
        if (snap() === before) out.silent.push(ctx + '/' + cat + ':' + k);
        if (scr.querySelectorAll('.tools [data-a=back], .cats [data-a=back]').length) out.backInRows.push(ctx + '/' + cat + ':' + k);
        if (x.mhost.innerHTML) { x.closeModal(); continue; }
        if (x.stack.length < 2) continue;
        const where = ctx + '/' + cat + ':' + k + '→' + x.top.t;
        out.opened.push(where);
        const marked = scr.querySelector('.tools .act.mark, .cats .saypill.mark, .hdr .xbtn.mark');
        if (!marked) out.notMarked.push(where);
        const tall = TALL.includes(x.top.t);
        if (pos() !== p0 && !tall) out.playMoved.push(where + ' ' + p0 + '→' + pos());
        scr.querySelectorAll('.area .bigbtn').forEach(e => out.decisions.add(e.textContent.trim()));
        // controls inside
        const n = x.areaEl.querySelectorAll('[data-a]').length;
        for (let i = 0; i < n; i++) {
          const e = x.areaEl.querySelectorAll('[data-a]')[i]; if (!e) continue;
          out.controls++;
          try { e.click(); } catch (err) { out.throws.push(where + ' > ' + e.dataset.a + ' ' + err.message); }
          await wait(15); x.closeModal();
          prep(ctx, cat); (k === 'say' ? x.catsEl.querySelector('[data-k=say]') : x.toolsEl.querySelector('[data-a=tool][data-k="' + k + '"]')).click(); await wait(10); x.closeModal();
        }
        // leave by the visible means: the marked tool again (or the worded way out)
        prep(ctx, cat); el.isConnected ? null : null; (k === 'say' ? x.catsEl.querySelector('[data-k=say]') : x.toolsEl.querySelector('[data-a=tool][data-k="' + k + '"]')).click(); await wait(20); x.closeModal();
        if (x.stack.length > 1) {
          const m = scr.querySelector('.tools .act.mark, .cats .saypill.mark, .hdr .xbtn.mark') || x.areaEl.querySelector('[data-a=back]');
          if (m) m.click(); await wait(20);
          if (x.stack.length > 1) out.visibleFail.push(where);
        }
        prep(ctx, cat); (k === 'say' ? x.catsEl.querySelector('[data-k=say]') : x.toolsEl.querySelector('[data-a=tool][data-k="' + k + '"]')).click(); await wait(20); x.closeModal();
        if (x.stack.length > 1) { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); await wait(20); if (x.stack.length > 1) out.sysFail.push(where); }
      }
    }
    out.decisions = [...out.decisions]; out.openedN = out.opened.length; delete out.opened;
    return out;
  })()`);
  console.log(JSON.stringify(res, null, 1));
  console.log('page errors', JSON.stringify(b.errors));
} finally { await b.close(); }
