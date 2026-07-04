---
story_id: "A-12"
jira_key: ""
epic: "A"
workflow: "tdd"
---
# Story A-12: Small saucer — aimed fire + accuracy ramp after 35000 pts

## Story Details
- **ID:** A-12
- **Jira Key:** (none — local sprint tracking)
- **Workflow:** tdd
- **Stack Parent:** none (stack root)
- **Points:** 5
- **Repo:** asteroids
- **Branch:** feat/A-12-small-saucer-aimed-fire
- **Branch Strategy:** gitflow (feat/{story}-{slug})

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-04T10:11:53Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-04T09:14:01Z | 2026-07-04T09:18:04Z | 4m 3s |
| red | 2026-07-04T09:18:04Z | 2026-07-04T09:36:12Z | 18m 8s |
| green | 2026-07-04T09:36:12Z | 2026-07-04T09:45:01Z | 8m 49s |
| review | 2026-07-04T09:45:01Z | 2026-07-04T09:59:08Z | 14m 7s |
| green | 2026-07-04T09:59:08Z | 2026-07-04T10:05:02Z | 5m 54s |
| review | 2026-07-04T10:05:02Z | 2026-07-04T10:11:53Z | 6m 51s |
| finish | 2026-07-04T10:11:53Z | - | - |

## Sm Assessment

Setup complete for A-12 (Small saucer — aimed fire + accuracy ramp after 35000 pts), 5 pts, TDD (phased) in the `asteroids` subrepo.

- **Session** created at `.session/A-12-session.md`; **context** at `sprint/context/context-story-A-12.md` (+ epic `context-epic-A.md`). Story context is intentionally a title-driven stub — the sprint YAML records no ACs, so TEA derives them as failing tests in RED (same pattern as A-11/A-13). Not a blocker.
- **Branch** `feat/A-12-small-saucer-aimed-fire` created in `asteroids` off `develop` (gitflow; asteroids PRs target `develop`, not `main`).
- **Jira:** none — local sprint tracking; `pf jira` calls intentionally skipped.
- **Merge gate:** clear (NEW_WORK_STATE granted entry).
- **Handoff quarry** for O'Brien pinned in Delivery Findings: A-11's archive forward-impact notes + A-11 context. A-11 built the saucer/bullet foundation A-12 reuses verbatim; A-12 owns the small-saucer type split, aimed `fireShot`, and the 35000-pt accuracy ramp.

**Routing:** phased/tdd → next agent **tea (O'Brien)** for the RED phase.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **Improvement** (non-blocking, SM setup handoff): The sprint YAML has no ACs for A-12 — the title is the spec, and this TDD story derives its ACs as failing tests in RED. Quarry for TEA (O'Brien), do not start cold:
  - `sprint/archive/A-11-session.md` — Delivery Findings carry explicit **forward-impact notes for A-12**: A-12 reuses `stepSaucer` + the `Saucer`/`Bullet` shapes "verbatim"; **aimed fire swaps the random-heading draw in `fireShot` for an aimed one**; keep the spawn director / `Saucer.velocity` / `Bullet.owner` plumbing reusable.
  - `sprint/context/context-story-A-11.md` — A-11 laid the foundation; A-11 explicitly scopes small-saucer variant + aimed fire + **accuracy ramp** OUT (deferred to A-12, which "owns the type" split).
  - Title carries two behaviors to pin: (1) **small saucer** variant (second saucer type / spawn mix) and (2) **aimed fire with an accuracy ramp after 35000 pts** — the `35000` threshold is a hard number to encode. `sprint/context/context-story-A-13.md` references the reused ROM research fetch (computerarcheology.com) if ROM-exact numbers are needed.

### TEA (test design)

- **Gap** (non-blocking, but flag hard for A-17): A-12 shipped with NO Architect research pass (its context is a title-only stub; A-11/A-13 were both ROM-enriched). The RED suite pins a coherent, faithful behavioural contract, but three magnitudes are provisional and ROM-UNVERIFIED: the score-0 aim-error cone half-width (`SAUCER_AIM_ERROR_MAX`), the small-saucer spawn-score floor (`SAUCER_SMALL_MIN_SCORE`), and even the exact `35000` dead-on threshold (`SAUCER_AIM_PERFECT_SCORE`, from the story title). Affects `sprint/context/context-story-A-12.md` + `src/core/saucer.ts` constants (A-17's quarry port must confirm all three). *Found by TEA during test design.*

- **Gap** (non-blocking): Required `Saucer.size` forces GREEN edits or `tsc --noEmit` fails. Dev must (1) add `size: 'large' | 'small'` to the `Saucer` interface in `src/core/state.ts`, (2) set it in `spawnSaucer` AND carry it through the `moved` literal at `src/core/saucer.ts:178`, and (3) add `size` to the hand-built `Saucer` fixtures at `tests/lives.test.ts:90` (`saucerAt` helper) and `tests/waves.test.ts:452`. The `saucer.test.ts` / `saucer-small.test.ts` fire fixtures spread a director-produced base, so they inherit `size` — no edit there. *Found by TEA during test design.*

- **Improvement** (non-blocking): Keep score-0 spawn large-only AND avoid perturbing the score-0 rng stream. A-11's whole suite spawns at score 0 and asserts RANDOM fire; A-12's tests require score 0 → large-only (a small saucer at score 0 would aim and flip A-11 red). Prefer selecting size WITHOUT consuming rng below `SAUCER_SMALL_MIN_SCORE` (deterministic `'large'`), so A-11's cross-seed entry-side variety tests keep their exact spawn draws. If Dev must draw for size, re-run A-11's `saucer.test.ts` to confirm the entry-side variety tests still see both left and right. Affects `src/core/saucer.ts` `spawnSaucer`/`updateSpawnDirector`. *Found by TEA during test design.*

- **Question** (non-blocking): `stepSaucer` must now read `state.ship.pos` (aim target) and `state.score` (ramp) inside the fire branch — A-11's version touches only the saucer + rng. The aimed shot's HEADING points at the ship; the RED perfect-aim test uses zero-velocity saucers, so whether an aimed shot INHERITS the saucer's crossing velocity (a lead/offset for a moving saucer) is left unpinned — decide against A-17 quarry / playtest. Affects `src/core/saucer.ts` fire path. *Found by TEA during test design.*

- **Note** (non-blocking): A-13 consumes exactly the seam this story adds — it reads `Saucer.size` to score the kill (`SAUCER_SCORE_LARGE` 200 vs `SAUCER_SCORE_SMALL` 990/1000-conflict, sourced from A-9) and to drive `sirenState(state) → 'large' | 'small' | null`. A-13 must also SWEPT-collide saucer bullets vs the ship (`sweptOverlaps`): the small saucer's aimed shots fly at `SAUCER_BULLET_SPEED` (111 lo-units/frame) — the same fast-bullet geometry that tunneled small rocks. *Found by TEA during test design.*

### Dev (implementation)

- **Note** (non-blocking): The small saucer is SIMULATED but not visually differentiated — `src/shell/render.ts` `drawSaucer` does not yet size the shape by `Saucer.size`, so a small saucer draws identically to a large one on screen. A-17's shape-table port owns the visual differentiation (import the exported `SaucerSize`). No rendered-scene change from A-12, so no visual eyeball-verify applies. Affects `src/shell/render.ts`. *Found by Dev during implementation.*

- **Question** (non-blocking): `aimHeading` aims at `state.ship.pos` unconditionally — a small saucer whose fire timer elapses while the ship is destroyed (`shipDestroyed`) will aim at the dead ship's frozen position. Harmless today (saucer bullets hit nothing until A-13 wires saucer-bullet↔ship collision), but A-13/A-15 may want to gate saucer fire on ship-alive, as the ROM likely does. Affects `src/core/saucer.ts` fire branch + A-13 collision wiring. *Found by Dev during implementation.*

- **Note** (non-blocking): `SAUCER_SMALL_ONLY_SCORE` (40000, small-only ceiling) is a LOCAL unexported constant in `src/core/saucer.ts` — no test pins it (TEA pinned only the brackets). A-17's quarry port should surface/verify it alongside the exported provisional constants when the real spawn schedule is confirmed. Affects `src/core/saucer.ts`. *Found by Dev during implementation.*

### Reviewer (code review)

- **Gap** (blocking → rework): Mutation-verified that swapping `pickSize`'s `nextFloat(rng)` for `Math.random()` STILL passes the `selects size deterministically` test, because it probes at a probability-1 score (105000) where `pickSize` returns `'small'` unconditionally. Size-selection determinism in the probabilistic regime is thus unguarded by any behavioural test (only the `core-boundary` regex hygiene scan catches a literal `Math.random(`). Affects `tests/saucer-small.test.ts:256` (move the determinism check to a mid-ramp score, e.g. 20000, where the rng draw decides the outcome). *Found by Reviewer during code review.*

- **Improvement** (non-blocking → fold into rework): The `fixes a saucer size at spawn` stability test drives the director at score 0, so it only ever exercises a LARGE saucer — the small-saucer size-stability path is never run. Affects `tests/saucer-small.test.ts:239` (add a high-score override so it also runs against a guaranteed-small saucer). *Found by Reviewer during code review.*

- **Note** (non-blocking): Toroidal-seam aiming (`aimHeading` uses raw `atan2`, not the seam-aware `wrappedDelta` from `bounds.ts`) remains untested — confirmed as a documented TEA deferral (Design Deviations, TEA #4), not a fresh gap. A-17/playtest owns whether the small saucer should aim at the ship's nearest toroidal ghost. Affects `src/core/saucer.ts:151` + `tests/saucer-small.test.ts`. *Found by Reviewer during code review.*

- **Note** (non-blocking): Both prior REJECT findings resolved in commit `2317cd2` (test-only); production code unchanged. The hardened determinism test now mutation-kills a `Math.random()`-in-`pickSize` mutant, and the stability test mutation-kills a dropped-`size` mutant in `stepSaucer` — both independently confirmed by the re-review test-analyzer. *Found by Reviewer during re-review.*

### SM (finish) — POST-APPROVAL DISCOVERY

- **Conflict** (fidelity, route to A-17 or reopen): At finish, the finish-script's context regeneration exposed that `sm-setup`'s `pf context create` had **clobbered the committed Architect research for A-12** (`sprint/context/context-story-A-12.md`, committed `ed63ba2`) with a stub in the working tree. The ENTIRE story — TEA's derived ACs, Dev's constants, the "no Architect research pass exists" deviation — was built against that stub, unaware the ROM research existed. Restored the committed context at finish. The research (both A-11 disassembly sources, re-queried) corroborates a design the shipped code **diverges from** in two material ways:
  1. **Accuracy model — shape is wrong.** Shipped `aimHeading` uses a CONTINUOUS linear ramp from `SAUCER_AIM_ERROR_MAX` (score 0) to **exactly zero / dead-on at 35000**. The ROM (`CMP` vs `$35`, both sources) uses **two discrete error masks** — `ACCURACY_ERROR_COARSE` below 35000, `ACCURACY_ERROR_FINE` at/above — where the fine mask is strictly smaller **but NON-ZERO**. So the ROM small saucer above 35000 still misses slightly (never perfectly dead-on), and below 35000 the error is a constant coarse cone, not a ramp-from-max. `tests/saucer-small.test.ts` PINS the divergent dead-on/linear-ramp behavior.
  2. **Spawn-mix start — threshold is too low.** Shipped `SAUCER_SMALL_MIN_SCORE = 10000`. The ROM starts small-saucer eligibility around **30000** (`CMP #$30`, both sources), saturating to small-only by 40000. Shipped small aimed saucers therefore appear at ~1/3 the intended score — materially harder than the arcade.
  Also confirmed by the research: the 35000 threshold itself is ROM-solid (strongest-corroborated finding), aim-at-current-position (no lead) matches (`SAUCER_AIM_LEADS_TARGET=false`), and small-saucer score is `$99` BCD → 990 not 1000 (already flagged for A-9/A-13). Affects `src/core/saucer.ts` (ramp shape → two-mask `accuracyErrorBound`; `SAUCER_SMALL_MIN_SCORE` 10000→~30000) + `tests/saucer-small.test.ts`. **A-17 (ROM-exact port) is the natural home; the constants are already named/isolated for a swap.** *Found by SM during finish (clobbered-context recovery).*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Derived the whole behavioural spec with provisional constants — no Architect research pass exists for A-12**
  - Spec source: `context-story-A-12.md` (title-only stub); story title
  - Spec text: "Small saucer — aimed fire + accuracy ramp after 35000 pts"
  - Implementation: Unlike A-11/A-13 (both Architect-enriched from ROM fetches), A-12 has no design phase or ROM research. TEA pinned the behavioural contract — aimed cone toward the ship, monotonic accuracy ramp, dead-on at 35000 — via named, isolated constants (`SAUCER_AIM_ERROR_MAX`, `SAUCER_SMALL_MIN_SCORE`). Only `SAUCER_AIM_PERFECT_SCORE = 35000` is pinned to an exact value (it is the story spec, not a ROM guess); the other two are STRUCTURE-only (`> 0`, ordered), never a magnitude.
  - Rationale: The tdd workflow has no design phase and the YAML records no ACs; the SM handoff directed TEA to derive them. Mirrors A-11's provisional-constant strategy so A-17's quarry port is a constant swap, not a test rewrite.
  - Severity: minor
  - Forward impact: A-17 must verify the aim-error magnitude, the small-saucer spawn floor, and confirm 35000 vs ROM (see blocking-flavoured Delivery Finding). A-13 reads `Saucer.size`; A-18 reads it for the siren.

- **Pinned aimed fire as the OBSERVABLE bullet heading, not the `fireShot` signature**
  - Spec source: A-11 session, Dev forward-impact note
  - Spec text: "aimed fire swaps the random-heading draw in `fireShot` for an aimed one"
  - Implementation: Tests never pin `fireShot`'s signature; they assert the fired saucer bullet's heading (through `stepSaucer`/`stepGame`) relative to the saucer→ship bearing. Dev threads `state.ship.pos` / `state.score` / `saucer.size` into the fire step however they choose.
  - Rationale: Same discipline as A-11's TEA deviation #1 (minimal subsystem surface) — robust to Dev's internal decomposition; avoids coupling to a helper that must now grow parameters.
  - Severity: minor
  - Forward impact: none.

- **Made `Saucer.size` a REQUIRED discriminant, forcing sibling-file edits**
  - Spec source: `context-story-A-11.md`, Code shape
  - Spec text: "A-12 adds a `size` discriminant; this story is large-only." / "non-breaking"
  - Implementation: `size: 'large' | 'small'` is required (not optional), mirroring A-11's required `Bullet.owner`. Dev must set it in `spawnSaucer`, carry it through the `moved` literal (`saucer.ts:178`), and add it to the `Saucer` fixtures at `tests/lives.test.ts:90` and `tests/waves.test.ts:452`, or `tsc --noEmit` fails. "Non-breaking" honoured behaviourally, not as zero edits.
  - Rationale: A total discriminant gives A-13 scoring (200 vs 990/1000) and A-17 rendering an exhaustive switch; the edits are mechanical (the `Bullet.owner` precedent).
  - Severity: minor
  - Forward impact: 3 GREEN edit sites (also a Delivery Finding).

- **Decoupled the accuracy ramp from the spawn schedule; left toroidal-seam aiming unpinned**
  - Spec source: story title; the toroidal world (`state.ts` `WORLD_W`/`WORLD_H`)
  - Spec text: "aimed fire + accuracy ramp after 35000 pts"
  - Implementation: The ramp is pinned as a pure function of score, probed on hand-built small saucers at chosen scores — independent of WHEN the director spawns small saucers (that is pinned separately, and only bracketed: large-only at score 0, small present at a high score). Aim geometry is tested only mid-field (saucer + ship far from every wrap seam), so whether Dev aims at the ship's nearest toroidal ghost (`wrappedDelta`) or via raw `atan2` is left unpinned.
  - Rationale: Keeps the ramp observable without coupling to the spawn schedule; mirrors A-11's "vertical-edge behaviour left unpinned" — pinning a seam-wrap guess with no ROM backing would over-constrain Dev.
  - Severity: minor
  - Forward impact: Add a seam-crossing aim test if A-17 quarry / playtest shows the small saucer leads or wraps its aim.

### Dev (implementation)

- **Chose a provisional small-saucer spawn-mix schedule (large-only below 10000, linear to small-only at 40000)**
  - Spec source: TEA test `Saucer.size discriminant & score-driven spawn selection`; A-11 context Scope ("A-12 owns the type selection entirely")
  - Spec text: TEA pinned only the brackets — large-only at score 0, a small saucer present at a high score (105000) — leaving the exact schedule open.
  - Implementation: `pickSize` returns `'large'` below `SAUCER_SMALL_MIN_SCORE` (10000) WITHOUT drawing rng, then draws one `nextFloat` against a probability that rises linearly to 1 (small-only) at a local `SAUCER_SMALL_ONLY_SCORE` (40000).
  - Rationale: Simplest faithful schedule inside TEA's brackets — canon has small saucers grow more common with score and become the only type around 40000. Drawing no rng below the floor keeps A-11's score-0 spawn stream byte-for-byte identical (its whole suite stays green).
  - Severity: minor
  - Forward impact: A-17 quarry verifies the floor (10000), the small-only ceiling (40000), and the ramp shape — all provisional named constants (`SAUCER_SMALL_ONLY_SCORE` is local/unexported since no test pins it).

- **Chose a provisional aim-error model: symmetric uniform error, linear score ramp, no lead / no velocity inheritance**
  - Spec source: TEA tests `aimed fire toward the ship` + `accuracy ramp culminating at 35000 pts`; story title
  - Spec text: cone bounded by `SAUCER_AIM_ERROR_MAX` at score 0, monotonic narrowing, dead-on at 35000, aim tracks ship position.
  - Implementation: `aimHeading = atan2(ship − from) + (nextFloat·2−1)·SAUCER_AIM_ERROR_MAX·max(0, 1 − score/35000)`. Aims at the ship's CURRENT position (no lead for ship motion) and does NOT inherit the saucer's crossing velocity into the shot. `SAUCER_AIM_ERROR_MAX = π/5`.
  - Rationale: Simplest model satisfying every pinned property; a single `nextFloat` draw keeps the large-saucer path's stream unchanged from A-11. Lead / velocity-inheritance omitted — TEA explicitly left them unpinned and there is no ROM backing.
  - Severity: minor
  - Forward impact: A-17 quarry verifies the error distribution + magnitude and whether the small saucer leads a moving ship or inherits crossing velocity.

- **Introduced a named `SaucerSize` type alias rather than an inline union**
  - Spec source: TEA Delivery Finding ("add `size: 'large' | 'small'` to the `Saucer` interface")
  - Spec text: "add `size: 'large' | 'small'`"
  - Implementation: Declared `export type SaucerSize = 'large' | 'small'` in `state.ts` and referenced it in the `Saucer` field + `saucer.ts` signatures, instead of repeating the inline union.
  - Rationale: A-13's `sirenState(state) → 'large' | 'small' | null` and A-17's shape table will both key on this union; a single exported name avoids three copies drifting apart. No behavioural change.
  - Severity: trivial
  - Forward impact: A-13/A-17 should import `SaucerSize` rather than re-declaring the union.

### Reviewer (audit)

All 7 logged deviations (4 TEA + 3 Dev) are sound and stamped ACCEPTED. None reversed — none is the cause of the REJECT (the REJECT is a test-quality defect, not a spec divergence).

- **TEA #1 (derived spec with provisional constants; no Architect pass)** → ✓ ACCEPTED: the tdd workflow has no design phase and the YAML has no ACs; constants are named/isolated and flagged for A-17, mirroring A-11's strategy. The missing research is captured as a hard A-17 Delivery Finding.
- **TEA #2 (aimed fire pinned as observable heading, not `fireShot` signature)** → ✓ ACCEPTED: robust to Dev's decomposition; mirrors A-11's minimal-subsystem-surface deviation. Dev did thread ship/score into `fireShot` cleanly.
- **TEA #3 (`Saucer.size` required discriminant)** → ✓ ACCEPTED: a total discriminant gives A-13/A-17 an exhaustive key; the two fixture edits are mechanical (the `Bullet.owner` precedent). rule-checker confirms the union is exhaustively handled with no `as any`.
- **TEA #4 (decoupled ramp from spawn schedule; toroidal-seam aiming unpinned)** → ✓ ACCEPTED: mirrors A-11's "vertical-edge unpinned"; the seam gap is documented with an A-17 forward note. *Caveat:* this deferral is the root of test-analyzer finding #3 (seam untested) — acceptable as a tracked deferral, not a review blocker.
- **Dev #1 (provisional spawn-mix: large-only <10000, linear to small-only at 40000)** → ✓ ACCEPTED: inside TEA's brackets, canon-plausible, and drawing no rng below the floor preserves A-11's stream exactly. *Caveat:* the probability-1 regime at ≥40000 is precisely what makes the determinism test at `:256` vacuous (see REJECT finding [HIGH]) — but the SCHEDULE is fine; the TEST must move to a mid-ramp score. No code change required.
- **Dev #2 (provisional aim-error model: symmetric uniform, linear ramp, no lead/inheritance)** → ✓ ACCEPTED: satisfies every pinned property; a single `nextFloat` draw keeps the large-saucer stream unchanged. Lead/inheritance correctly deferred to A-17 (no ROM backing).
- **Dev #3 (named `SaucerSize` type alias)** → ✓ ACCEPTED: justified by A-13/A-17 reuse; zero behavioural change; rule-checker confirms it is a union (not an enum).

**Re-review (rework):** No new deviations introduced by the test-hardening rework; all 7 stamps above stand unchanged.

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** 5-pt tdd story adding real deterministic behaviour — a second saucer variant, aimed fire, and a score-keyed accuracy ramp. Full RED coverage required.

**Test Files:**
- `asteroids/tests/saucer-small.test.ts` (new) — 17 tests across 7 describe blocks. A-11's `tests/saucer.test.ts` (26 tests) still pins all the SHARED saucer behaviour (spawn cadence, crossing/despawn, zigzag, fire cadence, bullet cap/lifetime), so this file pins ONLY the A-12 deltas: the `size` discriminant, score-driven spawn selection, aimed fire, the accuracy ramp, and the large-saucer non-aim regression.

**Tests Written:** 17 tests.
**Status:** RED — verified by testing-runner (RUN_ID `A-12-tea-red-2`): **15 fail** on real assertions (missing `SAUCER_AIM_PERFECT_SCORE`/`SAUCER_AIM_ERROR_MAX`/`SAUCER_SMALL_MIN_SCORE`, missing `Saucer.size`, and random-not-aimed fire); the **3 that pass are the always-pass guards** (whole-state determinism + two `core/saucer.ts` source-hygiene scans) — they guard invariants that hold regardless of the feature, so passing now is correct, not vacuous. **All 479 pre-existing tests stay green** (no regressions in the other 23 files). Two spawn-selection tests were HARDENED after the first RED run — they were passing vacuously on `undefined === undefined`; they now assert a concrete `'large'|'small'` value and fail correctly.

**AC → test coverage:**
| AC (derived from the title — no YAML ACs exist) | Test(s) | Status |
|----|---------|--------|
| `Saucer.size` is a `'large'\|'small'` discriminant, fixed at spawn, stable, deterministic | `Saucer.size discriminant & score-driven spawn selection` (5 tests) | failing (RED) |
| Spawn director selects size by score: large-only at 0, small appears when high | same block (`ONLY large at score 0`, `DOES spawn small … high`) | failing (RED) |
| Small saucer fires AIMED at the ship (dead-on at ≥35000, tracks ship, bounded cone below) | `small saucer — aimed fire toward the ship` (3 tests) | failing (RED) |
| Accuracy RAMPS with score, monotonically, closing to zero at 35000 (genuine gradual ramp) | `small saucer — accuracy ramp culminating at 35000 pts` (3 tests) | failing (RED) |
| Large saucer stays RANDOM even at high score (ramp is small-only) | `large saucer stays random even at high score` (1 test) | failing (RED) |
| Determinism: identical seed+input+dt → deeply-equal GameState with an aiming small saucer | `stepGame — small saucer aimed fire wiring & determinism` (1 test) | passing (determinism holds regardless) |
| Build clean / tests green | (GREEN gate — Dev) | pending |

### Rule Coverage

| Rule (TS review checklist) | Test(s) | Status |
|------|---------|--------|
| #1 type-safety escapes (`as any`) | `uses no as any type-safety escape` (scans `core/saucer.ts`) | passing (guard) |
| #3 enum/union exhaustiveness | `size` pinned as a `'large'\|'small'` string union (not an enum); every test routes both members | failing (RED) |
| epic banned-globals / determinism | `threads aim through state.rng only — no wall-clock/entropy globals` + whole-state determinism test; `core-boundary.test.ts` also auto-scans the changed `core/saucer.ts` | passing (guard) |
| #8 test quality (meaningful, non-vacuous) | self-check pass — two vacuous `undefined===undefined` passes found in the first RED run and hardened to assert a concrete size | applied |

**Rules checked:** #6 React/JSX, #7/#11 async/error, #10 input-validation, #12 bundle are N/A to a pure deterministic sim module. Applicable checks (#1 type-safety, #3 union-exhaustiveness, #8 test quality) + the epic determinism guard all have coverage.
**Self-check:** 0 remaining vacuous tests — the two `undefined===undefined` passers were hardened (now assert `'large'|'small'`); no `let _ =`, no `assert(true)`. No non-null assertions (`!`) or `as any` in the test file (uses the `requireSaucer` narrowing helper, per A-11's convention). The 3 tests that pass in RED are genuine always-hold guards (determinism + source hygiene), not vacuous behaviour tests.

**Handoff:** To Dev (Julia) for GREEN. Key work: add `size: 'large'|'small'` to the `Saucer` type; teach the spawn director to select size by score (large-only at 0, small emerging past `SAUCER_SMALL_MIN_SCORE`) WITHOUT breaking A-11's score-0 rng stream; swap the small saucer's random-heading draw in the fire path for an AIMED one that reads `state.ship.pos` + `state.score`, with the error ramping to 0 at `SAUCER_AIM_PERFECT_SCORE` (35000); add the 3 new provisional constants; carry `size` through `saucer.ts:178` and the two sibling `Saucer` fixtures. See Delivery Findings for exact edit sites.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/state.ts` — new `SaucerSize = 'large' | 'small'` type; `Saucer` gains a required `size` field (fixed at spawn).
- `src/core/saucer.ts` — 3 new exported provisional constants (`SAUCER_AIM_PERFECT_SCORE = 35000`, `SAUCER_AIM_ERROR_MAX = π/5`, `SAUCER_SMALL_MIN_SCORE = 10000`) + 1 local (`SAUCER_SMALL_ONLY_SCORE = 40000`); `smallProbability`/`pickSize` score-driven size selection (large-only below the floor, no rng drawn there); `spawnSaucer` takes `score` and sets `size`; `updateSpawnDirector` passes `state.score`; `fireShot` routes `'small'` → new `aimHeading` (bearing to `state.ship.pos` + symmetric error ramping to 0 at 35000) while `'large'` keeps its single-`nextFloat` random draw; `size` carried through the `moved` saucer.
- `tests/lives.test.ts`, `tests/waves.test.ts` — added the now-required `size: 'large'` to the two hand-built `Saucer` fixtures (mechanical; the TEA-flagged compile sites).

**Tests:** 494/494 passing (GREEN) — `tests/saucer-small.test.ts` 18/18 (A-12), `tests/saucer.test.ts` 26/26 (A-11, unregressed), all 24 files green. Verified by testing-runner (RUN_ID `A-12-dev-green`). `npm run build` (`tsc --noEmit && vite build`) clean.
**Branch:** `feat/A-12-small-saucer-aimed-fire` (pushed to origin, commit `df0a08e`).

**Minimalism / A-11 preservation:** The large-saucer fire path and the score-0 spawn path draw exactly the same rng as before (one `nextFloat` for a large shot; no size draw below the small-saucer floor), so A-11's determinism/golden tests are untouched — confirmed by its 26 tests staying green with no fixture edits.

**Determinism:** all randomness (size pick, aim error) flows through the cloned `state.rng`; no wall-clock / `Math.random`. The whole-state determinism test + `core-boundary` banned-globals scan both cover the changed `core/saucer.ts`.

**No visual eyeball:** A-12 is a pure core-sim change; `render.ts` is untouched and does not yet differentiate saucer size (A-17), so the rendered scene is unchanged — no eyeball-verify applies (see Delivery Findings).

**Handoff:** To the next phase (TEA verify / Reviewer).

## Subagent Results

Diff: `git diff develop...HEAD` (5 files, +537/−26). Enabled per `workflow.reviewer_subagents`: preflight, test_analyzer, rule_checker. The other 6 are disabled via settings — pre-filled Skipped and covered manually in the Reviewer Assessment.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (494/494 green, tsc+vite build clean, 0 smells, tree clean) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings; boundary paths covered manually ([EDGE]) — perfect-aim boundary at 35000 tested; just-below/at-floor boundaries noted low-severity |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings; pure sim has no catch/fallback/error-swallow — only test-helper fail-loud throws ([SILENT]) |
| 4 | reviewer-test-analyzer | Yes | findings | 4 (1 high, 2 medium, 1 low) | 1 CONFIRMED blocking (vacuous determinism test, mutation-proven), 1 CONFIRMED non-blocking (stability large-only), 1 tracked-deferral (seam), 1 dismissed-informational (existence check, backed by adjacent tests) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings; new docstrings + module header + `SaucerSize` comment spot-checked against code — accurate ([DOC]) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings; `SaucerSize` union + required field + no unsafe casts, corroborated by rule-checker #1-#3 ([TYPE]) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings; no external-input/auth/secret/tenant surface in a pure deterministic sim ([SEC]) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings; aim/spawn logic is minimal, no dead code (tsc noUnusedLocals clean), `SAUCER_SMALL_ONLY_SCORE` kept local ([SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations / 18 rules / 47 instances | N/A |

**All received:** Yes (3 enabled returned; 6 disabled via settings, pre-filled, non-blocking)
**Total findings:** 1 confirmed blocking (HIGH, [TEST]), 1 confirmed non-blocking (MEDIUM, [TEST]), 1 tracked-deferral (seam), 1 dismissed-informational.

## Rule Compliance

Rubric = `.pennyfarthing/gates/lang-review/typescript.md` (13 checks) + 5 codebase rules (determinism/purity, no core→shell, immutable return, nullable `??`, discriminated unions). Exhaustively verified by reviewer-rule-checker (18 rules / 47 instances / **0 violations**) and cross-checked by me.

- **#1 Type-safety escapes** — COMPLIANT. No `as any`/`@ts-ignore`/`!` in `src/core/*` or the tests; `requireSaucer` narrows via `=== null` + throw (no non-null assertion). The only `as any` textual match is the string literal inside the hygiene test that asserts its own absence.
- **#2 Generic/interface** — COMPLIANT. `aimHeading`/`fireShot` take bare `Vec2` params (never mutated) matching the codebase convention (`sweptOverlaps`, `updateRocks`); `Partial<GameState>` used only as an override bag over a full base.
- **#3 Enum anti-patterns** — COMPLIANT. `SaucerSize` is a string union, not an enum; the `size === 'small' ? … : …` ternary exhaustively covers both members; no switch → no missing `assertNever`.
- **#4 Null/undefined** — COMPLIANT. Score comparisons use explicit `<`/`>=`; `score / SAUCER_AIM_PERFECT_SCORE` treats `0` as a real value (never `||`-defaulted); no new `??`/`||` misuse.
- **#5 Module/declaration** — COMPLIANT. `import type` for `Vec2`/`SaucerSize`; `export type SaucerSize`; no `.js` needed (`moduleResolution: bundler`).
- **#6 React/JSX / #7 Async / #9 build-config / #10 input-validation / #11 error-handling / #12 bundle / #13 fix-regressions** — N/A or COMPLIANT (no JSX/async/config/external-input/hot-path/error surface; RED→GREEN TDD, not a fix commit).
- **#8 Test quality** — **VIOLATION** (the blocking finding). `tests/saucer-small.test.ts:256` (`selects size deterministically`) is mutation-proven vacuous: at score 105000 `smallProbability`=1, so the test passes even with a `Math.random()` rng source. Matches the checklist's "Could the assertion pass even if the behaviour is wrong?" — cannot be dismissed. Secondary: `:239` stability test only exercises the large branch.
- **Epic: determinism/purity** — COMPLIANT (in production code). `pickSize`/`aimHeading`/`fireShot` draw only via `nextFloat(rng)`; `updateSpawnDirector`/`stepSaucer` clone `state.rng`; no `Math.random`/`Date.now`/`performance.now`. (The determinism *test* is the defect, not the code.)
- **Epic: no core→shell import** — COMPLIANT (`saucer.ts` imports only `./state`, `./rng`).
- **Epic: immutable return** — COMPLIANT. Every return spreads `{...state}`; `moved` carries `size` forward in a fresh object; inputs never mutated (only the cloned `rng.seed` advances, the documented convention).
- **Epic: discriminated unions** — COMPLIANT. `SaucerSize` matches the `RockSize`/`Bullet.owner`/`Mode` pattern; both members handled.

## Devil's Advocate

Assume this story is broken and its green board is a lie. The strongest case is the same one A-11 fell to: **a test that passes when its target code is broken.** Mutation testing proves it concretely here. Replace `pickSize`'s seeded `nextFloat(rng)` with `Math.random()` — a textbook determinism-breaking change, catastrophic in a cabinet whose entire epic contract is "identical seed + input + dt → deeply-equal state" — and the test literally named `selects size deterministically` stays GREEN. It stays green because it probes at score 105000, where the small-saucer probability is exactly 1, so both spawns return `'small'` no matter where the randomness comes from. The one test whose job is to guard replay-determinism of the new size-selection path guards nothing in the regime that matters (the 10000–40000 ramp, where the rng draw actually decides the outcome). A future developer, trusting the green suite, could refactor `pickSize` onto a non-seeded source and ship a saucer that spawns differently on every replay — attract-mode desync, unreproducible bug reports — with a passing "determinism" test declaring safety that isn't there. Only the `core-boundary` regex scan would catch the *literal* `Math.random(` token; a subtler non-determinism (iteration order, a module counter) would sail through. Secondary: the size-stability test never runs a small saucer, so a small-only carry-through bug would hide; and the invented spawn thresholds (10000/40000) and aim cone (π/5) have zero ROM backing, so "faithful clone" is unverified against the quarry.

What about the running game? Here the code is actually sound. `pickSize`/`aimHeading` are deterministic (`nextFloat` off the cloned seed); the ramp `max(0, 1 − score/35000)` has no NaN or divide-by-zero (35000 and 30000 are non-zero literals); the large-saucer stream is byte-identical to A-11 (one `nextFloat`, no size draw below the floor), confirmed by A-11's 26 tests staying green untouched; 494 tests pass and the build is clean. The toroidal-seam and dead-ship aiming quirks are real but documented, deferred, and harmless until A-13 wires saucer-bullet↔ship collision. So the danger is not a live bug — it is a **false-confidence determinism test** in a determinism-critical codebase. In a TDD workflow the tests ARE the deliverable, and a determinism test that survives a broken-RNG mutation is worse than no test: it actively asserts an epic invariant it does not check. That is disqualifying for approval, exactly as the parallel vacuous-cap test was for A-11.

## Reviewer Assessment

**Verdict:** REJECTED

Production `src/core/*` is correct; the defect is in the new suite's ability to guard the determinism AC (a test-hardening rework, not a code rewrite — the A-11 pattern).

- `[VERIFIED]` Determinism & purity of the new code — `pickSize`/`aimHeading`/`fireShot` draw only via `nextFloat(rng)`; `updateSpawnDirector`/`stepSaucer` clone `state.rng`; no wall-clock/entropy — evidence: `saucer.ts:125-128,151-156,162-171,191,214`; corroborated by `[RULE]` rule-checker #14 (0 violations) and preflight's 494-green whole-state determinism test.
- `[VERIFIED]` Large-saucer stream unchanged from A-11 — evidence: `saucer.ts:163-164` (`nextFloat(rng)*2π`, one draw) + `pickSize` draws no rng below `SAUCER_SMALL_MIN_SCORE` (`saucer.ts:126`); A-11's 26 tests stayed green with zero fixture edits ([TEST] preflight).
- `[VERIFIED]` Union exhaustiveness & immutable carry — `SaucerSize` union handled in both `fireShot` branches; `moved` carries `size` in a fresh object — evidence: `state.ts:67`, `saucer.ts:242`; `[RULE]` #3/#16/#18.
- `[HIGH][TEST]` Vacuous determinism test — `tests/saucer-small.test.ts:256`. Mutation-proven (test-analyzer swapped `nextFloat(rng)`→`Math.random()` in `pickSize`; test still passed). At score 105000 `smallProbability`=1, so the outcome is a probability-1 tautology independent of the rng source. The size-selection determinism AC is unverified in the ramp regime.
- `[MEDIUM][TEST]` Size-stability test exercises only the large branch — `tests/saucer-small.test.ts:239` runs the director at score 0 (always large); a small-saucer carry-through regression would go undetected.
- `[EDGE]` (edge-hunter disabled — manual): perfect-aim boundary at exactly 35000 is tested; just-below (34999) and at-`SAUCER_SMALL_MIN_SCORE` (10000) boundaries are untested but low-severity (structural constants); `smallProbability` divide-by-zero is impossible (40000−10000≠0).
- `[SILENT]` (disabled — manual): no swallowed errors — a pure sim with no catches; only test-helper fail-loud throws.
- `[DOC]` (disabled — manual): new docstrings + module header + `SaucerSize` comment accurate, spot-checked.
- `[TYPE]` (disabled — manual): proper union, required field, no unsafe casts — corroborated by `[RULE]`.
- `[SEC]` (disabled — manual): no external-input/auth/secret surface in a deterministic sim.
- `[SIMPLE]` (disabled — manual): minimal logic, no dead code (tsc `noUnusedLocals` clean), `SAUCER_SMALL_ONLY_SCORE` correctly kept local.
- `[RULE]` rule-checker: 0 violations across 18 rules / 47 instances.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | `selects size deterministically` is mutation-proven vacuous (passes with a `Math.random()` rng source) because it probes at a probability-1 score | tests/saucer-small.test.ts:256 | Move the determinism check to a MID-RAMP score strictly between `SAUCER_SMALL_MIN_SCORE` and the small-only ceiling (e.g. 20000), where `smallProbability ∈ (0,1)` so the outcome genuinely depends on the seeded rng draw — same seed → same variant, and a non-seeded source would now flip it. |
| [MEDIUM] | Size-stability test only exercises the large branch (director at score 0) | tests/saucer-small.test.ts:239 | Add a high-score override (e.g. `{ score: SAUCER_AIM_PERFECT_SCORE * 3 }`) so the test also runs against a guaranteed-small saucer. |

**Rule violation (non-dismissable):** checklist #8 (test quality) — the vacuous determinism assertion matches "Could the assertion pass even if the behaviour is wrong?" and cannot be dismissed.

**Note:** These are test-quality defects, not production logic bugs — shipped `src/core/saucer.ts`/`state.ts` behave correctly. Rework is a RED-hardening pass (TEA); the new/adjusted tests will pass against the existing correct code but will now genuinely guard the size-selection determinism AC against regression.

**Handoff:** Back to TEA (O'Brien) for RED-rework — harden the two tests above.

## Dev Assessment — Rework (review → green)

**Rework of:** Reviewer REJECT (test quality, 1 HIGH + 1 MEDIUM). Production `src/core/*` is **unchanged** — the fixes harden the test suite so the size-selection determinism AC is genuinely guarded. TDD's rework-in-green pattern (the A-11 precedent).

**Test changes (`tests/saucer-small.test.ts`, +47/−20, still 18 tests):**
- **[HIGH] determinism** — `selects size deterministically` moved from a probability-1 score (105000, where `smallProbability`=1 so `pickSize` returns `'small'` for ANY rng source) to a **mid-ramp score** `SAUCER_SMALL_MIN_SCORE * 2` (= 20000, `p = 1/3`). It now asserts identical seed → identical variant across all 60 `SEEDS`, plus a `sizes.size === 2` non-vacuity guard proving the variant is genuinely rng-decided at that score (both variants occur). A probability-1 score would collapse the set to one element and fail the guard.
- **[MEDIUM] stability** — `fixes a saucer size at spawn` now runs an `assertStableFor(score, expected)` helper for BOTH a large saucer (score 0) and a small saucer (score ≥ small-only), so the `size: saucer.size` carry-through in `stepSaucer` is exercised on both branches (was large-only). Added a `stepped > 0` non-vacuity guard.

**Mutation-verified:** I patched `pickSize`'s `nextFloat(rng)` → `Math.random()` (the exact mutant the reviewer's test-analyzer used) and the hardened determinism test now **FAILS** (`× selects size deterministically … MID-RAMP`); the old probability-1 version passed it. Restored `src/core/saucer.ts` to HEAD immediately after (working tree clean).

**Tests:** 494/494 passing (GREEN) — `tests/saucer-small.test.ts` 18/18, `tests/saucer.test.ts` 26/26 (A-11 unregressed). Verified by testing-runner (RUN_ID `A-12-dev-green-rework`).
**Branch:** `feat/A-12-small-saucer-aimed-fire` (pushed, commit `2317cd2`).

**Deviations:** No new deviations — the changes strengthen existing assertions at the Reviewer's direction; no spec divergence, no production-code change.
**Delivery findings:** No new upstream findings during the rework.

**Handoff:** Back to Reviewer (The Thought Police) for re-review.

## Subagent Results (Re-Review — rework)

Rework diff is TEST-ONLY (`tests/saucer-small.test.ts` +47/−20); `src/core/*` is byte-identical to the prior CONFIRMED-clean review (`git diff df0a08e HEAD -- src/core/` empty), so the earlier full-surface production review still stands.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (494/494 green, tsc+vite build clean, src/core unchanged, 0 smells, tree clean) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings; no production change to boundary-check ([EDGE]) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings; test-only diff, no error paths ([SILENT]) |
| 4 | reviewer-test-analyzer | Yes | clean | 0 (both prior findings RESOLVED, live-mutation-verified) | Both prior REJECT findings confirmed fixed; no new vacuity/flakiness/coupling |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings; new test comments spot-checked — accurate ([DOC]) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings; `Set<SaucerSize>` + typed helper, no casts ([TYPE]) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings; no security surface ([SEC]) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings; helper de-duplicates the two stability runs, no dead code ([SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations across the rework's changed lines | N/A |

**All received:** Yes (3 enabled returned clean; 6 disabled via settings, pre-filled, non-blocking)
**Total findings:** 0. Both prior REJECT findings resolved and independently mutation-confirmed.

## Reviewer Assessment — Re-Review

**Verdict:** APPROVED

Re-review of the test-hardening rework. Production `src/core/*` is byte-identical to the prior CONFIRMED-clean review; the two REJECT findings are resolved and independently mutation-verified by the test-analyzer.

- `[VERIFIED]` Production code unchanged since the prior full review — evidence: `git diff df0a08e HEAD -- src/core/` is empty; the earlier surface review (determinism, purity, `<=0`/`??` handling, union exhaustiveness, immutable returns, no core→shell) still stands.
- `[HIGH→RESOLVED][TEST]` The `selects size deterministically` test now runs at a MID-RAMP score (`SAUCER_SMALL_MIN_SCORE * 2` = 20000, `smallProbability = 1/3`) with a `sizes.size === 2` binding guard — evidence: test-analyzer's live probe mutated `pickSize`'s `nextFloat(rng)` → `Math.random()` and the test FAILED at the `b === a` assertion (`saucer-small.test.ts:283`), where the prior probability-1 version survived. The `sizes.size === 2` guard is robust (23 small / 37 large over the fixed 60-seed `SEEDS` at p=1/3 — deterministic, not flaky).
- `[MEDIUM→RESOLVED][TEST]` The `fixes a saucer size at spawn` test now exercises BOTH variants via `assertStableFor` — evidence: test-analyzer mutated `stepSaucer`'s `moved` to hardcode `size: 'large'` and the test FAILED on the small branch (`saucer-small.test.ts:259`); the `expect(size0).toBe(expected)` + `stepped > 0` guards make both branches binding.
- `[TEST]` No new vacuity, flakiness, or implementation-coupling introduced (test-analyzer clean); `aimConeWidth` ramp margins remain large; `SEEDS` is fixed/hardcoded (reproducible).
- `[RULE]` rule-checker: 0 violations across the rework's changed lines (13 TS checks + fixture-typing); `type SaucerSize` import correct, `Set<SaucerSize>` typed, no `as any`/`!`.
- `[EDGE]/[SILENT]/[DOC]/[TYPE]/[SEC]/[SIMPLE]` (all disabled — manual): test-only diff with no production change; the new `assertStableFor` helper de-duplicates cleanly, comments are accurate, fixtures fully typed, no error/security surface. All prior manual coverage stands unchanged.

**Deviation audit:** unchanged — all 7 deviations remain ACCEPTED (see `### Reviewer (audit)`); the rework introduced no new deviations (test hardening at the reviewer's direction, not a spec divergence).

**Data flow traced:** `state.score` → `updateSpawnDirector` → `spawnSaucer(rng, score)` → `pickSize` → `Saucer.size`; and `Saucer.size` + `state.ship.pos` + `state.score` → `stepSaucer` → `fireShot` → `aimHeading` → `bullet.vel` — deterministic (rng cloned), now genuinely guarded at a mid-ramp score.
**Pattern observed:** subsystem step mirrors `updateWaveDirector` (GameState→GameState); `SaucerSize` matches the `RockSize`/`Bullet.owner` union convention.
**Error handling:** N/A — pure sim, no fallible ops; only test-helper fail-loud throws.

**Handoff:** To SM (Winston Smith) for finish-story.