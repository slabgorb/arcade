// tests/shell/eyes-render.test.ts
//
// Story pm4-3 (RED, TEA) — wire the 'eaten' render mode.
//
// render.ts already implements the eyes-only 'eaten' body (drawGhost, covered
// by sprites.test.ts) but NOTHING ever passes 'eaten' to it: main.ts's
// `ghostRenderMode` is global and, by its own doc-comment, can only return
// chase/frightened/flash because the core had no eyes-in-transit state. pm4-3
// adds that state (core `isReturningHome`); this test pins the missing link —
// a per-ghost render-mode selector that returns 'eaten' for a returning ghost.
//
// CONTRACT for Dev: export a pure `ghostRenderMode(game, id): GhostRenderMode`
// from render.ts (generalising the private one in main.ts to be per-ghost) so
// the eyes mode is dispatched and unit-testable. main.ts then calls it per id.

import { describe, it, expect } from 'vitest'
import { speedPattern } from '../../src/core/actor'
import { createGameState, stepGame, isReturningHome } from '../../src/core/game'
import { ghostRenderMode } from '../../src/shell/render'

function noMoveFrameIndex(pct: number): number {
  const idx = speedPattern(pct).indexOf(false)
  expect(idx).toBeGreaterThanOrEqual(0)
  return idx
}

// Eat Blinky so it enters the eyes/returning state.
function eatBlinky(seed: number) {
  const state = createGameState(seed)
  state.mode.frightenedTimer = 600
  const g = state.ghosts.blinky
  state.pac.actor.xPx = g.actor.xPx
  state.pac.actor.yPx = g.actor.yPx
  state.pac.actor.dir = 'none'
  state.house.released.blinky = true
  state.ghostFrame.blinky = noMoveFrameIndex(50)
  stepGame(state, { dir: 'none' })
  expect(state.events.some((e) => e.type === 'ghost-eaten')).toBe(true)
  return state
}

describe('pm4-3: the shell dispatches the eyes-only "eaten" render mode', () => {
  it('returns "eaten" for a ghost that is returning home', () => {
    const state = eatBlinky(4210)
    expect(isReturningHome(state, 'blinky'), 'precondition: blinky is eyes').toBe(true)
    expect(ghostRenderMode(state, 'blinky')).toBe('eaten')
  })

  it('returns "chase" for an ordinary ghost (not frightened, not eyes)', () => {
    const state = createGameState(4211)
    state.mode.frightenedTimer = 0
    expect(isReturningHome(state, 'blinky')).toBe(false)
    expect(ghostRenderMode(state, 'blinky')).toBe('chase')
  })

  it('still returns "frightened" for a frightened ghost that has not been eaten', () => {
    const state = createGameState(4212)
    state.mode.frightenedTimer = 600 // well outside the flash window
    expect(ghostRenderMode(state, 'blinky')).toBe('frightened')
  })
})
