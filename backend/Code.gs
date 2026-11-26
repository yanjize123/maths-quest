/**
 * Maths Quest backend — Google Apps Script bound to a Google Sheet.
 *
 * Setup (once):
 *  1. Create a new Google Sheet (sheets.new). Extensions → Apps Script. Replace everything with this file. Save.
 *  2. Choose the function "setup" and click Run (allow the permissions). This creates the tabs and the two accounts.
 *  3. Deploy → New deployment → type "Web app". Execute as: Me. Who has access: Anyone. Deploy. Copy the URL ending in /exec.
 *
 * Tabs:
 *  Users    — one row per account. Change a password or school year by editing the cell. active = no blocks an account.
 *  Sessions — one row per login: login time, last activity, logout time, minutes, questions, correct, device.
 *  Answers  — one row per answer: time, user, session, mode, year, area, topic, question, answer, correct answer,
 *             correct (1/0), seconds taken, hint used.
 *  States   — saved progress per user (lets a learner continue on another device). Do not edit.
 *  Summary  — per user per day, and per user per topic (formulas).
 */

const HEADERS = {
  Users: ['user', 'password', 'year', 'active', 'note'],
  Sessions: ['session', 'user', 'login', 'last_activity', 'logout', 'minutes', 'questions', 'correct', 'device'],
  Answers: ['time', 'user', 'session', 'mode', 'year', 'area', 'topic', 'question', 'answer', 'correct_answer', 'correct', 'seconds', 'hint_used', 'type'],
  States: ['user', 'updated', 'state_json'],
};

function setup() {
  const ss = SpreadsheetApp.getActive();
  ss.setSpreadsheetTimeZone('Europe/London');
  Object.keys(HEADERS).forEach(name => {
    const sh = ss.getSheetByName(name) || ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.appendRow(HEADERS[name]);
      sh.getRange(1, 1, 1, HEADERS[name].length).setFontWeight('bold');
      sh.setFrozenRows(1);
    }
  });
  const users = ss.getSheetByName('Users');
  if (users.getLastRow() === 1) {
    users.appendRow(['Alicia Yan', 'math', 11, 'yes', 'year: 1–11 (10–11 = GCSE)']);
    users.appendRow(['Brenda Yan', 'math', 5, 'yes', '']);
  }
  ss.getSheetByName('Sessions').getRange('C:E').setNumberFormat('yyyy-mm-dd hh:mm:ss');
  ss.getSheetByName('Answers').getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm:ss');
  let sum = ss.getSheetByName('Summary') || ss.insertSheet('Summary');
  sum.clear();
  sum.getRange('A1').setValue('Per user per day').setFontWeight('bold');
  sum.getRange('A2').setFormula('=IFERROR(QUERY(Answers!A:N,"select B, toDate(A), count(K), sum(K), sum(L)/60 where B is not null group by B, toDate(A) order by toDate(A) desc, B label toDate(A) \'date\', count(K) \'questions\', sum(K) \'correct\', sum(L)/60 \'minutes on questions\'",1),"no answers yet")');
  sum.getRange('H1').setValue('Per user per topic').setFontWeight('bold');
  sum.getRange('H2').setFormula('=IFERROR(QUERY(Answers!A:N,"select B, E, F, G, count(K), avg(K), avg(L) where B is not null and D <> \'placement\' group by B, E, F, G order by B, E, avg(K) label count(K) \'questions\', avg(K) \'accuracy\', avg(L) \'avg seconds\'",1),"no answers yet")');
  const def = ss.getSheetByName('Sheet1'); if (def && def.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(def);
}

function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function doGet() { return json({ ok: true, app: 'Maths Quest backend' }); }

function auth(ss, user, pass) {
  const rows = ss.getSheetByName('Users').getDataRange().getValues();
  const u = String(user || '').trim().toLowerCase();
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (String(r[0]).trim().toLowerCase() === u && String(r[1]) === String(pass) && String(r[3]).toLowerCase() !== 'no') {
      return { name: String(r[0]).trim(), year: Math.max(1, Math.min(11, parseInt(r[2], 10) || 5)) };
    }
  }
  return null;
}

function findRow(sh, key) {
  const n = sh.getLastRow(); if (n < 2) return 0;
  const start = Math.max(2, n - 2000);
  const vals = sh.getRange(start, 1, n - start + 1, 1).getValues();
  for (let i = vals.length - 1; i >= 0; i--) if (String(vals[i][0]) === key) return start + i;
  return 0;
}

function saveState(ss, user, state) {
  if (!state) return;
  let s = JSON.stringify(state);
  if (s.length > 45000) { state.wrong = []; s = JSON.stringify(state); }
  if (s.length > 49000) return;
  const sh = ss.getSheetByName('States');
  const row = findRow(sh, user);
  if (row) sh.getRange(row, 2, 1, 2).setValues([[new Date(), s]]);
  else sh.appendRow([user, new Date(), s]);
}

function loadState(ss, user) {
  const sh = ss.getSheetByName('States');
  const row = findRow(sh, user);
  if (!row) return null;
  try { return JSON.parse(sh.getRange(row, 3).getValue()); } catch (e) { return null; }
}

function touchSession(ss, sid, addQ, addC, logout) {
  const sh = ss.getSheetByName('Sessions');
  const row = findRow(sh, sid); if (!row) return;
  const now = new Date();
  const r = sh.getRange(row, 1, 1, 9).getValues()[0];
  const login = r[2] instanceof Date ? r[2] : now;
  sh.getRange(row, 4, 1, 5).setValues([[now, logout ? now : r[4], Math.round((now - login) / 600) / 100, (Number(r[6]) || 0) + addQ, (Number(r[7]) || 0) + addC]]);
}

function writeEvents(ss, u, ev) {
  ev = Array.isArray(ev) ? ev : [];
  if (!ev.length) return 0;
  const rows = ev.map(x => [new Date(x.time), u.name, x.session || '', x.mode || '', x.year || '', x.area || '', x.topic || '', String(x.question || '').slice(0, 500),
    String(x.answer || '').slice(0, 200), String(x.correct_answer || '').slice(0, 200), x.correct ? 1 : 0, Number(x.seconds) || 0, x.hint ? 1 : 0, x.type || '']);
  const sh = ss.getSheetByName('Answers');
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  const by = {};
  ev.forEach(x => { const k = x.session || ''; by[k] = by[k] || [0, 0]; by[k][0]++; by[k][1] += x.correct ? 1 : 0; });
  Object.keys(by).forEach(k => k && touchSession(ss, k, by[k][0], by[k][1], false));
  return ev.length;
}

function doPost(e) {
  let b;
  try { b = JSON.parse(e.postData.contents); } catch (err) { return json({ ok: false, err: 'bad request' }); }
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = SpreadsheetApp.getActive();
    const u = auth(ss, b.user, b.pass);
    if (!u) return json({ ok: false, err: 'Wrong name or password' });
    if (b.action === 'login') {
      const sid = Utilities.getUuid().slice(0, 8);
      const now = new Date();
      ss.getSheetByName('Sessions').appendRow([sid, u.name, now, now, '', 0, 0, 0, String(b.device || '').slice(0, 120)]);
      return json({ ok: true, name: u.name, year: u.year, session: sid, state: loadState(ss, u.name) });
    }
    if (b.action === 'log') {
      const n = writeEvents(ss, u, b.events);
      saveState(ss, u.name, b.state);
      return json({ ok: true, saved: n });
    }
    if (b.action === 'logout') {
      writeEvents(ss, u, b.events);
      if (b.session) touchSession(ss, b.session, 0, 0, true);
      saveState(ss, u.name, b.state);
      return json({ ok: true });
    }
    return json({ ok: false, err: 'unknown action' });
  } finally {
    lock.releaseLock();
  }
}
