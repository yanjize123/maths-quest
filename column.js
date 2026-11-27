/* Maths Quest — written column methods (竖式), digit by digit. Version 1 (2026-11-27).
   Layouts for column + and −, short and long ×, short and long ÷ (with or without remainder).
   One layout fits both the Chinese 竖式 and the English formal methods: for long multiplication the
   placeholder 0 is optional (English writes it, Chinese leaves it out); leading zeros in working rows
   are optional; carry digits are scratch cells and are never marked.
   Each cell has an expected digit; rows are checked in the order a child works, and the first wrong
   row gets a named reason (quotient digit too big / too small, multiplied wrongly, subtracted wrongly,
   forgot to bring down, carry forgotten, ...). Runs in the browser (window.MQC) and in Node. */
(function (root) {
"use strict";
const ds = n => String(n).split("").map(Number);

// cell: {c: column, e: expected digit or "" , opt: blank allowed}
// row:  {id, kind, label, cells, dir: "rtl" | "ltr", given?: true, text?, sign?}
function rowNum(id, kind, n, endCol, o = {}) {
  const s = String(n), cells = s.split("").map((d, i) => ({ c: endCol - (s.length - 1) + i, e: d }));
  if (o.optLead && s.length > 1 && s[0] === "0") cells[0].opt = true;
  return Object.assign({ id, kind, cells, dir: o.dir || "rtl" }, o.extra || {});
}
function given(id, n, endCol, sign) { const s = String(n); return { id, kind: "given", given: true, sign, cells: s.split("").map((d, i) => ({ c: endCol - (s.length - 1) + i, e: d })) }; }

function addLayout(a, b) {
  const s = a + b, W = String(s).length + 1, end = W - 1;
  return { op: "add", a, b, W, value: s, rows: [given("a", a, end), given("b", b, end, "+"), { id: "carry", kind: "carry", scratch: true, cells: carryCells(end, W) , dir: "rtl" }, rowNum("ans", "answer", s, end, { extra: { line: true } })] };
}
function subLayout(a, b) {
  const s = a - b, W = String(a).length + 1, end = W - 1;
  return { op: "sub", a, b, W, value: s, rows: [given("a", a, end), given("b", b, end, "−"), rowNum("ans", "answer", s, end, { extra: { line: true } })] };
}
function carryCells(end, W) { const c = []; for (let i = 1; i < W; i++) c.push({ c: i - 1, e: "", opt: true, scratch: true }); return c; }
function mulLayout(a, b) {
  const p = a * b, W = String(p).length + 1, end = W - 1, rows = [given("a", a, end), given("b", b, end, "×")];
  const bd = ds(b);
  if (bd.length === 1) { rows.push(rowNum("ans", "answer", p, end, { extra: { line: true } })); return { op: "mul", a, b, W, value: p, rows }; }
  // long multiplication: one partial product per digit of b (units first), then the sum
  bd.slice().reverse().forEach((d, k) => {
    const pp = a * d, r = rowNum(`p${k}`, "partial", pp, end - k, { extra: { line: k === 0, digit: d, place: k } });
    for (let z = 0; z < k; z++) r.cells.push({ c: end - z, e: "0", opt: true });   // placeholder zeros: optional
    r.cells.sort((x, y) => x.c - y.c); rows.push(r);
  });
  rows.push(rowNum("ans", "answer", p, end, { extra: { line: true } }));
  return { op: "mul", a, b, W, value: p, rows };
}
// Long (or short) division a ÷ d. Columns = digits of a. Quotient above, working below.
function divLayout(a, d, short) {
  const D = ds(a), n = D.length, q = Math.floor(a / d), r = a % d;
  const qcells = [], rows = [], steps = [];
  let cur = 0, started = false, curRow = null;
  for (let i = 0; i < n; i++) {
    cur = cur * 10 + D[i];
    if (!started && cur < d && i < n - 1) { qcells.push({ c: i, e: "0", opt: true, lead: true }); continue; }
    started = true;
    const qi = Math.floor(cur / d); qcells.push({ c: i, e: String(qi), step: steps.length });
    const st = { i, cur, qi, prod: qi * d, rem: cur - qi * d };
    if (!short) {
      if (qi > 0) {
        const pr = rowNum(`m${steps.length}`, "product", qi * d, i, { dir: "ltr", extra: { step: steps.length, sign: "−" } });
        rows.push(pr); st.prodRow = pr.id;
        const rem = cur - qi * d, brought = i < n - 1 ? rem * 10 + D[i + 1] : rem;
        const s = i < n - 1 ? (rem === 0 ? "0" : String(rem)) + D[i + 1] : String(rem);
        const rr = { id: `r${steps.length}`, kind: "remainder", dir: "ltr", line: true, step: steps.length, bring: i < n - 1, cells: s.split("").map((x, k) => ({ c: (i < n - 1 ? i + 1 : i) - (s.length - 1) + k, e: x })) };
        if (s.length > 1 && s[0] === "0") rr.cells[0].opt = true;
        rows.push(rr); curRow = rr; st.remRow = rr.id; st.value = brought;
      } else if (curRow && i < n - 1) {                // quotient digit 0: bring the next digit down onto the same row
        curRow.cells.push({ c: i + 1, e: String(D[i + 1]) }); st.extended = curRow.id;
      } else if (!curRow && i < n - 1) {               // 0 as first working step cannot happen (cur >= d); keep safe
      }
    }
    steps.push(st); cur = cur - qi * d;
  }
  rows.unshift({ id: "q", kind: "quotient", dir: "ltr", cells: qcells, top: true });
  if (short && r) rows.push({ id: "rem", kind: "remainderAnswer", dir: "ltr", cells: ds(r).map((x, k) => ({ c: k, e: String(x) })), label: "r" });
  if (!short && r && curRow) { /* the last working row already shows the remainder */ }
  return { op: "div", a, b: d, W: n, value: q, rem: r, short: !!short, rows, steps };
}
function layout(spec) {
  const { op, a, b } = spec;
  if (op === "add") return addLayout(a, b);
  if (op === "sub") return subLayout(a, b);
  if (op === "mul") return mulLayout(a, b);
  return divLayout(a, b, spec.short);
}

// ---------------------------------------------------------------- checking
const cellOk = (cell, v) => { v = (v || "").trim(); if (cell.scratch) return true; if (cell.opt && (v === "" || v === cell.e)) return true; return v === cell.e; };
const rowFilled = (row, vals) => row.cells.every((cell, k) => cell.opt || cell.scratch || (vals[k] || "").trim() !== "");
// order in which a child works: for division, quotient digit then its product and remainder rows
function workOrder(L) {
  if (L.op !== "div") return L.rows.filter(r => !r.given && !r.scratch).map(r => ({ row: r.id }));
  const out = []; const q = L.rows.find(r => r.id === "q");
  q.cells.forEach((cell, k) => {
    out.push({ row: "q", cell: k });
    if (cell.step != null) { const st = L.steps[cell.step]; if (st.prodRow) out.push({ row: st.prodRow }); if (st.remRow) out.push({ row: st.remRow }); if (st.extended) out.push({ row: st.extended, part: true }); }
  });
  if (L.rows.find(r => r.id === "rem")) out.push({ row: "rem" });
  return out;
}
// vals: {rowId: [string per cell]}. Returns {ok, done, first: {row, cells:[k...], reason, kind}, wrongCells:{rowId:[k]}}
function check(L, vals, partial) {
  const byId = Object.fromEntries(L.rows.map(r => [r.id, r]));
  const wrong = {}; let first = null;
  for (const w of workOrder(L)) {
    const row = byId[w.row], v = vals[w.row] || [];
    const ks = w.cell != null ? [w.cell] : row.cells.map((_, k) => k);
    if (partial && !ks.every(k => row.cells[k].opt || row.cells[k].scratch || (v[k] || "").trim() !== "")) break;
    const bad = ks.filter(k => !cellOk(row.cells[k], v[k]));
    if (bad.length) { (wrong[w.row] = wrong[w.row] || []).push(...bad); if (!first) first = { row: w.row, cells: bad, kind: row.kind, reason: reason(L, row, w, v) }; break; }
  }
  const allFilled = L.rows.filter(r => !r.given && !r.scratch).every(r => rowFilled(r, vals[r.id] || []));
  return { ok: !first, done: !first && allFilled, first, wrong };
}
const numOf = (row, v, ks) => { const s = ks.map(k => (v[k] || "").trim() || (row.cells[k].opt ? "" : "?")).join(""); return /^\d+$/.test(s) ? +s : null; };
function reason(L, row, w, v) {
  if (L.op === "div") {
    if (row.kind === "quotient") {
      const cell = row.cells[w.cell], got = +(v[w.cell] || "").trim();
      if (cell.lead) return { code: "q_lead", text: "Nothing goes here yet — the divisor doesn't go into this part. Leave it blank (or 0) and look at more digits." };
      const st = L.steps[cell.step];
      if ((v[w.cell] || "").trim() === "") return { code: "q_missing", text: "Write a digit in the answer above every digit you divide into (a 0 if it doesn't go)." };
      if (!/^\d$/.test((v[w.cell] || "").trim())) return { code: "format", text: "One digit in each box." };
      if (got > st.qi) return { code: "q_big", text: `Too big: ${got} × ${L.b} = ${got * L.b}, which is more than ${st.cur}. Try a smaller digit.` };
      return { code: "q_small", text: `Too small: ${st.cur} − ${got} × ${L.b} = ${st.cur - got * L.b}, still ${L.b} or more left. Try a bigger digit.` };
    }
    if (row.kind === "product") { const st = L.steps[row.step]; return { code: "mul_err", text: `Multiply the digit you wrote in the answer by ${L.b}: ${st.qi} × ${L.b}.` }; }
    if (row.kind === "remainder") {
      const st = L.steps[row.step], ks = row.cells.map((_, k) => k), got = numOf(row, v, ks);
      if (row.bring && got != null && Math.floor(got / 10) === st.rem && got % 10 !== st.value % 10) return { code: "bring_err", text: "Bring down the next digit of the number you are dividing." };
      if (row.bring && got === st.rem) return { code: "bring_missing", text: "Now bring down the next digit and write it next to what is left." };
      return { code: "sub_err", text: `Subtract: ${st.cur} − ${st.prod}${row.bring ? ", then bring down the next digit" : ""}.` };
    }
    if (row.kind === "remainderAnswer") return { code: "rem_err", text: `The remainder is what is left at the end; it must be less than ${L.b}.` };
  }
  if (L.op === "mul" && row.kind === "partial") return { code: "partial_err", text: `This row is ${L.a} × ${row.digit}${row.place ? ` (then shifted ${row.place} place${row.place > 1 ? "s" : ""} left — the 0 placeholder is optional)` : ""}. Remember to add the carried digits.` };
  if (L.op === "mul") { const ks = row.cells.map((_, k) => k), got = numOf(row, v, ks); if (row.kind === "answer" && L.rows.some(r => r.kind === "partial")) return { code: "add_err", text: "Add the rows, column by column from the right, carrying when a column makes 10 or more." }; if (got != null && got < L.value && got % 10 === L.value % 10) return { code: "carry_missing", text: "Check the carried digits." }; return { code: "mul_err", text: "Multiply each digit from the right; carry the tens." }; }
  if (L.op === "add") { const got = numOf(row, v, row.cells.map((_, k) => k)); if (got != null && noCarrySum(L.a, L.b) === got) return { code: "carry_missing", text: "When a column makes 10 or more, write the ones and carry the ten to the next column." }; return { code: "add_err", text: "Add each column from the right." }; }
  if (L.op === "sub") { const got = numOf(row, v, row.cells.map((_, k) => k)); if (got != null && got === smallFromBig(L.a, L.b)) return { code: "small_from_big", text: "When the top digit is smaller, exchange 1 from the next column — don't take the smaller digit from the bigger one." }; return { code: "sub_err", text: "Subtract each column from the right; exchange when the top digit is smaller." }; }
  return { code: "err", text: "Check this row." };
}
function noCarrySum(a, b) { const A = ds(a).reverse(), B = ds(b).reverse(); let s = ""; for (let i = 0; i < Math.max(A.length, B.length); i++) s = ((A[i] || 0) + (B[i] || 0)) % 10 + s; return +s; }
function smallFromBig(a, b) { const A = ds(a).reverse(), B = ds(b).reverse(); let s = ""; for (let i = 0; i < A.length; i++) s = Math.abs((A[i] || 0) - (B[i] || 0)) + s; return +s; }
function solution(L) { const vals = {}; for (const r of L.rows) if (!r.given) vals[r.id] = r.cells.map(c => (c.opt && c.lead ? "" : c.e)); return vals; }

const API = { layout, check, solution, workOrder };
if (typeof module !== "undefined" && module.exports) module.exports = API; else root.MQC = API;
})(typeof window !== "undefined" ? window : globalThis);
