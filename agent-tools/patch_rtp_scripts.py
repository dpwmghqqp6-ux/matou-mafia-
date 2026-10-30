from pathlib import Path

for name in ("verify_rtp.js", "tune_rtp.js", "sim_bonus.js"):
    p = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\agent-tools") / name
    s = p.read_text(encoding="utf-8")
    s2 = s
    # Replace evalBoard path with cascade
    s2 = s2.replace(
        "    const res = M.evalBoard(b);\n    ret += res.payout;\n    if (res.scatters >= 3) {\n      const level = M.bonusLevel(res.scatters);\n      const kind = r() < 0.5 ? \"heist\" : \"gold\";\n      const door = M.pickDoorFx(kind, r);\n      const pot = (kind === \"gold\" ? M.simulateGoldRush(level, door, r) : M.simulateVault(res.scatters, level, door, r)).pot;\n      ret += Math.min(M.MAX_WIN - res.payout, pot);",
        "    const play = M.cascade(b, mode === \"hunt\" ? \"hunt\" : \"base\", r);\n    ret += play.payout;\n    if (play.scatters >= 3) {\n      const level = M.bonusLevel(play.scatters);\n      const kind = r() < 0.5 ? \"heist\" : \"gold\";\n      const door = M.pickDoorFx(kind, r);\n      const pot = (kind === \"gold\" ? M.simulateGoldRush(level, door, r) : M.simulateVault(play.scatters, level, door, r)).pot;\n      ret += Math.min(M.MAX_WIN - play.payout, pot);",
    )
    s2 = s2.replace(
        "    const board = M.randomBoard(mode, rng);\n    const result = M.evalBoard(board);\n    returned += result.payout;\n    if (result.scatters >= 3) {\n      const level = M.bonusLevel(result.scatters);\n      const kind = rng() < 0.5 ? \"heist\" : \"gold\";\n      const door = M.pickDoorFx(kind, rng);\n      const pot = kind === \"gold\"\n        ? M.simulateGoldRush(level, door, rng).pot\n        : M.simulateVault(result.scatters, level, door, rng).pot;\n      returned += Math.min(M.MAX_WIN - result.payout, pot);",
        "    const board = M.randomBoard(mode, rng);\n    const play = M.cascade(board, mode === \"hunt\" ? \"hunt\" : \"base\", rng);\n    returned += play.payout;\n    if (play.scatters >= 3) {\n      const level = M.bonusLevel(play.scatters);\n      const kind = rng() < 0.5 ? \"heist\" : \"gold\";\n      const door = M.pickDoorFx(kind, rng);\n      const pot = kind === \"gold\"\n        ? M.simulateGoldRush(level, door, rng).pot\n        : M.simulateVault(play.scatters, level, door, rng).pot;\n      returned += Math.min(M.MAX_WIN - play.payout, pot);",
    )
    # Also tune_rtp's similar block with res variable
    s2 = s2.replace(
        "    const b = M.randomBoard(mode, r);\n    const res = M.evalBoard(b);\n    ret += res.payout;\n    if (res.scatters >= 3) {\n      const level = M.bonusLevel(res.scatters);\n      const kind = r() < 0.5 ? \"heist\" : \"gold\";\n      const door = M.pickDoorFx(kind, r);\n      const pot = kind === \"gold\"\n        ? M.simulateGoldRush(level, door, r).pot\n        : M.simulateVault(res.scatters, level, door, r).pot;\n      ret += Math.min(M.MAX_WIN - res.payout, pot);",
        "    const b = M.randomBoard(mode, r);\n    const play = M.cascade(b, mode === \"hunt\" ? \"hunt\" : \"base\", r);\n    ret += play.payout;\n    if (play.scatters >= 3) {\n      const level = M.bonusLevel(play.scatters);\n      const kind = r() < 0.5 ? \"heist\" : \"gold\";\n      const door = M.pickDoorFx(kind, r);\n      const pot = kind === \"gold\"\n        ? M.simulateGoldRush(level, door, r).pot\n        : M.simulateVault(play.scatters, level, door, r).pot;\n      ret += Math.min(M.MAX_WIN - play.payout, pot);",
    )
    if "PAY_SCALE" not in s2 and "loadMath" in s2:
        s2 = s2.replace(
            "  if (o.LOCK_P != null)",
            "  if (o.PAY_SCALE != null) src = src.replace(/const PAY_SCALE = [^;]+;/, `const PAY_SCALE = ${o.PAY_SCALE};`);\n  if (o.LOCK_P != null)",
        )
    if s2 != s:
        p.write_text(s2, encoding="utf-8", newline="\n")
        print("updated", name)
    else:
        print("no change", name)
