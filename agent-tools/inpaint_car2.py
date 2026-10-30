"""Better car removal from alley plate using FG alpha + patch fill + inpaint."""
import os
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter
import cv2

SRC = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\assets\matou\bg-a\alley.jpg")
FG = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\assets\matou\bg-a\car-fg.webp")
OUT = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\assets\matou\bg-a\alley-plate.jpg")

im = np.asarray(Image.open(SRC).convert("RGB")).copy()
H, W = im.shape[:2]
alpha = np.asarray(Image.open(FG).convert("RGBA").split()[-1])
# Dilate alpha to cover chrome rim / shadow
mask = (alpha > 20).astype(np.uint8) * 255
mask = cv2.dilate(mask, np.ones((15, 15), np.uint8), iterations=2)
mask = cv2.GaussianBlur(mask, (0, 0), 3)
mask = (mask > 40).astype(np.uint8) * 255

# First pass: horizontal patch from left street
filled = im.copy()
ys, xs = np.where(mask > 0)
if len(xs):
    x_min = int(xs.min())
    band = max(40, (xs.max() - x_min) // 3)
    src_x0 = max(0, x_min - band - 80)
    src_x1 = x_min - 20
    if src_x1 > src_x0 + 10:
        patch = im[:, src_x0:src_x1]
        pw = patch.shape[1]
        for x in range(x_min, W):
            col = mask[:, x] > 0
            if not col.any():
                continue
            src_col = patch[:, (x - x_min) % pw]
            filled[col, x] = src_col[col]

# Blend original outside mask
m = (mask.astype(np.float32) / 255.0)[..., None]
base = (im * (1 - m) + filled * m).astype(np.uint8)

# Second pass: OpenCV inpaint on soft edge ring only
ring = cv2.dilate(mask, np.ones((21, 21), np.uint8)) - cv2.erode(mask, np.ones((11, 11), np.uint8))
ring = cv2.GaussianBlur(ring, (0, 0), 2)
ring_bin = (ring > 30).astype(np.uint8) * 255
out = cv2.inpaint(base, ring_bin, 6, cv2.INPAINT_TELEA)
# Also inpaint any remaining strong mask core lightly
out = cv2.inpaint(out, mask, 3, cv2.INPAINT_NS)

Image.fromarray(out).save(OUT, quality=90, optimize=True, progressive=True)
box = (int(W * 0.55), int(H * 0.45), W, H)
Image.fromarray(out).crop(box).save(os.environ["TEMP"] + "/plate_nocar2.jpg", quality=92)
# Composite FG over plate to verify single car
fg = Image.open(FG).convert("RGBA")
comp = Image.fromarray(out).convert("RGBA")
comp = Image.alpha_composite(comp, fg)
comp.convert("RGB").crop(box).save(os.environ["TEMP"] + "/plate_plus_fg.jpg", quality=92)
print("ok", OUT.stat().st_size)
