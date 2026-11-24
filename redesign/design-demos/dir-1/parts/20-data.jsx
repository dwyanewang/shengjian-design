/* ---------- demo content this direction adds (consistent with SJ) ---------- */
const PARSE = {};
function defParse(text, parts, extra) {
  let from = 0;
  const steps = parts.map((p, i) => { const a = text.indexOf(p.ph, from); from = a + p.ph.length; return Object.assign({ id: 's' + (i + 1), phrase: [a, a + p.ph.length], color: i + 1 }, p); });
  PARSE[text] = Object.assign({ text, steps }, extra || {});
}
// the main sentence: SJ.SENTENCE, colours 1–4 in the order the user said them
PARSE[SJ.SENTENCE.text] = { text: SJ.SENTENCE.text, main: true, steps: SJ.SENTENCE.steps.map((s, i) => Object.assign({}, s, { color: i + 1 })) };
defParse('剪掉开头3秒', [{ ph: '剪掉开头3秒', title: '剪掉开头 3 秒', kind: 'cut', region: [0, 3], detail: '0:00–0:03，这里只有环境声' }]);
defParse('删掉长停顿', [{ ph: '删掉长停顿', title: '删掉 9 处长停顿', kind: 'pauses', detail: '每处保留 0.3 秒，共省下 14 秒' }]);
defParse('声音大一点', [{ ph: '声音大一点', title: '整体大 3 dB', kind: 'gain', detail: '响度 -19 → -16 LUFS，不会爆音' }]);
defParse('把副歌做成铃声', [
  { ph: '把副歌', title: '找副歌，裁成 30 秒', kind: 'chorus', tool: 'chorus', detail: '最响的一段在 3:02–3:34，裁成 30 秒' },
  { ph: '做成铃声', title: '导出时选好「设成铃声」', kind: 'purpose', purpose: 'sound', detail: '来电铃声，最后一秒自动淡出' }], { target: 'wanfeng' });
defParse('降噪之后统一音量', [
  { ph: '降噪', title: '降噪', kind: 'tool', tool: 'denoise', detail: '第 1 步，存成新版本' },
  { ph: '统一音量', title: '统一音量到 -16 LUFS', kind: 'tool', tool: 'loudness', detail: '第 2 步，接着上一步的版本做' }], { chain: true });
defParse('只留 1:20 到 2:45', [{ ph: '只留 1:20 到 2:45', title: '只留 1:20–2:45', kind: 'keep', region: [80, 165], detail: '留下 1 分 25 秒，其余剪掉' }]);
defParse('每段之间加 1 秒空白', [{ ph: '每段之间加 1 秒空白', title: '片段之间各加 1 秒空白', kind: 'insert', marks: [41.6, 88.3], detail: '现在有 3 段，加在 2 个接缝处' }]);
defParse('变成大叔的声音', [{ ph: '变成大叔的声音', title: '变声：大叔', kind: 'tool', tool: 'voice', detail: '降 4 个半音，低频厚一点' }]);
defParse('配一首轻快的背景音乐', [{ ph: '配一首轻快的背景音乐', title: '配背景音乐：轻快', kind: 'tool', tool: 'bgm', detail: '在音乐库「轻快」里挑，说话时音乐自动让开' }]);
defParse('做成 60 秒循环', [{ ph: '做成 60 秒循环', title: '一分钟循环', kind: 'tool', tool: 'loop', detail: '找一段能首尾接上的 60 秒' }]);
defParse('分成 3 段，每段一个文件', [
  { ph: '分成 3 段', title: '平均分成 3 段', kind: 'split', marks: [43.3, 86.7], detail: '每段 6:07' },
  { ph: '每段一个文件', title: '导出时选好「每段一个文件」', kind: 'purpose', purpose: 'file', detail: '3 个文件，按顺序编号' }]);
defParse('发给朋友', [{ ph: '发给朋友', title: '导出时选好「发给别人」', kind: 'purpose', purpose: 'share', detail: '用系统分享，M4A 同音质更小' }]);
defParse('降噪，删掉长停顿，统一音量', [
  { ph: '降噪', title: '降噪', kind: 'tool', tool: 'denoise', detail: '第 1 步，存成新版本' },
  { ph: '删掉长停顿', title: '删掉 9 处长停顿', kind: 'pauses', detail: '每处保留 0.3 秒' },
  { ph: '统一音量', title: '统一音量到 -16 LUFS', kind: 'tool', tool: 'loudness', detail: '最后一步' }], { chain: true });
defParse('删掉长停顿，1.25 倍速', [
  { ph: '删掉长停顿', title: '删掉长停顿', kind: 'pauses', detail: '每处保留 0.3 秒' },
  { ph: '1.25 倍速', title: '变速 1.25 倍，音高不变', kind: 'tool', tool: 'speed', detail: '存成新版本' }], { chain: true });
defParse(SJ.SENTENCE.question.text, [{ ph: '剪掉开头', title: '剪掉开头', kind: 'ask', region: [0, 2.6] }], { ask: true });
defParse(SJ.SENTENCE.aiRewrite.rewritten, [
  { ph: '剪掉开头3秒', title: '剪掉开头 3 秒', kind: 'cut', region: [0, 3], detail: '0:00–0:03，开头的咳嗽声', guessed: '3 秒' },
  { ph: '提高高频', title: '提高高频 3 dB', kind: 'tool', tool: 'effects', detail: '均衡：4 kHz 以上提高 3 dB，听着不闷' }]);
const EN_SENTENCE = 'Cut the first 3\u00a0s, remove long pauses, a bit louder, fade out 2\u00a0s at the end'; // no break between a number and its unit
defParse(EN_SENTENCE, ['Cut the first 3\u00a0s', 'remove long pauses', 'a bit louder', 'fade out 2\u00a0s at the end'].map((ph, i) => { const { phrase, ...st } = SJ.SENTENCE.steps[i]; return Object.assign(st, { ph }); }), { main: true });
const AI_SAID = SJ.SENTENCE.aiRewrite.said;
const RECIPES = SJ.SENTENCE.recipes.map(r => { const [name, text] = r.split('：'); return { name, text }; });
const RECENT = [SJ.SENTENCE.text, '剪掉开头3秒', '降噪之后统一音量', '发给朋友'];
const SUGGEST = [
  { text: '删掉长停顿', why: '我听到 9 处超过 1 秒的停顿' },
  { text: '剪掉开头3秒', why: '开头 2.6 秒只有环境声' },
  { text: '声音大一点', why: '比常见播客小 3 dB' },
];
const CUES = [
  { a: 1.2, b: 3.8, text: '这款保温杯用的是双层真空结构，', fit: '刚好' },
  { a: 4.0, b: 5.6, text: '早上倒进去的热水，', fit: '加快 1.1 倍' },
  { a: 5.8, b: 7.6, text: '到下午还是烫的。', fit: '刚好' },
  { a: 8.2, b: 10.6, text: '杯盖一按就开，开车也能单手喝。', fit: '往后挪 0.3 秒' },
  { a: 11.0, b: 13.4, text: '五种颜色，今天下单送杯套。', fit: '刚好' },
];
const srt = s => { const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = Math.floor(s % 60), ms = Math.round((s % 1) * 1000); return [h, m, x].map(v => String(v).padStart(2, '0')).join(':') + ',' + String(ms).padStart(3, '0'); };
const RECS = [
  { id: 'r1', title: '新录音 11月23日 09:12', len: 754, note: '上次在 12:34 停下，可以接着录', resume: true },
  { id: 'r2', title: '周三产品例会', len: 2832, note: '昨天 15:00，6 个标记' },
  { id: 'r3', title: '晨读 Unit 5', len: 315, note: '11月12日' },
];
const BATCH_FILES = Array.from({ length: 24 }, (_, i) => '访谈素材 ' + String(i + 1).padStart(2, '0') + '.m4a');
const BATCH_REPORT = BATCH_FILES.slice(0, 18).map((f, i) => ({ f, st: i === 6 ? 'fail' : i === 17 ? 'run' : 'ok', clip: i === 3 || i === 11 ? 2 : 0 }));
const FREE_BATCH = 10; // assumption: free plan runs up to 10 files per batch; members have no limit
const SAMPLES = [{ id: 'sa', title: '示例：一段两个人的访谈', seconds: 130 }, { id: 'sb', title: '示例：钢琴曲片段', seconds: 60 }];
const PHONE_FILES = [
  { n: '婚礼致辞.m4a', s: 214, d: '录音机' }, { n: '老家的雨.mp3', s: 182, d: '下载' }, { n: '会议纪要 1119.wav', s: 1932, d: '录音机' },
  { n: '舞曲 03 恰恰.mp3', s: 238, d: '音乐' }, { n: '舞曲 04 慢四.mp3', s: 251, d: '音乐' }, { n: '课堂 第三讲.aac', s: 2702, d: '微信' },
];
const VIDEOS = [{ n: '毕业典礼.mp4', s: 228 }, { n: '孩子的钢琴课.mp4', s: 412 }, { n: '年会彩排.mov', s: 905 }];
const TRACK_LIB = SJ.LIBRARY;
const libItem = id => SJ.LIBRARY.find(x => x.id === id) || SJ.LIBRARY[0];
const restoredId = 'lesson'; // this project's last save was incomplete; it came back from its backup

Object.assign(window, { EN_SENTENCE, PARSE, AI_SAID, RECIPES, RECENT, SUGGEST, CUES, srt, RECS, BATCH_FILES, BATCH_REPORT, FREE_BATCH, SAMPLES, PHONE_FILES, VIDEOS, libItem, restoredId });
