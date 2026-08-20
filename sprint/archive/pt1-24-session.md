---
story_id: "pt1-24"
jira_key: "pt1-24"
epic: "pt1"
workflow: "tdd"
---
# Story pt1-24: Defender scanner blips every bank + humanoids; MTERR contour drawn

## Story Details
- **ID:** pt1-24
- **Jira Key:** pt1-24
- **Workflow:** tdd
- **Repos:** arcade
- **Branch:** fix/pt1-24-scanner-all-banks-and-mterr
- **PR:** (none yet - recorded when the PR is created)
- **Stack Parent:** none

## Background

**Defect 1:** `drawScanner` (plugins/defender/src/core/scene.ts) builds its blip
list from `state.landers` only. The ROM's SCNR blip loop (SCNR10/SCNR3,
AMODE1.SRC:1259-1274) walks the whole live-object chain and reads each record's
own OBJCOL (:1270) — mutants, baiters, bombers, pods, swarmers, bombs and the
humanoids all blip, at their absolute OX16 (:1260, no visible-window cull).

**Defect 2:** The MTERR mini-terrain (transcribed, terrain-data.ts, BLK71.SRC:529)
is drawn nowhere (scanner.ts header marks it deferred).

**ROM MTERR draw (MT1/MTLP, AMODE1.SRC:1197-1224), read for this RED:**
MTERR is 128 triples `[row, pat0, pat1]` — 64 world columns DOUBLED (bytes
0-191 == 192-383, verified) so a 64-triple read from any start never wraps.
The camera picks the start: `U = MTERR + 3*(XTEMP>>10)` (:1200-1205), the same
>>10 compression the blips use. Per strip column, `pat0` is written at screen
row `row` and `pat1` at `row+1` (column-major VRAM, :1213-1215), 64 columns
(:1216-1224). Pattern bytes are only $70/$07/$77/$00 — every painted nibble is
palette index 7, and pat0 is never $00, so each column's topmost contour row is
exactly its row byte.

## TEA Assessment

**Tests Required:** Yes
**Reason:** Behavioral bug (radar blind to six banks + humanoids) plus a fidelity gap (MTERR undrawn); no existing coverage.

**Test Files:**
- `plugins/defender/tests/pt1-24-scanner-banks.test.ts` — 34 tests (30 RED, 4 green guards)

**Tests Written:** 34 tests covering all 4 ACs (bank blips w/ own colour + projected column; lander regression; dead/no-blip; MTERR contour presence, shape, camera rotation)
**Status:** RED (failing - ready for Dev) — commit 3daa0b42; `npm run lint` clean

**Handoff:** To Dev for implementation

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/defender/src/core/scene.ts` - drawScanner extended to all eight populations (landers, humanoids, mutants, baiters, bombers, pods, swarmers, bombs) via an `addBank` helper — each bank's blips coloured by its own sprite's first palette nibble (the existing spriteColour seam), dead members filtered (`alive === false`; bombs carry `lifetime` and always blip), no window cull. New `drawScannerTerrain` walks the ROM MT1/MTLP MTERR draw (AMODE1.SRC:1197-1224): 64 triples from `MTERR + 3*(wrap16(camera − SCANNER_LEFT_OFFSET) >> SCANNER_X_SHIFT)`, pat0 at the row byte / pat1 one row down, colour read from the pattern byte's own nibble (index 7), anchored at SCANNER_ORIGIN_Y, drawn unconditionally between bezel and blips.
- `plugins/defender/src/core/scanner.ts` - stale "MTERR … not yet drawn / deferred" header note updated to point at drawScannerTerrain.
- `plugins/defender/tests/pt1-18-visible-window.test.ts` - main-view diff re-baselined: diffCols now starts at MAIN_VIEW_TOP (60), below the scanner band (see Design Deviations).
- `plugins/defender/tests/pt1-23-enemy-banks-drawn.test.ts` - same re-baseline for diffCols + diffIndices.

**Tests:** 1182/1182 passing (GREEN) — the 34 pt1-24 tests plus the prior 1148-test defender baseline. `npm run lint` (tsc --noEmit) clean.
**Branch:** fix/pt1-24-scanner-all-banks-and-mterr (pushed, commit dcdcf43b on top of TEA's 3daa0b42)

**Handoff:** To review phase

## Design Deviations

### Dev (implementation)
- **pt1-18/pt1-23 main-view diffs re-baselined to exclude the scanner band:** Those two files' diff helpers scanned ALL frame rows; when written that was equivalent to the main view because humanoids and the six banks never blipped. This fix makes off-window members legitimately blip (the very ROM property pt1-18's own header endorses — SCNR reads absolute OX16, AMODE1.SRC:1260), so full-frame diffs read a correct radar blip as a cull/footprint failure (22 tests). Fixed per each file's documented intent ("culled from the MAIN VIEW", "blitted into the MAIN VIEW"): diffs now start at MAIN_VIEW_TOP=60, below the scanner band (blips ≤ row 31, contour ≤ 34 after the review fix), with comments explaining why. No assertion was weakened — the same presence/absence/identity/footprint checks run over the region they always meant to measure.
- **Contour anchored at SCANNER_ORIGIN_Y + row byte − 7 (SCANH−1), drawn after the bezel:** Review fix — the first cut used `SCANNER_ORIGIN_Y + row`, claiming it "matches the blip convention", but that was mathematically wrong: MTLP's row byte is an ABSOLUTE screen y (`STD ,Y`, AMODE1.SRC:1214-1215, nothing adds SCANER's row) while a blip's address adds `#SCANER-1` (AMODE1.SRC:1268; SCANH = YMIN−34 = 8, PHR6.SRC:158-159), so the blip origin folds a +7 into SCANNER_ORIGIN_Y that the contour must also apply. The contour now subtracts SCANNER_TERRAIN_ROW_BIAS = 7, putting it at fb rows 23..34, flush with the bezel bottom exactly as the ROM's contour-39 vs bezel-38/39 — not hanging 7 rows below the frame. Drawn AFTER drawScannerBezel so the end-column contour pixels survive; the df7-5 rail check counts non-background runs, so an index-7 pixel on a rail row does not redden it (verified by the green suite).
- **Contour colour read from the data, not a constant:** the pixel index is the pattern byte's own non-zero nibble (`(pat >> 4) || (pat & 0x0f)` — every MTERR nibble is 7), keeping the no-invented-colour discipline instead of hard-coding 7.

### TEA (test design)
- **Off-main-window members BLIP (setup note inverted):** Story setup notes said "Dead / off-camera instances produce NO blip". The ROM projects the ABSOLUTE OX16 (AMODE1.SRC:1260) with no window cull — showing off-screen attackers is the radar's purpose, and scanner.ts's own header says so. Tests assert an off-main-window member STILL blips; only DEAD members produce no blip.
- **Bombs included:** Story prose lists five banks + humanoids, but the fix line says "project every live bank" and SCNR blips every OBJ-chain record; bombs (BMBP1) are OBJ records (drawn, collidable). Enemy SHOTS excluded — the ROM shot system is not OBJ-chain records.
- **MTERR row anchor left free:** The strip geometry is our re-derived centred one (df5-7 precedent), so tests pin the ROM-determined parts only — full 64-column coverage, index 7, the per-column row profile RELATIVE to column 0, and its camera rotation (start = scannerLeft>>10) — not the absolute band row.
