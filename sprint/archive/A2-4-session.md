---
story_id: "A2-4"
jira_key: ""
epic: "A2"
workflow: "tdd"
---
# Story A2-4: Mouse controls — left button fires, right button triggers hyperspace (suppress right-click context menu)

## Story Details
- **ID:** A2-4
- **Jira Key:** (none — local YAML tracking)
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-05T13:23:29Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-05T12:45:43Z | 2026-07-05T12:48:53Z | 3m 10s |
| red | 2026-07-05T12:48:53Z | 2026-07-05T12:57:47Z | 8m 54s |
| green | 2026-07-05T12:57:47Z | 2026-07-05T13:08:07Z | 10m 20s |
| review | 2026-07-05T13:08:07Z | 2026-07-05T13:23:29Z | 15m 22s |
| finish | 2026-07-05T13:23:29Z | - | - |

## TEA Assessment

**Tests Required:** Yes
**Reason:** New input-handling behavior (mouse → core Input mapping), not docs/config/deps/pure-refactor.

**Test Files:**
- `asteroids/tests/input-controller.test.ts` — new suite covering `createInputController`'s mouse behavior (this story) plus a keyboard regression pin (pre-existing behavior, previously untested at the shell layer)

**Acceptance criteria defined this phase** (none were recorded in sprint YAML; epic context deferred AC definition to TEA per `context-story-A2-4.md`):
- AC-1: Left mouse button held on the canvas sets `fire: true`; releasing (even off-canvas) clears it.
- AC-2: Right mouse button held on the canvas sets `hyperspace: true`; releasing clears it.
- AC-3: `contextmenu` on the canvas is `preventDefault()`-ed — no browser right-click menu.
- Guard: middle button (button 1) triggers neither control.
- Guard: mouse and keyboard controls OR together without interfering (releasing one while the other is still held keeps the control active).
- Guard: `window blur` releases any held mouse button, so a control cannot stick "on" across an alt-tab.

**Tests Written:** 25 tests (14 keyboard regression-pin cases via `it.each`, 11 new mouse-behavior cases) covering all 6 ACs/guards above.
**Status:** RED — 8 runtime failures + 1 `tsc` arity error (`createInputController(target)` — current signature takes no argument), confirmed via `testing-runner`. All 673 pre-existing tests (656 prior + 14 keyboard-regression + 3 mouse guard tests that trivially hold before mouse code exists) remain green — no regressions.

### Rule Coverage

Scope is a small, self-contained DOM-event wiring change in `src/shell/` (no core/, no React, no async, no enums, no user-facing data model). Most of the TypeScript lang-review checklist doesn't apply; the rows below are the ones with real surface area.

| Rule | Test(s) | Status |
|------|---------|--------|
| #1 Type safety escapes (no `as any`/non-null on nullable) | Test file itself uses one narrow `as unknown as HTMLElement` cast on the fake bus (`build()`), matching the identical, already-reviewed pattern in `tempest/tests/shell/input.test.ts` — no `as any` anywhere | N/A — pattern precedent, not a new escape |
| #4 Null/undefined handling | No optional fields on `Input`; nothing to test | N/A |
| #8 Test quality (no vacuous assertions) | Self-checked: every `it` block asserts a specific boolean value, no `let _ =` / bare truthy checks | pass (self-check) |
| #11 Error handling | No throwing/catching code in this feature | N/A |

**Rules checked:** 4 of 13 applicable; the remaining 9 (enums, generics, React/JSX, async, modules, build-config, input-validation, performance, fix-regressions) have no surface in this story's diff.
**Self-check:** 0 vacuous tests found.

**Handoff:** To Dev for implementation.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `asteroids/src/shell/input.ts` — `createInputController` now takes a `target: HTMLElement`; adds `mouseFireHeld`/`mouseHyperspaceHeld` state driven by `mousedown` (target)/`mouseup` (window), a `contextmenu` handler on `target` that suppresses the browser menu, and a `blur` handler (window) that releases both held mouse buttons. `sample()` ORs the mouse state into the existing keyboard-derived `fire`/`hyperspace` booleans — no change to the `Input` shape.
- `asteroids/src/main.ts` — one-line call-site update: `createInputController(canvas)` instead of `createInputController()`.

**Tests:** 681/681 passing (GREEN), `tsc --noEmit` clean. Verified via `testing-runner` both before (RED, 8 failing) and after (GREEN, all passing) implementation.

**Manual verification:** Ran the dev server (`npm run dev`, port 5275) and drove the live game with Playwright — dispatched a real `mousedown(button:0)` on the canvas mid-game and confirmed a bullet fired and destroyed a saucer (score 0 → 240); dispatched a `contextmenu` event on the canvas and confirmed `defaultPrevented` was `true` (no browser context menu). Comrade separately confirmed manually in-browser that both mouse buttons work as expected.

**Branch:** `feat/A2-4-mouse-controls` (pushed to origin)

**Handoff:** To Reviewer for code review.

## Subagent Results

Only `preflight`, `test_analyzer`, and `rule_checker` are enabled via `workflow.reviewer_subagents` (checked with `pf settings get workflow.reviewer_subagents`); the other six are disabled project-wide and pre-filled below per protocol.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (0 code smells; 681/681 tests; tsc clean) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 6 | confirmed 1, downgraded-and-tracked 1, dismissed 1 (already tracked by TEA), noted-non-blocking 3 |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations / 13 rules / 24 instances checked | N/A |

**All received:** Yes (3 ran, 6 pre-filled disabled)
**Total findings:** 1 confirmed (medium), 1 downgraded-to-low-and-tracked, 1 dismissed (with rationale), 3 noted non-blocking (low)

## Reviewer Assessment

**Verdict:** APPROVED

### Rule Compliance

`[RULE]` `reviewer-rule-checker` ran an exhaustive check of all 13 `lang-review/typescript.md` rules against every instance in the diff (24 instances across `src/main.ts`, `src/shell/input.ts`, `tests/input-controller.test.ts`). I independently re-read the full diff and confirm its inventory is complete (no enums/structs/traits exist in this diff — it's plain function-level DOM event wiring). asteroids/ has no SOUL.md, CLAUDE.md, or `.claude/rules/*.md` of its own, so no additional project rules apply beyond this checklist. Per-rule, per-instance results:

**Rule #1 (Type safety escapes — `as any`, `as unknown as T`, `@ts-ignore`, unsafe non-null):**
- `build()` cast `target as unknown as HTMLElement` (`tests/input-controller.test.ts:50`) — **compliant**: established repo-wide convention for stubbing DOM elements in Vitest's `node` env (identical cast in `tests/storage.test.ts:74`, `tests/render.test.ts:76`, `tests/render-hud.test.ts:60`, `tests/margin-mask.render.test.ts:72`), confined to test-mock injection, not production code.
- No `as any`, `@ts-ignore`, or non-null assertion anywhere else in the 3 changed files — **compliant**.

**Rule #2 (Generic/interface pitfalls — `Record<string,any>`, bare `Function`, missing `readonly`):**
- `makeBus()` handler map `Record<string, ((e: unknown) => void)[]>` (`tests/input-controller.test.ts:23`) — **compliant**: uses `unknown`, not `any`.
- `MOUSE_BUTTON = { left: 0, right: 2 } as const` (`src/shell/input.ts:39`) — **compliant**: immutable literal, mirrors the existing `KEYS` convention.

**Rule #3 (Enum anti-patterns):** 0 instances — no `enum` declared anywhere in the diff (confirmed via grep); `MOUSE_BUTTON` deliberately uses `as const` instead, consistent with existing `KEYS` — rule not triggered.

**Rule #4 (Null/undefined — `||` vs `??` on nullable):**
- `fire: any(KEYS.fire) || mouseFireHeld` and `hyperspace: any(KEYS.hyperspace) || mouseHyperspaceHeld` (`src/shell/input.ts:80-81`) — **compliant**: both operands are strict booleans (no falsy-but-valid `0`/`""` case), so `||` is correct boolean-OR, not a nullish-defaulting bug.
- `(handlers[type] ||= []).push(cb)` (`tests/input-controller.test.ts:26`) — **compliant**: arrays are always truthy, `||=` only ever fires on `undefined`.

**Rules #5-#13:** 0 applicable instances each (no barrel imports, no enums/generics needing exhaustiveness, no `.tsx`, no async/Promise code, no build/config changes, no user-input/API boundary, no try/catch, no bundle-size-sensitive imports, no prior-fix commits to re-scan) — correctly reported as not-applicable rather than skipped.

The one pattern worth recording explicitly (not a violation — see Rule #1 above): the `as unknown as HTMLElement` stub cast is a systemic, already-established convention across 5 test files, not something introduced by this story. Logged as a non-blocking Delivery Finding for a possible future test-infra cleanup (a shared narrow-interface DOM-stub type), not a defect in this PR.

**Disabled specialist domains (not run this cycle, per `workflow.reviewer_subagents` settings — confirmed via `pf settings get`):**
- `[EDGE]` Disabled — edge-hunter did not run. I manually covered boundary conditions in Hard Questions/Devil's Advocate below (rapid re-press, multi-button overlap, blur timing).
- `[SILENT]` Disabled — silent-failure-hunter did not run. No error-swallowing surface exists in this diff (no try/catch, no Result/Option handling) — manually confirmed by reading the full diff.
- `[DOC]` Disabled — comment-analyzer did not run. I manually checked the new/changed comments (`src/shell/input.ts:7-12`, inline `contextmenu`/`blur` comments) against the actual code — accurate, not stale, and match this project's WHY-only comment convention.
- `[TYPE]` Disabled — type-design did not run. `reviewer-rule-checker`'s Rule #1/#2 checks above cover the type-safety surface that would otherwise be this specialist's concern; no missing newtypes or stringly-typed APIs apply to boolean DOM-event state.
- `[SEC]` Disabled — security specialist did not run. See Security Analysis below — N/A, client-only single-player game, no tenant/auth/network surface.
- `[SIMPLE]` Disabled — simplifier did not run. I manually reviewed for over-engineering: the diff adds exactly 2 booleans + 4 listeners, no abstraction beyond what the 3 ACs + 3 guards require — matches minimalist-discipline.

### Data Flow Trace

Real left-click on the canvas → `target.addEventListener('mousedown', ...)` (`src/shell/input.ts:54`) sets `mouseFireHeld = true` → next `loop` tick calls `input.sample()` (`src/shell/input.ts:76-84`) → returns `fire: any(KEYS.fire) || mouseFireHeld` → passed into `stepGame(state, frameInput, dt)` in the untouched pure core, which applies its own existing fire-debounce (shift register, unrelated to this diff) → bullet spawns → renderer draws it. I manually exercised this exact path with Playwright against the live dev server: dispatching a real `mousedown(button:0)` on the canvas mid-game destroyed a saucer and the score jumped 0 → 240 (see Dev Assessment). Comrade separately confirmed with a real mouse that both buttons work. This is a purely client-side, single-player flow — no network, no auth, no tenant boundary to cross.

### Pattern Observed

`src/shell/input.ts:41-69` faithfully mirrors the sibling-game convention already established in `tempest/src/shell/input.ts:10-47`: bind press-initiating events (`mousedown`, `contextmenu`) to the passed-in `target`, bind release/safety events (`mouseup`, `blur`) to `window`. This is a good, consistent cross-repo pattern (documented in the file's own header comment, `src/shell/input.ts:9-12`) — TEA's design-deviation entry correctly cites this precedent rather than inventing a new convention.

### Error Handling

No new error paths are introduced — DOM `addEventListener` callbacks don't throw under normal operation, and none of the new handlers touch anything that can fail (no I/O, no parsing, no external data). `canvas` itself (`src/main.ts:22`) is obtained via a pre-existing, unchanged `getElementById('game') as HTMLCanvasElement` — the same trust assumption (element exists in `index.html`) that predates this diff.

### Security Analysis

N/A — this is a client-only, single-player Canvas game with no backend, no authentication, and no multi-tenant concept anywhere in the codebase (confirmed: no `tenant`, `auth`, or session-handling code exists in `asteroids/src/`). The tenant-isolation checklist item in my review instructions does not apply here; noting this explicitly rather than silently skipping it.

### Hard Questions

- **Null canvas?** Pre-existing risk (`getElementById` could return null), unchanged by this diff — not introduced or worsened here.
- **Race conditions?** Each mouse button drives an independent boolean (`mouseFireHeld`/`mouseHyperspaceHeld`), set/cleared by mutually-exclusive `if/else if` branches keyed on `e.button`. Single-threaded JS event loop — no interleaving hazard.
- **Rapid double-click / rapid release-repress?** Booleans are plain assignments (not a toggle or state machine), so a second `mousedown` after a `mouseup` behaves identically to the first — no accumulation bug possible by construction. [TEST] flagged this as an untested-but-low-risk case; I agree with "low," see Test Coverage below.
- **Real right-click vs. synthetic dispatch?** The unit tests and my own Playwright verification only dispatch synthetic `contextmenu`/`mousedown` events. Comrade independently verified with a genuine mouse that right-click triggers hyperspace and does not open a context menu — this closes the residual gap between synthetic and real hardware-level right-click behavior across browsers.

### Test Coverage — `[TEST]` findings from reviewer-test-analyzer

1. **CONFIRMED (medium):** `missing-negative` — the AC-1/AC-2 mouse tests (`tests/input-controller.test.ts:85-126`) assert only the field under test (`.fire` or `.hyperspace`), never that the other four `Input` fields stay `false`. A regression where a mouse handler accidentally touched `left`/`right`/`thrust`/`start` would slip through untested. Real gap, worth a fast-follow test improvement — does not block this PR (no such regression exists in the shipped code; `src/shell/input.ts:76-84` only ever assigns `fire`/`hyperspace` from mouse state).
2. **Downgraded to low, tracked (not blocking):** `incomplete-mock` — the `as unknown as HTMLElement` stub only implements `addEventListener`, not the full `HTMLElement` surface. Valid observation, but per Rule Compliance above this is a systemic, pre-existing repo-wide convention (4+ other test files), not something introduced by or unique to this PR. Logged as a Delivery Finding for a possible future test-infra cleanup story, not a blocker here.
3. **DISMISSED:** blur-releases-keyboard gap — TEA already logged this exact gap as a non-blocking Improvement in Delivery Findings ("the keyboard path has no window blur handling... Out of scope for A2-4"). The guard's `describe` block is correctly scoped ("window blur releases held **mouse** buttons (guard)", `tests/input-controller.test.ts:190`) — it does not claim to cover keyboard. Not a new finding; already tracked.
4. **Noted, non-blocking (low):** rapid mousedown→mouseup→mousedown re-press untested; three-way mouse+mouse+keyboard overlap untested; browser back/forward buttons (3/4) untested. All low-risk given the plain-assignment implementation (see Hard Questions above) and outside this story's stated ACs. Not required for approval.

### Devil's Advocate

Could this be broken in a way the tests and manual checks missed? A confused user holding the left button while dragging the cursor entirely off the game canvas onto the browser chrome, then releasing — does fire get stuck "on"? No: `mouseup` is bound to `window` (`src/shell/input.ts:58`), not `target`, specifically so a release anywhere in the viewport clears it; `tests/input-controller.test.ts:100-110` pins exactly this. What about a malicious page embedding this game in an iframe and stealing focus programmatically to strand a held button? `blur` on `window` fires for both tab switches and programmatic focus loss in every evergreen browser, and is tested (`tests/input-controller.test.ts:190-203`) — though notably it only releases the *mouse* flags, not the keyboard `held` Set, so a held key at blur-time would still stick (a real, pre-existing gap, already tracked by TEA, out of scope here). Could a stressed/rapid-fire user (mashing the button) desync `mouseFireHeld` from the true hardware state? No — every `mousedown`/`mouseup` is a plain, idempotent assignment; there's no counter or toggle to desync. Could the test suite's fake-bus stub be lying to us — passing tests while the real DOM binding is wrong? I checked this specifically: `target` and `windowBus` in the test file are two independently-tracked handler maps, so a test asserting on `target.emit('mousedown', ...)` would fail if the implementation had (incorrectly) bound `mousedown` to `window` instead — the stub cannot produce a false-positive on this specific question. The largest genuine residual risk was real-hardware right-click behavior (OS-level context-menu timing quirks across Chrome/Firefox/Safari) since my own verification only dispatched synthetic events — this is closed by Comrade's own manual confirmation with a real mouse.

### Verified Claims

- `[VERIFIED]` Mouse press-initiating events bind to `target` (the canvas), not `window` — evidence: `src/shell/input.ts:54` (`target.addEventListener('mousedown', ...)`), `:65` (`target.addEventListener('contextmenu', ...)`). No project rule (lang-review/typescript.md, checked in full — see Rule Compliance above) governs DOM event-target binding, so no applicable rule beyond general correctness. Cross-checked against `[TEST]`: reviewer-test-analyzer independently examined the same wiring and confirmed "this does correctly pin the target-vs-window wiring... not a false-confidence mock in that respect" — no contradiction.
- `[VERIFIED]` Release/safety events bind to `window`, not `target` — evidence: `src/shell/input.ts:58` (`mouseup`), `:68` (`blur`) — intentional per the file's own header comment (`:9-12`) so an off-canvas release or alt-tab still clears held state. `tests/input-controller.test.ts:100-110` (drag-off) and `:190-203` (blur) pin this. No applicable project rule beyond lang-review/typescript.md (fully checked, 0 violations); no subagent flagged this area as incorrect.
- `[VERIFIED]` Core simulation boundary untouched — evidence: `git diff develop...HEAD --stat` (asteroids) shows only `src/main.ts`, `src/shell/input.ts`, `tests/input-controller.test.ts` changed; zero files under `src/core/`. Complies with epic-A2 guardrail "core sim (`src/core/`) remains untouched" (`sprint/context/context-epic-A2.md:45`) — the highest-authority project rule applicable to this diff per the spec-authority hierarchy. `[RULE]` reviewer-rule-checker's inventory step likewise found no core-boundary-relevant changes to flag.
- `[VERIFIED]` No type-safety regressions — evidence: `src/shell/input.ts:39` (`MOUSE_BUTTON` `as const`, not a raw magic-number comparison), `:80-81` (`||` used only on strict-boolean operands, not nullable values), `tests/input-controller.test.ts:50` (the one `as unknown as HTMLElement` cast, confined to test-mock injection). `[RULE]` reviewer-rule-checker independently checked these same lines plus the rest of the diff against all 13 lang-review/typescript.md rules (24 instances total), 0 violations (full per-rule breakdown in Rule Compliance above); `tsc --noEmit` clean per reviewer-preflight. Complies with all 13 rules in lang-review/typescript.md.
- **Challenged:** `[TEST]` flagged the `as unknown as HTMLElement` stub (`tests/input-controller.test.ts:50`) against lang-review rule #1 (double-cast bypass) at `medium` confidence. I do not mark this VERIFIED-clean outright — instead I explicitly downgrade to a tracked, non-blocking observation (see Test Coverage above) rather than dismiss it, because `[RULE]`'s compliance verdict rests on documented precedent (4+ other files use the identical cast), which I independently confirmed by grep, not on my own unchecked judgment.

### Deviation Audit

See `## Design Deviations` → `### Reviewer (audit)` below.

**Handoff:** To SM for finish-story

Story A2-4 sets up mouse-based controls for Asteroids: left mouse button
fires, right mouse button triggers hyperspace, and the browser's default
right-click context menu must be suppressed on the game canvas so the
right button reads as a game input instead of opening a menu.

**Technical approach:** input handling lives in `asteroids/src/shell`
(shell owns render/audio/io per repo convention); wire `mousedown`/`mouseup`
(or `contextmenu` prevention) listeners on the canvas alongside the existing
keyboard input path, mapping left-click → fire and right-click → hyperspace,
and call `preventDefault()` on `contextmenu` so right-click doesn't pop the
OS/browser menu. No acceptance criteria were recorded in the sprint YAML;
TEA will define them during the RED phase based on this story title and the
epic's playtest-followup intent (epic A2 — polish/clarity fixes surfaced by
playing the shipped Asteroids slice).

Session and story context files created; no Jira integration in this
project (local YAML tracking only). Feature branch `feat/A2-4-mouse-controls`
created in the `asteroids` subrepo off `develop`.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->
### TEA (test design)
- **Improvement** (non-blocking): `src/shell/input.ts`'s `createInputController` had zero direct test coverage before this story — only the core `Input` type/`NO_INPUT` shape was pinned (`tests/input.test.ts`). `tests/input-controller.test.ts` now pins the pre-existing keyboard behavior alongside the new mouse ACs. *Found by TEA during test design.*
- **Improvement** (non-blocking): the keyboard path has no `window blur` handling — a held key (e.g. thrust) can stick "on" if focus is lost mid-press (alt-tab), the same class of bug this story's mouse controls guard against via a `blur` listener. Out of scope for A2-4 (mouse-only story); worth a follow-up story if it's ever observed live. Affects `src/shell/input.ts` (keydown/keyup handlers have no blur-triggered release). *Found by TEA during test design.*

### Dev (implementation)
- No upstream findings during implementation.

### Reviewer (code review)
- **Improvement** (non-blocking): the mouse-behavior tests (AC-1/AC-2) assert only the field under test, never that the other `Input` fields stay `false`. Affects `asteroids/tests/input-controller.test.ts` (add a full-sample assertion per new mouse behavior to guard against a handler accidentally touching an unrelated field). *Found by Reviewer during code review (via reviewer-test-analyzer).*
- **Improvement** (non-blocking): the `as unknown as HTMLElement` fake-DOM-stub cast pattern is repeated across at least 5 test files now (`tests/input-controller.test.ts`, `tests/storage.test.ts`, `tests/render.test.ts`, `tests/render-hud.test.ts`, `tests/margin-mask.render.test.ts`) with no shared narrow-interface type to bound what's actually mocked. Affects the whole `asteroids/tests/` suite (a shared minimal DOM-stub type/helper would let TypeScript catch a stub/implementation mismatch instead of deferring it to a runtime `TypeError`). *Found by Reviewer during code review (via reviewer-test-analyzer).*

## Impact Summary

**Upstream Effects:** 2 findings (0 Gap, 0 Conflict, 0 Question, 2 Improvement)
**Blocking:** None

- **Improvement:** the keyboard path has no `window blur` handling — a held key (e.g. thrust) can stick "on" if focus is lost mid-press (alt-tab), the same class of bug this story's mouse controls guard against via a `blur` listener. Out of scope for A2-4 (mouse-only story); worth a follow-up story if it's ever observed live. Affects `src/shell/input.ts`.
- **Improvement:** the mouse-behavior tests (AC-1/AC-2) assert only the field under test, never that the other `Input` fields stay `false`. Affects `asteroids/tests/input-controller.test.ts`.

### Downstream Effects

Cross-module impact: 2 findings across 2 modules

- **`asteroids/tests`** — 1 finding
- **`src/shell`** — 1 finding

### Deviation Justifications

1 deviation

- **`createInputController` gains a required `target: HTMLElement` parameter**
  - Rationale: mirrors the established sibling-game pattern (`tempest/src/shell/input.ts` already does exactly this for its mouse-fire control), so Dev has a working precedent to port rather than inventing a new convention. `main.ts` must be updated to pass `canvas` at the call site.
  - Severity: minor
  - Forward impact: minor — Dev updates `createInputController`'s signature and the one call site in `src/main.ts`; no core (`src/core/`) changes required, `Input` keeps its existing six fields.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->
### TEA (test design)
- **`createInputController` gains a required `target: HTMLElement` parameter**
  - Spec source: context-story-A2-4.md (no ACs recorded in sprint YAML) and context-epic-A2.md's cross-story guardrail ("Input: `createInputController()` in `src/shell/input.ts` maps keydown/keyup → core `Input`")
  - Spec text: the epic guardrail describes the existing zero-arg keyboard-only signature; it does not anticipate a bind target for mouse events.
  - Implementation: tests require `createInputController(target)`, where `target` is the canvas — mousedown/contextmenu bind to `target`, mouseup/blur bind to `window` (release-outside-target and alt-tab safety).
  - Rationale: mirrors the established sibling-game pattern (`tempest/src/shell/input.ts` already does exactly this for its mouse-fire control), so Dev has a working precedent to port rather than inventing a new convention. `main.ts` must be updated to pass `canvas` at the call site.
  - Severity: minor
  - Forward impact: minor — Dev updates `createInputController`'s signature and the one call site in `src/main.ts`; no core (`src/core/`) changes required, `Input` keeps its existing six fields.
  - → ✓ **ACCEPTED** by Reviewer: matches established `tempest/src/shell/input.ts` precedent exactly; `main.ts` call site was updated correctly (`createInputController(canvas)`); no core changes leaked in.

### Dev (implementation)
- No deviations from spec. Implemented exactly what TEA's failing tests specified: `createInputController(target)` takes the canvas, mousedown/contextmenu bind to `target`, mouseup/blur bind to `window`; `main.ts`'s one call site updated to `createInputController(canvas)`. All 681 tests green, `tsc --noEmit` clean.
  - → ✓ **ACCEPTED** by Reviewer: verified — implementation matches TEA's tests exactly, no unlogged simplification found in the diff.

### Reviewer (audit)
- No undocumented deviations found. I independently read the full diff and cross-referenced it against `context-story-A2-4.md` and `context-epic-A2.md`; every divergence from the pre-story codebase (the `createInputController` signature change) was already logged by TEA and correctly implemented by Dev. No additional spec drift detected.