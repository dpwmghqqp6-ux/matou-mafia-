import re
from pathlib import Path

J = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\math.js")
m = J.read_text(encoding="utf-8")

a = m.index("  const LINES = [")
b = m.index("  ];", a) + len("  ];")
m = m[:a] + """  const LINES = [
    [2,2,2,2,2,2],[1,1,1,1,1,1],[3,3,3,3,3,3],[0,0,0,0,0,0],[4,4,4,4,4,4],
    [0,1,2,2,1,0],[4,3,2,2,3,4],[1,2,3,3,2,1],[3,2,1,1,2,3],[0,1,1,1,1,0],
    [4,3,3,3,3,4],[1,0,0,0,0,1],[3,4,4,4,4,3],[2,1,0,0,1,2],[2,3,4,4,3,2],
    [0,0,1,1,0,0],[4,4,3,3,4,4],[1,1,2,2,1,1],[3,3,2,2,3,3],[2,2,1,1,2,2]
  ];""" + m[b:]

m = re.sub(r"base: \{[^}]*S:([0-9.]+) \}", lambda mm: f"base: {{ L4:13, L3:13, L2:13, L1:13, H4:12, H3:12, H2:11, H1:11, W:1.2, S:{mm.group(1)} }}", m)
m = re.sub(r"hunt: \{[^}]*S:([0-9.]+) \}", lambda mm: f"hunt: {{ L4:13, L3:13, L2:13, L1:13, H4:12, H3:12, H2:11, H1:11, W:1.2, S:{mm.group(1)} }}", m)
m = re.sub(r"gold: \{[^}]*GW:([0-9.]+) \}", lambda mm: f"gold: {{ L4:13, L3:13, L2:13, L1:13, H4:12, H3:12, H2:11, H1:11, W:1.0, GW:{mm.group(1)} }}", m)
J.write_text(m, encoding="utf-8", newline="\n")
print(re.findall(r"(base|hunt|gold): \{[^}]*\}", m))
print("lines", m[m.index("const LINES"):m.index("];", m.index("const LINES"))].count("["), "(includes outer bracket)")
