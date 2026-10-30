"""Remove the car from alley plate used by WebGL; car-fg stays as the only car."""
import os
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SRC = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\assets\matou\bg-a\alley.jpg")
OUT = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\assets\matou\bg-a\alley-plate.jpg")
FG = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\assets\matou\bg-a\car-fg.png")

# Same hull as car cut, dilated so no rim remains
HULL = [
    (3020, 1720), (3040, 1580), (3090, 1490), (3150, 1430), (3210, 1390),
    (3280, 1345), (3460, 1300), (3475, 1125), (3515, 1065), (3635, 1035),
    (3840, 1000), (3840, 2143), (3540, 1990), (3280, 1960), (3160, 1960),
    (3090, 1890), (3045, 1800),
]

im = Image.open(SRC).convert("RGB")
W, H = im.size
mask = Image.new("L", (W, H), 0)
ImageDraw.Draw(mask).polygon(HULL, fill=255)
mask = mask.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(2.5))

try:
    import cv2
    arr = np.asarray(im)
    m = np.asarray(mask)
    out = cv2.inpaint(arr, m, 8, cv2.INPAINT_TELEA)
    Image.fromarray(out).save(OUT, quality=88, optimize=True, progressive=True)
    print("cv2 inpaint", OUT, OUT.stat().st_size)
except Exception as e:
    print("cv2 failed", e, "- using smear fill")
    arr = np.asarray(im).astype(np.float32)
    m = np.asarray(mask).astype(np.float32) / 255.0
    # smear from left of car region
    x0 = 2900
    for x in range(x0, W):
        srcx = max(x0 - 40, x0 - ((x - x0) % 80))
        blend = m[:, x:x+1]
        if blend.max() < 0.01:
            continue
        arr[:, x:x+1] = arr[:, x:x+1] * (1 - blend) + arr[:, srcx:srcx+1] * blend
    # vertical soften with blurred original wet ground tones
    Image.fromarray(arr.astype(np.uint8)).save(OUT, quality=88, optimize=True)
    print("smear", OUT)

# Point WebGL at alley-plate.jpg
p = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\bg\bg-a-webgl.js")
s = p.read_text(encoding="utf-8")
s = s.replace('loadImage(BASE + "alley.jpg")', 'loadImage(BASE + "alley-plate.jpg")')
# fallback img too
s = s.replace('img.src = BASE + "alley.jpg";', 'img.src = BASE + "alley-plate.jpg";')
p.write_text(s, encoding="utf-8", newline="\n")

# Rebuild car-fg hard from ORIGINAL alley (with car)
im2 = Image.open(SRC).convert("RGBA")
mask2 = Image.new("L", (W, H), 0)
ImageDraw.Draw(mask2).polygon([
    (3040, 1700), (3058, 1600), (3100, 1515), (3160, 1452), (3212, 1414),
    (3290, 1366), (3468, 1322), (3482, 1142), (3522, 1082), (3640, 1050),
    (3840, 1018), (3840, 2110), (3560, 1962), (3300, 1934), (3188, 1934),
    (3118, 1872), (3078, 1782),
], fill=255)
mask2 = mask2.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.4))
rgba = np.asarray(im2).copy()
rgba[..., 3] = np.asarray(mask2)
# Save as compressed PNG
Image.fromarray(rgba).save(FG, optimize=True, compress_level=9)
# Also try palette? keep RGBA
print("fg", FG.stat().st_size)

# preview
box = (int(W * 0.55), int(H * 0.45), W, H)
Image.open(OUT).crop(box).save(os.environ["TEMP"] + "/plate_nocar.jpg", quality=90)
print("preview ok")
