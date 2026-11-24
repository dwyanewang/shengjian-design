/* ================= the sentence ================= */
function Sentence({ text, steps = [], off = {}, focus, onPhrase, size = 28, shown, caret, weight = 700 }) {
  const n = shown == null ? text.length : shown;
  const marks = steps.filter(s => s.phrase && s.phrase[1] <= n).slice().sort((a, b) => a.phrase[0] - b.phrase[0]);
  const out = []; let i = 0;
  marks.forEach(s => {
    if (s.phrase[0] > i) out.push(<React.Fragment key={'t' + i}>{text.slice(i, s.phrase[0])}</React.Fragment>);
    out.push(<Hl key={s.id} i={s.color} off={off[s.id]} ask={s.kind === 'ask'} foc={focus === s.id} dim={focus && focus !== s.id} onClick={onPhrase ? e => { e.stopPropagation(); onPhrase(s.id); } : undefined}><span data-ph={s.id}>{text.slice(s.phrase[0], s.phrase[1])}</span></Hl>);
    i = s.phrase[1];
  });
  if (i < n) out.push(<React.Fragment key="rest">{text.slice(i, n)}</React.Fragment>);
  return <div style={{ fontFamily: 'var(--f-big)', fontSize: size, fontWeight: weight, lineHeight: 1.42, letterSpacing: 0, wordBreak: 'keep-all', overflowWrap: 'anywhere' }}>
    {out}{caret && <span className="caret" style={{ display: 'inline-block', width: 2, height: size * 0.95, background: 'var(--ink)', verticalAlign: '-0.12em', marginLeft: 2, animation: 'blink 1s steps(1) infinite' }} />}
  </div>;
}
function useTyping(text, start) {
  const [n, setN] = useState(start == null ? text.length : start);
  useEffect(() => { if (n >= text.length) return; const t = setTimeout(() => setN(n + 1), 42); return () => clearTimeout(t); }, [n, text]);
  return [n, setN];
}
const BOTNAV = [['home', '声音', 'voice'], ['new', '新建', 'plus'], ['me', '我的', 'user']];
function BottomNav({ cur }) {
  const { nav } = useContext(PhoneCtx);
  return <div className="bnav">{BOTNAV.map(([k, l, ic]) => <button key={k} data-anchor={'nav-' + k} className={cur === k ? 'on' : ''} onClick={() => nav.tab(k)}>
    {k === 'new' ? <span className="plus"><Ic n="plus" s={22} w={2.2} /></span> : <Ic n={ic} s={24} w={cur === k ? 2.2 : 1.8} />}<span>{l}</span></button>)}</div>;
}
function Playhead({ x, h }) { return <div style={{ position: 'absolute', left: x - 1, top: -4, width: 2, height: h + 8, background: 'var(--ink)', borderRadius: 1, pointerEvents: 'none' }}><i style={{ position: 'absolute', top: -3, left: -4, width: 10, height: 10, borderRadius: 5, background: 'var(--ink)' }} /></div>; }

/* ================= home ================= */
function Home({ p }) {
  const { nav, g, player } = useContext(PhoneCtx);
  const rec = SJ.LIBRARY[0], env = envSpeech();
  const [filter, setFilter] = useState('全部');
  const [q, setQ] = useState(p.search ? '播客' : null);
  const [multi, setMulti] = useState(p.multi ? ['interview', 'meeting', 'lesson'] : null);
  const [ex, setEx] = useState(0);
  useEffect(() => { const t = setInterval(() => setEx(e => (e + 1) % SJ.SENTENCE.examples.length), 2800); return () => clearInterval(t); }, []);
  const draft = g.draft || '';
  const [shown] = useTyping(draft, g.draftAnim ? 0 : null);
  const parse = PARSE[draft];
  const filters = ['全部', '录音', '导入', '混音', '多版本', '待保存'];
  const fil = it => filter === '全部' || (filter === '录音' && it.from === '录音') || (filter === '导入' && /文件|视频/.test(it.from)) || (filter === '混音' && it.kind === 'mix') || (filter === '多版本' && it.versions > 1) || (filter === '待保存' && it.status === 'saving');
  const items = SJ.LIBRARY.filter(fil).filter(it => !q || q === true || it.title.includes(q));
  const on = player.on('home');
  const say = s => nav.set({ draft: s, draftAnim: true });
  return <div className="scr">
    <div className="top" style={{ paddingLeft: 16 }}>
      <Logo s={28} /><b style={{ fontSize: 21, fontWeight: 900, marginLeft: 8, flex: 1, fontFamily: 'var(--f-big)' }}>声剪</b>
      <button className="ib" onClick={() => setQ(q == null ? '' : null)} aria-label="搜索"><Ic n="search" /></button>
      <button className="ib" onClick={() => nav.tab('me')} aria-label="我的"><span style={{ width: 32, height: 32, borderRadius: 16, background: 'var(--surface-3)', display: 'grid', placeItems: 'center' }}><Ic n="user" s={18} /></span></button>
    </div>
    <div className="scroll">
      {/* the last sound you worked on */}
      <div className="pad">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <PlayBtn on={on} onClick={() => player.toggle('home', 130)} />
          <button style={{ flex: 1, minWidth: 0 }} onClick={() => nav.go('editor', {})}>
            <div className="row-t" style={{ fontWeight: 700 }}><Dot s={rec.title} /></div>
            <div className="row-d"><span className="num">{fmt(rec.seconds)}</span>　今天 09:42 录的　3 个版本</div>
          </button>
        </div>
        <div style={{ position: 'relative', marginTop: 12, cursor: 'pointer' }} onClick={() => nav.go('editor', {})}>
          <Wave env={env} rate={50} from={0} to={130} w={328} h={48} thin color={g.dark ? '#A0A8B2' : '#5C6470'} scale={0.95} />
          {player.tag === 'home' && <Playhead x={player.t / 130 * 328} h={52} />}
        </div>
        <div style={{ marginTop: 10, fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5 }}>我先听了一遍。要不要：</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
          {SUGGEST.map(s => <button key={s.text} className="chip" onClick={() => say(s.text)} title={s.why} style={{ background: 'transparent', boxShadow: 'inset 0 0 0 1.5px var(--line)', height: 36, padding: '0 12px', fontSize: 14 }}>{s.text}</button>)}
        </div>
      </div>
      {/* one sentence: the biggest thing on the screen */}
      <div data-anchor="say" style={{ margin: '16px 12px 0', background: 'var(--surface)', borderRadius: 26, padding: '14px 16px 12px', boxShadow: '0 1px 0 var(--line), 0 18px 34px -26px rgba(20,30,45,.45)', cursor: 'text' }} onClick={() => nav.go('say', { text: draft })}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="lbl">对这段说一句</span>
          {draft && <button className="btn-t" style={{ height: 32, fontWeight: 500, color: 'var(--ink-3)' }} onClick={e => { e.stopPropagation(); nav.set({ draft: '' }); }}>清空</button>}
        </div>
        <div style={{ minHeight: 122, paddingTop: 4 }}>
          {draft ? <Sentence text={draft} steps={parse ? parse.steps : []} shown={shown} size={28} caret={shown < draft.length} />
            : <div key={ex} style={{ fontFamily: 'var(--f-big)', fontSize: 28, fontWeight: 700, lineHeight: 1.42, color: 'var(--ink-3)', animation: 'fadeIn .5s' }}>{SJ.SENTENCE.examples[ex]}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
          <button className="ib soft" style={{ width: 48, height: 48, borderRadius: 24 }} onClick={e => { e.stopPropagation(); nav.go('say', { listen: true }); }} aria-label="说话"><Ic n="mic" /></button>
          <span style={{ flex: 1, fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.4 }}>{draft ? (parse ? (parse.main ? <>听懂了 4 步<br />会短 17 秒</> : `听懂了 ${parse.steps.length} 步`) : '') : '打字或按住说'}</span>
          <button data-anchor="say-go" className="btn btn-p" style={{ height: 48 }} onClick={e => { e.stopPropagation(); draft ? nav.go('plan', { text: draft }) : nav.go('say', {}); }}>看看怎么改</button>
        </div>
      </div>
      {draft && <div style={{ margin: '10px 16px 0', fontSize: 14, color: 'var(--ink-3)', minHeight: 22 }}>也可以说：<span key={ex} style={{ color: 'var(--ink)' }}>{SJ.SENTENCE.examples[ex]}</span></div>}
      {/* library */}
      <div className="sec-h" style={{ marginTop: 22 }}>
        <b>你的声音 <span className="num" style={{ fontWeight: 500, color: 'var(--ink-3)', fontSize: 16 }}>{SJ.LIBRARY.length}</span></b>
        <button className="btn-t" style={{ height: 36 }} onClick={() => setMulti(multi ? null : [])}>{multi ? '完成' : '多选'}</button>
      </div>
      {q != null && <div className="pad" style={{ marginBottom: 8 }}><div className="field" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px' }}><Ic n="search" s={20} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="搜标题" style={{ border: 0, outline: 0, background: 'transparent', flex: 1, fontSize: 16 }} /></div></div>}
      <div className="chips" style={{ marginBottom: 4 }}>{filters.map(f => <button key={f} className={'chip' + (filter === f ? ' on' : '')} onClick={() => setFilter(f)}>{f}</button>)}</div>
      {items.map(it => <LibRow key={it.id} it={it} multi={multi} sel={multi && multi.includes(it.id)}
        onSel={() => setMulti(multi.includes(it.id) ? multi.filter(x => x !== it.id) : [...multi, it.id])} />)}
      {!items.length && <div className="pad mute" style={{ padding: 24, fontSize: 15 }}>没有符合的声音</div>}
      <div style={{ height: 16 }} />
    </div>
    {multi ? <div className="bot" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <span style={{ fontSize: 15, flex: 1 }}>已选 <b className="num">{multi.length}</b> 个</span>
      <button className="btn btn-s" style={{ height: 44, padding: '0 14px' }} onClick={() => multi.length && nav.go('batch', { tpl: 'clean', files: multi.length })}>用工具</button>
      <button className="btn btn-s" style={{ height: 44, padding: '0 14px' }} onClick={() => multi.length && nav.go('batch', { tpl: 'convert', files: multi.length })}>导出</button>
      <button className="btn btn-p" style={{ height: 44, padding: '0 16px' }} onClick={() => multi.length && nav.go('batch', { tpl: 'sentence', files: multi.length })}>说一句</button>
    </div> : <BottomNav cur="home" />}
  </div>;
}
function LibRow({ it, multi, sel, onSel }) {
  const { nav } = useContext(PhoneCtx);
  const status = it.status === 'saving' ? <><span className="dot" style={{ width: 8, height: 8, background: 'var(--ink)', marginRight: 6, verticalAlign: 1 }} />{it.statusText}</> : it.status === 'exporting' ? it.statusText : null;
  return <div className="row" style={{ cursor: 'pointer', paddingRight: 4 }} onClick={() => multi ? onSel() : it.status === 'saving' ? nav.go('export', { item: it.id, stage: 'ready', purpose: 'sound' }) : nav.go('editor', { item: it.id })}>
    {multi && <span className={'ck' + (sel ? ' on' : '')}>{sel && <Ic n="check" s={18} w={2.6} />}</span>}
    <Thumb item={it} />
    <div className="row-m">
      <div className="row-t"><Dot s={it.title} /></div>
      <div className="row-d" style={{ color: status ? 'var(--ink)' : undefined }}><span className="num" style={{ color: 'var(--ink-3)' }}>{fmt(it.seconds)}</span>　{status || it.date}{!status && it.versions > 1 ? `　${it.versions} 个版本` : ''}</div>
      {it.status === 'exporting' && <div className="bar" style={{ marginTop: 6, height: 4 }}><i style={{ width: '64%' }} /></div>}
    </div>
    {!multi && <button className="ib" onClick={e => { e.stopPropagation(); nav.sheet('item', { id: it.id }); }} aria-label="更多"><Ic n="more" /></button>}
  </div>;
}

/* ================= say ================= */
function Say({ p }) {
  const { nav, g } = useContext(PhoneCtx);
  const [txt, setTxt] = useState(p.text != null ? p.text : (g.draft || ''));
  const [shown, setShown] = useTyping(txt, p.text != null || !g.draft ? null : null);
  const [tab, setTab] = useState(p.tab || 'try');
  const [listen, setListen] = useState(!!p.listen);
  const [level, setLevel] = useState(0);
  const fill = s => { setTxt(s); setShown(0); };
  useEffect(() => {
    if (!listen) return;
    const lv = setInterval(() => setLevel(l => l + 1), 90);
    const t = setTimeout(() => fill(SJ.SENTENCE.text), 700);
    const t2 = setTimeout(() => setListen(false), 700 + SJ.SENTENCE.text.length * 42 + 400);
    return () => { clearInterval(lv); clearTimeout(t); clearTimeout(t2); };
  }, [listen]);
  const parse = PARSE[txt];
  const steps = parse ? parse.steps.filter(s => s.phrase[1] <= shown) : [];
  const done = shown >= txt.length;
  const target = parse && parse.target === 'wanfeng' ? libItem('wanfeng') : libItem('interview');
  const go = () => { if (!txt) { nav.toast('先说一句，比如「剪掉开头3秒」'); return; } nav.set({ draft: txt, draftAnim: false }); nav.go('plan', { text: txt }); };
  const lists = {
    try: SJ.SENTENCE.examples.map(t => ({ t })).concat([{ t: SJ.SENTENCE.question.text, note: '只说一半，会追问' }, { t: AI_SAID, note: '口语，本机读不懂的部分可以请 AI 帮忙' }, { t: EN_SENTENCE, note: '英文也听得懂，同样四步' }]),
    recent: RECENT.map(t => ({ t })),
    recipes: RECIPES.map(r => ({ t: r.text, name: r.name })),
  };
  return <div className="scr enter">
    <Top title="说一句" sub={<>改：<Dot s={target.title} /></>} />
    <div className="scroll">
      <div style={{ margin: '4px 12px 0', background: 'var(--surface)', borderRadius: 24, padding: '16px 18px', minHeight: 196 }}>
        {txt ? <Sentence text={txt} steps={parse ? parse.steps : []} shown={shown} size={30} caret />
          : <div style={{ fontFamily: 'var(--f-big)', fontSize: 30, fontWeight: 700, lineHeight: 1.42, color: 'var(--ink-3)' }}>想怎么改，就怎么说<span style={{ display: 'inline-block', width: 2, height: 28, background: 'var(--ink)', verticalAlign: '-0.12em', marginLeft: 2, animation: 'blink 1s steps(1) infinite' }} /></div>}
        <div style={{ marginTop: 14, minHeight: 30, display: 'flex', flexWrap: 'wrap', gap: '6px 12px', alignItems: 'center', fontSize: 14, color: 'var(--ink-2)' }}>
          {steps.length > 0 && <span className="mute">听懂了</span>}
          {steps.map(s => <span key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><i className="dot" style={{ background: HL[s.color].v }} />{s.title}</span>)}
          {txt && done && !parse && <span>有几处本机没读懂，下一步会告诉你是哪几处</span>}
          {txt && <button className="btn-t" style={{ height: 30, marginLeft: 'auto', fontWeight: 500, color: 'var(--ink-3)' }} onClick={() => fill('')}>清空</button>}
        </div>
      </div>
      <div className="pad" style={{ marginTop: 14 }}><Seg items={[['try', '试试这样说'], ['recent', '最近说过'], ['recipes', '我的配方']]} value={tab} onChange={setTab} /></div>
      <div style={{ marginTop: 6 }}>
        {lists[tab].map(x => <button key={x.t} className="row" style={{ minHeight: 52 }} onClick={() => fill(x.t)}>
          <div className="row-m">{x.name && <div style={{ fontSize: 14, color: 'var(--ink-3)' }}>{x.name}</div>}<div style={{ fontSize: 16, lineHeight: 1.45 }}>{x.t}</div>{x.note && <div style={{ fontSize: 14, color: 'var(--ink-3)' }}>{x.note}</div>}</div>
          <Ic n="up" s={20} />
        </button>)}
        {tab === 'recipes' && <div className="pad" style={{ fontSize: 14, color: 'var(--ink-3)', padding: '8px 16px 0' }}>计划页上点「存成配方」，常用的一句话就留在这里。</div>}
      </div>
      <div style={{ height: 12 }} />
    </div>
    <div className="bot" style={{ display: 'flex', gap: 12, alignItems: 'center', position: 'relative' }}>
      {listen ? <>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 3, alignItems: 'center', height: 30 }}>{Array.from({ length: 26 }, (_, i) => <i key={i} style={{ width: 4, borderRadius: 2, background: 'var(--ink)', height: 6 + 22 * Math.abs(Math.sin(i * 0.9 + level * 0.7)) * (0.4 + 0.6 * Math.abs(Math.sin(level * 0.3 + i))) }} />)}</div>
          <div style={{ fontSize: 14, color: 'var(--ink-2)' }}>正在听，手机本机识别，不联网</div>
        </div>
        <button className="btn btn-p" onClick={() => setListen(false)}>说完了</button>
      </> : <>
        <button className="ib fill" style={{ width: 56, height: 56, borderRadius: 28 }} onClick={() => { setTxt(''); setListen(true); }} aria-label="说话"><Ic n="mic" s={26} /></button>
        <button className="btn btn-p" style={{ flex: 1, height: 56, borderRadius: 28, fontSize: 17 }} onClick={go}>看看怎么改</button>
      </>}
    </div>
  </div>;
}

/* ================= plan: the sentence lands on the sound ================= */
const KIND2ID = { cut: 's1', pauses: 's2', gain: 's3', fade: 's4' };
function planRegions({ steps, vals, off, pOff = {}, focus, music, win }) {
  const R = [];
  const A = s => (focus && focus !== s.id ? 0.3 : 1);
  steps.forEach(s => {
    const c = HL[s.color].fill, struck = off[s.id];
    if (s.kind === 'cut' || s.kind === 'ask') { const b = s.kind === 'ask' ? 2.6 : (s.region ? (s.id === 's1' && s.title.indexOf('3') > -1 ? vals.s1 : s.region[1]) : vals.s1); R.push(struck ? { a: 0, b, kind: 'hatch' } : { a: 0, b, kind: 'fill', c, alpha: s.kind === 'ask' ? 0.55 : A(s), step: s.id }); }
    if (s.kind === 'pauses') SJ.PAUSES.forEach(([t, d], k) => { const a = t + vals.s2 / 2, b = t + d - vals.s2 / 2; if (b <= a) return; R.push(struck || pOff[k] ? { a, b, kind: 'hatch' } : { a, b, kind: 'fill', c, alpha: A(s), min: 3, step: s.id }); });
    if (s.kind === 'gain' && !struck) R.push({ a: 0, b: win, kind: 'band', c, bh: 7, alpha: A(s), step: s.id });
    if (s.kind === 'keep') { R.push({ a: 0, b: s.region[0], kind: 'hatch' }); R.push({ a: s.region[1], b: win, kind: 'hatch' }); if (!struck) R.push({ a: s.region[0], b: s.region[1], kind: 'fill', c, alpha: A(s) * 0.85, step: s.id }); }
    if ((s.kind === 'insert' || s.kind === 'split') && !struck) s.marks.forEach(m => R.push({ a: m, b: m, kind: 'edge', c: HL[s.color].ink, step: s.id }));
    if (s.kind === 'chorus' && !struck) R.push({ a: 182, b: 212, kind: 'fill', c, alpha: A(s), step: s.id });
    if (s.kind === 'tool' && !struck) R.push({ a: 0, b: win, kind: 'band', c, bh: 7, y0: (s.color - 1) * 8, step: s.id });
  });
  return R;
}
function PlanWave({ steps, vals, off, pOff, focus, music, waveRef }) {
  const th = useTheme();
  const hasFade = steps.some(s => s.kind === 'fade');
  const keep = steps.find(s => s.kind === 'keep');
  const W = 328, TW = hasFade ? 52 : 0, MW = W - TW - (hasFade ? 12 : 0), H = 92;
  const win = music ? 232 : keep ? 180 : 130;
  const env = music ? envMusic() : keep ? envSpeechLong() : envSpeech();
  const rate = music ? 20 : 50;
  const regs = planRegions({ steps, vals, off, pOff, focus, music, win });
  // bands stacked when several whole-audio tools
  const regs2 = regs.map(r => r.kind === 'band' && r.y0 ? r : r);
  const fadeS = steps.find(s => s.kind === 'fade');
  const ticks = music ? [0, 60, 120, 180] : keep ? [0, 60, 120, 180] : [0, 30, 60, 90, 120];
  return <div ref={waveRef} style={{ position: 'relative' }}>
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0 }}>
      <div style={{ position: 'relative' }}>
        <WaveBands env={env} rate={rate} win={win} w={MW} h={H} regions={regs2} />
        <div style={{ position: 'relative', height: 18, marginTop: 4 }}>{ticks.map(t => <span key={t} className="num" style={{ position: 'absolute', left: t / win * MW, fontSize: 12, color: 'var(--ink-3)', transform: t ? 'translateX(-50%)' : 'none' }}>{fmt(t)}</span>)}</div>
      </div>
      {hasFade && <>
        <div style={{ width: 12, height: H, display: 'grid', placeItems: 'center', color: 'var(--ink-3)', fontSize: 14, marginBottom: 22 }}>⋯</div>
        <div style={{ position: 'relative' }}>
          <Wave env={envTail()} rate={50} from={0} to={12} w={TW} h={H} fadeEnd={off[fadeS.id] ? 0 : vals.s4}
            regions={off[fadeS.id] ? [{ a: 12 - vals.s4, b: 12, kind: 'hatch' }] : [{ a: 12 - vals.s4, b: 12, kind: 'fade', c: HL[fadeS.color].fill, alpha: focus && focus !== fadeS.id ? 0.32 : 1, line: th.ink }]} />
          <div style={{ height: 18, marginTop: 4, textAlign: 'right' }}><span className="num" style={{ fontSize: 12, color: 'var(--ink-3)' }}>18:40</span></div>
        </div>
      </>}
    </div>
  </div>;
}
function WaveBands({ env, rate, win, w, h, regions }) {
  // bands with y0 are drawn as separate strips under the wave so several whole-audio tools stay readable
  const bands = regions.filter(r => r.kind === 'band');
  const rest = regions.filter(r => r.kind !== 'band');
  const bh = bands.length ? bands.length * 9 + 2 : 0;
  return <div style={{ position: 'relative' }}>
    <Wave env={env} rate={rate} from={0} to={win} w={w} h={h - bh} regions={rest} />
    {bands.map((b, i) => <div key={i} style={{ height: 7, marginTop: 2, borderRadius: 4, background: b.c, opacity: b.alpha == null ? 1 : b.alpha, width: w }} data-band={b.step} />)}
  </div>;
}
function StepCard({ s, vals, setVals, off, toggle, focus, setFocus, pOff, setPOff, openList, setOpenList, onTool }) {
  const { player, g } = useContext(PhoneCtx);
  const struck = off[s.id], foc = focus === s.id;
  const removed = planCuts(vals, {}).filter(c => c.step === 2).reduce((a, c, k) => a + (pOff[k] ? 0 : c.b - c.a), 0);
  let body;
  if (s.kind === 'cut' && s.region && s.region[1] === 3 && !s.guessed) body = <>剪掉开头 <Stepper value={vals.s1} unit="秒" step={0.5} min={0.5} max={20} onChange={v => setVals({ ...vals, s1: v })} /></>;
  else if (s.kind === 'pauses') body = <>每处停顿留 <Stepper value={vals.s2} unit="秒" step={0.1} min={0} max={1} fmtv={v => v.toFixed(1)} onChange={v => setVals({ ...vals, s2: v })} /></>;
  else if (s.kind === 'gain') body = <>整体大 <Stepper value={vals.s3} unit="dB" step={1} min={1} max={9} onChange={v => setVals({ ...vals, s3: v })} /></>;
  else if (s.kind === 'fade') body = <>结尾淡出 <Stepper value={vals.s4} unit="秒" step={0.5} min={0.5} max={10} onChange={v => setVals({ ...vals, s4: v })} /></>;
  else body = s.title;
  const detail = s.kind === 'pauses' ? `9 处，共省下 ${Math.round(removed)} 秒` : s.kind === 'gain' ? `响度 -19 → ${-19 + vals.s3} LUFS，${vals.s3 > 5 ? '有 2 处会碰到上限，自动限幅' : '不会爆音'}` : s.kind === 'cut' && s.region && s.region[1] === 3 && !s.guessed ? `0:00–${fmt1(vals.s1).replace(/\.0$/, '')}，${vals.s1 <= 3 ? '这里只有环境声' : '会剪掉第一句的开头'}` : s.kind === 'fade' ? `最后 ${vals.s4} 秒，正弦曲线` : s.detail;
  const dur = s.kind === 'pauses' ? 6 : 4;
  const tag = 'step-' + s.id;
  return <div onClick={() => setFocus(foc ? null : s.id)} data-step={s.id} style={{ margin: '0 12px 10px', background: 'var(--surface)', borderRadius: 20, padding: '12px 14px 10px', boxShadow: foc ? 'inset 0 0 0 2px var(--ink)' : 'none', cursor: 'pointer' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 15, fontWeight: 700 }}><Hl i={s.color} off={struck} dim={focus && !foc}>{s.phraseText}</Hl></span>
      <span style={{ flex: 1 }} />
      {s.guessed && <span style={{ fontSize: 13, color: 'var(--ink-2)', boxShadow: 'inset 0 0 0 1.5px var(--ink-3)', borderRadius: 6, padding: '2px 6px', borderStyle: 'dashed' }}>「{s.guessed}」是估计的</span>}
      {!struck && s.kind !== 'purpose' && <button className="ib soft" style={{ width: 36, height: 36 }} onClick={e => { e.stopPropagation(); player.toggle(tag, dur); }} aria-label="听这一步"><Ic n={player.on(tag) ? 'pause' : 'play'} s={16} /></button>}
    </div>
    <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6, textDecoration: struck ? 'line-through' : 'none', color: struck ? 'var(--ink-3)' : 'var(--ink)', lineHeight: 1.6 }}>{body}</div>
    <div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 2 }}>{struck ? '这步不做' : detail}</div>
    {s.kind === 'pauses' && !struck && openList && <div style={{ marginTop: 8 }} onClick={e => e.stopPropagation()}>
      {SJ.PAUSES.map(([t, d], k) => <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, height: 40, borderTop: '1px solid var(--line)' }}>
        <button className={'ck' + (pOff[k] ? '' : ' on')} onClick={() => setPOff({ ...pOff, [k]: !pOff[k] })}>{!pOff[k] && <Ic n="check" s={16} w={2.6} />}</button>
        <span className="num" style={{ fontSize: 15, width: 56 }}>{fmt1(t)}</span><span style={{ fontSize: 15, flex: 1, color: 'var(--ink-2)' }}>停了 <span className="num">{d.toFixed(1)}</span> 秒</span>
        <button className="ib" style={{ width: 36, height: 36 }} onClick={() => player.toggle('pz' + k, d + 2)} aria-label="听这一处"><Ic n={player.on('pz' + k) ? 'pause' : 'play'} s={16} /></button>
      </div>)}
    </div>}
    <div style={{ display: 'flex', gap: 4, marginTop: 6, marginLeft: -8 }} onClick={e => e.stopPropagation()}>
      <button className="btn-t" style={{ height: 36, fontWeight: 500 }} onClick={() => toggle(s.id)}>{struck ? '恢复这步' : '不做这步'}</button>
      {s.kind === 'pauses' && !struck && <button className="btn-t" style={{ height: 36, fontWeight: 500 }} onClick={() => setOpenList(!openList)}>{openList ? '收起' : '逐处听'}</button>}
      {s.tool && <button className="btn-t" style={{ height: 36, fontWeight: 500 }} onClick={() => onTool(s.tool)}>先看看这个工具</button>}
    </div>
  </div>;
}
function Plan({ p }) {
  const { nav, g } = useContext(PhoneCtx);
  const [text, setText] = useState(p.text || SJ.SENTENCE.text);
  const [ai, setAi] = useState(p.ai || null);
  const isAI = text === AI_SAID;
  const parse = isAI ? (ai === 'done' ? PARSE[SJ.SENTENCE.aiRewrite.rewritten] : null) : PARSE[text];
  const steps0 = parse ? parse.steps : [];
  const ptext = isAI && ai === 'done' ? SJ.SENTENCE.aiRewrite.rewritten : text;
  const steps = steps0.map(s => Object.assign({}, s, { phraseText: ptext.slice(s.phrase[0], s.phrase[1]) }));
  const [vals, setVals] = useState(Object.assign({}, PLAN0));
  const [off, setOff] = useState({});
  const [pOff, setPOff] = useState({});
  const [focus, setFocus] = useState(p.focus === undefined ? null : p.focus);
  const [openList, setOpenList] = useState(false);
  const music = parse && parse.target === 'wanfeng';
  const target = music ? libItem('wanfeng') : libItem('interview');
  const ask = parse && parse.ask;
  const live = steps.filter(s => !off[s.id]);
  const removed = planCuts(vals, { s1: off.s1 || !steps.some(s => s.id === 's1' && s.kind === 'cut'), s2: off.s2 || !steps.some(s => s.kind === 'pauses') }).reduce((a, c) => a + (c.step === 2 && pOff[SJ.PAUSES.findIndex(([t]) => Math.abs(t + vals.s2 / 2 - c.a) < 0.01)] ? 0 : c.b - c.a), 0);
  const timeline = steps.length && steps.every(s => ['cut', 'pauses', 'gain', 'fade', 'keep', 'insert', 'split'].includes(s.kind) || s.kind === 'purpose');
  // lines from the focused phrase to its places on the sound
  const boxRef = useRef(), waveRef = useRef();
  const [lines, setLines] = useState([]);
  useLayoutEffect(() => {
    setLines([]); return;
    if (!focus || !boxRef.current || !waveRef.current) { setLines([]); return; }
    const box = boxRef.current.getBoundingClientRect(), z = box.width / boxRef.current.offsetWidth || 1;
    const ph = boxRef.current.querySelector(`[data-ph="${focus}"]`); if (!ph) { setLines([]); return; }
    const rs = ph.getClientRects(), r = rs[rs.length - 1];
    const x1 = (r.left + r.width / 2 - box.left) / z, y1 = (r.bottom - box.top) / z + 2;
    const wv = waveRef.current.getBoundingClientRect(), wx = (wv.left - box.left) / z, wy = (wv.top - box.top) / z;
    const s = steps.find(x => x.id === focus); if (!s || off[s.id]) { setLines([]); return; }
    const hasFade = steps.some(x => x.kind === 'fade'), keep = steps.find(x => x.kind === 'keep');
    const MW = 328 - (hasFade ? 64 : 0), win = music ? 232 : keep ? 180 : 130;
    let xs = [];
    if (s.kind === 'cut' || s.kind === 'ask') xs = [wx + (s.kind === 'ask' ? 1.3 : vals.s1 / 2) / win * MW];
    if (s.kind === 'pauses') xs = SJ.PAUSES.filter((_, k) => !pOff[k]).map(([t, d]) => wx + (t + d / 2) / win * MW);
    if (s.kind === 'gain' || s.kind === 'tool') xs = [wx + MW * 0.5];
    if (s.kind === 'fade') xs = [wx + 328 - 14];
    if (s.kind === 'keep') xs = [wx + (122.5) / win * MW];
    if (s.kind === 'chorus') xs = [wx + 197 / win * MW];
    if (s.kind === 'insert' || s.kind === 'split') xs = s.marks.map(m => wx + m / win * MW);
    const y2 = s.kind === 'gain' || s.kind === 'tool' ? wy + 92 - 6 : wy + 2;
    setLines(xs.map(x2 => ({ x1, y1, x2, y2, c: HL[s.color].ink })));
  }, [focus, text, ai, vals, off, pOff, g.dark]);
  const toggle = id => setOff({ ...off, [id]: !off[id] });
  const apply = () => {
    if (!live.length) { nav.toast('每一步都划掉了，没有要改的'); return; }
    const first = live[0];
    const purpose = live.find(s => s.kind === 'purpose');
    if (parse.chain || (live.every(s => s.kind === 'tool'))) { nav.replace('tool', { id: live[0].tool, chain: { text: ptext, steps: live.map(s => ({ id: s.id, tool: s.tool, kind: s.kind, title: s.title, color: s.color, ph: s.phraseText })), idx: 0 } }); return; }
    if (first.kind === 'chorus') { nav.replace('export', { item: 'wanfeng', purpose: 'sound', from: ptext, chorus: true }); return; }
    if (live.length === 1 && purpose) { nav.replace('export', { item: 'interview', purpose: purpose.purpose, from: ptext }); return; }
    if (live.some(s => s.kind === 'tool') && isAI) { nav.replace('editor', { applied: { vals, off: { s2: 1, s3: 1, s4: 1 }, text: ptext, colors: { s1: 1 } }, next: { tool: 'effects', ph: '提高高频', color: 2 } }); return; }
    const kinds = {}; live.forEach(s => { if (KIND2ID[s.kind]) kinds[KIND2ID[s.kind]] = s.color; });
    const off2 = {}; ['s1', 's2', 's3', 's4'].forEach(k => { if (!kinds[k]) off2[k] = 1; });
    if (!Object.keys(kinds).length) { nav.replace('editor', { manualNote: ptext, perSeg: !!purpose }); return; }
    nav.set({ applied: { vals, off: off2, pOff, text: ptext, colors: kinds } });
    nav.replace('editor', { applied: { vals, off: off2, pOff, text: ptext, colors: kinds }, toast: true, perSeg: !!purpose });
  };
  const askAnswer = o => { const sec = o === '到第一句话' ? null : parseFloat(o); setText(sec === 3 ? '剪掉开头3秒' : '剪掉开头3秒'); if (sec && sec !== 3) setVals({ ...vals, s1: sec }); if (!sec) setVals({ ...vals, s1: 2.6 }); };
  const runAI = () => { if (!g.member) { nav.sheet('gate', { why: 'ai' }); return; } if (!g.aiConsent) { setAi('wait'); nav.sheet('aiConsent', {}); return; } setAi('done'); setFocus(null); };
  useEffect(() => { if (isAI && g.member && g.aiConsent && ai === 'wait') setAi('done'); }, [g.member, g.aiConsent]);
  return <div className="scr enter">
    <Top title="这样改，对吗？" sub={<>改：<Dot s={target.title} /></>} right={parse && !ask ? <button className="btn-t" onClick={() => nav.toast('已存成配方「我的配方 4」', '改名')}>存成配方</button> : null} />
    <div ref={boxRef} data-anchor="plan-box" style={{ position: 'relative', flex: 'none', padding: '0 12px 12px 14px' }}>
      {isAI && ai === 'done' ? <>
        <div style={{ fontSize: 15, color: 'var(--ink-3)', textDecoration: 'line-through', lineHeight: 1.5 }}>{AI_SAID}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 2px', fontSize: 14, color: 'var(--ink-2)' }}><span className="badge">AI 改写</span>按你的意思改成了下面这句</div>
        <Sentence text={ptext} steps={steps} off={off} focus={focus} onPhrase={id => setFocus(focus === id ? null : id)} size={26} />
      </> : <Sentence text={text} steps={steps} off={off} focus={focus} onPhrase={id => setFocus(focus === id ? null : id)} size={text.length > 44 ? 23 : 26} />}
      {isAI && ai !== 'done' && <div style={{ height: 4, borderBottom: '2px dashed var(--ink-3)', width: '70%', marginTop: -6 }} />}
      <div style={{ marginTop: 14 }}>
        {(parse || isAI) && <PlanWave steps={steps} vals={vals} off={off} pOff={pOff} focus={focus} music={music} waveRef={waveRef} />}
      </div>
      {parse && !ask && <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
        {timeline && !music ? <><b className="num" style={{ fontSize: 22 }}>18:40</b><span style={{ color: 'var(--ink-3)' }}>变成</span><b className="num" style={{ fontSize: 22 }}>{fmt(1120 - removed)}</b><span style={{ fontSize: 14, color: 'var(--ink-2)' }}>{removed > 0.5 ? `短了 ${Math.round(removed)} 秒` : ''}{!off.s3 && steps.some(s => s.kind === 'gain') ? (removed > 0.5 ? '，' : '') + '听着大一点' : ''}</span></>
          : <span style={{ fontSize: 15, color: 'var(--ink-2)' }}>{parse.chain ? `${live.length} 个工具连着做，每步存成新版本，可以跳过某一步` : music ? '3:02–3:32 做成 30 秒铃声' : `${live.length} 步`}</span>}
      </div>}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
        {lines.map((l, i) => <g key={i}><path d={`M${l.x1} ${l.y1} C ${l.x1} ${(l.y1 + l.y2) / 2}, ${l.x2} ${(l.y1 + l.y2) / 2}, ${l.x2} ${l.y2}`} fill="none" stroke={l.c} strokeWidth="1.5" /><circle cx={l.x2} cy={l.y2} r="2.5" fill={l.c} /></g>)}
      </svg>
    </div>
    <div className="scroll" style={{ paddingTop: 4 }}>
      {ask && <div style={{ margin: '0 12px 10px', background: 'var(--surface)', borderRadius: 20, padding: '14px 16px' }}>
        <div style={{ fontSize: 14, color: 'var(--ink-2)' }}><Hl i={1} ask>剪掉开头</Hl> 少了长度</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginTop: 6 }}>{SJ.SENTENCE.question.ask}</div>
        <div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 2 }}>我听了一下：开头 2.6 秒只有环境声。</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>{SJ.SENTENCE.question.options.map(o => <button key={o} className="chip" style={{ height: 44, fontSize: 16, padding: '0 18px' }} onClick={() => askAnswer(o)}>{o}</button>)}</div>
      </div>}
      {isAI && ai !== 'done' && <div style={{ margin: '0 12px 10px', background: 'var(--surface)', borderRadius: 20, padding: '14px 16px' }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>这句有点口语，本机没读懂</div>
        <div style={{ fontSize: 15, color: 'var(--ink-2)', marginTop: 6, lineHeight: 1.6 }}>「咳嗽不要了」不知道是哪一段，「太闷」不知道要怎么改。</div>
        <div style={{ fontSize: 15, marginTop: 12 }}>可以换个说法：</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>{['剪掉开头3秒', '提高高频'].map(o => <button key={o} className="chip" onClick={() => o === '剪掉开头3秒' ? setText(o) : nav.toast('「提高高频」会打开效果里的均衡')}>{o}</button>)}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
          <div style={{ flex: 1, fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5 }}>或者请 AI 帮你听懂，只发这句话的文字，不发声音。</div><Member />
        </div>
      </div>}
      {isAI && ai === 'done' && <div style={{ margin: '0 12px 10px', padding: '10px 14px', borderRadius: 16, boxShadow: 'inset 0 0 0 1.5px var(--line)', fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6 }}>
        你没说过的数字：<b style={{ color: 'var(--ink)', borderBottom: '2px dashed var(--ink-3)' }}>3 秒</b>。{SJ.SENTENCE.aiRewrite.note.split('；')[0]}。
        <div><button className="btn-t" style={{ height: 36, marginLeft: -12 }} onClick={() => { setAi(null); setText(AI_SAID); }}>用我原来的话</button></div>
      </div>}
      {steps.filter(s => s.kind !== 'ask').map(s => <StepCard key={s.id + text} s={s} vals={vals} setVals={setVals} off={off} toggle={toggle} focus={focus} setFocus={setFocus} pOff={pOff} setPOff={setPOff} openList={openList} setOpenList={setOpenList} onTool={t => nav.go('tool', { id: t })} />)}
      {parse && !ask && <div style={{ padding: '2px 16px 16px', fontSize: 14, color: 'var(--ink-3)' }}>点一个短语或一张卡，看它落在哪里。改完是一步，可以一次撤销。</div>}
    </div>
    <div className="bot" style={{ display: 'flex', gap: 10 }}>
      {isAI && ai !== 'done' ? <button className="btn btn-p wide" onClick={runAI}>请 AI 帮忙理解</button>
        : ask ? <button className="btn btn-s wide" onClick={() => nav.toast('先选上面的长度')}>先回答上面的问题</button>
        : <>
          {timeline && !music && <button className="btn btn-s" style={{ flex: 'none', padding: '0 18px' }} onClick={() => nav.toast('正在播放改完的样子（前 30 秒）')}>听一遍</button>}
          <button data-anchor="plan-go" className="btn btn-p" style={{ flex: 1 }} onClick={apply}>{parse && parse.chain ? `开始第 1 步：${live[0] ? live[0].title : ''}` : music ? '裁好，去设铃声' : `照这样改（${live.length} 步）`}</button>
        </>}
    </div>
  </div>;
}

Object.assign(window, { Sentence, useTyping, BottomNav, Playhead, Home, LibRow, Say, Plan, PlanWave, StepCard, planRegions, KIND2ID });
