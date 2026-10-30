from pathlib import Path
import re

P = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\index.html")
s = P.read_text(encoding="utf-8")


def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a)
    s = s.replace(a, b)


# 1. No cat entering the chosen door
s = re.sub(r"    \.door-enter \{.*?\n    \}\n    \.door-pick\.entering \.door-enter \{[^\n]*\n    @keyframes dpCatIn \{.*?\n    \}\n", "", s, count=1, flags=re.S)
rep('          <img class="door-enter" id="doorEnter" src="./assets/matou/cat.png" alt="">\n', "")
rep("""            await wait(tempoPick(1000,420));
            const enter=$("doorEnter");
            enter.style.setProperty("--ex", sx);
            enter.style.setProperty("--ey", sy);
            root.classList.add("entering");
            sfx("bonus");
            await wait(tempoPick(1000,520));
""", """            sfx("bonus");
            await wait(tempoPick(1600,700));
""")

# 2. No blur while spinning
rep("    .strip.blur img { filter:blur(5px) brightness(1.1) sepia(.3); }\n", "")
rep("    .vcell.spinning img { display:block; opacity:.65; filter:blur(4px); }\n",
    "    .vcell.spinning .vstrip { position:absolute; inset:0; height:400%; display:flex; flex-direction:column; animation:vroll var(--vr,.3s) linear infinite; }\n"
    "    .vcell.spinning .vstrip img { flex:0 0 25%; width:100%; height:25%; padding:8%; box-sizing:border-box; object-fit:cover; border-radius:12px; opacity:1; filter:none; }\n"
    "    @keyframes vroll { from { transform:translateY(-75%); } to { transform:translateY(0); } }\n")

# 3. No mirror sweep on winning cells
rep("      background:linear-gradient(115deg, transparent 35%, rgba(255,250,225,.55) 48%, transparent 60%) no-repeat -160% 0/250% 100%;\n", "")
rep("animation:litIn .38s cubic-bezier(.2,1.8,.4,1) both, litShine 1.1s .3s ease-in-out infinite, litPulse .9s .38s ease-in-out infinite alternate;",
    "animation:litIn .38s cubic-bezier(.2,1.8,.4,1) both, litPulse .9s .38s ease-in-out infinite alternate;")
rep("animation-name:litIn, litShine, litPulseRed;", "animation-name:litIn, litPulseRed;")
rep("    @keyframes litShine { 0% { background-position:-160% 0; } 60%,100% { background-position:260% 0; } }\n", "")

# 4. Normal speed a bit slower (reels + bonus pacing)
rep("let dur = (state.fast||state.skip ? 0.34 : 0.5 + i * 0.16);", "let dur = (state.fast||state.skip ? 0.34 : 0.85 + i * 0.2);")
rep("const extras = state.fast||state.skip ? 8 : 16;", "const extras = state.fast||state.skip ? 8 : 20;")
rep("strip.style.transition = `transform ${dur}s cubic-bezier(.12,.7,.14,1)`;", "strip.style.transition = `transform ${dur}s cubic-bezier(.3,.08,.35,1)`;")

rep("""      const cycles = state.fast||state.skip ? 6 : 11;
      for (let i=0;i<cycles;i++) {
        empty.forEach(([c,r]) => {
          const img=vaultEl(c,r).querySelector("img");
          if (img) img.src = src(M.filler());
        });
        await wait(tempo(48,28));
      }
      let any=false;
      empty.forEach(([c,r]) => {
        if (Math.random() < M.LOCK_P) {
          state.vault[c][r] = {locked:true, value:vaultVal()};
          paintVaultCell(c,r,true); any=true; sfx("lock");
        } else {
          state.vault[c][r] = {locked:false, value:0};
          paintVaultCell(c,r);
        }
      });
      return any;""", """      empty.forEach(([c,r]) => {
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
          if (Math.random() < M.LOCK_P) {
            state.vault[cc][r] = {locked:true, value:vaultVal()};
            paintVaultCell(cc,r,true); any=true; sfx("lock");
          } else {
            state.vault[cc][r] = {locked:false, value:0};
            paintVaultCell(cc,r,true);
          }
        });
        sfx("slam", c);
      }
      return any;""")

rep("""        hud();
        await wait(tempo(220,90));
        const landed = await vaultRespin();""", """        hud();
        await wait(tempo(380,90));
        const landed = await vaultRespin();""")
rep("""        hud();
        await wait(tempo(280,120));
      }
      if (lockedCount()===CELLS) {""", """        hud();
        await wait(tempo(520,120));
      }
      if (lockedCount()===CELLS) {""")
rep("""        sfx("lock");
        hud();
        await wait(tempo(220,90));
      }
      if (state.potMult > 1) {""", """        sfx("lock");
        hud();
        await wait(tempo(340,90));
      }
      if (state.potMult > 1) {""")
rep("        await wait(tempo(160,70));\n      }\n      await wait(tempo(500,200));", "        await wait(tempo(260,70));\n      }\n      await wait(tempo(800,200));")
rep("      await wipeOpen();\n      await wait(tempo(280,120));\n      if (door.startLocks) {\n        addLocks(door.startLocks);\n        sfx(\"lock\");\n        await wait(tempo(400,180));",
    "      await wipeOpen();\n      await wait(tempo(450,120));\n      if (door.startLocks) {\n        addLocks(door.startLocks);\n        sfx(\"lock\");\n        await wait(tempo(650,180));")
rep("      paintGoldMarks();\n      await wait(tempo(300,120));\n      while (state.goldSpinsLeft > 0) {", "      paintGoldMarks();\n      await wait(tempo(500,120));\n      while (state.goldSpinsLeft > 0) {")
rep("        clearWins();\n        await wait(tempo(220,90));\n      }\n      const cap", "        clearWins();\n        await wait(tempo(450,90));\n      }\n      const cap")

assert "doorEnter" not in s and "door-enter" not in s and "litShine" not in s
P.write_text(s, encoding="utf-8", newline="\n")

F = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\bg\frame-webgl.js")
f = F.read_text(encoding="utf-8")
f2 = re.sub(r"shine: 0\.\d+", "shine: 0", f)
assert f2.count("shine: 0,") == 3, f2.count("shine: 0,")
F.write_text(f2, encoding="utf-8", newline="\n")
print("ok")
