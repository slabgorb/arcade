---
story_id: "A2-1"
jira_key: ""
epic: "A2"
workflow: "tdd"
---
# Story A2-1: Make playfield clear — overlay the non-playable margin with a light mask so the play area reads as clearly bounded

## Story Details
- **ID:** A2-1
- **Jira Key:** (none — local sprint tracking)
- **Workflow:** tdd
- **Epic:** A2 (Asteroids — playtest followup)
- **Points:** 2
- **Priority:** p2
- **Repos:** asteroids
- **Stack Parent:** none (independent feature)
- **Branch:** feat/A2-1-playfield-margin-mask

## Technical Context

**Problem:** The playfield boundary is visually ambiguous. Players need a clear visual demarcation of the play area vs. the non-playable margin. The current render does not distinguish the playable region from the unused screen space.

**Solution:** Overlay a light, semi-transparent mask over the non-playable margin (the area outside the 2D playfield bounds). This creates clear visual separation and makes the play area read as a clearly bounded region.

**Scope:** Modify `asteroids/src/shell/render/` to add a margin mask overlay. The mask should be applied during the shell's canvas render phase, after the core simulation renders the playfield.

**Implementation Approach:** 
- Render a semi-transparent rectangle/shape over the margin areas that fall outside the playfield bounds
- The mask should be visually distinct but not obstructive (use a subtle color/opacity, e.g., dark overlay with low alpha)
- Ensure the mask does not interfere with HUD elements or gameplay

## Acceptance Criteria
- A visual mask is rendered over the non-playable margin areas, clearly delineating the playfield boundary
- The mask color and opacity are visually readable and do not obscure gameplay or UI elements
- The margin is consistently masked across all screen sizes and aspect ratios
- Visual appearance is verified in the dev server (:5273) and matches the design intent
- Tests validate the mask rendering logic; npm run build clean and tests green

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-04T13:22:15Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-04T12:45:30Z | 2026-07-04T12:47:52Z | 2m 22s |
| red | 2026-07-04T12:47:52Z | 2026-07-04T12:59:00Z | 11m 8s |
| green | 2026-07-04T12:59:00Z | 2026-07-04T13:13:12Z | 14m 12s |
| review | 2026-07-04T13:13:12Z | 2026-07-04T13:22:15Z | 9m 3s |
| finish | 2026-07-04T13:22:15Z | - | - |

## Sm Assessment

**Routing decision:** A2-1 is a 2-point `tdd` story in the `asteroids` subrepo — a rendering/clarity fix from the first live playtest (epic A2). Phased workflow; handing off to TEA (red phase) to write failing tests first.

**Why tdd (not trivial):** Though small (2 pts), the story has testable logic — the mask must cover the non-playable margin, respect playfield bounds, and stay consistent across aspect ratios. That geometry is worth pinning down with a failing test before implementation, so the epic's YAML tag `tdd` is honored rather than downgraded.

**Context for TEA:** The work lives in `asteroids/src/shell/render/` (shell render phase, after the core sim draws the playfield). The margin-mask logic — which regions are masked, given playfield bounds vs. canvas size — is the pure, unit-testable seam. Core sim (`src/core`) is deterministic and should not be touched; this is a shell/render concern.

**Guardrail:** The mask must not obscure HUD/UI or gameplay. Keep the overlay subtle (low-alpha). Verify visually via `just serve` from the orchestrator root, not a hardcoded port.

**Merge gate:** Clear — no active sessions, no open PRs in asteroids, clean `develop` at setup time.

## TEA Assessment

**Tests Required:** Yes
**Status:** RED (failing — ready for Dev)

**The seam.** The world is a fixed 4:3 rectangle (`WORLD_W×WORLD_H` = 8192×6144) that `render()` projects with a uniform *fit* scale (`Math.min(w/WORLD_W, h/WORLD_H)`) and centres on the canvas. The "non-playable margin" is therefore exactly the letterbox/pillarbox bars — `canvas − centeredProjectedWorldRect` — a pure function of `(w, h)`. That is the RED seam.

**Contract pinned (Dev must satisfy):**
- New module `asteroids/src/shell/margin.ts` exporting `export interface Rect { x; y; w; h }` and `export function marginRects(w, h): Rect[]` — the mask bars (empty/zero-area when the canvas already matches 4:3).
- `render()` fills those bars as a dark overlay **after** entities and **before** the HUD (draw order is the deterministic expression of AC-2 "does not obscure UI").

**Test Files:**
- `asteroids/tests/margin.test.ts` — pure geometry: pillarbox, letterbox, exact-4:3 (no mask), near-square axis selection, symmetry/centering, in-canvas bounds, determinism/purity. Uses an independent `fit` oracle so it specifies the geometry rather than echoing the implementation. (Whole file is RED — `src/shell/margin.ts` does not exist yet.)
- `asteroids/tests/margin-mask.render.test.ts` — render wiring: mask covers the margin only, never the playfield centre, drawn before the HUD text, reads as a dark overlay, present in attract mode too, and render() stays pure. (4 assertions RED.)

**RED verified (testing-runner, RUN_ID A2-1-tea-red):** Test Files 2 failed | 28 passed (30); Tests 4 failed | 571 passed (575). All failures are the two new files; **zero pre-existing regressions**.

### Rule Coverage

| Rule (TS lang-review) | Test(s) | Status |
|-----------------------|---------|--------|
| #1 no type-safety escapes | `margin.ts — introduces no type-safety escapes` (scans for `as any` / `@ts-ignore`) | RED (module missing) |
| #8 test quality (meaningful assertions) | self-check — every test asserts geometry/coverage/order; no `let _ =`, no `assert(true)`, no always-true predicates | pass |

**Rules checked:** 2 of 2 applicable lang-review rules (the rest — React/JSX, enums, async, generics — do not apply to a pure geometry function). **Self-check:** 0 vacuous tests.

**Handoff:** To Dev (Yoda) for GREEN — create `src/shell/margin.ts` and wire the mask into `render()`.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `asteroids/src/shell/margin.ts` (new) — pure geometry: `Rect`, `fitScale(w,h)`, and `marginRects(w,h)` (the letterbox/pillarbox bars; empty at exact 4:3).
- `asteroids/src/shell/render.ts` — paint a faint light wash over the margin bars after the world and before the HUD; reuse `fitScale` for the view scale so the mask and the drawn world share one scale.
- `asteroids/tests/margin-mask.render.test.ts` — flipped the colour-polarity assertion (`isDarkOverlay` → `isLightOverlay`) per the spec reconciliation below.

**Approach.** The 4:3 world is fit-scaled and centred, so an off-4:3 canvas leaves margin bars = `canvas − projected world`. `marginRects` returns those bars. render() fills them with `rgba(255,255,255,0.06)` — a *lightening* mask, because the play area is pure black (`#000`) and a dark overlay would be invisible on black. This is the Jedi's decision and matches the story title ("light mask"), overriding the lower-authority context example ("dark overlay").

**Tests:** 593/593 passing (GREEN) — margin.test 18, margin-mask.render.test 8. `npm run build` clean (tsc --noEmit + vite build).

**⚠ Not yet verified (hand to review):** AC-4 visual appearance/opacity is NOT eyeball-verified in the dev server. The tests pin geometry, draw-order, and colour polarity deterministically, but the actual look and the `0.06` alpha are a browser-tuned feel value. Reviewer/human should confirm in `just serve` at a non-4:3 window and tune the opacity if it reads too faint or too strong.

**Branch:** feat/A2-1-playfield-margin-mask (pushed to origin)

**Handoff:** To Reviewer (Obi-Wan) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings (self-covered) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings (self-covered) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings (self-covered) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings (self-covered) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings (self-covered) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings (self-covered) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings (self-covered) |
| 9 | reviewer-rule-checker | Yes | findings | 1 (TS #1/#8, low) | confirmed 1 (downgraded to LOW) |

**All received:** Yes (2 enabled subagents returned; 7 disabled via `workflow.reviewer_subagents` and self-covered)
**Total findings:** 1 confirmed (low, non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED (code) — conditional on the human AC-4 visual verify before finish (see finding below)

**Dispatch tags (all 8 domains covered — disabled specialists self-covered):**
- `[RULE]` **[LOW]** `rec as unknown as CanvasRenderingContext2D` double-cast on the partial canvas mock — `tests/margin-mask.render.test.ts:72`. Matches TS lang-review #1 ("`as unknown as T` double-cast bypass") and #8 (mock not structurally satisfying the real type). **Confirmed, not dismissed** (rule-matching), but **downgraded to LOW/non-blocking**: it is the established house convention, byte-identical to the pre-existing `tests/render.test.ts:76`, is test-only, and the alternative (a fully-typed 100+ member mock) is impractical. Fixing it is a suite-wide cleanup, not an A2-1 concern (logged as a delivery finding).
- `[TEST]` **[LOW]** `tests/margin-mask.render.test.ts` "never paints over the playfield centre" loops over `maskFillsOf(...)` without a `mask.length > 0` guard, so it would pass vacuously if the mask were empty. Not a real gap for the `1600×600` input (the sibling test pins `length > 0` and the implementation draws 2 bars), but a length guard would harden it. Non-blocking. (My own analysis — test_analyzer disabled.)
- `[SIMPLE]` **[VERIFIED]** No unnecessary complexity — `marginRects` is a 14-line pure function; `drawMarginMask` is 6 lines. `fitScale` removes a duplicated scale formula rather than adding one. Nothing to simplify.
- `[TYPE]` **[VERIFIED]** `Rect` (margin.ts:24) is plain data; `marginRects` returns a mutable `Rect[]` **by design** — `margin.test.ts` mutates the result (`a.length = 0`) to prove per-call freshness, so `ReadonlyArray` would break the contract. No stringly-typed APIs, no unsafe casts in production code.
- `[EDGE]` **[VERIFIED]** Degenerate inputs are safe — `marginRects(0,0)` → `[]`; `NaN` → `[]` (`NaN > EPS` is false); at most one axis ever has bars because `min()` forces the other margin to ~0, so no overlapping double-mask. `MARGIN_EPS=1e-6` drops sub-pixel float dust (dust ≈ 1e-13 ≪ 1e-6) while admitting any real bar. Evidence: margin.ts:47-60.
- `[SILENT]` **[VERIFIED]** No swallowed errors — the diff has zero `try/catch`, zero `Promise`, zero fallbacks; pure synchronous geometry + canvas fills. Nothing to swallow.
- `[SEC]` **[VERIFIED]** No security surface — `w`/`h` are internal render-loop numbers, not untrusted input; no parsing, network, DOM injection, `dangerouslySetInnerHTML`, or secrets. Client-side canvas only.
- `[DOC]` **[VERIFIED]** Comments are accurate and valuable — margin.ts:7-19 and render.ts:37-41 correctly explain the fit-projection geometry and the *why* of the light-not-dark polarity. No stale/misleading comments introduced.

**Additional VERIFIED observations:**
- **[VERIFIED]** Draw order correct — `drawMarginMask` is called after the world/ship/flame and before `drawHud` (render.ts:392-393), so the wash frames the arena without dimming HUD text (AC-2).
- **[VERIFIED]** State hygiene — `drawMarginMask` (render.ts) wraps its work in `save()`/`restore()` and sets `shadowBlur = 0`, preventing the bars from inheriting the prior strokes' glow and preventing `fillStyle`/shadow leakage into `drawHud`.
- **[VERIFIED]** No behavioural regression from the `fitScale` refactor — it is the identical `Math.min(w/WORLD_W, h/WORLD_H)` formula, now sourced once; all 593 tests (incl. `render.test.ts` geometry pins) stay green. [preflight]
- **[VERIFIED]** Build + suite clean — `tsc --noEmit` clean, `vite build` clean, 0 smells, 593/593 green. [preflight]

**Data flow traced:** canvas `(w, h)` → `render()` → `fitScale(w,h)` drives both `view.scale` (entities) and `marginRects(w,h)` (mask) → `drawMarginMask` fills the bars. Because the mask and the world share one scale, they align by construction regardless of pixel units (CSS vs device-px / DPR) — the mask can never drift from the arena edge.

**Pattern observed:** shared-derivation-to-prevent-drift — `fitScale` mirrors the intent of `core/bounds.ts` (one function so parallel copies can't diverge). Good pattern, correctly applied at render.ts:383,392.

**Error handling:** N/A — pure geometry + canvas fills, no failure paths. Degenerate inputs return empty (verified above).

### Rule Compliance (TS lang-review checklist, 13 checks)

Rule-checker enumerated ~25 instances across all 13 checks; I confirm:
- **#1 type-safety escapes** — 1 finding (the mock double-cast, LOW, above). Production code (margin.ts, render.ts) is clean: no `as any`, `@ts-ignore`, or unsafe non-null assertions.
- **#2 generic/interface pitfalls** — clean. `Rect` is a return type (not a param), so the `readonly`-param rule is N/A; mutable `Rect[]` return is intentional (freshness test). No `Record<string,any>`/`object`/`Function`.
- **#4 null/undefined** — clean. No `||`/`??`/optional-chaining in new code.
- **#5 modules** — clean. Inline `type` modifiers used correctly; `moduleResolution: bundler` makes extensionless imports correct.
- **#8 test quality** — 1 finding (mock, cross-ref of #1) + my `[TEST]` length-guard nit. No vacuous assertions — every `expect` ties to a real geometric/order predicate against an independent oracle. No `dist/` imports.
- **#12 performance** — clean. `marginRects` allocates ≤2 small objects/frame, idiomatic to the codebase (drawShip et al. allocate similarly); `JSON.stringify`/`fs` are test-only.
- **#3 enums, #6 React/JSX, #7 async, #9 build-config, #10 input-validation, #11 error-handling, #13 fix-regression** — N/A (no such constructs in the diff).

### Devil's Advocate

Assume this is broken. First attack: **the mask is invisible.** `rgba(255,255,255,0.06)` over pure black yields ~`#0f0f0f` — is that discernible on a dim laptop panel or under sRGB clamping in some browser? If not, the boundary is *not* "clearly bounded" and AC-1/AC-4 fail in practice. This is the single genuinely-unverified risk and is exactly why AC-4's human eyeball-verify is mandatory before finish — the tests prove the bars are *drawn*, not that they *read*. Second attack: **DPR / unit mismatch.** If `render()` receives CSS pixels while the canvas backing store is device-pixel-scaled, a mask computed in the wrong unit would misalign with the entities. But `marginRects` and the entity projection both consume the *same* `(w,h)` through `fitScale`, so they are consistent whatever the unit — the attack fails by construction. Third: **resize race** — a transient `0×0` or `1×0` canvas mid-resize. `marginRects` returns `[]` (or bars that exactly tile a degenerate canvas), `fillRect` with zero extent is a no-op; no crash, no NaN geometry leaking to the world. Fourth: **confused user** — on a wide window the score (`w*0.25`, right-aligned) and life icons sit *inside* the lit left bar, so the HUD floats on a faint band. Cosmetic, not broken; TEA and Dev both logged it and it is explicitly out of A2-1 scope. Fifth: **glow bleed** — a rock at the world edge whose `shadowBlur` bleeds into the margin is over-painted by the wash drawn afterward; the wash is low-alpha so a faint halo may survive, but that is aesthetic, not a correctness failure. Sixth: **malicious input** — there is none; `render()` takes numbers from the loop and immutable core state (purity re-verified by the render test). No injection, no allocation blow-up (≤2 objects/frame). Conclusion: the only surviving risk is the subjective visibility of `0.06`, already routed to the human AC-4 gate. Nothing here blocks the code.

**Handoff:** To SM (Thrawn) for finish-story — **conditioned on the human completing the AC-4 dev-server eyeball-verify and tuning the mask opacity first.**

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): the asteroids dev-server port is documented inconsistently. Affects the AC-4 visual-verify step — context-story-A2-1.md says `:5273`, context-epic-A2.md says `:5275`, and CLAUDE.md's port table lists no asteroids port (5273=tempest, 5270=lobby). Verify via `just serve` from the orchestrator root and the asteroids-pinned Vite port, not a hardcoded number. *Found by TEA during test design.*
- **Improvement** (non-blocking): render()'s `view.scale` and the new `marginRects` both need `Math.min(w/WORLD_W, h/WORLD_H)`. Affects `asteroids/src/shell/render.ts` and `asteroids/src/shell/margin.ts` (extract one shared `fitScale(w,h)` so the mask and the entity projection can never drift — the same parallel-copy hazard `src/core/bounds.ts` was created to eliminate). *Found by TEA during test design.*
- **Improvement** (non-blocking): on a wide/pillarboxed canvas the HUD renders into the left margin bar — `drawHud` positions the score at `w*0.25` (right-aligned) with life icons to its left. The mask is drawn before the HUD (pinned) so it is not obscured, but the score then floats over the masked bar, which reads oddly. Affects `asteroids/src/shell/render.ts` `drawHud` (consider clamping the HUD into the playfield); out of A2-1 scope. *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking): AC-4 (visual appearance verified in the dev server) is not yet satisfied — GREEN pins the mask's geometry, draw order, and colour polarity but not its look. Affects `asteroids/src/shell/render.ts` `MARGIN_MASK_COLOR` (Reviewer/human should eyeball at a non-4:3 window via `just serve` and tune the `0.06` alpha if needed). *Found by Dev during implementation.*
- **Improvement** (non-blocking): TEA's HUD-in-margin observation is now live — with the light wash, the score/lives that sit in the pillarbox margin render over a faintly-lit bar. Cosmetic, out of A2-1 scope; a future story could clamp the HUD into the playfield. Affects `asteroids/src/shell/render.ts` `drawHud`. *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (blocking-for-done): AC-4 (visual appearance verified in the dev server) is NOT yet satisfied — the code/geometry is proven by tests, but that `rgba(255,255,255,0.06)` actually reads as a subtle-but-visible frame (and does not obscure the HUD) is a human eyeball call. The Jedi/SM MUST run `just serve`, view asteroids at a non-4:3 window, confirm the frame reads, and tune the alpha before finish. Affects `asteroids/src/shell/render.ts` `MARGIN_MASK_COLOR`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the `rec as unknown as CanvasRenderingContext2D` canvas-mock cast is repeated across `render.test.ts`, `render-hud.test.ts`, and now `margin-mask.render.test.ts` (TS lang-review #1). A suite-wide follow-up could extract one shared, properly-typed canvas mock helper. Affects the asteroids test suite (not scoped to A2-1). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Margin derived from the fit projection, not a separate core "playfield bounds"**
  - Spec source: context-story-A2-1.md, Technical Approach step 1
  - Spec text: "The Asteroids playfield is a rectangular region defined in the core simulation (likely in asteroids/src/core/). Identify the exact pixel/coordinate bounds of the play area relative to the canvas."
  - Implementation: Tests derive the margin as the letterbox/pillarbox bars — canvas minus the centred uniform-fit projection of the whole WORLD_W×WORLD_H world. There is no separate core playfield-bounds value; the world IS the play area, and a non-playable margin exists only because the canvas aspect ≠ 4:3.
  - Rationale: The core defines no sub-playfield, so the only non-playable region is the fit letterbox — a pure shell function of (w,h)+WORLD constants, keeping core untouched per the epic guardrail.
  - Severity: minor
  - Forward impact: none
- **Mask opacity left as a browser-verified feel value, not pinned in tests**
  - Spec source: context-story-A2-1.md, AC-2
  - Spec text: "The mask color and opacity are visually readable and do not obscure gameplay or UI elements"
  - Implementation: Tests pin the mask geometry (margin-only), its draw order (before the HUD), and that it reads as a dark overlay; the exact alpha is not asserted and is eyeball-verified in the dev server.
  - Rationale: Opacity is a calibration/feel value like glow and palette (render.ts header treats these as provisional, browser-verified); pinning a specific alpha would over-fit the test to one look.
  - Severity: minor
  - Forward impact: none
- **Authored a concrete API contract the story left open**
  - Spec source: context-story-A2-1.md, Technical Approach step 2
  - Spec text: "Add a new rendering layer in asteroids/src/shell/render/ that draws over the non-playable margin areas."
  - Implementation: Pinned a specific seam — a new pure module src/shell/margin.ts exporting `marginRects(w, h): Rect[]` — instead of an unspecified inline layer; render() must import and fill those bars after entities and before the HUD.
  - Rationale: A pure exported function is the unit-testable seam the story's own "unit tests for the mask region calculation" implies, and a dedicated module keeps the 377-line render.ts from growing.
  - Severity: minor
  - Forward impact: none

### Dev (implementation)
- **Mask LIGHTENS the margin (dark → light); flipped TEA's colour-polarity test**
  - Spec source: context-story-A2-1.md, Implementation Approach / AC-2 (vs the session story title)
  - Spec text: "Render the mask as a semi-transparent dark overlay (e.g., `rgba(0, 0, 0, 0.3)`)" — contradicted by the story title "overlay the non-playable margin with a **light mask** so the play area reads as clearly bounded"
  - Implementation: Mask is `rgba(255,255,255,0.06)` (a lightening wash), not a dark overlay. TEA's `isDarkOverlay` assertion in `tests/margin-mask.render.test.ts` was changed to `isLightOverlay`.
  - Rationale: The play area is pure black (`#000`), so a dark overlay is invisible on black and cannot bound the arena; the story title and the Jedi's explicit decision (asked at the green phase) win over the lower-authority context example per spec-authority (story scope > story context).
  - Severity: major
  - Forward impact: none — no sibling story depends on the mask colour (A2-2 is font letter-spacing)
- **Shared `fitScale` between render() and margin.ts (refactored render's inline scale)**
  - Spec source: context-story-A2-1.md, Technical Approach step 2 (+ TEA Delivery Finding, Improvement)
  - Spec text: "Add a new rendering layer in asteroids/src/shell/render/ that draws over the non-playable margin areas."
  - Implementation: Extracted `fitScale(w,h)` into `src/shell/margin.ts` and replaced render()'s inline `Math.min(w/WORLD_W, h/WORLD_H)` with a call to it, so the mask and the entity projection derive from one scale.
  - Rationale: Per TEA's flagged finding, one shared scale prevents the mask and the drawn world from drifting — the parallel-copy hazard `src/core/bounds.ts` exists to eliminate.
  - Severity: minor
  - Forward impact: none

### Reviewer (audit)
- **TEA #1 — Margin derived from the fit projection, not a separate core "playfield bounds"** → ✓ ACCEPTED by Reviewer: correct — the world IS the play area; no core sub-playfield exists, so the letterbox/pillarbox is the only non-playable region, and computing it in the shell keeps core untouched per the epic guardrail.
- **TEA #2 — Mask opacity left as a browser-verified feel value** → ✓ ACCEPTED by Reviewer: consistent with the house convention that glow/palette are provisional and eyeball-tuned. (Note: the entry's "reads as a dark overlay" phrasing was superseded by Dev's polarity flip to light; the principle — opacity not pinned in tests — stands.)
- **TEA #3 — Authored a concrete API contract the story left open** → ✓ ACCEPTED by Reviewer: a pure exported `marginRects` in a dedicated module is the right unit-testable seam and keeps the 380-line render.ts from growing.
- **Dev #1 — Mask LIGHTENS the margin (dark → light); flipped TEA's colour-polarity test** → ✓ ACCEPTED by Reviewer: sound and necessary. A dark overlay on a pure-black field (#000) is invisible; the story title ("light mask") and the Jedi's explicit decision govern over the lower-authority context example (spec-authority: story scope > story context). The test change is the correct downstream consequence, properly logged.
- **Dev #2 — Shared `fitScale` between render() and margin.ts** → ✓ ACCEPTED by Reviewer: identical formula sourced once; no behavioural change (593 tests green), eliminates a real drift risk. Good call.
- No undocumented deviations found — the polarity flip and its test change were both logged.