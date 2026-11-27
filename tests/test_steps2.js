// node tests/test_steps2.js — inequalities and simultaneous equations
const MQ = require("../engine.js"), S = require("../steps.js"), F = (n, d = 1) => new MQ.Fr(n, d);
let pass = 0, fail = 0; const t = (n, c, x = "") => { if (c) pass++; else { fail++; console.log("FAIL", n, x); } };
const iq = { type: "ineq", start: "5 − 2x ≥ 11", v: "x", value: F(-3), op: "≤" };
const c = (lines, l, ok, done, code) => { const r = S.checkLine(iq, lines, l); t(`ineq ${l}`, r.ok === ok && (done === undefined || !!r.done === done) && (!code || r.code === code), JSON.stringify(r)); };
c([], "-2x >= 6", true, false); c([], "−2x ≥ 6", true, false); c(["-2x >= 6"], "x <= -3", true, true); c(["-2x >= 6"], "x >= -3", false, false, "ineq_no_flip");
c(["-2x >= 6"], "-3 >= x", true, true); c([], "-2x ≥ 16", false, false, "move_sign"); c([], "-2x = 6", false, false); c(["-2x >= 6"], "x < -3", false, false, "ineq_strict");
const iq2 = { type: "ineq", start: "3(x + 2) < 5x − 4", v: "x", value: F(5), op: ">" };
for (const task of [iq, iq2]) { const lines = []; for (let i = 0; i < 10; i++) { const [nx] = S.nextStep(task, lines); if (!nx) break; const r = S.checkLine(task, lines, nx); if (!r.ok) { t("ineq hint " + task.start, false, nx + " " + r.msg); break; } lines.push(nx); if (r.done) break; } t("ineq hint end " + task.start, S.checkLine(task, lines.slice(0, -1), lines[lines.length - 1]).done, lines.join(" | ")); }
const sy = { type: "sys", start: "2x + 3y = 12, x − y = 1", vars: "xy", value: { x: F(3), y: F(2) } };
const s = (lines, l, ok, done, code) => { const r = S.checkLine(sy, lines, l); t(`sys ${l}`, r.ok === ok && (done === undefined || !!r.done === done) && (!code || r.code === code), JSON.stringify(r)); };
s([], "3x − 3y = 3", true, false); s([], "5x = 15", true, false); s(["5x = 15"], "x = 3", true, false); s(["x = 3"], "y = 2", true, true); s([], "x = 3, y = 2", true, true);
s([], "3x − 3y = 1", false, false, "sys_mult_all"); s([], "x + 4y = 13", false, false, "sys_combine_sign"); s([], "2x+3y=12", true, false); s([], "2xy = 3", false, false);
for (let i = 0; i < 400; i++) {
  const x = Math.floor(Math.random() * 13) - 6, y = Math.floor(Math.random() * 13) - 6;
  const nz = () => { let v = 0; while (!v) v = Math.floor(Math.random() * 11) - 5; return v; };
  let a1 = nz(), b1 = nz(), a2 = nz(), b2 = nz(); if (a1 * b2 === a2 * b1) continue;
  const fmt = (a, b) => `${a}x ${b < 0 ? "−" : "+"} ${Math.abs(b)}y`;
  const task = { type: "sys", start: `${fmt(a1, b1)} = ${a1 * x + b1 * y}, ${fmt(a2, b2)} = ${a2 * x + b2 * y}`, vars: "xy", value: { x: F(x), y: F(y) } };
  const lines = []; let done = false;
  for (let k = 0; k < 10; k++) { const [nx] = S.nextStep(task, lines); if (!nx) break; const r = S.checkLine(task, lines, nx); if (!r.ok) { t("sys hint", false, task.start + " -> " + nx + " " + r.msg); break; } lines.push(nx); if (r.done) { done = true; break; } }
  t("sys hint path", done, task.start + " :: " + lines.join(" | "));
}
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
