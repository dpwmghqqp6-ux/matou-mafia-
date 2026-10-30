import sys
from pathlib import Path

ROOT = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview")
p3, p4, gw = sys.argv[1], sys.argv[2], sys.argv[3]

J = ROOT / "math.js"
m = J.read_text(encoding="utf-8")
import re
if "LOCK_P_L4" not in m:
    m = m.replace("  const LOCK_P = 0.0278;\n", f"  const LOCK_P = {p3};\n  const LOCK_P_L4 = {p4};\n  const lockPFor = (level) => (level >= 4 ? LOCK_P_L4 : LOCK_P);\n")
    m = m.replace("function simulateVault(startLocks, level = 3, door = null, rng = Math.random, lockP = LOCK_P) {",
                  "function simulateVault(startLocks, level = 3, door = null, rng = Math.random, lockP = lockPFor(level)) {")
    m = m.replace("    VAULT_VALS, LOCK_P, CAT_PLANT_P,", "    VAULT_VALS, LOCK_P, LOCK_P_L4, lockPFor, CAT_PLANT_P,")
else:
    m = re.sub(r"const LOCK_P = [^;]+;", f"const LOCK_P = {p3};", m)
    m = re.sub(r"const LOCK_P_L4 = [^;]+;", f"const LOCK_P_L4 = {p4};", m)
m = re.sub(r"(gold:\s*\{[^}]*GW:)([0-9.]+)", rf"\g<1>{gw}", m)
assert "lockPFor(level)) {" in m
J.write_text(m, encoding="utf-8", newline="\n")

P = ROOT / "index.html"
s = P.read_text(encoding="utf-8")
if "M.lockPFor(" not in s:
    a = "          if (Math.random() < M.LOCK_P) {"
    assert s.count(a) == 1
    s = s.replace(a, "          if (Math.random() < M.lockPFor(state.bonusLevel)) {")
    P.write_text(s, encoding="utf-8", newline="\n")
print("ok", p3, p4, gw)
