# v10 -> v11 comparison images for the page (half size).
from PIL import Image
import os
W = '/tmp/claude-1000/-home-game168-wangwei-Projects-shengjian-android/6d5ba96a-b08d-4471-96a3-84a7972a1b4b/scratchpad/mockups-lan/'
OUT = W + 'workbench/v11/ba/'
pairs = [('390l-live', 'r11-rest-390l'), ('360d-live', 'r11-rest-360d'), ('360l-t4d', 'r11-denoise-360l'), ('360l-kTracks8', 'r11-tracks8-360l'), ('390l-kFade', 'r11-fade-390l')]
for src, name in pairs:
    for v in ('v10', 'v11'):
        im = Image.open(W + f'workbench-work/v11/shots/ba-{v}/{src}.png').convert('RGB'); im = im.resize((im.size[0] // 2, im.size[1] // 2), Image.LANCZOS)
        im.save(OUT + f'{v}-{name}.png', optimize=True); print(f'{v}-{name}.png', im.size)
