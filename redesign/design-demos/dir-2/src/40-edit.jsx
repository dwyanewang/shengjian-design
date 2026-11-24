/* ===================== 40 · 剪（工作台）、一句话计划、导出、音乐库 ===================== */
const SEN = SJ.SENTENCE;
const MARKS = [{ t: 2.6, n: '开讲' }, { t: 24.3, n: '第一个问题' }];
const MORE_EDITS = [
  ['标', '标记', 'marker'], ['静', '插入静音', 'silence'], ['插', '插入音频', 'insert'], ['拍', '对齐节拍', 'beat'],
  ['序', '片段顺序', 'order'], ['时', '精确时间', 'time'], ['线', '音量曲线', 'curve'], ['谱', '频谱', 'spec'], ['缩', '缩放', 'zoom'],
];
const TOOL_GROUPS = ['让声音更好', '改变声音', '拆与合', '文字'];

function FadeCurve({ kind, on }) {
  const d = { 正弦: 'M2 4 C 14 4, 22 34, 34 34', 线性: 'M2 4 L 34 34', 对数: 'M2 4 C 6 26, 14 34, 34 34' }[kind];
  return <svg width="36" height="38" viewBox="0 0 36 38"><path d={d} fill="none" stroke={on ? '#fff' : BLUE} strokeWidth="3" /></svg>;
}

function EditPanel({ which, nav, ed, setEd, close }) {
  const [v, setV] = useState({ db: 3, tgt: ed.sel ? '选区' : '整体', fade: '淡出', flen: '2 秒', curve: '正弦', xf: true, rep: '2 遍', sil: '1', where: '播放头', snap: true, a: ed.sel ? ed.sel[0] : 0, b: ed.sel ? ed.sel[1] : 2.6 });
  const set = (k, x) => setV({ ...v, [k]: x });
  const done = (msg, patch) => { if (patch) setEd(patch); close(); nav.toast(msg, '撤销'); };
  const H = (ch) => <Han ch={ch} s={40} tone="blue" fs={22} />;
  switch (which) {
    case 'vol': return <Sheet title="音量" han={H('音')} onClose={close} foot={<button className="pbtn" onClick={() => done(v.tgt + '大了 ' + v.db + ' dB')}>好</button>}>
      <div className="pad"><Seg opts={['选区', '这个片段', '整体']} value={v.tgt} onChange={x => set('tgt', x)} />
        <div className="bigdb num">{v.db > 0 ? '+' : ''}{v.db} dB</div><Slider v={(v.db + 24) / 36} onChange={x => set('db', Math.round(x * 36 - 24))} /><div className="psm" style={{ display: 'flex', justifyContent: 'space-between' }}><span>-24</span><span>+12</span></div>
        <div className="psub" style={{ marginTop: 10 }}>调大以后峰值会到 -0.8 dB，还不会爆音。</div>
        <button className="plink" onClick={() => { close(); setEd({ panel: 'curve' }); }}>想一点一点调？画音量曲线</button></div></Sheet>;
    case 'fade': return <Sheet title="淡入淡出" han={H('淡')} onClose={close} foot={<button className="pbtn" onClick={() => done(v.fade + ' ' + v.flen + '，' + v.curve + '曲线')}>好</button>}>
      <div className="pad"><Seg opts={['淡入', '淡出']} value={v.fade} onChange={x => set('fade', x)} />
        <div className="pk" style={{ margin: '16px 0 8px' }}>多长</div><div className="chips" style={{ padding: 0 }}>{['0.5 秒', '1 秒', '2 秒', '3 秒'].map(x => <button key={x} className={'chip' + (v.flen === x ? ' on' : '')} onClick={() => set('flen', x)}>{x}</button>)}</div>
        <div className="pk" style={{ margin: '16px 0 8px' }}>曲线</div><div className="curves">{['正弦', '线性', '对数'].map(x => <button key={x} className={v.curve === x ? 'on' : ''} onClick={() => set('curve', x)}><FadeCurve kind={x} on={v.curve === x} /><span>{x}</span></button>)}</div></div>
      <div className="prow" onClick={() => set('xf', !v.xf)}><div className="mid"><div className="pt3" style={{ fontSize: 16 }}>片段接缝交叉淡化</div><div className="psub">0.5 秒，总长度不变</div></div><Tog on={v.xf} onChange={x => set('xf', x)} /></div></Sheet>;
    case 'copy': return <Sheet title="复制和重复" sub={ed.sel ? '选区 ' + (ed.sel[1] - ed.sel[0]).toFixed(1) + ' 秒' : '先选一段'} han={H('复')} onClose={close}>
      <div className="tgrid">{[['复', '复制', '复制了 2.6 秒'], ['切', '剪切', '剪切了 2.6 秒'], ['贴', '粘贴到播放头', '粘贴到了 0:08.0'], ['叠', '重复这一段', '重复了 2 遍']].map(([c, l, m]) => <button key={l} className="ttile" onClick={() => done(m)}><Han ch={c} s={36} tone="tint" fs={20} /><b>{l}</b></button>)}</div>
      <div className="pad psub" style={{ paddingTop: 10 }}>剪贴板里的声音也能粘进别的音频：在那边用「插入音频」。</div></Sheet>;
    case 'marker': return <Sheet title="标记" han={H('标')} onClose={close} foot={<button className="pbtn" onClick={() => done('按 2 个标记分成了 3 段')}>按标记分割成 3 段</button>}>
      {MARKS.map(m => <div key={m.n} className="prow" style={{ minHeight: 54 }}><span className="tag">{m.n}</span><div className="mid"><span className="pt3 num" style={{ fontSize: 16 }}>{fmtT(m.t)}</span></div><button className="chip">跳过去</button></div>)}
      <div className="pad"><button className="plink" onClick={() => done('在 0:08.0 加了标记')}><Ic n="plus" s={16} />在播放头加一个标记</button></div>
      <div className="pad psub">删掉的部分里的标记会列在这里，写着「已剪掉」。</div></Sheet>;
    case 'silence': return <Sheet title="插入静音" han={H('静')} onClose={close} foot={<button className="pbtn" onClick={() => done('在' + v.where + '插入了 ' + v.sil + ' 秒静音')}>插入 {v.sil} 秒</button>}>
      <div className="pad"><div className="blank-in"><input className="num" value={v.sil} onChange={e => set('sil', e.target.value)} /><span>秒</span></div><div className="pk" style={{ margin: '14px 0 8px' }}>插在</div><Seg opts={['播放头', '开头', '结尾']} value={v.where} onChange={x => set('where', x)} /></div></Sheet>;
    case 'insert': return <Sheet title="插入音频" sub="插到播放头 0:08.0" han={H('插')} onClose={close}>
      <SrcRow ch="库" t="从音频库选一段" sub="会插它最新的版本" onClick={() => done('插入了「年会开场 BGM」')} />
      <SrcRow ch="录" t="现在录一段插进来" sub="录完自动放到播放头" onClick={() => { close(); nav.push({ name: 'record', insert: true }); }} />
      <SrcRow ch="开" t="手机里的文件" onClick={() => { close(); nav.push({ name: 'files' }); }} /></Sheet>;
    case 'beat': return <Sheet title="对齐节拍" han={H('拍')} onClose={close} foot={<button className="pbtn" onClick={() => done('选区吸到了拍子上')}>好</button>}>
      <div className="pad pbody">找到节拍：92 BPM。打开后，拖选区时边缘会吸到最近的拍子上，剪出来的段落不会抢拍。</div>
      <div className="prow" onClick={() => set('snap', !v.snap)}><div className="mid"><div className="pt3" style={{ fontSize: 16 }}>吸到拍子上</div></div><Tog on={v.snap} onChange={x => set('snap', x)} /></div></Sheet>;
    case 'order': return <Sheet title="片段顺序" sub="拖动换顺序" han={H('序')} onClose={close} foot={<button className="pbtn" onClick={() => done('换好了顺序')}>好</button>}>
      {['片段 1　0:00 – 0:24', '片段 2　0:24 – 1:12', '片段 3　1:12 – 18:40'].map((s, i) => <div key={s} className="prow" style={{ minHeight: 56 }}><Ic n="grip" s={22} c="#888" /><div className="mid"><span className="pt3 num" style={{ fontSize: 16 }}>{s}</span></div>{i > 0 && <button className="chip">上移</button>}</div>)}</Sheet>;
    case 'time': return <Sheet title="精确时间" han={H('时')} onClose={close} foot={<button className="pbtn" onClick={() => { setEd({ sel: [v.a, v.b] }); close(); }}>选中这一段</button>}>
      {[['从', 'a'], ['到', 'b']].map(([l, k]) => <div key={k} className="pad" style={{ paddingTop: 10 }}><div className="pk">{l}</div><div className="len-row"><button className="chip" onClick={() => set(k, Math.max(0, +(v[k] - 0.1).toFixed(1)))}>-0.1</button><div className="pt1 num" style={{ flex: 1, textAlign: 'center' }}>{fmtT(v[k])}</div><button className="chip" onClick={() => set(k, +(v[k] + 0.1).toFixed(1))}>+0.1</button></div></div>)}</Sheet>;
    case 'curve': return <Sheet title="音量曲线" sub="点一下加一个点，上下拖改大小" han={H('线')} onClose={close} foot={<button className="pbtn" onClick={() => done('音量曲线已应用')}>好</button>}>
      <div className="pad"><div style={{ position: 'relative' }}><Wave env={ENV.speech} rate={50} from={0} to={40} h={110} bar={2} gap={1} color="rgba(0,0,0,.35)" />
        <svg style={{ position: 'absolute', inset: 0 }} width="100%" height="110" viewBox="0 0 100 110" preserveAspectRatio="none"><polyline points="0,40 30,40 42,70 70,70 82,40 100,40" fill="none" stroke={BLUE} strokeWidth="2.5" vectorEffect="non-scaling-stroke" /></svg>
        {[[0, 40], [30, 40], [42, 70], [70, 70], [82, 40], [100, 40]].map(([x, y], i) => <span key={i} className="cpt" style={{ left: x + '%', top: y }} />)}</div>
        <div className="psub" style={{ marginTop: 10 }}>中间 0:12–0:28 低 6 dB（背景里有人说话）。曲线跟着声音走，剪掉前面的部分它也跟着移。</div></div></Sheet>;
    case 'more': return <Sheet title="更多剪辑" han={H('剪')} onClose={close}>
      <div className="hgrid">{MORE_EDITS.map(([c, l, k]) => <button key={k} className="htile" onClick={() => { if (k === 'spec') { setEd({ spec: !ed.spec, panel: null }); } else if (k === 'zoom') { setEd({ zoom: ed.zoom === 40 ? 10 : 40, panel: null }); } else setEd({ panel: k }); }}><Han ch={c} s={44} tone="tint" fs={24} /><span>{l}</span></button>)}</div></Sheet>;
    case 'tools': return <Sheet title="处理" sub="每种都存成新版本，原来的不变" han={<Han ch="处" s={40} tone="blue" fs={22} />} onClose={close}>
      {TOOL_GROUPS.map(g => <Fragment key={g}><div className="sect" style={{ paddingTop: 10 }}><b>{g}</b></div>
        <div className="hgrid">{SJ.TOOLS.filter(t => t.group === g).map(t => <button key={t.id} className="htile" onClick={() => { close(); nav.push(t.id === 'chorus' ? { name: 'ling', step: 'chorus' } : { name: 'tool', id: t.id }); }}><Han ch={TOOL_CH[t.id]} s={44} tone={t.unavailable ? 'line' : 'tint'} fs={24} /><span>{t.name}</span>{t.unavailable && <em>即将开放</em>}</button>)}</div></Fragment>)}</Sheet>;
    case 'say': return <SaySheet nav={nav} close={close} init={ed.sayText} />;
    default: return null;
  }
}

function SaySheet({ nav, close, init }) {
  const [text, setText] = useState(init || SEN.text), [listen, setListen] = useState(false);
  useEffect(() => { if (listen) { const id = setTimeout(() => { setListen(false); setText(SEN.text); }, 1400); return () => clearTimeout(id); } }, [listen]);
  const go = () => {
    const mode = text === SEN.question.text ? 'ask' : text === SEN.aiRewrite.said ? 'ai' : /降噪.*统一音量/.test(text) ? 'chain' : /铃声/.test(text) ? 'purpose' : 'plan';
    close(); nav.push({ name: 'plan', mode, text });
  };
  return <Sheet title="说一句" sub="打字或按住说，中文英文都行" han={<Han ch="说" s={40} tone="blue" fs={22} />} onClose={close} foot={<button className="pbtn" onClick={go}>看看会怎么改</button>}>
    <div className="pad"><div className="saybox"><textarea className="field" rows={3} value={listen ? '' : text} placeholder={listen ? '正在听…（在手机上识别，不联网）' : '比如：剪掉开头3秒'} onChange={e => setText(e.target.value)} style={{ fontSize: 18 }} />
      <button className={'saymic' + (listen ? ' on' : '')} onClick={() => setListen(true)} aria-label="按住说"><Ic n="mic" s={22} /></button></div></div>
    <div className="sect"><b>试试这些</b></div>
    <div className="pad saychips">{[SEN.question.text, SEN.aiRewrite.said, ...SEN.examples.slice(0, 6)].map(x => <button key={x} className="chip" onClick={() => setText(x)}>{x}</button>)}</div>
    <div className="sect"><b>我的配方</b><span>常说的话，点一下就行</span></div>
    {SEN.recipes.map(r => { const [n, s] = r.split('：'); return <button key={r} className="prow" style={{ minHeight: 56 }} onClick={() => setText(s)}><Han ch="方" s={32} tone="tint" fs={18} /><div className="mid"><div className="pt3" style={{ fontSize: 15 }}>{n}</div><div className="psub ell">{s}</div></div></button>; })}
  </Sheet>;
}

function Editor({ nav }) {
  useTone('dark');
  const P = nav.player; const S = nav.state;
  const blank = nav.route.item === 'blank';
  const [ed, setEdS] = useState({ sel: [11.8, 13.4], zoom: nav.route.zoom || 40, spec: !!nav.route.spec, speed: 1, ab: false, panel: nav.route.panel || null, cuts: [], splits: [], sayText: nav.route.text });
  const setEd = p => setEdS(s => ({ ...s, ...p }));
  const applied = S.applied;
  const base = blank ? new Float32Array(150).fill(0.004) : (ed.ab ? ENV.speech : applied ? ENV.planned : ENV.speech);
  const env = useMemo(() => ed.cuts.length && !ed.ab ? cutEnv(base, 50, ed.cuts) : base, [base, ed.cuts, ed.ab]);
  const total = blank ? 3 : applied ? SEN.result.after : SEN.result.before;
  const a = 0, b = ed.zoom; const on = P.on('ed');
  const playT = on ? P.t : 8;
  const cutSel = () => { if (!ed.sel) return; const [x, y] = ed.sel; setEd({ cuts: [...ed.cuts, [x, y]], sel: null, splits: [...ed.splits, x] }); nav.toast('剪掉了 ' + (y - x).toFixed(1) + ' 秒', '撤销', () => setEd({ cuts: ed.cuts, sel: [x, y], splits: ed.splits })); };
  const keepSel = () => { if (!ed.sel) return; nav.toast('只留下了选中的 ' + (ed.sel[1] - ed.sel[0]).toFixed(1) + ' 秒', '撤销'); };
  const tools = ed.sel ? [['剪掉', cutSel], ['只留', keepSel], ['分割', () => { setEd({ splits: [...ed.splits, playT] }); nav.toast('在 ' + fmtT(playT) + ' 分割成两段', '撤销'); }], ['音量', () => setEd({ panel: 'vol' })], ['淡化', () => setEd({ panel: 'fade' })], ['复制', () => setEd({ panel: 'copy' })], ['更多', () => setEd({ panel: 'more' })]]
    : [['选一段', () => setEd({ sel: [11.8, 13.4] })], ['分割', () => { setEd({ splits: [...ed.splits, playT] }); nav.toast('在 ' + fmtT(playT) + ' 分割成两段', '撤销'); }], ['音量', () => setEd({ panel: 'vol' })], ['淡化', () => setEd({ panel: 'fade' })], ['标记', () => setEd({ panel: 'marker' })], ['更多', () => setEd({ panel: 'more' })]];
  return <div className="pr">
    <div className="pbar ed-bar">
      <button className="pib" onClick={nav.back} aria-label="返回"><Ic n="back" /></button>
      <Han ch="剪" s={34} tone="blue" cut fs={21} />
      <div className="grow" style={{ paddingLeft: 6 }}><div className="pt3 ell" style={{ fontSize: 15 }}>{blank ? '一段空白' : '播客第 12 期 · 和王老师聊阅读'}</div><div className="psm num ell" style={{ fontSize: 12.5 }}>{fmt(total)}　{applied ? '照一句话改过' : '原始录音'}　共 {applied ? 4 : 3} 个版本</div></div>
      <button className="pib" onClick={() => { if (applied) { nav.set({ applied: false }); nav.toast('撤销了「照这句话改」，4 步一起回去了'); } else nav.toast('没有可以撤销的了'); }} aria-label="撤销"><Ic n="undo" s={22} /></button>
      <button className="pib" style={{ width: 36 }} onClick={() => nav.toast('没有可以重做的')} aria-label="重做"><Ic n="redo" s={22} /></button>
    </div>
    <div className="ps">
      <div className="pad ov">
        <Wave env={ENV.long} rate={5} h={28} bar={1} gap={0} color="rgba(0,0,0,.55)">
          <div className="ov-win" style={{ left: 0, width: pct(b, 0, 1120) }} />
          {MARKS.map(m => <i key={m.n} className="ov-mk" style={{ left: pct(m.t, 0, 1120) }} />)}
        </Wave>
        <div className="ruler"><span>0:00</span><span className="num">{fmt(total)}</span></div>
      </div>
      <div className="pad" style={{ paddingTop: 34 }}>
        {ed.spec ? <Spectro env={env} rate={50} from={a} to={b} h={150} /> :
          <Wave env={env} rate={50} from={a} to={b} h={150} bar={2} gap={1} color={ed.ab ? 'rgba(0,0,0,.45)' : '#000'} onTap={t => setEd({ sel: null })}>
            {ed.sel && <div className="wv-sel" style={{ left: pct(ed.sel[0], a, b), width: pct(ed.sel[1] - ed.sel[0], 0, b - a) }}><i className="hd l" /><i className="hd r" /><span className="sel-lab num">{Math.abs(ed.sel[0] - 11.8) < .01 ? '停了 ' : ''}{(ed.sel[1] - ed.sel[0]).toFixed(1)} 秒</span></div>}
            {MARKS.filter(m => m.t < b).map(m => <div key={m.n} className="wv-mark" style={{ left: pct(m.t, a, b) }}><b>{m.n}</b></div>)}
            {ed.splits.filter(s => s < b).map((s, i) => <div key={i} className="wv-split" style={{ left: pct(s, a, b) }} />)}
            <div className="wv-ph" style={{ left: pct(playT, a, b) }} />
          </Wave>}
        <div className="ruler">{Array.from({ length: 5 }, (_, i) => <span key={i}>{fmt(a + (b - a) * i / 4)}</span>)}</div>
      </div>
      <div className="pad ed-zoom"><button className="chip" onClick={() => setEd({ zoom: Math.min(120, ed.zoom * 2) })} aria-label="缩小"><Ic n="minus" s={16} /></button><span className="psub num">一屏 {ed.zoom} 秒</span><button className="chip" onClick={() => setEd({ zoom: Math.max(10, ed.zoom / 2) })} aria-label="放大"><Ic n="plus" s={16} /></button><span style={{ flex: 1 }} /><button className="chip" onClick={() => setEd({ panel: 'time' })}>精确时间</button></div>
      <div className="pad ed-tr">
        <PlayBtn s={56} on={on} onClick={() => P.toggle('ed', 40 - playT, playT, ed.speed)} />
        <div className="ed-time num"><b>{fmtT(playT)}</b><span>/ {fmt(total)}</span></div>
        <button className={'chip' + (ed.speed !== 1 ? ' on' : '')} onClick={() => { const L = [1, 1.25, 1.5, 2, 0.5, 0.75]; setEd({ speed: L[(L.indexOf(ed.speed) + 1) % L.length] }); }}>{ed.speed}×</button>
        <button className={'chip' + (ed.ab ? ' on' : '')} onClick={() => setEd({ ab: !ed.ab })}>{ed.ab ? '在听原声' : '原声'}</button>
        <button className={'chip' + (ed.spec ? ' on' : '')} onClick={() => setEd({ spec: !ed.spec })}>频谱</button>
      </div>
      <div className="pad"><button className="saybar" onClick={() => setEd({ panel: 'say' })}><Han ch="说" s={40} tone="blue" fs={22} /><span className="grow">说一句，比如「剪掉开头3秒，删掉长停顿」</span><Ic n="mic" s={22} c={BLUE} /></button></div>
      <div className="seltools">
        <div className="seltools-h">{ed.sel ? <Fragment><b className="num">选中 {fmtT(ed.sel[0])} – {fmtT(ed.sel[1])}</b><button className="pib" style={{ width: 36, height: 36 }} onClick={() => setEd({ sel: null })} aria-label="取消选区"><Ic n="close" s={18} /></button></Fragment> : <b>没有选区：工具作用在整段</b>}</div>
        <div className="seltools-r">{tools.map(([l, f]) => <button key={l} onClick={f}>{l}</button>)}</div>
      </div>
      <button className="procrow" onClick={() => setEd({ panel: 'tools' })}>
        <span className="procrow-h">{['噪', '停', '变', '伴'].map(c => <Han key={c} ch={c} s={30} tone="tint" fs={17} />)}</span>
        <span className="grow"><b>处理整段</b><span>降噪、删停顿、变声、人声分离…16 种</span></span><Ic n="right" s={18} />
      </button>
      <div className="pad" style={{ padding: '4px 16px 20px', display: 'flex', gap: 10 }}><button className="pbtn ink sm" onClick={() => nav.push({ name: 'export', item: 'interview' })}>导出</button></div>
    </div>
    {ed.panel && <EditPanel which={ed.panel} nav={nav} ed={ed} setEd={setEd} close={() => setEd({ panel: null })} />}
  </div>;
}

/* ---------- 一句话 → 计划（每一步落在波形上，可改、可删、整条一次撤销） ---------- */
const AI_STEPS = [SEN.steps[0], { id: 'a2', phrase: null, title: '提高高频 3 dB', kind: 'eq', region: 'all', detail: '让声音不那么闷（「闷」理解为高频不足）' }];
function PlanWave({ steps, off }) {
  const has = id => steps.some(s => s.id === id) && !off.includes(id);
  const row = (a, b) => <div className="pw-row"><Wave env={ENV.speech} rate={50} from={a} to={b} h={52} bar={1} gap={1}>
    {has('s1') && a === 0 && <Fragment><div className="wv-cut" style={{ left: 0, width: pct(3, 0, b - a) }} /><span className="numtag b" style={{ left: pct(1.5, a, b), top: -11 }}>1</span></Fragment>}
    {has('s2') && SJ.PAUSES.filter(([s]) => s >= a && s < b).map(([s, d], i) => <Fragment key={s}><div className="wv-reg" style={{ left: pct(s, a, b), width: pct(d, 0, b - a), background: 'rgba(43,59,255,.5)', minWidth: 3 }} />{i === 0 && <span className="numtag b" style={{ left: pct(s + d / 2, a, b), top: -11 }}>2</span>}</Fragment>)}
  </Wave><div className="ruler"><span>{fmt(a)}</span><span>{fmt(b)}</span></div></div>;
  return <div className="pad" style={{ paddingTop: 18 }}>
    {row(0, 65)}{row(65, 130)}
    <div className="pw-all">
      {has('s3') && <span><i className="numtag b" style={{ position: 'static', display: 'inline-block', margin: 0 }}>3</i>整段</span>}
      {has('a2') && <span><i className="numtag b" style={{ position: 'static', display: 'inline-block', margin: 0 }}>2</i>整段</span>}
      {has('s4') && <span><i className="numtag b" style={{ position: 'static', display: 'inline-block', margin: 0 }}>4</i>18:38 – 18:40（在这两分钟后面）</span>}
    </div>
  </div>;
}
function SentenceMarks({ text, steps, off, focus, setFocus }) {
  if (text !== SEN.text) return <div className="sent">「{text}」</div>;
  const parts = []; let i = 0;
  steps.forEach((s, k) => { if (s.phrase[0] > i) parts.push(<span key={'t' + k}>{text.slice(i, s.phrase[0])}</span>); parts.push(<span key={s.id} className={'sent-ph' + (off.includes(s.id) ? ' off' : '') + (focus === s.id ? ' f' : '')} onClick={() => setFocus(s.id)}>{text.slice(s.phrase[0], s.phrase[1])}<sup>{k + 1}</sup></span>); i = s.phrase[1]; });
  if (i < text.length) parts.push(<span key="end">{text.slice(i)}</span>);
  return <div className="sent">{parts}</div>;
}
function Plan({ nav }) {
  useTone('dark');
  const r = nav.route; const P = nav.player;
  const [mode, setMode] = useState(r.mode || 'plan');
  const [aiStage, setAiStage] = useState(nav.state.aiConsent ? 'result' : 'offer'), [gate, setGate] = useState(false), [consent, setConsent] = useState(false);
  const [off, setOff] = useState([]), [focus, setFocus] = useState(null), [vals, setVals] = useState({ s1: 3, s3: 3, s4: 2 });
  const [steps, setSteps] = useState(mode === 'ai' ? AI_STEPS : SEN.steps);
  const text = mode === 'ask' ? SEN.question.text : mode === 'ai' ? SEN.aiRewrite.said : (r.text && r.text !== SEN.text && mode !== 'plan') ? r.text : SEN.text;
  const kept = steps.filter(s => !off.includes(s.id));
  const saved = (kept.some(s => s.id === 's1') ? vals.s1 : 0) + (kept.some(s => s.id === 's2') ? 14 : 0);
  const apply = () => { nav.set({ applied: true }); nav.back(); nav.toast('照这句话改好了（' + kept.length + ' 步算一步）', '撤销', () => nav.set({ applied: false })); };
  const stepTitle = s => s.id === 's1' ? '剪掉开头 ' + vals.s1 + ' 秒' : s.id === 's3' ? '整体大 ' + vals.s3 + ' dB' : s.id === 's4' ? '结尾淡出 ' + vals.s4 + ' 秒' : s.title;
  const adj = s => ['s1', 's3', 's4'].includes(s.id);
  let body, foot;
  if (mode === 'ask') {
    body = <Fragment><div className="sent">「<span className="sent-ph q">剪掉开头</span>」</div>
      <div className="pad" style={{ paddingTop: 14 }}><div className="pt1">{SEN.question.ask}</div><div className="psub" style={{ marginTop: 4 }}>没说多久，我不乱猜。</div></div>
      <div className="askgrid">{SEN.question.options.map((o, i) => <button key={o} onClick={() => { setSteps([SEN.steps[0]]); if (i < 3) setVals({ ...vals, s1: parseInt(o) }); else setVals({ ...vals, s1: 2.6 }); setMode('plan'); }}><b>{o}</b><span>{i === 3 ? '0:02.6，听出来第一句从这里开始' : i === 0 ? '开头那段环境声' : ''}</span></button>)}</div>
      <div className="sect"><b>或者一键改写</b></div><div className="pad saychips"><button className="chip" onClick={() => { setSteps([SEN.steps[0]]); setMode('plan'); }}>剪掉开头3秒</button><button className="chip" onClick={() => { setSteps([SEN.steps[0]]); setVals({ ...vals, s1: 2.6 }); setMode('plan'); }}>剪掉开头到第一句话</button></div></Fragment>;
  } else if (mode === 'ai' && aiStage !== 'done') {
    body = <Fragment><div className="sent">「{SEN.aiRewrite.said}」</div>
      {aiStage === 'offer' ? <div className="pad" style={{ paddingTop: 10 }}>
        <div className="pt2">这句有点口语，本机没完全读懂。</div>
        <div className="pbody" style={{ marginTop: 6 }}>可以让 AI 帮忙理解：只发送这句文字，不发送声音。</div>
        <button className="pbtn" style={{ marginTop: 16 }} onClick={() => { if (!nav.state.member) setGate(true); else if (!nav.state.aiConsent) setConsent(true); else setAiStage('result'); }}>让 AI 帮忙理解{!nav.state.member && <span className="tag" style={{ background: '#fff', color: '#000', marginLeft: 6 }}>会员</span>}</button>
        <button className="pbtn ghost sm" style={{ marginTop: 8 }} onClick={() => nav.back()}>我换个说法</button>
        {nav.state.offline && <div className="infobox" style={{ marginTop: 12 }}>没连上网，AI 暂时用不了。本机能读懂的说法照样能用，比如「剪掉开头3秒」。</div>}
      </div> : <div className="pad" style={{ paddingTop: 10 }}>
        <div className="pk">AI 理解成</div>
        <div className="airw">剪掉开头<mark>3 秒</mark>，提高高频</div>
        <div className="psub" style={{ marginTop: 8 }}>{SEN.aiRewrite.note}</div>
        <div className="infobox" style={{ marginTop: 12 }}><b>「3 秒」你没说过</b>，是 AI 估计的。下一步可以改。</div>
      </div>}</Fragment>;
    if (aiStage === 'result') foot = <div className="pbtn2"><button className="pbtn line" onClick={() => nav.back()}>用我的原话</button><button className="pbtn" onClick={() => setAiStage('done')}>就这么理解</button></div>;
  } else if (mode === 'chain') {
    body = <Fragment><div className="sent">「降噪之后统一音量」</div>
      <div className="pad" style={{ paddingTop: 12 }}><div className="pt2">要用 2 个工具，一个接一个</div><div className="psub" style={{ marginTop: 4 }}>每一步都先听前后，再存。哪一步不想要可以跳过。</div></div>
      <div className="chain">{[['噪', '降噪', '存成新版本'], ['匀', '统一音量', '在上一步的结果上做']].map(([c, n, s], i) => <div key={n} className="chain-i"><span className="numtag b" style={{ position: 'static', margin: 0 }}>{i + 1}</span><Han ch={c} s={44} tone="tint" fs={24} /><div className="mid"><b>{n}</b><span>{s}</span></div></div>)}</div>
      <div className="pad"><button className="plink" onClick={() => nav.toast('存成配方「降噪之后统一音量」')}>把这句存成配方</button></div></Fragment>;
    foot = <button className="pbtn" onClick={() => nav.push({ name: 'tool', id: 'denoise', chain: ['denoise', 'loudness'], ci: 0 })}>开始第 1 步：降噪</button>;
  } else if (mode === 'purpose') {
    body = <Fragment><div className="sent">「把<span className="sent-ph">副歌</span>做成<span className="sent-ph">铃声</span>」</div>
      <div className="pad" style={{ paddingTop: 12 }}><div className="pt2">先找副歌，再去导出</div></div>
      <div className="chain">{[['副', '找副歌，剪 30 秒', '会给你 3 段候选'], ['铃', '导出时先选好「设成铃声」', '最后一秒自动淡出']].map(([c, n, s], i) => <div key={n} className="chain-i"><span className="numtag b" style={{ position: 'static', margin: 0 }}>{i + 1}</span><Han ch={c} s={44} tone="tint" fs={24} /><div className="mid"><b>{n}</b><span>{s}</span></div></div>)}</div></Fragment>;
    foot = <button className="pbtn" onClick={() => nav.push({ name: 'ling', step: 'chorus' })}>开始</button>;
  } else {
    body = <Fragment>
      <SentenceMarks text={text} steps={steps} off={off} focus={focus} setFocus={setFocus} />
      {mode === 'ai' && <div className="pad"><div className="infobox">按 AI 的理解：<b>剪掉开头 3 秒，提高高频</b>。<button className="plink" style={{ padding: 0 }} onClick={() => nav.back()}>退回我的原话</button></div></div>}
      <PlanWave steps={steps} off={off} />
      <div style={{ marginTop: 8 }}>{steps.map((s, k) => { const dead = off.includes(s.id); return <div key={s.id} className={'step' + (dead ? ' off' : '') + (focus === s.id ? ' f' : '')} onClick={() => setFocus(s.id)}>
        <span className="numtag b" style={{ position: 'static', margin: 0, flex: 'none' }}>{k + 1}</span>
        <div className="mid"><div className="pt3" style={{ fontSize: 16 }}>{stepTitle(s)}{s.id === 'a2' || (mode === 'ai' && s.id === 's1') ? <span className="tag o" style={{ marginLeft: 6 }}>{s.id === 's1' ? '3 秒是估计的' : 'AI 理解'}</span> : null}</div><div className="psub">{s.detail}</div>
          {adj(s) && !dead && focus === s.id && <div className="stepadj"><button className="chip" onClick={e => { e.stopPropagation(); setVals({ ...vals, [s.id]: Math.max(1, vals[s.id] - 1) }); }}><Ic n="minus" s={16} /></button><span className="num">{vals[s.id]} {s.id === 's3' ? 'dB' : '秒'}</span><button className="chip" onClick={e => { e.stopPropagation(); setVals({ ...vals, [s.id]: vals[s.id] + 1 }); }}><Ic n="plus" s={16} /></button></div>}</div>
        <button className="chip" onClick={e => { e.stopPropagation(); setOff(dead ? off.filter(x => x !== s.id) : [...off, s.id]); }}>{dead ? '恢复' : '不要'}</button>
      </div>; })}</div>
      <div className="pad planres"><span className="num">{fmt(SEN.result.before)}</span><Ic n="right" s={18} /><b className="num">{fmt(SEN.result.before - saved)}</b><span className="psub">短了 {saved} 秒</span></div>
    </Fragment>;
    foot = <Fragment><button className="pbtn" onClick={apply}>照这样改（{kept.length} 步）</button><div className="note">改完不满意，撤销一下全部回去</div></Fragment>;
  }
  return <div className="pr">
    <div className="pbar"><button className="pib" onClick={nav.back} aria-label="返回"><Ic n="back" /></button><Han ch="说" s={34} tone="blue" fs={20} /><div className="grow" style={{ paddingLeft: 6 }}><div className="pt3">{mode === 'ask' ? '还差一点' : mode === 'ai' && aiStage !== 'done' ? '没完全读懂' : '照这句话改'}</div><div className="psm">播客第 12 期</div></div></div>
    <div className="ps">{body}<div style={{ height: 16 }} /></div>
    {foot && <div className="pfoot" style={{ boxShadow: '0 -1px 0 var(--hair)' }}>{foot}</div>}
    {gate && <MemberSheet nav={nav} why={{ title: 'AI 听懂口语是会员的', sub: '本机能读懂的说法一直免费。', skip: 'AI' }} onClose={() => setGate(false)} />}
    {consent && <div className="sysdlg-bg"><div className="sysdlg"><div className="pt3">把这句话发给 AI 吗？</div><div className="psub" style={{ marginTop: 8 }}>只发文字「{SEN.aiRewrite.said}」，不发声音。只问这一次，可以在「我的 › 设置」里关。</div><div className="sysdlg-b"><button onClick={() => setConsent(false)}>不用了</button><button onClick={() => { nav.set({ aiConsent: true }); setConsent(false); setAiStage('result'); }}>同意</button></div></div></div>}
  </div>;
}

/* ---------- 导出：先问拿去做什么 ---------- */
function Export({ nav }) {
  useTone('dark');
  const r = nav.route; const E = SJ.EXPORT;
  const it = LIB.find(x => x.id === (r.item || 'interview')) || LIB[0];
  const [pur, setPur] = useState(r.purpose || (it.id === 'wanfeng' ? 'sound' : 'file')), [fm, setFm] = useState('mp3'), [q, setQ] = useState('标准'), [lim, setLim] = useState(true);
  const [more, setMore] = useState(r.open === 'more'), [tags, setTags] = useState(r.open === 'tags'), [per, setPer] = useState(false), [sub, setSub] = useState(0);
  const [rate, setRate] = useState('44.1 kHz'), [chn, setChn] = useState('立体声'), [depth, setDepth] = useState('16 位'), [save, setSave] = useState(false), [share, setShare] = useState(false);
  const [step, setStep] = useState(r.step || 'choose');
  useEffect(() => { if (step === 'gen') { const id = setTimeout(() => setStep('ready'), 1500); return () => clearTimeout(id); } }, [step]);
  const F = E.formats.find(x => x.id === fm);
  const out = (pur === 'sound' ? '晚风 · 副歌铃声' : it.title.replace(/ · .*/, '')) + '.' + (pur === 'sound' ? 'm4a' : pur === 'share' ? 'm4a' : fm);
  let body, foot;
  if (step === 'choose') {
    body = <Fragment>
      <Q t="拿去做什么？" sub={it.title} />
      <div className="purp">{E.purposes.map(p => <button key={p.id} className={pur === p.id ? 'on' : ''} onClick={() => setPur(p.id)}><Han ch={{ file: '存', sound: '铃', share: '享' }[p.id]} s={44} tone={pur === p.id ? 'white' : 'tint'} fs={24} /><span className="grow"><b>{p.name}</b><span>{p.detail}</span></span></button>)}</div>
      {pur === 'file' && <Fragment>
        <div className="sect"><b>格式</b><span>{F.note}</span></div>
        <div className="fmtgrid">{E.formats.map(f => <button key={f.id} className={fm === f.id ? 'on' : ''} onClick={() => setFm(f.id)}><b>{f.name}</b></button>)}</div>
        {['mp3', 'm4a', 'opus'].includes(fm) && <div className="pad" style={{ paddingTop: 12 }}><div className="pk" style={{ marginBottom: 8 }}>音质</div><Seg opts={E.quality} value={q} onChange={setQ} /></div>}
        <div className="pad" style={{ paddingTop: 12 }}><div className="clipbox"><div className="mid"><b>{E.clipWarn}</b><span>限幅只压最响的那几下，听不出来</span></div><Tog on={lim} onChange={setLim} /></div></div>
        <button className="exp-more" onClick={() => setMore(!more)}><span>采样率、声道、位深</span><span className="psub">{rate}　{chn}</span><Ic n={more ? 'minus' : 'plus'} s={18} /></button>
        {more && <div className="pad" style={{ paddingBottom: 8 }}><Seg opts={E.rates} value={rate} onChange={setRate} style={{ marginBottom: 8 }} /><Seg opts={E.channels} value={chn} onChange={setChn} style={{ marginBottom: 8 }} />{['wav', 'flac'].includes(fm) && <Seg opts={fm === 'wav' ? ['16 位', '24 位', '32 位浮点'] : ['16 位', '24 位']} value={depth} onChange={setDepth} />}</div>}
        <button className="exp-more" onClick={() => setTags(!tags)}><span>文件信息</span><span className="psub">标题、作者、封面…</span><Ic n={tags ? 'minus' : 'plus'} s={18} /></button>
        {tags && <div className="pad tagform">{E.meta.map(m => m === '封面' ? <div key={m} className="tagrow"><span>{m}</span><span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Cover id={it.id} title={it.title} size={40} /><button className="chip">换</button></span></div> : <div key={m} className="tagrow"><span>{m}</span><input defaultValue={{ 标题: it.title, 作者: '书房夜话', 专辑: '播客 2026', 年份: '2026', 备注: '' }[m]} placeholder="可以不填" /></div>)}</div>}
        <div className="prow" onClick={() => setPer(!per)}><div className="mid"><div className="pt3" style={{ fontSize: 16 }}>{E.perSegment}</div><div className="psub">存到一个文件夹里</div></div><Tog on={per} onChange={setPer} /></div>
        <div className="pad" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 4 }}><span className="pk" style={{ alignSelf: 'center' }}>常用</span>{['播客 MP3 高', '会议 Opus'].map(p => <button key={p} className="chip" onClick={() => { setFm(p.includes('Opus') ? 'opus' : 'mp3'); setQ(p.includes('高') ? '高' : '标准'); }}>{p}</button>)}<button className="chip" onClick={() => nav.toast('存成了常用设置')}>＋ 存成常用</button></div>
      </Fragment>}
      {pur === 'sound' && <Fragment>{E.purposes[1].subs.map((s, i) => <div key={s} className={'prow' + (sub === i ? ' on' : '')} onClick={() => setSub(i)} style={{ minHeight: 56 }}><div className="mid"><div className="pt3" style={{ fontSize: 16 }}>{s}</div></div><Radio on={sub === i} /></div>)}
        <div className="pad"><div className="fadenote"><svg width="34" height="20" viewBox="0 0 34 20"><path d="M2 3h20l10 15H2z" fill={TINT} /><path d="M22 3l10 15" stroke={BLUE} strokeWidth="2" /></svg><span>最后 1 秒自动淡出</span></div></div></Fragment>}
      {pur === 'share' && <div className="pad pbody" style={{ paddingTop: 12 }}>生成一个 M4A（同样音质更小，微信里也能直接放），然后打开手机的分享面板，你选发给谁。</div>}
    </Fragment>;
    foot = <button className="pbtn" onClick={() => setStep('gen')}>{pur === 'file' ? (per ? '生成 4 个 ' + F.name : '生成 ' + F.name) : pur === 'sound' ? '设成' + E.purposes[1].subs[sub] : '生成并分享'}</button>;
  } else if (step === 'gen') {
    body = <div className="pad" style={{ paddingTop: 34 }}><div className="pt2">正在生成…</div><div style={{ marginTop: 14 }}><div className="bar-prog" style={{ height: 8 }}><i style={{ width: '100%', animation: 'grow 1.4s linear', transformOrigin: 'left' }} /></div></div><div className="infobox" style={{ marginTop: 16 }}>可以离开声剪。通知栏会显示进度，生成好了提醒你保存。</div></div>;
  } else if (step === 'ready') {
    body = <div className="pad" style={{ paddingTop: 26 }}>
      <div className="readyk">音频已生成，待保存</div>
      <div className="pt1" style={{ marginTop: 10 }}>{out}</div>
      <div className="psub num">{pur === 'sound' ? '0:30　M4A　最后一秒已淡出' : fmt(it.seconds) + '　' + (pur === 'share' ? 'M4A' : F.name) + '　' + q + '　' + (lim ? '已限幅' : '没限幅')}</div>
      <div className="pbody" style={{ marginTop: 14 }}>{pur === 'share' ? '点下面，选发给谁。' : '选个地方存它。没存之前它一直在这里等你，不会丢。'}</div>
    </div>;
    foot = <button className="pbtn" onClick={() => pur === 'share' ? setShare(true) : setSave(true)}>{pur === 'share' ? '发给…' : pur === 'sound' ? '设成' + E.purposes[1].subs[sub] : '选个位置保存'}</button>;
  } else {
    body = <div className="pad" style={{ paddingTop: 26 }}><div className="pt0">存好了。</div><div className="pbody" style={{ marginTop: 8 }}>在「下载 / 声剪」里：{out}</div><div className="psub" style={{ marginTop: 6 }}>没有水印。</div></div>;
    foot = <div className="pbtn2"><button className="pbtn line" onClick={() => setStep('choose')}>再导出一个</button><button className="pbtn" onClick={() => nav.reset({ name: 'home', tab: 'lib' })}>回音频库</button></div>;
  }
  return <div className="pr">
    <div className="pbar"><button className="pib" onClick={nav.back} aria-label="返回"><Ic n="back" /></button><Han ch="出" s={34} tone="blue" fs={20} cut /><div className="grow" style={{ paddingLeft: 6 }}><div className="pt3">导出</div><div className="psm ell">{it.title}</div></div></div>
    <div className="ps">{body}<div style={{ height: 16 }} /></div>
    {foot && <div className="pfoot" style={{ boxShadow: '0 -1px 0 var(--hair)' }}>{foot}</div>}
    {save && <div className="sysdlg-bg"><div className="sysdlg" style={{ width: 312 }}><div className="psm">系统保存面板</div><div className="pt3" style={{ marginTop: 6 }}>保存到</div><div className="savepath">内部存储 › 下载 › 声剪</div><input className="field" defaultValue={out} style={{ fontSize: 15, padding: 10, marginTop: 10 }} /><div className="sysdlg-b"><button onClick={() => setSave(false)}>取消</button><button onClick={() => { setSave(false); setStep('done'); }}>保存</button></div></div></div>}
    {share && <div className="shbg" onClick={() => setShare(false)}><div className="sh" onClick={e => e.stopPropagation()} style={{ padding: '18px 16px 34px' }}><div className="psm">系统分享面板（由手机列出：微信、QQ、邮件……）</div><div className="pt3" style={{ marginTop: 8 }}>{out}</div><div className="sharemock-g" style={{ marginTop: 14 }}>{['信息', '邮件', '蓝牙', '附近', '文件'].map(n => <span key={n} onClick={() => { setShare(false); setStep('done'); }}><i /><em>{n}</em></span>)}</div></div></div>}
  </div>;
}

/* ---------- 乐：在线音乐库 ---------- */
function TrackSheet({ t, nav, pickMode, onPick, close }) {
  const [gate, setGate] = useState(false); const P = nav.player; const on = P.on('mu-' + t.id);
  const use = fn => () => { if (t.vip && !nav.state.member) setGate(true); else fn(); };
  return <Fragment><Sheet title={t.title} sub={<span className="num">{fmt(t.seconds)}　{t.cat}{t.bpm ? '　' + t.bpm + ' BPM' : ''}</span>} han={<Cover id={t.id} title={t.title} size={56} />} onClose={close}
    foot={pickMode ? <button className="pbtn" onClick={use(() => onPick(t.id))}>用这首{t.vip && !nav.state.member ? <span className="tag" style={{ background: '#fff', color: '#000', marginLeft: 4 }}>VIP</span> : null}</button>
      : <div className="pbtn2"><button className="pbtn line" onClick={use(() => { close(); nav.toast('导入成了新音频「' + t.title + '」'); })}>导入成新音频</button><button className="pbtn" onClick={use(() => { close(); nav.push({ name: 'tool', id: 'bgm' }); })}>用作背景音乐</button></div>}>
    <div className="pad"><button className="pbtn line sm" onClick={() => P.toggle('mu-' + t.id, 30)}><Ic n={on ? 'stop' : 'play'} s={18} />{on ? '停' : '试听'}</button></div>
    <div className="lic">
      <div><span>授权</span><b>{t.licence}</b></div>
      <div><span>商用</span><b>{t.commercial ? '可以商用' : '不能商用'}</b></div>
      <div><span>署名</span><b>{t.credit ? '要署名' : '不用署名'}</b></div>
    </div>
    {t.credit && <div className="pad psub" style={{ paddingTop: 8 }}>用了这首，导出时会自动把「{t.credit}」写进文件备注，作品里也请带上。</div>}
    {t.vip && <div className="pad psub" style={{ paddingTop: 8 }}>VIP 曲目：会员可以用，试听不要钱。</div>}
  </Sheet>
    {gate && <MemberSheet nav={nav} why={{ title: '「' + t.title + '」是 VIP 曲目', sub: '会员可以用音乐库全部曲子。免费曲子一直免费。', skip: 'VIP' }} onClose={() => setGate(false)} />}
  </Fragment>;
}
function MusicLib({ nav, pickMode, onPick, onClose }) {
  const M = SJ.MUSIC; const [cat, setCat] = useState('精选'), [open, setOpen] = useState(nav.route.track || null); const P = nav.player; const off = nav.state.offline;
  const list = M.tracks.filter(t => cat === '精选' || t.cat === cat);
  const t = M.tracks.find(x => x.id === open);
  return <div className="pr">
    <div className="pbar"><button className="pib" onClick={onClose || nav.back} aria-label="返回"><Ic n={pickMode ? 'close' : 'back'} /></button><Han ch="乐" s={34} tone="ink" fs={20} /><div className="grow" style={{ paddingLeft: 6 }}><div className="pt3">{pickMode ? '选一首背景音乐' : '音乐库'}</div><div className="psm">声剪音乐库　每周更新</div></div><button className="pib" aria-label="搜索"><Ic n="search" s={22} /></button></div>
    {off && <div className="pad" style={{ paddingBottom: 8 }}><div className="infobox">没连上网。显示的是 11月22日 的目录，不是最新的；下载过的曲子照常能用。</div></div>}
    <div className="chips" style={{ padding: '4px 16px 10px' }}>{M.categories.map(c => <button key={c} className={'chip' + (cat === c ? ' on' : '')} onClick={() => setCat(c)}>{c}</button>)}</div>
    <div className="ps">{list.map(x => { const on = P.on('mu-' + x.id); return <div key={x.id} className="prow murow" onClick={() => setOpen(x.id)}>
      <Cover id={x.id} title={x.title} size={52} />
      <div className="mid"><div className="pt3 ell" style={{ fontSize: 16 }}>{x.title}</div><div className="psub num">{fmt(x.seconds)}　{x.cat}</div></div>
      {x.vip && <span className="tag">VIP</span>}
      <PlayBtn s={40} tone={on ? 'blue' : 'tint'} on={on} onClick={() => P.toggle('mu-' + x.id, 30, 0)} />
      {on && <span className="mu-prog" style={{ width: (P.frac() * 100) + '%' }} />}
    </div>; })}
      <div className="pad psm" style={{ padding: '16px 16px 24px' }}>每首的授权写在它的详情里。用过的曲子会自动记下署名。</div></div>
    {t && <TrackSheet t={t} nav={nav} pickMode={pickMode} onPick={onPick} close={() => setOpen(null)} />}
  </div>;
}
function Music({ nav }) { useTone('dark'); return <MusicLib nav={nav} />; }
