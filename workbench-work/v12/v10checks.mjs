// v10 checks: the dock's anatomy.
//  1 the dock has the same height at rest and with every live setting open (every tool, every context), at 360 and
//    390, in Chinese and English, at font scale 1.0 and 1.3; play does not move; the slot holds exactly one thing;
//    the dock shows exactly three tiers (instrument, tools, categories);
//  2 every task: no tool row or category row; at most four tiers (rows of settings + the decision row, counted where
//    they show); it ends only by its worded decisions: a tap on the audio, the header, the name, undo all leave it
//    open; system Back takes the cancelling decision and leaves the audio as it was;
//  3 play (and the other things on the waterline) never overlap the selection handles: selections at both ends,
//    zoomed in at both ends, with five tracks, at 360 and 390 and font scale 1.3; the main line ends above the
//    waterline; with many tracks the last one can be scrolled fully above it;
//  4 at most one filled orange on any screen; 5 no external URLs in any file; 6 heights for the page.
import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
import fs from 'node:fs';
const ROOT = path.resolve(process.argv[2]);
const b = await launch();
let fails = 0;
const ok = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 1400) : '')); if (!c) fails++; };
const LIB = `
  window.__X = () => document.querySelector('.scr[data-scene=live]')._bench;
  window.__wait = ms => new Promise(r => setTimeout(r, ms));
  window.__vis = e => { if (!e) return false; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return false; const q = e.getBoundingClientRect(); return q.width > 1 && q.height > 1; };
  window.__tiers = x => { const d = x.botEl.getBoundingClientRect(); return [...x.botEl.querySelectorAll('[data-tier]')].filter(e => { if (!__vis(e) || e.closest('[style*="display: none"]')) return false; for (let p = e.parentElement; p && p !== x.botEl; p = p.parentElement) if (!__vis(p)) return false; const q = e.getBoundingClientRect(); return q.bottom > d.top + 2 && q.top < d.bottom - 2; }).map(e => e.dataset.tier); };
  window.__play = x => { const p = x.playEl.getBoundingClientRect(), s = x.scr.getBoundingClientRect(); return [Math.round(p.left - s.left), Math.round(p.top - s.top)]; };
`;
try {
  // ---------------------------------------------------------------- 1 live settings: same dock, one thing in the slot
  for (const [w, h] of [[360, 780], [390, 844]]) for (const lang of ['zh', 'en']) for (const fs13 of ['0', '1']) {
    await b.viewport(w, h, true, 2, false);
    await b.open('file://' + path.join(ROOT, 'index.html') + `?lang=${lang}&fs=${fs13}`);
    await sleep(900);
    const r = await b.eval(`(async () => { ${LIB}
      const x = __X(), S = window.SCENES, WB = window.WB; x.scr.scrollIntoView({ block: 'start' }); await __wait(200);
      const out = { live: [], bad: [], heights: {}, kinds: {} };
      const ctxs = {
        rest: () => { x.reset(S.live.doc()); },
        range: () => { x.reset(S.live.doc()); x.sel = [315, 440]; x.stack = [x.rootView()]; },
        piece: () => { const d = S.kPiece.doc(); x.reset(d); x.sel = [480, 1010]; x.stack = [x.rootView()]; },
        track: () => { x.reset(S.kTrackRow.doc()); x.track = 'tm'; x.stack = [x.rootView()]; },
        marker: () => { x.reset(S.kLong.doc()); x.marker = 'mk1'; x.stack = [x.rootView()]; },
      };
      const cats = ['ctx', 'edit', 'sound', 'add', 'more'];
      let rest = null, play0 = null;
      for (const [cn, setup] of Object.entries(ctxs)) for (const cat of cats) {
        setup(); x.cat = cat; x.renderArea(true); await __wait(30); document.getAnimations().forEach(a => { try { a.finish(); } catch (e) { /* */ } }); x.measure();
        const keys = [...x.toolsEl.querySelectorAll('.act')].map(a => a.dataset.k);
        if (rest === null) { rest = x.botEl.offsetHeight; play0 = __play(x); }
        for (const k of keys) {
          setup(); x.cat = cat; x.renderArea(true); x.closeModal();
          const el = x.toolsEl.querySelector('.act[data-k="' + k + '"]'); if (!el) continue;
          x.onAct('tool', el); await __wait(0); document.getAnimations().forEach(a => { try { a.finish(); } catch (e) { /* */ } }); x.measure();
          const v = x.top.t, kind = x.mhost.querySelector('.sheet') ? 'sheet' : x.mhost.innerHTML ? 'dialog' : x.task ? 'task' : x.stack.length > 1 ? 'live' : 'instant';
          out.kinds[k] = out.kinds[k] || kind;
          if (kind === 'live') {
            const H = x.botEl.offsetHeight, tiers = __tiers(x), pl = __play(x), covers = x.panelEl.querySelectorAll(':scope > .cover').length, done = !!x.panelEl.querySelector('.cfoot [data-a=done]');
            const others = [x.slotEl, x.toolsEl, x.catsEl].filter(__vis).length, orange = !!x.panelEl.querySelector('.dbtn.pri');
            out.live.push(cn + ':' + k);
            if (H !== rest || covers !== 1 || others || !done || orange || tiers.join() !== 'name,control,out' || pl[0] !== play0[0] || pl[1] !== play0[1]) out.bad.push({ k: cn + ':' + k, H, rest, covers, others, done, orange, tiers, pl, play0 });
          }
          x.closeModal(); if (x.typing) x.setTyping(false); x.back(true); x.back(true);
        }
      }
      // at rest the slot holds the sentence and nothing else; three tiers
      x.reset(S.live.doc()); x.renderArea(true); await __wait(30);
      out.restSlot = [x.slotEl.querySelectorAll(':scope > .si').length, x.slotEl.querySelectorAll('.sayf').length, __tiers(x).join()];
      window.resetLive(); return out; })()`);
    const tag = `${w} ${lang} ${fs13 === '1' ? '1.3' : '1.0'}`;
    ok(r.bad.length === 0 && r.live.length > 40, `${tag}: ${r.live.length} live settings (every tool in every context and category that opens one): its panel covers the whole dock at exactly the toolbar's height (no tools, no categories, no sentence), three rows (name and value · control · way out), one tonal 完成 and no orange; play stays put`, r.bad);
    ok(r.restSlot[0] === 1 && r.restSlot[1] === 1 && r.restSlot[2] === 'instrument,tools,categories', `${tag}: at rest the slot holds the sentence only; three tiers`, r.restSlot);
    if (w === 390 && lang === 'zh' && fs13 === '0') {
      const by = {}; Object.entries(r.kinds).forEach(([k, v]) => { (by[v] = by[v] || []).push(k); });
      console.log('   tool kinds (as tapped from the row):', JSON.stringify(by));
    }
  }
  // ---------------------------------------------------------------- 2 tasks take the dock over and end only by deciding
  for (const [w, h] of [[360, 780], [390, 844]]) for (const fs13 of ['0', '1']) {
    await b.viewport(w, h, true, 2, false);
    await b.open('file://' + path.join(ROOT, 'index.html') + `?fs=${fs13}`);
    await sleep(900);
    const r = await b.eval(`(async () => { ${LIB}
      const x = __X(), S = window.SCENES; x.scr.scrollIntoView({ block: 'start' }); await __wait(200);
      const tasks = {
        export: () => x.onAct('export', x.scr.querySelector('.xbtn')),
        exportSel: () => { x.sel = [315, 440]; x.stack = [x.rootView()]; x.renderArea(); x.onAct('export', x.scr.querySelector('.xbtn')); },
        tts: () => x.onTool('tts'), sub: () => { x.onTool('sub'); x.top.s = { lines: true }; x.renderArea(); }, clone: () => x.onTool('clone'),
        rec: () => x.onTool('rec'), move: () => { x.sel = [315, 440]; x.stack = [x.rootView()]; x.onTool('move'); },
        pauses: () => x.onTool('pauses'), chorus: () => { x.reset(S.t3a.doc()); x.onTool('chorus'); },
        history: () => { x.onTool('split'); x.onTool('history'); }, plan: () => x.startPlan('剪掉开头5秒，结尾淡出3秒，导出MP3'),
        say: () => { x.onTool('say'); }, mname: () => { x.reset(S.kLong.doc()); x.marker = 'mk1'; x.stack = [x.rootView()]; x.onTool('mrename'); },
      };
      const out = [];
      for (const [name, open] of Object.entries(tasks)) {
        window.resetLive(); await __wait(30); open(); x.renderArea(); await __wait(60); document.getAnimations().forEach(a => { try { a.finish(); } catch (e) { /* */ } }); x.measure();
        const doc0 = x.doc, hi0 = x.hi, n0 = x.hist.length;
        const rec = { name, view: x.top.t, task: x.task, tools: __vis(x.toolsEl), cats: __vis(x.catsEl), slot: __vis(x.slotEl), tiers: __tiers(x), undo: __vis(x.undoEl) };
        rec.dec = !!x.botEl.querySelector('[data-tier=decision]');
        rec.cancel = !!x.botEl.querySelector('.dec [data-a=back]');
        // things outside the task leave it open
        const g = x.geom(); x.tap({ x: x.W * 0.7, y: g.mainY + g.mainH * 0.5 }, { z: 'main' }, u => u); await __wait(10);
        x.onAct('export', x.scr.querySelector('.xbtn')); x.onAct('title', x.scr.querySelector('.ttl')); x.onAct('time', x.tmEl); x.undo(); x.redo();
        rec.stillOpen = x.top.t === rec.view && !x.mhost.innerHTML;
        // system Back is the cancelling decision
        if (x.typing && name !== 'say') { x.setTyping(false); }
        x.back(true); await __wait(10);
        rec.closed = !x.task && x.stack.length === 1; rec.same = x.hi === hi0 && x.hist.length === n0;
        out.push(rec);
      }
      window.resetLive(); return out; })()`);
    for (const t of r) {
      const maxT = 4, nT = t.tiers.length;
      const okT = t.task && !t.tools && !t.cats && !t.slot && nT >= 1 && nT <= maxT && (t.name === 'say' || (t.dec && t.cancel)) && t.stillOpen && t.closed && t.same && !t.undo;
      ok(okT, `${w}${fs13 === '1' ? ' 1.3' : ''} task «${t.name}»: takes the dock (no tools, no categories, no slot, no undo), ${nT} tier${nT > 1 ? 's' : ''} [${t.tiers.join(' · ')}], ${t.name === 'say' ? 'ends by sending or Back' : 'a worded cancel in its decision row'}; a tap on the audio, the header, the name or undo leaves it open; Back cancels and the audio is unchanged`, okT ? undefined : t);
    }
  }
  // ---------------------------------------------------------------- 3 play and the handles
  for (const [w, h] of [[360, 780], [390, 844]]) for (const fs13 of ['0', '1']) {
    await b.viewport(w, h, true, 2, false);
    await b.open('file://' + path.join(ROOT, 'index.html') + `?fs=${fs13}`);
    await sleep(900);
    const r = await b.eval(`(async () => { ${LIB}
      const S = window.SCENES, out = [];
      const check = (label, x) => {
        x.measure(); const c = x.cv.getBoundingClientRect(), g = x.geom();
        const water = [x.playEl, x.origEl, x.scr.querySelector('.water .ur')].filter(__vis).map(e => e.getBoundingClientRect());
        const hs = x.sel ? [0, 1].map(i => { const q = x.handleRect(i); return { left: c.left + q.l, right: c.left + q.r, top: c.top + q.t, bottom: c.top + q.b, cx: c.left + x.d2x(x.sel[i]), cy: c.top + g.handleY }; }) : [];
        const hit = hs.some(hh => water.some(p => hh.left < p.right && hh.right > p.left && hh.top < p.bottom && hh.bottom > p.top));
        const top = Math.min(...water.map(p => p.top)) - c.top;
        out.push({ label, hit, mainEnd: Math.round(g.blockY + g.blockH), waterTop: Math.round(top), clear: g.blockY + g.blockH <= top - 6, handles: hs.map(q => [Math.round(q.cx), Math.round(q.cy)]), play: water[0] ? [Math.round(water[0].left), Math.round(water[0].top)] : null });
      };
      const x = __X(); x.scr.scrollIntoView({ block: 'start' }); await __wait(150);
      const L = () => x.L;
      const sets = [
        ['live: selection at the start', () => { window.resetLive(); x.sel = [0, 90]; x.stack = [x.rootView()]; x.renderArea(); }],
        ['live: selection at the end', () => { window.resetLive(); x.sel = [L() - 110, L()]; x.stack = [x.rootView()]; x.renderArea(); }],
        ['live: zoomed in at the start', () => { window.resetLive(); x.view.a.snap(0); x.view.b.snap(200); x.sel = [0, 40]; x.stack = [x.rootView()]; x.renderArea(); }],
        ['live: zoomed in at the end', () => { window.resetLive(); x.view.a.snap(L() - 200); x.view.b.snap(L()); x.sel = [L() - 40, L()]; x.stack = [x.rootView()]; x.renderArea(); }],
        ['live: whole audio selected', () => { window.resetLive(); x.sel = [0, L()]; x.stack = [x.rootView()]; x.renderArea(); }],
        ['live: selection with a setting on it (fade)', () => { window.resetLive(); x.sel = [0, 90]; x.stack = [x.rootView()]; x.onTool('fade'); }],
        ['live: five tracks, selection at the start', () => { x.reset(S.kTracks5Sel.doc()); x.sel = [0, 120]; x.stack = [x.rootView()]; x.renderArea(); }],
        ['live: five tracks, selection at the end', () => { x.reset(S.kTracks5Sel.doc()); x.sel = [L() - 120, L()]; x.stack = [x.rootView()]; x.renderArea(); }],
        ['live: export open with a selection at the start', () => { window.resetLive(); x.sel = [0, 90]; x.stack = [x.rootView()]; x.openExport(); }],
      ];
      for (const [label, f] of sets) { f(); await __wait(30); document.getAnimations().forEach(a => { try { a.finish(); } catch (e) { /* */ } }); x.measure(); x.draw(); check(label, x); }
      // many tracks: the last one can be brought fully above the waterline
      const d8 = S.kTracks5.doc(); d8.tracks = d8.tracks.concat(d8.tracks.slice(0, 3).map((t, i) => Object.assign({}, t, { id: t.id + 'b' + i, name: t.name + ' 2' })));
      x.reset(d8); x.stack = [x.rootView()]; x.renderArea(true); await __wait(30); x.measure(); x.draw();
      x.scrollLanes(1e6); x.draw(); const g = x.geom(), last = g.lanes[g.lanes.length - 1], c = x.cv.getBoundingClientRect(), pt = x.playEl.getBoundingClientRect().top - c.top;
      const lanes = { laneMax: x._laneMax, lastBottom: Math.round(last.y + last.h), playTop: Math.round(pt) };
      // static scenes: every screen with a selection
      const stat = [];
      document.querySelectorAll('.scr[data-scene]').forEach(scr => { const y = scr._bench; if (!y || !y.sel || y.task || scr.dataset.scene === 'live') return; check(scr.dataset.scene, y); stat.push(out.pop()); });
      window.resetLive(); return { out, lanes, stat };
    })()`);
    for (const o of r.out) ok(!o.hit && o.clear, `${w}${fs13 === '1' ? ' 1.3' : ''} ${o.label}: the handles keep off play, "original" and undo; the main line ends at ${o.mainEnd}, above the waterline at ${o.waterTop}`, !o.hit && o.clear ? undefined : o);
    const bad = r.stat.filter(o => o.hit || !o.clear);
    ok(bad.length === 0 && r.stat.length >= 8, `${w}${fs13 === '1' ? ' 1.3' : ''}: all ${r.stat.length} static screens with a selection keep the handles off the waterline`, bad);
    ok(r.lanes.laneMax > 0 && r.lanes.lastBottom <= r.lanes.playTop - 4, `${w}${fs13 === '1' ? ' 1.3' : ''}: eight tracks scrolled to the end: the last one ends at ${r.lanes.lastBottom}, above play at ${r.lanes.playTop}`, r.lanes);
  }
  // ---------------------------------------------------------------- 4 one filled orange
  for (const [w, h] of [[360, 780], [390, 844]]) for (const theme of ['light', 'dark']) {
    await b.viewport(w, h, true, 2, theme === 'dark');
    await b.open('file://' + path.join(ROOT, 'index.html'));
    await sleep(1000);
    const r = await b.eval(`(() => { ${LIB}
      const out = { n: 0, bad: [] };
      document.querySelectorAll('.scr[data-scene]').forEach(scr => {
        const d = document.createElement('i'); d.style.color = 'var(--accent)'; scr.appendChild(d); const acc = getComputedStyle(d).color; d.remove();
        const filled = [...scr.querySelectorAll('*')].filter(e => { if (!__vis(e) || e.offsetWidth < 14 || e.offsetHeight < 14) return false; for (let p = e; p && p !== scr; p = p.parentElement) { const cs = getComputedStyle(p); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return false; } return getComputedStyle(e).backgroundColor === acc; });
        out.n++; if (filled.length > 1) out.bad.push(scr.dataset.scene + ': ' + filled.map(e => e.className || e.tagName).join(', '));
      });
      return out; })()`);
    ok(r.bad.length === 0, `${w} ${theme}: ${r.n} screens: at most one filled orange on each`, r.bad);
  }
  // ---------------------------------------------------------------- 5 no external URLs
  const files = fs.readdirSync(ROOT).filter(f => /\.(html|js|css)$/.test(f));
  const ext = files.flatMap(f => (fs.readFileSync(path.join(ROOT, f), 'utf8').match(/(https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}[^\s"'<>)]*/gi) || []).filter(u => !/^\/\/[^/]*$/.test(u) && /^(https?:)?\/\//i.test(u)).map(u => f + ': ' + u));
  ok(ext.length === 0, `no external URLs in ${files.join(', ')}`, ext);
  // ---------------------------------------------------------------- 6 heights for the page
  for (const [w, h] of [[360, 780], [390, 844]]) {
    await b.viewport(w, h, true, 2, false);
    await b.open('file://' + path.join(ROOT, 'index.html'));
    await sleep(900);
    const r = await b.eval(`(async () => { ${LIB}
      const x = __X(), S = window.SCENES; x.scr.scrollIntoView({ block: 'start' }); await __wait(150);
      const m = async (name, f) => { window.resetLive(); await __wait(20); f(); x.renderArea(); await __wait(450); document.getAnimations().forEach(a => { try { a.finish(); } catch (e) { /* */ } }); await __wait(60); x.measure(); const g = x.geom(), s = x.scr.getBoundingClientRect(), t = x.tlEl.getBoundingClientRect();
        return [name, { dock: x.botEl.offsetHeight + (x.typing ? 268 : 0), canvas: Math.round(x.botEl.getBoundingClientRect().top - t.top), main: Math.round(g.mainH), play: __vis(x.playEl) ? Math.round(x.playEl.getBoundingClientRect().top - s.top) : null }]; };
      const out = [];
      out.push(await m('rest', () => {}));
      out.push(await m('denoise', () => x.onTool('dn')));
      out.push(await m('export', () => x.openExport()));
      out.push(await m('tts', () => x.onTool('tts')));
      out.push(await m('typing', () => x.onTool('say')));
      window.resetLive(); return out; })()`);
    console.log(`   heights ${w}x${h} (screen ${h}, stage below the header): ` + r.map(([n, v]) => `${n}: dock ${v.dock}, canvas in view ${v.canvas}, main line ${v.main}, play at ${v.play}`).join(' | '));
  }
  console.log('page errors:', JSON.stringify(b.errors.filter(e => !/ERR_FILE_NOT_FOUND/.test(e))));
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
} finally { await b.close(); }
