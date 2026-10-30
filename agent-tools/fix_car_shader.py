from pathlib import Path

p = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\bg\bg-a-webgl.js")
s = p.read_text(encoding="utf-8")

# Revert to alley.jpg (keep plate unused)
s = s.replace('alley-plate.jpg', 'alley.jpg')

old = """  float carM = smoothstep(0.08, 0.55, texture(uCar, uv0).a);
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

new = """  // Dilated car mask so the CSS car-fg (diagonally cut for the cat's feet) never reveals a second car.
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

assert old in s, "block missing"
p.write_text(s.replace(old, new), encoding="utf-8", newline="\n")
print("shader ok")
