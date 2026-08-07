// tests/core/ghost.test.ts
//
// Story pm1-5 (RED, TEA) — ghost kinematics + house release, written BEFORE
// src/core/ghost.ts and src/core/house.ts exist. Real maze coordinates below
// (junction (12,8), red-zone tile (12,14)) were read off `src/core/maze.ts`'s
// actual row table via `isWalkable`, not invented — see glossary.md §Ghost
// movement / §Ghost house for the citation status of each fixture.

import { describe, it, expect } from 'vitest'
import { isWalkable } from '../../src/core/maze'
import { TILE_PX, type Actor } from '../../src/core/actor'
import { stepGhost, RED_ZONE_TILES, type Ghost } from '../../src/core/ghost'
import {
  createHouseState,
  releaseFromHouse,
  GLOBAL_DOT_LIMIT,
  PERSONAL_DOT_LIMIT,
} from '../../src/core/house'

function ghostAt(tx: number, ty: number, dir: Actor['dir']): Ghost {
  return { id: 'blinky', actor: { xPx: tx * TILE_PX, yPx: ty * TILE_PX, dir, pending: 'none' } }
}

describe('fixture sanity — the junction and red-zone tiles are real maze geometry', () => {
  it('(12,8) is a genuine 4-way junction (all four neighbours walkable)', () => {
    expect(isWalkable(12, 7, 'ghost')).toBe(true) // up
    expect(isWalkable(12, 9, 'ghost')).toBe(true) // down
    expect(isWalkable(11, 8, 'ghost')).toBe(true) // left
    expect(isWalkable(13, 8, 'ghost')).toBe(true) // right
  })

  it('(12,14) genuinely has a walkable up-neighbour (the red-zone rule has real work to do)', () => {
    expect(isWalkable(12, 13, 'ghost')).toBe(true)
    expect(isWalkable(12, 15, 'ghost')).toBe(false) // house wall below
    expect(isWalkable(11, 14, 'ghost')).toBe(true)
    expect(isWalkable(13, 14, 'ghost')).toBe(true)
  })
})

describe('stepGhost — target-seeking turn choice (glossary.md §Ghost movement)', () => {
  it('at a junction, picks the walkable direction that minimizes distance to target (no tie)', () => {
    const g = ghostAt(12, 8, 'none')
    stepGhost(g, { x: 12, y: 20 }, {}) // far below: 'down' is unambiguously closest
    expect(g.actor.dir).toBe('down')
  })

  it('ties resolve by the ROM tile-preference order up>left>down>right', () => {
    // Target is the junction tile itself: all four neighbours are equidistant
    // (squared distance 1), so only the tie-break decides.
    const g = ghostAt(12, 8, 'none')
    stepGhost(g, { x: 12, y: 8 }, {})
    expect(g.actor.dir).toBe('up')
  })

  it('never reverses on an ordinary step, even when reversing would be closest', () => {
    // Moving 'right'; target sits directly behind (left neighbour, distance 0)
    // — reversing is forbidden, so up/down (both distance 2) tie next and 'up'
    // wins the tie-break.
    const g = ghostAt(12, 8, 'right')
    stepGhost(g, { x: 11, y: 8 }, {})
    expect(g.actor.dir).not.toBe('left')
    expect(g.actor.dir).toBe('up')
  })

  it('DOES reverse when the mode signal forces it', () => {
    const g = ghostAt(12, 8, 'right')
    stepGhost(g, { x: 11, y: 8 }, { forceReverse: true })
    expect(g.actor.dir).toBe('left')
  })

  it('bars an upward turn in a red-zone tile even when up is the closest candidate', () => {
    const g = ghostAt(12, 14, 'none')
    stepGhost(g, { x: 12, y: 0 }, {}) // straight up: 'up' would otherwise win easily
    expect(g.actor.dir).not.toBe('up')
    // down is walled off here; left/right tie on distance to (12,0), and left
    // wins the up>left>down>right preference.
    expect(g.actor.dir).toBe('left')
  })

  it('RED_ZONE_TILES exposes exactly the two documented tiles', () => {
    expect(RED_ZONE_TILES).toEqual([
      { x: 12, y: 14 },
      { x: 15, y: 14 },
    ])
  })

  it('advances one pixel per frame once a direction is chosen', () => {
    const g = ghostAt(12, 8, 'none')
    stepGhost(g, { x: 12, y: 20 }, {})
    expect(g.actor.xPx).toBe(12 * TILE_PX)
    expect(g.actor.yPx).toBe(8 * TILE_PX + 1)
  })
})

describe('releaseFromHouse — dot-counter release order (glossary.md §Ghost house)', () => {
  it('Blinky starts released; Pinky/Inky/Clyde start housed', () => {
    const state = createHouseState()
    expect(state.released.blinky).toBe(true)
    expect(state.released.pinky).toBe(false)
    expect(state.released.inky).toBe(false)
    expect(state.released.clyde).toBe(false)
  })

  it('personal counter: releases Inky once its cited/dossier threshold is reached, not before', () => {
    const state = createHouseState()
    state.personalDotsEaten = PERSONAL_DOT_LIMIT.inky - 1
    releaseFromHouse(state)
    expect(state.released.inky).toBe(false)

    state.personalDotsEaten = PERSONAL_DOT_LIMIT.inky
    releaseFromHouse(state)
    expect(state.released.inky).toBe(true)
    expect(state.released.clyde).toBe(false) // clyde's higher threshold not yet met
  })

  it('global counter (byte-cited pacman.asm:2078/209b/20be): releases Pinky at 7, Inky at 17, Clyde at 32', () => {
    const state = createHouseState()
    state.useGlobalCounter = true

    state.globalDotsEaten = GLOBAL_DOT_LIMIT.pinky
    releaseFromHouse(state)
    expect(state.released.pinky).toBe(true)
    expect(state.released.inky).toBe(false)

    state.globalDotsEaten = GLOBAL_DOT_LIMIT.inky
    releaseFromHouse(state)
    expect(state.released.inky).toBe(true)
    expect(state.released.clyde).toBe(false)

    state.globalDotsEaten = GLOBAL_DOT_LIMIT.clyde
    releaseFromHouse(state)
    expect(state.released.clyde).toBe(true)
  })

  it('is idempotent once every ghost is released', () => {
    const state = createHouseState()
    state.personalDotsEaten = 999
    releaseFromHouse(state)
    releaseFromHouse(state)
    expect(state.released).toEqual({ blinky: true, pinky: true, inky: true, clyde: true })
  })
})
