// v6 checks: (1) no text wraps inside a segment option, chip, tab or button on any screen, at 360 and 390, in Chinese
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
    const g = scr.querySelector('.tools .strip-s'); if (g) out.cols[sc] = [g.style.getPropertyValue('--cols'), g.querySelectorAll('.act').length];
  });
  return out; })()`;
try {
  const cols = {};
  for (const [w, h] of [[360, 780], [390, 844]]) {
    for (const lang of ['zh', 'en']) for (const fs of ['0', '1']) {
      await b.viewport(w, h, true, 2, false);
      await b.open('file://' + path.join(ROOT, 'index.html') + '?lang=' + lang + '&fs=' + fs);
      await sleep(1200);
      const r = await b.eval(wrapJS);
      const tag = `${w} ${lang} ${fs === '1' ? '1.3' : 'normal'}`;
      ok(r.wraps.length === 0, `${tag}: ${r.n} labels in segments, chips, tabs, buttons and tool cells — none wraps`, r.wraps);
      ok(r.spills.length === 0, `${tag}: none runs outside its box`, r.spills);
      if (r.ellipsis.length) console.log('   ellipsis (a long file name):', JSON.stringify(r.ellipsis.slice(0, 6)), r.ellipsis.length);
      if (r.shrunk.length) console.log('   tool labels shrunk to fit:', r.shrunk.length, JSON.stringify(r.shrunk.slice(0, 8)));
      if (fs === '0') cols[w + lang] = r.cols;
    }
  }
  for (const lang of ['zh', 'en']) {
    const a = cols['360' + lang], c = cols['390' + lang], diff = Object.keys(a).filter(k => a[k][0] !== (c[k] || [])[0]);
    const twelve = Object.keys(a).filter(k => a[k][1] === 12 && (a[k][0] !== '6' || c[k][0] !== '6'));
    ok(diff.length === 0 && twelve.length === 0, `${lang}: every screen has the same tool columns at 360 and 390 (12 tools: 6 × 2)`, { diff, twelve });
    const counts = {}; Object.values(a).forEach(([cl, n]) => { counts[n + '→' + cl] = 1; });
    console.log('   tools → columns at normal size:', Object.keys(counts).sort().join('  '));
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
      const bg = rgb(cs.backgroundColor), s3 = rgb(cs.getPropertyValue('--surface3')), box = bg.map((v, i) => v * 0.74 + s3[i] * 0.26), wave = rgb(cs.getPropertyValue('--wave'));
      const tab = rgb(getComputedStyle(scr.querySelector('.cats .tab:not(.cur)')).color);
      return { label: cr(label, sheet), tab: cr(tab, sheet), wave: cr(wave, box), waveHex: cs.getPropertyValue('--wave').trim() };
    })()`);
    ok(r.label >= 4.5 && r.tab >= 4.5, `${theme}: tool labels ${r.label.toFixed(2)}:1 and tabs ${r.tab.toFixed(2)}:1 against the tray (≥ 4.5)`);
    ok(r.wave >= 3, `${theme}: waveform ${r.waveHex} ${r.wave.toFixed(2)}:1 against its box (≥ 3)`);
  }
  console.log('page errors:', JSON.stringify(b.errors));
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
} finally { await b.close(); }
