---
story_id: "cp2-7"
jira_key: "cp2-7"
epic: "cp2"
workflow: "tdd"
---
# Story cp2-7: Mushroom hitbox sits one unit right of the sprite — visual column vs collision column disagree

## Story Details
- **ID:** cp2-7
- **Jira Key:** cp2-7
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-19T08:40:28Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-19T07:58:13Z | 2026-07-19T07:59:23Z | 1m 10s |
| red | 2026-07-19T07:59:23Z | 2026-07-19T08:18:03Z | 18m 40s |
| green | 2026-07-19T08:18:03Z | 2026-07-19T08:30:50Z | 12m 47s |
| review | 2026-07-19T08:30:50Z | 2026-07-19T08:40:28Z | 9m 38s |
| finish | 2026-07-19T08:40:28Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking, routed to cp2-6): the same 16px-sprite left-anchor bug exists on the VERTICAL axis. The gun/shot sprite is `SPRITE_W`=8 tall drawn top-anchored at `cellScreenY(row)`, so if any vertical mis-anchor is present it is cp2-6's scope, not fixed here. cp2-7 fixes only the horizontal (`gunScreenX`) column skew; the fix (`h-8` → `h-16`) is x-only and does not touch `cellScreenY`. *Found by TEA during test design.*
- **Improvement** (non-blocking): the cp1-6 layout pin "draws the gun OVER its own collision column" (`tests/layout.test.ts`) uses a LOOSE ±TILE_W window `[cellScreenX(col)-8, cellScreenX(col)+8]`, which is exactly why this one-column skew hid for two epics — the true requirement is that the drawn sprite CENTRE lands inside the hit cell's 8px tile. cp2-7 adds the tight pin (`tests/hitbox-alignment.test.ts`); the loose cp1-6 pin still passes under the fix and was left untouched, but a future cleanup could tighten it. Affects `tests/layout.test.ts`. *Found by TEA during test design.*
- **Question** (non-blocking, for Dev): the fix also improves edge clipping — at `h=PLAYH_MAX` the OLD gun sprite is drawn left-edge 236, width 16 → spans [236,252), 12px off the right of the 240-wide screen; `h-16` pulls it to [228,244), only 4px over. Not asserted (out of AC scope) but worth an eyeball during AC-3 screenshot verification. Affects `src/shell/layout.ts` / `src/shell/render.ts`. *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking, already fixed): TEA's RED file `tests/hitbox-alignment.test.ts` imported `LOGICAL_W` from `src/shell/layout` but never used it (only referenced inside a comment) — `npm test` (vitest, esbuild strips types) stayed green through RED, but `npm run build` (`tsc --noEmit`) fails on the unused import (TS6133). RED evidently never ran `npm run build`, only `npm test` + citations. Fixed in GREEN by dropping the unused import (test-assertion-free change). Affects `tests/hitbox-alignment.test.ts`. *Found by Dev during implementation.*
- **Improvement** (non-blocking, answers TEA's Question above): eyeballed at h≈PLAYH_MAX via the live dev server (port 5288, this checkout) — the gun sprite's right edge now sits ~1-2px inside the playfield's right edge (screenshot `docs/rom-study/cp2-7-right-edge-clipping.png`), versus the old ~12px logical (48 screen px at 4x) overhang TEA predicted. Confirms the fix also resolves the right-edge clipping without a dedicated test (out of AC scope, as TEA noted). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): the mirror of the right-edge fix — at the *screen-left* extreme (`h=PLAYH_MIN=0x0b`) the correctly-centred 16px sprite now hangs ~5px off the left edge (`gunScreenX(0x0b)=-5`, sprite `[-5,11)`; canvas clips it safely, no crash). This is *inherent* to centring a 16px sprite on an 8px edge column — the alternative (left-anchoring to avoid the clip) is the bug — and the drawn centre still lands in the collision cell at that extreme (sweep-verified). Net clipping is improved vs the old code (right extreme 12px→4px). Purely cosmetic at one boundary; not asserted, out of AC scope. Affects `src/shell/layout.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking, restates TEA's own note): the loose cp1-6 `tests/layout.test.ts` pin (`±TILE_W` window on `gunScreenX`) is what let this column skew hide for two epics; it still passes under `h-16` and was left untouched. A future cleanup could tighten it to the sprite-centre requirement now that `hitbox-alignment.test.ts` pins it tightly. Affects `tests/layout.test.ts`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### Dev (implementation)
- No deviations from spec. The fix is exactly the contract TEA specified:
  `gunScreenX(h)` now returns `h - SPRITE_H` (via `cellScreenX(col) + subCell - SPRITE_H / 2`,
  algebraically `h - 16`) instead of `h - SPRITE_H/2` (`h - 8`), render-side only, in
  `src/shell/layout.ts`. `obstacleCellFor`/`obstacleCode`/`obstacleCell`/OBSTAC constants and
  `cellScreenY` were not touched. The one additional change (removing the unused `LOGICAL_W`
  import from the RED test file) is a build-blocker fix, not a behavior/spec deviation.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

## Sm Assessment

**Setup complete, ready for RED.** cp2-7 (2pt bug, tdd) — user-reported shot-vs-mushroom
hitbox one column right of the drawn sprite; sequenced ahead of cp2-4 so combat lands on a
trusted collision grid.

- **Session/context:** created; carries cp2-3's fresh OBSTAC quarry (column base 0xF7,
  round-to-nearest row — CT-27/28/29, byte-verified) which rules the fix to the RENDER side.
  OBSTAC itself is cited ground truth and must not change.
- **Branch:** `fix/cp2-7-mushroom-hitbox-column` off origin/develop at e80a91b (cp2-3).
- **Scope fence:** horizontal column only; cp2-6 (open) owns the vertical render path —
  disjoint scopes so the two stories don't collide in layout.ts/render.ts.
- **Jira:** skipped — none on this project.
- **Mode:** peloton subagent mode — tea/reviewer→opus, dev→sonnet; merges user-authorized.

## Tea Assessment

**Tests Required:** Yes — a user-reported combat off-by-one; the fix is render-side and
must be pinned against the OBSTAC oracle so it cannot silently drift again.

**RED commit:** `9b1bca0` on `fix/cp2-7-mushroom-hitbox-column` (off e80a91b = cp2-3).
Working tree clean; NO implementation written; NO cited file touched (gate stays 160/160).

### Root cause (hand-derived, then swept over the whole gun band)
The COLLISION is already faithful. OBSTAC (CT-29 / PS-16-18, `((0xF7-h)&0xF8)>>3`) and the
mushroom draw (`cellScreenX(col)=LOGICAL_W-(col+1)*8`) agree at the LEFT edge for every h
(swept: 0 mismatches). The bug is purely the DRAW: the gun/shot sprite is `SPRITE_H`=16 px
wide and `render.ts` blits it LEFT-anchored at `gunScreenX(h)`, and `gunScreenX(h)=h-8`
(closed form, verified), so the sprite's visual CENTRE is `gunScreenX(h)+SPRITE_H/2 = h` —
`SPRITE_H/2`=8 px = exactly one `TILE_W` column to the RIGHT of the cell the shot collides
in. The crosshair points at column c-1 while the shot destroys column c; equivalently a
mushroom's hitbox sits one unit RIGHT of its sprite (the user's `[*]`/`(s)` sketch).

Worked anchors (arithmetic, not eyeballed):
- `h=0x80`: collides col 14 (drawn `cellScreenX(14)=120`, tile `[120,128)`); current sprite
  centre `= (0x80-8)+8 = 128` → col 13's tile, one column RIGHT. Correct centre ∈ `[120,128)`.
- `h=0x0B` (PLAYH_MIN): collides col 29 (tile `[0,8)`); current centre `= 3+8 = 11` → col 28.

### Test file (1 new, 12 tests) — `tests/hitbox-alignment.test.ts`
- **AC-1 (3 pure):** reproduces the off-by-one at `h=0x80`; sweeps every playable pixel-H
  (drawn sprite centre must land in the collision cell's 8px tile); inverse per-column (a
  shot drawn centred over a column destroys THAT column, never a neighbour). RED (0/234).
- **AC-1 (6 render, robust to fix location):** drives the real `render()` with a recording
  ctx at cols 0/14/29 and asserts the actual drawn GUN and live-SHOT sprite centres sit over
  the mushroom in their collision column. RED (gun centre 131 vs `[120,128)`, etc.).
- **AC-2 (3 green guards):** OBSTAC/`obstacleCell` mapping is UNTOUCHED; `gunScreenX` stays a
  smooth strictly-monotonic +1px/step slide (no per-column stair-step — sign-chain safe);
  ROT270 direction (bigger h drawn further right). Green now, must stay green.

**Tests Written:** 12 (9 RED + 3 green guards). **Status:** RED.
- Isolated file: `9 failed | 3 passed`. Full suite: `Test Files 1 failed | 24 passed (25)`,
  `Tests 9 failed | 313 passed (322)` — the one failed file is the new one; all 24 baseline
  files (incl. `sign-chain`, `layout`, `render`) stay green. `check-citations`: 160/160.

### The Dev contract (build in GREEN — render side ONLY)
1. `src/shell/layout.ts` — `gunScreenX(h)` must draw the `SPRITE_H`-wide gun/shot CENTRED on
   its OBSTAC collision column instead of left-anchored: shift left by half the sprite width
   so the drawn centre coincides with the hit cell. Net: return `h - SPRITE_H` (= `h-16`)
   instead of `h - SPRITE_H/2` (= `h-8`) — keep the smooth sub-cell slide (still `+1`px per
   `+1`h, monotonic). One change fixes BOTH gun and shot (both blit via `gunScreenX`).
2. Do NOT touch `obstacleCellFor`/`obstacleCode`/`obstacleCell`/OBSTAC constants — cited
   ground truth; the guards enforce this. Do NOT touch `cellScreenY` / the vertical path
   (cp2-6). No new claims entry (no new ROM fact transcribed — derived from CT-27/28/29 +
   the geometric requirement that the drawn sprite centre coincides with its collision cell).
3. Expect the loose cp1-6 layout pin and sign-chain to stay green under `h-16` (verified).

### Rule Coverage (AC → tests)
| AC | Requirement | Tests |
|---|---|---|
| AC-1 | deterministic repro of the off-by-one + corrected alignment (hit col == drawn col) for every field column, cited to OBSTAC | `hitbox-alignment.test.ts` AC-1 pure (3) + render (6) |
| AC-2 | render side moves, other pins stay green; OBSTAC unchanged; `gunScreenX` smooth/monotonic; gun carries + fixes the same skew | AC-2 guards (3) + the render GUN pins; baseline `sign-chain`/`layout`/`render` untouched |
| AC-3 | human/screenshot verification | Dev artifact — noted, not attempted (this checkout, port 5278) |

**Self-check:** every RED test has a meaningful assertion with a self-describing message that
names the offending column and pixel span; the 3 guards are green-by-design (pin no-regression,
not vacuous). RED failures verified to fail for the RIGHT reason (sprite centre one column
right of the collision cell), no harness/import errors.

**Handoff:** To Dev (Julia) for GREEN — fix `gunScreenX` (h-8 → h-16), render side only.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/shell/layout.ts` — `gunScreenX(h)` now returns `cellScreenX(col) + subCell - SPRITE_H / 2`
  (algebraically `h - SPRITE_H` = `h - 16`) instead of `cellScreenX(col) + subCell` (`h - 8`),
  centring the 16px gun/shot sprite on its OBSTAC collision column instead of left-anchoring it.
  Added the `SPRITE_H` import from `../core/pictures`. Render side only — `obstacleCellFor`/
  `obstacleCode`/`obstacleCell`/OBSTAC/`cellScreenY` untouched.
- `tests/hitbox-alignment.test.ts` — dropped an unused `LOGICAL_W` import (TEA's RED file;
  referenced only in a comment, never in code) that failed `tsc --noEmit` under `npm run build`.
  No assertions changed.
- `docs/rom-study/cp2-7-hitbox-alignment.png` — AC-3 artifact: gun + 3 mushrooms all sitting
  inside the same OBSTAC collision-column tile (yellow guide lines), captured live from this
  checkout's dev server.
- `docs/rom-study/cp2-7-hitbox-before-after.png` — AC-3 artifact: before/after firing a shot —
  the mushroom INSIDE the hit-cell column takes damage, its right-neighbour mushroom (one column
  over, outside the yellow guides) is untouched. Direct proof of the story's reported bug fixed.
- `docs/rom-study/cp2-7-right-edge-clipping.png` — answers TEA's non-blocking Question: at
  h≈PLAYH_MAX the gun sprite now sits inside the playfield's right edge instead of overhanging it.

**Tests:** 322/322 passing (GREEN). Citations: 160/160 (`node tools/audit/check-citations.mjs`).
Build: clean (`tsc --noEmit && vite build`).

**AC-3 verification:** live-play screenshots via Playwright MCP against the dev server on port
5288, confirmed via `lsof` to be serving THIS checkout (`/Users/slabgorb/Projects/a-1/centipede`,
not a sibling checkout). Drove the gun with synthetic keyboard events (no debug/level-skip hook
exists in this game), pixel-measured sprite centroids from the captured PNGs (gun centroid
x=728.5 vs. mushroom centroid x=730.5, both inside the same [715,747) 32px screen column at the
4x integer scale), and fired a live shot that visibly damaged the in-column mushroom while leaving
its right neighbour untouched — the exact AC-3 scenario ("shooting the LEFT EDGE of a mushroom
destroys THAT mushroom, not its right neighbour").

**Branch:** `fix/cp2-7-mushroom-hitbox-column` (pushed)

**Handoff:** To Reviewer (The Thought Police)

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|------------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — corroborates: 322/322 tests, 160/160 citations, build clean, 0 core files changed, 0 code smells; `noUnusedLocals:true` confirms the `SPRITE_H` import is used and explains the RED `LOGICAL_W` build break Dev fixed |

**All received: Yes** (1 of 1 enabled subagents returned).

Remaining specialists (edge-hunter, silent-failure, test-analyzer, comment-analyzer, type-design,
security, simplifier) not spawned — a 1-line pure-arithmetic render fix with no error paths, no
I/O, no types added, no security surface. Reviewer performed the edge/test/comment/type analysis
directly (see Reviewer Assessment): geometry re-derived by hand, edge extremes checked, RED→GREEN
test diff audited, comment accuracy verified, whole-screen consumer grep, screenshot review.

## Reviewer Assessment

**Verdict:** APPROVED

**Geometry re-derived by hand (not trusted from TEA).** Closed form, all constants
verified from source (`OBSTAC_H_BASE=0xf7`, `PLAYH_MIN=0x0b`, `PLAYH_MAX=0xf4`,
`SPRITE_H=16`, `TILE_W=8`, `LOGICAL_W=PLYFLD_WIDTH*8=240`,
`cellScreenX(col)=240-(col+1)*8`):
- Old `gunScreenX(h) = cellScreenX(col)+subCell` collapses algebraically to **`h-8`** for
  *every* h (`232-8·⌊δ/8⌋ + 7-(δ&7) = 239-δ = h-8`, δ=0xf7-h). New form subtracts
  `SPRITE_H/2` → **`h-16`**. Confirmed monotonic +1px/step (derivative 1, sign-chain-safe).
- Drawn centre = `gunScreenX(h)+SPRITE_H/2 = h-8`. Lands in the collision tile
  `[cellScreenX(col), +TILE_W)` for **all** h: with `r=δ&7∈[0,7]`, `centre-left = 7-r ∈
  [0,7]` → always inside `[0,8)`. Anchor checks pass: `h=0x80`→col 14, old centre 128 (col
  13, one right), new centre 120 ∈ [120,128) ✓; `h=0x0b`→col 29, new centre 3 ∈ [0,8) ✓;
  `h=0xf4`→col 0, new centre 236 ∈ [232,240) ✓. The sweep test (234/234) corroborates.

**Data flow traced:** pointer/keyboard → `movePlayer` → `player.h` (clamped 0x0b..0xf4) →
`render` reads `player.h`/`shot.h` → `gunScreenX(h)=h-16` blits GUN/SHOT centred at `h-8`;
collision destroys `obstacleCell(shot.h).h` (OBSTAC, **untouched**). Draw centre and hit
column now coincide end-to-end — hit-where-drawn.

**Whole-screen consistency:** `gunScreenX` has exactly two `src/` consumers — `render.ts:76`
(GUN) and `:80` (SHOT); one change fixes both. Nothing else rides the anchor: mushrooms use
`cellScreenX` (unchanged), HUD uses `layoutText`. No explosion/other sprite affected.

**Adversarial concerns cleared:**
- RED→GREEN test diff (`9b1bca0..8d015fa`) is **only** the unused-`LOGICAL_W` import removal —
  zero assertions changed. Dev's build-blocker fix did not weaken the RED pins.
- Scope fence held: **zero** core files changed; `obstacleCell`/OBSTAC/`cellScreenY` untouched;
  `layout.ts` is not a cited-source file, so the +8-line comment cannot stale a pinned citation.
- Edge clipping: right extreme improved 12px→4px; left extreme now clips ~5px (inherent to
  correct centring, canvas-safe, non-blocking — logged as Delivery Finding).
- Screenshots (all three viewed, from this checkout's port-5288 server): centroid alignment
  (728.5 vs 730.5, same tile), in-column kill with right-neighbour spared, right-edge fit.

**AC-intent ruling (judged against intent "hit-where-drawn", per the setup-era AC caveat):**
- **AC-1 SATISFIED** — `hitbox-alignment.test.ts` deterministically reproduces the off-by-one
  (`h=0x80`) and pins corrected alignment across every playable h and every field column,
  driven against the OBSTAC oracle; fix derived from OBSTAC+geometry, not eyeballed.
- **AC-2 SATISFIED** — render side moved; OBSTAC/collision untouched (guards + zero core diff);
  `sign-chain`/`layout`/`render` baselines green; citations 160/160; no second collision mapper.
- **AC-3 SATISFIED** — three PNGs from THIS checkout show shooting a mushroom destroys THAT
  mushroom, not its right neighbour. The setup-era AC letter ("columns disagree") is superseded
  by TEA's true root cause (left-anchored 16px blit); intent fully met, and OBSTAC — which the
  ACs feared might be wrong — is correctly left alone.

**Deviation audit:** Dev logged "no deviations"; the sole non-fix change (dropping the unused
import) is a build-blocker fix, not a spec deviation — **ACCEPTED**.

**Results personally observed:** `npm test` 322/322 · `check-citations.mjs` 160/160 all verified
· `tsc --noEmit && vite build` clean · working tree clean · `git diff` core files = 0.

**Findings by severity:** 0 Critical · 0 High · 0 Medium · 2 Low/Improvement (non-blocking,
both logged under Delivery Findings). No blocking issues.

**Handoff:** To SM for finish-story.