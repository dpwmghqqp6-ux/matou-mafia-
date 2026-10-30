const M = require("../preview/math.js");
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s >>>= 0; s ^= s << 5; s >>>= 0; return (s >>> 0) / 4294967296; };
}
const r = rng(5);
let ret = 0, t = 0;
const N = 400000;
for (let i = 0; i < N; i++) { const p = M.cascade(M.randomBoard("base", r), "base", r); ret += p.payout; if (p.scatters >= 3) t++; }
console.log("line RTP", (ret / N * 100).toFixed(2), "trigger 1 in", Math.round(N / t), "PAY L4", M.PAY.L4, "H1", M.PAY.H1);
