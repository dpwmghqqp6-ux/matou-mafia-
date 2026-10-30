// Projector frenzy before the bonus choice (mode "frenzy").
export async function frenzyScenario({ evalJs, shot, sleep, logs }) {
  await evalJs(`document.getElementById("forceBonus").click()`);
  let t0 = Date.now(), seen = false;
  for (let i = 0; i < 120; i++) {
    await sleep(100);
    if (await evalJs(`document.getElementById("table").classList.contains("frenzy")`)) { seen = true; break; }
  }
  logs.push("frenzy seen=" + seen + " after " + (Date.now() - t0) + "ms");
  await sleep(500); await shot("f1_frenzy");
  await sleep(250); await shot("f2_frenzy");
  const t1 = Date.now();
  for (let i = 0; i < 60; i++) {
    await sleep(100);
    if (!(await evalJs(`document.getElementById("table").classList.contains("frenzy")`))) break;
  }
  logs.push("frenzy lasted ~" + (Date.now() - t1 + 750) + "ms");
  await sleep(1500); await shot("f3_choice");
}
