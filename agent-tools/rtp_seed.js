// node rtp_seed.js <mode base|hunt> <seed> <n>  -> prints RTP and trigger rate
const M = require("../preview/math.js");
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s >>>= 0; s ^= s << 5; s >>>= 0; return (s >>> 0) / 4294967296; };
}
const [mode = "base", seed = "1", n = "1000000"] = process.argv.slice(2);
const r = rng(Number(seed)), N = Number(n), cost = mode === "hunt" ? M.HUNT_COST : 1;
let ret = 0, line = 0, trig = 0, t4 = 0;
for (let i = 0; i < N; i++) {
  const play = M.cascade(M.randomBoard(mode, r), mode, r);
  ret += play.payout; line += play.payout;
  if (play.scatters >= 3) {
    trig++; if (play.scatters >= 4) t4++;
    const level = M.bonusLevel(play.scatters);
    const kind = r() < 0.5 ? "heist" : "gold";
    const door = M.pickDoorFx(kind, r);
    const pot = kind === "gold" ? M.simulateGoldRush(level, door, r).pot : M.simulateVault(play.scatters, level, door, r).pot;
    ret += Math.min(M.MAX_WIN - play.payout, pot);
  }
}
console.log(JSON.stringify({ mode, seed: +seed, rtp: ret / N / cost, line: line / N / cost, trig: trig / N, p4: t4 / N }));
