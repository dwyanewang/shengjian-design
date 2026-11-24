# Montage of phone shots at half size: python3 mont.py OUT.png a.png b.png ...
import sys
from PIL import Image
out, names = sys.argv[1], sys.argv[2:]
ims = [Image.open(n).convert('RGB') for n in names]
ims = [i.resize((i.size[0] // 2, i.size[1] // 2), Image.LANCZOS) for i in ims]
W = sum(i.size[0] for i in ims) + 10 * (len(ims) - 1); H = max(i.size[1] for i in ims)
o = Image.new('RGB', (W, H), 'white'); x = 0
for i in ims: o.paste(i, (x, 0)); x += i.size[0] + 10
o.save(out)
