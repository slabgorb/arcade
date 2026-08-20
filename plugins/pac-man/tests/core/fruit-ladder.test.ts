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
// against the ROM on two axes:
//   • POINTS: decoded LIVE from the vendored scoring table `pacman.asm:2b23`-`2b31`
//     (never transcribed here), so a drift in either our table OR the ROM reddens.
//   • DOUBLING: the shape of the level->fruit table `pacman.asm:3b08` — cherry and
//     strawberry once each, then orange/apple/melon/galaxian/bell on two levels apiece,
//     key from 13 on. (3b08's bytes: 90 · 94 · 98 98 · a0 a0 · a4 a4 · a8 a8 · 9c 9c ·
//     ac ac …, one sprite code per level, the pairs BEING the doubling.)
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

// --- The fruit POINTS, read straight from the vendored ROM scoring table ----------
// `pacman.asm` is git-tracked (present in every checkout), so absence is a real
// regression, not an expected CI condition — we require it rather than skip.
const asmPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'reference', 'source', 'pacman.asm')
const asmLineByAddr = new Map<string, string>()
for (const line of readFileSync(asmPath, 'utf8').split('\n')) {
  const m = line.match(/^([0-9a-f]{4})\s/i)
  if (m) asmLineByAddr.set(m[1].toLowerCase(), line.trim())
}

/** Points at a scoring-table address, decoded x10-BCD live from the ROM line. */
function romPoints(addr: string): number {
  const line = asmLineByAddr.get(addr)
  expect(line, `pacman.asm has a line at ${addr}`).toBeTruthy()
  const word = dataWordOf(line!)
  expect(word, `pacman.asm:${addr} carries a data word ("${line}")`).toBeTruthy()
  return decodeBcdX10(word!)
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
