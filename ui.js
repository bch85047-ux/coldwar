/* ===== 冷战热斗 · UI 渲染 ===== */

const UI = (() => {
  let dragging = null;
  let ghost = null;

  function el(id){ return document.getElementById(id); }

  /* ---------- 卡牌 HTML ---------- */
  function cardHTML(c){
    const sideCls = c.side === 'neutral' ? 'neutral' : c.side;
    const opsTxt = c.scoring ? '★' : String(c.ops);
    const periodZh = c.period === 'early' ? '早期战争' : c.period === 'mid' ? '危机战争' : '冷战晚期';
    return `
      <div class="cname">${escapeHtml(c.zh)}</div>
      <div class="cops"><span class="cn">${c.n}</span>${opsTxt}</div>
      <div class="cside-mark">${sideCls === 'us' ? 'USA' : sideCls === 'ussr' ? 'SSSR' : 'NEUTRAL'}</div>
      <div class="cdesc">${escapeHtml(c.text)}</div>
      <div class="cfoot">${periodZh} · ${c.en.toUpperCase()}</div>
    `;
  }

  function cardHTMLBack(){
    return `<div class="card-back-mark">★ ★ ★</div><div class="card-back-en">COLD WAR · BUREAU</div>`;
  }

  function escapeHtml(s){
    return String(s||'').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  }

  /* ---------- 主渲染 ---------- */
  function render(){
    if(typeof G === 'undefined' || !G) return;
    const g = G;
    el('turnStat').innerHTML = `回合 <b>${g.turn}</b>/10`;
    const ps = el('periodStat');
    if(ps){
      ps.textContent = {early:'早期战争', mid:'危机战争', late:'冷战晚期'}[getPeriod(g.turn)] || 'EARLY WAR';
      ps.classList.remove('early','mid','late');
      ps.classList.add(getPeriod(g.turn));
    }
    const dc = el('defconStat');
    dc.innerHTML = `DEFCON <b>${g.defcon}</b>`;
    dc.classList.remove('defcon-1','defcon-2');
    if(g.defcon === 1) dc.classList.add('defcon-1');
    else if(g.defcon === 2) dc.classList.add('defcon-2');
    el('vpStat').innerHTML = `VP <b class="us-vp">${g.vp.us}</b>-<b class="ussr-vp">${g.vp.ussr}</b>`;
    el('activeStat').innerHTML = `先手 <b class="${g.activePlayer==='us'?'us-vp':'ussr-vp'}">${g.activePlayer==='us'?'美国':'苏联'}</b>`;

    renderHand();
    renderMapCountries();
    renderPlayers();
    renderSpaceRace();
    renderTurnInfo();
    renderLog();
    renderDiscard();
  }

  /* ---------- 手牌 ---------- */
  function renderHand(){
    const g = G;
    const isHuman = g.mode === 'hotseat' || g.activePlayer === g.playerSide;
    const mySide = g.mode === 'hotseat' ? g.activePlayer : g.playerSide;
    const hand = g.hand[mySide] || [];
    const bar = el('handBar');
    const label = el('handLabel');
    const holder = el('handCards');
    if(!bar || !holder) return;

    label.textContent = `${mySide === 'us' ? '美国' : '苏联'} · ${hand.length}`;
    bar.classList.remove('active-us','active-ussr');
    if(g.phase !== 'ended') bar.classList.add('active-' + mySide);

    holder.innerHTML = hand.map((c, i) => {
      const mine = g.mode === 'hotseat' ? true : mySide === g.activePlayer;
      return `<div class="card ${c.side} ${c.scoring ? 'scoring' : ''}" data-idx="${i}" ${(!mine || g.phase === 'ended') ? 'style="pointer-events:none;opacity:.55"' : ''}>
        ${cardHTML(c)}
      </div>`;
    }).join('');

    holder.querySelectorAll('.card').forEach((node, i) => {
      const card = hand[i];
      // 统一走 pointerdown：轻点 = 打开投放面板；位移超过阈值 = 真拖到区域
      node.addEventListener('pointerdown', ev => {
        if(ev.button !== undefined && ev.button !== 0) return;
        beginCardDrag(node, card, ev);
      });
    });

    // 对手手牌数（AI 模式）
    if(g.mode === 'ai'){
      const opp = opponent(g.playerSide);
      const n = (g.hand[opp]||[]).length;
      bar.classList.add('opp-shown');
      let marker = document.querySelector('.opp-hand-marker');
      if(!marker){
        marker = document.createElement('div');
        marker.className = 'opp-hand-marker';
        bar.appendChild(marker);
      }
      marker.innerHTML = `<div class="om-inner">${g.handCards? '':'<div class="back-card"></div>'.repeat(n)}</div><div class="om-label">${opp==='us'?'美国':'苏联'} ${n} 张</div>`;
    } else {
      const m = document.querySelector('.opp-hand-marker');
      if(m) m.remove();
    }
  }

  function onCardClick(card){
    const g = G;
    if(!card) return;
    if(g.phase === 'ended' || g.turnStarted && g.playerTurnCardPlayed) return;
    if(g.mode === 'ai' && g.activePlayer !== g.playerSide) return;
    const mySide = g.mode === 'hotseat' ? g.activePlayer : g.playerSide;
    if(g.activePlayer !== mySide) return;
    openDropOverlay(card, mySide);
  }

  /* ---------- 拖拽：Pointer Events，鼠标与触屏统一 ---------- */
  const DRAG_THRESHOLD = 8;

  function beginCardDrag(node, card, ev){
    dragging = { node, card, x0: ev.clientX, y0: ev.clientY, moved: false, zone: null };
    document.addEventListener('pointermove', onCardDragMove);
    document.addEventListener('pointerup', onCardDragUp);
    document.addEventListener('pointercancel', onCardDragUp);
  }

  function onCardDragMove(ev){
    if(!dragging) return;
    const dx = ev.clientX - dragging.x0, dy = ev.clientY - dragging.y0;
    if(!dragging.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;

    if(!dragging.moved){
      dragging.moved = true;
      ev.preventDefault();
      const g = G;
      const mySide = g.mode === 'hotseat' ? g.activePlayer : g.playerSide;
      const card = dragging.card;
      if(!card){ cancelDrag(); return; }
      const rect = dragging.node.getBoundingClientRect();
      ghost = dragging.node.cloneNode(true);
      ghost.classList.add('drag-ghost');
      ghost.style.width = rect.width + 'px';
      ghost.style.height = rect.height + 'px';
      document.body.appendChild(ghost);
      document.body.classList.add('dragging');
      dragging.node.classList.add('drag-src');
      openDropOverlay(card, mySide);
    }

    ghost.style.left = (ev.clientX - ghost.offsetWidth / 2) + 'px';
    ghost.style.top = (ev.clientY - ghost.offsetHeight - 20) + 'px';

    // 高亮指针下的投放区；ghost 自身 pointer-events:none，不会挡住命中
    const under = document.elementFromPoint(ev.clientX, ev.clientY);
    const zone = under && under.closest('.drop-zone');
    dragging.zone = (zone && !zone.classList.contains('disabled')) ? zone.dataset.zone : null;
    document.querySelectorAll('.drop-zone').forEach(z =>
      z.classList.toggle('drag-over', z === zone && !zone.classList.contains('disabled')));
  }

  function onCardDragUp(ev){
    const d = dragging;
    document.removeEventListener('pointermove', onCardDragMove);
    document.removeEventListener('pointerup', onCardDragUp);
    document.removeEventListener('pointercancel', onCardDragUp);
    dragging = null;

    if(d && d.moved){
      const zone = d.zone;
      const dx = ev.clientX - d.x0;
      teardownDrag();
      if(zone){
        // 落进区域 → 走与点击完全相同的结算路径
        window.resolveZone && window.resolveZone(zone);
      } else {
        // 没落到任何区域：卡已从手牌移出，得还回去，否则就丢了
        returnPendingCard();
        closeDropOverlay();
        const holder = el('handCards');
        if(holder && Math.abs(dx) > 48) holder.scrollLeft -= dx;
      }
    } else if(d){
      // 无位移 = 轻点，保留原有交互
      onCardClick(d.card);
    }
  }

  function returnPendingCard(){
    const g = G;
    if(!g.pendingOpsCard) return;
    const side = g.mode === 'hotseat' ? g.activePlayer : g.playerSide;
    g.hand[side].push(g.pendingOpsCard);
    g.hand[side].sort((a,b) => a.n - b.n);
    g.pendingOpsCard = null;
  }

  function teardownDrag(){
    if(ghost){ ghost.remove(); ghost = null; }
    document.body.classList.remove('dragging');
    document.querySelectorAll('.drop-zone').forEach(z => z.classList.remove('drag-over'));
  }

  function cancelDrag(){
    teardownDrag();
    dragging = null;
    closeDropOverlay();
  }

  /* ---------- 中央卡牌显示（对手出牌显示） ---------- */
  function showCentralCard(card, mode, who, hold){
    const box = el('cardDisplay');
    if(!box) return;
    const modeName = mode === 'event' ? '事件' : mode === 'ops' ? '操作' : '太空竞赛';
    box.innerHTML = `
      <div class="display-card ${card.side}">
        <div class="cmeta">
          <span class="badge">${modeName}</span>
          <span class="who ${who}">${who === 'us' ? '美国' : '苏联'}</span>
        </div>
        <div class="cname">${escapeHtml(card.zh)}</div>
        <div class="cops"><span class="cn">${card.n}</span>${card.scoring ? '★' : card.ops}</div>
        <div class="cdesc">${escapeHtml(card.text)}</div>
        <div class="cfoot">${escapeHtml(card.en)}</div>
      </div>
    `;
    box.classList.remove('hidden');
    box.style.animation = 'none';
    void box.offsetWidth;
    box.style.animation = 'cardFly .6s ease-out';
    if(window.FX) FX.flash(who === 'us' ? '#4a7fb5' : '#c8102e', 7);
    if(window.SFX) SFX.play('card');
    clearTimeout(showCentralCard._t);
    showCentralCard._t = setTimeout(() => {
      box.classList.add('hidden');
    }, hold || 5200);
  }

  /* ---------- 地图国家 ---------- */
  function renderMapCountries(){
    const g = G;
    const layer = el('countryLayer');
    if(!layer) return;
    let html = '';
    for(const [cid, c] of Object.entries(COUNTRIES)){
      if(c.superpower) continue;
      const us = getInf('us', cid), ss = getInf('ussr', cid);
      const cls = [];
      cls.push(isControlled('us', cid) ? 'us-ctrl' : isControlled('ussr', cid) ? 'ussr-ctrl' : '');
      cls.push(c.battleground ? 'bg' : '');
      if(c.stability === 1 || c.stability === 2) cls.push('low-stab');
      const inf = [];
      for(let i=0;i<us;i++) inf.push('<i class="us">●</i>');
      for(let i=0;i<ss;i++) inf.push('<i class="ussr">●</i>');
      const nm = c.name.length > 5 ? c.name.slice(0,5) : c.name;
      html += `<div class="country ${cls.join(' ')}" data-cid="${cid}" style="left:${(c.nx/1000*100)}%;top:${(c.ny/600*100)}%" title="${c.name} · ${REGIONS[c.region].zh} · 稳定度 ${c.stability}${c.battleground?' · 战斗国':''}">
        <div class="cname-mini">${escapeHtml(nm)}</div>
        <div class="cnum">${c.stability}</div>
        <div class="cinf">${inf.join('')}</div>
      </div>`;
    }
    layer.innerHTML = html;
    layer.querySelectorAll('.country').forEach(n => {
      n.addEventListener('click', () => onCountryClick(n.dataset.cid));
    });
  }

  function onCountryClick(cid){
    const g = G;
    if(!g.pendingOpsCard) { toast('未处于操作阶段'); return; }
    if(!canPlaceInfluence(g.activePlayer, cid)) { toast('该国家不可放置'); return; }
    doOps('place', cid);
  }

  /* ---------- 玩家面板 ---------- */
  function renderPlayers(){
    const g = G;
    ['us','ussr'].forEach(p => {
      const track = el(p+'VpTrack');
      if(track) track.innerHTML = buildVPTrack(g.vp[p], p);
      el(p+'MilOps').textContent = g.milOps[p];
      el(p+'SpacePos').textContent = g.space[p];
      el(p+'HandCount').textContent = (g.hand[p]||[]).length;
      const panel = el(p+'Panel');
      if(panel){ panel.classList.remove('active'); if(g.activePlayer === p) panel.classList.add('active'); }
    });
  }

  function buildVPTrack(v, player){
    let s = '';
    for(let i=0;i<10;i++){
      const cls = [];
      if(i < v) cls.push('on');
      if(i === WIN_VP-1) cls.push('win-line');
      if(i === 4) cls.push('midline');
      s += `<span class="${cls.join(' ')}"></span>`;
    }
    return s;
  }

  /* ---------- 太空竞赛 ---------- */
  function renderSpaceRace(){
    const g = G;
    const box = el('spaceRace');
    if(!box) return;
    let s = '<div class="sr-track">';
    for(let i=0;i<8;i++){
      const cls = [];
      if(i === 4) cls.push('milestone');
      if(i === 7) cls.push('finish');
      s += `<span class="sr-cell ${cls.join(' ')}">${i+1}</span>`;
    }
    s += '</div>';
    ['us','ussr'].forEach(p => {
      const pos = g.space[p];
      const cells = 8;
      const left = (pos/(cells-1))*100;
      s += `<div class="sr-pos ${p}" style="left:${left}%">${p==='us'?'USA':'SSSR'}</div>`;
    });
    box.innerHTML = s;
  }

  /* ---------- 回合信息 ---------- */
  function renderTurnInfo(){
    const g = G;
    const box = el('turnInfo');
    if(!box) return;
    const bgCounts = {us:0, ussr:0, neutral:0};
    for(const cid of Object.keys(COUNTRIES)){
      if(!COUNTRIES[cid].battleground || COUNTRIES[cid].superpower) continue;
      if(isControlled('us',cid)) bgCounts.us++;
      else if(isControlled('ussr',cid)) bgCounts.ussr++;
      else bgCounts.neutral++;
    }
    box.innerHTML = `
      <div class="row"><span class="label">时期</span><span class="val">${{early:'早期战争',mid:'危机战争',late:'冷战晚期'}[getPeriod(g.turn)]}</span></div>
      <div class="row"><span class="label">主动方</span><span class="val ${g.activePlayer}">${g.activePlayer==='us'?'美国':'苏联'}</span></div>
      <div class="row"><span class="label">DEFCON</span><span class="val gold">${g.defcon}</span></div>
      <div class="row"><span class="label">美国 VP</span><span class="val us">${g.vp.us}</span></div>
      <div class="row"><span class="label">苏联 VP</span><span class="val ussr">${g.vp.ussr}</span></div>
      <div class="row"><span class="label">美国军行</span><span class="val us">${g.milOps.us}</span></div>
      <div class="row"><span class="label">苏联军行</span><span class="val ussr">${g.milOps.ussr}</span></div>
      <div class="row"><span class="label">控制战斗国</span><span class="val"><span class="us-vp">${bgCounts.us}</span>-${bgCounts.neutral}-${bgCounts.ussr}</span></div>
      <div class="row"><span class="label">牌堆</span><span class="val">${g.deck.length}</span></div>
      <div class="row"><span class="label">中国牌</span><span class="val ${g.chinaCardOwner}">${g.chinaCardOwner==='us'?'美国':'苏联'}</span></div>
      <div class="row"><span class="label">阶段</span><span class="val">${phaseName(g.phase)}</span></div>
    `;
  }

  function phaseName(p){
    return {idle:'待命',turnStart:'开始',playEvent:'事件',playOps:'操作',playSpace:'太空',turnEnd:'结束',ended:'结束'}[p] || p;
  }

  /* ---------- 日志 ---------- */
  function renderLog(){
    const box = el('log');
    if(!box) return;
    const items = G.log.slice(-60).reverse();
    box.innerHTML = items.map(i => `<div class="log-line ${i.cls}">${escapeHtml(i.msg)}</div>`).join('');
  }

  function renderDiscard(){
    const n = el('discardCount');
    if(n) n.textContent = G.discard.length;
    const box = el('discardList');
    if(box){
      box.innerHTML = G.discard.slice(-30).map(c =>
        `<div class="disc-card ${c.side}">${c.n}. ${escapeHtml(c.zh)}</div>`).join('');
    }
  }

  /* ---------- Drop Overlay ---------- */
  function renderDropCard(card){
    const box = el('dropCard');
    if(!box) return;
    const sideCls = card.side === 'neutral' ? 'neutral' : card.side;
    const opsTxt = card.scoring ? '★' : String(card.ops);
    const periodZh = card.period === 'early' ? '早期战争' : card.period === 'mid' ? '危机战争' : '冷战晚期';
    box.className = 'drop-card ' + sideCls + (card.scoring ? ' scoring' : '');
    box.innerHTML = `
      <div class="cname">${escapeHtml(card.zh)}</div>
      <div class="cops"><span class="cn">${card.n}</span>${opsTxt}</div>
      <div class="cdesc">${escapeHtml(card.text) || '（无事件效果 · 仅可作 Ops / 太空）'}</div>
      <div class="cfoot">${periodZh} · ${escapeHtml(card.en).toUpperCase()}</div>
    `;
  }

  function openDropOverlay(card, player){
    const g = G;
    // 选定即从手牌移走并挂为待结算卡。点击与拖拽都走这里，
    // 之后 resolveZone 里的分支才拿得到卡。
    if(g.pendingOpsCard && g.pendingOpsCard !== card){
      g.hand[player].push(g.pendingOpsCard);
      g.hand[player].sort((a,b) => a.n - b.n);
    }
    if(!g.pendingOpsCard){
      const idx = g.hand[player].indexOf(card);
      if(idx >= 0) g.hand[player].splice(idx, 1);
      g.pendingOpsCard = card;
    }
    const overlay = el('dropOverlay');
    if(!overlay) return;
    el('dropCardName').textContent = card.zh;
    renderDropCard(card);
    const zones = overlay.querySelectorAll('.drop-zone');
    zones.forEach(z => z.classList.remove('disabled','drag-over'));

    // 完整文本，不做任何长度截断
    const desc = el('dropEventDesc');
    if(desc) desc.textContent = card.scoring
      ? `结算 · ${REGIONS[card.scoring].zh}`
      : (card.text ? '按卡面事件效果结算' : '仅可作 Ops / 太空');

    // 事件区
    const eventZone = overlay.querySelector('.drop-zone.event');
    const canEvent = !!card.text && !card.scoring ? true : true;
    if(!card.scoring && !card.text){ eventZone.classList.add('disabled'); }

    // Ops 区
    const opsZone = overlay.querySelector('.drop-zone.ops');
    const opsBadge = el('dropOpsBadge');
    const opsVal = getOpsValue(card, player);
    if(opsVal > 0){
      opsBadge.textContent = `${opsVal} OPS`;
    } else {
      opsZone.classList.add('disabled');
      opsBadge.textContent = '';
    }

    // 太空区
    const spZone = overlay.querySelector('.drop-zone.space');
    const spBadge = el('dropSpaceBadge');
    const spaceStep = spaceStepOf(card, player);
    if(spaceStep > 0){
      spBadge.textContent = `+${spaceStep}`;
    } else {
      spZone.classList.add('disabled');
      spBadge.textContent = '';
    }

    overlay.classList.remove('hidden');
    overlay.classList.add('active');
    SFX.play && SFX.play('card');
  }

  function spaceStepOf(card, player){
    // 通用规则：Ops 卡可全部用于太空
    if(card.n === 80 || card.n === 18) return 1;
    if(card.scoring) return 0;
    const ops = getOpsValue(card, player);
    return ops > 0 ? Math.min(2, ops >= 3 ? 2 : 1) : 0;
  }

  function closeDropOverlay(){
    const overlay = el('dropOverlay');
    if(!overlay) return;
    overlay.classList.add('hidden');
    overlay.classList.remove('active');
  }

  /* ---------- 骰子 ---------- */
  function showDice(rolls, cb){
    return new Promise(resolve => {
      const ov = el('diceOverlay');
      const val = el('diceValue');
      const res = el('diceOverlayResult');
      if(!ov){ resolve(rolls); return; }
      ov.classList.remove('hidden');
      if(window.SFX) SFX.play('dice');
      const maxRoll = Math.max(...rolls.map(r=>r.n));
      const maxP = rolls.find(r=>r.n===maxRoll).p;
      let t = 0;
      const iv = setInterval(()=>{
        val.textContent = String(1+Math.floor(Math.random()*6));
        t++;
        if(t > 14){
          clearInterval(iv);
          val.textContent = String(maxRoll);
          res.textContent = maxP === 'us' ? '美国胜出' : '苏联胜出';
          res.className = 'dice-result ' + (maxP==='us'?'win':'');
          val.classList.add('settle');
          if(window.SFX) SFX.play('boom');
          setTimeout(()=>{ ov.classList.add('hidden'); val.classList.remove('settle'); res.textContent=''; resolve(rolls); }, 1100);
        }
      }, 60);
    });
  }

  function showRealign(us, ss, winner){
    return new Promise(resolve => {
      const ov = el('realignOverlay');
      if(!ov){ resolve(); return; }
      el('realignUs').textContent = us;
      el('realignUssr').textContent = ss;
      const r = el('realignResult');
      r.textContent = winner === 'us' ? '美国调整成功' : winner === 'ussr' ? '苏联调整成功' : '平手';
      r.className = 'realign-result ' + (winner==='us'?'win':'');
      ov.classList.remove('hidden');
      if(window.SFX) SFX.play('boom');
      setTimeout(()=>{ ov.classList.add('hidden'); resolve(); }, 1600);
    });
  }

  return {
    render, cardHTML, cardHTMLBack, showCentralCard, showDice, showRealign,
    openDropOverlay, closeDropOverlay,
  };
})();
