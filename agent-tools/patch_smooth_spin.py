from pathlib import Path

P = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\index.html")
s = P.read_text(encoding="utf-8")


def rep(a, b):
    global s
    assert s.count(a) == 1, (s.count(a), a[:90])
    s = s.replace(a, b)


# ---------- Base / Gold Rush reels: one smooth deceleration, no overshoot, no bump ----------
rep("""      const target = -h;
      const overshoot = target + h * 0.14;
      await raf();
      strip.style.transition = `transform ${dur}s cubic-bezier(.3,.08,.35,1)`;
      strip.style.transform = `translateY(${overshoot}px)`;
      await wait(dur*1000);
      strip.style.transition = `transform .14s cubic-bezier(.2,1.55,.3,1)`;
      strip.style.transform = `translateY(${target}px)`;
      await wait(140);
      paintReel(i, col, 0);
      slam(reel);""", """      const target = -h;
      await raf();
      strip.style.transition = `transform ${dur}s cubic-bezier(.45,.05,.2,1)`;
      strip.style.transform = `translateY(${target}px)`;
      await wait(dur*1000 + 30);
      paintReel(i, col, 0);""")
rep("    .strip { position:absolute; left:0; right:0; top:0; }",
    "    .strip { position:absolute; left:0; right:0; top:0; will-change:transform; backface-visibility:hidden; }")

# ---------- Heist respins: readable rolling, column-by-column slow-down, sacks visible as they land ----------
rep("""    .vcell.empty img { display:none; }
    .vcell.spinning .vstrip { position:absolute; inset:0; height:400%; display:flex; flex-direction:column; animation:vroll var(--vr,.3s) linear infinite; }
    .vcell.spinning .vstrip img { flex:0 0 25%; width:100%; height:25%; padding:8%; box-sizing:border-box; object-fit:cover; border-radius:12px; opacity:1; filter:none; }""",
    """    .vcell.empty img { opacity:.2; filter:grayscale(.7) brightness(.8); }
    .vcell.spinning { background:linear-gradient(180deg,#183024,#0b1610); }
    .vcell.spinning .vstrip { position:absolute; inset:0; height:400%; display:flex; flex-direction:column; animation:vroll var(--vr,.62s) linear infinite; will-change:transform; }
    .vcell.spinning.slowing .vstrip { animation-duration:1.15s; }
    .vcell.spinning .vstrip img { flex:0 0 25%; width:100%; height:25%; padding:8%; box-sizing:border-box; object-fit:cover; border-radius:12px; opacity:.9; filter:none; }
    .vcell.spinning::after { content:""; position:absolute; inset:0; pointer-events:none; background:linear-gradient(180deg,rgba(7,14,10,.55),transparent 22%,transparent 78%,rgba(7,14,10,.55)); }
    .vcell.landed-sack { animation:sackLand .55s cubic-bezier(.2,1.5,.35,1); }
    .vcell.landed-sack::before { content:""; position:absolute; inset:-30%; pointer-events:none; background:radial-gradient(circle, rgba(255,214,120,.75), transparent 60%); animation:sackFlash .6s ease-out forwards; }
    @keyframes sackLand { 0% { transform:translateY(-18%) scale(.8); filter:brightness(2); } 60% { transform:translateY(2%) scale(1.06); } 100% { transform:none; filter:none; } }
    @keyframes sackFlash { from { opacity:1; transform:scale(.6); } to { opacity:0; transform:scale(1.3); } }""")

rep("""      if (!cell.locked) { el.innerHTML = `<img src="${src("L4")}" alt="">`; return; }""",
    """      if (!cell.locked) { el.innerHTML = `<img src="${src(cell.face || "L4")}" alt="">`; return; }""")

rep("""      empty.forEach(([c,r]) => {
        const a=src(M.filler()), b=src(M.filler()), d=src(M.filler());
        vaultEl(c,r).innerHTML = `<div class="vstrip"><img src="${a}" alt=""><img src="${b}" alt=""><img src="${d}" alt=""><img src="${a}" alt=""></div>`;
      });
      let any=false;
      const base=tempo(700,300), step=tempo(170,60);
      for (let c=0;c<COLS;c++) {
        const col=empty.filter(([cc])=>cc===c);
        if (!col.length) continue;
        await wait(c===0 ? base : step);
        col.forEach(([cc,r]) => {
          if (Math.random() < M.lockPFor(state.bonusLevel)) {
            state.vault[cc][r] = {locked:true, value:vaultVal()};
            paintVaultCell(cc,r,true); any=true; sfx("lock");
          } else {
            state.vault[cc][r] = {locked:false, value:0};
            paintVaultCell(cc,r,true);
          }
        });
        sfx("slam", c);
      }
      return any;""", """      empty.forEach(([c,r]) => {
        const a=src(Math.random()<0.3?"H2":M.filler()), b=src(M.filler()), d=src(Math.random()<0.3?"H2":M.filler());
        const el=vaultEl(c,r);
        el.style.setProperty("--vr", `${(0.55 + Math.random()*0.14).toFixed(2)}s`);
        el.innerHTML = `<div class="vstrip" style="animation-delay:-${(Math.random()*0.6).toFixed(2)}s"><img src="${a}" alt=""><img src="${b}" alt=""><img src="${d}" alt=""><img src="${a}" alt=""></div>`;
      });
      let any=false;
      const base=tempo(1150,420), step=tempo(330,110), slow=tempo(260,90);
      for (let c=0;c<COLS;c++) {
        const col=empty.filter(([cc])=>cc===c);
        if (!col.length) continue;
        await wait(c===0 ? base : step);
        col.forEach(([cc,r]) => vaultEl(cc,r)?.classList.add("slowing"));
        await wait(slow);
        let sacks=0;
        col.forEach(([cc,r]) => {
          if (Math.random() < M.lockPFor(state.bonusLevel)) {
            state.vault[cc][r] = {locked:true, value:vaultVal()};
            paintVaultCell(cc,r,false);
            vaultEl(cc,r)?.classList.add("landed-sack");
            any=true; sacks++;
          } else {
            state.vault[cc][r] = {locked:false, value:0, face:M.filler()};
            paintVaultCell(cc,r,false);
          }
        });
        if (sacks) { sfx("lock"); const t=$("table"); t.classList.add("winpulse"); setTimeout(()=>t.classList.remove("winpulse"), 460); }
        sfx("slam", c);
      }
      return any;""")

P.write_text(s, encoding="utf-8", newline="\n")
print("ok")
