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
  G.flags.spaceScored = {us:false, ussr:false};

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
/* ===== 区域层面判定 =====
 * 存在 = 区域内至少一国存在己方影响力
 * 支配 = 区域内没有任何一国被对手控制（空白国也算被支配）
 * 控制 = 至少控制 3 国，且区域内对手完全没有影响力
 * 超级大国不计入区域国家（原版规则）
 */
function regionList(regionId){
  const list = REGION_COUNTRIES[regionId]||[];
  return list.filter(cid => COUNTRIES[cid] && !COUNTRIES[cid].superpower);
}
function regionPresence(player, regionId){
  return regionList(regionId).some(cid => isPresent(player, cid));
}
function regionDomination(player, regionId){
  const list = regionList(regionId);
  if(!list.length) return false;
  const opp = opponent(player);
  return list.every(cid => !isControlled(opp, cid));
}
function regionControl(player, regionId){
  const list = regionList(regionId);
  const opp = opponent(player);
  if(!list.length) return false;
  let n = 0;
  for(const cid of list){
    if(isControlled(player, cid)) n++;
    if(isPresent(opp, cid)) return false;   // 对手有存在 → 立刻不成立
  }
  return n >= 3;
}
/* ===== 放置规则 =====
 * 成本：对手控制 2 / 已有己方影响力 1 / 己方已控制 0
 * 限制：须相邻或超级大国链接；单国己方不能超对手 2 点
 *       围堵(美)/勃列日涅夫(苏) 不能往对手已控国加
 *       北约/联盟保护区内不能放置以夺取控制
 */
function placeCost(player, cid){
  const c = COUNTRIES[cid];
  if(!c) return 1;
  if(isControlled(player, cid)) return 0;
  return isControlled(opponent(player), cid) ? 2 : 1;
}
function canPlaceInfluence(player, cid){
  const c = COUNTRIES[cid];
  if(!c || c.superpower) return false;
  const opp = opponent(player);
  // 围堵 / 勃列日涅夫：不能往对手已控国加
  if((G.flags.containment && player === 'us' && isControlled('ussr', cid))) return false;
  if((G.flags.brezhnev && player === 'ussr' && isControlled('us', cid))) return false;
  // 不能把己方堆到超过对手 2 点（无论是否已控）
  if((G.influence[player][cid]||0) > (G.influence[opp][cid]||0) + 2) return false;
  // 必须相邻或超级大国链接
  if(!hasAdjInf(player, cid)) return false;
  // 北约/联盟保护区：不能放置以夺取控制
  if(isProtected(cid) && isControlled(opp, cid)) return false;
  return true;
}
function hasAdjInf(player, cid){
  const c = COUNTRIES[cid];
  for(const n of (c.neighbors||[])){
    if(getInf(player,n) > 0) return true;
  }
  return (SUPERPOWER_LINKS[player]||[]).includes(cid);
}

/* 北约保护西欧、联盟保护东欧 */
function isProtected(cid){
  if(G.flags.nato && (WESTERN_EUROPE.includes(cid) || EASTERN_EUROPE.includes(cid))) return true;
  if(G.flags.alliance && (WESTERN_EUROPE.includes(cid) || EASTERN_EUROPE.includes(cid))) return true;
  return false;
}

/* ===== 区域结算 =====
 * 各区域阈值不同（原版规则）；控制欧洲 = 立即胜利而非给分
 */
const REGION_SCORES = {
  europe:          {presence:3, domination:7, control:0},   // control = 立即胜利
  asia:            {presence:3, domination:7, control:9},
  middle_east:     {presence:3, domination:5, control:7},
  se_asia:         {presence:3, domination:5, control:7},
  africa:          {presence:3, domination:4, control:7},
  central_america: {presence:3, domination:5, control:7},
  south_america:   {presence:3, domination:5, control:7}
};

function scoreRegion(regionId){
  const countries = REGION_COUNTRIES[regionId] || [];
  const TH = REGION_SCORES[regionId] || {presence:3, domination:5, control:7};
  if(!countries.length) return {regionId, scores:{us:0,ussr:0}, winner:null, autoWin:false, detail:{}};

  const scores = {us:0, ussr:0};
  const detail = {};
  for(const p of ['us','ussr']){
    const pres = regionPresence(p, regionId);
    const dom  = regionDomination(p, regionId);
    const ctl  = regionControl(p, regionId);
    detail[p] = {pres, dom, ctl};
    if(pres) scores[p] += TH.presence;
    if(dom && TH.domination > TH.presence) scores[p] += (TH.domination - TH.presence);
    if(ctl && TH.control > TH.domination) scores[p] += (TH.control - TH.domination);
  }

  // 欧洲：控制 = 立即胜利，不给分
  if(regionId === 'europe'){
    if(detail.us.ctl || detail.ussr.ctl){
      const w = detail.us.ctl ? 'us' : 'ussr';
      return {regionId, scores:{us:0, ussr:0}, winner:w, autoWin:true, detail};
    }
    return {regionId, scores, winner:null, autoWin:false, detail};
  }

  // 控制区域内的每个战地国 +1 VP
  const bgCtrl = {us:0, ussr:0};
  for(const cid of regionList(regionId)){
    const c = COUNTRIES[cid];
    if(!c || !c.battleground) continue;
    if(isControlled('us', cid)) bgCtrl.us++;
    if(isControlled('ussr', cid)) bgCtrl.ussr++;
  }
  scores.us += bgCtrl.us;
  scores.ussr += bgCtrl.ussr;

  return {regionId, scores, winner:null, autoWin:false,
    detail: Object.assign(detail, {bgCtrl, countries: countries.length, th: TH})};
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

/* ===== 太空竞赛 =====
 * 只有专门的太空卡能推进（本卡表：#18 苏 / #80 美），各 +1 步
 * 到 5：+4 VP 且 DEFCON −1（双方同时到 5 则双方都得）
 * 到 8：立即胜利
 */
function spaceCardOwner(card){
  if(!card || !card.space) return null;
  if(card.space === 'us' || card.side === 'us') return 'us';
  if(card.space === 'ussr' || card.side === 'ussr') return 'ussr';
  return null;
}
/* 这张卡能不能给指定一方推进太空、推几步；0 = 不能。
   UI 靠它决定「太空」投放区要不要亮，别的地方别重复推这个逻辑。 */
function spaceStepOf(card, side){
  if(!card || !card.space) return 0;
  if(spaceCardOwner(card) !== side) return 0;
  return Math.max(1, card.spaceStep || 1);
}
function applySpaceStep(player, step){
  const before = G.space[player];
  G.space[player] = Math.min(8, before + (step || 1));
  log(`太空竞赛 ${player === 'us' ? '美国' : '苏联'} +${step || 1} → 位置 ${G.space[player]}`, player);
  if(before < 5 && G.space[player] >= 5){
    addVP(player, 4, '太空 5');
    const opp = opponent(player);
    if(G.space[opp] >= 5 && !G.flags.spaceScored[opp]){
      addVP(opp, 4, '太空 5');
      G.flags.spaceScored[opp] = true;
    }
    G.flags.spaceScored[player] = true;
    changeDefcon(-1);
    if(window.FX) FX.defconAlarm();
  }
  if(G.space[player] >= 8){
    if(window.FX){ FX.rocket(player); FX.shake(6); }
    declareWinner(player, '太空竞赛抵达终点');
  }
  checkWin();
}

/* ===== DEFCON ===== */
function changeDefcon(delta){
  const before = G.defcon;
  G.defcon = Math.max(1, Math.min(5, G.defcon + delta));
  if(G.defcon === 1){
    log('DEFCON 1 - 核战!', 'warn');
    nukeGame();
    checkWin();
    return;
  }
  if(delta < 0){
    log(`DEFCON 降至 ${G.defcon}`, 'warn');
    if(window.FX) FX.defconPulse(G.defcon);
  } else if(delta > 0){
    log(`DEFCON 升至 ${G.defcon}`, 'sys');
    if(window.FX) FX.flash('#6fd39a', 3);
  }
  if(G.mode === 'online' && window.PROTO) PROTO.ev({kind:'defcon', level: G.defcon});
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
  // China Card bonus：持牌方打其他牌时 +1 ops（简化：任意区域）
  if(G.chinaCardOwner === player && !card.china && base > 0) base += 1;
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
      G.flags.nato = false;   // 北约随卡失效
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
  // DEFCON 1：立即结束，VP 多者胜，相同则平局
  if(G.winner) return;
  G.phase = 'ended';
  if(G.vp.us > G.vp.ussr)      G.winner = 'us';
  else if(G.vp.ussr > G.vp.us) G.winner = 'ussr';
  else                         G.winner = 'draw';
  log('DEFCON 1 · 核战结束：' + (G.winner === 'draw' ? '平局' : (G.winner === 'us' ? '美国获胜' : '苏联获胜')), 'warn');
  setTimeout(()=>{
    if(window.FX){ FX.nuke(); FX.shake(16); FX.flash('#ffb347', 1); }
    if(window.SFX) SFX.play('boom');
    const modal = document.getElementById('nukeModal');
    if(modal){
      const h = document.createElement('p');
      h.className = 'nuke-score';
      h.textContent = `最终 VP · 美国 ${G.vp.us}  :  苏联 ${G.vp.ussr}`
        + (G.winner === 'draw' ? '  →  平局' : '  →  ' + (G.winner === 'us' ? '美国获胜' : '苏联获胜'));
      modal.querySelector('.nuke-modal').appendChild(h);
      modal.classList.remove('hidden');
    }
  }, 900);
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

/* ===== 回合推进（单一实现，全游戏只有一份）===== */
function endTurn(){
  if(G.winner) return;
  G.playsThisTurn = 0;
  G.playerTurnCardPlayed = false;
  G.pendingOpsCard = null;
  G.pendingOps = 0;

  // 第 10 回合打完 = 终局：只比 VP，不再结算任何区域
  if(G.turn >= 10){
    finalize();
    return;
  }

  G.turn++;
  if(G.turn === 4) injectPeriodCards('mid');
  if(G.turn === 8) injectPeriodCards('late');

  // 回合开始：先手抽 1 补 6，后手抽 1 补 6
  drawOne(G.activePlayer);
  drawOne(opponent(G.activePlayer));
  G.turnStarted = false;
  G.phase = 'turnStart';

  if(window.FX){ FX.turnSweep(); FX.flash('#c9a96a', 5); }
  if(window.SFX) SFX.play('turn');
  log(`回合 ${G.turn} · 先手${G.activePlayer === 'us' ? '美国' : '苏联'}`, 'sys');
  showTurnOverlay();
  if(window.UI) UI.render();

  if(G.mode === 'ai' && G.activePlayer !== G.playerSide){
    setTimeout(aiTurn, 1500);
  }
}

function drawOne(p){
  if(!G.deck.length){
    if(!G.discard.length) return;
    G.deck = shuffle([...G.discard]);
    G.discard = [];
    log('废牌堆洗回牌堆', 'sys');
  }
  G.hand[p].push(G.deck.pop());
  // 弃到 6 张：自动弃掉当前价值最低的一张（价值 = 计分4 + 事件2 + ops）
  while(G.hand[p].length > 6){
    let wi = 0, wv = Infinity;
    G.hand[p].forEach((c, i) => {
      const v = (c.scoring ? 4 : 0) + (c.text ? 2 : 0) + (c.ops || 0);
      if(v < wv){ wv = v; wi = i; }
    });
    const dropped = G.hand[p].splice(wi, 1)[0];
    discardCard(dropped);
    log(`${p === 'us' ? '美国' : '苏联'} 回合初自动弃牌：${dropped.zh || dropped.en}`, 'sys');
  }
  fillHandTo6(p);
}

function injectPeriodCards(period){
  const cards = CARDS.filter(c => c.period === period).map(c => ({...c}));
  G.deck = shuffle([...G.deck, ...shuffle(cards)]);
  log(`加入${getPeriodName(period)}卡牌 ${cards.length} 张`, 'sys');
}

function finalize(){
  if(G.winner) return;
  G.phase = 'ended';
  const u = G.vp.us, s = G.vp.ussr;
  const winner = u > s ? 'us' : s > u ? 'ussr' : 'draw';
  log(`终局 · 美国 ${u} VP : 苏联 ${s} VP`, 'sys');
  declareWinner(winner, `第 10 回合结束 · 美国 ${u} : 苏联 ${s}`);
  if(window.UI) UI.render();
}


/* showTurnOverlay 只在 main.js 实现一次，避免脚本顺序导致重复定义互相覆盖 */
window.G = G;
window.REGION_SCORES = REGION_SCORES;
