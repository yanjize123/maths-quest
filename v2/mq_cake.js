// mq_cake.js — 蛋糕组合画法 v1（2026-11-27，P-20261126-maths-game）
// 蛋糕 = 形状 × 大小 × 层数 × 装饰方式 × 表面图案 × 水果（两种）× 摆法 × 顶饰 × 口味 × 点缀色，全部由种子随机（content/cakes.json）。
// random(seed, 固定字段) → spec（纯数据，可存、可出题：几层、几个水果）；draw(spec) → SVG；name(spec, lang) → 名字。
// 表面图案和顶饰复用别的库：场景装饰（MQScene）、怪兽（MQGen.monster）、数字。加水果/图案/顶饰只改 JSON；加形状才改本文件。
(function (root) {
  const CAKE_VERSION = 1;   // 2026-11-27 起：订单水果数超过形状 cap 时换形状（画面数得清）
  let CD = null;
  const rng = seed => { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const pickW = (o, r) => { const ks = Object.keys(o), tot = ks.reduce((s, k) => s + (o[k].w ?? o[k]), 0); let x = r() * tot; for (const k of ks) if ((x -= (o[k].w ?? o[k])) < 0) return k; return ks[0]; };
  const hsl = (h, s, l) => `hsl(${Math.round(h)},${s}%,${l}%)`;
  const col = (s, c) => s.replace(/\{c\}/g, c.c).replace(/\{d\}/g, c.d).replace(/\{l\}/g, c.l);
  const W = 160, G = 140;   // 画布宽、桌面高度
  function random(seed, fix = {}) {
    const r = rng(seed), s = { seed };
    const ok = fix.nFruit ? Object.fromEntries(Object.entries(CD.shapes).filter(([, v]) => (v.cap ?? 9) >= fix.nFruit)) : CD.shapes;
    s.shape = fix.shape || pickW(Object.keys(ok).length ? ok : CD.shapes, r);
    s.flavour = fix.flavour || Object.keys(CD.flavours)[Math.floor(r() * Object.keys(CD.flavours).length)];
    s.style = fix.style || pickW(CD.styles, r);
    s.pattern = fix.pattern || pickW(CD.patterns, r);
    s.fruit = fix.fruit || pickW(CD.fruits, r);
    s.fruit2 = fix.fruit2 !== undefined ? fix.fruit2 : (r() < 0.45 ? pickW(CD.fruits, r) : null);
    s.nFruit = fix.nFruit ?? Math.min(CD.shapes[s.shape].cap ?? 9, 3 + Math.floor(r() * 6));
    s.layout = fix.layout || pickW(CD.layouts, r);
    s.topper = fix.topper || pickW(CD.toppers, r);
    const tn = (CD.toppers[s.topper] || {}).n || [0, 0]; s.nTop = fix.nTop ?? (tn[0] + Math.floor(r() * (tn[1] - tn[0] + 1)));
    s.tiers = fix.tiers ?? (s.shape === 'layer' ? 1 + Math.floor(r() * 3) : 1);
    s.size = fix.size ?? +(0.75 + r() * 0.4).toFixed(2);
    s.hue = fix.hue ?? Math.floor(r() * 360);
    s.number = fix.number ?? (1 + Math.floor(r() * 9));
    return s;
  }
  // ---- 侧面看的圆柱一层：返回 { g（画）, top（顶面椭圆）, body（侧面路径，用来裁图案） } ----
  function drum(cx, yb, w, h, F, st, c, id) {
    const rx = w / 2, ry = Math.max(4, w * 0.13), x = cx - rx, yt = yb - h;
    const body = `M${x} ${yt} L${x} ${yb} A${rx} ${ry} 0 0 0 ${x + w} ${yb} L${x + w} ${yt} Z`;
    let fill = F.cream, extra = '';
    if (st === 'naked') { fill = F.sponge; for (let k = 1; k < 3; k++) extra += `<rect x="${x}" y="${yt + h * k / 3 - 2}" width="${w}" height="4" fill="${F.cream}" opacity=".9"/>`; }
    if (st === 'ombre') { fill = `url(#om${id})`; extra = `<defs><linearGradient id="om${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.l}"/><stop offset="1" stop-color="${c.c}"/></linearGradient></defs>`; }
    if (st === 'ruffle') for (let y = yt + 6; y < yb; y += 6) { let p = `M${x} ${y}`; for (let k = 0; k < w - 7; k += 8) p += ` q4 4 8 0`; extra += `<path d="${p}" stroke="${c.l}" stroke-width="2" fill="none" opacity=".8"/>`; }
    if (st === 'rosette') { const n = Math.max(4, Math.round(w / 11)); for (let k = 0; k <= n; k++) { const xx = x + w * k / n; extra += `<circle cx="${xx}" cy="${yb + Math.sin(Math.PI * k / n) * ry * .6}" r="4" fill="${c.l}" stroke="${c.c}" stroke-width=".8"/>`; } }
    let g = `${extra.startsWith('<defs') ? extra : ''}<path d="${body}" fill="${fill}" stroke="#0001"/>${extra.startsWith('<defs') ? '' : extra}`;
    g += `<ellipse cx="${cx}" cy="${yt}" rx="${rx}" ry="${ry}" fill="${st === 'naked' ? F.cream : F.cream}" stroke="#0001"/>`;
    if (st === 'drip') { let p = `M${x} ${yt}`; const n = Math.max(4, Math.round(w / 10)); for (let k = 0; k < n; k++) { const x0 = x + w * k / n, x1 = x + w * (k + 1) / n, d = (k * 7 + id) % 3 === 0 ? h * .55 : h * .25; p += ` L${x0 + 1} ${yt + d} Q${(x0 + x1) / 2} ${yt + d + 4} ${x1 - 1} ${yt + d * .6} L${x1} ${yt}`; } g += `<path d="${p} A${rx} ${ry} 0 0 0 ${x} ${yt}Z" fill="${c.d}"/><ellipse cx="${cx}" cy="${yt}" rx="${rx}" ry="${ry}" fill="${c.d}"/>`; }
    return { g, body, top: { cx, cy: yt, rx: rx * 0.82, ry: ry * 0.7 } };
  }
  // ---- 各形状：返回 { g, bodies: [侧面路径…], top } ----
  const SHAPES = {
    layer(s, F, c) { let g = '', bodies = [], top, yb = G, w = 110 * s.size, h = 30 * s.size;
      for (let i = 0; i < s.tiers; i++) { const d = drum(W / 2, yb, w, h, F, s.style, c, s.seed % 997 + i); g += d.g; bodies.push(d.body); top = d.top; yb -= h; w *= 0.72; h *= 0.92; }
      return { g, bodies, top }; },
    sheet(s, F, c) { const w = 120 * s.size, h = 26 * s.size, x = W / 2 - w / 2, yb = G, dx = 14, dy = 12;
      const body = `M${x} ${yb - h} H${x + w} V${yb} H${x}Z`, side = `M${x + w} ${yb - h} L${x + w + dx} ${yb - h - dy} V${yb - dy} L${x + w} ${yb}Z`;
      const fill = s.style === 'naked' ? F.sponge : s.style === 'ombre' ? c.l : F.cream;
      let g = `<path d="${side}" fill="${c.d}" opacity=".35"/><path d="${body}" fill="${fill}" stroke="#0001"/><path d="M${x} ${yb - h} L${x + dx} ${yb - h - dy} H${x + w + dx} L${x + w} ${yb - h}Z" fill="${F.cream}" stroke="#0001"/>`;
      if (s.style === 'drip') g += `<path d="M${x} ${yb - h} H${x + w} ${[...Array(8)].map((_, k) => `L${x + w - k * w / 8 - 4} ${yb - h + (k % 3 ? 6 : 12)} L${x + w - (k + 1) * w / 8} ${yb - h}`).join(' ')}Z" fill="${c.d}"/>`;
      return { g, bodies: [body], top: { cx: W / 2 + dx / 2, cy: yb - h - dy / 2, rx: w * 0.42, ry: dy * 0.4 } }; },
    heart(s, F, c) { const k = s.size * 1.1, cx = W / 2, y0 = G - 70 * k;
      const body = `M${cx} ${G} C${cx - 60 * k} ${G - 40 * k} ${cx - 62 * k} ${y0 - 10 * k} ${cx - 30 * k} ${y0 - 8 * k} C${cx - 12 * k} ${y0 - 7 * k} ${cx} ${y0 + 6 * k} ${cx} ${y0 + 10 * k} C${cx} ${y0 + 6 * k} ${cx + 12 * k} ${y0 - 7 * k} ${cx + 30 * k} ${y0 - 8 * k} C${cx + 62 * k} ${y0 - 10 * k} ${cx + 60 * k} ${G - 40 * k} ${cx} ${G}Z`;
      const fill = s.style === 'ombre' ? c.c : s.style === 'naked' ? F.sponge : F.cream;
      let g = `<path d="${body}" fill="${fill}" stroke="${c.d}" stroke-width="2"/>`;
      if (s.style === 'rosette' || s.style === 'ruffle') g += `<path d="${body}" fill="none" stroke="${c.l}" stroke-width="5" stroke-dasharray="2 6" stroke-linecap="round"/>`;
      return { g, bodies: [body], top: { cx, cy: y0 + 22 * k, rx: 34 * k, ry: 10 * k } }; },
    bundt(s, F, c) { const d = drum(W / 2, G, 112 * s.size, 40 * s.size, F, 'smooth', c, s.seed % 997); const t = d.top;
      let g = d.g; for (let k = 1; k < 8; k++) { const x = W / 2 - 56 * s.size + 112 * s.size * k / 8; g += `<path d="M${x} ${t.cy + 2} Q${x + (k < 4 ? -4 : 4)} ${G - 20 * s.size} ${x} ${G + 4}" stroke="${F.sponge}" stroke-width="3" fill="none" opacity=".7"/>`; }
      g += `<ellipse cx="${t.cx}" cy="${t.cy}" rx="${t.rx * 0.32}" ry="${t.ry * 0.5}" fill="#6a4a3a"/>`;
      g += `<path d="M${t.cx - t.rx * 1.2} ${t.cy} q8 14 14 2 q6 16 14 0 q8 12 16 2 q6 14 14 0 q8 10 14 2 q6 16 16 0" stroke="${c.l}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
      return { g, bodies: [d.body], top: { ...t, rx: t.rx * 0.9 } }; },
    dome(s, F, c) { const r = 52 * s.size, cx = W / 2, yb = G - 8;
      const body = `M${cx - r} ${yb} A${r} ${r * 0.95} 0 0 1 ${cx + r} ${yb}Z`;
      const g = `<defs><radialGradient id="dm${s.seed}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".25" stop-color="${c.l}"/><stop offset="1" stop-color="${c.d}"/></radialGradient></defs>
        <rect x="${cx - r - 4}" y="${yb}" width="${2 * r + 8}" height="8" rx="3" fill="${F.sponge}"/><path d="${body}" fill="url(#dm${s.seed})"/><path d="M${cx - r * .55} ${yb - r * .55} Q${cx - r * .3} ${yb - r * .85} ${cx} ${yb - r * .9}" stroke="#fff" stroke-width="3" fill="none" opacity=".7"/>`;
      return { g, bodies: [body], top: { cx, cy: yb - r * 0.9, rx: r * 0.35, ry: 4 } }; },
    cupcake(s, F, c) { const k = s.size * 1.2, cx = W / 2;
      let g = `<path d="M${cx - 30 * k} ${G - 40 * k} L${cx - 22 * k} ${G} H${cx + 22 * k} L${cx + 30 * k} ${G - 40 * k}Z" fill="${c.c}"/>`;
      for (let j = -2; j <= 2; j++) g += `<path d="M${cx + j * 12 * k} ${G - 40 * k} L${cx + j * 9 * k} ${G}" stroke="#fff6" stroke-width="3"/>`;
      for (let j = 0; j < 3; j++) g += `<ellipse cx="${cx}" cy="${G - 44 * k - j * 13 * k}" rx="${(36 - j * 9) * k}" ry="${9 * k}" fill="${F.cream}" stroke="#0001"/>`;
      g += `<path d="M${cx} ${G - 84 * k} q4 -6 0 -10" stroke="${F.cream}" stroke-width="5" stroke-linecap="round" fill="none"/>`;
      return { g, bodies: [], top: { cx, cy: G - 76 * k, rx: 16 * k, ry: 5 * k } }; },
    rainbow(s, F, c) { const w = 104 * s.size, h = 64 * s.size, x = W / 2 - w / 2, yt = G - h; let g = '';
      const bands = 6; for (let k = 0; k < bands; k++) g += `<rect x="${x}" y="${yt + k * h / bands}" width="${w}" height="${h / bands + 0.5}" fill="${hsl(s.hue + k * 50, 80, 70)}"/>`;
      g += `<rect x="${x}" y="${yt}" width="${w}" height="${h}" fill="none" stroke="${F.cream}" stroke-width="4"/><path d="M${x - 2} ${yt} Q${W / 2} ${yt - 10} ${x + w + 2} ${yt}" fill="${F.cream}"/>`;
      return { g, bodies: [], top: { cx: W / 2, cy: yt - 4, rx: w * 0.4, ry: 3 } }; },
    macaron(s, F, c) { let g = ''; const k = s.size, rows = 5;
      for (let i = 0; i < rows; i++) { const n = rows - i, y = G - 8 - i * 14 * k; for (let j = 0; j < n; j++) { const x = W / 2 + (j - (n - 1) / 2) * 20 * k, cc = hsl(s.hue + (i * 3 + j) * 37, 70, 75);
        g += `<ellipse cx="${x}" cy="${y - 4 * k}" rx="${9 * k}" ry="${4 * k}" fill="${cc}"/><rect x="${x - 8 * k}" y="${y - 2 * k}" width="${16 * k}" height="${2.5 * k}" fill="${F.cream}"/><ellipse cx="${x}" cy="${y + 2 * k}" rx="${9 * k}" ry="${4 * k}" fill="${cc}"/>`; } }
      return { g, bodies: [], top: { cx: W / 2, cy: G - 8 - rows * 14 * k + 4, rx: 6, ry: 2 } }; },
    donut(s, F, c) { let g = ''; const k = s.size;
      for (let i = 0; i < 3; i++) { const y = G - 10 * k - i * 20 * k, rx = (44 - i * 6) * k, ry = 12 * k, gl = hsl(s.hue + i * 60, 75, 70);
        g += `<ellipse cx="${W / 2}" cy="${y}" rx="${rx}" ry="${ry + 4 * k}" fill="#d8a05a"/><ellipse cx="${W / 2}" cy="${y - 3 * k}" rx="${rx * .95}" ry="${ry}" fill="${gl}"/><ellipse cx="${W / 2}" cy="${y - 3 * k}" rx="${rx * .3}" ry="${ry * .3}" fill="#c08040"/>`;
        for (let j = 0; j < 10; j++) { const a = j / 10 * Math.PI * 2; g += `<rect x="${W / 2 + Math.cos(a) * rx * .65}" y="${y - 3 * k + Math.sin(a) * ry * .65}" width="4" height="1.6" fill="${hsl(j * 47, 80, 60)}" transform="rotate(${j * 37} ${W / 2 + Math.cos(a) * rx * .65} ${y + Math.sin(a) * ry * .65})"/>`; } }
      return { g, bodies: [], top: { cx: W / 2, cy: G - 56 * k, rx: 22 * k, ry: 5 * k } }; },
    pavlova(s, F, c) { const k = s.size, cx = W / 2, y = G - 6; let p = `M${cx - 54 * k} ${y}`;
      for (let j = 0; j < 9; j++) p += ` q${6 * k} ${-26 * k} ${12 * k} 0`;
      const g = `<path d="${p} Z" fill="#fffaf2" stroke="#eee"/><ellipse cx="${cx}" cy="${y - 22 * k}" rx="${46 * k}" ry="${9 * k}" fill="${F.cream}"/>`;
      return { g, bodies: [], top: { cx, cy: y - 22 * k, rx: 38 * k, ry: 6 * k } }; },
    cheese(s, F, c) { const d = drum(W / 2, G, 118 * s.size, 34 * s.size, { cream: '#fff3c8', sponge: '#fff3c8' }, 'smooth', c, s.seed % 997);
      const t = d.top, x = W / 2 - 59 * s.size;
      const g = d.g + `<rect x="${x}" y="${G - 8}" width="${118 * s.size}" height="8" fill="#c8904a"/><ellipse cx="${t.cx}" cy="${t.cy}" rx="${t.rx / .82}" ry="${t.ry / .7}" fill="${c.c}" opacity=".85"/>`;
      return { g, bodies: [d.body], top: t }; },
    roll(s, F, c) { const k = s.size, x = 18, y = G - 56 * k, w = 96 * k, h = 52 * k;
      let g = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${F.sponge}"/><path d="M${x + 8} ${y + 8} Q${x + w / 2} ${y - 2} ${x + w - 4} ${y + 8}" stroke="${F.cream}" stroke-width="6" fill="none"/>`;
      g += `<circle cx="${x + w}" cy="${y + h / 2}" r="${h / 2}" fill="${F.sponge}" stroke="#0001"/><path d="M${x + w} ${y + h / 2} m0 -3 a3 3 0 1 1 -3 3 a7 7 0 1 1 7 7 a12 12 0 1 1 -12 -12 a17 17 0 1 1 17 17" stroke="${F.cream}" stroke-width="3.5" fill="none"/>`;
      return { g, bodies: [], top: { cx: x + w / 2, cy: y + 6, rx: w * 0.35, ry: 3 } }; }
  };
  // 顶面椭圆上的摆法
  function spots(layout, n, t, r) {
    const out = [];
    for (let i = 0; i < n; i++) {
      let a, rr;
      if (layout === 'ring') { a = i / n * Math.PI * 2; rr = 1; }
      else if (layout === 'row') { out.push([t.cx + (n === 1 ? 0 : (i / (n - 1) - .5) * 2 * t.rx * .85), t.cy]); continue; }
      else if (layout === 'pile') { a = r() * Math.PI * 2; rr = Math.sqrt(r()) * .45; }
      else if (layout === 'half') { a = Math.PI * (i + .5) / n; rr = 1; }
      else { a = r() * Math.PI * 2; rr = Math.sqrt(r()) * .9; }
      out.push([t.cx + Math.cos(a) * t.rx * rr, t.cy + Math.sin(a) * t.ry * rr]);
    }
    return out.sort((p, q) => p[1] - q[1]);
  }
  const nest = (svg, x, y, w) => svg.replace('<svg', `<svg x="${x - w / 2}" y="${y - w / 2}" width="${w}" height="${w}"`);
  function draw(s) {
    const F = CD.flavours[s.flavour] || CD.flavours.vanilla, c = { c: hsl(s.hue, 70, 62), d: hsl(s.hue, 55, 38), l: hsl(s.hue, 85, 86) }, r = rng(s.seed + 11);
    const sh = (SHAPES[s.shape] || SHAPES.layer)(s, F, c);
    let g = `<ellipse cx="${W / 2}" cy="${G + 6}" rx="70" ry="6" fill="#0002"/><rect x="${W / 2 - 66}" y="${G - 1}" width="132" height="5" rx="2.5" fill="#e4dcec"/>` + sh.g;
    // 表面图案：裁在侧面里
    const P = CD.patterns[s.pattern];
    if (P && s.pattern !== 'none' && sh.bodies.length) sh.bodies.forEach((b, i) => {
      const id = `cp${s.seed}_${i}`; let inner = '';
      if (P.svg) for (let y = 30; y < G; y += 11) for (let x = 10; x < W; x += 13) inner += `<g transform="translate(${x + (y % 22 ? 6 : 0)} ${y})">${col(P.svg, c)}</g>`;
      else if (P.band === 'zig') for (let y = 40; y < G; y += 14) { let p = `M0 ${y}`; for (let x = 0; x < W; x += 10) p += ` l5 -5 l5 5`; inner += `<path d="${p}" stroke="${c.l}" stroke-width="2.5" fill="none"/>`; }
      else if (P.band === 'stripe') for (let x = 0; x < W; x += 12) inner += `<rect x="${x}" y="0" width="5" height="${G}" fill="${c.l}" opacity=".7"/>`;
      else if (P.from === 'scene' && typeof MQScene !== 'undefined' && MQScene.data()) { const ks = Object.keys(MQScene.data().sprites), k = ks[Math.floor(r() * ks.length)]; for (let x = 20; x < W; x += 34) inner += `<g transform="translate(${x - 8} ${G - 34}) scale(.42)">${col(MQScene.data().sprites[k], c).replace(/\{c\}/g, c.c)}</g>`; }
      else if (P.from === 'monster' && typeof MQGen !== 'undefined') { const m = MQGen.monster(MQGen.monsterSpec(s.seed), 'idle'); for (let x = 30; x < W; x += 40) inner += nest(m, x, G - 22, 22); }
      else if (P.from === 'number') inner += `<text x="${W / 2}" y="${G - 8}" font-size="26" font-weight="700" text-anchor="middle" fill="${c.d}" font-family="Comic Sans MS, sans-serif">${s.number}</text>`;
      g += `<defs><clipPath id="${id}"><path d="${b}"/></clipPath></defs><g clip-path="url(#${id})" opacity=".9">${inner}</g>`;
    });
    // 水果（两种交替）与顶饰
    const t = sh.top, n = Math.max(0, Math.min(12, s.nFruit)), fs = Math.max(0.7, Math.min(1.4, t.rx / 32)) * 1.15;
    const tops = (CD.toppers[s.topper] || {}), nt = s.nTop || 0;
    for (let j = 0; j < nt; j++) { const x = t.cx + (nt === 1 ? 0 : (j / (nt - 1) - .5) * t.rx * 1.1), y = t.cy - t.ry * .4;
      g += tops.from === 'monster' && typeof MQGen !== 'undefined' ? nest(MQGen.monster(MQGen.monsterSpec(s.seed + 3), 'happy'), x, y - 12, 26) : tops.svg ? `<g transform="translate(${x} ${y}) scale(${fs})">${col(tops.svg, { c: hsl(s.hue + 140 + j * 40, 75, 60), d: c.d, l: c.l })}</g>` : ''; }
    spots(s.layout, n, t, r).forEach(([x, y], i) => { const f = CD.fruits[s.fruit2 && i % 2 ? s.fruit2 : s.fruit] || CD.fruits.strawberry; g += `<g transform="translate(${x.toFixed(1)} ${(y - 2).toFixed(1)}) scale(${fs.toFixed(2)})">${f.svg}</g>`; });
    return `<svg class="art-cake" viewBox="0 0 ${W} 150" xmlns="http://www.w3.org/2000/svg" overflow="visible">${g}</svg>`;
  }
  function name(s, lang = 'zh') {
    const L = o => (o && (o[lang] || o.en)) || '', f = CD.fruits[s.fruit], f2 = s.fruit2 && CD.fruits[s.fruit2];
    if (lang === 'zh') return `${s.tiers > 1 ? s.tiers + ' 层' : ''}${L(CD.flavours[s.flavour])}${L(CD.styles[s.style])}${L(CD.shapes[s.shape])}，放 ${s.nFruit} 个${L(f)}${f2 && f2 !== f ? '和' + L(f2) : ''}`;
    return `${s.tiers > 1 ? s.tiers + '-tier ' : ''}${L(CD.flavours[s.flavour])} ${L(CD.styles[s.style])} ${L(CD.shapes[s.shape])} with ${s.nFruit} ${L(f)}${f2 && f2 !== f ? ' & ' + L(f2) : ''}`;
  }
  const api = { CAKE_VERSION, load: d => { CD = d; }, data: () => CD, random, draw, name, shapes: () => Object.keys(SHAPES) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MQCake = api;
})(typeof window !== 'undefined' ? window : globalThis);
