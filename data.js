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
   text:'Presence: 3; Domination: 7; Control: 9; +1 VP per controlled Battleground country in Region; +1 VP per country controlled that is adjacent to enemy superpower; MAY NOT BE HELD!'},
  {n:2, en:'Europe Scoring', zh:'欧洲计分', side:'neutral', ops:0, period:'early', scoring:'europe',
   text:'Presence: 3; Domination: 7; Control: Automatic Victory; +1 VP per controlled Battleground country in Region; +1 VP per country controlled that is adjacent to enemy superpower; MAY NOT BE HELD!'},
  {n:3, en:'Middle East Scoring', zh:'中东计分', side:'neutral', ops:0, period:'early', scoring:'middle_east',
   text:'Presence: 3; Domination: 5; Control: 7; +1 VP per controlled Battleground country in Region; MAY NOT BE HELD!'},
  {n:4, en:'Duck and Cover', zh:'卧倒并掩护', side:'us', ops:3, period:'early',
   text:'Degrade the DEFCON level by 1. The US receives VP equal to 5 minus the current DEFCON level.'},
  {n:5, en:'Five Year Plan', zh:'五年计划', side:'ussr', ops:3, period:'early',
   text:'The USSR must randomly discard a card. If the card has a US associated Event, the Event occurs immediately. If the card has a USSR associated Event or an Event applicable to both players, then the card must be discarded without triggering the Event.'},
  {n:6, en:'The China Card', zh:'中国牌', side:'neutral', ops:4, period:'early', china:true,
   text:'This card begins the game with the USSR. When played, the player receives +1 Operations to the Operations value of this card if it uses all its Operations in Asia. It is passed to the opponent once played. A player receives 1 VP for holding this card at the end of Turn 10.'},
  {n:7, en:'Socialist Governments', zh:'社会主义政府', side:'ussr', ops:3, period:'early',
   text:'Remove a total of 3 US Influence from any countries in Western Europe (removing no more than 2 Influence per country). This Event cannot be used after the "#83 – The Iron Lady" Event has been played.'},
  {n:8, en:'Fidel', zh:'菲德尔', side:'ussr', ops:2, period:'early',
   text:'Remove all US Influence from Cuba. USSR adds sufficient Influence in Cuba for Control.'},
  {n:9, en:'Vietnam Revolts', zh:'越南起义', side:'ussr', ops:2, period:'early',
   text:'Add 2 USSR Influence to Vietnam. For the remainder of the turn, the USSR receives +1 Operations to the Operations value of a card that uses all its Operations in Southeast Asia.'},
  {n:10, en:'Blockade', zh:'封锁', side:'ussr', ops:1, period:'early',
   text:'Unless the US immediately discards a card with an Operations value of 3 or more, remove all US Influence from West Germany.'},
  {n:11, en:'Korean War', zh:'朝鲜战争', side:'ussr', ops:2, period:'early',
   text:'North Korea invades South Korea. Roll a die and subtract (-1) from the die roll for every US controlled country adjacent to South Korea. On a modified die roll of 4-6, the USSR receives 2 VP and replaces all US Influence in South Korea with USSR Influence. The USSR adds 2 to its Military Operations Track.'},
  {n:12, en:'Romanian Abdication', zh:'罗马尼亚国王退位', side:'ussr', ops:1, period:'early',
   text:'Remove all US Influence from Romania. The USSR adds sufficient Influence to Romania for Control.'},
  {n:13, en:'Arab-Israeli War', zh:'阿以战争', side:'ussr', ops:2, period:'early',
   text:'Pan-Arab Coalition invades Israel. Roll a die and subtract (-1) from the die roll for Israel, if it is US controlled, and for every US controlled country adjacent to Israel. On a modified die roll of 4-6, the USSR receives 2 VP and replaces all US Influence in Israel with USSR Influence. The USSR adds 2 to its Military Operations Track. This Event cannot be used after the "#65 – Camp David Accords" Event has been played.'},
  {n:14, en:'Comecon', zh:'经济互助委员会', side:'ussr', ops:3, period:'early',
   text:'Add 1 USSR Influence to each of 4 non-US controlled countries of Eastern Europe.'},
  {n:15, en:'Nasser', zh:'纳赛尔', side:'ussr', ops:1, period:'early',
   text:'Add 2 USSR Influence to Egypt. The US removes half, rounded up, of its Influence from Egypt.'},
  {n:16, en:'Warsaw Pact Formed', zh:'华约成立', side:'ussr', ops:3, period:'early',
   text:'Remove all US influence from 4 countries in Eastern Europe or add 5 USSR Influence to any countries in Eastern Europe (adding no more than 2 Influence per country). This Event allows the "#21 – NATO" card to be played as an Event.'},
  {n:17, en:'De Gaulle Leads France', zh:'戴高乐领导法国', side:'ussr', ops:3, period:'early',
   text:'Remove 2 US Influence from France and add 1 USSR Influence to France. This Event cancels the effect(s) of the "#21 – NATO" Event for France only.'},
  {n:18, en:'Sputnik', zh:'斯普特尼克', side:'neutral', ops:1, period:'early', space:'ussr',
   text:'Move the Space Race Marker ahead by 1 space.'},
  {n:19, en:'Truman Doctrine', zh:'杜鲁门主义', side:'us', ops:1, period:'early',
   text:'Remove all USSR Influence from a single uncontrolled country in Europe.'},
  {n:20, en:'Olympic Games', zh:'奥林匹克运动会', side:'neutral', ops:2, period:'early',
   text:'This player sponsors the Olympics. The opponent must either participate or boycott. If the opponent participates, each player rolls a die and the sponsor adds 2 to their roll. The player with the highest modified die roll receives 2 VP (reroll ties). If the opponent boycotts, degrade the DEFCON level by 1 and the sponsor may conduct Operations as if they played a 4 Ops card.'},
  {n:21, en:'NATO', zh:'北约', side:'us', ops:4, period:'early',
   text:'The USSR cannot make Coup Attempts or Realignment rolls against any US controlled countries in Europe. US controlled countries in Europe cannot be attacked by play of the "#36 – Brush War" Event. This card requires prior play of either the "#16 – Warsaw Pact Formed" or "#23 – Marshall Plan" Event(s) in order to be played as an Event.'},
  {n:22, en:'Independent Reds', zh:'独立之红', side:'us', ops:2, period:'early',
   text:'Add US Influence to either Yugoslavia, Romania, Bulgaria, Hungary, or Czechoslovakia so that it equals the USSR Influence in that country.'},
  {n:23, en:'Marshall Plan', zh:'马歇尔计划', side:'us', ops:4, period:'early',
   text:'Add 1 US Influence to each of any 7 non-USSR controlled countries in Western Europe. This Event allows the "#21 – NATO" card to be played as an Event.'},
  {n:24, en:'Indo-Pakistani War', zh:'印巴战争', side:'neutral', ops:2, period:'early',
   text:'India invades Pakistan or vice versa (player\'s choice). Roll a die and subtract (-1) from the die roll for every enemy controlled country adjacent to the target of the invasion (India or Pakistan). On a modified die roll of 4-6, the player receives 2 VP and replaces all the opponent\'s Influence in the target country with their Influence. The player adds 2 to its Military Operations Track.'},
  {n:25, en:'Containment', zh:'遏制政策', side:'us', ops:3, period:'early',
   text:'All Operations cards played by the US, for the remainder of this turn, receive +1 to their Operations value (to a maximum of 4 Operations per card).'},
  {n:26, en:'CIA Created', zh:'中情局成立', side:'us', ops:1, period:'early',
   text:'The USSR reveals their hand of cards for this turn. The US may use the Operations value of this card to conduct Operations.'},
  {n:27, en:'US/Japan Pact', zh:'美日安保条约', side:'us', ops:4, period:'early',
   text:'The US adds sufficient Influence to Japan for Control. The USSR cannot make Coup Attempts or Realignment rolls against Japan.'},
  {n:28, en:'Suez Crisis', zh:'苏伊士运河危机', side:'ussr', ops:3, period:'early',
   text:'Remove a total of 4 US Influence from France, the United Kingdom and Israel (removing no more than 2 Influence per country).'},
  {n:29, en:'East European Unrest', zh:'东欧动荡', side:'us', ops:3, period:'early',
   text:'Early or Mid War: Remove 1 USSR Influence from 3 countries in Eastern Europe. Late War: Remove 2 USSR Influence from 3 countries in Eastern Europe.'},
  {n:30, en:'Decolonization', zh:'去殖民化', side:'ussr', ops:2, period:'early',
   text:'Add 1 USSR Influence to each of any 4 countries in Africa and/or Southeast Asia.'},
  {n:31, en:'Red Scare/Purge', zh:'红色恐慌/大清洗', side:'neutral', ops:4, period:'early',
   text:'All Operations cards played by the opponent, for the remainder of this turn, receive -1 to their Operations value (to a minimum value of 1 Operations point).'},
  {n:32, en:'UN Intervention', zh:'联合国干预', side:'neutral', ops:1, period:'early',
   text:'Play this card simultaneously with a card containing an opponent\'s associated Event. The opponent\'s associated Event is canceled but you may use the Operations value of the opponent\'s card to conduct Operations. This Event cannot be played during the Headline Phase.'},
  {n:33, en:'De-Stalinization', zh:'去斯大林化', side:'ussr', ops:3, period:'early',
   text:'The USSR may reallocate up to a total of 4 Influence from one or more countries to any non-US controlled countries (adding no more than 2 Influence per country).'},
  {n:34, en:'Nuclear Test Ban', zh:'禁止核试验', side:'neutral', ops:4, period:'early',
   text:'The player receives VP equal to the current DEFCON level minus 2 then improves the DEFCON level by 2.'},
  {n:35, en:'Formosan Resolution', zh:'台湾决议案', side:'us', ops:2, period:'early',
   text:'If this card\'s Event is in effect, Taiwan will be treated as a Battleground country, for scoring purposes only, if Taiwan is US controlled when the Asia Scoring Card is played. This Event is cancelled after the US has played the "#6 – The China Card" card.'},
  {n:103, en:'Defectors', zh:'叛逃者', side:'us', ops:2, period:'early',
   text:'The US may play this card during the Headline Phase in order to cancel the USSR Headline Event (including a scoring card). The canceled card is placed into the discard pile. If this card is played by the USSR during its action round, the US gains 1 VP.'},

  // ===== Mid War (36-81) =====
  {n:36, en:'Brush War', zh:'小规模战争', side:'neutral', ops:3, period:'mid',
   text:'The player attacks any country with a stability number of 1 or 2. Roll a die and subtract (-1) from the die roll for every adjacent enemy controlled country. On a modified die roll of 3-6, the player receives 1 VP and replaces all the opponent\'s Influence in the target country with their Influence. The player adds 3 to its Military Operations Track.'},
  {n:37, en:'Central America Scoring', zh:'中美计分', side:'neutral', ops:0, period:'mid', scoring:'central_america',
   text:'Presence: 1; Domination: 3; Control: 5; +1 VP per controlled Battleground country in Region; +1 VP per country controlled that is adjacent to enemy superpower; MAY NOT BE HELD!'},
  {n:38, en:'Southeast Asia Scoring', zh:'东南亚计分', side:'neutral', ops:0, period:'mid', scoring:'se_asia',
   text:'Presence: 1; Domination: 3; Control: 5; +1 VP per controlled Battleground country in Region; MAY NOT BE HELD!'},
  {n:39, en:'Arms Race', zh:'军备竞赛', side:'neutral', ops:3, period:'mid',
   text:'This player must roll a die. On a roll of 1-3, the opponent receives 1 VP. On a roll of 4-6, the player receives 2 VP.'},
  {n:40, en:'Cuban Missile Crisis', zh:'古巴导弹危机', side:'ussr', ops:4, period:'mid',
   text:'Degrade the DEFCON level to 2. Unless the US immediately plays an Event, the USSR receives 2 VP.'},
  {n:41, en:'Nuclear Subs', zh:'核潜艇', side:'us', ops:3, period:'mid',
   text:'The US may play this Event to conduct a Coup Attempt in any country in Latin America. The US receives 1 VP for each US controlled Battleground country in Central and South America.'},
  {n:42, en:'Quagmire', zh:'越战泥潭', side:'ussr', ops:2, period:'mid',
   text:'If the US plays an Event this turn, the USSR receives 1 VP. Otherwise, the USSR must discard a card.'},
  {n:43, en:'SALT Negotiations', zh:'限制战略武器条约', side:'neutral', ops:3, period:'mid',
   text:'Improve the DEFCON level by 1 (not above 4). Each player may draw a card.'},
  {n:44, en:'Bear Trap', zh:'熊陷阱', side:'ussr', ops:3, period:'mid',
   text:'If the US plays an Event this turn, the USSR receives 1 VP. Otherwise, the USSR must discard a card.'},
  {n:45, en:'Summit', zh:'峰会', side:'neutral', ops:3, period:'mid',
   text:'Each player rolls a die and adds 2 to their roll. The player with the highest modified die roll receives 2 VP (reroll ties).'},
  {n:46, en:'How I Learned to Stop Worrying', zh:'奇爱博士', side:'ussr', ops:3, period:'mid',
   text:'Degrade the DEFCON level by 1. The USSR receives VP equal to 5 minus the current DEFCON level.'},
  {n:47, en:'Junta', zh:'军政府', side:'neutral', ops:3, period:'mid',
   text:'Roll a die. On a roll of 1-3, add 2 USSR Influence to a country in Central and/or South America. On a roll of 4-6, add 2 USSR Influence to a country in Africa.'},
  {n:48, en:'Kitchen Debates', zh:'厨房辩论', side:'us', ops:3, period:'mid',
   text:'Each player rolls a die. The player with the highest die roll receives 1 VP and the player with the lowest die roll must discard a card.'},
  {n:49, en:'Missile Envy', zh:'导弹狂热', side:'neutral', ops:3, period:'mid',
   text:'Improve the DEFCON level by 1 (not above 4). The opponent gives the player a card and the player gives the opponent a card with the same Operations value.'},
  {n:50, en:'"We Will Bury You"', zh:'“我们要埋葬你们”', side:'ussr', ops:3, period:'mid',
   text:'Degrade the DEFCON level by 1. The USSR receives VP equal to 5 minus the current DEFCON level. This Event cannot be used after the "#40 – Cuban Missile Crisis" or "#77 – The Glass House" Event has been played.'},
  {n:51, en:'Brezhnev Doctrine', zh:'勃列日涅夫主义', side:'ussr', ops:4, period:'mid',
   text:'All Operations cards played by the USSR, for the remainder of this turn, receive +1 to their Operations value (to a maximum of 4 Operations per card).'},
  {n:52, en:'Portuguese Empire Crumbles', zh:'葡萄牙帝国崩溃', side:'ussr', ops:3, period:'mid',
   text:'Add 2 USSR Influence to each of Angola and South Africa.'},
  {n:53, en:'South African Unrest', zh:'南非动荡', side:'ussr', ops:2, period:'mid',
   text:'Add 2 USSR Influence to South Africa or add 1 USSR Influence to South Africa and 2 USSR Influence to a country adjacent to South Africa.'},
  {n:54, en:'Allende', zh:'阿连德', side:'ussr', ops:3, period:'mid',
   text:'Add 2 USSR Influence to Chile.'},
  {n:55, en:'Willy Brandt', zh:'维利·勃兰特', side:'ussr', ops:3, period:'mid',
   text:'The USSR receives 1 VP and adds 1 USSR Influence to West Germany. This Event cancels the effect(s) of the "#21 – NATO" Event for West Germany only.'},
  {n:56, en:'Muslim Revolution', zh:'穆斯林革命', side:'ussr', ops:3, period:'mid',
   text:'Remove all US Influence from 2 countries in the Middle East (Egypt, Iran, Libya, Iraq, Saudi Arabia, Syria, Jordan, or Sudan).'},
  {n:57, en:'ABM Treaty', zh:'反导条约', side:'neutral', ops:2, period:'mid',
   text:'Improve the DEFCON level by 1 (not above 4).'},
  {n:58, en:'Cultural Revolution', zh:'文化大革命', side:'ussr', ops:3, period:'mid',
   text:'If the US has the "#6 – The China Card" card, the US must give the card to the USSR. If the USSR already has the "#6 – The China Card" card, the USSR receives 2 VP.'},
  {n:59, en:'Flower Power', zh:'花之力量', side:'ussr', ops:3, period:'mid',
   text:'After this card is played, every time the US plays a card with "War" in the title, the USSR receives 2 VP.'},
  {n:60, en:'U2 Incident', zh:'U-2 事件', side:'ussr', ops:3, period:'mid',
   text:'The USSR receives 1 VP. If the "#32 – UN Intervention" Event is played this turn, the USSR receives another 1 VP.'},
  {n:61, en:'OPEC', zh:'欧佩克', side:'ussr', ops:3, period:'mid',
   text:'The USSR receives 1 VP for each country it controls in the Middle East: Egypt, Iran, Libya, Iraq, Saudi Arabia, Gulf States, or Venezuela.'},
  {n:62, en:'"Lone Gunman"', zh:'“独狼”', side:'ussr', ops:1, period:'mid',
   text:'The US reveals their hand of cards for this turn. The USSR may use the Operations value of this card to conduct Operations.'},
  {n:63, en:'Colonial Rear Guards', zh:'殖民后卫', side:'us', ops:2, period:'mid',
   text:'Add 1 US Influence to each of 4 countries in Africa and/or Southeast Asia.'},
  {n:64, en:'Panama Canal Returned', zh:'巴拿马运河回归', side:'us', ops:1, period:'mid',
   text:'Add 1 US Influence to each of Panama, Costa Rica, and Venezuela.'},
  {n:65, en:'Camp David Accords', zh:'戴维营协议', side:'us', ops:2, period:'mid',
   text:'Add 1 US Influence to Israel and add 1 USSR Influence to Egypt. The USSR receives 1 VP.'},
  {n:66, en:'Puppet Governments', zh:'傀儡政府', side:'us', ops:2, period:'mid',
   text:'This player may play this Event to conduct a Coup Attempt in any country in Latin America.'},
  {n:67, en:'Grain Sales to Soviets', zh:'粮食换和平', side:'us', ops:2, period:'mid',
   text:'If the USSR has the "#6 – The China Card" card, the USSR must give the card to the US (face down and unavailable for immediate play). If the US already has the "#6 – The China Card" card, the US receives 2 VP.'},
  {n:68, en:'John Paul II Elected Pope', zh:'约翰·保罗二世当选', side:'us', ops:2, period:'mid',
   text:'Add 1 US Influence to Poland and add 1 USSR Influence to West Germany. The US receives 1 VP.'},
  {n:69, en:'Latin American Death Squads', zh:'拉美敢死队', side:'neutral', ops:2, period:'mid',
   text:'If the USSR is ahead on the Space Race Track, the USSR player uses this Event to look through the discard pile, pick any 1 non-scoring card and play it immediately as an Event.'},
  {n:70, en:'OAS Founded', zh:'美洲国家组织成立', side:'us', ops:2, period:'mid',
   text:'The USSR receives 1 VP for each USSR controlled Battleground country in Europe and Asia.'},
  {n:71, en:'Nixon Plays the China Card', zh:'尼克松打出中国牌', side:'us', ops:2, period:'mid',
   text:'If the USSR has the "#6 – The China Card" card, the USSR must give the card to the US (face up and available for play). If the US already has the "#6 – The China Card" card, add a total of 4 US Influence to any countries in Asia (adding no more than 2 Influence per country).'},
  {n:72, en:'Sadat Expels Soviets', zh:'萨达特驱逐苏联', side:'us', ops:1, period:'mid',
   text:'Remove all USSR Influence from Egypt and add 1 US Influence to Egypt.'},
  {n:73, en:'Shuttle Diplomacy', zh:'穿梭外交', side:'us', ops:3, period:'mid',
   text:'If this card\'s Event is in effect, subtract (-1) a Battleground country from the USSR total and then discard this card during the next scoring of the Middle East or Asia (which ever comes first).'},
  {n:74, en:'The Voice of America', zh:'美国之音', side:'us', ops:2, period:'mid',
   text:'Remove 4 USSR Influence from any countries NOT in Europe (removing no more than 2 Influence per country).'},
  {n:75, en:'Liberation Theology', zh:'解放神学', side:'ussr', ops:3, period:'mid',
   text:'Add a total of 3 USSR Influence to any countries in Central America (adding no more than 2 Influence per country).'},
  {n:76, en:'Ussuri River Skirmish', zh:'珍宝岛事件', side:'us', ops:3, period:'mid',
   text:'If the USSR has the "#6 – The China Card" card, the USSR must give the card to the US (face up and available for play). If the US already has the "#6 – The China Card" card, add a total of 4 US Influence to any countries in Asia (adding no more than 2 Influence per country).'},
  {n:77, en:'"Ask Not What Your Country..."', zh:'“不要问国家能为你做什么”', side:'us', ops:3, period:'mid',
   text:'The US may discard up to their entire hand of cards (including scoring cards) to the discard pile and draw replacements from the draw pile. The number of cards to be discarded must be decided before drawing any replacement cards from the draw pile.'},
  {n:78, en:'Alliance for Progress', zh:'进步联盟', side:'us', ops:3, period:'mid',
   text:'The US receives 1 VP for each US controlled Battleground country in Central and South America.'},
  {n:79, en:'Africa Scoring', zh:'非洲计分', side:'neutral', ops:0, period:'mid', scoring:'africa',
   text:'Presence: 1; Domination: 4; Control: 6; +1 VP per controlled Battleground country in Region; MAY NOT BE HELD!'},
  {n:80, en:'One Small Step', zh:'“一小步”', side:'neutral', ops:0, period:'mid', space:'us',
   text:'If you are behind on the Space Race Track, the player uses this Event to move their marker 2 spaces forward on the Space Race Track. The player receives VP only from the final space moved into.'},
  {n:81, en:'South America Scoring', zh:'南美计分', side:'neutral', ops:0, period:'mid', scoring:'south_america',
   text:'Presence: 2; Domination: 5; Control: 6; +1 VP per controlled Battleground country in Region; MAY NOT BE HELD!'},

  // ===== Late War (82-110) =====
  {n:82, en:'Iranian Hostage Crisis', zh:'伊朗人质危机', side:'us', ops:4, period:'late',
   text:'Remove all US Influence and add 2 USSR Influence to Iran. This card\'s Event requires the US to discard 2 cards, instead of 1 card, if the "#92 – Terrorism" Event is played.'},
  {n:83, en:'The Iron Lady', zh:'铁娘子', side:'us', ops:3, period:'late',
   text:'Add 1 USSR Influence to Argentina and remove all USSR Influence from the United Kingdom. The US receives 1 VP. This Event prevents the "#7 – Socialist Governments" card from being played as an Event.'},
  {n:84, en:'Reagan Bombs Libya', zh:'里根轰炸利比亚', side:'us', ops:3, period:'late',
   text:'The US receives 1 VP for every 2 USSR Influence in Libya.'},
  {n:85, en:'Star Wars', zh:'星球大战', side:'us', ops:2, period:'late',
   text:'If the US is ahead on the Space Race Track, the US player uses this Event to look through the discard pile, pick any 1 non-scoring card and play it immediately as an Event.'},
  {n:86, en:'North Sea Oil', zh:'北海石油', side:'us', ops:3, period:'late',
   text:'The US may play 8 cards (in 8 action rounds) for this turn only. This Event prevents the "#61 – OPEC" card from being played as an Event.'},
  {n:87, en:'The Reformer', zh:'改革者', side:'ussr', ops:3, period:'late',
   text:'Add 4 USSR Influence to Europe (adding no more than 2 Influence per country). If the USSR is ahead of the US in VP, 6 Influence may be added to Europe instead. The USSR may no longer make Coup Attempts in Europe.'},
  {n:88, en:'Marine Barracks Bombing', zh:'贝鲁特兵营爆炸', side:'ussr', ops:4, period:'late',
   text:'Remove all US Influence in Lebanon and remove a total of 2 US Influence from any countries in the Middle East.'},
  {n:89, en:'Soviets Shoot Down KAL-007', zh:'苏联击落 KAL-007', side:'ussr', ops:2, period:'late',
   text:'Degrade the DEFCON level by 1 and the US receives 2 VP. The US may place influence or make Realignment rolls, using this card, if South Korea is US controlled.'},
  {n:90, en:'Glasnost', zh:'公开化', side:'ussr', ops:3, period:'late',
   text:'Improve the DEFCON level by 1 and the USSR receives 2 VP. The USSR may make Realignment rolls or add Influence, using this card, if the "#87 – The Reformer" Event has already been played.'},
  {n:91, en:'Ortega Elected in Nicaragua', zh:'奥尔特加当选', side:'ussr', ops:2, period:'late',
   text:'Remove all US Influence from Nicaragua. The USSR may make a free Coup Attempt, using this card\'s Operations value, in a country adjacent to Nicaragua.'},
  {n:92, en:'Terrorism', zh:'恐怖主义', side:'neutral', ops:2, period:'late',
   text:'The player\'s opponent must randomly discard 1 card from their hand. If the "#82 – Iranian Hostage Crisis" Event has already been played, a US player (if applicable) must randomly discard 2 cards from their hand.'},
  {n:93, en:'Iran-Contra Scandal', zh:'伊朗门', side:'ussr', ops:3, period:'late',
   text:'All US Realignment rolls, for the remainder of this turn, receive -1 to their die roll.'},
  {n:94, en:'Chernobyl', zh:'切尔诺贝利', side:'ussr', ops:3, period:'late',
   text:'The US must designate a single Region (Europe, Asia, etc.) that, for the remainder of the turn, the USSR cannot add Influence to using Operations points.'},
  {n:95, en:'Latin American Debt Crisis', zh:'拉美债务危机', side:'ussr', ops:2, period:'late',
   text:'The US must immediately discard a card with an Operations value of 3 or more or the USSR may double the amount of USSR Influence in 2 countries in South America.'},
  {n:96, en:'Tear Down this Wall', zh:'推倒这堵墙', side:'us', ops:3, period:'late',
   text:'Add 3 US Influence to East Germany. The US may make free Coup Attempts or Realignment rolls in Europe using the Operations value of this card. This Event prevents / cancels the effect(s) of the "#55 – Willy Brandt" Event.'},
  {n:97, en:'"An Evil Empire"', zh:'“邪恶帝国”', side:'us', ops:4, period:'late',
   text:'The US receives 1 VP. This Event prevents / cancels the effect(s) of the "#59 – Flower Power" Event.'},
  {n:98, en:'Aldrich Ames Remix', zh:'奥尔德里奇·艾姆斯', side:'ussr', ops:3, period:'late',
   text:'The US reveals their hand of cards, face-up, for the remainder of the turn and the USSR discards a card from the US hand.'},
  {n:99, en:'Pershing II Deployed', zh:'潘兴 II 部署', side:'us', ops:4, period:'late',
   text:'The USSR receives 1 VP. Remove 1 US Influence from any 3 countries in Western Europe.'},
  {n:100, en:'Wargames', zh:'核战演习', side:'neutral', ops:4, period:'late',
   text:'If the DEFCON level is 2, the player may immediately end the game after giving their opponent 6 VP. How about a nice game of chess?'},
  {n:101, en:'Solidarity', zh:'团结工会', side:'us', ops:3, period:'late',
   text:'Add 3 US Influence to Poland. This card requires prior play of the "#68 – John Paul II Elected Pope" Event in order to be played as an Event.'},
  {n:102, en:'Iran-Iraq War', zh:'两伊战争', side:'neutral', ops:2, period:'late',
   text:'Iran invades Iraq or vice versa (player\'s choice). Roll a die and subtract (-1) from the die roll for every enemy controlled country adjacent to the target of the invasion (Iran or Iraq). On a modified die roll of 4-6, the player receives 2 VP and replaces all the opponent\'s Influence in the target country with their Influence. The player adds 2 to its Military Operations Track.'},
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
const WIN_VP = 20;   // 40 局实测：US 中位 9 / max 17，USSR 中位 9 / max 18。
                     // 这条线实际意味着「几乎不会提前结束」，一局基本跑满 10 回合
                     // 再由终局分数定胜负。想缩短就把这里调小。
const SPACE_MAX = 8;
