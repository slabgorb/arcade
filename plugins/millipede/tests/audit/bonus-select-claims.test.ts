// tests/audit/bonus-select-claims.test.ts
//
// Story ml5-2 — RED phase (TEA). The CLAIMS arm of "bonus life + lives +
// SELECT starting score". The behaviour arms (tests/bonus.test.ts,
// tests/select.test.ts) pin WHAT the tail and the select kernel do; this file
// pins WHERE every constant came from, in the dossier's byte-verifiable
// grammar (ml1-1's gate).
//
// GREEN authors docs/rom-study/claims/15-bonus-select.json quoting the vendored
// 1982 source VERBATIM — generated out of reference/original-source/millipede/,
// never hand-typed (the ml1-2 sidecar lesson). loadClaims() globs claims/*.json,
// so a new file enrols itself; no manifest edit. New id prefixes:
//   BL-*  bonus life + lives — BONUS/BONUS1 (MLSUB.MAC:8-39), the BONUSV
//         increment words (MLTST.MAC:28), the SCORNG tail (MLSUB.MAC:1076-1101
//         with the BNE band, the EXTRAL flag, the 6 cap and the OOPS trap),
//         NLIVES from the DIP (MLSUB.MAC:274-279), the game-start LIVES writes
//         (MLSUB.MAC:350-351, :382-384), DLIVES (MLSUB.MAC:505-508).
//   SL-*  select — BONUSS (MLTST.MAC:8-26), the max rows (MLTST.MAC:30-33),
//         SELEC4 (MLSUB.MAC:1740-1745), select MODE at start (MLSUB.MAC:385-391),
//         the window arithmetic (MLSUB.MAC:1535-1567), applying a selection
//         (MLSUB.MAC:1592-1604), the mushroom seed (MLSUB.MAC:1483-1491).
//
// GPL note: claims quote VENDORED bytes only — every file cited is a `.MAC`.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { claimsDir, loadClaims } from './dossier-sweep'

const NEW_CLAIMS = join(claimsDir, '15-bonus-select.json')

interface Claim {
  id: string
  claim: string
  source: { file: string; line: number; verbatim: string }
}

/** All claims carrying this story's prefixes, wherever loadClaims globs them from. */
const storyClaims = (): Claim[] =>
  (loadClaims() as Claim[]).filter((c) => c.id.startsWith('BL-') || c.id.startsWith('SL-'))
const bonusClaims = (): Claim[] => storyClaims().filter((c) => c.id.startsWith('BL-'))
const selectClaims = (): Claim[] => storyClaims().filter((c) => c.id.startsWith('SL-'))

/** The anchor lines this story MUST pin — the fields and branch points the
 *  behaviour suites depend on. (file, line) each measured against the vendored
 *  tree this session; if the file disagrees, the byte-verify test below fails
 *  loudly rather than this list guessing. */
const REQUIRED_ANCHORS: ReadonlyArray<readonly [string, number, string]> = [
  ['MLTST.MAC', 28, 'BONUSV — the increment words 120,150,200,200'],
  ['MLSUB.MAC', 33, 'BONUS1 — OPTNS1 AND 30, the D4-D5 bonus options'],
  ['MLSUB.MAC', 279, 'STA NLIVES — 2 to 5 lives to start'],
  ['MLSUB.MAC', 384, 'STX LIVES — number of lives minus the one in play'],
  ['MLSUB.MAC', 1080, 'BNE 25$ — the band comparator refusing'],
  ['MLSUB.MAC', 1091, 'STA X,EXTRAL — flag player achievement'],
  ['MLSUB.MAC', 1096, 'BEQ 23$ — no more lives, 6 is max'],
  ['MLSUB.MAC', 1097, 'BCS 20$ — the OOPS-RESET spin trap'],
  ['MLSUB.MAC', 1098, 'INC X,LIVES — add a life as a bonus'],
  ['MLTST.MAC', 14, 'BONUSS — LDX I,8, the disabled/zero entry'],
  ['MLTST.MAC', 23, 'ADC I,08 — skip over the increment words'],
  ['MLSUB.MAC', 1742, 'STA LSCORE — SELEC4 stores the maximum'],
  ['MLSUB.MAC', 391, 'STA MODE — select starting score mode'],
  ['MLSUB.MAC', 1488, 'TAX — 5*SCORE2+1 mushrooms to add'],
]

describe('ml5-2 — bonus + select constants are pinned as byte-verifiable claims', () => {
  it('GREEN ships docs/rom-study/claims/15-bonus-select.json', () => {
    expect(
      existsSync(NEW_CLAIMS),
      'the bonus+select claims file must exist beside 00..14 — one file per study topic',
    ).toBe(true)
  })

  it('the bonus-life mechanisms carry a real BL-* claim population (floor 8)', () => {
    // BONUS1 selection + the words + the band comparator + advance + EXTRAL +
    // cap + trap + lives DIP. Floor, not ceiling — Dev measures the exact lines.
    expect(bonusClaims().length).toBeGreaterThanOrEqual(8)
  })

  it('the select kernel carries a real SL-* claim population (floor 8)', () => {
    // BONUSS index math + the rows + SELEC4 + MODE + the window steps/stops +
    // applying a selection + the mushroom seed.
    expect(selectClaims().length).toBeGreaterThanOrEqual(8)
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
      expect(c.id, `${c.id}: uses a BL-/SL- prefix`).toMatch(/^(BL|SL)-/)
    }
  })

  it('the verbatims re-open byte-for-byte against the vendored .MAC files', () => {
    // The same law the citations gate enforces, asserted here narrowly so a RED
    // run points at THIS story's file. trimEnd both sides (the checker's compare).
    if (!existsSync(NEW_CLAIMS)) return expect.unreachable('claims file missing (see first test)')
    const own = JSON.parse(readFileSync(NEW_CLAIMS, 'utf8')) as Claim[]
    const vendoredRoot = join(
      claimsDir, '..', '..', '..', '..', '..', 'reference', 'original-source', 'millipede',
    )
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
