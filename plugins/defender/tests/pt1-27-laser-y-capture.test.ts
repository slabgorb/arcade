// tests/pt1-27-laser-y-capture.test.ts
//
// Story pt1-27 — RED phase (O'Brien / TEA). THE LASER MUST KEEP ITS FIRING ROW.
//
// THE DEFECT. The player-laser record (src/core/laser.ts LaserRecord) stores x, facing,
// alive — and NO y. Both consumers substitute the ship's LIVE row for every in-flight
// laser: the render draws each streak at `state.ship.y` (src/core/scene.ts, the
// drawLaserStreak call in composeFrame) and the collision queries at `shipRow`
// (src/core/sim.ts hitTestLasers). So firing a shot and then climbing or diving DRAGS
// every airborne shot to the ship's new row — it is drawn there (render bug) and it
// KILLS there (collision bug). Correct behavior: a laser captures the ship's row at
// fire time and keeps it, independent of later ship movement — as on the machine,
// where LFIRE spawns the beam at the ship's position and the travel loop
// (DEFA7.SRC LASR :2790 / LASL :2839) only ever advances PD horizontally; nothing in
// the ROM's laser process re-reads the ship's Y after the spawn.
//
// ─── THE CONTRACT THIS SUITE PINS (what GREEN/Dev must build) ─────────────────────
//   laser.ts   fire(shipX, facing, shipY) — a trailing shipY param (trailing, so the
//              existing df3-5 suite's two-arg calls stay untouched); the record
//              captures it and exposes `readonly y: number` on the Laser view. y is
//              FROZEN at fire time — travel never touches it.
//   sim.ts     the fire call site passes shipRow; hitTestLasers queries at `laser.y`,
//              not `shipRow`.
//   scene.ts   drawLaserStreak draws at `laser.y`, not `state.ship.y`.
//
// ─── WHY THE SIM GEOMETRY BELOW WORKS (the df6-1 fireWall precedent) ──────────────
// A fresh sim rests the ship at row 120 (INITIAL_Y), onscreen x px≈62. A laser fired
// facing right spawns at plax16+$704 → px≈76 and sweeps rightward ~7.8 px/tick (the
// ROM's $400/tick head advance, df8-4), dying at the ROM right edge after ~30 ticks.
// Holding `up` climbs the ship at 1..2
// rows/tick until the Y_TOP_FREEZE band (rows 42..43, ship.ts) parks it by ~tick 47.
// PODS are the wall enemy of choice: their drift path is unported (probes.ts — they
// stand perfectly still), wave 1 spawns none (so `pod-hit` is unambiguous), and their
// PRBP1 box is 4x8 (objects-data.ts), tall enough to absorb the exact freeze row.
// A wall at world cols 14..36 maps to px≈109..280 — squarely inside the laser's
// sweep, clear of the ship's own column (no ship-vs-pod body collision).
//
// ─── WHY THIS IS RED ──────────────────────────────────────────────────────────────
// Today the record has no y (undefined), the collision follows shipRow, and the
// streak follows state.ship.y — every test below fails on exactly one of those.

import { describe, it, expect } from 'vitest'
import { createScheduler } from '../src/core/scheduler.js'
import { createLaserBank } from '../src/core/laser.js'
import { createSim, stepSim, type Input, type SimState } from '../src/core/sim.js'
import { composeFrame } from '../src/core/scene.js'
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from '../src/shell/render.js'

const NEUTRAL: Input = { thrust: false, reverse: false, up: false, down: false, fire: false }
const withInput = (over: Partial<Input>): Input => ({ ...NEUTRAL, ...over })

/** Deterministic byte source (LCG) — the df3-6/df5-8/df6-1 shape; no ambient entropy. */
function makeRand(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return (s >>> 16) & 0xff
  }
}

// ─── The pt1-27 contract shim (the collision.test.ts pattern: a test-local view of the
//     shape GREEN must satisfy, cast over the real module so this suite compiles today
//     and stays valid after the fix). ────────────────────────────────────────────────
type Facing = 'right' | 'left'
interface TrackedLaser {
  readonly x: number
  readonly facing: Facing
  readonly alive: boolean
  /** pt1-27: the ship row CAPTURED at fire time — frozen for the laser's whole flight. */
  readonly y: number
}
interface TrackingLaserBank {
  readonly count: number
  readonly lasers: readonly TrackedLaser[]
  fire: (shipX: number, facing: Facing, shipY: number) => TrackedLaser | null
}
const tracking = (b: ReturnType<typeof createLaserBank>): TrackingLaserBank =>
  b as unknown as TrackingLaserBank

/** Read the (not-yet-existing) captured row off a sim-level laser view. */
const laserY = (l: { readonly x: number }): number | undefined =>
  (l as unknown as { y?: number }).y

// The staging surface (the df6-1 Rig pattern): the sim's OWN pod spawner — never a
// re-implemented collision — so the real hitTestLasers path is what reddens/greens.
interface PodRig {
  _podBank: {
    spawnPod: (x: number, y: number) => unknown
    pods: readonly { readonly y: number; readonly alive: boolean }[]
  }
}
const rig = (s: SimState): PodRig => s as unknown as PodRig

/** A wall of stationary pods across the laser's sweep band (world cols 14..36 →
 *  px≈109..280), at the given rows. Pods: unported drift = they DO NOT MOVE. */
function podWall(s: SimState, rows: readonly number[]): void {
  const r = rig(s)
  for (let col = 14; col <= 36; col += 2) for (const y of rows) r._podBank.spawnPod(col << 8, y)
}

/** Fire exactly once from the resting row, then hold `up` for the rest of the run. */
const fireThenClimb = (i: number): Input =>
  i === 0 ? withInput({ fire: true }) : withInput({ up: true })

/** Opening tick + setup + scripted run, collecting every cue kind seen (df6-1 collect). */
function runSim(
  seed: number,
  ticks: number,
  input: (i: number) => Input,
  setup?: (s: SimState) => void,
): { state: SimState; cues: Set<string> } {
  let s = createSim(makeRand(seed))
  s = stepSim(s, NEUTRAL) // the opening tick: wave 1 spawns; the ship rests at row 120
  if (setup) setup(s)
  const cues = new Set<string>()
  for (let i = 0; i < ticks; i++) {
    s = stepSim(s, input(i))
    for (const c of s.cues) cues.add(c.type)
  }
  return { state: s, cues }
}

// ══════════════════════════════════════════════════════════════════════════════════
// AC1 — unit (laser.ts): fire() captures the ship row into the record, and the record
// KEEPS it. The bank never sees the ship again after fire — a frozen per-record y is
// the only way the property can hold, so this pins the record shape itself.
// ══════════════════════════════════════════════════════════════════════════════════
describe('pt1-27 AC1 — the laser record captures its firing row (laser.ts)', () => {
  it('fire(shipX, facing, shipY) stores shipY on the record, and travel never touches it', () => {
    const sched = createScheduler()
    const bank = tracking(createLaserBank(sched))
    const laser = bank.fire(0x2000, 'right', 120)
    expect(laser, 'a fire under the cap spawns a laser').not.toBeNull()
    expect(laser!.y, 'the record must capture the fire-time ship row').toBe(120)

    const spawnX = laser!.x
    for (let i = 0; i < 5; i++) sched.stepTick()
    expect(laser!.x, 'the laser travelled (x advanced)').toBeGreaterThan(spawnX)
    expect(laser!.y, 'travel is HORIZONTAL only — the captured row is frozen').toBe(120)
  })

  it('two lasers fired from different rows each keep their OWN row', () => {
    const sched = createScheduler()
    const bank = tracking(createLaserBank(sched))
    const low = bank.fire(0x2000, 'right', 200)!
    const high = bank.fire(0x2000, 'right', 60)!
    for (let i = 0; i < 3; i++) sched.stepTick()
    expect(low.y, 'the first laser keeps the row it was fired from').toBe(200)
    expect(high.y, 'the second keeps ITS row — y is per-record, not bank-shared').toBe(60)
  })
})

// ══════════════════════════════════════════════════════════════════════════════════
// AC2 — sim: the SimState laser view carries the captured row, frozen while the ship
// climbs away. This is the wiring pin: sim.ts must pass shipRow into fire().
// ══════════════════════════════════════════════════════════════════════════════════
describe('pt1-27 AC2 — an in-flight laser keeps its fire row when the ship moves (sim.ts)', () => {
  it('state.lasers[].y stays at the firing row while the ship climbs 20+ rows', () => {
    let s = createSim(makeRand(7))
    s = stepSim(s, NEUTRAL)
    expect(s.ship.y, 'the fresh sim rests at INITIAL_Y').toBe(120)

    s = stepSim(s, withInput({ fire: true })) // fire from the resting row
    const fireRow = s.ship.y
    expect(fireRow, 'no vertical input on the fire tick — fired from row 120').toBe(120)
    expect(s.lasers.length, 'exactly one laser in flight').toBe(1)

    // 20 climb ticks: well inside the laser's ~30-tick flight at the df8-4 $400/tick step
    // (spawn $2704 → the $9800 edge in ~29 travel ticks), and 1..2 rows/tick of climb has
    // moved the ship ≥ 20 rows by then.
    for (let i = 0; i < 20; i++) s = stepSim(s, withInput({ up: true }))
    expect(s.ship.y, 'the ship genuinely left the firing row').toBeLessThan(fireRow - 20)

    const laser = s.lasers.find((l) => l.alive)
    expect(laser, 'the laser is still in flight (lifetime ~30 ticks)').toBeDefined()
    expect(
      laserY(laser!),
      'the in-flight laser must still carry the row it was FIRED from — not follow the ship',
    ).toBe(fireRow)
  })
})

// ══════════════════════════════════════════════════════════════════════════════════
// AC3 — behavior (the owner-visible collision bug): a shot fired at row 120 must NOT
// kill at the ship's NEW row, and MUST still kill at its OWN row. The two walls are
// identical except for their rows, so together they pin "the collision row is the
// laser's captured y" from both sides through the REAL hitTestLasers path.
// ══════════════════════════════════════════════════════════════════════════════════
describe('pt1-27 AC3 — collision happens at the laser’s own row, not the ship’s (sim.ts hitTestLasers)', () => {
  it('a shot fired at row 120 does NOT strike a wall parked at the ship’s NEW row (the dragged-shot bug)', () => {
    // Pods at rows 40+42: their 4x8 boxes blanket rows 40..50, covering the ship's
    // Y_TOP_FREEZE park band (42..43) wherever it lands. The laser (fired from row 120)
    // sweeps px ~76..291 beneath rows 40..50 over its ~30-tick flight (df8-4: $400/tick)
    // while the ship climbs into the band — a shipRow-based query would mow the wall down.
    const { state, cues } = runSim(7, 115, fireThenClimb, (s) => podWall(s, [40, 42]))
    expect(state.ship.y, 'the ship parked at the top freeze, inside the wall band').toBeLessThanOrEqual(44)
    expect(
      cues,
      'the laser was fired from row 120 — it must NOT collide at the ship’s new row (40s)',
    ).not.toContain('pod-hit')
    const pods = rig(state)._podBank.pods
    expect(pods.length, 'the wall is present (non-vacuity: 12 cols × 2 rows)').toBeGreaterThanOrEqual(24)
    expect(pods.every((p) => p.alive), 'every pod survived a shot that never crossed its row').toBe(true)
  })

  it('the same shot DOES strike a wall at its OWN firing row after the ship has left', () => {
    // The mirror wall: same columns, rows 116+118 (boxes blanket 116..126, covering the
    // firing row 120). The ship climbs away immediately — a shipRow-based query leaves
    // the band within ~13 ticks, before the laser reaches the first pod (px 109), and
    // never returns; only a laser that KEPT its own row still sweeps the wall.
    const { cues } = runSim(7, 115, fireThenClimb, (s) => podWall(s, [116, 118]))
    expect(
      cues,
      'the laser keeps killing along the row it was FIRED from, wherever the ship went',
    ).toContain('pod-hit')
  })
})

// ══════════════════════════════════════════════════════════════════════════════════
// AC4 — render (scene.ts): the streak is drawn on the laser's captured row, not
// dragged to the ship's live row. Pinned by the canonical DIFFER method: the same
// state composed with and without its lasers — the differing pixels ARE the streak.
// ══════════════════════════════════════════════════════════════════════════════════
describe('pt1-27 AC4 — the streak renders on the firing row (scene.ts composeFrame)', () => {
  it('after the ship climbs away, the laser pixels are on row 120 — not the ship’s new row', () => {
    let s = createSim(makeRand(7))
    s = stepSim(s, NEUTRAL)
    s = stepSim(s, withInput({ fire: true })) // fired from row 120
    // 20 climb ticks (RE-STAGED for df8-4: at the ROM's $400/tick the laser dies ~tick 30,
    // so the old 60-tick climb-to-the-park left it dead — climb while it still flies).
    for (let i = 0; i < 20; i++) s = stepSim(s, withInput({ up: true }))
    expect(s.ship.y, 'the ship climbed at least 25 rows off the firing row').toBeLessThanOrEqual(120 - 25)
    expect(s.lasers.some((l) => l.alive), 'the laser is still in flight at tick 21').toBe(true)

    // Same state, with and without its lasers: composeFrame is pure, so every differing
    // pixel is laser ink (drawLaserStreak is the only consumer of state.lasers).
    const withStreak = composeFrame(s, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const withoutStreak = composeFrame({ ...s, lasers: [] }, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const streakRows = new Set<number>()
    for (let i = 0; i < withStreak.data.length; i++) {
      if (withStreak.data[i] !== withoutStreak.data[i]) streakRows.add(Math.floor(i / withStreak.width))
    }

    expect(
      [...streakRows],
      'the streak must be drawn on the FIRING row (120), not follow the ship',
    ).toContain(120)
    for (const row of streakRows) {
      expect(row, 'no laser ink dragged up toward the ship’s new row').toBeGreaterThan(s.ship.y + 10)
    }
  })
})
