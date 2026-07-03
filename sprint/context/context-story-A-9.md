# Story A-9 Context

## Title
Scoring 20/50/100 BCD, rollover 99990 + extra life at 10000

## Metadata
- **Story ID:** A-9
- **Type:** story
- **Points:** 2
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** asteroids
- **Epic:** Asteroids — faithful 1979 vector clone

## Problem
A-8 (collisions, still an unenriched skeleton as of this writing) will detect
bullet/ship-vs-rock hits and, per the epic's dependency chain, is expected to
turn a hit into a kill; nothing yet turns a kill into points. A-9 adds the
score itself: a pure `core/scoring.ts` value type that awards the established
per-kill point values (20/50/100 for large/medium/small rocks; 200 for the
large saucer and a disputed 990-vs-1000 for the small — see the ruling
below; saucer kill *wiring* is A-13), rolls the display
over at 99,990, and grants an extra life every 10,000 displayed points —
including when that boundary is crossed by the same addition that wraps the
score back through zero. Saucer accuracy in A-11–A-13 ramps at 35,000 points,
so `Score` is a load-bearing dependency for that later ramp, not just a HUD
number. A-5 (render foundation) is still an unenriched skeleton with no text/
vector-font seam, so there is nowhere to draw digits yet; A-9 stays
core-only — scoring logic and its tests, no on-screen score.

## Technical Approach

**Research pass (computerarcheology.com/Arcade/Asteroids/Code.html and
6502disassembly.com/va-asteroids/Asteroids.html, one fetch each).** Both
sources agree the score is stored as BCD — computerarcheology.com shows
`ply1ScoreThous` at `$0053` and the add routine at `$7397` ("JSR $7397 ; And
Add It To Score"); 6502disassembly.com shows `PlayerScores` at `$52`/`$54`,
two bytes per player. Two BCD bytes is 4 decimal digits (0–9999), which times
the established ×10 display scaling lands exactly on the documented 99,990
rollover ceiling — the "two BCD bytes" and "rolls at 99,990" facts are
mutually consistent, a useful cross-check that they're describing the same
mechanism.

Both sources also independently surfaced the same **discrepancy worth
flagging, not resolving here**: computerarcheology.com reads `LDA #$99 ; 990
Points, Assume Small Saucer`; 6502disassembly.com reads `SmallScrPnts .eq
$99` labeled "990 points" (large saucer's `$20`/"200 points" matches the
epic in both). `$99` BCD is 99 decimal, ×10 = **990**, not the epic's
originally stated 1,000. **Architect ruling (epic canon since updated):**
with three independent reads converging on `$99` → 990 — and the mechanical
argument that a single-byte BCD add cannot award 1,000 — `SAUCER_POINTS.small`
ships as **990, provisional**, the dispute documented inline, **final
settlement against the actual quarry bytes in A-17** (not another fetch-tool
summary). A-13 sources the constant from this module, so if A-17 overturns
it, the change lands in exactly one place.

Neither source shows the extra-life comparison or rollover-carry logic
byte-for-byte — both excerpts stop at "compare the score's high byte/
thousands digit against a threshold" (computerarcheology.com: `LDA
ply1ScoreThous,Y` / `CMP #$30`; 6502disassembly.com: compares
`PlayerScores+1` against threshold bytes) without showing what happens at a
threshold crossing or whether that logic special-cases a simultaneous
rollover. Extra-life-across-rollover is therefore **provisional** — see
below.

**Representation decision.** Model `Score` as the ROM's *internal* BCD value
(0–9999, one unit = 10 displayed points), not as a plain display-space
integer with a `% 100000` wraparound bolted on. The difference matters for
two quarry-faithful behaviors this story must produce:
- **Rollover falls out of the type's domain instead of being a separate
  check.** A plain `number` holding the display value (0–99999) with a
  manual `% 100000` would (a) roll at the wrong point — 100,000, not the
  ROM's 99,990 — and (b) admit display values like 99,995 that the real
  machine can never produce, since every scoring event is a multiple of 10.
  Storing the *internal* value and deriving `display = value * 10` makes
  "always a multiple of 10" and "rolls at 99,990" both structural, not
  asserted.
- **Extra-life detection uses the same digit comparison whether or not the
  addition also rolled the score over.** Comparing `floor(value / 1000) %
  10` before and after an addition detects a thousands-digit tick the same
  way regardless of whether the tick happened at 1000→2000 or at 9000
  wrapping through 0000. This is the concrete reason to prefer the
  BCD-shaped representation over modulo-on-display-value: the
  rollover-crossing case isn't a special case, it's the same digit-diff
  expression.

`Score` stays a plain pure value type in `core/scoring.ts` — no class, no
hidden mutation, matching A-2's `Rng`-style `{ field }` convention.

| Constant | Value | Status |
|---|---|---|
| `ROCK_POINTS.large/medium/small` | 20 / 50 / 100 | established (epic) |
| `SAUCER_POINTS.large/small` | 200 / 990 | large established; small **provisionally 990** per Architect ruling (three independent `$99` BCD reads; single-byte BCD add cannot award 1,000) vs. the commonly cited 1,000 — **settled against quarry bytes in A-17** |
| Internal modulus (`Score.value` range) | 10000 (4 BCD digits) | established — derived from "two BCD bytes" + "rolls at 99,990" being mutually consistent |
| Extra-life interval | 1000 internal / 10,000 displayed | established (epic) |
| Extra-life-across-rollover behavior | awarded (digit-diff formula treats a 9→0 thousands transition the same as any other) | **provisional — neither source shows the ROM's actual carry/threshold logic; verify against reference/ quarry (A-17)** |

**Code shape.**
- `core/scoring.ts`:
  - `interface Score { readonly value: number }` — internal units, 0–9999.
  - `INITIAL_SCORE: Score = { value: 0 }`.
  - `ROCK_POINTS`, `SAUCER_POINTS` — established display-point tables above.
  - **Seam reconciled (Architect ruling — supersedes this story's earlier
    proposed `KillEvent`):** A-8's context is now enriched and owns the
    event union — `CollisionEvent` in `core/collisions.ts` (`rockDestroyed`
    with size, `shipDestroyed`, and a forward-declared `saucerDestroyed`
    that only A-13 will emit), surfaced per tick on `state.pendingEvents`.
    A-9 defines **no parallel event type**; instead
    `pointsForKill(event: CollisionEvent): number | null` maps
    `rockDestroyed` through `ROCK_POINTS`, `saucerDestroyed` through
    `SAUCER_POINTS`, and returns `null` for the score-neutral
    `shipDestroyed` (A-15's concern) — one event vocabulary across
    A-8/A-9/A-13/A-15.
  - `addPoints(score: Score, points: number): { score: Score; extraLives:
    number }` — validates `points % 10 === 0` (throws otherwise — every
    established point value is a multiple of 10; a non-multiple input is a
    caller bug, not a reachable game state), computes the before/after
    thousands-digit as described above, returns a *new* `Score` (never
    mutates the input) plus the count of extra lives earned by this single
    addition.
  - `applyKill(score: Score, event: CollisionEvent): { score: Score;
    extraLives: number }` — thin wrapper composing `pointsForKill` +
    `addPoints` (identity, zero extra lives, on score-neutral events); the
    function the `state.pendingEvents` consumer actually calls.
  - `displayScore(score: Score): number` — `value * 10`, the only place ×10
    happens; nothing else in `core/` should read `.value` directly once a
    display number is needed.
- `core/state.ts`: `GameState.score` — a plain placeholder number under
  A-2 — becomes `Score`; `initialState()` seeds it with `INITIAL_SCORE`.
  `GameState.lives` (already part of A-2's wave/score/lives triad) gains
  `+= extraLives` wherever a kill is applied.
- `core/sim.ts`: A-8 lands before this story and surfaces `CollisionEvent`s
  on `state.pendingEvents` each tick — wire a fold of `applyKill` over those
  events into `stepGame` (score updated, earned `extraLives` added to
  `state.lives`). Tests exercise `addPoints`/`applyKill` directly for the
  arithmetic, plus one integration case through `stepGame` with a synthetic
  `pendingEvents` batch.

**Standing epic ACs, restated:** determinism is automatic here —
`core/scoring.ts` has no RNG and no wall-clock dependency, so every test is
deterministic by construction (no seed/dt fixture needed for the arithmetic
itself); A-2's banned-globals guard test covers the new file for free.

## Scope
- **In scope:** `core/scoring.ts` (`Score`, `INITIAL_SCORE`, `ROCK_POINTS`,
  `SAUCER_POINTS`, `pointsForKill`/`applyKill` typed over A-8's
  `CollisionEvent`, `addPoints`, `displayScore`); the `stepGame` fold over
  `state.pendingEvents`; extending `GameState.score` from A-2's placeholder
  `number` to `Score`, and wiring `GameState.lives` to accept extra-life
  increments; Vitest coverage for rollover, extra-life (including
  across-rollover), and the multiple-of-10 invariant guard.
- **Out of scope:** any on-screen rendering of the score (A-16, or a
  digit-stub if one lands earlier — no text/vector-font renderer exists yet,
  per A-5 still being an unenriched skeleton); the collision detection that
  produces real `KillEvent`s (A-8); saucer kill detection itself (A-13) —
  A-9 only defines the point table saucers will use; the 35,000-point
  saucer-accuracy ramp read (A-11–A-13) — A-9 only guarantees
  `Score`/`displayScore` are available to read.

## Acceptance Criteria
- `addPoints` applied to a fixed sequence of the exported table values (20,
  50, 100, 200, 990 in that order) from `INITIAL_SCORE` produces an exact,
  hand-computed `value`/`displayScore` sequence (golden test) — no seed
  needed, `core/scoring.ts` has no RNG.
- Rollover: seeding `Score` at `{ value: 9990 }` (displayed 99,900) and
  applying a 100-point kill (`+10` internal) produces `{ value: 0 }` /
  `displayScore` 0 — the boundary lands exactly at 99,990→0 as documented,
  not at 99,999 or 100,000.
- Extra life across rollover (golden numeric case): seeding `Score` at `{
  value: 9995 }` (displayed 99,950) and applying a single small-saucer kill
  (990 points → `+99` internal) yields `{ value: 94 }` (displayed 940)
  **and** `extraLives === 1` — the thousands-digit comparison (9 → 0) grants
  the life in the same call that wraps the score, with no special-cased
  branch. (If A-17 settles the disputed small-saucer value at 1,000, only
  these golden literals shift — the mechanism under test is unchanged.)
- A normal (non-wrapping) 1000-internal boundary crossing also grants
  exactly one extra life, and additions that don't cross a thousands
  boundary grant zero — table-driven test over several before/after value
  pairs.
- `addPoints` rejects a non-multiple-of-10 `points` argument (throws) —
  guards the invariant that `value` always equals `displayScore / 10`.
- `addPoints` and `applyKill` never mutate their `Score` input (assert the
  original reference's `value` is unchanged after the call), matching A-2's
  immutable-return convention.
- `applyKill` for each score-relevant `CollisionEvent` variant
  (`rockDestroyed` × 3 sizes, `saucerDestroyed` × 2 sizes — the latter
  typed now per A-8's forward declaration, emitted only from A-13) awards
  exactly the value in `ROCK_POINTS`/`SAUCER_POINTS`; `shipDestroyed`
  leaves score and lives unchanged.
- `npm run build` (`tsc --noEmit && vite build`) is clean and `npm test`
  (Vitest) is green.

---
_Generated by `pf context create story A-9` from the sprint YAML._
_Enriched by Architect (Goldstein): BCD-internal `Score` representation and
digit-comparison extra-life design, ROM research pass
(computerarcheology.com + 6502disassembly.com), and a flagged 990-vs-1000
small-saucer discrepancy for A-13/A-17 to resolve._
_Reconciled by Architect: consumes A-8's `CollisionEvent` seam via
`state.pendingEvents` (parallel `KillEvent` proposal dropped);
`SAUCER_POINTS.small` set provisionally to 990 per updated epic canon._
