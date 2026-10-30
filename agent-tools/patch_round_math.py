from pathlib import Path

P = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\math.js")
s = P.read_text(encoding="utf-8")


def rep(a, b):
    global s
    assert s.count(a) == 1, a[:80]
    s = s.replace(a, b)


rep("BUY_COST = 118, HUNT_COST = 3;", "BUY_COST = 120, HUNT_COST = 3;")
rep("const SUPER_COST = 156;", "const SUPER_COST = 155;")
rep("const PAY = Object.fromEntries(Object.entries(PAY_RAW).map(([k, a]) => [k, a.map((v) => +(v * PAY_SCALE).toFixed(4))]));",
    "const roundPay = (v) => (v > 0 ? Math.max(1, Math.round(v * 10)) / 10 : 0);\n"
    "  const PAY = Object.fromEntries(Object.entries(PAY_RAW).map(([k, a]) => [k, a.map((v) => roundPay(v * PAY_SCALE))]));")
rep("    const span = tier.max - tier.min;\n    const value = +(tier.min + rng() * span).toFixed(2);",
    "    const span = tier.max - tier.min;\n    const value = Math.min(tier.max, tier.min + Math.floor(rng() * (span + 1)));")
P.write_text(s, encoding="utf-8", newline="\n")
print("ok")
