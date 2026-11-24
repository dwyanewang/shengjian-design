/* ===== Text to speech, voice cloning, subtitle dubbing ===== */
function VoicePrint({ id, w = 22, h = 44, on }) { return <Mini S={shortEnv(id, 3.2)} w={w} h={h} half={w / 2} lit={on ? 1 : null} />; }
function TtsScreen({ ph, p, dir }) {
  const V = SJ.VOICES;
  const [text, setText] = useState(V.ttsText);
  const [tab, setTab] = useState(p.tab || 'online');
  const [voice, setVoice] = useState(p.voice || 'linxi');
  const [speed, setSpeed] = useState(1);
  const [play, setPlay] = useState(null);
  const [phase, setPhase] = useState('setup');
  const [pct, setPct] = useState(0);
  const [mine, setMine] = useState(V.mine);
  const all = [...V.system, ...V.online, ...mine];
  const cur = all.find(v => v.id === voice) || V.system[0];
  const online = V.online.includes(cur);
  const locked = online && !ph.member;
  const secs = Math.round(text.length / 4.2 / speed);
  useEffect(() => { if (!play) return; const t = setTimeout(() => setPlay(null), 2600); return () => clearTimeout(t); }, [play]);
  const go = () => { setPhase('gen'); setPct(0); let k = 0; const i = setInterval(() => { k += 9; setPct(Math.min(100, k)); if (k >= 100) { clearInterval(i); setPhase('done'); } }, 110); };
  const list = tab === 'sys' ? V.system : tab === 'online' ? V.online : mine;
  return <div className={cx('scr', dir)}>
    <Hdr title="文字读出来" sub="生成后是一段新音频，可以接着剪" onBack={ph.nav.pop} right={<Btn sm line style={{ marginRight: 6 }} onClick={() => ph.nav.push('subtitle')}>字幕配音</Btn>} />
    <div className="body">
      <div className="pad"><textarea className="ta" value={text} onChange={e => setText(e.target.value)} rows={3} />
        <p className="note num" style={{ textAlign: 'right', marginTop: 4 }}>{text.length} 字，读出来约 {secs} 秒</p></div>
      <div className="st" style={{ marginTop: 6 }}><b>谁来读</b></div>
      <div className="pad"><Seg value={tab} options={[{ v: 'sys', l: '本机音色' }, { v: 'online', l: <span>真人感 <Vip /></span> }, { v: 'mine', l: '我的声音' }]} onChange={setTab} /></div>
      <p className="note pad" style={{ marginTop: 8 }}>{tab === 'sys' ? '手机自带的朗读引擎，不联网，免费。' : tab === 'online' ? '联网合成，听起来像真人。每一位都能先免费试听。' : '用你自己的声音读任何文字。'}</p>
      <div style={{ padding: '6px 8px 0', display: 'grid', gap: 4 }}>
        {list.map(v => <button key={v.id} className={cx('vrow', voice === v.id && 'on')} onClick={() => setVoice(v.id)}>
          <VoicePrint id={v.id} on={play === v.id} />
          <div className="lt"><b>{v.name.replace('系统 · ', '')}</b>{v.vip && !ph.member && <span style={{ display: 'inline', marginLeft: 6 }}><Vip /></span>}<span>{v.desc ? v.desc.replace(' · ', '，') : v.tag + '，' + v.quality}{v.use ? '　' + v.use : ''}</span>
            {play === v.id && <span style={{ color: 'var(--glow)' }}>「{v.sample || '这是本机朗读引擎的声音。'}」</span>}</div>
          <span className={cx('playsm', play === v.id && 'on')} onClick={e => { e.stopPropagation(); setPlay(x => (x === v.id ? null : v.id)); }} role="button" aria-label="试听"><Icon n={play === v.id ? 'pause' : 'play'} s={16} /></span>
        </button>)}
        {tab === 'mine' && <button className="vrow" onClick={() => ph.nav.push('clone')}><span className="playsm" style={{ width: 22 + 14, borderRadius: 18 }}><Icon n="plus" s={18} /></span><div className="lt"><b>再克隆一个</b><span>照着读一句话，5 秒左右</span></div></button>}
        {tab === 'mine' && <div className="pad" style={{ display: 'flex', gap: 8, marginTop: 4 }}><Btn sm line onClick={() => ph.toast('改名')}>改名</Btn><Btn sm line onClick={() => ph.toast('播放参考录音（5.2 秒）')}>听参考录音</Btn><Btn sm line onClick={() => ph.nav.push('clone')}>重新克隆</Btn><Btn sm line onClick={() => ph.toast('删掉了；服务器上的也一起删')}>删除</Btn></div>}
      </div>
      <div className="pad" style={{ marginTop: 10 }}><div className="kv" style={{ paddingBottom: 0 }}>语速<span className="num" style={{ color: 'var(--t1)' }}>{speed === 1 ? '正常' : speed + ' 倍'}</span></div><Slider value={speed} min={0.5} max={2} step={0.1} onChange={setSpeed} /></div>
      <div style={{ height: 16 }} />
    </div>
    <div className="dock" style={{ padding: '10px 12px 12px' }}>
      {phase === 'setup' && (locked ? <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}><b style={{ fontSize: 14.5, color: 'var(--vip)' }}>{cur.name}是会员音色</b><span className="note" style={{ display: 'block' }}>试听免费；生成要会员</span></div>
        <Btn line onClick={() => setTab('sys')}>用本机的</Btn><Btn k="pri" onClick={() => ph.nav.push('member', { from: 'voice' })}>看会员</Btn></div>
        : <Btn k="pri" full onClick={go}>用「{cur.name.replace('系统 · ', '')}」生成配音</Btn>)}
      {phase === 'gen' && <div style={{ padding: '4px 4px' }}><b style={{ fontSize: 15 }}>正在合成{online ? '（联网）' : '（本机）'}</b><div className="bar"><i style={{ width: pct + '%' }} /></div></div>}
      {phase === 'done' && <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div style={{ flex: 1 }}><b style={{ fontSize: 15 }}>生成好了，{secs} 秒</b><span className="note" style={{ display: 'block' }}>存进音频库了{online ? '，来源写着在线音色' : ''}</span></div><Btn line onClick={() => setPhase('setup')}>再来</Btn><Btn k="pri" onClick={() => ph.nav.push('editor', { id: 'interview', noHint: true })}>去剪</Btn></div>}
    </div>
  </div>;
}
SCREENS.tts = TtsScreen;

function CloneScreen({ ph, dir }) {
  const V = SJ.VOICES;
  const [ph2, setPh2] = useState('read'); // read | rec | check | consent | saved
  const [t, setT] = useState(0);
  const [checks, setChecks] = useState(0);
  const [agree, setAgree] = useState(false);
  useEffect(() => { if (ph2 !== 'rec') return; const i = setInterval(() => setT(x => { if (x >= 5.2) { clearInterval(i); setPh2('check'); return 5.2; } return +(x + 0.1).toFixed(1); }), 100); return () => clearInterval(i); }, [ph2]);
  useEffect(() => { if (ph2 !== 'check') return; setChecks(0); const i = setInterval(() => setChecks(c => { if (c >= 4) { clearInterval(i); return 4; } return c + 1; }), 380); return () => clearInterval(i); }, [ph2]);
  const S = shortEnv('me', 5.2);
  return <div className={cx('scr', dir)}>
    <Hdr title="克隆我的声音" sub="录音和检查都在本机完成" onBack={ph.nav.pop} />
    <div className="body pad">
      <p className="note" style={{ marginTop: 8 }}>照着读这句话，正常语速，3 到 6 秒：</p>
      <p style={{ fontFamily: 'var(--f-disp)', fontSize: 25, lineHeight: 1.6, fontWeight: 600, marginTop: 8 }}>{V.clonePassage}</p>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 18 }}>
        <div style={{ width: 40, height: 150, position: 'relative' }}>{ph2 !== 'read' && <Mini S={S} w={40} h={150} half={20} to={Math.max(0.2, ph2 === 'rec' ? t : 5.2)} />}</div>
        <div style={{ flex: 1 }}>{ph2 === 'read' && <p className="t2" style={{ fontSize: 15 }}>找个安静的地方，手机离嘴一拃远。</p>}
          {ph2 === 'rec' && <p className="num" style={{ fontSize: 34, fontWeight: 300 }}>{t.toFixed(1)} 秒</p>}
          {(ph2 === 'check' || ph2 === 'consent' || ph2 === 'saved') && <div style={{ display: 'grid', gap: 6 }}>{V.cloneChecks.map((c, i) => <div key={c} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14.5, opacity: i < checks ? 1 : 0.3 }}><span className="ck on" style={{ width: 20, height: 20, background: 'var(--glow)' }}><Icon n="check" s={13} w={2.6} /></span>{c}</div>)}</div>}</div>
      </div>
      {(ph2 === 'consent' || ph2 === 'saved') && <div className="card" style={{ padding: 14, marginTop: 18 }}>
        <button style={{ display: 'flex', gap: 10, textAlign: 'left', alignItems: 'flex-start', fontSize: 14.5, lineHeight: 1.6 }} onClick={() => setAgree(a => !a)}><span className={cx('ck', agree && 'on')} style={{ marginTop: 2 }}>{agree && <Icon n="check" s={14} w={2.4} />}</span>这是我自己的声音。我同意把这 5 秒录音上传，用来合成我的音色；可以随时删除。</button></div>}
    </div>
    <div className="dock" style={{ padding: 12 }}>
      {ph2 === 'read' && <Btn k="pri" full icon="rec" onClick={() => { setT(0); setPh2('rec'); }}>按下开始读</Btn>}
      {ph2 === 'rec' && <Btn full onClick={() => setPh2('check')}>读完了</Btn>}
      {ph2 === 'check' && <div style={{ display: 'flex', gap: 10 }}><Btn line onClick={() => setPh2('read')}>重录</Btn><Btn k="pri" style={{ flex: 1 }} disabled={checks < 4} onClick={() => setPh2('consent')}>{checks < 4 ? '在本机检查…' : '没问题，下一步'}</Btn></div>}
      {ph2 === 'consent' && <Btn k="pri" full disabled={!agree} onClick={() => { if (!ph.member) return ph.openSheet('gate', { what: 'clone' }); setPh2('saved'); ph.toast('「我的声音」存好了'); }}>{ph.member ? '保存我的声音' : '保存我的声音（会员）'}</Btn>}
      {ph2 === 'saved' && <Btn k="pri" full onClick={() => ph.nav.pop()}>用它读文字</Btn>}
    </div>
  </div>;
}
SCREENS.clone = CloneScreen;

/* subtitle dubbing: every cue is a capsule on the spine, the text sits beside it */
const CUES = [
  [0.5, 3.2, '这款保温杯用的是双层真空结构', 'ok'], [3.6, 6.0, '早上倒进去的热水', 'ok'], [6.2, 8.4, '到下午还是烫的', 'ok'],
  [9.5, 12.0, '杯盖可以单手打开，开车也方便', 'fast'], [12.6, 14.6, '杯身是食品级不锈钢', 'ok'], [15.0, 18.8, '三种颜色：雾蓝、燕麦、石墨', 'push'],
  [19.6, 22.0, '今天下单送一个杯套', 'ok'], [22.4, 24.6, '链接在下面', 'ok'],
];
function SubtitleScreen({ ph, dir }) {
  const [voice, setVoice] = useState('sys-f');
  const [phase, setPhase] = useState('setup');
  const [k, setK] = useState(0);
  const items = CUES.map((c, i) => ({ k: 'cap', id: 'q' + i, r0: c[0], r1: c[3] === 'push' ? c[1] + 0.3 : c[1], ref: { n: i + 1 } }));
  const lay = { dur: 26, items };
  const amp = (a, b) => (items.some(it => a >= it.r0 && a < it.r1) ? envSampler(shortEnv('dub', 26))(a, b) : 0.02);
  const api = useRef();
  useEffect(() => { if (phase !== 'run') return; const i = setInterval(() => setK(x => { if (x >= CUES.length) { clearInterval(i); setPhase('done'); return x; } return x + 1; }), 420); return () => clearInterval(i); }, [phase]);
  const st = { ok: ['刚好', 'var(--t3)'], fast: ['说不完，加速到 1.12 倍', 'var(--warm)'], push: ['往后推 0.3 秒', 'var(--warm)'] };
  return <div className={cx('scr', dir)}>
    <Hdr title="字幕配音" sub="产品介绍.srt，8 句，逐句合成对齐时间" onBack={ph.nav.pop} />
    <SpineView height={SCR_H - HDR_H - 200} dur={26} pps={17} cols={[{ x: 96, capW: 64, lay, amp, kind: 'speech', alpha: 1 }]} ver={phase + k} initR={7} apiRef={api} zoomCtl={false} onZoom={() => { }} phFrac={0.12}
      overlay={({ Y }) => <Fragment>{CUES.map((c, i) => <div key={i} style={{ position: 'absolute', left: 138, right: 10, top: Y(c[0]) - 1, lineHeight: 1.4 }}>
        <span style={{ fontSize: 14.5, color: phase !== 'setup' && i >= k ? 'var(--t3)' : 'var(--t1)' }}>{c[2]}</span>
        <span style={{ display: 'block', fontSize: 12, color: st[c[3]][1] }}>{phase !== 'setup' && i >= k ? '等着合成' : st[c[3]][0]}</span></div>)}</Fragment>} />
    <div className="panel" style={{ height: 200, animation: 'none' }}>
      <div className="pad" style={{ paddingTop: 12 }}><div className="kv" style={{ paddingTop: 0 }}>谁来读<Seg value={voice} options={[{ v: 'sys-f', l: '本机女声' }, { v: 'linxi', l: <span>林溪 <Vip /></span> }]} onChange={v => (v === 'linxi' && !ph.member ? ph.openSheet('gate', { what: 'voice' }) : setVoice(v))} style={{ width: 210 }} /></div>
        <p className="note">每句从字幕的时间开始读；读不完就先用后面的空当，再加速（音高不变），还不够才往后推。</p></div>
      <div className="pad" style={{ marginTop: 'auto', paddingBottom: 12 }}>{phase === 'setup' ? <Btn k="pri" full onClick={() => { setK(0); setPhase('run'); }}>开始配音</Btn>
        : phase === 'run' ? <div><b style={{ fontSize: 15 }}>第 {Math.min(k + 1, CUES.length)} 句，共 {CUES.length} 句</b><div className="bar"><i style={{ width: (k / CUES.length) * 100 + '%' }} /></div></div>
          : <div style={{ display: 'flex', gap: 10 }}><Btn line onClick={() => setPhase('setup')}>改几句</Btn><Btn k="pri" style={{ flex: 1 }} onClick={() => ph.toast('存成新音频了，每句开头一个标记；改了字幕只重读改过的那几句')}>存成新音频</Btn></div>}</div>
    </div>
  </div>;
}
SCREENS.subtitle = SubtitleScreen;
