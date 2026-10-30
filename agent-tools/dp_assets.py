"""Build door-pick assets: scenes, keyed wagon door + rail, vault dial; optional debug overlays."""
import os
import sys
import numpy as np
from PIL import Image, ImageDraw

SRC = r"C:\Users\Mathis\.cursor\projects\c-Users-Mathis-Downloads-DuskFox-leger\assets"
DST = r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\assets\matou\doors"
TMP = os.environ.get("TEMP", ".")

# Slot geometry in % of the 16:9 scene (center x, center y, width %W, height %H).
HEIST = [(22.6, 43.6), (50.1, 43.6), (77.4, 43.6)]
HEIST_D = 21.0  # vault door diameter, % of scene width
GOLD = [(21.2, 47.4), (50.1, 47.4), (79.3, 47.4)]
GOLD_W, GOLD_H = 12.4, 31.0


def debug():
    for name, slots, kind in [("dp_heist_scene.jpg", HEIST, "c"), ("dp_gold_scene.jpg", GOLD, "r")]:
        im = Image.open(os.path.join(SRC, name)).convert("RGB")
        W, H = im.size
        d = ImageDraw.Draw(im)
        for cx, cy in slots:
            x, y = cx / 100 * W, cy / 100 * H
            if kind == "c":
                r = HEIST_D / 100 * W / 2
                d.ellipse([x - r, y - r, x + r, y + r], outline=(255, 0, 0), width=2)
            else:
                w, h = GOLD_W / 100 * W / 2, GOLD_H / 100 * H / 2
                d.rectangle([x - w, y - h, x + w, y + h], outline=(255, 0, 0), width=2)
        im.save(os.path.join(TMP, "dbg_" + name), quality=90)


def key_green(im):
    a = np.asarray(im.convert("RGB")).astype(np.int16)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    excess = g - np.maximum(r, b)
    alpha = np.clip(255 - (excess - 25) * 255 / 45, 0, 255)
    alpha[excess <= 25] = 255
    out = a.copy()
    spill = excess > 0
    out[..., 1][spill] = np.maximum(r, b)[spill]
    rgba = np.dstack([out.astype(np.uint8), alpha.astype(np.uint8)])
    return Image.fromarray(rgba, "RGBA")


def build():
    for a, b in [("dp_heist_scene.jpg", "heist_scene.jpg"), ("dp_gold_scene.jpg", "gold_scene.jpg")]:
        Image.open(os.path.join(SRC, a)).convert("RGB").save(os.path.join(DST, b), quality=86, optimize=True, progressive=True)

    door = key_green(Image.open(os.path.join(SRC, "dp_wagon_door.jpg")))
    W, H = door.size
    bbox = door.getchannel("A").point(lambda v: 255 if v > 30 else 0).getbbox()
    door = door.crop(bbox)
    W, H = door.size
    al = np.asarray(door.getchannel("A"))
    # Rail = top band where the opaque span is the wide iron bar; body starts at brass frame.
    rows = (al > 128).sum(axis=1)
    body_top = None
    for y in range(int(H * 0.04), int(H * 0.2)):
        if rows[y] > W * 0.86 and rows[y + 3] > W * 0.86 and rows[y - 1] <= W * 0.99:
            pass
    # find first row after the rail where coverage is continuous for 20 rows (frame top)
    cover = rows / W
    rail_end = int(np.argmax(cover[int(H * 0.02):] > 0.9)) + int(H * 0.02)
    y = rail_end
    while y < H * 0.25 and cover[y] > 0.9:
        y += 1
    gap = y
    while gap < H * 0.25 and cover[gap] < 0.9:
        gap += 1
    body_top = gap if gap < H * 0.25 else int(H * 0.085)
    rail = door.crop((0, 0, W, body_top))
    body = door.crop((0, body_top, W, H))
    bb = body.getchannel("A").point(lambda v: 255 if v > 30 else 0).getbbox()
    body = body.crop(bb)
    body.thumbnail((520, 900), Image.LANCZOS)
    rail.thumbnail((620, 200), Image.LANCZOS)
    body.save(os.path.join(DST, "wagon_door.png"), optimize=True)
    rail.save(os.path.join(DST, "wagon_rail.png"), optimize=True)
    print("door", body.size, "rail", rail.size, "body_top", body_top, "of", H)

    vault = Image.open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "src", "vault.png")).convert("RGBA")
    vb = vault.getchannel("A").point(lambda v: 255 if v > 30 else 0).getbbox()
    print("vault bbox", vb, vault.size)
    vault = vault.crop(vb)
    side = max(vault.size)
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.paste(vault, ((side - vault.size[0]) // 2, (side - vault.size[1]) // 2))
    sq = sq.resize((640, 640), Image.LANCZOS)
    sq.save(os.path.join(DST, "vault_door.png"), optimize=True)
    # Dial: brass disc around the centre of the door (measured on the 640 square).
    cx, cy, r = DIAL
    m = Image.new("L", sq.size, 0)
    ImageDraw.Draw(m).ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    dial = Image.new("RGBA", sq.size, (0, 0, 0, 0))
    dial.paste(sq, (0, 0), m)
    dial = dial.crop((cx - r, cy - r, cx + r, cy + r))
    dial.save(os.path.join(DST, "vault_dial.png"), optimize=True)
    dbg = sq.copy()
    ImageDraw.Draw(dbg).ellipse([cx - r, cy - r, cx + r, cy + r], outline=(255, 0, 0, 255), width=2)
    dbg.convert("RGB").save(os.path.join(TMP, "dbg_vault.jpg"))


DIAL = (320, 316, 123)

if __name__ == "__main__":
    debug() if "debug" in sys.argv else build()
