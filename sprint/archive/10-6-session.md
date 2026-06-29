---
story_id: "10-6"
jira_key: ""
epic: "10"
workflow: "tdd"
---
# Story 10-6: Title-logo approaching rainbow (19-pass depth + color cycle)

## Story Details
- **ID:** 10-6
- **Title:** Title-logo approaching rainbow (19-pass depth + color cycle)
- **Jira Key:** (none — local sprint tracking)
- **Workflow:** tdd
- **Points:** 3
- **Priority:** p3
- **Repos:** tempest
- **Stack Parent:** none

## Story Description

Attract title draws TEMPEST as the approaching rainbow (book ch. approaching logo process): ~19 passes from far to near, each a different color cycling white/yellow/magenta/red/cyan/green, advancing toward the viewer each frame (SCARNG/LOGPRO). Today drawAttract draws a single static glow title (render.ts:515-535). Shell-only. Ref: context-epic-10.md Title logo.

## Acceptance Criteria
- Attract title renders the word at multiple increasing depths with per-pass scale
- Color cycles through the documented 6-color palette by depth
- The rainbow advances toward the viewer over time
- Pure shell; attract input/flow unchanged

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-29T15:55:29Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-29T15:28:43Z | 2026-06-29T15:30:24Z | 1m 41s |
| red | 2026-06-29T15:30:24Z | 2026-06-29T15:39:57Z | 9m 33s |
| green | 2026-06-29T15:39:57Z | 2026-06-29T15:45:49Z | 5m 52s |
| review | 2026-06-29T15:45:49Z | 2026-06-29T15:55:29Z | 9m 40s |
| finish | 2026-06-29T15:55:29Z | - | - |

## SM Assessment

**Story is ready for RED phase.** Shell-only fidelity story — no core sim changes.

**Where the work lives:**
- `tempest/src/shell/render.ts:515-535` — `drawAttract` currently draws a single static glow title. This is the function to replace with the multi-pass approaching-rainbow render.
- Reference: `sprint/context/context-epic-10.md` (Title logo section) for the ROM-accurate behavior (SCARNG/LOGPRO — ~19 passes far→near, per-pass color cycle through white/yellow/magenta/red/cyan/green, advancing toward viewer each frame).

**Technical shape (to refine in red/green):**
- Render the word at N (~19) increasing depths/scales in one frame — far passes small/dim, near passes large/bright.
- Color is a function of depth index, cycling the documented 6-color palette.
- A per-frame phase advances the rainbow toward the viewer over time (animation driven by the existing attract clock, not a new input path).

**Test angle for TEA:** Pure-function the depth→scale and depth→color mapping (and the time→phase advance) so they can be unit-tested without a canvas. Keep the actual `ctx` draw calls thin. Verify the palette sequence, pass count, and that advancing time shifts the depth assignment.

**Guardrails (project memory):**
- ROM is canonical — match the documented behavior, don't gold-plate beyond it ([[tempest-rom-is-canonical]]).
- Pure shell change — attract input/flow stays unchanged. No coin-op urgency mechanics.

**AC recap:** multi-depth render w/ per-pass scale · depth-driven 6-color cycle · advances toward viewer over time · attract input/flow unchanged.

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** New observable behaviour (the attract title becomes a multi-pass, animated, colour-cycling rainbow). Pure depth/scale/colour math is unit-testable.

**Architecture (follows the 10-4 starfield precedent):** render.ts cannot run in vitest's `node` env (phosphor needs `document`), so the testable seam is a PURE, importable model module that owns the math, plus `?raw` source guards on render.ts for the wiring. Dev's GREEN phase delivers `src/shell/titleLogo.ts` and wires it into `drawAttract`.

**Expected module — `src/shell/titleLogo.ts` (Dev to implement):**
```ts
export interface LogoPass {
  readonly depth: number   // 0 = far horizon … →1 = arrived at the viewer
  readonly scale: number   // size multiplier; strictly increases with depth
  readonly color: string   // LOGO_PALETTE[passIndex % LOGO_PALETTE.length]
}
export const LOGO_PASSES: number               // 19
export const LOGO_PALETTE: readonly string[]   // white,yellow,magenta,red,cyan,green
export function titleLogoPasses(phase: number): readonly LogoPass[]
```
Contract: returns exactly 19 passes ordered far→near; depths evenly spaced in [0,1) (gap = 1/19); colour of the k-th pass = palette[k % 6]; scale strictly increases far→near (near ≥ 1.5× far); increasing `phase` advances every pass toward the viewer; the pattern recycles every 1.0 of phase. `drawAttract` feeds `renderTime` so it animates.

**Test Files:**
- `tempest/tests/shell/titleLogo.test.ts` — pure model: 19 passes, 6-colour SCARNG palette, even depth spacing, monotonic per-pass scale, palette colour cycle, advance-toward-viewer, seamless recycle, robust phase handling.
- `tempest/tests/shell/render.title-rainbow.test.ts` — `?raw` wiring: imports `./titleLogo`, calls `titleLogoPasses(renderTime…)` inside `drawAttract`, iterates passes and consumes `.depth/.scale/.color`, and (regression guards) still draws TEMPEST + high-score table + PRESS START.

**Tests Written:** ~16 tests across 2 files covering all 4 ACs.
**Status:** RED — confirmed. `titleLogo.test.ts` fails on the missing module import; 3 wiring assertions in `render.title-rainbow.test.ts` fail on not-yet-added code; 4 regression guards already pass. All 611 pre-existing tests remain green (no regressions).

### Rule Coverage (TS lang-review)

| Rule | Test(s) | Status |
|------|---------|--------|
| #1 type-safety escapes | titleLogo: "no `as any`, double-cast, or @ts-ignore" (`?raw`) | failing (module missing) |
| #4 `\|\|` vs `??` on falsy-valid values | titleLogo: "treats phase 0 as the real cycle start", "wraps arbitrary large/negative phases" | failing (module missing) |
| #8 test quality | Self-check: every test asserts a concrete value; no `let _ =`, no `assert(true)`, no always-None checks | done |

**Rules checked:** 3 of 13 lang-review rules apply to this pure-shell render story (the rest — React/JSX, async/Promise, enums, generics beyond readonly, build config, input validation — are N/A here).
**Self-check:** 0 vacuous tests found.

**Handoff:** To Dev (Walter) for GREEN — create `src/shell/titleLogo.ts` to the contract above and wire it into `drawAttract`.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `tempest/src/shell/titleLogo.ts` (NEW) — pure model. `LOGO_PASSES` (19), `LOGO_PALETTE` (white/yellow/magenta/red/cyan/green canonical hex), and `titleLogoPasses(phase)` returning 19 evenly-spaced passes far→near. Depth `(k + frac(phase)) / 19` (frac wraps any real phase, incl. negative); per-pass `scale` is a 1/z perspective divide (`LOGO_Z_FAR`=8 → `LOGO_Z_NEAR`=1) so it's strictly increasing far→near; `color` = `LOGO_PALETTE[k % 6]`.
- `tempest/src/shell/render.ts` (WIRED) — imports `./titleLogo`; added `TITLE_BASE_PX` (112) + `LOGO_RAINBOW_SPEED` (0.9 cycles/sec) constants; `drawAttract` replaced the single static `drawGlowText('TEMPEST', …)` with a loop over `titleLogoPasses(renderTime * LOGO_RAINBOW_SPEED)` — each pass drawn far→near with `size = TITLE_BASE_PX * pass.scale`, `globalAlpha = 0.35 + 0.65*depth`, glow blur scaling with depth, in its palette colour. `globalAlpha` reset to 1 after. High-score table / PRESS START / controls hint / subtitle all unchanged.

**Approach:** Minimal — the pure math is in `titleLogo.ts`; render just strokes it. The 1/z perspective and the alpha/blur depth cues are what make 19 overlapping copies read as an approaching stack rather than a blob. No new input/flow; the existing `renderTime` clock (already advanced in attract) drives the advance.

**Tests:** 629/629 passing (GREEN) — both target files fully pass; zero regressions. `tsc --noEmit` clean.
**Branch:** feat/10-6-title-logo-approaching-rainbow (pushed)

**Handoff:** To Reviewer (The Big Lebowski) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 629 tests green, tsc clean, no lint configured, 0 smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — boundary domain assessed by Reviewer directly |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — no error handling in pure-math/draw code |
| 4 | reviewer-test-analyzer | Yes | findings | 6 (4 medium, 2 low) | confirmed 6 (all LOW after triage — test robustness/quality on correct code), dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — comments/JSDoc verified accurate by Reviewer |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — type design assessed by Reviewer + rule-checker |
| 7 | reviewer-security | Yes | clean | none | N/A — no user input in path, ctx.font not a sink, `size` fully bounded |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — minimality assessed by Reviewer (no dead code) |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A — 29 rules / 87 instances / 0 violations |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled)
**Total findings:** 6 confirmed (all LOW, non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

Shell-only attract-title change: a pure `titleLogo.ts` model + thin `drawAttract` wiring. Clean across preflight, security, and an exhaustive 29-rule check; test-analyzer's findings are all LOW (test-suite robustness/quality), and the underlying implementation is correct. No Critical/High issues.

**Data flow traced:** `renderTime` (internal animation clock) → `renderTime * LOGO_RAINBOW_SPEED` → `titleLogoPasses(phase)` → per-pass `{depth, scale, color}` → font size / globalAlpha / blur / palette colour → `drawGlowText` → Canvas 2D. **No external/user input enters this path**, so it is safe by construction (corroborated by [SEC]).

**Observations (tagged by source):**
- `[VERIFIED]` **No division by zero** in `logoScale` — `z = LOGO_Z_FAR + (LOGO_Z_NEAR − LOGO_Z_FAR)·depth = 8 − 7·depth`; for `depth ∈ [0,1)` (titleLogoPasses caps at `(18+frac)/19 < 1`), `z ∈ (1, 8]`, never 0. Evidence: `titleLogo.ts:46-48`. Complies with TS-4.
- `[VERIFIED]` **Font size floored at 1** — `size = Math.max(1, Math.round(112 · scale))`, `scale ∈ [0.125, 1)`, so `size ∈ [14, ~107]`, never zero/negative. Evidence: `render.ts:669`.
- `[VERIFIED]` **`globalAlpha` restored to 1 after the loop** — Evidence: `render.ts:675` `ctx.globalAlpha = 1` precedes the subtitle / high-score / PRESS-START draws, so no alpha leaks into them. This directly resolves [TEST] finding #4 (the code is correct; only the *assertion* is missing).
- `[RULE]` rule-checker: **clean** — 29 rules (13 TS + 13 JS + 3 architectural), 87 instances, **0 violations**. Confirms `readonly` on all `LogoPass` fields + `LOGO_PALETTE` + return type, no type-safety escapes, `||`-vs-`??` correct (`phase - Math.floor(phase)` handles `0`), ESM import matches project convention, and the architectural boundary holds (`titleLogo.ts` has zero imports; `render.ts` adds only a shell→shell import). Confirmed.
- `[SEC]` security: **clean** — no user input reaches the path; `ctx.font` is not a security sink; the template-literal `size` is fully bounded by pure math. Confirmed.
- `[TEST]` test-analyzer: **6 findings, all confirmed at LOW (non-blocking).** Three are inherent `?raw` source-scan brittleness (the for-of regex breaks on an assign-then-iterate refactor; the `renderTime`-must-be-first-arg check breaks on a `phaseOffset + renderTime` refactor; the `drawSelect` slice boundary breaks on a sibling rename) — these risk *spurious future failures*, not missed defects. One is a coverage gap: no assertion locks in the `globalAlpha = 1` reset (code is correct, see VERIFIED above). Two are redundancy/omission nits (the "6 distinct colours" check is subsumed by the exact-palette `toEqual`; the recycle test omits `scale` equality). None block; logged as a non-blocking improvement for a future test-hardening pass.
- `[SIMPLE]` (disabled) — Reviewer assessment: implementation is minimal and idiomatic — pure model + thin loop, mirrors the established `starfield.ts` precedent. The 1/z perspective and alpha/blur depth cues are functionally necessary to make 19 overlapping copies legible, not over-engineering. No dead code.
- `[EDGE]` (disabled) — Reviewer assessment: boundaries hold — `depth ∈ [0,1)`, `k % 6` always in-bounds, `frac` handles `0` / negative / large phase (explicitly tested). A `NaN`/`Infinity` `renderTime` would yield a `"NaNpx"` font that Canvas silently ignores — non-issue, since `renderTime` is a finite `dt` accumulation.
- `[SILENT]` (disabled) — Reviewer assessment: no error handling exists or is needed in this pure-math + draw-call code; nothing is swallowed.
- `[DOC]` (disabled) — Reviewer assessment: JSDoc on `LogoPass` / `titleLogoPasses` accurately describes depth/scale/colour and the recycle contract; the `drawAttract` comment correctly cites SCARNG/LOGPRO. No stale comments. Evidence: `titleLogo.ts:11-60`, `render.ts:662-666`.
- `[TYPE]` (disabled) — Reviewer assessment: `LogoPass` is well-designed with `readonly` fields; `color: string` drawn from a `readonly string[]` palette is acceptable (a hue union would be marginally tighter but is not required). No stringly-typed API at a boundary.
- `[LOW]` **Perf (attract-only):** `drawAttract` now issues 19 `drawGlowText` calls/frame, each a multi-pass shadow-blur stroke. Acceptable — attract mode runs no simulation and the original static title was already a glow draw; not blocking.

### Rule Compliance (TS lang-review checklist)

| Rule | Applicable instances | Verdict |
|------|---------------------|---------|
| #1 Type-safety escapes | `titleLogo.ts`, `render.ts` adds, both tests (16) | ✅ none — no `as any`/`as unknown as`/`@ts-ignore`/non-null |
| #2 Generic/interface (`readonly`) | `LogoPass` ×3 fields, `LOGO_PALETTE`, return type (12) | ✅ all `readonly` where mutation unintended |
| #4 `\|\|` vs `??` on falsy-valid | `phase`/`frac`/`depth`/`size`/`alpha` (8) | ✅ no `\|\|`; `phase - Math.floor(phase)` handles `0` |
| #5 Module/ESM imports | `render.ts:8` + 8 other imports (9) | ✅ extensionless matches every sibling import (Vite) |
| #8 Test quality | 21 it-blocks across 2 files | ✅ specific matchers, no mocks/`.only`/`.skip`/`toBeTruthy` |
| #10 / #11 input validation, errors | — | ✅ N/A (no external input, no error paths) |
| #3/#6/#7/#9/#12/#13 | — | ✅ N/A (no enums/React/async/config/fixes) |
| ADD architectural boundary | `core` untouched; `titleLogo.ts` pure, zero imports | ✅ boundary intact; `titleLogo.ts` node-testable |

### Devil's Advocate

Let me try to break this. **Could the rainbow blow out into a white blob?** `glowText` uses the `'lighter'` (additive) blend, and 19 copies overlap concentrically at the same `(W/2, titleY)`. Additive blending of ~19 semi-transparent glows could saturate the centre to white, hiding the colour cycle the AC demands. This is real — but it's a *visual-tuning* question (alpha ramp 0.35→1.0 plus per-pass blur was chosen specifically to mitigate it), not a correctness defect, and it cannot be unit-tested. It must be eyeballed in the running app; I've logged that as a non-blocking delivery finding. **What if a malicious/confused actor feeds bad input?** There is no input path — `phase` derives solely from the internal clock and module constants; the security specialist and rule-checker both confirmed this. **What about a stressed runtime?** A `NaN` clock yields an invalid font string that Canvas ignores (no crash); a huge clock still `frac`s into `[0,1)` with no precision impact at realistic magnitudes. **What would a confused maintainer break?** The `?raw` wiring tests would throw spurious failures on a few innocuous refactors (assign-then-iterate, reordering the `renderTime` arg, renaming `drawSelect`) — annoying but fail-safe (they fail loud, never silently pass a regression), and I've flagged them for a future hardening pass. **Could the title overflow a small canvas?** Font sizes are fixed px (max ~107) at a fixed `titleY = H*0.18`, identical in spirit to the original 96px static title — no regression on the game's fixed-resolution canvas. Nothing here rises to High; the implementation is sound and the residual items are non-blocking. APPROVED.

**Handoff:** To SM (The Dude) for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): The book's `docs/tempest-1981-source-findings.md` referenced by the story/epic is not present in this checkout, so the SCARNG/LOGPRO exact pass count (~19) and palette order were taken from the story description + SM assessment rather than the primary source. Affects `tempest/docs/` (consider committing the findings doc so future epic-10 stories have the authoritative reference). *Found by TEA during test design.*

### Dev (implementation)
- No upstream findings during implementation. The TEA contract was complete and implementable as specified; the perspective scale curve and the alpha/blur depth cues were free implementation choices within it.

### Reviewer (code review)
- **Improvement** (non-blocking): The 19 concentric copies use additive (`'lighter'`) glow blending, which could saturate the title centre toward white and mute the colour cycle — a visual-tuning property that can't be unit-tested. Affects `tempest/src/shell/render.ts` `drawAttract` (eyeball the attract screen via `just serve` and adjust the alpha ramp / `TITLE_BASE_PX` / `LOGO_RAINBOW_SPEED` if it reads as a blob rather than a rainbow). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): The `?raw` wiring guards in `render.title-rainbow.test.ts` are brittle to innocuous refactors (assign-then-iterate, reordering the `renderTime` argument, renaming `drawSelect`) and don't assert the `globalAlpha = 1` reset. Affects `tempest/tests/shell/render.title-rainbow.test.ts` (relax the regexes per test-analyzer's suggestions and add a reset assertion in a future test-hardening pass). Fail-safe today — they fail loud, never pass a regression silently. *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** 1 findings (0 Gap, 0 Conflict, 0 Question, 1 Improvement)
**Blocking:** None

- **Improvement:** The book's `docs/tempest-1981-source-findings.md` referenced by the story/epic is not present in this checkout, so the SCARNG/LOGPRO exact pass count (~19) and palette order were taken from the story description + SM assessment rather than the primary source. Affects `tempest/docs/`.

### Downstream Effects

- **`tempest`** — 1 finding

### Deviation Justifications

2 deviations

- **Pinned the rainbow palette to canonical full-saturation hex**
  - Rationale: The spec names hues, not hex; these are the unambiguous full-saturation values for those exact names (correct for a vector display) and give the tests a concrete, non-vacuous contract.
  - Severity: minor
  - Forward impact: If a future story tweaks the exact shades, this palette assertion must move with it.
- **Approximated the "~19 passes" depth count as exactly 19**
  - Rationale: The story title states 19 explicitly; a single fixed count makes spacing/colour-cycle assertions deterministic. The authoritative source doc was unavailable (see Delivery Findings).
  - Severity: minor
  - Forward impact: If the primary source pins a different count, change `LOGO_PASSES` and the spacing/loop tests follow.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Pinned the rainbow palette to canonical full-saturation hex**
  - Spec source: context-story-10-6.md, AC "Color cycles through the documented 6-color palette by depth"; story description "white/yellow/magenta/red/cyan/green"
  - Spec text: "each a different color cycling white/yellow/magenta/red/cyan/green"
  - Implementation: Tests assert `LOGO_PALETTE` (normalized) equals `[#ffffff,#ffff00,#ff00ff,#ff0000,#00ffff,#00ff00]` in that order; a `norm()` helper accepts either `#rgb` or `#rrggbb` form so Dev isn't locked to a literal spelling.
  - Rationale: The spec names hues, not hex; these are the unambiguous full-saturation values for those exact names (correct for a vector display) and give the tests a concrete, non-vacuous contract.
  - Severity: minor
  - Forward impact: If a future story tweaks the exact shades, this palette assertion must move with it.
- **Approximated the "~19 passes" depth count as exactly 19**
  - Spec source: context-story-10-6.md, AC "renders the word at multiple increasing depths with per-pass scale"; story title "(19-pass depth + color cycle)"
  - Spec text: "~19 passes from far to near"
  - Implementation: `LOGO_PASSES` is pinned to exactly 19 (the story title's stated count); even depth spacing of 1/19 is asserted.
  - Rationale: The story title states 19 explicitly; a single fixed count makes spacing/colour-cycle assertions deterministic. The authoritative source doc was unavailable (see Delivery Findings).
  - Severity: minor
  - Forward impact: If the primary source pins a different count, change `LOGO_PASSES` and the spacing/loop tests follow.

### Dev (implementation)
- No deviations from spec. Implemented `src/shell/titleLogo.ts` and the `drawAttract` wiring exactly to the TEA contract (19 passes, even spacing, palette colour cycle, monotonic per-pass scale, advance-on-renderTime). Free choices left open by the contract — the 1/z perspective scale curve, the `TITLE_BASE_PX`/`LOGO_RAINBOW_SPEED` tuning, and the depth-based alpha/blur cues — are render polish within spec, not deviations from it.

### Reviewer (audit)
- **TEA: Pinned the rainbow palette to canonical full-saturation hex** → ✓ ACCEPTED by Reviewer: the spec names hues; `#ffffff/#ffff00/#ff00ff/#ff0000/#00ffff/#00ff00` are their unambiguous full-saturation values (correct for a vector display), and the `norm()` helper keeps Dev free on `#rgb` vs `#rrggbb` form. Sound contract.
- **TEA: Approximated the "~19 passes" depth count as exactly 19** → ✓ ACCEPTED by Reviewer: the story title states "19-pass" explicitly; a fixed count is the correct, deterministic reading of "~19".
- **Dev: No deviations from spec** → ✓ ACCEPTED by Reviewer: confirmed — the implementation matches the TEA contract exactly; the perspective curve, tuning constants, and alpha/blur cues are render polish within spec, not deviations.
- No undocumented deviations found. The implementation keeps `titleY = H*0.18` (matching the original static title) and changes no attract input/flow; `TITLE_BASE_PX`/`LOGO_RAINBOW_SPEED` are new tuning constants, not spec divergences.