---
story_id: "cp1-5"
jira_key: "cp1-5"
epic: "cp1"
workflow: "tdd"
---
# Story cp1-5: Player + single shot — bottom-zone movement, TBLMT clamp, slot-14 fire, shot-vs-mushroom collision

## Story Details
- **ID:** cp1-5
- **Jira Key:** cp1-5
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-19T01:41:09Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-19T00:42:45Z | 2026-07-19T00:44:42Z | 1m 57s |
| red | 2026-07-19T00:44:42Z | 2026-07-19T01:08:50Z | 24m 8s |
| green | 2026-07-19T01:08:50Z | 2026-07-19T01:19:11Z | 10m 21s |
| review | 2026-07-19T01:19:11Z | 2026-07-19T01:41:09Z | 21m 58s |
| finish | 2026-07-19T01:41:09Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): the ROM's MOVE blocks the gun from gliding INTO a mushroom cell (`JSR OBSTAC` / `BNE 5$`, CENTI4.MAC:1500-1503 horizontal, 1535-1536 vertical). This story's `movePlayer` does bounds-clamp only — it does NOT block on mushrooms, so the gun currently glides through mushrooms in its band (v up to 0x30). Not named by any AC (AC-1 = bounds+TBLMT+fire+shot-speed; collision is AC-3, shot-only). Deferred to a player-polish follow-up; it overlaps the motion-object collision the enemy stories (cp2/cp3) introduce. *Found by TEA during test design.*
- **Improvement** (non-blocking): the ROM fire is AUTO-REPEAT, not single-press — while fire is held, the shot re-fires on any frame it is at rest (SHOOT checks the button every frame the shot is on the gun; there is no explicit edge-latch, CENTI4.MAC:2116-2131). The single-shot cap comes purely from the at-rest gate (PS-11), not from debouncing. Encoded as-is. If a future design wants one-shot-per-press, that is a deliberate divergence from rev-4 — flag to design, don't "fix" silently. *Found by TEA during test design.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Vertical COMP folded into the shell sign convention:** Spec (ROM MOVE) applies `JSR COMP` to negate the vertical trackball reading before TBLMT (CENTI4.MAC:1524, "DIRECTIONS ARE REVERSED"). Tests instead define the core input contract as `+dv = up` and apply `applyTblmt` symmetrically to both axes, letting the shell adapter own the device sign. Reason: COMP-then-TBLMT is magnitude-identical to TBLMT-of-the-negated-input (TBLMT is sign-symmetric), so this is a pure sign convention, not a behavior change — and it keeps the core contract device-orientation-free (AC-4).
- **Non-mushroom playfield stamp collision reduced to "keep flying":** Spec (ROM) re-arms the shot on ANY non-empty stamp, including a non-mushroom code `< 0x38` (`BCC 108$`, CENTI4.MAC:2153). Tests require `stepShot` to treat only mushrooms (`isMushroom`, 0x38-0x3F) as a collision and fly through everything else. Reason: this playfield only ever holds 0 (empty) or a mushroom code (cp1-4 model), so a non-mushroom non-empty cell cannot occur — the reduction is faithful, and the isMushroom gate (cp1-4 Reviewer carry-forward) is what the AC-3 test pins (a `0x10` cell is left untouched).
- **Fire modeled as a boolean, not the active-low D2 port bit:** Spec (ROM) reads `FIRE`=0xC01 where D2=0 means pressed (CENDE4.MAC:80, PS-9). The core contract uses `fire: boolean` (true = pressed); the active-low hardware detail is the shell's job. Reason: keeps core device-agnostic (AC-4).

## Impact Summary

**Blocking Issues:** 0

**Non-Blocking Findings (routed downstream):**

**From TEA (test design):**
1. Gun doesn't block on mushrooms during movement — ROM's MOVE applies `JSR OBSTAC / BNE 5$` to keep old position on obstacle; this story's `movePlayer` bounds-clamps only. Deferred to player-polish follow-up (cp2/cp3 will introduce motion-object collision anyway); not named by any AC-1.
2. Fire is auto-repeat (level-triggered), not single-press — ROM reads `FIRE` every frame the shot is at rest with no edge-latch. Single-shot cap comes from at-rest gate (PS-11), not debouncing. Faithfully encoded; one-shot-per-press would be a deliberate divergence requiring design flag.

**From Dev (implementation):**
1. 3 unused module-scope consts in `tests/player.test.ts` tripped `tsc noUnusedLocals` (TS6133) — removed 3 dead lines; no assertion changed. Issue was pre-existing at RED commit `61b30bd`.

**From Reviewer (code review):**
1. Shell input adapters have no blur/focus-loss/pointer-lock-exit handling — missed keyup/mouseup on alt-tab leaves fire/direction stuck. Routes to shell-integration story (adapters currently duck-typed; no runtime window-wiring yet).
2. Horizontal device→`dh` sign unpinned against on-screen direction — `+dh` moves toward ROM's LEFT edge (0xF7-h). Vertical got sign analysis + test; horizontal has magnitude-only coverage. Routes to render story (reconcile mouse-right / ArrowRight direction with column layout).
3. Test coverage gaps: no collision destroyer above row 8, no upper-band MUSHDC-negative case, no absolute score pin on two-mushroom run. Underlying ROM arithmetic independently verified byte-correct; gaps are regression-prevention only.

**Release Readiness:**
- PR merged: commit 7847ada on origin/develop
- Tests: 172/172 passing (8 files); citations: 118/118 byte-verified
- Build/lint: green (`tsc --noEmit && vite build`, `tsc --noEmit`)
- All 4 ACs covered by green tests


## Story Acceptance Criteria

1. Movement bounds, TBLMT clamp value, fire semantics, and shot speed transcribed with radix-cited comments + claims entries; citations suite green.
2. Exactly one shot in flight ever; firing while the shot lives is ignored, matching the ROM's slot-14 model.
3. Shot-vs-mushroom collision resolves on grid cells per the ROM's arithmetic (cited), covered by moving-shot tests (asteroids lesson: never test only stationary projectiles).
4. Core input contract is device-agnostic counts; mouse and keyboard shells both drive it in a shell test.

## Sm Assessment

**Setup verified:** session + context files in place, branch `feat/cp1-5-player-single-shot` off origin/develop @ 721f8c1 (cp1-4's merge), epic YAML flipped to in_progress, orchestrator setup commit b539ae1. Merge gate clear; no sibling cp1-5 race on origin.

**Story shape:** 5pt, `workflow: tdd` explicit. Repo centipede only. First story with BOTH core work (player/shot motion-object slots) and SHELL work (input adapters) — the purity boundary gets its first real two-sided exercise.

**Hazards routed to TEA (O'Brien):**
- ROM quarry lines (RADIX 16, trailing-dot = decimal): MOVE (player movement + bottom-zone bounds) CENTI4.MAC:1477; TBLMT trackball limit CENTI4.MAC:2514; CHECK FIRE SWITCH CENTI4.MAC:2099. Slot model: 16 motion-object slots, 14 = the SINGLE shot, 15 = player (epic ground truth). Transcribe the actual bound values, clamp arithmetic, fire gating, and shot speed from the routines — every constant radix-cited + claims entry (gate at 99 verifying; yours extend it).
- AC-2: ONE shot in flight ever — firing while the shot lives is IGNORED (not queued). Pin both the ignore and the re-arm condition (when the slot frees: off-top? collision?) from the ROM.
- AC-3: collision resolves on GRID CELLS per the ROM's arithmetic — cite the address computation. MOVING-shot tests mandatory (asteroids tunneling lesson): a shot crossing a mushroom cell between frames must be covered; test whether the ROM itself can tunnel (shot speed vs cell height per frame — transcribe, don't assume).
- Carry-forward (cp1-4 Reviewer LOW): `damageMushroom` does NOT guard its precondition — the shooter path MUST gate with `isMushroom` (or add the ROM's own `CMP I,38 / BCC` guard inside). Also note damage/restore compare raw cell while isMushroom masks & 0x3F — if the shot path touches color-bit-carrying cells, resolve deliberately.
- AC-4: core input contract is device-agnostic COUNTS. Trackball hardware context: counters read once per IRQ, 240x/s (centiped.cpp:514 — MAME corroboration, schema-only); shell aggregates per frame. Mouse (pointer-lock deltas → counts) and keyboard (synthesized counts at the clamp rate) both drive the same contract in a SHELL test — shell tests live outside the purity boundary; core never sees devices.
- Scoring: mushroom-destruction scoring already lives in playfield.ts (+1 on destroying hit) — the shot path must not double-count.
- Purity guard auto-binds any new core module; the shell adapters are shell/ — keep the boundary clean (core: counts in, state out).
- Sibling checkouts active (red-baron stories landing); re-verify no cp1-5 race at review.

**Peloton mode:** subagent peloton (user-directed) — SM drives phases via inline subagents.

**Routing:** phased tdd → next phase `red`, owner `tea`.

## TEA Assessment

**Tests Required:** Yes — both a CORE suite (player gun + single shot + collision) and the first SHELL suite in the repo (input adapters, AC-4). Core + shell purity boundary gets its first two-sided exercise.

**RED commit:** `61b30bd` on `feat/cp1-5-player-single-shot` (off cp1-4 merge 721f8c1). Working tree clean; no implementation code written.

### Test Files
- `tests/player.test.ts` — 31 tests. Core suite (`src/core/player.ts`, to be built). Pins: the transcribed constants; TBLMT clamp+halve; bottom-zone movement (bounds + half-pixel accumulator); slot-14 single-shot fire (launch / fire-ignored-while-live / off-top re-arm / relaunch); OBSTAC grid-cell mapping; mushroom collision (destroy scores 1 once, non-destroy decrements, MUSHDC lower-count, isMushroom gate); MOVING-shot anti-tunnel (row advances 0/1 per frame, never skips; a mushroom in every reachable row is hit); determinism (entropy-free). 3 provenance tests are green-from-day-one (they read the committed claims file).
- `tests/input.test.ts` — 12 tests. Shell suite (`src/shell/input.ts`, to be built). Pins: both adapters emit the device-agnostic `InputCounts`; mouse aggregates pointer-lock `movementX/Y` and drains on `sample()`; keyboard synthesizes ±`KEY_COUNT` (= core `TBLMT_LIMIT`) per held direction; WASD + Space; opposite keys cancel; **both adapters drive the identical core `movePlayer` and converge to the same 4px through the one TBLMT clamp** (the AC-4 point); a source-text guard that no device token leaks into `core/player.ts`.
- `docs/rom-study/claims/07-player-shot.json` — 19 claims (PS-1..PS-19), all byte-verified GREEN against the vendored tree by the citation gate (verbatims machine-extracted, not hand-typed).

**Tests Written:** 43 tests (31 core + 12 shell) covering all 4 ACs.
**Status:** RED (feature tests fail with self-describing "not built yet"; citations + prior 128 green — final run `Tests 40 failed | 131 passed (171)`, the 40 = intended feature RED, the 131 include 3 cp1-5 provenance + everything prior).

### TRANSCRIPTION TABLE (RADIX 16; trailing `.` = decimal)
| Constant | Hex | Decimal | file:line (verbatim) | Claim |
|---|---|---|---|---|
| PLAYH left-edge clamp | `0F4` | 244 | CENTI4.MAC:1505 `CMP I,0F4` / 1507 `LDA I,0F4` | PS-3 |
| PLAYH right-edge clamp | `0B` | 11 | CENTI4.MAC:1510 `CMP I,0B` / 1512 `LDA I,0B` | PS-4 |
| PLAYV bottom-edge clamp | `08` | 8 | CENTI4.MAC:1538 `CMP I,8` / 1557 `LDA I,8` | PS-5 |
| PLAYV top-edge clamp | `30` | 48 | CENTI4.MAC:1549 `CMP I,31` / 1551 `LDA I,30` | PS-6 |
| TBLMT delta clamp | `08` (`0F8`=-8) | ±8 | CENTI4.MAC:2519/2524/2526 | PS-7 |
| TBLMT signed ÷2 (→ max px/frame) | `04` | 4 | CENTI4.MAC:2528 `ROR` (2527 `CMP I,80`) | PS-8 |
| FIRE port / D2 bit | `0C01` / `04` | — | CENDE4.MAC:80 ; CENTI4.MAC:2129 `AND I,04` | PS-9/10 |
| Single-shot gate (rest = PLAYV+4) | `04` | 4 | CENTI4.MAC:2110/2113/2114 `CMP SHOTV` (2115 `BNE 102$`) | PS-11/13 |
| Off-top re-arm threshold | `0F3` | 243 | CENTI4.MAC:2108 `CMP I,0F3` | PS-12 |
| Shot speed (per frame) | `07` | 7 | CENTI4.MAC:2137 `LDA I,7` / 2142 `ADD 7 TO SHOT` | PS-14 |
| Collision probe offset (old V + 1) | `01` | 1 | CENTI4.MAC:2144 `LDA I,01` / 2147 `ADC TEMP2` | PS-15 |
| OBSTAC cell height (V/8, round) | `08` | 8 | CENTI4.MAC:1701 `LSR`×3 / 1704 `ADC I,0` | PS-16 |
| OBSTAC column reversal base | `0F7` | 247 | CENTI4.MAC:1715 `LDA I,0F7` (hcol=(0F7-H)>>3) | PS-17 |
| OBSTAC base addr (PLYFLD/4 → 0x400) | `400` | 1024 | CENTI4.MAC:1706 `LDA I,1 ;BASE ADDRESS OF PLAYFIELD/4` / 1733 | PS-18 |
| Shot slot 14 / gun slot 15 | `14`/`15` | 14/15 | CENDE4.MAC:150/151/155/156 | PS-1/2 |

All cocktail EORs are no-ops in this 1-player upright sim: `CLEAR` zeroes CKC0/CKF8/CKFE/CKFF for player 1 (CENTI4.MAC:737-751). So `LDA I,7 EOR CKFE`=7, `LDA I,04 EOR CKF8`=4, `LDA I,01 EOR CKFF`=1, `EOR CKC0`=identity.

### TUNNELING RULING
**The ROM cannot tunnel, and neither may the sim.** The shot advances **+7 px/frame** (PS-14) and the playfield cell height is **8 px** (PS-16). Collision is checked **once per frame** at the single cell `round((oldSHOTV+1)/8)` (PS-15/16) — the ROM does NOT sweep. Because the step (7) is **strictly less than** the cell height (8), consecutive probe cells differ by at most 1 row, so no cell is ever skipped — that is precisely *why* one probe per frame is sufficient. This is the asteroids lesson applied: `tests/player.test.ts` has two mandatory moving-shot tests — (a) the per-frame collision ROW advances by only 0 or 1 (an invariant that breaks the instant `SHOT_SPEED >= CELL_PX`), and (b) a mushroom placed in **every** reachable row 2..8 of the shot's column is hit by a fresh shot — none tunnel through. The AC-1 constant test also asserts `SHOT_SPEED < CELL_PX` directly.

### SLOT-14 RE-ARM (AC-2)
The shot is at rest ⇔ `SHOTV == PLAYV+4` (PS-11/13). Fire is read ONLY at rest; a live shot takes `BNE 102$` and never reaches the fire test, so **pressing fire while the shot lives is ignored, never queued**. The slot frees (re-arms to the gun via RSHOT) on exactly two conditions: **off-top** `SHOTV >= 0xF3` (PS-12), or **collision** (mushroom hit → `20$ JSR RSHOT`). The Shot state is a single object — one shot is structural, not a count.

### RED VERIFICATION EVIDENCE
- testing-runner full run: `Test Files 2 failed | 6 passed (8)` · `Tests 40 failed | 131 passed (171)`.
- `tests/audit/citations.test.ts` — **all green**, including the "committed claims all re-open byte-for-byte" block, so the 19 PS-* claims byte-verify against the vendored tree NOW.
- `tests/player.test.ts` — 28 feature FAIL with `player core module not built yet …`; 3 provenance PASS.
- `tests/input.test.ts` — 12 FAIL with `input shell adapters not built yet …` (and the core-input-contract source guard fails on the absent file).
- playfield / pictures / purity / scaffold — all green (no regression).

### Rule Coverage
| AC | Requirement | Tests |
|---|---|---|
| AC-1 | Bounds, TBLMT, fire, shot speed transcribed + cited; citations green | player.test.ts "transcribed ROM constants" (3), "TBLMT clamp+halve" (3), "bottom-zone movement" (6), provenance (3); claims 07 byte-verified |
| AC-2 | Exactly one shot; fire ignored while live (slot-14) | player.test.ts "slot-14 single-shot fire model" (6) — esp. "pressing fire WHILE live is ignored" and "re-arms off the top, then can fire again" |
| AC-3 | Shot-vs-mushroom on grid cells (cited); moving-shot tests | player.test.ts "OBSTAC grid-cell mapping" (2), "mushroom collision resolves+scores" (4), "moving shot never tunnels" (2), "determinism" (2) |
| AC-4 | Device-agnostic counts; mouse + keyboard shells | input.test.ts (12) — both adapters emit `InputCounts`, both drive the same `movePlayer`, converge through TBLMT |

### Notes for Dev (Julia)
**Build (both under the purity boundary — core stays device-free):**
1. `src/core/player.ts` — export the constants above + `InputCounts { dh, dv, fire }` (core OWNS this contract — the shell imports it), `Player { h, v, hFrac, vFrac }`, `Shot { h, v, live }`, and `createPlayer / createShot(player) / applyTblmt(delta) / movePlayer(player, counts) / stepShot(shot, player, field, fire) / obstacleCell(h, v)`. Imports `isMushroom`/`damageMushroom`/`createPlayfield`/`PLYFLD_STRIDE`/`PLYFLD_WIDTH`/`PLYFLD_HEIGHT`/`MUSH_LOWER_BOUND` from `./playfield` (core→core, allowed).
2. `src/shell/input.ts` — export `KEY_COUNT` (= `TBLMT_LIMIT`), `createMouseAdapter(target)`, `createKeyboardAdapter(target)`, each returning `{ sample(): InputCounts }`. Import `InputCounts` + `TBLMT_LIMIT` from `../core/player`. Adapters take a duck-typed `{ addEventListener }` (node env has no DOM) and read plain event fields.

**Frame order (shell/sim):** `movePlayer(counts)` then `stepShot(shot, player, field, fire)`. When the shot is `!live`, `stepShot` glues it to the (already-moved) gun at `v = player.v + 4`.

**`stepShot` exact contract the tests pin:**
- `!live && !fire` → glue to gun `{h: player.h, v: player.v+4, live:false}`, scored 0.
- `!live && fire` → launch (set live, then advance this same frame).
- `live && shot.v >= SHOT_OFFTOP` (checked on CURRENT v, BEFORE advancing) → re-arm to gun, scored 0.
- else advance: `collideV = oldV + 1`; `cell = obstacleCell(shot.h, collideV)` → offset `cell.h*0x20 + cell.v`; `newV = oldV + 7`. If `isMushroom(field.cells[offset])`: `damageMushroom` it, write the new cell, `scored = result.scored`, and if `destroyed && cell.v < MUSH_LOWER_BOUND` decrement `field.mush` (MUSHDC, PM-30), then **re-arm to gun**. Else keep flying `{h, v:newV, live:true}`, scored 0.
- `obstacleCell(h,v)`: `{ h: (0xF7 - h) >> 3, v: (v + 4) >> 3 }` (the `+4` is the round-to-nearest of `ADC I,0`).

**TRAPS:**
- **`applyTblmt` is a SIGNED floor-÷2 with a half-pixel carry.** `applyTblmt(7) = {move:3, frac:0x80}`, `applyTblmt(-7) = {move:-4, frac:0x80}`, `applyTblmt(-1) = {move:-1, frac:0x80}`. Do NOT truncate toward zero — the tests fail if you drop the half. `movePlayer` banks `frac` into `hFrac/vFrac` (8-bit): when it overflows 0x100, carry +1 into the integer move (two +7 frames must travel a full 7 px, not 6).
- **isMushroom gate is mandatory** (cp1-4 Reviewer LOW carry-forward): call `isMushroom(cell)` BEFORE `damageMushroom` — `damageMushroom` does not guard its own precondition. The `0x10`-cell test proves it.
- **+1 scoring not double-counted:** `damageMushroom` already returns `scored` only on the destroying hit; `stepShot` must pass it through unchanged (the 4-shots-total-score-1 test enforces this).
- **Off-top uses the CURRENT v (pre-advance)**, threshold `>= 0xF3`; the shot may briefly reach v≈0xF4 before the next frame re-arms it. Don't re-arm off the post-advance v.
- **Do NOT block gun movement on mushrooms** this story (Delivery Findings — deferred); movement is bounds-clamp only.
- **Core stays device-free:** no `movementX`/`keydown`/`mousemove`/`PointerEvent` in `core/player.ts` (input.test.ts source guard + purity.test.ts both check).

**Handoff:** To Dev (Julia) for GREEN implementation.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/player.ts` (new) — bottom-zone bounds, TBLMT clamp (`applyTblmt`: clamp ±8 then signed floor-÷2 with 0x80 half-pixel carry banked into `hFrac`/`vFrac`, overflow at 0x100 carries +1px), `createPlayer`/`createShot`/`movePlayer`/`stepShot`/`obstacleCell`. Slot-14 single shot: fire read only at rest, live shot ignores fire, re-arms on off-top (`v >= 0xF3`, pre-advance) or mushroom hit. Shot advances +7px/frame; collision probes `obstacleCell(h, v+1)` gated by `isMushroom` before `damageMushroom` (cp1-4 carry-forward honored), `scored` passed through unchanged, MUSHDC lower-band decrement on destroy. All constants radix-cited to PS-1..PS-19.
- `src/shell/input.ts` (new) — `createMouseAdapter` (aggregates `mousemove` movementX/Y into `dh`/-`dv`, drains on `sample()`; mousedown/up button-0 → `fire` level) and `createKeyboardAdapter` (Arrow+WASD held-key → ±`KEY_COUNT` level per axis, Space → `fire`), both duck-typed on `{ addEventListener }`, both emitting core's `InputCounts`. `KEY_COUNT = TBLMT_LIMIT` (imported from core, re-exported).
- `tests/player.test.ts` (edit, 3 lines removed) — dropped 3 dead module-scope consts (`TBLMT_LIMIT`, `CELL_PX`, `OBSTAC_H_BASE`) that pre-existed the RED commit and tripped `tsc`'s `noUnusedLocals` (TS6133), blocking `build`/`lint` independent of any implementation. Verified via `git stash` against the RED tree before touching anything. No assertion changed — the tests already compared against the module's own `p.TBLMT_LIMIT` etc., never the bare local shadow.

**Tests:** 172/172 passing (GREEN), 8 test files. `tests/audit/citations.test.ts` green — 118/118 ROM claims byte-verified across all 8 claims files (00-07). `npm run build` clean (`tsc --noEmit && vite build`). `npm run lint` clean (`tsc --noEmit`). Verified via `testing-runner` subagent (two runs — first caught the pre-existing TS6133, second confirmed all-green after the fix) plus a direct `npx vitest run --reporter=verbose` per-file tally: citations 26, input 12, pictures 25, player 31, playfield 29, purity 16, scaffold 25, `tools/pictures-bake/bake-contact-sheet.test.mjs` 8 (pre-existing, unrelated) = 172.

**AC walkthrough:**
- AC-1 (bounds/TBLMT/fire/shot-speed transcribed + cited, citations green): all 11 constants exported from `player.ts` match the transcription table exactly (PLAYH_MIN=0x0B, PLAYH_MAX=0xF4, PLAYV_MIN=0x08, PLAYV_MAX=0x30, TBLMT_LIMIT=0x08, SHOT_SPEED=7, SHOT_REST_OFFSET=4, SHOT_OFFTOP=0xF3, SHOT_COLLIDE_OFFSET=1, CELL_PX=8, OBSTAC_H_BASE=0xF7); `tests/player.test.ts` "transcribed ROM constants" + provenance describes pass; citations suite (26 tests, 118 claims) green.
- AC-2 (exactly one shot; fire ignored while live): `stepShot`'s live branch never reads `fire` at all — only off-top or a mushroom hit re-arms. "slot-14 single-shot fire model" (6 tests) green, incl. the 40-frame held-fire flight test and the off-top re-arm/relaunch test.
- AC-3 (grid-cell collision, cited, moving-shot anti-tunnel): `obstacleCell` matches the ROM's `(0xF7-h)>>3, (v+4)>>3` mapping exactly (verified by hand-trace against all 5 pinned test cases); collision resolves once per frame at `oldV+1`, gated by `isMushroom`. "OBSTAC grid-cell mapping" (2), "mushroom collision resolves+scores" (4), "moving shot never tunnels" (2), "determinism" (2) all green.
- AC-4 (device-agnostic core contract; mouse + keyboard shells): `InputCounts` lives in `core/player.ts`, shell adapters import it: mouse aggregates/drains pointer-lock deltas, keyboard synthesizes a level at `KEY_COUNT`=`TBLMT_LIMIT`=8; both converge to the same `movePlayer` result through the one TBLMT clamp. `input.test.ts` (12 tests) green, incl. the source-text guard that `core/player.ts` names no device token.

**Commits:**
- `8210201` — `feat(cp1-5): player gun + slot-14 single shot — GREEN` (branch `feat/cp1-5-player-single-shot`, pushed to origin)

**Branch:** `feat/cp1-5-player-single-shot` (pushed, tracking `origin/feat/cp1-5-player-single-shot`)

**Handoff:** To Reviewer

## Delivery Findings

### Dev (implementation)
- **Gap** (blocking, resolved in-phase): `tests/player.test.ts` had 3 module-scope consts (`TBLMT_LIMIT`, `CELL_PX`, `OBSTAC_H_BASE`, lines 61/66/67) declared but never referenced as bare identifiers — only via `p.X` module-property access — which trips `tsc`'s `noUnusedLocals` (TS6133) and permanently blocks `npm run build`/`npm run lint` regardless of `src/` implementation. Confirmed pre-existing at the RED commit (`61b30bd`) via `git stash` before any GREEN code was written. Fixed by deleting the 3 dead lines (no assertion touched); logged as a Design Deviation below rather than silently patched. *Found by Dev during implementation; verify at review that the diff is exactly the 3-line deletion.*

## Design Deviations

### Dev (implementation)
- **Removed 3 unused module-scope consts from `tests/player.test.ts`:** Spec (RED commit `61b30bd`) declared `TBLMT_LIMIT`/`CELL_PX`/`OBSTAC_H_BASE` at module scope as "self-checking" mirrors of the ROM constants, but every assertion actually compares against the module's own `p.TBLMT_LIMIT`/`p.CELL_PX`/`p.OBSTAC_H_BASE`, never the bare local. Under `tsconfig.json`'s `noUnusedLocals: true` this is a hard `tsc` error (TS6133) that blocks `build`/`lint` unconditionally — verified pre-existing at RED via `git stash` (stashed the new `src/` files, re-ran `tsc --noEmit`, same 3 errors appeared with `src/core/player.ts`/`src/shell/input.ts` absent). Reason: a dead-code compile error in a test file isn't a test-authoring judgment call to preserve — it can't be "genuinely wrong" or "genuinely right," it's just inert code tripping a strict compiler flag with zero assertion impact. Deleted the 3 declaration lines only; no `expect(...)` changed.

## Subagent Results

| Subagent | Received | Result |
|----------|----------|--------|
| `testing-runner` (independent preflight) | Yes | **PASS** — 172/172 tests green (8 files); `npm run build` clean (`tsc --noEmit && vite build`); `npm run lint` clean; citations **118/118** byte-verified. Independently reproduced (my own `check-citations.mjs` run = 118 verified). |
| `reviewer-preflight` | Disabled | Skipped (peloton config). Compensated inline: independent ROM re-open (MOVE/TBLMT/SHOOT/OBSTAC/MUSHDC + CENDE4 equates), citation CLI re-run, device-token grep, merge-safety + sibling-race check. |
| `reviewer-edge-hunter` | Yes | 10 findings. #1 ("high-confidence bug", frac-at-wall reversal cancel) **DISMISSED** — traced identical in the 6502, faithful sub-pixel emulation. #2/#3/#4/#5/#6 (NaN propagation, unvalidated `obstacleCell`/offset) CONFIRMED but **unreachable in the `movePlayer→stepShot` pipeline** (gun clamped) — LOW defense-in-depth. #7/#8 (stuck fire/keys on focus loss) + #9/#10 (no listener dispose) CONFIRMED — non-blocking shell-robustness → Delivery Finding. |
| `reviewer-test-analyzer` | Yes | 13 findings, all **coverage gaps, zero code defects**. Underlying code independently ROM-verified byte-correct on every point. #1-4 (horizontal-sign unpinned) CONFIRMED + elevated to a Delivery Finding; #5/#7/#9 (rows 9-30 collision, 2-mushroom score, upper-band MUSHDC negative) CONFIRMED as cheap follow-ups; remainder LOW. |
| `reviewer-silent-failure-hunter` | Disabled | Skipped (peloton config). Assessed inline: pure functions, no try/catch/fallbacks. One silent-miss path (`isMushroom(undefined)` on an out-of-range offset) found via edge-hunter #4 — unreachable in-pipeline, logged LOW. |
| `reviewer-comment-analyzer` | Disabled | Skipped. Module headers + JSDoc reviewed inline against the re-opened ROM; radix/PS-* citations byte-verified by the gate; no stale-comment divergence found. |
| `reviewer-type-design` | Disabled | Skipped. `Player`/`Shot`/`InputCounts` reviewed inline; structural types, no bounds-invariant enforcement (edge-hunter #3/#4) — accepted, unreachable in-pipeline; `EventTarget` global-shadow logged LOW. |
| `reviewer-security` | Disabled | Skipped. Pure sim + duck-typed input adapters, no I/O / auth / secrets / network surface — nothing to attack. |
| `reviewer-simplifier` | Disabled | Skipped. 188+93-line modules, no over-engineering; exported constants are deliberate AC-1 transcription surface. |

**All received:** Yes (3 enabled subagents returned — `testing-runner`/`reviewer-edge-hunter`/`reviewer-test-analyzer`; 6 specialists disabled via peloton config, domains self-assessed inline). The load-bearing adversarial work is ROM re-verification, done inline by re-opening CENTI4.MAC/CENDE4.MAC; peloton pane budget also argues against a wide fan-out for a 5-pt story.

**Edge-hunter #1 dismissal (the load-bearing call):** the claim was that `movePlayer` at a wall lets a stale half-pixel carry cancel a same-magnitude reversal input (`movePlayer(movePlayer({h:242},7),-1)` ⇒ h stays 244). I re-traced the exact scenario through the 6502: `ADC PLAYHL / STA PLAYHL` (CENTI4.MAC:1493-4) banks the fine accumulator *before* the edge clamp (`STA PLAYH`:1516) and never resets `PLAYHL` at the wall. Frame 1: TB=7 → TBLMT Y=3/LSB=0x80 → PLAYHL=0x80, PLAYH 245→clamp 244. Frame 2: TB=-1 → TBLMT Y=0xFF/LSB=0x80 → PLAYHL 0x80+0x80=0x100 (carry), PLAYH = 244 + (-1) + carry(1) = 244. The ROM yields **244, identical to the sim**. This is correct sub-pixel accumulator behavior (two half-pixels per pixel), faithfully emulated — not a defect.

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** device event (`movementX` / held key) → shell `sample()` → `InputCounts{dh,dv,fire}` → `movePlayer` (ONE TBLMT clamp ±8 → signed floor-÷2 → half-pixel bank into `hFrac`/`vFrac` → bounds clamp) → `Player{h,v}` → `stepShot(shot,player,field,fire)` → `obstacleCell` probe at `v+1` → `isMushroom` gate → `damageMushroom` → field mutation + `scored`. **Safe because:** every count passes the single TBLMT clamp; the gun is always bounds-clamped (`[0x0B,0xF4]`×`[0x08,0x30]`) *before* `stepShot` indexes the grid, so the flat offset stays in `[0,958] < cells.length`; collision is gated by `isMushroom` (cp1-4 carry-forward — `damageMushroom` doesn't self-guard); score is single-sourced from `damageMushroom`'s return (no double-count with playfield scoring).

**Independent ROM verification (re-opened CENTI4.MAC / CENDE4.MAC myself, byte-faithful):**
- MOVE bottom-zone rectangle: H `[0x0B,0xF4]` (1505/1510), V `[0x08,0x30]` upright (1538/1549→1551); the 0xF1/0xC8/0x80 vertical ladder rungs are cocktail/flipped-player boundaries — unreachable for a player-1 candidate (PLAYV∈[8,0x30], move∈[-4,4] ⇒ candidate∈[4,0x34]). Reduction to `[0x08,0x30]` is faithful.
- TBLMT (2519-2531): clamp unsigned to ±8 then `CMP I,80 / ROR` = **arithmetic (sign-preserving) floor-÷2**, LSB carry = odd bit. Verified all cases incl. negatives: `applyTblmt(-7)={-4,0x80}`, `(-1)={-1,0x80}`, `(-8)={-4,0}`. `Math.floor(clamped/2)` matches (floor-toward-−∞, NOT truncate).
- SHOOT (2102-2169): off-top `CMP I,0F3 / BCS` on pre-advance SHOTV (2108); at-rest gate `PLAYV+4 == SHOTV` else `BNE 102$` (in-flight skips fire — ignored, not queued); +7 advance (2137-2142); probe at old SHOTV+1 (2143-2149); ANY non-empty stamp re-arms (105$ `BCC 108$`→20$), mushroom decrements, MUSHDC only on destroy.
- OBSTAC (1701-1734): `vcell=(V>>3)+bit2(V)` ≡ `(V+4)>>3` round-half-up; `hcol=((0xF7-H)&0xF8)>>3` ≡ `(0xF7-H)>>3`; base `LDA I,1`«2 = 0x400, stride 0x20. The right-edge wrap (1727-1732) never fires for legal cells (col 29 low byte 0xA0..0xBF < 0xC0). Matches cp1-4 addressing.
- MUSHDC (1601-1613): `AND I,1F` (row) then `CMP I,0C / BCS 10$` — decrements the court count only for row < 0x0C. Sim's `cell.v < MUSH_LOWER_BOUND(0x0C)` is byte-exact.
- CENDE4 equates: SHOTH/V=MOBJ+14 (slot 14, one shot), PLAYH/V=MOBJ+15 (gun), FIRE=0xC01 D2 active-low. ✓

**Auto-repeat-fire ruling (independently confirmed):** TEA's Delivery Finding is CORRECT. SHOOT reads `FIRE` every frame the shot is at rest with **no edge latch / no previous-state RAM** — the "SWITCH JUST PUSHED" comments (2126/2130) are misleading; the code is purely level-triggered (`AND I,04 / BEQ`). The single-shot cap comes solely from the at-rest gate (PS-11), so holding fire streams a new shot the frame after each re-arm. This IS rev-4 behavior; `stepShot`'s `!live && fire → launch` models it faithfully. One-shot-per-press would be a deliberate divergence, correctly NOT taken.

**Observations (≥5):**
1. `[VERIFIED GOOD]` TBLMT signed floor-÷2 + half-pixel carry byte-exact vs 6502 `CMP I,80 / ROR` — `src/core/player.ts:applyTblmt` (CENTI4.MAC:2519-2531).
2. `[VERIFIED GOOD]` `live` boolean provably equivalent to ROM's `SHOTV==PLAYV+4` rest test: the shot (+7/fr) always outclimbs the gun (max +4/fr) from a launch gap of 7, so a live shot's v never re-coincides with `player.v+4` — `src/core/player.ts:stepShot`.
3. `[CONFIRMED / dismissed]` Edge-hunter #1 (frac-at-wall reversal cancel) is faithful ROM emulation, not a bug — 6502 trace matches the sim's 244→244 exactly (`ADC PLAYHL` banks before the edge clamp; PLAYHL not reset at the wall).
4. `[MEDIUM]` Horizontal device→dh sign is never tied to an on-screen direction (test-analyzer #1-4). Vertical got the COMP analysis + a pinned `ArrowUp=+dv` test; horizontal has only a magnitude-only `Math.abs` check. `+dh` moves toward `PLAYH_MAX=0xF4` (the ROM's LEFT edge) — faithful to PLAYH, but whether mouse-right *should* map to `+dh` is a convention the renderer must settle. Latent integration trap; non-blocking (no AC, no renderer, core faithful) — `src/shell/input.ts:38`.
5. `[LOW]` Shell input has no blur/focus-loss/pointer-lock-exit handling (edge-hunter #7/#8): a missed keyup/mouseup on alt-tab leaves fire/direction stuck. Real UX gap, but no runtime window-wiring exists yet (adapters take a duck-typed target; real wiring is a later story). Non-blocking → Delivery Finding.
6. `[LOW]` NaN robustness (edge-hunter #2/#5/#6): a malformed-event NaN `movementX` slips past `?? 0` (nullish only) → `dh=NaN` → `movePlayer` clamp can't catch NaN → permanent `player.h=NaN`. Unreachable via real pointer-lock events; optional `Number.isFinite` hardening. Non-blocking.
7. `[LOW]` `obstacleCell`/offset unvalidated (edge-hunter #3/#4) but unreachable in the `movePlayer→stepShot` pipeline (gun clamped; max `cell.v=30`, in range) — the edge-hunter concurs. Defense-in-depth only. Non-blocking.
8. `[VERIFIED GOOD]` The 3-line test edit is exactly the removal of dead consts `TBLMT_LIMIT`/`CELL_PX`/`OBSTAC_H_BASE`, present at RED `61b30bd`, no assertion touched; remaining 8 consts all still referenced; `noUnusedLocals` green.
9. `[LOW]` `interface EventTarget` (input.ts:22) shadows the global DOM `EventTarget`; rename to `EventTargetLike`. Cosmetic, compiles clean.

**Rule Compliance (lang-review/typescript.md):**
| Rule | Status | Notes |
|---|---|---|
| `strict` + `noUnusedLocals` | ✓ | tsconfig `strict:true`, `noUnusedLocals:true`; build + lint green |
| No `any` type | ✓ | none; the `any` at input.ts:75 is a helper *function* name (value), not the type |
| Core purity (no device globals) | ✓ | grep clean; purity.test.ts (comment-stripped scan) + input.test.ts source-guard green |
| Core→shell boundary one-way | ✓ | `core/player.ts` imports only `./playfield`; no shell import |
| Determinism / pure functions | ✓ | `movePlayer` returns fresh `Player`; `stepShot` mutates the passed field by contract; determinism tests green |
| Type invariants / newtypes | △ | `Player`/`Shot`/`InputCounts` are structural; no bounds-invariant enforcement (edge-hunter #3/#4) — accepted, unreachable in-pipeline |
| Global shadowing | △ | `interface EventTarget` shadows DOM global (LOW, obs. 9) |

**Devil's Advocate (assumed subtle breakage — all checked):**
- Half-pixel sign: `-7` then `-7` travels exactly −7px (frame1 −4, frame2 −3 via carry). Byte-faithful. ✓
- 0xF7 mirror / h-inversion: `hcol=(0xF7-h)>>3` matches OBSTAC `AND 0xF8`»3; handedness matches ROM. Cross-check vs cp1-4 seed layout deferred to the renderer story (none yet). ✓
- Fire edge on the frame the shot frees: `stepShot` returns exactly one `Shot`; no double-launch path exists (relaunch-on-next-frame is untested but correct — test gap, not code bug). ✓
- Clamp order vs carry bank: sim clamps AFTER move+carry (matches `ADC PLAYH`→`CMP I,0F4`); frac banked before clamp (matches `STA PLAYHL` before clamp). ✓
- InputCounts overflow on a laggy frame: JS-number `dh`, `Math.min/max` → `[-8,8]`; no 8-bit wrap; a 10000-count flick → +4px. More robust than the ROM's 8-bit TB, no fidelity concern (physical trackball never exceeds). ✓

**Deviation audit:**
- TEA — Vertical COMP folded into shell sign convention: **✓ ACCEPTED.** COMP-then-TBLMT is magnitude-identical to TBLMT-of-negated-input (TBLMT sign-symmetric, verified); keeps core orientation-free (AC-4). *Note:* the horizontal axis got no equivalent analysis (see obs. 4).
- TEA — Non-mushroom stamp collision reduced to "keep flying": **✓ ACCEPTED w/ forward flag.** ROM re-arms on ANY non-empty stamp (105$ `BCC 108$`, verified); sim flies through non-mushrooms. Faithful *only while* the playfield holds `{0}∪[0x38,0x3F]` (cp1-4 domain; `isMushroom` masks `&0x3F`). If a future story stamps non-mushroom playfield codes, the shot's fly-through diverges from the ROM's re-arm — flagged non-blocking.
- TEA — Fire as boolean not active-low D2: **✓ ACCEPTED.** Shell owns active-low; core device-agnostic (AC-4).
- Dev — Removed 3 unused test consts: **✓ ACCEPTED.** RED→HEAD diff is exactly the 3 dead-const deletions, no assertion changed, pre-existing at `61b30bd`, tripped TS6133/`noUnusedLocals`. Correct call.
- TEA Delivery Finding — gun doesn't block on mushrooms (movePlayer bounds-only): **✓ ACCEPTED deferral.** ROM's MOVE does `JSR OBSTAC / BNE 5$` (1503/1536) to keep old position on an obstacle; sim omits it. Non-AC, deferred to player-polish; overlaps enemy-collision (cp2/cp3).
- TEA Delivery Finding — auto-repeat fire: **✓ CONFIRMED faithful** (see ruling above).

**Merge safety:** `origin/develop` still at `721f8c1` (base, unchanged since setup) — clean fast-forward-able; no trial-merge needed. Only `origin/feat/cp1-5-player-single-shot` carries cp1-5 (no sibling race). No open cp1-5 PR (SM opens at finish). Working tree clean (read-only review).

**Handoff:** To SM for finish-story. No blocking items. Two non-blocking Delivery Findings routed downstream (shell-integration robustness; horizontal-sign + renderer column layout).

### Reviewer (code review)
- **Improvement** (non-blocking): shell input adapters (`src/shell/input.ts`) have no blur / focus-loss / pointer-lock-exit handling — a missed keyup/mouseup (alt-tab while holding fire or a direction) leaves the key/button stuck, driving continuous autofire/movement with no recovery. Add a `blur`/`visibilitychange` clear (and consider a `dispose()` on `InputAdapter`, since listeners are currently unremovable and stack on re-creation). Affects the shell-integration story that wires these adapters to the real window. *Found by Reviewer (via edge-hunter #7/#8/#9/#10) during code review.*
- **Question** (non-blocking): the horizontal device→`dh` sign is unpinned against on-screen direction — `+dh` moves the gun toward `PLAYH_MAX=0xF4`, which the ROM calls the LEFT edge (ROT270, screen-reversed). The vertical axis has an explicit sign convention + test; the horizontal has only a magnitude test. When the renderer lands, confirm rolling right / ArrowRight moves the gun right on screen and reconcile with the `(0xF7-h)>>3` column layout — the mouse/keyboard `dh` sign may need inverting, or the renderer's column mapping must account for it. Affects the render story. *Found by Reviewer (corroborated by test-analyzer #1-4) during code review.*
- **Gap** (non-blocking): no collision test destroys a placed mushroom above row 8 (shot climbs to ~row 30), no upper-screen MUSHDC-negative case, and no absolute score pin on the two-mushroom determinism run — the underlying arithmetic is ROM-verified here, but a future regression in the row-9..30 path or the upper-band `field.mush` guard would escape the current suite. Cheap follow-up tests. *Found by Reviewer (via test-analyzer #5/#7/#9) during code review.*