// Smooth reel stop check + Heist respin look (mode "heist").
export async function heistScenario({ evalJs, shot, sleep, logs }) {
  const pos = `(()=>{const s=document.querySelectorAll("#reels .strip")[0];return +new DOMMatrix(getComputedStyle(s).transform).m42.toFixed(1)})()`;
  await evalJs(`document.getElementById("spinBtn").click()`);
  const ys = [];
  for (let i = 0; i < 45; i++) { await sleep(25); ys.push(await evalJs(pos)); }
  let back = 0;
  for (let i = 1; i < ys.length; i++) if (ys[i] < ys[i - 1] - 0.5) back++;
  logs.push("reel1 y samples: " + ys.filter((_, i) => i % 5 === 0).join(" ") + " | backward moves=" + back);
  await sleep(4000);
  await evalJs(`(()=>{window.__h="run";runHeist([[0,0],[2,3],[4,1]],3,M.DOOR_FX.heist[0]).then(()=>window.__h="done");return 1})()`);
  await sleep(3200); await shot("h1_respin_start");
  await sleep(700); await shot("h2_respin_mid");
  await sleep(900); await shot("h3_respin_late");
  await sleep(1400); await shot("h4_after");
  logs.push("locked=" + (await evalJs(`lockedCount()`)));
}
