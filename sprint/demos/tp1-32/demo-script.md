**Total run time: ~6 minutes.**

**Scene 1 — 0:00–0:30 (Slide 1: Title)**
Open on the title slide: "Tempest: Keeping the Tunnel On-Screen (tp1-32)." One line: "A small camera-framing fix, verified against all 16 levels of the game."

**Scene 2 — 0:30–1:30 (Slide 2: Problem)**
State the problem with the concrete numbers: "Under the last release, 8 of the game's 16 tunnel shapes had part of their edge pushed off-screen. The worst offender, level 12, overshot the visible screen boundary by 87 units — landing at 447 units from center against a 360-unit hard edge." Show the before-state stat table:

| Level (shape) | Old shift (units from center) | Screen limit |
|---|---|---|
| 12 (worst) | 447.3 | ±360 |
| 8 wells total | clipped on at least one edge | — |

**Scene 3 — 1:30–3:00 (Slide 3: What We Built — live demo)**
Run the automated verification live:
```
cd tempest
npm test -- tests/core/tp1-32.framing-viewport.test.ts
```
Expected output: `5 passed (5)` — the suite checks all 16 tunnel shapes and confirms every one stays within the safe screen boundary. Call out the specific number on screen: worst-case level 12 now lands at **336.8 units**, inside the 340-unit safety line (which itself sits inside the 360-unit hard screen edge).

*Fallback:* if the local environment isn't set up or the test run fails to display cleanly, skip the live terminal and go straight to Slide 5 (Before/After) with the stat table above — the 447.3 → 336.8 comparison tells the same story without the terminal.

**Scene 4 — 3:00–4:00 (Slide 4: Why This Approach)**
Walk through the three options considered and why the "turn down the shift uniformly" choice won — it's the smallest change, and it's the only one of the three that keeps every level's distinct up/down framing intact (a hard ceiling would have made two levels look identical and broken an existing check).

**Scene 5 — 4:00–4:45 (optional Before/After slide)**
Show the full before/after picture: previously, the tunnel's near edge could land anywhere from 380 to 447 units from center depending on the level — all past the 360-unit screen edge. Now, every level lands at 336.8 units or less — comfortably inside the safe zone, with headroom confirmed for the animated transition between levels too.

*Note for presenter:* if attempting a live in-browser demo instead of/alongside the terminal, first confirm which checkout is serving `localhost:5273` (multiple local checkouts can claim the same port) — screenshotting someone else's server would misrepresent this fix.

**Scene 6 — 4:45–5:15 (Roadmap)**
See Roadmap & Integration section below.

**Scene 7 — 5:15–6:00 (Questions)**
Open floor.