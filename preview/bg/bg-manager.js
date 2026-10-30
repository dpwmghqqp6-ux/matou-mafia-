(function (root) {
  const KEYS = ["a", "b"];
  const FILES = { a: "./bg/bg-a-webgl.js", b: "./bg/bg-b-video.js" };
  const STORE = "matou.bg";
  const backends = {};
  const loading = {};
  let current = null, currentKey = null, host = null, flashEl = null, marqueeMode = "idle";

  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s) => document.querySelector(s);

  function register(key, impl) { backends[key] = impl; }

  function load(key) {
    if (backends[key]) return Promise.resolve(backends[key]);
    if (!loading[key]) {
      loading[key] = new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = FILES[key];
        s.onload = () => (backends[key] ? resolve(backends[key]) : reject(new Error("bg " + key + " did not register")));
        s.onerror = () => reject(new Error("bg " + key + " failed to load"));
        document.head.appendChild(s);
      });
    }
    return loading[key];
  }

  function pickInitial() {
    const q = new URLSearchParams(location.search).get("bg");
    if (q && KEYS.includes(q.toLowerCase())) return q.toLowerCase();
    return "a";
  }

  async function use(key) {
    if (!KEYS.includes(key) || key === currentKey) return;
    currentKey = key;
    localStorage.setItem(STORE, key);
    document.querySelectorAll(".demo .bgsel").forEach((b) => b.classList.toggle("on", b.dataset.bg === key));
    const impl = await load(key);
    if (currentKey !== key) return;
    if (current && current.unmount) current.unmount();
    host.innerHTML = "";
    current = impl;
    await impl.mount(host, { reduced: reduced() });
    if (impl.setMarquee) impl.setMarquee(marqueeMode);
    if (typeof window.syncCarFg === "function") window.syncCarFg();
    else if (typeof syncCarFg === "function") syncCarFg();
  }

  function call(name, ...args) {
    if (current && typeof current[name] === "function") current[name](...args);
  }

  function lightning() {
    if (!flashEl) flashEl = $("#lightning");
    if (flashEl) {
      flashEl.classList.remove("on");
      void flashEl.offsetWidth;
      flashEl.classList.add("on");
      setTimeout(() => flashEl.classList.remove("on"), 700);
    }
    call("lightning");
  }

  function bonusWin(on) {
    document.querySelectorAll("#bonusBg > canvas, #table > canvas.skin").forEach((c) => c._fx && c._fx.win(on));
  }

  function windowsWin(on) {
    call("windowsWin", !!on);
    bonusWin(!!on);
    if (on) setTimeout(() => { call("windowsWin", false); bonusWin(false); }, 2200);
  }

  function setMarquee(mode) {
    marqueeMode = mode || "idle";
    const table = $("#table");
    if (table) table.dataset.marquee = marqueeMode;
    call("setMarquee", marqueeMode);
  }

  function neonBoost(on) {
    const neon = $("#neonSign");
    if (neon) neon.classList.toggle("boost", !!on);
    call("neonBoost", !!on);
  }

  function fitWorld() { call("resize"); }

  function init() {
    host = $("#bgHost");
    flashEl = $("#lightning");
    addEventListener("resize", fitWorld);
    document.querySelectorAll(".demo .bgsel").forEach((b) => (b.onclick = () => use(b.dataset.bg)));
    const neon = $("#neonSign");
    if (neon) {
      neon.classList.add("ignite");
      setTimeout(() => neon.classList.remove("ignite"), 1800);
    }
    setMarquee("idle");
    use(pickInitial()).catch((e) => console.error(e));
  }

  root.MatouBG = { register, use, get current() { return currentKey; } };
  root.MatouScene = { init, fitWorld, lightning, windowsWin, setMarquee, neonBoost };
})(typeof window !== "undefined" ? window : globalThis);
