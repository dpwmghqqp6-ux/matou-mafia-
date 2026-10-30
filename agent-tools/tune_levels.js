// Given PAY_SCALE, tune GW (gold) then LOCK_P / LOCK_P_L4 (heist) so Buy and Super land on 96.5%.
const path = require("path");
const fs = require("fs");
const mathPath = path.join(__dirname, "..", "preview", "math.js");
function loadMath(o) {
  let src = fs.readFileSync(mathPath, "utf8");
  if (o.sc != null) src = src.replace(/const PAY_SCALE = [^;]+;/, `const PAY_SCALE = ${o.sc};`);
  if (o.gw != null) src = src.replace(/(gold:\s*\{[^}]*GW:)([0-9.]+)/, `$1${o.gw}`);
  if (o.p3 != null) src = src.replace(/const LOCK_P = [^;]+;/, `const LOCK_P = ${o.p3};`);
  if (o.p4 != null) src = src.replace(/const LOCK_P_L4 = [^;]+;/, `const LOCK_P_L4 = ${o.p4};`);
  const g = {}, mod = { exports: {} };
  new Function("module", "exports", "globalThis", src)(mod, mod.exports, g);
  return mod.exports.randomBoard ? mod.exports : g.MatouMath;
}
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s >>>= 0; s ^= s << 5; s >>>= 0; return (s >>> 0) / 4294967296; };
}
function ev(M, kind, level, n, seed) {
  const r = rng(seed); let s = 0;
  for (let i = 0; i < n; i++) {
    const door = M.pickDoorFx(kind, r);
    s += (kind === "gold" ? M.simulateGoldRush(level, door, r) : M.simulateVault(level, level, door, r)).pot;
  }
  return s / n;
}
function bisect(lo, hi, f, target, it = 9) {
  for (let i = 0; i < it; i++) { const mid = (lo + hi) / 2; if (f(mid) > target) hi = mid; else lo = mid; }
  return (lo + hi) / 2;
}
const M0 = require(mathPath);
const sc = Number(process.argv[2] || M0.PAY_SCALE);
const BUY = M0.BUY_COST, SUP = M0.SUPER_COST, NF = 50000;
const gw = bisect(0.04, 0.1, (x) => {
  const M = loadMath({ sc, gw: x });
  const v = ev(M, "gold", 3, NF, 2) + ev(M, "gold", 4, NF, 4);
  console.log("gw", x.toFixed(5), v.toFixed(2));
  return v;
}, 255.0, 8);
const Mg = loadMath({ sc, gw });
const g3 = ev(Mg, "gold", 3, NF * 2, 12), g4 = ev(Mg, "gold", 4, NF * 2, 14);
const h3t = 2 * 0.965 * BUY - g3, h4t = 2 * 0.965 * SUP - g4;
console.log({ g3, g4, h3t, h4t });
const p3 = bisect(0.02, 0.036, (x) => { const v = ev(loadMath({ sc, gw, p3: x }), "heist", 3, NF * 2, 1); console.log("p3", x.toFixed(5), v.toFixed(2)); return v; }, h3t, 9);
const p4 = bisect(0.02, 0.036, (x) => { const v = ev(loadMath({ sc, gw, p4: x }), "heist", 4, NF * 2, 3); console.log("p4", x.toFixed(5), v.toFixed(2)); return v; }, h4t, 9);
console.log("=== APPLY ===", JSON.stringify({ PAY_SCALE: sc, GW: +gw.toFixed(5), LOCK_P: +p3.toFixed(5), LOCK_P_L4: +p4.toFixed(5), E3: +(0.965 * BUY).toFixed(2), E4: +(0.965 * SUP).toFixed(2) }));
