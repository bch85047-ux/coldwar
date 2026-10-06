/* ===== 冷战热斗 · 音乐引擎 ===== */
/* 原曲加载 + 做旧处理（黑胶爆点 / 磁带嘶声 / 音调微摆 / 低通染色） */
/* 优先加载 assets/music/us.mp3 和 assets/music/ussr.mp3 */

const MUSIC = (() => {
  const ASSET_DIR = 'assets/music/';
  const TRACKS = {
    us:   { file: ASSET_DIR + 'us.mp3',   name: 'In the Moonlight · 78rpm 原始录音' },
    ussr: { file: ASSET_DIR + 'ussr.mp3', name: 'На сопках Маньчжурии · 1909 年原始录音' },
  };

  let ctx = null;
  let master, ageNode, ageGain;
  let noiseNodes = [];          // 黑胶/嘶声噪声源
  let cur = null;               // 当前正在播的 {player, audio, gain, src}
  let playing = false;
  // 用的是真实年代录音（78rpm / 1909 年蜡筒），本身就有那个年代的音色，
  // 再叠做旧只会把音质糊掉。默认关，想听黑胶味再开。
  let aged = false;
  let masterVol = 1.0;          // 用户音量 0..1.5，默认满
  let loaded = {};              // {us: Audio|null, ussr: Audio|null}
  let synthTimer = null;

  function ac(){
    if(!ctx){ try{ ctx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} }
    if(ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /* ---------- 做旧链 ---------- */
  function buildAgingChain(){
    const c = ac(); if(!c) return null;
    master = c.createGain(); master.gain.value = masterVol;

    // 低通染色（模拟旧喇叭/旧电台）
    const lp = c.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=12500; lp.Q.value=0.6;
    // 高通削掉浑浊
    const hp = c.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=45;
    // 轻微双峰均衡（老式唱片音色）
    const p1 = c.createBiquadFilter(); p1.type='peaking'; p1.frequency.value=3200; p1.gain.value=0.8;
    const p2 = c.createBiquadFilter(); p2.type='peaking'; p2.frequency.value=260; p2.gain.value=-0.8;

    // 声道宽度压缩（旧单声道感）
    const merger = c.createChannelMerger(1);
    const splitter = c.createChannelSplitter(2);

    // 磁带 wow & flutter：LFO 调制 audio 的 detune/playbackRate
    ageNode = c.createGain(); ageGain = 0.18;
    ageNode.gain.value = ageGain;

    // 黑胶底噪（持续）
    const brown = makeNoiseBuffer(c, 2.0, 'brown');
    const nsrc = c.createBufferSource(); nsrc.buffer = brown; nsrc.loop = true;
    const ng = c.createGain(); ng.gain.value = aged ? 0.010 : 0;
    const nlp = c.createBiquadFilter(); nlp.type='lowpass'; nlp.frequency.value=1800;
    nsrc.connect(nlp).connect(ng).connect(master);
    nsrc.start();
    noiseNodes.push({src:nsrc, gain:ng});

    // 爆点（随机咔哒）
    if(aged) scheduleCrackle(c, master);

    // 压缩器：拉平动态，同时把整体响度顶起来（真 78rpm 录音底噪低，压一下才够听）
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 24;
    comp.ratio.value = 5;
    comp.attack.value = 0.004;
    comp.release.value = 0.28;
    master.connect(comp).connect(c.destination);
    return {c, master, comp, chain: {lp, hp, p1, p2, splitter, merger}};

  }

  function makeNoiseBuffer(c, seconds, type){
    const sr = c.sampleRate, len = Math.floor(sr*seconds);
    const buf = c.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    if(type === 'brown'){
      let last = 0;
      for(let i=0;i<len;i++){
        const w = Math.random()*2-1;
        last = (last + 0.02*w)/1.02;
        d[i] = last*3.5;
      }
    } else {
      for(let i=0;i<len;i++) d[i] = Math.random()*2-1;
    }
    return buf;
  }

  function scheduleCrackle(c, dest){
    function pop(){
      if(!playing || !aged) return;
      const t = c.currentTime;
      const g = c.createGain();
      const len = 0.008 + Math.random()*0.022;
      const o = c.createOscillator();
      o.type = Math.random() < 0.35 ? 'square' : 'sine';
      o.frequency.value = 900 + Math.random()*3800;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime((0.05 + Math.random()*0.09) * masterVol, t + 0.001);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      o.connect(g).connect(dest);
      o.start(t); o.stop(t + len + 0.01);
      // 有时跟一个小拖尾
      if(Math.random() < 0.22){
        const g2 = c.createGain();
        const o2 = c.createOscillator();
        o2.type='sine'; o2.frequency.value=400+Math.random()*900;
        g2.gain.setValueAtTime(0.0001, t+0.03);
        g2.gain.exponentialRampToValueAtTime(0.05, t+0.035);
        g2.gain.exponentialRampToValueAtTime(0.0001, t+0.12);
        o2.connect(g2).connect(dest); o2.start(t+0.03); o2.stop(t+0.13);
      }
      setTimeout(pop, 40 + Math.random()*700);
    }
    pop();
  }

  /* ---------- 加载原曲 ---------- */
  async function loadTrack(player){
    if(loaded[player] !== undefined) return loaded[player];
    try{
      const a = new Audio();
      a.preload = 'auto';
      const r = await fetch(TRACKS[player].file, {method:'HEAD'});
      if(r.ok){
        a.src = TRACKS[player].file;
        loaded[player] = a;
        return a;
      }
    }catch(e){}
    loaded[player] = null;
    return null;
  }

  async function preload(){
    await Promise.all(['us','ussr'].map(loadTrack));
  }

  /* ---------- 播放控制 ---------- */
  async function play(player){
    if(playing && cur && cur.player === player) return;
    stop();
    const c = ac(); if(!c) return;
    if(!master) buildAgingChain();
    if(!master) return;

    playing = true;
    const audio = await loadTrack(player);
    if(audio){
      // 真原曲：通过 audio element + MediaElementSource 进做旧链
      stop();
      const src = c.createMediaElementSource(audio);
      const gain = c.createGain(); gain.gain.value = 1.45 * masterVol;
      const lp = c.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value= aged?11000:18000; lp.Q.value=0.6;
      const hp = c.createBiquadFilter(); hp.type='highpass'; hp.frequency.value= aged?60:20;
      // wow&flutter: LFO → gain 微摆（近似 playbackRate 抖动）
      const lfo = c.createOscillator(); lfo.frequency.value = 0.7;
      const lfo2 = c.createOscillator(); lfo2.frequency.value = 5.3;
      const lfoG = c.createGain(); lfoG.gain.value = aged ? 0.012 : 0;
      const lfoG2 = c.createGain(); lfoG2.gain.value = aged ? 0.003 : 0;
      lfo.connect(lfoG).connect(gain.gain);
      lfo2.connect(lfoG2).connect(gain.gain);
      src.connect(hp).connect(lp).connect(gain).connect(master);
      lfo.start(); lfo2.start();
      audio.loop = true;
      audio.volume = 1;
      await audio.play().catch(()=>{});
      cur = {player, audio, gain, src, lfo, lfo2, lp, hp};
    } else {
      // 无原曲：合成兜底（同一套做旧链）
      cur = {player, synth: startSynth(player, c, master)};
    }
  }

  function stop(){
    if(cur){
      if(cur.audio){ try{ cur.audio.pause(); cur.audio.currentTime = 0; }catch(e){} }
      if(cur.synth){ cur.synth.stop(); }
      if(cur.lfo){ try{cur.lfo.stop(); cur.lfo2.stop();}catch(e){} }
      cur = null;
    }
    playing = false;
  }

  function toggle(){
    if(playing) stop();
    else if(typeof G !== 'undefined' && G) play(G.activePlayer || 'ussr');
  }

  function setAged(v){
    aged = v;
    if(cur && cur.synth){ cur.synth.setAged(v); }
    if(master && noiseNodes[0]) noiseNodes[0].gain.gain.value = v ? 0.028 : 0;
  }

  function isPlaying(){ return playing; }
  function currentTrack(){ return cur ? cur.player : null; }
  function hasOriginal(){ return loaded.us !== null || loaded.ussr !== null; }
  function trackStatus(){
    return {
      us: loaded.us === null ? 'none' : (loaded.us ? 'ok' : 'pending'),
      ussr: loaded.ussr === null ? 'none' : (loaded.ussr ? 'ok' : 'pending'),
    };
  }

  /* ---------- 合成兜底 ---------- */
  function startSynth(player, c, dest){
    let stopped = false;
    let isAged = aged;
    // 简单进行曲节奏：低音军鼓 + 军号旋律，两侧风格不同
    const tempo = player === 'us' ? 132 : 104;
    const beat = 60 / tempo;
    // US: 轻快摇摆（1920s jazz），USSR: 庄严进行曲
    const scaleUs = [0,2,4,5,7,9,11];      // 大调
    const scaleUssr = [0,3,5,7,8,10,12];   // 小调音阶
    const scale = player === 'us' ? scaleUs : scaleUssr;
    const root = player === 'us' ? 220 : 174.61;
    const mel = [];
    // 生成一段循环旋律（16 音）
    let deg = [4,5,6,5,4,3,2,1,0,1,2,3,4,5,6,5];
    if(player === 'ussr') deg = [0,1,2,1,3,2,1,0,0,3,4,3,2,1,2,1];
    for(const d of deg){
      const semi = scale[d % scale.length] + 12*Math.floor(d/scale.length);
      mel.push(root * Math.pow(2, semi/12));
    }
    let step = 0;
    const notes = [];
    function tick(){
      if(stopped) return;
      const t = c.currentTime + 0.02;
      const f = mel[step % mel.length];
      // 旋律（军号）
      const o = c.createOscillator(), g = c.createGain();
      o.type = player==='us' ? 'triangle' : 'sawtooth';
      o.frequency.value = f;
      const vib = c.createOscillator(); vib.frequency.value = 5.5;
      const vibG = c.createGain(); vibG.gain.value = isAged ? f*0.008 : f*0.004;
      vib.connect(vibG).connect(o.frequency);
      const dur = beat * (step % 4 === 0 ? 0.9 : 0.55);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(isAged?0.13:0.1, t+0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
      o.connect(g).connect(dest);
      o.start(t); o.stop(t+dur+0.05); vib.start(t); vib.stop(t+dur+0.05);
      // 和弦（持续）
      if(step % 8 === 0){
        [0,1,2].forEach((h,i)=>{
          const semi = scale[h % scale.length] + 12*Math.floor(h/scale.length);
          const cf = root * Math.pow(2, semi/12) * 0.5;
          const co = c.createOscillator(), cg = c.createGain();
          co.type='sine'; co.frequency.value=cf;
          cg.gain.setValueAtTime(0.0001,t);
          cg.gain.exponentialRampToValueAtTime(0.06,t+0.05);
          cg.gain.exponentialRampToValueAtTime(0.0001,t+beat*4);
          co.connect(cg).connect(dest); co.start(t); co.stop(t+beat*4+0.05);
        });
      }
      // 军鼓
      if(step % 2 === 0){
        const sd = c.createBufferSource();
        const buf = c.createBuffer(1, c.sampleRate*0.05, c.sampleRate);
        const d = buf.getChannelData(0);
        for(let i=0;i<d.length;i++) d[i] = (Math.random()*2-1)*Math.pow(1-i/d.length,2);
        const sg = c.createGain(); sg.gain.value = isAged?0.05:0.07;
        sd.buffer = buf; sd.connect(sg).connect(dest); sd.start(t);
      }
      step++;
      const delay = (step % 4 === 0 ? 0.9 : 0.55) * beat * 1000;
      notes.push(setTimeout(tick, delay));
    }
    tick();
    return {
      stop(){ stopped = true; notes.forEach(clearTimeout); },
      setAged(v){ isAged = v; },
    };
  }

  return {
    init(){ ac(); },
    preload, play, stop, toggle,
    setAged, isAged(){return aged;},
    setVolume(v){
      masterVol = Math.max(0, Math.min(1.6, Number(v) || 0));
      if(master) master.gain.value = masterVol;
      if(cur && cur.gain) cur.gain.gain.value = 1.45 * masterVol;
    },
    volume(){ return masterVol; },
    master(){ return master; },
    isPlaying, currentTrack, trackStatus, hasOriginal,
    TRACKS,
  };
})();
