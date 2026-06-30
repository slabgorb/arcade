---
story_id: "10-15"
jira_key: ""
epic: "10"
workflow: "trivial"
---
# Story 10-15: Render the Superzapper well-color flash

## Story Details
- **ID:** 10-15
- **Jira Key:** (none — local tracking)
- **Workflow:** trivial
- **Type:** shell rendering
- **Points:** 2
- **Epic:** 10 — ROM-accurate fidelity gaps (Tempest vs Tempest source study)
- **Stack Parent:** none

## Technical Approach

Story 10-2 implements the core Superzapper multi-frame timer and **emits** the `superzapper-flash` event (color 0..7, derived from `QFRAME AND 7`) during each active zap frame. This story wires that signal to the **shell render layer** to tint the well/web with the flash color and revert after the zap window closes.

**Implementation:**
1. Subscribe to `superzapper-flash` events in the shell's FX dispatch (fx.detect or fx.ts)
2. On each flash event, sample the color (0..7 maps to the arcade palette) and apply a tint to the well/web geometry
3. After the zap window ends (when no more flash events are emitted), revert the well to its default color
4. Render the tinted well in the next frame call

**Acceptance Criteria:**
- The well/web tints to the flash color (0..7) when a Superzapper is active (each frame the core emits the event)
- The tint reverts cleanly when the zap window closes
- Visual verification: run the game, fire the Superzapper, observe the color-cycling tint on the well
- No core changes required; shell-only FX wiring

## Workflow Tracking
**Workflow:** trivial
**Phase:** finish
**Phase Started:** 2026-06-30T14:36:40Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-30T14:16:43Z | 2026-06-30T14:19:27Z | 2m 44s |
| implement | 2026-06-30T14:19:27Z | 2026-06-30T14:26:52Z | 7m 25s |
| review | 2026-06-30T14:26:52Z | 2026-06-30T14:36:40Z | 9m 48s |
| finish | 2026-06-30T14:36:40Z | - | - |
| implement | - | 2026-06-30T14:26:52Z | unknown |
| review | 2026-06-30T14:26:52Z | 2026-06-30T14:36:40Z | 9m 48s |
| finish | 2026-06-30T14:36:40Z | - | - |
| review | - | 2026-06-30T14:36:40Z | unknown |
| finish | 2026-06-30T14:36:40Z | - | - |
| finish | - | - | - |

## Sm Assessment

**Routing decision:** New work, `trivial` (phased) workflow → hand off to Dev (Yoda) for the `implement` phase.

**Scope is well-bounded and shell-only.** The hard part — the multi-frame Superzapper timer and the `superzapper-flash` event (color 0..7 from `QFRAME AND 7`) — already landed and is tested in story 10-2. This story is purely the deferred *visible* render: subscribe to that event in the shell FX layer, tint the well/web with the flash color each active zap frame, and revert when the zap window closes. No core changes.

**Implementer notes:**
- Confirm the exact event name/payload the core emits from 10-2 before wiring (read the core emitter, don't assume the shape).
- Acceptance is **visual** — `just serve` (tempest on :5273), fire the Superzapper, observe the color-cycling tint and clean revert. A unit test on the FX tint mapping is welcome but the AC is the running game.
- Branch `feat/10-15-superzapper-well-color-flash` is cut off `develop`; PR targets `develop`.

**Jira:** none — local YAML tracking only; claim step intentionally skipped.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- No upstream findings during implementation. The core signal from 10-2 (`superzapper-flash`, color `zapTimer & 7`) was already in place, correctly typed, and emitted per active zap frame exactly as the story described — the shell wiring slotted in cleanly with no core changes.

### Reviewer (code review)
- **Improvement** (non-blocking): The FX unit tests omit the color-index `0` boundary — the only valid index that is falsy, which is exactly what the renderer's `!= null` guard exists to protect. Affects `tempest/tests/shell/fx.superzapper.test.ts` (add a `flash(0) → fx.zapFlash === 0`, or `flash(8) → 0`, case so the null-vs-0 distinction is pinned by a test, not just by inspection). The implementation is correct as written; this only strengthens coverage.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Reused the existing `LEVEL_COLORS` palette for the well-flash hue ramp**
  - Spec source: context-story-10-15.md / session Technical Approach, AC-1
  - Spec text: "sample the color (0..7 maps to the arcade palette) and apply a tint"
  - Implementation: Mapped the 0..7 index to `LEVEL_COLORS[idx % 8]` (the game's existing 8-hue per-level palette in render.ts) rather than defining a separate dedicated well-color palette.
  - Rationale: The spec said "the arcade palette" without naming a specific table; `LEVEL_COLORS` is already the well's own 8-hue palette and has exactly 8 entries, so indexing it by the flash index gives a full-spectrum strobe with zero duplication (minimalist — no second magic palette). The event doc (events.ts) explicitly delegates the index→hue mapping to the renderer.
  - Severity: minor
  - Forward impact: none — no sibling story depends on the well-flash hue choice; swapping in a hand-tuned ROM-color table later is a one-line palette change in render.ts.

### Reviewer (audit)
- **Reused `LEVEL_COLORS` for the well-flash hue ramp** → ✓ ACCEPTED by Reviewer: Sound. The spec said "the arcade palette" without naming a table; `LEVEL_COLORS` is verified to hold exactly 8 vivid hues (render.ts:18-21) — a clean 1:1 with the 0..7 index — and is already the well's own palette, so reuse avoids a duplicate magic table (minimalist). The renderer-owns-the-mapping placement matches the events.ts contract verbatim ("the renderer maps it to the palette"). No sibling story depends on the hue choice; a future ROM-accurate table is a one-line swap. Agrees with author reasoning.
- No undocumented deviations found. The change matches the session Technical Approach and ACs exactly (subscribe → tint → revert, shell-only, no core changes).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `tempest/src/shell/fx.ts` — FX layer consumes the `superzapper-flash` event: resets `zapFlash` to `null` every frame, then sets it to `e.color & 7` when a flash event is present this frame. New `zapFlash: number | null` getter on the `Fx` interface.
- `tempest/src/shell/render.ts` — `render()` now picks `wellColor = fx.zapFlash != null ? LEVEL_COLORS[fx.zapFlash % 8] : color` and passes it to `drawTube`, so the whole well/web (rim gradient, near rim, spokes, vanishing-point glow) tints to the flash hue each active zap frame and reverts to the level colour when the zap ends.
- `tempest/tests/shell/fx.superzapper.test.ts` — new, 4 tests pinning: surface the index, track the cycling color across frames, revert to `null` when no event arrives, mask to 0..7.

**Tests:** 766/766 passing (GREEN). TypeScript `tsc --noEmit` clean; Vite build clean. (Verified via testing-runner, RUN_ID 10-15-dev-green.)

**Branch:** `feat/10-15-superzapper-well-color-flash` (pushed to origin, off `develop`).

**Approach:** No core changes — the core signal (`superzapper-flash`, one per active zap frame, color `zapTimer & 7`) was already emitted + tested in 10-2. This is the deferred *visible* render only: shell FX surfaces the index, renderer maps it to a palette hue, exactly as the event doc in events.ts prescribes ("the renderer maps it to the palette").

**Remaining acceptance — VISUAL (for Reviewer):** AC-3 is "run the game, fire the Superzapper, observe the color-cycling tint on the well and clean revert." The deterministic FX plumbing is unit-pinned, but the on-screen tint itself is a canvas render that tests can't assert. Reviewer (Obi-Wan): `just serve` from the orchestrator root → `http://localhost:5273/tempest/`, start a game, fire the Superzapper, and confirm (a) the well/web strobes through hues while the zap is active and (b) it snaps back to the level colour the instant the zap window closes.

**Handoff:** To review phase (Obi-Wan / Reviewer).

## Subagent Results

Project config (`workflow.reviewer_subagents`) enables only `preflight` and `rule_checker`
for this repo; the other seven specialists are disabled via settings, so I assessed
their domains myself (noted inline below).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (766/0 tests, build clean, tree clean, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — edges assessed by reviewer (warp transition, mask, revert) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — no try/catch or silent fallbacks in diff (reviewer-assessed) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — test quality assessed by reviewer + rule_checker (1 gap) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — comments verified accurate (reviewer + rule_checker A3) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — `number \| null` readonly field, clean (reviewer-assessed) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — e.color is internal event data masked &7, not user input |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — minimal change, no over-engineering (reviewer-assessed) |
| 9 | reviewer-rule-checker | Yes | findings | 1 (color-0 test gap, MEDIUM) | confirmed 1, dismissed 0, deferred 0 |

**All received:** Yes (2 enabled returned; 7 disabled pre-filled per settings)
**Total findings:** 1 confirmed (non-blocking MEDIUM), 0 dismissed, 0 deferred

### Rule Compliance (TypeScript lang-review checklist + project rules)

Exhaustive enumeration over every new type/field/function in the diff. Cross-checked
against `rule_checker` (25 instances, 16 rule sets):

- **#1 Type-safety escapes** — COMPLIANT. No `as any`, `as unknown as`, `@ts-ignore`, or non-null `!`. The `LEVEL_COLORS[fx.zapFlash % …]` access needs no `!` because TS narrows `zapFlash` to `number` inside the `!= null` branch.
- **#2 Generic/interface** — COMPLIANT. `Fx.zapFlash` is declared `readonly`; `detect()` keeps its `readonly GameEvent[]` param. No `Record<string,any>`/`object`/`Function`.
- **#3 Enums** — N/A. No new enums; event consumption uses `e.type ===` if-chains (matches existing style), so no `assertNever` is triggered.
- **#4 Null/undefined (CRITICAL)** — COMPLIANT and notable. The guard is `fx.zapFlash != null`, NOT `fx.zapFlash ?` / `|| color`. Index `0` is a valid hue (`LEVEL_COLORS[0]`='#1f8fff'); `0 != null === true`, so 0 correctly tints. The buggy `|| color` form (which would swallow 0) is absent. This is the one spot the whole feature hinges on, and it's correct.
- **#5 Module/declaration** — COMPLIANT. Test uses `import type { GameEvent }` for the type-only ref and runtime `import` for `createFx`/`initialState`. Bare specifiers match existing project convention.
- **#6 React/JSX** — N/A.
- **#7 Async/Promise** — N/A.
- **#8 Test quality** — 1 VIOLATION (MEDIUM): color index `0` untested (see findings). All four existing tests are non-vacuous with specific assertions; the `seededFx` sanity `toBeNull` is meaningful.
- **#9 Build/config** — N/A (no config changes; strict mode untouched).
- **#10 Security input validation** — COMPLIANT. `e.color` is a typed field on a core-emitted event, masked `& 7` (ROM-faithful clamp, not a security boundary). No user input, no `JSON.parse as T`.
- **#11 Error handling** — N/A.
- **#12 Performance/bundle** — COMPLIANT. `render()` runs at 60 FPS; the addition is one property read + one null-check + one modulo + one array index, all O(1), no allocation, no stringify.
- **#13 Fix-regressions** — N/A (feature, not a fix).
- **Project A1 — core purity** — COMPLIANT. Shell-only diff (`fx.ts`, `render.ts`, test); no `src/core/` file modified; imports flow shell→core only.
- **Project A2 — events are DATA** — COMPLIANT. `if (e.type === 'superzapper-flash') { zapFlash = e.color & 7 }` reads the event via its discriminant and discards it; not stored, not a callback.
- **Project A3 — comment accuracy** — COMPLIANT. The `Fx.zapFlash` JSDoc, the detect-reset comment, and the render block-comment (which quotes events.ts verbatim) all match the implementation.

### Observations (≥5)

- `[VERIFIED]` Falsy-zero trap avoided — `render.ts` uses `fx.zapFlash != null ? LEVEL_COLORS[fx.zapFlash % LEVEL_COLORS.length] : color`. Evidence: `0 != null` is `true`, so the valid index 0 tints; the `|| color` anti-pattern is not present. (Also `[RULE]`-confirmed, #4.)
- `[VERIFIED]` Clean per-frame revert — `fx.ts` sets `zapFlash = null` before the events loop on every `detect()`; `detect()` runs each frame (`main.ts:58`) with no early return before the reset, so the well reverts to the level colour the first frame no flash event arrives. Evidence: reset line + the "reverts to null" unit test.
- `[VERIFIED]` `[EDGE]` Warp transition is clean (edge-hunter disabled → reviewer-assessed) — `stepZap` is only called inside `stepPlaying` (sim.ts:633), which the mode switch runs for `playing`/`attract` only; the `warp` case (sim.ts:749-752) calls `stepWarp`, never `stepZap`. So `superzapper-flash` cannot emit during the dive; at most the single level-clearing frame tints once (correct — that zap cleared the board). No tint bleed into warp.
- `[VERIFIED]` Mask is bounds-safe — `e.color & 7` yields 0..7 for any integer (incl. negatives) and `% LEVEL_COLORS.length` re-bounds at the render site; `LEVEL_COLORS` is verified to have 8 entries (render.ts:18-21). No out-of-range array access. Unit test `flash(9)→1` pins the mask.
- `[VERIFIED]` `[SEC]` `[TYPE]` Shell-only, type-clean (security/type-design disabled → reviewer-assessed) — `zapFlash: number | null` is a `readonly` interface field; `e.color` is trusted internal event data, not user input; no `src/core/` file touched.
- `[VERIFIED]` `[SIMPLE]` `[DOC]` Minimal & well-documented (simplifier/comment-analyzer disabled → reviewer-assessed) — the change is the smallest wiring that satisfies the AC (no new abstractions, no dead code); all three new comment blocks accurately describe the code and quote the events.ts contract correctly.
- `[VERIFIED]` `[SILENT]` No silent failures (silent-failure-hunter disabled → reviewer-assessed) — no try/catch, no swallowed errors, no fallbacks that mask a failure; the only fallback is the intentional revert-to-level-colour, which is the spec'd behaviour.
- `[MEDIUM]` `[TEST]` `[RULE]` Color index `0` is untested at `tempest/tests/shell/fx.superzapper.test.ts:51` — the mask test (`flash(9)→1`) skips the falsy-0 boundary the `!= null` guard protects. Code is correct; coverage is thin. Non-blocking (Medium); logged as a Delivery Finding for follow-up.

### Devil's Advocate

Let me argue this code is broken. The most dangerous spot is the null/zero conflation: the feature's entire job is to distinguish "no flash" from "flash with the first palette hue," and the first hue's index is `0` — a falsy value. A careless author would have written `fx.zapFlash ? LEVEL_COLORS[fx.zapFlash] : color` or `fx.zapFlash || color`, and the well would silently refuse to tint on the exact frame the index cycled to 0, producing a one-frame flicker back to the level colour mid-strobe. So: did they fall into it? No — `!= null` is used, and `0 != null` is `true`. The trap is real, and it was avoided. But the *tests* never prove it: the suite never feeds `0`, so a future refactor that "simplifies" the guard to `||` would pass all four tests while silently breaking the 0 frame. That is the live risk, and it is exactly the confirmed finding — non-blocking only because the current code is correct.

What would a confused contributor misread? The reset `zapFlash = null` sits visually under a long comment paragraph about warp-spike-crash; someone editing that block could move the reset inside an `if` and break the per-frame revert. The comment mitigates this, and the revert test would catch it. What about a stressed runtime — huge `e.color`, negative, or float? `& 7` coerces via ToInt32 and masks to 0..7 for any of these; `% LEVEL_COLORS.length` double-bounds at the render site. No crash, no out-of-range. What about mode interactions — could a flash leak into attract, dying, gameover, highscore? Those modes don't run `stepZap`, and the framing modes `return` before `drawTube` entirely (render.ts:947-953). During `warp`, `drawTube` does run, but `zapFlash` is null there (no emitter), so `wellColor` falls back to `color`. What about the demo (attract self-play)? It runs `stepPlaying`, so the demo could fire the zapper and tint the attract-mode well — but attract returns before `drawTube`, so it's never drawn. No leak. What about performance — does a per-frame property read + modulo matter at 60 FPS? No, it's O(1) and allocation-free. I cannot find a correctness defect. The only thing the devil surfaces is the untested-0 risk already logged.

## Reviewer Assessment

**Verdict:** APPROVED

**Summary:** A minimal, correct, shell-only wiring of the deferred Superzapper well-color flash. The FX layer surfaces the core's `superzapper-flash` index (`& 7`) as `fx.zapFlash`, resetting it every frame so it reverts cleanly; the renderer maps the index to a `LEVEL_COLORS` hue and tints the whole well via `drawTube`. Two enabled subagents + my own analysis converge: implementation is correct; one non-blocking test-coverage gap.

**Dispatch coverage (all tags):**
- `[EDGE]` (disabled → reviewer): warp transition mode-gated, no flash bleed; mask bounds-safe — clean.
- `[SILENT]` (disabled → reviewer): no swallowed errors or masking fallbacks — clean.
- `[TEST]` (disabled → reviewer + `[RULE]`): MEDIUM, non-blocking — color index 0 untested (`fx.superzapper.test.ts:51`). Confirmed, logged as Delivery Finding.
- `[DOC]` (disabled → reviewer): comments accurate, events.ts quote verbatim — clean.
- `[TYPE]` (disabled → reviewer): `readonly number | null`, narrowed correctly — clean.
- `[SEC]` (disabled → reviewer): internal event data, masked, no user input — clean.
- `[SIMPLE]` (disabled → reviewer): smallest change that meets the AC — clean.
- `[RULE]` (reviewer-rule-checker, enabled): 25 instances / 16 rule sets, 1 finding (the color-0 test gap); all else compliant incl. the critical #4 null guard.

**Data flow traced:** core `sim.stepZap` → `s.events.push({type:'superzapper-flash', color: zapTimer & 7})` → `main.ts` loop passes `frameEvents` → `fx.detect` sets `zapFlash = e.color & 7` (reset to null each frame) → `render()` reads `fx.zapFlash`, maps to `LEVEL_COLORS[idx % 8]` → `drawTube` tints the well/web. Safe because every hop is typed data (no callbacks), the index is double-masked, and the null→0 distinction is preserved by `!= null`.

**Pattern observed:** Event-driven FX consumption via the `e.type` discriminant, mirroring the existing `enemy-death`/`warp-spike-crash`/`level-clear` handlers in `fx.detect` — `src/shell/fx.ts:186-193`. Consistent and idiomatic.

**Error handling:** No failure modes introduced — pure render wiring. Out-of-range/negative/float `color` is neutralised by `& 7` and `% length`; the only fallback (revert to level colour on `null`) is the spec'd behaviour.

**Visual AC (AC-3) note:** The on-screen tint is a canvas render unit tests can't assert. A reliable automated capture of *this* change was not feasible: the flash window is brief (~13 frames / ~0.22s, enemies-present only), and port :5273 may be bound by a different checkout (the project's documented multi-checkout/`strictPort` model), so a screenshot of the running server would not necessarily reflect this branch. Correctness is instead established by code inspection + the FX unit contract + the proven `drawTube` color path. A final human eyeball during play is recommended but not blocking.

**Deviation audit:** 1 deviation (LEVEL_COLORS reuse) — ACCEPTED. No undocumented deviations.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.