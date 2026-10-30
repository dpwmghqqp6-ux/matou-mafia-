// Probe line RTP / hit rate with only the first K paylines and a given PAY_SCALE.
const path = require("path");
const fs = require("fs");
const mathPath = path.join(__dirname, "..", "preview", "math.js");
function loadMath(k, sc) {
  let src = fs.readFileSync(mathPath, "utf8");
  src = src.replace("const PAY_SCALE = ", `const PAY_SCALE = ${sc}; const __X = `);
  src = src.replace("  const VAULT_VALS", `  LINES.length = ${k};\n  const VAULT_VALS`);
  if (process.env.BASEW) src = src.replace(/base: \{[^}]*S:([0-9.]+) \}/, (m0, sv) => `base: { ${process.env.BASEW}, S:${sv} }`);
  const g = {}, mod = { exports: {} };
  new Function("module", "exports", "globalThis", src)(mod, mod.exports, g);
  return mod.exports.randomBoard ? mod.exports : g.MatouMath;
}
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s >>>= 0; s ^= s << 5; s >>>= 0; return (s >>> 0) / 4294967296; };
}
for (const k of (process.argv[2] || "10,15,20,25").split(",").map(Number)) {
  for (const sc of (process.argv[3] || "0.3,0.48").split(",").map(Number)) {
    const M = loadMath(k, sc), r = rng(3), N = 200000;
    let ret = 0, hits = 0, trig = 0, steps = 0;
    for (let i = 0; i < N; i++) {
      const p = M.cascade(M.randomBoard("base", r), "base", r);
      ret += p.payout; if (p.payout > 0) hits++; if (p.scatters >= 3) trig++; steps += p.steps.length;
    }
    console.log(`lines=${k} scale=${sc} lineRTP=${(ret / N * 100).toFixed(1)}% hit=${(hits / N * 100).toFixed(1)}% cascades/spin=${(steps / N).toFixed(2)} trig 1 in ${Math.round(N / trig)} L4=${M.PAY.L4.slice(3)} H1=${M.PAY.H1.slice(3)}`);
  }
}
