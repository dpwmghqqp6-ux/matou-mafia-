from PIL import Image
import os

pairs = [
    ("C:/Users/Mathis/.cursor/projects/c-Users-Mathis-Downloads-DuskFox-leger/assets/ingot1_bars.jpg", "ingot_1.png"),
    ("C:/Users/Mathis/.cursor/projects/c-Users-Mathis-Downloads-DuskFox-leger/assets/ingot2_bars.jpg", "ingot_2.png"),
    ("C:/Users/Mathis/.cursor/projects/c-Users-Mathis-Downloads-DuskFox-leger/assets/ingot3_bars.jpg", "ingot_3.png"),
]
out_dir = r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\assets\matou\symbols"
os.makedirs(out_dir, exist_ok=True)

for src, name in pairs:
    im = Image.open(src).convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if g > 90 and g > r * 1.25 and g > b * 1.25:
                excess = g - max(r, b)
                if excess > 40:
                    px[x, y] = (r, g, b, 0)
                elif excess > 15:
                    alpha = max(0, min(255, int(255 * (1 - (excess - 15) / 25))))
                    px[x, y] = (r, g, b, alpha)
    bbox = im.getchannel("A").point(lambda v: 255 if v > 20 else 0).getbbox()
    if bbox:
        im = im.crop(bbox)
    side = max(im.size)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(im, ((side - im.size[0]) // 2, (side - im.size[1]) // 2), im)
    canvas = canvas.resize((512, 512), Image.LANCZOS)
    path = os.path.join(out_dir, name)
    canvas.save(path)
    print(name, canvas.size, path)
