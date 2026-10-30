from pathlib import Path

# 1) Never show car-fg — single car from the WebGL plate; cat stands in front.
html = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\index.html")
s = html.read_text(encoding="utf-8")
s = s.replace(
    "    .car-fg {\n"
    "      position:absolute; inset:0; z-index:4; pointer-events:none;\n"
    "      opacity:0; transition:opacity .7s ease; overflow:hidden;\n"
    "    }\n"
    "    .car-fg.on { opacity:1; }\n",
    "    .car-fg {\n"
    "      position:absolute; inset:0; z-index:4; pointer-events:none;\n"
    "      opacity:0 !important; display:none; overflow:hidden;\n"
    "    }\n"
    "    .car-fg.on { opacity:0; }\n",
)
# Cat above the street/car, still under the slot table (z-index 6)
s = s.replace(
    "      z-index:3; pointer-events:none;\n"
    "      display:flex; align-items:flex-end; justify-content:center;\n"
    "    }\n"
    "    .cat-wrap::after {",
    "      z-index:5; pointer-events:none;\n"
    "      display:flex; align-items:flex-end; justify-content:center;\n"
    "    }\n"
    "    .cat-wrap::after {",
)
html.write_text(s, encoding="utf-8", newline="\n")

# 2) Simplify shader: no car mask / UV hijack needed without FG
js = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\bg\bg-a-webgl.js")
s = js.read_text(encoding="utf-8")
# Ensure alley.jpg
s = s.replace("alley-plate.jpg", "alley.jpg")

old = """  // Dilated car mask so the CSS car-fg (diagonally cut for the cat's feet) never reveals a second car.
  float carRaw = texture(uCar, uv0).a;
  float carM = max(carRaw, max(
    texture(uCar, uv0 + vec2(-0.012, 0.0)).a,
    max(texture(uCar, uv0 + vec2(-0.024, 0.008)).a, texture(uCar, uv0 + vec2(-0.018, -0.01)).a)
  ));
  carM = smoothstep(0.04, 0.35, carM);
  float free = 1.0 - carM;
  vec2 uv = uv0;

  vec3 aux0 = texture(uAux, uv).rgb;
  float depth = aux0.r;
  uv += uCam * (depth - 0.35) * 0.014 * free;

  vec3 aux = texture(uAux, uv).rgb;
  float wet = aux.g;
  float gy = clamp((uv.y - uHorizon) / (1.0 - uHorizon), 0.0, 1.0);

  float ring = 0.0;
  vec2 rn = vec2(0.0);
  if (wet > 0.01) {
    rn = ripples(uv, gy, ring);
    uv += rn * 0.0022 * wet * mix(0.5, 1.2, gy) * free;
  }

  float reflMask = smoothstep(0.05, 0.25, textureLod(uAux, uv, 3.0).b) * wet;
  uv.x += sin(uv.y * 520.0 + uTime * 1.6) * 0.00045 * reflMask * free;
  // Under the car, sample the street further left so no second car shows through the FG cut.
  vec2 uvCol = uv;
  uvCol.x = mix(uv.x, clamp(uv0.x - 0.16, 0.0, 0.78), carM);
  uvCol.y = mix(uv.y, clamp(uv0.y + 0.02, 0.0, 1.0), carM * 0.35);
  vec3 col = texture(uTex, uvCol).rgb;"""

new = """  vec2 uv = uv0;

  vec3 aux0 = texture(uAux, uv).rgb;
  float depth = aux0.r;
  uv += uCam * (depth - 0.35) * 0.014;

  vec3 aux = texture(uAux, uv).rgb;
  float wet = aux.g;
  float gy = clamp((uv.y - uHorizon) / (1.0 - uHorizon), 0.0, 1.0);

  float ring = 0.0;
  vec2 rn = vec2(0.0);
  if (wet > 0.01) {
    rn = ripples(uv, gy, ring);
    uv += rn * 0.0022 * wet * mix(0.5, 1.2, gy);
  }

  float reflMask = smoothstep(0.05, 0.25, textureLod(uAux, uv, 3.0).b) * wet;
  uv.x += sin(uv.y * 520.0 + uTime * 1.6) * 0.00045 * reflMask;
  vec3 col = texture(uTex, uv).rgb;"""

if old not in s:
    raise SystemExit("shader block missing")
s = s.replace(old, new)

# Remove car texture wiring (keep uniform for compat? remove cleanly)
s = s.replace("uniform sampler2D uCar;\n", "")
s = s.replace(
    'const [plate, aux, car] = await Promise.all([\n'
    '      loadImage(BASE + "alley.jpg"),\n'
    '      loadImage(BASE + "alley-aux.png"),\n'
    '      loadImage(BASE + "car-fg.webp"),\n'
    "    ]);",
    'const [plate, aux] = await Promise.all([\n'
    '      loadImage(BASE + "alley.jpg"),\n'
    '      loadImage(BASE + "alley-aux.png"),\n'
    "    ]);",
)
s = s.replace(
    'for (const n of ["uTex", "uAux", "uCar", "uRes", "uImgAspect", "uTime", "uCam", "uFlash", "uWin", "uBoost", "uHorizon"]) uni[n] = gl.getUniformLocation(prog, n);\n'
    "    texture(plate, 0);\n"
    "    texture(aux, 1);\n"
    "    texture(car, 2);\n"
    "    gl.uniform1i(uni.uTex, 0);\n"
    "    gl.uniform1i(uni.uAux, 1);\n"
    "    gl.uniform1i(uni.uCar, 2);",
    'for (const n of ["uTex", "uAux", "uRes", "uImgAspect", "uTime", "uCam", "uFlash", "uWin", "uBoost", "uHorizon"]) uni[n] = gl.getUniformLocation(prog, n);\n'
    "    texture(plate, 0);\n"
    "    texture(aux, 1);\n"
    "    gl.uniform1i(uni.uTex, 0);\n"
    "    gl.uniform1i(uni.uAux, 1);",
)
# Restore rain/wet without * free if still present
s = s.replace(" * free;", ";")
s = s.replace(" * free;", ";")  # twice if two occurrences left

js.write_text(s, encoding="utf-8", newline="\n")
print("car-fg disabled, single plate car, cat z=5")
