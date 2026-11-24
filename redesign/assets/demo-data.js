/* 声剪 redesign · shared demo content for all three directions.
 * Same content everywhere; only the design differs. Load with a classic script tag:
 *   <script src="../assets/demo-data.js"></script>   → window.SJ
 * Everything here is fictional demo content (no real songs, artists or people).
 */
(function () {
  // ---------- seeded random ----------
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return function () { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  // ---------- speech envelope ----------
  // Interview recording: 0–2.6 s room noise (to be cut), then two speakers talking in syllables,
  // short pauses between phrases, and the 9 long pauses listed in PAUSES (≥1.1 s each).
  const PAUSES = [
    [11.8, 1.6], [24.3, 2.2], [33.0, 1.3], [47.6, 3.1], [58.9, 1.4],
    [71.2, 1.9], [86.5, 2.6], [97.4, 1.2], [112.0, 1.8],
  ];
  function speechEnvelope(opts) {
    const o = Object.assign({ seconds: 130, rate: 50, seed: 7, noise: 0.045, lead: 2.6, pauses: PAUSES }, opts || {});
    const r = rng(o.seed), n = Math.round(o.seconds * o.rate), a = new Float32Array(n);
    for (let i = 0; i < n; i++) a[i] = o.noise * (0.55 + 0.45 * r());            // room noise floor
    const inPause = t => o.pauses.some(([s, d]) => t >= s && t < s + d);
    let t = o.lead, speaker = 0, phraseGain = 0.8;
    while (t < o.seconds) {
      if (inPause(t)) { const p = o.pauses.find(([s, d]) => t >= s && t < s + d); t = p[0] + p[1]; speaker = 1 - speaker; continue; }
      const words = 3 + Math.floor(r() * 7);                                       // a phrase
      phraseGain = (speaker ? 0.62 : 0.82) * (0.8 + 0.35 * r());
      for (let w = 0; w < words && t < o.seconds && !inPause(t); w++) {
        const syl = 1 + Math.floor(r() * 3);
        for (let k = 0; k < syl; k++) {
          const dur = 0.11 + r() * 0.17, peak = Math.min(1, phraseGain * (0.55 + 0.6 * r()));
          const i0 = Math.round(t * o.rate), i1 = Math.round((t + dur) * o.rate);
          for (let i = i0; i < i1 && i < n; i++) {
            const x = (i - i0) / Math.max(1, i1 - i0);
            const shape = x < 0.18 ? x / 0.18 : Math.pow(1 - (x - 0.18) / 0.82, 1.4);
            a[i] = Math.max(a[i], peak * (0.15 + 0.85 * shape) * (0.85 + 0.15 * r()));
          }
          t += dur + 0.015 + r() * 0.04;
        }
        t += 0.04 + r() * 0.09;                                                     // gap between words
      }
      t += 0.18 + r() * 0.42;                                                       // gap between phrases
      if (r() < 0.22) speaker = 1 - speaker;
    }
    return a;
  }

  // ---------- music envelope ----------
  // "晚风（钢琴版）" 3:52, 92 BPM: intro, verse, chorus ×3 (the loud, repeated parts), bridge, outro.
  const SECTIONS = [
    { from: 0, to: 14.5, name: '前奏', level: 0.34 }, { from: 14.5, to: 46.0, name: '主歌', level: 0.52 },
    { from: 46.0, to: 61.8, name: '导歌', level: 0.62 }, { from: 61.8, to: 92.6, name: '副歌', level: 0.9 },
    { from: 92.6, to: 125.0, name: '主歌', level: 0.55 }, { from: 125.0, to: 155.4, name: '副歌', level: 0.92 },
    { from: 155.4, to: 182.0, name: '桥段', level: 0.46 }, { from: 182.0, to: 214.6, name: '副歌', level: 0.97 },
    { from: 214.6, to: 232.0, name: '尾奏', level: 0.3 },
  ];
  function musicEnvelope(opts) {
    const o = Object.assign({ seconds: 232, rate: 20, seed: 3, bpm: 92 }, opts || {});
    const r = rng(o.seed), n = Math.round(o.seconds * o.rate), a = new Float32Array(n), beat = 60 / o.bpm;
    for (let i = 0; i < n; i++) {
      const t = i / o.rate, sec = SECTIONS.find(s => t >= s.from && t < s.to) || SECTIONS[SECTIONS.length - 1];
      const ph = (t % beat) / beat, pulse = Math.exp(-ph * 5.5);
      const edgeIn = Math.min(1, (t - sec.from) / 1.2), fadeEnd = t > o.seconds - 6 ? (o.seconds - t) / 6 : 1;
      a[i] = Math.max(0.02, sec.level * (0.62 + 0.3 * pulse + 0.12 * r()) * (0.75 + 0.25 * edgeIn) * fadeEnd);
    }
    return a;
  }

  // ---------- library ----------
  const LIBRARY = [
    { id: 'interview', title: '播客第 12 期 · 和王老师聊阅读', kind: 'speech', from: '录音', seconds: 1120, date: '今天 09:42', versions: 3, versionNames: ['原始录音', '降噪', '删掉停顿'], status: null, env: 'speech' },
    { id: 'wanfeng', title: '晚风（钢琴版）', kind: 'music', from: '手机里的文件', seconds: 232, date: '今天 08:15', versions: 2, versionNames: ['原始音频', '副歌铃声 30 秒'], status: 'saving', statusText: '铃声待保存', env: 'music' },
    { id: 'meeting', title: '周三产品例会', kind: 'speech', from: '录音', seconds: 2832, date: '昨天 15:00', versions: 1, status: null, env: 'speech', markers: 6 },
    { id: 'dance', title: '广场舞串烧 · 6 首', kind: 'mix', from: '串烧', seconds: 1385, date: '11月21日', versions: 1, status: 'exporting', statusText: '正在导出 64%', env: 'music' },
    { id: 'promo', title: '新品介绍配音', kind: 'voice', from: '文字转配音 · 在线音色「林溪」', seconds: 72, date: '11月20日', versions: 2, status: null, env: 'speech' },
    { id: 'grad', title: '毕业典礼 · 从视频提取', kind: 'speech', from: '视频里的声音', seconds: 228, date: '11月18日', versions: 1, status: null, env: 'speech' },
    { id: 'annual', title: '年会开场 BGM', kind: 'mix', from: '一分钟循环', seconds: 60, date: '11月15日', versions: 1, status: null, env: 'music' },
    { id: 'lesson', title: '英语听力 Unit 5（0.8 倍速）', kind: 'speech', from: '手机里的文件', seconds: 1510, date: '11月12日', versions: 2, status: null, env: 'speech' },
  ];

  // ---------- one sentence ----------
  // Offsets are character offsets into SENTENCE.text; each step links back to its phrase.
  const SENTENCE = {
    text: '剪掉开头3秒，删掉长停顿，声音大一点，结尾淡出2秒',
    steps: [
      { id: 's1', phrase: [0, 6], title: '剪掉开头 3 秒', kind: 'cut', region: [0, 3], detail: '0:00–0:03 · 这里只有环境声' },
      { id: 's2', phrase: [7, 12], title: '删掉 9 处长停顿', kind: 'pauses', regions: PAUSES.map(([s, d]) => [s, s + d]), detail: '每处保留 0.3 秒 · 共省下 14 秒' },
      { id: 's3', phrase: [13, 18], title: '整体大 3 dB', kind: 'gain', region: 'all', detail: '响度 -19 → -16 LUFS · 不会爆音' },
      { id: 's4', phrase: [19, 25], title: '结尾淡出 2 秒', kind: 'fade', region: 'end2', detail: '最后 2 秒 · 正弦曲线' },
    ],
    result: { before: 1120, after: 1103 },
    examples: ['剪掉开头3秒', '把副歌做成铃声', '降噪之后统一音量', '只留 1:20 到 2:45', '每段之间加 1 秒空白', '变成大叔的声音', '配一首轻快的背景音乐', '做成 60 秒循环', '分成 3 段，每段一个文件', '发给朋友'],
    question: { text: '剪掉开头', ask: '剪掉开头多少秒？', options: ['3 秒', '5 秒', '10 秒', '到第一句话'] },
    aiRewrite: { said: '前面那段咳嗽不要了，然后整体听着太闷', rewritten: '剪掉开头3秒，提高高频', added: ['3 秒'], note: '「闷」理解为高频不足；「3 秒」是 AI 估计的，你没说过' },
    recipes: ['播客收尾：降噪，删掉长停顿，统一音量', '铃声：把副歌做成铃声', '会议整理：删掉长停顿，1.25 倍速'],
  };

  // ---------- tools ----------
  const TOOLS = [
    { id: 'denoise', name: '降噪', desc: '压低空调、风扇这类持续底噪', group: '让声音更好', result: 'version' },
    { id: 'pauses', name: '删掉停顿', desc: '找到长停顿，逐个试听，一键删', group: '让声音更好', result: 'version' },
    { id: 'loudness', name: '统一音量', desc: '按语音 / 音乐 / 广播标准调到合适响度', group: '让声音更好', result: 'version' },
    { id: 'repair', name: '修复', desc: '电流声、低频轰隆、咔哒、爆音、齿音、噪声门', group: '让声音更好', result: 'version' },
    { id: 'speed', name: '变速变调', desc: '0.5–2 倍，可保持音高；单独升降调', group: '改变声音', result: 'version' },
    { id: 'voice', name: '变声', desc: '大叔、萝莉、机器人、电话音……', group: '改变声音', result: 'version' },
    { id: 'effects', name: '效果', desc: '均衡、压缩、限制、混响、回声，可排序存预设', group: '改变声音', result: 'version' },
    { id: 'channels', name: '声道', desc: '单声道 / 立体声、宽度、左右平衡与交换', group: '改变声音', result: 'version' },
    { id: 'reverse', name: '倒放', desc: '从最后一秒倒着放到第一秒', group: '改变声音', result: 'version' },
    { id: 'separate', name: '人声分离', desc: '拆成人声和伴奏两个版本', group: '拆与合', result: 'two versions' },
    { id: 'chorus', name: '找副歌', desc: '找出重复最强的段落，可裁成 20 / 30 秒铃声', group: '拆与合', result: 'version' },
    { id: 'bgm', name: '配背景音乐', desc: '人声 + 音乐，说话时音乐自动让开', group: '拆与合', result: 'new audio' },
    { id: 'multitrack', name: '多轨混音', desc: '几段声音叠在一起，各自调音量和位置', group: '拆与合', result: 'new audio' },
    { id: 'medley', name: '串烧', desc: '几首歌按顺序接起来，接缝自动过渡', group: '拆与合', result: 'new audio' },
    { id: 'loop', name: '一分钟循环', desc: '把音乐做成 60 秒可循环的背景', group: '拆与合', result: 'new audio' },
    { id: 'stt', name: '音频转文字', desc: '整段转成文字稿（服务即将开放）', group: '文字', result: 'text', unavailable: true },
  ];
  const EDITS = [ // timeline edits in the editor: change the current version, one undo history
    '选区（拖选 / 精确时间）', '剪掉 / 只留选区', '分割', '片段顺序（拖动重排）', '复制 / 剪切 / 粘贴', '重复一段',
    '音量（选区 / 片段 / 整体）', '淡入淡出（正弦 / 线性 / 对数）', '交叉淡化', '音量曲线（画点）', '标记（加、列表、按标记分割）',
    '插入静音', '插入音频 / 插入录音', '对齐节拍', '撤销 / 重做（50 步）', '倍速试听 0.5–2×', '原声对比（A/B）', '频谱视图', '缩放',
  ];

  // ---------- voices ----------
  const VOICES = {
    system: [ // the phone's own TTS engine, offline
      { id: 'sys-f', name: '系统 · 中文女声', tag: '离线', quality: '音质高' },
      { id: 'sys-m', name: '系统 · 中文男声', tag: '离线', quality: '音质普通' },
      { id: 'sys-en', name: '系统 · English', tag: '离线', quality: '音质高' },
    ],
    online: [ // realistic online voices (membership)
      { id: 'linxi', name: '林溪', desc: '温柔知性 · 女', use: '旁白、知识分享', sample: '欢迎来到今天的节目，我们慢慢聊。', vip: true },
      { id: 'laozhou', name: '老周', desc: '沉稳醇厚 · 男', use: '纪录片、品牌', sample: '这座城市的清晨，总是从一碗热汤开始。', vip: true },
      { id: 'anian', name: '阿念', desc: '清亮少年 · 男', use: '游戏、动漫', sample: '准备好了吗？出发！', vip: true },
      { id: 'xiaoman', name: '小满', desc: '活泼童声 · 女', use: '儿童故事', sample: '小兔子把胡萝卜藏在了哪里呢？', vip: true },
      { id: 'zhengsheng', name: '正声', desc: '新闻播音 · 男', use: '通知、播报', sample: '各位旅客请注意，列车即将进站。', vip: true },
      { id: 'tangtang', name: '糖糖', desc: '甜美带货 · 女', use: '直播、带货', sample: '今天这款真的闭眼入！', vip: true },
    ],
    mine: [{ id: 'me', name: '我的声音', desc: '克隆于 11月20日', sample: '用你自己的声音读任何文字。' }],
    clonePassage: '今天天气不错，我想把这段话读得清楚一点。',
    cloneChecks: ['时长 5.2 秒（需 3–6 秒）', '没有爆音', '音量合适', '采样率 48 kHz'],
    ttsText: '这款保温杯用的是双层真空结构，早上倒进去的热水，到下午还是烫的。',
  };

  // ---------- online music library ----------
  const MUSIC = {
    categories: ['精选', '轻快', '温暖', '电子', '国风', '悬疑', '节日喜庆', '片头片尾', '自然环境声'],
    tracks: [
      { id: 'm1', title: '晴天的小跑步', cat: '轻快', seconds: 128, bpm: 120, vip: false, licence: 'CC BY 4.0', commercial: true, credit: '音乐：晴天的小跑步 / 声剪音乐库' },
      { id: 'm2', title: '午后的拿铁', cat: '温暖', seconds: 154, bpm: 86, vip: false, licence: '声剪音乐库授权', commercial: true, credit: null },
      { id: 'm3', title: '霓虹慢车', cat: '电子', seconds: 176, bpm: 100, vip: true, licence: '声剪音乐库授权', commercial: true, credit: null },
      { id: 'm4', title: '竹林听雨', cat: '国风', seconds: 203, bpm: 72, vip: true, licence: '声剪音乐库授权', commercial: true, credit: null },
      { id: 'm5', title: '门后的脚步声', cat: '悬疑', seconds: 95, bpm: 64, vip: false, licence: 'CC BY-NC 4.0', commercial: false, credit: '音乐：门后的脚步声 / 声剪音乐库' },
      { id: 'm6', title: '红灯笼', cat: '节日喜庆', seconds: 140, bpm: 128, vip: true, licence: '声剪音乐库授权', commercial: true, credit: null },
      { id: 'm7', title: '开场 5 秒', cat: '片头片尾', seconds: 6, bpm: 110, vip: false, licence: 'CC0', commercial: true, credit: null },
      { id: 'm8', title: '山间溪流', cat: '自然环境声', seconds: 300, bpm: null, vip: false, licence: 'CC0', commercial: true, credit: null },
    ],
  };

  // ---------- export ----------
  const EXPORT = {
    purposes: [
      { id: 'file', name: '存成文件', detail: '选格式和位置' },
      { id: 'sound', name: '设成铃声', detail: '来电 / 通知 / 闹钟 · 最后一秒自动淡出', subs: ['来电铃声', '通知音', '闹钟'] },
      { id: 'share', name: '发给别人', detail: '微信、QQ、邮件……用系统分享' },
    ],
    formats: [
      { id: 'mp3', name: 'MP3', note: '哪里都能放' }, { id: 'm4a', name: 'M4A', note: '同音质更小' },
      { id: 'wav', name: 'WAV', note: '无损 · 16/24 位 · 32 位浮点' }, { id: 'flac', name: 'FLAC', note: '无损压缩 · 16/24 位' },
      { id: 'opus', name: 'Opus', note: '语音很省空间' }, { id: 'amr', name: 'AMR', note: '老手机铃声' },
    ],
    quality: ['较小', '标准', '高', '最高'], rates: ['44.1 kHz', '48 kHz'], channels: ['单声道', '立体声'],
    meta: ['标题', '作者', '专辑', '年份', '备注', '封面'],
    clipWarn: '有 3 处会爆音，已自动开启限幅',
    perSegment: '每段一个文件（共 4 段）',
  };

  // ---------- batch ----------
  const BATCH = {
    templates: [
      { id: 'convert', name: '转换格式', desc: '一批文件统一转成 MP3 / M4A …' },
      { id: 'clean', name: '语音清理', desc: '降噪 + 删停顿 + 统一音量' },
      { id: 'podcast', name: '播客', desc: '响度 -16 LUFS，加片头片尾' },
      { id: 'ringtone', name: '铃声', desc: '每首截副歌 30 秒，结尾淡出' },
      { id: 'segments', name: '按片段', desc: '按时间或标记切成多个文件' },
      { id: 'sentence', name: '一句话', desc: '对每个文件执行同一句话' },
    ],
    run: { total: 24, done: 17, failed: 1, current: '第 18 个 · 访谈素材 18.m4a · 编码中' },
  };

  // ---------- membership (proposal; prices are examples, real prices come from Google Play) ----------
  const MEMBERSHIP = {
    free: ['所有剪辑与处理工具（本机运行）', '录音、导入、视频提取', '系统音色朗读', '一句话（本机理解）', '所有格式导出，没有水印'],
    pro: ['在线真人感音色 · 每月 20 万字', '克隆你自己的声音', '音乐库全部 VIP 曲目', 'AI 帮你听懂口语化的一句话', '批量处理不限数量', '字幕配音用在线音色'],
    plans: [
      { id: 'year', name: '年度会员', price: '¥98 / 年', note: '约 ¥8.2 / 月 · 7 天免费试用', best: true },
      { id: 'month', name: '连续包月', price: '¥15 / 月', note: '随时取消' },
      { id: 'week', name: '周卡', price: '¥6 / 周', note: '赶一次活儿' },
    ],
    priceNote: '示例价格，实际以 Google Play 为准',
    signIn: ['Google 账号', '邮箱验证码'],
    privacy: '登录只用于身份和会员，不会上传你的音频',
  };

  // ---------- settings ----------
  const SETTINGS = ['外观：浅色 / 深色 / 跟随系统', '语言：跟随系统 / English / 简体中文', '提醒没保存的导出', 'AI 帮忙理解一句话（开关）', '你的数据在哪里、卸载时会怎样', '使用指南', '常见问题', '联系支持', '第三方许可'];

  // ---------- full feature inventory (the coverage map must place every item) ----------
  const FEATURES = [
    { id: 'A', group: '把声音弄进来', items: [
      ['A1', '录音：暂停 / 继续、接着上次录、录一段插进当前音频'], ['A2', '录音设置：麦克风（内置 / 有线 / USB / 蓝牙）、单 / 立体声、输入增益 -12～+24 dB、耳机监听'],
      ['A3', '录音列表（上次中断的可继续）'], ['A4', '手机里的文件（多选即拼接，最多 20 个）'], ['A5', '视频里的声音'], ['A6', '从别的 App 分享进来（单个 / 多个拼接）'],
      ['A7', '文字读出来：系统音色（离线）/ 在线真人感音色、语速、试听'], ['A8', '字幕配音：导入 SRT / VTT / 纯文本，逐句合成并对齐时间'],
      ['A9', '克隆我的声音：照着读 5 秒、本机检查、同意后保存；改名 / 听参考 / 删除 / 重新克隆'], ['A10', '在线音乐库：分类、试听、VIP、授权说明、导入或用作背景音乐、自动记署名'],
      ['A11', '一段空白（0.05–600 秒）'], ['A12', '示例音频'], ['A13', '导入工程包（换手机）'] ] },
    { id: 'B', group: '剪（工作台）', items: EDITS.map((e, i) => ['B' + (i + 1), e]) },
    { id: 'C', group: '一句话', items: [
      ['C1', '打字或说话（本机识别），中英文'], ['C2', '解析成步骤，在波形上标出每一步改哪里'], ['C3', '逐步改数值 / 删掉某一步'],
      ['C4', '读不懂时追问 + 一键改写建议'], ['C5', 'AI 帮忙理解口语（需同意一次）：列出你没说过的数字，可退回原话'],
      ['C6', '整条计划一次撤销'], ['C7', '最近说过的话 / 我的配方'], ['C8', '对多个音频说一句（批量）'], ['C9', '说出用途（做成铃声、发给朋友）→ 导出预选'], ['C10', '一句话里多个工具连成工具链，可跳过某步'] ] },
    { id: 'D', group: '声音处理（生成新版本）', items: TOOLS.map((t, i) => ['D' + (i + 1), t.name + '：' + t.desc]) },
    { id: 'E', group: '版本', items: [['E1', '每次处理生成新版本，原版保留'], ['E2', '版本列表：试听、切换、删除'], ['E3', '处理前后试听对比'], ['E4', '配乐 / 混音可回头再调']] },
    { id: 'F', group: '批量处理', items: [['F1', '模板：转换 / 语音清理 / 播客 / 铃声 / 按片段 / 一句话'], ['F2', '选文件、输出文件夹'], ['F3', '进度、暂停、后台继续'], ['F4', '结果报告（含是否爆音）']] },
    { id: 'G', group: '导出与分享', items: [
      ['G1', '先选用途：存成文件 / 设成铃声（来电、通知、闹钟）/ 发给别人'], ['G2', '格式 MP3 / M4A / WAV / FLAC / Opus / AMR，音质、位深、采样率、声道'],
      ['G3', '标题、作者、专辑、年份、备注、封面'], ['G4', '导出预设'], ['G5', '爆音预测 + 自动限幅'], ['G6', '每段一个文件'],
      ['G7', '后台导出、完成后选位置保存、待保存提醒'], ['G8', '铃声最后一秒自动淡出'] ] },
    { id: 'H', group: '音频库', items: [
      ['H1', '列表、搜索、筛选（录音 / 导入 / 混音 / 多版本 / 待保存）'], ['H2', '多选后批量（说一句 / 用工具 / 导出）'],
      ['H3', '改名、导出、版本、占用空间、导出工程包、删除'], ['H4', '正在导出 / 待保存 / 用备份恢复 等状态'] ] },
    { id: 'I', group: '账号与会员', items: [['I1', '登录：Google 账号、邮箱验证码'], ['I2', '会员方案、免费试用、恢复购买'], ['I3', '权益说明（免费 vs 会员）'], ['I4', '登录不上传音频']] },
    { id: 'J', group: '设置与帮助', items: SETTINGS.map((s, i) => ['J' + (i + 1), s]) },
    { id: 'K', group: '后台与系统', items: [['K1', '播放通知与锁屏控制，耳机拔出暂停'], ['K2', '导出 / 批量的通知栏进度']] },
  ];

  const fmt = s => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };

  window.SJ = { rng, speechEnvelope, musicEnvelope, PAUSES, SECTIONS, LIBRARY, SENTENCE, TOOLS, EDITS, VOICES, MUSIC, EXPORT, BATCH, MEMBERSHIP, SETTINGS, FEATURES, fmt,
    CHORUS: [{ from: 125.0, to: 155.4, score: '高' }, { from: 182.0, to: 214.6, score: '高' }, { from: 61.8, to: 92.6, score: '中' }] };
})();
