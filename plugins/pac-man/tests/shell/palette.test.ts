// tests/shell/palette.test.ts
//
// Story pm3-3 — pins the resistor-DAC decode of the 16 hardware colours.
// Two anchors that follow from the normalized-weights property (all-bits-off
// -> 0, all-bits-on -> 255 on every channel), plus a baked/fresh-decode
// byte-equality check against the vendored PROM (pm3-1's citation-gated
// reference/graphics/82s123.7f).

import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { decodePaletteFromProm } from '../../src/shell/gfx-rom'
import { HARDWARE_PALETTE } from '../../src/shell/palette-data'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const prom = readFileSync(join(root, 'reference', 'graphics', '82s123.7f'))

describe('palette bake (pm3-3)', () => {
  it('byte 0x00 decodes to black and 0xff to white (weight endpoints)', () => {
    const p0 = decodePaletteFromProm(Uint8Array.of(0x00, 0xff))
    expect(p0[0]).toEqual([0, 0, 0])
    expect(p0[1]).toEqual([255, 255, 255])
  })

  it('the baked palette equals a fresh decode of the vendored PROM', () => {
    expect(HARDWARE_PALETTE).toEqual(decodePaletteFromProm(prom).slice(0, 16))
  })
})
