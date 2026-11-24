"""Assembles the synthesized lines into the prototype's speech sources and writes their envelopes as JS.

For each source: a WAV (24 kHz mono, in out/), and in speech.js two envelopes at 100 frames a second: the peak of the
clean speech and the peak of the room noise under it (each frame one byte: dB = b / 2.5 - 96, 0 = silence). The page
draws the waveform from these and denoise lowers the noise part. Usage: python3 build.py OUT_JS
"""
import array
import base64
import json
import math
import os
import random
import sys
import wave

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import script as S  # noqa: E402

SR = 24000
FPS = 100
HOP = SR // FPS
WAV = os.path.join(HERE, 'wav')
OUT = os.path.join(HERE, 'out')
os.makedirs(OUT, exist_ok=True)


def db(x):
    return 20 * math.log10(x) if x > 1e-9 else -200.0


def read(i):
    w = wave.open(os.path.join(WAV, i + '.wav'))
    assert w.getframerate() == SR and w.getnchannels() == 1 and w.getsampwidth() == 2, i
    a = array.array('h', w.readframes(w.getnframes()))
    return array.array('d', (x / 32768.0 for x in a))


def trim(x, thr_db=-48.0, pre=0.03, post=0.08):
    """Cuts the engine's leading and trailing silence (5 ms frames below thr), keeping a short lead and release."""
    f = SR // 200
    thr = 10 ** (thr_db / 20)
    frames = [max(map(abs, x[k:k + f])) if x[k:k + f] else 0 for k in range(0, len(x), f)]
    on = [k for k, p in enumerate(frames) if p > thr]
    if not on:
        return x
    a = max(0, on[0] * f - int(pre * SR))
    b = min(len(x), (on[-1] + 1) * f + int(post * SR))
    y = x[a:b]
    # 5 ms fades so the cut never clicks
    n = SR // 200
    for k in range(min(n, len(y))):
        y[k] *= k / n
        y[len(y) - 1 - k] *= k / n
    return y


def peak(x):
    return max(map(abs, x)) if len(x) else 0.0


def room(x, taps=((0.021, 0.16), (0.034, 0.11), (0.049, 0.08), (0.067, 0.05), (0.091, 0.03))):
    """A voice a little farther from the mic: a few early reflections of the room under it."""
    n = len(x)
    tail = int(max(t for t, _ in taps) * SR) + 1
    y = array.array('d', x) + array.array('d', bytes(8 * tail))
    for t, g in taps:
        d = int(t * SR)
        for k in range(n):
            y[k + d] += g * x[k]
    return y


def pink(n, rms_db, seed, drift=1.5):
    """Room noise: pink-ish (Kellet's filter), a slow drift of a dB or so, at the given RMS."""
    r = random.Random(seed)
    b0 = b1 = b2 = 0.0
    out = array.array('d', bytes(8 * n))
    ph = r.random() * 6.28
    for k in range(n):
        w = r.gauss(0, 1)
        b0 = 0.99765 * b0 + w * 0.0990460
        b1 = 0.96300 * b1 + w * 0.2965164
        b2 = 0.57000 * b2 + w * 1.0526913
        out[k] = b0 + b1 + b2 + w * 0.1848
    m = math.sqrt(sum(v * v for v in out[:min(n, SR * 4)]) / min(n, SR * 4))
    g = 10 ** (rms_db / 20) / m
    for k in range(n):
        out[k] *= g * 10 ** (drift * math.sin(ph + k / SR * 0.21) / 20)
    return out


def bandlimit(x, lo=300.0, hi=3400.0):
    """A phone line: one-pole high-pass and two one-pole low-passes."""
    ah = 1 / (1 + 2 * math.pi * lo / SR)
    al = 2 * math.pi * hi / SR / (1 + 2 * math.pi * hi / SR)
    y = array.array('d', bytes(8 * len(x)))
    px = py = l1 = l2 = 0.0
    for k, v in enumerate(x):
        hp = ah * (py + v - px)
        px, py = v, hp
        l1 += al * (hp - l1)
        l2 += al * (l1 - l2)
        y[k] = l2
    return y


def assemble(lines, total, lead, speakers, seed, keep_long=True):
    """Places the lines with their gaps; total (s) is exact, the tail takes the rounding. Returns clean, the line spans."""
    clips = []
    for (i, voice, text, gap) in lines:
        x = trim(read(i))
        clips.append((i, voice, text, gap, x))
    speech = sum(len(c[4]) for c in clips) / SR
    gaps = sum(c[3] for c in clips)
    if total is None:
        total = round(lead + speech + gaps + 0.7, 1)
    tail = total - lead - speech - gaps
    print('  speech %.2f s, gaps %.2f s, lead %.2f, tail %.2f (total %.2f)' % (speech, gaps, lead, tail, total))
    if tail > 1.6:
        # spread what is left over the ordinary gaps (each stays under 0.92 s, so the long pauses stay the only ones)
        short = [c for c in clips if 0 < c[3] < 1.0]
        k = 1 + (tail - 1.2) / max(0.01, sum(c[3] for c in short))
        clips = [(i, v, t, (min(0.92, g * k) if (0 < g < 1.0) else g), x) for (i, v, t, g, x) in clips]
        gaps = sum(c[3] for c in clips)
        tail = total - lead - speech - gaps
        print('  ordinary gaps x%.2f (at most 0.92 s) -> tail %.2f' % (k, tail))
    if tail < 0.4:
        # shorten the ordinary gaps (never the long pauses) so the tail is 0.6 s
        short = [c for c in clips if c[3] < 1.0 and c[3] > 0]
        cut = 0.6 - tail
        k = max(0.25, 1 - cut / max(0.01, sum(c[3] for c in short)))
        clips = [(i, v, t, (g * k if (0 < g < 1.0) else g), x) for (i, v, t, g, x) in clips]
        gaps = sum(c[3] for c in clips)
        tail = total - lead - speech - gaps
        print('  ordinary gaps x%.2f -> tail %.2f' % (k, tail))
        assert tail > 0.2, 'too long'
    n = int(round(total * SR))
    clean = array.array('d', bytes(8 * n))
    spans = []
    t = lead
    r = random.Random(seed)
    for (i, voice, text, gap, x) in clips:
        sp = speakers.get(voice, {'peak': -6.0, 'room': False})
        g = 10 ** ((sp['peak'] + r.uniform(-1.2, 1.2)) / 20) / max(1e-6, peak(x))
        y = array.array('d', (v * g for v in x))
        if sp.get('room'):
            y = room(y)
        a = int(round(t * SR))
        for k, v in enumerate(y):
            if a + k < n:
                clean[a + k] += v
        spans.append({'id': i, 'voice': voice, 'text': text, 'a': round(t, 3), 'b': round(t + len(x) / SR, 3)})
        t += len(x) / SR + gap
    return clean, spans


def frames_peak(x, n_frames):
    out = []
    for f in range(n_frames):
        seg = x[f * HOP:(f + 1) * HOP]
        out.append(peak(seg) if len(seg) else 0.0)
    return out


def enc(levels):
    b = bytearray()
    for v in levels:
        b.append(0 if v <= 1e-6 else max(1, min(255, int(round((db(v) + 96) * 2.5)))))
    return base64.b64encode(bytes(b)).decode('ascii')


def write_wav(path, x):
    w = wave.open(path, 'wb')
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(array.array('h', (max(-32767, min(32767, int(v * 32767))) for v in x)).tobytes())
    w.close()


def source(name, clean, noise, extra=None):
    n = len(clean)
    nf = n // HOP
    mix = array.array('d', (clean[k] + (noise[k] if noise else 0) for k in range(n)))
    if max(map(abs, mix)) > 0.99:
        print('  WARNING clipping in', name)
    write_wav(os.path.join(OUT, name + '.wav'), mix)
    write_wav(os.path.join(OUT, name + '-clean.wav'), clean)
    c = frames_peak(clean, nf)
    z = frames_peak(noise, nf) if noise else None
    d = {'n': nf, 'c': enc(c)}
    if z:
        d['z'] = enc(z)
    if extra:
        d.update(extra)
    pk = max(c)
    print('  %s: %d frames (%.2f s), clean peak %.1f dB, noise peak median %s' % (name, nf, nf / FPS, db(pk), '%.1f dB' % db(sorted(z)[len(z) // 2]) if z else '-'))
    return d


def main(out_js):
    speakers = {
        S.HOST: {'peak': -9.5, 'room': True},    # farther from the mic
        S.GUEST: {'peak': -3.2, 'room': False},
        S.CALLER: {'peak': -11.0, 'room': False},
        S.ANNOUNCER: {'peak': -3.0, 'room': False},
        'Vivian': {'peak': -3.0, 'room': False},
    }
    data = {'fps': FPS}
    print('interview')
    clean, spans = assemble(S.INTERVIEW, S.INTERVIEW_LEN, S.INTERVIEW_LEAD, speakers, 11)
    noise = pink(len(clean), -57.0, 3)
    spk = {S.HOST: 0, S.GUEST: 1}
    data['voice'] = source('voice', clean, noise, {'utt': [[int(s['a'] * FPS), int(math.ceil(s['b'] * FPS)), spk[s['voice']]] for s in spans]})
    # silences over 1 s between lines (what the pauses plan should find)
    longs = [(round(spans[k]['b'], 2), round(spans[k + 1]['a'], 2)) for k in range(len(spans) - 1) if spans[k + 1]['a'] - spans[k]['b'] > 1.0]
    print('  gaps over 1 s:', len(longs), longs)
    data['subs'] = [[s['a'], s['text']] for s in spans]
    data['spans'] = [[s['a'], s['b'], s['id']] for s in spans]

    for name, lines in (('clipA', S.CLIP_A), ('clipB', S.CLIP_B), ('clipC', S.CLIP_C)):
        print(name)
        sp = dict(speakers)
        if name == 'clipC':
            sp[S.CALLER] = {'peak': -9.0, 'room': False}
        c, _ = assemble(lines, S.CLIP_LEN[name], 0.5, sp, 21)
        c = c[:len(c) - len(c) % HOP]
        if name == 'clipC':
            c = bandlimit(c)
            g = 10 ** (-8.0 / 20) / max(1e-6, peak(c))
            c = array.array('d', (v * g for v in c))
            nz = pink(len(c), -47.0, 7, drift=2.5)
        else:
            nz = pink(len(c), -60.0 if name == 'clipB' else -55.0, 5 if name == 'clipA' else 6)
        data[name] = source(name, c, nz)

    print('tts')
    x = trim(read('t1'))
    x = array.array('d', (v * 10 ** (-3.0 / 20) / peak(x) for v in x))
    pad = array.array('d', bytes(8 * int(0.15 * SR)))
    x = pad + x + pad
    x = x[:len(x) - len(x) % HOP]
    data['tts'] = source('tts', x, None)

    print('rec (a take on the phone; new recordings are windows of it)')
    c, _ = assemble(S.REC, 0.0 + sum(len(trim(read(i))) / SR + g for (i, _v, _t, g) in S.REC) + 0.9, 0.4,
                    {S.HOST: {'peak': -5.0, 'room': False}}, 31)
    nz = pink(len(c), -52.0, 9)
    data['rec'] = source('rec', c, nz)

    print('dub (the subtitle lines re-voiced, each at its cue; a line that runs over pushes the next one back)')
    n = int(round(S.INTERVIEW_LEN * SR))
    dub = array.array('d', bytes(8 * n))
    t_free = 0.0
    for s in spans:
        x = trim(read('d' + s['id']))
        g = 10 ** (-4.0 / 20) / max(1e-6, peak(x))
        start = max(s['a'], t_free)
        a = int(round(start * SR))
        for k, v in enumerate(x):
            if a + k < n:
                dub[a + k] += v * g
        t_free = start + len(x) / SR + 0.25
    data['dub'] = source('dub', dub, None)

    js = '/* 声剪 v12: the speech under every waveform, measured from real speech (workbench-work/v12/audio, build.py).\n' \
         '   Per source, 100 frames a second: c = peak of the clean speech, z = peak of the room noise; one byte each,\n' \
         '   dB = b / 2.5 - 96 (0 = silence). utt: the lines of the interview [from, to, speaker] in frames. */\n' \
         'window.SPEECH = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n'
    with open(out_js, 'w', encoding='utf-8') as f:
        f.write(js)
    with open(os.path.join(OUT, 'timeline.json'), 'w', encoding='utf-8') as f:
        json.dump({'spans': spans, 'long_gaps': longs}, f, ensure_ascii=False, indent=1)
    print('wrote', out_js, len(js), 'bytes')


if __name__ == '__main__':
    main(sys.argv[1])
