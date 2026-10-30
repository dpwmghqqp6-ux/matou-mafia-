"""Cut only the vintage car body from alley.jpg into a full-size foreground PNG (same framing as the plate)."""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SRC = r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\assets\matou\bg-a\alley.jpg"
OUT = r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\assets\matou\bg-a\car-fg.png"

# Car silhouette in source pixels (3840x2143), from front bumper clockwise.
HULL = [
    (3040, 1700), (3058, 1600), (3100, 1515), (3160, 1452), (3212, 1414),
    (3290, 1366), (3468, 1322), (3482, 1142), (3522, 1082), (3640, 1050),
    (3840, 1018), (3840, 2110), (3560, 1962), (3300, 1934), (3188, 1934),
    (3118, 1872), (3078, 1782),
]

im = Image.open(SRC).convert("RGBA")
W, H = im.size
mask = Image.new("L", (W, H), 0)
ImageDraw.Draw(mask).polygon(HULL, fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(2.0))
rgba = np.asarray(im).copy()
rgba[..., 3] = np.asarray(mask)
Image.fromarray(rgba).save(OUT, optimize=True)

ov = im.convert("RGB")
tint = Image.new("RGB", (W, H), (255, 0, 0))
ov.paste(tint, (0, 0), mask.point(lambda v: int(v * 0.5)))
ov.crop((int(W * 0.55), int(H * 0.45), W, H)).save(os.path.join(os.environ["TEMP"], "fg_overlay.jpg"), quality=88)
print("saved", OUT)
