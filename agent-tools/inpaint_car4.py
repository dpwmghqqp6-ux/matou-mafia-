"""Inpaint car with mirrored padding so the right border doesn't smear."""
import os
from pathlib import Path
import numpy as np
from PIL import Image
import cv2

SRC = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\assets\matou\bg-a\alley.jpg")
FG = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\assets\matou\bg-a\car-fg.webp")
OUT = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\assets\matou\bg-a\alley-plate.jpg")

rgb = np.asarray(Image.open(SRC).convert("RGB"))
H, W = rgb.shape[:2]
alpha = np.asarray(Image.open(FG).convert("RGBA").split()[-1])
ys, xs = np.where(alpha > 12)
x0, x1 = max(0, int(xs.min()) - 40), W
y0, y1 = max(0, int(ys.min()) - 40), min(H, int(ys.max()) + 30)

pad = 400
canvas = cv2.copyMakeBorder(rgb, 0, 0, 0, pad, cv2.BORDER_REFLECT_101)
mask = np.zeros((H, W + pad), np.uint8)
mask[y0:y1, x0:x1 + pad // 3] = 255
mask = cv2.GaussianBlur(mask, (0, 0), 10)
mask = (mask > 50).astype(np.uint8) * 255

bgr = cv2.cvtColor(canvas, cv2.COLOR_RGB2BGR)
out = cv2.inpaint(bgr, mask, 18, cv2.INPAINT_TELEA)
out = cv2.inpaint(out, mask, 6, cv2.INPAINT_NS)
out = out[:, :W]
out_rgb = cv2.cvtColor(out, cv2.COLOR_BGR2RGB)
Image.fromarray(out_rgb).save(OUT, quality=91, optimize=True, progressive=True)

box = (int(W * 0.55), int(H * 0.45), W, H)
Image.fromarray(out_rgb).crop(box).save(os.environ["TEMP"] + "/plate4.jpg", quality=92)
fg = Image.open(FG).convert("RGBA")
comp = Image.alpha_composite(Image.fromarray(out_rgb).convert("RGBA"), fg)
comp.convert("RGB").crop(box).save(os.environ["TEMP"] + "/plate4_fg.jpg", quality=92)
# Also save just the car zone of plate without FG
Image.fromarray(out_rgb).crop((int(W * 0.78), int(H * 0.55), W, int(H * 0.92))).save(
    os.environ["TEMP"] + "/plate4_carzone.jpg", quality=92
)
print("ok", OUT.stat().st_size)
