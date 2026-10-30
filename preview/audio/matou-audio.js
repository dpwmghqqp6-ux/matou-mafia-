(function (root) {
  "use strict";
  const STORE_MUSIC = "matou.music";
  const STORE_PACK = "matou.sfxpack";
  const TAU = Math.PI * 2;
  const SR_T = 24000;
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const acc = (a) => (a === "#" ? 1 : a === "b" ? -1 : 0);

  function midi(s) {
    const m = /^([A-G])(#|b)?(-?\d)$/.exec(s);
    if (!m) throw new Error("MatouAudio: bad note " + s);
    return 12 * (+m[3] + 1) + NOTE[m[1]] + acc(m[2]);
  }
  function phrase(bars, spb) {
    const map = {}, bad = [];
    bars.forEach((bar, bi) => {
      let t = 0;
      bar.trim().split(/\s+/).forEach((tok) => {
        const [p, l] = tok.split(":"), len = l ? +l : 1;
        if (p !== "-") (map[bi * spb + t] = map[bi * spb + t] || []).push([midi(p), len]);
        t += len;
      });
      if (t !== spb) bad.push(bi + 1);
    });
    map.bad = bad;
    return map;
  }

  const QUAL = {
    "": [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], 6: [0, 4, 7, 9],
    m6: [0, 3, 7, 9], dim7: [0, 3, 6, 9], m7b5: [0, 3, 6, 10], "7b9": [0, 4, 7, 10, 13], "7#9": [0, 4, 7, 10, 15],
    m9: [0, 3, 7, 10, 14], 9: [0, 4, 7, 10, 14],
  };
  function chord(name) {
    const m = /^([A-G])(#|b)?(.*)$/.exec(name);
    return { root: (NOTE[m[1]] + acc(m[2]) + 12) % 12, iv: QUAL[m[3]] };
  }
  const bassRoot = (c) => 33 + ((c.root - 9 + 12) % 12);
  function voicing(c, center, rootless = true) {
    const iv = rootless && c.iv.length >= 4 ? c.iv.slice(1) : c.iv;
    return iv.map((x) => {
      let p = c.root + x;
      while (p < center - 6) p += 12;
      while (p > center + 6) p -= 12;
      return p;
    }).sort((a, b) => a - b);
  }
  function arp(c, low, count) {
    const pcs = c.iv.map((x) => (c.root + x) % 12), out = [];
    for (let p = low; out.length < count && p < low + 60; p++) if (pcs.includes(((p % 12) + 12) % 12)) out.push(p);
    return out;
  }
  function walk(c, next, beat, rng) {
    const r = bassRoot(c), nr = bassRoot(next);
    if (beat === 0) return r;
    if (beat === 1) return r + (rng() < 0.5 ? c.iv[1] : c.iv[2]);
    if (beat === 2) return r + (rng() < 0.6 ? c.iv[2] : 12);
    return nr + (rng() < 0.5 ? -1 : 1);
  }
  function rng32(seed) {
    return function () {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const SCALE = {
    aMin: [9, 11, 0, 2, 4, 5, 7, 8], aDor: [9, 11, 0, 2, 4, 6, 7], cBlues: [0, 3, 5, 6, 7, 10],
    dMin: [2, 4, 5, 7, 9, 10, 1], eMin: [4, 6, 7, 9, 11, 0, 3],
  };
  const RHY = [[0, 2, 3, 4, 6], [0, 1, 2, 4, 5, 6], [1, 2, 3, 5, 6, 7], [0, 3, 4, 6, 7], [0, 2, 4, 6], [0, 1, 2, 3, 4, 6], [0, 3, 6]];
  function stepScale(scale, p, dir) {
    for (let k = 1; k < 12; k++) { const q = p + dir * k; if (scale.includes(((q % 12) + 12) % 12)) return q; }
    return p;
  }
  function improv(c, scale, low, high, rng, spb, last) {
    const r = RHY[Math.floor(rng() * RHY.length)].filter((s) => s < spb), tones = arp(c, low, 16), out = [];
    let p = last || low + 7;
    r.forEach((s, k) => {
      if (s % 4 === 0 || rng() < 0.25) {
        const target = p + (rng() < 0.5 ? -3 : 3);
        p = tones.reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a), tones[0]);
      } else p = stepScale(scale, p, rng() < 0.55 ? 1 : -1);
      while (p > high) p -= 12;
      while (p < low) p += 12;
      out.push([s, p, (r[k + 1] != null ? r[k + 1] : spb) - s]);
    });
    return { notes: out, last: p };
  }

  // ---------- context & buses ----------
  let ctx = null, sr = 48000, master, sfxIn, sfxRevIn, musIn, musRevIn, musOut, musDrive, musHP, musLP, musMid, musLvl, wowGain, flutGain;
  let noiseBuf, crackleSrc, crackleGain;
  let vol = { sfx: 0.7, music: 0.5 }, muted = false;
  const MUS_TRIM = 0.3;
  let mode = "base", seqTimer = 0, seqStep = 0, seqNext = 0, playing = null, style = null;
  const cache = new Map();

  function impulse(sec, damp) {
    const len = Math.floor(sec * sr), b = ctx.createBuffer(2, len, sr), pre = Math.floor(0.014 * sr);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      let y = 0;
      for (let i = pre; i < len; i++) {
        const k = (i - pre) / (len - pre), a = 0.85 - (0.85 - damp) * k;
        y += a * ((Math.random() * 2 - 1) - y);
        d[i] = y * Math.pow(1 - k, 2.4);
      }
    }
    return b;
  }
  function crackleBuffer() {
    const n = sr * 5, b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) {
      d[i] += (Math.random() * 2 - 1) * 0.012;
      if (Math.random() < 0.0004) {
        const a = (Math.random() < 0.5 ? -1 : 1) * (0.2 + Math.random() * 0.6);
        for (let k = 0; k < 30 && i + k < n; k++) d[i + k] += a * Math.pow(0.7, k);
      }
    }
    return b;
  }
  function driveCurve(k) {
    const n = 2048, c = new Float32Array(n), norm = Math.tanh(k);
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(k * x) / norm; }
    return c;
  }

  function build(c) {
    ctx = c; sr = c.sampleRate;
    const glue = c.createDynamicsCompressor();
    glue.threshold.value = -20; glue.knee.value = 10; glue.ratio.value = 3; glue.attack.value = 0.006; glue.release.value = 0.2;
    const makeup = c.createGain(); makeup.gain.value = 1.5;
    const limiter = c.createDynamicsCompressor();
    limiter.threshold.value = -2; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = 0.002; limiter.release.value = 0.1;
    master = c.createGain(); master.gain.value = muted ? 0 : 1;
    master.connect(glue); glue.connect(makeup); makeup.connect(limiter); limiter.connect(c.destination);

    const n = sr * 2;
    noiseBuf = c.createBuffer(1, n, sr);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) nd[i] = Math.random() * 2 - 1;

    sfxIn = c.createGain(); sfxIn.gain.value = vol.sfx; sfxIn.connect(master);
    const sfxRev = c.createConvolver(); sfxRev.buffer = impulse(2.4, 0.2);
    sfxRevIn = c.createGain(); sfxRevIn.connect(sfxRev); sfxRev.connect(sfxIn);

    musIn = c.createGain();
    musDrive = c.createWaveShaper(); musDrive.oversample = "2x"; musDrive.curve = driveCurve(1.5);
    const wow = c.createDelay(0.1); wow.delayTime.value = 0.02;
    const l1 = c.createOscillator(), l2 = c.createOscillator();
    l1.frequency.value = 0.55; l2.frequency.value = 6.3;
    wowGain = c.createGain(); wowGain.gain.value = 0; flutGain = c.createGain(); flutGain.gain.value = 0.00005;
    l1.connect(wowGain); wowGain.connect(wow.delayTime); l2.connect(flutGain); flutGain.connect(wow.delayTime);
    l1.start(); l2.start();
    musHP = c.createBiquadFilter(); musHP.type = "highpass"; musHP.frequency.value = 40;
    musLP = c.createBiquadFilter(); musLP.type = "lowpass"; musLP.frequency.value = 9000;
    musMid = c.createBiquadFilter(); musMid.type = "peaking"; musMid.frequency.value = 1500; musMid.Q.value = 0.8; musMid.gain.value = 0;
    musOut = c.createGain(); musOut.gain.value = vol.music * MUS_TRIM;
    musLvl = c.createGain();
    musIn.connect(musDrive); musDrive.connect(wow); wow.connect(musHP); musHP.connect(musLP); musLP.connect(musMid); musMid.connect(musLvl); musLvl.connect(musOut); musOut.connect(master);
    const musRev = c.createConvolver(); musRev.buffer = impulse(2.8, 0.15);
    musRevIn = c.createGain(); musRevIn.connect(musRev); musRev.connect(wow);
  }

  function init() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return ctx; }
    build(new (root.AudioContext || root.webkitAudioContext)());
    document.addEventListener("visibilitychange", () => {
      if (!ctx) return;
      if (document.hidden) ctx.suspend();
      else ctx.resume().then(() => { seqNext = ctx.currentTime + 0.1; });
    });
    setTimeout(() => warm([["coin", 0, 3], ["glock", 72, 100]]), 200);
    return ctx;
  }

  // ---------- sample synthesis ----------
  function norm(d, peak) {
    let m = 0;
    for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > m) m = a; }
    if (m > 0) { const k = peak / m; for (let i = 0; i < d.length; i++) d[i] *= k; }
  }
  function buf(key, sec, rate, fill) {
    let b = cache.get(key);
    if (b) return b;
    b = ctx.createBuffer(1, Math.ceil(sec * rate), rate);
    const d = b.getChannelData(0);
    fill(d, rate);
    norm(d, 0.9);
    cache.set(key, b);
    return b;
  }
  function partial(d, r, f, amp, tauF, tauS = tauF, mix = 1, phase = 0) {
    if (f >= r * 0.45) return;
    const w = TAU * f / r, cw = Math.cos(w), sw = Math.sin(w), kF = Math.exp(-1 / (tauF * r)), kS = Math.exp(-1 / (tauS * r));
    let x = Math.cos(phase), y = Math.sin(phase), eF = amp * mix, eS = amp * (1 - mix);
    for (let i = 0; i < d.length; i++) {
      d[i] += y * (eF + eS);
      const nx = x * cw - y * sw; y = x * sw + y * cw; x = nx;
      eF *= kF; eS *= kS;
      if (eF + eS < 1e-6) break;
    }
  }
  function biq(d, r, type, f, q = 0.707) {
    const w = TAU * f / r, cs = Math.cos(w), al = Math.sin(w) / (2 * q);
    let b0, b1, b2;
    if (type === "lp") { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; }
    else if (type === "hp") { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; }
    else { b0 = al; b1 = 0; b2 = -al; }
    const a0 = 1 + al, a1 = -2 * cs, a2 = 1 - al;
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < d.length; i++) {
      const x = d[i], y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
      x2 = x1; x1 = x; y2 = y1; y1 = y; d[i] = y;
    }
  }
  function noiseFill(d, from = 0, to = d.length, amp = 1) { for (let i = from; i < to; i++) d[i] += (Math.random() * 2 - 1) * amp; }
  function decay(d, r, tau, attack = 0) {
    for (let i = 0; i < d.length; i++) { const t = i / r; d[i] *= Math.exp(-t / tau) * (attack ? Math.min(1, t / attack) : 1); }
  }
  function metal(d, r, mul) {
    const fs = [205.3, 304.4, 369.6, 522.7, 540, 800].map((f) => f * mul), ph = fs.map(() => Math.random());
    for (let i = 0; i < d.length; i++) {
      let s = 0;
      for (let k = 0; k < 6; k++) { ph[k] += fs[k] / r; if (ph[k] >= 1) ph[k] -= 1; s += ph[k] < 0.5 ? 1 : -1; }
      d[i] += s / 6;
    }
  }
  function ks(d, r, f, dec, smooth, body) {
    const N = Math.max(2, Math.round(r / f)), ring = new Float32Array(N);
    for (let i = 0; i < N; i++) ring[i] = Math.random() * 2 - 1;
    for (let p = 0; p < smooth; p++) for (let i = 1; i < N; i++) ring[i] = 0.5 * (ring[i] + ring[i - 1]);
    let mean = 0;
    for (let i = 0; i < N; i++) mean += ring[i];
    mean /= N;
    for (let i = 0; i < N; i++) ring[i] -= mean;
    let idx = 0;
    for (let i = 0; i < d.length; i++) {
      const nx = idx + 1 === N ? 0 : idx + 1, cur = ring[idx];
      ring[idx] = dec * 0.5 * (cur + ring[nx]);
      d[i] = cur; idx = nx;
    }
    if (body) partial(d, r, f, body, 0.3, 1.0, 0.6);
    const h = Math.floor(r * 0.002);
    for (let i = 0; i < h; i++) d[i] *= i / h;
  }

  const SMP = {
    piano: (m) => buf("pn" + m, 2.4, SR_T, (d, r) => {
      const f = mtof(m), T = clamp(3.6 * Math.pow(196 / f, 0.45), 0.7, 5), B = 0.0004;
      for (let k = 1; k <= 12; k++) {
        const fk = f * k * Math.sqrt(1 + B * k * k), a = Math.pow(k, -1.2) * (1 + 0.35 * Math.sin(k * 2.3 + m));
        partial(d, r, fk, a, T * 0.16 / Math.sqrt(k), T / (1 + 0.35 * k), 0.55, k * 0.7);
        if (k <= 4) partial(d, r, fk * 1.0009, a * 0.4, T * 0.2 / Math.sqrt(k), T * 1.1 / (1 + 0.35 * k), 0.5, k * 1.9);
      }
      noiseFill(d, 0, Math.floor(r * 0.008), 0.05);
      biq(d, r, "lp", Math.min(9000, 2000 + f * 6));
    }),
    vibes: (m) => buf("vb" + m, 2.6, SR_T, (d, r) => {
      const f = mtof(m);
      partial(d, r, f, 1, 2.2); partial(d, r, f * 3.98, 0.3, 0.35); partial(d, r, f * 9.9, 0.08, 0.07);
      for (let i = 0; i < d.length; i++) d[i] *= 1 - 0.32 * (0.5 + 0.5 * Math.sin(TAU * 5 * i / r));
      noiseFill(d, 0, Math.floor(r * 0.004), 0.12);
    }),
    box: (m) => buf("bx" + m, 1.8, SR_T, (d, r) => {
      const f = mtof(m);
      partial(d, r, f, 1, 1.3); partial(d, r, f * 2.0, 0.16, 0.5); partial(d, r, f * 3.6, 0.12, 0.2); partial(d, r, f * 6.1, 0.06, 0.06);
      noiseFill(d, 0, Math.floor(r * 0.002), 0.2);
    }),
    glock: (m) => buf("gl" + m, 1.8, SR_T, (d, r) => {
      const f = mtof(m);
      partial(d, r, f, 1, 1.5); partial(d, r, f * 2.76, 0.35, 0.6); partial(d, r, f * 5.4, 0.15, 0.25); partial(d, r, f * 8.9, 0.05, 0.1);
    }),
    bass: (m) => buf("bs" + m, 1.8, SR_T, (d, r) => { ks(d, r, mtof(m), 0.996, 3, 0.7); biq(d, r, "lp", Math.min(2200, mtof(m) * 14)); }),
    guitar: (m) => buf("gt" + m, 1.2, SR_T, (d, r) => { ks(d, r, mtof(m), 0.993, 1, 0.15); biq(d, r, "lp", 5000); }),
    pizz: (m) => buf("pz" + m, 0.9, SR_T, (d, r) => { ks(d, r, mtof(m), 0.986, 2, 0.35); biq(d, r, "lp", 3200); }),
    bell: (m) => buf("bl" + m, 4.5, SR_T, (d, r) => {
      const f = mtof(m);
      [[0.5, 0.45, 4.2], [1, 1, 3.4], [1.19, 0.6, 2.6], [1.5, 0.4, 2.2], [2, 0.5, 1.8], [2.5, 0.25, 1.3], [3, 0.2, 1.0], [4.2, 0.12, 0.6]]
        .forEach(([k, a, tau], j) => { partial(d, r, f * k, a, tau, tau, 1, j); partial(d, r, f * k * 1.002, a * 0.4, tau, tau, 1, j * 2); });
    }),
    gong: () => buf("gong", 5, SR_T, (d, r) => {
      [[1, 1, 4], [1.48, 0.7, 3.4], [1.98, 0.6, 3], [2.43, 0.5, 2.6], [2.92, 0.45, 2.2], [3.51, 0.35, 1.8], [4.2, 0.25, 1.4], [5.1, 0.2, 1]]
        .forEach(([k, a, tau], j) => { partial(d, r, 92 * k, a, tau, tau, 1, j); partial(d, r, 92 * k * 1.004, a * 0.6, tau, tau, 1, j + 1); });
      const sw = new Float32Array(d.length);
      noiseFill(sw); biq(sw, r, "bp", 900, 0.6);
      for (let i = 0; i < d.length; i++) { const t = i / r; d[i] += sw[i] * 0.25 * Math.exp(-t / 1.2) * Math.min(1, t / 0.3); }
    }),
    kick: () => buf("kick", 0.5, sr, (d, r) => {
      let ph = 0;
      for (let i = 0; i < d.length; i++) { const t = i / r, f = 46 + 75 * Math.exp(-t / 0.03); ph += TAU * f / r; d[i] = Math.sin(ph) * Math.exp(-t / 0.17); }
      noiseFill(d, 0, Math.floor(r * 0.003), 0.4);
    }),
    snare: () => buf("snare", 0.4, sr, (d, r) => {
      noiseFill(d); biq(d, r, "hp", 1400); decay(d, r, 0.11);
      partial(d, r, 185, 0.7, 0.06); partial(d, r, 330, 0.35, 0.04);
    }),
    tap: () => buf("tap", 0.22, sr, (d, r) => { noiseFill(d); biq(d, r, "bp", 2900, 0.7); decay(d, r, 0.05, 0.002); }),
    swish: () => buf("swish", 0.55, sr, (d, r) => {
      noiseFill(d); biq(d, r, "bp", 5200, 0.5);
      for (let i = 0; i < d.length; i++) d[i] *= Math.pow(Math.sin(Math.PI * i / d.length), 2);
    }),
    ride: () => buf("ride", 1.8, sr, (d, r) => {
      metal(d, r, 2.2); biq(d, r, "hp", 5200); biq(d, r, "hp", 5200);
      for (let i = 0; i < d.length; i++) { const t = i / r; d[i] *= 0.45 * Math.exp(-t / 0.9) + 0.55 * Math.exp(-t / 0.07); }
      partial(d, r, 3150, 0.18, 0.5); partial(d, r, 4720, 0.1, 0.3);
    }),
    hat: () => buf("hat", 0.15, sr, (d, r) => { metal(d, r, 2.7); biq(d, r, "hp", 7000); biq(d, r, "hp", 7000); decay(d, r, 0.022); }),
    pedal: () => buf("pedal", 0.18, sr, (d, r) => { metal(d, r, 2.5); biq(d, r, "bp", 8000, 1.2); decay(d, r, 0.04, 0.004); }),
    crash: () => buf("crash", 3, sr, (d, r) => {
      metal(d, r, 1.8); noiseFill(d, 0, d.length, 0.6); biq(d, r, "hp", 3500); biq(d, r, "hp", 3500); decay(d, r, 0.85, 0.003);
    }),
    rim: () => buf("rim", 0.12, sr, (d, r) => { noiseFill(d); biq(d, r, "bp", 1900, 3); decay(d, r, 0.012); partial(d, r, 1750, 0.6, 0.02); }),
    wood: (k) => buf("wd" + k, 0.25, sr, (d, r) => { const f = [950, 720, 1300][k]; partial(d, r, f, 1, 0.06); partial(d, r, f * 2.7, 0.4, 0.02); noiseFill(d, 0, Math.floor(r * 0.002), 0.3); }),
    tom: (k) => buf("tm" + k, 0.8, sr, (d, r) => {
      const f0 = [85, 105, 130, 160][k];
      let ph = 0;
      for (let i = 0; i < d.length; i++) { const t = i / r, f = f0 * (1 + 0.3 * Math.exp(-t / 0.05)); ph += TAU * f / r; d[i] = Math.sin(ph) * Math.exp(-t / 0.32); }
      const n2 = new Float32Array(d.length); noiseFill(n2); biq(n2, r, "bp", f0 * 5, 1); decay(n2, r, 0.03);
      for (let i = 0; i < d.length; i++) d[i] += n2[i] * 0.5;
    }),
    timp: (m) => buf("tp" + m, 2.4, SR_T, (d, r) => {
      const f = mtof(m);
      [[1, 1, 1.4], [1.5, 0.5, 0.8], [1.99, 0.35, 0.6], [2.44, 0.2, 0.4]].forEach(([k, a, tau]) => partial(d, r, f * k, a, tau));
      const n2 = new Float32Array(d.length); noiseFill(n2); biq(n2, r, "lp", 600); decay(n2, r, 0.04);
      for (let i = 0; i < d.length; i++) d[i] += n2[i] * 0.8;
    }),
    coin: (k) => buf("cn" + k, 0.7, sr, (d, r) => {
      const f = [3100, 3500, 2850, 3900][k];
      [[1, 1, 0.38], [1.43, 0.7, 0.28], [2.11, 0.5, 0.2], [2.63, 0.35, 0.14], [3.37, 0.2, 0.09]].forEach(([m, a, tau], j) => partial(d, r, f * m, a, tau, tau, 1, j));
      noiseFill(d, 0, Math.floor(r * 0.0015), 0.5);
    }),
  };
  const warmQ = [];
  let warmBusy = false;
  function warm(list) {
    list.forEach(([k, a, b]) => { for (let m = a; m <= b; m++) warmQ.push([k, m]); });
    if (!warmBusy) { warmBusy = true; setTimeout(warmTick, 20); }
  }
  function warmTick() {
    const t0 = performance.now();
    while (warmQ.length && performance.now() - t0 < 10) { const [k, m] = warmQ.shift(); SMP[k](m); }
    if (warmQ.length) setTimeout(warmTick, 12); else warmBusy = false;
  }

  // ---------- playback helpers ----------
  function route(node, dest, pan, send) {
    let o = node;
    if (pan) { const p = ctx.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); node.connect(p); o = p; }
    o.connect(dest);
    if (send > 0) { const s = ctx.createGain(); s.gain.value = send; o.connect(s); s.connect(dest === sfxIn ? sfxRevIn : musRevIn); }
  }
  function play(b, t, o = {}) {
    const s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = b;
    if (o.rate) s.playbackRate.value = o.rate;
    g.gain.value = o.gain == null ? 1 : o.gain;
    let node = s;
    if (o.lp) { const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = o.lp; s.connect(f); node = f; }
    node.connect(g);
    route(g, o.dest, o.pan || 0, o.send || 0);
    s.start(t);
    if (o.dur) {
      g.gain.setValueAtTime(g.gain.value, t + o.dur);
      g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur + (o.rel || 0.12));
      s.stop(t + o.dur + (o.rel || 0.12) + 0.02);
    }
  }
  function tone(type, f, t, dur, peak, dest, o = {}) {
    const g = ctx.createGain(), x = ctx.createOscillator();
    x.type = type; x.frequency.setValueAtTime(f, t);
    if (o.glide) x.frequency.exponentialRampToValueAtTime(o.glide, t + (o.glideTime || dur));
    if (o.detune) x.detune.value = o.detune;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + (o.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max((o.attack || 0.005) + 0.01, dur));
    let last = g;
    if (o.lp) {
      const fl = ctx.createBiquadFilter(); fl.type = o.ftype || "lowpass"; fl.frequency.setValueAtTime(o.lp, t); fl.Q.value = o.q || 0.7;
      if (o.lpTo) fl.frequency.exponentialRampToValueAtTime(o.lpTo, t + (o.lpTime || dur));
      g.connect(fl); last = fl;
    }
    x.connect(g); route(last, dest, o.pan || 0, o.send || 0);
    x.start(t); x.stop(t + dur + 0.05);
    return x;
  }
  function nz(t, dur, peak, dest, o = {}) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true;
    f.type = o.type || "bandpass"; f.frequency.setValueAtTime(o.f || 1800, t); f.Q.value = o.q || 1;
    if (o.fTo) f.frequency.exponentialRampToValueAtTime(o.fTo, t + dur);
    if (o.swell) {
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + dur * o.swell); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    } else {
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + (o.attack || 0.002)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    }
    s.connect(f); f.connect(g); route(g, dest, o.pan || 0, o.send || 0);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }
  function adsr(g, t, a, peak, dur, rel, sus = 0.85) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.linearRampToValueAtTime(peak * sus, t + Math.max(a + 0.01, dur));
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a + 0.02, dur) + rel);
  }
  function vib(oscs, t, f, rate, depth, delay, dur) {
    const l = ctx.createOscillator(), g = ctx.createGain();
    l.frequency.value = rate;
    g.gain.setValueAtTime(0, t); g.gain.setValueAtTime(0, t + delay); g.gain.linearRampToValueAtTime(f * depth, t + delay + 0.25);
    l.connect(g); oscs.forEach((o) => g.connect(o.frequency));
    l.start(t); l.stop(t + dur + 0.6);
  }
  function oscs(types, f, t, end, from, scoopT = 0.05) {
    return types.map(([type, det]) => {
      const o = ctx.createOscillator();
      if (type instanceof PeriodicWave) o.setPeriodicWave(type); else o.type = type;
      o.detune.value = det || 0;
      o.frequency.setValueAtTime(from || f, t);
      if (from) o.frequency.exponentialRampToValueAtTime(f, t + scoopT);
      o.start(t); o.stop(end);
      return o;
    });
  }
  function filt(type, f, q = 0.7) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
  let reedWave = null;
  function reed() {
    if (!reedWave || reedWave.ctx !== ctx) {
      const amps = [0, 1, 0.75, 0.6, 0.5, 0.42, 0.3, 0.26, 0.2, 0.14, 0.1, 0.07];
      reedWave = { w: ctx.createPeriodicWave(new Float32Array(amps.length), new Float32Array(amps)), ctx };
    }
    return reedWave.w;
  }

  // ---------- instruments ----------
  let lastTheremin = 0;
  const I = {
    piano(m, t, dur, v, dest, pan = 0, send = 0.14) { play(SMP.piano(m), t, { gain: 0.42 * v, dest, dur: Math.max(dur, 0.15), rel: 0.25, pan: pan + (m - 64) / 70, send }); },
    vibes(m, t, dur, v, dest, pan = 0.25, send = 0.3) { play(SMP.vibes(m), t, { gain: 0.36 * v, dest, dur: Math.max(dur, 0.3), rel: 0.5, pan, send }); },
    box(m, t, dur, v, dest, pan = 0, send = 0.4) { play(SMP.box(m), t, { gain: 0.3 * v, dest, pan, send }); },
    glock(m, t, v, dest, pan = 0, send = 0.35) { play(SMP.glock(m), t, { gain: 0.26 * v, dest, pan, send }); },
    bell(m, t, v, dest, pan = 0, send = 0.5) { play(SMP.bell(m), t, { gain: 0.4 * v, dest, pan, send }); },
    bass(m, t, dur, v, dest) { play(SMP.bass(m), t, { gain: 0.78 * v, dest, dur: Math.max(dur, 0.12), rel: 0.1, send: 0.04 }); },
    guitar(ms, t, dur, v, dest, pan = -0.3) { ms.forEach((m, k) => play(SMP.guitar(m), t + k * 0.009, { gain: 0.2 * v, dest, dur, rel: 0.05, pan, send: 0.08 })); },
    pizz(m, t, v, dest, pan = 0.3) { play(SMP.pizz(m), t, { gain: 0.34 * v, dest, pan, send: 0.18 }); },
    trumpet(m, t, dur, v, dest, pan = 0.12, send = 0.3, open = false) {
      const f = mtof(m), end = t + dur + 0.3, os = oscs([["sawtooth", 0], ["sawtooth", 7]], f, t, end, f * 0.955);
      const bp = filt("bandpass", open ? 1300 : 950, open ? 0.6 : 2.2), lp = filt("lowpass", open ? 1600 : 1100), g = ctx.createGain();
      if (!open && dur > 0.3) bp.frequency.linearRampToValueAtTime(1550, t + Math.min(0.28, dur * 0.6));
      lp.frequency.setValueAtTime(open ? 1600 : 1100, t); lp.frequency.linearRampToValueAtTime(open ? 4800 : 3200, t + 0.05);
      os.forEach((o) => o.connect(bp)); bp.connect(lp); lp.connect(g);
      adsr(g, t, 0.03, (open ? 0.2 : 0.42) * v, dur, 0.09, 0.8);
      if (dur > 0.28) vib(os, t, f, 5.6, 0.011, 0.16, dur);
      route(g, dest, pan, send);
    },
    sax(m, t, dur, v, dest, pan = -0.1, send = 0.32) {
      const f = mtof(m), end = t + dur + 0.3, os = oscs([["sawtooth", 0], ["sawtooth", -5]], f, t, end, f * 0.94, 0.07);
      const f1 = filt("bandpass", 620, 1.4), f2 = filt("bandpass", 1750, 2.5), lp = filt("lowpass", 3200), g = ctx.createGain(), mix = ctx.createGain();
      mix.gain.value = 1;
      os.forEach((o) => { o.connect(f1); o.connect(f2); });
      f1.connect(mix); f2.connect(mix); mix.connect(lp); lp.connect(g);
      adsr(g, t, 0.045, 0.5 * v, dur, 0.12, 0.85);
      if (dur > 0.3) vib(os, t, f, 5.1, 0.013, 0.2, dur);
      route(g, dest, pan, send);
      nz(t, dur + 0.1, 0.018 * v, dest, { f: 2600, q: 1, attack: 0.05, pan, send });
    },
    clarinet(m, t, dur, v, dest, pan = 0.15, send = 0.28) {
      const f = mtof(m), end = t + dur + 0.3, os = oscs([["square", 0], ["triangle", 3]], f, t, end, f * 0.985, 0.04);
      const lp = filt("lowpass", 2100, 1.1), g = ctx.createGain();
      os.forEach((o) => o.connect(lp)); lp.connect(g);
      adsr(g, t, 0.05, 0.17 * v, dur, 0.1, 0.9);
      if (dur > 0.3) vib(os, t, f, 5.2, 0.007, 0.22, dur);
      route(g, dest, pan, send);
      nz(t, dur, 0.008 * v, dest, { f: f * 3, q: 2, attack: 0.04, pan });
    },
    violin(m, t, dur, v, dest, pan = 0.2, send = 0.35) {
      const f = mtof(m), end = t + dur + 0.4, os = oscs([["sawtooth", -4], ["sawtooth", 5]], f, t, end, f * 0.99, 0.06);
      const f1 = filt("peaking", 3000, 1), lp = filt("lowpass", 4500), hp = filt("highpass", 250), g = ctx.createGain();
      f1.gain.value = 6;
      os.forEach((o) => o.connect(hp)); hp.connect(f1); f1.connect(lp); lp.connect(g);
      adsr(g, t, 0.09, 0.15 * v, dur, 0.18, 0.92);
      vib(os, t, f, 5.8, 0.014, 0.12, dur);
      route(g, dest, pan, send);
    },
    bandoneon(ms, t, dur, v, dest, pan = -0.15, send = 0.22) {
      const g = ctx.createGain(), lp = filt("lowpass", 2600, 0.8);
      [].concat(ms).forEach((m) => oscs([[reed(), -4], [reed(), 4]], mtof(m), t, t + dur + 0.3).forEach((o) => o.connect(lp)));
      lp.connect(g);
      adsr(g, t, 0.035, 0.11 * v / Math.sqrt([].concat(ms).length), dur, 0.09, 0.9);
      route(g, dest, pan, send);
    },
    organ(ms, t, dur, v, dest, pan = 0, send = 0.4) {
      const g = ctx.createGain(), trem = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = 6.4; lg.gain.value = 0.22; lfo.connect(lg); lg.connect(trem.gain); trem.gain.value = 0.78;
      lfo.start(t); lfo.stop(t + dur + 0.6);
      ms.forEach((m) => [[1, 1], [2, 0.55], [3, 0.3], [4, 0.32], [6, 0.12], [8, 0.1]].forEach(([k, a]) => {
        const o = ctx.createOscillator(), og = ctx.createGain();
        o.frequency.value = mtof(m) * k; og.gain.value = a; o.connect(og); og.connect(trem);
        o.start(t); o.stop(t + dur + 0.5);
      }));
      trem.connect(g);
      adsr(g, t, 0.06, 0.07 * v / Math.sqrt(ms.length), dur, 0.35, 0.95);
      route(g, dest, pan, send);
    },
    strings(ms, t, dur, v, dest, pan = 0, send = 0.45) {
      const g = ctx.createGain(), lp = filt("lowpass", 1900, 0.6);
      ms.forEach((m) => { const os = oscs([["sawtooth", -9], ["sawtooth", 0], ["sawtooth", 9]], mtof(m), t, t + dur + 0.8); os.forEach((o) => o.connect(lp)); vib(os, t, mtof(m), 5.4, 0.006, 0.2, dur); });
      lp.connect(g);
      adsr(g, t, Math.min(0.5, dur * 0.4), 0.06 * v / Math.sqrt(ms.length), dur, 0.6, 0.95);
      route(g, dest, pan, send);
    },
    choir(ms, t, dur, v, dest, pan = 0, send = 0.6) {
      const g = ctx.createGain(), mix = ctx.createGain();
      [[730, 6, 1], [1100, 7, 0.6], [2700, 9, 0.35]].forEach(([f, q, a]) => { const b = filt("bandpass", f, q), bg = ctx.createGain(); bg.gain.value = a * 3; mix.connect(b); b.connect(bg); bg.connect(g); });
      ms.forEach((m) => { const os = oscs([["sawtooth", -12], ["sawtooth", 0], ["sawtooth", 11]], mtof(m), t, t + dur + 1); os.forEach((o) => o.connect(mix)); vib(os, t, mtof(m), 4.8, 0.008, 0.3, dur); });
      adsr(g, t, Math.min(0.45, dur * 0.4), 0.12 * v / Math.sqrt(ms.length), dur, 0.7, 0.95);
      route(g, dest, pan, send);
    },
    theremin(m, t, dur, v, dest, pan = -0.2, send = 0.65) {
      const f = mtof(m), from = lastTheremin && t - lastTheremin.t < 2 ? mtof(lastTheremin.m) : f * 0.9;
      lastTheremin = { m, t: t + dur };
      const end = t + dur + 0.5, os = oscs([["sine", 0]], f, t, end, from, 0.18), o2 = oscs([["sine", 0]], f * 2, t, end, from * 2, 0.18);
      const g = ctx.createGain(), g2 = ctx.createGain();
      g2.gain.value = 0.12; o2[0].connect(g2); g2.connect(g); os[0].connect(g);
      adsr(g, t, 0.14, 0.3 * v, dur, 0.3, 0.9);
      vib([os[0], o2[0]], t, f, 6.2, 0.018, 0.1, dur);
      route(g, dest, pan, send);
    },
    brass(ms, t, dur, v, dest, pan = 0, send = 0.25) {
      const g = ctx.createGain(), lp = filt("lowpass", 500, 1.2);
      ms.forEach((m) => oscs([["sawtooth", -10], ["sawtooth", 0], ["sawtooth", 10]], mtof(m), t, t + dur + 0.4, mtof(m) * 0.97, 0.04).forEach((o) => o.connect(lp)));
      lp.frequency.setValueAtTime(500, t); lp.frequency.exponentialRampToValueAtTime(3800, t + 0.05); lp.frequency.exponentialRampToValueAtTime(1600, t + Math.max(0.1, dur));
      lp.connect(g);
      adsr(g, t, 0.02, 0.13 * v / Math.sqrt(ms.length), dur, 0.12, 0.75);
      route(g, dest, pan, send);
    },
    trombone(m, t, dur, v, dest, glideTo, pan = 0, send = 0.25) {
      const f = mtof(m), os = oscs([["sawtooth", 0], ["sawtooth", 6]], f, t, t + dur + 0.3, f * 0.97, 0.05);
      if (glideTo) os.forEach((o) => o.frequency.exponentialRampToValueAtTime(mtof(glideTo), t + dur));
      const bp = filt("bandpass", 500, 1.5), lp = filt("lowpass", 2200), g = ctx.createGain();
      bp.frequency.setValueAtTime(400, t); bp.frequency.linearRampToValueAtTime(1100, t + Math.min(0.2, dur * 0.5)); bp.frequency.linearRampToValueAtTime(600, t + dur);
      os.forEach((o) => o.connect(bp)); bp.connect(lp); lp.connect(g);
      adsr(g, t, 0.04, 0.45 * v, dur, 0.12, 0.85);
      if (dur > 0.5) vib(os, t, f, 5, 0.025, 0.2, dur);
      route(g, dest, pan, send);
    },
    tuba(m, t, dur, v, dest) {
      const f = mtof(m), os = oscs([["sawtooth", 0], ["sine", 0]], f, t, t + dur + 0.2);
      const lp = filt("lowpass", 420, 1.2), g = ctx.createGain();
      os.forEach((o) => o.connect(lp)); lp.connect(g);
      adsr(g, t, 0.03, 0.42 * v, dur, 0.08, 0.7);
      route(g, dest, 0, 0.05);
    },
  };
  const DR = {
    kick: (t, v, d) => play(SMP.kick(), t, { gain: 0.85 * v, dest: d }),
    snare: (t, v, d) => play(SMP.snare(), t, { gain: 0.5 * v, dest: d, pan: 0.05, send: 0.1 }),
    tap: (t, v, d) => play(SMP.tap(), t, { gain: 0.42 * v, dest: d, pan: 0.05, send: 0.08 }),
    swish: (t, v, d) => play(SMP.swish(), t, { gain: 0.3 * v, dest: d, pan: 0.1, send: 0.05 }),
    ride: (t, v, d) => play(SMP.ride(), t, { gain: 0.3 * v, dest: d, pan: 0.35, send: 0.1 }),
    bellRide: (t, v, d) => play(SMP.ride(), t, { gain: 0.3 * v, dest: d, rate: 1.5, pan: 0.35, send: 0.1 }),
    hat: (t, v, d) => play(SMP.hat(), t, { gain: 0.32 * v, dest: d, pan: -0.25 }),
    pedal: (t, v, d) => play(SMP.pedal(), t, { gain: 0.3 * v, dest: d, pan: -0.25 }),
    crash: (t, v, d) => play(SMP.crash(), t, { gain: 0.32 * v, dest: d, pan: -0.3, send: 0.15 }),
    rim: (t, v, d) => play(SMP.rim(), t, { gain: 0.45 * v, dest: d, pan: 0.1, send: 0.08 }),
    wood: (t, k, v, d) => play(SMP.wood(k), t, { gain: 0.4 * v, dest: d, pan: 0.2, send: 0.12 }),
    tom: (t, k, v, d) => play(SMP.tom(k), t, { gain: 0.7 * v, dest: d, pan: [-0.25, -0.1, 0.1, 0.25][k], send: 0.12 }),
    timp: (t, m, v, d) => play(SMP.timp(m), t, { gain: 0.75 * v, dest: d, send: 0.3 }),
    gong: (t, v, d, rate = 1) => play(SMP.gong(), t, { gain: 0.6 * v, dest: d, rate, send: 0.5 }),
    coin: (t, v, d, k = Math.floor(Math.random() * 4)) => play(SMP.coin(k), t, { gain: 0.42 * v, dest: d, rate: 0.96 + Math.random() * 0.08, pan: (Math.random() - 0.5) * 0.7, send: 0.12 }),
  };

  // ---------- music ----------
  function solo(st, x, fn, low, high, scale) {
    if (x.s === 0) { const r = improv(x.c, scale, low, high, x.rng, x.spb, st._last); st._imp = r.notes; st._last = r.last; }
    (st._imp || []).forEach(([s, m, l]) => { if (s === x.s) fn(m, x.t, x.sd * l * 0.95); });
  }
  function melody(st, x, fn) {
    const ev = st._mel[x.bar * x.spb + x.s];
    if (ev) ev.forEach(([m, l]) => fn(m, x.t, x.sd * l * 0.95));
  }
  function extras(x) {
    const { s, t, sd, c, spb } = x, M = musIn;
    if (mode === "heist") {
      if (s % 2 === 0) DR.wood(t, (s / 2) % 2 ? 1 : 0, 0.55, M);
      I.pizz(bassRoot(c) + 12, t, s % 2 ? 0.35 : 0.55, M, -0.2);
      if (s === 0) DR.timp(t, bassRoot(c) + 12, 0.45, M);
    } else if (mode === "gold") {
      const a = arp(c, 79, spb);
      I.glock(a[s % a.length], t, 0.5, M, 0.4);
      if (s % 2 === 0) DR.bellRide(t, 0.45, M);
      if (s === 0) DR.coin(t + sd * 0.5, 0.25, M);
    }
  }

  const STYLES = {
    speakeasy: {
      lvl: 0.65, label: "Midnight Speakeasy", desc: "Swinging noir jazz: muted trumpet, double bass, piano, vibraphone, ride cymbal.",
      bpm: 98, swing: 0.33, spb: 8, bars: 16,
      fx: { hp: 45, lp: 9500, mid: 1, drive: 1.8, wow: 0.0005, crackle: 0.3 },
      warm: [["bass", 30, 48], ["piano", 52, 80], ["vibes", 62, 90]],
      chords: ["Am6", "Am6", "Dm9", "Dm9", "Bm7b5", "E7b9", "Am6", "A7b9", "Dm9", "G7", "Cmaj7", "Fmaj7", "Bm7b5", "E7b9", "Am6", "E7b9"],
      mel: [
        "A4:2 C5:1 E5:3 D5:1 C5:1", "B4:2 A4:2 F#4:4", "-:2 F4:1 A4:1 C5:2 E5:2", "D5:6 C5:2",
        "B4:2 D5:1 F5:3 E5:2", "D5:2 C5:1 B4:1 G#4:4", "A4:3 E4:1 A4:2 C5:2", "C#5:4 Bb4:4",
        "A5:3 F5:1 D5:2 E5:2", "F5:2 D5:2 B4:4", "E5:3 G5:1 B5:2 G5:2", "A5:6 G5:2",
        "F5:2 D5:1 B4:3 A4:2", "G#4:2 B4:2 D5:2 F5:2", "E5:8", "-:4 E4:1 G#4:1 B4:2",
      ],
      step(x) {
        const { s, t, bar, loop, sd, c, next, rng } = x, M = musIn, part = loop % 4;
        if (s % 2 === 0) I.bass(walk(c, next, s / 2, rng), t, sd * 1.85, 1, M);
        if (s % 2 === 0) DR.ride(t, s % 4 === 2 ? 1 : 0.75, M);
        if (s === 3 || s === 7) DR.ride(t, 0.5, M);
        if (s === 2 || s === 6) DR.pedal(t, 0.9, M);
        if (s % 2 === 1 && rng() < 0.2) DR.tap(t, 0.55, M);
        if (s === 0 && rng() < 0.4) DR.kick(t, 0.35, M);
        if (s === 0 && bar === 0 && loop > 0) DR.crash(t, 0.5, M);
        if (bar % 4 === 3 && s >= 5) DR.snare(t, 0.25 + 0.12 * (s - 5), M);
        if (s === 0 || s === 3 || (part === 2 && s === 6)) voicing(c, 63).forEach((m) => I.piano(m, t, s === 0 ? sd * 2.6 : sd * 1.3, 0.48, M, -0.2, 0.12));
        if (part === 0) melody(this, x, (m, tt, d) => (bar < 8 ? I.piano(m + 12, tt, d * 1.3, 0.8, M, 0.15) : I.vibes(m, tt, d * 1.4, 0.95, M)));
        if (part === 1 || part === 3) melody(this, x, (m, tt, d) => I.trumpet(m, tt, d, 1, M));
        if (part === 3) melody(this, x, (m, tt, d) => I.vibes(m + 12, tt, d, 0.4, M));
        if (part === 2) solo(this, x, (m, tt, d) => I.vibes(m, tt, d * 1.5, 0.95, M), 67, 88, SCALE.aDor);
      },
    },
    brume: {
      lvl: 1, label: "Mystic Fog", desc: "Hypnotic and haunted: theatre organ, music box, theremin, choir, heartbeats.",
      bpm: 70, swing: 0, spb: 8, bars: 16,
      fx: { hp: 35, lp: 8500, mid: 0, drive: 1.3, wow: 0.0011, crackle: 0.3 },
      warm: [["box", 64, 96], ["timp", 40, 52], ["bass", 28, 45]],
      chords: ["Am", "G", "F", "E7", "Dm", "Am", "B7", "E7", "Am", "G", "F", "E7", "Dm", "Am", "B7", "E7"],
      mel: [
        "E5:6 D5:1 C5:1", "B4:4 D5:4", "C5:6 A4:2", "G#4:8", "A4:3 F5:3 E5:2", "C5:4 A4:4", "D#5:4 F#5:4", "E5:8",
        "A5:6 G5:1 E5:1", "D5:4 B4:4", "C5:2 F5:4 E5:2", "B4:8", "D5:3 A4:3 F5:2", "E5:4 C5:4", "B4:4 A4:2 F#4:2", "G#4:8",
      ],
      step(x) {
        const { s, t, bar, loop, sd, c } = x, M = musIn, part = loop % 4;
        if (s === 0) I.organ(voicing(c, 57, false), t, sd * 8.1, 0.9, M);
        if (s === 0) I.bass(bassRoot(c), t, sd * 7, 0.8, M);
        if (s === 0) DR.timp(t, bassRoot(c) + 12, 0.7, M);
        if (s === 1) DR.timp(t, bassRoot(c) + 12, 0.45, M);
        const a = arp(c, 72, 5), pat = [0, 1, 2, 3, 4, 3, 2, 1];
        I.box(a[pat[s]], t, 1, part === 3 ? 0.95 : 0.7, M, s % 2 ? 0.35 : -0.35);
        if (part === 3) I.box(a[pat[s]] + 12, t, 1, 0.35, M, 0.2);
        if (s === 4 && bar % 2 === 1) DR.swish(t, 0.6, M);
        if (part === 1 || part === 3) melody(this, x, (m, tt, d) => I.theremin(m, tt, d, 1, M));
        if (part === 2) melody(this, x, (m, tt, d) => I.choir([m, m - 5], tt, d, 1, M));
        if (part >= 1 && s === 0 && bar % 4 === 0) I.bell(57, t, 0.5, M, 0.3);
      },
    },
    gramophone: {
      lvl: 0.8, label: "Gramophone 1932", desc: "Gypsy swing on an old 78: rhythm guitar, clarinet, violin, double bass.",
      bpm: 140, swing: 0.22, spb: 8, bars: 16,
      fx: { hp: 220, lp: 3600, mid: 6, drive: 2.4, wow: 0.0012, crackle: 1 },
      warm: [["guitar", 45, 69], ["bass", 30, 48]],
      chords: ["Am6", "Am6", "Dm6", "Dm6", "E7", "E7", "Am6", "Am6", "Dm6", "Dm6", "Am6", "Am6", "E7", "E7", "Am6", "Am6"],
      mel: [
        "A4:1 C5:1 E5:1 A5:1 G#5:1 A5:1 E5:2", "C5:1 E5:1 F#5:2 E5:4", "D5:1 F5:1 A5:1 B5:1 A5:1 F5:1 D5:2", "F5:2 E5:2 D5:4",
        "E5:1 G#5:1 B5:1 D6:1 C6:1 B5:1 G#5:2", "B5:2 A5:2 G#5:4", "A5:3 E5:1 C5:2 A4:2", "-:4 E5:1 F#5:1 G#5:2",
        "A5:2 F5:1 D5:1 A5:2 B5:2", "A5:2 F5:2 D5:4", "E5:2 C5:1 A4:1 E5:2 F#5:2", "E5:4 C5:4",
        "B4:1 D5:1 E5:1 G#5:1 B5:2 G#5:2", "F5:2 E5:2 D5:2 B4:2", "A4:2 C5:2 E5:2 A5:2", "A5:4 -:4",
      ],
      step(x) {
        const { s, t, bar, loop, sd, c, next, rng } = x, M = musIn, part = loop % 4;
        if (s % 2 === 0) I.guitar(voicing(c, 57, false), t, sd * (s % 4 === 2 ? 0.55 : 0.8), s % 4 === 2 ? 1 : 0.8, M);
        if (part < 2 && (s === 0 || s === 4)) I.bass(bassRoot(c) + (s === 4 ? 7 : 0), t, sd * 3, 1, M);
        if (part >= 2 && s % 2 === 0) I.bass(walk(c, next, s / 2, rng), t, sd * 1.8, 1, M);
        if (s === 2 || s === 6) DR.swish(t, 0.8, M);
        if (s === 2 || s === 6) DR.pedal(t, 0.6, M);
        if (bar % 4 === 3 && s === 7) DR.wood(t, 0, 0.6, M);
        if (part === 0) melody(this, x, (m, tt, d) => I.clarinet(m, tt, d, 1, M));
        if (part === 1) melody(this, x, (m, tt, d) => I.violin(m, tt, d, 1, M));
        if (part === 2) solo(this, x, (m, tt, d) => I.clarinet(m, tt, d, 1, M), 64, 86, SCALE.aMin);
        if (part === 3) melody(this, x, (m, tt, d) => { I.violin(m, tt, d, 0.8, M); I.clarinet(m - 12, tt, d, 0.6, M, -0.2); });
      },
    },
    fumoir: {
      lvl: 0.72, label: "Smoking Room", desc: "Slow smoky blues: tenor sax, soft piano, double bass, brushes.",
      bpm: 66, swing: 0.33, spb: 8, bars: 12,
      fx: { hp: 40, lp: 8500, mid: 0, drive: 1.7, wow: 0.0006, crackle: 0.4 },
      warm: [["bass", 30, 48], ["piano", 52, 80]],
      chords: ["Cm7", "Cm7", "Cm7", "Cm7", "Fm7", "Fm7", "Cm7", "Cm7", "Ab7", "G7#9", "Cm7", "G7"],
      mel: [
        "G4:3 Bb4:1 C5:4", "Eb5:2 D5:1 C5:1 Bb4:4", "C5:6 G4:2", "Bb4:2 C5:2 Eb5:2 F5:1 F#5:1",
        "G5:4 F5:2 Eb5:2", "C5:6 Ab4:2", "G4:3 F#4:1 G4:4", "-:4 C5:1 Eb5:1 G5:2",
        "Gb5:4 Eb5:2 C5:2", "B4:3 D5:1 F5:2 Bb5:2", "G5:2 Eb5:2 C5:4", "B4:2 D5:2 G4:4",
      ],
      step(x) {
        const { s, t, bar, loop, sd, c, next, rng } = x, M = musIn, part = loop % 4;
        if (s % 2 === 0) I.bass(walk(c, next, s / 2, rng), t, sd * 1.9, 1, M);
        if (s % 2 === 0) DR.swish(t, 0.75, M);
        if (s === 2 || s === 6) DR.tap(t, 0.8, M);
        if (s === 0) DR.kick(t, 0.4, M);
        if (s === 0 && bar === 0 && loop > 0) DR.crash(t, 0.35, M);
        if (s === 0 || (s === 5 && rng() < 0.55)) voicing(c, 62).forEach((m) => I.piano(m, t, s === 0 ? sd * 3.5 : sd * 1.6, 0.45, M, -0.25, 0.16));
        if (part === 0) melody(this, x, (m, tt, d) => I.piano(m + 12, tt, d * 1.4, 0.8, M, 0.15));
        if (part === 1 || part === 3) melody(this, x, (m, tt, d) => I.sax(m - 12, tt, d, 1, M));
        if (part === 2) solo(this, x, (m, tt, d) => I.sax(m, tt, d, 1, M), 50, 70, SCALE.cBlues);
        if (part === 3 && s === 4 && rng() < 0.5) I.vibes(arp(c, 74, 3)[Math.floor(rng() * 3)], t, sd * 3, 0.5, M);
      },
    },
    tango: {
      lvl: 0.92, label: "Mafia Tango", desc: "1930s tango: bandoneon, violin, marcato piano, pizzicato.",
      bpm: 118, swing: 0, spb: 8, bars: 16,
      fx: { hp: 60, lp: 7500, mid: 2, drive: 1.7, wow: 0.0006, crackle: 0.5 },
      warm: [["bass", 30, 48], ["piano", 50, 74], ["pizz", 50, 74]],
      chords: ["Dm", "Dm", "A7", "A7", "A7", "A7", "Dm", "Dm", "Gm", "Gm", "Dm", "Dm", "E7", "A7", "Dm", "A7"],
      mel: [
        "D5:1 -:1 D5:1 E5:1 F5:2 A5:2", "G5:1 F5:1 E5:1 D5:1 A4:4", "C#5:1 -:1 C#5:1 D5:1 E5:2 G5:2", "F5:1 E5:1 D5:1 C#5:1 A4:4",
        "E5:3 F5:1 G5:2 A5:2", "Bb5:3 A5:1 G5:2 E5:2", "F5:3 E5:1 D5:2 A4:2", "D5:6 -:2",
        "Bb5:1 -:1 Bb5:1 A5:1 G5:2 D5:2", "Eb5:1 D5:1 C5:1 Bb4:1 G4:4", "A5:1 -:1 A5:1 G5:1 F5:2 D5:2", "E5:1 F5:1 G5:1 A5:1 D6:4",
        "D6:2 B5:2 G#5:2 E5:2", "C#6:2 A5:2 G5:2 E5:2", "D5:1 F5:1 A5:1 D6:1 C#6:2 A5:2", "-:2 A4:1 C#5:1 E5:1 G5:1 Bb5:2",
      ],
      step(x) {
        const { s, t, bar, loop, sd, c } = x, M = musIn, part = loop % 4;
        const sync = bar % 4 === 3, hits = sync ? [0, 3, 6] : [0, 2, 4, 6];
        if (hits.includes(s)) {
          const strong = s === 0 || s === 4 || sync;
          I.bass(bassRoot(c) + (s === 4 && !sync ? 7 : 0), t, sd * 0.9, strong ? 1 : 0.7, M);
          I.piano(bassRoot(c) + 12, t, sd * 0.7, strong ? 0.8 : 0.5, M, -0.2, 0.1);
          voicing(c, 60, false).forEach((m) => I.piano(m, t, sd * 0.6, strong ? 0.5 : 0.32, M, -0.2, 0.1));
        }
        if (part >= 1 && s % 2 === 1 && !sync) I.pizz(arp(c, 57, 4)[(s >> 1) % 4], t, 0.7, M);
        if (part === 0 || part === 2) melody(this, x, (m, tt, d) => I.bandoneon(m, tt, d * (d > sd * 1.5 ? 1 : 0.7), 1, M));
        if (part === 1 || part === 3) melody(this, x, (m, tt, d) => I.violin(m, tt, d, 1, M));
        if (part === 3 && (s === 0 || s === 4)) I.bandoneon(voicing(c, 60, false), t, sd * 0.8, 0.6, M, -0.3);
        if (s === 0 && bar === 0 && loop > 0) DR.timp(t, bassRoot(c) + 12, 0.6, M);
      },
    },
    valse: {
      lvl: 1, label: "Ghost Waltz", desc: "Haunted waltz in three: music box, organ, strings, distant bells.",
      bpm: 150, swing: 0, spb: 6, bars: 16,
      fx: { hp: 45, lp: 8000, mid: 0, drive: 1.3, wow: 0.0014, crackle: 0.5 },
      warm: [["box", 64, 100], ["bass", 28, 45], ["glock", 76, 100]],
      chords: ["Em", "Em", "Am", "Am", "B7", "B7", "Em", "Em", "C", "C", "Am", "Am", "F#m7b5", "B7", "Em", "B7"],
      mel: [
        "B5:2 G5:1 E5:1 B4:2", "E5:4 F#5:2", "G5:2 E5:1 C5:1 A4:2", "C6:4 B5:2", "A5:2 F#5:1 D#5:1 B4:2", "A5:4 G5:2", "F#5:2 E5:2 D#5:2", "E5:6",
        "E6:2 C6:1 G5:1 E5:2", "G5:4 F#5:2", "E6:2 C6:1 A5:1 E5:2", "C6:4 B5:2", "A5:2 C6:2 E6:2", "D#6:2 C6:2 A5:2", "B5:3 G5:1 F#5:1 E5:1", "D#5:2 F#5:2 A5:2",
      ],
      step(x) {
        const { s, t, bar, loop, sd, c } = x, M = musIn, part = loop % 4;
        if (s === 0) I.bass(bassRoot(c), t, sd * 2, 1, M);
        if (s === 2 || s === 4) I.organ(voicing(c, 62, false), t, sd * 1.3, 0.75, M);
        if (part >= 1 && s === 0) I.strings(voicing(c, 55, false), t, sd * 6, 0.9, M);
        if (part === 0 || part === 1) melody(this, x, (m, tt, d) => I.box(m, tt, d, 1, M, 0.2));
        if (part === 1) melody(this, x, (m, tt, d) => I.glock(m + 12, tt, 0.3, M, -0.3));
        if (part === 2) melody(this, x, (m, tt, d) => I.theremin(m - 12, tt, d, 1, M));
        if (part === 3) { melody(this, x, (m, tt, d) => I.box(m, tt, d, 1, M, 0.2)); if (s === 0) I.choir(voicing(c, 64, false), t, sd * 6, 0.7, M); }
        if (s === 0 && bar % 8 === 0 && part >= 1) I.bell(52, t, 0.6, M, -0.3);
      },
    },
    chicago: {
      lvl: 0.55, label: "Chicago Drums", desc: "Wild gangster swing: drums, brass, clarinet, trumpet, double bass.",
      bpm: 168, swing: 0.25, spb: 8, bars: 16,
      fx: { hp: 50, lp: 8500, mid: 1, drive: 2, wow: 0.0005, crackle: 0.35 },
      warm: [["bass", 30, 48], ["piano", 55, 75]],
      chords: ["Dm", "Dm", "Dm", "Dm", "Gm", "Gm", "Dm", "Dm", "A7", "A7", "Dm", "Dm", "Gm", "A7", "Dm", "A7"],
      mel: [
        "A4:1 D5:1 F5:1 A5:2 G5:1 F5:2", "D5:3 C5:1 D5:4", "A4:1 D5:1 F5:1 A5:2 Bb5:1 A5:2", "F5:3 E5:1 D5:4",
        "Bb5:2 A5:1 G5:1 D5:2 G5:2", "Bb5:3 A5:1 G5:4", "F5:2 E5:1 D5:1 A4:2 D5:2", "F5:6 -:2",
        "E5:1 G5:1 Bb5:1 C#6:2 Bb5:1 G5:2", "A5:4 E5:4", "D6:2 A5:1 F5:1 D5:2 F5:2", "A5:3 G5:1 F5:4",
        "G5:1 Bb5:1 D6:2 C6:1 Bb5:1 A5:2", "G5:1 E5:1 C#5:2 E5:2 G5:2", "D5:2 F5:2 A5:2 D6:2", "C#6:2 A5:2 E5:4",
      ],
      step(x) {
        const { s, t, bar, loop, sd, c, next, rng } = x, M = musIn, part = loop % 4;
        const fill = bar % 4 === 3 && s >= 4;
        if (!fill) { if (s % 2 === 0) DR.tom(t, 0, s % 4 === 0 ? 1 : 0.7, M); if (s === 3 || s === 7) DR.tom(t, 0, 0.45, M); }
        else DR.tom(t, 3 - (s - 4), 0.85, M);
        if (s === 0 || s === 4) DR.kick(t, 0.55, M);
        if (s === 2 || s === 6) DR.pedal(t, 0.9, M);
        if (s === 0 && bar === 0 && loop > 0) DR.crash(t, 0.6, M);
        if (s % 2 === 0) I.bass(walk(c, next, s / 2, rng), t, sd * 1.7, 1, M);
        if (part >= 1 && bar % 2 === 0 && (s === 3 || s === 7)) I.brass(voicing(c, 62, false), t, sd * 0.7, 1, M);
        if (part === 2 && bar % 2 === 1 && s === 0) I.brass(voicing(c, 58, false), t, sd * 3, 0.8, M, -0.2);
        if (part === 0) melody(this, x, (m, tt, d) => I.clarinet(m, tt, d, 1, M));
        if (part === 1) melody(this, x, (m, tt, d) => I.trumpet(m - 12, tt, d, 1, M, 0.1, 0.25, true));
        if (part === 2) solo(this, x, (m, tt, d) => I.clarinet(m, tt, d, 1, M), 69, 93, SCALE.dMin);
        if (part === 3) melody(this, x, (m, tt, d) => { I.trumpet(m - 12, tt, d, 0.9, M, 0.1, 0.25, true); I.clarinet(m, tt, d, 0.7, M); });
      },
    },
  };
  Object.values(STYLES).forEach((st) => { st._mel = phrase(st.mel, st.spb); st._c = st.chords.map(chord); });

  function startCrackle(level) {
    stopCrackle();
    if (!level) return;
    crackleSrc = ctx.createBufferSource(); crackleSrc.buffer = crackleBuffer(); crackleSrc.loop = true;
    const hp = filt("highpass", 600);
    crackleGain = ctx.createGain(); crackleGain.gain.value = 0.3 * level;
    crackleSrc.connect(hp); hp.connect(crackleGain); crackleGain.connect(musHP);
    crackleSrc.start();
  }
  function stopCrackle() { if (crackleSrc) { try { crackleSrc.stop(); } catch (_) {} crackleSrc = null; } }

  function applyFx(st, now) {
    const fx = st.fx, lp = mode === "heist" ? fx.lp * 0.55 : mode === "gold" ? Math.min(12000, fx.lp * 1.2) : fx.lp;
    musHP.frequency.setTargetAtTime(fx.hp, now, 0.05);
    musLP.frequency.setTargetAtTime(lp, now, 0.4);
    musMid.gain.setTargetAtTime(fx.mid, now, 0.05);
    musLvl.gain.setTargetAtTime(st.lvl || 1, now, 0.05);
    musDrive.curve = driveCurve(fx.drive);
    wowGain.gain.setTargetAtTime(fx.wow, now, 0.1);
  }
  function scheduleStep(st, i, t, sd) {
    const spb = st.spb, bar = Math.floor(i / spb) % st.bars, loop = Math.floor(i / (spb * st.bars));
    const x = { i, s: i % spb, t, bar, loop, sd, spb, c: st._c[bar], next: st._c[(bar + 1) % st.bars], rng: rng32(loop * 7919 + i * 31 + 17) };
    st.step(x);
    extras(x);
  }
  function playMusic(key, persist = true) {
    init();
    stopMusic();
    const k = key || musicKey;
    if (persist && key) { musicKey = key; localStorage.setItem(STORE_MUSIC, key); }
    if (k === "off" || !STYLES[k]) return;
    const st = STYLES[k], sd = 60 / st.bpm / 2, now = ctx.currentTime;
    playing = k; style = st; st._last = 0; st._imp = null;
    warm(st.warm);
    applyFx(st, now);
    musOut.gain.cancelScheduledValues(now);
    musOut.gain.setValueAtTime(0.0001, now);
    musOut.gain.linearRampToValueAtTime(vol.music * MUS_TRIM, now + 1.2);
    startCrackle(st.fx.crackle);
    seqStep = 0; seqNext = now + 0.25;
    seqTimer = setInterval(() => {
      if (ctx.state !== "running") return;
      if (seqNext < ctx.currentTime) seqNext = ctx.currentTime + 0.05;
      while (seqNext < ctx.currentTime + 0.35) {
        const sw = st.swing && seqStep % 2 === 1 ? sd * st.swing : 0;
        scheduleStep(st, seqStep, seqNext + sw, sd);
        seqNext += sd; seqStep++;
      }
    }, 40);
  }
  function stopMusic() {
    clearInterval(seqTimer); seqTimer = 0; playing = null; style = null; stopCrackle();
  }
  function setMode(m) {
    if (m === mode) return;
    mode = m;
    if (ctx && style) applyFx(style, ctx.currentTime);
  }

  // ---------- sound effects ----------
  const S = () => sfxIn;
  function coinShower(t, n, spread, v = 1) {
    for (let k = 0; k < n; k++) DR.coin(t + Math.pow(Math.random(), 1.4) * spread, v * (0.5 + Math.random() * 0.5) * (1 - k / (n * 1.4)), S());
  }
  function riser(t, dur, v, f0 = 110, f1 = 880) {
    tone("sawtooth", f0, t, dur, 0.09 * v, S(), { glide: f1, attack: dur * 0.85, lp: 300, lpTo: 4000, q: 2, send: 0.3 });
    tone("sawtooth", f0 * 1.01, t, dur, 0.06 * v, S(), { glide: f1 * 1.01, attack: dur * 0.85, lp: 300, lpTo: 4000, q: 2, send: 0.3 });
    nz(t, dur, 0.22 * v, S(), { type: "highpass", f: 1500, fTo: 7000, swell: 0.95, send: 0.3 });
  }
  function curtain(t, v) {
    nz(t, 1.1, 0.4 * v, S(), { f: 3200, fTo: 500, q: 0.8, attack: 0.08, send: 0.45 });
    nz(t + 0.05, 1.0, 0.25 * v, S(), { f: 1800, fTo: 300, q: 0.6, attack: 0.12, pan: 0.5, send: 0.45 });
  }
  function rumble(t, dur, v) {
    nz(t, 0.3, 0.7 * v, S(), { type: "highpass", f: 1200, attack: 0.002 });
    for (let k = 0; k < 4; k++) nz(t + k * (0.15 + Math.random() * 0.35), dur - k * 0.4, (0.9 - k * 0.15) * v, S(), { type: "lowpass", f: 320 - k * 40, fTo: 70, q: 0.8, attack: 0.03, send: 0.25 });
  }
  function creak(t, dur, v) {
    const x = ctx.createOscillator(), bp = filt("bandpass", 900, 9), g = ctx.createGain(), pts = new Float32Array(32);
    x.type = "sawtooth";
    for (let i = 0; i < 32; i++) pts[i] = 55 + Math.random() * 40 + 30 * Math.sin(i / 4);
    x.frequency.setValueCurveAtTime(pts, t, dur);
    bp.frequency.setValueAtTime(900, t); bp.frequency.exponentialRampToValueAtTime(1500, t + dur);
    adsr(g, t, 0.08, 0.5 * v, dur, 0.06, 0.9);
    x.connect(bp); bp.connect(g); route(g, S(), 0, 0.3);
    x.start(t); x.stop(t + dur + 0.1);
  }
  const A_MAJ = [57, 61, 64, 69];

  const PACKS = {
    casino: {
      label: "Casino 1930", desc: "Mechanical slot machine: lever, clacking reels, till bell, coin shower, brass.",
      click(t) { play(SMP.rim(), t, { gain: 0.5, rate: 1.6, dest: S() }); tone("sine", 1100, t, 0.04, 0.12, S(), { glide: 600 }); },
      boot(t) {
        DR.kick(t, 0.8, S());
        for (let k = 0; k < 18; k++) DR.snare(t + k * 0.042, 0.12 + k * 0.035, S());
        riser(t, 0.78, 0.8, 220, 880);
        I.brass([64], t + 0.3, 0.12, 1.4, S()); I.brass([69], t + 0.45, 0.12, 1.4, S()); I.brass([73], t + 0.6, 0.12, 1.4, S());
        I.brass(A_MAJ.map((m) => m + 12), t + 0.78, 1.5, 1.7, S());
        I.trumpet(88, t + 0.78, 1.3, 1.1, S(), 0.15, 0.35, true);
        DR.kick(t + 0.78, 1, S()); DR.timp(t + 0.78, 45, 1, S()); DR.crash(t + 0.78, 1, S());
        curtain(t + 0.8, 1);
        [81, 85, 88, 93, 97].forEach((m, k) => I.glock(m, t + 0.85 + k * 0.07, 0.8, S(), 0.3));
        coinShower(t + 0.9, 14, 1, 0.8);
      },
      spin(t) {
        for (let k = 0; k < 6; k++) play(SMP.rim(), t + k * 0.04, { gain: 0.35, rate: 2 + k * 0.12, dest: S() });
        DR.kick(t + 0.24, 0.5, S());
        nz(t + 0.2, 1.1, 0.14, S(), { f: 300, fTo: 1300, q: 1.2, swell: 0.25 });
        for (let k = 0; k < 16; k++) play(SMP.rim(), t + 0.26 + k * 0.055, { gain: 0.14 * (1 - k / 20), rate: 2.6, dest: S(), pan: 0.2 });
      },
      slam(t, i = 0) {
        DR.kick(t, 0.9, S());
        play(SMP.wood(0), t, { gain: 0.55, rate: 0.85 + i * 0.07, dest: S(), pan: (i - 2.5) / 4 });
        nz(t, 0.05, 0.28, S(), { f: 2600, q: 1.5, pan: (i - 2.5) / 4 });
      },
      tease(t) { riser(t, 1.6, 1); [0, 0.3, 0.75, 1.0, 1.35].forEach((d) => DR.kick(t + d, 0.6, S())); },
      line(t, k = 0) {
        const b = Math.min(k, 6) * 2;
        [0, 4, 7, 12].forEach((iv, j) => { I.vibes(69 + b + iv, t + j * 0.055, 0.6, 1.1, S()); I.glock(81 + b + iv, t + j * 0.055, 0.55, S()); });
        DR.coin(t + 0.22, 0.8, S());
      },
      coin(t) { DR.coin(t, 1, S()); DR.coin(t + 0.07, 0.45, S()); },
      scatter(t, k = 1) {
        DR.kick(t, 1, S());
        I.bell(45 + (k - 1) * 3, t, 1.1, S());
        I.brass([57, 60, 63].map((m) => m + (k - 1) * 3), t + 0.02, 0.45, 0.9, S());
        if (k >= 3) { DR.crash(t, 0.9, S()); DR.timp(t, 45, 1, S()); }
      },
      bonus(t) {
        I.brass(A_MAJ, t, 0.5, 1.6, S()); DR.timp(t, 45, 1, S()); DR.crash(t, 1, S()); DR.kick(t, 1, S());
        [64, 69, 73].forEach((m, k) => I.trumpet(m + 12, t + 0.55 + k * 0.13, 0.11, 1.3, S(), 0, 0.3, true));
        I.trumpet(88, t + 0.94, 1.1, 1.3, S(), 0, 0.35, true);
        I.brass(A_MAJ.map((m) => m + 12), t + 0.94, 1.1, 1.3, S());
        [81, 85, 88, 93, 97].forEach((m, k) => I.glock(m, t + 0.94 + k * 0.06, 0.8, S(), 0.3));
      },
      collect(t) {
        I.glock(96, t, 1.2, S()); I.glock(100, t + 0.03, 1, S());
        nz(t + 0.06, 0.28, 0.3, S(), { f: 1200, fTo: 400, q: 1 });
        coinShower(t + 0.1, 22, 1.2, 1);
      },
      big(t) {
        [[57, 61, 64, 69], [62, 66, 69, 74], [64, 68, 71, 76]].forEach((ch, k) => { I.brass(ch, t + k * 0.28, 0.2, 1.5, S()); DR.kick(t + k * 0.28, 0.9, S()); DR.snare(t + k * 0.28, 0.7, S()); });
        DR.crash(t, 0.8, S());
        for (let k = 0; k < 10; k++) DR.timp(t + 0.62 + k * 0.03, 45, 0.25 + k * 0.05, S());
        I.brass([69, 73, 76, 81], t + 0.95, 1.5, 1.7, S()); DR.crash(t + 0.95, 1, S()); DR.timp(t + 0.95, 45, 1, S());
        I.trumpet(85, t + 0.95, 1.4, 1.2, S(), 0.1, 0.35, true);
        coinShower(t + 1, 26, 1.6, 0.9);
      },
      lock(t) { DR.kick(t, 0.6, S()); play(SMP.rim(), t + 0.02, { gain: 0.55, rate: 1.2, dest: S() }); DR.coin(t + 0.05, 0.3, S()); },
      door(t) { creak(t, 0.8, 1); DR.kick(t + 0.82, 1, S()); I.bell(40, t + 0.82, 0.9, S()); rumble(t + 0.84, 1.2, 0.35); },
      stomp(t) { [[58, 0.3], [57, 0.3], [56, 0.3], [55, 1.0]].reduce((tt, [m, d]) => { I.trombone(m, tt, d, 1, S()); return tt + d + 0.04; }, t); },
      thunder(t) { rumble(t, 2.8, 1); },
    },
    bigband: {
      label: "Big Band", desc: "Drums and brass section: snare rolls, toms, fanfares, cymbals.",
      click(t) { DR.rim(t, 1.4, S()); },
      boot(t) {
        [3, 2, 1, 0].forEach((k, j) => DR.tom(t + j * 0.09, k, 0.9, S()));
        DR.kick(t + 0.38, 1, S()); DR.crash(t + 0.38, 1, S());
        I.brass([69, 73, 76, 81], t + 0.38, 0.25, 1.6, S());
        for (let k = 0; k < 8; k++) DR.snare(t + 0.42 + k * 0.042, 0.3 + k * 0.08, S());
        I.brass([69, 73, 76, 81], t + 0.78, 1.4, 1.7, S()); DR.kick(t + 0.78, 1, S()); DR.crash(t + 0.78, 1, S()); DR.timp(t + 0.78, 45, 0.9, S());
        I.trumpet(85, t + 0.78, 1.3, 1.2, S(), 0.1, 0.35, true);
        curtain(t + 0.8, 1);
        coinShower(t + 0.95, 10, 0.9, 0.7);
      },
      spin(t) { for (let k = 0; k < 22; k++) DR.snare(t + k * 0.038, 0.15 + k * 0.025, S()); DR.crash(t + 0.85, 0.35, S()); },
      slam(t, i = 0) { DR.tom(t, 3 - Math.min(3, Math.floor(i * 0.7)), 1, S()); DR.kick(t, 0.6, S()); },
      tease(t) {
        for (let k = 0; k < 32; k++) DR.timp(t + k * 0.05, 45, 0.15 + k * 0.025, S());
        I.brass([57, 60, 63, 66], t, 1.6, 0.9, S());
      },
      line(t, k = 0) {
        const b = Math.min(k, 6) * 2;
        I.brass([69 + b, 73 + b, 76 + b], t, 0.1, 1.3, S()); I.brass([73 + b, 76 + b, 81 + b], t + 0.13, 0.45, 1.5, S());
        I.trumpet(81 + b, t + 0.13, 0.45, 1.1, S(), 0.1, 0.3, true);
        DR.snare(t, 0.8, S()); DR.kick(t + 0.13, 0.8, S()); DR.bellRide(t + 0.13, 1, S());
      },
      coin(t) { DR.bellRide(t, 1.4, S()); I.glock(93, t, 0.9, S()); DR.coin(t + 0.02, 0.6, S()); },
      scatter(t, k = 1) {
        DR.timp(t, 45 + (k - 1) * 3, 1, S()); DR.kick(t, 0.9, S());
        I.brass([57, 60, 63, 66].map((m) => m + (k - 1) * 3), t, 0.4, 1.1, S());
        if (k >= 3) DR.crash(t, 1, S());
      },
      bonus(t) {
        DR.kick(t, 1, S()); DR.crash(t, 1, S()); I.brass(A_MAJ, t, 0.3, 1.7, S());
        [0, 1, 2, 3, 3, 2, 1, 0].forEach((k, j) => DR.tom(t + 0.35 + j * 0.07, k, 0.8, S()));
        I.brass(A_MAJ.map((m) => m + 12), t + 0.95, 1.2, 1.7, S()); DR.crash(t + 0.95, 1, S()); DR.kick(t + 0.95, 1, S());
      },
      collect(t) {
        [[64, 68, 71], [66, 69, 73], [69, 73, 76, 81]].forEach((ch, k) => { I.brass(ch, t + k * 0.16, k === 2 ? 0.9 : 0.12, 1.5, S()); DR.snare(t + k * 0.16, 0.6, S()); });
        DR.crash(t + 0.32, 0.9, S()); coinShower(t + 0.35, 14, 1, 0.8);
      },
      big(t) {
        for (let k = 0; k < 4; k++) { I.brass([57, 61, 64, 69].map((m) => m + [0, 0, 5, 7][k]), t + k * 0.22, 0.15, 1.6, S()); DR.snare(t + k * 0.22, 0.8, S()); DR.kick(t + k * 0.22, 0.9, S()); }
        DR.crash(t + 0.88, 1, S()); I.brass([69, 73, 76, 81], t + 0.88, 1.6, 1.8, S());
        I.trumpet(88, t + 0.88, 1.5, 1.2, S(), 0.1, 0.35, true);
        for (let k = 0; k < 14; k++) DR.timp(t + 0.88 + k * 0.05, 45, 0.5 - k * 0.02, S());
      },
      lock(t) { DR.snare(t, 0.7, S()); DR.rim(t, 0.8, S()); I.brass([76], t, 0.1, 0.9, S()); },
      door(t) { I.trombone(45, t, 0.7, 1, S(), 57); DR.gong(t + 0.72, 1, S()); },
      stomp(t) { PACKS.casino.stomp(t); },
      thunder(t) { for (let k = 0; k < 20; k++) DR.timp(t + k * 0.04, 40, 0.3 + k * 0.03, S()); DR.crash(t + 0.8, 1, S()); rumble(t + 0.1, 2.4, 0.7); },
    },
    occulte: {
      label: "Occult", desc: "Dark magic and mystery: gong, organ, ghost choir, crystals, breaths.",
      click(t) { I.glock(100, t, 0.9, S(), 0.2, 0.3); play(SMP.rim(), t, { gain: 0.15, rate: 2.2, dest: S() }); },
      boot(t) {
        nz(t, 0.8, 0.3, S(), { f: 300, fTo: 3000, q: 1.5, swell: 0.9, send: 0.6 });
        for (let k = 0; k < 14; k++) DR.timp(t + k * 0.052, 45, 0.15 + k * 0.05, S());
        I.organ([45, 52, 57, 60, 64], t + 0.1, 2.2, 1.5, S());
        DR.gong(t + 0.78, 1, S()); DR.kick(t + 0.78, 0.9, S());
        I.choir([69, 72, 76], t + 0.78, 1.8, 1.3, S());
        [0, 0.5, 1].forEach((d) => I.bell(45, t + 0.85 + d, 0.8, S(), 0, 0.7));
        curtain(t + 0.8, 0.8);
        [88, 91, 96, 100].forEach((m, k) => I.glock(m, t + 0.9 + k * 0.09, 0.6, S(), 0.3, 0.6));
      },
      spin(t) { nz(t, 0.9, 0.35, S(), { f: 400, fTo: 3500, q: 1.4, swell: 0.6, send: 0.4 }); tone("sine", 55, t, 0.9, 0.25, S(), { attack: 0.3, glide: 70 }); },
      slam(t, i = 0) { DR.kick(t, 0.8, S()); play(SMP.kick(), t, { gain: 0.4, rate: 0.6, dest: S() }); I.glock([69, 72, 74, 76, 79, 81][i % 6] + 12, t, 0.7, S(), (i - 2.5) / 4, 0.6); },
      tease(t) {
        I.choir([57, 60, 63], t, 1.6, 1.2, S()); I.theremin(69, t, 0.8, 0.8, S()); I.theremin(76, t + 0.8, 0.8, 0.8, S());
        [0, 0.3, 0.75, 1.05, 1.4].forEach((d) => DR.kick(t + d, 0.6, S()));
      },
      line(t, k = 0) {
        const b = Math.min(k, 6) * 2;
        [0, 3, 7, 12, 15].forEach((iv, j) => I.box(69 + b + iv, t + j * 0.05, 1, 1, S(), 0.2, 0.6));
        I.choir([69 + b, 76 + b], t, 0.6, 0.6, S()); nz(t, 0.7, 0.08, S(), { type: "highpass", f: 6000, swell: 0.3, send: 0.6 });
      },
      coin(t) { const m = 93 + Math.floor(Math.random() * 5); I.glock(m, t, 1.2, S(), 0.2, 0.6); I.glock(m + 7, t + 0.06, 0.7, S(), -0.2, 0.6); DR.coin(t, 0.4, S()); },
      scatter(t, k = 1) {
        DR.gong(t, 0.9, S(), 1 + (k - 1) * 0.12); DR.kick(t, 0.8, S());
        I.organ([45, 48, 51].map((m) => m + (k - 1) * 3), t, 0.9, 1.2, S());
        if (k >= 3) I.choir([57, 60, 63, 66], t, 1.2, 1.2, S());
      },
      bonus(t) {
        nz(t, 1, 0.35, S(), { f: 300, fTo: 4000, q: 1.5, swell: 0.9, send: 0.5 });
        DR.gong(t + 0.9, 1, S()); I.organ([45, 57, 61, 64, 69], t + 0.9, 1.8, 1.5, S()); I.choir([69, 73, 76], t + 0.9, 1.8, 1.2, S());
        [81, 85, 88, 93, 97].forEach((m, k) => I.glock(m, t + 0.95 + k * 0.07, 0.8, S(), 0.3, 0.6));
      },
      collect(t) {
        for (let k = 0; k < 16; k++) I.box(72 + [0, 3, 7, 10][k % 4] + 12 * Math.floor(k / 4), t + k * 0.05, 0.6, 0.8, S(), (k % 2 ? 0.3 : -0.3), 0.5);
        for (let k = 0; k < 8; k++) I.glock(96 + Math.floor(Math.random() * 8), t + 0.3 + Math.random() * 0.8, 0.5, S(), (Math.random() - 0.5), 0.6);
      },
      big(t) {
        DR.gong(t, 1, S()); I.organ([45, 57, 61, 64, 69, 73], t, 2.4, 1.6, S()); I.choir([69, 73, 76, 81], t + 0.2, 2.2, 1.4, S());
        [0, 0.45, 0.9].forEach((d) => I.bell(57, t + d, 0.9, S(), 0, 0.6));
        for (let k = 0; k < 10; k++) I.glock(88 + Math.floor(Math.random() * 12), t + 0.5 + Math.random() * 1.5, 0.5, S(), Math.random() - 0.5, 0.6);
      },
      lock(t) { I.glock(93, t, 0.8, S(), 0, 0.4); tone("sine", 70, t, 0.3, 0.35, S(), { glide: 45 }); },
      door(t) { creak(t, 0.9, 0.9); DR.gong(t + 0.85, 1, S(), 0.8); },
      stomp(t) { I.theremin(72, t, 0.5, 1, S()); I.theremin(60, t + 0.5, 1.1, 1, S()); I.organ([36, 43], t + 0.4, 1.2, 0.8, S()); },
      thunder(t) { rumble(t, 3, 1); DR.gong(t + 0.05, 0.4, S(), 0.7); },
    },
  };
  const EVENTS = {
    boot: "Start (PLAY)", click: "Button click", spin: "Spin", slam: "Reel stop", tease: "Tease", line: "Winning line",
    coin: "Coin", scatter: "Safe", bonus: "Bonus", collect: "Collect", big: "Big win", lock: "Lock / sack",
    door: "Door", stomp: "Loss (cat)", thunder: "Thunder",
  };
  let musicKey = localStorage.getItem(STORE_MUSIC) || "speakeasy";
  if (musicKey !== "off" && !STYLES[musicKey]) musicKey = "speakeasy";
  let packKey = localStorage.getItem(STORE_PACK) || "casino";
  if (!PACKS[packKey]) packKey = "casino";

  function sfx(name, arg) {
    if (muted) return;
    init();
    const fn = (PACKS[packKey] || PACKS.casino)[name];
    if (fn) fn(ctx.currentTime + 0.01, arg);
  }
  function setVolumes(v) {
    if (v.sfx != null) vol.sfx = v.sfx;
    if (v.music != null) vol.music = v.music;
    if (!ctx) return;
    sfxIn.gain.setTargetAtTime(vol.sfx, ctx.currentTime, 0.05);
    musOut.gain.setTargetAtTime(vol.music * MUS_TRIM, ctx.currentTime, 0.05);
  }
  function setMuted(m) { muted = !!m; if (ctx) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.05); }
  function setPack(k) { if (PACKS[k]) { packKey = k; localStorage.setItem(STORE_PACK, k); } }

  // Offline render used by the sound lab to measure levels: kind "sfx" | "music".
  async function measure(kind, key, arg, seconds) {
    const saved = { ctx, sr, master, sfxIn, sfxRevIn, musIn, musRevIn, musOut, musDrive, musHP, musLP, musMid, musLvl, wowGain, flutGain, noiseBuf, crackleSrc, crackleGain, mode, packKey };
    const off = new OfflineAudioContext(2, Math.ceil(seconds * 44100), 44100);
    try {
      build(off);
      crackleSrc = null;
      if (kind === "sfx") { packKey = key.pack; PACKS[key.pack][key.ev](0.05, arg); }
      else {
        const st = STYLES[key], sd = 60 / st.bpm / 2;
        mode = key.mode || "base";
        applyFx(st, 0); startCrackle(st.fx.crackle); st._last = 0;
        for (let i = 0, t = 0.05; t < seconds - 0.5; i++, t += sd) scheduleStep(st, i, t + (st.swing && i % 2 ? sd * st.swing : 0), sd);
      }
    } finally {
      ({ ctx, sr, master, sfxIn, sfxRevIn, musIn, musRevIn, musOut, musDrive, musHP, musLP, musMid, musLvl, wowGain, flutGain, noiseBuf, crackleSrc, crackleGain, mode, packKey } = saved);
    }
    const out = await off.startRendering(), d = out.getChannelData(0);
    let peak = 0, sum = 0, nan = 0;
    for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a !== a) nan++; else { if (a > peak) peak = a; sum += a * a; } }
    return { peak, rms: Math.sqrt(sum / d.length), nan };
  }
  function check() {
    const bad = [];
    Object.entries(STYLES).forEach(([k, st]) => {
      if (st._mel.bad.length) bad.push(k + ": mesures " + st._mel.bad.join(","));
      if (st.chords.length !== st.bars || st._c.some((c) => !c.iv)) bad.push(k + ": accords");
    });
    return bad;
  }

  root.MatouAudio = {
    init, sfx, setVolumes, setMuted, setPack, setMode, EVENTS, playMusic, stopMusic, measure, check,
    get music() { return musicKey; }, get pack() { return packKey; }, get playing() { return playing; },
    styles: Object.fromEntries(Object.entries(STYLES).map(([k, s]) => [k, { label: s.label, desc: s.desc }])),
    packs: Object.fromEntries(Object.entries(PACKS).map(([k, p]) => [k, { label: p.label, desc: p.desc }])),
  };
})(typeof window !== "undefined" ? window : globalThis);
