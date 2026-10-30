(function () {
  // coordinates in pixels of the frame PNG; pad = extra canvas around the PNG as a fraction of its size (l, t, r, b)
  const FRAMES = {
    base_film: {
      pad: [0.03, 0.03, 0.03, 0.03], bloom: 0.25, shine: 0, flicker: 1.0, spinOnly: true,
      bands: [
        { rect: [160, 208, 305, 244], dir: [1, 0], period: 34.9 },
        { rect: [612, 208, 780, 244], dir: [1, 0], period: 34.9 },
        { rect: [861, 305, 898, 825], dir: [0, 1], period: 37.8 },
        { rect: [160, 896, 780, 931], dir: [-1, 0], period: 34.6 },
        { rect: [38, 305, 75, 825], dir: [0, -1], period: 37.8 },
      ],
      bandSpeed: 26,
      rots: [{ c: [330, 97], r: 89, speed: 1.3 }, { c: [605, 97], r: 89, speed: 1.3 }],
      glows: [{ c: [470, 152], r: 22, mode: "flicker", color: [1.0, 0.85, 0.55], power: 0.8, speed: 1 }],
    },
    heist_alarm: {
      pad: [0.32, 0.08, 0.32, 0.04], bloom: 0.35, shine: 0,
      rots: [{ c: [467, 92], r: 70, speed: 0, wob: 1.4, wobf: 0.55 }],
      glows: [
        { c: [85, 50], r: 42, mode: "beacon", color: [1.0, 0.12, 0.08], power: 1.0, speed: 4.2, phase: 0, len: 370, spread: 0.3 },
        { c: [860, 50], r: 42, mode: "beacon", color: [1.0, 0.12, 0.08], power: 1.0, speed: 4.2, phase: 3.14, len: 370, spread: 0.3 },
        { c: [103, 705], r: 22, mode: "flicker", color: [0.3, 1.0, 0.45], power: 0.7, speed: 1 },
        { c: [838, 705], r: 22, mode: "flicker", color: [0.3, 1.0, 0.45], power: 0.7, speed: 1 },
      ],
      laser: { rect: [118, 181, 824, 769], power: 0.9 },
    },
    gold_loco: {
      pad: [0.06, 0.24, 0.06, 0.03], bloom: 0.35, shine: 0, spark: 0.9,
      rots: [
        { c: [74, 167], r: 36, speed: 0, wob: 0.22, wobf: 2.6 },
        { c: [899, 167], r: 36, speed: 0, wob: 0.28, wobf: 2.1 },
        { c: [74, 787], r: 36, speed: 0, wob: 0.25, wobf: 2.9 },
        { c: [899, 787], r: 36, speed: 0, wob: 0.2, wobf: 2.3 },
      ],
      glows: [{ c: [486, 74], r: 60, mode: "lamp", color: [1.0, 0.8, 0.45], power: 0.6, speed: 1.5 }],
      smoke: [
        { p: [129, 62], h: 240, w: 95, color: [1.0, 0.98, 0.94], amount: 1.0, puff: 1, phase: 0.0 },
        { p: [844, 62], h: 240, w: 95, color: [1.0, 0.98, 0.94], amount: 1.0, puff: 1, phase: 0.5 },
      ],
    },
  };

  const MODES = { pulse: 0, flicker: 1, blink: 2, beacon: 3, lamp: 4 };

  const VERT = `#version 300 es
in vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;

  const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform vec4 uPad;
uniform vec2 uImg;
uniform float uTime;
uniform float uMotT;
uniform float uWin;
uniform vec4 uFx;
uniform vec4 uFx2;
uniform vec4 uRing;
uniform vec4 uRingP;
uniform vec4 uFlowMask;
uniform vec4 uRot[4];
uniform vec4 uRotW[4];
uniform int uNRot;
uniform vec4 uGlow[6];
uniform vec4 uGlowC[6];
uniform vec4 uGlowP[6];
uniform int uNGlow;
uniform vec4 uSmoke[4];
uniform vec4 uSmokeC[4];
uniform vec4 uSmokeP[4];
uniform int uNSmoke;
uniform vec4 uBand[6];
uniform vec4 uBandP[6];
uniform int uNBand;
uniform vec4 uLaser;
uniform float uLaserP;
uniform vec4 uDrop[8];
uniform int uNDrop;
out vec4 outColor;

float hash21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1,0)), u.x), mix(hash21(i + vec2(0,1)), hash21(i + vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }

vec4 tap(vec2 px){
  if (px.x < 0.0 || px.y < 0.0 || px.x > uImg.x || px.y > uImg.y) return vec4(0.0);
  return texture(uTex, px / uImg);
}
vec4 tapLod(vec2 px, float lod){
  vec2 uv = px / uImg;
  vec4 c = textureLod(uTex, clamp(uv, 0.0, 1.0), lod);
  vec2 o = max(vec2(0.0), max(-uv, uv - 1.0)) * uImg;
  return c * exp(-dot(o, o) / 900.0);
}

void main(){
  vec2 q = gl_FragCoord.xy / uRes;
  q.y = 1.0 - q.y;
  vec2 px = (q - uPad.xy) / (1.0 - uPad.xy - uPad.zw) * uImg;
  float t = uTime;
  float shine = uFx.x, bloomAmt = uFx.y, neonAmt = uFx.z, flickAmt = uFx.w;
  float flowAmt = uFx2.x, sparkAmt = uFx2.y, bandSpeed = uFx2.z;

  vec2 spx = px;
  for (int i = 0; i < 6; i++) {
    if (i >= uNBand) break;
    vec4 r = uBand[i];
    if (px.x >= r.x && px.x <= r.z && px.y >= r.y && px.y <= r.w) {
      vec2 dir = uBandP[i].xy;
      float per = uBandP[i].z;
      float sh = mod(uMotT * bandSpeed, per);
      vec2 loc = px - r.xy - dir * sh;
      if (dir.x > 0.5 && loc.x < 0.0) loc.x += per;
      if (dir.x < -0.5 && loc.x > r.z - r.x) loc.x -= per;
      if (dir.y > 0.5 && loc.y < 0.0) loc.y += per;
      if (dir.y < -0.5 && loc.y > r.w - r.y) loc.y -= per;
      spx = r.xy + loc;
    }
  }
  for (int i = 0; i < 4; i++) {
    if (i >= uNRot) break;
    vec2 d = px - uRot[i].xy;
    if (length(d) < uRot[i].z) {
      float a = uRot[i].w * uMotT
              + uRotW[i].x * (sin(t * uRotW[i].y + float(i) * 1.7) + 0.35 * sin(t * uRotW[i].y * 2.7 + float(i)));
      a += uFx2.w * ((hash21(vec2(floor(t * 14.0), float(i) * 3.1)) - 0.5) * 1.4 + sin(t * 41.0 + float(i)) * 0.12);
      float c = cos(a), s = sin(a);
      spx = uRot[i].xy + mat2(c, s, -s, c) * d;
    }
  }
  if (flowAmt > 0.0 && !(px.x > uFlowMask.x && px.x < uFlowMask.z && px.y > uFlowMask.y && px.y < uFlowMask.w)) {
    vec2 fp = px * 0.011;
    spx += (vec2(fbm(fp + vec2(0.0, t * 0.22)), fbm(fp + vec2(5.2, 3.0 - t * 0.19))) - 0.5) * flowAmt * 2.0;
  }

  vec4 tex = tap(spx);
  vec3 col = tex.rgb;
  float alpha = tex.a;
  vec3 un = alpha > 0.001 ? col / alpha : vec3(0.0);
  float lum = dot(un, vec3(0.3, 0.55, 0.15));

  if (flickAmt > 0.0) {
    float f = 0.93 + 0.07 * vnoise(vec2(t * 18.0, 1.0)) + 0.05 * step(0.92, hash21(vec2(floor(t * 12.0), 3.0)));
    f = mix(f, 0.7 + 0.6 * hash21(vec2(floor(t * 26.0), 8.0)), uFx2.w);
    col *= mix(1.0, f, flickAmt);
  }

  float ringMask = 0.0, ringLit = 1.0;
  if (uRingP.w > 0.0) {
    vec2 r0 = uRing.xy, r1 = uRing.zw;
    float W = r1.x - r0.x, H = r1.y - r0.y, hw = uRingP.x;
    float best = 1e9, s = 0.0;
    if (px.x > r0.x - hw && px.x < r1.x + hw) {
      float d = abs(px.y - r0.y); if (d < best) { best = d; s = px.x - r0.x; }
      d = abs(px.y - r1.y); if (d < best) { best = d; s = 2.0 * W + H - (px.x - r0.x); }
    }
    if (px.y > r0.y - hw && px.y < r1.y + hw) {
      float d = abs(px.x - r1.x); if (d < best) { best = d; s = W + px.y - r0.y; }
      d = abs(px.x - r0.x); if (d < best) { best = d; s = 2.0 * W + 2.0 * H - (px.y - r0.y); }
    }
    if (best < hw) {
      ringMask = smoothstep(0.3, 0.6, lum);
      float idx = floor(s / uRingP.y + 0.5);
      float step3 = floor(t * uRingP.z * (1.0 + uWin * 1.5));
      ringLit = mod(idx + step3, 3.0) < 0.5 ? 1.7 : 0.18;
      col *= mix(1.0, ringLit, ringMask);
    }
  }

  float neonF = 1.0;
  if (neonAmt > 0.0) {
    neonF = mix(0.2, 1.0, step(0.05, vnoise(vec2(t * 1.7, 3.0)))) * (0.86 + 0.14 * vnoise(vec2(t * 45.0, 1.0)));
    neonF = mix(neonF, 1.25, uWin);
    float nm = smoothstep(0.5, 0.8, un.r) * step(un.g, un.r * 0.72) * smoothstep(0.45, 0.2, un.b) * (1.0 - ringMask);
    col = mix(col, col * neonF * 1.1, nm * neonAmt);
  }

  vec4 b1 = tapLod(spx, 3.0), b2 = tapLod(spx, 5.0);
  vec3 bl = max(b1.rgb - 0.42 * b1.a, 0.0) * 1.1 + max(b2.rgb - 0.38 * b2.a, 0.0) * 1.3;
  float bk = bloomAmt * (neonAmt > 0.0 ? neonF : 1.0) * (1.0 + uWin * 0.8);
  col += bl * bk;
  alpha += dot(bl, vec3(0.33)) * bk;

  if (shine > 0.0) {
    float s = (px.x + px.y * 0.55) / (uImg.x * 1.55);
    float pos = fract(t * 0.075) * 2.4 - 0.7;
    float sh = exp(-pow((s - pos) * 13.0, 2.0)) + 0.5 * exp(-pow((s - pos + 0.05) * 30.0, 2.0));
    col += vec3(1.0, 0.93, 0.78) * sh * shine * tex.a * smoothstep(0.12, 0.5, lum) * (1.0 + uWin);
  }

  if (sparkAmt > 0.0) {
    float gs = 34.0;
    vec2 gid = floor(px / gs);
    vec2 gf = px / gs - gid - 0.5;
    float h = hash21(gid + 9.1);
    vec2 jit = (vec2(hash21(gid + 2.0), hash21(gid + 5.0)) - 0.5) * 0.5;
    vec4 cc = tap((gid + 0.5 + jit) * gs);
    vec3 cu = cc.a > 0.01 ? cc.rgb / cc.a : vec3(0.0);
    float gold = smoothstep(0.5, 0.75, cu.r) * step(cu.b * 1.4, cu.r) * step(0.6, cc.a);
    float tw = pow(max(0.0, sin(t * (0.8 + h * 1.6) * (1.0 + uWin * 2.0) + h * 40.0)), 22.0) * step(0.45, h);
    vec2 d = gf - jit;
    float star = (exp(-abs(d.x) * 50.0) * exp(-abs(d.y) * 7.0) + exp(-abs(d.y) * 50.0) * exp(-abs(d.x) * 7.0)) * 0.9 + exp(-dot(d, d) * 260.0);
    float sp = star * tw * gold * sparkAmt;
    col += vec3(1.0, 0.92, 0.65) * sp;
    alpha += sp * 0.6;
  }

  for (int i = 0; i < 6; i++) {
    if (i >= uNGlow) break;
    vec2 d = px - uGlow[i].xy;
    float r = uGlow[i].z;
    int mode = int(uGlow[i].w + 0.5);
    float sp = uGlowP[i].x, ph = uGlowP[i].y;
    float k = 1.0;
    vec3 add = vec3(0.0);
    float dd = dot(d, d);
    float halo = exp(-dd / (r * r)) + 0.35 * exp(-dd / (r * r * 6.0));
    if (mode == 0) k = 0.6 + 0.4 * sin(t * sp + ph);
    else if (mode == 1) {
      k = 0.75 + 0.25 * vnoise(vec2(t * 9.0, float(i) * 7.0)) - 0.5 * step(0.95, hash21(vec2(floor(t * 8.0), float(i))));
      float fr = uFx2.w;
      if (fr > 0.0) {
        float strobe = step(0.42, hash21(vec2(floor(t * 32.0), float(i) + 11.0)));
        k = mix(k, 0.15 + strobe * 4.5, fr);
        add += uGlowC[i].rgb * (exp(-dd / (r * r * 14.0)) * 1.4 + exp(-dd / (r * r * 70.0)) * 0.6) * strobe * fr;
      }
    }
    else if (mode == 2) {
      float cyc = fract(t / sp + ph);
      float closed = smoothstep(0.0, 0.015, cyc) * smoothstep(0.06, 0.045, cyc);
      float twice = smoothstep(0.09, 0.105, cyc) * smoothstep(0.15, 0.135, cyc);
      float shut = max(closed, twice * step(0.5, hash21(vec2(floor(t / sp), 2.0))));
      float eye = exp(-dd / (r * r * 0.5)) * step(un.r * 1.2, un.g);
      col = mix(col, col * 0.08, eye * shut);
      k = (1.0 - shut) * (0.75 + 0.25 * sin(t * 1.3));
    }
    else if (mode == 3) {
      float a = t * sp * (1.0 + uWin) + ph;
      float face = pow(max(0.0, sin(a)), 3.0);
      float side = cos(a);
      vec2 dn = d / uGlowP[i].z;
      float along = dn.x * sign(side);
      float cone = step(0.0, along) * smoothstep(uGlowP[i].w * along + 0.03, 0.0, abs(dn.y - along * 0.1)) * smoothstep(1.0, 0.1, along);
      float haze = step(0.0, along) * exp(-abs(dn.y - along * 0.1) * 6.0) * smoothstep(0.8, 0.0, along);
      add += uGlowC[i].rgb * (cone * 1.3 + haze * 0.35) * pow(abs(side), 0.6);
      k = 0.35 + 1.4 * face;
      float dome = exp(-dd / (r * r * 0.35)) * smoothstep(0.35, 0.6, lum);
      col *= 1.0 + dome * face * 1.2;
    }
    else if (mode == 4) {
      k = 0.85 + 0.15 * sin(t * sp) + 0.08 * vnoise(vec2(t * 12.0, 5.0));
      float ang = atan(d.y, d.x);
      float rays = pow(0.5 + 0.5 * sin(ang * 14.0 + t * 0.7), 8.0) * exp(-sqrt(dd) / (r * 2.2)) * step(r * 0.5, sqrt(dd));
      add += uGlowC[i].rgb * rays * 0.45;
    }
    add += uGlowC[i].rgb * halo * uGlowC[i].a * k * (1.0 + uWin * 0.8);
    col += add;
    alpha += dot(add, vec3(0.33));
  }

  if (uLaserP > 0.0) {
    vec4 r = uLaser;
    float dx = min(abs(px.x - r.x - 3.0), abs(px.x - r.z + 3.0));
    float dy = min(abs(px.y - r.y - 3.0), abs(px.y - r.w + 3.0));
    bool inX = px.x > r.x && px.x < r.z, inY = px.y > r.y && px.y < r.w;
    float line = 0.0, s = 0.0;
    if (inX && dy < 6.0) { line = exp(-dy * dy / 2.5); s = px.x; }
    if (inY && dx < 6.0) { float l2 = exp(-dx * dx / 2.5); if (l2 > line) { line = l2; s = px.y * 1.3; } }
    float pulse = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(s * 0.03 - t * 6.0), 6.0);
    float on = 0.75 + 0.25 * sin(t * 3.0);
    vec3 lc = vec3(1.0, 0.1, 0.06) * line * pulse * on * uLaserP * (1.0 + uWin);
    col += lc;
    alpha += dot(lc, vec3(0.4));
  }

  for (int i = 0; i < 4; i++) {
    if (i >= uNSmoke) break;
    vec4 e = uSmoke[i];
    vec2 l = (px - e.xy) / vec2(e.w, e.z);
    l.y = -l.y;
    if (l.y > -0.05 && l.y < 1.0 && abs(l.x) < 2.5) {
      float seed = e.x * 0.013;
      float w = 0.3 + l.y * 0.9;
      float curl = sin(l.y * 5.0 - t * 1.1 + seed * 7.0) * 0.28 * l.y + sin(l.y * 11.0 - t * 1.9 + seed) * 0.08 * l.y;
      float x = (l.x - curl) / w;
      float n = fbm(vec2(l.x * 2.6 + seed * 5.0, l.y * 2.4 - t * 0.55)) * 0.7 + fbm(vec2(l.x * 6.0, l.y * 5.0 - t * 0.9 + seed)) * 0.3;
      float dens = smoothstep(1.0, 0.1, abs(x)) * smoothstep(0.2, 0.6, n) * smoothstep(1.0, 0.35, l.y) * smoothstep(-0.05, 0.08, l.y);
      if (uSmokeP[i].x > 0.5) {
        float cyc = fract(t * 0.28 + uSmokeP[i].y);
        float front = cyc * 1.6;
        dens *= smoothstep(front, front - 0.25, l.y) * smoothstep(front - 0.9, front - 0.45, l.y) * (1.0 - cyc * 0.5);
      }
      float a = dens * uSmokeC[i].a;
      col += uSmokeC[i].rgb * a * 1.1;
      alpha += a * 0.95;
    }
  }

  for (int i = 0; i < 8; i++) {
    if (i >= uNDrop) break;
    vec4 dr = uDrop[i];
    float cyc = fract(t * 0.32 + dr.z);
    float fall = cyc < 0.55 ? 0.0 : (cyc - 0.55) / 0.45;
    float grow = smoothstep(0.0, 0.55, cyc);
    vec2 c = dr.xy + vec2(0.0, fall * fall * 70.0 + grow * 4.0);
    vec2 d = (px - c) / vec2(4.5, 6.5 + fall * 4.0) / (0.6 + 0.4 * grow);
    float drop = smoothstep(1.0, 0.6, length(d)) * (1.0 - smoothstep(0.7, 1.0, fall));
    vec3 dc = mix(vec3(0.75, 0.48, 0.08), vec3(1.0, 0.85, 0.45), smoothstep(0.3, -0.6, d.y + d.x * 0.4));
    col = mix(col, dc, drop);
    alpha = max(alpha, drop);
  }

  bool inImg = px.x >= 0.0 && px.y >= 0.0 && px.x <= uImg.x && px.y <= uImg.y;
  float ef = inImg ? 1.0 : smoothstep(0.0, 0.05, q.x) * smoothstep(1.0, 0.95, q.x) * smoothstep(0.0, 0.05, q.y) * smoothstep(1.0, 0.95, q.y);
  col *= ef;
  alpha = clamp(alpha * ef, 0.0, 1.0);
  outColor = vec4(col, alpha);
}`;

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const im = new Image();
      im.decoding = "async";
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error("load " + src));
      im.src = src;
    });
  }

  function create(key, src) {
    const cfg = FRAMES[key];
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: true, premultipliedAlpha: true });
    if (!gl) return null;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, running = false, ready = false, win = 0, winTarget = 0, spinTarget = 0, spinLevel = 0, motT = 0, last = 0, frenzy = 0, frenzyTarget = 0, jerk = 1, jerkT = 0;
    const start = performance.now();
    const uni = {};

    function shader(type, s) {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, s);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
      return sh;
    }
    const prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    for (const n of ["uTex", "uRes", "uPad", "uImg", "uTime", "uMotT", "uWin", "uFx", "uFx2", "uRing", "uRingP", "uFlowMask", "uRot", "uRotW", "uNRot",
      "uGlow", "uGlowC", "uGlowP", "uNGlow", "uSmoke", "uSmokeC", "uSmokeP", "uNSmoke", "uBand", "uBandP", "uNBand", "uLaser", "uLaserP", "uDrop", "uNDrop"]) {
      uni[n] = gl.getUniformLocation(prog, n);
    }

    const pad = cfg.pad;
    const pack = (list, n, fn) => { const a = new Float32Array(n * 4); (list || []).forEach((it, i) => a.set(fn(it), i * 4)); return a; };
    gl.uniform1i(uni.uTex, 0);
    gl.uniform4f(uni.uFx, cfg.shine || 0, cfg.bloom || 0, cfg.neon || 0, cfg.flicker || 0);
    gl.uniform4f(uni.uFx2, cfg.flow || 0, cfg.spark || 0, cfg.bandSpeed || 0, 0);
    const ring = cfg.ring;
    gl.uniform4fv(uni.uRing, ring ? ring.rect : [0, 0, 0, 0]);
    gl.uniform4f(uni.uRingP, ring ? ring.hw : 0, ring ? ring.spacing : 1, ring ? ring.speed : 0, ring ? 1 : 0);
    gl.uniform4fv(uni.uFlowMask, cfg.flowMask || [0, 0, 0, 0]);
    gl.uniform4fv(uni.uRot, pack(cfg.rots, 4, (r) => [r.c[0], r.c[1], r.r, r.speed || 0]));
    gl.uniform4fv(uni.uRotW, pack(cfg.rots, 4, (r) => [r.wob || 0, r.wobf || 0, 0, 0]));
    gl.uniform1i(uni.uNRot, (cfg.rots || []).length);
    gl.uniform4fv(uni.uGlow, pack(cfg.glows, 6, (g) => [g.c[0], g.c[1], g.r, MODES[g.mode]]));
    gl.uniform4fv(uni.uGlowC, pack(cfg.glows, 6, (g) => [...g.color, g.power]));
    gl.uniform4fv(uni.uGlowP, pack(cfg.glows, 6, (g) => [g.speed || 1, g.phase || 0, g.len || 1, g.spread || 0]));
    gl.uniform1i(uni.uNGlow, (cfg.glows || []).length);
    gl.uniform4fv(uni.uSmoke, pack(cfg.smoke, 4, (s) => [s.p[0], s.p[1], s.h, s.w]));
    gl.uniform4fv(uni.uSmokeC, pack(cfg.smoke, 4, (s) => [...s.color, s.amount]));
    gl.uniform4fv(uni.uSmokeP, pack(cfg.smoke, 4, (s) => [s.puff || 0, s.phase || 0, 0, 0]));
    gl.uniform1i(uni.uNSmoke, (cfg.smoke || []).length);
    gl.uniform4fv(uni.uBand, pack(cfg.bands, 6, (b) => b.rect));
    gl.uniform4fv(uni.uBandP, pack(cfg.bands, 6, (b) => [b.dir[0], b.dir[1], b.period, 0]));
    gl.uniform1i(uni.uNBand, (cfg.bands || []).length);
    gl.uniform4fv(uni.uLaser, cfg.laser ? cfg.laser.rect : [0, 0, 0, 0]);
    gl.uniform1f(uni.uLaserP, cfg.laser ? cfg.laser.power : 0);
    gl.uniform4fv(uni.uDrop, pack(cfg.drops, 8, (d) => [d[0], d[1], d[2], 0]));
    gl.uniform1i(uni.uNDrop, (cfg.drops || []).length);
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      const s = Math.min(dpr, 2200 / w);
      const W = Math.round(w * s), H = Math.round(h * s);
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
      gl.viewport(0, 0, W, H);
    }
    function draw(now) {
      win += (winTarget - win) * 0.08;
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      spinLevel += (spinTarget - spinLevel) * Math.min(1, dt * (spinTarget > spinLevel ? 6 : 2.5));
      frenzy += (frenzyTarget - frenzy) * Math.min(1, dt * (frenzyTarget > frenzy ? 10 : 3));
      if (now - jerkT > 90) { jerkT = now; jerk = 0.35 + Math.random() * 1.6; }
      motT += dt * (cfg.spinOnly ? spinLevel * 2.2 : 1 + win * 1.5) + dt * frenzy * 9 * jerk;
      gl.uniform1f(uni.uMotT, motT);
      gl.uniform4f(uni.uFx2, cfg.flow || 0, cfg.spark || 0, cfg.bandSpeed || 0, frenzy);
      gl.uniform2f(uni.uRes, canvas.width, canvas.height);
      gl.uniform1f(uni.uTime, reduced ? 3.0 : (now - start) / 1000);
      gl.uniform1f(uni.uWin, win);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    function loop(now) {
      if (!running) return;
      if (!document.hidden) draw(now);
      raf = requestAnimationFrame(loop);
    }
    const ro = new ResizeObserver(() => { resize(); if (ready) draw(performance.now()); });
    ro.observe(canvas);

    const api = {
      el: canvas,
      pad,
      size: null,
      play() {
        if (running) return;
        running = true;
        if (reduced) { if (ready) draw(performance.now()); return; }
        raf = requestAnimationFrame(loop);
      },
      pause() { running = false; last = 0; cancelAnimationFrame(raf); },
      spin(on) { spinTarget = on ? 1 : 0; },
      win(on) { winTarget = on ? 1 : 0; },
      frenzy(on) { frenzyTarget = on ? 1 : 0; },
    };
    api.ready = loadImage(src).then((img) => {
      const tx = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.uniform2f(uni.uImg, img.naturalWidth, img.naturalHeight);
      gl.uniform4f(uni.uPad, pad[0] / (1 + pad[0] + pad[2]), pad[1] / (1 + pad[1] + pad[3]), pad[2] / (1 + pad[0] + pad[2]), pad[3] / (1 + pad[1] + pad[3]));
      api.size = [img.naturalWidth, img.naturalHeight];
      ready = true;
      resize();
      draw(performance.now());
    });
    return api;
  }

  window.MatouFrameFX = { has: (k) => !!FRAMES[k], create };
})();
