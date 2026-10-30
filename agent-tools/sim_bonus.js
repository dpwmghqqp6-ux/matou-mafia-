#!/usr/bin/env node
const path = require("path");
const fs = require("fs");
const mathPath = path.join(__dirname, "..", "preview", "math.js");

function loadMath(overrides = {}) {
  let src = fs.readFileSync(mathPath, "utf8");
  if (overrides.LOCK_P != null) src = src.replace(/const LOCK_P = [^;]+;/, `const LOCK_P = ${overrides.LOCK_P};`);
  if (overrides.S_BASE != null) src = src.replace(/(base:\s*\{[^}]*S:)([0-9.]+)/, `$1${overrides.S_BASE}`);
  if (overrides.S_HUNT != null) src = src.replace(/(hunt:\s*\{[^}]*S:)([0-9.]+)/, `$1${overrides.S_HUNT}`);
  if (overrides.GW != null) src = src.replace(/(gold:\s*\{[^}]*GW:)([0-9.]+)/, `$1${overrides.GW}`);
  if (overrides.SUPER_COST != null) src = src.replace(/const SUPER_COST = [^;]+;/, `const SUPER_COST = ${overrides.SUPER_COST};`);
  if (overrides.BUY_COST != null) src = src.replace(/const BUY_COST = [^;]+;/, `const BUY_COST = ${overrides.BUY_COST};`);
  const mod = { exports: {} };
  const g = {};
  new Function("module", "exports", "globalThis", src)(mod, mod.exports, g);
  return mod.exports.randomBoard ? mod.exports : g.MatouMath;
}

function xorshift(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17; s >>>= 0;
    s ^= s << 5; s >>>= 0;
    return (s >>> 0) / 4294967296;
  };
}

function featureEV(M, kind, level, n, seed) {
  const rng = xorshift(seed);
  let sum = 0, max = 0;
  for (let i = 0; i < n; i++) {
    const door = M.pickDoorFx(kind, rng);
    const r = kind === "gold"
      ? M.simulateGoldRush(level, door, rng)
      : M.simulateVault(level, level, door, rng);
    sum += r.pot;
    if (r.pot > max) max = r.pot;
  }
  return { ev: sum / n, max };
}

function baseRTP(M, mode, n, seed) {
  const rng = xorshift(seed);
  let returned = 0;
  const cost = mode === "hunt" ? M.HUNT_COST : 1;
  for (let i = 0; i < n; i++) {
    const board = M.randomBoard(mode, rng);
    const play = M.cascade(board, mode === "hunt" ? "hunt" : "base", rng);
    returned += play.payout;
    if (play.scatters >= 3) {
      const level = M.bonusLevel(play.scatters);
      const kind = rng() < 0.5 ? "heist" : "gold";
      const door = M.pickDoorFx(kind, rng);
      const pot = kind === "gold"
        ? M.simulateGoldRush(level, door, rng).pot
        : M.simulateVault(play.scatters, level, door, rng).pot;
      returned += Math.min(M.MAX_WIN - play.payout, pot);
    }
  }
  return returned / (n * cost);
}

function main() {
  const Nf = Number(process.argv[2] || 60000);
  const Nb = Number(process.argv[3] || 300000);
  let M = loadMath();

  console.log("Initial feature EV");
  for (const level of [3, 4]) {
    const h = featureEV(M, "heist", level, Nf, 10 + level);
    const g = featureEV(M, "gold", level, Nf, 20 + level);
    console.log(`L${level} heist=${h.ev.toFixed(2)} (max ${h.max.toFixed(0)}) gold=${g.ev.toFixed(2)} (max ${g.max.toFixed(0)}) ratio=${(h.ev / g.ev).toFixed(3)}`);
  }

  const target = featureEV(M, "heist", 3, Nf, 101).ev;
  let lo = 0.04, hi = 0.8, bestGW = M.WEIGHTS.gold.GW;
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    M = loadMath({ GW: mid });
    const g = featureEV(M, "gold", 3, Math.max(25000, Nf / 2), 202).ev;
    console.log(`GW=${mid.toFixed(4)} gold3=${g.toFixed(2)} target=${target.toFixed(2)}`);
    if (g > target) hi = mid; else lo = mid;
    bestGW = mid;
  }

  // Nudge LOCK_P so heist4 ≈ gold4 after GW tune
  M = loadMath({ GW: bestGW });
  let lock = M.LOCK_P;
  for (let i = 0; i < 8; i++) {
    M = loadMath({ GW: bestGW, LOCK_P: lock });
    const h4 = featureEV(M, "heist", 4, Math.max(25000, Nf / 2), 303).ev;
    const g4 = featureEV(M, "gold", 4, Math.max(25000, Nf / 2), 304).ev;
    console.log(`LOCK_P=${lock.toFixed(5)} heist4=${h4.toFixed(2)} gold4=${g4.toFixed(2)}`);
    if (h4 < g4) lock *= 1.06; else lock *= 0.97;
  }

  M = loadMath({ GW: bestGW, LOCK_P: lock });
  const h3 = featureEV(M, "heist", 3, Nf, 401).ev;
  const g3 = featureEV(M, "gold", 3, Nf, 402).ev;
  const h4 = featureEV(M, "heist", 4, Nf, 403).ev;
  const g4 = featureEV(M, "gold", 4, Nf, 404).ev;
  const buyEV = (h3 + g3) / 2;
  const superEV = (h4 + g4) / 2;
  const buyCost = Math.max(80, Math.round(buyEV / M.RTP));
  const superCost = Math.max(buyCost + 20, Math.round(superEV / M.RTP));
  console.log(`BUY ${buyCost} (EV ${buyEV.toFixed(2)}) SUPER ${superCost} (EV ${superEV.toFixed(2)})`);

  let sLo = 0.55, sHi = 1.15, bestS = 0.82;
  for (let i = 0; i < 9; i++) {
    const mid = (sLo + sHi) / 2;
    M = loadMath({ GW: bestGW, LOCK_P: lock, BUY_COST: buyCost, SUPER_COST: superCost, S_BASE: mid, S_HUNT: +(mid * 2.42).toFixed(4) });
    const rtp = baseRTP(M, "base", Math.max(120000, Nb / 2), 500 + i);
    console.log(`S=${mid.toFixed(4)} baseRTP=${(rtp * 100).toFixed(2)}%`);
    if (rtp > 0.965) sHi = mid; else sLo = mid;
    bestS = mid;
  }
  const huntS = +(bestS * 2.42).toFixed(4);
  M = loadMath({ GW: bestGW, LOCK_P: lock, BUY_COST: buyCost, SUPER_COST: superCost, S_BASE: bestS, S_HUNT: huntS });
  const rtpB = baseRTP(M, "base", Nb, 600);
  const rtpH = baseRTP(M, "hunt", Math.max(120000, Nb / 2), 601);
  console.log("=== APPLY THESE VALUES ===");
  console.log({
    GW: +bestGW.toFixed(4),
    LOCK_P: +lock.toFixed(6),
    S_BASE: +bestS.toFixed(4),
    S_HUNT: huntS,
    BUY_COST: buyCost,
    SUPER_COST: superCost,
    rtpBase: +(rtpB * 100).toFixed(2),
    rtpHunt: +(rtpH * 100).toFixed(2),
    h3: +h3.toFixed(2), g3: +g3.toFixed(2), h4: +h4.toFixed(2), g4: +g4.toFixed(2)
  });
}

main();
