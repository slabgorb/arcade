// tests/charset-bank.test.ts
//
// Story ml7-6 — the charTile BANK-SELECT fix, pinned so the mushroom decode
// cannot silently regress to red triangles again. render.ts:charTile maps a
// playfield CHAR CODE to a sheet tile; BIT 6 selects the bank — bit-6 CLEAR is
// the ALPHANUMERICS bank ($40-$7F: letters, digits, ship), bit-6 SET is the
// playfield-GRAPHICS bank ($00-$3F: mushrooms, DDT, rocks, bonus numbers).
//
// WHY THIS FILE EXISTS: ml7-3 derived charTile only from bit-6-CLEAR codes (HUD
// digits + ship) and shipped `0x40 | (code & 0x3F)`, which leaves the field's
// mushroom codes ($7C-$7F) pointing at char-bank tiles ($7C-$7F, red fragments)
// instead of the mushroom graphics ($3C-$3F). The ml2-4 census drew the raw
// TILES so the mushroom at $3F looked right there, and every charTile test used
// bit-6-CLEAR codes — so nothing caught it until the ml7-6 visual playtest.
// The mapping is tied to the ROM stamp CONSTANTS below (not test-local
// literals), and the mushroom tile is asserted NON-BLANK and DIFFERENT from the
// red fragment the bug rendered — a real mutation guard, not an identity.

import { describe, it, expect } from 'vitest'
import { charTile } from '../src/shell/render'
import { STAMPS } from '../src/shell/stamp-data'
import { FULL_MUSHROOM, ROCK } from '../src/core/mushroom'
import { POISON, NORMAL } from '../src/core/conway'
import { DDT_STAMP } from '../src/core/ddt'
import { ink } from './helpers/tile-pixels'

describe('ml7-6 — charTile bit-6 bank select (the mushroom decode fix)', () => {
  it('the ALPHANUMERICS half (bit 6 clear) is unchanged from ml7-3', () => {
    // Regression guard: every HUD code is bit-6 clear and must map exactly as
    // ml7-3 pinned it (the hud-render suite depends on these).
    expect(charTile(0x00)).toBe(0x40) // blank
    expect(charTile(0x01)).toBe(0x41) // 'A'
    expect(charTile(0x1f)).toBe(0x5f) // the ship (core/hud.ts SHIP_STAMP)
    expect(charTile(0x20)).toBe(0x60) // DIGITZ '0'
    expect(charTile(0x29)).toBe(0x69) // DIGITZ '9'
    // Under the OLD rule these were identical to the new rule (bit 6 already 0),
    // so the fix touches nothing here.
    for (let code = 0; code < 0x40; code++) expect(charTile(code)).toBe(0x40 | (code & 0x3f))
  })

  it('the field GRAPHICS half (bit 6 set) maps into the $00-$3F bank', () => {
    // Every playfield-graphic stamp is bit-6 SET and must land BELOW $40 — the
    // graphics bank — not stay in the char bank as the ml7-3 rule left it.
    for (const code of [DDT_STAMP, DDT_STAMP + 1, ROCK, POISON, NORMAL, FULL_MUSHROOM]) {
      expect(code & 0x40, `stamp 0x${code.toString(16)} must be bit-6 set`).toBe(0x40)
      expect(charTile(code), `0x${code.toString(16)} must map into the graphics bank`).toBeLessThan(0x40)
      expect(charTile(code)).toBe(code & 0x3f) // == code ^ 0x40 for this range
    }
  })

  it('the four NORMAL mushroom stages ($7C-$7F) decode to the mushroom tiles ($3C-$3F), all non-blank', () => {
    // The bug: FULL_MUSHROOM ($7F) rendered tile $7F, an 11-pixel red fragment.
    // The fix: it renders tile $3F, a real mushroom. Pin the whole damage band.
    for (let stamp = NORMAL; stamp <= FULL_MUSHROOM; stamp++) {
      const tile = charTile(stamp)
      expect(tile).toBe(stamp & 0x3f) // $7C->$3C .. $7F->$3F
      expect(ink(tile), `mushroom stamp 0x${stamp.toString(16)} -> blank tile 0x${tile.toString(16)}`).toBeGreaterThan(0)
    }
    // Mutation guard: the fixed mapping is NOT the identity the bug used, and it
    // is NOT the specific red fragment tile $7F ml7-6 caught on screen.
    expect(charTile(FULL_MUSHROOM)).not.toBe(FULL_MUSHROOM)
    expect(charTile(FULL_MUSHROOM)).toBe(0x3f)
    // The mushroom tile is materially different from the fragment the bug drew
    // (they must not decode to the same pixels).
    expect(STAMPS[0x3f]).not.toEqual(STAMPS[0x7f])
  })
})
