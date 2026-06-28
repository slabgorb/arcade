---
story_id: "6-10"
jira_key: ""
epic: "6"
workflow: "tdd"
---
# Story 6-10: Wire authentic segment-tick + countdown-beep SFX — add their game triggers

## Story Details
- **ID:** 6-10
- **Jira Key:** (none — local tracking)
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-28T11:04:32Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-28T10:34:27Z | 2026-06-28T10:35:51Z | 1m 24s |
| red | 2026-06-28T10:35:51Z | 2026-06-28T10:42:50Z | 6m 59s |
| green | 2026-06-28T10:42:50Z | 2026-06-28T10:47:51Z | 5m 1s |
| review | 2026-06-28T10:47:51Z | 2026-06-28T11:04:32Z | 16m 41s |
| finish | 2026-06-28T11:04:32Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): The clone has no level-select countdown timer, so the
  authentic `countdown_beep` SFX (ROM $cc69) has no trigger and is deferred this
  story. Affects `tempest/src/core/state.ts` (`SelectState` is `{ selectedLevel }`
  only) and `tempest/src/core/sim.ts` (the `select` mode just steps the level on
  spin — no timeout). Wiring `countdown_beep` would first require adding a
  select-screen timeout timer + an auto-start-on-timeout behaviour, which is its
  own story. *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking): The 5-1 exhaustiveness contract in
  `tempest/tests/core/events.test.ts` is a COMPILE-TIME (`: never`) guard that
  `npm test` (vitest/esbuild — no typecheck) does NOT catch; only `npm run build`
  (tsc) does. TEA's red-phase check ran `npm test` only, so the new variant's
  break there did not surface until Dev's GREEN build. Affects the RED gate /
  `testing-runner` (consider also running `tsc --noEmit` when a story adds a
  discriminated-union variant). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (resolved): The `segmentCrosses()` helper and the `run()` closure used a
  now-stale `as unknown as { type: string; lane: number }[]` double-cast (violated TS lang-review
  rules #1 and #8) — vestigial once this commit added `SegmentCrossEvent` to the union, with a
  false "pre-GREEN" comment. FIXED INLINE during review (commit `f5206d3`): both sites now use the
  `e is SegmentCrossEvent` type predicate; stale comment removed; 433/433 green, build clean.
  Affects `tempest/tests/core/sim.segment-tick.test.ts`. *Found and fixed by Reviewer during code review.*
- **Improvement** (non-blocking): No test covers `segment-cross` emission during `warp` mode, yet
  `stepPlayer` (and the tick) runs in both `playing` and `warp`. Affects
  `tempest/tests/core/sim.segment-tick.test.ts` (add a warp-mode crossing test). *Found by Reviewer during code review.*
- **Question** (non-blocking): The core emits one `segment-cross` per frame even if a single
  huge-spin frame rounds across >1 lane. Unreachable from real input (wheel `deltaY*0.01` + keys),
  but the pure-core contract is silent. Affects `tempest/src/core/sim.ts` (document the
  one-tick-per-frame contract, or emit per lane crossed). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `stepPlayer` lacks the `Number.isFinite(input.spin)` guard that
  `select` mode added in 5-9; a non-finite spin would poison `player.lane` and now emit a spurious
  `segment-cross`. Pre-existing and unreachable from the shell input controller. Affects
  `tempest/src/core/sim.ts` (optional defensive guard). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `main.ts`'s `switch (event.type)` has no `default: never`
  guard, so a future 11th `GameEvent` variant won't flag `main.ts` as stale. Pre-existing;
  mitigated by the `events.test.ts` `discriminant()` canary. Affects `tempest/src/main.ts`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **countdown_beep half deferred (not wired, not tested)**
  - Spec source: context-story-6-10.md, AC-2
  - Spec text: "countdown_beep wired to the level-select timeout warning; if the
    clone has no level-select timer, that half is explicitly scoped or deferred
    with a documented reason."
  - Implementation: No `countdownBeep` manifest entry, no `main.ts` wiring, and
    no test for it. Only `segment_tick` is tested/wired this story. Verified the
    clone's `select` mode (`src/core/sim.ts` ~L518-531) is a pure level-stepper
    with no countdown — `SelectState` carries only `selectedLevel`. The sole
    "countdown" in core is the warp AVOID-SPIKES hold, unrelated to level-select.
  - Rationale: The AC's own fallback clause authorises deferral when no timer
    exists. Inventing a select-screen timeout to justify the cue is out of scope
    (SM assessment: "record it as a Delivery Finding rather than inventing a
    timer"). The baked `countdown_beep.wav` stays on R2, ready for a future
    select-timer story.
  - Severity: minor
  - Forward impact: A future story that adds a level-select timeout timer should
    wire `countdown_beep` then (manifest entry + a `select`-mode warning event).

### Dev (implementation)
- **Extended the 5-1 GameEvent exhaustiveness contract test for the new variant**
  - Spec source: context-story-6-10.md, AC-3 + TEA red-phase tests
  - Spec text: "any src/core change is limited to the new event emission; existing
    tests stay green"
  - Implementation: Edited a test file (`tempest/tests/core/events.test.ts`) — added
    the `{ type: 'segment-cross', lane }` fixture to `ALL_EVENTS`, a
    `case 'segment-cross'` arm to the exhaustive `discriminant()` switch, and bumped
    the "covers N distinct types" assertion 9 → 10.
  - Rationale: that suite pins an EXHAUSTIVE union contract via a `: never` default,
    so adding a documented `GameEvent` variant makes tsc fail there until the
    contract admits it — exactly like adding a `match` arm for a new enum variant.
    Test intent is preserved (still asserts exhaustiveness + exact payload fields).
    The `src/core` change itself stayed limited to the new emission, per AC-3.
  - Severity: minor
  - Forward impact: none — the contract now covers all ten variants.

### Reviewer (audit)
- **TEA: countdown_beep half deferred (not wired, not tested)** → ✓ ACCEPTED by Reviewer:
  verified `SelectState` is `{ selectedLevel }` only and the `select` mode in `sim.ts` has no
  countdown timer; AC-2's own fallback clause explicitly authorises deferral when no timer
  exists. Sound decision — inventing a timer would be out of scope.
  **Product-owner clarification (Keith):** the level-select countdown is a *coin-op urgency*
  mechanic — the real cabinet rushed players to pick a level so it could get back to taking
  quarters. This clone has no money model, so there is nothing to hurry anyone for.
  `countdown_beep` is therefore a deliberate **descope**, not pending backlog: do NOT carry
  "add a level-select timer" as future work. The baked `countdown_beep.wav` simply stays unused
  on R2. See [[no-coin-op-urgency-mechanics]].
- **Dev: extended the 5-1 GameEvent exhaustiveness contract test** → ✓ ACCEPTED by Reviewer:
  updating the `discriminant()` `: never` switch + `ALL_EVENTS` fixture is the mandatory,
  intent-preserving consequence of adding a union variant — the compile-time canary must admit
  it. Rule-checker (check A2) independently confirmed every `GameEvent` consumer is correctly
  handled (`discriminant()` and `main.ts` updated; `fx.ts`/`loop.ts` correctly need no change).
- No UNDOCUMENTED spec deviations found. The stale `as unknown as` test-cast is a code-quality
  finding (rules #1/#8), not a spec deviation — it is routed for rework via the Reviewer Assessment.

## Sm Assessment

**Routing:** Setup complete → handing to TEA (The Jesus) for the red phase. TDD
phased workflow: tea → dev → reviewer → sm. Repo is `tempest` only; branch
`feat/6-10-wire-segment-tick-countdown-beep-sfx` off `develop`.

**Scope (per the story):** Two authentic POKEY SFX were extracted + baked in
6-6 but have no game trigger. The WAVs already exist and are hosted on R2
(`arcade/tempest/sfx/segment_tick.wav` + `countdown_beep.wav`). This story is
**wiring only** — no new audio assets.

1. **segment_tick** (ROM $cc39) — cursor/claw line-cross tick. Needs a *core*
   event when the Claw rotates to a new lane, consumed by the shell.
2. **countdown_beep** (ROM $cc69) — loud level-select timeout warning. Needs a
   level-select timeout-warning trigger. **Open question for TEA/Dev:** confirm
   the clone actually has a level-select timer. If it does not, scope/defer this
   half and record it as a Delivery Finding rather than inventing a timer.

**Pattern to mirror:** the 6-6 shell wiring — `audio.ts` SOUNDS registry +
`main.ts` event switch; core emits events, shell plays sounds. Stay consistent
with how the other authentic sounds were wired.

**Note:** the 6th authentic sound, `enemy_fire`, is out of scope here — it wires
via 6-5's enemy-fire event (6-5 is done).

---
## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** New deterministic core event + shell SFX wiring — exactly the kind of
behaviour TDD covers.

**Test Files:**
- `tempest/tests/core/sim.segment-tick.test.ts` (NEW) — the `segment-cross` core
  event: emitted when the Claw's resolved discrete lane changes on a spin.
- `tempest/tests/shell/audio.test.ts` (EXTENDED) — `segment_tick.wav` manifest
  load (R2 base + custom base) and the `main.ts` `'segment-cross' → segmentTick`
  event-pump wiring (source-level regex, same idiom as the 6-6 enemy-fire test).

**Tests Written:** 11 new (8 core + 3 shell) covering AC-1 (segment_tick event +
SFX) and AC-3 (reuse 6-6 asset, core change limited to the new emission).
**Status:** RED — 8 failing (the ones that require the new event/wiring). The 3
core "absence" tests (idle / sub-segment / dead-Claw → no tick) pass already and
stand as regression guards against over-emission once GREEN.

### Contract handed to Dev (Walter)

The tests pin this exact API — implement to match:

1. **New event** in `src/core/events.ts`:
   `interface SegmentCrossEvent { type: 'segment-cross'; lane: number }` — add it
   to the `GameEvent` union. `lane` = the NEW discrete lane the cursor entered.
2. **Emit it** from `stepPlayer` in `src/core/sim.ts`: capture
   `currentLane(s.tube, s.player.lane)` BEFORE the move, compare to AFTER; if it
   changed, `s.events.push({ type: 'segment-cross', lane: <new lane> })`. This is
   the ONLY src/core change AC-3 authorises. (stepPlayer runs in `playing` and
   `warp` — both are fine; the tests isolate `playing`.)
3. **Manifest** in `src/shell/audio.ts`: add `segmentTick: 'segment_tick.wav'` to
   `SOUNDS` (★ authentic ROM $cc39, already on R2).
4. **Event pump** in `src/main.ts`: add `case 'segment-cross': audio.play('segmentTick'); break`.

### AC-2 — countdown_beep: DEFERRED

Confirmed the clone has **no level-select countdown timer** (`SelectState` =
`{ selectedLevel }`; `select` mode only steps the level on spin). Per AC-2's own
fallback clause, the `countdown_beep` half is deferred — not wired, not tested —
with the reason logged under Design Deviations and Delivery Findings. Dev should
NOT invent a select-screen timer. The baked `countdown_beep.wav` stays on R2 for
a future select-timer story.

**Rule Coverage:** No `.pennyfarthing/gates/lang-review/typescript.md` checklist
present for this repo; test design follows the established core-event + shell-
wiring patterns (sim.events.test.ts, audio.test.ts) and the CLAUDE.md hard
boundary (core stays pure — the SFX play happens only in the shell pump).
**Self-check:** 0 vacuous tests. The two count-based tests guard vacuity
(`lanesChanged > 0`, `a.length > 0`) before asserting equality.

**Handoff:** To Dev (Walter) for GREEN implementation.

---
## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `tempest/src/core/events.ts` — new `SegmentCrossEvent` (`{ type: 'segment-cross'; lane: number }`), added to the `GameEvent` union.
- `tempest/src/core/sim.ts` — `stepPlayer` now captures the resolved discrete lane before/after the spin and pushes `segment-cross` when it changes (one tick per tube-segment crossed). This is the ONLY `src/core` change (AC-3).
- `tempest/src/shell/audio.ts` — added `segmentTick: 'segment_tick.wav'` to `SOUNDS` (★ authentic ROM $cc39, reused from 6-6 on R2 — no new audio).
- `tempest/src/main.ts` — event-pump `case 'segment-cross': audio.play('segmentTick')`, mirroring the 6-6 enemy-fire wiring.
- `tempest/tests/core/events.test.ts` — extended the 5-1 exhaustiveness contract to admit the new variant (see Design Deviations → Dev).

**Tests:** 433/433 passing (GREEN). `npm run build` (`tsc --noEmit && vite build`) clean, exit 0.
**Branch:** `feat/6-10-wire-segment-tick-countdown-beep-sfx` (pushed to origin).

**AC coverage:**
- **AC-1 ✅** — deterministic `segment-cross` core event on lane crossing; shell plays the authentic `segment_tick` on it. Covered by `sim.segment-tick.test.ts` (8 tests) + `audio.test.ts` wiring (3).
- **AC-2 ⏸ DEFERRED** — no level-select countdown timer exists in the clone, so `countdown_beep` has no trigger; scoped out with documented reason (TEA + Dev deviations, Delivery Findings).
- **AC-3 ✅** — reused the 6-6 R2 asset (no invented audio); the `src/core` change is limited to the new emission; all pre-existing tests stay green.

**Self-review:** Core stays pure — the emission is data only (no DOM/time/random); the SFX `play()` happens solely in the shell pump (CLAUDE.md hard boundary intact, enforced by the boundary-guard tests in `events.test.ts`). Wired end-to-end: core event → manifest → main.ts pump. No debug residue.

**Handoff:** To Reviewer (The Big Lebowski) for code review.

---
## Subagent Results

Toggles (`workflow.reviewer_subagents`): preflight, test_analyzer, security, rule_checker = on;
edge_hunter, silent_failure_hunter, comment_analyzer, type_design, simplifier = off.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | findings | 433/433 GREEN, build clean, 0 smells; noted stale cast | N/A blocking from preflight; cast corroborates #4/#9 |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 4 (1 high cast×2 sites, 2 low) | confirmed 1 (cast → blocking rework); deferred 2 (warp test, large-spin) non-blocking |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | findings | 1 (NaN-spin, low) | downgraded to non-blocking: pre-existing + unreachable from shell input (rationale below); boundary rules all PASS |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 3 (cast #1/#8 high; main.ts #3 pre-existing) | confirmed 1 (cast); noted 1 pre-existing (main.ts switch default) |

**All received:** Yes (4 ran, 5 disabled via settings)
**Total findings:** 1 confirmed (stale double-cast) — FIXED INLINE during review (commit `f5206d3`); 4 non-blocking (warp test gap, large-spin contract, NaN-spin guard, main.ts switch default). Zero Critical/High *correctness/security* findings; zero remaining blockers.

---
## Reviewer Assessment

**Verdict:** APPROVED (the one blocking finding was fixed inline during review — see below)

The implementation in `src/` is genuinely clean: pure, deterministic, honors the CLAUDE.md hard
architectural boundary, all 433 tests green, `tsc`/`vite` build clean. The single blocking finding
was a confirmed, freshly-introduced documented-rule violation in this story's own new test file —
not a feature defect.

**The blocking finding (now RESOLVED inline):** The `as unknown as` double-cast was a confirmed
violation of TS lang-review rules #1 (double-cast bypass) and #8 (casts in tests), flagged
independently by the test-analyzer (high), the rule-checker (high), and preflight, and matched by my
own read. It was **created by this very commit** (the GREEN transition put `SegmentCrossEvent` in the
union, rendering the cast vestigial) and shipped a now-false "needed pre-GREEN" comment. Per
product-owner direction to fix simple type issues inline rather than bounce a full rework cycle, I
replaced both sites (`segmentCrosses()` helper + `run()` closure) with an `e is SegmentCrossEvent`
type predicate (matching the sibling `eventsOfType<>` idiom) and removed the stale comment.
Re-verified GREEN: 433/433 tests pass, `tsc --noEmit && vite build` clean. Commit `f5206d3`.

### Severity Table
| Severity | Issue | Location | Resolution |
|----------|-------|----------|------------|
| [MEDIUM] → RESOLVED | Stale `as unknown as { type: string; lane: number }[]` double-cast (rules #1/#8); vestigial post-GREEN, with a false "pre-GREEN" comment | `tests/core/sim.segment-tick.test.ts` `segmentCrosses()` + `run()` | FIXED INLINE in commit `f5206d3` — both sites now use `s.events.filter((e): e is SegmentCrossEvent => e.type === 'segment-cross')`; stale comment removed; 433/433 green, build clean. |

No remaining Critical/High/Medium blocking issues. The four non-blocking findings (warp-mode test
gap, large-spin one-tick contract, NaN-spin guard, `main.ts` switch default) are logged for optional
follow-up.

### Observations (no rubber-stamping — 8+)
1. [VERIFIED] Core purity intact — `sim.ts` stepPlayer change calls only `currentLane`/`wrapLane` (core `./geometry`) and pushes a plain data object; no DOM/time/`Math.random`/shell import. Evidence: `src/core/sim.ts:75-82`; cross-checked by the boundary-guard scan in `events.test.ts:126-147` and rule-checker check A1 (0 violations).
2. [VERIFIED] Determinism — the emission depends only on `currentLane(before)` vs `currentLane(after)`, both pure; no RNG/dt. The determinism test (`sim.segment-tick.test.ts` "identical seed + input → identical stream") confirms. Evidence: `src/core/sim.ts:76-81`.
3. [VERIFIED] Event contract correctly extended — `SegmentCrossEvent` added to the `GameEvent` union AND the exhaustive `discriminant()` canary updated (`events.test.ts:58`); rule-checker A2 confirms `fx.ts` (if-check, not switch) and `loop.ts` (opaque array) correctly need no change. Evidence: `src/core/events.ts:79-100`.
4. [TEST] CONFIRMED → RESOLVED inline — stale double-cast in `segmentCrosses()`/`run()`. See severity table; fixed in `f5206d3`. Source: test-analyzer (high) + rule-checker (high).
5. [RULE] CONFIRMED → RESOLVED inline — same cast violated lang-review #1 and #8. Source: rule-checker. Not dismissed; fixed inline per product-owner direction.
6. [TEST] NON-BLOCKING — no `warp`-mode crossing test, though `stepPlayer` runs in `warp` (`sim.ts:550`). Recorded as a non-blocking Improvement; correct behavior, just uncovered.
7. [SEC] NON-BLOCKING — `stepPlayer` lacks `Number.isFinite(input.spin)` (vs `select` mode's 5-9 guard); a non-finite spin would poison `player.lane` and now emit a spurious tick. Pre-existing; unreachable — `input.spin = spinAccum (deltaY*0.01) + keySpin(-1..1)`, always finite (`shell/input.ts:23,75,83`). Downgraded to non-blocking, not dismissed.
8. [RULE] NON-BLOCKING — `main.ts` `switch(event.type)` has no `default: never`. Pre-existing; the `events.test.ts` `discriminant()` canary already protects union exhaustiveness at compile time. Recorded for a future cleanup.
9. [DOC] (self, comment-analyzer disabled) — the `sim.segment-tick.test.ts` header comment claiming the cast is "needed pre-GREEN" is now FALSE post-GREEN; must be removed with the cast (folded into the rework). Other new comments (events.ts, sim.ts, audio.ts, main.ts) are accurate.
10. [TYPE] (self, type_design disabled) — `SegmentCrossEvent { type: 'segment-cross'; lane: number }` is a proper discriminated-union member with a literal discriminant and a typed payload; consistent with the other nine variants. No stringly-typed API. VERIFIED `src/core/events.ts:79-82`.
11. [SIMPLE] (self, simplifier disabled) — the stepPlayer change is minimal (2 locals + 1 guarded push); no over-engineering, no dead code. The only redundancy is the test cast (finding #4).
12. [EDGE]/[SILENT] (self, both disabled) — edge: wrap-seam (0↔15) is covered and correct; sub-segment silence covered; dead-Claw silence covered. Silent-failure: `audio.play` no-ops if the sample isn't loaded (documented, intentional) — appropriate for a non-critical SFX; not a swallowed error.

### Rule Compliance (TypeScript lang-review, exhaustive over the diff)
- **#1 Type-safety escapes** — VIOLATION: `as unknown as` in `sim.segment-tick.test.ts` (×2 sites). All `src/` files: compliant (no casts). The `(e as { type: string })` upcast is a safe widening, not a bypass.
- **#2 Generics/interfaces** — PASS. `SegmentCrossEvent` is a specific interface; `fx.ts` params keep `readonly`.
- **#3 Enum/exhaustiveness** — `discriminant()` switch compliant (has `default: never`, updated). `main.ts` switch: no `default: never` (pre-existing, non-blocking, mitigated by the canary).
- **#4 Null/undefined** — PASS. Every `crosses[0]` access is guarded by a preceding `toHaveLength(1)`.
- **#5 Module/declaration** — PASS. `import type` used for type-only imports; runtime imports are values.
- **#6 React/JSX** — N/A (no JSX).
- **#7 Async** — PASS. New code is synchronous.
- **#8 Test quality** — VIOLATION: same cast (see #1). All other tests have meaningful, non-vacuous assertions (the two count tests guard with `>0` before equality).
- **#9 Build/config** — PASS. No config changes.
- **#10 Input validation** — PASS. `segment-cross` originates from pure core state, not external input.
- **#11 Error handling** — PASS. No new error paths; audio swallow is pre-existing + documented.
- **#12 Performance/bundle** — PASS. One extra R2 fetch (asset already hosted); no barrel imports.
- **#13 Fix regressions** — PASS. No fixes applied yet; the GREEN diff introduces no new bug classes.
- **Core boundary (CLAUDE.md)** — PASS (exhaustive: A1, 8 instances, 0 violations).

### Devil's Advocate
Argue the code is broken. First attack: the segment tick is keyed off `Math.round(laneFloat)`, so a
fast flick of the spinner that, in one 60 Hz frame, advances the cursor across two or three segment
boundaries fires exactly ONE tick instead of two or three — the player hears a single click while the
Claw visibly jumps two lanes, breaking the authentic per-segment audio cadence the story is chasing.
Is that reachable? `input.spin = spinAccum + keySpin`, and `spinAccum` is `Σ deltaY*0.01` over a
frame; a violent wheel spin can push `deltaY` into the hundreds, and at `SPIN_SENSITIVITY=0.15` you
need only ~7 spin units (≈700 accumulated deltaY in 16 ms) to skip a lane. Unlikely on a mouse wheel,
but a high-resolution trackpad or a kinetic-scroll device can emit large deltas. So the "one tick per
frame" contract is a real, if rare, fidelity gap — captured as non-blocking finding #6/Question, not
invented. Second attack: NaN poisoning. If any caller hands `stepPlayer` a non-finite spin, `after`
becomes `NaN`, `NaN !== before` is `true`, and the engine emits `{ lane: NaN }` every frame forever
while the Claw silently drops out of all lane-based collision checks — a soft soft-lock with a
stuck buzzing tick. The only thing saving us is that the production input controller can't produce a
non-finite spin; the core itself has no guard (finding #7). Third attack: a confused maintainer reads
the `sim.segment-tick.test.ts` header, believes the `as unknown as` is still required "pre-GREEN,"
and copies the anti-pattern into the next event suite — the false comment is a vector for rule-rot,
which is precisely why I'm rejecting to delete it now. Fourth: does the tick fire during `warp`?
Yes (stepPlayer runs there) and nothing tests it; a future refactor that gates rotation behind
`mode==='playing'` would silently kill warp-rotation ticks with no failing test. None of these are
Critical/High correctness defects in the shipped behavior, but the third directly justifies the
rework, and the rest are logged so they don't vanish.

**Dispatch tags present:** [EDGE] [SILENT] [TEST] [DOC] [TYPE] [SEC] [SIMPLE] [RULE].

**Handoff:** To SM (The Dude) for finish — the one blocking finding was fixed inline (commit
`f5206d3`), all checks green. The four non-blocking findings are logged for optional follow-up.