(function (root) {
  const COLS = 6, ROWS = 5;
  const RTP = 0.965, MAX_WIN = 5000, BUY_COST = 120, HUNT_COST = 3;
  const SUPER_COST = 155;
  const HEIST_RESPINS = { 3: 3, 4: 4 };
  const GOLD_SPINS = { 3: 8, 4: 12 };

  const PAY_SCALE = 0.366;
  const PAY_RAW = {
    H1:[0,0,0,1.5,5,15,40], H2:[0,0,0,1,3,8,25], H3:[0,0,0,0.6,2,5,15], H4:[0,0,0,0.5,1.5,4,10],
    L1:[0,0,0,0.3,0.8,2,5], L2:[0,0,0,0.25,0.6,1.5,4], L3:[0,0,0,0.2,0.5,1.2,3], L4:[0,0,0,0.15,0.4,1,2.5],
    W:[0,0,0,1.5,5,15,40], GW:[0,0,0,1.5,5,15,40]
  };
  const roundPay = (v) => (v > 0 ? Math.max(1, Math.round(v * 10)) / 10 : 0);
  const PAY = Object.fromEntries(Object.entries(PAY_RAW).map(([k, a]) => [k, a.map((v) => roundPay(v * PAY_SCALE))]));
  const NAMES = {
    H1:"KNUCKLES", H2:"MONEY SACK", H3:"POCKET WATCH", H4:"FEDORA",
    L1:"HORSESHOE", L2:"MILK BOTTLE", L3:"MATCHBOX", L4:"FISH BONE",
    W:"BOMB WILD", GW:"GOLD BOMB", S:"SAFE"
  };
  const WEIGHTS = {
    base: { L4:13, L3:13, L2:13, L1:13, H4:12, H3:12, H2:11, H1:11, W:1.2, S:1.1584 },
    hunt: { L4:13, L3:13, L2:13, L1:13, H4:12, H3:12, H2:11, H1:11, W:1.2, S:2.0675 },
    gold: { L4:13, L3:13, L2:13, L1:13, H4:12, H3:12, H2:11, H1:11, W:1.0, GW:0.04012 }
  };
  const LINES = [
    [2,2,2,2,2,2],[1,1,1,1,1,1],[3,3,3,3,3,3],[0,0,0,0,0,0],[4,4,4,4,4,4],
    [0,1,2,2,1,0],[4,3,2,2,3,4],[1,2,3,3,2,1],[3,2,1,1,2,3],[0,1,1,1,1,0],
    [4,3,3,3,3,4],[1,0,0,0,0,1],[3,4,4,4,4,3],[2,1,0,0,1,2],[2,3,4,4,3,2],
    [0,0,1,1,0,0],[4,4,3,3,4,4],[1,1,2,2,1,1],[3,3,2,2,3,3],[2,2,1,1,2,2]
  ];
  const VAULT_VALS = [1,1,1,1,2,2,2,5,5,8,10,15,20,50];
  const LOCK_P = 0.02695;
  const LOCK_P_L4 = 0.02662;
  const lockPFor = (level) => (level >= 4 ? LOCK_P_L4 : LOCK_P);
  const CAT_PLANT_P = 0.12;
  const DOOR_FX = {
    heist: [
      { id:"respins", extraRespins:1, startLocks:0, potMult:1, label:"+1 RESPIN" },
      { id:"locks", extraRespins:0, startLocks:2, potMult:1, label:"+2 SACKS" },
      { id:"mult", extraRespins:0, startLocks:0, potMult:2, label:"POT ×2" }
    ],
    gold: [
      { id:"spins", extraSpins:2, startGold:0, guaranteeBomb:false, label:"+2 SPINS" },
      { id:"gold", extraSpins:0, startGold:3, guaranteeBomb:false, label:"3 GOLD CELLS" },
      { id:"bomb", extraSpins:0, startGold:0, guaranteeBomb:true, label:"SURE BOMB" }
    ]
  };
  const INGOT_TIERS = [
    { id:"ingot_1", weight:62, min:1, max:10 },
    { id:"ingot_2", weight:24, min:10, max:25 },
    { id:"ingot_3", weight:11, min:25, max:50 },
    { id:"ingot_chest", weight:3, min:50, max:120 }
  ];

  function bagOf(weights) {
    const keys = Object.keys(weights), cum = [];
    let s = 0;
    for (const k of keys) { s += weights[k]; cum.push(s); }
    return { keys, cum, total: s };
  }
  const BAGS = { base: bagOf(WEIGHTS.base), hunt: bagOf(WEIGHTS.hunt), gold: bagOf(WEIGHTS.gold) };
  const withoutS = (w) => bagOf(Object.fromEntries(Object.entries(w).filter(([k]) => k !== "S")));
  const NO_S = { base: withoutS(WEIGHTS.base), hunt: withoutS(WEIGHTS.hunt), gold: BAGS.gold };
  const INGOT_BAG = bagOf(Object.fromEntries(INGOT_TIERS.map((t) => [t.id, t.weight])));
  const INGOT_BY_ID = Object.fromEntries(INGOT_TIERS.map((t) => [t.id, t]));

  function draw(bag, rng) {
    const x = rng() * bag.total;
    for (let i = 0; i < bag.cum.length; i++) if (x < bag.cum[i]) return bag.keys[i];
    return bag.keys[bag.keys.length - 1];
  }
  const filler = (rng = Math.random) => draw(NO_S.base, rng);
  const isWild = (v) => v === "W" || v === "GW";
  const bonusLevel = (scatters) => (scatters >= 4 ? 4 : 3);

  function randomBoard(mode = "base", rng = Math.random) {
    const bag = BAGS[mode] || BAGS.base;
    const noS = NO_S[mode] || NO_S.base;
    const b = [];
    for (let c = 0; c < COLS; c++) {
      const col = [];
      for (let r = 0; r < ROWS; r++) col.push(draw(bag, rng));
      if (mode !== "gold") {
        const sRows = [];
        col.forEach((v, r) => { if (v === "S") sRows.push(r); });
        if (sRows.length > 1) {
          const keep = sRows[(rng() * sRows.length) | 0];
          for (const r of sRows) if (r !== keep) col[r] = draw(noS, rng);
        }
      }
      b.push(col);
    }
    return b;
  }

  function runFrom(board, line, start) {
    let symbol = null, n = 0;
    for (let c = start; c < COLS; c++) {
      const v = board[c][line[c]];
      if (v === "S") break;
      if (isWild(v)) { n++; continue; }
      if (!symbol) { symbol = v; n++; continue; }
      if (v === symbol) { n++; continue; }
      break;
    }
    if (n < 3) return null;
    if (!symbol) symbol = "W";
    let pay = (PAY[symbol] || [])[n] || 0;
    if (!isWild(symbol)) {
      let wn = 0;
      for (let c = start; c < COLS; c++) { if (isWild(board[c][line[c]])) wn++; else break; }
      if (wn >= 3 && (PAY.W[wn] || 0) > pay) { symbol = "W"; n = wn; pay = PAY.W[wn]; }
    }
    return pay > 0 ? { symbol, n, pay, start } : null;
  }

  // Pays anywhere: the best run of 3+ adjacent matching symbols on the line, from any reel.
  function lineMatch(board, line) {
    let best = null;
    for (let s = 0; s <= COLS - 3; s++) {
      const r = runFrom(board, line, s);
      if (r && (!best || r.pay > best.pay || (r.pay === best.pay && r.n > best.n))) best = r;
    }
    return best || { symbol: null, n: 0, pay: 0, start: 0 };
  }

  function evalBoard(board) {
    const wins = [];
    for (let li = 0; li < LINES.length; li++) {
      const line = LINES[li];
      const { symbol, n, pay, start } = lineMatch(board, line);
      if (pay > 0) {
        const cells = [];
        for (let c = start; c < start + n; c++) cells.push([c, line[c]]);
        wins.push({ line: li + 1, symbol, n, pay, cells });
      }
    }
    const scatterCells = [];
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) if (board[c][r] === "S") scatterCells.push([c, r]);
    const payout = Math.min(MAX_WIN, wins.reduce((s, w) => s + w.pay, 0));
    return { payout, wins, scatters: scatterCells.length, scatterCells };
  }

  function isTease(board) {
    let first = 0;
    for (let c = 0; c < COLS - 1; c++) for (let r = 0; r < ROWS; r++) if (board[c][r] === "S") first++;
    return first === 2 && !board[COLS - 1].includes("S");
  }

  const vaultVal = (rng = Math.random) => VAULT_VALS[(rng() * VAULT_VALS.length) | 0];

  function rollIngot(rng = Math.random) {
    const id = draw(INGOT_BAG, rng);
    const tier = INGOT_BY_ID[id];
    const span = tier.max - tier.min;
    const value = Math.min(tier.max, tier.min + Math.floor(rng() * (span + 1)));
    return { id: tier.id, value, min: tier.min, max: tier.max };
  }

  function pickDoorFx(kind, rng = Math.random) {
    const list = DOOR_FX[kind] || DOOR_FX.heist;
    return list[(rng() * list.length) | 0];
  }


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

  function simulateVault(startLocks, level = 3, door = null, rng = Math.random, lockP = lockPFor(level)) {
    const cells = COLS * ROWS;
    const reset = HEIST_RESPINS[level] || 3;
    door = door || pickDoorFx("heist", rng);
    let locked = Math.min(cells, startLocks + (door.startLocks || 0));
    let sum = 0;
    for (let i = 0; i < locked; i++) sum += vaultVal(rng);
    let respins = reset + (door.extraRespins || 0);
    while (respins > 0 && locked < cells) {
      let landed = 0;
      const empty = cells - locked;
      for (let i = 0; i < empty; i++) if (rng() < lockP) { landed++; sum += vaultVal(rng); }
      locked += landed;
      respins = landed ? reset : respins - 1;
    }
    return { pot: sum * (door.potMult || 1), locked, door: door.id, level };
  }

  function plantSymbol(board, sym, rng) {
    const c = (rng() * COLS) | 0;
    const r = (rng() * ROWS) | 0;
    board[c][r] = sym;
  }

  function simulateGoldRush(level = 3, door = null, rng = Math.random) {
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
  }

  const api = {
    COLS, ROWS, RTP, MAX_WIN, BUY_COST, HUNT_COST, SUPER_COST, PAY, NAMES, WEIGHTS, LINES,
    VAULT_VALS, LOCK_P, LOCK_P_L4, lockPFor, CAT_PLANT_P, DOOR_FX, HEIST_RESPINS, GOLD_SPINS, INGOT_TIERS,
    randomBoard, filler, evalBoard, lineMatch, isTease, vaultVal, rollIngot,
    cascade, playBoard, tumbleBoard, removedCells, cloneBoard,
    simulateVault, simulateGoldRush, pickDoorFx, bonusLevel, isWild, PAY_SCALE, PAY_RAW
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MatouMath = api;
})(typeof window !== "undefined" ? window : globalThis);
