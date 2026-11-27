// check_requirements.js — 按 content/requirements.json 逐条检查（node，无参数）。P-20261126-maths-game 迁移第 1 步。
// 指标类：tests/sim_days.js 用 3 个种子各模拟 200 天，取最坏值比较阈值；check=test_events 跑数据检查；static_* 是源码检查；lang_switch 跑浏览器测试（tests/lang_switch.js，需要本机 Chrome）。
// level=target 的条目只报告不判失败。结果写入 tests/req_report.json；有硬性失败则退出码 1。
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const ROOT = path.join(__dirname, '..'), REQ = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'requirements.json'), 'utf8'));
const { simulate } = require('./sim_days.js');
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const jsFiles = () => fs.readdirSync(ROOT).filter(f => f.endsWith('.js')).concat(['index.html']);
const run = cmd => { try { return { ok: true, out: execSync(cmd, { cwd: path.join(ROOT, '..'), stdio: 'pipe', timeout: 120000 }).toString() }; } catch (e) { return { ok: false, out: (e.stdout || '').toString() + (e.stderr || '').toString() }; } };
const STATIC = {
  // 随机只来自 rng.js（MQRng）：其他文件不得出现 Math.random
  static_rng: () => { const bad = jsFiles().filter(f => f !== 'rng.js' && /Math\.random/.test(src(f))); return { ok: !bad.length, note: bad.length ? 'Math.random 仍在：' + bad.join(', ') : 'ok' }; },
  // 调节参数只在 content/tuning.json：旧入口必须删掉
  static_tuning: () => {
    const bad = [];
    if (fs.existsSync(path.join(ROOT, 'content', 'pacing.json'))) bad.push('content/pacing.json 仍在');
    if (!fs.existsSync(path.join(ROOT, 'content', 'tuning.json'))) bad.push('缺 content/tuning.json');
    if (/const EVENTS = \[/.test(src('index.html'))) bad.push('index.html EVENTS');
    if ('events' in JSON.parse(src('content/game_data.json'))) bad.push('game_data.json events 概率');
    for (const f of ['index.html', 'mq_events.js', 'mq_play.js']) if (/(random|rnd|\br|MQRng\.r)\(\)\s*[<>]\s*0?\.\d|chance\(\s*\d|roll\(\s*\d/.test(src(f))) bad.push(f + ' 有写死的概率');   // 游戏层文件；出题器、画图库内部常数不算
    return { ok: !bad.length, note: bad.length ? bad.join('；') : 'ok' };
  },
};
(async () => {
  const sims = []; for (const seed of [7, 11, 13]) sims.push(await simulate({ days: 200, seed }));
  const worst = (m, op) => { const v = sims.map(s => s[m]); if (Array.isArray(v[0])) return [...new Set(v.flat())]; return op === '>=' ? Math.min(...v) : op === '<=' ? Math.max(...v) : v; };
  let te = null, ls = null, hard = 0; const rows = [];
  for (const r of REQ.items) {
    let ok = null, got = '', note = '';
    if (r.metric) {
      const v = worst(r.metric, r.op); got = Array.isArray(v) && r.op !== 'between' ? (v.length ? v.join(',') : '[]') : JSON.stringify(v);
      if (r.op === '>=') ok = v >= r.value; else if (r.op === '<=') ok = v <= r.value; else if (r.op === 'empty') ok = !v.length;
      else if (r.op === 'between') ok = v.every(x => x >= r.value[0] && x <= r.value[1]);
    } else if (r.check === 'test_events') { te = te || run('node v2/tests/test_events.js'); ok = te.ok; note = te.ok ? 'test_events 通过' : te.out.split('\n').filter(l => l.startsWith('FAIL')).slice(0, 3).join(' | '); }
    else if (r.check === 'lang_switch') { if (fs.existsSync(path.join(__dirname, 'lang_switch.js'))) { ls = ls || run('node v2/tests/lang_switch.js'); ok = ls.ok; note = ls.out.trim().split('\n').slice(-1)[0]; } else note = '未实现（' + (r.plan || '') + '）'; }
    else if (STATIC[r.check]) { const x = STATIC[r.check](); ok = x.ok; note = x.note; }
    else note = '人工' + (r.plan ? '；' + r.plan : '');
    const target = r.level === 'target'; if (ok === false && !target) hard++;
    rows.push({ id: r.id, ok, target, got, want: r.metric ? `${r.op} ${JSON.stringify(r.value ?? '')}` : r.check, note, said: r.said });
  }
  for (const x of rows) console.log(`${x.ok === null ? '·' : x.ok ? '✔' : x.target ? '△' : '✘'} ${x.id.padEnd(4)} ${x.said}${x.got !== '' ? `  [${x.got} ${x.want}]` : ''}${x.note ? '  ' + x.note : ''}`);
  console.log(`\n硬性失败 ${hard} 条（△ = 目标未达，只报告；· = 人工或未实现）。模拟：3 个种子 × 200 天，取最坏值。`);
  fs.writeFileSync(path.join(__dirname, 'req_report.json'), JSON.stringify({ date: new Date().toISOString(), hard, rows, sims }, null, 1));
  process.exit(hard ? 1 : 0);
})();
