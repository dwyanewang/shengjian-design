# Side-by-side montage of screenshots, halved: python3 mont.py out.png a.png b.png ...
import sys
from PIL import Image
out, files = sys.argv[1], sys.argv[2:]
ims = [Image.open(f).convert('RGB') for f in files]
ims = [i.resize((i.size[0] // 2, i.size[1] // 2), Image.LANCZOS) for i in ims]
W = sum(i.size[0] for i in ims) + 10 * (len(ims) - 1); H = max(i.size[1] for i in ims)
o = Image.new('RGB', (W, H), 'white'); x = 0
for i in ims: o.paste(i, (x, 0)); x += i.size[0] + 10
o.save(out); print(out, o.size)
