/* ===== 冷战热斗 · 游戏引擎 ===== */
/* 状态、回合、卡牌效果、结算 */

const G = {
  turn: 1,
  defcon: 5,
  vp: {us:0, ussr:0},
  milOps: {us:0, ussr:0},
  space: {us:0, ussr:0},
  influence: {us:{}, ussr:{}},
  hand: {us:[], ussr:[]},
  discard: [],
  deck: [],
  flags: {},
  firstPlayer: 'ussr',
  activePlayer: null,
  phase: 'init',  // init/turnStart/playEvent/playOps/playSpace/turnEnd/ended
  log: [],
  turnLog: [],
  winner: null,
  chinaCardOwner: 'ussr',
  mode: 'hotseat',
  playerSide: null,
  currentPlayerSide: null,
  lastPlayedCard: null,
  lastPlayedMode: null,
  turnStarted: false,
  playerTurnCardPlayed: false,
  scoringCards: {},  // active scoring cards pending
  pendingOps: 0,
  pendingOpsCard: null,
  pendingSpaceStep: 0,
  turnDiceRolls: {us:null, ussr:null},
};

/* ===== 初始化 ===== */
function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]] = [arr[j],arr[i]];
  }
  return arr;
}

function initGame(opts){
  opts = opts || {};

  // —— 全量重置（重开一局不能残留上一局状态）——
  G.turn = 1;
  G.defcon = 5;
  G.vp = {us:0, ussr:0};
  G.milOps = {us:0, ussr:0};
  G.space = {us:0, ussr:0};
  G.influence = {us:{}, ussr:{}};
  G.hand = {us:[], ussr:[]};
  G.discard = [];
  G.deck = [];
  G.flags = {};
  G.log = [];
  G.turnLog = [];
  G.winner = null;
  G.chinaCardOwner = 'ussr';
  G.currentPlayerSide = null;
  G.lastPlayedCard = null;
  G.lastPlayedMode = null;
  G.turnStarted = false;
  G.playerTurnCardPlayed = false;
  G.scoringCards = {};
  G.pendingOps = 0;
  G.pendingOpsCard = null;
  G.pendingSpaceStep = 0;
  G.playsThisTurn = 0;
  G.turnDiceRolls = {us:null, ussr:null};

  G.mode = opts.mode || 'hotseat';
  G.playerSide = opts.side || null;
  G.firstPlayer = opts.firstPlayer || (Math.random()<0.5?'us':'ussr');

  // 建卡组：早期战争 36 张（含中国牌）
  const earlyCards = CARDS.filter(c=>c.period==='early').map(c=>({...c}));
  G.deck = shuffle([...earlyCards]);

  // 发牌：各 6 张
  for(let i=0;i<6;i++){
    G.hand.us.push(G.deck.pop());
    G.hand.ussr.push(G.deck.pop());
  }

  // 初始影响力
  for(const [k,v] of Object.entries(INITIAL_SETUP.us)) G.influence.us[k] = v;
  for(const [k,v] of Object.entries(INITIAL_SETUP.ussr)) G.influence.ussr[k] = v;
  
  // 初始状态
  G.activePlayer = G.firstPlayer;
  G.currentPlayerSide = G.firstPlayer;
  G.phase = 'turnStart';
  
  log(`回合 1 开始`, 'sys');
  log(`${G.firstPlayer==='us'?'美国':'苏联'} 先手`, 'sys');
  
  G.turnStarted = false;  // playerStartTurn 会负责抽第一张
  if(G.mode === 'ai' && G.activePlayer !== G.playerSide){
    setTimeout(aiTurn, 1000);
  }
}

/* ===== 通用工具 ===== */
function log(msg, cls){
  G.turnLog.push({msg, cls:cls||'sys', turn:G.turn});
  G.log.push({msg, cls:cls||'sys', turn:G.turn});
}
function toast(msg){
  const t = document.getElementById('toast');
  if(!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2200);
}
function opponent(p){ return p==='us'?'ussr':'us'; }

/* ===== 影响力工具 ===== */
function addInf(player, cid, n){
  if(!cid || !COUNTRIES[cid]) return;
  G.influence[player][cid] = (G.influence[player][cid]||0) + n;
  if(G.influence[player][cid] === 0) delete G.influence[player][cid];
}
function remInf(player, cid, n){
  const cur = G.influence[player][cid]||0;
  const rem = Math.min(cur, n);
  G.influence[player][cid] = cur - rem;
  if(G.influence[player][cid] <= 0) delete G.influence[player][cid];
}
function getInf(player, cid){ return G.influence[player][cid]||0; }

function isControlled(player, cid){
  const opp = opponent(player);
  return getInf(player,cid) > getInf(opp,cid);
}
function isPresent(player, cid){ return getInf(player,cid) > 0; }
// 国家层面：有影响力且不低于对手
function isDomination(player, cid){
  return getInf(player,cid) > 0 && !isControlled(opponent(player), cid);
}
// 区域层面：该区域所有国家都满足条件
function regionPresence(player, regionId){
  const list = REGION_COUNTRIES[regionId]||[];
  return list.some(cid => isPresent(player, cid));
}
function regionDomination(player, regionId){
  const list = REGION_COUNTRIES[regionId]||[];
  if(!list.length) return false;
  return list.every(cid => isDomination(player, cid));
}
function regionControl(player, regionId){
  const list = REGION_COUNTRIES[regionId]||[];
  if(!list.length) return false;
  return list.every(cid => isControlled(player, cid));
}
function placeCost(player, cid){
  // 控制对手国家需要 2 ops
  return isControlled(opponent(player), cid) ? 2 : 1;
}
function canPlaceInfluence(player, cid){
  const c = COUNTRIES[cid];
  if(!c || c.superpower) return false;
  if(isControlled(player, cid)) return true;
  if(getInf(player, cid) > 0) return true;
  // 邻接
  for(const n of (c.neighbors||[])){
    if(getInf(player, n) > 0) return true;
  }
  // 超级大国邻接
  if((SUPERPOWER_LINKS[player]||[]).includes(cid)) return true;
  return false;
}
function hasAdjInf(player, cid){
  const c = COUNTRIES[cid];
  for(const n of (c.neighbors||[])){
    if(getInf(player,n) > 0) return true;
  }
  return (SUPERPOWER_LINKS[player]||[]).includes(cid);
}

/* ===== 区域结算 ===== */
function scoreRegion(regionId, card){
  // 区域计分：存在 3 / 支配 7 / 控制 9
  // 欧洲：控制整个欧洲 = 立即胜利
  const countries = REGION_COUNTRIES[regionId] || [];
  if(!countries.length) return {regionId, scores:{us:0,ussr:0}, winner:null, autoWin:false};

  const scores = {us:0, ussr:0};
  const pres = {us: regionPresence('us', regionId),  ussr: regionPresence('ussr', regionId)};
  const dom  = {us: regionDomination('us', regionId),ussr: regionDomination('ussr', regionId)};
  const ctl  = {us: regionControl('us', regionId),   ussr: regionControl('ussr', regionId)};

  if(pres.us) scores.us += 3;
  if(pres.ussr) scores.ussr += 3;
  if(dom.us) scores.us += 4;
  if(dom.ussr) scores.ussr += 4;

  // 欧洲：控制整个欧洲 → 立即胜利
  if(regionId === 'europe' && ctl.us)   return {regionId, scores, winner:'us',   autoWin:true, detail:{pres,dom,ctl}};
  if(regionId === 'europe' && ctl.ussr) return {regionId, scores, winner:'ussr', autoWin:true, detail:{pres,dom,ctl}};

  let usCtrl = 0, ussrCtrl = 0;
  for(const cid of countries){
    if(COUNTRIES[cid].superpower) continue;
    if(isControlled('us', cid)) usCtrl++;
    if(isControlled('ussr', cid)) ussrCtrl++;
  }
  scores.us += usCtrl;
  scores.ussr += ussrCtrl;

  // 非战地国、紧邻对手超级大国 → 各 +1
  for(const cid of countries){
    const c = COUNTRIES[cid];
    if(c.superpower || c.battleground) continue;
    if(isControlled('us', cid) && hasAdjInf('ussr', cid)) scores.us++;
    if(isControlled('ussr', cid) && hasAdjInf('us', cid)) scores.ussr++;
  }

  return {regionId, scores, winner:null, autoWin:false,
    detail:{pres, dom, ctl, usCtrl, ussrCtrl, countries: countries.length}};
}
function applyScoreCard(card, scorer){
  if(!card.scoring) return;
  const result = scoreRegion(card.scoring);
  const gain = result.scores[scorer];
  G.vp[scorer] += gain;
  log(`结算${card.zh}：${scorer==='us'?'美国':'苏联'} +${gain} VP`, scorer);
  if(result.autoWin){
    declareWinner(result.winner, `控制欧洲！`);
    return;
  }
}

/* ===== DEFCON ===== */
function changeDefcon(delta){
  G.defcon = Math.max(1, Math.min(5, G.defcon + delta));
  if(G.defcon === 1){
    log('DEFCON 1 - 核战!', 'warn');
    nukeGame();
  } else if(delta < 0){
    log(`DEFCON 降至 ${G.defcon}`, 'warn');
  } else if(delta > 0){
    log(`DEFCON 升至 ${G.defcon}`, 'sys');
  }
  checkWin();
}

/* ===== VP ===== */
function addVP(player, n, reason){
  G.vp[player] += n;
  if(n > 0) log(`${player==='us'?'美国':'苏联'} +${n} VP ${reason?'('+reason+')':''}`, player);
  else if(n < 0) log(`${player==='us'?'美国':'苏联'} ${n} VP ${reason?'('+reason+')':''}`, player);
  checkWin();
}

/* ===== 卡牌操作 ===== */
function getOpsValue(card, player){
  if(!card) return 0;
  let base = card.ops || 0;
  // Containment
  if(player === 'us' && G.flags.containment) base = Math.min(4, base + 1);
  // Brezhnev
  if(player === 'ussr' && G.flags.brezhnev) base = Math.min(4, base + 1);
  // Red Scare/Purge (opponent -1)
  if(player === 'us' && G.flags.redScare === 'ussr') base = Math.max(1, base - 1);
  if(player === 'ussr' && G.flags.redScare === 'us') base = Math.max(1, base - 1);
  // China Card bonus
  if(card.china && base > 0) base += 1;  // 简化
  return base;
}

function drawCard(player){
  if(G.deck.length === 0){
    // reshuffle discard
    G.deck = shuffle([...G.discard]);
    G.discard = [];
  }
  if(G.deck.length === 0) return null;
  return G.deck.pop();
}

function fillHandTo6(player){
  while(G.hand[player].length < 6 && G.deck.length > 0){
    G.hand[player].push(G.deck.pop());
  }
}

function discardCard(card){
  G.discard.push(card);
}

/* ===== 掷骰 ===== */
function rollDie(mod){
  return Math.max(1, Math.min(6, 1 + Math.floor(Math.random()*6) + (mod||0)));
}

/* ===== 卡牌效果 ===== */
function playEvent(card, player){
  log(`打出事件: ${card.zh}`, player);
  if(card.scoring){
    // 计分卡
    const opp = opponent(player);
    const result = scoreRegion(card.scoring);
    const gainUs = result.scores.us;
    const gainUssr = result.scores.ussr;
    G.vp.us += gainUs;
    G.vp.ussr += gainUssr;
    log(`结算${card.zh}: 美国 +${gainUs} VP, 苏联 +${gainUssr} VP`, 'sys');
    if(result.autoWin && result.winner){
      declareWinner(result.winner, `控制${REGIONS[card.scoring].zh}！`);
      return;
    }
  } else {
    resolveCardEffect(card, player);
  }
  discardCard(card);
}

function resolveCardEffect(card, player){
  const opp = opponent(player);
  switch(card.n){
    // Early
    case 4: changeDefcon(-1); addVP('us', 5-G.defcon); break;
    case 5: {
      const h = G.hand.ussr;
      if(h.length){
        const i = Math.floor(Math.random()*h.length);
        const c = h.splice(i,1)[0];
        if(c.side === 'us' && !c.scoring){
          log(`五年计划：触发美方事件 "${c.zh}"`, 'ussr');
          playEvent(c, 'ussr');
        } else {
          discardCard(c);
        }
      }
      break;
    }
    case 6: G.chinaCardOwner = opp; log('中国牌交给对手', player); break;
    case 7: {
      if(!G.flags.ironlady){
        let left = 3;
        const sorted = WESTERN_EUROPE.slice().sort((a,b)=>getInf('us',b)-getInf('us',a));
        for(const c of sorted){
          if(left <= 0) break;
          const take = Math.min(left, Math.min(2, getInf('us',c)));
          if(take > 0){ remInf('us',c,take); left -= take; }
        }
      }
      break;
    }
    case 8: {
      remInf('us','cuba',999);
      const s = getInf('ussr','cuba'), u = getInf('us','cuba');
      if(s <= u) addInf('ussr','cuba', u - s + 1);
      break;
    }
    case 9: addInf('ussr','vietnam',2); break;
    case 10: {
      const h = G.hand.us;
      const idx = h.findIndex(c => (c.ops||0) >= 3 && !c.scoring);
      if(idx >= 0) discardCard(h.splice(idx,1)[0]);
      else remInf('us','west_germany',999);
      break;
    }
    case 11: {
      let mod = 0;
      for(const c of ['north_korea','japan','china']) if(isControlled('us',c)) mod++;
      const r = rollDie(-mod);
      if(r >= 4){
        addVP('ussr',2);
        remInf('us','south_korea',999);
        addInf('ussr','south_korea',1);
        G.milOps.ussr += 2;
      }
      break;
    }
    case 12: {
      remInf('us','romania',999);
      const s = getInf('ussr','romania'), u = getInf('us','romania');
      if(s <= u) addInf('ussr','romania', u - s + 1);
      break;
    }
    case 13: {
      if(G.flags.campdavid) break;
      let mod = 0;
      for(const c of ['israel','iraq','egypt','syria','jordan']) if(isControlled('us',c)) mod++;
      const r = rollDie(-mod);
      if(r >= 4){
        addVP('ussr',2);
        remInf('us','israel',999);
        addInf('ussr','israel',1);
        G.milOps.ussr += 2;
      }
      break;
    }
    case 14: {
      let n = 0;
      for(const c of EASTERN_EUROPE){
        if(n >= 4) break;
        if(!isControlled('us',c)){ addInf('ussr',c,1); n++; }
      }
      break;
    }
    case 15: {
      addInf('ussr','egypt',2);
      const u = getInf('us','egypt');
      remInf('us','egypt', Math.ceil(u/2));
      break;
    }
    case 16: {
      let n = 0;
      for(const c of EASTERN_EUROPE){
        if(n >= 4) break;
        if(getInf('us',c) > 0){ remInf('us',c,999); n++; }
      }
      break;
    }
    case 17: {
      remInf('us','france',2);
      addInf('ussr','france',1);
      G.flags.france_nato = false;
      break;
    }
    case 18: {
      if(G.space[player] < 8) G.space[player]++;
      break;
    }
    case 19: {
      for(const c of [...WESTERN_EUROPE, ...EASTERN_EUROPE]){
        if(!isControlled('ussr',c) && getInf('ussr',c) > 0){
          remInf('ussr',c,999);
          break;
        }
      }
      break;
    }
    case 20: {
      const a = rollDie(2), b = rollDie(0);
      if(a > b) addVP(player, 2);
      else if(b > a) addVP(opp, 2);
      else { changeDefcon(-1); /* 主办方用 4 ops */ }
      break;
    }
    case 21: G.flags.nato = true; break;
    case 22: {
      for(const c of ['yugoslavia','romania','bulgaria','hungary','czechoslovakia']){
        const s = getInf('ussr',c), u = getInf('us',c);
        if(s > u){ addInf('us',c,s-u); break; }
      }
      break;
    }
    case 23: {
      let n = 0;
      const targets = [...WESTERN_EUROPE, ...EASTERN_EUROPE];
      for(const c of targets){
        if(n >= 7) break;
        if(!isControlled('ussr',c)){ addInf('us',c,1); n++; }
      }
      break;
    }
    case 24: {
      const tgt = Math.random() < 0.5 ? 'india' : 'pakistan';
      let mod = 0;
      for(const c of (COUNTRIES[tgt].neighbors||[])) if(isControlled(opp,c)) mod++;
      const r = rollDie(-mod);
      if(r >= 4){
        if(player === 'us') addVP('us',2); else addVP('ussr',2);
        remInf(opp,tgt,999);
        addInf(player,tgt,1);
        G.milOps[player] += 2;
      }
      break;
    }
    case 25: G.flags.containment = true; break;
    case 26: /* 简化 */ break;
    case 27: {
      const s = getInf('us','japan'), o = getInf('ussr','japan');
      if(s <= o) addInf('us','japan', o - s + 1);
      G.flags.nato_japan = true;
      break;
    }
    case 28: {
      for(const c of ['uk','france','israel']){
        if(!isControlled('us',c)) remInf('us',c,2);
      }
      break;
    }
    case 29: {
      const amount = G.turn <= 3 ? 1 : 2;
      const sorted = EASTERN_EUROPE.slice().sort((a,b)=>getInf('ussr',b)-getInf('ussr',a));
      for(let i=0;i<3;i++){
        const c = sorted[i];
        if(c) remInf('ussr',c,amount);
      }
      break;
    }
    case 30: {
      const targets = [...AFRICA_COUNTRIES, ...SE_ASIA_COUNTRIES];
      let n = 0;
      for(const c of targets){
        if(n >= 4) break;
        addInf('ussr',c,1); n++;
      }
      break;
    }
    case 31: G.flags.redScare = player; break;
    case 32: log('联合国干预打出（取消前一事件）', 'sys'); break;
    case 33: {
      let n = 0;
      for(const c of EASTERN_EUROPE){
        if(n >= 4) break;
        if(!isControlled('ussr',c)){ addInf('ussr',c,1); n++; }
      }
      break;
    }
    case 34: changeDefcon(+1); break;
    case 35: {
      if(isControlled('us','taiwan')) addVP('us',1);
      const s = getInf('us','taiwan'), o = getInf('ussr','taiwan');
      if(s <= o) addInf('us','taiwan', o - s + 1);
      break;
    }
    case 103: {
      addVP('us',1);
      // 简化：从苏方随机弃 1 张
      if(G.hand.ussr.length){
        discardCard(G.hand.ussr.splice(Math.floor(Math.random()*G.hand.ussr.length),1)[0]);
      }
      break;
    }
    // Mid
    case 36: {
      // 简化：选择稳定度 1-2 国家
      break;
    }
    case 39: {
      const r = rollDie();
      if(r >= 4) G.milOps[player] += 2;
      else G.milOps[opp] += 1;
      break;
    }
    case 40: {
      changeDefcon(-1);
      if(G.defcon === 2){
        G.flags.cmc = true;
      }
      break;
    }
    case 41: G.flags.nucSubs = true; break;
    case 42: G.flags.quagmire = true; break;
    case 43: changeDefcon(+1); break;
    case 44: G.flags.quagmire = true; break;
    case 45: {
      const a = rollDie(2), b = rollDie(0);
      if(a > b) addVP('us', 2);
      else if(b > a) addVP('ussr', 2);
      break;
    }
    case 46: changeDefcon(-1); addVP('ussr', 5-G.defcon); break;
    case 47: {
      const r = rollDie();
      const targets = r >= 4 ? CENTRAL_AMERICA : [...AFRICA_COUNTRIES.filter(c=>c.includes('africa')), ...SE_ASIA_COUNTRIES];
      for(let i=0;i<2;i++){
        if(targets[i]) addInf(player,targets[i],2);
      }
      break;
    }
    case 48: {
      const a = rollDie(), b = rollDie();
      if(a > b){ addVP('us',1); if(G.hand.ussr.length) discardCard(G.hand.ussr.splice(Math.floor(Math.random()*G.hand.ussr.length),1)[0]); }
      else if(b > a){ addVP('ussr',1); if(G.hand.us.length) discardCard(G.hand.us.splice(Math.floor(Math.random()*G.hand.us.length),1)[0]); }
      break;
    }
    case 49: {
      changeDefcon(+1);
      break;
    }
    case 50: {
      if(G.flags.cmc || G.flags.glassHouse) break;
      changeDefcon(-1);
      addVP('ussr', 5-G.defcon);
      break;
    }
    case 51: G.flags.brezhnev = true; break;
    case 52: {
      addInf('ussr','angola',2);
      addInf('ussr','seaf',2);
      break;
    }
    case 53: addInf('ussr','south_africa',2); break;
    case 54: addInf('ussr','chile',2); break;
    case 55: {
      addVP('ussr',1);
      addInf('ussr','west_germany',1);
      G.flags.wg_nato = false;
      break;
    }
    case 56: {
      const targets = ['iran','iraq','egypt','libya','saudi','syria','jordan','sudan'];
      for(let i=0;i<2;i++){
        const c = targets[i];
        remInf('us',c,999);
      }
      break;
    }
    case 57: changeDefcon(+1); break;
    case 58: {
      if(G.chinaCardOwner === 'us') G.chinaCardOwner = 'ussr';
      break;
    }
    case 59: G.flags.flowerPower = true; break;
    case 60: {
      addVP('ussr',1);
      break;
    }
    case 61: {
      let score = 0;
      for(const c of ['egypt','iran','libya','saudi','iraq','gulf_states','venezuela']){
        if(isControlled('ussr',c)) score++;
      }
      addVP('ussr', score);
      break;
    }
    case 62: break;
    case 63: {
      const targets = [...AFRICA_COUNTRIES, ...SE_ASIA_COUNTRIES];
      for(let i=0;i<4;i++){
        if(targets[i]) addInf('us',targets[i],1);
      }
      break;
    }
    case 64: {
      addInf('us','panama',1);
      addInf('us','costa_rica',1);
      addInf('us','venezuela',1);
      break;
    }
    case 65: {
      addVP('us',1);
      addInf('us','israel',1);
      addInf('us','jordan',1);
      addInf('us','egypt',1);
      G.flags.campdavid = true;
      break;
    }
    case 66: {
      let n = 0;
      for(const cid of Object.keys(COUNTRIES)){
        if(n >= 3) break;
        if(!COUNTRIES[cid].superpower && getInf('us',cid) === 0 && getInf('ussr',cid) === 0){
          addInf('us',cid,1); n++;
        }
      }
      break;
    }
    case 67: break;
    case 68: {
      remInf('ussr','poland',2);
      addInf('us','poland',1);
      G.flags.johnpaul = true;
      break;
    }
    case 69: break;
    case 70: {
      let n = 0;
      for(const c of [...CENTRAL_AMERICA, ...SOUTH_AMERICA]){
        if(n >= 2) break;
        addInf('us',c,1); n++;
      }
      break;
    }
    case 71: {
      if(G.chinaCardOwner === 'ussr') G.chinaCardOwner = 'us';
      break;
    }
    case 72: {
      remInf('ussr','egypt',999);
      addInf('us','egypt',1);
      break;
    }
    case 73: G.flags.shuttle = true; break;
    case 74: break;
    case 75: {
      for(let i=0;i<3;i++){
        if(CENTRAL_AMERICA[i]) addInf('ussr',CENTRAL_AMERICA[i],1);
      }
      break;
    }
    case 76: {
      if(isControlled('ussr','china')){
        addVP('us',1);
        if(G.chinaCardOwner === 'ussr') G.chinaCardOwner = 'us';
      }
      break;
    }
    case 77: {
      if(G.defcon <= 3) addVP('us',2);
      break;
    }
    case 78: {
      let score = 0;
      for(const c of ['mexico','brazil','argentina','chile','venezuela']){
        if(isControlled('us',c)) score++;
      }
      addVP('us', score);
      break;
    }
    case 80: if(G.space[player] < 8) G.space[player]++; break;
    // Late
    case 82: {
      addVP('ussr',2);
      break;
    }
    case 83: {
      addVP('ussr',1);
      addInf('us','uk',1);
      G.flags.ironlady = true;
      break;
    }
    case 84: {
      addVP('ussr',-1);
      remInf('ussr','libya',999);
      addInf('us','libya',1);
      break;
    }
    case 85: {
      changeDefcon(+1);
      addVP('ussr',-1);
      break;
    }
    case 86: {
      let score = 0;
      for(const c of ['uk','norway','denmark','benelux']){
        if(isControlled('us',c)) score++;
      }
      addVP('us', score);
      break;
    }
    case 87: addVP('ussr',3); break;
    case 88: addVP('ussr',2); break;
    case 89: {
      addVP('ussr',1);
      changeDefcon(-1);
      break;
    }
    case 90: addVP('ussr',1); break;
    case 91: {
      addVP('ussr',1);
      addInf('ussr','nicaragua',1);
      break;
    }
    case 92: addVP(opp,-1); break;
    case 93: {
      addVP('ussr',1);
      if(G.hand.us.length){
        discardCard(G.hand.us.splice(0,1)[0]);
      }
      if(G.hand.us.length){
        discardCard(G.hand.us.splice(Math.floor(Math.random()*G.hand.us.length),1)[0]);
      }
      break;
    }
    case 94: addVP('ussr',-2); break;
    case 95: {
      addVP('ussr',2);
      let n = 0;
      for(const c of SOUTH_AMERICA){
        if(n >= 2) break;
        remInf('us',c,1); n++;
      }
      break;
    }
    case 96: {
      addVP('ussr',-1);
      addInf('us','west_germany',1);
      break;
    }
    case 97: {
      addVP('ussr',1);
      G.flags.flowerPower = false;
      break;
    }
    case 98: {
      addVP('ussr',1);
      if(G.hand.us.length) discardCard(G.hand.us.splice(Math.floor(Math.random()*G.hand.us.length),1)[0]);
      break;
    }
    case 99: {
      addVP('us',1);
      let n = 0;
      for(const c of WESTERN_EUROPE){
        if(n >= 2) break;
        addInf('us',c,1); n++;
      }
      break;
    }
    case 100: {
      if(G.defcon <= 2){
        addVP(player, Math.random()<0.5?2:3);
      }
      break;
    }
    case 101: {
      addInf('us','poland',2);
      addVP('ussr',-1);
      break;
    }
    case 102: {
      const r = rollDie();
      if(r >= 4){
        const tgt = Math.random() < 0.5 ? 'iran' : 'iraq';
        addVP(player,2);
        remInf(opp,tgt,999);
        addInf(player,tgt,1);
      }
      break;
    }
    case 104: addVP('ussr',2); break;
    case 105: addVP('us',2); break;
    case 106: {
      changeDefcon(+1);
      G.flags.norad = true;
      break;
    }
    case 107: {
      addInf('ussr','cuba',1);
      break;
    }
    case 108: {
      addVP('us',1);
      addInf('us','iran',1);
      break;
    }
    case 109: addVP('ussr',2); break;
    case 110: addInf('us','saudi',2); break;
  }
}

/* ===== 胜利判定 ===== */
function checkWin(){
  if(G.winner) return;
  if(G.defcon === 1){
    nukeGame();
    return;
  }
  if(G.vp.us >= WIN_VP){
    declareWinner('us', `美国达到 ${WIN_VP} VP`);
  } else if(G.vp.ussr >= WIN_VP){
    declareWinner('ussr', `苏联达到 ${WIN_VP} VP`);
  }
}

function nukeGame(){
  G.winner = 'draw';
  G.phase = 'ended';
  setTimeout(()=>{
    if(window.FX) FX.nuke();
    document.getElementById('nukeModal').classList.remove('hidden');
  }, 800);
}

function declareWinner(winner, reason){
  if(G.winner) return;
  G.winner = winner;
  G.phase = 'ended';
  setTimeout(()=>{
    const modal = document.getElementById('winModal');
    const title = document.getElementById('winTitle');
    const msg = document.getElementById('winMsg');
    const stats = document.getElementById('winStats');
    if(!modal) return;
    title.textContent = winner==='us' ? '美国胜利' : winner==='ussr' ? '苏联胜利' : '平局';
    msg.textContent = reason;
    stats.textContent = `最终 VP: 美国 ${G.vp.us} · 苏联 ${G.vp.ussr}\nDEFCON ${G.defcon} · 回合 ${G.turn}`;
    modal.classList.remove('hidden');
    modal.classList.remove('win-us','win-ussr');
    if(winner === 'us') modal.classList.add('win-us');
    if(winner === 'ussr') modal.classList.add('win-ussr');
  }, 600);
}

/* ===== 回合流程 ===== */
function startTurn(){
  G.phase = 'turnStart';
  G.turnStarted = false;
  G.playerTurnCardPlayed = false;
  G.turnLog = [];
  G.lastPlayedCard = null;
  G.lastPlayedMode = null;
  // 清除回合性效果
  G.flags.containment = false;
  G.flags.brezhnev = false;
  G.flags.quagmire = false;
  G.flags.flowerPower = G.flags.flowerPower; // 持久
  
  // 补手牌到 6
  fillHandTo6('us');
  fillHandTo6('ussr');
  
  if(G.activePlayer === 'us' && !G.turnStarted){
    // 主动方先抽 1 张
    if(G.deck.length > 0){
      const c = G.deck.pop();
      G.hand.us.push(c);
    }
  } else if(G.activePlayer === 'ussr' && !G.turnStarted){
    if(G.deck.length > 0){
      const c = G.deck.pop();
      G.hand.ussr.push(c);
    }
  }
  G.turnStarted = true;
  
  showTurnOverlay();
  if(window.UI) UI.render();
}

function nextTurn(){
  // 交换主动权
  G.activePlayer = opponent(G.activePlayer);
  G.currentPlayerSide = G.activePlayer;
  
  // 另一家也抽 1 张
  if(G.deck.length > 0){
    G.hand[G.activePlayer].push(G.deck.pop());
  }
  fillHandTo6(G.activePlayer);
  
  showTurnOverlay();
  if(window.UI) UI.render();
  
  if(G.mode === 'ai' && G.activePlayer !== G.playerSide){
    setTimeout(aiTurn, 1500);
  }
}

function endTurn(){
  // 回合结束，进入下一回合
  G.turn++;
  
  // 切换战争时期
  const oldPeriod = getPeriod(G.turn - 1);
  const newPeriod = getPeriod(G.turn);
  if(oldPeriod !== newPeriod){
    log(`进入${getPeriodName(newPeriod)}`, 'sys');
    if(G.turn === 4){
      // 中期开始：从 discard 里挑 mid 卡
      const newCards = CARDS.filter(c=>c.period==='mid').map(c=>({...c}));
      G.deck = shuffle([...G.deck, ...shuffle(newCards)]);
    } else if(G.turn === 8){
      const newCards = CARDS.filter(c=>c.period==='late').map(c=>({...c}));
      G.deck = shuffle([...G.deck, ...shuffle(newCards)]);
    }
  }
  
  if(G.turn > 10){
    // 游戏结束
    if(G.vp.us > G.vp.ussr) declareWinner('us', `终局 VP: 美国 ${G.vp.us} - 苏联 ${G.vp.ussr}`);
    else if(G.vp.ussr > G.vp.us) declareWinner('ussr', `终局 VP: 苏联 ${G.vp.ussr} - 美国 ${G.vp.us}`);
    else declareWinner('draw', '平局');
    return;
  }
  
  // 主动方不变（每回合都换两次 = 一次）
  // 实际上 turn 1 开始的第一家 = 主动方
  // turn 2 开始也是同一家
  // 所以 G.activePlayer 不动
  G.turnStarted = false;
  G.phase = 'turnStart';
  
  if(G.activePlayer === 'us'){
    if(G.deck.length > 0) G.hand.us.push(G.deck.pop());
  } else {
    if(G.deck.length > 0) G.hand.ussr.push(G.deck.pop());
  }
  G.turnStarted = true;
  fillHandTo6('us');
  fillHandTo6('ussr');
  
  showTurnOverlay();
  if(window.UI) UI.render();
  
  if(G.mode === 'ai' && G.activePlayer !== G.playerSide){
    setTimeout(aiTurn, 1500);
  }
}

/* ===== 展示效果 ===== */
function showTurnOverlay(){
  const overlay = document.getElementById('turnOverlay');
  const text = document.getElementById('turnOverlayText');
  const sub = document.getElementById('turnOverlaySub');
  if(!overlay) return;
  const pName = G.activePlayer === 'us' ? '美国' : '苏联';
  const periodName = getPeriodName(getPeriod(G.turn));
  text.textContent = `${pName} 出牌`;
  sub.textContent = `回合 ${G.turn} · ${periodName}`;
  overlay.classList.remove('hidden');
  overlay.classList.remove('fade-out');
  setTimeout(()=>overlay.classList.add('fade-out'), 1400);
}
