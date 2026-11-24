"""Synthesizes every line in script.py on the LAN TTS service (built-in voices only; never creates or deletes voices).

Two requests at a time, a 120 s timeout each; a 500, 503, timeout or refused connection moves the request to the next
instance. Lines already in wav/ are kept, so the script can be rerun. Usage: TTS_HOSTS=http://host:port[,http://host:port...] python3 gen.py
"""
import json
import os
import sys
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import script as S  # noqa: E402

HOSTS = [h.strip() for h in os.environ.get('TTS_HOSTS', '').split(',') if h.strip()]
if not HOSTS:
    sys.exit('Set TTS_HOSTS to the TTS service instances, comma-separated.')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'wav')
os.makedirs(OUT, exist_ok=True)
lock = threading.Lock()
turn = [0]


def jobs():
    out = []
    for group in (S.INTERVIEW, S.CLIP_A, S.CLIP_B, S.CLIP_C, S.TTS, S.REC):
        for (i, voice, text, _gap) in group:
            out.append((i, voice, text))
    # subtitle dubbing: the interview's lines again, in one voice
    for (i, _voice, text, _gap) in S.INTERVIEW:
        out.append(('d' + i, S.DUB, text))
    return out


def synth(job):
    i, voice, text = job
    path = os.path.join(OUT, i + '.wav')
    if os.path.exists(path) and os.path.getsize(path) > 2000:
        return i, 'cached'
    with lock:
        start = turn[0]
        turn[0] += 1
    body = json.dumps({'text': text, 'voice_id': voice, 'speed': 1.0}).encode('utf-8')
    last = None
    for k in range(len(HOSTS) * 2):
        host = HOSTS[(start + k) % len(HOSTS)]
        req = urllib.request.Request(host + '/api/tts', data=body, headers={'Content-Type': 'application/json'}, method='POST')
        t0 = time.time()
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                data = r.read()
            if data[:4] != b'RIFF':
                last = 'not a wav from ' + host
                continue
            with open(path + '.part', 'wb') as f:
                f.write(data)
            os.replace(path + '.part', path)
            return i, '%s %.1fs %s' % (voice, time.time() - t0, host[-4:])
        except urllib.error.HTTPError as e:
            last = '%s %s' % (host, e.code)
            if e.code not in (500, 502, 503, 504):
                break
        except Exception as e:  # timeout, refused
            last = '%s %s' % (host, e)
        time.sleep(1)
    return i, 'FAILED ' + str(last)


if __name__ == '__main__':
    js = jobs()
    print(len(js), 'lines')
    with ThreadPoolExecutor(max_workers=2) as ex:
        for i, msg in ex.map(synth, js):
            print(i, msg, flush=True)
