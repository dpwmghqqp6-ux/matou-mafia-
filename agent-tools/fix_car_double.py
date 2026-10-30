"""Rebuild hard-edged car-fg and hide BG car under that mask in the shader."""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from pathlib import Path

SRC = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\assets\matou\bg-a\alley.jpg")
OUT = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\assets\matou\bg-a\car-fg.png")

HULL = [
    (3040, 1700), (3058, 1600), (3100, 1515), (3160, 1452), (3212, 1414),
    (3290, 1366), (3468, 1322), (3482, 1142), (3522, 1082), (3640, 1050),
    (3840, 1018), (3840, 2110), (3560, 1962), (3300, 1934), (3188, 1934),
    (3118, 1872), (3078, 1782),
]

im = Image.open(SRC).convert("RGBA")
W, H = im.size
mask = Image.new("L", (W, H), 0)
ImageDraw.Draw(mask).polygon(HULL, fill=255)
# Slight dilate so FG fully covers the BG car, then tiny blur for AA only
mask = mask.filter(ImageFilter.MaxFilter(5))
mask = mask.filter(ImageFilter.GaussianBlur(0.6))
rgba = np.asarray(im).copy()
rgba[..., 3] = np.asarray(mask)
Image.fromarray(rgba).save(OUT, optimize=True)
print("car-fg rebuilt", OUT, OUT.stat().st_size)

# Shader: harder car mask + skip rain/fog sparkle contribution on car
p = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\bg\bg-a-webgl.js")
s = p.read_text(encoding="utf-8")
old = "  float carM = texture(uCar, uv0).a;\n  float free = 1.0 - carM;"
new = "  float carM = smoothstep(0.08, 0.55, texture(uCar, uv0).a);\n  float free = 1.0 - carM;"
assert s.count(old) == 1
s = s.replace(old, new)

# After rain add, kill rain on car; also force plate sample path already frozen
# Find rain line and multiply
old_rain = "  col += rainCol * (r1 * 0.13 + r2 * 0.2 + r3 * 0.16) * lit;"
new_rain = "  col += rainCol * (r1 * 0.13 + r2 * 0.2 + r3 * 0.16) * lit * free;"
assert s.count(old_rain) == 1
s = s.replace(old_rain, new_rain)

# Kill wet rings on car
old_wet = "    col += mix(vec3(0.55, 0.75, 0.9), warm, clamp(glow * 2.0, 0.0, 1.0)) * ring * wet * refl * 0.45;"
new_wet = "    col += mix(vec3(0.55, 0.75, 0.9), warm, clamp(glow * 2.0, 0.0, 1.0)) * ring * wet * refl * 0.45 * free;"
assert s.count(old_wet) == 1
s = s.replace(old_wet, new_wet)

p.write_text(s, encoding="utf-8", newline="\n")
print("shader hardened")
