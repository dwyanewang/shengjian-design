/* ================= editor (工作台) ================= */
let NID = 100; const nid = () => ++NID;
function segLen(s) { return s.b - s.a; }
function cutRange(segs, a, b) {
  const out = []; let t = 0;
  segs.forEach(s => { const L = segLen(s), s0 = t, s1 = t + L;
    if (s1 <= a || s0 >= b) out.push(s);
    else { if (a > s0) out.push({ ...s, b: s.a + (a - s0), fo: 0, id: nid() }); if (b < s1) out.push({ ...s, a: s.a + (b - s0), fi: 0, id: nid() }); }
    t = s1; });
  return out;
}
function splitAt(segs, at) {
  const out = []; let t = 0;
  segs.forEach(s => { const L = segLen(s); if (at > t + 0.05 && at < t + L - 0.05) { out.push({ ...s, b: s.a + (at - t), fo: 0, id: nid() }); out.push({ ...s, a: s.a + (at - t), fi: 0, id: nid() }); } else out.push(s); t += L; });
  return out;
}
function piecesOf(segs, a, b) { // the bits of [a,b)
  const out = []; let t = 0;
  segs.forEach(s => { const L = segLen(s), s0 = t, s1 = t + L; const x = Math.max(a, s0), y = Math.min(b, s1); if (y > x) out.push({ ...s, a: s.a + (x - s0), b: s.a + (y - s0), fi: 0, fo: 0, id: nid() }); t = s1; });
  return out;
}
function insertAt(segs, at, pieces) {
  const sp = splitAt(segs, at); const out = []; let t = 0, done = false;
  sp.forEach(s => { if (!done && t >= at - 0.05) { out.push(...pieces); done = true; } out.push(s); t += segLen(s); });
  if (!done) out.push(...pieces);
  return out;
}
function mapRange(segs, a, b, f) { const s2 = splitAt(splitAt(segs, a), b); let t = 0; return s2.map(s => { const m = t + segLen(s) / 2; t += segLen(s); return m > a && m < b ? f(s) : s; }); }
function buildEnv(base, rate, segs) {
  let n = 0; segs.forEach(s => n += Math.round(segLen(s) * rate));
  const o = new Float32Array(n); let k = 0;
  segs.forEach(s => { const L = segLen(s), i0 = Math.round(s.a * rate), m = Math.round(L * rate);
    for (let j = 0; j < m; j++) { let v = s.silent ? 0.004 : (base[i0 + j] || 0) * (s.g || 1); const t = j / rate; if (s.fi && t < s.fi) v *= t / s.fi; if (s.fo && L - t < s.fo) v *= (L - t) / s.fo; o[k++] = Math.min(1, v); } });
  return o;
}
const ZOOMS = [1, 0.5, 0.25, 0.1];
function Editor({ p }) {
  const { nav, g, player } = useContext(PhoneCtx);
  const item = libItem(p.item || 'interview');
  const isPod = item.id === 'interview', music = item.env === 'music';
  const [applied, setApplied] = useState(p.applied !== undefined ? p.applied : (isPod ? g.applied : null));
  const res = useMemo(() => applied ? planResult(applied.vals, applied.off) : null, [applied]);
  const base = music ? { env: envMusic(), rate: 20, total: item.seconds } : res ? { env: res.env, rate: 50, total: res.total } : { env: envSpeech(), rate: 50, total: isPod ? 1120 : item.seconds };
  const baseLen = base.env.length / base.rate;
  const fresh = () => ({ segs: [{ a: 0, b: baseLen, id: nid() }], marks: isPod ? [] : item.markers ? [300, 720, 1190, 1630, 2100, 2500].filter(m => m < baseLen) : [], hist: [], fut: [] });
  const [ed, setEd] = useState(fresh);
  useEffect(() => { setEd(fresh()); setTrail(!!applied); }, [applied]);
  const [trail, setTrail] = useState(!!applied);
  const [ab, setAb] = useState(p.ab || 'B');
  const [spec, setSpec] = useState(!!p.spec);
  const [zoom, setZoom] = useState(p.zoom != null ? p.zoom : 2);
  const [viewA, setViewA] = useState(0);
  const [sel, setSel] = useState(p.sel || null);
  const [cur, setCur] = useState(p.cur != null ? p.cur : 42.3);
  const [panel, setPanel] = useState(p.panel || null);
  const [envPts, setEnvPts] = useState(p.envMode ? [] : null);
  const disp = useMemo(() => ab === 'A' && !music ? envSpeech() : buildEnv(base.env, base.rate, ed.segs), [ed.segs, ab, base.env]);
  const dispLen = disp.length / base.rate;
  const total = ab === 'A' && !music ? (isPod ? 1120 : item.seconds) : base.total - (baseLen - dispLen);
  const len = Math.max(5, dispLen * ZOOMS[zoom]);
  const va = clamp(viewA, 0, Math.max(0, dispLen - len));
  const W = 328, H = 168;
  const X = t => (t - va) / len * W;
  const tag = 'ed-' + item.id;
  const playing = player.on(tag);
  const pos = player.tag === tag ? player.t : cur;
  useEffect(() => { if (playing && (pos > va + len || pos < va)) setViewA(Math.max(0, pos - len * 0.1)); }, [pos]);
  useEffect(() => { if (p.toast) nav.toast('照这句话改好了，可以一次撤销', '撤销', () => { setApplied(null); nav.set({ applied: null }); }); }, []);
  const commit = (label, patch) => { setEd(e => ({ ...e, ...patch, hist: [...e.hist, { segs: e.segs, marks: e.marks, label }].slice(-50), fut: [] })); setTrail(false); nav.toast(label, '撤销', () => undo()); };
  const undo = () => setEd(e => { if (!e.hist.length) { nav.toast('没有可以撤销的了'); return e; } const h = e.hist[e.hist.length - 1]; nav.toast('撤销：' + h.label); return { ...e, segs: h.segs, marks: h.marks, hist: e.hist.slice(0, -1), fut: [{ segs: e.segs, marks: e.marks, label: h.label }, ...e.fut] }; });
  const redo = () => setEd(e => { if (!e.fut.length) { nav.toast('没有可以重做的了'); return e; } const f = e.fut[0]; nav.toast('重做：' + f.label); return { ...e, segs: f.segs, marks: f.marks, hist: [...e.hist, { segs: e.segs, marks: e.marks, label: f.label }], fut: e.fut.slice(1) }; });
  // pointer: tap = move the cursor, drag = select
  const wref = useRef(); const drag = useRef(null);
  const tAt = e => { const r = wref.current.getBoundingClientRect(); return clamp(va + (e.clientX - r.left) / r.width * len, 0, dispLen); };
  const onDown = e => { if (envPts) { const r = wref.current.getBoundingClientRect(); const t = tAt(e), y = clamp((e.clientY - r.top) / r.height, 0, 1); setEnvPts([...envPts, { t, v: 1 - y }].sort((a, b) => a.t - b.t)); return; } drag.current = { t0: tAt(e), x: e.clientX, moved: false }; wref.current.setPointerCapture && wref.current.setPointerCapture(e.pointerId); };
  const onMove = e => { const d = drag.current; if (!d) return; if (Math.abs(e.clientX - d.x) > 4) { d.moved = true; const t = tAt(e); setSel([Math.min(d.t0, t), Math.max(d.t0, t)]); } };
  const onUp = e => { const d = drag.current; drag.current = null; if (!d) return; if (!d.moved) { const t = tAt(e); const near = seams.find(s => Math.abs(X(s.t) - X(t)) < 6); if (near) { nav.toast('这里删了一处长停顿，来自你说的「删掉长停顿」'); return; } setCur(t); setSel(null); if (playing) player.play(tag, dispLen, t); } };
  // a trail of the sentence that made this version: colours stay until the next change
  const colors = applied && applied.colors || {};
  const regions = [];
  if (ab === 'A' && applied && !music) planCuts(applied.vals, applied.off).forEach(c => regions.push({ a: c.a, b: c.b, kind: 'fill', c: HL[colors[c.step === 1 ? 's1' : 's2'] || 1].fill, min: 3 }));
  if (ab === 'B' && trail && applied) { if (colors.s1) regions.push({ a: 0.05, b: 0.05, kind: 'edge', c: HL[colors.s1].ink }); if (colors.s3) regions.push({ a: 0, b: dispLen, kind: 'band', c: HL[colors.s3].fill, bh: 6 }); }
  if (sel) regions.push({ a: sel[0], b: sel[1], kind: 'sel' });
  const seams = ab === 'B' && trail && res && colors.s2 ? res.seams.filter(s => s.step === 2).map(s => ({ t: s.t, c: HL[colors.s2].ink, f: HL[colors.s2].fill })) : [];
  let tt = 0; const bounds = ed.segs.slice(0, -1).map(s => (tt += segLen(s)));
  const ticks = []; const stepT = len > 90 ? 30 : len > 40 ? 10 : len > 16 ? 5 : 2; for (let t = Math.ceil(va / stepT) * stepT; t <= va + len; t += stepT) ticks.push(t);
  const vname = isPod ? (applied ? '照一句话改的' : g.versions[g.versions.length - 1]) : (item.versionNames ? item.versionNames[item.versionNames.length - 1] : '原始');
  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
  const S = sel || [Math.max(0, cur - 5), Math.min(dispLen, cur + 5)];
  const doCut = () => { commit(`剪掉 ${fmt1(S[0])}–${fmt1(S[1])}`, { segs: cutRange(ed.segs, S[0], S[1]) }); setSel(null); setCur(S[0]); };
  const doKeep = () => { commit(`只留 ${fmt1(S[0])}–${fmt1(S[1])}`, { segs: cutRange(cutRange(ed.segs, S[1], 1e9), 0, S[0]) }); setSel(null); setCur(0); setViewA(0); };
  const doCopy = () => { nav.set({ clip: piecesOf(ed.segs, S[0], S[1]) }); nav.toast(`已复制 ${(S[1] - S[0]).toFixed(1)} 秒，点「粘贴」放到播放头`); };
  const doCutClip = () => { nav.set({ clip: piecesOf(ed.segs, S[0], S[1]) }); commit('剪切 ' + (S[1] - S[0]).toFixed(1) + ' 秒', { segs: cutRange(ed.segs, S[0], S[1]) }); setSel(null); };
  const doPaste = () => { if (!g.clip) { nav.toast('剪贴板是空的：先选一段复制'); return; } commit('粘贴到 ' + fmt1(cur), { segs: insertAt(ed.segs, cur, g.clip.map(s => ({ ...s, id: nid() }))) }); };
  const doDup = () => { commit('重复一段 ' + (S[1] - S[0]).toFixed(1) + ' 秒', { segs: insertAt(ed.segs, S[1], piecesOf(ed.segs, S[0], S[1])) }); setSel([S[1], S[1] + S[1] - S[0]]); };
  const doSplit = () => { commit('在 ' + fmt1(cur) + ' 分割', { segs: splitAt(ed.segs, cur) }); };
  const openTool = id => { setPanel(null); nav.go('tool', { id, item: item.id }); };
  const selRow = [['cut', '剪掉', doCut], ['flag', '只留', doKeep], ['copy', '复制', doCopy], ['cut', '剪切', doCutClip], ['repeat', '重复', doDup], ['vol', '音量', () => setPanel('gain')], ['fade', '淡化', () => setPanel('fade')]];
  const baseRow = [['split', '分割', doSplit], ['vol', '音量', () => setPanel('gain')], ['fade', '淡化', () => setPanel('fade')], ['flag', '标记', () => setPanel('marks')], ['ins', '插入', () => setPanel('insert')], ['layers', '片段', () => setPanel('segs')], ['sliders', '工具', () => setPanel('tools')]];
  return <div className="scr enter">
    <Top title={<Dot s={item.title} />} sub={<span onClick={() => nav.go('versions', { item: item.id })} style={{ cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>版本：{vname}</span>}
      right={<><button className="ib" onClick={undo} aria-label="撤销" style={{ opacity: ed.hist.length ? 1 : 0.45 }}><Ic n="undo" /></button><button className="ib" onClick={redo} aria-label="重做" style={{ opacity: ed.fut.length ? 1 : 0.45 }}><Ic n="redo" /></button>
        <button data-anchor="ed-export" className="btn btn-p" style={{ height: 38, padding: '0 14px', fontSize: 15, marginLeft: 2 }} onClick={() => nav.go('export', { item: item.id })}>导出</button></>} />
    {/* whole file */}
    <div className="pad" style={{ position: 'relative', height: 26, cursor: 'pointer' }} onClick={e => { const r = e.currentTarget.getBoundingClientRect(); const f = (e.clientX - r.left - 16) / W; setViewA(clamp(f * dispLen - len / 2, 0, dispLen)); }}>
      <Wave env={music ? envMusic() : envOverview(Math.round(total))} rate={music ? 20 : 2} w={W} h={22} thin dim />
      <div style={{ position: 'absolute', top: 0, left: 16 + (music ? va / dispLen * W : va / total * W), width: Math.max(4, (music ? len / dispLen : len / total) * W), height: 22, boxShadow: 'inset 0 0 0 2px var(--ink)', borderRadius: 4 }} />
      {trail && colors.s4 && <div style={{ position: 'absolute', right: 16, top: 0, width: 5, height: 22, background: HL[colors.s4].fill, borderRadius: 2 }} />}
    </div>
    {/* the sound */}
    <div className="pad" style={{ marginTop: 8 }}>
      <div ref={wref} style={{ position: 'relative', height: H, touchAction: 'none', cursor: envPts ? 'crosshair' : 'text', userSelect: 'none' }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}>
        <Wave env={disp} rate={base.rate} from={va} to={va + len} w={W} h={H} regions={regions} seams={seams} spectrum={spec} thin={len < 70} scale={0.84} />
        {ab === 'B' && bounds.map((b, i) => b > va && b < va + len && <div key={i} style={{ position: 'absolute', left: X(b) - 1, top: 0, width: 2, height: H, background: 'var(--ink-3)', opacity: 0.7, pointerEvents: 'none' }}><span className="num" style={{ position: 'absolute', top: -2, left: 4, fontSize: 12, color: 'var(--ink-3)' }}>{i + 2}</span></div>)}
        {ed.marks.map((m, i) => m >= va && m <= va + len && <div key={'m' + i} style={{ position: 'absolute', left: X(m), top: 0, height: H, borderLeft: '1.5px dashed var(--ink)', pointerEvents: 'none' }}><span style={{ position: 'absolute', top: 0, left: 0, background: 'var(--ink)', color: 'var(--on-ink)', fontSize: 12, padding: '0 5px', borderRadius: '0 4px 4px 0', lineHeight: '18px' }}>{i + 1}</span></div>)}
        {envPts && <svg width={W} height={H} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}><polyline points={[{ t: va, v: 0.75 }, ...envPts, { t: va + len, v: envPts.length ? envPts[envPts.length - 1].v : 0.75 }].map(q => `${X(q.t)},${(1 - q.v) * H}`).join(' ')} fill="none" stroke="var(--ink)" strokeWidth="2" />{envPts.map((q, i) => <circle key={i} cx={X(q.t)} cy={(1 - q.v) * H} r="5" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2" />)}</svg>}
        {pos >= va && pos <= va + len && <Playhead x={X(pos)} h={H} />}
        {ab === 'A' && <span style={{ position: 'absolute', left: 6, top: 6, fontSize: 13, background: 'var(--ink)', color: 'var(--on-ink)', padding: '2px 8px', borderRadius: 6 }}>原来的声音</span>}
        <div style={{ position: 'absolute', right: 2, top: 2, display: 'flex', gap: 2 }}>
          <button className="ib soft" style={{ width: 32, height: 32 }} onPointerDown={e => e.stopPropagation()} onClick={() => setZoom(Math.max(0, zoom - 1))} aria-label="缩小"><Ic n="zout" s={18} /></button>
          <button className="ib soft" style={{ width: 32, height: 32 }} onPointerDown={e => e.stopPropagation()} onClick={() => { setZoom(Math.min(3, zoom + 1)); setViewA(Math.max(0, pos - dispLen * ZOOMS[Math.min(3, zoom + 1)] / 3)); }} aria-label="放大"><Ic n="zin" s={18} /></button>
        </div>
      </div>
      <div style={{ position: 'relative', height: 18, marginTop: 4 }}>{ticks.map(t => <span key={t} className="num" style={{ position: 'absolute', left: X(t), transform: 'translateX(-50%)', fontSize: 12, color: 'var(--ink-3)' }}>{fmt(t)}</span>)}</div>
    </div>
    <div className="pad" style={{ display: 'flex', alignItems: 'center', gap: 6, height: 56 }}>
      <PlayBtn on={playing} onClick={() => player.toggle(tag, dispLen, pos >= dispLen ? 0 : pos)} />
      <span style={{ marginLeft: 4, minWidth: 0, whiteSpace: 'nowrap' }}><b className="num" style={{ fontSize: 17 }}>{fmt1(pos)}</b><span className="num" style={{ color: 'var(--ink-3)', fontSize: 14 }}> / {fmt(total)}</span></span>
      <span style={{ flex: 1 }} />
      <button className="chip" style={{ height: 34, padding: '0 10px' }} onClick={() => { const i = speeds.indexOf(player.speed); const n = speeds[(i + 1) % speeds.length]; player.setSpeed(n); }}><span className="num">{player.speed}×</span></button>
      <button className={'chip' + (ab === 'A' ? ' on' : '')} style={{ height: 34, padding: '0 10px' }} onClick={() => setAb(ab === 'A' ? 'B' : 'A')}>原声</button>
      <button className={'chip' + (spec ? ' on' : '')} style={{ height: 34, padding: '0 10px' }} onClick={() => setSpec(!spec)}>频谱</button>
    </div>
    <div className="scroll">
      {sel && <div className="pad" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, marginBottom: 8 }}>
        <span style={{ whiteSpace: 'nowrap' }}>已选 <b className="num">{fmt1(sel[0])}–{fmt1(sel[1])}</b> <span className="mute num">{(sel[1] - sel[0]).toFixed(1)} 秒</span></span><span style={{ flex: 1 }} />
        <button className="btn-t" style={{ height: 34, whiteSpace: 'nowrap', padding: '0 8px' }} onClick={() => setPanel('seltime')}>精确时间</button><button className="ib" style={{ width: 34, height: 34 }} onClick={() => setSel(null)} aria-label="取消选区"><Ic n="close" s={18} /></button>
      </div>}
      {applied && isPod && trail && ab === 'B' && <div style={{ margin: '0 12px 10px', background: 'var(--surface)', borderRadius: 20, padding: '12px 14px' }}>
        <div style={{ fontSize: 14, color: 'var(--ink-3)' }}>这一版来自你说的</div>
        <Sentence text={applied.text} steps={(PARSE[applied.text] || { steps: [] }).steps} off={{}} size={17} weight={500} />
        <div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 4 }}>改了 {Object.keys(colors).length} 处，18:40 变成 <span className="num">{fmt(total)}</span>。颜色留到你下一次修改。</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 6, marginLeft: -10 }}>
          <button className="btn-t" onClick={() => { setApplied(null); nav.set({ applied: null }); nav.toast('整条计划撤销了，回到原来的 18:40', '重做', () => setApplied(applied)); }}>整条撤销</button>
          <button className="btn-t" onClick={() => setAb('A')}>对比原来的</button>
          <button className="btn-t" onClick={() => nav.go('plan', { text: applied.text })}>改一下</button>
        </div>
      </div>}
      {p.next && <div style={{ margin: '0 12px 10px', background: 'var(--surface)', borderRadius: 20, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}><div style={{ fontSize: 14, color: 'var(--ink-3)' }}>还有一步</div><div style={{ fontSize: 17, fontWeight: 700 }}><Hl i={p.next.color}>{p.next.ph}</Hl>：用「效果」里的均衡</div></div>
        <button className="btn btn-p" style={{ height: 42 }} onClick={() => nav.go('tool', { id: p.next.tool })}>接着做</button></div>}
      <div style={{ margin: '0 12px 10px', background: 'var(--surface)', borderRadius: 20, padding: '12px 14px', cursor: 'text' }} onClick={() => nav.go('say', { text: '' })}>
        <div style={{ fontFamily: 'var(--f-big)', fontSize: 22, fontWeight: 700, color: 'var(--ink-3)', lineHeight: 1.4 }}>再说一句，比如「配一首轻快的背景音乐」</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}><button className="ib soft" style={{ width: 40, height: 40 }} onClick={e => { e.stopPropagation(); nav.go('say', { listen: true }); }} aria-label="说话"><Ic n="mic" s={20} /></button><span className="lbl">说的话先变成计划，看过再改</span></div>
      </div>
      {p.manualNote && <div className="pad" style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 10 }}>「{p.manualNote}」：已按片段放好，导出时会每段一个文件。</div>}
    </div>
    <div style={{ flex: 'none', height: 68, display: 'flex', background: 'var(--surface)', boxShadow: '0 -1px 0 var(--line)', padding: '0 4px' }}>
      {(sel ? selRow : baseRow).map(([ic, l, f], i) => <button key={i} data-anchor={l === '工具' ? 'ed-tools' : undefined} onClick={f} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, fontSize: 13, fontWeight: 500 }}><Ic n={ic} s={22} />{l}</button>)}
    </div>
    {panel && <EditorPanel k={panel} close={() => setPanel(null)} ctx={{ ed, setEd, commit, sel, S, cur, dispLen, setSel, setPanel, openTool, doPaste, doSplit, setEnvPts, envPts, setAb, setSpec, setZoom, music, isPod, item, setCur, undo, redo, total }} />}
  </div>;
}
function Sheet({ title, close, children, right }) {
  return <><div className="sheet-bg" onClick={close} /><div className="sheet"><div className="sheet-grip" /><div className="sheet-h"><span style={{ flex: 1 }}>{title}</span>{right}<button className="ib" onClick={close} aria-label="关闭"><Ic n="close" /></button></div><div className="sheet-b">{children}</div></div></>;
}
function EditorPanel({ k, close, ctx }) {
  const { nav, player } = useContext(PhoneCtx);
  const { ed, commit, S, sel, cur, dispLen, setSel, setPanel, openTool, doPaste, doSplit, setEnvPts, setAb, setSpec, setZoom, music, item, setCur, undo, total } = ctx;
  const [target, setTarget] = useState(sel ? 'sel' : 'all');
  const [db, setDb] = useState(3);
  const [fk, setFk] = useState('out'); const [flen, setFlen] = useState(2); const [shape, setShape] = useState('正弦');
  const [sil, setSil] = useState(1); const [xf, setXf] = useState(20); const [a0, setA0] = useState(S[0]); const [a1, setA1] = useState(S[1]);
  const [snap, setSnap] = useState(false);
  const curve = s => Array.from({ length: 21 }, (_, i) => { const x = i / 20, y = s === '线性' ? x : s === '对数' ? Math.log10(1 + 9 * x) : Math.sin(x * Math.PI / 2); return `${8 + x * 120},${52 - y * 44}`; }).join(' ');
  if (k === 'tools') return <Sheet title="工具" close={close}>
    <div style={{ padding: '0 20px', fontSize: 15, fontWeight: 700 }}>剪：改这一版，可以撤销</div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '10px 20px 4px' }}>{SJ.EDITS.map((e, i) => <button key={i} className="chip" style={{ height: 36, fontSize: 14 }} onClick={() => {
      const f = [() => setPanel('seltime'), () => { setSel([20, 35]); setPanel(null); }, () => { doSplit(); setPanel(null); }, () => setPanel('segs'), () => { setSel([20, 35]); setPanel(null); }, () => { setSel([20, 35]); setPanel(null); }, () => setPanel('gain'), () => setPanel('fade'), () => setPanel('segs'), () => { setEnvPts([]); setPanel(null); nav.toast('在波形上点，加音量曲线的点'); }, () => setPanel('marks'), () => setPanel('insert'), () => setPanel('insert'), () => setPanel('beat'), () => setPanel('hist'), () => { player.setSpeed(1.5); setPanel(null); nav.toast('试听速度 1.5×，不改声音本身'); }, () => { setAb('A'); setPanel(null); }, () => { setSpec(true); setPanel(null); }, () => { setZoom(2); setPanel(null); }][i]; f(); }}>{e}</button>)}</div>
    <div style={{ padding: '18px 20px 0', fontSize: 15, fontWeight: 700 }}>处理：存成新版本，原来的不动</div>
    {['让声音更好', '改变声音', '拆与合', '文字'].map(gp => <div key={gp}>
      <div style={{ padding: '12px 20px 6px', fontSize: 14, color: 'var(--ink-3)' }}>{gp}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 16px' }}>{SJ.TOOLS.filter(t => t.group === gp).map(t => <button key={t.id} data-tool={t.id} onClick={() => openTool(t.id)} style={{ background: 'var(--surface-2)', borderRadius: 16, padding: '10px 12px', minHeight: 78 }}>
        <div style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>{t.name}{t.unavailable && <span className="badge">即将开放</span>}</div>
        <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.4, marginTop: 2 }}>{t.desc}</div></button>)}</div></div>)}
  </Sheet>;
  if (k === 'gain') return <Sheet title="音量" close={close}><div style={{ padding: '4px 20px' }}>
    <Seg items={[['sel', '选区'], ['seg', '这一段'], ['all', '整体']]} value={target} onChange={setTarget} />
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '20px 0 4px' }}><b className="num" style={{ fontSize: 34 }}>{db > 0 ? '+' : ''}{db.toFixed(0)}</b><span>dB</span><span style={{ marginLeft: 'auto', fontSize: 14, color: 'var(--ink-2)' }}>{db > 6 ? '可能爆音，导出时会提醒' : db < 0 ? '小一点' : '大一点'}</span></div>
    <Slider value={db} min={-12} max={12} onChange={v => setDb(Math.round(v))} />
    <button className="btn btn-p wide" style={{ marginTop: 18 }} onClick={() => { const [a, b] = target === 'all' ? [0, dispLen] : target === 'sel' ? S : [0, Math.min(dispLen, 42)]; commit(`音量 ${db > 0 ? '+' : ''}${db} dB（${target === 'all' ? '整体' : target === 'sel' ? '选区' : '这一段'}）`, { segs: mapRange(ed.segs, a, b, s => ({ ...s, g: (s.g || 1) * Math.pow(10, db / 20) })) }); close(); }}>应用</button>
  </div></Sheet>;
  if (k === 'fade') return <Sheet title="淡入淡出" close={close}><div style={{ padding: '4px 20px' }}>
    <Seg items={[['in', '淡入'], ['out', '淡出']]} value={fk} onChange={setFk} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 16 }}>
      <svg width="136" height="60" style={{ background: 'var(--surface-2)', borderRadius: 12, flex: 'none', transform: fk === 'out' ? 'scaleX(-1)' : 'none' }}><polyline points={curve(shape)} fill="none" stroke="var(--ink)" strokeWidth="2.5" /></svg>
      <div><div className="lbl">长度</div><Stepper value={flen} unit="秒" step={0.5} min={0.5} max={30} onChange={setFlen} /></div>
    </div>
    <div style={{ marginTop: 14 }}><Seg items={['正弦', '线性', '对数']} value={shape} onChange={setShape} /></div>
    <div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 8 }}>{sel ? '作用在选区上' : fk === 'in' ? '从开头算起' : '到结尾为止'}，不改总长度。</div>
    <button className="btn btn-p wide" style={{ marginTop: 14 }} onClick={() => { const segs = ed.segs.slice(); if (fk === 'in') segs[0] = { ...segs[0], fi: flen }; else segs[segs.length - 1] = { ...segs[segs.length - 1], fo: flen }; commit(`${fk === 'in' ? '淡入' : '淡出'} ${flen} 秒（${shape}）`, { segs }); close(); }}>应用</button>
  </div></Sheet>;
  if (k === 'marks') { const ms = ed.marks; return <Sheet title="标记" close={close}><div style={{ padding: '0 8px' }}>
    {!ms.length && <div style={{ padding: '6px 12px 10px', fontSize: 15, color: 'var(--ink-2)' }}>还没有标记。播放到想记的地方，点下面的按钮。</div>}
    {ms.map((m, i) => <div key={i} className="row" style={{ minHeight: 48 }}><span className="badge solid">{i + 1}</span><span className="row-m" style={{ fontSize: 16 }}>标记 {i + 1}</span><span className="num">{fmt1(m)}</span><button className="ib" onClick={() => { setCur(m); }} aria-label="跳过去"><Ic n="chev" /></button></div>)}
    {ms.length > 0 && <div className="row" style={{ minHeight: 40, fontSize: 14, color: 'var(--ink-3)' }}>剪掉了的部分里的标记会列成「已剪掉」，不显示在波形上</div>}
    <div style={{ display: 'flex', gap: 8, padding: '10px 12px' }}>
      <button className="btn btn-p" style={{ flex: 1 }} onClick={() => commit('在 ' + fmt1(cur) + ' 加标记', { marks: [...ms, cur].sort((a, b) => a - b) })}>在 <span className="num">{fmt1(cur)}</span> 加标记</button>
      <button className="btn btn-s" onClick={() => { if (!ms.length) { nav.toast('先加标记'); return; } let segs = ed.segs; ms.forEach(m => segs = splitAt(segs, m)); commit(`按 ${ms.length} 个标记分成 ${ms.length + 1} 段`, { segs }); close(); }}>按标记分割</button>
    </div></div></Sheet>; }
  if (k === 'insert') return <Sheet title="插入" close={close}><div style={{ padding: '0 20px' }}>
    <div style={{ fontSize: 15, color: 'var(--ink-2)' }}>插在播放头 <b className="num">{fmt1(cur)}</b></div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}><span style={{ fontSize: 17, fontWeight: 700, flex: 1 }}>一段静音</span><Stepper value={sil} unit="秒" step={0.5} min={0.05} max={600} onChange={setSil} /></div>
    <button className="btn btn-s wide" style={{ marginTop: 10 }} onClick={() => { commit(`插入 ${sil} 秒静音`, { segs: insertAt(ed.segs, cur, [{ a: 0, b: sil, silent: true, id: nid() }]) }); close(); }}>插入静音</button>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
      <button className="btn btn-s" onClick={() => { close(); nav.toast('会打开音频库：选一段声音，插到 ' + fmt1(cur)); }}>插入别的声音</button>
      <button className="btn btn-s" onClick={() => { close(); nav.go('record', { mode: 'insert' }); }}>现在录一段</button>
    </div>
    <button className="btn btn-t" style={{ marginTop: 6, marginLeft: -12 }} onClick={() => { doPaste(); close(); }}>粘贴剪贴板里的</button>
  </div></Sheet>;
  if (k === 'segs') { let t = 0; return <Sheet title={`片段（${ed.segs.length} 段）`} close={close}><div>
    {ed.segs.map((s, i) => { const a = t; t += segLen(s); return <div key={s.id} className="row" style={{ minHeight: 52 }}>
      <span className="ib" style={{ width: 28, cursor: 'grab' }}><Ic n="grip" s={20} /></span>
      <div className="row-m"><div style={{ fontSize: 16, fontWeight: 500 }}>第 {i + 1} 段{s.silent ? '（静音）' : ''}</div><div className="row-d num">{fmt1(a)}–{fmt1(t)}　{segLen(s).toFixed(1)} 秒{s.g && s.g !== 1 ? `　${(20 * Math.log10(s.g)).toFixed(0)} dB` : ''}</div></div>
      <button className="ib" disabled={!i} style={{ opacity: i ? 1 : 0.35 }} onClick={() => { if (!i) return; const segs = ed.segs.slice(); [segs[i - 1], segs[i]] = [segs[i], segs[i - 1]]; commit(`第 ${i + 1} 段往前挪`, { segs }); }} aria-label="往前"><Ic n="up" /></button>
      <button className="ib" style={{ opacity: i < ed.segs.length - 1 ? 1 : 0.35 }} onClick={() => { if (i >= ed.segs.length - 1) return; const segs = ed.segs.slice(); [segs[i + 1], segs[i]] = [segs[i], segs[i + 1]]; commit(`第 ${i + 1} 段往后挪`, { segs }); }} aria-label="往后"><Ic n="down" /></button>
    </div>; })}
    {ed.segs.length < 2 && <div style={{ padding: '4px 20px', fontSize: 14, color: 'var(--ink-2)' }}>现在只有 1 段。先「分割」或「按标记分割」，就能拖着排顺序。</div>}
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px 0' }}><span style={{ flex: 1, fontSize: 16 }}>接缝交叉淡化<div className="lbl">借用接缝两边多出来的声音，不改总长度</div></span><Stepper value={xf} unit="毫秒" step={10} min={0} max={500} onChange={setXf} /></div>
  </div></Sheet>; }
  if (k === 'seltime') return <Sheet title="选区时间" close={close}><div style={{ padding: '0 20px' }}>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      <div className="field"><small>从</small><Stepper value={+a0.toFixed(1)} step={0.1} min={0} max={dispLen} fmtv={fmt1} onChange={setA0} /></div>
      <div className="field"><small>到</small><Stepper value={+a1.toFixed(1)} step={0.1} min={0} max={dispLen} fmtv={fmt1} onChange={setA1} /></div>
    </div>
    <div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 10 }}>一共 <span className="num">{Math.max(0, a1 - a0).toFixed(1)}</span> 秒</div>
    <button className="btn btn-p wide" style={{ marginTop: 14 }} onClick={() => { setSel([Math.min(a0, a1), Math.max(a0, a1)]); close(); }}>选这一段</button>
  </div></Sheet>;
  if (k === 'beat') return <Sheet title="对齐节拍" close={close}><div style={{ padding: '0 20px 6px' }}>
    {music ? <><div style={{ fontSize: 17 }}>检测到 <b className="num">92</b> BPM</div><div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 4 }}>选区的两头会吸到最近的拍子上，剪出来不掉拍。</div></>
      : <div style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.6 }}>这段是说话，没有稳定的节拍。对齐节拍适合音乐，比如「晚风（钢琴版）」。</div>}
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}><span style={{ flex: 1, fontSize: 16 }}>选区吸附到拍子</span><Switch on={snap} onClick={() => setSnap(!snap)} /></div>
  </div></Sheet>;
  if (k === 'hist') return <Sheet title="改动记录" close={close}><div>
    <div style={{ padding: '0 20px 8px', fontSize: 14, color: 'var(--ink-2)' }}>最多记 50 步，关掉 App 也在。一句话的整条计划算一步。</div>
    {[...ed.hist].reverse().map((h, i) => <div key={i} className="row" style={{ minHeight: 44 }}><span className="row-m" style={{ fontSize: 15 }}>{h.label}</span>{i === 0 && <button className="btn-t" onClick={() => { undo(); close(); }}>撤销</button>}</div>)}
    {!ed.hist.length && <div className="row" style={{ fontSize: 15, color: 'var(--ink-2)' }}>还没有改动</div>}
  </div></Sheet>;
  return null;
}

/* ================= processing tools: compare, then save a new version ================= */
function denoised(env, k) { const o = new Float32Array(env.length); for (let i = 0; i < env.length; i++) o[i] = Math.max(0.002, env[i] - k * (env[i] < 0.1 ? 1 : 0.4)); return o; }
function sqrtEnv(env) { const o = new Float32Array(env.length); for (let i = 0; i < env.length; i++) o[i] = Math.sqrt(env[i]); return o; }
function reversed(env) { const o = new Float32Array(env.length); for (let i = 0; i < env.length; i++) o[i] = env[env.length - 1 - i]; return o; }
function ducked(mus, sp, mr, sr) { const o = new Float32Array(mus.length); for (let i = 0; i < mus.length; i++) { const t = i / mr; const j = Math.floor(t * sr); let m = 0; for (let k = Math.max(0, j - 25); k < Math.min(sp.length, j + 25); k++) m = Math.max(m, sp[k]); o[i] = mus[i] * (m > 0.2 ? 0.3 : 0.62); } return o; }
function ToolAB({ ab, setAb, tag, a = '原来的', b = '处理后' }) {
  const { player } = useContext(PhoneCtx);
  return <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
    <Seg style={{ flex: 1 }} items={[['A', a], ['B', b]]} value={ab} onChange={v => { setAb(v); if (player.on(tag)) player.play(tag, 10); }} />
    <PlayBtn on={player.on(tag)} onClick={() => player.toggle(tag, 10)} />
  </div>;
}
function ToolLane({ tag, label, env, rate, from = 0, to, h = 60, dim, regions, gain, w = 328, note, marks = [] }) {
  const { player } = useContext(PhoneCtx);
  return <div style={{ marginBottom: 10 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--ink-2)', marginBottom: 4 }}><span style={{ fontWeight: dim ? 400 : 700, color: dim ? 'var(--ink-2)' : 'var(--ink)' }}>{label}</span>{note && <span className="num">{note}</span>}</div>
    <div style={{ position: 'relative' }}><div style={{ opacity: dim ? 0.55 : 1 }}><Wave env={env} rate={rate} from={from} to={to} w={w} h={h} regions={regions} gain={gain} /></div>{marks.map((m, i) => <span key={i} style={{ position: 'absolute', left: (m.t - from) / ((to || 10) - from) * w, top: -2, transform: 'translateX(-50%)', fontSize: 12, fontWeight: 700, background: 'var(--ink)', color: 'var(--on-ink)', borderRadius: 6, padding: '1px 6px', whiteSpace: 'nowrap' }}>{m.text}</span>)}{player.on(tag) && !dim && <Playhead x={Math.min(w, player.t / 10 * w)} h={h} />}</div>
  </div>;
}
const TOOL_OUT = { separate: '存成两个版本', bgm: '存成新声音', multitrack: '存成新声音', medley: '存成新声音', loop: '存成新声音' };
function Tool({ p }) {
  const { nav, g, player } = useContext(PhoneCtx);
  const t = SJ.TOOLS.find(x => x.id === p.id) || SJ.TOOLS[0];
  const musicTool = ['chorus', 'loop', 'medley', 'separate', 'multitrack'].includes(t.id);
  const item = libItem(p.item || (musicTool ? (t.id === 'medley' ? 'dance' : 'wanfeng') : 'interview'));
  const [ab, setAb] = useState('B');
  const [saved, setSaved] = useState(!!p.saved);
  const [st, setSt] = useState({ strength: '适中', minP: 1.0, keepP: 0.3, pz: {}, lufs: '语音', speed: 1.25, pitch: true, semi: 0, preset: '大叔', fx: { 均衡: true, 压缩: true, 限制: true, 混响: false, 回声: false }, ch: '立体声', width: 0.6, bal: 0.5, swap: false, cand: 0, fit: '30 秒', vol: 0.5, duck: true, xf: 3, track: p.track || 'm1', stages: { 电流声: true, 低频轰隆: true, 咔哒声: false, 爆音修复: false, 齿音: true, 噪声门: false }, notify: false });
  const set = patch => setSt(s => ({ ...s, ...patch }));
  const chain = p.chain;
  const vname = t.id === 'separate' ? '人声、伴奏' : t.name;
  const save = () => {
    if (t.unavailable) return;
    setSaved(true);
    if (item.id === 'interview' && !g.versions.includes(vname)) nav.set(x => ({ versions: [...x.versions, vname] }));
    if (chain && chain.idx < chain.steps.length - 1) {
      const nx = chain.steps[chain.idx + 1];
      setTimeout(() => { nav.toast(`存成了新版本「${t.name}」，接着第 ${chain.idx + 2} 步`); nav.replace('tool', { id: nx.tool || 'pauses', chain: { ...chain, idx: chain.idx + 1 } }); }, 500);
    } else nav.toast(`存成了新版本「${vname}」，原来的没动`, '看版本', () => nav.go('versions', { item: item.id }));
  };
  const skip = () => { const nx = chain.steps[chain.idx + 1]; if (nx) nav.replace('tool', { id: nx.tool || 'pauses', chain: { ...chain, idx: chain.idx + 1 } }); else { nav.toast('跳过了最后一步'); nav.back(); } };
  const W = 328;
  const tag = 'tool-' + t.id;
  let hero = null, params = null;
  const sp = envSpeech();
  if (t.id === 'denoise') {
    const k = { 轻: 0.025, 适中: 0.04, 强: 0.044 }[st.strength];
    const before = useMemo(() => sqrtEnv(sp.subarray(0, 50 * 20)), []), after = useMemo(() => sqrtEnv(denoised(sp.subarray(0, 50 * 20), k)), [k]);
    const F = 8.5, Tz = 16.5;
    const floorDb = { 轻: -52, 适中: -61, 强: -66 }[st.strength];
    hero = <><ToolAB ab={ab} setAb={setAb} tag={tag} b="降噪后" />
      <ToolLane tag={tag} label="原来的" env={before} rate={50} from={F} to={Tz} h={74} dim={ab === 'B'} note="底噪 -42 dB" marks={[{ t: 12.6, text: '这层毛边是底噪' }]} />
      <ToolLane tag={tag} label="降噪后" env={after} rate={50} from={F} to={Tz} h={74} dim={ab === 'A'} note={`底噪 ${floorDb} dB`} marks={[{ t: 12.6, text: '停顿里安静了' }]} />
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 8, lineHeight: 1.4, fontFamily: 'var(--f-big)' }}>{st.strength === '强' ? '空调声没了，人声有点发闷' : '空调声小多了，说话声没变'}</div>
      <div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 2 }}>放大的是 0:08–0:16，中间有一处停顿。</div></>;
    params = <><div className="h3" style={{ marginBottom: 8 }}>降多少</div><Seg items={['轻', '适中', '强']} value={st.strength} onChange={v => set({ strength: v })} />
      <div style={{ marginTop: 16, display: 'grid', gap: 10, fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.55 }}><div><b style={{ color: 'var(--ink)' }}>处理整段 18:40</b>，约 20 秒，不联网。</div><div>只想降一段？回工作台先选一段，再来这里。</div></div></>;
  } else if (t.id === 'pauses') {
    const cuts = SJ.PAUSES.map(([s, d], k) => ({ a: s + st.keepP / 2, b: s + d - st.keepP / 2, k, d })).filter(c => c.d >= st.minP && !st.pz[c.k]);
    const saved2 = cuts.reduce((a, c) => a + c.b - c.a, 0);
    const res = useMemo(() => planResult({ s1: 0, s2: st.keepP, s3: 0, s4: 0 }, { s1: 1, s3: 1, s4: 1 }), [st.keepP]);
    hero = <><ToolAB ab={ab} setAb={setAb} tag={tag} b="删掉后" />
      <ToolLane tag={tag} label="原来的" env={sp} rate={50} from={0} to={130} h={64} dim={ab === 'B'} regions={cuts.map(c => ({ a: c.a, b: c.b, kind: 'hatch' }))} note="2:10" />
      <ToolLane tag={tag} label="删掉后" env={res.env} rate={50} from={0} to={130} w={Math.round(W * (130 - saved2) / 130)} h={64} dim={ab === 'A'} note={fmt(130 - saved2)} />
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, fontFamily: 'var(--f-big)' }}>{cuts.length} 处长停顿，省下 <span className="num">{Math.round(saved2)}</span> 秒</div></>;
    params = <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}><span style={{ flex: 1, fontSize: 16 }}>超过多久算长停顿</span><Stepper value={st.minP} unit="秒" step={0.1} min={0.5} max={3} fmtv={v => v.toFixed(1)} onChange={v => set({ minP: v })} /></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}><span style={{ flex: 1, fontSize: 16 }}>每处留下</span><Stepper value={st.keepP} unit="秒" step={0.1} min={0} max={1} fmtv={v => v.toFixed(1)} onChange={v => set({ keepP: v })} /></div>
      {SJ.PAUSES.map(([s, d], k) => d >= st.minP && <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, height: 44, borderTop: '1px solid var(--line)' }}>
        <button className={'ck' + (st.pz[k] ? '' : ' on')} onClick={() => set({ pz: { ...st.pz, [k]: !st.pz[k] } })}>{!st.pz[k] && <Ic n="check" s={16} w={2.6} />}</button>
        <span className="num" style={{ width: 54, fontSize: 15 }}>{fmt1(s)}</span><span style={{ flex: 1, fontSize: 15, color: 'var(--ink-2)' }}>停了 <span className="num">{d.toFixed(1)}</span> 秒</span>
        <button className="ib" style={{ width: 36, height: 36 }} onClick={() => player.toggle('pz' + k, d + 2)} aria-label="听这一处"><Ic n={player.on('pz' + k) ? 'pause' : 'play'} s={16} /></button></div>)}</>;
  } else if (t.id === 'loudness') {
    const target = { 语音: -16, 音乐: -14, 广播: -23 }[st.lufs];
    hero = <><ToolAB ab={ab} setAb={setAb} tag={tag} />
      <ToolLane tag={tag} label="原来的" env={sp} rate={50} from={0} to={60} h={60} dim={ab === 'B'} note="-19 LUFS" />
      <ToolLane tag={tag} label="统一后" env={sp} rate={50} from={0} to={60} h={60} gain={Math.pow(10, (target + 19) / 20)} dim={ab === 'A'} note={`${target} LUFS`} />
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, fontFamily: 'var(--f-big)' }}>{target > -19 ? `大 ${target + 19} dB，和常见${st.lufs === '语音' ? '播客' : st.lufs === '音乐' ? '音乐平台' : '广播'}一样响` : `小 ${-19 - target} dB，合广播标准`}</div></>;
    params = <><div className="h3" style={{ marginBottom: 8 }}>按什么标准</div><Seg items={[['语音', '语音 -16'], ['音乐', '音乐 -14'], ['广播', '广播 -23']]} value={st.lufs} onChange={v => set({ lufs: v })} /><div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 8 }}>峰值不超过 -1 dB，不会爆音。</div></>;
  } else if (t.id === 'repair') {
    const notes = { 电流声: '检测到 50 Hz 和倍频', 低频轰隆: '有一点风声和桌面震动', 咔哒声: '没有检测到', 爆音修复: '没有削波', 齿音: '「s」「c」偏尖', 噪声门: '停顿里压到更安静' };
    hero = <><ToolAB ab={ab} setAb={setAb} tag={tag} /><ToolLane tag={tag} label={ab === 'A' ? '原来的' : '修复后'} env={sqrtEnv(ab === 'A' ? sp.subarray(0, 1000) : denoised(sp.subarray(0, 1000), 0.02))} rate={50} from={0} to={20} h={80} /></>;
    params = Object.keys(st.stages).map(k => <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, borderTop: '1px solid var(--line)' }}><div style={{ flex: 1 }}><div style={{ fontSize: 16 }}>{k}</div><div style={{ fontSize: 14, color: 'var(--ink-3)' }}>{notes[k]}</div></div><Switch on={st.stages[k]} onClick={() => set({ stages: { ...st.stages, [k]: !st.stages[k] } })} /></div>);
  } else if (t.id === 'speed') {
    hero = <><ToolAB ab={ab} setAb={setAb} tag={tag} /><ToolLane tag={tag} label={ab === 'A' ? '原来的 18:40' : `${st.speed.toFixed(2)} 倍，${fmt(1120 / st.speed)}`} env={sp} rate={50} from={0} to={ab === 'A' ? 30 : 30 * st.speed} h={80} /></>;
    params = <><div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><b className="num" style={{ fontSize: 34 }}>{st.speed.toFixed(2)}×</b><span style={{ fontSize: 14, color: 'var(--ink-2)' }}>0.5–2 倍</span></div>
      <Slider value={st.speed} min={0.5} max={2} onChange={v => set({ speed: Math.round(v * 20) / 20 })} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}><span style={{ flex: 1, fontSize: 16 }}>音高不变</span><Switch on={st.pitch} onClick={() => set({ pitch: !st.pitch })} /></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}><span style={{ flex: 1, fontSize: 16 }}>单独升降调</span><Stepper value={st.semi} unit="半音" step={1} min={-12} max={12} onChange={v => set({ semi: v })} /></div></>;
  } else if (t.id === 'voice') {
    hero = <><ToolAB ab={ab} setAb={setAb} tag={tag} b={st.preset} /><ToolLane tag={tag} label={ab === 'A' ? '原来的' : st.preset} env={sp} rate={50} from={0} to={20} h={80} gain={ab === 'B' ? 0.85 : 1} /></>;
    params = <><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>{['大叔', '萝莉', '机器人', '电话音', '怪兽', '山谷回声'].map(x => <button key={x} className={'chip' + (st.preset === x ? ' on' : '')} style={{ justifyContent: 'center', height: 48, fontSize: 16 }} onClick={() => set({ preset: x })}>{x}</button>)}</div>
      <div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 10, lineHeight: 1.6 }}>变声是升降调加效果，没有做共振峰校正，有的声音会有点不自然。</div></>;
  } else if (t.id === 'effects') {
    hero = <><ToolAB ab={ab} setAb={setAb} tag={tag} /><ToolLane tag={tag} label={ab === 'A' ? '原来的' : '加了效果'} env={sp} rate={50} from={0} to={20} h={80} /></>;
    params = <><div style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 6 }}>从上到下依次处理，拖动换顺序</div>
      {Object.keys(st.fx).map((k, i) => <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 54, borderTop: '1px solid var(--line)' }}><Ic n="grip" s={20} /><div style={{ flex: 1 }}><div style={{ fontSize: 16 }}>{k}</div><div style={{ fontSize: 14, color: 'var(--ink-3)' }}>{['4 kHz 以上 +3 dB', '3:1，起控 -18 dB', '上限 -1 dB', '小房间，20%', '0.3 秒，2 次'][i]}</div></div><Switch on={st.fx[k]} onClick={() => set({ fx: { ...st.fx, [k]: !st.fx[k] } })} /></div>)}
      <button className="btn btn-s" style={{ marginTop: 10 }} onClick={() => nav.toast('存成预设「播客人声」')}>存成预设</button></>;
  } else if (t.id === 'channels') {
    hero = <><ToolAB ab={ab} setAb={setAb} tag={tag} /><ToolLane tag={tag} label="左" env={sp} rate={50} from={0} to={20} h={44} gain={st.swap ? 0.7 : 1} /><ToolLane tag={tag} label="右" env={sp} rate={50} from={0.4} to={20.4} h={44} gain={st.swap ? 1 : 0.7} /></>;
    params = <><Seg items={['单声道', '立体声']} value={st.ch} onChange={v => set({ ch: v })} />
      <div style={{ marginTop: 14 }} className="lbl">宽度</div><Slider value={st.width} onChange={v => set({ width: v })} />
      <div style={{ marginTop: 8 }} className="lbl">左右平衡</div><Slider value={st.bal} onChange={v => set({ bal: v })} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}><span style={{ flex: 1, fontSize: 16 }}>左右交换</span><Switch on={st.swap} onClick={() => set({ swap: !st.swap })} /></div></>;
  } else if (t.id === 'reverse') {
    hero = <><ToolAB ab={ab} setAb={setAb} tag={tag} b="倒放" /><ToolLane tag={tag} label={ab === 'A' ? '原来的' : '倒放'} env={ab === 'A' ? sp : reversed(sp)} rate={50} from={0} to={130} h={90} /></>;
    params = <div style={{ fontSize: 15, color: 'var(--ink-2)' }}>从最后一秒倒着放到第一秒，没有参数。</div>;
  } else if (t.id === 'separate') {
    const mu = envMusic();
    hero = <><ToolLane tag={tag} label="原来的「晚风」" env={mu} rate={20} from={0} to={232} h={52} />
      <ToolLane tag={tag} label="人声" env={mu.map((v, i) => v * (SJ.SECTIONS.find(s => i / 20 >= s.from && i / 20 < s.to) || { level: 0.3 }).level * 0.9)} rate={20} from={0} to={232} h={52} />
      <ToolLane tag={tag} label="伴奏" env={mu.map(v => v * 0.6)} rate={20} from={0} to={232} h={52} /></>;
    params = <div style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.6 }}>拆成两个版本：「人声」和「伴奏」，原来的不动。伴奏可以拿去翻唱。</div>;
  } else if (t.id === 'chorus') {
    const mu = envMusic();
    hero = <><Wave env={mu} rate={20} from={0} to={232} w={W} h={80} regions={SJ.CHORUS.map((c, i) => ({ a: c.from, b: c.to, kind: i === st.cand ? 'sel' : 'hatch' }))} />
      <div style={{ position: 'relative', height: 18, marginTop: 4 }}>{SJ.SECTIONS.filter(s => s.name === '副歌').map((s, i) => <span key={i} style={{ position: 'absolute', left: (s.from + s.to) / 2 / 232 * W, transform: 'translateX(-50%)', fontSize: 12, color: 'var(--ink-3)' }}>副歌</span>)}</div></>;
    params = <>{SJ.CHORUS.map((c, i) => <div key={i} role="button" className="row" style={{ paddingLeft: 0, paddingRight: 0, cursor: 'pointer' }} onClick={() => set({ cand: i })}><span className={'radio' + (st.cand === i ? ' on' : '')} /><span className="row-m"><span className="num" style={{ fontSize: 16 }}>{fmt(c.from)}–{fmt(c.to)}</span><span className="row-d">　重复程度 {c.score}</span></span><PlayBtn fill={false} size={36} on={player.on('ch' + i)} onClick={e => { e.stopPropagation(); player.toggle('ch' + i, 30); }} /></div>)}
      <div style={{ marginTop: 10 }}><Seg items={['20 秒', '30 秒', '整段']} value={st.fit} onChange={v => set({ fit: v })} /></div>
      <div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 8 }}>裁成铃声长度时从副歌开头算起，结尾在拍子上。</div></>;
  } else if (t.id === 'bgm') {
    const tr = SJ.MUSIC.tracks.find(x => x.id === st.track) || SJ.MUSIC.tracks[0];
    const mu = useMemo(() => ducked(envMusic().subarray(0, 20 * 60), sp, 20, 50), []);
    hero = <><ToolLane tag={tag} label="人声：播客第 12 期" env={sp} rate={50} from={0} to={60} h={50} />
      <ToolLane tag={tag} label={`音乐：${tr.title}`} env={st.duck ? mu : envMusic()} rate={20} from={0} to={60} h={50} gain={1 + st.vol} /></>;
    params = <><button className="row" style={{ paddingLeft: 0, paddingRight: 0 }} onClick={() => nav.go('music', { pick: true })}><Cover t={tr} s={44} r={10} /><span className="row-m"><span className="row-t">{tr.title}</span><span className="row-d">{tr.cat}，{fmt(tr.seconds)}，循环到人声结束</span></span><span className="btn-t">换一首</span></button>
      <div className="lbl" style={{ marginTop: 10 }}>音乐音量</div><Slider value={st.vol} onChange={v => set({ vol: v })} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}><div style={{ flex: 1 }}><div style={{ fontSize: 16 }}>说话时音乐让开</div><div className="lbl">人声一出来，音乐自动小下去</div></div><Switch on={st.duck} onClick={() => set({ duck: !st.duck })} /></div>
      {tr.credit && <div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 10 }}>这首要署名，会自动记在新声音里，导出时写进文件备注。</div>}</>;
  } else if (t.id === 'multitrack') {
    hero = <>{[['人声', sp, 50, 0], ['音乐：午后的拿铁', envMusic(), 20, 0], ['音效：开场 5 秒', SJ.musicEnvelope({ seconds: 6, seed: 4 }), 20, 0]].map(([l, e, r], i) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ flex: 1 }}><ToolLane tag={tag} label={l} env={e} rate={r} from={0} to={i === 2 ? 30 : 60} h={40} w={260} /></div><Stepper value={[0, -8, -3][i]} unit="dB" step={1} min={-24} max={6} onChange={() => {}} /></div>)}</>;
    params = <div style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.6 }}>每一轨能拖动位置、调音量。存成新声音后，三轨都留着，可以回头再调。</div>;
  } else if (t.id === 'medley') {
    hero = <ToolLane tag={tag} label="广场舞串烧，6 首" env={SJ.musicEnvelope({ seconds: 300, seed: 12 })} rate={20} from={0} to={300} h={70} regions={[60, 115, 170, 228, 266].map(x => ({ a: x - st.xf / 2, b: x + st.xf / 2, kind: 'sel' }))} />;
    params = <>{p.readjust && <div style={{ background: 'var(--surface-2)', borderRadius: 14, padding: '10px 12px', fontSize: 14, marginBottom: 10 }}>这是之前做的串烧，配方还在：改完存成新版本，之前那版不动。</div>}
      {['舞曲 03 恰恰', '舞曲 04 慢四', '最炫的那首', '月光下', '走四方', '收尾慢歌'].map((x, i) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, height: 46, borderTop: '1px solid var(--line)' }}><Ic n="grip" s={20} /><span className="num mute" style={{ width: 16 }}>{i + 1}</span><span style={{ flex: 1, fontSize: 16 }}>{x}</span></div>)}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}><span style={{ flex: 1, fontSize: 16 }}>接缝过渡</span><Stepper value={st.xf} unit="秒" step={1} min={0} max={8} onChange={v => set({ xf: v })} /></div></>;
  } else if (t.id === 'loop') {
    hero = <><ToolLane tag={tag} label="60 秒循环，拼 3 遍试听" env={(() => { const m = envMusic(), o = new Float32Array(20 * 180); for (let i = 0; i < o.length; i++) o[i] = m[(i % 1200) + 1240]; return o; })()} rate={20} from={0} to={180} h={70} regions={[60, 120].map(x => ({ a: x, b: x, kind: 'edge', c: THEME.light.ink }))} /><div style={{ fontSize: 14, color: 'var(--ink-2)' }}>竖线是首尾接上的地方，听不出接缝。</div></>;
    params = <div style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.6 }}>从「晚风」里挑了 1:02–2:02，起止都在拍子上，适合做年会、直播的背景。</div>;
  } else if (t.id === 'stt') {
    hero = <div style={{ background: 'var(--surface)', borderRadius: 20, padding: '20px 18px' }}><div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--f-big)' }}>音频转文字，即将开放</div>
      <div style={{ fontSize: 15, color: 'var(--ink-2)', marginTop: 8, lineHeight: 1.7 }}>转文字的服务还没接通。现在点了也不会假装转出一份文字稿。</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}><span style={{ flex: 1, fontSize: 16 }}>开放时提醒我</span><Switch on={st.notify} onClick={() => set({ notify: !st.notify })} /></div></div>;
  }
  return <div className="scr enter">
    <Top title={t.name} sub={<Dot s={item.title} />} />
    {chain && <div style={{ margin: '0 12px 8px', background: 'var(--surface)', borderRadius: 18, padding: '10px 14px' }}>
      <div style={{ fontSize: 14, color: 'var(--ink-3)' }}>一句话的第 {chain.idx + 1} 步，共 {chain.steps.length} 步</div>
      <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.6 }}>{chain.steps.map((s, i) => <span key={i} style={{ opacity: i === chain.idx ? 1 : 0.45, marginRight: 6 }}><Hl i={s.color}>{s.ph}</Hl></span>)}</div>
      <div style={{ display: 'flex', gap: 4, marginLeft: -10 }}><button className="btn-t" style={{ height: 34 }} onClick={skip}>跳过这步</button><button className="btn-t" style={{ height: 34 }} onClick={() => nav.toast('已把这句存成配方「' + chain.text + '」')}>存成配方</button></div>
    </div>}
    <div className="scroll"><div className="pad" style={{ paddingTop: 4 }}>
      {saved && <div style={{ background: 'var(--ink)', color: 'var(--on-ink)', borderRadius: 16, padding: '12px 14px', marginBottom: 12, fontSize: 15, display: 'flex', alignItems: 'center', gap: 10 }}><Ic n="check" s={20} w={2.4} /><span style={{ flex: 1 }}>存成了新版本「{vname}」，原来的没动</span><button style={{ fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3 }} onClick={() => nav.go('versions', { item: item.id })}>看版本</button></div>}
      {hero}
      <div style={{ marginTop: 16 }}>{params}</div>
      <div style={{ height: 12 }} />
    </div></div>
    {!t.unavailable && <div className="bot">
      <button data-anchor="tool-save" className="btn btn-p wide" onClick={save}>{saved ? '再存一个版本' : TOOL_OUT[t.id] || '存成新版本'}</button>
      <div style={{ fontSize: 14, color: 'var(--ink-3)', textAlign: 'center', marginTop: 6 }}>原来的不动{t.result === 'version' ? `，新版本叫「${vname}」` : t.result === 'two versions' ? '，多出两个版本' : '，做出一段新的声音'}</div>
    </div>}
  </div>;
}

Object.assign(window, { Editor, EditorPanel, Sheet, Tool, cutRange, splitAt, insertAt, piecesOf, buildEnv });
