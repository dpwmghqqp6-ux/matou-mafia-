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
      const pot = kind === "gold"
        ? M.simulateGoldRush(level, door, r).pot
        : M.simulateVault(play.scatters, level, door, r).pot;
      ret += Math.min(M.MAX_WIN - play.payout, pot);
    }
  }
  return ret / (n * cost);
}

const N = Number(process.argv[2] || 250000);
let lo = 0.35, hi = 1.0, best = 0.7;
console.log("Tuning PAY_SCALE for base RTP ~96.50% with cascades...");
for (let i = 0; i < 10; i++) {
  const mid = (lo + hi) / 2;
  const M = loadMath({ PAY_SCALE: mid });
  const v = rtp(M, "base", N, 100 + i);
  console.log("PAY_SCALE", mid.toFixed(4), "baseRTP", (v * 100).toFixed(2) + "%");
  if (v > 0.965) hi = mid; else lo = mid;
  best = mid;
}

let M = loadMath({ PAY_SCALE: best });
const h3 = featureEV(M, "heist", 3, 60000, 1);
const g3 = featureEV(M, "gold", 3, 60000, 2);
const h4 = featureEV(M, "heist", 4, 60000, 3);
const g4 = featureEV(M, "gold", 4, 60000, 4);
const buyCost = Math.max(80, Math.round(((h3 + g3) / 2) / M.RTP));
const superCost = Math.max(buyCost + 20, Math.round(((h4 + g4) / 2) / M.RTP));

let hLo = M.WEIGHTS.hunt.S * 0.6, hHi = M.WEIGHTS.hunt.S * 1.8, bestH = M.WEIGHTS.hunt.S;
for (let i = 0; i < 8; i++) {
  const mid = (hLo + hHi) / 2;
  M = loadMath({ PAY_SCALE: best, BUY_COST: buyCost, SUPER_COST: superCost, S_HUNT: mid });
  const v = rtp(M, "hunt", Math.max(120000, N / 2), 200 + i);
  console.log("HuntS", mid.toFixed(4), "huntRTP", (v * 100).toFixed(2) + "%");
  if (v > 0.965) hHi = mid; else hLo = mid;
  bestH = mid;
}

M = loadMath({ PAY_SCALE: best, BUY_COST: buyCost, SUPER_COST: superCost, S_HUNT: bestH });
const base = rtp(M, "base", Math.max(400000, N), 9);
const hunt = rtp(M, "hunt", Math.max(200000, N / 2), 10);
console.log("=== APPLY ===");
console.log({
  PAY_SCALE: +best.toFixed(4),
  S_HUNT: +bestH.toFixed(4),
  BUY_COST: buyCost,
  SUPER_COST: superCost,
  baseRTP: +(base * 100).toFixed(2),
  huntRTP: +(hunt * 100).toFixed(2),
  buyRTP: +((((h3 + g3) / 2) / buyCost) * 100).toFixed(2),
  superRTP: +((((h4 + g4) / 2) / superCost) * 100).toFixed(2),
  PAY_H1_3: M.PAY.H1[3],
});
