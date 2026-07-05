---
story_id: "A2-5"
jira_key: "A2-5"
epic: "A2"
workflow: "tdd"
---
# Story A2-5: Ship death breakup animation — ship fractures into drifting, fading line segments

## Story Details
- **ID:** A2-5
- **Jira Key:** A2-5
- **Repos:** asteroids
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch Strategy:** gitflow (feat/A2-5-ship-death-breakup-animation)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-05T17:54:24Z
**Round-Trip Count:** 3

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-05T16:18:11Z | 2026-07-05T16:20:24Z | 2m 13s |
| red | 2026-07-05T16:20:24Z | 2026-07-05T16:35:57Z | 15m 33s |
| green | 2026-07-05T16:35:57Z | 2026-07-05T16:47:35Z | 11m 38s |
| review | 2026-07-05T16:47:35Z | 2026-07-05T16:58:53Z | 11m 18s |
| red | 2026-07-05T16:58:53Z | 2026-07-05T17:06:54Z | 8m 1s |
| green | 2026-07-05T17:06:54Z | 2026-07-05T17:11:12Z | 4m 18s |
| review | 2026-07-05T17:11:12Z | 2026-07-05T17:30:24Z | 19m 12s |
| red | 2026-07-05T17:30:24Z | 2026-07-05T17:44:46Z | 14m 22s |
| green | 2026-07-05T17:44:46Z | 2026-07-05T17:47:57Z | 3m 11s |
| review | 2026-07-05T17:47:57Z | 2026-07-05T17:54:24Z | 6m 27s |
| finish | 2026-07-05T17:54:24Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

No upstream findings

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **Improvement** (non-blocking): Ship polygon geometry (NOSE=130/TAIL=70/HALF_WIDTH=75/NOTCH=35 + the `heading()` formula) currently lives only in `shell/render.ts`'s private `drawShip`, but `core/shipDebris.ts` (pure sim layer, cannot import from shell) needs the identical geometry to spawn debris that matches the rendered ship at the moment of death. `tests/shipDebris.test.ts` reproduces this geometry independently rather than importing it. Affects `asteroids/src/shell/render.ts` and the new `asteroids/src/core/shipDebris.ts` (risk: the two copies tune apart over time — the same "one function, not parallel copies" problem `bounds.ts`'s own doc comment describes solving for wrap logic). Dev should consider hoisting these constants into a shared core module both layers import. *Found by TEA during test design.*

- **Improvement** (non-blocking, resolved during implementation): Acted on the finding above — hoisted ship geometry into a new `asteroids/src/core/shipShape.ts` (`SHIP_NOSE/SHIP_TAIL/SHIP_HALF_WIDTH/SHIP_NOTCH`, `shipHeading`, `shipVertices`), imported by both `core/shipDebris.ts` and `shell/render.ts` (which now calls `shipVertices` in `drawShip` instead of a locally-duplicated vertex literal). One shared function, not two independently-tuned copies. *Found by Dev during implementation.*
- **Gap** (non-blocking): Two pre-existing regression guards (`tests/collision.test.ts`, `tests/rocks.test.ts`) asserted zero rng consumption in scenarios where the ship incidentally dies — an assumption this story's `breakShip` now legitimately breaks. Both were updated (see Design Deviations, Dev section) rather than left red. Affects `asteroids/tests/rocks.test.ts` (the `rock()` helper's default position sits exactly on the ship's default spawn point, `{4096, 3072}` — a latent fixture trap for any future story that adds another ship-death side effect). *Found by Dev during implementation.*
- **Gap** (blocking): `shipDebris` is never aged past a run's final death — `stepGame`'s `'attract'`/`'gameover'` early-return branches (`sim.ts:228-229`) never reach the `updateShipDebris` call (`sim.ts:282`), so debris freezes (stops fading AND stops drifting) the instant the game ends, and stays frozen through the entire GAME OVER card and into the following attract-mode loop until a new game resets `GameState` from scratch. Affects `asteroids/src/core/sim.ts` (`stepGameOver`, `stepAttract` — both need to age `shipDebris`, or the destruction edge should clear it before the terminal transition). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `src/shell/render.ts`'s new `drawShipDebris` and its wiring have zero test coverage — `tests/render-wiring.test.ts`'s existing "draws every live entity class" regex-check (which already covers `state.rocks`/`state.bullets`/`state.saucer`/`shipDestroyed`) was never extended to `state.shipDebris`, and `tests/render.test.ts`'s mock-ctx harness never exercises the alpha-fade-by-life logic. Affects `asteroids/tests/render-wiring.test.ts`, `asteroids/tests/render.test.ts`. *Found by Reviewer during code review (corroborated by reviewer-test-analyzer, high confidence).*
- **Improvement** (non-blocking): `breakShip`'s inheritance of `ship.vel` into each debris segment's velocity is completely unverified — every geometry/motion fixture in `shipDebris.test.ts` uses a stationary ship (`vel: {0,0}`); a mutant deleting the `ship.vel.x +`/`ship.vel.y +` terms would pass all 33 tests. Affects `asteroids/tests/shipDebris.test.ts`. *Found by Reviewer during code review (via reviewer-test-analyzer, high confidence).*
- No upstream findings during rework (test design, round 1). All 6 Reviewer findings were addressed as tests exactly as specified; no new gaps surfaced while writing them. *Found by TEA during rework test design.*

### Dev (implementation, rework round 1)
- No upstream findings. The Reviewer's HIGH finding (debris freezes once `mode` leaves `'playing'`) was a self-contained `sim.ts` logic gap, now fixed by aging `shipDebris` in `stepGameOver`/`stepAttract`; no additional gaps, conflicts, or questions surfaced while implementing it. *Found by Dev during rework implementation.*

### Reviewer (code review, rework round 1)
- **Gap** (blocking): The `stepAttract` half of the HIGH-bug fix (`sim.ts:162`) is verified-unguarded — the "keeps fading into attract mode too" test takes the non-qualifying 3s-timed gameover path where debris always fades before attract, so it passes even with the aging reverted (mutation-confirmed, 740/740 green). The path IS reachable (fast qualifying high-score confirm → attract with live debris, no min-display gate at `sim.ts:198-214`). Affects `asteroids/tests/shipDebris.test.ts` (add a test that routes through the qualifying-confirm→attract path, or a direct `mode:'attract'` fixture with live debris, and fails if `sim.ts:162` aging is reverted). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `tests/shipDebris.test.ts:493` hardcodes `GAME_OVER_DISPLAY_S` as a bare `3`; import the re-exported constant (`sim.ts:84`) so the loop bound can't silently desync. Affects `asteroids/tests/shipDebris.test.ts`. *Found by Reviewer during code review.*

### TEA (test design, rework round 2)
- **Improvement** (non-blocking, process): The Reviewer routed this rework to `red`/TEA, but the finding (H-1) is a regression-pin gap on ALREADY-CORRECT code — so the new pins are GREEN, and the `red`-phase `tests-fail` gate ("at least one test MUST be failing") cannot honestly pass. The workflow's own canonical recovery for a reviewer rework is `target_phase: green` (`tdd.yaml:70-71`), which fits better: the `dev-exit` gate only requires tests green. Transitioning red→green and handing to Dev (who confirms green + forwards) rather than forcing a fake failing test. Affects the TDD workflow's reviewer-rework routing when a rework is test-only (no code change). *Found by TEA during test design.*
- No other upstream findings — H-1/L-1/L-2 were closed exactly as the Reviewer specified; Dev's implementation is correct and needs no change. *Found by TEA during test design.*

### Dev (implementation, rework round 2)
- No upstream findings. This was a confirm-green pass over a test-only round — TEA's H-1 attract-aging pins (`942ee9d`) are GREEN against Dev's already-correct round-1 code, no source was touched, and nothing new surfaced while verifying (743/743, build clean). *Found by Dev during rework confirmation.*

### Reviewer (code review, rework round 2)
- No upstream findings during code review. H-1 is genuinely closed (mutation independently reproduced by the Reviewer — the 3 new pins fail iff `stepAttract`'s aging is reverted), L-2 resolved (named-constant import), L-1 substantially folded into the qualifying-path pin. The test-only delta introduces no new code, no new smells, no new deviations. Story is APPROVED. *Found by Reviewer during code review.*

## Sm Assessment

**Story:** A2-5 — Ship death breakup animation — ship fractures into drifting, fading line segments (3 pts, p2, epic A2 playtest followup).

**Setup performed:**
- Session file created at `.session/A2-5-session.md`; story context at `sprint/context/context-story-A2-5.md`.
- Branch `feat/A2-5-ship-death-breakup-animation` created from `develop` in the asteroids subrepo (gitflow).
- Jira explicitly skipped — this project tracks issues in local sprint YAML only; there is no Jira instance.
- Merge gate verified clear: no open PRs in asteroids.
- Sprint YAML integrity checked after setup: no unintended diffs to any epic YAML (known pf tooling risk).

**Note:** No acceptance criteria or technical approach recorded in the raw sprint YAML for this story — only the title. TEA to define ACs and test approach during the RED phase, using the story title's described behavior (ship destruction fractures into drifting, fading line segments — consistent with the existing rock-split debris visual language already in the asteroids codebase).

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- No deviations from spec. No ACs or technical approach existed in the sprint YAML for this story (see Sm Assessment above) — TEA originated the ACs below via tests, per the SM's explicit handoff note, rather than deviating from a pre-existing one. Design choices made in the absence of spec (documented in TEA Assessment, not logged as deviations since there is nothing higher-authority to diverge from):
  - Debris `life` counts down in seconds (`life - dt`), not bullet.ts's frame-timer cadence (`SHOT_TIMER_PERIOD_FRAMES`) — simpler, and nothing in the story implies the ROM-authenticity bar bullet timing carries.
  - `updateShipDebris` does not wrap the toroidal field (bullet.ts's non-wrap precedent, not rocks.ts's wrap) — cosmetic debris fading out before reaching the edge is the expected case; wrapping ash from a death at the world center would rarely even matter.
- **Rework round 1 (post-Reviewer-rejection):** No deviations — the new tests implement the Reviewer's own specified fixes verbatim (their "Fix Required" column), not a reinterpretation. No new technical-approach decisions were needed.
- **Rework round 2 (post-Reviewer-rejection, H-1):** No deviations from the Reviewer's ask. Implemented BOTH options the Reviewer offered for H-1 (a direct `mode:'attract'` fixture AND the qualifying-confirm→attract path) plus L-1 (qualifying sub-path) and L-2 (import `GAME_OVER_DISPLAY_S`). One judgment note (not a spec deviation): unlike round 1 (which had 2 genuinely-RED tests because the HIGH bug was unfixed), this round's pins are all GREEN against Dev's already-correct code — there is no honest RED test to write. Each pin was instead **mutation-verified**: temporarily reverting `stepAttract`'s aging turned all 3 RED (proof of non-vacuousness), then the source was restored via `git checkout` (net-zero source change — no implementation was written; this is test-quality verification, TEA's core mandate, and precisely the step whose absence caused the round-1 vacuous test).

### Dev (implementation)
- **Two pre-existing rng-discipline regression guards updated (Conflict, resolved)**
  - Spec source: `tests/collision.test.ts` ("does NOT split or destroy the rock the ship rammed") and `tests/rocks.test.ts` ("leaves the drift consuming no randomness") — both sibling-story (A-7/A-8/A-6) regression guards, not this story's own tests.
  - Spec text: both asserted `s1.rng.seed === s0.rng.seed` (or equivalent) for a scenario where the ship incidentally dies (one deliberately — a ship-vs-rock ram; one by fixture coincidence — a rock's default position exactly on the ship's spawn point).
  - Implementation: `breakShip` (this story's own TEA-specified contract) legitimately consumes rng on every ship death. This is REQUIRED by TEA's own tests (`shipDebris.test.ts`'s "consumes randomness from the rng" / "draws a different spread on successive calls"), so it cannot be avoided without violating this story's spec.
  - Rationale: For `collision.test.ts`, rewrote the assertion to reproduce the expected seed independently via `breakShip(ship, createRng(4242))` — preserves the test's real intent (the rock itself is not split) without re-asserting a now-superseded "zero rng at all" invariant. For `rocks.test.ts`, moved the fixture's rock off the ship's default spawn point ({4096,3072} to {1000,1000}) — its true intent (pure rock-drift consumes no rng) was never about ship collision; the overlap was incidental.
  - Severity: minor — both fixes preserve each test's original intent; no coverage was weakened.
  - Forward impact: none — any future story adding another ship-death side effect will hit the same class of incidental-overlap fixture risk in `rocks.test.ts`-style tests; worth a passing mention in review.
- **Rework round 1 (post-Reviewer-rejection):** No deviations. Implemented the Reviewer's HIGH-finding fix exactly as its "Fix Required" column specified (first of the two offered options): age `shipDebris` via `updateShipDebris(state.shipDebris, dt)` inside both `stepGameOver` (added to the shared `base` state, so all its return branches inherit it) and the non-start branch of `stepAttract`, so debris keeps drifting/fading regardless of mode. Did not choose the alternative "hard-cut clear `shipDebris: []` on the gameover transition" — the fade is the story's whole point ("fading line segments"), and TEA's two rework tests pin the fade path, not a hard cut. No new technical-approach decisions were needed.
- **Rework round 2 (post-Reviewer-rejection, H-1):** No deviations — no implementation was written. This round was test-only: TEA added the attract-aging regression pins the Reviewer's H-1 finding required (`942ee9d`), and Dev's round-1 code (`stepAttract` aging at `sim.ts:162`) is already correct and unchanged. Confirmed GREEN (743/743, build clean) and forwarding to Reviewer; no source touched, so there is nothing to deviate from.

### Reviewer (audit)
- **TEA — "Debris `life` counts down in seconds, not bullet.ts's frame-timer cadence"** → ✓ ACCEPTED by Reviewer: reasonable simplification, no downstream consumer needs frame-cadence parity; verified `updateShipDebris` (shipDebris.ts:65) and its 5 dedicated tests (shipDebris.test.ts:227-271) are internally consistent with this choice.
- **TEA — "`updateShipDebris` does not wrap the toroidal field"** → ✓ ACCEPTED by Reviewer (the design choice itself is sound — bullet.ts's non-wrap precedent is a fair analogy), but ✗ FLAGGED for follow-through: neither `shipDebris.ts`'s header comment nor any test documents/pins this decision the way `bullet.ts`'s own file header and `tests/bullet.test.ts` do ("does NOT wrap — a shot leaving the playfield is removed, not folded to the far side"). Confirmed by `reviewer-test-analyzer` independently (medium confidence). Non-blocking — folded into the [TEST] findings below, not a rejection reason on its own.
- **Dev — "Two pre-existing rng-discipline regression guards updated"** → ✓ ACCEPTED by Reviewer: independently traced `sim.ts`'s rng-consumption order (splitRock → ship-destruction check → breakShip, saucer/wave directors clone separately) and confirmed both edits preserve each test's original intent rather than weakening it — corroborated by `reviewer-test-analyzer`'s independent trace reaching the same conclusion.
- **UNDOCUMENTED (Reviewer finding):** Neither TEA nor Dev logged that `shipDebris` is only aged/advanced inside the `'playing'`-mode pipeline of `stepGame` (sim.ts:282's `updateShipDebris` call is unreachable once `state.mode` is `'attract'` or `'gameover'` — see `sim.ts:228-229`'s early returns into `stepAttract`/`stepGameOver`, neither of which calls `updateShipDebris` or resets `shipDebris`). This is not a deliberate design choice recorded anywhere — it's an unconsidered gap. See the [HIGH] finding below; this is the story's headline defect.

#### Reviewer (audit) — Rework Round 1
- **Dev — "Rework round 1: age `shipDebris` in both `stepGameOver` and `stepAttract`"** → ✓ ACCEPTED (code) by Reviewer: the fix is correctly applied to BOTH sites. Independently verified `stepGameOver`'s `base` (sim.ts:186-193) is spread into all four return branches (over===null, qualifying-unconfirmed, qualifying-confirmed→attract, timed-expire→attract, card-ticking) with no branch re-assigning `shipDebris` after the spread — corroborated by `reviewer-rule-checker` #13. Choosing the fade over the hard-cut is sound (the fade IS the story). The **code** deviation is accepted without reservation.
- **Dev — same entry** → ✗ FLAGGED (test) by Reviewer, but NOT a code deviation: the `stepAttract` half of this fix is **verified-unguarded**. `reviewer-test-analyzer` reverted only `sim.ts:162` (freezing debris in attract) and the whole suite stayed 740/740 green — TEA's "keeps fading into attract mode too" test routes through the non-qualifying 3s-timed gameover path (score 0), where debris (DEBRIS_LIFETIME_S=1.5s) is always fully faded by the gameover pipeline before the 3s card (GAME_OVER_DISPLAY_S) ever hands off to attract. The `stepAttract` aging line is nonetheless **load-bearing on a reachable path** — the qualifying-confirm branch (sim.ts:198-214) returns to attract with NO minimum-display gate, so a fast high-score confirm re-enters attract in a few ticks with debris still alive. See [HIGH] `[TEST]` finding H-1 below. This is a test-integrity gap on the headline regression, not a code defect.

#### Reviewer (audit) — Rework Round 2
- **TEA — "Rework round 2: implemented BOTH H-1 options + L-1 + L-2, mutation-verified"** → ✓ ACCEPTED by Reviewer. Independently reproduced TEA's mutation myself: reverted ONLY `stepAttract`'s aging (`sim.ts:162` → `shipDebris: state.shipDebris`, leaving `stepGameOver`'s `base` aging at `sim.ts:190` untouched, grep-confirmed) and ran the debris suite — exactly the 3 new pins failed (`3 failed | 39 passed`), then restored via `git checkout` (tree clean). The round-1 vacuity (H-1) is genuinely closed; the attract-aging path is now pinned for real. Choosing to KEEP the old non-qualifying "keeps fading into attract mode too" test (annotated as non-pinning) rather than delete it is sound — it still documents the non-qualifying transition and stays green under the mutation (it's one of the 39), correctly matching its documented role.
- **TEA — L-2 ("import `GAME_OVER_DISPLAY_S` instead of hardcoded 3")** → ✓ ACCEPTED: the diff replaces `Math.ceil((3 + 0.5) / DT)` with `Math.ceil((GAME_OVER_DISPLAY_S + 0.5) / DT)` and adds the named import — the loop bound can no longer silently desync.
- **TEA — L-1 ("qualifying-unconfirmed sub-path never exercised with live debris")** → ✓ ACCEPTED as substantially covered: the third new pin routes through the `over.qualifies && !over.confirmed` branch of `stepGameOver`, whose confirm return derives from the shared `base` object; its `confirmed.shipDebris[0].life ≈ 1 - DT` assertion pins that `base` aging directly (the same `base` the pure awaiting-initials idle `return base` also uses). L-1 was LOW/non-blocking and explicitly "fold into H-1's fix" — done.
- **Dev — "Rework round 2: no code change; confirm GREEN and forward"** → ✓ ACCEPTED: correct call. The round-1 code was already accepted by the Reviewer (only the test was flagged), so a test-only rework requires no implementation. Verified independently: `git log develop..HEAD` shows the only new commit since the round-1 review is `942ee9d` (test file only, +73/-2); no source file changed. Confirming green + forwarding is exactly right.

**Tests Required:** Yes
**Reason:** New feature, no existing coverage. No ACs existed in sprint YAML (see Sm Assessment) — TEA originated the ACs below from the story title, guided by the SM's note to stay consistent with the existing rock-split (`splitRock`) debris visual language.

**Test Files:**
- `asteroids/tests/shipDebris.test.ts` (new) — pure-function unit tests for a new `core/shipDebris.ts` module (`breakShip`, `updateShipDebris`) plus `stepGame` integration tests for the death-edge spawn wiring.

**API contract established for Dev:**
- `state.ts`: new `ShipDebrisSegment { p1: Vec2, p2: Vec2, vel: Vec2, life: number }` interface; new `GameState.shipDebris: ShipDebrisSegment[]` field; `initialState()` initializes it to `[]`.
- `core/shipDebris.ts` (new module, mirrors `rocks.ts`'s shape):
  - `breakShip(ship: Ship, rng: Rng): ShipDebrisSegment[]` — pure. Returns exactly 4 segments matching the ship's 4 rendered polygon edges (nose→rightWing→notch→leftWing→nose, same vertex math as `shell/render.ts`'s `drawShip`). Each segment gets a nonzero, mutually-diverging velocity (consumes `rng`, mirrors `splitRock`'s spread). Purity/determinism/rng-threading mirrors `splitRock`'s existing test contract exactly.
  - `updateShipDebris(segments: readonly ShipDebrisSegment[], dt: number): ShipDebrisSegment[]` — pure. Translates both endpoints by `vel * dt*60` (rigid — segment shape preserved), decrements `life` by `dt`, drops segments at `life <= 0`. No toroidal wrap (bullet.ts precedent).
- `sim.ts`: spawn `breakShip(ship, rng)` into `stepped.shipDebris` at the SAME destruction edge that already pushes the `explosion` event (~line 389, `!wasDeadBefore && shipDestroyed`) — ungated by the `lives > 0` check, so it fires on the last life too. Advance `state.shipDebris` via `updateShipDebris` every tick (mirrors `updateRocks`' placement). Debris must NOT be added to any collision/hitbox loop (purely cosmetic — see guardrail tests) and must NOT be considered by `lives.ts`'s `isCenterClear`.

**Tests Written:** 31 tests across 8 describe blocks covering: geometry consistency with the rendered ship (2 headings), motion/divergence, determinism/purity/rng-threading (mirrors `splitRock`'s exact suite), rigid-translation + dt-scaling, life countdown + independent expiry, purity of `updateShipDebris`, `stepGame` death-edge spawn wiring (including RNG-clone discipline mirroring collision.test.ts's AC-2, last-life/gameover, invulnerability guard, edge-triggering-not-sticky), and cosmetic-only guardrails (does not block respawn, has no hitbox).
**Status:** RED (failing — `Cannot find module '../src/core/shipDebris'`, verified via testing-runner; all 35 other test files / 697 tests unaffected)

### Rule Coverage

No `.claude/rules/*.md` or `SOUL.md` exist in this project. TypeScript lang-review checklist (`.pennyfarthing/gates/lang-review/typescript.md`) checked for applicability — this is a pure, DOM-free, non-React, non-async core module, so most sections (React/JSX, async/Promise, API input validation) don't apply. Applicable checks below:

| Rule | Test(s) | Status |
|------|---------|--------|
| #4 null/undefined handling (no `\|\|` on values that can be 0) | All segment/vec arithmetic uses direct numeric fields, no defaulting — N/A, no nullable numeric fields introduced | n/a |
| #8 test quality (no vacuous assertions, no `as any`) | Self-checked: every test asserts a concrete value/shape; no `as any` used anywhere in the file | pass (self-check) |
| Enum exhaustiveness (#3) | N/A — no new enum/union type introduced (`ShipDebrisSegment` is a plain interface) | n/a |

**Rules checked:** 3 of 13 TypeScript checklist sections applicable; 0 blocking gaps found.
**Self-check:** 0 vacuous tests found. Reviewed every test for a concrete `expect(...)` with a non-trivial value; no `let _ =`, no bare `is_some()`/`is_none()`-equivalent, no `assert(true)`-equivalent patterns present.

**Handoff:** To Dev for implementation (GREEN phase).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `asteroids/src/core/shipShape.ts` (new) — hoisted ship-hull geometry (`SHIP_NOSE/SHIP_TAIL/SHIP_HALF_WIDTH/SHIP_NOTCH`, `shipHeading`, `shipVertices`) shared by both the renderer and the new debris module (resolves TEA's Delivery Finding).
- `asteroids/src/core/shipDebris.ts` (new) — `breakShip(ship, rng)` fractures the ship's 4 rendered edges into independent debris segments (outward heading from ship center, `splitRock`-style random spread, plus the ship's velocity at death); `updateShipDebris(segments, dt)` rigidly translates + fades each segment, dropping it at `life <= 0`.
- `asteroids/src/core/state.ts` — added `ShipDebrisSegment` interface and `GameState.shipDebris` field; `initialState()` now seeds it to `[]`.
- `asteroids/src/core/sim.ts` — `shipDebris` ages every tick via `updateShipDebris`; on the destruction edge (`!wasDeadBefore && shipDestroyed`, alongside the existing `explosion` event) it also spawns `breakShip(ship, rng)` into the returned state.
- `asteroids/src/shell/render.ts` — new `drawShipDebris` (alpha-faded by remaining-life fraction); `drawShip`/`drawFlame` refactored to use the shared `shipShape.ts` geometry instead of locally-duplicated constants.
- `asteroids/tests/collision.test.ts`, `asteroids/tests/rocks.test.ts` — updated two pre-existing rng-discipline guards invalidated by this story's new rng consumer (see Design Deviations, Dev section).

**Tests:** 729/729 passing (GREEN) — all 32 new `shipDebris.test.ts` tests plus every pre-existing test, including the 2 fixed regressions. `npm run build` (tsc --noEmit + vite build) clean, no type errors.
**Branch:** `feat/A2-5-ship-death-breakup-animation` (pushed to origin)

**Handoff:** To Reviewer for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | N/A — disabled via `workflow.reviewer_subagents.edge_hunter` |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | N/A — disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 7 | confirmed 5, downgraded-to-note 2, deferred 0 |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | N/A — disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | N/A — disabled via settings |
| 7 | reviewer-security | No | Skipped | disabled | N/A — disabled via settings |
| 8 | reviewer-simplifier | No | Skipped | disabled | N/A — disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none (0 violations, 13 checks, 47 instances) | N/A |

**All received:** Yes (3 enabled subagents returned; 6 disabled via `workflow.reviewer_subagents` settings, pre-filled per protocol)
**Total findings:** 8 confirmed (1 mine + 7 from test-analyzer, of which 5 confirmed at original severity and 2 downgraded to notes), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** REJECTED

**Data flow traced:** ship-vs-rock/saucer/saucer-shot collision (`sim.ts:362-370`) → destruction edge `!wasDeadBefore && shipDestroyed` (`sim.ts:389`) → `breakShip(ship, rng)` (`sim.ts:396`) → `stepped.shipDebris` (`sim.ts:420`) → `render()` reads `state.shipDebris` unconditionally every frame (`render.ts:417`) → `drawShipDebris` strokes each segment with `globalAlpha = life/DEBRIS_LIFETIME_S` (`render.ts:206-220`). **Safe while `mode === 'playing'`** (verified: `updateShipDebris` runs every such tick, `sim.ts:282`). **Broken once `mode` leaves `'playing'`** — see [HIGH] finding below; the same data flow silently stops at the death edge and never reaches the fade/drift step again.

**Pattern observed:** `src/core/shipShape.ts` (new) is a genuinely good pattern — it resolves TEA's own Delivery Finding by hoisting `SHIP_NOSE/TAIL/HALF_WIDTH/NOTCH` + `shipHeading`/`shipVertices` into one shared module `render.ts:drawShip` and `shipDebris.ts:breakShip` both import, instead of two independently-tuned copies. Mirrors `bounds.ts`'s own "one function, not parallel copies" precedent (cited in the new file's header). Good instinct by Dev to act on the finding rather than defer it.

**Error handling:** [VERIFIED] No error paths needed or introduced — `breakShip`/`updateShipDebris` are total functions over their input domain (no null/undefined ship, no optional fields on `ShipDebrisSegment`), confirmed via `reviewer-rule-checker`'s rule #11 pass (0 try/catch introduced, N/A confirmed explicitly not silently skipped) and my own read of `shipDebris.ts:32-84` — every branch terminates in a value, never a throw.

**Security analysis:** [VERIFIED] N/A — no user input, no API/network calls, no `JSON.parse`, no DOM string injection anywhere in this diff; `ShipDebrisSegment`/`breakShip`/`updateShipDebris` operate purely on internal, already-typed numeric simulation state. Confirmed via `reviewer-rule-checker` rule #10 (explicitly N/A, not silently skipped) and my own read of all 8 changed files — this is a client-side Canvas 2D game with no backend, consistent with the project's own framing (CLAUDE.md: "no backend").

**Tenant isolation audit:** N/A — this is a single-player, client-only arcade game with no multi-tenant concept anywhere in the codebase (no `tenant_id`, no auth, no server). Stating explicitly rather than skipping silently, per review checklist.

### Rule Compliance

`reviewer-rule-checker` ran all 13 TypeScript lang-review checks exhaustively (47 instances) with 0 violations — I independently spot-checked the highest-risk categories myself:
- **#1 Type safety escapes:** [VERIFIED] grepped the full diff myself for `as any`, `as unknown as`, `@ts-ignore`, non-null `!` — zero occurrences in any of the 8 changed files.
- **#2 Generic/interface pitfalls:** [VERIFIED] `ShipDebrisSegment` (state.ts:73) uses concrete `Vec2`/`number` fields, no `any`/`object`/`Function` types anywhere; `updateShipDebris`'s `segments: readonly ShipDebrisSegment[]` param is correctly `readonly` (shipDebris.ts:62), matching `updateRocks`'s existing `readonly Rock[]` convention (rocks.ts:108) — complies with the project's own established (unwritten but consistent) pattern.
- **#4 Null/undefined handling:** [VERIFIED] no `?.`, `??`, or `||`-on-falsy-0 introduced; `shipVertices`'s tuple destructure (`const [nose, rightWing, notch, leftWing] = ...`) is safe because the function's return type is a fixed 4-tuple, never a variable-length array.
- **#6/#7 React/async:** [VERIFIED] N/A, confirmed — zero `.tsx` files in the project, zero `async`/`Promise`/`.then` in the diff.
- No project rules files (`.claude/rules/*.md`, `SOUL.md`) exist beyond the lang-review checklist — confirmed via `find`, both by rule-checker and independently by me.

### Devil's Advocate

Assume this code is broken until proven otherwise. Picture a player who plays a full run and loses their last ship: the GAME OVER card appears, but the ship wreckage — mid-explosion, full brightness — just sits there. It doesn't drift, it doesn't dim. For a non-qualifying run that's a guaranteed 3 seconds of visibly frozen wreckage; for a qualifying high score, it's however long the player takes to type three initials — could be ten seconds, could be a minute of AFK. Nothing in the UI signals this is intentional (no comment, no test, no session note claims a deliberate "freeze-frame" effect), so a careful player reads it as exactly what it is: a rendering glitch. Worse, if the player doesn't immediately press Start, the frozen wreckage persists unchanged into the attract-mode demo loop — the debris from the player's OWN death visually contaminates the high-score/PUSH START screen that's supposed to be luring in the next player. A tester who specifically compares "die with lives in reserve" (correctly fades within ~1.5s, verified passing) against "die on the last life" (frozen forever) finds the asymmetry immediately — and that asymmetry is exactly why 729 green tests missed it: every existing debris test only inspects the SAME TICK as the death, never steps forward through the mode transition that actually triggers the bug. A confused user might also notice the debris looks byte-identical whether they died one tick ago or the game-over card has been up for ten seconds — no passage of time is visible for this one entity class while the score/HUD keep behaving normally. This is precisely the class of defect "tests pass, build is clean" cannot catch on its own: the bug is an absence (a call that should fire every gameover tick and structurally cannot, given `sim.ts:228-229`'s early return), not a wrong value any of the existing single-tick assertions would flag as red.

### Findings

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | `shipDebris` freezes (stops fading AND stops drifting) the instant `mode` leaves `'playing'` — `stepGameOver`/`stepAttract` never call `updateShipDebris` nor reset the array, so wreckage from a run-ending death sits at full brightness through the entire GAME OVER card and into the following attract loop, directly contradicting the story's own "fading line segments" premise. Reproduces on every single terminal death (100% of the time), not an edge case. | `src/core/sim.ts:228-229` (early returns bypass `sim.ts:282`'s `updateShipDebris`); `stepGameOver` `src/core/sim.ts:167-203`; `stepAttract` `src/core/sim.ts:140-161` | Call `updateShipDebris(state.shipDebris, dt)` (or equivalent) inside `stepGameOver` and the non-start branch of `stepAttract` so debris keeps aging/fading regardless of mode — or deliberately clear `shipDebris: []` at the moment `mode` becomes `'gameover'` if a hard cut is preferred instead. Either is fine; the current unconsidered freeze is not. Add a regression test that steps `stepGame` multiple ticks past a terminal death and asserts the debris count reaches 0 (or the segments' `life` values keep decreasing) within `DEBRIS_LIFETIME_S`. |
| [MEDIUM] `[TEST]` | `render.ts`'s `drawShipDebris` and its wiring (`render.ts:417`) have zero test coverage — the existing `render-wiring.test.ts` "draws every live entity class" check was never extended to `state.shipDebris`, so a mutant removing the draw call entirely would pass all 729 tests. | `asteroids/tests/render-wiring.test.ts`, `asteroids/tests/render.test.ts` | Extend `render-wiring.test.ts`'s entity-class regex check to include `state.shipDebris`; add a `render.test.ts` case asserting `globalAlpha` (or recorded stroke state) decreases as a segment's `life` decreases. |
| [MEDIUM] `[TEST]` | `breakShip`'s inheritance of `ship.vel` into each segment's velocity is entirely unverified — every fixture in `shipDebris.test.ts` uses a stationary ship (`vel: {0,0}`); deleting the `ship.vel.x +`/`ship.vel.y +` terms in `shipDebris.ts` would pass all 33 tests. | `asteroids/tests/shipDebris.test.ts` | Add a test with nonzero `ship.vel` asserting each segment's `vel` includes the ship's velocity as a base component. |
| [MEDIUM] `[TEST]` | No test covers a second, independent death after a successful respawn (debris from death #1 potentially still animating) — only same-tick and stays-dead scenarios are covered. | `asteroids/tests/shipDebris.test.ts` | Add an integration test: death → respawn → second death, asserting `shipDebris` grows by exactly 4 more segments. |
| [LOW] `[TEST]` | `updateShipDebris` is never called with an empty array in the test suite, and `updateShipDebris`/`breakShip` are never exercised with a ship near a world edge (no wrap-vs-no-wrap regression pin, unlike `bullet.ts`'s explicit "does NOT wrap" test). The no-wrap choice itself is a sound, already-accepted TEA deviation — this is a coverage gap, not a design objection. | `asteroids/tests/shipDebris.test.ts`, `asteroids/src/core/shipDebris.ts` (header comment) | Add `expect(updateShipDebris([], DT)).toEqual([])`; add a doc comment on `updateShipDebris` matching `bullet.ts`'s explicit no-wrap rationale, plus one pinning test. |
| [LOW] `[TEST]` | `DEBRIS_LIFETIME_S` is never imported/asserted exactly in `shipDebris.test.ts` — only `life > 0` is checked, so a mutant changing the constant's value would go undetected. | `asteroids/tests/shipDebris.test.ts:173` | `import { DEBRIS_LIFETIME_S }` and assert `expect(seg.life).toBe(DEBRIS_LIFETIME_S)`. |

**Handoff:** Back to Dev for fixes (the [HIGH] finding is a logic bug requiring both a code fix and new regression coverage — routing to TEA first so the multi-tick-through-gameover fade test is pinned as a failing test before Dev fixes `sim.ts`).

## TEA Assessment (Rework Round 1)

**Tests Required:** Yes
**Reason:** Reviewer REJECTED with 1 HIGH bug + 5 MEDIUM/LOW test-coverage gaps (see Reviewer Assessment above). This round pins every one of them as a test before Dev fixes the underlying `sim.ts` logic.

**Test Files:**
- `asteroids/tests/shipDebris.test.ts` — added 8 tests: exact-`DEBRIS_LIFETIME_S` assertion, ship-velocity-inheritance, empty-array input, no-wrap-at-boundary, multi-death append, and 2 new integration tests pinning the HIGH bug (fade-through-gameover, fade-through-attract-transition).
- `asteroids/tests/render-wiring.test.ts` — added the `state.shipDebris` regex-wiring check, extending the existing "draws every live entity class" pattern.
- `asteroids/tests/render.test.ts` — extended the mock canvas context to record `globalAlpha` at each `stroke()` call (previously untracked), added a new "ship breakup debris (A2-5)" describe block (3 tests: draws segments, draws nothing when empty, fades at lower alpha).

**Tests Written:** 11 new tests. **2 are genuinely RED** (`"fades the debris to nothing within DEBRIS_LIFETIME_S even after the run ends"`, `"keeps fading into attract mode too, if the card ends before the debris does"` — both in `shipDebris.test.ts`), verified via testing-runner: both fail with `expected [...] to have a length of +0 but got 4`, directly reproducing the Reviewer's HIGH finding. **9 are GREEN already** (verified via testing-runner) — they strengthen coverage for behavior Dev's original implementation already got right (exact lifetime, velocity inheritance, empty-array, no-wrap, multi-death append, and the render wiring), so no code fix is needed for those; they exist purely to catch future regressions.
**Status:** RED (2/740 failing — the two tests pinning the HIGH bug; all 738 others green, including the 9 new coverage-only additions and the full pre-existing suite)

### Rule Coverage

No `.claude/rules/*.md` or `SOUL.md` exist in this project (unchanged from round 1). The new test code (mock-ctx `strokeAlphas` extension, new `it()` blocks) was self-checked against the same 3 applicable TypeScript lang-review sections as round 1 (#4 null/undefined, #8 test quality, enum n/a) — no `as any`, no vacuous assertions, every new test has a concrete non-trivial `expect(...)`.

**Self-check:** 0 vacuous tests found in the 11 new tests.

**Handoff:** To Dev for the `sim.ts` fix (GREEN phase).

## Dev Assessment (Rework Round 1)

**Implementation Complete:** Yes

**Root cause (Reviewer HIGH finding):** `stepGame` early-returns into `stepAttract` (`sim.ts:228`) / `stepGameOver` (`sim.ts:229`) before reaching the play-mode `updateShipDebris` call (`sim.ts:282`). So debris spawned by a run-ending death was never aged once `mode` left `'playing'` — it froze at full brightness through the GAME OVER card and into the following attract loop.

**Fix (single file, `asteroids/src/core/sim.ts`):**
- `stepGameOver` — added `shipDebris: updateShipDebris(state.shipDebris, dt)` to the shared `base` state that every return branch of the function derives from, so the wreckage keeps drifting/fading through the entire card (qualifying and non-qualifying paths both).
- `stepAttract` — added the same `updateShipDebris(state.shipDebris, dt)` to the non-start (idle) return branch, so any debris still alive when the card ends keeps fading in attract instead of freezing. No-op for a fresh cabinet (its `shipDebris` is `[]`); the start-press branch already resets to `initialState()` (`shipDebris: []`), so a new game never carries the prior run's wreckage.
- `updateShipDebris` was already imported (line 20); no other change.

Chose the Reviewer's first offered option (keep aging in both modes) over the hard-cut alternative because the fade *is* the story ("fading line segments") and TEA's two rework tests pin the fade path.

**Files Changed:**
- `asteroids/src/core/sim.ts` — age `shipDebris` in `stepGameOver` + `stepAttract` (17 insertions, 1 deletion).

**Tests:** 740/740 passing (GREEN), 36/36 test files. The two previously-RED tests (`shipDebris.test.ts`: "fades the debris to nothing within DEBRIS_LIFETIME_S even after the run ends", "keeps fading into attract mode too, if the card ends before the debris does") now pass; no regressions. `npm run build` (tsc --noEmit + vite build) clean.
**Branch:** `feat/A2-5-ship-death-breakup-animation` (pushed)

**Handoff:** To Reviewer for re-review.

## Subagent Results (Rework Round 1)

Re-review scoped to the rework delta (`git diff 8eb1755..HEAD` = TEA's rework tests + Dev's sim.ts fix; 302 lines, 4 files). The rest of the story diff was reviewed and substantively accepted in round 1 (only the HIGH bug blocked). Toggles unchanged from round 1: 3 enabled, 6 disabled via `workflow.reviewer_subagents`.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 | N/A — 740/740 green, build clean, tree clean, 0 smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 5 (+3 low notes) | confirmed 1 blocking (H-1) + 2 low; 4 "sound" verifications accepted; 0 dismissed |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | 0 (13 checks, 17 instances) | N/A — 0 violations |

**All received:** Yes (3 enabled returned; 6 disabled pre-filled per protocol)
**Total findings:** 3 confirmed (1 HIGH [TEST] blocking, 2 LOW [TEST]), 0 dismissed, 0 deferred. Plus 4 mutation-verified "test is sound" confirmations (recorded as VERIFIED, not findings).

### Rule Compliance (Rework Round 1)

`reviewer-rule-checker` ran all 13 TypeScript lang-review checks over the delta (17 instances, 0 violations). No `.claude/rules/*.md` or `SOUL.md` exist (confirmed again). I independently spot-checked the delta's highest-risk categories:

- **#1 Type-safety escapes:** [VERIFIED] The only cast in the delta is `rec as unknown as CanvasRenderingContext2D` (render.test.ts:83) — the pre-existing mock-harness idiom, unchanged; the returned literal merely gained a `strokeAlphas: number[]` field. No `as any`, `@ts-ignore`, or non-null `!` in any added line.
- **#2 readonly / generics:** [VERIFIED] `updateShipDebris(state.shipDebris, dt)` (sim.ts:162, 190) calls an untouched signature whose array param is already `readonly ShipDebrisSegment[]`. `debrisState(segments: ShipDebrisSegment[])` (render.test.ts) is correctly NOT `readonly` — it is assigned into the mutable `GameState.shipDebris` field.
- **#4 null/undefined:** [VERIFIED] No `||`-on-falsy-0 introduced; `s.gameOver?.qualifies` (shipDebris.test.ts:491) is an optional read inside an assertion (short-circuits to `undefined`, correctly failing `.toBe(false)` rather than throwing).
- **#8 test quality:** [VERIFIED] No `.only`/`.skip`, no `as any` in assertions, mock members match every `ctx.*` call render.ts makes.
- **#13 fix-introduced regressions:** [VERIFIED] Both new `shipDebris:` lines re-scanned against #1/#2/#4 — clean; `tsc --noEmit` passes.

Total: 13 checks applied, 17 instances, 0 violations.

## Reviewer Assessment (Rework Round 1)

**Verdict:** REJECTED

**Data flow traced:** ship death (`sim.ts:391` edge) → `breakShip` spawns 4 segments into `shipDebris` (`sim.ts:412`) → last-life death flips `mode` to `'gameover'` → **next tick** `stepGameOver` ages `shipDebris` via `base` (`sim.ts:190`) every tick the card is up → on card end / high-score confirm → `'attract'` → `stepAttract` ages `shipDebris` (`sim.ts:162`) → `render()` strokes each segment at `globalAlpha = clamp(life/DEBRIS_LIFETIME_S)` (`render.ts:206`). The freeze the round-1 HIGH finding described is **gone in code** — both terminal modes now age debris. But one of the two aging sites (`stepAttract`) is **verified-unguarded** by any test (see H-1).

**Pattern observed:** `stepGameOver`'s single-point aging in the shared `base` object (`sim.ts:186-193`), inherited by all four return branches, is a clean, DRY fix — one aging call covers every game-over sub-phase. Confirmed by rule-checker #13 that no branch clobbers it. Good.

**Error handling:** [VERIFIED] N/A — `updateShipDebris` is a total function over `readonly ShipDebrisSegment[] × number`; `updateShipDebris([], dt) === []` is now pinned (shipDebris.test.ts:290). No throw paths, no nullable inputs, in the delta.

**Security analysis:** [VERIFIED] N/A — the delta is pure client-side sim + a test-only DOM mock; no user input, network, `JSON.parse`, or DOM string injection (rule-checker #10 N/A, confirmed).

**Tenant isolation audit:** N/A — single-player client-only arcade game, no tenant/auth/server concept anywhere (stated explicitly, not skipped).

**Subagent finding incorporation (all 8 tags):**
- `[EDGE]` — N/A (edge-hunter disabled). Self-covered: I enumerated the mode-transition paths myself; the reachable unguarded path (fast qualifying-confirm → attract with live debris) is captured in H-1.
- `[SILENT]` — N/A (silent-failure-hunter disabled). No error-swallowing surface in the delta (no try/catch, no fallbacks).
- `[TEST]` — H-1 (blocking), L-1, L-2 below, from `reviewer-test-analyzer` (all mutation-verified). Plus 4 VERIFIED "test is sound" confirmations.
- `[DOC]` — N/A (comment-analyzer disabled). Delta comments are accurate design rationale (self-checked; preflight confirmed no commented-out code).
- `[TYPE]` — N/A (type-design disabled). Covered by rule-checker #1/#2 (0 violations).
- `[SEC]` — N/A (security disabled). No security surface (see above).
- `[SIMPLE]` — N/A (simplifier disabled). The `base`-object aging is already the minimal DRY form; no over-engineering in the delta.
- `[RULE]` — `reviewer-rule-checker`: 0 violations (13 checks, 17 instances).

### Devil's Advocate

Assume this rework is broken until proven otherwise. The code LOOKS complete — debris ages in both terminal modes now — and 740/740 tests pass, and that green suite is exactly the trap. Picture a strong player: they finish a run with a top-five score, the GAME OVER card appears with their fresh wreckage mid-explosion, they snap in three initials and slam Start within half a second. The qualifying-confirm branch (`sim.ts:198-214`) has NO minimum-display gate — it returns straight to `'attract'` on that Start press, maybe 20-30 ticks after death, with the wreckage still at ~80% life. From here the ONLY thing keeping that wreckage fading is `stepAttract`'s aging line. Now suppose a future maintainer — six months from now, tuning attract-mode performance, or "simplifying" `stepAttract` because "attract debris is always empty anyway" — deletes that line. Every test stays green. The test named, in plain English, "keeps fading into attract mode too" stays green. And the arcade cabinet now shows a dead player's frozen wreckage smeared across the PUSH START attract screen that's supposed to lure the next quarter — the exact contamination the round-1 HIGH finding called out ("into the following attract loop"), silently resurrected with a green regression suite swearing it can't happen. Why does the suite lie? Because the one attract-mode fade test deliberately picked the score-0 non-qualifying path (its own comment says "score: 0 guarantees the non-qualifying path"), which takes the full 3-second timed card — and 3s > 1.5s debris life, so the gameover pipeline always finishes the fade before attract is ever reached. The test can NEVER exercise the attract aging it's named for. `reviewer-test-analyzer` proved this empirically: revert only the `stepAttract` line and the suite stays 740/740 green. The rework's entire reason for existing was to pin the HIGH regression before Dev fixed it; the gameover half is genuinely pinned (reverting `sim.ts:190` fails the test, verified), but the attract half — a REACHABLE manifestation of the same HIGH defect — ships with a guard that provably guards nothing. That is not a peripheral coverage nicety; it is a false safety net stretched directly across the story's headline bug.

### Findings

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] `[TEST]` | H-1: The attract-mode fade guard is **vacuous** on a reachable manifestation of the story's HIGH bug. "keeps fading into attract mode too" (shipDebris.test.ts:481) routes through the non-qualifying 3s-timed gameover path where debris (1.5s) is always fully faded by the gameover pipeline before attract is reached, so it passes regardless of whether `stepAttract` ages debris — mutation-verified: reverting `sim.ts:162` alone leaves 740/740 green. Yet the `stepAttract` aging is load-bearing on a REACHABLE path: the qualifying-confirm branch (`sim.ts:198-214`) returns to attract with no min-display gate, so a fast high-score confirm re-enters attract with live wreckage. The headline HIGH regression's second fix-site is unguarded. | `asteroids/tests/shipDebris.test.ts:481-499`; guards `asteroids/src/core/sim.ts:162` | Pin the attract-aging path for real. Either (a) rewrite the existing test to route through the qualifying-confirm→attract path (set `gameOver.qualifies`, fill 3 initials, press Start fast so debris is still alive on the attract tick, then assert it keeps shrinking / reaches 0 in attract), or (b) add a direct fixture: `mode: 'attract'` with a live non-expired `shipDebris` segment, step `stepGame`, assert the segment ages/drifts and its `life` decreases (and drops at 0). Must FAIL if `sim.ts:162`'s aging is reverted. |
| [LOW] `[TEST]` | L-1: The qualifying-but-unconfirmed gameover sub-path (`sim.ts:198-214`, "awaiting initials") is never exercised with live debris — the one game-over sub-path that can idle unbounded in real play while the cabinet waits for a keypress. Structurally low-risk (same `base` object carries the fix), but untested. A qualifying-path test written for H-1 would cover this too. | `asteroids/tests/shipDebris.test.ts` | Fold into H-1's fix: use the qualifying path so both the awaiting-initials aging and the confirm→attract handoff are exercised. |
| [LOW] `[TEST]` | L-2: `ticksToReachAttract = Math.ceil((3 + 0.5) / DT)` (shipDebris.test.ts:493) hardcodes `GAME_OVER_DISPLAY_S` as a bare `3` instead of importing the already-exported constant (`sim.ts:84` re-exports it). If that constant changes, the loop bound silently desyncs. | `asteroids/tests/shipDebris.test.ts:493` | Import `GAME_OVER_DISPLAY_S` and derive the tick count from it. |

**VERIFIED (mutation-confirmed sound — not findings, recorded for the record):**
- [VERIFIED] The gameover fade IS genuinely pinned — reverting `sim.ts:190` fails "fades ... even after the run ends" (shipDebris.test.ts:463). The observable HIGH bug is fixed AND guarded on the gameover path.
- [VERIFIED] Velocity-inheritance test (shipDebris.test.ts:196) is sound — `breakShip` has no `ship.vel` branching, so same-seed delta isolates exactly `ship.vel`; reverting the inheritance terms fails only this test.
- [VERIFIED] Render alpha-fade test (render.test.ts:249) is sound — `shipDestroyed:true` + `lives:0` + empty rocks/bullets/saucer make `drawShipDebris` the only `stroke()` source; breaking the alpha formula fails only the fade test.
- [VERIFIED] Second-death append test (shipDebris.test.ts:438) is sound — replace-vs-append mutation of `sim.ts:412` fails only this test.
- [VERIFIED] `drawShipDebris` (render.ts:200) wraps each segment in `save()`/`restore()` and fades via `globalAlpha = clamp(life/DEBRIS_LIFETIME_S)` — correct per-segment fade.

**Why REJECT (severity rationale):** The severity of a missing guard equals the severity of the regression it fails to catch. H-1 fails to guard a reachable manifestation of the SAME "frozen wreckage carried into the attract loop" defect the round-1 review rated HIGH — so H-1 is HIGH `[TEST]`, and any HIGH blocks. The **code** is correct and complete; no code change is required. This is a test-only rework: pin the attract-aging path so the headline regression is genuinely guarded on both fix-sites. Routing to TEA (red/rework) since the remedy is a test.

**Handoff:** Back to TEA (O'Brien) — add the attract-aging regression pin (H-1), fold in L-1/L-2. No code changes needed; Dev's implementation is correct.

## TEA Assessment (Rework Round 2)

**Tests Required:** Yes (regression pins — the Reviewer's H-1 finding is a test-coverage gap, not a code defect).

**What was added (`asteroids/tests/shipDebris.test.ts`, +73/-2, committed `942ee9d`):**
A new describe block `stepGame — attract mode itself ages ship debris (Reviewer H-1 pin, rework 2)` with 3 pins, plus L-2 + a clarifying annotation on the old vacuous test:
1. **"drifts and fades a live debris segment on a single attract tick"** — the surgical pin. A live segment placed directly in `mode:'attract'`; one `stepGame` step must decrement `life` by exactly `dt` AND translate both endpoints by `vel*dt*60`. In attract, `stepAttract` is the ONLY thing that can touch `shipDebris` (no death edge, no gameover pipeline), so a frozen (unaged) debris fails both asserts.
2. **"clears ship debris within DEBRIS_LIFETIME_S while idling in attract"** — steps ~100 attract ticks; frozen debris would sit at length 1 forever, aged debris reaches length 0.
3. **"keeps fading wreckage after a fast qualifying high-score confirm re-enters attract"** — the REACHABLE real-play path round 1 missed (L-1 + H-1): a qualifying score + `'AAA'` + a Start press returns to attract THIS tick with no min-display gate (`sim.ts:198-214`), leaving live wreckage that only `stepAttract` keeps fading. Pins both the confirm-tick aging (`stepGameOver` base) and the subsequent attract aging.
- **L-2:** imported `GAME_OVER_DISPLAY_S` (replaces the hardcoded `3` in the existing test).
- Annotated the old "keeps fading into attract mode too" test to document why it can't pin the attract aging (kept, not deleted — it still documents the non-qualifying transition).

**Mutation verification (the round-1 lesson applied):** With `stepAttract`'s aging line reverted to `shipDebris: state.shipDebris`, all 3 new pins went **RED** (`3 failed | 39 passed`), while the old "keeps fading into attract mode too" test stayed GREEN — reproducing exactly the Reviewer's vacuity finding and proving the new pins are genuine. Source restored via `git checkout` (net-zero change, verified `git status` clean).

**Tests:** 743/743 passing (GREEN), 36 files. `npm run build` (tsc --noEmit + vite build) clean. Branch `feat/A2-5-ship-death-breakup-animation` pushed (`942ee9d`).

### Rule Coverage

No `.claude/rules/*.md` or `SOUL.md` exist (unchanged). TypeScript lang-review checklist applicable sections for the new test code:

| Rule | Test(s) | Status |
|------|---------|--------|
| #4 null/undefined (no `\|\|` on 0/'') | New pins use direct numeric fields + `toBeCloseTo`; `s.gameOver?.qualifies` read only in the pre-existing test — no new nullable defaulting | pass (self-check) |
| #8 test quality (no vacuous assertions, no `as any`, no `.only`/`.skip`) | Every new test asserts concrete values (`toBeCloseTo(1-DT,9)`, `expectVec(...)`, `toHaveLength(0)`); **each mutation-verified to fail on the target regression** — the opposite of vacuous | pass (mutation-verified) |
| #3 enum exhaustiveness | N/A — no new enum/union introduced | n/a |

**Rules checked:** 3 of 13 applicable; 0 gaps. **Self-check:** 0 vacuous tests — and unlike round 1, non-vacuousness was *proven by mutation*, not asserted by inspection.

**Process note (see Delivery Findings):** These pins are GREEN, not RED, because Dev's code is correct — so the `red`-phase `tests-fail` gate ("≥1 failing test") does not fit this reviewer-rework. Per the workflow's canonical reviewer-rework routing (`tdd.yaml:70-71`, `target_phase: green`), transitioning red→green and handing to Dev (confirm-green + forward to Reviewer).

**Handoff:** To Dev (Julia) — no implementation needed; confirm GREEN (743/743) and forward to Reviewer to re-confirm H-1 is now genuinely pinned.

## Dev Assessment (Rework Round 2)

**Implementation Complete:** Yes (no code change required — test-only reviewer rework)

**What Dev did this round:** Nothing to implement. The Reviewer's H-1 finding was a test-coverage gap on already-correct code (`stepAttract`'s aging at `sim.ts:162`), not a code defect. TEA closed it by adding 3 attract-aging regression pins + L-2 (`942ee9d`). Dev's role per the workflow's reviewer-rework routing (`tdd.yaml:70-71`, `target_phase: green`) was to confirm GREEN and forward — which is what this assessment records.

**Verification:**
- Full asteroids suite: **743/743 passing (GREEN), 36 test files** — confirmed via `testing-runner` (RUN_ID `A2-5-dev-green`).
- `npm run build` (tsc --noEmit + vite build): **clean**, no type errors (21.13 kB / 8.33 kB gzip).
- Working tree clean; branch `feat/A2-5-ship-death-breakup-animation` at TEA's pin commit `942ee9d` (already pushed).

**Files Changed (this round):** None. No source touched; all changes were TEA's test pins already committed.

**Tests:** 743/743 passing (GREEN). **Branch:** `feat/A2-5-ship-death-breakup-animation` (pushed, `942ee9d`).

**Handoff:** To Reviewer (The Thought Police) — re-confirm H-1 is now genuinely pinned (TEA mutation-verified all 3 new pins go RED when `sim.ts:162`'s aging is reverted). Code is unchanged from the round-1 review; the delta is test-only.

## Subagent Results (Rework Round 2)

Re-review scoped to the rework-2 delta (`git diff 0a6a261..HEAD` = commit `942ee9d`, test-only, +73/-2 in `tests/shipDebris.test.ts`). No source changed since the round-1 rework review, which already ACCEPTED the code and blocked only on the H-1 test-vacuity gap. Subagent toggles unchanged: `preflight` enabled; the other 8 disabled via `workflow.reviewer_subagents`.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 743/743 green (36 files), build clean, tree clean, 0 smells (no `.only`/`.skip`/`console`/`as any`/commented-out code) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — self-covered: enumerated the mode-transition paths myself (attract-tick, attract-idle, qualifying-confirm→attract); all three are pinned by the new tests |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — N/A: test-only delta, no error-handling surface (no try/catch, no fallbacks) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — self-covered: I independently mutation-verified all 3 new pins (see [TEST] below); this is the crux of the re-review and I did it by hand |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — self-covered: the new annotation comments accurately document why the old test is non-pinning (verified against the mutation result) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — N/A: no new types; the `GameState`/`GameOverPhase` literals in the tests typecheck (build clean) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — N/A: client-only single-player game, test-only delta, no input/network/DOM surface |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — self-covered: the 3 pins are the minimal isolation (one surgical attract-tick + one idle-clears + one reachable real-path); no over-engineering |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — self-covered in Rule Compliance below (TypeScript lang-review, test-quality sections) |

**All received:** Yes (1 enabled subagent returned clean; 8 disabled via `workflow.reviewer_subagents`, pre-filled per protocol)
**Total findings:** 0 confirmed, 0 dismissed, 0 deferred. The round-1 blocking finding (H-1) is verified RESOLVED.

### Rule Compliance (Rework Round 2)

No `.claude/rules/*.md` or `SOUL.md` exist (re-confirmed via `find` — unchanged). The delta is test-only TypeScript; the applicable TypeScript lang-review sections for test code:

- **#1 Type-safety escapes:** [VERIFIED] Grepped the added lines — zero `as any`, `as unknown as`, `@ts-ignore`, or non-null `!`. The two `GameState` object literals (`{ ...initialState(4242), mode: 'attract', shipDebris: [...] }` and the `gameOver: { qualifies, confirmed, initials, displayTimer }` literal) are fully-typed and compile under `tsc --noEmit` (build clean).
- **#4 Null/undefined:** [VERIFIED] No `||`-on-falsy-0 introduced. `confirmed.shipDebris[0].life` reads a concrete number after a length-1 assertion guards the index.
- **#8 Test quality (no vacuous assertions, no `.only`/`.skip`):** [VERIFIED] Every new test asserts concrete values (`toBeCloseTo(1 - DT, 9)`, `expectVec(...)` on both endpoints, `toHaveLength(0)`/`toHaveLength(1)`) — and each was **mutation-verified by me** to fail when `stepAttract`'s aging is reverted. This is the exact opposite of vacuous; it is the strongest form of test-quality evidence. No `.only`/`.skip`/`console` present.
- **#3 Enum exhaustiveness:** N/A — no new enum/union introduced.

**Rules checked:** 4 of 13 lang-review sections applicable to a test-only delta; 0 violations.

## Reviewer Assessment (Rework Round 2)

**Verdict:** APPROVED

**Scope:** Re-review of the test-only rework-2 delta (`942ee9d`). The round-1 rework review ACCEPTED the code without reservation and REJECTED solely on H-1 — a HIGH `[TEST]` finding that the `stepAttract` aging (`sim.ts:162`) was verified-unguarded (its only "guard", the "keeps fading into attract mode too" test, stayed green when the aging was mutated). This round pins that path for real. No source changed.

**Data flow traced (the H-1 path, end-to-end):** ship death → `breakShip` spawns 4 segments into `shipDebris` → last-life death flips `mode` to `'gameover'` → a *qualifying* score + 3 initials + a fast Start press hits `stepGameOver`'s `over.qualifies && !over.confirmed && startPressed && initials.length===3` branch (`sim.ts` qualifying-confirm), which returns `{ ...base, mode: 'attract' }` **this same tick** with NO minimum-display gate → the wreckage, still alive (aged one tick by `base`), lands in `'attract'` → from there ONLY `stepAttract`'s `shipDebris: updateShipDebris(state.shipDebris, dt)` (`sim.ts:162`) keeps it fading/drifting to `life <= 0`. The third new test (`"keeps fading wreckage after a fast qualifying high-score confirm re-enters attract"`) walks this exact reachable path; the first test (`"drifts and fades ... on a single attract tick"`) isolates `sim.ts:162` surgically by placing a live segment directly in `mode:'attract'` where `...state` guarantees nothing else touches `shipDebris`. **Safe and now guarded on both fix-sites** (`base` at `sim.ts:190` was already pinned round 1; `stepAttract` at `sim.ts:162` is pinned now).

**Independent mutation verification (I did not take the assessment on faith):** Reverted ONLY `sim.ts:162` to `shipDebris: state.shipDebris` (grep-confirmed `sim.ts:190`'s `base` aging left intact), ran `npx vitest run tests/shipDebris.test.ts` → **exactly the 3 new pins failed (`3 failed | 39 passed`)**, the old vacuous test among the 39 that stayed green. Restored via `git checkout src/core/sim.ts`; `git status` clean, line 162 back to `updateShipDebris`. This is the round-1 H-1 finding reproduced and closed.

**Pattern observed:** Keeping the old non-qualifying test (annotated, not deleted) alongside 3 new genuine pins is the right call — the annotation documents *why* it can't pin the attract path (debris 1.5s < card 3s), turning a formerly-misleading green into honest documentation, while the real guard now lives in the new describe block (`tests/shipDebris.test.ts`).

**Error handling:** [VERIFIED] N/A — test-only delta; `updateShipDebris` remains a total function over `readonly ShipDebrisSegment[] × number`, no throw paths, no nullable inputs introduced.

**Security analysis:** [VERIFIED] N/A — client-only Canvas 2D single-player game, no backend (CLAUDE.md); the delta adds only test fixtures. No user input, network, `JSON.parse`, or DOM injection.

**Tenant isolation audit:** N/A — single-player, no tenant/auth/server concept anywhere in the codebase. Stated explicitly, not skipped.

**Subagent finding incorporation (all 8 tags):**
- `[EDGE]` — N/A (disabled). Self-covered: enumerated the three attract-reaching paths (direct attract tick, attract idle, qualifying-confirm→attract); all pinned.
- `[SILENT]` — N/A (disabled). No error-swallowing surface in a test-only delta.
- `[TEST]` — **The crux, self-covered and mutation-verified.** H-1 RESOLVED (3 pins fail iff `sim.ts:162` reverted); L-1 folded into the qualifying-path pin (its `base`-aging assertion); L-2 resolved (named-constant import). 0 remaining test findings.
- `[DOC]` — N/A (disabled). Self-covered: the new annotation comment accurately explains the old test's non-pinning nature (matches the mutation result).
- `[TYPE]` — N/A (disabled). Covered by Rule Compliance #1 — 0 type-safety escapes; literals typecheck.
- `[SEC]` — N/A (disabled). No security surface (see above).
- `[SIMPLE]` — N/A (disabled). The 3 pins are minimal; no over-engineering.
- `[RULE]` — Self-covered in Rule Compliance (4 applicable sections, 0 violations).

### Devil's Advocate

Assume this rework is broken until proven otherwise — and this time the trap is subtler than a green suite, because a re-review can rubber-stamp by trusting the previous author's mutation claim without redoing it. So I redid it. Could the 3 new pins be theater — green now, but green for the wrong reason, passing even if `stepAttract` never aged debris? No: I reverted `sim.ts:162` in isolation and watched exactly those 3 tests go red while the rest of the suite (including the old, admittedly-vacuous test) stayed green. That is the signature of a genuine guard, not a decorative one. Could I have mutated the wrong line — caught `stepGameOver`'s `base` aging (`sim.ts:190`) by accident and fooled myself? No: I grepped after mutating and confirmed line 190 still read `updateShipDebris(...)` while only 162 changed. Could the third test be constructing a `gameOver` state that never actually occurs — a fiction that exercises a branch real play can't reach? I traced `stepGameOver`: a qualifying, unconfirmed phase with 3 initials plus a fresh Start press (`startPrev:false` → `startPressed:true`) is precisely the confirm branch, and it returns to attract in the same tick with no display-timer floor — a strong player slamming Start after typing initials hits this every time, exactly the "fast confirm re-enters attract with live wreckage" scenario. Could a future maintainer still delete `sim.ts:162` and ship frozen wreckage across the PUSH START screen — the original HIGH bug — with a green suite? Now, no: that deletion fails three named tests, including one whose title spells out the reachable real path. What about the seam I can't see — does attract-mode demo play mutate `shipDebris` behind the aging line, so the test passes by luck? I read `stepAttract`'s non-start branch: it spreads `...state` and touches `shipDebris` on exactly one line; no demo AI, no reset, no second writer. The one honest residue: the pure *awaiting-initials idle* aging (qualifying, unconfirmed, no Start yet) has no dedicated multi-tick test — but it shares the same `base` object whose aging the third test's confirm-tick assertion pins directly, and L-1 was rated LOW and explicitly foldable. That is a coverage nicety, not a reachable unguarded regression. Nothing here blocks.

### Findings (VERIFIED — no blocking issues)

- [VERIFIED] H-1 RESOLVED — `tests/shipDebris.test.ts` new describe block; reverting `sim.ts:162` fails exactly the 3 new pins (`3 failed | 39 passed`), reproduced independently by the Reviewer.
- [VERIFIED] L-2 RESOLVED — `import { GAME_OVER_DISPLAY_S }` + `Math.ceil((GAME_OVER_DISPLAY_S + 0.5) / DT)` replaces the hardcoded `3`; loop bound can no longer desync.
- [VERIFIED] L-1 substantially covered — the qualifying-path pin's `confirmed.shipDebris[0].life ≈ 1 - DT` assertion pins the shared `base` aging that the awaiting-initials idle path also uses.
- [VERIFIED] Old non-qualifying test correctly retained + annotated — stays green under the mutation (one of the 39), matching its documented non-pinning role.
- [VERIFIED] No new code, no new smells — preflight clean (743/743, build clean, tree clean); `git log develop..HEAD` confirms `942ee9d` is the only new commit, test file only.

**Why APPROVE:** The single round-1 blocker (H-1, HIGH `[TEST]`) is verified closed by independent mutation; L-1/L-2 are resolved; the code was already accepted and is unchanged; the test-only delta introduces zero new issues, smells, or deviations. No Critical/High findings remain. All review-checklist steps complete.

**Handoff:** To SM (Winston Smith) for finish-story.