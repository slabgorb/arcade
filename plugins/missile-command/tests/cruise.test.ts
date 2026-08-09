// plugins/missile-command/tests/cruise.test.ts
//
// Story mc5-3 — RED phase (Leeloo / TEA). Plan tasks 6 + 7: the CRUISE missile as
// an ICBM-family variant. A cruise missile is an `Icbm` carrying a `kind:'cruise'`
// discriminant that descends along a discrete ANGLE (not toward a ground target,
// the way a ballistic ICBM homes), is released against the per-wave CRMWAV budget
// (first nonzero at wave 6), and scores 5× an ICBM when killed. Core owns the
// geometry, the budget and the score; the shell only paints the trail (mc9).
//
// ─── GROUND TRUTH (REV-01 W3MAIN.MAC; DOUBLE-SPACED → physical lines, read via
//     `tr -d '\r' < …/W3MAIN.MAC` then grep/sed; .RADIX 16 unless a trailing '.') ─
//   ANGLE→CMANGL 0..13 = cruise missile angle   (W3MAIN.MAC:6421 `.SBTTL DETERMINES
//     CRUISE MISSILE ANGLE`; :6425 `;OUTPUT:CMANGL=0->13=CRUISE MISSILE ANGLE`).
//     The (dh,dv) per angle comes from SLOPEH `.BYTE 0,0,0,1,5` (W3MAIN.MAC:6515)
//     and SLOPEL `.BYTE 0,32,0AB,7F,6` (W3MAIN.MAC:6519). Those exact slope
//     literals are captured + CLAIMED at GREEN (MC-CMANGL-*); RED pins only the
//     angle-driven DESCENT invariant, never an uncited slope value.
//   CRMWAV .BYTE 0,0,0,0,0,1,1,2,3,4,4,5,5,6,6,7,7,7,7  (W3MAIN.MAC:5723, → CRMTOL)
//     — the per-wave cruise budget, 1-based; 0 for waves 1..5, 1 at wave 6, clamped
//     to the last row (7) for waves ≥ 19. (claim MC-CRMWAV-*)
//   CMKILL LDX I,4 → "5X ICBM"  (W3MAIN.MAC:2113, in the CMKILL routine :2105+).
//     A cruise kill is worth 5× the ICBM value at that wave. (claim MC-CRUISE-SCORE)
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// `src/core/icbm.ts` exists (ballistic) but exports no `launchCruise`/`stepCruise`/
// `stepAnyIcbm`; `spawn.ts` exports no `cruiseBudget`; `score.ts` exports no
// `cruiseKillPoints`. Each loader below dynamic-imports the built module and throws
// a self-describing "not built yet — RED" when the cruise export is still absent,
// so ONLY the cruise tests redden while every ballistic test stays green. The new
// `kind` field is OPTIONAL, so existing `Icbm` literals/tests are untouched
// (purity.test.ts / citations.test.ts sweep the GREEN edits automatically).

import { describe, it, expect } from 'vitest'
// launchIcbm/stepIcbm already ship (mc3); imported through the cruise loader below
// so the whole cruise contract is typed against ONE local `CruiseIcbm` shape.

interface Vec {
  readonly h: number
  readonly v: number
}

/** The mc5-3 `Icbm` shape: the shipped ballistic warhead PLUS the optional `kind`
 *  discriminant (absent = 'ballistic', for backward compatibility). */
interface CruiseIcbm {
  readonly origin: Vec
  readonly target: Vec
  readonly pos: Vec
  readonly arrived: boolean
  readonly velocity?: number
  readonly kind?: 'ballistic' | 'cruise'
}

// ── Loader 1: the cruise ICBM contract on src/core/icbm.ts (tasks 6) ──────────
interface IcbmCruiseModule {
  launchIcbm: (origin: Vec, target: Vec, velocity?: number) => CruiseIcbm
  stepIcbm: (icbm: CruiseIcbm) => CruiseIcbm
  /** A cruise ICBM launched from `origin` along CMANGL `angle` (0..13) at `velocity`. */
  launchCruise: (origin: Vec, angle: number, velocity?: number) => CruiseIcbm
  /** Advance a cruise along its angle (NOT toward `target`); arrives at ground. Pure. */
  stepCruise: (icbm: CruiseIcbm) => CruiseIcbm
  /** Dispatcher used by game.ts: routes on `kind` — cruise→stepCruise, else stepIcbm. */
  stepAnyIcbm: (icbm: CruiseIcbm) => CruiseIcbm
}

const ICBM_SPECIFIER = '../src/core/icbm.js'
async function loadIcbmCruise(): Promise<IcbmCruiseModule> {
  try {
    const mod = (await import(/* @vite-ignore */ ICBM_SPECIFIER)) as Partial<IcbmCruiseModule>
    if (
      typeof mod.launchCruise !== 'function' ||
      typeof mod.stepCruise !== 'function' ||
      typeof mod.stepAnyIcbm !== 'function'
    ) {
      throw new Error('icbm.ts has no `launchCruise`/`stepCruise`/`stepAnyIcbm` export')
    }
    return mod as IcbmCruiseModule
  } catch (e) {
    throw new Error(
      'cruise ICBM not built yet — GREEN adds to src/core/icbm.ts: an OPTIONAL ' +
        "`kind?: 'ballistic'|'cruise'` on Icbm; `launchCruise(origin, angle, velocity?)` " +
        '(kind:cruise); `stepCruise(icbm)` (descend along the CMANGL angle, arrive at ground); ' +
        'and a `stepAnyIcbm(icbm)` dispatcher routing on kind. Pure, no clock/entropy/shell. ' +
        `(${(e as Error).message})`,
    )
  }
}

// ── Loader 2: cruiseBudget on src/core/spawn.ts (task 7) ──────────────────────
interface SpawnCruiseModule {
  cruiseBudget: (wave: number) => number
}
const SPAWN_SPECIFIER = '../src/core/spawn.js'
async function loadCruiseBudget(): Promise<SpawnCruiseModule> {
  try {
    const mod = (await import(/* @vite-ignore */ SPAWN_SPECIFIER)) as Partial<SpawnCruiseModule>
    if (typeof mod.cruiseBudget !== 'function') throw new Error('spawn.ts has no `cruiseBudget` export')
    return mod as SpawnCruiseModule
  } catch (e) {
    throw new Error(
      'cruiseBudget not built yet — GREEN adds `cruiseBudget(wave)` to src/core/spawn.ts, the ' +
        'frozen CRMWAV table (W3MAIN.MAC:5723) indexed wave-1 and clamped to the last row. ' +
        `(${(e as Error).message})`,
    )
  }
}

// ── Loader 3: cruiseKillPoints on src/core/score.ts (task 7) ──────────────────
// ICBM_KILL_POINTS / scoreKills / scoreMultiplier already ship (mc3/mc4); only
// cruiseKillPoints is new, so it gates the RED and the others anchor the ×5 relation.
interface ScoreCruiseModule {
  ICBM_KILL_POINTS: number
  scoreKills: (score: number, killed: number, wave?: number) => number
  scoreMultiplier: (wave: number) => number
  /** Points for one downed cruise missile at 1-based `wave` — 5× the ICBM value. */
  cruiseKillPoints: (wave: number) => number
}
const SCORE_SPECIFIER = '../src/core/score.js'
async function loadCruiseScore(): Promise<ScoreCruiseModule> {
  try {
    const mod = (await import(/* @vite-ignore */ SCORE_SPECIFIER)) as Partial<ScoreCruiseModule>
    if (typeof mod.cruiseKillPoints !== 'function') throw new Error('score.ts has no `cruiseKillPoints` export')
    return mod as ScoreCruiseModule
  } catch (e) {
    throw new Error(
      'cruiseKillPoints not built yet — GREEN adds `cruiseKillPoints(wave)` = 5 × the ICBM kill ' +
        'value at that wave to src/core/score.ts (CMKILL `LDX I,4` → ×5, W3MAIN.MAC:2113). ' +
        `(${(e as Error).message})`,
    )
  }
}

// ─── Task 6: `kind` discriminant + angled cruise flight ──────────────────────

describe('mc5-3 task 6 — Icbm.kind + cruise angled flight', () => {
  it('a cruise missile carries kind:cruise and DESCENDS along its angle (moves, net down)', async () => {
    const { launchCruise, stepCruise } = await loadIcbmCruise()
    const c = launchCruise({ h: 10, v: 200 }, 7, 2) // CMANGL 7, velocity 2
    expect(c.kind).toBe('cruise')
    const moved = stepCruise(c)
    expect(moved.pos).not.toEqual(c.pos) // it moved
    expect(moved.pos.v).toBeLessThan(c.pos.v) // net descent (cruise missiles come DOWN)
  })

  it('a cruise descends MONOTONICALLY to the ground and then arrives (idempotent after)', async () => {
    const { launchCruise, stepCruise } = await loadIcbmCruise()
    let c = launchCruise({ h: 40, v: 200 }, 7, 2)
    let prevV = c.pos.v
    let arrived = false
    for (let i = 0; i < 2000; i++) {
      c = stepCruise(c)
      expect(c.pos.v).toBeLessThanOrEqual(prevV) // never climbs — descent invariant
      prevV = c.pos.v
      if (c.arrived) {
        arrived = true
        break
      }
    }
    expect(arrived).toBe(true) // it reaches the ground within a bounded flight
    expect(stepCruise(c)).toEqual(c) // a landed cruise is parked — stepCruise is idempotent
  })

  it('the default (absent kind) ballistic ICBM is unchanged — mc3 behaviour intact', async () => {
    const { launchIcbm, stepIcbm } = await loadIcbmCruise()
    const b = launchIcbm({ h: 100, v: 222 }, { h: 100, v: 0 })
    expect(b.kind ?? 'ballistic').toBe('ballistic') // no kind field ⇒ ballistic
    expect(stepIcbm(b).arrived).toBe(false) // one step from the top edge is still in flight
  })

  it('stepAnyIcbm DISPATCHES on kind — cruise→stepCruise, ballistic→stepIcbm', async () => {
    const { launchIcbm, stepIcbm, launchCruise, stepCruise, stepAnyIcbm } = await loadIcbmCruise()
    const ball = launchIcbm({ h: 100, v: 222 }, { h: 100, v: 0 }, 3)
    const cruise = launchCruise({ h: 10, v: 200 }, 7, 2)
    // The dispatcher must produce EXACTLY what the kind-specific stepper produces —
    // an identity-mapping mutant (always stepIcbm) reddens on the cruise case.
    expect(stepAnyIcbm(ball)).toEqual(stepIcbm(ball))
    expect(stepAnyIcbm(cruise)).toEqual(stepCruise(cruise))
    expect(stepAnyIcbm(cruise)).not.toEqual(stepIcbm(cruise as CruiseIcbm)) // cruise is NOT stepped ballistically
  })
})

// ─── Task 7: cruise per-wave budget (CRMWAV) + ×5 scoring (CMKILL) ────────────

describe('mc5-3 task 7 — cruiseBudget follows CRMWAV (0 until wave 6)', () => {
  it('is zero for every wave 1..5 (control — no cruise before wave 6)', async () => {
    const { cruiseBudget } = await loadCruiseBudget()
    for (const w of [1, 2, 3, 4, 5]) expect(cruiseBudget(w)).toBe(0)
  })

  it('turns on at wave 6 and follows the CRMWAV row (spot values)', async () => {
    const { cruiseBudget } = await loadCruiseBudget()
    expect(cruiseBudget(6)).toBe(1)
    expect(cruiseBudget(7)).toBe(1)
    expect(cruiseBudget(8)).toBe(2)
    expect(cruiseBudget(10)).toBe(4)
  })

  it('clamps to the LAST CRMWAV row (7) for waves at/after 19', async () => {
    const { cruiseBudget } = await loadCruiseBudget()
    expect(cruiseBudget(19)).toBe(7)
    expect(cruiseBudget(99)).toBe(7) // clamped, not out-of-range
  })

  it('matches the full 19-entry CRMWAV table exactly (anti-transcription / off-by-one guard)', async () => {
    const { cruiseBudget } = await loadCruiseBudget()
    // CRMWAV .BYTE 0,0,0,0,0,1,1,2,3,4,4,5,5,6,6,7,7,7,7  (W3MAIN.MAC:5723), 1-based.
    const CRMWAV = [0, 0, 0, 0, 0, 1, 1, 2, 3, 4, 4, 5, 5, 6, 6, 7, 7, 7, 7]
    const got = CRMWAV.map((_, i) => cruiseBudget(i + 1)) // waves 1..19
    expect(got).toEqual(CRMWAV)
  })
})

describe('mc5-3 task 7 — a cruise kill scores 5× an ICBM at the same wave', () => {
  it('cruiseKillPoints = 5 × the single-ICBM kill value, at waves 1 and 6', async () => {
    const { cruiseKillPoints, scoreKills } = await loadCruiseScore()
    // The value of ONE downed ICBM at a wave is scoreKills(0, 1, wave) — reuse the
    // shipped scorer so the ×5 relation rides on the SAME wave-multiplier math.
    for (const wave of [1, 6]) {
      const oneIcbm = scoreKills(0, 1, wave)
      expect(cruiseKillPoints(wave)).toBe(5 * oneIcbm)
    }
  })

  it('pins the concrete cited numbers: 125 at wave 1, 375 at wave 6', async () => {
    const { cruiseKillPoints } = await loadCruiseScore()
    expect(cruiseKillPoints(1)).toBe(125) // 5 × 25 × scoreMultiplier(1)=1
    expect(cruiseKillPoints(6)).toBe(375) // 5 × 25 × scoreMultiplier(6)=3
  })
})
