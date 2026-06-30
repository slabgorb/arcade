---
story_id: "10-13"
jira_key: "none"
epic: "10"
workflow: "tdd"
---
# Story 10-13: Authentic VGMSGA stroke-vector font (replace TTF webfont) [stretch]

## Story Details
- **ID:** 10-13
- **Jira Key:** none (local tracking)
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-30T13:05:49Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-30T10:44:52Z | 2026-06-30T10:46:26Z | 1m 34s |
| red | 2026-06-30T10:46:26Z | 2026-06-30T11:52:42Z | 1h 6m |
| green | 2026-06-30T11:52:42Z | 2026-06-30T12:43:47Z | 51m 5s |
| review | 2026-06-30T12:43:47Z | 2026-06-30T13:05:49Z | 22m 2s |
| finish | 2026-06-30T13:05:49Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): epic-10 context referenced `docs/tempest-1981-source-findings.md` (the full *Tempest vs Tempest* book capture) which did not exist on develop — it was stranded on an unmerged a-1 branch. Recovered to develop via PR #74, and a focused `docs/ux/2026-06-30-vector-font-rom-extract.md` was added. Affects `sprint/context/context-epic-10.md` (its "Ref: …source-findings.md Font" now resolves). *Found by TEA during test design.*
- **Improvement** (non-blocking): ~20 framing/HUD strings render through `drawGlowText`/`glowText` with the `'Vector Battle'` TTF family; AC-2 requires routing them all through the new vector-font path — a sizable but mechanical surface. Affects `src/shell/render.ts`. *Found by TEA during test design.*
- **Question** (non-blocking): the authentic `MESS` color/scale/Y table (extract doc + findings §4) differs in places from our current message colors/positions; full parity could be a separate fidelity story, out of 10-13 scope (which is the font itself). Affects `src/shell/render.ts` message styling. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): a few non-ROM characters in instructional copy — `/` in "PRESS START / ENTER TO BEGIN", `+` in "SPINNER + SPACE TO PLAY", and the `_` initials placeholder — are not in the authentic VGMSGA alphabet and now render as blank gaps. Affects `src/shell/render.ts` (reword copy, or draw a placeholder bar for empty initials slots). *Found by Dev during implementation.*
- **Question** (non-blocking): AC-4 visual parity ("legible at HUD and banner scales", "parity with prior text") is not covered by automated tests — needs an eyeball check of the attract / select / HUD / game-over screens. Affects the verify phase. *Found by Dev during implementation.*
- **Improvement** (non-blocking): `drawHighScoreTable` still sets `ctx.textAlign`/`ctx.textBaseline`, now unused by the vector path — minor dead state for the simplify pass. Affects `src/shell/render.ts`. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): `layoutText` allocates fresh stroke arrays on every call, and `render` calls it for every on-screen string each frame (incl. the 19-pass attract title) — negligible at these string lengths but a candidate for per-glyph screen-stroke caching if profiling ever flags it. Affects `src/shell/vecfont.ts`. *Found by Reviewer during code review.*
- **Question** (non-blocking): AC-4 (visual parity / legibility) cannot be verified from code review — recommend an eyeball check of the attract / select / HUD / game-over screens before finish (echoes Dev's finding). Affects the verify/finish step. *Found by Reviewer during code review.*
- **Improvement** (non-blocking, visual): AC-4 visual check DONE (attract / select / HUD / game-over screenshotted; font renders legibly at all sizes — PASS). One responsive-layout blemish: on narrow viewports the monospace "START LEVEL NN" (64px) on the skill-select screen overruns the flanking "NOVICE"/"EXPERT" labels; fine at wider widths. Deferred by user as a later responsive cleanup, not a font defect. Affects `src/shell/render.ts` `drawSelect`. *Found by Reviewer during visual check.*

## Impact Summary

**Upstream Effects:** 2 findings (1 Gap, 0 Conflict, 0 Question, 1 Improvement)
**Blocking:** None

- **Gap:** epic-10 context referenced `docs/tempest-1981-source-findings.md` (the full *Tempest vs Tempest* book capture) which did not exist on develop — it was stranded on an unmerged a-1 branch. Recovered to develop via PR #74, and a focused `docs/ux/2026-06-30-vector-font-rom-extract.md` was added. Affects `sprint/context/context-epic-10.md`.
- **Improvement:** a few non-ROM characters in instructional copy — `/` in "PRESS START / ENTER TO BEGIN", `+` in "SPINNER + SPACE TO PLAY", and the `_` initials placeholder — are not in the authentic VGMSGA alphabet and now render as blank gaps. Affects `src/shell/render.ts`.

### Downstream Effects

Cross-module impact: 2 findings across 2 modules

- **`sprint/context`** — 1 finding
- **`src/shell`** — 1 finding

### Deviation Justifications

4 deviations

- **New pure `vecfont.ts` module instead of housing the table in `font.ts`**
  - Rationale: `glyphs.ts` is the established sibling pattern for pure vector glyph data; keeps `font.ts`'s shell-loading concern separate and the glyph table unit-testable in isolation.
  - Severity: minor
  - Forward impact: Dev creates `vecfont.ts` and slims/repurposes `font.ts`; `render.ts` imports `vecfont`.
- **Verbatim coords pinned for a representative subset, full set enforced structurally**
  - Rationale: the subset covers multi-stroke (A), 3-stroke (I), closed (O), the typo-correcting (T) and the alias (0=O) cases; invariants + the extract doc give full coverage without brittle per-glyph fixtures.
  - Severity: minor
  - Forward impact: none — Dev implements all 37 from `docs/ux/2026-06-30-vector-font-rom-extract.md`; verify phase may add more anchors.
- **Updated a sibling story's test (`render.banners.test.ts`, Story 10-9)**
  - Rationale: the 10-9 helper was coupled to the exact font-string format this story removes; its parser had to adapt. The 10-9 assertion intent (authentic Messages-table colors) is fully preserved.
  - Severity: minor
  - Forward impact: none — 10-9's color contract is intact; new banners use the `(…, sizePx, color, blur)` signature.
- **`drawGlowText` takes a numeric `sizePx`; vertical anchoring is now explicit**
  - Rationale: vector text has no CSS font; px size + explicit alignment is the natural API. May produce minor vertical position shifts vs the old ambient-baseline behavior — to be confirmed by the AC-4 visual check.
  - Severity: minor
  - Forward impact: none — all call sites updated; HUD readouts pinned to `vAlign:'top'` to keep them tucked under the screen edge.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **New pure `vecfont.ts` module instead of housing the table in `font.ts`**
  - Spec source: context-story-10-13.md, Problem
  - Spec text: "Replace the TTF webfont (font.ts:16-26) with an authentic stroke-vector alphabet: a per-letter glyph table"
  - Implementation: tests drive a NEW pure module `src/shell/vecfont.ts` for the glyph table (mirroring `glyphs.ts`); `font.ts` is treated as the TTF-removal site rather than the table's home.
  - Rationale: `glyphs.ts` is the established sibling pattern for pure vector glyph data; keeps `font.ts`'s shell-loading concern separate and the glyph table unit-testable in isolation.
  - Severity: minor
  - Forward impact: Dev creates `vecfont.ts` and slims/repurposes `font.ts`; `render.ts` imports `vecfont`.
- **Verbatim coords pinned for a representative subset, full set enforced structurally**
  - Spec source: context-story-10-13.md, AC-1
  - Spec text: "A stroke-vector glyph table renders the alphabet/digits used in-game on a consistent cell"
  - Implementation: exact authentic coordinates are asserted for a diverse subset (A, I, O, R, T, 0); the remaining glyphs are enforced via invariants (completeness, cell-bounds, stroke semantics, advance) rather than 37 verbatim fixtures.
  - Rationale: the subset covers multi-stroke (A), 3-stroke (I), closed (O), the typo-correcting (T) and the alias (0=O) cases; invariants + the extract doc give full coverage without brittle per-glyph fixtures.
  - Severity: minor
  - Forward impact: none — Dev implements all 37 from `docs/ux/2026-06-30-vector-font-rom-extract.md`; verify phase may add more anchors.

### Dev (implementation)
- **Updated a sibling story's test (`render.banners.test.ts`, Story 10-9)**
  - Spec source: tests/shell/render.banners.test.ts (Story 10-9) + context-story-10-13.md, AC-2
  - Spec text: 10-9's `bannerColorArg` parsed the banner color positionally after the `'monospace'` font string; AC-2 requires "All current on-screen gameplay text uses the vector font (no TTF dependency)".
  - Implementation: removed the CSS font strings from render.ts (no more `'monospace'`) and updated `bannerColorArg` to read the color after the numeric size. The banner colors and family assertions (blue/green/red) are unchanged.
  - Rationale: the 10-9 helper was coupled to the exact font-string format this story removes; its parser had to adapt. The 10-9 assertion intent (authentic Messages-table colors) is fully preserved.
  - Severity: minor
  - Forward impact: none — 10-9's color contract is intact; new banners use the `(…, sizePx, color, blur)` signature.
- **`drawGlowText` takes a numeric `sizePx`; vertical anchoring is now explicit**
  - Spec source: context-story-10-13.md, AC-3/AC-4
  - Spec text: "Glyphs stroked via the existing vector/glow path; legible at HUD and banner scales … parity with prior text"
  - Implementation: the helper signature changed from a CSS font string to a numeric cap-height, and vertical placement is now an explicit `vAlign` ('top'/'middle'/'bottom') instead of the ambient `ctx.textBaseline`. Text is centered on `y` by default (was alphabetic baseline at several call sites).
  - Rationale: vector text has no CSS font; px size + explicit alignment is the natural API. May produce minor vertical position shifts vs the old ambient-baseline behavior — to be confirmed by the AC-4 visual check.
  - Severity: minor
  - Forward impact: none — all call sites updated; HUD readouts pinned to `vAlign:'top'` to keep them tucked under the screen edge.

### Reviewer (audit)
- **TEA: New pure `vecfont.ts` module instead of housing the table in `font.ts`** → ✓ ACCEPTED by Reviewer: mirrors the established `glyphs.ts` pure-value-producer pattern; keeps the table unit-testable and core-free. The rule-checker confirms `vecfont.ts` has zero imports and full purity.
- **TEA: Verbatim coords pinned for a representative subset, full set enforced structurally** → ✓ ACCEPTED by Reviewer: I independently verified all 36 non-aliased glyphs (A–Z, 1–9, space) are **byte-identical to the original Atari `ANVGAN.MAC`**, plus `0`=`O` and the `-` (DASH) from `ALVROM.MAC`. The structural invariants + this full-source diff cover what the 5 pinned anchors don't.
- **Dev: Updated a sibling story's test (`render.banners.test.ts`, 10-9)** → ✓ ACCEPTED by Reviewer: the 10-9 helper was coupled to the now-removed `'monospace'` font string; the updated regex reads the color after the numeric size and the blue/green/red family assertions are unchanged. The 10-9 suite (13 tests) passes; intent preserved.
- **Dev: `drawGlowText` takes a numeric `sizePx`; vertical anchoring explicit** → ✓ ACCEPTED by Reviewer: the new signature is stricter (number vs CSS string) and all call sites were converted faithfully (each old `NNpx` maps to the right size; no string font args remain). The minor vertical-anchor shift is a visual-parity (AC-4) item, flagged for the eyeball check — not a code defect.

## SM Assessment

**Story:** 10-13 — Authentic VGMSGA stroke-vector font (replace TTF webfont). 5 pts, p3, STRETCH. Repo: `tempest`.

**Scope (coordination view):** Replace the TTF webfont approximation (`font.ts:16-26`) with a true per-letter stroke-vector alphabet — a glyph table in the `CHAR.x` / `glyphs.ts` style (~16×24 cell), stroked like the existing enemy/claw glyphs. The goal is authentic vector text, not a font lookalike. Ref: `context-epic-10.md` Font section and `context-story-10-13.md`.

**Readiness:**
- Session, story context, and epic context all present.
- Feature branch `feat/10-13-vgmsga-stroke-vector-font` created on tempest (base `develop`).
- No blocking PRs — merge gate clear.
- No Jira (local YAML tracking).

**Routing:** Phased TDD workflow. Handing off to **TEA (Han Solo)** for the RED phase — author failing tests pinning the glyph-table contract and the font-rendering behavior before any implementation. Implementation specifics belong to TEA/Dev, not SM.

**Risks to flag downstream:** This is a stretch story touching a broad UI surface (all rendered text). TEA should ensure tests cover the glyph table completeness (full alphabet/digits/punctuation used in the UI) and that the new vector path is exercised wherever the old webfont was.

---
## TEA Assessment

**Tests Required:** Yes
**Reason:** 5-pt fidelity feature — the authentic VGMSGA glyph geometry and the "no TTF" behavior must be pinned before implementation.

**Test Files:**
- `tempest/tests/shell/vecfont.test.ts` — drives a pure glyph module `src/shell/vecfont.ts` (in the `glyphs.ts` style) and pins: the 16×24 cell, verbatim authentic geometry, completeness, pen-up/down stroke semantics, string layout/advance, purity + architectural-boundary rules, and the no-TTF ACs.

**Authentic source grounding:** `tempest/docs/ux/2026-06-30-vector-font-rom-extract.md` — all 37 `CHAR.x` glyphs lifted verbatim from the original Atari `ANVGAN.MAC` (Ed Logg, 6-JUNE-79) via the `mwenge/tempest` disasm, cross-checked vs *Tempest vs Tempest* §4 (rescued to develop as PR #74).

**Tests Written:** 25 tests across 8 groups, covering all four ACs.
**Status:** RED ✅ — `vitest run tests/shell/vecfont.test.ts` → `1 file failed`, exit 1 (module `src/shell/vecfont.ts` does not exist yet). Verified by `testing-runner` (RUN_ID `10-13-tea-red`).

### Rule Coverage
| Rule | Test(s) | Status |
|------|---------|--------|
| Hard Architectural Boundary — shell never imports sim/core | `is render-only: never imports … core` | RED |
| Purity — no ambient time/randomness | `is pure: no Math.random/Date/performance` | RED |
| TS lang-review #1 — no `as any` / `@ts-ignore` | `uses no \`as any\` / @ts-ignore` | RED |
| Determinism — same input → identical glyph | `same char in, identical glyph out` | RED |
| Authentic fidelity — ROM-accurate geometry | `A/I/O/R/T verbatim` + `CHAR.0 = CHAR.O` | RED |
| No TTF dependency (AC-2) | `font.ts no longer loads a FontFace` + `render.ts draws via vecfont` | RED |

**Rules checked:** boundary + purity + type-safety + determinism (the applicable tempest shell rules; same rubric `glyphs.test.ts` enforces).
**Self-check:** 0 vacuous tests — every test asserts concrete geometry/structure (no `let _ =`, no `assert(true)`, no always-None checks).

**Handoff:** To Dev (Yoda) for GREEN — implement `src/shell/vecfont.ts` (all 37 glyphs from the extract doc), remove the TTF `FontFace` path from `font.ts`, and route `render.ts` framing/HUD text through the vector font.

---
## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/shell/vecfont.ts` (new) — pure, deterministic 37-glyph VGMSGA table (verbatim ROM) + `charGlyph`/`hasGlyph`/`layoutText`/`CELL_W`/`CELL_H`. `CHAR.0` aliases `CHAR.O`.
- `src/shell/render.ts` — new `vecText()` strokes glyphs through the glow path; `drawGlowText` delegates to it; every framing/HUD/banner string draws via the vector font; all `'Vector Battle'` literals removed.
- `src/shell/font.ts` — TTF `FontFace` loader removed; re-exports the vector font.
- `src/main.ts` — removed the now-unneeded async font load.
- `tests/shell/render.banners.test.ts` — color helper adapted to the new signature (deviation logged above).

**Tests:** 741/741 passing (GREEN); `tsc --noEmit` clean. Includes `vecfont.test.ts` (25) and the Story 10-9 banner suite (13). Verified by `testing-runner` (RUN_ID `10-13-dev-green-3`).

**Branch:** `feat/10-13-vgmsga-stroke-vector-font` — pushed to origin (docs + tests + impl).

**AC status:**
- AC-1 (stroke-vector glyph table on a consistent cell) ✅ — 37 glyphs, 16×24 cell, verbatim ROM.
- AC-2 (all on-screen text uses the vector font; no TTF) ✅ — `font.ts` drops the FontFace; `render.ts` draws via `vecfont`; no `'Vector Battle'`.
- AC-3 (stroked via the vector/glow path; legible at HUD & banner scales) ✅ in code — `vecText` uses the additive glow passes; **legibility is the AC-4 visual check**.
- AC-4 (visual parity) ⚠️ — **not automated**; recommend a visual check of attract / select / HUD / game-over before review sign-off (see Delivery Findings).

**Handoff:** To verify/review. Recommend (1) the AC-4 visual parity check, and (2) consideration of the non-ROM-character finding (`/`, `+`, `_`).

---
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 1 perf note | confirmed 1 (LOW), dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | N/A — disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | N/A — disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | N/A — disabled via settings |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | N/A — disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | N/A — disabled via settings |
| 7 | reviewer-security | No | Skipped | disabled | N/A — disabled via settings |
| 8 | reviewer-simplifier | No | Skipped | disabled | N/A — disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations (15 rules / 47 instances) | confirmed 0, dismissed 0, deferred 0 |

**All received:** Yes (2 enabled subagents returned; 7 skipped via `workflow.reviewer_subagents` settings)
**Total findings:** 1 confirmed (LOW perf, non-blocking), 0 dismissed, 0 deferred.

## Reviewer Assessment

**Verdict:** APPROVED

**Observations:**
- [VERIFIED] **All 37 glyphs are byte-identical to the original Atari `ANVGAN.MAC`** — evidence: programmatic diff of `vecfont.ts` ROM data vs `ANVGAN.MAC` (Ed Logg, 6-JUNE-79): 36 of 36 non-aliased glyphs (A–Z, 1–9, space) exact; `0`=`O` aliased; `-` matches the `ALVROM.MAC` DASH (`0,12,0 / 16,0,B / 8,-12,0`). This is the load-bearing fidelity guarantee, since tests only pin A/I/O/R/T verbatim.
- [VERIFIED] **Hard Architectural Boundary intact** — evidence: `grep src/core/` finds no shell import; `vecfont.ts:1-151` has zero imports; `font.ts` only re-exports `./vecfont` (shell→shell). [RULE] corroborated by rule-checker #14.
- [VERIFIED] **`vecfont.ts` is pure/deterministic** — evidence: no `Math.random`/`Date`/`performance`/DOM (grep + rule-checker #15); `build()` precomputes `GLYPHS` once at module load; `charGlyph` is total (unknown→BLANK). The `vecfont.test.ts` G-section enforces this at runtime.
- [VERIFIED] **No TTF dependency (AC-2)** — evidence: `render.ts` contains no `Vector Battle`/`FontFace`/`.ttf`; `font.ts` FontFace loader deleted; `main.ts` load-call removed; `tsc --noEmit` clean confirms `main.ts` compiles without it.
- [VERIFIED] **`vecText` rendering math** — evidence: `render.ts` `scale = sizePx/CELL_H`, screen `y` flip `baseY - p.y*scale`, `vAlign` (`baseY = y / y+sizePx/2 / y+sizePx`) and `align` (`ox` via `width`) are internally consistent across top/middle/bottom and left/center/right.
- [VERIFIED] **Size conversions faithful** — evidence: every removed `NNpx` literal maps to the correct numeric size; no string font args remain; the inflated 13/22 counts reconcile to the old shared `NUM_FONT`/`LABEL_FONT` constants being inlined.
- [LOW] **`layoutText` allocates per call** at `vecfont.ts:140` — render calls it for every on-screen string each frame (incl. the 19-pass attract title). Negligible at these string lengths; non-blocking [from preflight].
- [LOW] **Non-ROM characters degrade to blank** — `/`, `+` in instructional copy and the `_` initials placeholder render as gaps (the VGMSGA alphabet has no such glyphs). Cosmetic; logged by Dev; AC-4 eyeball will judge.
- [RULE] reviewer-rule-checker: **15 rules / 47 instances / 0 violations**.

### Rule Compliance (TypeScript lang-review + tempest CLAUDE.md)
- **#1 type-safety escapes** — PASS: no `as any`/`@ts-ignore`/unsafe `!` (tests use `as XY` tuple narrowing, not `as any`).
- **#2 generics/readonly** — PASS: `Readonly<Record<…>>`, `readonly` tuples/arrays throughout; no `Record<string,any>`/`Function`/`object`.
- **#4 null/undefined** — PASS: `charGlyph` guards `GLYPHS[ch]` with `hasGlyph`; index access typed `VecGlyph` (not `|undefined`); no `||`-on-falsy.
- **#5 modules** — PASS: `export * from './vecfont'` is a valid wildcard re-export (not subject to the named-`export type` isolatedModules rule); imports match the Vite resolution model.
- **#8 test quality** — PASS: meaningful assertions; `as XY` tuple narrowing only; imports from `src/`, no mocks.
- **Boundary + purity (CLAUDE.md)** — PASS: core untouched; shell font module pure (rule-checker #14/#15).

### Devil's Advocate
Suppose this is broken. The highest-leverage attack is a **single wrong glyph coordinate**: only A/I/O/R/T are pinned verbatim, so a typo in, say, `CHAR.Q`'s tail or `CHAR.5`'s arm would pass every test and ship a garbled letter. I closed this by diffing all 36 non-aliased glyphs against the original `ANVGAN.MAC` byte-for-byte — they match, so this avenue is dead. Next, `charGlyph` is **total**: an unexpected character (control char, newline, lowercase, `_`/`/`/`+`) silently becomes a blank advance instead of throwing — a confused user could in theory see a gap where a character "should" be. But all rendered text is game-derived (uppercased, padded numeric scores, 3-char initials drawn from a fixed letter set), so no untrusted/arbitrary string reaches the font; the only visible gaps are the known instructional-copy punctuation, already logged. A stressed render: `layoutText('')` yields `{strokes:[], width:0}` (draws nothing — safe), and very long strings can't occur (scores cap at 7 digits, names at 3). `vecText` does `save()`/`restore()` without `try/finally`, so a mid-draw throw would leak canvas state — but the body is pure arithmetic + `moveTo/lineTo/stroke`, none of which throw here. A subtle visual risk remains: vertical anchoring moved from the ambient `ctx.textBaseline` to an explicit `vAlign` default of `middle`, so a few framing screens may shift a few pixels vs the old TTF — that is exactly the AC-4 parity item flagged for an eyeball, not a logic defect. There is no security surface (browser-only, no parsing, no IO, no `eval`/innerHTML). Conclusion: the only plausible "breakage" is cosmetic and gated by the visual check; nothing corrupts state or escapes the type system.

**Data flow traced:** `GameState.score` (number) → `String(...).padStart(...)` → `vecText(text)` → `layoutText` → glyph strokes → `ctx.stroke()`. Safe — no external input; text is entirely game-derived.

**Pattern observed:** `vecfont.ts` mirrors the `glyphs.ts` pure-value-producer pattern and the `?raw` source-boundary-scan idiom (`vecfont.test.ts:46`) — consistent with the established shell conventions.

**Error handling:** `charGlyph` is total (no throw on unknown char); `layoutText('')` handled; no async/IO to fail (the old failure path — `loadVectorFont`'s `try/catch` — was correctly deleted with the TTF).

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story. Non-blocking follow-ups: AC-4 visual parity eyeball; consider per-glyph caching in `layoutText` only if profiling flags it; decide on the `/`+`_` copy.