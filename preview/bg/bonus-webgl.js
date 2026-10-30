(function () {
  // positions are in image UV (0..1, y down); lights: [x, y, radius, flicker, r, g, b, intensity]
  // smoke: [cx, cy, rx, ry, flowX, flowY, speed, dragDist, r, g, b, overlay]
  const SCENES = {
    heist: {
      aspect: 16 / 9,
      lights: [
        [0.507, 0.035, 0.07, 0.15, 0.5, 1.0, 0.85, 0.5],
        [0.06, 0.61, 0.05, 0.28, 1.0, 0.85, 0.45, 0.6],
        [0.345, 0.61, 0.03, 0.3, 1.0, 0.85, 0.45, 0.5],
        [0.79, 0.6, 0.035, 0.3, 1.0, 0.85, 0.45, 0.5],
        [0.94, 0.61, 0.05, 0.28, 1.0, 0.85, 0.45, 0.6],
        [0.82, 0.47, 0.03, 0.12, 1.0, 0.95, 0.8, 0.7],
      ],
      smoke: [
        [0.5, 0.88, 0.6, 0.14, 1.0, 0.0, 0.02, 0.0, 0.5, 0.75, 0.7, 0.14],
        [0.52, 0.45, 0.2, 0.25, -1.0, -0.3, 0.02, 0.0, 0.45, 0.7, 0.65, 0.1],
      ],
      beam: { o: [0.815, 0.47], angle: -3.04, half: 0.2, amp: 0.13, speed: 0.33, len: 0.78, power: 0.24, color: [0.95, 0.93, 0.8] },
      spot: [0.9, 0.11, 0.22],
      dust: [0.85, 0.95, 0.9, 0.35], rise: 0.012, glint: 0.25,
    },
    "gold-train": {
      aspect: 16 / 9,
      lights: [
        [0.156, 0.165, 0.05, 0.3, 1.0, 0.25, 0.12, 0.55],
        [0.225, 0.26, 0.035, 0.3, 1.0, 0.75, 0.35, 0.5],
        [0.237, 0.36, 0.015, 0.5, 1.0, 0.2, 0.1, 0.6],
        [0.872, 0.165, 0.05, 0.25, 1.0, 0.75, 0.35, 0.55],
        [0.796, 0.234, 0.035, 0.3, 1.0, 0.75, 0.35, 0.5],
        [0.705, 0.304, 0.03, 0.1, 1.0, 0.9, 0.6, 0.7],
        [0.496, 0.316, 0.02, 0.3, 1.0, 0.75, 0.4, 0.4],
      ],
      smoke: [
        [0.47, 0.1, 0.24, 0.13, -0.35, -1.0, 0.06, 0.045, 1.0, 0.85, 0.55, 0.18],
        [0.652, 0.1, 0.05, 0.09, -0.2, -1.0, 0.1, 0.03, 1.0, 0.85, 0.55, 0.15],
        [0.29, 0.27, 0.05, 0.17, 0.05, -1.0, 0.07, 0.04, 1.0, 0.85, 0.55, 0.12],
        [0.51, 0.6, 0.13, 0.065, -1.0, -0.25, 0.05, 0.04, 1.0, 0.9, 0.7, 0.2],
      ],
      beam: null,
      dust: [1.0, 0.75, 0.4, 0.45], rise: 0.03, glint: 1.0,
    },
  };

  const VERT = `#version 300 es
in vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;

  const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform float uAsp;
uniform float uTime;
uniform float uWin;
uniform vec4 uL[8];
uniform vec4 uLC[8];
uniform int uNL;
uniform vec4 uS[4];
uniform vec4 uSF[4];
uniform vec4 uSC[4];
uniform int uNS;
uniform vec4 uB;
uniform vec4 uB2;
uniform vec3 uBC;
uniform vec4 uDust;
uniform float uRise;
uniform float uGlint;
uniform vec3 uSpot;
out vec4 outColor;

float hash21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1,0)), u.x), mix(hash21(i + vec2(0,1)), hash21(i + vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }

vec2 toUV(vec2 p){
  float ca = uRes.x / uRes.y;
  vec2 uv = p - 0.5;
  if (ca > uAsp) uv.y *= uAsp / ca; else uv.x *= ca / uAsp;
  float zoom = 1.035 + 0.012 * sin(uTime * 0.13);
  vec2 pan = vec2(sin(uTime * 0.07), cos(uTime * 0.053)) * 0.004;
  return uv / zoom + 0.5 + pan;
}

void main(){
  vec2 p = gl_FragCoord.xy / uRes;
  p.y = 1.0 - p.y;
  float ca = uRes.x / uRes.y;
  vec2 uv = toUV(p);
  vec3 base = texture(uTex, uv).rgb;
  vec3 col = base;
  float lum = dot(base, vec3(0.3, 0.55, 0.15));

  for (int i = 0; i < 4; i++) {
    if (i >= uNS) break;
    vec2 d = (uv - uS[i].xy) / uS[i].zw;
    float m = smoothstep(1.0, 0.35, length(d));
    if (m <= 0.001) continue;
    vec2 fl = normalize(uSF[i].xy);
    vec2 wob = (vec2(fbm(uv * 4.0 + vec2(uTime * 0.05, 0.0)), fbm(uv * 4.0 + vec2(0.0, uTime * 0.05) + 5.0)) - 0.5) * 0.7;
    vec2 f = fl + wob;
    if (uSF[i].w > 0.0) {
      float nz = fbm(uv * 6.0 + float(i) * 7.0);
      float ph0 = fract(uTime * uSF[i].z + nz * 0.5);
      float ph1 = fract(ph0 + 0.5);
      vec3 c0 = texture(uTex, uv - f * ph0 * uSF[i].w).rgb;
      vec3 c1 = texture(uTex, uv - f * ph1 * uSF[i].w).rgb;
      vec3 flowed = mix(c0, c1, abs(1.0 - 2.0 * ph0));
      col = mix(col, flowed, m * smoothstep(0.18, 0.42, lum));
    }
    vec2 q = vec2(uv.x * uAsp, uv.y) * 4.0 - fl * uTime * 0.09 + wob * 0.5;
    float n = fbm(q) * 0.65 + fbm(q * 2.1 - fl * uTime * 0.05) * 0.35;
    col += uSC[i].rgb * smoothstep(0.48, 0.82, n) * m * uSC[i].a;
  }

  for (int i = 0; i < 8; i++) {
    if (i >= uNL) break;
    vec2 d = vec2((uv.x - uL[i].x) * uAsp, uv.y - uL[i].y);
    float r = uL[i].z;
    float g = exp(-dot(d, d) / (r * r));
    float gw = exp(-dot(d, d) / (r * r * 9.0));
    float fi = float(i);
    float fl = 1.0 + (vnoise(vec2(uTime * (6.0 + fi), fi * 11.0)) - 0.5) * 2.0 * uL[i].w;
    fl *= mix(1.0, step(0.07, vnoise(vec2(uTime * 1.9, fi * 37.0))), uL[i].w);
    col *= 1.0 + g * (fl - 1.0) * 0.9;
    col += uLC[i].rgb * uLC[i].a * (g * 0.55 + gw * 0.18) * (0.55 * fl + uWin * 0.8);
  }

  float beam = 0.0;
  if (uB2.w > 0.0) {
    vec2 d = vec2((uv.x - uB.x) * uAsp, uv.y - uB.y);
    float dist = length(d);
    float tgt = uB.z + uB2.x * sin(uTime * uB2.y) + 0.02 * sin(uTime * 1.7);
    float ang = atan(d.y, d.x);
    float da = abs(atan(sin(ang - tgt), cos(ang - tgt)));
    float cone = smoothstep(uB.w, uB.w * 0.2, da);
    float fall = smoothstep(uB2.z, 0.0, dist) * smoothstep(0.0, 0.03, dist);
    float vol = 0.5 + 0.5 * fbm(vec2(dist * 7.0 - uTime * 0.35, da * 18.0));
    float fl = 0.92 + 0.08 * vnoise(vec2(uTime * 9.0, 3.0));
    beam = cone * fall * vol * fl;
    col += uBC * beam * uB2.w;
  }

  if (uSpot.x > 0.0) {
    float st = uTime * uSpot.z;
    vec2 sp = vec2(0.5 + 0.44 * sin(st) + 0.03 * sin(st * 3.1), 0.36 + 0.2 * sin(st * 1.63 + 1.0));
    vec2 d = vec2((uv.x - sp.x) * uAsp, uv.y - sp.y);
    float r = uSpot.y * (1.0 + 0.08 * sin(uTime * 2.3));
    float spot = smoothstep(r, r * 0.25, length(d * vec2(1.0, 1.35)));
    float jit = 0.9 + 0.1 * vnoise(vec2(uTime * 11.0, 1.0));
    col += col * spot * uSpot.x * 1.8 * jit + vec3(0.95, 0.93, 0.8) * spot * 0.035;
    beam = max(beam, spot * 0.5);
  }

  float dust = 0.0;
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float sc = 16.0 + fk * 13.0;
    vec2 q = vec2(p.x * ca, p.y) * sc + vec2(sin(uTime * 0.1 + fk) * 0.6, uTime * uRise * sc * (0.6 + 0.3 * fk));
    vec2 id = floor(q);
    vec2 f = fract(q) - 0.5;
    float h = hash21(id + fk * 31.0);
    if (h < 0.62) continue;
    vec2 c = (vec2(hash21(id + 1.3), hash21(id + 4.7)) - 0.5) * 0.6 + 0.14 * vec2(sin(uTime * 0.7 + h * 20.0), cos(uTime * 0.5 + h * 13.0));
    float s = smoothstep(0.075 - fk * 0.015, 0.0, length(f - c));
    dust += s * (0.5 + 0.5 * sin(uTime * (1.0 + h * 2.0) + h * 30.0)) * (0.45 + 0.3 * fk);
  }
  col += uDust.rgb * dust * uDust.a * (1.0 + beam * 7.0);

  if (uGlint > 0.0) {
    float gs = 26.0;
    vec2 gq = vec2(p.x * ca, p.y) * gs;
    vec2 gid = floor(gq);
    vec2 gf = fract(gq) - 0.5;
    float h = hash21(gid + 9.1);
    vec2 jit = (vec2(hash21(gid + 2.0), hash21(gid + 5.0)) - 0.5) * 0.5;
    vec2 pc = (gid + 0.5 + jit) / gs; pc.x /= ca;
    vec3 cc = texture(uTex, toUV(pc)).rgb;
    float gold = smoothstep(0.42, 0.7, cc.r) * step(cc.b * 1.5, cc.r);
    float tw = pow(max(0.0, sin(uTime * (0.7 + h * 1.4) + h * 40.0)), 28.0) * step(0.5, h);
    vec2 d = gf - jit;
    float star = (exp(-abs(d.x) * 55.0) * exp(-abs(d.y) * 8.0) + exp(-abs(d.y) * 55.0) * exp(-abs(d.x) * 8.0)) * 0.8 + exp(-dot(d, d) * 300.0);
    col += vec3(1.0, 0.9, 0.62) * star * tw * gold * uGlint;
  }

  col += (hash21(gl_FragCoord.xy + fract(uTime * 7.0) * 100.0) - 0.5) * 0.02;
  outColor = vec4(col, 1.0);
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
    const sc = SCENES[key];
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "high-performance" });
    if (!gl) return null;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, start = performance.now(), running = false, ready = false, win = 0, winTarget = 0;
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
    for (const n of ["uTex", "uRes", "uAsp", "uTime", "uWin", "uL", "uLC", "uNL", "uS", "uSF", "uSC", "uNS", "uB", "uB2", "uBC", "uDust", "uRise", "uGlint", "uSpot"]) uni[n] = gl.getUniformLocation(prog, n);

    const L = new Float32Array(32), LC = new Float32Array(32);
    sc.lights.forEach((l, i) => { L.set(l.slice(0, 4), i * 4); LC.set(l.slice(4, 8), i * 4); });
    const S = new Float32Array(16), SF = new Float32Array(16), SC = new Float32Array(16);
    sc.smoke.forEach((s, i) => { S.set(s.slice(0, 4), i * 4); SF.set(s.slice(4, 8), i * 4); SC.set(s.slice(8, 12), i * 4); });
    gl.uniform1i(uni.uTex, 0);
    gl.uniform1f(uni.uAsp, sc.aspect);
    gl.uniform4fv(uni.uL, L); gl.uniform4fv(uni.uLC, LC); gl.uniform1i(uni.uNL, sc.lights.length);
    gl.uniform4fv(uni.uS, S); gl.uniform4fv(uni.uSF, SF); gl.uniform4fv(uni.uSC, SC); gl.uniform1i(uni.uNS, sc.smoke.length);
    const b = sc.beam;
    gl.uniform4f(uni.uB, b ? b.o[0] : 0, b ? b.o[1] : 0, b ? b.angle : 0, b ? b.half : 0);
    gl.uniform4f(uni.uB2, b ? b.amp : 0, b ? b.speed : 0, b ? b.len : 0, b ? b.power : 0);
    gl.uniform3fv(uni.uBC, b ? b.color : [0, 0, 0]);
    gl.uniform4fv(uni.uDust, sc.dust);
    gl.uniform1f(uni.uRise, sc.rise);
    gl.uniform1f(uni.uGlint, sc.glint);
    gl.uniform3fv(uni.uSpot, sc.spot || [0, 0, 0]);

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
      const s = Math.min(dpr, 2560 / Math.max(1, w));
      const W = Math.max(1, Math.round(w * s)), H = Math.max(1, Math.round(h * s));
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
      gl.viewport(0, 0, W, H);
    }
    function draw(now) {
      win += (winTarget - win) * 0.08;
      gl.uniform2f(uni.uRes, canvas.width, canvas.height);
      gl.uniform1f(uni.uTime, reduced ? 6.0 : (now - start) / 1000);
      gl.uniform1f(uni.uWin, win);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    function loop(now) {
      if (!running) return;
      if (!document.hidden) draw(now);
      raf = requestAnimationFrame(loop);
    }
    const ro = new ResizeObserver(() => { resize(); if (ready && !running) draw(performance.now()); });
    ro.observe(canvas);

    loadImage(src).then((img) => {
      const t = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      ready = true;
      resize();
      draw(performance.now());
    }).catch((e) => console.error(e));

    return {
      el: canvas,
      play() {
        if (running || reduced) return;
        running = true;
        raf = requestAnimationFrame(loop);
      },
      pause() { running = false; cancelAnimationFrame(raf); },
      win(on) { winTarget = on ? 1 : 0; },
    };
  }

  window.MatouBonusFX = { has: (k) => !!SCENES[k], create };
})();
