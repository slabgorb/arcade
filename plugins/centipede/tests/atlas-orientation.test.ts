// tests/atlas-orientation.test.ts
//
// Story cp2-1 — RED phase (O'Brien / TEA). USER-REPORTED DEFECT (2026-07-19):
// every stamp renders 90 degrees CLOCKWISE. Root cause (Architect-verified):
// layout.ts maps CELL POSITIONS through ROT270 (col 0 rightmost, v=0 bottom) but
// buildAtlas() bakes decodeStamp's grid in RAW ROM-byte orientation — each tile's
// own pixels are never rotated, so positions are right and pixels are sideways.
//
// FIX (SHELL policy — src/core/pictures.ts stays byte-exact, cp1-3 byte-gate
// inviolable): rotate each decoded stamp into SCREEN orientation ONCE, at the
// atlas bake. This file pins that rotation with a hand-derived golden and pins
// that it happens in exactly ONE shell location (the bake, not the renderer).
//
// ── THE ROTATION, DERIVED BY HAND (before any expectation was written) ─────────
// The current bake displays the RAW ROM-byte grid. The user sees it 90 deg CW of
// correct, so the correction is the inverse: 90 deg COUNTER-clockwise = ROT270.
// CORROBORATION (schema-only claim — no new ROM transcription): the cabinet is
// ROT270 (MAME centiped.cpp:1800, cited by cp1-6 layout.ts) and the gfx decode is
// `spritelayout {8,16, … xoffset{0..7}}` with pixel x=0 = the MSB (0x80)
// (centiped.cpp:1722-1732, already transcribed in src/core/pictures.ts). ROT270 is
// the machine orientation that rotates that MSB-first, top-down gfx-decode space
// onto the portrait display — i.e. a 90-degree counter-clockwise turn of the
// decoded grid. decodeStamp emits exactly that gfx-decode space (grid[r][c], c=0
// is the MSB, r=0 the first byte), so orienting a stamp for screen == ROT270 of
// its decoded grid.
//
// Mapping (R rows x C cols input -> C rows x R cols output):
//     out[i][j] = grid[j][C - 1 - i]
//
// ── DIGIT_7 (offset 0x338, tile) worked on paper ──────────────────────────────
// decodeStamp(DIGIT_7) in ROM-byte order (the cp1-6 decode-orientation golden):
//     .....##.      (r0 0x06)
//     .....##.      (r1 0x06)
//     ###...#.      (r2 0xE2)
//     ####..#.      (r3 0xF2)
//     ...##.#.      (r4 0x1A)
//     ....###.      (r5 0x0E)
//     .....##.      (r6 0x06)
//     ........      (r7 0x00)
// Rotating that 90 deg CCW (ROT270) — the right column becomes the top row —
// yields an UPRIGHT "7" (top bar, then a stroke descending to a lower-left riser):
//     ........
//     #######.
//     ##...##.
//     ....##..
//     ...##...
//     ..##....
//     ..##....
//     ..##....
// The WRONG direction (90 deg CW) would put the bar at the BOTTOM (an upside-down
// 7). DIGIT_7 is asymmetric both ways, so only the correct turn matches — this
// golden reddens on a mirror, a vertical flip, OR the wrong 90-degree direction.
//
// src/shell/atlas.ts does not export orientForScreen yet — RED.

import { describe, it, expect } from 'vitest'
import { decodeStamp, STAMPS, type Stamp } from '../src/core/pictures'
import { orientForScreen } from '../src/shell/atlas'
import atlasSrc from '../src/shell/atlas.ts?raw'
import renderSrc from '../src/shell/render.ts?raw'

function stamp(name: string): Stamp {
  const s = STAMPS.find((x) => x.name === name)
  if (!s) throw new Error(`no stamp named ${name}`)
  return s
}

// Strip line + block comments so a word in prose can't satisfy a source scan.
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

// Hand-typed from the derivation above — NEVER read back from the code.
const DIGIT_7_SCREEN = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2, 2, 2, 0],
  [2, 2, 0, 0, 0, 2, 2, 0],
  [0, 0, 0, 0, 2, 2, 0, 0],
  [0, 0, 0, 2, 2, 0, 0, 0],
  [0, 0, 2, 2, 0, 0, 0, 0],
  [0, 0, 2, 2, 0, 0, 0, 0],
  [0, 0, 2, 2, 0, 0, 0, 0],
]

describe('cp2-1 AC-2 — the baked atlas tile is SCREEN-oriented (ROT270)', () => {
  it('orientForScreen(decodeStamp(DIGIT_7)) matches the hand-derived screen golden', () => {
    expect(orientForScreen(decodeStamp(stamp('DIGIT_7')))).toEqual(DIGIT_7_SCREEN)
  })

  it('does NOT bake the raw ROM-byte grid (that IS the 90-degree-clockwise defect)', () => {
    const rom = decodeStamp(stamp('DIGIT_7'))
    expect(orientForScreen(rom)).not.toEqual(rom)
  })

  it('rotates COUNTER-clockwise, not clockwise (wrong direction => upside-down 7)', () => {
    const rom = decodeStamp(stamp('DIGIT_7'))
    // A 90-degree CLOCKWISE rotation of the same ROM grid, computed independently.
    const R = rom.length
    const C = rom[0].length
    const cw: number[][] = []
    for (let i = 0; i < C; i++) {
      const row: number[] = []
      for (let j = 0; j < R; j++) row.push(rom[R - 1 - j][i])
      cw.push(row)
    }
    expect(orientForScreen(rom)).not.toEqual(cw)
  })

  it('is a true 90-degree rotation — CW of the screen grid returns the ROM grid', () => {
    // Rotating the corrected (screen) grid back 90 deg CW must recover the raw
    // ROM-byte grid the machine feeds ROT270 — proves orientForScreen is exactly
    // ROT270, not some other permutation that happens to fix DIGIT_7.
    const rom = decodeStamp(stamp('DIGIT_7'))
    const screen = orientForScreen(rom)
    const R = screen.length
    const C = screen[0].length
    const backCw: number[][] = []
    for (let i = 0; i < C; i++) {
      const row: number[] = []
      for (let j = 0; j < R; j++) row.push(screen[R - 1 - j][i])
      backCw.push(row)
    }
    expect(backCw).toEqual(rom)
  })

  it('swaps dimensions for a non-square grid (a sprite is 8x16 -> 16x8 on screen)', () => {
    // A pure direction+geometry probe. CCW of a 2x3 grid is a 3x2 grid whose top
    // row is the input's right column. This locks the axis swap that forces a
    // rotated 8x16 SPRITE to occupy a 16-wide x 8-tall atlas footprint.
    const probe = [
      [1, 2, 3],
      [4, 5, 6],
    ]
    expect(orientForScreen(probe)).toEqual([
      [3, 6],
      [2, 5],
      [1, 4],
    ])
  })
})

describe('cp2-1 AC-3 — rotation lives in exactly ONE shell location (the bake)', () => {
  it('buildAtlas applies the screen rotation (source-read, comment-stripped)', () => {
    // The atlas bake is the single chosen home for the rotation (story spec:
    // "rotate each stamp into screen orientation at the atlas bake"). Scanned on
    // comment-stripped source so a mention in prose cannot satisfy it (R3).
    expect(stripComments(atlasSrc)).toMatch(/orientForScreen/)
  })

  it('the renderer does NOT also rotate (no double rotation, no canvas transform)', () => {
    const code = stripComments(renderSrc)
    expect(code, 'render must not call orientForScreen').not.toMatch(/orientForScreen/)
    expect(code, 'render must not rotate the canvas').not.toMatch(/\.rotate\s*\(/)
    expect(code, 'render must not set a transform matrix').not.toMatch(/setTransform|\.transform\s*\(/)
  })
})
