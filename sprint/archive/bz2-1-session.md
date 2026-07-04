---
story_id: "bz2-1"
jira_key: "bz2-1"
epic: "bz2"
workflow: "tdd"
---
# Story bz2-1: Fixed aspect ratio — stop full-width canvas stretch, letterbox to a pinned ratio

## Story Details
- **ID:** bz2-1
- **Jira Key:** bz2-1
- **Epic:** bz2 (Battlezone — playtest followup)
- **Workflow:** tdd (phased: red → green → review → finish)
- **Type:** bug
- **Points:** 2
- **Priority:** p2
- **Stack Parent:** none
- **Repository:** battlezone

## Problem Statement

During the first live playtest of bz1 (through bz1-8), testers reported that the canvas stretches to fill the full browser width, destroying the intended arcade cabinet aspect ratio. The game should pin the canvas to a fixed aspect ratio (likely 4:3 or similar, matching arcade standards) and letterbox it — centering the game viewport with black bars filling the leftover space.

## Technical Approach

The issue lives in the `resize()` function in `src/main.ts` (lines 58-67), which currently:
1. Sets `canvas.width` and `canvas.height` to the full window dimensions
2. Applies corresponding CSS `width`/`height` to match, causing full-window stretch
3. Contains no aspect ratio pinning or letterboxing logic

**Implementation points:**
1. **Define target aspect ratio:** Likely 4:3 (0.75) based on arcade cabinet standards; confirm in playtest or reference material
2. **Calculate constrained dimensions:** Compute the maximum canvas size that fits in the viewport while maintaining the pinned ratio
3. **Center and letterbox:** Use CSS `display: flex` on the body or container to center the canvas, letting the black background show as letterbox bars
4. **Maintain pixel-perfect rendering:** Preserve the `devicePixelRatio` scaling for crisp rendering on HiDPI displays
5. **Handle resize events:** The existing `window.addEventListener('resize', resize)` wire stays, but the function's logic changes

## Key Files to Modify

| File | Purpose |
|------|---------|
| `src/main.ts` | Rewrite `resize()` function to calculate aspect-ratio-constrained dimensions and apply centering |
| `index.html` | Update CSS to use flexbox centering (body/container flex layout) so letterbox bars show on sides/top/bottom |

## Acceptance Criteria

1. Canvas maintains a pinned aspect ratio (4:3 or confirmed standard) regardless of browser window width/height
2. Letterbox bars (black) fill empty space on either sides (portrait orientation) or top/bottom (landscape)
3. Game viewport scales cleanly to fit the available space without distortion
4. Text and vector rendering remain crisp at all window sizes (HiDPI scaling preserved)
5. Resize events update the canvas and styling correctly without layout jank
6. Playtest confirmation: aspect ratio feels correct and letterboxing is visually stable

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-04T15:56:34Z
**Phase Owner:** tea

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-04T15:30:11Z | 2026-07-04T15:30:11Z | instant |
| red | 2026-07-04T15:30:11Z | 2026-07-04T15:41:19Z | 11m 8s |
| green | 2026-07-04T15:41:19Z | 2026-07-04T15:47:57Z | 6m 38s |
| review | 2026-07-04T15:47:57Z | 2026-07-04T15:56:34Z | 8m 37s |
| finish | 2026-07-04T15:56:34Z | - | - |

## Delivery Findings

No upstream findings at setup time.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Question** (non-blocking): The story hedges the pinned ratio as "likely 4:3"; the RED suite pins `TARGET_ASPECT = 4/3` (the documented arcade-cabinet default, width/height). Affects `src/shell/viewport.ts` (the `TARGET_ASPECT` constant) — confirm 4:3 is the intended Battlezone cabinet ratio during the bz2-6 live playtest and, if not, change the single constant plus its one tripwire test (`TARGET_ASPECT is the 4:3 cabinet ratio`); the fit-math tests are ratio-agnostic and need no change. *Found by TEA during test design.*
- **Gap** (non-blocking): AC-2's visible letterbox bars require `index.html` to CENTER the canvas so the black page shows through as bars (the page background is already `#000`). This is a DOM/layout concern the `node` test env cannot observe, so it is NOT unit-tested here and is easy to miss. Affects `battlezone/index.html` (add canvas-centering CSS — e.g. body flex / `place-items: center`, or margin auto). Verified visually in bz2-6. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): For non-4:3 windows the letterboxed CSS box is fractional (e.g. a 1000px-tall window → 1333.33px wide), so `canvas.style.width` carries sub-pixel px and the integer backing store is scaled to a fractional CSS box — usually imperceptible, but can soften the canvas edge on some displays. Affects `src/shell/viewport.ts` (`applyLetterbox` could round CSS dims to whole/half pixels). Deliberately left unrounded per minimalist scope (no test requires it, and rounding risks the exact-4:3 assertions); flag for a bz2-6 visual judgment call. *Found by Dev during implementation.*
- Resolved the TEA Question (4:3): implemented `TARGET_ASPECT = 4/3` as the pinned cabinet ratio per the story's documented default; final confirmation remains the bz2-6 playtest (single constant + one tripwire test to change if it moves).

### Reviewer (code review)
- No new upstream findings during code review. The two low observations in the assessment (`Letterbox` fields non-`readonly`; source-string wiring test is a brittle-but-deliberate tripwire) are in-scope nits, non-blocking, and left as optional polish. The bz2-6 items already tracked upstream (confirm the 4:3 constant, judge the sub-pixel-CSS softening) remain the correct owners of those open questions. *Found by Reviewer during code review.*

## Design Deviations

None yet — the story aligns with the acceptance criteria and technical approach.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Fit logic extracted into a new testable module instead of inlined in `resize()`**
  - Spec source: .session/bz2-1-session.md, "Key Files to Modify" (main.ts, index.html only) + "Technical Approach" #2
  - Spec text: "Rewrite `resize()` function to calculate aspect-ratio-constrained dimensions and apply centering"
  - Implementation: RED tests drive a NEW pure module `src/shell/viewport.ts` (`computeLetterbox` = pure fit math, `applyLetterbox` = thin DOM seam). `main.ts` `resize()` is reduced to calling `applyLetterbox(canvas, innerWidth, innerHeight, devicePixelRatio)` rather than owning the math inline.
  - Rationale: `main.ts` is a DOM bootstrap (top-level `document.getElementById('game')`) that cannot be imported under Vitest's `node` environment, so inline math would be untestable. Extracting a pure module makes the letterbox fit + HiDPI clamp exhaustively unit-testable and matches the repo's core-pure / shell-seam idiom.
  - Severity: minor
  - Forward impact: Dev creates `src/shell/viewport.ts` (a third file beyond the two named in the story) and wires `main.ts` to it; the module's API surface (`TARGET_ASPECT`, `MAX_DPR`, `computeLetterbox`, `applyLetterbox`) is fixed by the RED contract.
- **Canvas centering / visible bars left to the playtest, not unit-tested (partial AC-2 / AC-6 coverage)**
  - Spec source: .session/bz2-1-session.md, AC-2 and AC-6
  - Spec text: "Letterbox bars (black) fill empty space..." / "Playtest confirmation: aspect ratio feels correct and letterboxing is visually stable"
  - Implementation: Unit tests pin the canvas SIZE (CSS box < window, exact 4:3, HiDPI backing store) but NOT the `index.html` CSS that centers the canvas so the bars are actually visible, nor the subjective visual confirmation.
  - Rationale: canvas centering + visual bars are DOM/layout concerns Vitest's `node` env cannot observe; the epic explicitly verifies the shell "by running the game" (bz2-6). String-matching `index.html` for a specific centering technique would be brittle false confidence.
  - Severity: minor
  - Forward impact: Dev must still update `index.html` to center the canvas (page bg is already `#000`); the visual letterbox is confirmed in bz2-6. Captured as a Delivery Finding (Gap) above.

### Dev (implementation)
- No deviations from spec. Implemented `src/shell/viewport.ts` exactly to the TEA RED contract (`TARGET_ASPECT`, `MAX_DPR`, `computeLetterbox`, `applyLetterbox`), reduced `main.ts` `resize()` to a single `applyLetterbox` call, and centered the canvas in `index.html` via `body { display:flex; align-items:center; justify-content:center }` — the exact flexbox approach the story's Technical Approach #3 prescribed. Both TEA design deviations above (new module split, index.html centering) were already ratified in the RED phase; this phase realized them, so no new deviation is introduced.

### Reviewer (audit)
- **TEA Deviation 1 (fit logic extracted into `src/shell/viewport.ts` instead of inlined in `resize()`)** → ✓ ACCEPTED by Reviewer: the split is sound and idiomatic — `main.ts` is a top-level DOM bootstrap that cannot be imported under Vitest `node`, so a pure module is the only way to get the fit math + HiDPI clamp under exhaustive test; it mirrors the repo's established core-pure / shell-seam pattern. The third file is justified, not scope creep.
- **TEA Deviation 2 (canvas centering / visible bars deferred to bz2-6, not unit-tested)** → ✓ ACCEPTED by Reviewer: DOM layout + subjective "feels right" are genuinely unobservable under `node`, and the epic explicitly verifies the shell by running the game (bz2-6). Note Dev DID ship the `index.html` flex-centering, so the *code* is present and correct — only the *visual* confirmation is deferred. Deferral scoped correctly.
- **Dev "No deviations from spec"** → ✓ ACCEPTED by Reviewer: accurate — the implementation matches the RED contract and the story's Technical Approach exactly; both realized deviations were pre-ratified by TEA.
- No UNDOCUMENTED deviations found: the only file beyond the story's named two (`viewport.ts`) is already logged as TEA Deviation 1.

## TEA Assessment

**Tests Required:** Yes
**Reason:** Behavioral bug fix with deterministic, unit-testable math (aspect-ratio fit + HiDPI backing store). Not a chore-bypass candidate.

**Test Files:**
- `tests/shell/viewport.test.ts` — 18 tests across 5 groups pinning the letterbox contract for the (to-be-created) `src/shell/viewport.ts`.

**Tests Written:** 18 tests covering ACs 1–5 (AC-6 playtest is out of scope for node; deferred to bz2-6).
**Status:** RED (confirmed by testing-runner `bz2-1-tea-red`).

### RED Evidence
- `tests/shell/viewport.test.ts` FAILS on module resolution — `Cannot find module '../../src/shell/viewport'` (implementation absent). Suite import fails before any test body runs, which is the intended RED signal (same pattern sibling bz2-2 used).
- **No regressions:** 42 pre-existing test files / 693 tests still PASS. The only failing file is the RED target.

### AC Coverage

| AC | Requirement | Test(s) | Status |
|----|-------------|---------|--------|
| 1 | Pinned 4:3 ratio regardless of window size | `TARGET_ASPECT is the 4:3 cabinet ratio`, `holds the pinned ratio across a sweep…`, per-orientation cases | failing (RED) |
| 2 | Letterbox bars fill leftover space | `letterboxes a wide/tall/square window…`, `the fitted box never exceeds the window…`, `does NOT stretch a wide window to full width` | failing (RED) — *visible centering deferred to bz2-6 (see Deviations)* |
| 3 | Scales without distortion | `fills an exact-4:3 window…`, `keeps the backing store at 4:3 too…` | failing (RED) |
| 4 | HiDPI crispness preserved | `scales the backing store by the dpr`, `clamps dpr to MAX_DPR`, `respects a fractional dpr`, `falls back to dpr 1 when 0/falsy`, `integer backing store…` | failing (RED) |
| 5 | Resize updates canvas + styling correctly | `applyLetterbox` group (writes buffer to width/height, CSS px to style, returns applied box) | failing (RED) |
| 6 | Playtest confirmation | — (manual; bz2-6) | out of scope |

### Rule Coverage (lang-review/typescript.md)

| Rule | Test(s) | Status |
|------|---------|--------|
| #4 null/undefined — `x \|\| default` on falsy-but-valid values | `falls back to dpr 1 when devicePixelRatio is 0 or falsy` (pins the `rawDpr \|\| 1` fallback intent) | failing (RED) |
| #4/#8 paranoia — no NaN leakage from degenerate input | `a zero-height window…`, `a zero-width window…` (division-by-zero guard) | failing (RED) |
| #8 test quality — meaningful assertions, no `as any` | self-check: every test asserts concrete values; fake canvas is structurally typed (no `as any`) | pass (self-check) |
| #1 type-safety escapes | no `as any`/`@ts-ignore`/non-null assertions introduced in tests | pass (self-check) |

**Rules checked:** The applicable checks for a pure numeric shell module are #4 (null/undefined) and #8 (test quality); both have coverage. #6 (React/JSX), #7/#11 (async/error), #10 (input validation) are N/A — synchronous pure math, no user input, no async, no JSX.
**Self-check:** 0 vacuous tests. Every `it` asserts concrete values or a NaN/ratio invariant; the one source-grep wiring test (`main.ts` imports `applyLetterbox`) is a deliberate tripwire for the un-importable DOM bootstrap, documented inline.

### Contract handed to Dev (`src/shell/viewport.ts`)
```
export const TARGET_ASPECT = 4 / 3   // pinned cabinet ratio, width / height
export const MAX_DPR = 2              // HiDPI backing-store cap (matches old resize())
export interface Letterbox  { cssWidth; cssHeight; bufferWidth; bufferHeight }
export interface CanvasLike { width; height; style: { width; height } }
export function computeLetterbox(windowW, windowH, rawDpr, aspect = TARGET_ASPECT): Letterbox
export function applyLetterbox(canvas: CanvasLike, windowW, windowH, rawDpr, aspect?): Letterbox
```
- `computeLetterbox`: largest `aspect` box fitting the window; buffer = css × `min(MAX_DPR, rawDpr || 1)`, floored.
- `applyLetterbox`: computes, writes buffer→`canvas.width/height`, `${css}px`→`canvas.style`, returns the box.
- `main.ts` `resize()` → one call to `applyLetterbox(canvas, window.innerWidth, window.innerHeight, window.devicePixelRatio)`; plus `index.html` centering (Delivery Finding Gap).

**Handoff:** To Dev (Yoda) for GREEN — implement `src/shell/viewport.ts` to the contract, wire `main.ts`, and center the canvas in `index.html`.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/shell/viewport.ts` (new) — pure letterbox module: `TARGET_ASPECT = 4/3`, `MAX_DPR = 2`, `computeLetterbox()` (largest 4:3 box fitting the window + HiDPI backing store, floored to whole device pixels), and the `applyLetterbox()` DOM seam. Zero `as any` / `@ts-ignore` / non-null assertions.
- `src/main.ts` — added `import { applyLetterbox } from './shell/viewport'`; `resize()` reduced from the full-window stretch to a single `applyLetterbox(canvas, window.innerWidth, window.innerHeight, window.devicePixelRatio)` call. The old `${window.innerWidth}px` full-width CSS write is gone.
- `index.html` — added `body { display:flex; align-items:center; justify-content:center }` so the black page shows through as the letterbox/pillarbox bars around the centered canvas (page bg was already `#000`).

**Tests:** 715/715 passing (GREEN) — the whole battlezone suite, 43/43 files, incl. the 21 tests in `tests/shell/viewport.test.ts` that were RED at handoff. Zero regressions. Verified by testing-runner `bz2-1-dev-green`.
**Build:** `tsc --noEmit` clean + `vite build` succeeds (bundles cleanly).
**Branch:** `fix/bz2-1-aspect-ratio-letterbox` (pushed to origin, tracking set).

### Float-exactness note (why no rounding)
The strict `toBe(1440)` / `toBe(1000)` assertions on `windowH * (4/3)` were checked empirically: IEEE754 double-rounding lands *exactly* on the integer (`1080 * (4/3) === 1440`, `750 * (4/3) === 1000`), and the width-constrained divisions (`w / (4/3)`) are exact for the tested sizes (`850/(4/3) === 637.5`). So the natural math needs no rounding — the CSS box is left at full precision (see the non-blocking Improvement finding re: sub-pixel CSS for real-world fractional windows).

### Self-review (lang-review/typescript.md)
- **#1 type-safety escapes:** none introduced (no `as any`, `@ts-ignore`, or non-null assertions in the new module). Pre-existing `main.ts:49-50` `getContext('2d')!` / `as HTMLCanvasElement` are unchanged context, not this diff (already noted out-of-scope in bz2-2 review).
- **#4 null/undefined:** the single `rawDpr || 1` is intentional (a 0/NaN dpr is invalid, not a real 0×) and commented; pinned by the `falls back to dpr 1` test.
- **#2 generics / #5 modules / #7 async / #11 errors:** typed interfaces (`Letterbox`, `CanvasLike`), extensionless relative import (matches repo's bundler resolution), no async, degenerate inputs return zero-size (no NaN leak). N/A: #6 JSX, #10 input validation.
- **Wired up:** `main.ts` `resize()` calls `applyLetterbox` (source-level wiring test green); `index.html` centers it. AC-1–5 covered by green tests; AC-6 (visual/feel) is the bz2-6 playtest.

**Handoff:** To Reviewer (Obi-Wan) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (mechanical) | confirmed 0, dismissed 0, deferred 0 — all green (715/715 tests, clean build) |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — self-checked degenerate/boundary inputs (see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — self-checked the `|| 1` fallback (see [SILENT]) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — self-checked test quality (see [TEST]) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — self-checked comments (see [DOC]) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — type design covered by rule-checker (see [TYPE]) |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings — no security surface (see [SEC]) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — self-checked complexity (see [SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | findings | 2 low | confirmed 2 (both low, non-blocking), dismissed 0, deferred 0 |

**All received:** Yes (2 enabled subagents returned; 7 pre-filled as Skipped/disabled per `workflow.reviewer_subagents` settings)
**Total findings:** 2 confirmed (both LOW, non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

Story bz2-1 replaces the full-window canvas stretch with a pinned-4:3 letterbox. The change is small (4 files, +372/−5), fully test-covered (21 new tests, 715/715 green, clean `tsc`+build), and correctly wired end-to-end. No Critical or High issues. Two LOW observations recorded as optional polish.

### Rule Compliance (lang-review/typescript.md, exhaustive)
- **#1 type-safety escapes:** COMPLIANT — 0 introduced by the diff. No `as any`/`as unknown as`/`@ts-ignore`/new `!`. The `main.ts:50-51` `as HTMLCanvasElement` + `getContext('2d')!` are **pre-existing** context lines, outside every hunk (already noted out-of-scope in bz2-2's review).
- **#2 generics/interfaces:** MOSTLY COMPLIANT — `CanvasLike` fields intentionally mutable (documented DOM seam). `[RULE][LOW]` `Letterbox` return-type fields are non-`readonly` (`viewport.ts:24-33`); marking them `readonly` would compiler-enforce "a computed fit is a fact, not a mutable box." Optional; non-blocking.
- **#3 enums:** N/A — none in diff.
- **#4 null/undefined:** COMPLIANT — `rawDpr || 1` (`viewport.ts:57`) textually matches the "`||` on falsy value" shape but is **correct**: `0`/`NaN` dpr is an invalid reading, not a value to preserve, and `??` would *reintroduce* the collapse (`0 ?? 1 === 0`). Self-documented + regression-tested. Verified below as [SILENT].
- **#5 modules:** COMPLIANT — extensionless `./shell/viewport` import matches the repo's `moduleResolution: bundler` convention (every existing import is extensionless).
- **#6 React/JSX:** N/A — no `.tsx`.
- **#7 async/promises:** N/A — all synchronous.
- **#8 test quality:** MOSTLY COMPLIANT — 21 meaningful assertions, no `as any`, `FakeCanvas` structurally matches `CanvasLike`, imports from `src/` not `dist/`. `[RULE][LOW]` the source-string wiring test (`viewport.test.ts:250-265`) tests text not behavior and could theoretically false-pass (string in a comment); acceptable as a documented tripwire for the un-importable bootstrap. Non-blocking.
- **#9 build/config:** N/A — no config changes.
- **#10 input validation:** N/A — `window.innerWidth/Height/devicePixelRatio` are runtime environment values, not user/network input.
- **#11 error handling:** N/A — no try/catch/throw; degenerate inputs return 0-size (no throw needed).
- **#12 perf/bundle:** COMPLIANT — no barrel imports/hot-path stringify; `readFileSync` is one-time test setup, not a handler.
- **#13 fix-regressions:** COMPLIANT — `tsc --noEmit` clean; no `as any` added to silence errors.

### Observations (≥5)
1. `[VERIFIED]` **Root cause actually fixed & wired** — `main.ts:63` `resize()` → `applyLetterbox` writes `canvas.width/height` to the 4:3 buffer dims (`viewport.ts:85-86`); `frame()` then reads `const aspect = w/h` (`main.ts:113-114`) which is now a **stable ~4:3** instead of the wandering full-window ratio. That stable aspect is the projection input, so the "smeared/loomed" view the playtest reported is corrected at the source. Evidence: import `main.ts:30`, call `main.ts:63`, consumers `main.ts:112-114,124-125`.
2. `[VERIFIED]` **Letterbox invariant holds** — `computeLetterbox` returns css ≤ window on both axes with one edge touching (maximal fit); `index.html` `body{display:flex;align-items:center;justify-content:center}` + `background:#000` renders the leftover as centered black bars. Evidence: `viewport.ts:59-69`; `index.html:10`; test "the fitted box never exceeds the window and always touches a constraining edge". Flex won't distort: `align-items:center` (not stretch) + explicit px width/height + css ≤ container ⇒ no stretch/shrink.
3. `[VERIFIED]` **HiDPI preserved, no AC-4 regression** — buffer = css × `min(MAX_DPR, dpr)`, rendered at buffer resolution and CSS-downscaled — the *same* device-resolution strategy the old `resize()` used (which also multiplied by dpr and capped at 2). Evidence: `viewport.ts:57,70-71` vs the removed lines in the diff.
4. `[VERIFIED]` **No NaN from degenerate windows** — traced by hand: `windowH=0` → `windowAspect=Infinity > aspect` → cssHeight=0, cssWidth=`0*aspect`=0; `windowW=0` → `0 < aspect` → cssWidth=0, cssHeight=`0/aspect`=0; `0×0` → `NaN>aspect` false → else → 0,0. No NaN reaches the projection. Evidence: `viewport.ts:58-69`; tests cover zero-height & zero-width.
5. `[VERIFIED]` **Aspect-boundary continuity** — at an exact-4:3 window `windowAspect===aspect`, `>` is false so the else branch yields cssWidth=windowW, cssHeight=windowW/aspect=windowH — identical to what the height branch would give (both = full window). So the `>` vs `>=` choice is immaterial; no discontinuity/flicker at the boundary. Evidence: `viewport.ts:60-68`; test "fills an exact-4:3 window completely with no bars".
6. `[RULE][LOW]` `Letterbox` fields non-`readonly` (`viewport.ts:24-33`) — optional immutability polish; non-blocking.
7. `[RULE][LOW]` Source-string wiring test brittleness (`viewport.test.ts:250-265`) — deliberate, documented tripwire for the un-importable DOM bootstrap; theoretical false-pass; non-blocking.

### Dispatch tags
- `[EDGE]` (subagent disabled) — self-audited boundaries: degenerate 0-dim windows (obs #4), fractional dpr (1.25/1.5), aspect boundary (obs #5), ultrawide (bounded by MAX_DPR). No unhandled path.
- `[SILENT]` (disabled) — the only fallback is `rawDpr || 1`; it is intentional (invalid dpr → 1×), documented (`viewport.ts:53-56`), and tested — not a swallowed error.
- `[TEST]` (disabled) — 21 assertions all meaningful; sweep + boundary + degenerate + seam + wiring coverage; one LOW note on the source-string test (obs #7).
- `[DOC]` (disabled) — JSDoc/inline comments match behavior; the "confirm in bz2-6" line is a forward reference, not stale doc. No misleading comments.
- `[TYPE]` (disabled; covered by rule-checker) — typed `Letterbox`/`CanvasLike`, no stringly-typed API; one LOW `readonly` note (obs #6).
- `[SEC]` (disabled) — no security surface: browser environment values only, no user/network input, no secrets, no auth, no DOM injection (CSS is static, no `innerHTML`).
- `[SIMPLE]` (disabled) — minimal and non-duplicative; pure function + thin seam, no dead code, no over-engineering.
- `[RULE]` (rule-checker, Yes) — 0 hard violations across 13 checks; 2 LOW findings (obs #6, #7); `||`-vs-`??` and extensionless-import both correctly judged compliant.

### Devil's Advocate
Argue this is broken. **Flexbox distortion:** a `<canvas>` as a flex child defaults to `flex-shrink:1` and `min-width:auto` — could the browser squeeze it below `cssWidth` and distort the render? No: `cssWidth ≤ windowW = body width`, so the item never faces shrink pressure, and `align-items:center` (not the flex default `stretch`) plus explicit px `style.width/height` pins its box; `overflow:hidden` catches sub-pixel spill. **Sub-pixel softening:** most real windows aren't 4:3, so `cssWidth` is fractional (e.g. `1777.333px`) and the integer backing store is scaled to a fractional CSS box — a stressed real display could show a 1px-blurred edge. Real, but cosmetic, and Dev logged it as a non-blocking Improvement for the bz2-6 visual pass; it does not break the letterbox. **Wrong ratio:** what if Battlezone's cabinet isn't 4:3? Then the whole framing is subtly off — but the value is a single pinned constant with a dedicated tripwire test and an open TEA question for bz2-6; changing it is a one-line follow-up, and 4:3 is the documented default. **Backing-store blowup:** an ultrawide at dpr 2 (e.g. 3440×1440 → 1920×1440 css → 3840×2880 buffer, ~11M px) — bounded by `MAX_DPR`, and *smaller* than the old full-window buffer, so no new perf risk. **Malicious/confused user:** window values come from the browser, not the user; a user can only resize, which is handled deterministically every event. **Stale first frame:** `resize()` runs at boot (`main.ts:68`) before the first `requestAnimationFrame`, so the very first frame already reads the letterboxed buffer — no one-frame full-width flash. **The wiring test could lie:** if a future edit left `applyLetterbox` only in a comment, the `toContain` would false-pass — true, but today it is a real import and a real call, and the behavioral seam is covered by the `applyLetterbox` tests. Nothing here rises above LOW. The fix is correct, minimal, and covered.

**Data flow traced:** `resize` event / boot → `resize()` (`main.ts:66,68`) → `applyLetterbox(canvas, innerWidth, innerHeight, devicePixelRatio)` → `computeLetterbox` → writes `canvas.width/height` (bounded, finite, ≥0) + `canvas.style` (px) → next `frame()` reads `canvas.width/height` → `aspect=w/h` → `projectModel`/`skylineSegments`. Safe: all outputs finite (degenerate → 0, never NaN), buffer bounded by `MAX_DPR`.
**Pattern observed:** core-pure / shell-seam split — pure `computeLetterbox` + thin `applyLetterbox` DOM writer, at `src/shell/viewport.ts` (idiomatic for this repo).
**Error handling:** no throw paths; degenerate inputs return a zero-size fit rather than NaN/throw (`viewport.ts:58-69`).

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.