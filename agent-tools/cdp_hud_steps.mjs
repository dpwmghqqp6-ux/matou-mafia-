// HUD + cat anchoring + bonus/autoplay panels for cdp_test.mjs (mode "hud").
export async function hudScenario({ evalJs, shot, sleep, viewport, mouse, logs }) {
  const tr = `document.getElementById("catWrap").style.translate`;
  await mouse(100, 100); await sleep(2500);
  const a = await evalJs(tr);
  await mouse(1500, 800); await sleep(2500);
  const b = await evalJs(tr);
  logs.push(`cat translate: [${a}] -> [${b}]`);
  await evalJs(`document.getElementById("menuBtn").click()`);
  await sleep(400); await shot("h1_menu");
  await evalJs(`document.body.click()`);
  await sleep(200);
  await evalJs(`document.getElementById("bonusBtn").click()`);
  await sleep(500); await shot("h2_bonus_off");
  await evalJs(`(()=>{state.hunt=true;hud();return 1})()`);
  await sleep(400); await shot("h3_bonus_on");
  await evalJs(`(()=>{state.hunt=false;hud();document.body.click();return 1})()`);
  await sleep(200);
  await evalJs(`document.getElementById("autoBtn").click()`);
  await sleep(600); await shot("h4_auto");
  await evalJs(`document.querySelector('#autoChips .chip[data-opt="BONUS"]').click()`);
  await sleep(500); await shot("h5_auto_bonus");
  logs.push("auto stop=" + (await evalJs(`document.getElementById("autoStop").textContent`)));
  await viewport(430, 900); await sleep(500); await shot("h6_auto_430");
  await evalJs(`(()=>{document.getElementById("autoCancel").click();document.getElementById("bonusBtn").click();return 1})()`);
  await sleep(500); await shot("h7_bonus_430");
  await viewport(1600, 900);
}
