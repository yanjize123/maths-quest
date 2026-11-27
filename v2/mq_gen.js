// mq_gen.js — 程序化原创 SVG 小库：由“参数 + 随机种子”生成怪兽、动物店员、蛋糕、武器、元素特效，带状态与动画。
// 同一个种子永远画出同一个形象（卡片可复现）；状态（idle/angry/hit/attack/defeated、happy）只改表情与动作。
// 版本写在文件内（组件库文件名不变）。v1 2026-11-27，P-20261126-maths-game。只用原创形象。
(function (root) {
  const GEN_VERSION = 1;

  // ---------------- 随机数（mulberry32，可复现） ----------------
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    const f = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    f.int = (lo, hi) => lo + Math.floor(f() * (hi - lo + 1));
    f.pick = arr => arr[Math.floor(f() * arr.length)];
    f.chance = p => f() < p;
    return f;
  }
  const hashStr = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

  // ---------------- 颜色 ----------------
  const hsl = (h, s, l) => `hsl(${Math.round(h)},${Math.round(s)}%,${Math.round(l)}%)`;
  const ELEMENTS = {
    fire:   { hue: [0, 30],    en: 'Fire',   zh: '火', icon: '🔥', fx: '#ff7a1a', fx2: '#ffd23f' },
    water:  { hue: [190, 215], en: 'Water',  zh: '水', icon: '💧', fx: '#3fa9ff', fx2: '#bfe6ff' },
    wind:   { hue: [140, 175], en: 'Wind',   zh: '风', icon: '🌪️', fx: '#9fe8c8', fx2: '#ffffff' },
    ice:    { hue: [175, 200], en: 'Ice',    zh: '冰', icon: '❄️', fx: '#c8f4ff', fx2: '#ffffff' },
    bolt:   { hue: [45, 60],   en: 'Spark',  zh: '电', icon: '⚡', fx: '#ffe14d', fx2: '#fff8c4' },
    bubble: { hue: [280, 320], en: 'Bubble', zh: '泡泡', icon: '🫧', fx: '#f3b8ff', fx2: '#ffffff' },
    sugar:  { hue: [320, 350], en: 'Sugar',  zh: '糖', icon: '🍬', fx: '#ff8fc0', fx2: '#fff0f7' },
    leaf:   { hue: [90, 125],  en: 'Leaf',   zh: '叶', icon: '🍃', fx: '#7ccf5a', fx2: '#d9f7c8' },
  };
  const ELEMENT_IDS = Object.keys(ELEMENTS);

  // ---------------- 动画（只注入一次） ----------------
  const CSS = `
  .mqg-bob{animation:mqg-bob 1.6s ease-in-out infinite}
  @keyframes mqg-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
  .mqg-blink{animation:mqg-blink 4s infinite;transform-box:fill-box;transform-origin:center}
  @keyframes mqg-blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
  .mqg-hit{animation:mqg-hit .45s ease-out}
  @keyframes mqg-hit{0%{transform:translateX(0);filter:brightness(3)}25%{transform:translateX(-10px)}50%{transform:translateX(8px);filter:brightness(1.6)}100%{transform:translateX(0);filter:none}}
  .mqg-angry{animation:mqg-angry .25s ease-in-out infinite alternate}
  @keyframes mqg-angry{from{transform:rotate(-3deg)}to{transform:rotate(3deg)}}
  .mqg-lunge{animation:mqg-lunge .6s ease-in-out}
  @keyframes mqg-lunge{0%,100%{transform:translateX(0)}40%{transform:translateX(-26px) scale(1.08)}}
  .mqg-defeat{animation:mqg-defeat 1.2s ease-in forwards;transform-box:fill-box;transform-origin:50% 100%}
  @keyframes mqg-defeat{0%{transform:rotate(0) scale(1);opacity:1}60%{transform:rotate(-20deg) scale(.8);opacity:1}100%{transform:rotate(-90deg) scale(.4) translateY(40px);opacity:.15}}
  .mqg-flow{stroke-dasharray:14 10;animation:mqg-flow .5s linear infinite}
  @keyframes mqg-flow{to{stroke-dashoffset:-48}}
  .mqg-spin{animation:mqg-spin 1.2s linear infinite;transform-box:fill-box;transform-origin:center}
  @keyframes mqg-spin{to{transform:rotate(360deg)}}
  .mqg-flicker{animation:mqg-flicker .18s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:0% 50%}
  @keyframes mqg-flicker{from{transform:scaleX(.85) scaleY(.9)}to{transform:scaleX(1.1) scaleY(1.08)}}
  .mqg-rise{animation:mqg-rise 1.4s ease-in infinite}
  @keyframes mqg-rise{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-40px);opacity:0}}
  .mqg-pop{animation:mqg-pop .5s cubic-bezier(.2,1.6,.4,1)}
  @keyframes mqg-pop{from{transform:scale(.2);opacity:0}to{transform:scale(1);opacity:1}}
  .mqg-swing{animation:mqg-swing .5s ease-in-out;transform-box:fill-box;transform-origin:20% 90%}
  @keyframes mqg-swing{0%{transform:rotate(30deg)}50%{transform:rotate(-60deg)}100%{transform:rotate(0)}}
  .mqg-glow{animation:mqg-glow 1.5s ease-in-out infinite alternate}
  @keyframes mqg-glow{from{filter:drop-shadow(0 0 2px #fff8)}to{filter:drop-shadow(0 0 10px #ffe14d)}}
  .mqg-hp{transition:width .5s ease}
  `;
  function ensureStyle() {
    if (typeof document === 'undefined' || document.getElementById('mqg-style')) return;
    const s = document.createElement('style'); s.id = 'mqg-style'; s.textContent = CSS; document.head.appendChild(s);
  }
  const svg = (w, h, body, cls = '') => { ensureStyle(); return `<svg class="${cls}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" overflow="visible">${body}</svg>`; };

  // ---------------- 身体形状（120×120 画布，中心 60,66） ----------------
  function blobPath(r, cx, cy, rx, ry, n, wob) {   // 极坐标加噪声的软团
    const pts = []; const ph = r() * 6.28;
    for (let i = 0; i < n; i++) { const a = i / n * 6.283; const k = 1 + wob * Math.sin(a * 3 + ph) * 0.5 + wob * (r() - 0.5) * 0.4; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    let d = ''; for (let i = 0; i < n; i++) { const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      if (!i) d += `M${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`; }
    return d + 'Z';
  }
  const BODIES = {
    round: (r) => blobPath(r, 60, 70, 38, 36, 8, 0.05),
    blob:  (r) => blobPath(r, 60, 70, 40, 34, 9, 0.35),
    pear:  () => 'M60 24 C82 24 86 50 92 72 C100 100 80 108 60 108 C40 108 20 100 28 72 C34 50 38 24 60 24Z',
    tall:  () => 'M36 40 Q36 22 60 22 Q84 22 84 40 L86 96 Q86 108 60 108 Q34 108 34 96Z',
    box:   () => 'M28 38 Q28 30 36 30 L84 30 Q92 30 92 38 L92 98 Q92 106 84 106 L36 106 Q28 106 28 98Z',
    cloud: () => 'M30 92 Q14 92 16 76 Q14 60 32 60 Q32 38 54 40 Q64 26 80 36 Q100 36 98 58 Q110 66 104 82 Q102 96 86 94 Q60 102 30 92Z',
    star:  () => { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 22 : 44; d += (i ? 'L' : 'M') + (60 + Math.cos(a) * rr).toFixed(1) + ' ' + (70 + Math.sin(a) * rr).toFixed(1); } return d + 'Z'; },
    bean:  () => 'M38 34 Q66 18 88 40 Q104 62 90 92 Q74 112 48 104 Q30 98 40 78 Q46 66 32 58 Q24 44 38 34Z',
  };
  const BODY_IDS = Object.keys(BODIES);

  // ---------------- 名字 ----------------
  const NAME_A = ['Glo', 'Bum', 'Wib', 'Zor', 'Pip', 'Flu', 'Mog', 'Snoo', 'Kri', 'Dob', 'Yum', 'Tas', 'Qui', 'Ruf', 'Spl'];
  const NAME_B = ['bble', 'zle', 'nkin', 'mbo', 'ffle', 'gloop', 'ster', 'dle', 'po', 'wump', 'kins', 'rix'];
  const ZH_A = ['咕噜', '噗噗', '毛毛', '呼呼', '叮当', '团团', '滚滚', '咚咚', '嘟嘟', '啾啾', '泡泡', '闪闪', '软软', '圆圆', '咕咕'];
  const ZH_BODY = { round: '球', blob: '团', pear: '梨', tall: '柱', box: '块', cloud: '云', star: '星', bean: '豆' };

  // ---------------- 怪兽：参数 ----------------
  const RARITY = [['common', 60], ['rare', 30], ['legend', 10]];
  function monsterSpec(seed, opts = {}) {
    const r = rng(seed);
    const element = opts.element || r.pick(ELEMENT_IDS), E = ELEMENTS[element];
    const body = opts.body || r.pick(BODY_IDS);
    const hue = E.hue[0] + r() * (E.hue[1] - E.hue[0]);
    const rr = r() * 100; const rarity = opts.rarity || (rr < 60 ? 'common' : rr < 90 ? 'rare' : 'legend');
    const s = {
      v: GEN_VERSION, seed, element, body, rarity,
      main: hsl(hue, 70 + r() * 20, 58 + r() * 10), dark: hsl(hue, 60, 38), belly: hsl(hue + 20, 80, 85),
      accent: hsl((hue + 150 + r() * 60) % 360, 80, 60),
      eyes: r.pick([1, 2, 2, 2, 3]), eyeSize: 7 + r() * 5,
      horns: r.pick(['none', 'two', 'one', 'antenna', 'curly']), wings: r.chance(0.35), tail: r.chance(0.55),
      spikes: r.chance(0.35), feet: r.pick([2, 2, 3, 0]), spots: r.int(0, 5), teeth: r.chance(0.5), blush: r.chance(0.6),
      hp: (rarity === 'legend' ? 4 : rarity === 'rare' ? 3 : 2) + r.int(0, 1),
      steals: r.pick(['strawberry', 'strawberry', 'flour', 'egg', 'coin', 'cake']),
    };
    const za = r.pick(ZH_A);
    s.name = { en: r.pick(NAME_A) + r.pick(NAME_B) + ' the ' + E.en + ' ' + { round: 'Ball', blob: 'Blob', pear: 'Pear', tall: 'Tower', box: 'Block', cloud: 'Cloud', star: 'Star', bean: 'Bean' }[body],
               zh: E.zh + za + ZH_BODY[body] };
    s.weak = WEAK[element];
    return s;
  }
  const WEAK = { fire: 'water', water: 'bolt', wind: 'leaf', ice: 'fire', bolt: 'leaf', bubble: 'wind', sugar: 'ice', leaf: 'fire' };

  // ---------------- 怪兽：画 ----------------
  function eyesSvg(s, state, r) {
    const n = s.eyes, sz = s.eyeSize, y = 58, xs = n === 1 ? [60] : n === 2 ? [48, 72] : [42, 60, 78];
    return xs.map((x, i) => {
      const yy = n === 3 && i === 1 ? y - 6 : y;
      if (state === 'defeated') return `<path d="M${x - 5} ${yy - 5} L${x + 5} ${yy + 5} M${x + 5} ${yy - 5} L${x - 5} ${yy + 5}" stroke="#222" stroke-width="3" stroke-linecap="round"/>`;
      if (state === 'hit') return `<path d="M${x - 6} ${yy} Q${x} ${yy - 7} ${x + 6} ${yy}" stroke="#222" stroke-width="3" fill="none" stroke-linecap="round"/>`;
      const brow = state === 'angry' || state === 'attack' ? `<path d="M${x - sz} ${yy - sz - 3} L${x + sz * 0.6} ${yy - sz + 1}" stroke="#222" stroke-width="3" stroke-linecap="round" transform="${x < 60 ? '' : `scale(-1,1) translate(${-2 * x},0)`}"/>` : '';
      return `<g class="mqg-blink"><circle cx="${x}" cy="${yy}" r="${sz}" fill="#fff" stroke="#2222" stroke-width="1.5"/><circle cx="${x + 1}" cy="${yy + 1}" r="${sz * 0.5}" fill="#222"/><circle cx="${x + 2.5}" cy="${yy - 1.5}" r="${sz * 0.18}" fill="#fff"/></g>${brow}`;
    }).join('');
  }
  function mouthSvg(s, state) {
    if (state === 'defeated') return '<path d="M50 84 Q60 78 70 84" stroke="#222" stroke-width="3" fill="none" stroke-linecap="round"/>';
    if (state === 'attack' || state === 'angry') return `<path d="M46 78 Q60 96 74 78 Z" fill="#5a1530"/>${s.teeth ? '<path d="M50 79 L53 84 L56 79 M64 79 L67 84 L70 79" fill="#fff"/>' : ''}`;
    if (state === 'hit') return '<ellipse cx="60" cy="84" rx="6" ry="5" fill="#5a1530"/>';
    return `<path d="M48 80 Q60 90 72 80" stroke="#222" stroke-width="3" fill="none" stroke-linecap="round"/>${s.teeth ? '<path d="M54 82 L56 86 L58 83" fill="#fff"/>' : ''}`;
  }
  function hornsSvg(s) {
    const c = s.accent;
    switch (s.horns) {
      case 'two': return `<path d="M40 34 L34 12 L50 30Z M80 34 L86 12 L70 30Z" fill="${c}"/>`;
      case 'one': return `<path d="M54 26 L60 2 L66 26Z" fill="${c}"/>`;
      case 'antenna': return `<path d="M48 30 Q42 14 36 10 M72 30 Q78 14 84 10" stroke="${s.dark}" stroke-width="3" fill="none"/><circle cx="36" cy="10" r="5" fill="${c}"/><circle cx="84" cy="10" r="5" fill="${c}"/>`;
      case 'curly': return `<path d="M42 32 Q30 22 36 12 Q44 8 44 18 M78 32 Q90 22 84 12 Q76 8 76 18" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
      default: return '';
    }
  }
  function monster(s, state = 'idle') {
    if (typeof s === 'number') s = monsterSpec(s);
    const r = rng(s.seed + 7);
    const body = BODIES[s.body](rng(s.seed + 1));
    const wings = s.wings ? `<path d="M30 60 Q2 30 8 70 Q16 64 22 74 Q24 66 32 72Z" fill="${s.accent}" opacity=".85"/><path d="M90 60 Q118 30 112 70 Q104 64 98 74 Q96 66 88 72Z" fill="${s.accent}" opacity=".85"/>` : '';
    const tail = s.tail ? `<path d="M88 92 Q112 96 108 78 Q106 70 114 66" stroke="${s.dark}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M110 60 L120 64 L112 72Z" fill="${s.accent}"/>` : '';
    let spikes = ''; if (s.spikes) for (let i = 0; i < 5; i++) { const x = 38 + i * 11; spikes += `<path d="M${x} ${36 + Math.abs(i - 2) * 3} l5 -12 l5 12Z" fill="${s.accent}"/>`; }
    let feet = ''; const fx = s.feet === 3 ? [40, 60, 80] : s.feet === 2 ? [44, 76] : [];
    fx.forEach(x => feet += `<ellipse cx="${x}" cy="108" rx="10" ry="6" fill="${s.dark}"/>`);
    let spots = ''; for (let i = 0; i < s.spots; i++) spots += `<circle cx="${36 + r() * 48}" cy="${70 + r() * 26}" r="${2 + r() * 4}" fill="${s.dark}" opacity=".35"/>`;
    const blush = s.blush && state !== 'defeated' ? '<ellipse cx="38" cy="74" rx="6" ry="3.5" fill="#ff6f9f" opacity=".45"/><ellipse cx="82" cy="74" rx="6" ry="3.5" fill="#ff6f9f" opacity=".45"/>' : '';
    const legend = s.rarity === 'legend' ? '<circle cx="60" cy="66" r="56" fill="none" stroke="#ffe14d" stroke-width="2" stroke-dasharray="4 6" class="mqg-spin"/>' : '';
    const cls = { idle: 'mqg-bob', angry: 'mqg-angry', hit: 'mqg-hit', attack: 'mqg-lunge', defeated: 'mqg-defeat' }[state] || '';
    const fxs = state === 'attack' ? breath(s.element, 6, 78, -1) : '';
    return svg(120, 120, `<ellipse cx="60" cy="114" rx="34" ry="5" fill="#0002"/>${legend}<g class="${cls}">${tail}${wings}${hornsSvg(s)}${spikes}
      <path d="${body}" fill="${s.main}" stroke="${s.dark}" stroke-width="2.5"/>
      <path d="${blobPath(rng(s.seed + 2), 60, 84, 20, 15, 7, 0.1)}" fill="${s.belly}" opacity=".9"/>${spots}${feet}
      ${eyesSvg(s, state, r)}${blush}${mouthSvg(s, state)}</g>${fxs}`, 'art-monster');
  }

  // ---------------- 元素特效 ----------------
  // breath：从 (x,y) 向 dir（-1 向左，1 向右）喷出
  function breath(el, x, y, dir = -1) {
    const E = ELEMENTS[el] || ELEMENTS.fire, L = 70 * dir;
    switch (el) {
      case 'fire': return `<g class="mqg-flicker" transform="translate(${x} ${y}) scale(${dir},1)"><path d="M0 0 Q-20 -14 -60 -10 Q-46 0 -66 8 Q-30 14 0 4Z" fill="${E.fx}"/><path d="M0 0 Q-16 -6 -40 -4 Q-30 2 -42 6 Q-20 8 0 3Z" fill="${E.fx2}"/></g>`;
      case 'water': case 'bubble': case 'sugar':
        return `<path d="M${x} ${y} q${L / 2} -18 ${L} 0" stroke="${E.fx}" stroke-width="7" fill="none" stroke-linecap="round" class="mqg-flow"/>` + [0.4, 0.7, 1].map(k => `<circle cx="${x + L * k}" cy="${y - 6}" r="${el === 'bubble' ? 6 : 3}" fill="${E.fx2}" stroke="${E.fx}" class="mqg-rise"/>`).join('');
      case 'wind': return [0, 8, 16].map(d => `<path d="M${x} ${y - 10 + d} q${L / 3} -8 ${L / 1.5} 0 t${L / 3} 0" stroke="${E.fx}" stroke-width="3" fill="none" stroke-linecap="round" class="mqg-flow"/>`).join('');
      case 'ice': return `<g class="mqg-spin" transform="translate(${x + L * 0.7} ${y - 4})">${[0, 60, 120].map(a => `<path d="M-10 0 H10" stroke="${E.fx}" stroke-width="3" transform="rotate(${a})"/>`).join('')}</g><path d="M${x} ${y} L${x + L} ${y - 4}" stroke="${E.fx}" stroke-width="4" class="mqg-flow"/>`;
      case 'bolt': return `<path d="M${x} ${y} l${L * 0.3} -10 l${-L * 0.05} 12 l${L * 0.35} -10 l${-L * 0.05} 12 l${L * 0.45} -8" stroke="${E.fx}" stroke-width="4" fill="none" class="mqg-flow"/>`;
      case 'leaf': return [0.3, 0.6, 0.9].map((k, i) => `<path d="M${x + L * k} ${y - 4 + i * 4} q6 -8 12 0 q-6 8 -12 0Z" fill="${E.fx}" class="mqg-rise"/>`).join('');
    }
    return '';
  }
  // 命中特效（放在被打的怪兽上面）
  function burst(el, big) {
    const E = ELEMENTS[el] || ELEMENTS.bolt, n = big ? 10 : 6; let d = '';
    for (let i = 0; i < n; i++) { const a = i / n * 6.283, r1 = big ? 30 : 20, r2 = big ? 54 : 40; d += `<path d="M${60 + Math.cos(a) * r1} ${60 + Math.sin(a) * r1} L${60 + Math.cos(a) * r2} ${60 + Math.sin(a) * r2}" stroke="${i % 2 ? E.fx : E.fx2}" stroke-width="${big ? 6 : 4}" stroke-linecap="round"/>`; }
    return svg(120, 120, `<g class="mqg-pop">${d}<circle cx="60" cy="60" r="${big ? 16 : 10}" fill="${E.fx2}"/></g>`, 'art-burst');
  }

  // ---------------- 动物店员（同一套机制，友好造型） ----------------
  const ANIMALS = {
    bunny: { en: 'Bunny', zh: '兔子', ears: 'long', color: [0, 0, 92], snout: true },
    cat: { en: 'Cat', zh: '小猫', ears: 'tri', color: [30, 70, 70], whisk: true },
    bear: { en: 'Bear', zh: '小熊', ears: 'round', color: [28, 45, 50], snout: true },
    frog: { en: 'Frog', zh: '青蛙', ears: 'none', color: [110, 55, 55], frog: true },
    fox: { en: 'Fox', zh: '狐狸', ears: 'tri', color: [22, 85, 58], whisk: true },
    owl: { en: 'Owl', zh: '猫头鹰', ears: 'tuft', color: [35, 35, 55], beak: true },
    panda: { en: 'Panda', zh: '熊猫', ears: 'round', color: [0, 0, 96], panda: true },
    hedgehog: { en: 'Hedgehog', zh: '刺猬', ears: 'none', color: [30, 40, 45], spikes: true },
  };
  function animal(kind, apron = '#7fc8ff', mood = 'happy') {
    const A = ANIMALS[kind] || ANIMALS.bunny, [h, s, l] = A.color, fur = hsl(h, s, l), dark = hsl(h, s, l - 25), inner = '#ffc4d6';
    let ears = '';
    if (A.ears === 'long') ears = `<ellipse cx="44" cy="20" rx="8" ry="22" fill="${fur}" stroke="${dark}" stroke-width="2"/><ellipse cx="76" cy="20" rx="8" ry="22" fill="${fur}" stroke="${dark}" stroke-width="2"/><ellipse cx="44" cy="22" rx="4" ry="15" fill="${inner}"/><ellipse cx="76" cy="22" rx="4" ry="15" fill="${inner}"/>`;
    if (A.ears === 'tri') ears = `<path d="M34 40 L40 12 L56 32Z M86 40 L80 12 L64 32Z" fill="${fur}" stroke="${dark}" stroke-width="2"/>`;
    if (A.ears === 'round') ears = `<circle cx="38" cy="30" r="11" fill="${A.panda ? '#222' : fur}" stroke="${dark}" stroke-width="2"/><circle cx="82" cy="30" r="11" fill="${A.panda ? '#222' : fur}" stroke="${dark}" stroke-width="2"/>`;
    if (A.ears === 'tuft') ears = `<path d="M36 34 L34 18 L48 30Z M84 34 L86 18 L72 30Z" fill="${dark}"/>`;
    let spikes = ''; if (A.spikes) for (let i = 0; i < 9; i++) { const a = Math.PI * (1.05 + i * 0.11); spikes += `<path d="M${60 + Math.cos(a) * 30} ${52 + Math.sin(a) * 30} L${60 + Math.cos(a) * 46} ${52 + Math.sin(a) * 46} L${60 + Math.cos(a + 0.12) * 30} ${52 + Math.sin(a + 0.12) * 30}Z" fill="${dark}"/>`; }
    const eyeY = A.frog ? 30 : 50;
    const eyes = A.frog ? `<circle cx="44" cy="30" r="11" fill="${fur}" stroke="${dark}" stroke-width="2"/><circle cx="76" cy="30" r="11" fill="${fur}" stroke="${dark}" stroke-width="2"/>` : '';
    const patch = A.panda ? `<ellipse cx="47" cy="${eyeY}" rx="8" ry="10" fill="#222"/><ellipse cx="73" cy="${eyeY}" rx="8" ry="10" fill="#222"/>` : '';
    const eyeC = mood === 'oops' ? '#222' : '#222';
    const face = mood === 'cheer' ? `<path d="M41 ${eyeY} q6 -6 12 0 M67 ${eyeY} q6 -6 12 0" stroke="${A.panda ? '#fff' : eyeC}" stroke-width="3" fill="none" stroke-linecap="round"/>` :
      `<circle cx="47" cy="${eyeY}" r="4.5" fill="${A.panda ? '#fff' : eyeC}" class="mqg-blink"/><circle cx="73" cy="${eyeY}" r="4.5" fill="${A.panda ? '#fff' : eyeC}" class="mqg-blink"/><circle cx="48.5" cy="${eyeY - 1.5}" r="1.4" fill="${A.panda ? '#222' : '#fff'}"/><circle cx="74.5" cy="${eyeY - 1.5}" r="1.4" fill="${A.panda ? '#222' : '#fff'}"/>`;
    const nose = A.beak ? '<path d="M55 58 L65 58 L60 67Z" fill="#f4a03a"/>' : A.snout ? `<ellipse cx="60" cy="62" rx="10" ry="7" fill="#fff8"/><ellipse cx="60" cy="59" rx="4" ry="3" fill="#333"/>` : `<ellipse cx="60" cy="59" rx="3" ry="2.2" fill="#333"/>`;
    const whisk = A.whisk ? '<path d="M40 62 H26 M40 66 L27 70 M80 62 H94 M80 66 L93 70" stroke="#5558" stroke-width="1.5"/>' : '';
    const mouth = mood === 'oops' ? '<ellipse cx="60" cy="70" rx="4" ry="3" fill="#5a1530"/>' : '<path d="M53 67 Q60 74 67 67" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
    return svg(120, 130, `<ellipse cx="60" cy="124" rx="28" ry="5" fill="#0002"/><g class="${mood === 'cheer' ? 'mqg-bob' : ''}">${spikes}${ears}
      <ellipse cx="60" cy="98" rx="28" ry="26" fill="${fur}" stroke="${dark}" stroke-width="2"/>
      <path d="M40 86 Q60 92 80 86 L78 118 Q60 124 42 118Z" fill="${apron}"/>
      <circle cx="60" cy="56" r="30" fill="${fur}" stroke="${dark}" stroke-width="2"/>${eyes}${patch}${face}${nose}${whisk}${mouth}
      <ellipse cx="40" cy="66" rx="5" ry="3" fill="#ff6f9f" opacity=".4"/><ellipse cx="80" cy="66" rx="5" ry="3" fill="#ff6f9f" opacity=".4"/></g>`, 'art-animal');
  }

  // ---------------- 蛋糕（纸杯蛋糕 / 多层蛋糕 / 甜甜圈 / 曲奇），层数与装饰数都是参数 ----------------
  const FLAVOURS = {
    vanilla: { en: 'vanilla', zh: '香草', sponge: '#f6dca0', icing: '#fff6e0' },
    chocolate: { en: 'chocolate', zh: '巧克力', sponge: '#8a5634', icing: '#5e3622' },
    strawberry: { en: 'strawberry', zh: '草莓', sponge: '#f7c1c8', icing: '#ff9fbf' },
    lemon: { en: 'lemon', zh: '柠檬', sponge: '#fbe58a', icing: '#fff6a8' },
    blueberry: { en: 'blueberry', zh: '蓝莓', sponge: '#d8c9f0', icing: '#a99cf0' },
    mint: { en: 'mint', zh: '薄荷', sponge: '#cdeedd', icing: '#9fe3c3' },
  };
  const TOPPINGS = {
    strawberry: (x, y, k = 1) => `<path d="M${x} ${y - 5 * k} q${6 * k} 0 ${5 * k} ${6 * k} q-${2 * k} ${5 * k} -${5 * k} ${6 * k} q-${3 * k} -${1 * k} -${5 * k} -${6 * k} q-${1 * k} -${6 * k} ${5 * k} -${6 * k}Z" fill="#e8344e"/><path d="M${x - 3 * k} ${y - 5 * k} l${3 * k} -${3 * k} l${3 * k} ${3 * k}Z" fill="#3a9a3a"/>`,
    blueberry: (x, y, k = 1) => `<circle cx="${x}" cy="${y}" r="${4 * k}" fill="#4a4fbf"/><circle cx="${x + 1}" cy="${y - 1.5 * k}" r="${1.2 * k}" fill="#9aa0ff"/>`,
    cherry: (x, y, k = 1) => `<path d="M${x} ${y - 4 * k} q${3 * k} -${8 * k} ${7 * k} -${10 * k}" stroke="#3a7a2a" stroke-width="1.5" fill="none"/><circle cx="${x}" cy="${y}" r="${5 * k}" fill="#d0103a"/>`,
    candle: (x, y, k = 1) => `<rect x="${x - 2 * k}" y="${y - 14 * k}" width="${4 * k}" height="${14 * k}" fill="#7fc8ff"/><path d="M${x} ${y - 21 * k} q${3 * k} ${4 * k} 0 ${6 * k} q-${3 * k} -${2 * k} 0 -${6 * k}Z" fill="#ffb02e" class="mqg-flicker"/>`,
    star: (x, y, k = 1) => `<path d="M${x} ${y - 6 * k} l${1.8 * k} ${4 * k} l${4.2 * k} 0.4 l-${3.2 * k} ${2.8 * k} l1 ${4.2 * k} l-${3.8 * k} -${2.2 * k} l-${3.8 * k} ${2.2 * k} l1 -${4.2 * k} l-${3.2 * k} -${2.8 * k} l${4.2 * k} -0.4Z" fill="#ffd23f"/>`,
    sprinkle: (x, y, k = 1) => `<rect x="${x - 3 * k}" y="${y - 1 * k}" width="${6 * k}" height="${2.2 * k}" rx="1" fill="hsl(${(x * 37 + y * 13) % 360},80%,60%)" transform="rotate(${(x * 53) % 180} ${x} ${y})"/>`,
  };
  // spec: { type:'cupcake'|'layer'|'donut'|'cookie', tiers:1–5, flavour, topping, per: 每层（或每个）装饰数, wrapper }
  function cake(spec = {}) {
    const type = spec.type || 'layer', fl = FLAVOURS[spec.flavour] || FLAVOURS.vanilla, top = TOPPINGS[spec.topping] || TOPPINGS.strawberry, per = spec.per ?? 3;
    if (type === 'cupcake') {
      const wrap = spec.wrapper || '#ff8fc0'; let tops = ''; const k = per > 6 ? 0.75 : 1;
      for (let i = 0; i < per; i++) { const a = per === 1 ? 0 : (i / (per - 1) - 0.5) * 2; tops += top(60 + a * 22, 46 - (1 - a * a) * 10 + (i % 2) * 4, k); }
      return svg(120, 120, `<ellipse cx="60" cy="112" rx="30" ry="4" fill="#0002"/><path d="M30 70 L38 108 H82 L90 70Z" fill="${wrap}"/><path d="M40 70 L44 108 M52 70 L53 108 M68 70 L67 108 M80 70 L76 108" stroke="#fff6" stroke-width="3"/>
        <path d="M24 72 Q20 54 40 52 Q42 34 60 34 Q78 34 80 52 Q100 54 96 72Z" fill="${fl.icing}" stroke="#0001" stroke-width="2"/><path d="M36 60 Q60 66 84 60" stroke="#fff8" stroke-width="3" fill="none"/>${tops}`, 'art-cake');
    }
    if (type === 'donut') {
      let tops = ''; for (let i = 0; i < per; i++) { const a = i / Math.max(per, 1) * 6.283; tops += top(60 + Math.cos(a) * 26, 64 + Math.sin(a) * 18, 0.8); }
      return svg(120, 120, `<ellipse cx="60" cy="100" rx="40" ry="6" fill="#0002"/><ellipse cx="60" cy="66" rx="44" ry="32" fill="#e7b072"/><ellipse cx="60" cy="62" rx="40" ry="28" fill="${fl.icing}"/><ellipse cx="60" cy="64" rx="13" ry="9" fill="#fff"/>${tops}`, 'art-cake');
    }
    if (type === 'cookie') {
      const r = rng(per * 31 + 7); let chips = ''; for (let i = 0; i < per; i++) chips += `<circle cx="${32 + r() * 56}" cy="${40 + r() * 46}" r="4.5" fill="#5e3622"/>`;
      return svg(120, 120, `<ellipse cx="60" cy="104" rx="38" ry="5" fill="#0002"/><circle cx="60" cy="62" r="40" fill="#e3b06d" stroke="#c48a45" stroke-width="3"/>${chips}`, 'art-cake');
    }
    // 多层蛋糕：每层宽度递减，每层放 per 个装饰
    const n = Math.max(1, Math.min(5, spec.tiers || 1)), H = 20, W0 = 96, Wn = 40;
    const height = 20 + n * H + 30;
    let g = `<ellipse cx="60" cy="${height - 4}" rx="56" ry="5" fill="#0002"/><rect x="4" y="${height - 12}" width="112" height="6" rx="3" fill="#d9d2e0"/>`;
    for (let i = 0; i < n; i++) {
      const w = n === 1 ? W0 : W0 - (W0 - Wn) * i / (n - 1), x = 60 - w / 2, y = height - 12 - (i + 1) * H;
      let drip = `M${x} ${y + 4}`; const seg = Math.max(3, Math.round(w / 14)); for (let j = 0; j < seg; j++) { const x0 = x + w * j / seg, x1 = x + w * (j + 1) / seg; drip += ` Q${(x0 + x1) / 2} ${y + (j % 2 ? 9 : 14)} ${x1} ${y + 4}`; }
      g += `<rect x="${x}" y="${y}" width="${w}" height="${H}" rx="4" fill="${fl.sponge}" stroke="#0001"/><path d="${drip} L${x + w} ${y} L${x} ${y}Z" fill="${fl.icing}"/>`;
      const k = w < 50 ? 0.7 : 0.85;
      for (let j = 0; j < per; j++) g += top(x + w * (j + 0.5) / per, y + H * 0.62, k * 0.8);
    }
    if (spec.candles) for (let j = 0; j < spec.candles; j++) g += TOPPINGS.candle(60 + (j - (spec.candles - 1) / 2) * 9, height - 12 - n * H, 0.9);
    return svg(120, height, g, 'art-cake');
  }

  // ---------------- 武器：形状 + 元素颜色 ----------------
  const WEAPON_SHAPES = {
    hammer: (c, d) => `<rect x="54" y="40" width="10" height="70" rx="4" fill="#b07a4a"/><rect x="28" y="18" width="62" height="30" rx="8" fill="${c}" stroke="${d}" stroke-width="3"/>`,
    sword: (c, d) => `<path d="M58 10 L70 22 L66 82 L54 82 L50 22Z" fill="${c}" stroke="${d}" stroke-width="3"/><rect x="38" y="82" width="44" height="8" rx="4" fill="${d}"/><rect x="55" y="90" width="10" height="24" rx="3" fill="#b07a4a"/>`,
    wand: (c, d) => `<rect x="56" y="40" width="8" height="74" rx="4" fill="#6b4a8a" transform="rotate(20 60 77)"/><path d="M60 6 l7 15 l16 2 l-12 11 l3 16 l-14 -8 l-14 8 l3 -16 l-12 -11 l16 -2Z" fill="${c}" stroke="${d}" stroke-width="2" transform="translate(-10 4)"/>`,
    spoon: (c, d) => `<ellipse cx="60" cy="32" rx="22" ry="26" fill="${c}" stroke="${d}" stroke-width="3"/><rect x="55" y="54" width="10" height="60" rx="5" fill="${d}"/>`,
    slingshot: (c, d) => `<path d="M60 114 L60 70 L38 30 M60 70 L82 30" stroke="#b07a4a" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M38 30 Q60 60 82 30" stroke="${c}" stroke-width="4" fill="none"/><circle cx="60" cy="48" r="8" fill="${c}" stroke="${d}" stroke-width="2"/>`,
    umbrella: (c, d) => `<path d="M14 54 Q60 -6 106 54 Q94 46 83 54 Q72 46 60 54 Q48 46 37 54 Q26 46 14 54Z" fill="${c}" stroke="${d}" stroke-width="3"/><path d="M60 54 V104 Q60 114 50 112" stroke="${d}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    fan: (c, d) => `<path d="M60 100 L14 40 Q60 6 106 40Z" fill="${c}" stroke="${d}" stroke-width="3"/>${[24, 42, 60, 78, 96].map(x => `<path d="M60 100 L${x} ${x === 60 ? 22 : 30}" stroke="${d}" stroke-width="2"/>`).join('')}`,
    bubblegun: (c, d) => `<rect x="20" y="40" width="64" height="28" rx="12" fill="${c}" stroke="${d}" stroke-width="3"/><rect x="40" y="66" width="16" height="34" rx="5" fill="${d}"/><circle cx="96" cy="44" r="9" fill="#fff8" stroke="${c}" stroke-width="2"/><circle cx="108" cy="30" r="5" fill="#fff8" stroke="${c}" stroke-width="2"/>`,
    boomerang: (c, d) => `<path d="M20 30 Q60 20 70 60 Q74 90 104 96 Q60 110 50 70 Q44 40 20 30Z" fill="${c}" stroke="${d}" stroke-width="3"/>`,
    whisk: (c, d) => `<rect x="55" y="70" width="10" height="44" rx="5" fill="${d}"/>${[-14, -5, 5, 14].map(o => `<path d="M60 72 Q${60 + o * 2.2} 30 60 12" stroke="${c}" stroke-width="3" fill="none"/>`).join('')}`,
    pan: (c, d) => `<circle cx="50" cy="50" r="34" fill="${d}"/><circle cx="50" cy="50" r="27" fill="${c}"/><rect x="78" y="76" width="34" height="11" rx="5" fill="#b07a4a" transform="rotate(45 78 76)"/>`,
    rolling: (c, d) => `<rect x="10" y="50" width="16" height="12" rx="5" fill="#b07a4a"/><rect x="26" y="44" width="68" height="24" rx="10" fill="${c}" stroke="${d}" stroke-width="3"/><rect x="94" y="50" width="16" height="12" rx="5" fill="#b07a4a"/>`,
  };
  function weapon(w, state = 'idle') {
    const E = ELEMENTS[w.element] || ELEMENTS.bolt, c = E.fx, d = hsl((E.hue[0] + E.hue[1]) / 2, 50, 30);
    const shape = (WEAPON_SHAPES[w.shape] || WEAPON_SHAPES.hammer)(c, d);
    const cls = state === 'swing' ? 'mqg-swing' : w.rarity === 'legend' ? 'mqg-glow' : '';
    return svg(120, 120, `<g class="${cls}">${shape}</g>`, 'art-weapon');
  }

  // ---------------- 血条 ----------------
  function hpBar(hp, max, color = '#ff5f7f') {
    const hearts = Array.from({ length: max }, (_, i) => `<span style="opacity:${i < hp ? 1 : 0.2}">❤️</span>`).join('');
    return `<div class="mqg-hpwrap" style="font-size:20px;letter-spacing:2px">${hearts}</div>`;
  }

  const api = { GEN_VERSION, rng, hashStr, ELEMENTS, ELEMENT_IDS, BODY_IDS, monsterSpec, monster, breath, burst, animal, ANIMALS, cake, FLAVOURS, TOPPINGS, weapon, WEAPON_SHAPES, hpBar, WEAK };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MQGen = api;
})(typeof window !== 'undefined' ? window : globalThis);
