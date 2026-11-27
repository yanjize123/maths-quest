// mq_events.js — 通用场景事件执行器 v1（2026-11-27，P-20261126-maths-game）
// 读 content/events.json 与 content/scenes.json；一个事件 = 前因(needs 标记) → 场景 → 几道题 → 结果动作 → 回店。
// 新事件只写 JSON。动作词表（固定，加新词才改本文件）：cash 表达式 | stock 表达式 | flag 名 天数 [概率%] | state 名 天数 | cust 增减 天数 | item 名
// 依赖 index.html / mq_play.js 的全局：ST、T、LANG、panel、actors、hud、save、askMQ、serveNext、PG、R、read、MQGen、bookSpec、pickMonster；MQ_E = MQEngine.evalExpr。
const EVENTS_VERSION = 2;   // v2：每天 2–3 个事件，分散在营业中（Jize 2026-11-27 21:00）
const MQEv = (() => {
  let ED = null;
  const ev = (x, v) => MQEngine.evalExpr(x, v);
  const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));
  const tx = o => (o && (o[LANG] || o.en)) || '';
  async function load() {
    const [e, s] = await Promise.all([read('content/events.json'), read('content/scenes.json')]);
    ED = JSON.parse(e); MQScene.load(JSON.parse(s));
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
    }
  }
  const on = name => ED && act(ED.on[name], {});
  // 每天开始：计数减一；返回今天的顾客增减
  function tick() {
    if (!ED) return 0;
    for (const o of [ST.flags, ST.states]) for (const k of Object.keys(o)) if (--o[k] < 0) delete o[k];   // 值 = 还剩几天（0 = 今天最后一天）
    const d = ST.cust.reduce((s, c) => s + c[0], 0); ST.cust = ST.cust.map(c => [c[0], c[1] - 1]).filter(c => c[1] > 0); return d;
  }
  // 选今天的事件（v2）：每天 perDay 个；前因成立的先排，其余按 p 加权抽、不重复；分散到营业开头、中间、结尾
  function pickDay(nOrders) {
    if (!ED) return [];
    const [lo, hi] = ED.perDay || [1, 1], n = lo + Math.floor(Math.random() * (hi - lo + 1));
    const out = ED.events.filter(e => e.needs && e.needs in ST.flags);
    out.forEach(e => delete ST.flags[e.needs]);
    let pool = ED.events.filter(e => !e.needs && !out.includes(e));
    while (out.length < n && pool.length) {
      const tot = pool.reduce((a, e) => a + e.p, 0); let r = Math.random() * tot, k = 0;
      while ((r -= pool[k].p) > 0) k++;
      out.push(pool[k]); pool = pool.filter((_, i) => i !== k);
    }
    const slots = [0, Math.max(1, Math.floor(nOrders / 2)), nOrders];
    return out.map((e, i) => ({ e, v: vars(e), seed: (Math.random() * 1e9) | 0, at: slots[Math.min(i, 2)], done: false }));
  }
  const due = () => (T.sevs || []).find(x => !x.done && x.at <= T.idx);
  // 当前画面：事件里用事件场景，否则店内 + 持续状态
  function backdrop(shopSvg, shelf) {
    const sev = T && T.sev && !T.sev.done ? T.sev : null;
    const states = Object.keys(ST.states || {}).concat(sev && sev.e.states || []);
    if (sev && sev.e.scene !== 'shop') { sev.look = sev.look || MQScene.roll(sev.e.scene, sev.seed); return MQScene.render(sev.look, states, shelf); }
    return MQScene.overlay(shopSvg, states);
  }
  function crowd(e, v) {
    if (!e.show) return '';
    const [r, c] = e.show.grid.map(k => v[k]), s = bookSpec(pickMonster()), box = (svg, n) => `<span style="display:inline-block;width:${n}px;height:${n}px">${svg.replace('<svg', '<svg style="width:100%;height:100%"')}</span>`, one = box(MQGen.monster(s, 'idle'), 40);
    const grid = `<div style="display:grid;grid-template-columns:repeat(${c},40px);gap:2px">${Array(r * c).fill(one).join('')}</div>`;
    const boss = e.show.boss ? box(MQGen.monster(bookSpec(pickMonster()), 'angry'), 110) : '';
    return `<div style="display:flex;align-items:flex-end;gap:6px">${boss}${grid}</div>`;
  }
  function run() {
    T.sev = due(); const { e, v } = T.sev; hud();
    actors(PG('oops'), crowd(e, v), '');
    panel(`<div class="say">${fill(tx(e.intro), v)}</div><div id="qbox"></div>`);
    let i = 0, right = 0;
    const step = () => {
      if (i >= e.steps.length) return finish();
      const s = e.steps[i];
      askMQ({ button: t2('check'), text: fill(tx(s.q), v), answer: ev(s.a, v), family: s.fam || e.id, id: 'EV.' + e.id + '.' + i, scene: 'event:' + e.id, onResult: (ok, q, att) => {
        if (!ok && att < 2) { $('msg2').innerHTML = `<span class="bad">${LANG === 'zh' ? '再想想？' : 'Try again?'}</span>`; return 'retry'; }
        if (ok) right++;
        $('msg2').innerHTML = (ok ? `<span class="good">✔</span>` : `<span class="bad">${LANG === 'zh' ? '答案是' : 'Answer:'} <b>${ev(s.a, v)}</b></span>`) + `<div class="row"><button id="nx3">${LANG === 'zh' ? '继续' : 'Next'}</button></div>`;
        $('nx3').onclick = () => { i++; step(); }; return 'done';
      } });
    };
    const finish = () => {
      const win = right >= (e.pass || e.steps.length), res = win ? e.win : e.lose; act(res.do, v);
      const got = (res.do || []).filter(d => d[0] === 'item').map(d => { const it = ED.items[d[1]] || {}; return `${it.icon || ''} ${tx(it)}`; }).join('，');
      T.sev.done = true; save(); hud();
      panel(`<div class="say ${win ? 'good' : ''}">${fill(tx(res.text), v)}</div>${got ? `<div class="say">🎁 ${got}</div>` : ''}<div class="row"><button id="nx">${LANG === 'zh' ? '回到店里 🔔' : 'Back to the shop 🔔'}</button></div>`);
      $('nx').onclick = () => serveNext();
    };
    step();
  }
  return { load, tick, pickDay, due, on, run, backdrop, vars, act, data: () => ED, EVENTS_VERSION };
})();
