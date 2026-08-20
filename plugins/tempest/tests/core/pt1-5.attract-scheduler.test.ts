// tests/core/pt1-5.attract-scheduler.test.ts
//
// Story pt1-5 (RED, O'Brien / TEA) — the BEHAVIOUR suite for the tempest attract
// sub-cycle: a new pure core module `src/core/attract-scheduler.ts` that rotates
// the high-score LADDER, the LOGO wordmark and the self-play DEMO and REPEATS. It
// is the joust attract-scheduler shape (plugins/joust/src/core/attract-scheduler.ts),
// pared to tempest's three chrome pages.
//
// AC1 the scheduler cycles ladder → logo → demo and wraps forever.
// AC2 each page dwells a positive, finite number of frames, and the advance happens
//     at exactly the dwell boundary (magnitude, not merely ordering — checklist #29).
// AC6 the module is pure (checklist #15/#25 — mutation-anchored: the purity helper
//     and a direct source scan, both reddening if a clock/DOM/shell import lands).
//
// The module is loaded lazily (helpers/pt1-5-attract-contract) so RED reddens with
// a clean "module not built yet" per test until Dev ships it.

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadAttract, type AttractState, type AttractPage } from '../helpers/pt1-5-attract-contract'
import { violations } from '../helpers/purity-scanner'

const here = dirname(fileURLToPath(import.meta.url))
const schedulerPath = join(here, '..', '..', 'src', 'core', 'attract-scheduler.ts')

/** Read the not-yet-built scheduler source for the purity assertions (RED: absent → throws). */
function readSchedulerSource(): string {
  if (!existsSync(schedulerPath)) {
    throw new Error(
      'GREEN (Dev) must create plugins/tempest/src/core/attract-scheduler.ts — the pure ' +
        'attract sub-cycle (pt1-5)',
    )
  }
  return readFileSync(schedulerPath, 'utf8')
}

/** Step exactly enough frames to leave the current page, whatever its dwell — robust
 *  to Dev's chosen per-page dwell values while still forcing one advance. */
async function advancePastPage(state: AttractState): Promise<AttractState> {
  const mod = await loadAttract()
  return mod.stepAttract(state, mod.dwellFor(state.page) - state.framesOnPage)
}

describe('pt1-5 attract-scheduler — module seam', () => {
  it('loadAttract resolves the built module with its full surface (RED seam closed)', async () => {
    const mod = await loadAttract()
    expect(typeof mod.createAttract).toBe('function')
    expect(typeof mod.stepAttract).toBe('function')
    expect(typeof mod.dwellFor).toBe('function')
    expect(Array.isArray(mod.PAGE_ORDER)).toBe(true)
  })
})

describe('pt1-5 attract-scheduler — the three-page cycle (AC1)', () => {
  it('PAGE_ORDER is exactly the ROM cycle: ladder → logo → demo', async () => {
    const mod = await loadAttract()
    // The cited cycle: ENDGAM→CDLADR (ladder), DLADR→CLOGO (logo), then the self-play
    // game. Pin the SEQUENCE, not just membership — the order is the ROM's.
    expect([...mod.PAGE_ORDER]).toEqual(['ladder', 'logo', 'demo'])
  })

  it('createAttract boots on PAGE_ORDER[0], zeroed', async () => {
    const mod = await loadAttract()
    const s = mod.createAttract()
    expect(s.page).toBe(mod.PAGE_ORDER[0])
    expect(s.framesOnPage).toBe(0)
  })

  it('accumulates framesOnPage below the dwell without advancing', async () => {
    const mod = await loadAttract()
    const s0 = mod.createAttract()
    const dwell = mod.dwellFor(s0.page)
    const s1 = mod.stepAttract(s0, dwell - 1) // one frame short of the boundary
    expect(s1.page).toBe(s0.page)
    expect(s1.framesOnPage).toBe(dwell - 1)
  })

  it('advances to the NEXT page at exactly the dwell boundary and resets framesOnPage', async () => {
    const mod = await loadAttract()
    const s0 = mod.createAttract()
    const s1 = await advancePastPage(s0)
    expect(s1.page).toBe(mod.PAGE_ORDER[1])
    expect(s1.framesOnPage).toBe(0)
  })

  it('a full cycle VISITS every page exactly once, in order, before wrapping', async () => {
    const mod = await loadAttract()
    let s = mod.createAttract()
    const visited: AttractPage[] = [s.page]
    for (let i = 0; i < mod.PAGE_ORDER.length - 1; i++) {
      s = await advancePastPage(s)
      visited.push(s.page)
    }
    expect(visited).toEqual([...mod.PAGE_ORDER]) // ordered, complete
    expect(new Set(visited).size).toBe(mod.PAGE_ORDER.length)
  })

  it('WRAPS to PAGE_ORDER[0] after the last page — the attract loop never ends (AC1)', async () => {
    const mod = await loadAttract()
    let s = mod.createAttract()
    for (let i = 0; i < mod.PAGE_ORDER.length; i++) s = await advancePastPage(s)
    expect(s.page).toBe(mod.PAGE_ORDER[0])
  })

  it('carries leftover frames across the boundary (a big step lands mid-next-page)', async () => {
    const mod = await loadAttract()
    const s0 = mod.createAttract()
    const overshoot = mod.dwellFor(s0.page) + 5
    const s1 = mod.stepAttract(s0, overshoot)
    expect(s1.page).toBe(mod.PAGE_ORDER[1])
    expect(s1.framesOnPage).toBe(5)
  })
})

describe('pt1-5 attract-scheduler — dwell magnitudes (AC2)', () => {
  it('every page dwells a POSITIVE, FINITE number of frames', async () => {
    const mod = await loadAttract()
    for (const page of mod.PAGE_ORDER) {
      const d = mod.dwellFor(page)
      expect(Number.isFinite(d), `dwellFor(${page}) must be finite`).toBe(true)
      expect(d, `dwellFor(${page}) must be > 0`).toBeGreaterThan(0)
    }
  })
})

describe('pt1-5 attract-scheduler — pure transform (AC6)', () => {
  it('same (state, frames) → deep-equal result, and the input is not mutated', async () => {
    const mod = await loadAttract()
    const s0 = mod.createAttract()
    const frozen = JSON.stringify(s0)
    const a = mod.stepAttract(s0, 7)
    const b = mod.stepAttract(s0, 7)
    expect(a).toEqual(b) // deterministic — no wall-clock, no ambient entropy
    expect(JSON.stringify(s0)).toBe(frozen) // argument untouched
    expect(a).not.toBe(s0) // a fresh object
  })
})

describe('pt1-5 attract-scheduler — stays inside the purity boundary (AC6)', () => {
  it('src/core/attract-scheduler.ts has ZERO purity violations', () => {
    // The AST scanner (purity-scanner.test.ts) also sweeps every src/core module
    // forever; this direct assertion reddens the moment a banned name lands.
    expect(violations(readSchedulerSource())).toEqual([])
  })

  it('names no browser global even in comments, and imports nothing from ../shell', () => {
    const src = readSchedulerSource()
    expect(src).not.toMatch(/\bwindow\b|\bdocument\b/)
    expect(src).not.toMatch(/from\s*['"][^'"]*shell/)
  })
})
