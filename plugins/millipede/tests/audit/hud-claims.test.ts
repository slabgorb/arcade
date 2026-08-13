// tests/audit/hud-claims.test.ts
//
// Story ml7-3 — RED phase (TEA). The CLAIMS arm of the HUD. The behaviour arms
// (tests/hud.test.ts, tests/hud-render.test.ts) pin WHAT the geometry and the
// routing do; this file pins WHERE every constant came from, in the dossier's
// byte-verifiable grammar (ml1-1's gate).
//
// GREEN authors docs/rom-study/claims/16-hud.json quoting the vendored 1982
// source VERBATIM — generated out of reference/original-source/millipede/,
// never hand-typed (the ml1-2 sidecar lesson). loadClaims() globs claims/*.json,
// so a new file enrols itself; no manifest edit. New id prefix:
//   HD-*  the HUD — UPSCRE (MLSUB.MAC:1912-1966: P1 score at PLYFLD+$1F, the
//         high score at PLYFLD+$19F, SEC/CLC zero-suppression), DLIVES
//         (MLSUB.MAC:505-545: six slots, ship stamp $1F at PLYFLD+$0DF),
//         CHAR's +$20 per-character stride (MLIRQ.MAC:654-661), DIGITZ's
//         digit glyphs $20-$29 (MLIRQ.MAC:687-695), and DDTS2's two-stamp
//         bomb draw (MLSUB.MAC:443-476).
//   (The DDT stamp values/tables themselves are ALREADY claimed — 13-ddt.json
//   DD-4/DD-38..41 — and are NOT re-claimed here; one fact, one claim.)
//
// GPL note: claims quote VENDORED bytes only — every file cited is a `.MAC`.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { claimsDir, loadClaims } from './dossier-sweep'

const NEW_CLAIMS = join(claimsDir, '16-hud.json')

interface Claim {
  id: string
  claim: string
  source: { file: string; line: number; verbatim: string }
}

/** All claims carrying this story's prefix, wherever loadClaims globs them from. */
const hudClaims = (): Claim[] => (loadClaims() as Claim[]).filter((c) => c.id.startsWith('HD-'))

/** The anchor lines this story MUST pin — the addresses, stamps and branch
 *  semantics the behaviour suites transcribed. (file, line) each measured
 *  against the vendored tree this session; if the file disagrees, the
 *  byte-verify test below fails loudly rather than this list guessing. */
const REQUIRED_ANCHORS: ReadonlyArray<readonly [string, number, string]> = [
  ['MLSUB.MAC', 1915, 'UPSCRE — P1 score six digits start at PLYFLD+$1F (col 0, row $1F)'],
  ['MLSUB.MAC', 1924, 'SEC — leading-zero suppression ON entering the score'],
  ['MLSUB.MAC', 1929, 'CLC — the last digit pair always renders'],
  ['MLSUB.MAC', 1950, 'the high score displays at PLYFLD+$19F (col 12)'],
  ['MLSUB.MAC', 507, 'DLIVES — LDA I,6, the six ship slots'],
  ['MLSUB.MAC', 509, 'P1 lives display at PLYFLD+$0DF (col 6)'],
  ['MLSUB.MAC', 518, 'LDA I,1F — the PICTURE OF SHIP life icon stamp'],
  ['MLSUB.MAC', 443, 'DDTS2 — the DDT bomb draw routine'],
  ['MLSUB.MAC', 460, 'LDA I,DDT+1 — the +$20 neighbour-column stamp'],
  ['MLSUB.MAC', 470, 'LDA I,DDT — the stamp at the entry offset'],
  ['MLIRQ.MAC', 658, 'CHAR — ORA I,20, the +$20 per-character stride'],
  ['MLIRQ.MAC', 691, 'DIGITZ — ORA I,20, DIGITS ARE 20-29'],
]

describe('ml7-3 — HUD constants are pinned as byte-verifiable claims', () => {
  it('GREEN ships docs/rom-study/claims/16-hud.json', () => {
    expect(
      existsSync(NEW_CLAIMS),
      'the HUD claims file must exist beside 00..15 — one file per study topic',
    ).toBe(true)
  })

  it('the HUD carries a real HD-* claim population (RED floor 12 — one per anchor)', () => {
    // RED sets the floor at the anchor count; GREEN raises it to the shipped
    // count so a silent claim deletion reddens while additions stay free
    // (the ml5-2 law).
    expect(hudClaims().length).toBeGreaterThanOrEqual(12)
  })

  it('the required address/stamp/branch anchors are all claimed', () => {
    const claimed = new Set(hudClaims().map((c) => `${c.source.file}:${c.source.line}`))
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
      expect(c.id, `${c.id}: uses the HD- prefix`).toMatch(/^HD-/)
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
