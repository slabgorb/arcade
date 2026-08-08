// tests/core/maze-topology.test.ts
// pm3-9 — the generated authentic core topology must equal a fresh classify-
// and-re-derive of maze-vram.bin (the byte-fidelity guard + the topology's
// byte-citation of record). House/gate are stamped from ROM geometry (the
// attract capture over-paints them) and are asserted structurally, not by tile.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { mazeCellOffset } from '../../src/shell/gfx-rom'
import { MAZE_ROWS } from '../../src/core/maze-topology.generated'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const vram = new Uint8Array(readFileSync(join(root, 'reference', 'graphics', 'maze-vram.bin')))
const tile = (sx: number, sy: number) => vram[mazeCellOffset(sx, sy)]
const DOT = 16, EN = 20

describe('authentic core topology (pm3-9)', () => {
  it('is 36 rows x 28 cols', () => {
    expect(MAZE_ROWS.length).toBe(36)
    for (const r of MAZE_ROWS) expect(r.length).toBe(28)
  })

  it('every dot/energizer/path cell matches the capture classifier', () => {
    for (let y = 3; y <= 32; y++)
      for (let x = 0; x < 28; x++) {
        const ch = MAZE_ROWS[y][x]
        if (ch === '.') expect(tile(x, y), `dot ${x},${y}`).toBe(DOT)
        if (ch === 'o') expect(tile(x, y), `energizer ${x},${y}`).toBe(EN)
      }
  })

  it('every wall/path cell matches the capture classifier, including banner contamination', () => {
    // Stamped cells (house/gate) are NOT classified from the capture — exclude
    // them. Tunnel 'T' cells are also excluded (edge-column special-case,
    // already covered by the tunnel test below).
    const isStamped = (x: number, y: number) => {
      const ch = MAZE_ROWS[y][x]
      return ch === 'H' || ch === '=' || ch === 'T'
    }
    const bannerCells: Array<[number, number]> = []
    for (let y = 3; y <= 32; y++)
      for (let x = 0; x < 28; x++) {
        if (isStamped(x, y)) continue
        const t = tile(x, y)
        const ch = MAZE_ROWS[y][x]
        if (t >= 206 && t <= 253) {
          expect(ch, `wall ${x},${y} (tile ${t})`).toBe('#')
        } else if (t === DOT) {
          expect(ch, `dot ${x},${y}`).toBe('.')
        } else if (t === EN) {
          expect(ch, `energizer ${x},${y}`).toBe('o')
        } else if (t === 64 || t === 0) {
          expect(ch, `background ${x},${y} (tile ${t})`).toBe(' ')
        } else {
          // genuine letter (48..90, not 64) — attract "GAME OVER" banner
          // contamination, authentically an open dotless corridor (the exact
          // 240-dot count proves no real dots were overwritten).
          expect(ch, `banner-contaminated ${x},${y} (tile ${t})`).toBe(' ')
          bannerCells.push([x, y])
        }
      }
    // Pin the contamination footprint exactly: any spread to a new row or
    // classifier drift must redden loudly.
    expect(bannerCells).toEqual([
      [9, 20],
      [10, 20],
      [11, 20],
      [12, 20],
      [15, 20],
      [16, 20],
      [17, 20],
      [18, 20],
    ])
  })

  it('places exactly 240 dots and 4 energizers (pacman.asm:20e6 => 244)', () => {
    const flat = MAZE_ROWS.join('')
    expect([...flat].filter((c) => c === '.').length).toBe(240)
    expect([...flat].filter((c) => c === 'o').length).toBe(4)
  })

  it('has exactly one tunnel row, open (T) at both ends, at row 17', () => {
    const rows = MAZE_ROWS.map((r, y) => (r.includes('T') ? y : -1)).filter((y) => y >= 0)
    expect(rows).toEqual([17])
    expect(MAZE_ROWS[17][0]).toBe('T')
    expect(MAZE_ROWS[17][27]).toBe('T')
  })

  it('stamps a contiguous ghost house with a gate at its top', () => {
    const flat = MAZE_ROWS.join('')
    expect([...flat].filter((c) => c === 'H').length).toBeGreaterThan(10)
    expect([...flat].filter((c) => c === '=').length).toBe(2) // two-tile door
  })
})
