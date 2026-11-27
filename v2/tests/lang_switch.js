// lang_switch.js — R15 检查：中英切换是同一份内容换语言（node + 本机 Chrome + puppeteer-core，无参数，约 20 秒）。P-20261126-maths-game 迁移第 2 步。
// 做法：起本地服务 → 游客进店 → 依次到 早上、订单、场景事件（答题前、答题后）、打怪（选武器后出题）、事件结算 各画面；
// 每个画面：记下 {ST, T} 与面板 HTML → 点切换语言 → {ST, T} 必须完全相同 → 再切回 → 面板 HTML 必须与原来逐字相同。
// 依赖：puppeteer-core（找不到时试 /home/claude/tools/node_modules）、Chrome（CHROME 环境变量或 /usr/bin/google-chrome）。
const path = require('path'), { spawn } = require('child_process');
let pp; try { pp = require('puppeteer-core'); } catch (e) { pp = require('/home/claude/tools/node_modules/puppeteer-core'); }
const ROOT = path.join(__dirname, '..', '..'), PORT = 8700 + Math.floor(Date.now() % 200);
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: ROOT, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 800));
  const br = await pp.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--headless=new'] });
  let fail = 0; const log = [];
  try {
    const pg = await br.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.goto(`http://localhost:${PORT}/v2/index.html?lang=zh`, { waitUntil: 'networkidle0' });
    await pg.evaluate(() => localStorage.clear()); await pg.click('#ll'); await pg.waitForSelector('#game:not(.hide)'); await new Promise(r => setTimeout(r, 300));
    const snap = () => pg.evaluate(() => ({ st: JSON.stringify({ ST, T }), html: document.getElementById('panel').innerHTML, lang: LANG }));
    async function check(name) {
      const a = await snap(); await pg.click('#lang2'); await new Promise(r => setTimeout(r, 150));
      const b = await snap(); await pg.click('#lang2'); await new Promise(r => setTimeout(r, 150));
      const c = await snap();
      const okState = a.st === b.st && b.st === c.st, okHtml = a.html === c.html, changed = a.html !== b.html;
      if (!okState || !okHtml || !changed) fail++;
      log.push(`${okState && okHtml && changed ? 'PASS' : 'FAIL'} ${name}: 状态不变 ${okState}，切回后面板逐字相同 ${okHtml}，切换后文字确实换了 ${changed}`);
      if (!okHtml) { for (let i = 0; i < a.html.length; i++) if (a.html[i] !== c.html[i]) { log.push('  面板首个不同处：' + a.html.slice(Math.max(0, i - 60), i + 60) + ' ‖ ' + c.html.slice(Math.max(0, i - 60), i + 60)); break; } }
      if (!okState) { for (let i = 0; i < a.st.length; i++) if (a.st[i] !== b.st[i]) { log.push('  首个不同处：' + a.st.slice(Math.max(0, i - 80), i + 80)); break; } }
    }
    await pg.evaluate(() => { const i0 = MQEngine.instantiate; MQEngine.instantiate = (...a) => (window.__lastQ = i0(...a)); });
    // 走一步：有 #ans2（纯算式）填 T.cur.ans；有 #ans（文字题）填 __lastQ.correct；答完点“继续”
    const answer = () => pg.evaluate(() => { const a2 = document.getElementById('ans2'), a1 = document.getElementById('ans');
      if (a2 && !a2.disabled) { a2.value = String(T.cur.ans); document.getElementById('ok2').click(); return 'ans2'; }
      if (a1 && !a1.disabled) { a1.value = String(window.__lastQ.correct); document.getElementById('ok').click(); return 'ans'; } return null; });
    const next = () => pg.evaluate(() => { const b = document.getElementById('nx3') || document.getElementById('nx') || document.getElementById('open'); if (b) { b.click(); return b.id; } return null; });
    await pg.evaluate(() => { ST.gap = 99; ST.since = 0; T.trips = 9; });   // 本测试只查画面，先不让导演插节拍（节拍画面在下面单独查）
    for (let k = 0; k < 6 && (await pg.evaluate(() => T.phase === 'morning')); k++) {
      const st = await pg.evaluate(() => T.am ? T.am.stage : '?'); await check('早上 ' + st + ' 答题前');
      const how = await answer(); if (how === 'ans2') await check('早上 ' + st + ' 答题后'); if (!(await next())) break;
    }
    await pg.evaluate(() => { ST.gap = 99; ST.since = 0; ST.stock = 999; MQShop.fruitsToday().forEach(f => MQShop.add(f, 999)); ['flour', 'egg', 'cream'].forEach(f => MQShop.add(f, 99)); T.trips = 9; if (T.phase !== 'open') serveNext(); else MQShop.serve(); });
    for (const st of ['make', 'drill']) {
      if (!(await pg.evaluate(() => document.getElementById('ans2')))) { log.push('跳过订单 ' + st); continue; }
      await check('订单 ' + st + ' 答题前'); await answer(); await check('订单 ' + st + ' 答题后'); await next();
    }
    if (await pg.evaluate(() => !!document.getElementById('ans'))) await check('订单 收钱');
    // 每类事件各挑一个强制出场，答题前、答第一题后、结算后各查一次
    const ids = await pg.evaluate(() => { const by = {}; MQEv.data().events.filter(e => !e.needs && !e.needsItem && !e.needsPantry).forEach(e => { by[e.cat] = by[e.cat] || e.id; }); return Object.values(by); });
    for (const id of ids) {
      await pg.evaluate(id => { const e = MQEv.data().events.find(x => x.id === id); T.inBeat = true; const sev = { e, v: MQEv.vars(e), seed: MQRng.int(0, 1e9), done: false }; MQEv.cakeVars(sev); T.sev = sev; MQEv.run(); }, id);
      const cur = await pg.evaluate(() => T.sev && T.sev.e.id); if (cur !== id) { log.push('跳过 ' + id); continue; }
      await check(`事件 ${id} 答题前`);
      const hasQ = await pg.evaluate(() => !!document.getElementById('ans2'));
      if (hasQ) {
        await pg.evaluate(() => { const b = T.sev.bound[T.sev.i]; document.getElementById('ans2').value = b.q ? b.q.show : String(b.ans); document.getElementById('ok2').click(); });
        await check(`事件 ${id} 答题后`);
        await pg.evaluate(() => { let n = 0; while (document.getElementById('nx3') && n++ < 20) { document.getElementById('nx3').click(); const a = document.getElementById('ans2'); if (a && !a.disabled) { const b = T.sev.bound[T.sev.i]; a.value = b.q ? b.q.show : String(b.ans); document.getElementById('ok2').click(); } } const nob = document.getElementById('nob'); if (nob) nob.click(); });
        if (await pg.evaluate(() => !!(T.sev && T.sev.end))) await check(`事件 ${id} 结算`);
      }
      await pg.evaluate(() => { T.sev.done = true; T.inBeat = false; });
    }
    // 打怪
    await pg.evaluate(() => { T.inBeat = true; T.monster = { idx: pickMonster() }; T.monsterDone = false; battleIntro(); });
    await check('怪兽来了（选武器）');
    await pg.evaluate(() => { document.querySelector('[data-w]').click(); document.querySelector('[data-t="easy"]').click(); document.getElementById('fg').click(); });
    await check('打怪出题');
    await pg.evaluate(() => { document.getElementById('ans2').value = T.monster.q.q.show; document.getElementById('ok2').click(); });
    await check('打怪答对后');
    // 重载存档：刷新页面后接着同一画面
    const before = await pg.evaluate(() => JSON.stringify(T.monster.q && T.monster.q.q.text));
    await pg.reload({ waitUntil: 'networkidle0' }); await pg.click('#ll'); await pg.waitForSelector('#game:not(.hide)'); await new Promise(r => setTimeout(r, 300));
    const after = await pg.evaluate(() => JSON.stringify(T.monster && T.monster.q && T.monster.q.q.text));
    const okR = before === after; if (!okR) fail++; log.push(`${okR ? 'PASS' : 'FAIL'} 刷新页面后接着同一道打怪题：${okR}`);
    if (errs.length) { fail++; log.push('页面报错：' + errs.slice(0, 3).join(' | ')); }
  } catch (e) { fail++; log.push('异常 ' + e.message); }
  await br.close(); srv.kill();
  console.log(log.join('\n')); console.log(fail ? `R15 失败 ${fail} 项` : `R15 全部通过（${log.length} 项）`);
  process.exit(fail ? 1 : 0);
})();
