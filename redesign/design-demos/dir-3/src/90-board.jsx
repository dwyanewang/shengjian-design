/* ===== The board ===== */
const PHONES = {
  W: { name: '工作台', label: '工作台：播客第 12 期', note: '放大 1.3 倍。往下滚是时间，那条横线是播放头；空档就是停顿' },
  H: { name: '首页', label: '首页与音频库', note: '接着剪、新建、搜索筛选、长按多选；右上角进「我的」' },
  P: { name: '一句话', label: '说一句 → 计划落在脊线上', note: '每一步一个编号，脊线上同样的编号；这台按会员演示 AI' },
  T: { name: '处理', label: '降噪：前后画在同一根脊线上', note: '左半边是原来的，右半边是降噪后；存成新版本后看版本' },
  M: { name: '晚风', label: '音乐：副歌最宽最亮', note: '整首一屏放下；30 秒的框挪到副歌上，设成铃声' },
  E: { name: '导出', label: '导出：先问拿去做什么', note: '存文件、设铃声、发给别人；点状态栏拉下通知栏' },
  V: { name: '配音', label: '配音：本机、真人感、我的声音', note: '每个音色是一小段竖着的声纹；会员音色先免费试听' },
  L: { name: '音乐库', label: '在线音乐库', note: '分类、试听、VIP；授权和署名在曲目里写清楚' },
  S: { name: '会员', label: '会员', note: '只卖联网才有的；价格是示例，以 Google Play 为准' },
};
const ed0 = extra => ({ stack: [['home'], ['editor', { id: 'interview', noHint: true, ...(extra || {}) }]] });
const SEL1 = [12.0, 21.62];
const COVER = {
  A1: ['H', '首页「录音」：暂停、继续；录音列表里「接着录」', { stack: [['home'], ['record']] }],
  A2: ['H', '录音页顶上的设置条：麦克风、单 / 立体声、增益、耳机监听', { stack: [['home'], ['record', { sheet: 'settings' }]] }],
  A3: ['H', '录音页「录音列表」：上次中断的可以接着录', { stack: [['home'], ['record', { tab: 'list' }]] }],
  A4: ['H', '首页「手机文件」：多选，按选的顺序拼成一段', { stack: [['home'], ['files']] }],
  A5: ['H', '首页「视频提取」', { stack: [['home'], ['files', { video: true }]] }],
  A6: ['H', '在别的 App 点分享选声剪：拼成一段或分别导入', { stack: [['home'], ['sharein']] }],
  A7: ['V', '配音首屏：本机音色、真人感、我的声音，语速，试听', { stack: [['home'], ['tts']] }],
  A8: ['V', '配音右上角「字幕配音」：每句一颗胶囊，字在旁边', { stack: [['home'], ['tts'], ['subtitle']] }],
  A9: ['V', '配音「我的声音」：克隆、改名、听参考、删除、重新克隆', { stack: [['home'], ['tts', { tab: 'mine' }], ['clone']] }],
  A10: ['L', '音乐库首屏：分类、试听、VIP、授权、导入或配乐', { stack: [['home'], ['musiclib']] }],
  A11: ['H', '新建「全部 13 种来源」里的一段空白', { stack: [['home'], ['new', { blank: true }]] }],
  A12: ['H', '新建里的示例音频', { stack: [['home'], ['new']] }],
  A13: ['H', '新建里的导入工程包', { stack: [['home'], ['new']] }],
  B1: ['W', '在左边刻度上拖；点一句选一句；点「选中 x 秒」输入时间', ed0({ sel: SEL1 })],
  B2: ['W', '选中后底部「剪掉」「只留」', ed0({ sel: SEL1 })],
  B3: ['W', '底部「分割」：没选在播放头，选了在两头', ed0()],
  B4: ['W', '长按一句，拖到别处松手；或选中后「移动」', ed0()],
  B5: ['W', '选中后「复制」「剪切」，滚到别处「粘贴」', ed0({ sel: SEL1 })],
  B6: ['W', '选中后「重复」', ed0({ sel: SEL1 })],
  B7: ['W', '「音量」：选了是这段，没选是整体，波形跟着变宽', ed0({ panel: 'vol' })],
  B8: ['W', '选中后「淡入淡出」：长度和三种曲线', ed0({ sel: SEL1, panel: 'fade' })],
  B9: ['W', '点一道接缝，选「接缝过渡」', ed0()],
  B10: ['W', '「更多」里的音量曲线：在脊线右边点点', ed0({ panel: 'more' })],
  B11: ['W', '「标记」加在播放头；脊线上的圆点；标记列表、按标记分割', ed0({ panel: 'markers' })],
  B12: ['W', '「插入」：一段静音', ed0({ panel: 'insert' })],
  B13: ['W', '「插入」：一段音频、现在录一段', ed0({ panel: 'insert' })],
  B14: ['M', '晚风底部「对齐节拍」：刻度上出现拍子', { stack: [['home'], ['editor', { id: 'wanfeng', beat: true }]] }],
  B15: ['W', '顶栏两个箭头，最多 50 步', ed0()],
  B16: ['W', '播放键右边的「1×」', ed0()],
  B17: ['W', '「更多」里的原声对比', ed0({ panel: 'more' })],
  B18: ['W', '「更多」里的频谱：横着是频率，竖着还是时间', ed0({ spectrum: true })],
  B19: ['W', '两指捏合；缩放时右下角显示「每屏 39 秒」，鼠标移上去可点 − 和 +', ed0()],
  C1: ['P', '底部「说一句」，打字或点麦克风，本机识别', ed0({ panel: 'say' })],
  C2: ['P', '计划面板：每步一个编号，脊线上同样的编号', null],
  C3: ['P', '计划里每步的 − / +，右边的 × 不要这步', null],
  C4: ['P', '说「剪掉开头」，追问剪多少秒', ed0({ say: '剪掉开头', panel: 'plan', pps: 7, at: 4 })],
  C5: ['P', '说口语，「让 AI 帮忙理解」：问一次同意，列出你没说过的数', ed0({ say: SJ.SENTENCE.aiRewrite.said, panel: 'plan', pps: 7, at: 4 })],
  C6: ['P', '照这样改之后，提示条「撤销整条」', null],
  C7: ['P', '「说一句」面板：最近说过、我的配方', ed0({ panel: 'say' })],
  C8: ['H', '音频库长按多选，「对它们说一句」', { stack: [['home'], ['batch', { tpl: 'sentence', n: 3 }]] }],
  C9: ['P', '「剪掉开头3秒，发给朋友」：改完去导出，已选好发给别人', ed0({ say: '剪掉开头3秒，发给朋友', panel: 'plan', pps: 7, at: 4 })],
  C10: ['P', '「降噪之后统一音量」：两个工具一步接一步，可以跳过', ed0({ say: '降噪之后统一音量', panel: 'plan', pps: 7, at: 4 })],
  D1: ['T', '处理手机首屏：左半边原来，右半边降噪后', null],
  D2: ['T', '工作台「删停顿 9」：空档逐个打勾，看合上后的样子', { stack: [['home'], ['editor', { id: 'interview' }], ['tool', { tool: 'pauses' }]] }],
  ...Object.fromEntries(['loudness', 'repair', 'speed', 'voice', 'effects', 'channels', 'reverse'].map((t, i) => ['D' + (i + 3), ['T', '工作台「全部工具」里的' + toolName(t) + '，前后画在同一根脊线上', { stack: [['home'], ['editor', { id: 'interview' }], ['tool', { tool: t, id: 'interview' }]] }]])),
  D10: ['M', '晚风底部「人声分离」：左半边伴奏，右半边人声', { stack: [['home'], ['editor', { id: 'wanfeng' }], ['tool', { tool: 'separate', id: 'wanfeng' }]] }],
  D11: ['M', '晚风首屏：3 段副歌，20 / 30 秒', null],
  D12: ['W', '工作台底部「配乐」：音乐是并排的第二条脊线，说话时它变细', ed0({ bgm: true })],
  D13: ['T', '「全部工具」里的多轨混音：几条竖线并排', { stack: [['home'], ['editor', { id: 'interview' }], ['tool', { tool: 'multitrack' }]] }],
  D14: ['T', '「全部工具」里的串烧：6 首接成一条', { stack: [['home'], ['editor', { id: 'interview' }], ['tool', { tool: 'medley' }]] }],
  D15: ['M', '晚风底部「循环 60 秒」', { stack: [['home'], ['editor', { id: 'wanfeng' }], ['tool', { tool: 'loop', id: 'wanfeng' }]] }],
  D16: ['T', '「全部工具」里的音频转文字：写明即将开放', { stack: [['home'], ['editor', { id: 'interview' }], ['tool', { tool: 'stt' }]] }],
  E1: ['T', '处理完「存成新版本」，原来的不动', null],
  E2: ['T', '版本：几个版本并排成几条脊线，一起往下滚', { stack: [['home'], ['editor', { id: 'interview' }], ['versions', { id: 'interview' }]] }],
  E3: ['T', '处理页底部「听原来 / 听降噪后」', null],
  E4: ['W', '配乐存成新音频，配方留着，能回来再调', ed0({ bgm: true })],
  F1: ['H', '新建「批量处理」：6 个模板', { stack: [['home'], ['batch', { n: 24 }]] }],
  F2: ['H', '批量页：文件和输出文件夹', { stack: [['home'], ['batch', { n: 24 }]] }],
  F3: ['H', '开始后：进度、暂停，锁屏也继续', { stack: [['home'], ['batch', { n: 24, stage: 'run' }]] }],
  F4: ['H', '做完：报告，哪几个爆音、哪个失败，存成 CSV', { stack: [['home'], ['batch', { n: 24, stage: 'report' }]] }],
  G1: ['E', '导出首屏：先选拿去做什么', null],
  G2: ['E', '存成文件：格式、音质；更多设置里采样率、声道、位深', { stack: [['home'], ['editor', { id: 'interview' }], ['export', { id: 'interview', more: true }]] }],
  G3: ['E', '更多设置里的标签', { stack: [['home'], ['editor', { id: 'interview' }], ['export', { id: 'interview', more: true }]] }],
  G4: ['E', '更多设置里的预设', { stack: [['home'], ['editor', { id: 'interview' }], ['export', { id: 'interview', more: true }]] }],
  G5: ['E', '格式下面「有 3 处会爆音，已自动开启限幅」', null],
  G6: ['E', '更多设置里的每段一个文件', { stack: [['home'], ['editor', { id: 'interview' }], ['export', { id: 'interview', more: true }]] }],
  G7: ['E', '导出后在后台生成，「音频已生成，待保存」再选位置', null],
  G8: ['M', '设成铃声：最后一秒自动淡出，脊线上画着', null],
  H1: ['H', '首页音频库：右上角搜索，筛选录音、导入、混音、多版本、待保存', null],
  H2: ['H', '长按一条进入多选：说一句、用工具、导出', { stack: [['home', { pick: new Set(['interview', 'meeting', 'lesson']) }]] }],
  H3: ['H', '每条右边的 ⋮：改名、导出、版本、占用空间、工程包、删除', { stack: [['home', { menu: 'interview' }]] }],
  H4: ['H', '列表里「正在导出 64%」「铃声待保存」；⋮ 里「用备份恢复」', null],
  I1: ['S', '会员页点开通，先登录：Google 账号或邮箱验证码', { stack: [['home'], ['member']], sheet: { name: 'login', p: {} } }],
  I2: ['S', '会员页：年度（7 天试用）、包月、周卡，右上角恢复购买', null],
  I3: ['S', '会员页：会员多给你的，不开会员也能用的', null],
  I4: ['S', '登录面板底部：登录只用于身份和会员，不上传音频', { stack: [['home'], ['member']], sheet: { name: 'login', p: {} } }],
  ...Object.fromEntries(SJ.SETTINGS.map((s, i) => ['J' + (i + 1), ['H', '首页右上角「我的」：' + s.split('：')[0], { stack: [['home'], ['me']] }]])),
  K1: ['E', '点状态栏拉下通知栏：播放控制，锁屏可控，拔耳机暂停', { stack: [['home'], ['editor', { id: 'interview' }], ['export', { id: 'interview' }]], shade: true }],
  K2: ['E', '导出、批量时通知栏里有进度，做完提醒保存', { stack: [['home'], ['editor', { id: 'interview' }], ['export', { id: 'interview', phase: 'gen' }]], shade: true }],
};
const INIT = {
  W: { stack: [['home'], ['editor', { id: 'interview' }]] },
  H: { stack: [['home']] },
  P: ed0({ say: SJ.SENTENCE.text, panel: 'plan', pps: 7, at: 5 }),
  T: { stack: [['home'], ['editor', { id: 'interview' }], ['tool', { tool: 'denoise', id: 'interview' }]] },
  M: { stack: [['home'], ['editor', { id: 'wanfeng', panel: 'chorus' }]] },
  E: { stack: [['home'], ['editor', { id: 'interview' }], ['export', { id: 'interview' }]] },
  V: { stack: [['home'], ['tts']] },
  L: { stack: [['home'], ['musiclib']] },
  S: { stack: [['home'], ['member']] },
};
Object.keys(COVER).forEach(k => { if (!COVER[k][2]) COVER[k][2] = INIT[COVER[k][0]]; });

function Slot({ id, z, style, big }) {
  const P = PHONES[id];
  return <div className="pslot" data-slot={id} style={style}>
    <div className="plabel" style={big ? { textAlign: 'center' } : null}><b>{P.label}</b><span>{P.note}</span></div>
    <Phone id={id} init={INIT[id]} zoom={z} member={id === 'P'} user={id === 'P' ? 'lin.chen@example.com' : null} />
  </div>;
}
function Masthead() {
  return <div className="mast">
    <div className="mark"><Mark s={1.15} /><h1>声剪</h1></div>
    <p className="dir">方向 3：竖着的声音</p>
    <p className="lead">像读文字稿一样，<br /><em>往下滚着</em>剪录音。</p>
    <p>手机是竖着拿的，拇指天生上下滑。所以时间往下流：一句话是一颗胶囊，停顿是胶囊之间看得见的空档，空档上写着几秒，横着一划就合上。</p>
    <div className="facts">
      <div><i /><span><b>剪辑、处理、导出都在手机上做，免费，没有水印。</b>原音频永远不动，每次处理存成新版本。</span></div>
      <div><i /><span><b>会员只卖联网才有的：</b>真人感音色、克隆你的声音、VIP 音乐、AI 听懂口语、不限量批量。</span></div>
      <div><i /><span><b>颜色只回答两件事：</b>发光的青是声音，琥珀色是你此刻要动的那一处。</span></div>
    </div>
  </div>;
}
/* the 3x close-up: swipe across the pause and it closes */
function drawGapScene(cv, o) {
  const { w, h, scale, k, strike } = o, dpr = 2; cv.width = w * dpr; cv.height = h * dpr;
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
  const P = SPEECH.pauses.find(q => q.id === 'p4'), pz = 14 * scale, tA = P.s - 1.5, x = w / 2, cw = 124 * scale * (o.capFrac || 1), half = cw / 2 - 3 * scale;
  const removed = k * (P.d - 0.3);
  const Y = t => (t <= P.s ? (t - tA) * pz : t >= P.e ? (t - tA - removed) * pz : (P.s - tA) * pz + (t - P.s) * pz * (1 - removed / P.d));
  const env = SPEECH.env, rate = SPEECH.rate;
  const above = SPEECH.caps.find(c => c.e <= P.s + 0.01 && c.e > P.s - 3), below = SPEECH.caps.find(c => c.s >= P.e - 0.01 && c.s < P.e + 3);
  ctx.fillStyle = 'rgba(141,153,173,.35)'; ctx.fillRect(x - 0.5 * scale, 0, scale, h);
  const cap = (s, e, flatTop) => {
    const y0 = Y(s), y1 = Math.min(h + 20, Y(e));
    rrPath(ctx, x - cw / 2, flatTop ? -30 : y0, cw, y1 - (flatTop ? -30 : y0), 16 * scale);
    ctx.fillStyle = 'rgba(126,240,207,.07)'; ctx.fill(); ctx.strokeStyle = 'rgba(126,240,207,.25)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.save(); ctx.clip(); ctx.fillStyle = 'rgba(126,240,207,.95)';
    for (let y = Math.max(0, y0); y < Math.min(h, y1); y += 0.5) { const t = s + (y - y0) / pz; let m = 0; for (let i = Math.floor(t * rate); i <= Math.ceil((t + 0.5 / pz) * rate); i++) m = Math.max(m, env[i] || 0); const hw = m * half; if (hw > 0.3) ctx.fillRect(x - hw, y, hw * 2, 0.5); }
    ctx.restore();
  };
  if (above) cap(Math.max(tA, above.s), above.e, above.s < tA);
  if (below) cap(below.s, below.e, false);
  // hiss in the gap
  ctx.fillStyle = 'rgba(126,240,207,.4)';
  for (let y = Y(P.s); y < Y(P.e); y += 0.5) { const t = P.s + (y - Y(P.s)) / (pz * (1 - removed / P.d)); const m = env[Math.floor(t * rate)] || 0; const hw = m * half; ctx.fillRect(x - hw, y, hw * 2, 0.5); }
  if (strike) { ctx.fillStyle = '#ffb648'; ctx.shadowColor = 'rgba(255,182,72,.8)'; ctx.shadowBlur = 8; const yc = (Y(P.s) + Y(P.e)) / 2; ctx.fillRect(strike[0], yc - 1.5, strike[1] - strike[0], 3); ctx.shadowBlur = 0; }
  if (k > 0.98) { ctx.strokeStyle = 'rgba(255,182,72,.8)'; ctx.setLineDash([4, 4]); ctx.beginPath(); const yc = (Y(P.s) + Y(P.e)) / 2; ctx.moveTo(x - cw / 2 - 8, yc); ctx.lineTo(x + cw / 2 + 8, yc); ctx.stroke(); ctx.setLineDash([]); }
  return { gapTop: Y(P.s), gapBot: Y(P.e), P };
}
function ZoomCloseUp() {
  const ref = useRef(), W = 380, H = 318;
  const [k, setK] = useState(0), [drag, setDrag] = useState(null), [geo, setGeo] = useState(null), [touched, setTouched] = useState(false);
  useEffect(() => { setGeo(drawGapScene(ref.current, { w: W, h: H, scale: 3, k, strike: drag && drag.dx > 4 ? [drag.x0, drag.x0 + drag.dx] : null, capFrac: 0.82 })); }, [k, drag]);
  const close = () => { let t0 = null; const f = ts => { if (!t0) t0 = ts; const q = Math.min(1, (ts - t0) / 520); setK(1 - Math.pow(1 - q, 3)); if (q < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); };
  const loc = e => { const rc = e.currentTarget.getBoundingClientRect(); const z = rc.width / W; return (e.clientX - rc.left) / z; };
  const P = geo && geo.P;
  return <div className="zoom">
    <h3>横着一划，停顿就合上</h3>
    <p className="zsub">3 倍特写：0:47.6 那处 3.1 秒的停顿。在下面横着拖一下试试。</p>
    {k > 0 && <button className="again" onClick={() => { setK(0); setDrag(null); }}>再来一次</button>}
    <div className="stage" onPointerDown={e => { if (k > 0) return; e.currentTarget.setPointerCapture(e.pointerId); setTouched(true); setDrag({ x0: loc(e), dx: 0 }); }}
      onPointerMove={e => { if (drag) setDrag(d => ({ ...d, dx: Math.max(0, loc(e) - d.x0) })); }}
      onPointerUp={() => { if (drag && drag.dx > 110) close(); setDrag(null); }} onPointerCancel={() => setDrag(null)}>
      <canvas ref={ref} style={{ width: W, height: H, display: 'block', filter: 'drop-shadow(0 0 6px rgba(126,240,207,.45))' }} />
      {geo && <div style={{ position: 'absolute', left: 0, right: 0, top: (geo.gapTop + geo.gapBot) / 2, transform: 'translateY(-50%)', textAlign: 'center', pointerEvents: 'none' }}>
        {k < 0.5 ? <span style={{ fontSize: 28, fontWeight: 600, color: drag && drag.dx > 110 ? 'var(--warm)' : 'var(--t1)', background: 'rgba(14,20,32,.82)', padding: '2px 14px', borderRadius: 14 }}>{drag && drag.dx > 110 ? '松手就合上' : '停顿 ' + sec1(P.d) + ' 秒'}</span>
          : <span style={{ fontSize: 15, color: 'var(--warm)', background: 'var(--bg)', padding: '2px 10px', borderRadius: 10, position: 'relative', top: -26 }}>合上了，留 0.3 秒，省下 {sec1(P.d - 0.3)} 秒</span>}</div>}
      {!touched && k === 0 && geo && <div className="ghost-fing" style={{ top: (geo.gapTop + geo.gapBot) / 2 + 11, animation: 'swipeHint 2.4s ease-in-out infinite' }} />}
      {!touched && k === 0 && geo && <div style={{ position: 'absolute', left: 70, width: 240, top: (geo.gapTop + geo.gapBot) / 2 + 26, height: 0, borderTop: '2px dashed rgba(238,242,248,.35)', pointerEvents: 'none' }} />}
    </div>
    <div className="frames">
      {[['停顿是空档', 0, null], ['横着划过去', 0, [14, 92]], ['合上，留 0.3 秒', 1, null]].map(([c, kk, st], i) => <figure key={i}><MiniScene k={kk} strike={st} /><figcaption>{c}</figcaption></figure>)}
    </div>
  </div>;
}
function MiniScene({ k, strike }) {
  const ref = useRef();
  useEffect(() => { drawGapScene(ref.current, { w: 104, h: 112, scale: 1.05, k, strike, capFrac: 0.62 }); }, []);
  return <canvas ref={ref} style={{ width: 104, height: 112, display: 'block', borderRadius: 14, background: 'var(--s1)', filter: 'drop-shadow(0 0 3px rgba(126,240,207,.4))' }} />;
}
const GESTURES = [
  ['一指上下滑', '时间往前、往后。那条横线是播放头，滑到哪就从哪听', '和读文字稿一样'],
  ['两指捏合', '缩放：每屏 10 秒到整段；播放头那一刻不动', '缩放时右下角显示每屏多少秒'],
  ['点一句', '选中这一句，底下的工具就作用在它上', null],
  ['点一处空档', '选中这处停顿：合上、全部合上、试听', null],
  ['横着划过', '划掉：空档合上只留 0.3 秒；一句话被删掉，留一道细缝', '竖着是滚动，横着是划掉，两个方向不打架'],
  ['在左边刻度上拖', '拖出任意一段，两头有把手，靠近句子边缘会吸住', '像在文字稿的行号上拖选几行'],
  ['长按一句再拖', '把这句挪到别处', null],
  ['点细缝', '看删了多少秒，一键恢复', null],
];
function Gestures() {
  return <div className="gest"><h3>竖着的工作台，八个手势</h3><p className="gsub">每个方向只做一件事：竖着滚，横着划，刻度上选，两指缩放。</p>
    <table><tbody>{GESTURES.map(([a, b, c]) => <tr key={a}><td>{a}</td><td>{b}{c && <small>{c}</small>}</td></tr>)}</tbody></table>
  </div>;
}
function LoseNote() {
  return <div className="lose" style={{ marginTop: 40 }}><h4>竖着输给横着的地方，和怎么补</h4>
    <p><b>音乐的节拍和整首结构</b>横着看更顺：所以音乐默认整首一屏，段落宽度就是响度，节拍线画在刻度上。<b>一小时的会议</b>往下滚很久：两指捏到整段一屏，标记当目录，点刻度直接跳。<b>多轨</b>竖着最多并排三四条，再多就该换成横屏，这一版还没做横屏。</p></div>;
}
/* background music is a second spine; it narrows beside every sentence */
function BgmCloseUp() {
  const ref = useRef(), W = 380, H = 236, t0 = 40.5, pps = 15.5;
  const [duck, setDuck] = useState(true);
  useEffect(() => {
    const ed = newEd(SPEECH, 'x'), lay = layout(SPEECH, ed), smp = makeSampler(SPEECH, ed);
    const cv = ref.current, dpr = 2; cv.width = W * dpr; cv.height = H * dpr;
    drawSpine(cv.getContext('2d'), { W, H, dpr, y0: t0 * pps, padTop: 0, pps, cols: [
      { x: 112, capW: 112, lay, amp: smp.amp, kind: 'speech' },
      { x: 268, capW: 96, lay: { dur: lay.dur, items: [] }, amp: envSampler(MUSIC, { loop: true, gain: 1.05 }), duck: duck ? duckFor(lay) : null, kind: 'bgm' }] });
  }, [duck]);
  const Y = t => (t - t0) * pps;
  return <div className="zoom" style={{ marginTop: 40, paddingBottom: 16 }}>
    <h3>配乐是并排的第二条脊线</h3>
    <p className="zsub">说话时，音乐那条自己变细；停顿时回来。</p>
    <div style={{ position: 'relative', marginTop: 34 }}>
      <canvas ref={ref} style={{ width: W, height: H, display: 'block', filter: 'drop-shadow(0 0 4px rgba(126,240,207,.45))' }} />
      <span className="lbl" style={{ left: 112, top: -2, transform: 'translate(-50%, -100%)', fontSize: 13 }}>人声</span>
      <span className="lbl" style={{ left: 268, top: -2, transform: 'translate(-50%, -100%)', fontSize: 13 }}>晚风（钢琴版）</span>
      {duck && <span className="lbl" style={{ left: 176, top: Y(49.1), fontSize: 12.5, color: 'var(--t1)', transform: 'translateY(-50%)' }}>停顿</span>}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 22px 0', fontSize: 15 }}>说话时音乐自动让开<Switch on={duck} onChange={setDuck} /></div>
  </div>;
}
function Coverage() {
  const [f, setF] = useState('all');
  const total = SJ.FEATURES.reduce((a, g) => a + g.items.length, 0);
  return <div className="cov">
    <div className="top"><h2>功能覆盖图<br /><span className="t3" style={{ fontSize: 18, fontWeight: 400 }}>{total} 项，每项都有位置</span></h2>
      <p>每一项写着在哪台手机、怎么走到。点一项，那台手机会跳到对应的那一屏，页面滚过去并亮一下。按手机筛选可以看每台管哪些。没网或服务未开通时：在线音色、克隆和 AI 先给试听或说明，音乐库显示上次的目录并写明没连上，音频转文字写「即将开放」。</p></div>
    <div className="filt"><button className={cx(f === 'all' && 'on')} onClick={() => setF('all')}>全部</button>{Object.keys(PHONES).map(k => <button key={k} className={cx(f === k && 'on')} onClick={() => setF(k)}>{PHONES[k].name}</button>)}</div>
    <div className="grid">{SJ.FEATURES.map(g => <div key={g.id} className="grp"><h4>{g.id}　{g.group}<span>{g.items.length} 项</span></h4>
      {g.items.map(([id, name]) => { const c = COVER[id]; if (!c) return <div key={id} className="it" style={{ color: 'var(--red)' }}>{id} 缺位置</div>; return <button key={id} className={cx('it go', f !== 'all' && f !== c[0] && 'dim')} onClick={() => gotoPhone(c[0], c[2])}>
        <span className="id">{id}</span><span><span className="nm">{name}</span><span className="wh"><b>{PHONES[c[0]].name}</b>　{c[1]}</span></span></button>; })}</div>)}</div>
  </div>;
}
function Board() {
  const [vw, setVw] = useState(window.innerWidth);
  useEffect(() => { const f = () => setVw(window.innerWidth); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
  const narrow = vw < 1600, z = narrow ? Math.min(1, (vw - 32) / 380) : 1;
  return <div className={cx('board', narrow && 'narrow')}>
    <div className="band">
      <div className="colL"><Masthead /><Slot id="H" z={z} style={{ marginTop: 56 }} /><BgmCloseUp /></div>
      <div className="colC"><Slot id="W" z={narrow ? z : 1.3} big /><Gestures /></div>
      <div className="colR"><ZoomCloseUp /><Slot id="P" z={z} style={{ marginTop: 52 }} /><LoseNote /></div>
    </div>
    <div className="sec-h"><h2>处理、音乐、导出</h2><p>处理工具把前后差异画在同一根脊线上：左半边是原来的，右半边是处理后的，不用切来切去比较。音乐的副歌是脊线上最宽、最亮的那几段，做铃声就是把 30 秒的框挪过去。导出先问拿去做什么。</p></div>
    <div className="row3"><Slot id="T" z={z} /><Slot id="M" z={z} style={{ marginTop: narrow ? 0 : 70 }} /><Slot id="E" z={z} style={{ marginTop: narrow ? 0 : 26 }} /></div>
    <div className="sec-h"><h2>联网的好东西，出现在需要它的地方</h2><p>会员入口只出现在四处：挑真人感音色、挑 VIP 曲目、请 AI 理解口语、批量超过 10 个。每一处都先让你免费试听或先做一部分，再提会员。剪辑、处理、导出一直免费，没有水印。</p></div>
    <div className="row3"><Slot id="V" z={z} /><Slot id="L" z={z} style={{ marginTop: narrow ? 0 : 54 }} /><Slot id="S" z={z} style={{ marginTop: narrow ? 0 : 18 }} /></div>
    <Coverage />
  </div>;
}
ReactDOM.createRoot(document.getElementById('root')).render(<Board />);
