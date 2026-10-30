const path = require("path");
const fs = require("fs");
const mathPath = path.join(__dirname, "..", "preview", "math.js");

function loadMath(o = {}) {
  let src = fs.readFileSync(mathPath, "utf8");
  if (o.PAY_SCALE != null) src = src.replace(/const PAY_SCALE = [^;]+;/, `const PAY_SCALE = ${o.PAY_SCALE};`);
  if (o.S_HUNT != null) src = src.replace(/(hunt:\s*\{[^}]*S:)([0-9.]+)/, `$1${o.S_HUNT}`);
  if (o.BUY_COST != null) src = src.replace(/const BUY_COST = [^;]+;/, `const BUY_COST = ${o.BUY_COST};`);
  if (o.SUPER_COST != null) src = src.replace(/const SUPER_COST = [^;]+;/, `const SUPER_COST = ${o.SUPER_COST};`);
  const g = {}, mod = { exports: {} };
  new Function("module", "exports", "globalThis", src)(mod, mod.exports, g);
  return mod.exports.randomBoard ? mod.exports : g.MatouMath;
}
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s >>>= 0; s ^= s << 5; s >>>= 0; return (s >>> 0) / 4294967296; };
}
function featureEV(M, kind, level, n, seed) {
  const r = rng(seed);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const door = M.pickDoorFx(kind, r);
    sum += (kind === "gold" ? M.simulateGoldRush(level, door, r) : M.simulateVault(level, level, door, r)).pot;
  }
  return sum / n;
}
function rtp(M, mode, n, seed) {
  const r = rng(seed);
  let ret = 0;
  const cost = mode === "hunt" ? M.HUNT_COST : 1;
  for (let i = 0; i < n; i++) {
    const b = M.randomBoard(mode, r);
    const play = M.cascade(b, mode === "hunt" ? "hunt" : "base", r);
    ret += play.payout;
    if (play.scatters >= 3) {
      const level = M.bonusLevel(play.scatters);
      const kind = r() < 0.5 ? "heist" : "gold";
      const door = M.pickDoorFx(kind, r);
      const pot = kind === "gold" ? M.simulateGoldRush(level, door, r).pot : M.simulateVault(play.scatters, level, door, r).pot;
      ret += Math.min(M.MAX_WIN - play.payout, pot);
    }
  }
  return ret / (n * cost);
}

const SCALE = 0.437;
let M = loadMath({ PAY_SCALE: SCALE });
const h3 = featureEV(M, "heist", 3, 80000, 1);
const g3 = featureEV(M, "gold", 3, 80000, 2);
const h4 = featureEV(M, "heist", 4, 80000, 3);
const g4 = featureEV(M, "gold", 4, 80000, 4);
const BUY = Math.max(80, Math.round(((h3 + g3) / 2) / 0.965));
const SUPER = Math.max(BUY + 20, Math.round(((h4 + g4) / 2) / 0.965));
console.log({ h3, g3, h4, g4, BUY, SUPER });

// tune hunt S
let lo = 1.7, hi = 2.2, bestH = 1.92;
for (let i = 0; i < 7; i++) {
  const mid = (lo + hi) / 2;
  M = loadMath({ PAY_SCALE: SCALE, S_HUNT: mid, BUY_COST: BUY, SUPER_COST: SUPER });
  const v = rtp(M, "hunt", 250000, 200 + i);
  console.log("huntS", mid.toFixed(4), (v * 100).toFixed(2));
  if (v > 0.965) hi = mid; else lo = mid;
  bestH = mid;
}

M = loadMath({ PAY_SCALE: SCALE, S_HUNT: bestH, BUY_COST: BUY, SUPER_COST: SUPER });
const base = rtp(M, "base", 1000000, 9);
const hunt = rtp(M, "hunt", 500000, 10);
console.log("FINAL", {
  PAY_SCALE: SCALE,
  S_HUNT: +bestH.toFixed(4),
  BUY_COST: BUY,
  SUPER_COST: SUPER,
  baseRTP: +(base * 100).toFixed(2),
  huntRTP: +(hunt * 100).toFixed(2),
  buyRTP: +((((h3 + g3) / 2) / BUY) * 100).toFixed(2),
  superRTP: +((((h4 + g4) / 2) / SUPER) * 100).toFixed(2),
  PAY: { H1_3: M.PAY.H1[3], L4_3: M.PAY.L4[3] },
});
