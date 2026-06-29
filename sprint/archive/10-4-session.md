---
story_id: "10-4"
jira_key: ""
epic: "10"
workflow: "tdd"
---
# Story 10-4: Realize the warp dive spectacle: 8-plane starfield + entry FX + render test

## Story Details
- **ID:** 10-4
- **Jira Key:** (none — local YAML tracking)
- **Workflow:** tdd
- **Points:** 3
- **Priority:** p2
- **Status:** backlog
- **Repo:** tempest
- **Stack Parent:** none

## Technical Approach

The warp mechanic is already complete end-to-end (sim.ts:483 and 538-547, render.ts:793-795). This story adds the visual and audio spectacle:

1. **8-plane starfield (shell-only FX)**
   - 8 parallel depth planes of blue star dots
   - Screen-center origin
   - Spawn Z = 0xF0, step -7 per frame, spawn-next trigger at 0xD5
   - Retire (fade/remove) at Z = 0x10
   - 4 reused star pattern pictures (book ch. star planes)
   - Renders only during warp mode

2. **Warp entry FX cue (events wiring)**
   - Currently fx.ts:108 detects arrival level-diff to fire FX
   - Change: consume the level-clear event in fx.detect instead
   - Fire the FX cue on warp ENTRY, not arrival
   - Warp-sound duration handled separately in 10-11

3. **Render-dispatch test**
   - Unit test asserting drawWarp branch fires when mode=warp
   - Verify spikes still render during warp (no regression)
   - Part of test suite; no behavioral change

## Acceptance Criteria

- [ ] A layered starfield (8 planes, documented constants) renders during the warp dive
- [ ] An FX cue fires on warp ENTRY (level-clear event), not only on arrival
- [ ] A render test asserts render() takes the drawWarp branch when mode is warp, with spikes still drawn
- [ ] Existing warp core tests pass; core stays pure (starfield is shell-only)

## Sm Assessment

Setup verified and routed. This is a 3pt phased TDD story scoped purely to the shell layer of `tempest` — the warp core mechanic already exists, so this is additive spectacle plus a render-dispatch test. No Jira (local YAML tracking); no blocking PRs, so the merge gate is clear. Feature branch `feat/10-4-warp-dive-spectacle` created off `develop` per the tempest gitflow strategy. Acceptance criteria are concrete and testable (starfield render with documented constants, warp-entry FX cue via the level-clear event, drawWarp dispatch test with spikes still drawn). Boundary noted: warp-sound duration is explicitly out of scope (handled in 10-11).

Routing to **O'Brien (tea)** for the RED phase: author failing tests covering the three ACs before any implementation. Reference `sprint/context/context-story-10-4.md` and `context-epic-10.md` (Warp + Starfield) for the ROM-accurate constants.

## Workflow Tracking

**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-29T13:45:51Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-29T13:08:16Z | 2026-06-29T13:10:44Z | 2m 28s |
| red | 2026-06-29T13:10:44Z | 2026-06-29T13:26:25Z | 15m 41s |
| green | 2026-06-29T13:26:25Z | 2026-06-29T13:34:51Z | 8m 26s |
| review | 2026-06-29T13:34:51Z | 2026-06-29T13:45:51Z | 11m |
| finish | 2026-06-29T13:45:51Z | - | - |

## TEA Assessment

**Tests Required:** Yes
**Status:** RED (confirmed) — 560 pre-existing tests pass, 6 new failures for the right reasons.

**Test Files:**
- `tests/shell/starfield.test.ts` — behavioural lifecycle of the pure 8-plane starfield model (AC1). Documented ROM constants (spawn 0xF0, step -7, spawn-next 0xD5, retire 0x10, 8-plane cap, 4 reused pictures), spawn cadence, retirement, cap, picture reuse, reset.
- `tests/shell/fx.warp-entry.test.ts` — the level-clear FX cue must fire on warp ENTRY via the `level-clear` event, not the arrival `s.level` diff (AC2).
- `tests/shell/render.warp-dispatch.test.ts` — `?raw` dispatch guard: render() routes to drawWarp + keeps drawing spikes during warp (AC3, characterization), and strokes the starfield only inside the warp branch (AC1 render wiring).

**Tests Written:** 17 tests covering 4 ACs.
**RED breakdown (verified by testing-runner, run 10-4-tea-red):**
- starfield.test.ts → module-not-found (src/shell/starfield.ts absent) — clean RED.
- fx.warp-entry.test.ts → 3 assertion failures (fx.ts still diff-driven).
- render.warp-dispatch.test.ts → 3 starfield-wiring failures RED; 3 drawWarp/spikes characterization tests PASS by design (they guard pre-existing behaviour against the starfield work).
- AC4 baseline: all core warp tests (sim.warp*, advance-level, level) + existing fx.test.ts still green — no regressions.

### Rule Coverage

| Rule (TS lang-review) | Test(s) | Status |
|------|---------|--------|
| #1 type-safety escapes (no `as any`/double-cast/`@ts-ignore`) | `starfield.test.ts` → "uses no as any, double-cast, or @ts-ignore" (render.ts already guarded by `render.enemy-scale.test.ts`) | failing (module absent) |
| #2 readonly on arrays not to be mutated | `Starfield.planes` typed `readonly StarPlane[]`; tests treat `planes` as read-only snapshots (never mutate) | enforced by contract |
| #8 test quality (meaningful assertions, no vacuous) | Self-check pass: every test asserts concrete values/indices; `expect(sawSecond).toBe(true)` and `expect(fullFrame).toBeDefined()` guard against vacuous loop passes; no `as any` in tests | pass |

**Rules checked:** 3 of the lang-review rules apply to this pure-shell, no-React, no-IO story (#1, #2, #8); the rest (#4 null-handling, #5–#7 generics/enums/async, #10 input validation, #11 error handling) have no surface here.
**Self-check:** 0 vacuous tests found; loop-based invariant tests are guarded by explicit existence assertions.

**Handoff:** To Julia (Dev) for the GREEN phase — create `src/shell/starfield.ts` (per the EXPECTED MODULE contract in the test header), switch `fx.detect` to consume the `level-clear` event (removing the dead `prevLevel` path — see Delivery Findings), and wire `drawStarfield(pctx, …)` into render.ts's warp branch importing from `./starfield`.

## Dev Assessment

**Implementation Complete:** Yes
**Tests:** 576/576 passing (GREEN) · `npx tsc --noEmit` clean.
**Branch:** `feat/10-4-warp-dive-spectacle` (pushed)

**Files Changed:**
- `src/shell/starfield.ts` (NEW) — the pure 8-plane starfield model: `createStarfield()` + the documented ROM constants (`STAR_SPAWN_Z` 0xF0, `STAR_STEP` 7, `STAR_SPAWN_NEXT_Z` 0xD5, `STAR_RETIRE_Z` 0x10, `STAR_PLANES` 8, `STAR_PICTURES` 4). `step()` moves planes in, retires arrivals, and staggers spawns; `reset()` clears between dives. (AC1)
- `src/shell/fx.ts` — the level-clear FX cue now fires off the `level-clear` event inside the existing event loop (warp ENTRY), not the arrival `s.level` diff; removed the dead `prevLevel` tracking. (AC2)
- `src/shell/render.ts` — imports `./starfield`, holds a module-level `starfield` singleton, and `drawStarfield(pctx, W, H)` strokes the blue dot-planes (4 reused pictures rushing out from centre) inside the warp branch only; `starfield.reset()` runs on the non-warp path. drawWarp dispatch + spikes-during-warp unchanged. (AC1 render wiring, AC3)

**AC coverage:**
- AC1 (8-plane starfield, documented constants, during warp) — ✅ model + render wiring, all starfield tests green.
- AC2 (FX cue on warp ENTRY via level-clear event) — ✅ fx.warp-entry tests green.
- AC3 (render dispatches drawWarp, spikes still drawn) — ✅ render.warp-dispatch tests green (characterization held).
- AC4 (core stays pure, existing warp core tests pass) — ✅ starfield is shell-only; all core tests green, no regressions.

**Notes:** Warp-sound duration remains out of scope (10-11). Two minor deviations logged: a test-regex defect fix and the `starfield.reset()` correctness addition — see Design Deviations → Dev.

**Handoff:** To The Thought Police (Reviewer) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (576 tests GREEN, tsc clean, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — reviewer assessed boundaries manually |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — reviewer assessed manually |
| 4 | reviewer-test-analyzer | Yes | findings | 5 | confirmed 5 (all LOW/MEDIUM, non-blocking), dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — reviewer assessed comments manually |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — covered by rule-checker + manual |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings — reviewer assessed manually (client-only, no input) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — reviewer assessed manually |
| 9 | reviewer-rule-checker | Yes | clean | none (14 rules, 28 instances, 0 violations) | N/A |

**All received:** Yes (3 enabled subagents returned; 6 disabled via `workflow.reviewer_subagents` settings, pre-filled as Skipped)
**Total findings:** 5 confirmed (all non-blocking test-quality), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

This is a clean, well-scoped shell-only change. The implementation is correct, every AC is met, the new behaviour is genuinely wired into the running game (not just the tests), and the architectural boundary is preserved. No Critical or High issues. The five subagent findings are all test-robustness improvements, not defects.

**Data flow traced (the new event-driven cue):** `sim.checkLevelClear` (core) emits `{type:'level-clear'}` and flips `mode → 'warp'` on the entry frame → `loop.ts:75` drains `state.events` into `frameEvents` → `main.ts:65` calls `fx.detect(s, rdt, frameEvents)` → `fx.ts` event loop matches `e.type === 'level-clear'` and sets the white flash + shake. **The cue fires in-game, not only under test** — this was the primary wiring risk and it is satisfied.

**Observations (≥5, tagged by source):**
- `[VERIFIED]` FX cue wiring — `main.ts:65` passes `frameEvents` to `fx.detect`; `loop.ts:75` collects `state.events`. The event-driven swap (entry, not arrival) reaches the real loop. Complies with the shell event-channel pattern already used for `warp-spike-crash` (fx.ts:96).
- `[VERIFIED]` Core purity (AC4) — all three changed files live under `src/shell/`; `starfield.ts` imports nothing and uses no DOM/`Date`/`Math.random`; no `src/core/` file references the starfield. Evidence: rule-checker rule #14 (5 instances, 0 violations) + grep of `src/core`. The deterministic sim is untouched.
- `[VERIFIED]` Singleton pattern — `render.ts` holds a module-level `const starfield = createStarfield()` mirroring the existing `const phosphor = createPhosphor()` (render.ts:105). Reset between dives via `starfield.reset()` on the non-warp path; tests use fresh `createStarfield()` instances, so no shared-state leakage. Consistent with codebase convention.
- `[VERIFIED]` Dispatch + spikes (AC3) — `render.ts` draws `drawSpikes(pctx,…)` before the `s.mode==='warp'` branch (spikes read during the dive), `drawWarp` inside the branch, enemies only in the `else`. Matches the render.warp-dispatch guard.
- `[RULE]` rule-checker: CLEAN — 14 TS lang-review rules across 28 instances, 0 violations (readonly interfaces, no type-safety escapes, safe array indexing, module-boundary intact).
- `[TEST]` test-analyzer: 5 findings, all confirmed and all **non-blocking** (LOW/MEDIUM) — test robustness, not behaviour:
  - `starfield.test.ts:122` (retire test) double-nested loop has no terminal existence guard — passes vacuously if the field never spawned. Mitigated by sibling tests ("first step spawns", "reaches 8") that would catch a spawn regression. [LOW]
  - `starfield.test.ts:97` (spawn-next) first loop's only guard is the `sawSecond` assertion in the next section — coupling, not a hole. [LOW]
  - `starfield.test.ts:141` (reset) doesn't pin `planes[0].picture === 0` after reset, so a regression dropping `spawned = 0` from `reset()` would go uncaught. Genuine coverage gap. [MEDIUM]
  - `render.warp-dispatch.test.ts:41` ("no enemies in warp") uses first-occurrence ordering with no count guard, unlike the drawStarfield "exactly once" check. [LOW/MEDIUM]
  - `fx.warp-entry.test.ts:48` `.not.toBe(DEATH_RED)` is a tautology once line 47 (`toBe('#ffffff')`) passes — harmless, zero discriminating power. [LOW]
- `[LOW]` `[SIMPLE]`/coupling — `render.ts:117` `STAR_PICTURE_DOTS` has 4 entries implicitly coupled to `STAR_PICTURES = 4` (starfield.ts:37) with no compile-time link; `STAR_PICTURE_DOTS[plane.picture]` is safe today (picture ∈ 0..3) but would index `undefined` and throw if `STAR_PICTURES` were ever raised. Non-blocking hardening note.
- `[EDGE]` (subagent disabled) manual: starfield boundaries checked — empty start (first `step()` spawns), Z floor (integer steps 240→16, retired at ≤16, never below), 8-plane cap (`length < STAR_PLANES` guard), picture range (0..3). No off-by-one or unbounded growth.
- `[SILENT]` (subagent disabled) manual: no try/catch, no swallowed errors, no silent fallbacks — the diff is pure arithmetic + canvas draws with no failure channel.
- `[DOC]` (subagent disabled) manual: comments are accurate — the fx comment correctly cites `sim.checkLevelClear` as the entry emitter; starfield/render comments describe the actual constants and lifecycle. No stale/misleading docs.
- `[TYPE]` (subagent disabled) manual: covered by rule-checker — `StarPlane`/`Starfield` fields `readonly`, `STAR_PICTURE_DOTS` fully `ReadonlyArray`, no stringly-typed surface, picture is a bounded number (acceptable for an internal index).
- `[SEC]` (subagent disabled) manual: no security surface — client-only canvas eye-candy, no user input, no injection/auth/secret/IO. N/A by construction.

### Rule Compliance

TS lang-review checklist (`.pennyfarthing/gates/lang-review/typescript.md`) mapped against the diff:
- #1 type-safety escapes — COMPLIANT (no `as any`/double-cast/`@ts-ignore`; test `fullFrame!` guarded by `.toBeDefined()`).
- #2 generics/interfaces — COMPLIANT (`readonly` on `StarPlane.z/.picture`, `Starfield.planes`, `STAR_PICTURE_DOTS`).
- #3 enums — N/A (no enums).
- #4 null/undefined — COMPLIANT (`newest === undefined || newest.z <= …` is a short-circuit guard, not a `||`-default; array index bounded).
- #5 modules — COMPLIANT (extensionless TS imports per convention; value exports, no `export type` needed).
- #6 React/JSX — N/A.
- #7 async — N/A (no async).
- #8 test quality — 5 robustness findings above; no `as any` in tests, imports from `src/`.
- #10 input validation — N/A (no untrusted input).
- #11 error handling — N/A (no error channel).
- Architectural boundary (CLAUDE.md) — COMPLIANT (shell-only; core untouched; starfield self-contained).

### Devil's Advocate

Let me argue this code is broken. First, the starfield singleton lives at module scope and steps only inside `drawStarfield`, which runs only during warp — so what happens across dives? If `starfield.reset()` were ever skipped, the planes from dive #1 (up to 8, mid-flight) would persist frozen and dive #2 would resume their stale Z instead of streaming from centre. The code does call `reset()` on the non-warp `else` branch, but note the early-return framing screens (attract/select/highscore) return *before* that branch — so a warp interrupted by a jump straight to one of those modes leaves stale planes. In practice you cannot leave warp into a framing screen (warp resolves to `playing` or to a death→`dying`/`gameover`, both of which hit the `else` and reset), so the stale-plane window never opens — but it is a latent fragility if mode transitions change. Second, a confused future maintainer could raise `STAR_PICTURES` to 5 and forget `STAR_PICTURE_DOTS` (render hardcodes 4) — `STAR_PICTURE_DOTS[4]` is `undefined`, and `for (const [ux,uy] of undefined)` throws *during* the warp, crashing the render loop mid-game. No test or type guards this cross-module constant agreement; it is the single sharpest edge in the change (logged LOW). Third, could the FX cue double-fire? The cue now keys on the event, and `sim` emits `level-clear` exactly once on the entry frame, while `loop.ts` clears `state.events` each step — so no duplication; the old arrival-diff double-trigger is genuinely gone (the fx.warp-entry "no re-fire on arrival" test pins this). Fourth, a stressed run with a huge frame count: planes are filtered every step and capped at 8, `spawned` grows unbounded as a JS number but is only ever used `% 4` — no overflow concern at any realistic playtime. Fifth, the tests: the analyzer's vacuous-if-empty concern is real in isolation, but a spawn regression would still redden "first step spawns at 240" and "reaches 8 planes". Net: nothing here is broken; the worst case is a maintainability trap (the picture-table coupling), captured as a non-blocking finding.

**Verdict rationale:** All ACs met, wiring verified end-to-end, core purity intact, rule-checker clean, preflight green. The five test-quality findings and the one coupling note are all LOW/MEDIUM and non-blocking — they harden against hypothetical future regressions, none indicate a current defect or missing AC coverage. Bouncing a correct, fully-green implementation through another RED/GREEN cycle for test nitpicks is not warranted; the items are captured as non-blocking Delivery Findings for a follow-up polish.

**Handoff:** To Winston Smith (SM) for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

No upstream findings at setup.

### TEA (test design)
- **Improvement** (non-blocking): once `fx.detect` consumes the `level-clear` event for the entry cue, the `prevLevel` tracking variable becomes dead code. Affects `tempest/src/shell/fx.ts` (remove the now-unused `prevLevel` let + its `prevLevel = s.level` write when removing the `s.level > prevLevel` diff path). *Found by TEA during test design.*

### Dev (implementation)
- No upstream findings during implementation. (TEA's `prevLevel` cleanup was applied in this phase — the dead `let prevLevel` + its write are removed.)

### Reviewer (code review)
- **Improvement** (non-blocking): the `reset()` test does not pin the picture cycle restarts — a regression dropping `spawned = 0` from `reset()` would go uncaught. Affects `tempest/tests/shell/starfield.test.ts` (add `expect(field.planes[0].picture).toBe(0)` after the post-reset `step()`). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the "no enemies during warp" render guard uses first-occurrence ordering only, so a duplicate `drawEnemy(pctx` inside the warp branch wouldn't be caught. Affects `tempest/tests/shell/render.warp-dispatch.test.ts:41` (add a `drawEnemy(pctx` count guard mirroring the drawStarfield "exactly once" check). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `STAR_PICTURE_DOTS` (4 entries, `render.ts:117`) is implicitly coupled to `STAR_PICTURES = 4` with no compile-time link; safe today but `STAR_PICTURE_DOTS[plane.picture]` would throw if `STAR_PICTURES` were raised. Affects `tempest/src/shell/render.ts` (index with `plane.picture % STAR_PICTURE_DOTS.length`, or assert `STAR_PICTURE_DOTS.length === STAR_PICTURES`). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the starfield "retire" test and the spawn-next first loop lack terminal existence guards (pass vacuously if the field never spawned); mitigated by sibling tests. Affects `tempest/tests/shell/starfield.test.ts:122,97` (add an `expect(history.some(ps => ps.length > 0)).toBe(true)` style guard); the redundant `fx.warp-entry.test.ts:48` `.not.toBe(DEATH_RED)` tautology can be dropped. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

None recorded at setup.

### TEA (test design)
- **AC3 render dispatch tested via `?raw` source-text, not a behavioural render() call**
  - Spec source: context-story-10-4.md, AC-3
  - Spec text: "A render test asserts render() takes the drawWarp branch when mode is warp, with spikes still drawn"
  - Implementation: `render.warp-dispatch.test.ts` asserts the dispatch structurally over `render.ts?raw` (call sites anchored on the `pctx` argument), rather than invoking render()
  - Rationale: vitest runs in the `node` env and render() calls `phosphor.beginScene` → `document.createElement('canvas')`, which throws headless. This is the codebase's established seam for render dispatch (see `render.enemy-scale.test.ts`, which documents the same constraint).
  - Severity: minor
  - Forward impact: Dev must keep the drawWarp/drawSpikes/drawStarfield call sites anchored on `pctx` and inside the warp branch so the source-text guard stays meaningful.
- **AC1 starfield realized as a new pure importable module, not inline render code**
  - Spec source: context-story-10-4.md, AC-1
  - Spec text: "A layered starfield (8 planes, documented constants) renders during the warp dive"
  - Implementation: tests drive a NEW pure model `src/shell/starfield.ts` (createStarfield + documented constants) and assert its plane lifecycle behaviourally; render.ts strokes its `planes`. (Contract pinned in the test header.)
  - Rationale: render output is untestable headless, so — exactly like the 6-8 glyphs and 6-12 audio dispatcher — the lifecycle/constants are extracted into a pure, importable seam. Behavioural tests beat regex on the documented constants.
  - Severity: minor
  - Forward impact: Dev must create `src/shell/starfield.ts` matching the EXPECTED MODULE contract; render.ts imports from `./starfield`.
- **AC4 core-purity relies on the existing core boundary scan, no new starfield-specific core guard**
  - Spec source: context-story-10-4.md, AC-4
  - Spec text: "Existing warp core tests pass; core stays pure (starfield is shell-only)"
  - Implementation: no new test asserting core does not import the starfield; "core stays pure" is covered by the existing `tests/core/events.test.ts` forbidden-token boundary scan plus the suite staying green.
  - Rationale: the starfield is shell-only by construction (module lives in `src/shell/`, imported via render's `./starfield`); the project deliberately has no Node `fs` types, so a multi-file core scan would be heavyweight and redundant with the existing guard.
  - Severity: minor
  - Forward impact: none — Dev keeps the starfield under `src/shell/`.

### Dev (implementation)
- **Corrected a self-contradicting regex in `render.warp-dispatch.test.ts`**
  - Spec source: tests/shell/render.warp-dispatch.test.ts (TEA red-phase test) — "draws the starfield exactly once"
  - Spec text: counted `/drawStarfield\s*\(/g` and asserted exactly 1 match
  - Implementation: anchored the count on the call argument — `/drawStarfield\s*\(\s*pctx/g`
  - Rationale: the bare regex also matched the local `function drawStarfield(ctx, …)` DEFINITION (2 matches), contradicting the file's own header (call sites are anchored on `pctx`) and every sibling test in the suite. Inlining the helper or pushing it into the pure `starfield.ts` model just to dodge the regex would be worse design. The corrected regex preserves the intent — exactly one warp-only call site.
  - Severity: minor
  - Forward impact: none — the test still fails if a second `drawStarfield(pctx, …)` call site is ever added.
- **Added `starfield.reset()` on the non-warp render path (behaviour beyond a failing test)**
  - Spec source: context-story-10-4.md, AC-1
  - Spec text: "A layered starfield … renders during the warp dive" (only during warp)
  - Implementation: render() calls `starfield.reset()` in the non-warp `else` branch so each dive starts from a clean centre rather than resuming the previous dive's planes
  - Rationale: without it the planes persist (frozen) between dives and the next warp would resume mid-state. No test demanded it, but it's required for the AC to read correctly across repeated warps. It's idempotent and cheap.
  - Severity: minor
  - Forward impact: none

### Reviewer (audit)
- **TEA #1 (AC3 render dispatch via `?raw`)** → ✓ ACCEPTED by Reviewer: the node test env genuinely can't run render() (phosphor needs `document`); `?raw` is the codebase's established render-dispatch seam (render.enemy-scale precedent). Guards are meaningful, not tautological.
- **TEA #2 (AC1 starfield as a pure module)** → ✓ ACCEPTED by Reviewer: matches the glyphs/audio-dispatch extract-to-importable pattern; behavioural lifecycle tests are stronger than regex on the documented constants. rule-checker confirmed the module is self-contained.
- **TEA #3 (AC4 core-purity via existing scan)** → ✓ ACCEPTED by Reviewer: the starfield is shell-only by construction; rule-checker rule #14 independently verified no `src/core` file references it and the sim is untouched. A new core scan would be redundant.
- **Dev #1 (test-regex fix)** → ✓ ACCEPTED by Reviewer: the bare `/drawStarfield\(/g` contradicted the file's own pctx-anchoring convention and every sibling test; the fix preserves the "exactly one warp-only call site" intent without weakening it. Verified the corrected regex still fails on a duplicate call site.
- **Dev #2 (`starfield.reset()` on non-warp path)** → ✓ ACCEPTED by Reviewer: required for "renders only during warp" to hold across repeated dives; idempotent and cheap. Devil's-advocate confirmed the only stale-plane window (warp→framing-screen) is unreachable given current mode transitions.