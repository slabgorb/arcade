---
story_id: "cp2-1"
jira_key: "cp2-1"
epic: "cp2"
workflow: "tdd"
---
# Story cp2-1: Sprite orientation — every stamp renders 90 degrees clockwise; rotate at the shell atlas bake, keep the core decode byte-exact

## Story Details
- **ID:** cp2-1
- **Jira Key:** cp2-1
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-19T04:56:44Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-19T04:18:43Z | 2026-07-19T04:20:13Z | 1m 30s |
| red | 2026-07-19T04:20:13Z | 2026-07-19T04:38:45Z | 18m 32s |
| green | 2026-07-19T04:38:45Z | 2026-07-19T04:48:54Z | 10m 9s |
| review | 2026-07-19T04:48:54Z | 2026-07-19T04:56:44Z | 7m 50s |
| finish | 2026-07-19T04:56:44Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (blocking): **Rotating SPRITES at the bake swaps their atlas footprint AND their render dest dims.** An 8-wide × 16-tall sprite rotated 90° CCW is 16 wide × 8 tall. Dev must (a) give sprite rects a `SPRITE_H × SPRITE_W` (16×8) footprint and widen the one-column-per-stamp packing stride in `atlasRectFor` so 16-wide sprites stop overlapping, and (b) change the GUN/SHOT blit dest dims in `render.ts:73/77` from `(SPRITE_W, SPRITE_H)`=(8,16) to (16,8), or sprites render distorted (squished/stretched). The AC-2 golden deliberately pins only the 8×8 **tile** path (dimension-safe, `DIGIT_7`); the sprite footprint is a forced geometric consequence left to Dev + the AC-1 browser screenshot rather than over-pinned (multiple valid packing layouts). Affects `src/shell/atlas.ts` (rects + packing) and `src/shell/render.ts` (gun/shot dest dims). *Found by TEA during test design.*
- **Question** (non-blocking): **`layout.ts` cell placement is a double-reflection, not an axis-swapping ROT270.** `cellScreenX` depends only on `col`, `cellScreenY` only on `row` (both reflected about the far edge) — geometrically a 180° point reflection, whereas a true 90° ROT270 swaps the axes. The Architect's root cause holds that cell POSITIONS are already correct and only tile PIXELS are wrong, so this fix rotates pixels only. If the browser still reads wrong after the pixel rotation lands, revisit whether the position mapping also needs the axis swap — the AC-1 screenshot is the ground-truth check. Affects `src/shell/layout.ts`. *Found by TEA during test design.*
- **Improvement** (non-blocking): the committed cp1-6 demo screenshot (`docs/rom-study/cp1-6-demo-screenshot.png`) shows the defect and must be replaced/superseded by an upright cp2-1 shot (AC-1), taken from THIS checkout (prove 5278 ownership via lsof or a spare port — the dev-port trap). *Found by TEA during test design.*

### Dev (implementation)
- **Question** (non-blocking, resolved during GREEN): `layout.ts`'s double-reflection position mapping (TEA's Question above) needed NO change — the AC-1 browser screenshot confirms mushroom caps, the gun, and SCORE/LEVEL glyphs all read correctly upright with pixel-rotation-only. No further action needed. *Found by Dev during implementation.*
- **Improvement** (non-blocking, resolved during GREEN): TEA's blocking Gap (sprite footprint/dest-dim ripple) is now implemented — `atlasRectFor`'s packing is a variable-width column per stamp (was a fixed `TILE_W` column), sprite rects are `SPRITE_H × SPRITE_W` (16×8), and `render.ts`'s GUN/SHOT blit dest dims are `(SPRITE_H, SPRITE_W)`. Verified in the browser: the gun sprite renders as a clean, undistorted upright shape (zoomed screenshot, no stretching artifacts). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): the two `toMatch(/palette/)` positive presence scans (`tests/atlas.test.ts:103`, `tests/render.test.ts`) still run on UN-stripped source, so "palette" surviving only in a comment/import-path prose could keep them green if the real palette import were removed. R3 hardened the wiring + invented-colour scans (all comment-stripped) but left these weak presence checks unstripped. Consider comment-stripping them in a future R-hardening pass. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the rotated sprite blit dest-dims `(SPRITE_H, SPRITE_W)`=(16,8) in `src/shell/render.ts:76,80` have no unit pin — `tests/render.test.ts` only counts `drawImage` calls and asserts `GUN` is requested. Their only regression guard is the AC-1 browser screenshot (TEA's documented decision). A future story could add a recording-ctx assertion on the blit dest dims. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Updated a pre-existing `atlas.test.ts` assertion, not just the new RED tests:** the cp1-6 test `'a sprite rect is 8×16, a tile rect is 8×8'` hard-pinned `atlasRectFor('GUN')` to the UN-rotated `[SPRITE_W, SPRITE_H]` (8,16) footprint. TEA's own blocking Gap (and the passing `atlas-orientation.test.ts` dimension-swap probe) require the rotated sprite footprint to be `[SPRITE_H, SPRITE_W]` (16,8) — a direct, unavoidable contradiction with the old assertion once the fix is applied. Updated that one assertion (and its description) to the rotated expectation; left every other pre-existing test in the file untouched. Reason: the old assertion pinned the pre-fix (buggy) geometry as if it were permanent contract; the rotation is geometrically forced once `orientForScreen` is composed into `buildAtlas`, so the old pin was itself a latent regression-in-waiting for this exact story.

## Sm Assessment

**Setup complete, ready for RED.** Story cp2-1 (2pt bug, tdd) is the epic's mandated
first story — every later cp2 visual verification depends on upright sprites.

- **Session/context:** session file created; story context `sprint/context/context-story-cp2-1.md`
  and epic context `context-epic-cp2.md` generated from the (rich, authoritative) epic YAML.
- **Branch:** `fix/cp2-1-sprite-orientation` created in centipede off origin/develop (gitflow).
- **Race check:** origin/develop fetched and grepped — no cp2 work upstream, no open PRs; no
  sibling-checkout race at setup time.
- **Jira:** skipped deliberately — no Jira on this project; jira_key is the story id.
- **Technical scope routed to TEA/Dev, not solved here:** rotation is SHELL policy (core
  pictures.ts byte-gate inviolable); hand-derive mapping from one asymmetric glyph before code;
  MAME centiped.cpp ROT270 corroboration is schema-only claims; R3 test-hardening rides along.
  Prior-story archive `sprint/archive/cp1-6-session.md` holds the relevant Delivery Findings.
- **Mode:** peloton subagent mode per user directive — phase agents spawned as unnamed inline
  subagents (tea/reviewer→opus, dev→sonnet); merge between stories user-authorized up front.

## TEA Assessment

**Tests Required:** Yes — a user-reported render defect with a mechanically-pinnable core.

**RED commit:** `657e211` (centipede, branch `fix/cp2-1-sprite-orientation`, off origin/develop).

**Status:** RED — full suite **262 pass / 6 fail** (19 files, 1 failed); the 6 failures are all the
new intentional orientation tests. Citation gate **26 green** (`npm test -- citations`). Working
tree clean; no source files touched (only tests). Core `src/core/pictures.ts` untouched (cp1-3
byte-gate inviolable).

### The rotation, hand-derived BEFORE writing the expectation
- Current bake displays `decodeStamp`'s **raw ROM-byte grid**; the user sees it **90° clockwise**
  of correct, so the correction is the inverse: **90° counter-clockwise = ROT270** of the decoded grid.
- **Mapping** (R rows × C cols → C rows × R cols): `out[i][j] = grid[j][C-1-i]`.
- **Corroboration (schema-only, NO new ROM transcription):** cabinet is ROT270 (MAME
  `centiped.cpp:1800`, cited by cp1-6 `layout.ts`); gfx decode is `spritelayout {8,16, … xoffset{0..7}}`
  with pixel x=0 = MSB (`centiped.cpp:1722-1732`, already in `pictures.ts`). ROT270 rotates that
  MSB-first/top-down gfx-decode space onto the portrait display = a 90° CCW turn of the decoded grid.
- **`DIGIT_7` (offset 0x338) proof-on-paper** — ROM-byte grid → CCW → screen golden (`#`=colour 2):
  ```
  ROM byte order (buggy)      ROT270 / CCW = screen (upright "7")
  .....##.                    ........
  .....##.                    #######.
  ###...#.                    ##...##.
  ####..#.                    ....##..
  ...##.#.                    ...##...
  ....###.                    ..##....
  .....##.                    ..##....
  ........                    ..##....
  ```
  Golden asserted: `[[0,0,0,0,0,0,0,0],[2,2,2,2,2,2,2,0],[2,2,0,0,0,2,2,0],[0,0,0,0,2,2,0,0],[0,0,0,2,2,0,0,0],[0,0,2,2,0,0,0,0],[0,0,2,2,0,0,0,0],[0,0,2,2,0,0,0,0]]`.
  The WRONG direction (CW) puts the bar at the BOTTOM (upside-down 7); a mirror or a vertical
  flip also diverge — `DIGIT_7` is asymmetric both ways, so only the correct turn matches. Verified
  independently that `CW(screen) === rom`, confirming the current display IS the correct image
  turned 90° CW (matches the user report exactly).

### Test files
| File | Change | Pins |
|------|--------|------|
| `tests/atlas-orientation.test.ts` (NEW) | 7 tests | **AC-2** `orientForScreen(decodeStamp(DIGIT_7))` == screen golden; not-the-raw-grid; CCW-not-CW; true-90°-rotation (CW of screen == rom); non-square dim-swap probe (2×3→3×2). **AC-3** buildAtlas references the rotation (comment-stripped) / renderer does NOT rotate (no `orientForScreen`, `.rotate(`, `setTransform`). |
| `tests/atlas.test.ts` (edit) | AC-4 | positive `?raw` wiring scans now comment-stripped; new no-invented-colour scan (hex/rgb()/hsl() + CSS-keyword + inline `{r,g,b}` denylist). Stays GREEN vs real source. |
| `tests/render.test.ts` (edit) | AC-4 | no-invented-colour scan gains the CSS-keyword + `{r,g,b}` denylist. Stays GREEN. |
| `tests/main-loop.test.ts` (edit) | AC-4 | positive `?raw` wiring scans now comment-stripped. Stays GREEN. |

### The contract for Dev (GREEN)
- Add a pure `export function orientForScreen(grid: number[][]): number[][]` to `src/shell/atlas.ts`
  implementing `out[i][j] = grid[j][C-1-i]` (90° CCW / ROT270). Compose it into `buildAtlas` as
  `orientForScreen(decodeStamp(stamp))` — the SINGLE rotation site.
- Sprite footprint + render dest dims ripple (see Delivery Findings, blocking): rotated sprites are
  16 wide × 8 tall — update `atlasRectFor` sprite rects + packing stride and the GUN/SHOT dest dims
  in `render.ts`. AC-1 browser screenshot is the ground-truth check for sprites.
- `render.ts` must NOT rotate (the AC-3 guard already passes; keep it that way).
- **Do NOT** touch `src/core/pictures.ts` or the ROM-byte `decode-orientation.test.ts` golden (both
  stay green as the regression fence for the byte-exact decode).

### AC-4 hardening — RED-once proofs (each reverted; committed tree has NO source changes)
Each hardened scan was proven to bite by temporarily mutating source, running the targeted suite,
capturing the red, then `git checkout`-ing the file back:
1. **atlas comment-strip** — gutted `buildAtlas` so `decodeStamp` survived only in a doc comment
   (removed from import + body) → `builds FROM decodeStamp` **RED**. Reverted.
2. **atlas colour keyword** — `ctx.fillStyle = 'lime'` → `no CSS colour keyword` **RED**. Reverted.
3. **render colour keyword** — `ctx.fillStyle = 'gold'` → `no colour literals` scan **RED** (plus the
   background-pen behaviour test). Reverted.
4. **main-loop comment-strip** — `canvas.requestPointerLock()` moved into a comment → `requests
   pointer lock` **RED**. Reverted.
After all reverts, the full suite returned to the clean RED state (only the 6 orientation tests fail);
`git status` shows only the four test files.

**Handoff:** To Dev (green) — `.session/cp2-1-handoff-red.md`. AC-1 (browser screenshot) is a Dev/demo
artifact, not a test.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/shell/atlas.ts` — new exported pure `orientForScreen(grid)` (90° CCW / ROT270,
  `out[i][j] = grid[j][C-1-i]`), composed into `buildAtlas` as the single rotation site
  (`orientForScreen(decodeStamp(stamp))`). `atlasRectFor`'s packing changed from a fixed
  `TILE_W`-wide column per stamp to a variable-width column (`packRects()`): sprites now
  occupy a rotated `SPRITE_H × SPRITE_W` (16×8) footprint, tiles stay `TILE_W × TILE_H`
  (8×8, square — geometrically unaffected). `ATLAS_WIDTH`/`ATLAS_HEIGHT` now derive from
  the packing pass instead of `STAMPS.length * TILE_W` / `SPRITE_H`.
- `src/shell/render.ts` — GUN/SHOT blit dest dims swapped from `(SPRITE_W, SPRITE_H)` to
  `(SPRITE_H, SPRITE_W)` to match the rotated atlas footprint (else squished/stretched).
- `tests/atlas.test.ts` — updated the one pre-existing assertion that pinned the
  un-rotated `[SPRITE_W, SPRITE_H]` sprite-rect geometry to the now-correct rotated
  `[SPRITE_H, SPRITE_W]`; logged as a Design Deviation above.
- `docs/rom-study/cp2-1-demo-screenshot.png` — replaces the stale, defect-showing
  `cp1-6-demo-screenshot.png` (git-renamed then overwritten with a fresh capture from
  this checkout's dev server, port 5278, ownership verified via `lsof` — ➔ PID 90932,
  cwd `/Users/slabgorb/Projects/a-1/centipede`).
- `src/core/pictures.ts` — **untouched** (cp1-3 byte-gate inviolable, verified via
  `git diff --stat -- src/core/` showing no changes).

**AC-1 (browser, visually confirmed via Playwright screenshots, css + 4x-zoomed crops):**
mushroom tiles show a clean upright dome cap (green) over a stem (red), SCORE/LEVEL text
reads upright and legible (glyphs correctly formed, not mirrored/sideways), and the GUN
sprite renders as a symmetric, undistorted upright shape (cream body, two red highlights,
narrow top nozzle) — no stretching artifacts from the dest-dim swap. Compared directly
against the superseded cp1-6 screenshot, which shows sideways/mirrored SCORE+LEVEL text
and blob-like mushrooms with no cap/stem structure.

**Tests:** 268/268 passing (GREEN) — 262 prior + 6 new orientation tests, all 19 files.
Citation gate: 26/26 green (`npm test -- citations`). `npm run build` (tsc --noEmit +
vite build) passes clean.

**Branch:** `fix/cp2-1-sprite-orientation` (pushed, commit `bcfb436`).

**Handoff:** To Reviewer (review phase).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|------------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — mechanical checks all green: `npm test` 268/268, citations 26/26, `npm run build` clean, `npm run lint` (tsc --noEmit) clean, no TODO/FIXME/console.log/debugger/`any`/commented-out code introduced, `src/core/` diff empty. Corroborated by Reviewer's own re-run. |

**All received: Yes** (1/1 enabled subagents returned).

## Reviewer Assessment

**Verdict:** APPROVED

**Suite (personally re-run from `/centipede`):** full `npm test` **268/268 pass** (19 files);
`npm test -- citations` **26/26 pass**; `npm run build` (tsc --noEmit + vite build) **clean**.
Race check: `git log origin/develop | grep -i cp2` → nothing; no sibling landed cp2 work.
Working tree clean (read-only). Core `src/core/` diff empty — byte-gate inviolate.

**Data flow traced:** a decoded stamp → `orientForScreen(decodeStamp(stamp))` at the single
bake site (`atlas.ts:98`) → painted into its `packRects` slot → blitted 1:1 by `render.ts`
(source rect dims == dest dims) → upright on screen. Safe because the rotation is applied
exactly once and the dest dims were swapped to match the rotated source rect.

**Adversarial verification of the focus areas:**
- **AC-2 golden is genuinely hand-derived and correct.** Independently re-derived all 8 rows of
  `DIGIT_7_SCREEN` byte-by-byte from the ROM grid (cols read right→left become rows top→bottom) —
  matches the asserted golden exactly and reads as an upright "7". The `orientForScreen` formula
  `out[i][j]=grid[j][C-1-i]` re-derived as a true 90° CCW rotation and confirmed against the
  non-square 2×3→3×2 probe. The "CW(screen)===rom" test pins it as exactly ROT270, not a
  coincidental permutation.
- **AC-3 single rotation site.** `orientForScreen` composed only in `buildAtlas` (`atlas.ts:98`);
  `render.ts` scanned clean of `orientForScreen` / `.rotate(` / `setTransform`. `layout.ts`
  (cell POSITIONS) unchanged — the double-reflection was TEA's non-blocking question, resolved
  by the AC-1 screenshot. `src/core/pictures.ts` untouched (`git diff --stat` empty); the cp1-3
  byte-gate (`pictures.test.ts`) and ROM-byte golden (`decode-orientation.test.ts`) untouched
  and green — regression fence intact.
- **Packing rewrite is sound.** `packRects` lays contiguous variable-width columns at `sy=0`,
  `x += sw` — provably non-overlapping (adjacent rects touch, strict `<` overlap test covers all
  pairs and passes). Paint loop writes `c∈[0,sw)`, `r∈[0,sh)` for both 16×8 sprites and 8×8 tiles
  — no off-by-one, no clipping. No stale consumer of the old `STAMPS.length * TILE_W` /
  `SPRITE_H` dims survives (grep: `ATLAS_WIDTH/HEIGHT` read only inside `buildAtlas`).
- **GUN/SHOT dest-dim swap** to `(SPRITE_H, SPRITE_W)`=(16,8) matches the rotated 16×8 source
  rect → no scale distortion. Confirmed undistorted in the screenshot.
- **AC-4 hardening present + proven-red.** Comment-stripped `?raw` wiring scans (atlas/main-loop)
  and CSS-keyword + `rgb()/hsl()/hex` + inline `{r,g,b}` denylists (atlas/render) all present and
  passing on real source. RED-once evidence documented in the TEA assessment (4 mutations, each
  reverted; tree carries no source changes).
- **AC-1 screenshot** `docs/rom-study/cp2-1-demo-screenshot.png` committed in `bcfb436`; stale
  `cp1-6-demo-screenshot.png` deleted in the same commit. Viewed it: SCORE 0 / LEVEL 1 read
  upright, mushrooms show upright green caps over red stems, gun sprite upright and undistorted.

**Deviation audit — ACCEPTED:** the edited cp1-6 `atlas.test.ts` assertion (`[SPRITE_W,SPRITE_H]`
→ `[SPRITE_H,SPRITE_W]`) is a legitimate FORCED re-pin, not a weakened fence: it stays an exact
`.toEqual` on both dims, the rotated 16×8 footprint is geometrically unavoidable once
`orientForScreen` composes into `buildAtlas`, and the swap is independently corroborated by the
new dim-swap probe. The old assertion pinned pre-fix (buggy) geometry as permanent contract.

**Observations (findings by severity):**

| Severity | Issue | Location | Note |
|----------|-------|----------|------|
| [LOW] | `'sources colour from the palette module'` / `'colours come from the palette module'` positive scans run on UN-stripped source, so the word "palette" in a doc comment or import-path prose could keep them green if the real palette import were gutted. | `atlas.test.ts:103`, `render.test.ts` (`toMatch(/palette/)`) | Pre-existing weak presence check; R3 targeted the wiring + invented-colour scans (all correctly stripped/hardened) and the primary invented-colour defense IS stripped. Non-blocking. |
| [LOW] | Sprite blit dest-dims `(16,8)` are not unit-pinned — `render.test.ts` only counts `drawImage` calls and checks `GUN` is requested. The dest-dim swap's only regression guard is the AC-1 screenshot. | `render.test.ts:108-116` | TEA's explicit, documented decision (multiple valid packing layouts; screenshot is ground truth). Acceptable. Non-blocking. |

No Critical/High/Medium findings. All 4 ACs satisfied.

**Handoff:** To SM for finish-story (merge is human-authorized; Reviewer does not merge).
## Impact Summary

**Status:** APPROVED — Zero blocking findings. The blocking GAP (sprite footprint/dest-dim ripple) was resolved during GREEN implementation and verified by AC-1 browser screenshot and AC-2/3/4 test hardening. All acceptance criteria met.

**Delivery Findings Summary:**
- **Blocking (resolved):** 1 gap (sprite atlas packing footprint + render dest dims) — addressed by Dev in `atlas.ts` (packing rewrite, rect dims) and `render.ts` (dest-dim swap to 16×8)
- **Non-blocking:** 5 items (TEA Question on `layout.ts` position mapping, Dev resolution, Reviewer observations on test coverage)

**Key Outcomes:**
- Sprite rotation applied exactly once in `buildAtlas` via `orientForScreen(grid)` (90° CCW / ROT270)
- Atlas packing rewritten from fixed `TILE_W` columns to variable-width layout; sprites occupy rotated `SPRITE_H × SPRITE_W` (16×8) footprint
- Render dest dims swapped to `(SPRITE_H, SPRITE_W)` matching rotated source rect
- All visuals verified: mushroom caps upright, SCORE/LEVEL text readable, gun sprite clean (no distortion)
- Test suite green: 268/268 passing + 26/26 citations; AC-4 hardening present (proven-red wiring/colour scans)
- Core `src/core/pictures.ts` untouched (byte-gate inviolable)

**Non-blocking Observations (Reviewer, severity LOW):**
- Positive presence scans (`toMatch(/palette/)`) run on UN-stripped source (acceptable; primary invented-colour defence is hardened)
- Sprite dest-dim swap lacks unit pin; AC-1 screenshot is regression guard (acceptable; TEA's documented design decision)

**Recommendation:** Ready to finish — story ready for archive.
