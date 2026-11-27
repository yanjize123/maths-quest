# Maths Quest 🧭

Maths practice for UK Year 1 to GCSE (Year 11 Higher), as a static web page — nothing to install.

**Open:** https://yanjize123.github.io/maths-quest/ (classic) · https://yanjize123.github.io/maths-quest/quest.html (adventure)

- 180 question types (86 pure calculation), grouped into a question bank per school year and 7 areas (number, calculation, fractions/decimals/%, measurement, geometry, algebra & ratio, statistics & probability).
- **Placement test:** adaptive, per area; finds the year each area is secure up to.
- **My plan:** 60% school-year questions, 30% gap fillers from the placement result, 10% challenge.
- Wrong answers come back as "Bonus missions" (new numbers, same skill) after 2 and 6 questions.
- XP, levels, streaks, badges, daily goal.
- Progress is stored in the browser on each device (localStorage). Use ⚙️ → Download backup / Restore backup to move it.

- **Pure calculation:** about 68% of Practice questions are bare calculations (no words). Types follow the KS2 arithmetic paper (column +/−, short/long ×, short/long ÷, ×÷10/100/1000, decimals, fractions, % of, order of operations), the Chinese calculation sequence (mental facts, calculating cleverly, mixed operations, negatives, powers) and KS3/GCSE algebra (expand, collect, index laws, equations).
- **🧮 Sets of 10:** ten pure calculations from the chosen question bank, timed, with a personal best per bank.
- **✍️ Step by step:** order-of-operations calculations and linear equations, one line of working at a time. Every line is checked (same value / same solution as the line before); common slips are named (worked left to right instead of BIDMAS, sign not changed when moving a term, bracket not fully multiplied, subtracted instead of divided). Input is tolerant: × x * ·, ÷ : /, 3/4, 2 1/2, 3x, 2(x+1), [ ], ², 1,250, leading =, notes like (÷3). 💡 Next step suggests one line; Show me completes the working. No AI.

Files: `index.html` (interface), `engine.js` (question generators, answer checking, placement and selection logic), `steps.js` (line-by-line checker). Tests: `node tests/test_steps.js`, `node tests/test_gens.js`.

## Accounts and records (optional backend)

`backend/Code.gs` is a Google Apps Script for a Google Sheet. Once deployed, put its `/exec` URL in `config.js`; the page then asks for a login and records every session (login, last activity, logout, minutes) and every answer (time, area, topic, question, answer, correct, seconds, hint used) in the Sheet, and syncs progress across devices. Accounts and passwords are kept only in the private Sheet (tab `Users`).

## Adventure mode (`quest.html`, `game.js`)

Same question bank, login and records, with a game layer: islands per school year, 5-question levels with 1–3 stars, boss battles, a chest after every level (stickers/artefacts with rarity, duplicates become coins), a companion that grows with XP (dragon for Year ≤ 8, space rank for Year 9+), daily quests with a daily chest, day streaks with freeze cards, mistake monsters (the review queue), a golden chest bought with coins. Wrong answers get a hint and a second try (half coins and a "comeback" on success); no red crosses or lost lives.

## v2 — maths game (in progress, P-20261126-maths-game)

Everything for the game lives in `v2/`: https://yanjize123.github.io/maths-quest/v2/ is the Penguin Cupcakes shop (level 1: story + business loop — buy stock, bake, charge, profit, upgrades, chests; `mq_art.js` original SVG characters), `v2/test.html` the plain test page; the classic and adventure pages above and their `backend/Code.gs` and Google Sheet are unchanged. `v2/content/` (skills, misconceptions, level item templates) · `v2/rules.js` (misconception rules, diagnosis, fairy wrong answers) · `v2/mq_engine.js` (load content, seeded templates, check, BKT mastery, attempt rows) · `v2/mq_store.js` (save/load progress) · `v2/tests/` (`node v2/tests/test_content.js`, `node v2/tests/test_engine.js`). v2 uses its own Google Sheet: deploy `v2/backend/Code.gs` there (run `setup` once) and put the `/exec` URL in `v2/config.js`.
