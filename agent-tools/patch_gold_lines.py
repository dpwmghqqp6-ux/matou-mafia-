from pathlib import Path

ROOT = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview")

# ---------- math.js: smooth paylines (no 2-row jumps) ----------
J = ROOT / "math.js"
m = J.read_text(encoding="utf-8")
old = "    [0,2,4,4,2,0],[4,2,0,0,2,4],[1,3,1,3,1,3],[3,1,3,1,3,1],[2,1,1,1,1,2],"
assert m.count(old) == 1
m = m.replace(old, "    [1,1,1,2,3,3],[3,3,3,2,1,1],[0,1,1,2,2,2],[4,3,3,2,2,2],[2,1,1,1,1,2],")
J.write_text(m, encoding="utf-8", newline="\n")

P = ROOT / "index.html"
s = P.read_text(encoding="utf-8")


def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:90])
    s = s.replace(a, b)


# ---------- CSS ----------
rep("    .win-svg .pl path { fill:none; stroke-linecap:round; stroke-linejoin:round; }",
    """    .win-svg .pl path { fill:none; stroke-linecap:round; stroke-linejoin:round; }
    .win-svg .pl path.pl-path-bg { stroke:rgba(36,16,4,.85); stroke-width:11; stroke-dasharray:var(--len); stroke-dashoffset:var(--len); animation:plDraw var(--dur,.4s) ease-out forwards; }
    .win-svg .pl path.pl-path { stroke:#ffd27a; stroke-width:5; filter:drop-shadow(0 0 8px rgba(255,190,80,.95)); stroke-dasharray:var(--len); stroke-dashoffset:var(--len); animation:plDraw var(--dur,.4s) ease-out forwards; }
    @keyframes plDraw { to { stroke-dashoffset:0; } }""")

rep("""    .cell.gold {
      background:linear-gradient(160deg,#ffe2a0 0%,#e8b54a 35%,#a87428 100%);
      border-radius:8px;
      box-shadow:inset 0 0 0 2px rgba(255,240,200,.9), 0 0 16px rgba(232,181,74,.55);
    }
    .cell.gold img {
      filter:none; outline:none;
      width:76%; height:76%;
      box-shadow:0 2px 6px rgba(0,0,0,.35);
    }
    .cell.ingot { filter:none; }
    .cell.ingot img { outline:2px solid #ffe2a0; box-shadow:0 0 18px rgba(255,210,110,.7); }
""", """    .gold-layer { position:absolute; inset:0; display:grid; grid-template-columns:repeat(6,1fr); grid-template-rows:repeat(5,1fr); gap:0 6px; padding:8px; pointer-events:none; z-index:4; }
    .table.vault:not(.goldmode) .gold-layer { display:none; }
    .gslot { position:relative; display:grid; place-items:center; }
    .gslot::before {
      content:""; position:absolute; inset:4%; border-radius:10px; opacity:0; transform:scale(.6);
      border:3px solid #ffd77e;
      background:radial-gradient(circle at 50% 50%, transparent 52%, rgba(255,196,80,.32) 100%), linear-gradient(160deg, rgba(255,236,170,.22), rgba(168,116,40,.18));
      box-shadow:0 0 0 2px rgba(60,32,6,.85), 0 0 18px 3px rgba(255,190,80,.7), inset 0 0 16px rgba(255,214,130,.6);
      transition:opacity .25s, transform .35s cubic-bezier(.2,1.6,.4,1);
    }
    .gslot.on::before { opacity:1; transform:scale(1); animation:goldGlow 1.6s ease-in-out infinite alternate; }
    .gslot.on::after {
      content:""; position:absolute; inset:4%; border-radius:10px; pointer-events:none; overflow:hidden;
      background:linear-gradient(115deg, transparent 40%, rgba(255,250,220,.55) 50%, transparent 60%) no-repeat;
      background-size:250% 100%; animation:goldSheen 2.8s ease-in-out infinite;
      -webkit-mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite:xor; mask-composite:exclude; padding:3px;
    }
    @keyframes goldGlow { to { box-shadow:0 0 0 2px rgba(60,32,6,.85), 0 0 28px 7px rgba(255,200,90,.9), inset 0 0 22px rgba(255,224,150,.75); } }
    @keyframes goldSheen { 0% { background-position:150% 0; } 60%,100% { background-position:-50% 0; } }
    .gslot .gtile {
      position:absolute; inset:4%; border-radius:10px; display:grid; place-items:center; overflow:hidden;
      background:radial-gradient(circle at 50% 35%, #fff0c0, #e8b54a 55%, #8a5a1c);
      box-shadow:inset 0 0 0 2px rgba(255,244,210,.95), 0 0 22px rgba(255,200,90,.85);
      animation:gFlip .45s cubic-bezier(.3,1.5,.5,1) both;
    }
    .gslot .gtile img { width:78%; height:78%; object-fit:contain; filter:drop-shadow(0 3px 4px rgba(60,30,0,.55)); }
    .gslot .gtile .ival {
      position:absolute; left:50%; bottom:7%; transform:translateX(-50%) scale(0); padding:2px 8px; border-radius:999px;
      background:linear-gradient(180deg,#3a1f06,#1c0e02); border:1.5px solid #ffe2a0; color:#ffe9b0;
      font:900 clamp(11px,1.3vw,17px)/1.1 "Rockwell","Georgia",serif; white-space:nowrap; box-shadow:0 0 12px rgba(255,200,90,.7);
    }
    .gslot .gtile.shown .ival { animation:ivalPop .45s cubic-bezier(.2,1.9,.4,1) forwards; }
    .gslot .gtile.shown { animation:gHit .45s ease-out; }
    @keyframes gFlip { from { transform:rotateY(90deg) scale(.8); filter:brightness(2); } to { transform:none; filter:none; } }
    @keyframes ivalPop { to { transform:translateX(-50%) scale(1); } }
    @keyframes gHit { 40% { transform:scale(1.14); filter:brightness(1.5); } }
""")

# ---------- HTML ----------
rep('      <div class="reels" id="reels"></div>\n',
    '      <div class="reels" id="reels"></div>\n      <div class="gold-layer" id="goldLayer"></div>\n')

# ---------- JS: payline path ----------
rep("""      const cellR=(cellEl(...cells[0])?.getBoundingClientRect().height||80)*0.5;
      cells.forEach(([c,r],i)=>setTimeout(()=>{""", """      const cellR=(cellEl(...cells[0])?.getBoundingClientRect().height||80)*0.5;
      if (!red && pts.length>1) {
        const d=pts.map((p,i)=>`${i?"L":"M"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
        let len=0; for (let i=1;i<pts.length;i++) len+=Math.hypot(pts[i].x-pts[i-1].x, pts[i].y-pts[i-1].y);
        const dur=`${(gap*(cells.length-1)/1000+0.12).toFixed(2)}s`;
        for (const cls of ["pl-path-bg","pl-path"]) {
          const p=sv("path",{d, class:cls},g);
          p.style.setProperty("--len", len.toFixed(1)); p.style.setProperty("--dur", dur);
        }
      }
      cells.forEach(([c,r],i)=>setTimeout(()=>{""")

# ---------- JS: gold layer ----------
rep("""    function paintGoldMarks() {
      for (let c=0;c<COLS;c++) for (let r=0;r<ROWS;r++) {
        const el=cellEl(c,r); if(!el) continue;
        el.classList.toggle("gold", !!(state.gold && state.gold[c][r]));
        el.classList.remove("ingot");
        const old=el.querySelector(".ival"); if (old) old.remove();
      }
    }""", """    function goldSlot(c,r) {
      const layer=$("goldLayer");
      if (layer.children.length!==COLS*ROWS) {
        layer.innerHTML="";
        for (let rr=0;rr<ROWS;rr++) for (let cc=0;cc<COLS;cc++) {
          const d=document.createElement("div"); d.className="gslot"; d.dataset.c=cc; d.dataset.r=rr; layer.appendChild(d);
        }
      }
      return layer.children[r*COLS+c];
    }
    function paintGoldMarks() {
      for (let c=0;c<COLS;c++) for (let r=0;r<ROWS;r++) {
        const el=goldSlot(c,r);
        el.classList.toggle("on", !!(state.gold && state.gold[c][r]));
        el.innerHTML="";
      }
    }
    function clearGoldLayer() { $("goldLayer").innerHTML=""; }""")

rep("""    async function ingotBurst(persist) {
      const cells=[];
      for (let c=0;c<COLS;c++) for (let r=0;r<ROWS;r++) if (state.gold[c][r]) cells.push([c,r]);
      if (!cells.length) return 0;
      let sum=0;
      sfx("bonus");
      for (const [c,r] of cells) {
        const roll=M.rollIngot();
        sum += roll.value;
        const el=cellEl(c,r); if(!el) continue;
        el.classList.remove("gold");
        el.classList.add("ingot");
        el.innerHTML = `<img src="${src(roll.id)}" alt="${roll.id}"><i class="ival">${roll.value}×</i>`;
        state.bonusWin = +((state.bonusWin || 0) + roll.value * baseBet()).toFixed(2);
        hud();
        await wait(tempo(260,70));
      }
      await wait(tempo(800,200));
      if (!persist) {
        state.gold = emptyGold();
        paint(state.board,0);
      } else {
        paint(state.board,0);
        paintGoldMarks();
      }
      return sum;
    }""", """    async function ingotBurst(persist) {
      const cells=[];
      for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) if (state.gold[c][r]) cells.push([c,r]);
      if (!cells.length) return 0;
      const rolls=cells.map(()=>M.rollIngot());
      const tiles=[];
      sfx("bonus");
      for (const [i,[c,r]] of cells.entries()) {
        const slot=goldSlot(c,r);
        slot.innerHTML=`<div class="gtile"><img src="${src(rolls[i].id)}" alt="${rolls[i].id}"><i class="ival">${rolls[i].value}×</i></div>`;
        tiles.push(slot.firstElementChild);
        await wait(tempo(45,15));
      }
      await wait(tempo(900,300));
      let sum=0;
      for (const [i,tile] of tiles.entries()) {
        tile.classList.add("shown");
        sum += rolls[i].value;
        state.bonusWin = +((state.bonusWin || 0) + rolls[i].value * baseBet()).toFixed(2);
        sfx("coin");
        hud();
        await wait(tempo(rolls[i].value>=25 ? 620 : 380, 110));
      }
      await wait(tempo(1100,300));
      if (!persist) state.gold = emptyGold();
      paintGoldMarks();
      return sum;
    }""")

# goldmode flag on table + cleanup on exit
rep("""      state.inGold = true;
      state.bonusLevel = level;
      state.bonusWin = 0;
      state.gold = emptyGold();""", """      state.inGold = true;
      state.bonusLevel = level;
      state.bonusWin = 0;
      state.gold = emptyGold();
      $("table").classList.add("goldmode");""")
rep("""      state.inGold = false; state.gold=null; state.goldSpinsLeft=0; state.bonusWin=0;
      $("stage").classList.remove("vault");""", """      state.inGold = false; state.gold=null; state.goldSpinsLeft=0; state.bonusWin=0;
      $("table").classList.remove("goldmode");
      clearGoldLayer();
      $("stage").classList.remove("vault");""")

# Bonus always plays at normal speed
rep("""    async function startBonus(level, startCells) {
      const kind = await chooseBonus(level);""", """    async function startBonus(level, startCells) {
      state.fast = false; state.skip = false;
      $("skipBox").checked = false;
      hud();
      const kind = await chooseBonus(level);""")

P.write_text(s, encoding="utf-8", newline="\n")
print("ok")
