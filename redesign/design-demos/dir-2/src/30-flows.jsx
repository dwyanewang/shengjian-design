/* ===================== 30 · 一个字一件事的引导流程 ===================== */
// 流程头：开头半屏巨字只做一步；开始干活后巨字缩成左上角角标
function FlowHead({ ch, compact, title, step, total, onBack, crop }) {
  const c = crop || {};
  const st = compact ? { left: 59, bottom: 20, fontSize: 28 } : { left: c.x != null ? c.x : -18, bottom: c.y != null ? c.y : -84, fontSize: c.fs || 366 };
  return <div className={'fh' + (compact ? ' c' : '')}>
    <button className="pib fh-back" onClick={onBack} aria-label="返回"><Ic n="back" /></button>
    {total ? <div className="fh-step">第 {step} 步，共 {total} 步</div> : null}
    <div className="fh-badge" style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }} />
    <span className="fh-ch" style={st}>{ch}</span>
    <div className="fh-t"><b className="ell">{title}</b><span>{total ? `第 ${step} 步，共 ${total} 步` : ''}</span></div>
  </div>;
}
function useFlow(nav, first, compactFn) {
  const r = nav.route; const step = r.step || first;
  const compact = compactFn ? compactFn(step) : step !== first;
  useTone(compact ? 'dark' : 'light');
  return { r, step, compact, go: (s, extra) => nav.replace({ ...r, step: s, ...(extra || {}) }) };
}
const Q = ({ t, sub }) => <div style={{ padding: '18px 16px 6px' }}><div className="pt1">{t}</div>{sub && <div className="psub" style={{ marginTop: 4 }}>{sub}</div>}</div>;
const SrcRow = ({ ch, t, sub, onClick, tone = 'tint' }) => <button className="prow" onClick={onClick}><Han ch={ch} s={48} tone={tone} fs={26} /><div className="mid"><div className="pt3">{t}</div>{sub && <div className="psub">{sub}</div>}</div><Ic n="right" s={18} c="#999" /></button>;

/* ---------- 铃：选歌 → 找副歌 → 30 秒 → 设成铃声 ---------- */
function Ling({ nav }) {
  const { step, compact, go } = useFlow(nav, 'pick', s => s !== 'pick' && s !== 'done');
  const P = nav.player;
  const [cand, setCand] = useState(0), [len, setLen] = useState(30), [off, setOff] = useState(0), [kind, setKind] = useState(0), [perm, setPerm] = useState(false);
  const C = SJ.CHORUS[cand]; const start = C.from + off, end = start + len;
  const no = { pick: 1, chorus: 2, length: 3, set: 4, done: 4 }[step];
  const subs = SJ.EXPORT.purposes[1].subs;
  const wf = SJ.LIBRARY.find(x => x.id === 'wanfeng');
  let body, foot;
  if (step === 'pick') {
    body = <Fragment><Q t="选一首歌" sub="铃声从它的副歌里剪" />
      <button className="prow" onClick={() => go('chorus')}><Cover id="wanfeng" title={wf.title} size={56} /><div className="mid"><div className="pt3">{wf.title}</div><div className="psub num">3:52　库里的，今天 08:15</div></div><Ic n="right" s={18} c="#999" /></button>
      <button className="prow" onClick={() => go('chorus')}><Cover id="dance" title="广场舞串烧" size={56} /><div className="mid"><div className="pt3">广场舞串烧 · 6 首</div><div className="psub num">23:05　库里的</div></div><Ic n="right" s={18} c="#999" /></button>
      <SrcRow ch="开" t="手机里的歌" sub="从文件里挑一首" onClick={() => nav.push({ name: 'files' })} />
      <SrcRow ch="乐" t="在线音乐库" sub="可以免费用的曲子" tone="ink" onClick={() => nav.push({ name: 'music' })} /></Fragment>;
  } else if (step === 'chorus') {
    body = <Fragment><Q t="找到 3 段副歌" sub="选一段，先点方块听听" />
      <div className="pad" style={{ paddingTop: 10 }}>
        <Wave env={ENV.music} rate={20} h={78} bar={1} gap={1} color="#000">
          {SJ.CHORUS.map((c, i) => <Fragment key={i}><div className="wv-reg" style={{ left: pct(c.from, 0, 232), width: pct(c.to - c.from, 0, 232), background: cand === i ? 'rgba(43,59,255,.22)' : 'transparent', boxShadow: `inset 0 0 0 2px ${cand === i ? BLUE : 'rgba(0,0,0,.35)'}` }} />
            <span className={'numtag' + (cand === i ? ' b' : '')} style={{ left: pct((c.from + c.to) / 2, 0, 232), top: -22 }}>{i + 1}</span></Fragment>)}
          {P.key && P.key.startsWith('ch') && <div className="wv-ph" style={{ left: pct(P.t, 0, 232) }} />}
        </Wave>
        <div className="secbar">{SJ.SECTIONS.map((s, i) => <span key={i} style={{ width: pct(s.to - s.from, 0, 232), background: s.name === '副歌' ? '#000' : i % 2 ? TINT : '#fff', color: s.name === '副歌' ? '#fff' : '#000' }}>{(s.to - s.from) > 24 ? s.name : ''}</span>)}</div>
        <div className="ruler"><span>0:00</span><span>1:00</span><span>2:00</span><span>3:00</span><span>3:52</span></div>
      </div>
      <div style={{ height: 8 }} />
      {SJ.CHORUS.map((c, i) => <div key={i} className={'prow' + (cand === i ? ' on' : '')} onClick={() => setCand(i)}>
        <PlayBtn on={P.on('ch' + i)} s={44} tone={cand === i ? 'blue' : 'ink'} onClick={() => { setCand(i); P.toggle('ch' + i, 30, c.from); }} />
        <div className="mid"><div className="pt3 num">{fmt(c.from)} – {fmt(c.to)}</div><div className="psub">第 {[2, 3, 1][i]} 次副歌{i === 0 ? '，重复最多' : i === 2 ? '，弱一点' : ''}</div></div>
        {i === 0 ? <span className="tag b">最像副歌</span> : null}<Radio on={cand === i} />
      </div>)}</Fragment>;
    foot = <button className="pbtn" onClick={() => { P.stop(); go('length'); }}>用第 {cand + 1} 段</button>;
  } else if (step === 'length') {
    const a = start - 6, b = start + 36; const on = P.on('len');
    body = <Fragment><Q t="铃声多长？" />
      <div className="pad"><Seg opts={[{ v: 20, l: '20 秒' }, { v: 30, l: '30 秒' }]} value={len} onChange={setLen} /></div>
      <div className="pad" style={{ paddingTop: 22 }}>
        <Wave env={ENV.music} rate={20} from={a} to={b} h={104} bar={2} gap={1}>
          <div className="wv-sel" style={{ left: pct(start, a, b), width: pct(len, 0, b - a) }}><i className="hd l" /><i className="hd r" /></div>
          <svg className="wv-reg" style={{ left: pct(end - 1, a, b), width: pct(1, 0, b - a), height: '100%' }} viewBox="0 0 10 100" preserveAspectRatio="none"><path d="M0 0 L10 100 L0 100Z" fill="rgba(255,255,255,.75)" /><path d="M0 0 L10 100" stroke={BLUE} strokeWidth="1.2" vectorEffect="non-scaling-stroke" /></svg>
          {on && <div className="wv-ph" style={{ left: pct(P.t, a, b) }} />}
        </Wave>
        <div className="len-row"><button className="chip" onClick={() => setOff(off - 1)}>早 1 秒</button><div className="pt2 num" style={{ textAlign: 'center', flex: 1 }}>{fmtT(start)} – {fmtT(end)}</div><button className="chip" onClick={() => setOff(off + 1)}>晚 1 秒</button></div>
        <div className="fadenote"><svg width="34" height="20" viewBox="0 0 34 20"><path d="M2 3h20l10 15H2z" fill={TINT} /><path d="M22 3l10 15" stroke={BLUE} strokeWidth="2" /></svg><span>最后 1 秒自动淡出，不会戛然而止</span></div>
        <button className="pbtn line" style={{ marginTop: 14 }} onClick={() => P.toggle('len', len, start)}><Ic n={on ? 'stop' : 'play'} s={20} />{on ? '停' : '听这 ' + len + ' 秒'}</button>
      </div></Fragment>;
    foot = <button className="pbtn" onClick={() => { P.stop(); go('set'); }}>就这样</button>;
  } else if (step === 'set') {
    body = <Fragment><Q t="设成什么？" sub="系统会问一次：允许声剪改铃声吗" />
      {subs.map((s, i) => <div key={s} className={'prow' + (kind === i ? ' on' : '')} onClick={() => setKind(i)} style={{ minHeight: 72 }}>
        <Han ch={['话', '知', '闹'][i]} s={48} tone={kind === i ? 'blue' : 'tint'} fs={26} />
        <div className="mid"><div className="pt3">{s}</div><div className="psub">{['有人打电话时响', '收到通知时响一下', '早上叫你起床'][i]}</div></div><Radio on={kind === i} /></div>)}
      <div className="pad" style={{ display: 'flex', gap: 20, paddingTop: 10 }}><button className="plink" onClick={() => nav.push({ name: 'export', purpose: 'file', item: 'wanfeng' })}>存成文件</button><button className="plink" onClick={() => nav.push({ name: 'export', purpose: 'share', item: 'wanfeng' })}>发给别人</button></div>
    </Fragment>;
    foot = <button className="pbtn" onClick={() => setPerm(true)}>设成{subs[kind]}</button>;
  } else {
    body = <div className="pad" style={{ paddingTop: 22 }}>
      <div className="pt0">好了。</div>
      <div className="pbody" style={{ marginTop: 8 }}>{['来电时', '收到通知时', '闹钟响时'][kind]}就放这 {len} 秒：晚风，{fmt(start)} 到 {fmt(end)}。</div>
      <div className="infobox" style={{ marginTop: 14 }}>原歌没动。这一段存成了新版本「副歌铃声 {len} 秒」，在音频库里。</div>
    </div>;
    foot = <div className="pbtn2"><button className="pbtn line" onClick={() => nav.reset({ name: 'home', tab: 'lib' })}>去音频库</button><button className="pbtn" onClick={() => { go('pick'); setOff(0); }}>再做一个</button></div>;
  }
  return <div className="pr np">
    <FlowHead ch="铃" compact={compact} title="做铃声" step={no} total={4} onBack={() => { P.stop(); const order = ['pick', 'chorus', 'length', 'set']; const i = order.indexOf(step); i > 0 ? go(order[i - 1]) : nav.back(); }} />
    <div className="ps">{body}<div style={{ height: 16 }} /></div>
    {foot && <div className="pfoot">{foot}</div>}
    {perm && <div className="sysdlg-bg"><div className="sysdlg"><div className="pt3">允许「声剪」修改系统设置？</div><div className="psub" style={{ marginTop: 8 }}>只用于把这段声音设成{subs[kind]}。</div><div className="sysdlg-b"><button onClick={() => setPerm(false)}>不允许</button><button onClick={() => { setPerm(false); go('done'); }}>允许</button></div></div></div>}
  </div>;
}

/* ---------- 配：写字 → 选声音（在线是会员）→ 生成 → 配乐 / 导出 ---------- */
function VoiceCard({ v, on, onPick, nav, offline }) {
  const P = nav.player; const pl = P.on('vs-' + v.id);
  return <div className={'vcard' + (on ? ' on' : '') + (offline ? ' off' : '')} onClick={onPick}>
    <div className="vcard-top"><VoicePrint id={v.id} size={40} tone="ink" /><div className="vcard-t"><b>{v.name}</b><span>{v.desc}</span></div></div>
    <div className="vcard-use">{v.use}</div>
    <button className="vcard-p" onClick={e => { e.stopPropagation(); P.toggle('vs-' + v.id, 4); }} aria-label="试听"><Ic n={pl ? 'stop' : 'play'} s={14} /></button>
    {pl && <div className="vcard-say">「{v.sample}」</div>}
  </div>;
}
function VoicePicker({ nav, voice, setVoice, compactSys }) {
  const V = SJ.VOICES; const off = nav.state.offline; const P = nav.player;
  return <Fragment>
    <div className="sect"><b>真人感</b><span>在线</span><span className="tag" style={{ marginLeft: 'auto' }}>会员</span></div>
    {off && <div className="pad" style={{ paddingBottom: 8 }}><div className="infobox">没连上网。在线音色暂时用不了，先用手机自带的声音，联网后可以重新生成。</div></div>}
    <div className="vgrid">{V.online.map(v => <VoiceCard key={v.id} v={v} nav={nav} on={voice === v.id} offline={off} onPick={() => !off && setVoice(v.id)} />)}</div>
    <div className="sect"><b>手机自带</b><span>离线，免费</span></div>
    {V.system.map(v => <div key={v.id} className={'prow' + (voice === v.id ? ' on' : '')} onClick={() => setVoice(v.id)} style={{ minHeight: 56 }}>
      <VoicePrint id={v.id} size={40} tone="tint" /><div className="mid"><div className="pt3" style={{ fontSize: 16 }}>{v.name.replace('系统 · ', '')}</div><div className="psub">{v.quality}</div></div><Radio on={voice === v.id} /></div>)}
    <div className="sect"><b>我的声音</b></div>
    <div className={'prow' + (voice === 'me' ? ' on' : '')} onClick={() => !off && setVoice('me')}><VoicePrint id="me" size={40} tone="blue" /><div className="mid"><div className="pt3" style={{ fontSize: 16 }}>我的声音</div><div className="psub">{V.mine[0].desc}</div></div><span className="tag">会员</span><Radio on={voice === 'me'} /></div>
    {!compactSys && <SrcRow ch="克" t="克隆我的声音" sub="照着读 5 秒" tone="blue" onClick={() => nav.push({ name: 'clone' })} />}
  </Fragment>;
}
const voiceName = id => { const V = SJ.VOICES; const v = [...V.online, ...V.system, ...V.mine].find(x => x.id === id); return v ? v.name.replace('系统 · ', '') : ''; };
const isOnline = id => SJ.VOICES.online.some(v => v.id === id) || id === 'me';

function MixPanel({ nav, voiceEnv = ENV.tts, voiceLen = 9.4, track, setTrack }) {
  const [duck, setDuck] = useState(true), [vol, setVol] = useState(0.35), [pick, setPick] = useState(false), [fade, setFade] = useState(true);
  const P = nav.player; const t = SJ.MUSIC.tracks.find(x => x.id === track);
  const menv = trackEnv(t.id, t.seconds, t.bpm);
  const ducked = useMemo(() => mapEnv(menv.slice(0, Math.round(voiceLen * 20)), (v, i) => { const vi = voiceEnv[Math.min(voiceEnv.length - 1, Math.round(i / 20 * 50))]; return v * (0.35 + vol * 1.7) * (duck && vi > 0.1 ? 0.4 : 1); }), [menv, vol, duck, voiceLen]);
  return <Fragment>
    <button className="prow" onClick={() => setPick(true)}><Cover id={t.id} title={t.title} size={52} /><div className="mid"><div className="pt3">{t.title}</div><div className="psub num">{fmt(t.seconds)}　{t.cat}{t.vip ? '' : '　免费'}</div></div><span className="chip">换一首</span></button>
    <div className="pad" style={{ paddingTop: 8 }}>
      <div className="pk" style={{ marginBottom: 6 }}>人声</div><Wave env={voiceEnv} rate={50} h={46} bar={2} gap={1} />
      <div className="pk" style={{ margin: '12px 0 6px' }}>音乐{duck ? '（说话时让开）' : ''}</div><Wave env={ducked} rate={20} h={46} bar={2} gap={1} color={BLUE} />
      <button className="pbtn line sm" style={{ marginTop: 14 }} onClick={() => P.toggle('mix', voiceLen)}><Ic n={P.on('mix') ? 'stop' : 'play'} s={18} />{P.on('mix') ? '停' : '听一遍'}</button>
    </div>
    <div className="prow" onClick={() => setDuck(!duck)}><div className="mid"><div className="pt3" style={{ fontSize: 16 }}>说话时音乐自动让开</div><div className="psub">人声一出来，音乐降低 9 dB</div></div><Tog on={duck} onChange={setDuck} /></div>
    <div className="pad" style={{ paddingBottom: 6 }}><div className="pk">音乐音量</div><Slider v={vol} onChange={setVol} /></div>
    <div className="prow" onClick={() => setFade(!fade)}><div className="mid"><div className="pt3" style={{ fontSize: 16 }}>结尾音乐淡出</div></div><Tog on={fade} onChange={setFade} /></div>
    {t.credit && <div className="pad psm" style={{ paddingTop: 6 }}>这首要求署名，导出时会自动写进文件备注：{t.credit}</div>}
    {pick && <div className="overlay"><MusicLib nav={nav} pickMode onPick={id => { setTrack(id); setPick(false); }} onClose={() => setPick(false)} /></div>}
  </Fragment>;
}

function Pei({ nav }) {
  const { step, compact, go } = useFlow(nav, 'text');
  const [text, setText] = useState(SJ.VOICES.ttsText), [voice, setVoice] = useState(nav.route.voice || 'linxi'), [speed, setSpeed] = useState('正常'), [gate, setGate] = useState(!!nav.route.gate), [track, setTrack] = useState('m1');
  const P = nav.player; const no = { text: 1, voice: 2, gen: 3, result: 3, mix: 3 }[step];
  useEffect(() => { if (step === 'gen') { const id = setTimeout(() => go('result'), 1500); return () => clearTimeout(id); } }, [step]);
  let body, foot;
  if (step === 'text') {
    body = <Fragment><Q t="写下要读的话" />
      <div className="pad"><textarea className="field" rows={5} value={text} onChange={e => setText(e.target.value)} />
        <div className="psub num" style={{ marginTop: 6 }}>{text.length} 字，读出来大约 {Math.round(text.length / 3.6)} 秒</div>
        <button className="plink" onClick={() => nav.push({ name: 'subtitle' })}>有字幕文件？用「字」一句一句配</button></div></Fragment>;
    foot = <button className="pbtn" onClick={() => go('voice')}>选个声音</button>;
  } else if (step === 'voice') {
    body = <Fragment><Q t="谁来读？" sub="试听不要钱，点声纹右下角" />
      <VoicePicker nav={nav} voice={voice} setVoice={setVoice} />
      <div className="pad" style={{ paddingTop: 14 }}><div className="pk" style={{ marginBottom: 8 }}>语速</div><Seg opts={['慢一点', '正常', '快一点']} value={speed} onChange={setSpeed} /></div></Fragment>;
    foot = <button className="pbtn" onClick={() => { if (isOnline(voice) && !nav.state.member) setGate(true); else go('gen'); }}>用「{voiceName(voice)}」读</button>;
  } else if (step === 'gen') {
    body = <div className="pad" style={{ paddingTop: 40 }}><div className="pt2">{voiceName(voice)}正在读…</div><div style={{ marginTop: 18 }}><div className="bar-prog" style={{ height: 8 }}><i style={{ width: '100%', transition: 'width 1.4s linear', animation: 'grow 1.4s linear', transformOrigin: 'left' }} /></div></div><div className="psub" style={{ marginTop: 10 }}>{isOnline(voice) ? '在线生成，只发送这段文字' : '在手机上生成，不用联网'}</div></div>;
  } else if (step === 'result') {
    const on = P.on('tts');
    body = <Fragment><Q t="读好了" sub={<span className="num">新品介绍配音　0:09　已存进音频库</span>} />
      <div className="pad" style={{ paddingTop: 12 }}>
        <Wave env={ENV.tts} rate={50} h={90} bar={2} gap={1}>{on && <div className="wv-ph" style={{ left: pct(P.t, 0, 9.4) }} />}</Wave>
        <div className="ruler"><span>0:00</span><span>0:09</span></div>
        <button className="pbtn line" style={{ marginTop: 12 }} onClick={() => P.toggle('tts', 9.4)}><Ic n={on ? 'stop' : 'play'} s={20} />{on ? '停' : '听听'}</button>
        <div style={{ display: 'flex', gap: 20 }}><button className="plink" onClick={() => go('voice')}>换个声音</button><button className="plink" onClick={() => go('text')}>改改字</button></div>
        {isOnline(voice) && <div className="psm" style={{ marginTop: 6 }}>用在线音色做的，导出的文件信息里会注明「AI 合成」。</div>}
      </div></Fragment>;
    foot = <div className="pbtn2"><button className="pbtn line" onClick={() => nav.push({ name: 'export', item: 'promo' })}>直接导出</button><button className="pbtn" onClick={() => go('mix')}>配背景音乐</button></div>;
  } else {
    body = <Fragment><Q t="配背景音乐" sub="以后还能回来调，配乐设置都留着" /><MixPanel nav={nav} track={track} setTrack={setTrack} /></Fragment>;
    foot = <button className="pbtn" onClick={() => { nav.toast('存成了新音频「新品介绍配音 · 配乐」'); nav.push({ name: 'export', item: 'promo' }); }}>存好，去导出</button>;
  }
  return <div className="pr np">
    <FlowHead ch="配" compact={compact} title="文字配音" step={no} total={3} crop={{ x: -10, y: -70 }} onBack={() => { const o = ['text', 'voice', 'result', 'mix']; const i = o.indexOf(step === 'gen' ? 'voice' : step); i > 0 ? go(o[i - 1]) : nav.back(); }} />
    <div className="ps">{body}<div style={{ height: 16 }} /></div>
    {foot && <div className="pfoot">{foot}</div>}
    {gate && <MemberSheet nav={nav} why={{ title: voiceName(voice) + '是会员音色', sub: '真人感在线音色，每月 20 万字。刚才的试听不要钱。', skip: '在线真人感' }} onClose={() => setGate(false)} onFree={() => setVoice('sys-f')} freeLabel="先用手机自带的" />}
  </div>;
}

/* ---------- 净：选录音 → 听前后、开关三件事 → 存成新版本 ---------- */
function Jing({ nav }) {
  const { step, compact, go } = useFlow(nav, 'pick');
  const P = nav.player;
  const [ab, setAb] = useState('b'), [dn, setDn] = useState(true), [lvl, setLvl] = useState('中'), [ps, setPs] = useState(true), [ld, setLd] = useState(true);
  const env = ab === 'a' ? ENV.speech : (ps ? (dn ? ENV.clean : cutEnv(ENV.speech, 50, PAUSE_CUT)) : (dn ? ENV.denoised : ENV.speech));
  const on = P.on('jing');
  const no = { pick: 1, compare: 2, saved: 2 }[step];
  let body, foot;
  if (step === 'pick') {
    body = <Fragment><Q t="哪段录音要弄干净？" />
      {['interview', 'meeting', 'grad', 'lesson'].map(id => { const it = LIB.find(x => x.id === id); return <button key={id} className="prow" onClick={() => go('compare')}><Han ch={it.ch} s={48} tone="tint" fs={26} /><div className="mid"><div className="pt3 ell" style={{ fontSize: 16 }}>{it.title}</div><div className="psub num">{fmt(it.seconds)}　{it.date}</div></div><Ic n="right" s={18} c="#999" /></button>; })}
      <SrcRow ch="录" t="现在录一段" onClick={() => nav.push({ name: 'record' })} /></Fragment>;
  } else if (step === 'compare') {
    body = <Fragment>
      <div className="pad" style={{ paddingTop: 16 }}><Seg opts={[{ v: 'a', l: '之前' }, { v: 'b', l: '变干净之后' }]} value={ab} onChange={setAb} /></div>
      <div className="pad" style={{ paddingTop: 16 }}>
        <Wave env={env} rate={50} from={0} to={40} h={96} bar={2} gap={1}>{on && <div className="wv-ph" style={{ left: pct(P.t, 0, 40) }} />}</Wave>
        <div className="ruler"><span>0:00</span><span>0:10</span><span>0:20</span><span>0:30</span><span>0:40</span></div>
        <div className="jing-say">{ab === 'a' ? '底噪一直在，开头 2.6 秒只有空调声，中间有长停顿。' : [dn && '底噪压下去了', ps && '停顿缩到 0.3 秒', ld && '音量统一到 -16 LUFS'].filter(Boolean).join('，') + '。'}</div>
        <button className="pbtn line sm" onClick={() => P.toggle('jing', 40)}><Ic n={on ? 'stop' : 'play'} s={18} />{on ? '停' : ab === 'a' ? '听之前' : '听之后'}</button>
      </div>
      <div style={{ height: 8 }} />
      <div className="prow" onClick={() => setDn(!dn)}><Han ch="噪" s={40} tone="tint" fs={22} /><div className="mid"><div className="pt3" style={{ fontSize: 16 }}>降噪</div><div className="psub">空调、风扇这类一直在的声音</div></div><Tog on={dn} onChange={setDn} /></div>
      {dn && <div className="pad" style={{ paddingBottom: 10 }}><Seg opts={['轻', '中', '重']} value={lvl} onChange={setLvl} /></div>}
      <div className="prow" onClick={() => setPs(!ps)}><Han ch="停" s={40} tone="tint" fs={22} /><div className="mid"><div className="pt3" style={{ fontSize: 16 }}>删掉长停顿</div><div className="psub">9 处，每处留 0.3 秒，省 14 秒</div></div><Tog on={ps} onChange={setPs} /></div>
      <div className="prow" onClick={() => setLd(!ld)}><Han ch="匀" s={40} tone="tint" fs={22} /><div className="mid"><div className="pt3" style={{ fontSize: 16 }}>统一音量</div><div className="psub">按语音的标准，不会爆音</div></div><Tog on={ld} onChange={setLd} /></div>
      <div className="pad"><button className="plink" onClick={() => nav.push({ name: 'tool', id: 'repair' })}>还有电流声、咔哒声？用「修」</button></div>
    </Fragment>;
    foot = <Fragment><button className="pbtn" onClick={() => { P.stop(); go('saved'); }}>存成新版本</button><div className="note">原录音不会被改</div></Fragment>;
  } else {
    const names = [...LIB[0].versionNames, '变干净'];
    body = <div style={{ paddingTop: 18 }}>
      <div className="pad"><div className="pt0">存好了。</div><div className="pbody" style={{ marginTop: 6 }}>播客第 12 期现在有 4 个版本，原始录音还在。</div></div>
      <div style={{ marginTop: 14 }}>{names.map((n, i) => <div key={n} className={'prow' + (i === 3 ? ' on' : '')} style={{ minHeight: 56 }}><span className="vnum num">{i + 1}</span><div className="mid"><div className="pt3" style={{ fontSize: 16 }}>{n}</div></div>{i === 3 ? <span className="tag b">新</span> : <PlayBtn s={36} tone="tint" on={P.on('sv' + i)} onClick={() => P.toggle('sv' + i, 8)} />}</div>)}</div>
    </div>;
    foot = <div className="pbtn2"><button className="pbtn line" onClick={() => nav.push({ name: 'edit' })}>接着剪</button><button className="pbtn" onClick={() => nav.push({ name: 'export', item: 'interview' })}>导出</button></div>;
  }
  return <div className="pr np">
    <FlowHead ch="净" compact={compact} title="录音变干净" step={no} total={2} crop={{ x: -6, y: -66 }} onBack={() => { P.stop(); step === 'pick' ? nav.back() : go(step === 'saved' ? 'compare' : 'pick'); }} />
    <div className="ps">{body}<div style={{ height: 16 }} /></div>
    {foot && <div className="pfoot">{foot}</div>}
  </div>;
}

/* ---------- 处理工具（每个工具一个字），从汉字墙进来先选声音，从工作台进来直接干活 ---------- */
const TOOL_CH = { denoise: '噪', pauses: '停', loudness: '匀', repair: '修', speed: '速', voice: '变', effects: '效', channels: '道', reverse: '倒', separate: '伴', chorus: '副', bgm: '混', multitrack: '叠', medley: '串', loop: '循', stt: '文' };
const toolOf = id => SJ.TOOLS.find(t => t.id === id);
function ToolWork({ id, nav }) {
  const [o, setO] = useState({ 强度: '中', 标准: '语音 -16', 速度: '0.8×', 音高: '保持不变', 调: 0, preset: '大叔', 声道: '立体声', 长度: '60 秒', 接缝: '3 秒', keep: '0.3 秒' });
  const set = (k, v) => setO({ ...o, [k]: v });
  const [tg, setTg] = useState({ 电流声: true, 低频轰隆: true, 咔哒声: false, 爆音: false, 齿音: true, 噪声门: false, 交换: false });
  const [order, setOrder] = useState(['均衡', '压缩', '混响', '回声', '限制']);
  const [pz, setPz] = useState(SJ.PAUSES.map(() => true));
  const [track, setTrack] = useState('m2');
  const P = nav.player;
  const opt = (label, k, opts) => <div className="pad" style={{ paddingTop: 14 }}><div className="pk" style={{ marginBottom: 8 }}>{label}</div><Seg opts={opts} value={o[k]} onChange={v => set(k, v)} /></div>;
  const tog = (k, l, sub) => <div className="prow" style={{ minHeight: 56 }} onClick={() => setTg({ ...tg, [k]: !tg[k] })}><div className="mid"><div className="pt3" style={{ fontSize: 16 }}>{l}</div>{sub && <div className="psub">{sub}</div>}</div><Tog on={tg[k]} onChange={v => setTg({ ...tg, [k]: v })} /></div>;
  switch (id) {
    case 'denoise': return <Fragment>{opt('降多少', '强度', ['轻', '中', '重'])}<div className="pad psub" style={{ paddingTop: 8 }}>重了人声会发闷。先用「中」，听听前后再定。</div></Fragment>;
    case 'pauses': return <Fragment>{opt('每处停顿留多久', 'keep', ['0.2 秒', '0.3 秒', '0.5 秒'])}
      <div className="sect"><b>找到 9 处长停顿</b><span>点一下听，关掉就不删</span></div>
      {SJ.PAUSES.map(([s, d], i) => <div key={i} className="prow" style={{ minHeight: 52 }}><PlayBtn s={34} tone="tint" on={P.on('pz' + i)} onClick={() => P.toggle('pz' + i, d + 2, s - 1)} /><div className="mid"><span className="pt3 num" style={{ fontSize: 16 }}>{fmtT(s)}</span><span className="psub num">　停了 {d.toFixed(1)} 秒</span></div><Tog on={pz[i]} onChange={v => setPz(pz.map((x, j) => j === i ? v : x))} /></div>)}</Fragment>;
    case 'loudness': return <Fragment>{opt('按什么标准', '标准', ['语音 -16', '音乐 -14', '广播 -23'])}<div className="pad psub" style={{ paddingTop: 8 }}>现在是 -19 LUFS，偏小。调到 -16 之后和短视频里常见的音量差不多，峰值不超过 -1 dB。</div></Fragment>;
    case 'repair': return <Fragment><div className="sect"><b>听出来的问题</b><span>已经替你打开了</span></div>
      {tog('电流声', '电流声', '找到 50 Hz 嗡嗡声和它的倍频')}{tog('低频轰隆', '低频轰隆', '风声、碰麦、车里的低频')}{tog('咔哒声', '咔哒声', '嘴唇声、按键声')}{tog('爆音', '爆音', '声音太大削平的地方')}{tog('齿音', '齿音', '「嘶」「丝」太尖')}{tog('噪声门', '噪声门', '没人说话时更安静')}</Fragment>;
    case 'speed': return <Fragment>{opt('速度', '速度', ['0.5×', '0.8×', '1×', '1.25×', '1.5×', '2×'])}{opt('音高', '音高', ['保持不变', '跟着变'])}
      <div className="pad" style={{ paddingTop: 14 }}><div className="pk">单独升降调</div><div className="len-row"><button className="chip" onClick={() => set('调', o.调 - 1)}>降半音</button><div className="pt2 num" style={{ flex: 1, textAlign: 'center' }}>{o.调 > 0 ? '+' : ''}{o.调}</div><button className="chip" onClick={() => set('调', o.调 + 1)}>升半音</button></div></div></Fragment>;
    case 'voice': return <Fragment><div className="sect"><b>变成谁</b></div>
      <div className="pgrid">{['大叔', '萝莉', '机器人', '电话音', '怪兽', '山谷回声'].map(p => <button key={p} className={'ptile' + (o.preset === p ? ' on' : '')} onClick={() => set('preset', p)}><VoicePrint id={'vc' + p} size={40} tone={o.preset === p ? 'blue' : 'tint'} /><span>{p}</span></button>)}</div>
      <div className="pad psub" style={{ paddingTop: 10 }}>只改音高、不修共振峰，所以有几种会带点卡通味，这是正常的。</div></Fragment>;
    case 'effects': return <Fragment><div className="sect"><b>效果链</b><span>拖动换顺序</span></div>
      {order.map((e, i) => <div key={e} className="prow" style={{ minHeight: 56 }}><Ic n="grip" s={22} c="#888" /><div className="mid"><div className="pt3" style={{ fontSize: 16 }}>{i + 1}　{e}</div><div className="psub">{{ 均衡: '低频 -2，人声 +3', 压缩: '3:1，轻轻压', 混响: '小房间 15%', 回声: '关', 限制: '-1 dB' }[e]}</div></div>{i > 0 && <button className="chip" onClick={() => { const a = order.slice(); [a[i - 1], a[i]] = [a[i], a[i - 1]]; setOrder(a); }}>上移</button>}</div>)}
      <div className="pad"><button className="plink" onClick={() => nav.toast('已存成预设「我的播客声」')}>存成预设</button></div></Fragment>;
    case 'channels': return <Fragment>{opt('声道', '声道', ['单声道', '立体声'])}<div className="pad" style={{ paddingTop: 14 }}><div className="pk">立体声宽度</div><Slider v={0.6} onChange={() => { }} /><div className="pk" style={{ marginTop: 10 }}>左右平衡</div><Slider v={0.5} onChange={() => { }} /></div>{tog('交换', '左右交换', '左耳的声音放到右耳')}</Fragment>;
    case 'reverse': return <div className="pad pbody" style={{ paddingTop: 16 }}>从最后一秒倒着放到第一秒。常用来做音效，或者听听歌里藏的「彩蛋」。</div>;
    case 'separate': return <Fragment><div className="pad pbody" style={{ paddingTop: 16 }}>拆成两个版本，原歌不变：</div>
      {[['人', '人声', '只剩唱的部分，学歌用'], ['伴', '伴奏', '去掉人声，翻唱用']].map(([c, l, s], i) => <div key={l} className="prow"><Han ch={c} s={44} tone="tint" fs={24} /><div className="mid"><div className="pt3">{l}</div><div className="psub">{s}</div></div><PlayBtn s={40} tone="tint" on={P.on('sep' + i)} onClick={() => P.toggle('sep' + i, 10)} /></div>)}
      <div className="pad psub" style={{ paddingTop: 8 }}>在手机上算，3 分钟的歌大约要 1 分钟。</div></Fragment>;
    case 'bgm': return <MixPanel nav={nav} voiceEnv={ENV.speech} voiceLen={40} track={track} setTrack={setTrack} />;
    case 'multitrack': return <Fragment><div className="sect"><b>3 条声音叠在一起</b><span>各调各的</span></div>
      {[['播客第 12 期', ENV.speech, 50, 0, 0.9], ['晚风（钢琴版）', ENV.music, 20, 5, 0.3], ['山间溪流', trackEnv('m8', 120), 20, 0, 0.2]].map(([n, e, r, st, v], i) => <div key={n} className="pad" style={{ paddingTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="pt3" style={{ fontSize: 15 }}>{n}</span><span className="psub num">从 0:{String(st).padStart(2, '0')} 开始</span></div>
        <div style={{ marginLeft: (st / 40 * 100) + '%' }}><Wave env={e} rate={r} from={0} to={40 - st} h={34} bar={1} gap={1} color={i === 0 ? '#000' : BLUE} /></div>
        <Slider v={v} onChange={() => { }} /></div>)}</Fragment>;
    case 'medley': return <Fragment>{opt('接缝怎么过渡', '接缝', ['2 秒', '3 秒', '5 秒'])}<div className="sect"><b>6 首，按这个顺序</b><span>拖动换顺序</span></div>
      {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="prow" style={{ minHeight: 54 }}><Ic n="grip" s={22} c="#888" /><Cover id={'dance' + i} title={['欢', '月', '花', '跳', '红', '好'][i - 1] + '曲'} size={36} /><div className="mid"><div className="pt3 num" style={{ fontSize: 16 }}>广场舞 0{i}.mp3</div><div className="psub num">{['3:42', '4:05', '3:58', '3:31', '4:12', '3:57'][i - 1]}</div></div></div>)}
      <div className="pad psub">接成一首，音量自动统一。原来的 6 首不变。</div></Fragment>;
    case 'loop': return <Fragment>{opt('做多长', '长度', ['30 秒', '60 秒', '90 秒'])}<div className="pad" style={{ paddingTop: 16 }}><Wave env={ENV.music} rate={20} from={61.8} to={121.8} h={70} bar={2} gap={1}><div className="wv-mark" style={{ left: '0%' }}><b>接回开头</b></div></Wave><div className="psub" style={{ marginTop: 8 }}>自动找能接上的拍点（92 BPM），放完一遍无缝回到开头，年会、直播间一直放也听不出接缝。</div></div></Fragment>;
    default: return null;
  }
}
function Tool({ nav }) {
  const id = nav.route.id; const T = toolOf(id) || toolOf('denoise'); const ch = TOOL_CH[id] || '处';
  const fromWall = nav.route.entry === 'wall';
  const { step, compact, go } = useFlow(nav, fromWall ? 'pick' : 'work', s => s !== 'pick');
  const P = nav.player; const [ab, setAb] = useState('b');
  if (id === 'stt') return <SttPage nav={nav} />;
  const music = ['separate', 'medley', 'loop', 'chorus'].includes(id);
  const res = T.result === 'two versions' ? '拆成两个版本' : T.result === 'new audio' ? '存成新音频' : '存成新版本';
  const showAB = !['bgm', 'multitrack', 'medley', 'separate', 'pauses'].includes(id);
  let body, foot;
  if (step === 'pick') {
    const items = LIB.filter(x => music ? x.env === 'music' : true).slice(0, 4);
    body = <Fragment><Q t={id === 'medley' ? '选几首歌接起来' : id === 'bgm' ? '给哪段声音配乐？' : '用哪段声音？'} sub={T.desc} />
      {items.map(it => <button key={it.id} className="prow" onClick={() => go('work')}><Han ch={it.ch} s={48} tone="tint" fs={26} /><div className="mid"><div className="pt3 ell" style={{ fontSize: 16 }}>{it.title}</div><div className="psub num">{fmt(it.seconds)}　{it.date}</div></div><Ic n="right" s={18} c="#999" /></button>)}
      <SrcRow ch="开" t="手机里的文件" onClick={() => nav.push({ name: 'files' })} /></Fragment>;
  } else if (step === 'work') {
    const env = music ? ENV.music : ENV.speech, rate = music ? 20 : 50, a = music ? 60 : 0, b = a + 40;
    const ch_ = nav.route.chain, ci = nav.route.ci || 0;
    body = <Fragment>
      {ch_ && <div className="chainbar"><b>一句话里的第 {ci + 1} 步，共 {ch_.length} 步</b><span>{ch_.map(x => toolOf(x).name).join('，然后')}</span><div className="chips"><button className="chip" onClick={() => ci + 1 < ch_.length ? nav.replace({ name: 'tool', id: ch_[ci + 1], chain: ch_, ci: ci + 1 }) : go('saved')}>跳过这一步</button><button className="chip" onClick={() => nav.toast('存成配方「降噪之后统一音量」')}>存成配方</button></div></div>}
      <div className="pad" style={{ paddingTop: 14 }}><div className="psub">{T.desc}</div></div>
      {showAB && <div className="pad" style={{ paddingTop: 12 }}>
        <Seg opts={[{ v: 'a', l: '之前' }, { v: 'b', l: '之后' }]} value={ab} onChange={setAb} />
        <div style={{ marginTop: 12 }}><Wave env={ab === 'b' && id === 'denoise' ? ENV.denoised : env} rate={rate} from={a} to={b} h={70} bar={2} gap={1} gain={ab === 'b' && id === 'loudness' ? 1.4 : 1} color={ab === 'b' ? BLUE : '#000'}>{P.on('tl') && <div className="wv-ph" style={{ left: pct(P.t, a, b) }} />}</Wave></div>
        <button className="pbtn line sm" style={{ marginTop: 10 }} onClick={() => P.toggle('tl', 40, a)}><Ic n={P.on('tl') ? 'stop' : 'play'} s={18} />{P.on('tl') ? '停' : ab === 'a' ? '听之前' : '听之后'}</button>
      </div>}
      <ToolWork id={id} nav={nav} />
    </Fragment>;
    const nextC = nav.route.chain && (nav.route.ci || 0) + 1 < nav.route.chain.length;
    foot = <Fragment><button className="pbtn" onClick={() => { P.stop(); if (nextC) { const ci = (nav.route.ci || 0) + 1; nav.toast(T.name + '存好了，接着' + toolOf(nav.route.chain[ci]).name); nav.replace({ name: 'tool', id: nav.route.chain[ci], chain: nav.route.chain, ci }); } else go('saved'); }}>{nextC ? res + '，下一步' : res}</button><div className="note">{T.result === 'new audio' ? '原来的声音都不变' : '原来的版本不会被改'}</div></Fragment>;
  } else {
    body = <div className="pad" style={{ paddingTop: 22 }}><div className="pt0">好了。</div>
      <div className="pbody" style={{ marginTop: 8 }}>{T.result === 'two versions' ? '多了「人声」和「伴奏」两个版本。' : T.result === 'new audio' ? '音频库里多了一段新声音。' + (['bgm', 'multitrack', 'medley'].includes(id) ? '想改配比，随时回来调。' : '') : '存成了新版本「' + T.name + '」，原来的版本还在。'}</div></div>;
    foot = <div className="pbtn2"><button className="pbtn line" onClick={() => nav.push({ name: 'edit' })}>接着剪</button><button className="pbtn" onClick={() => nav.push({ name: 'export' })}>导出</button></div>;
  }
  return <div className="pr np">
    <FlowHead ch={ch} compact={compact} title={T.name} step={fromWall ? (step === 'pick' ? 1 : 2) : null} total={fromWall ? 2 : null} onBack={() => { P.stop(); step === 'pick' || !fromWall ? nav.back() : go('pick'); }} />
    <div className="ps">{body}<div style={{ height: 16 }} /></div>
    {foot && <div className="pfoot">{foot}</div>}
  </div>;
}
function SttPage({ nav }) {
  useTone('dark'); const [n, setN] = useState(true);
  return <div className="pr np">
    <FlowHead ch="文" compact title="音频转文字" onBack={nav.back} />
    <div className="ps pad"><div className="soon">即将开放</div>
      <div className="pt1" style={{ marginTop: 14 }}>整段转成文字稿，还没做好。</div>
      <div className="pbody" style={{ marginTop: 10 }}>我们不想给你一个错字很多、或者假装转好了的结果。开放以后，讲座、会议、课堂录音都能一键出文字稿。</div>
      <div className="prow" style={{ padding: '14px 0', marginTop: 10 }} onClick={() => setN(!n)}><div className="mid"><div className="pt3" style={{ fontSize: 16 }}>开放时通知我</div></div><Tog on={n} onChange={setN} /></div>
      <div className="psub">现在可以先用：「停」删掉停顿、「速」放慢听写、「剪」里加标记。</div></div>
  </div>;
}

/* ---------- 录 ---------- */
function Record({ nav }) {
  const { step, compact, go } = useFlow(nav, 'ready', s => s !== 'ready');
  const P = nav.player; const [paused, setPaused] = useState(false), [held, setHeld] = useState(12.4), [sheet, setSheet] = useState(nav.route.sheet || null);
  const [mic, setMic] = useState(0), [ch2, setCh2] = useState('单声道'), [gain, setGain] = useState(0.333), [mon, setMon] = useState(false);
  const recOn = P.on('rec'); const t = recOn ? P.t : held;
  useEffect(() => { if (step === 'rec' && !paused && !recOn) P.play('rec', 3600, held); }, [step, paused]);
  const gdb = Math.round(-12 + gain * 36);
  const insert = nav.route.insert;
  const summary = <button className="recsum" onClick={() => setSheet('settings')}><span>{['内置麦克风', '有线耳机', 'USB 麦克风', '蓝牙耳机'][mic]}</span><span>{ch2}</span><span className="num">增益 {gdb > 0 ? '+' : ''}{gdb} dB</span><span>{mon ? '耳机监听' : '不监听'}</span><em>改</em></button>;
  let body, foot;
  if (step === 'ready') {
    body = <Fragment><Q t={insert ? '录一段，插到 0:24.3' : '准备好就开始'} />
      <div className="pad" style={{ paddingTop: 8 }}>{summary}</div>
      <SrcRow ch="续" t="接着上次录" sub="11月22日 21:10 中断，已录 3:12" onClick={() => { setHeld(192); go('rec'); }} />
      <SrcRow ch="录" t="录过的 3 段" onClick={() => go('list')} /></Fragment>;
    foot = <button className="pbtn" onClick={() => { setHeld(0); go('rec'); }}><Ic n="rec" s={18} />开始录音</button>;
  } else if (step === 'rec') {
    const w0 = Math.max(0, t - 9);
    body = <Fragment>
      <div className="pad" style={{ paddingTop: 22, display: 'flex', alignItems: 'center', gap: 10 }}><span className="recdot" style={{ animation: paused ? 'none' : undefined, opacity: paused ? .3 : 1 }} /><span className="pk" style={{ color: paused ? 'var(--mute)' : BLUE }}>{paused ? '暂停了' : '正在录'}</span></div>
      <div className="pad"><div className="rectime num">{fmtT(t)}</div></div>
      <div className="pad" style={{ paddingTop: 10 }}><Wave env={ENV.rec} rate={50} from={w0 % 50} to={w0 % 50 + 9} h={110} bar={2} gap={1} /></div>
      <div className="pad" style={{ paddingTop: 16 }}>{summary}</div>
      <div className="pad psub" style={{ paddingTop: 10 }}>锁屏了也会继续录。来电时自动暂停。</div></Fragment>;
    foot = <div className="pbtn2"><button className="pbtn line" onClick={() => { if (paused) { setPaused(false); } else { setHeld(t); P.stop(); setPaused(true); } }}>{paused ? '接着录' : '暂停'}</button><button className="pbtn" onClick={() => { P.stop(); nav.toast(insert ? '已插到 0:24.3' : '录好了，存成「录音 11月23日」'); nav.replace({ name: 'edit' }); }}>完成</button></div>;
  } else {
    body = <Fragment><Q t="录过的" />
      {[['录音 11月22日 21:10', '3:12　上次中断了', true], ['播客第 12 期 · 和王老师聊阅读', '18:40　今天 09:42'], ['周三产品例会', '47:12　昨天 15:00']].map(([n, s, cont]) => <div key={n} className="prow"><Han ch="录" s={44} tone={cont ? 'blue' : 'tint'} fs={24} /><div className="mid"><div className="pt3 ell" style={{ fontSize: 16 }}>{n}</div><div className="psub num">{s}</div></div>{cont ? <button className="chip b" onClick={() => { setHeld(192); go('rec'); }}>接着录</button> : <PlayBtn s={38} tone="tint" on={P.on(n)} onClick={() => P.toggle(n, 10)} />}</div>)}</Fragment>;
  }
  return <div className="pr np">
    <FlowHead ch="录" compact={compact} title={insert ? '录一段插进去' : '录音'} onBack={() => { P.stop(); step === 'ready' ? nav.back() : go('ready'); }} crop={{ x: -14, y: -76 }} />
    <div className="ps">{body}<div style={{ height: 16 }} /></div>
    {foot && <div className="pfoot">{foot}</div>}
    {sheet === 'settings' && <Sheet title="录音设置" sub="下次还按这样录" onClose={() => setSheet(null)}>
      <div className="sect" style={{ paddingTop: 4 }}><b>用哪个麦克风</b></div>
      {[['内置麦克风', '手机底部'], ['有线耳机', '已插入'], ['USB 麦克风', '没有连接'], ['蓝牙耳机', '音质是电话那种，适合说话']].map(([l, s], i) => <div key={l} className={'prow' + (mic === i ? ' on' : '')} style={{ minHeight: 54 }} onClick={() => setMic(i)}><div className="mid"><div className="pt3" style={{ fontSize: 16 }}>{l}</div><div className="psub">{s}</div></div><Radio on={mic === i} /></div>)}
      <div className="pad" style={{ paddingTop: 12 }}><Seg opts={['单声道', '立体声']} value={ch2} onChange={setCh2} /></div>
      <div className="pad" style={{ paddingTop: 14 }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="pk">输入增益</span><span className="pk num">{gdb > 0 ? '+' : ''}{gdb} dB</span></div><Slider v={gain} onChange={setGain} /><div className="psm" style={{ display: 'flex', justifyContent: 'space-between' }}><span>-12</span><span>+24</span></div></div>
      <div className="prow" onClick={() => setMon(!mon)}><div className="mid"><div className="pt3" style={{ fontSize: 16 }}>耳机里听自己</div><div className="psub">要戴耳机；蓝牙耳机会慢半拍</div></div><Tog on={mon} onChange={setMon} /></div>
    </Sheet>}
  </div>;
}

/* ---------- 转：批量 ---------- */
const BATCH_CH = { convert: '转', clean: '净', podcast: '播', ringtone: '铃', segments: '段', sentence: '说' };
function Batch({ nav }) {
  const { step, compact, go } = useFlow(nav, 'tpl');
  const [tpl, setTpl] = useState(nav.route.tpl || 'convert'), [gate, setGate] = useState(false), [limit10, setLimit10] = useState(false), [fmt2, setFmt2] = useState('MP3');
  const B = SJ.BATCH; const T = B.templates.find(x => x.id === tpl);
  const n = limit10 ? 10 : 24; const free = !nav.state.member;
  const no = { tpl: 1, files: 2, run: 3, report: 3 }[step];
  let body, foot;
  if (step === 'tpl') {
    body = <Fragment><Q t="一批文件，一起处理" sub="选一种做法" />
      <div className="tgrid">{B.templates.map(t => <button key={t.id} className="ttile" onClick={() => { setTpl(t.id); go('files'); }}><Han ch={BATCH_CH[t.id]} s={40} tone="tint" fs={22} /><b>{t.name}</b><span>{t.desc}</span></button>)}</div></Fragment>;
  } else if (step === 'files') {
    body = <Fragment>
      <div className="sect"><b>选了 24 个文件</b><button className="plink" style={{ marginLeft: 'auto', padding: 0 }}>改</button></div>
      {[1, 2, 3].map(i => <div key={i} className="prow" style={{ minHeight: 50 }}><Han ch="开" s={32} tone="tint" fs={18} /><div className="mid"><div className="pt3 num" style={{ fontSize: 15 }}>访谈素材 {String(i).padStart(2, '0')}.m4a</div></div><span className="psub num">{['12:40', '08:12', '15:03'][i - 1]}</span></div>)}
      <div className="pad psub">还有 21 个</div>
      {tpl === 'convert' && <div className="pad" style={{ paddingTop: 14 }}><div className="pk" style={{ marginBottom: 8 }}>转成</div><Seg opts={['MP3', 'M4A', 'WAV', 'FLAC']} value={fmt2} onChange={setFmt2} /></div>}
      {tpl === 'sentence' && <div className="pad" style={{ paddingTop: 14 }}><div className="pk" style={{ marginBottom: 8 }}>对每个文件说</div><input className="field" defaultValue="删掉长停顿，统一音量" /><div className="psm" style={{ marginTop: 6 }}>批量里只用本机理解，不调用 AI。</div></div>}
      <button className="prow" style={{ marginTop: 8 }}><Han ch="存" s={32} tone="tint" fs={18} /><div className="mid"><div className="pt3" style={{ fontSize: 15 }}>存到 下载 / 声剪批量</div><div className="psub">做完直接放这里</div></div><Ic n="right" s={18} c="#999" /></button>
      {free && !limit10 && <div className="pad" style={{ paddingTop: 12 }}><div className="limitbox"><b>免费一次最多 10 个，这次有 24 个</b><span>会员不限数量。也可以先做前 10 个。</span>
        <div className="pbtn2" style={{ marginTop: 10 }}><button className="pbtn ink sm" onClick={() => setGate(true)}>不限数量</button><button className="pbtn ghost sm" onClick={() => setLimit10(true)}>先做 10 个</button></div></div></div>}
    </Fragment>;
    foot = <button className="pbtn" onClick={() => { if (free && !limit10) setGate(true); else go('run'); }}>开始，{n} 个</button>;
  } else if (step === 'run') {
    body = <div className="pad" style={{ paddingTop: 20 }}>
      <div className="rectime num" style={{ fontSize: 64 }}>17<span style={{ fontSize: 28, color: 'var(--mute)' }}> / 24</span></div>
      <div style={{ marginTop: 10 }}><Prog p={17 / 24} /></div>
      <div className="pbody" style={{ marginTop: 12 }}>{B.run.current}</div>
      <div className="psub">1 个失败了，做完再看原因</div>
      <div className="infobox" style={{ marginTop: 16 }}>可以离开声剪。通知栏会显示进度，做完提醒你。</div>
    </div>;
    foot = <div className="pbtn2"><button className="pbtn line" onClick={() => nav.toast('已暂停，点通知栏或这里继续')}>暂停</button><button className="pbtn" onClick={() => go('report')}>看结果</button></div>;
  } else {
    body = <Fragment><div className="pad" style={{ paddingTop: 18 }}><div className="pt1">23 个做好了，1 个没做成</div><div className="psub" style={{ marginTop: 4 }}>都在 下载 / 声剪批量</div></div>
      <div className="rpt"><div className="rpt-h"><span>文件</span><span>结果</span><span>爆音</span></div>
        {[['访谈素材 01', '好了', '0'], ['访谈素材 02', '好了', '2 处，已限幅'], ['访谈素材 07', '没做成', '—'], ['访谈素材 18', '好了', '0'], ['访谈素材 24', '好了', '0']].map(r => <div key={r[0]} className={'rpt-r' + (r[1] !== '好了' ? ' bad' : '')}><span className="num">{r[0]}</span><span>{r[1]}</span><span className="num">{r[2]}</span></div>)}</div>
      <div className="pad psub" style={{ paddingTop: 10 }}>访谈素材 07 是一个损坏的文件，打不开。</div></Fragment>;
    foot = <button className="pbtn line" onClick={() => nav.toast('报告已存成 CSV')}>导出报告（CSV）</button>;
  }
  return <div className="pr np">
    <FlowHead ch="转" compact={compact} title={step === 'tpl' ? '批量处理' : '批量 · ' + T.name} step={no} total={3} crop={{ x: -12, y: -74 }} onBack={() => step === 'tpl' ? nav.back() : go(step === 'files' ? 'tpl' : 'files')} />
    <div className="ps">{body}<div style={{ height: 16 }} /></div>
    {foot && <div className="pfoot">{foot}</div>}
    {gate && <MemberSheet nav={nav} why={{ title: '批量不限数量是会员的', sub: '免费一次 10 个（示例规则）。会员一次几百个也行。', skip: '批量' }} onClose={() => setGate(false)} onFree={() => setLimit10(true)} freeLabel="先做 10 个" />}
  </div>;
}

/* ---------- 字：字幕配音（声音转文字即将开放） ---------- */
const CUES = [[0.8, 3.6, '这款保温杯用的是双层真空结构，'], [3.8, 7.4, '早上倒进去的热水，到下午还是烫的。'], [8.0, 10.2, '杯盖一拧就开，单手也能喝。'], [10.6, 12.4, '三种颜色，都很耐看。'], [13.0, 15.8, '现在下单，还送一个杯套。']];
function Subtitle({ nav }) {
  const { step, compact, go } = useFlow(nav, 'import');
  const [voice, setVoice] = useState('sys-f'), [vs, setVs] = useState(false), [gate, setGate] = useState(false);
  const P = nav.player;
  useEffect(() => { if (step === 'gen') { const id = setTimeout(() => go('done'), 1600); return () => clearTimeout(id); } }, [step]);
  if (step === 'stt') return <SttPage nav={nav} />;
  const no = { import: 1, cues: 2, gen: 3, done: 3 }[step];
  let body, foot;
  if (step === 'import') {
    body = <Fragment><Q t="导入字幕，一句一句配成声音" sub="SRT、VTT，或者每行一句的纯文本" />
      <div className="pad" style={{ paddingTop: 6 }}><button className="plink" onClick={() => go('stt')}>反过来，把声音转成文字（即将开放）</button></div></Fragment>;
    foot = <button className="pbtn" onClick={() => go('cues')}>选字幕文件</button>;
  } else if (step === 'cues') {
    body = <Fragment><div className="sect"><b>新品介绍.srt</b><span>5 句，UTF-8</span></div>
      {CUES.map(([a, b, t], i) => <div key={i} className="cue"><span className="cue-n num">{i + 1}</span><div><div className="psm num">{fmtT(a)} – {fmtT(b)}</div><div className="pbody" style={{ fontSize: 15, lineHeight: 1.5 }}>{t}</div></div></div>)}
      <button className="prow" onClick={() => setVs(true)}><VoicePrint id={voice} size={40} tone={isOnline(voice) ? 'ink' : 'tint'} /><div className="mid"><div className="pt3" style={{ fontSize: 16 }}>声音：{voiceName(voice)}</div><div className="psub">{isOnline(voice) ? '在线，会员' : '手机自带，离线'}</div></div><span className="chip">换</span></button></Fragment>;
    foot = <button className="pbtn" onClick={() => { if (isOnline(voice) && !nav.state.member) setGate(true); else go('gen'); }}>一句一句合成</button>;
  } else if (step === 'gen') {
    body = <div className="pad" style={{ paddingTop: 30 }}><div className="pt2">正在合成第 3 句，共 5 句</div><div style={{ marginTop: 16 }}><Prog p={0.5} /></div><div className="psub" style={{ marginTop: 10 }}>每句放在字幕的时间上；太长的会稍微加快，音高不变。</div></div>;
  } else {
    body = <Fragment><Q t="配好了" sub="每句一个标记，在工作台里能看到" />
      <div className="pad" style={{ paddingTop: 10 }}>
        <div className="dubrow">{CUES.map(([a, b], i) => <span key={i} style={{ left: pct(a, 0, 16), width: pct(b - a, 0, 16) }}>{i + 1}</span>)}</div>
        <Wave env={ENV.dub} rate={50} h={64} bar={2} gap={1}>{P.on('dub') && <div className="wv-ph" style={{ left: pct(P.t, 0, 16) }} />}</Wave>
        <div className="ruler"><span>0:00</span><span>0:08</span><span>0:16</span></div>
        <button className="pbtn line sm" style={{ marginTop: 10 }} onClick={() => P.toggle('dub', 16)}><Ic n={P.on('dub') ? 'stop' : 'play'} s={18} />{P.on('dub') ? '停' : '听一遍'}</button>
      </div>
      <div className="sect"><b>对齐时做了这些</b></div>
      <div className="pad"><div className="notelist"><div>第 2 句比字幕时间长 0.4 秒，加快了 6%，音高不变。</div><div>第 5 句往后挪了 0.2 秒，在结尾的空白里追回来了。</div><div>改了某一句的字，只重新合成那一句。</div></div></div></Fragment>;
    foot = <button className="pbtn" onClick={() => { nav.toast('存成了新音频「新品介绍 · 字幕配音」'); nav.push({ name: 'edit' }); }}>存成新音频</button>;
  }
  return <div className="pr np">
    <FlowHead ch="字" compact={compact} title="字幕配音" step={no} total={3} crop={{ x: -8, y: -72 }} onBack={() => step === 'import' ? nav.back() : go(step === 'cues' ? 'import' : 'cues')} />
    <div className="ps">{body}<div style={{ height: 16 }} /></div>
    {foot && <div className="pfoot">{foot}</div>}
    {vs && <Sheet title="谁来读字幕？" onClose={() => setVs(false)} foot={<button className="pbtn" onClick={() => setVs(false)}>就用「{voiceName(voice)}」</button>}><VoicePicker nav={nav} voice={voice} setVoice={setVoice} compactSys /></Sheet>}
    {gate && <MemberSheet nav={nav} why={{ title: '字幕配音用在线音色是会员的', sub: '手机自带的声音一直免费。', skip: '字幕' }} onClose={() => setGate(false)} onFree={() => { setVoice('sys-f'); }} freeLabel="用手机自带的" />}
  </div>;
}

/* ---------- 克：克隆我的声音 ---------- */
function Clone({ nav }) {
  const { step, compact, go } = useFlow(nav, 'read');
  const P = nav.player; const [agree, setAgree] = useState(false), [gate, setGate] = useState(false), [recing, setRecing] = useState(false);
  useEffect(() => { if (recing) { const id = setTimeout(() => { setRecing(false); go('check'); }, 2200); return () => clearTimeout(id); } }, [recing]);
  const V = SJ.VOICES; const no = { read: 1, check: 2, mine: 2 }[step];
  let body, foot;
  if (step === 'read') {
    body = <Fragment><Q t="照着读这一句" sub="安静的地方，正常说话的音量" />
      <div className="pad"><div className="passage">{V.clonePassage}</div>{recing && <div style={{ marginTop: 12 }}><Prog p={0.6} /><div className="psub" style={{ marginTop: 6 }}>在录…读完会自己停</div></div>}</div></Fragment>;
    foot = <button className="pbtn" onClick={() => setRecing(true)}><Ic n="rec" s={18} />{recing ? '在录…' : '开始读（大约 5 秒）'}</button>;
  } else if (step === 'check') {
    body = <Fragment><Q t="在手机上检查过了" sub="这一步不联网" />
      <div className="pad" style={{ paddingTop: 6 }}><Wave env={ENV.ref} rate={50} h={56} bar={2} gap={1} /><button className="plink" onClick={() => P.toggle('ref', 5.2)}><Ic n={P.on('ref') ? 'stop' : 'play'} s={16} />听听刚才读的</button></div>
      <div className="pad">{V.cloneChecks.map(c => <div key={c} className="okrow"><span className="check on"><Ic n="check" s={18} w={2.6} /></span>{c}</div>)}</div>
      <div className="prow" onClick={() => setAgree(!agree)} style={{ alignItems: 'flex-start' }}><Check on={agree} /><div className="mid pbody" style={{ fontSize: 15, lineHeight: 1.55 }}>这是我本人的声音。我同意把这 5 秒录音上传到在线服务，用来生成「我的声音」。随时可以删除。</div></div></Fragment>;
    foot = <button className="pbtn" style={{ opacity: agree ? 1 : .45 }} onClick={() => { if (!agree) { nav.toast('先勾上同意，才会上传'); return; } if (!nav.state.member) setGate(true); else go('mine'); }}>保存为我的声音</button>;
  } else {
    body = <Fragment><Q t="我的声音" sub="只有你能看到和使用" />
      <div className="prow"><VoicePrint id="me" size={52} tone="blue" /><div className="mid"><div className="pt3">我的声音</div><div className="psub">{V.mine[0].desc}，同意于 11月20日 20:14</div></div></div>
      <div className="minegrid">{[['听参考录音', () => P.toggle('ref', 5.2)], ['改名', () => nav.toast('已改名')], ['重新克隆', () => go('read')], ['删除', () => nav.toast('已删除，服务器上的也一起删了')]].map(([l, f]) => <button key={l} className="chip" onClick={f}>{l}</button>)}</div>
      <div className="pad psub" style={{ paddingTop: 14 }}>参考录音存在手机里。服务器那边如果丢了，可以用它再克隆一次，不用重读。</div></Fragment>;
    foot = <button className="pbtn" onClick={() => nav.push({ name: 'pei', step: 'voice', voice: 'me' })}>用我的声音读一段</button>;
  }
  return <div className="pr np">
    <FlowHead ch="克" compact={compact} title="克隆我的声音" step={no} total={2} crop={{ x: -14, y: -78 }} onBack={() => step === 'read' ? nav.back() : go('read')} />
    <div className="ps">{body}<div style={{ height: 16 }} /></div>
    {foot && <div className="pfoot">{foot}</div>}
    {gate && <MemberSheet nav={nav} why={{ title: '克隆声音是会员功能', sub: '检查在手机上做完了。同意后才上传这 5 秒。', skip: '克隆' }} onClose={() => setGate(false)} />}
  </div>;
}

/* ---------- 开：系统文件选择器（多选按顺序拼接） ---------- */
const FILES = [['晚风（钢琴版）.mp3', '3:52', '8.9 MB'], ['广场舞 01.mp3', '3:42', '8.5 MB'], ['广场舞 02.mp3', '4:05', '9.4 MB'], ['婚礼致辞.m4a', '6:18', '5.9 MB'], ['课堂录音 11-12.m4a', '42:10', '39 MB'], ['英语听力 Unit 6.mp3', '24:31', '22 MB'], ['语音备忘 0918.m4a', '1:04', '1.0 MB']];
function Files({ nav }) {
  useTone('dark'); const [sel, setSel] = useState([]);
  const tog = i => setSel(sel.includes(i) ? sel.filter(x => x !== i) : sel.length >= 20 ? sel : [...sel, i]);
  return <div className="pr" style={{ background: '#F4F5F9' }}>
    <div className="pbar" style={{ background: '#F4F5F9' }}><button className="pib" onClick={nav.back}><Ic n="close" /></button><div className="grow"><div className="pt3">选择音频</div><div className="psm">系统文件选择器　最多 20 个</div></div></div>
    <div className="chips" style={{ padding: '4px 16px 10px' }}>{['最近', '下载', '音乐', '录音'].map((c, i) => <span key={c} className={'chip' + (i === 0 ? ' on' : '')} style={{ background: i ? '#fff' : undefined }}>{c}</span>)}</div>
    <div className="ps" style={{ background: '#fff' }}>{FILES.map(([n, d, s], i) => <div key={n} className={'prow' + (sel.includes(i) ? ' on' : '')} onClick={() => tog(i)} style={{ minHeight: 60 }}>
      <span className={'ord num' + (sel.includes(i) ? ' on' : '')}>{sel.includes(i) ? sel.indexOf(i) + 1 : ''}</span>
      <div className="mid"><div className="pt3 ell" style={{ fontSize: 15 }}>{n}</div><div className="psub num">{d}　{s}</div></div></div>)}</div>
    <div className="pfoot" style={{ boxShadow: '0 -1px 0 var(--hair)' }}>
      <button className="pbtn" style={{ opacity: sel.length ? 1 : .45 }} onClick={() => { if (!sel.length) return; nav.toast(sel.length > 1 ? sel.length + ' 个文件按顺序拼成了一段' : '已打开'); nav.replace({ name: 'edit' }); }}>{sel.length > 1 ? '拼成一段打开（' + sel.length + ' 个）' : '打开'}</button>
      <div className="note">选几个就按选的顺序拼起来，每段开头自动加标记</div>
    </div>
  </div>;
}

/* ---------- 提：视频里的声音 ---------- */
function Video({ nav }) {
  const { step, compact, go } = useFlow(nav, 'pick');
  useEffect(() => { if (step === 'go') { const id = setTimeout(() => { nav.toast('提好了：「毕业典礼 · 从视频提取」'); nav.replace({ name: 'edit' }); }, 1500); return () => clearTimeout(id); } }, [step]);
  return <div className="pr np">
    <FlowHead ch="提" compact={compact} title="视频里的声音" crop={{ x: -12, y: -76 }} onBack={nav.back} />
    <div className="ps">{step === 'pick' ? <Fragment><Q t="从哪个视频提？" sub="只取声音，视频本身不动" />
      <div className="vidgrid">{[['毕业典礼.mp4', '3:48'], ['孩子的钢琴课.mp4', '1:12'], ['周末爬山.mp4', '0:45'], ['公司年会.mp4', '12:05']].map(([n, d], i) => <button key={n} className="vid" onClick={() => go('go')}><span className="vid-th" style={{ background: [TINT, '#000', BLUE, TINT][i] }}><em className="num">{d}</em></span><span className="ell">{n}</span></button>)}</div></Fragment>
      : <div className="pad" style={{ paddingTop: 30 }}><div className="pt2">正在提取声音…</div><div style={{ marginTop: 14 }}><Prog p={0.7} /></div><div className="psub" style={{ marginTop: 8 }}>在手机上做，不用联网</div></div>}</div>
  </div>;
}
