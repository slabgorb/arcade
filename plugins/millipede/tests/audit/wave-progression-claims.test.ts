// tests/audit/wave-progression-claims.test.ts
//
// Story pt1-2 — the CLAIMS arm of "the between-wave difficulty walk is wired".
// tests/wave-progression.test.ts pins WHAT the wiring does; this file pins WHERE the
// five wiring anchors came from, in the dossier's byte-verifiable grammar. GREEN
// authored docs/rom-study/claims/17-wave-progression.json from the vendored source
// VERBATIM (generated, never hand-typed — the ml1-2/ml5-1 lesson). loadClaims() globs
// claims/*.json, so the new file enrols itself; no manifest edit.
//
// Prefix WP-* — the WAVE-PROGRESSION wiring seams the walk (MT-*), CONWAY (CW-*) and
// BOMBS (DD-*) pure functions hang off: CENTIS init (MILLI.MAC:1171), the INC CENTIS
// "FASTER" on wave clear (:1906), the CENTIS==3 gate (:1908), the CENTIN==9 -> INICON
// CONWAY gate (:1911-1914) and the per-frame JSR BOMBS (:28). GPL: vendored .MAC only.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { claimsDir, loadClaims, loadClaimsFile, isTextClaim } from './dossier-sweep'

const NEW_CLAIMS = join(claimsDir, '17-wave-progression.json')

const wpClaims = () => loadClaims().filter(isTextClaim).filter((c) => c.id.startsWith('WP-'))

/** The wiring anchors this story MUST pin — the seams the wave-progression suite
 *  depends on. (file, line) each measured against the vendored tree this session. */
const REQUIRED_ANCHORS: ReadonlyArray<readonly [string, number, string]> = [
  ['MILLI.MAC', 1171, 'CENTIS := 2 — FAST TO START WITH'],
  ['MILLI.MAC', 1906, 'INC CENTIS — the FASTER wave-clear speedup'],
  ['MILLI.MAC', 1908, 'CMP I,03 — the CENTIS==3 wave-event gate'],
  ['MILLI.MAC', 1912, 'CMP I,9 — the CONWAY CENTIN selector'],
  ['MILLI.MAC', 1914, 'JMP INICON — start CONWAY on CENTIN==9'],
  ['MILLI.MAC', 28, 'JSR BOMBS — the per-frame dispatcher call'],
]

describe('pt1-2 — wave-progression wiring anchors are byte-verifiable claims', () => {
  it('GREEN ships docs/rom-study/claims/17-wave-progression.json', () => {
    expect(existsSync(NEW_CLAIMS), 'the wave-progression claims file must exist').toBe(true)
  })

  it('the wiring anchors carry a real WP-* claim population (floor 6)', () => {
    expect(wpClaims().length).toBeGreaterThanOrEqual(6)
  })

  it('every required wiring anchor is claimed', () => {
    const claimed = new Set(wpClaims().map((c) => `${c.source.file}:${c.source.line}`))
    for (const [file, line, why] of REQUIRED_ANCHORS) {
      expect(claimed.has(`${file}:${line}`), `${file}:${line} must be claimed (${why})`).toBe(true)
    }
  })

  it('every claim in the new file is vendored-.MAC only, non-empty verbatim', () => {
    if (!existsSync(NEW_CLAIMS)) return expect.unreachable('claims file missing (see first test)')
    const own = loadClaimsFile(NEW_CLAIMS)
    expect(own.length, 'the file is a non-empty claim list').toBeGreaterThan(0)
    for (const c of own) {
      expect(c.source.file, `${c.id}: claims quote VENDORED files only (GPL)`).toMatch(/\.MAC$/)
      if (!isTextClaim(c)) expect.unreachable(`${c.id}: a byte citation in a text-only claims file`)
      expect(c.source.verbatim.length, `${c.id}: verbatim is present`).toBeGreaterThan(0)
      expect(c.id, `${c.id}: uses the WP- prefix`).toMatch(/^WP-/)
    }
  })

  it('the verbatims re-open byte-for-byte against the vendored .MAC files', () => {
    if (!existsSync(NEW_CLAIMS)) return expect.unreachable('claims file missing (see first test)')
    const own = loadClaimsFile(NEW_CLAIMS)
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
      if (!isTextClaim(c)) expect.unreachable(`${c.id}: a byte citation in a text-only claims file`)
      expect(
        (linesOf(c.source.file)[c.source.line - 1] ?? '').trimEnd(),
        `${c.id}: ${c.source.file}:${c.source.line} must byte-match the claim's verbatim`,
      ).toBe(c.source.verbatim.trimEnd())
    }
  })
})
