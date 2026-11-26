/* Maths Quest — adventure layer: islands, levels, stars, chests, stickers, companion, daily quests, streaks.
   Pure logic on top of engine.js; state lives in st.game (saved with the learner state). */
(function (root) {
"use strict";
const MQ = root.MQ || (typeof require !== "undefined" ? require("./engine.js") : null);

const THEMES = {
  cute: {
    name: "cute", buddyLabel: "Your dragon", albumName: "Sticker album", itemName: "sticker",
    stages: [["🥚", "Mystery Egg", 0], ["🐣", "Hatchling", 60], ["🦎", "Baby Dragon", 200], ["🐲", "Young Dragon", 500], ["🐉", "Dragon", 1000], ["🐉👑", "Legendary Dragon", 2000]],
    items: {
      common: "🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🦆 🐝 🐞 🍓 🍩 🍦".split(" "),
      rare: "🦄 🐙 🦋 🐢 🦕 🦖 🐬 🐳 🦜 🦩 🦔 🦥".split(" "),
      epic: "🐉 🌈 🏆 👑 💎 🔮 🪐 🦚".split(" "),
    },
    cheer: ["Amazing! 🌟", "You did it! 🎉", "Super star! ⭐", "Brilliant brain! 🧠", "Wow, well done! 💪", "Fantastic! 🦄", "Yes!! 🎈"],
    almost: ["Almost! Have a look at the hint and try again 💡", "So close! You can do this 🌱", "Nearly there — one more try! 🍀", "Good thinking — let's try once more 🐾"],
    learn: ["That's a tricky one. Here's how it works — you'll get it next time 🌈", "Great effort! Now you know the trick 💡", "Every mistake makes your brain stronger 🧠"],
    comeback: ["Comeback! 🔄 You fixed it!", "You figured it out! 🧩", "Never give up — and you didn't! 💪"],
    buddyTalk: ["Let's do this! 🐾", "I believe in you!", "Take your time 🙂", "You're getting stronger!", "Ooh, I like this one!"],
    bg: "radial-gradient(circle at 20% 0,#3b2a7a,#1a1340 60%)", acc: "#ffcf4d", card: "#2a2160",
  },
  space: {
    name: "space", buddyLabel: "Your rank", albumName: "Artefact collection", itemName: "artefact",
    stages: [["🧑‍🚀", "Cadet", 0], ["🧑‍🚀☆", "Ensign", 60], ["🧑‍🚀★", "Lieutenant", 200], ["🧑‍🚀★★", "Commander", 500], ["🧑‍🚀★★★", "Captain", 1000], ["🧑‍🚀🌟", "Admiral", 2000]],
    items: {
      common: "🌑 🌒 🌓 🌔 🌕 🌖 🌗 🌘 ☄️ 🌠 ⭐ 🌟 🛰️ 📡 🔭 🧪 🧲 🔋".split(" "),
      rare: "🪐 🌍 🌎 🌏 🌙 🛸 👽 🚀 🌌 🧭".split(" "),
      epic: "🌞 💫 🕳️ 🧬 ⚛️ 🏅 💠".split(" "),
    },
    cheer: ["Correct. Nice work.", "Clean solution ✔", "Spot on.", "Precise. +XP", "Well calculated.", "Mission objective complete ✔"],
    almost: ["Not quite — check the hint and have another go.", "Close. One more attempt.", "Recalculate — use the hint."],
    learn: ["Here's the method — worth remembering for the exam.", "Logged for review. You'll see this type again soon.", "Useful one to learn from."],
    comeback: ["Recovered ✔ Second-attempt solve.", "Corrected course ✔", "Fixed it — that's how learning works."],
    buddyTalk: ["Systems ready.", "Steady pace.", "Focus on the method.", "Good progress, Cadet."],
    bg: "radial-gradient(circle at 80% 0,#12345a,#060b1d 65%)", acc: "#5ee0ff", card: "#10203f",
  },
};
const themeFor = year => (year >= 9 ? "space" : "cute");
const choice = a => a[Math.floor(Math.random() * a.length)];
const dayStr = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const today = () => dayStr(new Date());
const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayStr(d); };
const daysBetween = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 86400000);

function gstate(st) {
  st.game = Object.assign({ coins: 0, stickers: {}, stars: {}, boss: {}, daily: null, streakDays: 0, lastDay: "", freezes: 1, chests: 0, comebacks: 0, monsters: 0, sound: true, totalStars: 0 }, st.game || {});
  return st.game;
}

// ---- map
function islandGens(y) { return MQ.YEARS[y].slice(); }
function islandFrac(g, y) { const gs = islandGens(y); return gs.filter(x => (g.stars[x] || 0) > 0).length / gs.length; }
function islandOpen(g, school, y) { if (y <= school + 1) return true; return islandOpen(g, school, y - 1) && islandFrac(g, y - 1) >= 0.5; }
function levelOpen(g, school, y, i) {
  if (!islandOpen(g, school, y)) return false;
  if (y < school) return true;
  if (i < 2) return true;
  const gs = islandGens(y);
  return (g.stars[gs[i - 1]] || 0) > 0 || (g.stars[gs[i]] || 0) > 0;
}
function bossOpen(g, school, y) { return islandOpen(g, school, y) && islandFrac(g, y) >= 0.5; }
function nextLevel(g, school) {
  for (const y of [school, school + 1, school - 1].filter(v => v >= 1 && v <= 11)) {
    const gs = islandGens(y);
    let i = gs.findIndex((x, k) => levelOpen(g, school, y, k) && !(g.stars[x] > 0));
    if (i < 0) i = gs.findIndex((x, k) => levelOpen(g, school, y, k) && (g.stars[x] || 0) < 3);
    if (i >= 0) return { y, gen: gs[i], i };
  }
  const gs = islandGens(school); return { y: school, gen: choice(gs), i: 0 };
}
function starsFor(score, total) { const f = score / total; return f >= 0.9 ? 3 : f >= 0.6 ? 2 : f >= 0.3 ? 1 : 0; }

// ---- rewards
function rollRarity(w) { const r = Math.random() * (w[0] + w[1] + w[2]); return r < w[0] ? "common" : r < w[0] + w[1] ? "rare" : "epic"; }
function rollItem(g, theme) { return null; }
function openChest(g, themeName, kind, stars) {
  const T = THEMES[themeName];
  const weights = { level: [[78, 20, 2], [70, 25, 5], [58, 33, 9], [45, 40, 15]][stars || 0], boss: [30, 50, 20], monster: [55, 35, 10], daily: [35, 45, 20], golden: [0, 65, 35] }[kind] || [70, 25, 5];
  const n = kind === "daily" || kind === "boss" ? 2 : 1;
  const out = [];
  for (let k = 0; k < n; k++) {
    const rar = rollRarity(weights), e = choice(T.items[rar]);
    const isNew = !g.stickers[e];
    g.stickers[e] = (g.stickers[e] || 0) + 1;
    let coins = 0;
    if (!isNew) { coins = { common: 5, rare: 15, epic: 40 }[rar]; g.coins += coins; }
    out.push({ emoji: e, rarity: rar, isNew, coins });
  }
  g.chests++;
  return out;
}
function albumTotal(themeName) { const I = THEMES[themeName].items; return I.common.length + I.rare.length + I.epic.length; }
function stage(themeName, xp) {
  const S = THEMES[themeName].stages; let i = 0;
  while (i + 1 < S.length && xp >= S[i + 1][2]) i++;
  const next = S[i + 1];
  return { icon: S[i][0], name: S[i][1], idx: i, next: next ? next[2] : null, from: S[i][2], pct: next ? Math.round(100 * (xp - S[i][2]) / (next[2] - S[i][2])) : 100 };
}

// ---- days & quests
function touchDay(g) {
  const t = today();
  if (g.lastDay === t) return null;
  let ev = "start";
  if (!g.lastDay) g.streakDays = 1;
  else {
    const gap = daysBetween(g.lastDay, t);
    if (gap === 1) { g.streakDays++; ev = "up"; }
    else if (gap === 2 && g.freezes > 0) { g.freezes--; g.streakDays++; ev = "freeze"; }
    else { g.streakDays = 1; ev = "reset"; }
  }
  g.lastDay = t;
  if (g.streakDays > 0 && g.streakDays % 7 === 0 && ev !== "reset") g.freezes = Math.min(3, g.freezes + 1);
  return ev;
}
const QUEST_POOL = {
  answer: { label: n => `Answer ${n} questions`, target: [10, 12, 15] },
  combo: { label: n => `Get ${n} right in a row`, target: [4, 5] },
  stars: { label: n => `Earn ${n} stars`, target: [3, 4, 5] },
  levels: { label: n => `Finish ${n} levels`, target: [2, 3] },
  monster: { label: n => `Defeat ${n} mistake monsters`, target: [2, 3] },
  comeback: { label: n => `Fix ${n} answer${n > 1 ? "s" : ""} on the second try`, target: [1, 2] },
};
function ensureDaily(g, monstersAvailable) {
  const t = today();
  if (g.daily && g.daily.day === t) return g.daily;
  const pool = ["combo", "stars", "levels", "comeback"].concat(monstersAvailable >= 2 ? ["monster", "monster"] : []);
  const picked = ["answer"];
  while (picked.length < 3) { const c = choice(pool); if (!picked.includes(c)) picked.push(c); }
  g.daily = { day: t, claimed: false, quests: picked.map(k => { const n = choice(QUEST_POOL[k].target); return { k, n, prog: 0, label: QUEST_POOL[k].label(n) }; }) };
  return g.daily;
}
function bump(g, k, v, mode) {
  if (!g.daily || g.daily.day !== today()) return [];
  const done = [];
  for (const q of g.daily.quests) if (q.k === k && q.prog < q.n) {
    q.prog = mode === "max" ? Math.max(q.prog, v) : q.prog + v;
    if (q.prog >= q.n) { q.prog = q.n; done.push(q.label); }
  }
  return done;
}
const dailyDone = g => !!g.daily && g.daily.quests.every(q => q.prog >= q.n);

const GAME = { THEMES, themeFor, gstate, islandGens, islandFrac, islandOpen, levelOpen, bossOpen, nextLevel, starsFor, openChest, albumTotal, stage, touchDay, ensureDaily, bump, dailyDone, today };
if (typeof module !== "undefined" && module.exports) module.exports = GAME; else root.GAME = GAME;
})(typeof window !== "undefined" ? window : globalThis);
