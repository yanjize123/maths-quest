# 场景与事件：怎么加（P-20261126-maths-game，机制 v1）

只改两个 JSON；改完运行 `node tests/test_events.js`（秒级），全过即可上线。画法 `mq_scene.js`、执行器 `mq_events.js` 不用动。

## 加一个场景（content/scenes.json → scenes）
一行：`"volcano": { "en": "...", "zh": "...", "sky": [上色, 下色], "ground": 地面色, "hue": [-20, 20], "particles": "stars|snow|bubbles|leaves|ash", "decor": [装饰名…], "n": [最少, 最多], "money": {"en","zh"} }`
每次进入自动随机：色相（hue 范围内）、早/黄昏/夜、装饰挑选与大小。

## 加一个装饰（scenes.json → sprites）
40×40 坐标的一小段 SVG；`{c}` = 随机主色，`{d}` = 其深色。可被所有场景复用。

## 加一个店内状态（scenes.json → states）
整幅 400×160 坐标的叠加层（墙洞、焦痕、结冰…）；由事件动作 `["state", 名, 天数]` 打开。

## 加一个事件（events.json → events）
| 字段 | 含义 |
|---|---|
| id, icon | 唯一名、图标 |
| p | 抽选权重（越大越常出）；前因成立的事件下一拍优先 |
| needs | 前因标记（可省）；标记由别的事件或 `on` 里的钩子设置 |
| scene / states | 去哪个场景；事件期间叠加哪些状态 |
| vars | `[lo, hi]` = 随机整数；字符串 = 算式（可用前面的变量）。用“先定答案再反推题面”保证整除 |
| show | 可选：`{"grid": ["r","c"], "boss": true}` 画群怪 |
| intro / steps[].q / win.text / lose.text | 中英文本，`{变量}` 自动填；`{place}` 场景名，`{money}` 场景货币 |
| steps[] 三种题 | 情境题 `{q, a, fam}`；纯算式 `{calc: "{a} × {b}", a}`（题面就是算式，可加 q 作引子）；按水平出题 `{gen: 题型族}`（族名见 game_data.json families，自动选纯算式题型并调难度） |
| needsItem | 有这件物品才可能出（配合动作 use 用掉）；物品可由事件给或集市卖 |
| show.cake | 画蛋糕。不写 type = 用蛋糕组合库随机出（可固定 shape/fruit/fruit2/nFruit/tiers/topper/nTop/pattern/number/style/flavour，值可写变量名），并给变量 `{cakeName}` `{nFruit}` `{tiers}` 用于出题；写 type = 旧画法（tart/roll/castle 等） |
| market | 集市：抽 n 件 content/market.json 的货，买时算找零；steps 可为空 |
| pass | 答对几题算赢（默认全对） |
| win.do / lose.do | 动作列表，见下 |

动作词表：`["use", 物品名]`（用掉一件）`["cash", 算式]` `["stock", 算式]` `["flag", 名, 天数, 概率%?]` `["state", 名, 天数]` `["cust", 增减, 天数]` `["item", 物品名]`（物品在 events.json → items 登记）。
钩子 `on`：游戏里固定时刻触发的动作（`battle` 打完怪、`oven` 烤箱事件），用来给后面的事件埋前因。

## 任务链（蛋糕订单 → 去别处找材料 → 交货）
三个事件串起来：下单事件 win/lose 都 `["flag","wantX",4]` → 取材事件 `needs: wantX`（换场景，给物品并 `["flag","xWait",4]`）→ 交货事件 `needs: xWait, needsItem: 物品`（`["use", 物品]`）。例子：princessOrder → starFetch → princessCake。

## 集市货品（content/market.json）
`{kind:"weapon", rarity, price}` 从未拥有的武器里抽；其余 `{id, icon, en, zh, price, item?, do?, note?}`。道具可开启事件（如 compass → compassTrip）。

## 何时出事：导演（content/tuning.json 的 pacing 与 floors，只在这里调节奏；v009b 起 pacing.json 并入 tuning.json）
- `gap` [2,4]：每答 2–4 道题来一次节拍；`beats` 怪兽与场景事件的权重；`monsterMaxGap` 最多隔几拍必来怪兽；`first` 每天第几题后可来第一拍。
- 节拍只在两单之间插入（serveNext），节拍进行中的题不计数；最近 3 个事件不重复。

## 版本（防缓存混用）
改任何 js 后：`content/build.json` 与 index.html 的 `BUILD`、所有 `<script ?b=>` 一起升；页面启动自检，不一致会提示刷新。test_events.js 核对这一点。

## 测试
- `node tests/test_events.js`：引用、词表、占位符、500 组随机数下答案均为非负整数、每个场景能画。
- 同一脚本还核对版本一致，并用真实数据模拟答 200 题检查节拍间隔。
- 浏览器：`tests/event_harness.html?ev=<id>&at=q|end` 强制某事件并自动答对走完；`tests/pacing_harness.html` 真实页面 30 题内的节拍数（≥ 7.5 才 PASS）。

## 蛋糕组合库（content/cakes.json + mq_cake.js）
- 一个蛋糕 = 形状 × 大小 × 层数 × 装饰方式 × 表面图案 × 两种水果 × 摆法 × 顶饰 × 口味 × 点缀色，种子决定，同一种子画面固定。
- 加水果、表面图案、顶饰、口味、装饰方式：在 cakes.json 加一行（SVG 片段，{c}{d}{l} 为随机点缀色）。表面图案可引用场景装饰（from: scene）、怪兽（from: monster）、数字（from: number）。
- 加形状：在 cakes.json shapes 登记（含 cap = 顶上最多数得清的水果数），并在 mq_cake.js SHAPES 写一个画法函数。
- 样张：`tests/cake_gallery.html?seed=1&n=24&shapes=layer,heart`。

## 故事线（content/arcs.json，v010d 起）
- 一条线 = `vars`（开线时抽一次，全线共用）+ `beats`（2–3 拍，每拍就是一个事件，字段同上表；`at` 0–1 = 放在一天的早/中/晚，`day` = 第几天，跨天的线写 1；`scene` 默认 shop；`show.who` 画角色，2 = 两个）。
- `{who}` `{who2}` 是开线时从 `cast` × `names` 抽的角色（如“狐狸皮皮 / Pip the Fox”），画面时按语言拼；`defaults` 是没写 win/lose 时的默认结算。
- `src` 记题型套路出处（目前取自 UKMT JMC 2020–2023），题面与数自编；一条线围绕一类题，拍与拍之间有因果（下单 → 取货付钱等）。
- 纯算式步写成 `{calc, a, q}`：q 是故事里的引子，calc 是算式；test_events 会核对算式与答案一致。
- 导演（planDay）先放故事拍（全部新增、不挤掉原有类别），再排怪兽与换场景，保底间隔把故事拍算在内；关门前没讲完的拍按顺序出完。节奏参数在 tuning.json → arcs。
- 加一条线：照抄一条改文字与 vars，跑 `node tests/test_events.js` 与 `node tests/check_requirements.js`（R18a/b：每天有故事、30 天里 ≥15 条不同的线）。
