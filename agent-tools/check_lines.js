// Validate "pays anywhere" wins: contiguous run on the payline, 3+, matching symbol or wild, maximal.
const M = require("../preview/math.js");
let bad = 0, wins = 0, notFirst = 0, hits = 0;
const len = {}, startAt = {};
const N = 200000;
for (let i = 0; i < N; i++) {
  const b = M.randomBoard("base");
  const r = M.evalBoard(b);
  if (r.wins.length) hits++;
  for (const w of r.wins) {
    wins++;
    len[w.n] = (len[w.n] || 0) + 1;
    const line = M.LINES[w.line - 1];
    const s0 = w.cells[0][0];
    startAt[s0] = (startAt[s0] || 0) + 1;
    if (s0 > 0) notFirst++;
    let ok = w.cells.length === w.n && w.n >= 3;
    w.cells.forEach(([c, row], k) => {
      if (c !== s0 + k || row !== line[c]) ok = false;
      const v = b[c][row];
      if (!(v === w.symbol || M.isWild(v))) ok = false;
    });
    const end = s0 + w.n;
    if (end < M.COLS && w.symbol !== "W") {
      const v = b[end][line[end]];
      if (v === w.symbol || M.isWild(v)) ok = false;
    }
    if (!ok) { bad++; if (bad < 5) console.log("BAD", JSON.stringify(w), JSON.stringify(b)); }
  }
}
console.log({ lines: M.LINES.length, wins, bad, hitRate: (hits / N * 100).toFixed(1) + "%", len, startReel: startAt, notFromReel1: (notFirst / wins * 100).toFixed(1) + "%" });
