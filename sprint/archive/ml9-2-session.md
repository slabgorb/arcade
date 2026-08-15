---
story_id: "ml9-2"
jira_key: ""
epic: "ml9"
workflow: "tdd"
---
# Story ml9-2: In-game graphics wrong colour + missing sprites vs MAME

## Story Details
- **ID:** ml9-2
- **Jira Key:** (no Jira integration)
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/ml9-2-ingame-graphics-colour-sprites
- **PR:** https://github.com/slabgorb/arcade/pull/427 (merged into develop as 3609c1c4)

## Overview

**Defects:** 
- (a) Mushrooms render with wrong palette/shape — MAME shows pink-cap/teal-stem umbrellas, ours look like red/white/green radishes
- (b) DDT bomb graphic missing — MAME shows blue rounded 'DDT'-labelled boxes, ours shows none
- (c) Green playfield/grass floor band along bottom absent in ours
- (d) Overall colouring off — millipede's alphanumeric glyph ink maps to green via drawGridStamps' default flatPalette

**Scope includes (from ml9-1 review):** Attract enemy-showcase screen text colours — MAME shows WHITE high scores + RED creature labels; ours renders all green (same palette root cause). Recolour needs per-section palettes and a decision on cell backgrounds (black boxes vs blue show-through).

**Reference Images:** sprint/planning/ml9-playthrough-refs/
  - ingame-mame-reference.png (MAME ground truth)
  - ingame-ours-current.png (our current render)
  - attract-mame-reference.png (attract showcase reference)

**Candidate Seams:**
- plugins/millipede/src/shell/render.ts
- shell/gfx-rom.ts
- shell/playfield-palette.ts
- shell/core/palette.ts
- core/attract-showcase.ts (showcase text colours)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-15T21:20:37Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-15T17:03:55Z | 2026-08-15T17:05:20Z | 1m 25s |
| red | 2026-08-15T17:05:20Z | 2026-08-15T18:06:53Z | 1h 1m |
| green | 2026-08-15T18:06:53Z | 2026-08-15T19:39:05Z | 1h 32m |
| review | 2026-08-15T19:39:05Z | 2026-08-15T21:20:37Z | 1h 41m |
| finish | 2026-08-15T21:20:37Z | - | - |

## Sm Assessment

Story ml9-2 set up on branch `feat/ml9-2-ingame-graphics-colour-sprites` (cut from develop). Verified free: no remote branch, no open PRs, merge gate clear. TDD/phased workflow, 5pt, repo `arcade` (Millipede plugin).

This is a visual-fidelity bug-fix grouping four in-game rendering defects plus a showcase-text spillover from ml9-1's review, unified by a palette/colour root cause. Ground-truth reference images are committed at `sprint/planning/ml9-playthrough-refs/`. Candidate seams span shell render/palette and core/palette — per the epic rule, group fixes by file surface; **TEA/Architect may split if a sub-defect (e.g. the DDT sprite, which may be missing ROM/sprite data rather than mis-palette) lives in a different file surface than the others.**

Handoff note for TEA: these are pixel/colour defects. Prefer deterministic assertions against the core palette/gfx-rom seams (index → RGBA mappings, sprite presence) over image-diffing where possible; the reference PNGs are the human oracle, not the automated gate. Watch the millipede count-guard and README file-count guards when adding test files (see epic memories).

Routing to TEA for the RED phase.

## Tea Assessment

RED phase complete. New failing suite: `plugins/millipede/tests/ingame-colour.test.ts` (12 feature tests RED for feature-absent; 3 pure `decodeColourByte` sanity guards green). Baseline was green (1274); now 1277 pass + 12 fail, no collateral. Committed as `e978d2ed`.

**Ground-truth research (subagent, ROM + both MAME screenshots).** The unifying root cause of the colour defects: the port colours EVERY playfield char through ONE pixel-value→pen table (`playfieldPens`), while the hardware selects the ANCOL colour window PER CHAR CODE (CLRCH, MLIRQ.MAC:242). I scoped this story to the three ROM-cited defects that share the **in-game render + palette file surface** (the epic's group-by-file rule):

- **(d) HUD/score text** → ROM red `$1F` (ALPHANUMERIC_COLOUR, MLIRQ.MAC:294). Today `main.ts:151` draws the HUD with no palette → census `flatPalette` → glyph ink (pixel value 2) = `$E7` green. Seam: `shell/playfield-palette.ts` `alphanumericPens()` + `main.ts` wiring.
- **(c) grass band** → ROM `$D6` = dark green rgb(33,71,33), bottom `PLAYER_AREA_ROWS=$07` rows (MILLI.MAC:1210-1211 / :990; conway.ts:58). Today `main.ts:124` fills black. Seam: `core/playfield-colour.ts` `PLAYER_AREA_COLOUR` + `shell/render.ts` `drawPlayerAreaBand` + `main.ts` wiring.
- **(a) mushroom caps** → normal cap salmon `$0B` (ANCOL+5), poison cap blue `$F8` (ANCOL+7), MLIRQ.MAC:265-274. Both normal ($7C-$7F) and poison ($78-$7B) stamps use pixel value 3 for the cap, so the single `playfieldPens` paints normal caps BLUE. Fix needs per-char-code pen selection. Seam: `shell/playfield-palette.ts` `fieldPens(code)` + `main.ts` field-render wiring.

**Test discipline.** Colour assertions read the pixels actually painted (the tagged `putImageData`/`fillRect` recorders from hud-render.test / playfield-palette.test), not the pen arrays in isolation. Each defect has: a unit assertion on the new seam, an applied-render assertion via `drawGridStamps`/`drawPlayerAreaBand`, and a comment-stripped `main.ts` wiring guard (main.ts is not unit-testable; a green seam that isn't wired leaves the screen wrong — the cabinet-fidelity trap). The **VISUAL playtest at /millipede/ stays mandatory** — byte-decode tests pass while the screen is visibly wrong; only eyes prove the picture (playbook §4).

### Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md`)
- **Meaningful assertions (§Testing):** every test asserts a decoded RGB or a set-membership on painted pixels; no `let _ =`, no `assert(true)`, no `is_none()`-on-always-None. The 3 green sanity tests pin colour-byte premises (`$1F`=red, `$D6`=green, `$E7`=green), not the feature.
- **`as unknown as T` (§Type Safety):** the two fake-context casts reuse the sanctioned in-repo mock pattern (hud-render.test, playfield-palette.test) — a test-double for `CanvasRenderingContext2D`, not a production bypass.
- **`readonly` on returned arrays (§Type Definitions):** the new seams' contracts (`alphanumericPens`/`fieldPens`) are typed `readonly Rgb[]` in the test loader, matching `playfieldPens`/`playerPens`.
- **Numeric constants (§Enums):** colour bytes asserted by exact value with ROM line citations; no magic-number drift.
- **No `x || default` falsy bug / no unchecked `Map.get` / no missing-dep effects:** not applicable to this render/palette surface.

**Handoff to Dev (GREEN):** ship the four seams above and wire all three in `main.ts`. Keep the field draw's per-code selection in a TESTABLE seam (`fieldPens`), not buried in `main.ts`. Do NOT invent a blue DDT box or per-section showcase colours — those are filed below as out-of-scope. After GREEN, run the /millipede/ visual playtest against `ingame-mame-reference.png` before claiming done.

## Dev Assessment

GREEN complete. All 12 ml9-2 feature tests pass (15/15 incl. the 3 sanity guards); full millipede suite **1316 passed / 6 skipped**, `npm run lint` (repo-wide `tsc --noEmit`) clean. Commit `742a0bb8`.

**Implemented exactly the four seams TEA specified:**
- `core/playfield-colour.ts` — `PLAYER_AREA_COLOUR = 0xD6` (ROM cite MILLI.MAC:1210).
- `shell/playfield-palette.ts` — `alphanumericPens()` (one-colour red `$1F` text window) and `fieldPens(code, centin?)` (per-char-code cap: normal `$7C-$7F` → inside `$0B` salmon, poison `$78-$7B` → inside-poison `$F8` blue; non-mushroom codes keep the base palette). Corrected the stale ml7-11 "normal uses pixels 1&2" header comment (TEA finding).
- `shell/render.ts` — `drawPlayerAreaBand(ctx)` fills the bottom 7 rows (y 200..256, full width) with the decoded `$D6` green.
- `main.ts` — grass band under the field; each field cell drawn with `fieldPens(cell)`; HUD drawn with `alphanumericPens()`.

**Visual playtest (mandatory, playbook §4 / AC3) — PASSED.** Served my tree on port 5290 (5270 held by sibling a-1, per runbook), started play, screenshotted `/millipede/`. Against `ingame-mame-reference.png`: HUD/score text is RED ✓, the green grass band spans the bottom rows ✓, mushrooms render salmon-cap/teal-stem ✓ (no blue normal caps). Bonus observations below.

**Rebase mid-phase (user ran `git pull --rebase --autostash`).** develop advanced to `8df04fa6` (#426 df3-2), which landed a SIBLING millipede change: authentic per-creature sprite colours (`spritePens`, `showcaseSprites`, `spriteInkBytes`, `drawSpritePx`/`drawStampAtPx` gaining a palette + rotate arg). The autostash pop conflicted on `main.ts` and `playfield-palette.ts`; I resolved by KEEPING BOTH sides — the sibling's sprite-colour rendering and my field/HUD/grass palette work compose cleanly (they touch different pens). Re-verified green + lint + visual after the merge. My branch is now rebased on the latest develop.

**Verification:** `npx vitest run --project millipede` 1316 pass; `npm run lint` clean; visual playtest matches ground truth. Handoff to TEA (verify phase).

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[TEA] Gap / non-blocking — DDT-bomb "blue box" is screenshot-only, no ROM basis.** MAME shows DDT bombs as blue rounded boxes with red "DDT" text. The DDT bomb IS placed in `state.field` (game-state.ts:112-114, ddt.ts:192-193; sim.ts:343 seeds more on scroll) and IS drawn (main.ts fieldPlacements → tile $2E/$2F), so it is NOT a missing-placement bug — it renders as a solid teal blob under `playfieldPens[2]`. But there is NO ROM colour byte for a blue DDT box (the only DDT-labelled CLRCH slot, ANCOL+1/+9, is the DDT-EXPLOSION cloud = inside-mushroom `$0b`, MLIRQ.MAC:267-268), and the baked tile is MONOCHROME (pixel value 2 only), so "blue box + red DDT text" cannot be reproduced from the ROM alone — it needs a re-bake or a special two-colour DDT sprite AND an owner call on a screenshot-only colour. Deferred from ml9-2; recommend a separate story with owner input. Not tested here.
- **[TEA] Gap / non-blocking — attract enemy-showcase per-section text colours live on a different file surface.** Scope folded in from ml9-1 review asks for WHITE high-scores + RED creature labels on the blue showcase (main.ts:115 currently draws it green via the census default). The colours are ROM slots (white `$00` ANCOL+3, red `$1F` ANCOL+2) but MLATR.MAC:580-610 has NO per-section colour write — the which-section-is-which-colour split is screenshot-inferred, and both letters and digits use the same pixel value (2), so it CANNOT be a pixel-value distinction: it needs `core/attract-showcase.ts` to expose sectioned placements + per-section palettes in `main.ts`. That is a DIFFERENT file surface from ml9-2's in-game render path, so per the epic group-by-file rule I split it out. Recommend SM create sibling story **ml9-3** (showcase text recolour). Not tested here.
- **[TEA] Improvement / non-blocking — the ml7-11 pen model is contradicted by the baked stamps.** `shell/playfield-palette.ts`'s header claims "normal mushrooms use pixels 1&2, poison uses 3"; the baked stamps show BOTH normal ($3C-$3F) and poison ($38-$3B) caps use pixel value 3. Dev should correct that stale comment when adding `fieldPens`. **[Dev: DONE — comment corrected in `742a0bb8`.]**
- **[Dev] Improvement / non-blocking — the DDT box now renders BLUE for free, narrowing the deferred (b) scope.** With per-code `fieldPens`, a non-mushroom code (DDT `$6E` → tile `$2E`) keeps the base palette whose pen 3 = poison `$F8` blue, so at the visual playtest the DDT bombs read as **blue boxes** — matching MAME's box colour, no re-bake needed. What REMAINS screenshot-only is the RED "DDT" lettering inside the box: the tile is monochrome, so the letters take the same pen as the box, not red. The ml9-3/owner follow-up for DDT is therefore narrower than TEA first scoped — only the two-colour (blue box + red text) treatment is open, not the box colour itself.

### Reviewer (code review)
- No blocking upstream findings. Three LOW / non-blocking observations, none requiring rework:
- **Improvement** (non-blocking): `PLAYER_AREA_ROWS` is a private, unexported `const` in `core/conway.ts:58`, so `shell/render.ts:37` re-hardcodes the value as `7 * 8` (`PLAYER_AREA_BAND_H`) with a citation comment rather than importing the source of truth. Both agree today; a future edit to `conway.ts` would not be caught. Affects `plugins/millipede/src/core/conway.ts` / `plugins/millipede/src/shell/render.ts` (export `PLAYER_AREA_ROWS` and import it — shell may depend on core). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `shell/render.ts:41` docstring cites `MILLI.MAC:1210` for the `"SET GREY FOR PLAYER AREA"` label, which sits on `:1211` (`:1210` is `LDA I,0D6`); the sibling comment at `core/playfield-colour.ts:75` correctly cites `1210-1211`. Cosmetic citation drift. Affects `plugins/millipede/src/shell/render.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `tests/ingame-colour.test.ts:205` comment cites a same-repo `conway.ts:58` line number (not a ROM `.MAC`/`.SRC` reference). Accurate today and unguarded in millipede (the comment-line-refs guard is joust-only), but the exact fragile pattern that guard exists to prevent. Prefer a symbol-only citation. Affects `plugins/millipede/tests/ingame-colour.test.ts`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- No deviations from the RED-phase spec. Built the four seams (`PLAYER_AREA_COLOUR`, `alphanumericPens`, `fieldPens`, `drawPlayerAreaBand`) and wired them as TEA specified; `fieldPens` per-code selection lives in the shell seam (testable), not in `main.ts`.
- Mid-phase rebase onto develop `8df04fa6` (user-initiated `git pull --rebase --autostash`) required a merge with a sibling's sprite-colour work (`spritePens`/`showcaseSprites`). Resolved by keeping both sides; not a spec deviation — the two changes touch disjoint pens and compose. Re-verified green + lint + visual after merge.

### Reviewer (audit)
- **Dev: "No deviations from the RED-phase spec."** → ✓ ACCEPTED by Reviewer: the four seams (`PLAYER_AREA_COLOUR`, `alphanumericPens`, `fieldPens`, `drawPlayerAreaBand`) match TEA's spec; `fieldPens`'s per-code selection lives in the testable shell seam, and HUD/grass/field are all wired in `main.ts` (verified against the diff at main.ts:176, :180, :209-213).
- **Dev: mid-phase rebase onto `8df04fa6`, kept both sides of the sprite-colour sibling merge.** → ✓ ACCEPTED by Reviewer: the sibling's `spritePens`/`showcaseSprites` colour motion-object (MOCOL) pens; ml9-2 colours field/HUD/grass (ANCOL) pens — the two are disjoint and compose. Full suite green (1316 pass) confirms no collateral.
- No undocumented spec deviations found: the diff implements exactly the RED-phase seams and nothing beyond the story's in-game render/palette surface.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (1316 pass / 0 fail / 6 skip, lint clean, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — boundary/OOB assessed by Reviewer (fieldPens indexes a fixed 4-elem array at literal index 3 only; `code & 0x7f` coerces degenerate input safely) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — no catch blocks / silent fallbacks introduced (loaders throw named errors) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — test quality assessed by Reviewer + rule-checker (#8/#15/#18/#26/#29 all clean; 15 meaningful assertions) |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 (both LOW) | confirmed 2 (non-blocking), dismissed 0, deferred 0 |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — return types `readonly Rgb[]`, no stringly-typed API, no unsafe cast in production (rule-checker #1/#2 clean) |
| 7 | reviewer-security | Yes | clean | none | N/A — pure client-side render change, no external input surface, purity boundary preserved |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — one simplification noted by Reviewer (fieldPens poison `else if` is a documentary no-op) |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations / 35 rules / 61 instances (1 non-rule awareness note) | confirmed 0, awareness note folded into Delivery Findings |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled)
**Total findings:** 0 confirmed blocking, 4 confirmed LOW/non-blocking (2 comment-analyzer + 1 rule-checker awareness + 1 Reviewer simplifier), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

Story ml9-2 delivers the four in-game colour seams exactly as TEA specified and Dev implemented, with the visual playtest against `ingame-mame-reference.png` already recorded as passing. Preflight is fully green (1316 pass / 0 fail / 6 skip), `npm run lint` (repo-wide `tsc --noEmit`) is clean, and the two clean specialists (security, rule-checker) plus comment-analyzer surfaced nothing above LOW. No Critical or High issue exists; per the blocking rule, this approves.

**Data flow traced:** a field byte in `state.field` → `fieldPlacements()` (main.ts:104, `stamp = byte & ~BACKGROUND_BIT`) → `fieldPens(p.stamp)` (main.ts:180) → `waveColours(12)` base pens + per-code pen-3 override → `decodeColourByte` → `drawGridStamps` → `rotatedStampImage` (no palette cache, so the per-placement palette is honoured) → canvas. A normal cap ($7C-$7F) resolves pen 3 to `insideMushroom` $0B (salmon); a poison cap ($78-$7B) keeps `poison` $F8 (blue). Ranges match `mushroom.isPoison`'s `[POISON,NORMAL)` and `[NORMAL,FULL_MUSHROOM]` exactly.

**Pattern observed (good):** colours are never invented — `drawPlayerAreaBand` (render.ts:41-46) builds its `fillStyle` from `decodeColourByte(PLAYER_AREA_COLOUR)`, and every pen in `fieldPens`/`alphanumericPens` decodes a ROM byte. This is the correct application of the fleet rule the memory `[colours-never-invented-ground-fill-uses-index]` records df2-1 regressing on.

**Error handling:** `fieldPens`'s `code & 0x7f` collapses any non-finite/negative/float input to an in-range int (`NaN & 0x7f === 0`), falling through to the base palette rather than throwing or corrupting; `waveColours`/`decodeColourByte` retain their pre-existing `RangeError` guards for `centin`/byte bounds (playfield-colour.ts:217-221, unchanged).

### Rule Compliance
Enumerated the applicable project rules against every changed symbol:
- **Core/shell boundary (CLAUDE.md — the single most important rule):** the one core file touched, `core/playfield-colour.ts`, adds only the data constant `PLAYER_AREA_COLOUR = 0xd6` — no DOM/clock/entropy. `purity.test.ts` passes 53/53 against the current tree. `alphanumericPens`/`fieldPens`/`drawPlayerAreaBand` correctly live in `src/shell/`. COMPLIANT (all 1 core + 3 shell symbols).
- **Colours never invented:** `drawPlayerAreaBand` fill + all 8 pen constructions decode a byte; no hex literal introduced. COMPLIANT.
- **ROM numeric constants carry a citation:** `PLAYER_AREA_COLOUR` cites MILLI.MAC:1210-1211/990; `PLAYER_AREA_BAND_H` cites `$07, conway.ts`. COMPLIANT (citation form); see the drift note below.
- **`readonly` on returned pen arrays:** `alphanumericPens(): readonly Rgb[]`, `fieldPens(...): readonly Rgb[]`. COMPLIANT (both new returns).
- **Meaningful test assertions:** all 15 new tests decode real production colours and pin independent geometry; no vacuous/self-referential assertion. COMPLIANT.

### Findings by source
- `[EDGE]` — subagent disabled. Reviewer assessed boundaries directly: `pens` is a fixed 4-element array written only at literal index 3; `code & 0x7f` bounds the char code; `centin` defaults to a valid level and its callee guards the range. No unhandled boundary. VERIFIED — playfield-palette.ts:101-113.
- `[SILENT]` — subagent disabled. No swallowed errors: the diff introduces no `catch`; the three test loaders `throw new Error(...)` naming the missing export. VERIFIED — ingame-colour.test.ts:126-162.
- `[TEST]` — subagent disabled. Test quality confirmed via rule-checker checks #8/#15/#18/#26/#29 (all clean) and my own read: source-text wiring greps run on `stripComments()` output and anchor the full positional call shape, so a comment cannot satisfy them. VERIFIED — ingame-colour.test.ts:374-382, :415, :463-465.
- `[DOC]` — **2 LOW findings confirmed (non-blocking):** render.ts:41 cites MILLI.MAC:1210 where the quoted label is on :1211; test:205 cites `conway.ts:58` (same-repo line). Both captured in Delivery Findings. All ROM citations otherwise verified against the vendored source.
- `[TYPE]` — subagent disabled. Return types are `readonly Rgb[]`; production code has no unsafe cast (the four test casts are the sanctioned self-describing-loader idiom, each guarded by a runtime `typeof` check). VERIFIED via rule-checker #1/#2.
- `[SEC]` — clean. Pure client-side render/palette change; no external input, no injection/auth/secret surface; core purity preserved.
- `[SIMPLE]` — **1 LOW noted (non-blocking):** in `fieldPens`, the `else if (v >= POISON && v < NORMAL) pens[3] = decodeColourByte(w.poison)` branch is a no-op — the base `pens[3]` already equals `decodeColourByte(w.poison)`. Harmless and documentary (it makes the poison-cap intent explicit); not worth a rework cycle.
- `[RULE]` — clean: 0 violations across 35 rules / 61 instances. One awareness note (unexported `PLAYER_AREA_ROWS` forcing a duplicate `7 * 8` literal) folded into Delivery Findings as a non-blocking Improvement.

### Devil's Advocate
Arguing the code is broken: The render path changed from one batched `drawGridStamps(..., playfieldPens())` to a per-placement loop calling `drawGridStamps(c, [p], fieldPens(p.stamp))`. If `rotatedStampImage` cached ImageData by tile index alone, the second placement of a given tile would reuse the first's palette and mushrooms would flicker the wrong colour — but I read the function: it allocates fresh `ctx.createImageData(8,8)` every call with no cache, so distinct palettes render correctly (cost is a handful of decodes per occupied cell per frame — negligible). A confused maintainer might read the poison `else if` as load-bearing and "fix" its supposed redundancy incorrectly; it is a genuine no-op, so no behaviour rides on it. What of a malformed field byte? `fieldPlacements` already strips the background bit and skips zero bytes, and `fieldPens`'s `& 0x7f` handles anything else without throwing — a stress case that hands it `NaN` yields base pens, not a crash. The grass band: `fillRect(0, 200, 240, 56)` assumes a 240×256 logical canvas; I confirmed `LOGICAL_W/H = 240/256` in main.ts, and the band is drawn after the black clear and before the field so transparent-pen (pen 0) mushroom pixels show grass — correct z-order. Could the HUD regress? It now draws through `alphanumericPens()` (all-red ink); the wiring guard anchors the exact `drawGridStamps(c, hudPlacements(...), alphanumericPens(` call, so an accidental revert to the green census default reddens. A CENTIN other than 12 would repaint field regions per the ROM table; that is the documented LCOLOR-deferral, out of scope here, and `waveColours` guards its input. The only residual risks are the two cosmetic citation drifts and the unexported-constant duplication — none change a rendered pixel. I could not construct an input that produces a wrong colour, a crash, or a boundary violation.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.