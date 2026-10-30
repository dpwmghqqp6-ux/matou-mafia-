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

const SCALE = 0.442;
const HUNT = 1.95;
const BUY = 118;
const SUPER = 156;
const M = loadMath({ PAY_SCALE: SCALE, S_HUNT: HUNT, BUY_COST: BUY, SUPER_COST: SUPER });
let sum = 0;
for (const seed of [1, 2, 3, 9, 42, 77, 99]) {
  const v = rtp(M, "base", 500000, seed);
  sum += v;
  console.log("base", seed, (v * 100).toFixed(2));
}
console.log("avg", ((sum / 7) * 100).toFixed(2));
console.log("hunt", (rtp(M, "hunt", 400000, 10) * 100).toFixed(2));
console.log("apply", { PAY_SCALE: SCALE, S_HUNT: HUNT, BUY_COST: BUY, SUPER_COST: SUPER, PAY_H1_3: M.PAY.H1[3] });
