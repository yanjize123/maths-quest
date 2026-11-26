// 回归测试：node tests/test_content.js（无依赖）。检查内容文件互相引用一致、每条错误规则给出预期错答案、诊断与仙子机制。
const fs = require('fs'), path = require('path');
const MQ = require('../rules.js');
const root = path.join(__dirname, '..', 'content');
let fail = 0; const ok = (c, msg) => { if (!c) { fail++; console.log('FAIL', msg); } };
const csv = f => { const [h, ...rows] = fs.readFileSync(path.join(root, f), 'utf8').trim().split('\n'); const H = h.split(','); return rows.map(r => { const v = r.split(','); return Object.fromEntries(H.map((k, i) => [k, v[i]])); }); };
const skills = csv('skills.csv'), mis = csv('misconceptions.csv');
const S = new Set(skills.map(s => s.skill_id)), M = new Set(mis.map(m => m.mis_id));
for (const s of skills) for (const p of (s.prereq || '').split(';').filter(Boolean)) ok(S.has(p), `${s.skill_id} 前置 ${p} 不存在`);
for (const m of mis) { ok(MQ.R[m.buggy_rule], `${m.mis_id} 规则 ${m.buggy_rule} 未实现`); for (const k of m.skills.split(';')) ok(S.has(k), `${m.mis_id} 知识点 ${k} 不存在`); }
// 知识点总图：skills.cn_node 必须指向总图节点
const mapNodes = new Set(csv('map/nodes.csv').map(r => r.id));
for (const s of skills) for (const c of s.cn_node.split(';')) { const id = c.replace(/（.*$/, ''); ok(mapNodes.has(id), `${s.skill_id} cn_node ${id} 不在总图`); }
// 每条规则的期望错答案（参数 → 期望）
const cases = [
  ['mul_as_add', { n: 10, k: 3 }, 13], ['one_group', { n: 10, k: 3 }, 3], ['count_off', { n: 4, k: 5 }, 15],
  ['neighbour_fact', { n: 6, k: 7 }, 36], ['append_zero_decimal', { x: 0.3 }, 0.3], ['two_step_half', { n1: 10, k1: 3, n2: 4, k2: 5 }, 30],
  ['times_as_more', { n: 4, k: 3 }, 7], ['fence_n', { n: 3, d: 6 }, 18],
];
for (const [r, p, e] of cases) ok(MQ.R[r](p).includes(e), `规则 ${r} 期望 ${e}`);
// 题目文件
for (const f of fs.readdirSync(path.join(root, 'items'))) {
  const L = JSON.parse(fs.readFileSync(path.join(root, 'items', f), 'utf8'));
  for (const it of L.items) {
    for (const [k] of it.skills) ok(S.has(k), `${it.item_id} 知识点 ${k} 不存在`);
    for (const d of it.distractors) ok(M.has(d), `${it.item_id} 错误理解 ${d} 不存在`);
    ok(it.hints.length === 3, `${it.item_id} 提示应为 3 级`);
    ok(it.time_limit === 'none', `${it.item_id} 默认不计时`);
  }
}
// 诊断：Brenda 第 6 关 18；第 1 关 10×3 答 13
ok(MQ.diagnose(18, 12, { n: 3, d: 6 }, mis, ['MIS.FENCE.N'])[0]?.mis_id === 'MIS.FENCE.N', '诊断 植树 18');
ok(MQ.diagnose(13, 30, { n: 10, k: 3 }, mis, ['MIS.MUL.ADD', 'MIS.MUL.ONEGROUP'])[0]?.mis_id === 'MIS.MUL.ADD', '诊断 10×3 答 13');
ok(MQ.diagnose(30, 30, { n: 10, k: 3 }, mis, ['MIS.MUL.ADD']).length === 0, '答对不诊断');
ok(MQ.diagnose(4, 4, { n: 2, k: 2 }, mis, ['MIS.MUL.ADD']).length === 0, '2+2=2×2 不算错误理解');
ok(MQ.confirmed([{ mis_id: 'A', item_id: '1' }, { mis_id: 'A', item_id: '1' }]).length === 0, '同一题两次不确认');
ok(MQ.confirmed([{ mis_id: 'A', item_id: '1' }, { mis_id: 'A', item_id: '2' }])[0] === 'A', '两题确认');
const fw = MQ.fairyWrong({ n: 4, k: 5 }, 20, mis.filter(m => ['MIS.MUL.ADD', 'MIS.MUL.COUNTOFF'].includes(m.mis_id)), () => 0);
ok(fw && fw.value !== 20, '坏仙子给出错答案');
console.log(fail ? `${fail} 项失败` : '全部通过');
process.exit(fail ? 1 : 0);
