// sim_days.js — 甜品店多天模拟（node，无浏览器、无参数，秒级）。P-20261126-maths-game 迁移第 1 步（script_framework_v2.md §E-1）。
// 用真实的 mq_events.js（导演、选事件、结果动作）+ 真实内容 JSON，按页面的一天流程走（v010a 主线）：早上进货链 3–4 题 → 每单备料、打包连练、收钱（每单前问导演要不要出节拍）→ 高峰 → 晚上结账 1 题。
// 假设（写在这里，便于以后对照）：每题一次答对率 75%（只影响打怪轮数）；事件都按“赢”结算（物品、前因照常流转）；集市一半时候买一件带物品的货；不计重试。
// 输出：每天平均题数、纯算式占比、节拍、换场景次数与最长间隔、怪兽、每个事件第几天第一次出现；写入 tests/sim_report.json。
// 被 check_requirements.js 调用（module.exports.simulate）。
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..'), C = f => JSON.parse(fs.readFileSync(path.join(ROOT, 'content', f), 'utf8'));
const MQ = require('../../engine.js'), E = require('../mq_engine.js'), S = require('../mq_scene.js'), K = require('../mq_cake.js');

function makeCtx(seedRandom) {
  const ctx = { ST: { flags: {}, states: {}, cust: [], items: {}, pantry: {}, cash: 20, stock: 0, weapons: [], cards: {} }, T: {}, LANG: 'zh', MQEngine: E, MQScene: S, MQCake: K, Math: Object.create(Math), console,
    read: f => Promise.resolve(fs.readFileSync(path.join(ROOT, f), 'utf8')), pickMonster: () => 0 };
  if (seedRandom) ctx.Math.random = seedRandom;
  vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(ROOT, 'rng.js'), 'utf8'), ctx);   // 页面的唯一随机来源（种子 = ST.seed）
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'mq_events.js'), 'utf8') + ';this.MQEv = MQEv;', ctx);
  return ctx;
}
// 可复现的伪随机（模拟本身用；页面里的随机将在第 2 步统一到 rng.js）
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

async function simulate({ days = 200, seed = 7, acc = 0.75 } = {}) {
  const rnd = mulberry(seed), ctx = makeCtx(null); ctx.ST.seed = seed; const GD = C('game_data.json'), ED = C('events.json');
  await ctx.MQEv.load();
  const D = C('tuning.json').day, P = id => D[id] || 0, roll = p => rnd() * 100 < p, MD = C('market.json');
  const famPure = f => { const g = GD.families[f].gens.filter(x => MQ.G[x]); return g.filter(x => MQ.isPure(x)).length / Math.max(1, g.length); };
  const rushPure = GD.rush.gens.filter(x => MQ.isPure(x)).length / GD.rush.gens.length;
  const tot = { q: 0, pure: 0, beats: 0, events: 0, trips: 0, monsters: 0, daysNoTrip: 0 }, first = {}, catN = {};
  let sinceTrip = 0, maxTripGap = 0, sinceMon = 0, maxMonGap = 0, sinceBeatQ = 0, maxBeatGapQ = 0, prevCat = null, rep = 0, prevCaused = false; const repD = {};
  const perDay = [], arcDays = [], arcBeatsDay = []; let arcStarted = 0;
  for (let d = 1; d <= days; d++) {
    const ST = ctx.ST; ST.day = d; ctx.T = { inBeat: false }; const T = ctx.T;
    const dc = ctx.MQEv.tick(); let nCust = Math.max(2, 5 + dc), day = { q: 0, pure: 0, trips: 0, events: 0, monsters: 0 };
    if (roll(P('helper')) && rnd() < 1 / GD.helpers.length) nCust++;   // 帮手 extra（6 种之一）
    T.orders = Array(nCust).fill(0); T.idx = 0;   // 导演的每天保底要看剩几单
    ctx.MQEv.planDay();   // v010b：全天节拍表
    if (process.env.DBG == d) console.log('plan', d, 'beatsNoMon@start', JSON.stringify(T.plan.slots.map(x => x.q + (x.kind === 'monster' ? 'M' : x.cat))));
    const rush = roll(P('rush'));
    const word = (n = 1) => { for (let i = 0; i < n; i++) { while (beat()); day.q++; ctx.MQEv.count(); sinceBeatQ++; } };
    const pureQ = (n, share) => { day.q += n; day.pure += n * share; };   // 节拍内的题不计导演
    const beat = () => {
      const b = ctx.MQEv.due(); if (!b) return false;
      tot.beats++; maxBeatGapQ = Math.max(maxBeatGapQ, sinceBeatQ); sinceBeatQ = 0;
      if (b === 'monster') {
        day.monsters++; sinceMon = 0; (day.seq = day.seq || []).push('M'); const fam = Object.keys(GD.families)[Math.floor(rnd() * Object.keys(GD.families).length)];
        let hp = 2 * (1 + Math.floor(rnd() * 3)), turns = 0; while (hp > 0 && turns < 12) { turns++; if (rnd() < acc) hp -= 2 * (rnd() < 1 / 3 ? 2 : 1); }
        pureQ(turns, famPure(fam)); ctx.MQEv.on('battle'); T.inBeat = false;
      } else {
        if (!T.sev.forced) { sinceMon++; maxMonGap = Math.max(maxMonGap, sinceMon); }   // 保底加出的节拍不算
        const sev = T.sev, e = sev.e; day.events++; (day.seq = day.seq || []).push(e.cat + (T.sev.forced ? '!' : '') + (e.needs && e.cat !== 'arc' ? '*' : '')); if (e.cat === 'arc') { day.arcB = (day.arcB || 0) + 1; if (/_0$/.test(e.id)) arcStarted++; } catN[e.cat] = (catN[e.cat] || 0) + 1; if (!(e.id in first)) first[e.id] = d;
        if (!e.needs && e.cat === prevCat) { rep++; const k = e.cat + (T.sev.forced ? ':保底' : '') + (prevCaused ? ':前因后' : ''); repD[k] = (repD[k] || 0) + 1; } prevCat = e.cat; prevCaused = !!e.needs;   // 前因事件（任务链）可接同类；无前因事件不得与上一个事件同类
        if (e.cat === 'trip') { day.trips++; sinceTrip = 0; } else { sinceTrip++; maxTripGap = Math.max(maxTripGap, sinceTrip); }
        for (const s of e.steps || []) pureQ(1, s.gen || s.calc ? 1 : 0);
        if (e.market) { pureQ(1, 1); const g = MD.goods.filter(x => x.item && x.price <= Math.max(ST.cash, 15)); if (g.length && rnd() < 0.5) { const x = g[Math.floor(rnd() * g.length)]; ST.items[x.item] = (ST.items[x.item] || 0) + 1; } }   // 一半时候买一件带物品的货（物品链可达）
        ctx.MQEv.act((e.win || {}).do, sev.v); sev.done = true; T.inBeat = false;
      }
      return true;
    };
    const ML = C('tuning.json').mainline, drill = ML.drillPerOrder, mixPure = ['times', 'divide', 'add', 'fraction', 'decimal', 'mixed'].reduce((a, f) => a + famPure(f), 0) / 6;
    const shopQ = (n, share) => { for (let i = 0; i < n; i++) { while (beat()); day.q++; day.pure += share; ctx.MQEv.count(); sinceBeatQ++; } };   // 店内题：每题前问导演（页面每小步都问，v010a），计导演
    shopQ(rnd() < 0.8 ? 3 : 1, 1); word(1);          // 早上（v010a）：总数、差几个、几盒（纯算式；够了只 1 道）+ 付钱（文字题）
    for (let i = 0; i < nCust; i++) { T.idx = i; while (beat()); shopQ(1, 1); shopQ(drill, mixPure); word(1); }   // 每单：备料（纯算式）+ 打包连练 + 收钱（文字题）
    T.idx = nCust; T.phase = 'open';
    while (beat());
    if (rush) pureQ(10, rushPure);                   // 60 秒高峰约 10 题
    word(1);                                         // 晚上结账
    tot.q += day.q; tot.pure += day.pure; tot.events += day.events; tot.trips += day.trips; tot.monsters += day.monsters; if (!day.trips) tot.daysNoTrip++;
    perDay.push(day); arcDays.push(ctx.ST.arc ? ctx.ST.arc.id : (ctx.ST.arcRecent || [])[0]); arcBeatsDay.push(day.arcB || 0);
  }
  const free = ED.events.filter(e => !e.needs).map(e => e.id), never = free.filter(id => !(id in first));
  const r = {
    days, seed, acc,
    q_per_day: +(tot.q / days).toFixed(1),
    pure_share: +(tot.pure / tot.q).toFixed(3),
    beats_per_day: +(tot.beats / days).toFixed(2),
    events_per_day: +(tot.events / days).toFixed(2),
    trips_per_day: +(tot.trips / days).toFixed(2),
    monsters_per_day: +(tot.monsters / days).toFixed(2),
    monster_share: +(tot.monsters / Math.max(1, tot.beats)).toFixed(3),
    trip_share: +(tot.trips / Math.max(1, tot.events)).toFixed(3),
    days_without_trip: tot.daysNoTrip,
    max_trip_gap_events: maxTripGap,
    max_monster_gap_beats: maxMonGap,
    max_beat_gap_questions: maxBeatGapQ,
    same_cat_repeats: rep, repeat_detail: repD,
    cat_share: Object.fromEntries(Object.entries(catN).map(([k, n]) => [k, +(n / tot.events).toFixed(3)])),
    arc_beats_per_day: +(arcBeatsDay.reduce((a, b) => a + b, 0) / days).toFixed(2), arc_days_with_beat: arcBeatsDay.filter(Boolean).length, arcs_started: arcStarted,
    arc_distinct_per_30d: +(Array.from({ length: Math.floor(days / 30) }, (_, i) => new Set(arcDays.slice(i * 30, i * 30 + 30)).size).reduce((a, b) => a + b, 0) / Math.max(1, Math.floor(days / 30))).toFixed(1),
    arc_same_as_yesterday_days: arcDays.filter((x, i) => i && x === arcDays[i - 1]).length,
    free_events: free.length, never_seen: never,
    last_first_seen_day: Math.max(0, ...ED.events.filter(e => !e.needs && !e.needsItem && !e.needsPantry).map(e => first[e.id] ?? days + 1)),   // 不靠道具/水果篮的事件；靠道具的看 never_seen（取决于孩子买不买） late_events: Object.entries(first).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, d]) => k + '@' + d),
  };
  r.perDay = perDay;
  return r;
}
module.exports = { simulate, makeCtx, mulberry };
if (require.main === module) simulate().then(r => { delete r.perDay; fs.writeFileSync(path.join(__dirname, 'sim_report.json'), JSON.stringify(r, null, 1)); console.log(JSON.stringify(r, null, 1)); });
