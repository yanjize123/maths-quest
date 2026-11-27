// node tests/test_column.js — column methods: the model solution passes; typical slips get the right reason
const C = require("../column.js");
let pass = 0, fail = 0; const t = (n, c, x = "") => { if (c) pass++; else { fail++; if (fail < 25) console.log("FAIL", n, x); } };
const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
for (let i = 0; i < 3000; i++) {
  const op = ["add", "sub", "mul", "mul", "div", "div", "div"][i % 7];
  let spec;
  if (op === "add") spec = { op, a: R(10, 9999), b: R(10, 9999) };
  else if (op === "sub") { const a = R(100, 9999); spec = { op, a, b: R(1, a) }; }
  else if (op === "mul") spec = { op, a: R(12, 9999), b: R(2, 99) };
  else spec = { op, a: R(100, 99999), b: R(2, 49), short: i % 5 === 0 };
  const L = C.layout(spec), sol = C.solution(L), r = C.check(L, sol);
  t(`solution ${JSON.stringify(spec)}`, r.ok && r.done, JSON.stringify(r.first));
  // value check: rebuild numbers from solution
  if (op === "div") { const q = +sol.q.join("").replace(/^0+/, "") || 0; t(`div value ${spec.a}/${spec.b}`, q === Math.floor(spec.a / spec.b), sol.q.join("")); }
  if (op !== "div") { const ans = +sol.ans.join(""); t(`value ${op}`, ans === L.value, sol.ans.join("") + " vs " + L.value); }
}
// division slips
let L = C.layout({ op: "div", a: 8190, b: 45 }), s = C.solution(L);
let v = JSON.parse(JSON.stringify(s)); v.q[1] = "2"; t("q big", C.check(L, v).first.reason.code === "q_big", JSON.stringify(C.check(L, v).first));
v = JSON.parse(JSON.stringify(s)); v.q[2] = "7"; t("q small", C.check(L, v).first.reason.code === "q_small");
v = JSON.parse(JSON.stringify(s)); v.r0 = ["3", "6"]; t("bring missing", ["bring_missing", "sub_err"].includes(C.check(L, v).first.reason.code), JSON.stringify(C.check(L, v).first));
v = JSON.parse(JSON.stringify(s)); v.r0 = ["3", "7", "9"]; t("sub err", C.check(L, v).first.reason.code === "sub_err", JSON.stringify(C.check(L, v).first));
v = JSON.parse(JSON.stringify(s)); v.m0 = ["4", "6"]; t("mul err", C.check(L, v).first.reason.code === "mul_err");
// zero in the quotient: 4512 ÷ 15 = 300 r 12
L = C.layout({ op: "div", a: 4512, b: 15 }); s = C.solution(L); t("zero quotient", C.check(L, s).done && s.q.join("") === "300" || s.q.join("").replace(/^0+/, "") === "300", JSON.stringify(s));
v = JSON.parse(JSON.stringify(s)); v.q[v.q.length - 1] = ""; t("zero missing", C.check(L, v).first && C.check(L, v).first.reason.code === "q_missing", JSON.stringify(C.check(L, v)));
// long multiplication: Chinese layout without placeholder 0
L = C.layout({ op: "mul", a: 2456, b: 37 }); s = C.solution(L); v = JSON.parse(JSON.stringify(s)); v.p1[v.p1.length - 1] = ""; t("no placeholder ok", C.check(L, v).ok);
// addition carry forgotten, subtraction small-from-big
L = C.layout({ op: "add", a: 478, b: 356 }); v = C.solution(L); v.ans = "0724".slice(-v.ans.length).split(""); t("carry", C.check(L, v).first.reason.code === "carry_missing", JSON.stringify(C.check(L, v).first));
L = C.layout({ op: "sub", a: 602, b: 348 }); v = C.solution(L); const sfb = "346"; v.ans = sfb.split(""); t("small from big", C.check(L, v).first.reason.code === "small_from_big", JSON.stringify(C.check(L, v).first));
// partial checking stops at the first unfilled row
L = C.layout({ op: "div", a: 936, b: 4 }); v = { q: ["2", "", ""] }; t("partial ok", C.check(L, v, true).ok);
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
