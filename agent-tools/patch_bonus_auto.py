from pathlib import Path

P = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\index.html")
s = P.read_text(encoding="utf-8")


def rep(a, b):
    global s
    assert s.count(a) == 1, (s.count(a), a[:90])
    s = s.replace(a, b)


def cut(start, end, repl):
    global s
    a = s.index(start)
    b = s.index(end, a)
    s = s[:a] + repl + s[b:]


SAFE = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4" width="17" height="15" rx="2"/><circle cx="11" cy="11.5" r="3.6"/><path d="M11 9.4v1.2M11 12.4v1.2M17.5 9v5M6 19v1.6M18 19v1.6"/></svg>'

# ---------- CSS: bonus popover ----------
cut("    .popover.bonuspop { width:min(340px, 92vw);", "    .popover.betpop {", r"""    .popover.bonuspop {
      width:min(430px, 94vw); padding:16px; left:auto; right:0; bottom:calc(100% + 16px); border-radius:18px;
      background:radial-gradient(120% 70% at 50% 0%, rgba(232,181,74,.12), transparent 60%), linear-gradient(180deg,#1f150b,#0c0804);
      border:1px solid rgba(232,181,74,.5); box-shadow:0 22px 50px rgba(0,0,0,.65), inset 0 1px 0 rgba(255,236,190,.08);
    }
    .popover.bonuspop.on { display:grid; gap:12px; animation:menuIn .28s cubic-bezier(.2,1.3,.4,1) both; }
    .bp-head { display:flex; align-items:baseline; justify-content:space-between; gap:10px; padding:0 2px; }
    .bp-head h4 { margin:0; font:900 18px "Rockwell","Georgia",serif; letter-spacing:.28em; color:var(--gold-2); text-shadow:0 2px 0 #2a1a05; }
    .bp-head span { font-size:10px; font-weight:700; letter-spacing:.08em; color:#9a8a70; }
    .hunt-row {
      display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:14px; width:100%; padding:12px 14px;
      border-radius:14px; border:1px solid rgba(232,181,74,.28); background:linear-gradient(180deg,#24180c,#160e07);
      color:#fff; text-align:left; cursor:pointer; transition:border-color .2s, background .2s, box-shadow .2s;
    }
    .hunt-row:hover { border-color:rgba(232,181,74,.6); }
    .hr-ico { width:44px; height:44px; border-radius:12px; display:grid; place-items:center; background:#2e1f0f; border:1px solid rgba(232,181,74,.35); color:var(--gold-2); transition:all .2s; }
    .hr-ico svg { width:24px; height:24px; fill:none; stroke:currentColor; stroke-width:1.9; stroke-linecap:round; }
    .hr-txt { display:flex; flex-direction:column; gap:4px; min-width:0; }
    .hr-txt strong { font-size:14px; letter-spacing:.14em; display:flex; align-items:center; gap:8px; }
    .hr-txt em { font-style:normal; font-size:10px; letter-spacing:.1em; padding:2px 7px; border-radius:999px; background:#3a2812; color:var(--gold-2); border:1px solid rgba(232,181,74,.4); }
    .hr-txt small { font-size:11px; color:#c9b796; line-height:1.35; }
    .hr-sw { display:flex; flex-direction:column; align-items:center; gap:5px; }
    .hr-sw i { position:relative; width:50px; height:28px; border-radius:999px; background:#3a2a1a; box-shadow:inset 0 2px 5px rgba(0,0,0,.6); transition:background .2s; }
    .hr-sw i::after { content:""; position:absolute; top:4px; left:4px; width:20px; height:20px; border-radius:50%; background:linear-gradient(180deg,#e8dcc4,#a8957a); box-shadow:0 2px 4px rgba(0,0,0,.5); transition:left .22s cubic-bezier(.3,1.4,.5,1); }
    .hr-sw b { font-size:9px; letter-spacing:.18em; color:#9a8a70; }
    .hunt-row.on { border-color:rgba(80,200,120,.7); background:linear-gradient(180deg,rgba(47,191,113,.16),rgba(20,40,25,.5)); box-shadow:0 0 22px rgba(47,191,113,.18); }
    .hunt-row.on .hr-ico { color:#7ff0a8; border-color:rgba(80,200,120,.6); background:rgba(47,191,113,.15); }
    .hunt-row.on .hr-sw i { background:var(--emerald); }
    .hunt-row.on .hr-sw i::after { left:26px; background:#fff; }
    .hunt-row.on .hr-sw b { color:#7ff0a8; }
    .hunt-row:disabled, .buy-tile:disabled { opacity:.4; cursor:default; filter:grayscale(.4); }
    .bp-sep { display:flex; align-items:center; gap:10px; font-size:9.5px; font-weight:800; letter-spacing:.24em; color:#9a8a70; }
    .bp-sep::before, .bp-sep::after { content:""; flex:1; height:1px; background:linear-gradient(90deg,transparent,rgba(232,181,74,.4),transparent); }
    .bp-buys { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
    .buy-tile {
      position:relative; display:flex; flex-direction:column; align-items:center; gap:6px; padding:16px 10px 12px; overflow:hidden;
      border-radius:16px; border:1px solid rgba(232,181,74,.4); color:#fff; cursor:pointer; text-align:center;
      background:radial-gradient(90% 60% at 50% 0%, rgba(232,181,74,.16), transparent 70%), linear-gradient(180deg,#2a1c0d,#120b05);
      transition:transform .18s, border-color .2s, box-shadow .2s;
    }
    .buy-tile:not(:disabled):hover { transform:translateY(-3px); border-color:#f0d28a; box-shadow:0 10px 24px rgba(0,0,0,.5), 0 0 22px rgba(232,181,74,.25); }
    .buy-tile.super { border-color:rgba(240,110,90,.55); background:radial-gradient(90% 60% at 50% 0%, rgba(220,60,50,.28), transparent 70%), linear-gradient(180deg,#2e130d,#140805); }
    .buy-tile.super:not(:disabled):hover { border-color:#ffb08a; box-shadow:0 10px 24px rgba(0,0,0,.5), 0 0 22px rgba(230,80,60,.3); }
    .bt-badge { position:absolute; top:8px; right:8px; font-size:8.5px; font-weight:900; letter-spacing:.14em; padding:3px 7px; border-radius:999px; background:#3a2812; color:var(--gold-2); border:1px solid rgba(232,181,74,.4); }
    .super .bt-badge { background:#4a1610; color:#ffc9a8; border-color:rgba(255,140,110,.5); }
    .bt-safes { display:flex; gap:3px; margin-top:6px; color:var(--gold-2); }
    .super .bt-safes { color:#ffc08a; }
    .bt-safes svg { width:22px; height:22px; fill:rgba(232,181,74,.12); stroke:currentColor; stroke-width:1.6; stroke-linecap:round; filter:drop-shadow(0 0 4px rgba(255,190,90,.35)); }
    .buy-tile strong { font:900 14px "Rockwell","Georgia",serif; letter-spacing:.14em; margin-top:2px; }
    .buy-tile > small { font-size:10.5px; color:#c9b796; }
    .bt-price { font-size:24px; font-weight:900; color:#ffe2a0; font-variant-numeric:tabular-nums; line-height:1; margin-top:4px; text-shadow:0 0 12px rgba(255,200,90,.3); }
    .bt-x { font-size:9.5px; font-weight:800; letter-spacing:.14em; color:#9a8a70; }
    .bt-cta {
      margin-top:6px; width:100%; padding:8px 0; border-radius:10px; font:900 12px "Rockwell","Georgia",serif; letter-spacing:.26em; color:#1a0f05;
      background:linear-gradient(180deg,#f3d488,#b07a32 60%,#7a4e1e); border:1px solid #f6dc98; box-shadow:0 3px 0 #1a0f07;
    }
    .super .bt-cta { background:linear-gradient(180deg,#ff9a7a,#b5262c 60%,#6e0f14); border-color:#ffc0a0; color:#fff2cc; text-shadow:0 1px 0 #3a0508; }
""")

# ---------- CSS: autoplay card ----------
rep("    .chip.on { background:#4a3415; }\n", r"""    .chip.on { background:#4a3415; }
    .card.autocard {
      width:min(560px,92%); padding:24px; border-radius:20px; border-color:rgba(232,181,74,.5);
      background:radial-gradient(110% 60% at 50% 0%, rgba(232,181,74,.12), transparent 60%), linear-gradient(180deg,#20160b,#0c0804);
      box-shadow:0 30px 70px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,236,190,.08);
      animation:menuIn .3s cubic-bezier(.2,1.3,.4,1) both;
    }
    .ac-head { display:flex; align-items:center; gap:14px; padding-right:44px; }
    .ac-ico { width:52px; height:52px; flex-shrink:0; border-radius:50%; display:grid; place-items:center; border:2px solid #f0d28a; background:radial-gradient(circle at 35% 30%,#3a2716,#140d07); box-shadow:0 0 16px rgba(232,181,74,.3); }
    .ac-ico svg { width:24px; height:24px; fill:none; stroke:#f6dc98; stroke-width:2.2; stroke-linecap:round; stroke-linejoin:round; }
    .ac-head h2 { margin:0 0 3px; font-size:22px; letter-spacing:.26em; }
    .ac-head p { margin:0; font-size:12.5px; color:#bfae90; line-height:1.4; }
    .ac-body { display:grid; grid-template-columns:auto 1fr; gap:22px; align-items:center; margin:22px 0 18px; }
    .ac-dial {
      --p:.125; position:relative; width:132px; height:132px; border-radius:50%; display:flex; flex-direction:column; align-items:center; justify-content:center;
      background:conic-gradient(#f0d28a calc(var(--p) * 360deg), rgba(232,181,74,.14) 0);
      box-shadow:0 0 28px rgba(232,181,74,.2); transition:--p .3s;
    }
    .ac-dial::before { content:""; position:absolute; inset:7px; border-radius:50%; background:radial-gradient(circle at 40% 30%,#2c1d0e,#0e0904); box-shadow:inset 0 2px 10px rgba(0,0,0,.8); }
    .ac-dial b, .ac-dial small { position:relative; }
    .ac-dial b { font:900 44px/1 "Rockwell","Georgia",serif; color:#ffe2a0; text-shadow:0 0 16px rgba(255,200,90,.45); font-variant-numeric:tabular-nums; }
    .ac-dial small { margin-top:4px; font-size:10px; font-weight:800; letter-spacing:.22em; color:#bfa77c; }
    .ac-dial.pop b { animation:winHit .35s ease-out; }
    .ac-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin:0; }
    .ac-grid .chip {
      position:relative; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; height:62px; padding:0;
      border-radius:12px; border:1px solid rgba(232,181,74,.28); background:linear-gradient(180deg,#24180c,#130c06); color:#fff;
      transition:transform .15s, border-color .15s, background .15s, box-shadow .15s;
    }
    .ac-grid .chip b { font-size:22px; font-weight:900; line-height:1; font-variant-numeric:tabular-nums; }
    .ac-grid .chip small { font-size:8.5px; font-weight:800; letter-spacing:.16em; color:#9a8a70; }
    .ac-grid .chip:hover { border-color:rgba(232,181,74,.65); transform:translateY(-2px); background:linear-gradient(180deg,#2e1f0f,#170e07); }
    .ac-grid .chip.on { border-color:#f0d28a; background:linear-gradient(180deg,#4a3415,#22160a); box-shadow:0 0 18px rgba(232,181,74,.3), inset 0 1px 0 rgba(255,236,190,.15); }
    .ac-grid .chip.on b { color:#ffe2a0; }
    .ac-grid .chip.on small { color:#e8c078; }
    .ac-grid .chip.on::after { content:"✓"; position:absolute; top:5px; right:7px; font-size:11px; color:#f6dc98; }
    .ac-sum { display:grid; grid-template-columns:repeat(3,1fr); border-radius:14px; overflow:hidden; border:1px solid rgba(232,181,74,.3); background:#0d0804; }
    .ac-sum > div { display:flex; flex-direction:column; gap:4px; padding:12px 14px; }
    .ac-sum > div + div { border-left:1px solid rgba(232,181,74,.2); }
    .ac-sum label { font-size:9px; font-weight:800; letter-spacing:.2em; color:#9a8a70; }
    .ac-sum b { font-size:16px; font-weight:900; color:#fff; font-variant-numeric:tabular-nums; white-space:nowrap; }
    .ac-sum div:nth-child(2) b { color:#ffe2a0; }
    .ac-note { display:flex; align-items:center; gap:8px; margin:12px 2px 0; font-size:11.5px !important; color:#9a8a70 !important; }
    .ac-note::before { content:"i"; flex-shrink:0; width:16px; height:16px; border-radius:50%; display:grid; place-items:center; border:1px solid #9a8a70; font:800 10px Georgia,serif; font-style:italic; }
    .ac-actions { margin-top:18px; display:grid; grid-template-columns:auto 1fr; gap:10px; }
    .ac-actions .btn { height:50px; border-radius:12px; }
    .ac-actions .btn.ghost { padding:0 22px; border:1px solid rgba(255,255,255,.12); background:#24180d; }
    .ac-go { display:flex; align-items:center; justify-content:center; gap:10px; font-size:14px; border-radius:12px !important; }
    .ac-go::after { content:""; border-left:11px solid #1a0f05; border-top:7px solid transparent; border-bottom:7px solid transparent; }
    @media (max-width:560px) {
      .ac-body { grid-template-columns:1fr; justify-items:center; }
      .ac-grid { width:100%; }
      .ac-sum b { font-size:13px; }
      .bp-head span { display:none; }
    }
""")

# ---------- HTML: bonus popover ----------
cut('          <div class="popover bonuspop" id="bonusPop">', '        <button class="hud-auto" id="autoBtn"', f"""          <div class="popover bonuspop" id="bonusPop">
            <div class="bp-head"><h4>BONUS</h4><span>BOOST THE ODDS OR JUMP STRAIGHT IN</span></div>
            <button class="hunt-row" id="huntBtn">
              <span class="hr-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4"/></svg></span>
              <span class="hr-txt"><strong>HUNT MODE <em>BET ×3</em></strong><small id="huntDesc">Safes land 7× more often.</small></span>
              <span class="hr-sw"><i></i><b id="huntState">OFF</b></span>
            </button>
            <div class="bp-sep">BUY A FEATURE</div>
            <div class="bp-buys">
              <button class="buy-tile" id="buyBtn">
                <span class="bt-badge">LEVEL 3</span>
                <span class="bt-safes">{SAFE * 3}</span>
                <strong id="buyLabel">BUY BONUS</strong>
                <small>Start with 3 Safes</small>
                <span class="bt-price" id="buyPrice">118.00</span>
                <span class="bt-x" id="buyX">118× BET</span>
                <span class="bt-cta">BUY</span>
              </button>
              <button class="buy-tile super" id="superBtn">
                <span class="bt-badge">LEVEL 4</span>
                <span class="bt-safes">{SAFE * 4}</span>
                <strong>SUPER BONUS</strong>
                <small>Start with 4 Safes</small>
                <span class="bt-price" id="superPrice">156.00</span>
                <span class="bt-x" id="superX">156× BET</span>
                <span class="bt-cta">BUY</span>
              </button>
            </div>
          </div>
        </div>
""")

# ---------- HTML: autoplay modal ----------
cut('    <div class="modal" id="autoModal"><div class="card">', '    <div class="modal" id="infoModal">', """    <div class="modal" id="autoModal"><div class="card autocard">
      <button class="xclose" data-close="autoModal">✕</button>
      <div class="ac-head">
        <span class="ac-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12a7.5 7.5 0 0 1 12.4-5.7L18 8"/><path d="M19.5 12a7.5 7.5 0 0 1-12.4 5.7L6 16"/><path d="M14.2 8H18V4.2"/><path d="M9.8 16H6v3.8"/></svg></span>
        <div><h2>AUTOPLAY</h2><p>Spins play on their own. Press the spin button anytime to stop.</p></div>
      </div>
      <div class="ac-body">
        <div class="ac-dial" id="autoDial"><b id="autoBig">25</b><small id="autoBigLab">SPINS</small></div>
        <div class="chips ac-grid" id="autoChips"></div>
      </div>
      <div class="ac-sum">
        <div><label>PER SPIN</label><b id="autoPer">1.00</b></div>
        <div><label>TOTAL STAKE</label><b id="autoTotal">25.00</b></div>
        <div><label>STOPS</label><b id="autoStop">AFTER 25</b></div>
      </div>
      <p class="ac-note">Bonus rounds are free and never use up the count.</p>
      <div class="actions ac-actions"><button class="btn ghost" id="autoCancel">CANCEL</button><button class="btn gold ac-go" id="autoConfirm">START AUTOPLAY</button></div>
    </div></div>

""")

# ---------- JS ----------
rep("""      $("buyPrice").innerHTML = `${money(bet*M.BUY_COST)}<small>${M.BUY_COST}× BET</small>`;
      $("superPrice").innerHTML = `${money(bet*M.SUPER_COST)}<small>${M.SUPER_COST}× BET</small>`;""",
    """      $("buyPrice").textContent = money(bet*M.BUY_COST);
      $("buyX").textContent = `${M.BUY_COST}× BET`;
      $("superPrice").textContent = money(bet*M.SUPER_COST);
      $("superX").textContent = `${M.SUPER_COST}× BET`;
      $("huntState").textContent = state.hunt ? "ON" : "OFF";""")
rep("""        ? `Active · ${money(bet*M.HUNT_COST)} per spin. Tap to turn off.`
        : `Safes land ~7× more often (1 in 43 instead of 1 in 316). ${money(bet*M.HUNT_COST)} per spin.`;""",
    """        ? `Active · ${money(bet*M.HUNT_COST)} per spin. Tap to turn off.`
        : `Safes land 7× more often · ${money(bet*M.HUNT_COST)} per spin.`;""")

rep("""    function renderAutoChips() {
      $("autoChips").innerHTML = AUTO_OPTS.map((opt)=>{
        const on = state.autoChoice===opt ? " on":"";
        return `<button class="chip${on}" data-opt="${opt}">${opt==="BONUS"?"UNTIL BONUS":opt}</button>`;
      }).join("");
    }""", """    function renderAutoChips() {
      const pick = state.autoChoice;
      $("autoChips").innerHTML = AUTO_OPTS.map((opt)=>{
        const on = pick===opt ? " on":"";
        return opt==="BONUS"
          ? `<button class="chip${on}" data-opt="BONUS"><b>∞</b><small>UNTIL BONUS</small></button>`
          : `<button class="chip${on}" data-opt="${opt}"><b>${opt}</b><small>SPINS</small></button>`;
      }).join("");
      const until = pick==="BONUS", per = spinCost();
      const big = until ? "∞" : String(pick);
      const dial = $("autoDial");
      if ($("autoBig").textContent !== big) { dial.classList.remove("pop"); void dial.offsetWidth; dial.classList.add("pop"); }
      $("autoBig").textContent = big;
      $("autoBigLab").textContent = until ? "UNTIL BONUS" : "SPINS";
      dial.style.setProperty("--p", until ? 1 : Math.max(.06, pick/200));
      $("autoPer").textContent = money(per);
      $("autoTotal").textContent = until ? "NO LIMIT" : money(per*pick);
      $("autoStop").textContent = until ? "ON BONUS" : `AFTER ${pick}`;
    }""")

P.write_text(s, encoding="utf-8", newline="\n")
print("ok")
