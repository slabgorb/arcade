---
story_id: "pm4-3"
jira_key: "pm4-3"
epic: "pm4"
workflow: "tdd"
---
# Story pm4-3: Eaten-ghost eyes-return + forced house exit (core)

## Story Details
- **ID:** pm4-3
- **Jira Key:** pm4-3
- **Workflow:** tdd
- **Type:** bug
- **Points:** 5
- **Priority:** p1
- **Stack Parent:** none
- **Branch:** feat/pm4-3-eyes-return-house-exit
- **PR:** https://github.com/slabgorb/arcade/pull/203

## Context
An eaten ghost currently teleports to its spawn tile with `released=false` (game.ts:525-529) and re-release is gated on the same dot counter as initial release, so it loiters. 

This story implements the complete eyes-return flow:
- Eyes traverse to house
- Regenerate ghost body and eyes
- Forcibly leave house (NOT dot-gated, unlike initial release)

Affected files: game.ts (eaten branch), house.ts (exit/regenerate path), ghost.ts (eyes traversal), render.ts (wire the 'eaten' render mode).

**CRITICAL GEOMETRY NOTE (from pm4-4):** Ghost-house gate is now at row 15 (recessed into house top wall), interior is rows 16-18 (3 tall). Source of truth: plugins/pac-man/src/core/maze-topology.generated.ts

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-10T14:01:09Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-10T11:01:43Z | 2026-08-10T11:03:48Z | 2m 5s |
| red | 2026-08-10T11:03:48Z | 2026-08-10T13:00:22Z | 1h 56m |
| green | 2026-08-10T13:00:22Z | 2026-08-10T13:16:14Z | 15m 52s |
| review | 2026-08-10T13:16:14Z | 2026-08-10T13:36:48Z | 20m 34s |
| red | 2026-08-10T13:36:48Z | 2026-08-10T13:51:48Z | 15m |
| green | 2026-08-10T13:51:48Z | 2026-08-10T13:53:27Z | 1m 39s |
| review | 2026-08-10T13:53:27Z | 2026-08-10T14:01:09Z | 7m 42s |
| finish | 2026-08-10T14:01:09Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Improvement** (non-blocking): the eaten→eyes→regenerate→forced-exit flow is
  verified deterministically through `stepGame` (ordinary-input eat + a
  never-eaten control) plus the render-dispatch test and the existing
  `sprites.test.ts` `'eaten'` pixel test — but NOT via a live in-browser static
  screenshot. There is no state-injection hook and staging a live ghost-eat via
  scripted input is non-deterministic. Affects verification only — `plugins/pac-man/src/main.ts`
  could grow a dev-only inject hook, or the reviewer stages a live eat, if a
  browser-observed eyes frame is required (boss has photosensitive epilepsy:
  STATIC capture only). *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (blocking, this story): the collision-loop guard `if (state.returning[id]
  !== null) continue` (`plugins/pac-man/src/core/game.ts:584`) is load-bearing but
  has ZERO test coverage — deleting it leaves all 296 tests green (mutation-verified).
  The guard protects a `'regenerated'`-phase ghost (released=true, still climbing out
  through the gate→corridor tiles) from a real collision with Pac-Man: with the guard
  removed and Pac parked at the exit corridor tile `{13,14}`, a returning ghost KILLS
  Pac mid-transit (mutation-verified `pac-died`). The one existing test aimed at this
  area (`ghost-eyes.test.ts` "eyes does not cost Pac-Man a life") only exercises the
  `'eyes'` phase, where `released=false` and the PRE-EXISTING `if (!released) continue`
  above already excludes the ghost — so the new guard is never exercised. Affects
  `plugins/pac-man/tests/core/ghost-eyes.test.ts` (add a `'regenerated'`-phase
  collision test that mutation-covers game.ts:584). Code is CORRECT as shipped — this
  is a test-only rework. *Found by Reviewer during code review.*

### TEA (test design)
- No upstream findings. The Reviewer's gap is real and now covered; the production
  guard (`game.ts:584`) is correct and unchanged. *Found by TEA during test design (round-trip 2).*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Edited a pre-existing chain-scoring fixture (`game.test.ts`) to clear the new eyes state between re-eats**
  - Spec source: TEA RED tests + context-story-pm4-3.md (the eyes-return spec)
  - Spec text: "eaten → eyes → return → regenerate → forcibly leave"; a returning
    ghost cannot be re-eaten until it regenerates (my `returning !== null` collision guard)
  - Implementation: `game.test.ts:164` ("scores 200/400/800/1600…") re-eats Blinky
    four times by re-releasing it each iteration. Since an eaten ghost is now eyes
    (`returning !== null`) and is barred from re-eat until it regenerates, I added
    `state.returning.blinky = null` alongside the existing `released = true` so the
    fixture can still stage four eats.
  - Rationale: the test's PURPOSE is the 200/400/800/1600 chain SCORING, not the
    re-eat mechanism; the old model's "re-release ⇒ instantly re-eatable" was
    incidental. Clearing the eyes state makes the old fixture tell the new truth
    while preserving its scoring assertion. No pm4-3 test was weakened.
  - Severity: minor
  - Forward impact: none — no production code re-eats a ghost mid-transit; only this
    synthetic multi-eat fixture pokes state directly (as it already did for
    `released`/`ghostFrame`).

- **Proactively reworded a now-stale doc-comment (not a spec change)**: `render.ts`'s
  `GhostRenderMode` comment said the core "does not yet model an eaten ghost's
  eyes-in-transit state" and that `main.ts` "never currently passes 'eaten'". pm4-3
  makes both false, so I updated the comment in the same commit (the pm4-4 lesson:
  sweep the retired claim, don't leave it for the reviewer). Severity: trivial.

### Reviewer (audit)
- **Dev deviation 1 (edited `game.test.ts` chain-scoring fixture to clear the eyes
  state between re-eats)** → ✓ ACCEPTED: verified the scoring assertions
  (`state.score - scoreBefore === GHOST_CHAIN_SCORES[i]`, 200/400/800/1600) are intact;
  `state.returning.blinky = null` sits beside the existing `released = true` and only
  re-admits the ghost as ordinary so it can be eaten again. Sound — the fixture's
  purpose is preserved and no pm4-3 test is weakened.
- **Dev deviation 2 (reworded stale `render.ts` `GhostRenderMode` doc-comment)** →
  ✓ ACCEPTED: re-verified the new wording against the live code — `main.ts` now calls
  the real `ghostRenderMode(game, id)` in the draw loop, so "'eaten' is now reached in
  ordinary play" is accurate. No stale teleport/eyes claim remains anywhere in
  `plugins/pac-man/src/` (grep-confirmed).

## Sm Assessment

**Setup complete — routing to TEA (RED).**

- **Story:** pm4-3 [p1, 5pt, bug] — an eaten ghost teleports to spawn with `released=false`
  (`game.ts:525-529`) and its re-release is gated on the SAME dot counter as initial
  release, so it loiters. Implement the full eyes-return loop: eyes → return to house →
  regenerate → **forcibly leave (NOT dot-gated)**.
- **Surface (per story):** `game.ts` (eaten branch), `house.ts` (an exit/regenerate path
  DISTINCT from initial dot-gated release), `ghost.ts` (eyes traversal), and wire the
  `'eaten'` render mode `render.ts` already implements but never receives.
- **Geometry guardrail (from pm4-4, now on develop):** ghost-house gate is at **row 15**
  (recessed in the house top wall), interior is **rows 16-18**. Read house/exit coords from
  `plugins/pac-man/src/core/maze-topology.generated.ts` — do NOT use the old 4-row table.
- **RED phase for TEA:**
  - Anchor the eyes-return ROM routine citation against the pac-man ROM-study dossier
    (`plugins/pac-man/docs/rom-study/`). **Do NOT fabricate a line** — if unverifiable, say so.
  - Write failing tests that pin: (a) an eaten ghost enters `eyes` mode and heads for the
    house; (b) it regenerates at the house; (c) it leaves via a forced, **non-dot-gated**
    exit distinct from initial release; (d) the `'eaten'` render mode is actually dispatched.
  - Keep `src/core/` pure (no clock/DOM/Math.random) — the `purity.test.ts` gate applies.
- **Accessibility:** any playtest uses **static screenshots only** (boss has photosensitive
  epilepsy) — no motion/flash capture.

**Handoff:** To TEA for RED.

## TEA Assessment

**Tests Required:** Yes
**Reason:** Real behavioural bug + new feature (eyes-return state machine). The
current code teleports an eaten ghost to spawn with `released=false` and
re-gates it on the same dot counter, so after a mid-level death it loiters.
Needs coverage that fails against today's teleport-and-dot-gate and passes only
once eyes return → regenerate → forcibly leave is implemented.

**ROM citation (anchored, NOT fabricated):** the eyes-return control flow has
**no isolable `pacman.asm:<addr>` literal** — it lives in the unlabelled
ghost-behaviour region. glossary.md §Ghost movement "Citation status" already
establishes this policy (grepping the disassembly for this logic returns zero
symbol hits). Behaviour is therefore anchored to **Dossier ch.4 "Ghosts"**
(Dossier-decoded, uncited — same status as scatter/chase/targeting), and the
one byte-anchored artefact is the eyes sprite, **claims/graphics.json
`GHOST-EYES`** (sprite index 12, "used by every ghost when eaten/retreating").
Tests pin behaviour, not a ROM number. **Do not invent a line at GREEN.**

**Test Files:**
- `plugins/pac-man/tests/core/ghost-eyes.test.ts` — the core state machine:
  house.ts forced exit, the eyes/returning state, the non-dot-gated re-exit, and
  the eyes-are-harmless guard.
- `plugins/pac-man/tests/shell/eyes-render.test.ts` — the render wiring: the
  shell dispatches the (already-implemented) `'eaten'` render mode.

**Tests Written:** 9 across 4 describes + 1 render describe. **Status: RED —
verified 10 failing / 286 pre-existing green** (`npx vitest run --project
pac-man`). The RED is by MISSING CONTRACT (three new exports don't exist yet):

| New export (RED contract) | File | Purpose |
|---|---|---|
| `forceLeaveHouse(state, id)` | `src/core/house.ts` | regenerate-and-leave path that releases a ghost **regardless of either dot counter** — distinct from `releaseFromHouse` |
| `isReturningHome(state, id)` | `src/core/game.ts` | the eaten ghost's eyes-in-transit state (true from eaten until regenerated) |
| `ghostRenderMode(game, id)` | `src/shell/render.ts` | **per-ghost** render-mode selector returning `'eaten'` for a returning ghost (generalises the private global one in `main.ts:38`, whose doc-comment says `'eaten'` "is not reachable yet") |

`npm run lint` shows **exactly those three** `TS2305/TS2724` errors and nothing
else — the intended RED type surface (established norm here: pm1-8's suite was
written before `game.ts` existed). No incidental lint noise.

### Dev handoff notes (GREEN)
- **The bug's teeth** are `ghost-eyes.test.ts` → "re-exits with the release
  counter frozen below its threshold": eat inky, set `useGlobalCounter=true /
  globalDotsEaten=0` (below inky's global limit 17), and it must still come back
  out — while never-eaten clyde stays gated. That contrast IS "forced exit
  distinct from dot-gated initial release."
- **Geometry (from pm4-4, on develop):** gate row 15, interior rows 16-18. Route
  the eyes to the house **interior**, not to the old outside spawn tile
  (`GHOST_SPAWN.blinky = {13,14}` is above the gate — today's eaten branch sends
  eyes there and never actually enters the house). Read house membership from
  `tileAt`/the generated topology, never a hardcoded row.
- **Surfaces (per the story):** `game.ts` eaten branch (enter eyes instead of
  teleport-and-`released=false`), `house.ts` (`forceLeaveHouse`), `ghost.ts`
  (eyes traversal toward the house target), `render.ts`/`main.ts` (dispatch
  `'eaten'`). `render.ts drawGhost('eaten')` already renders correctly
  (`sprites.test.ts`) — you only need to make the selector RETURN it.
- **Keep `src/core/` pure** (`tests/purity.test.ts`): no clock/DOM/Math.random.
  Eyes traversal must be deterministic (reuse `ghost.ts` kinematics + a house
  target, not a random walk).
- **Do not weaken the guards:** the never-eaten-ghost control (clyde stays
  housed) and the eyes-are-harmless guard protect against a fix that force-exits
  everyone or lets eyes kill Pac-Man.
- **Verify:** full `npx vitest run --project pac-man` green + `npm run lint`
  clean, then a **static-screenshot** Playwright playtest (boss has
  photosensitive epilepsy — no motion capture) showing eyes travelling to the
  house and a regenerated ghost leaving.

### Rule Coverage

| Rule (lang-review typescript.md) | Applies? | Coverage |
|---|---|---|
| #1 Type-safety escapes (`as any`/`@ts-ignore`/non-null `!`) | Yes | None used — event shape matched via `toMatchObject`, not a cast; type-only `import type { GhostId }`. |
| #3 Enum/union exhaustiveness | Partial (Dev) | The new `GhostRenderMode` `'eaten'` branch is a Dev concern; the render test pins that `'eaten'` is actually returned so the branch can't be dead. |
| #8 Test quality (no vacuous assertions) | Yes | Every `expect` derives from live state/`tileAt`/`isWalkable`/events; custom messages throughout; bounded-loop tests assert convergence + a witness (dots frozen, tile outside house). |
| #13/#14 Fix-introduced regressions / state-machine edges | Yes | The frozen-counter re-exit test + the never-eaten control catch a force-exit-everyone regression; the harmless-eyes guard catches an eyes-kill regression. |
| #10 Type-level input validation | No | No new external input surface — pure in-engine state. |

**Rules checked:** 13 TS rule groups; 3 directly covered by new tests, the rest N/A to a pure in-engine state-machine change with no new IO/type surface.
**Self-check (Phase C):** 0 vacuous assertions — no `let _ =`, no `assert(true)`, no always-null checks.

**Handoff:** To Dev for GREEN.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/pac-man/src/core/house.ts` — `forceLeaveHouse(state, id)`: the
  unconditional, non-dot-gated regenerate-and-leave path (distinct from
  `releaseFromHouse`).
- `plugins/pac-man/src/core/game.ts` — the eyes-return state machine:
  `returning: Record<GhostId, 'eyes'|'regenerated'|null>` on `GameState`
  (initialised/reset in create/respawn/advance); exported `isReturningHome`;
  `stepEyes` (eyes descend to a house-interior tile → regenerate facing up +
  `forceLeaveHouse` → body climbs out through the gate → phase clears once on a
  non-house/non-gate tile); the eaten branch now enters `'eyes'` instead of
  teleporting to spawn; the movement loop moves returning ghosts, the collision
  loop skips them (eyes can't eat or be eaten).
- `plugins/pac-man/src/shell/render.ts` — exported per-ghost `ghostRenderMode(game, id)`
  returning `'eaten'` for an `'eyes'` ghost; stale `GhostRenderMode` doc reworded.
- `plugins/pac-man/src/main.ts` — draws returning (un-`released`) ghosts and
  selects the render mode per ghost id (relocated the old global selector).
- `plugins/pac-man/tests/core/game.test.ts` — chain-scoring fixture clears the
  new eyes state between re-eats (see deviation).

**Tests:** 296/296 passing (GREEN) — `npx vitest run --project pac-man`. The 10
pm4-3 RED tests now pass; `purity.test.ts`, `maze-topology.test.ts` and the
DOT_COUNT/energizer load-invariant all stay green (core change is a plain state
field + pure kinematics, no clock/DOM/random). `npm run lint` (tsc --noEmit,
repo-wide) clean.

**Root cause fixed:** the eaten branch teleported the ghost to its spawn tile and
set `released=false`, re-gating re-entry on the same dot counter — so under the
post-death global counter it loitered. Now the ghost becomes eyes that return
home, regenerate, and are forced out immediately, independent of the dot gate.

**Verification note (honest):** the flow is proven by deterministic `stepGame`
unit tests (ordinary-input eat + never-eaten control), the render-dispatch test,
and the existing `sprites.test.ts` `'eaten'` pixel test. A live in-browser static
screenshot of the eyes was NOT captured — see the non-blocking Delivery Finding.

**Branch:** feat/pm4-3-eyes-return-house-exit (pushed). No PR (SM finish phase).

**Handoff:** To Reviewer for code review.

## Round-Trip 1 Subagent Results (superseded — see Round-Trip 2 below)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | 296/296 GREEN; lint clean; generated file NOT in diff + re-bake byte-clean; zero code smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered (eaten-in-tunnel, multi-ghost eyes, boundary-frame collision; convergence probed from all 270 outside tiles) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered (no try/catch, no swallowed errors, no silent fallback in diff) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered; the rule-checker + my mutation surfaced the untested guard (see [TEST][RULE] finding) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered (grep: no stale teleport/eyes claim remains; render.ts doc reword verified accurate) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — hand-covered (`ReturnPhase` union + `Record<GhostId, …>` clean; no stringly-typed API) |
| 7 | reviewer-security | Yes | clean | none | purity 33/33; bounded O(1) per-frame work (no hang); Record keys are the closed GhostId union (index-safe); no injection/leak surface |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — hand-covered (`eyesPattern` gate redundant at 100% but matches the pre-existing speed-gate pattern; not over-engineered) |
| 9 | reviewer-rule-checker | Yes | findings | 1 (+1 same-root) | confirmed 1 (rule #15/#18: untested load-bearing guard), 0 dismissed — I independently mutation-verified it |

**All received:** Yes (3 enabled returned; 6 disabled pre-filled)
**Total findings:** 1 confirmed (MEDIUM, [TEST][RULE]), 0 dismissed, 0 deferred

## Round-Trip 1 Reviewer Assessment (REJECTED — superseded by Round-Trip 2 below)

**Verdict:** REJECTED (round-trip 1 — one confirmed test-coverage gap on a load-bearing guard; code is correct, the rework is test-only)

The implementation is correct, honest, and well-scoped: the eaten-ghost eyes-return
state machine converges from **every one of the 270 walkable outside tiles** (I
probed this with a throwaway test — no orbit/softlock, disproving my main worry), the
forced non-dot-gated exit is genuinely distinct from dot-gated release, the citation
posture is honest (Dossier ch.4 + `GHOST-EYES` sprite; no fabricated `pacman.asm`
line), and core purity holds. The single blocker is a **rule #15 violation**: a
load-bearing, reachable collision guard ships with zero test coverage.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MEDIUM] [TEST] [RULE] | Collision guard `if (state.returning[id] !== null) continue` is un-mutation-tested — deleting it keeps all 296 tests green, yet without it a `'regenerated'`-phase ghost (released=true) climbing out through the corridor tile `{13,14}` KILLS a parked Pac-Man (both mutation-verified). The only nearby test exercises the `'eyes'` phase, where the pre-existing `!released` check already excludes the ghost, so the new guard is never exercised. | `plugins/pac-man/src/core/game.ts:584` (test gap in `plugins/pac-man/tests/core/ghost-eyes.test.ts`) | Add a `'regenerated'`-phase collision test: drive a ghost through eating → return until `isReturningHome(state,id) && state.house.released[id]` (mid-climb), overlap Pac on its tile during transit, assert no life lost AND no re-eat. Delete the guard → the new test must go RED. **No production change** — the code is correct. |

### Rule Compliance (lang-review typescript.md + CLAUDE.md)
- **#14 Derived edges in one state-machine branch:** VERIFIED compliant — the
  `returning` transitions are centralized (set in the eaten branch; `'eyes'→'regenerated'→null`
  only in `stepEyes`; full reset in create/respawn/advance). No per-transition edge/event is
  computed in one branch that another could miss. evidence: `game.ts` stepEyes + the 3 reset sites.
- **#15/#18 Guard must be mutation-tested / test that fails-by-passing:** VIOLATION —
  the collision guard at `game.ts:584` (see severity table). Confirmed by deleting it and
  re-running: 296/296 still green.
- **#17 Comments asserting a mechanism nobody re-ran:** VERIFIED — I re-checked the geometry
  claims (`EYES_HOME_TILE {13,17}` is a house tile, `{13,14}` is the corridor above the gate)
  against the live maze and the pm4-4 guard; the reworded `render.ts` doc is accurate.
- **core/ purity:** VERIFIED — `stepEyes`/`isReturningHome`/`forceLeaveHouse` use only
  Math.round/floor/min; `purity.test.ts` green (in the 296).
- **Generated file never hand-edited:** VERIFIED — `maze-topology.generated.ts` not in the diff.
- **ROM/Dossier citation honesty:** VERIFIED — eyes-return anchored to Dossier ch.4 (uncited,
  per glossary "Citation status") + `GHOST-EYES`; no invented `pacman.asm` literal.

### Key observations (tags: [EDGE] [SILENT] [TEST] [DOC] [TYPE] [SEC] [SIMPLE] [RULE])
- [RULE][TEST] The confirmed finding — un-mutation-tested load-bearing collision guard. Mutation-proven both ways.
- [EDGE] VERIFIED — eyes convergence from **all 270** ghost-walkable non-house tiles within budget (throwaway probe, since deleted); includes tunnel tiles. No orbit/softlock. The one un-probed edge — a `'regenerated'`-phase collision — is exactly the [TEST] finding.
- [SILENT] VERIFIED n/a — no try/catch, swallowed error, or silent fallback in the diff; `stepEyes`'s `else` is an intentional phase branch, not an error path.
- [DOC] VERIFIED — no stale teleport/eyes claim remains in `plugins/pac-man/src/` (grep); the reworded `render.ts` `GhostRenderMode` comment matches the live wiring.
- [TYPE] VERIFIED — `ReturnPhase = 'eyes'|'regenerated'` + `returning: Record<GhostId, ReturnPhase|null>` mirrors the existing per-ghost `Record` pattern (ghostFrame/pendingReverse); `render.ts` compares `=== 'eyes'` type-safely. No stringly-typed API, no `as any`.
- [SEC] VERIFIED clean (subagent-confirmed) — bounded O(1) per frame over the fixed 4-ghost list; a non-converging ghost would be a gameplay bug, not a hang; Record access keyed only by the closed `GhostId` union.
- [SIMPLE] VERIFIED — `eyesPattern = speedPattern(100)` is `[true]`, so the gate is a near-no-op, but it mirrors the pre-existing per-ghost speed-gate and keeps `ghostFrame` continuous; not worth changing. LOW, non-blocking.
- [LOW][cosmetic] A `'regenerated'` body climbing out renders as `'frightened'`/blue if the fright timer is still running (`ghostRenderMode` maps only `'eyes'→'eaten'`); it is inside the house/gate at that point so barely visible. Non-blocking observation, not required for this story.

### Devil's Advocate
Suppose this is broken. The most dangerous property is that the eyes navigate to a
FIXED target (`EYES_HOME_TILE`) with the same greedy, never-reverse pathing the chase
AI uses — and a fixed-target greedy walker on a maze can settle into a stable orbit
that never lands on the target, which would strand the ghost as eyes forever (a
permanent loss, not a crash). I treated that as the primary risk and refused to take
the two passing unit tests as proof, because both eat the ghost at a convenient tile
adjacent to the house. So I probed convergence from EVERY one of the 270 ghost-walkable
outside tiles: all converged within budget. The greedy walker reaches the fixed home
because the house sits in a funnel and the interior is a tiny bounded pocket — once at
the gate it drops in and lands. That worry is retired by measurement, not argument.
The second danger: an eaten ghost is set `released=false`, and re-release is normally
dot-gated — could a ghost eaten after a mid-level death (global counter reset to 0)
loiter exactly as the OLD bug did? No: `forceLeaveHouse` is unconditional and the
`stepEyes` path never consults the counter; the frozen-counter test proves re-exit with
`globalDotsEaten=0`. Third, and this is where the real hole is: the code carefully makes
eyes harmless, but "harmless" spans two phases — `'eyes'` (released=false, excluded by a
PRE-EXISTING check) and `'regenerated'` (released=TRUE, excluded ONLY by the new guard).
Every shipped test lives in the first phase, so the new guard is decorative as far as the
suite knows — I deleted it and nothing went red. Then I built the second-phase scenario by
hand (Pac pinned on the exit corridor tile while the regenerated body climbs through it):
with the guard gone, Pac dies mid-transit. So the guard is real, reachable, and load-
bearing, and the suite cannot tell if a future "simplification" removes it. That is
precisely the silent regression rule #15 exists to stop, which is why a correct
implementation still earns a round-trip: the test, not the code, is what's missing.

**Handoff:** Back to TEA for a test-only rework (add the `'regenerated'`-phase collision test).
## TEA Assessment (Round-Trip 2 — test-only rework)

**Tests Required:** Yes (test-only; production code is correct and unchanged).
**Reason:** The Reviewer's single blocker — the load-bearing collision guard
`if (state.returning[id] !== null) continue` (`game.ts:584`) shipped with zero
mutation coverage. The one nearby test exercises only the `'eyes'` phase
(`released=false`), which the PRE-EXISTING `if (!state.house.released[id]) continue`
(game.ts:581) already excludes — so the new guard was never reached by the suite.

**Test added (1):** `plugins/pac-man/tests/core/ghost-eyes.test.ts` — new describe
`pm4-3: a regenerated body climbing out of the house is harmless in transit`, one
`it` covering the `'regenerated'` phase (`released=TRUE`, `returning='regenerated'`):
- Eats blinky, holds the three housed ghosts gated for the whole run via the global
  counter (`useGlobalCounter=true; globalDotsEaten=0`, limits 7/17/32 at 0) so no
  legitimately-released chaser can hit a Pac parked on the exit path.
- Parks Pac-Man on the **gate tile `{13,15}`** — on the regen climb-out
  `{13,17}→{13,14}`, and (being a gate, asserted via live `tileAt`) it never clears
  the returning phase, so the body meets Pac strictly while still `'regenerated'`.
- Sets `frightenedTimer=0` so an unguarded collision takes the **kill** branch.
- Asserts, every frame of the climb-out: no life lost, no `pac-died`, no re-eat;
  plus a **non-vacuity witness** (`sawRegeneratedOnPacTile`) that the body actually
  shared Pac's floored tile while `'regenerated'`.

**Status: mutation-verified both ways** (`npx vitest run --project pac-man`):
- Guard present → full suite **297/297 GREEN** (was 296 + this 1); `npm run lint`
  (tsc --noEmit, repo-wide) clean; `git diff src/core/game.ts` empty (no production
  change).
- Guard deleted (`game.ts:584` removed) → **only the new test fails**
  (`regenerated body must not kill Pac-Man (frame 32): expected 2 to be 3` — Pac
  loses a life when the body reaches the gate); the 7 pre-existing eyes tests stay
  GREEN. This proves the new test uniquely covers line 584 and the old one does not.

**RED note:** because the shipped code is already correct, "RED" here is the
*mutation* going red, not a failure against current code — the proper form of a
test-only coverage rework (the Reviewer asked for exactly this: "Delete the guard →
the new test must go RED. No production change").

### Rule Coverage
| Rule (lang-review typescript.md) | Applies? | Coverage |
|---|---|---|
| #8 Test quality (no vacuous assertions) | Yes | Every `expect` derives from live state; the `sawRegeneratedOnPacTile` witness fails the test if the actors never actually meet — no vacuous green. |
| #15/#18 Guard must be mutation-tested / fails-by-passing | Yes | The whole point: guard deleted → new test RED, mutation-verified; guard present → GREEN. |
| #13/#14 Fix-introduced regressions / state-machine edges | Yes | Pins the `'regenerated'` (released=true) collision edge distinct from the `'eyes'` (released=false) edge the pre-existing check already covers. |

**Handoff:** To Dev (Korben Dallas) for GREEN — a no-op confirmation (the suite is
already 297/297 green and production is unchanged), then on to Reviewer.
## Dev Assessment (Round-Trip 2 — test-only rework)

**Implementation Complete:** Yes — **no production change required.** The Reviewer's
blocker was a *test* gap, not a code defect ("Code is CORRECT as shipped"). TEA's new
test passes against the unchanged guard, so GREEN here is confirmation, not
implementation. Per minimalist discipline I added nothing to `src/`.

**Files Changed (this round):**
- `plugins/pac-man/tests/core/ghost-eyes.test.ts` — TEA's new `'regenerated'`-phase
  collision test (TEA-owned; no Dev edit).
- **Production (`plugins/pac-man/src/`): none** — `git diff --stat` empty.

**Verification:**
- Full suite **297/297 GREEN** (`npx vitest run --project pac-man`).
- `npm run lint` (tsc --noEmit, repo-wide) clean.
- **Independently re-ran the mutation:** removed the guard `if (state.returning[id]
  !== null) continue` (`game.ts:584`) → the new test fails
  (`regenerated body must not kill Pac-Man (frame 32): expected 2 to be 3`) while the
  7 pre-existing eyes tests stay GREEN (`1 failed | 7 passed`); restored the line →
  guard back (grep count 1), production diff empty. Confirms the new test uniquely
  covers line 584.

**No new Delivery Findings / Design Deviations** — nothing was implemented or deviated.

**Handoff:** To Reviewer (Jean-Baptiste Emanuel Zorg) for re-review of the added
test — the single round-1 blocker is now covered; no code changed.
## Subagent Results

Round-trip 2 re-review of a TEST-ONLY change (new `'regenerated'`-phase collision
test closing the round-1 coverage gap). Enabled subagents: preflight, security,
rule_checker (per `workflow.reviewer_subagents`); the other six are disabled and
hand-covered below.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | 297/297 GREEN; tsc --noEmit clean; `git diff src/` empty (test-only); new test block has no `.only`/`.skip`, no console noise, non-vacuity witness present |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Hand-covered: the guarded edge IS the regenerated-phase collision now under test; round-1 already probed eyes convergence from all 270 outside tiles |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Hand-covered: test-only diff, no try/catch, no swallowed error, no silent fallback |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Hand-covered (the crux): dual-mutation verified (full delete AND `=== 'eyes'` weakening both redden ONLY the new test); `sawRegeneratedOnPacTile` witness makes it non-vacuous; per-frame assertions ungated by any `continue` |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Hand-covered: the new describe's block comment accurately states the two-phase guard reasoning; rule_checker independently confirmed rule #17 (no unrun-mechanism claim) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Hand-covered: no new types; test reuses `GhostId`/`GameState`; no stringly-typed API, no `as any` (rule_checker grep-confirmed) |
| 7 | reviewer-security | Yes | clean | none | No injection/leak surface; the 4000-frame loop is provably bounded (plain counted `for`, break is an optimization); no purity violation introduced |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Hand-covered: test is minimal — one describe, one `it`, reuses existing `eatGhost`/`parkPacAway`-style helpers; no over-engineering |
| 9 | reviewer-rule-checker | Yes | clean | 1 resolved, 0 new | Round-1 rule #15/#18 finding **RESOLVED** (guard now mutation-tested); #8 non-vacuous; #1 no type escapes; 0 new violations |

**All received:** Yes (3 enabled returned clean; 6 disabled pre-filled and hand-covered)
**Total findings:** 0 confirmed new, 0 dismissed, 0 deferred — the sole round-1 blocker is verified resolved.

## Reviewer Assessment

**Verdict:** APPROVED (round-trip 2 — the single round-1 test-coverage blocker is closed by a mutation-verified test; no production code changed and the whole story remains sound)

**What was reviewed:** the round-2 delta is exactly one added test in
`plugins/pac-man/tests/core/ghost-eyes.test.ts` — a `'regenerated'`-phase collision
test for the load-bearing guard `if (state.returning[id] !== null) continue`
(`game.ts:584`). The round-1 review already ACCEPTED the implementation itself
(correct eyes-return state machine, honest Dossier ch.4 / `GHOST-EYES` citation, core
purity, forced non-dot-gated exit); the only blocker was that this guard had zero
mutation coverage. That gap is now closed.

**Verification (independent, this round):**
- **Dual mutation.** Deleting `game.ts:584` outright → only the new test fails
  (`regenerated body must not kill Pac-Man (frame 32): expected 2 to be 3`), the 7
  pre-existing eyes tests stay green. Weakening the guard to `=== 'eyes'` (a plausible
  "simplification" that would re-expose the regenerated body) → same result: only the
  new test reddens. Both confirm the test pins the `'regenerated'` (released=true)
  phase specifically, which the pre-existing `if (!released) continue` cannot cover.
- **Non-vacuity.** The `sawRegeneratedOnPacTile` witness is computed from live
  simulation state each frame (`isReturningHome && released` + floored tile == the
  parked gate tile) and asserted true, so the test cannot pass by the actors never
  meeting — the rule #15 "continue skips every iteration" trap is closed.
- **State restored.** `game.ts` is byte-identical after every mutation
  (`git diff -- plugins/pac-man/src` empty); full suite 297/297; `npm run lint` clean.

| Severity | Issue | Location | Status |
|----------|-------|----------|--------|
| — | Round-1 [MEDIUM][TEST][RULE] un-mutation-tested guard | `game.ts:584` (test in `ghost-eyes.test.ts`) | **RESOLVED** — mutation-verified both ways; no open findings |

### Rule Compliance (lang-review typescript.md + CLAUDE.md)
- **#8 Test quality / no vacuous assertions:** VERIFIED compliant — every `expect`
  derives from live `state`; the post-loop `sawRegeneratedOnPacTile` assertion is
  empirically reachable (mutation fires it) and prevents a false green. Compatible
  with the rule (it demands exactly this). evidence: `ghost-eyes.test.ts` new `it`.
- **#15/#18 Guard must be mutation-tested / fails-by-passing:** VERIFIED compliant
  (was the round-1 violation) — dual-mutation reddens only the new test; per-frame
  assertions are not gated behind a skippable `continue`. Compatible with the rule.
- **#1 Type-safety escapes:** VERIFIED compliant — no `as any`/`as unknown`/`@ts-ignore`/
  non-null `!` in the diff (grep-confirmed by rule_checker). Compatible with the rule.
- **#17 Comment asserts an unrun mechanism:** VERIFIED compliant — the new block
  comment's two-phase claim was independently reproduced by mutation. Compatible.
- **core/ purity:** VERIFIED — no production change; `purity.test.ts` green in the 297.
- **Generated file untouched:** VERIFIED — `maze-topology.generated.ts` not in the diff;
  the test reads gate geometry via live `tileAt(13,15)`, not a hardcoded kind.

### Key observations (tags: [EDGE] [SILENT] [TEST] [DOC] [TYPE] [SEC] [SIMPLE] [RULE] [PRE])
- [RULE][TEST] The confirmed round-1 finding is resolved — the guard is now
  mutation-covered (dual-mutation proven), rule_checker concurs (0 new violations).
- [TEST] The test targets the gate tile `{13,15}` — on the regen climb-out and never
  the clear tile `{13,14}` — so with the guard present Pac survives the whole transit,
  and the other three ghosts are held housed via the global counter (7/17/32 at 0) so
  no legitimate chaser pollutes the assertion. Deliberate, correct isolation.
- [EDGE] VERIFIED — the guarded edge (a released, `'regenerated'` body sharing Pac's
  tile mid-climb) is exactly the case now under test; round-1 already retired the
  orbit/softlock worry by probing all 270 outside tiles.
- [SILENT] VERIFIED n/a — test-only diff; no try/catch, swallow, or silent fallback.
- [DOC] VERIFIED — the new describe's comment matches the live guard semantics
  (reproduced by mutation); no stale claim introduced.
- [TYPE] VERIFIED — no new types; reuses `GhostId`/`GameState`; no stringly-typed API.
- [SEC] VERIFIED clean (subagent) — no injection/leak; the 4000-frame loop is provably
  bounded (`break` is an optimization, not required for termination).
- [SIMPLE] VERIFIED — one describe / one `it`, minimal; no over-engineering.
- [PRE] VERIFIED — preflight: 297/297 green, tsc clean, empty `src/` diff, no smells.

### Devil's Advocate
Suppose this test is theatre. The most likely way a "guard is covered" test lies is by
never actually reaching the guarded branch — the classic rule #15 trap where a `continue`
skips every iteration and the assertions inside are decorative. I refused to take the
green run as proof and mutated the guard two independent ways: a full deletion and a
subtler weakening to `=== 'eyes'` that a future refactor might genuinely introduce. Both
reddened only this test, and the failure was the *specific* defect the round-1 finding
named — Pac-Man losing a life to a regenerated body climbing through him — not some
unrelated collateral. Second worry: could the test be green against correct code only by
luck of geometry — e.g. the body never actually floors onto `{13,15}`, so the witness is
false and the whole thing is vacuous? No: the `sawRegeneratedOnPacTile` witness is
asserted true and is computed from real per-frame state, and the mutation run empirically
fired it. Third: does parking Pac on a gate tile test an *unreachable* state, making the
guard "covered" against an impossible input? The gate tile is where a regenerated body
provably transits every return, and the round-1 finding independently reproduced a real
`pac-died` there; the guard protects a reachable path, so pinning it on that path is
legitimate, not synthetic. Fourth: did anything in production quietly change under cover
of a "test-only" round? No — `git diff -- plugins/pac-man/src` is empty after every
mutation and `game.ts` is byte-identical, so the shipped behaviour is exactly what
round-1 approved. Fifth: could the extra `no ghost-eaten` assertion mask a bug? It is a
true invariant but not load-bearing here (frightenedTimer=0 forces the kill branch, not
re-eat); it neither weakens nor inflates coverage. The gap round-1 opened is closed by
the missing artefact — the test — and nothing else moved. Approved.

**Handoff:** To SM (Ruby Rhod) for finish — code review APPROVED, no open findings.
## Sm Assessment (Finish — blocked on boss merge)

**Review APPROVED (round-trip 2).** Finish ceremony started but is paused at the
merge step by design: `pf sprint story finish pm4-3` refused because code PR #203 was
a draft, and per this project's convention the boss merges PRs into protected `develop`
(arcade disallows the squash-merge the finish attempts).

**State:**
- Code PR: https://github.com/slabgorb/arcade/pull/203 — **ready-for-review, MERGEABLE**
  into `develop`. 4 commits (3 round-1 + the round-2 test `6bd23902`).
- Story status: `in_review` (awaiting boss merge).
- Suite 297/297 GREEN, `tsc --noEmit` clean; no production change in round 2.
- Uncommitted `sprint/epic-pm4.yaml` = pm4-3 bookkeeping (status/verdict) — the finish
  re-run will fold this into the sprint-archive.

**Boss action → then resume:**
1. Merge PR #203 via **merge-commit or rebase** (NOT squash — arcade disallows it).
2. Re-run `/pf-sm` (or `pf sprint story finish pm4-3`) — with the code merged, finish's
   merge step no-ops and it proceeds to archive the session + open the sprint-archive PR.
