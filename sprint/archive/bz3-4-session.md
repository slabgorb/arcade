---
story_id: "bz3-4"
jira_key: "bz3-4"
epic: "bz3"
workflow: "tdd"
---
# Story bz3-4: PER-TYPE COLLISION TABLES — the clone reuses one circle where the ROM has distinct proximity tables

## Story Details
- **ID:** bz3-4
- **Jira Key:** bz3-4
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** setup
**Phase Started:** 2026-07-18T02:20:47Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-18T02:20:47Z | - | - |

## Story Description

### Technical Approach

**Cluster C4** — Per-Type Collision Tables (bz3-4 subsumes F-006, F-007)

The refuter confirmed F-005/006/007 are one architectural pattern: the clone flattens the ROM's per-type proximity tables to a single reused Euclidean tank-circle.

**F-005** (shell-vs-tank view-space range+bearing cone) is ruled ACCEPT under the planar-sim descope and is NOT in this story.

**Tank-vs-obstacle (F-006):** The ROM uses per-type PROXTB radii (832/832/1024/960, i.e. `.WORD 340/340/400/3C0` hex) where the clone sums two radii (~1876-2283), so obstacles block from ~2x too far.

**Shell-vs-obstacle (F-007):** The ROM uses a distinct, smaller table PRXTBL (56/88/86, trailing-period decimals inside the hex block) with a `>>2` range shift the clone omits, approximating it with the big tank-footprint radius.

Primary source citations: PROXTB and PRXTBL live in the BZ `.MAC` source (`~/Projects/battlezone-source-text` — CRLF sibling `~/Projects/battlezone-source` is NOT citable). Note the radix carefully (some tables are hex `.WORD`, PRXTBL uses trailing-period decimals inside a hex block).

Audit findings live in `battlezone/docs/audit/findings/` (F-006/F-007 likely `pair-combat.json`). The RED phase must pull each finding's exact claim and keep the citation gate green.

**Depends on:** bz3-1 (units) — DONE.

### Acceptance Criteria

1. **Tank-vs-obstacle collision** uses the per-type PROXTB radii (832/832/1024/960) rather than the summed-radii approximation.

2. **Shell-vs-obstacle collision** uses the distinct PRXTBL table (56/88/86) with the ROM's `>>2` range scaling, not the tank-footprint radius.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Correction** (non-blocking): F-006's *title* lists three PROXTB values ("832/1024/960") but the table has FOUR per-type entries — **832 appears twice** (narrow-pyramid `$00` AND tall-box `$01`, both `PROXTB word $340`). The finding's claim body and AC-1 correctly say 832/832/1024/960; only the title abbreviates. Verified per-type mapping (type code = word index): narrow `$00`→832, tall `$01`→832, wide `$0c`→1024 (`$400`), short `$0f`→960 (`$3C0`) — BZONE.MAC:3690/3694, indexed by `OBJOBJ` ASL at :3632-3634. No JSON change needed.
- **Gap/Correction** (non-blocking, but drives GREEN): F-007 and AC-2 name only the three NON-ZERO PRXTBL bytes ("56/88/86"). The full ROM table has a **fourth indexed slot — short-box (`$0f` → byte index 15) = 0** (BZONE.MAC:2514 `.BYTE 86.,0,0,0`). So the ROM **never stops a shell with a short box**, while it DOES block a tank there (PROXTB[15]=`$3C0`=960). A faithful GREEN must set short-box shell radius = 0 (transparent). Tests pin this. *Found by TEA during test design.*
- **Conflict** (blocking for GREEN): the faithful short-box=0 shell behavior conflicts with the existing assertion `shellBlocked is true at every obstacle centre` (`tests/core/firing.test.ts:278-285`). Once short-box shell radius = 0, the 5 short-box obstacles (#1,#3,#9,#13,#17) no longer block a shell at their centre → that test breaks. Dev must update it in GREEN to exempt short-boxes. (ROM compare is *inclusive* — `PRXTBL >= dist>>2`, so `0>=0` collides at the EXACT centre only; the clone's strict `<` gives not-blocked even at centre. Dev picks the operator.) *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (blocking, found+fixed): `tests/core/enemies-respawn-fairness.test.ts`'s Group B ("reload — a barrier-wedged tank") staged its wedged-tank scenario against `OBSTACLES[1]`, which is a **short-box** — the exact type whose PRXTBL is now 0. Once short-box shells stopped blocking, `shellBlocked(BARRIER.x, 0)` flipped to `false` and the whole reload scenario (which depends on the barrier absorbing the wedged tank's own shots) went invalid. Neither TEA's guidance nor the story's "watch these" list flagged this file. Fixed by moving `BARRIER` to `OBSTACLES[2]` (a wide-pyramid at (-32768, 0), PRXTBL=86→344, still isolated — nearest neighbour ~10690 units) and re-deriving `WEDGE_X` from the exported `PROXTB[type]` (generalized with `Math.sign(BARRIER.x)` since the new barrier sits on the -x axis, not +x). Verified numerically (nearest-neighbour + distance-to-every-obstacle) before editing, not just by re-running the suite. *Found and fixed by Dev during GREEN implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): `tests/core/collision-tables.test.ts` hand-transcribes its own `PROXTB`/`PRXTBL_RAW`/`SHELL_EFF` tables from the same BZONE.MAC lines that `movement.ts`/`firing.ts` transcribe, and `firing.ts`'s `PRXTBL_EFF` is **unexported**, so the test can only pin *behaviour* against its own copy of the numbers — a future edit that reintroduces the same transcription slip in both the source and this test in one pass would go green. Not a live defect (values verified correct against `~/Projects/battlezone-source-text/BZONE.MAC:3690/3694 + 2510/2514` independently, twice). Affects `battlezone/src/core/firing.ts` (export `PRXTBL_EFF`, or a raw `PRXTBL` byte table, so the test can assert numeric equality against production's own constant, not just a duplicate). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the ROM's tank-vs-obstacle proximity is a **circle** (`PROXTB[type]`), and for the wide-pyramid PROXTB=1024 sits *inside* the model's own rendered corner (base half-extent 800 → corner 800·√2 ≈ 1131, `models.ts:105-109`), so a wide-pyramid's wireframe corners poke ~107 units past its collision circle (the other three types enclose their footprints: +108/+108/+55). This is a faithful consequence of bz3-4 — both PROXTB (BZONE.MAC:3694) and the ±800 base (byte-exact, bz1-2) are independently ROM-sourced, and the real machine's circular proximity check likewise never matched its wireframe corners. Recording only for awareness: a future *game-feel* story could add an oriented-square footprint test, but that would be a deliberate **non-ROM** deviation, the opposite of a fidelity fix. Affects `battlezone/src/core/movement.ts` (no change required for bz3-4). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **short-box shell radius pinned to 0 (transparent), beyond AC-2's literal "56/88/86":** AC-2 lists only the three non-zero PRXTBL bytes. The tests additionally pin short-box (`PRXTBL[15]=0`) as shell-transparent. Reason: the ROM table is per-type with four slots; leaving short-box on the flattened tank-footprint would half-fix the very bug the story targets. Faithful to BZONE.MAC:2514.
- **Boundary probes over exact-radius equality:** each per-type value is pinned with a `radius-1` (blocked) / `radius+1` (clear) pair rather than testing the exact boundary, to stay unambiguous across the ROM's inclusive (`>=`) vs the clone's strict (`<`) comparison. short-box shells are probed at d≥50 (never d=0) to avoid the degenerate exact-centre case.

### Dev (implementation)
- **Comparison operator: kept strict `<` (not the ROM's inclusive `>=`), for both `isBlocked` and `shellBlocked`.** The story left this as a Dev judgment call. Chose consistency with the codebase's existing convention (both predicates already used strict `<` pre-fix; `dx*dx+dz*dz < r*r`) over exactly mirroring the ROM's inclusive compare. Consequence: at the *exact* centre of a short-box (`dist=0`, `PRXTBL_EFF=0`), `0 < 0` is `false`, so `shellBlocked` reports not-blocked even at dead centre (the ROM's `0>=0` would report a hit only at that single point). This is why `tests/core/firing.test.ts:278-285` needed updating to exempt short-boxes rather than staying green unmodified — flagged as mandatory by TEA regardless of operator choice, and confirmed here: the inclusive alternative would have made that one assertion pass unmodified at the exact centre, but every other AC-2 boundary probe (`eff-1`/`eff+1`) behaves identically under either operator, so there was no forcing function to switch away from the codebase's existing strict-`<` convention.
- **`OBSTACLE_RADIUS` removed as dead code; `PLAYER_RADIUS` retained.** Grepped all of `src/` and `tests/` after the fix: `OBSTACLE_RADIUS` had zero remaining consumers (movement.ts's own definition was the last one); `PLAYER_RADIUS` is still live in `enemies.ts` (tank-hit-radius, player-hit checks) and several test files unrelated to obstacle collision. Removing `OBSTACLE_RADIUS` shifted line numbers again — re-ran `tools/audit/reanchor-citations.mjs --write` a final time and re-applied the 4-space JSON indent (the tool always writes 2-space; the findings files are checked in at 4-space, so every `--write` pass needs a follow-up re-indent to keep the diff minimal — same gotcha as bz3-1).
- **`PROXTB` exported from `movement.ts` (was going to be file-private).** Needed once `enemies-respawn-fairness.test.ts`'s Group B fix (see Delivery Findings) required the real per-type tank-block threshold instead of the old `PLAYER_RADIUS + OBSTACLE_RADIUS` sum it could no longer use.

### Reviewer (audit)
- **short-box shell radius = 0 (TEA):** ACCEPTED — faithful to BZONE.MAC:2514 (`PRXTBL byte[15]=0`); independently re-verified in the assembler. The `.WORD`/`.BYTE` radices and the type-code→index mapping check out.
- **Boundary probes over exact-radius equality (TEA):** ACCEPTED — sound test design; deliberately unambiguous across the ROM's inclusive `>=` vs the clone's strict `<`.
- **Strict `<` kept, not the ROM's inclusive `>=` (Dev):** ACCEPTED — measure-zero in the continuous planar sim. Even accounting for the ROM's `dist>>2` truncation vs the clone's pre-scaled `PRXTBL<<2`, the boundary disagreement is a ≤~4-unit annular band (and 0-3 units at a short-box's dead centre) that discrete multi-unit shell substeps effectively never land on. Consistent with the codebase's existing convention; well-documented.
- **`OBSTACLE_RADIUS` removed / `PLAYER_RADIUS` kept (Dev):** ACCEPTED — independently grepped: `OBSTACLE_RADIUS` has zero code consumers left (only two doc-comment mentions), `PLAYER_RADIUS` still live in `enemies.ts`/`saucer.ts`.
- **`PROXTB` exported (Dev):** ACCEPTED — minimal, justified; needed by the respawn-fairness fixture.
- **Barrier swap in `enemies-respawn-fairness.test.ts` (Dev, undocumented as a *deviation* but fully documented as a Delivery Finding):** ACCEPTED — the swap was genuinely forced (short-box PRXTBL=0 makes the old `OBSTACLES[1]` barrier no longer block shells), it still guards the original intent (≤8 muzzle flashes over 2s = reload cadence; a broken reload would produce ~40), and `WEDGE_X`'s `Math.sign(BARRIER.x)` generalization is correct for the new -x-axis obstacle. Would have been cleaner as a Design Deviation entry too, but the rationale is fully captured.

## Session Status

- **Branch:** feat/bz3-4-per-type-collision-tables
- **Repo:** battlezone
- **Branch Strategy:** gitflow (feat/{STORY_ID}-{SLUG})

## Sm Assessment

**Setup:** Session, story context, epic context, and feature branch created. Story bz3-4 is ready for TEA RED phase.

**Routing:** tdd (phased) → **O'Brien (TEA)** for the RED phase.

**Guidance for TEA:**
- The audit findings F-006 (tank-vs-obstacle) and F-007 (shell-vs-obstacle) are found in `battlezone/docs/audit/findings/pair-combat.json` (or related audit files).
- Pull each finding's exact claim text and keep `npm test -- citations` green.
- **F-006 Tank-vs-obstacle:** The ROM's per-type PROXTB radii are (832/832/1024/960); currently the clone sums two radii (~1876-2283), blocking from ~2x too far. Write tests that pin the four distinct per-type values.
- **F-007 Shell-vs-obstacle:** The ROM's distinct PRXTBL table is (56/88/86) with a `>>2` range shift. Currently the clone approximates with the tank-footprint radius. Write tests that pin the distinct shell collision table and the range scaling.
- The timebase (bz3-1) is SHIPPED and should be live on origin/develop; the per-type radius values should be interpreted at the 15.625 Hz game frame.
- `npm test -- citations` must stay green (AC-2 implicit).

**Decision:** Proceed to RED. Hand off to O'Brien.

## TEA Assessment

**Tests Required:** Yes
**Status:** RED (11 assertions failing for the right reason — ready for Dev)

**Test File:**
- `tests/core/collision-tables.test.ts` — pins per-type PROXTB (tank) and PRXTBL+`>>2` (shell) collision thresholds against the public predicates `movement.isBlocked` / `firing.shellBlocked`. 15 tests: 4 isolation preconditions PASS, 11 table assertions FAIL (clone still uses the one flattened tank-footprint circle).

**Tests Written:** 15 (11 failing) covering AC-1 (F-006) and AC-2 (F-007).

**RED proof** (`npx vitest run tests/core/collision-tables.test.ts` → 11 failed | 4 passed):
- Tank (AC-1): each type is CLEAR just outside its PROXTB radius but the clone still blocks — e.g. `tank must be CLEAR at 833 > PROXTB 832 (clone still blocks ~1876): expected true to be false`; `...1025 > 1024 (~2283)`; `...961 > 960`. Plus "2x-too-far block gone at 1500" and "four PROXTB distinct" both RED.
- Shell (AC-2): each type PASSES just beyond `PRXTBL<<2` but the clone still stops it — `shell must PASS at 225 > 224 (clone stops at tank footprint): expected true to be false`; `353 > 352`; `345 > 344`. short-box "TRANSPARENT to shells" and "distinct smaller table" both RED.
- Every failure is `expected false, received true` = current code blocks/stops too far. No import/undefined failures — the predicates exist; they fail on the VALUE.
- `npx tsc --noEmit` → exit 0. `npm test -- citations` → 12 passed (GREEN). Working tree clean; committed as `4941c8e`.

**Verified ROM citations** (`~/Projects/battlezone-source-text/BZONE.MAC`, `.RADIX 16`):
- PROXTB (tank): `:3690 .WORD 340,340` → word[0]=832 (narrow `$00`), word[1]=832 (tall `$01`); `:3694 .WORD 400,0,0,3C0` → word[12]=1024 (wide `$0c`), word[15]=960 (short `$0f`). Indexed by object type code (`OBJOBJ` ASL at :3632-3634); raw centre distance vs PROXTB[type] at :3652-3656 — **no player-radius add** (the ROM's 3/4-radius pre-add at :3637-3648 is ROBOT-only, out of scope).
- PRXTBL (shell): `:2510 .BYTE 56.,88.` → byte[0]=56 (narrow), byte[1]=88 (tall); `:2514 .BYTE 86.,0,0,0` → byte[12]=86 (wide), byte[15]=0 (short). Byte-indexed by type code (:2432-2433). Range shifted `>>2` at :2420-2428, compared `PRXTBL >= dist>>2` at :2435-2436 → **effective radius = PRXTBL[type] << 2** (224/352/344/0).
- Type code → ObstacleType: `src/core/obstacles.ts:30-31` ($00 narrow, $01 tall, $0c wide, $0f short). Both ROM tables index by this same code.

**Finding corrections:** see Delivery Findings — F-006 title drops the duplicate 832 (claim/AC correct); F-007/AC-2 "56/88/86" omits the fourth slot short-box=0 (shells pass through short boxes). No findings-JSON edit needed for RED; citation gate green.

### GREEN guidance for Dev

1. **Tank — `src/core/movement.ts` `isBlocked` (line 95-103):** replace the summed-radii `block = PLAYER_RADIUS + OBSTACLE_RADIUS[o.type]` (line 97) with a per-type PROXTB threshold on **raw centre distance**: `d² < PROXTB[o.type]²`, `PROXTB = { 'narrow-pyramid':832, 'tall-box':832, 'wide-pyramid':1024, 'short-box':960 }`. Drop the `PLAYER_RADIUS` add entirely — PROXTB is already the pre-combined per-type threshold. Keep the planar Euclidean `d²` test. Add the table as a cited constant (BZONE.MAC:3690/3694).
2. **Shell — `src/core/firing.ts` `shellBlocked` (line 93-101):** replace `r = OBSTACLE_RADIUS[o.type]` (line 95) with the PRXTBL effective radius = `raw << 2`: `{ 'narrow-pyramid':224, 'tall-box':352, 'wide-pyramid':344, 'short-box':0 }`. Storing the raw bytes 56/88/86/0 and shifting, or storing the pre-scaled 224/352/344/0, are behavior-identical — the tests accept either. **short-box = 0 → shells pass through short boxes.** Cite BZONE.MAC:2510/2514 + the `>>2` at :2420-2428.
3. **Dead constants:** `OBSTACLE_RADIUS` (movement.ts:84-89) and its re-import in firing.ts:36 likely go dead once both predicates stop using it; `PLAYER_RADIUS` (movement.ts:73) is no longer part of obstacle blocking. `grep -rn "OBSTACLE_RADIUS\|PLAYER_RADIUS" src/` before removing — confirm no enemy/saucer consumer.
4. **Existing test to update (blocking):** `tests/core/firing.test.ts:278-285` asserts `shellBlocked` true at EVERY obstacle centre — breaks for the 5 short-boxes (#1,#3,#9,#13,#17) at short-box=0. Update it to exempt short-boxes (shells pass through). `movement.test.ts:218-225` (tank centres) stays valid — all PROXTB entries are non-zero.
5. **Citation gate after the fix:** editing movement.ts:97 and firing.ts:95 SHIFTS the lines that `F-006.ours`/`F-007.ours` quote verbatim. These divergences are being REMOVED, so set `remediated_by: "bz3-4"` on F-006/F-007 — but a remediated **DIVERGENCE must KEEP its historical `ours` quote** (citations.test.ts: only `NO_COUNTERPART` may null it), so freeze the ORIGINAL quoted line, do not re-point it. Leave `source.*` (the .MAC side) untouched. Re-run `npm test -- citations`.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/movement.ts` — `isBlocked` now compares raw centre distance to per-type `PROXTB` (832/832/1024/960, exported); removed the `PLAYER_RADIUS + OBSTACLE_RADIUS` sum; removed `OBSTACLE_RADIUS` entirely (confirmed dead — no remaining `src/` consumer); `PLAYER_RADIUS` kept (still used by `enemies.ts`).
- `src/core/firing.ts` — `shellBlocked` now uses a new `PRXTBL_EFF` table (224/352/344/0, byte value `<<2`); dropped the `OBSTACLE_RADIUS` import (no longer used).
- `tests/core/firing.test.ts:278-292` — updated the pre-existing "blocked at every obstacle centre" test to exempt short-boxes (mandatory per TEA's flagged conflict).
- `tests/core/enemies-respawn-fairness.test.ts` — Group B's wedged-tank barrier moved from `OBSTACLES[1]` (short-box, now shell-transparent) to `OBSTACLES[2]` (wide-pyramid); `WEDGE_X` re-derived from the exported `PROXTB[type]` instead of the old `PLAYER_RADIUS + OBSTACLE_RADIUS` sum, generalized with `Math.sign(BARRIER.x)` for the new obstacle's -x-axis position. Unflagged downstream break — see Delivery Findings.
- `docs/audit/findings/pair-combat.json` — `F-006`/`F-007` marked `remediated_by: "bz3-4"`; `ours` quotes left frozen (historical) per the citation gate's contract for remediated DIVERGENCEs; `F-001`/`F-002`/`F-003`'s `ours.line` re-anchored (shifted by the edit, text unchanged).
- `docs/audit/findings/pair-tank-motion.json` — `M-004`/`M-005`/`M-006`/`M-007`/`M-008`/`M-010`'s `ours.line` re-anchored (all in `stepTank`, below the edited `isBlocked`/PROXTB block; text unchanged, `remediated_by` untouched).

**Tests:** 875/875 passing (GREEN, whole suite). Citations: 12/12. `tsc --noEmit`: clean. `npm run lint`: clean.
**Branch:** feat/bz3-4-per-type-collision-tables (pushed, commit `b4edee1`)

**Judgment calls for Reviewer:**
- Comparison operator kept strict `<` (see Design Deviations) rather than the ROM's inclusive `>=` — worth a second look given it changes exact-centre semantics for zero-radius entries.
- The `enemies-respawn-fairness.test.ts` fix (barrier obstacle swap) is a downstream consequence neither TEA nor the story's AC anticipated — verify the new obstacle #2 staging is sound (isolation, axis-generalized `WEDGE_X`/heading math) rather than just trusting the green run.
- `OBSTACLE_RADIUS` deletion — confirm no external/non-test consumer was missed (grepped `src/` and `tests/`; nothing in `docs/` or `sprint/` references it as code).

**Handoff:** To Reviewer.

**Handoff:** To Dev (Julia) for GREEN implementation.

## Reviewer Assessment

**Verdict:** APPROVED

**ROM fidelity — verified independently against `~/Projects/battlezone-source-text/BZONE.MAC` (`.RADIX 16`):**
- **PROXTB (tank, F-006):** BZONE.MAC:3690 `.WORD 340,340` → word[0]=word[1]=832; :3694 `.WORD 400,0,0,3C0` (after `.REPT 10.` zeros) → word[12]=1024, word[15]=960. Values in `movement.ts` correct. Type-code→**word** index verified from OBJOBJ (:3632 `LDA AY,PTBLO1` / :3633 `ASL` / :3634 `TAX` / :3652 `LDA AX,PROXTB`) — the ASL doubles the type code into a word offset. Mapping is **not transposed**: wide=$0c→word[12]=1024, short=$0f→word[15]=960. Compare is raw centre distance, no player-radius add (the 3/4-radius pre-add at :3637-3648 is R2D3-robot-only, `BIT R2D3FL/BPL`).
- **PRXTBL (shell, F-007):** BZONE.MAC:2510 `.BYTE 56.,88.` / :2514 `.BYTE 86.,0,0,0` — trailing-period **decimals** in the hex region → 56/88/86/0; `<<2` = 224/352/344/0, matching `firing.ts PRXTBL_EFF`. Type-code→**byte** index verified from COLCHK (:2432 `LDX AY,PTBLO1` / :2433 `LDA AX,PRXTBL`, no ASL) and the `>>2` range shift at :2420-2428, inclusive compare `PRXTBL >= dist>>2` at :2435-2436.
- **short-box asymmetry (crux):** faithful and citable — word[15]=960 blocks a TANK, byte[15]=0 makes short-box **transparent to shells**. Not an artifact.

**Operator choice (strict `<` vs ROM inclusive `>=`):** immaterial / measure-zero. The exact-boundary disagreement is a ≤~4-unit annular band (from `PRXTBL<<2` pre-scale vs the ROM's `dist>>2` truncation) and 0-3 units at a short-box's dead centre — points discrete multi-unit shell substeps effectively never land on. No observable fidelity gap. Accept.

**Barrier swap (`enemies-respawn-fairness.test.ts` Group B):** necessary and not neutered. Old `OBSTACLES[1]` is a short-box; once PRXTBL[short-box]=0, `shellBlocked(16384,0)` flips to false (verified: nearest other obstacle 2521 > 344, so nothing else blocks) — the "barrier blocks shots" premise genuinely breaks. Moved to `OBSTACLES[2]` (wide-pyramid, isolated at nn=10690). Still asserts ≤8 muzzle flashes/2s = reload cadence (a broken reload → ~40, confirmed by the test-analyzer). `WEDGE_X = BARRIER.x + sign(BARRIER.x)·(PROXTB+1)` correct for the -x axis. `firing.test.ts:278-291` short-box exemption is precisely scoped and *strengthened* (positively pins short-box centres as non-blocking).

**Dead code:** `OBSTACLE_RADIUS` fully removed (only two doc-comment mentions remain); `PLAYER_RADIUS` retained and live (`enemies.ts` TANK_HIT_RADIUS + player-hit; `saucer.ts`).

**Citation honesty:** `remediated_by: "bz3-4"` on F-006/F-007 **only**; their `ours` quotes are frozen at the historical (genuinely-removed) divergent text — `movement.ts` "PLAYER_RADIUS + OBSTACLE_RADIUS[o.type]" and `firing.ts` "OBSTACLE_RADIUS[o.type]" — per the gate's remediated-divergence contract; `source.*` untouched and matches the assembler. Re-anchors (F-001/2/3, M-004..M-010) verified against current file lines. Both divergences were actually removed → not a phantom remediation.

**Consumers traced end-to-end:** `isBlocked` (player hard-stop `movement.ts:126`, enemy `stepTank`, spawn-rejection `enemies.ts:398`) and `shellBlocked` (player shot `firing.ts:151`, enemy shell `enemies.ts:602`). The smaller PROXTB only shrinks the block/reject region → no penetration past PROXTB, spawn-rejection loop terminates faster. short-box `r=0` → `dist²<0` always false → no NaN/div-by-zero, no softlock or unreachable-fire (confirmed both by the edge-hunter and independently).

**Independent verification (my own runs):**
- `npx vitest run` → **875 passed (63 files), 0 failed**
- `npm test -- citations` → **12 passed, 0 failed**
- `npx tsc --noEmit` → **exit 0**
- Working tree clean (read-only review).

**Findings (all non-blocking — no Critical/High):**

| Severity | Issue | Location | Note |
|----------|-------|----------|------|
| [MEDIUM] | Test hand-transcribes the same tables the source does; `PRXTBL_EFF` unexported → test pins behaviour against its own copy of the numbers, not production's constant | `tests/core/collision-tables.test.ts:69-92` / `firing.ts:95` | Structural gap only; values verified correct twice. Suggest exporting `PRXTBL_EFF`. Not a defect. |
| [LOW] | Wide-pyramid collision circle (PROXTB 1024) sits ~107u inside its rendered corner (800·√2≈1131) | `movement.ts:85` / `models.ts:105-109` | ROM-faithful (circle-based ROM collision; both values independently ROM-sourced). Recorded for awareness; the suggested square-footprint "fix" would *reduce* fidelity. |
| [LOW] | `expect(Math.abs(WEDGE_X)).toBeGreaterThan(Math.abs(BARRIER.x))` is tautological by construction | `enemies-respawn-fairness.test.ts:149` | Pre-existing pattern, carried through the swap; direction-only check. |
| [LOW] | Muzzle-flash cap has no paired lower bound in its own test (0 flashes would also pass) | `enemies-respawn-fairness.test.ts:181` | Pre-existing; the sibling `everFired` test covers total-stoppage. |

**Verdict rationale:** Both ACs met and ROM-faithful, verified independently in the assembler (values, radices, and — critically — the non-transposed type-code→index mapping). The one HIGH-confidence subagent finding (wide-pyramid corner clip) is a faithful consequence of the ROM's circular collision, not a defect. All remaining findings are non-blocking structural/pre-existing test-strength notes. Tests, citations, and typecheck green on my own runs.

**Handoff:** To SM for finish-story.
