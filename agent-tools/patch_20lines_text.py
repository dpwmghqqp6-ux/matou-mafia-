from pathlib import Path

P = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\index.html")
s = P.read_text(encoding="utf-8")


def rep(a, b, n=None):
    global s
    c = s.count(a)
    assert c >= 1 and (n is None or c == n), (c, a[:80])
    s = s.replace(a, b)


rep("6 reels · 5 rows · 50 paylines. Wins pay left to right from the first reel, 3 to 6 of a kind.",
    "6 reels · 5 rows · 20 paylines. Wins pay anywhere on a line: 3 to 6 matching symbols side by side, starting on any reel.", 1)
rep("Wins pay left to right on these paths.", "Wins pay anywhere along these paths (3+ side by side).", 1)
rep("50 PAYLINES", "20 PAYLINES", 1)
rep("50 LINES", "20 LINES")
rep("1 in 222", "1 in 221", 1)
P.write_text(s, encoding="utf-8", newline="\n")
print("ok, remaining '50 LINES':", s.count("50 LINES"))
