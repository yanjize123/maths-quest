// mq_art.js — 原创卡通形象（SVG 字符串）。企鹅店员、三条小龙、纸杯蛋糕、草莓、硬币、店铺背景。
// 只用原创形象。版本写在文件内（组件库文件名不变）。v1 2026-11-26，P-20261126-maths-game。
(function (root) {
  const ART_VERSION = 1;
  const svg = (w, h, body, cls = '') => `<svg class="${cls}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

  // 海滩企鹅店员（围裙 + 厨师帽）
  function penguin(mood = 'happy') {
    const mouth = mood === 'oops' ? '<ellipse cx="50" cy="47" rx="5" ry="4" fill="#f4a03a"/>' : '<path d="M44 45 L56 45 L50 51 Z" fill="#f4a03a"/>';
    return svg(100, 120, `
      <ellipse cx="50" cy="112" rx="26" ry="5" fill="#0002"/>
      <ellipse cx="50" cy="70" rx="30" ry="38" fill="#23263a"/>
      <ellipse cx="50" cy="76" rx="20" ry="28" fill="#fff"/>
      <path d="M32 60 Q50 66 68 60 L66 100 Q50 106 34 100 Z" fill="#ff8fc0"/>
      <circle cx="50" cy="80" r="4" fill="#fff6"/>
      <ellipse cx="20" cy="74" rx="7" ry="18" fill="#23263a" transform="rotate(20 20 74)"/>
      <ellipse cx="80" cy="74" rx="7" ry="18" fill="#23263a" transform="rotate(-20 80 74)"/>
      <circle cx="41" cy="38" r="6" fill="#fff"/><circle cx="59" cy="38" r="6" fill="#fff"/>
      <circle cx="42" cy="39" r="3" fill="#111"/><circle cx="58" cy="39" r="3" fill="#111"/>
      <circle cx="43" cy="38" r="1" fill="#fff"/><circle cx="59" cy="38" r="1" fill="#fff"/>
      ${mouth}
      <circle cx="34" cy="47" r="4" fill="#ff9db8" opacity=".6"/><circle cx="66" cy="47" r="4" fill="#ff9db8" opacity=".6"/>
      <rect x="34" y="12" width="32" height="12" rx="3" fill="#fff" stroke="#ddd"/>
      <circle cx="40" cy="10" r="8" fill="#fff"/><circle cx="50" cy="6" r="9" fill="#fff"/><circle cx="60" cy="10" r="8" fill="#fff"/>
      <ellipse cx="38" cy="108" rx="9" ry="4" fill="#f4a03a"/><ellipse cx="62" cy="108" rx="9" ry="4" fill="#f4a03a"/>`, 'art-penguin');
  }

  // 小龙：主角粉色独角（Pink Fluffy Unicorn）、妹妹 Yummy（草莓红）、弟弟 Sprinkle（薄荷绿）
  const DRAGONS = {
    'Pink Fluffy Unicorn': { body: '#ffb3d9', belly: '#fff0f7', wing: '#c9a7ff', horn: true },
    'Yummy': { body: '#ff8a8a', belly: '#ffe9e0', wing: '#ffc46b', horn: false },
    'Sprinkle': { body: '#8fe3c4', belly: '#effff8', wing: '#7fc8ff', horn: false },
  };
  function dragon(name = 'Pink Fluffy Unicorn', mood = 'happy') {
    const c = DRAGONS[name] || DRAGONS['Pink Fluffy Unicorn'];
    const mouth = mood === 'sad' ? '<path d="M44 52 Q50 47 56 52" stroke="#5a3a4a" stroke-width="2.5" fill="none"/>' : '<path d="M43 49 Q50 56 57 49" stroke="#5a3a4a" stroke-width="2.5" fill="none"/>';
    const horn = c.horn ? '<path d="M50 6 L45 24 L55 24 Z" fill="url(#rb)"/>' : '<circle cx="40" cy="20" r="4" fill="' + c.wing + '"/><circle cx="60" cy="20" r="4" fill="' + c.wing + '"/>';
    return svg(100, 110, `
      <defs><linearGradient id="rb" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ff5fa2"/><stop offset=".33" stop-color="#ffd23f"/><stop offset=".66" stop-color="#5fd3ff"/><stop offset="1" stop-color="#b98cff"/></linearGradient></defs>
      <ellipse cx="50" cy="104" rx="24" ry="4" fill="#0002"/>
      <path d="M20 58 Q2 40 12 28 Q22 44 32 50 Z" fill="${c.wing}"/><path d="M80 58 Q98 40 88 28 Q78 44 68 50 Z" fill="${c.wing}"/>
      <path d="M70 88 Q92 92 90 74 Q86 84 72 80 Z" fill="${c.body}"/>
      <ellipse cx="50" cy="76" rx="24" ry="26" fill="${c.body}"/>
      <ellipse cx="50" cy="80" rx="15" ry="18" fill="${c.belly}"/>
      <circle cx="50" cy="40" r="22" fill="${c.body}"/>
      ${horn}
      <circle cx="42" cy="38" r="5" fill="#2b1d2b"/><circle cx="58" cy="38" r="5" fill="#2b1d2b"/>
      <circle cx="43.5" cy="36.5" r="1.6" fill="#fff"/><circle cx="59.5" cy="36.5" r="1.6" fill="#fff"/>
      <circle cx="35" cy="47" r="4" fill="#ff7fb0" opacity=".5"/><circle cx="65" cy="47" r="4" fill="#ff7fb0" opacity=".5"/>
      ${mouth}
      <ellipse cx="40" cy="100" rx="7" ry="4" fill="${c.body}"/><ellipse cx="60" cy="100" rx="7" ry="4" fill="${c.body}"/>`, 'art-dragon');
  }

  const STRAW = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 -4 Q6 -4 6 2 Q5 9 0 11 Q-5 9 -6 2 Q-6 -4 0 -4 Z" fill="#ff3d5a"/><path d="M-4 -4 L0 -8 L4 -4 Z" fill="#3fbf5f"/><circle cx="-2" cy="1" r=".7" fill="#ffe08a"/><circle cx="2" cy="4" r=".7" fill="#ffe08a"/><circle cx="0" cy="-1" r=".7" fill="#ffe08a"/></g>`;
  function strawberry() { return svg(20, 24, STRAW(10, 10, 1.3), 'art-straw'); }

  // 纸杯蛋糕：toppings 颗草莓排在奶油上；collapsed = 塌了
  function cupcake(toppings = 0, collapsed = false) {
    if (collapsed) return svg(100, 100, `<ellipse cx="50" cy="88" rx="38" ry="8" fill="#0002"/><path d="M14 86 Q30 60 50 70 Q70 58 86 86 Z" fill="#ffd6e8"/><path d="M28 86 L72 86 L68 74 L32 74 Z" fill="#f6b26b"/><text x="50" y="40" font-size="22" text-anchor="middle">💫</text>`, 'art-cake');
    let tops = '';
    for (let i = 0; i < toppings; i++) { const row = Math.floor(i / 4), col = i % 4, n = Math.min(4, toppings - row * 4); tops += STRAW(50 + (col - (n - 1) / 2) * 11, 30 - row * 9 + Math.abs(col - (n - 1) / 2) * 2, 0.9); }
    return svg(100, 100, `
      <ellipse cx="50" cy="94" rx="30" ry="5" fill="#0002"/>
      <path d="M24 56 L76 56 L68 92 L32 92 Z" fill="#f6b26b"/>
      <path d="M30 56 L34 92 M40 56 L42 92 M50 56 L50 92 M60 56 L58 92 M70 56 L66 92" stroke="#e39a4f" stroke-width="2"/>
      <path d="M18 58 Q16 44 28 42 Q30 28 44 30 Q50 18 60 28 Q74 26 74 40 Q86 44 82 58 Z" fill="#ffd6e8"/>
      <path d="M26 50 Q40 46 50 50 Q62 54 76 50" stroke="#fff" stroke-width="3" fill="none" opacity=".7"/>
      ${tops}`, 'art-cake');
  }

  function coin(v = 1) { return svg(40, 40, `<circle cx="20" cy="20" r="17" fill="#ffd23f" stroke="#e0a800" stroke-width="3"/><text x="20" y="26" font-size="15" font-weight="700" text-anchor="middle" fill="#8a6000">£${v}</text>`, 'art-coin'); }

  // 店铺背景：theme = shop | space | sea
  function scene(theme = 'shop') {
    if (theme === 'space') return svg(400, 160, `<rect width="400" height="160" fill="#1b1640"/>${[...Array(40)].map((_, i) => `<circle cx="${(i * 97) % 400}" cy="${(i * 53) % 160}" r="${(i % 3) + 0.6}" fill="#fff" opacity=".8"/>`).join('')}<circle cx="330" cy="40" r="22" fill="#ffb3d9"/><ellipse cx="330" cy="40" rx="36" ry="7" fill="none" stroke="#c9a7ff" stroke-width="3"/><rect x="0" y="130" width="400" height="30" fill="#3a3270"/>`, 'art-scene');
    if (theme === 'sea') return svg(400, 160, `<rect width="400" height="160" fill="#7fd6ff"/><path d="M0 100 Q50 90 100 100 T200 100 T300 100 T400 100 V160 H0 Z" fill="#3aa8e0"/>${[...Array(8)].map((_, i) => `<circle cx="${30 + i * 48}" cy="${40 + (i % 3) * 18}" r="5" fill="#fff" opacity=".6"/>`).join('')}<rect x="0" y="140" width="400" height="20" fill="#f3d9a4"/>`, 'art-scene');
    return svg(400, 160, `
      <rect width="400" height="160" fill="#fff0f6"/>
      <path d="M0 0 H400 V34 H0 Z" fill="#ff8fc0"/>${[...Array(10)].map((_, i) => `<path d="M${i * 40} 34 h40 a20 14 0 0 1 -40 0 Z" fill="${i % 2 ? '#ffb3d9' : '#fff'}"/>`).join('')}
      <text x="200" y="24" font-size="18" font-weight="700" text-anchor="middle" fill="#fff">Penguin Cupcakes</text>
      <rect x="20" y="70" width="70" height="50" rx="6" fill="#d8f3ff"/><path d="M20 95 H90 M55 70 V120" stroke="#fff" stroke-width="3"/>
      <rect x="310" y="70" width="70" height="50" rx="6" fill="#d8f3ff"/><path d="M310 95 H380 M345 70 V120" stroke="#fff" stroke-width="3"/>
      <rect x="0" y="126" width="400" height="34" fill="#c98a5a"/><rect x="0" y="126" width="400" height="6" fill="#e0a476"/>`, 'art-scene');
  }

  const api = { ART_VERSION, penguin, dragon, cupcake, strawberry, coin, scene, DRAGONS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MQArt = api;
})(typeof window !== 'undefined' ? window : globalThis);
