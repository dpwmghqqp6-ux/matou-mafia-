// Gold Rush scenario for cdp_test.mjs (mode "gold"): gold cells visible while spinning, bomb reveal.
export async function goldScenario({ evalJs, shot, sleep, logs }) {
  await evalJs(`(()=>{state.fast=true;hud();window.__chooseOrig=chooseBonus;chooseBonus=()=>new Promise(()=>{});startBonus(3,[]);return 1})()`);
  await sleep(300);
  logs.push("speed after bonus start (should be false)=" + (await evalJs(`state.fast||state.skip`)));
  await evalJs(`(()=>{chooseBonus=window.__chooseOrig;return 1})()`);
  await sleep(300);
  await evalJs(`(()=>{window.__gold="run";runGoldRush(3,{id:"t",extraSpins:0,startGold:5,guaranteeBomb:true}).then(()=>window.__gold="done");return 1})()`);
  await sleep(2300);
  logs.push("gold slots on during spin=" + (await evalJs(`document.querySelectorAll("#goldLayer .gslot.on").length`)));
  await shot("g1_spinning");
  let tiles = 0;
  for (let i = 0; i < 400 && !tiles; i++) {
    await sleep(200);
    tiles = await evalJs(`document.querySelectorAll("#goldLayer .gtile").length`);
    if (await evalJs(`window.__gold==="done"`)) break;
  }
  logs.push("gtiles=" + tiles);
  await sleep(500); await shot("g2_icons");
  logs.push("shown before values=" + (await evalJs(`document.querySelectorAll("#goldLayer .gtile.shown").length`)));
  await sleep(1600); await shot("g3_values");
  await sleep(4000);
  logs.push("gold after burst (L3 should be 0)=" + (await evalJs(`document.querySelectorAll("#goldLayer .gslot.on").length`)));
  for (let i = 0; i < 120; i++) {
    await sleep(500);
    await evalJs(`(()=>{const b=document.getElementById("featContinue"); if(b&&!b.hidden&&document.getElementById("featureCard").classList.contains("on")) b.click(); return 1})()`);
    if (await evalJs(`window.__gold==="done"`)) break;
  }
  logs.push("gold=" + (await evalJs(`window.__gold`)) + " bonusWin=" + (await evalJs(`state.history[0]&&state.history[0].amount`)));
}
