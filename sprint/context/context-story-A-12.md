# Story A-12 Context

## Title
Small saucer — aimed fire + accuracy ramp after 35000 pts

## Metadata
- **Story ID:** A-12
- **Type:** story
- **Points:** 5
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** asteroids
- **Epic:** Asteroids — faithful 1979 vector clone

## Problem
A-11 landed one saucer variant: large, random fire, spawned by a countdown
director. Real Asteroids alternates between large and small saucers as
score climbs, and the small saucer's signature behavior — aiming at the
player, with its accuracy sharpening once the player's score crosses
35,000 — is one of the game's most famous difficulty knobs (and, per the
historical record, the trigger for the "lurking" exploit that got arcade
operators complaining to Atari). A-12 adds the size distinction and the
aimed-fire math on top of A-11's movement/spawn/bullet plumbing, which is
reused unchanged. 5 points because the aim-angle computation and the
score-gated accuracy ramp are the meat of the story, and both need careful
seeded tests to prove determinism and pin the 35,000 threshold precisely.

## Technical Approach

**Research pass (same two disassembly sources as A-11, re-queried for
saucer type mix and aimed-fire specifics, plus one corroborating web
search — 3rd fetch budget used on the search, not a third page fetch).**

- **Accuracy ramp at 35,000 — strongly corroborated.** Both fetched
  disassembly sources, independently, found a comparison of the player's
  score against `$35` (35,000) gating between two different random-error
  masks applied to the aimed-fire angle: a wider mask below the threshold,
  a narrower one at/above it. This is an exact match for the epic's stated
  fact and the strongest-corroborated finding in this pass. The two
  sources' specific mask byte values disagree (`8F`/`70 78` vs
  `8F`/`87`/`3D`/`CF` across the excerpts) — the *existence and threshold*
  of the ramp is solid; the *exact error magnitude* is not. Model as two
  named angular-error bounds, narrower one strictly smaller.
- **Aim computation — corroborated in mechanism.** Both sources describe a
  routine (`CalcScrShotDir`/angle-to-ship, called from the fire path) that
  computes a direction from saucer to ship, then adds a bounded random
  error before writing the final shot direction. One source additionally
  describes computing the delta against the ship's *next-frame* predicted
  position (`NextScrShpDist`) rather than its current position — i.e. a
  slight leading of the target. The second source doesn't corroborate this
  lead detail. Given the shakiness, ship the simpler "aim at current ship
  position" model and leave leading as a named, disabled provisional flag
  for A-17 to enable if the quarry confirms it.
- **Large/small mix — this is where the brief and the primary sources
  disagree, and where a corroborating web search resolves it.** Both
  disassembly fetches locate a score comparison against `$30` (30,000,
  BCD) gating the *start* of small-saucer eligibility, computed by drawing
  a random number and comparing it against half the current spawn-reload
  value — i.e., a **graduated, difficulty-linked probability**, not a hard
  score cliff, starting around 30,000. Neither raw disassembly excerpt
  surfaced a hard "small-only above 40,000" cutover. A follow-up web search
  (independent of the two disassembly sites) *does* corroborate the epic's
  stated "above 40,000 only small saucers spawn" as commonly documented
  community knowledge. Reading both together: the mix most plausibly
  **starts shifting toward small around 30,000 and saturates to
  small-only by 40,000** — the two data points aren't contradictory once
  read as the two ends of a ramp rather than two competing single
  thresholds, but the interpolation shape in between is not confirmed by
  any source fetched here. Model as a score-linear ramp between two named
  constants (simplest TDD-safe shape) and flag the interpolation itself as
  provisional.
- **Scoring value discrepancy noted, not resolved here.** Both disassembly
  fetches, plus the web search, converge on the small saucer's raw ROM
  byte as `$99` BCD (→ 990 displayed, at the epic's stated ×10 scaling) —
  not the 1000 the epic and this story's own title state. This story does
  not wire scoring (A-13/A-9 do), so it isn't resolved here, but it's
  flagged loudly for A-9/A-13 since it surfaced during this research pass.
  See A-13's context for the full writeup.

| Constant | Provisional value | Status |
|---|---|---|
| `SAUCER_MIX_SCORE_START` (score where small-saucer probability begins rising) | 30,000 | corroborated by both fetched disassembly sources (`CMP #$30`) — **verify vs quarry** |
| `SAUCER_MIX_SCORE_ALL_SMALL` (score at/above which only small spawns) | 40,000 | corroborated by secondary/community sources (web search), **not found in either raw disassembly excerpt fetched for this story** — flagged discrepancy, verify vs quarry |
| `SAUCER_MIX_PROBABILITY_FN` (interpolation shape between the two) | simple score-linear ramp, 0%→100% small | not confirmed by any source; one disassembly excerpt suggests a difficulty-linked (spawn-reload-based) shape instead, a genuinely different mechanism — ship the simple linear model behind a named function so A-17 can swap the mechanism without touching callers |
| `ACCURACY_ERROR_COARSE` (max aim error, radians, below 35,000) | feel-based (e.g. wide cone) | ramp mechanism + 35,000 threshold **strongly corroborated** by both sources; exact angle not confirmed — verify vs quarry |
| `ACCURACY_ERROR_FINE` (max aim error, radians, at/above 35,000) | feel-based, strictly `<` `ACCURACY_ERROR_COARSE` | same corroboration as above; exact angle provisional |
| `SAUCER_AIM_LEADS_TARGET` (aim at predicted next position vs current) | `false` | one source only (`NextScrShpDist`), not cross-checked — provisional, defaulted off, verify vs quarry |

**Code shape.**
- Extend `Saucer` (from A-11) with `size: 'large' | 'small'`, set at spawn
  time by the spawn director (extended, not replaced).
- `chooseSaucerSize(score, rng) → 'large' | 'small'` in `core/saucer.ts` —
  pure function implementing `SAUCER_MIX_PROBABILITY_FN` between
  `SAUCER_MIX_SCORE_START` and `SAUCER_MIX_SCORE_ALL_SMALL`; below the
  start threshold always returns `'large'`; at/above the all-small
  threshold always returns `'small'`.
- `aimAtShip(saucerPos, shipPos) → angle` — pure trig (`atan2`), no error
  applied; the base-aim building block, unit-testable in isolation from the
  RNG error step.
- `accuracyErrorBound(score) → number` — pure function returning
  `ACCURACY_ERROR_COARSE` or `ACCURACY_ERROR_FINE` based on the 35,000
  threshold.
- `fireSaucer` from A-11 extended (not duplicated): when `saucer.size ===
  'small'`, replaces the random heading with `aimAtShip(...) +
  (nextFloat(rng) * 2 - 1) * accuracyErrorBound(state.score)`; large
  saucers keep A-11's raw-random heading unchanged. Bullet cadence/cap/
  lifetime plumbing is reused verbatim from A-11 — no new bullet mechanics
  in this story.

**Standing epic ACs, restated:** determinism (fixed seed + fixed dt, no
wall-clock/`Math.random` in `core/`); A-2's banned-globals guard continues
to cover the extended `core/saucer.ts` automatically.

## Scope
- **In scope:** `Saucer.size` field; `chooseSaucerSize` spawn-mix logic
  (score-linear ramp between the two named thresholds); `aimAtShip` +
  `accuracyErrorBound` + wiring into `fireSaucer` for the aimed/ramped
  small-saucer case; the provisional constants table above as named
  exports; Vitest coverage for spawn-mix selection, base aim angle, and the
  accuracy-ramp bound on both sides of 35,000.
- **Out of scope:** scoring on saucer kill, collision detection, siren
  state hook (A-13, including the 990-vs-1000 scoring resolution flagged
  above); saucer rendering/shape differences between sizes (A-17/A-5);
  sound (A-18); any movement/spawn-cadence/bullet-cap mechanics beyond size
  selection — those are A-11's and are reused unchanged; confirming the
  exact interpolation shape of the mix ramp beyond its two endpoints (ship
  the simple linear model, verify against quarry in A-17).

## Acceptance Criteria
- Fixed-seed spawn-mix script: with `state.score` pinned below 30,000, the
  director always selects `'large'`; pinned at/above 40,000, always
  selects `'small'`; at intermediate scores, selection follows the
  RNG-driven ramp deterministically for a given seed (golden-sequence
  assertion across many spawns).
- `aimAtShip` test: given a fixed saucer position and fixed ship position,
  the returned angle points from saucer to ship within floating-point
  tolerance (independent of RNG — no error term at this layer).
- Accuracy-ramp test: with the same RNG seed/script and only `state.score`
  varied across the 35,000 boundary, the applied error is bounded by
  `ACCURACY_ERROR_COARSE` below the threshold and by the strictly smaller
  `ACCURACY_ERROR_FINE` at/above it — assert the bound (not exact
  equality, since the error term is RNG-drawn) across many fire events in
  one fixed-seed deterministic script.
- Large saucers spawned under this story's extended director still fire
  pure-random headings (A-11 behavior unchanged) — regression check that
  size selection doesn't leak aiming into the large variant.
- Determinism: identical seed + score fixture + `dt` script produce
  deeply-equal resulting state / bullet headings (mirrors A-2's AC); no
  wall-clock/`Math.random` in `core/saucer.ts` additions (A-2 guard).
- `npm run build` (`tsc --noEmit && vite build`) is clean and `npm test`
  (Vitest) is green.

---
_Generated by `pf context create story A-12` from the sprint YAML._
_Enriched by Architect (Goldstein): aimed-fire/accuracy-ramp design and spawn-mix strategy, from a research pass across computerarcheology.com/Arcade/Asteroids/Code.html, 6502disassembly.com/va-asteroids/Asteroids.html, and one corroborating web search — the 35,000 accuracy-ramp threshold is strongly corroborated; the large/small mix is reconciled as a 30,000→40,000 ramp (disassembly gives 30,000 as a difficulty-linked start, community sources give 40,000 as the all-small saturation point); the 990-vs-1000 small-saucer scoring conflict is flagged for A-13/A-9, not resolved here._
