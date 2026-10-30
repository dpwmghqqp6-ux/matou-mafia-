#!/usr/bin/env node
const M = require("../preview/math.js");

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17; s >>>= 0;
    s ^= s << 5; s >>>= 0;
    return (s >>> 0) / 4294967296;
  };
}

function featureEV(kind, level, n, seed) {
  const r = rng(seed);
  let sum = 0, max = 0;
  for (let i = 0; i < n; i++) {
    const door = M.pickDoorFx(kind, r);
    const pot = (kind === "gold" ? M.simulateGoldRush(level, door, r) : M.simulateVault(level, level, door, r)).pot;
    sum += pot;
    if (pot > max) max = pot;
  }
  return { ev: sum / n, max };
}

function rtp(mode, n, seed) {
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
      const pot = (kind === "gold" ? M.simulateGoldRush(level, door, r) : M.simulateVault(play.scatters, level, door, r)).pot;
      ret += Math.min(M.MAX_WIN - play.payout, pot);
    }
  }
  return ret / (n * cost);
}

const h3 = featureEV("heist", 3, 80000, 1);
const g3 = featureEV("gold", 3, 80000, 2);
const h4 = featureEV("heist", 4, 80000, 3);
const g4 = featureEV("gold", 4, 80000, 4);
console.log("constants", { BUY: M.BUY_COST, SUPER: M.SUPER_COST, S: M.WEIGHTS.base.S, HuntS: M.WEIGHTS.hunt.S, GW: M.WEIGHTS.gold.GW, LOCK_P: M.LOCK_P });
console.log("L3", h3, g3);
console.log("L4", h4, g4);
console.log("buyRTP", (((h3.ev + g3.ev) / 2) / M.BUY_COST * 100).toFixed(2));
console.log("superRTP", (((h4.ev + g4.ev) / 2) / M.SUPER_COST * 100).toFixed(2));
console.log("baseRTP", (rtp("base", 800000, 9) * 100).toFixed(2));
console.log("huntRTP", (rtp("hunt", 400000, 10) * 100).toFixed(2));
