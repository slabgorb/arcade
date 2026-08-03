// tests/dossier-process-block.test.ts
//
// Story jt1-10 — RED phase (O'Brien / TEA). The dossier's process-block layout
// parrots a stale vendor comment. GATES jt1-5, which builds the core state on
// exactly this layout.
//
// ─── THE DEFECT ──────────────────────────────────────────────────────────────
// subsystems.md §1 (and claims SUB-001/SUB-002, which repeat its prose verbatim)
// say the process block is "51-byte" with "8 overhead". Both numbers come from
// the vendor's own comment on `PBLKL EQU *`:
//
//     PBLKL   EQU     *               8 OVERHEAD BYTES + PROCESSES EXCLUSIVE RAM
//
// The RMB directives immediately above it disagree with that comment, and the
// assembler follows the directives, not the comment. Verified independently
// this session by walking the declarations from `ORG $0`:
//
//     PLINK 2 + PID 1 + PPRI 1 + PNAP 1 + PPC 2            =  7 overhead
//     + PPOSX 3 + PPOSY 3 + PRAM 43                        = 56 total
//
// So "51" is wrong twice over: it uses the comment's inflated overhead AND
// silently drops PPOSX/PPOSY, the six bytes holding every entity's 16-bit
// pixel+fraction position — the exact fields jt1-5's flight model integrates.
//
// ─── WHY THE CITATION GATE DID NOT CATCH THIS ────────────────────────────────
// jt1-2's checker verifies a claim's `source` — file, line, verbatim, byte for
// byte. It does not read the `claim` PROSE. SUB-001 and SUB-002 both cite real
// lines with correct verbatims while asserting a wrong layout in their text, so
// the gate is green and has always been green. That is worth knowing before
// trusting any claim's prose, and it is why this story needs its own test
// rather than a checker run.
//
// ─── THE NUMBERS ARE DERIVED, NOT TYPED ──────────────────────────────────────
// Where the vendored tree is present, the expected figures are computed from the
// RMB directives at test time. A test that hard-coded 7 and 56 would be exactly
// the failure it is meant to prevent: a number copied from a summary. On CI the
// tree is absent, so the committed literals are checked instead — the jt1-3
// degradation pattern.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { vendoredAvailable, sourceLines } from './helpers/joust-source.js'
// jt9-2 swept this suite's local pre-hardening claims loader onto the shared one
// jt8-3 extracted. Behaviour-preserving — the local copy declared `id`/`claim`
// required where the helper has them optional, and every consumer below already
// reads them defensively (`c.claim ?? ''`, `c.source?.`).
import { loadClaims } from './helpers/claims.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const subsystemsPath = join(repoRoot, 'docs', 'rom-study', 'subsystems.md')

const OVERHEAD_FIELDS = ['PLINK', 'PID', 'PPRI', 'PNAP', 'PPC'] as const
/** Derived from RAMDEF.SRC this session; re-derived below whenever the tree is present. */
const OVERHEAD_BYTES = 7
const BLOCK_BYTES = 56

const readSubsystems = (): string => readFileSync(subsystemsPath, 'utf8')

/**
 * Just the "## 1. Executive / OS" section.
 *
 * Every prose assertion below is scoped to it. Scanning the whole 237-line file
 * makes the checks vacuous: `PPOSX` already appears in §2's flight notes, so a
 * whole-file `toContain('PPOSX')` passed against the UNCORRECTED dossier —
 * caught while writing this suite. A correction has to land in the section that
 * carries the error.
 */
function processBlockSection(): string {
  const md = readSubsystems()
  const start = md.indexOf('## 1. Executive / OS')
  expect(start, 'subsystems.md must keep its §1 heading').toBeGreaterThan(-1)
  const next = md.indexOf('\n## ', start + 1)
  return md.slice(start, next === -1 ? undefined : next)
}


/** Walk the process block from `ORG $0`, honouring RMB sizes, to `PBLKL EQU *`. */
function derivedLayout(): { overhead: number; block: number; lines: Record<string, number> } {
  const lines = sourceLines('RAMDEF.SRC')
  // Anchor on PBLKM, which immediately precedes the block's own `ORG $0`; the
  // file has an earlier ORG $0 for the image pointer table.
  const pblkm = lines.findIndex((l) => /^PBLKM\s+EQU\s+40\b/.test(l))
  expect(pblkm, 'PBLKM EQU 40 must exist in RAMDEF.SRC').toBeGreaterThan(-1)

  let offset = 0
  let overhead = 0
  let block = -1
  const at: Record<string, number> = {}
  const equValues: Record<string, number> = {}
  for (let i = pblkm; i < lines.length; i++) {
    const l = lines[i]
    const equ = l.match(/^(\w+)\s+EQU\s+(\S+)/)
    if (equ) {
      at[equ[1]] = i + 1
      if (equ[1] === 'PBLKL') {
        block = offset
        break
      }
      if (/^\d+$/.test(equ[2])) equValues[equ[1]] = parseInt(equ[2], 10)
      continue
    }
    const rmb = l.match(/^(\w+)\s+RMB\s+(\S+)/)
    if (!rmb) continue
    // Resolve symbolic operands from their own EQU lines (PRAML EQU 43 at :175
    // precedes PRAM RMB PRAML) — the jt1-10 review proved a hardcoded 43 let a
    // mutated PRAML EQU 44 pass all 13 tests. A figure copied, not derived, is
    // the exact defect this story corrects.
    const size = /^\d+$/.test(rmb[2]) ? parseInt(rmb[2], 10) : equValues[rmb[2]]
    if (size === undefined || Number.isNaN(size)) {
      throw new Error(`unresolvable RMB operand ${rmb[2]} at RAMDEF.SRC:${i + 1}`)
    }
    at[rmb[1]] = i + 1
    if ((OVERHEAD_FIELDS as readonly string[]).includes(rmb[1])) overhead += size
    offset += size
  }
  return { overhead, block, lines: at }
}

// ─────────────────────────────────────────────────────────────────────────────
// THE ARITHMETIC — re-derived from the directives, not taken on report.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('the RMB directives, walked from ORG $0', () => {
  it('give 7 overhead bytes and a 56-byte block', () => {
    // This pins my own derivation against the source. If RAMDEF ever changes,
    // or if the walk is wrong, this fails before any dossier assertion does.
    const { overhead, block } = derivedLayout()
    expect(overhead, 'PLINK 2 + PID 1 + PPRI 1 + PNAP 1 + PPC 2').toBe(OVERHEAD_BYTES)
    expect(block, '+ PPOSX 3 + PPOSY 3 + PRAM 43').toBe(BLOCK_BYTES)
  })

  it('and the vendor comment on PBLKL disagrees with them', () => {
    // The provenance the corrected prose must cite. If this line ever stops
    // saying "8", the dossier's explanation of the discrepancy goes stale too.
    const { lines } = derivedLayout()
    const text = sourceLines('RAMDEF.SRC')[lines.PBLKL - 1]
    expect(text, 'PBLKL EQU * carries the stale count').toContain('8 OVERHEAD BYTES')
  })

  it('the six position bytes the 51 figure omits are real fields', () => {
    // PPOSX/PPOSY are not padding — they hold the 16-bit pixel+fraction
    // positions jt1-5 integrates. Dropping them is what turns 56 into 51.
    const src = sourceLines('RAMDEF.SRC')
    const { lines } = derivedLayout()
    expect(src[lines.PPOSX - 1]).toMatch(/^PPOSX\s+RMB\s+3/)
    expect(src[lines.PPOSY - 1]).toMatch(/^PPOSY\s+RMB\s+3/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// THE DOSSIER PROSE.
// ─────────────────────────────────────────────────────────────────────────────
describe('subsystems.md states the directive-derived layout', () => {
  it('says 56-byte block and 7 overhead', () => {
    const md = processBlockSection()
    expect(md, `the block is ${BLOCK_BYTES} bytes`).toMatch(
      new RegExp(`\\b${BLOCK_BYTES}-byte block\\b`),
    )
    expect(md, `overhead is ${OVERHEAD_BYTES} bytes`).toMatch(
      new RegExp(`\\b${OVERHEAD_BYTES}\\s+overhead\\b`),
    )
  })

  it('no longer asserts the stale 51-byte / 8-overhead figures', () => {
    const md = processBlockSection()
    expect(md, 'the 51-byte block claim must be gone').not.toMatch(/\b51-byte block\b/)
    expect(md, 'the "8 overhead" claim must be gone').not.toMatch(/\b8\s+overhead\b/)
  })

  it('accounts for PPOSX and PPOSY explicitly (the bytes the old figure dropped)', () => {
    // Stating 56 without saying where the extra six went would leave the next
    // reader to rediscover this. They are the position fields, and jt1-5 needs
    // to know they live in the block.
    const md = processBlockSection()
    expect(md, 'PPOSX must be accounted for IN the process-block section').toContain('PPOSX')
    expect(md, 'and PPOSY too').toContain('PPOSY')
  })

  it('records the vendor comment as provenance, not as truth', () => {
    // The comment is good history — it is why the dossier said 51 for so long —
    // so the correction should keep it and label it, rather than quietly
    // deleting it and leaving a future reader to hit the same trap.
    const md = processBlockSection()
    expect(md, 'quote or name the stale PBLKL comment').toMatch(/8 OVERHEAD BYTES|PBLKL/)
    expect(
      md,
      'and say plainly that the directives, not the comment, are authoritative',
    ).toMatch(/stale|disagree|contradict|comment is wrong|not the comment/i)
  })

  it('carries a pointer for jt1-5, which builds core state on this layout', () => {
    const md = processBlockSection()
    expect(md, 'name jt1-5 so the next TEA sees the correction').toMatch(/jt1-5/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// THE CLAIMS.
// ─────────────────────────────────────────────────────────────────────────────
describe('the claims carry the corrected layout', () => {
  it('SUB-001 and SUB-002 no longer repeat the stale figures', () => {
    // Both claims quote subsystems.md's prose verbatim, so both inherited the
    // error. The checker never noticed: it verifies `source`, never `claim`.
    const claims = loadClaims()
    const stale = claims
      .filter((c) => /51-byte|8 overhead/.test(c.claim ?? ''))
      .map((c) => c.id)
    expect(stale, 'these claims still assert the stale layout').toEqual([])
  })

  it('at least one claim states the corrected 56-byte / 7-overhead layout', () => {
    const claims = loadClaims()
    const corrected = claims.filter(
      (c) => /\b56\b/.test(c.claim ?? '') && /\b7\b/.test(c.claim ?? ''),
    )
    expect(
      corrected.length,
      'the corrected figures must be asserted by a claim, not only by prose',
    ).toBeGreaterThan(0)
  })

  it('the layout is anchored to the RMB directive lines themselves', () => {
    // The old claims anchor PBLKM (:166) and PLINK (:168). The figures 7 and 56
    // are established by the whole run of directives plus PBLKL, so the
    // correction needs anchors across it — in particular PPOSX/PPOSY, whose
    // absence caused the error, and PBLKL, which carries the stale comment.
    const claims = loadClaims()
    const anchored = (line: number): boolean =>
      claims.some((c) => c.source?.file === 'RAMDEF.SRC' && c.source.line === line)
    const missing: string[] = []
    for (const [name, line] of [
      ['PPOSX', 173],
      ['PPOSY', 174],
      ['PRAM', 176],
      ['PBLKL', 180],
    ] as const) {
      if (!anchored(line)) missing.push(`${name} (RAMDEF.SRC:${line})`)
    }
    expect(missing, 'these directive lines need a claim of their own').toEqual([])
  })

  it('every RAMDEF claim is fully qualified (bare :N reddens the jt1-8 canary)', () => {
    const claims = loadClaims()
    const bad = claims
      .filter((c) => c.source && (!c.source.file || !Number.isInteger(c.source.line)))
      .map((c) => c.id)
    expect(bad).toEqual([])
  })

  it('the prose citation for PRAML is qualified, not a bare :175', () => {
    // subsystems.md writes "(`PRAML`, `:175`)" — a bare continuation citation,
    // one of the 128 the jt1-8 canary bounds. This section is being rewritten
    // anyway, so it is the cheapest possible moment to qualify it.
    const md = processBlockSection()
    expect(md, 'PRAML should cite RAMDEF.SRC:175 in full').not.toMatch(/`PRAML`,\s*`:175`/)
  })
})
