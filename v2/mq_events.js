// mq_events.js — 通用场景事件执行器 v1（2026-11-27，P-20261126-maths-game）
// 读 content/events.json、scenes.json、tuning.json（节奏与保底只在 tuning.json）；一个事件 = 前因(needs 标记) → 场景 → 几道题 → 结果动作 → 回店。
// 新事件只写 JSON。动作词表（固定，加新词才改本文件）：cash 表达式 | stock 表达式 | flag 名 天数 [概率%] | state 名 天数 | cust 增减 天数 | item 名 | use 名（用掉一件）
// 依赖 index.html / mq_play.js 的全局：ST、T、LANG、panel、actors、hud、save、askMQ、serveNext、PG、R、read、MQGen、bookSpec、pickMonster；MQ_E = MQEngine.evalExpr。
const EVENTS_VERSION = 8;   // v8：参数改读 tuning.json（pacing、floors）；每天换场景保底 floors.tripPerDay（剩下的订单不够时提前出）；换场景到期时前因事件让路；v7：随机统一走 MQRng（rng.js）；每步的题进入时冻结在 T.sev.bound、答完的结果存 T.sev.res，画面只读 → 切换语言只重画、内容不变；地名/钱名/蛋糕名按当前语言在画面时算（lv）；v6：事件类别 cat + pacing.mix 比例与保底（换场景最多隔 3 拍必来、不连续同类）、奇幻水果篮 pantry（fruit/usefruit、needsPantry、$pantry 蛋糕）、蛋糕图鉴；v5： v5：事件随机蛋糕（MQCake，变量 cakeName/nFruit/tiers）；v4： v4：纯算式步（calc、gen 按水平出题）、蛋糕画面（show.cake）、needsItem/use 物品链、集市 market（买武器与怪东西要算找零）；v3： v3：导演按答题数出节拍（pacing.json），怪兽也归导演管（Jize 21:05 场景出得太少）；v2： v2：每天 2–3 个事件，分散在营业中（Jize 2026-11-27 21:00）
const MQEv = (() => {
  let ED = null, PD = null, MD = null, TU = null, FL = {};
  const ev = (x, v) => MQEngine.evalExpr(x, v);
  const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));
  const tx = o => (o && (o[LANG] || o.en)) || '';
  async function load() {
    const [e, s, p, m, ck] = await Promise.all([read('content/events.json'), read('content/scenes.json'), read('content/tuning.json'), read('content/market.json'), read('content/cakes.json')]);
    ED = JSON.parse(e); MQScene.load(JSON.parse(s)); TU = JSON.parse(p); PD = TU.pacing; FL = TU.floors || {}; MD = JSON.parse(m); if (typeof MQCake !== 'undefined') MQCake.load(JSON.parse(ck));
    ST.flags = ST.flags || {}; ST.states = ST.states || {}; ST.cust = ST.cust || []; ST.items = ST.items || {}; ST.pantry = ST.pantry || {}; ST.cakeBook = ST.cakeBook || { shape: {}, fruit: {}, style: {} };
    if (typeof document !== 'undefined' && !document.getElementById('cakeb')) { const bar = document.querySelector('.bar'); if (bar) { bar.insertAdjacentHTML('beforeend', '<button class="alt" id="cakeb" style="font-size:14px;padding:4px 10px"></button>'); document.getElementById('cakeb').onclick = () => cakeBook(); } }
  }
  // 变量：[lo,hi] 取整数；字符串是表达式（按书写顺序，可引用前面的变量）
  function vars(e, r = MQRng.r) {
    const v = {}; for (const [k, d] of Object.entries(e.vars || {})) v[k] = Array.isArray(d) ? d[0] + Math.floor(r() * (d[1] - d[0] + 1)) : ev(d, v);
    return v;   // 只存数；地名、钱名等文字在画面时由 lv() 按当前语言补上
  }
  function act(list, v) {
    for (const [op, a, b, pct] of list || []) {
      if (pct != null && !MQRng.chance(pct)) continue;
      if (op === 'cash') ST.cash += ev(a, v);
      else if (op === 'stock') ST.stock = Math.max(0, ST.stock + ev(a, v));
      else if (op === 'flag') ST.flags[a] = Math.max(ST.flags[a] ?? -1, b || 1);
      else if (op === 'state') ST.states[a] = Math.max(ST.states[a] ?? -1, b || 1);
      else if (op === 'cust') ST.cust.push([a, b || 1]);
      else if (op === 'item') ST.items[a] = (ST.items[a] || 0) + 1;
      else if (op === 'use') { ST.items[a] = Math.max(0, (ST.items[a] || 0) - 1); }
      else if (op === 'fruit') { ST.pantry[a] = (ST.pantry[a] || 0) + ev(b, v); if (ST.cakeBook) ST.cakeBook.fruit[a] = Math.max(1, ST.cakeBook.fruit[a] || 0); }
      else if (op === 'usefruit') { const f = a === '$cake' ? T.sev && T.sev.cake && T.sev.cake.fruit : a; if (f) ST.pantry[f] = Math.max(0, (ST.pantry[f] || 0) - ev(b, v)); }
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
    if (fix.fruit === '$pantry') { const [f, n] = Object.entries(ST.pantry || {}).sort((a, b) => b[1] - a[1])[0] || ['strawberry', 4]; const k = sev.v.k || 1; fix.fruit = f; fix.fruit2 = null; fix.nFruit = Math.max(1, Math.min(6, Math.floor(n / k))); sev.v.have = n; sev.fruitKey = f; }
    sev.cake = MQCake.random(sev.seed, fix); noteCake(sev.cake); Object.assign(sev.v, { nFruit: sev.cake.nFruit, tiers: sev.cake.tiers });
  }
  // 蛋糕图鉴：记下见过的形状、水果、装饰
  function noteCake(c) { if (!c || !ST.cakeBook) return; const b = ST.cakeBook; b.shape[c.shape] = (b.shape[c.shape] || 0) + 1; b.style[c.style] = (b.style[c.style] || 0) + 1; [c.fruit, c.fruit2].filter(Boolean).forEach(f => b.fruit[f] = (b.fruit[f] || 0) + 1); }
  function cakeBook() {
    const D = MQCake.data(), b = ST.cakeBook, L = o => o[LANG] || o.en, zh = LANG === 'zh';
    const cell = (art, label, n) => `<div style="width:92px;text-align:center;margin:3px;opacity:${n ? 1 : .35}">${art}<div class="note">${n ? label + ' ×' + n : '？？？'}</div></div>`;
    const shapes = Object.keys(D.shapes).map((k, i) => cell(MQCake.draw(MQCake.random(1000 + i, { shape: k, fruit: 'strawberry', fruit2: null, topper: 'none', pattern: 'none' })).replace('<svg', '<svg style="width:84px;height:78px"' + (b.shape[k] ? '' : ' filter="grayscale(1)"')), L(D.shapes[k]), b.shape[k] || 0)).join('');
    const fruits = Object.keys(D.fruits).map(k => cell(`<svg viewBox="-8 -8 16 16" style="width:40px;height:40px">${D.fruits[k].svg}</svg>`, L(D.fruits[k]) + (ST.pantry[k] ? ` 🧺${ST.pantry[k]}` : ''), b.fruit[k] || 0)).join('');
    const got = Object.keys(b.shape).length + Object.keys(b.fruit).length, all = Object.keys(D.shapes).length + Object.keys(D.fruits).length;
    panel(`<div class="say">${zh ? `🎂 蛋糕图鉴：已收集 <b>${got}</b> / ${all}（形状和水果）。做蛋糕、出门找水果就能点亮！` : `🎂 Cake book: <b>${got}</b> / ${all} shapes and fruits collected.`}</div>
      <div class="say"><b>${zh ? '形状' : 'Shapes'}</b></div><div style="display:flex;flex-wrap:wrap">${shapes}</div><div class="say"><b>${zh ? '水果（🧺 = 篮子里有几个）' : 'Fruits (🧺 = in your basket)'}</b></div><div style="display:flex;flex-wrap:wrap">${fruits}</div>
      <div class="row"><button id="bk">${zh ? '← 返回' : '← Back'}</button></div>`);
    document.getElementById('bk').onclick = () => { if (typeof CUR === 'function') CUR(); };
  }
  const pantryCount = () => Object.values(ST.pantry || {}).reduce((a, n) => a + n, 0);
  // ---- 导演（v3）：何时出事，只在这里决定；参数在 content/tuning.json pacing / floors ----
  // 按答题数计：每答 gap 道题来一次节拍；节拍 = 怪兽或场景事件（按 beats 权重，怪兽最多隔 monsterMaxGap 拍必来）；前因成立的事件优先；最近 3 个不重复。
  const rint = ([lo, hi]) => MQRng.int(lo, hi);
  function count() { if (!PD || (T && T.inBeat)) return; ST.since = (ST.since || 0) + 1; }
  // 选事件（v6）：前因成立的先出；否则先按 pacing.mix 选类别（不连续同类；换场景 trip 最多隔 tripMaxGap 拍必来），再在类别里按 p 选，最近 3 个不重复
  const has = e => (!e.needsItem || (ST.items[e.needsItem] || 0) > 0) && (!e.needsPantry || Object.values(ST.pantry || {}).some(n => n >= 2));
  function chooseEvent(forceCat) {
    const recent = ST.recentEv || [], free = ED.events.filter(x => !x.needs && has(x) && !recent.includes(x.id)), cats = {};
    free.forEach(x => (cats[x.cat || 'story'] = cats[x.cat || 'story'] || []).push(x));
    const tripDue = (ST.sinceTrip || 0) >= (PD.tripMaxGap || 99) && cats.trip;   // 换场景到期：前因事件让路
    const caused = ED.events.filter(e => e.needs && e.needs in ST.flags && has(e));
    let e = !forceCat && !tripDue ? caused[0] : null;
    if (e) delete ST.flags[e.needs];
    else {
      const mix = PD.mix || { story: 1 }; let names = Object.keys(cats).filter(c => mix[c]);
      if (PD.noRepeat && names.length > 1) names = names.filter(c => c !== ST.lastCat);
      let cat = forceCat && cats[forceCat] ? forceCat : tripDue ? 'trip' : null;
      if (!cat) { const tot = names.reduce((a, c) => a + mix[c], 0); let r = MQRng.r() * tot; cat = names.find(c => (r -= mix[c]) < 0) || names[0]; }
      const pool = cats[cat] || free, FR = TU.freshness || {}, seen = ST.evSeen || {}, wt = x => x.p * (x.needsItem ? (PD.itemBoost || 1) : 1) * (x.id in seen ? 1 + Math.min(FR.ageCap || 0, (ST.evN || 0) - seen[x.id]) / (FR.ageScale || 1e9) : (FR.neverSeen || 1)),   // 类内：没见过的、久没出的优先（tuning.freshness）
        tot = pool.reduce((a, x) => a + wt(x), 0); let r = MQRng.r() * tot, k = 0;   // 手里有道具的事件加权（买了指南针就快点用上）
      while ((r -= wt(pool[k])) > 0 && k < pool.length - 1) k++; e = pool[k];
    }
    ST.lastCat = e.cat; ST.sinceTrip = e.cat === 'trip' ? 0 : (ST.sinceTrip || 0) + 1; if (e.cat === 'trip' && T) T.trips = (T.trips || 0) + 1;
    ST.recentEv = [e.id, ...recent].slice(0, 3);
    ST.evN = (ST.evN || 0) + 1; ST.evSeen = ST.evSeen || {}; ST.evSeen[e.id] = ST.evN;
    const seed = MQRng.int(0, 1e9), v = vars(e), sev = { e, v, seed, done: false };
    cakeVars(sev); return sev;
  }
  function due() {
    if (!PD || !T || T.inBeat) return null;
    if (ST.gap == null) ST.gap = PD.first;
    // 每天换场景保底：今天还差 need 次、剩下的订单少于 2×need 时，不等题数，现在就出换场景
    const need = Math.max(0, (FL.tripPerDay || 0) - (T.trips || 0)), left = Math.max(0, (T.orders || []).length - (T.idx || 0)), force = need > 0 && left < (ST.lastCat === 'trip' ? need : 2 * need);   // 刚出过换场景就再等一单，避免连着两次
    if (!force && (ST.since || 0) < ST.gap) return null;
    ST.since = 0; ST.gap = rint(PD.gap); T.inBeat = true;
    const noMon = ST.beatsNoMon || 0, w = PD.beats, mon = !force && (noMon >= PD.monsterMaxGap || MQRng.r() * (w.event + w.monster) < w.monster);
    if (mon) { ST.beatsNoMon = 0; T.monster = { idx: pickMonster() }; T.monsterDone = false; return 'monster'; }
    if (!force) ST.beatsNoMon = noMon + 1; T.sev = chooseEvent(force && ST.lastCat !== 'trip' ? 'trip' : null); T.sev.forced = force; return 'event';   // 刚出过换场景：先插一个别类事件，下一拍再补换场景（不连续同类）   // 保底加出的节拍不算进“多久没怪兽”
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
  function crowd(e, v, sev) {
    const sh = e.show; if (!sh) return '';
    if (sh.cake && T.sev && T.sev.cake) return box(MQCake.draw(T.sev.cake), 170);
    if (sh.cake) { const c = {}; for (const [k, x] of Object.entries(sh.cake)) c[k] = typeof x === 'string' && x in v ? v[x] : x; return box(MQGen.cake(c), 150); }
    const [r, c] = sh.grid.map(k => v[k]), one = box(MQGen.monster(bookSpec(sev.crowd[0]), 'idle'), 40);
    const grid = `<div style="display:grid;grid-template-columns:repeat(${c},40px);gap:2px">${Array(r * c).fill(one).join('')}</div>`;
    const boss = sh.boss ? box(MQGen.monster(bookSpec(sev.crowd[1]), 'angry'), 110) : '';
    return `<div style="display:flex;align-items:flex-end;gap:6px">${boss}${grid}</div>`;
  }
  // 语言相关的变量在画面时才算（切换语言只重画、不重抽）
  function lv(sev) {
    const v = { ...sev.v }, sc = MQScene.data().scenes[sev.e.scene] || {};
    v.place = sc[LANG] || sc.en || ''; v.money = tx(sc.money) || (LANG === 'zh' ? '金币' : 'coins');
    if (sev.cake && typeof MQCake !== 'undefined') v.cakeName = MQCake.name(sev.cake, LANG);
    if (sev.fruitKey && typeof MQCake !== 'undefined') v.fruitName = MQCake.data().fruits[sev.fruitKey][LANG] || sev.fruitKey;
    return v;
  }
  // 冻结一步的题：第一次进入这一步时出题（取随机数）存进 sev.bound[key]，之后重画只读它
  function bind(sev, key, s) {
    sev.bound = sev.bound || {}; if (sev.bound[key]) return sev.bound[key];
    let b;
    if (s.gen) { const all = gensFor(s.gen, 'normal'), pure = all.filter(g => MQ.isPure(g)), pool = pure.length ? pure : all, g = MQRng.pick(pool); b = { gen: g, q: MQRng.with(() => MQ.makeQuestion(g)) }; }
    else b = { ans: ev(s.a, sev.v) };
    return (sev.bound[key] = b);
  }
  // 一道题：q+a = 情境题；calc+a = 纯算式（题面就是算式）；gen = 题型族（纯算式，按孩子水平自动出，../engine.js）
  // 答完的结果存 sev.res[key]；重画时已答的步直接显示结果和“继续”
  function ask(sev, s, key, done) {
    const e = sev.e, v = lv(sev), b = bind(sev, key, s); sev.res = sev.res || {};
    const base = { button: t2('check'), id: 'EV.' + e.id + '.' + key, scene: 'event:' + e.id, frozen: b };
    const after = (ok, show) => {
      $('msg2').innerHTML = (ok ? `<span class="good">✔</span>` : `<span class="bad">${LANG === 'zh' ? '答案是' : 'Answer:'} <b>${show}</b></span>`) + `<div class="row"><button id="nx3">${LANG === 'zh' ? '继续' : 'Next'}</button></div>`;
      $('nx3').onclick = () => done(ok);
    };
    const end = (ok, show) => { sev.res[key] = { ok, show: String(show) }; if (sev.buy && key === 'm') market(sev); else run(); return 'done'; };   // 结果由画面函数画（重画一致）
    const retry = (ok, att) => { if (!ok && att < 2) { $('msg2').innerHTML = `<span class="bad">${LANG === 'zh' ? '再想想？' : 'Try again?'}</span>`; return true; } };
    const lead = s.q ? fill(tx(s.q), v) : '';
    const shown = s.gen ? b.q.text : s.calc ? `${lead ? lead + '<br>' : ''}<b style="font-size:22px">${fill(s.calc, v)} = ?</b>` : lead;
    if (sev.res[key]) { $('qbox').innerHTML = `<div class="say">${shown}</div><div class="say" id="msg2"></div>`; return after(sev.res[key].ok, sev.res[key].show); }
    if (s.gen) {
      askMQ({ ...base, q: b.q, gen: b.gen, family: s.gen, onResult: (ok, q, att) => { updateLevel(s.gen, MQ.YEAR_OF[b.gen], ok, att); if (retry(ok, att)) return 'retry'; return end(ok, q.show); } });
      if (s.q) $('qbox').insertAdjacentHTML('afterbegin', `<div class="note">${lead}</div>`);
      return;
    }
    askMQ({ ...base, text: shown, answer: b.ans, family: s.fam || e.id, onResult: (ok, q, att) => { if (retry(ok, att)) return 'retry'; return end(ok, b.ans); } });
  }
  // 集市：从 market.json 抽 n 件（进入时抽一次，存 sev.goods）；买东西要算找零
  function goods(n) {
    const out = [], pool = MQRng.shuffle(MD.goods);
    for (const g of pool) {
      if (out.length >= n) break;
      if (g.kind === 'weapon') { const left = GD.weapons.filter(w => !ST.weapons.includes(w.id) && w.rarity === g.rarity); if (!left.length) continue; const w = MQRng.pick(left); out.push({ ...g, w, icon: '', en: w.en, zh: w.zh }); }
      else out.push({ ...g });
    }
    return out;
  }
  const goodArt = g => g.w ? box(MQGen.weapon(g.w), 44) : `<span style="font-size:34px">${g.icon}</span>`;
  function market(sev) {
    const e = sev.e; sev.goods = sev.goods || goods(e.market); const list = sev.goods;
    if (sev.buy) {
      const g = list[sev.buy.k], cash = sev.buy.cash;
      const s = { calc: `${cash} − ${g.price}`, a: String(cash - g.price), q: { zh: `你有 ${cash} 金币，买${g.zh}花 ${g.price}，还剩多少？`, en: `You have ${cash} coins. ${g.en} costs ${g.price}. How many left?` } };
      return ask(sev, s, 'm', () => {
        if (!sev.paid) { sev.paid = true; ST.cash -= g.price; if (g.w) ST.weapons.push(g.w.id); if (g.item) ST.items[g.item] = (ST.items[g.item] || 0) + 1; act(g.do, {}); }
        finish(sev, true, { icon: g.icon || '🗡️', en: g.en, zh: g.zh });
      });
    }
    $('qbox').innerHTML = `<div class="row" style="flex-wrap:wrap">${list.map((g, k) => `<button class="alt" data-g="${k}" style="display:flex;align-items:center;gap:6px">${goodArt(g)}<span style="text-align:left">${tx(g)}<br><b>🪙 ${g.price}</b>${g.note ? `<br><span class="note">${tx(g.note)}</span>` : ''}</span></button>`).join('')}</div><div class="row"><button id="nob">${LANG === 'zh' ? '不买了' : 'No thanks'}</button></div>`;
    $('nob').onclick = () => finish(sev, false);
    $('qbox').querySelectorAll('[data-g]').forEach(b => b.onclick = () => {
      const g = list[+b.dataset.g];
      if (ST.cash < g.price) { $('qbox').insertAdjacentHTML('beforeend', `<div class="say bad">${LANG === 'zh' ? `只有 ${ST.cash} 金币，不够买。` : `You only have ${ST.cash} coins.`}</div>`); return; }
      sev.buy = { k: +b.dataset.g, cash: ST.cash }; market(sev);
    });
  }
  // 结算只做一次（sev.end 记下结果），之后只画
  function finish(sev, forceWin, bought) {
    if (!sev.end) {
      const e = sev.e, win = forceWin ?? (sev.right || 0) >= (e.pass || e.steps.length), res = (win ? e.win : e.lose) || {}; act(res.do, sev.v);
      sev.end = { win, items: (res.do || []).filter(d => d[0] === 'item').map(d => d[1]), bought: bought || null };
      sev.done = true; T.inBeat = false; save();
    }
    showEnd(sev);
  }
  function showEnd(sev) {
    CUR = run; hud(); const e = sev.e, x = sev.end, res = (x.win ? e.win : e.lose) || { text: { en: '', zh: '' } };
    const got = x.items.map(k => { const it = ED.items[k] || {}; return `${it.icon || ''} ${tx(it)}`; }).concat(x.bought ? [`${x.bought.icon} ${tx(x.bought)}`] : []).join(LANG === 'zh' ? '，' : ', ');
    panel(`<div class="say ${x.win ? 'good' : ''}">${fill(tx(res.text), lv(sev))}</div>${got ? `<div class="say">🎁 ${got}</div>` : ''}<div class="row"><button id="nx">${LANG === 'zh' ? '回到店里 🔔' : 'Back to the shop 🔔'}</button></div>`);
    $('nx').onclick = () => serveNext();
  }
  // 画当前事件：进度（第几步、答对几道、是否结算）都在 T.sev 里，所以可随时重画（切换语言、重载存档）
  function run() {
    const sev = T.sev, e = sev.e; CUR = run; hud();
    if (e.show && e.show.grid && !sev.crowd) sev.crowd = [pickMonster(), pickMonster()];
    actors(PG('oops'), crowd(e, lv(sev), sev), '');
    if (sev.end) return showEnd(sev);
    panel(`<div class="say">${fill(tx(e.intro), lv(sev))}</div><div id="qbox"></div>`);
    sev.i = sev.i || 0; sev.right = sev.right || 0;
    if (sev.i < (e.steps || []).length) return ask(sev, e.steps[sev.i], sev.i, ok => { if (ok) sev.right++; sev.i++; run(); });
    if (e.market) return market(sev);
    finish(sev);
  }
  return { load, tick, count, due, chooseEvent, cakeVars, noteCake, cakeBook, pantryCount, on, run, pacing: () => PD, tuning: () => TU, backdrop, vars, lv, act, data: () => ED, EVENTS_VERSION };
})();
