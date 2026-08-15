// tests/sprite-tile-fidelity.test.ts
//
// Story ml7-10 — VERIFY the DDT-bomb, ROCK, and POISON-mushroom sprite tiles.
//
// ml7-6 fixed charTile's bit-6 bank select and pinned the CONTENT half — "the
// destination tile is a real non-blank graphic, not the red fragment the bug
// drew" — for the NORMAL mushroom band ONLY ($7C-$7F → $FC-$FF, see
// charset-bank.test.ts). It left the OTHER bit-6-set field stamps content-
// unchecked, because the attract field has no rocks / poison / live DDT to
// eyeball: the DDT bomb ($6E/$6F → $EE/$EF), the ROCK ($70 → $F0) and the
// POISON mushroom band ($78-$7B → $F8-$FB) were mapped mechanically through the
// same bank flip but never verified to land on the RIGHT graphics.
//
// CORRECTED 2026-08-15 (millipede-render-mapping-correct-mame): bit-6 SET maps
// into the HIGH graphics bank $C0-$FF (0x40 base + bank*0x80), NOT $00-$3F —
// which are the motion-object sprite tiles. The tile values below track the
// corrected charTile.
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
import { ink, tilesEqual } from './helpers/tile-pixels'

// The stamps this story verifies, paired with the graphics-bank tile the bank
// flip routes them to. Kept as (name, char code, expected tile) so a drift in
// EITHER the source constant OR charTile reddens with a legible message. The
// `hex` fields are pre-formatted strings so it.each titles print true hex —
// vitest interpolates `$code` as its raw DECIMAL value, which reads as a wrong
// "0x…" if concatenated after a literal 0x.
const VERIFIED: readonly { name: string; code: number; tile: number; codeHex: string; tileHex: string }[] = [
  { name: 'DDT bomb, stamp 0', code: 0x6e, tile: 0xee, codeHex: '$6e', tileHex: '$ee' },
  { name: 'DDT bomb, stamp 1', code: 0x6f, tile: 0xef, codeHex: '$6f', tileHex: '$ef' },
  { name: 'ROCK (indestructible)', code: 0x70, tile: 0xf0, codeHex: '$70', tileHex: '$f0' },
  { name: 'POISON mushroom, stage 0', code: 0x78, tile: 0xf8, codeHex: '$78', tileHex: '$f8' },
  { name: 'POISON mushroom, stage 1', code: 0x79, tile: 0xf9, codeHex: '$79', tileHex: '$f9' },
  { name: 'POISON mushroom, stage 2', code: 0x7a, tile: 0xfa, codeHex: '$7a', tileHex: '$fa' },
  { name: 'POISON mushroom, stage 3', code: 0x7b, tile: 0xfb, codeHex: '$7b', tileHex: '$fb' },
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
    // Both facts pinned against PRODUCTION constants, not the test fixture.
    // DDT=$6E is "first of 2" and ROCK=$70 follows, so the bomb occupies $6E,$6F.
    expect(ROCK_STAMP - DDT_STAMP).toBe(2)
    // POISON=$78 runs to NORMAL=$7C exclusive → four stages $78-$7B.
    expect(NORMAL - POISON).toBe(4)
  })
})

describe('ml7-10 — charTile routes each field stamp into the exact graphics-bank tile', () => {
  it.each(VERIFIED)('$name: charTile($codeHex) → tile $tileHex', ({ code, tile }) => {
    // The whole point of ml7-6's bit-6 fix: a bit-6-SET field stamp lands in the
    // HIGH graphics bank ($C0-$FF), not at its own value (the char bank). Both
    // assertions call the real charTile — proven able to redden by mutation
    // (reverting charTile to the ml7-3 identity turns this describe block red).
    expect(code & 0x40, `0x${code.toString(16)} must be bit-6 set`).toBe(0x40)
    expect(charTile(code)).toBe(tile)
    expect(charTile(code), `0x${code.toString(16)} must map into the $C0-$FF bank`).toBeGreaterThanOrEqual(0xc0)
  })
})

describe('ml7-10 — each mapped tile is a real non-blank graphic (the ml7-6 content check, extended)', () => {
  it.each(VERIFIED)('$name → tile $tileHex is non-blank', ({ tile }) => {
    // The ml7-6 bug rendered an 11-pixel red FRAGMENT at the char-bank tile.
    // A blank or near-blank destination is the same class of failure; guard it.
    expect(ink(tile), `tile 0x${tile.toString(16)} is blank — the graphic did not decode here`).toBeGreaterThan(0)
  })

  it.each(VERIFIED)('$name: the bank flip is MATERIAL — charTile lands on different pixels than the char-bank tile', ({ code }) => {
    // Route through the REAL charTile so this guards its behaviour, not a static
    // fact about two fixed tiles. If charTile regressed to the ml7-3 identity,
    // charTile(code) === code, dest === source, and this reddens (mutation-
    // verified: the identity mutant turns this test red).
    const dest = charTile(code)
    expect(tilesEqual(dest, code), `charTile(0x${code.toString(16)})=0x${dest.toString(16)} draws the same pixels as char-bank tile 0x${code.toString(16)} — bank flip is a no-op`).toBe(false)
  })
})

describe('ml7-10 — the graphic families are mutually distinct (a bomb ≠ a rock ≠ a poison ≠ a mushroom)', () => {
  // One representative tile per family. If any two decode to identical pixels,
  // the mapping has collapsed two distinct sprites onto one tile.
  const REP: readonly [string, number][] = [
    ['DDT bomb', 0xee],
    ['DDT bomb 2', 0xef],
    ['ROCK', 0xf0],
    ['POISON', 0xf8],
    ['NORMAL mushroom', 0xfc],
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

  it('the whole POISON band ($F8-$FB) is disjoint from the NORMAL band ($FC-$FF)', () => {
    // Poison and normal mushrooms are drawn from different pictures; no poison
    // stage may decode to the same pixels as any normal stage.
    for (let p = 0xf8; p <= 0xfb; p++) {
      for (let n = 0xfc; n <= 0xff; n++) {
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
  // NOTE: byte-level enforcement here is LOCAL-to-a-vendored-checkout only. The
  // EPROMs are gitignored, so on a fresh CI clone this test SKIPS (never reds) —
  // do not read a green CI run as proof these tiles are ROM-faithful. The
  // CI-live teeth are the committed-STAMPS assertions above (routing, non-blank,
  // materiality, distinctness).
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
