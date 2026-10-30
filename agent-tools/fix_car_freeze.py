from pathlib import Path

p = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\bg\bg-a-webgl.js")
s = p.read_text(encoding="utf-8")

old = """  vec2 uv = uv0;

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

new = """  vec2 uv = uv0;
  // Freeze warp on the right-side car so chrome edges do not ghost under parallax/ripples.
  float carZone = smoothstep(0.72, 0.78, uv0.x) * smoothstep(0.46, 0.56, uv0.y) * smoothstep(0.98, 0.88, uv0.y);
  float free = 1.0 - carZone;

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

assert old in s
s = s.replace(old, new)
# rain * free again
s = s.replace(
    "  col += rainCol * (r1 * 0.13 + r2 * 0.2 + r3 * 0.16) * lit;",
    "  col += rainCol * (r1 * 0.13 + r2 * 0.2 + r3 * 0.16) * lit * mix(1.0, 0.35, carZone);",
)
s = s.replace(
    "    col += mix(vec3(0.55, 0.75, 0.9), warm, clamp(glow * 2.0, 0.0, 1.0)) * ring * wet * refl * 0.45;",
    "    col += mix(vec3(0.55, 0.75, 0.9), warm, clamp(glow * 2.0, 0.0, 1.0)) * ring * wet * refl * 0.45 * free;",
)
p.write_text(s, encoding="utf-8", newline="\n")
print("ok")
