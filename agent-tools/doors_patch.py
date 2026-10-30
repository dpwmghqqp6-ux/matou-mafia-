"""Rebuild the door-pick screen (vault safes / gold wagons) with integrated, animated doors."""
from pathlib import Path

P = Path(r"C:\Users\Mathis\Downloads\DuskFox-leger\preview\index.html")
s = P.read_text(encoding="utf-8")


def cut(text, start, end_marker, repl):
    a = text.index(start)
    b = text.index(end_marker, a)
    return text[:a] + repl + text[b:]


CSS_A = r"""    @keyframes dpIn { from { opacity:0; transform:scale(1.04) } to { opacity:1; transform:none } }
    @keyframes hintPulse { 50% { opacity:.45 } }
    .door-pick {
      position:absolute; inset:0; z-index:27; display:none; overflow:hidden; background:#050302;
      container-type:size; color:#f3e3bd;
    }
    .door-pick[data-theme="heist"] { --dp-bg:url("./assets/matou/doors/heist_scene.jpg"); }
    .door-pick[data-theme="gold"] { --dp-bg:url("./assets/matou/doors/gold_scene.jpg"); }
    .door-pick.on { display:block; }
    .door-pick::before {
      content:""; position:absolute; inset:-6%; background:var(--dp-bg) center/cover no-repeat;
      filter:blur(22px) brightness(.4) saturate(1.1);
    }
    .dp-stage {
      position:absolute; left:50%; top:50%; aspect-ratio:16 / 9;
      width:min(max(100cqw, 177.78cqh), 119cqw); transform:translate(-50%,-50%);
      container-type:inline-size; overflow:hidden;
    }
    .dp-cam {
      position:absolute; inset:0; transform-origin:var(--fx,50%) var(--fy,50%);
      transition:transform 1.25s cubic-bezier(.3,.7,.2,1), filter .8s;
    }
    .door-pick.intro .dp-cam { animation:dpCamIn 1.9s cubic-bezier(.2,.7,.2,1) both; }
    .door-pick.focus .dp-cam { transform:scale(1.2); }
    @keyframes dpCamIn { from { transform:scale(1.16); filter:blur(5px) brightness(.25); } to { transform:none; filter:none; } }
    .dp-bg { position:absolute; inset:0; background:var(--dp-bg) center/100% 100% no-repeat; }
    .dp-cam::after {
      content:""; position:absolute; inset:-10%; pointer-events:none; opacity:.5; z-index:6;
      background-image:radial-gradient(circle, rgba(255,226,170,.6) 0 1px, transparent 1.6px), radial-gradient(circle, rgba(255,226,170,.35) 0 1px, transparent 1.4px);
      background-size:140px 160px, 90px 110px; background-position:0 0, 40px 60px;
      animation:npDust 22s linear infinite;
    }
    .dp-fog {
      position:absolute; inset:0; z-index:5; pointer-events:none; mix-blend-mode:screen;
      background:
        radial-gradient(ellipse 38% 16% at 22% 74%, rgba(210,200,180,.2), transparent 70%),
        radial-gradient(ellipse 42% 14% at 76% 72%, rgba(210,200,180,.16), transparent 70%),
        radial-gradient(ellipse 60% 12% at 50% 66%, rgba(210,200,180,.1), transparent 70%);
      animation:dpFog 13s ease-in-out infinite alternate;
    }
    @keyframes dpFog { from { transform:translateX(-4%); opacity:.7; } to { transform:translateX(4%); opacity:1; } }
    .dp-lamp {
      position:absolute; width:9%; aspect-ratio:1; transform:translate(-50%,-50%); border-radius:50%; pointer-events:none; z-index:1;
      background:radial-gradient(closest-side, rgba(255,214,140,.55), rgba(255,180,80,.15) 55%, transparent);
      mix-blend-mode:screen; animation:dpLamp 3.1s ease-in-out infinite;
    }
    .dp-lamp.r { animation-delay:-1.4s; }
    .door-pick[data-theme="heist"] .dp-lamp { top:51%; background:radial-gradient(closest-side, rgba(140,255,160,.4), rgba(80,200,110,.12) 55%, transparent); }
    .door-pick[data-theme="heist"] .dp-lamp.l { left:2.4%; }
    .door-pick[data-theme="heist"] .dp-lamp.r { left:97.6%; }
    .door-pick[data-theme="gold"] .dp-lamp { top:38%; }
    .door-pick[data-theme="gold"] .dp-lamp.l { left:3.3%; }
    .door-pick[data-theme="gold"] .dp-lamp.r { left:96.7%; }
    @keyframes dpLamp { 0%,100%{opacity:1} 44%{opacity:.85} 47%{opacity:.45} 50%{opacity:.95} 72%{opacity:.8} }
    .dp-slots { position:absolute; inset:0; z-index:2; }
    .dp-slots:has(.dslot:hover) .dslot:not(:hover) { filter:brightness(.62) saturate(.85); }
    .dslot {
      position:absolute; left:calc(var(--x) * 1%); top:calc(var(--y) * 1%); transform:translate(-50%,-50%);
      border:0; padding:0; background:none; cursor:pointer; outline:none; perspective:70cqw;
      transition:filter .35s;
    }
    .door-pick[data-theme="heist"] .dslot { width:22.4%; aspect-ratio:1; }
    .door-pick[data-theme="gold"] .dslot { width:12.6%; height:31.4%; }
    .ds-light {
      position:absolute; left:50%; bottom:45%; width:190%; height:240%; transform:translateX(-50%);
      pointer-events:none; mix-blend-mode:screen; opacity:.18; transition:opacity .45s;
      background:linear-gradient(180deg, rgba(255,230,170,0), rgba(255,226,160,.35));
      clip-path:polygon(44% 0, 56% 0, 100% 100%, 0 100%);
      animation:dpBeam 4.2s ease-in-out infinite; animation-delay:calc(var(--i,0) * -1.3s);
    }
    @keyframes dpBeam { 0%,100%{opacity:.14} 50%{opacity:.26} }
    .dslot:hover .ds-light, .dslot:focus-visible .ds-light { animation:none; opacity:.55; }
    .dslot.picked .ds-light { animation:none; opacity:.8; }
    .ds-glow {
      position:absolute; inset:-35%; border-radius:50%; pointer-events:none; mix-blend-mode:screen; opacity:0;
      background:radial-gradient(closest-side, rgba(255,214,120,.75), rgba(255,170,60,.25) 50%, transparent);
      transition:opacity .4s;
    }
    .dslot:hover .ds-glow, .dslot:focus-visible .ds-glow { opacity:.45; }
    .dslot.open .ds-glow { opacity:.75; }
    .dslot.picked.open .ds-glow { opacity:1; animation:dsGlow 1.6s ease-in-out .6s infinite; }
    @keyframes dsGlow { 50% { opacity:.6; transform:scale(1.08); } }
    .ds-prize {
      position:absolute; inset:14% 10%; z-index:1; display:grid; place-items:center; align-content:center; gap:.45cqw;
      text-align:center; opacity:0; transform:scale(.35); pointer-events:none;
      transition:opacity .3s, transform .6s cubic-bezier(.3,1.6,.5,1);
    }
    .dslot.open .ds-prize { opacity:1; transform:none; transition-delay:.38s; }
    .ds-ico {
      display:grid; place-items:center; width:4.6cqw; aspect-ratio:1; border-radius:50%; overflow:hidden;
      background:radial-gradient(circle at 40% 35%, #3a2610, #120a04); border:.22cqw solid #f0d28a;
      box-shadow:0 0 1.6cqw rgba(255,200,90,.8);
    }
    .ds-ico img, .dp-chip i img { width:100%; height:100%; object-fit:cover; }
    .ds-ico em, .dp-chip i em { font:900 2cqw/1 "Rockwell","Georgia",serif; font-style:normal; color:#ffe2a0; text-shadow:0 0 .8cqw rgba(255,200,90,.9); }
    .ds-prize b {
      padding:.3cqw .9cqw; border:.18cqw solid #f0d28a; border-radius:.3cqw; white-space:nowrap;
      background:linear-gradient(180deg,#2c1b0a,#110903); color:#ffe6a6;
      font:900 1.75cqw/1 "Rockwell","Georgia",serif; letter-spacing:.06em;
      box-shadow:0 .3cqw 1cqw rgba(0,0,0,.7), 0 0 1.4cqw rgba(255,200,90,.45); text-shadow:0 0 .7cqw rgba(255,200,90,.7);
    }
    .ds-prize small {
      max-width:100%; padding:.2cqw .5cqw; border-radius:.2cqw; background:rgba(10,6,2,.72);
      font:700 .82cqw/1.25 "Georgia",serif; color:#f3e3bd; letter-spacing:.03em;
    }
    .door-pick[data-theme="gold"] .ds-prize { inset:10% 4%; }
    .door-pick[data-theme="gold"] .ds-prize b { font-size:1.22cqw; padding:.3cqw .5cqw; }
    .door-pick[data-theme="gold"] .ds-ico { width:3.8cqw; }
    .door-pick[data-theme="gold"] .ds-prize small { font-size:.72cqw; }
    .dslot.other .ds-prize { filter:grayscale(.85) brightness(.75); }
    .dslot.other.open .ds-glow { opacity:.2; }
    .ds-leaf {
      position:absolute; inset:0; z-index:2; pointer-events:none; transform-style:preserve-3d;
      transition:transform 1s cubic-bezier(.5,.05,.2,1), filter .35s;
      filter:drop-shadow(0 1cqw 1.3cqw rgba(0,0,0,.75));
    }
    .ds-leaf-img { position:absolute; inset:0; width:100%; height:100%; object-fit:fill; }
    .door-pick[data-theme="heist"] .ds-leaf { transform-origin:3% 50%; }
    .door-pick[data-theme="heist"] .dslot:hover .ds-leaf, .door-pick[data-theme="heist"] .dslot:focus-visible .ds-leaf { transform:rotateY(-11deg); filter:brightness(1.12) drop-shadow(0 1cqw 1.3cqw rgba(0,0,0,.75)); }
    .door-pick[data-theme="heist"] .dslot.open .ds-leaf { transform:rotateY(-112deg); transition-duration:1.15s; }
    .door-pick.intro[data-theme="heist"] .ds-leaf { animation:dsShutVault .75s cubic-bezier(.6,0,.35,1.25) both; animation-delay:calc(.35s + var(--i,0) * .22s); }
    @keyframes dsShutVault { from { transform:rotateY(-105deg); } to { transform:none; } }
    .door-pick[data-theme="gold"] .dslot:hover .ds-leaf, .door-pick[data-theme="gold"] .dslot:focus-visible .ds-leaf { transform:translateX(10%); filter:brightness(1.12) drop-shadow(0 1cqw 1.3cqw rgba(0,0,0,.75)); }
    .door-pick[data-theme="gold"] .dslot.open .ds-leaf { transform:translateX(104%); transition:transform 1.05s cubic-bezier(.55,0,.25,1); }
    .door-pick.intro[data-theme="gold"] .ds-leaf { animation:dsShutWagon .8s cubic-bezier(.6,0,.3,1.15) both; animation-delay:calc(.35s + var(--i,0) * .22s); }
    @keyframes dsShutWagon { from { transform:translateX(104%); } to { transform:none; } }
    .ds-dial {
      position:absolute; left:50%; top:49.4%; width:38.4%; aspect-ratio:1;
      transform:translate(-50%,-50%) rotate(var(--rot,0deg)); transition:transform .8s cubic-bezier(.3,0,.2,1);
    }
    .dslot:hover .ds-dial { --rot:-38deg; }
    .door-pick.intro .ds-dial { animation:dsDialLock .9s cubic-bezier(.4,0,.2,1) both; animation-delay:calc(.9s + var(--i,0) * .22s); }
    .dslot.unlock .ds-dial { animation:dsDialOpen .85s cubic-bezier(.4,0,.2,1) forwards; }
    @keyframes dsDialLock { from { transform:translate(-50%,-50%) rotate(200deg); } to { transform:translate(-50%,-50%) rotate(0deg); } }
    @keyframes dsDialOpen {
      0% { transform:translate(-50%,-50%) rotate(var(--rot,0deg)); }
      35% { transform:translate(-50%,-50%) rotate(-160deg); }
      100% { transform:translate(-50%,-50%) rotate(420deg); filter:brightness(1.35); }
    }
    .ds-pad {
      position:absolute; left:50%; top:49%; width:21%; transform:translate(-50%,-8%);
      filter:drop-shadow(0 .5cqw .5cqw rgba(0,0,0,.65));
    }
    .door-pick.intro .ds-pad { animation:dsPadIn .55s cubic-bezier(.3,1.5,.5,1) both; animation-delay:calc(1.05s + var(--i,0) * .18s); }
    .dslot:hover .ds-pad { animation:dsPadWiggle .55s ease-in-out; }
    .dslot.unlock .ds-pad { animation:dsPadDrop .8s ease-in forwards; }
    @keyframes dsPadIn { from { opacity:0; transform:translate(-50%,-180%) rotate(-12deg); } to { opacity:1; transform:translate(-50%,-8%); } }
    @keyframes dsPadWiggle { 30%{transform:translate(-50%,-8%) rotate(-7deg)} 70%{transform:translate(-50%,-8%) rotate(6deg)} }
    @keyframes dsPadDrop {
      0% { transform:translate(-50%,-8%); }
      15% { transform:translate(-56%,-8%) rotate(-9deg); }
      30% { transform:translate(-44%,-8%) rotate(9deg); }
      45% { transform:translate(-50%,-8%) rotate(0); opacity:1; }
      100% { transform:translate(-50%,420%) rotate(48deg); opacity:0; }
    }
    .ds-rail { position:absolute; left:-5%; width:214%; top:-5%; height:5.4%; z-index:3; pointer-events:none; }
    .ds-rail img { width:100%; height:100%; object-fit:fill; filter:drop-shadow(0 .3cqw .3cqw rgba(0,0,0,.6)); }
    .door-pick[data-theme="heist"] .ds-rail, .door-pick[data-theme="heist"] .ds-pad { display:none; }
    .door-pick[data-theme="gold"] .ds-dial { display:none; }
    .ds-num {
      position:absolute; left:50%; top:100%; z-index:3; transform:translate(-50%, 35%);
      min-width:4.4cqw; padding:.25cqw .9cqw; border-radius:.3cqw; border:.16cqw solid #c9953f;
      background:linear-gradient(180deg,#3a2612,#160c04); color:#f0d28a;
      font:900 1.25cqw/1 "Rockwell","Georgia",serif; letter-spacing:.16em; text-align:center;
      box-shadow:0 0 1cqw rgba(232,181,74,.3); transition:background .3s, color .3s, box-shadow .3s, transform .3s;
    }
    .door-pick[data-theme="heist"] .ds-num { transform:translate(-50%, -10%); }
    .door-pick.intro .ds-num { animation:dsNumIn .5s cubic-bezier(.3,1.6,.5,1) both; animation-delay:calc(1.25s + var(--i,0) * .12s); }
    @keyframes dsNumIn { from { opacity:0; transform:translate(-50%, 35%) scale(.3); } }
    .dslot:hover .ds-num, .dslot.picked .ds-num { background:linear-gradient(180deg,#f6dc98,#c9963f); color:#1a0f05; box-shadow:0 0 1.6cqw rgba(255,210,110,.7); }
    .door-pick.done .dslot { pointer-events:none; }
    .door-pick.done .dslot.other { filter:brightness(.7) saturate(.7); }
    .door-enter {
      position:absolute; left:calc(var(--ex,50) * 1%); top:calc(var(--ey,50) * 1%); width:8%; aspect-ratio:9 / 16; z-index:4;
      transform:translate(-50%,-30%); opacity:0; pointer-events:none; object-fit:contain;
      filter:drop-shadow(0 .8cqw 1cqw rgba(0,0,0,.6));
    }
    .door-pick.entering .door-enter { animation:dpCatIn 1s cubic-bezier(.4,.1,.3,1) forwards; }
    @keyframes dpCatIn {
      0% { opacity:0; transform:translate(-50%,40%) scale(1.5); }
      22% { opacity:1; }
      70% { opacity:1; filter:drop-shadow(0 .8cqw 1cqw rgba(0,0,0,.6)) brightness(.8); }
      100% { opacity:0; transform:translate(-50%,-48%) scale(.42); filter:brightness(.15); }
    }
    .dp-burst { position:absolute; inset:0; z-index:4; pointer-events:none; }
    .dp-burst i {
      position:absolute; left:calc(var(--sx) * 1%); top:calc(var(--sy) * 1%); width:var(--sz,1cqw); aspect-ratio:1; border-radius:50%;
      background:radial-gradient(circle at 35% 30%, #fff6cf, #f4c650 45%, #8a5a1c);
      box-shadow:0 0 .6cqw rgba(255,210,110,.8);
      animation:dpCoin var(--t,1.2s) cubic-bezier(.15,.6,.45,1) forwards;
    }
    .dp-burst i.bar { border-radius:.15cqw; aspect-ratio:2.2; background:linear-gradient(180deg,#fff0b0,#e2a93a 55%,#8a5a1c); }
    @keyframes dpCoin {
      0% { transform:translate(-50%,-50%) scale(.3) rotate(0); opacity:1; }
      45% { transform:translate(calc(-50% + var(--dx) * .7), calc(-50% + var(--dy))) scale(1) rotate(calc(var(--r) * .5)); opacity:1; }
      100% { transform:translate(calc(-50% + var(--dx)), calc(-50% + var(--dy) * .2 + 18cqw)) scale(.9) rotate(var(--r)); opacity:0; }
    }
    .dp-vign { position:absolute; inset:0; z-index:3; pointer-events:none; background:radial-gradient(ellipse 75% 70% at 50% 46%, transparent 55%, rgba(0,0,0,.72)); }
    .dp-head {
      position:absolute; left:50%; top:3%; z-index:5; transform:translateX(-50%); width:min(92%, 900px);
      display:flex; flex-direction:column; align-items:center; gap:6px; text-align:center; pointer-events:none;
    }
    .dp-kicker {
      padding:4px 16px; border:1px solid rgba(240,210,138,.6); background:rgba(12,7,2,.75);
      font:800 clamp(10px, 1.05vw, 15px)/1 "Georgia",serif; letter-spacing:.32em; color:#e8c078;
    }
    .dp-title {
      margin:0; padding:clamp(6px,.7vw,12px) clamp(26px,4vw,64px); color:#1a0f05;
      font:900 clamp(22px, 3.3vw, 54px)/1 "Rockwell","Georgia",serif; letter-spacing:.14em; white-space:nowrap;
      background:linear-gradient(180deg,#f8e2a4,#d6a64c 48%,#8f5e28 100%);
      border:2px solid #241709; box-shadow:0 4px 0 #241709, 0 0 30px rgba(255,200,90,.35);
      clip-path:polygon(0 50%,3% 0,97% 0,100% 50%,97% 100%,3% 100%);
    }
    .door-pick.ready:not(.done) .dp-title { animation:npPulse 1.8s ease-in-out infinite; }
    .dp-title.pop { animation:dpPop .55s cubic-bezier(.3,1.6,.5,1) both !important; }
    @keyframes dpPop { from { transform:scale(.4) rotate(-4deg); opacity:0; } to { transform:none; opacity:1; } }
    .dp-sub { margin:2px 0 0; padding:3px 12px; background:rgba(10,6,2,.6); font:italic clamp(12px, 1.15vw, 18px)/1.3 "Georgia",serif; color:#f3e3bd; }
    .door-pick.intro .dp-head { animation:dpDrop .7s cubic-bezier(.3,1.3,.5,1) both; animation-delay:1s; }
    @keyframes dpDrop { from { opacity:0; transform:translate(-50%,-60%); } to { opacity:1; transform:translateX(-50%); } }
    .dp-foot {
      position:absolute; left:50%; bottom:3.2%; z-index:5; transform:translateX(-50%); width:min(94%, 980px);
      display:flex; flex-direction:column; align-items:center; gap:8px;
    }
    .dp-odds-title { margin:0; font:800 clamp(9px, .9vw, 13px)/1 "Georgia",serif; letter-spacing:.34em; color:#e8c078; text-shadow:0 2px 6px #000; }
    .dp-odds { display:flex; justify-content:center; gap:clamp(8px, 1.2vw, 18px); width:100%; }
    .dp-chip {
      display:flex; align-items:center; gap:10px; flex:1 1 0; max-width:310px; padding:8px 12px;
      border:1.5px solid rgba(201,149,63,.8); border-radius:6px; background:linear-gradient(180deg,rgba(40,25,10,.88),rgba(14,8,3,.92));
      box-shadow:0 6px 18px rgba(0,0,0,.55); transition:transform .4s cubic-bezier(.3,1.5,.5,1), opacity .4s, filter .4s, background .4s, border-color .4s;
    }
    .dp-chip i {
      flex:0 0 auto; display:grid; place-items:center; width:clamp(28px, 2.8vw, 44px); aspect-ratio:1; border-radius:50%; overflow:hidden;
      border:1.5px solid #f0d28a; background:radial-gradient(circle at 40% 35%, #3a2610, #120a04);
    }
    .dp-chip i em { font-size:clamp(12px, 1.2vw, 19px); }
    .dp-chip span { display:flex; flex-direction:column; gap:3px; text-align:left; }
    .dp-chip b { font:900 clamp(11px, 1.1vw, 17px)/1 "Rockwell","Georgia",serif; letter-spacing:.08em; color:#ffe2a0; }
    .dp-chip small { font:clamp(9px, .82vw, 12px)/1.25 "Georgia",serif; color:#d9c7a1; }
    .door-pick.intro .dp-chip { animation:dpChipIn .6s cubic-bezier(.3,1.4,.5,1) both; }
    .door-pick.intro .dp-chip:nth-child(1) { animation-delay:1.3s; }
    .door-pick.intro .dp-chip:nth-child(2) { animation-delay:1.42s; }
    .door-pick.intro .dp-chip:nth-child(3) { animation-delay:1.54s; }
    @keyframes dpChipIn { from { opacity:0; transform:translateY(60%); } }
    .dp-chip.won { transform:translateY(-6px) scale(1.06); border-color:#ffe2a0; background:linear-gradient(180deg,#f6dc98,#c9963f); box-shadow:0 0 28px rgba(255,210,110,.6), 0 6px 18px rgba(0,0,0,.5); }
    .dp-chip.won b, .dp-chip.won small { color:#1a0f05; }
    .door-pick.done .dp-chip:not(.won) { opacity:.45; filter:grayscale(.8); }
    @media (max-aspect-ratio: 1/1) {
      .dp-foot { bottom:2%; }
      .dp-odds { flex-direction:column; align-items:center; }
      .dp-chip { width:100%; max-width:420px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .door-pick *, .door-pick .dp-cam { animation-duration:.01s !important; transition-duration:.01s !important; }
    }
"""

SLOT = (
    '<button class="dslot" data-i="{i}" style="--i:{i}">'
    '<span class="ds-light" aria-hidden="true"></span><span class="ds-glow" aria-hidden="true"></span>'
    '<span class="ds-prize"></span>'
    '<span class="ds-rail" aria-hidden="true"><img src="./assets/matou/doors/wagon_rail.png" alt=""></span>'
    '<span class="ds-leaf" aria-hidden="true"><img class="ds-leaf-img" src="./assets/matou/doors/vault_door.png" alt="">'
    '<img class="ds-dial" src="./assets/matou/doors/vault_dial.png" alt="">'
    '<img class="ds-pad" src="./assets/matou/doors/padlock.png" alt=""></span>'
    '<span class="ds-num">{n}</span></button>'
)

HTML = """    <div class="door-pick" id="doorPick" data-theme="heist">
      <div class="dp-stage" id="dpStage">
        <div class="dp-cam" id="dpCam">
          <div class="dp-bg"></div>
          <span class="dp-lamp l" aria-hidden="true"></span><span class="dp-lamp r" aria-hidden="true"></span>
          <div class="dp-slots">
            """ + "\n            ".join(SLOT.format(i=i, n=n) for i, n in enumerate(["I", "II", "III"])) + """
          </div>
          <img class="door-enter" id="doorEnter" src="./assets/matou/cat.png" alt="">
          <div class="dp-burst" id="dpBurst"></div>
          <div class="dp-fog" aria-hidden="true"></div>
        </div>
      </div>
      <div class="dp-vign" aria-hidden="true"></div>
      <header class="dp-head">
        <span class="dp-kicker" id="dpKicker">HEIST &middot; VAULT BOOST</span>
        <h2 class="dp-title" id="dpHint">PICK A SAFE</h2>
        <p class="dp-sub" id="dpSub">Three safes. Three boosts. Only one is yours.</p>
      </header>
      <footer class="dp-foot">
        <p class="dp-odds-title" id="dpOddsTitle">BEHIND THE SAFES</p>
        <div class="dp-odds" id="dpOdds"></div>
      </footer>
    </div>
"""

JS = r"""    const DOOR_UI = {
      heist: {
        kicker:"HEIST \u00b7 VAULT BOOST", title:"PICK A SAFE", odds:"BEHIND THE SAFES",
        sub:"Three safes. Three boosts. Only one is yours.",
        door:"./assets/matou/doors/vault_door.png", noun:"Safe",
        slots:[[22.6,43.6],[50.1,43.6],[77.4,43.6]],
      },
      gold: {
        kicker:"GOLD RUSH \u00b7 TRAIN BOOST", title:"PICK A WAGON", odds:"INSIDE THE WAGONS",
        sub:"Three wagons. Three boosts. Only one is yours.",
        door:"./assets/matou/doors/wagon_door.png", noun:"Wagon",
        slots:[[21.2,47.4],[50.1,47.4],[79.3,47.4]],
      },
    };
    const BOOST_INFO = {
      respins:{ ico:"+1", desc:"Start with 1 extra respin" },
      locks:{ img:"./assets/matou/symbols/H2.jpg", desc:"2 sacks locked from the start" },
      mult:{ ico:"\u00d72", desc:"The whole pot is doubled" },
      spins:{ ico:"+2", desc:"2 extra free spins" },
      gold:{ img:"./assets/matou/symbols/ingot_1.png", desc:"3 cells start as gold" },
      bomb:{ img:"./assets/matou/symbols/GW.png", desc:"A Gold Bomb is guaranteed" },
    };
    const boostIco = (id) => {
      const b = BOOST_INFO[id] || {};
      return b.img ? `<img src="${b.img}" alt="">` : `<em>${b.ico || "?"}</em>`;
    };
    function dpBurst(x, y, n=40) {
      const host=$("dpBurst");
      if (!host) return;
      for (let k=0; k<n; k++) {
        const p=document.createElement("i");
        if (k % 4 === 0) p.className="bar";
        const ang = -Math.PI/2 + (Math.random()-.5) * Math.PI * 1.25;
        const dist = 6 + Math.random() * 16;
        p.style.cssText = `--sx:${x};--sy:${y};--dx:${(Math.cos(ang)*dist).toFixed(2)}cqw;--dy:${(Math.sin(ang)*dist).toFixed(2)}cqw;`
          + `--r:${Math.round((Math.random()-.5)*900)}deg;--sz:${(.6+Math.random()*.9).toFixed(2)}cqw;--t:${(.9+Math.random()*.6).toFixed(2)}s`;
        host.appendChild(p);
      }
      setTimeout(() => { host.innerHTML=""; }, 1700);
    }
    function pickDoor(kind="heist") {
      return new Promise(async (resolve) => {
        const theme = kind === "gold" ? "gold" : "heist";
        const ui = DOOR_UI[theme];
        const base = (M.DOOR_FX[theme] || M.DOOR_FX.heist).map((d)=>({...d}));
        const effects = shuffle(base.slice());
        const root=$("doorPick");
        const fast = state.fast || state.skip;
        root.className = "door-pick";
        root.dataset.theme = theme;
        root.style.removeProperty("--fx"); root.style.removeProperty("--fy");
        $("dpKicker").textContent = ui.kicker;
        $("dpHint").textContent = ui.title;
        $("dpHint").classList.remove("pop");
        $("dpSub").textContent = ui.sub;
        $("dpOddsTitle").textContent = ui.odds;
        $("dpOdds").innerHTML = base.map((d)=>`<div class="dp-chip" data-id="${d.id}"><i>${boostIco(d.id)}</i><span><b>${d.label}</b><small>${(BOOST_INFO[d.id]||{}).desc||""}</small></span></div>`).join("");
        $("dpBurst").innerHTML = "";
        const slots=[...root.querySelectorAll(".dslot")];
        slots.forEach((btn,i) => {
          const e=effects[i];
          btn.className="dslot";
          btn.style.setProperty("--x", ui.slots[i][0]);
          btn.style.setProperty("--y", ui.slots[i][1]);
          btn.querySelector(".ds-leaf-img").src = ui.door;
          btn.querySelector(".ds-prize").innerHTML = `<span class="ds-ico">${boostIco(e.id)}</span><b>${e.label}</b><small>${(BOOST_INFO[e.id]||{}).desc||""}</small>`;
          btn.setAttribute("aria-label", `${ui.noun} ${i+1}`);
        });
        void root.offsetWidth;
        root.classList.add("on","intro");
        if (window.MatouFX) MatouFX.iris({ open:true, ms:650, center:{ x:.5, y:.45 } });
        for (let i=0; i<3; i++) setTimeout(() => sfx(theme==="gold" ? "door" : "slam", i), (fast?120:520) + i*(fast?90:220));
        setTimeout(() => sfx("lock"), fast ? 420 : 1250);
        await wait(fast ? 650 : 2000);
        root.classList.remove("intro");
        root.classList.add("ready");
        let done=false;
        slots.forEach((btn,i) => {
          btn.onclick = async () => {
            if (done) return; done=true;
            const e=effects[i];
            const [sx, sy] = ui.slots[i];
            root.classList.add("done");
            btn.classList.add("picked","unlock");
            root.style.setProperty("--fx", sx + "%");
            root.style.setProperty("--fy", sy + "%");
            root.classList.add("focus");
            sfx("lock");
            await wait(tempoPick(850,320));
            sfx("door");
            btn.classList.add("open");
            await wait(tempoPick(260,120));
            dpBurst(sx, sy);
            sfx("coin");
            const hint=$("dpHint");
            hint.textContent = e.label;
            hint.classList.remove("pop"); void hint.offsetWidth; hint.classList.add("pop");
            $("dpSub").textContent = (BOOST_INFO[e.id]||{}).desc || "";
            root.querySelectorAll(".dp-chip").forEach((c)=>c.classList.toggle("won", c.dataset.id===e.id));
            await wait(tempoPick(1000,420));
            const enter=$("doorEnter");
            enter.style.setProperty("--ex", sx);
            enter.style.setProperty("--ey", sy);
            root.classList.add("entering");
            sfx("bonus");
            await wait(tempoPick(1000,520));
            root.classList.remove("focus");
            slots.filter((d)=>d!==btn).forEach((d,k) => setTimeout(() => { d.classList.add("other","unlock","open"); sfx("door"); }, k*220));
            await wait(tempoPick(1500,700));
            if (window.MatouFX) await MatouFX.toFeature(theme);
            root.className = "door-pick";
            root.dataset.theme = theme;
            slots.forEach((d)=>{ d.className="dslot"; d.onclick=null; });
            resolve(e);
          };
        });
      });
    }
"""

s = cut(s, "    .door-pick { position:absolute; inset:0; z-index:27;", "    .wipe { position:absolute;", CSS_A)
s = cut(s, "    /* Thematic doors */", "  </style>", "")
s = cut(s, '    <div class="door-pick" id="doorPick">', '    <div class="wipe" id="vaultWipe">', HTML)
s = cut(s, '    function pickDoor(kind="heist") {', "    function popRespins() {", JS)
P.write_text(s, encoding="utf-8", newline="\n")
print("ok")
