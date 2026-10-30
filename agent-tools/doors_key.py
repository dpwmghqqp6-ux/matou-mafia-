import shutil
from pathlib import Path
import numpy as np
from PIL import Image

SRC = Path(r"C:\Users\Mathis\.cursor\projects\c-Users-Mathis-Downloads-DuskFox-leger\assets")
OUT = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\assets\matou\doors")
OUT.mkdir(parents=True, exist_ok=True)

def key_magenta(name_in, name_out, thresh=70):
    im = Image.open(SRC / name_in).convert("RGBA")
    a = np.asarray(im).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # magenta / pink BG
    mag = (r > 160) & (b > 140) & (g < 140) & (r + b > g * 2.2)
    # also catch near-pure #FF00FF
    d = np.sqrt((r - 255) ** 2 + (g - 0) ** 2 + (b - 255) ** 2)
    mag |= d < 90
    alpha = np.where(mag, 0, 255).astype(np.uint8)
    # soft edge
    soft = (d > 60) & (d < 120) & ~mag
    alpha = np.where(soft, ((d - 60) / 60 * 255).astype(np.uint8), alpha)
    # despill
    out = a.copy()
    spill = np.clip(np.minimum(out[..., 0], out[..., 2]) - out[..., 1] - 10, 0, None)
    out[..., 0] -= spill
    out[..., 2] -= spill
    out[..., 3] = alpha
    # crop
    ys, xs = np.where(alpha > 10)
    if len(xs):
        x0, x1 = xs.min(), xs.max() + 1
        y0, y1 = ys.min(), ys.max() + 1
        pad = 4
        out_im = Image.fromarray(out.astype(np.uint8)).crop((max(0, x0 - pad), max(0, y0 - pad), x1 + pad, y1 + pad))
    else:
        out_im = Image.fromarray(out.astype(np.uint8))
    out_im.save(OUT / name_out, optimize=True)
    print(name_out, out_im.size)

key_magenta("vault_door.jpg", "vault.png")
key_magenta("wagon_door.jpg", "wagon.png")
key_magenta("padlock_asset.jpg", "padlock.png")

shutil.copy2(SRC / "heist_door_bg.jpg", OUT / "heist_bg.jpg")
shutil.copy2(SRC / "gold_door_bg.jpg", OUT / "gold_bg.jpg")
print("bgs copied")
