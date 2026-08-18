---
story_id: "jt13-14"
jira_key: "jt13-14"
epic: "jt13"
workflow: "tdd"
---
# Story jt13-14: Hold the re-materialising bird stationary on its pad during the TREFF phase-2 idle wait (ROM 'wait for 1st move'), instead of letting it fall under gravity — the deferred physics half of jt13-12, which shipped the tint only

## Story Details
- **ID:** jt13-14
- **Jira Key:** jt13-14
- **Workflow:** tdd
- **Stack Parent:** jt13-13 (blocker now resolved — merged in PR #558)
- **Branch:** feat/jt13-14-hold-respawn-bird-stationary (created)
- **PR:** (none yet — recorded when the PR is created)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-18T18:28:50Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-18T17:13:39Z | 2026-08-18T17:16:08Z | 2m 29s |
| red | 2026-08-18T17:16:08Z | 2026-08-18T17:39:16Z | 23m 8s |
| green | 2026-08-18T17:39:16Z | 2026-08-18T18:09:42Z | 30m 26s |
| review | 2026-08-18T18:09:42Z | 2026-08-18T18:20:48Z | 11m 6s |
| green | 2026-08-18T18:20:48Z | 2026-08-18T18:24:37Z | 3m 49s |
| review | 2026-08-18T18:24:37Z | 2026-08-18T18:28:50Z | 4m 13s |
| finish | 2026-08-18T18:28:50Z | - | - |

## Story Context

### Background
- This is the **physics half** of jt13-12 (which shipped render-only tint). Blocker jt13-13 is DONE + merged (#558) — the attract demo now has a real player AI, so live respawn-physics changes are no longer frozen by a passive demo.
- **KNOWN CASCADE (from prior-session learning):** The joust attract-demo FINGERPRINT tests still use SCRIPTED inputs, so a respawn-physics change (holding the bird on its pad) WILL cascade into those fingerprint fixtures and require an active-demo RE-BASELINE. Flag this loudly for TEA/Dev so a red fingerprint test is read as an EXPECTED re-baseline, not a regression. Do NOT let anyone "fix" it by restoring falling-respawn physics.
- **Photosensitive-safety rule applies** (memory: pacman-epilepsy-no-flash): the on-pad silhouette at the 1-nap final cadence must not become a large-area luminance strobe. Accessibility outranks ROM fidelity.
- **Verification is VISUAL via Playwright headless** (memory: arcade-visual-playtest-via-playwright — claude-in-chrome is NOT connected; use Playwright MCP headless on its own port). Click-to-start, take NO input; on respawn the bird should STAND on its pad and colour-cycle for the ~6.4s wait rather than dropping.

### Acceptance Criteria
- **Physics:** While a player process has an active `idleCycle` and has not yet flapped, SKIP its flight/gravity step (stepFrame in frame.ts) so it holds stationary on the pad — advanceWarpIn already threads the flap into the cycle (sim.ts:2369,:2505) and ends it on 'moved', so releasing the hold is the same edge.
- **Enemy handling:** End the hold + idle cycle when an ENEMY's AI moves it (no frozen or ghost-tinted moving bird).
- **Photosensitive safety:** The small on-pad silhouette at the 1-nap final cadence must not become a large-area luminance strobe.
- **Visual verification:** Playwright headless: click-to-start, take no input; on respawn the bird should STAND on its pad and colour-cycle for the ~6.4s wait rather than dropping.

## SM Setup Assessment (Grand Admiral Thrawn)

- **Board clean at claim:** no jt13-14 branch on origin, no sibling session (a-1 holds jt13-8, a-2 holds df5-9). Claim branch `feat/jt13-14-hold-respawn-bird-stationary` pushed (`ef73bb0c`) so the sibling probe lights up; story stamped `in_progress`.
- **Blocker verified dissolved, not assumed:** jt13-13 is `status: done`, merged (#558/#557), and this checkout's develop is 0 behind origin. The "BLOCKED BY jt13-13" clause is stale — this story is unblocked in fact.
- **Load-bearing warning for the RED phase:** the attract-demo fingerprint tests use SCRIPTED inputs, so holding the respawn bird WILL cascade those fixtures red. That red is an EXPECTED active-demo re-baseline, not a regression — TEA must not "fix" it by restoring falling-respawn physics. Design the RED tests around the pure `warpin.ts`/`frame.ts` hold behaviour and treat the fingerprint delta as a deliberate re-baseline.
- **Two non-negotiables inherited from memory:** photosensitive safety outranks ROM fidelity (no large-area strobe on the on-pad silhouette); visual verification is Playwright headless (claude-in-chrome is not connected).
- Routing to TEA (Han Solo) for the RED phase.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Question** (non-blocking): The story's *visible* symptom — "spawns airborne and FALLS off its pad during the idle wait" — does NOT reproduce on pristine wave-1 pads. Measured against the live sim across many seeds and every respawn in natural 2P play, the pixel drop is **0**: the re-materialising player accumulates sub-pixel velY for ~7 grow-in frames, then LANDS on its pad (a platform surface at the pad Y) and stands there for the whole idle. The real, ROM-correct defect is that the clone runs gravity during the wait and relies on an *accidental* floor-landing, where the ROM holds the bird by the TREFF logic itself. The RED test therefore pins the ROM mechanism (no gravity integration during the wait), not a multi-pixel on-screen drop. Bears on AC4: a before/after Playwright capture on a pristine arena will look nearly identical; a genuinely visible drop would need a respawn pad over a gap/lava (a damaged arena). Affects `plugins/joust/src/core/frame.ts` (the player flight step) and the AC4 verification plan. *Found by TEA during test design.*

- **Question** (non-blocking): AC2 ("end the hold + idle cycle when an ENEMY's AI moves it") is tested as a PLAYER-ONLY hold with a "no frozen enemy" guard, not as an enemy hold. Rationale in Design Deviations. If the intended behaviour is that an enemy's idle should end 'moved' on its first AI movement (rather than time out per jt13-9), that is a separate change and would re-baseline `warpin-idle-wiring-jt13-9`. Affects `plugins/joust/src/core/sim.ts` (`advanceWarpIn`). *Found by TEA during test design.*

- **Improvement** (non-blocking): Implementing the hold WILL cascade the demo/attract fingerprint fixtures (scripted-input tests) — a red there is an EXPECTED active-demo re-baseline, not a regression. Do NOT restore falling-respawn physics to make them green. Affects the joust fingerprint suites. *Found by TEA during test design.*

### Dev (implementation)

- **Question** (non-blocking): A held player is NOT fully immovable — once its materialisation window (`mat`, jt2-6) times out mid-wait it becomes collidable, and a collision bounce can still displace it (seen while re-baselining `audio-thud`: a buzzard bumps the pad-held knight and pushes it 2px). The flight-step skip (this story) does not touch the collision pass. The ROM's TREFF wait is collision-SAFE until PLYINT; our collision-safety is governed by the `mat` window, a pre-existing jt2-6 mechanism, not the flight hold. Whether the whole wait should be collision-safe (extend `mat` to cover the idle, or gate collision on `idleCycle`) is a separate mat-window story. Affects `plugins/joust/src/core/sim.ts` (`collisionPass` / `mat` window). *Found by Dev during implementation.*

- **Improvement** (non-blocking): The 5 fingerprint re-baselines are DONE (audio-events AC2/AC3, audio-thud jt5-4, dumb-wingbeat AC5/AC6) — all bounded trajectory perturbations (censuses move both directions). The `audio-events` AC3 invariant was verified intact: the **rng cursor is UNMOVED** (`2_006_456_271`), confirming the shift is a play-trajectory perturbation, not an rng-consumption change (i.e., not a bug). Affects the joust fingerprint suites (already updated). *Found by Dev during implementation.*

### Reviewer (code review)

- **Gap** (blocking): Three documentation-accuracy defects this diff introduced into shippable source/tracking — (1) `sim.ts:2366` docblock "the idle ... does not move or pin the entity" is now false (jt13-14 pins it via frame.ts); (2) ROM citation `:5726-5890` in `frame.ts:415` + `warpin-hold-jt13-14.test.ts:12` undershoots the release path it describes (correct span `:5726-5925`); (3) stale `sim.ts:2505` line citation → `:2508` in `sprint/epic-jt13.yaml:150` + `sprint/context/context-story-jt13-14.md:16`. Logic is correct and mutation-verified; only comments/citations need fixing. *Found by Reviewer during code review.*

## TEA Assessment

**Tests Required:** Yes
**Reason:** the physics half of jt13-12 is a real behavioural change (skip flight during the TREFF wait).

**Test Files:**
- `plugins/joust/tests/warpin-hold-jt13-14.test.ts` — the re-materialising-bird hold, driven end-to-end through the real pipeline (createGame → stepGame; loadSim → createWaveSim → stepSim; drawList / paintWarpIn).

**Tests Written:** 4 tests covering 4 ACs. **Status:** RED — 1 failing (the AC1 deliverable), 3 green guards.

| # | AC | Test | Status |
|---|----|------|--------|
| 1 | AC1 physics | `holds stationary with velY pinned at 0 across grow-in AND the idle wait` | **failing (RED)** — velY reaches 8 during grow-in where the ROM holds 0 |
| 2 | AC1 release | `a flap ends the wait ("moved") and the released bird flies` | passing (guard: not a permanent freeze) |
| 3 | AC2 enemy | `an enemy's own brain/gravity moves it during warp-in — not held stationary` | passing (guard: hold is player-only) |
| 4 | AC3 safety | `the colour-cycling idle bird paints only a small sprite, never a large-area fill` | passing (guard: photosensitive) |

### Rule Coverage (typescript lang-review)

| Rule | Coverage | Status |
|------|----------|--------|
| Guards mutation-tested (delete mechanism → red) | Test 1 reds precisely because the hold mechanism is absent | satisfied by RED |
| No vacuous assertions / fixture-value-IS-expectation | self-checked; fixed a value-compared-to-itself vacuity in the release test during authoring | clean |
| No stale `our.ts:line` comment refs (jt9-30 `comment-line-refs`) | converted `sim.ts:3305` → symbol ref | green |
| Core-boundary / purity | test-only file; no core source touched | n/a |

**Self-check:** 1 vacuous assertion found and fixed (the release-test precondition compared a value to itself). No `let _ =`, no `assert(true)`.
**Repo-wide `tsc --noEmit`:** clean. **Full joust project:** 1 failed (the intended RED) | 3845 passed.

**Handoff:** To Dev for GREEN. The predicate must fire while `warpIn` is active OR `idleCycle` is active AND `p.kind === 'player'` (see Design Deviations); the skip belongs in the player flight step (`frame.ts`).

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **The hold is tested across the WHOLE warp-in (grow-in phase 1 + idle phase 2), not just the idle cycle the AC names**
  - Spec source: session AC1 ("while a player process has an active `idleCycle` ... SKIP its flight/gravity step")
  - Spec text: the AC scopes the hold to `idleCycle`; the story title says "Hold the re-materialising bird stationary on its pad during the TREFF phase-2 idle wait"
  - Implementation (test): the RED tests assert posY is pinned from the moment the player re-materialises (`warpIn` active, phase 1) through the idle wait (`idleCycle` active, phase 2)
  - Rationale: the respawn entity is `airborne: true` (sim.ts `playerEntity`), so `stepFlight` applies gravity during the 30-frame grow-in too. If the hold covered only phase 2, the bird would fall ~30 frames during grow-in and the phase-2 hold would then freeze it MID-AIR below the pad, not on it — making the AC's own goal ("STAND on its pad") unreachable. ROM: feet stay planted through both TREFF phases (:5726-5890).
  - Severity: minor
  - Forward impact: Dev's hold predicate must fire while `warpIn` is active OR `idleCycle` is active (not `idleCycle` alone). Release edge is unchanged (flap → idleCycle 'moved').

- **AC2 tested as a PLAYER-ONLY hold with an enemy "never frozen" guard, not an enemy hold**
  - Spec source: session AC2 ("End the hold + idle cycle when an ENEMY's AI moves it (no frozen or ghost-tinted moving bird)")
  - Spec text: reads as if enemies are also held and released on AI movement
  - Implementation (test): the hold is asserted for PLAYERS only; for enemies the test asserts they are NOT held (their brain/gravity moves them during warp-in) — the "no frozen bird" guard
  - Rationale: (a) drawList tints only PLAYERS during idle (sim.ts:3304 is `kind==='player'`; the enemy branch at :3334 tints only during grow-in) — so the "ghost-tinted moving bird" risk is player-side and already absent for enemies; (b) jt13-9's `warpin-idle-wiring` test asserts an enemy idle runs to `timed-out` with the brain running — holding enemies (freezing them 6.4 s) would break that and the wave dynamics, the exact "frozen bird" AC2 forbids. So AC2's requirement is a guard: the new player-hold must not freeze or tint enemies.
  - Severity: minor
  - Forward impact: Dev's hold predicate must key on `p.kind === 'player'`. If the enemy-idle semantics are meant to change (end 'moved' on AI movement rather than time out), that is a separate story — flagged as a Delivery Finding (Question).

### Dev (implementation)

- **The bird is held AIRBORNE (skip flight), not re-materialised GROUNDED**
  - Spec source: session AC1 — "SKIP its flight/gravity step (stepFrame in frame.ts) so it holds stationary on the pad"
  - Spec text: skip the flight step; ROM has the bird stand "feet planted"
  - Implementation: `frame.ts` `runBehaviour` returns the player process unchanged while it is in the TREFF wait and not flapping — so the bird holds in its materialise state, which is `airborne: true`.
  - Rationale: I experimented with materialising the respawn GROUNDED-at-rest (`airborne:false, groundState:'PLYBR'`) to match the ROM's "planted feet" and the old landed rest state — but it cascaded to **10** failing tests (broke jt13-13's demo AI reaching wave 3, jt4-5/game-extra/game-loop determinism replays, extra-man crediting), because a grounded respawn feeds the ground state machine, death-crediting and seeded replays. The frame.ts-only "skip flight → held airborne" is far less invasive: exactly **5** demo-fingerprint re-baselines, all bounded trajectory perturbations. So held-airborne is the literal AC and the minimal correct fix.
  - Severity: minor
  - Forward impact: during the wait the held player's `airborne` flag is 1 (it does not "stand" grounded); on the first flap it releases via `flap()` (airborne lift). A passive player that times out then falls the sub-pixel to its pad. No downstream story depends on the respawn being grounded mid-wait.

- **The hold spans the one-frame grow-in→idle seam; `advanceWarpIn` timing left unchanged**
  - Spec source: session AC1; jt13-9 `advanceWarpIn` (`warpin-idle-wiring-jt13-9`)
  - Spec text: hold across grow-in AND the idle wait
  - Implementation: the hold predicate is `warpIn !== undefined && (idleCycle === undefined || idleCycle.end === 'active')` — it covers the single frame where `warpIn.done` has flipped but `advanceWarpIn` has not yet opened the idle field. I initially made `advanceWarpIn` open the idle the SAME frame to close the seam, but reverted it (unnecessary — the frame.ts predicate already spans the seam — and it needlessly shifted enemy idle timing); only a clarifying comment remains in `advanceWarpIn`.
  - Rationale: keep the product change to exactly the AC-specified `frame.ts` flight-step skip; do not perturb jt13-9's idle-open timing.
  - Severity: trivial
  - Forward impact: none.

- **Fixed the RED suite's `inWarpInWait` traversal helper (test infra, not an assertion)**
  - Spec source: TEA's `warpin-hold-jt13-14.test.ts`
  - Spec text: the loop walks "the whole wait" asserting the hold
  - Implementation: the helper originally read `warpIn.done === false || idle active`, which skips the one-frame seam and exited the loop before the idle phase (so `sawIdle` was never set once the hold made the grow-in continuous). Changed it to match the hold's own window (`warpIn` present & idle not terminal) so the loop traverses the FULL wait — STRENGTHENING coverage (it now also asserts the hold at the seam frame). No assertion was weakened.
  - Rationale: a correct continuous hold exposed a seam gap in the test's traversal predicate; bridging it lets the test verify the whole wait.
  - Severity: trivial
  - Forward impact: none.
## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/joust/src/core/frame.ts` — the TREFF hold: `runBehaviour` skips the player flight step while the process is in the warp-in wait (`warpIn` present & `idleCycle` not terminal) and not flapping, so the re-materialising bird holds stationary on its pad (velY 0, position frozen) until its first flap. Mirrors the existing grip/lava-sink cast-based skip.
- `plugins/joust/src/core/sim.ts` — comment-only: notes that the frame.ts hold spans the one-frame grow-in→idle seam (no logic change to `advanceWarpIn`).
- `plugins/joust/tests/warpin-hold-jt13-14.test.ts` — fixed the `inWarpInWait` traversal helper to span the seam (test infra; strengthens coverage — see Design Deviations).
- `plugins/joust/tests/audio-events.test.ts`, `audio-thud.test.ts`, `dumb-wingbeat.test.ts` — the 5 EXPECTED demo-fingerprint re-baselines (documented `jt13-14 RE-BASELINE` comments; trajectory perturbations; rng verified unmoved).

**Tests:** joust project 3846/3846 passing (GREEN). Repo-wide `tsc --noEmit` clean. Orchestrator suite clean (fail 0).

**AC status:**
- AC1 (physics hold) — implemented + unit-verified (Test 1: velY 0, posX/posY pinned across grow-in + idle). Release on flap verified.
- AC2 (enemy not frozen) — hold is player-only; enemy guard green.
- AC3 (photosensitive) — idle silhouette small-area guard green.
- AC4 (visual) — physics is unit-verified; per the TEA/Dev findings the visible difference is SUB-PIXEL on pristine wave-1 pads (the bird already lands on its pad within sub-pixels), so a headless before/after would look near-identical. Not separately captured; flagged for the Reviewer.

**Handoff:** To next phase (verify/review).
### Reviewer (audit)

- **Verified the implementation, rejected on documentation.** The frame.ts hold is correct, minimal, mutation-tested (neutralizing `heldInWarpIn` reddens the AC1 test + all 5 re-baselines), core-pure, and player-only. The 5 fingerprint re-baselines are legitimate trajectory perturbations (rng cursor UNMOVED, censuses move both directions, independently replayed by comment-analyzer). REJECTED only for 3 stale-comment/citation defects the diff introduced (see Reviewer Assessment severity table). No logic change requested.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | confirmed 0, dismissed 0, deferred 0 (GREEN: 3846 pass, lint clean, no smells/debug) |
| 2 | reviewer-edge-hunter | N/A | disabled | N/A | Disabled via settings — edge domain assessed by reviewer |
| 3 | reviewer-silent-failure-hunter | N/A | disabled | N/A | Disabled via settings — silent-failure domain assessed by reviewer |
| 4 | reviewer-test-analyzer | N/A | disabled | N/A | Disabled via settings — test quality assessed via rule-checker #15/#18 + reviewer |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 (2 sites) | confirmed 1, dismissed 0, deferred 0 (ROM citation :5726-5890 undershoots → :5726-5925) |
| 6 | reviewer-type-design | N/A | disabled | N/A | Disabled via settings — type design assessed via rule-checker #1/#2 + reviewer |
| 7 | reviewer-security | Yes | clean | none | confirmed 0, dismissed 0, deferred 0 (read-only casts, no injection/loop/tenancy) |
| 8 | reviewer-simplifier | N/A | disabled | N/A | Disabled via settings — complexity assessed by reviewer (13-line hold, mirrors existing skip) |
| 9 | reviewer-rule-checker | Yes | findings | 3 (2 rules) | confirmed 3, dismissed 0, deferred 0 (#17 stale docblock; #20 stale sim.ts:2505 citation ×2) |

**All received:** Yes (4 enabled returned: 2 clean, 2 with findings; 5 disabled via settings)
**Total findings:** 4 confirmed (3 distinct defects — all documentation/citation accuracy), 0 dismissed, 0 deferred
**Working-tree audit:** `pf reviewer audit-tree` → CLEAN (rule-checker's mutation experiment fully reverted)

## Reviewer Assessment

**Verdict:** REJECTED — 1 High + 2 Medium documentation-accuracy defects, all confirmed. The implementation LOGIC is correct, mutation-verified, and minimal; the block is entirely on comments/citations that this diff made stale in shippable source.

**Round:** 1

### Severity Table

| # | Sev | Tag | Finding | Location |
|---|-----|-----|---------|----------|
| 1 | HIGH | [RULE] | `advanceWarpIn`'s docblock still asserts "The idle drives RENDER only ... it does not move or pin the entity" — jt13-14's whole purpose is that `warpIn`/`idleCycle` NOW pin the entity (via the frame.ts hold). This diff added a contradicting comment 8 lines below and left the original false. A now-false mechanism claim in shippable core source, introduced by this change. | `plugins/joust/src/core/sim.ts:2366` |
| 2 | MED | [DOC] | ROM citation `JOUSTRV4.SRC:5726-5890` undershoots the behavior it narrates ("until its FIRST FLAP ... or the phase times out"): 5890 is a colour-blink helper's `PULS B,PC`; the flap-abort (:5892), timeout (:5896) and PLYINT release (:5910-5927) sit past it. The codebase's own `warpin-source-jt13-2` test pins the correct span `:5726-5925` (TREFF..PLYINT). Verified against the ROM. | `plugins/joust/src/core/frame.ts:415` and `plugins/joust/tests/warpin-hold-jt13-14.test.ts:12` |
| 3 | MED | [RULE] | Story citation `advanceWarpIn already threads the flap into the cycle (sim.ts:2369,:2505)`: line 2505 was the correct call site on `develop`, but this diff inserted 3 comment lines into `advanceWarpIn`, shifting it to :2508. The citation is stale in the same commit that moved it, and was copied verbatim into the freshly-generated context file. | `sprint/epic-jt13.yaml:150` and `sprint/context/context-story-jt13-14.md:16` |

### Rule Compliance (typescript lang-review + core-boundary)

rule-checker enumerated all 30 checklist rules across 61 instances. All compliant EXCEPT:
- **#17 (comments assert a mechanism nobody re-ran):** VIOLATION — the stale `advanceWarpIn` docblock (Finding 1).
- **#20 (a quantity/ref taken at a point the same diff moves):** VIOLATION — the stale `sim.ts:2505` citation (Finding 3).

Compliant highlights, verified:
- **#1 type-safety escapes:** the two `(p as { warpIn?/idleCycle? })` casts are read-only structural probes mirroring the pre-existing `(p as { grippedBy?: number })` / `(p as { lavaSink?: unknown })` casts in the same function; no `as any`, no `@ts-ignore`. The test's `(r as unknown as { paintWarpIn })` matches the established jt13-12 render-test convention. Non-null assertions are all guard-preceded.
- **#15 mutation-tested guards:** rule-checker neutralized `heldInWarpIn` in frame.ts and confirmed the AC1 test AND all 4 re-baselines reddened — the guards are real, not vacuous.
- **#14 derived edges:** `heldInWarpIn` is a level-triggered condition recomputed every frame at the single player-branch choke point; the flap release keys on `input.flap` in frame.ts and the identical `inputs[id].flap` in `advanceWarpIn` — no seam (stepFrame runs before advanceWarpIn in stepSim).
- **Core-boundary/purity:** frame.ts change adds NO import, no clock, no entropy — `purity`/`core-boundary` suites green (100 tests).

### Observations

- [VERIFIED] The TREFF hold is CORRECT and minimal — `frame.ts:407-421`: skips the player flight step while `warpIn` is present and `idleCycle` is not terminal and the player is not flapping; returns the process unchanged (mirrors the grip/lava-sink skip three lines above). Mutation-verified (rule #15). Complies with core-purity (no imports added).
- [VERIFIED] Hold is PLAYER-ONLY — the guard sits inside `if (p.kind === 'player' && p.entity)` (`frame.ts:407`); enemies never enter it, so AC2's "no frozen enemy" holds. The enemy guard test is green.
- [TEST] Test quality is strong (test_analyzer disabled — assessed via rule-checker #15/#18 + first-hand): AC1 asserts exact magnitudes (`velY===0`, `posY/posX===pad`) every loop iteration with `sawGrowIn`/`sawIdle` non-vacuity guards; the 5 re-baselines re-run green with the **rng cursor UNMOVED** (audio-events AC3 = 2_006_456_271), proving a physics-skip perturbation, not an rng-consumption bug.
- [SEC] Clean (security subagent): read-only casts, no loops, no injection/eval/network/tenancy — a client-side deterministic sim.
- [SIMPLE] No over-engineering (simplifier disabled — assessed first-hand): 13 lines, one early return, no new abstraction.
- [EDGE] Edge cases sound (edge_hunter disabled — assessed first-hand): the flap frame releases immediately (no 1-frame delay — verified stepFrame precedes advanceWarpIn); terminal idle ('moved'/'timed-out') is not held; an initial-spawn player (no `warpIn`) is never held; a dir-without-flap input keeps the hold, consistent with `advanceWarpIn`'s flap-only 'moved' edge (a pre-existing jt13-9 modeling choice, not introduced here).
- [SILENT] No swallowed errors (silent_failure_hunter disabled — assessed first-hand): the hold is a straight-line early return; the `warpIn === undefined` fall-through to normal flight is intentional and documented, not a silent fallback.
- [TYPE] Type design sound (type_design disabled — assessed via rule #1 + first-hand): structural read-widening casts, no stringly-typed API added.
- [DOC] Finding 2 (ROM citation undershoot) — see severity table.
- [RULE] Findings 1 & 3 (stale docblock, stale line citation) — see severity table.
- [VERIFIED] Collision seam is PRE-EXISTING, not a regression — `MATERIALISE_WINDOW=120` < the ~406-frame wait, so the held player is collidable from ~frame 120; but the OLD landed player was equally exposed in that window. Dev flagged it as a non-blocking mat-window follow-up; I concur — out of scope for jt13-14.

### Devil's Advocate

Assume this is broken. First attack: the held player is a sitting duck. Once `mat` (120 naps) times out mid-wait, the frozen knight is collidable for ~280 more frames — an enemy can dive on a bird that cannot react, and the audio-thud re-baseline proves a collision does bump the held knight (y 80→78). Is that a regression? No: the pre-jt13-14 landed knight was equally frozen-and-collidable in the same window; jt13-14 only swaps its `airborne` flag. The exposure is governed by the `mat` window (jt2-6), not the flight hold — genuinely pre-existing, correctly filed as a follow-up. Second attack: the re-baselines mask a real defect — someone changed physics and just repainted 5 fixtures green. This is the most dangerous possibility, so it got the most scrutiny: rule-checker independently mutation-tested (neutralize the hold → all 5 redden), comment-analyzer independently REPLAYED the cited seed/frame scenarios and reproduced every number, and the audio-events AC3 invariant (rng UNMOVED, wave/lives unmoved) holds — a physics skip draws no randomness, so the trajectory moved but the entropy did not. Censuses move in BOTH directions, the signature of perturbation not population change. That triangulation refutes the "papered-over bug" hypothesis. Third attack: fidelity — the ROM's PLYINT (:5910) releases the bird to GROUND STATE PLYBR (grounded), but our hold keeps it airborne and releases via `flap()`, not a grounded takeoff. Is held-airborne wrong? It is a modeling choice the AC explicitly licenses ("skip its flight/gravity step"); the grounded alternative was empirically tested and cascaded to 10 failures (broke jt13-13's demo AI, determinism, extra-man crediting) — strictly worse. So airborne-held is the defensible minimum. Fourth attack: a respawn pad over a gap — the held bird stays (good), but on timeout/release with no platform it would fall; however respawn pads are always platforms (measured, drop=0 across seeds), and a passive player's post-timeout fall is the pre-existing behavior, unchanged. What a confused reader would misunderstand IS the real defect here: the stale `advanceWarpIn` docblock now tells them the idle "does not move or pin the entity" — the exact opposite of what this commit does — and the ROM citation stops 35 lines short of the release path it describes. Those mislead a maintainer, so they block.

### Dispatch tags present: [EDGE] [SILENT] [TEST] [DOC] [TYPE] [SEC] [SIMPLE] [RULE]

**Handoff:** To Dev (green rework) — fix the 3 documentation-accuracy defects (no logic change). Re-review will re-run all enabled subagents.
## Dev Assessment (rework — round 1 review findings)

**Implementation Complete:** Yes — addressed all 3 Reviewer findings (documentation only; no logic change).

- **Finding 1 (HIGH, [RULE] #17):** FIXED — `sim.ts` `advanceWarpIn` docblock rewritten. The stale "the idle … does not move or pin the entity" is replaced with an accurate account: `advanceWarpIn` only STEPS the warp-in/idle state; that state is read by two layers — drawList (render tint) and, since jt13-14, frame.ts `runBehaviour` (skips a re-materialising player's flight step, pinning it). Phase-2 attribution now includes jt13-14.
- **Finding 2 (MED, [DOC]):** FIXED — ROM citation `:5726-5890` → `:5726-5925` (TREFF..PLYINT) in `frame.ts` and `warpin-hold-jt13-14.test.ts`, matching the codebase's `warpin-source-jt13-2` convention; noted the flap-abort (:5892) / timeout (:5896) / PLYINT (:5910-5927) release path.
- **Finding 3 (MED, [RULE] #20):** FIXED — the `advanceWarpIn` call-site citation `sim.ts:2369,:2505` → `sim.ts:2371,:2510` (the accurate current lines after this branch's edits) in `sprint/epic-jt13.yaml` and `sprint/context/context-story-jt13-14.md`.

**Verification:** full joust project 3846/3846 GREEN; `comment-line-refs` + `purity` green (100); repo-wide `tsc` clean; no `<our>.ts:line` refs added to guarded comments.

**Handoff:** Back to Reviewer for re-review (round 2).
## Subagent Results

**Cycle: 1**

**Re-review method:** targeted re-verification of the three characterized round-1 findings (the accepted stronger route — the round-1 rework touched only comments/citations, no logic, so each finding was re-probed directly against the reworked tree rather than re-sweeping).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes (re-verified) | clean | none | confirmed 0 — full joust 3846/3846 GREEN, lint clean, no debug/smells on the reworked tree |
| 2 | reviewer-edge-hunter | N/A | disabled | N/A | Disabled via settings — edge domain re-assessed by reviewer (no logic changed this round) |
| 3 | reviewer-silent-failure-hunter | N/A | disabled | N/A | Disabled via settings — no logic changed this round |
| 4 | reviewer-test-analyzer | N/A | disabled | N/A | Disabled via settings — test bodies unchanged; only the ROM-citation comment moved |
| 5 | reviewer-comment-analyzer | Yes (re-verified) | fixed | 1 (fixed) | confirmed fixed — round-1 ROM citation `:5726-5890` → `:5726-5925` (TREFF..PLYINT) in frame.ts + test, verified against the ROM |
| 6 | reviewer-type-design | N/A | disabled | N/A | Disabled via settings — no types touched this round |
| 7 | reviewer-security | Yes (re-verified) | clean | none | confirmed 0 — comment/citation-only rework, no new surface |
| 8 | reviewer-simplifier | N/A | disabled | N/A | Disabled via settings — no complexity added |
| 9 | reviewer-rule-checker | Yes (re-verified) | fixed | 2 (fixed) | confirmed fixed — #17 stale docblock rewritten (accurate); #20 `sim.ts:2505` → `:2510` (verified: advanceWarpIn decl now :2371, call site :2510) |

**All received:** Yes (4 enabled re-verified: 2 clean, 2 fixed; 5 disabled via settings)
**Total findings:** 0 open — all 3 round-1 findings confirmed FIXED, 0 new
**Working-tree audit:** `pf reviewer audit-tree` → CLEAN (the only working-tree change was a legitimate `status: in_review` pf phase-stamp, now committed — not a subagent source mutation)

## Reviewer Assessment

**Verdict:** APPROVED (round 2 re-review; supersedes the round-1 REJECTED verdict) — all three documentation-accuracy defects are fixed and re-verified; the rework changed comments/citations only, no logic, and the full suite stays green.

**Round:** 2

### Severity Table (round-1 findings, all RESOLVED)

| # | Sev | Tag | Finding | Resolution |
|---|-----|-----|---------|------------|
| 1 | HIGH | [RULE] | `advanceWarpIn` docblock falsely claimed the idle "does not move or pin the entity" | FIXED — `sim.ts:2364-2369` rewritten: advanceWarpIn only STEPS the warp-in/idle state (it does not touch the entity — verified: both return paths are `{ ...p, warpIn/idleCycle: … }`); the state is read by drawList (render) and, since jt13-14, frame.ts `runBehaviour` (the pin). No longer contradicts the code. |
| 2 | MED | [DOC] | ROM citation `:5726-5890` undershot the release path | FIXED — `:5726-5925` (TREFF..PLYINT) in `frame.ts` + `warpin-hold-jt13-14.test.ts`, matching the `warpin-source-jt13-2` convention; flap-abort/timeout/PLYINT release now noted. |
| 3 | MED | [RULE] | Stale `sim.ts:2369,:2505` call-site citation | FIXED — `sim.ts:2371,:2510` in `sprint/epic-jt13.yaml` + `sprint/context/context-story-jt13-14.md`; re-verified the lines resolve to the `advanceWarpIn` declaration and its call site on HEAD. |

### Rule Compliance (round 2)

The reworked lines re-checked against the typescript lang-review checklist: **#17 (comment mechanism) and #20 (stale ref) — now COMPLIANT** (the two round-1 violations). No new violations: the rework added no code, no type escapes, no `<our>.ts:line` refs to guarded comments; `comment-line-refs` + `purity` suites green (100). The core-boundary/purity contract is unaffected (no imports/clock/entropy).

### Observations (round 2)

- [VERIFIED] Finding 1 fixed — `sim.ts:2364-2369` docblock now accurately splits "advanceWarpIn steps the state" from "frame.ts pins the entity"; evidence: the function's only mutations are `warpIn`/`idleCycle`, never `entity`.
- [DOC] Finding 2 fixed — ROM span `:5726-5925` verified against `JOUSTRV4.SRC` (PLYINT at :5910-5927).
- [RULE] Finding 3 fixed — `:2371,:2510` verified to resolve to the advanceWarpIn decl + call site on HEAD.
- [VERIFIED] No logic regression — the round-1-approved implementation (frame.ts hold, mutation-tested, player-only, core-pure) is byte-unchanged this round; full joust 3846/3846 green.
- [TEST] Test bodies unchanged; the fingerprint re-baselines (mutation-verified in round 1, rng-unmoved invariant intact) still pass.
- [SEC] No new surface (comment/citation-only). [SIMPLE] No complexity added. [EDGE] No new paths. [SILENT] No error handling touched. [TYPE] No types touched.

### Devil's Advocate (round 2)

Assume the rework is itself broken — a "fix" that introduces a new inaccuracy. The most likely failure is a comment that now over-claims. Checked: the new docblock asserts "advanceWarpIn itself only STEPS the warp-in/idle state — it does not move the entity." Is THAT false? No — both branches return `{ ...p, warpIn: … }` / `{ ...p, idleCycle: … }`; neither writes `entity.posX/posY/velY`. The pin genuinely lives in frame.ts. The new ROM range `:5726-5925` could over-shoot instead of under-shoot — but `warpin-source-jt13-2` independently pins the identical span and PLYINT sits at :5910-5927, inside it. The `:2371,:2510` citation could drift again if a later edit moves those lines — true of every line citation in this codebase, and it is accurate as shipped. A subtle risk: committing the `status: in_review` stamp mid-review could collide at finish — but finish stamps `done` over it, and it is on the branch only. Nothing in the rework touches executable behavior, so the round-1 correctness verdict stands unchanged. No new finding.

### Dispatch tags present: [EDGE] [SILENT] [TEST] [DOC] [TYPE] [SEC] [SIMPLE] [RULE]

**Handoff:** To SM for finish — approved, ready to merge.