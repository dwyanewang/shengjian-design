/* ================= the board ================= */
const S0 = SJ.SENTENCE.text;
const P3_APPLIED = { vals: PLAN0, off: {}, pOff: {}, text: S0, colors: { s1: 1, s2: 2, s3: 3, s4: 4 } };
const ED = extra => ['editor', Object.assign({ applied: P3_APPLIED }, extra || {})];
const PHONES = {
  p1: { n: 1, short: '首页', t: '说一句', d: '最近的声音在上，一句话最大', init: { stack: [['home']], g: { draft: S0 } } },
  p2: { n: 2, short: '计划', t: '看它落在哪里', d: '短语、步骤和波形上的位置用同一支笔', init: { stack: [['home'], ['plan', { text: S0, focus: 's2' }]], g: { draft: S0 } } },
  p3: { n: 3, short: '工作台', t: '听结果', d: '颜色留着说明出处，手动工具在下面一层', init: { stack: [['home'], ED()], g: { applied: P3_APPLIED, draft: S0 } } },
  p6: { short: '新建', t: '新建', d: '声音从哪来都在这里，录音最大', init: { stack: [['new']] } },
  p5: { short: '处理工具', t: '降噪', d: '处理工具都先对比，再存成新版本', init: { stack: [['home'], ED(), ['tool', { id: 'denoise' }]], g: { applied: P3_APPLIED } } },
  p4: { n: 4, short: '导出', t: '拿去用', d: '先问做什么用：存文件、设铃声、发给别人', init: { stack: [['home'], ED(), ['export', { item: 'interview' }]], g: { applied: P3_APPLIED } } },
  p7: { short: '配音', t: '配音', d: '本机音色免费；真人感音色和克隆是会员', init: { stack: [['new'], ['tts', { tab: 'online' }]] } },
  p8: { short: '音乐库', t: '在线音乐库', d: '试听都免费，署名自动记下', init: { stack: [['new'], ['music', {}]] } },
  p9: { short: '我的', t: '会员', d: '只卖联网才有的东西；价格是示例', init: { stack: [['me'], ['member', {}]] } },
};
const ORDER = ['p1', 'p2', 'p3', 'p6', 'p5', 'p4', 'p7', 'p8', 'p9'];
const WIRES = [
  { from: ['p1', 'say-go'], to: 'p2', kind: 'side', label: '点「看看怎么改」' },
  { from: ['p2', 'plan-go'], to: 'p3', kind: 'side', label: '点「照这样改」' },
  { from: ['p3', 'ed-export'], to: 'p4', kind: 'rightDown', label: '点「导出」' },
  { from: ['p3', 'ed-tools'], to: 'p5', kind: 'bottomToRight', label: '「工具」里点「降噪」' },
  { from: ['p1', 'nav-new'], to: 'p6', kind: 'downTop', label: '点「新建」' },
  { from: ['p6', 'new-tts'], to: 'p7', kind: 'leftDown', label: '点「文字读出来」' },
  { from: ['p6', 'new-music'], to: 'p8', kind: 'side', label: '点「在线音乐库」' },
  { from: ['p8', 'track-m3'], to: 'p9', kind: 'side', label: '会员曲目' },
  { from: ['p7', 'tts-go'], to: 'p9', kind: 'under', label: '选「林溪」生成，要会员' },
];

/* coverage: every one of the 93 features, which phone, how to get there */
const T = (id, extra) => [['home'], ED(), ['tool', Object.assign({ id }, extra || {})]];
const COVER = [
  ['A1', 'p6', { stack: [['new'], ['record']] }, '新建 › 录音'],
  ['A2', 'p6', { stack: [['new'], ['record', { sheet: 'set' }]] }, '新建 › 录音 › 右上角设置'],
  ['A3', 'p6', { stack: [['new'], ['record']] }, '新建 › 录音 › 录过的，接着录'],
  ['A4', 'p6', { stack: [['new'], ['files']] }, '新建 › 手机里的文件'],
  ['A5', 'p6', { stack: [['new'], ['video']] }, '新建 › 视频里的声音'],
  ['A6', 'p6', { stack: [['new'], ['incoming']] }, '别的 App › 分享 › 声剪'],
  ['A7', 'p7', { stack: [['new'], ['tts', { tab: 'system' }]] }, '新建 › 文字读出来'],
  ['A8', 'p7', { stack: [['new'], ['tts', { tab: 'system' }], ['subtitle']] }, '新建 › 字幕配音'],
  ['A9', 'p7', { stack: [['new'], ['clone']] }, '新建 › 克隆我的声音'],
  ['A10', 'p8', { stack: [['new'], ['music']] }, '新建 › 在线音乐库'],
  ['A11', 'p6', { stack: [['new']], sheet: ['blank', {}] }, '新建 › 一段空白'],
  ['A12', 'p6', { stack: [['new']], sheet: ['samples', {}] }, '新建 › 示例音频'],
  ['A13', 'p6', { stack: [['new']], sheet: ['package', {}] }, '新建 › 导入工程包'],
  ['B1', 'p3', { stack: [['home'], ED({ sel: [20, 35] })] }, '工作台 › 在波形上拖；精确时间'],
  ['B2', 'p3', { stack: [['home'], ED({ sel: [20, 35] })] }, '工作台 › 选一段 › 剪掉、只留'],
  ['B3', 'p3', { stack: [['home'], ED()] }, '工作台 › 分割'],
  ['B4', 'p3', { stack: [['home'], ED({ panel: 'segs' })] }, '工作台 › 片段'],
  ['B5', 'p3', { stack: [['home'], ED({ sel: [20, 35] })] }, '工作台 › 选一段 › 复制、剪切；插入 › 粘贴'],
  ['B6', 'p3', { stack: [['home'], ED({ sel: [20, 35] })] }, '工作台 › 选一段 › 重复'],
  ['B7', 'p3', { stack: [['home'], ED({ panel: 'gain' })] }, '工作台 › 音量'],
  ['B8', 'p3', { stack: [['home'], ED({ panel: 'fade' })] }, '工作台 › 淡化'],
  ['B9', 'p3', { stack: [['home'], ED({ panel: 'segs' })] }, '工作台 › 片段 › 接缝交叉淡化'],
  ['B10', 'p3', { stack: [['home'], ED({ envMode: true })] }, '工作台 › 工具 › 音量曲线'],
  ['B11', 'p3', { stack: [['home'], ED({ panel: 'marks' })] }, '工作台 › 标记'],
  ['B12', 'p3', { stack: [['home'], ED({ panel: 'insert' })] }, '工作台 › 插入 › 一段静音'],
  ['B13', 'p3', { stack: [['home'], ED({ panel: 'insert' })] }, '工作台 › 插入 › 别的声音、现在录'],
  ['B14', 'p3', { stack: [['home'], ED({ panel: 'beat' })] }, '工作台 › 工具 › 对齐节拍'],
  ['B15', 'p3', { stack: [['home'], ED({ panel: 'hist' })] }, '工作台 › 右上角撤销、重做'],
  ['B16', 'p3', { stack: [['home'], ED()] }, '工作台 › 1× 倍速'],
  ['B17', 'p3', { stack: [['home'], ED({ ab: 'A' })] }, '工作台 › 原声'],
  ['B18', 'p3', { stack: [['home'], ED({ spec: true })] }, '工作台 › 频谱'],
  ['B19', 'p3', { stack: [['home'], ED({ zoom: 2 })] }, '工作台 › 波形右上角放大缩小'],
  ['C1', 'p1', { stack: [['home'], ['say', { listen: true }]] }, '首页 › 一句话 › 话筒；英文那句在「试试这样说」'],
  ['C2', 'p2', { stack: [['home'], ['plan', { text: S0, focus: 's2' }]] }, '首页 › 看看怎么改 › 计划页'],
  ['C3', 'p2', { stack: [['home'], ['plan', { text: S0, focus: 's1' }]] }, '计划页 › 步骤卡：改数字、不做这步'],
  ['C4', 'p2', { stack: [['home'], ['plan', { text: SJ.SENTENCE.question.text }]] }, '计划页：只说了「剪掉开头」'],
  ['C5', 'p2', { stack: [['home'], ['plan', { text: AI_SAID }]] }, '计划页 › 请 AI 帮忙理解'],
  ['C6', 'p3', { stack: [['home'], ED()] }, '工作台 › 这一版来自你说的 › 整条撤销'],
  ['C7', 'p1', { stack: [['home'], ['say', { tab: 'recipes' }]] }, '首页 › 一句话 › 最近说过、我的配方'],
  ['C8', 'p1', { stack: [['home', { multi: true }]] }, '首页 › 多选 › 说一句'],
  ['C9', 'p2', { stack: [['home'], ['plan', { text: '把副歌做成铃声' }]] }, '计划页：「把副歌做成铃声」› 导出预选'],
  ['C10', 'p2', { stack: [['home'], ['plan', { text: '降噪之后统一音量' }]] }, '计划页：「降噪之后统一音量」› 工具链'],
  ...SJ.TOOLS.map((t, i) => ['D' + (i + 1), 'p5', { stack: T(t.id) }, '工作台 › 工具 › ' + t.name + (t.unavailable ? '（即将开放）' : '')]),
  ['E1', 'p5', { stack: T('denoise', { saved: true }) }, '处理工具 › 存成新版本'],
  ['E2', 'p3', { stack: [['home'], ED(), ['versions']] }, '工作台 › 标题下的「版本」'],
  ['E3', 'p5', { stack: T('denoise') }, '处理工具 › 原来的、处理后'],
  ['E4', 'p5', { stack: [['home'], ['versions', { item: 'dance' }], ['tool', { id: 'medley', item: 'dance', readjust: true }]] }, '版本 › 做法还在 › 再调一下'],
  ['F1', 'p1', { stack: [['me'], ['batch']] }, '我的 › 批量处理'],
  ['F2', 'p1', { stack: [['me'], ['batch', { tpl: 'clean' }]] }, '批量处理 › 文件、存到'],
  ['F3', 'p1', { stack: [['me'], ['batch', { stage: 'run' }]] }, '批量处理 › 开始 › 暂停'],
  ['F4', 'p1', { stack: [['me'], ['batch', { stage: 'report' }]] }, '批量处理 › 做完了'],
  ['G1', 'p4', { stack: [['home'], ED(), ['export', { item: 'interview' }]] }, '工作台 › 导出'],
  ['G2', 'p4', { stack: [['home'], ED(), ['export', { item: 'interview', more: true }]] }, '导出 › 存成文件 › 格式和音质'],
  ['G3', 'p4', { stack: [['home'], ED(), ['export', { item: 'interview', meta: true }]] }, '导出 › 文件信息'],
  ['G4', 'p4', { stack: [['home'], ED(), ['export', { item: 'interview' }]] }, '导出 › 预设'],
  ['G5', 'p4', { stack: [['home'], ED(), ['export', { item: 'interview' }]] }, '导出 › 爆音提示和限幅'],
  ['G6', 'p4', { stack: [['home'], ED(), ['export', { item: 'interview', perSeg: true }]] }, '导出 › 每段一个文件'],
  ['G7', 'p4', { stack: [['home'], ED(), ['export', { item: 'interview', stage: 'ready' }]] }, '导出 › 待保存 › 选位置保存'],
  ['G8', 'p4', { stack: [['home'], ['export', { item: 'wanfeng', purpose: 'sound' }]] }, '导出 › 设成铃声'],
  ['H1', 'p1', { stack: [['home', { search: true }]] }, '首页 › 音频库 › 搜索、筛选'],
  ['H2', 'p1', { stack: [['home', { multi: true }]] }, '首页 › 音频库 › 多选'],
  ['H3', 'p1', { stack: [['home']], sheet: ['item', { id: 'interview' }] }, '首页 › 一条声音 › 右边的更多'],
  ['H4', 'p1', { stack: [['home']], sheet: ['item', { id: 'lesson' }] }, '首页 › 音频库里的状态；英语听力 › 更多'],
  ['I1', 'p9', { stack: [['me'], ['login']] }, '我的 › 登录'],
  ['I2', 'p9', { stack: [['me'], ['member']] }, '我的 › 会员'],
  ['I3', 'p9', { stack: [['me'], ['member']] }, '会员 › 多出来的、一直免费的'],
  ['I4', 'p9', { stack: [['me'], ['login']] }, '登录页第一段'],
  ...SJ.SETTINGS.map((s, i) => ['J' + (i + 1), 'p9', i < 4 ? { stack: [['me'], ['settings']] } : i === 4 ? { stack: [['me'], ['settings', { sec: 'data' }]] } : { stack: [['me'], ['help', { sec: i - 5 }]] }, i < 5 ? '我的 › 设置 › ' + s.split('：')[0].replace('（开关）', '') : '我的 › 帮助 › ' + s]),
  ['K1', 'p3', { stack: [['home'], ED()], shade: true }, '点状态栏 › 正在播放'],
  ['K2', 'p4', { stack: [['home'], ED(), ['export', { item: 'interview', stage: 'gen' }]], shade: true }, '点状态栏 › 导出、批量进度'],
].map(([id, ph, spec, path]) => ({ id, ph, spec, path }));
const COVER_BY = {}; COVER.forEach(c => COVER_BY[c.id] = c);
const HONEST = [
  ['在线音色没网', '「真人感」那一栏换成说明：要联网，本机音色照常能用，有「再试一次」。', 'p7', { stack: [['new'], ['tts', { tab: 'online', offline: true }]] }],
  ['音乐库没连上', '列出上次的目录并写明日期、不是最新；下载过的曲子照样能用。', 'p8', { stack: [['new'], ['music', { offline: true }]] }],
  ['AI 理解没开通', '只在本机读不懂时出现；说明只发文字不发声音；不是会员就停在会员说明，不假装理解了。', 'p2', { stack: [['home'], ['plan', { text: AI_SAID }]] }],
  ['音频转文字', '写「即将开放」，不出假文字稿；可以开「开放时提醒我」。', 'p5', { stack: T('stt') }],
  ['登录、会员', '不登录也能用全部本机功能；开通要先登录，价格写明是示例。', 'p9', { stack: [['me'], ['member']] }],
  ['克隆声音', '照着读和本机检查不联网、免费；上传前单独征得同意，保存才要会员。', 'p7', { stack: [['new'], ['clone', { step: 2 }]] }],
];

function useWires(boardRef) {
  const [w, setW] = useState({ paths: [], tags: [], rings: [], mag: null });
  const compute = useCallback(() => {
    const B = boardRef.current; if (!B) return;
    if (window.innerWidth < 1260) { setW({ paths: [], tags: [], rings: [], mag: null }); return; }
    const b = B.getBoundingClientRect();
    const R = el => { const r = el.getBoundingClientRect(); return { l: r.left - b.left, t: r.top - b.top, r: r.right - b.left, b: r.bottom - b.top, cx: (r.left + r.right) / 2 - b.left, cy: (r.top + r.bottom) / 2 - b.top, w: r.width, h: r.height }; };
    const paths = [], tags = [], rings = [];
    WIRES.forEach(wd => {
      const sp = document.getElementById('phone-' + wd.from[0]), tp = document.getElementById('phone-' + wd.to);
      const an = sp && sp.querySelector(`[data-anchor="${wd.from[1]}"]`); if (!sp || !tp || !an) return;
      const S = R(sp), Tt = R(tp), A = R(an); let d, tag;
      if (A.t < S.t + 40 || A.b > S.b - 30) return; // scrolled out of its screen
      if (sp.querySelector('.sheet-bg, .shade')) return; // covered by a sheet or the shade
      rings.push(A);
      const rr = 14;
      if (wd.kind === 'side') { const ty = clamp(A.cy + 46, Tt.t + 90, Tt.b - 90); d = `M${A.r + 3} ${A.cy} L${S.r} ${A.cy} C ${S.r + 70} ${A.cy}, ${Tt.l - 70} ${ty}, ${Tt.l - 3} ${ty}`; tag = [(S.r + Tt.l) / 2, (A.cy + ty) / 2]; }
      if (wd.kind === 'rightDown') { const gx = S.r + 24, ty = Tt.t + 150; d = `M${A.r + 3} ${A.cy} L${gx - rr} ${A.cy} Q${gx} ${A.cy} ${gx} ${A.cy + rr} L${gx} ${ty - rr} Q${gx} ${ty} ${gx - rr} ${ty} L${Tt.r + 3} ${ty}`; tag = [Tt.r - 70, S.b + 30]; }
      if (wd.kind === 'bottomToRight') { const y1 = S.b + 26, gx = (Tt.r + S.l) / 2, ty = Tt.t + 230; d = `M${A.cx} ${A.b + 3} L${A.cx} ${y1 - rr} Q${A.cx} ${y1} ${A.cx - rr} ${y1} L${gx + rr} ${y1} Q${gx} ${y1} ${gx} ${y1 + rr} L${gx} ${ty - rr} Q${gx} ${ty} ${gx - rr} ${ty} L${Tt.r + 3} ${ty}`; tag = [gx, (y1 + ty) / 2 + 40]; }
      if (wd.kind === 'downTop') { const y1 = S.b + 28, xT = Tt.r - 36; d = `M${A.cx} ${A.b + 3} L${A.cx} ${y1 - rr} Q${A.cx} ${y1} ${A.cx + rr} ${y1} L${xT - rr} ${y1} Q${xT} ${y1} ${xT} ${y1 + rr} L${xT} ${Tt.t - 3}`; tag = [(A.cx + xT) / 2, y1]; }
      if (wd.kind === 'leftDown') { const gx = S.l - 24, ty = Tt.t + 140; d = `M${A.l - 3} ${A.cy} L${gx + rr} ${A.cy} Q${gx} ${A.cy} ${gx} ${A.cy + rr} L${gx} ${ty - rr} Q${gx} ${ty} ${gx + rr} ${ty} L${Tt.l - 3} ${ty}`; tag = [S.l + 96, S.b + 30]; }
      if (wd.kind === 'under') { const y1 = Math.max(S.b, Tt.b) + 34; d = `M${A.cx} ${A.b + 3} L${A.cx} ${y1 - rr} Q${A.cx} ${y1} ${A.cx + rr} ${y1} L${Tt.cx - rr} ${y1} Q${Tt.cx} ${y1} ${Tt.cx} ${y1 - rr} L${Tt.cx} ${Tt.b + 3}`; tag = [(A.cx + Tt.cx) / 2, y1]; }
      paths.push(d); tags.push({ x: tag[0], y: tag[1], t: wd.label });
    });
    const pb = document.querySelector('#phone-p2 [data-anchor="plan-box"]');
    const mag = pb ? R(pb) : null;
    setW({ paths, tags, rings, mag });
  }, []);
  useEffect(() => {
    const ts = [200, 900, 2000].map(t => setTimeout(compute, t));
    document.fonts && document.fonts.ready.then(compute);
    let tm; const later = () => { clearTimeout(tm); tm = setTimeout(compute, 280); };
    window.addEventListener('resize', compute); window.addEventListener('sj-nav', later);
    return () => { ts.forEach(clearTimeout); window.removeEventListener('resize', compute); window.removeEventListener('sj-nav', later); };
  }, []);
  return w;
}

/* the signature, opened up: the sentence wraps around the sound it changes */
function CloseUp() {
  const ref = useRef(); const [W, setW] = useState(880);
  const [lines, setLines] = useState([]);
  useLayoutEffect(() => { const f = () => { const e = ref.current; if (!e) return; const cs = getComputedStyle(e); setW(Math.max(280, e.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight))); }; f(); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
  const steps = PARSE[S0].steps;
  const small = W < 600;
  const TW = small ? 56 : 104, GAP = small ? 16 : 30, MW = W - TW - GAP, H = small ? 100 : 150;
  const split = 13;
  const row = (a, z) => { const out = []; let i = a; steps.filter(s => s.phrase[0] >= a && s.phrase[1] <= z).forEach(s => { if (s.phrase[0] > i) out.push(S0.slice(i, s.phrase[0])); out.push(<span key={s.id} className="hl" data-cu={s.id} style={{ '--c': HL[s.color].fill, cursor: 'default' }}>{S0.slice(s.phrase[0], s.phrase[1])}</span>); i = s.phrase[1]; }); if (i < z) out.push(S0.slice(i, z)); return out; };
  const regs = [{ a: 0, b: 3, kind: 'fill', c: HL[1].fill }].concat(SJ.PAUSES.map(([t, d]) => ({ a: t + 0.15, b: t + d - 0.15, kind: 'fill', c: HL[2].fill, min: 4 })));
  useLayoutEffect(() => {
    const box = ref.current; if (!box) return; const bb = box.getBoundingClientRect();
    const wv = box.querySelector('.cu-wave').getBoundingClientRect(); const wx = wv.left - bb.left, wy = wv.top - bb.top, wb = wv.bottom - bb.top;
    const P = id => { const e = box.querySelector(`[data-cu="${id}"]`); const r = e.getBoundingClientRect(); return { cx: r.left + r.width / 2 - bb.left, t: r.top - bb.top + 8, b: r.bottom - bb.top - 4 }; };
    const out = [];
    const p1 = P('s1'); out.push({ x1: p1.cx, y1: p1.b, x2: wx + 1.5 / 130 * MW, y2: wy, c: HL[1].ink });
    const p2 = P('s2'); SJ.PAUSES.forEach(([t, d]) => out.push({ x1: p2.cx, y1: p2.b, x2: wx + (t + d / 2) / 130 * MW, y2: wy, c: HL[2].ink }));
    const p3 = P('s3'); out.push({ x1: p3.cx, y1: p3.t, x2: wx + MW * 0.5, y2: wb, c: HL[3].ink });
    const p4 = P('s4'); out.push({ x1: p4.cx, y1: p4.t, x2: wx + W - TW * 0.25, y2: wb - 20, c: HL[4].ink });
    setLines(out);
  }, [W]);
  return <div className="cu" ref={ref}>
    <div className="cu-row r1">{row(0, split)}</div>
    <div className="cu-wave" style={{ display: 'flex', alignItems: 'flex-end', gap: 0 }}>
      <div>
        <Wave env={envSpeech()} rate={50} from={0} to={130} w={MW} h={H} regions={regs} theme={THEME.light} />
        <div style={{ height: 10, marginTop: 4, borderRadius: 5, background: HL[3].fill, width: MW }} />
      </div>
      <div style={{ width: GAP, textAlign: 'center', color: '#5A626D', fontSize: 18, paddingBottom: 30 }}>⋯</div>
      <div><Wave env={envTail()} rate={50} from={5} to={12} w={TW} h={H} fadeEnd={2} regions={[{ a: 10, b: 12, kind: 'fade', c: HL[4].fill, line: '#1E2228' }]} theme={THEME.light} /><div style={{ height: 14 }} /></div>
    </div>
    <div className="cu-row">{row(split, S0.length)}</div>
    <svg className="cu-lines" width="100%" height="100%">{lines.map((l, i) => <g key={i}><path d={`M${l.x1} ${l.y1} C ${l.x1} ${(l.y1 + l.y2) / 2}, ${l.x2} ${(l.y1 + l.y2) / 2}, ${l.x2} ${l.y2}`} fill="none" stroke={l.c} strokeWidth="1.6" /><circle cx={l.x2} cy={l.y2} r="3" fill={l.c} /></g>)}</svg>
    <div className="cu-foot">
      {steps.map(s => <span key={s.id}><i className="dot" style={{ background: HL[s.color].fill, width: 14, height: 14, borderRadius: 7 }} />{s.title.replace('剪掉开头 3 秒', '剪掉 0:00–0:03').replace('删掉 9 处长停顿', '9 处长停顿，共省 14 秒')}</span>)}
    </div>
  </div>;
}

const NAME_BY = {}; SJ.FEATURES.forEach(gp => gp.items.forEach(([id, nm]) => NAME_BY[id] = nm));
function Coverage({ jump }) {
  const [only, setOnly] = useState(null);
  const [hov, setHov] = useState(null);
  const counts = {}; COVER.forEach(c => counts[c.ph] = (counts[c.ph] || 0) + 1);
  const hc = hov && COVER_BY[hov];
  return <section className="bd-sec" id="coverage">
    <h2 className="bd-h2">93 项功能，各在哪一屏</h2>
    <p className="bd-sub">先看九台手机各管哪些功能，再看每一项从哪里点进去。方块和白底的路径都能点，对应的手机会切过去。</p>
    <div className="cov-waffle" onMouseLeave={() => setHov(null)}>
      {ORDER.map(pid => { const items = COVER.filter(c => c.ph === pid); return <div key={pid} className="cw-cl">
        <button className="cw-h" onClick={() => setOnly(only === pid ? null : pid)}>{PHONES[pid].n ? <i>{PHONES[pid].n}</i> : null}{PHONES[pid].short}<span className="num">{items.length}</span></button>
        <div className="cw-sq" style={{ '--n': Math.min(8, items.length) }}>{items.map(c => <button key={c.id} className={(hov === c.id ? 'on' : '') + (only && only !== pid ? ' off' : '')} onMouseEnter={() => setHov(c.id)} onFocus={() => setHov(c.id)} onClick={() => jump(c)} aria-label={c.id + ' ' + NAME_BY[c.id]}>{c.id}</button>)}</div>
      </div>; })}
    </div>
    <div className="cw-read">{hc ? <><b className="num">{hc.id}</b>{NAME_BY[hc.id]}<span>{PHONES[hc.ph].short}那台手机：{hc.path}</span></> : <span>九组方块是九台手机，每个方块是一项功能。指着方块看是哪一项，点一下那台手机就切过去。</span>}</div>
    <div className="cov-bar">
      <button className={'cov-pill' + (!only ? ' on' : '')} onClick={() => setOnly(null)}>全部 <span className="num">{COVER.length}</span></button>
      {ORDER.map(pid => <button key={pid} className={'cov-pill' + (only === pid ? ' on' : '')} onClick={() => setOnly(only === pid ? null : pid)}>{PHONES[pid].short}<span className="num">{counts[pid]}</span></button>)}
    </div>
    <div className="cov-cols">{SJ.FEATURES.map(gp => <div key={gp.id} className={'cov-g' + (only ? ' fade' : '')}>
      <div className="cov-gh"><b>{gp.id}</b><span>{gp.group}</span><em>{gp.items.length} 项</em></div>
      {gp.items.map(([id, name]) => { const c = COVER_BY[id]; return <div key={id} className={'cov-it' + (only && c.ph === only ? ' hit' : '')}>
        <span className="id">{id}</span><span className="nm">{name}</span>
        <div className="wh"><button className="cov-go" data-cov={id} onClick={() => jump(c)} title={'切换「' + PHONES[c.ph].short + '」那台手机'}>{c.path}</button></div>
      </div>; })}
    </div>)}</div>
    <div className="cov-honest">
      <h3>没网、没开通时怎么说</h3>
      {HONEST.map(([t, d, ph, spec]) => <div key={t}><b>{t}</b>{d}<div><button className="cov-go" style={{ marginTop: 6 }} onClick={() => jump({ ph, spec })}>看这个状态</button></div></div>)}
    </div>
  </section>;
}

function Board() {
  const boardRef = useRef();
  const w = useWires(boardRef);
  const jump = c => {
    const ph = window.__phones && window.__phones[c.ph]; if (!ph) return;
    ph.jump(c.spec);
    const el = document.getElementById('phone-' + c.ph);
    if (el) { const y = el.getBoundingClientRect().top + window.scrollY - 110; window.scrollTo({ top: y, behavior: 'smooth' }); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
  };
  return <div className="board" ref={boardRef}>
    <header>
      <div className="bd-top">
        <div className="bd-brand"><Logo s={44} /><b>声剪</b><span>方向一</span></div>
        <div className="bd-meta">Android 手机音频编辑 App，商业化改版初稿<br />2026-11-23</div>
      </div>
      <div className="bd-hero">
        <div>
          <h1 className="bd-h1">说一句，<br />改动就落在声音上。</h1>
          <p className="bd-lead">声剪听得懂中文的一句话。你说的每个短语、计划里的每一步、波形上的每一处，用同一支荧光笔连起来：哪处改动来自你说的哪几个字，一眼看得出；数字点一下就改，不想要的划掉就不做。</p>
          <div className="bd-rule">
            <div className="bd-swatches">{[1, 2, 3, 4].map(i => <i key={i} style={{ background: HL[i].fill }} />)}<span style={{ marginLeft: 6 }}>四支荧光笔，按你说的顺序上色</span></div>
            颜色只回答一个问题：这处改动来自你说的哪几个字。其余全是石墨和冷白，选区、播放头、按钮、会员标记都不用彩色。
          </div>
        </div>
        <div>
          <div style={{ fontSize: 15, color: 'var(--board-ink-3)', marginBottom: 12, display: 'flex', justifyContent: 'space-between', gap: 16 }}><span>拆开看计划页：一个短语，落在声音的一处，或者九处</span><span>第 2 台手机虚线框里那一块，放大约 2.4 倍</span></div>
          <CloseUp />
        </div>
      </div>
    </header>
    <section className="bd-sec first">
      <div className="sec-head"><h2 className="bd-h2">从说一句，到拿去用</h2>
      <p className="bd-sub">九台手机都能点：切页、弹层、播放、改数字、划掉一步，设置里能换深色。细线从点了哪里连到去了哪一屏；点状态栏拉下通知栏，点底部横条返回。</p></div>
      <div className="flow">
        <div className="flow-grid">{ORDER.map((pid, i) => { const ph = PHONES[pid]; return <React.Fragment key={pid}>{i === 6 && <div className="row-note">
          <div style={{ paddingLeft: 0 }}><h3>第三排是收钱的地方：<br />会员出现在正需要它的时候</h3><b>一直免费</b>剪、处理、本机朗读、所有格式导出，都在手机上完成，不加水印、不限次数。</div>
          <div><b>会员卖什么</b>只卖联网才有的东西：真人感音色、克隆自己的声音、会员曲目、AI 听懂口语、不限量批量。</div>
          <div><b>在哪里遇到</b>选真人感音色、点会员曲目、口语没读懂、批量超过 {FREE_BATCH} 个；会员页先让你听一句。</div>
        </div>}<div className={'slot c' + (i % 3)}>
          <div className="slot-lab">{ph.n ? <span className="slot-n">{ph.n}</span> : <span style={{ width: 34, flex: 'none' }} />}<div style={{ maxWidth: 300 }}><div className="slot-t">{ph.t}</div><div className="slot-d">{ph.d}</div></div></div>
          <PhoneApp pid={pid} init={ph.init} />
        </div></React.Fragment>; })}</div>
      </div>
    </section>
    <Coverage jump={jump} />
    <footer className="bd-foot">方向一初稿。演示内容全部来自共用的 demo-data.js，另补的字幕、录音列表、批量文件名放在这一页自己的数据里；价格是示例，以 Google Play 为准；没有编评价、下载量和媒体背书。免费版批量上限 {FREE_BATCH} 个是这一版的假设。</footer>
    <svg className="flow-svg" style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }}>
      <defs><marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#1E2228" /></marker></defs>
      {w.rings.map((r, i) => <rect key={'r' + i} x={r.l - 4} y={r.t - 4} width={r.w + 8} height={r.h + 8} rx={Math.min(22, (r.h + 8) / 2)} fill="none" stroke="#1E2228" strokeWidth="2.2" />)}
      {w.paths.map((d, i) => <path key={i} d={d} fill="none" stroke="#1E2228" strokeWidth="1.6" markerEnd="url(#arr)" />)}
      {w.mag && <rect x={w.mag.l + 6} y={w.mag.t - 2} width={w.mag.w - 12} height={w.mag.h + 4} rx="14" fill="none" stroke="#1E2228" strokeWidth="1.6" strokeDasharray="6 5" />}
    </svg>
    {w.tags.map((t, i) => <div key={i} className="flow-tag" style={{ left: t.x, top: t.y }}>{t.t}</div>)}
  </div>;
}

Object.assign(window, { Board, PHONES, COVER });
