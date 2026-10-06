/* ===== 冷战热斗 · 主控 =====
 * 交互入口：点击 / 拖拽 / 键盘 / 联机 汇聚到这里；
 * 规则结算一律走 engine.js，界面刷新只调 UI.render()。
 */

/* ---------- 出牌主入口 ---------- */
function playCard(card, mode){
  const g = G;
  if(g.phase === 'ended') return;
  const player = g.activePlayer;
  if(!g.pendingOpsCard){
    const i = g.hand[player].indexOf(card);
    if(i >= 0) g.hand[player].splice(i, 1);
  } else if(g.pendingOpsCard !== card){
    UI.returnPendingCard(true);
    const i = g.hand[player].indexOf(card);
    if(i >= 0) g.hand[player].splice(i, 1);
  }
  g.pendingOpsCard = card;
  g.pendingOps = getOpsValue(card, player);

  UI.closeDropOverlay();
  UI.hideDragStrip();
  UI.showCentralCard(card, mode, player, 1500);
  if(window.FX){ FX.flash(player === 'us' ? '#4a7fb5' : '#c8102e', 6); FX.shake(2); }
  if(window.SFX) SFX.play('card');

  if(mode === 'space'){
    applySpaceStep(player, 1);
    g.pendingOpsCard = null; g.pendingOps = 0;
    afterCardPlayed();
  } else if(mode === 'ops'){
    g.phase = 'playOps';
    _opsMode = 'place';
    UI.render();
    showOpsPanel();
    if(g.pendingOps > 0) toast(`已出 ${g.pendingOps} Ops · 点地图放置，或选政变/调整`);
    else toast('本卡没有可放置的 Ops');
  } else {
    // 事件：先把 pending 卡真正移出手牌，再结算（否则事件会二次操作）
    playEvent(card, player);
    g.pendingOpsCard = null; g.pendingOps = 0;
    afterCardPlayed();
  }
}
window.playCard = playCard;

/* ---------- 投放面板 / 行动条 → 出牌 ---------- */
function resolveZone(zone){
  const g = G;
  if(!g.pendingOpsCard){
    UI.returnPendingCard(true);
    UI.closeDropOverlay();
    UI.hideDragStrip();
    return;
  }
  if(zone === 'cancel'){
    UI.returnPendingCard(true);
    UI.closeDropOverlay();
    UI.hideDragStrip();
    UI.render();
    return;
  }
  if(zone === 'ops'){
    if(getOpsValue(g.pendingOpsCard, g.activePlayer) <= 0){
      toast('该卡没有 Ops');
      UI.returnPendingCard(true);
      UI.closeDropOverlay();
      UI.hideDragStrip();
      return;
    }
    playCard(g.pendingOpsCard, 'ops');
    return;
  }
  if(zone === 'space'){
    playCard(g.pendingOpsCard, 'space');
    return;
  }
  if(zone === 'event'){
    playCard(g.pendingOpsCard, 'event');
    return;
  }
  UI.closeDropOverlay();
  UI.hideDragStrip();
}
window.resolveZone = resolveZone;

/* ---------- Ops 面板：放置 / 政变 / 调整 ---------- */
let _opsMode = 'place';

function showOpsPanel(){
  const b = document.getElementById('opsPanel');
  if(b){ b.classList.remove('hidden'); b.classList.add('show'); }
}
function hideOpsPanel(){
  const b = document.getElementById('opsPanel');
  if(b){ b.classList.add('hidden'); b.classList.remove('show'); }
}
function setOpsMode(mode){
  _opsMode = mode;
  document.querySelectorAll('#opsPanel .action-btn').forEach(b =>
    b.classList.toggle('on', b.dataset.zone === mode));
}

function doOps(mode, cid){
  const g = G;
  const player = g.activePlayer;
  const card = g.pendingOpsCard;
  if(!card || g.phase !== 'playOps') return;
  const c = COUNTRIES[cid];
  if(!c){ return; }

  /* ---- 放置 ---- */
  if(mode === 'place'){
    if(!canPlaceInfluence(player, cid)){ deny(cid); toast('该国家不可放置'); return; }
    const cost = placeCost(player, cid);
    if(cost > g.pendingOps){ deny(cid); toast(`需要 ${cost} Ops，只剩 ${g.pendingOps}`); return; }
    addInf(player, cid, 1);
    g.pendingOps -= cost;
    if(c.battleground && c.stability <= 2 && getInf(opponent(player), cid) > 0 && !isControlled(player, cid)){
      g.milOps[player] += 1;
      if(window.FX) FX.warTrail(opponent(player) === 'us' ? 'us' : 'ussr', cid);
      if(window.FX) FX.defconAlarm();
      setTimeout(() => changeDefcon(-1), 620);
      toast('军事行动 · DEFCON −1');
    }
    if(window.FX) FX.placeInf(cid);
    if(window.SFX) SFX.play('place');
    flash(cid, player);
    panTo(cid);
    log(`放置 → ${c.name}`, player);
  }
  /* ---- 政变 ---- */
  else if(mode === 'coup'){
    if(!c.battleground){ deny(cid); toast('仅战地国可政变'); return; }
    if(c.stability > 2){ deny(cid); toast('稳定度过高，不可政变'); return; }
    if(!hasAdjInf(player, cid)){ deny(cid); toast('需要邻接影响力'); return; }
    if(isProtected(cid)){ deny(cid); toast('北约 / 联盟保护，不可政变'); return; }
    if(g.pendingOps < 2){ deny(cid); toast('政变需要 2 Ops'); return; }
    const mod = -1 * ((SUPERPOWER_LINKS[player]||[]).includes(cid) ? 1 : 0);
    const r = rollDie(mod);
    if(window.SFX) SFX.play('dice');
    showDice([{n:r, p:player, label:`政变 ${c.name}${mod<0?'  ·  −1':''}`}]);
    if(window.FX) FX.shake(4);
    g.pendingOps -= 2;
    if(r >= 5){
      const before = isControlled(player, cid);
      const s = getInf(player, cid), o = getInf(opponent(player), cid);
      if(s <= o) addInf(player, cid, o - s + 1);
      if(!before){
        g.milOps[player] += 1;
        if(window.FX) FX.defconAlarm();
        setTimeout(() => changeDefcon(-1), 620);
        toast('军事行动 · DEFCON −1');
      }
      if(window.FX) FX.coup(cid);
      if(window.SFX) SFX.play('boom');
      flash(cid, player);
      panTo(cid);
      log(`政变成功！${c.name} 易主`, player);
    } else {
      deny(cid);
      if(window.SFX) SFX.play('fail');
      log(`政变失败（掷出 ${r}）`, player);
    }
  }
  /* ---- 调整 ---- */
  else if(mode === 'realign'){
    if(!c.battleground){ deny(cid); toast('仅战地国可调整'); return; }
    if(!hasAdjInf(player, cid)){ deny(cid); toast('需要邻接影响力'); return; }
    if(isProtected(cid)){ deny(cid); toast('北约 / 联盟保护，不可调整'); return; }
    if(g.pendingOps < 5){ deny(cid); toast('调整需要 5 Ops'); return; }
    const r = rollDie();
    if(window.SFX) SFX.play('dice');
    showDice([{n:r, p:player, label:`调整 ${c.name}`}]);
    if(window.FX) FX.shake(3);
    g.pendingOps -= 5;
    if(r >= 3){
      const opp = opponent(player);
      const s = getInf(player, cid), o = getInf(opp, cid);
      if(Math.abs(s - o) <= 1){ remInf(player, cid, 1); addInf(opp, cid, 1); }
      else remInf(player, cid, 1);
      if(window.FX) FX.explosion(cid, false);
      if(window.SFX) SFX.play('boom');
      flash(cid, opp);
      panTo(cid);
      log(`调整成功：${c.name} 影响力易手`, player);
    } else {
      deny(cid);
      if(window.SFX) SFX.play('fail');
      log(`调整失败（掷出 ${r}）`, player);
    }
  }
  else return;

  g.pendingOps = Math.max(0, g.pendingOps);
  UI.render();
  if(g.pendingOps <= 0){ hideOpsPanel(); finishOpsPlay(); }
}
window.doOps = doOps;

/* 面板按钮：政变/调整 需要先选模式再点国家；放置可直接点国家 */
function onActionBtn(zone){
  const g = G;
  if(!g.pendingOpsCard || g.phase !== 'playOps') return;
  if(zone === 'done'){ hideOpsPanel(); closeOpsState(); return; }
  if(zone === 'cancel'){ hideOpsPanel(); UI.returnPendingCard(true); g.phase = 'playEvent'; UI.render(); return; }
  if(zone === 'event'){
    hideOpsPanel();
    playEvent(g.pendingOpsCard, g.activePlayer);
    g.pendingOpsCard = null; g.pendingOps = 0;
    afterCardPlayed();
    return;
  }
  if(zone === 'place'){ setOpsMode('place'); toast('点地图上的国家放置'); return; }
  setOpsMode(zone);
  toast(zone === 'coup' ? '已选政变 · 点地图上的战地国' : '已选调整 · 点地图上的战地国');
}
window.onActionBtn = onActionBtn;

/* 面板按钮上的「用当前目标」快捷方式：直接作用于最近被点过的国家 */
function applyToLastTarget(zone){
  const last = document.querySelector('.country[data-last="1"]');
  if(!last){
    setOpsMode(zone);
    toast('先在地图上点一个国家');
    return;
  }
  _lastTarget = last.dataset.cid;
  doOps(zone, _lastTarget);
}
let _lastTarget = null;

function closeOpsState(){
  const g = G;
  if(g.pendingOpsCard){ discardCard(g.pendingOpsCard); }
  g.pendingOpsCard = null;
  g.pendingOps = 0;
  g.phase = 'playEvent';
  g._opsTurn = 0;
  hideOpsPanel();
  finishPlay();
}
window.closeOpsState = closeOpsState;

function finishOpsPlay(){
  finishPlay();
}

/* 拖动卡片直接丢到国家上：先切进 ops 态，再立刻放置。
   访客侧是两个包按顺序到，房主顺序执行，语义完全一致。 */
function beginOps(card, player, cid){
  if(!card || !cid) return;
  if(getOpsValue(card, G.activePlayer) <= 0){ toast('该卡没有 Ops'); return; }
  playCard(card, 'ops');
  if(_opsMode !== 'place') setOpsMode('place');
  doOps('place', cid);
}
window.beginOps = beginOps;

/* ---------- 出牌收尾：计数 → 换边 / 进下一回合 ---------- */
function afterCardPlayed(){
  const g = G;
  g.playerTurnCardPlayed = true;
  g.playsThisTurn = (g.playsThisTurn || 0) + 1;
  UI.render();
  if(g.phase === 'ended') return;
  setTimeout(switchActive, 700);
}
function finishPlay(){
  const g = G;
  g.playerTurnCardPlayed = true;
  g.playsThisTurn = (g.playsThisTurn || 0) + 1;
  UI.render();
  if(g.phase === 'ended') return;
  setTimeout(switchActive, 700);
}
function switchActive(){
  const g = G;
  if(g.phase === 'ended') return;
  if(g.playsThisTurn >= 2){ endTurn(); return; }
  g.activePlayer = opponent(g.activePlayer);
  g.playerTurnCardPlayed = false;
  g.phase = 'playEvent';
  if(window.FX) FX.flash(g.activePlayer === 'us' ? '#4a7fb5' : '#c8102e', 5);
  if(window.SFX) SFX.play('turn');
  UI.render();
  if(g.mode === 'ai' && g.activePlayer !== g.playerSide) setTimeout(aiTurn, 1500);
  else if(g.mode === 'online' && NET && NET.remote() !== g.activePlayer){
    toast(`${g.activePlayer === 'us' ? '美国' : '苏联'} 回合 · 等待对方出牌`);
  }
}
window.switchActive = switchActive;

/* ---------- 键盘 ---------- */
window.addEventListener('keydown', e => {
  if(e.target && /input|textarea/i.test(e.target.tagName)) return;
  if(e.key === ' ' || e.key === 'Enter'){
    e.preventDefault();
    if(G.phase === 'ended') return;
    if(G.phase === 'playOps' && G.pendingOpsCard){ closeOpsState(); return; }
    endTurn();
  } else if(e.key === 'Escape'){
    UI.cancelDrag();
    UI.closeDropOverlay();
    hideOpsPanel();
  }
});

/* ---------- 视觉辅助 ---------- */
function deny(cid){
  const n = document.querySelector(`.country[data-cid="${cid}"]`);
  if(!n) return;
  n.classList.remove('deny'); void n.offsetWidth; n.classList.add('deny');
}
function flash(cid, side){
  const n = document.querySelector(`.country[data-cid="${cid}"]`);
  if(!n) return;
  n.classList.remove('flash-us','flash-ussr');
  void n.offsetWidth;
  n.classList.add(side === 'us' ? 'flash-us' : 'flash-ussr');
}
/* 镜头自动跟踪；用户手动平移/缩放后 2.6 秒内不打扰 */
function panTo(cid){
  if(!window.MAP) return;
  if(G._userMoved && performance.now() - G._userMoved < 2600) return;
  MAP.centerOn(cid);
}

/* ---------- 回合开始 ---------- */
function playerStartTurn(){
  const g = G;
  if(g.phase === 'ended') return;
  if(!g.turnStarted){
    drawOne(g.activePlayer);
    drawOne(opponent(g.activePlayer));
    g.turnStarted = true;
    log(`回合 ${g.turn} 开始`, 'sys');
  }
  g.phase = 'playEvent';
  g.playerTurnCardPlayed = false;
  if(window.FX) FX.flash('#c9a96a', 4);
  UI.render();
  if(g.mode === 'ai' && g.activePlayer !== g.playerSide) setTimeout(aiTurn, 1500);
}
window.playerStartTurn = playerStartTurn;

/* ---------- AI 对手 ---------- */
function aiTurn(){
  const g = G;
  if(g.phase === 'ended' || g.mode !== 'ai') return;
  if(g.activePlayer === g.playerSide) return;
  const side = g.activePlayer;
  const hand = g.hand[side] || [];
  if(!g.turnStarted){ drawOne(side); drawOne(opponent(side)); g.turnStarted = true; }
  if(!hand.length){ g.playsThisTurn = (g.playsThisTurn||0)+1; setTimeout(switchActive, 700); return; }

  const scored = hand.map(c => ({c, s: scoreAIMove(c, side)})).sort((a,b) => b.s - a.s);
  const card = scored[Math.floor(Math.random()*Math.min(3, scored.length))].c;
  const mode = chooseAIMode(card, side);
  const i = g.hand[side].indexOf(card);
  if(i >= 0) g.hand[side].splice(i, 1);
  g.pendingOpsCard = card;
  UI.showCentralCard(card, mode, side, 1500);
  log(`AI(${side==='us'?'美国':'苏联'}) 打出 ${card.zh}`, side);
  if(window.FX){ FX.flash(side==='us'?'#4a7fb5':'#c8102e', 6); FX.shake(2); }
  if(window.SFX) SFX.play('card');

  if(mode === 'ops'){ g.phase = 'playOps'; setTimeout(() => aiDoOps(side, card), 500); }
  else if(mode === 'space'){ applySpaceStep(side, 1); g.pendingOpsCard = null; afterCardPlayed(); }
  else { playEvent(card, side); g.pendingOpsCard = null; afterCardPlayed(); }
}

function scoreAIMove(card, side){
  const opp = opponent(side);
  let s = (card.ops||0) * 0.6;
  if(card.scoring){
    const r = scoreRegion(card.scoring);
    if(r.autoWin && r.winner === side) s = 10000;
    s += (r.scores[side] - r.scores[opp]) * 3;
  } else if(card.text){
    s += 1.2;
    if(card.n === 4) s += G.defcon * 1.6;
    if(card.n === 60 || card.n === 108) s += 1.4;
  }
  if(card.space && spaceCardOwner(card) === side && G.space[side] >= 4) s += 5;
  if(G.vp[side] - G.vp[opp] >= 3 && card.scoring) s += 2;
  return s + Math.random() * 0.9;
}
function chooseAIMode(card, side){
  if(card.scoring) return 'event';
  if(card.space && spaceCardOwner(card) === side)
    return (G.space[side] >= 4 || G.space[opponent(side)] >= 4) ? 'space' : 'event';
  if(card.text && Math.random() < 0.6) return 'event';
  if(getOpsValue(card, side) > 0) return 'ops';
  return 'event';
}

async function aiDoOps(side, card){
  let budget = getOpsValue(card, side);
  let guard = 0;
  while(budget > 0 && guard++ < 12 && G.phase !== 'ended'){
    // 政变候选
    let coup = null;
    for(const cid of Object.keys(COUNTRIES)){
      const c = COUNTRIES[cid];
      if(c.superpower || !c.battleground || c.stability > 2) continue;
      if(isControlled(side, cid) || !hasAdjInf(side, cid) || isProtected(cid)) continue;
      if(getInf(opponent(side), cid) === 0) continue;
      coup = cid; break;
    }
    if(coup && budget >= 2 && Math.random() < 0.5){
      const cid = coup; budget -= 2;
      const mod = -1 * ((SUPERPOWER_LINKS[side]||[]).includes(cid) ? 1 : 0);
      const r = rollDie(mod);
      if(window.FX) FX.shake(4);
      if(r >= 5){
        const before = isControlled(side, cid);
        const s = getInf(side, cid), o = getInf(opponent(side), cid);
        if(s <= o) addInf(side, cid, o - s + 1);
        if(!before){ G.milOps[side] += 1; if(window.FX) FX.defconAlarm(); setTimeout(() => changeDefcon(-1), 350); }
        if(window.FX) FX.coup(cid);
        log(`AI 政变成功 ${COUNTRIES[cid].name}`, side);
      } else log(`AI 政变失败（${r}）`, side);
      if(window.FX) FX.placeInf(cid);
      panTo(cid); UI.render();
      await new Promise(r => setTimeout(r, 300));
      continue;
    }
    // 放置
    const cands = Object.keys(COUNTRIES)
      .filter(c => !COUNTRIES[c].superpower && canPlaceInfluence(side, c));
    if(!cands.length) break;
    cands.sort((a,b) => {
      const ca = COUNTRIES[a], cb = COUNTRIES[b];
      return ((cb.battleground?2:0) + (4-cb.stability)) - ((ca.battleground?2:0) + (4-ca.stability));
    });
    const cid = cands[Math.floor(Math.random()*Math.min(4, cands.length))];
    const cost = placeCost(side, cid);
    if(cost <= 0) continue;
    if(cost > budget) break;
    addInf(side, cid, 1); budget -= cost;
    if(COUNTRIES[cid].battleground && COUNTRIES[cid].stability <= 2
       && getInf(opponent(side), cid) > 0 && !isControlled(side, cid)){
      G.milOps[side] += 1;
      if(window.FX){ FX.warTrail(opponent(side)==='us'?'us':'ussr', cid); FX.defconAlarm(); }
      setTimeout(() => changeDefcon(-1), 350);
    }
    if(window.FX) FX.placeInf(cid);
    panTo(cid); UI.render();
    await new Promise(r => setTimeout(r, 280));
  }
  closeOpsState();
}

/* ---------- 骰子展示 ---------- */
function showDice(rolls){
  const ov = document.getElementById('diceOverlay');
  if(!ov) return;
  const box = document.getElementById('diceValue');
  const res = document.getElementById('diceResult');
  if(box) box.textContent = String(rolls[0].n);
  if(res) res.textContent = rolls[0].label || '';
  ov.classList.remove('hidden');
  setTimeout(() => {
    ov.classList.add('hidden');
    if(box) box.textContent = '';
    if(res) res.textContent = '';
  }, 1050);
}

/* ---------- 开局 ---------- */
function startGame(opts){
  opts = Object.assign({mode:'hotseat', side:'random'}, opts || {});
  const side = opts.side === 'random' ? (Math.random() < 0.5 ? 'us' : 'ussr') : opts.side;
  const first = opts.firstPlayer || (Math.random() < 0.5 ? 'us' : 'ussr');
  const box = document.getElementById('turnSelect');
  if(box) box.classList.add('hidden');

  if(opts.mode === 'online'){
    if(!window.NET || !NET.enabled()){
      toast('请先在顶部「联机」里完成握手');
      if(box) box.classList.remove('hidden');
      return;
    }
    startNetGame(NET.room(), NET.side(), !NET.isHost());
  } else {
    NET && NET.close && NET.close();
    initGame({mode:opts.mode, side: side === 'random' ? null : side, firstPlayer:first});
    UI.render();
    playerStartTurn();
  }
}

/* ---------- 事件绑定 ---------- */
function bindAll(){
  // 主页模式/阵营选择
  document.querySelectorAll('[data-mode], #sideRow [data-side]').forEach(b => {
    b.addEventListener('click', () => {
      const sel = b.dataset.mode !== undefined ? '[data-mode]' : '#sideRow [data-side]';
      document.querySelectorAll(sel).forEach(x => x.classList.remove('selected'));
      b.classList.add('selected');
    });
  });
  const start = document.getElementById('btnStart');
  if(start) start.addEventListener('click', () => {
    const m = document.querySelector('[data-mode].selected');
    const s = document.querySelector('#sideRow [data-side].selected');
    startGame({
      mode: m ? m.dataset.mode : 'hotseat',
      side: s ? s.dataset.side : 'random',
      firstPlayer: Math.random() < 0.5 ? 'us' : 'ussr'
    });
  });
  // 联机相关全部交给 net.js 自己绑定，避免重复监听
  if(window.NET && NET.initUI) NET.initUI();
  // 规则弹窗开关
  const rm = document.getElementById('rulesModal');
  const rb = document.getElementById('btnRules');
  if(rb && rm) rb.addEventListener('click', () => rm.classList.toggle('hidden'));
  const rc = document.getElementById('btnRulesClose');
  if(rc && rm) rc.addEventListener('click', () => rm.classList.add('hidden'));
  // 结束本次出牌
  const eb = document.getElementById('btnEndPlay');
  if(eb) eb.addEventListener('click', () => { if(G.phase === 'playOps' && G.pendingOpsCard) closeOpsState(); });
  // Ops 面板按钮
  document.querySelectorAll('#opsPanel .action-btn').forEach(b => {
    b.addEventListener('click', e => { e.stopPropagation(); onActionBtn(b.dataset.zone); });
  });
  // 音乐 / 特效
  const mb = document.getElementById('btnMusic');
  // 音乐：按钮切播放/暂停，同时刷新按钮文案；滑条控总音量
  if(mb){
    mb.addEventListener('click', () => {
      MUSIC.toggle();
      mb.classList.toggle('on', MUSIC.isPlaying());
      mb.textContent = MUSIC.isPlaying() ? '♪ 停止' : '♪ 音乐';
    });
  }
  const vr = document.getElementById('volRange');
  if(vr){
    vr.addEventListener('input', () => MUSIC.setVolume(vr.value / 100));
  }
  const fb = document.getElementById('btnFx');
  if(fb) fb.addEventListener('click', () => FX.toggle && FX.toggle());
  // 国家点击
  document.addEventListener('click', e => {
    const n = e.target.closest('.country');
    if(!n || G.phase !== 'playOps') return;
    G._userMoved = 0;
    _lastTarget = n.dataset.cid;
    const el = n.querySelector('[data-last]');
    doOps(_opsMode, n.dataset.cid);
  });
}

/* ---------- 启动 ----------
 * 脚本挂在 </body> 前，等 main.js 执行时 DOM 往往已经解析完，
 * DOMContentLoaded 可能早已触发 → 不能只靠 addEventListener，必须判断 readyState。
 */
function boot(){
  if(typeof MAP !== 'undefined' && MAP) MAP.init();
  if(typeof FX !== 'undefined' && FX) FX.init();
  if(typeof MUSIC !== 'undefined' && MUSIC) MUSIC.init();
  UI.render();
  bindAll();
  if(typeof NET !== 'undefined' && NET && NET.initUI) NET.initUI();
  setTimeout(() => { if(window.MAP) MAP.fit(); }, 150);
  const ts = document.getElementById('turnSelect');
  if(ts) ts.classList.remove('hidden');
}
if(document.readyState === 'loading'){
  window.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

/* ================= 联机指令桥 =================
 * 访客不直接改状态：把意图打成命令发给房主，房主本地执行后广播快照。
 * 掷骰类动作天然不可复现，所以只广播结果（快照），不广播骰子点。
 * 做法：捕获所有函数声明的原始引用，再把全局名重绑成「访客发包 / 房主直执行」。
 * 这样不用逐个改调用点——其他函数里的裸调用走全局引用，自动命中包装版。
 */
(function installNetBridge(){
  const orig = { playCard, onActionBtn, doOps, closeOpsState, switchActive, afterCardPlayed, endTurn, aiTurn };
  function guest(){
    return G.mode === 'online' && typeof NET !== 'undefined' && NET && !NET.isHost();
  }
  function sync(){
    if(G.mode === 'online' && typeof PROTO !== 'undefined' && PROTO.isLocalActor()) PROTO.broadcast();
  }
  function cmd(c){ if(typeof PROTO !== 'undefined') PROTO.cmd(c); }
  function apply(c){
    try {
      if(!c || !c.fn) return;
      // 只有轮到访客这一边时才受理，防止越权代打 / 乱序指令
      if(G.activePlayer !== NET.side()){
        if(window.toast) toast('还没轮到你');
        return;
      }
      if(c.fn === 'playCard'){
        const card = G.hand[G.activePlayer].find(k => k.n === c.n);
        if(!card){ toast('找不到该牌'); return; }
        orig.playCard(card, c.mode, c.cid);
      }
      else if(c.fn === 'opsMode') orig.onActionBtn(c.zone);
      else if(c.fn === 'opsCountry') orig.doOps(c.mode, c.cid);
      else if(c.fn === 'closeOps') orig.closeOpsState();
      else if(c.fn === 'switchActive') orig.switchActive();
      else if(c.fn === 'endTurn') orig.endTurn();
      else { console.warn('unknown net cmd', c.fn); return; }
      sync();
      UI.render();
      window.onNetApply && window.onNetApply();
    } catch (e) { console.warn('remote cmd failed', c.fn, e.message); }
  }
  const wrap = (name, args, body) => {
    const fn = new Function(args, body);
    Object.defineProperty(window, name, { value: fn, writable: true, configurable: true });
  };
  wrap('playCard', 'card,mode,cid', "if(window.__guestNet()){window.PROTO&&PROTO.cmd({fn:'playCard',n:card.n,mode:mode,cid:cid});return;}" +
    "window.__origNet.playCard(card,mode,cid);window.__syncNet();UI.render();");
  wrap('onActionBtn', 'zone', "if(window.__guestNet()){window.PROTO&&PROTO.cmd({fn:'opsMode',zone:zone});return;}" +
    "window.__origNet.onActionBtn(zone);window.__syncNet();UI.render();");
  wrap('doOps', 'mode,cid', "if(window.__guestNet()){window.PROTO&&PROTO.cmd({fn:'opsCountry',mode:mode,cid:cid});return;}" +
    "window.__origNet.doOps(mode,cid);window.__syncNet();UI.render();");
  wrap('closeOpsState', '', "if(window.__guestNet()){window.PROTO&&PROTO.cmd({fn:'closeOps'});return;}" +
    "window.__origNet.closeOpsState();window.__syncNet();UI.render();");
  wrap('switchActive', '', "if(window.__guestNet()){window.PROTO&&PROTO.cmd({fn:'switchActive'});return;}" +
    "window.__origNet.switchActive();window.__syncNet();UI.render();");
  wrap('endTurn', '', "if(window.__guestNet()){window.PROTO&&PROTO.cmd({fn:'endTurn'});return;}" +
    "window.__origNet.endTurn();window.__syncNet();UI.render();");
  window.__origNet = orig;
  window.__guestNet = guest;
  window.__syncNet = sync;
  window.applyRemoteCmd = apply;
  window.onNetApply = function(){
    if(!G.mode) return;
    if(G.phase === 'playOps' && G.pendingOpsCard) showOpsPanel(); else hideOpsPanel();
  };
  if(typeof NET !== 'undefined' && NET && NET.on) NET.on('cmd', m => apply(m && m.c));
})();
