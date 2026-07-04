---
story_id: "A2-2"
jira_key: ""
epic: "A2"
workflow: "trivial"
---
# Story A2-2: Adjust letter spacing for the vector font

## Story Details
- **ID:** A2-2
- **Title:** Adjust letter spacing for the vector font
- **Jira Key:** (none)
- **Epic:** A2 (Asteroids — playtest followup)
- **Workflow:** trivial
- **Repos:** asteroids
- **Points:** 1
- **Type:** chore
- **Stack Parent:** none

## Context Summary

This story is title-only with no formal acceptance criteria or description in the sprint YAML. The user has approved proceeding with an explicit understanding of the font strategy decision (ADR-0002 bypass): the de-facto approach established by sibling story bz2-2 ("arcade vector font") is the canonical vector font strategy; A2-2 treats that implementation as settled and only adjusts its letter spacing.

### Concrete Testable Objective

Locate the asteroids vector/stroke font used for on-screen text (HUD score, GAME OVER, high-score entry, attract mode) and adjust its inter-glyph letter spacing so text reads cleanly. The implementer must first discover where the font glyphs and advance-width are defined in the asteroids codebase (likely in src/shell or a dedicated font module) before modifying anything.

### Font Strategy Gate Decision (Recorded)

A2-2 is formally gated by the unwritten ADR-0002 vector-font strategy decision (Vector Battle TTF vs tempest's ROM stroke font). However:
- Story bz2-2 ("arcade vector font") is complete and has shipped a de-facto vector font implementation
- User has explicitly approved proceeding with A2-2 using that established font
- This is a conscious bypass of the formal gate, not a blocker
- A2-2 does NOT implement a new font strategy, only adjusts spacing on the existing one

## Workflow Tracking
**Workflow:** trivial
**Phase:** finish
**Phase Started:** 2026-07-04T14:15:07Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-04T13:49:57.733130Z | 2026-07-04T13:53:42Z | 3m 44s |
| implement | 2026-07-04T13:53:42Z | 2026-07-04T14:04:39Z | 10m 57s |
| review | 2026-07-04T14:04:39Z | 2026-07-04T14:15:07Z | 10m 28s |
| finish | 2026-07-04T14:15:07Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

No upstream findings (setup phase)

### Dev (implementation)
- **Improvement** (non-blocking): The Vector Battle HUD face is caps-only and appears to lack digit glyphs, so score / high-score numerals fall back to the CSS stack (Orbitron/monospace) — a style mismatch with the vector caps, and bare `.notdef` tofu where the fallback is unavailable (verified in-browser: numerals rendered as boxes in headless Chromium while the caps "ASTEROIDS" / "PUSH START" rendered correctly). Pre-existing since A-16's HUD; entirely out of scope for A2-2 (letter spacing only), but a candidate follow-up. Affects `src/shell/render.ts` (drawHud numerals via `formatScore`) and `src/shell/font.ts` (glyph coverage). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): Hoist the px-parsing regex `/(\d+(?:\.\d+)?)px/` out of `drawText` to module scope — it is allocated + exec'd on every text run inside the 60fps render loop. Affects `src/shell/render.ts` (line ~297; move next to `HUD_TRACKING_EM`). The identical inline pattern also ships in `star-wars/src/shell/render.ts:811` (glowText), so this is a cross-repo cleanup candidate. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): The letterSpacing fallback default `16` is a bare magic number (duplicates `SMALL_FONT`'s 16px) and its branch is untested; currently dead code since all font constants carry an `Npx` token. Affects `src/shell/render.ts` (line ~298). A cheap, non-brittle guard (assert tracking is >0 and scales with declared px size, without pinning the 0.1em value) would catch a future reformat of a font constant to a non-px unit. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

No deviations recorded (setup phase)

### Dev (implementation)
- No deviations from spec. The story was title-only; the context-derived objective (apply proportional inter-glyph tracking to the caps-only Vector Battle HUD face) was implemented directly, mirroring the established, shipped star-wars `glowText` value (~0.1em derived from each run's px size). No spec value was overridden. No new unit test was added: per the HUD test-harness convention (`tests/render-hud.test.ts` header — "pin MECHANISMS ... never layout/coordinates; size and glow are visual criteria, eyeballed") and the star-wars precedent, letter spacing is a visual feel value verified by eyeballing the dev server, not pinned in a test.

### Reviewer (audit)
- **Dev's "No deviations from spec" (incl. the no-new-test decision)** → ✓ ACCEPTED by Reviewer: the change matches the context-derived objective exactly (proportional inter-glyph tracking on the established Vector Battle face). The no-test decision is sound — it is consistent with the HUD test-harness's explicit "eyeball visual criteria" convention (`tests/render-hud.test.ts` header) and the star-wars precedent (independently confirmed by reviewer-test-analyzer: star-wars' letterSpacing is stubbed but never asserted). No undocumented spec deviation found.

## SM Assessment

**Setup Complete:** Yes
**Story:** A2-2 — Adjust letter spacing for the vector font (1pt, trivial/chore, asteroids)
**Workflow:** trivial (phased) → next phase: implement (Dev)
**Branch:** `chore/A2-2-adjust-letter-spacing` (asteroids, off develop @ a197054)
**Context:** `sprint/context/context-story-A2-2.md` (enriched — title-only story given a concrete, testable objective)

**Coordination notes for Dev:**
- The sprint YAML defines this story as **title-only** — no acceptance criteria, no description. The context file derives the concrete objective: find the asteroids vector/stroke font (HUD score, GAME OVER, high-score entry, attract mode) and adjust inter-glyph letter spacing. Discover where glyph advance-width lives before editing.
- **Font-strategy gate:** A2-2 is formally gated by the unwritten ADR-0002 decision. The user explicitly approved proceeding — sibling story bz2-2 shipped a vector font, treated here as the de-facto standard. Conscious bypass, recorded in context; not a blocker.
- **Merge gate was cleared before setup:** A2-1's PR #16 (playfield margin mask) merged externally mid-session; A2-1 reconciled to `done`. A collateral YAML-corruption side-effect of `pf sprint story complete` on `epic-SH.yaml` (a truncated SH-1 acceptance criterion) was caught and reverted.

**Handoff:** To Dev (Julia) for the implement phase.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `src/shell/render.ts` (asteroids) — added `HUD_TRACKING_EM = 0.1`; `drawText` now sets `ctx.letterSpacing` to ~0.1em derived from each text run's own px size (parsed from its font string), so the 16/22/48px faces all get proportional tracking. Every on-screen text run (HUD score/high-score, attract ASTEROIDS/PUSH START/high-score board, GAME OVER + initials entry) flows through `drawText`, so one change covers them all. Vector strokes are unaffected (letterSpacing applies to text only). +13 lines, no deletions.

**Approach:** Mirrored star-wars' shipped `glowText` tracking (the sibling that shares the Vector Battle face, per `font.ts`'s header), honouring the recorded ADR-0002 font-gate bypass (treat the established face as settled; adjust spacing only).

**Tests:** 593/593 passing (GREEN); `tsc --noEmit` + `vite build` GREEN. No new test added — letter spacing is a visual feel value, eyeballed per the HUD-harness convention (see Design Deviations note).

**Visual verification:** Ran the dev server on an isolated port (5399, to view *this* checkout — :5275 was held by another server) and loaded it in a headless browser. The attract banner **ASTEROIDS** (48px) and **PUSH START** (22px) render with clean, airy, well-proportioned tracking — readable, not cramped, not gappy. Only console error was a benign favicon 404. (Numerals showed as fallback tofu in the fallback-less headless env — see the pre-existing Delivery Finding above; not caused by this change.)

**Branch:** `chore/A2-2-adjust-letter-spacing` (asteroids) — committed `2269219`, pushed to origin. No PR (SM finish phase owns PR creation).

**Handoff:** To review phase (The Thought Police).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 smells (2 advisory notes) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 2 (low) | confirmed 2, dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 2 (low) | confirmed 2, dismissed 0, deferred 0 |

**All received:** Yes (3 enabled subagents returned; 6 disabled via `workflow.reviewer_subagents` and pre-filled as Skipped — they do not block the gate)
**Total findings:** 4 confirmed (all LOW, non-blocking), 0 dismissed, 0 deferred

### Rule Compliance

Exhaustive enumeration against the TypeScript lang-review checklist + project conventions (no `.claude/rules/` or `SOUL.md` exist; conventions drawn from CLAUDE.md). The diff is one constant + two statements in `drawText`, so most rule categories have zero instances.

- **Rule 1 — type-safety escapes:** COMPLIANT. `ctx.letterSpacing` (render.ts:298) is a real typed DOM property (build passes under `strict: true`); no `as any`, `@ts-ignore`, or non-null `!`. The `px ? … : 16` ternary is a genuine null-check on `RegExpExecArray | null`.
- **Rule 4 — null/undefined handling:** COMPLIANT. `px` is `RegExpExecArray | null` (arrays always truthy), so the ternary is a presence-check, not a `0`/`""` falsy-conflation. The `+` quantifier guarantees `px[1]` is a non-empty digit string when `px` is truthy → `parseFloat` never receives `undefined`.
- **Rule 12 — performance/bundle:** VIOLATION (LOW) `[RULE]`. The regex literal (render.ts:297) is allocated + exec'd on every `drawText` call inside the per-frame render loop; not hoisted like `HUD_TRACKING_EM`. Negligible absolute cost; non-blocking. Logged as a delivery finding.
- **Convention — named/documented feel constants:** `HUD_TRACKING_EM = 0.1` COMPLIANT (named + richly commented; improves on star-wars' inline `* 0.1`). The `16` fallback is a VIOLATION (LOW) `[RULE]` — bare magic number duplicating `SMALL_FONT`'s 16px; dead branch today. Logged as a delivery finding.
- **Convention — core/shell purity boundary:** COMPLIANT. File is `src/shell/render.ts`; canvas manipulation is the shell's job. No new `src/core` imports.
- **Convention — ESM/strict TS:** COMPLIANT. `tsc --noEmit` + `vite build` green.
- **Rules 3, 5, 6, 7, 10, 11 (enums / modules / React / async / input-validation / error-handling):** N/A — no instances in the diff (`font` is an internal constant, not user/network input; no enums/async/JSX/try-catch introduced).

### Observations

1. `[VERIFIED]` Single text path, no bleed — `render.ts:303` is the **only** `fillText`/`strokeText` in the file, inside `drawText`; `letterSpacing` is written exactly once (`:298`) immediately before it. `letterSpacing` affects text only, never `stroke()`, so `drawShip`/`drawRock`/`drawBullet`/`drawSaucer`/`drawLifeIcon`/`drawMarginMask` are untouched. Evidence: `grep -nE 'fillText|strokeText|letterSpacing' src/shell/render.ts` → one of each. Complies with the (implicit) "shell owns rendering" convention.
2. `[VERIFIED]` Type-safe under `strict: true` — `px[1]` types as `string` (regex group is `+`; `noUncheckedIndexedAccess` off), `parseFloat` sound, `.toFixed(2)` yields a valid CSS length. Evidence: `tsconfig.json:6` `"strict": true`; `npm run build` GREEN.
3. `[VERIFIED]` Graceful degradation — on engines without canvas `letterSpacing` (older Safari), assignment is a silent no-op; text renders at default tracking (== pre-change behavior), no throw. Mirrors the font-loader's own fallback philosophy (`font.ts`).
4. `[VERIFIED]` Faithful sibling mirror — identical formula ships in `star-wars/src/shell/render.ts:811-812` (glowText); a proven in-family pattern, per `font.ts`'s "mirrored from star-wars" header.
5. `[LOW]` `[TEST]` Untested regex `:16` fallback branch (render.ts:298) — dead code today (all font constants carry `Npx`); no live regression, but unguarded against a future non-px font reformat.
6. `[LOW]` `[TEST]` The HUD Proxy harness doesn't snapshot per-call `letterSpacing`; a cheap non-brittle test (tracking > 0 and scales with declared px) could pin the mechanism without pinning the 0.1em feel value. Existing suites unaffected (593/593 green).
7. `[LOW]` `[RULE]` Per-frame regex allocation not hoisted (render.ts:297) — see Rule 12.
8. `[LOW]` `[RULE]` `16` fallback magic number (render.ts:298) — see convention rule.

Dispatch-tag coverage (6 subagents disabled via settings; their domains self-assessed on this 13-line diff):
- `[EDGE]` (disabled): the sole boundary is the regex-no-match → `:16` fallback, enumerated in obs. 5. No other edge in a const + 2-statement diff.
- `[SILENT]` (disabled): the `:16` fallback is a silent default — benign, unreachable today, logged. No swallowed errors (no try/catch added).
- `[DOC]` (disabled): comments (render.ts:52-57, 294-296) accurately describe mechanism, provenance, and the no-bleed rationale — self-verified against the code.
- `[TYPE]` (disabled): `strict: true`, no `any`/casts introduced; see obs. 2.
- `[SEC]` (disabled): N/A — `font` is an internal constant, not user/network input; `letterSpacing` is a render hint. No injection surface.
- `[SIMPLE]` (disabled): minimal +13/−0; the only simplification is the regex hoist (`[RULE]`).

### Devil's Advocate

Suppose this code is broken. The most plausible failure is latent, not present: the px-parsing regex assumes every `font` string contains an `Npx` token. Today all three constants (`HUD_FONT`/`SMALL_FONT`/`BANNER_FONT`) do, so the happy path is provably correct. But a future maintainer who reformats a constant to a relative unit — `"700 1.5rem 'Vector Battle'"` or `"bold 1.4em/1.2 …"` — silently drops into the untested `:16` fallback, producing a fixed 1.6px tracking on text of any size, with **no red test** to catch it (obs. 5/6). That is a real maintainability trap, though not a live bug. Second: `ctx.letterSpacing` persists on the context across the whole frame and across frames; the design is safe only because `drawText` is the sole text path and always re-sets it. That invariant is load-bearing but enforced only by a comment — a future debug overlay that calls `fillText` directly would inherit stale tracking. Third: with `textAlign: 'center'`/`'right'`, the browser includes trailing letter-spacing in the measured advance, nudging text off-center by ~half the tracking (≈2.4px for the 48px banner). Imperceptible here, and star-wars accepts the same, but a pedant could call the HUD "misaligned." Fourth: on browsers without canvas `letterSpacing` support (older Safari), the story's deliverable simply doesn't render — text stays cramped — so one could argue the AC "renders cleanly" is unmet on those engines; however this is the identical graceful-degradation the whole font stack already accepts. Fifth, performance: ~12 text runs/frame × 60fps ≈ 720 tiny RegExp allocations/sec (obs. 7) — negligible GC churn, but non-zero and trivially avoidable by hoisting. None of these rise to broken: the shipping path is correct, type-safe, tested-green (593/593), and faithful to a proven sibling. All concerns are LOW and captured as non-blocking delivery findings.

## Reviewer Assessment

**Verdict:** APPROVED

A single-file, +13/−0 cosmetic chore that applies proportional inter-glyph tracking to the HUD/overlay text. Correct, type-safe under `strict`, all tests + build green, and a faithful mirror of the shipped star-wars `glowText` pattern. No Critical or High findings from any subagent or my own pass; the four confirmed findings are all LOW / non-blocking and logged as delivery findings for a cheap future cleanup.

**Subagent dispatch tags:** `[TEST]` 2 LOW (untested fallback branch; unpinned tracking mechanism) · `[RULE]` 2 LOW (per-frame regex allocation; `16` magic-number fallback) · `[EDGE]`/`[SILENT]`/`[DOC]`/`[TYPE]`/`[SEC]`/`[SIMPLE]` subagents disabled via settings, domains self-assessed clean/N-A above.

**Data flow traced:** internal `font` constant (e.g. `HUD_FONT`) → regex extracts px → `letterSpacing` string → `ctx.letterSpacing` → `fillText`. Safe because `font` is a trusted internal constant, never user input; the only external-ish value reaching `fillText` is the score/initials `text` argument, which is untouched by this diff and not part of the spacing computation.

**Pattern observed:** named feel-constant + per-run derivation from font px, mirroring `star-wars/src/shell/render.ts:811` — improves on the sibling by naming the `0.1` constant with rationale (render.ts:52-58).

**Error handling:** no throws added; regex-miss handled by null-check → fallback; unsupported `letterSpacing` degrades to a silent no-op (no crash). Verified against the whole file.

**Handoff:** To SM (Winston Smith) for finish-story.