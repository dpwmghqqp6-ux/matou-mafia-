import re
import sys
from pathlib import Path

P = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\math.js")
s = P.read_text(encoding="utf-8")
vals = dict(a.split("=") for a in sys.argv[1:])
if "PAY_SCALE" in vals:
    s = re.sub(r"const PAY_SCALE = [^;]+;", f"const PAY_SCALE = {vals['PAY_SCALE']};", s)
if "LOCK_P" in vals:
    s = re.sub(r"const LOCK_P = [^;]+;", f"const LOCK_P = {vals['LOCK_P']};", s)
if "S_BASE" in vals:
    s = re.sub(r"(base:\s*\{[^}]*S:)([0-9.]+)", rf"\g<1>{vals['S_BASE']}", s)
if "S_HUNT" in vals:
    s = re.sub(r"(hunt:\s*\{[^}]*S:)([0-9.]+)", rf"\g<1>{vals['S_HUNT']}", s)
if "GW" in vals:
    s = re.sub(r"(gold:\s*\{[^}]*GW:)([0-9.]+)", rf"\g<1>{vals['GW']}", s)
P.write_text(s, encoding="utf-8", newline="\n")
print("applied", vals)
