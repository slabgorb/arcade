---
story_id: "ml9-3"
jira_key: "ml9-3"
epic: "ml9"
workflow: "tdd"
---
# Story ml9-3: Millipede DDT-bomb two-colour treatment (red 'DDT' text on the blue box) + attract enemy-showcase per-section text colours (white high-scores, red creature labels)

## Story Details
- **ID:** ml9-3
- **Jira Key:** ml9-3
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/ml9-3-ddt-two-colour-and-showcase-text-colours
- **PR:** #440 (code) — https://github.com/slabgorb/arcade/pull/440 (base develop, awaiting owner merge)
- **Archive PR:** pending — chore/ml9-3-sprint-complete, to be cut off develop AFTER #440 merges (two-PR gitflow; avoids epic-YAML collision)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-16T00:21:44Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-15T23:24:40Z | 2026-08-15T23:28:58Z | 4m 18s |
| red | 2026-08-15T23:28:58Z | 2026-08-15T23:45:53Z | 16m 55s |
| green | 2026-08-15T23:45:53Z | 2026-08-15T23:58:54Z | 13m 1s |
| review | 2026-08-15T23:58:54Z | 2026-08-16T00:09:39Z | 10m 45s |
| red | 2026-08-16T00:09:39Z | 2026-08-16T00:15:35Z | 5m 56s |
| green | 2026-08-16T00:15:35Z | 2026-08-16T00:17:00Z | 1m 25s |
| review | 2026-08-16T00:17:00Z | 2026-08-16T00:21:44Z | 4m 44s |
| finish | 2026-08-16T00:21:44Z | - | - |

## Background

Two deferred visual-fidelity items from the ml9-2 review, both requiring an OWNER/DESIGN decision because the target colours are SCREENSHOT-ONLY (no ROM colour byte reproduces them).

**Part (1): DDT-bomb lettering.** With per-code fieldPens (ml9-2) the DDT box already renders BLUE for free (non-mushroom code keeps base pen 3 = poison $F8), matching MAME's box colour — what REMAINS is the RED 'DDT' text INSIDE the box. The baked tile ($2E/$2F) is MONOCHROME (one pixel value), so the letters take the same pen as the box; a two-colour (blue box + red text) result needs a re-baked/two-colour DDT sprite AND an owner call, since the only DDT-labelled CLRCH slot (ANCOL+1/+9) is the DDT-EXPLOSION cloud = inside-mushroom $0b, MLIRQ.MAC:267-268, NOT a blue-box+red-text scheme.

**Part (2): Attract enemy-showcase text colours.** MAME shows WHITE high scores + RED creature labels on the blue showcase; ours renders all green (census default). The colours ARE ROM slots (white $00 ANCOL+3, red $1F ANCOL+2) but MLATR.MAC:580-610 has NO per-section colour write and both letters and digits use pixel value 2, so it CANNOT be a pixel-value distinction — it needs core/attract-showcase.ts to expose SECTIONED placements + per-section palettes wired in main.ts. This is a DIFFERENT file surface (core/attract-showcase.ts) from ml9-2's in-game render path.

**Design sub-decisions:** Two residual architectural choices are FOR ARCHITECT/TEA to resolve against the MAME reference screenshot (sprint/planning/ml9-playthrough-refs/attract-mame-reference.png) and DOCUMENT per the acceptance criteria, NOT blocking questions for the user:
- (a) Cell background: black boxes vs blue show-through
- (b) DDT red-text source: re-baked/two-colour sprite vs alternative

## Acceptance Criteria

1. Attract enemy-showcase renders WHITE high-scores and RED creature labels (per attract-mame-reference.png), via sectioned placements + per-section palettes in core/attract-showcase.ts wired through main.ts, with the section→colour mapping and any background decision (black box vs blue show-through) pinned to the ROM/MAME source or an explicit owner call.
2. DDT-bomb renders the RED 'DDT' lettering on its blue box (two-colour treatment), with the source of the red text (re-baked/two-colour sprite vs alternative) and the screenshot-only colour choice confirmed by an owner/design decision and documented.
3. No regression to the ml9-2 in-game colours (HUD red, grass band, per-code mushroom caps), the in-game HUD, or the self-playing attract demo.

## Technical Approach & Notes

**File Surface Split:** Per the epic rule, this story spans two file surfaces:
- Core/attract-showcase.ts: showcase-text recolour (sections + per-section palettes)
- Shell/gfx-rom.ts, shell/render.ts: DDT sprite re-bake and render path

TEA/Architect may split the DDT-sprite work from the showcase-text recolour if they land on different file surfaces, as noted in the epic.

**ROM Citations:**
- DDT monochrome sprite source: plugins/millipede/src/shell/gfx-rom.ts (existing DDT decoder)
- DDT explosion CLRCH slot: MLIRQ.MAC:267-268 (ANCOL+1/+9 inside-mushroom $0b — NOT a blue-box+red-text colour scheme)
- Attract showcase layout + colours: MLATR.MAC:580-610 (ROM attract code; white $00 ANCOL+3, red $1F ANCOL+2; both letters/digits use pixel value 2)
- Visual target: sprint/planning/ml9-playthrough-refs/attract-mame-reference.png (MAME ground truth — screenshot-only colours; no ROM byte reproduces them)

**Seams:** core/attract-showcase.ts, shell/render.ts, shell/playfield-palette.ts, shell/gfx-rom.ts

**Design Notes:** The two architectural choices (cell background, DDT source) are for Architect/TEA to resolve by visual comparison against MAME and document inline, per the acceptance criteria. These are NOT user-facing questions; the targets are pinned by the reference screenshot.

## Delivery Findings

### Dev (implementation)

- **Gap** (non-blocking): the showcase black-box cell backgrounds are not implemented — `attract-mame-reference.png` shows solid black panels behind the creature sprites, but the showcase still renders them over the blue background. Affects `plugins/millipede/src/main.ts` (`renderShowcase` — draw a black rect behind each showcase sprite/cell before the stamps). Decision (black boxes) is pinned in Design Deviations; implementation deferred. *Found by Dev during implementation.*
- **Question** (non-blocking): the DDT letter colour and the showcase section colours are SCREENSHOT-ONLY — the visual playtest (playbook §4) at `/millipede/` is the final arbiter. Two things for the owner to confirm against the screenshots: (1) the in-game DDT 'DDT' letters read dark/ambiguous in `ingame-mame-reference.png`, and this ships them RED per the AC's explicit wording; (2) the two-colour DDT glyph's rotation/position (it reuses the same CCW rotation + grid→pixel law as the working monochrome box, so it should match, but only eyes confirm). Affects the render output; no code change unless the owner vetoes RED. *Found by Dev during implementation.*

### Reviewer (code review)

- No upstream findings. The two blocking findings (vacuous main.ts wiring guards) are THIS story's rework, detailed in the Reviewer Assessment; the black-box panel gap is already captured above by Dev. *Found by Reviewer during code review.*

## Design Deviations

The two "owner/design decisions" the story deferred to TEA/Architect, resolved by
TEA against the MAME reference screenshots (the pinning source per the ACs):

- **(a) Cell backgrounds = BLACK boxes, not blue show-through.**
  `attract-mame-reference.png` shows each creature sprite inside a solid BLACK
  rectangular panel over the blue field. Decision: black boxes. NOTE (scope): this
  is a *documented decision*, not a unit-pinned deliverable — the AC1-testable core
  is the TEXT section colours (pinned in tests). Implementing black-box panels
  (panel geometry per creature cell) is Dev/Architect's to size against
  `main.ts` render; if non-trivial it may split to a follow-up. Proven at the
  visual playtest (playbook §4), not by a geometry unit test.

- **(b) DDT red 'DDT' text = a RE-BAKED two-colour tile, box blue + letters red.**
  The ROM DDT tiles ($EE/$EF) are monochrome: the box is pixel value 3 and the
  'DDT' letters are pixel value 0 (transparent holes → black show-through today).
  The red letters are a SCREENSHOT-ONLY owner enhancement — no ROM colour byte
  produces red-on-blue (the only DDT-labelled CLRCH slot is the explosion cloud,
  inside-mushroom $0B, MLIRQ.MAC:267-268). Decision: re-bake the DDT letter cells
  to a SECOND non-zero pixel value, and code-gate `fieldPens()` for the DDT codes
  $6E/$6F to map the box value → blue (poison $F8) and the letter value → red
  ($1F). Which pixel value carries the letters is Dev's choice; the tests pin the
  rendered outcome (blue box + red letters), not the value index. OBSERVATION for
  the visual playtest: MAME's in-game DDT letters read dark/ambiguous at this
  resolution; the AC (three mentions) specifies RED, so RED is the owner call —
  the owner can veto at the playtest against the screenshot.

### Dev (implementation)

- **DDT two-colour realized as a separate override glyph, not a re-baked STAMPS tile**
  - Spec source: context-story-ml9-3.md AC-2 + Design Deviations (b); story seam "shell/gfx-rom.ts (DDT re-bake)"; TEA's RED test tests/ddt-two-colour.test.ts (original draft)
  - Spec text: "a re-baked/two-colour DDT sprite" — the RED draft asserted `STAMPS[charTile($6E/$6F)]` carries two non-zero pixel values
  - Implementation: `src/shell/stamp-data.ts` (STAMPS) is byte-pinned to a fresh `decodeStamp` of the picture EPROMs (`tests/stamp-data.test.ts` AC-3b runs here — EPROMs present — and AC-6 re-bakes byte-identically), so STAMPS CANNOT carry a second ink for the letters. Added `src/shell/ddt-glyph.ts` (a hand-authored two-colour override: box value 3, letter value 1, transparent corners), a grid render seam `drawStampGridAtPx` in `shell/render.ts`, and a code-gated red letter pen in `fieldPens()`; `main.ts` substitutes the glyph for DDT cells. Re-pointed the RED test from STAMPS to the glyph (I authored it as TEA — same-session correction).
  - Rationale: the byte-equality invariant forbids editing STAMPS; the "re-baked *sprite*" is correctly realized as a separate override asset. Rendered outcome is identical (blue box + red 'DDT' letters).
  - Severity: minor
  - Forward impact: the DDT override glyph is maintained separately from the ROM decode — a future graphics re-bake leaves it untouched, and any change to the DDT box shape must update `ddt-glyph.ts` alongside. `fieldPens($6E/$6F)` now returns a red pen 1 (code-gated; no other field cell affected).

- **Showcase cell backgrounds: the black-box decision is documented but panels are NOT implemented**
  - Spec source: context-story-ml9-3.md AC-1 ("any background decision (black box vs blue show-through) pinned to the ROM/MAME source or an explicit owner call")
  - Spec text: the AC requires the background decision to be *pinned*; the screenshot shows black panels behind the creature sprites
  - Implementation: pinned the decision (BLACK boxes, per `attract-mame-reference.png`) in Design Deviations (a), but did NOT render black panels — the showcase still shows blue background behind the sprites. Only the TEXT section colours (the AC's testable core) are implemented.
  - Rationale: the AC's letter is satisfied by pinning the decision; panel geometry (per-creature black rectangles) is a distinct render addition on a different concern, kept out of this 3-pt story's tested scope. Filed for the visual playtest / a possible follow-up.
  - Severity: minor
  - Forward impact: the showcase will not fully match the screenshot's black cell boxes until panels are drawn (a `main.ts` render addition). Flagged as a Delivery Finding for the Reviewer/owner.

### Reviewer (audit)

- **DDT override glyph, not a re-baked STAMPS tile** → ✓ ACCEPTED by Reviewer: sound and forced by a hard invariant. Independently confirmed STAMPS is byte-pinned to the monochrome ROM decode (`tests/stamp-data.test.ts` AC-3b/AC-6, EPROMs present), and rule-checker byte-verified the override glyph faithfully re-colours the ROM tiles. The "re-baked *sprite*" is correctly realized as a separate asset.
- **Showcase black-box panels documented but not implemented** → ✓ ACCEPTED by Reviewer: AC-1 requires the background decision "pinned to the ROM/MAME source **or an explicit owner call**" — pinning the decision (black boxes) satisfies the AC's letter; rendering the panels is not required by the AC text. Tracked as a Delivery Finding for the visual playtest. Non-blocking.
- No UNDOCUMENTED deviations found — grepped the diff for stale references to the retired flat-draw model; none survive outside the two reconciled test files.

## Sm Assessment

**Board probe (clean).** No remote branch existed for ml9-3 before setup; the only live sibling session was a-3 on ml10-3 (different story, different surface). No open PRs — merge gate clear. Setup ran on `develop`.

**Premises verified before setup.** The description's two load-bearing premises were confirmed current, not stale: ml9-2 is `done` (its per-code fieldPens shipped, so the DDT box already renders blue — part 1 is only the red text), and all four cited seam files exist on disk. The colour targets are screenshot-only, so the MAME reference images under `sprint/planning/ml9-playthrough-refs/` are the pinning source the ACs point to — this is a legitimate design story, not a ROM-settled one.

**No user ruling required at setup.** Both "owner/design decision" ACs are anchored by the MAME reference screenshots for their visual targets. The two residual sub-choices — cell background (black box vs blue show-through) and DDT red-text approach (re-bake vs alternative) — are Architect/TEA calls to resolve against that reference and document per the ACs, not a blocking either/or for the user.

**Claim pushed.** ml9-3 stamped `in_progress` (`started: 2026-08-15`); the stamp + context committed to `feat/ml9-3-ddt-two-colour-and-showcase-text-colours` (`083ee23f`) and pushed. The empty branch was pushed first so the sibling branch-probe lights up immediately.

**Routing:** tdd (phased) → RED phase → TEA. TEA writes the failing tests and resolves the two documented design sub-decisions against the MAME reference.

## Tea Assessment

**RED delivered — 12 failing tests across two new files, grouped by file surface
per the epic rule. Verified directly** (`npx vitest run --project millipede`):
**12 failed | 1337 passed**, isolated to the two new files; `npm run lint`
(tsc --noEmit, repo-wide) exit 0. I did NOT route RED verification through
`testing-runner` — a direct vitest run is authoritative and the runner is known to
confabulate test names ([[testing-runner-confabulates]]); the count and file
isolation above are from the real run.

**Commit:** `1f4e89fd` on `feat/ml9-3-ddt-two-colour-and-showcase-text-colours`.

### What GREEN (Dev, Korben) must ship

- **AC1 — `src/core/attract-showcase.ts`:** add a pure export
  `showcaseSections(highScores): readonly { ink: number; placements: Placement[] }[]`
  where `ink` is the section's ROM colour BYTE and the union of every section's
  placements is EXACTLY `showcasePlacements(highScores)` (tests pin the partition).
  Creature labels → `ink = 0x1F` (red); HIGH SCORES title + score/initials rows +
  footer → `ink = 0x00` (white). Then `src/main.ts renderAttractShowcase` draws each
  section through a one-colour palette built from its ink (the `alphanumericPens`
  shape), REPLACING the single palette-less `drawGridStamps(c, showcasePlacements(...))`
  that renders the whole screen green today.
- **AC2 — re-baked DDT tiles + code-gated `fieldPens`:** give the DDT letter cells
  in tiles `$EE`/`$EF` a SECOND non-zero pixel value, and special-case
  `fieldPens()` for codes `$6E`/`$6F` so the box value → blue (poison `$F8`) and the
  letter value → red (`$1F`). Code-gate it so no other field cell recolours (the
  playfield-colour suite guards that).
- **Design decisions** (black cell boxes; DDT re-bake) are recorded above in Design
  Deviations. The black-box panels are a documented decision, not a pinned test —
  size them against `main.ts`; may split if non-trivial.

### Files touched (RED)

- `tests/attract-showcase-colour.test.ts` (NEW) — AC1: 8 tests (sections shape,
  partition == showcasePlacements, label→red, high-scores→white, footer→white,
  ink-difference, arg-threading, main.ts wiring). 1 ink-decode sanity test green.
- `tests/ddt-two-colour.test.ts` (NEW) — AC2: two-colour tile, `fieldPens` red+blue
  ($6E and $6F), rendered set == {blue,red} with blue > red > 0, plus green-on-arrival
  seam + ink-decode + box-blue regression guards.
- `tests/attract-showcase.test.ts` (EDITED) — reconciled ml9-1's `main.ts` wiring
  `it`: it pinned the palette-less flat draw that ml9-3 removes, which would make the
  two stories' wiring assertions un-satisfiable together. Kept its attract-phase
  branch floor; moved the showcase-draw binding to the ml9-3 file. Content tests
  untouched, still green.

### Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md`)

- **#26 (assertions all-local):** inks are decoded from the REAL `src/core/palette.ts`
  (`decodeColourByte`) and pinned to ROM bytes ($00/$1F/$F8), not test-local RGB
  literals — a wiring-decode change reddens too.
- **#15 / #25 (source-text token vs claim; whole-file scope):** the `main.ts` wiring
  test uses a NEGATIVE whole-file guard (the palette-less flat draw must be ABSENT —
  its presence IS the green-everywhere bug) plus the attract-phase branch, not a bare
  positive keyword grep.
- **#18 (fixture value == expectation):** the arg-threading test feeds a DISJOINT
  high-score table (ZAX/QWY) and asserts the defaults are absent, so a
  hardcode-the-defaults mutant that ignores the parameter dies.
- **#29 / swap coverage:** the DDT rendered-outcome test pins the colour SET
  (`== {blue, red}`, catching census green/white bleed) AND the magnitude relation
  (`blue > red > 0`, catching a box/letter colour swap) — not merely "some red".
- **#8 (test quality):** every test asserts a decoded value or a membership; no
  vacuous assertions. The box-blue and ink-decode guards are green-on-arrival BY
  DESIGN (regression/pinning guards) and labelled as such.
- **Purity:** `attract-showcase.ts` stays core-pure — `showcaseSections` adds only
  colour BYTES (the shell decodes), no clock/entropy/DOM; the ml1-1 scanner keeps
  covering it.

**Handoff:** phased tdd → GREEN phase → Dev (Korben Dallas).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/attract-showcase.ts` — added `showcaseSections()` (per-section ink: white $00 for HIGH SCORES + footer, red $1F for creature labels) + `SHOWCASE_HIGHSCORE_INK`/`SHOWCASE_LABEL_INK`/`ShowcaseSection`; reimplemented `showcasePlacements()` as the flattened union (ml9-1 content tests + the partition test stay green).
- `src/main.ts` — `renderShowcase` now draws each section through a one-colour palette (`showcaseInkPalette`), replacing the palette-less flat draw; the field loop substitutes the DDT override glyph for `$6E`/`$6F` cells via `drawStampGridAtPx`.
- `src/shell/ddt-glyph.ts` (NEW) — the hand-authored two-colour DDT glyph (box value 3, letters value 1, transparent corners) + `ddtGlyph(code)`.
- `src/shell/render.ts` — extracted grid primitives (`gridImage`/`rotatedGridImage`, no behaviour change) and added `drawStampGridAtPx` to render an explicit grid.
- `src/shell/playfield-palette.ts` — `fieldPens()` code-gates `$6E`/`$6F` to a red pen 1 (letters); box pen 3 stays poison blue.
- `tests/ddt-two-colour.test.ts` — re-pointed from STAMPS to the override glyph (see Design Deviation; I authored it as TEA).

**Tests:** 1353/1353 millipede pass (GREEN); `npm run lint` (tsc --noEmit, repo-wide) exit 0. Verified directly — no `testing-runner` (it confabulates test names; the direct run is authoritative).

**Branch:** `feat/ml9-3-ddt-two-colour-and-showcase-text-colours` (pushed, `af5762fe`).

**Self-review:**
- Wired to the front end — both features render through `main.ts` (showcase per-section palettes; DDT glyph substitution). ✓
- Follows project patterns — core exposes colour BYTES, shell decodes (the `SHOWCASE_BACKGROUND` precedent); `fieldPens` DDT branch mirrors its mushroom branches; the grid render seam reuses `blit`/rotation. ✓
- ACs met: AC1 text colours ✓ (background panels deferred — Delivery Finding); AC2 blue box + red letters ✓; AC3 no regression ✓ (1353 green, DDT change code-gated). Screenshot-only colours to be confirmed at the visual playtest per the ACs. ✓

**Handoff:** phased tdd → REVIEW phase → Reviewer (Zorg).

## Round 1 — Subagent Results (superseded by round 2)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1353 millipede + 498 orchestrator green, lint exit 0, no smells, tree clean, scope confirmed |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered (DDT gate boundary, ddtGlyph null-fallback, field loop) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered (no swallowed errors; encodeChar throws loudly) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered; the two vacuous wiring guards below were caught by rule-checker and confirmed |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered (false "BIND" comment = F2; "top/bottom" label = O3) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — hand-covered (readonly Glyph/Grid/ShowcaseSection; rule-checker #2 clean) |
| 7 | reviewer-security | Yes | clean | none | N/A — no untrusted-input path; all palette indices static ROM/hand-authored constants |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — hand-covered (render.ts extraction REDUCED duplication; no over-engineering) |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed 2 (both HIGH, mutation-confirmed), dismissed 0, deferred 0 |

**All received:** Yes (3 enabled returned; 6 disabled pre-filled)
**Total findings:** 2 confirmed (both HIGH), 0 dismissed, 0 deferred

## Round 1 — Reviewer Verdict: REJECTED (superseded by round 2)

**Verdict:** REJECTED

**Blocking findings (2 HIGH):**

- [HIGH] [RULE] [TEST] The main.ts showcase-wiring guard is VACUOUS at plugins/millipede/tests/attract-showcase-colour.test.ts:224 — it asserts `showcaseSections(` appears and the old flat-draw is absent, but never binds `showcaseInkPalette(s.ink)` as the palette argument reaching `drawGridStamps`. Rule-checker mutation-confirmed on the live tree: dropping the per-section palette in `main.ts renderShowcase` (which reintroduces the whole-screen-green bug ml9-3 exists to fix) leaves this file AND attract-showcase.test.ts fully green. A wiring guard that cannot detect the reintroduced bug is not doing its job (checklist #15: every guard must be mutation-tested).

- [HIGH] [RULE] [TEST] [DOC] The DDT in-game wiring guard is VACUOUS and its comment is FALSE at plugins/millipede/tests/ddt-two-colour.test.ts:141 — the comment claims "BIND the call: ddtGlyph's result must reach drawStampGridAtPx ... a mutant that computes it and discards it ... must redden," but the two assertions are independent unbound regexes (`/ddtGlyph\(/` and `/drawStampGridAtPx\(/`). Rule-checker mutation-confirmed: `if (false && glyph) drawStampGridAtPx(...)` — dead-coding the ENTIRE in-game two-colour DDT feature (AC2's headline deliverable) — leaves all 11 tests green. This is checklist #15 (unmutation-tested guard) AND #17 (a comment asserting a mechanism that is false for the code beside it).

**Why HIGH / blocking:** this is a purely-visual story whose own render.ts header warns "byte-equality decode tests pass while the screen is visibly wrong; only eyes catch it." The behavioural core tests (sections partition/colour, glyph two-colour, fieldPens red+blue, rendered set == {blue,red}) are strong and mutation-resistant (rule-checker #26/#18 clean), and they prove the pieces are CORRECT in isolation — but nothing mutation-resistant proves main.ts USES them. Both headline deliverables (AC1 white/red showcase, AC2 in-game red DDT) can be entirely disabled with the suite green. For this story that is a High-severity coverage hole, not a nitpick.

**Required rework (route to TEA, then Dev if source changes):**
- Replace the two source-text wiring greps with BEHAVIOURAL render assertions — the `tests/hud-render.test.ts` fake-`CanvasRenderingContext2D` recorder pattern: exercise the showcase render and assert a high-score glyph pixel decodes WHITE and a label pixel decodes RED (proving the per-section palette reaches the blitter); exercise a DDT field cell and assert a RED pixel is produced (proving the glyph is actually blitted). Each must redden under the exact mutants above.
- If a full render invocation is impractical, spy on `drawGridStamps`/`drawStampGridAtPx` to assert the per-section palette / glyph arguments are actually passed — a bound assertion, not two sibling greps.
- Correct or delete the false "BIND the call ... must redden" comment (F2, #17) so the permanent record does not claim a guarantee the test does not provide.
- The production code (attract-showcase.ts, ddt-glyph.ts, render.ts, playfield-palette.ts, main.ts) is CORRECT and needs no change — this rework is TEST-ONLY unless the chosen binding requires a small testability seam.

**Non-blocking observations:**
- [LOW] [DOC] plugins/millipede/src/shell/ddt-glyph.ts:63 labels the two DDT cells "top"/"bottom", but base+$20 is col+1 (horizontally adjacent, not stacked) under the field offset convention — an unverified screen-orientation characterization. Prefer orientation-agnostic "base ($6E) / base+$20 ($6F)". Cosmetic; pixel data is correct.
- [LOW] The showcase black-box cell panels are not rendered (Delivery Finding Gap). AC-1 is satisfied by pinning the decision "or an explicit owner call"; the panel render is deferred to the visual playtest. Non-blocking.
- [VERIFIED] The DDT override glyph faithfully re-colours the ROM tiles — evidence: ddt-glyph.ts DDT_GLYPH_TOP/BOTTOM match STAMPS[charTile($6E/$6F)] byte-for-byte with interior letter-holes → value 1 and exterior corners → 0 (rule-checker ran a live decode; I re-derived the same). No project rule violated (values ∈ {0,1,3}, readonly typed).
- [VERIFIED] fieldPens DDT branch is code-gated — evidence: playfield-palette.ts:117 `v === DDT_STAMP || v === DDT_STAMP + 1` only; box pen 3 stays poison-blue, cloud stamps ($2E–$6D) untouched. Complies with the no-collateral intent (co-shipped regression test at ddt-two-colour.test.ts confirms fieldPens(0x01) keeps its base pen 1).
- [VERIFIED] render.ts grid extraction is behaviour-preserving — evidence: gridImage/rotatedGridImage are byte-identical loops to the prior stampImage/rotatedStampImage; the old functions delegate. No regression (1353 green incl. hud-render/playfield tests).
- [VERIFIED] Core purity held — evidence: showcaseSections exposes colour BYTES ($00/$1F literals), decoding stays in the shell; no clock/entropy/DOM added; purity suite green.
- [SEC] Clean — no untrusted-input path; every palette index is a static ROM-derived or hand-authored constant (reviewer-security).
- [PRE] Green — 1353 millipede + 498 orchestrator tests pass, lint exit 0, tree clean (reviewer-preflight).

**Rule Compliance:** rule-checker enumerated all 30 lang-review checks across 71 instances; 2 violations (both #15, one also #17), the F1/F2 above. All other checks compliant, including #24 (retirement — ml9-1 wiring bind correctly retired, showcasePlacements kept as a live helper, no stale survivors), #26 (assertions pin real decoded values from src, not test-local arithmetic), and #2/#5 (readonly types, type-only imports marked).

**Devil's Advocate:** Suppose a future refactor "cleans up" main.ts and drops the per-section palette or the DDT glyph branch — say a well-meaning simplification that draws all showcase sections in one pass, or an early-return that skips the DDT substitution. Nothing in this suite would redden: the rule-checker proved exactly that by dead-coding each path. So the shipped guards give FALSE confidence — worse than no guard, because a reviewer sees "wiring test present, green" and trusts it. A confused maintainer reading ddt-two-colour.test.ts's comment would be actively misled: it PROMISES the mutant reddens. On the colours themselves: white $00 decodes to {255,222,255} (a green-deficient near-white, the wiring's whitest) — correct and ROM-faithful, but the owner should confirm at the playtest it reads as "white" against the blue field. The DDT letters ship RED per the AC's explicit wording though the in-game MAME text reads dark/ambiguous — flagged as a Delivery Finding for owner veto. And the black-box panels are absent, so the showcase will not fully match the screenshot until they are drawn. None of these last three are blocking; the two vacuous wiring guards are. The pieces are provably correct; the proof that they are WIRED is missing, and on a visual story that is the proof that matters most.

**Data flow traced:** DEFAULT_HIGH_SCORES / field stamps → showcaseSections/ddtGlyph (pure) → per-section palette / override glyph → drawGridStamps/drawStampGridAtPx → canvas. The pure hops are proven; the final hop (main.ts wiring) is where the guards fail to bite.

**Pattern observed:** unbound source-text wiring greps standing in for behavioural render assertions at attract-showcase-colour.test.ts:224 and ddt-two-colour.test.ts:141.
## Tea Rework (round 1)

**Addressed both HIGH reviewer findings — TEST-ONLY, production code unchanged.**

The two main.ts wiring guards were unbound source-text greps. Rebound them:
- `attract-showcase-colour.test.ts` — now asserts `showcaseInkPalette(<section>.ink)` is the drawGridStamps palette ARGUMENT (bound to `<section>.placements`). Reddens under the whole-screen-green mutant `drawGridStamps(c, s.placements)`.
- `ddt-two-colour.test.ts` — now asserts `if (glyph) drawStampGridAtPx(c, glyph, …)` (guard + call + glyph-as-arg bound). Reddens under the dead-code mutant `if (false && glyph)`. Fixed the false "BIND the call … must redden" comment (reviewer F2/#17).

**Mutation-verified by me this round** (not reasoned): applied each mutant to the committed main.ts, ran the specific test → confirmed RED, `git checkout` restored. Baseline green: showcase 9/9, ddt 11/11. Full suite 1353/1353, lint exit 0. Commit `26e92f99`.

Dev's green is a verify-only pass-through (no source change). **Handoff:** red → green → Dev.
## Dev Assessment (rework round 1)

**Implementation Complete:** Yes — VERIFY-ONLY pass, no source change.

The reviewer's two HIGH findings were TEST-QUALITY (vacuous main.ts wiring guards); TEA rebound them (commit `26e92f99`) and mutation-verified them. The production code (attract-showcase.ts, ddt-glyph.ts, render.ts, playfield-palette.ts, main.ts) was correct in round 1 and is unchanged — nothing to implement.

**Tests:** 1353/1353 millipede pass (GREEN); `npm run lint` exit 0. No uncommitted source (only sprint/epic-ml9.yaml tracking).

**Handoff:** phased tdd → REVIEW phase → Reviewer (Zorg) for re-review of the bound guards.
## Subagent Results

Round-2 re-review (test-only diff `af5762fe...HEAD`, 2 files). Enabled subagents re-run scoped to the round-1 findings; disabled ones hand-covered.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1353 millipede green, lint exit 0, tree clean, 2 test files since round 1 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled — hand-covered; round-2 is test-only, no new paths |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled — N/A for a test-only diff |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled — the guards ARE the subject; rule-checker mutation-confirmed closure |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled — hand-covered; new "mutation-guarded" comments verified TRUE |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled — no type/signature change |
| 7 | reviewer-security | Yes | clean | none | N/A — test-only, no runtime/untrusted-input change |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled — no source change |
| 9 | reviewer-rule-checker | Yes | clean | 0 open | F1 + F2 both CLOSED via independent mutation; no fresh #15/#17 |

**All received:** Yes (3 enabled returned; 6 disabled pre-filled)
**Total findings:** 0 open — the 2 round-1 HIGH findings are both CLOSED and blessed below; 0 new, 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

**Round-1 findings — both CLOSED (blessed explicitly):**

- [RULE] [VERIFIED] F1 (showcase palette wiring) is CLOSED. The guard at attract-showcase-colour.test.ts now BINDS `showcaseInkPalette(section.ink)` as the `drawGridStamps` palette argument. Independently mutation-confirmed by rule-checker: dropping the palette in main.ts (`drawGridStamps(c, s.placements)` — the whole-screen-green bug) reddens the guard (1 failed / 8 passed), and it passes clean on the correct tree. Round-1's bare `showcaseSections(` grep is gone.
- [RULE] [DOC] [VERIFIED] F2 (in-game DDT wiring) is CLOSED. The guard at ddt-two-colour.test.ts now binds `glyph = ddtGlyph(` AND `if (glyph) drawStampGridAtPx(c, glyph, …)`. Independently mutation-confirmed: dead-coding the path (`if (false && glyph)`) reddens the guard (1 failed / 10 passed), passes clean on the correct tree. The round-1 FALSE "BIND the call … must redden" comment (#17) is replaced with claims that were independently re-run and confirmed TRUE — not a fresh lie.

**Why APPROVED:** both blocking HIGH findings are closed with independent mutation evidence, correct-code sanity green, and truthful comments. No Critical/High remain. All enabled subagents clean/green; disabled domains hand-covered.

[PRE] Preflight green — 1353 millipede pass, lint exit 0, tree clean, round-2 diff is test-only.
[SEC] Security clean — no runtime/untrusted-input change (test-only).
[RULE] Rule-checker — 0 open; F1/F2 closed; no new #15/#17 introduced; the new bound regexes are `\s*`/`\w+` tolerant and match real main.ts.

**Deviation audit (unchanged from round 1, still stand):** both Dev deviations remain ✓ ACCEPTED — the DDT override glyph (forced by the STAMPS byte-equality invariant) and the black-box-panel deferral (AC-1 satisfied by "pinned … or an explicit owner call"). No new deviations in the round-2 test-only diff.

**Non-blocking items carried to the owner / visual playtest (NOT blockers):**
- [LOW] The showcase black-box cell panels are not rendered (Delivery Finding). AC-1 satisfied by pinning the decision; the panel render is deferred. Visual playtest confirms.
- [LOW] DDT letters ship RED per the AC's explicit wording, though MAME's in-game text reads dark/ambiguous — owner may veto at the playtest.
- [LOW] [DOC] ddt-glyph.ts labels the two DDT cells "top"/"bottom"; base+$20 is col+1 (horizontally adjacent) under the field offset convention — cosmetic, pixel data correct. Could be tidied to "base / base+$20".

**Data flow traced:** DEFAULT_HIGH_SCORES / field stamps → showcaseSections/ddtGlyph (pure) → per-section palette / override glyph → drawGridStamps/drawStampGridAtPx → canvas. Every hop, including the main.ts wiring hop, is now guarded by a mutation-resistant test.

**Pattern observed:** bound source-text wiring guards (multi-token, argument-binding) replacing round-1's unbound sibling greps — attract-showcase-colour.test.ts and ddt-two-colour.test.ts.

**Devil's Advocate (round 2):** Could the rework be a fresh lie, as round 1's F2 comment was? That was the exact risk, so I did not trust the "mutation-guarded" label — the rule-checker re-ran both mutants against the live tree and both reddened, with correct-code sanity green. Could the bound greps still be fooled? They are source greps: brittle to reformatting a call onto multiple lines or routing the palette/glyph through an intermediate variable, which would false-NEGATIVE (redden correct code) — an annoyance, not a false approval. main.ts is not behaviourally invokable (module-level canvas + auto-boot), and the sibling wiring test hud-render.test.ts uses the same comment-stripped-source approach, so a bound grep is the sanctioned tool here; a future testability seam could make it a true render assertion, but that is not this story's scope. The production feature itself was verified correct in round 1 (glyph byte-exact, fieldPens gated, purity intact) and is unchanged. Nothing blocks.