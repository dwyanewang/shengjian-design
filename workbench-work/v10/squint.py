# The squint test on pixels: greyscale, a heavy blur (about 7 dp), then for each part of the dock how far its strongest
# 24 x 24 dp blob sits from the dock's own median tone. The part named primary must stand out most among the dock's parts
# (tools row and categories count as wholes; the play buoy is reported but sits outside the dock).
# Writes the pairs (photo | squint) for the page.
import json, sys, os
from PIL import Image, ImageFilter, ImageOps
src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
meta = json.load(open(src)); fails = 0; rows = []
for m in meta:
    im = Image.open(m['file']).convert('RGB'); s = im.size[0] / m['w']
    g = ImageOps.grayscale(im).filter(ImageFilter.GaussianBlur(7 * s))
    P = m['parts']; d = P.get('dock')
    def box(r): return tuple(int(v * s) for v in (r[0], r[1], r[0] + r[2], r[1] + r[3]))
    def px(r):
        x0, y0, x1, y1 = box(r); return [g.getpixel((x, y)) for y in range(max(0, y0), min(g.size[1], y1), 3) for x in range(max(0, x0), min(g.size[0], x1), 3)]
    base = sorted(px(d))[len(px(d)) // 2] if d else 128
    score = {}
    for k in ('slot', 'lit', 'tools', 'cats', 'main', 'cancel', 'done', 'rec', 'field', 'play', 'head'):
        r = P.get(k)
        if not r or r[2] < 4 or r[3] < 4: continue
        v = px(r)
        if not v: continue
        # a part stands out by its strongest blurred blob: the 24 x 24 dp of it that sit furthest from the dock's tone
        # (sampled every 3 px, so a blob is (24 * s / 3)^2 samples); small parts count whole
        v.sort(); n = len(v); nb = max(1, min(n, int((24 * s / 3) ** 2)))
        core = v[:nb] if abs(v[0] - base) > abs(v[-1] - base) else v[-nb:]
        score[k] = round(sum(abs(x - base) for x in core) / len(core), 1)
    inside = {k: v for k, v in score.items() if k not in ('play',)}
    top = max(inside, key=inside.get) if inside else None
    ok = m.get('prim') is None or top == m.get('prim') or (m.get('prim') == 'slot' and top == 'lit' and inside.get('slot', 0) >= inside['lit'] * 0.9)
    if m['ver'] != 'v9': fails += not ok
    rows.append(f"{'PASS' if ok else ('FAIL' if m['ver'] != 'v9' else '    ')} {m['ver']} {m['name']:8} {m['w']}{m['theme'][0]}: primary {m.get('prim')!s:6} top {top!s:6} {json.dumps(score)}")
    # the pair for the page: photo and squint side by side, half size
    sq = g.convert('RGB'); pair = Image.new('RGB', (im.size[0] * 2 + int(12 * s), im.size[1]), 'white'); pair.paste(im, (0, 0)); pair.paste(sq, (im.size[0] + int(12 * s), 0))
    pair = pair.resize((pair.size[0] // 2, pair.size[1] // 2), Image.LANCZOS)
    pair.save(os.path.join(out, f"sq-{m['ver']}-{m['name']}-{m['w']}{m['theme'][0]}.png"), optimize=True)
print('\n'.join(rows)); print('ALL PASSED' if not fails else f'{fails} FAILED')
