// tests/points-sprite-flip.test.ts
//
// Story cp7-1 — RED phase (O'Brien / TEA). PLAYTEST DEFECT: "the spider score
// readout is backwards". It is not text — the 300/600/900 that appears where a
// shot spider died is a single 8x16 motion-object SPRITE whose whole bitmap is
// the three digits. The SPRITE is horizontally mirrored on screen.
//
// ROOT CAUSE: the motion-object picture byte's hardware FLIP BITS are dropped at
// atlas bake time. CENDE4.MAC:239 (CKC0, "VALUE THAT FLIPS AND TURNS PICTURES")
// and :248 (CK40, "USED FOR FLIPPING PICTURES UPSIDE DOWN") name them. The three
// PTS codes all carry bit 7: THREE 0xB6, NINE 0xB7, SIX 0xB8 (src/core/spider.ts
// :116-118, SP-19). pictures.ts states the decode as
//     offset = ((pic & 1) << 10) | (((pic >> 1) & 0x3F) << 4)
// which eats bits 1-6 as ADDRESS and discards bit 7. Bit 7 is not address.
//
// This file is the BEHAVIOURAL half (AC-1): it runs the REAL buildAtlas() through
// tests/helpers/bake-atlas.ts and decodes the pixels it actually painted. The
// MECHANISM half (AC-3 — the flip is derived from the picture byte's bits, not
// from a list of three stamp names) is tests/picture-flip-bits.test.ts. Split so
// each file reddens for its OWN reason: this one is red because the painted pixels
// are mirrored, NOT because an export is missing.
//
// ─── THE GOLDEN, DERIVED BY HAND FROM THE ROM BYTES ──────────────────────────
// NEVER read back from the implementation. Derivation, THREE @0x1B0 (CENPIC.MAC:47):
//
// decodeStamp emits 16 rows x 8 cols in ROM-byte order (r0 = first byte, col 0 =
// MSB). The shipped bytes — the upper plane is 0x00 throughout, so every lit pixel
// is colour index 1:
//     r3  0xF8  #####...      r7  0xF8  #####...      r11 0xF8  #####...
//     r4  0x88  #...#...      r8  0x88  #...#...      r12 0xA8  #.#.#...
//     r5  0xF8  #####...      r9  0xF8  #####...      r13 0xA8  #.#.#...
//     (r0-2, r6, r10, r14-15 are 0x00)
//
// orientForScreen is ROT270: out[i][j] = grid[j][C-1-i], so output ROW i is ROM
// COLUMN (7-i) read across ROM rows 0..15. ROM columns 5,6,7 are empty in every
// row, so output rows 0,1,2 are blank. Output row 3 is ROM column 4, set on rows
// 3,4,5,7,8,9,11,12,13 -> "...###.###.###..". That is the bake TODAY, and its
// three glyphs read 0, 0, and a MIRRORED 3 — "300" seen in a mirror.
//
// Bit 7 asks for a horizontal mirror ON SCREEN, i.e. a reversal of each output
// row. Reversing "...###.###.###.." gives "..###.###.###..." and so on down the
// eight rows, producing the goldens below. Read them: they say 300, 600, 900.
//
// (Bit 6 is the OTHER axis — reversing ROM columns instead moves the blank band
// from the top of the screen grid to the bottom, i.e. the vertical flip CK40 calls
// "upside down". Both bits set is CKC0's 180-degree cocktail turn. The two ROM
// names landing on the two axes is the cross-check that this is not arbitrary.)
//
// RED: buildAtlas() has no notion of a per-picture flip, so all three bake
// mirrored and every golden below fails.

import { describe, it, expect } from 'vitest'
import { STAMPS } from '../src/core/pictures'
import { bakeAtlas, bakedRows, unflippedRows, stampsThatMoved } from './helpers/bake-atlas'

// ── the hand-derived goldens (8 rows x 16 cols, screen orientation) ──────────
// A human can read "300", "600", "900" here; that legibility IS the point.
const THREE_SCREEN = [
  '................',
  '................',
  '................',
  '..###.###.###...',
  '....#.#.#.#.#...',
  '..###.#.#.#.#...',
  '....#.#.#.#.#...',
  '..###.###.###...',
]

const SIX_SCREEN = [
  '................',
  '................',
  '................',
  '..###.###.###...',
  '..#...#.#.#.#...',
  '..###.#.#.#.#...',
  '..#.#.#.#.#.#...',
  '..###.###.###...',
]

const NINE_SCREEN = [
  '................',
  '................',
  '................',
  '..###.###.###...',
  '..#.#.#.#.#.#...',
  '..###.#.#.#.#...',
  '....#.#.#.#.#...',
  '..###.###.###...',
]

const GOLDENS = [
  ['THREE', THREE_SCREEN],
  ['SIX', SIX_SCREEN],
  ['NINE', NINE_SCREEN],
] as const

describe('cp7-1 AC-1 — the spider PTS sprites bake correctly-handed (real buildAtlas, painted pixels)', () => {
  it('the harness actually paints an atlas (liveness — a blank stub passes every golden by accident)', () => {
    const painted = bakeAtlas()
    expect(painted.count(), 'buildAtlas painted nothing — the stub is not driving the real bake').toBeGreaterThan(500)
  })

  for (const [name, golden] of GOLDENS) {
    it(`${name} bakes correctly-handed, not mirrored`, () => {
      expect(bakedRows(bakeAtlas(), name).join('\n')).toBe(golden.join('\n'))
    })
  }

  // Discriminability (the tp2-1 rule): the goldens above are evidence only if the
  // flipped and unflipped bakes actually DIFFER for these three stamps. A stamp
  // symmetric under the mirror would make every assertion above vacuous.
  it('all three goldens are discriminable — each differs from its own unflipped bake', () => {
    for (const [name, golden] of GOLDENS) {
      expect(
        unflippedRows(name).join('\n'),
        `${name} is symmetric under the mirror — its golden proves nothing`,
      ).not.toBe(golden.join('\n'))
    }
  })
})

describe('cp7-1 AC-1/AC-2 — the flip reaches EXACTLY the stamps whose picture byte asks for it', () => {
  // The census. A fix that flips everything, or flips the wrong stamp, is caught
  // here rather than by eye.
  it('exactly THREE, SIX and NINE differ from the unflipped bake', () => {
    expect(stampsThatMoved(bakeAtlas())).toEqual(['NINE', 'SIX', 'THREE'])
  })

  // The segments are the trap. CENT_BODY_PIC = 0x42 carries bit 6 and DEAD_BIT is
  // 0x80 (src/core/centipede.ts:63-71), which CENDE4.MAC:129-137 states outright
  // ("D6=0 FOR HEAD", "D7=1 FOR NO OBJECT"). A fix that hands raw segment picture
  // bytes to the flip decoder turns every body segment upside down. The ROM
  // exempts them by CONTROL FLOW, not by clear bits: CENIR4.MAC:347-351 branches
  // on the slot index (CPX I,NCENT / BCS 33$) and only then masks with AND I,3F /
  // AND I,0F. render.ts's segmentStamp(pic & 0x0F) already mirrors that mask.
  it('no HEAD stamp is baked flipped (the segment pool is shared and must stay unturned)', () => {
    const painted = bakeAtlas()
    for (const s of STAMPS.filter((x) => x.name.startsWith('HEAD'))) {
      expect(bakedRows(painted, s.name).join('\n'), `${s.name} was flipped at bake`).toBe(unflippedRows(s.name).join('\n'))
    }
  })

  // The five existing rotation pins (tests/atlas-orientation.test.ts) guard
  // orientForScreen itself. This guards that the BAKE still routes an ordinary
  // stamp through it — the flip is layered ON TOP, never substituted for it (AC-2).
  it('GUN still bakes as the plain ROT270 of its decode (the rotation is not replaced)', () => {
    expect(bakedRows(bakeAtlas(), 'GUN').join('\n')).toBe(unflippedRows('GUN').join('\n'))
  })

  // cp2-13 parameterised the bake by wave (palette only). The flip is geometry and
  // must not depend on it — a per-wave flip would be a spectacular regression.
  it('the flip is wave-independent (geometry, not palette)', () => {
    for (const wave of [1, 2, 5]) {
      expect(bakedRows(bakeAtlas(wave), 'THREE').join('\n'), `wave ${wave} baked THREE differently`).toBe(
        THREE_SCREEN.join('\n'),
      )
    }
  })
})
