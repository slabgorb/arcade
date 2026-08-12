// tests/audit/palette-claims.test.ts
//
// Story ml2-3 — RED phase (Tyr / TEA). "Pin the palette source as claims": the
// CLAIMS arm of the RAM-colour palette seam. The behaviour arm
// (tests/palette.test.ts) pins WHAT the decode says; this file pins WHERE it
// came from, in the dossier's own byte-verifiable grammar (ml1-1's gate, the
// shape ml1-2/ml1-3/ml1-4 armed for the four dossier docs).
//
// The palette SOURCE is CLRCH — COLOR RAM INITIALIZATION (MLIRQ.MAC:242): the
// routine that writes the colour bytes into ANCOL/MOCOL, its per-level colour
// table (`99$`), and the two immediate constants whose comments corroborate the
// wiring law from the 1982 side (RED at :294, WHITE at :297). GREEN authors
// docs/rom-study/claims/06-colour-ram-palette.json quoting those lines VERBATIM
// out of the vendored file — generated, never hand-typed (the ml1-2 sidecar
// lesson) — and the EXISTING citations gate byte-verifies them like every other
// claim (loadClaims() globs claims/*.json, so a new file enrols itself).
//
// GPL note: MAME facts stay PROSE (`centiped_v.cpp:N`); the sweep grammar
// excludes .cpp by construction (ml1-4's board-facts header states why), so no
// claim in the new file may cite a .cpp — claims are for VENDORED bytes only.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { claimsDir, loadClaims } from './dossier-sweep'

/** The CLRCH block in the vendored MLIRQ.MAC: the .SBTTL header (:242)
 *  through the OPENING of the `99$` per-level colour table. Review round 2
 *  (F3) — the true extent, measured both sides: the table itself runs
 *  MLIRQ.MAC:304-351 (one 12-byte row per CENTIN level, 1..12, `.PAGE` at
 *  :352). 315 is a DELIBERATE narrow fence: it admits the routine, the
 *  stride arithmetic, the RED/WHITE corroborators and the table's opening
 *  rows — the CENTIN=4..12 continuation rows are outside it and are the
 *  business of whichever story transcribes the full per-level table. */
const CLRCH_FIRST = 242
const CLRCH_LAST = 315

const NEW_CLAIMS = join(claimsDir, '06-colour-ram-palette.json')

interface Claim {
  id: string
  claim: string
  source: { file: string; line: number; verbatim: string }
}

const paletteClaims = (): Claim[] =>
  (loadClaims() as Claim[]).filter(
    (c) => c.source.file === 'MLIRQ.MAC' && c.source.line >= CLRCH_FIRST && c.source.line <= CLRCH_LAST,
  )

describe('ml2-3 — the palette source is pinned as byte-verifiable claims', () => {
  it('GREEN ships docs/rom-study/claims/06-colour-ram-palette.json', () => {
    expect(
      existsSync(NEW_CLAIMS),
      'the palette-source claims file must exist beside 00..05 — one file per study topic',
    ).toBe(true)
  })

  it('the CLRCH block carries a real claim population (floor 8)', () => {
    // Pre-story the block holds ONE covering claim (ml1-3's SS-14 subsystem
    // row). Pinning the palette SOURCE means the mechanism is quoted: the
    // header, the ANCOL/MOCOL writes that give slots their meaning, the
    // per-level table rows, and the RED/WHITE corroborators. Floor, not
    // ceiling — Dev measures the exact rows.
    expect(paletteClaims().length).toBeGreaterThanOrEqual(8)
  })

  it('the RED and WHITE corroborators are among them (MLIRQ.MAC:294, :297)', () => {
    // The 1982 source's own colour names for $1F and $00 — the primary-side
    // anchors the behaviour suite decodes against. Their exact lines were
    // measured this session; if the vendored file disagrees, the claim gate
    // byte-fails loudly rather than this test guessing.
    const lines = new Set(paletteClaims().map((c) => c.source.line))
    expect(lines.has(294), 'the RED constant (LDA I,1F) is claimed').toBe(true)
    expect(lines.has(297), 'the WHITE constant (LDA I,0) is claimed').toBe(true)
  })

  it('every claim in the new file is vendored-source only — no .cpp, no MAME', () => {
    if (!existsSync(NEW_CLAIMS)) return expect.unreachable('claims file missing (see first test)')
    const own = JSON.parse(readFileSync(NEW_CLAIMS, 'utf8')) as Claim[]
    expect(own.length, 'the file is a non-empty claim list').toBeGreaterThan(0)
    for (const c of own) {
      expect(c.source.file, `${c.id}: claims quote VENDORED files only (GPL)`).toMatch(/\.MAC$/)
      expect(c.source.verbatim.length, `${c.id}: verbatim is present`).toBeGreaterThan(0)
    }
  })

  it('the verbatims re-open byte-for-byte against the vendored MLIRQ.MAC', () => {
    // The same law the citations gate enforces, asserted here narrowly so a RED
    // run points at THIS story's file instead of the whole-gate sweep. trimEnd
    // both sides (the checker's own comparison).
    if (!existsSync(NEW_CLAIMS)) return expect.unreachable('claims file missing (see first test)')
    const own = JSON.parse(readFileSync(NEW_CLAIMS, 'utf8')) as Claim[]
    const quarry = readFileSync(
      join(claimsDir, '..', '..', '..', '..', '..', 'reference', 'original-source', 'millipede', 'MLIRQ.MAC'),
      'utf8',
    ).split('\n')
    for (const c of own) {
      if (c.source.file !== 'MLIRQ.MAC') continue
      expect(
        (quarry[c.source.line - 1] ?? '').trimEnd(),
        `${c.id}: MLIRQ.MAC:${c.source.line} must byte-match the claim's verbatim`,
      ).toBe(c.source.verbatim.trimEnd())
    }
  })
})
