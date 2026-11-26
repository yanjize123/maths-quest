# Maths Quest 🧭

Maths practice for UK Year 1 to GCSE (Year 11 Higher), as a static web page — nothing to install.

**Open:** https://yanjize123.github.io/maths-quest/

- 126 question types, grouped into a question bank per school year and 7 areas (number, calculation, fractions/decimals/%, measurement, geometry, algebra & ratio, statistics & probability).
- **Placement test:** adaptive, per area; finds the year each area is secure up to.
- **My plan:** 60% school-year questions, 30% gap fillers from the placement result, 10% challenge.
- Wrong answers come back as "Bonus missions" (new numbers, same skill) after 2 and 6 questions.
- XP, levels, streaks, badges, daily goal.
- Progress is stored in the browser on each device (localStorage). Use ⚙️ → Download backup / Restore backup to move it.

Files: `index.html` (interface), `engine.js` (question generators, answer checking, placement and selection logic).

## Accounts and records (optional backend)

`backend/Code.gs` is a Google Apps Script for a Google Sheet. Once deployed, put its `/exec` URL in `config.js`; the page then asks for a login and records every session (login, last activity, logout, minutes) and every answer (time, area, topic, question, answer, correct, seconds, hint used) in the Sheet, and syncs progress across devices. Accounts and passwords are kept only in the private Sheet (tab `Users`).
