---
story_id: A-14
jira_key: ""
epic: A
workflow: tdd
---
# Story A-14: Hyperspace — random reposition, 25% self-destruct, edge-avoid, wait-for-clear

## Story Details
- **ID:** A-14
- **Jira Key:** (none — local tracking)
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** asteroids

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-04T16:32:25Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-04T15:30:18Z | 2026-07-04T15:33:23Z | 3m 5s |
| red | 2026-07-04T15:33:23Z | 2026-07-04T15:46:36Z | 13m 13s |
| green | 2026-07-04T15:46:36Z | 2026-07-04T16:00:05Z | 13m 29s |
| review | 2026-07-04T16:00:05Z | 2026-07-04T16:13:35Z | 13m 30s |
| red | 2026-07-04T16:13:35Z | 2026-07-04T16:19:47Z | 6m 12s |
| green | 2026-07-04T16:19:47Z | 2026-07-04T16:24:55Z | 5m 8s |
| review | 2026-07-04T16:24:55Z | 2026-07-04T16:32:25Z | 7m 30s |
| finish | 2026-07-04T16:32:25Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (red)
- **Gap** (non-blocking): The context's "Code shape" section (proposing `Ship.spawnTimer`/`Ship.visible` + `tickSpawnTimer(ship)`) is stale — it predates A-15, which landed the shared reappearance-window timer as `GameState.shipSpawnTimer` and the death path as `handleShipDeath`. Tests were written against the landed shapes (see Design Deviations). Affects `sprint/context/context-story-A-14.md` (Code-shape section). *Found by TEA during red phase.*
- **Question** (non-blocking): Wiring ORDER in stepGame — `triggerHyperspace` must run so its survival roll consumes RNG deterministically AND its death does not double-count against sim.ts's collision-death edge (`if (!state.shipDestroyed && shipDestroyed && lives>0) handleShipDeath`). Tests assert exactly one life lost per failed jump; Dev should ensure a hyperspace death is fully consumed by `handleShipDeath` and not re-fed into the collision edge. Affects `src/core/sim.ts` (stepGame wiring). *Found by TEA during red phase.*

### Dev (implementation)
- **Gap** (non-blocking): The render skip for a hidden ship is deferred — `Ship.visible` is set correctly in the core, but `src/shell/render.ts` does NOT yet skip drawing a `!visible` ship, so during the hyperspace window the ship still renders at its new position instead of vanishing. Explicitly out of A-14's scope (context Scope: "rendering the hidden-ship visual is a shell/A-5 concern … a trivial skip-draw-while-`!visible` is fine but not this story's deliverable"). A one-line guard in `drawShip`/`render` (A-5/A-17) completes the visual. Affects `src/shell/render.ts`. *Found by Dev during implementation.*
- No other upstream findings — TEA's reconciliation held; the landed A-8/A-15 seams (`handleShipDeath`, `GameState.shipSpawnTimer`) absorbed hyperspace cleanly.

### Reviewer (code review)
- **Conflict** (blocking): The `state.ts:36` comment "The renderer skips a hidden ship" asserts behavior that does NOT exist — `src/shell/render.ts` gates ship drawing on `mode`/`shipDestroyed` only and never reads `ship.visible`, so the hidden window is invisible on screen. Either implement the one-line render skip or reword the comment to say it's deferred (A-5/A-17). Affects `src/core/state.ts` (comment) and `src/shell/render.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): The `_rockCount` A-17 density seam is well placed, but consider also threading rock count into the sim call site (currently `state.rocks.length`) is already done — no action, noted for the A-17 quarry. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (red)
- **Reused `GameState.shipSpawnTimer` (+ new `Ship.visible`) instead of the context's proposed `Ship.spawnTimer`/`Ship.visible` pair**
  - Spec source: context-story-A-14.md, "Code shape" (lines 99-124) and ACs (lines 144-160)
  - Spec text: "Extend `Ship` … with `visible: boolean` … and `spawnTimer: number` … `tickSpawnTimer(ship, dt): Ship`"
  - Implementation (what the tests target): the hidden/invulnerable window reuses `GameState.shipSpawnTimer` (A-15's landed field), decayed by the existing sim.ts logic; a failed jump routes through `handleShipDeath` (A-15); only `Ship.visible` is added as a genuinely new field.
  - Rationale: the context predates A-15. A-15 landed the window timer as `GameState.shipSpawnTimer` — whose own comment (lives.ts:49, state.ts:145) explicitly reserves it for A-14 to reuse — and the death as `GameState.shipDestroyed` via `handleShipDeath`. The context itself intended sharing ("a field A-15 will reuse … rather than inventing a parallel one"), so reusing the landed field honors that intent; inventing `Ship.spawnTimer` would create the exact parallel field the context warned against.
  - Severity: minor
  - Forward impact: minor — Dev implements against `GameState.shipSpawnTimer` + `Ship.visible`; sim.ts already decays the timer, so Dev adds only the reveal-at-zero flip and the trigger. A-15 is already done, so no sibling-story churn.

### Dev (implementation)
- **Did not add the context's `tickSpawnTimer(ship, dt): Ship` helper — folded the window into the existing A-15 machinery**
  - Spec source: context-story-A-14.md, "Code shape" (lines 103-124)
  - Spec text: "`tickSpawnTimer(ship, dt): Ship` — counts `spawnTimer` down to 0 … flipping `visible` back to `true`"
  - Implementation: the window timer IS `GameState.shipSpawnTimer`, already decayed each tick by sim.ts (A-15). Dev added only the reveal-at-zero flip inline in sim.ts (a 2-line `revealedShip`), not a separate Ship-level helper.
  - Rationale: follows directly from TEA's reconciliation (reuse `GameState.shipSpawnTimer`). The decay already exists, so a `tickSpawnTimer(ship)` helper would duplicate it; the only genuinely new behavior is the visibility flip, which belongs where the decay lives. Simplest code that passes the tests.
  - Severity: minor
  - Forward impact: none — the shipped seam (constants + the three roll/trigger functions + `Ship.visible`) matches the ACs; no sibling story references `tickSpawnTimer`.
- **Made `Ship.visible` a REQUIRED field (not optional)**
  - Spec source: context-story-A-14.md, "Code shape" (line 99)
  - Spec text: "Extend `Ship` … with `visible: boolean` (default `true`)"
  - Implementation: `visible: boolean` required (matches state.ts's all-required convention); rippled `visible: true` into the one production respawn-ship literal (lives.ts) and 8 full-ship test literals.
  - Rationale: a ship is always visible xor hidden — an optional/undefined third state is a weaker model, and the codebase has no optional entity fields. The ripple is mechanical type-conformance, not a logic change.
  - Severity: minor
  - Forward impact: minor — any future full-`Ship` literal must set `visible`; partial `playing({…})` overrides are unaffected.
- **Added edge-triggering (`hyperspacePrev`) — deviating from the context's "no edge tracking needed" (rework RT1)**
  - Spec source: context-story-A-14.md, "Code shape" (lines 112-114)
  - Spec text: "only acts when input.hyperspace is true and ship.spawnTimer === 0 (this doubles as the debounce … so no separate edge-detection/'pressed' tracking is needed)"
  - Implementation: added `GameState.hyperspacePrev` (threaded like firePrev/thrustPrev/startPrev); `triggerHyperspace` fires only on the rising edge (`!state.hyperspacePrev`).
  - Rationale: the context's "window is the debounce" only holds DURING the window — once it closes, a held key auto-repeats jumps every ~48 frames (Reviewer-confirmed HIGH defect). Edge-triggering matches how every other button (fire/thrust/start) is debounced in this sim.
  - Severity: minor (defect fix)
  - Forward impact: minor — `hyperspacePrev` is a new `GameState` field; no test literals needed it (all use initialState/playing).
- **Implemented the render skip for a hidden ship (rework RT1) — earlier deferred, now done**
  - Spec source: context-story-A-14.md, Scope (lines 137-139) + Reviewer Conflict
  - Spec text: "a no-op or trivial skip-draw-while-`!visible` is fine but not this story's deliverable"
  - Implementation: `render.ts` now gates ship+flame draw on `state.ship.visible`, so a hyperspace jump vanishes the ship for its window.
  - Rationale: the Reviewer flagged the `state.ts:36` comment as asserting unimplemented behavior (blocking Conflict). Implementing the one-liner (which the context explicitly permits) resolves the Conflict AND completes the visual, rather than just rewording the comment.
  - Severity: minor
  - Forward impact: none — one render guard; A-5/A-17 can still polish the visual.

### Reviewer (audit)
- **TEA's "reuse `GameState.shipSpawnTimer`" reconciliation** → ✓ ACCEPTED: sound; the field's own comment reserves it for A-14, and the death via `handleShipDeath` is the right seam.
- **Dev's "no `tickSpawnTimer` helper"** → ✓ ACCEPTED: the A-15 decay already exists; a helper would duplicate it.
- **Dev's "`Ship.visible` required"** → ✓ ACCEPTED: matches state.ts's all-required convention.
- **UNDOCUMENTED (context-inherited) — "the open window IS the debounce, no edge tracking":** ✗ FLAGGED by Reviewer. The context (lines 112-114) proposed acting only on `shipSpawnTimer === 0` with "no separate edge-detection/'pressed' tracking needed," and Dev implemented it faithfully. But that reasoning only debounces *during* the window: once `shipSpawnTimer` drains to 0, a still-HELD `input.hyperspace` re-fires a fresh jump the very next tick (auto-repeat every ~48 frames — empirically confirmed by rule-checker). Hyperspace must be edge-triggered like `firePrev`/`thrustPrev`/`startPrev` (a new `hyperspacePrev` on GameState). Added to the findings table below; rework needed.

### Reviewer (audit — RT1 re-review)
- **Dev's "added edge-triggering (`hyperspacePrev`)" (RT1)** → ✓ ACCEPTED: this is the correct fix for the debounce defect I flagged; threading matches the firePrev/thrustPrev precedent exactly (rule-checker confirmed no stale-edge mistrigger).
- **Dev's "implemented the render skip" (RT1)** → ✓ ACCEPTED: resolves my blocking Conflict; the `state.ts` comment is now true, and the skip never drops a ship that should draw (respawn ship is `visible:true`). Follow-up render test logged as non-blocking (below).

**Setup Complete:** Yes
**Story:** A-14 — Hyperspace (random reposition, 25% self-destruct, edge-avoid, wait-for-clear) — 3pt, tdd, asteroids, p1
**Workflow:** tdd (phased) → next phase: **red** (TEA / O'Brien)
**Branch:** `feat/A-14-hyperspace` (asteroids, off develop @ dc377c0 — includes A2-1/A2-2)
**Context:** `sprint/context/context-story-A-14.md` — **already enriched (169 lines)**, committed at ed63ba2, preserved through setup (verified blob unchanged; sm-setup's `pf context create` clobber avoided).

**Coordination notes for TEA (red phase):**
- **Use the enriched context.** It carries the ROM/disassembly research (reposition via seeded RNG; 25% self-destruct risk roll; edge-avoid; wait-for-clear window) and a dependency analysis. Treat its constants as *leads for A-17's quarry pass*, not settled — the context flags them as AI-summarized excerpts.
- **Read the prior related session archives before writing tests** (`sprint/archive/`): **A-8** (collision/death pipeline — a failed hyperspace jump is an ordinary ship death, not a special case), **A-10** (rock-count/placement bookkeeping — needed to judge a safe landing spot for edge-avoid/wait-for-clear), **A-15** (lives / safe-respawn — owns what happens *after* the death A-14 can cause), **A-13** (saucer collision).
- **Determinism:** hyperspace draws fresh coords from the **seeded RNG** carried in GameState — tests must seed the RNG and assert reposition/self-destruct outcomes deterministically (no `Math.random`).
- **Collision-test convention (memory):** existing collision tests fire **stationary** bullets and the bullet-vs-rock path uses a swept segment test (`sweptOverlaps`). A-14's self-destruct feeds A-8's collision/death path — mirror the established collision-test patterns for the death branch.
- **Input seam:** `Input.hyperspace` has existed since A-2 but nothing reads it — A-14 is the first consumer. Scope is the jump only (trigger, reposition, risk roll, the neither-gone-nor-back window); post-death lives/respawn belongs to A-15 (done).

**Handoff:** To TEA (O'Brien) for the red phase.

## TEA Assessment

**RED Confirmed:** Yes — `tests/hyperspace.test.ts` fails on the missing module (`ERR_MODULE_NOT_FOUND` for `../src/core/hyperspace`, an import error — not a test-logic bug); all 30 pre-existing test files stay green (593 tests), no regressions.
**Tests Added:** `tests/hyperspace.test.ts` (269 lines) — committed `6a17da9`, pushed on `feat/A-14-hyperspace`.

**Coverage — all 6 ACs, fixed-seed + fixed-dt:**
- `rollHyperspaceSurvival`: exact per-seed threshold contract (survive ⇔ drawn float ≥ 0.25) verified against `peekFloat` so a correct impl cannot false-fail; consumes exactly one RNG draw; `rockCount` ignored (the A-17 density-swap seam) — same result AND same stream.
- `rollHyperspacePosition`: both axes inside `[margin, 1-margin] * bounds`; consumes exactly two draws; deterministic per seed.
- `triggerHyperspace`: no-op when unpressed / mid-window (debounce — no RNG draw, not re-teleported) / already dead; **success** = repositioned in-band + velocity zeroed + `visible=false` + `shipSpawnTimer=HYPERSPACE_TIMER_S` + `shipDestroyed` stays false; **failure** = `shipDestroyed=true` + exactly one life lost (via `handleShipDeath`) + not repositioned.
- `Ship.visible` defaults `true` on a fresh ship.
- `stepGame`: hyperspace is actually READ (outcome differs from not-pressing — it was inert since A-2); determinism golden replay (same seed+script+dt ⇒ deep-equal); the hidden window drains to exactly `0` and reveals (`visible=true`) on the reach-zero tick (~48 frames @ 60Hz, float-tolerant); no re-trigger while the window is open.

**Constants pinned (provisional — A-17 quarry seam):** `HYPERSPACE_DEATH_CHANCE=0.25`, `HYPERSPACE_EDGE_MARGIN≈0.1`, `HYPERSPACE_TIMER_S=48/60`.

**Rule Coverage (`gates/lang-review/typescript.md`):**
- **#8 test quality:** every test carries a meaningful assertion; no vacuous `is_some`-style checks; exact draw-count assertions pin RNG semantics; no `as any` in tests.
- **#4 null/undefined & correctness:** survival uses a `>=` threshold (deliberately not `||`/falsy), pinned exactly; the position band math is pinned on both axes.
- **Core purity / determinism** (CLAUDE.md core boundary): the golden replay asserts `stepGame` is a pure function of `(seed, input, dt)` across a hyperspace press.

**Handoff:** To Dev (Julia) for GREEN. Implement `src/core/hyperspace.ts` (`HYPERSPACE_*` constants + `rollHyperspaceSurvival`/`rollHyperspacePosition`/`triggerHyperspace`) and add `Ship.visible`, then wire `triggerHyperspace` + the reveal-at-zero flip into `stepGame`'s playing branch. **Read the Design Deviations + Delivery Findings above first** — the landed-shape reconciliation (reuse `GameState.shipSpawnTimer`, death via `handleShipDeath`) and the double-count wiring caution.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `src/core/hyperspace.ts` (NEW) — `HYPERSPACE_DEATH_CHANCE`/`EDGE_MARGIN`/`TIMER_S` + `rollHyperspaceSurvival`/`rollHyperspacePosition`/`triggerHyperspace` (pure).
- `src/core/state.ts` — new required `Ship.visible` (default `true` in `initialState`).
- `src/core/ship.ts` — `stepShip` spreads the ship so `visible` carries through the physics step.
- `src/core/sim.ts` — `stepGame` applies `triggerHyperspace` before the rng clone/collisions (rebound `state`), reveals the ship when the window closes, and gates respawn on the pre-jump death latch (`wasDeadBefore`) so a failed jump still spends one tick dead — no double-count against the collision death edge.
- `src/core/lives.ts` — respawn-ship literal gains `visible: true`.
- 6 test files (bullet, collision, events, lives, saucer-collision, score) — `visible: true` added to full-ship literals (mechanical type conformance).

**Tests:** 616/616 GREEN — the 23 new hyperspace tests + 593 pre-existing, no regressions. `tsc --noEmit` + `vite build` clean.
**Branch:** `feat/A-14-hyperspace` — committed `2568598`, pushed.

**Design decisions (see Design Deviations):** reused A-15's `GameState.shipSpawnTimer` + `handleShipDeath` per TEA's reconciliation; no separate `tickSpawnTimer` helper (the decay already exists); `Ship.visible` required.

**Handoff:** To review (The Thought Police). One deferred item for the Reviewer to weigh: the render skip for a hidden ship is out of scope (Delivery Findings) — the core `visible` flag is correct, but the ship still draws during the window until A-5/A-17 adds the one-line skip.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 smells | N/A (616 green, build clean) |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 7 (2 high, 3 med, 2 low) | confirmed 7, dismissed 0 |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 4 (3 high + 1 doc) | confirmed 4, dismissed 0 |

**All received:** Yes (3 enabled subagents returned; 6 disabled via `workflow.reviewer_subagents`, pre-filled as Skipped)
**Total findings:** 3 confirmed HIGH (blocking) + several MED/LOW; 0 dismissed. Both enabled analytical subagents independently converged on the same core defect (the death-edge/event bypass), and I reproduced the key claims myself.

### Rule Compliance (TypeScript lang-review + project conventions)

- **Type-safety (#1), generics (#2), modules (#5):** COMPLIANT — no `as any`/`!`/`@ts-ignore`; `Ship.visible` required (convention); imports correctly type-only vs value; `_rockCount` unused param is legal (`noUnusedParameters:false`) and a documented seam.
- **Null/undefined (#4):** COMPLIANT — the guard `!input.hyperspace || state.shipDestroyed || state.shipSpawnTimer > 0` is boolean-OR, not falsy-defaulting.
- **Performance (#12):** COMPLIANT — the rng-clone / position `Vec2` / `revealedShip` allocations happen only on a jump or the single window-close tick, not per-frame.
- **Core purity / determinism (CLAUDE.md):** COMPLIANT — no DOM/`Date`/`Math.random`; `triggerHyperspace` draws off a clone and never mutates the caller; the `let state = inState` rebind is only ever set to a pure result; the golden replay passes.
- **Fix-introduced regressions (#13):** **VIOLATION ×3 (HIGH)** — see observations 1-3 (silent hyperspace death, missing thrust-stop, no edge debounce). This is the blocking category.

### Observations

1. `[HIGH]` `[RULE]` **Failed hyperspace jump emits no `explosion` event** — `sim.ts:378` `if (!state.shipDestroyed && shipDestroyed)` re-reads `state` AFTER it was rebound to the post-jump value (`sim.ts:238`); a failed jump already set `shipDestroyed=true`, so the edge never fires. Verified by me (code) + rule-checker (probe): rock death → `explosion source:'ship'`; hyperspace death → `events:[]`. The block's own comment says "a real explosion happened this frame either way" — an unintended bypass.
2. `[HIGH]` `[RULE]` **No thrust-stop on a thrusting hyperspace death** — same edge, `sim.ts:387`: a ship that self-destructs via hyperspace while thrusting never emits `thrust-stop`, so the engine loop hums through gameover — precisely the bug the comment guards against. Verified by rule-checker probe.
3. `[HIGH]` `[RULE]` **No edge debounce for hyperspace** — `hyperspace.ts:71` gates only on `shipSpawnTimer > 0`; once the window drains to 0 a still-HELD `input.hyperspace` re-fires a fresh jump next tick (auto-repeat ~every 48 frames). Needs a `hyperspacePrev` edge field like `firePrev`/`thrustPrev`/`startPrev`. Context-inherited flaw (see Deviation audit). Verified by rule-checker probe + code.
4. `[HIGH]` `[TEST]` **The failed-jump death path has zero `stepGame` integration coverage** — `DIE_SEED` is used once, at the `triggerHyperspace` unit level (`tests/hyperspace.test.ts:199`); no `stepGame(playing(DIE_SEED),HYPER,DT)` test exists, so none of observations 1-3 were caught. Verified by me (grep).
5. `[HIGH]` `[TEST]` **Last-life hyperspace death → gameover untested** — every fixture is `lives:3`; the `handleShipDeath` last-life branch is never exercised via the hyperspace path.
6. `[MED]` `[TEST]` **Tautological survival test** — `roll === (peekFloat >= 0.25)` restates the impl formula, so it can't catch a `>` vs `>=` boundary inversion (no seed lands on exactly 0.25). Add a forced-`0.25`-draw boundary test.
7. `[MED]` `[TEST]` **Position test is bounds-only** — no golden `{x,y}` pins the axis-draw order; a swapped/reused-draw bug would pass.
8. `[MED]` `[DOC]` **Stale comment** (`state.ts:36`) — "The renderer skips a hidden ship" asserts unimplemented behavior; render.ts never reads `visible`. (Blocking as a Conflict finding — reword or implement.)
9. `[VERIFIED]` No-double-death + one-tick-dead — `wasDeadBefore` (captured pre-rebind) correctly gates respawn, and the `lives>0` death-edge is suppressed for a hyperspace death (state.shipDestroyed already true) — no double decrement. Confirmed by me + rule-checker.
10. `[VERIFIED]` `[SIMPLE]`/`[TYPE]` `stepShip`'s `...ship` spread is leak-free (Ship has exactly 4 fields; 3 overridden, `visible` passes through); reveal-at-zero has no float hazard (`Math.max(0,…)` gives exact `0`).

Disabled-subagent domains (self-assessed): `[EDGE]` the boundary edges (window-close re-fire, death-event edge) ARE the confirmed HIGH bugs above. `[SILENT]` the missing explosion/thrust-stop events are literally silent failures — obs 1-2. `[SEC]` N/A — `input.hyperspace` is a plain bool, no injection surface. `[TYPE]`/`[SIMPLE]` covered in obs 10.

### Devil's Advocate

Assume this ships as-is. A player mashes-and-holds the hyperspace key in a panic: the ship jumps, and 0.8s later — still holding — jumps again, and again, rolling the 25% self-destruct each time, because there is no edge debounce. That is not a panic button; it is a hold-to-gamble-your-life autofire, and it will read as broken to anyone who plays it. Now the player finally loses a jump: the ship vanishes with no explosion, no sound, no feedback — it just silently isn't there, then respawns. Every other death in the game explodes; this one is a mime. Worse, if they died mid-thrust, the engine hum never stops — it drones on under the GAME OVER card, because the thrust-stop edge was skipped too. On the last life, a failed jump does reach gameover, but nothing tests that it does, so a future refactor of the stepGame ordering could silently break the whole death path and the suite would stay green. The root cause is a single seductive shortcut: "the open window is the debounce, and a failed jump routes through handleShipDeath, so I don't need edge tracking or the explosion edge." It's elegant and it's wrong — the window debounces only until it closes, and routing death *before* the event edge means the event edge, which keys off the pre-death latch, can't see it. The tests mirrored the shortcut (they only probe the window while it's open, and only the death at the unit level), so they blessed the bug. The fix is small and known (a `hyperspacePrev` edge field; emit the death events on the hyperspace path too), but it is required — three confirmed, empirically-reproduced behavioral defects in a p1 gameplay story.

## Reviewer Assessment

**Verdict:** REJECTED

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | Failed hyperspace jump emits no `explosion` event (silent death) | `src/core/sim.ts:378` | Emit `{type:'explosion',source:'ship'}` for a hyperspace death too (route it through the death-event edge, or emit in the hyperspace-death path). |
| [HIGH] | Thrusting hyperspace death skips `thrust-stop` (engine hums into gameover) | `src/core/sim.ts:387` | Same edge fix — ensure a hyperspace death runs the thrust-stop guard. |
| [HIGH] | No edge debounce — held hyperspace auto-repeats jumps ~every 48 frames | `src/core/hyperspace.ts:71` | Add a `hyperspacePrev` edge field (GameState) and trigger only on the rising edge, like `firePrev`. |
| [HIGH] | Death-path has zero `stepGame` integration coverage (masked the above) | `tests/hyperspace.test.ts` | Add stepGame tests: failed jump → one life lost + explosion + (thrusting) thrust-stop; held-key does NOT re-fire across window close; last-life → gameover. |
| [MED] | Tautological survival test / bounds-only position test / stale `visible` comment | tests + `state.ts:36` | Boundary + golden-position tests; reword or implement the render skip. |

**Subagent dispatch tags:** `[RULE]` 3 HIGH (event bypass ×2, no edge debounce) · `[TEST]` 2 HIGH + 3 MED/LOW coverage gaps · `[EDGE]`/`[SILENT]` realized in the RULE findings · `[DOC]` stale comment · `[TYPE]`/`[SIMPLE]`/`[SEC]` clean (obs 10 / N/A) — the 6 named subagents disabled via settings, self-assessed above.

**Data flow traced:** `input.hyperspace` → `triggerHyperspace` → (fail) `handleShipDeath` sets `shipDestroyed` BEFORE sim's event edge → the edge, keyed on the pre-death latch, misses it → no death events. This is the defect.

**Root cause:** the death is applied before, and the trigger debounces only within, the window — both bypass machinery that keys off the pre-step latch.

**Handoff:** Back to TEA (O'Brien) for RED rework — the findings are testable (missing edge cases + logic bugs). TEA adds the failing integration/edge tests; Dev then fixes the event emission + edge debounce.

## TEA Assessment (rework RT1)

**RED Confirmed:** Yes — 3 new tests fail on behavioral assertions (not compile errors); 619 pass (3 coverage-fills + the pre-existing suite); build clean.
**Tests Added:** `tests/hyperspace.test.ts` (+82 lines) — committed `5660dd4`, pushed on `feat/A-14-hyperspace`.

**Failing (pin the reviewer's HIGH defects — these drive the fix):**
- `emits a ship-explosion and spends exactly one life` — `expected [] to contain {type:'explosion', source:'ship'}` (silent death) AND `lives === 2` (no double-count).
- `stops a still-thrusting engine on a failed jump` — `expected [] to contain {type:'thrust-stop'}`.
- `does not re-trigger a jump when hyperspace is HELD across the window closing` — `expected true to be false` (auto-repeat).

**Passing coverage-fills (guard correct behavior):** last-life failed jump → gameover; re-arm after release (no permanent latch); position axis-order golden.

**Fix guidance for Dev (I diagnosed the exact mechanisms):**
1. **Explosion + thrust-stop (sim.ts:378):** the event edge `if (!state.shipDestroyed && shipDestroyed)` re-reads the POST-jump `state.shipDestroyed` (already `true` for a hyperspace death). Fix: gate that EVENT edge on the pre-jump latch instead — `if (!wasDeadBefore && shipDestroyed)` (`wasDeadBefore` is already captured at sim.ts:237). **Keep the `handleShipDeath` edge (sim.ts:421) on `state.shipDestroyed`** so the failed-jump death is not decremented twice (the `lives === 2` assertion enforces this — don't regress it).
2. **Edge debounce (hyperspace.ts:71):** add `hyperspacePrev: boolean` to `GameState` (initialState `false`), trigger only on the rising edge — `input.hyperspace && !state.hyperspacePrev && !state.shipDestroyed && state.shipSpawnTimer === 0` — and thread `hyperspacePrev: input.hyperspace` through every `stepGame` return (like `firePrev`/`thrustPrev`/`startPrev`, incl. stepAttract/stepGameOver). Expect a `hyperspacePrev` ripple to any full `GameState` literals (mechanical, like the `Ship.visible` ripple).
3. **Stale comment (state.ts:36 — Reviewer's blocking Conflict):** either implement the one-line render skip (`if (state.ship.visible) drawShip(...)` in render.ts) or reword the comment to say the visual is deferred (A-5/A-17). Reviewer will re-check.

**Handoff:** To Dev (Julia) for GREEN rework. Make the 3 failing tests pass without regressing the 619; then the stale-comment Conflict.

## Dev Assessment (rework RT1)

**Implementation Complete:** Yes — all 3 reviewer HIGH defects fixed + the blocking Conflict resolved.
**Files Changed:**
- `src/core/sim.ts` — the explosion/thrust-stop event edge now gates on `wasDeadBefore` (pre-jump latch) instead of the post-jump `state.shipDestroyed`, so a failed hyperspace jump cues like any other death; the `handleShipDeath` edge still uses `state.shipDestroyed` so lives decrements exactly once (no double-count). Threaded `hyperspacePrev: input.hyperspace` in the stepped state.
- `src/core/state.ts` — new required `GameState.hyperspacePrev` (default `false`).
- `src/core/hyperspace.ts` — `triggerHyperspace` now fires only on the rising edge (`!state.hyperspacePrev`), so a held key jumps once, not every ~48 frames.
- `src/shell/render.ts` — ship+flame draw now gated on `state.ship.visible`, so a hyperspace jump actually vanishes the ship (resolves the Reviewer Conflict; the `state.ts` comment is now true).

**Tests:** 622/622 GREEN — the 3 previously-failing rework tests now pass; no regressions. `tsc --noEmit` + `vite build` clean. (No `hyperspacePrev` ripple — all tests use `initialState`/`playing`.)
**Branch:** `feat/A-14-hyperspace` — committed `0a78dec`, pushed.

**Response to each finding:**
- HIGH silent death → fixed (explosion event fires; `lives===2` still enforced).
- HIGH thrust-stop → fixed (same edge change).
- HIGH edge debounce → fixed (`hyperspacePrev` rising-edge trigger).
- Blocking Conflict (stale `visible` comment) → resolved by implementing the render skip.
- MED position axis-order / boundary → position golden added by TEA (passes); the exact-0.25 boundary is measure-zero and not pursued (non-blocking; the `>=` threshold + `HYPERSPACE_DEATH_CHANCE===0.25` constant pin the semantics).

**Handoff:** Back to review (The Thought Police) for re-review of the rework.

## Reviewer Assessment (re-review — RT1)

## Subagent Results (RT1 re-review)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 smells | N/A (622 green, build clean, 3 rework tests pass) |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 1 med, 1 low | confirmed 2 (non-blocking) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations | N/A |

**All received:** Yes (3 enabled returned; 6 disabled via settings)
**Total findings:** 0 blocking; 1 MED + 1 LOW (both non-blocking, logged). The 3 prior HIGH defects are all fixed and independently verified (preflight + rule-checker + test-analyzer + my own trace).

### Rule Compliance (RT1)
- **Fix-introduced regressions (#13):** CLEAN — rule-checker traced all 4 files line-by-line: the `wasDeadBefore` event edge is byte-identical to before for collision deaths and fires for hyperspace deaths; no double `handleShipDeath` (the decrement edge still keys off `state.shipDestroyed`); `hyperspacePrev` threading matches the firePrev precedent; the render skip drops only a `visible:false` ship (respawn ship is `visible:true`).
- **Purity / type-safety:** CLEAN — no new DOM/`Date`/`Math.random`, no `as any`/non-null `!` (all `!` are boolean-NOT); `hyperspacePrev` required, no missing literal (tsc clean).

### Observations
1. `[VERIFIED]` `[RULE]` Silent-death fix — `!wasDeadBefore && shipDestroyed` (sim.ts) now cues explosion+thrust-stop for a hyperspace death; the `lives===2` test enforces no double-count. Verified by me + rule-checker (line-by-line) + the now-green rework tests.
2. `[VERIFIED]` `[RULE]` Edge-trigger fix — `hyperspacePrev` guard makes a held key fire once; consistent with firePrev/thrustPrev; no stale-edge mistrigger.
3. `[VERIFIED]` Render skip — `&& state.ship.visible` hides only the hyperspace-hidden ship; respawn/normal ships (visible:true) still draw.
4. `[VERIFIED]` `[TEST]` All 5 rework tests are sound, non-vacuous regression pins (each provably fails on pre-fix code) — test-analyzer confirmed.
5. `[MED]` `[TEST]` The render `!visible` skip (render.ts:403) has NO test — the feature's visual payoff ships unverified. Non-blocking (render visuals are eyeball-convention here); logged as a follow-up.
6. `[LOW]` `[TEST]` Rework test 3 implicitly depends on `WAVE_DELAY_S` exceeding its ~1s loop span (no live hazard can masquerade as a re-trigger). True today; not a present defect.

Disabled-domain tags: `[EDGE]`/`[SILENT]` — the prior HIGH bugs (silent death, auto-repeat) are the edge/silent-failure cases, now fixed & verified. `[DOC]` the stale `visible` comment is now TRUE (render implements the skip). `[TYPE]`/`[SIMPLE]`/`[SEC]` clean (obs 1-3, rule-checker).

### Devil's Advocate
The three defects that sank round 1 are genuinely gone: a failed jump now booms and stops its engine (the event edge reads the pre-jump latch), a held key jumps once (the rising-edge guard), and the ship actually vanishes (the render skip). Could the fix have broken something? The event-edge change is the riskiest — but for any non-hyperspace death `triggerHyperspace` is a no-op, so `wasDeadBefore === state.shipDestroyed` and the collision-death path is byte-identical; rule-checker and the full 622-test suite confirm no regression. The one soft spot is that the render skip — the actual visible point of the whole story — has zero automated coverage; a future refactor of `render()` could silently stop hiding the ship and no test would notice. That's real, but it's MED (this codebase eyeballs render visuals by convention, and the skip is a trivial single guard), so it's a logged follow-up, not a blocker. Nothing rises to HIGH; the story does what it claims and is well-tested at the sim layer.

**Verdict:** APPROVED

**Dispatch tags:** `[RULE]` clean (0 violations, line-by-line) · `[TEST]` 5 sound rework tests + 1 MED (render skip untested) + 1 LOW (fragility) · `[EDGE]`/`[SILENT]` prior HIGH bugs fixed & verified · `[DOC]` comment now accurate · `[TYPE]`/`[SIMPLE]`/`[SEC]` clean.

**Data flow traced:** `input.hyperspace` (rising edge via `hyperspacePrev`) → `triggerHyperspace` → (fail) `handleShipDeath` sets `shipDestroyed`; the event edge now reads `wasDeadBefore` (pre-jump) → explosion + thrust-stop fire. Correct.

**Non-blocking follow-up:** add a render test asserting `render(...)` skips `drawShip` when `ship.visible === false` (and draws it when true).

**Handoff:** To SM (Winston Smith) for finish-story.