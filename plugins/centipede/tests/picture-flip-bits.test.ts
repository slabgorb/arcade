// tests/picture-flip-bits.test.ts
//
// Story cp7-1 — RED phase (O'Brien / TEA). The MECHANISM half of the mirrored
// points-sprite fix. tests/points-sprite-flip.test.ts proves the three PTS
// sprites come out of the bake correctly handed; this file proves they do so
// because the picture byte's BITS were read (AC-3), not because three stamp names
// were special-cased.
//
// That distinction cannot be settled by the three real stamps. A
// `new Set(['THREE','SIX','NINE'])` and a bit decoder agree on every picture code
// the game actually draws — the only thing that separates them is a code carrying
// a flip bit that is NOT one of the three. Hence the SYNTHETIC rows in the table
// below (0x40, 0x80, 0xC0). This is the standing
// derived-vs-transcribed-needs-a-synthetic-input rule: when every real input
// agrees, the fabricated input is the entire guard.
//
// ─── THE BITS, AND WHICH SCREEN AXIS EACH ONE IS ─────────────────────────────
// CENDE4.MAC names them as cocktail-cabinet controls:
//   :239  CKC0  "VALUE THAT FLIPS AND TURNS PICTURES IN COCKTAIL VERSION"  (= 0xC0)
//   :248  CK40  "USED FOR FLIPPING PICTURES UPSIDE DOWN IN COCKTAIL VERSION" (= 0x40)
// CK40 is bit 6 alone and the ROM calls it "upside down", so bit 6 is the VERTICAL
// flip; CKC0 is bits 6+7 together and the ROM calls it a flip AND a turn, i.e. the
// 180-degree cocktail rotation — which leaves bit 7 as the HORIZONTAL mirror.
// Confirmed against the pixels: reversing the ROM row axis (bit 7) mirrors the
// screen grid left-to-right, reversing the ROM column axis (bit 6) moves the blank
// band from the top of the screen grid to the bottom. Two bits, two axes, and the
// ROM's own names land on the right ones.
//
// In an upright cabinet CLEAR zeroes CKC0/CK40 (CENTI4.MAC:745-748), so the EORs
// at CENTI4.MAC:308/:312/:432 and :54 are the identity. That is why the bits BAKED
// INTO A CONSTANT still fire: they were never the cocktail variable.
//
// ─── WHERE THIS FUNCTION IS *NOT* THE ANSWER ─────────────────────────────────
// `flipsForPicture` is a pure decode of two bits. It is deliberately NOT aware
// that centipede segments reuse the same two bits as BODY (0x40) and DEAD (0x80)
// flags — `CENT_BODY_PIC = 0x42`, `DEAD_BIT = 0x80` (src/core/centipede.ts:63-71),
// which CENDE4.MAC:129-137 states outright ("D6=0 FOR HEAD", "D7=1 FOR NO
// OBJECT"). The ROM resolves that collision by CONTROL FLOW, not by clear bits:
// CENIR4.MAC:347-351 branches on the slot index (CPX I,NCENT / BCS 33$) and only
// then masks with AND I,3F / AND I,0F. render.ts's segmentStamp(pic & 0x0F)
// already mirrors that mask. So this function reporting a flip for 0x42 is CORRECT
// and the exemption lives at the call site — pinned by the "no HEAD stamp is baked
// flipped" census in the sibling file.
//
// RED: src/core/pictures.ts exports no `flipsForPicture`, so this file fails at
// import. That is the whole point of splitting it out — the behavioural goldens
// next door stay red for their own reason (mirrored pixels), not for this one.

import { describe, it, expect } from 'vitest'
import { flipsForPicture, decodeStamp, STAMPS, PLANE_LOWER, PLANE_UPPER } from '../src/core/pictures'
import picturesSrc from '../src/core/pictures.ts?raw'
import atlasSrc from '../src/shell/atlas.ts?raw'
import { bakeAtlas, stampsThatMoved, stampNamed } from './helpers/bake-atlas'

// Strip line + block comments so a word in prose cannot satisfy a positive scan
// (the cp2-1 R3 idiom, and the standing "source guards must strip comments" rule).
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

// pic, flipX (horizontal mirror), flipY (vertical), and why the row is here.
const FLIP_TABLE: ReadonlyArray<readonly [number, boolean, boolean, string]> = [
  // The three the story exists for — all carry bit 7, none carries bit 6.
  [0xb6, true, false, 'THREE (PTS 300)'],
  [0xb7, true, false, 'NINE (PTS 900)'],
  [0xb8, true, false, 'SIX (PTS 600)'],
  // Every picture code the game draws with both bits clear.
  [0x00, false, false, 'segment head picture 0'],
  [0x03, false, false, 'CENT_HEAD_PIC'],
  [0x14, false, false, 'BUG0 (spider walking)'],
  [0x1c, false, false, 'ANT0 (flea)'],
  [0x30, false, false, 'SCORP0'],
  // SYNTHETIC — no shipped picture code has bit 6 set and bit 7 clear. Without
  // this row a hardcoded three-name list passes every other assertion in the file.
  [0x40, false, true, 'SYNTHETIC: bit 6 alone (CK40, "upside down")'],
  // SYNTHETIC — bit 7 alone on a code that is not one of the three PTS sprites.
  [0x80, true, false, 'SYNTHETIC: bit 7 alone, not a PTS code'],
  // SYNTHETIC — CKC0's 180-degree turn on a code that is not an explosion.
  [0xc0, true, true, 'SYNTHETIC: bits 6+7 (CKC0, flip AND turn)'],
  // Real, and out of scope for the fix (AC-6 files it): the explosion pool.
  [0xff, true, true, 'explosion 0xFF — both bits, a 180-degree turn'],
  // Real, and the trap: the segments reuse these bits as BODY/DEAD flags. The
  // pure decoder reports the flip; the exemption is the mask at the call site.
  [0x42, false, true, 'CENT_BODY_PIC — bit 6 is the BODY flag, masked by the caller'],
]

describe('cp7-1 AC-3 — flipsForPicture decodes the picture byte, bit by bit', () => {
  for (const [pic, flipX, flipY, why] of FLIP_TABLE) {
    it(`0x${pic.toString(16).toUpperCase().padStart(2, '0')} -> flipX=${flipX} flipY=${flipY}  [${why}]`, () => {
      expect(flipsForPicture(pic)).toEqual({ flipX, flipY })
    })
  }

  it('only bits 6 and 7 matter — the address bits never change the answer', () => {
    // Sweep every low-6-bit value under a fixed pair of flip bits, so a decoder
    // that also reads an ADDRESS bit is caught.
    //
    // What this earns, measured rather than assumed. A decoder that reads the
    // POISON bit (`pic & 0x20`) is NOT unique to this test — 0xB6 itself has bit 5
    // set, so the THREE/SIX/NINE goldens next door redden too (battery M3: 9 red).
    // What only this sweep sees is a stray rule keyed on a code that NO stamp
    // declares — e.g. `|| (pic & 0x1f) === 0x1f`, which touches nothing in STAMPS
    // and so is invisible to every pixel assertion in the suite (battery M10: 1
    // red, this test alone).
    for (let low = 0; low < 0x40; low++) {
      expect(flipsForPicture(0x80 | low), `0x${(0x80 | low).toString(16)} must decode as bit 7 alone`).toEqual({
        flipX: true,
        flipY: false,
      })
      expect(flipsForPicture(low), `0x${low.toString(16)} must decode as no flip`).toEqual({
        flipX: false,
        flipY: false,
      })
    }
  })
})

describe('cp7-1 AC-3 — the BAKE consults the bits, and does not special-case stamp names', () => {
  it('atlas.ts routes through flipsForPicture (source-read, comment-stripped)', () => {
    expect(stripComments(atlasSrc), 'the bake must derive its flip from the picture byte').toMatch(/flipsForPicture/)
  })

  it('atlas.ts does not name THREE, SIX or NINE (AC-3: not a hardcoded list of three stamp names)', () => {
    const code = stripComments(atlasSrc)
    for (const name of ['THREE', 'SIX', 'NINE']) {
      expect(code, `atlas.ts special-cases the stamp name ${name} instead of reading the picture bits`).not.toMatch(
        new RegExp(`['"\`]${name}['"\`]`),
      )
    }
  })

  // THE LOOPHOLE THIS CLOSES: the negative scan above only covers atlas.ts, so a
  // `new Set(['THREE','SIX','NINE'])` relocated into pictures.ts would satisfy
  // every other assertion in this file while violating AC-3 exactly as written.
  // Bind the two together instead — a stamp's baked pixels must move IF AND ONLY
  // IF the flip decoder says its own declared picture code asks them to. That is
  // checkable only because each stamp carries the code that selects it.
  it('a stamp moves at bake IF AND ONLY IF flipsForPicture says its declared code asks it to', () => {
    const moved = new Set(stampsThatMoved(bakeAtlas()))
    const predicted = STAMPS.filter((s) => {
      const f = flipsForPicture(s.pic ?? 0)
      return f.flipX || f.flipY
    }).map((s) => s.name)
    expect([...moved].sort(), 'the bake and the bit decoder disagree about which stamps flip').toEqual(
      predicted.sort(),
    )
    expect(predicted.length, 'no stamp declares a flipping picture code — the mechanism is inert').toBeGreaterThan(0)
  })

  it('the three PTS stamps declare their ROM picture codes (SP-19, src/core/spider.ts:116-118)', () => {
    expect(stampNamed('THREE').pic, 'THREE is PTS 300 = 0xB6').toBe(0xb6)
    expect(stampNamed('NINE').pic, 'NINE is PTS 900 = 0xB7').toBe(0xb7)
    expect(stampNamed('SIX').pic, 'SIX is PTS 600 = 0xB8').toBe(0xb8)
  })

  it('the rotation is still the bake’s (AC-2 — the flip is layered on, not substituted)', () => {
    expect(stripComments(atlasSrc), 'orientForScreen must still run in the bake').toMatch(/orientForScreen/)
  })
})

describe('cp7-1 AC-4 — the core keeps decoding RAW ROM space, and the comment stops calling bit 7 an address', () => {
  it('decodeStamp is untouched: it still returns the raw ROM-byte grid, unflipped', () => {
    // The tempting wrong fix is to flip inside decodeStamp. That would put a SHELL
    // orientation concern into src/core and break the cp1-3/cp2-1 boundary that
    // every other stamp test rests on. Derived here straight from the planes.
    const s = stampNamed('THREE')
    const expected: number[][] = []
    for (let r = 0; r < 16; r++) {
      const lo = PLANE_LOWER[s.offset + r]
      const up = PLANE_UPPER[s.offset + r]
      const row: number[] = []
      for (let x = 0; x < 8; x++) {
        const mask = 0x80 >> x
        row.push(((up & mask ? 1 : 0) << 1) | (lo & mask ? 1 : 0))
      }
      expected.push(row)
    }
    expect(decodeStamp(s)).toEqual(expected)
  })

  it('pictures.ts cites CENDE4.MAC:239 and :248 where the flip bits are named', () => {
    expect(picturesSrc, 'CKC0 must be cited at CENDE4.MAC:239').toMatch(/CENDE4\.MAC:239/)
    expect(picturesSrc, 'CK40 must be cited at CENDE4.MAC:248').toMatch(/CENDE4\.MAC:248/)
  })

  it('the offset-formula comment no longer presents bit 7 as address', () => {
    // The shipped comment states the decode as
    //   offset = ((pic & 1) << 10) | (((pic >> 1) & 0x3F) << 4)
    // whose 0x3F consumes bits 1-6, i.e. it spends bit 6 as address and drops bit
    // 7 silently. AC-4: the comment may change (the DATA may not) and must now say
    // bit 7 is flip. Asserted as a PAIR so neither half passes on the other's text.
    expect(picturesSrc, 'the comment must name bit 7 as the flip, not as address').toMatch(/bit 7[^.]*flip/i)
    expect(picturesSrc, 'the comment must name bit 6 as the other flip axis').toMatch(/bit 6[^.]*flip/i)
  })
})
