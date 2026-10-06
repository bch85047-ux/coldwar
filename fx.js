/* ===== 冷战热斗 · 特效引擎 ===== */
/* Canvas 粒子系统：爆炸、曳光、核爆、火箭、屏幕震动 */

const FX = (() => {
  let canvas, ctx, W, H;
  let particles = [];
  let shakeAmt = 0;
  let flashColor = null, flashT = 0;
  let running = false;
  let enabled = true;

  function init(){
    canvas = document.getElementById('fxCanvas');
    if(!canvas) return;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    if(!running){ running = true; requestAnimationFrame(tick); }
  }

  function resize(){
    const area = document.getElementById('mapBox') || document.getElementById('mapArea');
    if(!area || !canvas) return;
    W = canvas.width = Math.max(1, area.clientWidth);
    H = canvas.height = Math.max(1, area.clientHeight);
  }

  function setEnabled(v){ enabled = v; }

  function spawn(p){
    if(!enabled) return;
    particles.push(Object.assign({age:0, maxAge:60, x:0, y:0, vx:0, vy:0, g:0, drag:0.98, size:2, alpha:1, color:'#fff', type:'dot'}, p));
  }

  function tick(){
    if(!ctx) return;
    ctx.clearRect(0,0,W,H);
    // 闪光层
    if(flashT > 0){
      ctx.save();
      ctx.globalAlpha = Math.min(0.55, flashT/10);
      ctx.fillStyle = flashColor || '#fff';
      ctx.fillRect(0,0,W,H);
      ctx.restore();
      flashT--;
    }
    // 粒子
    for(let i=particles.length-1; i>=0; i--){
      const p = particles[i];
      p.age++;
      p.x += p.vx; p.y += p.vy;
      p.vy += p.g; p.vx *= p.drag; p.vy *= p.drag;
      const t = p.age / p.maxAge;
      if(t >= 1){ particles.splice(i,1); continue; }
      const a = (p.alpha ?? 1) * (1 - t);
      ctx.save();
      ctx.globalAlpha = a;
      if(p.type === 'smoke'){
        const r = p.size * (1 + t*2.2);
        const gr = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r);
        gr.addColorStop(0, p.color || 'rgba(150,150,148,.7)');
        gr.addColorStop(1, 'rgba(60,60,58,0)');
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.arc(p.x,p.y,r,0,Math.PI*2); ctx.fill();
      } else if(p.type === 'tracer'){
        ctx.strokeStyle = p.color || '#e0b060';
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx*3, p.y - p.vy*3);
        ctx.stroke();
      } else if(p.type === 'ring'){
        const r = p.size * (1 + t*6);
        ctx.strokeStyle = p.color || '#fff';
        ctx.lineWidth = Math.max(0.5, 4*(1-t));
        ctx.beginPath(); ctx.arc(p.x,p.y,r,0,Math.PI*2); ctx.stroke();
      } else {
        ctx.fillStyle = p.color || '#fff';
        ctx.beginPath(); ctx.arc(p.x,p.y, p.size*(1-t*0.5), 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }
    // 震动
    if(shakeAmt > 0.2){
      const dx = (Math.random()-0.5)*shakeAmt;
      const dy = (Math.random()-0.5)*shakeAmt;
      canvas.style.transform = `translate(${dx}px,${dy}px)`;
      const svg = document.getElementById('mapSvg');
      if(svg) svg.style.transform = `translate(${dx}px,${dy}px)`;
      shakeAmt *= 0.88;
    } else {
      canvas.style.transform = '';
      const svg = document.getElementById('mapSvg');
      if(svg) svg.style.transform = '';
      shakeAmt = 0;
    }
    requestAnimationFrame(tick);
  }

  function xyOf(cid){
    // 国家 id → 画布坐标
    const c = COUNTRIES[cid];
    if(!c) return {x:W/2,y:H/2};
    const sx = W/1000, sy = H/600;
    return {x: c.nx*sx, y: c.ny*sy};
  }

  function flash(color, strength){
    flashColor = color; flashT = strength || 10;
  }

  function shake(amt){ shakeAmt = Math.max(shakeAmt, amt); }

  function explosion(cid, big){
    const {x,y} = xyOf(cid);
    const n = big ? 46 : 24;
    for(let i=0;i<n;i++){
      const a = Math.random()*Math.PI*2, sp = 1 + Math.random()*3.2;
      spawn({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-0.6,g:0.04,drag:0.96,size:1.6+Math.random()*2,maxAge:30+Math.random()*25,color:['#ffb040','#ff7040','#e04020','#fff','#c9a96a'][Math.floor(Math.random()*5)]});
    }
    for(let i=0;i<8;i++){
      spawn({x:x+(Math.random()-0.5)*14,y:y-4,vx:(Math.random()-0.5)*0.6,vy:-0.5-Math.random()*0.5,g:-0.002,drag:0.99,size:8+Math.random()*8,maxAge:60+Math.random()*40,type:'smoke'});
    }
    spawn({x,y,type:'ring',size:6,maxAge:22,color:big?'#ff8040':'#e0b060'});
    shake(big?10:5);
    flash(big?'#ff5020':'#e0b060', big?9:5);
    if(window.SFX) SFX.play('boom');
  }

  function coup(cid){
    explosion(cid, true);
  }

  function placeInf(cid){
    const {x,y} = xyOf(cid);
    for(let i=0;i<10;i++){
      const a = -Math.PI/2 + (Math.random()-0.5)*1.4;
      spawn({x,y:y+8,vx:Math.cos(a)*0.6,vy:Math.sin(a)*1.2,g:0.05,drag:0.97,size:1.8,maxAge:35,color:'#c9a96a'});
    }
    if(window.SFX) SFX.play('place');
  }

  function warTrail(fromCid, toCid){
    const a = xyOf(fromCid), b = xyOf(toCid);
    const steps = 16;
    for(let i=0;i<steps;i++){
      setTimeout(()=>{
        const t = i/steps;
        spawn({x:a.x+(b.x-a.x)*t, y:a.y+(b.y-a.y)*t, type:'tracer', vx:(b.x-a.x)/60, vy:(b.y-a.y)/60, size:1.5, maxAge:14, color:'#ffd080'});
      }, i*22);
    }
    setTimeout(()=>explosion(toCid, false), steps*22);
    if(window.SFX) SFX.play('war');
  }

  function rocket(cid){
    const {x,y} = xyOf(cid || 'us');
    for(let i=0;i<40;i++){
      setTimeout(()=>{
        spawn({x:x+(Math.random()-0.5)*3, y:y - i*4, vx:(Math.random()-0.5)*0.4, vy:-2.5, g:-0.02, drag:0.995, size:2.2, maxAge:26, color:['#fff','#ffe0a0','#ffb060'][Math.floor(Math.random()*3)]});
        spawn({x:x+(Math.random()-0.5)*4, y:y - i*4 + 8, vx:(Math.random()-0.5)*0.3, vy:-1.2, g:0, drag:0.99, size:5+Math.random()*5, maxAge:34, type:'smoke', color:'rgba(200,180,140,.5)'});
      }, i*26);
    }
    if(window.SFX) SFX.play('rocket');
  }

  function nuke(){
    flash('#fff', 26);
    shake(18);
    for(let i=0;i<5;i++){
      setTimeout(()=>{
        const x = W*(0.3+Math.random()*0.4), y = H*(0.3+Math.random()*0.4);
        spawn({x,y,type:'ring',size:12,maxAge:40,color:'#ff8040'});
        for(let j=0;j<26;j++){
          const a=Math.random()*Math.PI*2,sp=2+Math.random()*5;
          spawn({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-1,g:0.05,drag:0.95,size:2+Math.random()*3,maxAge:50+Math.random()*30,color:['#fff','#ffb040','#ff5020'][Math.floor(Math.random()*3)]});
        }
        for(let j=0;j<12;j++){
          spawn({x,y:y-6,vx:(Math.random()-0.5)*0.8,vy:-0.8-Math.random(),g:-0.003,drag:0.99,size:12+Math.random()*10,maxAge:120,type:'smoke'});
        }
      }, i*180);
    }
    if(window.SFX) SFX.play('nuke');
  }

  function defconAlarm(){
    flash('#c8102e', 8);
    shake(4);
    if(window.SFX) SFX.play('alarm');
  }

  function scoringGlow(cid){
    const {x,y} = xyOf(cid);
    spawn({x,y,type:'ring',size:4,maxAge:28,color:'#c9a96a'});
  }


  /* ---------- 区域级特效 ---------- */

  // 结算区域时：该区所有国家轮流金环扩散 + 得分为方的色带扫过
  function regionSweep(rid, winner, vp){
    const list = (window.regionList ? regionList(rid) : (REGION_COUNTRIES[rid] || []));
    let k = 0;
    list.forEach(cid => {
      setTimeout(() => {
        const {x, y} = xyOf(cid);
        const col = winner === 'us' ? '#7fb0e0' : winner === 'ussr' ? '#e8455c' : '#c9a96a';
        spawn({x, y, type:'ring', size: 5, maxAge: 34, color: col});
        spawn({x, y, type:'ring', size: 2, maxAge: 22, color: '#ffe0a0'});
        for(let i = 0; i < 7; i++){
          const a = Math.random()*Math.PI*2, sp = 0.4 + Math.random()*1.1;
          spawn({x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp - 0.4, g: 0.02, drag: 0.97, size: 1.5, maxAge: 32, color: col});
        }
      }, k++ * 46);
    });
    flash(winner === 'us' ? '#4a7fb5' : winner === 'ussr' ? '#c8102e' : '#c9a96a', 7);
    shake(3);
    if(vp) vpBurst(winner, vp);
    if(window.SFX) SFX.play('score');
  }

  // VP 增加：屏幕中央金色爆点 + 数字上滚
  function vpBurst(player, n){
    spawn({x: W/2, y: 12, type:'ring', size: 3, maxAge: 26, color: player === 'us' ? '#7fb0e0' : '#e8455c'});
    for(let i = 0; i < 18 + (n || 0)*4; i++){
      const a = -Math.PI/2 + (Math.random()-0.5)*2.2;
      spawn({x: W/2, y: 14, vx: Math.cos(a)*1.6, vy: Math.sin(a)*2.2 + 0.6, g: 0.06, drag: 0.96, size: 1.4 + Math.random()*1.6, maxAge: 34 + Math.random()*22, color: ['#c9a96a','#e0c890','#fff2c0'][Math.floor(Math.random()*3)]});
    }
  }

  // DEFCON 降到新档位：全屏红闪 + 屏幕边缘脉冲
  function defconPulse(level){
    const a = Math.max(2, 9 - level);
    flash('#c8102e', a);
    shake(a);
    for(let i = 0; i < 3; i++){
      setTimeout(() => {
        spawn({x: W/2, y: H/2, type:'ring', size: 10, maxAge: 40, color: '#c8102e'});
      }, i * 190);
    }
    if(window.SFX) SFX.play('alarm');
  }

  // 回合切换：一道横向光带从左扫到右
  function turnSweep(){
    const y = H * (0.35 + Math.random()*0.3);
    for(let i = 0; i < 42; i++){
      setTimeout(() => {
        spawn({x: -10 + i*3, y: y + (Math.random()-0.5)*26, type:'tracer', vx: 2.4, vy: 0, size: 1.6, maxAge: 12, color: '#c9a96a'});
      }, i * 14);
    }
    flash('#c9a96a', 3);
  }

  // 手牌被抽出：从手牌位置飞向中央
  function cardFly(x, y, color){
    for(let i = 0; i < 14; i++){
      spawn({x, y, vx: (Math.random()-0.5)*1.2, vy: -1 - Math.random()*2.4, g: -0.01, drag: 0.98, size: 1.4 + Math.random()*1.6, maxAge: 26, color: color || '#c9a96a'});
    }
  }

  // 胜利彩带
  function confetti(color){
    for(let i = 0; i < 130; i++){
      setTimeout(() => {
        spawn({
          x: Math.random()*W, y: -8,
          vx: (Math.random()-0.5)*0.8, vy: 1.4 + Math.random()*2.2,
          g: 0.035, drag: 0.992, size: 2 + Math.random()*2.6,
          maxAge: 90 + Math.random()*70,
          color: color || ['#c9a96a','#7fb0e0','#e8455c','#fff2c0'][Math.floor(Math.random()*4)]
        });
      }, Math.random()*1400);
    }
  }

  // 数字滚动（用于 VP / DEFCON 等文字元素）
  function countUp(elx, from, to, ms, prefix, suffix){
    if(!elx) return;
    const t0 = performance.now();
    const dur = ms || 700;
    (function step(now){
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      elx.textContent = (prefix || '') + Math.round(from + (to - from) * e) + (suffix || '');
      if(k < 1) requestAnimationFrame(step);
    })(performance.now());
  }

  return { init, setEnabled, explosion, coup, placeInf, warTrail, rocket, nuke, defconAlarm, scoringGlow, flash, shake,
    regionSweep, vpBurst, defconPulse, turnSweep, cardFly, confetti, countUp, enabled(){return enabled;} };
})();

/* ===== 音效合成器 (SFX) ===== */
const SFX = (() => {
  let ctx = null, enabled = true;
  function ac(){
    if(!ctx){ try{ ctx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} }
    return ctx;
  }
  function setEnabled(v){ enabled = v; }
  function play(name){
    if(!enabled) return;
    const c = ac(); if(!c) return;
    if(c.state === 'suspended') c.resume();
    const t = c.currentTime;
    if(name === 'boom'){
      const o = c.createOscillator(), g = c.createGain();
      o.type='triangle'; o.frequency.setValueAtTime(120,t); o.frequency.exponentialRampToValueAtTime(28,t+0.5);
      g.gain.setValueAtTime(0.5,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.6);
      const n = c.createBufferSource();
      const buf = c.createBuffer(1, c.sampleRate*0.5, c.sampleRate);
      const d = buf.getChannelData(0);
      for(let i=0;i<d.length;i++) d[i] = (Math.random()*2-1)*Math.pow(1-i/d.length,2);
      const ng = c.createGain(); ng.gain.setValueAtTime(0.4,t); ng.gain.exponentialRampToValueAtTime(0.001,t+0.5);
      n.buffer = buf;
      o.connect(g).connect(c.destination); n.connect(ng).connect(c.destination);
      o.start(t); o.stop(t+0.6); n.start(t);
    } else if(name === 'war'){
      for(let i=0;i<6;i++){
        setTimeout(()=>{
          const tt = c.currentTime;
          const o = c.createOscillator(), g = c.createGain();
          o.type='sawtooth'; o.frequency.setValueAtTime(900+Math.random()*400,tt);
          o.frequency.exponentialRampToValueAtTime(200,tt+0.09);
          g.gain.setValueAtTime(0.08,tt); g.gain.exponentialRampToValueAtTime(0.001,tt+0.1);
          o.connect(g).connect(c.destination); o.start(tt); o.stop(tt+0.12);
        }, i*90);
      }
    } else if(name === 'place'){
      const o = c.createOscillator(), g = c.createGain();
      o.type='square'; o.frequency.setValueAtTime(520,t); o.frequency.setValueAtTime(660,t+0.06);
      g.gain.setValueAtTime(0.1,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.15);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t+0.16);
    } else if(name === 'card'){
      const n = c.createBufferSource();
      const buf = c.createBuffer(1, c.sampleRate*0.06, c.sampleRate);
      const d = buf.getChannelData(0);
      for(let i=0;i<d.length;i++) d[i] = (Math.random()*2-1)*Math.pow(1-i/d.length,3);
      const f = c.createBiquadFilter(); f.type='highpass'; f.frequency.value=1200;
      const g = c.createGain(); g.gain.setValueAtTime(0.25,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.07);
      n.buffer=buf; n.connect(f).connect(g).connect(c.destination); n.start(t);
    } else if(name === 'rocket'){
      const n = c.createBufferSource();
      const buf = c.createBuffer(1, c.sampleRate*1.4, c.sampleRate);
      const d = buf.getChannelData(0);
      for(let i=0;i<d.length;i++) d[i] = (Math.random()*2-1)*Math.pow(1-i/d.length,1.2);
      const f = c.createBiquadFilter(); f.type='lowpass'; f.frequency.setValueAtTime(300,t); f.frequency.linearRampToValueAtTime(1200,t+1.2);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.35,t+0.4); g.gain.exponentialRampToValueAtTime(0.001,t+1.4);
      n.buffer=buf; n.connect(f).connect(g).connect(c.destination); n.start(t);
    } else if(name === 'nuke'){
      const n = c.createBufferSource();
      const buf = c.createBuffer(1, c.sampleRate*2.5, c.sampleRate);
      const d = buf.getChannelData(0);
      for(let i=0;i<d.length;i++) d[i] = (Math.random()*2-1)*Math.pow(1-i/d.length,0.7);
      const f = c.createBiquadFilter(); f.type='lowpass'; f.frequency.setValueAtTime(4000,t); f.frequency.exponentialRampToValueAtTime(80,t+2.4);
      const g = c.createGain(); g.gain.setValueAtTime(0.8,t); g.gain.exponentialRampToValueAtTime(0.001,t+2.5);
      n.buffer=buf; n.connect(f).connect(g).connect(c.destination); n.start(t);
      const o = c.createOscillator(), og = c.createGain();
      o.type='sine'; o.frequency.setValueAtTime(60,t); o.frequency.exponentialRampToValueAtTime(20,t+2.2);
      og.gain.setValueAtTime(0.6,t); og.gain.exponentialRampToValueAtTime(0.001,t+2.4);
      o.connect(og).connect(c.destination); o.start(t); o.stop(t+2.5);
    } else if(name === 'alarm'){
      for(let i=0;i<3;i++){
        const tt = t + i*0.35;
        const o = c.createOscillator(), g = c.createGain();
        o.type='square';
        o.frequency.setValueAtTime(700,tt); o.frequency.linearRampToValueAtTime(500,tt+0.16);
        g.gain.setValueAtTime(0.08,tt); g.gain.exponentialRampToValueAtTime(0.001,tt+0.3);
        o.connect(g).connect(c.destination); o.start(tt); o.stop(tt+0.32);
      }
    } else if(name === 'dice'){
      const n = c.createBufferSource();
      const buf = c.createBuffer(1, c.sampleRate*0.05, c.sampleRate);
      const d = buf.getChannelData(0);
      for(let i=0;i<d.length;i++) d[i] = (Math.random()*2-1)*Math.pow(1-i/d.length,2);
      const g = c.createGain(); g.gain.setValueAtTime(0.2,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.05);
      n.buffer=buf; n.connect(g).connect(c.destination); n.start(t);
    } else if(name === 'win'){
      [523,659,784,1047].forEach((f,i)=>{
        const tt = t + i*0.16;
        const o = c.createOscillator(), g = c.createGain();
        o.type='triangle'; o.frequency.value=f;
        g.gain.setValueAtTime(0.12,tt); g.gain.exponentialRampToValueAtTime(0.001,tt+0.5);
        o.connect(g).connect(c.destination); o.start(tt); o.stop(tt+0.55);
      });
    } else if(name === 'score'){
      [659, 880, 1318].forEach((f, i) => {
        const tt = t + i * 0.09;
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.11, tt); g.gain.exponentialRampToValueAtTime(0.001, tt + 0.34);
        o.connect(g).connect(c.destination); o.start(tt); o.stop(tt + 0.36);
      });
    } else if(name === 'click'){
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'square'; o.frequency.value = 1400;
      g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.05);
    } else if(name === 'turn'){
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(320, t + 0.22);
      g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.32);
    }
  }
  return { play, setEnabled };
})();
