// Muted headless Chrome check: node agent-tools/cdp_test.mjs <outDir>
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const OUT = process.argv[2] || join(tmpdir(), "matou_shots");
mkdirSync(OUT, { recursive: true });
const PORT = 9333;
const URL = "http://127.0.0.1:4173/index.html";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${PORT}`, "--mute-audio", "--autoplay-policy=no-user-gesture-required",
  `--user-data-dir=${join(tmpdir(), "matou_cdp_profile")}`, "--window-size=1600,900", "--hide-scrollbars", "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, id = 0;
const pending = new Map();
const logs = [];
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const i = ++id;
    pending.set(i, { resolve, reject });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
}
async function evalJs(expr) {
  const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: false, returnByValue: true });
  if (r.exceptionDetails) logs.push("EVAL ERR: " + JSON.stringify(r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result?.value;
}
async function shot(name) {
  const r = await send("Page.captureScreenshot", { format: "jpeg", quality: 80 });
  writeFileSync(join(OUT, name + ".jpg"), Buffer.from(r.data, "base64"));
}
async function viewport(w, h) {
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
}
const MUTE = `(()=>{try{const A=window.MatouAudio;A&&A.setMuted&&A.setMuted(true);A&&A.setVolumes&&A.setVolumes({sfx:0,music:0});}catch(e){}
  HTMLMediaElement.prototype.play=function(){this.muted=true;this.volume=0;return Promise.resolve();};return 1})()`;

try {
  let target;
  for (let t = 0; t < 60 && !target; t++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
      target = list.find((x) => x.type === "page");
    } catch {}
    if (!target) await sleep(250);
  }
  if (!target) throw new Error("chrome not ready");
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); }
    else if (m.method === "Runtime.exceptionThrown") logs.push("EXC: " + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
    else if (m.method === "Runtime.consoleAPICalled" && (m.params.type === "error" || m.params.type === "warning")) logs.push("CONSOLE " + m.params.type + ": " + m.params.args.map((a) => a.value ?? a.description).join(" "));
    else if (m.method === "Log.entryAdded" && m.params.entry.level === "error") logs.push("LOG: " + m.params.entry.text + " " + (m.params.entry.url || ""));
  };
  await send("Runtime.enable"); await send("Page.enable"); await send("Log.enable");
  await viewport(1600, 900);
  await send("Page.navigate", { url: URL + "?t=" + Date.now() });
  await sleep(2500);
  await evalJs(MUTE);
  await evalJs(`document.getElementById("playBtn").click()`);
  await sleep(300);
  await evalJs(MUTE);
  await sleep(2500);
  await shot("01_base");
  if (process.argv[3] === "spin") {
    const { spinScenario } = await import("./cdp_spin_steps.mjs");
    await spinScenario({ evalJs, shot, sleep, logs });
    throw new Error("__done__");
  }
  if (process.argv[3] === "cascade") {
    const { cascadeScenario } = await import("./cdp_cascade_steps.mjs");
    await cascadeScenario({ evalJs, shot, sleep, logs });
    throw new Error("__done__");
  }
  if (process.argv[3] === "heist") {
    const { heistScenario } = await import("./cdp_heist_steps.mjs");
    await heistScenario({ evalJs, shot, sleep, logs });
    throw new Error("__done__");
  }
  if (process.argv[3] === "frenzy") {
    const { frenzyScenario } = await import("./cdp_frenzy_steps.mjs");
    await frenzyScenario({ evalJs, shot, sleep, logs });
    throw new Error("__done__");
  }
  if (process.argv[3] === "gold") {
    const { goldScenario } = await import("./cdp_gold_steps.mjs");
    await goldScenario({ evalJs, shot, sleep, logs });
    throw new Error("__done__");
  }
  if (process.argv[3] === "hud") {
    const { hudScenario } = await import("./cdp_hud_steps.mjs");
    const mouse = (x, y) => send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
    await hudScenario({ evalJs, shot, sleep, viewport, mouse, logs });
    throw new Error("__done__");
  }
  if (process.argv[3] === "doors") {
    const { doorsScenario } = await import("./cdp_doors_steps.mjs");
    const mouse = (x, y) => send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
    await doorsScenario({ evalJs, shot, sleep, viewport, mouse, logs });
    throw new Error("__done__");
  }

  await evalJs(`window.__pick=null; chooseBonus(3).then(k=>window.__pick=k)`);
  await sleep(1500); await shot("02_iris_spin");
  await sleep(700); await shot("03_spin");
  await sleep(150); await shot("04a_unfold");
  await sleep(150); await shot("04b_unfold");
  await sleep(150); await shot("04c_unfold");
  await sleep(1400); await shot("05_ready");
  await evalJs(`document.querySelector("#pickHeist").dispatchEvent(new MouseEvent("mouseover",{bubbles:true}))`);
  await evalJs(`document.getElementById("pickHeist").click()`);
  await sleep(450); await shot("06_stamp");
  await sleep(800); await shot("07_tear");
  await sleep(2500);
  logs.push("picked=" + (await evalJs("window.__pick")));
  await evalJs(`window.__door=null; pickDoor("heist").then(d=>window.__door=d.label)`);
  await sleep(2300); await shot("08_doors");
  await evalJs(`document.querySelector("#doorPick .dslot[data-i='1']").click()`);
  await sleep(1200); await shot("08b_door_open");
  await sleep(2200); await shot("08c_title");
  await sleep(5000); await shot("08d_feature");
  logs.push("door=" + (await evalJs("window.__door")));

  await viewport(430, 900);
  await evalJs(`(()=>{const r=document.getElementById("doorPick"); r.classList.remove("on"); document.querySelectorAll("#matouFx .on").forEach(e=>e.classList.remove("on","closed","opened")); return 1})()`);
  await evalJs(`chooseBonus(4)`);
  await sleep(4500); await shot("09_portrait_l4");
  await viewport(1600, 900);
  await sleep(600); await shot("10_land_l4");
} catch (e) {
  if (e.message !== "__done__") logs.push("FATAL " + e.stack);
} finally {
  writeFileSync(join(OUT, "log.txt"), logs.join("\n"));
  console.log(logs.join("\n") || "no errors");
  try { ws && ws.close(); } catch {}
  chrome.kill();
  process.exit(0);
}
