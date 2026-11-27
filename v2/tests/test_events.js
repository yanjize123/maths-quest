// 场景与事件数据检查：node tests/test_events.js（无依赖，秒级）。改 content/scenes.json 或 events.json 后必须全部通过。
// 检查：引用都存在、动作在词表内、题面占位符全部填上（中英）、每题答案是非负整数（每个事件随机抽 500 组数）、每个场景能画出来。
const fs = require('fs'), path = require('path');
const E = require('../mq_engine.js'), S = require('../mq_scene.js');
const C = f => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content', f), 'utf8'));
const SD = C('scenes.json'), ED = C('events.json'); S.load(SD);
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } };
const OPS = { cash: 1, stock: 1, flag: 1, state: 1, cust: 1, item: 1, use: 1 };
const GD = C('game_data.json'), MD = C('market.json'), CAKES = { cupcake: 1, layer: 1, donut: 1, cookie: 1, tart: 1, roll: 1, castle: 1 };
const flagsSet = new Set();
const acts = (list, where) => (list || []).forEach(a => { ok(OPS[a[0]], `${where}: 未知动作 ${a[0]}`); if (a[0] === 'flag') flagsSet.add(a[1]); if (a[0] === 'state') ok(SD.states[a[1]], `${where}: 无状态 ${a[1]}`); if (a[0] === 'item' || a[0] === 'use') ok(ED.items[a[1]], `${where}: 无物品 ${a[1]}`); });
Object.entries(ED.on).forEach(([k, l]) => acts(l, 'on.' + k));
const ids = new Set();
for (const e of ED.events) {
  const w = 'event ' + e.id; ok(!ids.has(e.id), w + ' id 重复'); ids.add(e.id);
  ok(SD.scenes[e.scene], w + ' 无场景 ' + e.scene); (e.states || []).forEach(s => ok(SD.states[s], w + ' 无状态 ' + s));
  acts(e.win.do, w + '.win'); acts(e.lose.do, w + '.lose');
  if (e.needsItem) ok(ED.items[e.needsItem], w + ' needsItem 无物品 ' + e.needsItem);
  const CK = C('cakes.json'); if (e.show && e.show.cake) { const c = e.show.cake; if (c.type) ok(CAKES[c.type], w + ' 蛋糕类型 ' + c.type); for (const [k, tab] of [['shape', 'shapes'], ['fruit', 'fruits'], ['fruit2', 'fruits'], ['topper', 'toppers'], ['pattern', 'patterns'], ['style', 'styles'], ['flavour', 'flavours']]) if (c[k]) ok(CK[tab][c[k]], `${w} 蛋糕${k} 不存在 ${c[k]}`); }
  ok(e.steps.length || e.market, w + ' 没有题也不是集市');
  e.steps.forEach((s, i) => { if (s.gen) ok(GD.families[s.gen], `${w} 步 ${i} 题型族不存在 ${s.gen}`); else ok(s.a != null && (s.q || s.calc), `${w} 步 ${i} 缺 q/calc 或 a`); });
  for (let n = 0; n < 500; n++) {
    const v = {}; for (const [k, d] of Object.entries(e.vars || {})) v[k] = Array.isArray(d) ? d[0] + Math.floor(Math.random() * (d[1] - d[0] + 1)) : E.evalExpr(d, v);
    v.place = 'X'; v.money = 'Y'; if (e.show && e.show.cake && !e.show.cake.type) Object.assign(v, { cakeName: 'Z', nFruit: 3 + (n % 6), tiers: e.show.cake.tiers || 1 + (n % 3) });
    const texts = [e.intro, ...(e.market ? [] : [e.win.text, e.lose.text]), ...e.steps.filter(s => s.q).map(s => s.q), ...e.steps.filter(s => s.calc).map(s => ({ en: s.calc, zh: s.calc }))];
    for (const t of texts) for (const L of ['en', 'zh']) { const f = String(t[L] || '').replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m)); if (/\{\w+\}/.test(f) || !t[L]) { ok(false, `${w} ${L} 占位符未填或缺文字: ${f.slice(0, 60)}`); n = 500; } }
    for (const s of e.steps.filter(s => !s.gen)) { const a = E.evalExpr(s.a, v); if (!(Number.isInteger(a) && a >= 0)) { ok(false, `${w} 答案 ${s.a}=${a} 不是非负整数 ${JSON.stringify(v)}`); n = 500; } }
    for (const a of [...(e.win.do || []), ...(e.lose.do || [])]) if ((a[0] === 'cash' || a[0] === 'stock') && !Number.isFinite(E.evalExpr(a[1], v))) ok(false, w + ' 动作表达式 ' + a[1]);
  }
}
for (const e of ED.events) if (e.needs) ok(flagsSet.has(e.needs), `event ${e.id}: 前因 ${e.needs} 没有任何地方设置`);
for (const [id, s] of Object.entries(SD.scenes)) {
  if (s.builtin) continue;
  (s.decor || []).forEach(k => ok(SD.sprites[k], `scene ${id}: 无装饰 ${k}`));
  for (let seed = 1; seed < 20; seed++) { const svg = S.render(S.roll(id, seed), ['hole'], ''); ok(svg && svg.startsWith('<svg') && !/\{[cd]\}/.test(svg) && !/NaN|undefined/.test(svg), `scene ${id} seed ${seed} 画不出`); }
}
// ---- 蛋糕组合库：随机 600 个都能画、无 NaN/undefined，每种形状都出现 ----
{ const K = require('../mq_cake.js'); K.load(C('cakes.json')); const seen = new Set();
  for (let i = 0; i < 600; i++) { const sp = K.random(i * 7919 + 3), svg = K.draw(sp); seen.add(sp.shape); if (/NaN|undefined/.test(svg)) { ok(false, '蛋糕画不出 ' + JSON.stringify(sp)); break; } ok(K.name(sp, 'zh').length > 3, '蛋糕无名'); }
  for (let n = 1; n <= 10; n++) for (let i = 0; i < 50; i++) { const sp = K.random(i * 31 + n, { nFruit: n }); ok(sp.nFruit <= (C('cakes.json').shapes[sp.shape].cap ?? 9), `水果 ${n} 个放不下 ${sp.shape}`); }
  K.shapes().forEach(x => ok(seen.has(x), '600 个里没有形状 ' + x)); Object.keys(C('cakes.json').shapes).forEach(x => ok(K.shapes().includes(x), 'cakes.json 形状无画法 ' + x)); }
// ---- 集市货品 ----
MD.goods.forEach((g, i) => { ok(g.price > 0, `market ${i} 无价格`); if (g.kind === 'weapon') ok(GD.weapons.some(w => w.rarity === g.rarity), `market ${i} 无该稀有度武器`); else { ok(g.icon && g.en && g.zh, `market ${g.id} 缺图标或名字`); if (g.item) ok(ED.items[g.item], `market ${g.id} 物品未登记 ${g.item}`); acts(g.do, 'market ' + g.id); } });
// 物品链：needsItem 要求的物品必须有来源（事件给、或集市卖）
const sources = new Set(MD.goods.map(g => g.item).filter(Boolean)); ED.events.forEach(e => [...(e.win.do || []), ...(e.lose.do || [])].forEach(a => a[0] === 'item' && sources.add(a[1])));
ED.events.forEach(e => e.needsItem && ok(sources.has(e.needsItem), `event ${e.id}: 物品 ${e.needsItem} 无来源`));
// ---- 纯算式占比（题步中 gen/calc 的比例，按权重粗算）----
{ let pure = 0, all = 0; ED.events.forEach(e => e.steps.forEach(s => { all += e.p; if (s.gen || s.calc) pure += e.p; })); console.log(`纯算式题步占比（按出现权重）：${(100 * pure / all).toFixed(0)}%`); ok(pure / all >= 0.33, '纯算式占比 < 1/3'); }
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
