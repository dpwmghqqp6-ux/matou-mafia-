#!/usr/bin/env node
// Retune RTP after rounding pays to 0.1x bet, integer ingots, BUY 120 / SUPER 155.
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
function lineRTP(M, mode, n, seed) {
  const r = rng(seed);
  let ret = 0, trig3 = 0, trig4 = 0;
  for (let i = 0; i < n; i++) {
    const play = M.cascade(M.randomBoard(mode, r), mode, r);
    ret += play.payout;
    if (play.scatters >= 4) trig4++; else if (play.scatters >= 3) trig3++;
  }
  return { line: ret / n, p3: trig3 / n, p4: trig4 / n };
}

const o = {};
const T3 = 0.965 * 120, T4 = 0.965 * 155;
const NF = Number(process.argv[2] || 40000);

// 1) PAY_SCALE: line-only RTP close to the previous line share (~ base RTP minus bonus share).
let M = loadMath();
const prev = lineRTP(M, "base", 300000, 5);
console.log("current line RTP", (prev.line * 100).toFixed(2), "p3", prev.p3, "p4", prev.p4);
const TARGET_LINE = Number(process.argv[3] || 0.62);
let lo = 0.25, hi = 0.7;
for (let i = 0; i < 9; i++) {
  const mid = (lo + hi) / 2;
  const v = lineRTP(loadMath({ PAY_SCALE: mid }), "base", 200000, 11 + i).line;
  console.log("scale", mid.toFixed(4), "line", (v * 100).toFixed(2));
  if (v > TARGET_LINE) hi = mid; else lo = mid;
}
o.PAY_SCALE = +((lo + hi) / 2).toFixed(4);

// 2) LOCK_P / GW so that L3 avg = T3 and L4 avg = T4 (2D secant on log params).
let lp = 0.0245, gw = 0.0881;
for (let it = 0; it < 6; it++) {
  M = loadMath({ ...o, LOCK_P: lp, GW: gw });
  const h3 = featureEV(M, "heist", 3, NF, 1), g3 = featureEV(M, "gold", 3, NF, 2);
  const h4 = featureEV(M, "heist", 4, NF, 3), g4 = featureEV(M, "gold", 4, NF, 4);
  const e3 = (h3 + g3) / 2, e4 = (h4 + g4) / 2;
  console.log(`it${it} LOCK_P=${lp.toFixed(5)} GW=${gw.toFixed(5)} h3=${h3.toFixed(1)} g3=${g3.toFixed(1)} h4=${h4.toFixed(1)} g4=${g4.toFixed(1)} buy=${(e3 / 120 * 100).toFixed(2)} super=${(e4 / 155 * 100).toFixed(2)}`);
  if (Math.abs(e3 / T3 - 1) < 0.004 && Math.abs(e4 / T4 - 1) < 0.004) break;
  const d = 1.06;
  const Mh = loadMath({ ...o, LOCK_P: lp * d, GW: gw });
  const Mg = loadMath({ ...o, LOCK_P: lp, GW: gw * d });
  const dh3 = (featureEV(Mh, "heist", 3, NF, 1) - h3) / Math.log(d), dh4 = (featureEV(Mh, "heist", 4, NF, 3) - h4) / Math.log(d);
  const dg3 = (featureEV(Mg, "gold", 3, NF, 2) - g3) / Math.log(d), dg4 = (featureEV(Mg, "gold", 4, NF, 4) - g4) / Math.log(d);
  // [dh3 dg3; dh4 dg4] * [x; y] = 2*[T3-e3; T4-e4]
  const a = dh3, b = dg3, c = dh4, dd = dg4, r3 = 2 * (T3 - e3), r4 = 2 * (T4 - e4);
  const det = a * dd - b * c;
  let x = (r3 * dd - b * r4) / det, y = (a * r4 - c * r3) / det;
  x = Math.max(-0.4, Math.min(0.4, x)); y = Math.max(-0.6, Math.min(0.6, y));
  lp *= Math.exp(x); gw *= Math.exp(y);
}
o.LOCK_P = +lp.toFixed(5); o.GW = +gw.toFixed(5);

// 3) S_BASE / S_HUNT for 96.50% using line RTP + trigger rates * feature EV.
M = loadMath(o);
const E3 = (featureEV(M, "heist", 3, NF * 2, 21) + featureEV(M, "gold", 3, NF * 2, 22)) / 2;
const E4 = (featureEV(M, "heist", 4, NF * 2, 23) + featureEV(M, "gold", 4, NF * 2, 24)) / 2;
function solveS(mode, key, cost, s0) {
  let lo = s0 * 0.4, hi = s0 * 2.5;
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    const st = lineRTP(loadMath({ ...o, [key]: mid }), mode, mode === "hunt" ? 250000 : 400000, 31 + i);
    const v = (st.line + st.p3 * E3 + st.p4 * E4) / cost;
    console.log(key, mid.toFixed(4), (v * 100).toFixed(2), "1 in", Math.round(1 / (st.p3 + st.p4)));
    if (v > 0.965) hi = mid; else lo = mid;
  }
  return +((lo + hi) / 2).toFixed(4);
}
o.S_BASE = solveS("base", "S_BASE", 1, 1.09);
o.S_HUNT = solveS("hunt", "S_HUNT", 3, 1.92);
console.log("=== APPLY ===", JSON.stringify(o), "E3", E3.toFixed(2), "E4", E4.toFixed(2));
