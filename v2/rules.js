// rules.js — 错误理解的“错误规则”（buggy_rule）。每个函数：输入题目参数，输出这种错法会给出的答案（数组，可多个）。
// 版本写在文件内（组件库文件名不变）。v1 2026-11-26，P-20261126-maths-game。
// 用法：浏览器 <script src="rules.js"> 后用 window.MQRules；Node 用 require('./rules.js')。
(function (root) {
  const RULES_VERSION = 1;
  const R = {
    mul_as_add: p => [p.n + p.k],
    one_group: p => [p.k],
    count_off: p => [(p.n - 1) * p.k, (p.n + 1) * p.k],
    neighbour_fact: p => [p.n * (p.k - 1), p.n * (p.k + 1), (p.n - 1) * p.k, (p.n + 1) * p.k],
    append_zero_decimal: p => [Number(String(p.x) + '0')],      // 0.3 → "0.30" = 0.3（位值不变）
    two_step_half: p => [p.n1 * p.k1, p.n2 * p.k2],
    times_as_more: p => [p.n + p.k],
    fence_n: p => [p.n * p.d],
  };

  // 诊断：answer 与正确答案不同，且等于某条规则的输出 → 返回证据列表 [{mis_id, rule}]
  // misList：misconceptions.csv 解析后的行（至少含 mis_id, buggy_rule）
  // allowed：本题 distractors 列表（只在本题声明的错误理解里找，避免同一错答案被多种错误理解认领）
  function diagnose(answer, correct, params, misList, allowed) {
    if (answer === correct || answer === null || Number.isNaN(answer)) return [];
    const hits = [];
    for (const m of misList) {
      if (allowed && !allowed.includes(m.mis_id)) continue;
      const f = R[m.buggy_rule];
      if (!f) continue;
      let out;
      try { out = f(params); } catch (e) { continue; }
      if (out.some(v => v !== correct && Math.abs(v - answer) < 1e-9)) hits.push({ mis_id: m.mis_id, rule: m.buggy_rule });
    }
    return hits;
  }

  // 置信度：同一 mis_id 在 ≥ 2 个不同题目模板上出现才算“确认”（data_model.md 原理 4）
  function confirmed(evidence) { // evidence: [{mis_id, item_id}]
    const by = {};
    for (const e of evidence) (by[e.mis_id] = by[e.mis_id] || new Set()).add(e.item_id);
    return Object.keys(by).filter(k => by[k].size >= 2);
  }

  // 坏仙子：从可用的错误理解里生成一个错答案（第 11 关机制）
  function fairyWrong(params, correct, misList, rnd = Math.random) {
    const pool = [];
    for (const m of misList) {
      if (m.fairy !== 'yes' || !R[m.buggy_rule]) continue;
      try { R[m.buggy_rule](params).filter(v => v !== correct && v > 0).forEach(v => pool.push({ value: v, mis_id: m.mis_id })); } catch (e) {}
    }
    return pool.length ? pool[Math.floor(rnd() * pool.length)] : null;
  }

  const api = { RULES_VERSION, R, diagnose, confirmed, fairyWrong };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MQRules = api;
})(typeof window !== 'undefined' ? window : globalThis);
