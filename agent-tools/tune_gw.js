// Bisection on gold GW weight so that g3 + g4 hits a target sum.
const path = require("path");
const fs = require("fs");
const mathPath = path.join(__dirname, "..", "preview", "math.js");
function loadMath(gw) {
  const src = fs.readFileSync(mathPath, "utf8").replace(/(gold:\s*\{[^}]*GW:)([0-9.]+)/, `$1${gw}`);
  const g = {}, mod = { exports: {} };
  new Function("module", "exports", "globalThis", src)(mod, mod.exports, g);
  return mod.exports.randomBoard ? mod.exports : g.MatouMath;
}
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s >>>= 0; s ^= s << 5; s >>>= 0; return (s >>> 0) / 4294967296; };
}
function ev(M, level, n, seed) {
  const r = rng(seed); let s = 0;
  for (let i = 0; i < n; i++) s += M.simulateGoldRush(level, M.pickDoorFx("gold", r), r).pot;
  return s / n;
}
const target = Number(process.argv[2] || 255.2);
let lo = 0.05, hi = 0.09;
for (let i = 0; i < 8; i++) {
  const mid = (lo + hi) / 2, M = loadMath(mid);
  const g3 = ev(M, 3, 50000, 2), g4 = ev(M, 4, 50000, 4);
  console.log("GW", mid.toFixed(5), "g3", g3.toFixed(2), "g4", g4.toFixed(2), "sum", (g3 + g4).toFixed(2));
  if (g3 + g4 > target) hi = mid; else lo = mid;
}
console.log("GW =", ((lo + hi) / 2).toFixed(5));
