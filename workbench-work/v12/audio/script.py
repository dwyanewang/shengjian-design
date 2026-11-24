# The words behind every speech waveform in v12 (all spoken by built-in voices of the LAN TTS service).
# Each entry: (id, voice, text, gap_after_seconds). gap_after is the silence before the next line; pauses over 1 s are
# the ones the "删掉超过1秒的停顿" plan finds. The interview runs 2:41 exactly (the tail absorbs the rounding).

HOST = 'Uncle_Fu'     # the interviewer: a mellow older male voice, a little farther from the mic (quieter)
GUEST = 'Serena'      # the bookshop owner: a warm female voice, close to the mic
DUB = 'Vivian'        # subtitle dubbing re-voices the subtitle lines in one voice
CALLER = 'Dylan'      # a phone call from the cafe across the street
ANNOUNCER = 'Vivian'  # the show's intro read

# The interview: 采访录音 (2:41). Gaps: ~0.3-0.6 s inside a turn, 0.6-0.9 s between turns, eight pauses of 1.1-2.4 s.
INTERVIEW = [
    ('h01', HOST, '大家好，欢迎收听本期节目。', 0.55),
    ('h02', HOST, '今天我们聊聊城市里的小店。', 1.9),          # long 1
    ('h03', HOST, '先请出我们的嘉宾。', 0.5),
    ('h04', HOST, '她在老城区开了十年的书店，见证了这条街的变化。', 0.45),
    ('h05', HOST, '欢迎你。', 0.75),
    ('g01', GUEST, '谢谢，很高兴来聊这个话题。', 1.5),         # long 2
    ('h06', HOST, '十年前，为什么会选在这条街上开店？', 0.8),
    ('g02', GUEST, '其实是碰巧。那时候房租便宜，门口还有一棵很大的梧桐树。', 0.4),
    ('g03', GUEST, '我第一眼看到就觉得，书店就应该开在这样的地方。', 0.85),
    ('h07', HOST, '刚开始的时候，生意怎么样？', 0.7),
    ('g04', GUEST, '说实话，头两年很难。', 2.2),                # long 3 (thinking)
    ('g05', GUEST, '一天可能只有几个客人，有时候一整天都没有人进来。', 0.45),
    ('g06', GUEST, '我就坐在窗边看书，看着外面的人走过去。', 1.5),   # long 4
    ('h08', HOST, '那是什么让你坚持下来的？', 0.75),
    ('g07', GUEST, '是街坊吧。', 0.5),
    ('g08', GUEST, '楼上的阿姨每天下午都来坐一会儿，后来她把孙子也带来了。', 0.4),
    ('g09', GUEST, '慢慢地，大家把这里当成了一个可以歇脚的地方。', 1.45),  # long 5
    ('h09', HOST, '这些年，街上的变化大吗？', 0.7),
    ('g10', GUEST, '很大。对面的裁缝铺关了，修鞋的师傅也退休了。', 0.45),
    ('g11', GUEST, '新开了两家咖啡馆，周末会有很多年轻人来拍照。', 0.8),
    ('h10', HOST, '你怎么看这些变化？', 1.8),                   # long 6 (thinking)
    ('g12', GUEST, '我不太担心。', 0.5),
    ('g13', GUEST, '街道总是在变的，小店也要跟着变。', 0.4),
    ('g14', GUEST, '我们现在每个月办一次读书会，也开始卖一些本地做的明信片。', 1.4),  # long 7
    ('h14', HOST, '读书会一般都聊些什么？', 0.7),
    ('g17', GUEST, '什么都聊。有时候是一本新书，有时候是这条街以前的样子。', 0.45),
    ('g18', GUEST, '上个月，一位老先生带来了五十年前的照片，大家看了很久。', 0.85),
    ('h15', HOST, '听起来，书店已经不只是卖书的地方了。', 0.6),
    ('g19', GUEST, '对。我觉得它更像是街上的一个客厅。', 0.4),
    ('g20', GUEST, '谁都可以进来坐坐，不买书也没关系。', 0.9),
    ('h11', HOST, '最后一个问题。如果有人也想开一家小店，你会给他什么建议？', 0.9),
    ('g15', GUEST, '先想清楚，你想让什么样的人走进来。', 0.55),
    ('g16', GUEST, '然后，耐心一点。', 1.6),                    # long 8
    ('h12', HOST, '谢谢你今天的分享。', 0.45),
    ('h13', HOST, '我们下期再见。', 0.35),
    ('g21', GUEST, '再见！', 0.0),
]
INTERVIEW_LEN = 161.0
INTERVIEW_LEAD = 0.65

# 补录：结尾一段 (0:22), 片头口播 (0:16), 电话录音 (0:19)
CLIP_A = [
    ('a1', HOST, '补录一段结尾。', 0.9),
    ('a2', HOST, '感谢大家收听本期节目。', 0.5),
    ('a3', HOST, '如果你也有一家喜欢的小店，欢迎在评论里告诉我们。', 0.6),
    ('a4', HOST, '我们下期再见。', 0.0),
]
CLIP_B = [
    ('b1', ANNOUNCER, '这里是城市漫步，一档关于街道和人的节目。', 0.6),
    ('b2', ANNOUNCER, '每周一期，带你走进一家小店，听听店主的故事。', 0.0),
]
CLIP_C = [
    ('c1', CALLER, '喂，你好，我是对面咖啡馆的。', 0.7),
    ('c2', CALLER, '那家书店我知道，我们经常一起办活动。', 0.5),
    ('c3', CALLER, '老板人特别好，周末的读书会我也去过几次。', 0.0),
]
CLIP_LEN = {'clipA': None, 'clipB': None, 'clipC': None}   # None: as long as the words, plus 0.7 s

# 朗读 (the text-to-speech tool's default text)
TTS = [('t1', 'Vivian', '欢迎收听本期节目。', 0.0)]

# A take recorded on the phone: new recordings in the prototype are windows of this (the host adding a line)
REC = [
    ('r1', HOST, '这里补充一句。', 0.5),
    ('r2', HOST, '书店每个周六下午三点都有读书会，欢迎大家去坐坐。', 0.7),
    ('r3', HOST, '地址我们会放在节目介绍里。', 0.6),
    ('r4', HOST, '好，我们接着聊。', 0.0),
]
