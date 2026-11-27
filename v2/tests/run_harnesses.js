// run_harnesses.js — 无头 Chrome 跑浏览器检查页（event / pacing / monkey），读页面标题里的 PASS/FAIL（node，无参数，约 1–2 分钟）。
const path = require('path'), { spawn } = require('child_process');
let pp; try { pp = require('puppeteer-core'); } catch (e) { pp = require('/home/claude/tools/node_modules/puppeteer-core'); }
const ROOT = path.join(__dirname, '..', '..'), PORT = 8500 + Math.floor(Date.now() % 200), EVS = JSON.parse(require('fs').readFileSync(path.join(__dirname, '..', 'content', 'events.json'), 'utf8')).events.map(e => e.id);
const PAGES = process.env.QUICK ? ['pacing_harness.html'] : [...EVS.map(id => 'event_harness.html?ev=' + id), 'pacing_harness.html', 'monkey_harness.html'];
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: ROOT, stdio: 'ignore' }); await new Promise(r => setTimeout(r, 800));
  const br = await pp.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--headless=new'] }); let fail = 0;
  for (const h of PAGES) {
    const pg = await br.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.goto(`http://localhost:${PORT}/v2/tests/${h}`, { waitUntil: 'load' });
    let t = ''; for (let i = 0; i < 360 && !/^(PASS|FAIL)/.test(t); i++) { await new Promise(r => setTimeout(r, 250)); t = await pg.title(); }
    if (!/^PASS/.test(t)) fail++; if (!/^PASS/.test(t) || !h.startsWith('event')) console.log(`${h}: ${t || '超时'}${errs.length ? '  页面报错：' + errs.slice(0, 2).join(' | ') : ''}`); await pg.close();
  }
  console.log(fail ? `失败 ${fail} 页` : `全部通过（${PAGES.length} 页）`); await br.close(); srv.kill(); process.exit(fail ? 1 : 0);
})();
