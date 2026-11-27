// rng.js — 唯一的随机来源 v1（2026-11-27，P-20261126-maths-game 迁移第 2 步，script_framework_v2.md §A）。
// 每次取数 = hash(存档种子 ST.seed, 天 ST.day, 计数 ST.rc)；计数随存档保存，所以同一存档重放得到同样的一天；切换语言、重画画面不取数，内容就不会变。
// 规则：其他文件不得出现 Math.random（check_requirements R16 守住）；随机只在“进入一步”时取一次并存进 ST/T，画面只读。
// 旧的 ../engine.js（v1 页面共用，不改）内部用 Math.random：用 MQRng.with(fn) 包起来，临时换成本存档的数。
(function (root) {
  const RNG_VERSION = 1;
  const G = () => (typeof ST !== 'undefined' && ST) ? ST : (root.__mqST = root.__mqST || {});
  function mix(a, b, c) {   // 三个 32 位整数 → 一个 [0,1) 数（mulberry32 一步）
    let t = (a ^ Math.imul(b | 0, 0x9E3779B1) ^ Math.imul(c | 0, 0x85EBCA77)) + 0x6D2B79F5 | 0;
    t = Math.imul(t ^ t >>> 15, 1 | t); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  function newSeed() { try { const a = new Uint32Array(1); (root.crypto || require('crypto').webcrypto).getRandomValues(a); return a[0] | 0; } catch (e) { return Date.now() | 0; } }
  function r() { const s = G(); if (s.seed == null) s.seed = newSeed(); s.rc = (s.rc || 0) + 1; return mix(s.seed, s.day || 0, s.rc); }
  const int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  const pick = a => a[Math.floor(r() * a.length)];
  const chance = pct => r() * 100 < pct;
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  // 独立小流：从主流取一个数作种子，之后不再动主流（给要连续取很多数的地方用，如 engine.js 出一道题）
  function stream() { let a = (r() * 4294967296) | 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function withRng(fn) { const keep = Math.random; Math.random = stream(); try { return fn(); } finally { Math.random = keep; } }
  // 记录用的唯一编号：不取游戏随机数
  const uid = () => { try { return root.crypto.randomUUID().replace(/-/g, '').slice(0, 12); } catch (e) { return Date.now().toString(36) + (G().rc || 0); } };
  const api = { RNG_VERSION, r, int, pick, chance, shuffle, stream, with: withRng, uid, newSeed, mix };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MQRng = api;
})(typeof window !== 'undefined' ? window : globalThis);
