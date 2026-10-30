import re
from pathlib import Path

p = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\math.js")
s = p.read_text(encoding="utf-8")
s = re.sub(r"const PAY_SCALE = [^;]+;", "const PAY_SCALE = 0.442;", s, count=1)
s = re.sub(r"const BUY_COST = [^;]+;", "const BUY_COST = 118;", s, count=1)
s = re.sub(r"const SUPER_COST = [^;]+;", "const SUPER_COST = 156;", s, count=1)
s = re.sub(r"(hunt:\s*\{[^}]*S:)([0-9.]+)", r"\g<1>1.90", s, count=1)
p.write_text(s, encoding="utf-8", newline="\n")
print("ok")
