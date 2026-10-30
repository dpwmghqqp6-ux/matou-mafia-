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
function rtp(M, mode, n, seed, { features = true } = {}) {
  const r = rng(seed);
  let lines = 0, feat = 0, hits = 0;
  const cost = mode === "hunt" ? M.HUNT_COST : 1;
  for (let i = 0; i < n; i++) {
    const b = M.randomBoard(mode, r);
    const play = M.cascade(b, mode === "hunt" ? "hunt" : "base", r);
    lines += play.payout;
    if (features && play.scatters >= 3) {
      hits++;
      const level = M.bonusLevel(play.scatters);
      const kind = r() < 0.5 ? "heist" : "gold";
      const door = M.pickDoorFx(kind, r);
      const pot = kind === "gold" ? M.simulateGoldRush(level, door, r).pot : M.simulateVault(play.scatters, level, door, r).pot;
      feat += Math.min(M.MAX_WIN - play.payout, pot);
    }
  }
  return { total: (lines + feat) / (n * cost), lines: lines / (n * cost), feat: feat / (n * cost), hits: hits / n };
}

const scale = 0.445;
const M = loadMath({ PAY_SCALE: scale, S_HUNT: 1.92, BUY_COST: 118, SUPER_COST: 157 });
for (const seed of [1, 2, 3, 9, 42]) {
  const a = rtp(M, "base", 800000, seed);
  console.log("base", scale, "seed", seed, {
    total: +(a.total * 100).toFixed(2),
    lines: +(a.lines * 100).toFixed(2),
    feat: +(a.feat * 100).toFixed(2),
    hit: +(a.hits * 100).toFixed(3),
  });
}
const h = rtp(M, "hunt", 400000, 10);
console.log("hunt", { total: +(h.total * 100).toFixed(2), lines: +(h.lines * 100).toFixed(2), feat: +(h.feat * 100).toFixed(2) });
