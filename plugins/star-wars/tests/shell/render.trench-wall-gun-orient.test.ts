// tests/shell/render.trench-wall-gun-orient.test.ts
//
// Story sw11-2 — RED phase (O'Brien / TEA): the trench wall guns must seat FLUSH
// against the vertical side walls and MIRROR per wall, so every barrel points INTO
// the channel — not cantilever off the wall with a single fixed orientation.
//
// == THE DEFECT ==============================================================
//
// TRENCH_TURRET (`.WP WGA`) is a wall gun whose BASE is a plate in the HORIZONTAL
// (x-z) plane with the barrel rising out of it — models.ts authors it that way and
// says so: "ORIENTATION is the shell's job (render.ts)". The shell (render.ts:585)
// draws EVERY trench obstacle with the SAME fixed basis, `modelMatrix(o.pos,
// TRENCH_ORIENT)`, and sw10-1 retired TRENCH_ORIENT to IDENTITY. So the gun is
// dropped onto a VERTICAL side wall with NO per-wall rotation:
//
//   • its base plate stays horizontal — it cantilevers off the wall instead of
//     lying flush against it, and
//   • its barrel keeps ONE fixed lateral direction, so it points into the channel
//     on ONE wall and INTO THE WALL on the other.
//
// The obstacles ride BOTH walls: `streamPanelSlots` (trench-obstacles.ts) mounts a
// gun on the left wall (`pos[1] = -W`) and the right wall (`pos[1] = +W`) from the
// same wedge grid, but the ROM proves the two walls are MIRROR images, not copies:
//
//     FRPLGN:  M.Y0 = -380  ;GUN BARREL ON LEFT WALL     (WSBASE.MAC:1251)
//     FRPRGN:  M.Y0 = +380  ;GUN BARREL ON RIGHT WALL    (WSBASE.MAC:1295)
//
// and PANLIN hands the shell MOV$PL vs MOV$PR so left/right guns are handled as
// mirrors THROUGHOUT. The fix (render/placement layer; core stays pure) seats the
// base against the vertical wall and mirrors/rotates per wall from the SIGN of
// `o.pos[1]` (the native RIGHT axis) so the barrel points into the channel on both.
//
// == WHAT THIS SUITE CAN AND CANNOT PROVE ====================================
//
// render.ts:168 warns that structural tests can't catch orientation/scale and these
// MUST be eyeballed on the dev server (port 5270, /star-wars/). That is true of the
// FINAL LOOK — barrel angle, how the gun reads head-on. What a test CAN pin is the
// MECHANISM the reported defect is about, and does, by driving the real render()
// and measuring the geometry the shell actually handed the rasteriser:
//
//   1. the base plate has ~zero extent ALONG THE WALL-NORMAL — it lies flush, not
//      cantilevered (fails today: the horizontal plate spans the full lateral width);
//   2. the barrel points INTO the channel on BOTH walls (fails today on one wall —
//      the headline defect); and
//   3. the two walls are LATERAL MIRRORS of each other (fails today: identical).
//
// The lateral ("wall") axis is derived EMPIRICALLY from the two stations — the only
// coordinate that differs between a +W and a -W placement — so these assertions do
// not depend on hand-decoding the native→eye basis. Passing this suite is NECESSARY,
// not SUFFICIENT: the human eyeball on the dev server is still the acceptance gate.

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/shell/wireframe', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/shell/wireframe')>()
  return { ...actual, drawWireframe: vi.fn() }
})

import { drawWireframe } from '../../src/shell/wireframe'
import { render } from '../../src/shell/render'
import { initialState, type GameState, type TrenchObstacle } from '../../src/core/state'
import { type Model3D } from '../../src/core/models'
import { transform, sub, dot, length, normalize, type Mat4, type Vec3 } from '@shared/math3d'

const W = 800
const H = 600
const DEPTH = 2400 // native depth (index 0), downrange
const HEIGHT = 1200 // native up (index 2), a wall slot height

function makeCtx(): CanvasRenderingContext2D {
  const ctx = {
    fillStyle: '', strokeStyle: '', shadowColor: '', shadowBlur: 0, lineWidth: 0,
    font: '700 18px monospace', textAlign: '', textBaseline: '', letterSpacing: '',
    globalCompositeOperation: '',
    fillRect() {}, strokeRect() {}, clearRect() {}, beginPath() {}, moveTo() {},
    lineTo() {}, stroke() {}, save() {}, restore() {}, fillText() {}, arc() {},
  }
  return ctx as unknown as CanvasRenderingContext2D
}

// A right-wall (+W) and a left-wall (-W) obstacle of the same kind, at the same
// depth and height — so the ONLY difference between them is the wall they hang on.
const wallPair = (kind: TrenchObstacle['kind'], up: number): TrenchObstacle[] => [
  { kind, pos: [DEPTH, W, up] }, //  index 0 — RIGHT wall (pos[1] = +W)
  { kind, pos: [DEPTH, -W, up] }, // index 1 — LEFT  wall (pos[1] = -W)
]

const trenchScene = (obstacles: TrenchObstacle[]): GameState => ({
  ...initialState(1983),
  mode: 'playing',
  phase: 'trench',
  exhaustPort: null,
  trenchObstacles: obstacles,
  projectiles: [],
})

/** The obstacle draws the shell actually issued, in trenchObstacles order, filtered
 *  to one furniture model by name. Each entry carries the modelView the shell built. */
function obstacleDraws(state: GameState, modelName: string): { model: Model3D; mv: Mat4 }[] {
  vi.mocked(drawWireframe).mockClear()
  render(makeCtx(), state, W, H)
  return vi.mocked(drawWireframe).mock.calls
    .filter((c) => (c[1] as Model3D)?.name === modelName)
    .map((c) => ({ model: c[1] as Model3D, mv: c[2] as Mat4 }))
}

/** A drawn obstacle's vertices and mount point, in eye space (post modelView). */
function eyeOf(d: { model: Model3D; mv: Mat4 }): { verts: Vec3[]; station: Vec3 } {
  return {
    verts: d.model.vertices.map((v) => transform(d.mv, v as Vec3)),
    station: transform(d.mv, [0, 0, 0]),
  }
}

/** Signed extent of a point cloud along a unit axis (max − min of the projections). */
const spread = (pts: Vec3[], axis: Vec3): number => {
  const p = pts.map((v) => dot(v, axis))
  return Math.max(...p) - Math.min(...p)
}
const centroid = (pts: Vec3[]): Vec3 =>
  [0, 1, 2].map((i) => pts.reduce((a, v) => a + v[i], 0) / pts.length) as unknown as Vec3

/** The eye-space LATERAL (wall-normal) unit axis, derived from the two stations:
 *  a +W and a -W placement differ ONLY in the wall axis, so (right − left) IS it,
 *  pointing FROM the left wall TOWARD the right wall. No basis decode required. */
function lateralAxis(right: ReturnType<typeof eyeOf>, left: ReturnType<typeof eyeOf>): Vec3 {
  const d = sub(right.station, left.station)
  expect(length(d), 'the two walls are laterally separated').toBeGreaterThan(1)
  return normalize(d)
}

describe('sw11-2 — trench wall GUN (TRENCH_TURRET) seats flush and mirrors per wall', () => {
  beforeEach(() => vi.mocked(drawWireframe).mockClear())

  const drawTwoGuns = () => {
    const draws = obstacleDraws(trenchScene(wallPair('turret', HEIGHT)), 'Trench Turret')
    expect(draws, 'render() draws a gun on each wall').toHaveLength(2)
    const [right, left] = [eyeOf(draws[0]), eyeOf(draws[1])]
    return { right, left, lateral: lateralAxis(right, left) }
  }

  // WALL BASE = the mounting plate, model indices 0-3 (`.WP WGA` "WALL BASE").
  const BASE = [0, 1, 2, 3]
  // GUN NOZZLE = the muzzle end, model indices 10-13 (`.WP WGA` "GUN NOZZLE").
  const NOZZLE = [10, 11, 12, 13]

  it('the base plate lies FLUSH against the vertical wall — it does not cantilever', () => {
    // A plate seated flush on a vertical wall has ~zero extent along the wall-normal
    // (the lateral axis). Today the base is a HORIZONTAL plate, so its full ±256
    // lateral width projects onto that axis — it juts straight off the wall.
    const { right, left, lateral } = drawTwoGuns()
    for (const [name, g] of [['right', right], ['left', left]] as const) {
      const base = BASE.map((i) => g.verts[i])
      expect(spread(base, lateral), `${name} wall: base plate is flush (no cantilever)`)
        .toBeLessThan(1)
      // and it did not collapse — the plate still spans the wall it lies on.
      expect(Math.max(...base.map((v) => length(sub(v, g.station)))), `${name} wall: base has real size`)
        .toBeGreaterThan(100)
    }
  })

  it('the barrel points INTO the channel on BOTH walls (the headline defect)', () => {
    // Barrel direction = nozzle centroid − base centroid, projected on the lateral
    // axis. "Into the channel" = toward the centreline: AWAY from the +W wall (a
    // NEGATIVE lateral projection) on the right, and TOWARD +lateral on the left.
    // Today both walls share one orientation, so the barrel points the SAME way on
    // both — correct on one wall, into the wall on the other.
    const { right, left, lateral } = drawTwoGuns()
    const barrel = (g: ReturnType<typeof eyeOf>): number =>
      dot(sub(centroid(NOZZLE.map((i) => g.verts[i])), centroid(BASE.map((i) => g.verts[i]))), lateral)

    expect(barrel(right), 'RIGHT wall: barrel points inboard (−lateral), into the channel')
      .toBeLessThan(0)
    expect(barrel(left), 'LEFT wall: barrel points inboard (+lateral), into the channel')
      .toBeGreaterThan(0)
  })

  it('the two walls are LATERAL MIRRORS of each other (FRPLGN vs FRPRGN)', () => {
    // The ROM handles left/right guns as mirrors throughout. Mirroring across the
    // trench centreline flips the lateral component and preserves height & depth.
    // Today the guns are IDENTICAL (same fixed orientation), so the lateral
    // components MATCH instead of NEGATING — the mirror is absent.
    const { right, left, lateral } = drawTwoGuns()
    let sawLateralExtent = false
    for (const i of [...BASE, ...NOZZLE]) {
      const rl = dot(sub(right.verts[i], right.station), lateral)
      const ll = dot(sub(left.verts[i], left.station), lateral)
      if (Math.abs(rl) > 1) sawLateralExtent = true
      expect(rl, `vertex ${i}: right-wall lateral is the mirror of the left-wall lateral`)
        .toBeCloseTo(-ll, 3)
    }
    expect(sawLateralExtent, 'the gun HAS lateral extent to mirror (guards a vacuous pass)').toBe(true)
  })
})

describe('sw11-2 — while here: SQUARE and CATWALK share the IDENTITY-orient defect', () => {
  beforeEach(() => vi.mocked(drawWireframe).mockClear())

  it('TRENCH_SQUARE (`.WP WPN`) also seats FLUSH — it is a horizontal plate today', () => {
    // The wall square is the same wall-panel table as TRENCH: a flat plate authored
    // in the x-z plane. On a vertical wall it must lie flush, not cantilever — the
    // less-obvious twin of the gun's defect.
    const draws = obstacleDraws(trenchScene(wallPair('square', HEIGHT)), 'Trench Square')
    expect(draws, 'render() draws a square on each wall').toHaveLength(2)
    const [right, left] = [eyeOf(draws[0]), eyeOf(draws[1])]
    const lateral = lateralAxis(right, left)
    for (const [name, g] of [['right', right], ['left', left]] as const) {
      expect(spread(g.verts, lateral), `${name} wall: square panel is flush (no cantilever)`)
        .toBeLessThan(1)
    }
  })

  it('TRENCH_CATWALK (`.WP WFF`) lateral fin points INTO the channel on both walls', () => {
    // The force field already stands vertical, but its front fin projects laterally
    // to ONE side. With no per-wall mirror that fin reaches into the channel on one
    // wall and into the WALL on the other — the same mirror the guns need.
    const draws = obstacleDraws(trenchScene(wallPair('catwalk', 0)), 'Trench Catwalk')
    expect(draws, 'render() draws a catwalk on each wall').toHaveLength(2)
    const [right, left] = [eyeOf(draws[0]), eyeOf(draws[1])]
    const lateral = lateralAxis(right, left)

    // The vertex reaching furthest along the wall-normal is the laterally-projecting fin.
    const finLateral = (g: ReturnType<typeof eyeOf>): number => {
      const projs = g.verts.map((v) => dot(sub(v, g.station), lateral))
      return projs.reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a), 0)
    }
    expect(Math.abs(finLateral(right)), 'the catwalk HAS a laterally-projecting fin').toBeGreaterThan(1)
    expect(finLateral(right), 'RIGHT wall: fin reaches inboard (−lateral)').toBeLessThan(0)
    expect(finLateral(left), 'LEFT wall: fin reaches inboard (+lateral)').toBeGreaterThan(0)
  })
})
