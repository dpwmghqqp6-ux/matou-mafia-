(function () {
  const BASE = "./assets/matou/bg-a/";
  const IMG_ASPECT = 3840 / 2143;
  const HORIZON = 0.655;

  const VERT = `#version 300 es
in vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;

  const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform sampler2D uAux;
uniform vec2 uRes;
uniform float uImgAspect;
uniform float uTime;
uniform vec2 uCam;
uniform float uFlash;
uniform float uWin;
uniform float uBoost;
uniform float uHorizon;
out vec4 outColor;

float hash11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1,0)), u.x), mix(hash21(i + vec2(0,1)), hash21(i + vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }

vec2 coverUV(vec2 p){
  float ca = uRes.x / uRes.y;
  vec2 uv = p - 0.5;
  if (ca > uImgAspect) uv.y *= uImgAspect / ca; else uv.x *= ca / uImgAspect;
  return uv / 1.035 + 0.5;
}

float rainLayer(vec2 p, float ca, float cols, float speed, float len, float width, float seed){
  vec2 r = vec2(p.x * ca + p.y * 0.16, p.y);
  float cx = r.x * cols;
  float col = floor(cx);
  float h = hash11(col * 1.37 + seed);
  float on = step(0.42, h);
  float fx = abs(fract(cx) - 0.5 - (h - 0.5) * 0.6);
  float y = fract(r.y * (1.2 + h * 0.6) - uTime * speed * (0.8 + 0.5 * h) + h * 7.0);
  float streak = smoothstep(len, 0.0, y) * smoothstep(0.0, 0.015, y);
  return on * streak * smoothstep(width, 0.0, fx);
}

vec2 ripples(vec2 uv, float gy, out float ring){
  float dens = mix(55.0, 14.0, gy);
  vec2 q = vec2(uv.x * uImgAspect, uv.y * 2.8) * dens;
  vec2 n = vec2(0.0);
  ring = 0.0;
  for (int k = 0; k < 2; k++){
    vec2 qq = q + float(k) * vec2(0.37, 0.61);
    vec2 id = floor(qq);
    vec2 f = fract(qq) - 0.5;
    float h = hash21(id + float(k) * 13.0);
    float t = fract(uTime * (0.55 + 0.35 * h) + h * 9.0);
    vec2 c = (vec2(hash21(id + 3.1), hash21(id + 7.7)) - 0.5) * 0.5;
    vec2 d = f - c;
    float rad = t * 0.42;
    float dist = length(d);
    float w = smoothstep(0.05, 0.0, abs(dist - rad)) * (1.0 - t) * step(0.35, h);
    ring += w;
    n += normalize(d + 1e-4) * w;
  }
  return n;
}

void main(){
  vec2 p = gl_FragCoord.xy / uRes;
  p.y = 1.0 - p.y;
  float ca = uRes.x / uRes.y;
  vec2 uv0 = coverUV(p);
  vec2 uv = uv0;
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
  vec3 col = texture(uTex, uv).rgb;
  float emis = texture(uAux, uv).b;
  float glow = textureLod(uAux, uv, 4.5).b;
  float glowWide = textureLod(uAux, uv, 6.5).b;

  vec2 cell = floor(uv * vec2(26.0, 15.0));
  float hc = hash21(cell);
  float flick = 1.0 + (vnoise(vec2(uTime * (4.0 + 6.0 * hc), hc * 40.0)) - 0.5) * (hc > 0.72 ? 0.55 : 0.16);
  if (hc > 0.93) flick *= step(0.06, vnoise(vec2(uTime * 2.3, hc * 90.0)));
  float lightGain = flick + uWin * (0.9 + 0.5 * sin(uTime * 14.0)) + uBoost * 0.35;
  col += col * emis * (lightGain - 1.0) * 0.9;
  vec3 warm = vec3(1.0, 0.70, 0.36);
  col += warm * (glow * 0.32 + glowWide * 0.22) * lightGain;

  if (wet > 0.01) {
    float refl = 0.18 + glow * 1.4 + glowWide * 0.6;
    col += mix(vec3(0.55, 0.75, 0.9), warm, clamp(glow * 2.0, 0.0, 1.0)) * ring * wet * refl * 0.45 * free;
  }

  vec2 fp = uv * vec2(3.2, 5.0);
  float fogN = fbm(fp + vec2(uTime * 0.035, uTime * 0.008)) * 0.6 + fbm(fp * 1.9 - vec2(uTime * 0.05, 0.0)) * 0.4;
  float centerFar = (1.0 - depth);
  float lowBand = smoothstep(0.45, 0.68, uv.y) * smoothstep(0.86, 0.66, uv.y);
  float fogAmt = clamp(centerFar * 0.55 + lowBand * 0.35, 0.0, 1.0) * smoothstep(0.35, 0.8, fogN);
  vec3 fogCol = mix(vec3(0.19, 0.33, 0.38), warm * 0.8, clamp(glowWide * 1.6, 0.0, 0.8));
  col = mix(col, col + fogCol * 0.55, fogAmt * 0.55);

  float lit = 0.26 + glow * 2.0 + glowWide * 1.0;
  float r1 = rainLayer(p, ca, 140.0, 1.9, 0.10, 0.12, 1.0);
  float r2 = rainLayer(p + 0.31, ca, 80.0, 1.45, 0.13, 0.10, 7.0);
  float r3 = rainLayer(p + 0.73, ca, 38.0, 1.05, 0.18, 0.08, 19.0);
  vec3 rainCol = mix(vec3(0.62, 0.74, 0.82), warm, clamp(glow * 2.2, 0.0, 1.0));
  col += rainCol * (r1 * 0.13 + r2 * 0.2 + r3 * 0.16) * lit * mix(1.0, 0.35, carZone);

  col += vec3(0.70, 0.80, 1.0) * uFlash * (0.18 + 0.55 * centerFar);

  float g = hash21(gl_FragCoord.xy + fract(uTime * 7.0) * 100.0) - 0.5;
  col += g * 0.022;
  outColor = vec4(col, 1.0);
}`;

  let canvas, gl, prog, raf = 0, start = 0, uni = {}, texs = [], onVis = null, onMove = null, ro = null;
  let flash = 0, win = 0, winTarget = 0, boost = 0, boostTarget = 0, mouse = [0, 0], cam = [0, 0], reducedMode = false;
  let auxPx = null, auxW = 0, auxH = 0, catEl = null, catK = 0, catScale = 0, anchorTick = 0;

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const im = new Image();
      im.decoding = "async";
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error("load " + src));
      im.src = src;
    });
  }

  function shader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  function texture(img, unit) {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const af = gl.getExtension("EXT_texture_filter_anisotropic");
    if (af) gl.texParameterf(gl.TEXTURE_2D, af.TEXTURE_MAX_ANISOTROPY_EXT, 4);
    texs.push(t);
    return t;
  }

  function readAux(img) {
    auxW = 256; auxH = Math.round(256 / IMG_ASPECT);
    const c = document.createElement("canvas");
    c.width = auxW; c.height = auxH;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(img, 0, 0, auxW, auxH);
    auxPx = g.getImageData(0, 0, auxW, auxH).data;
  }

  // Parallax shift of the ground under the cat's feet, so the DOM cat moves with the street.
  function measureCat() {
    catEl = catEl || document.getElementById("catWrap");
    if (!catEl || !canvas || !auxPx) return;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    const ca = w / h;
    let ux = (catEl.offsetLeft + catEl.offsetWidth * 0.5) / w - 0.5;
    let uy = (catEl.offsetTop + catEl.offsetHeight * 0.97) / h - 0.5;
    if (ca > IMG_ASPECT) uy *= IMG_ASPECT / ca; else ux *= ca / IMG_ASPECT;
    ux = ux / 1.035 + 0.5; uy = uy / 1.035 + 0.5;
    const ix = Math.min(auxW - 1, Math.max(0, Math.round(ux * (auxW - 1))));
    const iy = Math.min(auxH - 1, Math.max(0, Math.round(uy * (auxH - 1))));
    const depth = auxPx[(iy * auxW + ix) * 4] / 255;
    catK = (depth - 0.35) * 0.014;
    catScale = 1.035 * Math.max(w, h * IMG_ASPECT);
  }

  function anchorCat() {
    if (!catEl) return;
    const off = reducedMode || document.getElementById("stage")?.classList.contains("vault");
    const dx = off ? 0 : -cam[0] * catK * catScale;
    const dy = off ? 0 : -cam[1] * catK * catScale / IMG_ASPECT;
    catEl.style.translate = `${dx.toFixed(2)}px ${dy.toFixed(2)}px`;
  }

  function resize() {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const scale = Math.min(dpr, 2880 / Math.max(1, w));
    const W = Math.max(1, Math.round(w * scale)), H = Math.max(1, Math.round(h * scale));
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    if (gl) gl.viewport(0, 0, W, H);
    measureCat();
    if (reducedMode) draw(performance.now());
  }

  function draw(now) {
    const t = (now - start) / 1000;
    const dt = 1 / 60;
    win += (winTarget - win) * Math.min(1, dt * 6);
    boost += (boostTarget - boost) * Math.min(1, dt * 4);
    flash *= 0.9;
    const tx = Math.sin(t * 0.11) * 0.55 + mouse[0] * 0.45;
    const ty = Math.cos(t * 0.083) * 0.35 + mouse[1] * 0.3;
    cam[0] += (tx - cam[0]) * 0.03;
    cam[1] += (ty - cam[1]) * 0.03;
    gl.uniform2f(uni.uRes, canvas.width, canvas.height);
    gl.uniform1f(uni.uTime, reducedMode ? 4.0 : t);
    gl.uniform2f(uni.uCam, reducedMode ? 0 : cam[0], reducedMode ? 0 : cam[1]);
    if ((anchorTick++ & 63) === 0) measureCat();
    anchorCat();
    gl.uniform1f(uni.uFlash, flash);
    gl.uniform1f(uni.uWin, win);
    gl.uniform1f(uni.uBoost, boost);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function loop(now) {
    draw(now);
    raf = requestAnimationFrame(loop);
  }

  async function mount(host, { reduced }) {
    reducedMode = reduced;
    canvas = document.createElement("canvas");
    host.appendChild(canvas);
    gl = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "high-performance" });
    if (!gl) {
      const img = document.createElement("img");
      img.src = BASE + "alley.jpg";
      img.alt = "";
      host.replaceChild(img, canvas);
      canvas = null;
      return;
    }
    const [plate, aux] = await Promise.all([
      loadImage(BASE + "alley.jpg"),
      loadImage(BASE + "alley-aux.png"),
    ]);
    if (!canvas) return;
    prog = gl.createProgram();
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
    for (const n of ["uTex", "uAux", "uRes", "uImgAspect", "uTime", "uCam", "uFlash", "uWin", "uBoost", "uHorizon"]) uni[n] = gl.getUniformLocation(prog, n);
    readAux(aux);
    texture(plate, 0);
    texture(aux, 1);
    gl.uniform1i(uni.uTex, 0);
    gl.uniform1i(uni.uAux, 1);
    gl.uniform1f(uni.uImgAspect, IMG_ASPECT);
    gl.uniform1f(uni.uHorizon, HORIZON);
    start = performance.now();
    ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    if (reduced) { draw(start); return; }
    onMove = (e) => { mouse = [(e.clientX / innerWidth - 0.5) * 2, (e.clientY / innerHeight - 0.5) * 2]; };
    addEventListener("pointermove", onMove);
    onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(loop);
    };
    document.addEventListener("visibilitychange", onVis);
    raf = requestAnimationFrame(loop);
  }

  function unmount() {
    cancelAnimationFrame(raf);
    if (onVis) document.removeEventListener("visibilitychange", onVis);
    if (onMove) removeEventListener("pointermove", onMove);
    if (ro) ro.disconnect();
    if (gl) {
      texs.forEach((t) => gl.deleteTexture(t));
      if (prog) gl.deleteProgram(prog);
      const lose = gl.getExtension("WEBGL_lose_context");
      if (lose) lose.loseContext();
    }
    if (catEl) catEl.style.translate = "";
    catEl = null; auxPx = null;
    canvas = gl = prog = ro = onVis = onMove = null;
    texs = [];
    win = winTarget = boost = boostTarget = flash = 0;
  }

  window.MatouBG.register("a", {
    mount,
    unmount,
    resize,
    lightning() { flash = 1; },
    windowsWin(on) { winTarget = on ? 1 : 0; },
    neonBoost(on) { boostTarget = on ? 1 : 0; },
  });
})();
