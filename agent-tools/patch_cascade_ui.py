from pathlib import Path

P = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\index.html")
s = P.read_text(encoding="utf-8")


def rep(a, b, n=1):
    global s
    c = s.count(a)
    assert c == n, (c, a[:80])
    s = s.replace(a, b)


# CSS for explode / tumble
rep(
    "    .cell.hit img { animation:cellHit .5s cubic-bezier(.25,1.8,.5,1); }\n",
    "    .cell.hit img { animation:cellHit .5s cubic-bezier(.25,1.8,.5,1); }\n"
    "    .cell.explode img { animation:cellExplode .42s ease-out forwards; }\n"
    "    .cell.gone { opacity:0 !important; pointer-events:none; }\n"
    "    .cell.tumbling { will-change:transform; }\n"
    "    @keyframes cellExplode {\n"
    "      0% { transform:scale(1); opacity:1; filter:brightness(1.15); }\n"
    "      45% { transform:scale(1.22); opacity:1; filter:brightness(1.7); }\n"
    "      100% { transform:scale(0); opacity:0; filter:brightness(2); }\n"
    "    }\n",
)

# Info text
rep(
    "Buy Bonus 108× (level 3). Super Bonus (level 4) priced to the feature EV.</li>\n"
    "        <li>Max one Safe per reel (6 max). 3 Safes → level 3 choice. 4+ Safes → level 4 choice between HEIST and GOLD RUSH.</li>\n"
    "        <li>HEIST: mystery money sacks, hold &amp; spin (3 respins at level 3, 4 at level 4). Values reveal one by one at the end.</li>\n"
    "        <li>GOLD RUSH: 8 spins (12 at level 4) with base symbols. Winning cells turn gold. A Gold Bomb pays every gold cell as 1/2/3 ingots or an ingot chest. Level 3 clears gold after pay; level 4 keeps them.</li>\n",
    "Buy Bonus 118× (level 3). Super Bonus 156× (level 4).</li>\n"
    "        <li>Max one Safe per reel (6 max). 3 Safes → level 3 choice. 4+ Safes → level 4 choice between HEIST and GOLD RUSH.</li>\n"
    "        <li>Winning symbols explode and new ones tumble down (cascades) until no more wins. Same in Gold Rush.</li>\n"
    "        <li>HEIST: mystery money sacks, hold &amp; spin (3 respins at level 3, 4 at level 4). Values reveal one by one at the end.</li>\n"
    "        <li>GOLD RUSH: 8 spins (12 at level 4) with cascades. Winning cells turn gold. A Gold Bomb pays every gold cell as 1/2/3 ingots or an ingot chest. Level 3 clears gold after pay; level 4 keeps them.</li>\n",
)

# Placeholder HTML prices
rep(
    '<span class="price" id="buyPrice">108.00<small>108× BET</small></span>',
    '<span class="price" id="buyPrice">118.00<small>118× BET</small></span>',
)
rep(
    '<span class="price" id="superPrice">144.00<small>144× BET</small></span>',
    '<span class="price" id="superPrice">156.00<small>156× BET</small></span>',
)

CASCADE_FN = r'''
    async function explodeCells(removed) {
      if (!removed.length) return;
      $("table").classList.add("revealing");
      markCells(removed, "explode");
      sfx("coin");
      await wait(tempo(420, 180));
      removed.forEach(([c, r]) => { const el = cellEl(c, r); if (el) el.classList.add("gone"); });
      await wait(tempo(80, 40));
    }
    async function tumbleCol(c, col, fromRows) {
      const strip = strips[c];
      const reel = strip.parentElement;
      const h = reel.clientHeight / ROWS;
      strip.innerHTML = "";
      strip.style.transition = "none";
      strip.style.transform = "translateY(0)";
      const nodes = col.map((id, r) => {
        const cell = document.createElement("div");
        cell.className = "cell tumbling";
        cell.style.height = h + "px";
        const from = fromRows[r];
        cell.style.transform = `translateY(${(from - r) * h}px)`;
        cell.innerHTML = `<img src="${src(id)}" alt="${id}">`;
        strip.appendChild(cell);
        return cell;
      });
      await raf();
      const dur = tempo(560, 260);
      nodes.forEach((cell, i) => {
        cell.style.transition = `transform ${dur / 1000}s cubic-bezier(.3,.08,.35,1) ${i * 0.015}s`;
        cell.style.transform = "translateY(0)";
      });
      await wait(dur + ROWS * 18);
      slam(reel);
      sfx("slam", c);
    }
    async function tumbleTo(nextBoard, fromRows) {
      setCellH();
      await Promise.all(nextBoard.map((col, c) => tumbleCol(c, col, fromRows[c])));
      state.board = nextBoard.map((col) => col.slice());
      paint(state.board, 0);
    }
    async function runCascadePlay(play, bet, { gold = false } = {}) {
      let total = 0;
      for (const step of play.steps) {
        state.board = step.board.map((col) => col.slice());
        paint(state.board, 0);
        if (gold) paintGoldMarks();
        const stepRes = { ...step.result, scatters: 0, scatterCells: [] };
        const won = await showWins(stepRes, bet);
        total = +(total + won).toFixed(2);
        state.win = total;
        hud();
        if (gold) markWinCellsGold(step.result.wins);
        await explodeCells(step.removed);
        if (step.nextBoard) await tumbleTo(step.nextBoard, step.srcRows);
        if (gold) paintGoldMarks();
        clearWins();
        await wait(tempo(160, 70));
      }
      state.board = play.board.map((col) => col.slice());
      paint(state.board, 0);
      if (gold) paintGoldMarks();
      if (play.scatters >= 3) {
        await showWins({ wins: [], payout: 0, scatters: play.scatters, scatterCells: play.scatterCells }, bet);
      }
      return total;
    }
'''

rep(
    "    async function dismissLine(){ $(\"winSvg\").classList.add(\"out\"); await wait(tempo(180,90)); clearWins(); }\n",
    "    async function dismissLine(){ $(\"winSvg\").classList.add(\"out\"); await wait(tempo(180,90)); clearWins(); }\n"
    + CASCADE_FN,
)

# resolve() cascade loop
OLD_RESOLVE = """      if (paid) state.lastRound = { board: board.map((c)=>c.slice()), bet, hunt:state.hunt, plant };
      await spinTo(board);
      if (plant) await catPlant(board);
      const result=M.evalBoard(board);
      const win=await showWins(result, bet);
      state.roundLineWin=win;
      if (win>0) {
        state.win=win;
        if (paid) { state.balance=cents(state.balance+win); state.returned=cents(state.returned+win); }
        hud();
        const tier=winTier(win, bet);
        setCat(tier.cat);
        if (tier.name==="BIG WIN" || tier.name==="MEGA WIN") {
          punch(); confetti(tier.name==="MEGA WIN"?140:80);
          marquee("win");
          if (window.MatouScene) { MatouScene.windowsWin(true); MatouScene.neonBoost(true); }
        } else if (win > 0) {
          marquee("win");
        }
        if (tier.name && tier.name!=="SMALL WIN") {
          await waitCard({kicker: money(win), title: tier.name});
        } else if (tier.name) {
          await wait(tempo(400,160));
        }
        if (window.MatouScene) MatouScene.neonBoost(false);
        if (!busyBonus()) marquee("idle");
        if (paid && result.scatters<3) pushHist("WIN", win);
      } else {
        state.win=0; hud();
        if (result.scatters<3) { setCat("stomp"); sfx("stomp"); }
        if (paid && result.scatters<3) pushHist("MISS", 0);
      }

      if (replay) { clearWins(); lock(false); return; }

      if (paid && state.auto && !state.autoUntilBonus) { state.autoLeft-=1; if (state.autoLeft<=0) stopAuto(); else hud(); }
      if (result.scatters>=3) {
        const level = M.bonusLevel(result.scatters);
        await startBonus(level, result.scatterCells);"""

NEW_RESOLVE = """      if (paid) state.lastRound = { board: board.map((c)=>c.slice()), bet, hunt:state.hunt, plant };
      await spinTo(board);
      if (plant) await catPlant(board);
      const mode = (replay && state.lastRound ? state.lastRound.hunt : state.hunt) ? "hunt" : "base";
      let play;
      if (replay && state.lastRound && state.lastRound.play) {
        play = state.lastRound.play;
      } else {
        play = M.cascade(board, mode);
        if (state.lastRound) state.lastRound.play = play;
      }
      const win = await runCascadePlay(play, bet);
      state.roundLineWin = win;
      const scatters = play.scatters;
      const scatterCells = play.scatterCells;
      if (win>0) {
        state.win=win;
        if (paid) { state.balance=cents(state.balance+win); state.returned=cents(state.returned+win); }
        hud();
        const tier=winTier(win, bet);
        setCat(tier.cat);
        if (tier.name==="BIG WIN" || tier.name==="MEGA WIN") {
          punch(); confetti(tier.name==="MEGA WIN"?140:80);
          marquee("win");
          if (window.MatouScene) { MatouScene.windowsWin(true); MatouScene.neonBoost(true); }
        } else if (win > 0) {
          marquee("win");
        }
        if (tier.name && tier.name!=="SMALL WIN") {
          await waitCard({kicker: money(win), title: tier.name});
        } else if (tier.name) {
          await wait(tempo(400,160));
        }
        if (window.MatouScene) MatouScene.neonBoost(false);
        if (!busyBonus()) marquee("idle");
        if (paid && scatters<3) pushHist("WIN", win);
      } else {
        state.win=0; hud();
        if (scatters<3) { setCat("stomp"); sfx("stomp"); }
        if (paid && scatters<3) pushHist("MISS", 0);
      }

      if (replay) { clearWins(); lock(false); return; }

      if (paid && state.auto && !state.autoUntilBonus) { state.autoLeft-=1; if (state.autoLeft<=0) stopAuto(); else hud(); }
      if (scatters>=3) {
        const level = M.bonusLevel(scatters);
        await startBonus(level, scatterCells);"""

rep(OLD_RESOLVE, NEW_RESOLVE)

OLD_GOLD = """        const hasGW = board.some((col)=>col.includes("GW"));
        if (hasGW) bombSeen = true;
        state.board = board;
        await spinTo(board);
        paintGoldMarks();
        const result = M.evalBoard(board);
        const lineWin = +(result.payout * baseBet()).toFixed(2);
        if (lineWin > 0) {
          await showWins(result, baseBet());
          state.bonusWin = +(state.bonusWin + lineWin).toFixed(2);
          markWinCellsGold(result.wins);
          hud();
        } else {
          paintGoldMarks();
        }
        if (hasGW && goldCount() > 0) {
          await waitCard({kicker:"GOLD BOMB", title:"BOOM", sub:`${goldCount()} GOLD CELLS`});
          await ingotBurst(persist);
          const cap = Math.max(0, M.MAX_WIN*baseBet() - state.roundLineWin);
          state.bonusWin = Math.min(cap, state.bonusWin);
          hud();
        }"""

NEW_GOLD = """        state.board = board;
        await spinTo(board);
        paintGoldMarks();
        const play = M.cascade(board, "gold");
        if (play.sawGW) bombSeen = true;
        const lineWin = await runCascadePlay(play, baseBet(), { gold: true });
        state.bonusWin = +(state.bonusWin + lineWin).toFixed(2);
        hud();
        if (play.sawGW && goldCount() > 0) {
          await waitCard({kicker:"GOLD BOMB", title:"BOOM", sub:`${goldCount()} GOLD CELLS`});
          await ingotBurst(persist);
          const cap = Math.max(0, M.MAX_WIN*baseBet() - state.roundLineWin);
          state.bonusWin = Math.min(cap, state.bonusWin);
          hud();
        }"""

rep(OLD_GOLD, NEW_GOLD)

P.write_text(s, encoding="utf-8", newline="\n")
print("cascade ui ok")
