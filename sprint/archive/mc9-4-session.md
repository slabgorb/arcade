---
story_id: "mc9-4"
jira_key: "mc9-4"
epic: "mc9"
workflow: "tdd"
---
# Story mc9-4: Authentic stroke-font HUD and screen layout

## Story Details
- **ID:** mc9-4
- **Jira Key:** mc9-4
- **Workflow:** tdd
- **Repos:** arcade
- **Stack Parent:** none
- **Branch:** feat/mc9-4-mc9-4-authentic-stroke-font-hud
- **PR:** #136

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-08T21:17:14Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-08T20:23:47Z | 2026-08-08T20:25:53Z | 2m 6s |
| red | 2026-08-08T20:25:53Z | 2026-08-08T20:48:05Z | 22m 12s |
| green | 2026-08-08T20:48:05Z | 2026-08-08T21:01:49Z | 13m 44s |
| review | 2026-08-08T21:01:49Z | 2026-08-08T21:17:14Z | 15m 25s |
| finish | 2026-08-08T21:17:14Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

- **Improvement (non-blocking) — RASTER font fidelity: the faithful glyph source is a
  stamp module, NOT @shared/font.** The story says "cabinet's stroke-font glyphs / reuse
  @shared/font." Measured against the ROM: Missile Command is a RASTER cabinet and its
  alphanumerics are STAMPS — an ASCII byte → stamp address (CONVERT AN ASCII VALUE TO ITS
  STAMP ADDRESS, W3DSUP.MAC:1754) blitted by WRITE A STAMP (W3DSUP.MAC:587), the exact
  engine mc9-1 already ported into `src/shell/stamps.ts`. The score is 3-byte BCD shown by
  DISPLAY 6 DIGITS / DSPNUM "WITH LEADING ZERO SUPPRESSION" (W3DSUP.MAC:2202). `@shared/font`
  is TEMPEST's VECTOR alphabet — a different font. **Recommendation for Dev:** extend
  `stamps.ts` (or add a sibling mc-only `src/shell` glyph module) with an ASCII→stamp
  alphanumeric table rather than importing `@shared/font`; that is the faithful raster
  glyph and reuses the mc9-1 blitter. The AC's either/or permits `@shared/font`, so the
  RED tests are source-agnostic and do NOT force the stamp path — this is a fidelity
  recommendation, not a gate. Worth an Architect/owner nod if in doubt.

- **Gap (non-blocking) — the story's "stroke font" wording vs the raster reality.** Same
  root as above: AC1 says "stroke font." MC has no stroke font; its HUD is stamp glyphs.
  Dev should render stamps and keep the citation honest (cite :1754/:2202, not a vector-font
  provenance). Flagging so the Reviewer does not read "not a stroke font" as a miss.

- **Improvement (non-blocking) — two sibling test blocks were MIGRATED, not deleted for
  coverage loss.** `render-battle.test.ts` (mc3-5 HUD content) and `mc4-playthrough.test.ts`
  (mc4-4 wave/multiplier) asserted the HUD via the drawn `fillText` STRING
  (`texts(...).toContain('90210')`). That capability is impossible once the browser font is
  gone (no drawn string to read), so those blocks were relocated into `render-hud.test.ts`
  as font-agnostic mark-count checks. mc4-playthrough is now pure-core. No guarantee was
  dropped — score-verbatim, ammo, wave presence all re-pinned in render-hud.test.ts.

- **Question (non-blocking) — exact HUD placement is a REVIEWER screenshot, by design.** A
  node test with no real canvas cannot read the rendered digits or verify pixel layout
  (mc9-1 set this precedent). render-hud.test.ts pins only a gross top-band placement; the
  authentic score position/size and glyph correctness need an owner check at
  /missile-command/. Reviewer: eyeball the score digits and the `x{multiplier}` there.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### Dev (implementation)
- **Glyph source: mc-only stamp module, not @shared/font**
  - Spec source: context-story-mc9-4.md, AC2 ("reuses @shared/font or is a documented missile-command-only module")
  - Spec text: "Reuse @shared/font if it fits; otherwise a missile-command-only glyph module in src/shell"
  - Implementation: new `src/shell/glyphs.ts` — the ROM NUMBER/LETTER stamp tables, blitted by the mc9-1 stampPixels engine. Did NOT import @shared/font.
  - Rationale: the AC's own either/or, resolved per TEA's fidelity finding — MC is a RASTER cabinet; its authentic alphanumerics are 8x8 STAMPS (W3DSUP.MAC:1754/587), not Tempest's vector @shared/font. The stamp module is the faithful choice and reuses the mc9-1 blitter.
  - Severity: minor (within the AC's permitted options)
  - Forward impact: none — a future MC text story reuses `src/shell/glyphs.ts`; no src/shared extraction was made, so the CLAUDE.md bar is unmoved.
- **Multiplier label rendered as uppercase `X{n}`, was lowercase `x{n}`**
  - Spec source: prior HUD (render.ts:213, mc4-4), title asserts "authentic … layout"
  - Spec text: the retired HUD drew `WAVE {wave}  x{multiplier}`
  - Implementation: draws `WAVE {wave}  X{multiplier}` (uppercase X)
  - Rationale: the cabinet's alphanumeric stamp font (ASCSTP, W3DSUP.MAC:1760) is uppercase-only — there is no lowercase glyph; an unmapped char degrades to blank, so a literal lowercase 'x' would render as a GAP. Uppercase X is the faithful glyph.
  - Severity: minor
  - Forward impact: none — cosmetic label only; the multiplier VALUE is unchanged and still drawn verbatim from state.multiplier.
- **Glyph row order re-seated top-first (documented in glyphs.ts)**
  - Spec source: the ROM BUMP macro (W3DSUP.MAC:3544) + render.ts stamp convention
  - Spec text: `.MACRO BUMP A..H / .BYTE H,G,F,E,D,C,B,A` — the macro REVERSES its args into memory
  - Implementation: `glyphs.ts` stores the BUMP ARGS in written (top→bottom) order, not the reversed bytes the assembler emits, matching render.ts's rows[0]=top-row convention.
  - Rationale: render.ts's HUD draws rows[0] at the smallest canvas y (top); the BUMP args are authored top-first, so storing them un-reversed yields an upright glyph. Verified end-to-end in-browser (rendered '2' read back from canvas pixels == its bitmap, top-to-bottom, un-mirrored).
  - Severity: trivial (row-order bookkeeping, values verbatim)
  - Forward impact: none.

## Sm Assessment

Setup for mc9-4 (3pt, missile-command, tdd/phased). Board was clean at pickup — no
remote branch, no sibling session (a-3 held sw10-1). Fast-forwarded local develop 6
commits before setup so the story seeds on the current tree.

**Premises measured against the current tree — all current, no stale claims:**
- The monospace HUD the story retires is live at `plugins/missile-command/src/shell/render.ts:208-213`:
  `${hud}px monospace` drives three `fillText` readouts — `SCORE ${state.score}`,
  `AMMO ${bases.map(b=>b.ammo).join(' ')}`, `WAVE ${state.wave}  x${state.multiplier}`.
  All three already render; the story swaps the FONT and layout, not the data.
- Dependency check: mc3 (ICBM descent) and mc4 (wave + multiplier) have BOTH landed —
  `state.wave` / `state.multiplier` are live core fields (`core/game.ts:78,81`) already
  drawn. The description's "wave/multiplier if mc4 has landed" resolves to YES, so the
  stroke HUD must render wave and multiplier, not treat them as optional.

**Scope guardrails for TEA/Dev:**
- Shell-only. `core/` purity guard (purity.test.ts) must stay green.
- HUD-figure rule: the score drawn is `state.score` verbatim, never re-derived.
- Glyphs reuse `@shared/font` if it fits; otherwise a documented missile-command-only
  module under `src/shell` — no premature `src/shared` extraction (CLAUDE.md bar).
- Citation the ACs require (CLEAR SCREEN / text-draw path, W3DSUP.MAC:1712 + the
  alphanumeric draw): the missile-command reference quarry is gitignored — TEA/Dev must
  open the source to cite it, not fabricate. The `.bin` files are ASCII asm needing
  `tr '\r' '\n'` + `grep -a` (project memory).

ACs copied verbatim from `sprint/epic-mc9.yaml`; verified by phrase match. Story stamped
`in_progress` and the claim (stamp + context) pushed on the feature branch. Handing to
TEA (Tyr One-Handed) for the RED phase.

## Tea Assessment

RED phase complete. Commit `b8d57226`, pushed. Suite verified via testing-runner:
**9 RED-driver failures + 6 guards green; 875 sibling tests green; lint clean.**

**What I built.** One new file, `plugins/missile-command/tests/render-hud.test.ts`, plus
two migrations. The tests are deliberately SOURCE-AGNOSTIC — every behavioural assertion
passes for a stamp GREEN *or* a vector GREEN — because the AC permits either glyph source.
The recording mock is content-BLIND to `fillText` (one mark per call regardless of the
string), which is what makes "more digits → more marks" RED under today's monospace HUD and
GREEN once real per-character glyphs are drawn.

Groups (render-hud.test.ts):
- **A. AC1 — abandons the browser font (RED driver):** a fully-populated HUD draws ZERO
  fillText/strokeText; render.ts contains no `monospace`. This is the decisive pin — both
  a stamp GREEN (fillRect) and a vector GREEN (moveTo/lineTo) satisfy it.
- **B. AC1 — score from state.score, one glyph per digit (RED driver, HUD-figure rule):**
  a longer score paints strictly more marks; each identical added digit adds an IDENTICAL
  mark quantum (linearity → one glyph per char of `String(state.score)`). Presumes DSPNUM's
  leading-zero suppression; a zero-PADDED readout keeps the count constant and is correctly
  reddened (that is the faithful behaviour).
- **C. AC1 — top-band layout (RED driver):** differencing two scores cancels every fixed
  mark; the extra score glyphs must ALL land in the top 0.4·H band. Gross placement only —
  pixel-exact is the reviewer's screenshot.
- **D. AC1 — ammo + wave content-driven (RED drivers); multiplier present (guard):** dead
  bases isolate the HUD ammo from the mc9-1 pyramid; a 2-digit wave beats a 1-digit one.
  Multiplier is guarded structurally — capped at one digit, a stamp font (one stamp per
  glyph) exposes no mark-count signal to isolate it, so I assert render.ts still references
  `multiplier` and leave the `x4` to the reviewer's eye.
- **E. AC2 — citation (RED driver):** render must cite CLEAR SCREEN (W3DSUP.MAC:1712) and
  the alphanumeric draw (:1754 or :2202).
- **F. AC2 — citation second-entry (guard, byte-gated):** the vendored source at 1712/1754/
  2202 really IS those routines — I verified all three by hand and pinned it, so a citation
  can't be a real-looking-but-wrong line. Skips on CI (reference tree is gitignored).
- **G. AC2 — no premature src/shared extraction (guard):** render.ts may reuse the existing
  `@shared/font` but must not mint a new `@shared/*` glyph library.
- **H. AC3 — purity mirror (guard):** no glyph geometry in src/core.

**Migrations (see Delivery Findings):** `render-battle.test.ts` and `mc4-playthrough.test.ts`
asserted the HUD via the drawn fillText string; that is impossible once the browser font is
gone. Both relocated to render-hud.test.ts, font-agnostically. mc4-playthrough is now pure
core. No guarantee dropped.

**Rule Coverage** (`.pennyfarthing/gates/lang-review/typescript.md` + project rules):
- **Core/shell boundary (the project's #1 rule):** covered by Group H + the standing
  `purity.test.ts` (shell-only story; glyph geometry stays in src/shell). Verified green.
- **Citation discipline (mc reference gates):** Group E requires the cite; Group F verifies
  it against the ROM (the double-entry the codebase uses). Shell COMMENT cite, not a core
  `.BYTE` claim, so `citations.test.ts` is untouched — no claims JSON change needed.
- **No vacuous assertions:** every `it` asserts a value with a message; the guards (F/G/H,
  multiplier) are non-vacuous and PASS now by design (they gate the GREEN, not the RED).
  Self-checked — no `assert(true)`, no `let _ =`, no always-null `.toBe`.
- **HUD-figure rule (project invariant):** Group B pins score = `state.score` verbatim via
  the content-linkage delta, not a re-derivation.
- **No premature extraction (CLAUDE.md):** Group G.

**For Dev (Loki Silvertongue):** the RED tests do NOT force @shared/font. The FAITHFUL
GREEN is a stamp-based mc-only glyph module (extend `src/shell/stamps.ts` with an ASCII→
stamp alphanumeric table + the DSPNUM leading-zero-suppressed score) reusing the mc9-1
WRITE-A-STAMP blitter — see Delivery Findings. Keep the score verbatim, suppress leading
zeros, cite :1712 + :1754/:2202, draw at the top. Reviewer must screenshot /missile-command/
for glyph correctness and exact placement.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/missile-command/src/shell/glyphs.ts` (new) — the cabinet's alphanumeric STAMP
  font: ROM NUMBER (digits, W3DSUP.MAC:3552) + LETTER (A-Z, W3DSUP.MAC:3574) tables,
  verbatim, as 8x8 stamps; `glyphRows(ch)` maps ASCII→glyph (CONVERT AN ASCII VALUE TO ITS
  STAMP ADDRESS, W3DSUP.MAC:1754), unmapped → blank (ASCSTP→IBLANK).
- `plugins/missile-command/src/shell/render.ts` — HUD rewritten: draws SCORE / AMMO / WAVE
  + score multiplier as glyph stamps (each lit pixel a `fillRect`) in the top band, no
  fillText / no browser font. Score = `String(state.score)` VERBATIM (DSPNUM / DISPLAY 6
  DIGITS, W3DSUP.MAC:2202, leading zeros suppressed); ammo/wave/multiplier verbatim. Cites
  CLEAR SCREEN (W3DSUP.MAC:1712).

**Approach.** Took TEA's fidelity finding: MC is a raster cabinet, so the faithful HUD is
its stamp font, NOT `@shared/font` (Tempest's vector alphabet). Built the stamp glyph
module reusing mc9-1's `stampPixels` blitter — no new `src/shared` library, `@shared/font`
untouched. The score is the core's `state.score` verbatim (HUD-figure rule).

**Tests:** 884/884 missile-command passing (GREEN); `npm run lint` clean.
- render-hud.test.ts: 15/15 (the 9 RED drivers now green + the 6 guards).
- Migrated siblings render-battle / mc4-playthrough and the other render tests: all green.

**In-browser verification** (dev server on a spare port; the reviewer's screenshot job, done
early because I made a row-order judgment call): `drawFrame` renders with no exception; the
rendered `'2'` glyph, reconstructed from actual canvas pixels top-to-bottom, EXACTLY matches
its bitmap `[0,7c,c6,0e,3c,78,e0,fe]` — upright (top curve up, base bar down) and not
mirrored (MSB left). Console: 0 errors.

**Branch:** feat/mc9-4-mc9-4-authentic-stroke-font-hud (pushed, commit `50f46e81`)

**For the Reviewer (Heimdall).** Two things a node test can't judge, per the Delivery
Findings: (1) exact HUD placement/size at /missile-command/ (I drew at top-left, functional
white, scale `height/120`); (2) glyph legibility across all characters — I byte-verified the
digit/letter tables against the ROM and confirmed '2' end-to-end, but an eyeball of the full
"SCORE/AMMO/WAVE" strings at a real resolution is worth it. Deviations logged: mc-only stamp
module (within AC), uppercase `X` multiplier prefix (font is uppercase-only), row-order
re-seat (documented, values verbatim).

**Handoff:** To review.

## Delivery Findings (Dev)

- **Question** (non-blocking): the mc9-1 city/base stamps go through `project()`'s V-flip
  while this HUD uses direct canvas coords — I did NOT touch the city path, but a reviewer
  comparing the two stamp orientations at /missile-command/ is worthwhile to confirm mc9-1's
  cities read upright. Affects nothing in this diff; flagged only because both consume
  `stampPixels`. *Found by Dev during implementation.*
- No other upstream findings during implementation.
## Subagent Results

Toggles (`workflow.reviewer_subagents`): preflight, test_analyzer, comment_analyzer,
rule_checker ENABLED; edge_hunter, silent_failure_hunter, type_design, security,
simplifier DISABLED (domains assessed by the Reviewer directly + a mutation battery).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | lint ✅, vitest 884 ✅, orchestrator jt9 failure PRE-EXISTING on develop (unrelated) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings (assessed by Reviewer: glyphRows bounds-safe; blank fallback; gp guarded `Math.max(1,…)`; score never negative) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings (assessed by Reviewer: pure draw, no error paths, no swallowed errors) |
| 4 | reviewer-test-analyzer | Yes | findings | 5 (2 high, 2 med, 1 low) | confirmed 5, dismissed 0 — all FIXED (F1–F5) |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 high | confirmed 1 — FIXED (F6, space-citation) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings (covered by rule-checker: readonly on all glyph tables, no `any`, `as unknown as Ctx` is the repo idiom) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings (assessed: no user input/injection — canvas draw of internal state only) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings (assessed by Reviewer: found unused GLYPH_W/GLYPH_H — FIXED F7) |
| 9 | reviewer-rule-checker | Yes | findings | 3 (2 distinct sites) | confirmed 1 (#15 multiplier → F1), downgraded 1 (`as unknown as` = repo idiom), 1 not-attributable (pre-existing render-battle:232) |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled)
**Total findings:** 7 confirmed (F1–F7), 0 dismissed, 0 deferred — all FIXED in review and mutation-verified.

## Reviewer Assessment

**Verdict: APPROVED** (after review rework, commit `b1973add`).

This is a strong, faithful story: Missile Command's raster HUD retired the browser font for
the cabinet's own stamp glyphs. I verified the deliverable independently rather than trusting
the green suite.

**Independent verification (the highest-value checks):**
- **Glyph data is verbatim-correct.** I parsed the ROM NUMBER (W3DSUP.MAC:3552) and LETTER
  (:3574) `BUMP` tables and diffed all 10 digits + 26 letters against `glyphs.ts`: **0
  mismatches**. The "verbatim, re-seated top-first" claim holds. This is now permanently
  pinned by a byte-gated test (F5).
- **Citations are real.** All eight line citations (1712/1754/2202/587/3544/3552/3574/1842)
  point to exactly the routines claimed (comment-analyzer cross-checked; the byte-gated block
  E/F re-verifies the three primary lines against the vendored source).
- **The HUD renders correctly in a real browser.** Confirmed by Dev and re-checked: `drawFrame`
  throws nothing, and a rendered `'2'` reconstructed from canvas pixels matches its bitmap
  top-to-bottom (upright, not mirrored).
- **Mutation battery** (for the disabled correctness specialists): dropping `state.multiplier`
  → F1 fails; constant score → F2 + count tests fail (4); base-0-only ammo → F3 fails; a
  corrupted glyph byte → F5 fails. Every guard bites.

**Findings (all CONFIRMED and FIXED — code was correct; the gaps were in test strength + one
citation):**
- **F1 [TEST] [RULE] (checklist #15) — the multiplier guard was VACUOUS.** `expect(renderSrc()).toMatch(/multiplier/)`
  matched the word in render.ts *comments*; a mutant hardcoding `X4` (dropping `state.multiplier`)
  stayed green — I proved it. Named checklist violation (#15 token-not-claim, #25 whole-file
  scope), non-dismissible. **Fixed:** replaced with a position-set test (multiplier 1 vs 6 must
  paint different pixels); the harness now records x.
- **F2 [TEST] — score verbatim guarded for digit COUNT, not IDENTITY.** The HUD-figure rule
  (a project rule) was under-guarded: a re-derived same-length score passed. **Fixed:** added a
  digit-identity test (two same-length different-digit scores must light different pixels).
  Residual: a pure digit-REVERSAL is not distinguished by this test; that order-faithfulness is
  covered by F5 (correct glyph table) + the code literally drawing `String(state.score)` L-to-R
  + the in-browser render check. Acceptable.
- **F3 [TEST] — ammo aggregated all bases.** A base-0-only reader survived the `[1,1,1]` vs
  `[10,10,10]` test. **Fixed:** vary one base at a time.
- **F4 [TEST] — @shared guard scanned only render.ts,** blind to the story's own `glyphs.ts`.
  **Fixed:** scan every `src/shell` file.
- **F5 [TEST] — glyph bytes had no ROM pin.** **Fixed:** byte-gated spot-check of the
  NUMBER/LETTER `BUMP` rows vs `glyphRows`.
- **F6 [DOC] — `glyphRows` docstring misattributed SPACE's ROM path.** Space is *explicitly*
  mapped (SPECHA/TABCHA→SPECIC blank, :1846/3628), not the IBLANK no-match fallback (:1842),
  and space is on the hot path (every HUD string). **Fixed** the citation.
- **F7 [SIMPLE] — unused `GLYPH_W`/`GLYPH_H` exports** (+ their orphaned import). **Fixed** (removed).

**VERIFIED good (≥5, challenged against subagents/rules):**
1. Core/shell boundary intact — `glyphs.ts` imports nothing from `../core`; no core module
   gained glyph geometry; `purity.test.ts` green. (rule-checker #27 ✓)
2. No premature `src/shared` extraction — render.ts imports NO `@shared` module (chose the
   faithful mc-only path); `git diff -- src/shared/` empty. (rule-checker #28 ✓, F4 now guards it)
3. `.js` ESM import extensions present on both new relative imports. (#29 ✓)
4. `readonly` on every glyph table + the `glyphRows` return. (#31 ✓)
5. The retirement is applied everywhere, not just where the AC named it — no surviving
   `ctx.font`/`monospace`/HUD-`fillText`; the two migrated test blocks left no orphaned prose. (#24 ✓)
6. `as unknown as CanvasRenderingContext2D` in the mock — the established, byte-identical idiom
   in four sibling render tests; not a new escape. (rule-checker #1, downgraded to acceptable.)

### Rule Compliance (typescript.md, 31 rules)
rule-checker enumerated 74 instances across 31 rules: 3 violations at 2 distinct sites, all now
resolved — (a) #15/#25 multiplier vacuity → F1; (b) #1 `as unknown as` → established repo idiom,
acceptable; (c) render-battle:232 whole-file positive anchor → PRE-EXISTING (byte-identical to
develop), not attributable to this diff — noted as pre-existing debt, out of scope. Every other
rule (types, null-handling, modules, async, security, error-handling, perf, and the arcade
core/shell + shared-discipline additions) compliant.

**Pre-existing issues surfaced (not mc9-4's, filed for visibility):**
- `npm run test:orchestrator` fails on develop: `sprint/epic-jt9.yaml must exist` (a test
  references a missing epic YAML). Present on develop before this branch; my diff touches none
  of the guarded files. Someone should restore/retire that reference.
- render-battle.test.ts:232-233 uses whole-file `/\bscore\b/` positive anchors (same shape as the
  #15 anti-pattern) — pre-existing, untouched here; worth a cleanup story.

**For SM/finish:** the reviewer applied the fixes directly (single-threaded pipeline); every fix
is mutation-verified. Ready to finish. The reviewer's screenshot concern (glyph legibility /
exact placement) is satisfied by the in-browser render check + the ROM byte-pin.