/* ===== 冷战热斗 · 主控 ===== */

/* ---------- 全局操作结算 ---------- */
async function doOps(mode, cid){
  const g = G;
  const player = g.activePlayer;
  const card = g.pendingOpsCard;
  if(!card) return;
  const budget = g.pendingOps;
  if(budget <= 0 && mode === 'place') { toast('无剩余 Ops'); return; }

  if(mode === 'place'){
    if(!canPlaceInfluence(player, cid)){ toast('该国家不可放置'); return; }
    const cost = placeCost(player, cid);
    if(cost > budget){ toast('Ops 不足'); return; }
    addInf(player, cid, 1);
    g.pendingOps -= cost;
    // 军事行动判定
    const c = COUNTRIES[cid];
    if(c.battleground){
      if(c.stability <= 2 && getInf(opponent(player), cid) > 0 && !isControlled(player, cid)){
        g.milOps[player] += 1;
        if(window.FX) FX.warTrail(opponent(player) === 'us' ? 'us' : 'ussr', cid);
        setTimeout(()=>changeDefcon(-1), 900);
      }
    }
    if(window.FX) FX.placeInf(cid);
    log(`放置：${player==='us'?'美国':'苏联'} → ${c.name}`, player);
  } else if(mode === 'coup'){
    const c = COUNTRIES[cid];
    if(!c.battleground){ toast('仅战斗国可政变'); return; }
    if(!c.stability || c.stability > 2){ toast('稳定度过高，不可政变'); return; }
    if(!hasAdjInf(player, cid)){ toast('需要邻接影响力'); return; }
    if((card.ops || 0) < 2 && getOpsValue(card, player) < 2){ toast('政变需要 2 Ops'); return; }
    // NATO 保护
    if(G.flags.nato && isControlled('us', cid) && (WESTERN_EUROPE.includes(cid) || EASTERN_EUROPE.includes(cid))){
      toast('北约保护，无法政变'); return;
    }
    const mod = -1 * ((SUPERPOWER_LINKS[player]||[]).includes(cid) ? 1 : 0);
    const r = rollDie(mod);
    log(`政变 ${c.name}：掷骰 ${r}${mod<0?'(-1)':''}`, player);
    if(window.FX) FX.shake(4);
    if(r >= 5){
      const before = isControlled(player, cid);
      const s = getInf(player, cid), o = getInf(opponent(player), cid);
      if(s <= o) addInf(player, cid, o - s + 1);
      if(!before && isControlled(player, cid) && c.battleground && (c.stability <= 2)){
        g.milOps[player] += 1;
        setTimeout(()=>changeDefcon(-1), 600);
      }
      if(window.FX) FX.coup(cid);
      log(`政变成功！${c.name} 易主`, player);
    } else {
      log(`政变失败`, player);
    }
  } else if(mode === 'realign'){
    const c = COUNTRIES[cid];
    if(!c.battleground){ toast('仅战斗国可调整'); return; }
    if(!hasAdjInf(player, cid)){ toast('需要邻接影响力'); return; }
    if((WESTERN_EUROPE.includes(cid) || EASTERN_EUROPE.includes(cid)) && G.flags.nato){
      toast('北约保护'); return;
    }
    const r = rollDie();
    if(window.FX) FX.shake(3);
    log(`调整 ${c.name}：掷骰 ${r}`, player);
    if(r >= 3){
      const opp = opponent(player);
      const s = getInf(player, cid), o = getInf(opp, cid);
      if(Math.abs(s - o) > 1){
        remInf(player, cid, Math.abs(s-o) > 1 ? 1 : 0);
        addInf(opp, cid, 1);
      } else {
        remInf(player, cid, 1);
        addInf(opp, cid, 1);
      }
      if(window.FX) FX.explosion(cid, false);
      log(`调整成功`, player);
    } else {
      log(`调整失败`, player);
    }
  }

  g.pendingOps = Math.max(0, g.pendingOps);
  UI.render();
  if(g.pendingOps <= 0){
    setTimeout(finishOpsPlay, 900);
  }
}

function finishOpsPlay(){
  const g = G;
  // 清除回合性效果
  if(g.pendingOpsCard){
    if(g.pendingOpsCard.scoring){
      // 纯 ops 卡不会
    }
  }
  // 太空自动推进：无 ops 卡用于太空
  setTimeout(() => {
    closeOpsState();
    nextActivePlayer();
  }, 700);
}

function closeOpsState(){
  const g = G;
  g.pendingOps = 0;
  // Ops 用完了，卡进废牌堆
  if(g.pendingOpsCard){ discardCard(g.pendingOpsCard); g.pendingOpsCard = null; }
  // 结束本次出牌
  finishPlay();
}

async function finishPlay(){
  const g = G;
  g.playerTurnCardPlayed = true;
  // 补手牌
  fillHandTo6(g.activePlayer);
  // 检查胜负
  checkWin();
  UI.render();
  await new Promise(r => setTimeout(r, 900));
  if(G.phase === 'ended') return;
  // 交换主动权给对手
  switchActive();
}

function switchActive(){
  const g = G;
  g.activePlayer = opponent(g.activePlayer);
  g.currentPlayerSide = g.activePlayer;
  g.playerTurnCardPlayed = false;
  if(G.deck.length > 0) g.hand[g.activePlayer].push(G.deck.pop());
  fillHandTo6(g.activePlayer);
  showTurnOverlay();
  if(window.MUSIC && MUSIC.isPlaying()) MUSIC.play(g.activePlayer);
  UI.render();
  if(G.mode === 'ai' && g.activePlayer !== g.playerSide){
    setTimeout(aiTurn, 1800);
  }
}

/* ---------- 玩家回合开始 ---------- */
function playerStartTurn(){
  const g = G;
  if(g.turnStarted) {
    // 已抽牌，直接进阶段
    g.phase = 'playEvent';
    UI.render();
    return;
  }
  if(g.deck.length > 0) g.hand[g.activePlayer].push(G.deck.pop());
  fillHandTo6(g.activePlayer);
  g.turnStarted = true;
  g.phase = 'playEvent';
  showTurnOverlay();
  UI.render();
  if(G.mode === 'ai' && g.activePlayer !== g.playerSide){
    setTimeout(aiTurn, 1600);
  }
}

/* ---------- 结束当前出牌回合 → 下一回合 ---------- */
function endTurn(){
  const g = G;
  g.turn++;
  g.playsThisTurn = 0;
  const oldP = getPeriod(g.turn - 1);
  const newP = getPeriod(g.turn);
  if(oldP !== newP){
    log(`进入${{early:'早期战争',mid:'危机战争',late:'冷战晚期'}[newP]}`, 'sys');
    if(newP === 'mid'){
      const newCards = CARDS.filter(c=>c.period==='mid').map(c=>({...c}));
      G.deck = shuffle([...G.deck, ...shuffle(newCards)]);
    } else if(newP === 'late'){
      const newCards = CARDS.filter(c=>c.period==='late').map(c=>({...c}));
      G.deck = shuffle([...G.deck, ...shuffle(newCards)]);
    }
  }
  if(g.turn > 10){
    if(g.vp.us > g.vp.ussr) declareWinner('us', `终局 VP: 美国 ${g.vp.us} - 苏联 ${g.vp.ussr}`);
    else if(g.vp.ussr > g.vp.us) declareWinner('ussr', `终局 VP: 苏联 ${g.vp.ussr} - 美国 ${g.vp.us}`);
    else declareWinner('draw', '平局');
    return;
  }
  g.turnStarted = false;
  g.phase = 'turnStart';
  if(window.FX) FX.flash('#c9a96a', 6);
  UI.render();
  setTimeout(playerStartTurn, 1500);
}

/* ---------- 掷骰决定先手 ---------- */
let diceState = {us: null, ussr: null};
function rollFirstDice(player){
  const n = 1 + Math.floor(Math.random()*6);
  diceState[player] = n;
  const box = el('turnDiceResult');
  box.innerHTML = '';
  const us = diceState.us, ss = diceState.ussr;
  if(us !== null && ss !== null){
    if(us > ss) box.innerHTML = `<b class="us-vp">美国</b> 掷出 ${us} - ${ss} <b class="ussr-vp">苏联</b> · 美国先手`;
    else if(ss > us) box.innerHTML = `<b class="us-vp">美国</b> 掷出 ${us} - ${ss} <b class="ussr-vp">苏联</b> · 苏联先手`;
    else box.innerHTML = `<b class="us-vp">美国</b> 掷出 ${us} - ${ss} <b class="ussr-vp">苏联</b> · 重掷`;
  } else {
    box.textContent = `${player==='us'?'美国':'苏联'} 掷出 ${n}`;
  }
  if(window.SFX) SFX.play('dice');
  renderDiceFaces(n, player, box);
}
function renderDiceFaces(n, player, box){
  const dots = ['.1.','.3.','.2.','.5.','.4.','.6.'];
  box.insertAdjacentHTML('beforeend', `<div class="inline-dice ${player}">${dots[n-1]}</div>`);
}

/* ---------- 启动 ---------- */
let startOpts = { mode:'hotseat', side:'random' };
function startGame(opts){
  startOpts = Object.assign({}, startOpts, opts);
  let first = diceState.us !== null && diceState.ussr !== null
    ? (diceState.us > diceState.ussr ? 'us' : diceState.ussr > diceState.us ? 'ussr' : 'ussr')
    : (Math.random() < 0.5 ? 'us' : 'ussr');
  let side = startOpts.side === 'random' ? (Math.random() < 0.5 ? 'us' : 'ussr') : startOpts.side;
  initGame({
    mode: startOpts.mode,
    side,
    firstPlayer: first,
  });
  const ts = el('turnSelect');
  if(ts) ts.classList.add('hidden');
  UI.render();
  setTimeout(playerStartTurn, 1200);
}

function el(id){ return document.getElementById(id); }
function toast(msg){
  const t = el('toast');
  if(!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(()=>t.classList.remove('show'), 2000);
}

function showTurnOverlay(){
  const overlay = el('turnOverlay');
  const text = el('turnOverlayText');
  const sub = el('turnOverlaySub');
  if(!overlay) return;
  const pName = G.activePlayer === 'us' ? '美国' : '苏联';
  const pNameEn = G.activePlayer === 'us' ? 'UNITED STATES' : 'SOVIET UNION';
  text.textContent = `${pName} 出牌`;
  sub.textContent = `回合 ${G.turn} · ${{early:'早期战争',mid:'危机战争',late:'冷战晚期'}[getPeriod(G.turn)]} · ${pNameEn}`;
  // 重启动画：清掉上一轮状态，reflow 让 turnShow(1.5s) 从头跑
  overlay.classList.remove('hidden', 'fade-out');
  void overlay.offsetWidth;
  if(window.FX) FX.flash(G.activePlayer === 'us' ? '#4a7fb5' : '#c8102e', 8);
  if(window.FX) FX.shake(5);
  // 1.4s 后开始淡出，2.1s 无条件收起
  // 兜底原因：动画依赖 CSS transition/animation，标签页被挂起或用户开
  // reduced-motion 时可能永远停在中间帧，不留兜底就会永远挡屏
  clearTimeout(showTurnOverlay._fade);
  clearTimeout(showTurnOverlay._hide);
  showTurnOverlay._fade = setTimeout(() => overlay.classList.add('fade-out'), 1400);
  showTurnOverlay._hide = setTimeout(() => overlay.classList.add('hidden'), 2100);
}

/* ---------- 事件绑定 ---------- */
function bindEvents(){
  // 起始选择
  document.querySelectorAll('#btnDiceUs').forEach(b => b.addEventListener('click', () => rollFirstDice('us')));
  document.querySelectorAll('#btnDiceUssr').forEach(b => b.addEventListener('click', () => rollFirstDice('ussr')));
  document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('[data-mode]').forEach(x=>x.classList.remove('selected'));
    b.classList.add('selected');
    startOpts.mode = b.dataset.mode;
  }));
  document.querySelectorAll('[data-side]').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('[data-side]').forEach(x=>x.classList.remove('selected'));
    b.classList.add('selected');
    startOpts.side = b.dataset.side;
  }));
  el('btnStart').addEventListener('click', () => startGame());

  // 规则
  el('btnRules').addEventListener('click', () => el('rulesModal').classList.toggle('hidden'));
  el('btnRulesClose').addEventListener('click', () => el('rulesModal').classList.add('hidden'));

  // 音乐/FX
  el('btnMusic').addEventListener('click', () => {
    if(!MUSIC.isPlaying()){
      MUSIC.toggle();
      el('btnMusic').classList.add('on');
      const st = MUSIC.trackStatus();
      toast(`音乐开 · ${MUSIC.hasOriginal()?'原曲加载':'合成兜底'}`);
    } else {
      MUSIC.stop();
      el('btnMusic').classList.remove('on');
    }
  });
  el('btnFx').addEventListener('click', () => {
    const cur = FX._enabled = !FX._enabled;
    FX.setEnabled(cur);
    el('btnFx').classList.toggle('on', cur);
    toast(`特效 ${cur?'开':'关'}`);
  });

  // Drop zones —— 点击与拖拽共用同一条结算路径
  function resolveZone(zone){
    const g = G;
    if(!g.pendingOpsCard) return false;
    if(zone === 'ops' && getOpsValue(g.pendingOpsCard, g.activePlayer) <= 0){ toast('该卡无 Ops'); return false; }
    if(zone === 'space' && spaceStepOf(g.pendingOpsCard, g.activePlayer) <= 0){ toast('该卡无太空步数'); return false; }
    closeDropOverlay();
    if(zone === 'event'){
      playCardEvent(g.pendingOpsCard, g.activePlayer);
      g.pendingOpsCard = null;
      afterCardPlayed();
    } else if(zone === 'ops'){
      g.pendingOps = getOpsValue(g.pendingOpsCard, g.activePlayer);
      toast(`使用 ${g.pendingOps} Ops · 点击地图国家放置，或点右侧操作按钮政变/调整`);
      el('actionButtons').classList.add('active');
      document.querySelectorAll('.action-btn').forEach(b => b.classList.remove('disabled'));
      document.querySelector('.action-btn.ops').classList.add('active');
      g.phase = 'playOps';
      g.playerTurnCardPlayed = true;
    } else if(zone === 'space'){
      const step = spaceStepOf(g.pendingOpsCard, g.activePlayer);
      g.space[g.activePlayer] = Math.min(8, g.space[g.activePlayer] + step);
      log(`太空竞赛 +${step}`, g.activePlayer);
      if(window.FX) FX.rocket(g.activePlayer);
      if(g.space[g.activePlayer] >= 8) declareWinner(g.activePlayer, '太空竞赛胜利');
      g.pendingOpsCard = null;
      afterCardPlayed();
    } else if(zone === 'cancel'){
      // 取消：把选定的卡还给手牌，别丢了
      if(g.pendingOpsCard){
        g.hand[g.activePlayer].push(g.pendingOpsCard);
        g.hand[g.activePlayer].sort((a,b) => a.n - b.n);
        g.pendingOpsCard = null;
      }
    }
    UI.render();
    return true;
  }
  window.resolveZone = resolveZone;

  document.querySelectorAll('.drop-zone').forEach(z => {
    z.addEventListener('click', () => resolveZone(z.dataset.zone));
  });

  // 操作按钮
  document.querySelectorAll('.action-btn').forEach(b => {
    b.addEventListener('click', () => {
      const mode = b.dataset.zone;
      const g = G;
      if(!g.pendingOpsCard){
        toast('请先打出一张 Ops 卡');
        return;
      }
      if(mode === 'event'){
        playCardEvent(g.pendingOpsCard, g.activePlayer);
        g.pendingOpsCard = null;
        afterCardPlayed();
      } else if(mode === 'ops'){
        g.pendingOps = getOpsValue(g.pendingOpsCard, g.activePlayer);
        toast(`点击地图国家放置 ${g.pendingOps} Ops`);
        g.phase = 'playOps';
      } else if(mode === 'space'){
        const step = spaceStepOf(g.pendingOpsCard, g.activePlayer);
        if(step <= 0){ toast('该卡无太空步数'); return; }
        g.space[g.activePlayer] = Math.min(8, g.space[g.activePlayer] + step);
        log(`太空竞赛 +${step}`, g.activePlayer);
        if(window.FX) FX.rocket(g.activePlayer);
        if(g.space[g.activePlayer] >= 8) declareWinner(g.activePlayer, '太空竞赛胜利');
        g.pendingOpsCard = null;
        afterCardPlayed();
      }
      UI.render();
    });
  });

  // 空格/回车结束回合
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape'){ closeDropOverlay(); return; }
    if(e.key === ' ' && G.phase !== 'ended' && G.phase !== 'playOps'){
      e.preventDefault();
      endTurn();
    }
  });
}

function playCardEvent(card, player){
  const g = G;
  showCentralCardPreview(card, 'event', player);
  // 移除手牌
  const idx = g.hand[player].indexOf(card);
  if(idx >= 0) g.hand[player].splice(idx, 1);
  setTimeout(() => {
    playEvent(card, player);
    fillHandTo6(player);
    checkWin();
    UI.render();
  }, 600);
}

function showCentralCardPreview(card, mode, player){
  if(window.UI) UI.showCentralCard(card, mode, player, 2600);
}

function afterCardPlayed(){
  const g = G;
  // 一个回合 = 双方各出 1 张。满 2 次自动推进回合
  g.playsThisTurn = (g.playsThisTurn || 0) + 1;
  setTimeout(() => {
    if(g.playsThisTurn >= 2) endTurn();
    else switchActive();
  }, 1200);
}

function spaceStepOf(card, player){
  if(card.scoring) return 0;
  if(card.n === 80) return 1;
  const ops = getOpsValue(card, player);
  if(ops <= 0) return 0;
  return ops >= 3 ? 2 : 1;
}

/* ---------- AI ---------- */
function aiTurn(){
  const g = G;
  if(G.phase === 'ended') return;
  if(g.activePlayer === g.playerSide) return;
  const hand = g.hand[g.activePlayer] || [];
  if(hand.length === 0){
    setTimeout(endTurn, 800);
    return;
  }
  const side = g.activePlayer;
  const diff = (startOpts.difficulty || 'normal');
  // 决策
  let choice = null;
  const scored = hand.map(c => ({c, s: scoreAIMove(c, side, diff)}));
  scored.sort((a,b)=>b.s-a.s);
  choice = scored[Math.floor(Math.random()*Math.min(3, scored.length))];
  const card = choice.c;
  // 模式选择
  const mode = chooseAIMode(card, side);
  // 显示
  const idx = g.hand[side].indexOf(card);
  if(idx >= 0) g.hand[side].splice(idx, 1);
  g.pendingOpsCard = card;
  UI.showCentralCard(card, mode, side, 3400);
  log(`AI(${side==='us'?'美国':'苏联'}) 打出：${card.zh} [${mode==='event'?'事件':mode==='ops'?'操作':'太空'}]`, 'sys');
  setTimeout(() => {
    if(mode === 'event'){
      playEvent(card, side);
    } else if(mode === 'ops'){
      const ops = getOpsValue(card, side);
      aiDoOps(side, ops, card);
      fillHandTo6(side);
      checkWin();
      UI.render();
      setTimeout(switchActive, 1600);
      return;
    } else {
      const step = spaceStepOf(card, side);
      g.space[side] = Math.min(8, g.space[side] + step);
      log(`太空竞赛 +${step}`, side);
      if(window.FX) FX.rocket(side);
      if(g.space[side] >= 8) declareWinner(side, '太空竞赛胜利');
      fillHandTo6(side);
      checkWin();
      UI.render();
      setTimeout(switchActive, 1400);
      return;
    }
    fillHandTo6(side);
    checkWin();
    UI.render();
    setTimeout(switchActive, 1800);
  }, 3000);
}

function scoreAIMove(card, side, diff){
  let s = Math.random() * (diff === 'hard' ? 1 : 3);
  if(card.scoring){
    // 看哪个区域对我有利
    const res = scoreRegion(card.scoring);
    s += (res.scores[side] - res.scores[opponent(side)]) * 2;
  } else {
    s += (card.ops || 0);
    // 战争卡加分
    if(['11','13','24','102','84','89'].includes(String(card.n))) s += 1.5;
    // 高分事件
    if([40,46,100,77].includes(card.n)) s += 1;
  }
  if(diff === 'hard') s += (card.ops||0) * 0.3;
  return s;
}

function chooseAIMode(card, side){
  if(card.scoring) return 'event';
  if(!card.text) return 'ops';
  const ops = getOpsValue(card, side);
  const sp = spaceStepOf(card, side);
  const oppSpace = G.space[opponent(side)];
  if(sp > 0 && (G.space[side] >= 6 || oppSpace >= 6) && Math.random() < 0.5) return 'space';
  if(card.text && Math.random() < 0.62) return 'event';
  if(ops > 0) return 'ops';
  return 'event';
}

async function aiDoOps(side, ops, card){
  // 尝试政变低稳定度战斗国
  const targets = Object.keys(COUNTRIES).filter(cid => {
    const c = COUNTRIES[cid];
    return c.battleground && c.stability <= 2 && hasAdjInf(side, cid) && !isControlled(side, cid);
  });
  let budget = ops;
  for(const cid of targets.slice(0, budget)){
    if(budget < 2) break;
    if(G.flags.nato && isControlled('us', cid) && (WESTERN_EUROPE.includes(cid) || EASTERN_EUROPE.includes(cid))) continue;
    const r = rollDie();
    log(`AI 政变 ${COUNTRIES[cid].name}：掷骰 ${r}`, side);
    if(window.FX) FX.shake(4);
    if(r >= 5){
      const s = getInf(side, cid), o = getInf(opponent(side), cid);
      if(s <= o) addInf(side, cid, o - s + 1);
      if(window.FX) FX.coup(cid);
      G.milOps[side] += 1;
      if(G.milOps[side] > 0) changeDefcon(-1);
      budget -= 2;
    } else {
      budget -= 2;
    }
    UI.render();
    await new Promise(r => setTimeout(r, 700));
  }
  // 剩余 ops 放普通国
  let placed = 0;
  const allCids = Object.keys(COUNTRIES).filter(cid => !COUNTRIES[cid].superpower);
  while(budget > 0 && placed < 3){
    const candidates = allCids.filter(cid => canPlaceInfluence(side, cid) && !COUNTRIES[cid].battleground);
    if(!candidates.length) break;
    const pick = candidates.sort((a,b) => {
      const ca = COUNTRIES[a], cb = COUNTRIES[b];
      return (cb.stability - ca.stability);
    })[0];
    if(!pick) break;
    addInf(side, pick, 1);
    budget--; placed++;
    if(window.FX) FX.placeInf(pick);
    log(`AI 放置 → ${COUNTRIES[pick].name}`, side);
    UI.render();
    await new Promise(r => setTimeout(r, 350));
  }
}

/* ---------- 启动 ---------- */
window.addEventListener('DOMContentLoaded', () => {
  buildMapSVG();
  FX.init();
  FX.setEnabled(true);
  el('btnFx').classList.add('on');
  MUSIC.init();
  MUSIC.preload().then(() => {
    const st = MUSIC.trackStatus();
    if(st.us === 'none' && st.ussr === 'none'){
      setTimeout(() => toast('未检测到原曲 mp3 · 使用合成兜底'), 600);
    }
  });
  bindEvents();
  el('turnSelect').classList.remove('hidden');
});
