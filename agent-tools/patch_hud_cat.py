from pathlib import Path

ROOT = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview")
P = ROOT / "index.html"
s = P.read_text(encoding="utf-8")


def rep(a, b, n=1):
    global s
    c = s.count(a)
    assert c == n, (c, a[:90])
    s = s.replace(a, b)


def cut(start, end, repl):
    global s
    a = s.index(start)
    b = s.index(end, a)
    s = s[:a] + repl + s[b:]


# ---------- CSS ----------
cut("    .hud { position:absolute; left:0; right:0; bottom:0;", "    .hud-play { display:flex;", r"""    .hud {
      position:absolute; left:0; right:0; bottom:0; height:var(--hud); z-index:10;
      display:grid; grid-template-columns:1fr auto; align-items:center; gap:18px; padding:0 18px;
      background:
        linear-gradient(180deg, rgba(255,214,140,.06), transparent 38%),
        linear-gradient(180deg, rgba(24,16,9,.96), rgba(8,5,3,.99));
      border-top:1px solid rgba(232,181,74,.55);
      box-shadow:0 -14px 34px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,236,190,.08);
      backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);
    }
    .hud::before {
      content:""; position:absolute; left:0; right:0; top:-1px; height:2px; pointer-events:none;
      background:linear-gradient(90deg, transparent 0%, rgba(232,181,74,.15) 12%, #f3d488 50%, rgba(232,181,74,.15) 88%, transparent 100%);
    }
    .hud::after {
      content:""; position:absolute; left:50%; top:-7px; width:14px; height:14px; transform:translateX(-50%) rotate(45deg);
      background:#120b05; border:1px solid #e8b54a; box-shadow:0 0 10px rgba(232,181,74,.55); pointer-events:none;
    }
    .hud-left { display:flex; align-items:center; gap:22px; min-width:0; }
    .hud-menu {
      position:relative; width:54px; height:54px; flex-shrink:0; padding:0; cursor:pointer;
      border-radius:14px; border:1px solid rgba(232,181,74,.45);
      background:linear-gradient(180deg,#2a1c0d,#120b05); box-shadow:inset 0 1px 0 rgba(255,236,190,.1), 0 4px 14px rgba(0,0,0,.45);
      display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px;
      transition:border-color .2s, box-shadow .2s, background .2s;
    }
    .hud-menu i {
      display:block; width:24px; height:3px; border-radius:2px;
      background:linear-gradient(90deg,#c9953f,#f6dc98,#c9953f); box-shadow:0 0 6px rgba(255,200,90,.45);
      transition:transform .28s cubic-bezier(.3,1.4,.5,1), opacity .2s;
    }
    .hud-menu:hover { border-color:#f0d28a; box-shadow:0 0 18px rgba(232,181,74,.35), inset 0 1px 0 rgba(255,236,190,.14); }
    .hud-menu.open { background:linear-gradient(180deg,#3a2612,#1a0f06); border-color:#f0d28a; }
    .hud-menu.open i:nth-child(1) { transform:translateY(9px) rotate(45deg); }
    .hud-menu.open i:nth-child(2) { opacity:0; transform:scaleX(.2); }
    .hud-menu.open i:nth-child(3) { transform:translateY(-9px) rotate(-45deg); }
    .popover.menupop {
      left:0; bottom:calc(100% + 16px); width:230px; padding:8px; gap:4px;
      background:linear-gradient(180deg,#22160b,#0f0904); border:1px solid rgba(232,181,74,.45);
      box-shadow:0 18px 40px rgba(0,0,0,.6), 0 0 0 1px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,236,190,.08);
    }
    .popover.menupop.on { display:grid; animation:menuIn .26s cubic-bezier(.2,1.3,.4,1) both; }
    @keyframes menuIn { from { opacity:0; transform:translateY(10px) scale(.96); } }
    .menupop h4 { margin:2px 6px 6px; font:900 12px "Rockwell","Georgia",serif; letter-spacing:.32em; color:var(--gold-2); }
    .tool {
      width:100%; height:44px; padding:0 12px; border-radius:10px; cursor:pointer;
      border:1px solid transparent; background:transparent; color:#e9dcc2;
      display:flex; align-items:center; gap:12px; text-align:left;
      transition:background .15s, border-color .15s, color .15s;
    }
    .tool svg { width:20px; height:20px; flex-shrink:0; fill:none; stroke:currentColor; stroke-width:1.9; stroke-linecap:round; stroke-linejoin:round; }
    .tool span { font-size:11px; font-weight:800; letter-spacing:.16em; line-height:1; }
    .tool:hover { background:rgba(232,181,74,.1); border-color:rgba(232,181,74,.35); color:#fff; }
    .tool.on { color:var(--gold-2); }
    .tool.off { color:#8b7c66; }
    .tool .ico-off { display:none; }
    .tool.off .ico-on { display:none; }
    .tool.off .ico-off { display:block; }
    .tool:disabled { opacity:.35; cursor:default; }
    .hud-stats { display:flex; align-items:center; min-width:0; }
    .stat {
      position:relative; display:flex; flex-direction:column; align-items:flex-start; justify-content:center; gap:3px;
      padding:0 22px; min-width:0;
    }
    .stat + .stat::before {
      content:""; position:absolute; left:0; top:12%; bottom:12%; width:1px;
      background:linear-gradient(180deg, transparent, rgba(232,181,74,.55), transparent);
    }
    .stat label { font-size:10px; letter-spacing:.22em; color:#c9b088; font-weight:800; text-transform:uppercase; white-space:nowrap; }
    .stat b, .bet-val b { font-size:24px; font-weight:800; color:#fff; letter-spacing:.01em; line-height:1.05; font-variant-numeric:tabular-nums; white-space:nowrap; }
    .stat small { font-size:9px; letter-spacing:.12em; color:#8f7f66; font-weight:700; white-space:nowrap; }
    .stat.win b { color:var(--gold-2); font-family:"Rockwell","Georgia",serif; font-size:26px; text-shadow:0 0 14px rgba(255,200,90,.35), 0 2px 0 #2a1a05; }
    .stat.win.hit b { animation:winHit .5s ease-out; }
    @keyframes winHit { 0% { transform:scale(1); } 40% { transform:scale(1.12); filter:brightness(1.4); } 100% { transform:scale(1); } }
    .betrow { display:flex; align-items:center; gap:8px; }
    .bet-val { background:none; border:0; padding:0 2px; color:#fff; cursor:pointer; min-width:64px; text-align:center; }
    .bet-val:hover b { color:var(--gold-2); }
    .chev { width:26px; height:26px; border-radius:50%; border:1px solid rgba(232,181,74,.5); background:#22170c; color:var(--gold-2); cursor:pointer; font-size:16px; font-weight:800; line-height:1; display:grid; place-items:center; padding:0; }
    .chev:hover { background:#3d2a14; }
    .chev:disabled { opacity:.3; cursor:default; }
    .hud-feat {
      display:none; align-items:stretch; height:64px; border-radius:14px; overflow:hidden;
      background:linear-gradient(180deg,#1a1108,#0a0603); border:1px solid rgba(232,181,74,.6);
      box-shadow:inset 0 0 18px rgba(0,0,0,.7), 0 0 22px rgba(232,181,74,.18);
    }
    .hud-feat.on { display:flex; animation:featIn .45s cubic-bezier(.2,1.3,.4,1) both; }
    .hud-feat.green { border-color:rgba(80,200,120,.6); box-shadow:inset 0 0 18px rgba(0,0,0,.7), 0 0 22px rgba(80,200,120,.2); }
    @keyframes featIn { from { opacity:0; transform:translateY(14px) scale(.94); } }
    .fstat { position:relative; display:flex; flex-direction:column; justify-content:center; gap:3px; padding:0 18px; min-width:120px; }
    .fstat + .fstat { border-left:1px solid rgba(232,181,74,.35); min-width:96px; }
    .fstat label { font-size:10px; letter-spacing:.22em; color:#c9b088; font-weight:800; white-space:nowrap; }
    .fstat b { font:900 24px/1.05 "Rockwell","Georgia",serif; color:#ffe2a0; font-variant-numeric:tabular-nums; white-space:nowrap; text-shadow:0 0 12px rgba(255,200,90,.4); }
    .fstat.spins b { color:#fff; }
    .fstat.bump b { animation:winHit .5s ease-out; }
""")

cut("    @media (min-width:1700px) and (min-height:950px) {\n      :root { --hud:112px; }", "    .popwrap { position:relative; }", r"""    @media (min-width:1700px) and (min-height:950px) {
      :root { --hud:112px; }
      .hud > * { zoom:1.15; }
    }
    @media (max-width:1180px) {
      .hud { gap:10px; padding:0 10px; }
      .hud-left { gap:12px; }
      .stat { padding:0 12px; }
      .stat b, .bet-val b { font-size:19px; } .stat.win b { font-size:21px; }
      .fstat { min-width:96px; padding:0 12px; } .fstat b { font-size:20px; }
      .hud-bonus { min-width:90px; padding:0 10px; } .hud-bonus small { display:none; }
    }
    @media (max-width:900px) {
      :root { --hud:150px; }
      .hud { grid-template-columns:1fr; grid-template-rows:auto auto; align-content:center; row-gap:8px; }
      .hud-play { justify-self:stretch; justify-content:flex-end; gap:10px; }
      .hud-menu { width:46px; height:46px; }
      .stat label { font-size:9px; } .stat b, .bet-val b { font-size:16px; } .stat.win b { font-size:18px; }
      .hud-feat { height:52px; } .fstat { min-width:80px; padding:0 10px; } .fstat b { font-size:17px; }
      .hud-bonus { height:50px; }
      .spin { width:60px; height:60px; }
    }
""")

# ---------- HTML ----------
TOOLS_START = '      <div class="hud-tools">\n'
a = s.index(TOOLS_START)
b = s.index('      <div class="hud-stats">', a)
tools_inner = s[a + len(TOOLS_START): s.index("      </div>\n", a)]
c = s.index('      <div class="hud-play">', b)
stats_block = s[b:c]

new_left = (
    '      <div class="hud-left">\n'
    '        <div class="popwrap">\n'
    '          <button class="hud-menu" id="menuBtn" aria-label="Menu" aria-haspopup="true"><i></i><i></i><i></i></button>\n'
    '          <div class="popover menupop" id="menuPop">\n'
    '            <h4>MENU</h4>\n'
    + "".join("    " + line + "\n" for line in tools_inner.rstrip("\n").split("\n"))
    + '          </div>\n'
    '        </div>\n'
    '        <div class="hud-stats">\n'
    '          <div class="stat">\n'
    '            <label id="labBal">BALANCE</label>\n'
    '            <b id="balance">1,000.00</b>\n'
    '          </div>\n'
    '          <div class="stat betbox popwrap">\n'
    '            <label id="labBet">BET</label>\n'
    '            <div class="betrow">\n'
    '              <button class="chev" id="betMinus" aria-label="Decrease bet">−</button>\n'
    '              <button class="bet-val" id="betOpen" title="Choose bet"><b id="bet">1.00</b></button>\n'
    '              <button class="chev" id="betPlus" aria-label="Increase bet">+</button>\n'
    '            </div>\n'
    '            <small id="cost">COST 1.00</small>\n'
    '            <div class="popover betpop" id="betPop"></div>\n'
    '          </div>\n'
    '          <div class="stat win" id="winPanel">\n'
    '            <label id="winLab">WIN</label>\n'
    '            <b id="winVal">0.00</b>\n'
    '          </div>\n'
    '        </div>\n'
    '      </div>\n'
)
s = s[:a] + new_left + s[c:]

rep('      <div class="hud-play">\n        <div class="popwrap">\n          <button class="hud-bonus" id="bonusBtn"',
    '      <div class="hud-play">\n'
    '        <div class="hud-feat" id="hudFeat">\n'
    '          <div class="fstat" id="totalBox"><label>TOTAL WIN</label><b id="totalVal">0.00</b></div>\n'
    '          <div class="fstat spins" id="spinsBox"><label id="spinsLab">FREE SPINS</label><b id="spinsVal">0</b></div>\n'
    '        </div>\n'
    '        <div class="popwrap">\n          <button class="hud-bonus" id="bonusBtn"')

# ---------- JS: hud() win / total / spins ----------
rep("""      let shownWin = state.win;
      let winTxt = money(shownWin || 0);
      if (state.inVault && !state.revealing) {
        winTxt = `${lockedCount()} SACKS`;
        shownWin = lockedCount();
      } else if (state.inVault || state.inGold || state.revealing) {
        shownWin = state.roundLineWin + state.bonusWin;
        winTxt = money(shownWin || 0);
      }
      if ($("winVal").textContent !== winTxt) {
        $("winVal").textContent = winTxt;
        const wp = $("winPanel");
        if (shownWin > 0 && !wp.classList.contains("hit")) {
          wp.classList.add("hit");
          setTimeout(() => wp.classList.remove("hit"), 520);
        }
      }""", """      const inFeat = state.inVault || state.inGold;
      const shownWin = state.win || 0;
      const winTxt = money(shownWin);
      if ($("winVal").textContent !== winTxt) {
        $("winVal").textContent = winTxt;
        const wp = $("winPanel");
        if (shownWin > 0 && !wp.classList.contains("hit")) {
          wp.classList.add("hit");
          setTimeout(() => wp.classList.remove("hit"), 520);
        }
      }
      const feat = $("hudFeat");
      feat.classList.toggle("on", inFeat);
      feat.classList.toggle("green", state.inVault);
      if (inFeat) {
        const totTxt = state.inVault && !state.revealing ? `${lockedCount()} SACKS` : money((state.roundLineWin || 0) + (state.bonusWin || 0));
        const spinsTxt = String(state.inVault ? state.respins : state.goldSpinsLeft);
        $("spinsLab").textContent = state.inVault ? "RESPINS" : "FREE SPINS";
        const bump = (id, el, txt) => {
          if (el.textContent === txt) return;
          el.textContent = txt;
          const box = $(id); box.classList.remove("bump"); void box.offsetWidth; box.classList.add("bump");
        };
        bump("totalBox", $("totalVal"), totTxt);
        bump("spinsBox", $("spinsVal"), spinsTxt);
      }""")

# countUp offset so cascades keep accumulating
rep("""        state.win=from+(to-from)*e; hud();
        if(p<1) requestAnimationFrame(run); else { state.win=to; hud(); }""",
    """        state.win=(state.winBase||0)+from+(to-from)*e; hud();
        if(p<1) requestAnimationFrame(run); else { state.win=(state.winBase||0)+to; hud(); }""")

rep("""        const stepRes = { ...step.result, scatters: 0, scatterCells: [] };
        const won = await showWins(stepRes, bet);
        total = +(total + won).toFixed(2);
        state.win = total;
        hud();""", """        const stepRes = { ...step.result, scatters: 0, scatterCells: [] };
        state.winBase = total;
        const won = await showWins(stepRes, bet);
        total = +(total + won).toFixed(2);
        state.winBase = 0;
        state.win = total;
        hud();""")
rep("""      if (play.scatters >= 3) {
        await showWins({ wins: [], payout: 0, scatters: play.scatters, scatterCells: play.scatterCells }, bet);
      }
      return total;""", """      if (play.scatters >= 3) {
        state.winBase = total;
        await showWins({ wins: [], payout: 0, scatters: play.scatters, scatterCells: play.scatterCells }, bet);
        state.winBase = 0;
        state.win = total;
      }
      return total;""")

# Gold Rush: WIN shows the current spin only
rep("""        state.goldSpinsLeft -= 1;
        hud();
        let board = M.randomBoard("gold");""", """        state.goldSpinsLeft -= 1;
        state.win = 0;
        hud();
        let board = M.randomBoard("gold");""")

# Menu toggle wiring
rep("""    function closePops(){ document.querySelectorAll(".popover.on").forEach((el)=>el.classList.remove("on")); }
    function togglePop(id){
      const el=$(id), open=el.classList.contains("on");
      closePops();
      if (!open) { el.classList.add("on"); sfx("click"); }
    }""", """    function syncMenuBtn(){ const b=$("menuBtn"); if (b) b.classList.toggle("open", $("menuPop").classList.contains("on")); }
    function closePops(){ document.querySelectorAll(".popover.on").forEach((el)=>el.classList.remove("on")); syncMenuBtn(); }
    function togglePop(id){
      const el=$(id), open=el.classList.contains("on");
      closePops();
      if (!open) { el.classList.add("on"); sfx("click"); }
      syncMenuBtn();
    }""")
rep("""    $("bonusBtn").onclick = (e) => {""", """    $("menuBtn").onclick = (e) => { e.stopPropagation(); togglePop("menuPop"); };
    $("menuPop").onclick = (e) => e.stopPropagation();
    $("bonusBtn").onclick = (e) => {""")

# Cat follows camera via translate (set by bg-a)
rep("""      z-index:5; pointer-events:none;
      display:flex; align-items:flex-end; justify-content:center;
    }
    .cat-wrap::after {""", """      z-index:5; pointer-events:none;
      display:flex; align-items:flex-end; justify-content:center;
      will-change:translate;
    }
    .cat-wrap::after {""")

P.write_text(s, encoding="utf-8", newline="\n")
print("html ok")

# ---------- bg-a: anchor cat to the ground it stands on ----------
J = ROOT / "bg" / "bg-a-webgl.js"
j = J.read_text(encoding="utf-8")


def jrep(a, b):
    global j
    assert j.count(a) == 1, a[:80]
    j = j.replace(a, b)


jrep("let flash = 0, win = 0, winTarget = 0, boost = 0, boostTarget = 0, mouse = [0, 0], cam = [0, 0], reducedMode = false;",
     "let flash = 0, win = 0, winTarget = 0, boost = 0, boostTarget = 0, mouse = [0, 0], cam = [0, 0], reducedMode = false;\n"
     "  let auxPx = null, auxW = 0, auxH = 0, catEl = null, catK = 0, catScale = 0, anchorTick = 0;")

jrep("  function resize() {", """  function readAux(img) {
    auxW = 256; auxH = Math.round(256 / IMG_ASPECT);
    const c = document.createElement("canvas");
    c.width = auxW; c.height = auxH;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(img, 0, 0, auxW, auxH);
    auxPx = g.getImageData(0, 0, auxW, auxH).data;
  }

  // Parallax shift of the ground under the cat's feet, so the DOM cat moves with the street.
  function measureCat() {
    catEl = catEl || document.getElementById("catWrap");
    if (!catEl || !canvas || !auxPx) return;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    const ca = w / h;
    let ux = (catEl.offsetLeft + catEl.offsetWidth * 0.5) / w - 0.5;
    let uy = (catEl.offsetTop + catEl.offsetHeight * 0.97) / h - 0.5;
    if (ca > IMG_ASPECT) uy *= IMG_ASPECT / ca; else ux *= ca / IMG_ASPECT;
    ux = ux / 1.035 + 0.5; uy = uy / 1.035 + 0.5;
    const ix = Math.min(auxW - 1, Math.max(0, Math.round(ux * (auxW - 1))));
    const iy = Math.min(auxH - 1, Math.max(0, Math.round(uy * (auxH - 1))));
    const depth = auxPx[(iy * auxW + ix) * 4] / 255;
    catK = (depth - 0.35) * 0.014;
    catScale = 1.035 * Math.max(w, h * IMG_ASPECT);
  }

  function anchorCat() {
    if (!catEl) return;
    const off = reducedMode || document.getElementById("stage")?.classList.contains("vault");
    const dx = off ? 0 : -cam[0] * catK * catScale;
    const dy = off ? 0 : -cam[1] * catK * catScale / IMG_ASPECT;
    catEl.style.translate = `${dx.toFixed(2)}px ${dy.toFixed(2)}px`;
  }

  function resize() {""")

jrep("    if (reducedMode) draw(performance.now());\n  }", "    measureCat();\n    if (reducedMode) draw(performance.now());\n  }")

jrep("    gl.uniform2f(uni.uCam, reducedMode ? 0 : cam[0], reducedMode ? 0 : cam[1]);",
     "    gl.uniform2f(uni.uCam, reducedMode ? 0 : cam[0], reducedMode ? 0 : cam[1]);\n"
     "    if ((anchorTick++ & 63) === 0) measureCat();\n"
     "    anchorCat();")

jrep("    texture(plate, 0);\n    texture(aux, 1);", "    readAux(aux);\n    texture(plate, 0);\n    texture(aux, 1);")

jrep("    canvas = gl = prog = ro = onVis = onMove = null;",
     "    if (catEl) catEl.style.translate = \"\";\n"
     "    catEl = null; auxPx = null;\n"
     "    canvas = gl = prog = ro = onVis = onMove = null;")

J.write_text(j, encoding="utf-8", newline="\n")
print("bg-a ok")
