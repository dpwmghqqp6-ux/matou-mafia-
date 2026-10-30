export async function cascadeScenario({ evalJs, shot, sleep, logs }) {
  await sleep(400);
  await shot("c0_base");
  // Force a win that should cascade
  await evalJs(`document.getElementById("forceWin").click()`);
  await sleep(900); await shot("c1_spin");
  await sleep(2200); await shot("c2_win");
  await sleep(900); await shot("c3_explode");
  await sleep(900); await shot("c4_tumble");
  await sleep(2500); await shot("c5_after");
  logs.push("win=" + (await evalJs("state.win")));
  logs.push("smokeZ=" + (await evalJs(`getComputedStyle(document.querySelector(".cat-smoke")||document.body).zIndex`)));
  logs.push("smokeParent=" + (await evalJs(`(document.querySelector(".cat-smoke")||{}).parentElement?.id||"none"`)));
  // Trigger lose anim for smoke if available
  await evalJs(`setCat("stomp")`);
  await sleep(3200); await shot("c6_smoke");
  // Car check: move mouse to shift parallax
  await evalJs(`window.dispatchEvent(new PointerEvent("pointermove",{clientX:40,clientY:200}))`);
  await sleep(800); await shot("c7_car_left");
  await evalJs(`window.dispatchEvent(new PointerEvent("pointermove",{clientX:innerWidth-40,clientY:200}))`);
  await sleep(800); await shot("c8_car_right");
}
