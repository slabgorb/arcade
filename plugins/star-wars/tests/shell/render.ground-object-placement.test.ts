// tests/shell/render.ground-object-placement.test.ts
//
// Story sw5-5 — RED phase (O'Brien / TEA): the ROM->world bridge for the ground
// objects, and the constants that hang off it.
//
// sw5-5 moves SURFACE_TOWER / TOWER_CAP / SURFACE_BUNKER into RAW ROM UNITS, so
// models.ts now holds ROM truth for them exactly as it already does for the TIE
// family (which is why those pairs compare clean on the contact sheet). The ROM
// authors ground objects with:
//
//     x = fore/aft   y = lateral   z = UP, recentred by GD$MDT   scale .S=120
//
// but the port's surface world is Y-UP with the floor at y=0. Something has to
// bridge the two. The shell is where that belongs, and the precedent is already
// in the file: TIE_ORIENT is a FIXED display correction that stands the ROM's
// TIE upright without touching the model. TOWER_ORIENT is the same idea, and it
// is IDENTITY today only because sw3-11 re-authored the ground models into the
// port's frame by hand — the very thing this story undoes.
//
// So these tests pin the CONTRACT of the bridge (where the tower ends up), never
// the matrix that implements it. Dev stays free to compose it however reads best.
//
// -- pt1-3: THE SURFACE RENDERS AT 1:1 RAW ROM UNITS ------------------------
//
// sw5-5 originally drew the ground objects at a 1/30 PRESENTATION scale (footprint
// 960 -> 32, height 10560 -> 352, altitude 3840 -> 128). pt1-3 retired that stale
// pre-migration fudge (2026-08-08 projection audit §5/§6.2): the surface now
// renders at 1:1 raw ROM units, like the space/trench phases and every other
// model, so GROUND_MODEL_SCALE = 1 and these placement values ARE the ROM numbers
// verbatim. The heights/footprint/altitude below are the raw values; their RATIOS
// (aspect, skim fraction) are unchanged from the presentation era.
//
// -- WHAT THE BRIDGE MUST PRESERVE, AND WHAT IT MUST CHANGE ------------------
//
// PRESERVE: the tower's FOOTPRINT. The ROM base ring is r=8 -> 8*120 = 960 raw
// units, drawn 1:1. The tower must not get wider; the maze spacing and hit radii
// all assume that raw footprint.
//
// CHANGE: the tower's HEIGHT. sw3-11 read the `.PGND` height column in decimal
// when WSOBJ.MAC is `.RADIX 16` (see tests/core/ground-objects-rom.test.ts), so
// the shipped tower was too short. Read correctly the rings land at, in raw world
// y (= the presentation-era values × 30):
//
//     h=0x00  ->      0     base            (on the floor)
//     h=0x06  ->    720     near bottom
//     h=0x14  ->   2400     midline
//     h=0x52  ->   9840     bottom of cannon
//     h=0x58  -> 10560      top of cannon    <- TOWER_HEIGHT (0x58 x 120)
//
// -- GD$MDT IS THE SKIM ALTITUDE --------------------------------------------
//
// GD$MDT (0xF00 = 3840) is not a cosmetic offset. Its comment is "OFFSET HITE TO
// MID OF PLAYERS HITE": the ROM recentres the tower so that model z=0 sits at the
// height the player flies at. At 1:1 raw scale that IS SKIM_ALTITUDE = 3840 (was
// 3840/30 = 128 in the presentation era) — so the ROM has been telling us the skim
// altitude all along.

import { describe, it, expect } from 'vitest'
import { TOWER_ORIENT, GROUND_MODEL_SCALE, modelMatrix } from '../../src/shell/render'
import { SURFACE_TOWER, TOWER_CAP, SURFACE_BUNKER, type Model3D } from '../../src/core/models'
import { TOWER_HEIGHT, SKIM_ALTITUDE, TURRET_HIT_RADIUS } from '../../src/core/state'
import { transform, type Vec3 } from '@shared/math3d'

const GD$MDT = 0xf00 // 3840 — the ROM's own "mid of player's height"

/** The model as the shell actually places it: a ground object standing at the
 *  world origin. Exactly the composition render.ts uses per turret, with the
 *  turret's own position left at the origin so world == placed. */
function placed(m: Model3D): Vec3[] {
  const mat = modelMatrix([0, 0, 0], TOWER_ORIENT, GROUND_MODEL_SCALE)
  return m.vertices.map((v) => transform(mat, v))
}

/** Only the points a model's edges actually stroke — what the player SEES. */
function placedDrawn(m: Model3D): Vec3[] {
  const used = new Set(m.edges.flat())
  return placed(m).filter((_, i) => used.has(i))
}

// sw10-1 native [depth, right, up]: height is the up axis (index 2), the footprint
// spreads across the horizontal depth/right plane (indices 0 and 1).
const ys = (vs: Vec3[]) => vs.map((v) => v[2])
/** Horizontal distance from the tower's axis — the footprint radius. */
const radii = (vs: Vec3[]) => vs.map((v) => Math.hypot(v[0], v[1]))

describe('sw5-5 — the ROM ground objects land correctly in the y-up world', () => {
  // FIRST, and deliberately so. `modelMatrix(pos, orient, s = 1)` has a DEFAULT
  // parameter, so if the shell never exports GROUND_MODEL_SCALE the import lands
  // as `undefined`, the default silently takes over, and the placement tests below
  // quietly measure an unscaled model instead of failing. Pin the export itself so
  // that trapdoor is nailed shut: this test fails loudly, first, and by name.
  it('the shell exports the ROM -> world scale, now 1:1 raw (pt1-3)', () => {
    expect(typeof GROUND_MODEL_SCALE, 'src/shell/render.ts must export GROUND_MODEL_SCALE').toBe('number')
    // pt1-3: the surface renders at 1:1 raw ROM units — the ÷30 presentation fudge
    // is retired. The ROM base ring r=8 -> 8 * .S(120) = 960 raw units draws at 960.
    expect(GROUND_MODEL_SCALE).toBe(1)
    expect(960 * GROUND_MODEL_SCALE).toBe(960)
  })

  it('TOWER_ORIENT actually reorients — the ROM model is z-up and cannot ship as IDENTITY', () => {
    // Guard against the tempting non-fix: swapping models.ts to ROM units and
    // leaving the orient alone. The model would render on its side, and every
    // other assertion here would be the only thing to catch it.
    const p = placed(SURFACE_TOWER)
    const spreadY = Math.max(...ys(p)) - Math.min(...ys(p))
    expect(spreadY, 'the tower must be tall along WORLD Y, not lying flat').toBeGreaterThan(300)
  })

  it('stands ON the floor: the base ring sits at y = 0', () => {
    const base = placed(SURFACE_TOWER).filter((_, i) => [0, 1, 2].includes(i))
    for (const v of base) expect(v[2]).toBeCloseTo(0) // native up axis: base sits on the floor
  })

  it('keeps the shipped FOOTPRINT: the base ring is r = 960 raw units', () => {
    // The tower gets taller, never wider. pt1-3: raw 1:1 scale, so the base ring is
    // r=8 * .S(120) = 960 raw (was 32 at the ÷30 presentation scale). The maze
    // spacing/hit radii all assume it.
    const base = placed(SURFACE_TOWER).filter((_, i) => [0, 1, 2].includes(i))
    for (const r of radii(base)) expect(r).toBeCloseTo(960)
  })

  it('puts every ring at its true HEX height — 0 / 720 / 2400 / 9840 / 10560 (raw)', () => {
    // The decimal misread put the midline low and the cannon short. pt1-3: raw 1:1
    // scale, so the rings land at the ROM values × 30 (0/24/80/328/352 was the ÷30
    // presentation era). If a future edit reverts to decimal, these numbers move.
    const levels = [...new Set(ys(placed(SURFACE_TOWER)).map((y) => Math.round(y)))]
    expect(levels.sort((a, b) => a - b)).toEqual([0, 720, 2400, 9840, 10560])
  })

  it('the cannon top is the composite peak, and TOWER_HEIGHT is exactly it (WYSIWYG)', () => {
    // state.ts documents TOWER_HEIGHT as the drawn peak — sim.ts launches every
    // tower fireball from `pos.y + TOWER_HEIGHT`, so if this drifts the shot
    // erupts out of thin air. The peak is only DRAWN by the cap (STB leaves the
    // cannon-top ring bare), so the composite is what counts.
    const composite = [...placedDrawn(SURFACE_TOWER), ...placedDrawn(TOWER_CAP)]
    expect(Math.max(...ys(composite))).toBeCloseTo(TOWER_HEIGHT)
    expect(TOWER_HEIGHT).toBe(10560) // pt1-3: raw ROM units (0x58 × 120); was 352 at ÷30
  })

  it('is the ROM aspect — 0x58 tall on a 16-wide base, ~5.5:1, not the 3.6:1 of the misread', () => {
    const p = placed(SURFACE_TOWER)
    const width = 2 * Math.max(...radii(p.filter((_, i) => [0, 1, 2].includes(i))))
    expect(TOWER_HEIGHT / width).toBeCloseTo(0x58 / 16, 1)
  })
})

describe('sw5-5 — the bunker is still the SHORTY once placed', () => {
  it('stands on the floor and reaches only the near-bottom ring (h=6 -> y=720 raw)', () => {
    const p = placedDrawn(SURFACE_BUNKER)
    expect(Math.min(...ys(p))).toBeCloseTo(0)
    expect(Math.max(...ys(p))).toBeCloseTo(720) // pt1-3: raw (h=6 × 120); was 24 at ÷30
  })

  it('is squat: no taller than half its own width (the macro\'s own word, "SHORTY")', () => {
    const p = placedDrawn(SURFACE_BUNKER)
    const height = Math.max(...ys(p)) - Math.min(...ys(p))
    const width = 2 * Math.max(...radii(p))
    expect(height).toBeLessThanOrEqual(width / 2)
  })

  it('is dwarfed by the corrected tower — under a sixth of its height', () => {
    const height = Math.max(...ys(placedDrawn(SURFACE_BUNKER)))
    expect(height).toBeLessThan(TOWER_HEIGHT / 6)
  })
})

// ---------------------------------------------------------------------------
// AC-5 — the collision consequences of a taller tower, stated out loud.
// ---------------------------------------------------------------------------

describe('sw5-5 AC-5 — the collidable volume, and what the taller tower does to it', () => {
  it('GD$MDT IS the skim altitude: SKIM_ALTITUDE is derived from the ROM, not guessed', () => {
    expect(SKIM_ALTITUDE).toBe(GD$MDT * GROUND_MODEL_SCALE)
    expect(SKIM_ALTITUDE).toBe(3840) // pt1-3: raw (= GD$MDT); was 128 at ÷30
  })

  it('the ship flies at the ROM\'s true fraction of tower height (GD$MDT / the tower\'s height)', () => {
    // The tower spans h=0 to h=0x58, so its height in raw ROM units is
    // 0x58 * .S = 10560 — NOT the recentred z of its peak (6720), which is a
    // coordinate, not a height. 3840 / 10560 = 0.3636...
    //
    // The old pairing (120 / 232) put the ship at 52% — roughly mid-tower, which
    // is what state.ts's comment claimed to want, but it was measuring against a
    // tower that had been transcribed too short. Corrected, the towers LOOM.
    const romFraction = GD$MDT / (0x58 * 120)
    expect(romFraction).toBeCloseTo(0.3636, 4)
    expect(SKIM_ALTITUDE / TOWER_HEIGHT).toBeCloseTo(romFraction, 4)
  })

  it('the hit VOLUME itself is unchanged — a bolt at the tower base still kills it', () => {
    // AC-5 asks for any change in the collidable volume to be called out. There
    // is none: a turret is a TURRET_HIT_RADIUS sphere centred on its base, and
    // this story does not touch it. What changes is the tower drawn AROUND it.
    expect(TURRET_HIT_RADIUS).toBe(6000) // pt1-3: raw ROM units; was 200 at ÷30
  })

  it('CALLED OUT: the hit sphere no longer reaches the cannon — the top of the tower is not shootable', () => {
    // This is the consequence AC-5 wants surfaced rather than discovered later.
    // The sphere reaches y=6000 (raw) from the base; the tower peaks at 10560, so
    // the entire cannon section (from y=9840) sits outside the hit volume. pt1-3:
    // raw ROM units throughout — the presentation era read 200 / 328 / 352, same
    // ratios.
    //
    // Deliberately NOT fixed here: growing the radius is a play-balance decision,
    // not a fidelity one, and the ROM's own turret hit test is not yet recovered.
    // Logged as a Delivery Finding. Pinned so the gap cannot go quiet.
    const cannonSeat = 9840
    expect(TURRET_HIT_RADIUS).toBeLessThan(cannonSeat)
    expect(TOWER_HEIGHT - TURRET_HIT_RADIUS, 'unshootable metres of tower').toBe(4560)
  })
})
