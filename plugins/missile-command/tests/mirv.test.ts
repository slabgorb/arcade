// plugins/missile-command/tests/mirv.test.ts
//
// Story mc5-1 — RED phase (Tyr One-Handed / TEA). AC1 + AC2: the MIRV split as a
// PURE core reducer. A ballistic ICBM whose head height enters the MIRV band forks
// into up to 3 child ballistic ICBMs from its current position, each re-targeted at
// a live structure. Core owns the split; the shell never computes it.
//
// ─── GROUND TRUTH (REV-01; W3MAIN.MAC/W3COMN.MAC, .RADIX 16 — hex bytes, trailing
//     '.' decimal). Read W3MAIN with `tr -d '\r' … | grep -a` (CRLF + stray bytes). ─
//   MIRV band re-arm in ICPOSI (W3MAIN.MAC:1561-1575): CPY MIRVLO / CPY MIRVHI.
//     MIRVLO = 128 (hex 80), MIRVHI = 160 (hex A0)  — W3COMN.MAC:159/161. Inclusive.
//   MIRVER caps POTENT at 2 → "NO MORE THAN 3 SHOTS FROM A MIRV" (W3MAIN.MAC:2695-2700).
//   First MIRV wave MIRVWV = 1 (W3COMN.MAC:205) — every wave (identity gate).
//   (Cruise missiles don't exist yet in ROM-faithful order, so mirvEligible does NOT
//    check Icbm.kind here — the 'cruise' exclusion is mc5-3, plan Task 6.)
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// `src/core/mirv.ts` does not exist yet. `loadMirv()` dynamic-imports it and throws
// a self-describing "not built yet", so every reducer test reddens for the FEATURE's
// absence. icbm.ts already exists, so its exports are imported directly. Purity of
// the new module is guarded by the src/core sweep in purity.test.ts once it lands.

import { describe, it, expect } from 'vitest'
import { createRng } from '@shared/rng'
import { launchIcbm, type Icbm, type Vec } from '../src/core/icbm.js'

interface MirvModule {
  MIRV_LO: number
  MIRV_HI: number
  MIRV_MAX_CHILDREN: number
  MIRV_EXPLOSION_SUPPRESS: number
  /** True for a live, non-arrived ballistic ICBM whose head is in [MIRV_LO, MIRV_HI]. */
  mirvEligible: (icbm: Icbm) => boolean
  /** Up to MIRV_MAX_CHILDREN child ballistic ICBMs from parent.pos, each RNG-re-targeted. */
  mirvSplit: (parent: Icbm, liveTargets: readonly Vec[], rng: ReturnType<typeof createRng>) => readonly Icbm[]
}

// Variable specifier + `/* @vite-ignore */` so `tsc --noEmit` (the release gate) stays
// green while mirv.ts is absent — the fleet idiom for a RED import (abm/cursor/icbm tests).
const MIRV_SPECIFIER = '../src/core/mirv.js'

async function loadMirv(): Promise<MirvModule> {
  try {
    const mod = (await import(/* @vite-ignore */ MIRV_SPECIFIER)) as Partial<MirvModule>
    if (typeof mod.mirvEligible !== 'function' || typeof mod.mirvSplit !== 'function') {
      throw new Error('module has no `mirvEligible`/`mirvSplit` export')
    }
    return mod as MirvModule
  } catch (e) {
    throw new Error(
      'mirv core module not built yet — GREEN (Loki) creates src/core/mirv.ts, a PURE reducer ' +
        'exporting MIRV_LO(128)/MIRV_HI(160)/MIRV_MAX_CHILDREN(3)/MIRV_EXPLOSION_SUPPRESS(12), ' +
        'mirvEligible(icbm) [live, !arrived, pos.v in [128,160]] and mirvSplit(parent, liveTargets, ' +
        'rng) [<=3 child ballistic ICBMs from parent.pos, RNG-re-targeted; empty when no targets]. ' +
        'Seeded @shared/rng only, no clock, no shell import (purity.test.ts sweeps it). ' +
        `(${(e as Error).message})`,
    )
  }
}

// A ballistic ICBM parked at height v (its target is below; irrelevant to eligibility).
const at = (v: number): Icbm => ({ ...launchIcbm({ h: 100, v: 210 }, { h: 100, v: 16 }), pos: { h: 100, v } })

describe('mc5-1 AC1 — mirvEligible: the [128,160] band, edges INCLUSIVE', () => {
  it('exposes the cited REV-01 band constants', async () => {
    const { MIRV_LO, MIRV_HI } = await loadMirv()
    expect(MIRV_LO).toBe(128) // W3COMN.MAC:159 (hex 80)
    expect(MIRV_HI).toBe(160) // W3COMN.MAC:161 (hex A0)
  })

  it('is eligible inside the band and on BOTH inclusive edges', async () => {
    const { mirvEligible } = await loadMirv()
    expect(mirvEligible(at(128))).toBe(true) // low edge inclusive
    expect(mirvEligible(at(144))).toBe(true) // interior
    expect(mirvEligible(at(160))).toBe(true) // high edge inclusive
  })

  it('is NOT eligible one unit outside either edge', async () => {
    const { mirvEligible } = await loadMirv()
    expect(mirvEligible(at(127))).toBe(false) // just below the band
    expect(mirvEligible(at(161))).toBe(false) // just above the band
  })

  it('is never eligible for an arrived warhead, even mid-band', async () => {
    const { mirvEligible } = await loadMirv()
    expect(mirvEligible({ ...at(144), arrived: true })).toBe(false)
    // (a cruise-kind exclusion is added in mc5-3 when cruise missiles exist)
  })
})

describe('mc5-1 AC2 — mirvSplit: <=3 children forking from the parent position', () => {
  const targets: readonly Vec[] = [
    { h: 10, v: 16 },
    { h: 50, v: 16 },
    { h: 90, v: 16 },
  ]

  it('exposes MIRV_MAX_CHILDREN = 3 (W3MAIN.MAC:2695-2700)', async () => {
    const { MIRV_MAX_CHILDREN } = await loadMirv()
    expect(MIRV_MAX_CHILDREN).toBe(3)
  })

  it('emits at most MIRV_MAX_CHILDREN children, each a fresh ballistic warhead at the parent pos', async () => {
    const { mirvSplit, MIRV_MAX_CHILDREN } = await loadMirv()
    const parent = at(150)
    const kids = mirvSplit(parent, targets, createRng(7))
    expect(kids.length).toBeGreaterThan(0)
    expect(kids.length).toBeLessThanOrEqual(MIRV_MAX_CHILDREN)
    for (const k of kids) {
      expect(k.origin).toEqual(parent.pos) // forks mid-air FROM the parent's current pos
      expect(k.pos).toEqual(parent.pos)
      expect(k.arrived).toBe(false) // children are fresh, ordinary ballistic ICBMs (x1 score)
      expect(targets).toContainEqual(k.target) // re-targeted at a LIVE structure
      // (children are ordinary ballistic ICBMs; the `kind` discriminant arrives in mc5-3)
    }
  })

  it('is deterministic per seed', async () => {
    const { mirvSplit } = await loadMirv()
    const parent = at(150)
    expect(mirvSplit(parent, targets, createRng(3))).toEqual(mirvSplit(parent, targets, createRng(3)))
  })

  it('emits nothing when no target survives (never fabricates a target)', async () => {
    const { mirvSplit } = await loadMirv()
    expect(mirvSplit(at(150), [], createRng(3))).toEqual([])
  })
})
