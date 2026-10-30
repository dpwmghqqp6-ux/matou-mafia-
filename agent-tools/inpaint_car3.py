"""Remove the full car AABB from alley-plate with heavy inpaint."""
import os
from pathlib import Path
import numpy as np
from PIL import Image
import cv2

SRC = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\assets\matou\bg-a\alley.jpg")
FG = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\assets\matou\bg-a\car-fg.webp")
OUT = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\assets\matou\bg-a\alley-plate.jpg")

im = cv2.cvtColor(np.asarray(Image.open(SRC).convert("RGB")), cv2.COLOR_RGB2BGR)
H, W = im.shape[:2]
alpha = np.asarray(Image.open(FG).convert("RGBA").split()[-1])
ys, xs = np.where(alpha > 15)
x0, x1 = max(0, xs.min() - 30), min(W, xs.max() + 5)
y0, y1 = max(0, ys.min() - 30), min(H, ys.max() + 20)
mask = np.zeros((H, W), np.uint8)
mask[y0:y1, x0:x1] = 255
# Soften into a blob so inpaint doesn't leave a box
mask = cv2.GaussianBlur(mask, (0, 0), 12)
mask = (mask > 40).astype(np.uint8) * 255

# Prefer TELEA with large radius on the box
out = cv2.inpaint(im, mask, 22, cv2.INPAINT_TELEA)
# Second pass NS for structure
out = cv2.inpaint(out, mask, 8, cv2.INPAINT_NS)

rgb = cv2.cvtColor(out, cv2.COLOR_BGR2RGB)
Image.fromarray(rgb).save(OUT, quality=90, optimize=True, progressive=True)
box = (int(W * 0.55), int(H * 0.45), W, H)
Image.fromarray(rgb).crop(box).save(os.environ["TEMP"] + "/plate_nocar3.jpg", quality=92)
fg = Image.open(FG).convert("RGBA")
comp = Image.alpha_composite(Image.fromarray(rgb).convert("RGBA"), fg)
comp.convert("RGB").crop(box).save(os.environ["TEMP"] + "/plate_plus_fg3.jpg", quality=92)
print("bbox", x0, y0, x1, y1, "size", OUT.stat().st_size)
