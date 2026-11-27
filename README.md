# Maths Quest 🧭

Maths practice for UK Year 1 to GCSE (Year 11 Higher), as a static web page — nothing to install.

**Open:** https://yanjize123.github.io/maths-quest/ (classic) · https://yanjize123.github.io/maths-quest/quest.html (adventure)

- 216 question types (122 pure calculation), grouped into a question bank per school year and 7 areas (number, calculation, fractions/decimals/%, measurement, geometry, algebra & ratio, statistics & probability).
- **Placement test:** adaptive, per area; finds the year each area is secure up to.
- **My plan:** 60% school-year questions, 30% gap fillers from the placement result, 10% challenge.
- Wrong answers come back as "Bonus missions" (new numbers, same skill) after 2 and 6 questions.
- XP, levels, streaks, badges, daily goal.
- Progress is stored in the browser on each device (localStorage). Use ⚙️ → Download backup / Restore backup to move it.

- **Pure calculation:** about 68% of Practice questions are bare calculations (no words). Types follow the KS2 arithmetic paper (column +/−, short/long ×, short/long ÷, ×÷10/100/1000, decimals, fractions, % of, order of operations), the Chinese calculation sequence (mental facts, calculating cleverly, mixed operations, negatives, powers) and KS3/GCSE algebra (expand, collect, index laws, equations).
- **🧮 Sets of 10:** ten pure calculations from the chosen question bank, timed, with a personal best per bank.
- **✍️ Step by step:** order-of-operations calculations and linear equations, one line of working at a time. Every line is checked (same value / same solution as the line before); common slips are named (worked left to right instead of BIDMAS, sign not changed when moving a term, bracket not fully multiplied, subtracted instead of divided). Input is tolerant: × x * ·, ÷ : /, 3/4, 2 1/2, 3x, 2(x+1), [ ], ², 1,250, leading =, notes like (÷3). 💡 Next step suggests one line; Show me completes the working. No AI.

- **🔢 Column (竖式):** written methods digit by digit — column + and −, short and long ×, division by 1 or 2 digits (zeros in the quotient, remainders), short division. Rows are checked as they are filled; slips are named (quotient digit too big/small, multiplied/subtracted wrongly, forgot to bring down, forgot to carry, smaller-from-bigger). One layout for Chinese 竖式 and English long division; the placeholder 0 is optional. Division comes up twice as often.
- **Step by step** also covers inequalities (sign flip when × ÷ by a negative) and simultaneous equations (any line true for the answer is accepted).
- **📒 Progress → 📊 Report:** every answer is logged (type, mode, right/wrong, time, hint, mistake types). Report: 7/30-day totals, weekly accuracy, weak spots with a target, mistake types, level by area and next target.
- **中文 / EN** button (top right): same data, interface in Chinese or English (word problems without a pattern stay English).
- More types: missing numbers in any position (incl. remainders), comparing (< > =), rounding (dp, significant figures, up/down in context), estimating, fraction–decimal–percentage, laws of calculation, number pyramids, reading clocks (to 5 min, to the minute, 24-hour, time passed).

Files: `index.html` (interface), `engine.js` (question generators, answer checking, placement and selection logic), `steps.js` (line-by-line checker), `column.js` (written methods), `i18n.js` (Chinese/English). Tests: `node tests/test_steps.js`, `node tests/test_steps2.js`, `node tests/test_column.js`, `node tests/test_gens.js`.

## Accounts and records (optional backend)

`backend/Code.gs` is a Google Apps Script for a Google Sheet. Once deployed, put its `/exec` URL in `config.js`; the page then asks for a login and records every session (login, last activity, logout, minutes) and every answer (time, area, topic, question, answer, correct, seconds, hint used) in the Sheet, and syncs progress across devices. Accounts and passwords are kept only in the private Sheet (tab `Users`).

## Adventure mode (`quest.html`, `game.js`)

Same question bank, login and records, with a game layer: islands per school year, 5-question levels with 1–3 stars, boss battles, a chest after every level (stickers/artefacts with rarity, duplicates become coins), a companion that grows with XP (dragon for Year ≤ 8, space rank for Year 9+), daily quests with a daily chest, day streaks with freeze cards, mistake monsters (the review queue), a golden chest bought with coins. Wrong answers get a hint and a second try (half coins and a "comeback" on success); no red crosses or lost lives.

## v2 — maths game (in progress, P-20261126-maths-game)

Everything for the game lives in `v2/`: https://yanjize123.github.io/maths-quest/v2/ is the Penguin Cupcakes shop (level 1: story + business loop — buy stock, bake, charge, profit, upgrades, chests; `mq_art.js` original SVG characters), `v2/test.html` the plain test page; page v007 adds random events (`v2/mq_play.js`: monster raids fought with maths and a weapon, monster-card book, animal helpers, rush hour, layer-cake orders; questions come from the classic `engine.js`), drawn by the procedural SVG library `v2/mq_gen.js` (seeded monsters, animals, cakes, weapons, element effects) with data in `v2/content/game_data.json`; `v2/tests/play_harness.html` plays it automatically in headless Chrome; the classic and adventure pages above and their `backend/Code.gs` and Google Sheet are unchanged. `v2/content/` (skills, misconceptions, level item templates) · `v2/rules.js` (misconception rules, diagnosis, fairy wrong answers) · `v2/mq_engine.js` (load content, seeded templates, check, BKT mastery, attempt rows) · `v2/mq_store.js` (save/load progress) · `v2/tests/` (`node v2/tests/test_content.js`, `node v2/tests/test_engine.js`). v2 uses its own Google Sheet: deploy `v2/backend/Code.gs` there (run `setup` once) and put the `/exec` URL in `v2/config.js`.
