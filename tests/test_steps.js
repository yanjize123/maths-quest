// node tests/test_steps.js — line-by-line checker
const MQ = require("../engine.js"), S = require("../steps.js"), F = (n, d = 1) => new MQ.Fr(n, d);
let pass = 0, failN = 0;
const t = (name, cond, extra = "") => { if (cond) pass++; else { failN++; console.log("FAIL", name, extra); } };
const ev = (s, n, d = 1) => { let v; try { v = S.evaluate(s); } catch (e) { v = e.message; } t(`eval ${s}`, v && v.eq && v.eq(F(n, d)), String(v && v.n !== undefined ? v.n + "/" + v.d : v)); };
// tolerant reading
ev("36 − 4 × (7 − 2) + 18 ÷ 3", 22); ev("36-4*(7-2)+18/3", 22); ev("36 - 4 x (7-2) + 18 : 3", 22); ev("4(7-2)", 20); ev("(2+3)(4-1)", 15);
ev("3/4 ÷ 1/2", 3, 2); ev("2 1/2 + 1 1/4", 15, 4); ev("1,250 + 750", 2000); ev("2^3 + 3²", 17); ev("-3^2", -9); ev("(-3)^2", 9);
ev("[12 − 4] × 3", 24); ev("= 5 × 6", 30); ev("0.3 × 0.2", 3, 50); ev("25% * 80", 20); ev("12 ÷ 4 ÷ 3", 1); ev("2^-2", 1, 4);
const calc = { type: "calc", start: "36 − 4 × (7 − 2) + 18 ÷ 3", value: F(22) };
const c = (lines, line, ok, done, re) => { const r = S.checkLine(calc, lines, line); t(`calc ${line}`, r.ok === ok && (done === undefined || !!r.done === done) && (!re || re.test(r.msg)), JSON.stringify(r)); };
c([], "36 − 4 × 5 + 18 ÷ 3", true, false); c([], "36 - 20 + 6", true, false); c([], "= 16 + 6 = 22", true, true); c([], "22", true, true);
c([], "32 × 5 + 6", false, false, /order/); c(["36 − 4 × 5 + 18 ÷ 3"], "36 − 4 × 5 + 6", true, false); c([], "36 − 4 × (7 − 2", false, false, /bracket/);
c([], "thirty", false, false, /understand/);
const fr = { type: "calc", start: "3/4 + 1/2 × 2/3", value: F(13, 12) };
t("frac step", S.checkLine(fr, [], "3/4 + 2/6").ok); t("frac final", S.checkLine(fr, [], "13/12").done); t("frac mixed", S.checkLine(fr, [], "1 1/12").done);
t("frac unsimplified", !S.checkLine({ type: "calc", start: "1/2 + 1/6", value: F(2, 3) }, [], "4/6").ok);
// equations
const eq = { type: "eq", start: "3(x − 2) + 5 = 2x + 9", v: "x", value: F(10) };
const e = (lines, line, ok, done, re) => { const r = S.checkLine(eq, lines, line); t(`eq ${line}`, r.ok === ok && (done === undefined || !!r.done === done) && (!re || re.test(r.msg)), JSON.stringify(r)); };
e([], "3x − 6 + 5 = 2x + 9", true, false); e([], "3x-1=2x+9", true, false); e([], "x - 1 = 9", true, false); e([], "x = 10", true, true); e([], "10 = x", true, true);
e([], "3x − 2 + 5 = 2x + 9", false, false, /bracket/); e(["3x − 1 = 2x + 9"], "x = 9 - 1", false, false, /sign/); e(["x − 1 = 9"], "x = 8", false, false, /sign/);
e([], "3x + 5 = 2x + 9 (÷3)", false, false); e(["3x - 1 = 2x + 9"], "x - 1 = 9 (-2x)", true, false); e([], "3x − 1", false, false, /one = sign/);
const e2 = { type: "eq", start: "4x = 20", v: "x", value: F(5) };
t("eq divide slip", /divide/.test(S.checkLine(e2, [], "x = 16").msg)); t("eq times sign 4*x", S.checkLine(e2, [], "4*x = 20").ok); t("eq 4 × x", S.checkLine(e2, [], "4 × x = 20").ok);
const e3 = { type: "eq", start: "(x + 3)/4 = 5", v: "x", value: F(17) };
t("eq frac", S.checkLine(e3, [], "x + 3 = 20").ok); t("eq frac solved", S.checkLine(e3, ["x + 3 = 20"], "x = 17").done);
const e4 = { type: "eq", start: "7 − 2x = 15", v: "x", value: F(-4) };
t("eq neg", S.checkLine(e4, [], "-2x = 8").ok); t("eq neg done", S.checkLine(e4, ["-2x = 8"], "x = -4").done); t("eq neg slip", !S.checkLine(e4, ["-2x = 8"], "x = 4").ok);
const e5 = { type: "eq", start: "5 − (x − 3) = 2", v: "x", value: F(6) };
t("eq minus bracket slip", /minus in front/.test(S.checkLine(e5, [], "5 − x − 3 = 2").msg), S.checkLine(e5, [], "5 − x − 3 = 2").msg);
// next-step hints lead to the answer
for (const task of [calc, fr, eq, e3, e4, e5, { type: "eq", start: "(2x + 1)/3 = (x − 1)/2", v: "x", value: F(-5) }]) {
  const lines = []; for (let i = 0; i < 12; i++) { const [nx] = S.nextStep(task, lines); if (!nx) break; const r = S.checkLine(task, lines, nx); if (!r.ok) { t(`hint path ${task.start}`, false, nx + " " + r.msg); break; } lines.push(nx); if (r.done) break; }
  const last = lines[lines.length - 1]; t(`hint reaches end ${task.start}`, last && S.checkLine(task, lines.slice(0, -1), last).done, lines.join(" | "));
}
console.log(`${pass} passed, ${failN} failed`); process.exit(failN ? 1 : 0);
