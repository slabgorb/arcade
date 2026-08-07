---
story_id: jt10-1
jira_key: jt10-1
epic: jt10
workflow: tdd
---
# Story jt10-1: Font port: transcribe FONT35 (3x5) + FONT57 (5x7) from MESSAGE.SRC into pure core data, add a shell raster text renderer

## Story Details
- **ID:** jt10-1
- **Jira Key:** jt10-1
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** arcade
- **Branch Strategy:** gitflow (feat/jt10-1-font-port-font35-font57)
- **Branch:** feat/jt10-1-font-port-font35-font57
- **PR:** https://github.com/slabgorb/arcade/pull/65

## Background

Joust ships two raster fonts from the ROM (MESSAGE.SRC), both essential to the cabinet lifecycle screens being added in epic jt10:

- **FONT35** (3×5): The tight font used for scores, BCD displays, and CREDITS row (MESSAGE.SRC line 295, table S0…)
- **FONT57** (5×7): The stylized wide font used for all banner and title text (MESSAGE.SRC line 241, table L0…)

Both fonts are currently untranscribed. The cabinet lifecycle screens (title, attract, 1P/2P select, game over, high-score entry) cannot render without them. This story ports both fonts as pure core data modules and provides a shell raster text renderer to lay out strings in either font via the existing atlas/blit path.

Constraint: Both font modules must pass the jt1-7 purity scanner (no clock, ambient entropy, browser surface, or shell imports — and avoid the literal strings "window." and "document." in source comments, as the scanner reads comment text).

## Acceptance Criteria

**Derived from design spec:** [docs/superpowers/specs/2026-08-07-joust-cabinet-lifecycle-design.md](../../docs/superpowers/specs/2026-08-07-joust-cabinet-lifecycle-design.md)

1. **FONT35 core data module** (`plugins/joust/src/core/font35.ts`): Transcribed glyphs (3×5 bitmap) from MESSAGE.SRC table S0… (line 295), each glyph cited by its MESSAGE.SRC row under the joust citation guard.

2. **FONT57 core data module** (`plugins/joust/src/core/font57.ts`): Transcribed glyphs (5×7 bitmap) from MESSAGE.SRC table L0… (line 241), each glyph cited by its MESSAGE.SRC row under the joust citation guard.

3. **Purity compliance:** Both `font35.ts` and `font57.ts` pass the jt1-7 boundary scanner — no references to clock, `window`, `document`, or shell imports. Comment text must not contain the literal strings "window." or "document.".

4. **Vitest glyph fixtures:** Core suite includes glyph-bitmap fixtures pinning each transcribed glyph against MESSAGE.SRC (e.g., test that glyph 'A' has the exact bitmap pattern from the ROM).

5. **Shell raster text renderer** (`plugins/joust/src/shell/fontRender.ts` or equivalent): Function that accepts (font: 'FONT35' | 'FONT57', text: string, colour: RGBA) and returns glyph-layout instructions consumable by the existing `blit`/`blitOp` atlas path (see `plugins/joust/src/main.ts` and `plugins/joust/src/shell/render.ts`).

6. **No new shell files or functions are added to the arcade's shared font library** (`@shared/font`). This is joust's own raster font, separate from the shared vector font used by other games.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-07T15:59:26Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-07T15:03:26Z | 2026-08-07T15:08:12Z | 4m 46s |
| red | 2026-08-07T15:08:12Z | 2026-08-07T15:38:01Z | 29m 49s |
| green | 2026-08-07T15:38:01Z | 2026-08-07T15:50:26Z | 12m 25s |
| review | 2026-08-07T15:50:26Z | 2026-08-07T15:59:26Z | 9m |
| finish | 2026-08-07T15:59:26Z | - | - |

## Delivery Findings

No upstream findings at setup.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (RED quarry, 2026-08-07) — the MESSAGE.SRC glyph format is decoded and tractable

The glyph tables and their encoding are established, so the RED phase can resume without re-quarrying:

- **FDB pointer tables** map character code → glyph label, in code order: `FONT57` at MESSAGE.SRC:241, `FONT35` at MESSAGE.SRC:295. Order is `0-9`, `SPC`, `A-Z`, then punctuation (`BARW EQU DSH QUE EXC BRKL BRKR SQOT CMMA PER SLSH AMP DQOT COLON CUR CNARW` for 5×7; the 3×5 tail differs slightly). NOTE two apparent ROM quirks in the FONT35 FDB list to verify, not transcribe blindly: the 'O' slot re-points to `S0` and the 'T' slot re-points to `S5` (dedupe/reuse), so the code→label map is not 1:1 with the data labels.
- **Glyph data format:** each label is `FCB XSIZE,YSIZE` (byte-width, row-count) followed by `YSIZE` rows of `XSIZE` bytes. **Each byte packs two horizontal pixels as its hex nibbles** (high nibble = left pixel, low = right), values 0/1. So decoded pixel width = XSIZE×2.
- **5×7 glyphs** (`L*`): `FCB $03,$07` → 6×7 nibble grid. `L0` @ :347 decodes to the slashed zero (verified by hand). `L1` @ :356, `LSPC` @ :444, `LA` @ :453.
- **3×5 glyphs** (`S*`): `FCB $02,$05` → 4×5 nibble grid. `S0` @ :839 ("0 & O").

RED test plan (representative, not exhaustive — pin exact bitmaps + structure):
1. font57.ts + font35.ts export glyph tables; a few glyphs ('0','1','A',space) pinned to their EXACT decoded ROM bitmaps, each fixture citing its MESSAGE.SRC line.
2. XSIZE/YSIZE header + nibble-unpacking correctness.
3. FDB code→glyph order (incl. the O→S0 / T→S5 reuse quirk).
4. Purity: both modules pass the jt1-7 scanner; no `window.`/`document.` even in comments.
5. Shell raster text renderer: layout output over the atlas/blit path; no `@shared/font` import.

### TEA (test design)
- **Conflict** (non-blocking): the setup RED-quarry note's FONT35 reuse mapping
  ("'T' slot re-points to `S5`") is contradicted by `MESSAGE.SRC`. The 'S' slot
  (fdb index 29, :324) re-points to `S5`; the 'T' slot (:325) has its own `ST`.
  Tests encode the measured mapping (O→S0, S→S5, T distinct). *Found by TEA
  during test design.* See Design Deviations > TEA.

## Design Deviations

No deviations recorded at setup.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **FONT35 FDB reuse mapping corrected:** Setup note said the reuse slots are
  the 'O' slot (→ `S0`) and the **'T' slot** (→ `S5`). Measured against
  `MESSAGE.SRC:295` (verified by index): the reuse slots are the **'O' slot**
  (fdb index 25, :320 → `S0`, commented "0 & O") and the **'S' slot** (fdb index
  29, :324 → `S5`, commented "5 & S"). The **'T' slot** (index 30, :325) points
  to its OWN `ST` glyph. Tests pin O→S0 and S→S5, and assert 'T' is a DISTINCT
  glyph (not the S5 alias). Reason: the 'T'→S5 reading is a transcription of the
  setup note that the source contradicts (S5's own comment names it "5 & S").

## Sm Assessment

**Setup (2026-08-07).** jt10-1 is the font-port story — the hard prerequisite for the
whole jt10 cabinet-lifecycle epic (it blocks jt10-2 … jt10-7). Workflow `tdd` (phased);
branch `feat/jt10-1-font-port-font35-font57` cut from `develop` (gitflow). The phase
pointer read `setup` on arrival.

**ACs derived from the design spec, not the YAML stub.** The epic-YAML body is a
deliberately thin title-only stub, so the six acceptance criteria above were derived from
`docs/superpowers/specs/2026-08-07-joust-cabinet-lifecycle-design.md` ("The fonts" +
"Testing strategy") and grounded in `reference/williams-source/joust/MESSAGE.SRC`:
FONT35 (3×5, table `S0…`, MESSAGE.SRC:295) and FONT57 (5×7, table `L0…`, MESSAGE.SRC:241),
two pure core data modules plus a shell raster text renderer over the existing atlas/blit
path. This is joust's own raster font, not `@shared/font`.

**Context stub corrected.** `pf context create` regenerated
`sprint/context/context-story-jt10-1.md` as a generic stub whose "no ACs — TEA to define"
text contradicted the session's six derived ACs. Replaced it with a hand-authored context
that points at the authoritative sources (the session ACs + the design spec) rather than
duplicating the ACs (drift risk). The session file remains the authoritative AC carrier.

**Sibling probes clean.** `git branch -r | grep jt10` before setup showed only the two
already-merged jt10 design/materialization branches — no `feat/jt10-1` owner. No live
`.session/` files in any checkout. Merge gate clear (no blocking non-draft PRs). Claim
pushed: `feat/jt10-1-font-port-font35-font57` is up on origin and status is stamped
`in_progress`.

**Test angle for TEA (Tyr One-Handed).** The high-value pins are glyph-bitmap fixtures
transcribing individual glyphs from the FONT35/FONT57 tables and asserting exact bit
patterns against MESSAGE.SRC, each under the joust citation guard. Two traps to watch:
(1) the glyph tables likely CONTINUE past their labelled first row — measure each table's
extent from BOTH sides (the label and the next label/section), don't stop at the cited
row; (2) the jt1-7 purity scanner reads comment text, so a transcription comment ending in
`window.`/`document.` trips it — keep those literals out of comments entirely.

**Next:** TEA, RED phase.

## TEA Assessment

**Tests Required:** Yes
**Reason:** New pure-core data modules + a shell renderer — glyph bitmaps must be
pinned to MESSAGE.SRC and the boundary/citation gates asserted.

**Test Files (all RED — target modules do not exist yet):**
- `tests/helpers/font-contract.ts` — TEA contract: `Glyph`/`Font`/renderer
  interfaces, module loaders, and the INDEPENDENT `decodeGlyphFromSource` reader
  (the jt1-3 double-entry; reads MESSAGE.SRC by header line, decodes packed
  nibbles).
- `tests/font57.test.ts` — FONT57 (5x7). Exact bitmaps for '0' (slashed zero),
  '1', space, 'A'; 6x7 cell; FDB order (0/9/space/A/Z); '0'≠'O'; source
  re-derivation; citation coverage. (AC-2, AC-4)
- `tests/font35.test.ts` — FONT35 (3x5). Exact bitmaps for 0/1/4/5/space/A; the
  O→S0 and S→S5 reuse quirk (+ 'T' distinct); FDB order; nibble-unpacking table
  ($01→[0,1], $10→[1,0], $11→[1,1], $00→[0,0] via real glyph rows); source
  re-derivation; citation coverage. (AC-1, AC-3, AC-4)
- `tests/font-purity.test.ts` — font35.ts/font57.ts pass the jt1-7 scanner; no
  `window.`/`document.`; no shell/@shared/font import. (AC-5)
- `tests/font-render.test.ts` — `layoutText(font,text,colour)`: cell-width
  advance, glyph selection, space handling, colour threading, paintable op shape,
  reuses core font data, no `@shared/font`. (AC-6)

**Tests Written:** 49 tests across 5 files, covering all 6 ACs.
**Status:** RED — 49 fail (modules absent + citation coverage), 3030 pre-existing
joust tests still pass; `npm run lint` clean.

**Verified:** every hand-decoded bitmap already matches `decodeGlyphFromSource`
reading the real MESSAGE.SRC (the source-re-derivation tests fail only at module
load, never on a bitmap-drift assertion) — so Dev's transcription is checked
against source, not the test's own literals.

**Note for Dev — citations:** `subsystems.json` SUB-036/037 already cite
MESSAGE.SRC:347 (L0) and :839 (S0) with the exact verbatim. Extend that pattern
with per-glyph claims for the other pinned header lines (font57: 356, 444, 453;
font35: 846, 867, 874, 909, 916) so `check-citations.mjs` byte-verifies each.

**Handoff:** To Dev for implementation (GREEN).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (3081 green, tsc clean, check-citations 988 verified, tree clean) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | No | Skipped | disabled | Disabled via settings |

**All received: Yes** — 1 of 1 enabled subagents (`reviewer-preflight`) returned; the other 8 are disabled in `workflow.reviewer_subagents`. Their domains (transcription fidelity, purity, test quality, types) were covered directly by the Reviewer (Heimdall, opus), who independently re-decoded all ~102 glyphs from MESSAGE.SRC and re-ran the full suite + lint + citation gate.
**Total findings:** 3 (all non-blocking) — 1 Medium (test-coverage gap, filed as jt10-8), 1 Low (renderer paints via the paintDissolve idiom, not blitOp — guidance for the jt10 painter stories), 1 Nit (type duplication across font modules).

## Reviewer Assessment

**Verdict: APPROVED** (Heimdall, peloton, opus).

**What was verified, not trusted:**
- `npx vitest run --project joust` → 153 files / 3081 tests pass, 0 failures (the "3 citation errors" text is the deliberate `jt1-9-empty` negative test).
- `npm run lint` (tsc --noEmit) → clean. `node plugins/joust/tools/audit/check-citations.mjs` → 988 claims, all verified.
- **Independent full re-decode** of all ~102 glyphs in both fonts straight from MESSAGE.SRC at each glyph's cited `srcLine` → **0 drift**, incl. every unpinned letter/punctuation and the wide glyphs.
- **Independent FDB pointer-chain check** (both tables, 53 + 49 slots) → 0 mismatches.
- Confirmed the reuse quirk `O→S0` / `S→S5` / `T`-distinct matches source (TEA's correction was right; the setup note's `T→S5` was the misread). Confirmed `SARRW→'ARRW'` keying prevents the space glyph being overwritten by a cursor-cross. Confirmed purity (no `window.`/`document.`, no shell/`@shared/font` import) and the renderer op shape.

**Findings (all NON-BLOCKING):**
- **[Medium] Coverage gap** — the source double-entry + citation gates guard only 10 of ~102 glyphs; a future mutated nibble in an unpinned glyph would ship green (data is correct today, verified). **Filed as jt10-8** (extend the source gate to loop all `font.order`).
- **[Low] Renderer paint path** — `layoutText` ops carry pixel grids, paintable via the `paintDissolve` `fillRect`-per-pixel idiom (render.ts:197), NOT `blitOp` (which needs an atlas sprite name). Painting is deferred to a later jt10 story; guidance recorded for the painter story.
- **[Nit] Type duplication** — `Pixel`/`Glyph`/`Font` duplicated across font35.ts/font57.ts. Optional hoist to `core/fontTypes.ts`; self-contained data modules are also defensible.

**Decision:** Clean to finish. No Critical/High. Transcription independently verified byte-perfect; all gates green.