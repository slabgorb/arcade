---
story_id: "bz3-12"
jira_key: "bz3-12"
epic: "bz3"
workflow: "tdd"
---
# Story bz3-12: ENEMY TANK MODEL DETAIL — the rotating radar antenna and animated treads the clone omits

## Story Details
- **ID:** bz3-12
- **Jira Key:** bz3-12
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** setup
**Phase Started:** 2026-07-18T08:47:19Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-18T08:47:19Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Correction** (non-blocking): the story/critical-method note says "the 3D vector data is .RADIX 16 HEX". That is FALSE for this cluster. `BZMTNS.MAC:501` sets `.RADIX 10`, governing every object-vertex table from `PYRTBL` (502) down to line 838 — including `RDRTBL` and `TREAD4..TREADB`. These `.NWORD` tables are DECIMAL. (RADIX 16 is right for the bz3-8 *mountain* VCTR data and the ARCTAN table above line 501, not here.) Verified by re-decoding SHELL/SLOW_TANK from source and byte-matching the shipped `models.ts`. *Found by TEA during test design.*
- **Question** (non-blocking): the ROM draws only the NEAR tread set per frame — `ROTATE` (BZONE.MAC:1540-1548) picks base object `$4` (front) or `$8` (back) from a front/back visibility test, then adds `TRDCTR & 3`. The clone's `enemyTankSegments` contract does not pin front-vs-rear selection (the wiring tests only require the antenna + at least one animated tread frame attached). Dev may draw just the front set (simplest, `treadFrame`), or both runs, or replicate the facing test. Affects `src/core/scene.ts` (which tread object(s) to emit). *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): a genuinely faithful tread counter (INC/DEC per game frame off the AI's own forward/reverse decision, frozen while stationary) would need a new `Hostile`/`EnemyState` field stepped inside `stepEnemies` at the 15.625 Hz game-frame boundary (today only `advanceRadar` in sim.ts owns that boundary; `stepEnemies` runs every ~60 Hz shell sub-step). That's real surgery, not a render-detail change — flagging as a follow-up if the Reviewer/epic wants the "tread freezes when the tank holds still" fidelity. Not done here (see Design Deviations: reused `game.frameCount` instead). Affects `src/core/enemies.ts` (forward/reverse sign already computed as `aiDrive`'s `forwardFraction`), `src/core/sim.ts` (a game-frame accumulator), `src/core/state.ts` (new field). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): the enemy radar antenna is projected at `placement.orientation + radarSpin(frameCount)`, i.e. tank_heading + spin, but the ROM stores RANGLE **absolute** in the object-orientation slot (`STA AY,PTBLO2+1`, BZONE.MAC:1561-1562) — the dish spins in an absolute frame, decoupled from the enemy tank's heading (only the body/treads carry TANGLE+2). Spin rate ($0B/frame) and 256-frame period are byte-exact; the divergence is a heading-coupled phase offset that is essentially imperceptible in play. Affects `src/core/scene.ts` `enemyTankSegments` (drop the `placement.orientation` term from `antennaPlacement`, or leave as-is if the hull-relative reading is preferred). Originates in the TEA RED contract, not a Dev error. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Radix:** Spec said the vector data is `.RADIX 16`; the RDRTBL/TREAD tables are `.RADIX 10` (BZMTNS.MAC:501). Tests decode decimal `.NWORD`s. Reason: verified against the source and the shipped byte-exact models — the story note is wrong for this cluster (see Delivery Findings).
- **Edges pinned as an undirected SET, not an ordered list:** Spec said "byte-exact verts/edges". Tests deep-equal the VERTICES in ROM index order but compare EDGES as an undirected key set (`edgeSet`), same as `models.test.ts` treats connectivity. Reason: the rendered wireframe is identical under edge order/direction; pinning command-stream order would couple the suite to an arbitrary traversal without adding fidelity. Edge COUNT (10 antenna / 3 per tread) is still pinned exactly.
- **Antenna spin tied to `frameCount`, treads to a passed `treadCounter`:** Spec said "driven off the 15.625 Hz game frame". `radarSpin(frameCount)` derives RANGLE = `(11·frameCount) & 0xFF` (free-running, faithful — RANGLE only advances while a hostile is alive, but the antenna is only drawn for a live tank). The tread counter's SOURCE is left to Dev (guidance below) because the ROM ties TRDCTR to per-tank forward/reverse MOVEMENT (INC/DEC), which `frameCount` alone does not model; `treadFrame`/`enemyTankSegments` are pinned as pure functions of whatever counter is supplied.

### Dev (implementation)
- **Tread-counter source: reused `game.frameCount`, not a movement-derived per-hostile counter.** Spec/TEA guidance offered either. Investigated the faithful route: `stepEnemies` (enemies.ts) runs every ~60 Hz shell sub-step, not gated to the 15.625 Hz game-frame boundary the ROM ticks TRDCTR at — the only place in the core that already IS that boundary is `advanceRadar` (sim.ts), which drives `frameCount`/`bounce`/radar off an accumulator, decoupled from the AI's per-substep forward/reverse decision. A truly faithful movement-derived counter needs a NEW field threaded through `Hostile`/`EnemyState`, INCed/DECed once per game frame from the AI's own forward/reverse sign (`aiDrive`'s `forwardFraction`) — real surgery across `enemies.ts`/`sim.ts`/`state.ts`, with fixture-literal risk across the existing 1000+ tests, for a render-detail story whose ACs only require the treads to visibly animate. Reusing `frameCount` (already correct-cadence, already free-running, already deterministic) is the smaller, equally-legal option the RED contract explicitly sanctions ("Minimal option: reuse frameCount... Either satisfies the pinned tests"). Reason: minimal footprint for the story's actual scope; flagged here so the Reviewer can weigh faithfulness vs surface area. Net effect: the near tread rolls continuously while a tank is alive, including while stationary (aiming/holding standoff) — less faithful than the ROM (which freezes the tread when the tank isn't moving), a known, deliberate simplification.
- **Front-tread-only facing, never the rear run.** The pinned `treadFrame` contract (RED test "reaches all 4 front frames... only the front ($4) set") already forces this: `treadFrame` only ever indexes `TREAD_FRAMES[0..3]` (the front/-Z run). `enemyTankSegments` therefore projects exactly one tread frame (front), matching the ROM's own "draw only the near set" behavior in the common case (a tank facing the player shows its near/front tread) without replicating the ROM's actual front/back visibility test (BZONE.MAC:1540-1548). Reason: the wiring contract only requires "at least one animated tread"; adding the rear-facing test would be undemanded scope for a story about model *geometry*, not AI-facing logic.

## TEA Assessment

**Tests Required:** Yes
**Reason:** Two ROM sub-objects are absent from the clone (W-017 radar antenna, W-018 treads) — new byte-exact geometry + deterministic animation cadence + render wiring. Not a chore.

**Test Files:**
- `tests/core/enemy-tank-detail.test.ts` — 25 tests across 5 describe blocks: AC-1 antenna geometry, AC-2 tread frames, AC-1 radar-spin cadence, AC-2 tread-frame cadence, and the enemyTankSegments wiring (attachment + rotation + animation).

**Tests Written:** 25 tests covering 2 ACs (24 RED + 1 passing pose-validity guard).
**Status:** RED (24 failing — every failure is the `bz3-12 RED contract: core must export …` message; the 1 pass is a precondition guard that the tank body projects fully at the chosen pose, using existing `projectModel`/`SLOW_TANK`). Full suite: 24 failed | 1000 passed, no regressions. `tsc --noEmit` clean. `citations` green (12/12).

**Findings verified against `~/Projects/battlezone-source-text`:**
- W-017 / W-018 are live NO_COUNTERPART findings in `docs/audit/findings/pair-world-3d.json` — no `remediated_by`, no `[REFUTATION]`/`[CORRECTION]`. W-018 confirmed: `tread` in `src/` is only the dual-tread CONTROL scheme; the geometry is genuinely absent.
- RDRTBL: `BZMTNS.MAC:606-614` (8 verts). ERADAR at 615.
- TREAD4..TREADB: `BZMTNS.MAC:549-604` (TREAD4 550-555, TREAD5 557-562, TREAD6 564-569, TREAD7 571-576, TREAD8 578-583, TREAD9 585-590, TREADA 592-597, TREADB 599-604). ETREAD at 605.
- `.RADIX 10` set at `BZMTNS.MAC:501` (governs these tables — DECIMAL; see Delivery Findings correction).
- RDROBJ draw list: `BZONE.MAC:4517-4530`. TREADS draw list: `BZONE.MAC:4509-4516`.
- OBJPNT dispatch: `BZMTNS.MAC:485-495` — tread indices $4-$B (`.WORD TREAD7,TREAD6,TREAD5,TREAD4` REVERSED @486; `.WORD TREAD8,TREAD9,TREADA,TREADB` @487), radar $0D @488.
- RANGLE (byte, decl `BZONE.MAC:249`) += `$0B`/frame in ROBOT: `BZONE.MAC:2946-2949`. Antenna emitted as object $0D with orientation=RANGLE: `BZONE.MAC:1559-1562`.
- TRDCTR (decl `BZONE.MAC:240`); tread frame = `TRDCTR & 3`: `BZONE.MAC:1550-1551`; front/back base $4/$8: `BZONE.MAC:1540-1548`; INC on forward `BZONE.MAC:2669`, DEC on reverse `BZONE.MAC:2673`.

**Decode method (re-verified, identical to the 10 shipped models):**
Source `.NWORD a,b,c` (macro ×4, `BZMTNS.MAC:496-500`) → ROM words (4a,4b,4c) in (Z,X,Y) order → VisBattlezone transform `[-Xraw, 2·Yraw, Zraw]` → object-space vertex **`[-4b, 8c, 4a]`**. Proof: SHELL `SHLTBL .NWORD -10,-10,-12` → `[40,-96,-40]` = shipped `SHELL.vertices[0]`; SLOW_TANK `TNKTBL .NWORD -184,-128,-80` → `[512,-640,-736]` = shipped `SLOW_TANK.vertices[0]`. Cross-check: TREAD4[0]=`[568,-416,-1024]`=`SLOW_TANK.vertices[4]`; TREAD8[0]=`[568,-416,1248]`=`SLOW_TANK.vertices[7]` — the treads seat on the hull corners.
Command-list edges: `TLABS n` seats beam@n (no draw); `TVCTR n` draws beam→n then moves; `BVCTR n` blank-moves. Verified by tracing SHLOBJ (`BZONE.MAC:4497-4508`) → reproduces shipped `SHELL.edges` exactly and in order.

## RED → GREEN Guidance (for Dev / Julia)

**Target data — `src/core/models.ts` (pure geometry only, no new logic):**
- `export const RADAR_ANTENNA: Model3D` — the exact 8 vertices and 10 edges are spelled out in `RADAR_VERTS` / `RADAR_EDGES` in the test file (with per-vertex `BZMTNS.MAC` citations). Verts index-order matters (edges reference it). Name it anything (tests match by export, not name); suggest `'Radar Antenna'`.
- `export const TREAD_FRAMES: readonly Model3D[]` — 8 frames in SOURCE order (`TREAD_FRAMES[0]`=TREAD4 … `[7]`=TREADB), each 6 verts + edges `[[0,1],[2,3],[4,5]]`. Data in `TREAD_VERTS` / `TREAD_EDGES` in the test.
- Consider registering both in `MODELS` so `models.test.ts` well-formedness/roster coverage applies for free — the names won't collide with the obstacle-type substring map (narrow-pyramid/wide-pyramid/tall-box/short-box).

**Target cadence — `src/core/scene.ts` (deterministic core; keep rendering in the shell):**
- `export const RADAR_ANGLE_STEP = 11` (`$0B`). `export const TREAD_FRAME_COUNT = 4`.
- `export function radarSpin(frameCount): number` = `(((frameCount * RADAR_ANGLE_STEP) & 0xFF) / 256) * 2π` — RANGLE is a byte (256 = full turn); wraps every 256 frames.
- `export function treadFrame(treadCounter): Model3D` = `TREAD_FRAMES[3 - (treadCounter & 3)]` — the front ($4) set, honouring OBJPNT's reversal (BZMTNS.MAC:486): `TRDCTR&3` = 0,1,2,3 → TREAD7,TREAD6,TREAD5,TREAD4. Use bitwise `& 3` so reverse (negative) counters wrap correctly.
- `export function enemyTankSegments(body, placement, pose, aspect, anim: {frameCount, treadCounter}, bounce=0): readonly SceneSegment[]` — return `projectModel(body,…)` ++ the antenna projected at `{x,z, orientation: placement.orientation + radarSpin(anim.frameCount)}` ++ `projectModel(treadFrame(anim.treadCounter), placement,…)`. The wiring tests only require: body is a strict subset of the output; ≥ `antenna.edges + 3` extra segments; the output CHANGES with `frameCount` (antenna) and with `treadCounter` (tread), while the body stays identical; and it repeats at `frameCount+256` / `treadCounter+4`. Front-vs-rear tread choice is not pinned (see Delivery Findings Question).

**Where it attaches (shell):** `src/main.ts:215-227` currently draws the live hostile via a single `projectModel(HOSTILE_MODEL[hostile.kind], …)`. Replace that call for the `'alive'` case with `enemyTankSegments(HOSTILE_MODEL[hostile.kind], {x,z,orientation:heading}, pose, aspect, {frameCount: game.frameCount, treadCounter}, game.bounce)`. `game.frameCount` exists (bz3-11, `state.ts:152`, advanced in `sim.ts` `advanceFrame`).

**The tread counter (Dev's call — the one unpinned wiring seam):** ROM ties TRDCTR to per-tank forward/reverse MOVEMENT (INC `BZONE.MAC:2669` / DEC 2673), not to a free frame counter. Faithful option: add a per-hostile `treadCounter` to enemy state that steps ±1 when the hostile's position changes (advance forward, retreat back). Minimal option: reuse `frameCount` so the near tread rolls continuously while the tank lives (less faithful — treads keep rolling when the tank is stationary). Either satisfies the pinned tests, which pass an explicit counter. Flag whichever you pick as a Design Deviation if it simplifies the ROM.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `battlezone/src/core/models.ts` — added `RADAR_ANTENNA` (8 verts/10 edges, RDRTBL/RDROBJ) and `TREAD_FRAMES` (8 frames × 6 verts/3 edges, TREAD4-TREADB), both byte-exact copies of the RED fixture's `RADAR_VERTS`/`RADAR_EDGES`/`TREAD_VERTS`/`TREAD_EDGES`; both registered in `MODELS`.
- `battlezone/src/core/scene.ts` — added `RADAR_ANGLE_STEP=11`, `TREAD_FRAME_COUNT=4`, `radarSpin(frameCount)`, `treadFrame(treadCounter)`, `TankAnim` interface, and `enemyTankSegments(body, placement, pose, aspect, anim, bounce)` (body + antenna, spun by `radarSpin`, at the body's own x/z + orientation; + one tread frame via `treadFrame`, at the body's placement).
- `battlezone/src/main.ts` — wired `enemyTankSegments` into the live-hostile draw (`'alive'` phase only; `'exploding'` keeps the plain `EXPLOSION_DEBRIS` `projectModel` call), passing `{frameCount: game.frameCount, treadCounter: game.frameCount}`.
- `battlezone/docs/audit/findings/pair-world-3d.json` — `remediated_by: "bz3-12"` on W-017 and W-018 (both `ours: null`, the NO_COUNTERPART-legal shape); re-anchored W-005/W-010's `ours` line numbers (models.ts insertion shifted them: 234→356, 257→379).
- `battlezone/docs/audit/findings/pair-cadence.json` — re-anchored C-002's `ours` line (main.ts edit shifted it: 315→322).

**Seam decisions (both logged as Design Deviations above):**
1. **Tread-counter source:** reused `game.frameCount` for both antenna spin and tread selection, NOT a per-hostile movement-derived counter. The faithful route needs a new game-frame-quantized field in `Hostile`/`EnemyState` (the only existing game-frame boundary in core is `advanceRadar`'s accumulator in sim.ts; `stepEnemies` itself runs every ~60 Hz shell sub-step, not gated to 15.625 Hz) — real surgery outside this render-detail story's scope, and risky against the ~1000 existing tests with hand-built `Hostile`/`EnemyState` fixtures. Logged as a non-blocking Delivery Finding (Improvement) for a possible follow-up.
2. **Tread facing:** front-only, forced by the pinned `treadFrame` contract (only ever indexes `TREAD_FRAMES[0..3]`). No rear-tread emission, no front/back visibility test ported.

**Tests:** 1024/1024 passing (GREEN), citations 12/12, `tsc --noEmit` clean, `npm run lint` clean, `npm run build` clean.
**Branch:** feat/bz3-12-enemy-tank-model-detail (pushed)

**Handoff:** To Reviewer

## Handoff
To Dev (Julia) for implementation (GREEN).

## Reviewer Assessment

**Verdict:** APPROVED

**Independent decode (did NOT trust the shared fixture):** Re-decoded RDRTBL and
TREAD4..TREADB straight from `~/Projects/battlezone-source-text/BZMTNS.MAC` with
the `.NWORD a,b,c → [-4b, 8c, 4a]` formula (re-anchored on SHELL/SLOW_TANK). Result:
`RADAR_ANTENNA` (8 verts / 10 edges) and all 8 `TREAD_FRAMES` (6 verts / 3 edges
each) match my OWN decode **byte-for-byte** — vertices in ROM index order, edges
in RDROBJ (BZONE.MAC:4517-4530) / TREADS (BZONE.MAC:4509-4516) draw-list order.
Verified `.RADIX 10` at BZMTNS.MAC:501 governs the region down to line 838 (RADIX
16 begins at 839) — TEA's radix correction holds; these tables are DECIMAL. Fixture
== models.ts == my decode: three-way match, no byte mismatch anywhere.

**Cadence:** `RADAR_ANGLE_STEP=11` matches RANGLE += $0B (BZONE.MAC:2948);
`radarSpin` wraps every 256 frames = one full turn (RANGLE is a byte). `treadFrame(c)
= TREAD_FRAMES[3-(c&3)]` correctly honours OBJPNT's reversed front dispatch
($4→TREAD7…$7→TREAD4, BZMTNS.MAC:486); `&3` (not `%4`) wraps DECrementing counters
the ROM's way. All byte-exact.

**Data flow traced:** `game.frameCount` → `enemyTankSegments({frameCount, treadCounter})`
→ `radarSpin`/`treadFrame` (pure core) → `SceneSegment[]` → `drawSegments` (shell).
Wired ONLY into the `'alive'` hostile branch; `'exploding'` keeps its plain
`EXPLOSION_DEBRIS` projectModel call (main.ts diff confirmed). Core stays pure.

**Regression:** models.ts change is purely additive (124 insertions / 0 deletions);
models.test.ts untouched; full suite 1024/1024, tsc clean, citations 12/12.

**Findings (none blocking):**

| Severity | Issue | Location | Note |
|----------|-------|----------|------|
| [MEDIUM] | Antenna spin composed as `body_heading + RANGLE`; ROM stores RANGLE **absolute** in the object-orientation slot, independent of tank heading | scene.ts `enemyTankSegments` / BZONE.MAC:1561-1562 | Spin rate & 256-frame period are byte-exact; only a heading-coupled phase offset differs — imperceptible in play. Traces to TEA's RED contract. Non-blocking. |
| [MEDIUM] | Tread counter reuses free-running `frameCount` instead of movement-tied TRDCTR (INC fwd / DEC rev, frozen when still) | main.ts / scene.ts vs BZONE.MAC:2669,2673 | Documented deviation; treads roll while stationary and don't reverse. Faithful route needs a new per-hostile game-frame field (real surgery). Dev already filed the follow-up Improvement. Acceptable for a p3 render-detail story. |
| [LOW] | Front-tread-only; no front/back visibility switch | scene.ts `treadFrame` vs BZONE.MAC:1540-1548 | **Corrects the review premise:** the ROM does NOT draw both runs — it draws ONE near run (front OR back) chosen by a visibility test. Clone always draws the front run: faithful when the tank faces the player (common case), off only when it faces away. NOT "a tank missing half its treads." Documented, acceptable. |

**Citation honesty:** `remediated_by: bz3-12` on W-017/W-018 is legitimate, not a
phantom fix — both are class NO_COUNTERPART with `ours: null` (the citations-test-
legal remediated shape), the geometry was genuinely absent and is now byte-exact and
rendered. Re-anchors W-005 (234→356), W-010 (257→379), C-002 (315→322) are line-only;
verbatims unchanged and resolve correctly. `npm test -- citations` 12/12.

**Deviation audit:** Both logged Design Deviations (tread-counter source; front-only
facing) ACCEPTED — documented, test-sanctioned, and scoped correctly for a geometry
render-detail story. The antenna-orientation nuance (MEDIUM above) was NOT separately
logged; capturing it as a Delivery Finding for a possible follow-up is suggested but
not required to pass.

**Handoff:** To SM for finish-story.
