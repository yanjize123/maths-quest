// mq_events.js — 通用场景事件执行器 v1（2026-11-27，P-20261126-maths-game）
// 读 content/events.json、scenes.json、pacing.json；一个事件 = 前因(needs 标记) → 场景 → 几道题 → 结果动作 → 回店。
// 新事件只写 JSON。动作词表（固定，加新词才改本文件）：cash 表达式 | stock 表达式 | flag 名 天数 [概率%] | state 名 天数 | cust 增减 天数 | item 名 | use 名（用掉一件）
// 依赖 index.html / mq_play.js 的全局：ST、T、LANG、panel、actors、hud、save、askMQ、serveNext、PG、R、read、MQGen、bookSpec、pickMonster；MQ_E = MQEngine.evalExpr。
const EVENTS_VERSION = 5;   // v5：事件随机蛋糕（MQCake，变量 cakeName/nFruit/tiers）；v4： v4：纯算式步（calc、gen 按水平出题）、蛋糕画面（show.cake）、needsItem/use 物品链、集市 market（买武器与怪东西要算找零）；v3： v3：导演按答题数出节拍（pacing.json），怪兽也归导演管（Jize 21:05 场景出得太少）；v2： v2：每天 2–3 个事件，分散在营业中（Jize 2026-11-27 21:00）
const MQEv = (() => {
  let ED = null, PD = null, MD = null;
  const ev = (x, v) => MQEngine.evalExpr(x, v);
  const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));
  const tx = o => (o && (o[LANG] || o.en)) || '';
  async function load() {
    const [e, s, p, m, ck] = await Promise.all([read('content/events.json'), read('content/scenes.json'), read('content/pacing.json'), read('content/market.json'), read('content/cakes.json')]);
    ED = JSON.parse(e); MQScene.load(JSON.parse(s)); PD = JSON.parse(p); MD = JSON.parse(m); if (typeof MQCake !== 'undefined') MQCake.load(JSON.parse(ck));
    ST.flags = ST.flags || {}; ST.states = ST.states || {}; ST.cust = ST.cust || []; ST.items = ST.items || {};
  }
  // 变量：[lo,hi] 取整数；字符串是表达式（按书写顺序，可引用前面的变量）
  function vars(e, r = Math.random) {
    const v = {}; for (const [k, d] of Object.entries(e.vars || {})) v[k] = Array.isArray(d) ? d[0] + Math.floor(r() * (d[1] - d[0] + 1)) : ev(d, v);
    const sc = MQScene.data().scenes[e.scene] || {}; v.place = sc[LANG] || sc.en || ''; v.money = tx(sc.money) || (LANG === 'zh' ? '金币' : 'coins');
    return v;
  }
  function act(list, v) {
    for (const [op, a, b, pct] of list || []) {
      if (pct != null && Math.random() * 100 >= pct) continue;
      if (op === 'cash') ST.cash += ev(a, v);
      else if (op === 'stock') ST.stock = Math.max(0, ST.stock + ev(a, v));
      else if (op === 'flag') ST.flags[a] = Math.max(ST.flags[a] ?? -1, b || 1);
      else if (op === 'state') ST.states[a] = Math.max(ST.states[a] ?? -1, b || 1);
      else if (op === 'cust') ST.cust.push([a, b || 1]);
      else if (op === 'item') ST.items[a] = (ST.items[a] || 0) + 1;
      else if (op === 'use') { ST.items[a] = Math.max(0, (ST.items[a] || 0) - 1); }
    }
  }
  const on = name => { if (name === 'battle' && T) T.inBeat = false; if (ED) act(ED.on[name], {}); };
  // 每天开始：计数减一；返回今天的顾客增减
  function tick() {
    if (!ED) return 0;
    for (const o of [ST.flags, ST.states]) for (const k of Object.keys(o)) if (--o[k] < 0) delete o[k];   // 值 = 还剩几天（0 = 今天最后一天）
    const d = ST.cust.reduce((s, c) => s + c[0], 0); ST.cust = ST.cust.map(c => [c[0], c[1] - 1]).filter(c => c[1] > 0); return d;
  }
  // 事件里的随机蛋糕：show.cake 没写 type 时用 MQCake 组合库（写了的字段固定，值可写变量名）；蛋糕数据进变量 {cakeName} {nFruit} {tiers}
  function cakeVars(sev) {
    const c = sev.e.show && sev.e.show.cake; if (!c || c.type || typeof MQCake === 'undefined' || !MQCake.data()) return;
    const fix = {}; for (const [k, x] of Object.entries(c)) fix[k] = typeof x === 'string' && x in sev.v ? sev.v[x] : x;
    sev.cake = MQCake.random(sev.seed, fix); Object.assign(sev.v, { cakeName: MQCake.name(sev.cake, LANG), nFruit: sev.cake.nFruit, tiers: sev.cake.tiers });
  }
  // ---- 导演（v3）：何时出事，只在这里决定；参数在 content/pacing.json ----
  // 按答题数计：每答 gap 道题来一次节拍；节拍 = 怪兽或场景事件（按 beats 权重，怪兽最多隔 monsterMaxGap 拍必来）；前因成立的事件优先；最近 3 个不重复。
  const rint = ([lo, hi]) => lo + Math.floor(Math.random() * (hi - lo + 1));
  function count() { if (!PD || (T && T.inBeat)) return; ST.since = (ST.since || 0) + 1; }
  function chooseEvent() {
    const has = e => !e.needsItem || (ST.items[e.needsItem] || 0) > 0, recent = ST.recentEv || [], caused = ED.events.filter(e => e.needs && e.needs in ST.flags && has(e));
    let e = caused[0];
    if (e) delete ST.flags[e.needs];
    else {
      const pool = ED.events.filter(x => !x.needs && has(x) && !recent.includes(x.id)), tot = pool.reduce((a, x) => a + x.p, 0); let r = Math.random() * tot, k = 0;
      while ((r -= pool[k].p) > 0 && k < pool.length - 1) k++; e = pool[k];
    }
    ST.recentEv = [e.id, ...recent].slice(0, 3);
    const seed = (Math.random() * 1e9) | 0, v = vars(e), sev = { e, v, seed, done: false };
    cakeVars(sev); return sev;
  }
  function due() {
    if (!PD || !T || T.inBeat) return null;
    if (ST.gap == null) ST.gap = PD.first;
    if ((ST.since || 0) < ST.gap) return null;
    ST.since = 0; ST.gap = rint(PD.gap); T.inBeat = true;
    const noMon = ST.beatsNoMon || 0, w = PD.beats, mon = noMon >= PD.monsterMaxGap || Math.random() * (w.event + w.monster) < w.monster;
    if (mon) { ST.beatsNoMon = 0; T.monster = { idx: pickMonster() }; T.monsterDone = false; return 'monster'; }
    ST.beatsNoMon = noMon + 1; T.sev = chooseEvent(); return 'event';
  }
  // 当前画面：事件里用事件场景，否则店内 + 持续状态
  function backdrop(shopSvg, shelf) {
    const sev = T && T.sev && !T.sev.done ? T.sev : null;
    const states = Object.keys(ST.states || {}).concat(sev && sev.e.states || []);
    if (sev && sev.e.scene !== 'shop') { sev.look = sev.look || MQScene.roll(sev.e.scene, sev.seed); return MQScene.render(sev.look, states, shelf); }
    return MQScene.overlay(shopSvg, states);
  }
  const box = (svg, n) => `<span style="display:inline-block;width:${n}px;height:${n}px">${svg.replace('<svg', '<svg style="width:100%;height:100%"')}</span>`;
  // 画面中间：群怪（show.grid/boss）或蛋糕（show.cake，字段值可写变量名）
  function crowd(e, v) {
    const sh = e.show; if (!sh) return '';
    if (sh.cake && T.sev && T.sev.cake) return box(MQCake.draw(T.sev.cake), 170);
    if (sh.cake) { const c = {}; for (const [k, x] of Object.entries(sh.cake)) c[k] = typeof x === 'string' && x in v ? v[x] : x; return box(MQGen.cake(c), 150); }
    const [r, c] = sh.grid.map(k => v[k]), one = box(MQGen.monster(bookSpec(pickMonster()), 'idle'), 40);
    const grid = `<div style="display:grid;grid-template-columns:repeat(${c},40px);gap:2px">${Array(r * c).fill(one).join('')}</div>`;
    const boss = sh.boss ? box(MQGen.monster(bookSpec(pickMonster()), 'angry'), 110) : '';
    return `<div style="display:flex;align-items:flex-end;gap:6px">${boss}${grid}</div>`;
  }
  // 一道题：q+a = 情境题；calc+a = 纯算式（题面就是算式）；gen = 题型族（纯算式，按孩子水平自动出，../engine.js）
  function ask(e, s, i, v, done) {
    const base = { button: t2('check'), id: 'EV.' + e.id + '.' + i, scene: 'event:' + e.id };
    const after = (ok, show) => {
      $('msg2').innerHTML = (ok ? `<span class="good">✔</span>` : `<span class="bad">${LANG === 'zh' ? '答案是' : 'Answer:'} <b>${show}</b></span>`) + `<div class="row"><button id="nx3">${LANG === 'zh' ? '继续' : 'Next'}</button></div>`;
      $('nx3').onclick = () => done(ok);
    };
    const retry = (ok, att) => { if (!ok && att < 2) { $('msg2').innerHTML = `<span class="bad">${LANG === 'zh' ? '再想想？' : 'Try again?'}</span>`; return true; } };
    const lead = s.q ? fill(tx(s.q), v) : s.calc ? '' : '';
    if (s.gen) {
      const all = gensFor(s.gen, 'normal'), pure = all.filter(g => MQ.isPure(g)), pool = pure.length ? pure : all, g = pool[Math.floor(Math.random() * pool.length)];
      const q = askMQ({ ...base, gen: g, family: s.gen, onResult: (ok, q, att) => { updateLevel(s.gen, MQ.YEAR_OF[g], ok, att); if (retry(ok, att)) return 'retry'; after(ok, q.show); return 'done'; } });
      if (s.q) $('qbox').insertAdjacentHTML('afterbegin', `<div class="note">${lead}</div>`);
      return q;
    }
    const ans = ev(s.a, v), text = s.calc ? `${lead ? lead + '<br>' : ''}<b style="font-size:22px">${fill(s.calc, v)} = ?</b>` : lead;
    askMQ({ ...base, text, answer: ans, family: s.fam || e.id, onResult: (ok, q, att) => { if (retry(ok, att)) return 'retry'; after(ok, ans); return 'done'; } });
  }
  // 集市：从 market.json 抽 n 件；买东西要算找零
  function goods(n) {
    const out = [], pool = [...MD.goods].sort(() => Math.random() - .5);
    for (const g of pool) {
      if (out.length >= n) break;
      if (g.kind === 'weapon') { const left = GD.weapons.filter(w => !ST.weapons.includes(w.id) && w.rarity === g.rarity); if (!left.length) continue; const w = left[Math.floor(Math.random() * left.length)]; out.push({ ...g, w, icon: '', en: w.en, zh: w.zh, art: box(MQGen.weapon(w), 44) }); }
      else out.push({ ...g, art: `<span style="font-size:34px">${g.icon}</span>` });
    }
    return out;
  }
  function market(e, v, end) {
    const list = goods(e.market);
    $('qbox').innerHTML = `<div class="row" style="flex-wrap:wrap">${list.map((g, k) => `<button class="alt" data-g="${k}" style="display:flex;align-items:center;gap:6px">${g.art}<span style="text-align:left">${tx(g)}<br><b>🪙 ${g.price}</b>${g.note ? `<br><span class="note">${tx(g.note)}</span>` : ''}</span></button>`).join('')}</div><div class="row"><button id="nob">${LANG === 'zh' ? '不买了' : 'No thanks'}</button></div>`;
    $('nob').onclick = () => end(false);
    $('qbox').querySelectorAll('[data-g]').forEach(b => b.onclick = () => {
      const g = list[+b.dataset.g], cash = ST.cash;
      if (cash < g.price) { $('qbox').insertAdjacentHTML('beforeend', `<div class="say bad">${LANG === 'zh' ? `只有 ${cash} 金币，不够买。` : `You only have ${cash} coins.`}</div>`); return; }
      const s = { calc: `${cash} − ${g.price}`, a: String(cash - g.price), q: LANG === 'zh' ? { zh: `你有 ${cash} 金币，买${g.zh}花 ${g.price}，还剩多少？` } : { en: `You have ${cash} coins. ${g.en} costs ${g.price}. How many left?` } };
      ask(e, s, 0, {}, ok => {
        ST.cash -= g.price;
        if (g.w) ST.weapons.push(g.w.id); if (g.item) ST.items[g.item] = (ST.items[g.item] || 0) + 1; act(g.do, {});
        end(true, `${g.icon || '🗡️'} ${tx(g)}`);
      });
    });
  }
  function run() {
    const { e, v } = T.sev; hud();
    actors(PG('oops'), crowd(e, v), '');
    panel(`<div class="say">${fill(tx(e.intro), v)}</div><div id="qbox"></div>`);
    let i = 0, right = 0;
    const finish = (forceWin, bought) => {
      const win = forceWin ?? right >= (e.pass || e.steps.length), res = (win ? e.win : e.lose) || { text: { en: '', zh: '' } }; act(res.do, v);
      const got = (res.do || []).filter(d => d[0] === 'item').map(d => { const it = ED.items[d[1]] || {}; return `${it.icon || ''} ${tx(it)}`; }).concat(bought ? [bought] : []).join('，');
      T.sev.done = true; T.inBeat = false; save(); hud();
      panel(`<div class="say ${win ? 'good' : ''}">${fill(tx(res.text), v)}</div>${got ? `<div class="say">🎁 ${got}</div>` : ''}<div class="row"><button id="nx">${LANG === 'zh' ? '回到店里 🔔' : 'Back to the shop 🔔'}</button></div>`);
      $('nx').onclick = () => serveNext();
    };
    const step = () => { if (i >= (e.steps || []).length) return e.market ? market(e, v, finish) : finish(); ask(e, e.steps[i], i, v, ok => { if (ok) right++; i++; step(); }); };
    step();
  }
  return { load, tick, count, due, chooseEvent, cakeVars, on, run, pacing: () => PD, backdrop, vars, act, data: () => ED, EVENTS_VERSION };
})();
