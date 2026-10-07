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
    bindTips();
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

/* ---------- 拖拽：Pointer Events，鼠标与触屏统一 ----------
   * 交互设计：
   *   轻点卡片 = 打开投放面板（看卡面 + 选区域）
   *   拖动卡片 = 直接进入操作态，可丢到：
   *     - 地图上的国家  → 立即在该国放 Ops 并进入 playOps
   *     - 底部行动条的「事件 / 太空 / 取消」
   *   没落到任何目标 = 卡片弹回手牌
   */
  const DRAG_THRESHOLD = 6;
  const EDGE_ZONE = 34;      // 手牌区左右边缘的弹性滚动带
  const EDGE_SPEED = 26;     // 每帧滚动像素

  let edgeTimer = null;

  function beginCardDrag(node, card, ev){
    if(ev.button !== undefined && ev.button !== 0) return;
    ev.preventDefault();
    dragging = {
      node, card,
      x0: ev.clientX, y0: ev.clientY,
      vx: 0, vy: 0, lx: ev.clientX, ly: ev.clientY,
      moved: false, zone: null, cid: null
    };
    document.addEventListener('pointermove', onCardDragMove, {passive:false});
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
      const side = curSide();
      if(!g.pendingOpsCard){
        const idx = g.hand[side].indexOf(dragging.card);
        if(idx >= 0) g.hand[side].splice(idx, 1);
      } else if(g.pendingOpsCard !== dragging.card){
        returnPendingCard(true);
        const idx = g.hand[side].indexOf(dragging.card);
        if(idx >= 0) g.hand[side].splice(idx, 1);
      }
      g.pendingOpsCard = dragging.card;
      const rect = dragging.node.getBoundingClientRect();
      ghost = dragging.node.cloneNode(true);
      ghost.classList.add('drag-ghost');
      ghost.style.width = rect.width + 'px';
      ghost.style.height = rect.height + 'px';
      ghost.style.margin = '0';
      document.body.appendChild(ghost);
      document.body.classList.add('dragging');
      dragging.node.classList.add('drag-src');
      openDropOverlay(dragging.card, side);
      showDragStrip(dragging.card, side);
      if(window.SFX) SFX.play('card');
      renderHand();
      if(window.FX) FX.shake(2);
    }

    ev.preventDefault();
    // 速度 → 幽灵卡倾斜
    dragging.vx = dragging.vx * 0.7 + (ev.clientX - dragging.lx) * 0.3;
    dragging.vy = dragging.vy * 0.7 + (ev.clientY - dragging.ly) * 0.3;
    dragging.lx = ev.clientX; dragging.ly = ev.clientY;

    // 指针接近手牌区左右边缘 → 弹性滚动，够到远处的卡
    edgeScroll(ev.clientX);

    // 幽灵卡跟随：带倾斜与轻微缩放
    const tilt = Math.max(-16, Math.min(16, dragging.vx * 0.9));
    ghost.style.transform = `translate3d(${ev.clientX - ghost.offsetWidth / 2}px, ${ev.clientY - ghost.offsetHeight - 22}px, 0) rotate(${tilt}deg) scale(1.06)`;
    ghost.style.left = '0'; ghost.style.top = '0';

    // 命中检测：ghost 自身 pointer-events:none，不会挡住
    const under = document.elementFromPoint(ev.clientX, ev.clientY);
    const stripZone = under && under.closest('.strip-zone');
    const countryEl = under && under.closest('.country');
    dragging.zone = (stripZone && !stripZone.classList.contains('disabled')) ? stripZone.dataset.zone : null;
    dragging.cid = countryEl ? countryEl.dataset.cid : null;

    document.querySelectorAll('.strip-zone').forEach(z =>
      z.classList.toggle('drag-over', z === stripZone && !stripZone.classList.contains('disabled')));
    document.querySelectorAll('.country').forEach(c =>
      c.classList.toggle('drag-target', c === countryEl));
  }

  function edgeScroll(x){
    const holder = el('handCards');
    if(!holder) return;
    const r = holder.getBoundingClientRect();
    let dir = 0;
    if(x < r.left + EDGE_ZONE) dir = -1;
    else if(x > r.right - EDGE_ZONE) dir = 1;
    if(!dir) return;
    holder.style.transition = 'none';
    holder.scrollLeft += dir * EDGE_SPEED;
  }

  function onCardDragUp(ev){
    const d = dragging;
    document.removeEventListener('pointermove', onCardDragMove);
    document.removeEventListener('pointerup', onCardDragUp);
    document.removeEventListener('pointercancel', onCardDragUp);
    dragging = null;
    document.querySelectorAll('.strip-zone').forEach(z => z.classList.remove('drag-over'));

    if(d && d.moved){
      const landed = d.zone || d.cid;
      teardownDrag();
      if(d.zone){
        // 落进行动条 → 与点击走完全相同的结算
        window.resolveZone && window.resolveZone(d.zone);
      } else if(d.cid){
        // 直接丢到国家上 = 放 Ops
        const g = G;
        window.beginOps && window.beginOps(g.pendingOpsCard, g.activePlayer, d.cid);
      } else {
        // 什么都没接住 → 卡片弹回手牌
        returnPendingCard(true);
        closeDropOverlay();
        hideDragStrip();
        renderHand();
      }
    } else if(d){
      onCardClick(d.card);
    }
  }

  function returnPendingCard(silent){
    const g = G;
    if(!g.pendingOpsCard) return;
    const side = curSide();
    g.hand[side].push(g.pendingOpsCard);
    g.hand[side].sort((a,b) => a.n - b.n);
    g.pendingOpsCard = null;
    g.pendingOps = 0;
  }

  function teardownDrag(){
    if(ghost){ ghost.remove(); ghost = null; }
    document.body.classList.remove('dragging');
    document.querySelectorAll('.strip-zone').forEach(z => z.classList.remove('drag-over'));
    document.querySelectorAll('.country').forEach(c => c.classList.remove('drag-target'));
  }

  function cancelDrag(){
    teardownDrag();
    dragging = null;
    returnPendingCard();
    closeDropOverlay();
    hideDragStrip();
    renderHand();
  }

  function curSide(){
    const g = G;
    return g.mode === 'hotseat' ? g.activePlayer : g.playerSide;
  }

  /* ---------- 拖拽时的底部行动条 ---------- */
  function showDragStrip(card, side){
    const box = el('dragStrip');
    if(!box) return;
    const ops = getOpsValue(card, side);
    const sp = spaceStepOf(card, side);
    const ev = box.querySelector('.strip-zone.event');
    const op = box.querySelector('.strip-zone.ops');
    const spz = box.querySelector('.strip-zone.space');
    if(ev)  ev.classList.toggle('disabled', !!card.scoring);
    if(op) {
      op.classList.toggle('disabled', ops <= 0);
      const b = el('stripOpsVal'); if(b) b.textContent = String(ops);
    }
    if(spz){
      spz.classList.toggle('disabled', sp <= 0);
      const b = el('stripSpaceVal'); if(b) b.textContent = sp > 0 ? '+' + sp : '—';
    }
    box.classList.remove('hidden');
  }
  function hideDragStrip(){
    const box = el('dragStrip');
    if(box) box.classList.add('hidden');
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

/* ---------- 地图国家：节点由 MAP 一次创建，这里只做状态刷新 ---------- */
  function renderMapCountries(){
    if(window.MAP) MAP.updateAll();
  }

  function onCountryClick(cid){
    const g = G;
    if(g.phase === 'ended') return;
    // 放 Ops 阶段：点国家直接放置
    if(g.phase === 'playOps' && g.pendingOpsCard){
      doOps('place', cid);
      return;
    }
    // 拖拽中不会走到这里（pointer 事件已接管）
    // 其余情况：镜头对准该国
    if(window.MAP) MAP.centerOn(cid);
  }

  /* ---------- 玩家面板 ---------- */
  function renderPlayers(){
    const g = G;
    ['us','ussr'].forEach(p => {
      const track = el(p+'VpTrack');
      if(track) track.innerHTML = buildVPTrack(g.vp[p], p);
      el(p+'MilOps').textContent = g.milOps[p];
      el(p+'SpacePos').textContent = g.space[p];
      el(p+'HandCount').textContent = (g.handCount && g.handCount[p] != null) ? g.handCount[p] : (g.hand[p]||[]).length;
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
    s += `<span class="vp-num ${player}">${v}</span>`;
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
    // playOps 期间显示「结束本次出牌」——多 Ops 卡放不满时必须有的出口
    const endBtn = el('btnEndPlay');
    if(endBtn) endBtn.classList.toggle('hidden', !(g.phase === 'playOps' && g.pendingOpsCard));
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

  /* ---------- 国家悬停提示卡 ---------- */
  let tipBound = false;
  function bindTips(){
    if(tipBound) return;
    tipBound = true;
    const tip = el('countryTip');
    if(!tip) return;
    document.addEventListener('pointermove', (e) => {
      if(dragging){ tip.classList.remove('show'); return; }
      const n = e.target.closest && e.target.closest('.country');
      if(!n){ tip.classList.remove('show'); return; }
      const cid = n.dataset.cid;
      const c = COUNTRIES[cid];
      if(!c) return;
      const us = getInf('us', cid), ss = getInf('ussr', cid);
      const ctrl = us > ss ? '美国' : ss > us ? '苏联' : '—';
      tip.innerHTML = `<div class="tt-name">${c.name}</div>`
        + `<div class="tt-row"><span>${REGIONS[c.region].zh}</span><span>稳定度 ${c.stability}</span>`
        + (c.battleground ? '<span>战地国</span>' : '') + `</div>`
        + `<div class="tt-row"><span class="tt-us">美国 ${us}</span><span class="tt-ussr">苏联 ${ss}</span><span>控制 ${ctrl}</span></div>`;
      const w = tip.offsetWidth || 160;
      let x = e.clientX + 14, y = e.clientY + 16;
      if(x + w > innerWidth - 8) x = e.clientX - w - 12;
      if(y + 74 > innerHeight - 8) y = e.clientY - 74;
      tip.style.left = x + 'px';
      tip.style.top = y + 'px';
      tip.classList.add('show');
    });
  }

  return {
    render, cardHTML, cardHTMLBack, showCentralCard, showDice, showRealign,
    openDropOverlay, closeDropOverlay,
    cancelDrag, returnPendingCard, renderMapCountries, onCountryClick, curSide,
    showDragStrip, hideDragStrip,
  };
})();
window.UI = UI;
