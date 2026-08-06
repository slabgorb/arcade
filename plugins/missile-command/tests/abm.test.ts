// plugins/missile-command/tests/abm.test.ts
//
// Story mc1-4 — RED phase (Han Solo / TEA). AC1 (flight half): the player ABM as
// a PURE core reducer. `src/core/abm.ts` launches a missile from a base position
// to the crosshair target, flies it in a STRAIGHT LINE at ~constant speed, and
// reports ARRIVAL when it reaches the target (where explosion.ts then detonates a
// blast — explosion.test.ts). Core owns the geometry; the shell (shell/input.ts,
// fire.test.ts) only chooses WHICH base fires and hands the target in.
//
// ─── GROUND TRUTH (REV-01 W3MAIN.MAC; W3MAIN is DOUBLE-SPACED, cites are logical
//     non-blank lines ≈ physical/2 — grep the `.SBTTL`/label, not the raw line) ──
//   LAUNCH ABMS               W3MAIN:606  (ABMLAU, phys 1213) — a fire launches a
//     missile from its base toward the cursor.
//   UPDATE MISSILE POSITION   W3MAIN:854  (UPDPOS, phys 1719) — each tick the head
//     advances by a constant velocity vector: `ABCP += ABVE`; the routine returns
//     CS "AT TARGET" once the new position reaches/passes the target array (ABTA),
//     CC "not there yet" otherwise. Straight line, constant step, arrival snap.
//   CALC MISSILE VELOCITY     W3MAIN:1640 (ABMVEL, phys 3279) — the per-tick step
//     is the UNIT vector toward the target: ABVE = delta / totalDelta, where
//     totalDelta ≈ MAX_DELTA + 3/8·MIN_DELTA (a fast integer Euclidean distance,
//     CALC DELTA W3MAIN:1589/phys 3177). Unit velocity ⇒ speed ≈ 1 cabinet unit
//     per tick ⇒ a farther target takes proportionally MORE ticks (constant speed,
//     NOT a fixed frame count). The exact 8.8 fixed-point of the ROM's DIVIDE is
//     mc2 fidelity; the skeleton pins the SHAPE: straight, monotonic, constant
//     speed, arrival-snaps to the target without overshoot.
//
// ─── SCOPE RULING (owner, 2026-08-06): per-key specific base, source-faithful ──
// REV-01 has three fire switches each hard-wired to its own base (FIREMA: .BYTE
// MFIREL,MFIREC,MFIRER, ABMLAU). There is NO "nearest live base" auto-select in the
// source, so despite AC1's wording this core exposes NO nearestLiveBase(): the
// SHELL picks the base by key (fire.test.ts) and hands its position in as `origin`.
// abm.ts is base-agnostic: it flies from whatever origin it is given to the target.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// `src/core/abm.ts` does not exist yet. `loadAbm()` dynamic-imports it and throws a
// self-describing "not built yet" (never a bare module-resolution stack trace), so
// every reducer test reddens for the FEATURE's absence. Purity of the new module is
// guarded automatically by the src/core sweep in purity.test.ts the moment the file
// lands — this file does not re-assert it.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// ─── The contract GREEN (Yoda / Dev) implements: src/core/abm.ts ─────────────

/** A point in cabinet coordinates (V origin at the BOTTOM, as field.ts/cursor.ts). */
interface Vec {
  readonly h: number
  readonly v: number
}

/** A player ABM in flight. The trail render.ts paints is `origin`→`pos`. */
interface Abm {
  /** The launching base's position (fixed for the flight). */
  readonly origin: Vec
  /** The crosshair target the missile flies toward (fixed for the flight). */
  readonly target: Vec
  /** The missile head's current position; starts at `origin`. */
  readonly pos: Vec
  /** True once the head has reached the target (UPDPOS "AT TARGET", CS). */
  readonly arrived: boolean
}

interface AbmModule {
  /** Launch from `origin` toward `target`: pos = origin, arrived = false. Pure. */
  launchAbm: (origin: Vec, target: Vec) => Abm
  /** Advance one tick along the straight line by ~one unit; snaps to target on arrival. Pure. */
  stepAbm: (abm: Abm) => Abm
}

// Variable specifier + `/* @vite-ignore */` so `tsc --noEmit` (the release gate)
// stays green while abm.ts is still absent — the fleet idiom for a RED import of a
// not-yet-built module (cursor.test.ts, field.test.ts, asteroids audio-migration).
const ABM_SPECIFIER = '../src/core/abm.js'

async function loadAbm(): Promise<AbmModule> {
  try {
    const mod = (await import(/* @vite-ignore */ ABM_SPECIFIER)) as Partial<AbmModule>
    if (typeof mod.launchAbm !== 'function' || typeof mod.stepAbm !== 'function') {
      throw new Error('module has no `launchAbm`/`stepAbm` export')
    }
    return mod as AbmModule
  } catch (e) {
    throw new Error(
      'abm core module not built yet — GREEN (Yoda) creates src/core/abm.ts, a PURE reducer ' +
        'exporting launchAbm(origin, target) and stepAbm(abm). launchAbm sets pos=origin, ' +
        'arrived=false. stepAbm advances the head along the STRAIGHT line origin→target by the ' +
        'UNIT velocity toward the target (~1 cabinet unit/tick, ABVE=delta/totalDelta, ' +
        'W3MAIN CALC MISSILE VELOCITY :1640), reaching the target after ≈distance ticks and ' +
        'SNAPPING to it exactly on arrival (no overshoot), then arrived=true (UPDPOS :854). No ' +
        'nearest-base logic (owner ruling: per-key base is the shell\'s job). No shell import, no ' +
        `clock, no entropy (purity.test.ts sweeps it). (${(e as Error).message})`,
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

/** Step until arrival; return every position visited (inclusive of launch + arrival). */
const flightPath = (mod: AbmModule, origin: Vec, target: Vec, cap = 2000): Abm[] => {
  const frames: Abm[] = [mod.launchAbm(origin, target)]
  let cur = frames[0]
  for (let i = 0; i < cap && !cur.arrived; i++) {
    cur = mod.stepAbm(cur)
    frames.push(cur)
  }
  return frames
}

// A representative base (BASES[0], field.ts) and an interior crosshair target.
const BASE: Vec = { h: 0x14, v: 0x16 } // left missile base (20, 22)
const TARGET: Vec = { h: 120, v: 160 } // an interior crosshair (inside the play area)

describe('AC1 — launchAbm starts the missile at the base, aimed at the target', () => {
  it('pos begins exactly at origin and has not arrived', async () => {
    const { launchAbm } = await loadAbm()
    const abm = launchAbm(BASE, TARGET)
    expect(abm.pos).toEqual(BASE)
    expect(abm.arrived).toBe(false)
  })

  it('records the origin and target it was launched with', async () => {
    const { launchAbm } = await loadAbm()
    const abm = launchAbm(BASE, TARGET)
    expect(abm.origin).toEqual(BASE)
    expect(abm.target).toEqual(TARGET)
  })
})

describe('AC1 — the missile flies in a STRAIGHT LINE toward the target', () => {
  it('every in-flight head sits on the origin→target segment (within rounding)', async () => {
    const mod = await loadAbm()
    for (const p of flightPath(mod, BASE, TARGET)) {
      // Unit-velocity integer stepping can sit at most ~1 unit off the ideal line;
      // a real straight-line flight stays inside that tube. A missile that wandered
      // (bug: wrong velocity sign, per-axis desync) would leave it.
      expect(
        perpDist(p.pos, BASE, TARGET),
        `head strayed off the launch→target line at pos (${p.pos.h},${p.pos.v})`,
      ).toBeLessThanOrEqual(1.5)
    }
  })

  it('never overshoots: the head stays within the bounding box of origin and target', async () => {
    const mod = await loadAbm()
    const loH = Math.min(BASE.h, TARGET.h)
    const hiH = Math.max(BASE.h, TARGET.h)
    const loV = Math.min(BASE.v, TARGET.v)
    const hiV = Math.max(BASE.v, TARGET.v)
    for (const p of flightPath(mod, BASE, TARGET)) {
      expect(p.pos.h).toBeGreaterThanOrEqual(loH - 1)
      expect(p.pos.h).toBeLessThanOrEqual(hiH + 1)
      expect(p.pos.v).toBeGreaterThanOrEqual(loV - 1)
      expect(p.pos.v).toBeLessThanOrEqual(hiV + 1)
    }
  })

  it('closes the distance to the target monotonically each tick', async () => {
    const mod = await loadAbm()
    const path = flightPath(mod, BASE, TARGET)
    for (let i = 1; i < path.length; i++) {
      const before = dist(path[i - 1].pos, TARGET)
      const after = dist(path[i].pos, TARGET)
      expect(after, `distance grew at tick ${i} (${before} → ${after})`).toBeLessThanOrEqual(before)
    }
    // and it actually moved — the last approach is strictly closer than launch
    expect(dist(path[path.length - 1].pos, TARGET)).toBeLessThan(dist(BASE, TARGET))
  })
})

describe('AC1 — the missile ARRIVES at the target and snaps to it', () => {
  it('reaches arrived=true within a bounded number of ticks', async () => {
    const mod = await loadAbm()
    const path = flightPath(mod, BASE, TARGET)
    const last = path[path.length - 1]
    expect(last.arrived, 'the ABM never arrived within the step cap').toBe(true)
    // ~1 unit/tick ⇒ ticks ≈ distance; allow generous slack, but it must terminate.
    expect(path.length).toBeLessThan(2000)
  })

  it('the arrived head sits exactly on the target (no lingering offset)', async () => {
    const mod = await loadAbm()
    const path = flightPath(mod, BASE, TARGET)
    const last = path[path.length - 1]
    expect(last.pos).toEqual(last.target)
  })

  it('stepping an already-arrived ABM keeps it parked on the target (idempotent)', async () => {
    const mod = await loadAbm()
    const path = flightPath(mod, BASE, TARGET)
    const arrived = path[path.length - 1]
    const again = mod.stepAbm(arrived)
    expect(again.arrived).toBe(true)
    expect(again.pos).toEqual(arrived.target)
  })

  it('a target AT the origin arrives immediately without moving or dividing by zero', async () => {
    const { launchAbm, stepAbm } = await loadAbm()
    const abm = stepAbm(launchAbm(BASE, BASE))
    expect(abm.pos).toEqual(BASE)
    expect(abm.arrived).toBe(true)
  })
})

describe('AC1 — constant speed: a farther target takes proportionally more ticks', () => {
  it('a target twice as far takes strictly more ticks (not a fixed frame count)', async () => {
    const mod = await loadAbm()
    const near: Vec = { h: BASE.h + 40, v: BASE.v + 30 } //  |Δ| = 50
    const far: Vec = { h: BASE.h + 120, v: BASE.v + 90 } //  |Δ| = 150
    const nearTicks = flightPath(mod, BASE, near).length
    const farTicks = flightPath(mod, BASE, far).length
    expect(farTicks, 'a fixed-frame flight (speed ∝ distance) would fail this').toBeGreaterThan(
      nearTicks,
    )
  })

  it('flies straight and arrives for a spread of targets across the field (fuzz)', async () => {
    const mod = await loadAbm()
    for (let h = 12; h <= 244; h += 58) {
      for (let v = 46; v <= 204; v += 40) {
        const target: Vec = { h, v }
        const path = flightPath(mod, BASE, target)
        const last = path[path.length - 1]
        expect(last.arrived, `did not arrive for target (${h},${v})`).toBe(true)
        expect(last.pos, `did not snap to target (${h},${v})`).toEqual(target)
        for (const p of path) {
          expect(perpDist(p.pos, BASE, target), `off-line for target (${h},${v})`).toBeLessThanOrEqual(
            1.5,
          )
        }
      }
    }
  })
})

describe('AC1 — abm reducers are pure (deterministic, non-mutating)', () => {
  it('launchAbm/stepAbm return the same result for the same inputs', async () => {
    const { launchAbm, stepAbm } = await loadAbm()
    expect(stepAbm(launchAbm(BASE, TARGET))).toEqual(stepAbm(launchAbm(BASE, TARGET)))
  })

  it('stepAbm does not mutate the ABM it is given', async () => {
    const { launchAbm, stepAbm } = await loadAbm()
    const abm = launchAbm(BASE, TARGET)
    const snapshot = JSON.parse(JSON.stringify(abm))
    const out = stepAbm(abm)
    expect(abm).toEqual(snapshot) // input untouched
    expect(out).not.toBe(abm) // a fresh object
  })
})

describe('AC1 — abm.ts carries its W3MAIN source citations', () => {
  // The citation gate + claims/*.json are DEFERRED to the mc2 dossier epic
  // (skeleton-first, per field.test.ts/cursor.test.ts), so the enforceable form is
  // a raw source-text scan: abm.ts must name the module and the flight routines.
  const abmSrc = (): string => readFileSync(join(root, 'src', 'core', 'abm.ts'), 'utf8')

  it('names the source module W3MAIN', () => {
    expect(abmSrc(), 'must cite W3MAIN — where the ABM flight routines live').toMatch(/W3MAIN/)
  })

  it('cites the launch / flight / velocity routines it models', () => {
    const src = abmSrc()
    // ABMLAU (launch), UPDPOS (position), ABMVEL (velocity) — at least the launch
    // routine and one of the motion routines must be named.
    expect(src, 'must cite the launch routine ABMLAU / "LAUNCH ABMS"').toMatch(/ABMLAU|LAUNCH ABMS/)
    expect(
      src,
      'must cite the motion model (UPDPOS "UPDATE MISSILE POSITION" or ABMVEL "MISSILE VELOCITY")',
    ).toMatch(/UPDPOS|UPDATE MISSILE POSITION|ABMVEL|MISSILE VELOCITY/)
  })
})
