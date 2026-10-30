// Bisection on PAY_SCALE for a target line-only base RTP.
const path = require("path");
const fs = require("fs");
const mathPath = path.join(__dirname, "..", "preview", "math.js");
function loadMath(sc) {
  const src = fs.readFileSync(mathPath, "utf8").replace(/const PAY_SCALE = [^;]+;/, `const PAY_SCALE = ${sc};`);
  const g = {}, mod = { exports: {} };
  new Function("module", "exports", "globalThis", src)(mod, mod.exports, g);
  return mod.exports.randomBoard ? mod.exports : g.MatouMath;
}
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s >>>= 0; s ^= s << 5; s >>>= 0; return (s >>> 0) / 4294967296; };
}
function line(M, n, seed) {
  const r = rng(seed); let s = 0;
  for (let i = 0; i < n; i++) s += M.cascade(M.randomBoard("base", r), "base", r).payout;
  return s / n;
}
const target = Number(process.argv[2] || 0.4427);
let lo = Number(process.argv[3] || 0.42), hi = Number(process.argv[4] || 0.52);
for (let i = 0; i < 10; i++) {
  const mid = (lo + hi) / 2;
  const v = line(loadMath(mid.toFixed(4)), 600000, 7);
  console.log("scale", mid.toFixed(4), "line", (v * 100).toFixed(2));
  if (v > target) hi = mid; else lo = mid;
}
console.log("PAY_SCALE =", ((lo + hi) / 2).toFixed(4));
