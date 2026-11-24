import sys, os
from PIL import Image
out, scale, files = sys.argv[1], float(sys.argv[2]), sys.argv[3:]
ims = [Image.open(f) for f in files]
ims = [im.resize((int(im.width*scale), int(im.height*scale)), Image.LANCZOS) for im in ims]
W = sum(i.width for i in ims) + 8*(len(ims)-1); H = max(i.height for i in ims)
c = Image.new('RGB', (W, H), (120,120,120)); x = 0
for i in ims: c.paste(i, (x, 0)); x += i.width + 8
c.save(out)
