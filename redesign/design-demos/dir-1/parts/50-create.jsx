/* ================= new: every way sound comes in ================= */
const SOURCES = [
  { k: 'files', ic: 'file', t: '手机里的文件', d: '多选会接成一段，最多 20 个' },
  { k: 'video', ic: 'video', t: '视频里的声音', d: '从视频里取出声音' },
  { k: 'tts', ic: 'text', t: '文字读出来', d: '本机音色或在线真人感' },
  { k: 'subtitle', ic: 'sub', t: '字幕配音', d: 'SRT、VTT 或纯文本，逐句对齐' },
  { k: 'clone', ic: 'voice', t: '克隆我的声音', d: '照着读 5 秒', member: true },
  { k: 'music', ic: 'music', t: '在线音乐库', d: '试听、导入、配背景音乐' },
  { k: 'blank', ic: 'blank', t: '一段空白', d: '0.05 到 600 秒' },
  { k: 'samples', ic: 'sample', t: '示例音频', d: '先拿它试试手' },
  { k: 'package', ic: 'pack', t: '导入工程包', d: '换手机时带上所有版本' },
];
function NewScreen() {
  const { nav } = useContext(PhoneCtx);
  const open = s => ['blank', 'samples', 'package'].includes(s.k) ? nav.sheet(s.k, {}) : nav.go(s.k, s.k === 'tts' ? { tab: 'system' } : {});
  return <div className="scr">
    <div className="top" style={{ paddingLeft: 20 }}><b style={{ fontSize: 22, fontWeight: 900, flex: 1, fontFamily: 'var(--f-big)' }}>新建</b></div>
    <div className="scroll">
      <button data-anchor="new-rec" onClick={() => nav.go('record', {})} style={{ margin: '0 12px', width: 'calc(100% - 24px)', background: 'var(--ink)', color: 'var(--on-ink)', borderRadius: 26, padding: '18px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ width: 64, height: 64, borderRadius: 32, background: 'var(--on-ink)', display: 'grid', placeItems: 'center', flex: 'none' }}><span style={{ width: 26, height: 26, borderRadius: 13, background: 'var(--ink)' }} /></span>
        <span style={{ flex: 1 }}><span style={{ display: 'block', fontSize: 24, fontWeight: 900, fontFamily: 'var(--f-big)' }}>录音</span><span style={{ display: 'block', fontSize: 14, opacity: 0.85, lineHeight: 1.5 }}>能暂停、接着录，也能录一段插进别的声音</span></span>
      </button>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '12px 12px 0' }}>
        {SOURCES.map(s => <button key={s.k} data-anchor={'new-' + s.k} onClick={() => open(s)} style={{ background: 'var(--surface)', borderRadius: 20, padding: '14px 14px 12px', minHeight: 112, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
          <span style={{ display: 'flex', width: '100%', alignItems: 'center' }}><Ic n={s.ic} s={26} /><span style={{ flex: 1 }} />{s.member && <Member />}</span>
          <span style={{ fontSize: 17, fontWeight: 700 }}>{s.t}</span><span style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.4 }}>{s.d}</span>
        </button>)}
      </div>
      <button className="row" style={{ margin: '10px 0 0', alignItems: 'flex-start' }} onClick={() => nav.go('incoming', {})}>
        <Ic n="share" s={24} /><span className="row-m"><span style={{ display: 'block', fontSize: 15, lineHeight: 1.55 }}>在别的 App 里点「分享」，选「声剪」，声音也能进来；分享多个会接成一段。</span><span style={{ fontSize: 14, color: 'var(--ink-3)', textDecoration: 'underline', textUnderlineOffset: 3 }}>看看收到时什么样</span></span>
      </button>
      <div style={{ height: 14 }} />
    </div>
    <BottomNav cur="new" />
  </div>;
}

/* ================= record ================= */
function Record({ p }) {
  const { nav, g } = useContext(PhoneCtx);
  const [state, setState] = useState(p.state || 'idle');
  const [t, setT] = useState(p.state === 'rec' || p.state === 'paused' ? 42.3 : 0);
  const [mode, setMode] = useState(p.mode === 'insert' ? 'insert' : 'new');
  const [rs, setRs] = useState({ mic: '内置麦克风', ch: '单声道', gain: 6, mon: false });
  const [sheet, setSheet] = useState(p.sheet || null);
  const env = useMemo(() => SJ.speechEnvelope({ seconds: 200, rate: 20, seed: 23, lead: 0.5, pauses: [[20, 2], [61, 1.5]] }), []);
  useEffect(() => { if (state !== 'rec') return; let last = performance.now(), raf; const f = () => { const n = performance.now(); setT(x => x + (n - last) / 1000); last = n; raf = requestAnimationFrame(f); }; raf = requestAnimationFrame(f); return () => cancelAnimationFrame(raf); }, [state]);
  const ms = Math.floor((t % 1) * 10);
  return <div className="scr enter">
    <Top title={mode === 'insert' ? '录一段插进去' : '录音'} right={<button className="ib" onClick={() => setSheet('set')} aria-label="录音设置"><Ic n="gear" /></button>} />
    <div className="scroll">
      <div className="pad"><Seg items={[['new', '新录音'], ['insert', '插进「播客第 12 期」']]} value={mode} onChange={setMode} /></div>
      <div style={{ textAlign: 'center', marginTop: 26 }}>
        <div className="num" style={{ fontSize: 60, fontWeight: 700, lineHeight: 1, letterSpacing: 0 }}>{fmt(t)}<span style={{ fontSize: 30, color: 'var(--ink-3)' }}>.{ms}</span></div>
        <div style={{ fontSize: 15, color: 'var(--ink-2)', marginTop: 8, height: 22 }}>{state === 'rec' ? '正在录，声音大小合适' : state === 'paused' ? '已暂停，点中间接着录' : state === 'done' ? '录好了' : mode === 'insert' ? '录完会插在 0:42.3' : '点中间开始'}</div>
      </div>
      <div style={{ margin: '22px 16px 0', height: 96, position: 'relative', overflow: 'hidden', borderRadius: 16, background: 'var(--surface)' }}>
        {t > 0 && <div style={{ position: 'absolute', right: 164, top: 8 }}><Wave env={env} rate={20} from={Math.max(0, t - 18)} to={Math.max(18, t)} w={Math.min(164, t / 18 * 164) || 1} h={80} /></div>}
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: 'var(--ink)' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, marginTop: 26 }}>
        <button className="ib soft" style={{ width: 56, height: 56, borderRadius: 28, opacity: t > 0 ? 1 : 0.4 }} onClick={() => { setState('idle'); setT(0); }} aria-label="重录"><Ic n="trash" /></button>
        <button onClick={() => setState(state === 'rec' ? 'paused' : 'rec')} aria-label={state === 'rec' ? '暂停' : '录音'} style={{ width: 84, height: 84, borderRadius: 42, background: 'var(--ink)', display: 'grid', placeItems: 'center', boxShadow: state === 'rec' ? '0 0 0 8px var(--surface-3)' : 'none', animation: state === 'rec' ? 'pulse 1.4s ease-in-out infinite' : 'none' }}>
          {state === 'rec' ? <span style={{ display: 'flex', gap: 7 }}><i style={{ width: 8, height: 28, borderRadius: 2, background: 'var(--on-ink)' }} /><i style={{ width: 8, height: 28, borderRadius: 2, background: 'var(--on-ink)' }} /></span> : <span style={{ width: 32, height: 32, borderRadius: 16, background: 'var(--on-ink)' }} />}
        </button>
        <button className="ib soft" style={{ width: 56, height: 56, borderRadius: 28, opacity: t > 0 ? 1 : 0.4 }} onClick={() => { if (!t) return; setState('done'); nav.toast(mode === 'insert' ? '插好了：0:42.3 多了一段 ' + t.toFixed(1) + ' 秒' : '存成了新声音「新录音 11月23日 09:41」', '打开', () => nav.go('editor', {})); }} aria-label="完成"><Ic n="check" /></button>
      </div>
      <button className="row" style={{ marginTop: 22 }} onClick={() => setSheet('set')}>
        <Ic n="mic" s={22} /><span className="row-m"><span className="row-t" style={{ fontSize: 15 }}>{rs.mic}　{rs.ch}　增益 {rs.gain > 0 ? '+' : ''}{rs.gain} dB</span><span className="row-d">耳机监听{rs.mon ? '开' : '关'}</span></span><Ic n="chev" s={20} />
      </button>
      <div className="sec-h" style={{ marginTop: 10 }}><b>录过的</b><span>没录完的可以接着录</span></div>
      {RECS.map(r => <div key={r.id} className="row">
        <span style={{ width: 40, height: 40, borderRadius: 20, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', flex: 'none' }}><Ic n={r.resume ? 'rec' : 'voice'} s={18} /></span>
        <div className="row-m"><div className="row-t">{r.title}</div><div className="row-d"><span className="num">{fmt(r.len)}</span>　{r.note}</div></div>
        {r.resume && <button className="btn btn-s" style={{ height: 38, padding: '0 14px', fontSize: 15 }} onClick={() => { setT(r.len); setState('rec'); setMode('new'); }}>接着录</button>}
      </div>)}
      <div style={{ height: 16 }} />
    </div>
    {sheet === 'set' && <Sheet title="录音设置" close={() => setSheet(null)}><div style={{ padding: '0 20px 6px' }}>
      <div className="lbl" style={{ marginBottom: 6 }}>用哪个麦克风</div>
      {[['内置麦克风', '手机自带'], ['有线耳机', '插着的耳机麦克风'], ['USB 麦克风', '没检测到'], ['蓝牙耳机', '窄带，音质一般']].map(([k, d]) => <button key={k} className="row" style={{ padding: '8px 0', minHeight: 48 }} onClick={() => setRs({ ...rs, mic: k })}><span className={'radio' + (rs.mic === k ? ' on' : '')} /><span className="row-m"><span style={{ fontSize: 16 }}>{k}</span><span className="row-d">　{d}</span></span></button>)}
      <div style={{ marginTop: 10 }}><Seg items={['单声道', '立体声']} value={rs.ch} onChange={v => setRs({ ...rs, ch: v })} /></div>
      <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 16 }}><span style={{ fontSize: 16, flex: 1 }}>输入增益</span><b className="num">{rs.gain > 0 ? '+' : ''}{rs.gain} dB</b></div>
      <Slider value={rs.gain} min={-12} max={24} onChange={v => setRs({ ...rs, gain: Math.round(v) })} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}><div style={{ flex: 1 }}><div style={{ fontSize: 16 }}>耳机监听</div><div className="lbl">要插耳机；蓝牙耳机会慢半拍</div></div><Switch on={rs.mon} onClick={() => setRs({ ...rs, mon: !rs.mon })} /></div>
    </div></Sheet>}
  </div>;
}

/* ================= text to speech ================= */
function Tts({ p }) {
  const { nav, g, player } = useContext(PhoneCtx);
  const [tab, setTab] = useState(p.tab || 'online');
  const [text, setText] = useState(SJ.VOICES.ttsText);
  const [voice, setVoice] = useState(p.voice || (tab === 'system' ? 'sys-f' : 'linxi'));
  const [rate, setRate] = useState(1);
  const [gen, setGen] = useState(0);
  const online = SJ.VOICES.online.find(v => v.id === voice);
  const sel = online || SJ.VOICES.system.find(v => v.id === voice) || SJ.VOICES.mine[0];
  const needMember = (online || voice === 'me') && !g.member;
  useEffect(() => { if (!gen || gen >= 100) return; const t = setTimeout(() => setGen(Math.min(100, gen + 7)), 60); return () => clearTimeout(t); }, [gen]);
  useEffect(() => { if (gen >= 100) { nav.toast('生成好了：新声音「文字读出来」', '打开', () => nav.go('editor', { item: 'promo' })); setGen(0); } }, [gen]);
  return <div className="scr enter">
    <Top title="文字读出来" />
    <div className="scroll">
      <div className="pad">
        <div className="field" style={{ padding: '12px 14px' }}>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={3} style={{ width: '100%', border: 0, outline: 0, resize: 'none', background: 'transparent', fontSize: 18, lineHeight: 1.6 }} />
          <div style={{ display: 'flex', fontSize: 13, color: 'var(--ink-3)' }}><span style={{ flex: 1 }}>{text.length} 字</span><span>{online ? '在线音色每月 20 万字' : '本机朗读不限字数'}</span></div>
        </div>
      </div>
      <div className="sec-h" style={{ marginTop: 16 }}><b>谁来读</b></div>
      <div className="pad"><Seg items={[['system', '本机'], ['online', '真人感'], ['mine', '我的声音']]} value={tab} onChange={v => { setTab(v); setVoice(v === 'system' ? 'sys-f' : v === 'mine' ? 'me' : 'linxi'); }} /></div>
      {tab === 'system' && <div style={{ marginTop: 6 }}>
        {SJ.VOICES.system.map(v => <div key={v.id} role="button" className="row" style={{ cursor: 'pointer' }} onClick={() => setVoice(v.id)}><span className={'radio' + (voice === v.id ? ' on' : '')} /><span className="row-m"><span className="row-t">{v.name.replace('系统 · ', '')}</span><span className="row-d">手机自带，不联网，{v.quality}</span></span>
          <PlayBtn fill={false} size={40} on={player.on('v' + v.id)} onClick={e => { e.stopPropagation(); player.toggle('v' + v.id, 3); }} /></div>)}
        <div className="pad" style={{ fontSize: 14, color: 'var(--ink-3)', marginTop: 4 }}>免费，不限字数。想要更像真人的声音，看看「真人感」。</div>
      </div>}
      {tab === 'online' && (p.offline ? <div className="pad" style={{ marginTop: 10 }}><div style={{ background: 'var(--surface)', borderRadius: 18, padding: 16, display: 'flex', gap: 12 }}><Ic n="wifioff" s={26} /><div><div style={{ fontSize: 17, fontWeight: 700 }}>没连上网</div><div style={{ fontSize: 15, color: 'var(--ink-2)', marginTop: 4, lineHeight: 1.6 }}>真人感音色要联网。本机音色不受影响，现在就能用。</div><button className="btn btn-s" style={{ height: 40, marginTop: 10 }} onClick={() => nav.toast('还是没连上')}>再试一次</button></div></div></div>
        : <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '10px 12px 0' }}>
          {SJ.VOICES.online.map(v => { const on = voice === v.id, pl = player.on('v' + v.id); return <div key={v.id} data-anchor={'voice-' + v.id} onClick={() => setVoice(v.id)} style={{ background: 'var(--surface)', borderRadius: 20, padding: '12px 12px 10px', boxShadow: on ? 'inset 0 0 0 2px var(--ink)' : 'none', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><Voiceprint id={v.id} w={76} h={34} on={on} prog={pl ? player.t / 3 : -1} /><button className="ib soft" style={{ width: 36, height: 36 }} onClick={e => { e.stopPropagation(); player.toggle('v' + v.id, 3); }} aria-label="试听"><Ic n={pl ? 'pause' : 'play'} s={16} /></button></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}><b style={{ fontSize: 18 }}>{v.name}</b><span style={{ flex: 1 }} /><Member /></div>
            <div style={{ fontSize: 14, color: 'var(--ink-2)' }}>{plain(v.desc)}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>{v.use}</div>
          </div>; })}
          <div style={{ gridColumn: '1 / -1', fontSize: 14, color: 'var(--ink-3)', padding: '4px 4px 0', lineHeight: 1.6 }}>试听不要钱。真人感音色会把这段文字发到声剪的配音服务，不发你的录音。</div>
        </div>)}
      {tab === 'mine' && <div style={{ marginTop: 6 }}>
        <div className="row"><span className={'radio on'} /><Voiceprint id="me" w={56} h={30} /><span className="row-m"><span className="row-t">我的声音</span><span className="row-d">{SJ.VOICES.mine[0].desc}</span></span></div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 16px' }}>{['改名', '听原来那 5 秒', '重新克隆', '删除'].map(x => <button key={x} className="chip" style={{ height: 36 }} onClick={() => x === '重新克隆' ? nav.go('clone', {}) : nav.toast(x === '删除' ? '删除后要重新录 5 秒才能再用' : x)}>{x}</button>)}</div>
        <button className="row" style={{ marginTop: 8 }} onClick={() => nav.go('clone', {})}><Ic n="plus" /><span className="row-m" style={{ fontSize: 16 }}>再克隆一个声音</span><Member /></button>
      </div>}
      <div className="pad" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline' }}><span style={{ fontSize: 16, flex: 1 }}>语速</span><b className="num">{rate.toFixed(1)}×</b></div>
        <Slider value={rate} min={0.5} max={2} onChange={v => setRate(Math.round(v * 10) / 10)} />
      </div>
      <button className="row" style={{ marginTop: 10 }} onClick={() => nav.go('subtitle', {})}><Ic n="sub" /><span className="row-m"><span className="row-t">有字幕文件？逐句配音</span><span className="row-d">按字幕时间一句一句对齐</span></span><Ic n="chev" s={20} /></button>
      <div style={{ height: 12 }} />
    </div>
    <div className="bot">
      {gen > 0 ? <div><div style={{ display: 'flex', fontSize: 15, marginBottom: 6 }}><span style={{ flex: 1 }}>正在生成</span><span className="num">{gen}%</span></div><div className="bar"><i style={{ width: gen + '%' }} /></div></div>
        : <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-s" onClick={() => player.toggle('tts', 6)}>{player.on('tts') ? '停' : '试听'}</button>
          <button data-anchor="tts-go" className="btn btn-p" style={{ flex: 1 }} onClick={() => needMember ? nav.sheet('gate', { why: voice === 'me' ? 'clone' : 'voice', name: sel.name }) : setGen(1)}>{needMember ? `用「${sel.name}」要会员` : '生成'}</button>
        </div>}
    </div>
  </div>;
}

/* ================= clone ================= */
function Clone({ p }) {
  const { nav, g } = useContext(PhoneCtx);
  const [step, setStep] = useState(p.step || 1);
  const [t, setT] = useState(0);
  const [rec, setRec] = useState(false);
  const [agree, setAgree] = useState(false);
  useEffect(() => { if (!rec) return; const s = performance.now(); let raf; const f = () => { const x = (performance.now() - s) / 1000; if (x >= 5.2) { setT(5.2); setRec(false); setStep(2); return; } setT(x); raf = requestAnimationFrame(f); }; raf = requestAnimationFrame(f); return () => cancelAnimationFrame(raf); }, [rec]);
  const steps = ['照着读', '本机检查', '同意并保存'];
  return <div className="scr enter">
    <Top title="克隆我的声音" />
    <div className="scroll"><div className="pad">
      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>{steps.map((s, i) => <div key={s} style={{ flex: 1 }}><div style={{ height: 4, borderRadius: 2, background: i < step ? 'var(--ink)' : 'var(--surface-3)' }} /><div style={{ fontSize: 13, marginTop: 6, color: i + 1 === step ? 'var(--ink)' : 'var(--ink-3)', fontWeight: i + 1 === step ? 700 : 400 }}>{i + 1} {s}</div></div>)}</div>
      <div className="lbl">在安静的地方，照着读这句</div>
      <div style={{ fontFamily: 'var(--f-big)', fontSize: 26, fontWeight: 700, lineHeight: 1.5, marginTop: 6 }}>{SJ.VOICES.clonePassage}</div>
      {step === 1 && <div style={{ textAlign: 'center', marginTop: 30 }}>
        <button onClick={() => { setT(0); setRec(true); }} style={{ width: 88, height: 88, borderRadius: 44, background: 'var(--ink)', color: 'var(--on-ink)', display: 'inline-grid', placeItems: 'center', animation: rec ? 'pulse 1.4s ease-in-out infinite' : 'none' }} aria-label="开始读"><Ic n="mic" s={34} /></button>
        <div className="num" style={{ fontSize: 26, fontWeight: 700, marginTop: 12 }}>{t.toFixed(1)} 秒</div>
        <div style={{ fontSize: 14, color: 'var(--ink-2)' }}>{rec ? '读完会自动停' : '需要 3 到 6 秒'}</div>
      </div>}
      {step >= 2 && <div style={{ marginTop: 20, background: 'var(--surface)', borderRadius: 18, padding: '6px 14px' }}>
        {SJ.VOICES.cloneChecks.map(c => <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, borderBottom: '1px solid var(--line)' }}><span style={{ width: 24, height: 24, borderRadius: 12, background: 'var(--ink)', color: 'var(--on-ink)', display: 'grid', placeItems: 'center' }}><Ic n="check" s={15} w={2.8} /></span><span style={{ fontSize: 16 }}>{c}</span></div>)}
        <div style={{ fontSize: 14, color: 'var(--ink-2)', padding: '10px 0 8px' }}>都在手机上检查的，还没上传任何东西。</div>
      </div>}
      {step >= 2 && <button onClick={() => { setAgree(!agree); setStep(3); }} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginTop: 16, textAlign: 'left' }}>
        <span className={'ck' + (agree ? ' on' : '')} style={{ marginTop: 2 }}>{agree && <Ic n="check" s={18} w={2.6} />}</span>
        <span style={{ fontSize: 15, lineHeight: 1.65 }}>这是我自己的声音。我同意把这 5 秒录音传到声剪的配音服务，用来做成「我的声音」；随时可以在这里删除。</span>
      </button>}
    </div><div style={{ height: 14 }} /></div>
    <div className="bot">
      <button className="btn btn-p wide" style={{ opacity: step === 3 && agree ? 1 : 0.55 }} onClick={() => { if (!(step === 3 && agree)) { nav.toast(step === 1 ? '先照着读一遍' : '先勾上同意'); return; } if (!g.member) { nav.sheet('gate', { why: 'clone' }); return; } nav.toast('「我的声音」做好了，配音时就能选'); nav.back(); }}>保存成我的声音</button>
      <div style={{ fontSize: 14, color: 'var(--ink-3)', textAlign: 'center', marginTop: 6 }}>克隆声音是会员功能，录和检查都免费</div>
    </div>
  </div>;
}

/* ================= subtitle dubbing ================= */
function Subtitle({ p }) {
  const { nav, g } = useContext(PhoneCtx);
  const [run, setRun] = useState(p.run ? 3 : -1);
  const [voice, setVoice] = useState('中文女声');
  useEffect(() => { if (run < 0 || run >= CUES.length) return; const t = setTimeout(() => setRun(run + 1), 500); return () => clearTimeout(t); }, [run]);
  useEffect(() => { if (run === CUES.length) nav.toast('配好了：新声音带 5 个标记，每句一个', '打开', () => nav.go('editor', { item: 'promo' })); }, [run]);
  return <div className="scr enter">
    <Top title="字幕配音" />
    <div className="scroll">
      <div className="row" style={{ background: 'var(--surface)', margin: '0 12px', width: 'calc(100% - 24px)', borderRadius: 18 }}><Ic n="sub" /><div className="row-m"><div className="row-t">新品介绍.srt</div><div className="row-d"><span className="num">{CUES.length}</span> 句，<span className="num">0:13</span>，UTF-8</div></div><button className="btn-t" onClick={() => nav.toast('能读 SRT、WebVTT 和一行一句的纯文本')}>换文件</button></div>
      <div className="row" style={{ marginTop: 4 }}><Ic n="voice" /><div className="row-m"><div className="row-t">用谁读：{voice}</div><div className="row-d">本机音色，不联网</div></div>
        <button className="btn-t" onClick={() => g.member ? setVoice('林溪（真人感）') : nav.sheet('gate', { why: 'voice', name: '林溪' })}>换成林溪</button></div>
      <div style={{ margin: '4px 16px 8px', fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6 }}>每句放在字幕的时间上。说不完先用后面的空档，再加快（不变调，最多 1.3 倍），还不够才往后挪。</div>
      {CUES.map((c, i) => <div key={i} style={{ margin: '0 12px 8px', background: 'var(--surface)', borderRadius: 16, padding: '10px 14px', display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div className="num" style={{ fontSize: 13, color: 'var(--ink-3)' }}>{srt(c.a)} – {srt(c.b)}</div>
          <div style={{ fontSize: 16, lineHeight: 1.55, marginTop: 2 }}>{c.text}</div>
        </div>
        <div style={{ flex: 'none', textAlign: 'right', fontSize: 13, color: 'var(--ink-2)', paddingTop: 2, minWidth: 64 }}>{run > i ? <><span style={{ display: 'inline-grid', placeItems: 'center', width: 20, height: 20, borderRadius: 10, background: 'var(--ink)', color: 'var(--on-ink)', verticalAlign: -4, marginRight: 4 }}><Ic n="check" s={13} w={3} /></span>{c.fit}</> : run === i ? '正在读…' : c.fit === '刚好' ? '' : '会' + c.fit}</div>
      </div>)}
      <div style={{ height: 10 }} />
    </div>
    <div className="bot"><button className="btn btn-p wide" onClick={() => setRun(0)}>{run >= 0 && run < CUES.length ? `正在配第 ${run + 1} 句` : '开始配音'}</button></div>
  </div>;
}

/* ================= online music library ================= */
function Music({ p }) {
  const { nav, g, player } = useContext(PhoneCtx);
  const [cat, setCat] = useState(p.cat || '精选');
  const [open, setOpen] = useState(p.track || null);
  const tracks = cat === '精选' ? SJ.MUSIC.tracks : SJ.MUSIC.tracks.filter(t => t.cat === cat);
  const playing = SJ.MUSIC.tracks.find(t => player.on('m-' + t.id));
  const tr = open && SJ.MUSIC.tracks.find(t => t.id === open);
  const hero = SJ.MUSIC.tracks[0];
  const use = (t, how) => { if (t.vip && !g.member) { nav.sheet('gate', { why: 'vip', name: t.title }); return; } setOpen(null); player.stop(); if (how === 'bgm') nav.replace('tool', { id: 'bgm', track: t.id }); else nav.toast(`「${t.title}」导入成新声音了${t.credit ? '，署名已记下' : ''}`, '打开', () => nav.go('editor', { item: 'annual' })); };
  return <div className="scr enter">
    <Top title="音乐库" sub={p.pick ? '给「播客第 12 期」挑背景音乐' : null} right={<button className="ib" onClick={() => nav.toast('按曲名或心情找，比如「轻快」')} aria-label="搜索"><Ic n="search" /></button>} />
    <div className="scroll">
      {p.offline && <div style={{ margin: '0 12px 10px', background: 'var(--surface)', borderRadius: 16, padding: '10px 14px', display: 'flex', gap: 10, fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6 }}><Ic n="wifioff" s={22} /><span>曲库没连上。下面是上次的目录（11月22日），不是最新的；下载过的曲子照样能用。</span></div>}
      <div className="chips" style={{ marginBottom: 12 }}>{SJ.MUSIC.categories.map(c => <button key={c} className={'chip' + (cat === c ? ' on' : '')} onClick={() => setCat(c)}>{c}</button>)}</div>
      {cat === '精选' && <div onClick={() => setOpen(hero.id)} style={{ margin: '0 12px 12px', borderRadius: 24, overflow: 'hidden', position: 'relative', cursor: 'pointer', background: 'var(--surface)' }}>
        <Cover t={hero} w={336} h={176} r={0} />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '44px 16px 14px', background: 'linear-gradient(rgba(20,24,30,0), rgba(20,24,30,.9) 55%)', color: '#fff', display: 'flex', alignItems: 'flex-end', gap: 12 }}>
          <div style={{ flex: 1 }}><div style={{ fontSize: 14, opacity: 0.9 }}>这周放在最前面</div><div style={{ fontSize: 24, fontWeight: 900, fontFamily: 'var(--f-big)' }}>{hero.title}</div><div style={{ fontSize: 14, opacity: 0.9 }}>{hero.cat}，<span className="num">{fmt(hero.seconds)}</span>，可以商用</div></div>
          <button className="ib" style={{ width: 52, height: 52, borderRadius: 26, background: '#fff', color: '#1E2228' }} onClick={e => { e.stopPropagation(); player.toggle('m-' + hero.id, 30); }} aria-label="试听"><Ic n={player.on('m-' + hero.id) ? 'pause' : 'play'} /></button>
        </div>
      </div>}
      {tracks.map(t => { const on = player.on('m-' + t.id); return <div key={t.id} data-anchor={'track-' + t.id} className="row" style={{ cursor: 'pointer' }} onClick={() => setOpen(t.id)}>
        <div style={{ position: 'relative' }}><Cover t={t} s={52} r={12} /></div>
        <div className="row-m"><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="row-t">{t.title}</span>{t.vip && <Member />}</div><div className="row-d"><span className="num">{fmt(t.seconds)}</span>　{t.cat}{t.bpm ? <>　<span className="num">{t.bpm}</span> BPM</> : null}</div>
          {on && <div className="bar" style={{ height: 3, marginTop: 5 }}><i style={{ width: (player.t / 30 * 100) + '%' }} /></div>}</div>
        <PlayBtn fill={on} size={40} on={on} onClick={e => { e.stopPropagation(); player.toggle('m-' + t.id, 30); }} label="试听" />
      </div>; })}
      <div className="pad" style={{ fontSize: 14, color: 'var(--ink-3)', padding: '10px 16px 16px' }}>试听都免费。会员曲目导入和配乐要会员。</div>
    </div>
    {playing && !tr && <div className="bot" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
      <Cover t={playing} s={40} r={8} /><div style={{ flex: 1, minWidth: 0 }}><div className="row-t" style={{ fontSize: 15 }}>{playing.title}</div><div className="bar" style={{ height: 3, marginTop: 5 }}><i style={{ width: (player.t / 30 * 100) + '%' }} /></div></div>
      <button className="btn btn-p" style={{ height: 40, padding: '0 14px', fontSize: 15 }} onClick={() => use(playing, p.pick ? 'bgm' : 'import')}>{p.pick ? '用这首' : '导入'}</button>
    </div>}
    {tr && <Sheet title="" close={() => setOpen(null)}><div style={{ padding: '0 20px' }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}><Cover t={tr} s={96} r={18} /><div><div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'var(--f-big)' }}>{tr.title}</div><div style={{ fontSize: 14, color: 'var(--ink-2)' }}>{tr.cat}，<span className="num">{fmt(tr.seconds)}</span>{tr.bpm ? <>，<span className="num">{tr.bpm}</span> BPM</> : null}</div>{tr.vip && <div style={{ marginTop: 6 }}><Member /></div>}</div></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}><PlayBtn on={player.on('m-' + tr.id)} onClick={() => player.toggle('m-' + tr.id, 30)} /><div style={{ flex: 1 }}><Wave env={envMusic()} rate={20} from={0} to={tr.seconds} w={250} h={40} /></div></div>
      <div style={{ marginTop: 16, fontSize: 15, lineHeight: 1.7 }}>
        <div><b>授权</b>　{tr.licence}，{tr.commercial ? '可以商用' : '不能商用'}</div>
        <div><b>署名</b>　{tr.credit ? `要署名：「${tr.credit}」。会自动记在工程里，导出时写进文件备注。` : '不用署名'}</div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 16, marginBottom: 6 }}>
        <button className="btn btn-s" style={{ flex: 1 }} onClick={() => use(tr, 'import')}>导入成新声音</button>
        <button className="btn btn-p" style={{ flex: 1 }} onClick={() => use(tr, 'bgm')}>{tr.vip && !g.member ? '会员曲目' : '配背景音乐'}</button>
      </div>
    </div></Sheet>}
  </div>;
}

/* ================= shared in from another app ================= */
function Incoming() {
  const { nav } = useContext(PhoneCtx);
  const [how, setHow] = useState('join');
  const files = PHONE_FILES.slice(3, 5).concat([{ n: '舞曲 05 水兵舞.mp3', s: 226 }]);
  return <div className="scr enter">
    <Top title="收到 3 个文件" sub="从「文件管理」分享过来" />
    <div className="scroll">
      {files.map(f => <div key={f.n} className="row"><Ic n="music" /><div className="row-m"><div className="row-t">{f.n}</div><div className="row-d num">{fmt(f.s)}</div></div></div>)}
      <div className="pad" style={{ marginTop: 14 }}><Seg items={[['join', '接成一段'], ['each', '分别导入']]} value={how} onChange={setHow} /></div>
      <div className="pad" style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 10, lineHeight: 1.6 }}>{how === 'join' ? '按上面的顺序接起来，每首开头放一个标记，写上文件名。' : '变成 3 段各自独立的声音。'}</div>
    </div>
    <div className="bot"><button className="btn btn-p wide" onClick={() => { nav.toast(how === 'join' ? '接成了一段 11:05，带 3 个标记' : '导入了 3 段声音'); nav.tab('home'); }}>导入</button></div>
  </div>;
}
function Files({ p }) {
  const { nav } = useContext(PhoneCtx);
  const [sel, setSel] = useState(p.sel || [3, 4]);
  return <div className="scr enter">
    <Top title="手机里的文件" sub="多选会按选的顺序接成一段" />
    <div className="scroll">{PHONE_FILES.map((f, i) => { const k = sel.indexOf(i); return <button key={f.n} className="row" onClick={() => setSel(k >= 0 ? sel.filter(x => x !== i) : sel.length < 20 ? [...sel, i] : sel)}>
      <span className={'ck' + (k >= 0 ? ' on' : '')} style={{ fontSize: 13, fontWeight: 700 }}>{k >= 0 ? k + 1 : ''}</span>
      <div className="row-m"><div className="row-t">{f.n}</div><div className="row-d"><span className="num">{fmt(f.s)}</span>　{f.d}</div></div></button>; })}</div>
    <div className="bot"><button className="btn btn-p wide" onClick={() => { nav.toast(sel.length > 1 ? `接成了一段，${sel.length} 个文件各放一个标记` : '导入好了'); nav.tab('home'); }}>{sel.length > 1 ? `接成一段（${sel.length} 个）` : '导入'}</button></div>
  </div>;
}
function Video() {
  const { nav } = useContext(PhoneCtx);
  const [prog, setProg] = useState(-1);
  useEffect(() => { if (prog < 0 || prog >= 100) return; const t = setTimeout(() => setProg(Math.min(100, prog + 9)), 70); return () => clearTimeout(t); }, [prog]);
  useEffect(() => { if (prog >= 100) { nav.toast('取好了：「毕业典礼」的声音，3:48'); nav.go('editor', { item: 'grad' }); } }, [prog]);
  return <div className="scr enter">
    <Top title="视频里的声音" />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 12px' }}>{VIDEOS.map((v, i) => <button key={v.n} onClick={() => setProg(0)} style={{ background: 'var(--surface)', borderRadius: 16, overflow: 'hidden', textAlign: 'left' }}>
      <div style={{ height: 96, background: i % 2 ? 'var(--surface-3)' : 'var(--ink)', display: 'grid', placeItems: 'center', color: i % 2 ? 'var(--ink)' : 'var(--on-ink)' }}><Ic n="video" s={30} /></div>
      <div style={{ padding: '8px 10px' }}><div className="row-t" style={{ fontSize: 15 }}>{v.n}</div><div className="row-d num">{fmt(v.s)}</div></div></button>)}</div>
    {prog >= 0 && <div className="pad" style={{ marginTop: 18 }}><div style={{ fontSize: 15, marginBottom: 6 }}>正在取出声音 <span className="num">{prog}%</span></div><div className="bar"><i style={{ width: prog + '%' }} /></div></div>}
  </div>;
}

Object.assign(window, { NewScreen, Record, Tts, Clone, Subtitle, Music, Incoming, Files, Video, SOURCES });
