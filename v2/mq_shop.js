// mq_shop.js — 甜品店主线 v1（2026-11-27，P-20261126-maths-game 迁移第 4 步，script_framework_v2.md §C）
// 一条因果线：订单（顾客 + 组合库蛋糕 + 数量）→ 早上：主要水果要几个 → 差几个 → 买几盒 → 付钱（其余原料企鹅代买）→ 每单：备料（要几个水果）→ 打包连练（按水平的纯算式）→ 收钱 → 晚上结账。
// 规则：随机只在进入一步时取（MQRng）；每步的答题结果存 T.res[key]、作答次数存 T.fz[key]，画面函数只画 → 可重画（切换语言、刷新）。
// 数据：content/cakes.json（ingredients、recipe、pricing）、tuning.json（orders、mainline）。依赖 index.html / mq_play.js 的全局：ST、T、LANG、CUR、panel、actors、hud、ask、askMQ、persist、save、serveNext、PG、A、DRAGONS、gensFor、updateLevel、MQ。
const SHOP_VERSION = 1;
const MQShop = (() => {
  const TU = () => MQEv.tuning(), CK = () => MQCake.data(), L = o => (o && (o[LANG] || o.en)) || '', zh = () => LANG === 'zh';
  const ING = () => CK().ingredients, BASICS = ['flour', 'egg', 'cream'];
  const isMagic = k => !!(CK().fruits[k] && CK().fruits[k].magic);
  // ---- 库存：草莓沿用 ST.stock（事件、怪兽偷东西都用它）；奇幻水果在 ST.pantry；其余在 ST.inv ----
  function have(k) { if (k === 'strawberry') return ST.stock; if (isMagic(k)) return (ST.pantry || {})[k] || 0; return (ST.inv || {})[k] || 0; }
  function add(k, n) { if (k === 'strawberry') ST.stock = Math.max(0, ST.stock + n); else if (isMagic(k)) ST.pantry[k] = Math.max(0, (ST.pantry[k] || 0) + n); else { ST.inv = ST.inv || {}; ST.inv[k] = Math.max(0, (ST.inv[k] || 0) + n); } }
  const nameOf = k => L(ING()[k] || CK().fruits[k]);
  const iconOf = k => ING()[k] ? ING()[k].icon : `<svg viewBox="-8 -8 16 16" style="width:22px;height:22px;vertical-align:middle">${CK().fruits[k].svg}</svg>`;
  const boxOf = k => ING()[k] ? ING()[k] : { box: ING().fruitBox.box, price: Math.max(1, T.price != null ? T.price : ING().fruitBox.price) };   // T.price = 今天水果每盒价（早上事件、店员会改）
  const level = () => { const v = Object.values(ST.ability || {}); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 3; };
  // ---- 订单 ----
  function fruitsToday() { let f = []; for (const [d, list] of TU().orders.fruitsByDay) if (ST.day >= d) f = list; return f; }
  function makeOrder(i) {
    const O = TU().orders, b = O.bands.find(x => level() <= x.maxLevel) || O.bands[O.bands.length - 1];
    const qty = MQRng.int(b.qty[0], b.qty[1]); let nF = MQRng.int(b.nFruit[0], b.nFruit[1]), fruit = MQRng.pick(fruitsToday());
    const magic = Object.entries(ST.pantry || {}).filter(([k, n]) => isMagic(k) && n >= qty * Math.min(nF, 3));
    if (magic.length && MQRng.chance(O.magicPct)) { fruit = MQRng.pick(magic)[0]; nF = Math.min(nF, Math.floor(have(fruit) / qty)); }   // 篮子里的奇幻水果够做这一单
    const fix = { fruit, fruit2: null, nFruit: nF, tiers: 1 };
    if (level() >= O.tierLevel && MQRng.chance(O.tierPct)) Object.assign(fix, { shape: 'layer', tiers: MQRng.int(2, 3) });
    return finish({ who: DRAGONS[(ST.day + i) % DRAGONS.length], kind: 'CAKE', qty, cake: MQCake.random(MQRng.int(0, 1e9), fix) });
  }
  function finish(o) { o.recipe = MQCake.recipe(o.cake); o.price = MQCake.price(o.cake); return o; }
  function makeOrders(n) { return Array.from({ length: n }, (_, i) => makeOrder(i)); }
  function tierUp(o) { o.cake = MQCake.random(MQRng.int(0, 1e9), { fruit: o.cake.fruit, fruit2: null, nFruit: Math.min(o.cake.nFruit, 10), shape: 'layer', tiers: MQRng.int(2, 3) }); return finish(o); }   // 早上“多层蛋糕”：把一单换成高难度订单
  // 每走完一小步问一次导演（每 2–3 题一拍，R1）；出了节拍，结束后 serveNext 会回到这里接着走
  function beatOr(render) { const b = MQEv.due(); if (b === 'monster') return battleIntro(); if (b === 'event') return MQEv.run(); render(); }
  const cakeArt = (c, w = 150) => MQCake.draw(c).replace('<svg', `<svg style="width:${w}px;height:${Math.round(w * 0.93)}px"`);
  // ---- 通用一步：纯算式题，答案进入时定好；结果存 T.res[key]；s.under/s.over 处理不对称（少了顾客不要、多了浪费） ----
  function step(key, s, done) {
    T.res = T.res || {}; T.fz = T.fz || {}; const fz = (T.fz[key] = T.fz[key] || {});
    T.cur = { key, ans: s.ans };   // 给自动试玩读答案用
    const shown = `${s.lead ? `<div class="note">${s.lead}</div>` : ''}<b style="font-size:22px">${s.calc} = ?</b>${s.tip ? `<div class="note">${s.tip}</div>` : ''}`;
    const after = r => {
      const m = r.ok ? `<span class="good">✔ ${s.good || ''}</span>` : `<span class="bad">${r.extra > 0 && s.overMsg ? s.overMsg(r.extra) : ''} ${zh() ? '答案是' : 'Answer:'} <b>${s.ans}</b></span>`;
      $('msg2').innerHTML = m + `<div class="row"><button id="nx3">${s.next || (zh() ? '继续' : 'Next')}</button></div>`; $('nx3').onclick = () => done(r);
    };
    if (T.res[key]) { $('qbox').innerHTML = `<div class="say">${shown}</div><div class="say" id="msg2"></div>`; return after(T.res[key]); }
    askMQ({ text: shown, answer: s.ans, frozen: fz, family: s.fam || 'shop', id: 'SHOP.' + key.replace(/\d+/g, ''), scene: 'shop', button: s.button || t2('check'), onResult: (ok, q, att) => {
      const v = Number(String(($('ans2') || {}).value || '').replace(/[🪙,\s]/g, ''));
      if (!ok && s.underMsg && v < s.ans && att < 3) { $('msg2').innerHTML = `<span class="bad">${s.underMsg}</span>`; return 'retry'; }
      if (!ok && !s.underMsg && att < 2) { $('msg2').innerHTML = `<span class="bad">${zh() ? '再想想？' : 'Try again?'}</span>`; return 'retry'; }
      const r = { ok, v, extra: ok ? 0 : v - s.ans }; T.res[key] = r; if (s.apply) s.apply(r); persist(); if (CUR) CUR(); return 'done';
    } });
  }
  // ---- 早上：订单板 + 进货链 ----
  function plan() {
    const need = {}; T.orders.forEach(o => Object.entries(o.recipe).forEach(([k, n]) => { need[k] = (need[k] || 0) + o.qty * n; }));
    const fruits = Object.keys(need).filter(k => CK().fruits[k] && !isMagic(k)).sort((a, b) => need[b] - need[a]);
    const feat = fruits[0] || 'strawberry', terms = T.orders.filter(o => o.recipe[feat]).map(o => [o.qty, o.recipe[feat]]);
    return { need, feat, terms, have0: have(feat), stage: 'need' };
  }
  function board() {
    return `<div style="display:flex;flex-wrap:wrap;gap:4px">${T.orders.map(o => `<div style="width:118px;text-align:center;background:#fff;border-radius:10px;padding:3px">${cakeArt(o.cake, 84)}<div class="note" style="font-size:12px">${o.who}<br><b>×${o.qty}</b> · ${iconOf(o.cake.fruit)}${o.cake.nFruit} · 🪙${o.price}</div></div>`).join('')}</div>`;   // 每单：数量 · 每个蛋糕放的水果 · 单价
  }
  function morning() {
    CUR = morning; T.phase = 'morning'; hud(); T.am = T.am || plan(); const P = T.am, k = P.feat, nm = nameOf(k), bx = boxOf(k);
    actors(PG(), typeof helperArt === 'function' ? helperArt() : '', A.dragon(T.orders[0].who));
    const head = `${typeof helperBlock === 'function' ? helperBlock() : ''}${T.ev ? `<div class="hint">${T.ev.icon} ${T.ev[LANG]}${T.ev.lost != null ? ' (−' + T.ev.lost + ' 🍓)' : ''}</div>` : ''}${ST.spoiled ? `<div class="note">${t('spoiled')(ST.spoiled)}</div>` : ''}
      <div class="say"><span class="who">${t('penguin')}:</span> ${zh() ? '今天的订单：' : "Today's orders:"}</div>${board()}`;
    const short = Math.max(0, P.need[k] - P.have0), boxes = Math.ceil(short / bx.box);
    if (P.stage === 'need') {
      panel(head + '<div id="qbox"></div>');
      return step('am.need', { calc: P.terms.map(([a, b]) => `${a} × ${b}`).join(' + '), ans: P.need[k], fam: 'mixed',
        lead: zh() ? `${iconOf(k)} 今天的蛋糕一共要几个${nm}？（每单：数量 × 每个蛋糕放几个）` : `${iconOf(k)} How many ${nm} do today's cakes need altogether? (each order: number × per cake)` },
        () => { P.stage = short > 0 ? 'short' : 'auto'; beatOr(morning); });
    }
    if (P.stage === 'short') {
      panel(head + '<div id="qbox"></div>');
      return step('am.short', { calc: `${P.need[k]} − ${P.have0}`, ans: short, fam: 'add',
        lead: zh() ? `店里有 ${iconOf(k)} ${P.have0} 个，要 ${P.need[k]} 个。还差几个？` : `We have ${iconOf(k)} ${P.have0}, we need ${P.need[k]}. How many more?` },
        () => { P.stage = 'boxes'; beatOr(morning); });
    }
    if (P.stage === 'boxes') {
      panel(head + '<div id="qbox"></div>');
      return step('am.boxes', { calc: `${short} ÷ ${bx.box}`, ans: boxes, fam: 'divide',
        lead: zh() ? `${nm}每盒 ${bx.box} 个。至少要买几盒？` : `${nm} come in boxes of ${bx.box}. How many boxes at least?`, tip: zh() ? '有余数就要多买一盒（向上取整）' : 'If there is a remainder, buy one more box (round up)' },
        () => { P.stage = 'pay'; beatOr(morning); });
    }
    if (P.stage === 'pay') {
      const correct = boxes * bx.price;
      actors(PG(), '', '<div style="font-size:70px">🧑‍🌾</div>');
      return ask('IT.L1.BIZ.BUY', { n: boxes, k: bx.price }, { key: 'am.pay', speaker: t('farmer'), button: t('pay'),
        onAnswer: v => { if (v < correct) { $('msg').innerHTML = `<span class="bad">${t('notenough')}</span>`; return 'reject'; } $('msg').innerHTML = `<span class="bad">${t('kept')(v - correct)}</span>`; return 'accept'; },
        onDone: v => { if (!P.paid) { P.paid = true; ST.cash -= v; T.spent += v; add(k, boxes * bx.box); hud(); persist(); } P.stage = 'auto'; morning(); } });
    }
    // 其余原料企鹅代买（只买缺的整盒），结算一次
    if (!P.auto) {
      P.auto = []; for (const [g, n] of Object.entries(P.need)) { if (g === k || isMagic(g)) continue; const sh = n - have(g); if (sh <= 0) continue; const b = boxOf(g), m = Math.ceil(sh / b.box), c = m * b.price; ST.cash -= c; T.spent += c; add(g, m * b.box); P.auto.push([g, m, c]); }
      hud(); persist();
    }
    const list = P.auto.map(([g, m, c]) => `${iconOf(g)} ${m} ${zh() ? '盒' : 'box' + (m > 1 ? 'es' : '')}（🪙${c}）`).join('，');
    panel(head + `<div class="say">${P.auto.length ? (zh() ? `🐧 其余原料我去买好了：${list}` : `🐧 I bought the rest: ${list}`) : (zh() ? '🐧 其余原料都够了。' : '🐧 We have everything else.')}</div>
      <div class="note">${stockLine()}</div><div class="row"><button id="open">${t('opennow')}</button></div>`);
    $('open').onclick = () => { P.opened = true; serveNext(); };
  }
  const stockLine = () => [...new Set(['strawberry', ...fruitsToday(), ...BASICS, ...Object.keys(ST.pantry || {}).filter(k => (ST.pantry[k] || 0) > 0)])].map(k => `${iconOf(k)} ${have(k)}`).join('　');
  // ---- 每单：备料 → 打包连练 → 收钱 ----
  function serve() {
    CUR = serve; hud(); const i = T.idx, o = T.orders[i], c = o.cake, k = c.fruit, nm = nameOf(k), need = o.qty * c.nFruit;
    o.stage = o.stage || 'make';
    actors(PG(), cakeArt(c), A.dragon(o.who));
    const ask1 = `<div class="say"><span class="who">${o.who}:</span> ${zh() ? `我要 <b>${o.qty}</b> 个${MQCake.name(c, 'zh')}！` : `I'd like <b>${o.qty}</b> × ${MQCake.name(c, 'en')}, please!`}</div>`;
    if (o.stage === 'make') {
      if (have(k) < need && !(T.res || {})['o' + i + '.make']) {   // 水果不够：补货或让顾客走
        if (isMagic(k)) { panel(ask1 + `<div class="say bad">${zh() ? `${nm}只有 ${have(k)} 个，买不到，只能下次了。` : `Only ${have(k)} ${nm} — can't buy them here.`}</div><div class="row"><button id="nx">${t('letgo')}</button></div>`); $('nx').onclick = () => { T.lost++; T.idx++; serveNext(); }; return; }
        const bx = boxOf(k), m0 = Math.ceil((need - have(k)) / bx.box); let m = (T.restockN = T.restockN || m0);
        panel(ask1 + `<div class="say bad">${zh() ? `🐧 我们只有 ${iconOf(k)} ${have(k)} 个，这一单要 ${need} 个！` : `🐧 We only have ${iconOf(k)} ${have(k)}, this order needs ${need}!`}</div>
          <div class="row">${zh() ? '买几盒？' : 'Boxes:'} <button class="alt" id="minus">−</button><b id="pn" style="font-size:24px">${m}</b><button class="alt" id="plus">+</button><button id="restock">${t('restock')}</button><button class="alt" id="nx">${t('letgo')}</button></div>`);
        $('minus').onclick = () => { m = T.restockN = Math.max(1, m - 1); $('pn').textContent = m; }; $('plus').onclick = () => { m = T.restockN = Math.min(12, m + 1); $('pn').textContent = m; };
        $('nx').onclick = () => { T.lost++; T.idx++; T.restockN = null; serveNext(); };
        $('restock').onclick = () => restock(k, m);
        return;
      }
      panel(ask1 + '<div id="qbox"></div>');
      return step('o' + i + '.make', { calc: `${o.qty} × ${c.nFruit}`, ans: need, fam: 'times', button: t('bake'),
        lead: zh() ? `${o.qty} 个蛋糕，每个放 ${c.nFruit} 个${nm}。一共拿几个？` : `${o.qty} cakes, ${c.nFruit} ${nm} on each. How many altogether?`,
        underMsg: t('toofew')(o.who), overMsg: d => t('toomany')(o.who, d), good: t('perfect')(o.who),
        apply: r => { add(k, -Math.min(have(k), r.ok ? need : Math.max(need, r.v))); Object.entries(o.recipe).forEach(([g, n]) => { if (g !== k) add(g, -o.qty * n); }); MQEv.noteCake(c); hud(); } },
        () => { o.stage = 'drill'; o.drill = 0; beatOr(serve); });
    }
    if (o.stage === 'drill' && (o.drill || 0) < TU().mainline.drillPerOrder) {
      const key = 'o' + i + '.d' + o.drill; T.bindD = T.bindD || {};
      if (!T.bindD[key]) { const fams = Object.entries(TU().mainline.families), tot = fams.reduce((a, f) => a + f[1], 0); let r = MQRng.r() * tot, fam = fams[0][0]; for (const [f, w] of fams) { if ((r -= w) < 0) { fam = f; break; } }
        const all = gensFor(fam, 'normal'), pure = all.filter(g => MQ.isPure(g)), g = MQRng.pick(pure.length ? pure : all); T.bindD[key] = { fam, gen: g, q: MQRng.with(() => MQ.makeQuestion(g)) }; }
      const b = T.bindD[key]; T.cur = { key, ans: b.q.show };
      panel(`<div class="say">📦 ${zh() ? `装盒前，帮企鹅算一道：` : 'Before boxing up, one quick sum:'}</div><div id="qbox"></div>`);
      const nextD = () => { o.drill++; beatOr(serve); };
      if ((T.res || {})[key]) { const r = T.res[key]; $('qbox').innerHTML = `<div class="say">${b.q.text}</div><div class="say" id="msg2">${r.ok ? '<span class="good">✔</span>' : `<span class="bad">${zh() ? '答案是' : 'Answer:'} <b>${b.q.show}</b></span>`}<div class="row"><button id="nx3">${zh() ? '继续' : 'Next'}</button></div></div>`; $('nx3').onclick = nextD; return; }
      T.fz = T.fz || {}; const fz = (T.fz[key] = T.fz[key] || {});
      return askMQ({ q: b.q, frozen: fz, gen: b.gen, family: b.fam, scene: 'shop-drill', button: t2('check'), onResult: (ok, q, att) => {
        updateLevel(b.fam, MQ.YEAR_OF[b.gen], ok, att);
        if (!ok && att < 2) { $('msg2').innerHTML = `<span class="bad">${zh() ? '再想想？' : 'Try again?'}</span>`; return 'retry'; }
        T.res = T.res || {}; T.res[key] = { ok }; persist(); if (CUR) CUR(); return 'done';
      } });
    }
    return charge(o);   // index.html 的收钱（文字题，少收顾客高兴、多收顾客不干）
  }
  function restock(k, m) {
    const bx = boxOf(k), correct = m * bx.price, key = 'rs.' + T.idx + '.' + m;
    CUR = () => restock(k, m); actors(PG(), '', '<div style="font-size:70px">🧑‍🌾</div>');
    ask('IT.L1.BIZ.BUY', { n: m, k: bx.price }, { key, speaker: t('farmer'), button: t('pay'),
      onAnswer: v => { if (v < correct) { $('msg').innerHTML = `<span class="bad">${t('notenough')}</span>`; return 'reject'; } $('msg').innerHTML = `<span class="bad">${t('kept')(v - correct)}</span>`; return 'accept'; },
      onDone: v => { ST.cash -= v; T.spent += v; add(k, m * bx.box); T.restockN = null; hud(); persist(); $('msg').innerHTML += `<div class="row"><button id="nx">${t('opennow')}</button></div>`; CUR = serve; $('nx').onclick = serve; } });
  }
  return { SHOP_VERSION, makeOrders, tierUp, morning, serve, have, add, stockLine, level, fruitsToday };
})();
