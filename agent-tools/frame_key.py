from PIL import Image
import json
import os

src_dir = r"C:\Users\Mathis\.cursor\projects\c-Users-Mathis-Downloads-DuskFox-leger\assets"
out_dir = r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\assets\matou\frames"
os.makedirs(out_dir, exist_ok=True)
names = [f"frame_{k}_{i}" for k in ("base", "heist", "gold") for i in (1, 2, 3)]
meta = {}

for name in names:
    im = Image.open(os.path.join(src_dir, name + ".jpg")).convert("RGBA")
    w, h = im.size
    px = im.load()
    samples = [px[x, y] for x, y in ((4, 4), (w - 5, 4), (4, h - 5), (w - 5, h - 5), (w // 2, h // 2), (w // 2 - 40, h // 2 + 30))]
    br = sorted(s[0] for s in samples)[3]
    bg = sorted(s[1] for s in samples)[3]
    bb = sorted(s[2] for s in samples)[3]
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            d = ((r - br) ** 2 + (g - bg) ** 2 + (b - bb) ** 2) ** 0.5
            if d < 70:
                px[x, y] = (r, g, b, 0)
            else:
                alpha = 255 if d > 130 else int(255 * (d - 70) / 60)
                spill = min(r, b) - g
                if spill > 20 and alpha < 255:
                    r = max(g, r - spill)
                    b = max(g, b - spill)
                px[x, y] = (r, g, b, alpha)

    cx, cy = w // 2, h // 2
    sxm, sym = int(w * 0.3), int(h * 0.3)
    rx0 = next(x for x in range(cx, -1, -1) if px[x, sym][3] > 40) + 1
    rx1 = next(x for x in range(cx, w) if px[x, sym][3] > 40)
    ry0 = next(y for y in range(cy, -1, -1) if px[sxm, y][3] > 40) + 1
    ry1 = next(y for y in range(cy, h) if px[sxm, y][3] > 40)
    for y in range(ry0, ry1):
        for x in range(rx0, rx1):
            if (0.3 * w < x < 0.7 * w) or (0.3 * h < y < 0.7 * h):
                r, g, b, a = px[x, y]
                px[x, y] = (r, g, b, 0)

    def clear(a0, b0, a1, b1):
        for yy in range(b0, b1, 2):
            for xx in range(a0, a1, 2):
                if px[xx, yy][3] > 40:
                    return False
        return True

    rw, rh = rx1 - rx0, ry1 - ry0
    best = None
    for dx in range(0, rw // 4, 3):
        for dy in range(0, rh // 4, 3):
            if best and dx + dy >= best[0]:
                break
            if clear(rx0 + dx, ry0 + dy, rx1 - dx, ry1 - dy):
                best = (dx + dy, dx, dy)
                break
    _, dx, dy = best
    sx0, sx1, sy0, sy1 = rx0 + dx, rx1 - dx, ry0 + dy, ry1 - dy
    sx0 = max(sx0 - 2, rx0); sy0 = max(sy0 - 2, ry0)
    sx1 = min(sx1 + 2, rx1); sy1 = min(sy1 + 2, ry1)

    bbox = im.getchannel("A").point(lambda v: 255 if v > 20 else 0).getbbox()
    im = im.crop(bbox)
    ox, oy = bbox[0], bbox[1]
    cw, ch = im.size
    sx0, sx1, rx0, rx1 = sx0 - ox, sx1 - ox, rx0 - ox, rx1 - ox
    sy0, sy1, ry0, ry1 = sy0 - oy, sy1 - oy, ry0 - oy, ry1 - oy
    sw, sh = sx1 - sx0, sy1 - sy0
    meta[name] = {
        "l": round(sx0 / sw * 100, 2),
        "r": round((cw - sx1) / sw * 100, 2),
        "t": round(sy0 / sh * 100, 2),
        "b": round((ch - sy1) / sh * 100, 2),
        "hl": round((sx0 - rx0) / sw * 100, 2),
        "hr": round((rx1 - sx1) / sw * 100, 2),
        "ht": round((sy0 - ry0) / sh * 100, 2),
        "hb": round((ry1 - sy1) / sh * 100, 2),
    }
    im.save(os.path.join(out_dir, name + ".png"))
    print(name, im.size, meta[name])

print(json.dumps(meta))
