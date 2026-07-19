**Total runtime: ~4 minutes**

**Scene 1 — Slide 1: Title (0:00–0:15)**
Say: "This is a housekeeping story — no new features, no visual changes. It's about removing dead code left behind by last week's TIE fighter AI upgrade."

**Scene 2 — Slide 2: Problem (0:15–1:00)**
Say: "When we wired in the new enemy flight AI, it replaced an older, simpler flight system — but three data fields, one difficulty setting, and one duplicated formula got left behind, still sitting in the code looking active but doing nothing. The biggest one: a 'later waves fly faster' difficulty setting had silently stopped working — it was writing to a variable nothing read anymore."
Show: the `ENEMY_SPEED` constant definition and its stale comment block (before state), highlighting the line `export const ENEMY_SPEED = 10000` — call out that it fed a field (`vel`) with zero consumers.

**Scene 3 — Slide 3: What We Built (1:00–2:15)**
Terminal command (from the `star-wars` subrepo):
```bash
cd star-wars
git show 68e8a7f:tests/core/tie-flight-cleanup.test.ts | head -60
```
This shows the new pinning test file (`tie-flight-cleanup.test.ts`, 13 tests) that proves each dead field is gone and behavior is unchanged. Point to test names like `no 'bank' field`, `no 'peeling' field`, `waveParams no longer returns an 'enemySpeed'`, and the preservation guard `difficulty STILL escalates with the wave`.

Then run:
```bash
npm test -- tie-flight-cleanup
```
Expected output: `13 passed (13)`. If the live run fails or the environment isn't set up, fall back to **Slide 3a (screenshot)**: a pre-captured terminal screenshot of this exact green run (capture before the demo as a safety net).

**Scene 4 — Slide 4: Why This Approach (2:15–2:45)**
Say: "We chose to *retire* the broken speed ramp rather than fix it, because fixing it correctly means reverse-engineering the original arcade hardware's exact speed curve and play-testing it — that's a separate, bigger project. This story's job was cleanup, not new tuning."

**Scene 5 — Before/After (2:45–3:15)**
Show the before/after code diff for `src/core/state.ts` side-by-side (see Before/After section below). Point out the `Enemy` interface shrinking from 3 dead fields to a clean data shape.
Fallback: static before/after slide with the two code snippets already pasted in, if live diff tooling isn't available.

**Scene 6 — Roadmap (3:15–3:40)**
Say: "This closes out a known follow-up from PR #110. One related item — an unused 'fire interval' setting with the same symptom — was deliberately left alone and flagged for a future cleanup story, since it wasn't in this story's scope."

**Scene 7 — Questions (3:40–4:00)**
Open floor.