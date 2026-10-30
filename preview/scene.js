(function (root) {
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  let rainRaf = 0, drops = [], ripples = [], lampTimer = 0, lifeTimer = 0;
  let world, rainCanvas, ctx, flashEl;

  function $(sel, el) { return (el || document).querySelector(sel); }

  function fitWorld() {
    if (!world) return;
    const vw = innerWidth, vh = innerHeight;
    const scale = Math.max(vw / 1920, vh / 1080);
    world.style.width = "1920px";
    world.style.height = "1080px";
    world.style.transform = `translate(-50%,-50%) scale(${scale})`;
  }

  function initRain() {
    rainCanvas = $("#rainCanvas");
    if (!rainCanvas || reduced()) return;
    ctx = rainCanvas.getContext("2d");
    rainCanvas.width = 1920;
    rainCanvas.height = 1080;
    drops = Array.from({ length: 140 }, () => ({
      x: Math.random() * 2000,
      y: Math.random() * 1080,
      len: 12 + Math.random() * 18,
      sp: 9 + Math.random() * 10,
      a: 0.15 + Math.random() * 0.35,
    }));
    ripples = [];
    const tick = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, 1920, 1080);
      ctx.strokeStyle = "rgba(220,200,160,0.35)";
      ctx.lineWidth = 1.2;
      for (const d of drops) {
        ctx.globalAlpha = d.a;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + 4, d.y + d.len);
        ctx.stroke();
        d.x += 1.6;
        d.y += d.sp;
        if (d.y > 980) {
          if (Math.random() < 0.35 && d.x > 80 && d.x < 1840) {
            ripples.push({ x: d.x, y: 960 + Math.random() * 80, r: 2, a: 0.45 });
          }
          d.y = -20;
          d.x = Math.random() * 2000 - 40;
        }
        if (d.x > 1960) d.x = -20;
      }
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        ctx.globalAlpha = r.a;
        ctx.strokeStyle = "rgba(232,181,74,0.55)";
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, r.r * 1.6, r.r * 0.55, 0, 0, Math.PI * 2);
        ctx.stroke();
        r.r += 0.55;
        r.a -= 0.018;
        if (r.a <= 0) ripples.splice(i, 1);
      }
      ctx.globalAlpha = 1;
      rainRaf = requestAnimationFrame(tick);
    };
    rainRaf = requestAnimationFrame(tick);
  }

  function flickerLamp() {
    const lamp = $("#lampHalo");
    if (!lamp || reduced()) return;
    const loop = () => {
      lamp.style.opacity = String(0.55 + Math.random() * 0.35);
      lamp.classList.toggle("cut", Math.random() < 0.04);
      lampTimer = setTimeout(loop, 80 + Math.random() * 220);
    };
    loop();
  }

  function scheduleLife() {
    if (reduced()) return;
    const rat = $("#lifeRat");
    const alley = $("#lifeAlleyCat");
    const car = $("#carLights");
    const smoke = $("#carSmoke");
    const wins = [...document.querySelectorAll(".win-glow")];

    const runRat = () => {
      if (!rat) return;
      rat.classList.remove("run");
      void rat.offsetWidth;
      rat.classList.add("run");
    };
    const blinkWin = () => {
      wins.forEach((w) => {
        if (Math.random() < 0.45) {
          w.classList.add("on");
          setTimeout(() => w.classList.remove("on"), 800 + Math.random() * 2200);
        }
      });
    };
    const carPulse = () => {
      if (!car) return;
      car.classList.add("on");
      smoke && smoke.classList.add("on");
      setTimeout(() => {
        car.classList.remove("on");
        smoke && smoke.classList.remove("on");
      }, 1800 + Math.random() * 1600);
    };
    const twitchCat = () => {
      if (!alley) return;
      alley.classList.add("twitch");
      setTimeout(() => alley.classList.remove("twitch"), 600);
    };

    const tick = () => {
      const r = Math.random();
      if (r < 0.28) runRat();
      else if (r < 0.5) blinkWin();
      else if (r < 0.72) carPulse();
      else twitchCat();
      lifeTimer = setTimeout(tick, 4200 + Math.random() * 5200);
    };
    lifeTimer = setTimeout(tick, 1800);
    blinkWin();
  }

  function lightning() {
    if (!flashEl) flashEl = $("#lightning");
    if (!flashEl) return;
    flashEl.classList.remove("on");
    void flashEl.offsetWidth;
    flashEl.classList.add("on");
    setTimeout(() => flashEl.classList.remove("on"), 700);
    // soft thunder via noise if SFX available
    try {
      if (typeof sfx === "function") sfx("door");
    } catch (_) {}
  }

  function windowsWin(on) {
    document.querySelectorAll(".win-glow").forEach((w) => w.classList.toggle("winburst", !!on));
    if (on) setTimeout(() => windowsWin(false), 2200);
  }

  function setMarquee(mode) {
    const table = $("#table");
    if (!table) return;
    table.dataset.marquee = mode || "idle";
  }

  function neonBoost(on) {
    const neon = $("#neonSign");
    if (!neon) return;
    neon.classList.toggle("boost", !!on);
  }

  function init() {
    world = $("#world");
    flashEl = $("#lightning");
    fitWorld();
    addEventListener("resize", fitWorld);
    if (!reduced()) {
      initRain();
      flickerLamp();
      scheduleLife();
    }
    const neon = $("#neonSign");
    if (neon) {
      neon.classList.add("ignite");
      setTimeout(() => neon.classList.remove("ignite"), 1800);
    }
    setMarquee("idle");
  }

  root.MatouScene = {
    init,
    fitWorld,
    lightning,
    windowsWin,
    setMarquee,
    neonBoost,
  };
})(typeof window !== "undefined" ? window : globalThis);
