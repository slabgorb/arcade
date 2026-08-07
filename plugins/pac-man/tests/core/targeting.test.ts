// tests/core/targeting.test.ts
//
// Story pm1-6 (RED, TEA) — the four ghost personalities, written BEFORE
// src/core/targeting.ts exists. Each block asserts EXACT target tile coords
// against the Pac-Man Dossier's documented ghost-AI rules (ch.4 "Meet The
// Ghosts") and the byte-level routines at pacman.asm 2758 (Blinky) / 278e
// (Pinky chase) / 27cb (Inky chase) / 27f1+2813 (Clyde). glossary.md §Ghost AI.
//
// The Pinky/Inky "up-overflow" is the original 8-bit look-ahead bug: when
// Pac-Man faces UP, the N-tiles-ahead target lands N up AND N left (an emergent
// code behaviour, not a stored literal — reproduced, never "fixed"). Both the
// facing cases AND the up-overflow are asserted explicitly below.

import { describe, it, expect } from 'vitest'
import { targetTile, SCATTER_CORNER, type TargetingState } from '../../src/core/targeting'
import type { Tile } from '../../src/core/maze'
import type { Dir } from '../../src/core/actor'
import type { GhostId } from '../../src/core/ghost'

/** Build a TargetingState with sensible defaults; override per test. */
function state(over: {
  pacTile: Tile
  pacDir: Dir
  ghostTiles?: Partial<Record<GhostId, Tile>>
}): TargetingState {
  const zero: Tile = { x: 0, y: 0 }
  return {
    pacTile: over.pacTile,
    pacDir: over.pacDir,
    ghostTiles: {
      blinky: over.ghostTiles?.blinky ?? zero,
      pinky: over.ghostTiles?.pinky ?? zero,
      inky: over.ghostTiles?.inky ?? zero,
      clyde: over.ghostTiles?.clyde ?? zero,
    },
  }
}

describe('Blinky — target IS Pac-Man\'s current tile (pacman.asm:2758)', () => {
  it('returns Pac-Man\'s exact tile regardless of facing', () => {
    for (const dir of ['up', 'down', 'left', 'right'] as Dir[]) {
      expect(targetTile('blinky', state({ pacTile: { x: 10, y: 20 }, pacDir: dir }))).toEqual({
        x: 10,
        y: 20,
      })
    }
  })
})

describe('Pinky — 4 tiles AHEAD of Pac (pacman.asm:278e), incl. the up-overflow', () => {
  const pac: Tile = { x: 10, y: 20 }

  it('right → 4 tiles right', () => {
    expect(targetTile('pinky', state({ pacTile: pac, pacDir: 'right' }))).toEqual({ x: 14, y: 20 })
  })
  it('left → 4 tiles left', () => {
    expect(targetTile('pinky', state({ pacTile: pac, pacDir: 'left' }))).toEqual({ x: 6, y: 20 })
  })
  it('down → 4 tiles down', () => {
    expect(targetTile('pinky', state({ pacTile: pac, pacDir: 'down' }))).toEqual({ x: 10, y: 24 })
  })
  it('UP → 4 up AND 4 left (the 8-bit overflow bug, reproduced not fixed)', () => {
    expect(targetTile('pinky', state({ pacTile: pac, pacDir: 'up' }))).toEqual({ x: 6, y: 16 })
  })
})

describe('Inky — double the Blinky→(2-ahead) vector (pacman.asm:27cb)', () => {
  // intermediate = Pac + 2*dir (up-overflow applies); target = 2*intermediate - Blinky.
  it('right-facing: 2*intermediate - Blinky', () => {
    // Pac (10,20) facing right → intermediate (12,20); Blinky (8,16).
    // target = 2*(12,20) - (8,16) = (24-8, 40-16) = (16,24).
    const s = state({ pacTile: { x: 10, y: 20 }, pacDir: 'right', ghostTiles: { blinky: { x: 8, y: 16 } } })
    expect(targetTile('inky', s)).toEqual({ x: 16, y: 24 })
  })
  it('UP-facing: the 2-ahead intermediate ALSO overflows (2 up AND 2 left)', () => {
    // Pac (10,20) facing up → intermediate (8,18); Blinky (8,16).
    // target = 2*(8,18) - (8,16) = (16-8, 36-16) = (8,20).
    const s = state({ pacTile: { x: 10, y: 20 }, pacDir: 'up', ghostTiles: { blinky: { x: 8, y: 16 } } })
    expect(targetTile('inky', s)).toEqual({ x: 8, y: 20 })
  })
})

describe('Clyde — chase when >8 tiles, own scatter corner when within 8 (pacman.asm:2813/281e)', () => {
  const pac: Tile = { x: 20, y: 30 }
  it('far (dist^2 = 986 >> 64) → targets Pac-Man\'s tile', () => {
    const s = state({ pacTile: { x: 20, y: 5 }, pacDir: 'left', ghostTiles: { clyde: { x: 1, y: 30 } } })
    expect(targetTile('clyde', s)).toEqual({ x: 20, y: 5 })
  })
  it('7 tiles away (dist^2 = 49 < 64) → scatters to bottom-left corner', () => {
    const s = state({ pacTile: pac, pacDir: 'left', ghostTiles: { clyde: { x: 13, y: 30 } } })
    expect(targetTile('clyde', s)).toEqual(SCATTER_CORNER.clyde)
  })
  it('boundary: exactly 8 tiles (dist^2 = 64) → CHASES (ROM sbc/jp-c: carry only when <64)', () => {
    const s = state({ pacTile: pac, pacDir: 'left', ghostTiles: { clyde: { x: 12, y: 30 } } })
    expect(targetTile('clyde', s)).toEqual({ x: 20, y: 30 })
  })
  it('just over the boundary (dist^2 = 65) → chases', () => {
    const s = state({ pacTile: pac, pacDir: 'left', ghostTiles: { clyde: { x: 12, y: 31 } } })
    expect(targetTile('clyde', s)).toEqual({ x: 20, y: 30 })
  })
})

describe('Scatter corners — each ghost\'s fixed home target (Dossier ch.4)', () => {
  it('are the four just-outside-the-maze corners', () => {
    expect(SCATTER_CORNER.blinky).toEqual({ x: 25, y: 0 }) // top-right
    expect(SCATTER_CORNER.pinky).toEqual({ x: 2, y: 0 }) // top-left
    expect(SCATTER_CORNER.inky).toEqual({ x: 27, y: 35 }) // bottom-right
    expect(SCATTER_CORNER.clyde).toEqual({ x: 0, y: 35 }) // bottom-left
  })
})
