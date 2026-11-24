// v7 checks (from v6, plus the row's cut item and the handles): (1) no text wraps inside a segment option, chip, tab or button on any screen, at 360 and 390, in Chinese
// and English, at normal size and 1.3; (2) the tool grid has the same column count at 360 and 390 at normal size;
// (3) tool labels ≥ 4.5:1 against the tray and the waveform ≥ 3:1 against its box, in light and dark.
import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
const ROOT = path.resolve(process.argv[2]);
const b = await launch();
let fails = 0;
const ok = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 1500) : '')); if (!c) fails++; };
const SEL = '.seg button, .chip, .tab, .dbtn, .xbtn, .saypill, .ghost, .sugg .sg, .lchip, .btn, .act .al, .pillb, .addlane, .tp .tm span';
const wrapJS = `(() => {
  const out = { wraps: [], spills: [], shrunk: [], ellipsis: [], cols: {}, n: 0 };
  document.querySelectorAll('.scr[data-scene]').forEach(scr => {
    const sc = scr.dataset.scene;
    scr.querySelectorAll(${JSON.stringify(SEL)}).forEach(e => {
      if (!e.offsetWidth || !e.textContent.trim()) return;
      if (getComputedStyle(e).visibility === 'hidden' || e.closest('[style*="display: none"]')) return;
      out.n++;
      const er = e.getBoundingClientRect();
      const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); let t, lines = 0, right = -1e9;
      while ((t = w.nextNode())) { if (!t.textContent.trim()) continue; const r = document.createRange(); r.selectNodeContents(t); const rs = [...r.getClientRects()].filter(q => q.width > 0.5); const tops = new Set(rs.map(q => Math.round(q.top / 2))); lines = Math.max(lines, tops.size); rs.forEach(q => { right = Math.max(right, q.right); }); }
      const name = sc + ' ' + (e.className || e.tagName) + ' "' + e.textContent.trim().slice(0, 14) + '"';
      if (lines > 1) out.wraps.push(name);
      const cs = getComputedStyle(e);
      if (cs.textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth + 1) out.ellipsis.push(name);
      else if (right > er.right + 1 || (cs.overflow !== 'visible' && e.scrollWidth > e.clientWidth + 1)) out.spills.push(name);
      if (e.classList.contains('al') && e.style.fontSize) out.shrunk.push(name + ' ' + e.style.fontSize);
    });
    // the next tool shows partly at the row's right edge (when the row is longer than the screen and not scrolled)
    const g = scr.querySelector('.tools .strip-s');
    if (g && g.offsetHeight && g.scrollWidth > g.clientWidth + 1 && g.scrollLeft < 1) {
      const w = g.clientWidth, cut = [...g.querySelectorAll('.act')].map(a => [a.offsetLeft - g.offsetLeft, a.offsetWidth]).find(([l, wd]) => l < w && l + wd > w);
      const f = cut ? (w - cut[0]) / cut[1] : 0; out.cols[sc] = Math.round(f * 100) / 100;
    }
    // handles keep above the dock (and so above its head)
    const x = scr._bench; if (x && x.sel && x.W) { const gg = x.geom(); if (gg.handleY + 11 > gg.dockTop - 8) (out.handles = out.handles || []).push(sc); }
    // v9: typing — the example sentences take two rows at most, and the next column shows cut at the edge
    if (scr.classList.contains('typing')) { const ex = scr.querySelector('.say-ex'); if (ex && ex.offsetHeight) { const tops = new Set([...ex.querySelectorAll('.chip')].map(c => Math.round(c.offsetTop))); out.exRows = Math.max(out.exRows || 0, tops.size); } }
    // v9: text over the dock's glass, above the busiest content under it (blur on: the tint; blur off: the solid)
    if (x && x.W && x.cv) {
      const css = getComputedStyle(scr), P = s => { const d = document.createElement('i'); d.style.color = s; scr.appendChild(d); const c = getComputedStyle(d).color; d.remove(); const v = (c.match(/[\\d.]+/g) || []).map(Number); if (v.length < 3) { (window.__badP = window.__badP || []).push(s + '=' + c); return [128, 128, 128, 1]; } return [v[0], v[1], v[2], v[3] === undefined ? 1 : v[3]]; };
      const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
      const cr = (a, b) => { const p = lum(a), q = lum(b); return (Math.max(p, q) + 0.05) / (Math.min(p, q) + 0.05); };
      const over = (top, bot) => [0, 1, 2].map(i => top[i] * top[3] + bot[i] * (1 - top[3])).concat(1);
      const dark = lum(P('var(--bg)')) < 0.2, ground = P('var(--g-bot)'), top = Math.max(0, Math.round(x._dockTop * x.dpr));
      // without blur the solid surface hides what is under it (the darkest single pixel is what shows through its tint);
      // with blur the tint lies over a 26 dp average, so the worst 26 dp window decides
      let worst = ground, worstB = ground;
      if (top < x.cv.height) {
        const Wd = x.cv.width, Hd = x.cv.height - top, dd = x.cv.getContext('2d').getImageData(0, top, Wd, Hd).data, B = Math.round(26 * x.dpr);
        for (let i = 0; i < dd.length; i += 4 * 5) { if (dd[i + 3] < 8) continue; const px = over([dd[i], dd[i + 1], dd[i + 2], dd[i + 3] / 255], ground); if (dark ? lum(px) > lum(worst) : lum(px) < lum(worst)) worst = px; }
        for (let by = 0; by < Hd; by += Math.round(B / 2)) for (let bx = 0; bx < Wd; bx += Math.round(B / 2)) {
          let r = 0, g = 0, b2 = 0, n = 0;
          for (let y = by; y < Math.min(Hd, by + B); y += 2) for (let xx = bx; xx < Math.min(Wd, bx + B); xx += 2) { const i = (y * Wd + xx) * 4, px = over([dd[i], dd[i + 1], dd[i + 2], dd[i + 3] / 255], ground); r += px[0]; g += px[1]; b2 += px[2]; n++; }
          if (n) { const avg = [r / n, g / n, b2 / n]; if (dark ? lum(avg) > lum(worstB) : lum(avg) < lum(worstB)) worstB = avg; }
        }
      }
      const texts = ['var(--label)', 'var(--dim)', 'var(--on)'].map(P), chip = P('var(--chip-bg)');
      for (const solid of [false, true]) {
        const surf = over(solid ? P('var(--dock-solid)') : P('var(--dock-tint)'), solid ? worst : worstB), chipSurf = over(chip, surf);
        const m = Math.min(...texts.map(t => cr(t, surf)), cr(texts[2], chipSurf), cr(texts[0], chipSurf));
        const k = solid ? 'glassSolidMin' : 'glassTintMin'; if (out[k] === undefined || m < out[k][0]) out[k] = [Math.round(m * 100) / 100, sc];
      }
    }
    // v8: with a control open, a decision pending or the keyboard up, the whole main line (all its bars) is in view
    if (x && x.W && (x.stack.length > 1 || x.typing || x.plan || x.hand || x.rec || x.exp)) { x.measure(); const gg = x.geom(); out.covered = out.covered || []; out.coveredN = (out.coveredN || 0) + 1; if (gg.blockY + gg.blockH > gg.dockTop - 2) out.covered.push(sc + ' ' + Math.round(gg.blockY + gg.blockH) + '>' + Math.round(gg.dockTop)); }
  });
  out.badP = (window.__badP || []).slice(0, 4); return out; })()`;
try {
  const cols = {};
  for (const [w, h] of [[360, 780], [390, 844]]) {
    for (const lang of ['zh', 'en']) for (const fs of ['0', '1']) {
      await b.viewport(w, h, true, 2, false);
      await b.open('file://' + path.join(ROOT, 'index.html') + '?lang=' + lang + '&fs=' + fs);
      await sleep(1200);
      const r = await b.eval(wrapJS);
      const tag = `${w} ${lang} ${fs === '1' ? '1.3' : 'normal'}`;
      if (r.badP && r.badP.length) console.log('   unparsed colours:', JSON.stringify(r.badP));
      ok(r.wraps.length === 0, `${tag}: ${r.n} labels in segments, chips, tabs, buttons and tool cells — none wraps`, r.wraps);
      ok(r.spills.length === 0, `${tag}: none runs outside its box`, r.spills);
      if (r.ellipsis.length) console.log('   ellipsis (a long file name):', JSON.stringify(r.ellipsis.slice(0, 6)), r.ellipsis.length);
      if (r.shrunk.length) console.log('   tool labels shrunk to fit:', r.shrunk.length, JSON.stringify(r.shrunk.slice(0, 8)));
      cols[w + ' ' + lang + ' ' + (fs === '1' ? '1.3' : '1.0')] = r.cols;
      ok(!(r.handles || []).length, `${tag}: selection handles above the dock on every screen with a selection`, r.handles);
      ok((r.exRows || 0) <= 2, `${tag}: while typing, the example sentences take ${r.exRows} rows (≤ 2)`, r.exRows);
      ok(r.glassTintMin[0] >= 4.5 && r.glassSolidMin[0] >= 4.5, `${tag}: text on the dock's glass over the busiest content under it ≥ 4.5:1 (blur ${r.glassTintMin[0]}:1 at ${r.glassTintMin[1]}, without blur ${r.glassSolidMin[0]}:1 at ${r.glassSolidMin[1]})`);
      ok(!(r.covered || []).length && r.coveredN > 10, `${tag}: on all ${r.coveredN} screens with a control open, a decision pending or the keyboard up, the whole main line lies above the dock`, r.covered);
    }
  }
  for (const k of Object.keys(cols)) {
    const bad = Object.entries(cols[k]).filter(([, f]) => !(f >= 0.4 && f <= 0.85));
    ok(bad.length === 0, `${k}: on every screen whose tool row is longer than the screen, the next tool shows 40–85 % at the right edge (enough of its icon and name)`, bad);
    console.log('   cut fractions:', [...new Set(Object.values(cols[k]))].sort().join(' '));
  }
  // v9: the glass in dark, blur on and off, every screen (zh, normal size)
  for (const [w, h] of [[360, 780], [390, 844]]) {
    await b.viewport(w, h, true, 2, false);
    await b.open('file://' + path.join(ROOT, 'index.html'));
    await sleep(1100);
    await b.eval(`document.documentElement.dataset.theme = 'dark'; document.dispatchEvent(new Event('themechange'))`);
    await sleep(500);
    const r = await b.eval(wrapJS);
    ok(r.glassTintMin[0] >= 4.5 && r.glassSolidMin[0] >= 4.5, `${w} dark: text on the dock's glass over the busiest content under it ≥ 4.5:1 (blur ${r.glassTintMin[0]}:1 at ${r.glassTintMin[1]}, without blur ${r.glassSolidMin[0]}:1 at ${r.glassSolidMin[1]})`);
    ok(!(r.covered || []).length && (r.exRows || 0) <= 2, `${w} dark: main line above the dock on every open screen; examples ≤ 2 rows`, { covered: r.covered, exRows: r.exRows });
  }
  // contrast, both themes
  await b.viewport(390, 844, true, 2, false);
  await b.open('file://' + path.join(ROOT, 'index.html'));
  await sleep(900);
  for (const theme of ['light', 'dark']) {
    const r = await b.eval(`(async () => {
      document.documentElement.dataset.theme = ${JSON.stringify(theme)}; document.dispatchEvent(new Event('themechange')); await new Promise(r => setTimeout(r, 200));
      const scr = document.querySelector('.scr[data-scene=live]'), cs = getComputedStyle(scr);
      const rgb = s => { const d = document.createElement('i'); d.style.color = s; scr.appendChild(d); const c = getComputedStyle(d).color; d.remove(); return c.match(/[\\d.]+/g).slice(0, 3).map(Number); };
      const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
      const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      const al = scr.querySelector('.tools .act:not(.mark):not(.on) .al'), label = rgb(getComputedStyle(al).color), sheet = rgb(getComputedStyle(scr.querySelector('.bot')).backgroundColor);
      // v9: every tone of the waveform against every tone of the ground (top, middle, bottom, and the middle under the
      // pool of light); the bars' tips and the echo are the lightest/darkest parts
      const rgba = s => { const d = document.createElement('i'); d.style.color = s; scr.appendChild(d); const c = getComputedStyle(d).color; d.remove(); const v = c.match(/[\\d.]+/g).map(Number); return [v[0], v[1], v[2], v[3] === undefined ? 1 : v[3]]; };
      const ov = (t, b) => [0, 1, 2].map(i => t[i] * t[3] + b[i] * (1 - t[3]));
      const grounds = ['--g-top', '--g-mid', '--g-bot'].map(n => rgb(cs.getPropertyValue(n))); grounds.push(ov(rgba(cs.getPropertyValue('--light') || 'rgba(0,0,0,0)'), grounds[1]));
      const tones = ['--wave-deep', '--wave-tip', '--wave-echo', '--wave-echo-tip'].map(n => rgb(cs.getPropertyValue(n)));
      let wmin = 99; tones.forEach(t => grounds.forEach(gr => { wmin = Math.min(wmin, cr(t, gr)); }));
      const wave = wmin;
      const tab = rgb(getComputedStyle(scr.querySelector('.cats .tab:not(.cur)')).color);
      return { label: cr(label, sheet), tab: cr(tab, sheet), wave };
    })()`);
    ok(r.label >= 4.5 && r.tab >= 4.5, `${theme}: tool labels ${r.label.toFixed(2)}:1 and tabs ${r.tab.toFixed(2)}:1 against the tray (≥ 4.5)`);
    ok(r.wave >= 3, `${theme}: every tone of the waveform against every tone of the ground (pool included) ≥ 3:1 — lowest ${r.wave.toFixed(2)}:1`);
  }
  console.log('page errors:', JSON.stringify(b.errors));
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
} finally { await b.close(); }
