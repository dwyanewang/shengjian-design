// v11 checks: the elevation rule, end words, the quiet plates' contrast, and the rest-state counts.
//  1 only the dock and play cast a shadow (at rest, with a setting open, with a task open, with tracks), light and dark;
//  2 every scale that names its ends (降噪 with its off stop, 自动调小, 起点) shows two end words, one line each, inside
//    the screen and the cover, apart from each other and from the knob at either extreme; zh/en, 1.0/1.3, 360/390;
//  3 contrast of what got quieter: undo/redo (enabled and disabled), "原声", the time tag, 导出, the tags on the audio,
//    track labels, the end words, the mic glyph; over the ground and over a track scrolled under the waterline; blur on
//    (the plate's tint over a 14 dp average of what is under it) and off (the solid plate or the bare canvas);
//  4 the rest state, counted: cast shadows, plates that float outside the dock, filled orange, strong points.
// Usage: node v11checks.mjs ROOT [counts-only]
import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
const ROOT = path.resolve(process.argv[2]), COUNTS = process.argv[3] === 'counts';
const b = await launch();
let fails = 0;
const ok = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 1200) : '')); if (!c) fails++; };
const LIB = `
  window.__X = () => document.querySelector('.scr[data-scene=live]')._bench;
  window.__wait = ms => new Promise(r => setTimeout(r, ms));
  window.__fin = () => document.getAnimations().forEach(a => { try { a.finish(); } catch (e) { /* infinite */ } });
  window.__vis = e => { if (!e || !e.isConnected) return false; for (let p = e; p && p.nodeType === 1; p = p.parentElement) { const cs = getComputedStyle(p); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false; } const q = e.getBoundingClientRect(); return q.width > 1 && q.height > 1; };
  // a cast shadow: an outer box-shadow part with an offset or a blur (a spread-only ring or an inset line is a hairline)
  window.__cast = str => { if (!str || str === 'none') return false; const parts = str.split(/,(?![^(]*\\))/); return parts.some(p => { if (/inset/.test(p)) return false; const col = p.match(/rgba?\\([^)]*\\)/); if (col) { const v = col[0].match(/[\\d.]+/g).map(Number); if (v.length > 3 && v[3] === 0) return false; } const n = p.replace(/rgba?\\([^)]*\\)/, '').match(/-?[\\d.]+px/g) || []; const [x = 0, y = 0, bl = 0] = n.map(parseFloat); return x !== 0 || y !== 0 || bl > 0; }); };
  window.__shadows = scr => { const out = []; scr.querySelectorAll('*').forEach(e => { if (e.tagName === 'CANVAS' || e.closest('.kbd') || e.closest('.mhost') || !__vis(e)) return; for (const ps of [null, '::before', '::after']) { const cs = getComputedStyle(e, ps); if (ps && (cs.content === 'none' || cs.content === 'normal')) continue; if (__cast(cs.boxShadow)) out.push((e.className && e.className.baseVal === undefined ? e.className : e.tagName).toString().trim().split(/\\s+/)[0] + (ps || '')); } }); return out; };
  window.__rgba = (scr, s) => { const d = document.createElement('i'); d.style.color = s; scr.appendChild(d); const c = getComputedStyle(d).color; d.remove(); const v = (c.match(/[\\d.]+/g) || []).map(Number); return [v[0], v[1], v[2], v[3] === undefined ? 1 : v[3]]; };
  window.__lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  window.__cr = (a, b) => { const p = __lum(a), q = __lum(b); return (Math.max(p, q) + 0.05) / (Math.min(p, q) + 0.05); };
  window.__over = (t, u) => [0, 1, 2].map(i => t[i] * t[3] + u[i] * (1 - t[3]));
`;
try {
  // ---------------------------------------------------------------- 4 counts at rest (also run on v10 for the before)
  for (const theme of ['light', 'dark']) {
    await b.viewport(390, 844, true, 2, theme === 'dark');
    await b.open('file://' + path.join(ROOT, 'index.html'));
    await sleep(1000);
    const r = await b.eval(`(async () => { ${LIB}
      const x = __X(); x.scr.scrollIntoView({ block: 'start' }); window.resetLive(); await __wait(300); __fin(); x.hideCoach(); x.measure(); x.draw();
      const scr = x.scr, acc = __rgba(scr, 'var(--accent)'), dock = x.botEl;
      const shadows = __shadows(scr);
      // plates outside the dock: things that float on the canvas or the header with their own ground (a fill or a ring)
      const plates = [...scr.querySelectorAll('.hdr *, .stage > *:not(.bot):not(.tl):not(.kbd), .stage > .water *, .tl *')].filter(e => { if (!__vis(e) || e.closest('.bot') || e.tagName === 'CANVAS') return false; const cs = getComputedStyle(e); const bg = (cs.backgroundColor.match(/[\\d.]+/g) || []).map(Number); const filled = bg.length > 3 ? bg[3] > 0.05 : bg.length === 3; const ring = /inset|0px 0px 0px/.test(cs.boxShadow) || parseFloat(cs.borderTopWidth) > 0; return (filled || ring) && e.offsetWidth >= 20 && e.offsetHeight >= 18 && !e.parentElement.closest('.listen .orig, .ur'); }).map(e => e.className.toString().split(' ')[0] || e.tagName);
      const filled = [...scr.querySelectorAll('*')].filter(e => __vis(e) && e.offsetWidth >= 14 && e.offsetHeight >= 14 && getComputedStyle(e).backgroundColor === 'rgb(' + acc.slice(0, 3).join(', ') + ')').map(e => e.className.toString().split(' ')[0]);
      return { shadows, plates: [...new Set(plates)], nPlates: plates.length, filled };
    })()`);
    console.log(`   rest counts ${theme}: cast shadows ${r.shadows.length} [${r.shadows.join(', ')}]; floating plates ${r.nPlates} [${r.plates.join(', ')}]; filled orange ${r.filled.length} [${r.filled.join(', ')}]`);
  }
  if (COUNTS) { console.log('page errors:', JSON.stringify(b.errors.filter(e => !/ERR_FILE/.test(e)))); process.exit(0); }
  // ---------------------------------------------------------------- 1 the elevation rule
  for (const theme of ['light', 'dark']) for (const [w, h] of [[360, 780], [390, 844]]) {
    await b.viewport(w, h, true, 2, theme === 'dark');
    await b.open('file://' + path.join(ROOT, 'index.html'));
    await sleep(1000);
    const r = await b.eval(`(async () => { ${LIB}
      const x = __X(), S = window.SCENES; x.scr.scrollIntoView({ block: 'start' });
      const states = {
        rest: () => {}, history: () => { x.onTool('split'); }, selection: () => { x.sel = [315, 440]; x.stack = [x.rootView()]; x.renderArea(); },
        denoise: () => x.onTool('dn'), fade: () => x.onTool('fade'), export: () => x.openExport(), tts: () => x.onTool('tts'),
        tracks: () => { x.reset(S.kTracks5.doc()); x.stack = [x.rootView()]; x.renderArea(true); x.scrollLanes(1e6); },
        trackVol: () => { x.reset(S.kTracks5.doc()); x.track = 'te'; x.stack = [x.rootView(), { t: 'tvol' }]; x.renderArea(true); },
        playing: () => { x.play(); },
      };
      const out = {};
      for (const [n, f] of Object.entries(states)) { window.resetLive(); await __wait(60); f(); x.renderArea(); await __wait(80); __fin(); x.hideCoach(); out[n] = __shadows(x.scr); x.stopPlay(); }
      // static screens at rest
      out.static = [];
      for (const sc of ['t6a', 'kRestEdit', 'kRestSound', 'kRestAdd', 'kPiece', 'kTrackRow', 'kEnRest', 'kFsRest', 'kPlaying', 'kTracks5']) { const scr = document.querySelector('.scr[data-scene="' + sc + '"]'); if (scr) { const s = __shadows(scr).sort(); if (s.join() !== 'bot::before,play') out.static.push(sc + ': ' + s.join(', ')); } }
      window.resetLive(); return out; })()`);
    const want = s => s.length === 2 && s.includes('bot::before') && s.includes('play');
    for (const [n, s] of Object.entries(r)) if (n !== 'static') ok(want(s), `${w} ${theme} ${n}: only the dock and play cast a shadow`, want(s) ? undefined : s);
    ok(r.static.length === 0, `${w} ${theme}: ten static screens at rest, same rule`, r.static);
  }
  // ---------------------------------------------------------------- 2 end words
  for (const [w, h] of [[360, 780], [390, 844]]) for (const lang of ['zh', 'en']) for (const fs13 of ['0', '1']) {
    await b.viewport(w, h, true, 2, false);
    await b.open('file://' + path.join(ROOT, 'index.html') + `?lang=${lang}&fs=${fs13}`);
    await sleep(900);
    const r = await b.eval(`(async () => { ${LIB}
      const x = __X(), S = window.SCENES; x.scr.scrollIntoView({ block: 'start' });
      const cases = {
        'dn off': () => { x.onTool('dn'); x.layerSetQuiet(l => { l.on = false; }); x.renderArea(); },
        'dn max': () => { x.onTool('dn'); x.layerSetQuiet(l => { l.on = true; l.v = 4; }); x.renderArea(); },
        'range dn off': () => { x.sel = [315, 440]; x.stack = [x.rootView()]; x.onTool('dn'); x.layerSetQuiet(l => { l.on = false; }); x.renderArea(); },
        'duck off': () => { x.reset(S.kTrackRow.doc()); x.track = 'tm'; x.stack = [x.rootView(), { t: 'duck' }]; x.trackSet({ duck: false }, ''); x.renderArea(); },
        'duck max': () => { x.reset(S.kTrackRow.doc()); x.track = 'tm'; x.stack = [x.rootView(), { t: 'duck' }]; x.trackSet({ duck: true, duckTo: 0.05 }, ''); x.renderArea(); },
        'start 0': () => { x.reset(S.kTrackRow.doc()); x.track = 'tm'; x.stack = [x.rootView(), { t: 'tstart' }]; x.renderArea(); },
        'start 60': () => { x.reset(S.kTrackRow.doc()); x.track = 'tm'; x.stack = [x.rootView(), { t: 'tstart' }]; x.trackSet({ off: 600 }, ''); x.renderArea(); },
      };
      const out = [];
      for (const [n, f] of Object.entries(cases)) {
        window.resetLive(); await __wait(30); f(); await __wait(60); __fin();
        const sl = x.panelEl.querySelector('.sl.ew2'), s = x.scr.getBoundingClientRect(), cv = x.panelEl.querySelector('.cover').getBoundingClientRect();
        if (!sl) { out.push({ n, missing: true }); continue; }
        const ws = [...sl.querySelectorAll('.ew')].filter(__vis), k = sl.querySelector('.sk').getBoundingClientRect();
        const rs = ws.map(e => e.getBoundingClientRect()), lh = ws.map(e => parseFloat(getComputedStyle(e).lineHeight) || 16);
        const oneLine = rs.every((q, i) => q.height <= lh[i] * 1.5), inside = rs.every(q => q.left >= s.left - 0.5 && q.right <= s.right + 0.5 && q.left >= cv.left - 0.5 && q.right <= cv.right + 0.5 && q.bottom <= cv.bottom + 0.5);
        const apart = rs.length === 2 && rs[0].right + 8 <= rs[1].left, clearKnob = rs.every(q => q.top >= k.bottom - 0.5 || q.right <= k.left || q.left >= k.right);
        out.push({ n, words: ws.map(e => e.textContent), oneLine, inside, apart, clearKnob, ok: ws.length === 2 && oneLine && inside && apart && clearKnob });
      }
      window.resetLive(); return out; })()`);
    const bad = r.filter(o => !o.ok);
    ok(bad.length === 0, `${w} ${lang} ${fs13 === '1' ? '1.3' : '1.0'}: ${r.length} scales name both ends (${[...new Set(r.map(o => (o.words || []).join('…')))].join(', ')}): one line each, inside the cover and the screen, apart, clear of the knob at either extreme`, bad);
  }
  // ---------------------------------------------------------------- 3 contrast of the quieter things
  for (const theme of ['light', 'dark']) {
    await b.viewport(390, 844, true, 2, theme === 'dark');
    await b.open('file://' + path.join(ROOT, 'index.html'));
    await sleep(1000);
    const r = await b.eval(`(async () => { ${LIB}
      const x = __X(), S = window.SCENES; x.scr.scrollIntoView({ block: 'start' });
      const scr = x.scr, ground = __rgba(scr, 'var(--g-bot)');
      // what is under an element on the canvas: the darkest (light) / lightest (dark) single pixel, and the worst 14 dp average
      const under = el => { x.measure(); x.draw(); const c = x.cv.getBoundingClientRect(), q = el.getBoundingClientRect(), d = x.dpr; const X0 = Math.max(0, Math.round((q.left - c.left) * d)), Y0 = Math.max(0, Math.round((q.top - c.top) * d)), Wd = Math.max(1, Math.round(q.width * d)), Hd = Math.max(1, Math.round(q.height * d));
        const data = x.cv.getContext('2d').getImageData(X0, Y0, Math.min(Wd, x.cv.width - X0), Math.min(Hd, x.cv.height - Y0)).data, dark = __lum(ground) < 0.2;
        let worst = null, sum = [0, 0, 0], n = 0;
        for (let i = 0; i < data.length; i += 4) { const px = __over([data[i], data[i + 1], data[i + 2], data[i + 3] / 255], ground); sum[0] += px[0]; sum[1] += px[1]; sum[2] += px[2]; n++; if (!worst || (dark ? __lum(px) > __lum(worst) : __lum(px) < __lum(worst))) worst = px; }
        return { worst: worst || ground, avg: n ? sum.map(v => v / n) : ground }; };
      const bgOf = (el, solidVar) => { const cs = getComputedStyle(el); const v = (cs.backgroundColor.match(/[\\d.]+/g) || []).map(Number); return v.length ? [v[0], v[1], v[2], v[3] === undefined ? 1 : v[3]] : [0, 0, 0, 0]; };
      const measure = (label, el, textEl, under0, solid) => {
        const tcs = getComputedStyle(textEl), t = __rgba(scr, tcs.color), tc = [t[0], t[1], t[2]];
        const plate = bgOf(el), u = under0 || under(el);
        const blurBg = __over(plate, u.avg), solidBg = solid ? __over(__rgba(scr, solid), u.worst) : __over(plate, u.worst);
        return [label, Math.round(__cr(tc, blurBg) * 100) / 100, Math.round(__cr(tc, solidBg) * 100) / 100];
      };
      const out = [];
      // at rest, over the ground
      window.resetLive(); await __wait(200); __fin(); x.hideCoach();
      const ur = scr.querySelector('.water .ur');
      out.push(measure('undo disabled (rest, idle plate)', ur, x.undoEl, null, 'var(--quiet-idle)'));
      out.push(measure('time tag', x.tmEl, x.tmEl.querySelector('b'), null, 'var(--float-solid)'));
      out.push(measure('time tag (total)', x.tmEl, x.tmEl.querySelector('small'), null, 'var(--float-solid)'));
      { const xb = scr.querySelector('.xbtn'); const u = { worst: __rgba(scr, 'var(--g-top)'), avg: __rgba(scr, 'var(--g-top)') }; out.push(measure('导出 on the header', xb, xb.querySelector('span'), u)); }
      // with history and a setting: undo enabled, "original" shown, tags on the audio
      x.onTool('dn'); x.back(true); await __wait(100); __fin();
      out.push(measure('undo enabled', ur, x.undoEl, null, 'var(--quiet-solid)'));
      out.push(measure('redo disabled, plate', ur, x.redoEl, null, 'var(--quiet-solid)'));
      out.push(measure('原声', x.origEl, x.origEl.querySelector('span'), null, 'var(--quiet-solid)'));
      { const ch = scr.querySelector('.lchip'); if (ch) out.push(measure('tag on the audio', ch, ch, null, 'var(--float-solid)')); }
      // eight tracks scrolled so a track runs under the waterline
      const d8 = S.kTracks5.doc(); d8.tracks = d8.tracks.concat(d8.tracks.slice(0, 3).map((t, i) => Object.assign({}, t, { id: t.id + 'b' + i, name: t.name + ' 2' })));
      x.reset(d8); x.ph = 500; x.onTool('split'); x.stack = [x.rootView()]; x.renderArea(true); x.layerSetQuiet && 0; x.doc = Object.assign({}, x.doc, { layers: [{ id: 'lz', k: 'dn', v: 2, on: true }] }); x.renderTop(); x.renderChips();
      for (const off of [0, 40, 80, 120, 160]) { x.scrollLanes(off); await __wait(30); x.measure(); x.draw();
        out.push(measure('undo enabled over tracks (scroll ' + off + ')', ur, x.undoEl, null, 'var(--quiet-solid)'));
        out.push(measure('redo disabled over tracks (scroll ' + off + ')', ur, x.redoEl, null, 'var(--quiet-solid)'));
        if (off === 80) { const h = x.hi, hs = x.hist; x.hi = 0; x.hist = hs.slice(0, 1); x.renderTop(); out.push(measure('undo disabled over tracks, idle plate (scroll 80)', ur, x.undoEl, null, 'var(--quiet-idle)')); x.hist = hs; x.hi = h; x.renderTop(); }
        out.push(measure('原声 over tracks (scroll ' + off + ')', x.origEl, x.origEl.querySelector('span'), null, 'var(--quiet-solid)'));
        const tl = scr.querySelector('.tlabel'); if (tl) out.push(measure('track label (scroll ' + off + ')', tl, tl.querySelector('span'), null, 'var(--float-solid)'));
      }
      // end words and the mic glyph, on the dock
      window.resetLive(); await __wait(60); x.onTool('dn'); await __wait(60); __fin();
      const dockBg = __over(__rgba(scr, 'var(--dock-tint)'), ground), dockSolid = __rgba(scr, 'var(--dock-solid)').slice(0, 3);
      const ew = x.panelEl.querySelector('.ew'), ewc = __rgba(scr, getComputedStyle(ew).color).slice(0, 3);
      out.push(['end words on the dock', Math.round(__cr(ewc, dockBg) * 100) / 100, Math.round(__cr(ewc, dockSolid) * 100) / 100]);
      window.resetLive(); await __wait(60); __fin();
      const mic = scr.querySelector('.sayf .sfm'), mc = __rgba(scr, getComputedStyle(mic).color).slice(0, 3), sink = __rgba(scr, 'var(--sink)'), tint = __rgba(scr, 'var(--mic-tint)');
      out.push(['mic glyph (icon, ≥ 3)', Math.round(__cr(mc, __over(tint, __over(sink, dockBg))) * 100) / 100, Math.round(__cr(mc, __over(tint, __over(sink, dockSolid))) * 100) / 100]);
      const pl = x.playEl, pc = __rgba(scr, getComputedStyle(pl).color).slice(0, 3), pb = __rgba(scr, getComputedStyle(pl).backgroundColor).slice(0, 3);
      out.push(['play icon on its disc (icon, ≥ 3)', Math.round(__cr(pc, pb) * 100) / 100, Math.round(__cr(pc, pb) * 100) / 100]);
      window.resetLive(); return out; })()`);
    console.log(`   contrast ${theme} (blur on : off):`);
    for (const [label, a, c] of r) {
      const icon = /undo|redo|glyph|icon/.test(label), disabled = /disabled/.test(label), need = icon ? 3 : 4.5;
      const pass = disabled ? true : Math.min(a, c) >= need;
      ok(pass, `${theme} ${label}: ${a}:1 with blur, ${c}:1 without${disabled ? ' (disabled; reported, WCAG exempt)' : ' (need ' + need + ')'}`);
    }
  }
  console.log('page errors:', JSON.stringify(b.errors.filter(e => !/ERR_FILE/.test(e))));
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
} finally { await b.close(); }
