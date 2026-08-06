// plugins/missile-command/tests/explosion.test.ts
//
// Story mc1-4 — RED phase (Han Solo / TEA). AC1 (blast half): the detonation as a
// PURE core reducer. `src/core/explosion.ts` models the expanding-then-collapsing
// blast circle an arrived ABM leaves at the target: radius starts at 0, GROWS to a
// maximum, then COLLAPSES back to 0, deterministically over ticks, at which point
// the explosion is done. Core owns the geometry; render.ts paints the circle.
//
// ─── GROUND TRUTH (REV-01; W3MAIN is DOUBLE-SPACED — cites are logical non-blank
//     lines; grep the `.SBTTL`/label with `grep -a`, not the raw physical line) ──
//   PROCESS EXPLOSIONS   W3MAIN:906 (PREXPL, phys 1811) — each explosion carries a
//     time index (EXTIME) that walks a radius table and finishes when it reaches
//     EXDONE. The radius-vs-time table IS in this routine:
//         OLDRAD: .BYTE 0,0,2,3,4,5,6,7,8,9,10.,11.,12.,13.
//                 .BYTE 13.,12.,11.,10.,9,8,7,6,5,4,3,2,1,0,0
//     i.e. radius climbs 0→13 then falls 13→0 — a single peak of 13. (Radix: a
//     trailing `.` is decimal; the bare 0-9 are hex == decimal here.)
//   DRAW A CIRCLE        W3MAIN:2503 (phys 5005) — renders a circle of that radius.
//   EXDONE = 27.         W3COMN:225 — "EXPLOSION DIAMETER"; the time index at which
//     the blast is finished. Diameter 27 ⇒ radius ≈ 13 == the OLDRAD peak. The
//     skeleton pins those two source facts: MAX_BLAST_RADIUS = 13 and EXDONE = 27.
//
// The skeleton pins the SHAPE and the two cited constants, not the exact OLDRAD
// per-tick curve or the EXPFRA update cadence (mc2 fidelity): radius starts 0,
// rises monotonically to exactly MAX_BLAST_RADIUS, falls monotonically to 0, and
// isExplosionDone flips true once it has collapsed. A blast that never shrank, or
// grew past 13, or was done before it peaked, reddens here.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// `src/core/explosion.ts` does not exist yet. `loadExplosion()` dynamic-imports it
// and throws a self-describing "not built yet". Purity is guarded by the src/core
// sweep (purity.test.ts) — not re-asserted here.
//
// The "source ground truth" describe at the bottom reads the vendored W3COMN.MAC /
// W3MAIN.MAC directly (data, not code) and is GREEN from day one: it proves 27 and
// 13 really decode from the ROM, so a later "fix" that drifts either constant away
// from what Atari shipped reddens against the source, not against a human.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// ─── The contract GREEN (Yoda / Dev) implements: src/core/explosion.ts ───────

/** A blast in progress at a fixed cabinet point. `t` = ticks since detonation. */
interface Explosion {
  readonly h: number
  readonly v: number
  readonly t: number
}

interface ExplosionModule {
  /** Explosion time index at which the blast is finished — EXDONE, W3COMN:225 (27). */
  EXDONE: number
  /** Peak blast radius — the OLDRAD table maximum, W3MAIN:906 (13). */
  MAX_BLAST_RADIUS: number
  /** Detonate at (h, v): t = 0, radius 0, not done. Pure. */
  startExplosion: (h: number, v: number) => Explosion
  /** Advance one tick (t + 1). Pure, non-mutating. */
  stepExplosion: (exp: Explosion) => Explosion
  /** The blast radius at this explosion's current time: 0 → MAX → 0. Pure. */
  blastRadius: (exp: Explosion) => number
  /** True once the blast has expanded and collapsed back to nothing. Pure. */
  isExplosionDone: (exp: Explosion) => boolean
}

// Variable specifier + `/* @vite-ignore */` so `tsc --noEmit` stays green while
// explosion.ts is still absent — the fleet RED-import idiom.
const EXPLOSION_SPECIFIER = '../src/core/explosion.js'

async function loadExplosion(): Promise<ExplosionModule> {
  try {
    const mod = (await import(/* @vite-ignore */ EXPLOSION_SPECIFIER)) as Partial<ExplosionModule>
    if (
      typeof mod.startExplosion !== 'function' ||
      typeof mod.stepExplosion !== 'function' ||
      typeof mod.blastRadius !== 'function' ||
      typeof mod.isExplosionDone !== 'function'
    ) {
      throw new Error('module is missing one of startExplosion/stepExplosion/blastRadius/isExplosionDone')
    }
    return mod as ExplosionModule
  } catch (e) {
    throw new Error(
      'explosion core module not built yet — GREEN (Yoda) creates src/core/explosion.ts, a PURE ' +
        'module exporting EXDONE (27, W3COMN:225), MAX_BLAST_RADIUS (13, the OLDRAD peak, ' +
        'W3MAIN PROCESS EXPLOSIONS :906), startExplosion(h,v) {t:0}, stepExplosion (t+1), ' +
        'blastRadius(exp) that GROWS from 0 to MAX_BLAST_RADIUS then COLLAPSES to 0 over ticks, ' +
        'and isExplosionDone(exp) that flips true once it has collapsed. No shell import, no clock, ' +
        `no entropy (purity.test.ts sweeps it). (${(e as Error).message})`,
    )
  }
}

// Expected constants, transcribed from source. The "source ground truth" describe
// proves these against the ROM so a typo here cannot pass by matching a typo in
// explosion.ts.
const EXDONE = 27
const MAX_BLAST_RADIUS = 13

/** Walk a fresh blast to completion; return the radius at each tick from t=0. */
const radiusCurve = (mod: ExplosionModule, cap = 3 * EXDONE): number[] => {
  const radii: number[] = []
  let exp = mod.startExplosion(100, 120)
  for (let i = 0; i < cap; i++) {
    radii.push(mod.blastRadius(exp))
    if (mod.isExplosionDone(exp)) break
    exp = mod.stepExplosion(exp)
  }
  return radii
}

describe('AC1 — the cited constants are exported', () => {
  it('EXDONE is the explosion diameter/lifetime 27 (W3COMN:225)', async () => {
    const m = await loadExplosion()
    expect(m.EXDONE).toBe(EXDONE)
  })

  it('MAX_BLAST_RADIUS is the OLDRAD peak 13 (W3MAIN:906)', async () => {
    const m = await loadExplosion()
    expect(m.MAX_BLAST_RADIUS).toBe(MAX_BLAST_RADIUS)
  })
})

describe('AC1 — startExplosion detonates a fresh blast at the target point', () => {
  it('sets the point, starts at t=0, radius 0, and is not done', async () => {
    const { startExplosion, blastRadius, isExplosionDone } = await loadExplosion()
    const exp = startExplosion(140, 88)
    expect(exp.h).toBe(140)
    expect(exp.v).toBe(88)
    expect(exp.t).toBe(0)
    expect(blastRadius(exp)).toBe(0)
    expect(isExplosionDone(exp)).toBe(false)
  })
})

describe('AC1 — the blast EXPANDS to a maximum then COLLAPSES to nothing', () => {
  it('the radius reaches exactly MAX_BLAST_RADIUS and never exceeds it', async () => {
    const mod = await loadExplosion()
    const curve = radiusCurve(mod)
    expect(Math.max(...curve), 'the peak must be exactly the cited OLDRAD maximum').toBe(
      MAX_BLAST_RADIUS,
    )
    for (const r of curve) {
      expect(r, 'blast radius may never exceed the cited peak').toBeLessThanOrEqual(MAX_BLAST_RADIUS)
      expect(r, 'blast radius is never negative').toBeGreaterThanOrEqual(0)
    }
  })

  it('starts at 0, rises to the peak, then falls back to 0 (a single peak)', async () => {
    const mod = await loadExplosion()
    const curve = radiusCurve(mod)
    expect(curve[0], 'a fresh blast has zero radius').toBe(0)
    expect(curve[curve.length - 1], 'a finished blast has collapsed to nothing').toBe(0)

    const peakIdx = curve.indexOf(MAX_BLAST_RADIUS)
    expect(peakIdx, 'the peak radius must be reached at some tick').toBeGreaterThan(0)

    // Monotonic up to the (first) peak …
    for (let i = 1; i <= peakIdx; i++) {
      expect(curve[i], `radius dipped while still expanding at tick ${i}`).toBeGreaterThanOrEqual(
        curve[i - 1],
      )
    }
    // … then monotonic down to zero (never grows again — no second bloom).
    for (let i = peakIdx + 1; i < curve.length; i++) {
      expect(curve[i], `radius grew again while collapsing at tick ${i}`).toBeLessThanOrEqual(
        curve[i - 1],
      )
    }
  })

  it('the blast both grows and shrinks (it is not a monotone ramp)', async () => {
    const mod = await loadExplosion()
    const curve = radiusCurve(mod)
    const grew = curve.some((r, i) => i > 0 && r > curve[i - 1])
    const shrank = curve.some((r, i) => i > 0 && r < curve[i - 1])
    expect(grew, 'radius never increased — the blast did not expand').toBe(true)
    expect(shrank, 'radius never decreased — the blast did not collapse').toBe(true)
  })
})

describe('AC1 — isExplosionDone: the blast finishes exactly once, after it collapses', () => {
  it('is not done until the radius has returned to 0 past the peak', async () => {
    const mod = await loadExplosion()
    let exp = mod.startExplosion(50, 60)
    let sawPeak = false
    for (let i = 0; i < 3 * EXDONE && !mod.isExplosionDone(exp); i++) {
      if (mod.blastRadius(exp) === MAX_BLAST_RADIUS) sawPeak = true
      // While not done, if we've already peaked the radius must be shrinking-or-zero,
      // never still at max forever: guards against "done" that never triggers.
      exp = mod.stepExplosion(exp)
    }
    expect(sawPeak, 'the blast was declared done without ever reaching peak radius').toBe(true)
    expect(mod.isExplosionDone(exp), 'the blast never became done within its lifetime').toBe(true)
    expect(mod.blastRadius(exp), 'a done blast has zero radius').toBe(0)
  })

  it('finishes within ~EXDONE ticks (a diameter-27 blast is short-lived)', async () => {
    const mod = await loadExplosion()
    let exp = mod.startExplosion(0, 0)
    let ticks = 0
    while (!mod.isExplosionDone(exp) && ticks < 3 * EXDONE) {
      exp = mod.stepExplosion(exp)
      ticks++
    }
    expect(mod.isExplosionDone(exp)).toBe(true)
    // Grow 0→13 then collapse 13→0 is ~26-29 ticks; allow slack but bound it.
    expect(ticks, 'the blast outlived a plausible EXDONE-driven lifetime').toBeLessThanOrEqual(
      2 * EXDONE,
    )
  })

  it('stays done and at radius 0 once finished (stepping past the end is safe)', async () => {
    const mod = await loadExplosion()
    let exp = mod.startExplosion(10, 10)
    while (!mod.isExplosionDone(exp)) exp = mod.stepExplosion(exp)
    for (let i = 0; i < 5; i++) {
      exp = mod.stepExplosion(exp)
      expect(mod.isExplosionDone(exp)).toBe(true)
      expect(mod.blastRadius(exp)).toBe(0)
    }
  })
})

describe('AC1 — explosion reducers are pure (deterministic, non-mutating)', () => {
  it('same inputs give the same radius and the same next state', async () => {
    const { startExplosion, stepExplosion, blastRadius } = await loadExplosion()
    const a = stepExplosion(stepExplosion(startExplosion(70, 70)))
    const b = stepExplosion(stepExplosion(startExplosion(70, 70)))
    expect(a).toEqual(b)
    expect(blastRadius(a)).toBe(blastRadius(b))
  })

  it('stepExplosion does not mutate the explosion it is given', async () => {
    const { startExplosion, stepExplosion } = await loadExplosion()
    const exp = startExplosion(33, 44)
    const snapshot = JSON.parse(JSON.stringify(exp))
    const out = stepExplosion(exp)
    expect(exp).toEqual(snapshot)
    expect(out).not.toBe(exp)
  })
})

describe('AC1 — explosion.ts carries its W3MAIN / W3COMN source citations', () => {
  const explosionSrc = (): string => readFileSync(join(root, 'src', 'core', 'explosion.ts'), 'utf8')

  it('names the routine source W3MAIN and the constant source W3COMN', () => {
    const src = explosionSrc()
    expect(src, 'must cite W3MAIN — where PROCESS EXPLOSIONS / DRAW A CIRCLE live').toMatch(/W3MAIN/)
    expect(src, 'must cite W3COMN — where EXDONE is defined').toMatch(/W3COMN/)
  })

  it('cites EXDONE and the radius table / process routine', () => {
    const src = explosionSrc()
    expect(src, 'must cite the EXDONE symbol (the 27 lifetime)').toMatch(/EXDONE/)
    expect(
      src,
      'must cite the radius source (OLDRAD table or PROCESS EXPLOSIONS)',
    ).toMatch(/OLDRAD|PROCESS EXPLOSIONS/)
  })
})

describe('source ground truth — EXDONE=27 and the OLDRAD peak=13 really decode from the ROM', () => {
  // GREEN from day one: reads the vendored source (data), not explosion.ts (code),
  // anchoring the two constants to what Atari shipped. (W3COMN.MAC/W3MAIN.MAC carry
  // a stray non-text byte — readFileSync utf8 reads them fine; a hand `grep` needs
  // `-a`. Noted in field.test.ts's SOURCE-FILE HAZARD.)
  const w3comn = readFileSync(join(root, 'reference', 'source', 'W3COMN.MAC'), 'utf8')
  const w3main = readFileSync(join(root, 'reference', 'source', 'W3MAIN.MAC'), 'utf8')

  // A `SYMBOL = value` def in `.RADIX 16` source: trailing `.` = decimal, else hex.
  const valueOf = (src: string, symbol: string): number => {
    const m = src.match(new RegExp(`\\b${symbol}\\s*=\\s*([0-9A-Fa-f]+)(\\.?)`))
    if (!m) throw new Error(`symbol ${symbol} not found`)
    return m[2] === '.' ? parseInt(m[1], 10) : parseInt(m[1], 16)
  }

  // Parse the OLDRAD radius-vs-time table (two `.BYTE` lines between OLDRAD: and NEWRAD).
  const oldradTable = (): number[] => {
    const start = w3main.indexOf('OLDRAD:')
    const end = w3main.indexOf('NEWRAD', start)
    expect(start, 'OLDRAD table label not found in W3MAIN').toBeGreaterThan(-1)
    expect(end, 'NEWRAD terminator not found after OLDRAD').toBeGreaterThan(start)
    const block = w3main.slice(start, end)
    const nums: number[] = []
    for (const line of block.matchAll(/\.BYTE\s+([^\n;]+)/g)) {
      for (const raw of line[1].split(',')) {
        const tok = raw.trim()
        if (!/^[0-9A-Fa-f]+\.?$/.test(tok)) continue
        nums.push(tok.endsWith('.') ? parseInt(tok, 10) : parseInt(tok, 16))
      }
    }
    return nums
  }

  it('EXDONE = 27 (decimal, trailing dot) in W3COMN.MAC', () => {
    expect(valueOf(w3comn, 'EXDONE')).toBe(EXDONE)
  })

  it('the OLDRAD table peaks at 13, starts and ends at 0, and is single-peaked', () => {
    const table = oldradTable()
    expect(table.length, 'the OLDRAD table failed to parse').toBeGreaterThan(10)
    expect(Math.max(...table)).toBe(MAX_BLAST_RADIUS)
    expect(table[0]).toBe(0)
    expect(table[table.length - 1]).toBe(0)
    // rises to the peak then never rises again (grow-then-collapse), matching the code contract.
    const peak = table.indexOf(MAX_BLAST_RADIUS)
    for (let i = 1; i <= peak; i++) expect(table[i]).toBeGreaterThanOrEqual(table[i - 1])
    for (let i = peak + 1; i < table.length; i++) expect(table[i]).toBeLessThanOrEqual(table[i - 1])
  })
})
