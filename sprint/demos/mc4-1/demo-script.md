# Demo Script — mc4-1

**Total runtime: ~6 minutes**

**Scene 1 — Slide 1: Title (0:00–0:20)**
Say: "Today I'm walking through a fix to Missile Command's difficulty ramp — story mc4-1, the speed fix." Advance to Slide 2; no live demo needed here.

**Scene 2 — Slide 2: Problem (0:20–1:30)**
Narrate: "Every wave played at the same, hardest speed — no ramp-up at all — and the player's own missile moved no faster than the enemy's, so defending a city was a coin-flip." Show the concrete before-number: at the old hardcoded speed, a missile crossed the ~222-unit-tall field in roughly **3.6 seconds on wave 1 and wave 15 alike** — a brand-new player and a fifteen-wave veteran faced the identical, hardest speed.

**Scene 3 — Slide 3: What We Built (1:30–3:00)**
Live demo:
```bash
npx vitest run --project missile-command tests/wave.test.ts tests/icbm-velocity.test.ts tests/abm-outruns-icbm.test.ts
```
Narrate while it runs: "This is the wave schedule and the speed fix, tested directly against the numbers pulled from the original game's code." Call out on screen once green:
- Wave 1 ICBM descent velocity ≈ **0.17 units/tick**, ramping monotonically to **1.0 units/tick by wave 15** — that ceiling is the single flat speed the old code ran at on every wave.
- The per-wave missile count table, straight from the ROM: wave 1 launches **12** missiles, wave 2 **15**, wave 3 **18**, easing down to **10 on wave 8**, climbing back up to **20 by wave 19+**.
- ABM (player) speed is now **3 units/tick**, versus an ICBM's max of **1 unit/tick** — a **3:1** speed advantage, matching the original cabinet.

**Fallback if the live test run fails or vitest isn't available:** Skip straight to Slide 5 (Before/After) — it has the same numbers pre-rendered as a static table, so the story lands without the terminal.

**Scene 4 — Slide 4: Why This Approach (3:00–4:00)**
Say: "We didn't guess these numbers — we read them out of the original 1980 game's source code, and every new constant in this change cites the exact source line it came from." Show the audit trail live:
```bash
head -20 plugins/missile-command/docs/rom-study/claims/wave.json
```
Point at the `"source": {"file": "W3MAIN.MAC", "line": 5713, "verbatim": "ICBWAV:\t.BYTE 12.,15.,18.,..."}` block — that's the literal line of 1980 assembly this table was copied from, byte for byte.

**Fallback if the terminal isn't handy:** Show Slide 4's bullet on "40+ cited constants" and move on — the point is made verbally.

**Scene 5 — Slide 5: Before/After (4:00–4:45)**
Walk the table below on screen. Emphasize the two headline rows: field-crossing time (flat 3.6s at every wave → wave-dependent, slowest on wave 1) and the ABM-vs-ICBM speed ratio (1:1 tie → 3:1 in the player's favor).

**Scene 6 — Slide 6: Roadmap (4:45–5:30)**
Say: "This unlocks the next piece of work, which actually spawns each wave's missiles using this schedule — the research is done, that story is just wiring it in." Mention the open question: the exact difficulty numbers for the later hardware revision (REV-03) aren't available in our source tree yet, so this ships the earlier revision's numbers with that gap explicitly documented, not silently guessed.

**Scene 7 — Slide 7: Questions (5:30–6:00)**
Open the floor.
