#!/usr/bin/env node
const path = require("path");
const fs = require("fs");
const mathPath = path.join(__dirname, "..", "preview", "math.js");

function loadMath(o = {}) {
  let src = fs.readFileSync(mathPath, "utf8");
  if (o.PAY_SCALE != null) src = src.replace(/const PAY_SCALE = [^;]+;/, `const PAY_SCALE = ${o.PAY_SCALE};`);
  if (o.LOCK_P != null) src = src.replace(/const LOCK_P = [^;]+;/, `const LOCK_P = ${o.LOCK_P};`);
  if (o.S_BASE != null) src = src.replace(/(base:\s*\{[^}]*S:)([0-9.]+)/, `$1${o.S_BASE}`);
  if (o.S_HUNT != null) src = src.replace(/(hunt:\s*\{[^}]*S:)([0-9.]+)/, `$1${o.S_HUNT}`);
  if (o.GW != null) src = src.replace(/(gold:\s*\{[^}]*GW:)([0-9.]+)/, `$1${o.GW}`);
  if (o.BUY_COST != null) src = src.replace(/const BUY_COST = [^;]+;/, `const BUY_COST = ${o.BUY_COST};`);
  if (o.SUPER_COST != null) src = src.replace(/const SUPER_COST = [^;]+;/, `const SUPER_COST = ${o.SUPER_COST};`);
  const g = {};
  const mod = { exports: {} };
  new Function("module", "exports", "globalThis", src)(mod, mod.exports, g);
  return mod.exports.randomBoard ? mod.exports : g.MatouMath;
}

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17; s >>>= 0;
    s ^= s << 5; s >>>= 0;
    return (s >>> 0) / 4294967296;
  };
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
      const pot = kind === "gold"
        ? M.simulateGoldRush(level, door, r).pot
        : M.simulateVault(play.scatters, level, door, r).pot;
      ret += Math.min(M.MAX_WIN - play.payout, pot);
    }
  }
  return ret / (n * cost);
}

const GW = 0.0881;
const LOCK_P = 0.0245;
const BUY = 110;
const SUPER = 145;

let lo = 0.7, hi = 1.05, best = 0.85;
for (let i = 0; i < 8; i++) {
  const mid = (lo + hi) / 2;
  const M = loadMath({ GW, LOCK_P, BUY_COST: BUY, SUPER_COST: SUPER, S_BASE: mid, S_HUNT: mid * 1.8 });
  const v = rtp(M, "base", 400000, 100 + i);
  console.log("S", mid.toFixed(4), (v * 100).toFixed(2));
  if (v > 0.965) hi = mid; else lo = mid;
  best = mid;
}

let hlo = best * 1.5, hhi = best * 2.8, bestH = best * 2;
for (let i = 0; i < 8; i++) {
  const mid = (hlo + hhi) / 2;
  const M = loadMath({ GW, LOCK_P, BUY_COST: BUY, SUPER_COST: SUPER, S_BASE: best, S_HUNT: mid });
  const v = rtp(M, "hunt", 200000, 200 + i);
  console.log("HuntS", mid.toFixed(4), (v * 100).toFixed(2));
  if (v > 0.965) hhi = mid; else hlo = mid;
  bestH = mid;
}

const M = loadMath({ GW, LOCK_P, BUY_COST: BUY, SUPER_COST: SUPER, S_BASE: best, S_HUNT: bestH });
console.log("FINAL", {
  GW, LOCK_P, BUY, SUPER,
  S_BASE: +best.toFixed(4),
  S_HUNT: +bestH.toFixed(4),
  base: +(rtp(M, "base", 600000, 9) * 100).toFixed(2),
  hunt: +(rtp(M, "hunt", 300000, 10) * 100).toFixed(2)
});
