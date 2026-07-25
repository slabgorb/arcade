---
story_id: sw8-3
jira_key: sw8-3
epic: sw8
workflow: tdd
---
# Story sw8-3: Enemy-fire readability — add the lingering destroy-burst when a fireball is shot down (today silent-delete) and verify incoming-fire colour vs WSVROM/WSGUNS

## Story Details
- **ID:** sw8-3
- **Jira Key:** sw8-3
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 3
- **Priority:** p2
- **Repos:** star-wars

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-24T20:48:28Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-24T20:01:49Z | 2026-07-24T20:04:26Z | 2m 37s |
| red | 2026-07-24T20:04:26Z | 2026-07-24T20:24:56Z | 20m 30s |
| green | 2026-07-24T20:24:56Z | 2026-07-24T20:38:00Z | 13m 4s |
| review | 2026-07-24T20:38:00Z | 2026-07-24T20:48:28Z | 10m 28s |
| finish | 2026-07-24T20:48:28Z | - | - |

## Sm Assessment

**Setup verification:** Session file present with fields set (`sw8-3` / `tdd` / `star-wars`, phase `setup`); rich context-story on disk (`sprint/context/context-story-sw8-3.md`, 12KB); branch `feat/sw8-3-enemy-fire-destroy-burst` created off `origin/develop` in the star-wars subrepo. Jira explicitly skipped — star-wars is local-YAML tracking, `jira_key` is the literal story id. Merge gate clear: no open star-wars PRs.

**Dependencies:** sw8-3 sits under epic sw8 (Cabinet feel — render/experiential fidelity vs the cabinet longplay). Both prior siblings sw8-1 (moving eye) and sw8-2 (TIE feel + fire fairness) are `done` and approved, so the enemy-fire subsystem this story touches is already at its post-sw8-2 baseline. No blockers.

**Scope — two threads, RULE-then-fix per the sw8 charter:**
1. **Destroy-burst (the fix):** Today a shot-down incoming fireball is a silent-delete — it vanishes with no feedback. Add a short lingering destroy-burst at the fireball's position. Deterministic burst entity with a decaying lifetime lives in `src/core`; its drawing lives in `src/shell`. The core/shell boundary is the one hard rule — the RED phase must pin the burst's state/lifetime in core, not in the renderer.
2. **Colour verification (the ruling):** RULE the incoming-fire colour against the authentic AVG references (WSVROM / WSGUNS — the red GNB/GNT sparkle fireball) and classify it as bug / tuning / accepted-deviation before any change. This is a sw8 "rule the divergence first" item — a colour edit is only warranted if the ruling finds a genuine bug.

**Handoff:** Phased TDD workflow → RED phase. Han Solo (TEA) writes the failing tests for both threads. Emphasis for TEA: the destroy-burst is testable in `src/core` as a deterministic entity (spawns on fireball-kill, ages over frames, is filtered when expired) — pin that in core; the colour thread is a verification/ruling AC, not necessarily a code change.

## TEA Assessment

**Phase:** finish
**Tests Required:** Yes
**Reason:** Feature story — a deterministic core burst entity plus a render cue.

**Test Files:**
- `star-wars/tests/core/destroyed-shot-burst.test.ts` — the core contract (AC1/2/3/6/10): `destroyedShots` spawned at the fireball's own position on a shot-down kill, aged by `dt`, dropped past `FIREBALL_DESTROY_BURST_SECONDS`, wiped on `enterPhase`; plus purity + determinism. Mirrors the `dyingTies` pattern and the `shootable-fireballs` fixtures.
- `star-wars/tests/shell/render.destroyed-shot-burst.test.ts` — the render cue (AC4): `render()` paints the burst as red VGCRED ink from `state.destroyedShots`. Difference-based (burst vs burst-free twin) so the Death Star's red superlaser dish cancels exactly.

**Tests Written:** 13 tests (11 core + 2 render) covering AC1–AC6, AC10 across both threads.
**Status:** RED confirmed by testing-runner (RUN_ID `sw8-3-tea-red`): 12 fail on **assertions** (10 core + 2 render), 1 core control passes (no-kill ⇒ no burst). Both files collect cleanly (no import/transform crash). The 1806-test baseline is unaffected — zero regressions. The render diffs fail as `expected 17 to be greater than 17`, which confirms the difference design: ~17 red segments near centre are the Death Star dish, identical in both frames — an absolute `=== 0` control would have been a false failure.

**Thread 2 (fireball colour, AC7/AC8) — RULED, no new test.** WSVROM.MAC GNB0-3 (base sparkle) each open `COLOR VGCRED,0FF` (`VGCRED==4 ;RED`, WSVROM.MAC:54; bodies at :487/528/569/610); GNT0-3 (tip fuseball) carry no COLOR opcode so they inherit VGCRED. The alien gun shot is unconditionally RED, **no hue cycling by age/distance**. Our `FIREBALL_GLOW = '#ff3b30'` (render.ts:116) is ROM-authentic — a documented ruling, not a code fix — and is ALREADY enforced by the existing `tests/shell/render.enemy-fireball.test.ts` ("draws the body in RED (VGCRED)"). GREEN adds a WSVROM citation comment near `FIREBALL_GLOW`; no constant change, and no new colour test (a green pin would be vacuous/redundant).

### Rule Coverage

| Rule (TS lang-review / project) | Test(s) | Status |
|---|---|---|
| Core/shell purity (project's hard rule) — burst STATE in core, geometry/colour in shell | `does not mutate the input state…`, `identical seeds…yield identical states`, render suite draws only from `state.destroyedShots` | failing (RED) |
| Determinism (no Date/Math.random; `dt`-only) | `identical seeds and inputs yield identical states through a fireball kill` | failing (RED) |
| Named-constant convention (no magic numbers) | `exposes a positive named lifetime constant` (`FIREBALL_DESTROY_BURST_SECONDS`) | failing (RED) |
| Transient / no cross-phase leak (dyingTies·groundDebris parity) | `wipes destroyedShots on phase entry` | failing (RED) |
| TS #8 test quality — meaningful assertions, no `as any`, no vacuous pins, src-not-dist imports | Phase-C self-check | pass (self-check) |

**Rules checked:** the applicable subset of the 13 TS lang-review checks — #1 type-safety, #4 null/undefined, #5 module (`import type` used), #8 test-quality — plus the project's core/shell + determinism + named-constant rules. #3 enum, #6 React/JSX, #7 async, #10 input-validation, #11 error-handling do not apply to a pure sim/render change.
**Self-check:** 0 vacuous tests found (every `?? []` guard bites in GREEN if Dev over-spawns; the constant/age/pos/determinism assertions all read real values).

**Handoff:** To Dev (Yoda) for GREEN — add `DestroyedShot`/`destroyedShots`/`FIREBALL_DESTROY_BURST_SECONDS` in `src/core/state.ts`, spawn+age in the space step of `src/core/sim.ts` (alongside the existing `fireball-destroyed` event at :500), reset in `enterPhase`, draw a fading red sparkle in `src/shell/render.ts`, and add the WSVROM citation comment near `FIREBALL_GLOW`.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `star-wars/src/core/state.ts` — `DestroyedShot { pos, age }` interface, `GameState.destroyedShots` field, `FIREBALL_DESTROY_BURST_SECONDS = 0.2` constant, `destroyedShots: []` in `initialState`.
- `star-wars/src/core/sim.ts` — space step: a burst pushed at the shot-down fireball's own position (beside the existing `fireball-destroyed` event at :500), `destroyedShots` aged/filtered every frame exactly like `dyingTies`, threaded through `progress`; `enterPhase` wipes it.
- `star-wars/src/shell/render.ts` — `drawFireballBurst` (red VGCRED radial sparkle faded by `life`, `BURST_MAX_LEN = 20`), a loop over `state.destroyedShots` gated to `mode === 'playing'`, and the WSVROM ROM-ruling citation on `FIREBALL_GLOW`.
- `star-wars/docs/audit/findings/*.json` (10 files) — 52 audit citations reanchored for the src line shifts (`reanchor-citations.mjs --write`; line numbers only, 0 lost).

**Tests:** 1818/1818 passing (GREEN). All 13 new sw8-3 tests pass; the rest of the suite is unchanged. `tsc --noEmit` clean. Verified by testing-runner (RUN_ID `sw8-3-dev-green` full suite, then `sw8-3-dev-green-citations` after the reanchor).

**AC coverage:** AC1–AC4, AC6, AC10–AC12 covered by automated tests + tsc. AC7/AC8 (colour ruling) done — ruled ROM-authentic (WSVROM GNB/GNT `COLOR VGCRED,0FF`), citation added at `FIREBALL_GLOW`, no constant change. AC5/AC9 (VISUAL QA vs the longplay) are a manual serve step — see the Dev Delivery Finding.

**Branch:** feat/sw8-3-enemy-fire-destroy-burst (pushed, commit `8ee87f9`). No PR (SM creates it at finish).

**Handoff:** To Reviewer (Obi-Wan) for code review.

## Subagent Results

Only `preflight` and `rule_checker` are enabled for star-wars (`pf settings get workflow.reviewer_subagents`); the other 7 are disabled. I covered every disabled domain myself in an adversarial pass on the full diff — see the tagged coverage in the assessment.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none — 1818/1818 green, tsc clean, citations 12/12, 0 smells, clean tree | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer's own pass ([EDGE]) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer's own pass ([SILENT]) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer + rule-checker ([TEST]) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer's own pass ([DOC]) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer + rule-checker ([TYPE]) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer's own pass ([SEC], no security surface) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer's own pass ([SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | findings | 0 violations / 2 informational (15 rules, 21 instances) | confirmed 0, dismissed 0, deferred 0; 2 informational noted |

**All received:** Yes (2 enabled returned; 7 disabled via `workflow.reviewer_subagents`, covered by the Reviewer's own adversarial pass)
**Total findings:** 0 confirmed blocking, 0 dismissed, 0 deferred; 4 LOW/informational observations noted in the assessment.

### Rule Compliance

Mapped to the TypeScript lang-review checklist + star-wars project rules. reviewer-rule-checker enumerated 21 instances across 15 rules → 0 violations; my own enumeration agrees:

- **#1 Type-safety escapes:** No `as any`/double-cast beyond the fleet-wide documented test-double idiom (`as unknown as CanvasRenderingContext2D`, ~30 sibling files) and the established `[...pos] as Vec3` spread-to-tuple used identically for `dyingTies`/events. Compliant.
- **#4 Null/undefined:** No `||` on falsy-valid values. `state.destroyedShots` is a required field (`initialState` provides `[]`), so the unguarded `for..of` loops are correct; the `?? []` in tests is harmless (field is non-optional). Compliant.
- **#5 Module/imports:** `DestroyedShot` correctly `import type`; `FIREBALL_DESTROY_BURST_SECONDS` a value import (used in arithmetic). Internal relative imports omit `.js` per repo bundler-resolution convention. Compliant.
- **#8 Test quality:** 13 non-vacuous `it` blocks; render assertions are difference-based (immune to backdrop red); no dist imports; mock shape matches the exercised ctx subset. Compliant.
- **#12 Performance:** per-frame `.map().filter()` + draw loop are byte-identical to the adjacent `dyingTies`/muzzle-flash patterns — no new hot-path cost. Compliant.
- **Core/shell boundary (project HARD rule):** core (state.ts/sim.ts) is pure data + `dt`-only aging, no shell import, no DOM/Date/Math.random; the burst STATE lives in core, only its DRAWING in shell. Compliant — VERIFIED.
- **Named constants:** `FIREBALL_DESTROY_BURST_SECONDS`, `BURST_MAX_LEN` both named + documented. Compliant.
- **#3 enum / #6 React / #7 async / #10 input-validation / #11 error-handling:** N/A — not exercised by a pure sim/render change.

### Devil's Advocate

Argue the code is broken. **The burst never ages in surface/trench** — if one could exist there it would freeze forever. But it can't: `enterPhase` wipes `destroyedShots` on every transition and no kill-path spawns one outside space, so the freeze is unreachable. **A negative `life`?** If a burst reached render with `age > LIFE`, `life` and `len` would go negative — but the sim's `filter(age <= LIFE)` runs before render sees the state, so render only ever gets `age ≤ LIFE` ⇒ `life ≥ 0`; the boundary `age === LIFE` gives `life = 0` ⇒ zero-length rays (invisible, harmless). **A confused player** shooting two fireballs on consecutive frames gets two coexisting bursts — the list handles N, each ages independently, and the space step downs at most one per frame (CLSLZ), each expiring in 0.2 s, so no cap is needed. **A stressed frame (huge dt)?** A single giant `dt` ages a burst straight past `LIFE` and drops it — degrading to the old silent-delete, never a crash or a stuck sparkle. **Mutation leak?** `age + dt` builds fresh objects; `pos: d.pos` aliases the never-mutated position array exactly as `dyingTies` does, and the purity test proves the input state is untouched. **Determinism?** No `Date.now`/`Math.random`/`performance.now` anywhere; the seeded-RNG determinism test passes byte-for-byte. **Serialization?** Star-wars persists only high scores to localStorage, never a full GameState, so no old snapshot lacks `destroyedShots`; tsc confirms every literal carries the field. The only residue is cosmetic — ~8 lines duplicated from drawMuzzleFlash and a couple of stale prose line-refs — neither can break anything. The feature is sound.

## Reviewer Assessment

**Verdict:** APPROVED

A clean, disciplined story. The destroy-burst mirrors the proven `dyingTies` render-cue pattern end-to-end (spawn → age → filter → phase-wipe), the core/shell boundary is respected, and Thread-2 colour is correctly RULED ROM-authentic rather than blindly changed. Preflight is fully green (1818/1818, tsc, citations 12/12) and rule-checker found 0 violations across 15 rules. No Critical/High/Medium.

**Data flow traced:** trigger pull → `stepGame` space step resolves the beam against `enemyShots` → on a hit, the fireball's position is spread-cloned into `spawnedBursts` (age 0) beside the existing `fireball-destroyed` event → `destroyedShots` is aged/filtered each frame and threaded through `progress()` into the returned state → `render()` (gated `mode === 'playing'`) strokes a red VGCRED sparkle faded by `life = 1 - age/LIFE` → `enterPhase` wipes the list so nothing crosses a phase. Deterministic and pure throughout (VERIFIED by the purity/determinism tests + byte-parity with dyingTies).

**Confirmed subagent coverage (tags):**
- [RULE] reviewer-rule-checker: 0 violations / 15 rules / 21 instances. Two informational, both pre-existing-convention: `cue!.pos` vs sibling `cue?.pos` (guarded by `toBeDefined` — safe), and the documented `as unknown as CanvasRenderingContext2D` test-double idiom. Neither is new risk. — evidence: RULE_RESULT `violations: []`.
- [EDGE] (disabled — own pass): empty list → loop no-ops; off-screen burst → `drawFireballBurst` `if(!p) return`; `life ∈ [0,1]` because the sim filter keeps `age ≤ LIFE`; multiple bursts coexist; mid-burst phase transition is wiped. — evidence: sim.ts filter :523-528, render.ts guard :707.
- [SILENT] (disabled — own pass): no swallowed errors; the `if(!p) return` off-screen skip is a legitimate projection guard (matches drawMuzzleFlash), not a silent failure. VERIFIED — render.ts:707.
- [TEST] (disabled — own pass + rule-checker): 13 non-vacuous tests; difference-based render assertions immune to the Death Star's red dish; guards keep aging/scoring tests from passing vacuously.
- [DOC] (disabled — own pass): WSVROM citations on `FIREBALL_GLOW` spot-checked accurate (WSVROM.MAC:54/487/528/569/610). [LOW] a couple of prose line-refs in test-header comments (e.g. "sim.ts:500") drifted after the edits — trivial.
- [TYPE] (disabled — own pass + rule-checker): `DestroyedShot {pos,age}` clean, mirrors DyingTie; no stringly-typing. [LOW] `cue!.pos` non-null assertion where a sibling uses `cue?.pos` (safe, guarded).
- [SEC] (disabled — own pass): no security surface — pure sim + canvas draw, no input parsing/network/secrets. N/A.
- [SIMPLE] (disabled — own pass): [LOW] `drawFireballBurst` duplicates ~8 lines of `drawMuzzleFlash` (colour + length differ). Accepted per the one-fn-per-cue idiom; Dev already logged the `drawStarburst` extraction as a non-blocking follow-up.

**Pattern observed:** correct reuse of the `dyingTies` life-cued render entity (state.ts:948-953, sim.ts:518-528 + enterPhase:1610, render.ts:576-581) — the most idiomatic way to add a transient cue in this codebase.

**Error handling:** off-screen/behind-camera burst draws nothing (`drawFireballBurst` guard); no null path (required field, `[]` default). N/A for I/O — pure sim/render.

**LOW/informational (all non-blocking follow-ups, do not gate a 3-pt story):** (1) [SIMPLE] drawFireballBurst↔drawMuzzleFlash duplication; (2) [TYPE] `cue!.pos` vs `cue?.pos`; (3) [DOC] stale prose line-refs in test comments; (4) [DOC] "beside ENEMY_MUZZLE_FLASH_SECONDS" is shell not core. Per Reviewer proportionality, a prose/dup LOW cluster is a follow-up, not a block.

**Deviation audit:** all 3 logged deviations ACCEPTED (see `### Reviewer (audit)`).

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

No upstream findings

### TEA (test design)
- **Improvement** (non-blocking): The kill is NOT fully "silent-delete" as the context framed it — a positioned `fireball-destroyed` GameEvent already exists (`src/core/events.ts:87`) and is already consumed in the shell (`src/main.ts:183`, audio cue). The real gap is only the lingering VISUAL. Affects `star-wars/src/core/sim.ts` (spawn the burst alongside the existing event at `sim.ts:500`, don't add a second event) and `star-wars/src/shell/render.ts` (draw it). *Found by TEA during test design.*
- **Improvement** (non-blocking): Thread-2 colour RULING for the audit trail — the incoming fireball is ROM-authentic RED. WSVROM.MAC GNB0-3 open `COLOR VGCRED,0FF` (`VGCRED==4`, WSVROM.MAC:54; bodies :487/528/569/610); GNT0-3 inherit it; no hue cycling. `FIREBALL_GLOW='#ff3b30'` is faithful and needs a citation comment only. Affects `star-wars/src/shell/render.ts:116`. *Found by TEA during test design.*
- **Gap** (non-blocking): The player-shoots-a-fireball kill path exists ONLY in the space step (`sim.ts` `killedShot`, ~:456-500); trench/surface phases have no such path, so the destroy-burst is a space-phase cue. The `enterPhase` reset (AC6) still covers the cross-phase wipe. Affects `star-wars/src/core/sim.ts` (spawn only in the space step). *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): `drawFireballBurst` and `drawMuzzleFlash` share the radial-sparkle geometry (rays from a point scaled by `life`), differing only in colour and max length. Kept as two functions (the codebase's one-fn-per-cue idiom + minimalism); if a THIRD radial-cue caller appears, extract a shared `drawStarburst(ctx, pos, life, proj, w, h, color, maxLen)`. Affects `star-wars/src/shell/render.ts`. *Found by Dev during implementation.*
- **Gap** (non-blocking): AC5/AC9 VISUAL QA not yet done — automated tests prove the burst draws red, fades, and clears, and the colour is ruled ROM-authentic, but a frame-vs-longplay serve confirmation remains manual: `cd star-wars && npx vite --port 5284 --strictPort`, enter space combat, shoot down a fireball, confirm the red sparkle reads and clears (and matches the longplay hue). Affects manual QA only (no code). *Found by Dev during implementation.*

### Reviewer (code review)
- No blocking upstream findings — the story is APPROVED. Four LOW/non-blocking follow-ups (do NOT gate the merge):
- **Improvement** (non-blocking): `drawFireballBurst` duplicates ~8 lines of `drawMuzzleFlash`; extract a shared `drawStarburst(ctx,pos,life,proj,w,h,color,maxLen)` if a third radial-cue caller appears (corroborates Dev's own finding). Affects `star-wars/src/shell/render.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): Test hygiene — `tests/core/destroyed-shot-burst.test.ts` uses `cue!.pos` where the sibling `shootable-fireballs.test.ts` uses `cue?.pos`; a few prose line-refs in test-header comments (e.g. "sim.ts:500") drifted after the src edits; and "beside ENEMY_MUZZLE_FLASH_SECONDS" names a shell constant as if core. All cosmetic. Affects `star-wars/tests/core/destroyed-shot-burst.test.ts`, `tests/shell/render.destroyed-shot-burst.test.ts`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Thread 2 (fireball colour) ruled ROM-authentic — no failing colour test written**
  - Spec source: context-story-sw8-3.md, AC7 & AC8
  - Spec text: "RULE: Fireball colour verified … Colour ruling enforced in code"
  - Implementation: No new colour test. Ruled red-authentic from WSVROM.MAC (GNB/GNT `COLOR VGCRED,0FF`); enforcement already exists in `tests/shell/render.enemy-fireball.test.ts`. GREEN adds a citation comment only.
  - Rationale: The current colour is already ROM-authentic, so a RED colour test would be fabricated and a green pin would duplicate the existing red-body test (vacuous). The ruling itself is the deliverable, per the sw8 "rule before you fix" charter.
  - Severity: minor
  - Forward impact: Dev adds a WSVROM citation near `FIREBALL_GLOW`; no constant change. If Reviewer wants a constant-level guard, exporting `FIREBALL_GLOW` + a red-dominant assertion is a trivial add.
- **Burst life-fade curve not unit-tested (AC4 "with life-fade")**
  - Spec source: context-story-sw8-3.md, AC4 & AC5
  - Spec text: "loop state.destroyedShots and draw each burst with life-fade (1 → 0 over lifetime)"
  - Implementation: The render suite pins that the burst IS drawn (extra red vs a burst-free twin) but does not assert the fade magnitude/curve.
  - Rationale: The fade MECHANISM is GREEN's choice (scale sparkle size vs alpha); asserting a specific curve would couple the test to the implementation. Fade legibility is an eyeball/visual-QA concern per repo convention (AC5). Transience is pinned in core (burst dropped past lifetime) and render draws only from the list, so a faded-out burst renders nothing.
  - Severity: minor
  - Forward impact: AC5 visual QA (serve + shoot fireballs) confirms the fade reads on screen.

### Dev (implementation)
- **Burst lifetime is a cabinet-FEEL value, not a ROM port**
  - Spec source: context-story-sw8-3.md, Technical Approach §1
  - Spec text: "Research the ROM: how long does a fireball-destruction sparkle persist? … Define the constant … with a source citation."
  - Implementation: `FIREBALL_DESTROY_BURST_SECONDS = 0.2` is a feel value with NO ROM citation, because the ROM has no fireball destroy-burst at all — it silently removes an intercepted fireball (CLSLZ/WSGUNS). The whole cue is a deliberate readability ADD per the playtest (epic sw8 obs #8), so there is no ROM duration to port.
  - Rationale: Sized just past the enemy muzzle-flash (0.1 s) so a kill reads as a distinct pop, not a blink. The tests reference the constant by name, so the value is free to tune.
  - Severity: minor
  - Forward impact: none — if visual QA wants it snappier or longer, change the one constant.

### Reviewer (audit)
All three logged deviations reviewed — each is sound and ✓ ACCEPTED:
- **TEA — Thread 2 colour ruled ROM-authentic, no failing colour test** → ✓ ACCEPTED: the ruling is correct (WSVROM GNB/GNT `COLOR VGCRED,0FF`, `VGCRED==4`, no hue cycling — independently verified), and the existing `render.enemy-fireball.test.ts` already enforces red. A fabricated RED colour test or a duplicate green pin would be vacuous. Right call.
- **TEA — burst life-fade curve not unit-tested** → ✓ ACCEPTED: the fade mechanism is an implementation choice; asserting a specific curve would couple the test to it. Transience is pinned in core and render draws only from the list, so a faded-out burst renders nothing. Legibility is correctly deferred to AC5 visual QA.
- **Dev — burst lifetime is a feel value, not a ROM port** → ✓ ACCEPTED: the ROM genuinely has no fireball destroy-burst (it silently removes an intercepted fireball), so there is no duration to port; 0.2 s is a reasonable feel value, named and referenced by the tests, and trivially tunable. Honestly logged.
- No UNDOCUMENTED deviations found: the colour constant, the space-phase-scoped spawn, and the dyingTies-parity are all either spec-aligned or already logged.