# Separation at the dock's top edge, on pixels: the mean CIE L* of the canvas 4–10 dp above the edge, of the dock's
# surface 3–6 dp below it (inside its top padding, no content there), and of the 1 dp edge line itself.
# Pass: the surface differs from the canvas by at least 3 L*, and the edge line stands out from the surface by at
# least 1.5 L* (a lit edge, lighter in both themes) — a tone step plus a highlight, whether or not blur is on.
import json, sys
from PIL import Image
def L(rgb):
    def f(c):
        c /= 255; return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = rgb; Y = 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    return 116 * Y ** (1 / 3) - 16 if Y > 0.008856 else 903.3 * Y
def mean_row(im, y0, y1, x0, x1):
    px = [im.getpixel((x, y)) for y in range(y0, y1) for x in range(x0, x1, 3)]
    return tuple(sum(p[i] for p in px) / len(px) for i in range(3))
fails = 0
for r in json.load(open('sep.json')):
    im = Image.open(r['file']).convert('RGB'); s = im.size[0] / r['w']
    e = round(r['edge'] * s); x0, x1 = round(r['w'] * 0.3 * s), round(r['w'] * 0.7 * s)
    # the lit edge: the brightest 1-px row near the reported edge (layout rounding can put it a few px off)
    rows = {y: L(mean_row(im, y, y + 1, x0, x1)) for y in range(e - round(6 * s), e + round(8 * s))}
    k = max(rows, key=lambda y: rows[y])
    above = L(mean_row(im, k - round(10 * s), k - round(4 * s), x0, x1))
    surf = L(mean_row(im, k + round(2 * s), k + round(5 * s), x0, x1))
    line = rows[k]
    step, lit = surf - above, line - surf
    ok = abs(step) >= 3 and lit >= 1.5
    fails += not ok
    print(('PASS ' if ok else 'FAIL ') + f"{r['w']} {r['theme']:5} {r['blur']:6} {r['kind']:6}: canvas L* {above:5.1f}, dock {surf:5.1f} (step {step:+.1f}), lit edge +{lit:.1f}")
print('ALL PASSED' if not fails else f'{fails} FAILED')
