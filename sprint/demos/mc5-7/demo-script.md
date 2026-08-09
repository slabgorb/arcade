# Demo Script — mc5-7

**Total runtime: ~3 minutes**

**Scene 1 — Slide 1: Title (0:00–0:15)**
Open on the title slide ("Missile Command: Wave 1 Fidelity Fix — mc5-7"). One sentence: "We found and fixed a spot where our clone was easier than the original arcade game in its very first wave."

**Scene 2 — Slide 2: Problem (0:15–0:45)**
State the mismatch plainly: "The original 1980 Missile Command launches 12 enemy missiles in Wave 1. Ours was stopping at 8 — a 33% shorter opening wave." Show the two numbers side by side: **8** (old, wrong) vs. **12** (correct, matches the arcade ROM). Emphasize this is the difference between "8 missiles allowed on screen at once" and "12 total missiles scripted for the wave" — two different settings that got tangled together.

**Scene 3 — Slide 3: What We Built (0:45–1:30)**
Live demo: run the test suite to show the fix is verified.
```
npx vitest run --project missile-command -t "seeds the per-wave ICBM budget"
```
Narrate while it runs: "This test locks in that Wave 1 now launches exactly 12 missiles — matching the original — and confirms it's *not* the 8-missile on-screen cap, which is a separate, still-correct limit." Point out the pass in green output: `✓ seeds the per-wave ICBM budget to the wave-1 ICBWAV budget (12), NOT the NICBMS(8) on-screen cap`.

*Fallback if the live demo fails or the terminal isn't cooperating:* skip straight to a static slide showing the before/after test assertion — `expect(g.remaining).toBe(8)` (old, wrong) next to `expect(g.remaining).toBe(12)` (new, correct) — and narrate the same point from the slide instead.

**Scene 4 — Slide 4: Why This Approach (1:30–2:00)**
Explain the traceability: "We didn't guess — we went back to the original arcade machine's own source code, found the exact line that sets this number (`W3MAIN.MAC` line 5713), and matched it exactly. That's the standard we hold every constant in this game to."

**Scene 5 — Before/After (2:00–2:30)**
Show a simple two-column comparison:
| | Before | After |
|---|---|---|
| Wave 1 enemy missiles | 8 | 12 |
| Matches original arcade | No | Yes |
| On-screen missile cap (separate setting) | 8 (unchanged) | 8 (unchanged) |

Call out explicitly that the on-screen cap of 8 is untouched and correct — only the *total launched per wave* changed. This prevents anyone reading the slide from thinking the cap also moved to 12.

**Scene 6 — Roadmap (2:30–2:50)**
Transition to the Roadmap slide (see below).

**Scene 7 — Slide: Questions (2:50–3:00)**
Open the floor.
