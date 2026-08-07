// plugins/missile-command/tests/icbm.test.ts
//
// Story mc3-1 — RED phase (Han Solo / TEA). AC1 + AC2: the enemy ICBM as a PURE
// core reducer, the mirror of the player abm.ts. `src/core/icbm.ts` launches a
// warhead from a top-edge origin, flies it in a STRAIGHT LINE at constant unit
// speed to a ground target (a city/base position), and reports ARRIVAL when the
// head reaches the target. Core owns the geometry; the shell never computes it.
//
// ─── GROUND TRUTH (REV-01 W3MAIN.MAC; W3MAIN is DOUBLE-SPACED, cites are logical
//     non-blank lines ≈ physical/2 — grep the `.SBTTL`/label, not the raw line) ──
//   UPDATE ICBM POSITIONS  (UPDPOS motion for enemy warheads) — each tick every
//     live ICBM head advances by its per-ICBM velocity vector toward its ground
//     target; it lands when the head reaches the target. Straight line, constant
//     step, arrival snap. mc3 models the SHAPE at unit speed (SPEED = 1); the
//     per-wave enemy-speed table is mc4 difficulty, so NO new claimed constant
//     here (speed 1 is trivial-exempt).
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// `src/core/icbm.ts` does not exist yet. `loadIcbm()` dynamic-imports it and
// throws a self-describing "not built yet" (never a bare module-resolution stack
// trace), so every reducer test reddens for the FEATURE's absence. Purity of the
// new module is guarded automatically by the src/core sweep in purity.test.ts the
// moment the file lands — this file does not re-assert it.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// ─── The contract GREEN (Yoda / Dev) implements: src/core/icbm.ts ────────────

/** A point in cabinet coordinates (V origin at the BOTTOM, as field.ts/cursor.ts). */
interface Vec {
  readonly h: number
  readonly v: number
}

/** An enemy ICBM in flight. The trail render.ts paints is `origin`→`pos`. */
interface Icbm {
  /** The top-edge launch column (fixed for the flight). */
  readonly origin: Vec
  /** The ground structure the warhead flies toward (fixed for the flight). */
  readonly target: Vec
  /** The warhead head's current position; starts at `origin`. */
  readonly pos: Vec
  /** True once the head has reached the target (UPDPOS "AT TARGET"). */
  readonly arrived: boolean
}

interface IcbmModule {
  /** Launch from `origin` toward `target`: pos = origin, arrived = false. Pure. */
  launchIcbm: (origin: Vec, target: Vec) => Icbm
  /** Advance one tick along the straight line by ~one unit; snaps to target on arrival. Pure. */
  stepIcbm: (icbm: Icbm) => Icbm
}

// Variable specifier + `/* @vite-ignore */` so `tsc --noEmit` (the release gate)
// stays green while icbm.ts is still absent — the fleet idiom for a RED import of
// a not-yet-built module (abm.test.ts / cursor.test.ts / field.test.ts).
const ICBM_SPECIFIER = '../src/core/icbm.js'

async function loadIcbm(): Promise<IcbmModule> {
  try {
    const mod = (await import(/* @vite-ignore */ ICBM_SPECIFIER)) as Partial<IcbmModule>
    if (typeof mod.launchIcbm !== 'function' || typeof mod.stepIcbm !== 'function') {
      throw new Error('module has no `launchIcbm`/`stepIcbm` export')
    }
    return mod as IcbmModule
  } catch (e) {
    throw new Error(
      'icbm core module not built yet — GREEN (Yoda) creates src/core/icbm.ts, a PURE reducer ' +
        'exporting launchIcbm(origin, target) (pos=origin, arrived=false) and stepIcbm(icbm) that ' +
        'advances the head ~1 unit along the STRAIGHT line origin→target and SNAPS to the target ' +
        'on arrival (no overshoot), then arrived=true. Straight, monotonic, constant unit speed ' +
        '(UPDATE ICBM POSITIONS, W3MAIN). No clock, no entropy, no shell import (purity.test.ts ' +
        `sweeps it). (${(e as Error).message})`,
    )
  }
}

// ─── geometry helpers (test-side, so the assertions read plainly) ────────────

const dist = (a: Vec, b: Vec): number => Math.hypot(a.h - b.h, a.v - b.v)

/** Perpendicular distance from point p to the infinite line through a and b. */
const perpDist = (p: Vec, a: Vec, b: Vec): number => {
  const len = dist(a, b)
  if (len === 0) return dist(p, a)
  const cross = (b.h - a.h) * (p.v - a.v) - (b.v - a.v) * (p.h - a.h)
  return Math.abs(cross) / len
}

/** Step until arrival; return every ICBM state visited (inclusive of launch + arrival). */
const flightPath = (mod: IcbmModule, origin: Vec, target: Vec, cap = 2000): Icbm[] => {
  const frames: Icbm[] = [mod.launchIcbm(origin, target)]
  let cur = frames[0]
  for (let i = 0; i < cap && !cur.arrived; i++) {
    cur = mod.stepIcbm(cur)
    frames.push(cur)
  }
  return frames
}

// A representative top-edge launch column and a ground city target (CITY1H/V).
const ORIGIN: Vec = { h: 120, v: 210 } // top-edge launch (high V; V grows upward)
const GROUND: Vec = { h: 95, v: 16 } // city 1 position, near the bottom

describe('mc3-1 AC1 — launchIcbm parks the warhead at its top-edge origin, aimed at the ground target', () => {
  it('pos begins exactly at origin and has not arrived', async () => {
    const { launchIcbm } = await loadIcbm()
    const i = launchIcbm(ORIGIN, GROUND)
    expect(i.pos).toEqual(ORIGIN)
    expect(i.arrived).toBe(false)
  })

  it('records the origin and target it was launched with', async () => {
    const { launchIcbm } = await loadIcbm()
    const i = launchIcbm(ORIGIN, GROUND)
    expect(i.origin).toEqual(ORIGIN)
    expect(i.target).toEqual(GROUND)
  })
})

describe('mc3-1 AC1 — the warhead flies a STRAIGHT LINE toward its target', () => {
  it('every in-flight head sits on the origin→target segment (within rounding)', async () => {
    const mod = await loadIcbm()
    for (const i of flightPath(mod, ORIGIN, GROUND)) {
      // Unit-velocity stepping can sit at most ~1 unit off the ideal line; a real
      // straight-line flight stays inside that tube. A warhead that wandered
      // (wrong velocity sign, per-axis desync) would leave it.
      expect(
        perpDist(i.pos, ORIGIN, GROUND),
        `head strayed off the launch→target line at pos (${i.pos.h},${i.pos.v})`,
      ).toBeLessThanOrEqual(1.5)
    }
  })

  it('closes the distance to the target monotonically each tick', async () => {
    const mod = await loadIcbm()
    const path = flightPath(mod, ORIGIN, GROUND)
    for (let i = 1; i < path.length; i++) {
      const before = dist(path[i - 1].pos, GROUND)
      const after = dist(path[i].pos, GROUND)
      expect(after, `distance to target grew at tick ${i} (${before} → ${after})`).toBeLessThanOrEqual(
        before + 1e-9,
      )
    }
    // and it actually moved — the final approach is strictly closer than launch
    expect(dist(path[path.length - 1].pos, GROUND)).toBeLessThan(dist(ORIGIN, GROUND))
  })

  it('never overshoots: the head stays within the bounding box of origin and target', async () => {
    const mod = await loadIcbm()
    const loH = Math.min(ORIGIN.h, GROUND.h)
    const hiH = Math.max(ORIGIN.h, GROUND.h)
    const loV = Math.min(ORIGIN.v, GROUND.v)
    const hiV = Math.max(ORIGIN.v, GROUND.v)
    for (const i of flightPath(mod, ORIGIN, GROUND)) {
      expect(i.pos.h).toBeGreaterThanOrEqual(loH - 1)
      expect(i.pos.h).toBeLessThanOrEqual(hiH + 1)
      expect(i.pos.v).toBeGreaterThanOrEqual(loV - 1)
      expect(i.pos.v).toBeLessThanOrEqual(hiV + 1)
    }
  })
})

describe('mc3-1 AC1 — the warhead ARRIVES at the target and snaps to it', () => {
  it('reaches arrived=true within a bounded number of ticks', async () => {
    const mod = await loadIcbm()
    const path = flightPath(mod, ORIGIN, GROUND)
    const last = path[path.length - 1]
    expect(last.arrived, 'the ICBM never arrived within the step cap').toBe(true)
    expect(path.length).toBeLessThan(2000)
  })

  it('the arrived head sits exactly on the target (no lingering offset)', async () => {
    const mod = await loadIcbm()
    const path = flightPath(mod, ORIGIN, GROUND)
    const last = path[path.length - 1]
    expect(last.pos).toEqual(last.target)
  })

  it('a target AT the origin arrives on the first step without dividing by zero', async () => {
    const { launchIcbm, stepIcbm } = await loadIcbm()
    const i = stepIcbm(launchIcbm(ORIGIN, ORIGIN))
    expect(i.pos).toEqual(ORIGIN)
    expect(i.arrived).toBe(true)
  })
})

describe('mc3-1 AC1 — stepIcbm is idempotent once arrived and never mutates its input', () => {
  it('stepping an already-arrived ICBM keeps it parked on the target', async () => {
    const { launchIcbm, stepIcbm } = await loadIcbm()
    const arrived = stepIcbm(launchIcbm(ORIGIN, ORIGIN))
    expect(arrived.arrived).toBe(true)
    expect(stepIcbm(arrived)).toEqual(arrived)
  })

  it('stepIcbm does not mutate the ICBM it is given, and returns a fresh object', async () => {
    const { launchIcbm, stepIcbm } = await loadIcbm()
    const i = launchIcbm(ORIGIN, GROUND)
    const snapshot = JSON.parse(JSON.stringify(i))
    const out = stepIcbm(i)
    expect(i).toEqual(snapshot) // input untouched
    expect(out).not.toBe(i) // a fresh object
  })
})

describe('mc3-1 AC1 — constant unit speed: a farther target takes proportionally more ticks', () => {
  it('a target twice as far takes strictly more ticks (not a fixed frame count)', async () => {
    const mod = await loadIcbm()
    const near: Vec = { h: ORIGIN.h + 40, v: ORIGIN.v - 30 } //  |Δ| = 50
    const far: Vec = { h: ORIGIN.h + 120, v: ORIGIN.v - 90 } //  |Δ| = 150
    const nearTicks = flightPath(mod, ORIGIN, near).length
    const farTicks = flightPath(mod, ORIGIN, far).length
    expect(farTicks, 'a fixed-frame flight (speed ∝ distance) would fail this').toBeGreaterThan(
      nearTicks,
    )
  })

  it('flies straight and arrives for a spread of ground targets across the field (fuzz)', async () => {
    const mod = await loadIcbm()
    for (let h = 12; h <= 244; h += 58) {
      for (let v = 12; v <= 40; v += 12) {
        const target: Vec = { h, v }
        const path = flightPath(mod, ORIGIN, target)
        const last = path[path.length - 1]
        expect(last.arrived, `did not arrive for target (${h},${v})`).toBe(true)
        expect(last.pos, `did not snap to target (${h},${v})`).toEqual(target)
        for (const i of path) {
          expect(
            perpDist(i.pos, ORIGIN, target),
            `off-line for target (${h},${v})`,
          ).toBeLessThanOrEqual(1.5)
        }
      }
    }
  })
})

describe('mc3-1 AC1 — icbm reducers are pure (deterministic for the same input)', () => {
  it('launchIcbm/stepIcbm return the same result for the same inputs', async () => {
    const { launchIcbm, stepIcbm } = await loadIcbm()
    expect(stepIcbm(launchIcbm(ORIGIN, GROUND))).toEqual(stepIcbm(launchIcbm(ORIGIN, GROUND)))
  })
})

describe('mc3-1 AC2 — icbm.ts carries its W3MAIN source citation', () => {
  // AC2: a source-of-truth comment must name the module and the ICBM motion
  // routine. mc3 defers the byte-exact claim for the flight math (it is unit
  // speed, trivial-exempt); the enforceable form here is a raw source-text scan.
  const icbmSrc = (): string => readFileSync(join(root, 'src', 'core', 'icbm.ts'), 'utf8')

  it('names the source module W3MAIN — where the ICBM flight routine lives', () => {
    expect(icbmSrc(), 'must cite W3MAIN').toMatch(/W3MAIN/)
  })

  it('cites the ICBM motion routine it models (UPDATE ICBM POSITIONS / UPDPOS)', () => {
    // NB: no bare `ICBM` alternative — it would match the module's own name and
    // type identifiers, making this guard unfalsifiable (Reviewer, rule_checker
    // #15/#25). The two named routines only appear in the source-of-truth comment.
    expect(
      icbmSrc(),
      'must name the enemy-warhead motion routine it mirrors',
    ).toMatch(/UPDATE ICBM POSITIONS|UPDPOS/)
  })
})
