(function () {
  const BASE = "./assets/matou/bg-b/";
  let video = null, poster = null, onVis = null, boostT = 0, winT = 0;

  function applyFilter() {
    if (!video) return;
    const b = 1 + (winT ? 0.22 : 0) + (boostT ? 0.08 : 0);
    const s = 1 + (winT ? 0.18 : 0) + (boostT ? 0.06 : 0);
    video.style.filter = `brightness(${b}) saturate(${s})`;
  }

  async function mount(host, { reduced }) {
    poster = document.createElement("img");
    poster.src = BASE + "docks-poster.jpg";
    poster.alt = "";
    host.appendChild(poster);
    if (reduced) return;

    video = document.createElement("video");
    video.muted = true;
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.preload = "auto";
    video.poster = BASE + "docks-poster.jpg";
    video.style.transition = "filter .45s ease";
    for (const [file, type] of [["docks.webm", 'video/webm; codecs="vp9"'], ["docks.mp4", "video/mp4"]]) {
      const s = document.createElement("source");
      s.src = BASE + file;
      s.type = type;
      video.appendChild(s);
    }
    host.appendChild(video);
    video.addEventListener("playing", () => { if (poster) poster.style.visibility = "hidden"; }, { once: true });
    onVis = () => { if (!video) return; document.hidden ? video.pause() : video.play().catch(() => {}); };
    document.addEventListener("visibilitychange", onVis);
    try { await video.play(); } catch (_) {}
  }

  function unmount() {
    if (onVis) document.removeEventListener("visibilitychange", onVis);
    if (video) { video.pause(); video.removeAttribute("src"); video.load(); }
    video = poster = onVis = null;
    boostT = winT = 0;
  }

  window.MatouBG.register("b", {
    mount,
    unmount,
    windowsWin(on) { winT = on ? 1 : 0; applyFilter(); },
    neonBoost(on) { boostT = on ? 1 : 0; applyFilter(); },
  });
})();
