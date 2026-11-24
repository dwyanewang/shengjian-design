# Before/after images for the page: v6 next to v7.
from PIL import Image
W = '/tmp/claude-1000/-home-game168-wangwei-Projects-shengjian-android/6d5ba96a-b08d-4471-96a3-84a7972a1b4b/scratchpad/mockups-lan/'
OUT = W + 'workbench/v7/ba/'
def save(src, dst, crop_from=None):
    im = Image.open(src).convert('RGB'); w, h = im.size
    if crop_from is not None: im = im.crop((0, int(h * crop_from), w, h))
    im = im.resize((im.size[0] // 2, im.size[1] // 2), Image.LANCZOS); im.save(OUT + dst, optimize=True); print(dst, im.size)
for v in ('v6', 'v7'):
    S = W + 'workbench-work/' + v + '/shots/'
    save(S + '390l-live.png', v + '-rest-390l.png')
    save(S + '360d-live.png', v + '-rest-360d.png')
    save(S + '360l-t4d.png', v + '-denoise-360l.png')
    save(S + '390l-t8a.png', v + '-export-390l.png')
    save(S + ('360l-kTracks.png' if v == 'v6' else '360l-kTracks5.png'), v + '-tracks-360l.png')
