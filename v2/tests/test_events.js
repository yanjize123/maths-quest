// 场景与事件数据检查：node tests/test_events.js（无依赖，秒级）。改 content/scenes.json 或 events.json 后必须全部通过。
// 检查：引用都存在、动作在词表内、题面占位符全部填上（中英）、每题答案是非负整数（每个事件随机抽 500 组数）、每个场景能画出来。
const fs = require('fs'), path = require('path');
const E = require('../mq_engine.js'), S = require('../mq_scene.js');
const C = f => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content', f), 'utf8'));
const SD = C('scenes.json'), ED = C('events.json'); S.load(SD);
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } };
const OPS = { cash: 1, stock: 1, flag: 1, state: 1, cust: 1, item: 1 };
const flagsSet = new Set();
const acts = (list, where) => (list || []).forEach(a => { ok(OPS[a[0]], `${where}: 未知动作 ${a[0]}`); if (a[0] === 'flag') flagsSet.add(a[1]); if (a[0] === 'state') ok(SD.states[a[1]], `${where}: 无状态 ${a[1]}`); if (a[0] === 'item') ok(ED.items[a[1]], `${where}: 无物品 ${a[1]}`); });
Object.entries(ED.on).forEach(([k, l]) => acts(l, 'on.' + k));
const ids = new Set();
for (const e of ED.events) {
  const w = 'event ' + e.id; ok(!ids.has(e.id), w + ' id 重复'); ids.add(e.id);
  ok(SD.scenes[e.scene], w + ' 无场景 ' + e.scene); (e.states || []).forEach(s => ok(SD.states[s], w + ' 无状态 ' + s));
  acts(e.win.do, w + '.win'); acts(e.lose.do, w + '.lose');
  for (let n = 0; n < 500; n++) {
    const v = {}; for (const [k, d] of Object.entries(e.vars || {})) v[k] = Array.isArray(d) ? d[0] + Math.floor(Math.random() * (d[1] - d[0] + 1)) : E.evalExpr(d, v);
    v.place = 'X'; v.money = 'Y';
    const texts = [e.intro, e.win.text, e.lose.text, ...e.steps.map(s => s.q)];
    for (const t of texts) for (const L of ['en', 'zh']) { const f = String(t[L] || '').replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m)); if (/\{\w+\}/.test(f) || !t[L]) { ok(false, `${w} ${L} 占位符未填或缺文字: ${f.slice(0, 60)}`); n = 500; } }
    for (const s of e.steps) { const a = E.evalExpr(s.a, v); if (!(Number.isInteger(a) && a >= 0)) { ok(false, `${w} 答案 ${s.a}=${a} 不是非负整数 ${JSON.stringify(v)}`); n = 500; } }
    for (const a of [...(e.win.do || []), ...(e.lose.do || [])]) if ((a[0] === 'cash' || a[0] === 'stock') && !Number.isFinite(E.evalExpr(a[1], v))) ok(false, w + ' 动作表达式 ' + a[1]);
  }
}
for (const e of ED.events) if (e.needs) ok(flagsSet.has(e.needs), `event ${e.id}: 前因 ${e.needs} 没有任何地方设置`);
for (const [id, s] of Object.entries(SD.scenes)) {
  if (s.builtin) continue;
  (s.decor || []).forEach(k => ok(SD.sprites[k], `scene ${id}: 无装饰 ${k}`));
  for (let seed = 1; seed < 20; seed++) { const svg = S.render(S.roll(id, seed), ['hole'], ''); ok(svg && svg.startsWith('<svg') && !/\{[cd]\}/.test(svg) && !/NaN|undefined/.test(svg), `scene ${id} seed ${seed} 画不出`); }
}
// ---- 版本一致（防缓存混用）：index.html 的 BUILD、所有 <script ?b=>、content/build.json 必须相同 ----
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8'), build = C('build.json').build;
ok((html.match(/const BUILD = '(\w+)'/) || [])[1] === build, `index.html BUILD ≠ build.json ${build}`);
(html.match(/<script src="[^"]+"/g) || []).forEach(t => ok(t.includes('?b=' + build), '脚本缺版本号 ' + t));
// ---- 导演节奏：真实数据下模拟答 200 题，节拍间隔不超过 gap 上限，怪兽不超过 monsterMaxGap 拍不来 ----
const PD = C('pacing.json'), vm = require('vm');
const ctx = { ST: { flags: {}, states: {}, cust: [], items: {} }, T: {}, LANG: 'zh', pickMonster: () => 0, MQEngine: E, MQScene: S, read: f => Promise.resolve(fs.readFileSync(path.join(__dirname, '..', f), 'utf8')), console };
vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'mq_events.js'), 'utf8') + ';this.MQEv = MQEv;', ctx);
ctx.MQEv.load().then(() => {
  let beats = 0, mon = 0, last = 0, maxGap = 0, sinceMon = 0, maxNoMon = 0;
  for (let q = 1; q <= 200; q++) {
    ctx.MQEv.count(); const b = ctx.MQEv.due();
    if (b) { beats++; maxGap = Math.max(maxGap, q - last); last = q; if (b === 'monster') { mon++; sinceMon = 0; ctx.MQEv.on('battle'); } else { sinceMon++; maxNoMon = Math.max(maxNoMon, sinceMon); ctx.T.sev.done = true; ctx.T.inBeat = false; } }
  }
  ok(maxGap <= PD.gap[1], `节拍最大间隔 ${maxGap} > ${PD.gap[1]}`); ok(beats >= 200 / PD.gap[1], `200 题只有 ${beats} 拍`); ok(maxNoMon <= PD.monsterMaxGap, `连续 ${maxNoMon} 拍没怪兽`);
  console.log(`导演模拟 200 题：${beats} 拍（怪兽 ${mon}），最大间隔 ${maxGap} 题`);
  console.log(fail ? `${fail} 项失败` : `全部通过：${ED.events.length} 个事件、${Object.keys(SD.scenes).length} 个场景、${Object.keys(SD.sprites).length} 个装饰`);
  process.exit(fail ? 1 : 0);
});
