// tests/audit/high-scores-claims.test.ts
//
// Story ml5-3 — RED phase (Han Solo / TEA). The CLAIMS arm of "high-score table +
// initials". The behaviour arm (tests/highscore.test.ts) pins WHAT the ladder does;
// this file pins WHERE every transcribed constant came from, in the dossier's
// byte-verifiable grammar (ml1-1's gate). The default ladder is transcribed numeric
// ROM data, so it MUST land behind the citation gate — the rb4/cp1 lesson the gate
// exists for: a numeric story that lands before its claims re-bakes its own
// misreadings and then confirms itself.
//
// GREEN authors docs/rom-study/claims/14-high-scores.json quoting the vendored 1982
// source VERBATIM — generated out of reference/original-source/millipede/, never
// hand-typed (the ml1-2 sidecar lesson). loadClaims() globs claims/*.json, so a new
// file enrols itself; no manifest edit. New id prefix:
//   HS-*  the high-score store — NSCORE depth (MLDEF.MAC:189), the HSCORE/INITL
//         layout (MLDEF.MAC:275-276), the eight default score+initials triples
//         (MLTST.MAC:97-112), GETINT (MLSUB.MAC:547) and UPDATE (MLSUB.MAC:1817).
//
// One claim per default rung so each seeded score/initials pair carries its own
// cited byte — the same one-claim-per-literal discipline MC's HISCORE-DEFAULT-*
// claims use. RADIX 16 is already claimed (RX-1); no need to re-pin it here.
//
// GPL note: MAME facts stay PROSE; the sweep grammar excludes .cpp by construction,
// so no claim in the new file may cite a .cpp — claims are for VENDORED bytes only.
// Every source file cited here is a `.MAC`.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { claimsDir, loadClaims } from './dossier-sweep'

const NEW_CLAIMS = join(claimsDir, '14-high-scores.json')

interface Claim {
  id: string
  claim: string
  source: { file: string; line: number; verbatim: string }
}

/** All claims carrying this story's prefix, wherever loadClaims globs them from. */
const storyClaims = (): Claim[] => (loadClaims() as Claim[]).filter((c) => c.id.startsWith('HS-'))

/** The anchor lines this story MUST pin — the fields, data and routines the
 *  behaviour suite depends on. (file, line) each measured against the vendored tree
 *  this session; the byte-verify test below fails loudly if any drifts. */
const REQUIRED_ANCHORS: ReadonlyArray<readonly [string, number, string]> = [
  ['MLDEF.MAC', 189, 'NSCORE =8 — the ladder depth (number of high score entries)'],
  ['MLDEF.MAC', 275, 'HSCORE .BLKB 3*NSCORE — LSB,MIDDLE,MSB BCD score triples'],
  ['MLDEF.MAC', 276, 'INITL .BLKB 3*NSCORE — high score initials'],
  ['MLTST.MAC', 97, '99$ INITIAL SCORES — first default score triple (BBM 89175)'],
  ['MLTST.MAC', 105, 'BBM — first default initials triple (INITIAL SET OF INITIALS)'],
  ['MLSUB.MAC', 547, 'GETINT — get players initials for high score (3 initials)'],
  ['MLSUB.MAC', 1817, 'UPDATE — update high score table'],
]

describe('ml5-3 — high-score constants are pinned as byte-verifiable claims', () => {
  it('GREEN ships docs/rom-study/claims/14-high-scores.json', () => {
    expect(
      existsSync(NEW_CLAIMS),
      'the high-scores claims file must exist beside 00..13 — one file per study topic',
    ).toBe(true)
  })

  it('the high-score store carries a real HS-* claim population (floor 12)', () => {
    // NSCORE + HSCORE/INITL layout + 8 default rungs + GETINT + UPDATE = 12 minimum.
    // Floor, not ceiling — Dev measures the exact lines and may split further.
    expect(storyClaims().length).toBeGreaterThanOrEqual(12)
  })

  it('all eight default rungs are claimed to the MLTST default block', () => {
    // The eight score triples (97-104) and/or their paired initials (105-112) live
    // in one contiguous block; every seeded value must be cited to it.
    const mltstLines = storyClaims()
      .filter((c) => c.source.file === 'MLTST.MAC')
      .map((c) => c.source.line)
    const inDefaultBlock = mltstLines.filter((n) => n >= 97 && n <= 112)
    expect(inDefaultBlock.length, 'the default ladder rows are cited to MLTST.MAC:97-112').toBeGreaterThanOrEqual(8)
  })

  it('the required field/data/routine anchors are all claimed', () => {
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
      expect(c.id, `${c.id}: uses an HS- prefix`).toMatch(/^HS-/)
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
