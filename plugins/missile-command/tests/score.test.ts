// plugins/missile-command/tests/score.test.ts
//
// Story mc3-3 — RED phase (Han Solo / TEA). Plan task 5. AC1: ICBM scoring as a
// PURE module `src/core/score.ts`, plus the MC-ICBPTS(25) claim in
// docs/rom-study/claims/score.json pinning the wave-1 value against the ROM.
//
//   ICBM_KILL_POINTS = 25
//   scoreKills(score, killed) => score + killed * 25   (ADDS onto the running score)
//
// ─── GROUND TRUTH (REV-01 W3MAIN.MAC, physical line 4091) ────────────────────
//   ;ICBM PTS X WAVE NUMBER                            (block header, phys 4083)
//     LDA ICBPTL   ;INCREASE POINTS FOR DOWNING ICBMS  (phys 4087)
//     CLC                                              (phys 4089)
//     ADC I,25                                         (phys 4091)  <-- 25/ICBM
//     STA ICBPTL                                       (phys 4093)
//   The ROM scores 25 x WAVE per downed ICBM; mc3 pins ONLY the wave-1 constant
//   25 — the x-wave ramp is mc4. W3MAIN.MAC is DOUBLE-SPACED, so this is the
//   PHYSICAL line 4091 (logical ~2045); the story cites the physical line.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// (1) `src/core/score.ts` does not exist — loadScore() throws a self-describing
//     "not built yet" (never a bare module-resolution stack trace). (2) No
//     committed claim carries value 25 at W3MAIN.MAC:4091, so the claim
//     assertions fail until GREEN authors docs/rom-study/claims/score.json.
// Purity of the new module and the "literal 25 must be claimed" obligation (AC3)
// are guarded AUTOMATICALLY by the src/core sweeps in purity.test.ts /
// citations.test.ts the moment score.ts lands; this file does not re-assert them
// — it pins the BEHAVIOUR and the NAMED claim.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { loadClaims } from './helpers/claims.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const W3MAIN = join(root, 'reference', 'source', 'W3MAIN.MAC')
const sourceAvailable = existsSync(W3MAIN)

// ─── The contract GREEN (Yoda / Dev) implements: src/core/score.ts ───────────
interface ScoreModule {
  readonly ICBM_KILL_POINTS: number
  scoreKills: (score: number, killed: number) => number
}

// Variable specifier + /* @vite-ignore */ so `tsc --noEmit` (the release gate)
// stays green while score.ts is still absent — the fleet idiom for a RED import
// of a not-yet-built module (damage.test.ts / icbm.test.ts / field.test.ts).
const SCORE_SPECIFIER = '../src/core/score.js'

async function loadScore(): Promise<ScoreModule> {
  try {
    const mod = (await import(/* @vite-ignore */ SCORE_SPECIFIER)) as Partial<ScoreModule>
    if (typeof mod.ICBM_KILL_POINTS !== 'number' || typeof mod.scoreKills !== 'function') {
      throw new Error('module has no `ICBM_KILL_POINTS`/`scoreKills` export')
    }
    return mod as ScoreModule
  } catch (e) {
    throw new Error(
      'score core module not built yet — GREEN (Yoda) creates src/core/score.ts, a PURE module: ' +
        'ICBM_KILL_POINTS = 25 and scoreKills(score, killed) = score + killed * 25 (ADDS onto the ' +
        'running score; wave-1 value only, the x-wave ramp is mc4). Then author docs/rom-study/claims/' +
        'score.json with MC-ICBPTS: value 25, source W3MAIN.MAC:4091, verbatim the byte-exact `ADC I,25` ' +
        `line. No clock, no entropy, no shell import (the sweeps guard it). (${(e as Error).message})`,
    )
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// AC1a — the constant and the reducer
// ═════════════════════════════════════════════════════════════════════════════
describe('mc3-3 AC1 — ICBM_KILL_POINTS and scoreKills', () => {
  it('ICBM_KILL_POINTS is the wave-1 value 25', async () => {
    const { ICBM_KILL_POINTS } = await loadScore()
    expect(ICBM_KILL_POINTS).toBe(25)
  })

  it('one kill adds exactly 25 to a zero score', async () => {
    const { scoreKills } = await loadScore()
    expect(scoreKills(0, 1)).toBe(25)
  })

  it('three kills add 75 (25 per ICBM)', async () => {
    const { scoreKills } = await loadScore()
    expect(scoreKills(0, 3)).toBe(75)
  })

  it('kills ADD onto the running score, never replace it', async () => {
    const { scoreKills } = await loadScore()
    expect(scoreKills(100, 2)).toBe(150)
  })

  it('zero kills leave the score unchanged (a tick that downs nothing scores nothing)', async () => {
    const { scoreKills } = await loadScore()
    expect(scoreKills(340, 0)).toBe(340)
  })

  it('scoreKills == score + killed * ICBM_KILL_POINTS across a range (the reducer is the constant, not a stray 25)', async () => {
    const { scoreKills, ICBM_KILL_POINTS } = await loadScore()
    for (const [score, killed] of [[0, 0], [0, 1], [25, 4], [999, 7]] as const) {
      expect(scoreKills(score, killed)).toBe(score + killed * ICBM_KILL_POINTS)
    }
  })

  it('is a pure function — same inputs, same output, no hidden accumulation between calls', async () => {
    const { scoreKills } = await loadScore()
    const a = scoreKills(50, 2)
    const b = scoreKills(50, 2)
    expect(a).toBe(b)
    expect(a).toBe(100)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC1b — the MC-ICBPTS(25) claim pins the ROM's per-ICBM points, byte-exact
// ═════════════════════════════════════════════════════════════════════════════
describe('mc3-3 AC1 — the MC-ICBPTS claim cites 25/ICBM at W3MAIN.MAC:4091', () => {
  it('a committed claim named MC-ICBPTS carries the decoded value 25', () => {
    const icbpts = loadClaims().filter((c) => c.id === 'MC-ICBPTS')
    expect(icbpts.length, 'docs/rom-study/claims/score.json must carry exactly one MC-ICBPTS claim').toBe(1)
    expect(Number(icbpts[0].value), 'MC-ICBPTS pins the wave-1 per-ICBM points').toBe(25)
  })

  it('MC-ICBPTS cites the PHYSICAL line W3MAIN.MAC:4091 (the ADC I,25 instruction)', () => {
    const [c] = loadClaims().filter((c) => c.id === 'MC-ICBPTS')
    expect(c, 'MC-ICBPTS must exist').toBeDefined()
    expect(c.source.file, 'the 25-point scoring lives in W3MAIN, not W3COMN').toBe('W3MAIN.MAC')
    expect(
      c.source.line,
      'W3MAIN is double-spaced; cite the PHYSICAL line 4091, not the logical ~2045',
    ).toBe(4091)
  })

  // Byte-exactness against the vendored tree — gated so a source-less checkout
  // skips instead of throwing (the citations.test.ts sourceAvailable idiom).
  it.skipIf(!sourceAvailable)('the MC-ICBPTS verbatim matches source line 4091 byte-for-byte', () => {
    const [c] = loadClaims().filter((c) => c.id === 'MC-ICBPTS')
    expect(c, 'MC-ICBPTS must exist').toBeDefined()
    const physical = readFileSync(W3MAIN, 'utf8').split('\n')[4090] // 0-indexed => physical line 4091
    // fixture sanity — the vendored ROM really carries the ADC at this line, so a
    // green here means the claim matched the RIGHT line, not an empty coincidence.
    expect(physical, 'the vendored ROM must carry `ADC I,25` at physical 4091').toContain('ADC I,25')
    expect(
      c.source.verbatim,
      'the claim verbatim must equal the cited source line byte-for-byte (the checker enforces this too)',
    ).toBe(physical)
  })
})
