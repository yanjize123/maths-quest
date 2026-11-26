// node tests/test_engine.js — 引擎回归测试
const fs = require('fs'), path = require('path'); const E = require('../mq_engine.js');
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } };
(async () => {
  const C = await E.loadContent(p => Promise.resolve(fs.readFileSync(path.join(__dirname, '..', p), 'utf8')), [1, 'level01biz']);
  ok(C.skills.length >= 9 && C.mis.length >= 8 && C.items.length >= 8, '内容读入');
  ok(E.parseCSV('a,b\n"x,1",2\n')[0].a === 'x,1', 'CSV 引号');
  ok(E.evalExpr('n1*k1+n2*k2', { n1: 10, k1: 3, n2: 4, k2: 5 }) === 50, '算式求值');
  let threw = false; try { E.evalExpr('alert(1)', {}); } catch (e) { threw = true; } ok(threw, '拒绝非法算式');
  const it = C.byItem['IT.L1.MUL.003'], q1 = E.instantiate(it, 42, C.mis), q2 = E.instantiate(it, 42, C.mis);
  ok(q1.story === q2.story && q1.correct === q1.params.n * q1.params.k, '同种子同题、答案正确');
  ok(!/\{/.test(q1.story) && q1.hints.every(h => !/\{\w+\}/.test(h)), '模板槽全部填好');
  const wrong = q1.params.n + q1.params.k, r = E.check(q1, wrong, C.mis, it);
  ok(!r.correct && r.evidence[0]?.mis_id === 'MIS.MUL.ADD', '诊断加法代替乘法');
  ok(E.check(q1, q1.correct, C.mis, it).correct, '答对');
  // 每个模板 200 个种子都能出题、无 NaN
  for (const item of C.items) for (let s = 1; s <= 200; s++) { const q = E.instantiate(item, s, C.mis); ok(q.correct === 'same' || Number.isFinite(q.correct), `${item.item_id} 种子 ${s}`); if (item.fairy) { const right = q.fairy ? 'wrong' : 'right'; ok(E.check(q, right, C.mis, item).correct, `${item.item_id} 仙子判断`); } }
  for (const item of C.items) { const q = E.instantiate(item, 7, C.mis, { lang: 'en' }); ok(item.story_en && !/\{\w+\}/.test(q.story) && q.hints.length === 3, `${item.item_id} 英文`); }
  { const it = C.byItem['IT.L1.BIZ.PROFIT'], q = E.instantiate(it, 1, C.mis, { params: { a: 42, b: 17 }, lang: 'en' }); ok(q.correct === 25 && /£42/.test(q.story), '店铺给定参数'); ok(E.check(q, 35, C.mis, it).evidence[0]?.mis_id === 'MIS.SUB.SMALLER', '诊断大减小'); }
  // BKT：答对升、答错降
  ok(E.bktUpdate(0.3, true) > 0.3 && E.bktUpdate(0.3, false) < E.bktUpdate(0.3, true), 'BKT 方向');
  const m = {}; const row = E.makeAttempt({ q: q1, item: it, content: C, mastery: m, answer: wrong, result: r, attemptNo: 1, hintLevel: 0, firstCorrect: false, seconds: 12 });
  ok(row.mis_evidence === 'MIS.MUL.ADD' && row.mastery_post < row.mastery_pre + 0.2 && row.seed === 42, '作答记录字段');
  console.log(fail ? `${fail} 项失败` : '全部通过'); process.exit(fail ? 1 : 0);
})();
