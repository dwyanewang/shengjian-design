# v8 -> v9 comparison images and the three studies, for the page.
from PIL import Image
W = '/tmp/claude-1000/-home-game168-wangwei-Projects-shengjian-android/6d5ba96a-b08d-4471-96a3-84a7972a1b4b/scratchpad/mockups-lan/'
OUT = W + 'workbench/v9/ba/'
import os
for f in os.listdir(OUT): os.remove(OUT + f)
def save(src, dst, crop_from=None):
    im = Image.open(src).convert('RGB'); w, h = im.size
    if crop_from is not None: im = im.crop((0, int(h * crop_from), w, h))
    im = im.resize((im.size[0] // 2, im.size[1] // 2), Image.LANCZOS); im.save(OUT + dst, optimize=True); print(dst, im.size)
for v in ('v8', 'v9'):
    S = W + 'workbench-work/' + v + '/shots/'
    save(S + '390l-live.png', v + '-rest-390l.png')
    save(S + '360d-live.png', v + '-rest-360d.png')
    save(S + '360l-t4d.png', v + '-denoise-360l.png')
    save(S + '390l-t8a.png', v + '-export-390l.png')
    save(S + '360l-kTracks5.png', v + '-tracks-360l.png')
S = W + 'workbench-work/v9/shots/'
for s in ('s1', 's2', 's3'):
    for t in ('light', 'dark'):
        save(S + f'study-{s}-{t}-noblur.png', f'study-{s}-{t}.png')
