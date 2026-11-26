// mq_store.js — 进度保存与读取，只有这两个函数对外（以后换 Firebase / Supabase 只改这里）。
// v1：本机 localStorage；登录后由页面另行同步到 Google Sheets（沿用 Code.gs 的 States 表）。
(function (root) {
  const STORE_VERSION = 1, KEY = u => `mq_game_v1_${u || 'guest'}`;
  function saveProgress(user, state) { try { localStorage.setItem(KEY(user), JSON.stringify({ v: STORE_VERSION, t: Date.now(), state })); return true; } catch (e) { return false; } }
  function loadProgress(user) { try { const o = JSON.parse(localStorage.getItem(KEY(user)) || 'null'); return o ? o.state : null; } catch (e) { return null; } }
  const api = { STORE_VERSION, saveProgress, loadProgress };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MQStore = api;
})(typeof window !== 'undefined' ? window : globalThis);
