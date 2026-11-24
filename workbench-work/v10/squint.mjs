// The squint test: photographs the states the anatomy is judged by, with the rectangles of the dock's parts, for
// squint.py (greyscale + heavy blur; which part stands out most from the dock).
import { launch, sleep } from './cdp.mjs';
import path from 'node:path';
import fs from 'node:fs';
const ROOT = path.resolve(process.argv[2]), OUT = path.resolve(process.argv[3]), VER = process.argv[4] || 'v10';
fs.mkdirSync(OUT, { recursive: true });
// state: scene, the part named primary, and a label
const STATES = VER === 'v9' ? [['rest', 't6a'], ['denoise', 't4d'], ['fade', 'kFade'], ['export', 't8a'], ['tts', 'kTts'], ['move', 't2d'], ['record', 't6b'], ['range', 't1b'], ['typing', 'kSayFocus'], ['tracks', 'kTrackVol']]
  : [['rest', 't6a', 'slot'], ['denoise', 't4d', 'slot'], ['fade', 'kFadeRest', 'slot'], ['export', 't8a', 'main'], ['tts', 'kTts', 'main'], ['move', 't2d', 'main'], ['record', 't6b', 'rec'], ['range', 't1b', 'slot'], ['typing', 'kSayFocus', 'field'], ['tracks', 'kTracks5Vol', 'slot']];
const b = await launch(), meta = [];
try {
  for (const [w, h] of [[390, 844], [360, 780]]) for (const theme of ['light', 'dark']) {
    await b.viewport(w, h, true, 2, theme === 'dark');
    await b.open('file://' + path.join(ROOT, 'index.html'));
    await sleep(1100);
    for (const [name, scene, prim] of STATES) {
      const r = await b.eval(`(async () => {
        const scr = document.querySelector('.scr[data-scene="${scene}"]'); if (!scr) return null;
        const st = scr.closest('.strip'); if (st) st.scrollLeft = scr.closest('.step').offsetLeft - st.offsetLeft;
        scr.scrollIntoView({ block: 'start' }); await new Promise(r => setTimeout(r, 250));
        const s = scr.getBoundingClientRect(), rel = e => { if (!e || !e.offsetWidth) return null; const q = e.getBoundingClientRect(); return [q.left - s.left, q.top - s.top, q.width, q.height].map(Math.round); };
        const q = sel => rel(scr.querySelector(sel));
        const parts = {
          dock: q('.bot'), slot: q('.slot .si') || q('.cover .cmain') || q('.tp .sayf') || q('.area.open'), done: q('.cfoot .dbtn'), head: q('.cover .chead') || q('.tp'), lit: q('.tools .act.mark'), tools: q('.tools'), cats: q('.cats'),
          main: q('.dbtn.pri'), cancel: q('.dbtn.sec'), rec: q('.recbtn'), field: q('.sayin'), play: q('.play'),
        };
        return { clip: { x: s.left + scrollX, y: s.top + scrollY, width: s.width, height: s.height }, parts };
      })()`);
      if (!r) { console.log('missing', scene); continue; }
      const file = path.join(OUT, `${VER}-${name}-${w}${theme[0]}.png`);
      await b.shot(file, r.clip);
      meta.push({ ver: VER, name, scene, prim, w, theme, file, parts: r.parts });
    }
  }
  fs.writeFileSync(path.join(OUT, VER + '-squint.json'), JSON.stringify(meta, null, 1));
  console.log('errors', JSON.stringify(b.errors.filter(e => !/ERR_FILE/.test(e))));
} finally { await b.close(); }
