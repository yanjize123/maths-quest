// mq_play.js — 甜品店随机事件层 v1（2026-11-27，P-20261126-maths-game）：怪兽来抢（选武器打怪、怪兽卡图鉴）、换店员（动物加成）、顾客高峰（限时）、多层蛋糕订单。
// 依赖 index.html 里的全局（ST、T、C、LANG、panel、actors、hud、record、save、serveNext、evening、PG、R、money、$），以及 MQ（../engine.js 题目生成）、MQGen（mq_gen.js 画图）。
// 数据在 content/game_data.json（武器、题型族、店员、事件概率）。版本写在文件内。
const PLAY_VERSION = 6;   // v6：每天 2–3 个场景事件（MQEv.pickDay）； v5：接场景事件（打完怪 → MQEv.on('battle')；怪兽日不出场景事件，否则掷 MQEv.pick）； v4：怪兽 28%→45%，且连续 2 天没来第 3 天必来（Jize 2026-11-27 20:43 四天没见到）； v3：不问年级，按作答自动定难度（每个题型族一个水平值）；v2：怪兽 30、武器 40 来自数据表；克制按题型族
let GD = null;
const TX2 = {
  en: { book: '🃏 Monster cards', back: '← Back', bookIntro: (n, m) => `You have caught <b>${n}</b> of ${m} monsters. Defeat monsters with maths to collect their cards!`, unknown: '???',
    raid: n => `😱 Oh no! <b>${n}</b> is sneaking into the shop to steal things!`, fight: '⚔️ Fight!', weak: e => `Tip: it is weak against <b>${e}</b> weapons — double damage!`, pickW: 'Pick a weapon:', pickT: 'How hard should your attacks be? Harder questions hit harder!',
    year: 'Which school year are you in? (This picks the right questions.)', yearN: y => `Year ${y}`, hit: d => `💥 Hit! −${d}`, super: '✨ Super effective! Double damage!', miss: '😝 Missed!', stole: (n, what) => `The monster grabbed ${n} ${what}!`, guard: '🐸 Frog blocked the monster — nothing stolen!',
    ans: a => `The answer was <b>${a}</b>.`, won: n => `🎉 You beat <b>${n}</b>! It drops its monster card.`, newCard: '🆕 New card!', dupe: k => `You already had this card — now ×${k}. ${k % 3 === 0 ? '⭐ Shiny upgrade!' : ''}`, run: 'It ran away… try next time!',
    reopen: 'Back to the shop 🔔', next: 'Next', ok: 'Attack!', check: 'Check', qEN: '',
    rushT: '🏃 Rush hour! Answer as many as you can in 60 seconds. Each right answer = 1 coin.', go: 'Go!', rushEnd: (n, c) => `⏱️ Time's up! ${n} right — +${c} coins.`, toEvening: 'Close the shop 🌙',
    layer: (w, n, k, f) => `${w}: "A ${n}-tier ${f} cake please, with ${k} strawberries on each tier!" How many strawberries do you need?`, layerPrice: (n, p) => `The cake has ${n} tiers. Each tier costs ${p} coins. How much is the cake?`,
    helperT: 'New helper today', weaponNew: w => `🗡️ New weapon: ${w}!`,
    steal: { coin: 'coins' }, el: e => MQGen.ELEMENTS[e].icon + ' ' + MQGen.ELEMENTS[e].en },
  zh: { book: '🃏 怪兽卡', back: '← 返回', bookIntro: (n, m) => `你已经收集了 <b>${n}</b> / ${m} 只怪兽。用数学打败怪兽，就能得到它的卡！`, unknown: '？？？',
    raid: n => `😱 糟糕！<b>${n}</b> 偷偷溜进店里要偷东西！`, fight: '⚔️ 开打！', weak: e => `小窍门：它怕<b>${e}</b>类武器，打它伤害翻倍！`, pickW: '选一件武器：', pickT: '攻击要多难？题越难，打得越疼！',
    year: '你上几年级？（用来挑合适的题）', yearN: y => `Year ${y}`, hit: d => `💥 打中了！−${d}`, super: '✨ 克制！伤害翻倍！', miss: '😝 没打中！', stole: (n, what) => `怪兽抢走了 ${n} ${what}！`, guard: '🐸 青蛙挡住了怪兽，什么也没被偷！',
    ans: a => `正确答案是 <b>${a}</b>。`, won: n => `🎉 你打败了 <b>${n}</b>！它掉下一张怪兽卡。`, newCard: '🆕 新卡！', dupe: k => `这张卡你已经有了，现在 ×${k}。${k % 3 === 0 ? '⭐ 闪卡升级！' : ''}`, run: '它跑掉了……下次再来！',
    reopen: '回到店里 🔔', next: '下一题', ok: '攻击！', check: '核对', qEN: '（题目暂为英文）',
    rushT: '🏃 顾客高峰！60 秒内答对越多越好，每答对一题 = 1 金币。', go: '开始！', rushEnd: (n, c) => `⏱️ 时间到！答对 ${n} 题，+${c} 金币。`, toEvening: '关门 🌙',
    layer: (w, n, k, f) => `${w}：“我要一个 ${n} 层的${f}蛋糕，每层放 ${k} 颗草莓！”一共要多少颗草莓？`, layerPrice: (n, p) => `这个蛋糕有 ${n} 层，每层 ${p} 金币。一共多少钱？`,
    helperT: '今天的新店员', weaponNew: w => `🗡️ 新武器：${w}！`,
    steal: { coin: '金币' }, el: e => MQGen.ELEMENTS[e].icon + MQGen.ELEMENTS[e].zh } };
const t2 = k => TX2[LANG][k];
const nm = x => LANG === 'zh' ? x.zh : x.en;

async function playBoot() {
  GD = JSON.parse(await read('content/game_data.json'));
  ST.cards = ST.cards || {}; ST.weapons = ST.weapons || GD.weapons.filter(w => w.start).map(w => w.id);
  const bar = document.querySelector('.bar');
  if (!$('bookb')) { bar.insertAdjacentHTML('beforeend', '<button class="alt" id="bookb" style="font-size:14px;padding:4px 10px"></button>'); $('bookb').onclick = openBook; }
  $('bookb').textContent = t2('book');
}

// ---------------- 图鉴：固定 24 只（种子固定，所以每个孩子看到的同一编号怪兽一样） ----------------
function bookSpec(i) {
  const m = GD.monsters[i], s = MQGen.monsterSpec(MQGen.hashStr(m.id), { ...m });
  s.weakFam = m.weak; s.move = m.move; return s;
}
function pickMonster() {   // 普通 60%、稀有 30%、传说 10%（Codex #196 规则 1）；没收集过的优先一点
  const r = Math.random(), want = r < 0.6 ? 'common' : r < 0.9 ? 'rare' : 'legend';
  const ids = GD.monsters.map((m, i) => i).filter(i => GD.monsters[i].rarity === want), fresh = ids.filter(i => !ST.cards[i]);
  const pool = fresh.length && Math.random() < 0.6 ? fresh : ids; return pool[R(0, pool.length - 1)];
}
function openBook() {
  const back = CUR; const n = GD.monsters.length, got = Object.keys(ST.cards).length;
  const cards = Array.from({ length: n }, (_, i) => {
    const s = bookSpec(i), k = ST.cards[i] || 0;
    const art = MQGen.monster(s, 'idle'), frame = { common: '#e9dff0', rare: '#9fd0ff', legend: '#ffd23f' }[s.rarity];
    return `<div style="width:104px;text-align:center;background:#fff;border:3px solid ${frame};border-radius:12px;padding:4px;margin:3px">
      <div style="height:80px;${k ? '' : 'filter:brightness(0) opacity(.25)'}">${art.replace('<svg', '<svg width="80" height="80"')}</div>
      <div class="note" style="font-size:12px">${k ? nm(s.name) : t2('unknown')}${k > 1 ? ' ×' + k : ''}${k >= 3 ? ' ⭐' : ''}</div></div>`;
  }).join('');
  panel(`<div class="say">${t2('bookIntro')(got, n)}</div><div style="display:flex;flex-wrap:wrap">${cards}</div><div class="row"><button id="bk">${t2('back')}</button></div>`);
  $('bk').onclick = () => { back && back(); };
}

// ---------------- 一天的随机安排（在 newDay 末尾调用） ----------------
function playDay() {
  if (!GD) return;
  const P = id => (GD.events.find(e => e.id === id) || {}).p || 0, roll = p => Math.random() * 100 < p;
  // 换店员
  if (roll(P('helper'))) {
    const h = GD.helpers[R(0, GD.helpers.length - 1)]; T.helper = h;
    if (h.bonus === 'cheap') T.price = Math.max(1, T.price - 1);
    if (h.bonus === 'price') T.cakePrice += 1;
    if (h.bonus === 'extra') T.orders.push({ ...T.orders[0] });
    if (h.bonus === 'guard' && T.ev && T.ev.lost) { ST.stock += T.ev.lost; T.ev.lost = 0; }
    if (h.bonus === 'weapon') { const left = GD.weapons.filter(w => !ST.weapons.includes(w.id) && w.rarity !== 'legend'); if (left.length) { const w = left[R(0, left.length - 1)]; ST.weapons.push(w.id); T.newWeapon = w; } }
  }
  // 怪兽或高峰（一天最多一个）
  ST.noMonster = ST.noMonster || 0;
  if (ST.noMonster >= 2 || roll(P('monster'))) { T.monster = { idx: pickMonster() }; ST.noMonster = 0; }
  else { ST.noMonster++; if (roll(P('rush'))) T.rush = true; }
  // 场景事件（mq_events.js）：前因成立的事件优先；怪兽日也可出“前因事件”（如墙洞），其余事件只在非怪兽日
  if (typeof MQEv !== 'undefined') T.sevs = MQEv.pickDay(T.orders.length);
  // 多层蛋糕订单：替换一单
  if (roll(P('layer')) && T.orders.length > 1) {
    const i = R(1, T.orders.length - 1), fl = ['vanilla', 'chocolate', 'strawberry', 'lemon', 'blueberry', 'mint'][R(0, 5)];
    T.orders[i] = { who: T.orders[i].who, kind: 'LAYER', p: { n: R(2, 5), k: R(2, 6), fl } };
  }
}
function helperBlock() {
  if (!T.helper) return '';
  return `<div class="hint" style="display:flex;align-items:center;gap:8px">${MQGen.animal(T.helper.kind, '#ffd23f', 'cheer').replace('<svg', '<svg width="64" height="70"')}<div><b>${t2('helperT')}</b>: ${T.helper[LANG]}${T.newWeapon ? '<br>' + t2('weaponNew')(nm(T.newWeapon)) : ''}</div></div>`;
}
const helperArt = () => T && T.helper ? MQGen.animal(T.helper.kind, '#ffd23f') : '';

// ---------------- 通用：出一道 engine.js 的题 ----------------
// opts: { gen, text(覆盖题面), answer(覆盖答案，数字), button, onResult(ok, q, attempt) → 'retry'|'done', reward }
function askMQ(opts) {
  const q = opts.gen ? MQ.makeQuestion(opts.gen) : { text: opts.text, kind: 'num', answer: opts.answer, show: String(opts.answer), gen: opts.id || 'custom', strand: opts.family || '' };
  if (opts.text) q.text = opts.text;
  const st = { attempt: 1, t0: Date.now() };
  $('qbox').innerHTML = `<div class="say">${q.text} ${opts.gen && LANG === 'zh' ? `<span class="note">${t2('qEN')}</span>` : ''}</div>
    <div class="row"><input id="ans2" autocomplete="off" placeholder="?"><button id="ok2">${opts.button || t2('ok')}</button></div><div class="say" id="msg2"></div>`;
  const go = () => {
    const raw = $('ans2').value.trim(); if (!raw) return;
    const ok = opts.gen ? MQ.check(q, raw) : Number(raw.replace(/[🪙,\s]/g, '')) === opts.answer;
    record({ item_id: q.gen, item_version: 'mq-v1', engine_version: 'play-' + PLAY_VERSION, skills_snapshot: opts.family || q.strand || '', correct_first: ok && st.attempt === 1 ? 1 : 0, correct_final: ok ? 1 : 0, attempt_no: st.attempt, hint_level: 0, chosen: opts.chosen ? 1 : 0, reward: opts.reward || '', question: q.text, answer: raw, correct_answer: q.show, correct: ok, seconds: Math.round((Date.now() - st.t0) / 1000), level: 1, scene: opts.scene || 'play' });
    const v = opts.onResult(ok, q, st.attempt);
    if (v === 'retry') { st.attempt++; $('ans2').select(); return; }
    $('ok2').disabled = true; $('ans2').disabled = true;
  };
  $('ok2').onclick = go; $('ans2').onkeydown = e => { if (e.key === 'Enter') go(); }; $('ans2').focus();
  return q;
}
// ---------------- 自动难度：每个题型族一个水平值（按年级计，可带小数），不问孩子 ----------------
// 前 4 题是隐藏小测（阶梯法：对 +1、错 −1，起点取已测族的平均或 3）；之后对 +0.15、错 −0.3（目标正确率约 2/3–3/4）。
function level(family) {
  ST.ability = ST.ability || {}; ST.abilityN = ST.abilityN || {};
  if (ST.ability[family] == null) { const v = Object.values(ST.ability); ST.ability[family] = v.length ? v.reduce((a, b) => a + b, 0) / v.length : 3; ST.abilityN[family] = 0; }
  return ST.ability[family];
}
function updateLevel(family, qYear, ok, attempt) {
  if (attempt > 1) return; const n = ST.abilityN[family] || 0, a = level(family);
  const step = n < 4 ? (ok ? 1 : -1) : (ok ? 0.15 : -0.3);
  const next = n < 4 ? (ok ? Math.max(a, qYear) + step * 0.5 + 0.5 : Math.min(a, qYear) - 0.5) : a + step * (ok ? (qYear >= a ? 1 : 0.4) : (qYear <= a ? 1 : 0.4));
  ST.ability[family] = Math.max(1, Math.min(11, next)); ST.abilityN[family] = n + 1;
}
function gensFor(family, tierKey) {
  const fam = GD.families[family], y = Math.max(1, Math.min(11, Math.round(level(family) + GD.tiers[tierKey].dyear)));
  const all = fam.gens.filter(g => MQ.G[g]);
  let pool = all.filter(g => MQ.YEAR_OF[g] === y);
  if (!pool.length) { const d = Math.min(...all.map(g => Math.abs(MQ.YEAR_OF[g] - y))); pool = all.filter(g => Math.abs(MQ.YEAR_OF[g] - y) === d); }
  return pool;
}

// ---------------- 怪兽来抢 ----------------
function battleIntro() {
  CUR = battleIntro; const B = T.monster, s = bookSpec(B.idx);
  if (B.hp == null) B.hp = B.max = s.hp * 2;
  actors(PG('oops'), helperArt(), MQGen.monster(s, 'angry'));
  const mine = GD.weapons.filter(w => ST.weapons.includes(w.id));
  panel(`<div class="say">${t2('raid')(nm(s.name))} ${MQGen.hpBar(B.hp, B.max)}</div><div class="note">${t2('weak')(nm(GD.families[s.weakFam]))}</div>
    <div class="say">${t2('pickW')}</div><div class="row" id="wl">${mine.map(w => `<button class="alt" data-w="${w.id}" style="display:flex;align-items:center;gap:4px">${MQGen.weapon(w).replace('<svg', '<svg width="34" height="34"')}<span style="text-align:left;font-size:15px">${nm(w)}<br><span class="note">${MQGen.ELEMENTS[w.element].icon} ${nm(GD.families[w.family])}</span></span></button>`).join('')}</div>
    <div class="say">${t2('pickT')}</div><div class="row" id="tl">${Object.entries(GD.tiers).map(([k, v]) => `<button class="alt" data-t="${k}">${nm(v)} (−${v.dmg}❤️)</button>`).join('')}</div>
    <div class="row"><button id="fg" disabled>${t2('fight')}</button></div>`);
  let w = B.weapon || null, tier = B.tier || null;
  const mark = () => { $('panel').querySelectorAll('[data-w]').forEach(b => b.style.outline = b.dataset.w === w ? '3px solid #ff7eb6' : ''); $('panel').querySelectorAll('[data-t]').forEach(b => b.style.outline = b.dataset.t === tier ? '3px solid #ff7eb6' : ''); $('fg').disabled = !(w && tier); };
  $('panel').querySelectorAll('[data-w]').forEach(b => b.onclick = () => { w = b.dataset.w; mark(); });
  $('panel').querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tier = b.dataset.t; mark(); });
  mark(); $('fg').onclick = () => { B.weapon = w; B.tier = tier; battleTurn(); };
}
function battleTurn() {
  CUR = battleTurn; const B = T.monster, s = bookSpec(B.idx), w = GD.weapons.find(x => x.id === B.weapon), tier = GD.tiers[B.tier];
  actors(PG() + '', '', MQGen.monster(s, 'idle'));
  $('left').insertAdjacentHTML('beforeend', `<span id="wpn" style="display:inline-block">${MQGen.weapon(w).replace('<svg', '<svg width="60" height="60"')}</span>`);
  panel(`<div class="say"><b>${nm(s.name)}</b> ${MQGen.hpBar(B.hp, B.max)}</div><div id="qbox"></div>`);
  const pool = gensFor(w.family, B.tier), gen = pool[R(0, pool.length - 1)];
  B.turns = (B.turns || 0) + 1;
  askMQ({ gen, family: w.family, reward: 'battle-' + B.tier, scene: 'monster', chosen: true, onResult: (ok, q, attempt) => {
    updateLevel(w.family, MQ.YEAR_OF[gen], ok, attempt);
    if (ok) {
      const sup = w.family === s.weakFam, dmg = tier.dmg * (sup ? 2 : 1); B.hp = Math.max(0, B.hp - dmg);
      $('wpn').innerHTML = MQGen.weapon(w, 'swing').replace('<svg', '<svg width="60" height="60"');
      $('mid').innerHTML = MQGen.burst(w.element, sup).replace('<svg', '<svg style="height:90px;width:90px"');
      $('right').innerHTML = MQGen.monster(s, B.hp ? 'hit' : 'defeated');
      $('msg2').innerHTML = `<span class="good">${t2('hit')(dmg)}</span>${sup ? `<div class="good">${t2('super')}</div>` : ''}`;
      $('msg2').innerHTML += `<div class="row"><button id="nx2">${B.hp ? t2('next') : '🎉'}</button></div>`;
      $('nx2').onclick = () => B.hp ? battleTurn() : battleWon(); return 'done';
    }
    $('right').innerHTML = MQGen.monster(s, 'attack');
    let line = '';
    if (T.helper && T.helper.bonus === 'guard') line = t2('guard');
    else { const n = R(1, 3); if (s.steals === 'coin') { ST.cash -= n; } else { const m = Math.min(n, ST.stock); ST.stock -= m; } line = t2('stole')(n, t2('steal')[s.steals] || (LANG === 'zh' ? '颗草莓' : 'strawberries')); hud(); }
    if (attempt < 2) { $('msg2').innerHTML = `<span class="bad">${t2('miss')} ${line}</span>`; return 'retry'; }
    $('msg2').innerHTML = `<span class="bad">${t2('miss')} ${line}</span><div>${t2('ans')(q.show)}</div><div class="row"><button id="nx2">${t2('next')}</button></div>`;
    $('nx2').onclick = () => B.turns >= 12 ? battleFlee() : battleTurn(); return 'done';
  } });
}
function battleWon() {
  const B = T.monster, s = bookSpec(B.idx); ST.cards[B.idx] = (ST.cards[B.idx] || 0) + 1; const k = ST.cards[B.idx]; T.monsterDone = true; MQEv.on('battle');
  let drop = ''; const left = GD.weapons.filter(x => !ST.weapons.includes(x.id) && (x.rarity !== 'legend' || s.rarity === 'legend'));
  if (left.length && Math.random() < (s.rarity === 'common' ? 0.35 : 0.6)) { const x = left[R(0, left.length - 1)]; ST.weapons.push(x.id); drop = `<div class="say good" style="display:flex;align-items:center;gap:6px">${MQGen.weapon(x).replace('<svg', '<svg width="48" height="48"')}${t2('weaponNew')(nm(x))} <span class="note">${MQGen.ELEMENTS[x.element].icon} ${nm(GD.families[x.family])}</span></div>`; }
  save();
  CUR = () => { T.idx = 0; serveNext(); };
  actors(PG(), `<div class="mqg-pop" style="background:#fff;border:4px solid ${{ common: '#e9dff0', rare: '#9fd0ff', legend: '#ffd23f' }[s.rarity]};border-radius:14px;padding:6px">${MQGen.monster(s, 'idle').replace('<svg', '<svg width="110" height="110"')}</div>`, helperArt());
  panel(`<div class="say good">${t2('won')(nm(s.name))}</div><div class="say">${k === 1 ? t2('newCard') : t2('dupe')(k)}</div>${drop}<div class="row"><button id="nx">${t2('reopen')}</button><button class="alt" id="bk2">${t2('book')}</button></div>`);
  $('nx').onclick = CUR; $('bk2').onclick = openBook;
}
function battleFlee() { T.monsterDone = true; MQEv.on('battle'); CUR = () => serveNext(); panel(`<div class="say">${t2('run')}</div><div class="row"><button id="nx">${t2('reopen')}</button></div>`); $('nx').onclick = CUR; }

// ---------------- 顾客高峰：60 秒限时 ----------------
function rushIntro() {
  CUR = rushIntro; actors(PG(), helperArt(), A.dragon(DRAGONS[0]) + A.dragon(DRAGONS[1]));
  panel(`<div class="say">${t2('rushT')}</div><div class="row"><button id="go">${t2('go')}</button></div>`); $('go').onclick = rushRun;
}
function rushRun() {
  const end = Date.now() + GD.rush.seconds * 1000; let right = 0; CUR = null;
  panel(`<div style="height:12px;background:#eee;border-radius:6px;overflow:hidden"><div id="tbar" style="height:100%;width:100%;background:#ff7eb6;transition:width 1s linear"></div></div><div class="say">✅ <b id="rc">0</b></div><div id="qbox"></div>`);
  const tick = setInterval(() => { const left = end - Date.now(); if ($('tbar')) $('tbar').style.width = Math.max(0, left / (GD.rush.seconds * 10)) + '%'; if (left <= 0) { clearInterval(tick); finish(); } }, 250);
  const next = () => { if (Date.now() >= end || !$('qbox')) return; const fam = ['add', 'times', 'divide'][R(0, 2)], pool = gensFor(fam, 'easy'), g = pool[R(0, pool.length - 1)]; askMQ({ gen: g, family: fam, reward: 'rush', scene: 'rush', button: '✓', onResult: (ok, q, att) => { updateLevel(fam, MQ.YEAR_OF[g], ok, att); if (ok) { right++; $('rc').textContent = right; dance($('right')); } setTimeout(next, ok ? 150 : 700); if (!ok) $('msg2').innerHTML = '<span class="bad">✗</span>'; return 'done'; } }); };
  const finish = () => { ST.cash += right; T.income += right; T.rushDone = true; hud(); save(); CUR = evening;
    panel(`<div class="say good">${t2('rushEnd')(right, right)}</div><div class="row"><button id="nx">${t2('toEvening')}</button></div>`); $('nx').onclick = evening; };
  next();
}

// ---------------- 多层蛋糕订单（层数 × 每层草莓） ----------------
function serveLayer(o) {
  CUR = () => serveLayer(o); const { n, k, fl } = o.p, need = n * k, f = MQGen.FLAVOURS[fl];
  actors(PG(), MQGen.cake({ type: 'layer', tiers: n, per: 0, flavour: fl }), A.dragon(o.who));
  if (need > ST.stock) { panel(`<div class="say bad">${t('short')(ST.stock, need)}</div><div class="row"><button id="restock">${t('restock')}</button><button class="alt" id="nx">${t('letgo')}</button></div>`); $('restock').onclick = () => pay(Math.ceil((need - ST.stock) / PUNNET)); $('nx').onclick = () => { T.lost++; T.idx++; serveNext(); }; return; }
  panel('<div id="qbox"></div>');
  askMQ({ text: t2('layer')(o.who, n, k, nm(f)), answer: need, family: 'MD.MUL.01', id: 'LAYER.MUL', button: t('bake'), reward: 'layer', onResult: (ok, q, att) => {
    if (!ok) { const v = Number($('ans2').value); if (v < need) { $('msg2').innerHTML = `<span class="bad">${t('toofew')(o.who)}</span>`; return 'retry'; } $('msg2').innerHTML = `<span class="bad">${t('toomany')(o.who, v - need)}</span>`; ST.stock -= Math.min(v - need, ST.stock); }
    ST.stock -= need; hud(); actors(PG(), MQGen.cake({ type: 'layer', tiers: n, per: k, flavour: fl, candles: n >= 4 ? 3 : 0 }), A.dragon(o.who)); dance($('right'), ok && att === 1);
    $('msg2').innerHTML += `${ok ? `<span class="good">${t('perfect')(o.who)}</span>` : ''}<div class="row"><button id="nx2">${t('takemoney')}</button></div>`;
    $('nx2').onclick = () => layerCharge(o); return 'done';
  } });
}
function layerCharge(o) {
  CUR = () => layerCharge(o); const price = o.p.n * T.cakePrice; panel('<div id="qbox"></div>');
  askMQ({ text: t2('layerPrice')(o.p.n, T.cakePrice), answer: price, family: 'MD.MONEY.01', id: 'LAYER.CHARGE', button: t('charge'), reward: 'layer', onResult: ok => {
    if (!ok) { const v = Number($('ans2').value); if (v > price) { $('msg2').innerHTML = `<span class="bad">${t('toomuch')(o.who)}</span>`; return 'retry'; } $('msg2').innerHTML = `<span class="bad">${t('toolittle')(o.who, price - v)}</span>`; ST.cash += v; T.income += v; }
    else { ST.cash += price; T.income += price; $('msg2').innerHTML = `<span class="good">${t('kaching')(price)}</span>`; }
    T.served++; hud(); $('msg2').innerHTML += `<div class="row"><button id="nx2">${T.idx + 1 < T.orders.length ? t('nextc') : t('close')}</button></div>`;
    $('nx2').onclick = () => { T.idx++; serveNext(); }; return 'done';
  } });
}
