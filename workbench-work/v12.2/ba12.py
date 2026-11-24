# v11 -> v12 comparison images for the page (half size), made the way ba11.py made them.
# Shots: node shots.mjs ../../workbench/v11 shots/ba-v11 ...; node shots.mjs ../../workbench/v12 shots/ba-v12 ...
from PIL import Image
import os
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '../../workbench/v12/ba/')
pairs = [('390l-live', 'r12-rest-390l'), ('360d-live', 'r12-rest-360d'), ('390l-t4b', 'r12-plan-390l'), ('390l-t1b', 'r12-range-390l'), ('390l-t6b', 'r12-record-390l'), ('390l-t8a', 'r12-export-390l')]
for src, name in pairs:
    for v in ('v11', 'v12'):
        im = Image.open(os.path.join(HERE, f'shots/ba-{v}/{src}.png')).convert('RGB'); im = im.resize((im.size[0] // 2, im.size[1] // 2), Image.LANCZOS)
        im.save(OUT + f'{v}-{name}.png', optimize=True); print(f'{v}-{name}.png', im.size)
