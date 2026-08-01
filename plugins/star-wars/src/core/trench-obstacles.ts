// src/core/trench-obstacles.ts
//
// Fidelity epic (task 3) — the trench's wall content as ENTITIES: shootable
// turrets and wall squares, and catwalk hazards spanning the channel. Stations
// re-expressed from the ROM's obstacle records (docs/star-wars-1983-source-
// findings.md ## Trench catwalks, turrets & wall squares — off_7CC0 →
// off_7B1E..7BFE); scores from ## Scoring tables (byte_9853 turrets,
// byte_9850 squares).

import { type TrenchObstacle } from './state'
import { TRENCH_HALF_W, TRENCH_WALL_H } from './trench-channel'
import { type Rng } from '@shared/rng'
import { buildTrench, wedgeLength, PANEL_FORCEFIELD, PANEL_GUN, type PanelColumn, type Wedge } from './trench-wedges'

// --- Scores: TRUED against ## Scoring tables --------------------------------
//
// loc_9810 "Add to score total" reads a 3-byte record (hi, mid, lo) as
// BCD(hi)×10,000 + BCD(mid)×100 + BCD(lo)×1 (confirmed by the on-screen
// "SCORING" text at ROM:DE07+ — see the doc's ⚠︎ cross-note-conflict resolution
// for TIE/exhaust-port/all-towers, which anchors this same digit-placement read).

/** Points for destroying a trench wall turret. `byte_9853` "Trench turrets" =
 *  raw record (0,1,0) → BCD(1)×100 = 100, confirmed by the on-screen
 *  `aTrenchTurrets10` "TRENCH TURRETS ... 100" text. */
export const TRENCH_TURRET_SCORE = 100

/** Points for destroying a trench wall square. `byte_9850` "Trench green
 *  squares" = raw record (0,0,$50) → BCD($50)×1 = 50. The findings table has no
 *  confirming on-screen text line for this record (annotated "no line; catwalk
 *  hit value" — the doc's own naming hedge between "green square" and
 *  "catwalk"); the symbol name and the shootable/scored semantics below follow
 *  the flight-instructions text, which is unambiguous that only a CATWALK
 *  *strike* costs a shield (see OBSTACLE_HIT_RADIUS and Open follow-ups #3). */
export const TRENCH_SQUARE_SCORE = 50

/** Bolt-vs-obstacle proximity, world units. No ROM value was found for THIS
 *  test: the doc's one nearby hit-box tolerance (`MReg3E ± $200 vs MReg22`,
 *  sub_B3E9's row 2) is a DIFFERENT check — the ship's firing-cone box, not a
 *  player bolt striking a turret/square — so it isn't a sound anchor to true
 *  this against. Originally tuned near PORT_HIT_RADIUS (then 70, so 90 was a
 *  deliberate ~1.29x). sw5-4 re-seated PORT_HIT_RADIUS to the ROM porthole
 *  (108), which flips that ratio to ~0.83x — PORT_HIT_RADIUS moved for
 *  unrelated reasons (the real port geometry), not because 90 was re-tuned
 *  against it, so read this as historical provenance, not a live tuning
 *  relationship the two values still track. Stays provisional pending a
 *  dedicated hit-test decode (findings ## Trench catwalks, turrets & wall
 *  squares; Open follow-ups #3). */
export const OBSTACLE_HIT_RADIUS = 90 // PROVISIONAL(findings ## Trench catwalks, turrets & wall squares)

const W = TRENCH_HALF_W

// --- Furniture heights, re-anchored to the pinned trench (story sw5-6) ------
//
// These were absolute constants (60 / 120 / 200) hand-tuned against the old 320-tall wall.
// Against the ROM's 4096-deep trench they all collapse into the bottom 5% — the "overhead"
// catwalk ends up lying on the floor. None of them carries a ROM pin (the cabinet's wall
// detail is a PRNG-picked shape script, not a grid), so they are re-anchored rather than
// re-pinned: no invented numbers are dressed up as ROM data.
//
// WALL furniture scales with the WALL — the square keeps exactly the proportion of its
// height that it had (its aim-cone re-anchor below). Note the pilot is clamped to ±511
// inside ±1024 walls, so he can never reach them: these are things he SHOOTS, not things
// he crashes into. (The TURRETS that used to share this table are gone: wall guns are now
// STREAMED from the wedge grid's PANEL_GUN columns — `streamWallGuns`, uf1-4 / B-017 —
// so their placement is the ROM's own wedge data, not a hand-tuned proportion.)
//
// The CATWALK is now a wall FORCE FIELD (TD$WFF, B-012): it mounts on ONE wall and is
// SIDE-GATED — it grazes only a pilot on the wall it hangs from, within a vertical band
// about its height. A hands-off pilot rides centred (trenchView[0] = 0), which the ROM's
// `IFLE ;?ON LEFT SIDE?` counts as the left side, so seating the field on the LEFT wall
// still makes a neutral run graze it — hazard preserved. The dodge is LATERAL: steer to the
// opposite (right) wall and it can't touch you (or climb clear of its height band). The
// graze costs NO shield (WSPANL glow+sound+roll; the shield accounting rides WSGLOW,
// score-shields scope). tests/core/trench-viewpoint.test.ts asserts these behaviourally.
// (The dense authentic panel grid — ~80 fields streamed over the full channel — is R6d /
// sw7-22, which un-clamps the port stub; here the trench carries the one head-of-pie divider
// catwalk, wall-mounted.) Its height need only sit within a hands-off pilot's hit band.

/** Wall square — it must stay INSIDE THE PILOT'S AIM CONE from its own
 *  station, or it is scenery he can see and never shoot.
 *
 *  The cone is the FOV: at range D the crosshair reaches ±D/f about the eye, with f = 1/tan(30°).
 *  The nearest square station is 1300 downrange, so it reaches 1300/1.732 = 750 above the seat —
 *  i.e. anything above ~1518 is UNAIMABLE the moment it appears. The old 3/8 (=1536) sat just past
 *  that line and the square could never be shot. 5/16 keeps the square high on the wall with real
 *  margin, and every station stays reachable (pinned in tests/core/trench-aim-wysiwyg.test.ts).
 *
 *  This is what "re-anchor the furniture" (AC-5) actually means: not just scaling it with the wall,
 *  but keeping it a TARGET. */
const SQUARE_Y = (TRENCH_WALL_H * 5) / 16 // 1280
/**
 * Downrange stations, cockpit → far. PROVISIONAL layout for the SQUARES only:
 * the ROM's off_7CC0 → off_7B1E..7BFE records (findings ## Trench catwalks,
 * turrets & wall squares) are confirmed to be (type-byte, dx, dy) shape-script
 * triples, but the extraction notes flag it uncertain whether an off_7Bxx row
 * encodes per-section PLACEMENT or only silhouette geometry, and there is no
 * ROM↔world-unit conversion to turn either reading into station coordinates
 * (the same gap that keeps TRENCH_HALF_W/TRENCH_WALL_H provisional — see Open
 * follow-ups #2/#3). So the square placements remain hand-authored. The TURRET
 * rows this table used to carry (with their sub_B3E9 left/right/pair reading)
 * are RETIRED (uf1-4): wall guns now come from the wedge grid's own PANEL_GUN
 * columns via `streamWallGuns` — the geometry-decode this comment used to wait
 * for, applied per wall and per slot straight from WSBASE.MAC data.
 */
// The stations move OUT with the walls (story sw5-6). They were spaced for a ±256 trench; the
// pinned trench is ±1024, and a wall object 900 units downrange on a ±1024 wall subtends 48.7°
// off-axis — outside the frustum entirely. It is not a hard shot, it is OFF SCREEN.
//
// The aim cone is the FOV: the crosshair reaches |x|/D ≤ tan(FOV_Y/2)·aspect. At the narrowest
// aspect we support (1:1) that is 0.577, so a wall object is only aimable beyond
// TRENCH_HALF_W / 0.577 ≈ 1774. Seating the nearest station at 2·TRENCH_HALF_W puts every wall
// object at ≤ 26.6° — comfortably inside the cone at ANY aspect ≥ 1, which also closes the
// aspect-dependent reachability hole the reviewer flagged. Spacing is unchanged.
//
// Still PROVISIONAL (the ROM's off_7CC0 records give no station coordinates) — re-anchored, not
// pinned. tests/core/trench-aim-wysiwyg.test.ts holds them to the only contract that matters: the
// pilot can point at every one of them.
const NEAR = 2 * TRENCH_HALF_W // 2048 — the closest a wall object may stand and still be aimable
const GAP = 400

export const TRENCH_OBSTACLE_STATIONS: readonly TrenchObstacle[] = [
  { kind: 'square', pos: [W, SQUARE_Y, -(NEAR + GAP)] },
  { kind: 'square', pos: [-W, SQUARE_Y, -(NEAR + 4 * GAP)] },
  { kind: 'square', pos: [W, SQUARE_Y, -(NEAR + 5 * GAP)] },
]

/**
 * Fresh per-run copies of the square stations (positions mutate as they scroll —
 * never share). Deterministic and seedless (uf1-4): the sw3-7 head/tail KIND
 * pick that used to live here approximated the ROM's GNBASE random pie on this
 * hand-authored table; the grid now implements GNBASE itself (`buildTrench`'s
 * RPIE for BS.WAV ≥ 11), and finding B-011 established that the AUTHORED waves
 * are run-identical on the cabinet — so a seeded shuffle of this table was
 * variation the ROM does not have. Per-run variation lives in the streamed
 * layers now; what remains here is fixed furniture.
 */
export function spawnTrenchObstacles(): TrenchObstacle[] {
  return TRENCH_OBSTACLE_STATIONS.map((o) => ({ kind: o.kind, pos: [...o.pos] as TrenchObstacle['pos'] }))
}

// --- The streamed wall grid: force fields (sw7-22 / B-012) + guns (uf1-4 / B-017) ---
//
// The authentic trench draws its wall content from the wedge PANEL GRID (sw7-6 /
// B-010): each wedge carries a left- and right-wall 4-slot column — a
// PANEL_FORCEFIELD (TD$WFF) slot is a wall force field, a PANEL_GUN (TD$WGA)
// slot is a wall gun. `buildTrench` lays the
// whole chain — tens of these across the full ~327,680-unit channel — so with the
// port un-clamped to its real BS.PLC distance (sw7-22) they finally have somewhere
// to go. This replaces the single placeholder catwalk the 1.8s stub carried.

/** The four vertical wall slots' heights above the floor (slot 0 = top … slot 3 =
 *  bottom), as the panel grid stacks them. PROVISIONAL: the exact ROM band
 *  (`M.Z0 ± $200` top / `$400` band, WSPANL.MAC:186-215) is not yet pinned (sw7-22
 *  Delivery Finding); the four slots are spread across the wall's usable height so
 *  each lands in a band the diving/climbing pilot can meet. One map for EVERY
 *  slot type (uf1-4): a gun and a force field in the same slot hang at the same
 *  height, because the grid stacks them in the same four wall positions. */
const WALL_SLOT_Y: readonly number[] = [
  (TRENCH_WALL_H * 4) / 5, // slot 0 — top
  (TRENCH_WALL_H * 3) / 5,
  (TRENCH_WALL_H * 2) / 5,
  (TRENCH_WALL_H * 1) / 5, // slot 3 — bottom
]

/**
 * Stream one slot type out of the wave's wedge grid as obstacles. Walks the
 * chain `buildTrench` builds; each matching slot becomes one obstacle of `kind`,
 * mounted on its column's wall (left → −x, right → +x) at the slot's height,
 * seated at the wedge's −Z distance down the channel. Pure and deterministic
 * like the chain it reads; callers thread a LOCAL RNG cursor so the run seed is
 * never consumed.
 */
function streamPanelSlots(baseWave: number, rng: Rng, slotType: number, kind: TrenchObstacle['kind']): TrenchObstacle[] {
  const out: TrenchObstacle[] = []
  let z = 0
  const scan = (col: PanelColumn, wallX: number) => {
    col.forEach((slot, i) => {
      if (slot === slotType) out.push({ kind, pos: [wallX, WALL_SLOT_Y[i], -z] })
    })
  }
  for (const w of buildTrench(baseWave, rng) as readonly Wedge[]) {
    scan(w.left, -W)
    scan(w.right, W)
    z += wedgeLength(w.type)
  }
  return out
}

/** The wave's wall force fields (B-012, sw7-22 / R6d): every PANEL_FORCEFIELD
 *  (TD$WFF) slot becomes one 'catwalk' obstacle — the kind the side-gated graze
 *  collision reads (sw7-19). */
export function streamForceFields(baseWave: number, rng: Rng): TrenchObstacle[] {
  return streamPanelSlots(baseWave, rng, PANEL_FORCEFIELD, 'catwalk')
}

/** The wave's wall guns (B-017, uf1-4): every PANEL_GUN (TD$WGA) slot becomes
 *  one 'turret' obstacle — the kind the TGPROB fire loop and the 100-point
 *  scoring already read — so the guns that return fire are the ROM's own wedge
 *  data, per wall and per slot, across the full channel. */
export function streamWallGuns(baseWave: number, rng: Rng): TrenchObstacle[] {
  return streamPanelSlots(baseWave, rng, PANEL_GUN, 'turret')
}
