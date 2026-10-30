// Door-pick scenario for cdp_test.mjs (mode "doors").
export async function doorsScenario({ evalJs, shot, sleep, viewport, mouse, logs }) {
  const center = (i) => evalJs(`(()=>{const r=document.querySelectorAll("#doorPick .dslot")[${i}].getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()`);
  for (const theme of ["heist", "gold"]) {
    await evalJs(`document.querySelectorAll("#matouFx .on").forEach(e=>e.classList.remove("on","closed","opened","closing")); window.__door=null; pickDoor("${theme}").then(d=>window.__door=d.label)`);
    await sleep(700); await shot(`${theme}_1_intro`);
    await sleep(500); await shot(`${theme}_2_intro`);
    await sleep(1300); await shot(`${theme}_3_ready`);
    const [x, y] = await center(0);
    await mouse(x, y);
    await sleep(700); await shot(`${theme}_4_hover`);
    await evalJs(`document.querySelectorAll("#doorPick .dslot")[0].click()`);
    await sleep(500); await shot(`${theme}_5_unlock`);
    await sleep(900); await shot(`${theme}_6_open`);
    await sleep(1100); await shot(`${theme}_7_enter`);
    await sleep(1700); await shot(`${theme}_8_all`);
    await mouse(5, 5);
    await sleep(3500);
    logs.push(`${theme} door=` + (await evalJs("window.__door")));
  }
  await viewport(1100, 900);
  await evalJs(`document.querySelectorAll("#matouFx .on").forEach(e=>e.classList.remove("on","closed","opened","closing")); pickDoor("gold")`);
  await sleep(2600); await shot("gold_9_43");
  await viewport(430, 900);
  await sleep(500); await shot("gold_10_portrait");
}
