// tests/demo-jt8-7-source.test.ts
//
// Story jt8-7 — RED phase (Mr. Praline / TEA). The PROVENANCE companion to
// tests/demo-jt8-7.test.ts, following the jt1-10/jt2-1 double-entry pattern:
// the behaviour suite encodes what the catch pass DOES, this file proves the
// table and the selector it leans on are real in the vendored 1982 source.
//
// The vendored tree is gitignored, so the byte-reads SKIP where it is absent
// (the jt1-3 degradation pattern); the claim-coverage checks read committed
// files and run everywhere.
//
// ─── WHY THIS FILE EXISTS AT ALL ─────────────────────────────────────────────
// jt8-7's defect is not a wrong constant — it is a table READ SHORT. `EGGI` is
// seven 3-word rows (JOUSTI.SRC:2255-2261) and pictures.ts transcribed the
// first one, anchored startLine 2255 / endLine 2255, and stopped. Nothing was
// wrong with the row it did take; the six it left behind were simply invisible,
// because a single-row anchor is indistinguishable from a complete one.
//
// That is the same shape as the SNPCR1 sound-table finding (a continuation row
// on the NEXT LINE, missed because the cited row parsed cleanly on its own).
// A test that merely re-checks the seven rows we now transcribe would repeat
// the original mistake the day an eighth appears. So the EXTENT is pinned from
// the source side as well: :2254 above and :2262 below must both fail to parse
// as table rows, which is what makes "seven" a measurement rather than a guess.
//
// ─── DOUBLE ENTRY ────────────────────────────────────────────────────────────
// TEA's reader (tests/helpers/joust-source.ts) is the second, independent
// derivation — Dev transcribes however they like and the gate is that the two
// agree. Nothing under src/ may import that reader (pictures-gate.test.ts
// enforces it), or the two entries collapse into one.

import { describe, it, expect } from 'vitest'
import { vendoredAvailable, sourceLines, parseStatement, evalNumber } from './helpers/joust-source.js'
import { loadPictures } from './helpers/pictures-contract.js'
// jt9-2 swept this suite's local pre-hardening claims plumbing onto the shared
// loader jt8-3 extracted. This file's local copy was the ONE without an
// `existsSync` guard — on the helper a missing claims/ returns [] instead of
// throwing. Strictly more tolerant, and the directory is committed either way.
import { loadClaims, type Claim } from './helpers/claims.js'

/** The EGGI table's first and last ROM lines. */
const EGGI_FIRST = 2255
const EGGI_LAST = 2261

/** (collision, position, source) per row, re-derived below from the source. */
const EXPECTED_ROWS: ReadonlyArray<readonly [string, number, string]> = [
  ['CEGGUP', 0x00fa, 'EGGUP'],
  ['CEGGLF', 0x00fb, 'EGGLF'],
  ['CEGGRT', 0x00fb, 'EGGRT'],
  ['CEGGUP', 0x00fb, 'EGGB1'],
  ['CEGGMN', 0xfff6, 'EGGB2'],
  ['CEGGMN', 0xfef5, 'EGGB3'],
  ['CEGGMN', 0x00f5, 'PLY4S'],
]

// ─────────────────────────────────────────────────────────────────────────────
// THE TABLE, READ INDEPENDENTLY.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt8-7 — EGGI is a SEVEN-row frame table in the vendored source', () => {
  it.skipIf(!vendoredAvailable)('reads seven 3-operand FDB rows at JOUSTI.SRC:2255-2261', async () => {
    const lines = sourceLines('JOUSTI.SRC')
    const rows = []
    for (let n = EGGI_FIRST; n <= EGGI_LAST; n++) {
      const st = parseStatement(lines[n - 1], n)
      expect(st, `JOUSTI.SRC:${n} must parse as a table row`).not.toBeNull()
      expect(st!.op, `:${n} is an FDB`).toBe('FDB')
      expect(st!.operands.length, `:${n} carries three operands`).toBe(3)
      rows.push([st!.operands[0], evalNumber(st!.operands[1]), st!.operands[2]] as const)
    }
    expect(rows.map((r) => [...r])).toEqual(EXPECTED_ROWS.map((r) => [...r]))
  })

  it.skipIf(!vendoredAvailable)('the table is LABELLED EGGI on its first row only', async () => {
    // The continuation rows carry no label, which is exactly why a reader that
    // keys on labels sees one row and stops.
    const lines = sourceLines('JOUSTI.SRC')
    expect(parseStatement(lines[EGGI_FIRST - 1], EGGI_FIRST)!.label).toBe('EGGI')
    for (let n = EGGI_FIRST + 1; n <= EGGI_LAST; n++) {
      expect(parseStatement(lines[n - 1], n)!.label, `:${n} is a continuation row`).toBe('')
    }
  })

  it.skipIf(!vendoredAvailable)('the EXTENT is exactly seven rows — :2254 and :2262 are not rows', async () => {
    // This is the guard that makes "seven" a measurement. If a future revision
    // adds an eighth row it fails HERE, loudly, instead of being silently
    // dropped the way rows 1-6 were.
    const lines = sourceLines('JOUSTI.SRC')
    expect(parseStatement(lines[EGGI_FIRST - 2], EGGI_FIRST - 1), 'the line ABOVE the table').toBeNull()
    expect(parseStatement(lines[EGGI_LAST], EGGI_LAST + 1), 'the line BELOW the table').toBeNull()
  })

  it.skipIf(!vendoredAvailable)('the transcribed records AGREE with this independent reading', async () => {
    // Double entry: the port's records, matched row-for-row against the reader.
    // RED today — six of the seven rows have no record at all.
    const word = (v: number): number => ((v % 0x10000) + 0x10000) % 0x10000
    const pics = await loadPictures()
    const lines = sourceLines('JOUSTI.SRC')
    for (let n = EGGI_FIRST; n <= EGGI_LAST; n++) {
      const st = parseStatement(lines[n - 1], n)!
      const rec = pics.ENTITY_RECORDS.find(
        (r) => r.anchor.file === 'JOUSTI.SRC' && r.anchor.startLine === n,
      )
      expect(rec, `no ENTITY_RECORD anchored at JOUSTI.SRC:${n}`).toBeDefined()
      expect(rec!.collision, `:${n} collision`).toBe(st.operands[0])
      expect(word(rec!.position), `:${n} position word`).toBe(word(evalNumber(st.operands[1])))
      expect(rec!.source, `:${n} pixel source`).toBe(st.operands[2])
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// THE SELECTOR, READ INDEPENDENTLY.
//
// WEGG is the egg's per-frame picture chooser. It stores no frame — it derives
// one every frame from PVELX and PVELY — which is precisely why the story's
// filed blocker ("EggState carries no frame field") was not a blocker at all.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt8-7 — WEGG derives the frame from PVELX/PVELY, storing nothing', () => {
  const WEGG_FILE = 'JOUSTRV4.SRC'

  /** Strip the CRLF the vendored tree carries, then collapse tabs to spaces. */
  const norm = (s: string): string => s.replace(/\r$/, '').replace(/\s+/g, ' ').trim()

  it.skipIf(!vendoredAvailable)('branches on PVELX sign and PVELY against $0080', async () => {
    const lines = sourceLines(WEGG_FILE).map(norm)
    // The routine's shape, quoted from the source rather than described.
    expect(lines[3507], ':3508 reads the X velocity').toBe('LDA PVELX,U')
    expect(lines[3508], ':3509 branches on its SIGN').toBe('BPL WEGRIT')
    expect(lines[3509], ':3510 the left table').toContain('LDY #EGFLFT')
    expect(lines[3512], ':3513 the right table').toContain('LDY #EGFRIT')
    expect(lines[3513], ':3514 reads the Y velocity').toContain('LDD PVELY,U')
    expect(lines[3514], ':3515 branches when rising').toContain('BMI WEGVM')
    expect(lines[3515], ':3516 the FALL comparison').toBe('SUBD #$0080')
    // :3524 carries the WEGVM label, so the normalised line is prefixed by it.
    expect(lines[3523], ':3524 the RISE comparison').toBe('WEGVM ADDD #$0080')
  })

  it.skipIf(!vendoredAvailable)('the boundary is ASYMMETRIC — both edges test BGT against zero', async () => {
    // The fall edge is INCLUSIVE (velY=128: SUBD gives 0, BGT fails -> level)
    // and the rise edge is EXCLUSIVE (velY=-128: ADDD gives 0, BGT fails ->
    // WEGD3, a fast rise). AC-2's `|velY| <= $0080` is wrong at exactly -128;
    // the deviation is logged in the session and the behaviour suite follows
    // the ROM. Pinned here so the asymmetry cannot be "tidied" later.
    const lines = sourceLines(WEGG_FILE).map(norm)
    expect(lines[3516], ':3517 fall: BGT past the level frame').toContain('BGT WEGD2')
    expect(lines[3524], ':3525 rise: BGT BACK to the level frame').toContain('BGT WEGUP')
    expect(lines[3525], ':3526 rise falls through to the tilt').toContain('WEGD3 LDA 1,Y')
  })

  it.skipIf(!vendoredAvailable)('EGFLFT and EGFRIT are byte offsets into EGGI, mirrored', async () => {
    // 0/6/12 index EGGI's 6-byte rows -> rows 0/1/2. The two tables share slot
    // 0 (the level frame) and SWAP slots 1 and 2, which is the whole of the
    // rising/falling tilt inversion.
    const lines = sourceLines(WEGG_FILE)
    const lft = parseStatement(lines[3534], 3535)
    const rit = parseStatement(lines[3535], 3536)
    expect(lft?.label, ':3535 is EGFLFT').toBe('EGFLFT')
    expect(rit?.label, ':3536 is EGFRIT').toBe('EGFRIT')
    expect(lft!.operands.map(evalNumber), 'EGFLFT FCB 0,12,6').toEqual([0, 12, 6])
    expect(rit!.operands.map(evalNumber), 'EGFRIT FCB 0,6,12').toEqual([0, 6, 12])
    // The offsets must land on real EGGI rows: 6 bytes per 3-word row.
    for (const off of [...lft!.operands, ...rit!.operands].map(evalNumber)) {
      expect(off % 6, `offset ${off} is a whole row`).toBe(0)
      expect(off / 6, `offset ${off} indexes a transcribed row`).toBeLessThan(
        EGGI_LAST - EGGI_FIRST + 1,
      )
    }
  })

  it.skipIf(!vendoredAvailable)('WEGG writes the chosen row to PPICH and keeps NO frame field', async () => {
    // The load-bearing fact for AC-2: the ROM recomputes the frame every frame
    // and stores only the resulting picture pointer. There is no per-egg frame
    // byte anywhere in the routine, so our EggState needs none either.
    const lines = sourceLines(WEGG_FILE).map(norm)
    expect(lines[3526], ':3527 re-reads the table base').toContain('WEGPAR LDY EGGI')
    expect(lines[3527], ':3528 adds the chosen offset').toContain('LEAY A,Y')
    expect(lines[3528], ':3529 stores the PICTURE pointer only').toContain('STY PPICH,U')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// CLAIM COVERAGE — the house pattern (each story ships its constants' claims).
// ─────────────────────────────────────────────────────────────────────────────
describe('jt8-7 — the constants this story introduces are anchored by claims', () => {
  const anchored = (claims: Claim[], file: string, from: number, to: number): boolean =>
    claims.some((c) => c.source?.file === file && c.source.line >= from && c.source.line <= to)

  it('a CONTINUATION row carries a claim, not just the labelled first row', () => {
    // Deliberately scoped to :2256-2261. Row 0 is already cited by JT8-130
    // ("Egg (JOUSTI.SRC:2255) · up/right/left + 3 hatch stages"), so a range
    // starting at 2255 passes VACUOUSLY today — and JT8-130 is precisely the
    // claim that described seven frames while the port transcribed one. The
    // rows this story adds are the rows that need citing.
    const claims = loadClaims()
    expect(
      anchored(claims, 'JOUSTI.SRC', EGGI_FIRST + 1, EGGI_LAST),
      `a claim must cite an EGGI continuation row (JOUSTI.SRC:${EGGI_FIRST + 1}-${EGGI_LAST})`,
    ).toBe(true)
  })

  it('the WEGG selector and its offset tables carry a claim', () => {
    const claims = loadClaims()
    expect(
      anchored(claims, 'JOUSTRV4.SRC', 3507, 3536),
      'a claim must cite WEGG / EGFLFT / EGFRIT (JOUSTRV4.SRC:3507-3536)',
    ).toBe(true)
  })

  it('every claim id is still unique after the additions', () => {
    const ids = loadClaims().map((c) => c.id)
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
    expect([...new Set(dupes)], 'duplicate claim ids').toEqual([])
  })
})
