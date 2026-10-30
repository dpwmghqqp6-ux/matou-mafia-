// Spin-look scenario for cdp_test.mjs (mode "spin").
export async function spinScenario({ evalJs, shot, sleep, logs }) {
  const pos = `(()=>{const s=document.querySelector("#reels .strip:last-child")||document.querySelectorAll("#reels .strip")[5];return new DOMMatrix(getComputedStyle(s).transform).m42.toFixed(1)})()`;
  await evalJs(`document.getElementById("spinBtn").click()`);
  await sleep(300); const a = await evalJs(pos);
  await sleep(250); const b = await evalJs(pos);
  logs.push(`reel6 y: ${a} -> ${b} (${+b > +a ? "DOWN ok" : "UP"})`);
  await shot("s1_base_mid");
  await sleep(3500); await shot("s2_base_rest");
}
