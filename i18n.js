/* Maths Quest — Chinese / English interface switch. Version 1 (2026-11-27).
   Same data and progress in both languages: only what is shown changes. Works by translating text
   on screen (exact phrases, then patterns) whenever the page changes; English originals are kept so
   switching back is exact. Word problems without a pattern stay in English for now. */
(function () {
"use strict";
const KEY = "mq_lang";
let LANG = (() => { try { return localStorage.getItem(KEY) || "en"; } catch (e) { return "en"; } })();
const EXACT = {
  "Maths Quest": "数学探险", "Choose your player:": "选择玩家：", "⚔️ Practice": "⚔️ 练习", "🧮 Sets of 10": "🧮 十题一组", "✍️ Step by step": "✍️ 逐步计算",
  "🔢 Column": "🔢 竖式", "🧭 Placement test": "🧭 水平测试", "🎯 Fix my mistakes": "🎯 错题练习", "📒 Progress": "📒 学习记录", "Question bank:": "题库：",
  "Check ✔": "检查 ✔", "💡 Hint": "💡 提示", "I don't know": "不会", "Next ➜": "下一题 ➜", "Check line ✔": "检查这一行 ✔", "↶ Undo line": "↶ 撤回一行",
  "💡 Next step": "💡 下一步", "Show me": "看解法", "Clear": "清空", "Log in ➜": "登录 ➜", "Log out": "退出", "🔐 Log in": "🔐 登录",
  "Keep me logged in on this device": "在这台设备上保持登录", "Your answer": "你的答案", "Next line of working, then Enter": "写下一行，按回车",
  "Accuracy": "正确率", "Accuracy by week (oldest → this week)": "每周正确率（从早到本周）", "Accuracy first, then speed.": "先求准，再求快。", "Another set ➜": "再来一组 ➜",
  "Answers": "答题数", "Area": "领域", "Avg s": "平均秒", "Hints": "提示", "Last 10": "最近10题", "Minutes": "分钟", "Next target": "下一目标", "Placement": "测试结果",
  "Practising securely at": "能稳定做到", "Pure calculation": "纯计算", "Questions": "题数", "Right": "正确", "Stars": "星级", "Topic": "题型", "Topics": "题型", "Trend": "趋势",
  "Type": "题型", "Year": "年级", "new": "新", "not tested": "未测", "Secure up to": "稳定到", "Recent mistakes": "最近错题", "No mistakes yet!": "还没有错题！",
  "📊 Report": "📊 报告", "🔎 Weak spots": "🔎 薄弱点", "🧩 Mistake types (last 30 days)": "🧩 错误类型（近30天）", "📈 Level by area (last 60 days)": "📈 各领域水平（近60天）",
  "⭐ Secure": "⭐ 已掌握", "🧭 Placement result": "🧭 测试结果", "🧮 Set finished": "🧮 本组完成", "Last 7 days": "近7天", "Last 30 days": "近30天", "All": "全部",
  "Target: 8 out of the next 10 right. 🎯 Fix my mistakes practises these first.": "目标：接下来10题对8题。🎯 错题练习会先练这些。",
  "No weak spots yet (a type needs at least 3 answers).": "暂时没有薄弱点（一个题型至少要做3题）。",
  "Mistake types come from 🔢 Column and ✍️ Step by step.": "错误类型来自 🔢 竖式 和 ✍️ 逐步计算。",
  "“Securely” = at least 5 answers at that year with 80% right.": "“稳定”= 该年级至少做5题且正确率80%。",
  "No placement result yet — try the 🧭 Placement test.": "还没有测试结果——试试 🧭 水平测试。", "Start practising ➜": "开始练习 ➜", "Start ➜": "开始 ➜", "Continue ➜": "继续 ➜", "Start again": "重新开始",
  "⚙️ Players & backup": "⚙️ 玩家与备份", "Save ✔": "保存 ✔", "Cancel": "取消", "Remove": "删除", "＋ Add": "＋ 添加", "⬇ Download backup": "⬇ 下载备份", "⬆ Restore backup": "⬆ 恢复备份",
  "Keep going — one step per line.": "继续——每行一步。", "For example:": "例如：", "✓": "✓", "Correct! 🎉": "正确！🎉", "Solved! 🎉": "解出来了！🎉",
  "Here is one way to do it.": "这是一种做法。", "Here is the full working.": "这是完整过程。", "Solved with every line right! 🎉": "每一行都对，解出来了！🎉", "Perfect — every digit right first time! 🎉": "完美——每一位一次就对！🎉",
  "✓ So far so good — keep going.": "✓ 目前都对——继续。", "Daily goal (questions):": "每日目标（题数）：",
  "Write each answer digit on top (Chinese 竖式 or English long division — same layout). Under it: the product, then what is left with the next digit brought down. Dashed boxes may stay empty.": "商写在上面，每一位对齐被除数（中国竖式和英式长除法格式相同）。下面先写商乘除数的积，再写相减的余数并落下下一位。虚线格可以空着。",
  "Short division: write each answer digit on top; carry what is left as a small number in your head or on paper. Write the remainder after r.": "短除：商写在上面，每步的余数记在心里或草稿上；最后的余数写在 r 后面。",
  "One row for each digit of the bottom number, then add. The dashed 0 is optional (English methods write it, Chinese 竖式 leaves it out).": "第二个因数每一位乘出一行，再相加。虚线格的 0 可写可不写（英式写，中国竖式不写）。",
  "Work from the right. Small boxes are for carried digits (not marked).": "从右边算起。小格子用来写进位（不判分）。",
  "One step per line. Use + − × ÷ (or * /, or x for ×), brackets ( ), fractions like 3/4, mixed numbers like 2 1/2. You can start a line with =. Finish with the answer on its own.": "每行写一步。可用 + − × ÷（也可用 * / 或 x 表示乘），括号 ( )，分数如 3/4，带分数如 2 1/2。每行可以用 = 开头。最后单独写出答案。",
  "One equation per line, e.g. 3x + 5 = 20, then 3x = 15, then x = 5. Write 3x or 3*x; 3(x − 2) is fine; fractions like x/4 or (x + 1)/3. You may add a note at the end like (÷3). Finish with x = …": "每行写一个方程，例如 3x + 5 = 20，然后 3x = 15，然后 x = 5。写 3x 或 3*x 都行；3(x − 2) 可以；分数写成 x/4 或 (x + 1)/3。行末可以加注释如 (÷3)。最后写 x = …",
  "One inequality per line, e.g. 3x + 5 < 20, then 3x < 15, then x < 5. Type <= or >= for ≤ ≥. If you multiply or divide by a negative number, flip the sign. Finish with x < … (or ≤ > ≥).": "每行写一个不等式，例如 3x + 5 < 20，然后 3x < 15，然后 x < 5。≤ ≥ 可打成 <= >=。乘或除以负数时不等号变向。最后写 x < …（或 ≤ > ≥）。",
  "One or two equations per line (separate two with a comma), e.g. 2x + 3y = 12. Every line must be true for the answer. Finish with x = … and y = … (in any order, on one line or two).": "每行写一个或两个方程（两个用逗号隔开），例如 2x + 3y = 12。每一行都必须对答案成立。最后写出 x = … 和 y = …（顺序不限，一行或两行）。",
  "What is left at the end?": "最后余下多少？", "Does the divisor go into this part? If not, leave it.": "这一部分够除吗？不够就空着。",
  "Missing numbers (+ and −)": "填空（加减）", "Missing numbers (× and ÷)": "填空（乘除）", "Missing numbers (larger numbers)": "填空（多位数）", "Missing numbers (with remainder)": "填空（有余数）",
  "Comparing (< > =)": "比较大小", "Comparing decimals and fractions": "比较小数和分数", "Comparing negatives": "比较负数", "Rounding decimals": "小数取近似值", "Rounding up or down in context": "进一法与去尾法",
  "Significant figures": "有效数字", "Estimating": "估算", "Fractions, decimals, percentages": "分数、小数、百分数互化", "Laws of calculation (fill the box)": "运算律（填空）", "Number pyramid": "数字金字塔",
  "Reading a clock": "认钟表", "Reading a clock (to the minute)": "认钟表（精确到分）", "Clock to 24-hour time": "24 时计时法", "Time passed": "经过时间",
  "What time does the clock show?": "钟面上是几时几分？", "Type <, > or =": "填 <、> 或 =", "Type the number in □": "填出 □ 里的数", "e.g. 4:35": "例如 4:35", "e.g. 15:40": "例如 15:40",
  "Use the inverse operation.": "用逆运算。", "Look at the next digit: 5 or more rounds up.": "看下一位：满 5 进一。", "Count from the first non-zero digit.": "从第一个非零数字数起。",
  "It is afternoon/evening. Write the time on the clock in 24-hour time.": "现在是下午或晚上。用 24 时计时法写出钟面时间。", "It is morning. Write the time on the clock in 24-hour time.": "现在是上午。用 24 时计时法写出钟面时间。",
  // topic names (new pure types)
  "Adding within 10": "10以内加法", "Subtracting within 10": "10以内减法", "Adding across 10": "进位加法（凑十）", "Adding 2-digit and 1-digit": "两位数加一位数", "Subtracting 1-digit": "减一位数",
  "Adding tens": "加整十", "Subtracting tens": "减整十", "Division facts (2, 5, 10)": "表内除法（2、5、10）", "Column addition": "竖式加法", "Column subtraction": "竖式减法", "2-digit × 1-digit": "两位数乘一位数",
  "Division facts (3, 4, 8)": "表内除法（3、4、8）", "Missing numbers": "填空（求未知数）", "4-digit column addition": "四位数竖式加法", "4-digit column subtraction": "四位数竖式减法",
  "3-digit × 1-digit (short multiplication)": "三位数乘一位数", "× and ÷ by 10, 100": "乘除10、100", "Short division": "短除", "Adding decimals (1 d.p.)": "一位小数加法", "Subtracting decimals (1 d.p.)": "一位小数减法",
  "Long multiplication": "多位数乘法", "Short division (4-digit)": "四位数除以一位数", "Adding decimals": "小数加法", "Subtracting decimals": "小数减法", "× by 10, 100, 1000 (decimals)": "小数乘10、100、1000",
  "÷ by 10, 100, 1000 (decimals)": "小数除以10、100、1000", "Adding fractions (same denominator)": "同分母分数加法", "Subtracting fractions (same denominator)": "同分母分数减法", "Adding mixed numbers": "带分数加法",
  "Subtracting mixed numbers": "带分数减法", "Squares and cubes": "平方与立方", "Long division (4-digit ÷ 2-digit)": "除数是两位数的除法", "Long multiplication (4-digit × 2-digit)": "四位数乘两位数", "Decimal × whole number": "小数乘整数",
  "Decimal ÷ whole number": "小数除以整数", "Adding fractions (different denominators)": "异分母分数加法", "Subtracting fractions (different denominators)": "异分母分数减法", "Fraction × whole number": "分数乘整数",
  "Fraction ÷ whole number": "分数除以整数", "Percentage of an amount": "求一个数的百分之几", "Adding and subtracting negatives": "负数加减", "Multiplying negatives": "负数乘法", "Dividing negatives": "负数除法",
  "Calculating cleverly": "简便计算", "Multiplying decimals": "小数乘小数", "Dividing by a decimal": "除以小数", "Multiplying mixed numbers": "带分数乘法", "Dividing mixed numbers": "带分数除法",
  "Powers and order of operations": "乘方与运算顺序", "Index laws (numbers)": "同底数幂（数字）", "Negative fractions": "负分数运算", "Expanding a bracket": "去括号", "Collecting like terms": "合并同类项",
  "Index laws (algebra)": "同底数幂（字母）", "Square roots and order of operations": "平方根与运算顺序", "Squaring a bracket": "完全平方展开", "Fractional indices": "分数指数", "Negative and fractional indices": "负指数与分数指数",
  "Negative indices": "负指数", "Expanding two brackets": "多项式乘法", "Order of operations (step by step)": "四则混合（逐步）", "Brackets and order of operations (step by step)": "带括号的四则混合（逐步）",
  "Negatives and order of operations (step by step)": "有理数混合运算（逐步）", "Powers and brackets (step by step)": "乘方与括号（逐步）", "Fractions and order of operations (step by step)": "分数混合运算（逐步）",
  "Two-step equations (step by step)": "两步方程（逐步）", "Unknown on both sides (step by step)": "两边都有未知数（逐步）", "Equations with brackets (step by step)": "含括号的方程（逐步）",
  "Equations with fractions (step by step)": "含分母的方程（逐步）", "Negative x term (step by step)": "x 系数为负（逐步）", "Fractions on both sides (step by step)": "两边都有分母（逐步）",
  "Inequalities (step by step)": "一元一次不等式（逐步）", "Inequalities with a negative x term (step by step)": "x 系数为负的不等式（逐步）", "Inequalities with brackets (step by step)": "含括号的不等式（逐步）",
  "Simultaneous equations — same y term (step by step)": "二元一次方程组——y 系数相同（逐步）", "Simultaneous equations — multiply first (step by step)": "二元一次方程组——先乘再消元（逐步）",
  "Column addition (written)": "竖式加法", "Column subtraction (written)": "竖式减法", "Short multiplication (written)": "竖式乘法（乘数一位）", "Division by 1 digit (written)": "竖式除法（除数一位）",
  "Division with remainder (written)": "有余数的竖式除法", "Short division (bus stop)": "短除（英式）", "Long multiplication (written)": "竖式乘法（乘数两位）", "Long division by 2 digits (written)": "竖式除法（除数两位）",
  "Long division with remainder (written)": "有余数的竖式除法（除数两位）", "Division with remainder": "有余数的除法", "Order of operations": "运算顺序", "Long division": "长除法", "Negative numbers": "负数",
};
const RULES = [
  [/^Work out, one step per line:\n/, "计算，每行写一步：\n"], [/^Solve, one step per line:\n/, "解答，每行写一步：\n"],
  [/^Solve the simultaneous equations (.+)$/, "解方程组 $1"], [/^Solve (.+)$/, "解 $1"], [/^Work out (.+?)\.?$/, "计算 $1"], [/^Expand (.+)$/, "展开 $1"], [/^Simplify (.+)$/, "化简 $1"],
  [/^(\d+)% of (.+) = \?$/, "$2 的 $1% = ?"],
  [/^Round (.+) to the nearest whole number\.$/, "把 $1 精确到整数。"], [/^Round (.+) to (\d) decimal places?\.$/, "把 $1 精确到 $2 位小数。"], [/^Round (.+) to (\d) significant figures?\.$/, "把 $1 保留 $2 位有效数字。"],
  [/^Estimate (.+) by rounding each number to the nearest (\d+)\.$/, "把每个数取整到最接近的 $2，估算 $1。"], [/^(.+) = \? \(as a decimal\)$/, "$1 = ?（写成小数）"], [/^(.+) = \? \(as a fraction in its simplest form\)$/, "$1 = ?（写成最简分数）"],
  [/^(\d+) children need minibuses that seat (\d+) each\. How many minibuses\?$/, "$1 个孩子坐小巴，每辆坐 $2 人。需要几辆小巴？"], [/^Ribbons are cut (\d+) cm long from (\d+) cm\. How many whole ribbons\?$/, "从 $2 cm 长的彩带上剪 $1 cm 一段。能剪几整段？"],
  [/^The clock shows when a cake went into the oven\. It came out at (.+)\. How many minutes was it in the oven\?$/, "钟面是蛋糕放进烤箱的时间，$1 拿出来。烤了几分钟？"],
  [/^Each brick is the sum of the two bricks below it\.([\s\S]*)What number goes in □\?$/, "每块砖上的数是下面两块砖上的数之和。$1□ 里填几？"],
  [/^Write (\d+) in Roman numerals\.$/, "把 $1 写成罗马数字。"], [/^What number is ([IVXLCDM]+)\?$/, "罗马数字 $1 是多少？"], [/^It is (.+)\. What time will it be in (\d+) minutes\?$/, "现在是 $1。$2 分钟后是几时几分？"], [/^Round (.+) to the nearest (.+?)\.$/, "把 $1 精确到 $2。"],
  [/^My plan \(Year (\d+) \+ gaps\)$/, "我的计划（$1 年级 + 补缺）"], [/^Year (\d+) \(GCSE Higher\)$/, "$1 年级（GCSE 高阶）"], [/^Year (\d+) \(GCSE\)$/, "$1 年级（GCSE）"], [/^Year (\d+)$/, "$1 年级"],
  [/^Y(\d+) · (.+)$/, (m, y, t) => `Y${y} · ${EXACT[t] || t}`], [/^Lv (\d+) (.+)$/, "等级 $1 $2"], [/^Today (\d+)\/(\d+)$/, "今日 $1/$2"],
  [/^🧮 Set · (\d+)\/10$/, "🧮 本组 · $1/10"], [/^(\d+)\/10$/, "$1/10"], [/^correct in$/, "题正确，用时"],
  [/^🏆 New personal best for this question bank!$/, "🏆 这个题库的新纪录！"], [/^Personal best: (.+)$/, "个人最好：$1"],
  [/^Solved! \((\d+) lines? needed fixing\)$/, "解出来了！（改了 $1 行）"], [/^Done! \((\d+) fix(es)? on the way\)$/, "完成！（中途改了 $1 处）"],
  [/^Fraction or mixed number, e\.g\. (.+)$/, "分数或带分数，例如 $1"], [/^e\.g\. (.+)$/, "例如 $1"],
  // checker messages (steps.js, column.js)
  [/^This line isn't equal to the line before\.(.*)$/, (m, r) => "这一行和上一行不相等。" + tr(r.trim())], [/^Remember the order: .*You worked left to right\.$/, "记住顺序：先括号，再乘方，再乘除，最后加减。你是从左往右算的。"],
  [/^Check a minus sign\.$/, "检查负号。"], [/^Do the next operation first: look at (.+)\.$/, "先算下一步：看 $1。"],
  [/^This line doesn't balance with the line before\. (.*)$/, (m, r) => "这一行和上一行不等价。" + tr(r)], [/^This line doesn't keep the same answer as the line before\. (.*)$/, (m, r) => "这一行和上一行的解不同。" + tr(r)],
  [/^When a term moves to the other side, its sign changes.*$/, "移项要变号（+ 变 −，− 变 +）。或者：两边做同样的运算。"], [/^Multiply every term inside the bracket by (.+)\.$/, "括号里每一项都要乘 $1。"],
  [/^A minus in front of a bracket changes the sign of every term inside\.$/, "括号前是负号，去括号时里面每一项都要变号。"], [/^To undo × (.+), divide both sides by .+$/, "要去掉 × $1，两边都除以 $1。"],
  [/^Divide the number side by the number in front of x.*$/, "用常数除以 x 前面的系数，别除反了。"], [/^Whatever you do to one side, do the same to the other side\.$/, "一边做什么，另一边也要做同样的事。"], [/^Do the same to both sides\.$/, "两边做同样的运算。"],
  [/^The sign points the wrong way\..*$/, "不等号方向错了。两边乘或除以负数时，不等号要变向。"], [/^Check whether the sign should include.*$/, "检查是否应该带“等于”（≤ ≥）。"],
  [/^Correct value — now simplify the fraction\.$/, "数值对了——再约分。"], [/^Too big: (.+) × (.+) = (.+), which is more than (.+)\. Try a smaller digit\.$/, "商大了：$1 × $2 = $3，比 $4 大。试小一点。"],
  [/^Too small: (.+) − (.+) × (.+) = (.+), still (.+) or more left\. Try a bigger digit\.$/, "商小了：$1 − $2 × $3 = $4，余数不小于 $5。试大一点。"],
  [/^Write a digit in the answer above every digit.*$/, "被除数的每一位上面都要写商（不够除就写 0）。"], [/^Multiply the digit you wrote in the answer by (.+): (.+)\.$/, "用商乘除数：$2。"],
  [/^Bring down the next digit of the number you are dividing\.$/, "把被除数的下一位落下来。"], [/^Now bring down the next digit.*$/, "现在把下一位落下来，写在余数后面。"],
  [/^Subtract: (.+?)(, then bring down the next digit)?\.$/, (m, a, b) => `相减：${a}${b ? "，再落下下一位" : ""}。`], [/^When a column makes 10 or more.*$/, "满十要进位：写个位，向前一位进一。"],
  [/^When the top digit is smaller.*$/, "不够减时向前一位借一，不能用大数减小数。"], [/^Add each column from the right\.$/, "从个位起一列一列加。"], [/^Check the carried digits\.$/, "检查进位。"],
  [/^Nothing goes here yet.*$/, "这里还不够除，空着（或写 0），多看一位。"], [/^Check this row\.$/, "检查这一行。"],
  [/^How many (\d+)s go into (\d+)\? Write that digit on top\.$/, "$2 里面有几个 $1？把这个数写在上面。"], [/^Multiply: (.+)\.$/, "相乘：$1。"],
  [/^Start with the right-hand column\.$/, "从最右边一列开始。"], [/^An equation line needs one = sign.*$/, "方程每行要有一个等号，例如 2x + 3 = 11。"], [/^This line needs an inequality sign.*$/, "这一行要有不等号：< > ≤ ≥。"],
  [/^Use only (.+), numbers and \+ − × ÷ \( \)\. I don't understand "(.)"\.$/, "只用 $1、数字和 + − × ÷ ( )。看不懂“$2”。"], [/^Use only numbers and \+ − × ÷ \( \)\. I don't understand "(.)"\.$/, "只用数字和 + − × ÷ ( )。看不懂“$1”。"],
  [/^A closing bracket \) is missing\.$/, "少了右括号 )。"], [/^This line is empty\.$/, "这一行是空的。"], [/^This equation isn't true for the answer.*$/, "这个方程对答案不成立——检查每一项。"],
  [/^When you multiply an equation, multiply every term.*$/, "方程乘一个数时，每一项都要乘，包括等号另一边的数。"], [/^When you (add|subtract) the equations.*$/, (m, w) => `两个方程相${w === "add" ? "加" : "减"}时，右边的数也要相${w === "add" ? "加" : "减"}（注意符号）。`],
  [/^That's the answer — type it on its own line\.$/, "这就是答案——单独写一行。"], [/^Work out (.+) first\.$/, "先算 $1。"], [/^Take (.+) from both sides\.$/, "两边同时减 $1。"], [/^Add (.+) to both sides\.$/, "两边同时加 $1。"],
  [/^Divide both sides by (.+?)\.( Dividing by a negative number flips the sign\.)?$/, (m, a, f) => `两边同时除以 ${a}。${f ? "除以负数，不等号变向。" : ""}`], [/^Multiply both sides by (.+) to clear the fractions\.$/, "两边同乘 $1 去分母。"],
  [/^Multiply out the brackets and collect like terms on each side\.$/, "去括号，两边分别合并同类项。"],
  [/^Subtract (.+) − (.+?)(, then bring down the next digit)?\.$/, (m, a, b, c) => `相减 ${a} − ${b}${c ? "，再落下下一位" : ""}。`], [/^Multiply (.+) by (.+?)(, one place to the left)?\.$/, (m, a, b, c) => `用 ${a} 乘 ${b}${c ? "，积向左移一位" : ""}。`],
  [/^(.+) — every line must be true.*$/, "$1"], [/^The (.) terms are the same: subtract the equations\.$/, "$1 的系数相同：两式相减。"], [/^The (.) terms are opposite: add the equations\.$/, "$1 的系数互为相反数：两式相加。"],
  [/^Multiply the (first|second) equation so the (.) terms match\.$/, (m, w, v) => `把第${w === "first" ? "一" : "二"}个方程乘一个数，使 ${v} 的系数相同。`], [/^Put (.) = (.+) into the first equation and move the number across\.$/, "把 $1 = $2 代入第一个方程，再移项。"],
  [/^Divide, multiply, subtract, bring down\.$/, "除、乘、减、落。"],
];
function tr1(k) { if (EXACT[k]) return EXACT[k]; for (const [re, to] of RULES) if (re.test(k)) return k.replace(re, to); return null; }
function tr(s) {
  if (!s) return s; const k = s.trim(); if (!k) return s;
  let z = tr1(k); if (z != null) return s.replace(k, z);
  const m = k.match(/^([^A-Za-z0-9(“"]+)([\s\S]+)$/);           // a leading symbol such as ✘ 💡 ✏️
  if (m) { z = tr1(m[2].trim()); if (z != null) return s.replace(k, m[1] + z); }
  return s;
}
const ORIG = new WeakMap();
function walk(node) {
  if (node.nodeType === 3) {
    const t = node.nodeValue; if (!t || !/[A-Za-z]/.test(t) || node.__zh === t) return;
    if (LANG === "zh") { const z = tr(t); if (z !== t) { ORIG.set(node, t); node.__zh = z; node.nodeValue = z; } }
    return;
  }
  if (node.nodeType !== 1 || node.tagName === "SCRIPT" || node.tagName === "STYLE") return;
  if (node.tagName === "INPUT") { doPh(node); return; }
  for (const c of node.childNodes) walk(c);
}
function doPh(el) { if (!el.placeholder) return; if (!el.__phEn) el.__phEn = el.placeholder; el.placeholder = LANG === "zh" ? tr(el.__phEn) : el.__phEn; }
function restore(node) { if (node.nodeType === 3) { const en = ORIG.get(node); if (en != null && node.nodeValue === node.__zh) node.nodeValue = en; return; } if (node.tagName === "INPUT") doPh(node); for (const c of node.childNodes || []) restore(c); }
let busy = false;
const obs = new MutationObserver(ms => { if (LANG !== "zh" || busy) return; busy = true; try { for (const m of ms) { if (m.type === "characterData") walk(m.target); else m.addedNodes.forEach(walk); } } finally { busy = false; } });
function setLang(l) { LANG = l; try { localStorage.setItem(KEY, l); } catch (e) {} busy = true; try { if (l === "zh") walk(document.body); else restore(document.body); } finally { busy = false; } document.documentElement.lang = l === "zh" ? "zh-CN" : "en"; const b = document.getElementById("langbtn"); if (b) b.textContent = l === "zh" ? "EN" : "中文"; }
window.MQI = { setLang, tr, get lang() { return LANG; } };
window.addEventListener("DOMContentLoaded", () => {
  const b = document.createElement("button"); b.id = "langbtn"; b.className = "ghost"; b.style.cssText = "position:fixed;top:10px;right:10px;z-index:9;padding:6px 12px;font-size:15px";
  b.onclick = () => setLang(LANG === "zh" ? "en" : "zh"); document.body.appendChild(b);
  obs.observe(document.body, { childList: true, subtree: true, characterData: true }); setLang(LANG);
});
})();
