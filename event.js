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