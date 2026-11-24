/* ================= export: what is it for, first ================= */
const PURPOSE_IC = { file: 'save', sound: 'bell', share: 'send' };
function Export({ p }) {
  const { nav, g, player } = useContext(PhoneCtx);
  const item = libItem(p.item || 'interview');
  const isMusic = item.env === 'music';
  const [purpose, setPurpose] = useState(p.purpose || 'file');
  const [sub, setSub] = useState('来电铃声');
  const [fmtId, setFmtId] = useState(p.purpose === 'share' ? 'm4a' : 'mp3');
  const [q, setQ] = useState('标准');
  const [more, setMore] = useState(!!p.more);
  const [meta, setMeta] = useState(!!p.meta);
  const [limit, setLimit] = useState(true);
  const [perSeg, setPerSeg] = useState(!!p.perSeg);
  const [stage, setStage] = useState(p.stage || 'edit');
  const [prog, setProg] = useState(p.stage === 'gen' ? 64 : 0);
  const [rate, setRate] = useState('44.1 kHz'); const [ch, setCh] = useState('立体声'); const [depth, setDepth] = useState('16 位');
  const [preset, setPreset] = useState(null);
  const [cand, setCand] = useState(1);
  const [winA, setWinA] = useState(3);
  useEffect(() => { if (stage !== 'gen') return; if (prog >= 100) { if (purpose === 'sound') setStage('done'); else if (purpose === 'share') { setStage('done'); nav.sheet('share', { name: plain(item.title) + '.m4a' }); } else setStage('ready'); return; } const t = setTimeout(() => setProg(Math.min(100, prog + 4)), 60); return () => clearTimeout(t); }, [stage, prog]);
  const F = SJ.EXPORT.formats.find(f => f.id === fmtId);
  const lossless = fmtId === 'wav' || fmtId === 'flac';
  const fromParse = p.from && PARSE[p.from];
  const purposeStep = fromParse && fromParse.steps.find(s => s.kind === 'purpose');
  const ring = isMusic ? [SJ.CHORUS[cand].from, SJ.CHORUS[cand].from + 30] : [winA, winA + 30];
  const go = () => { setProg(0); setStage('gen'); };
  const btn = purpose === 'sound' ? `设成${sub}` : purpose === 'share' ? '生成并分享' : `生成 ${F.name}${perSeg ? '（4 个文件）' : ''}`;
  return <div className="scr enter">
    <Top title="导出" sub={<Dot s={item.title} />} />
    <div className="scroll"><div className="pad">
      {purposeStep && <div style={{ fontSize: 15, color: 'var(--ink-2)', marginBottom: 8 }}>你说了 <b style={{ color: 'var(--ink)' }}><Hl i={purposeStep.color}>{purposeStep.ph}</Hl></b>，已经替你选好</div>}
      <div style={{ fontFamily: 'var(--f-big)', fontSize: 24, fontWeight: 900, margin: '2px 0 10px' }}>拿去做什么？</div>
      {SJ.EXPORT.purposes.map(pu => <button key={pu.id} data-purpose={pu.id} onClick={() => { setPurpose(pu.id); if (pu.id === 'share') setFmtId('m4a'); }} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', background: 'var(--surface)', borderRadius: 20, padding: '14px 14px', marginBottom: 8, boxShadow: purpose === pu.id ? 'inset 0 0 0 2px var(--ink)' : 'none' }}>
        <span style={{ width: 44, height: 44, borderRadius: 22, background: purpose === pu.id ? 'var(--ink)' : 'var(--surface-2)', color: purpose === pu.id ? 'var(--on-ink)' : 'var(--ink)', display: 'grid', placeItems: 'center', flex: 'none' }}><Ic n={PURPOSE_IC[pu.id]} s={22} /></span>
        <span style={{ flex: 1 }}><span style={{ display: 'block', fontSize: 18, fontWeight: 700 }}>{pu.name}</span><span style={{ display: 'block', fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.45 }}>{plain(pu.detail)}</span></span>
        <span className={'radio' + (purpose === pu.id ? ' on' : '')} />
      </button>)}
      {purpose === 'sound' && <div style={{ marginTop: 8 }}>
        <Seg items={SJ.EXPORT.purposes[1].subs} value={sub} onChange={setSub} />
        <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 14 }}><span style={{ fontSize: 16, fontWeight: 700, flex: 1 }}>铃声用 <span className="num">{fmt(ring[0])}–{fmt(ring[1])}</span></span><span style={{ fontSize: 14, color: 'var(--ink-2)' }}>30 秒</span></div>
        <div style={{ marginTop: 8, position: 'relative' }}>
          <Wave env={isMusic ? envMusic() : envSpeech()} rate={isMusic ? 20 : 50} from={0} to={isMusic ? 232 : 130} w={328} h={60} regions={[{ a: 0, b: ring[0], kind: 'hatch' }, { a: ring[1], b: isMusic ? 232 : 130, kind: 'hatch' }, { a: ring[0], b: ring[1], kind: 'sel' }, { a: ring[1] - 1, b: ring[1], kind: 'fade', c: 'transparent' }]} />
        </div>
        {isMusic ? <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>{SJ.CHORUS.map((c, i) => <button key={i} className={'chip' + (cand === i ? ' on' : '')} onClick={() => setCand(i)}>副歌 <span className="num">{fmt(c.from)}</span></button>)}</div>
          : <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}><span style={{ fontSize: 15, flex: 1 }}>从哪里开始</span><Stepper value={winA} unit="秒" step={5} min={0} max={100} onChange={setWinA} /></div>}
        <div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 10, lineHeight: 1.6 }}>最后一秒自动淡出，不会戛然而止。存成 M4A，手机都认。</div>
      </div>}
      {purpose === 'file' && <div style={{ marginTop: 10 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>{['播客 MP3', '无损存档'].map(x => <button key={x} className={'chip' + (preset === x ? ' on' : '')} style={{ height: 34, fontSize: 14 }} onClick={() => { setPreset(x); setFmtId(x === '无损存档' ? 'flac' : 'mp3'); setQ('高'); }}>{x}</button>)}<button className="chip" style={{ height: 34, fontSize: 14, background: 'transparent', boxShadow: 'inset 0 0 0 1.5px var(--line)' }} onClick={() => nav.toast('存成预设「我的导出 1」')}>存当前设置</button></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>{SJ.EXPORT.formats.map(f => <button key={f.id} onClick={() => setFmtId(f.id)} style={{ background: 'var(--surface)', borderRadius: 14, padding: '8px 10px', minHeight: 62, boxShadow: fmtId === f.id ? 'inset 0 0 0 2px var(--ink)' : 'none' }}>
          <div className="num" style={{ fontSize: 16, fontWeight: 700 }}>{f.name}</div><div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.35 }}>{plain(f.note).split('，')[0]}</div></button>)}</div>
        <div style={{ marginTop: 12 }}>{lossless ? <Seg items={fmtId === 'wav' ? ['16 位', '24 位', '32 位浮点'] : ['16 位', '24 位']} value={depth} onChange={setDepth} /> : <Seg items={SJ.EXPORT.quality} value={q} onChange={setQ} />}</div>
        <button className="row" style={{ padding: '10px 0', minHeight: 44 }} onClick={() => setMore(!more)}><span className="row-m" style={{ fontSize: 16 }}>采样率和声道</span><span className="mute" style={{ fontSize: 14 }}>{rate}，{ch}</span><Ic n={more ? 'up' : 'down'} s={20} /></button>
        {more && <div style={{ display: 'grid', gap: 8, marginBottom: 6 }}><Seg items={SJ.EXPORT.rates} value={rate} onChange={setRate} /><Seg items={SJ.EXPORT.channels} value={ch} onChange={setCh} /></div>}
        <button className="row" style={{ padding: '10px 0', minHeight: 44 }} onClick={() => setMeta(!meta)}><span className="row-m" style={{ fontSize: 16 }}>文件信息</span><span className="mute" style={{ fontSize: 14 }}>标题、作者、封面</span><Ic n={meta ? 'up' : 'down'} s={20} /></button>
        {meta && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
          {SJ.EXPORT.meta.slice(0, 5).map(m => <div key={m} className="field" style={{ gridColumn: m === '标题' || m === '备注' ? '1 / -1' : 'auto', padding: '6px 12px' }}><small>{m}</small><div style={{ fontSize: 15, minHeight: 22 }}>{m === '标题' ? plain(item.title) : m === '年份' ? '2026' : m === '作者' ? '声剪播客' : m === '备注' ? '音乐：晴天的小跑步 / 声剪音乐库' : ''}</div></div>)}
          <div className="field" style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px' }}><Cover t={{ id: 'cover', cat: '温暖' }} s={40} r={8} /><span style={{ flex: 1 }}><small>封面</small>从相册换一张</span></div>
        </div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid var(--line)' }}><Ic n="bolt" s={22} /><div style={{ flex: 1 }}><div style={{ fontSize: 15 }}>{SJ.EXPORT.clipWarn.split('，')[0]}</div><div className="lbl">{limit ? '已开启限幅，听不出来' : '关掉限幅会爆音'}</div></div><Switch on={limit} onClick={() => setLimit(!limit)} /></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid var(--line)' }}><Ic n="layers" s={22} /><div style={{ flex: 1, fontSize: 15 }}>{SJ.EXPORT.perSegment}</div><Switch on={perSeg} onClick={() => setPerSeg(!perSeg)} /></div>
      </div>}
      {purpose === 'share' && <div style={{ marginTop: 8, fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.7 }}>存成 <b style={{ color: 'var(--ink)' }}>M4A</b>：同样音质文件更小，发微信更快。点下面的按钮会打开手机的分享面板。</div>}
      <div style={{ height: 12 }} />
    </div></div>
    <div className="bot">
      {stage === 'edit' && <button data-anchor="export-go" className="btn btn-p wide" onClick={go}>{btn}</button>}
      {stage === 'gen' && <div><div style={{ display: 'flex', fontSize: 15, marginBottom: 6 }}><span style={{ flex: 1 }}>正在生成</span><b className="num">{prog}%</b></div><div className="bar"><i style={{ width: prog + '%' }} /></div>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 6 }}><span style={{ fontSize: 14, color: 'var(--ink-3)', flex: 1 }}>可以离开这一页，通知栏有进度</span><button className="btn-t" style={{ height: 34 }} onClick={() => nav.shade()}>看通知栏</button></div></div>}
      {stage === 'ready' && <div><div style={{ fontSize: 16, fontWeight: 700 }}>音频已生成，待保存</div><div style={{ fontSize: 14, color: 'var(--ink-3)', margin: '2px 0 8px' }}>没保存的话，声剪会在通知里提醒你</div><button className="btn btn-p wide" onClick={() => nav.sheet('saveLoc', { name: plain(item.title) + '.' + fmtId, done: () => setStage('done') })}>选位置保存</button></div>}
      {stage === 'done' && <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ width: 36, height: 36, borderRadius: 18, background: 'var(--ink)', color: 'var(--on-ink)', display: 'grid', placeItems: 'center', flex: 'none' }}><Ic n="check" s={20} w={2.6} /></span>
        <div style={{ flex: 1, fontSize: 15, lineHeight: 1.5 }}>{purpose === 'sound' ? <>已设为{sub}<div className="lbl">在系统设置里也能换回来</div></> : purpose === 'share' ? '分享面板打开过了' : <>已保存到 下载/声剪<div className="lbl">{plain(item.title)}.{fmtId}</div></>}</div>
        <button className="btn btn-s" style={{ height: 42 }} onClick={() => nav.back()}>好</button></div>}
    </div>
  </div>;
}

/* ================= membership ================= */
const PRO_IC = ['voice', 'user', 'music', 'text', 'batch', 'sub'];
function MemberScreen({ p }) {
  const { nav, g, player } = useContext(PhoneCtx);
  const [plan, setPlan] = useState('year');
  const P = SJ.MEMBERSHIP.plans.find(x => x.id === plan);
  const on = player.on('member-linxi');
  const cta = () => { if (!g.signed) { nav.go('login', { then: 'member' }); return; } nav.sheet('buy', { plan }); };
  return <div className="scr enter">
    <Top title="" onBack={nav.back} right={<button className="btn-t" onClick={() => nav.toast(g.signed ? '查过 Google Play 了，没有可恢复的购买' : '先登录，才能恢复购买')}>恢复购买</button>} />
    <div className="scroll">
      <div className="pad">
        <div style={{ fontFamily: 'var(--f-big)', fontSize: 30, fontWeight: 900, lineHeight: 1.32 }}>{g.member ? '你是年度会员' : <>本机能做的，<br />一直免费。</>}</div>
        <div style={{ fontSize: 15, color: 'var(--ink-2)', marginTop: 10, lineHeight: 1.7 }}>{g.member ? '2027-11-23 到期，到期前一天提醒你。在 Google Play 里随时能取消。' : '剪、处理、导出都在你手机上完成，不加水印，不限次数。会员买的是联网才有的东西。'}</div>
      </div>
      <div style={{ margin: '18px 12px 0', background: 'var(--surface)', borderRadius: 24, padding: '16px 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <PlayBtn on={on} size={52} onClick={() => player.toggle('member-linxi', 4)} label="听林溪读一句" />
          <div style={{ flex: 1 }}><div style={{ fontSize: 14, color: 'var(--ink-3)' }}>先听一句会员音色</div><div style={{ fontSize: 17, fontWeight: 700 }}>林溪，温柔知性</div></div>
        </div>
        <div style={{ marginTop: 12, color: 'var(--ink)' }}><Voiceprint id="linxi" w={296} h={46} on={!on} prog={on ? player.t / 4 : -1} /></div>
        <div style={{ fontSize: 17, lineHeight: 1.6, marginTop: 8 }}>「{SJ.VOICES.online[0].sample}」</div>
      </div>
      <div className="sec-h"><b>会员多出来的</b><span>都要联网</span></div>
      {SJ.MEMBERSHIP.pro.map((x, i) => <div key={x} className="row" style={{ minHeight: 48, padding: '8px 16px' }}><span style={{ width: 36, height: 36, borderRadius: 18, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', flex: 'none' }}><Ic n={PRO_IC[i]} s={20} /></span><span style={{ fontSize: 16 }}>{plain(x)}</span></div>)}
      <div className="sec-h"><b>一直免费的</b><span>不用登录</span></div>
      {SJ.MEMBERSHIP.free.map(x => <div key={x} className="row" style={{ minHeight: 40, padding: '6px 16px' }}><Ic n="check" s={20} w={2.4} /><span style={{ fontSize: 15, color: 'var(--ink-2)' }}>{x}</span></div>)}
      {!g.member && <><div className="sec-h"><b>选一个方案</b></div>
        <div className="pad" style={{ display: 'grid', gap: 8 }}>{SJ.MEMBERSHIP.plans.map(pl => <button key={pl.id} data-plan={pl.id} onClick={() => setPlan(pl.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', borderRadius: 18, padding: '12px 14px', boxShadow: plan === pl.id ? 'inset 0 0 0 2px var(--ink)' : 'none' }}>
          <span className={'radio' + (plan === pl.id ? ' on' : '')} />
          <span style={{ flex: 1 }}><span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 17, fontWeight: 700 }}>{pl.name}{pl.best && <span className="badge solid">最划算</span>}</span><span style={{ display: 'block', fontSize: 14, color: 'var(--ink-2)' }}>{plain(pl.note)}</span></span>
          <b className="num" style={{ fontSize: 18 }}>{pl.price.replace(' / ', '/')}</b></button>)}</div>
        <div className="pad" style={{ fontSize: 14, color: 'var(--ink-3)', marginTop: 10, lineHeight: 1.7 }}>{SJ.MEMBERSHIP.priceNote}。通过 Google Play 付款，随时在 Google Play 取消；试用结束前一天提醒你。</div></>}
      <div style={{ height: 14 }} />
    </div>
    <div className="bot">
      {g.member ? <button className="btn btn-s wide" onClick={() => nav.toast('会打开 Google Play 的订阅管理')}>管理订阅</button>
        : <><button data-anchor="member-go" className="btn btn-p wide" style={{ height: 54 }} onClick={cta}>{plan === 'year' ? '免费试用 7 天' : plan === 'month' ? '开通连续包月' : '买一周'}</button>
          <div style={{ fontSize: 14, color: 'var(--ink-3)', textAlign: 'center', marginTop: 6 }}>{plan === 'year' ? '7 天后 ¥98/年，' : ''}示例价格，以 Google Play 为准</div></>}
    </div>
  </div>;
}
function Login({ p }) {
  const { nav } = useContext(PhoneCtx);
  const [mode, setMode] = useState(p.mode || 'pick');
  const [code, setCode] = useState('');
  useEffect(() => { if (mode !== 'code' || code.length >= 6) return; const t = setTimeout(() => setCode(code + '382916'[code.length]), 160); return () => clearTimeout(t); }, [mode, code]);
  const done = how => { nav.set({ signed: how }); nav.toast(how === 'google' ? '用 Google 账号登录好了' : '用邮箱登录好了'); nav.back(); };
  return <div className="scr enter">
    <Top title="" />
    <div className="scroll"><div className="pad">
      <div style={{ fontFamily: 'var(--f-big)', fontSize: 30, fontWeight: 900 }}>登录声剪</div>
      <div style={{ fontSize: 16, color: 'var(--ink-2)', marginTop: 8, lineHeight: 1.7 }}>登录只用来认出你、管理会员。{SJ.MEMBERSHIP.privacy.split('，')[1]}。</div>
      {mode === 'pick' && <>
        <button data-anchor="login-google" onClick={() => done('google')} className="btn wide" style={{ marginTop: 28, height: 54, background: 'var(--surface)', color: 'var(--ink)', boxShadow: 'inset 0 0 0 1.5px var(--line)', gap: 12 }}><img src={GOOGLE_G} width="22" height="22" alt="" />用 Google 账号登录</button>
        <button onClick={() => setMode('email')} className="btn btn-s wide" style={{ marginTop: 10, height: 54, gap: 10 }}><Ic n="mail" s={22} />用邮箱验证码登录</button>
      </>}
      {mode !== 'pick' && <div style={{ marginTop: 24 }}>
        <div className="field"><small>邮箱</small><div style={{ fontSize: 17 }}>reader@example.com</div></div>
        {mode === 'email' && <button className="btn btn-p wide" style={{ marginTop: 12 }} onClick={() => { setCode(''); setMode('code'); }}>发验证码</button>}
        {mode === 'code' && <>
          <div style={{ fontSize: 14, color: 'var(--ink-2)', margin: '14px 0 8px' }}>验证码发到邮箱了，10 分钟内有效</div>
          <div style={{ display: 'flex', gap: 8 }}>{Array.from({ length: 6 }, (_, i) => <div key={i} className="num" style={{ flex: 1, height: 52, borderRadius: 12, background: 'var(--surface)', boxShadow: `inset 0 0 0 ${i === code.length ? 2 : 1}px ${i === code.length ? 'var(--ink)' : 'var(--line)'}`, display: 'grid', placeItems: 'center', fontSize: 24, fontWeight: 700 }}>{code[i] || ''}</div>)}</div>
          <button className="btn btn-p wide" style={{ marginTop: 14 }} onClick={() => done('email')}>登录</button>
        </>}
      </div>}
      <div style={{ fontSize: 14, color: 'var(--ink-3)', marginTop: 22, lineHeight: 1.7 }}>不登录也能用全部本机功能。登录即表示同意用户协议和隐私说明。</div>
    </div></div>
  </div>;
}
function Me() {
  const { nav, g } = useContext(PhoneCtx);
  return <div className="scr">
    <div className="top" style={{ paddingLeft: 20 }}><b style={{ fontSize: 22, fontWeight: 900, flex: 1, fontFamily: 'var(--f-big)' }}>我的</b></div>
    <div className="scroll">
      <div style={{ margin: '0 12px', background: 'var(--surface)', borderRadius: 22, padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 48, height: 48, borderRadius: 24, background: 'var(--surface-3)', display: 'grid', placeItems: 'center' }}><Ic n="user" /></span>
          <div style={{ flex: 1 }}><div style={{ fontSize: 18, fontWeight: 700 }}>{g.signed ? (g.signed === 'google' ? '已用 Google 账号登录' : '已用邮箱登录') : '还没登录'}</div><div style={{ fontSize: 14, color: 'var(--ink-2)' }}>{g.signed ? '换手机后登录，会员跟着走' : '不登录也能用全部本机功能'}</div></div>
          {!g.signed ? <button className="btn btn-p" style={{ height: 40, padding: '0 16px' }} onClick={() => nav.go('login', {})}>登录</button> : <button className="btn-t" onClick={() => nav.set({ signed: false, member: false })}>退出</button>}
        </div>
        <button data-anchor="me-member" onClick={() => nav.go('member', {})} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
          <span style={{ flex: 1 }}><span style={{ display: 'block', fontSize: 16, fontWeight: 700 }}>{g.member ? '年度会员，2027-11-23 到期' : '会员：真人感音色、克隆、会员曲目'}</span><span style={{ display: 'block', fontSize: 14, color: 'var(--ink-2)' }}>{g.member ? '管理会员' : '本机功能一直免费，看看会员多了什么'}</span></span><Ic n="chev" s={20} />
        </button>
      </div>
      <div style={{ marginTop: 10 }}>
        {[['voice', '我的声音', '1 个克隆的声音', () => nav.go('tts', { tab: 'mine' })], ['book', '我的配方', '3 句常用的话', () => nav.go('say', { tab: 'recipes' })], ['batch', '批量处理', '一批文件说同一句或用同一个工具', () => nav.go('batch', {})], ['gear', '设置', '外观、语言、提醒、AI', () => nav.go('settings', {})], ['help', '帮助', '使用指南、常见问题、联系我们', () => nav.go('help', {})]].map(([ic, t, d, f]) => <button key={t} className="row" onClick={f}><Ic n={ic} /><span className="row-m"><span className="row-t">{t}</span><span className="row-d">{d}</span></span><Ic n="chev" s={20} /></button>)}
      </div>
      <button className="row" style={{ marginTop: 6 }} onClick={() => nav.go('settings', { sec: 'data' })}><Ic n="folder" /><span className="row-m"><span className="row-t">声剪占用 1.2 GB</span><span className="row-d">都在这台手机上</span></span><Ic n="chev" s={20} /></button>
    </div>
    <BottomNav cur="me" />
  </div>;
}
function Settings({ p }) {
  const { nav, g } = useContext(PhoneCtx);
  const [lang, setLang] = useState('跟随系统');
  const [remind, setRemind] = useState(true);
  const [data, setData] = useState(p.sec === 'data');
  const theme = g.dark ? '深色' : g.themeSys ? '跟随系统' : '浅色';
  return <div className="scr enter">
    <Top title="设置" />
    <div className="scroll"><div className="pad">
      <div className="h3" style={{ marginTop: 4 }}>外观</div>
      <div style={{ marginTop: 8 }}><Seg items={['浅色', '深色', '跟随系统']} value={theme} onChange={v => nav.set({ dark: v === '深色', themeSys: v === '跟随系统' })} /></div>
      <div className="h3" style={{ marginTop: 18 }}>语言</div>
      <div style={{ marginTop: 8 }}><Seg items={['跟随系统', 'English', '简体中文']} value={lang} onChange={v => { setLang(v); nav.toast(v === 'English' ? '界面会换成英文（一句话中英文都能听懂）' : '已切换'); }} /></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18, minHeight: 56, borderTop: '1px solid var(--line)' }}><div style={{ flex: 1 }}><div style={{ fontSize: 16 }}>提醒没保存的导出</div><div className="lbl">生成好了没选位置，就在通知里提醒</div></div><Switch on={remind} onClick={() => setRemind(!remind)} /></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, borderTop: '1px solid var(--line)' }}><div style={{ flex: 1 }}><div style={{ fontSize: 16 }}>AI 帮忙理解一句话</div><div className="lbl">本机读不懂时才用，只发文字，要会员</div></div><Switch on={g.aiOn !== false} onClick={() => nav.set({ aiOn: g.aiOn === false })} /></div>
      <button className="row" style={{ padding: '10px 0', borderTop: '1px solid var(--line)' }} onClick={() => setData(!data)}><span className="row-m"><span className="row-t">你的数据在哪里、卸载时会怎样</span></span><Ic n={data ? 'up' : 'down'} s={20} /></button>
      {data && <div style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.7, paddingBottom: 10 }}>所有声音和版本都存在这台手机的声剪文件夹里，一共 1.2 GB。卸载声剪会一起删掉；换手机前，在音频库里「导出工程包」带走。登录和会员信息在服务器上，不含任何音频。</div>}
      {['使用指南', '常见问题', '联系支持', '第三方许可'].map((x, i) => <button key={x} className="row" style={{ padding: '10px 0', borderTop: '1px solid var(--line)' }} onClick={() => nav.go('help', { sec: i })}><span className="row-m"><span className="row-t">{x}</span></span><Ic n="chev" s={20} /></button>)}
      <div style={{ fontSize: 14, color: 'var(--ink-3)', padding: '14px 0' }}>声剪 1.0（设计稿）</div>
    </div></div>
  </div>;
}
function Help({ p }) {
  const secs = [['使用指南', ['在首页对最近那段声音说一句，比如「剪掉开头3秒」。', '计划页上点一个短语，看它落在声音的哪里；数字能改，不想要的划掉。', '处理工具会存成新版本，原来的一直都在。']],
    ['常见问题', ['导出的文件有水印吗？没有，本机功能都免费、不加水印。', '没有网能用吗？剪、处理、导出、本机朗读都不用网。', '一句话听不懂怎么办？换个说法，或者开会员请 AI 帮忙。']],
    ['联系支持', ['写邮件到 support@example.com，附上设备型号和出问题的步骤。', '不会让你上传音频，除非你自己附上。']],
    ['第三方许可', ['LAME 3.100（LGPL）：MP3 编码', 'Noto Sans SC（OFL）：界面字体', 'Red Hat Display / Text（OFL）：数字与拉丁字母']]];
  const [open, setOpen] = useState(p.sec != null ? p.sec : 0);
  return <div className="scr enter"><Top title="帮助" /><div className="scroll">{secs.map(([t, items], i) => <div key={t}>
    <button className="row" onClick={() => setOpen(open === i ? -1 : i)}><span className="row-m"><span className="row-t" style={{ fontWeight: 700 }}>{t}</span></span><Ic n={open === i ? 'up' : 'down'} s={20} /></button>
    {open === i && <div style={{ padding: '0 16px 10px' }}>{items.map(x => <div key={x} style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--ink-2)', padding: '4px 0' }}>{x}</div>)}</div>}</div>)}</div></div>;
}

/* ================= batch ================= */
function Batch({ p }) {
  const { nav, g } = useContext(PhoneCtx);
  const [stage, setStage] = useState(p.stage || 'pick');
  const [tpl, setTpl] = useState(p.tpl || 'clean');
  const [files, setFiles] = useState(p.files || 24);
  const [done, setDone] = useState(p.stage === 'run' ? SJ.BATCH.run.done : 0);
  const [paused, setPaused] = useState(false);
  const total = files;
  useEffect(() => { if (stage !== 'run' || paused) return; if (done >= total) { setStage('report'); return; } const t = setTimeout(() => setDone(done + 1), 700); return () => clearTimeout(t); }, [stage, done, paused]);
  const over = files > FREE_BATCH && !g.member;
  const sentence = '降噪，删掉长停顿，统一音量';
  if (stage === 'run') return <div className="scr enter"><Top title="批量处理" sub={SJ.BATCH.templates.find(t => t.id === tpl).name} />
    <div className="scroll"><div className="pad" style={{ paddingTop: 20 }}>
      <div className="num" style={{ fontSize: 64, fontWeight: 700, lineHeight: 1 }}>{done}<span style={{ fontSize: 30, color: 'var(--ink-3)' }}> / {total}</span></div>
      <div style={{ fontSize: 15, color: 'var(--ink-2)', marginTop: 8 }}>{paused ? '暂停了' : `第 ${Math.min(total, done + 1)} 个：${BATCH_FILES[Math.min(23, done)]}，编码中`}</div>
      <div className="bar" style={{ marginTop: 16, height: 8 }}><i style={{ width: (done / total * 100) + '%' }} /></div>
      <div style={{ fontSize: 15, marginTop: 12 }}>失败 <b className="num">{done > 6 ? 1 : 0}</b> 个，做完会列出原因</div>
      <div style={{ fontSize: 14, color: 'var(--ink-3)', marginTop: 16, lineHeight: 1.6 }}>可以离开声剪，通知栏一直有进度；做完会通知你。</div>
      <div style={{ display: 'flex', gap: 8, marginTop: 18 }}><button className="btn btn-s" onClick={() => setPaused(!paused)}>{paused ? '继续' : '暂停'}</button><button className="btn-t" onClick={() => nav.shade()}>看通知栏</button></div>
    </div></div></div>;
  if (stage === 'report') return <div className="scr enter"><Top title="做完了" sub={`存到 下载/声剪批量`} />
    <div className="scroll">
      <div className="pad" style={{ fontSize: 16, lineHeight: 1.7 }}>完成 <b className="num">{total - 1}</b> 个，失败 <b className="num">1</b> 个，<b className="num">2</b> 个有爆音（已限幅）。</div>
      <div className="row" style={{ minHeight: 36, fontSize: 13, color: 'var(--ink-3)' }}><span className="row-m">文件</span><span style={{ width: 70 }}>结果</span><span style={{ width: 56, textAlign: 'right' }}>爆音</span></div>
      {BATCH_REPORT.map(r => <div key={r.f} className="row" style={{ minHeight: 40, padding: '6px 16px', borderTop: '1px solid var(--line)' }}><span className="row-m ell" style={{ fontSize: 15 }}>{r.f}</span><span style={{ width: 70, fontSize: 14, fontWeight: r.st === 'fail' ? 700 : 400 }}>{r.st === 'fail' ? '文件坏了' : '好了'}</span><span className="num" style={{ width: 56, textAlign: 'right', fontSize: 14 }}>{r.clip ? r.clip + ' 处' : '无'}</span></div>)}
    </div>
    <div className="bot" style={{ display: 'flex', gap: 8 }}><button className="btn btn-s" style={{ flex: 1 }} onClick={() => nav.toast('报告存成了 CSV，和结果放在一起')}>导出报告</button><button className="btn btn-p" style={{ flex: 1 }} onClick={() => nav.toast('会打开 下载/声剪批量')}>打开文件夹</button></div></div>;
  return <div className="scr enter">
    <Top title="批量处理" />
    <div className="scroll">
      <div className="pad" style={{ fontSize: 15, color: 'var(--ink-2)', marginBottom: 6 }}>一批文件用同一个做法，结果存到你选的文件夹。</div>
      {SJ.BATCH.templates.map(t => <button key={t.id} className="row" onClick={() => setTpl(t.id)} style={{ minHeight: 58 }}><span className={'radio' + (tpl === t.id ? ' on' : '')} /><span className="row-m"><span className="row-t">{t.name}</span><span className="row-d">{t.desc}</span></span></button>)}
      {tpl === 'sentence' && <div style={{ margin: '4px 12px 0', background: 'var(--surface)', borderRadius: 20, padding: '12px 14px' }}><div className="lbl">对每个文件说</div><Sentence text={sentence} steps={PARSE[sentence].steps} size={22} /><div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 4 }}>批量只用不需要你盯着的工具；不会自动请 AI。</div></div>}
      <div className="hr" style={{ margin: '12px 16px' }} />
      <button className="row" onClick={() => nav.toast('会打开系统的文件选择，可以多选')}><Ic n="file" /><span className="row-m"><span className="row-t">文件：{files} 个</span><span className="row-d">访谈素材 01–{String(files).padStart(2, '0')}.m4a</span></span><span className="btn-t">重选</span></button>
      <button className="row" onClick={() => nav.toast('会打开系统的文件夹选择')}><Ic n="folder" /><span className="row-m"><span className="row-t">存到：下载/声剪批量</span><span className="row-d">原文件不动</span></span><span className="btn-t">换</span></button>
      {over && <div style={{ margin: '8px 12px 0', background: 'var(--surface)', borderRadius: 20, padding: '12px 14px', boxShadow: 'inset 0 0 0 1.5px var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><b style={{ fontSize: 16, flex: 1 }}>免费版一次最多 {FREE_BATCH} 个</b><Member /></div>
        <div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 4 }}>这次选了 {files} 个。可以先做前 {FREE_BATCH} 个，剩下的下一批再做；会员不限数量。</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}><button className="btn btn-s" style={{ height: 42 }} onClick={() => setFiles(FREE_BATCH)}>先做前 {FREE_BATCH} 个</button><button className="btn btn-o" style={{ height: 42 }} onClick={() => nav.go('member', { from: 'batch' })}>会员不限量</button></div>
      </div>}
      <div style={{ height: 14 }} />
    </div>
    <div className="bot"><button className="btn btn-p wide" onClick={() => over ? nav.toast(`先选「先做前 ${FREE_BATCH} 个」，或开会员`) : (setDone(0), setStage('run'))}>开始处理 {Math.min(files, over ? FREE_BATCH : files)} 个</button></div>
  </div>;
}

/* ================= versions ================= */
function Versions({ p }) {
  const { nav, g, player } = useContext(PhoneCtx);
  const item = libItem(p.item || 'interview');
  const names = item.id === 'interview' ? g.versions : (item.versionNames || ['原始音频']);
  const lens = { 原始录音: 1120, 降噪: 1120, 删掉停顿: 1106 };
  const [cur, setCur] = useState(names.length - 1);
  return <div className="scr enter">
    <Top title="版本" sub={<Dot s={item.title} />} />
    <div className="scroll">
      <div className="pad" style={{ fontSize: 15, color: 'var(--ink-2)', marginBottom: 8, lineHeight: 1.6 }}>每次处理都存成新版本，原来的一直都在。</div>
      {names.map((n, i) => <div key={n + i} className="row" style={{ alignItems: 'flex-start' }}>
        <div style={{ width: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', alignSelf: 'stretch' }}><span style={{ width: 12, height: 12, borderRadius: 6, background: i === cur ? 'var(--ink)' : 'var(--surface)', boxShadow: 'inset 0 0 0 2px var(--ink)', marginTop: 6 }} />{i < names.length - 1 && <span style={{ flex: 1, width: 2, background: 'var(--line)', marginTop: 4 }} />}</div>
        <div className="row-m">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><b style={{ fontSize: 17 }}>{n}</b>{i === cur && <span className="badge solid">正在用</span>}</div>
          <div className="row-d">{i === 0 ? (item.id === 'interview' ? '今天 09:42 录的' : item.from) : `由「${n.replace('人声、伴奏', '人声分离')}」做出`}，<span className="num">{fmt(lens[n] || item.seconds)}</span></div>
          <div style={{ marginTop: 6 }}><Wave env={i === 0 && item.id === 'interview' ? envSpeech() : envThumb(item.id + n, item.kind)} rate={i === 0 && item.id === 'interview' ? 50 : 6} w={236} h={28} thin /></div>
          <div style={{ display: 'flex', gap: 2, marginLeft: -10, marginTop: 2 }}>
            <button className="btn-t" style={{ height: 36 }} onClick={() => player.toggle('ver' + i, 5)}>{player.on('ver' + i) ? '停' : '试听'}</button>
            {i !== cur && <button className="btn-t" style={{ height: 36 }} onClick={() => { setCur(i); nav.toast(`切到「${n}」了`); }}>用这个</button>}
            {i > 0 && <button className="btn-t" style={{ height: 36, color: 'var(--ink-2)' }} onClick={() => { if (item.id === 'interview') nav.set(x => ({ versions: x.versions.filter(v => v !== n) })); nav.toast(`删了「${n}」，其他版本不受影响`); }}>删除</button>}
          </div>
        </div>
      </div>)}
      {item.kind === 'mix' && <div style={{ margin: '6px 12px', background: 'var(--surface)', borderRadius: 18, padding: '12px 14px' }}><div style={{ fontSize: 16, fontWeight: 700 }}>做法还在</div><div style={{ fontSize: 14, color: 'var(--ink-2)', margin: '2px 0 8px' }}>串烧的 6 首歌和接缝都记着，可以回头再调。</div><button className="btn btn-s" style={{ height: 40 }} onClick={() => nav.go('tool', { id: item.id === 'annual' ? 'loop' : 'medley', item: item.id, readjust: true })}>再调一下</button></div>}
      <div style={{ height: 12 }} />
    </div>
    <div className="bot"><button className="btn btn-s wide" onClick={() => nav.toast('工程包带上全部 ' + names.length + ' 个版本，换手机时导入')}>导出工程包</button></div>
  </div>;
}

/* ================= notification shade ================= */
function Shade({ close }) {
  const { player, nav } = useContext(PhoneCtx);
  const on = player.on('home') || player.playing;
  return <div className="shade" style={{ position: 'absolute', inset: 0, zIndex: 60, background: 'var(--scrim)', animation: 'fadeIn .15s' }} onClick={close}>
    <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg)', borderRadius: '0 0 28px 28px', padding: '6px 12px 14px', animation: 'shadeIn .22s ease-out' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '0 6px 8px' }}><b className="num" style={{ fontSize: 30 }}>9:41</b><span style={{ fontSize: 14, color: 'var(--ink-2)' }}>11月23日 周一</span></div>
      <div style={{ background: 'var(--surface)', borderRadius: 20, padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Logo s={22} /><span style={{ fontSize: 13, color: 'var(--ink-3)', flex: 1 }}>声剪　正在播放</span></div>
        <div style={{ fontSize: 16, fontWeight: 700, marginTop: 6 }} className="ell"><Dot s={SJ.LIBRARY[0].title} /></div>
        <div className="bar" style={{ height: 4, marginTop: 8 }}><i style={{ width: '22%' }} /></div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 6 }}>
          <button className="ib" onClick={() => nav.toast('后退 10 秒')} aria-label="后退 10 秒"><Ic n="undo" /></button>
          <PlayBtn on={on} onClick={() => player.toggle('home', 130)} />
          <button className="ib" onClick={() => nav.toast('前进 10 秒')} aria-label="前进 10 秒"><Ic n="redo" /></button>
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>锁屏上也能控制；拔下耳机会自动暂停</div>
      </div>
      {[['正在导出', '广场舞串烧 · 6 首', 64], ['批量处理', '17 / 24，失败 1 个', 71]].map(([a, b, v]) => <div key={a} style={{ background: 'var(--surface)', borderRadius: 20, padding: '10px 14px', marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Logo s={22} /><span style={{ fontSize: 13, color: 'var(--ink-3)', flex: 1 }}>声剪　{a}</span><span className="num" style={{ fontSize: 13 }}>{v}%</span></div>
        <div style={{ fontSize: 15, marginTop: 4 }}><Dot s={b} /></div><div className="bar" style={{ height: 4, marginTop: 6 }}><i style={{ width: v + '%' }} /></div></div>)}
      <div style={{ background: 'var(--surface)', borderRadius: 20, padding: '10px 14px', marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}><Logo s={22} /><span style={{ flex: 1, fontSize: 15 }}>「晚风」的铃声生成好了，还没保存</span><button className="btn-t" style={{ height: 34 }} onClick={() => { close(); nav.go('export', { item: 'wanfeng', stage: 'ready', purpose: 'sound' }); }}>保存</button></div>
      <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--surface-3)', margin: '12px auto 0' }} />
    </div>
  </div>;
}

/* ================= sheets everyone can open ================= */
function SheetHost({ sheet }) {
  const { nav, g } = useContext(PhoneCtx);
  const k = sheet.k, p = sheet.p || {}, close = nav.close;
  const [sil, setSil] = useState(5);
  if (k === 'item') { const it = libItem(p.id); return <Sheet title={<span className="ell" style={{ display: 'block' }}><Dot s={it.title} /></span>} close={close}>
    {it.id === restoredId && <div style={{ margin: '0 16px 8px', background: 'var(--surface-2)', borderRadius: 14, padding: '10px 12px', fontSize: 14, lineHeight: 1.6 }}>上次没保存完整，已用备份恢复到 11月12日 21:40 的样子。</div>}
    {[['edit', '改名'], ['save', '导出'], ['layers', `版本（${it.versions} 个）`], ['folder', `占用 ${Math.round(it.seconds * 0.17)} MB`], ['pack', '导出工程包'], ['trash', '删除']].map(([ic, t], i) => <button key={t} className="row" onClick={() => { close(); [() => nav.toast('改名：输入新名字'), () => nav.go('export', { item: it.id }), () => nav.go('versions', { item: it.id }), () => nav.toast('原始和各版本加起来，导出后的文件不算'), () => nav.toast('工程包带上所有版本，换手机时在「新建」里导入'), () => nav.toast(`删了「${plain(it.title)}」`, '撤销')][i](); }}><Ic n={ic} /><span className="row-m" style={{ fontSize: 16 }}>{t}</span></button>)}
  </Sheet>; }
  if (k === 'gate') { const w = { voice: [`「${p.name}」是会员音色`, '试听不要钱。用它生成要开通会员，真人感音色每月 20 万字。', '先用本机音色'], vip: [`「${p.name}」是会员曲目`, '试听不要钱。导入和配乐要会员；免费曲目照样能用。', '换一首免费的'], ai: ['请 AI 听懂口语，是会员功能', '只发这一句的文字，不发声音。本机能读懂的说法一直免费，比如「剪掉开头3秒」。', '我换个说法'], clone: ['克隆声音是会员功能', '照着读和本机检查都免费。保存成「我的声音」要会员。', '先不用'], batch: [`免费版一次最多 ${FREE_BATCH} 个`, '会员不限数量。', '先做一部分'] }[p.why] || ['会员功能', '', '先不用'];
    return <Sheet title={w[0]} close={close}><div style={{ padding: '0 20px' }}>
      <div style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.7 }}>{w[1]}</div>
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}><button className="btn btn-s" style={{ flex: 1 }} onClick={close}>{w[2]}</button><button data-anchor="gate-go" className="btn btn-p" style={{ flex: 1 }} onClick={() => { close(); nav.go('member', { from: p.why }); }}>看看会员</button></div>
    </div></Sheet>; }
  if (k === 'aiConsent') return <Sheet title="第一次请 AI 帮忙" close={close}><div style={{ padding: '0 20px' }}>
    <div style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.7 }}>会把这一句的文字发给 AI 服务，让它改写成声剪听得懂的说法。不发声音，也不发别的内容。改写后的句子你看过才会用；设置里随时能关。</div>
    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}><button className="btn btn-s" style={{ flex: 1 }} onClick={close}>不用了</button><button className="btn btn-p" style={{ flex: 1 }} onClick={() => { nav.set({ aiConsent: true }); close(); }}>同意，帮我理解</button></div>
  </div></Sheet>;
  if (k === 'blank') return <Sheet title="一段空白" close={close}><div style={{ padding: '0 20px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><span style={{ flex: 1, fontSize: 16 }}>多长</span><Stepper value={sil} unit="秒" step={1} min={0.05} max={600} onChange={setSil} /></div>
    <div className="lbl" style={{ marginTop: 6 }}>0.05 到 600 秒。做好后可以往里录音、粘贴、插入声音。</div>
    <button className="btn btn-p wide" style={{ marginTop: 14 }} onClick={() => { close(); nav.toast(`做好了一段 ${sil} 秒的空白`); }}>做一段空白</button>
  </div></Sheet>;
  if (k === 'samples') return <Sheet title="示例音频" close={close}>{SAMPLES.map(s => <button key={s.id} className="row" onClick={() => { close(); nav.go('editor', { item: s.id === 'sa' ? 'interview' : 'wanfeng' }); }}><Ic n="sample" /><span className="row-m"><span className="row-t">{s.title}</span><span className="row-d num">{fmt(s.seconds)}</span></span></button>)}</Sheet>;
  if (k === 'package') return <Sheet title="导入工程包" close={close}><div style={{ padding: '0 20px 4px', fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.6 }}>工程包是在旧手机上「导出工程包」得到的，带着所有版本和改动记录。</div>
    <button className="row" onClick={() => { close(); nav.toast('导入了「播客第 12 期」，3 个版本都在'); }}><Ic n="pack" /><span className="row-m"><span className="row-t">播客第 12 期.sjpack</span><span className="row-d">186 MB　11月20日　下载</span></span></button></Sheet>;
  if (k === 'saveLoc') return <Sheet title="存到哪里" close={close}><div style={{ padding: '0 20px 6px', fontSize: 14, color: 'var(--ink-3)' }}>系统的文件选择：{p.name}</div>
    {['下载/声剪', '音乐', '文档'].map(f => <button key={f} className="row" onClick={() => { close(); p.done && p.done(); }}><Ic n="folder" /><span className="row-m" style={{ fontSize: 16 }}>{f}</span></button>)}</Sheet>;
  if (k === 'share') return <Sheet title="分享" close={close}><div style={{ padding: '0 20px 6px', fontSize: 14, color: 'var(--ink-3)' }}>手机的分享面板：{p.name}</div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, padding: '8px 16px 4px' }}>{['微信', 'QQ', '邮件', '蓝牙', '信息', '云盘', '复制', '更多'].map(x => <button key={x} onClick={() => { close(); nav.toast(`发到「${x}」了`); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, fontSize: 13 }}><span style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', fontSize: 15, fontWeight: 700 }}>{x.slice(0, 2)}</span>{x}</button>)}</div></Sheet>;
  if (k === 'buy') { const pl = SJ.MEMBERSHIP.plans.find(x => x.id === p.plan); return <Sheet title="Google Play" close={close}><div style={{ padding: '0 20px' }}>
    <div style={{ fontSize: 17, fontWeight: 700 }}>声剪 {pl.name}</div><div style={{ fontSize: 15, color: 'var(--ink-2)', marginTop: 2 }}>{pl.id === 'year' ? '7 天免费，之后 ' : ''}<span className="num">{pl.price}</span>，随时取消</div>
    <div className="lbl" style={{ marginTop: 6 }}>{SJ.MEMBERSHIP.priceNote}</div>
    <button className="btn btn-p wide" style={{ marginTop: 16 }} onClick={() => { nav.set({ member: true }); close(); nav.toast('会员开通了：真人感音色、克隆、会员曲目都能用了'); }}>{pl.id === 'year' ? '开始免费试用' : '订阅'}</button>
  </div></Sheet>; }
  return null;
}

Object.assign(window, { Export, MemberScreen, Login, Me, Settings, Help, Batch, Versions, Shade, SheetHost });
