/* ===== 冷战热斗 · 事件引擎 =====
 * 所有非 Ops/太空卡的结算逻辑集中在此。
 * 每个事件效果有独立的视觉反馈 + 日志记录。
 */

const EVENT = (() => {
  const effects = {};  // cardN -> effectFn

  /* ---------- 工具函数 ---------- */
  function log(msg, who){
    if(window.G && window.G.log) window.G.log.push({msg, who, turn: window.G.turn});
    if(window.UI && UI.toast) UI.toast(msg);
  }
  function flash(color, intensity){
    if(window.FX && FX.flash) FX.flash(color, intensity);
  }
  function shake(v){
    if(window.FX && FX.shake) FX.shake(v);
  }
  function sfx(name){
    if(window.SFX && SFX.play) SFX.play(name);
  }
  function addInf(side, cid, n){
    if(window.addInf) window.addInf(side, cid, n);
  }
  function remInf(side, cid, n){
    if(window.remInf) window.remInf(side, cid, n);
  }
  function getInf(side, cid){
    if(window.getInf) return window.getInf(side, cid);
    return 0;
  }
  function isControlled(side, cid){
    if(window.isControlled) return window.isControlled(side, cid);
    return false;
  }
  function addVP(side, n){
    if(window.addVP) window.addVP(side, n);
  }
  function changeDefcon(n){
    if(window.changeDefcon) window.changeDefcon(n);
  }
  function rollDie(mod=0){
    if(window.rollDie) return window.rollDie(mod);
    return Math.floor(Math.random()*6)+1+mod;
  }
  function opponent(side){
    return side === 'us' ? 'ussr' : 'us';
  }
  function toast(msg){
    if(window.UI && UI.toast) UI.toast(msg);
  }

  /* ---------- 视觉反馈 ---------- */
  function showEffect(title, detail, opts){
    const el = document.getElementById('eventEffect');
    if(!el) return;
    // 兼容：第三个参数可以是颜色字符串或 opts 对象
    let color, cardNum, side;
    if(typeof opts === 'string'){
      color = opts;
    } else if(opts){
      color = opts.color;
      cardNum = opts.cardNum;
      side = opts.side;
    }
    const sideColor = color || (side === 'us' ? 'rgba(74,127,181,.7)' : side === 'ussr' ? 'rgba(200,16,46,.7)' : 'rgba(201,169,106,.7)');
    const numHtml = cardNum ? `<span class="ef-num">#${cardNum}</span> ` : '';
    el.innerHTML = `<div class="ef-title">${numHtml}${title}</div><div class="ef-detail">${detail}</div>`;
    el.style.borderColor = sideColor;
    el.classList.remove('hidden');
    clearTimeout(showEffect._t);
    showEffect._t = setTimeout(() => el.classList.add('hidden'), 3200);
  }

  function showDiceRoll(rolls, mods, result){
    const el = document.getElementById('eventEffect');
    if(!el) return;
    const diceHTML = rolls.map((r,i) => `<span class="dice ${r >= 4 ? 'good' : 'bad'}">${r}${mods[i]?`<small>(${mods[i]>0?'+':''}${mods[i]})</small>`:''}</span>`).join('');
    el.innerHTML = `<div class="ef-title">掷骰</div><div class="ef-detail">${diceHTML}</div>`;
    el.classList.remove('hidden');
    el.style.borderColor = 'rgba(201,169,106,.4)';
    clearTimeout(showDiceRoll._t);
    showDiceRoll._t = setTimeout(() => el.classList.add('hidden'), 2500);
  }

  /* ---------- 事件效果注册 ---------- */

  // #1-3: 区域计分
  effects.scoring = function(card, player){
    const g = window.G;
    const result = window.scoreRegion ? window.scoreRegion(card.scoring) : null;
    if(!result){
      toast(`无法结算 ${REGIONS[card.scoring]?.zh || card.scoring}`);
      return;
    }
    const gainUs = result.scores.us;
    const gainUssr = result.scores.ussr;
    addVP('us', gainUs);
    addVP('ussr', gainUssr);
    showEffect(`结算 · ${REGIONS[card.scoring]?.zh || card.scoring}`,
      `美国 +${gainUs} VP · 苏联 +${gainUssr} VP`,
      'rgba(201,169,106,.6)');
    sfx('score');
    flash('#c9a96a', 8);
    if(result.autoWin && result.winner){
      window.declareWinner && window.declareWinner(result.winner,
        `控制 ${REGIONS[card.scoring]?.zh || card.scoring}！`);
      return;
    }
    if(result.domination){
      toast(`⚠ ${REGIONS[card.scoring]?.zh} 支配！`);
    }
  };

  // #4: DEFCON -1, US gains (5-DEFCON) VP
  effects[4] = function(card, player){
    changeDefcon(-1);
    const vp = 5 - window.G.defcon;
    addVP('us', vp);
    showEffect('DEFCON -1', `美国 +${vp} VP`, '#4a7fb5');
    sfx('defcon');
    shake(4);
  };

  // #5: Five-Year Plan - USSR discards random card, triggers US event
  effects[5] = function(card, player){
    const g = window.G;
    const h = g.hand.ussr;
    if(!h.length){
      toast('苏联手牌为空，五年计划无效果');
      return;
    }
    const i = Math.floor(Math.random() * h.length);
    const c = h.splice(i, 1)[0];
    showEffect('五年计划', `苏联弃掉 ${c.zh}`, '#c8102e');
    sfx('card');
    if(c.side === 'us' && !c.scoring){
      toast(`触发美方事件 "${c.zh}"`);
      setTimeout(() => effects[c.n] && effects[c.n](c, 'ussr'), 500);
    } else {
      window.discardCard && window.discardCard(c);
    }
  };

  // #6: China card - give to opponent
  effects[6] = function(card, player){
    const opp = opponent(player);
    window.G.chinaCardOwner = opp;
    showEffect('中国牌', `交给 ${opp === 'us' ? '美国' : '苏联'}`, opp === 'us' ? '#4a7fb5' : '#c8102e');
    sfx('card');
  };

  // #7: NATO - remove 3 US inf from WE (max 2 per country)
  effects[7] = function(card, player){
    const g = window.G;
    if(g.flags.ironlady){
      toast('铁娘子已生效，北约无效');
      return;
    }
    const we = ['uk','france','west_germany','italy','spain_pt','benelux'];
    let left = 3;
    const sorted = we.slice().sort((a,b) => getInf('us',b) - getInf('us',a));
    let total = 0;
    for(const c of sorted){
      if(left <= 0) break;
      const take = Math.min(left, Math.min(2, getInf('us',c)));
      if(take > 0){ remInf('us',c,take); left -= take; total += take; }
    }
    showEffect('北约', `移除 ${total} 点美方影响力`, '#4a7fb5');
    sfx('ops');
    flash('#4a7fb5', 4);
  };

  // #8: Bay of Pigs - clear US from Cuba, USSR controls
  effects[8] = function(card, player){
    remInf('us', 'cuba', 999);
    const s = getInf('ussr','cuba'), u = getInf('us','cuba');
    if(s <= u) addInf('ussr', 'cuba', u - s + 1);
    showEffect('猪湾事件', '古巴 → 苏联控制', '#c8102e');
    sfx('ops');
    flash('#c8102e', 5);
  };

  // #9: Vietnam +2 USSR
  effects[9] = function(card, player){
    addInf('ussr', 'vietnam', 2);
    showEffect('越南', '+2 苏联影响力', '#c8102e');
    sfx('ops');
  };

  // #10: Cuba Quagmire - discard US 3+ ops or clear Germany
  effects[10] = function(card, player){
    const g = window.G;
    const h = g.hand.us;
    const idx = h.findIndex(c => (c.ops||0) >= 3 && !c.scoring);
    if(idx >= 0){
      const c = h.splice(idx, 1)[0];
      window.discardCard && window.discardCard(c);
      showEffect('古巴泥潭', `美方弃掉 ${c.zh}`, '#c8102e');
    } else {
      remInf('us', 'west_germany', 999);
      showEffect('古巴泥潭', '西德美方全清', '#c8102e');
    }
    sfx('card');
  };

  // #11: Korea - dice roll based on US-controlled neighbors
  effects[11] = function(card, player){
    let mod = 0;
    for(const c of ['north_korea','japan','china']) if(isControlled('us',c)) mod++;
    const r = rollDie(-mod);
    showDiceRoll([r], [-mod], r);
    if(r >= 4){
      addVP('ussr', 2);
      remInf('us', 'south_korea', 999);
      addInf('ussr', 'south_korea', 1);
      window.G.milOps.ussr += 2;
      showEffect('韩战', '苏联 +2 VP · 替换南韩 · +2 军行', '#c8102e');
      sfx('score');
      shake(5);
    } else {
      toast('韩战 · 苏联未达 4，无效果');
    }
  };

  // #12: Bucharest Coup - clear US from Romania, USSR controls
  effects[12] = function(card, player){
    remInf('us', 'romania', 999);
    const s = getInf('ussr','romania'), u = getInf('us','romania');
    if(s <= u) addInf('ussr', 'romania', u - s + 1);
    showEffect('布加勒斯特政变', '罗马尼亚 → 苏联控制', '#c8102e');
    sfx('ops');
    flash('#c8102e', 5);
  };

  // #13: Six-Day War - dice roll based on US-controlled ME neighbors
  effects[13] = function(card, player){
    const g = window.G;
    if(g.flags.campdavid){ toast('戴维营已生效，六日战争无效'); return; }
    let mod = 0;
    for(const c of ['israel','iraq','egypt','syria','jordan']) if(isControlled('us',c)) mod++;
    const r = rollDie(-mod);
    showDiceRoll([r], [-mod], r);
    if(r >= 4){
      addVP('ussr', 2);
      remInf('us', 'israel', 999);
      addInf('ussr', 'israel', 1);
      g.milOps.ussr += 2;
      showEffect('六日战争', '苏联 +2 VP · 替换以色列 · +2 军行', '#c8102e');
      sfx('score');
      shake(5);
    } else {
      toast('六日战争 · 苏联未达 4，无效果');
    }
  };

  // #14: Four East EU countries +1 USSR
  effects[14] = function(card, player){
    const ee = ['east_germany','poland','czechoslovakia','hungary','yugoslavia','romania','bulgaria'];
    let n = 0;
    for(const c of ee){
      if(n >= 4) break;
      if(!isControlled('us',c)){ addInf('ussr',c,1); n++; }
    }
    showEffect('东欧扩张', `+${n} 苏联影响力（东欧）`, '#c8102e');
    sfx('ops');
  };

  // #15: Egypt - +2 USSR, halve US
  effects[15] = function(card, player){
    addInf('ussr', 'egypt', 2);
    const u = getInf('us', 'egypt');
    remInf('us', 'egypt', Math.ceil(u/2));
    showEffect('埃及', '+2 苏联 · 美方减半', '#c8102e');
    sfx('ops');
  };

  // #16: Eastern Europe clear - clear US from 4 EE countries
  effects[16] = function(card, player){
    const g = window.G;
    const ee = ['east_germany','poland','czechoslovakia','hungary','yugoslavia','romania','bulgaria'];
    let n = 0;
    for(const c of ee){
      if(n >= 4) break;
      if(getInf('us',c) > 0){ remInf('us',c,999); n++; }
    }
    showEffect('东欧美方清除', `清除 ${n} 国美方`, '#c8102e');
    sfx('ops');
    flash('#c8102e', 5);
  };

  // #17: May 68 - France -2 US +1 USSR, cancel NATO
  effects[17] = function(card, player){
    remInf('us', 'france', 2);
    addInf('ussr', 'france', 1);
    window.G.flags.nato = false;
    showEffect('五月风暴', '法国 -2 美 +1 苏 · 北约失效', '#c8102e');
    sfx('ops');
    shake(3);
  };

  // #18: Space +1
  effects[18] = function(card, player){
    const g = window.G;
    if(g.space[player] < 8) g.space[player]++;
    showEffect('太空竞赛', `+1 格`, player === 'us' ? '#4a7fb5' : '#c8102e');
    sfx('space');
  };

  // #19: Remove USSR inf from one non-Soviet-controlled EU country
  effects[19] = function(card, player){
    const targets = ['uk','france','west_germany','italy','spain_pt','benelux','east_germany','poland','czechoslovakia','hungary','yugoslavia','romania','bulgaria'];
    for(const c of targets){
      if(!isControlled('ussr',c) && getInf('ussr',c) > 0){
        remInf('ussr', c, 999);
        showEffect('欧洲影响力清除', `${COUNTRIES[c]?.name || c} → 苏方全清`, '#4a7fb5');
        sfx('ops');
        return;
      }
    }
    toast('无可清除的目标');
  };

  // #20: UN Intervention - dice roll, 2 VP or DEFCON -1
  effects[20] = function(card, player){
    const opp = opponent(player);
    const a = rollDie(2), b = rollDie(0);
    showDiceRoll([a, b], [2, 0], [a, b]);
    if(a > b){
      addVP(player, 2);
      showEffect('联合国干预', `${player==='us'?'美国':'苏联'} +2 VP`, player==='us'?'#4a7fb5':'#c8102e');
    } else if(b > a){
      addVP(opp, 2);
      showEffect('联合国干预', `${opp==='us'?'美国':'苏联'} +2 VP`, opp==='us'?'#4a7fb5':'#c8102e');
    } else {
      changeDefcon(-1);
      showEffect('联合国干预', 'DEFCON -1', '#ffcc00');
      shake(4);
    }
    sfx('dice');
  };

  // #21: NATO - set flag
  effects[21] = function(card, player){
    window.G.flags.nato = true;
    showEffect('北约', '北约生效！欧洲美方 Ops +1', '#4a7fb5');
    sfx('card');
  };

  // #22: Soviet sphere - US increases to match USSR in one EE country
  effects[22] = function(card, player){
    const targets = ['yugoslavia','romania','bulgaria','hungary','czechoslovakia'];
    for(const c of targets){
      const s = getInf('ussr',c), u = getInf('us',c);
      if(s > u){
        addInf('us', c, s - u);
        showEffect('苏联势力范围', `${COUNTRIES[c]?.name || c} → 美方追平`, '#4a7fb5');
        sfx('ops');
        return;
      }
    }
    toast('无可操作的目标');
  };

  // #23: European expansion - +1 US in 7 non-Soviet-controlled EU countries
  effects[23] = function(card, player){
    const targets = ['uk','france','west_germany','italy','spain_pt','benelux','east_germany','poland','czechoslovakia','hungary','yugoslavia','romania','bulgaria'];
    let n = 0;
    for(const c of targets){
      if(n >= 7) break;
      if(!isControlled('ussr',c)){ addInf('us',c,1); n++; }
    }
    showEffect('欧洲扩张', `+${n} 美方影响力`, '#4a7fb5');
    sfx('ops');
  };

  // #24: India/Pakistan invasion - dice roll
  effects[24] = function(card, player){
    const opp = opponent(player);
    const tgt = Math.random() < 0.5 ? 'india' : 'pakistan';
    let mod = 0;
    for(const c of (COUNTRIES[tgt]?.neighbors||[])) if(isControlled(opp,c)) mod++;
    const r = rollDie(-mod);
    showDiceRoll([r], [-mod], r);
    if(r >= 4){
      addVP(player, 2);
      remInf(opp, tgt, 999);
      addInf(player, tgt, 1);
      window.G.milOps[player] += 2;
      showEffect('印巴入侵', `${player==='us'?'美国':'苏联'} +2 VP · 替换 ${tgt}`, player==='us'?'#4a7fb5':'#c8102e');
      sfx('score');
      shake(5);
    } else {
      toast('印巴入侵 · 未达 4，无效果');
    }
  };

  // #25: Containment - set flag
  effects[25] = function(card, player){
    window.G.flags.containment = true;
    showEffect('遏制政策', '遏制生效！亚洲苏联 Ops +1', '#4a7fb5');
    sfx('card');
  };

  // #26: Vietnam - simplified
  effects[26] = function(card, player){
    showEffect('越南战争', '（简化效果）', '#4a7fb5');
    sfx('card');
  };

  // #27: Japan - US controls, no Soviet coup
  effects[27] = function(card, player){
    const s = getInf('us','japan'), o = getInf('ussr','japan');
    if(s <= o) addInf('us','japan', o - s + 1);
    window.G.flags.nato_japan = true;
    showEffect('日美同盟', '美国控制日本 · 苏方无法政变', '#4a7fb5');
    sfx('ops');
  };

  // #28: UK/France/Israel - remove 2 US if not controlled
  effects[28] = function(card, player){
    let n = 0;
    for(const c of ['uk','france','israel']){
      if(!isControlled('us',c)){ remInf('us',c,2); n++; }
    }
    showEffect('撤军', `${n} 国 -2 美方`, '#c8102e');
    sfx('ops');
  };

  // #29: Eastern Europe - remove USSR inf from 3 countries
  effects[29] = function(card, player){
    const amount = window.G.turn <= 3 ? 1 : 2;
    const ee = ['east_germany','poland','czechoslovakia','hungary','yugoslavia','romania','bulgaria'];
    const sorted = ee.slice().sort((a,b) => getInf('ussr',b) - getInf('ussr',a));
    for(let i=0;i<3;i++){
      if(sorted[i]) remInf('ussr', sorted[i], amount);
    }
    showEffect('东欧美方干预', `移除 3 国苏联影响力（每国 ${amount}）`, '#4a7fb5');
    sfx('ops');
  };

  // #30: Africa/SE Asia - +1 USSR in 4 countries
  effects[30] = function(card, player){
    const targets = ['angola','algeria','sudan','libya','congo','zambia','vietnam','laos','myanmar'];
    let n = 0;
    for(const c of targets){
      if(n >= 4) break;
      addInf('ussr', c, 1); n++;
    }
    showEffect('亚非扩张', `+${n} 苏联影响力`, '#c8102e');
    sfx('ops');
  };

  // #31: Red Scare - set flag
  effects[31] = function(card, player){
    window.G.flags.redScare = player;
    showEffect('红色恐慌', `${player==='us'?'美国':'苏联'} 主导`, player==='us'?'#4a7fb5':'#c8102e');
    sfx('card');
  };

  // #32: UN Intervention (cancel previous event) - simplified
  effects[32] = function(card, player){
    showEffect('联合国干预', '取消前一事件效果', '#ffcc00');
    sfx('card');
  };

  // #33: Eastern Europe +1 USSR in 4 non-Soviet-controlled countries
  effects[33] = function(card, player){
    const ee = ['east_germany','poland','czechoslovakia','hungary','yugoslavia','romania','bulgaria'];
    let n = 0;
    for(const c of ee){
      if(n >= 4) break;
      if(!isControlled('ussr',c)){ addInf('ussr',c,1); n++; }
    }
    showEffect('东欧扩张', `+${n} 苏联影响力`, '#c8102e');
    sfx('ops');
  };

  // #34: DEFCON +1
  effects[34] = function(card, player){
    changeDefcon(1);
    showEffect('DEFCON +1', '紧张局势缓和', '#4a7fb5');
    sfx('defcon');
  };

  // #35: Taiwan - +1 VP if US controls, equalize
  effects[35] = function(card, player){
    if(isControlled('us','taiwan')) addVP('us',1);
    const s = getInf('us','taiwan'), o = getInf('ussr','taiwan');
    if(s <= o) addInf('us','taiwan', o - s + 1);
    showEffect('台湾', '美国控制 · +1 VP（如已控）', '#4a7fb5');
    sfx('ops');
  };

  // #103: +1 VP, discard 1 USSR card
  effects[103] = function(card, player){
    addVP('us', 1);
    if(window.G.hand.ussr.length){
      const i = Math.floor(Math.random() * window.G.hand.ussr.length);
      const c = window.G.hand.ussr.splice(i, 1)[0];
      window.discardCard && window.discardCard(c);
      showEffect('美国 +1 VP', `苏联弃掉 ${c.zh}`, '#4a7fb5');
    } else {
      showEffect('美国 +1 VP', '苏联无牌可弃', '#4a7fb5');
    }
    sfx('score');
  };

  // #36: Brush War - attack low stability country
  effects[36] = function(card, player){
    const targets = Object.keys(window.COUNTRIES).filter(k => {
      const c = window.COUNTRIES[k];
      return c.stability <= 2 && !c.superpower;
    });
    if(!targets.length){
      showEffect('小规模战争', '无目标', '#ffcc00');
      return;
    }
    const t = targets[Math.floor(Math.random() * targets.length)];
    const g = window.G;
    const opp = opponent(player);
    const roll = rollDie(0);
    if(roll >= 3){
      addVP(player, 1);
      remInf(opp, t, getInf(opp, t));
      addInf(player, t, 1);
      showEffect('小规模战争', `攻击 ${window.COUNTRIES[t]?.zh || t} · 骰 ${roll} · +1 VP`, '#ffcc00');
      flash('#ffcc00', 10);
      sfx('roll');
    } else {
      showEffect('小规模战争', `攻击 ${window.COUNTRIES[t]?.zh || t} · 骰 ${roll} · 失败`, '#ff6600');
      sfx('roll');
    }
  };

  // #37-38: Scoring cards (handled by effects.scoring)

  // #39: Arms Race - both players +1 VP
  effects[39] = function(card, player){
    const roll = rollDie(0);
    if(roll <= 3){
      addVP(player, 1);
      showEffect('军备竞赛', `骰 ${roll} · +1 VP`, '#ffcc00');
    } else {
      showEffect('军备竞赛', `骰 ${roll} · 无效果`, '#ffcc00');
    }
    sfx('roll');
  };

  // #40: Cuban Missile Crisis - DEFCON to 2, US discards event
  effects[40] = function(card, player){
    window.G.defcon = 2;
    showEffect('古巴导弹危机', 'DEFCON = 2 · 美国需弃事件', '#c8102e');
    shake(6);
    flash('#c8102e', 12);
    sfx('defcon');
  };

  // #41: Nuclear Submarines - US +2 VP, DEFCON +1
  effects[41] = function(card, player){
    addVP('us', 2);
    changeDefcon(1);
    showEffect('核潜艇', '美国 +2 VP · DEFCON +1', '#4a7fb5');
    sfx('score');
  };

  // #42: Quagmire - US loses 2 Ops this turn
  effects[42] = function(card, player){
    window.G.flags.quagmire = true;
    showEffect('越南泥潭', '美国本回合 Ops -2', '#c8102e');
    sfx('card');
  };

  // #43: SALT Negotiations - DEFCON +1, both draw card
  effects[43] = function(card, player){
    changeDefcon(1);
    window.drawCard && window.drawCard('us', 1);
    window.drawCard && window.drawCard('ussr', 1);
    showEffect('SALT 谈判', 'DEFCON +1 · 双方抽 1 牌', '#ffcc00');
    sfx('card');
  };

  // #44: Bear Trap - USSR +2 VP, US loses 2 Ops
  effects[44] = function(card, player){
    addVP('ussr', 2);
    window.G.flags.quagmire = true;
    showEffect('熊陷阱', '苏联 +2 VP · 美国 Ops -2', '#c8102e');
    sfx('score');
  };

  // #45: Summit - each player draws 2 cards
  effects[45] = function(card, player){
    window.drawCard && window.drawCard('us', 2);
    window.drawCard && window.drawCard('ussr', 2);
    showEffect('峰会', '双方各抽 2 牌', '#ffcc00');
    sfx('card');
  };

  // #46: How I Learned to Stop Worrying - DEFCON -1, USSR +VP
  effects[46] = function(card, player){
    changeDefcon(-1);
    const vp = 5 - window.G.defcon;
    addVP('ussr', vp);
    showEffect('奇爱博士', `DEFCON -1 · 苏联 +${vp} VP`, '#c8102e');
    shake(4);
    sfx('defcon');
  };

  // #47: Junta - roll for influence
  effects[47] = function(card, player){
    const roll = rollDie(0);
    if(roll <= 3){
      const latam = ['venezuela','cuba','mexico','nicaragua','panama','costa_rica','bolivia','argentina','chile','peru','colombia'];
      const t = latam[Math.floor(Math.random() * latam.length)];
      addInf('ussr', t, 2);
      showEffect('军政府', `骰 ${roll} · ${window.COUNTRIES[t]?.zh} +2 苏联`, '#c8102e');
    } else {
      const africa = ['angola','zambia','mozambique','congo','zimbabwe','sudan','egypt','libya'];
      const t = africa[Math.floor(Math.random() * africa.length)];
      addInf('ussr', t, 2);
      showEffect('军政府', `骰 ${roll} · ${window.COUNTRIES[t]?.zh} +2 苏联`, '#c8102e');
    }
    sfx('roll');
  };

  // #48: Kitchen Debates - roll for VP
  effects[48] = function(card, player){
    const roll = rollDie(0);
    if(roll >= 4){
      addVP(player, 1);
      showEffect('厨房辩论', `骰 ${roll} · ${player==='us'?'美国':'苏联'} +1 VP`, '#ffcc00');
    } else {
      showEffect('厨房辩论', `骰 ${roll} · 无效果`, '#ffcc00');
    }
    sfx('roll');
  };

  // #49: Missile Envy - DEFCON +1, opponent draws card
  effects[49] = function(card, player){
    changeDefcon(1);
    window.drawCard && window.drawCard(player, 1);
    showEffect('导弹狂热', 'DEFCON +1 · 抽 1 牌', '#ffcc00');
    sfx('card');
  };

  // #50: We Will Bury You - DEFCON -1, USSR +VP
  effects[50] = function(card, player){
    if(window.G.flags.cubanMissileCrisis || window.G.flags.glassHouse) {
      showEffect('我们要埋葬你们', '已被其他事件抵消', '#c8102e');
      return;
    }
    changeDefcon(-1);
    const vp = 5 - window.G.defcon;
    addVP('ussr', vp);
    showEffect('我们要埋葬你们', `DEFCON -1 · 苏联 +${vp} VP`, '#c8102e');
    shake(4);
    sfx('defcon');
  };

  // #51: Brezhnev Doctrine - USSR Ops +1 this turn
  effects[51] = function(card, player){
    window.G.flags.brezhnev = true;
    showEffect('勃列日涅夫主义', '苏联本回合 Ops +1', '#c8102e');
    sfx('card');
  };

  // #52: Portuguese Empire Crumbles - +2 USSR to Angola, Mozambique
  effects[52] = function(card, player){
    addInf('ussr', 'angola', 2);
    addInf('ussr', 'mozambique', 2);
    showEffect('葡萄牙帝国崩溃', '安哥拉、莫桑比克各 +2 苏联', '#c8102e');
    sfx('ops');
  };

  // #53: South African Unrest - +2 USSR to SA or +1 SA + 1 adjacent
  effects[53] = function(card, player){
    addInf('ussr', 'south_africa', 2);
    showEffect('南非动荡', '南非 +2 苏联', '#c8102e');
    sfx('ops');
  };

  // #54: Allende - +2 USSR to Chile
  effects[54] = function(card, player){
    addInf('ussr', 'chile', 2);
    showEffect('阿连德', '智利 +2 苏联', '#c8102e');
    sfx('ops');
  };

  // #55: Willy Brandt - +1 USSR to West Germany, cancel NATO
  effects[55] = function(card, player){
    addInf('ussr', 'west_germany', 1);
    window.G.flags.willyBrandt = true;
    showEffect('维利·勃兰特', '西德 +1 苏联 · 取消北约效果', '#c8102e');
    sfx('ops');
  };

  // #56: Muslim Revolution - +2 USSR to Middle East country
  effects[56] = function(card, player){
    const me = ['egypt','iran','libya','iraq','saudi_arabia','syria','jordan','sudan'];
    const t = me[Math.floor(Math.random() * me.length)];
    addInf('ussr', t, 2);
    showEffect('穆斯林革命', `${window.COUNTRIES[t]?.zh} +2 苏联`, '#c8102e');
    sfx('ops');
  };

  // #57: ABM Treaty - DEFCON +1
  effects[57] = function(card, player){
    changeDefcon(1);
    showEffect('反导条约', 'DEFCON +1', '#ffcc00');
    sfx('defcon');
  };

  // #58: Cultural Revolution - China card to US
  effects[58] = function(card, player){
    if(window.G.chinaCardOwner === 'ussr'){
      window.G.chinaCardOwner = 'us';
      showEffect('文化大革命', '中国牌转美国', '#c8102e');
    } else {
      addVP('ussr', 2);
      showEffect('文化大革命', '美国已持牌 · 苏联 +2 VP', '#c8102e');
    }
    sfx('card');
  };

  // #59: Flower Power - USSR +2 VP on US war card
  effects[59] = function(card, player){
    window.G.flags.flowerPower = true;
    showEffect('花之力量', '美国战争卡触发时苏联 +2 VP', '#c8102e');
    sfx('card');
  };

  // #60: U2 Incident - USSR +1 VP, +1 if UN Intervention
  effects[60] = function(card, player){
    addVP('ussr', 1);
    showEffect('U-2 事件', '苏联 +1 VP', '#c8102e');
    sfx('score');
  };

  // #61: OPEC - USSR +1 VP per ME country controlled
  effects[61] = function(card, player){
    const me = ['egypt','iran','libya','iraq','saudi_arabia','gulf_states','venezuela'];
    let vp = 0;
    for(const c of me){
      if(isControlled('ussr', c)) vp++;
    }
    addVP('ussr', vp);
    showEffect('欧佩克', `苏联 +${vp} VP`, '#c8102e');
    sfx('score');
  };

  // #62: Lone Gunman - USSR uses Ops value
  effects[62] = function(card, player){
    showEffect('独狼', '苏联展示手牌 · 可用 Ops', '#c8102e');
    sfx('card');
  };

  // #63: Colonial Rear Guards - +1 US to 4 Africa/SE Asia countries
  effects[63] = function(card, player){
    const targets = ['angola','algeria','sudan','libya','congo','zambia','vietnam','laos','myanmar'];
    let n = 0;
    for(const c of targets){
      if(n >= 4) break;
      addInf('us', c, 1); n++;
    }
    showEffect('殖民后卫', `+${n} 美国影响力`, '#4a7fb5');
    sfx('ops');
  };

  // #64: Panama Canal Returned - +1 US to Panama, Costa Rica, Venezuela
  effects[64] = function(card, player){
    addInf('us', 'panama', 1);
    addInf('us', 'costa_rica', 1);
    addInf('us', 'venezuela', 1);
    showEffect('巴拿马运河', '巴拿马、哥斯达黎加、委内瑞拉各 +1 美国', '#4a7fb5');
    sfx('ops');
  };

  // #65: Camp David Accords - +1 US to Israel, +1 USSR to Egypt, USSR +1 VP
  effects[65] = function(card, player){
    addInf('us', 'israel', 1);
    addInf('ussr', 'egypt', 1);
    addVP('ussr', 1);
    showEffect('戴维营协议', '以色列 +1 美国 · 埃及 +1 苏联 · 苏联 +1 VP', '#ffcc00');
    sfx('ops');
  };

  // #66: Junta (US version) - same as 47 but for US
  effects[66] = function(card, player){
    const roll = rollDie(0);
    if(roll <= 3){
      const latam = ['venezuela','cuba','mexico','nicaragua','panama','costa_rica','bolivia','argentina','chile','peru','colombia'];
      const t = latam[Math.floor(Math.random() * latam.length)];
      addInf('us', t, 2);
      showEffect('军政府', `骰 ${roll} · ${window.COUNTRIES[t]?.zh} +2 美国`, '#4a7fb5');
    } else {
      const africa = ['angola','zambia','mozambique','congo','zimbabwe','sudan','egypt','libya'];
      const t = africa[Math.floor(Math.random() * africa.length)];
      addInf('us', t, 2);
      showEffect('军政府', `骰 ${roll} · ${window.COUNTRIES[t]?.zh} +2 美国`, '#4a7fb5');
    }
    sfx('roll');
  };

  // #67: China Card (USSR version) - China card to US
  effects[67] = function(card, player){
    if(window.G.chinaCardOwner === 'ussr'){
      window.G.chinaCardOwner = 'us';
      showEffect('中国牌', '转美国（面朝下）', '#c8102e');
    } else {
      addVP('ussr', 2);
      showEffect('中国牌', '美国已持牌 · 苏联 +2 VP', '#c8102e');
    }
    sfx('card');
  };

  // #68: John Paul II - +1 US to Poland, +1 USSR to West Germany, US +1 VP
  effects[68] = function(card, player){
    addInf('us', 'poland', 1);
    addInf('ussr', 'west_germany', 1);
    addVP('us', 1);
    showEffect('教皇若望保禄二世', '波兰 +1 美国 · 西德 +1 苏联 · 美国 +1 VP', '#ffcc00');
    sfx('ops');
  };

  // #69: Space Race (USSR version) - draw card from discard
  effects[69] = function(card, player){
    showEffect('太空竞赛', '苏联领先 · 从弃牌堆取卡', '#c8102e');
    sfx('card');
  };

  // #70: Space Race (US version) - US +1 VP per US-controlled battleground
  effects[70] = function(card, player){
    const me = ['iran','iraq','saudi_arabia','syria','israel','libya','egypt','jordan','sudan'];
    let vp = 0;
    for(const c of me){
      if(isControlled('us', c) && window.COUNTRIES[c]?.battleground) vp++;
    }
    addVP('us', vp);
    showEffect('太空竞赛', `美国 +${vp} VP`, '#4a7fb5');
    sfx('score');
  };

  // #71: China Card (US version) - China card to USSR
  effects[71] = function(card, player){
    if(window.G.chinaCardOwner === 'us'){
      window.G.chinaCardOwner = 'ussr';
      showEffect('中国牌', '转苏联', '#4a7fb5');
    } else {
      addInf('us', 'china', 4);
      showEffect('中国牌', '苏联已持牌 · 亚洲 +4 美国', '#4a7fb5');
    }
    sfx('card');
  };

  // #72: Mossad - +1 US to Egypt, remove all USSR from Egypt
  effects[72] = function(card, player){
    remInf('ussr', 'egypt', getInf('ussr', 'egypt'));
    addInf('us', 'egypt', 1);
    showEffect('摩萨德', '埃及：移除苏联 · +1 美国', '#4a7fb5');
    sfx('ops');
  };

  // #73: South Korea - remove 1 US from SK, +1 USSR to SK
  effects[73] = function(card, player){
    remInf('us', 'south_korea', getInf('us', 'south_korea'));
    addInf('ussr', 'south_korea', 1);
    showEffect('韩国', '韩国：移除美国 · +1 苏联', '#c8102e');
    sfx('ops');
  };

  // #74: Anti-American Uprising - -4 USSR from non-Europe countries
  effects[74] = function(card, player){
    const targets = Object.keys(window.COUNTRIES).filter(k => {
      const c = window.COUNTRIES[k];
      return c.region !== 'europe' && !c.superpower;
    });
    let n = 0;
    for(const c of targets){
      if(n >= 4) break;
      remInf('ussr', c, getInf('ussr', c));
      n++;
    }
    showEffect('反美起义', `移除 ${n} 国苏联影响力`, '#4a7fb5');
    sfx('ops');
  };

  // #75: Central America - +3 USSR to CA countries
  effects[75] = function(card, player){
    const ca = ['mexico','guatemala','honduras','nicaragua','costa_rica','panama','cuba'];
    let n = 0;
    for(const c of ca){
      if(n >= 3) break;
      addInf('ussr', c, 1);
      n++;
    }
    showEffect('中美动荡', `+${n} 苏联影响力`, '#c8102e');
    sfx('ops');
  };

  // #76: China Card (USSR v2) - China card to US
  effects[76] = function(card, player){
    if(window.G.chinaCardOwner === 'ussr'){
      window.G.chinaCardOwner = 'us';
      showEffect('中国牌', '转美国（面朝上）', '#c8102e');
    } else {
      addInf('us', 'china', 4);
      showEffect('中国牌', '美国已持牌 · 亚洲 +4 美国', '#4a7fb5');
    }
    sfx('card');
  };

  // #77: The Glass House - US discards and redraws
  effects[77] = function(card, player){
    window.G.flags.glassHouse = true;
    showEffect('玻璃屋', '美国可弃牌重抽', '#4a7fb5');
    sfx('card');
  };

  // #78: Latin America - US +1 VP per US-controlled battleground in LA
  effects[78] = function(card, player){
    const la = ['venezuela','cuba','mexico','nicaragua','panama','costa_rica','bolivia','argentina','chile','peru','colombia'];
    let vp = 0;
    for(const c of la){
      if(isControlled('us', c) && window.COUNTRIES[c]?.battleground) vp++;
    }
    addVP('us', vp);
    showEffect('拉丁美洲', `美国 +${vp} VP`, '#4a7fb5');
    sfx('score');
  };

  // #79-81: Scoring cards (handled by effects.scoring)

  // #82: Iranian Hostage Crisis - +2 USSR to Iran, -4 US from Iran
  effects[82] = function(card, player){
    remInf('us', 'iran', getInf('us', 'iran'));
    addInf('ussr', 'iran', 2);
    showEffect('伊朗人质危机', '伊朗：移除美国 · +2 苏联', '#c8102e');
    sfx('ops');
  };

  // #83: The Iron Lady - +1 USSR to UK, -1 US to UK, US +1 VP
  effects[83] = function(card, player){
    remInf('us', 'uk', getInf('us', 'uk'));
    addInf('ussr', 'uk', 1);
    addVP('us', 1);
    showEffect('铁娘子', '英国：移除美国 · +1 苏联 · 美国 +1 VP', '#c8102e');
    sfx('ops');
  };

  // #84: Sandstorm - US +1 VP per 2 USSR in Libya
  effects[84] = function(card, player){
    const vp = Math.floor(getInf('ussr', 'libya') / 2);
    addVP('us', vp);
    showEffect('沙暴', `利比亚每 2 苏联影响力美国 +1 VP · +${vp} VP`, '#4a7fb5');
    sfx('score');
  };

  // #85: Space Race (US v2) - draw from discard
  effects[85] = function(card, player){
    showEffect('太空竞赛', '美国领先 · 从弃牌堆取卡', '#4a7fb5');
    sfx('card');
  };

  // #86: Reagon Doctrine - US plays 8 cards this turn
  effects[86] = function(card, player){
    window.G.flags.reagon = true;
    showEffect('里根主义', '美国本回合可打 8 张牌', '#4a7fb5');
    sfx('card');
  };

  // #87: The Reformer - +4 USSR to Europe (6 if USSR ahead)
  effects[87] = function(card, player){
    const vp = window.G.vp.ussr > window.G.vp.us ? 6 : 4;
    const ee = ['east_germany','poland','czechoslovakia','hungary','yugoslavia','romania','bulgaria','austria','italy','greece','turkey','spain_pt'];
    let n = 0;
    for(const c of ee){
      if(n >= vp) break;
      addInf('ussr', c, 1);
      n++;
    }
    window.G.flags.reformer = true;
    showEffect('改革者', `东欧 +${n} 苏联影响力`, '#c8102e');
    sfx('ops');
  };

  // #88: Lebanon - -2 US from Lebanon and ME
  effects[88] = function(card, player){
    remInf('us', 'lebanon', getInf('us', 'lebanon'));
    remInf('us', 'israel', 1);
    showEffect('黎巴嫩内战', '黎巴嫩：移除美国 · 以色列 -1 美国', '#c8102e');
    sfx('ops');
  };

  // #89: Glasnost - DEFCON -1, US +2 VP
  effects[89] = function(card, player){
    changeDefcon(-1);
    addVP('us', 2);
    showEffect('公开性', 'DEFCON -1 · 美国 +2 VP', '#c8102e');
    shake(4);
    sfx('defcon');
  };

  // #90: Perestroika - DEFCON +1, USSR +2 VP
  effects[90] = function(card, player){
    changeDefcon(1);
    addVP('ussr', 2);
    showEffect('重建', 'DEFCON +1 · 苏联 +2 VP', '#c8102e');
    sfx('defcon');
  };

  // #91: Central America Unrest - -all US from Nicaragua, free coup attempt
  effects[91] = function(card, player){
    remInf('us', 'nicaragua', getInf('us', 'nicaragua'));
    showEffect('中美动荡', '尼加拉瓜：移除美国 · 可发动政变', '#c8102e');
    sfx('ops');
  };

  // #92: Terrorism - opponent discards 1 card (2 if Iranian Hostage Crisis played)
  effects[92] = function(card, player){
    const opp = opponent(player);
    const h = window.G.hand[opp];
    if(h.length){
      const count = window.G.flags.iranianHostage ? 2 : 1;
      for(let i = 0; i < count && h.length; i++){
        const idx = Math.floor(Math.random() * h.length);
        const c = h.splice(idx, 1)[0];
        window.discardCard && window.discardCard(c);
      }
      showEffect('恐怖主义', `${opp==='us'?'美国':'苏联'} 弃 ${count} 张牌`, '#ffcc00');
    }
    sfx('card');
  };

  // #93: Anti-American Rally - US realignment rolls -1 this turn
  effects[93] = function(card, player){
    window.G.flags.antiAmerican = true;
    showEffect('反美集会', '美国本回合再平衡掷骰 -1', '#c8102e');
    sfx('card');
  };

  // #94: Regional Tensions - US designates region, USSR can't add influence
  effects[94] = function(card, player){
    window.G.flags.regionalTensions = true;
    showEffect('地区紧张', '美国指定区域 · 苏联不能加影响力', '#4a7fb5');
    sfx('card');
  };

  // #95: Latin America Crisis - US discards 3+ Ops or USSR doubles influence in LA
  effects[95] = function(card, player){
    window.G.flags.latinCrisis = true;
    showEffect('拉丁美洲危机', '美国需弃 3+ Ops 或苏联翻倍拉美影响力', '#c8102e');
    sfx('card');
  };

  // #96: German Reunification - +3 US to West Germany, cancel Willy Brandt
  effects[96] = function(card, player){
    addInf('us', 'west_germany', 3);
    window.G.flags.willyBrandt = false;
    showEffect('德国统一', '西德 +3 美国 · 取消勃兰特效果', '#4a7fb5');
    sfx('ops');
  };

  // #97: Cold War Ends - US +1 VP, cancel Flower Power
  effects[97] = function(card, player){
    addVP('us', 1);
    window.G.flags.flowerPower = false;
    showEffect('冷战结束', '美国 +1 VP · 取消花之力量', '#4a7fb5');
    sfx('score');
  };

  // #98: Defection - US reveals hand, USSR discards 1
  effects[98] = function(card, player){
    if(window.G.hand.ussr.length){
      const idx = Math.floor(Math.random() * window.G.hand.ussr.length);
      const c = window.G.hand.ussr.splice(idx, 1)[0];
      window.discardCard && window.discardCard(c);
      showEffect('叛逃', `苏联弃掉 ${c.zh}`, '#4a7fb5');
    }
    sfx('card');
  };

  // #99: Eastern Europe - USSR +1 VP, -1 US from 3 Western Europe countries
  effects[99] = function(card, player){
    addVP('ussr', 1);
    const we = ['france','west_germany','italy','austria','greece','turkey','spain_pt','norway','sweden','denmark','finland','benelux'];
    let n = 0;
    for(const c of we){
      if(n >= 3) break;
      remInf('us', c, 1);
      n++;
    }
    showEffect('东欧', '苏联 +1 VP · 西欧 -1 美国', '#c8102e');
    sfx('score');
  };

  // #100: Chess Game - if DEFCON 2, end game, opponent +6 VP
  effects[100] = function(card, player){
    if(window.G.defcon === 2){
      window.declareWinner && window.declareWinner(opponent(player), '国际象棋！');
    } else {
      showEffect('国际象棋', 'DEFCON 不为 2 · 无效果', '#ffcc00');
    }
    sfx('card');
  };

  // #101: Solidarity - +3 US to Poland, requires John Paul II
  effects[101] = function(card, player){
    if(window.G.flags.johnPaul){
      addInf('us', 'poland', 3);
      showEffect('团结工会', '波兰 +3 美国', '#4a7fb5');
    } else {
      showEffect('团结工会', '需要先打出教皇若望保禄二世', '#ffcc00');
    }
    sfx('ops');
  };

  // #102: Middle East War - attack Iran or Iraq
  effects[102] = function(card, player){
    const t = Math.random() < 0.5 ? 'iran' : 'iraq';
    const opp = opponent(player);
    const roll = rollDie(0);
    if(roll >= 4){
      addVP(player, 2);
      remInf(opp, t, getInf(opp, t));
      addInf(player, t, 1);
      showEffect('中东战争', `攻击 ${window.COUNTRIES[t]?.zh} · 骰 ${roll} · +2 VP`, '#ffcc00');
      flash('#ffcc00', 10);
    } else {
      showEffect('中东战争', `攻击 ${window.COUNTRIES[t]?.zh} · 骰 ${roll} · 失败`, '#ff6600');
    }
    sfx('roll');
  };

  // #104: The Cambridge Five - USSR +2 VP, requires Aldrich Ames
  effects[104] = function(card, player){
    if(!window.G.flags.aldrichAmes){
      showEffect('剑桥五杰', '需要先打出奥尔德里奇·艾姆斯', '#ffcc00');
      return;
    }
    addVP('ussr', 2);
    window.G.flags.cambridgeFive = true;
    showEffect('剑桥五杰', '苏联 +2 VP', '#c8102e');
    sfx('score');
  };

  // #105: Special Relationship - US +2 VP, requires Cambridge Five
  effects[105] = function(card, player){
    if(!window.G.flags.cambridgeFive){
      showEffect('特殊关系', '需要先打出剑桥五杰', '#ffcc00');
      return;
    }
    addVP('us', 2);
    window.G.flags.specialRelationship = true;
    showEffect('特殊关系', '美国 +2 VP', '#4a7fb5');
    sfx('score');
  };

  // #106: NORAD - DEFCON +1, US coup +1 this turn
  effects[106] = function(card, player){
    changeDefcon(1);
    window.G.flags.norad = true;
    showEffect('北美防空司令部', 'DEFCON +1 · 美国政变 +1', '#4a7fb5');
    sfx('defcon');
  };

  // #107: Che - Cuba +1 USSR, USSR can add 1 to Latin America
  effects[107] = function(card, player){
    addInf('ussr', 'cuba', 1);
    window.G.flags.che = true;
    showEffect('切·格瓦拉', '古巴 +1 苏联 · 可拉美 +1', '#c8102e');
    sfx('ops');
  };

  // #108: Our Man in Tehran - US +1 VP, Iran +1 US
  effects[108] = function(card, player){
    addVP('us', 1);
    addInf('us', 'iran', 1);
    showEffect('我们在德黑兰的人', '美国 +1 VP · 伊朗 +1 美国', '#4a7fb5');
    sfx('score');
  };

  // #109: Yuri and Samantha - USSR +2 VP, look at US hand
  effects[109] = function(card, player){
    addVP('ussr', 2);
    window.G.flags.yuriSamantha = true;
    showEffect('尤里与萨曼莎', '苏联 +2 VP · 可看美国手牌', '#c8102e');
    sfx('score');
  };

  // #110: AWACS Sale to Saudis - Gulf States +2 US
  effects[110] = function(card, player){
    addInf('us', 'gulf_states', 2);
    showEffect('预警机售沙特', '海湾国家 +2 美国', '#4a7fb5');
    sfx('ops');
  };

  /* ---------- 主入口 ---------- */
  function play(card, player){
    const g = window.G;
    const opp = opponent(player);
    log(`打出事件: ${card.zh}`, player);
    sfx('card');

    if(card.scoring){
      effects.scoring(card, player);
    } else {
      const fn = effects[card.n];
      if(fn){
        fn(card, player);
      } else {
        toast(`未知事件 #${card.n} ${card.zh}`);
      }
    }

    // 弃牌
    window.discardCard && window.discardCard(card);
  }

  return { play, effects };
})();

window.EVENT = EVENT;