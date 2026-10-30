import json
import os
import numpy as np
from PIL import Image

SRC = r"C:\Users\Mathis\.cursor\projects\c-Users-Mathis-Downloads-DuskFox-leger\assets"
OUT = r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\assets\matou\frames"
DBG = os.path.join(os.environ["TEMP"], "fr2dbg")
os.makedirs(DBG, exist_ok=True)

JOBS = {
    "base_neon": ("fr2_A", "period"),
    "base_film": ("fr2_B", "period"),
    "base_smoke": ("fr2_C", "quiet"),
    "heist_alarm": ("fr2_D", "quiet"),
    "gold_molten": ("fr2_E", "quiet"),
    "gold_loco": ("fr2_F", "quiet"),
}


def key(rgb):
    h, w, _ = rgb.shape
    border = np.concatenate([rgb[:6].reshape(-1, 3), rgb[-6:].reshape(-1, 3), rgb[:, :6].reshape(-1, 3), rgb[:, -6:].reshape(-1, 3)])
    bg = np.median(border, axis=0)
    d = np.sqrt(((rgb - bg) ** 2).sum(-1))
    a = np.clip((d - 70) / 70, 0, 1)
    out = rgb.copy()
    if bg[1] > bg[0] and bg[1] > bg[2]:
        m = np.maximum(out[..., 0], out[..., 2])
        out[..., 1] = np.minimum(out[..., 1], m + 6)
    else:
        m = np.minimum(out[..., 0], out[..., 2])
        sp = np.clip(m - out[..., 1] - 6, 0, None)
        out[..., 0] -= sp
        out[..., 2] -= sp
    return out, a


def hole(a):
    h, w = a.shape
    cy, cx = h // 2, w // 2
    op = a > 0.5

    def run(line, c, step):
        i = c
        while 0 <= i < len(line) and not line[i]:
            i += step
        return i

    lefts = [run(op[y], cx, -1) + 1 for y in range(int(h * 0.38), int(h * 0.62), 4)]
    rights = [run(op[y], cx, 1) for y in range(int(h * 0.38), int(h * 0.62), 4)]
    x0, x1 = int(np.median(lefts)), int(np.median(rights))
    cols = range(int(x0 + (x1 - x0) * 0.2), int(x0 + (x1 - x0) * 0.8), 4)
    tops = [run(op[:, x], cy, -1) + 1 for x in cols]
    bots = [run(op[:, x], cy, 1) for x in cols]
    return x0, x1, int(np.median(tops)), int(np.median(bots))


def stretch_rows(img, y0, y1, new_h):
    band = Image.fromarray(img[y0:y1].astype(np.uint8)) if img.dtype != np.uint8 else Image.fromarray(img[y0:y1])
    band = np.asarray(band.resize((img.shape[1], new_h), Image.LANCZOS)).astype(img.dtype)
    return np.concatenate([img[:y0], band, img[y1:]])


def side_mask(a, x0, x1):
    cols = np.zeros(a.shape[1], bool)
    cols[:x0] = True
    cols[x1:] = True
    return cols


def process(name, src, mode):
    im = Image.open(os.path.join(SRC, src + ".jpg")).convert("RGB")
    rgb = np.asarray(im).astype(np.float32)
    rgb, a = key(rgb)
    x0, x1, y0, y1 = hole(a)
    hw, hh = x1 - x0, y1 - y0
    delta = round(hw / 1.2 - hh)
    rgba = np.dstack([np.clip(rgb, 0, 255), a * 255]).astype(np.uint8)
    cols = side_mask(a, x0, x1)
    lum = (rgb.mean(-1) * a)[:, cols]
    ya, yb = int(y0 + hh * 0.14), int(y1 - hh * 0.14)
    info = {"hole0": (x0, x1, y0, y1), "delta": delta}
    if delta > 0 and mode == "period":
        prof = lum[ya:yb].mean(1)
        prof = prof - prof.mean()
        best, per = -1e9, 0
        for p in range(18, 130):
            c = (prof[:-p] * prof[p:]).mean()
            if c > best:
                best, per = c, p
        n = max(1, round(delta / per))
        ys = (ya + yb) // 2 - per // 2
        band = rgba[ys:ys + per]
        rgba = np.concatenate([rgba[:ys]] + [band] * n + [rgba[ys:]])
        info["period"] = per
        info["copies"] = n
        rest = delta - n * per
        if rest:
            H = rgba.shape[0]
            rgba = np.asarray(Image.fromarray(rgba).resize((rgba.shape[1], H + rest), Image.LANCZOS))
    elif delta > 0:
        diff = np.abs(np.diff(lum, axis=0)).mean(1)
        win = 28
        score = np.convolve(diff[ya:yb], np.ones(win), "valid")
        order = np.argsort(score)
        picks = []
        for i in order:
            s = ya + int(i)
            if all(abs(s - p) > win + 6 for p in picks):
                picks.append(s)
            if len(picks) == 2:
                break
        picks.sort(reverse=True)
        share = [delta // 2, delta - delta // 2]
        for s, add in zip(picks, share):
            rgba = stretch_rows(rgba, s, s + win, win + add)
        info["bands"] = picks
    a2 = rgba[..., 3].astype(np.float32) / 255
    x0, x1, y0, y1 = hole(a2)
    ys, xs = np.where(rgba[..., 3] > 20)
    bx0, bx1, by0, by1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    rgba = rgba[by0:by1, bx0:bx1]
    x0 -= bx0; x1 -= bx0; y0 -= by0; y1 -= by0
    ch, cw = rgba.shape[:2]
    sw, sh = x1 - x0, y1 - y0
    fit = {
        "l": round(x0 / sw * 100, 2), "r": round((cw - x1) / sw * 100, 2),
        "t": round(y0 / sh * 100, 2), "b": round((ch - y1) / sh * 100, 2),
        "hl": 0.6, "hr": 0.6, "ht": 0.6, "hb": 0.6,
    }
    info["hole"] = (x0, x1, y0, y1)
    info["aspect"] = round(sw / sh, 3)
    info["size"] = (cw, ch)
    Image.fromarray(rgba).save(os.path.join(OUT, f"frame_{name}.png"), optimize=True)
    dbg = Image.new("RGBA", (cw, ch), (70, 70, 80, 255))
    dbg.alpha_composite(Image.fromarray(rgba))
    dbg.convert("RGB").save(os.path.join(DBG, name + ".jpg"), quality=85)
    return fit, info


meta = {}
for name, (src, mode) in JOBS.items():
    fit, info = process(name, src, mode)
    meta[name] = fit
    print(name, info)
print(json.dumps(meta))
