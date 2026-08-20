// tests/core/fruit-ladder.test.ts
//
// Story pt1-17 — the 2026-08-19 playtest flagged "peach after peach": a bonus fruit
// that appears on two consecutive levels. That is the AUTHENTIC Pac-Man ladder — every
// fruit past strawberry spans two levels — so this story is verify-and-guard, not a
// fix. The "peach" is most likely the THIRD fruit (levels 3-4): our `FruitType` names it
// `orange`, but the graphics dossier labels that very sprite "peach, by conventional ROM
// ordering" (docs/rom-study/claims/graphics.json, sprite index 18) — a round orange-pink
// fruit widely misremembered as a peach. Whichever pair the eye caught, the doubling
// itself is ROM-correct, and this guard pins every level 1-13 individually, so the
// verdict holds either way.
//
// This test locks the level->fruit progression our game actually serves — the public
// seam `levelRow(level).fruit`, which the HUD row and the spawn logic both read —
// against the ROM on two axes, each read LIVE from the vendored source:
//   • POINTS: decoded from the scoring table `pacman.asm:2b23`-`2b31` via dataWordOf +
//     decodeBcdX10, so a drift in either our table OR the ROM reddens. Not transcribed
//     per-level; the one literal list (in the distinct-values test) is the decode anchor.
//   • DOUBLING: cross-checked against the level->fruit table `pacman.asm:3b08` — one
//     2-byte sprite-code entry per level (90 · 94 · 98 98 · a0 a0 · a4 a4 · a8 a8 · 9c 9c ·
//     ac ac …, the equal-code pairs BEING the doubling). Our ladder's "same fruit on
//     adjacent levels" boundaries must coincide with the ROM's "same sprite code"
//     boundaries: cherry & strawberry once each, then every later fruit on two levels,
//     key from 13 on. The bytes are read live, not just cited.
//
// Why the gap was real: game.test.ts pins only level 1; hud-icons.test.ts consumes
// `levelRow().fruit` as its OWN source of truth, so it cannot catch a wrong ladder; and
// citations.test.ts re-derives the scoring-table VALUES from the ROM but says nothing
// about which fruit reaches which level. The level->fruit MAPPING was unguarded.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { levelRow } from '../../src/core/level'
import type { FruitType } from '../../src/core/level'
import { dataWordOf, decodeBcdX10 } from '../audit/dossier-sweep'

// --- The vendored ROM, read once. `pacman.asm` is git-tracked (present in every
// checkout), so absence is a real regression, not an expected CI condition — we
// require it rather than skip.
const asmPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'reference', 'source', 'pacman.asm')
const asmText = readFileSync(asmPath, 'utf8')

// Scoring-table lookup: address → the whole disassembly line (for `dataWordOf`).
const asmLineByAddr = new Map<string, string>()
// Raw byte at every address, reconstructed from the hex-dump column. Unlike the line
// map, this survives multi-byte instructions that fold an address into an operand —
// which the 3b08 fruit table needs, since the disassembler renders its bytes as `ld`
// operands (e.g. `3b1d 169c ld d,#9c` hides the byte at 3b1e).
const romByteAt = new Map<number, number>()
for (const line of asmText.split('\n')) {
  const addrOnly = line.match(/^([0-9a-f]{4})\s/i)
  if (addrOnly) asmLineByAddr.set(addrOnly[1].toLowerCase(), line.trim())
  const hexCol = line.match(/^([0-9a-f]{4})\s+((?:[0-9a-f]{2})+)(?:\s|$)/i)
  if (hexCol) {
    const base = parseInt(hexCol[1], 16)
    for (let i = 0; i * 2 < hexCol[2].length; i++) {
      romByteAt.set(base + i, parseInt(hexCol[2].slice(i * 2, i * 2 + 2), 16))
    }
  }
}

/** Points at a scoring-table address, decoded x10-BCD live from the ROM line. */
function romPoints(addr: string): number {
  const line = asmLineByAddr.get(addr)
  if (line === undefined) throw new Error(`pacman.asm has no line at ${addr}`)
  const word = dataWordOf(line)
  if (word === null) throw new Error(`pacman.asm:${addr} carries no data word ("${line}")`)
  return decodeBcdX10(word)
}

// The level→fruit sprite table: one 2-byte entry (sprite code + colour) per level.
// Consecutive levels carrying the SAME sprite code show the same fruit — that IS the
// doubling, straight from the ROM.
const FRUIT_TABLE_3B08 = 0x3b08 // pacman.asm:3b08
function romFruitCode(level: number): number {
  const addr = FRUIT_TABLE_3B08 + (level - 1) * 2
  const b = romByteAt.get(addr)
  if (b === undefined) throw new Error(`pacman.asm:3b08 fruit table has no byte at 0x${addr.toString(16)} (level ${level})`)
  return b
}

// The ladder our game serves. `addr` anchors each rung's POINTS to the byte in the
// scoring table that ENCODES it — a mis-anchor reddens because every address decodes
// a DISTINCT value (100/300/500/700/1000/2000/3000/5000).
interface Rung {
  readonly level: number
  readonly type: FruitType
  readonly addr: string
}
const LADDER: readonly Rung[] = [
  { level: 1, type: 'cherry', addr: '2b23' }, // 100
  { level: 2, type: 'strawberry', addr: '2b25' }, // 300
  { level: 3, type: 'orange', addr: '2b27' }, // 500  ┐ the "peach after peach" (see header)
  { level: 4, type: 'orange', addr: '2b27' }, //      ┘
  { level: 5, type: 'apple', addr: '2b29' }, // 700   ┐
  { level: 6, type: 'apple', addr: '2b29' }, //       ┘
  { level: 7, type: 'melon', addr: '2b2b' }, // 1000  ┐
  { level: 8, type: 'melon', addr: '2b2b' }, //       ┘
  { level: 9, type: 'galaxian', addr: '2b2d' }, // 2000 ┐
  { level: 10, type: 'galaxian', addr: '2b2d' }, //      ┘
  { level: 11, type: 'bell', addr: '2b2f' }, // 3000  ┐
  { level: 12, type: 'bell', addr: '2b2f' }, //       ┘
  { level: 13, type: 'key', addr: '2b31' }, // 5000  (terminal, 13+)
]

describe('fruit ladder — the level→fruit progression served to the player (pt1-17)', () => {
  for (const { level, type, addr } of LADDER) {
    it(`level ${level} serves ${type} worth the ROM value at pacman.asm:${addr}`, () => {
      const fruit = levelRow(level).fruit
      expect(fruit.type).toBe(type)
      expect(fruit.points).toBe(romPoints(addr))
    })
  }

  it('the ROM scoring table decodes to eight distinct, ascending fruit values', () => {
    // Guards the decode itself: if all rungs collapsed to one value, the per-level
    // points assertions above would pass vacuously. They do not.
    const values = ['2b23', '2b25', '2b27', '2b29', '2b2b', '2b2d', '2b2f', '2b31'].map(romPoints)
    expect(values).toEqual([100, 300, 500, 700, 1000, 2000, 3000, 5000])
  })

  it('cherry and strawberry appear once; every later fruit spans exactly two levels', () => {
    const t = (lvl: number): FruitType => levelRow(lvl).fruit.type
    // The two singletons — distinct fruits, no repeat.
    expect(t(1)).toBe('cherry')
    expect(t(2)).toBe('strawberry')
    expect(t(1)).not.toBe(t(2))
    // The doubled pairs: each pair identical (the playtest's "X after X"), and each
    // pair opens with a NEW fruit — so the boundary before it differs.
    for (const [a, b] of [[3, 4], [5, 6], [7, 8], [9, 10], [11, 12]] as const) {
      expect(t(a)).toBe(t(b)) // e.g. level 7 melon === level 8 melon
      expect(t(a - 1)).not.toBe(t(a)) // a fresh fruit starts the pair
    }
  })

  it('our doubling boundaries coincide with the ROM fruit table (pacman.asm:3b08)', () => {
    // Ties the doubling to the ROM itself, not just to our own self-consistency: for
    // every adjacent level pair, "same fruit in our ladder" must hold EXACTLY when
    // "same sprite code in the 3b08 table" holds. A change to either side's pairing
    // (ours OR the ROM) breaks the correspondence and reddens.
    for (let level = 1; level <= 13; level++) {
      const oursDoubled = levelRow(level).fruit.type === levelRow(level + 1).fruit.type
      const romDoubled = romFruitCode(level) === romFruitCode(level + 1)
      expect(oursDoubled, `levels ${level}/${level + 1}: ours doubled=${oursDoubled}, ROM doubled=${romDoubled}`).toBe(romDoubled)
    }
  })

  it('key is the terminal fruit from level 13 on — bell does not extend past 12', () => {
    expect(levelRow(13).fruit.type).toBe('key') // level 13's value is ROM-pinned to 2b31 above
    expect(levelRow(12).fruit.type).toBe('bell')
    expect(levelRow(12).fruit.type).not.toBe(levelRow(13).fruit.type) // bell → key boundary
    // Every level past 12 clamps to the terminal rung — asserted AS level 13's fruit, not
    // a transcribed literal, so the ROM value flows through the byte-checked rung above.
    for (const lvl of [14, 20, 21, 100, 256]) {
      expect(levelRow(lvl).fruit).toEqual(levelRow(13).fruit)
    }
  })
})
