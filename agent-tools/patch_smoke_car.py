from pathlib import Path

# --- Smoke: canvas on #stage, positioned vs host ---
p = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\mascot\mascot.js")
s = p.read_text(encoding="utf-8")
s = s.replace(
    '    wrap.appendChild(smokeCv);',
    '    (wrap.parentElement || wrap).appendChild(smokeCv);',
    1,
)
s = s.replace(
    "    const wr = wrap.getBoundingClientRect(), vr = v.getBoundingClientRect();",
    "    const host = smokeCv.parentElement || wrap;\n"
    "    const hr = host.getBoundingClientRect(), vr = v.getBoundingClientRect();",
    1,
)
s = s.replace(
    '    smokeCv.style.left = (vr.left - wr.left - ox) + "px";\n'
    '    smokeCv.style.top = (vr.top - wr.top + TOP * H) + "px";',
    '    smokeCv.style.left = (vr.left - hr.left - ox) + "px";\n'
    '    smokeCv.style.top = (vr.top - hr.top + TOP * H) + "px";',
    1,
)
assert "wr.left" not in s
p.write_text(s, encoding="utf-8", newline="\n")

# --- CSS z-index ---
p = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\index.html")
s = p.read_text(encoding="utf-8")
old = "    .cat-smoke { position:absolute; pointer-events:none; filter:blur(2px); }"
new = "    .cat-smoke { position:absolute; pointer-events:none; filter:blur(2px); z-index:8; }"
assert s.count(old) == 1
p.write_text(s.replace(old, new), encoding="utf-8", newline="\n")
print("smoke ok")

# --- Car: freeze BG under car-fg mask ---
p = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\bg\bg-a-webgl.js")
s = p.read_text(encoding="utf-8")

old_uniforms = """uniform sampler2D uTex;
uniform sampler2D uAux;
uniform vec2 uRes;"""
new_uniforms = """uniform sampler2D uTex;
uniform sampler2D uAux;
uniform sampler2D uCar;
uniform vec2 uRes;"""
assert s.count(old_uniforms) == 1
s = s.replace(old_uniforms, new_uniforms)

old_main = """void main(){
  vec2 p = gl_FragCoord.xy / uRes;
  p.y = 1.0 - p.y;
  float ca = uRes.x / uRes.y;
  vec2 uv = coverUV(p);

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

new_main = """void main(){
  vec2 p = gl_FragCoord.xy / uRes;
  p.y = 1.0 - p.y;
  float ca = uRes.x / uRes.y;
  vec2 uv0 = coverUV(p);
  float carM = texture(uCar, uv0).a;
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
  vec3 col = texture(uTex, uv).rgb;"""

assert s.count(old_main) == 1, "main block missing"
s = s.replace(old_main, new_main)

s = s.replace(
    'for (const n of ["uTex", "uAux", "uRes", "uImgAspect", "uTime", "uCam", "uFlash", "uWin", "uBoost", "uHorizon"]) uni[n] = gl.getUniformLocation(prog, n);\n'
    "    texture(plate, 0);\n"
    "    texture(aux, 1);\n"
    "    gl.uniform1i(uni.uTex, 0);\n"
    "    gl.uniform1i(uni.uAux, 1);",
    'for (const n of ["uTex", "uAux", "uCar", "uRes", "uImgAspect", "uTime", "uCam", "uFlash", "uWin", "uBoost", "uHorizon"]) uni[n] = gl.getUniformLocation(prog, n);\n'
    "    texture(plate, 0);\n"
    "    texture(aux, 1);\n"
    "    texture(car, 2);\n"
    "    gl.uniform1i(uni.uTex, 0);\n"
    "    gl.uniform1i(uni.uAux, 1);\n"
    "    gl.uniform1i(uni.uCar, 2);",
    1,
)

s = s.replace(
    'const [plate, aux] = await Promise.all([loadImage(BASE + "alley.jpg"), loadImage(BASE + "alley-aux.png")]);',
    'const [plate, aux, car] = await Promise.all([\n'
    '      loadImage(BASE + "alley.jpg"),\n'
    '      loadImage(BASE + "alley-aux.png"),\n'
    '      loadImage(BASE + "car-fg.png"),\n'
    "    ]);",
    1,
)

p.write_text(s, encoding="utf-8", newline="\n")
print("car ok")
