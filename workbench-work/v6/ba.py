# Before/after images for the page: whole phones for the rest screens, the tray part for the export control.
import sys
from PIL import Image
W = '/tmp/claude-1000/-home-game168-wangwei-Projects-shengjian-android/6d5ba96a-b08d-4471-96a3-84a7972a1b4b/scratchpad/mockups-lan/'
OUT = W + 'workbench/v6/ba/'
def save(src, dst, crop_from=None):
    im = Image.open(src).convert('RGB')
    w, h = im.size
    if crop_from is not None: im = im.crop((0, int(h * crop_from), w, h))
    im = im.resize((im.size[0] // 2, im.size[1] // 2), Image.LANCZOS)
    im.save(OUT + dst, optimize=True)
    print(dst, im.size)
for v in ('v5', 'v6'):
    S = W + 'workbench-work/' + v + '/shots/'
    save(S + '390l-live.png', v + '-rest-390l.png')
    save(S + '360d-live.png', v + '-rest-360d.png')
    save(S + '390l-t8a.png', v + '-export-390l.png', 0.44)
    save(S + '360l-kFsExport.png', v + '-export-360fs.png', 0.33)
