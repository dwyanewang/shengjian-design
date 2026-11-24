import sys, glob, os
from PIL import Image
src, prefix, out, per = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]) if len(sys.argv) > 4 else 4
files = [f for f in sorted(glob.glob(os.path.join(src, prefix + 's*.png')))]
order = sys.argv[5].split(',') if len(sys.argv) > 5 else None
if order: files = [os.path.join(src, prefix + n + '.png') for n in order]
scale = 0.5
for k in range(0, len(files), per):
    ims = [Image.open(f) for f in files[k:k+per]]
    ims = [im.resize((int(im.width*scale), int(im.height*scale))) for im in ims]
    W = sum(im.width for im in ims) + 10*(len(ims)-1); H = max(im.height for im in ims)
    canvas = Image.new('RGB', (W, H), (128,128,128))
    x = 0
    for im in ims: canvas.paste(im, (x, 0)); x += im.width + 10
    canvas.save(f'{out}-{k//per}.png')
    print(f'{out}-{k//per}.png', [os.path.basename(f) for f in files[k:k+per]])
