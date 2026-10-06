/* ===== 冷战热斗 · 世界地图 =====
 * 设计空间固定 1000x600，容器自适应缩放 + 平移缩放(pan/zoom)。
 * 国家格子按区域做网格化排布，坐标由算法算出 —— 任意尺寸下都不会重叠。
 */

const MAP = (() => {
  const DW = 1000, DH = 600;

  // 每个区域的排布框：在 1000x600 设计空间内的矩形 + 列数
  const REGION_BOX = {
    europe:          {x:398, y:58,  w:252, h:192, cols:7},
    asia:            {x:668, y:58,  w:296, h:104, cols:5},
    middle_east:     {x:398, y:258, w:182, h:84,  cols:5},
    se_asia:         {x:784, y:258, w:180, h:150, cols:3},
    africa:          {x:592, y:258, w:178, h:226, cols:6},
    central_america: {x:166, y:288, w:176, h:80,  cols:5},
    south_america:   {x:258, y:378, w:128, h:120, cols:4}
  };

  const REGION_ORDER = ['europe','asia','middle_east','se_asia','africa','central_america','south_america'];

  let view = {s: 1, px: 0, py: 0};      // 缩放与平移
  let fitS = 1, fitPx = 0, fitPy = 0;    // fit 基准，用于限制缩放范围
  let nodes = {};                        // cid -> DOM 节点
  let pos = {};                          // cid -> {x,y,w,h}
  let svg, canvasEl, layer;

  /* ---------- 背景 SVG ---------- */
  function buildMapSVG(){
    svg = document.getElementById('mapSvg');
    if(!svg) return;
    svg.innerHTML = `
    <defs>
      <linearGradient id="oceanGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#16233a"/>
        <stop offset="55%" stop-color="#0d1826"/>
        <stop offset="100%" stop-color="#080f18"/>
      </linearGradient>
      <radialGradient id="oceanLight" cx="46%" cy="34%" r="70%">
        <stop offset="0%" stop-color="rgba(70,110,160,0.20)"/>
        <stop offset="100%" stop-color="rgba(70,110,160,0)"/>
      </radialGradient>
      <pattern id="dotGrid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="10" cy="10" r="0.55" fill="rgba(201,168,106,0.07)"/>
      </pattern>
      <linearGradient id="landGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#4a4430"/>
        <stop offset="100%" stop-color="#332e1e"/>
      </linearGradient>
      <filter id="landShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
        <feOffset dx="0" dy="2" result="off"/>
        <feComponentTransfer><feFuncA type="linear" slope="0.55"/></feComponentTransfer>
        <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>

    <rect x="0" y="0" width="1000" height="600" fill="url(#oceanGrad)"/>
    <rect x="0" y="0" width="1000" height="600" fill="url(#oceanLight)"/>
    <rect x="0" y="0" width="1000" height="600" fill="url(#dotGrid)"/>

    <g stroke="rgba(200,168,106,0.09)" stroke-width="0.5" fill="none">
      <line x1="0" y1="100" x2="1000" y2="100"/>
      <line x1="0" y1="200" x2="1000" y2="200"/>
      <line x1="0" y1="300" x2="1000" y2="300"/>
      <line x1="0" y1="400" x2="1000" y2="400"/>
      <line x1="0" y1="500" x2="1000" y2="500"/>
      <line x1="200" y1="0" x2="200" y2="600"/>
      <line x1="400" y1="0" x2="400" y2="600"/>
      <line x1="600" y1="0" x2="600" y2="600"/>
      <line x1="800" y1="0" x2="800" y2="600"/>
    </g>

    <g fill="url(#landGrad)" stroke="#6b5c3c" stroke-width="1" opacity="0.9" filter="url(#landShadow)">
      <path d="M 100,120 L 145,85 L 220,80 L 275,95 L 285,135 L 275,180 L 245,205 L 210,220 L 180,232 L 175,258 L 200,285 L 175,290 L 155,265 L 130,225 L 105,190 L 90,155 Z"/>
      <path d="M 195,290 L 215,285 L 235,290 L 258,332 L 272,360 L 258,352 L 230,340 L 215,320 L 200,305 Z"/>
      <path d="M 260,362 L 280,362 L 320,375 L 340,395 L 335,430 L 325,460 L 305,478 L 285,465 L 268,440 L 258,410 L 255,385 Z"/>
      <path d="M 435,110 L 480,100 L 525,100 L 555,115 L 570,145 L 580,175 L 570,205 L 545,225 L 520,240 L 500,235 L 480,240 L 460,245 L 445,240 L 425,225 L 418,200 L 425,170 L 430,140 Z"/>
      <path d="M 445,245 L 470,240 L 510,245 L 545,255 L 570,275 L 585,310 L 590,345 L 580,380 L 555,410 L 530,440 L 510,455 L 495,440 L 485,410 L 475,380 L 465,350 L 455,315 L 445,285 Z"/>
      <path d="M 570,105 L 620,95 L 690,90 L 750,95 L 820,110 L 880,130 L 920,155 L 910,190 L 880,215 L 840,235 L 800,245 L 770,255 L 745,265 L 720,270 L 690,265 L 660,255 L 630,245 L 600,225 L 585,200 L 578,170 L 575,140 Z"/>
      <path d="M 720,275 L 750,272 L 780,278 L 805,290 L 795,305 L 775,308 L 750,300 Z"/>
      <path d="M 820,320 L 845,315 L 865,325 L 855,340 L 835,338 L 825,332 Z"/>
      <path d="M 750,315 L 790,312 L 820,325 L 825,355 L 810,380 L 780,388 L 755,375 L 745,350 Z"/>
      <path d="M 800,430 L 850,425 L 880,440 L 875,470 L 850,485 L 815,478 L 800,455 Z"/>
      <path d="M 855,200 L 870,195 L 880,205 L 875,225 L 862,235 L 855,225 L 852,212 Z"/>
      <path d="M 785,205 L 800,200 L 808,215 L 805,240 L 793,245 L 785,235 Z"/>
      <path d="M 442,135 L 458,130 L 465,145 L 460,165 L 448,170 L 440,155 Z"/>
    </g>

    <g opacity="0.5" fill="rgba(201,169,106,0.42)" font-family="Georgia,serif" font-size="10" letter-spacing="3">
      <text x="185" y="152" text-anchor="middle">NORTH AMERICA</text>
      <text x="292" y="432" text-anchor="middle">SOUTH AMERICA</text>
      <text x="500" y="98" text-anchor="middle">EUROPE</text>
      <text x="512" y="352" text-anchor="middle">AFRICA</text>
      <text x="756" y="188" text-anchor="middle">ASIA</text>
      <text x="800" y="330" text-anchor="middle">SE ASIA</text>
      <text x="230" y="286" text-anchor="middle">CENTRAL AMERICA</text>
      <text x="664" y="248" text-anchor="middle">MIDDLE EAST</text>
    </g>

    <path d="M 566,80 Q 578,180 566,275 Q 572,360 566,480"
          stroke="#c8102e" stroke-width="1.4" stroke-dasharray="5,4" opacity="0.5" fill="none"/>
    <text x="562" y="500" fill="#e8455c" font-family="Georgia,serif" font-size="8.5" font-weight="800"
          letter-spacing="2.5" text-anchor="end">IRON CURTAIN</text>

    <rect x="1" y="1" width="998" height="598" fill="none" stroke="rgba(201,169,106,0.28)" stroke-width="2"/>
    <rect x="4" y="4" width="992" height="592" fill="none" stroke="rgba(201,169,106,0.14)" stroke-width="0.5"/>

    <g font-family="Courier New,monospace" font-size="7" fill="rgba(201,169,106,0.48)" letter-spacing="1">
      <text x="12" y="18">60&#176;N</text>
      <text x="12" y="490">15&#176;S</text>
      <text x="12" y="306">EQUATOR</text>
      <text x="980" y="18" text-anchor="end">60&#176;E</text>
      <text x="980" y="306" text-anchor="end">180&#176;</text>
      <text x="12" y="590">CLASSIFIED &#183; COLD WAR BUREAU</text>
      <text x="980" y="590" text-anchor="end">TURN 01</text>
    </g>`;
  }

  /* ---------- 网格化布局：每个区域内按列数折行，格子互不重叠 ---------- */
  function layout(){
    pos = {};
    const byRegion = {};
    for(const [cid, c] of Object.entries(COUNTRIES)){
      (byRegion[c.region] = byRegion[c.region] || []).push(cid);
    }
    REGION_ORDER.forEach(rid => {
      const box = REGION_BOX[rid];
      const list = byRegion[rid] || [];
      // 按原始坐标排序，保留大致地理顺序
      list.sort((a, b) => (COUNTRIES[a].ny - COUNTRIES[b].ny) * 3 || COUNTRIES[a].nx - COUNTRIES[b].nx);
      const cols = box.cols;
      const rows = Math.max(1, Math.ceil(list.length / cols));
      const cw = box.w / cols;
      const ch = box.h / rows;
      const padX = Math.min(2.2, cw * 0.06);
      const padY = Math.min(2.4, ch * 0.06);
      list.forEach((cid, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        pos[cid] = {
          x: box.x + col * cw + padX,
          y: box.y + row * ch + padY,
          w: cw - padX * 2,
          h: ch - padY * 2,
          cx: box.x + col * cw + cw / 2,
          cy: box.y + row * ch + ch / 2,
          region: rid
        };
      });
    });
    // 超级大国单独摆放，放大样式
    pos.us   = {x:194, y:192, w:74, h:46, cx:231, cy:215, region:'europe', superpower:true};
    pos.ussr = {x:698, y:192, w:74, h:46, cx:735, cy:215, region:'europe', superpower:true};
    return pos;
  }

  /* ---------- 一次性创建国家节点 ---------- */
  function buildTiles(){
    canvasEl = document.getElementById('mapCanvas');
    layer = document.getElementById('countryLayer');
    if(!canvasEl || !layer) return;
    layout();
    let html = '';
    for(const [cid, c] of Object.entries(COUNTRIES)){
      const p = pos[cid];
      if(!p) continue;
      const nm = c.name.length > 5 ? c.name.slice(0, 5) : c.name;
      const sz = (p.w < 34 || p.h < 32) ? ' tile-xs' : (p.w < 44 || p.h < 44) ? ' tile-sm' : '';
      html += `<div class="country${c.superpower ? ' sp' : ''}${sz} ${c.battleground ? 'bg' : ''}"
        data-cid="${cid}" style="left:${p.x.toFixed(1)}px;top:${p.y.toFixed(1)}px;width:${p.w.toFixed(1)}px;height:${p.h.toFixed(1)}px">
        ${c.superpower
          ? `<div class="sp-flag ${cid}">${cid === 'us' ? '&#9733; USA' : '&#9632; SSSR'}</div>`
          : `<div class="cname-mini">${escapeHtmlForMap(nm)}</div>
             <div class="cnum">${c.stability}</div>
             <div class="cinf" data-inf="${cid}"></div>`}
      </div>`;
    }
    // 区域标签
    REGION_ORDER.forEach(rid => {
      const box = REGION_BOX[rid];
      const box2 = posOfRegion(rid);
      if(!box2) return;
      html += `<div class="region-label" style="left:${box.x}px;top:${box.y - 13}px;width:${box.w}px">
        ${REGIONS[rid].zh}</div>`;
    });
    layer.innerHTML = html;
    nodes = {};
    layer.querySelectorAll('.country').forEach(n => { nodes[n.dataset.cid] = n; });
  }

  function posOfRegion(rid){
    for(const cid in pos){ if(pos[cid].region === rid) return pos[cid]; }
    return null;
  }

  function escapeHtmlForMap(s){
    return String(s || '').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  }

  /* ---------- 刷新单个国家状态（增量更新，避免整表重建） ---------- */
  function updateTile(cid){
    const node = nodes[cid];
    const c = COUNTRIES[cid];
    if(!node || !c) return;
    if(c.superpower) return;
    const cls = ['country', c.battleground ? 'bg' : '',
      isControlled('us', cid) ? 'us-ctrl' : isControlled('ussr', cid) ? 'ussr-ctrl' : ''];
    if(c.stability <= 2) cls.push('low-stab');
    if(G.phase === 'playOps' && canPlaceInfluence(G.activePlayer, cid)) cls.push('place-ok');
    if(G.phase === 'playOps' && c.battleground && c.stability <= 2 && hasAdjInf(G.activePlayer, cid)) cls.push('coup-ok');
    node.className = cls.join(' ');
    const inf = node.querySelector('[data-inf]');
    if(inf){
      const us = getInf('us', cid), ss = getInf('ussr', cid);
      let s = '';
      for(let i = 0; i < us; i++) s += '<i class="us">●</i>';
      for(let i = 0; i < ss; i++) s += '<i class="ussr">●</i>';
      if(inf.dataset.txt !== s) { inf.innerHTML = s; inf.dataset.txt = s; }
    }
    const label = `${c.name} · ${REGIONS[c.region].zh} · 稳定度 ${c.stability}${c.battleground ? ' · 战地国' : ''}`
      + `\n控制 ${getInf('us',cid) > getInf('ussr',cid) ? '美国' : getInf('ussr',cid) > getInf('us',cid) ? '苏联' : '—'}`
      + ` · 影响力 美 ${getInf('us',cid)} / 苏 ${getInf('ussr',cid)}`
      + (c.superpower ? '' : ` · 放置成本 ${placeCost(G.activePlayer || 'us', cid)} Ops`);
    if(node.dataset.tip !== label){ node.title = label; node.dataset.tip = label; }
  }

  function updateAll(){ for(const cid in nodes) updateTile(cid); }

  /* ---------- 视图：缩放与平移 ---------- */
  function clamp(){
    const s = Math.max(fitS * 0.55, Math.min(fitS * 3.4, view.s));
    view.s = s;
    const w = DW * s, h = DH * s;
    const pad = 60;
    const host = layer.parentElement;
    const cw = host ? host.clientWidth : DW;
    const ch = host ? host.clientHeight : DH;
    const minX = Math.min(pad, cw - w - pad);
    const maxX = Math.max(-pad, w - cw + pad);
    const minY = Math.min(pad, ch - h - pad);
    const maxY = Math.max(-pad, h - ch + pad);
    view.px = Math.max(minX, Math.min(maxX, view.px));
    view.py = Math.max(minY, Math.min(maxY, view.py));
  }

  function apply(){
    if(!canvasEl) return;
    canvasEl.style.transform = `translate(${view.px}px, ${view.py}px) scale(${view.s})`;
  }

  function fit(){
    const host = layer.parentElement;
    if(!host) return;
    const cw = host.clientWidth || 1, ch = host.clientHeight || 1;
    fitS = Math.min(cw / DW, ch / DH);
    fitPx = (cw - DW * fitS) / 2;
    fitPy = (ch - DH * fitS) / 2;
    view.s = fitS; view.px = fitPx; view.py = fitPy;
    clamp(); apply();
  }

  function zoomAt(factor, cx, cy){
    const host = layer.parentElement;
    if(!host) return;
    const r = host.getBoundingClientRect();
    const ax = (cx === undefined ? r.width / 2 : cx - r.left);
    const ay = (cy === undefined ? r.height / 2 : cy - r.top);
    const oldS = view.s;
    const ns = Math.max(fitS * 0.55, Math.min(fitS * 3.4, oldS * factor));
    if(ns === oldS) return;
    view.px = ax - (ax - view.px) * (ns / oldS);
    view.py = ay - (ay - view.py) * (ns / oldS);
    view.s = ns;
    clamp(); apply();
    emit('zoom', ns);
  }

  function setZoom(s){
    const host = layer.parentElement;
    if(!host) return;
    const r = host.getBoundingClientRect();
    zoomAt(s / view.s, r.left + r.width / 2, r.top + r.height / 2);
  }

  function getScale(){ return view.s; }

  /* 屏幕坐标 -> 设计坐标；命中哪个国家 */
  function pick(clientX, clientY){
    if(!layer) return null;
    const host = layer.parentElement;
    if(!host) return null;
    const r = host.getBoundingClientRect();
    const dx = (clientX - r.left - view.px) / view.s;
    const dy = (clientY - r.top - view.py) / view.s;
    for(const [cid, p] of Object.entries(pos)){
      if(dx >= p.x && dx <= p.x + p.w && dy >= p.y && dy <= p.y + p.h) return cid;
    }
    return null;
  }

  function centerOn(cid){
    const p = pos[cid];
    if(!p || !layer) return;
    const host = layer.parentElement;
    if(!host) return;
    const cw = host.clientWidth, ch = host.clientHeight;
    view.px = cw / 2 - p.cx * view.s;
    view.py = ch / 2 - p.cy * view.s;
    clamp(); apply();
  }

  function xyOf(cid){
    const p = pos[cid];
    if(!p) return null;
    const host = layer.parentElement;
    const r = host ? host.getBoundingClientRect() : {left:0, top:0};
    return {x: r.left + view.px + p.cx * view.s, y: r.top + view.py + p.cy * view.s};
  }

  /* ---------- 手势：滚轮缩放 / 双指捏合 / 单指平移 ---------- */
  const handlers = {};
  let pointers = new Map();
  let pinch = null;
  let panning = false, panStart = null;

  function init(){
    if(!window.__mapLog) window.__mapLog = [];
    window.__mapLog.push('init.enter rs=' + document.readyState + ' svg=' + !!document.getElementById('mapSvg') + ' layer=' + !!document.getElementById('countryLayer'));
    if(!layer) layer = document.getElementById('countryLayer');
    if(!canvasEl) canvasEl = document.getElementById('mapCanvas');
    const host = layer && layer.parentElement;
    if(!host){ window.__mapLog.push('init.earlyReturn host=' + host + ' layer=' + layer); console.warn('[MAP] countryLayer 不存在'); return; }
    window.__mapLog.push('init.build parent=' + host.id);
    buildMapSVG();
    window.__mapLog.push('init.svgDone children=' + (document.getElementById('mapSvg')||{}).children?.length);
    buildTiles();
    window.__mapLog.push('init.tilesDone pos=' + Object.keys(pos).length + ' layerCh=' + document.getElementById('countryLayer').children.length);
    fit();
    if(typeof ResizeObserver !== 'undefined'){
      new ResizeObserver(() => { fitKeep(); }).observe(host);
    } else {
      window.addEventListener('resize', fit);
    }

    host.addEventListener('wheel', e => {
      e.preventDefault();
      const f = Math.pow(0.9985, e.deltaY);
      zoomAt(f, e.clientX, e.clientY);
    }, {passive: false});

    host.addEventListener('pointerdown', e => {
      if(e.target.closest('.country') || e.target.closest('button')) return;
      pointers.set(e.pointerId, {x: e.clientX, y: e.clientY});
      if(pointers.size === 1){
        panning = true; panStart = {x: e.clientX, y: e.clientY, px: view.px, py: view.py};
        host.classList.add('panning');
      } else if(pointers.size === 2){
        panning = false;
        const [a, b] = [...pointers.values()];
        pinch = {d: Math.hypot(a.x - b.x, a.y - b.y), s: view.s};
      }
    });
    host.addEventListener('pointermove', e => {
      if(!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, {x: e.clientX, y: e.clientY});
      if(pointers.size >= 2 && pinch){
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        setZoom(pinch.s * (d / pinch.d));
      } else if(panning && panStart){
        view.px = panStart.px + (e.clientX - panStart.x);
        view.py = panStart.py + (e.clientY - panStart.y);
        clamp(); apply();
      }
    });
    const end = e => {
      pointers.delete(e.pointerId);
      if(pointers.size < 2) pinch = null;
      if(pointers.size === 0){ panning = false; panStart = null; host.classList.remove('panning'); }
    };
    host.addEventListener('pointerup', end);
    host.addEventListener('pointercancel', end);
    host.addEventListener('pointerleave', end);

    const zin = document.getElementById('zoomIn');
    const zout = document.getElementById('zoomOut');
    const zfit = document.getElementById('zoomFit');
    if(zin) zin.addEventListener('click', () => zoomAt(1.25));
    if(zout) zout.addEventListener('click', () => zoomAt(0.8));
    if(zfit) zfit.addEventListener('click', () => { fit(); apply(); emit('zoom', view.s); });
  }

  function fitKeep(){
    // 容器尺寸变化时保持当前缩放倍率，只重算平移边界
    clamp(); apply();
  }

  function on(ev, fn){
    (handlers[ev] = handlers[ev] || []).push(fn);
  }
  function emit(ev, v){ (handlers[ev] || []).forEach(fn => { try { fn(v); } catch(_){} }); }

  return {init, layout, buildTiles, updateTile, updateAll, fit, apply, pick,
          centerOn, xyOf, zoomAt, setZoom, getScale, on, pos: () => pos, nodes: () => nodes};
})();
