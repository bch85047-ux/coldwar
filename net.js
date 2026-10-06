/* ===== 冷战热斗 · 联机层 =====
 * 纯 P2P：WebRTC DataChannel + 手工交换 SDP
 * 无服务器、无信令后端 —— 邀请码本身就是信令
 * 房主权威：房主跑引擎，访客只发指令、收快照
 */
const NET = (() => {
  const ICE = [
    {urls: 'stun:stun.l.google.com:19302'},
    {urls: 'stun:stun1.l.google.com:19302'},
    {urls: 'stun:global.stun.twilio.com:3478'},
    {urls: 'stun:stun.larksuite.local:3478'},
    {urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject'},
    {urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject'}
  ];

  let pc = null, dc = null;
  let connected = false, myRole = null, mySide = null, room = '';
  let handlers = {};
  let genTimer = null;

  const on = (t, fn) => { (handlers[t] = handlers[t] || []).push(fn); };
  const emit = (t, a) => { (handlers[t] || []).forEach(fn => { try { fn(a); } catch (e) { console.error(e); } }); };

  const enc = (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o))));
  const dec = (s) => {
    try { return JSON.parse(decodeURIComponent(escape(atob(s.trim())))); } catch (e) { return null; }
  };

  function status(txt, cls){
    const el = document.getElementById('netStatus');
    if(el){ el.textContent = txt; el.className = 'net-status ' + (cls || ''); }
    const b = document.getElementById('netBadge');
    if(b){
      if(cls === 'on'){ b.classList.add('show'); b.classList.remove('off'); b.textContent = room + ' · P2P'; }
      else if(cls === 'err'){ b.classList.add('show', 'off'); b.textContent = '已断开'; }
      else { b.classList.remove('show'); }
    }
  }

  function newPC(){
    if(pc){ try { pc.close(); } catch (e) {} }
    pc = new RTCPeerConnection({iceServers: ICE, iceCandidatePoolSize: 4});
    dc = pc.createDataChannel('cw', {ordered: true});
    dc.onopen = () => { connected = true; status('已连接 · ' + room, 'on'); emit('open'); };
    dc.onclose = () => { connected = false; status('连接已断开', 'err'); emit('close'); };
    dc.onerror = () => status('通道错误', 'err');
    dc.onmessage = (e) => {
      let m;
      try { m = JSON.parse(e.data); } catch (err) { return; }
      emit('msg', m);
    };
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if(s === 'connected') { connected = true; status('已连接 · ' + room, 'on'); emit('open'); }
      if(s === 'failed') { connected = false; status('连接失败：双方网络无法互通，换个网络或换房间名重试', 'err'); }
      if(s === 'disconnected') status('连接中断，重连中…', 'busy');
    };
  }

  /* 拿带全量 ICE 候选的完整 SDP —— 不用 trickle，交换一次搞定 */
  function fullDesc(desc){
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if(settled) return; settled = true;
        if(pc.signalingState === 'stable'){
          const d = pc.localDescription;
          if(d && d.type === desc) resolve(d);
          else resolve(pc.localDescription);
        } else resolve(pc.localDescription);
      };
      if(pc.iceGatheringState === 'complete') return finish();
      pc.addEventListener('icegatheringstatechange', () => {
        if(pc.iceGatheringState === 'complete') finish();
      });
      setTimeout(finish, 3500);   // 网络不通也别让用户卡死
    });
  }

  async function createOffer(){
    newPC();
    await pc.setLocalDescription(await pc.createOffer({iceRestart: false}));
    const d = await fullDesc('offer');
    return enc({type: 'offer', room: room, side: mySide, role: myRole, sdp: d});
  }

  async function accept(offerObj){
    newPC();
    await pc.setRemoteDescription(new RTCSessionDescription(offerObj.sdp));
    await pc.setLocalDescription(await pc.createAnswer());
    const d = await fullDesc('answer');
    return enc({type: 'answer', room: offerObj.room, side: offerObj.side, sdp: d});
  }

  async function acceptAnswer(answerObj){
    if(!pc) throw new Error('没有进行中的连接');
    await pc.setRemoteDescription(new RTCSessionDescription(answerObj.sdp));
  }

  /* 连接入口：role = 'host' | 'guest'，recvCode 为对端发来的码（可为空） */
  async function connect(role, recvCode){
    myRole = role;
    status('连接中…', 'busy');
    try {
      if(!recvCode){
        // 第一步：生成自己这边的码
        const code = await createOffer();
        return {code, need: 'answer'};
      }
      const obj = dec(recvCode);
      if(!obj || !obj.sdp) throw new Error('码格式不对');
      if(obj.type === 'offer'){
        mySide = (mySide || (obj.side === 'us' ? 'ussr' : 'us'));
        room = obj.room;
        const code = await accept(obj);
        return {code, need: 'offer', done: false};
      } else if(obj.type === 'answer'){
        mySide = mySide || 'us';
        room = obj.room;
        await acceptAnswer(obj);
        return {code: null, done: true};
      }
      throw new Error('码类型不对');
    } catch (err) {
      status('失败：' + err.message, 'err');
      throw err;
    }
  }

  function send(o){
    if(!dc || !dc.readyState || dc.readyState !== 'open'){ return false; }
    try { dc.send(JSON.stringify(o)); return true; } catch (e) { return false; }
  }

  return {
    on, send,
    connect,
    enabled: () => connected && !!dc && dc.readyState === 'open',
    isHost: () => myRole === 'host',
    side: () => mySide,
    room: () => room,
    close: () => { try { if(dc) dc.close(); } catch (e) {} try { if(pc) pc.close(); } catch (e) {} connected = false; status('已断开', 'err'); },
    ICE, dec
  };
})();

/* ===== 联机协议：房主权威，访客发指令 ===== */
const PROTO = (() => {
  function snapshot(){
    const g = G;
    return {
      turn: g.turn, defcon: g.defcon,
      vp: {us: g.vp.us, ussr: g.vp.ussr},
      milOps: {us: g.milOps.us, ussr: g.milOps.ussr},
      space: {us: g.space.us, ussr: g.space.ussr},
      influence: {us: g.influence.us, ussr: g.influence.ussr},
      hand: {us: g.hand.us.map(c => c.n), ussr: g.hand.ussr.map(c => c.n)},
      deck: g.deck.length,
      discard: g.discard.map(c => c.n),
      activePlayer: g.activePlayer,
      playsThisTurn: g.playsThisTurn || 0,
      playerTurnCardPlayed: !!g.playerTurnCardPlayed,
      phase: g.phase,
      flags: g.flags,
      chinaCardOwner: g.chinaCardOwner,
      winner: g.winner,
      mode: g.mode, playerSide: g.playerSide, firstPlayer: g.firstPlayer
    };
  }

  function apply(s){
    const g = G;
    Object.assign(g, {
      turn: s.turn, defcon: s.defcon,
      vp: s.vp, milOps: s.milOps, space: s.space,
      influence: {us: Object.assign({}, s.influence.us), ussr: Object.assign({}, s.influence.ussr)},
      deck: [], discard: s.discard.map(n => CARDS.find(c => c.n === n)).filter(Boolean),
      activePlayer: s.activePlayer,
      playsThisTurn: s.playsThisTurn,
      playerTurnCardPlayed: s.playerTurnCardPlayed,
      phase: s.phase, flags: Object.assign({}, s.flags),
      chinaCardOwner: s.chinaCardOwner, winner: s.winner,
      mode: s.mode, playerSide: s.playerSide, firstPlayer: s.firstPlayer
    });
    // 手牌按编号重建
    for(const p of ['us','ussr']){
      g.hand[p] = (s.hand[p] || []).map(n => CARDS.find(c => c.n === n)).filter(Boolean);
    }
    g.deck = s.deck ? Array.from({length: s.deck}, () => null) : [];  // 访客不持有牌堆内容
    if(window.UI) UI.render();
    if(window.MAP) MAP.updateAll();
  }

  /* 房主广播：快照 + 事件队列（供访客放特效/音效/日志） */
  function broadcast(){
    if(!NET.enabled()) return;
    NET.send({t: 'snap', s: snapshot()});
    NET.send({t: 'ev', e: G.netEvents || []});
    G.netEvents = [];
  }

  function pushEv(e){ G.netEvents = G.netEvents || []; G.netEvents.push(e); }

  /* 访客发指令 */
  function cmd(c){
    if(!NET.enabled()) return false;
    return NET.send({t: 'cmd', c});
  }

  /* 是否由房主直接处理输入（访客输入一律走 cmd） */
  function isLocalActor(){
    if(!NET.enabled()) return true;
    return NET.isHost();
  }

  return {snapshot, apply, broadcast, pushEv, cmd, isLocalActor};
})();

/* ===== 联机弹窗 UI ===== */
NET.initUI = function(){
  const el = id => document.getElementById(id);
  const roleBtns = ['netRoleHost','netRoleGuest'].map(el);
  let role = 'host';

  function setRole(r){
    role = r;
    roleBtns.forEach(b => b && b.classList.toggle('selected', (b.id === 'netRoleHost') === (r === 'host')));
    el('netRoom').value = (r === 'host' ? room4() : el('netRoom').value || room4());
  }
  function room4(){
    const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let s = '';
    for(let i = 0; i < 4; i++) s += A[Math.floor(Math.random()*A.length)];
    return 'CW' + s;
  }
  function setGive(v){ const n = el('netGive'); if(n) n.value = v || ''; }
  function setRecv(v){ const n = el('netRecv'); if(n) n.value = v || ''; }

  el('btnNetHost') && el('btnNetHost').addEventListener('click', () => {
    setRole('host'); el('netModal').classList.remove('hidden'); el('turnSelect').classList.add('hidden');
  });
  el('btnNetJoin') && el('btnNetJoin').addEventListener('click', () => {
    setRole('guest'); el('netModal').classList.remove('hidden'); el('turnSelect').classList.add('hidden');
  });
  el('btnNetOpen') && el('btnNetOpen').addEventListener('click', () => el('netModal').classList.remove('hidden'));
  el('btnNetClose') && el('btnNetClose').addEventListener('click', () => el('netModal').classList.add('hidden'));
  el('btnRulesOpen') && el('btnRulesOpen').addEventListener('click', () => {
    el('turnSelect').classList.add('hidden'); el('rulesModal').classList.remove('hidden');
  });
  roleBtns.forEach(b => b && b.addEventListener('click', () => setRole(b.id === 'netRoleHost' ? 'host' : 'guest')));

  ['netSideUs','netSideUssr'].forEach(id => {
    const b = el(id);
    b && b.addEventListener('click', () => {
      document.querySelectorAll('#netModal .net-role-row .opt-btn').forEach(x => x.classList.remove('selected'));
      b.classList.add('selected');
    });
  });

  el('btnCopyGive') && el('btnCopyGive').addEventListener('click', async () => {
    const n = el('netGive');
    if(!n || !n.value) return;
    try { await navigator.clipboard.writeText(n.value); toast('邀请码已复制'); }
    catch (e) { n.select(); try { document.execCommand('copy'); toast('邀请码已复制'); } catch (e2) { toast('长按文本框手动复制'); } }
  });

  el('btnNetConnect') && el('btnNetConnect').addEventListener('click', async () => {
    const room = (el('netRoom').value || '').toUpperCase().slice(0, 12) || room4();
    el('netRoom').value = room;
    const mySide = el('netSideUssr').classList.contains('selected') ? 'ussr' : 'us';
    const recv = el('netRecv') ? el('netRecv').value.trim() : '';
    const btn = el('btnNetConnect');
    btn.disabled = true; btn.textContent = '交换中…';
    let res;
    try { res = await NET.connect(role, recv); }
    catch (e) { btn.disabled = false; btn.textContent = '连接'; return; }
    btn.disabled = false; btn.textContent = '连接';
    if(!res) return;
    if(res.code){
      // 拿到了要发给对方的码 —— 等对方回执
      setGive(res.code);
      setRecv('');
      el('netTitle').textContent = '联机 · ' + room;
      el('netLead').textContent = role === 'host'
        ? '把「发出的码」完整发给对方（聊天/短信都行）。对方会回你一个回执，粘到「收到的码」里再点连接。'
        : '把你的「发出的码」发给对方。对方应用后双方自动进入对局。';
    } else if(res.done){
      startNetGame(room, mySide, role === 'guest');
    }
  });

  function isGuestNet(){ return role === 'guest'; }

  async function startNetGame(room, mySide, guest){
    NET.connect(room, '').catch(() => {});
    // 房主：直接开局并广播；访客：等房主快照
    if(!guest){
      initGame({mode: 'online', firstPlayer: Math.random() < 0.5 ? 'us' : 'ussr', firstPlayerSide: mySide});
      G.mode = 'online';
      G.playerSide = mySide;
      G.netEvents = [];
      NET.on('msg', onNetMsg);
      NET.on('open', () => PROTO.broadcast());
      PROTO.broadcast();
      el('netModal').classList.add('hidden');
      UI.render();
      if(NET.enabled()) PROTO.broadcast();
    } else {
      G.mode = 'online';
      G.playerSide = mySide;
      G.netEvents = [];
      NET.on('msg', onNetMsg);
      el('netModal').classList.add('hidden');
      toast('等待房主开局…');
    }
  }

  function onNetMsg(m){
    if(m.t === 'snap'){
      PROTO.apply(m.s);
      if(m.s && m.s.mode === 'online') G.mode = 'online';
      UI.render();
    } else if(m.t === 'ev'){
      (m.e || []).forEach(playNetFx);
    }
  }

  /* 访客收到事件 → 只放表现，不改状态 */
  function playNetFx(e){
    if(!e || !e.kind) return;
    if(!window.FX) return;
    try {
      switch(e.kind){
        case 'place':   FX.placeInf(e.cid); break;
        case 'coup':    FX.coup(e.cid); FX.shake(4); break;
        case 'explosion': FX.explosion(e.cid, false); break;
        case 'warTrail': FX.warTrail(e.from, e.to); break;
        case 'shake':   FX.shake(e.a || 4); break;
        case 'flash':   FX.flash(e.color || '#fff', e.a || 5); break;
        case 'rocket':  FX.rocket(e.cid || 'us'); break;
        case 'defcon':  FX.defconAlarm(); break;
        case 'nuke':    FX.nuke(); FX.shake(16); FX.flash('#ffb347', 10); break;
        case 'score':   FX.scoringGlow(e.cid); break;
        case 'card':    if(window.SFX) SFX.play('card'); break;
        case 'dice':    if(window.SFX) SFX.play('dice'); break;
        case 'boom':    if(window.SFX) SFX.play('boom'); break;
        case 'log':     log(e.msg, e.cls || 'sys'); UI.render(); break;
      }
    } catch (err) {}
  }

  window.playNetFx = playNetFx;
  window.startNetGame = startNetGame;
};
window.NET = NET;
window.PROTO = PROTO;
