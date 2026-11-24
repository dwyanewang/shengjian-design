# v9 -> v10 comparison images for the page (half size).
from PIL import Image
import os
W = '/tmp/claude-1000/-home-game168-wangwei-Projects-shengjian-android/6d5ba96a-b08d-4471-96a3-84a7972a1b4b/scratchpad/mockups-lan/'
OUT = W + 'workbench/v10/ba/'
for f in os.listdir(OUT):
    if f.startswith(('v9-', 'v10-')): os.remove(OUT + f)
def save(src, dst):
    im = Image.open(src).convert('RGB'); im = im.resize((im.size[0] // 2, im.size[1] // 2), Image.LANCZOS); im.save(OUT + dst, optimize=True); print(dst, im.size)
S9, S10 = W + 'workbench-work/v9/shots/', W + 'workbench-work/v10/shots/ba/'
pairs = [('390l-live', 'rest-390l'), ('360d-live', 'rest-360d'), ('360l-t4d', 'denoise-360l'), ('360d-t4d', 'denoise-360d'), ('390l-t8a', 'export-390l'), ('390l-kTts', 'tts-390l'),
         ('360l-t2d', 'move-360l'), ('360l-t6b', 'record-360l'), ('390l-t1b', 'range-390l'), ('360l-kSayFocus', 'typing-360l'), ('360l-kTracks5', 'tracks-360l')]
for src, name in pairs:
    s9 = S9 + src + '.png' if os.path.exists(S9 + src + '.png') else W + 'workbench-work/v10/shots/ba9/' + src + '.png'
    if os.path.exists(s9): save(s9, 'v9-' + name + '.png')
    else: print('no v9', src)
    save(S10 + src + '.png', 'v10-' + name + '.png')
