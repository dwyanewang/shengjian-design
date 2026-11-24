/* ===== Editor: the vertical workbench ===== */
const SCR_H = 724, HDR_H = 52, DOCK_H = 124;
const PANEL_H = { plan: 408, chorus: 350, bgm: 292, vol: 214, fade: 286 };
const dbLin = db => Math.pow(10, db / 20);
const secU = d => sec1(d) + '\u00A0秒'; // number and unit never split across lines

/* ---------- one sentence: a small local reader for the demo sentences ---------- */
function stepOf(s) {
  const base = { id: s.id, kind: s.kind, title: s.title, detail: s.detail, on: true };
  if (s.kind === 'cut') return { ...base, val: 3, unit: '秒', min: 1, max: 10, step: 1, label: v => '剪掉开头' };
  if (s.kind === 'pauses') return { ...base, val: 0.3, unit: '秒', min: 0, max: 1, step: 0.1, label: () => '9 处长停顿，每处留' };
  if (s.kind === 'gain') return { ...base, val: 3, unit: 'dB', min: 1, max: 9, step: 1, label: () => '整体大' };
  if (s.kind === 'fade') return { ...base, val: 2, unit: '秒', min: 1, max: 6, step: 1, label: () => '结尾淡出' };
  return base;
}
function parsePhrase(t, isMusic) {
  t = (t || '').trim();
  const S = SJ.SENTENCE, all = S.steps.map(stepOf);
  if (!t) return null;
  if (/剪掉开头\s*3\s*秒.*删掉长停顿.*大一点.*淡出/.test(t)) return { kind: 'plan', text: S.text, steps: all, marks: true };
  if (/^剪掉开头$/.test(t)) return { kind: 'ask', text: t, ask: S.question.ask, options: S.question.options };
  if (t === S.aiRewrite.said || /咳嗽|太闷/.test(t)) return { kind: 'ai', text: S.aiRewrite.said, phase: 'unknown' };
  if (/副歌.*铃声/.test(t)) return isMusic ? { kind: 'chorus', text: t } : { kind: 'issue', text: t, why: '这是一段讲话，没有副歌。想给它做铃声，可以先选一段再说「做成铃声」。', sug: ['剪掉开头3秒', '删掉长停顿'] };
  if (/降噪.*统一音量/.test(t) && /播客收尾/.test(t)) return { kind: 'chain', text: t, tools: ['denoise', 'pauses', 'loudness'] };
  if (/降噪.*统一音量/.test(t)) return { kind: 'chain', text: t, tools: ['denoise', 'loudness'] };
  if (/会议整理|1\.25\s*倍速/.test(t)) return { kind: 'chain', text: t, tools: ['pauses', 'speed'] };
  if (/变成大叔/.test(t)) return { kind: 'chain', text: t, tools: ['voice'] };
  if (/背景音乐/.test(t)) return { kind: 'bgm', text: t };
  if (/60\s*秒循环/.test(t)) return { kind: 'chain', text: t, tools: ['loop'] };
  const purpose = /发给朋友|发给别人|发给/.test(t) ? 'share' : /铃声/.test(t) ? 'sound' : null;
  const steps = [];
  if (/剪掉开头\s*(\d+)\s*秒/.test(t)) { const v = +RegExp.$1; steps.push({ ...all[0], val: v }); }
  if (/删掉长停顿|删停顿|删掉停顿/.test(t)) steps.push(all[1]);
  if (/大一点|大声/.test(t)) steps.push(all[2]);
  if (/淡出\s*(\d+)\s*秒/.test(t)) steps.push({ ...all[3], val: +RegExp.$1 });
  if (/只留\s*1:20\s*到\s*2:45/.test(t)) steps.push({ id: 'k1', kind: 'keep', title: '只留 1:20 到 2:45', detail: '其余都剪掉，共 1:25', on: true });
  if (/分成\s*3\s*段/.test(t)) steps.push({ id: 'sp', kind: 'split3', title: '平均分成 3 段', detail: '每段约 6:08，导出时每段一个文件', on: true });
  if (/每段之间加\s*1\s*秒空白/.test(t)) return { kind: 'ask', text: t, ask: '现在只有 1 段。先在 9 处长停顿那里分段，再在每段之间加 1 秒空白？', options: ['好，按长停顿分段', '不用了'] };
  if (steps.length || purpose) return { kind: 'plan', text: t, steps, purpose };
  return { kind: 'issue', text: t, why: '这句话里有我没听懂的地方。可以换个说法，或者点一个现成的。', sug: ['剪掉开头3秒', '删掉长停顿', '声音大一点', '结尾淡出2秒'] };
}
function applyPlan(ed, plan) {
  let n = ed;
  for (const s of plan.steps.filter(x => x.on)) {
    if (s.kind === 'cut') { const a = srcToRes(n, 0), b = srcToRes(n, s.val); if (a != null && b != null) n = removeRange(n, a, b); }
    if (s.kind === 'pauses') for (const p of SPEECH.pauses) n = closePause(n, p.id, s.val);
    if (s.kind === 'gain') n = globalGain(n, s.val);
    if (s.kind === 'fade') { const T = edDur(n); n = addFade(n, T - s.val, T, 'out', 'sine'); }
    if (s.kind === 'keep') n = keepRange(n, 80, 165);
    if (s.kind === 'split3') { const T = edDur(n); n = splitAt(splitAt(n, T / 3), (2 * T) / 3); }
  }
  return n;
}
const CHAIN_NAMES = { denoise: '降噪', loudness: '统一音量', pauses: '删掉停顿', speed: '变速 1.25 倍', voice: '变声：大叔', loop: '一分钟循环' };

/* ---------- the editor screen ---------- */
function Editor({ ph, p, dir }) {
  const isMusic = p.id === 'wanfeng';
  const src = isMusic ? MUSIC : SPEECH;
  const proj = SJ.LIBRARY.find(x => x.id === p.id) || SJ.LIBRARY[0];
  const skey = 'ed:' + p.id;
  const [H, setH] = useState(() => ph.store[skey] || { past: [], cur: p.bgm ? { ...newEd(src, p.id), bgm: { track: 'wanfeng', db: -14, duck: true } } : newEd(src, p.id), fut: [], v: 0 });
  useEffect(() => { ph.store[skey] = H; }, [H]);
  const ed = H.cur;
  const [pv, setPv] = useState(null);           // live preview while a panel is open
  const [pvN, setPvN] = useState(0);
  const view = pv || ed;
  const lay = useMemo(() => layout(src, view), [view]);
  const smp = useMemo(() => makeSampler(src, view), [view]);
  const fitH = SCR_H - HDR_H - (p.panel && PANEL_H[p.panel] ? PANEL_H[p.panel] : DOCK_H);
  const [pps, setPps] = useState(p.pps || (isMusic ? (fitH - 34) / MUSIC.dur : 14));
  const [panel, setPanel] = useState(p.panel || (p.bgm ? 'bgm' : null));
  const [sel, setSel] = useState(p.sel ? { k: 'range', r0: p.sel[0], r1: p.sel[1] } : null);
  const [plan, setPlan] = useState(() => (p.say ? parsePhrase(p.say, isMusic) : null));
  const [sayText, setSayText] = useState(p.sayText || '');
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [swipe, setSwipe] = useState(null);
  const [lift, setLift] = useState(null);
  const [hint, setHint] = useState(!isMusic && !p.noHint);
  const [opt, setOpt] = useState({ spectrum: !!p.spectrum, ab: false, curve: false, beat: !!p.beat });
  const [ring, setRing] = useState({ cand: 0, len: 30, r0: SJ.CHORUS[0].from });
  const [aiConsent, setAiConsent] = useState(!!ph.store.aiConsent);
  const api = useRef();
  const say = (m, undoable) => ph.toast(m, undoable ? { label: '撤销', fn: undo } : null);
  function commit(n, msg, keepSel) { setH(h => ({ past: [...h.past, h.cur].slice(-50), cur: n, fut: [], v: h.v + 1 })); setPv(null); if (!keepSel) setSel(null); if (msg) say(msg, true); }
  function undo() { setH(h => (h.past.length ? { past: h.past.slice(0, -1), cur: h.past[h.past.length - 1], fut: [h.cur, ...h.fut], v: h.v + 1 } : h)); setSel(null); }
  function redo() { setH(h => (h.fut.length ? { past: [...h.past, h.cur], cur: h.fut[0], fut: h.fut.slice(1), v: h.v + 1 } : h)); setSel(null); }
  const preview = n => { setPv(n); setPvN(x => x + 1); };

  const docked = panel && PANEL_H[panel] && !(panel === 'plan' && !plan) ? panel : null;
  const height = SCR_H - HDR_H - (docked ? PANEL_H[docked] : DOCK_H);
  const bgm = view.bgm;
  const spineX = bgm ? 104 : isMusic ? 160 : 150, capW = bgm ? 84 : isMusic ? 150 : 124;
  const labelX = bgm ? 232 : spineX + capW / 2 + 14;
  const LW = { maxWidth: 360 - labelX - 8, whiteSpace: 'normal', lineHeight: 1.3 }; // labels wrap instead of running off (English is longer)
  const cols = useMemo(() => {
    const c = [{ x: spineX, capW, lay, amp: smp.amp, kind: src.kind }];
    if (bgm) c.push({ x: 194, capW: 52, lay: { dur: lay.dur, items: [] }, amp: envSampler(MUSIC, { loop: true, gain: dbLin(bgm.db + 8) }), duck: bgm.duck ? duckFor(lay) : null, kind: 'bgm' });
    return c;
  }, [lay, smp, bgm && bgm.db, bgm && bgm.duck, spineX]);
  const ver = [H.v, pps, pvN, bgm ? bgm.db + ':' + bgm.duck : '', opt.spectrum, height].join('|');
  const rNow = () => (api.current ? clamp(api.current.getR(), 0, lay.dur) : 0);
  const markers = view.markers.map(m => ({ ...m, r: srcToRes(view, m.src) }));
  const openP = openPauses(ed);

  /* playback: the sound scrolls up under the reading line */
  useEffect(() => {
    if (!playing) return;
    let raf, last = performance.now(), r = rNow();
    ph.store.nowPlaying = proj.title;
    const f = t => { const dt = (t - last) / 1000; last = t; r += dt * speed; if (r >= lay.dur) { setPlaying(false); return; } api.current && api.current.setR(r); raf = requestAnimationFrame(f); };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, pps, lay.dur]);

  /* hit testing */
  const tolR = 10 / pps;
  const hit = (r, x) => {
    for (const m of markers) if (m.r != null && Math.abs(m.r - r) < tolR && x > spineX - 16) return { k: 'marker', id: m.id, r0: m.r, r1: m.r };
    for (const s of lay.seams) if (!s.closed && s.kind !== 'split' && Math.abs(s.r - r) < tolR && x > spineX - capW / 2) return { k: 'seam', id: s.id, seam: s, r0: s.r, r1: s.r };
    const it = lay.items.find(q => r >= q.r0 && r < q.r1);
    if (!it) return null;
    if (it.k === 'pause') return { k: 'gap', id: it.id, r0: it.r0, r1: it.r1, it };
    if (it.k === 'closed') return { k: 'closed', id: it.id, r0: it.r0, r1: it.r1, it };
    if (it.k === 'lead') return { k: 'range', r0: it.r0, r1: it.r1, it, lead: true };
    return { k: 'cap', id: it.id, r0: it.r0, r1: it.r1, it };
  };
  const snap = r => {
    let best = r, bd = 9 / pps;
    for (const it of lay.items) for (const b of [it.r0, it.r1]) if (Math.abs(b - r) < bd) { bd = Math.abs(b - r); best = b; }
    return clamp(best, 0, lay.dur);
  };
  const onTap = (r, x) => {
    if (playing) setPlaying(false);
    if (lift && lift.tapMode) { const to = snap(r); commit(moveRange(ed, lift.r0, lift.r1, to), '挪到 ' + fmtT(to) + ' 了'); setLift(null); return; }
    if (docked === 'plan' || docked === 'bgm') return;
    if (docked === 'chorus') { setRing(g => ({ ...g, r0: clamp(r - g.len / 2, 0, lay.dur - g.len), cand: -1 })); return; }
    if (opt.curve && x > labelX - 10) { const t = resToSrc(ed, r); if (t != null) { const db = clamp(Math.round(((x - labelX) / 70) * 24 - 18), -24, 6); const pts = [...(ed.curve || [{ t: 0, db: 0 }, { t: src.dur, db: 0 }]), { t, db }].sort((a, b) => a.t - b.t); commit({ ...ed, curve: pts }, '加了一个音量点 ' + (db > 0 ? '+' : '') + db + ' dB'); } return; }
    const h = hit(r, x);
    if (!h) { setSel(null); return; }
    if (sel && sel.k === h.k && sel.id && sel.id === h.id) { setSel(null); return; }
    if (h.k === 'gap') setHint(false);
    setSel(h);
  };
  const onSwipeMove = (r, x0, dx) => setSwipe(r == null ? null : { r, x0, dx });
  const onSwipe = (r, x0, dx) => {
    if (docked) return;
    const h = hit(r, spineX);
    if (!h) return;
    setHint(false);
    if (h.k === 'gap') { commit(closePause(ed, h.id), '这处停顿合上了，留 0.3 秒，省下 ' + sec1(h.it.ref.d - 0.3) + ' 秒'); return; }
    if (h.k === 'cap' || h.k === 'range') { commit(removeRange(ed, h.r0, h.r1), (isMusic ? '这一段' : '这一句') + '划掉了，' + sec1(h.r1 - h.r0) + ' 秒'); return; }
  };
  const onGutter = (a, b, phase) => {
    if (docked === 'chorus') { setRing(g => ({ ...g, r0: clamp(b - g.len / 2, 0, lay.dur - g.len), cand: -1 })); return; }
    if (docked) return;
    const r0 = snap(Math.min(a, b)), r1 = snap(Math.max(a, b));
    if (r1 - r0 < 0.15) { if (phase === 'end') setSel(null); return; }
    setSel({ k: 'range', r0, r1 });
  };
  const onGutterTap = r => { if (docked === 'chorus') return onGutter(r, r); api.current.scrollToR(clamp(r, 0, lay.dur), true); };
  const onLong = r => { if (docked) return; const h = hit(r, spineX); if (h && (h.k === 'cap' || h.k === 'range')) { setSel(null); setLift({ r0: h.r0, r1: h.r1, at: h.r1 }); } };
  const onLiftMove = r => setLift(l => (l ? { ...l, at: snap(r) } : l));
  const onLiftEnd = r => { setLift(l => { if (l && r != null && !(l.at >= l.r0 && l.at <= l.r1)) { setTimeout(() => commit(moveRange(ed, l.r0, l.r1, l.at), '挪到 ' + fmtT(l.at) + ' 了'), 0); } return null; }); };
  const dragHandle = which => e => {
    e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId);
    const move = ev => { const a = api.current; const rc = a.el.getBoundingClientRect(); const z = rc.height / a.el.offsetHeight || 1; const r = snap((a.el.scrollTop + (ev.clientY - rc.top) / z - a.PH) / pps); setSel(s => { if (!s) return s; const n = { ...s, k: 'range', id: null }; if (which === 0) n.r0 = Math.min(r, s.r1 - 0.2); else n.r1 = Math.max(r, s.r0 + 0.2); return n; }); };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };

  /* actions */
  const selR = sel && sel.r0 != null && sel.r1 > sel.r0 ? [sel.r0, sel.r1] : null;
  const A = {
    cut: () => commit(removeRange(ed, ...selR), '剪掉了 ' + sec1(selR[1] - selR[0]) + ' 秒'),
    keep: () => commit(keepRange(ed, ...selR), '只留下这 ' + sec1(selR[1] - selR[0]) + ' 秒'),
    copy: () => { ph.store.clip = piecesOf(ed, ...selR); say('复制好了。滚到想放的地方，点「粘贴」'); setSel(null); },
    cutc: () => { ph.store.clip = piecesOf(ed, ...selR); commit(removeRange(ed, ...selR), '剪切好了，可以去别处粘贴'); },
    paste: () => { const r = rNow(); commit(insertSegsAt(ed, r, ph.store.clip), '粘贴在 ' + fmtT(r)); },
    dup: () => commit(dupRange(ed, ...selR), '这段紧接着又放了一遍'),
    split: () => commit(selR ? splitAt(splitAt(ed, selR[0]), selR[1]) : splitAt(ed, rNow()), selR ? '在选区两头分割好了' : '在 ' + fmtT(rNow(), true) + ' 分割好了'),
    move: () => { setLift({ r0: selR[0], r1: selR[1], at: selR[1], tapMode: true }); setSel(null); say('点一下想放的位置，这段就挪过去'); },
    marker: () => { const r = selR ? selR[0] : rNow(); const t = resToSrc(ed, r); if (t == null) return; commit({ ...ed, markers: [...ed.markers, { id: 'm' + UID++, src: t, name: '标记 ' + (ed.markers.length + 1) }] }, '在 ' + fmtT(r) + ' 加了标记'); },
    close: id => commit(closePause(ed, id), '这处停顿合上了，留 0.3 秒'),
    closeAll: () => { let n = ed; const ps = openPauses(ed); for (const q of ps) n = closePause(n, q.id); commit(n, '合上了 ' + ps.length + ' 处停顿，省下 ' + sec1(edDur(ed) - edDur(n)) + ' 秒'); },
    restore: s => commit(restoreSeam(ed, s), '恢复了'),
    restoreClosed: it => commit(restoreSeam(ed, it.seam), '这处停顿恢复了'),
    delMarker: id => commit({ ...ed, markers: ed.markers.filter(m => m.id !== id) }, '标记删掉了'),
    splitMarkers: () => { let n = ed; for (const m of markers) if (m.r != null) n = splitAt(n, m.r); commit(n, '按 ' + markers.filter(m => m.r != null).length + ' 个标记分割好了'); },
  };
  const tools = (() => {
    if (lift && lift.tapMode) return [{ l: '不挪了', i: 'close', f: () => setLift(null) }];
    if (!sel) {
      const base = isMusic ? [
        { l: '找副歌', i: 'sparkle', f: () => setPanel('chorus'), pri: false },
        { l: '人声分离', i: 'spines', f: () => ph.nav.push('tool', { tool: 'separate', id: p.id }) },
        { l: '循环 60 秒', i: 'loop', f: () => ph.nav.push('tool', { tool: 'loop', id: p.id }) },
        { l: '对齐节拍', i: 'beat', f: () => { setOpt(o => ({ ...o, beat: !o.beat })); say(opt.beat ? '节拍线关了' : '节拍线开了：92 BPM，拖选会吸到拍子上'); } },
        { l: '标记', i: 'marker', f: A.marker }, { l: '分割', i: 'split', f: A.split },
      ] : [
        { l: '删停顿', i: 'pauses', b: openP.length || null, f: () => ph.nav.push('tool', { tool: 'pauses', id: p.id }) },
        { l: '降噪', i: 'denoise', f: () => ph.nav.push('tool', { tool: 'denoise', id: p.id }) },
        { l: '配乐', i: 'spines', f: () => { commit({ ...ed, bgm: { track: 'wanfeng', db: -14, duck: true } }, null, true); setPanel('bgm'); } },
        { l: '标记', i: 'marker', f: A.marker }, { l: '分割', i: 'split', f: A.split }, { l: '插入', i: 'insert', f: () => setPanel('insert') },
        { l: '音量', i: 'vol', f: () => setPanel('vol') },
      ];
      if (ph.store.clip) base.unshift({ l: '粘贴', i: 'copy', f: A.paste });
      return [...base, { l: '全部工具', i: 'grid', f: () => setPanel('tools') }, { l: '更多', i: 'more', f: () => setPanel('more') }];
    }
    if (sel.k === 'gap') return [{ l: '合上这处', i: 'pauses', pri: true, f: () => A.close(sel.id) }, { l: '合上全部 ' + openP.length + ' 处', i: 'pauses', f: A.closeAll }, { l: '试听', i: 'play', f: () => { api.current.scrollToR(Math.max(0, sel.r0 - 1.5)); setPlaying(true); } }];
    if (sel.k === 'closed') return [{ l: '恢复这处停顿', i: 'undo', pri: true, f: () => A.restoreClosed(sel.it) }];
    if (sel.k === 'seam') return sel.seam.kind === 'cut' ? [{ l: '恢复删掉的 ' + sec1(sel.seam.removed) + ' 秒', i: 'undo', pri: true, f: () => A.restore(sel.seam) }, { l: '接缝过渡', i: 'fade', f: () => say('接缝处加了 0.2 秒交叉淡化') }] : [{ l: '接缝过渡', i: 'fade', pri: true, f: () => say('接缝处加了 0.2 秒交叉淡化') }];
    if (sel.k === 'marker') return [{ l: '改名', i: 'edit', f: () => setPanel('markers') }, { l: '按标记分割', i: 'split', f: A.splitMarkers }, { l: '删掉标记', i: 'trash', f: () => A.delMarker(sel.id) }];
    return [
      { l: '剪掉', i: 'cut', f: A.cut }, { l: '只留', i: 'check', f: A.keep }, { l: '音量', i: 'vol', f: () => setPanel('vol') }, { l: '淡入淡出', i: 'fade', f: () => setPanel('fade') },
      { l: '复制', i: 'copy', f: A.copy }, { l: '剪切', i: 'cut', f: A.cutc }, { l: '重复', i: 'repeat', f: A.dup }, { l: '移动', i: 'move', f: A.move }, { l: '分割', i: 'split', f: A.split }, { l: '标记', i: 'marker', f: A.marker },
      { l: '降噪这段', i: 'denoise', f: () => ph.nav.push('tool', { tool: 'denoise', id: p.id, range: selR }) },
    ];
  })();

  /* sentence */
  const runSay = text => {
    const pl = parsePhrase(text, isMusic);
    if (!pl) return;
    ph.store.recent = [text, ...(ph.store.recent || []).filter(x => x !== text)].slice(0, 4);
    if (pl.kind === 'chorus') { setPanel('chorus'); setPlan(null); return; }
    if (pl.kind === 'bgm') { commit({ ...ed, bgm: { track: 'wanfeng', db: -14, duck: true } }, null, true); setPanel('bgm'); say('先配上「晚风（钢琴版）」；想换轻快一点的，点「换一首」'); return; }
    setPlan(pl); setPanel('plan'); setSel(null);
    setTimeout(() => api.current && api.current.scrollToR(pl.marks ? 6 : rNow(), true), 60);
  };
  const applyNow = () => {
    if (plan.kind === 'chain') { const tl = plan.tools.filter((t, i) => !(plan.skip || {})[i]); if (!tl.length) return; setPanel(null); setPlan(null); ph.nav.push('tool', { tool: tl[0], id: p.id, chain: tl, step: 0, text: plan.text }); return; }
    const n = applyPlan(ed, plan); const k = plan.steps.filter(s => s.on).length;
    commit(n, null); setPanel(null); const pur = plan.purpose; setPlan(null);
    ph.toast('改好了。' + (k > 1 ? k + ' 步算一步，' : '') + '可以一起撤销', { label: '撤销整条', fn: undo });
    if (pur) setTimeout(() => ph.nav.push('export', { id: p.id, purpose: pur }), 700);
  };

  const [tName, tSub] = proj.title.split(' · ');
  const sub = <Fragment>{fmtT(lay.dur)}{Math.abs(lay.dur - src.dur) > 0.05 && <span className="wm" style={{ marginLeft: 6 }}>原 {fmtT(src.dur)}</span>}<span style={{ marginLeft: 8 }}>{tSub || (proj.versionNames || ['原始录音'])[0]}</span></Fragment>;
  const back = () => ph.nav.pop();

  return <div className={cx('scr', dir)}>
    <Hdr title={tName} sub={sub} onBack={back} right={<Fragment>
      <button className="ib" disabled={!H.past.length} onClick={undo} aria-label="撤销"><Icon n="undo" s={21} /></button>
      <button className="ib" disabled={!H.fut.length} onClick={redo} aria-label="重做"><Icon n="redo" s={21} /></button>
      <Btn sm line onClick={() => ph.nav.push('export', { id: p.id })} style={{ marginRight: 4 }}>导出</Btn>
    </Fragment>} />
    <SpineView height={height} dur={lay.dur} pps={pps} cols={cols} ver={ver} spectrum={opt.spectrum} initR={p.at != null ? p.at : isMusic ? (Math.round(fitH * 0.3) - 16) / pps : 20} apiRef={api}
      zoomCtl onZoom={setPps} beat={isMusic && opt.beat ? MUSIC.bpm : null} readoutExtra={opt.ab ? '在听：原来的' : playing && speed !== 1 ? speed + ' 倍速' : null}
      onTap={onTap} onSwipe={onSwipe} onSwipeMove={onSwipeMove} onGutter={onGutter} onGutterTap={onGutterTap} onLong={onLong} onLiftMove={onLiftMove} onLiftEnd={onLiftEnd}
      overlay={({ Y, rA, rB }) => <Fragment>
        {opt.spectrum && <div className="lbl dim" style={{ left: 66, top: Y(0) - 30, transform: 'none' }}>低音　　　频率　　　高音</div>}
        {!opt.spectrum && lay.items.filter(it => it.r1 >= rA && it.r0 <= rB).map(it => {
          const yc = Y((it.r0 + it.r1) / 2), h = Y(it.r1) - Y(it.r0);
          if (it.k === 'pause') { const on = sel && sel.k === 'gap' && sel.id === it.id; return <Fragment key={it.id + it.r0}>
            <div className="lead-l" style={{ left: spineX + 8, width: labelX - spineX - 14, top: yc }} />
            <div className={cx('lbl gap', on && 'sel')} style={{ ...LW, left: labelX, top: yc }}>停顿 {secU(it.ref.d)}{plan && plan.kind === 'plan' && plan.steps.some(s => s.kind === 'pauses' && s.on) && <small>会合上</small>}</div></Fragment>; }
          if (it.k === 'closed') return <div key={it.id + 'c'} className="lbl dim" style={{ ...LW, left: labelX, top: yc, color: sel && sel.k === 'closed' && sel.id === it.id ? 'var(--warm)' : null }}>合上了　省 {secU(it.saved)}</div>;
          if (it.k === 'lead' && h > 10) return <div key="lead" className="lbl" style={{ ...LW, left: labelX, top: yc }}>只有环境声 {secU(it.r1 - it.r0)}</div>;
          if (it.k === 'sec') return <div key={it.id + it.r0} className="lbl" style={{ ...LW, left: labelX, top: yc, color: it.ref.chorus ? 'var(--t1)' : 'var(--t2)', fontWeight: it.ref.chorus ? 600 : 400 }}>{it.ref.name}<small style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 400, marginLeft: 6 }}>{fmtT(it.r0)}</small></div>;
          if (it.k === 'ins' || it.k === 'silence') return <div key={it.id} className="lbl" style={{ ...LW, left: labelX, top: yc }}>{it.k === 'ins' ? '插入的录音' : '静音'} {secU(it.r1 - it.r0)}</div>;
          if (it.k === 'cap' && h >= 24 && !bgm && !markers.some(m => m.r != null && Math.abs(Y(m.r) - Y(it.r0) - 9) < 16)) return <div key={it.id + it.r0} className="lbl dim" style={{ ...LW, left: labelX, top: Y(it.r0) + 9 }}>第 {it.ref.n} 句　{secU(it.r1 - it.r0)}</div>;
          return null;
        })}
        {lay.seams.filter(s => !s.closed && s.r >= rA - 5 && s.r <= rB + 5).map(s => s.kind === 'split'
          ? <div key={s.id} className="seam" style={{ left: spineX - capW / 2 - 6, width: capW + 12, top: Y(s.r), borderTopStyle: 'solid', borderTopColor: 'rgba(238,242,248,.6)' }} />
          : <Fragment key={s.id}><div className="seam" style={{ left: spineX - capW / 2 - 8, width: capW + 16, top: Y(s.r) }} />
            <div className={cx('seam-l', sel && sel.k === 'seam' && sel.id === s.id && 'sel')} style={{ ...LW, left: labelX, top: Y(s.r) }}>{s.head ? '开头剪掉 ' + sec1(s.removed) + ' 秒' : s.tail ? '结尾剪掉 ' + sec1(s.removed) + ' 秒' : s.kind === 'cut' ? '删了 ' + sec1(s.removed) + ' 秒' : s.kind === 'jump' ? '挪过来的接缝' : '插入点'}</div></Fragment>)}
        {markers.filter(m => m.r != null && m.r >= rA && m.r <= rB).map(m => <Fragment key={m.id}>
          <div className="mk-line" style={{ left: spineX, width: labelX - spineX - 4, top: Y(m.r) }} />
          <div className={cx('mk', sel && sel.k === 'marker' && sel.id === m.id && 'sel')} style={{ left: spineX, top: Y(m.r) }} />
          <div className="mk-l" style={{ ...LW, left: labelX - 6, top: Y(m.r) }}>{m.name}</div></Fragment>)}
        {opt.curve && <CurveOverlay ed={ed} Y={Y} x0={labelX} dur={lay.dur} />}
        {sel && sel.r1 > sel.r0 && sel.k !== 'gap' && sel.k !== 'closed' && <Fragment>
          <div className="selb" style={{ top: Y(sel.r0), height: Math.max(2, Y(sel.r1) - Y(sel.r0)) }}><span onPointerDown={e => e.stopPropagation()} onClick={() => setPanel('precise')}>{sel.lead ? '环境声 ' : '选中 '}{secU(sel.r1 - sel.r0)}</span></div>
          <div className="hdl" style={{ top: Y(sel.r0) }} onPointerDown={dragHandle(0)} />
          <div className="hdl" style={{ top: Y(sel.r1) }} onPointerDown={dragHandle(1)} />
        </Fragment>}
        {sel && sel.k === 'gap' && <div className="selb" style={{ top: Y(sel.r0), height: Y(sel.r1) - Y(sel.r0), left: 54 }} />}
        {swipe && (() => { const h = hit(swipe.r, spineX); const it = h && (h.k === 'gap' || h.k === 'cap' || h.k === 'range') ? h : null; const x = Math.min(swipe.x0, swipe.x0 + swipe.dx), w = Math.abs(swipe.dx); return <Fragment>
          {it && <div className="selb" style={{ top: Y(it.r0), height: Math.max(3, Y(it.r1) - Y(it.r0)), left: 54, opacity: Math.min(1, w / 64) }} />}
          <div className="strike" style={{ left: x, width: w, top: it ? Y((it.r0 + it.r1) / 2) : Y(swipe.r) }} />
          {it && w > 40 && <div className="lbl" style={{ ...LW, left: labelX, top: Y((it.r0 + it.r1) / 2) - 22, color: 'var(--warm)', fontWeight: 600 }}>{w > 64 ? '松手就划掉' : '再划远一点'}</div>}</Fragment>; })()}
        {lift && <Fragment>
          <div className="selb" style={{ top: Y(lift.r0), height: Y(lift.r1) - Y(lift.r0), left: 54, opacity: 0.6 }} />
          {!lift.tapMode && <div className="seam" style={{ left: 54, right: 0, top: Y(lift.at), borderTop: '2px solid var(--warm)' }} />}
          {!lift.tapMode && <div className="lbl" style={{ ...LW, left: labelX, top: Y(lift.at) - 14, color: 'var(--warm)', fontWeight: 600 }}>放到这里 {fmtT(lift.at)}</div>}</Fragment>}
        {plan && plan.kind === 'plan' && <PlanMarks plan={plan} ed={ed} lay={lay} Y={Y} spineX={spineX} capW={capW} labelX={labelX} />}
        {docked === 'chorus' && <ChorusMarks ring={ring} Y={Y} labelX={labelX} spineX={spineX} capW={capW} />}
        {hint && !sel && !docked && <HintBubble lay={lay} Y={Y} x={labelX - 4} onClose={() => setHint(false)} />}
        {bgm && <div className="lbl" style={{ left: 194, top: Y(0) - 22, transform: 'translateX(-50%)', fontSize: 12, color: 'var(--t2)' }}>晚风（钢琴版）</div>}
        {bgm && <div className="lbl" style={{ left: spineX, top: Y(0) - 22, transform: 'translateX(-50%)', fontSize: 12, color: 'var(--t2)' }}>人声</div>}
      </Fragment>} />
    {!docked && <div className="dock">
      <div className="tools">{tools.map((t, i) => <button key={t.l + i} className={cx('tool', t.pri && 'pri')} onClick={t.f}><Icon n={t.i} s={18} />{t.l}{t.b != null && <span className="bd">{t.b}</span>}</button>)}</div>
      <div className="say">
        <button className="playb" onClick={() => setPlaying(x => !x)} aria-label={playing ? '暂停' : '播放'}><Icon n={playing ? 'pause' : 'play'} s={22} /></button>
        <button className="spd" onClick={() => setSpeed(s => ({ 1: 1.25, 1.25: 1.5, 1.5: 2, 2: 0.5, 0.5: 0.75, 0.75: 1 })[s])} aria-label="倍速试听">{speed}×</button>
        <div className="sayf" role="button" onClick={() => setPanel('say')}><span>{isMusic ? '说一句：把副歌做成铃声' : '说一句：删掉长停顿，声音大一点'}</span><button className="ib" onClick={e => { e.stopPropagation(); setPanel('listen'); }} aria-label="说话"><Icon n="mic" s={20} /></button></div>
      </div>
    </div>}
    {docked === 'plan' && <PlanPanel ph={ph} plan={plan} setPlan={setPlan} ed={ed} isMusic={isMusic} aiConsent={aiConsent} setAiConsent={v => { setAiConsent(v); ph.store.aiConsent = v; }}
      onApply={applyNow} onClose={() => { setPanel(null); setPlan(null); }} onFocus={r => api.current.scrollToR(r, true)} onSay={t => runSay(t)} />}
    {docked === 'chorus' && <ChorusPanel ring={ring} setRing={setRing} onClose={() => setPanel(null)} onPlay={() => { api.current.scrollToR(ring.r0); setPlaying(true); }}
      onRing={() => ph.nav.push('export', { id: p.id, purpose: 'sound', range: [ring.r0, ring.r0 + ring.len] })} onFocus={r => api.current.scrollToR(r, true)} />}
    {docked === 'bgm' && <BgmPanel ph={ph} ed={ed} setBgm={b => { setH(h => ({ ...h, cur: { ...h.cur, bgm: b }, v: h.v + 1 })); }}
      onCancel={() => { setH(h => ({ ...h, cur: { ...h.cur, bgm: null }, v: h.v + 1 })); setPanel(null); }}
      onSave={() => { setPanel(null); ph.toast('存成新音频「' + proj.title + '（配乐）」，原来的不动；以后还能回来再调音量'); }} />}
    {docked === 'vol' && <VolPanel sel={selR} ed={ed} smp={smp} onPreview={preview} onCancel={() => { setPv(null); setPanel(null); }} onOk={n => { commit(n, '音量改好了', false); setPanel(null); }} />}
    {docked === 'fade' && <FadePanel sel={selR} ed={ed} dur={lay.dur} onPreview={preview} onCancel={() => { setPv(null); setPanel(null); }} onOk={(n, msg) => { commit(n, msg); setPanel(null); }} />}
    {panel === 'say' && <SaySheet ph={ph} isMusic={isMusic} text={sayText} setText={setSayText} onClose={() => setPanel(null)} onRun={t => { setSayText(t); runSay(t); }} onMic={() => setPanel('listen')} />}
    {panel === 'listen' && <ListenSheet onClose={() => setPanel(null)} onDone={t => { setSayText(t); setPanel('say'); }} />}
    {panel === 'tools' && <ToolsSheet ph={ph} id={p.id} isMusic={isMusic} onClose={() => setPanel(null)} onEdit={k => { setPanel(null); editFromList(k); }} />}
    {panel === 'insert' && <InsertSheet onClose={() => setPanel(null)} onInsert={(seg, msg) => { const r = rNow(); setPanel(null); commit(insertSegsAt(ed, r, [seg]), msg + '，插在 ' + fmtT(r)); }} />}
    {panel === 'more' && <MoreSheet ph={ph} p={p} opt={opt} setOpt={setOpt} isMusic={isMusic} speed={speed} setSpeed={setSpeed} onClose={() => setPanel(null)} onPanel={setPanel} />}
    {panel === 'markers' && <MarkersSheet markers={markers} onClose={() => setPanel(null)} onRename={(id, name) => commit({ ...ed, markers: ed.markers.map(m => (m.id === id ? { ...m, name } : m)) }, '改好了')} onDel={A.delMarker} onSplit={() => { setPanel(null); A.splitMarkers(); }} onGo={r => { setPanel(null); api.current.scrollToR(r, true); }} />}
    {panel === 'precise' && <PreciseSheet sel={selR || [rNow(), Math.min(lay.dur, rNow() + 5)]} dur={lay.dur} onClose={() => setPanel(null)} onOk={(a, b) => { setSel({ k: 'range', r0: a, r1: b }); setPanel(null); api.current.scrollToR(a, true); }} />}
  </div>;

  function editFromList(k) {
    const m = {
      '选区（拖选 / 精确时间）': () => setPanel('precise'), '剪掉 / 只留选区': () => say('先在左边刻度上拖出一段，或点一句'), '分割': A.split, '片段顺序（拖动重排）': () => say('长按一句，拖到别处再松手'),
      '复制 / 剪切 / 粘贴': () => say('选中一段后点「复制」或「剪切」，再到别处点「粘贴」'), '重复一段': () => say('选中一段后点「重复」'), '音量（选区 / 片段 / 整体）': () => setPanel('vol'),
      '淡入淡出（正弦 / 线性 / 对数）': () => setPanel('fade'), '交叉淡化': () => say('点一道接缝，选「接缝过渡」'), '音量曲线（画点）': () => { setOpt(o => ({ ...o, curve: true })); say('音量曲线开了：在右边点一下加一个点，越往右越响'); },
      '标记（加、列表、按标记分割）': () => setPanel('markers'), '插入静音': () => setPanel('insert'), '插入音频 / 插入录音': () => setPanel('insert'),
      '对齐节拍': () => { if (isMusic) setOpt(o => ({ ...o, beat: true })); say(isMusic ? '节拍线开了：92 BPM' : '对齐节拍用在音乐上，比如「晚风」'); },
      '撤销 / 重做（50 步）': () => say('右上角的两个箭头，最多退 50 步，关掉再开也还在'), '倍速试听 0.5–2×': () => say('播放键右边的「1×」，点一下换速度'),
      '原声对比（A/B）': () => { setOpt(o => ({ ...o, ab: !o.ab })); }, '频谱视图': () => setOpt(o => ({ ...o, spectrum: !o.spectrum })), '缩放': () => say('两指捏合，或点右上角的 − 和 +'),
    };
    (m[k] || (() => setPanel('more')))();
  }
}
SCREENS.editor = Editor;

/* overlays */
function HintBubble({ lay, Y, x, onClose }) {
  const it = lay.items.find(q => q.k === 'pause' && q.ref.d >= 2);
  if (!it) return null;
  return <div className="hint" style={{ left: Math.min(x, 186), top: Y((it.r0 + it.r1) / 2) + 22 }} onPointerDown={e => e.stopPropagation()}>
    横着划过这道空档，它就合上；点一下也行。<button onClick={onClose}>知道了</button>
  </div>;
}
function PlanMarks({ plan, ed, lay, Y, spineX, capW, labelX }) {
  const LW = { maxWidth: 360 - labelX - 8, whiteSpace: 'normal', lineHeight: 1.3 };
  const out = []; let n = 0;
  plan.steps.forEach((s, i) => {
    const k = i + 1; if (!s.on) return;
    if (s.kind === 'cut') { const a = srcToRes(ed, 0), b = srcToRes(ed, s.val); if (a == null || b == null) return; out.push(<div key="c" className="pband" style={{ top: Y(a), height: Y(b) - Y(a), background: 'repeating-linear-gradient(135deg, rgba(255,182,72,.28) 0 3px, transparent 3px 8px)', boxShadow: 'inset 0 -1px 0 var(--warm)' }} />, <div key="ct" className="ptag" style={{ left: labelX - 30, top: Y((a + b) / 2) }}>{k}</div>); }
    if (s.kind === 'pauses') lay.items.filter(it => it.k === 'pause').forEach(it => out.push(<div key={'pb' + it.id} className="pband" style={{ top: Y(it.r0), height: Y(it.r1) - Y(it.r0), background: 'rgba(255,182,72,.13)' }} />, <div key={'pt' + it.id} className="ptag" style={{ left: labelX - 30, top: Y((it.r0 + it.r1) / 2) }}>{k}</div>));
    if (s.kind === 'gain') out.push(<div key="g" style={{ position: 'absolute', left: spineX - capW / 2 - 9, top: Y(0), height: Y(lay.dur) - Y(0), width: 2, background: 'rgba(255,182,72,.55)', pointerEvents: 'none' }} />, <div key="gt" className="ptag" style={{ left: spineX - capW / 2 - 19, top: Y(4.6) }}>{k}</div>);
    if (s.kind === 'fade') { const T = lay.dur, a = T - s.val; out.push(<div key="f" className="pband" style={{ top: Y(a), height: Y(T) - Y(a), background: 'linear-gradient(rgba(255,182,72,0), rgba(255,182,72,.35))' }} />, <div key="ft" className="ptag" style={{ left: labelX - 30, top: Y(a + s.val / 2) }}>{k}</div>, <div key="fl" className="lbl" style={{ ...LW, left: labelX, top: Y(a + s.val / 2), color: 'var(--warm)' }}>淡出 {s.val} 秒</div>); }
    n++;
  });
  return <Fragment>{out}</Fragment>;
}
function ChorusMarks({ ring, Y, labelX, spineX, capW }) {
  const LW = { maxWidth: 360 - labelX - 8, whiteSpace: 'normal', lineHeight: 1.3 };
  const a = ring.r0, b = ring.r0 + ring.len;
  return <Fragment>
    {SJ.CHORUS.map((c, i) => <div key={i} style={{ position: 'absolute', left: spineX - capW / 2 - 10, width: capW + 20, top: Y(c.from), height: Y(c.to) - Y(c.from), borderRadius: 10, border: '1px dashed rgba(238,242,248,.35)', pointerEvents: 'none' }} />)}
    <div className="selb" style={{ top: Y(a), height: Y(b) - Y(a), left: 54 }} />
    <div style={{ position: 'absolute', left: spineX - 8, width: 16, top: Y(b) - Y(1) + Y(0) - 0, height: Y(1) - Y(0), background: 'linear-gradient(rgba(255,182,72,.0), rgba(255,182,72,.8))', clipPath: 'polygon(0 0,100% 0,50% 100%)', pointerEvents: 'none' }} />
    <div className="lbl" style={{ left: 60, top: Y(a) - 12, color: 'var(--warm)', fontWeight: 600, fontSize: 12.5, background: 'var(--bg)', padding: '0 6px', borderRadius: 6 }}>铃声 {ring.len} 秒</div>
  </Fragment>;
}
function CurveOverlay({ ed, Y, x0, dur }) {
  const pts = (ed.curve || [{ t: 0, db: 0 }, { t: SPEECH.dur, db: 0 }]).map(q => ({ r: srcToRes(ed, q.t), db: q.db })).filter(q => q.r != null);
  const X = db => x0 + ((db + 18) / 24) * 70;
  const path = pts.map((q, i) => (i ? 'L' : 'M') + X(q.db).toFixed(1) + ' ' + Y(q.r).toFixed(1)).join(' ');
  return <Fragment>
    <svg style={{ position: 'absolute', left: 0, top: 0, width: 360, height: Y(dur) + 40, pointerEvents: 'none', overflow: 'visible' }}><path d={path} stroke="#ffb648" strokeWidth="2" fill="none" />{pts.map((q, i) => <circle key={i} cx={X(q.db)} cy={Y(q.r)} r="5" fill="#0e1420" stroke="#ffb648" strokeWidth="2" />)}</svg>
    <div className="lbl dim" style={{ left: x0, top: Y(0) - 20, transform: 'none' }}>音量曲线：点一下加点</div>
  </Fragment>;
}

/* ---------- docked panels ---------- */
function PlanPanel({ ph, plan, setPlan, ed, isMusic, onApply, onClose, onFocus, onSay, aiConsent, setAiConsent }) {
  const [ai, setAi] = useState(plan.kind === 'ai' ? plan.phase : null);
  const setStep = (i, patch) => setPlan(pl => ({ ...pl, steps: pl.steps.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
  const after = plan.kind === 'plan' ? edDur(applyPlan(ed, plan)) : null;
  const focusOf = s => s.kind === 'cut' ? 1 : s.kind === 'pauses' ? Math.max(0, (srcToRes(ed, SPEECH.pauses[0].s) || 0) - 6) : s.kind === 'fade' ? edDur(ed) - 6 : 0;
  if (plan.kind === 'ask') return <div className="panel" style={{ height: PANEL_H.plan }}>
    <div className="ph-h"><b>还差一点</b><button className="ib" onClick={onClose} aria-label="关闭"><Icon n="close" s={20} /></button></div>
    <p className="said">你说：「{plan.text}」</p>
    <div className="pad" style={{ marginTop: 10 }}><p style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.45 }}>{plan.ask}</p>
      <div className="wrapchips" style={{ marginTop: 14 }}>{plan.options.map(o => <button key={o} className="chip" style={{ height: 44, fontSize: 15, padding: '0 18px' }} onClick={() => {
        if (/不用/.test(o)) return onClose();
        if (/分段/.test(o)) return setPlan({ kind: 'plan', text: plan.text, steps: [{ id: 'sg', kind: 'split3', title: '在 9 处长停顿分段，每段之间加 1 秒空白', detail: '分成 10 段，总长多 9 秒', on: true }] });
        const v = /到第一句话/.test(o) ? 2.6 : parseFloat(o);
        setPlan({ kind: 'plan', text: plan.text + (/到第一句话/.test(o) ? '（到第一句话）' : o.replace(' ', '')), steps: [{ ...stepOf(SJ.SENTENCE.steps[0]), val: v, step: 0.1 }] });
      }}>{o}</button>)}</div>
      <p className="note" style={{ marginTop: 16 }}>开头 2.6 秒只有环境声，第一句话从 0:02.6 开始。</p>
    </div>
  </div>;
  if (plan.kind === 'ai') {
    const R = SJ.SENTENCE.aiRewrite;
    return <div className="panel" style={{ height: PANEL_H.plan }}>
      <div className="ph-h"><b>{ai === 'done' ? 'AI 帮你改写成这样' : '这句话有些地方没听懂'}</b><button className="ib" onClick={onClose} aria-label="关闭"><Icon n="close" s={20} /></button></div>
      {ai === 'unknown' && <Fragment>
        <p className="said">「前面那段<b style={{ color: 'var(--warm)', fontWeight: 500, textDecoration: 'underline wavy', textUnderlineOffset: 4 }}>咳嗽</b>不要了，然后整体听着<b style={{ color: 'var(--warm)', fontWeight: 500, textDecoration: 'underline wavy', textUnderlineOffset: 4 }}>太闷</b>」</p>
        <p className="note pad" style={{ marginTop: 6 }}>本机能听懂「剪掉开头 3 秒」这样的说法；口语化的句子可以请 AI 帮忙改写，改写后你再确认。</p>
        <div className="pad" style={{ marginTop: 12, display: 'grid', gap: 10 }}>
          <Btn k="pri" full onClick={() => { if (!ph.member) return ph.openSheet('gate', { what: 'ai' }); setAi(aiConsent ? 'busy' : 'consent'); if (aiConsent) setTimeout(() => setAi('done'), 1200); }}>让 AI 帮忙理解{!ph.member && '（会员）'}</Btn>
          <div className="wrapchips">{['剪掉开头3秒', '提高高频'].map(s => <button key={s} className="chip" onClick={() => onSay(s)}>换成「{s}」</button>)}</div>
        </div></Fragment>}
      {ai === 'consent' && <div className="pad" style={{ marginTop: 4 }}>
        <p style={{ fontSize: 15, lineHeight: 1.65 }}>只会把<b>这句话的文字</b>发给 AI 服务，<b>不发你的音频</b>。同意一次，以后不再问；可以在「设置」里关掉。</p>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}><Btn line onClick={() => setAi('unknown')}>先不用</Btn><Btn k="pri" style={{ flex: 1 }} onClick={() => { setAiConsent(true); setAi('busy'); setTimeout(() => setAi('done'), 1200); }}>同意，帮我改写</Btn></div>
      </div>}
      {ai === 'busy' && <div className="pad" style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 30 }}><span className="spin" /><span className="t2">AI 在读这句话…只发文字，不发音频</span></div>}
      {ai === 'done' && <div className="pad">
        <p className="note">你说的：「{R.said}」</p>
        <p style={{ fontSize: 20, fontWeight: 600, marginTop: 6 }}>「剪掉开头<span style={{ background: 'var(--warm-a)', color: 'var(--warm)', borderRadius: 6, padding: '0 4px' }}>3秒</span>，提高高频」</p>
        <div className="warn" style={{ marginTop: 10 }}><i />「3 秒」是 AI 估计的，你没说过。「闷」理解为高频不足。</div>
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}><Btn line onClick={() => setAi('unknown')}>用我的原话</Btn>
          <Btn k="pri" style={{ flex: 1 }} onClick={() => setPlan({ kind: 'plan', text: R.rewritten, ai: true, steps: [{ ...stepOf(SJ.SENTENCE.steps[0]) }, { id: 'eq', kind: 'eq', title: '提高高频（效果：均衡）', detail: '处理工具，会存成新版本', on: true }] })}>就这样，看计划</Btn></div>
      </div>}
    </div>;
  }
  if (plan.kind === 'issue') return <div className="panel" style={{ height: PANEL_H.plan }}>
    <div className="ph-h"><b>这句没完全听懂</b><button className="ib" onClick={onClose} aria-label="关闭"><Icon n="close" s={20} /></button></div>
    <p className="said">「{plan.text}」</p>
    <p className="pad t2" style={{ fontSize: 14.5, lineHeight: 1.6, marginTop: 4 }}>{plan.why}</p>
    <div className="pad wrapchips" style={{ marginTop: 14 }}>{plan.sug.map(s => <button key={s} className="chip" style={{ height: 42 }} onClick={() => onSay(s)}>{s}</button>)}</div>
    <div className="pad" style={{ marginTop: 16 }}><Btn full line onClick={() => { if (!ph.member) return ph.openSheet('gate', { what: 'ai' }); setPlan({ kind: 'ai', text: plan.text, phase: 'unknown' }); }}>让 AI 帮忙理解{!ph.member && '（会员）'}</Btn></div>
  </div>;
  if (plan.kind === 'chain') {
    const skip = plan.skip || {};
    return <div className="panel" style={{ height: PANEL_H.plan }}>
      <div className="ph-h"><b>要用 {plan.tools.length} 个处理工具</b><button className="ib" onClick={onClose} aria-label="关闭"><Icon n="close" s={20} /></button></div>
      <p className="said">「{plan.text}」</p>
      <p className="note pad">一步接一步：每一步都先让你试听，满意了存成新版本，下一步接着在新版本上做。原音频不动。</p>
      <div style={{ marginTop: 6 }}>{plan.tools.map((t, i) => <div key={t} className={cx('step', skip[i] && 'off')}><span className="n">{i + 1}</span>
        <div className="sx"><b>{CHAIN_NAMES[t]}</b><span>{skip[i] ? '这步跳过' : t === 'loudness' ? '调到 -16 LUFS，适合语音' : t === 'denoise' ? '压低空调、风扇这类底噪' : t === 'pauses' ? '9 处长停顿，每处留 0.3 秒' : '打开工具，参数已经填好'}</span></div>
        <button className="chip" style={{ height: 32 }} onClick={() => setPlan(pl => ({ ...pl, skip: { ...skip, [i]: !skip[i] } }))}>{skip[i] ? '不跳过' : '跳过'}</button></div>)}</div>
      <div className="foot" style={{ marginTop: 'auto' }}><div className="sum">共 {plan.tools.filter((t, i) => !skip[i]).length} 步，生成 {plan.tools.filter((t, i) => !skip[i]).length} 个新版本</div><Btn k="pri" onClick={onApply}>开始第 1 步</Btn></div>
    </div>;
  }
  const on = plan.steps.filter(s => s.on).length;
  return <div className="panel" style={{ height: PANEL_H.plan }}>
    <div className="ph-h"><b>{plan.ai ? 'AI 改写后' : '听懂了'} {on} 件事</b><button className="ib" onClick={onClose} aria-label="不改了"><Icon n="close" s={20} /></button></div>
    {plan.marks ? <p className="said">「剪掉开头3秒<sup>1</sup>，删掉长停顿<sup>2</sup>，声音大一点<sup>3</sup>，结尾淡出2秒<sup>4</sup>」</p> : <p className="said">「{plan.text}」</p>}
    <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
      {plan.steps.map((s, i) => <div key={s.id} className={cx('step', !s.on && 'off')} onClick={() => onFocus(focusOf(s))} style={{ cursor: 'pointer' }}>
        <span className="n">{i + 1}</span>
        <div className="sx"><b>{s.val != null && s.label ? <Fragment>{s.label(s.val)}<span className="val" onClick={e => e.stopPropagation()}><button onClick={() => setStep(i, { val: +clamp(s.val - s.step, s.min, s.max).toFixed(2) })} aria-label="少一点">−</button><i>{sec1(s.val)} {s.unit}</i><button onClick={() => setStep(i, { val: +clamp(s.val + s.step, s.min, s.max).toFixed(2) })} aria-label="多一点">+</button></span></Fragment> : s.title}</b>
          <span>{s.kind === 'pauses' ? '共省下 ' + sec1(SPEECH.pauses.reduce((a, q) => a + Math.max(0, q.d - s.val), 0)) + ' 秒' : s.kind === 'cut' ? '0:00–0:0' + Math.round(s.val) + (s.val <= 3 ? '，这里只有环境声' : '，会剪到第一句话的开头') : s.kind === 'gain' ? (s.val <= 3 ? '响度 -19 → -' + (19 - s.val) + ' LUFS，不会爆音' : '会有几处爆音，导出时自动限幅') : s.kind === 'fade' ? '最后 ' + s.val + ' 秒，正弦曲线' : s.detail}</span></div>
        <button className="ib" style={{ width: 36, height: 36 }} onClick={e => { e.stopPropagation(); setStep(i, { on: !s.on }); }} aria-label={s.on ? '不要这步' : '要这步'}><Icon n={s.on ? 'close' : 'undo'} s={18} /></button>
      </div>)}
      {plan.purpose && <div className="step"><span className="n" style={{ background: 'var(--s3)', color: 'var(--t1)' }}><Icon n="share" s={14} /></span><div className="sx"><b>改完去导出，已选「{plan.purpose === 'share' ? '发给别人' : '设成铃声'}」</b><span>不会自动发出去，到导出页你再确认</span></div><span /></div>}
    </div>
    <div className="foot"><div className="sum">{after != null && <Fragment><b>{fmtT(edDur(ed))} → {fmtT(after)}</b><br />{plan.steps.some(s => s.kind === 'eq' && s.on) ? '高频那步会存成新版本' : '整条算一步，可以一起撤销'}</Fragment>}</div><Btn k="pri" onClick={onApply} disabled={!on && !plan.purpose}>照这样改</Btn></div>
  </div>;
}
function ChorusPanel({ ring, setRing, onClose, onPlay, onRing, onFocus }) {
  const names = ['重复最强，最像副歌', '最后一遍，最响', '第一遍，稍弱'];
  return <div className="panel" style={{ height: PANEL_H.chorus }}>
    <div className="ph-h"><b>找到 3 段副歌</b><Seg value={ring.len} options={[{ v: 20, l: '20 秒' }, { v: 30, l: '30 秒' }]} onChange={v => setRing(g => ({ ...g, len: v }))} style={{ width: 150 }} /><button className="ib" onClick={onClose} aria-label="关闭"><Icon n="close" s={20} /></button></div>
    <div>{SJ.CHORUS.map((c, i) => <button key={i} className="li" style={{ minHeight: 52, paddingTop: 6, paddingBottom: 6 }} onClick={() => { setRing(g => ({ ...g, cand: i, r0: c.from })); onFocus(c.from - 30); }}>
      <span className={cx('radio', ring.cand === i && 'on')} />
      <div className="lt"><b className="num">{fmtT(c.from)}–{fmtT(c.from + ring.len)}</b><span>{names[i]}</span></div>
      <span className="tag">{c.score === '高' ? '很像' : '像'}</span></button>)}</div>
    <p className="note pad" style={{ marginTop: 2 }}>{ring.cand < 0 ? '你在左边刻度上挪过了，从 ' + fmtT(ring.r0) + ' 开始。' : '在左边刻度上拖，可以前后挪这 ' + ring.len + ' 秒。'}最后 1 秒会自动淡出。</p>
    <div className="foot"><Btn line onClick={onPlay} icon="play">试听</Btn><div style={{ flex: 1 }} /><Btn k="pri" onClick={onRing}>设成铃声</Btn></div>
  </div>;
}
function BgmPanel({ ph, ed, setBgm, onCancel, onSave }) {
  const b = ed.bgm || { db: -14, duck: true };
  return <div className="panel" style={{ height: PANEL_H.bgm }}>
    <div className="ph-h"><b>配背景音乐</b><button className="ib" onClick={onCancel} aria-label="不配了"><Icon n="close" s={20} /></button></div>
    <div className="li" style={{ minHeight: 52, paddingTop: 0 }}><Cover id="wanfeng" size={40} /><div className="lt"><b>晚风（钢琴版）</b><span>右边那条就是它，说话时它会让开</span></div><Btn sm line onClick={() => ph.nav.push('musiclib', { pick: true })}>换一首</Btn></div>
    <div className="pad"><div className="kv" style={{ paddingBottom: 0 }}>音乐音量<span className="num">{b.db} dB</span></div><Slider value={b.db} min={-30} max={0} step={1} onChange={v => setBgm({ ...b, db: v })} />
      <div className="kv">说话时音乐自动让开<Switch on={b.duck} onChange={v => setBgm({ ...b, duck: v })} /></div></div>
    <div className="foot" style={{ paddingTop: 0 }}><div className="sum">存成新音频，以后能回来再调</div><Btn k="pri" onClick={onSave}>存成新音频</Btn></div>
  </div>;
}
function VolPanel({ sel, ed, smp, onPreview, onCancel, onOk }) {
  const [db, setDb] = useState(0);
  const make = v => (sel ? addGain(ed, sel[0], sel[1], v) : globalGain(ed, v));
  useEffect(() => { onPreview(make(db)); }, [db]);
  const clip = db > 3.2;
  return <div className="panel" style={{ height: PANEL_H.vol }}>
    <div className="ph-h"><b>{sel ? '这 ' + sec1(sel[1] - sel[0]) + ' 秒的音量' : '整体音量'}</b><span className="num" style={{ fontSize: 18, fontWeight: 600, marginRight: 8 }}>{db > 0 ? '+' : ''}{db} dB</span></div>
    <div className="pad"><Slider value={db} min={-12} max={12} step={0.5} onChange={setDb} />
      <p className="note" style={{ marginTop: 2, color: clip ? 'var(--warm)' : null }}>{db === 0 ? '往右拖变大，波形跟着变宽' : clip ? '有几处会爆音（波形尖上发白的地方），导出时会自动限幅' : db > 0 ? '大一点，不会爆音' : '小一点'}</p></div>
    <div className="foot"><Btn line onClick={onCancel}>取消</Btn><div style={{ flex: 1 }} /><Btn k="pri" onClick={() => onOk(make(db))} disabled={db === 0}>好</Btn></div>
  </div>;
}
function FadePanel({ sel, ed, dur, onPreview, onCancel, onOk }) {
  const [dirn, setDir] = useState(sel ? 'in' : 'out');
  const [len, setLen] = useState(sel ? 0 : 2);
  const [shape, setShape] = useState('sine');
  const full = sel ? sel[1] - sel[0] : dur;
  const L = len === 0 ? full : Math.min(len, full);
  const range = sel ? (dirn === 'in' ? [sel[0], sel[0] + L] : [sel[1] - L, sel[1]]) : (dirn === 'in' ? [0, L] : [dur - L, dur]);
  const make = () => addFade(ed, range[0], range[1], dirn, shape);
  useEffect(() => { onPreview(make()); }, [dirn, len, shape]);
  const curve = s => { let d = ''; for (let i = 0; i <= 20; i++) { const f = i / 20; d += (i ? 'L' : 'M') + (2 + f * 28) + ' ' + (18 - fadeCurve('in', s, f) * 16); } return <svg width="32" height="20" style={{ display: 'block' }}><path d={d} stroke="currentColor" strokeWidth="1.8" fill="none" /></svg>; };
  return <div className="panel" style={{ height: PANEL_H.fade }}>
    <div className="ph-h"><b>{sel ? '这段' : '整段'}淡入淡出</b><Seg value={dirn} options={[{ v: 'in', l: '淡入' }, { v: 'out', l: '淡出' }]} onChange={setDir} style={{ width: 140, marginRight: 8 }} /></div>
    <div className="chips" style={{ marginTop: 6 }}>{[0, 1, 2, 3, 5].map(v => <button key={v} className={cx('chip', len === v && 'on')} onClick={() => setLen(v)}>{v === 0 ? (sel ? '整个选区' : '整段') : v + ' 秒'}</button>)}</div>
    <div className="pad" style={{ marginTop: 12 }}><Seg value={shape} options={[{ v: 'sine', l: <span style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>{curve('sine')}正弦</span> }, { v: 'lin', l: <span style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>{curve('lin')}线性</span> }, { v: 'log', l: <span style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>{curve('log')}对数</span> }]} onChange={setShape} /></div>
    <p className="note pad" style={{ marginTop: 8 }}>{dirn === 'in' ? '从 ' + fmtT(range[0], true) + ' 开始慢慢变响' : '到 ' + fmtT(range[1], true) + ' 慢慢收掉'}，长度不变。</p>
    <div className="foot"><Btn line onClick={onCancel}>取消</Btn><div style={{ flex: 1 }} /><Btn k="pri" onClick={() => onOk(make(), (dirn === 'in' ? '淡入 ' : '淡出 ') + sec1(L) + ' 秒')}>好</Btn></div>
  </div>;
}

/* ---------- sheets ---------- */
function SaySheet({ ph, isMusic, text, setText, onClose, onRun, onMic }) {
  const ex = isMusic ? ['把副歌做成铃声', '做成 60 秒循环', '只留 1:20 到 2:45', '剪掉开头3秒'] : [SJ.SENTENCE.text, '剪掉开头', SJ.SENTENCE.aiRewrite.said, '降噪之后统一音量', '剪掉开头3秒，发给朋友', '分成 3 段，每段一个文件', '变成大叔的声音', '配一首轻快的背景音乐'];
  const recent = ph.store.recent || ['剪掉开头3秒', '结尾淡出2秒'];
  return <Sheet title="说一句" onClose={onClose}>
    <div className="pad"><div className="fld" style={{ minHeight: 56, borderRadius: 20, paddingRight: 6 }}>
      <input value={text} onChange={e => setText(e.target.value)} placeholder="比如：剪掉开头3秒" onKeyDown={e => { if (e.key === 'Enter') onRun(text); }} />
      <button className="ib" onClick={onMic} aria-label="说话"><Icon n="mic" /></button></div>
      <Btn k="pri" full style={{ marginTop: 10 }} disabled={!text.trim()} onClick={() => onRun(text)}>看看会怎么改</Btn>
      <p className="note" style={{ marginTop: 8 }}>中文、英文都行；本机就能听懂，不联网。改之前会先给你看计划。</p></div>
    <div className="st"><b>这样说也行</b></div>
    <div className="pad wrapchips">{ex.map(e => <button key={e} className="chip" style={{ height: 'auto', minHeight: 36, whiteSpace: 'normal', textAlign: 'left', padding: '7px 14px', lineHeight: 1.4 }} onClick={() => { setText(e); onRun(e); }}>{e}</button>)}</div>
    <div className="st"><b>最近说过</b></div>
    {recent.map(r => <button key={r} className="li" style={{ minHeight: 48 }} onClick={() => { setText(r); onRun(r); }}><Icon n="clock" s={18} /><div className="lt"><b>{r}</b></div></button>)}
    <div className="st"><b>我的配方</b><span>存下来的整句</span></div>
    {SJ.SENTENCE.recipes.map(r => { const [n, t] = r.split('：'); return <button key={r} className="li" style={{ minHeight: 56 }} onClick={() => { setText(r); onRun(r); }}><Icon n="sparkle" s={18} /><div className="lt"><b>{n}</b><span>{t}</span></div></button>; })}
  </Sheet>;
}
function ListenSheet({ onClose, onDone }) {
  useEffect(() => { const t = setTimeout(() => onDone('剪掉开头3秒，删掉长停顿'), 2300); return () => clearTimeout(t); }, []);
  return <Sheet title="在听" onClose={onClose}>
    <div className="mic-bars" style={{ marginTop: 10 }}>{[0, 1, 2, 3, 4, 5, 6].map(i => <i key={i} style={{ animationDelay: i * 0.12 + 's' }} />)}</div>
    <p style={{ textAlign: 'center', fontSize: 16, marginTop: 10 }}>说吧，比如「剪掉开头3秒」</p>
    <p className="note" style={{ textAlign: 'center', marginTop: 4, paddingBottom: 20 }}>用手机自带的语音识别，在本机完成，不联网</p>
  </Sheet>;
}
function ToolsSheet({ ph, id, isMusic, onClose, onEdit }) {
  const groups = ['让声音更好', '改变声音', '拆与合', '文字'];
  return <Sheet title="全部工具" onClose={onClose} style={{ maxHeight: '94%' }}>
    <div className="st" style={{ marginTop: 6 }}><b>在这里改</b><span>随时撤销</span></div>
    <div className="pad wrapchips">{SJ.EDITS.map(e => <button key={e} className="chip" style={{ height: 34, fontSize: 13.5 }} onClick={() => onEdit(e)}>{e}</button>)}</div>
    {groups.map(g => <Fragment key={g}><div className="st"><b>{g}</b>{g === '让声音更好' && <span>处理完存成新版本，原来的不动</span>}</div>
      {SJ.TOOLS.filter(t => t.group === g).map(t => <button key={t.id} className="li" style={{ minHeight: 56 }} onClick={() => { onClose(); ph.nav.push('tool', { tool: t.id, id }); }}>
        <div className="lt"><b>{t.name}{t.unavailable && <span className="tag" style={{ marginLeft: 8 }}>即将开放</span>}</b><span>{t.desc}</span></div>
        <span className="rt t3" style={{ fontSize: 13 }}>{t.result === 'version' ? '新版本' : t.result === 'two versions' ? '两个版本' : t.result === 'new audio' ? '新音频' : ''}</span></button>)}</Fragment>)}
  </Sheet>;
}
function InsertSheet({ onClose, onInsert }) {
  const [len, setLen] = useState(1);
  return <Sheet title="在播放头这里插入" onClose={onClose}>
    <div className="st" style={{ marginTop: 4 }}><b>一段静音</b><span className="num">0.05–600 秒</span></div>
    <div className="chips">{[0.5, 1, 2, 5, 10].map(v => <button key={v} className={cx('chip', len === v && 'on')} onClick={() => setLen(v)}>{v} 秒</button>)}</div>
    <div className="pad" style={{ marginTop: 10 }}><Btn full onClick={() => onInsert({ s: 0, e: len, silent: true }, '插入了 ' + len + ' 秒静音')}>插入 {len} 秒静音</Btn></div>
    <div className="st"><b>一段音频</b></div>
    <button className="li" onClick={() => onInsert({ s: 0, e: REC.dur, src: 'rec' }, '插入了「开场白重录」')}><Mini S={REC} w={20} h={40} half={10} /><div className="lt"><b>开场白重录</b><span>音频库里的，{fmtT(REC.dur)}</span></div><Icon n="plus" s={20} /></button>
    <button className="li" onClick={() => onInsert({ s: 0, e: REC.dur, src: 'rec' }, '录好了一段 ' + sec1(REC.dur) + ' 秒，插进去了')}><span className="playsm" style={{ background: '#3a1f1f', color: '#ff8f7f' }}><Icon n="rec" s={16} /></span><div className="lt"><b>现在录一段</b><span>录完直接插在这里</span></div><Icon n="chevR" s={20} /></button>
  </Sheet>;
}
function MoreSheet({ ph, p, opt, setOpt, isMusic, speed, setSpeed, onClose, onPanel }) {
  const row = (l, k, s) => <div className="li" style={{ minHeight: 56 }}><div className="lt"><b>{l}</b>{s && <span>{s}</span>}</div><Switch on={opt[k]} onChange={v => setOpt(o => ({ ...o, [k]: v }))} /></div>;
  return <Sheet title="更多" onClose={onClose}>
    {row('频谱', 'spectrum', '横着是频率，竖着还是时间')}{row('原声对比', 'ab', '听改之前的样子，再切回来')}{row('音量曲线', 'curve', '在脊线右边点点，画出音量起伏')}{isMusic && row('节拍线', 'beat', '92 BPM，拖选会吸到拍子上')}
    <div className="pad"><div className="kv">试听速度<span>不改变音频本身</span></div><Seg value={speed} options={[0.5, 0.75, 1, 1.25, 1.5, 2].map(v => ({ v, l: v + '×' }))} onChange={setSpeed} /></div>
    <button className="li" onClick={() => onPanel('precise')}><Icon n="clock" s={20} /><div className="lt"><b>按时间选一段</b><span>输入开始和结束</span></div></button>
    <button className="li" onClick={() => onPanel('markers')}><Icon n="marker" s={20} /><div className="lt"><b>标记</b><span>列表、改名、按标记分割</span></div></button>
    <button className="li" onClick={() => { onClose(); ph.nav.push('versions', { id: p.id }); }}><Icon n="layers" s={20} /><div className="lt"><b>版本</b><span>每次处理都留着，随时换回去</span></div></button>
  </Sheet>;
}
function MarkersSheet({ markers, onClose, onRename, onDel, onSplit, onGo }) {
  const [edit, setEdit] = useState(null);
  return <Sheet title={'标记 ' + markers.length} onClose={onClose}>
    {markers.map(m => <div key={m.id} className="li">
      <span className="mk" style={{ position: 'static', transform: 'none', flex: 'none' }} />
      <div className="lt">{edit === m.id ? <input autoFocus defaultValue={m.name} className="fld" style={{ width: '100%' }} onBlur={e => { onRename(m.id, e.target.value || m.name); setEdit(null); }} onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }} /> : <Fragment><b>{m.name}</b><span>{m.r == null ? '这里的声音被剪掉了' : fmtT(m.r, true)}</span></Fragment>}</div>
      {m.r != null && <button className="ib" onClick={() => onGo(m.r)} aria-label="跳过去"><Icon n="chevR" s={20} /></button>}
      <button className="ib" onClick={() => setEdit(m.id)} aria-label="改名"><Icon n="edit" s={19} /></button>
      <button className="ib" onClick={() => onDel(m.id)} aria-label="删除"><Icon n="trash" s={19} /></button></div>)}
    <div className="pad" style={{ marginTop: 10 }}><Btn full onClick={onSplit}>按标记分成 {markers.filter(m => m.r != null).length + 1} 段</Btn><p className="note" style={{ marginTop: 8 }}>导出时可以每段存一个文件。播放头那里点「标记」就能再加一个。</p></div>
  </Sheet>;
}
function PreciseSheet({ sel, dur, onClose, onOk }) {
  const [a, setA] = useState(sel[0]), [b, setB] = useState(sel[1]);
  const st = (v, set, lo, hi) => <span className="val" style={{ height: 40, borderRadius: 20 }}><button style={{ width: 40, height: 40 }} onClick={() => set(+clamp(v - 0.1, lo, hi).toFixed(1))}>−</button><i style={{ minWidth: 76, fontSize: 16 }}>{fmtT(v, true)}</i><button style={{ width: 40, height: 40 }} onClick={() => set(+clamp(v + 0.1, lo, hi).toFixed(1))}>+</button></span>;
  return <Sheet title="按时间选一段" onClose={onClose}>
    <div className="pad"><div className="kv">从{st(a, setA, 0, b - 0.1)}</div><div className="kv">到{st(b, setB, a + 0.1, dur)}</div>
      <p className="note">一共 {secU(b - a)}。按住 − / + 每次挪 0.1 秒。</p>
      <Btn k="pri" full style={{ marginTop: 12 }} onClick={() => onOk(a, b)}>选好了</Btn></div>
  </Sheet>;
}
