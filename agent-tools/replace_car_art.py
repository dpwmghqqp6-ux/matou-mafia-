"""Replace ghosted car in alley.jpg with a clean generated car."""
import os
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

ROOT = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger")
ALLEY = ROOT / "preview/assets/matou/bg-a/alley.jpg"
BACKUP = ROOT / "preview/assets/matou/bg-a/alley-with-ghost-car.jpg"
CLEAN = Path(r"C:\Users\Mathis\.cursor\projects\c-Users-Mathis-Downloads-DuskFox-leger/assets/clean_car_plate.jpg")

if not BACKUP.exists():
    BACKUP.write_bytes(ALLEY.read_bytes())

alley = Image.open(BACKUP).convert("RGBA")
W, H = alley.size
clean = Image.open(CLEAN).convert("RGB")

# Target placement matching original car framing (right side)
tx0, ty0, tx1, ty1 = int(W * 0.74), int(H * 0.48), W, int(H * 0.97)
tw, th = tx1 - tx0, ty1 - ty0

# Soft-erase old car with content from further left
arr = np.asarray(alley.convert("RGB")).astype(np.float32)
mask = np.zeros((H, W), np.float32)
# polygon covering old car
poly = [
    (int(W * 0.76), int(H * 0.78)), (int(W * 0.78), int(H * 0.62)),
    (int(W * 0.82), int(H * 0.52)), (int(W * 0.90), int(H * 0.48)),
    (W, int(H * 0.47)), (W, int(H * 0.98)),
    (int(W * 0.86), int(H * 0.96)), (int(W * 0.80), int(H * 0.92)),
]
mimg = Image.new("L", (W, H), 0)
ImageDraw.Draw(mimg).polygon(poly, fill=255)
mimg = mimg.filter(ImageFilter.GaussianBlur(10))
mask = np.asarray(mimg).astype(np.float32) / 255.0
srcx0 = int(W * 0.55)
srcx1 = int(W * 0.72)
patch = arr[:, srcx0:srcx1]
pw = patch.shape[1]
filled = arr.copy()
for x in range(int(W * 0.74), W):
    col = mask[:, x]
    if col.max() < 0.01:
        continue
    src = patch[:, (x - int(W * 0.74)) % pw]
    filled[:, x] = arr[:, x] * (1 - col[:, None]) + src * col[:, None]
base = Image.fromarray(filled.astype(np.uint8)).convert("RGBA")

# Cut car from clean plate: dark alley bg → keep car by luminance/edge heuristic
c = clean.resize((tw, th), Image.LANCZOS)
ca = np.asarray(c).astype(np.float32)
# Background of gen image is dark street - keep pixels that are "car-like" (not sky-dark top-left void)
# Use a soft rectangular feathered opacity focused on lower-right car body
alpha = Image.new("L", (tw, th), 0)
ad = ImageDraw.Draw(alpha)
# Main car body oval-ish
ad.ellipse([int(tw * 0.02), int(th * 0.08), int(tw * 0.98), int(th * 0.98)], fill=255)
alpha = alpha.filter(ImageFilter.GaussianBlur(8))
# Darken very dark empty corners
lum = ca.mean(axis=2)
aa = np.asarray(alpha).astype(np.float32)
aa[lum < 18] *= 0.15
aa = np.clip(aa, 0, 255).astype(np.uint8)
car = Image.new("RGBA", (tw, th))
car.paste(c, (0, 0))
car.putalpha(Image.fromarray(aa))

# Color grade toward alley teal
car_rgb = np.asarray(car).astype(np.float32)
car_rgb[..., 0] *= 0.85
car_rgb[..., 1] *= 0.95
car_rgb[..., 2] *= 1.05
car_rgb = np.clip(car_rgb, 0, 255).astype(np.uint8)
car = Image.fromarray(car_rgb, "RGBA")
car = ImageEnhance.Brightness(car).enhance(0.92)
car = ImageEnhance.Color(car).enhance(0.9)

out = base.copy()
out.alpha_composite(car, (tx0, ty0))
out.convert("RGB").save(ALLEY, quality=90, optimize=True, progressive=True)
out.convert("RGB").crop((tx0, ty0, tx1, ty1)).save(os.environ["TEMP"] + "/new_car_zone.jpg", quality=92)
print("alley updated", ALLEY.stat().st_size)
