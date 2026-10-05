/* ===== 冷战热斗 · SVG 世界地图 ===== */
/* 简化等距圆柱投影，1000×600 viewBox */

function buildMapSVG(){
  const svg = document.getElementById('mapSvg');
  if(!svg) return;
  svg.innerHTML = `
    <defs>
      <linearGradient id="oceanGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#1a2838"/>
        <stop offset="100%" stop-color="#0a1420"/>
      </linearGradient>
      <pattern id="dotGrid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="10" cy="10" r="0.5" fill="rgba(255,255,255,0.06)"/>
      </pattern>
      <filter id="mapGlow">
        <feGaussianBlur stdDeviation="3" result="blur"/>
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      </filter>
    </defs>

    <!-- 海洋背景 -->
    <rect x="0" y="0" width="1000" height="600" fill="url(#oceanGrad)"/>
    <rect x="0" y="0" width="1000" height="600" fill="url(#dotGrid)"/>

    <!-- 经纬网格 -->
    <g stroke="rgba(200,168,106,0.08)" stroke-width="0.5" fill="none">
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

    <!-- 大陆板块 -->
    <g fill="#3a3520" stroke="#5a4a30" stroke-width="1" opacity="0.85">
      <!-- 北美 -->
      <path d="M 100,120 L 145,85 L 220,80 L 275,95 L 285,135 L 275,180 L 245,205 L 210,220 L 180,232 L 175,258 L 200,285 L 175,290 L 155,265 L 130,225 L 105,190 L 90,155 Z"/>
      <!-- 中美 -->
      <path d="M 195,290 L 215,285 L 235,290 L 258,332 L 272,360 L 258,352 L 230,340 L 215,320 L 200,305 Z"/>
      <!-- 南美 -->
      <path d="M 260,362 L 280,362 L 320,375 L 340,395 L 335,430 L 325,460 L 305,478 L 285,465 L 268,440 L 258,410 L 255,385 Z"/>
      <!-- 欧洲 -->
      <path d="M 435,110 L 480,100 L 525,100 L 555,115 L 570,145 L 580,175 L 570,205 L 545,225 L 520,240 L 500,235 L 480,240 L 460,245 L 445,240 L 425,225 L 418,200 L 425,170 L 430,140 Z"/>
      <!-- 非洲 -->
      <path d="M 445,245 L 470,240 L 510,245 L 545,255 L 570,275 L 585,310 L 590,345 L 580,380 L 555,410 L 530,440 L 510,455 L 495,440 L 485,410 L 475,380 L 465,350 L 455,315 L 445,285 Z"/>
      <!-- 亚洲 -->
      <path d="M 570,105 L 620,95 L 690,90 L 750,95 L 820,110 L 880,130 L 920,155 L 910,190 L 880,215 L 840,235 L 800,245 L 770,255 L 745,265 L 720,270 L 690,265 L 660,255 L 630,245 L 600,225 L 585,200 L 578,170 L 575,140 Z"/>
      <!-- 东南亚岛屿 -->
      <path d="M 720,275 L 750,272 L 780,278 L 805,290 L 795,305 L 775,308 L 750,300 Z"/>
      <path d="M 820,320 L 845,315 L 865,325 L 855,340 L 835,338 L 825,332 Z"/>
      <path d="M 750,315 L 790,312 L 820,325 L 825,355 L 810,380 L 780,388 L 755,375 L 745,350 Z"/>
      <!-- 澳大利亚 -->
      <path d="M 800,430 L 850,425 L 880,440 L 875,470 L 850,485 L 815,478 L 800,455 Z"/>
      <!-- 日本 -->
      <path d="M 855,200 L 870,195 L 880,205 L 875,225 L 862,235 L 855,225 L 852,212 Z"/>
      <!-- 朝鲜半岛 -->
      <path d="M 785,205 L 800,200 L 808,215 L 805,240 L 793,245 L 785,235 Z"/>
      <!-- 英国 -->
      <path d="M 442,135 L 458,130 L 465,145 L 460,165 L 448,170 L 440,155 Z"/>
      <!-- 冰盖/绿点 -->
    </g>

    <!-- 装饰性元素 -->
    <g opacity="0.4" fill="rgba(201,169,106,0.4)" font-family="Georgia,serif" font-size="9" letter-spacing="3">
      <text x="185" y="150" text-anchor="middle">NORTH AMERICA</text>
      <text x="290" y="430" text-anchor="middle">SOUTH AMERICA</text>
      <text x="500" y="180" text-anchor="middle">EUROPE</text>
      <text x="510" y="345" text-anchor="middle">AFRICA</text>
      <text x="740" y="180" text-anchor="middle">ASIA</text>
      <text x="790" y="360" text-anchor="middle">SE ASIA</text>
      <text x="230" y="320" text-anchor="middle">CENTRAL AMERICA</text>
    </g>

    <!-- 铁幕线 -->
    <path d="M 495,90 Q 505,180 495,275 Q 500,350 495,470" 
          stroke="var(--ussr)" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.55" fill="none"/>
    <text x="490" y="285" fill="var(--ussr)" font-family="Georgia,serif" font-size="8" font-weight="800" letter-spacing="2" text-anchor="end">IRON CURTAIN</text>

    <!-- 边框 -->
    <rect x="1" y="1" width="998" height="598" fill="none" stroke="rgba(201,169,106,0.3)" stroke-width="2"/>
    <rect x="4" y="4" width="992" height="592" fill="none" stroke="rgba(201,169,106,0.15)" stroke-width="0.5"/>

    <!-- 角标 -->
    <g font-family="Courier New,monospace" font-size="7" fill="rgba(201,169,106,0.5)" letter-spacing="1">
      <text x="12" y="18">45°N</text>
      <text x="12" y="490">15°S</text>
      <text x="12" y="300">EQUATOR</text>
      <text x="980" y="18" text-anchor="end">60°E</text>
      <text x="980" y="300" text-anchor="end">180°</text>
      <text x="12" y="590">CLASSIFIED · COLD WAR BUREAU</text>
      <text x="980" y="590" text-anchor="end">TURN 01</text>
    </g>
  `;
}
