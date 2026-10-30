from pathlib import Path

ROOT = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview")
P = ROOT / "index.html"
s = P.read_text(encoding="utf-8")


def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:90])
    s = s.replace(a, b)


rep("    .demo { position:absolute; left:10px; top:8px; display:flex;",
    "    .demo { display:none !important; position:absolute; left:10px; top:8px;")

rep('<small id="huntDesc">Safes land 7× more often.</small>', '<small id="huntDesc">Safes land ~4.7× more often.</small>')
rep('<span class="bt-price" id="buyPrice">118.00</span>', '<span class="bt-price" id="buyPrice">120.00</span>')
rep('<span class="bt-x" id="buyX">118× BET</span>', '<span class="bt-x" id="buyX">120× BET</span>')
rep('<span class="bt-price" id="superPrice">156.00</span>', '<span class="bt-price" id="superPrice">155.00</span>')
rep('<span class="bt-x" id="superX">156× BET</span>', '<span class="bt-x" id="superX">155× BET</span>')
rep("about 7× more frequent (1 in 43 instead of 1 in 316)", "about 4.7× more frequent (1 in 48 instead of 1 in 225)")
rep("Hunt 3× cost makes Safes about 7× more frequent. Buy Bonus 118× (level 3). Super Bonus 156× (level 4).",
    "Hunt 3× cost makes Safes about 4.7× more frequent. Buy Bonus 120× (level 3). Super Bonus 155× (level 4). All wins pay in steps of 0.10× bet.")
rep(": `Safes land 7× more often · ${money(bet*M.HUNT_COST)} per spin.`;",
    ": `Safes land ~4.7× more often · ${money(bet*M.HUNT_COST)} per spin.`;")

# No grey overlay while symbols explode and tumble: the whole grid stays readable.
rep("""      if (!removed.length) return;
      $("table").classList.add("revealing");
      markCells(removed, "explode");""", """      if (!removed.length) return;
      $("table").classList.remove("revealing", "winpulse");
      markCells(removed, "explode");""")

rep("    choosePack(MA.pack, false);\n", "    choosePack(\"casino\", false);\n")
P.write_text(s, encoding="utf-8", newline="\n")

B = ROOT / "bg" / "bg-manager.js"
b = B.read_text(encoding="utf-8")
old = """    const saved = localStorage.getItem(STORE);
    return KEYS.includes(saved) ? saved : "a";"""
assert b.count(old) == 1
b = b.replace(old, """    return "a";""")
B.write_text(b, encoding="utf-8", newline="\n")
print("ok")
