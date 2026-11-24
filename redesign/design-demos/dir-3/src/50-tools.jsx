/* ===== Processing tools: before/after drawn on the same spine (left half = before, right half = after) ===== */
const softLim = a => (a < 0.8 ? a : 0.8 + (1 - Math.exp(-(a - 0.8) * 4)) * 0.18);
const TOOLDEF = {
  denoise: { diff: true, mark: '琥珀色的毛刺是空调声，会去掉', L: '原来', R: '降噪后', params: [{ k: 'str', l: '降多少', type: 'seg', opts: ['轻一点', '适中', '强'], def: 1 }, { k: 'room', l: '留一点环境感', type: 'switch', def: false }],
    xf: st => a => (a < 0.11 ? a * [0.45, 0.14, 0.04][st.str] * (st.room ? 1.8 : 1) : a * (st.str === 2 ? 0.93 : 1)),
    note: st => ['空调声小了一半，说话不受影响', '空调、风扇声基本听不到了', '几乎全静，说话声会有一点发闷'][st.str] },
  loudness: { L: '原来', R: '统一后', params: [{ k: 't', l: '用在哪', type: 'seg', opts: ['语音 -16', '音乐 -14', '广播 -23'], def: 0 }],
    xf: st => a => softLim(a * [1.42, 1.62, 0.8][st.t]), note: st => ['短视频和播客常用的响度，会比现在大 3 dB', '音乐平台常用的响度', '电台和电视的标准，会小一点'][st.t] },
  repair: { diff: true, mark: '琥珀色是电流声，会去掉', L: '原来', R: '修复后', params: [{ k: 'st', l: '修哪些', type: 'checks', opts: ['电流声', '低频轰隆', '咔哒声', '爆音', '齿音', '噪声门'], def: [0, 1, 5] }],
    xf: st => a => (st.st.includes(5) && a < 0.1 ? a * 0.08 : st.st.includes(0) && a < 0.12 ? a * 0.5 : a), note: st => '检测到 50 Hz 电流声和它的倍频；会一并去掉选中的 ' + st.st.length + ' 种' },
  speed: { L: '原来', R: '变速后', params: [{ k: 'rate', l: '速度', type: 'slider', min: 0.5, max: 2, step: 0.05, def: 1.25, fmt: v => v + ' 倍' }, { k: 'keep', l: '保持音高', type: 'switch', def: true }, { k: 'semi', l: '升降调', type: 'step', min: -12, max: 12, def: 0, unit: '个半音' }],
    stretch: st => st.rate, note: st => '18:40 变成 ' + fmtT(1120 / st.rate) + (st.keep ? '，声音不变尖也不变粗' : '，音高会跟着变') },
  voice: { L: '原来', R: '变声后', params: [{ k: 'pre', l: '变成', type: 'grid', opts: ['大叔', '萝莉', '机器人', '电话音', '怪兽', '山谷回声'], def: 0 }],
    xf: st => a => [a * 1.05, a * 0.85, Math.round(a * 6) / 6, Math.min(a, 0.55), a * 1.15, a * 0.9][st.pre], note: st => ['音调降 4 个半音，声音更厚', '音调升 5 个半音', '加了金属感和量化', '只留中间的频率，像打电话', '降 8 个半音，加一点失真', '加了长回声'][st.pre] + '。没有做共振峰校正，个别字听着会不太自然' },
  effects: { L: '原来', R: '加效果后', params: [{ k: 'ch', l: '效果顺序（拖动换顺序）', type: 'chain', opts: ['均衡：提高高频', '压缩', '限制', '混响：小房间', '回声'], def: [0, 1, 2] }],
    xf: st => a => softLim(a * (st.ch.includes(1) ? 1.25 : 1)), note: st => st.ch.length + ' 个效果，按这个顺序处理；可以存成预设下次直接用' },
  channels: { L: '左声道', R: '右声道', params: [{ k: 'm', l: '输出', type: 'seg', opts: ['单声道', '立体声'], def: 1 }, { k: 'bal', l: '左右平衡', type: 'slider', min: -1, max: 1, step: 0.1, def: 0, fmt: v => (v === 0 ? '居中' : v < 0 ? '偏左 ' + Math.round(-v * 100) + '%' : '偏右 ' + Math.round(v * 100) + '%') }, { k: 'sw', l: '左右交换', type: 'switch', def: false }],
    xfL: st => a => a * (st.bal > 0 ? 1 - st.bal : 1), xf: st => a => a * (st.bal < 0 ? 1 + st.bal : 1), note: st => (st.m === 0 ? '两边合成一路，文件小一半' : '左右分开；这段是单声道录音，两边一样') },
  reverse: { L: '原来', R: '倒放', params: [], rev: true, note: () => '最后一秒放在最前面，从下往上倒着放' },
  separate: { L: '伴奏', R: '人声', params: [{ k: 'q', l: '分得多细', type: 'seg', opts: ['快', '细'], def: 1 }], music: true, xfL: st => a => a * 0.82, xf: st => a => (a > 0.6 ? a * 0.7 : a * 0.25), note: () => '拆成两个新版本：「人声」和「伴奏」，原曲不动' },
};
function ToolPage({ ph, p, dir }) {
  const tool = p.tool;
  if (tool === 'chorus') return <Redirect ph={ph} to={['editor', { id: 'wanfeng', panel: 'chorus' }]} />;
  if (tool === 'bgm') return <Redirect ph={ph} to={['editor', { id: 'interview' }]} msg="在工作台底下点「配乐」，音乐是右边第二条脊线" />;
  if (tool === 'pauses') return <PausesTool ph={ph} p={p} dir={dir} />;
  if (tool === 'multitrack' || tool === 'medley' || tool === 'loop') return <StackTool ph={ph} p={p} dir={dir} />;
  if (tool === 'stt') return <SttPage ph={ph} dir={dir} />;
  return <MirrorTool ph={ph} p={p} dir={dir} />;
}
SCREENS.tool = ToolPage;
function Redirect({ ph, to, msg }) { useEffect(() => { ph.nav.replace(to[0], to[1]); if (msg) ph.toast(msg); }, []); return <div className="scr" />; }
const toolName = id => (SJ.TOOLS.find(t => t.id === id) || { name: id }).name;
function curEd(ph, id, src) { const h = ph.store['ed:' + id]; return h ? h.cur : newEd(src, id); }
function ChainBanner({ p, ph, onSkip }) {
  if (!p.chain) return null;
  return <div style={{ margin: '0 12px 6px', padding: '10px 12px 10px 14px', borderRadius: 16, background: 'var(--s1)', display: 'flex', alignItems: 'center', gap: 10 }}>
    <div style={{ flex: 1, minWidth: 0 }}><b style={{ fontSize: 14 }}>第 {p.step + 1} 步，共 {p.chain.length} 步</b><span className="note" style={{ display: 'block' }}>{p.chain.map(c => CHAIN_NAMES[c] || toolName(c)).join('，然后')}</span></div>
    <Btn sm line onClick={onSkip}>跳过这步</Btn></div>;
}
function nextInChain(ph, p) {
  if (p.chain && p.step + 1 < p.chain.length) { ph.nav.replace('tool', { ...p, tool: p.chain[p.step + 1], step: p.step + 1 }); return true; }
  return false;
}
function ParamUI({ d, st, set }) {
  const v = st[d.k];
  if (d.type === 'seg') return <div className="pad" style={{ marginTop: 8 }}><div className="kv" style={{ paddingTop: 2 }}>{d.l}</div><Seg value={v} options={d.opts} onChange={x => set(d.k, x)} /></div>;
  if (d.type === 'switch') return <div className="pad"><div className="kv">{d.l}<Switch on={v} onChange={x => set(d.k, x)} /></div></div>;
  if (d.type === 'slider') return <div className="pad" style={{ marginTop: 4 }}><div className="kv" style={{ paddingBottom: 0 }}>{d.l}<span className="num" style={{ color: 'var(--t1)', fontWeight: 600 }}>{d.fmt ? d.fmt(v) : v}</span></div><Slider value={v} min={d.min} max={d.max} step={d.step} onChange={x => set(d.k, x)} /></div>;
  if (d.type === 'step') return <div className="pad"><div className="kv">{d.l}<span className="val" style={{ height: 34 }}><button style={{ width: 34, height: 34 }} onClick={() => set(d.k, clamp(v - 1, d.min, d.max))}>−</button><i style={{ minWidth: 86 }}>{v > 0 ? '+' : ''}{v} {d.unit}</i><button style={{ width: 34, height: 34 }} onClick={() => set(d.k, clamp(v + 1, d.min, d.max))}>+</button></span></div></div>;
  if (d.type === 'checks' || d.type === 'grid') return <div className="pad" style={{ marginTop: 8 }}><div className="kv" style={{ paddingTop: 2 }}>{d.l}</div><div className="wrapchips">{d.opts.map((o, i) => { const on = d.type === 'grid' ? v === i : v.includes(i); return <button key={o} className={cx('chip', on && 'on')} onClick={() => set(d.k, d.type === 'grid' ? i : on ? v.filter(x => x !== i) : [...v, i])}>{o}</button>; })}</div></div>;
  if (d.type === 'chain') return <div className="pad" style={{ marginTop: 8 }}><div className="kv" style={{ paddingTop: 2 }}>{d.l}<button className="t2" style={{ fontSize: 13 }}>存成预设</button></div>
    {d.opts.map((o, i) => { const k = v.indexOf(i); return <div key={o} className="kv" style={{ padding: '6px 0', borderTop: '1px solid var(--line)' }}><span style={{ color: k >= 0 ? 'var(--t1)' : 'var(--t3)', fontSize: 14.5, display: 'flex', gap: 10, alignItems: 'center' }}><Icon n="move" s={16} />{k >= 0 ? k + 1 + '. ' : ''}{o}</span><Switch on={k >= 0} onChange={x => set(d.k, x ? [...v, i] : v.filter(y => y !== i))} /></div>; })}</div>;
  return null;
}
function MirrorTool({ ph, p, dir }) {
  const D = TOOLDEF[p.tool] || TOOLDEF.denoise;
  const id = D.music ? 'wanfeng' : p.id || 'interview';
  const src = id === 'wanfeng' ? MUSIC : SPEECH;
  const ed = curEd(ph, id, src);
  const lay = useMemo(() => layout(src, ed), [ed]);
  const smp = useMemo(() => makeSampler(src, ed), [ed]);
  const [st, setSt] = useState(() => Object.fromEntries(D.params.map(q => [q.k, q.def])));
  const [ab, setAb] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [phase, setPhase] = useState('setup');
  const [pct, setPct] = useState(0);
  const set = (k, v) => setSt(s => ({ ...s, [k]: v }));
  const api = useRef();
  const music = src.kind === 'music';
  const cols = useMemo(() => {
    const L = D.xfL ? (a, b) => D.xfL(st)(smp.amp(a, b)) : smp.amp;
    let R = D.xf ? (a, b) => D.xf(st)(smp.amp(a, b)) : smp.amp;
    if (D.rev) R = (a, b) => smp.amp(lay.dur - b, lay.dur - a);
    const m = { L, R, diff: !!D.diff }; if (D.stretch) { m.rScale = D.stretch(st); m.rEnd = lay.dur; }
    return [{ x: 180, capW: 156, lay, amp: smp.amp, kind: src.kind, mirror: m }];
  }, [st, lay]);
  const ver = JSON.stringify(st);
  useEffect(() => {
    if (!playing) return; let raf, last = performance.now(), r = api.current.getR();
    const f = t => { r += (t - last) / 1000; last = t; api.current.setR(r); raf = requestAnimationFrame(f); };
    raf = requestAnimationFrame(f); return () => cancelAnimationFrame(raf);
  }, [playing]);
  const save = () => {
    setPhase('proc'); setPct(0); let k = 0;
    const i = setInterval(() => { k += 7; setPct(Math.min(100, k)); if (k >= 100) { clearInterval(i); setPhase('saved'); } }, 90);
  };
  const vname = p.tool === 'separate' ? '「人声」和「伴奏」两个版本' : '「' + toolName(p.tool) + '」';
  const panelH = 300;
  return <div className={cx('scr', dir)}>
    <Hdr title={toolName(p.tool)} sub={(id === 'wanfeng' ? '晚风（钢琴版）' : '播客第 12 期') + (p.range ? '，只处理选中的 ' + sec1(p.range[1] - p.range[0]) + ' 秒' : '，处理完存成新版本')} onBack={ph.nav.pop}
      right={<button className="ib" onClick={() => ph.openSheet('toolpick', { id })} aria-label="换个工具"><Icon n="grid" s={20} /></button>} />
    <ChainBanner p={p} ph={ph} onSkip={() => { if (!nextInChain(ph, p)) { ph.nav.pop(); ph.toast('这步跳过了，一句话的工具都走完了'); } }} />
    <div style={{ display: 'flex', height: 26, alignItems: 'center', fontSize: 13, flex: 'none', position: 'relative' }}>
      <span style={{ position: 'absolute', right: 360 - 172, color: 'var(--t2)' }}>{D.L}</span>
      <span style={{ position: 'absolute', left: 188, color: 'var(--glow)', fontWeight: 600 }}>{D.R}</span></div>
    <SpineView height={SCR_H - HDR_H - 26 - panelH - (p.chain ? 66 : 0)} dur={lay.dur} pps={music ? 2.6 : 14} cols={cols} ver={ver} initR={music ? 60 : 7.5} apiRef={api} zoomCtl={false} onZoom={() => { }}
      readoutExtra={'在听：' + (ab ? D.R : D.L)} onTap={() => setPlaying(false)} phFrac={0.42}
      overlay={({ Y }) => <Fragment>{p.range && <div className="selb" style={{ top: Y(p.range[0]), height: Y(p.range[1]) - Y(p.range[0]), left: 54 }} />}
        {D.mark && !music && <div className="lbl" style={{ left: 268, top: Y(1.6), whiteSpace: 'normal', width: 84, lineHeight: 1.45, color: 'var(--warm)', fontSize: 12.5 }}>{D.mark}</div>}
        {D.mark && !music && <div className="lead-l" style={{ left: 196, width: 66, top: Y(1.6), background: 'repeating-linear-gradient(90deg, rgba(255,182,72,.7) 0 2px, transparent 2px 5px)' }} />}</Fragment>} />
    <div className="panel" style={{ height: panelH, animation: 'none' }}>
      {phase === 'setup' && <Fragment>
        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', paddingTop: 6 }}>
          {D.params.map(d => <ParamUI key={d.k} d={d} st={st} set={set} />)}
          <p className="note pad" style={{ marginTop: 8 }}>{D.note(st)}</p>
        </div>
        <div className="foot">
          <button className="playb" style={{ width: 44, height: 44 }} onClick={() => setPlaying(x => !x)} aria-label="试听"><Icon n={playing ? 'pause' : 'play'} s={20} /></button>
          <Seg value={ab} options={[{ v: 0, l: '听' + D.L }, { v: 1, l: '听' + D.R }]} onChange={setAb} style={{ flex: 1 }} />
        </div>
        <div className="pad" style={{ paddingBottom: 12 }}><Btn k="pri" full onClick={save}>{p.chain && p.step + 1 < p.chain.length ? '存好，下一步：' + (CHAIN_NAMES[p.chain[p.step + 1]] || toolName(p.chain[p.step + 1])) : '存成新版本'}</Btn></div>
      </Fragment>}
      {phase === 'proc' && <div className="pad" style={{ paddingTop: 30 }}><b style={{ fontSize: 17 }}>正在处理 {fmtT(lay.dur)} 的音频</b><div className="bar" style={{ height: 6, marginTop: 14 }}><i style={{ width: pct + '%' }} /></div>
        <p className="note" style={{ marginTop: 10 }}>{pct}%　可以先去做别的，做完会通知你。原音频不动。</p></div>}
      {phase === 'saved' && <div className="pad" style={{ paddingTop: 22 }}>
        <span className="gl" style={{ fontSize: 14 }}>存好了</span>
        <p style={{ fontSize: 20, fontWeight: 600, marginTop: 4, lineHeight: 1.4 }}>{vname}是新版本，原来的还在</p>
        <p className="note" style={{ marginTop: 6 }}>新版本沿用原来的名字；在版本里随时换回去。</p>
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>{p.chain && p.step + 1 < p.chain.length
          ? <Btn k="pri" full onClick={() => nextInChain(ph, p)}>下一步：{CHAIN_NAMES[p.chain[p.step + 1]] || toolName(p.chain[p.step + 1])}</Btn>
          : <Fragment><Btn line onClick={() => ph.nav.pop()}>回工作台</Btn><Btn k="pri" style={{ flex: 1 }} onClick={() => ph.nav.replace('versions', { id, fresh: p.tool })}>看所有版本</Btn></Fragment>}</div>
      </div>}
    </div>
  </div>;
}
function ToolPickSheet({ ph, p, onClose }) {
  return <Sheet title="换个工具" onClose={onClose}>
    {SJ.TOOLS.map(t => <button key={t.id} className="li" style={{ minHeight: 54 }} onClick={() => { onClose(); ph.nav.replace('tool', { tool: t.id, id: p.id }); }}><div className="lt"><b>{t.name}{t.unavailable && <span className="tag" style={{ marginLeft: 8 }}>即将开放</span>}</b><span>{t.desc}</span></div></button>)}
  </Sheet>;
}
SHEETS.toolpick = ToolPickSheet;

/* 删掉停顿: the gaps on the spine, each one can be kept */
function PausesTool({ ph, p, dir }) {
  const ed = curEd(ph, 'interview', SPEECH);
  const [keep, setKeep] = useState(0.3);
  const [min, setMin] = useState(1);
  const [off, setOff] = useState({});
  const [after, setAfter] = useState(false);
  const [phase, setPhase] = useState('setup');
  const cands = SPEECH.pauses.filter(q => q.d >= min && srcToRes(ed, (q.s + q.e) / 2) != null);
  const chosen = cands.filter(q => !off[q.id]);
  const res = useMemo(() => { let n = ed; for (const q of chosen) n = closePause(n, q.id, keep); return n; }, [ed, keep, min, off]);
  const view = after ? res : ed;
  const lay = useMemo(() => layout(SPEECH, view), [view]);
  const smp = useMemo(() => makeSampler(SPEECH, view), [view]);
  const cols = [{ x: 140, capW: 116, lay, amp: smp.amp, kind: 'speech' }];
  const saved = edDur(ed) - edDur(res);
  const api = useRef();
  return <div className={cx('scr', dir)}>
    <Hdr title="删掉停顿" sub="播客第 12 期，处理完存成新版本" onBack={ph.nav.pop} />
    <ChainBanner p={p} ph={ph} onSkip={() => { if (!nextInChain(ph, p)) ph.nav.pop(); }} />
    <SpineView height={SCR_H - HDR_H - 268 - (p.chain ? 66 : 0)} dur={lay.dur} pps={9} cols={cols} ver={[after, keep, min, JSON.stringify(off)].join('|')} initR={10} apiRef={api} zoomCtl onZoom={() => { }}
      onTap={(r, x) => { const it = lay.items.find(q => q.k === 'pause' && r >= q.r0 - 0.4 && r <= q.r1 + 0.4); if (it && !after) setOff(o => ({ ...o, [it.id]: !o[it.id] })); }}
      overlay={({ Y }) => <Fragment>{lay.items.filter(it => it.k === 'pause' || it.k === 'closed').map(it => {
        const q = it.ref, on = cands.includes(q) && !off[q.id], yc = Y((it.r0 + it.r1) / 2);
        return <Fragment key={it.id}>
          {it.k === 'pause' && on && <div className="pband" style={{ top: Y(it.r0), height: Y(it.r1) - Y(it.r0), background: 'rgba(255,182,72,.14)' }} />}
          <div className="lbl" style={{ left: 214, top: yc, display: 'flex', alignItems: 'center', gap: 8, color: it.k === 'closed' ? 'var(--t3)' : on ? 'var(--t1)' : 'var(--t3)' }}>
            {it.k === 'pause' && <span className={cx('ck', on && 'on')} style={{ width: 20, height: 20 }}>{on && <Icon n="check" s={13} w={2.6} />}</span>}
            {it.k === 'closed' ? '合上了　省 ' + sec1(it.saved) + ' 秒' : '停顿 ' + sec1(q.d) + ' 秒'}{it.k === 'pause' && !on && cands.includes(q) && <small className="t3" style={{ fontSize: 12 }}>留着</small>}</div></Fragment>;
      })}</Fragment>} />
    <div className="panel" style={{ height: 268, animation: 'none' }}>
      <div className="pad" style={{ paddingTop: 10 }}>
        <div className="kv" style={{ paddingTop: 0 }}>多长算长停顿<Seg value={min} options={[{ v: 1, l: '1 秒' }, { v: 1.5, l: '1.5 秒' }, { v: 2, l: '2 秒' }]} onChange={setMin} style={{ width: 196 }} /></div>
        <div className="kv">每处留多少<Seg value={keep} options={[{ v: 0.1, l: '0.1' }, { v: 0.3, l: '0.3 秒' }, { v: 0.5, l: '0.5' }]} onChange={setKeep} style={{ width: 196 }} /></div>
        <div className="kv">看合上后的样子<Switch on={after} onChange={setAfter} /></div>
        <p className="note">找到 {cands.length} 处，合上 {chosen.length} 处，省下 {sec1(saved)} 秒。点空档旁的勾，那处就留着。</p>
      </div>
      <div className="pad" style={{ paddingTop: 10 }}>{phase === 'saved' ? <div style={{ display: 'flex', gap: 10 }}><Btn line onClick={() => ph.nav.pop()}>回工作台</Btn><Btn k="pri" style={{ flex: 1 }} onClick={() => (p.chain && nextInChain(ph, p)) || ph.nav.replace('versions', { id: 'interview', fresh: 'pauses' })}>{p.chain && p.step + 1 < p.chain.length ? '下一步' : '看所有版本'}</Btn></div>
        : <Btn k="pri" full disabled={!chosen.length} onClick={() => { setPhase('saved'); ph.toast('存好了：「删掉停顿」是新版本，' + fmtT(edDur(res)) + '，原来的还在'); }}>合上 {chosen.length} 处，存成新版本</Btn>}</div>
    </div>
  </div>;
}

/* multitrack / medley / loop: several spines */
function StackTool({ ph, p, dir }) {
  const t = p.tool;
  const [vols, setVols] = useState([0, -12, -4]);
  const [xf, setXf] = useState(3);
  const api = useRef();
  let cols, dur, pps, overlay, controls, title = toolName(t);
  if (t === 'multitrack') {
    dur = 130; pps = 4;
    const names = ['播客人声', '晚风（钢琴版）', '开场 5 秒'];
    const S2 = shortEnv('open5', 6);
    cols = [
      { x: 112, capW: 70, lay: { dur: 130, items: [] }, amp: (a, b) => envSampler(SPEECH)(a, b) * dbLin(vols[0]), kind: 'bgm' },
      { x: 206, capW: 64, lay: { dur: 130, items: [] }, amp: (a, b) => envSampler(MUSIC, { off: 20 })(a, b) * dbLin(vols[1] + 6), kind: 'bgm' },
      { x: 296, capW: 56, lay: { dur: 6, items: [] }, amp: (a, b) => envSampler(S2)(a, b) * dbLin(vols[2]), kind: 'bgm' },
    ];
    overlay = ({ Y }) => <Fragment>{names.map((n, i) => <div key={n} className="lbl" style={{ left: [112, 206, 296][i], top: Y(0) - 22, transform: 'translateX(-50%)', fontSize: 12.5 }}>{n}</div>)}</Fragment>;
    controls = <div style={{ paddingTop: 4 }}>{names.map((n, i) => <div key={n} className="pad" style={{ display: 'grid', gridTemplateColumns: '92px 1fr 52px', alignItems: 'center', gap: 10 }}><span style={{ fontSize: 14 }}>{n}</span><Slider value={vols[i]} min={-24} max={6} step={1} onChange={v => setVols(a => a.map((x, j) => (j === i ? v : x)))} /><span className="num t2" style={{ fontSize: 13, textAlign: 'right' }}>{vols[i]} dB</span></div>)}
      <p className="note pad">每条竖线是一轨；长按一条可以上下拖，改它从哪一秒开始。</p></div>;
  } else if (t === 'medley') {
    const songs = ['最炫民族风（伴奏）', '小苹果（伴奏）', '火火的姑娘', '荷塘月色', '套马杆', '万疆'].map((n, i) => ({ n, d: [228, 214, 236, 252, 220, 235][i] }));
    let acc = 0; const items = songs.map((s, i) => { const it = { k: 'sec', id: 's' + i, r0: acc, r1: acc + s.d, ref: { level: 0.55 + 0.4 * ((i * 37) % 10) / 10, name: s.n } }; acc += s.d - xf; return it; });
    dur = acc + xf; pps = 0.4;
    cols = [{ x: 150, capW: 120, lay: { dur, items }, amp: (a, b) => envSampler(MUSIC, { loop: true })(a, b), kind: 'music' }];
    overlay = ({ Y }) => <Fragment>{items.map((it, i) => <Fragment key={it.id}><div className="lbl" style={{ left: 222, top: Y((it.r0 + it.r1) / 2) }}>{i + 1}. {it.ref.name.replace('（伴奏）', '')}</div>
      {i > 0 && <div className="lbl dim" style={{ left: 222, top: Y(it.r0) + 2, color: 'var(--glow)' }}>过渡 {xf} 秒</div>}</Fragment>)}</Fragment>;
    controls = <div className="pad" style={{ paddingTop: 8 }}><div className="kv" style={{ paddingTop: 0 }}>接缝过渡<Seg value={xf} options={[{ v: 0, l: '不要' }, { v: 3, l: '3 秒' }, { v: 6, l: '6 秒' }]} onChange={setXf} style={{ width: 200 }} /></div>
      <p className="note">6 首按这个顺序接起来，共 {fmtT(dur)}。长按一首上下拖，换顺序；每首开头会放一个标记。</p></div>;
  } else {
    dur = 60; pps = 7.4;
    cols = [{ x: 150, capW: 130, lay: { dur: 60, items: [{ k: 'sec', id: 'l', r0: 0, r1: 60, ref: { level: 0.85, name: '' } }] }, amp: envSampler(MUSIC, { off: 125 }), kind: 'music' }];
    overlay = ({ Y }) => <Fragment>
      <svg style={{ position: 'absolute', left: 0, top: 0, width: 360, height: Y(60) + 20, pointerEvents: 'none' }}><path d={`M 230 ${Y(59)} C 330 ${Y(56)}, 330 ${Y(4)}, 230 ${Y(1)}`} stroke="#ffb648" strokeWidth="2" fill="none" strokeDasharray="5 5" /><path d={`M 236 ${Y(1) - 6} L 228 ${Y(1)} L 237 ${Y(1) + 5}`} stroke="#ffb648" strokeWidth="2" fill="none" /></svg>
      <div className="lbl" style={{ left: 248, top: Y(30), color: 'var(--warm)', whiteSpace: 'normal', width: 80, lineHeight: 1.4 }}>放完接回开头，听不出接缝</div></Fragment>;
    controls = <div className="pad" style={{ paddingTop: 8 }}><div className="kv" style={{ paddingTop: 0 }}>从哪段取<span>副歌 2:05 起</span></div><p className="note">晚风（钢琴版）取 60 秒，首尾找了节拍对得上的位置，再做 0.5 秒交叉淡化。</p></div>;
  }
  return <div className={cx('scr', dir)}>
    <Hdr title={title} sub={t === 'loop' ? '晚风（钢琴版）→ 60 秒可循环' : t === 'medley' ? '广场舞串烧 6 首' : '3 轨叠在一起'} onBack={ph.nav.pop} />
    <ChainBanner p={p} ph={ph} onSkip={() => { if (!nextInChain(ph, p)) ph.nav.pop(); }} />
    <SpineView height={SCR_H - HDR_H - 250 - (p.chain ? 66 : 0)} dur={dur} pps={pps} cols={cols} ver={JSON.stringify([vols, xf])} initR={t === 'multitrack' ? 30 : dur * 0.3 + 5} apiRef={api} zoomCtl={t === 'multitrack'} onZoom={() => { }} phFrac={t === 'multitrack' ? 0.3 : 0.04} overlay={overlay} />
    <div className="panel" style={{ height: 250, animation: 'none' }}>
      <div style={{ flex: 1 }}>{controls}</div>
      <div className="pad" style={{ paddingBottom: 12 }}><Btn k="pri" full onClick={() => ph.toast('存成新音频了；配方也存着，以后能回来再调')}>存成新音频</Btn></div>
    </div>
  </div>;
}
function SttPage({ ph, dir }) {
  return <div className={cx('scr', dir)}>
    <Hdr title="音频转文字" sub="还没开放" onBack={ph.nav.pop} />
    <div className="body pad">
      <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: 14, marginTop: 10 }}>
        <div style={{ position: 'relative' }}><Mini S={SPEECH} w={60} h={260} from={2.6} to={34} half={26} /></div>
        <div style={{ display: 'grid', gap: 18, alignContent: 'start', paddingTop: 12 }}>{[0, 1, 2, 3].map(i => <div key={i} style={{ height: 34, borderRadius: 10, background: 'repeating-linear-gradient(90deg, var(--s2) 0 70%, transparent 70% 100%)', opacity: 0.8 - i * 0.12 }} />)}</div>
      </div>
      <p style={{ fontSize: 20, fontWeight: 600, marginTop: 22, lineHeight: 1.4 }}>开放以后，每颗胶囊旁边就是那句话的文字。</p>
      <p className="t2" style={{ fontSize: 15, lineHeight: 1.7, marginTop: 8 }}>到时候可以直接划掉一行字来剪掉那句话。现在这个服务还没接通，所以这里不会假装转出文字。</p>
      <Btn full line style={{ marginTop: 18 }} icon="bell" onClick={() => ph.toast('开放时会在这里提醒你')}>开放时提醒我</Btn>
    </div>
  </div>;
}

/* ===== Versions: parallel spines, scrolled together (the week view of one recording) ===== */
function Versions({ ph, p, dir }) {
  const base = newEd(SPEECH, 'interview');
  const vers = useMemo(() => {
    let closed = base; for (const q of SPEECH.pauses) closed = closePause(closed, q.id);
    const dn = a => (a < 0.11 ? a * 0.14 : a);
    const mk = (ed, xf) => { const lay = layout(SPEECH, ed), smp = makeSampler(SPEECH, ed); return { lay, amp: xf ? (a, b) => xf(smp.amp(a, b)) : smp.amp }; };
    return [{ n: '原始录音', d: '今天 09:42 录的', ...mk(base) }, { n: '降噪', d: '从原始录音，降噪适中', ...mk(base, dn) }, { n: '删掉停顿', d: '从降噪，合上 9 处', ...mk(closed, dn) }];
  }, []);
  const [cur, setCur] = useState(2);
  const [pick, setPick] = useState(p.fresh === 'denoise' ? 1 : 2);
  const api = useRef();
  const xs = [100, 190, 280];
  const cols = vers.map((v, i) => ({ x: xs[i], capW: 70, lay: v.lay, amp: v.amp, kind: 'speech', alpha: i === pick ? 1 : 0.5 }));
  const dur = Math.max(...vers.map(v => v.lay.dur));
  return <div className={cx('scr', dir)}>
    <Hdr title="版本" sub="播客第 12 期，3 个版本，一起往下滚" onBack={ph.nav.pop} />
    <div style={{ display: 'flex', flex: 'none', height: 56, position: 'relative' }}>{vers.map((v, i) => <button key={v.n} onClick={() => setPick(i)} style={{ position: 'absolute', left: xs[i] - 44, width: 88, top: 2, textAlign: 'center', padding: '4px 0', borderRadius: 12, background: pick === i ? 'var(--s2)' : 'none', boxShadow: pick === i ? 'inset 0 0 0 1.5px var(--t1)' : 'none' }}>
      <b style={{ display: 'block', fontSize: 14, lineHeight: 1.3, color: pick === i ? 'var(--t1)' : 'var(--t2)' }}>{v.n}</b><span className="num" style={{ fontSize: 12.5, color: 'var(--t3)' }}>{fmtT(v.lay.dur)}</span></button>)}</div>
    <SpineView height={SCR_H - HDR_H - 56 - 196} dur={dur} pps={8} cols={cols} ver={pick} initR={22} apiRef={api} zoomCtl onZoom={() => { }}
      overlay={({ Y }) => <Fragment>{vers[2].lay.items.filter(it => it.k === 'closed').map(it => <div key={it.id} className="seam" style={{ left: xs[2] - 40, width: 80, top: Y((it.r0 + it.r1) / 2) }} />)}</Fragment>} />
    <div className="panel" style={{ height: 196, animation: 'none' }}>
      <div className="pad" style={{ paddingTop: 14 }}><div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}><b style={{ fontSize: 18 }}>{vers[pick].n}</b>{cur === pick && <span className="tag">正在用</span>}</div>
        <p className="note" style={{ marginTop: 2 }}>{vers[pick].d}　{fmtT(vers[pick].lay.dur)}{pick === 2 ? '，比原始短 ' + sec1(SPEECH.dur - vers[2].lay.dur) + ' 秒' : ''}</p></div>
      <div className="foot" style={{ marginTop: 'auto' }}>
        <button className="ib" style={{ background: 'var(--s2)' }} onClick={() => ph.toast('删掉了「' + vers[pick].n + '」', { label: '撤销', fn: () => { } })} disabled={pick === 0} aria-label="删除"><Icon n="trash" s={20} /></button>
        <Btn line icon="play" onClick={() => { api.current.scrollToR(api.current.getR()); ph.toast('在听「' + vers[pick].n + '」'); }}>试听</Btn>
        <Btn k="pri" style={{ flex: 1 }} disabled={cur === pick} onClick={() => { setCur(pick); ph.toast('换成「' + vers[pick].n + '」了'); }}>{cur === pick ? '正在用' : '用这个版本'}</Btn>
      </div>
    </div>
  </div>;
}
SCREENS.versions = Versions;
