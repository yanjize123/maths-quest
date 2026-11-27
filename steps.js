/* Maths Quest — line-by-line working checker (no AI). Version 1 (2026-11-27).
   Checks each line a learner types: for calculations, every line must keep the same value;
   for linear equations, every line must keep the same solution. Tolerant input:
   × x * · for multiply, ÷ : / for divide, fractions 3/4, mixed numbers 2 1/2, implicit
   multiplication 3x, 2(x+1), (x+1)(x-2), brackets ( ) [ ], powers ^2 ² ³, thousands commas 1,250,
   unicode minus, leading "=", chains "a = b = c" (calculations), and a trailing note such as (÷3).
   Needs engine.js (MQ.Fr). Runs in the browser (window.MQS) and in Node. */
(function (root) {
"use strict";
const MQ = (typeof module !== "undefined" && module.exports) ? require("./engine.js") : root.MQ;
const { Fr } = MQ;
const F = (n, d = 1) => new Fr(n, d);
const ZERO = F(0), ONE = F(1);

// ------------------------------------------------------------ polynomials {deg: Fr}
const pc = p => { const o = {}; for (const k in p) if (p[k].n !== 0) o[k] = p[k]; return o; };
const pconst = c => pc({ 0: c });
const padd = (a, b) => { const o = Object.assign({}, a); for (const k in b) o[k] = (o[k] || ZERO).add(b[k]); return pc(o); };
const pscale = (a, c) => { const o = {}; for (const k in a) o[k] = a[k].mul(c); return pc(o); };
const psub = (a, b) => padd(a, pscale(b, F(-1)));
const pmul = (a, b) => { const o = {}; for (const i in a) for (const j in b) { const k = +i + +j; o[k] = (o[k] || ZERO).add(a[i].mul(b[j])); } return pc(o); };
const pdeg = p => { const ks = Object.keys(p).map(Number); return ks.length ? Math.max(...ks) : -1; };
const pco = (p, k) => p[k] || ZERO;
const isConst = p => pdeg(p) <= 0;
const peq = (a, b) => pdeg(psub(a, b)) === -1;

// ------------------------------------------------------------ errors shown to the learner
class StepError extends Error { constructor(msg) { super(msg); this.learner = true; } }
const fail = m => { throw new StepError(m); };

// ------------------------------------------------------------ normalise and tokenise
function normalise(s, v) {
  s = String(s || "").trim();
  s = s.replace(/\s*(?:→|->|=>)\s*$/, "");
  const map = [["−", "-"], ["–", "-"], ["—", "-"], ["×", "*"], ["·", "*"], ["∙", "*"], ["✕", "*"], ["÷", "÷"], ["[", "("], ["]", ")"], ["{", "("], ["}", ")"], ["²", "^2"], ["³", "^3"], ["**", "^"], ["＝", "="], ["（", "("], ["）", ")"], ["<=", "≤"], ["=<", "≤"], [">=", "≥"], ["=>", "≥"]];
  for (const [a, b] of map) s = s.split(a).join(b);
  s = s.replace(/\b(\d{1,3}(?:,\d{3})+)(?!\d)/g, m => m.replace(/,/g, ""));
  s = s.toLowerCase();
  if (!v) s = s.replace(/x/g, "*");              // no unknown: a letter x means "times"
  // mixed numbers: 2 1/2 -> (2+1/2)
  s = s.replace(/(^|[^\d.\/\s]|\s)(\d+)\s+(\d+)\s*\/\s*(\d+)/g, (m, a, w, n, d) => `${a}(${w}+${n}/${d})`);
  return s;
}
function decFr(t) { const [ip, fp = ""] = t.split("."); return F(parseInt((ip || "0") + fp, 10), 10 ** fp.length); }
function tokenise(s, v) {
  const toks = []; let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === " ") { i++; continue; }
    let m = s.slice(i).match(/^(\d+(?:\.\d+)?|\.\d+)/);
    if (m) {
      let val = decFr(m[0]); i += m[0].length;
      // fraction bar between two whole numbers binds tightest: 3/4 ÷ 1/2 = (3/4) ÷ (1/2)
      const m2 = s.slice(i).match(/^\s*\/\s*(\d+)(?![\d.])/);
      if (/^\d+$/.test(m[0]) && m2 && !(toks.length && toks[toks.length - 1].t === "^")) {
        if (+m2[1] === 0) fail("You can't divide by 0.");
        val = F(parseInt(m[0], 10), parseInt(m2[1], 10)); i += m2[0].length; toks.push({ t: "num", v: val, frac: true }); continue;
      }
      toks.push({ t: "num", v: val }); continue;
    }
    if (v && v.includes(c)) { toks.push({ t: "var", n: c }); i++; continue; }
    if ("+-*/÷:^()%".includes(c)) { toks.push({ t: c === ":" || c === "÷" ? "÷" : c }); i++; continue; }
    if (/[a-z]/.test(c)) fail(v && v.length > 1 ? `Use only ${v.split("").join(" and ")}, numbers and + − × ÷ ( ). I don't understand "${c}".` : v ? `Use only ${v}, numbers and + − × ÷ ( ). I don't understand "${c}".` : `Use only numbers and + − × ÷ ( ). I don't understand "${c}".`);
    fail(`I don't understand "${c}".`);
  }
  return toks;
}

// ------------------------------------------------------------ parser -> AST
// nodes: {k:'num',v:Fr} {k:'var'} {k:'neg',a} {k:'op',o:'+'|'-'|'*'|'/',a,b} {k:'pow',a,n}
function parse(s, v) { return parseToks(tokenise(normalise(s, v), v)); }
function parseToks(toks) {
  let p = 0;
  if (!toks.length) fail("This line is empty.");
  const peek = () => toks[p], eat = t => { if (toks[p] && toks[p].t === t) { p++; return true; } return false; };
  function expr() { let a = term(); for (;;) { if (eat("+")) a = { k: "op", o: "+", a, b: term() }; else if (eat("-")) a = { k: "op", o: "-", a, b: term() }; else return a; } }
  function term() {
    let a = unary();
    for (;;) {
      const t = peek(); if (!t) return a;
      if (t.t === "*") { p++; a = { k: "op", o: "*", a, b: unary() }; }
      else if (t.t === "/" || t.t === "÷") { p++; a = { k: "op", o: "/", a, b: unary() }; }
      else if (t.t === "(" || t.t === "var" || (t.t === "num" && a.k !== "num" && a.k !== "neg" && lastIsCloseOrVar())) { a = { k: "op", o: "*", a, b: power(), imp: true }; }
      else return a;
    }
  }
  function lastIsCloseOrVar() { const q = toks[p - 1]; return q && (q.t === ")" || q.t === "var"); }
  function unary() { if (eat("-")) { const a = unary(); return a.k === "num" ? { k: "num", v: a.v.mul(-1), frac: a.frac } : { k: "neg", a }; } if (eat("+")) return unary(); return power(); }
  function power() {
    let a = postfix();
    if (eat("^")) { const e = unary(); const ev = toPoly(e); if (!isConst(ev) || pco(ev, 0).d !== 1) fail("Powers must be whole numbers here."); a = { k: "pow", a, n: pco(ev, 0).n }; }
    return a;
  }
  function postfix() { let a = primary(); while (eat("%")) a = { k: "op", o: "/", a, b: { k: "num", v: F(100) } }; return a; }
  function primary() {
    const t = peek();
    if (!t) fail("Something is missing at the end of the line.");
    if (t.t === "num") { p++; return { k: "num", v: t.v, frac: t.frac }; }
    if (t.t === "var") { p++; return { k: "var", n: t.n }; }
    if (t.t === "(") { p++; const e = expr(); if (!eat(")")) fail("A closing bracket ) is missing."); return { k: "par", a: e }; }
    if (t.t === ")") fail("There is a ) without a matching (.");
    fail(`Something is missing before "${t.t === "÷" ? "÷" : t.t}".`);
  }
  const e = expr();
  if (p < toks.length) fail(toks[p].t === ")" ? "There is a ) without a matching (." : "I can't read this line — check the signs between numbers.");
  return e;
}
const strip = n => (n.k === "par" ? strip(n.a) : n.k === "neg" && strip(n.a).k === "num" ? { k: "num", v: strip(n.a).v.mul(-1) } : n);

function toPoly(n) {
  switch (n.k) {
    case "num": return pconst(n.v);
    case "var": return { 1: ONE };
    case "par": return toPoly(n.a);
    case "neg": return pscale(toPoly(n.a), F(-1));
    case "pow": { const b = toPoly(n.a); if (n.n < 0) { if (!isConst(b) || pco(b, 0).n === 0) fail("Negative powers only of numbers here."); let r = ONE; for (let i = 0; i < -n.n; i++) r = r.div(pco(b, 0)); return pconst(r); } let r = { 0: ONE }; for (let i = 0; i < n.n; i++) r = pmul(r, b); return r; }
    case "op": {
      const a = toPoly(n.a), b = toPoly(n.b);
      if (n.o === "+") return padd(a, b); if (n.o === "-") return psub(a, b); if (n.o === "*") return pmul(a, b);
      if (!isConst(b)) fail("Dividing by an expression with the letter isn't needed — multiply both sides instead.");
      if (pco(b, 0).n === 0) fail("You can't divide by 0.");
      return pscale(a, ONE.div(pco(b, 0)));
    }
  }
  fail("I can't read this line.");
}
// Linear form in several variables: {x: Fr, y: Fr, 1: Fr}
function toLin(n) {
  const add = (a, b, k = ONE) => { const o = Object.assign({}, a); for (const key in b) o[key] = (o[key] || ZERO).add(b[key].mul(k)); for (const key in o) if (o[key].n === 0) delete o[key]; return o; };
  const isC = a => Object.keys(a).every(k => k === "1"), cv = a => a["1"] || ZERO, sc = (a, k) => add({}, a, k);
  switch (n.k) {
    case "num": return n.v.n ? { 1: n.v } : {};
    case "var": return { [n.n]: ONE };
    case "par": return toLin(n.a);
    case "neg": return sc(toLin(n.a), F(-1));
    case "pow": { const b = toLin(n.a); if (n.n === 1) return b; if (!isC(b)) fail("Only straight-line (linear) equations here — no powers of the letters."); const v = valueOf(n); return v.n ? { 1: v } : {}; }
    case "op": {
      const a = toLin(n.a), b = toLin(n.b);
      if (n.o === "+") return add(a, b); if (n.o === "-") return add(a, b, F(-1));
      if (n.o === "*") { if (isC(a)) return sc(b, cv(a)); if (isC(b)) return sc(a, cv(b)); fail("Two letters multiplied together — check the line."); }
      if (!isC(b)) fail("Don't divide by a letter here."); if (cv(b).n === 0) fail("You can't divide by 0."); return sc(a, ONE.div(cv(b)));
    }
  }
  fail("I can't read this line.");
}
// Left-to-right value (ignores × ÷ before + −): used to spot order-of-operations slips.
function l2r(n) {
  const flat = []; (function walk(x) { if (x.k === "op" && !x.imp) { walk(x.a); flat.push(x.o); walk(x.b); } else flat.push(x); })(n);
  let acc = valueOf(flat[0]);
  for (let i = 1; i < flat.length; i += 2) { const o = flat[i], b = valueOf(flat[i + 1]); acc = o === "+" ? acc.add(b) : o === "-" ? acc.sub(b) : o === "*" ? acc.mul(b) : b.n === 0 ? acc : acc.div(b); }
  return acc;
}
function valueOf(n) { const p = toPoly(n); return pco(p, 0); }

// ------------------------------------------------------------ printing
const SYM = { "+": " + ", "-": " − ", "*": " × ", "/": " ÷ " };
const PREC = { "+": 1, "-": 1, "*": 2, "/": 2 };
function sfr(f) { const s = f.d === 1 ? String(Math.abs(f.n)) : `${Math.abs(f.n)}/${f.d}`; return f.n < 0 ? "−" + s : s; }
function show(n, ctx = 0, right = false) {
  switch (n.k) {
    case "num": { const s = sfr(n.v); return n.v.n < 0 && ctx > 0 ? `(${s})` : s; }
    case "var": return "x";
    case "par": return `(${show(n.a)})`;
    case "neg": return (ctx > 1 ? "(" : "") + "−" + show(n.a, 3) + (ctx > 1 ? ")" : "");
    case "pow": return show(n.a, 4) + "^" + n.n;
    case "op": { const pr = PREC[n.o], s = show(n.a, pr) + SYM[n.o] + show(n.b, pr, true); return pr < ctx || (right && pr === ctx) ? `(${s})` : s; }
  }
  return "?";
}
function showPoly(p, v = "x") {
  const ks = Object.keys(p).map(Number).sort((a, b) => b - a); if (!ks.length) return "0";
  let s = "";
  ks.forEach((k, i) => {
    const c = p[k], neg = c.n < 0, a = neg ? c.mul(-1) : c;
    const cs = k === 0 ? sfr(a) : a.eq(ONE) ? "" : a.d === 1 ? String(a.n) : `(${sfr(a)})`;
    const body = cs + (k === 0 ? "" : k === 1 ? v : `${v}^${k}`);
    s += i === 0 ? (neg ? "−" : "") + body : (neg ? " − " : " + ") + body;
  });
  return s;
}

// ------------------------------------------------------------ one reduction step for calculations
function reduceOnce(n) {
  if (n.k === "par") { const a = strip(n.a); if (a.k === "num") return null; const r = reduceOnce(n.a); return r ? { k: "par", a: r } : null; }
  if (n.k === "neg") { const a = strip(n.a); if (a.k === "num") return { k: "num", v: a.v.mul(-1) }; const r = reduceOnce(n.a); return r ? { k: "neg", a: r } : null; }
  if (n.k === "pow") { const a = strip(n.a); if (a.k === "num") return { k: "num", v: valueOf(n) }; const r = reduceOnce(n.a); return r ? { k: "pow", a: r, n: n.n } : null; }
  if (n.k === "op") {
    const a = strip(n.a), b = strip(n.b);
    if (a.k === "num" && b.k === "num") return { k: "num", v: valueOf({ k: "op", o: n.o, a, b }) };
    const ra = reduceOnce(n.a); if (ra) return Object.assign({}, n, { a: ra });
    const rb = reduceOnce(n.b); if (rb) return Object.assign({}, n, { b: rb });
  }
  return null;
}

// ------------------------------------------------------------ calculation steps
const FINAL_NUM = /^\s*[-−]?\s*(\d+(\.\d+)?|\d+\s*\/\s*\d+|\d+\s+\d+\s*\/\s*\d+)\s*$/;
function checkCalcLine(task, prev, line) {
  const target = task.value;
  const raw = String(line).trim().replace(/^=\s*/, "");
  if (!raw) return { ok: false, msg: "Type a line of working." };
  const parts = raw.split("=").map(x => x.trim());
  if (parts.some(x => !x)) return { ok: false, msg: "Something is missing next to =." };
  const prevAst = parse(prev, null);
  for (const part of parts) {
    let ast; try { ast = parse(part, null); } catch (e) { if (e.learner) return { ok: false, msg: e.message, format: true }; throw e; }
    const val = valueOf(ast);
    if (!val.eq(target)) {
      let msg = "This line isn't equal to the line before.", code = "calc_err";
      if ((l2r(prevAst).eq(val) && !l2r(prevAst).eq(target)) || earlyAddSub(prev).some(x => x.eq(val))) { msg += " Remember the order: brackets, then powers, then × and ÷, then + and −. You worked left to right."; code = "order_ops"; }
      else if (val.mul(-1).eq(target)) { msg += " Check a minus sign."; code = "sign"; }
      else { const nx = reduceOnce(prevAst); if (nx) msg += ` Do the next operation first: look at ${firstOp(prevAst)}.`; }
      return { ok: false, msg, code };
    }
  }
  const last = parts[parts.length - 1];
  const done = FINAL_NUM.test(last);
  if (done && /\d\s*\/\s*\d/.test(last)) {
    const m = last.match(/(\d+)\s*\/\s*(\d+)\s*$/); const g = gcdi(+m[1], +m[2]);
    if (g !== 1) return { ok: false, msg: "Correct value — now simplify the fraction.", keep: true };
    if (+m[1] > +m[2] && task.mixed) return { ok: true, done: true, msg: "Correct! (You could also write it as a mixed number.)" };
  }
  return { ok: true, done, msg: done ? "Correct! 🎉" : "✓" };
}
// Values reached by doing a + or − before a neighbouring × or ÷ (e.g. 36 − 4 × 5 read as 32 × 5).
function earlyAddSub(prev) {
  const out = [], toks = tokenise(normalise(prev, null), null);
  for (let i = 0; i + 3 < toks.length + 1; i++) {
    const a = toks[i], o = toks[i + 1], b = toks[i + 2], o2 = toks[i + 3];
    if (!a || !o || !b || a.t !== "num" || b.t !== "num" || !(o.t === "+" || o.t === "-") || !o2 || !"*/÷".includes(o2.t)) continue;
    if (i > 0 && !["(", "+", "-"].includes(toks[i - 1].t)) continue;
    const v = o.t === "+" ? a.v.add(b.v) : a.v.sub(b.v), nt = toks.slice(0, i).concat([{ t: "num", v }], toks.slice(i + 3));
    try { out.push(valueOf(parseToks(nt))); } catch (e) { /* ignore */ }
  }
  return out;
}
function firstOp(ast) {
  let found = null;
  (function walk(n) {
    if (found) return;
    if (n.k === "par" || n.k === "neg") return walk(n.a);
    if (n.k === "pow") { const a = strip(n.a); if (a.k === "num") { found = show(n); return; } return walk(n.a); }
    if (n.k === "op") { const a = strip(n.a), b = strip(n.b); if (a.k === "num" && b.k === "num") { found = show({ k: "op", o: n.o, a, b }); return; } walk(n.a); walk(n.b); }
  })(ast);
  return found || "the brackets";
}
const gcdi = (a, b) => { while (b) [a, b] = [b, a % b]; return Math.abs(a); };

// ------------------------------------------------------------ equation steps
// a trailing note such as (÷3), (-5), (−2x), [×2], (÷3 both sides) — only after an equation's right-hand side
const NOTE = /\s*[(\[]\s*[÷\/×x*+\-−–]\s*(?:\d+(?:\.\d+)?[a-z]?|[a-z])\s*(?:both sides)?\s*[)\]]\s*$/i;
function stripNote(raw) { const m = raw.match(NOTE); if (!m) return raw; const rest = raw.slice(0, m.index); return /=\s*\S/.test(rest) && !/[+\-−*×÷\/=(]\s*$/.test(rest) ? rest : raw; }
function sides(line, v) {
  const raw = stripNote(String(line).trim());
  const eqs = (raw.match(/=/g) || []).length;
  if (eqs === 0) fail("An equation line needs one = sign, e.g. 2x + 3 = 11.");
  if (eqs > 1) fail("Write one equation per line (only one = sign).");
  const [l, r] = raw.split("=");
  if (!l.trim() || !r.trim()) fail("Something is missing next to =.");
  return [parse(l, v), parse(r, v), l.trim(), r.trim()];
}
function solOf(L, R) {
  const d = psub(toPoly(L), toPoly(R));
  if (pdeg(d) > 1) return { deg: pdeg(d) };
  const a = pco(d, 1), b = pco(d, 0);
  if (a.n === 0) return { none: true, always: b.n === 0 };
  return { x: b.mul(-1).div(a) };
}
function solPoly(Lp, Rp) { const d = psub(Lp, Rp); const a = pco(d, 1), b = pco(d, 0); return a.n === 0 || pdeg(d) > 1 ? null : b.mul(-1).div(a); }
function topTerms(n, sign = 1, out = [], root = true) {
  if (root) n = strip(n);
  if (n.k === "op" && (n.o === "+" || n.o === "-")) { topTerms(n.a, sign, out, false); topTerms(n.b, n.o === "-" ? -sign : sign, out, false); }
  else out.push({ n, s: sign });
  return out;
}
// Typical wrong moves from the previous line; each gives the solution it would lead to.
function slips(L, R) {
  const out = [], first = [], Lp = toPoly(L), Rp = toPoly(R);
  const add = (x, msg, code) => { if (x) (/bracket/.test(msg) ? first : out).push({ x, msg, code }); };
  for (const [side, other, which] of [[L, Rp, "L"], [R, Lp, "R"]]) {
    for (const t of topTerms(side)) {
      const tp = pscale(toPoly(t.n), F(t.s)); if (!Object.keys(tp).length) continue;
      const sideP = which === "L" ? Lp : Rp;
      const wrong = which === "L" ? solPoly(psub(sideP, tp), padd(other, tp)) : solPoly(padd(other, tp), psub(sideP, tp));
      add(wrong, "When a term moves to the other side, its sign changes (+ becomes −, − becomes +). Or: do the same thing to both sides.", "move_sign");
    }
    for (const t of topTerms(side)) {
      const n = t.n;
      if (n.k === "op" && n.o === "*" ) {
        const a = strip(n.a), b = strip(n.b);
        const [k, br] = a.k === "num" ? [a.v, b] : b.k === "num" ? [b.v, a] : [null, null];
        if (k && br && br.k === "op" && (br.o === "+" || br.o === "-")) {
          const tt = topTerms(br); if (tt.length < 2) continue;
          const first = pscale(pscale(toPoly(tt[0].n), F(tt[0].s)), k);
          let rest = {}; for (const q of tt.slice(1)) rest = padd(rest, pscale(toPoly(q.n), F(q.s)));
          const good = pscale(pscale(toPoly(br), k), F(t.s));
          const bad = pscale(padd(first, rest), F(t.s));
          const sideP = which === "L" ? Lp : Rp, newSide = padd(psub(sideP, good), bad);
          add(which === "L" ? solPoly(newSide, other) : solPoly(other, newSide), `Multiply every term inside the bracket by ${sfr(k)}.`, "bracket_first_only");
        }
      }
      const negBr = n.k === "neg" ? strip(n.a) : (t.s < 0 && n.k === "par" ? strip(n) : null);
      if (negBr && negBr.k === "op" && (negBr.o === "+" || negBr.o === "-")) {
        const br = negBr, tt = topTerms(br); if (tt.length >= 2) {
          const sideP = which === "L" ? Lp : Rp; let bad = pscale(pscale(toPoly(tt[0].n), F(tt[0].s)), F(-1));
          for (const q of tt.slice(1)) bad = padd(bad, pscale(toPoly(q.n), F(q.s)));
          const sg = n.k === "neg" ? F(t.s) : F(1), cur = pscale(toPoly(n), F(t.s));
          const newSide = padd(psub(sideP, cur), pscale(bad, sg));
          add(which === "L" ? solPoly(newSide, other) : solPoly(other, newSide), "A minus in front of a bracket changes the sign of every term inside.", "neg_bracket");
        }
      }
    }
  }
  // a·x = c  ->  x = c − a, x = c·a, x = a/c
  const d = psub(Lp, Rp), a = pco(d, 1), c = pco(d, 0).mul(-1);
  const simple = (pdeg(Lp) === 1 && pco(Lp, 0).n === 0 && isConst(Rp)) || (pdeg(Rp) === 1 && pco(Rp, 0).n === 0 && isConst(Lp));
  if (simple && a.n !== 0 && !a.eq(ONE)) {
    add(c.sub(a), `To undo × ${sfr(a)}, divide both sides by ${sfr(a)} (don't subtract).`, "subtract_not_divide");
    add(c.mul(a), `To undo × ${sfr(a)}, divide both sides by ${sfr(a)} (don't multiply).`, "multiply_not_divide");
    if (c.n !== 0) add(a.div(c), "Divide the number side by the number in front of x, not the other way round.", "divide_upside_down");
  }
  return first.concat(out);
}
const isSolved = (l, r, v) => { const re = new RegExp(`^\\s*${v}\\s*$`); return (re.test(l) && FINAL_NUM.test(r)) || (re.test(r) && FINAL_NUM.test(l)); };
function checkEqLine(task, prev, line) {
  const v = task.v || "x";
  let L, R, l, r;
  try { [L, R, l, r] = sides(line, v); } catch (e) { if (e.learner) return { ok: false, msg: e.message, format: true }; throw e; }
  let s; try { s = solOf(L, R); } catch (e) { if (e.learner) return { ok: false, msg: e.message, format: true }; throw e; }
  if (s.deg) return { ok: false, msg: `Something went wrong: this line has ${v}² in it.` };
  if (s.none) return { ok: false, msg: s.always ? `This line is always true — the ${v} has been lost. Check the line before.` : `This line can't be true for any ${v} — check the ${v} terms.` };
  if (!s.x.eq(task.value)) {
    const [Lp, Rp] = sides(prev, v);
    const hit = slips(Lp, Rp).find(c => c.x.eq(s.x));
    return { ok: false, code: hit ? hit.code : "unbalanced", msg: "This line doesn't balance with the line before. " + (hit ? hit.msg : "Whatever you do to one side, do the same to the other side.") };
  }
  const done = isSolved(l, r, v);
  if (done) {
    const numSide = new RegExp(`^\\s*${v}\\s*$`).test(l) ? r : l, m = numSide.match(/(\d+)\s*\/\s*(\d+)\s*$/);
    if (m && gcdi(+m[1], +m[2]) !== 1) return { ok: false, msg: "Correct value — now simplify the fraction.", keep: true };
  }
  return { ok: true, done, msg: done ? "Solved! 🎉" : "✓" };
}
// Suggest a next line for an equation (fractions out, brackets out, x terms to one side, numbers to the other, divide).
function nextEq(task, prev) {
  const v = task.v || "x"; const [L, R] = sides(prev, v); let Lp = toPoly(L), Rp = toPoly(R);
  const cur = `${showPoly(Lp, v)} = ${showPoly(Rp, v)}`, prevN = String(prev).replace(/\s+/g, "").replace(/−/g, "-").replace(/×/g, "*");
  let den = 1; for (const p of [Lp, Rp]) for (const k in p) den = den / gcdi(den, p[k].d) * p[k].d;
  if (den > 1) return [`${showPoly(pscale(Lp, F(den)), v)} = ${showPoly(pscale(Rp, F(den)), v)}`, `Multiply both sides by ${den} to clear the fractions.`];
  if (cur.replace(/\s+/g, "").replace(/−/g, "-") !== prevN) return [cur, "Multiply out the brackets and collect like terms on each side."];
  const aL = pco(Lp, 1), aR = pco(Rp, 1);
  if (aL.n !== 0 && aR.n !== 0) { const t = aR.cmp(aL) > 0 ? aL : aR, tp = { 1: t }; return [`${showPoly(psub(Lp, tp), v)} = ${showPoly(psub(Rp, tp), v)}`, `Take ${showPoly(tp, v)} from both sides.`]; }
  if (aL.n === 0) { [Lp, Rp] = [Rp, Lp]; }
  const a = pco(Lp, 1), b = pco(Lp, 0);
  if (b.n !== 0) { const bp = pconst(b); return [`${showPoly(psub(Lp, bp), v)} = ${showPoly(psub(Rp, bp), v)}`, b.n > 0 ? `Take ${sfr(b)} from both sides.` : `Add ${sfr(b.mul(-1))} to both sides.`]; }
  return [`${v} = ${sfr(pco(Rp, 0).div(a))}`, `Divide both sides by ${sfr(a)}.`];
}
function nextCalc(task, prev) { const ast = parse(prev, null), r = reduceOnce(ast); return r ? [show(r), `Work out ${firstOp(ast)} first.`] : [show(strip(ast)), "That's the answer — type it on its own line."]; }

// ------------------------------------------------------------ inequalities: a line keeps the same solution set {x op c}
const INEQ = /[<>≤≥]/g, FLIP = { "<": ">", ">": "<", "≤": "≥", "≥": "≤" };
function ineqSides(line, v) {
  const raw = stripNote(String(line).trim()).replace(/<=|=</g, "≤").replace(/>=|=>/g, "≥");
  const ops = raw.match(INEQ) || [];
  if (raw.includes("=")) fail("An inequality uses < > ≤ ≥ (type <= or >= for ≤ ≥), not =.");
  if (ops.length !== 1) fail(ops.length ? "Use one inequality sign per line." : "This line needs an inequality sign: < > ≤ or ≥.");
  const [l, r] = raw.split(INEQ);
  if (!l.trim() || !r.trim()) fail("Something is missing next to the inequality sign.");
  return [parse(l, v), parse(r, v), ops[0], l.trim(), r.trim()];
}
function ineqSet(L, R, op) {            // -> {op, c} meaning x op c
  const d = psub(toPoly(L), toPoly(R)); if (pdeg(d) > 1) return { deg: true };
  const a = pco(d, 1), b = pco(d, 0); if (a.n === 0) return { none: true };
  const c = b.mul(-1).div(a); return { op: a.n > 0 ? op : FLIP[op], c };
}
function checkIneqLine(task, prev, line) {
  const v = task.v || "x"; let L, R, op, l, r;
  try { [L, R, op, l, r] = ineqSides(line, v); } catch (e) { if (e.learner) return { ok: false, msg: e.message, format: true }; throw e; }
  let s; try { s = ineqSet(L, R, op); } catch (e) { if (e.learner) return { ok: false, msg: e.message, format: true }; throw e; }
  if (s.deg) return { ok: false, msg: `This line has ${v}² in it — check the line before.`, code: "ineq_err" };
  if (s.none) return { ok: false, msg: `The ${v} has disappeared — check the ${v} terms.`, code: "ineq_err" };
  if (s.c.eq(task.value) && s.op !== task.op) {
    if (s.op === FLIP[task.op]) return { ok: false, code: "ineq_no_flip", msg: "The sign points the wrong way. When you multiply or divide both sides by a negative number, flip the inequality sign." };
    return { ok: false, code: "ineq_strict", msg: "Check whether the sign should include “or equal to” (≤ ≥) or not (< >)." };
  }
  if (!s.c.eq(task.value)) {
    const [Lp, Rp] = ineqSides(prev, v);
    const hit = slips(Lp, Rp).find(c => c.x.eq(s.c));
    return { ok: false, code: hit ? hit.code : "unbalanced", msg: "This line doesn't keep the same answer as the line before. " + (hit ? hit.msg : "Do the same to both sides.") };
  }
  const re = new RegExp(`^\\s*${v}\\s*$`), done = (re.test(l) && FINAL_NUM.test(r)) || (re.test(r) && FINAL_NUM.test(l));
  return { ok: true, done, msg: done ? "Solved! 🎉" : "✓" };
}
function nextIneq(task, prev) {
  const v = task.v || "x"; const [L, R, op] = ineqSides(prev, v);
  const eqLine = stripNote(String(prev).trim()).replace(/<=|=<|>=|=>/g, "=").replace(/[<>≤≥]/g, "=");
  const [nx, why] = nextEq(Object.assign({}, task, { type: "eq" }), eqLine);
  const m = nx.split("="); const Ln = parse(m[0], v), Rn = parse(m[1], v);
  // the sign flips exactly when we divide or multiply by a negative: compare orientation of x coefficient
  const before = pco(psub(toPoly(L), toPoly(R)), 1), after = pco(psub(toPoly(Ln), toPoly(Rn)), 1);
  const op2 = before.cmp(0) * after.cmp(0) < 0 ? FLIP[op] : op;
  return [`${m[0].trim()} ${op2} ${m[1].trim()}`, why + (op2 !== op ? " Dividing by a negative number flips the sign." : "")];
}
// ------------------------------------------------------------ simultaneous equations: every line must be true for the solution
function splitEqs(line) { return String(line).split(/[;,]|\band\b/i).map(x => x.trim()).filter(Boolean); }
function linEq(e, vars) {
  const raw = stripNote(e); const n = (raw.match(/=/g) || []).length;
  if (n !== 1) fail(n ? "One = per equation (separate two equations with a comma)." : "Each equation needs an = sign.");
  const [l, r] = raw.split("="); if (!l.trim() || !r.trim()) fail("Something is missing next to =.");
  const d = toLin({ k: "op", o: "-", a: parse(l, vars), b: parse(r, vars) });
  return { d, l: l.trim(), r: r.trim() };
}
const linAt = (d, sol) => { let s = ZERO; for (const k in d) s = s.add(k === "1" ? d[k] : d[k].mul(sol[k])); return s; };
function checkSysLine(task, lines, line) {
  const vars = task.vars || "xy"; let eqs;
  try { eqs = splitEqs(line).map(e => linEq(e, vars)); } catch (e) { if (e.learner) return { ok: false, msg: e.message, format: true }; throw e; }
  if (!eqs.length) return { ok: false, msg: "Type an equation.", format: true };
  for (const q of eqs) {
    const keys = Object.keys(q.d).filter(k => k !== "1");
    if (!keys.length) return q.d["1"] ? { ok: false, code: "sys_err", msg: "This line says two different numbers are equal — something went wrong in the line before." } : { ok: false, code: "sys_lost", msg: "Both letters have disappeared (0 = 0). Subtract when the coefficients are the same, add when they are opposite — and do it to every term." };
    if (linAt(q.d, task.value).n !== 0) {
      const orig = splitEqs(task.start).map(e => linEq(e, vars).d);
      const sameVarsAs = (d, e) => ["x", "y"].concat(vars.split("")).every(k => k === "1" || (d[k] || ZERO).eq(e[k] || ZERO));
      let msg = "This equation isn't true for the answer — check each term.", code = "sys_err";
      for (const E of orig) for (let k = -9; k <= 9; k++) { if (!k || k === 1) continue; const kE = {}; for (const key in E) kE[key] = E[key].mul(k); if (sameVarsAs(q.d, kE) && !(q.d["1"] || ZERO).eq(kE["1"] || ZERO)) { msg = "When you multiply an equation, multiply every term — including the number on the other side."; code = "sys_mult_all"; } }
      if (orig.length === 2) for (const sgn of [1, -1]) { const comb = {}; for (const key of new Set(Object.keys(orig[0]).concat(Object.keys(orig[1])))) comb[key] = (orig[0][key] || ZERO).add((orig[1][key] || ZERO).mul(sgn)); if (sameVarsAs(q.d, comb) && !(q.d["1"] || ZERO).eq(comb["1"] || ZERO)) { msg = `When you ${sgn > 0 ? "add" : "subtract"} the equations, ${sgn > 0 ? "add" : "subtract"} the numbers on the right too (watch the signs).`; code = "sys_combine_sign"; } }
      return { ok: false, msg, code };
    }
  }
  const all = lines.concat([line]).flatMap(splitEqs), found = {};
  for (const e of all) { const m = e.replace(/\s+/g, "").replace(/[−–]/g, "-").match(/^([a-z])=(-?[\d./]+)$|^(-?[\d./]+)=([a-z])$/); if (m) found[m[1] || m[4]] = true; }
  const done = vars.split("").every(k => found[k]);
  return { ok: true, done, msg: done ? "Solved! 🎉" : "✓" };
}
function nextSys(task, lines) {
  const vars = task.vars || "xy", [a, b] = vars.split(""), E = splitEqs(task.start).map(e => linEq(e, vars).d);
  const co = (d, k) => d[k] || ZERO, rhs = d => (d["1"] || ZERO).mul(-1);
  const fmt = (d) => { let s = ""; for (const k of [a, b]) { const c = co(d, k); if (c.n === 0) continue; const neg = c.n < 0, m = neg ? c.mul(-1) : c, cs = m.eq(ONE) ? "" : sfr(m); s += s ? (neg ? " − " : " + ") + cs + k : (neg ? "−" : "") + cs + k; } return `${s || "0"} = ${sfr(rhs(d))}`; };
  const sc = (d, k) => { const o = {}; for (const key in d) o[key] = d[key].mul(k); return o; };
  const plan = [];
  const yb1 = co(E[0], b), yb2 = co(E[1], b); let l1 = E[0], l2 = E[1];
  if (yb1.n && yb2.n && yb1.d === 1 && yb2.d === 1) { const A = Math.abs(yb1.n), B = Math.abs(yb2.n), lcm = A / gcdi(A, B) * B; if (lcm / A !== 1) l1 = sc(E[0], F(lcm / A)); if (lcm / B !== 1) l2 = sc(E[1], F(lcm / B)); }
  if (!(l1 === E[0])) plan.push([fmt(l1), `Multiply the first equation so the ${b} terms match.`]);
  if (!(l2 === E[1])) plan.push([fmt(l2), `Multiply the second equation so the ${b} terms match.`]);
  const same = co(l1, b).eq(co(l2, b)), comb = {}; for (const key of new Set(Object.keys(l1).concat(Object.keys(l2)))) comb[key] = (l1[key] || ZERO).add((l2[key] || ZERO).mul(same ? -1 : 1));
  plan.push([fmt(comb), same ? `The ${b} terms are the same: subtract the equations.` : `The ${b} terms are opposite: add the equations.`]);
  const xv = task.value[a], yv = task.value[b];
  plan.push([`${a} = ${sfr(xv)}`, `Divide both sides by ${sfr(co(comb, a))}.`]);
  const ca = co(E[0], a), cb = co(E[0], b);
  plan.push([`${sfr(cb).replace(/^1$/, "")}${b} = ${sfr(rhs(E[0]).sub(ca.mul(xv)))}`, `Put ${a} = ${sfr(xv)} into the first equation and move the number across.`]);
  plan.push([`${b} = ${sfr(yv)}`, `Divide both sides by ${sfr(cb)}.`]);
  const have = new Set(lines.flatMap(splitEqs).map(e => { try { const d = linEq(e, vars).d; return JSON.stringify(Object.keys(d).sort().map(k => [k, d[k].n, d[k].d])); } catch (x) { return e; } }));
  const key = l => { const d = linEq(l, vars).d; return JSON.stringify(Object.keys(d).sort().map(k => [k, d[k].n, d[k].d])); };
  for (const [l, why] of plan) if (!have.has(key(l))) return [l, why];
  return [null, "You have both values — you're done."];
}
// ------------------------------------------------------------ public API
// task = {type:'calc', start:'36 − 4 × (7 − 2)', value:Fr}  or  {type:'eq', start:'3(x − 2) = 12', v:'x', value:Fr}
function checkLine(task, lines, line) {
  const prev = lines.length ? lines[lines.length - 1] : task.start;
  try { return task.type === "eq" ? checkEqLine(task, prev, line) : task.type === "ineq" ? checkIneqLine(task, prev, line) : task.type === "sys" ? checkSysLine(task, lines, line) : checkCalcLine(task, prev, line); }
  catch (e) { if (e.learner) return { ok: false, msg: e.message, format: true }; return { ok: false, msg: "I can't read this line." }; }
}
function nextStep(task, lines) {
  const prev = lines.length ? lines[lines.length - 1] : task.start;
  try { return task.type === "eq" ? nextEq(task, prev) : task.type === "ineq" ? nextIneq(task, prev) : task.type === "sys" ? nextSys(task, lines) : nextCalc(task, prev); } catch (e) { return [null, "Look at the line before again."]; }
}
const FORMAT = {
  calc: "One step per line. Use + − × ÷ (or * /, or x for ×), brackets ( ), fractions like 3/4, mixed numbers like 2 1/2. You can start a line with =. Finish with the answer on its own.",
  ineq: "One inequality per line, e.g. 3x + 5 < 20, then 3x < 15, then x < 5. Type <= or >= for ≤ ≥. If you multiply or divide by a negative number, flip the sign. Finish with x < … (or ≤ > ≥).",
  sys: "One or two equations per line (separate two with a comma), e.g. 2x + 3y = 12. Every line must be true for the answer. Finish with x = … and y = … (in any order, on one line or two).",
  eq: "One equation per line, e.g. 3x + 5 = 20, then 3x = 15, then x = 5. Write 3x or 3*x; 3(x − 2) is fine; fractions like x/4 or (x + 1)/3. You may add a note at the end like (÷3). Finish with x = …",
};
function evaluate(s) { return valueOf(parse(String(s).trim().replace(/^=\s*/, ""), null)); }
function solve(s, v = "x") { const [L, R] = sides(s, v); return solOf(L, R).x; }

const API = { checkLine, nextStep, FORMAT, evaluate, solve, parse, toPoly, showPoly, show };
if (typeof module !== "undefined" && module.exports) module.exports = API; else root.MQS = API;
})(typeof window !== "undefined" ? window : globalThis);
