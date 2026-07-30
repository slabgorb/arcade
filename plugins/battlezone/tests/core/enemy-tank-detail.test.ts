// tests/core/enemy-tank-detail.test.ts
//
// Story bz3-12 — RED phase (O'Brien / TEA). Cluster C12: findings W-017 + W-018.
//
// WHAT THIS STORY FIXES
//   Every ROM enemy tank draws two sub-objects the clone renders as neither:
//     * W-017 — a rotating RADAR ANTENNA (RDRTBL geometry, BZMTNS.MAC:606-614;
//       drawn by RDROBJ, BZONE.MAC:4517-4530; emitted by ROTATE as object $0D
//       with its own spin angle RANGLE, BZONE.MAC:1559-1562).
//     * W-018 — ANIMATED TREADS: 8 frame tables TREAD4..TREADB (BZMTNS.MAC:
//       549-604), each a 6-vertex 3-rung strip drawn by the TREADS command list
//       (BZONE.MAC:4509-4516), the frame chosen by the tread counter TRDCTR.
//   The clone's models.ts has NEITHER model. W-018 CONFIRMED: `tread` appears in
//   src/ ONLY as the dual-tread CONTROL scheme (shell/input.ts KeyboardTreads,
//   movement), never as rendered geometry — the geometry is genuinely absent.
//
// RADIX CORRECTION (vs the story's "3D vector data is .RADIX 16 HEX" note):
//   RDRTBL and TREAD4..TREADB are NOT hex. BZMTNS.MAC sets `.RADIX 10` at line
//   501, and it governs every object-vertex table from PYRTBL (502) through the
//   radar/tread block down to line 838. These tables are DECIMAL `.NWORD`s. (The
//   .RADIX 16 note is true for the *mountain* VCTR data of bz3-8 and the ARCTAN
//   table above line 501 — not for this cluster.)
//
// DECODE (identical pipeline to the 10 existing byte-exact models in models.ts;
// re-verified here against SLOW_TANK/SHELL — see below):
//   Source `.NWORD a,b,c` emits three ROM words (4a, 4b, 4c) in (Z,X,Y) order
//   (the `.NWORD` macro, BZMTNS.MAC:496-500, multiplies each operand by 4). The
//   VisBattlezone transform is xc = -Xraw, yc = Yraw*2, zc = Zraw, stored
//   [xc, yc, zc]. Substituting the ×4: a source `.NWORD a,b,c` decodes to the
//   object-space vertex [ -4·b , 8·c , 4·a ].
//   Proof this is the SAME decode the shipped models use (models.ts, bz1-2):
//     SHELL  SHLTBL `.NWORD -10,-10,-12` (BZMTNS.MAC:518) → [40,-96,-40] = SHELL.vertices[0]. ✓
//     SLOW   TNKTBL `.NWORD -184,-128,-80`(BZMTNS.MAC:524) → [512,-640,-736] = SLOW_TANK.vertices[0]. ✓
//   And the treads sit exactly on the tank hull corners — TREAD4[0] = [568,-416,
//   -1024] = SLOW_TANK.vertices[4]; TREAD8[0] = [568,-416,1248] = SLOW_TANK.vertices[7].
//
// COMMAND-LIST EDGE DECODE (re-verified against SHELL, whose ROM edges are known):
//   In the .MAC draw lists, `TLABS n` seats the beam at vertex n (no draw);
//   `TVCTR n` DRAWS an edge from the current beam vertex to n, then moves the
//   beam to n; `BVCTR n` blank-moves to n (no edge); `SBRITE`/`OBJEND` carry no
//   geometry. Trace of SHLOBJ (BZONE.MAC:4497-4508) reproduces SHELL.edges
//   EXACTLY and in order — so the same reading gives RDROBJ / TREADS below.
//
// CONTRACT for the GREEN phase (Julia / DEV) — see the session file's RED
// delivery findings for the full target shapes, cadence, and wiring notes:
//   models.ts (pure geometry, no new logic):
//     export const RADAR_ANTENNA: Model3D          // RDROBJ dish: 8 verts, 10 edges
//     export const TREAD_FRAMES: readonly Model3D[] // TREAD4..TREADB: 8 frames × (6 verts, 3 edges)
//   scene.ts (pure assembly + deterministic cadence — rotation/animation state
//   in core, rendering stays in the shell/main.ts which calls enemyTankSegments):
//     export const RADAR_ANGLE_STEP: number         // 11  (RANGLE += $0B/frame, BZONE.MAC:2948)
//     export const TREAD_FRAME_COUNT: number        // 4   (frame = TRDCTR & 3, BZONE.MAC:1550-1551)
//     export function radarSpin(frameCount: number): number      // antenna Y-spin, radians
//     export function treadFrame(treadCounter: number): Model3D  // the near (front) animated frame
//     export function enemyTankSegments(
//       body: Model3D, placement: Placement, pose: TankPose, aspect: number,
//       anim: { frameCount: number; treadCounter: number }, bounce?: number,
//     ): readonly SceneSegment[]                     // body + spinning antenna + current tread
//
// Defensive dynamic load (bz1-2 house pattern): modules exist today, so imports
// succeed and the new members are simply `undefined` until GREEN — need() then
// throws a clear RED message instead of a vacuous pass, and tsc --noEmit stays
// clean because only existing TYPES are referenced statically.

import { describe, it, expect, beforeAll } from 'vitest'
import type { Model3D } from '../../src/core/models'

// --- module shapes (all new members optional so RED loads & typechecks) -------

interface ModelsModule {
  RADAR_ANTENNA?: Model3D
  TREAD_FRAMES?: readonly Model3D[]
  SLOW_TANK?: Model3D
}

interface TankPose {
  readonly x: number
  readonly z: number
  readonly heading: number
}
interface Placement {
  readonly x: number
  readonly z: number
  readonly orientation: number
}
interface SceneSegment {
  readonly x1: number
  readonly y1: number
  readonly x2: number
  readonly y2: number
}
interface TankAnim {
  readonly frameCount: number
  readonly treadCounter: number
}
interface SceneModule {
  RADAR_ANGLE_STEP?: number
  TREAD_FRAME_COUNT?: number
  radarSpin?: (frameCount: number) => number
  treadFrame?: (treadCounter: number) => Model3D
  projectModel?: (
    model: Model3D,
    placement: Placement,
    pose: TankPose,
    aspect: number,
    bounce?: number,
  ) => readonly SceneSegment[]
  enemyTankSegments?: (
    body: Model3D,
    placement: Placement,
    pose: TankPose,
    aspect: number,
    anim: TankAnim,
    bounce?: number,
  ) => readonly SceneSegment[]
}

let models: ModelsModule = {}
let scene: SceneModule = {}

beforeAll(async () => {
  try {
    models = (await import('../../src/core/models')) as ModelsModule
  } catch {
    models = {}
  }
  try {
    scene = (await import('../../src/core/scene')) as SceneModule
  } catch {
    scene = {}
  }
})

function need<T>(value: T | undefined, name: string): T {
  if (value === undefined) {
    throw new Error(`bz3-12 RED contract: core must export ${name}`)
  }
  return value
}

// --- expected byte-exact ROM geometry (decode: .NWORD a,b,c → [-4b, 8c, 4a]) --

// RDRTBL — the radar antenna, BZMTNS.MAC:606-614 (.RADIX 10). Two symmetric
// dish halves (verts 0-3 at +X, verts 4-7 at -X) joined by RDROBJ's [7,3] edge.
const RADAR_VERTS: readonly (readonly number[])[] = [
  [80, 160, 0], //   BZMTNS.MAC:607  .NWORD 0,-20,20
  [160, 200, 80], // BZMTNS.MAC:608  .NWORD 20,-40,25
  [160, 240, 80], // BZMTNS.MAC:609  .NWORD 20,-40,30
  [80, 280, 0], //   BZMTNS.MAC:610  .NWORD 0,-20,35
  [-80, 160, 0], //  BZMTNS.MAC:611  .NWORD 0,20,20
  [-160, 200, 80], //BZMTNS.MAC:612  .NWORD 20,40,25
  [-160, 240, 80], //BZMTNS.MAC:613  .NWORD 20,40,30
  [-80, 280, 0], //  BZMTNS.MAC:614  .NWORD 0,20,35
]
// RDROBJ draw list, BZONE.MAC:4517-4530. TLABS 0 seats beam@0; each TVCTR draws
// beam→n; the lone BVCTR 7 blank-moves (no edge). 10 undirected edges:
const RADAR_EDGES: readonly (readonly [number, number])[] = [
  [0, 1], [1, 2], [2, 3], [3, 0], // TVCTR 1,2,3,0  (right dish quad)
  [0, 4], // TVCTR 4  (bridge to left dish)
  [4, 5], [5, 6], [6, 7], [7, 4], // TVCTR 5,6,7,4  (left dish quad)
  // BVCTR 7 = blank move (no edge)
  [7, 3], // TVCTR 3  (join the two halves)
]

// TREAD4..TREADB — 8 animation frames, BZMTNS.MAC:549-604 (.RADIX 10). Each is
// three cross-tank rungs; frames 0-3 (TREAD4-7) are the FRONT run (-Z), frames
// 4-7 (TREAD8-B) the REAR run (+Z); within each run the rungs march ~24 units in
// Z per frame — the rolling animation.
const TREAD_VERTS: readonly (readonly (readonly number[])[])[] = [
  // TREAD4 — BZMTNS.MAC:550-555
  [[568, -416, -1024], [-568, -416, -1024], [548, -496, -920], [-548, -496, -920], [532, -576, -816], [-532, -576, -816]],
  // TREAD5 — BZMTNS.MAC:557-562
  [[564, -432, -1000], [-564, -432, -1000], [544, -512, -896], [-544, -512, -896], [528, -592, -792], [-528, -592, -792]],
  // TREAD6 — BZMTNS.MAC:564-569
  [[556, -456, -972], [-556, -456, -972], [540, -536, -868], [-540, -536, -868], [520, -616, -764], [-520, -616, -764]],
  // TREAD7 — BZMTNS.MAC:571-576
  [[552, -472, -948], [-552, -472, -948], [536, -552, -844], [-536, -552, -844], [516, -632, -736], [-516, -632, -736]],
  // TREAD8 — BZMTNS.MAC:578-583
  [[568, -416, 1248], [-568, -416, 1248], [548, -496, 1152], [-548, -496, 1152], [532, -576, 1056], [-532, -576, 1056]],
  // TREAD9 — BZMTNS.MAC:585-590
  [[564, -432, 1224], [-564, -432, 1224], [544, -512, 1128], [-544, -512, 1128], [528, -592, 1032], [-528, -592, 1032]],
  // TREADA — BZMTNS.MAC:592-597
  [[556, -456, 1200], [-556, -456, 1200], [540, -536, 1104], [-540, -536, 1104], [520, -616, 1008], [-520, -616, 1008]],
  // TREADB — BZMTNS.MAC:599-604
  [[552, -472, 1176], [-552, -472, 1176], [536, -552, 1080], [-536, -552, 1080], [516, -632, 984], [-516, -632, 984]],
]
// TREADS draw list, BZONE.MAC:4509-4516: TLABS 0; TVCTR 1 [0,1]; BVCTR 2 (move);
// TVCTR 3 [2,3]; BVCTR 4 (move); TVCTR 5 [4,5]. Three disjoint rung edges:
const TREAD_EDGES: readonly (readonly [number, number])[] = [[0, 1], [2, 3], [4, 5]]

// --- helpers ------------------------------------------------------------------

const nums = (v: readonly number[]): number[] => [...v]
const vertsOf = (m: Model3D): number[][] => m.vertices.map((v) => nums(v))
/** Canonical undirected-edge key set — order/direction independent. */
const edgeSet = (edges: readonly (readonly [number, number])[]): Set<string> =>
  new Set(edges.map(([a, b]) => (a < b ? `${a}-${b}` : `${b}-${a}`)))
const sig = (s: SceneSegment): string => JSON.stringify([s.x1, s.y1, s.x2, s.y2])
const bag = (segs: readonly SceneSegment[]): string[] => segs.map(sig).sort()
/** Multiset difference a \ b (by segment signature). */
function minus(a: readonly SceneSegment[], b: readonly SceneSegment[]): string[] {
  const rest = [...bag(b)]
  const out: string[] = []
  for (const k of bag(a)) {
    const i = rest.indexOf(k)
    if (i >= 0) rest.splice(i, 1)
    else out.push(k)
  }
  return out
}
const isSuperset = (whole: readonly SceneSegment[], part: readonly SceneSegment[]): boolean => {
  const rest = [...bag(whole)]
  for (const k of bag(part)) {
    const i = rest.indexOf(k)
    if (i < 0) return false
    rest.splice(i, 1)
  }
  return true
}

function expectWellFormed(m: Model3D): void {
  const n = m.vertices.length
  expect(n).toBeGreaterThan(0)
  expect(m.edges.length).toBeGreaterThan(0)
  const seen = new Set<string>()
  const used = new Set<number>()
  for (const v of m.vertices) {
    expect(v.length).toBe(3)
    for (const c of v) expect(Number.isFinite(c)).toBe(true)
  }
  for (const [a, b] of m.edges) {
    expect(Number.isInteger(a)).toBe(true)
    expect(Number.isInteger(b)).toBe(true)
    expect(a).toBeGreaterThanOrEqual(0)
    expect(b).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThan(n)
    expect(b).toBeLessThan(n)
    expect(a).not.toBe(b) // no self-edge
    const key = a < b ? `${a}-${b}` : `${b}-${a}`
    expect(seen.has(key)).toBe(false) // no duplicate undirected edge
    seen.add(key)
    used.add(a)
    used.add(b)
  }
  for (let i = 0; i < n; i++) expect(used.has(i)).toBe(true) // no orphan vertex
}

// =============================================================================
// AC-1 — the rotating radar antenna (W-017): RDRTBL/RDROBJ geometry, byte-exact
// =============================================================================
describe('bz3-12 AC-1 — enemy-tank radar antenna geometry (RDRTBL/RDROBJ, W-017)', () => {
  it('models.ts exports a RADAR_ANTENNA Model3D', () => {
    const a = need(models.RADAR_ANTENNA, 'models.RADAR_ANTENNA')
    expect(typeof a.name).toBe('string')
    expect(a.name.length).toBeGreaterThan(0)
    expect(Array.isArray(a.vertices)).toBe(true)
    expect(Array.isArray(a.edges)).toBe(true)
  })

  it('has the ROM vertex count: 8 (RDRTBL, BZMTNS.MAC:606-614)', () => {
    const a = need(models.RADAR_ANTENNA, 'models.RADAR_ANTENNA')
    expect(a.vertices.length).toBe(8)
  })

  it('vertices are the byte-exact decode of RDRTBL (.NWORD a,b,c → [-4b,8c,4a])', () => {
    const a = need(models.RADAR_ANTENNA, 'models.RADAR_ANTENNA')
    expect(vertsOf(a)).toEqual(RADAR_VERTS.map(nums))
  })

  it('has the 10 undirected edges RDROBJ draws (BZONE.MAC:4517-4530)', () => {
    const a = need(models.RADAR_ANTENNA, 'models.RADAR_ANTENNA')
    expect(a.edges.length).toBe(10)
    expect(edgeSet(a.edges)).toEqual(edgeSet(RADAR_EDGES))
  })

  it('is a well-formed wireframe (valid indices, no self/dup edges, no orphans)', () => {
    expectWellFormed(need(models.RADAR_ANTENNA, 'models.RADAR_ANTENNA'))
  })

  it('sits ABOVE the tank turret — every antenna vertex is well above the hull top', () => {
    // Physical sanity: the SLOW_TANK body tops out at yc = 160; a dish decoded at
    // the belly (or mis-scaled) would fail. RDRTBL yc ∈ [160,280].
    const a = need(models.RADAR_ANTENNA, 'models.RADAR_ANTENNA')
    for (const [, y] of a.vertices) expect(y).toBeGreaterThanOrEqual(160)
  })
})

// =============================================================================
// AC-2 — the animated treads (W-018): TREAD4..TREADB geometry, byte-exact
// =============================================================================
describe('bz3-12 AC-2 — enemy-tank tread frames (TREAD4-TREADB / TREADS, W-018)', () => {
  it('models.ts exports TREAD_FRAMES with the ROM frame count: 8 (TREAD4..TREADB)', () => {
    const frames = need(models.TREAD_FRAMES, 'models.TREAD_FRAMES')
    expect(Array.isArray(frames)).toBe(true)
    expect(frames.length).toBe(8)
  })

  it('each frame is a 6-vertex, 3-edge strip (well-formed wireframe)', () => {
    const frames = need(models.TREAD_FRAMES, 'models.TREAD_FRAMES')
    for (const f of frames) {
      expect(f.vertices.length).toBe(6)
      expect(f.edges.length).toBe(3)
      expectWellFormed(f)
      expect(edgeSet(f.edges)).toEqual(edgeSet(TREAD_EDGES)) // TREADS: [0,1],[2,3],[4,5]
    }
  })

  it('every frame is the byte-exact decode of its TREADn table (source order TREAD4..TREADB)', () => {
    const frames = need(models.TREAD_FRAMES, 'models.TREAD_FRAMES')
    for (let i = 0; i < TREAD_VERTS.length; i++) {
      expect(vertsOf(frames[i]), `TREAD_FRAMES[${i}] must byte-match TREAD${4 + i}`).toEqual(
        TREAD_VERTS[i].map(nums),
      )
    }
  })

  it('the 8 frames are all distinct (a real animation, not one strip repeated)', () => {
    const frames = need(models.TREAD_FRAMES, 'models.TREAD_FRAMES')
    const keys = new Set(frames.map((f) => JSON.stringify(vertsOf(f))))
    expect(keys.size).toBe(8)
  })

  it('the front run (frames 0-3) is forward of the rear run (frames 4-7) in Z', () => {
    // TREAD4-7 rungs sit at -Z (front), TREAD8-B at +Z (rear) — the two tread
    // sections OBJPNT splits into the front-facing ($4) and back-facing ($8) sets.
    const frames = need(models.TREAD_FRAMES, 'models.TREAD_FRAMES')
    const maxZ = (m: Model3D): number => Math.max(...m.vertices.map((v) => v[2]))
    for (let i = 0; i < 4; i++) expect(maxZ(frames[i])).toBeLessThan(0)
    for (let i = 4; i < 8; i++) expect(maxZ(frames[i])).toBeGreaterThan(0)
  })
})

// =============================================================================
// AC-1 cadence — the antenna ROTATES: RANGLE += $0B per 15.625 Hz game frame
// =============================================================================
describe('bz3-12 AC-1 cadence — radar spin (RANGLE += $0B/frame, BZONE.MAC:2946-2949)', () => {
  const TWO_PI = Math.PI * 2
  // RANGLE is a byte (256 units = a full turn); ROBOT adds $0B=11 each game frame.
  const refSpin = (f: number): number => (((f * 11) & 0xff) / 256) * TWO_PI

  it('exports RADAR_ANGLE_STEP = 11 ($0B, the per-frame RANGLE increment)', () => {
    expect(need(scene.RADAR_ANGLE_STEP, 'scene.RADAR_ANGLE_STEP')).toBe(11)
  })

  it('radarSpin(0) is zero (no rotation at the boot frame)', () => {
    expect(need(scene.radarSpin, 'scene.radarSpin')(0)).toBeCloseTo(0, 9)
  })

  it('radarSpin advances one 11/256-turn step per frame, wrapping at the byte (256)', () => {
    const radarSpin = need(scene.radarSpin, 'scene.radarSpin')
    for (const f of [0, 1, 7, 23, 64, 128, 255, 256, 257]) {
      expect(radarSpin(f), `radarSpin(${f})`).toBeCloseTo(refSpin(f), 6)
    }
  })

  it('completes exactly one revolution per 256 frames and returns to phase 0', () => {
    const radarSpin = need(scene.radarSpin, 'scene.radarSpin')
    // 256 * 11 ≡ 0 (mod 256): a whole number of turns, back to the start.
    expect(radarSpin(256) % TWO_PI).toBeCloseTo(0, 6)
    // gcd(11,256)=1 → the 256 frames visit 256 distinct byte angles (never stuck).
    const angles = new Set(Array.from({ length: 256 }, (_, f) => Math.round(radarSpin(f) / TWO_PI * 256) % 256))
    expect(angles.size).toBe(256)
  })
})

// =============================================================================
// AC-2 cadence — the treads ANIMATE: frame = TRDCTR & 3, 4-frame roll
// =============================================================================
describe('bz3-12 AC-2 cadence — tread frame select (TRDCTR & 3, BZONE.MAC:1550-1551)', () => {
  it('exports TREAD_FRAME_COUNT = 4 (the animation cycle length)', () => {
    expect(need(scene.TREAD_FRAME_COUNT, 'scene.TREAD_FRAME_COUNT')).toBe(4)
  })

  it('treadFrame selects the ROM frame for a counter — OBJPNT reversal (BZMTNS.MAC:486)', () => {
    // OBJPNT[$4..$7] = TREAD7,TREAD6,TREAD5,TREAD4 (REVERSED); object = $4 + (TRDCTR&3).
    // So counter&3 = 0,1,2,3 → TREAD7,TREAD6,TREAD5,TREAD4 = TREAD_FRAMES index 3,2,1,0.
    const treadFrame = need(scene.treadFrame, 'scene.treadFrame')
    const frames = need(models.TREAD_FRAMES, 'models.TREAD_FRAMES')
    for (let c = 0; c < 4; c++) {
      expect(treadFrame(c), `treadFrame(${c})`).toBe(frames[3 - (c & 3)])
    }
  })

  it('cycles with period 4 (TRDCTR & 3) — forward and, via INC/DEC, backward', () => {
    const treadFrame = need(scene.treadFrame, 'scene.treadFrame')
    for (const c of [0, 1, 2, 3, 5, 40]) {
      expect(treadFrame(c)).toBe(treadFrame(c + 4))
      expect(treadFrame(c)).toBe(treadFrame(c + 8))
    }
    // TRDCTR DECs when the tank reverses (BZONE.MAC:2673) — negatives must wrap too.
    expect(treadFrame(-1)).toBe(treadFrame(3))
    expect(treadFrame(-2)).toBe(treadFrame(2))
    expect(treadFrame(-4)).toBe(treadFrame(0))
  })

  it('reaches all 4 front frames over one cycle (never a frozen single frame)', () => {
    const treadFrame = need(scene.treadFrame, 'scene.treadFrame')
    const frames = need(models.TREAD_FRAMES, 'models.TREAD_FRAMES')
    const front = new Set(frames.slice(0, 4))
    const reached = new Set([0, 1, 2, 3].map((c) => treadFrame(c)))
    expect(reached.size).toBe(4)
    for (const f of reached) expect(front.has(f)).toBe(true) // only the front ($4) set
  })
})

// =============================================================================
// Wiring — the antenna & treads are ATTACHED to the enemy tank, and animate
// (keeps the sneaky dev honest: geometry that ships unrendered fails here)
// =============================================================================
describe('bz3-12 wiring — enemyTankSegments draws body + spinning antenna + rolling tread', () => {
  const ASPECT = 4 / 3
  const ORIGIN: TankPose = { x: 0, z: 0, heading: 0 }
  // Dead ahead, mid-window (well inside [1023,31487]); the whole assembly clears
  // the eye plane so body/antenna/tread all project fully.
  const PLACE: Placement = { x: 0, z: 8000, orientation: 0 }
  const STILL: TankAnim = { frameCount: 0, treadCounter: 0 }

  const bodySegs = (): readonly SceneSegment[] =>
    need(scene.projectModel, 'scene.projectModel')(
      need(models.SLOW_TANK, 'models.SLOW_TANK'), PLACE, ORIGIN, ASPECT, 0,
    )
  const full = (anim: TankAnim): readonly SceneSegment[] =>
    need(scene.enemyTankSegments, 'scene.enemyTankSegments')(
      need(models.SLOW_TANK, 'models.SLOW_TANK'), PLACE, ORIGIN, ASPECT, anim, 0,
    )

  it('the body is fully visible at this pose (guard: no vacuous cull)', () => {
    const tank = need(models.SLOW_TANK, 'models.SLOW_TANK')
    expect(bodySegs().length).toBe(tank.edges.length)
  })

  it('adds the antenna AND a tread to the body (attachment: extra ≥ 10 + 3 edges)', () => {
    const body = bodySegs()
    const whole = full(STILL)
    expect(isSuperset(whole, body)).toBe(true) // every body edge still drawn
    const extra = minus(whole, body).length
    const antenna = need(models.RADAR_ANTENNA, 'models.RADAR_ANTENNA')
    expect(extra).toBeGreaterThanOrEqual(antenna.edges.length + TREAD_EDGES.length) // ≥ 10 + 3
  })

  it('the antenna ROTATES with frameCount (body/tread held fixed → output changes)', () => {
    const s0 = full({ frameCount: 0, treadCounter: 0 })
    const s1 = full({ frameCount: 64, treadCounter: 0 }) // 64·11 mod 256 = 192 → 3/4 turn
    expect(bag(s0)).not.toEqual(bag(s1)) // only the antenna depends on frameCount
    expect(isSuperset(s0, bodySegs())).toBe(true)
    expect(isSuperset(s1, bodySegs())).toBe(true)
    // The changed portion is confined to the (10-edge) antenna, not the body.
    expect(minus(s1, s0).length).toBeGreaterThan(0)
    expect(minus(s1, s0).length).toBeLessThanOrEqual(need(models.RADAR_ANTENNA, 'models.RADAR_ANTENNA').edges.length)
  })

  it('the tread ANIMATES with treadCounter (antenna held fixed → output changes)', () => {
    const t0 = full({ frameCount: 0, treadCounter: 0 })
    const t1 = full({ frameCount: 0, treadCounter: 1 }) // TREAD7 → TREAD6
    expect(bag(t0)).not.toEqual(bag(t1)) // only the tread depends on treadCounter
    expect(minus(t1, t0).length).toBeGreaterThan(0)
  })

  it('radar returns to phase every 256 frames; tread repeats every 4 counts', () => {
    // Cadence pinned through observable output: identical frame → identical draw.
    expect(bag(full({ frameCount: 0, treadCounter: 0 }))).toEqual(
      bag(full({ frameCount: 256, treadCounter: 0 })), // 256·11 ≡ 0 (mod 256)
    )
    expect(bag(full({ frameCount: 0, treadCounter: 0 }))).toEqual(
      bag(full({ frameCount: 0, treadCounter: 4 })), // TRDCTR & 3 period 4
    )
  })

  it('is deterministic — identical inputs give deep-equal segments (epic standing AC)', () => {
    expect(full(STILL)).toEqual(full(STILL))
  })
})

// =============================================================================
// bz4-3 AC-2 — the antenna angle is stored ABSOLUTE (world-frame), decoupled
// from the tank body heading (BZONE.MAC:1561-1562), NOT body_heading + RANGLE.
// =============================================================================
//
// bz3-12 composed the antenna as `placement.orientation + radarSpin(frameCount)`
// (a hull-relative reading — the Reviewer flagged it MEDIUM, unpinned because
// every bz3-12 antenna test used body orientation 0, where absolute and
// body-relative are identical). The ROM stores RANGLE straight into the object's
// orientation slot:
//
//   BZONE.MAC:1561  LDA RANGLE
//   BZONE.MAC:1562  STA AY,PTBLO2+1   ; ORIENTATION
//
// RANGLE is a global spin (+$0B/frame, BZONE.MAC:2947-2949) but its stored angle
// is ABSOLUTE — the tank body heading (TANGLE) is NOT added. The `LDA TANGLE /
// SEC / SBC TANGLE+2` immediately after computes a SEPARATE quantity (NTHETA),
// not the dish orientation. So the dish sweeps in the world frame; rotating the
// hull must NOT drag the antenna's world angle with it. (Verified against
// ~/Projects/battlezone-source-text/BZONE.MAC.)
//
// Discriminator: hold frameCount fixed, rotate ONLY the body. A body-relative
// antenna moves by the body's heading delta; the ROM-absolute antenna does not.
describe('bz4-3 AC-2 — antenna angle is absolute/world-frame (BZONE.MAC:1561-1562)', () => {
  const ASPECT = 4 / 3
  const ORIGIN: TankPose = { x: 0, z: 0, heading: 0 }
  // radarSpin(64): 64·11 mod 256 = 192 → 3/4 turn, a big unambiguous dish angle.
  const FC = 64
  const AT = { x: 0, z: 8000 } // dead ahead, mid-window — the whole rig projects.

  const enemy = (bodyHeading: number): readonly SceneSegment[] =>
    need(scene.enemyTankSegments, 'scene.enemyTankSegments')(
      need(models.SLOW_TANK, 'models.SLOW_TANK'),
      { x: AT.x, z: AT.z, orientation: bodyHeading },
      ORIGIN, ASPECT, { frameCount: FC, treadCounter: 0 }, 0,
    )

  // The hull = body + tread; both ARE hull-relative and rotate with the body.
  const hull = (bodyHeading: number): readonly SceneSegment[] => {
    const place: Placement = { x: AT.x, z: AT.z, orientation: bodyHeading }
    const projectModel = need(scene.projectModel, 'scene.projectModel')
    return [
      ...projectModel(need(models.SLOW_TANK, 'models.SLOW_TANK'), place, ORIGIN, ASPECT, 0),
      ...projectModel(need(scene.treadFrame, 'scene.treadFrame')(0), place, ORIGIN, ASPECT, 0),
    ]
  }
  // What's left of the full draw after removing the hull = the antenna alone.
  const antennaPart = (bodyHeading: number): string[] => minus(enemy(bodyHeading), hull(bodyHeading))

  // The ROM-absolute reference: the dish projected at world angle radarSpin(FC),
  // with NO body-heading term.
  const absoluteAntenna = (): readonly SceneSegment[] =>
    need(scene.projectModel, 'scene.projectModel')(
      need(models.RADAR_ANTENNA, 'models.RADAR_ANTENNA'),
      { x: AT.x, z: AT.z, orientation: need(scene.radarSpin, 'scene.radarSpin')(FC) },
      ORIGIN, ASPECT, 0,
    )

  it('the antenna sits at the ABSOLUTE RANGLE angle even when the body is yawed 90°', () => {
    // Under the ROM-absolute rule the dish orientation is radarSpin(FC) regardless
    // of the hull facing, so the absolute-antenna segments appear verbatim in the
    // full draw. body_heading + RANGLE (bz3-12) shifts them by 90° → not present.
    const whole = enemy(Math.PI / 2)
    expect(isSuperset(whole, absoluteAntenna())).toBe(true)
  })

  it('rotating ONLY the tank body does not carry the antenna with it (world-absolute)', () => {
    // Same frameCount + position, two hull headings. Hull silhouette differs, but
    // the isolated antenna must be IDENTICAL between them. A body-relative dish
    // would rotate by the body delta (90°) and diverge.
    expect(antennaPart(0)).toEqual(antennaPart(Math.PI / 2))
  })

  it('the isolated antenna at body-heading 0 is exactly the absolute-angle projection', () => {
    // At heading 0, absolute and body-relative coincide — this pins that the part
    // we isolate really is the dish at radarSpin(FC), so the 90° test above is not
    // comparing empty/degenerate sets.
    expect(antennaPart(0)).toEqual(bag(absoluteAntenna()))
  })

  it('GUARD: the antenna still SPINS with frameCount at a non-zero body heading (absolute ≠ frozen)', () => {
    // Absoluteness must not be achieved by dropping the spin. At a fixed yawed
    // body, changing frameCount must still move the antenna. (Green under both the
    // old and new orientation rule — a standing regression guard.)
    const yaw = Math.PI / 2
    expect(bag(enemy(yaw))).not.toEqual(
      bag(
        need(scene.enemyTankSegments, 'scene.enemyTankSegments')(
          need(models.SLOW_TANK, 'models.SLOW_TANK'),
          { x: AT.x, z: AT.z, orientation: yaw },
          ORIGIN, ASPECT, { frameCount: FC + 64, treadCounter: 0 }, 0,
        ),
      ),
    )
  })
})
