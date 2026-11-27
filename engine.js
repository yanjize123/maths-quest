/* Maths Quest engine v2 (2026-11-27: pure calculation types, 68% pure share, step-by-step types) — question generators (UK Year 1–11 / GCSE), answer checking,
   placement test, adaptive selection, gamification. Runs in the browser and in Node. */
(function (root) {
"use strict";

// ---------------------------------------------------------------- fractions
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; }
class Fr {
  constructor(n, d = 1) { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d) || 1; this.n = n / g; this.d = d / g; }
  add(o) { o = toFr(o); return new Fr(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o) { o = toFr(o); return new Fr(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o) { o = toFr(o); return new Fr(this.n * o.n, this.d * o.d); }
  div(o) { o = toFr(o); return new Fr(this.n * o.d, this.d * o.n); }
  eq(o) { o = toFr(o); return this.n === o.n && this.d === o.d; }
  cmp(o) { o = toFr(o); return this.n * o.d - o.n * this.d; }
  val() { return this.n / this.d; }
}
function toFr(x) { if (x instanceof Fr) return x; if (Number.isInteger(x)) return new Fr(x, 1); throw new Error("not exact: " + x); }
const F = (n, d = 1) => new Fr(n, d);
function pow10(n) { return n >= 0 ? F(10 ** n) : F(1, 10 ** -n); }
function frStr(s) {
  s = String(s).trim();
  if (s.includes("/")) { const [a, b] = s.split("/"); const den = frStr(b); return den.n === 0 ? null : frStr(a).div(den); }
  let sign = 1; if (s[0] === "-") { sign = -1; s = s.slice(1); }
  const [ip, fp = ""] = s.split(".");
  return F(sign * parseInt((ip || "0") + fp, 10), 10 ** fp.length);
}
const num = x => (x instanceof Fr ? x.val() : x);

// ---------------------------------------------------------------- helpers
const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const choice = a => a[Math.floor(Math.random() * a.length)];
const rnd = Math.random;
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const sample = (a, k) => shuffle(a).slice(0, k);
const range = (a, b) => { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; };
const nz = (a, b) => choice(range(a, b).filter(v => v !== 0));
const cm = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const sum = a => a.reduce((x, y) => x + y, 0);

const THEMES = [
  { who: "Captain Nova", place: "the space station", thing: "energy crystal", things: "energy crystals", emoji: "🚀" },
  { who: "Ruby the dragon keeper", place: "Dragon Valley", thing: "dragon egg", things: "dragon eggs", emoji: "🐉" },
  { who: "the pirate crew", place: "Skull Island", thing: "gold coin", things: "gold coins", emoji: "🏴‍☠️" },
  { who: "the football club", place: "the stadium", thing: "match ticket", things: "match tickets", emoji: "⚽" },
  { who: "the robot bakery", place: "Cog Street", thing: "cupcake", things: "cupcakes", emoji: "🧁" },
  { who: "the block builders", place: "Block World", thing: "block", things: "blocks", emoji: "🧱" },
  { who: "Professor Owl", place: "the wizard school", thing: "potion bottle", things: "potion bottles", emoji: "🦉" },
  { who: "the deep-sea divers", place: "Coral Reef Base", thing: "pearl", things: "pearls", emoji: "🐙" },
];
const T = () => choice(THEMES);

function fdec(f) {
  f = toFr(f); const sign = f.n < 0 ? "-" : ""; let n = Math.abs(f.n); const d = f.d;
  const ip = Math.floor(n / d); let rem = n - ip * d; let digits = "";
  while (rem && digits.length < 15) { rem *= 10; const q = Math.floor(rem / d); digits += q; rem -= q * d; }
  return sign + ip + (digits ? "." + digits : "");
}
function sfrac(f) { f = toFr(f); return f.d === 1 ? String(f.n) : `${f.n}/${f.d}`; }
function smixed(f) {
  f = toFr(f); if (f.d === 1) return String(f.n);
  if (Math.abs(f.val()) > 1) { const w = Math.trunc(f.val()); const r = f.sub(w); const ra = new Fr(Math.abs(r.n), r.d); return `${sfrac(f)}  (= ${w} ${ra.n}/${ra.d})`; }
  return sfrac(f);
}
function roundHalfUp(x, dp = 0) { const q = 10 ** dp; const v = toFr(x).mul(q); return F(Math.floor(v.add(F(1, 2)).val() + 1e-12), q); }
function lin(a, b, v = "x") {
  let s = "";
  if (a) s = a === 1 ? v : a === -1 ? `-${v}` : `${a}${v}`;
  if (b) { if (s) s += b > 0 ? ` + ${b}` : ` − ${-b}`; else s = String(b); }
  return s || "0";
}
function pclean(p) { const o = {}; for (const k in p) if (p[k].n !== 0) o[k] = p[k]; return o; }
function P(obj) { const o = {}; for (const k in obj) o[k] = toFr(obj[k]); return pclean(o); }
function ppoly(p, v = "x") {
  const ks = Object.keys(p).map(Number).sort((a, b) => b - a); const out = [];
  for (const k of ks) {
    const c = toFr(p[k]); if (c.n === 0) continue;
    const mag = new Fr(Math.abs(c.n), c.d);
    const cs = mag.eq(1) && k > 0 ? "" : sfrac(mag);
    const vs = k === 0 ? "" : k === 1 ? v : k === 2 ? `${v}²` : `${v}^${k}`;
    if (!out.length) out.push((c.n < 0 ? "-" : "") + cs + vs); else out.push((c.n < 0 ? " − " : " + ") + cs + vs);
  }
  return out.join("") || "0";
}
function pmul(p, q) {
  const r = {};
  for (const a in p) for (const b in q) { const k = +a + +b; r[k] = (r[k] || F(0)).add(toFr(p[a]).mul(toFr(q[b]))); }
  return pclean(r);
}
function peq(a, b) {
  if (!a || !b) return false; a = pclean(a); b = pclean(b);
  const ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
  return ka.length === kb.length && ka.every((k, i) => k === kb[i] && a[k].eq(b[k]));
}
function Q(topic, text, kind, answer, show, o = {}) {
  text = text.charAt(0).toUpperCase() + text.slice(1);
  return { topic, text, kind, answer, show, fmt: o.fmt || "", hint: o.hint || "", sol: o.sol || "", tol: o.tol ?? null, v: o.v || "x", emoji: o.emoji || "", names: o.names };
}
const dpTol = dp => 0.5 * 10 ** -dp + 1e-9;

// ---------------------------------------------------------------- parsing & checking
const UNIT = /(km\/h|m\/s|mph|miles?|°c|cm²|m²|cm³|m³|cm|mm|km|kg|ml|m|g|l|p|degrees|deg|°|%|²|³|units?|seconds?|secs?|minutes?|mins?|hours?|hrs?|days?|weeks?|coins?)$/;
function clean(s) {
  s = String(s).trim().toLowerCase();
  for (const [a, b] of [["−", "-"], ["–", "-"], ["—", "-"], [",", ""], ["£", ""], ["$", ""], ["÷", "/"]]) s = s.split(a).join(b);
  return s;
}
const SF = /^\s*(-?\d+(?:\.\d+)?)\s*(?:[x×*]\s*10\s*\^\s*\(?\s*(-?\d+)\s*\)?|e\s*(-?\d+))\s*$/;
function parseNum(s) {
  if (s == null) return null;
  s = clean(s).replace(/^[a-z]\s*(<=|>=|=|<|>|≤|≥)\s*/, "");
  let m = s.match(SF);
  if (m) return frStr(m[1]).mul(pow10(parseInt(m[2] ?? m[3], 10)));
  for (let i = 0; i < 2; i++) s = s.trim().replace(UNIT, "").trim();
  m = s.match(/^(-?)(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (m) { if (+m[4] === 0) return null; const v = F(+m[2]).add(F(+m[3], +m[4])); return m[1] ? v.mul(-1) : v; }
  m = s.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/);
  if (m) { const den = frStr(m[2]); return den.n === 0 ? null : frStr(m[1]).div(den); }
  if (/^-?\d+(?:\.\d+)?$|^-?\.\d+$|^-?\d+\.$/.test(s)) return frStr(s.replace(/\.$/, ""));
  return null;
}
function parseList(s) {
  s = clean(s); const named = {};
  for (const m of s.matchAll(/([a-z])\s*=\s*(-?\d+(?:\.\d+)?(?:\/\d+)?)/g)) named[m[1]] = m[2];
  const toks = s.match(/-?\d+(?:\.\d+)?(?:\s*\/\s*\d+)?/g) || [];
  const vals = [];
  for (const t of toks) { const v = parseNum(t); if (!v) return [null, named]; vals.push(v); }
  return [vals, named];
}
function parsePoly(s, v = "x") {
  s = clean(s).replace(/ /g, "").replace(/\*\*/g, "^").replace(/²/g, "^2").replace(/³/g, "^3").replace(/\*/g, "");
  if (!s) return null;
  if (!"+-".includes(s[0])) s = "+" + s;
  const terms = s.match(/[+-][^+-]+/g);
  if (!terms || terms.join("") !== s) return null;
  const re = new RegExp(`^(\\d+(?:\\.\\d+)?|\\d+/\\d+)?(${v}(?:\\^(\\d+))?)?$`);
  const poly = {};
  for (const t of terms) {
    const sign = t[0] === "-" ? -1 : 1, body = t.slice(1), m = body.match(re);
    if (!m || !body) return null;
    const k = !m[2] ? 0 : m[3] ? +m[3] : 1;
    const c = m[1] ? frStr(m[1]) : F(1);
    poly[k] = (poly[k] || F(0)).add(c.mul(sign));
  }
  return pclean(poly);
}
function parseFactor(s, v = "x") {
  s = clean(s).replace(/ /g, "").replace(/\*\*/g, "^").replace(/²/g, "^2").replace(/\*/g, "");
  const m = s.match(/^(-?\d*)((?:\([^()]+\)(?:\^2)?)+)$/);
  if (!m) return null;
  const groups = [...m[2].matchAll(/\(([^()]+)\)(\^2)?/g)];
  const nf = sum(groups.map(g => (g[2] ? 2 : 1)));
  if (nf < 2) return null;
  let res = { 0: m[1] === "-" ? F(-1) : m[1] ? F(parseInt(m[1], 10)) : F(1) };
  for (const g of groups) {
    const p = parsePoly(g[1], v);
    if (!p || Math.max(...Object.keys(p).map(Number)) !== 1) return null;
    res = pmul(res, p); if (g[2]) res = pmul(res, p);
  }
  return res;
}
function parseSurd(s) {
  s = clean(s).replace(/ /g, "");
  for (const a of ["sqrt", "root", "r"]) s = s.split(a).join("√");
  s = s.replace(/[()*x]/g, "");
  const m = s.match(/^(\d*)√(\d+)$/);
  return m ? [m[1] ? +m[1] : 1, +m[2]] : null;
}
function close(v, exp, tol) {
  if (!v) return false;
  if (tol == null) return v.eq(toFr(exp));
  return Math.abs(v.val() - num(exp)) <= tol;
}
function check(q, ans) {
  const k = q.kind; let exp = q.answer; const tol = q.tol;
  ans = String(ans || "").trim();
  if (!ans) return false;
  try {
    if (k === "num") return close(parseNum(ans), exp, tol);
    if (k === "frac") return close(parseNum(ans), exp, null);
    if (k === "frac_simplest") {
      const v = parseNum(ans); if (!v || !v.eq(toFr(exp))) return false;
      const m = clean(ans).match(/(\d+)\s*\/\s*(\d+)\s*$/);
      if (m && gcd(+m[1], +m[2]) !== 1) return false;
      return !ans.includes(".");
    }
    if (k === "set" || k === "pair") {
      let [vals, named] = parseList(ans);
      if (k === "pair" && q.names && q.names.every(n => n in named)) vals = q.names.map(n => parseNum(named[n]));
      if (!vals || vals.length !== exp.length || vals.some(v => !v)) return false;
      if (k === "set") { vals = vals.slice().sort((a, b) => a.val() - b.val()); exp = exp.slice().sort((a, b) => num(a) - num(b)); }
      return vals.every((v, i) => close(v, exp[i], tol != null ? tol : null));
    }
    if (k === "text") { const n = ans.replace(/\s+/g, "").toUpperCase(); return (Array.isArray(exp) ? exp : [exp]).some(e => e.toUpperCase() === n); }
    if (k === "rem") {                                   // quotient and remainder: "72 r 5", "72 remainder 5", "72 余 5", "72 ... 5"
      const m = clean(ans).replace(/\s+/g, " ").match(/^(\d+)\s*(?:r|rem|remainder|余|\.{2,}|…+|，|,)\s*(\d+)$/);
      if (m) return +m[1] === exp[0] && +m[2] === exp[1];
      const v = parseNum(ans); return exp[1] === 0 && !!v && v.eq(F(exp[0]));
    }
    if (k === "surd") { const r = parseSurd(ans); return !!r && r[0] === exp[0] && r[1] === exp[1]; }
    if (k === "poly") return peq(parsePoly(ans, q.v), exp);
    if (k === "factor") return peq(parseFactor(ans, q.v), exp);
    if (k === "factor1") {
      const m = clean(ans).replace(/ /g, "").replace(/\*/g, "").match(/^(-?\d+)\((.+)\)$/);
      if (!m) return false;
      const inner = parsePoly(m[2], q.v);
      if (!inner || Object.values(inner).some(c => c.d !== 1)) return false;
      if (Object.values(inner).reduce((g, c) => gcd(g, c.n), 0) !== 1) return false;
      const kk = parseInt(m[1], 10); const ex = {}; for (const e in inner) ex[e] = inner[e].mul(kk);
      return peq(ex, exp);
    }
    if (k === "ratio") {
      const [vals] = parseList(ans);
      if (!vals || vals.length !== exp.length || vals.some(v => v.d !== 1 || v.n <= 0)) return false;
      if (vals.reduce((g, v) => gcd(g, v.n), 0) !== 1) return false;
      return vals.every((v, i) => v.n * exp[0] === exp[i] * vals[0].n);
    }
    if (k === "stdform") {
      const m = clean(ans).match(SF); if (!m) return false;
      const a = frStr(m[1]); if (!(Math.abs(a.val()) >= 1 && Math.abs(a.val()) < 10)) return false;
      return a.mul(pow10(parseInt(m[2] ?? m[3], 10))).eq(toFr(exp));
    }
  } catch (e) { return false; }
  return false;
}

// ================================================================ GENERATORS
const hm12 = m => `${((Math.floor(m / 60) - 1) % 12 + 12) % 12 + 1}:${String(m % 60).padStart(2, "0")}`;
const tvar = m => { const h = ((Math.floor(m / 60) - 1) % 12 + 12) % 12 + 1, mm = String(m % 60).padStart(2, "0"); return [`${h}:${mm}`, `${String(h).padStart(2, "0")}:${mm}`, `${h}.${mm}`]; };
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const isPrime = p => { if (p < 2) return false; for (let d = 2; d * d <= p; d++) if (p % d === 0) return false; return true; };
function toRoman(n) {
  const v = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let s = ""; for (const [a, r] of v) while (n >= a) { s += r; n -= a; } return s;
}
function coprime(d) { for (;;) { const n = R(1, d - 1); if (gcd(n, d) === 1) return n; } }

const G = {};

// ---- Year 1
G.y1_count = () => {
  let n = R(5, 98); const c = rnd();
  if (c < 0.4) return Q("Counting", `What number comes just after ${n}?`, "num", n + 1, String(n + 1), { hint: "Count on one.", sol: `${n}, ${n + 1}` });
  if (c < 0.7) return Q("Counting", `What number comes just before ${n}?`, "num", n - 1, String(n - 1), { hint: "Count back one.", sol: `${n - 1}, ${n}` });
  const k = R(2, 5); n = R(5, 90);
  return Q("Counting", `Start at ${n} and count on ${k}. Where do you land?`, "num", n + k, String(n + k), { hint: "Count on one at a time.", sol: range(0, k).map(i => n + i).join(", ") });
};
G.y1_compare = () => {
  const a = R(11, 99); let b = (a % 10 && a % 11) ? +String(a).split("").reverse().join("") : R(11, 99);
  if (a === b) b = a < 90 ? a + R(1, 9) : a - R(1, 9);
  return Q("Comparing numbers", `Which number is bigger: ${a} or ${b}?`, "num", Math.max(a, b), String(Math.max(a, b)), { hint: "Compare the tens first.", sol: `${Math.max(a, b)} is bigger.` });
};
G.y1_addsub20 = () => {
  const t = T();
  if (rnd() < 0.5) { const a = R(2, 12), b = R(1, 20 - a); return Q("Adding & subtracting to 20", `${t.who} has ${a} ${t.things} and finds ${b} more. How many now?`, "num", a + b, String(a + b), { hint: "Start with the bigger number and count on.", sol: `${a} + ${b} = ${a + b}`, emoji: t.emoji }); }
  const a = R(5, 20), b = R(1, a);
  return Q("Adding & subtracting to 20", `${t.who} has ${a} ${t.things} and gives away ${b}. How many are left?`, "num", a - b, String(a - b), { hint: "Count back.", sol: `${a} − ${b} = ${a - b}`, emoji: t.emoji });
};
G.y1_bonds = () => { const tot = choice([10, 10, 20]), a = R(1, tot - 1); return Q("Number bonds", `${a} + ? = ${tot}`, "num", tot - a, String(tot - a), { hint: `What do you add to ${a} to make ${tot}?`, sol: `${a} + ${tot - a} = ${tot}` }); };
G.y1_double = () => {
  if (rnd() < 0.5) { const n = R(1, 10); return Q("Doubles & halves", `What is double ${n}?`, "num", 2 * n, String(2 * n), { hint: "Double means add it to itself.", sol: `${n} + ${n} = ${2 * n}` }); }
  const n = 2 * R(1, 10); return Q("Doubles & halves", `What is half of ${n}?`, "num", n / 2, String(n / 2), { hint: "Share into 2 equal groups.", sol: `${n / 2} + ${n / 2} = ${n}` });
};
G.y1_skip = () => { const s = choice([2, 5, 10]), a = s * R(0, 6), seq = range(0, 3).map(i => a + s * i); return Q("Counting in 2s, 5s, 10s", `What comes next?  ${seq.join(", ")}, ?`, "num", a + 4 * s, String(a + 4 * s), { hint: `It goes up by ${s} each time.`, sol: `${seq[3]} + ${s} = ${a + 4 * s}` }); };
G.y1_half = () => {
  const t = T();
  if (rnd() < 0.6) { const n = 2 * R(2, 10); return Q("Halves & quarters", `${t.who} shares ${n} ${t.things} equally into 2 groups. How many in each group?`, "num", n / 2, String(n / 2), { hint: "Half means 2 equal groups.", sol: `Half of ${n} is ${n / 2}.`, emoji: t.emoji }); }
  const n = 4 * R(1, 5); return Q("Halves & quarters", `What is a quarter of ${n}?`, "num", n / 4, String(n / 4), { hint: "A quarter means 4 equal groups.", sol: `${n} shared into 4 is ${n / 4}.` });
};
G.y1_coins = () => { const cs = range(1, R(2, 4)).map(() => choice([1, 2, 5, 10, 20])), s = sum(cs); return Q("Money", `You have these coins: ${cs.map(c => c + "p").join(", ")}. How much money is that in pence?`, "num", s, `${s}p`, { hint: "Start with the biggest coin and count on.", sol: cs.slice().sort((a, b) => b - a).join(" + ") + ` = ${s}p` }); };
G.y1_days = () => {
  const [lst, kind] = choice([[DAYS, "day"], [MONTHS, "month"]]); const i = R(0, lst.length - 1);
  if (rnd() < 0.6) { const a = lst[(i + 1) % lst.length]; return Q("Days & months", `Which ${kind} comes after ${lst[i]}?`, "text", a, a, { fmt: "Type the word", sol: `${lst[i]} → ${a}` }); }
  const a = lst[(i - 1 + lst.length) % lst.length]; return Q("Days & months", `Which ${kind} comes before ${lst[i]}?`, "text", a, a, { fmt: "Type the word", sol: `${a} → ${lst[i]}` });
};
G.y1_shapes = () => { const [s, n] = choice([["triangle", 3], ["square", 4], ["rectangle", 4], ["pentagon", 5], ["hexagon", 6], ["octagon", 8]]); return Q("2D shapes", `How many sides does a ${s} have?`, "num", n, String(n), { hint: "Count the straight edges.", sol: `A ${s} has ${n} sides.` }); };

// ---- Year 2
G.y2_place = () => { const n = R(21, 99); if (rnd() < 0.5) return Q("Tens & ones", `How many tens are in ${n}?`, "num", Math.floor(n / 10), String(Math.floor(n / 10)), { hint: "The first digit shows the tens.", sol: `${n} = ${Math.floor(n / 10)} tens and ${n % 10} ones` }); return Q("Tens & ones", `What number is ${Math.floor(n / 10)} tens and ${n % 10} ones?`, "num", n, String(n), { sol: `${n - n % 10} + ${n % 10} = ${n}` }); };
G.y2_addsub = () => { const t = T(), a = R(11, 60), b = R(11, 39); if (rnd() < 0.5) return Q("Adding & subtracting to 100", `${t.who} collected ${a} ${t.things} on Monday and ${b} on Tuesday. How many altogether?`, "num", a + b, String(a + b), { hint: "Add the tens, then the ones.", sol: `${a} + ${b} = ${a + b}`, emoji: t.emoji }); return Q("Adding & subtracting to 100", `Work out ${a + b} − ${b}.`, "num", a, String(a), { hint: "Take away the tens, then the ones.", sol: `${a + b} − ${b} = ${a}` }); };
G.y2_times = () => { const t = choice([2, 5, 10]), k = R(1, 12); if (rnd() < 0.6) return Q("2, 5 and 10 times tables", `${k} × ${t} = ?`, "num", k * t, String(k * t), { hint: `Count in ${t}s.`, sol: `${k} × ${t} = ${k * t}` }); return Q("2, 5 and 10 times tables", `${k * t} ÷ ${t} = ?`, "num", k, String(k), { hint: `How many ${t}s make ${k * t}?`, sol: `${k} × ${t} = ${k * t}` }); };
G.y2_frac = () => { const t = T(), d = choice([2, 3, 4]), n = d === 4 && rnd() < 0.4 ? 3 : 1, w = d * R(2, 10), a = w / d * n; return Q("Fractions of amounts", `${t.who} has ${w} ${t.things}. What is ${n}/${d} of ${w}?`, "num", a, String(a), { hint: `Share ${w} into ${d} equal groups.`, sol: `${w} ÷ ${d} = ${w / d}` + (n > 1 ? `, × ${n} = ${a}` : ""), emoji: t.emoji }); };
G.y2_money = () => { const t = T(), p = 5 * R(3, 19); if (rnd() < 0.5) return Q("Money", `A ${t.thing} costs ${p}p. You pay with £1. How much change do you get (in pence)?`, "num", 100 - p, `${100 - p}p`, { hint: "£1 = 100p. Count on from the price to 100.", sol: `100 − ${p} = ${100 - p}p`, emoji: t.emoji }); const q = 5 * R(2, 10); return Q("Money", `A ${t.thing} costs ${p}p and a sticker costs ${q}p. How much altogether (in pence)?`, "num", p + q, `${p + q}p`, { sol: `${p} + ${q} = ${p + q}p`, emoji: t.emoji }); };
G.y2_time = () => {
  if (rnd() < 0.4) { const [w, v] = choice([["half an hour", 30], ["a quarter of an hour", 15], ["an hour", 60], ["three quarters of an hour", 45]]); return Q("Time", `How many minutes are in ${w}?`, "num", v, String(v), { hint: "An hour has 60 minutes.", sol: `${w} = ${v} minutes` }); }
  const st = R(4, 44) * 15, add = choice([15, 30, 45, 60]);
  return Q("Time", `It is ${hm12(st)}. What time will it be in ${add} minutes?`, "text", tvar(st + add), hm12(st + add), { fmt: "e.g. 4:45", hint: "Count on in 15-minute jumps.", sol: `${hm12(st)} + ${add} min = ${hm12(st + add)}` });
};
G.y2_3d = () => { const [s, f, e, v] = choice([["cube", 6, 12, 8], ["cuboid", 6, 12, 8], ["square-based pyramid", 5, 8, 5], ["triangular prism", 5, 9, 6]]); const [w, a] = choice([["faces", f], ["edges", e], ["vertices (corners)", v]]); return Q("3D shapes", `How many ${w} does a ${s} have?`, "num", a, String(a), { hint: "Picture it and count carefully.", sol: `A ${s} has ${f} faces, ${e} edges and ${v} vertices.` }); };
G.y2_picto = () => { const t = T(), k = choice([2, 5, 10]), n = R(2, 7); return Q("Pictograms", `In a pictogram, each ${t.emoji} stands for ${k} ${t.things}. ${t.who} has ${t.emoji.repeat(n)}. How many ${t.things} is that?`, "num", k * n, String(k * n), { hint: `Count the pictures, then count in ${k}s.`, sol: `${n} pictures × ${k} = ${k * n}`, emoji: t.emoji }); };
G.y2_compare = () => { const a = R(10, 60), b = R(5, 40), c = a + b + choice([-3, -1, 0, 1, 2]); const s = a + b < c ? "<" : a + b > c ? ">" : "="; return Q("Comparing", `Which sign goes in the gap?   ${a} + ${b}  ?  ${c}`, "text", s, s, { fmt: "Type <  or  >  or  =", hint: "Work out the left side first.", sol: `${a} + ${b} = ${a + b}, so ${a + b} ${s} ${c}` }); };

// ---- Year 3
G.y3_place = () => {
  let n = R(100, 999); const c = rnd();
  if (c < 0.5) { const i = R(0, 2); let d = +String(n)[i]; if (d === 0) { n += 10 ** (2 - i); d = +String(n)[i]; } const val = d * 10 ** (2 - i); return Q("Place value", `What is the value of the digit ${d} in ${n}?`, "num", val, String(val), { hint: "Hundreds, tens or ones?", sol: `In ${n}, the ${d} means ${val}.` }); }
  const k = choice([10, 100]);
  if (c < 0.75 && n + k < 1000) return Q("Place value", `What is ${k} more than ${n}?`, "num", n + k, String(n + k), { sol: `${n} + ${k} = ${n + k}` });
  return Q("Place value", `What is ${k} less than ${n}?`, "num", n - k, String(n - k), { sol: `${n} − ${k} = ${n - k}` });
};
G.y3_addsub = () => { const t = T(), a = R(120, 600), b = R(100, 399); if (rnd() < 0.5) return Q("Adding & subtracting 3-digit numbers", `${t.who} has ${a} ${t.things} and gets ${b} more. How many now?`, "num", a + b, String(a + b), { hint: "Column addition.", sol: `${a} + ${b} = ${a + b}`, emoji: t.emoji }); return Q("Adding & subtracting 3-digit numbers", `Work out ${a + b} − ${b}.`, "num", a, String(a), { hint: "Column subtraction.", sol: `${a + b} − ${b} = ${a}` }); };
G.y3_times = () => { const t = choice([3, 4, 8]), k = R(2, 12); if (rnd() < 0.6) return Q("3, 4 and 8 times tables", `${k} × ${t} = ?`, "num", k * t, String(k * t), { sol: `${k} × ${t} = ${k * t}` }); return Q("3, 4 and 8 times tables", `${k * t} ÷ ${t} = ?`, "num", k, String(k), { sol: `${k} × ${t} = ${k * t}` }); };
G.y3_mult = () => { const t = T(), a = R(12, 49), b = R(3, 8), tn = a - a % 10; return Q("Multiplying 2-digit numbers", `A bag holds ${a} ${t.things}. How many in ${b} bags?`, "num", a * b, String(a * b), { hint: "Partition: tens × then ones ×.", sol: `${tn} × ${b} = ${tn * b}, ${a % 10} × ${b} = ${(a % 10) * b}, total ${a * b}`, emoji: t.emoji }); };
G.y3_frac = () => {
  if (rnd() < 0.6) {
    const d = R(4, 10), a = R(1, d - 2), b = R(1, d - 1 - a);
    if (rnd() < 0.5) return Q("Fractions", `${a}/${d} + ${b}/${d} = ?`, "frac", F(a + b, d), `${a + b}/${d}`, { fmt: "e.g. 5/8", hint: "Same denominator: add the numerators.", sol: `${a} + ${b} = ${a + b}, so ${a + b}/${d}` });
    return Q("Fractions", `${a + b}/${d} − ${b}/${d} = ?`, "frac", F(a, d), `${a}/${d}`, { fmt: "e.g. 3/8", hint: "Subtract the numerators.", sol: `${a + b} − ${b} = ${a}, so ${a}/${d}` });
  }
  const [d, m] = choice([[2, 4], [2, 6], [2, 8], [3, 6], [4, 8], [3, 9], [5, 10]]), n = R(1, d - 1);
  return Q("Fractions", `${n}/${d} = ?/${m}`, "num", n * m / d, String(n * m / d), { hint: `${d} × ${m / d} = ${m}`, sol: `${n}/${d} = ${n * m / d}/${m}` });
};
G.y3_perim = () => { const t = T(); if (rnd() < 0.6) { const l = R(3, 20), w = R(2, 12); return Q("Perimeter", `A rectangular flag at ${t.place} is ${l} cm long and ${w} cm wide. What is its perimeter?`, "num", 2 * (l + w), `${2 * (l + w)} cm`, { hint: "Add all four sides.", sol: `${l} + ${w} + ${l} + ${w} = ${2 * (l + w)} cm`, emoji: t.emoji }); } const a = R(3, 15), b = R(3, 15), c = R(3, 15); return Q("Perimeter", `A triangle has sides ${a} cm, ${b} cm and ${c} cm. What is its perimeter?`, "num", a + b + c, `${a + b + c} cm`, { sol: `${a} + ${b} + ${c} = ${a + b + c} cm` }); };
G.y3_time = () => { const t = T(), st = R(13, 130) * 5, d = R(2, 10) * 5; return Q("Time", `${t.who}'s show starts at ${hm12(st)} and lasts ${d} minutes. What time does it end?`, "text", tvar(st + d), hm12(st + d), { fmt: "e.g. 4:55", hint: "Count on to the next o'clock if needed.", sol: `${hm12(st)} + ${d} min = ${hm12(st + d)}`, emoji: t.emoji }); };
G.y3_turns = () => {
  if (rnd() < 0.5) { const [w, v] = choice([["a half turn", 2], ["a full turn", 4], ["a three-quarter turn", 3], ["a quarter turn", 1]]); return Q("Angles & turns", `How many right angles are in ${w}?`, "num", v, String(v), { hint: "A quarter turn is 1 right angle.", sol: `${w} = ${v} right angle(s)` }); }
  const dirs = ["North", "East", "South", "West"], i = R(0, 3), [k, how] = choice([[1, "a quarter turn clockwise"], [2, "a half turn"], [3, "a quarter turn anticlockwise"]]), a = dirs[(i + k) % 4];
  return Q("Angles & turns", `You face ${dirs[i]}. You make ${how}. Which way are you facing now?`, "text", a, a, { fmt: "North, East, South or West", hint: "Clockwise goes North → East → South → West.", sol: `${dirs[i]} → ${a}` });
};
G.y3_bar = () => {
  const cols = sample(["red", "blue", "green", "yellow", "purple"], 3), vals = cols.map(() => R(2, 20)), txt = cols.map((c, i) => `${c} ${vals[i]}`).join(", ");
  if (rnd() < 0.5) return Q("Bar charts & tables", `A bar chart of favourite colours shows: ${txt}. How many children voted altogether?`, "num", sum(vals), String(sum(vals)), { sol: vals.join(" + ") + ` = ${sum(vals)}` });
  const [i, j] = vals[0] >= vals[1] ? [0, 1] : [1, 0];
  return Q("Bar charts & tables", `A bar chart of favourite colours shows: ${txt}. How many more chose ${cols[i]} than ${cols[j]}?`, "num", vals[i] - vals[j], String(vals[i] - vals[j]), { sol: `${vals[i]} − ${vals[j]} = ${vals[i] - vals[j]}` });
};
G.y3_money = () => { const t = T(), a = F(R(105, 650), 100), b = F(R(105, 450), 100), s = a.add(b); return Q("Money", `At ${t.place}, a map costs £${a.val().toFixed(2)} and a torch costs £${b.val().toFixed(2)}. How much for both?`, "num", s, `£${s.val().toFixed(2)}`, { hint: "Add the pounds, then the pence.", sol: `£${a.val().toFixed(2)} + £${b.val().toFixed(2)} = £${s.val().toFixed(2)}`, emoji: t.emoji }); };

// ---- Year 4
G.y4_round = () => { const n = R(100, 9999), p = choice([10, 100, 1000]), a = roundHalfUp(F(n, p)).val() * p; return Q("Rounding", `Round ${n} to the nearest ${p}.`, "num", a, String(a), { hint: "Look at the next digit to the right.", sol: `${n} → ${a}` }); };
G.y4_addsub = () => { const a = R(1200, 6000), b = R(1000, 3999); if (rnd() < 0.5) return Q("Adding & subtracting 4-digit numbers", `Work out ${a} + ${b}.`, "num", a + b, String(a + b), { sol: `${a} + ${b} = ${a + b}` }); return Q("Adding & subtracting 4-digit numbers", `Work out ${a + b} − ${b}.`, "num", a, String(a), { sol: `${a + b} − ${b} = ${a}` }); };
G.y4_tables = () => { const a = R(2, 12), b = R(2, 12); if (rnd() < 0.6) return Q("Times tables to 12 × 12", `${a} × ${b} = ?`, "num", a * b, String(a * b), { sol: `${a} × ${b} = ${a * b}` }); return Q("Times tables to 12 × 12", `${a * b} ÷ ${a} = ?`, "num", b, String(b), { sol: `${a} × ${b} = ${a * b}` }); };
G.y4_mult = () => { const t = T(), a = R(102, 999), b = R(3, 9); return Q("Multiplying 3-digit numbers", `Each ship at ${t.place} carries ${a} ${t.things}. How many on ${b} ships?`, "num", a * b, String(a * b), { hint: "Short multiplication.", sol: `${a} × ${b} = ${a * b}`, emoji: t.emoji }); };
G.y4_dec = () => { const k = choice([10, 100]); if (rnd() < 0.5) { const n = R(1, 99); return Q("Decimals (tenths & hundredths)", `Work out ${n} ÷ ${k}.`, "num", F(n, k), fdec(F(n, k)), { hint: `Digits move ${k === 10 ? "one place" : "two places"} to the right.`, sol: `${n} ÷ ${k} = ${fdec(F(n, k))}` }); } const m = R(1, k - 1); return Q("Decimals (tenths & hundredths)", `Write ${m}/${k} as a decimal.`, "num", F(m, k), fdec(F(m, k)), { sol: `${m}/${k} = ${fdec(F(m, k))}` }); };
G.y4_frac = () => { const t = T(); if (rnd() < 0.5) { const d = R(3, 12), n = R(2, d - 1), w = d * R(2, 10), a = w / d * n; return Q("Fractions", `${t.who} has ${w} ${t.things}. What is ${n}/${d} of them?`, "num", a, String(a), { hint: `Divide by ${d}, multiply by ${n}.`, sol: `${w} ÷ ${d} = ${w / d}; × ${n} = ${a}`, emoji: t.emoji }); } const d = R(3, 10), a = R(1, d - 1), b = R(1, d - 1); return Q("Fractions", `${a}/${d} + ${b}/${d} = ?`, "frac", F(a + b, d), smixed(F(a + b, d)), { fmt: "Fraction or mixed number, e.g. 9/7 or 1 2/7", sol: `${a + b}/${d}` }); };
G.y4_area = () => { if (rnd() < 0.5) { const l = R(3, 12), w = R(2, 9); return Q("Area", `A rectangle is made of 1 cm squares: ${l} squares long and ${w} squares wide. What is its area in cm²?`, "num", l * w, `${l * w} cm²`, { hint: "Count rows × columns.", sol: `${l} × ${w} = ${l * w} cm²` }); } const W = R(6, 14), H = R(5, 12), w = R(2, W - 2), h = R(2, H - 2); return Q("Area", `An L-shape is a ${W} cm by ${H} cm rectangle with a ${w} cm by ${h} cm rectangle cut from one corner. What is its area?`, "num", W * H - w * h, `${W * H - w * h} cm²`, { hint: "Big rectangle minus the cut-out.", sol: `${W} × ${H} − ${w} × ${h} = ${W * H} − ${w * h} = ${W * H - w * h} cm²` }); };
G.y4_convert = () => { const c = rnd(); if (c < 0.35) { const k = R(2, 9); return Q("Converting units & time", `How many metres are in ${k} km?`, "num", 1000 * k, `${1000 * k} m`, { sol: `${k} × 1000 = ${1000 * k}` }); } if (c < 0.65) { const h = R(1, 11), m = String(choice([0, 15, 20, 30, 45, 50])).padStart(2, "0"); return Q("Converting units & time", `Write ${h}:${m} pm in 24-hour time.`, "text", [`${h + 12}:${m}`, `${h + 12}${m}`], `${h + 12}:${m}`, { fmt: "e.g. 15:30", hint: "Add 12 to the hours for pm.", sol: `${h} + 12 = ${h + 12} → ${h + 12}:${m}` }); } const k = R(2, 9); return Q("Converting units & time", `How many minutes are in ${k} hours?`, "num", 60 * k, String(60 * k), { sol: `${k} × 60 = ${60 * k}` }); };
G.y4_coords = () => {
  const x = R(1, 8), y = R(1, 8); let dx = choice([-3, -2, -1, 1, 2, 3, 4]), dy = choice([-3, -2, -1, 1, 2, 3, 4]);
  if (!(x + dx >= 0 && x + dx <= 10 && y + dy >= 0 && y + dy <= 10)) { dx = Math.abs(dx); dy = Math.abs(dy); }
  const words = `${Math.abs(dx)} ${dx > 0 ? "right" : "left"} and ${Math.abs(dy)} ${dy > 0 ? "up" : "down"}`;
  return Q("Coordinates", `A treasure marker is at (${x}, ${y}). It moves ${words}. What are its new coordinates?`, "pair", [x + dx, y + dy], `(${x + dx}, ${y + dy})`, { fmt: "e.g. (5, 2)", hint: "Left/right changes the first number; up/down changes the second.", sol: `(${x + dx}, ${y + dy})`, emoji: "🏴‍☠️" });
};
G.y4_roman = () => { const n = R(1, 100), r = toRoman(n); if (rnd() < 0.5) return Q("Roman numerals", `Write ${n} in Roman numerals.`, "text", r, r, { fmt: "Capital letters, e.g. XLIV", hint: "I=1, V=5, X=10, L=50, C=100", sol: `${n} = ${r}` }); return Q("Roman numerals", `What number is ${r}?`, "num", n, String(n), { sol: `${r} = ${n}` }); };
G.y4_neg = () => { const a = R(1, 8), k = R(3, 15); return Q("Negative numbers", `Start at ${a} and count back ${k}. Where do you land?`, "num", a - k, String(a - k), { hint: "Below zero the numbers are negative.", sol: `${a} − ${k} = ${a - k}` }); };
G.y4_table = () => { const days = ["Mon", "Tue", "Wed", "Thu", "Fri"], v = days.map(() => R(5, 30)), txt = days.map((d, i) => `${d} ${v[i]}`).join(", "); if (rnd() < 0.5) return Q("Tables & graphs", `Visitors to the dragon zoo (hundreds): ${txt}. What is the total for the week (in hundreds)?`, "num", sum(v), String(sum(v)), { sol: v.join(" + ") + ` = ${sum(v)}`, emoji: "🐉" }); const mx = Math.max(...v), mn = Math.min(...v); return Q("Tables & graphs", `Temperatures (°C): ${txt}. What is the difference between the highest and lowest?`, "num", mx - mn, String(mx - mn), { sol: `${mx} − ${mn} = ${mx - mn}` }); };

// ---- Year 5
G.y5_round = () => { const n = R(1000, 999999), p = choice([10, 100, 1000, 10000]), a = roundHalfUp(F(n, p)).val() * p, lo = Math.floor(n / p) * p; return Q("Rounding", `Round ${cm(n)} to the nearest ${cm(p)}.`, "num", a, cm(a), { hint: `Look at the digit just to the right of the ${cm(p)}s place. 5 or more → round up.`, sol: `${cm(n)} is between ${cm(lo)} and ${cm(lo + p)}. It is nearer to ${cm(a)}.` }); };
G.y5_addsub = () => { const t = T(), a = R(1200, 60000), b = R(300, 30000); if (rnd() < 0.5) return Q("Adding & subtracting", `${t.who} had ${cm(a)} ${t.things} and collected ${cm(b)} more. How many ${t.things} now?`, "num", a + b, cm(a + b), { hint: "Line up the digits in columns.", sol: `${cm(a)} + ${cm(b)} = ${cm(a + b)}`, emoji: t.emoji }); return Q("Adding & subtracting", `${t.who} had ${cm(a + b)} ${t.things} and used ${cm(b)} of them. How many are left?`, "num", a, cm(a), { hint: "Line up the digits in columns.", sol: `${cm(a + b)} − ${cm(b)} = ${cm(a)}`, emoji: t.emoji }); };
G.y5_mult = () => { const t = T(), [a, b] = choice([[R(1000, 9999), R(3, 9)], [R(12, 99), R(12, 99)], [R(100, 999), R(11, 25)]]); return Q("Multiplying", `Each crate at ${t.place} holds ${cm(a)} ${t.things}. How many ${t.things} are in ${b} crates?`, "num", a * b, cm(a * b), { hint: "Use short or long multiplication.", sol: `${cm(a)} × ${b} = ${cm(a * b)}`, emoji: t.emoji }); };
G.y5_div = () => { const b = R(3, 9), q = R(100, 1500), r = R(0, b - 1), a = b * q + r; return Q("Dividing with remainders", `Work out ${cm(a)} ÷ ${b}. Give the answer and the remainder.`, "pair", [q, r], `${q} r ${r}`, { fmt: "Type: answer, remainder   e.g.  123, 4", hint: "Short division (bus stop method).", sol: `${b} × ${q} = ${cm(b * q)}, and ${cm(a)} − ${cm(b * q)} = ${r}. So ${q} r ${r}.` }); };
G.y5_factors = () => {
  if (rnd() < 0.5) { const n = choice([12, 18, 20, 24, 28, 30, 32, 36, 40, 42, 45, 48, 50, 54, 56, 60, 63, 64, 72, 80, 84, 90, 96, 100]), fs = range(1, n).filter(d => n % d === 0); return Q("Factors & primes", `List ALL the factors of ${n}.`, "set", fs, fs.join(", "), { fmt: "Separate with commas, e.g. 1, 2, 3, 6", hint: "Find factor pairs: 1 × ?, 2 × ?, 3 × ? …", sol: "Factor pairs: " + fs.filter(d => d * d <= n).map(d => `${d}×${n / d}`).join(", ") }); }
  const p = choice(range(21, 99).filter(isPrime)), comps = sample(range(21, 99).filter(x => x % 2 && !isPrime(x) && x % 5), 3), opts = shuffle(comps.concat([p]));
  const sf = c => { const d = range(3, c).find(d => c % d === 0); return `${c} = ${d} × ${c / d}`; };
  return Q("Factors & primes", `Which ONE of these numbers is prime?  ${opts.join(",  ")}`, "num", p, String(p), { hint: "A prime has exactly two factors: 1 and itself.", sol: `${p} is prime. The others: ` + comps.map(sf).join(", ") });
};
G.y5_sqcube = () => { const c = rnd(); if (c < 0.4) { const a = R(2, 12); return Q("Square & cube numbers", `What is ${a}²?`, "num", a * a, String(a * a), { hint: `${a}² means ${a} × ${a}.`, sol: `${a} × ${a} = ${a * a}` }); } if (c < 0.7) { const a = R(2, 5); return Q("Square & cube numbers", `What is ${a}³?`, "num", a ** 3, String(a ** 3), { hint: `${a}³ means ${a} × ${a} × ${a}.`, sol: `${a} × ${a} × ${a} = ${a ** 3}` }); } const a = R(2, 10), b = R(2, 4); return Q("Square & cube numbers", `Work out ${a}² + ${b}³.`, "num", a * a + b ** 3, String(a * a + b ** 3), { sol: `${a}² = ${a * a}, ${b}³ = ${b ** 3}, total ${a * a + b ** 3}` }); };
G.y5_frac_equiv = () => { const d = R(3, 12), n = coprime(d), k = R(2, 6); if (rnd() < 0.5) return Q("Equivalent fractions", `${n}/${d} = ?/${d * k}.  Find the missing number.`, "num", n * k, String(n * k), { hint: `What did you multiply ${d} by to get ${d * k}?`, sol: `${d} × ${k} = ${d * k}, so ${n} × ${k} = ${n * k}.` }); return Q("Equivalent fractions", `Write ${n * k}/${d * k} in its simplest form.`, "frac_simplest", F(n, d), `${n}/${d}`, { fmt: "e.g. 3/4", hint: "Divide top and bottom by the same number until you can't any more.", sol: `Divide top and bottom by ${k}: ${n * k}/${d * k} = ${n}/${d}.` }); };
G.y5_frac_add = () => {
  const t = T(), d = R(3, 8), m = choice([1, 2, 3]), a = R(1, d - 1), b = R(1, d * m - 1), fa = F(a, d), fb = F(b, d * m);
  let ans, text, op;
  if (rnd() < 0.5 || fa.cmp(fb) <= 0) { ans = fa.add(fb); text = `${t.who} drank ${a}/${d} of a jug of juice, then ${b}/${d * m} of a jug more. How many jugs altogether?`; op = "+"; }
  else { ans = fa.sub(fb); text = `${t.who} had ${a}/${d} of a cake and ate ${b}/${d * m} of a cake. How much cake is left?`; op = "−"; }
  return Q("Adding & subtracting fractions", text, "frac", ans, smixed(ans), { fmt: "Fraction or mixed number, e.g. 7/8 or 1 1/4", hint: "Make the denominators the same first.", sol: `${a}/${d} = ${a * m}/${d * m}.  ${a * m}/${d * m} ${op} ${b}/${d * m} = ${sfrac(ans)}`, emoji: t.emoji });
};
G.y5_frac_of = () => { const t = T(), d = R(2, 10), n = R(1, d - 1), w = d * R(2, 12), a = w / d * n; return Q("Fractions of amounts", `${t.who} has ${w} ${t.things}. ${n}/${d} of them are magic. How many are magic?`, "num", a, String(a), { hint: `Find 1/${d} first, then multiply by ${n}.`, sol: `${w} ÷ ${d} = ${w / d}, × ${n} = ${a}`, emoji: t.emoji }); };
G.y5_frac_times = () => { const d = R(3, 9), n = R(1, d - 1), w = R(2, 6), a = F(n * w, d); return Q("Multiplying fractions", `Work out ${n}/${d} × ${w}.`, "frac", a, smixed(a), { fmt: "Fraction or mixed number, e.g. 2 1/3", hint: "Multiply the numerator by the whole number; keep the denominator.", sol: `${n} × ${w} = ${n * w}, so ${n * w}/${d} = ${smixed(a)}` }); };
G.y5_decimal = () => {
  const c = rnd(), v = F(R(100, 9999), 100);
  if (c < 0.35) { const a = roundHalfUp(v, 0); return Q("Decimals", `Round ${fdec(v)} to the nearest whole number.`, "num", a, fdec(a), { hint: "Look at the tenths digit.", sol: `${fdec(v)} → ${fdec(a)}` }); }
  if (c < 0.65) { const a = roundHalfUp(v, 1); return Q("Decimals", `Round ${fdec(v)} to 1 decimal place.`, "num", a, fdec(a), { hint: "Look at the hundredths digit.", sol: `${fdec(v)} → ${fdec(a)}` }); }
  const t = T(), a = F(R(10, 999), 100), b = F(R(10, 999), 10), s = a.add(b);
  return Q("Decimals", `${t.who} walked ${fdec(a)} km in the morning and ${fdec(b)} km in the afternoon. How far altogether?`, "num", s, fdec(s) + " km", { hint: "Line up the decimal points.", sol: `${fdec(a)} + ${fdec(b)} = ${fdec(s)}`, emoji: t.emoji });
};
G.y5_percent = () => {
  const c = rnd();
  if (c < 0.5) { const p = choice([10, 20, 25, 50, 75, 5, 1, 30]), base = { 25: 4, 75: 4, 50: 2, 5: 20, 1: 100 }[p] || 10, n = base * R(2, 30), a = F(p * n, 100); return Q("Percentages", `What is ${p}% of ${n}?`, "num", a, fdec(a), { hint: "10% = ÷10, 50% = ÷2, 25% = ÷4, 1% = ÷100.", sol: `${p}% of ${n} = ${p}/100 × ${n} = ${fdec(a)}` }); }
  if (c < 0.75) { const k = R(1, 99); return Q("Percentages", `Write ${fdec(F(k, 100))} as a percentage.`, "num", k, `${k}%`, { hint: "Per cent means 'out of 100'.", sol: `${fdec(F(k, 100))} = ${k}/100 = ${k}%` }); }
  const fr = choice([[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 10], [3, 10], [7, 10], [9, 10], [1, 20], [7, 20], [3, 25]]), f = F(fr[0], fr[1]), a = f.mul(100);
  return Q("Percentages", `Write ${sfrac(f)} as a percentage.`, "num", a, `${fdec(a)}%`, { hint: "Make the denominator 100.", sol: `${sfrac(f)} = ${fdec(a)}/100 = ${fdec(a)}%` });
};
G.y5_area = () => { const t = T(), l = R(3, 25), w = R(2, 15), u = choice(["cm", "m"]), c = rnd(); if (c < 0.4) return Q("Perimeter & area", `A rectangular map of ${t.place} is ${l} ${u} long and ${w} ${u} wide. What is its area?`, "num", l * w, `${l * w} ${u}²`, { hint: "Area of a rectangle = length × width.", sol: `${l} × ${w} = ${l * w} ${u}²`, emoji: t.emoji }); if (c < 0.8) return Q("Perimeter & area", `A rectangular fence around ${t.place} is ${l} ${u} by ${w} ${u}. What is its perimeter?`, "num", 2 * (l + w), `${2 * (l + w)} ${u}`, { hint: "Add up all four sides.", sol: `${l} + ${w} + ${l} + ${w} = ${2 * (l + w)} ${u}`, emoji: t.emoji }); const s = R(3, 20); return Q("Perimeter & area", `A square has a perimeter of ${4 * s} ${u}. What is its area?`, "num", s * s, `${s * s} ${u}²`, { hint: "First find the length of one side.", sol: `Side = ${4 * s} ÷ 4 = ${s}. Area = ${s} × ${s} = ${s * s} ${u}²` }); };
G.y5_time = () => {
  const c = rnd();
  if (c < 0.25) { const h = R(2, 9), m = R(5, 55); return Q("Time", `How many minutes are in ${h} hours ${m} minutes?`, "num", 60 * h + m, String(60 * h + m), { hint: "1 hour = 60 minutes.", sol: `${h} × 60 + ${m} = ${60 * h + m}` }); }
  if (c < 0.45) { const m = R(2, 12), s = R(5, 55); return Q("Time", `How many seconds are in ${m} minutes ${s} seconds?`, "num", 60 * m + s, String(60 * m + s), { hint: "1 minute = 60 seconds.", sol: `${m} × 60 + ${s} = ${60 * m + s}` }); }
  if (c < 0.6) { const d = R(2, 9); return Q("Time", `How many hours are in ${d} days?`, "num", 24 * d, String(24 * d), { hint: "1 day = 24 hours.", sol: `${d} × 24 = ${24 * d}` }); }
  const t = T(), st = R(84, 180) * 5, dur = R(5, 40) * 5, en = st + dur, hm = x => `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
  return Q("Time", `${t.who} started a mission at ${hm(st)} and finished at ${hm(en)}. How many minutes did it take?`, "num", dur, `${dur} minutes`, { hint: "Count on to the next hour, then add the rest.", sol: `From ${hm(st)} to ${hm(en)} is ${Math.floor(dur / 60)} h ${dur % 60} min = ${dur} minutes.`, emoji: t.emoji });
};
G.y5_roman = () => { let n = choice([R(1, 100), R(100, 1000), R(1900, 2030)]); if (n > 1000 && rnd() < 0.5) n = R(1, 1000); const r = toRoman(n); if (rnd() < 0.5) return Q("Roman numerals", `Write ${n} in Roman numerals.`, "text", r, r, { fmt: "Use capital letters, e.g. XLIV", hint: "I=1, V=5, X=10, L=50, C=100, D=500, M=1000.", sol: `${n} = ${r}` }); return Q("Roman numerals", `What number is ${r}?`, "num", n, String(n), { hint: "A smaller numeral before a bigger one means subtract.", sol: `${r} = ${n}` }); };
G.y5_negative = () => { const t = T(), a = R(-10, 8), c = R(3, 15); if (rnd() < 0.5) return Q("Negative numbers", `The temperature at ${t.place} is ${a}°C. It falls by ${c}°C. What is the new temperature?`, "num", a - c, `${a - c}°C`, { hint: "Use a number line: falling means moving left.", sol: `${a} − ${c} = ${a - c}`, emoji: t.emoji }); const b = R(1, 12), lo = -R(1, 12); return Q("Negative numbers", `At night it is ${lo}°C and in the day it is ${b}°C. What is the difference in temperature?`, "num", b - lo, `${b - lo}°C`, { hint: "Count from the negative number up to 0, then up to the positive.", sol: `From ${lo} to 0 is ${-lo}, then to ${b} is ${b}: ${b - lo}°C` }); };
G.y5_angles = () => { if (rnd() < 0.5) { const a = R(20, 80), b = R(20, 160 - a); return Q("Angles", `Three angles sit on a straight line. Two of them are ${a}° and ${b}°. What is the third?`, "num", 180 - a - b, `${180 - a - b}°`, { hint: "Angles on a straight line add up to 180°.", sol: `180 − ${a} − ${b} = ${180 - a - b}°` }); } const a = R(60, 150), b = R(40, 120); return Q("Angles", `Three angles meet at a point. Two of them are ${a}° and ${b}°. What is the third?`, "num", 360 - a - b, `${360 - a - b}°`, { hint: "Angles around a point add up to 360°.", sol: `360 − ${a} − ${b} = ${360 - a - b}°` }); };
G.y5_convert = () => {
  const c = choice(["km", "kg", "l", "cm"]);
  if (c === "km") { const v = F(R(11, 99), 10), a = v.mul(1000); return Q("Converting units", `How many metres is ${fdec(v)} km?`, "num", a, fdec(a) + " m", { hint: "1 km = 1000 m.", sol: `${fdec(v)} × 1000 = ${fdec(a)}` }); }
  if (c === "kg") { const g = R(11, 99) * 100, a = F(g, 1000); return Q("Converting units", `Write ${cm(g)} g in kilograms.`, "num", a, fdec(a) + " kg", { hint: "1 kg = 1000 g.", sol: `${g} ÷ 1000 = ${fdec(a)}` }); }
  if (c === "l") { const v = rnd() < 0.3 ? F(R(11, 95), 4) : F(R(11, 99), 10), a = v.mul(1000); return Q("Converting units", `How many millilitres is ${fdec(v)} litres?`, "num", a, fdec(a) + " ml", { hint: "1 litre = 1000 ml.", sol: `${fdec(v)} × 1000 = ${fdec(a)}` }); }
  const mm = R(12, 999), a = F(mm, 10); return Q("Converting units", `Write ${mm} mm in centimetres.`, "num", a, fdec(a) + " cm", { hint: "1 cm = 10 mm.", sol: `${mm} ÷ 10 = ${fdec(a)}` });
};

// ---- Year 6
G.y6_bidmas = () => { const a = R(2, 20), b = R(2, 9), c = R(2, 9), k = R(0, 2); if (k === 0) return Q("Order of operations", `Work out ${a} + ${b} × ${c}.`, "num", a + b * c, String(a + b * c), { hint: "Multiply before you add (BIDMAS).", sol: `${b} × ${c} = ${b * c}; ${a} + ${b * c} = ${a + b * c}` }); if (k === 1) return Q("Order of operations", `Work out (${a} + ${b}) × ${c}.`, "num", (a + b) * c, String((a + b) * c), { hint: "Brackets first.", sol: `${a + b} × ${c} = ${(a + b) * c}` }); const v = b * b - 2 * c + a; return Q("Order of operations", `Work out ${b}² − ${c} × 2 + ${a}.`, "num", v, String(v), { hint: "Indices, then ×, then + and − left to right.", sol: `${b * b} − ${2 * c} + ${a} = ${v}` }); };
G.y6_longdiv = () => { const b = R(12, 35), q = R(21, 250); return Q("Long division", `Work out ${b * q} ÷ ${b}.`, "num", q, String(q), { hint: "Long division; jot down multiples of the divisor.", sol: `${b} × ${q} = ${b * q}` }); };
G.y6_fracmul = () => { if (rnd() < 0.6) { const d1 = R(2, 9), d2 = R(2, 9), n1 = R(1, d1 - 1), n2 = R(1, d2 - 1), a = F(n1, d1).mul(F(n2, d2)); return Q("Multiplying & dividing fractions", `Work out ${n1}/${d1} × ${n2}/${d2}.`, "frac", a, sfrac(a), { fmt: "Fraction, e.g. 3/10", hint: "Multiply tops, multiply bottoms.", sol: `${n1 * n2}/${d1 * d2} = ${sfrac(a)}` }); } const d = R(2, 9), w = R(2, 6), n = R(1, d - 1), a = F(n, d * w); return Q("Multiplying & dividing fractions", `Work out ${n}/${d} ÷ ${w}.`, "frac", a, sfrac(a), { fmt: "Fraction, e.g. 1/12", hint: `Dividing by ${w} = multiplying by 1/${w}.`, sol: `${n}/${d} × 1/${w} = ${sfrac(a)}` }); };
G.y6_fracadd = () => { const [d1, d2] = sample(range(2, 9), 2), n1 = R(1, d1 - 1), n2 = R(1, d2 - 1), a = F(n1, d1), b = F(n2, d2), l = d1 * d2 / gcd(d1, d2); if (rnd() < 0.5 || a.cmp(b) < 0) return Q("Adding fractions", `Work out ${n1}/${d1} + ${n2}/${d2}.`, "frac", a.add(b), smixed(a.add(b)), { fmt: "Fraction or mixed number", hint: "Find a common denominator.", sol: `Common denominator ${l}: = ${smixed(a.add(b))}` }); return Q("Adding fractions", `Work out ${n1}/${d1} − ${n2}/${d2}.`, "frac", a.sub(b), sfrac(a.sub(b)), { fmt: "Fraction", hint: "Find a common denominator.", sol: `Common denominator ${l}: = ${sfrac(a.sub(b))}` }); };
G.y6_percent = () => { const t = T(), p = 5 * R(1, 19), n = 20 * R(2, 40), a = F(p * n, 100); return Q("Percentages of amounts", `${t.who} has ${n} ${t.things}. ${p}% of them are rare. How many are rare?`, "num", a, fdec(a), { hint: "Find 10% and 5% (or 1%) and build up.", sol: `${p}/100 × ${n} = ${fdec(a)}`, emoji: t.emoji }); };
G.y6_ratio = () => { const t = T(), a = R(1, 5), b = R(2, 7), k = R(2, 8); return Q("Ratio & proportion", `At ${t.place}, for every ${a} gold ${t.things} there are ${b} silver ones. There are ${a * k} gold. How many silver?`, "num", b * k, String(b * k), { hint: `How many groups of ${a}?`, sol: `${a * k} ÷ ${a} = ${k} groups; ${k} × ${b} = ${b * k}`, emoji: t.emoji }); };
G.y6_algebra = () => { if (rnd() < 0.6) { const n = R(2, 15), a = R(2, 9), b = R(1, 20); return Q("Simple algebra", `${a}n + ${b} = ${a * n + b}.  Find n.`, "num", n, `n = ${n}`, { hint: `Take away ${b}, then divide by ${a}.`, sol: `${a}n = ${a * n}; n = ${n}` }); } const t = T(), a = R(2, 9), b = R(1, 15), n = R(2, 12); return Q("Simple algebra", `At ${t.place}, the cost in coins is C = ${a}n + ${b}, where n is the number of ${t.things}. Find C when n = ${n}.`, "num", a * n + b, String(a * n + b), { sol: `${a} × ${n} + ${b} = ${a * n + b}`, emoji: t.emoji }); };
G.y6_area = () => { const c = rnd(); if (c < 0.35) { const b = 2 * R(2, 10), h = R(3, 15); return Q("Area & volume", `A triangle has base ${b} cm and perpendicular height ${h} cm. Find its area.`, "num", b * h / 2, `${b * h / 2} cm²`, { hint: "½ × base × height", sol: `½ × ${b} × ${h} = ${b * h / 2} cm²` }); } if (c < 0.65) { const b = R(3, 15), h = R(2, 12); return Q("Area & volume", `A parallelogram has base ${b} cm and perpendicular height ${h} cm. Find its area.`, "num", b * h, `${b * h} cm²`, { hint: "base × height", sol: `${b} × ${h} = ${b * h} cm²` }); } const l = R(2, 12), w = R(2, 10), h = R(2, 9); return Q("Area & volume", `A treasure chest (cuboid) is ${l} cm × ${w} cm × ${h} cm. Find its volume.`, "num", l * w * h, `${l * w * h} cm³`, { hint: "length × width × height", sol: `${l} × ${w} × ${h} = ${l * w * h} cm³`, emoji: "🏴‍☠️" }); };
G.y6_angles = () => { if (rnd() < 0.5) { const a = R(20, 100), b = R(20, 60); return Q("Angles in shapes", `Two angles of a triangle are ${a}° and ${b}°. Find the third.`, "num", 180 - a - b, `${180 - a - b}°`, { hint: "Angles in a triangle add to 180°.", sol: `180 − ${a} − ${b} = ${180 - a - b}°` }); } const a = R(60, 120), b = R(60, 120), c = R(50, 100); return Q("Angles in shapes", `Three angles of a quadrilateral are ${a}°, ${b}° and ${c}°. Find the fourth.`, "num", 360 - a - b - c, `${360 - a - b - c}°`, { hint: "Angles in a quadrilateral add to 360°.", sol: `360 − ${a} − ${b} − ${c} = ${360 - a - b - c}°` }); };
G.y6_mean = () => { const k = R(4, 6), m = R(5, 30); let vals = range(1, k - 1).map(() => m + R(-6, 6)); vals.push(m * k - sum(vals)); vals = shuffle(vals); return Q("Mean average", `Find the mean of: ${vals.join(", ")}`, "num", m, String(m), { hint: "Add them up, divide by how many.", sol: `${sum(vals)} ÷ ${k} = ${m}` }); };
G.y6_miles = () => { if (rnd() < 0.5) { const m = 5 * R(1, 12); return Q("Converting units", `5 miles ≈ 8 km. About how many km is ${m} miles?`, "num", m / 5 * 8, `${m / 5 * 8} km`, { sol: `${m} ÷ 5 = ${m / 5}; × 8 = ${m / 5 * 8} km` }); } const k = 8 * R(1, 12); return Q("Converting units", `5 miles ≈ 8 km. About how many miles is ${k} km?`, "num", k / 8 * 5, `${k / 8 * 5} miles`, { sol: `${k} ÷ 8 = ${k / 8}; × 5 = ${k / 8 * 5} miles` }); };
G.y6_lcm = () => { const [a, b] = sample([2, 3, 4, 5, 6, 8, 9, 10, 12], 2); if (rnd() < 0.5) { const l = a * b / gcd(a, b); return Q("Common factors & multiples", `What is the lowest common multiple of ${a} and ${b}?`, "num", l, String(l), { hint: "List the multiples of each.", sol: `LCM(${a}, ${b}) = ${l}` }); } const g = choice([2, 3, 4, 5, 6]), [p, q] = sample([1, 2, 3, 5, 7], 2), h = 2 * g * gcd(p, q); return Q("Common factors & multiples", `What is the highest common factor of ${g * p * 2} and ${g * q * 2}?`, "num", h, String(h), { hint: "List the factors of each.", sol: `HCF = ${h}` }); };
G.y6_decmul = () => { const a = F(R(101, 999), 100), b = R(3, 9), p = a.mul(b); return Q("Multiplying decimals", `Work out ${fdec(a)} × ${b}.`, "num", p, fdec(p), { hint: "Multiply as whole numbers, then put the decimal point back.", sol: `${fdec(a)} × ${b} = ${fdec(p)}` }); };
G.y6_negcalc = () => { const a = R(-12, 12), b = R(2, 15); if (rnd() < 0.5) return Q("Negative numbers", `Work out ${a} − ${b}.`, "num", a - b, String(a - b), { sol: `${a} − ${b} = ${a - b}` }); const c = Math.abs(a) + 1; return Q("Negative numbers", `Work out ${-b} + ${c}.`, "num", c - b, String(c - b), { sol: `${-b} + ${c} = ${c - b}` }); };

// ---- Year 7
G.y7_neg = () => { const a = nz(-12, 12), b = nz(-12, 12), op = choice(["×", "÷", "+", "−"]); if (op === "×") return Q("Negative number calculations", `Work out (${a}) × (${b}).`, "num", a * b, String(a * b), { hint: "Same signs → positive; different → negative.", sol: `${a * b}` }); if (op === "÷") return Q("Negative number calculations", `Work out (${a * b}) ÷ (${b}).`, "num", a, String(a), { hint: "Same signs → positive; different → negative.", sol: `${a}` }); if (op === "+") return Q("Negative number calculations", `Work out (${a}) + (${b}).`, "num", a + b, String(a + b), { sol: `${a + b}` }); return Q("Negative number calculations", `Work out (${a}) − (${b}).`, "num", a - b, String(a - b), { hint: "Subtracting a negative = adding.", sol: `${a} − (${b}) = ${a - b}` }); };
G.y7_hcf = () => { const g = R(2, 12); let p, q; do { [p, q] = sample([2, 3, 4, 5, 7, 9, 11], 2); } while (gcd(p, q) !== 1); const a = g * p, b = g * q; if (rnd() < 0.5) return Q("HCF & LCM", `Find the HCF of ${a} and ${b}.`, "num", g, String(g), { hint: "Use prime factors.", sol: `${a} = ${g} × ${p}, ${b} = ${g} × ${q} → HCF ${g}` }); return Q("HCF & LCM", `Find the LCM of ${a} and ${b}.`, "num", g * p * q, String(g * p * q), { hint: "Use prime factors.", sol: `${g} × ${p} × ${q} = ${g * p * q}` }); };
G.y7_fracdiv = () => {
  if (rnd() < 0.5) { const d1 = R(2, 9), d2 = R(2, 9), n1 = R(1, d1 - 1), n2 = R(1, d2 - 1), a = F(n1, d1).div(F(n2, d2)); return Q("Fraction calculations", `Work out ${n1}/${d1} ÷ ${n2}/${d2}.`, "frac", a, smixed(a), { fmt: "Fraction or mixed number", hint: "Keep, change, flip.", sol: `${n1}/${d1} × ${d2}/${n2} = ${smixed(a)}` }); }
  const w1 = R(1, 4), w2 = R(1, 3), [d1, d2] = sample(range(2, 6), 2), r1 = R(1, d1 - 1), r2 = R(1, d2 - 1), a = F(w1).add(F(r1, d1)), b = F(w2).add(F(r2, d2)), s = a.add(b);
  const show = (w, f) => `${w} ${f.n}/${f.d}`;
  return Q("Fraction calculations", `Work out ${show(w1, F(r1, d1))} + ${show(w2, F(r2, d2))}.`, "frac", s, smixed(s), { fmt: "Mixed number, e.g. 3 5/12", hint: "Add wholes, then fractions.", sol: `= ${smixed(s)}` });
};
G.y7_eq = () => { const a = R(2, 9); let x; if (rnd() < 0.7) x = F(R(-10, 12)); else { x = F(R(1, 3 * a), a); if (x.d === 1) x = F(1, a); } const b = R(-15, 15), c = x.mul(a).add(b); return Q("Solving equations", `Solve ${lin(a, b)} = ${sfrac(c)}`, "frac", x, sfrac(x), { fmt: "e.g. x = 4  or  x = 5/3", hint: "Undo the + first, then the ×.", sol: `${a}x = ${sfrac(c.sub(b))} → x = ${sfrac(x)}` }); };
G.y7_sub = () => { const a = R(-5, 6), b = R(-5, 8), v = 3 * a * a - 2 * b; return Q("Substitution", `Find the value of 3a² − 2b when a = ${a} and b = ${b}.`, "num", v, String(v), { hint: "Square first, then multiply.", sol: `3 × ${a * a} − 2 × (${b}) = ${3 * a * a} − (${2 * b}) = ${v}` }); };
G.y7_simplify = () => { const p = R(-6, 9); let r = R(-6, 9); const q = R(-9, 9), s = R(-9, 9); if (p + r === 0) r += 1; const poly = P({ 1: p + r, 0: q + s }); return Q("Simplifying expressions", `Simplify  ${lin(p, q)}  +  (${lin(r, s)})`, "poly", poly, ppoly(poly), { fmt: "e.g. 5x − 3", hint: "Collect the x terms and the number terms.", sol: `x terms: ${p} + ${r} = ${p + r}; numbers: ${q} + ${s} = ${q + s} → ${ppoly(poly)}` }); };
G.y7_stats = () => {
  const vals = range(1, 7).map(() => R(1, 20)); vals[R(0, 6)] = vals[0];
  const s = vals.slice().sort((a, b) => a - b); let k = choice(["median", "range", "mode"]);
  if (k === "mode") { const cnt = {}; vals.forEach(v => cnt[v] = (cnt[v] || 0) + 1); const e = Object.entries(cnt).sort((a, b) => b[1] - a[1]); if (e.length > 1 && e[0][1] === e[1][1]) k = "median"; else return Q("Averages & range", `Find the mode of: ${vals.join(", ")}`, "num", +e[0][0], e[0][0], { hint: "Mode = most common.", sol: `${e[0][0]} appears ${e[0][1]} times.` }); }
  if (k === "median") return Q("Averages & range", `Find the median of: ${vals.join(", ")}`, "num", s[3], String(s[3]), { hint: "Put them in order; take the middle.", sol: `In order: ${s.join(", ")} → ${s[3]}` });
  return Q("Averages & range", `Find the range of: ${vals.join(", ")}`, "num", s[6] - s[0], String(s[6] - s[0]), { hint: "Largest − smallest.", sol: `${s[6]} − ${s[0]} = ${s[6] - s[0]}` });
};
G.y7_iso = () => { const a = 2 * R(10, 70); if (rnd() < 0.5) return Q("Angle facts", `An isosceles triangle has a top angle of ${a}° between its two equal sides. Find one base angle.`, "num", (180 - a) / 2, `${(180 - a) / 2}°`, { hint: "Base angles are equal; all three add to 180°.", sol: `(180 − ${a}) ÷ 2 = ${(180 - a) / 2}°` }); const b = R(25, 75); return Q("Angle facts", `An isosceles triangle has base angles of ${b}°. Find the top angle.`, "num", 180 - 2 * b, `${180 - 2 * b}°`, { sol: `180 − 2 × ${b} = ${180 - 2 * b}°` }); };
G.y7_trap = () => { const a = R(3, 12), b = R(5, 18), h = 2 * R(1, 8), v = F((a + b) * h, 2); return Q("Area of trapeziums", `A trapezium has parallel sides ${a} cm and ${b} cm, and height ${h} cm. Find its area.`, "num", v, `${fdec(v)} cm²`, { hint: "½(a + b)h", sol: `½ × (${a} + ${b}) × ${h} = ${fdec(v)} cm²` }); };
G.y7_pct = () => { const t = T(), n = 10 * R(2, 60), p = choice([5, 10, 12, 15, 20, 25, 30, 40]), up = rnd() < 0.5, mlt = F(up ? 100 + p : 100 - p, 100), a = mlt.mul(n); return Q("Percentage increase & decrease", `${t.who} had ${n} ${t.things}. This ${up ? "increased" : "decreased"} by ${p}%. How many now?`, "num", a, fdec(a), { hint: `Multiplier = ${fdec(mlt)}`, sol: `${n} × ${fdec(mlt)} = ${fdec(a)}`, emoji: t.emoji }); };
G.y7_ratio = () => { let parts = range(1, choice([2, 2, 3])).map(() => R(1, 6)); const g0 = parts.reduce((g, p) => gcd(g, p), 0); parts = parts.map(p => p / g0); const k = R(2, 9), big = parts.map(p => p * k); return Q("Simplifying ratios", `Simplify the ratio ${big.join(":")}.`, "ratio", parts, parts.join(":"), { fmt: "e.g. 2:3", hint: "Divide every part by the highest common factor.", sol: `÷ ${k} → ${parts.join(":")}` }); };

// ---- Year 8
G.y8_indices = () => { if (rnd() < 0.5) { const [b, e] = choice([[2, R(3, 8)], [3, R(2, 4)], [5, R(2, 3)], [10, R(2, 6)], [4, 3]]); return Q("Powers & indices", `Work out ${b}^${e}.`, "num", b ** e, String(b ** e), { sol: `${Array(e).fill(b).join(" × ")} = ${b ** e}` }); } const m = R(2, 9), n = R(2, 9); if (rnd() < 0.5) return Q("Powers & indices", `y^${m} × y^${n} = y^k.  Find k.`, "num", m + n, String(m + n), { hint: "Add the powers.", sol: `${m} + ${n} = ${m + n}` }); return Q("Powers & indices", `y^${m + n} ÷ y^${n} = y^k.  Find k.`, "num", m, String(m), { hint: "Subtract the powers.", sol: `${m + n} − ${n} = ${m}` }); };
G.y8_stdform = () => { const m = R(101, 999), k = R(3, 9), v = F(m, 100).mul(pow10(k)); return Q("Standard form", `Write ${cm(v.val())} in standard form.`, "stdform", v, `${fdec(F(m, 100))} × 10^${k}`, { fmt: "e.g. 3.45 x 10^6", hint: "a × 10^n with 1 ≤ a < 10.", sol: `${fdec(F(m, 100))} × 10^${k}` }); };
G.y8_brackets = () => { if (rnd() < 0.5) { const a = R(2, 7), b = R(-6, 9), x = R(-5, 10); return Q("Brackets & equations", `Solve ${a}(x ${b >= 0 ? "+" : "−"} ${Math.abs(b)}) = ${a * (x + b)}`, "num", x, `x = ${x}`, { hint: "Divide both sides first, or expand.", sol: `x ${b >= 0 ? "+" : "−"} ${Math.abs(b)} = ${x + b} → x = ${x}` }); } const a = R(2, 9), p = R(1, 5), q = nz(-9, 9), poly = P({ 1: a * p, 0: a * q }); return Q("Brackets & equations", `Expand ${a}(${lin(p, q)})`, "poly", poly, ppoly(poly), { fmt: "e.g. 6x − 9", hint: "Multiply each term inside by the number outside.", sol: `= ${ppoly(poly)}` }); };
G.y8_circle = () => { const r = R(2, 15); if (rnd() < 0.5) { const v = Math.PI * r * r; return Q("Circles", `A round shield has radius ${r} cm. Find its area (1 d.p.).`, "num", v, `${v.toFixed(1)} cm²`, { tol: dpTol(1), hint: "A = πr²", sol: `π × ${r}² = ${v.toFixed(1)}` }); } const v = Math.PI * 2 * r; return Q("Circles", `A wheel has diameter ${2 * r} cm. Find its circumference (1 d.p.).`, "num", v, `${v.toFixed(1)} cm`, { tol: dpTol(1), hint: "C = πd", sol: `π × ${2 * r} = ${v.toFixed(1)}` }); };
G.y8_pctchange = () => { const a = 10 * R(2, 50), p = choice([5, 10, 15, 20, 25, 30, 40, 50]), up = rnd() < 0.5, b = a * (up ? 100 + p : 100 - p) / 100; return Q("Percentage change", `A price changes from £${a} to £${b}. What is the percentage ${up ? "increase" : "decrease"}?`, "num", p, `${p}%`, { hint: "change ÷ original × 100", sol: `${Math.abs(b - a)} ÷ ${a} × 100 = ${p}%` }); };
G.y8_share = () => { const t = T(), a = R(1, 7), b = R(1, 7), k = R(3, 20); return Q("Sharing in a ratio", `${t.who} share ${(a + b) * k} ${t.things} in the ratio ${a}:${b}. How many does the first share get?`, "num", a * k, String(a * k), { hint: "Total parts first.", sol: `${a + b} parts; 1 part = ${k}; ${a} × ${k} = ${a * k}`, emoji: t.emoji }); };
G.y8_prob = () => { const t = T(), r = R(1, 8), b = R(1, 8), g = R(0, 6), n = r + b + g; if (rnd() < 0.6) return Q("Probability", `A bag at ${t.place} has ${r} red, ${b} blue and ${g} green gems. One is picked at random. P(blue)?`, "frac", F(b, n), sfrac(F(b, n)), { fmt: "Fraction, e.g. 3/10", sol: `${b}/${n} = ${sfrac(F(b, n))}`, emoji: t.emoji }); const p = F(R(1, 19), 20), q = F(1).sub(p); return Q("Probability", `The probability that it rains tomorrow is ${fdec(p)}. What is the probability it does NOT rain?`, "num", q, fdec(q), { hint: "P(not A) = 1 − P(A)", sol: `1 − ${fdec(p)} = ${fdec(q)}` }); };
G.y8_prism = () => { const b = 2 * R(1, 8), h = R(2, 10), l = R(3, 20), v = b * h / 2 * l; return Q("Volume of prisms", `A triangular prism (a tent) has a triangle end with base ${b} m and height ${h} m, and length ${l} m. Find its volume.`, "num", v, `${v} m³`, { hint: "Area of cross-section × length.", sol: `½ × ${b} × ${h} = ${b * h / 2}; × ${l} = ${v} m³` }); };
G.y8_sdt = () => { const t = T(), s = R(3, 90), h = choice([F(1, 2), F(1), F(3, 2), F(2), F(5, 2), F(3), F(4)]), d = h.mul(s), c = rnd(); if (c < 0.4) return Q("Speed, distance, time", `${t.who} travels at ${s} km/h for ${fdec(h)} hours. How far?`, "num", d, `${fdec(d)} km`, { hint: "distance = speed × time", sol: `${s} × ${fdec(h)} = ${fdec(d)} km`, emoji: t.emoji }); if (c < 0.7) return Q("Speed, distance, time", `${t.who} travels ${fdec(d)} km in ${fdec(h)} hours. What is the average speed in km/h?`, "num", s, `${s} km/h`, { hint: "speed = distance ÷ time", sol: `${fdec(d)} ÷ ${fdec(h)} = ${s}`, emoji: t.emoji }); return Q("Speed, distance, time", `How long (in hours) does it take to travel ${fdec(d)} km at ${s} km/h?`, "num", h, `${fdec(h)} hours`, { hint: "time = distance ÷ speed", sol: `${fdec(d)} ÷ ${s} = ${fdec(h)}` }); };
G.y8_seq = () => { const a = R(-10, 15), d = nz(-6, 8), terms = range(0, 4).map(i => a + d * i), poly = P({ 1: d, 0: a - d }); return Q("Sequences", `Find the nth term of:  ${terms.join(",  ")}, …`, "poly", poly, ppoly(poly, "n"), { v: "n", fmt: "e.g. 3n + 2", hint: "The common difference goes in front of n.", sol: `${d}n, then adjust: ${ppoly(poly, "n")}` }); };
G.y8_polygon = () => { const n = choice([5, 6, 8, 9, 10, 12]); if (rnd() < 0.5) return Q("Angles in polygons", `What is the sum of the interior angles of a ${n}-sided polygon?`, "num", (n - 2) * 180, `${(n - 2) * 180}°`, { hint: "(n − 2) × 180", sol: `(${n} − 2) × 180 = ${(n - 2) * 180}°` }); const v = 360 / n, s = Number.isInteger(v) ? String(v) : v.toFixed(2); return Q("Angles in polygons", `Find the size of one exterior angle of a regular ${n}-sided polygon.`, "num", v, `${s}°`, { tol: dpTol(1), hint: "Exterior angles add up to 360°.", sol: `360 ÷ ${n} = ${s}°` }); };

// ---- Year 9
const TRIPLES = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [6, 8, 10], [9, 12, 15], [20, 21, 29], [9, 40, 41]];
G.y9_pyth = () => { const k = choice([1, 1, 2]), [a, b, c] = choice(TRIPLES).map(x => x * k); if (rnd() < 0.5) return Q("Pythagoras", `A right-angled triangle has shorter sides ${a} cm and ${b} cm. Find the hypotenuse.`, "num", c, `${c} cm`, { hint: "a² + b² = c²", sol: `√(${a * a} + ${b * b}) = √${c * c} = ${c}` }); return Q("Pythagoras", `A right-angled triangle has hypotenuse ${c} cm and one side ${a} cm. Find the other side.`, "num", b, `${b} cm`, { hint: "c² − a²", sol: `√(${c * c} − ${a * a}) = √${b * b} = ${b}` }); };
G.y9_expand2 = () => { const a = R(1, 9), b = nz(-9, 9), poly = pmul(P({ 1: 1, 0: a }), P({ 1: 1, 0: b })); return Q("Expanding double brackets", `Expand  (${lin(1, a)})(${lin(1, b)})`, "poly", poly, ppoly(poly), { fmt: "Type x^2 for x²,  e.g. x^2 + 5x + 6", hint: "Multiply each term by each term.", sol: `= ${ppoly(poly)}` }); };
G.y9_ineq = () => { const a = R(2, 9), x = R(-5, 10), b = R(-10, 15), sym = choice(["<", ">", "≤", "≥"]); return Q("Inequalities", `Solve ${lin(a, b)} ${sym} ${a * x + b}.  Your answer is x ${sym} ?  — type the number.`, "num", x, `x ${sym} ${x}`, { hint: "Solve like an equation.", sol: `${a}x ${sym} ${a * x} → x ${sym} ${x}` }); };
G.y9_compound = () => { const P0 = 100 * R(2, 60), r = choice([2, 3, 4, 5, 10, 15, 20]), n = R(2, 5), up = rnd() < 0.6, m = 1 + (up ? r : -r) / 100, v = P0 * m ** n; return Q("Compound interest & depreciation", `A spaceship worth £${cm(P0)} ${up ? `grows by ${r}% per year` : `loses ${r}% of its value per year`}. Find its value after ${n} years (nearest penny).`, "num", Math.round(v * 100) / 100, `£${v.toFixed(2)}`, { tol: 0.0051, hint: `Multiplier ${m} to the power ${n}.`, sol: `${P0} × ${m}^${n} = £${v.toFixed(2)}`, emoji: "🚀" }); };
G.y9_stdcalc = () => { const a = R(2, 9), b = R(2, 9), m = R(2, 9), n = R(1, 6); if (rnd() < 0.5) { const prod = a * b, v = F(prod).mul(pow10(m + n)), [aa, ee] = prod >= 10 ? [F(prod, 10), m + n + 1] : [F(prod), m + n]; return Q("Calculating in standard form", `Work out (${a} × 10^${m}) × (${b} × 10^${n}). Give your answer in standard form.`, "stdform", v, `${fdec(aa)} × 10^${ee}`, { fmt: "e.g. 1.2 x 10^5", sol: `${prod} × 10^${m + n} = ${fdec(aa)} × 10^${ee}` }); } const v = F(a).mul(pow10(m - n)); return Q("Calculating in standard form", `Work out (${a * b} × 10^${m}) ÷ (${b} × 10^${n}). Give your answer in standard form.`, "stdform", v, `${a} × 10^${m - n}`, { fmt: "e.g. 4 x 10^3", sol: `${a * b} ÷ ${b} = ${a}; 10^${m} ÷ 10^${n} = 10^${m - n}` }); };
G.y9_prob2 = () => { if (rnd() < 0.5) { const k = R(1, 6); return Q("Probability of two events", `A coin is flipped and a fair dice is rolled. P(heads AND a ${k})?`, "frac", F(1, 12), "1/12", { fmt: "Fraction", hint: "Independent events: multiply.", sol: "1/2 × 1/6 = 1/12" }); } const p = F(R(1, 9), 10), q = F(R(1, 9), 10), a = p.mul(q); return Q("Probability of two events", `P(Ruby's dragon hatches) = ${fdec(p)} and P(the second dragon hatches) = ${fdec(q)}, independently. P(both hatch)?`, "num", a, fdec(a), { hint: "Multiply.", sol: `${fdec(p)} × ${fdec(q)} = ${fdec(a)}`, emoji: "🐉" }); };
G.y9_gradient = () => { const x1 = R(-5, 5), y1 = R(-5, 5), m = nz(-4, 4), dx = R(1, 4), x2 = x1 + dx, y2 = y1 + m * dx; return Q("Gradient", `Find the gradient of the straight line through (${x1}, ${y1}) and (${x2}, ${y2}).`, "num", m, String(m), { hint: "change in y ÷ change in x", sol: `(${y2} − ${y1}) ÷ (${x2} − ${x1}) = ${m}` }); };
G.y9_cyl = () => { const r = R(2, 10), h = R(3, 20), v = Math.PI * r * r * h; return Q("Volume of cylinders", `A tin of space beans is a cylinder of radius ${r} cm and height ${h} cm. Find its volume (1 d.p.).`, "num", v, `${v.toFixed(1)} cm³`, { tol: dpTol(1), hint: "V = πr²h", sol: `π × ${r}² × ${h} = ${v.toFixed(1)}`, emoji: "🚀" }); };
G.y9_factor1 = () => { const k = R(2, 9), a = R(1, 7); let b = nz(-9, 9); while (gcd(a, Math.abs(b)) !== 1) b += b > 0 ? 1 : -1; const poly = P({ 1: k * a, 0: k * b }); return Q("Factorising", `Factorise fully  ${ppoly(poly)}`, "factor1", poly, `${k}(${lin(a, b)})`, { fmt: "e.g. 3(2x + 5)", hint: "Take out the highest common factor.", sol: `HCF ${k}: ${k}(${lin(a, b)})` }); };

// ---- GCSE (Year 10 / 11)
G.g_indices = () => {
  if (rnd() < 0.5) { const m = R(-4, 9), n = R(2, 9), p = R(-3, 8), k = m + n - p; return Q("Indices", `x^${m} × x^${n} ÷ x^${p} = x^k.  Find k.`, "num", k, String(k), { hint: "Multiply → add powers; divide → subtract powers.", sol: `${m} + ${n} − (${p}) = ${k}` }); }
  const [base, q] = choice([[8, 3], [27, 3], [16, 4], [16, 2], [25, 2], [64, 3], [64, 2], [32, 5], [81, 4], [125, 3], [36, 2], [49, 2]]);
  const root = Math.round(base ** (1 / q)), p = R(1, 3), neg = rnd() < 0.5, val = F(root ** p), a = neg ? F(1).div(val) : val, e = p !== q ? `${neg ? "-" : ""}${p}/${q}` : `${neg ? "-" : ""}1`;
  return Q("Indices", `Evaluate ${base}^(${e}). Give an exact answer.`, "frac", a, sfrac(a), { fmt: "Integer or fraction, e.g. 1/9", hint: "Denominator of the power = root; numerator = power; negative = reciprocal.", sol: `${q}-th root of ${base} = ${root}; ${root}^${p} = ${root ** p}` + (neg ? `; reciprocal → ${sfrac(a)}` : "") });
};
G.g_stdform = () => {
  if (rnd() < 0.5) { const m = R(101, 999), k = choice(range(-6, 8).filter(x => ![0, 1, 2].includes(x))), v = F(m, 100).mul(pow10(k)), s = v.val() >= 1000 ? cm(v.val()) : fdec(v); return Q("Standard form", `Write ${s} in standard form.`, "stdform", v, `${fdec(F(m, 100))} × 10^${k}`, { fmt: "e.g. 3.45 x 10^6   or   3.45e6", hint: "a × 10^n with 1 ≤ a < 10.", sol: `Move the decimal point so 1 ≤ a < 10: ${fdec(F(m, 100))} × 10^${k}` }); }
  const a = R(2, 9), b = R(2, 9), m = R(-5, 8), n = R(-5, 8), prod = a * b, v = F(prod).mul(pow10(m + n)), [aa, ee] = prod >= 10 ? [F(prod, 10), m + n + 1] : [F(prod), m + n];
  return Q("Standard form", `Work out (${a} × 10^${m}) × (${b} × 10^${n}). Give your answer in standard form.`, "stdform", v, `${fdec(aa)} × 10^${ee}`, { fmt: "e.g. 1.2 x 10^5", hint: "Multiply the numbers, add the powers, then make sure 1 ≤ a < 10.", sol: `${a} × ${b} = ${prod}; 10^${m} × 10^${n} = 10^${m + n}; = ${fdec(aa)} × 10^${ee}` });
};
G.g_surds = () => { const b = choice([2, 3, 5, 6, 7, 10, 11]); if (rnd() < 0.6) { const a = R(2, 9); return Q("Surds", `Simplify √${a * a * b}.`, "surd", [a, b], `${a}√${b}`, { fmt: "Type e.g. 3√5  or  3sqrt5  or  3r5", hint: "Find the biggest square number that divides it.", sol: `√${a * a * b} = √${a * a} × √${b} = ${a}√${b}` }); } const [a1, a2] = sample(range(1, 6), 2); return Q("Surds", `Simplify √${a1 * a1 * b} + √${a2 * a2 * b}.`, "surd", [a1 + a2, b], `${a1 + a2}√${b}`, { fmt: "Type e.g. 3√5  or  3sqrt5  or  3r5", hint: "Simplify each surd first, then collect like terms.", sol: `${a1}√${b} + ${a2}√${b} = ${a1 + a2}√${b}` }); };
G.g_linear = () => { const x = R(-9, 9), a = R(2, 9), c = choice(range(-5, 8).filter(v => v !== 0 && v !== a)), b = R(-15, 15), d = a * x + b - c * x; return Q("Linear equations", `Solve  ${lin(a, b)} = ${lin(c, d)}`, "num", x, `x = ${x}`, { fmt: "e.g. x = 4  or just 4", hint: "Get the x terms on one side and the numbers on the other.", sol: `${a - c}x = ${d - b}  →  x = ${x}` }); };
G.g_expand = () => { const [p, q] = choice([[1, 1], [1, 1], [1, 2], [2, 1], [2, 3], [3, 1]]), a = nz(-9, 9), b = nz(-9, 9), poly = pmul(P({ 1: p, 0: a }), P({ 1: q, 0: b })); return Q("Expanding brackets", `Expand and simplify  (${lin(p, a)})(${lin(q, b)})`, "poly", poly, ppoly(poly), { fmt: "Type x^2 for x²,  e.g.  x^2 + 5x + 6", hint: "Multiply every term in the first bracket by every term in the second.", sol: `= ${ppoly(poly)}` }); };
G.g_factorise = () => { if (rnd() < 0.25) { const k = R(2, 12), poly = P({ 2: 1, 0: -k * k }); return Q("Factorising quadratics", `Factorise  ${ppoly(poly)}`, "factor", poly, `(x + ${k})(x − ${k})`, { fmt: "e.g. (x + 2)(x − 3)", hint: "Difference of two squares: a² − b² = (a + b)(a − b).", sol: `x² − ${k}² = (x + ${k})(x − ${k})` }); } const a = nz(-9, 9), b = nz(-9, 9), poly = pmul(P({ 1: 1, 0: a }), P({ 1: 1, 0: b })); return Q("Factorising quadratics", `Factorise  ${ppoly(poly)}`, "factor", poly, `(${lin(1, a)})(${lin(1, b)})`, { fmt: "e.g. (x + 2)(x − 3)", hint: `Find two numbers that multiply to ${a * b} and add to ${a + b}.`, sol: `${a} × ${b} = ${a * b},  ${a} + ${b} = ${a + b}  →  (${lin(1, a)})(${lin(1, b)})` }); };
G.g_quad_solve = () => {
  let poly, roots, fac;
  if (rnd() < 0.7) { const [r1, r2] = sample(range(-9, 9).filter(v => v), 2); poly = pmul(P({ 1: 1, 0: -r1 }), P({ 1: 1, 0: -r2 })); roots = [F(r1), F(r2)]; fac = `(${lin(1, -r1)})(${lin(1, -r2)})`; }
  else { const p = choice([2, 3]), u = choice(range(-5, 5).filter(v => v && v % p)), r2 = nz(-6, 6); poly = pmul(P({ 1: p, 0: -u }), P({ 1: 1, 0: -r2 })); roots = [F(u, p), F(r2)]; fac = `(${lin(p, -u)})(${lin(1, -r2)})`; }
  return Q("Solving quadratics", `Solve  ${ppoly(poly)} = 0`, "set", roots, roots.map(sfrac).join(",  "), { fmt: "Both solutions separated by a comma, e.g.  -2, 5   (fractions like 3/2 are fine)", hint: "Factorise, then set each bracket = 0.", sol: `${fac} = 0  →  x = ` + roots.map(sfrac).join(" or x = ") });
};
G.g_quad_formula = () => {
  let a, b, c, D;
  for (;;) { a = R(1, 3); b = R(-9, 9); c = R(-9, 9); D = b * b - 4 * a * c; if (D > 0 && Math.round(Math.sqrt(D)) ** 2 !== D && c !== 0) break; }
  const r = [1, -1].map(s => (-b + s * Math.sqrt(D)) / (2 * a)), poly = P({ 2: a, 1: b, 0: c });
  return Q("Quadratic formula", `Solve  ${ppoly(poly)} = 0.  Give your answers to 2 decimal places.`, "set", r, r.map(v => v.toFixed(2)).join(",  "), { tol: dpTol(2), fmt: "Both answers, comma separated, e.g. 0.38, -2.63", hint: "x = (−b ± √(b² − 4ac)) / 2a", sol: `a=${a}, b=${b}, c=${c}; b² − 4ac = ${D}; x = (${-b} ± √${D}) / ${2 * a} = ` + r.map(v => v.toFixed(2)).join(" or ") });
};
G.g_simul = () => {
  const x = R(-6, 9), y = R(-6, 9); let a1, b1, a2, b2;
  do { [a1, b1, a2, b2] = [0, 0, 0, 0].map(() => nz(-6, 6)); } while (a1 * b2 - a2 * b1 === 0);
  const c1 = a1 * x + b1 * y, c2 = a2 * x + b2 * y, e = (a, b, c) => `${lin(a, 0)} ${b > 0 ? "+" : "−"} ${lin(Math.abs(b), 0, "y")} = ${c}`;
  return Q("Simultaneous equations", `Solve the simultaneous equations:\n  ${e(a1, b1, c1)}\n  ${e(a2, b2, c2)}`, "pair", [x, y], `x = ${x},  y = ${y}`, { fmt: "e.g.  x = 2, y = -3", hint: "Make the coefficients of x (or y) match, then add or subtract.", sol: `Eliminate one variable → x = ${x}; substitute back → y = ${y}.`, names: ["x", "y"] });
};
G.g_pyth = () => { const t = T(), a = R(3, 20), b = R(3, 20); if (rnd() < 0.5) { const h = Math.hypot(a, b); return Q("Pythagoras", `A ladder at ${t.place} reaches ${a} m up a wall; its foot is ${b} m from the wall. How long is the ladder? (1 d.p.)`, "num", h, `${h.toFixed(1)} m`, { tol: dpTol(1), hint: "a² + b² = c²", sol: `√(${a}² + ${b}²) = √${a * a + b * b} = ${h.toFixed(1)} m`, emoji: t.emoji }); } const hyp = Math.max(a, b) + R(2, 10), s = Math.min(a, b), o = Math.sqrt(hyp * hyp - s * s); return Q("Pythagoras", `A right-angled triangle has hypotenuse ${hyp} cm and one short side ${s} cm. Find the other side. (1 d.p.)`, "num", o, `${o.toFixed(1)} cm`, { tol: dpTol(1), hint: "Shorter side: subtract the squares.", sol: `√(${hyp}² − ${s}²) = √${hyp * hyp - s * s} = ${o.toFixed(1)} cm` }); };
G.g_trig = () => {
  const A = R(20, 70), h = R(5, 30), rad = A * Math.PI / 180, c = choice(["oh", "ah", "oa", "ang"]), pre = `Triangle ABC has a right angle at B. Angle A = ${A}°.`;
  if (c === "oh") { const v = h * Math.sin(rad); return Q("Trigonometry", `${pre} AC = ${h} cm. Find BC (1 d.p.).`, "num", v, `${v.toFixed(1)} cm`, { tol: dpTol(1), hint: "BC is opposite A, AC is the hypotenuse → SOH.", sol: `BC = ${h} × sin ${A}° = ${v.toFixed(1)} cm` }); }
  if (c === "ah") { const v = h * Math.cos(rad); return Q("Trigonometry", `${pre} AC = ${h} cm. Find AB (1 d.p.).`, "num", v, `${v.toFixed(1)} cm`, { tol: dpTol(1), hint: "AB is adjacent to A, AC is the hypotenuse → CAH.", sol: `AB = ${h} × cos ${A}° = ${v.toFixed(1)} cm` }); }
  if (c === "oa") { const v = h * Math.tan(rad); return Q("Trigonometry", `${pre} AB = ${h} cm. Find BC (1 d.p.).`, "num", v, `${v.toFixed(1)} cm`, { tol: dpTol(1), hint: "BC is opposite A, AB is adjacent → TOA.", sol: `BC = ${h} × tan ${A}° = ${v.toFixed(1)} cm` }); }
  const o = R(3, 12), hy = R(13, 25), ang = Math.asin(o / hy) * 180 / Math.PI;
  return Q("Trigonometry", `Triangle ABC has a right angle at B. BC = ${o} cm and AC = ${hy} cm. Find angle A (1 d.p.).`, "num", ang, `${ang.toFixed(1)}°`, { tol: dpTol(1), hint: "Opposite and hypotenuse → sin⁻¹.", sol: `A = sin⁻¹(${o}/${hy}) = ${ang.toFixed(1)}°` });
};
G.g_percent = () => {
  const t = T(), c = rnd();
  if (c < 0.3) { const p = choice([10, 15, 20, 25, 30, 40]), orig = R(4, 60) * 5, nw = F(orig * (100 - p), 100); return Q("Percentages (reverse & compound)", `In a sale at ${t.place}, prices are reduced by ${p}%. A jetpack now costs £${fdec(nw)}. What was the original price?`, "num", orig, `£${orig}`, { tol: 0.005, hint: `Sale price = ${100 - p}% of the original.`, sol: `£${fdec(nw)} ÷ ${fdec(F(100 - p, 100))} = £${orig}`, emoji: t.emoji }); }
  if (c < 0.6) { const P0 = R(5, 50) * 100, r = choice([2, 3, 4, 5, 6, 1.5, 2.5]), n = R(2, 6), v = P0 * (1 + r / 100) ** n; return Q("Percentages (reverse & compound)", `£${cm(P0)} is invested at ${r}% compound interest per year. How much is it worth after ${n} years? (to the nearest penny)`, "num", Math.round(v * 100) / 100, `£${v.toFixed(2)}`, { tol: 0.0051, hint: `Multiplier = ${1 + r / 100}; raise it to the power ${n}.`, sol: `${P0} × ${1 + r / 100}^${n} = £${v.toFixed(2)}` }); }
  const a = R(20, 400), b = a + choice([-1, 1]) * R(3, a - 5), pc = (b - a) / a * 100;
  return Q("Percentages (reverse & compound)", `The number of ${t.things} at ${t.place} changed from ${a} to ${b}. Find the percentage change (1 d.p.; negative for a decrease).`, "num", pc, `${pc.toFixed(1)}%`, { tol: dpTol(1), hint: "% change = (new − old) ÷ old × 100.", sol: `(${b} − ${a}) ÷ ${a} × 100 = ${pc.toFixed(1)}%`, emoji: t.emoji });
};
G.g_ratio = () => {
  const t = T(), parts = range(1, choice([2, 2, 3])).map(() => R(1, 7)), k = R(3, 30), total = sum(parts) * k, rs = parts.join(":");
  if (rnd() < 0.6) { const big = Math.max(...parts) * k; return Q("Ratio", `${t.who} share ${total} ${t.things} in the ratio ${rs}. How many does the largest share get?`, "num", big, String(big), { hint: "Total parts first, then one part.", sol: `${sum(parts)} parts; 1 part = ${k}; largest = ${Math.max(...parts)} × ${k} = ${big}`, emoji: t.emoji }); }
  let a = R(2, 9); const b = R(1, 8); if (a === b) a += 1; const diff = Math.abs(a - b) * k;
  return Q("Ratio", `Red and blue ${t.things} are in the ratio ${a}:${b}. There are ${diff} more ${a > b ? "red" : "blue"} than ${a > b ? "blue" : "red"}. How many altogether?`, "num", (a + b) * k, String((a + b) * k), { hint: "The difference is how many parts?", sol: `${Math.abs(a - b)} parts = ${diff} → 1 part = ${k}; total = ${a + b} × ${k} = ${(a + b) * k}`, emoji: t.emoji });
};
G.g_prob = () => {
  const t = T(), r = R(2, 8), b = R(2, 8), n = r + b, repl = rnd() < 0.4; let a, what, how;
  if (rnd() < 0.5) { a = F(r, n).mul(repl ? F(r, n) : F(r - 1, n - 1)); what = "both are red"; how = repl ? `${r}/${n} × ${r}/${n}` : `${r}/${n} × ${r - 1}/${n - 1}`; }
  else { a = F(2).mul(F(r, n)).mul(repl ? F(b, n) : F(b, n - 1)); what = "one is red and one is blue"; how = repl ? `2 × ${r}/${n} × ${b}/${n}` : `${r}/${n} × ${b}/${n - 1} + ${b}/${n} × ${r}/${n - 1}`; }
  return Q("Probability", `A treasure bag at ${t.place} has ${r} red and ${b} blue gems. Two are taken at random ${repl ? "WITH" : "WITHOUT"} replacement. Find the probability that ${what}.`, "frac", a, sfrac(a), { fmt: "Fraction, e.g. 3/10", hint: "Draw a tree diagram; multiply along branches, add between outcomes.", sol: `${how} = ${sfrac(a)}`, emoji: t.emoji });
};
G.g_line = () => { const x1 = R(-6, 6), y1 = R(-6, 6), x2 = choice(range(-6, 6).filter(v => v !== x1)), y2 = R(-8, 8), m = F(y2 - y1, x2 - x1), c = F(y1).sub(m.mul(x1)); if (rnd() < 0.5) return Q("Straight-line graphs", `Find the gradient of the line through (${x1}, ${y1}) and (${x2}, ${y2}).`, "frac", m, sfrac(m), { fmt: "Integer or fraction, e.g. -3/2", hint: "Gradient = change in y ÷ change in x.", sol: `(${y2} − ${y1}) ÷ (${x2} − ${x1}) = ${sfrac(m)}` }); return Q("Straight-line graphs", `A line passes through (${x1}, ${y1}) and (${x2}, ${y2}). Its equation is y = mx + c. Find c.`, "frac", c, sfrac(c), { fmt: "Integer or fraction", hint: "Find m first, then substitute one point.", sol: `m = ${sfrac(m)};  c = ${y1} − ${sfrac(m)} × ${x1} = ${sfrac(c)}` }); };
G.g_circle = () => {
  const r = R(2, 15), c = rnd();
  if (c < 0.25) { const v = Math.PI * r * r; return Q("Circles & sectors", `Find the area of a circular portal of radius ${r} cm (1 d.p.).`, "num", v, `${v.toFixed(1)} cm²`, { tol: dpTol(1), hint: "A = πr²", sol: `π × ${r}² = ${v.toFixed(1)}` }); }
  if (c < 0.5) { const v = 2 * Math.PI * r; return Q("Circles & sectors", `Find the circumference of a circle of radius ${r} cm (1 d.p.).`, "num", v, `${v.toFixed(1)} cm`, { tol: dpTol(1), hint: "C = 2πr", sol: `2 × π × ${r} = ${v.toFixed(1)}` }); }
  const ang = choice([30, 40, 45, 60, 72, 80, 100, 120, 135, 150, 210, 240]);
  if (c < 0.75) { const v = ang / 360 * Math.PI * r * r; return Q("Circles & sectors", `A pizza slice is a sector of radius ${r} cm and angle ${ang}°. Find its area (1 d.p.).`, "num", v, `${v.toFixed(1)} cm²`, { tol: dpTol(1), hint: "(angle/360) × πr²", sol: `${ang}/360 × π × ${r}² = ${v.toFixed(1)}` }); }
  const v = ang / 360 * 2 * Math.PI * r; return Q("Circles & sectors", `A sector has radius ${r} cm and angle ${ang}°. Find the arc length (1 d.p.).`, "num", v, `${v.toFixed(1)} cm`, { tol: dpTol(1), hint: "(angle/360) × 2πr", sol: `${ang}/360 × 2π × ${r} = ${v.toFixed(1)}` });
};
G.g_volume = () => {
  const r = R(2, 12), h = R(3, 20), c = choice(["cyl", "cone", "sphere", "hemi"]); let v, txt, f, s;
  if (c === "cyl") { v = Math.PI * r * r * h; txt = `a cylindrical fuel tank, radius ${r} cm and height ${h} cm`; f = "V = πr²h"; s = `π × ${r}² × ${h}`; }
  else if (c === "cone") { v = Math.PI * r * r * h / 3; txt = `a cone-shaped party hat, radius ${r} cm and height ${h} cm`; f = "V = ⅓πr²h"; s = `⅓ × π × ${r}² × ${h}`; }
  else if (c === "sphere") { v = 4 / 3 * Math.PI * r ** 3; txt = `a spherical planet model of radius ${r} cm`; f = "V = 4/3 πr³"; s = `4/3 × π × ${r}³`; }
  else { v = 2 / 3 * Math.PI * r ** 3; txt = `a hemisphere dome of radius ${r} cm`; f = "V = 2/3 πr³ (half a sphere)"; s = `2/3 × π × ${r}³`; }
  return Q("Volume", `Find the volume of ${txt}. (1 d.p.)`, "num", v, `${v.toFixed(1)} cm³`, { tol: dpTol(1), hint: f, sol: `${s} = ${v.toFixed(1)} cm³` });
};
G.g_seq = () => {
  if (rnd() < 0.55) { const a = R(-10, 15), d = nz(-7, 8), terms = range(0, 4).map(i => a + d * i), poly = P({ 1: d, 0: a - d }); return Q("Sequences (nth term)", `Find the nth term of the sequence:  ${terms.join(",  ")}, …`, "poly", poly, ppoly(poly, "n"), { v: "n", fmt: "e.g. 3n + 2", hint: "The difference goes in front of n.", sol: `Difference = ${d} → ${d}n; first term ${a} − ${d} = ${a - d} → ${ppoly(poly, "n")}` }); }
  const A = R(1, 3), B = R(-6, 6), C = R(-8, 8), terms = range(1, 5).map(n => A * n * n + B * n + C), poly = P({ 2: A, 1: B, 0: C });
  return Q("Sequences (nth term)", `Find the nth term of the quadratic sequence:  ${terms.join(",  ")}, …`, "poly", poly, ppoly(poly, "n"), { v: "n", fmt: "Type n^2 for n²,  e.g. 2n^2 + 3n − 1", hint: "Second difference ÷ 2 = coefficient of n². Subtract that, then find the linear part.", sol: `Second difference = ${2 * A} → ${A}n². Then the linear part → ${ppoly(poly, "n")}` });
};
G.g_proportion = () => {
  const t = T(), k = R(2, 9);
  if (rnd() < 0.5) { const x1 = R(2, 5), x2 = R(2, 10), y1 = k * x1 * x1, a = k * x2 * x2; return Q("Direct & inverse proportion", `The energy E of ${t.who}'s rocket is directly proportional to the square of its speed v. When v = ${x1}, E = ${y1}. Find E when v = ${x2}.`, "num", a, String(a), { hint: "E = kv². Find k first.", sol: `k = ${y1} ÷ ${x1}² = ${k};  E = ${k} × ${x2}² = ${a}`, emoji: t.emoji }); }
  const K = k * R(6, 30), divs = range(2, 12).filter(d => K % d === 0), x1 = divs.length ? choice(divs) : 1, x2 = R(2, 15), a = F(K, x2);
  return Q("Direct & inverse proportion", `y is inversely proportional to x. When x = ${x1}, y = ${K / x1}. Find y when x = ${x2}.`, "num", a, smixed(a), { fmt: "Exact value (fraction OK) or 2 d.p.", tol: 0.0051, hint: "y = k/x. Find k first.", sol: `k = ${x1} × ${K / x1} = ${K};  y = ${K} ÷ ${x2} = ${smixed(a)}` });
};
G.g_recurring = () => {
  if (rnd() < 0.6) { let ab = R(1, 98); if (ab % 11 === 0) ab += 1; const s = String(ab).padStart(2, "0"), a = F(ab, 99); return Q("Recurring decimals", `Write 0.${s}${s}${s}… (the digits ${s} repeat) as a fraction in its simplest form.`, "frac_simplest", a, sfrac(a), { fmt: "e.g. 5/11", hint: `Let x = 0.${s}…, then 100x − x = ${s}.`, sol: `100x − x = ${ab} → x = ${ab}/99 = ${sfrac(a)}` }); }
  const a = R(1, 9); let b = R(1, 9); if (a === b) b = (b % 9) + 1; const v = F(10 * a + b - a, 90);
  return Q("Recurring decimals", `Write 0.${a}${b}${b}${b}… (only the ${b} repeats) as a fraction in its simplest form.`, "frac_simplest", v, sfrac(v), { fmt: "e.g. 7/30", hint: "Let x = …; compare 100x and 10x.", sol: `100x − 10x = ${10 * a + b} − ${a} = ${10 * a + b - a} → x = ${10 * a + b - a}/90 = ${sfrac(v)}` });
};
G.g_stats = () => { const s0 = R(0, 3), vals = range(s0, s0 + 3), fr = vals.map(() => R(1, 12)), tot = sum(vals.map((v, i) => v * fr[i])), m = tot / sum(fr); return Q("Statistics (frequency tables)", `A football club's results — ${vals.map((v, i) => `${v} goals: ${fr[i]} matches`).join(", ")}. Find the mean number of goals per match (1 d.p.).`, "num", m, m.toFixed(1), { tol: dpTol(1), hint: "Σ(value × frequency) ÷ Σfrequency", sol: `${tot} ÷ ${sum(fr)} = ${m.toFixed(1)}`, emoji: "⚽" }); };
G.g_bounds = () => { const L = R(5, 30), u = choice(["cm", "m"]); if (rnd() < 0.5) { const ub = (L + 0.5) ** 2; return Q("Bounds", `The side of a square is ${L} ${u}, correct to the nearest ${u}. Find the upper bound of its area.`, "num", ub, `${ub} ${u}²`, { tol: 1e-6, hint: "Use the upper bound of the side.", sol: `Upper bound of side = ${L + 0.5}; (${L + 0.5})² = ${ub}` }); } const d = R(50, 300), t = R(2, 9), ub = (d + 0.5) / (t - 0.5); return Q("Bounds", `A distance of ${d} m (nearest m) is run in ${t} s (nearest s). Find the upper bound of the speed (2 d.p.).`, "num", ub, `${ub.toFixed(2)} m/s`, { tol: dpTol(2), hint: "Max speed = max distance ÷ min time.", sol: `${d + 0.5} ÷ ${t - 0.5} = ${ub.toFixed(2)}` }); };

// ================================================================ PURE CALCULATION (added 2026-11-27, engine v2)
// Context-free calculation types: KS2 Paper 1 arithmetic content (column +/−, short/long ×, short/long ÷,
// ×÷10/100/1000, decimals, fractions, % of, order of operations), the Chinese 计算 line (口算, 简便运算,
// 四则混合, 有理数, 乘方, 整式, 解方程), KS3/GCSE algebraic manipulation. Steps types carry q.step for steps.js.
const ng = n => (n < 0 ? `(−${-n})` : String(n));          // a negative number in a calculation
const sg = n => (n < 0 ? `−${-n}` : String(n));            // a leading negative number
const fs = f => { f = toFr(f); return f.n < 0 ? `−${sfrac(f.mul(-1))}` : sfrac(f); };
const mixs = f => { f = toFr(f); const w = Math.floor(f.val()), r = f.sub(w); return r.n === 0 ? String(w) : w ? `${w} ${r.n}/${r.d}` : `${r.n}/${r.d}`; };
const FRF = "Fraction or mixed number, e.g. 7/8 or 1 1/4";
const QC = (topic, expr, ans, o = {}) => Q(topic, `${expr} = ?`, o.kind || "num", ans, o.show || (ans instanceof Fr ? smixed(ans) : String(ans)), o);
const sstep = (q, type, start, value, v) => { q.step = { type, start, value: toFr(value), v: v || null, mixed: true }; return q; };
// --- Year 1–2: number facts
G.a1_add10 = () => { const a = R(0, 10), b = R(0, 10 - a); return QC("Adding within 10", `${a} + ${b}`, a + b); };
G.a1_sub10 = () => { const a = R(1, 10), b = R(0, a); return QC("Subtracting within 10", `${a} − ${b}`, a - b); };
G.a1_add20 = () => { const a = R(6, 9), b = R(11 - a, 9); return QC("Adding across 10", `${a} + ${b}`, a + b, { hint: `Make 10 first: ${a} + ${10 - a} = 10.` }); };
G.a2_add21 = () => { const a = R(12, 88), b = R(3, 9); return rnd() < 0.5 ? QC("Adding 2-digit and 1-digit", `${a} + ${b}`, a + b) : QC("Subtracting 1-digit", `${a + b} − ${b}`, a); };
G.a2_tens = () => { const a = R(11, 69), b = R(1, 3) * 10; return rnd() < 0.5 ? QC("Adding tens", `${a} + ${b}`, a + b) : QC("Subtracting tens", `${a + b} − ${b}`, a); };
G.a2_div = () => { const d = choice([2, 5, 10]), q = R(1, 12); return QC("Division facts (2, 5, 10)", `${d * q} ÷ ${d}`, q); };
// --- Year 3–4: written methods
G.a3_coladd = () => { const a = R(120, 879), b = R(105, 999 - a); return QC("Column addition", `${a} + ${b}`, a + b, { hint: "Line up ones, tens, hundreds; carry when a column makes 10 or more." }); };
G.a3_colsub = () => { const a = R(300, 999), b = R(101, a - 50); return QC("Column subtraction", `${a} − ${b}`, a - b, { hint: "Exchange from the next column when the top digit is smaller." }); };
G.a3_mul21 = () => { const a = R(12, 49), b = choice([3, 4, 8]); return QC("2-digit × 1-digit", `${a} × ${b}`, a * b, { hint: `${a} × ${b} = ${Math.floor(a / 10) * 10} × ${b} + ${a % 10} × ${b}` }); };
G.a3_divfacts = () => { const d = choice([3, 4, 8]), q = R(2, 12); return QC("Division facts (3, 4, 8)", `${d * q} ÷ ${d}`, q); };
G.a3_missing = () => { const k = R(0, 2); if (k === 0) { const a = R(2, 9), b = R(2, 10); return Q("Missing numbers", `? × ${a} = ${a * b}`, "num", b, String(b)); } if (k === 1) { const a = R(30, 99), b = R(11, a - 5); return Q("Missing numbers", `${a} − ? = ${a - b}`, "num", b, String(b)); } const a = R(15, 80), b = R(11, 90); return Q("Missing numbers", `? + ${a} = ${a + b}`, "num", b, String(b)); };
G.a4_coladd4 = () => { const a = R(1200, 6800), b = R(1050, 9999 - a); return rnd() < 0.5 ? QC("4-digit column addition", `${cm(a)} + ${cm(b)}`, a + b) : QC("4-digit column subtraction", `${cm(a + b)} − ${cm(b)}`, a, { hint: "Exchange across zeros one column at a time." }); };
G.a4_mul31 = () => { const a = R(102, 989), b = R(3, 9); return QC("3-digit × 1-digit (short multiplication)", `${a} × ${b}`, a * b); };
G.a4_mul10 = () => { const a = R(3, 99), p = choice([10, 100]); return rnd() < 0.5 ? QC("× and ÷ by 10, 100", `${a} × ${p}`, a * p) : QC("× and ÷ by 10, 100", `${cm(a * p)} ÷ ${p}`, a); };
G.a4_shortdiv = () => { const d = R(3, 9), q = R(21, 199); return QC("Short division", `${d * q} ÷ ${d}`, q, { hint: "Divide each digit from the left; carry the remainder." }); };
G.a4_dec1 = () => { const a = R(11, 99), b = R(11, 99); return rnd() < 0.5 ? QC("Adding decimals (1 d.p.)", `${fdec(F(a, 10))} + ${fdec(F(b, 10))}`, F(a + b, 10), { show: fdec(F(a + b, 10)) }) : QC("Subtracting decimals (1 d.p.)", `${fdec(F(a + b, 10))} − ${fdec(F(b, 10))}`, F(a, 10), { show: fdec(F(a, 10)) }); };
// --- Year 5–6: KS2 Paper 1
G.a5_longmul = () => { const a = R(102, 2999), b = R(12, 39); return QC("Long multiplication", `${cm(a)} × ${b}`, a * b, { hint: `${cm(a)} × ${b % 10} + ${cm(a)} × ${b - (b % 10)}` }); };
G.a5_shortdiv4 = () => { const d = R(3, 9), q = R(112, 1110); return QC("Short division (4-digit)", `${cm(d * q)} ÷ ${d}`, q); };
G.a5_decadd = () => { const a = F(R(101, 2999), 100), b = F(R(11, 999), 10); const k = rnd(); if (k < 0.4) return QC("Adding decimals", `${fdec(a)} + ${fdec(b)}`, a.add(b), { show: fdec(a.add(b)), hint: "Line up the decimal points." }); if (k < 0.7) { const w = R(3, 20), c = F(R(11, w * 100 - 1), 100); return QC("Subtracting decimals", `${w} − ${fdec(c)}`, F(w).sub(c), { show: fdec(F(w).sub(c)), hint: `Write ${w} as ${w}.00.` }); } const s = a.add(b); return QC("Subtracting decimals", `${fdec(s)} − ${fdec(a)}`, b, { show: fdec(b) }); };
G.a5_pow10dec = () => { const a = F(R(11, 9999), choice([10, 100])), p = choice([10, 100, 1000]); return rnd() < 0.5 ? QC("× by 10, 100, 1000 (decimals)", `${fdec(a)} × ${cm(p)}`, a.mul(p), { show: fdec(a.mul(p)) }) : QC("÷ by 10, 100, 1000 (decimals)", `${fdec(a)} ÷ ${cm(p)}`, a.div(p), { show: fdec(a.div(p)), hint: "Digits move right when you divide." }); };
G.a5_fracsame = () => { const d = choice([5, 6, 7, 8, 9, 10, 12]); const a = R(1, d - 1), b = R(1, d - 1); return rnd() < 0.5 ? QC("Adding fractions (same denominator)", `${a}/${d} + ${b}/${d}`, F(a + b, d), { kind: "frac", fmt: FRF }) : (a === b ? QC("Adding fractions (same denominator)", `${a}/${d} + ${b}/${d}`, F(a + b, d), { kind: "frac", fmt: FRF }) : QC("Subtracting fractions (same denominator)", `${Math.max(a, b)}/${d} − ${Math.min(a, b)}/${d}`, F(Math.abs(a - b), d), { kind: "frac", fmt: FRF })); };
G.a5_mixed = () => { const d = choice([3, 4, 5, 6, 8]); const x = F(R(1, 4) * d + R(1, d - 1), d), y = F(R(0, 2) * d + R(1, d - 1), d); return rnd() < 0.5 ? QC("Adding mixed numbers", `${mixs(x)} + ${mixs(y)}`, x.add(y), { kind: "frac", fmt: FRF }) : (x.cmp(y) > 0 ? QC("Subtracting mixed numbers", `${mixs(x)} − ${mixs(y)}`, x.sub(y), { kind: "frac", fmt: FRF }) : QC("Adding mixed numbers", `${mixs(x)} + ${mixs(y)}`, x.add(y), { kind: "frac", fmt: FRF })); };
G.a5_sqcalc = () => { const a = R(2, 12), b = R(2, 5); return QC("Squares and cubes", `${a}² + ${b}³`, a * a + b ** 3); };
G.a6_longdiv = () => { const d = R(12, 49), q = R(21, 299); return QC("Long division", `${cm(d * q)} ÷ ${d}`, q, { hint: "Divide, multiply, subtract, bring down." }); };
G.a6_longmul4 = () => { const a = R(1002, 4999), b = R(21, 89); return QC("Long multiplication (4-digit × 2-digit)", `${cm(a)} × ${b}`, a * b); };
G.a6_decmul = () => { const a = F(R(101, 999), 100), b = R(3, 9); return rnd() < 0.5 ? QC("Decimal × whole number", `${fdec(a)} × ${b}`, a.mul(b), { show: fdec(a.mul(b)) }) : QC("Decimal ÷ whole number", `${fdec(a.mul(b))} ÷ ${b}`, a, { show: fdec(a) }); };
G.a6_fracunlike = () => { const [d1, d2] = sample([2, 3, 4, 5, 6, 8, 10, 12], 2); const a = F(R(1, d1 - 1), d1), b = F(R(1, d2 - 1), d2); return rnd() < 0.55 || a.cmp(b) <= 0 ? QC("Adding fractions (different denominators)", `${sfrac(a)} + ${sfrac(b)}`, a.add(b), { kind: "frac", fmt: FRF, hint: "Use a common denominator." }) : QC("Subtracting fractions (different denominators)", `${sfrac(a)} − ${sfrac(b)}`, a.sub(b), { kind: "frac", fmt: FRF, hint: "Use a common denominator." }); };
G.a6_fracwhole = () => { const d = choice([3, 4, 5, 6, 8]), n = coprime(d), f = F(n, d); if (rnd() < 0.5) { const w = d * R(2, 12); return QC("Fraction × whole number", `${n}/${d} × ${w}`, f.mul(w), { kind: "frac", fmt: FRF }); } const w = R(2, 6); return QC("Fraction ÷ whole number", `${n}/${d} ÷ ${w}`, f.div(w), { kind: "frac", fmt: FRF, hint: `÷ ${w} is the same as × 1/${w}.` }); };
G.a6_pctof = () => { const p = choice([1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 60, 75, 90]), a = choice([40, 60, 80, 120, 160, 200, 240, 300, 360, 480, 520, 640, 800]); const v = F(p * a, 100); return Q("Percentage of an amount", `${p}% of ${a} = ?`, "num", v, fdec(v), { hint: "Find 10% (or 1%) first, then build up." }); };
// --- Year 7–8: rational numbers, calculating cleverly, powers
G.a7_negall = () => { const a = nz(-15, 15), b = nz(-12, 12), c = nz(-9, 9), k = R(0, 2); if (k === 0) return QC("Adding and subtracting negatives", `${sg(a)} + ${ng(b)} − ${ng(c)}`, a + b - c, { hint: "Subtracting a negative is adding." }); if (k === 1) return QC("Multiplying negatives", `${ng(a)} × ${ng(b)} × ${ng(c)}`, a * b * c); const q = nz(-9, 9), d = nz(-9, 9); return QC("Dividing negatives", `${ng(q * d)} ÷ ${ng(d)}`, q); };
G.a7_clever = () => { const k = R(0, 5); let e, v, h;
  if (k === 0) { const m = R(12, 88); e = `25 × ${4 * m}`; v = 100 * m; h = "25 × 4 = 100"; }
  else if (k === 1) { const m = R(12, 98), n = choice([99, 101, 98, 999]); e = `${m} × ${n}`; v = m * n; h = n === 99 ? `${m} × 100 − ${m}` : n === 101 ? `${m} × 100 + ${m}` : n === 98 ? `${m} × 100 − ${m} × 2` : `${m} × 1000 − ${m}`; }
  else if (k === 2) { const m = R(3, 19); e = `125 × ${m} × 8`; v = 1000 * m; h = "125 × 8 = 1000"; }
  else if (k === 3) { const a = F(R(11, 99), 10), b = R(2, 9) * 10, c = 100 - b; e = `${fdec(a)} × ${b} + ${fdec(a)} × ${c}`; v = a.mul(100); h = `${fdec(a)} × (${b} + ${c})`; }
  else if (k === 4) { const a = R(21, 79), b = R(2, 9); e = `${a} × ${b} + ${a} × ${10 - b}`; v = a * 10; h = `${a} × (${b} + ${10 - b})`; }
  else { const a = R(102, 498), b = choice([197, 198, 199, 298, 299, 397, 398, 399]); e = `${a} + ${b}`; v = a + b; h = `${a} + ${Math.ceil(b / 100) * 100} − ${Math.ceil(b / 100) * 100 - b}`; }
  return QC("Calculating cleverly", e, v, { show: v instanceof Fr ? fdec(v) : String(v), hint: h }); };
G.a7_decdec = () => { const k = rnd(); if (k < 0.5) { const a = F(R(2, 9), 10), b = F(R(2, 9), choice([10, 100])); return QC("Multiplying decimals", `${fdec(a)} × ${fdec(b)}`, a.mul(b), { show: fdec(a.mul(b)), hint: "Multiply as whole numbers, then count the decimal places." }); } const b = F(R(2, 9), choice([10, 100])), q = R(2, 60); return QC("Dividing by a decimal", `${fdec(b.mul(q))} ÷ ${fdec(b)}`, q, { hint: "Multiply both numbers by 10 or 100 so you divide by a whole number." }); };
G.a7_mixedmul = () => { const d = choice([2, 3, 4, 5]), x = F(R(1, 3) * d + R(1, d - 1), d), e = choice([2, 3, 4, 5]), y = F(R(1, 2) * e + R(1, e - 1), e); return rnd() < 0.5 ? QC("Multiplying mixed numbers", `${mixs(x)} × ${mixs(y)}`, x.mul(y), { kind: "frac", fmt: FRF, hint: "Change to improper fractions first." }) : QC("Dividing mixed numbers", `${mixs(x)} ÷ ${mixs(y)}`, x.div(y), { kind: "frac", fmt: FRF, hint: "Improper fractions, then multiply by the reciprocal." }); };
G.a8_powers = () => { const a = nz(-5, 5), b = R(2, 3), c = R(2, 6), d = R(2, 5); return QC("Powers and order of operations", `(${sg(a)})² − ${b}³ + ${c} × ${d}`, a * a - b ** 3 + c * d); };
G.a8_idxnum = () => { const b = choice([2, 3, 5, 10]), p = R(2, 9), q = R(2, 9), r = R(1, p + q - 1); return Q("Index laws (numbers)", `${b}^${p} × ${b}^${q} ÷ ${b}^${r} = ${b}^?`, "num", p + q - r, String(p + q - r), { hint: "× add the powers, ÷ subtract them." }); };
G.a8_ratneg = () => { const [d1, d2] = sample([2, 3, 4, 5, 6, 8], 2), a = F(nz(-d1 + 1, d1 - 1), d1), b = F(nz(-d2 + 1, d2 - 1), d2); const k = R(0, 2); const sa = a.n < 0 ? `(${fs(a)})` : sfrac(a), sb = b.n < 0 ? `(${fs(b)})` : sfrac(b); if (k === 0) return QC("Negative fractions", `${fs(a)} + ${sb}`, a.add(b), { kind: "frac", fmt: "e.g. -1/12", show: fs(a.add(b)) }); if (k === 1) return QC("Negative fractions", `${sa} × ${sb}`, a.mul(b), { kind: "frac", fmt: "e.g. -3/8", show: fs(a.mul(b)) }); return QC("Negative fractions", `${sa} ÷ ${sb}`, a.div(b), { kind: "frac", fmt: "e.g. -4/3", show: fs(a.div(b)) }); };
G.a8_expand1 = () => { const a = nz(-6, 7), b = R(1, 5), c = nz(-9, 9); const p = P({ 1: a * b, 0: a * c }); return Q("Expanding a bracket", `Expand ${a === -1 ? "−" : sg(a)}(${lin(b, c)})`, "poly", p, ppoly(p), { fmt: "e.g. 6x - 15", hint: "Multiply each term inside by the number outside." }); };
G.a8_collect = () => { const a = nz(-7, 9), b = nz(-9, 9), c = nz(-7, 7), d = nz(-9, 9); const p = P({ 1: a + c, 0: b + d }); return Q("Collecting like terms", `Simplify ${lin(a, b)} ${c > 0 ? "+" : "−"} ${lin(Math.abs(c), 0)} ${d > 0 ? "+" : "−"} ${Math.abs(d)}`, "poly", p, ppoly(p), { fmt: "e.g. 3x + 4", hint: "Add the x terms, then the numbers." }); };
// --- Year 9–11: algebraic manipulation and powers
G.a9_idxalg = () => { const p = R(2, 9), q = R(2, 9), k = R(0, 2); if (k === 0) return Q("Index laws (algebra)", `Simplify x^${p} × x^${q}`, "poly", P({ [p + q]: 1 }), `x^${p + q}`, { fmt: "e.g. x^7" }); if (k === 1) { const r = R(1, p + q - 1); return Q("Index laws (algebra)", `Simplify x^${p + q} ÷ x^${r}`, "poly", P({ [p + q - r]: 1 }), `x^${p + q - r}`, { fmt: "e.g. x^7" }); } const r = R(2, 4); return Q("Index laws (algebra)", `Simplify (x^${p})^${r}`, "poly", P({ [p * r]: 1 }), `x^${p * r}`, { fmt: "e.g. x^12" }); };
G.a9_sqrt = () => { const a = R(2, 15), b = R(2, 12), c = R(2, 5); return QC("Square roots and order of operations", `√${a * a} + √${b * b} × ${c}`, a + b * c); };
G.a9_expandsq = () => { const a = R(1, 3), b = nz(-9, 9); const p = P({ 2: a * a, 1: 2 * a * b, 0: b * b }); return Q("Squaring a bracket", `Expand (${lin(a, b)})²`, "poly", p, ppoly(p), { fmt: "e.g. x^2 + 10x + 25", hint: "(a + b)² = a² + 2ab + b²" }); };
G.a10_fracidx = () => { const k = R(0, 2); if (k === 0) { const b = choice([2, 3, 4, 5]), n = choice([2, 3]), m = R(1, 3); const base = b ** n; return QC("Fractional indices", `${base}^(${m}/${n})`, b ** m, { hint: `Take the ${n === 2 ? "square" : "cube"} root first, then the power.` }); } if (k === 1) { const b = choice([2, 3, 4, 5, 10]), n = choice([2, 3]); return QC("Negative and fractional indices", `${b ** n}^(−1/${n})`, F(1, b), { kind: "frac", fmt: "e.g. 1/4" }); } const b = choice([2, 3, 4, 5]), p = R(1, 3); return QC("Negative indices", `${b}^(−${p})`, F(1, b ** p), { kind: "frac", fmt: "e.g. 1/8" }); };
G.a10_expand2 = () => { const a = R(1, 4), b = nz(-9, 9), c = R(1, 3), d = nz(-9, 9); const p = P({ 2: a * c, 1: a * d + b * c, 0: b * d }); return Q("Expanding two brackets", `Expand (${lin(a, b)})(${lin(c, d)})`, "poly", p, ppoly(p), { fmt: "e.g. 2x^2 + 5x - 12" }); };
// --- step-by-step types (also playable as one-answer questions)
const fmtE = e => e.replace(/-/g, "−");
G.s5_order = () => { const a = R(10, 60), b = R(2, 9), c = R(2, 9), d = R(1, 9); let e, v; if (rnd() < 0.5) { e = `${a} + ${b} × ${c} − ${d}`; v = a + b * c - d; } else { e = `${a + b * c} − ${b} × ${c} + ${d}`; v = a + d; } return sstep(QC("Order of operations (step by step)", e, v, { hint: "× and ÷ before + and −." }), "calc", e, v); };
G.s6_order = () => { const a = R(2, 9), b = R(3, 12), c = R(1, b - 1), d = R(2, 9), q = R(2, 9); const e = `${a * (b - c) + 10} − ${a} × (${b} − ${c}) + ${d * q} ÷ ${d}`; const v = 10 + q; return sstep(QC("Brackets and order of operations (step by step)", e, v, { hint: "Brackets first, then × and ÷, then + and −." }), "calc", e, v); };
G.s7_order = () => { const a = nz(-9, 9), b = R(2, 6), c = nz(-6, 6), d = nz(-5, 5), q = nz(-6, 6); const e = `${sg(a)} + ${b} × ${ng(c)} − ${ng(d * q)} ÷ ${ng(d)}`; const v = a + b * c - q; return sstep(QC("Negatives and order of operations (step by step)", e, v), "calc", e, v); };
G.s8_powers = () => { const a = R(2, 4), b = R(1, 5), c = R(2, 4), d = R(2, 6); const e = `${a}³ − ${b} × (${c + d} − ${d})² + ${d * 3} ÷ 3`; const v = a ** 3 - b * c * c + d; return sstep(QC("Powers and brackets (step by step)", e, v, { hint: "Brackets, then powers, then × ÷, then + −." }), "calc", e, v); };
G.s8_fracorder = () => { const [d1, d2, d3] = [choice([2, 3, 4, 5, 6]), choice([2, 3, 4, 5]), choice([2, 3, 4, 5])]; const x = F(R(1, d1 - 1), d1), y = F(R(1, d2 - 1), d2), z = F(R(1, d3 - 1), d3); const e = `${sfrac(x)} + ${sfrac(y)} × ${sfrac(z)}`; const v = x.add(y.mul(z)); return sstep(QC("Fractions and order of operations (step by step)", e, v, { kind: "frac", fmt: FRF }), "calc", e, v); };
const SOLVE = "e.g. x = 4  (or x = 5/3)";
const eqq = (topic, eqs, x) => sstep(Q(topic, `Solve ${fmtE(eqs)}`, "frac", F(x), `x = ${x}`, { fmt: SOLVE, hint: "Do the same to both sides." }), "eq", fmtE(eqs), x, "x");
G.e7_two = () => { const a = R(2, 9), x = R(-6, 12), b = nz(-15, 15); return eqq("Two-step equations (step by step)", `${lin(a, b)} = ${a * x + b}`, x); };
G.e8_both = () => { const x = R(-8, 10), a = R(3, 9), c = choice(range(1, a - 1)), b = nz(-12, 12), d = a * x + b - c * x; return eqq("Unknown on both sides (step by step)", `${lin(a, b)} = ${lin(c, d)}`, x); };
G.e8_brk = () => { const x = R(-5, 10), a = R(2, 5), b = nz(-6, 6), c = nz(-9, 9), d = R(1, a + 3), e = a * (x + b) + c - d * x; if (d === a) return G.e8_brk(); return eqq("Equations with brackets (step by step)", `${a}(${lin(1, b)}) ${c > 0 ? "+" : "-"} ${Math.abs(c)} = ${lin(d, e)}`, x); };
G.e9_frac = () => { const x = R(-6, 15), a = R(2, 6); if (rnd() < 0.5) { const b = nz(-9, 9), c = R(-5, 10); const xx = a * c - b; return eqq("Equations with fractions (step by step)", `(${lin(1, b)})/${a} = ${c}`, xx); } const b = nz(-9, 9), k = R(-4, 8); return eqq("Equations with fractions (step by step)", `x/${a} ${b > 0 ? "+" : "-"} ${Math.abs(b)} = ${k + b}`, a * k); };
G.e9_neg = () => { const x = R(-8, 8), a = R(2, 7), b = R(1, 20); return eqq("Negative x term (step by step)", `${b} - ${a}x = ${b - a * x}`, x); };
G.e10_fracboth = () => { const x = R(-6, 8), a = R(1, 4), m = choice([2, 3, 4, 5]), c = R(1, 4), n = choice([2, 3, 4, 5].filter(v => v !== m)), k = R(-4, 6); const b = m * k - a * x, d = n * k - c * x; if (a * n === c * m) return G.e10_fracboth(); return eqq("Fractions on both sides (step by step)", `(${lin(a, b)})/${m} = (${lin(c, d)})/${n}`, x); };
// --- written column methods (竖式): q.column drives the digit-by-digit layout in column.js
const REMF = "e.g. 72 r 5";
const colq = (topic, op, a, b, o = {}) => { let q;
  if (op === "div") { const qq = Math.floor(a / b), r = a % b; q = r || o.rem ? Q(topic, `${cm(a)} ÷ ${b} = ?`, "rem", [qq, r], r ? `${qq} r ${r}` : String(qq), { fmt: r ? REMF : "", hint: "Divide, multiply, subtract, bring down." }) : Q(topic, `${cm(a)} ÷ ${b} = ?`, "num", qq, String(qq), { hint: "Divide, multiply, subtract, bring down." }); }
  else { const v = op === "add" ? a + b : op === "sub" ? a - b : a * b; q = Q(topic, `${cm(a)} ${{ add: "+", sub: "−", mul: "×" }[op]} ${b} = ?`, "num", v, String(v)); }
  q.column = { op, a, b, short: !!o.short }; return q; };
G.c3_add = () => { const a = R(105, 899), b = R(105, 999 - a + 400); return colq("Column addition (written)", "add", a, b); };
G.c3_sub = () => { const a = R(300, 999), b = R(105, a - 20); return colq("Column subtraction (written)", "sub", a, b); };
G.c4_mul1 = () => colq("Short multiplication (written)", "mul", R(102, 4999), R(3, 9));
G.c4_div1 = () => { const d = R(2, 9), q = R(12, 299); return colq("Division by 1 digit (written)", "div", d * q, d); };
G.c5_div1r = () => { const d = R(3, 9), q = R(21, 999), r = R(1, d - 1); return colq("Division with remainder (written)", "div", d * q + r, d, { rem: true }); };
G.c5_short = () => { const d = R(3, 9), q = R(102, 1999); return colq("Short division (bus stop)", "div", d * q, d, { short: true }); };
G.c5_mul2 = () => colq("Long multiplication (written)", "mul", R(102, 2999), R(12, 89));
G.c6_div2 = () => { const d = R(12, 49), q = R(21, 299); return colq("Long division by 2 digits (written)", "div", d * q, d); };
G.c6_div2r = () => { const d = R(12, 49), q = R(21, 199), r = R(1, d - 1); return colq("Long division with remainder (written)", "div", d * q + r, d, { rem: true }); };
G.a4_divrem = () => { const d = R(3, 9), q = R(4, 30), r = R(1, d - 1); return Q("Division with remainder", `${d * q + r} ÷ ${d} = ?`, "rem", [q, r], `${q} r ${r}`, { fmt: REMF, hint: `How many ${d}s fit? What is left?` }); };
const COLUMN_GENS = ["c3_add", "c3_sub", "c4_mul1", "c4_div1", "c5_div1r", "c5_short", "c5_mul2", "c6_div2", "c6_div2r"];
const STEP_GENS = ["s5_order", "s6_order", "s7_order", "s8_powers", "s8_fracorder", "e7_two", "e8_both", "e8_brk", "e9_frac", "e9_neg", "e10_fracboth"];

// ================================================================ REGISTRY
const STRANDS = [["N", "Number & place value"], ["C", "Calculation"], ["F", "Fractions, decimals & %"], ["M", "Measurement"], ["G", "Geometry"], ["A", "Algebra & ratio"], ["S", "Statistics & probability"]];
const STRAND_NAME = Object.fromEntries(STRANDS);
const CORE = ["N", "C", "F", "M", "G"];
const YEARS = {}; for (let y = 1; y <= 11; y++) YEARS[y] = [];
const STRAND = {}, YEAR_OF = {};
const YEAR_LABEL = {}; for (let y = 1; y <= 9; y++) YEAR_LABEL[y] = `Year ${y}`; YEAR_LABEL[10] = "Year 10 (GCSE)"; YEAR_LABEL[11] = "Year 11 (GCSE Higher)";
function reg(year, strand, names) { for (const n of names.split(" ")) { if (!G[n]) throw new Error("missing " + n); YEARS[year].push(n); STRAND[n] = strand; YEAR_OF[n] = year; } }
const REG = `1N y1_count y1_compare y1_skip|1C y1_addsub20 y1_bonds y1_double|1F y1_half|1M y1_coins y1_days|1G y1_shapes
|2N y2_place y2_compare|2C y2_addsub y2_times|2F y2_frac|2M y2_money y2_time|2G y2_3d|2S y2_picto
|3N y3_place|3C y3_addsub y3_times y3_mult|3F y3_frac|3M y3_perim y3_time y3_money|3G y3_turns|3S y3_bar
|4N y4_round y4_roman y4_neg|4C y4_addsub y4_tables y4_mult|4F y4_dec y4_frac|4M y4_area y4_convert|4G y4_coords|4S y4_table
|5N y5_round y5_factors y5_sqcube y5_roman y5_negative|5C y5_addsub y5_mult y5_div|5F y5_frac_equiv y5_frac_add y5_frac_of y5_frac_times y5_decimal y5_percent|5M y5_area y5_time y5_convert|5G y5_angles
|6N y6_lcm y6_negcalc|6C y6_bidmas y6_longdiv|6F y6_fracmul y6_fracadd y6_percent y6_decmul|6M y6_area y6_miles|6G y6_angles|6A y6_ratio y6_algebra|6S y6_mean
|7N y7_hcf|7C y7_neg|7F y7_fracdiv y7_pct|7M y7_trap|7G y7_iso|7A y7_eq y7_sub y7_simplify y7_ratio|7S y7_stats
|8N y8_indices y8_stdform|8F y8_pctchange|8M y8_prism y8_sdt|8G y8_circle y8_polygon|8A y8_brackets y8_share y8_seq|8S y8_prob
|9C y9_stdcalc|9F y9_compound|9M y9_cyl|9G y9_pyth|9A y9_expand2 y9_ineq y9_gradient y9_factor1|9S y9_prob2
|10C g_stdform|10F g_percent|10M g_volume|10G g_pyth g_trig g_circle|10A g_linear g_expand g_factorise g_ratio g_line g_seq|10S g_stats
|11N g_indices g_surds|11F g_recurring|11M g_bounds|11A g_quad_solve g_quad_formula g_simul g_proportion|11S g_prob`;
const REG2 = `1C a1_add10 a1_sub10 a1_add20|2C a2_add21 a2_tens a2_div|3C a3_coladd a3_colsub a3_mul21 a3_divfacts a3_missing
|4C a4_coladd4 a4_mul31 a4_mul10 a4_shortdiv|4F a4_dec1|5C a5_longmul a5_shortdiv4 a5_sqcalc s5_order|5F a5_decadd a5_pow10dec a5_fracsame a5_mixed
|6C a6_longdiv a6_longmul4 s6_order|6F a6_decmul a6_fracunlike a6_fracwhole a6_pctof|7C a7_negall a7_clever s7_order|7F a7_decdec a7_mixedmul|7A e7_two
|8C a8_powers s8_powers|8N a8_idxnum|8F a8_ratneg s8_fracorder|8A a8_expand1 a8_collect e8_both e8_brk|9C a9_sqrt|9A a9_idxalg a9_expandsq e9_frac e9_neg
|3C c3_add c3_sub|4C c4_mul1 c4_div1 a4_divrem|5C c5_div1r c5_short c5_mul2|6C c6_div2 c6_div2r
|10N a10_fracidx|10A a10_expand2 e10_fracboth`;
for (const part of (REG + "|" + REG2).replace(/\n/g, "").split("|")) { const m = part.trim().match(/^(\d+)([A-Z]) (.+)$/); reg(+m[1], m[2], m[3].trim()); }
// Pure calculation (no words): new types plus older ones that are bare calculations. Target share in Practice: PURE_SHARE.
const PURE = new Set(Object.keys(G).filter(g => /^(a\d|s\d|e\d|c\d)/.test(g) && YEAR_OF[g]).concat(("y1_bonds y1_double y2_times y3_times y3_frac y4_addsub y4_tables y4_dec y5_sqcube y5_frac_times y5_percent " +
  "y6_bidmas y6_longdiv y6_fracmul y6_fracadd y6_decmul y6_negcalc y7_neg y7_fracdiv y7_eq y7_simplify y8_indices y8_stdform y8_brackets y9_expand2 y9_factor1 " +
  "g_surds g_linear g_expand g_factorise g_quad_solve g_simul").split(" ")));
const PURE_SHARE = 0.68;
const isPure = g => PURE.has(g);
function purify(pool) { const p = pool.filter(isPure), o = pool.filter(g => !isPure(g)); if (!p.length || !o.length) return pool; return Math.random() < PURE_SHARE ? p : o; }
// Arithmetic sets: pure types from the learner's year (60%), the year below (25%), two below (15%).
function purePool(year) { const r = Math.random(), y = r < 0.6 ? year : r < 0.85 ? year - 1 : year - 2; let p = gensFor(Math.max(1, Math.min(11, y))).filter(isPure); if (!p.length) p = gensFor(year).filter(isPure); if (!p.length) for (let k = year; k >= 1 && !p.length; k--) p = gensFor(k).filter(isPure); return p; }
// Step-by-step: step types up to the learner's year (at least the first one), newest more often.
// Column methods: types up to the learner's year (at least Year 4); division twice as often (the weakest area).
function columnPool(year) { const ok = COLUMN_GENS.filter(g => YEAR_OF[g] <= Math.max(year, 4)); return ok.concat(ok.filter(g => /div/.test(g))); }
function stepPool(year) { const ok = STEP_GENS.filter(g => YEAR_OF[g] <= Math.max(year, 5)); return ok.length ? ok : [STEP_GENS[0]]; }

const strandYears = s => range(1, 11).filter(y => YEARS[y].some(g => STRAND[g] === s));
const gensFor = (y, s) => YEARS[y].filter(g => !s || STRAND[g] === s);

// ================================================================ LEARNER LOGIC
const LEVEL_NAMES = ["Rookie", "Explorer", "Adventurer", "Pathfinder", "Ranger", "Captain", "Champion", "Master", "Grandmaster", "Legend"];
const CHEERS = ["Brilliant! 🎉", "Spot on! ⭐", "Nailed it! 💪", "Superb! 🚀", "Genius move! 🧠", "Yes! Keep going! 🔥", "Perfect! ✅"];
const COMFORT = ["Not quite — mistakes are how brains grow. 🌱", "Close call! Have a look at the working. 🔍", "Good try! A bonus mission on this is coming. 🎯", "No worries — let's learn this one. 💡"];
const PL_MAX = 6;
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const stamp = () => { const d = new Date(); return `${today()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

function newState() { return { xp: 0, streak: 0, best_streak: 0, count: 0, correct: 0, topics: {}, review: [], wrong: [], badges: [], day: "", today: 0, levels: {}, placed: "", placement: null }; }
function fixState(st) { st = Object.assign(newState(), st || {}); st.review = st.review.filter(r => G[r.gen]); return st; }

function weightedChoice(st, pool, mistakes) {
  const w = pool.map(g => {
    const s = st.topics[g];
    if (mistakes) return !s ? 0.05 : (1 - (s.c + 1) / (s.a + 2)) ** 2 + 0.02;
    if (!s) return 1.5;
    const rec = (s.last || []).slice(-5), acc = (sum(rec) + 1) / (rec.length + 2);
    return 0.25 + 2 * (1 - acc);
  });
  let r = Math.random() * sum(w);
  for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) return pool[i]; }
  return pool[pool.length - 1];
}
function planPool(st, school) {
  const lv = st.levels || {}, r = Math.random();
  if (!Object.keys(lv).length) {
    if (r < 0.75) return [gensFor(school), "plan"];
    if (r < 0.9 && school > 1) return [gensFor(school - 1), "review"];
    return [gensFor(Math.min(school + 1, 11)), "challenge"];
  }
  const gaps = Object.keys(lv).filter(s => strandYears(s).some(y => lv[s] < y && y <= school));
  if (r < 0.6 || (r < 0.9 && !gaps.length)) return [gensFor(school), "plan"];
  if (r < 0.9) { const s = choice(gaps), y = Math.min(...strandYears(s).filter(y => lv[s] < y && y <= school)); return [gensFor(y, s), "gap"]; }
  return [gensFor(Math.min(school + 1, 11)), "challenge"];
}
function pick(st, school, mode, yearSel) {
  const n = st.count, due = st.review.filter(r => r.due <= n);
  if (mode === "mistakes") {
    if (st.review.length) { const r = st.review.slice().sort((a, b) => a.due - b.due)[0]; st.review.splice(st.review.indexOf(r), 1); return [r.gen, "review"]; }
    const tried = Object.keys(st.topics).filter(g => G[g]);
    return [weightedChoice(st, tried.length ? tried : gensFor(school), true), "mistakes"];
  }
  if (due.length && Math.random() < 0.8 && mode !== "steps" && mode !== "column" && (mode !== "pure" || isPure(due[0].gen))) { const r = due[0]; st.review.splice(st.review.indexOf(r), 1); return [r.gen, "review"]; }
  if (mode === "pure") return [weightedChoice(st, purePool(yearSel || school)), "set"];
  if (mode === "column") return [weightedChoice(st, columnPool(yearSel || school)), "column"];
  if (mode === "steps") return [weightedChoice(st, stepPool(yearSel || school)), "steps"];
  if (yearSel) return [weightedChoice(st, purify(gensFor(yearSel))), "year"];
  const [pool, why] = planPool(st, school);
  return [weightedChoice(st, purify(pool)), why];
}
function stars(s) { if (!s || !s.a) return 0; const last = (s.last || []).slice(-5); if (s.a >= 5 && sum(last) >= 4) return 3; return s.c / s.a >= 0.6 ? 2 : 1; }
function overall(levels) { const v = CORE.filter(s => s in levels).map(s => levels[s]).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : null; }
function summary(L, st, goal) {
  const lvl = Math.floor(st.xp / 100);
  return { name: L.name, year: L.year, year_label: YEAR_LABEL[L.year], xp: st.xp, level: lvl + 1, title: LEVEL_NAMES[Math.min(lvl, LEVEL_NAMES.length - 1)], xp_in_level: st.xp % 100, streak: st.streak, best_streak: st.best_streak, today: st.day === today() ? st.today : 0, goal, count: st.count, correct: st.correct, review_left: st.review.length, levels: st.levels || {}, overall: overall(st.levels || {}), placed: st.placed || "", placement_active: !!st.placement };
}
function placementInit(school) {
  const pl = { order: STRANDS.map(s => s[0]), turn: 0, strands: {} };
  for (const [s] of STRANDS) { const ys = strandYears(s), below = ys.map((y, i) => [y, i]).filter(([y]) => y <= Math.max(1, school - 2)); pl.strands[s] = { ys, lo: -1, hi: ys.length, cur: below.length ? below[below.length - 1][1] : 0, retry: false, asked: 0, done: false }; }
  return pl;
}
function placementNextStrand(pl) { const o = pl.order; for (let k = 0; k < o.length; k++) { const s = o[(pl.turn + k) % o.length]; if (!pl.strands[s].done) { pl.turn = (pl.turn + k) % o.length; return s; } } return null; }
function placementUpdate(pl, s, ok) {
  const S = pl.strands[s]; S.asked++;
  if (ok) { S.lo = S.cur; S.retry = false; } else if (!S.retry) S.retry = true; else { S.hi = S.cur; S.retry = false; }
  if (!S.retry) { if (S.hi - S.lo <= 1 || S.asked >= PL_MAX) S.done = true; else S.cur = Math.floor((S.lo + S.hi) / 2); pl.turn++; }
  else if (S.asked >= PL_MAX) S.done = true;
}
function placementResult(pl) { const o = {}; for (const s in pl.strands) { const S = pl.strands[s]; o[s] = S.lo >= 0 ? S.ys[S.lo] : S.ys[0] - 1; } return o; }
function placementProgress(pl) { const v = Object.values(pl.strands); return { strands_done: v.filter(S => S.done).length, strands: v.length, asked: sum(v.map(S => S.asked)) }; }
function strandRows(st) { return STRANDS.map(([c, n]) => ({ code: c, name: n, level: (st.levels || {})[c], min: Math.min(...strandYears(c)) })); }

// Session: one learner L = {name, year}, state st (mutated), goal
function nextQuestion(L, st, goal, mode, yearSel) {
  let gen, why, extra = {};
  if (mode === "placement") {
    if (!st.placement) st.placement = placementInit(L.year);
    const s = placementNextStrand(st.placement);
    if (s == null) {
      st.levels = placementResult(st.placement); st.placed = today(); st.placement = null;
      return { placement_done: true, summary: summary(L, st, goal), strands: strandRows(st) };
    }
    const S = st.placement.strands[s];
    gen = choice(gensFor(S.ys[S.cur], s)); why = "placement"; extra = { pl_strand: s, progress: placementProgress(st.placement) };
  } else [gen, why] = pick(st, L.year, mode, yearSel);
  const q = G[gen](); q.gen = gen; q.why = why; Object.assign(q, extra);
  q.year = YEAR_OF[gen]; q.strand = STRAND_NAME[STRAND[gen]]; q.emoji = q.emoji || "🧮"; if (why === "placement") q.hint = "";
  return q;
}
function makeQuestion(gen, why) {
  const q = G[gen](); q.gen = gen; q.why = why; q.year = YEAR_OF[gen]; q.strand = STRAND_NAME[STRAND[gen]]; q.emoji = q.emoji || "🧮";
  return q;
}
function answerQuestion(L, st, goal, q, ans, skipped) {
  const ok = !skipped && check(q, ans), pl = q.why === "placement", d = today();
  if (st.day !== d) { st.day = d; st.today = 0; }
  st.count++; st.today++;
  const ts = st.topics[q.gen] || (st.topics[q.gen] = { a: 0, c: 0, last: [] });
  ts.a++; ts.name = q.topic; ts.last = ts.last.concat([ok ? 1 : 0]).slice(-10);
  let gained = 0; const nb = [];
  if (ok) { st.correct++; ts.c++; st.streak++; st.best_streak = Math.max(st.best_streak, st.streak); gained = 10 + (q.why === "review" ? 5 : 0) + (q.why === "challenge" ? 5 : 0) + (st.streak % 3 === 0 ? 5 : 0); }
  else {
    st.streak = 0;
    if (!pl) { const n = st.count; st.review = st.review.filter(r => r.gen !== q.gen).concat([{ gen: q.gen, due: n + 2 }, { gen: q.gen, due: n + 6 }]); }
    st.wrong = st.wrong.concat([{ t: stamp(), topic: `Y${q.year} · ${q.topic}` + (pl ? " (placement)" : ""), q: q.text, yours: skipped ? "(skipped)" : ans, right: q.show }]).slice(-300);
  }
  if (pl && st.placement) placementUpdate(st.placement, q.pl_strand, ok);
  const oldL = Math.floor(st.xp / 100); st.xp += gained;
  const badge = (k, lab) => { if (!st.badges.includes(k)) { st.badges.push(k); nb.push(lab); } };
  for (const k of [5, 10, 20, 50]) if (st.streak >= k) badge(`streak${k}`, `🔥 ${k} in a row!`);
  if (st.today >= goal) badge(`goal-${d}`, "🏅 Daily goal reached!");
  for (const k of [50, 100, 250, 500, 1000]) if (st.correct >= k) badge(`correct${k}`, `🏆 ${k} correct answers!`);
  if (ok && stars(ts) === 3) badge(`master-${q.gen}`, `⭐⭐⭐ Mastered: ${q.topic}`);
  let msg = pl ? (ok ? "✔ Correct" : "✘ Not this time") : choice(ok ? CHEERS : COMFORT);
  if (Math.floor(st.xp / 100) > oldL) msg += `  LEVEL UP → ${LEVEL_NAMES[Math.min(Math.floor(st.xp / 100), LEVEL_NAMES.length - 1)]}!`;
  return { correct: ok, show: q.show, sol: q.sol, gained, msg, badges: nb, placement: pl, summary: summary(L, st, goal) };
}
function progress(L, st, goal) {
  const rows = [];
  for (let y = 1; y <= 11; y++) for (const g of YEARS[y]) { const s = st.topics[g]; if (y === L.year || (s && s.a)) rows.push({ year: y, strand: STRAND_NAME[STRAND[g]], topic: (s && s.name) || G[g]().topic, a: s ? s.a : 0, c: s ? s.c : 0, stars: stars(s) }); }
  return { topics: rows, wrong: st.wrong.slice(-40).reverse(), summary: summary(L, st, goal), strands: strandRows(st) };
}

const API = { isPure, PURE_SHARE, STEP_GENS, COLUMN_GENS, makeQuestion, STRAND_NAME, stars, G, YEARS, STRAND, YEAR_OF, YEAR_LABEL, STRANDS, check, parseNum, Fr, F, sfrac, newState, fixState, nextQuestion, answerQuestion, progress, summary, strandYears, gensFor, placementInit };
if (typeof module !== "undefined" && module.exports) module.exports = API; else root.MQ = API;
})(typeof window !== "undefined" ? window : globalThis);
