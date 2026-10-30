from pathlib import Path

P = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\index.html")
s = P.read_text(encoding="utf-8")


def rep(a, b):
    global s
    assert s.count(a) == 1, a
    s = s.replace(a, b)


rep("""    .glass::before {
      content:""; position:absolute; inset:-20% -40%;
      background:linear-gradient(105deg, transparent 40%, rgba(255,240,200,.14) 48%, rgba(255,255,255,.22) 50%, rgba(255,240,200,.1) 52%, transparent 60%);
      animation:glassSweep 9s ease-in-out infinite;
    }
    @keyframes glassSweep { 0%,70%,100%{transform:translateX(-30%)} 85%{transform:translateX(40%)} }
""", "")
rep(".neon, .glass::before { animation:none !important; }", ".neon { animation:none !important; }")

rep("""      for (let i=0;i<extras;i++) seq.push(nearSafe && i===extras-1 ? "S" : M.filler());
      seq.push(...col);""", """      seq.push(M.filler(), ...col);
      for (let i=0;i<extras;i++) seq.push(nearSafe && i===0 ? "S" : M.filler());""")
rep("""      strip.style.transition = "none";
      strip.style.transform = "translateY(0)";
      strip.classList.toggle("blur", blur);""", """      strip.style.transition = "none";
      strip.style.transform = `translateY(${-(extras + 1) * h}px)`;""")
rep("""      const target = -extras * h;
      const overshoot = target - h * 0.14;""", """      const target = -h;
      const overshoot = target + h * 0.14;""")
rep("""      strip.classList.remove("blur");
""", "")
rep("function paintReel(c, col, extras=0, {blur=false, nearSafe=false}={}) {", "function paintReel(c, col, extras=0, {nearSafe=false}={}) {")
rep("paintReel(c, col, extras, {blur:true, nearSafe: tease && c===COLS-1})", "paintReel(c, col, extras, {nearSafe: tease && c===COLS-1})")

P.write_text(s, encoding="utf-8", newline="\n")
print("ok")
