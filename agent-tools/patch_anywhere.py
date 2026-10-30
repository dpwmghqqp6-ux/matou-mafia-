from pathlib import Path

ROOT = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview")

# ---------- math.js: best run of 3+ anywhere on the line ----------
J = ROOT / "math.js"
m = J.read_text(encoding="utf-8")
old_start = m.index("  function lineMatch(board, line) {")
old_end = m.index("  function evalBoard(board) {")
m = m[:old_start] + """  function runFrom(board, line, start) {
    let symbol = null, n = 0;
    for (let c = start; c < COLS; c++) {
      const v = board[c][line[c]];
      if (v === "S") break;
      if (isWild(v)) { n++; continue; }
      if (!symbol) { symbol = v; n++; continue; }
      if (v === symbol) { n++; continue; }
      break;
    }
    if (n < 3) return null;
    if (!symbol) symbol = "W";
    let pay = (PAY[symbol] || [])[n] || 0;
    if (!isWild(symbol)) {
      let wn = 0;
      for (let c = start; c < COLS; c++) { if (isWild(board[c][line[c]])) wn++; else break; }
      if (wn >= 3 && (PAY.W[wn] || 0) > pay) { symbol = "W"; n = wn; pay = PAY.W[wn]; }
    }
    return pay > 0 ? { symbol, n, pay, start } : null;
  }

  // Pays anywhere: the best run of 3+ adjacent matching symbols on the line, from any reel.
  function lineMatch(board, line) {
    let best = null;
    for (let s = 0; s <= COLS - 3; s++) {
      const r = runFrom(board, line, s);
      if (r && (!best || r.pay > best.pay || (r.pay === best.pay && r.n > best.n))) best = r;
    }
    return best || { symbol: null, n: 0, pay: 0, start: 0 };
  }

""" + m[old_end:]
old = """      const { symbol, n, pay } = lineMatch(board, line);
      if (pay > 0) {
        const cells = [];
        for (let c = 0; c < n; c++) cells.push([c, line[c]]);"""
assert m.count(old) == 1
m = m.replace(old, """      const { symbol, n, pay, start } = lineMatch(board, line);
      if (pay > 0) {
        const cells = [];
        for (let c = start; c < start + n; c++) cells.push([c, line[c]]);""")
J.write_text(m, encoding="utf-8", newline="\n")

# ---------- frame-webgl.js: frenzy mode ----------
F = ROOT / "bg" / "frame-webgl.js"
f = F.read_text(encoding="utf-8")


def frep(a, b):
    global f
    assert f.count(a) == 1, a[:80]
    f = f.replace(a, b)


frep("""      float a = uRot[i].w * uMotT
              + uRotW[i].x * (sin(t * uRotW[i].y + float(i) * 1.7) + 0.35 * sin(t * uRotW[i].y * 2.7 + float(i)));""",
     """      float a = uRot[i].w * uMotT
              + uRotW[i].x * (sin(t * uRotW[i].y + float(i) * 1.7) + 0.35 * sin(t * uRotW[i].y * 2.7 + float(i)));
      a += uFx2.w * ((hash21(vec2(floor(t * 14.0), float(i) * 3.1)) - 0.5) * 1.4 + sin(t * 41.0 + float(i)) * 0.12);""")
frep("""  if (flickAmt > 0.0) {
    float f = 0.93 + 0.07 * vnoise(vec2(t * 18.0, 1.0)) + 0.05 * step(0.92, hash21(vec2(floor(t * 12.0), 3.0)));
    col *= mix(1.0, f, flickAmt);
  }""", """  if (flickAmt > 0.0) {
    float f = 0.93 + 0.07 * vnoise(vec2(t * 18.0, 1.0)) + 0.05 * step(0.92, hash21(vec2(floor(t * 12.0), 3.0)));
    f = mix(f, 0.7 + 0.6 * hash21(vec2(floor(t * 26.0), 8.0)), uFx2.w);
    col *= mix(1.0, f, flickAmt);
  }""")
frep("""    else if (mode == 1) k = 0.75 + 0.25 * vnoise(vec2(t * 9.0, float(i) * 7.0)) - 0.5 * step(0.95, hash21(vec2(floor(t * 8.0), float(i))));""",
     """    else if (mode == 1) {
      k = 0.75 + 0.25 * vnoise(vec2(t * 9.0, float(i) * 7.0)) - 0.5 * step(0.95, hash21(vec2(floor(t * 8.0), float(i))));
      float fr = uFx2.w;
      if (fr > 0.0) {
        float strobe = step(0.42, hash21(vec2(floor(t * 32.0), float(i) + 11.0)));
        k = mix(k, 0.15 + strobe * 4.5, fr);
        add += uGlowC[i].rgb * (exp(-dd / (r * r * 14.0)) * 1.4 + exp(-dd / (r * r * 70.0)) * 0.6) * strobe * fr;
      }
    }""")
frep("    let raf = 0, running = false, ready = false, win = 0, winTarget = 0, spinTarget = 0, spinLevel = 0, motT = 0, last = 0;",
     "    let raf = 0, running = false, ready = false, win = 0, winTarget = 0, spinTarget = 0, spinLevel = 0, motT = 0, last = 0, frenzy = 0, frenzyTarget = 0, jerk = 1, jerkT = 0;")
frep("""      motT += dt * (cfg.spinOnly ? spinLevel * 2.2 : 1 + win * 1.5);
      gl.uniform1f(uni.uMotT, motT);""", """      frenzy += (frenzyTarget - frenzy) * Math.min(1, dt * (frenzyTarget > frenzy ? 10 : 3));
      if (now - jerkT > 90) { jerkT = now; jerk = 0.35 + Math.random() * 1.6; }
      motT += dt * (cfg.spinOnly ? spinLevel * 2.2 : 1 + win * 1.5) + dt * frenzy * 9 * jerk;
      gl.uniform1f(uni.uMotT, motT);
      gl.uniform4f(uni.uFx2, cfg.flow || 0, cfg.spark || 0, cfg.bandSpeed || 0, frenzy);""")
frep("      win(on) { winTarget = on ? 1 : 0; },", "      win(on) { winTarget = on ? 1 : 0; },\n      frenzy(on) { frenzyTarget = on ? 1 : 0; },")
F.write_text(f, encoding="utf-8", newline="\n")

# ---------- index.html: 3 s frenzy before the bonus choice ----------
P = ROOT / "index.html"
s = P.read_text(encoding="utf-8")


def rep(a, b):
    global s
    assert s.count(a) == 1, a[:80]
    s = s.replace(a, b)


rep("""    function frameSpin(on) {""", """    async function frameFrenzy(ms=3000) {
      const fx=[...document.querySelectorAll("#table > canvas.skin")].map((c)=>c._fx).filter(Boolean);
      fx.forEach((f)=>f.frenzy && f.frenzy(true));
      $("table").classList.add("frenzy");
      if (window.MatouScene) MatouScene.lightning();
      await wait(ms);
      fx.forEach((f)=>f.frenzy && f.frenzy(false));
      $("table").classList.remove("frenzy");
    }
    function frameSpin(on) {""")
rep("""      $("skipBox").checked = false;
      hud();
      const kind = await chooseBonus(level);""", """      $("skipBox").checked = false;
      hud();
      await frameFrenzy(3000);
      const kind = await chooseBonus(level);""")
rep("    .table.winpulse { animation:winframe .45s ease-out; }",
    "    .table.winpulse { animation:winframe .45s ease-out; }\n"
    "    .table.frenzy { animation:frenzyShake .09s steps(2) infinite; }\n"
    "    @keyframes frenzyShake { 0% { translate:1.5px -1px; } 50% { translate:-1.5px 1px; } 100% { translate:1px 1.5px; } }")
P.write_text(s, encoding="utf-8", newline="\n")
print("ok")
