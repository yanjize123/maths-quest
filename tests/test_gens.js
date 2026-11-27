// node tests/test_gens.js — every generator answers its own question; step types are consistent and solvable by the hint path; pure share in Practice
const M = require("../engine.js"), S = require("../steps.js");
let pass = 0, fail = 0; const t = (n, c, x = "") => { if (c) pass++; else { fail++; if (fail < 30) console.log("FAIL", n, x); } };
for (const g of Object.keys(M.G)) for (let i = 0; i < 150; i++) {
  const q = M.G[g](); if (!/^(a\d|s\d|e\d|c\d|i\d|q\d|f\d|k\d|l\d|p\d|r\d|t\d|z\d)/.test(g)) continue;
  t(`self ${g}`, M.check(q, String(q.show).split("  (=")[0]), q.text + " | " + q.show);
  if (q.step) {
    const st = q.step; if (st.type === "eq" || st.type === "calc") { let v; try { v = st.type === "eq" ? S.solve(st.start, "x") : S.evaluate(st.start); } catch (e) { v = null; }
    t(`step value ${g}`, v && v.eq(st.value), st.start); }
    if (st.type === "ineq") t(`ineq end ${g}`, S.checkLine(st, [], `x ${st.op} ${q.answer.v}`).done, st.start);
    const lines = []; let ok = false;
    for (let k = 0; k < 14; k++) { const [nx] = S.nextStep(st, lines); if (!nx) break; const r = S.checkLine(st, lines, nx); if (!r.ok) { t(`hint ${g}`, false, st.start + " → " + nx + " : " + r.msg); break; } lines.push(nx); if (r.done) { ok = true; break; } }
    t(`hint path ${g}`, ok, st.start + " :: " + lines.join(" | "));
  }
}
// pure share in Practice (plan pools), per school year
for (let y = 1; y <= 11; y++) {
  const L = { name: "t", year: y }, st = M.newState(); let p = 0, n = 2000;
  for (let i = 0; i < n; i++) { const q = M.nextQuestion(L, st, 20, "mixed", null); if (M.isPure(q.gen)) p++; }
  const share = p / n; console.log(`Y${y} pure share ${(100 * share).toFixed(0)}%`); t(`share Y${y}`, share >= 0.6 && share <= 0.75, share);
}
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
