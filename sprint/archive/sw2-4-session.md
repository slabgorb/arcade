---
story_id: "sw2-4"
jira_key: ""
epic: "sw2"
workflow: "tdd"
---
# Story sw2-4: Exhaust-port outcome feedback — Death Star explosion on hit, clear miss indication

## Story Details
- **ID:** sw2-4
- **Jira Key:** (none — local sprint tracking)
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/sw2-4-exhaust-port-outcome-feedback
- **Repo:** star-wars
- **Branch Strategy:** gitflow (feat/sw2-4-exhaust-port-outcome-feedback)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-08T13:40:09Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-08T12:32:00Z | 2026-07-08T12:34:10Z | 2m 10s |
| red | 2026-07-08T12:34:10Z | 2026-07-08T12:45:42Z | 11m 32s |
| green | 2026-07-08T12:45:42Z | 2026-07-08T12:58:15Z | 12m 33s |
| review | 2026-07-08T12:58:15Z | 2026-07-08T13:14:32Z | 16m 17s |
| red | 2026-07-08T13:14:32Z | 2026-07-08T13:27:03Z | 12m 31s |
| green | 2026-07-08T13:27:03Z | 2026-07-08T13:28:45Z | 1m 42s |
| review | 2026-07-08T13:28:45Z | 2026-07-08T13:40:09Z | 11m 24s |
| finish | 2026-07-08T13:40:09Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): the two new `GameEvent` variants force a shell wiring change. `src/main.ts`'s event→sound pump is an exhaustive `switch (event.type)` with a `never` default (`main.ts:165`) — Dev must add `case 'death-star-destroyed'` and `case 'exhaust-port-missed'` arms or the shell won't compile. Affects `src/main.ts` (pump arms), `src/shell/render.ts` (stage the explosion at the cue's `pos` before the warp), `src/shell/audio.ts` (a distinct miss cue). *Found by TEA during test design.*
- **Improvement** (non-blocking): the inherited sw2-1/sw2-2 port-tunneling finding did **not** reproduce. The real-fired-at-`PROJECTILE_SPEED` dead-centre torpedo already detonates the port at 60fps today (only the missing `death-star-destroyed` event makes that test red) — unlike the 90u fireball speck, the 120u port sphere is wide enough to catch the ~91 u/frame closing shot. RED does not force a `PORT_HIT_RADIUS` change; the real-fired hit test stands as a regression guard. Dev should NOT speculatively widen the radius / add swept collision unless a concrete failing case appears. Affects `src/core/state.ts` (`PORT_HIT_RADIUS`, leave as-is). *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): the shell outcome visuals (`drawDeathStarBoom` explosion burst + "DEATH STAR DESTROYED" / "EXHAUST PORT MISSED" banners) are eyeball/run-verified per the project convention — no automated coverage. A live playtest should confirm the blast timing/scale, banner legibility, and that the boom reads well across the warp into space. Natural fit for the backlog's `sw2-7` (live playtest verification pass). Affects `src/shell/render.ts`. *Found by Dev during implementation.*
- **Improvement** (non-blocking): audio reuses existing samples — `death-star-destroyed` → `enemyDeath` (explosion), `exhaust-port-missed` → `playerDeath` — the same no-new-asset pattern as `fireball-destroyed`/`force-bonus`. A bespoke Death-Star boom and a dedicated miss tone would sharpen the beat; they can swap into `src/shell/audio.ts` `SOUNDS` + the pump arms without touching the core. Affects `src/shell/audio.ts`, `src/main.ts`. *Found by Dev during implementation.*
- **Improvement** (non-blocking): `death-star-destroyed` carries a world-space `pos` that the current screen-space explosion does not consume (it is emitted for the event contract + future stereo panning / a positioned effect). Not a defect — noted so a reviewer doesn't read the unused payload as dead data. Affects `src/core/events.ts`, `src/shell/render.ts`. *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (blocking): the two new `GameState` timestamps that carry the story's visible payoff across the warp have no test coverage; a dropped `clearRun` re-stamp or broken `enterPhase` reset would ship silently. Affects `star-wars/tests/core/exhaust-port-outcome.test.ts` (add `force-bonus.test.ts`-style lifecycle assertions on `deathStarDestroyedAt`/`exhaustPortMissedAt`, incl. surviving `phase === 'space'`). *Found by Reviewer during code review.*
- **Gap** (blocking): a tautological assertion (`miss?.type` vs `terrain-crash`) and a same-frame hit-vs-cockpit race are unpinned. Affects `star-wars/tests/core/exhaust-port-outcome.test.ts:211,220` (fix assertion; add the race test at sim.ts:507-558). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): test fixtures hardcode geometry (`800`, `-300`, `-1500`) instead of referencing `PORT_HIT_RADIUS`/`TRENCH_SCROLL_SPEED` per project convention; and `tests/shell/audio.test.ts:264`'s pump enumeration is stale for the new (and 3 pre-existing) audio-bearing events. Affects `star-wars/tests/core/exhaust-port-outcome.test.ts`, `star-wars/tests/shell/audio.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking, re-review): the "survives the warp" test shares its setup with the preceding stamp test and `toBe(s1.t)` already implies non-null, so it is largely subsumed. A stronger, independent form steps one frame INTO the space phase and re-checks the stamp persists there (what the banner actually reads over ~2.5s). Affects `star-wars/tests/core/exhaust-port-outcome.test.ts:275-284`. *Found by Reviewer during code review (round-trip 1 re-review).*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Miss defined as the port reaching the cockpit un-destroyed (not per-shot / per-firing-window)**
  - Spec source: context-story-sw2-4.md, "Technical Approach" — clear miss indication
  - Spec text: "decide what 'miss' means (port passes the firing window un-hit, and/or reaches the cockpit) and emit a distinct cue"
  - Implementation: tests pin the miss cue (`exhaust-port-missed`) to fire ONLY when the port reaches the cockpit un-destroyed; a single errant bolt mid-flight explicitly emits NO miss cue (a negative test guards this).
  - Rationale: a miss is the run being LOST, not any wide shot — the player can keep firing while the port still runs. One unambiguous "you missed" moment reads clearly; a per-errant-shot cue would be noisy and undefined ("firing window" has no ROM-pinned bound).
  - Severity: minor
  - Forward impact: if a future story wants an in-flight "shot went wide" tell, it is additive — a separate cue, not a redefinition of this one.
- **Real-speed tunneling test is a regression guard, not a red driver (no PORT_HIT_RADIUS change forced)**
  - Spec source: context-story-sw2-4.md, INHERITED FINDINGS #1/#3
  - Spec text: "addressing the port tunneling via a WYSIWYG radius and/or swept collision per findings #1–#3"
  - Implementation: the real-fired hit test asserts the dead-centre torpedo detonates, but it PASSES against today's code — no failing test forces a radius/swept-collision change, because tunneling does not reproduce at the port's 120u geometry.
  - Rationale: honest RED — the fireball's tunneling came from a 90u speck; the port's 120u sphere already catches the real-speed shot. Writing a failing tunneling test would require fabricating a geometry the game never presents. Kept as a guard so a later radius shrink can't silently reintroduce the gap.
  - Severity: minor
  - Forward impact: scope narrows to the event feedback; the radius work in findings #1/#3 is descoped unless a concrete failing case surfaces (recorded as a Delivery Finding for Dev).

### Dev (implementation)
- **Added two core presentation timestamps (`deathStarDestroyedAt`, `exhaustPortMissedAt`) not required by any test**
  - Spec source: context-story-sw2-4.md, "Problem" — Death Star does not visibly explode / no clear miss indication
  - Spec text: "on a hit the Death Star does not visibly explode … on a miss there is no clear 'you missed' indication"
  - Implementation: the TEA tests only cover the two GameEvent emissions; to make the outcome VISIBLE across the same-frame warp to space, I added two `number | null` sim stamps mirroring the existing `forceBonusAwardedAt` exactly (reset in `enterPhase`, `deathStarDestroyedAt` re-stamped in `clearRun`), and drove the render banners + explosion burst off them.
  - Rationale: the story (highest authority) asks for a VISIBLE explosion + clear miss tell; an event alone is invisible because the hit warps to space the same frame. The codebase's accepted idiom for a cross-warp visual is a core timestamp the shell reads (`forceBonusAwardedAt` is the direct precedent) — core owns WHEN (deterministic), shell owns HOW. Not new abstraction, an existing pattern.
  - Severity: minor
  - Forward impact: none — additive optional fields, defaulted null, carried by every existing `{ ...initialState() }` / `enterPhase` construction; no sibling story depends on them.
- **Death-Star explosion is rendered SCREEN-SPACE (centred), not world-anchored at the event's `pos`**
  - Spec source: session TEA Assessment, "Directed at Dev" item 3
  - Spec text: "stage the explosion in render.ts at the cue's pos before the warp"
  - Implementation: `drawDeathStarBoom` is a centred, screen-space burst (expanding rings + starburst) gated by `deathStarDestroyedAt`; it does not project the event's world `pos`.
  - Rationale: `clearRun` warps to the space phase the SAME frame the port dies — the trench, the port, and the skimming trench camera are all gone by the next render, so a world-anchored effect at the port's old position would either vanish instantly or project into empty space under the new space-phase camera. A screen-space blast reads correctly through the warp. The `pos` payload is still emitted (tested; useful for stereo panning / a future world-anchored effect).
  - Severity: minor
  - Forward impact: none — the event contract is unchanged; a later story can consume `pos` for a positioned effect if the warp timing is ever decoupled.

### Reviewer (audit)
- **TEA: Miss = port reaching the cockpit un-destroyed** → ✓ ACCEPTED by Reviewer: sound scoping; "run lost" is the one unambiguous miss beat, and the negative test (an errant bolt is not a miss) pins it. Agrees with author reasoning.
- **TEA: Real-speed tunneling test is a regression guard, not a red driver** → ✓ ACCEPTED by Reviewer: independently verified — the test-analyzer hand-derived the geometry (dead-centre bolt inside `PORT_HIT_RADIUS` only for frames ~16–18) and confirms it genuinely exercises 60fps flight and would fail on a stale-position/frame-skip regression. Correct call not to fabricate a tunneling geometry the game never presents.
- **Dev: Added core presentation timestamps (`deathStarDestroyedAt`/`exhaustPortMissedAt`)** → ✓ ACCEPTED by Reviewer: mirrors the accepted `forceBonusAwardedAt` idiom exactly (core owns WHEN, shell owns HOW); boundary intact, deterministic (`t`, not wall-clock). **BUT** — acceptance of the pattern does not excuse the total absence of tests for these fields (see Reviewer Assessment finding R1); the very precedent cited (`forceBonusAwardedAt`) IS directly tested in force-bonus.test.ts, and these are not.
- **Dev: Explosion rendered SCREEN-SPACE, not world-anchored at `pos`** → ✓ ACCEPTED by Reviewer: the same-frame `clearRun` warp destroys the trench camera, so a world-anchored effect would project into empty space under the new space camera — screen-space is the correct read. Consequence noted: the emitted `pos` is now unconsumed by the shell (finding R8, low).

## Sm Assessment

**Story:** sw2-4 — Exhaust-port outcome feedback. p1, 3pts, tdd, repo `star-wars` (base `develop`). Playtest-driven: the climactic torpedo-into-the-port beat currently has no payoff — no Death Star explosion on a hit, no distinct "you missed" on a miss.

**Diagnosis:** Clean setup. Curated context at `sprint/context/context-story-sw2-4.md` survived the sm-setup regen intact (verified — the sw2-1/sw2-2 inherited findings are all present). No dependencies, no blockers. This is a core-sim + shell-presentation story with a well-mapped surface.

**Directed at TEA (Furiosa) for RED — three test fronts, all in the context:**
1. **Outcome events.** New positioned GameEvent variant(s) in `core/events.ts` mirroring the existing `enemy-death` / `fireball-destroyed` cues: a Death-Star-destroyed cue emitted from the port-hit branch (`sim.ts` ~495-514) **before** `clearRun`, and a distinct port-miss cue separate from the generic `terrain-crash`. Core emits the event; shell owns visual/audio — keep the pure-core boundary.
2. **Real-fired-bolt tests (inherited finding #2, non-negotiable).** Existing port tests hand-place unit-velocity bolts on tiny ticks — none fire at real `PROJECTILE_SPEED` (5000, ~83 u/frame) at 60fps. Add a real-fired **hit** test (torpedo straight at the port → detonates) AND a real-fired **miss** test (torpedo aimed wide → does NOT detonate). The negative case is the exact gap sw2-2's review flagged.
3. **Tunneling decision (findings #1/#3).** `PORT_HIT_RADIUS = 120` gives a dead-centre torpedo only ~2-3 frames inside the sphere. First check WYSIWYG (does the port render larger than 120u? — sw2-2's precedent was widening the radius to match the drawn size, the simpler faithful fix). Only reach for swept/segment collision if WYSIWYG doesn't cover it.

**Out of scope (hold the line):** the general trench-obstacle swept fix (finding #4), space-phase mechanics, unrelated port geometry.

**Routing:** phased tdd → handing off to **tea** for RED. Next after green: reviewer, then finish.

---
## TEA Assessment

**Tests Required:** Yes
**Reason:** n/a — 3-pt feature adding observable core behaviour (two new outcome events + real-speed collision guarantees).

**Test Files:**
- `star-wars/tests/core/exhaust-port-outcome.test.ts` (NEW) — the sw2-4 contract: the hit emits a positioned `death-star-destroyed` cue *before* `level-clear`; the existing payoff (clear + bonus + speech) is preserved; a real torpedo at `PROJECTILE_SPEED`/60fps detonates a dead-centre port and a wide shot does not; the port reaching the cockpit un-destroyed emits a distinct `exhaust-port-missed` cue; purity + determinism hold.
- `star-wars/tests/core/events.test.ts` (EXTENDED) — the canonical `GameEvent` union contract grown 11 → 13 variants (added the two sw2-4 fixtures, two `discriminant` arms, bumped the count/Set) so the union stays complete and the exhaustiveness `never`-check covers the new cues.

**Tests Written:** 13 in the new file (5 assert the missing behaviour → RED; 8 are green guards for the surrounding contract), + the events.ts union extension. Covering 4 AC fronts (explosion cue & ordering, preserved payoff, real-speed hit/miss, distinct miss cue).
**Status:** RED confirmed — `1 failed | 49 passed` files, `5 failed | 547 passed` tests. All 5 failures are in `exhaust-port-outcome.test.ts`, each because `death-star-destroyed` / `exhaust-port-missed` are not yet emitted. Zero regressions elsewhere; `events.test.ts` fully green (13-type contract passes at runtime). Run id `sw2-4-tea-red`.

### Rule Coverage

| Rule (typescript.md) | Test(s) | Status |
|------|---------|--------|
| #3 union exhaustiveness (`never` default) | `events.test.ts` `discriminant()` never-check + "covers thirteen distinct types" | green (contract) |
| #1 type-safety escapes (no `as any`/ts-ignore) | `events.test.ts` "uses no type-safety escapes" scans `events.ts` | green (guards new variants) |
| #8 test quality (meaningful assertions) | self-check below — every new test asserts a concrete value/ordering | pass |
| Pure-core boundary (project rule #1) | `events.test.ts` FORBIDDEN-token scan over `sim.ts`/`events.ts`/`state.ts` + new purity test | green (covers the new emissions) |
| #2/#4 positioned-event payload shape | new file "carries the port position" (pos is a length-3 Vec3, downrange) | RED |

**Rules checked:** 5 of 5 applicable TypeScript/boundary rules have test coverage (the file is enums/events, not React/async/IO, so those checks are n/a).
**Self-check:** 0 vacuous tests — no `let _ =`, no `assert(true)`, no `is_none()`-on-always-null. The hit/miss `.some(...)` and `findIndex(...)` assertions check the actual event presence and ORDERING, not just definedness.

### Directed at Dev (The Word Burgers) for GREEN
1. **Add two variants to `src/core/events.ts`**: `DeathStarDestroyedEvent { type: 'death-star-destroyed'; pos: Vec3 }` (positioned, mirror `FireballDestroyedEvent`) and `ExhaustPortMissedEvent { type: 'exhaust-port-missed' }` (positionless, mirror `TerrainCrashEvent`); add both to the `GameEvent` union.
2. **Emit in `stepTrench` (`src/core/sim.ts`)**: push `death-star-destroyed` (carrying the scrolled `port` position) in the port-hit branch **before** the `level-clear` push (~line 522); push `exhaust-port-missed` in the port-reaches-cockpit branch (~line 536), alongside/near the existing `terrain-crash`.
3. **Wire the shell** (compile-time forced by the `never` default at `main.ts:165`): add pump arms; stage the explosion in `render.ts` at the cue `pos` before the warp; add a distinct miss cue in `audio.ts`. Presentation is eyeball/run-verified per the project convention.
4. **Do NOT widen `PORT_HIT_RADIUS`** — see Delivery Findings: tunneling does not reproduce; the real-fired test already passes as a guard. Keep the fix to the event feedback.

**Handoff:** To Dev (The Word Burgers) for GREEN.

---
## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `star-wars/src/core/events.ts` — added `DeathStarDestroyedEvent { type: 'death-star-destroyed'; pos: Vec3 }` (positioned, mirrors `FireballDestroyedEvent`) and `ExhaustPortMissedEvent { type: 'exhaust-port-missed' }` (positionless, mirrors `TerrainCrashEvent`); both added to the `GameEvent` union.
- `star-wars/src/core/sim.ts` — `stepTrench` now emits `death-star-destroyed` (carrying the scrolled port `pos`) **before** `level-clear` in the hit branch, and `exhaust-port-missed` in the port-reaches-cockpit branch; stamps `deathStarDestroyedAt`/`exhaustPortMissedAt`; `enterPhase` resets both; `clearRun` re-stamps `deathStarDestroyedAt` so the explosion beat survives the warp.
- `star-wars/src/core/state.ts` — added `deathStarDestroyedAt` + `exhaustPortMissedAt` (`number | null`) to `GameState` + `initialState` (mirroring `forceBonusAwardedAt`).
- `star-wars/src/main.ts` — event→sound pump arms: boom → `enemyDeath`, miss → `playerDeath` (distinct from the co-emitted `terrain-crash`).
- `star-wars/src/shell/render.ts` — `drawDeathStarBoom` screen-space explosion burst (expanding rings + starburst) gated by `deathStarDestroyedAt`; "DEATH STAR DESTROYED" and "EXHAUST PORT MISSED" banners in `drawTrenchBanners`.
- **`PORT_HIT_RADIUS` left untouched** — per TEA's finding, tunneling does not reproduce.

**Tests:** 552/552 passing (GREEN) — run id `sw2-4-dev-green`. The 5 sw2-4 RED tests are now green; zero regressions. `npm run lint` (`tsc --noEmit`) exits 0 — the discriminated-union `never` guards in `main.ts` and `events.test.ts` are satisfied.

**Self-review:**
- [x] Wired to the front end — both events drive audio (pump) and visuals (render banners + boom).
- [x] Follows project patterns — the timestamp→banner idiom mirrors `forceBonusAwardedAt`; pure core/shell boundary intact (core emits DATA, shell renders).
- [x] ACs met — hit emits a positioned explosion cue before the warp + visible boom/banner; miss emits a distinct cue + banner; real-fired hit/miss guards green.
- [x] Error handling — n/a (deterministic pure sim; audio degrades silently by existing design).

**Deviations:** 2 logged (core presentation timestamps added beyond test scope; explosion rendered screen-space not world-anchored). **Findings:** 3 logged (visuals playtest-pending; reused audio samples; unused `pos` payload — all non-blocking).

**Branch:** `feat/sw2-4-exhaust-port-outcome-feedback` (pushed).

**Handoff:** To Reviewer (Immortan Joe) for review.

---
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 552/552 tests, tsc clean, 0 smells | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 8 | confirmed 6, dismissed 0, deferred 2 (downgraded to low/comment) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 1 (rule #8) | confirmed 1 (downgraded to low) |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled)
**Total findings:** 8 confirmed (2 blocking-severity), 0 dismissed, 2 deferred/low

### Rule Compliance (TypeScript lang-review + CLAUDE.md boundary)

Exhaustive enumeration against the changed surface:
- **#1 type-safety escapes** — COMPLIANT. Only escape is `[...port] as Vec3` (sim.ts:522), a tuple-narrowing cast identical to 6 pre-existing sites; no `as any`/ts-ignore anywhere. Corroborated by security + rule-checker.
- **#2 generic/interface pitfalls** — COMPLIANT. `pos: Vec3` (readonly tuple) matches every other positioned event; `number | null` fields, no `Record<string,any>`/`object`/`Function`.
- **#3 union exhaustiveness** — COMPLIANT. Both new members added to `GameEvent`; the two exhaustive switches (main.ts pump, events.test.ts `discriminant()`) each handle both, `never` guards still compile (tsc clean proves it). This is the only rule with a `never`-guard dependency and it holds.
- **#4 null/undefined** — COMPLIANT. All three reads of the new fields use strict `!== null` (render.ts:309, 712, 720), correctly surviving a stamp value of `0`; no `||`-on-nullable.
- **#8 test quality** — **VIOLATIONS (see findings R1, R2, R9).** Tautological assertion, untested state-field lifecycle, and a stale pump-enumeration test.
- **Pure-core boundary (CLAUDE.md #1 rule)** — COMPLIANT. `t = state.t + dt`; no Date/Math.random/rAF/DOM/shell import in core; new fields are plain data. Security + rule-checker both confirm.
- **Determinism** — COMPLIANT at runtime (stamps are `t`, not wall-clock; all new state via object-spread, no input mutation) — but see R2: the determinism test only diffs `events`, so the fields' determinism is not actually asserted.

### Observations (tagged)

- `[MEDIUM] [TEST]` Untested state-field lifecycle — `deathStarDestroyedAt`/`exhaustPortMissedAt` are never read by any test; the warp-survival re-stamp and enterPhase reset are unprotected — tests/core/exhaust-port-outcome.test.ts (see R2). **Blocking basis.**
- `[MEDIUM] [TEST]` Tautological assertion at exhaust-port-outcome.test.ts:211 — `miss?.type` is `'exhaust-port-missed'` by construction, so `.not.toBe('terrain-crash')` can never fail (rule #8, non-dismissable). **Blocking basis.**
- `[MEDIUM] [TEST]` Same-frame hit-vs-cockpit-arrival race unpinned — sim.ts:507-558 favors the player via if/else ordering; a reorder would silently turn a last-instant save into a death (R4).
- `[LOW] [RULE]` Stale pump-enumeration test — audio.test.ts:264 "handles every audio-bearing event type" not extended for the 2 new events; already omits 3 pre-existing ones (fireball-destroyed/trench-obstacle-destroyed/force-bonus); redundant with the compile-time `never` guard (R9).
- `[VERIFIED]` Pure-core boundary intact — sim.ts:87 `t = state.t + dt`; grep confirms no Date/Math.random/rAF/DOM/shell in the core diff. Complies with CLAUDE.md hard boundary. Evidence: security + rule-checker instances_checked, and the events.test.ts FORBIDDEN-token scan (still green).
- `[VERIFIED]` Emission order boom-before-warp — sim.ts:522 (`death-star-destroyed`) precedes sim.ts:526 (`level-clear`). Matches the tested contract, though no shell consumer depends on order (R3).
- `[VERIFIED]` Render ctx-state hygiene — `drawDeathStarBoom` restores `globalAlpha=1`/`shadowBlur=0` before returning (render.ts), and the next consumers (`drawFireball`, `glowText`) set their own `strokeStyle`/`fillStyle`/`shadowBlur`. No state leak. Evidence: render.ts drawFireball sets lineWidth/strokeStyle/shadowColor/shadowBlur at entry.
- `[VERIFIED]` No banner overlap — a kill nulls `exhaustPortMissedAt` via `enterPhase`; a miss keeps `deathStarDestroyedAt` null → "DEATH STAR DESTROYED" and "EXHAUST PORT MISSED" (both at h*0.45) can never co-render. Evidence: enterPhase (sim.ts:645-646) resets both; clearRun re-stamps only deathStarDestroyedAt.

### Dispatch tag coverage
Specialist findings incorporated: [TEST] test-analyzer R1-R7; [SEC] security clean; [RULE] rule-checker R9. Disabled this run: [EDGE], [SILENT], [DOC], [TYPE], [SIMPLE] (the [TYPE] concerns are covered inline under Rule Compliance #1/#2; the [SIMPLE] unused-pos note is R8).

### Devil's Advocate

Assume this is broken. Where does it bite? The implementation is genuinely clean — pure core, exhaustive switches, correct null handling — so the attack surface is the *tests*, and that is exactly where it fails. This story exists to make the Death Star **visibly** explode and a miss **read clearly**; the entire visible payoff is carried by two new `GameState` timestamps that must (a) get stamped, (b) survive `clearRun`'s same-frame warp to space, and (c) reset on the next phase entry. A malicious refactorer — or an innocent one six months from now — deletes the `deathStarDestroyedAt: s.deathStarDestroyedAt` line from `clearRun`, or lets `enterPhase` forget to null it, and the banner either never appears after the warp or bleeds into a later wave. Nothing catches them. Every current test asserts `events`, `phase`, `wave`, `score`, `lives`, `exhaustPort` — and all of those still pass with the re-stamp gone, because the event fires on the kill frame regardless; it is the *field* that carries the beat forward, and the field is invisible to the suite. The determinism test compounds this: it diffs only the event array, so an impure or drifting timestamp would sail through. The codebase KNOWS how to test this — `force-bonus.test.ts` pins `forceBonusAwardedAt` null-on-entry / set-on-kill / null-on-non-qualifying — and this suite simply didn't. Second angle: a confused player fires the winning shot at the exact instant the port kisses the cockpit. The code favors them (hit branch returns first), a real last-millisecond save — but reorder those two `if` blocks and the save becomes a death, with no test to notice. Third: the "distinct from terrain-crash" test is theater — it asserts a value against itself. A future dev reads the green check, believes the miss cue is proven independent of the crash cue, and builds on a guarantee that was never made. Fourth: the hardcoded `800` offset silently rots the day someone tunes `PORT_HIT_RADIUS` again (it already moved 90→120). None of these is a shipping bug today. All of them are regressions this suite was supposed to prevent and does not. That is enough to send it back.

## Reviewer Assessment

**Verdict:** REJECTED

Specialist coverage incorporated: [SEC] reviewer-security clean (no impurity/escapes); [RULE] reviewer-rule-checker one rule-#8 finding (below); [TEST] reviewer-test-analyzer findings (below).

The implementation is correct and clean — I verified the pure-core boundary, union exhaustiveness, null handling, and render ctx-hygiene, and security/preflight/rule-checker corroborate. **This rejection is about the test suite, not the code.** The story's headline mechanism (the two outcome timestamps that carry the explosion/miss across the warp) has zero test coverage, and one assertion is tautological (rule #8, non-dismissable). The codebase's own precedent — `forceBonusAwardedAt`, directly tested in `force-bonus.test.ts` — sets the bar these tests must meet. Findings are testable → back to TEA for RED rework.

| # | Severity | Issue | Location | Fix Required |
|---|----------|-------|----------|--------------|
| R1 | [MEDIUM] [TEST] | Tautological assertion — `miss?.type` is `'exhaust-port-missed'` by construction, so `.not.toBe('terrain-crash')` can never fail; the "distinct cue" claim is not verified | tests/core/exhaust-port-outcome.test.ts:211 | Assert co-occurrence instead: both `exhaust-port-missed` AND `terrain-crash` present in the same frame's events |
| R2 | [HIGH] [TEST] | Core-deliverable coverage gap — `deathStarDestroyedAt`/`exhaustPortMissedAt` (the visible-payoff mechanism) are never asserted; a dropped `clearRun` re-stamp or broken `enterPhase` reset ships silently; determinism test diffs only `events` | tests/core/exhaust-port-outcome.test.ts (missing); mechanism at sim.ts clearRun/enterPhase, state.ts:380,385 | Add `force-bonus.test.ts`-style tests: fields null on fresh trench entry; `deathStarDestroyedAt === t` after a hit AND still non-null in the same state where `phase === 'space'` (survives the warp); `exhaustPortMissedAt === t` after a miss (and stays null on a hit) |
| R4 | [MEDIUM] [TEST] | Same-frame hit-vs-cockpit-arrival race unpinned — if/else ordering favors the player (hit wins); a reorder silently converts a last-instant save into a death | sim.ts:507-558 (untested) | Add a test: killing bolt AND port both within COCKPIT_HIT_RADIUS same frame → `death-star-destroyed` fires, no `exhaust-port-missed`/`terrain-crash`, `lives` unchanged |
| R5 | [MEDIUM] [TEST] | Hardcoded `800` offset not tied to `PORT_HIT_RADIUS`, against project rule + sibling convention (fireball-large-target.test.ts ties its offset to the constant); silently rots if the radius is re-tuned | tests/core/exhaust-port-outcome.test.ts:185 | Import `PORT_HIT_RADIUS`, derive the offset from it (or add a `GRAZE`-style guard assertion) |
| R6 | [MEDIUM] [TEST] | "Single errant bolt is NOT a miss" (line 220) doesn't isolate its claim — the miss branch never inspects projectiles, so the inert bolt is dead weight; the assertions pass identically with the bolt deleted | tests/core/exhaust-port-outcome.test.ts:220 | Rename to what's tested ("no miss while the port is far from the cockpit"), or construct a real live-bolt + approaching-port interaction |
| R3 | [LOW] [TEST] | Ordering test couples to `events.push` order that no consumer depends on (pump is order-insensitive; render uses the timestamp) | tests/core/exhaust-port-outcome.test.ts:129 | Drop, or re-target to the downstream contract |
| R7 | [LOW] [TEST] | Positioned `pos` checked for shape only (defined, len 3, z<0), not exact value; a plausible-but-wrong position passes | tests/core/exhaust-port-outcome.test.ts:124 | `expect(cue.pos).toEqual([0, 0, -300 + TRENCH_SCROLL_SPEED * 0.001])` |
| R9 | [LOW] [RULE] | Stale pump-enumeration test not extended for the 2 new audio-bearing events (already omits 3 pre-existing); redundant with the `never` guard but its stated purpose is exactly this | tests/shell/audio.test.ts:264 | Extend the list to include `death-star-destroyed`/`exhaust-port-missed` (ideally close the pre-existing gap too) |

**Non-blocking notes (no rework required):**
- R8 [LOW] [SIMPLE]: `death-star-destroyed.pos` is emitted but not consumed by the screen-space boom (kept for the event contract + future use; has precedent in `fireball-destroyed`). Accepted.
- R-comment [LOW]: the line-182 comment about the 45-frame budget is inaccurate (an off-axis port can never reach the cockpit regardless of frame count); fix the comment while in the file.

**Blocking basis:** R2 (HIGH — the story's core mechanism is entirely unprotected against silent regression, against a directly-tested precedent) plus R1 (rule-#8 tautological assertion, non-dismissable). R4–R6 should be addressed in the same pass.

**Handoff:** Back to TEA (Imperator Furiosa) for RED rework.

---
## TEA Assessment (rework — round-trip 1)

**Verdict addressed:** all of Immortan Joe's findings resolved in the test suite. Implementation was NOT touched — the Reviewer confirmed the code correct; every fix is test-strengthening that passes against the existing (correct) code, so the suite is now a real regression guard rather than a green rubber stamp.

**Changes (tests only):**
- **R1 (tautological → co-occurrence):** `exhaust-port-outcome.test.ts` — the miss-distinctness test now asserts `exhaust-port-missed` AND `terrain-crash` both fire on the miss frame as two distinct entries (`toHaveLength(2)`), replacing the self-comparing `miss?.type !== 'terrain-crash'`.
- **R2 (state-field lifecycle — the big one):** new `describe('the outcome timestamps drive & survive the visual beat')` — pins `deathStarDestroyedAt === s1.t` on a hit + miss-stamp null; **survives the warp** (`phase === 'space'` yet stamp non-null — the exact regression a dropped `clearRun` re-stamp would cause); `exhaustPortMissedAt === s1.t` on a miss + hit-stamp null; and `enterPhase` resets both crossing surface→trench. Mirrors `force-bonus.test.ts`.
- **R2 (determinism):** the determinism test now asserts full `a.state` deep-equality (not just `events`), catching an impure/wall-clock stamp source.
- **R4 (same-frame race):** new `describe('a killing shot on the arrival frame beats the crash')` — port inside `COCKPIT_HIT_RADIUS` AND a bolt on it → hit wins (boom fires, no miss/crash, no shield lost), pinning the player-favouring if/else precedence at sim.ts:507-558.
- **R5 (hardcoded geometry):** the wide-miss offset is now `PORT_HIT_RADIUS * 6` with a guard assertion; comment corrected (an off-axis port can never reach the cockpit, so the frame budget isn't what prevents the confound).
- **R6 (inert-bolt test):** renamed + reworked — a live off-axis stray bolt coexists with a downrange port over multiple frames, asserting the bolt stays in flight and no miss fires; honestly frames "a stray shot is not a miss."
- **R3 (ordering coupling):** the boom-before-warp ordering assertion is replaced by an order-independent co-occurrence check (both cues present on the kill frame), since no consumer depends on event array order (shell reads the timestamp).
- **R7 (exact pos):** the positioned-cue test asserts the exact `[0,0,-300 + TRENCH_SCROLL_SPEED*0.001]`, not shape-only.
- **R9 (stale pump enumeration):** `tests/shell/audio.test.ts` "handles every audio-bearing event type" extended to all 12 `audio.play` events — the two new sw2-4 cues AND the three pre-existing omissions (`fireball-destroyed`/`trench-obstacle-destroyed`/`force-bonus`).

**Status:** 557/557 passing (run id `sw2-4-tea-rework2`); `tsc --noEmit` clean. Net +5 tests vs the rejected suite. Because the code was already correct, the strengthened tests are GREEN, not RED — this rework adds regression coverage, it did not fix a behavioural bug.

**No new spec deviations.** The two prior TEA deviations stand; the R3 ordering change retires an over-tight assertion (documented above), not a spec choice.

**Handoff:** No implementation work remains (all green, boundary/security/lint clean). Returning up the workflow for re-review of the strengthened suite.

---
## Dev Assessment (rework — round-trip 1)

**Implementation Complete:** Yes — **no change required this round.**

The Reviewer's rejection was entirely about test coverage; the implementation (`events.ts`/`sim.ts`/`state.ts`/`main.ts`/`render.ts`) was confirmed correct at review and TEA's rework only strengthened the tests. I verified GREEN from the Dev seat rather than writing code — restraint is the discipline: there is no failing test to make pass, so adding or "improving" implementation now would be pure scope creep against a correct, green codebase.

**Files changed by Dev this round:** none.
**Tests:** 557/557 passing (run id `sw2-4-dev-green-rework`); `tsc --noEmit` clean.
**Working tree:** clean; branch `feat/sw2-4-exhaust-port-outcome-feedback`, 3 commits ahead of `develop` (RED tests → GREEN impl → rework tests).
**Deviations:** none new (no implementation change).
**Delivery findings:** none new during rework.

**Handoff:** To Reviewer (Immortan Joe) for re-review of the strengthened suite.

---
## Subagent Results (re-review — round-trip 1)

Scope: test-only delta (`exhaust-port-outcome.test.ts`, `audio.test.ts`); the implementation is unchanged since the round-1 clean pass and was not re-litigated.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 557/557, tsc clean, 0 smells | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 1 (low) | confirmed R1–R9 all resolved; 1 new low (subsumed test) — noted, not blocking |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none (both prior violations resolved) | N/A |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled)
**Total findings:** 1 confirmed (low, non-blocking), 0 dismissed, 0 deferred

### Rule Compliance (re-review)
Test-only delta. Rule-checker re-verified: #1 no type-safety escapes in the new test code; #3 union exhaustiveness unaffected (events.test.ts still enumerates all 13 variants with the `never` guard); #4 all 8 new stamp assertions use strict `.toBe(s1.t)`/`.toBeNull()`/`.not.toBeNull()` — correct for a legitimate `t === 0` stamp, no truthy checks; #8 the two prior violations (tautological assertion, stale pump enumeration) are RESOLVED and no new vacuous assertions were introduced. Pure-core boundary and determinism unaffected (security confirms; determinism test now compares full state — a hardening).

### Observations (tagged)
- `[VERIFIED] [TEST]` R2 timestamp lifecycle now covered — hit stamps `=== s1.t`, survives the warp (`phase==='space'` + non-null), miss stamps its field, `enterPhase` resets both crossing surface→trench. Evidence: exhaust-port-outcome.test.ts:267-311; test-analyzer hand-verified `t = state.t + dt` flows through `base.t`.
- `[VERIFIED] [TEST]` R1 tautology replaced with a real co-occurrence check (`exhaust-port-missed` AND `terrain-crash` both present, `toHaveLength(2)`) — exhaust-port-outcome.test.ts:218-232; sim.ts:540-551 pushes each once.
- `[VERIFIED] [TEST]` R4 same-frame race genuinely creates both conditions — port at z≈-39.5 is inside COCKPIT_HIT_RADIUS(80) AND within PORT_HIT_RADIUS(120) of the co-located bolt; hit wins, no shield lost. Evidence: exhaust-port-outcome.test.ts:315-329 (collision math hand-verified).
- `[VERIFIED] [RULE]` R9 pump enumeration now 1:1 with main.ts's 12 `audio.play` cases (rule-checker diffed against `grep "case '" src/main.ts`). audio.test.ts:270-283.
- `[LOW] [TEST]` The "survives the warp" test (exhaust-port-outcome.test.ts:275-284) shares its setup with the preceding test and `toBe(s1.t)` already implies non-null, so it is largely subsumed. Non-harmful (the property is real and documented); a stronger form would step one frame INTO the space phase and re-check the stamp persists. Non-blocking — logged as a Delivery Finding for a future touch.

### Devil's Advocate (re-review)
Assume the rework only *looks* fixed. Did TEA game the findings — pad assertions to green without adding real catching power? I checked each. The R2 lifecycle tests are the ones that mattered, and they are genuine: drop the `clearRun` re-stamp and `expect(s1.deathStarDestroyedAt).toBe(s1.t)` fails (null ≠ 0.001), and the survives-the-warp test fails too; break the `enterPhase` reset and the surface→trench poisoned-`999` test fails. These are real regression tripwires, not decoration. The race test is the subtlest place to cheat — a test that *claims* a same-frame race but actually stages the two conditions on different frames proves nothing. I re-derived the geometry: port at `-COCKPIT_HIT_RADIUS/2` scrolls to ≈-39.5 in the same 0.001s step, simultaneously inside the 80-unit cockpit sphere and within 120 of the on-axis bolt — both branches' predicates are true the same frame, so the if/else precedence is genuinely exercised. The exact-position assertion could hide a floating-point mismatch, but it is computed with the identical `-300 + TRENCH_SCROLL_SPEED * 0.001` expression the sim uses, and `0.5` is exact in binary — no drift. The one soft spot is the subsumed survives-the-warp test, but "redundant" is the opposite of "dangerous" — it over-covers, it does not under-cover, and its sibling already catches the regression it names. Could the strengthened suite still ship a broken *visual*? Yes — the boom/banner rendering remains eyeball-verified (Dev finding, sw2-7 playtest), but that was true and accepted at round 1 and is out of scope for the core-sim contract these tests guard. Nothing here rises above low. The rejection did its job; the response was substantive.

## Reviewer Assessment

**Verdict:** APPROVED

The round-1 rejection was answered in full. All nine findings (R1–R9) are genuinely resolved — independently verified against the collision math and the sim source, not merely restated. The timestamp lifecycle that carries the story's visible payoff is now a real regression guard (stamp value, warp survival, phase reset), the tautological assertion is gone, the same-frame hit/cockpit race is pinned, fixtures reference `PORT_HIT_RADIUS`/`TRENCH_SCROLL_SPEED`, and the audio pump enumeration is complete and 1:1 with `main.ts`. Preflight 557/557 green, `tsc` clean, security clean, rule-checker clean. The single new finding is low, non-harmful, and non-blocking.

**Data flow traced:** a killing bolt → `stepTrench` hit branch → `death-star-destroyed` event + `deathStarDestroyedAt` stamp → carried through `clearRun`'s warp → `render.ts` reads the stamp to draw the boom/banner in the space phase. Safe: the stamp is deterministic (`t`), null-guarded with strict `!== null`, and reset on phase entry.
**Pattern observed:** the `forceBonusAwardedAt` timestamp→banner idiom, correctly mirrored for the two new stamps (core owns WHEN, shell owns HOW) — state.ts, sim.ts `clearRun`/`enterPhase`, render.ts `drawTrenchBanners`.
**Error handling:** n/a — deterministic pure sim; audio degrades silently by existing design.

### Dispatch tag coverage
Specialist findings incorporated into this assessment:
- [TEST] reviewer-test-analyzer: confirmed R1/R2/R4/R6 resolved; 1 new low (subsumed survives-the-warp test), non-blocking.
- [RULE] reviewer-rule-checker: clean — both prior rule-#8 violations (tautology, stale pump enumeration) resolved; strict null-safe stamp matchers; exhaustiveness intact.
- [SEC] reviewer-security: clean — no type-safety escapes, no impurity smuggled into core; full-state determinism assertion is a hardening.
- [EDGE], [SILENT], [DOC], [TYPE], [SIMPLE]: disabled via settings this run (not spawned).

**Handoff:** To SM (The Organic Mechanic) for finish-story.

### Reviewer (audit) — re-review
No new Design Deviations were introduced by the test-strengthening rework; the round-1 audit (all four entries ACCEPTED) stands. The R3 ordering-assertion retirement is documented in the TEA rework assessment as a scope correction, not a spec deviation.