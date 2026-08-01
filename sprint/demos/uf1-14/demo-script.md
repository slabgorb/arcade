# Demo Script — uf1-14

**Total runtime: ~4 minutes.** This is a fairness/correctness fix with no new visuals — the "demo" is proving the enemy-visibility rule now matches the screen, using the automated test suite as evidence plus a live look at the game running normally.

---

**Scene 1 — Slide 1: Title (0:00–0:15)**
Open on the title slide ("Star Wars Arcade: Fixing an Unfair Enemy-Fire Bug"). One sentence: "Enemies off-screen were still shooting you. Here's the fix, and how we proved it."

**Scene 2 — Slide 2: Problem (0:15–1:00)**
Advance to the Problem slide. Say: "Our game draws its 3D view differently depending on your screen's shape — but the rule that decides whether an enemy TIE fighter is 'visible enough to shoot you' was still using the shape of the original 1983 arcade cabinet's screen, not our screen." Point to the on-slide numbers: **15° band of sky above/below the screen** where enemies could fire despite being invisible to the player, and an **8.4° dead zone on ultrawide monitors** where visible enemies wrongly went silent.

**Scene 3 — Slide 3: What We Built (1:00–2:15)**
Advance to What We Built. This is the live-demo portion.
- Open a terminal and run:
  ```
  npx vitest run --project star-wars tests/core/tie-view-frustum.test.ts
  ```
  Narrate while it runs: "This is the new test suite built specifically for this fix — 11 tests, each one pinned to the real visible boundary at a different screen shape." Point out the pass count in the output (11 passed).
- Then run the full game suite to show nothing else broke:
  ```
  npx vitest run --project star-wars
  ```
  Call out the final line: **2046 tests passed, 0 failed.**
- **Fallback:** if the terminal demo fails to run (network hiccup, dependency issue, etc.), skip straight to Slide 5 (Before/After), which has a static screenshot of this same terminal output captured ahead of time — say "here's that same result captured earlier" and continue narrating from the screenshot.

**Scene 4 — Slide 4: Why This Approach (2:15–3:00)**
Advance to Why This Approach. Say: "We kept the original arcade game's rule style — same simple 'is this inside the beam?' check the 1983 machine used — and only corrected the beam's shape to match our screen instead of theirs. Smallest possible change, and we proved it with live gameplay reproductions, not just code review: before the fix, an enemy above the visible screen fired 30 times in an 160-frame window at a player who couldn't see it; after the fix, zero."

**Scene 5 — Slide 5: Before/After (3:00–3:30, optional/fallback-friendly)**
Show the four-screen-shape comparison table: ultrawide, widescreen, 4:3, square — old fixed 45° boundary vs. new screen-matched boundary at each. This slide doubles as the fallback for Scene 3 if the live terminal demo isn't available.

**Scene 6 — Slide 6: Roadmap (3:30–3:50)**
Advance to Roadmap. One line: "This was a prerequisite fix — two more stories already on the board build directly on top of this corrected rule."

**Scene 7 — Slide 7: Questions (3:50–4:00)**
Open the floor.
