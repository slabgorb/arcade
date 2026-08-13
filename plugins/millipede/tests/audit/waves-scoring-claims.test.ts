// tests/audit/waves-scoring-claims.test.ts
//
// Story ml5-1 — RED phase (Han Solo / TEA). The CLAIMS arm of "waves + scoring
// core". The behaviour arms (tests/waves.test.ts, tests/scoring.test.ts) pin WHAT
// the ramps and the accumulator do; this file pins WHERE every constant came from,
// in the dossier's byte-verifiable grammar (ml1-1's gate).
//
// GREEN authors docs/rom-study/claims/13-waves-scoring.json quoting the vendored
// 1982 source VERBATIM — generated out of reference/original-source/millipede/,
// never hand-typed (the ml1-2 sidecar lesson). loadClaims() globs claims/*.json, so
// a new file enrols itself; no manifest edit. New id prefixes:
//   WV-*  the wave routines — BEETLA per-wave quota (MILLI.MAC:637-665), the DELAY
//         field + arming (MLDEF.MAC:286, MILLI.MAC:1904-1905) and the CHKEND
//         countdown (MLSUB.MAC:52-59).
//   SG-*  the scoring routine — SCORNG (MLSUB.MAC:1049-1074) and the PTS field
//         (MLDEF.MAC:398).
//
// GPL note: MAME facts stay PROSE (`centiped*.cpp:N`); the sweep grammar excludes
// .cpp by construction, so no claim in the new file may cite a .cpp — claims are for
// VENDORED bytes only. Every source file cited here is a `.MAC`.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { claimsDir, loadClaims } from './dossier-sweep'

const NEW_CLAIMS = join(claimsDir, '13-waves-scoring.json')

interface Claim {
  id: string
  claim: string
  source: { file: string; line: number; verbatim: string }
}

/** All claims carrying this story's prefixes, wherever loadClaims globs them from. */
const storyClaims = (): Claim[] =>
  (loadClaims() as Claim[]).filter((c) => c.id.startsWith('WV-') || c.id.startsWith('SG-'))
const waveClaims = (): Claim[] => storyClaims().filter((c) => c.id.startsWith('WV-'))
const scoreClaims = (): Claim[] => storyClaims().filter((c) => c.id.startsWith('SG-'))

/** The anchor lines this story MUST pin — the fields and branch points the
 *  behaviour suites depend on. (file, line) each measured against the vendored
 *  tree this session; if the file disagrees, the byte-verify test below fails
 *  loudly rather than this list guessing. */
const REQUIRED_ANCHORS: ReadonlyArray<readonly [string, number, string]> = [
  ['MLDEF.MAC', 370, 'BEETLA field — beetles allowed this wave'],
  ['MLDEF.MAC', 286, 'DELAY field — non-zero to delay between waves'],
  ['MLDEF.MAC', 398, 'PTS field — points for killing this critter'],
  ['MILLI.MAC', 665, 'STY BEETLA — the per-wave quota store'],
  ['MLSUB.MAC', 1050, 'BMI 30$ — SCORNG attract-mode early-out'],
]

describe('ml5-1 — waves + scoring constants are pinned as byte-verifiable claims', () => {
  it('GREEN ships docs/rom-study/claims/13-waves-scoring.json', () => {
    expect(
      existsSync(NEW_CLAIMS),
      'the waves+scoring claims file must exist beside 00..12 — one file per study topic',
    ).toBe(true)
  })

  it('the wave routines carry a real WV-* claim population (floor 5)', () => {
    // BEETLA field + the ramp thresholds + the DELAY field + arming + CHKEND.
    // Floor, not ceiling — Dev measures the exact lines.
    expect(waveClaims().length).toBeGreaterThanOrEqual(5)
  })

  it('the scoring routine carries a real SG-* claim population (floor 4)', () => {
    // SCORNG header/entry + the attract branch + the SCORE0 add + the PTS field.
    expect(scoreClaims().length).toBeGreaterThanOrEqual(4)
  })

  it('the required field/branch anchors are all claimed', () => {
    const claimed = new Set(storyClaims().map((c) => `${c.source.file}:${c.source.line}`))
    for (const [file, line, why] of REQUIRED_ANCHORS) {
      expect(claimed.has(`${file}:${line}`), `${file}:${line} must be claimed (${why})`).toBe(true)
    }
  })

  it('every claim in the new file is vendored-source only — no .cpp, no MAME', () => {
    if (!existsSync(NEW_CLAIMS)) return expect.unreachable('claims file missing (see first test)')
    const own = JSON.parse(readFileSync(NEW_CLAIMS, 'utf8')) as Claim[]
    expect(own.length, 'the file is a non-empty claim list').toBeGreaterThan(0)
    for (const c of own) {
      expect(c.source.file, `${c.id}: claims quote VENDORED files only (GPL)`).toMatch(/\.MAC$/)
      expect(c.source.verbatim.length, `${c.id}: verbatim is present`).toBeGreaterThan(0)
      expect(c.id, `${c.id}: uses a WV-/SG- prefix`).toMatch(/^(WV|SG)-/)
    }
  })

  it('the verbatims re-open byte-for-byte against the vendored .MAC files', () => {
    // The same law the citations gate enforces, asserted here narrowly so a RED run
    // points at THIS story's file. trimEnd both sides (the checker's own compare).
    if (!existsSync(NEW_CLAIMS)) return expect.unreachable('claims file missing (see first test)')
    const own = JSON.parse(readFileSync(NEW_CLAIMS, 'utf8')) as Claim[]
    const vendoredRoot = join(claimsDir, '..', '..', '..', '..', '..', 'reference', 'original-source', 'millipede')
    const cache = new Map<string, string[]>()
    const linesOf = (file: string): string[] => {
      let ls = cache.get(file)
      if (ls === undefined) {
        ls = readFileSync(join(vendoredRoot, file), 'utf8').split('\n')
        cache.set(file, ls)
      }
      return ls
    }
    for (const c of own) {
      expect(
        (linesOf(c.source.file)[c.source.line - 1] ?? '').trimEnd(),
        `${c.id}: ${c.source.file}:${c.source.line} must byte-match the claim's verbatim`,
      ).toBe(c.source.verbatim.trimEnd())
    }
  })
})
