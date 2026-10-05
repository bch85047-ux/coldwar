# 冷战热斗 · IRON CURTAIN

纯前端可玩的《Twilight Struggle / 冷战热斗》网页版。零依赖，无 CDN，无构建步骤 —— 打开 `index.html` 就能玩。

全 JS 手写，无 React/Vue。代码量 **4374 行**，14 个文件，204 KB。

## 快速部署（GitHub Pages）

仓库已 `git init` + commit 完成，你只需要两步：

    cd coldwar
    git remote add origin git@github.com:你的用户名/coldwar.git
    git push -u origin main

然后 GitHub 仓库 → Settings → Pages → Source 选 **Deploy from branch**，分支 `main`、目录 `/ (root)`。

或者跑脚本：`sh deploy.sh 你的用户名/coldwar`。详见 [DEPLOY.md](DEPLOY.md)。

## 玩法

- **双人同屏（Hotseat）**：一台设备轮流操作
- **人机对战（vs AI）**：你选阵营，AI 打另一边
- 回合制 10 回合，早期战争 → 危机战争 → 冷战晚期
- 三选一出牌：**事件 / 操作 / 太空竞赛**
- DEFCON 打到 1 = 核战互相毁灭
- VP 先到 10 获胜；控制欧洲 = 立即胜利

### 出牌流程
1. 点击底部手牌里的牌
2. 屏幕中央弹出大卡 + 四个拖放区
3. 把卡片拖到 **事件** / **操作** / **太空竞赛** / **取消**
4. 选「操作」后地图上的国家格子会亮起来，点格子放置影响力（消耗 Ops）
5. 政变、调整（Realign）在对应区点击

## 文件结构

```
index.html      页面骨架
style.css       全部样式（深墨蓝 + 牛皮纸卡 + 苏红美蓝）
data.js         114 张真实卡牌 + 国家数据 + 区域 + 邻接 + 地图坐标
map.js          SVG 世界地图（手绘大陆板块）
engine.js       游戏引擎：影响力、区域结算、DEFCON、胜利判定、卡牌效果
ui.js           渲染层：手牌、地图格子、VP 盘、太空竞赛、日志、中央卡牌
fx.js           Canvas 粒子特效（爆炸/曳光/核爆/火箭）+ Web Audio 音效
music.js        背景乐：加载原曲 mp3 + 黑胶"做旧"处理
main.js         主控：出牌流程、操作结算、AI、回合推进
fetch_music.sh  原曲下载脚本
assets/music/   放 us.mp3 和 ussr.mp3
```

## 原曲（必须原曲）

目标曲目：
- **美国**：*In the Moonlight*（Helen Kane, 1928）
- **苏联**：*В далёкой Маньчжурии*（Izy Vekslern, 1945）

放进：

```
assets/music/us.mp3      ← 美国主题
assets/music/ussr.mp3    ← 苏联主题
```

文件名必须是这两个，或者直接在 `music.js` 顶部 `SOURCES` 里改路径。

下载脚本（archive.org 限流时可能失败，失败就手动下）：

```sh
sh fetch_music.sh
```

**没有 mp3 也能玩**：`music.js` 会自动切到 Web Audio 合成的兜底旋律，音色是黑胶做旧风格。放好 mp3 后刷新页面，右上角音乐按钮下方会显示 `原曲` / `合成` 状态。

"做旧"处理（永远生效，有 mp3 时叠加）：
- 黑胶底噪 + 随机噼啪爆音
- 老唱针共振音染（低通 + 谐振峰）
- ±0.6% 速度抖动（转速不稳）
- 轻微降调 + 高切（磁带/78转质感）
- 立体声收窄（模拟单声道）

## 部署

### 本地（最快）

```sh
cd coldwar
python3 -m http.server 8080
# 浏览器打开 http://localhost:8080/
```

也可以直接双击 `index.html`（file:// 协议可用，mp3 加载需要 http 服务）。

### GitHub Pages

```sh
cd coldwar
git init
git add -A
git commit -m "cold war game"
git branch -M main
git remote add origin git@github.com:YOURNAME/coldwar.git
git push -u origin main
```

然后仓库 Settings → Pages → Branch 选 `main` / `/ (root)` → Save。
约 1 分钟后可访问：`https://YOURNAME.github.io/coldwar/`

`assets/music/` 里的 mp3 一起 push 上去即可（GitHub 单文件上限 100MB）。

### 局域网

```sh
ip addr            # 找你的内网 IP
python3 -m http.server 8080
# 手机浏览器打开 http://192.168.x.x:8080/
```

## 规则说明（页面内 Rules 按钮）

实现了 Twilight Struggle 的简化版规则：

- 每回合主动方先抽 1 张，然后两家各抽 1 张
- 每回合每家出 1 张牌，三选一模式
- 区域计分：存在 / 支配 / 控制，控制战地国 +1 VP
- 欧洲控制 = 立即胜利
- 军事行动（在敌方相邻的战斗国放影响力）→ DEFCON -1
- DEFCON 1 = 核战平局
- 太空竞赛推进到 8 = 该方胜利
- 第 4 回合加入中期战争卡组，第 8 回合加入晚期战争卡组
- VP 达到 10 获胜

### 已实现的卡牌效果（部分）

早期战争：卧倒并掩护、五年计划、中国牌、马歇尔计划、北约、遏制、独立派、杜鲁门主义、朝鲜战争、古巴导弹危机…
中期战争：柏林墙、太空竞赛、越战升级、布拉格之春…
晚期战争：戈尔巴乔夫、核冬天、柏林墙倒塌…

未标注效果的卡按通用规则处理（事件 = 无效果的 Ops 消耗，或按编号 fallback）。

## 已知限制

- AI 是启发式的，不是完整规则引擎；hard 难度更接近规则，easy 会随机
- 部分复杂卡牌效果（如中国牌传递、NATO 限制政变）只做了简化处理
- 地图是手绘风格化板块，不是精确地理投影
- 触屏支持基础点击，拖放区域也支持点击选择

## 音效与音乐开关

顶部栏两个按钮：
- **♪ 音乐** — 背景乐开关（自动跟随当前主动方切换主题）
- **FX** — 特效 + 音效开关

## 键盘

- 无强制键盘操作，全程鼠标 / 触屏

---

纯原生 HTML/CSS/JS，总代码量约 3200 行。没有框架，没有构建工具，没有第三方依赖。
