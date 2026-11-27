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
| p | 当天可出时的概率 %（有前因的事件前因成立时先掷） |
| needs | 前因标记（可省）；标记由别的事件或 `on` 里的钩子设置 |
| scene / states | 去哪个场景；事件期间叠加哪些状态 |
| vars | `[lo, hi]` = 随机整数；字符串 = 算式（可用前面的变量）。用“先定答案再反推题面”保证整除 |
| show | 可选：`{"grid": ["r","c"], "boss": true}` 画群怪 |
| intro / steps[].q / win.text / lose.text | 中英文本，`{变量}` 自动填；`{place}` 场景名，`{money}` 场景货币 |
| steps[].a, fam | 答案算式；题型族（记录用） |
| pass | 答对几题算赢（默认全对） |
| win.do / lose.do | 动作列表，见下 |

动作词表：`["cash", 算式]` `["stock", 算式]` `["flag", 名, 天数, 概率%?]` `["state", 名, 天数]` `["cust", 增减, 天数]` `["item", 物品名]`（物品在 events.json → items 登记）。
钩子 `on`：游戏里固定时刻触发的动作（`battle` 打完怪、`oven` 烤箱事件），用来给后面的事件埋前因。

## 测试
- `node tests/test_events.js`：引用、词表、占位符、500 组随机数下答案均为非负整数、每个场景能画。
- 浏览器：`tests/event_harness.html?ev=<id>&at=q|end` 强制某事件并自动答对走完，标题 PASS/FAIL。
