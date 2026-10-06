/* ===== 冷战热斗 · 数据层 ===== */
/* 卡牌数据源: twilightstrategy.com 真实卡表 (114 张) */
/* 国家数据: Twilight Struggle 标准地图 */

const REGIONS = {
  europe:{name:'欧洲', zh:'欧洲'},
  asia:{name:'亚洲', zh:'亚洲'},
  middle_east:{name:'中东', zh:'中东'},
  africa:{name:'非洲', zh:'非洲'},
  central_america:{name:'中美', zh:'中美洲'},
  south_america:{name:'南美', zh:'南美洲'},
  se_asia:{name:'东南亚', zh:'东南亚'}
};

// 国家: bg=背景色(us/ussr/neutral), stability=稳定度, battleground=战地国, region=区域, nx,ny=地图坐标
const COUNTRIES = {
  // Europe - Superpower
  us:{name:'美国', stability:0, bg:'us', region:'europe', battleground:false, superpower:true, nx:230, ny:245, neighbors:['canada','mexico']},
  ussr:{name:'苏联', stability:0, bg:'ussr', region:'europe', battleground:false, superpower:true, nx:660, ny:150, neighbors:['poland','romania','afghanistan','north_korea']},

  // Europe - Western
  canada:{name:'加拿大', stability:4, bg:'us', region:'europe', battleground:false, nx:220, ny:175, neighbors:['us','uk']},
  uk:{name:'英国', stability:4, bg:'us', region:'europe', battleground:false, nx:445, ny:165, neighbors:['canada','france','norway']},
  france:{name:'法国', stability:3, bg:'us', region:'europe', battleground:true, nx:465, ny:195, neighbors:['uk','west_germany','italy','algeria']},
  west_germany:{name:'西德', stability:4, bg:'us', region:'europe', battleground:true, nx:495, ny:178, neighbors:['france','east_germany','poland','czechoslovakia','italy']},
  italy:{name:'意大利', stability:2, bg:'us', region:'europe', battleground:true, nx:498, ny:215, neighbors:['france','west_germany','yugoslavia','greece']},
  norway:{name:'挪威', stability:4, bg:'neutral', region:'europe', battleground:false, nx:480, ny:118, neighbors:['uk','sweden','finland']},
  sweden:{name:'瑞典', stability:4, bg:'neutral', region:'europe', battleground:false, nx:505, ny:118, neighbors:['norway','finland','denmark']},
  denmark:{name:'丹麦', stability:4, bg:'neutral', region:'europe', battleground:false, nx:490, ny:148, neighbors:['sweden','west_germany']},
  finland:{name:'芬兰', stability:4, bg:'neutral', region:'europe', battleground:false, nx:530, ny:105, neighbors:['sweden','norway','ussr']},
  benelux:{name:'比荷卢', stability:4, bg:'neutral', region:'europe', battleground:false, nx:478, ny:178, neighbors:['france','west_germany','uk']},
  austria:{name:'奥地利', stability:4, bg:'neutral', region:'europe', battleground:false, nx:515, ny:195, neighbors:['west_germany','italy','east_germany','hungary','yugoslavia']},
  greece:{name:'希腊', stability:3, bg:'neutral', region:'europe', battleground:false, nx:535, ny:232, neighbors:['italy','yugoslavia','bulgaria','turkey']},
  turkey:{name:'土耳其', stability:3, bg:'neutral', region:'europe', battleground:false, nx:555, ny:235, neighbors:['greece','bulgaria','syria','iran','ussr']},
  spain_pt:{name:'西班牙/葡萄牙', stability:4, bg:'neutral', region:'europe', battleground:false, nx:440, ny:232, neighbors:['france','algeria','morocco']},

  // Europe - Eastern
  east_germany:{name:'东德', stability:3, bg:'ussr', region:'europe', battleground:true, nx:512, ny:178, neighbors:['west_germany','poland','czechoslovakia']},
  poland:{name:'波兰', stability:3, bg:'ussr', region:'europe', battleground:true, nx:540, ny:158, neighbors:['east_germany','czechoslovakia','ussr','austria']},
  czechoslovakia:{name:'捷克斯洛伐克', stability:3, bg:'ussr', region:'europe', battleground:false, nx:525, ny:190, neighbors:['west_germany','east_germany','poland','austria','hungary','yugoslavia']},
  hungary:{name:'匈牙利', stability:3, bg:'ussr', region:'europe', battleground:false, nx:535, ny:205, neighbors:['austria','czechoslovakia','yugoslavia','romania']},
  yugoslavia:{name:'南斯拉夫', stability:3, bg:'ussr', region:'europe', battleground:false, nx:520, ny:222, neighbors:['italy','austria','hungary','romania','bulgaria','greece']},
  romania:{name:'罗马尼亚', stability:3, bg:'ussr', region:'europe', battleground:false, nx:555, ny:205, neighbors:['hungary','yugoslavia','bulgaria','ussr','czechoslovakia']},
  bulgaria:{name:'保加利亚', stability:3, bg:'ussr', region:'europe', battleground:false, nx:548, ny:222, neighbors:['yugoslavia','romania','greece','turkey']},

  // Asia
  afghanistan:{name:'阿富汗', stability:2, bg:'neutral', region:'asia', battleground:false, nx:640, ny:225, neighbors:['ussr','pakistan','iran']},
  pakistan:{name:'巴基斯坦', stability:2, bg:'neutral', region:'asia', battleground:true, nx:655, ny:252, neighbors:['afghanistan','india','iran']},
  india:{name:'印度', stability:3, bg:'neutral', region:'asia', battleground:true, nx:680, ny:270, neighbors:['pakistan','china','burma']},
  china:{name:'中国', stability:4, bg:'neutral', region:'asia', battleground:true, nx:740, ny:235, neighbors:['ussr','india','north_korea','vietnam','burma']},
  north_korea:{name:'朝鲜', stability:3, bg:'ussr', region:'asia', battleground:false, nx:790, ny:210, neighbors:['ussr','south_korea','china']},
  south_korea:{name:'韩国', stability:3, bg:'us', region:'asia', battleground:false, nx:792, ny:238, neighbors:['north_korea','japan']},
  japan:{name:'日本', stability:4, bg:'us', region:'asia', battleground:true, nx:860, ny:235, neighbors:['south_korea','taiwan']},
  taiwan:{name:'台湾', stability:3, bg:'neutral', region:'asia', battleground:false, nx:800, ny:275, neighbors:['japan','china']},
  burma:{name:'缅甸', stability:2, bg:'neutral', region:'asia', battleground:false, nx:715, ny:290, neighbors:['india','china','laos_cambodia']},
  laos_cambodia:{name:'老挝/柬埔寨', stability:1, bg:'neutral', region:'asia', battleground:false, nx:740, ny:310, neighbors:['burma','vietnam','thailand']},
  vietnam:{name:'越南', stability:2, bg:'neutral', region:'se_asia', battleground:true, nx:752, ny:322, neighbors:['laos_cambodia','china','thailand']},
  thailand:{name:'泰国', stability:2, bg:'neutral', region:'se_asia', battleground:false, nx:730, ny:330, neighbors:['laos_cambodia','vietnam','malaysia']},
  malaysia:{name:'马来西亚', stability:2, bg:'neutral', region:'se_asia', battleground:false, nx:735, ny:360, neighbors:['thailand','indonesia']},
  indonesia:{name:'印度尼西亚', stability:1, bg:'neutral', region:'se_asia', battleground:false, nx:770, ny:390, neighbors:['malaysia','philippines']},
  philippines:{name:'菲律宾', stability:2, bg:'us', region:'se_asia', battleground:false, nx:830, ny:330, neighbors:['indonesia','japan']},

  // Middle East
  iran:{name:'伊朗', stability:2, bg:'neutral', region:'middle_east', battleground:true, nx:620, ny:245, neighbors:['iraq','turkey','ussr','afghanistan','pakistan']},
  iraq:{name:'伊拉克', stability:3, bg:'neutral', region:'middle_east', battleground:false, nx:590, ny:248, neighbors:['iran','gulf_states','syria','jordan','saudi']},
  syria:{name:'叙利亚', stability:2, bg:'neutral', region:'middle_east', battleground:false, nx:575, ny:238, neighbors:['turkey','iraq','jordan','lebanon','israel']},
  lebanon:{name:'黎巴嫩', stability:1, bg:'neutral', region:'middle_east', battleground:false, nx:568, ny:248, neighbors:['syria','israel','jordan']},
  jordan:{name:'约旦', stability:2, bg:'neutral', region:'middle_east', battleground:false, nx:570, ny:258, neighbors:['syria','iraq','saudi','israel']},
  israel:{name:'以色列', stability:4, bg:'neutral', region:'middle_east', battleground:true, nx:565, ny:268, neighbors:['lebanon','syria','jordan','egypt']},
  saudi:{name:'沙特', stability:3, bg:'neutral', region:'middle_east', battleground:false, nx:590, ny:278, neighbors:['jordan','iraq','gulf_states','egypt']},
  gulf_states:{name:'海湾国家', stability:3, bg:'neutral', region:'middle_east', battleground:false, nx:610, ny:285, neighbors:['iraq','saudi','iran']},
  egypt:{name:'埃及', stability:2, bg:'neutral', region:'middle_east', battleground:true, nx:555, ny:285, neighbors:['israel','jordan','saudi','libya','sudan']},
  libya:{name:'利比亚', stability:2, bg:'neutral', region:'middle_east', battleground:false, nx:520, ny:285, neighbors:['egypt','algeria','chad','niger']},

  // Africa
  tunis:{name:'突尼斯', stability:2, bg:'neutral', region:'africa', battleground:false, nx:495, ny:268, neighbors:['algeria','libya']},
  algeria:{name:'阿尔及利亚', stability:2, bg:'neutral', region:'africa', battleground:false, nx:475, ny:272, neighbors:['morocco','tunis','libya','mali','niger','france','spain_pt']},
  morocco:{name:'摩洛哥', stability:2, bg:'neutral', region:'africa', battleground:false, nx:455, ny:268, neighbors:['algeria','spain_pt','waf']},
  waf:{name:'西非', stability:2, bg:'neutral', region:'africa', battleground:false, nx:465, ny:315, neighbors:['morocco','algeria','mali','ivory']},
  ivory:{name:'象牙海岸', stability:2, bg:'neutral', region:'africa', battleground:false, nx:490, ny:330, neighbors:['waf','mali','nigeria']},
  mali:{name:'马里', stability:1, bg:'neutral', region:'africa', battleground:false, nx:490, ny:300, neighbors:['waf','algeria','niger','ivory','sahara']},
  niger:{name:'尼日尔', stability:1, bg:'neutral', region:'africa', battleground:false, nx:515, ny:305, neighbors:['mali','algeria','libya','chad','nigeria','sahara']},
  chad:{name:'乍得', stability:1, bg:'neutral', region:'africa', battleground:false, nx:530, ny:318, neighbors:['niger','libya','sudan','car','nigeria']},
  sudan:{name:'苏丹', stability:2, bg:'neutral', region:'africa', battleground:false, nx:555, ny:315, neighbors:['egypt','libya','chad','car','ethiopia','saudi']},
  ethiopia:{name:'埃塞俄比亚', stability:2, bg:'neutral', region:'africa', battleground:false, nx:575, ny:335, neighbors:['sudan','somalia']},
  somalia:{name:'索马里', stability:2, bg:'neutral', region:'africa', battleground:false, nx:595, ny:340, neighbors:['ethiopia']},
  car:{name:'中非', stability:1, bg:'neutral', region:'africa', battleground:false, nx:530, ny:338, neighbors:['chad','sudan','cameroon','zaire']},
  cameroon:{name:'喀麦隆', stability:1, bg:'neutral', region:'africa', battleground:false, nx:510, ny:345, neighbors:['nigeria','car','zaire']},
  nigeria:{name:'尼日利亚', stability:1, bg:'neutral', region:'africa', battleground:false, nx:500, ny:345, neighbors:['niger','chad','cameroon','ivory','waf']},
  sahara:{name:'撒哈拉', stability:1, bg:'neutral', region:'africa', battleground:false, nx:505, ny:290, neighbors:['mali','niger','algeria','libya']},
  zaire:{name:'扎伊尔', stability:1, bg:'neutral', region:'africa', battleground:false, nx:535, ny:365, neighbors:['car','cameroon','angola','zambia','tanzania']},
  angola:{name:'安哥拉', stability:1, bg:'neutral', region:'africa', battleground:true, nx:530, ny:395, neighbors:['zaire','zambia','south_africa']},
  zambia:{name:'赞比亚', stability:1, bg:'neutral', region:'africa', battleground:false, nx:555, ny:390, neighbors:['zaire','angola','tanzania','mozambique','rhodesia']},
  tanzania:{name:'坦桑尼亚', stability:1, bg:'neutral', region:'africa', battleground:false, nx:565, ny:370, neighbors:['zaire','zambia','mozambique','kenya']},
  kenya:{name:'肯尼亚', stability:2, bg:'neutral', region:'africa', battleground:false, nx:575, ny:365, neighbors:['tanzania','somalia','ethiopia','uganda']},
  uganda:{name:'乌干达', stability:1, bg:'neutral', region:'africa', battleground:false, nx:560, ny:350, neighbors:['kenya','tanzania','zaire','sudan']},
  rhodesia:{name:'罗德西亚', stability:2, bg:'neutral', region:'africa', battleground:false, nx:555, ny:410, neighbors:['zambia','mozambique','south_africa']},
  mozambique:{name:'莫桑比克', stability:1, bg:'neutral', region:'africa', battleground:false, nx:575, ny:405, neighbors:['tanzania','zambia','rhodesia','south_africa','seaf']},
  south_africa:{name:'南非', stability:3, bg:'neutral', region:'africa', battleground:true, nx:555, ny:440, neighbors:['angola','rhodesia','mozambique','botswana']},
  botswana:{name:'博茨瓦纳', stability:2, bg:'neutral', region:'africa', battleground:false, nx:550, ny:425, neighbors:['south_africa','rhodesia','angola']},
  seaf:{name:'东南非', stability:1, bg:'neutral', region:'africa', battleground:false, nx:590, ny:430, neighbors:['mozambique','south_africa']},

  // Central America
  mexico:{name:'墨西哥', stability:2, bg:'neutral', region:'central_america', battleground:false, nx:195, ny:290, neighbors:['us','guatemala','cuba']},
  guatemala:{name:'危地马拉', stability:1, bg:'neutral', region:'central_america', battleground:false, nx:215, ny:320, neighbors:['mexico','el_salvador','honduras','cuba']},
  el_salvador:{name:'萨尔瓦多', stability:1, bg:'neutral', region:'central_america', battleground:false, nx:225, ny:328, neighbors:['guatemala','honduras','nicaragua']},
  honduras:{name:'洪都拉斯', stability:1, bg:'neutral', region:'central_america', battleground:false, nx:230, ny:322, neighbors:['guatemala','el_salvador','nicaragua','cuba']},
  nicaragua:{name:'尼加拉瓜', stability:1, bg:'neutral', region:'central_america', battleground:false, nx:240, ny:332, neighbors:['honduras','el_salvador','costa_rica','cuba']},
  costa_rica:{name:'哥斯达黎加', stability:2, bg:'neutral', region:'central_america', battleground:false, nx:248, ny:342, neighbors:['nicaragua','panama']},
  panama:{name:'巴拿马', stability:2, bg:'neutral', region:'central_america', battleground:true, nx:258, ny:352, neighbors:['costa_rica','colombia']},
  cuba:{name:'古巴', stability:3, bg:'neutral', region:'central_america', battleground:true, nx:235, ny:288, neighbors:['mexico','guatemala','honduras','nicaragua','haiti']},
  haiti:{name:'海地', stability:1, bg:'neutral', region:'central_america', battleground:false, nx:260, ny:290, neighbors:['cuba','dominican']},
  dominican:{name:'多米尼加', stability:1, bg:'neutral', region:'central_america', battleground:false, nx:272, ny:292, neighbors:['haiti','cuba']},

  // South America
  colombia:{name:'哥伦比亚', stability:2, bg:'neutral', region:'south_america', battleground:false, nx:270, ny:375, neighbors:['panama','venezuela','ecuador','brazil','peru']},
  venezuela:{name:'委内瑞拉', stability:2, bg:'neutral', region:'south_america', battleground:true, nx:290, ny:368, neighbors:['colombia','brazil','guyana','cuba']},
  guyana:{name:'圭亚那', stability:1, bg:'neutral', region:'south_america', battleground:false, nx:310, ny:370, neighbors:['venezuela','brazil','suriname']},
  suriname:{name:'苏里南', stability:1, bg:'neutral', region:'south_america', battleground:false, nx:322, ny:372, neighbors:['guyana','brazil','french_guiana']},
  french_guiana:{name:'法属圭亚那', stability:1, bg:'neutral', region:'south_america', battleground:false, nx:334, ny:374, neighbors:['suriname','brazil']},
  ecuador:{name:'厄瓜多尔', stability:2, bg:'neutral', region:'south_america', battleground:false, nx:272, ny:392, neighbors:['colombia','peru']},
  peru:{name:'秘鲁', stability:2, bg:'neutral', region:'south_america', battleground:false, nx:282, ny:410, neighbors:['ecuador','colombia','brazil','bolivia','chile']},
  brazil:{name:'巴西', stability:2, bg:'neutral', region:'south_america', battleground:true, nx:315, ny:405, neighbors:['venezuela','guyana','suriname','french_guiana','colombia','peru','bolivia','paraguay','argentina','uruguay']},
  bolivia:{name:'玻利维亚', stability:2, bg:'neutral', region:'south_america', battleground:false, nx:295, ny:425, neighbors:['peru','brazil','paraguay','argentina','chile']},
  chile:{name:'智利', stability:3, bg:'neutral', region:'south_america', battleground:true, nx:275, ny:450, neighbors:['peru','bolivia','argentina']},
  argentina:{name:'阿根廷', stability:2, bg:'neutral', region:'south_america', battleground:true, nx:295, ny:455, neighbors:['chile','bolivia','paraguay','brazil','uruguay']},
  paraguay:{name:'巴拉圭', stability:2, bg:'neutral', region:'south_america', battleground:false, nx:310, ny:438, neighbors:['bolivia','brazil','argentina']},
  uruguay:{name:'乌拉圭', stability:2, bg:'neutral', region:'south_america', battleground:false, nx:325, ny:455, neighbors:['brazil','argentina']},
  // 澳大利亚 - 简化放入东南亚
  australia:{name:'澳大利亚', stability:4, bg:'us', region:'se_asia', battleground:false, nx:820, ny:450, neighbors:['indonesia','malaysia']}
};

// 超级大国邻接关系（初始影响力放置）
const SUPERPOWER_LINKS = {
  us:  ['canada','mexico','cuba','uk','france','italy','west_germany','ukraine','japan','china'],
  ussr:['poland','east_germany','finland','turkey','iran','china','afghanistan','north_korea','india']
};

// 东欧/西欧分组
const EASTERN_EUROPE = ['poland','east_germany','czechoslovakia','hungary','yugoslavia','romania','bulgaria','finland'];
const WESTERN_EUROPE = ['canada','uk','france','west_germany','italy','norway','sweden','denmark','benelux','austria','greece','turkey','spain_pt'];
const SE_ASIA_COUNTRIES = ['vietnam','laos_cambodia','thailand','malaysia','indonesia','philippines','burma','australia'];
const MIDDLE_EAST = ['iran','iraq','syria','lebanon','jordan','israel','saudi','gulf_states','egypt','libya'];
const AFRICA_COUNTRIES = ['tunis','algeria','morocco','waf','ivory','mali','niger','chad','sudan','ethiopia','somalia','car','cameroon','nigeria','sahara','zaire','angola','zambia','tanzania','kenya','uganda','rhodesia','mozambique','south_africa','botswana','seaf'];
const CENTRAL_AMERICA = ['mexico','guatemala','el_salvador','honduras','nicaragua','costa_rica','panama','cuba','haiti','dominican'];
const SOUTH_AMERICA = ['colombia','venezuela','guyana','suriname','french_guiana','ecuador','peru','brazil','bolivia','chile','argentina','paraguay','uruguay'];
const ASIA_COUNTRIES = ['afghanistan','pakistan','india','china','north_korea','south_korea','japan','taiwan','burma'];

// 区域分组（用于结算）
const REGION_COUNTRIES = {
  europe:['canada','uk','france','west_germany','italy','norway','sweden','denmark','finland','benelux','austria','greece','turkey','spain_pt','east_germany','poland','czechoslovakia','hungary','yugoslavia','romania','bulgaria'],
  asia:['afghanistan','pakistan','india','china','north_korea','south_korea','japan','taiwan','burma'],
  se_asia:['laos_cambodia','vietnam','thailand','malaysia','indonesia','philippines','australia'],
  middle_east:MIDDLE_EAST,
  africa:AFRICA_COUNTRIES,
  central_america:CENTRAL_AMERICA,
  south_america:SOUTH_AMERICA
};

// 战地国列表
const BATTLEGROUNDS = Object.keys(COUNTRIES).filter(k => COUNTRIES[k].battleground);

/* ===== 卡牌数据 ===== */
/* side: us/ussr/neutral, ops: 0-4, period: early/mid/late */
const CARDS = [
  // ===== Early War (1-35, 103) =====
  {n:1, en:'Asia Scoring', zh:'亚洲计分', side:'neutral', ops:0, period:'early', scoring:'asia',
   text:'存在 3 / 支配 7 / 控制 9。控制战地国 +1 VP。不能保留。'},
  {n:2, en:'Europe Scoring', zh:'欧洲计分', side:'neutral', ops:0, period:'early', scoring:'europe',
   text:'存在 3 / 支配 7 / 控制 = 立即胜利。控制战地国 +1 VP。不能保留。'},
  {n:3, en:'Middle East Scoring', zh:'中东计分', side:'neutral', ops:0, period:'early', scoring:'middle_east',
   text:'存在 3 / 支配 5 / 控制 7。控制战地国 +1 VP。不能保留。'},
  {n:4, en:'Duck and Cover', zh:'卧倒并掩护', side:'us', ops:3, period:'early',
   text:'DEFCON -1。美方获得 (5 - DEFCON) VP。'},
  {n:5, en:'Five Year Plan', zh:'五年计划', side:'ussr', ops:3, period:'early',
   text:'苏联随机弃一张。若为美方事件则触发，否则弃掉。'},
  {n:6, en:'The China Card', zh:'中国牌', side:'neutral', ops:4, period:'early', china:true,
   text:'开局归苏联。全 Ops 用于亚洲 +1 Ops。打出后交给对手。'},
  {n:7, en:'Socialist Governments', zh:'社会主义政府', side:'ussr', ops:3, period:'early',
   text:'西欧共移除 3 点美方（每国≤2）。铁娘子后失效。'},
  {n:8, en:'Fidel', zh:'菲德尔', side:'ussr', ops:2, period:'early',
   text:'古巴清空美方，苏联控制。'},
  {n:9, en:'Vietnam Revolts', zh:'越南起义', side:'ussr', ops:2, period:'early',
   text:'越南 +2 苏联。本回合东南亚全 Ops +1 Ops。'},
  {n:10, en:'Blockade', zh:'封锁', side:'ussr', ops:1, period:'early',
   text:'美方弃 3+ Ops 或西德美方全清。'},
  {n:11, en:'Korean War', zh:'朝鲜战争', side:'ussr', ops:2, period:'early',
   text:'南韩邻国每美控掷骰 -1。4-6: +2 VP 替换，+2 军行。'},
  {n:12, en:'Romanian Abdication', zh:'罗马尼亚国王退位', side:'ussr', ops:1, period:'early',
   text:'罗马尼亚美方全清，苏联控制。'},
  {n:13, en:'Arab-Israeli War', zh:'阿以战争', side:'ussr', ops:2, period:'early',
   text:'以色列及邻国每美控掷骰 -1。4-6: +2 VP 替换，+2 军行。'},
  {n:14, en:'Comecon', zh:'经济互助委员会', side:'ussr', ops:3, period:'early',
   text:'4 个非美控东欧国各 +1 苏联。'},
  {n:15, en:'Nasser', zh:'纳赛尔', side:'ussr', ops:1, period:'early',
   text:'埃及 +2 苏联，美方减半（上取整）。'},
  {n:16, en:'Warsaw Pact Formed', zh:'华约成立', side:'ussr', ops:3, period:'early',
   text:'东欧美方全清 4 国，或东欧 +5 苏联（每国≤2）。允许北约打出。'},
  {n:17, en:'De Gaulle Leads France', zh:'戴高乐领导法国', side:'ussr', ops:3, period:'early',
   text:'法国 -2 美方 +1 苏联。取消北约对法国效果。'},
  {n:18, en:'Sputnik', zh:'斯普特尼克', side:'neutral', ops:1, period:'early', space:'ussr',
   text:'太空竞赛 +1 格。'},
  {n:19, en:'Truman Doctrine', zh:'杜鲁门主义', side:'us', ops:1, period:'early',
   text:'移除一个非苏控欧洲国的所有苏联影响力。'},
  {n:20, en:'Olympic Games', zh:'奥林匹克运动会', side:'neutral', ops:2, period:'early',
   text:'主办方 +2 掷骰，高者 +2 VP。或对手抵制 DEFCON -1，主办方用 4 Ops。'},
  {n:21, en:'NATO', zh:'北约', side:'us', ops:4, period:'early',
   text:'苏方无法对美控欧洲国政变/调整。美控欧洲免受小规模战争。'},
  {n:22, en:'Independent Reds', zh:'独立之红', side:'us', ops:2, period:'early',
   text:'南、罗、保、匈、捷之一，美方增至与苏联相等。'},
  {n:23, en:'Marshall Plan', zh:'马歇尔计划', side:'us', ops:4, period:'early',
   text:'7 个非苏控西欧国各 +1 美方。允许北约打出。'},
  {n:24, en:'Indo-Pakistani War', zh:'印巴战争', side:'neutral', ops:2, period:'early',
   text:'印度或巴基斯坦入侵。邻国每敌控掷骰 -1。4-6: +2 VP 替换，+2 军行。'},
  {n:25, en:'Containment', zh:'遏制政策', side:'us', ops:3, period:'early',
   text:'本回合美方全 Ops +1（上限 4）。'},
  {n:26, en:'CIA Created', zh:'中情局成立', side:'us', ops:1, period:'early',
   text:'苏联展示手牌。美方可用本卡 Ops。'},
  {n:27, en:'US/Japan Pact', zh:'美日安保条约', side:'us', ops:4, period:'early',
   text:'美方控制日本。苏方无法对日本政变/调整。'},
  {n:28, en:'Suez Crisis', zh:'苏伊士运河危机', side:'ussr', ops:3, period:'early',
   text:'移除英法以各 2 美方（不控制则不能移除）。'},
  {n:29, en:'East European Unrest', zh:'东欧动荡', side:'us', ops:3, period:'early',
   text:'早期 3 国各 -1 苏联；中后期 3 国各 -2。'},
  {n:30, en:'Decolonization', zh:'去殖民化', side:'ussr', ops:2, period:'early',
   text:'非洲/东南亚 4 国 +1 苏联。'},
  {n:31, en:'Red Scare/Purge', zh:'红色恐慌/大清洗', side:'neutral', ops:4, period:'early',
   text:'本回合对手全 Ops -1。'},
  {n:32, en:'UN Intervention', zh:'联合国干预', side:'neutral', ops:1, period:'early',
   text:'打出以取消对手刚打出的事件。'},
  {n:33, en:'De-Stalinization', zh:'去斯大林化', side:'ussr', ops:3, period:'early',
   text:'苏联 +4 影响力（每国≤2），非苏控欧洲国。'},
  {n:34, en:'Nuclear Test Ban', zh:'禁止核试验', side:'neutral', ops:4, period:'early',
   text:'DEFCON +1（上限 5）。'},
  {n:35, en:'Formosan Resolution', zh:'台湾决议案', side:'us', ops:2, period:'early',
   text:'台湾美控。若打出时台湾美控则 +1 VP。'},
  {n:103, en:'Defectors', zh:'叛逃者', side:'us', ops:2, period:'early',
   text:'若苏方本回合宣言，+1 VP。取消对手一个事件。'},

  // ===== Mid War (36-81) =====
  {n:36, en:'Brush War', zh:'小规模战争', side:'neutral', ops:3, period:'mid',
   text:'攻击稳定度 1-2 的国家。3-6: +1 VP 替换，+3 军行。'},
  {n:37, en:'Central America Scoring', zh:'中美计分', side:'neutral', ops:0, period:'mid', scoring:'central_america',
   text:'存在 1 / 支配 3 / 控制 5。控制战地国 +1 VP。不能保留。'},
  {n:38, en:'Southeast Asia Scoring', zh:'东南亚计分', side:'neutral', ops:0, period:'mid', scoring:'se_asia',
   text:'存在 1 / 支配 3 / 控制 5。不能保留。'},
  {n:39, en:'Arms Race', zh:'军备竞赛', side:'neutral', ops:3, period:'mid',
   text:'掷骰。1-3: 对手军行 +1；4-6: 己方军行 +2。'},
  {n:40, en:'Cuban Missile Crisis', zh:'古巴导弹危机', side:'ussr', ops:4, period:'mid',
   text:'DEFCON 降为 2。美方若本回合不打出事件则 +2 VP。'},
  {n:41, en:'Nuclear Subs', zh:'核潜艇', side:'us', ops:3, period:'mid',
   text:'本回合美方政变不降 DEFCON（Cuban Missile Crisis 除外）。'},
  {n:42, en:'Quagmire', zh:'越战泥潭', side:'ussr', ops:2, period:'mid',
   text:'美方若本回合打出事件，苏联 +1 VP；否则苏方弃牌。'},
  {n:43, en:'SALT Negotiations', zh:'限制战略武器条约', side:'neutral', ops:3, period:'mid',
   text:'DEFCON +1（上限 4）。双方各得 1 张牌。'},
  {n:44, en:'Bear Trap', zh:'熊陷阱', side:'ussr', ops:3, period:'mid',
   text:'美方若本回合打出事件，苏联 +1 VP；否则苏方弃牌。'},
  {n:45, en:'Summit', zh:'峰会', side:'neutral', ops:3, period:'mid',
   text:'掷骰 +2 高者 +2 VP。'},
  {n:46, en:'How I Learned to Stop Worrying', zh:'奇爱博士', side:'ussr', ops:3, period:'mid',
   text:'DEFCON -1，苏方 +(5-DEFCON) VP。'},
  {n:47, en:'Junta', zh:'军政府', side:'neutral', ops:3, period:'mid',
   text:'掷骰 1-3: 中南非 +2；4-6: 拉美 +2。'},
  {n:48, en:'Kitchen Debates', zh:'厨房辩论', side:'us', ops:3, period:'mid',
   text:'双方掷骰，高者 +1 VP，低者弃 1 张。'},
  {n:49, en:'Missile Envy', zh:'导弹狂热', side:'neutral', ops:3, period:'mid',
   text:'DEFCON +1（上限 4）。对手给 1 张牌，你给回同 Ops 牌。'},
  {n:50, en:'"We Will Bury You"', zh:'“我们要埋葬你们”', side:'ussr', ops:3, period:'mid',
   text:'DEFCON -1，苏方 +(5-DEFCON) VP。Cuban Missile Crisis 或 Glass House 后失效。'},
  {n:51, en:'Brezhnev Doctrine', zh:'勃列日涅夫主义', side:'ussr', ops:4, period:'mid',
   text:'本回合苏方全 Ops +1（上限 4）。'},
  {n:52, en:'Portuguese Empire Crumbles', zh:'葡萄牙帝国崩溃', side:'ussr', ops:3, period:'mid',
   text:'安哥拉、东南非各 +2 苏联。'},
  {n:53, en:'South African Unrest', zh:'南非动荡', side:'ussr', ops:2, period:'mid',
   text:'南非 +2 苏联，或南非 +1 及邻国 +2。'},
  {n:54, en:'Allende', zh:'阿连德', side:'ussr', ops:3, period:'mid',
   text:'智利 +2 苏联。'},
  {n:55, en:'Willy Brandt', zh:'维利·勃兰特', side:'ussr', ops:3, period:'mid',
   text:'苏方 +1 VP，西德 +1 苏联。取消北约对西德效果。'},
  {n:56, en:'Muslim Revolution', zh:'穆斯林革命', side:'ussr', ops:3, period:'mid',
   text:'以下 2 国清空美方：苏丹、伊朗、伊拉克、埃及、利比亚、沙特、叙利亚、约旦。'},
  {n:57, en:'ABM Treaty', zh:'反导条约', side:'neutral', ops:2, period:'mid',
   text:'DEFCON +1（上限 4）。'},
  {n:58, en:'Cultural Revolution', zh:'文化大革命', side:'ussr', ops:3, period:'mid',
   text:'若美方有中国牌，美方交苏方。'},
  {n:59, en:'Flower Power', zh:'花之力量', side:'ussr', ops:3, period:'mid',
   text:'本卡打出后，之后每个美方"战争"卡苏方 +2 VP。'},
  {n:60, en:'U2 Incident', zh:'U-2 事件', side:'ussr', ops:3, period:'mid',
   text:'苏方 +1 VP。若本回合联合国干预打出，再 +1 VP。'},
  {n:61, en:'OPEC', zh:'欧佩克', side:'ussr', ops:3, period:'mid',
   text:'苏方以下每控制 1 国 +1 VP：埃及、伊朗、利比亚、沙特、伊拉克、海湾国家、委内瑞拉。'},
  {n:62, en:'"Lone Gunman"', zh:'“独狼”', side:'ussr', ops:1, period:'mid',
   text:'美方展示手牌。苏方可用本卡 Ops。'},
  {n:63, en:'Colonial Rear Guards', zh:'殖民后卫', side:'us', ops:2, period:'mid',
   text:'非洲/东南亚 4 国各 +1 美方。'},
  {n:64, en:'Panama Canal Returned', zh:'巴拿马运河回归', side:'us', ops:1, period:'mid',
   text:'巴拿马、哥斯达黎加、委内瑞拉各 +1 美方。'},
  {n:65, en:'Camp David Accords', zh:'戴维营协议', side:'us', ops:2, period:'mid',
   text:'美方 +1 VP，以色列、约旦、埃及各 +1 美方。阿以战争失效。'},
  {n:66, en:'Puppet Governments', zh:'傀儡政府', side:'us', ops:2, period:'mid',
   text:'美方在无影响力的 3 国各 +1。'},
  {n:67, en:'Grain Sales to Soviets', zh:'粮食换和平', side:'us', ops:2, period:'mid',
   text:'美方从苏方手牌随机取 1 张，打出或归还。'},
  {n:68, en:'John Paul II Elected Pope', zh:'约翰·保罗二世当选', side:'us', ops:2, period:'mid',
   text:'波兰 -2 苏联 +1 美方。允许团结工会打出。'},
  {n:69, en:'Latin American Death Squads', zh:'拉美敢死队', side:'neutral', ops:2, period:'mid',
   text:'本回合主动方中美/南美政变 +1 掷骰，对手 -1。'},
  {n:70, en:'OAS Founded', zh:'美洲国家组织成立', side:'us', ops:2, period:'mid',
   text:'中美/南美共 +2 美方。'},
  {n:71, en:'Nixon Plays the China Card', zh:'尼克松打出中国牌', side:'us', ops:2, period:'mid',
   text:'若苏方有中国牌，苏方交美方。'},
  {n:72, en:'Sadat Expels Soviets', zh:'萨达特驱逐苏联', side:'us', ops:1, period:'mid',
   text:'埃及苏联全清，+1 美方。'},
  {n:73, en:'Shuttle Diplomacy', zh:'穿梭外交', side:'us', ops:3, period:'mid',
   text:'中东或亚洲结算时移除 1 个苏方战地国。'},
  {n:74, en:'The Voice of America', zh:'美国之音', side:'us', ops:2, period:'mid',
   text:'除非苏方弃 1 张，否则美方移除苏方 4 影响力。'},
  {n:75, en:'Liberation Theology', zh:'解放神学', side:'ussr', ops:3, period:'mid',
   text:'中美 3 国各 +1 苏联。'},
  {n:76, en:'Ussuri River Skirmish', zh:'珍宝岛事件', side:'us', ops:3, period:'mid',
   text:'若苏方控制中国，+1 VP 且中国牌归美方。'},
  {n:77, en:'"Ask Not What Your Country..."', zh:'“不要问国家能为你做什么”', side:'us', ops:3, period:'mid',
   text:'若 DEFCON ≤ 3，+2 VP。'},
  {n:78, en:'Alliance for Progress', zh:'进步联盟', side:'us', ops:3, period:'mid',
   text:'美方下列每控制 1 国 +1 VP：墨西哥、巴西、阿根廷、智利、委内瑞拉。'},
  {n:79, en:'Africa Scoring', zh:'非洲计分', side:'neutral', ops:0, period:'mid', scoring:'africa',
   text:'存在 3 / 支配 7 / 控制 9。控制战地国 +1 VP。不能保留。'},
  {n:80, en:'One Small Step', zh:'“一小步”', side:'neutral', ops:0, period:'mid', space:'us',
   text:'太空竞赛 +1 格。'},
  {n:81, en:'South America Scoring', zh:'南美计分', side:'neutral', ops:0, period:'mid', scoring:'south_america',
   text:'存在 3 / 支配 7 / 控制 9。不能保留。'},

  // ===== Late War (82-110) =====
  {n:82, en:'Iranian Hostage Crisis', zh:'伊朗人质危机', side:'us', ops:4, period:'late',
   text:'苏方 +2 VP。苏联本回合无法使用事件。'},
  {n:83, en:'The Iron Lady', zh:'铁娘子', side:'us', ops:3, period:'late',
   text:'苏方 +1 VP。英国 +1 美方。社会主义政府失效。'},
  {n:84, en:'Reagan Bombs Libya', zh:'里根轰炸利比亚', side:'us', ops:3, period:'late',
   text:'苏方 -1 VP。利比亚美方。'},
  {n:85, en:'Star Wars', zh:'星球大战', side:'us', ops:2, period:'late',
   text:'DEFCON +1（上限 4）。苏方 -1 VP。'},
  {n:86, en:'North Sea Oil', zh:'北海石油', side:'us', ops:3, period:'late',
   text:'美方下列每控制 1 国 +1 VP：英国、挪威、丹麦、比荷卢。'},
  {n:87, en:'The Reformer', zh:'改革者', side:'ussr', ops:3, period:'late',
   text:'苏联 +3 VP。'},
  {n:88, en:'Marine Barracks Bombing', zh:'贝鲁特兵营爆炸', side:'ussr', ops:4, period:'late',
   text:'苏方 +2 VP。若联合国干预打出，再 +1 VP。'},
  {n:89, en:'Soviets Shoot Down KAL-007', zh:'苏联击落 KAL-007', side:'ussr', ops:2, period:'late',
   text:'苏方 +1 VP。DEFCON -1。'},
  {n:90, en:'Glasnost', zh:'公开化', side:'ussr', ops:3, period:'late',
   text:'苏方 +1 VP。'},
  {n:91, en:'Ortega Elected in Nicaragua', zh:'奥尔特加当选', side:'ussr', ops:2, period:'late',
   text:'苏方 +1 VP。尼加拉瓜 +1 苏联。'},
  {n:92, en:'Terrorism', zh:'恐怖主义', side:'neutral', ops:2, period:'late',
   text:'对手 -1 VP。'},
  {n:93, en:'Iran-Contra Scandal', zh:'伊朗门', side:'ussr', ops:3, period:'late',
   text:'苏方 +1 VP。美方弃 2 张。'},
  {n:94, en:'Chernobyl', zh:'切尔诺贝利', side:'ussr', ops:3, period:'late',
   text:'苏方 -2 VP（历史事件，对苏联不利）。'},
  {n:95, en:'Latin American Debt Crisis', zh:'拉美债务危机', side:'ussr', ops:2, period:'late',
   text:'苏方 +2 VP。南美 2 国各 -1 美方。'},
  {n:96, en:'Tear Down this Wall', zh:'推倒这堵墙', side:'us', ops:3, period:'late',
   text:'苏方 -1 VP。德国美方 +1。'},
  {n:97, en:'"An Evil Empire"', zh:'“邪恶帝国”', side:'us', ops:4, period:'late',
   text:'苏方 +1 VP。取消花之力量。'},
  {n:98, en:'Aldrich Ames Remix', zh:'奥尔德里奇·艾姆斯', side:'ussr', ops:3, period:'late',
   text:'苏方 +1 VP。美方弃 1 张。'},
  {n:99, en:'Pershing II Deployed', zh:'潘兴 II 部署', side:'us', ops:4, period:'late',
   text:'美方 +1 VP。西欧 +2 美方。'},
  {n:100, en:'Wargames', zh:'核战演习', side:'neutral', ops:4, period:'late',
   text:'若 DEFCON ≤ 2，+2 VP 或 +3 VP。'},
  {n:101, en:'Solidarity', zh:'团结工会', side:'us', ops:3, period:'late',
   text:'波兰 +2 美方。苏方 -1 VP。'},
  {n:102, en:'Iran-Iraq War', zh:'两伊战争', side:'neutral', ops:2, period:'late',
   text:'掷骰 4-6: +2 VP 替换伊朗或伊拉克。'},
  {n:104, en:'The Cambridge Five', zh:'剑桥五杰', side:'ussr', ops:2, period:'late',
   text:'苏方 +2 VP。'},
  {n:105, en:'Special Relationship', zh:'特殊关系', side:'us', ops:2, period:'late',
   text:'美方 +2 VP。'},
  {n:106, en:'NORAD', zh:'北美防空司令部', side:'us', ops:3, period:'late',
   text:'DEFCON +1（上限 4）。美方政变 +1 掷骰。'},
  {n:107, en:'Che', zh:'切·格瓦拉', side:'ussr', ops:3, period:'late',
   text:'古巴 +1 苏联。苏方可在拉美 +1。'},
  {n:108, en:'Our Man in Tehran', zh:'我们在德黑兰的人', side:'us', ops:2, period:'late',
   text:'美方 +1 VP。伊朗 +1 美方。'},
  {n:109, en:'Yuri and Samantha', zh:'尤里与萨曼莎', side:'ussr', ops:2, period:'late',
   text:'苏方 +2 VP。'},
  {n:110, en:'AWACS Sale to Saudis', zh:'预警机售沙特', side:'us', ops:3, period:'late',
   text:'沙特 +2 美方。'}
];

// 按编号排序
CARDS.sort((a,b)=>a.n-b.n);

// 便捷索引
const CARD_BY_ID = {};
CARDS.forEach(c=>CARD_BY_ID[c.n]=c);

/* ===== 初始设置 ===== */
// 初始影响力分布 (开局的 4 个影响力)
const INITIAL_INFLUENCE = {
  us:{
    canada:3,
    // 剩余的 1 个可以在任意西德/法国等 4-5 稳定度国家
  },
  ussr:{
    poland:3,
  }
};
// 其实真正的 TS 开局: 美苏各在若干国家放 4 个影响力
// 简化: 美国在加拿大 3, 西德 1; 苏联在波兰 3, 东德 1
const INITIAL_SETUP = {
  us:  { canada:3, uk:1, france:1, west_germany:1, italy:1, mexico:1, haiti:1, china:1, japan:1 },
  ussr:{ poland:3, east_germany:1, czechoslovakia:1, hungary:1, yugoslavia:1, romania:1, bulgaria:1, north_korea:1 }
};

/* ===== 早期/中期/后期战争卡组 ===== */
const PERIOD_CARDS = {
  early:'early',
  mid:'mid',
  late:'late'
};

// 回合→时期映射
function getPeriod(turn){
  if(turn <= 3) return 'early';
  if(turn <= 7) return 'mid';
  return 'late';
}
function getPeriodName(p){
  return {early:'EARLY WAR', mid:'MID WAR', late:'LATE WAR'}[p] || 'EARLY WAR';
}

/* ===== 胜利判定 ===== */
const WIN_VP = 10;
const SPACE_MAX = 8;
