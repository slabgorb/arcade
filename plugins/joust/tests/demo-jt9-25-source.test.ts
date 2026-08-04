// tests/demo-jt9-25-source.test.ts
//
// Story jt9-25 — RED phase (TEA). The PROVENANCE companion to demo-jt9-25.test.ts:
// EGGTBL and its driver read straight out of the vendored 1982 source, the other
// direction from the behaviour suite (the jt1-10 / jt2-3 / jt2-4 double-entry
// pattern). The vendored tree is gitignored, so the byte-reads SKIP on CI; the
// claim-coverage checks read the committed claims/ and run everywhere.
//
// jt8-7's whole defect was a table read SHORT because its continuation rows carry no
// label; the same reading habit missed EGGTBL, the next table in the block. So this
// file also pins the block EXTENT — the next header — so a future reader stops in the
// right place.
//
// Node env on purpose (reads src/vendored off disk). This header never spells the
// vitest env directive as a token.

import { describe, it, expect } from 'vitest'
import { vendoredAvailable, sourceLines, bytesInRange } from './helpers/joust-source.js'
import { loadClaims, claimCovers } from './helpers/claims.js'

/** The vendored line (1-based), right-trimmed. */
const line = (file: string, n: number): string => (sourceLines(file)[n - 1] ?? '').replace(/\s+$/, '')

// EGGTBL, 8 rows x 3 bytes, JOUSTRV4.SRC:3537-3544 (7+60 = 67).
const EGGTBL_BYTES = [6, 6, 7, 0, 6, 3, 12, 6, 7, 0, 6, 67, 18, 6, 7, 24, 11, 7, 30, 11, 7, 36, 11, 0]

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — the table exists in the vendored source, byte-exact, in its block.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('EGGTBL byte-reads straight from JOUSTRV4.SRC', () => {
  it('the block header names the EGG ANIMATION TABLE (:3533)', () => {
    expect(line('JOUSTRV4.SRC', 3533).toUpperCase()).toContain('EGG ANIMATION TABLE')
  })

  it('EGGTBL (:3537-3544) is [6,6,7 / 0,6,3 / 12,6,7 / 0,6,67 / 18,6,7 / 24,11,7 / 30,11,7 / 36,11,0]', () => {
    expect(bytesInRange('JOUSTRV4.SRC', 3537, 3544)).toEqual(EGGTBL_BYTES)
  })

  it('WIGGLE UP & PAUSE is written 7+60, i.e. 67 (the long-pause tell)', () => {
    expect(line('JOUSTRV4.SRC', 3540)).toContain('7+60')
    expect(bytesInRange('JOUSTRV4.SRC', 3540, 3540)).toEqual([0, 6, 67])
  })

  it('EGGTBL sits directly after EGFLFT/EGFRIT, which are UNDISTURBED (:3535-3536)', () => {
    // The neighbours this story transcribes beside — a regression guard on the read.
    expect(bytesInRange('JOUSTRV4.SRC', 3535, 3536)).toEqual([0, 12, 6, 0, 6, 12])
    expect(line('JOUSTRV4.SRC', 3535)).toContain('EGFLFT')
    expect(line('JOUSTRV4.SRC', 3537)).toContain('EGGTBL')
  })

  it('the block ENDS at :3544 — the next header is BUZARD SEEKING MAN (:3546)', () => {
    // Pin the extent so "read to the next header" is enforced, not trusted.
    expect(line('JOUSTRV4.SRC', 3546).toUpperCase()).toContain('SEEKING MAN')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — the driver at :3290-3307 defines what the three columns MEAN.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('the EGGMAN driver reads EGGTBL a column at a time (:3290-3307)', () => {
  it('sets up the walk: LDX #EGGTBL, the SIDE SHOW pointer (:3290)', () => {
    expect(line('JOUSTRV4.SRC', 3290)).toContain('LDX\t#EGGTBL')
    expect(line('JOUSTRV4.SRC', 3290).toUpperCase()).toContain('SIDE SHOW')
  })

  it('col 0 is the FRAME OFFSET: LDA [PRDIR,U] then JSR WEGPAR draws it (:3299-3300)', () => {
    expect(line('JOUSTRV4.SRC', 3299)).toContain('LDA\t[PRDIR,U]')
    expect(line('JOUSTRV4.SRC', 3299).toUpperCase()).toContain('FRAME OFFSET')
    expect(line('JOUSTRV4.SRC', 3300)).toContain('JSR\tWEGPAR')
  })

  it('col 1 is the collision HEIGHT: SUBA 1,X then STA PCOLY2 (:3304-3305)', () => {
    expect(line('JOUSTRV4.SRC', 3304)).toContain('SUBA\t1,X')
    expect(line('JOUSTRV4.SRC', 3305)).toContain('STA\tPCOLY2,U')
  })

  it('col 2 is the nap AND the terminator: LDA 2,X / BNE EGGHCH (:3306-3307)', () => {
    expect(line('JOUSTRV4.SRC', 3306)).toContain('LDA\t2,X')
    expect(line('JOUSTRV4.SRC', 3307)).toContain('BNE\tEGGHCH')
  })

  it('each row is 3 bytes and naps col 2: LEAX 3,X / JSR VNAPTPC (:3294-3296)', () => {
    expect(line('JOUSTRV4.SRC', 3294)).toContain('LEAX\t3,X')
    expect(line('JOUSTRV4.SRC', 3294).toUpperCase()).toContain('NEXT EGG HATCHING FRAME')
    expect(line('JOUSTRV4.SRC', 3296)).toContain('JSR\tVNAPTPC')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-5 — a committed claim covers EGGTBL and its driver (runs everywhere).
// ─────────────────────────────────────────────────────────────────────────────
describe('EGGTBL is backed by committed claims (the citations suite)', () => {
  it('a claim cites the EGGTBL table rows (JOUSTRV4.SRC:3537-3544)', () => {
    const claims = loadClaims()
    expect(
      claimCovers(claims, 'JOUSTRV4.SRC', 3537, 3544),
      'RED until GREEN adds a claim citing the EGG ANIMATION TABLE rows',
    ).toBe(true)
  })

  it('a claim cites the EGGMAN driver that walks it (JOUSTRV4.SRC:3290-3307)', () => {
    const claims = loadClaims()
    expect(
      claimCovers(claims, 'JOUSTRV4.SRC', 3290, 3307),
      'RED until GREEN adds a claim citing the EGGTBL driver (col0 draw / col1 height / col2 nap)',
    ).toBe(true)
  })
})
