// mq_engine.js — 数学游戏引擎核心（P-20261126-maths-game；格式见 yanjize123/claude 条目 data_model.md）
// 只做：读内容、按模板出题、判对错、诊断、掌握度更新、生成作答记录。界面与存储不在这里。
// 版本写在文件内（组件库文件名不变）。浏览器：window.MQEngine；Node：require。
(function (root) {
  const ENGINE_VERSION = 1;
  const Rules = (typeof module !== 'undefined' && module.exports) ? require('./rules.js') : root.MQRules;

  // ---- CSV（支持双引号字段）----
  function parseCSV(text) {
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some(v => v !== '')) rows.push(row); row = []; }
      else cur += c;
    }
    row.push(cur); if (row.some(v => v !== '')) rows.push(row);
    const [H, ...R] = rows; return R.map(r => Object.fromEntries(H.map((k, i) => [k, r[i] ?? ''])));
  }

  // ---- 读内容：read(path) 返回文本的 Promise（浏览器用 fetch，Node 用 fs）----
  async function loadContent(read, levels) {
    const skills = parseCSV(await read('content/skills.csv'));
    const mis = parseCSV(await read('content/misconceptions.csv'));
    const items = [];
    for (const L of levels) { const j = JSON.parse(await read(`content/items/level${String(L).padStart(2, '0')}.json`)); j.items.forEach(it => items.push({ ...it, level: j.level, scene: j.scene })); }
    return { skills, mis, items, bySkill: Object.fromEntries(skills.map(s => [s.skill_id, s])), byItem: Object.fromEntries(items.map(i => [i.item_id, i])) };
  }

  // ---- 可重现随机数（seed → 同一组数字）----
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // ---- 安全的算式求值：只允许数字、变量、+ - * / 和括号（不用 eval）----
  function evalExpr(expr, vars) {
    const tok = String(expr).match(/\d+(\.\d+)?|[A-Za-z_]\w*|[-+*/()]/g) || []; let i = 0;
    const peek = () => tok[i], next = () => tok[i++];
    function prim() { const t = next(); if (t === '(') { const v = sum(); next(); return v; } if (t === '-') return -prim(); if (/^\d/.test(t)) return Number(t); if (t in vars) return vars[t]; throw new Error('未知量 ' + t); }
    function prod() { let v = prim(); while (peek() === '*' || peek() === '/') v = next() === '*' ? v * prim() : v / prim(); return v; }
    function sum() { let v = prod(); while (peek() === '+' || peek() === '-') v = next() === '+' ? v + prod() : v - prod(); return v; }
    const v = sum(); if (i !== tok.length) throw new Error('算式不完整 ' + expr); return v;
  }

  const fill = (s, p) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in p ? p[k] : m));

  // ---- 按模板出一道题 ----
  function instantiate(item, seed, mis, opts = {}) {
    const r = rng(seed), p = {};
    for (const [k, [lo, hi]] of Object.entries(item.params)) p[k] = lo + Math.floor(r() * (hi - lo + 1));
    p.who = opts.who || 'Pink Fluffy Unicorn';
    const correct = item.answer === 'same' ? 'same' : evalExpr(item.answer, p);
    let fairy = null;
    if (item.fairy) { fairy = Rules.fairyWrong(p, correct, mis.filter(m => item.distractors.includes(m.mis_id)), r); if (fairy && r() < 0.4) fairy = null; p.shown = fairy ? fairy.value : correct; }
    return { item_id: item.item_id, item_version: item.version, seed, params: p, correct, fairy, story: fill(item.story, p), hints: item.hints.map(h => fill(h, p)), action: item.action, rep: item.rep_to, skills: item.skills.map(s => s[0]) };
  }

  // ---- 判对错 + 诊断 ----
  function check(q, answer, mis, item) {
    if (item.action === 'judge') { const right = q.fairy ? 'wrong' : 'right'; return { correct: answer === right, evidence: [] }; }
    if (q.correct === 'same') return { correct: answer === 'same', evidence: [] };
    const a = typeof answer === 'number' ? answer : Number(String(answer).replace(/[, ]/g, ''));
    const correct = Math.abs(a - q.correct) < 1e-9;
    return { correct, evidence: correct ? [] : Rules.diagnose(a, q.correct, q.params, mis, item.distractors) };
  }

  // ---- 掌握度：BKT 一步更新（只用首次独立作答；提示后答对不算）----
  function bktUpdate(pL, correctFirst, prm) {
    const [p0, T, S, G] = String(prm || '0.2;0.15;0.1;0.2').split(';').map(Number);
    if (pL == null) pL = p0;
    const post = correctFirst ? pL * (1 - S) / (pL * (1 - S) + (1 - pL) * G) : pL * S / (pL * S + (1 - pL) * (1 - G));
    return post + (1 - post) * T;
  }
  const pCorrect = (pL, prm) => { const [, , S, G] = String(prm || '0.2;0.15;0.1;0.2').split(';').map(Number); return pL * (1 - S) + (1 - pL) * G; };

  // ---- 作答记录（新增列；旧列由页面照旧填）----
  function makeAttempt({ q, item, content, mastery, answer, result, attemptNo, hintLevel, firstCorrect, seconds, chosen, reward, confidence, access }) {
    const main = q.skills[0], prm = content.bySkill[main]?.bkt;
    const pre = mastery[main] ?? Number(String(prm || '0.2').split(';')[0]);
    const row = {
      item_id: q.item_id, item_version: q.item_version, engine_version: ENGINE_VERSION, rules_version: Rules.RULES_VERSION, seed: q.seed,
      skills_snapshot: q.skills.join(';'), correct_first: firstCorrect ? 1 : 0, correct_final: result.correct ? 1 : 0, attempt_no: attemptNo, hint_level: hintLevel,
      mis_evidence: result.evidence.map(e => e.mis_id).join(';') || (result.correct ? '' : 'unknown'), confidence: confidence ?? '',
      rep: q.rep, action: q.action, level: item.level, scene: item.scene, chosen: chosen ? 1 : 0,
      p_pre: +pCorrect(pre, prm).toFixed(3), mastery_pre: +pre.toFixed(3), mastery_post: '', model: 'BKT-v1', reward: reward || '', abandoned: 0, access: access || '',
      question: q.story, answer: String(answer), correct_answer: String(q.correct), correct: result.correct, seconds,
    };
    if (attemptNo === 1) { mastery[main] = bktUpdate(pre, firstCorrect, prm); row.mastery_post = +mastery[main].toFixed(3); }
    return row;
  }

  const api = { ENGINE_VERSION, parseCSV, loadContent, rng, evalExpr, instantiate, check, bktUpdate, pCorrect, makeAttempt };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MQEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
