from pathlib import Path

P = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\math.js")
s = P.read_text(encoding="utf-8")

# Global pay scale factor (placeholder; tune_rtp will set final value)
if "PAY_SCALE" not in s:
    s = s.replace(
        "const PAY = {",
        "const PAY_SCALE = 1;\n  const PAY_RAW = {",
        1,
    )
    # Close PAY_RAW and build PAY
    s = s.replace(
        '    W:[0,0,0,1.5,5,15,40], GW:[0,0,0,1.5,5,15,40]\n  };',
        '    W:[0,0,0,1.5,5,15,40], GW:[0,0,0,1.5,5,15,40]\n  };\n'
        "  const PAY = Object.fromEntries(Object.entries(PAY_RAW).map(([k, a]) => [k, a.map((v) => +(v * PAY_SCALE).toFixed(4))]));",
        1,
    )

CASCADE = r'''
  function cloneBoard(board) {
    return board.map((col) => col.slice());
  }

  function removedCells(result) {
    const seen = new Set(), out = [];
    for (const w of result.wins) {
      for (const [c, r] of w.cells) {
        const key = c + "," + r;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push([c, r]);
      }
    }
    return out;
  }

  function tumbleBoard(board, removed, mode, rng) {
    const bag = BAGS[mode] || BAGS.base;
    const noS = NO_S[mode] || NO_S.base;
    const kill = new Set(removed.map(([c, r]) => c + "," + r));
    const next = [];
    const srcRows = [];
    for (let c = 0; c < COLS; c++) {
      const keep = [], keepSrc = [];
      for (let r = 0; r < ROWS; r++) {
        if (kill.has(c + "," + r)) continue;
        keep.push(board[c][r]);
        keepSrc.push(r);
      }
      const need = ROWS - keep.length;
      const hasS = keep.includes("S");
      const fillBag = mode === "gold" ? bag : (hasS ? noS : bag);
      const fill = [];
      for (let i = 0; i < need; i++) {
        let sym = draw(fillBag, rng);
        if (mode !== "gold" && sym === "S" && (hasS || fill.includes("S"))) sym = draw(noS, rng);
        fill.push(sym);
      }
      // New symbols fall from above: fill first (top), then keep.
      const col = fill.concat(keep);
      const src = [];
      for (let i = 0; i < need; i++) src.push(-(need - i));
      src.push(...keepSrc);
      next.push(col);
      srcRows.push(src);
    }
    return { board: next, srcRows };
  }

  function cascade(board, mode = "base", rng = Math.random) {
    const steps = [];
    let cur = cloneBoard(board);
    let total = 0;
    let sawGW = false;
    for (let guard = 0; guard < 40; guard++) {
      if (cur.some((col) => col.includes("GW"))) sawGW = true;
      const result = evalBoard(cur);
      if (!result.wins.length) break;
      const removed = removedCells(result).filter(([c, r]) => cur[c][r] !== "S");
      if (!removed.length) break;
      const pay = Math.min(MAX_WIN - total, result.payout);
      total += pay;
      steps.push({
        board: cloneBoard(cur),
        result: { ...result, payout: pay },
        removed,
      });
      if (total >= MAX_WIN) break;
      const tumbled = tumbleBoard(cur, removed, mode, rng);
      cur = tumbled.board;
      steps[steps.length - 1].nextBoard = cloneBoard(cur);
      steps[steps.length - 1].srcRows = tumbled.srcRows;
    }
    const finalResult = evalBoard(cur);
    return {
      steps,
      board: cur,
      payout: Math.min(MAX_WIN, total),
      scatters: finalResult.scatters,
      scatterCells: finalResult.scatterCells,
      sawGW,
    };
  }

  function playBoard(board, mode = "base", rng = Math.random) {
    return cascade(board, mode, rng);
  }
'''

# Insert before simulateVault
anchor = "  function simulateVault(startLocks, level = 3, door = null, rng = Math.random, lockP = LOCK_P) {"
assert anchor in s
s = s.replace(anchor, CASCADE + "\n" + anchor)

# Replace simulateGoldRush to use cascade
old_gold = """  function simulateGoldRush(level = 3, door = null, rng = Math.random) {
    door = door || pickDoorFx("gold", rng);
    const spins = (GOLD_SPINS[level] || 8) + (door.extraSpins || 0);
    const persist = level >= 4;
    const gold = Array.from({ length: COLS }, () => Array(ROWS).fill(false));
    let goldCount = 0;
    const start = Math.min(COLS * ROWS, door.startGold || 0);
    const cells = [];
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) cells.push([c, r]);
    for (let i = cells.length - 1; i > 0; i--) {
      const j = (rng() * (i + 1)) | 0;
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    for (let i = 0; i < start; i++) {
      const [c, r] = cells[i];
      gold[c][r] = true;
      goldCount++;
    }

    let total = 0;
    let bombSeen = false;
    for (let s = 0; s < spins; s++) {
      const board = randomBoard("gold", rng);
      const forceBomb = door.guaranteeBomb && !bombSeen && s === spins - 1;
      if (forceBomb) plantSymbol(board, "GW", rng);
      const hasGW = board.some((col) => col.includes("GW"));
      if (hasGW) bombSeen = true;
      const result = evalBoard(board);
      total += result.payout;
      const marked = new Set();
      for (const w of result.wins) {
        for (const [c, r] of w.cells) {
          const key = c + "," + r;
          if (!marked.has(key)) {
            marked.add(key);
            if (!gold[c][r]) { gold[c][r] = true; goldCount++; }
          }
        }
      }
      if (hasGW && goldCount > 0) {
        for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
          if (gold[c][r]) total += rollIngot(rng).value;
        }
        if (!persist) {
          for (let c = 0; c < COLS; c++) gold[c].fill(false);
          goldCount = 0;
        }
      }
    }
    return { pot: Math.min(MAX_WIN, total), door: door.id, level, bombSeen };
  }"""

new_gold = """  function simulateGoldRush(level = 3, door = null, rng = Math.random) {
    door = door || pickDoorFx("gold", rng);
    const spins = (GOLD_SPINS[level] || 8) + (door.extraSpins || 0);
    const persist = level >= 4;
    const gold = Array.from({ length: COLS }, () => Array(ROWS).fill(false));
    let goldCount = 0;
    const start = Math.min(COLS * ROWS, door.startGold || 0);
    const cells = [];
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) cells.push([c, r]);
    for (let i = cells.length - 1; i > 0; i--) {
      const j = (rng() * (i + 1)) | 0;
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    for (let i = 0; i < start; i++) {
      const [c, r] = cells[i];
      gold[c][r] = true;
      goldCount++;
    }

    let total = 0;
    let bombSeen = false;
    for (let s = 0; s < spins; s++) {
      const board = randomBoard("gold", rng);
      const forceBomb = door.guaranteeBomb && !bombSeen && s === spins - 1;
      if (forceBomb) plantSymbol(board, "GW", rng);
      const play = cascade(board, "gold", rng);
      if (play.sawGW) bombSeen = true;
      total += play.payout;
      for (const step of play.steps) {
        for (const [c, r] of removedCells(step.result)) {
          if (!gold[c][r]) { gold[c][r] = true; goldCount++; }
        }
      }
      if (play.sawGW && goldCount > 0) {
        for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
          if (gold[c][r]) total += rollIngot(rng).value;
        }
        if (!persist) {
          for (let c = 0; c < COLS; c++) gold[c].fill(false);
          goldCount = 0;
        }
      }
    }
    return { pot: Math.min(MAX_WIN, total), door: door.id, level, bombSeen };
  }"""

assert old_gold in s
s = s.replace(old_gold, new_gold)

s = s.replace(
    "randomBoard, filler, evalBoard, lineMatch, isTease, vaultVal, rollIngot,\n"
    "    simulateVault, simulateGoldRush, pickDoorFx, bonusLevel, isWild",
    "randomBoard, filler, evalBoard, lineMatch, isTease, vaultVal, rollIngot,\n"
    "    cascade, playBoard, tumbleBoard, removedCells, cloneBoard,\n"
    "    simulateVault, simulateGoldRush, pickDoorFx, bonusLevel, isWild, PAY_SCALE, PAY_RAW",
)

P.write_text(s, encoding="utf-8", newline="\n")
print("math cascade ok")
