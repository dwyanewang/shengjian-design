# v12 -> v12.1 comparison images (half size), made the way ba11.py and ba12.py made them.
from PIL import Image
import os
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '../../workbench/v12.1/ba/')
pairs = [('390l-live', 'r121-rest-390l'), ('360d-live', 'r121-rest-360d'), ('390l-kTracks5', 'r121-tracks-390l'), ('390l-kTracks5Sel', 'r121-range-tracks-390l'), ('390l-t6b', 'r121-record-390l'), ('360l-kTracks8', 'r121-tracks8-360l')]
for src, name in pairs:
    for v in ('v12', 'v12.1'):
        im = Image.open(os.path.join(HERE, f'shots/ba-{v}/{src}.png')).convert('RGB'); im = im.resize((im.size[0] // 2, im.size[1] // 2), Image.LANCZOS)
        im.save(OUT + f'{v}-{name}.png', optimize=True); print(f'{v}-{name}.png', im.size)
