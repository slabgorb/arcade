---
story_id: "SH2-3"
jira_key: ""
epic: "SH2"
workflow: "tdd"
---
# Story SH2-3: Glyph audit across the three canvas games + extend the shared stroke table to cover every rendered character

## Story Details
- **ID:** SH2-3
- **Jira Key:** (none — local sprint tracking)
- **Workflow:** tdd
- **Repos:** arcade-shared
- **Points:** 3
- **Priority:** p2
- **Stack Parent:** none
- **Branch:** feat/SH2-3-glyph-audit (off origin/develop)

## Acceptance Criteria

1. A per-game glyph inventory (asteroids/star-wars/battlezone) is documented and diffed against the shared table; the gap list is explicit.
2. Missing glyphs are added to @arcade/shared/font in the VGMSGA monoline style; layoutText unit tests cover each newly added glyph (strokes + advance width).
3. layoutText can represent the full text set of all three canvas games with no missing/placeholder characters.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-09T13:13:57Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-09T12:43:13Z | 2026-07-09T12:46:59Z | 3m 46s |
| red | 2026-07-09T12:46:59Z | 2026-07-09T13:02:29Z | 15m 30s |
| green | 2026-07-09T13:02:29Z | 2026-07-09T13:07:22Z | 4m 53s |
| review | 2026-07-09T13:07:22Z | 2026-07-09T13:13:57Z | 6m 35s |
| finish | 2026-07-09T13:13:57Z | - | - |

## Sm Assessment

**Setup verdict:** Ready for RED (TEA / O'Brien).

- **Repos corrected:** `pf sprint story field` misreported repos as `pennyfarthing`; the authoritative `sprint/epic-SH2.yaml` value is **arcade-shared**. Session, context, and branch all use arcade-shared.
- **Branch:** `feat/SH2-3-glyph-audit` created in the arcade-shared subrepo off `develop` (gitflow — PR targets `develop`, not main).
- **Merge gate:** clear — zero open PRs.
- **Context clobber check:** no pre-existing SH2-3 context, and git confirms tracked epic/story context files were untouched — nothing was stubbed over.
- **Prior-story quarry:** `sprint/archive/SH2-2-session.md` folded into the story context (shared font module shape: `layoutText`, `charGlyph`/`hasGlyph`, `GLYPH_CHARS`, `CELL_W`/`CELL_H`).

**RED-phase notes for O'Brien (verify before trusting):**
- arcade-shared tests are UNTYPED, node env — pin contracts at runtime or via source-text regex (node:fs), never compile-only annotations.
- The purity guard scans built `dist/` as source text (comments included); `@arcade/shared/font` is a PURE subpath and must stay DOM-free. Pretest build required.
- Reference quarry lives in sibling game repos (asteroids/star-wars/battlezone), text under `src/shell/` — enumerate every rendered character (score digits, framing copy, punctuation, copyright "(c)", radar/HUD labels) before diffing against the shared table.
- This is a discovery-gating story: it gates the per-game migrations SH2-4/5/6.

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** Discovery-gating story with concrete AC-2/AC-3 behaviour to pin (new glyph geometry + no-silent-degradation).

**Test Files:**
- `arcade-shared/tests/font-glyph-audit.test.ts` — per-game glyph audit (AC-1), the three new punctuation glyphs `_ , /` (AC-2), full-text-set coverage with no blank substitution (AC-3), and GLYPH_CHARS↔table sync invariants.

**Audit result (AC-1 — the explicit gap list):**

| Game | Rendered charset (canvas) | New vs shared table |
|------|---------------------------|---------------------|
| asteroids | A–Z, 0–9, space, `_` | **`_`** — initials-entry echo `'_'.repeat(...)` (render.ts:405) |
| star-wars | A C D E F G H I L M N O P R S T U V W X Y, 0–9, space, `,` | **`,`** — en-US score/bonus grouping via `toLocaleString` (render.ts:594,652) |
| battlezone | A–Z minus Q/X, 0–9, space, `/`, `-` | **`/`** — pause control card `'E / D'`,`'I / K'` |

- **Union font gap = `_` `,` `/`** (three glyphs). `-`, A–Z, 0–9, space already covered by SH2-2's VGMSGA table.
- **`▲` (U+25B2)** battlezone lives icon — descoped (icon, not glyph); see deviation + blocking Delivery Finding for SH2-6.
- **`©`/`(c)`** — not rendered on any canvas (DOM `<title>` only); no glyph needed.

**Tests Written:** 24 tests across 4 describe blocks. RED verified via testing-runner (RUN_ID `SH2-3-tea-red`): **12 failing / 158 pre-existing green, 0 regressions, pretest tsc clean.** Failures are confined to the new file and pinpoint `_`/`,`/`/` (missing glyph, zero strokes, blank-fallback identity, dropped chars in representative HUD strings).
**Status:** RED (failing — ready for Dev)

### Rule Coverage

| Rule (TS lang-review) | Test(s) | Status |
|------|---------|--------|
| #1 type-safety escapes (`as any`/`@ts-ignore`) | `font-source-rules.test.ts` scans all of `src/font.ts` incl. new glyph data | covered (existing) |
| #8 test quality (no vacuous asserts; import from `src/` not `dist/`) | new suite self-checked; imports `../src/font` | enforced |
| pure-module / DOM-free (no Math.random/Date; no `document`/`window`) | `font-source-rules.test.ts` + `purity.test.ts` (dist/ scan) — re-run green | covered (existing) |
| story footgun: silent blank degradation (`charGlyph`→BLANK) | AC-3 "no non-space char degrades to blank" + "distinct from blank fallback" invariant | failing (RED) |

**Rules checked:** 3 of 3 applicable lang-review rules have coverage (2 via existing source-text suites that also police the new glyph data; 1 enforced by self-check). New glyphs are pure data → no new type/async/null surface to test.
**Self-check:** 0 vacuous tests (every `it` asserts stroke geometry, advance, coordinate bounds, or coverage; the two green invariant guards are meaningful sync checks, not `assert(true)`).

**Handoff:** To Dev (Julia) for GREEN — add `_ , /` glyphs to the `ROM` map + `GLYPH_CHARS` in `arcade-shared/src/font.ts`, in the VGMSGA monoline stroke style (do NOT add `▲`).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `arcade-shared/src/font.ts` — added three glyphs to the `ROM` map and extended `GLYPH_CHARS`:
  - `','` → `[[8, 4, 0], [-4, -8, 1], [20, 4, 0]]` — a short tail hanging below the baseline, (8,4)→(4,−4); advance 24.
  - `'/'` → `[[16, 24, 1], [8, -24, 0]]` — a full-cell lower-left→upper-right diagonal, (0,0)→(16,24); advance 24.
  - `'_'` → `[[16, 0, 1], [8, 0, 0]]` — a bar along the baseline, (0,0)→(16,0); advance 24.
  - All three keep the monospace-ish 24-unit advance so HUD columns stay aligned, matching every existing glyph.

**Provenance note (for Reviewer):** these are NEW glyphs drawn to the VGMSGA style, **not** verbatim ANVGAN.MAC data — the original Atari font was caps-only alphanumerics + DASH. A demarcated comment block in `src/font.ts` records this so no one mistakes them for authentic ROM. This is what AC-2 mandates ("added in the VGMSGA monoline style"), so it is not a spec deviation.

**Scope restraint:** added exactly the three characters the audit flagged. `▲` (battlezone lives icon) intentionally NOT added — per TEA's descope, it's an icon for SH2-6 to render bespoke. No other changes.

**Tests:** 170/170 passing (GREEN) — verified via testing-runner (RUN_ID `SH2-3-dev-green`), pretest `tsc` clean. The 12 previously-failing audit tests now pass; the purity guard (dist/ DOM-free scan) and the SH2-2 fidelity suite are both still green (existing glyph geometry + cell/advance invariants undisturbed).

**Branch:** `feat/SH2-3-glyph-audit` (pushed to origin/arcade-shared, tracking set).

**Handoff:** To Reviewer (The Thought Police) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 smells; 170/170 green; purity 6/6; diff confined to 2 files | N/A |
| 2 | reviewer-edge-hunter | Yes | Skipped (disabled) | N/A | Disabled via settings — assessed by Reviewer directly |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped (disabled) | N/A | Disabled via settings — assessed by Reviewer directly |
| 4 | reviewer-test-analyzer | Yes | Skipped (disabled) | N/A | Disabled via settings — assessed by Reviewer directly |
| 5 | reviewer-comment-analyzer | Yes | Skipped (disabled) | N/A | Disabled via settings — assessed by Reviewer directly |
| 6 | reviewer-type-design | Yes | Skipped (disabled) | N/A | Disabled via settings — assessed by Reviewer directly |
| 7 | reviewer-security | Yes | Skipped (disabled) | N/A | Disabled via settings — assessed by Reviewer directly |
| 8 | reviewer-simplifier | Yes | Skipped (disabled) | N/A | Disabled via settings — assessed by Reviewer directly |
| 9 | reviewer-rule-checker | Yes | Skipped (disabled) | N/A | Disabled via settings — assessed by Reviewer directly |

**All received:** Yes (1 enabled subagent returned; 8 disabled via `workflow.reviewer_subagents` and assessed inline by Reviewer per the review-checklist)
**Total findings:** 1 confirmed (LOW), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

**Summary:** A minimal, correct, well-documented change — three new punctuation glyphs (`,` `/` `_`) added to the VGMSGA stroke table to close the cabinet-wide glyph gap the SH2-3 audit found. Hand-verified geometry, no regressions, purity preserved, tests meaningful. No Critical/High issues.

### Rule Compliance (TS lang-review checklist — applied to the diff myself, rule_checker disabled)

Enumerated every changed element (3 ROM entries + GLYPH_CHARS string + the new test file) against each applicable numbered check:

| Rule | Instances checked | Verdict |
|------|-------------------|---------|
| #1 type-safety escapes | `src/font.ts` `,`/`/`/`_` entries + GLYPH_CHARS; the whole test file | Compliant — no `as any`/`@ts-ignore`/non-null assertions (also policed by `font-source-rules.test.ts`) |
| #2 generic/interface pitfalls | 3 new `Vec` tuples under `Readonly<Record<string, readonly Vec[]>>` | Compliant — each conforms to `Vec = readonly [number, number, 0\|1]`; lit flags all 0/1; `readonly` intact; tsc pretest clean |
| #5 module/declaration | test import `../src/font`; `GLYPH_CHARS` export | Compliant — matches existing suites' resolution; export shape unchanged |
| #8 test quality | `tests/font-glyph-audit.test.ts` | Compliant — imports `src/` (not `dist/`), no `as any`, assertions non-vacuous |
| #12 perf/bundle | `GLYPHS` precompute IIFE | Compliant — glyphs built once at module load; negligible |
| #3,#4,#6,#7,#9,#10,#11,#13 | — | N/A — pure synchronous integer data; no enums, null-handling, async, JSX, config, input-validation, error-handling, or fix-diff surface |

### Observations (≥5, tagged by domain since specialist subagents are disabled)

- `[VERIFIED][TYPE]` The three ROM entries conform to `Vec` (`src/font.ts:105-107`); lit flags are all 0/1, `readonly` preserved, tsc pretest passed. No type escapes.
- `[VERIFIED]` Geometry hand-traced through `build()` (`src/font.ts:96`): `,`→ stroke `[(8,4),(4,-4)]`; `/`→ `[(0,0),(16,24)]`; `_`→ `[(0,0),(16,0)]`; each advance = 24, matching every sibling glyph so HUD column alignment is preserved. Matches the documented intent exactly.
- `[VERIFIED][SIMPLE]` Minimal, no scope creep — exactly 3 glyphs + GLYPH_CHARS + a comment; `build()`/`layoutText`/`charGlyph`/the `'0'=O` alias all untouched. No dead code.
- `[VERIFIED][DOC]` The added comment honestly discloses these are NEW (non-ROM) glyphs drawn to match VGMSGA — the surrounding module is emphatically "verbatim ANVGAN.MAC", so mislabeling here would be a provenance defect. Correctly demarcated (`src/font.ts:94-104`).
- `[VERIFIED][TEST]` The audit suite imports `../src/font`, asserts structural geometry (strokes/advance/bounds) rather than exact coordinates (so it is not over-coupled), and pins the silent-blank-degradation footgun (`charGlyph`→BLANK). Non-vacuous.
- `[VERIFIED][SEC]` No security surface: pure integer data, no DOM/input/IO; purity guard (`dist/` DOM-free scan) green.
- `[SILENT]` No swallowed errors introduced; the intentional degrade-to-blank path is now covered by AC-3 tests rather than left silent.
- `[EDGE]` The comma dips to y=−4 (below baseline) — within the test's `[-CELL_H, CELL_H]` band and correct comma behavior; games own their own layout/clipping. No boundary defect. Adversarially confirmed no consumer splits `GLYPH_CHARS` on the literal comma (only iterated char-by-char in arcade-shared's own tests).
- `[LOW][TEST]` The AC-2 tests do not pin the exact visual *shape* — a structurally-valid but wrong-direction glyph (e.g. a backslash) would still pass. **Decision:** accept as LOW. Glyph shape is an inherently visual/design judgment; arcade-shared is a pure library with no render surface to visually test, and I hand-verified the geometry matches intent. Downstream visual confirmation lands in SH2-4/5/6 when the games render these glyphs.
- `[VERIFIED][RULE]` Self-run rule-checker: all applicable TS lang-review checks pass across both changed files (see Rule Compliance table above).

### Devil's Advocate

Assume this is broken. The sharpest real risk is `▲`: battlezone's lives counter renders `'▲'.repeat(lives)` through `ctx.fillText`, so `▲` *is* part of battlezone's rendered text stream, and AC-3 literally says "the full text set … with no missing/placeholder characters." This change deliberately omits it — so a hostile reading is that AC-3 is only partially met and `layoutText('▲')` silently returns a blank. Is that a slipped requirement? No: SH2-3 is a font-data story that GATES the migrations; it does not touch battlezone. The omission is captured as a **blocking** Delivery Finding for SH2-6 (the story that actually rewrites `drawLives`), plus a 6-field TEA deviation. So `▲` cannot silently vanish — SH2-6 must consciously render it bespoke or add a glyph. The category call (a filled up-triangle icon is not typography and does not belong in an alphanumeric stroke alphabet) is sound. What else could break? A confused player sees "AB_" during initials entry — the underscore is a full-width baseline bar reading as an empty slot; correct. A stressed input — `layoutText` of a 10k-char comma-heavy score — stays O(n), pure, no allocation surprises. A malicious `GLYPH_CHARS` consumer splitting on comma? Verified none exists; it is only iterated char-by-char. Could the new glyphs disturb existing fidelity? The SH2-2 exact-coordinate anchors (A/I/O/R/T/0) and the cell/advance invariants stayed green; the `'0'=O` alias is untouched. Could tsc have let a bad lit flag through? All flags are literal 0/1 and the pretest build is clean. The comma is admittedly minimal (a single tail stroke) and the underscore sits at the baseline rather than a descender — both are defensible monoline choices at 16×24 integer resolution and are visual, not correctness, matters. Nothing here rises to Critical or High. Verdict stands: APPROVED, with the `▲` forward-risk re-anchored below.

**Data flow traced:** game HUD string → `layoutText(text)` → `charGlyph(ch)` per char → `GLYPHS[ch]` (now incl. `,`/`/`/`_`) → positioned stroke geometry → (downstream, in SH2-4/5/6) game strokes it to canvas. Safe: pure, deterministic, no DOM.
**Pattern observed:** new glyphs appended to the `ROM` VCTR-chain map with a demarcated non-ROM provenance comment — `src/font.ts:94-107`. Good pattern (honest provenance in an authenticity-sensitive module).
**Error handling:** unsupported chars still degrade to a blank via `charGlyph` (`src/font.ts:152`) — intentional, now test-covered.
**Handoff:** To SM for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Question** (blocking): battlezone's lives counter renders `▲` (U+25B2) as text via `'▲'.repeat(lives)`, but it is an ICON, not a typographic glyph — it is intentionally excluded from the shared font. Affects `battlezone/src/shell/render.ts` (drawLives, ~line 218) — SH2-6 must render the lives indicator as a bespoke vector shape rather than layoutText, OR the team must decide to add a `▲` glyph to @arcade/shared/font. *Found by TEA during test design.*
- **Improvement** (non-blocking): despite the story description calling out "(c)", NO game renders `©`/`(c)` on the canvas — the only copyright/framing text is the DOM `<title>` in each index.html. So no copyright glyph is required; the font gap is exactly `_ , /`. Affects `sprint/epic-SH2.yaml` (SH2-3 scope note — can be trimmed). *Found by TEA during test design.*
- **Gap** (non-blocking): high-score `name` fields in all three games are hydrated from localStorage and validated only as `typeof name === 'string'` (@arcade/shared/highscore `isHighScoreRow`), so a tampered/externally-seeded row could render characters the font lacks; in-code names are always uppercase A–Z (asteroids initials; 'ACE'/'AAA' defaults), which the font covers. Affects `arcade-shared/src/highscore.ts` (row validation) — out of scope for SH2-3 but worth a future hardening story. *Found by TEA during test design.*

### Dev (implementation)
- No upstream findings during implementation. The three glyphs dropped into the existing `ROM` map + `GLYPH_CHARS` cleanly; no changes needed in any consuming game or sibling module (SH2-4/5/6 will consume the completed font at a pinned ref when they run).

### Reviewer (code review)
- **Question** (blocking): [RE-ANCHOR of TEA's finding] battlezone's `drawLives` renders `▲` (U+25B2) via `ctx.fillText('▲'.repeat(lives))`, but `▲` is intentionally NOT in the shared font (icon, not typographic glyph). Affects `battlezone/src/shell/render.ts` (drawLives, ~line 218) — **SH2-6 MUST** render the lives indicator as a bespoke vector shape (not `layoutText`), or explicitly decide to add a `▲` glyph; otherwise battlezone lives will render blank after the TTF removal. Reviewer confirms this is the sole forward risk and it is properly captured. *Found by Reviewer during code review (confirming TEA's finding).*
- **Improvement** (non-blocking): `sprint/epic-SH2.yaml` SH2-3 scope line lists "(c)" as a character to cover, but the audit proved no game renders a copyright glyph on canvas — the epic text could be trimmed to avoid implying a missing glyph. Affects `sprint/epic-SH2.yaml`. *Found by Reviewer during code review (confirming TEA's finding).*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Audit encoded as a reviewed fixture, not a live grep of the sibling game repos**
  - Spec source: context-story-SH2-3.md, "Notes for TEA (Red Phase)" / Technical Approach
  - Spec text: "these tests read the game repos (asteroids/star-wars/battlezone) as a data source (grep/parse their render.ts), not as a build dependency."
  - Implementation: the audited per-game character sets are hardcoded as provenance-commented fixtures in `tests/font-glyph-audit.test.ts`; the game repos are NOT read at test time.
  - Rationale: arcade-shared is built + tested standalone (`pretest` tsc, then vitest); the games are gitignored siblings absent in a clean checkout / CI / a published consumer, so a cross-repo `fs.read` would fail with ENOENT (wrong reason) instead of asserting coverage. The audit is a point-in-time human-reviewed artifact, better pinned as data.
  - Severity: minor
  - Forward impact: none for SH2-4/5/6 (they consume the completed font). If a game later adds new rendered text, the fixture + its provenance comment must be updated in lockstep.
- **`▲` (U+25B2) lives icon deliberately excluded from the required-coverage set (partial AC-3)**
  - Spec source: sprint/epic-SH2.yaml, SH2-3 AC-3
  - Spec text: "layoutText can represent the full text set of all three canvas games with no missing/placeholder characters."
  - Implementation: the required set excludes battlezone's `▲`, rendered by `drawLives` via `'▲'.repeat(lives)` (battlezone/src/shell/render.ts:218). The RED tests require only the typographic gap `_ , /`.
  - Rationale: `▲` is an iconographic HUD element (a filled up-triangle), not a typographic character; VGMSGA is an alphanumeric+punctuation STROKE alphabet, and outlining a filled icon would change its look (filled→hollow) and pollute the alphabet. Recorded as a blocking Delivery Finding so the team decides explicitly.
  - Severity: minor
  - Forward impact: SH2-6 (battlezone) — the `drawLives` `▲` fillText path must migrate to a bespoke vector shape, NOT layoutText; if the team instead rules `▲` belongs in the font, this test's required set + a `▲` glyph must be added.

### Dev (implementation)
- No deviations from spec. The three glyphs (`,` `/` `_`) are exactly the gap AC-2 mandates, drawn in the VGMSGA monoline style (16×24 cell, 24-unit advance). They are NEW, not verbatim ROM (the Atari alphabet was caps-only alphanumerics + dash) — this is documented in a demarcated comment block in `src/font.ts` so no one mistakes them for authentic ROM data. `▲` intentionally not added, per TEA's descope.

### Reviewer (audit)
- **TEA: "Audit encoded as a reviewed fixture, not a live grep of the sibling game repos"** → ✓ ACCEPTED by Reviewer: sound. arcade-shared builds/tests standalone (`pretest` tsc + vitest) and the games are gitignored siblings absent in a clean checkout/CI; a cross-repo `fs.read` would ENOENT, not assert coverage. Pinning the human-reviewed audit as a provenance-commented fixture is the correct, robust choice.
- **TEA: "`▲` (U+25B2) lives icon deliberately excluded from the required-coverage set (partial AC-3)"** → ✓ ACCEPTED by Reviewer: sound category call — a filled up-triangle icon is not typography and does not belong in the VGMSGA alphanumeric stroke alphabet. Accepted specifically BECAUSE the omission is not silent: it is a **blocking** Delivery Finding forcing SH2-6 to handle the lives indicator explicitly. Re-anchored in my own Delivery Findings.
- **Dev: "No deviations from spec" (with non-ROM provenance note)** → ✓ ACCEPTED by Reviewer: correct — adding new monoline glyphs is exactly what AC-2 mandates, so it is not a deviation; and the non-ROM provenance is honestly disclosed in a demarcated `src/font.ts` comment rather than mislabeled as verbatim ROM. Verified no fabricated ROM-authenticity claim.
- No undocumented deviations found: the diff matches the logged intent exactly (3 glyphs + GLYPH_CHARS + comment; no stray edits).