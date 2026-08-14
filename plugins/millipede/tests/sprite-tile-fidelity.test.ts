// tests/sprite-tile-fidelity.test.ts
//
// Story ml7-10 — VERIFY the DDT-bomb, ROCK, and POISON-mushroom sprite tiles.
//
// ml7-6 fixed charTile's bit-6 bank select and pinned the CONTENT half — "the
// destination tile is a real non-blank graphic, not the red fragment the bug
// drew" — for the NORMAL mushroom band ONLY ($7C-$7F → $3C-$3F, see
// charset-bank.test.ts). It left the OTHER bit-6-set field stamps content-
// unchecked, because the attract field has no rocks / poison / live DDT to
// eyeball: the DDT bomb ($6E/$6F → $2E/$2F), the ROCK ($70 → $30) and the
// POISON mushroom band ($78-$7B → $38-$3B) were mapped mechanically through the
// same bank flip but never verified to land on the RIGHT graphics.
//
// This file closes that gap. Every assertion is a determinable regression guard
// — it does NOT prove "$2E looks like a bomb to a human" (that is inherently the
// visual playtest, ml7-10 AC5, owner: user). It proves the automatable half:
//
//   • the source char codes equal the ROM ground truth (MLDEF.MAC:202-208),
//   • charTile routes each into the exact graphics-bank tile the story names,
//   • that tile is a NON-BLANK real graphic (the ml7-6 blank/fragment failure
//     mode, now guarded for these stamps too),
//   • the bank flip is MATERIAL (the dest tile's pixels differ from the char-
//     bank tile the ml7-3 identity rule wrongly left them at), and
//   • the three graphic families are mutually distinct — a bomb is not a rock
//     is not a poison mushroom is not a normal mushroom.
//
// FINDING (ml7-10, TEA): every check below PASSES on arrival. The mapping was
// already correct by every determinable measure — the char codes match MLDEF,
// the baked sheet is byte-faithful to the picture EPROMs (stamp-data.test.ts
// AC-3b), and ml7-6's bank law is proven. So this is a GREEN regression guard,
// not a red→green fix. The one residual — does char $6E render as a bomb on
// screen — is the human visual playtest routed post-merge.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { charTile } from '../src/shell/render'
import { STAMPS } from '../src/shell/stamp-data'
import { decodeStamp } from '../src/shell/gfx-rom'
import { DDT_STAMP, CLOUD_STAMP, ROCK_STAMP } from '../src/core/ddt'
import { DDT as DDT_PICTURE, POISON, NORMAL } from '../src/core/conway'
import { ROCK, FULL_MUSHROOM } from '../src/core/mushroom'

/** Non-background (value != 0) pixel count of a decoded 8x8 tile. */
function ink(tile: number): number {
  return STAMPS[tile].flat().filter((v) => v !== 0).length
}

/** Deep pixel equality of two decoded tiles (readonly-safe). */
function tilesEqual(a: number, b: number): boolean {
  const A = STAMPS[a]
  const B = STAMPS[b]
  return A.length === B.length && A.every((row, r) => row.length === B[r].length && row.every((v, x) => v === B[r][x]))
}

// The stamps this story verifies, paired with the graphics-bank tile the bank
// flip routes them to. Kept as (name, char code, expected tile) so a drift in
// EITHER the source constant OR charTile reddens with a legible message. The
// `hex` fields are pre-formatted strings so it.each titles print true hex —
// vitest interpolates `$code` as its raw DECIMAL value, which reads as a wrong
// "0x…" if concatenated after a literal 0x.
const VERIFIED: readonly { name: string; code: number; tile: number; codeHex: string; tileHex: string }[] = [
  { name: 'DDT bomb, stamp 0', code: 0x6e, tile: 0x2e, codeHex: '$6e', tileHex: '$2e' },
  { name: 'DDT bomb, stamp 1', code: 0x6f, tile: 0x2f, codeHex: '$6f', tileHex: '$2f' },
  { name: 'ROCK (indestructible)', code: 0x70, tile: 0x30, codeHex: '$70', tileHex: '$30' },
  { name: 'POISON mushroom, stage 0', code: 0x78, tile: 0x38, codeHex: '$78', tileHex: '$38' },
  { name: 'POISON mushroom, stage 1', code: 0x79, tile: 0x39, codeHex: '$79', tileHex: '$39' },
  { name: 'POISON mushroom, stage 2', code: 0x7a, tile: 0x3a, codeHex: '$7a', tileHex: '$3a' },
  { name: 'POISON mushroom, stage 3', code: 0x7b, tile: 0x3b, codeHex: '$7b', tileHex: '$3b' },
]

describe('ml7-10 — source char codes match the ROM ground truth (MLDEF.MAC:202-208)', () => {
  it('DDT / CLOUD / ROCK / POISON / NORMAL equal their MLDEF picture-code values', () => {
    // MLDEF.MAC:202-208 —
    //   CLOUD =2E ;START OF DDT EXPLOSION CLOUDS
    //   DDT   =6E ;FIRST OF 2 STAMPS FOR DDT BOMB
    //   ROCK  =70 ;INDESTRUCTIBLE FEATURE
    //   POISON=78 ;POISONED MUSHROOM PICTURES
    //   NORMAL=7C ;MUSHROOM PICTURES
    expect(DDT_STAMP).toBe(0x6e)
    expect(CLOUD_STAMP).toBe(0x2e)
    expect(ROCK_STAMP).toBe(0x70)
    expect(ROCK).toBe(0x70) // mushroom.ts and ddt.ts must agree on the ROCK code
    expect(ROCK_STAMP).toBe(ROCK)
    expect(DDT_PICTURE).toBe(0x6e) // conway.ts picture-band start agrees with ddt.ts
    expect(POISON).toBe(0x78)
    expect(NORMAL).toBe(0x7c)
    expect(FULL_MUSHROOM).toBe(0x7f)
  })

  it('the DDT bomb is 2 stamps and POISON is a 4-picture band (MLDEF spans)', () => {
    // DDT=$6E is "first of 2"; POISON=$78 runs to NORMAL=$7C exclusive = $78-$7B.
    expect(VERIFIED.filter((v) => v.name.startsWith('DDT'))).toHaveLength(2)
    expect(NORMAL - POISON).toBe(4) // $7C - $78 → four poison stages $78-$7B
  })
})

describe('ml7-10 — charTile routes each field stamp into the exact graphics-bank tile', () => {
  it.each(VERIFIED)('$name: charTile($codeHex) → tile $tileHex', ({ code, tile }) => {
    // The whole point of ml7-6's bit-6 fix: a bit-6-SET field stamp lands BELOW
    // $40 (the graphics bank), not at its own value (the char bank).
    expect(code & 0x40, `0x${code.toString(16)} must be bit-6 set`).toBe(0x40)
    expect(charTile(code)).toBe(tile)
    expect(tile).toBe(code ^ 0x40) // the bank-flip law, restated as an independent check
    expect(tile).toBeLessThan(0x40) // graphics bank
  })
})

describe('ml7-10 — each mapped tile is a real non-blank graphic (the ml7-6 content check, extended)', () => {
  it.each(VERIFIED)('$name → tile $tileHex is non-blank', ({ tile }) => {
    // The ml7-6 bug rendered an 11-pixel red FRAGMENT at the char-bank tile.
    // A blank or near-blank destination is the same class of failure; guard it.
    expect(ink(tile), `tile 0x${tile.toString(16)} is blank — the graphic did not decode here`).toBeGreaterThan(0)
  })

  it.each(VERIFIED)('$name: the bank flip is MATERIAL — dest pixels differ from the char-bank tile', ({ code, tile }) => {
    // If charTile silently regressed to the ml7-3 identity, dest === source and
    // this fails. A pure mutation guard: it can only pass when the flip changes
    // the pixels the game draws.
    expect(tilesEqual(tile, code), `tile 0x${tile.toString(16)} equals char-bank tile 0x${code.toString(16)} — bank flip is a no-op`).toBe(false)
  })
})

describe('ml7-10 — the graphic families are mutually distinct (a bomb ≠ a rock ≠ a poison ≠ a mushroom)', () => {
  // One representative tile per family. If any two decode to identical pixels,
  // the mapping has collapsed two distinct sprites onto one tile.
  const REP: readonly [string, number][] = [
    ['DDT bomb', 0x2e],
    ['DDT bomb 2', 0x2f],
    ['ROCK', 0x30],
    ['POISON', 0x38],
    ['NORMAL mushroom', 0x3c],
  ]
  for (let i = 0; i < REP.length; i++) {
    for (let j = i + 1; j < REP.length; j++) {
      const [an, at] = REP[i]
      const [bn, bt] = REP[j]
      it(`${an} (0x${at.toString(16)}) is not the same graphic as ${bn} (0x${bt.toString(16)})`, () => {
        expect(tilesEqual(at, bt)).toBe(false)
      })
    }
  }

  it('the whole POISON band ($38-$3B) is disjoint from the NORMAL band ($3C-$3F)', () => {
    // Poison and normal mushrooms are drawn from different pictures; no poison
    // stage may decode to the same pixels as any normal stage.
    for (let p = 0x38; p <= 0x3b; p++) {
      for (let n = 0x3c; n <= 0x3f; n++) {
        expect(tilesEqual(p, n), `poison tile 0x${p.toString(16)} equals normal tile 0x${n.toString(16)}`).toBe(false)
      }
    }
  })
})

// ─── The ROM-anchored tooth (AC4), scoped to this story's tiles ───────────────
// stamp-data.test.ts AC-3b already byte-matches ALL 256 stamps against the
// EPROMs, but that tooth is dormant on a licence-walled CI clone. This narrower
// check decodes the raw picture EPROMs at exactly the DDT/rock/poison tile
// offsets and asserts the committed sheet agrees — documenting WHICH tiles
// ml7-10 verified, live wherever the ROMs are vendored. The EPROMs are
// gitignored, so it skips (never fails) where they are absent; the CI-live
// teeth are the committed-STAMPS assertions above.
const vendoredRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'reference', 'original-source', 'millipede')
const LOW_ROM = join(vendoredRoot, '136013-107.r5') // gfx1 @0x0000 → low plane
const HIGH_ROM = join(vendoredRoot, '136013-106.p5') // gfx1 @0x0800 → high plane
const romsPresent = existsSync(LOW_ROM) && existsSync(HIGH_ROM)

describe('ml7-10 AC4 — the mapped tiles byte-match a fresh decode of the picture EPROMs', () => {
  it.skipIf(!romsPresent)('DDT/rock/poison tiles equal decodeStamp over concat(107.r5, 106.p5)', () => {
    const low = new Uint8Array(readFileSync(LOW_ROM))
    const high = new Uint8Array(readFileSync(HIGH_ROM))
    const region = new Uint8Array(low.length + high.length)
    region.set(low, 0)
    region.set(high, low.length)
    for (const { name, tile } of VERIFIED) {
      const fresh = decodeStamp(region, tile * 8)
      expect(STAMPS[tile].map((r) => [...r]), `${name}: committed tile 0x${tile.toString(16)} != EPROM decode`).toEqual(fresh)
      expect(fresh.flat().some((v) => v !== 0), `${name}: EPROM tile 0x${tile.toString(16)} is blank`).toBe(true)
    }
  })
})
