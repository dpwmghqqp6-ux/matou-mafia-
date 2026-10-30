(function () {
  const BASE = "./assets/matou/cat/";
  const CLIPS = {
    idle: {},
    big: {},
    mega: {},
    bonus: {},
    tease: {},
    plant: { hit: 1.42, hand: [0.14, 0.2] },
    lose: { cooldown: 14 },
  };
  const ALIAS = { "": "idle", win: "big", big: "big", mega: "mega", bonus: "bonus", tease: "tease", stomp: "lose", drop: "plant", plant: "plant" };

  let img, wrap, videos = {}, cur = null, pending = null, queue = null, raf = 0, waiters = [], active = false, lastPlayed = {};

  // Exhaled puff in lose.webm crossing the left frame edge (1280px frame height), every 0.05s from 2.9s:
  // alpha mass in the edge column, its vertical centre and spread.
  const EXHALE = {
    clip: "lose", t0: 2.9, dt: 0.05,
    m: [120,160,224,245,261,277,285,305,313,318,298,277,234,201,165,103,80],
    y: [694,686,672,667,666,659,660,661,660,658,658,659,666,667,663,646,635],
    s: [100,95,75,78,82,84,86,92,95,101,102,102,100,95,95,108,104],
  };
  const EXT = 0.5, TOP = 0.25, TALL = 0.55;
  let smokeCv, smokeCx, sprite, puffs = [], lastNow = 0, spawnAcc = 0;

  function exhaleSample(t) {
    const f = (t - EXHALE.t0) / EXHALE.dt, i = Math.floor(f);
    if (i < 0 || i >= EXHALE.m.length - 1) return null;
    const k = f - i, lerp = (a) => a[i] + (a[i + 1] - a[i]) * k;
    return { m: lerp(EXHALE.m) / 320, y: lerp(EXHALE.y) / 1280, s: lerp(EXHALE.s) / 1280 };
  }
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 0.5;

  function smokeInit() {
    smokeCv = document.createElement("canvas");
    smokeCv.className = "cat-smoke";
    (wrap.parentElement || wrap).appendChild(smokeCv);
    smokeCx = smokeCv.getContext("2d");
    sprite = document.createElement("canvas");
    sprite.width = sprite.height = 64;
    const g = sprite.getContext("2d"), rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    rg.addColorStop(0, "rgba(222,217,196,1)");
    rg.addColorStop(0.5, "rgba(214,209,188,.55)");
    rg.addColorStop(1, "rgba(205,200,180,0)");
    g.fillStyle = rg; g.fillRect(0, 0, 64, 64);
  }

  function smoke(now) {
    if (!smokeCv) return;
    const dt = Math.min(0.05, lastNow ? (now - lastNow) / 1000 : 0);
    lastNow = now;
    const v = videos[EXHALE.clip];
    if (!v) return;
    const s = cur === EXHALE.clip && !v.paused ? exhaleSample(v.currentTime) : null;
    if (!s && !puffs.length) { if (smokeCv.width) { smokeCv.width = 0; smokeCv.height = 0; } spawnAcc = 0; return; }
    if (!v.offsetHeight) return;
    const H = v.offsetHeight, ox = EXT * H, oy = -TOP * H;
    const host = smokeCv.parentElement || wrap;
    const hr = host.getBoundingClientRect(), vr = v.getBoundingClientRect();
    const cw = Math.round((EXT + 0.15) * H), ch = Math.round(TALL * H), dpr = Math.min(1.5, window.devicePixelRatio || 1);
    if (smokeCv.width !== Math.round(cw * dpr) || smokeCv.height !== Math.round(ch * dpr)) {
      smokeCv.width = Math.round(cw * dpr); smokeCv.height = Math.round(ch * dpr);
      smokeCv.style.width = cw + "px"; smokeCv.style.height = ch + "px";
    }
    smokeCv.style.left = (vr.left - hr.left - ox) + "px";
    smokeCv.style.top = (vr.top - hr.top + TOP * H) + "px";

    if (s && dt > 0) {
      spawnAcc += dt * 70 * s.m;
      while (spawnAcc >= 1) {
        spawnAcc -= 1;
        puffs.push({ x: 0.005 + Math.random() * 0.035, y: s.y + gauss() * s.s * 0.7, age: 0,
          life: 1.1 + Math.random() * 0.8, vx: -(0.2 + Math.random() * 0.2), vy: -(0.01 + Math.random() * 0.035),
          a: 0.32 + 0.22 * Math.min(1, s.m), r: 0.03 + Math.random() * 0.025, sp: 0.05 + Math.random() * 0.05 });
      }
    } else spawnAcc = 0;

    smokeCx.setTransform(dpr, 0, 0, dpr, 0, 0);
    smokeCx.clearRect(0, 0, cw, ch);
    puffs = puffs.filter((p) => {
      p.age += dt;
      if (p.age >= p.life) return false;
      const k = p.age / p.life, drag = Math.exp(-1.7 * dt);
      p.vx *= drag; p.vy *= drag;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const r = (p.r + p.sp * p.age) * H;
      smokeCx.globalAlpha = p.a * Math.min(1, p.age / 0.06) * Math.pow(1 - k, 1.5);
      smokeCx.drawImage(sprite, p.x * H + ox - r, p.y * H + oy - r, r * 2, r * 2);
      return true;
    });
    smokeCx.globalAlpha = 1;
  }

  function format() {
    const probe = document.createElement("video");
    const ua = navigator.userAgent;
    const safari = /^((?!chrome|chromium|android|crios|fxios|edg).)*safari/i.test(ua);
    if (safari && probe.canPlayType('video/mp4; codecs="hvc1"')) return ".mov";
    if (!safari && probe.canPlayType('video/webm; codecs="vp9"')) return ".webm";
    return null;
  }

  function show(name) {
    if (cur && cur !== name) {
      const old = videos[cur];
      old.classList.remove("on");
      old.pause();
    }
    cur = name;
    videos[name].classList.add("on");
    wrap.dataset.state = name;
  }

  function start(name) {
    const v = videos[name];
    if (!v) return;
    if (pending && pending !== name && pending !== cur) videos[pending].pause();
    pending = name;
    if (name === cur) { v.currentTime = 0; v.play().catch(() => {}); pending = null; return; }
    if (v.currentTime > 0) v.currentTime = 0;
    const go = () => { if (pending === name) { pending = null; show(name); } };
    const p = v.play();
    if (p && p.then) p.then(() => {
      if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(go);
      else requestAnimationFrame(go);
    }).catch(() => { if (pending === name) pending = null; });
  }

  function tick(now) {
    raf = requestAnimationFrame(tick);
    smoke(now || performance.now());
    if (!waiters.length) return;
    const t = cur ? videos[cur].currentTime : 0;
    waiters = waiters.filter((w) => {
      if (w.name !== cur) { if (w.seen) { w.res(); return false; } return true; }
      w.seen = true;
      if (t >= w.at) { w.res(); return false; }
      return true;
    });
  }

  function onEnded(name) {
    if (name !== cur) return;
    const next = queue || "idle";
    queue = null;
    start(next);
  }

  function set(m) {
    if (!active) return;
    const name = ALIAS[m || ""] || "idle";
    if (name === "idle") { if (!cur) start("idle"); else queue = null; return; }
    const now = performance.now() / 1000, cd = CLIPS[name].cooldown;
    if (cd && now - (lastPlayed[name] || -1e9) < cd) return;
    lastPlayed[name] = now;
    queue = null;
    start(name);
  }

  function reach(m, at) {
    const name = ALIAS[m] || m;
    if (!active) return Promise.resolve();
    const t = at != null ? at : (CLIPS[name] || {}).hit || 0;
    return new Promise((res) => {
      const w = { name, at: t, res };
      waiters.push(w);
      setTimeout(() => { if (waiters.includes(w)) { waiters = waiters.filter((x) => x !== w); res(); } }, (t + 2) * 1000);
    });
  }

  function rect() { return (active && cur ? videos[cur] : img).getBoundingClientRect(); }
  function hand() { return CLIPS.plant.hand; }

  function teardown() {
    cancelAnimationFrame(raf);
    active = false;
    waiters.forEach((w) => w.res()); waiters = [];
    Object.values(videos).forEach((v) => v.remove());
    videos = {}; cur = null;
    if (smokeCv) { smokeCv.remove(); smokeCv = null; puffs = []; }
    wrap.classList.remove("animated");
  }

  function init() {
    img = document.getElementById("cat");
    wrap = document.getElementById("catWrap");
    if (!img || !wrap) return;
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ext = format();
    if (!ext) return;
    Object.keys(CLIPS).forEach((name) => {
      const v = document.createElement("video");
      v.className = "cat-anim clip-" + name;
      v.muted = true; v.playsInline = true; v.disablePictureInPicture = true;
      v.setAttribute("muted", ""); v.setAttribute("playsinline", "");
      v.preload = name === "idle" ? "auto" : "none";
      v.loop = name === "idle";
      v.src = BASE + name + ext;
      v.addEventListener("ended", () => onEnded(name));
      let tries = 0;
      v.addEventListener("error", () => {
        if (name === "idle" && !active) { teardown(); return; }
        if (tries++ < 3) setTimeout(() => v.load(), 1200 * tries);
      });
      wrap.appendChild(v);
      videos[name] = v;
    });
    smokeInit();
    const idle = videos.idle;
    const ready = () => {
      if (active) return;
      active = true;
      start("idle");
      const reveal = () => { if (cur === "idle") wrap.classList.add("animated"); else requestAnimationFrame(reveal); };
      reveal();
      Object.keys(videos).forEach((n) => { if (n !== "idle") { videos[n].preload = "auto"; videos[n].load(); } });
    };
    if (idle.readyState >= 3) ready(); else idle.addEventListener("canplay", ready, { once: true });
    raf = requestAnimationFrame(tick);
    document.addEventListener("visibilitychange", () => {
      if (!cur) return;
      if (document.hidden) videos[cur].pause(); else videos[cur].play().catch(() => {});
    });
  }

  window.MatouCat = { init, set, reach, rect, hand, get active() { return active; }, get state() { return cur; } };
})();
