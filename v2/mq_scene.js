// mq_scene.js — 通用场景画法 v1（2026-11-27，P-20261126-maths-game）
// 场景全部由 content/scenes.json 描述；这里只有一套画法：天空渐变 + 地面 + 时间（早/黄昏/夜）+ 粒子 + 装饰 + 状态叠加。
// 同一 (场景, 种子) 画面固定。新场景、新装饰、新状态都只改 JSON，不改本文件。
(function (root) {
  const SCENE_VERSION = 1;
  let SD = null;
  const rng = seed => { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  // 色相旋转（hex → hex），用于同一场景每次颜色略有不同
  function hue(hex, deg, light = 0) {
    let [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0, l = (mx + mn) / 2;
    if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
    h = (h + deg + 360) % 360; l = Math.min(1, Math.max(0, l + light));
    const f = n => { const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l); return Math.round((l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255).toString(16).padStart(2, '0'); };
    return '#' + f(0) + f(8) + f(4);
  }
  const PART = {
    stars:   (x, y, r) => `<circle cx="${x}" cy="${y}" r="${0.6 + r * 1.6}" fill="#fff" opacity=".85"/>`,
    snow:    (x, y, r) => `<circle cx="${x}" cy="${y}" r="${1 + r * 2}" fill="#fff"/>`,
    bubbles: (x, y, r) => `<circle cx="${x}" cy="${y}" r="${2 + r * 4}" fill="none" stroke="#fff" opacity=".7"/>`,
    leaves:  (x, y, r) => `<ellipse cx="${x}" cy="${y}" rx="4" ry="2" fill="${r > .5 ? '#e0a040' : '#8cc060'}" transform="rotate(${r * 180} ${x} ${y})"/>`,
    ash:     (x, y, r) => `<circle cx="${x}" cy="${y}" r="${0.8 + r * 1.5}" fill="#6a4a3a" opacity=".5"/>`
  };
  const TIMES = { day: null, dusk: ['#ff9a5a', .18], night: ['#0a0a30', .38] };
  // 生成一次场景的随机参数（存进状态，回看时不变）
  function roll(id, seed) {
    const s = SD.scenes[id], r = rng(seed); if (!s || s.builtin) return { id, seed };
    const [lo, hi] = s.hue || [0, 0], n = s.n ? s.n[0] + Math.floor(r() * (s.n[1] - s.n[0] + 1)) : 0;
    const t = Object.keys(TIMES)[Math.floor(r() * 3)];
    return { id, seed, hue: Math.round(lo + r() * (hi - lo)), time: t, decor: Array.from({ length: n }, () => s.decor[Math.floor(r() * s.decor.length)]) };
  }
  function render(v, states = [], shelf = '') {
    const s = SD.scenes[v.id], r = rng(v.seed + 7), W = 400, H = 160;
    const over = states.map(k => SD.states[k] || '').join('');
    if (!s || s.builtin) return null;   // 交给原来的店内画法（再叠加 over）
    const c1 = hue(s.sky[0], v.hue), c2 = hue(s.sky[1], v.hue), gr = hue(s.ground, v.hue / 2);
    const parts = [...Array(30)].map(() => PART[s.particles] ? PART[s.particles](Math.round(r() * W), Math.round(r() * 120), r()) : '').join('');
    const slot = W / (v.decor.length + 1);
    const decor = v.decor.map((k, i) => {
      const c = hue('#ff7aa8', v.hue + i * 70 + r() * 60), d = hue(c, 0, -.2), sc = 1 + r() * .8, x = slot * (i + 1) - 20 * sc, y = 128 - 40 * sc;
      return `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) scale(${sc.toFixed(2)})">${(SD.sprites[k] || '').replace(/\{c\}/g, c).replace(/\{d\}/g, d)}</g>`;
    }).join('');
    const tm = TIMES[v.time];
    return `<svg class="art-scene" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="sg${v.seed}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
      <rect width="${W}" height="${H}" fill="url(#sg${v.seed})"/>${parts}<rect y="128" width="${W}" height="32" fill="${gr}"/>${decor}${shelf}${over}${tm ? `<rect width="${W}" height="${H}" fill="${tm[0]}" opacity="${tm[1]}"/>` : ''}</svg>`;
  }
  // 店内原画法 + 状态叠加：把 over 插到 </svg> 前
  const overlay = (svg, states) => { const over = states.map(k => SD.states[k] || '').join(''); return over ? svg.replace(/<\/svg>\s*$/, over + '</svg>') : svg; };
  const api = { SCENE_VERSION, load: d => { SD = d; }, data: () => SD, roll, render, overlay, hue, name: (id, lang) => (SD.scenes[id] || {})[lang] || id };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MQScene = api;
})(typeof window !== 'undefined' ? window : globalThis);
