(function () {
  const ROOT_ID = "matouFx";
  let root = null, irisEl = null, smokeEl = null, burnEl = null, cardEl = null, busy = Promise.resolve();

  function ensure() {
    if (root) return root;
    root = document.createElement("div");
    root.id = ROOT_ID;
    root.innerHTML = `
      <div class="fx-iris" aria-hidden="true"><i></i></div>
      <canvas class="fx-smoke" aria-hidden="true"></canvas>
      <div class="fx-burn" aria-hidden="true"></div>
      <div class="fx-card" aria-hidden="true"><b class="fx-card-kicker"></b><h2 class="fx-card-title"></h2><p class="fx-card-sub"></p></div>
    `;
    document.body.appendChild(root);
    irisEl = root.querySelector(".fx-iris");
    smokeEl = root.querySelector(".fx-smoke");
    burnEl = root.querySelector(".fx-burn");
    cardEl = root.querySelector(".fx-card");
    return root;
  }

  function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }
  function reduced() { return matchMedia("(prefers-reduced-motion: reduce)").matches; }

  function focusPoint(el) {
    if (!el) return { x: 0.5, y: 0.5 };
    const r = el.getBoundingClientRect();
    return {
      x: (r.left + r.width * 0.5) / innerWidth,
      y: (r.top + r.height * 0.62) / innerHeight,
    };
  }

  async function iris({ open = false, ms = 700, center } = {}) {
    ensure();
    const c = center || focusPoint(document.getElementById("catWrap"));
    irisEl.style.setProperty("--ix", (c.x * 100) + "%");
    irisEl.style.setProperty("--iy", (c.y * 100) + "%");
    irisEl.classList.add("on");
    if (reduced()) {
      irisEl.classList.toggle("closed", !open);
      irisEl.classList.toggle("opened", open);
      if (open) { await wait(80); irisEl.classList.remove("on", "closed", "opened"); }
      return;
    }
    void irisEl.offsetWidth;
    if (open) {
      irisEl.classList.add("closed");
      await wait(30);
      irisEl.classList.remove("closed");
      irisEl.classList.add("opened");
      await wait(ms);
      irisEl.classList.remove("on", "opened", "closed");
    } else {
      irisEl.classList.remove("opened");
      irisEl.classList.add("closing");
      await wait(ms);
      irisEl.classList.add("closed");
      irisEl.classList.remove("closing");
    }
  }

  function smokeDraw(canvas, t, amount) {
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const W = Math.round(innerWidth * dpr), H = Math.round(innerHeight * dpr);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    ctx.clearRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, W, 0);
    const x = ((t * 0.18) % 1.4) - 0.2;
    const c01 = (v) => Math.min(1, Math.max(0, v));
    g.addColorStop(c01(x - 0.25), "rgba(0,0,0,0)");
    g.addColorStop(c01(x), `rgba(18,14,10,${0.92 * amount})`);
    g.addColorStop(c01(x + 0.35), `rgba(40,28,18,${0.75 * amount})`);
    g.addColorStop(c01(x + 0.7), "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) {
      const px = ((i * 97.13 + t * 40) % (W + 80)) - 40;
      const py = (Math.sin(t * 0.7 + i) * 0.2 + 0.5 + (i % 7) * 0.05) * H;
      const r = 30 + (i % 5) * 18;
      const grd = ctx.createRadialGradient(px, py, 0, px, py, r);
      grd.addColorStop(0, `rgba(220,200,170,${0.08 * amount})`);
      grd.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
    }
  }

  async function smoke({ ms = 900, amount = 1 } = {}) {
    ensure();
    if (reduced()) { smokeEl.classList.add("on"); await wait(120); smokeEl.classList.remove("on"); return; }
    smokeEl.classList.add("on");
    const start = performance.now();
    await new Promise((resolve) => {
      const tick = (now) => {
        const u = Math.min(1, (now - start) / ms);
        const a = amount * (u < 0.35 ? u / 0.35 : u > 0.7 ? (1 - u) / 0.3 : 1);
        smokeDraw(smokeEl, (now - start) / 1000, a);
        if (u < 1) requestAnimationFrame(tick); else resolve();
      };
      requestAnimationFrame(tick);
    });
    smokeEl.classList.remove("on");
    smokeEl.getContext("2d").clearRect(0, 0, smokeEl.width, smokeEl.height);
  }

  async function burn({ ms = 800 } = {}) {
    ensure();
    burnEl.classList.add("on");
    if (!reduced()) {
      burnEl.classList.add("run");
      await wait(ms);
      burnEl.classList.remove("run");
    } else {
      await wait(100);
    }
    burnEl.classList.remove("on");
  }

  async function titleCard({ kicker = "", title = "", sub = "", ms = 1400, green = false } = {}) {
    ensure();
    cardEl.querySelector(".fx-card-kicker").textContent = kicker;
    cardEl.querySelector(".fx-card-title").textContent = title;
    cardEl.querySelector(".fx-card-sub").textContent = sub;
    cardEl.classList.toggle("green", !!green);
    cardEl.classList.add("on");
    await wait(reduced() ? Math.min(ms, 400) : ms);
    cardEl.classList.add("out");
    await wait(reduced() ? 80 : 320);
    cardEl.classList.remove("on", "out", "green");
  }

  async function sequence(steps) {
    const prev = busy;
    let release;
    busy = new Promise((r) => (release = r));
    await prev;
    try {
      for (const step of steps) {
        if (step.iris) await iris(step.iris);
        if (step.smoke) await smoke(step.smoke === true ? {} : step.smoke);
        if (step.burn) await burn(step.burn === true ? {} : step.burn);
        if (step.card) await titleCard(step.card);
        if (step.wait) await wait(step.wait);
        if (typeof step.fn === "function") await step.fn();
      }
    } finally {
      release();
    }
  }

  /** Base → bonus choice */
  async function toBonusChoice() {
    const stage = document.getElementById("stage");
    if (stage) { stage.classList.add("punch"); setTimeout(() => stage.classList.remove("punch"), 420); }
    await sequence([
      { iris: { open: false, ms: 620 } },
      { burn: { ms: 500 } },
    ]);
  }

  /** After bonus picked → doors */
  async function toDoors(kind) {
    await sequence([
      { smoke: { ms: 700 } },
      { iris: { open: false, ms: 480 } },
    ]);
  }

  /** After door → feature */
  async function toFeature(kind) {
    const title = kind === "gold" ? "GOLD RUSH" : "HEIST";
    const sub = kind === "gold" ? "GOLD INGOTS" : "MYSTERY SACKS";
    await sequence([
      { iris: { open: false, ms: 500 } },
      { card: { kicker: "MATOU MAFIA", title, sub, ms: 1300, green: kind !== "gold" } },
      { iris: { open: true, ms: 650 } },
    ]);
  }

  /** Bonus → base */
  async function toBase() {
    await sequence([
      { iris: { open: false, ms: 550 } },
      { smoke: { ms: 500 } },
      { iris: { open: true, ms: 700 } },
    ]);
    const wrap = document.getElementById("catWrap");
    if (wrap) {
      wrap.classList.add("fx-wink");
      setTimeout(() => wrap.classList.remove("fx-wink"), 700);
    }
  }

  window.MatouFX = { iris, smoke, burn, titleCard, sequence, toBonusChoice, toDoors, toFeature, toBase, ensure };
})();
