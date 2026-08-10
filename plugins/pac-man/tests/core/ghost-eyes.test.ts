// tests/core/ghost-eyes.test.ts
//
// Story pm4-3 (RED, TEA) — the eaten-ghost eyes-return + forced house exit.
//
// Today an eaten ghost is teleported straight to its spawn tile with
// `released=false` (game.ts, the frightened-collision branch) and its
// re-release is gated on the SAME dot counter as initial release, so under the
// post-death global counter it loiters in the house. The ROM instead turns an
// eaten ghost into a pair of EYES that travel back to the house, regenerate a
// body there, and then leave IMMEDIATELY — a forced exit that is NOT dot-gated,
// distinct from the personal/global dot-counter release of a ghost that has
// never left.
//
// CITATION STATUS (honest, non-fabricated): the eyes-return control flow lives
// in ROM as part of the unlabelled ghost-behaviour region. Per
// docs/rom-study/glossary.md §Ghost movement "Citation status", grepping the
// vendored disassembly for this logic returns zero symbol hits — there is NO
// isolable `pacman.asm:<addr>` literal to anchor, so the BEHAVIOUR is recorded
// (like scatter/chase/targeting) as Dossier ch.4 "Ghosts", Dossier-decoded and
// uncited. The only byte-anchored artefact is the eyes SPRITE frame,
// claims/graphics.json GHOST-EYES (sprite index 12, "used by every ghost when
// eaten/retreating"). These tests therefore pin BEHAVIOUR, not a ROM literal.
//
// GEOMETRY (from pm4-3's predecessor pm4-4, now on develop): the ghost-house
// gate is row 15, the interior is rows 16-18. All house membership below is
// read from the live maze via tileAt(), never a hardcoded row number.

import { describe, it, expect } from 'vitest'
import { tileAt, isWalkable } from '../../src/core/maze'
import { speedPattern, TILE_PX } from '../../src/core/actor'
import type { GhostId } from '../../src/core/ghost'
import {
  createHouseState,
  releaseFromHouse,
  forceLeaveHouse,
  GLOBAL_DOT_LIMIT,
} from '../../src/core/house'
import {
  createGameState,
  stepGame,
  isReturningHome,
  type GameState,
} from '../../src/core/game'

// A speed-pattern frame index on which the ghost does NOT move — lets us freeze
// a ghost on Pac-Man's tile for exactly the collision frame (same trick the
// pm1-8 ghost-contact tests use).
function noMoveFrameIndex(pct: number): number {
  const pattern = speedPattern(pct)
  const idx = pattern.indexOf(false)
  expect(idx, `speedPattern(${pct}) has no held frame to freeze on`).toBeGreaterThanOrEqual(0)
  return idx
}

const tileOf = (state: GameState, id: GhostId) => ({
  tx: Math.round(state.ghosts[id].actor.xPx / TILE_PX),
  ty: Math.round(state.ghosts[id].actor.yPx / TILE_PX),
})

// Force `id` to be eaten THIS frame: frighten the ghosts, overlap Pac-Man onto
// the (released) ghost, and freeze the ghost on a no-move frame so it is still
// on Pac-Man's tile when the collision check runs.
function eatGhost(state: GameState, id: GhostId): void {
  state.mode.frightenedTimer = 600
  const g = state.ghosts[id]
  state.pac.actor.xPx = g.actor.xPx
  state.pac.actor.yPx = g.actor.yPx
  state.pac.actor.dir = 'none'
  state.house.released[id] = true
  state.ghostFrame[id] = noMoveFrameIndex(50) // level-1 frightened ghost speed pct
  stepGame(state, { dir: 'none' })
  const ate = state.events.find((e) => e.type === 'ghost-eaten')
  expect(ate, `precondition: a ghost must be eaten this frame`).toBeTruthy()
  expect(ate, `precondition: the eaten ghost is ${id}`).toMatchObject({ ghost: id })
}

// Park Pac-Man far from the house so it neither eats dots (freezing the counter)
// nor is reached by a regenerated ghost before the assertion window closes.
function parkPacAway(state: GameState): void {
  state.pac.actor.xPx = 9 * TILE_PX
  state.pac.actor.yPx = 23 * TILE_PX
  state.pac.actor.dir = 'none'
  state.pac.actor.pending = 'none'
}

// ─── house.ts: a forced exit path distinct from dot-gated release ────────────
describe('pm4-3: house.ts has a forced (non-dot-gated) exit distinct from initial release', () => {
  it('forceLeaveHouse releases a ghost even with both dot counters at zero', () => {
    const h = createHouseState() // pinky/inky/clyde housed, counters 0
    // The ordinary dot-gated path leaves inky housed at counter 0 …
    releaseFromHouse(h)
    expect(h.released.inky, 'dot-gated release must NOT free inky at counter 0').toBe(false)
    // … but the forced regenerate-and-leave path frees it regardless.
    forceLeaveHouse(h, 'inky')
    expect(h.released.inky, 'forced exit must free inky at counter 0').toBe(true)
  })

  it('forceLeaveHouse does not advance either dot counter (it is not a release trigger)', () => {
    const h = createHouseState()
    forceLeaveHouse(h, 'clyde')
    expect(h.personalDotsEaten, 'forced exit must not touch the personal counter').toBe(0)
    expect(h.globalDotsEaten, 'forced exit must not touch the global counter').toBe(0)
  })

  it('does not force OTHER housed ghosts out (only the named one leaves)', () => {
    const h = createHouseState()
    forceLeaveHouse(h, 'inky')
    expect(h.released.pinky, 'pinky stays dot-gated').toBe(false)
    expect(h.released.clyde, 'clyde stays dot-gated').toBe(false)
  })
})

// ─── game.ts: an eaten ghost becomes eyes and returns home ───────────────────
describe('pm4-3: an eaten ghost returns home as eyes, then regenerates', () => {
  it('enters the eyes/returning state instead of teleporting inert to spawn', () => {
    const state = createGameState(4201)
    eatGhost(state, 'blinky')
    expect(
      isReturningHome(state, 'blinky'),
      'a just-eaten ghost must be returning home as eyes',
    ).toBe(true)
  })

  it('regenerates within a bounded time and rejoins play OUTSIDE the house', () => {
    const state = createGameState(4202)
    eatGhost(state, 'blinky')
    parkPacAway(state)

    let regenerated = false
    for (let f = 0; f < 4000; f++) {
      stepGame(state, { dir: 'none' })
      if (!isReturningHome(state, 'blinky') && state.house.released.blinky) {
        regenerated = true
        break
      }
    }
    expect(regenerated, 'the eyes must reach home, regenerate, and re-exit').toBe(true)

    const { tx, ty } = tileOf(state, 'blinky')
    expect(tileAt(tx, ty), `regenerated ghost is back outside the house (${tx},${ty})`).not.toBe('house')
    expect(isWalkable(tx, ty, 'ghost'), 'regenerated ghost stands on a ghost-walkable tile').toBe(true)
  })
})

// ─── game.ts: the forced re-exit is NOT dot-gated (the actual bug) ────────────
describe('pm4-3: the regenerated ghost leaves forcibly, not gated on the dot counter', () => {
  it('re-exits with the release counter frozen below its threshold, while a never-eaten ghost stays gated', () => {
    const state = createGameState(4203)
    // Isolate inky: house Blinky so it cannot wander into parked Pac-Man; make
    // inky (personal 30 / global 17) eligible to be eaten.
    state.house.released.blinky = false
    state.house.released.inky = true
    expect(GLOBAL_DOT_LIMIT.inky, 'inky must have a NON-zero limit for this test to bite').toBeGreaterThan(0)

    eatGhost(state, 'inky')

    // Post-death posture: the global counter governs, held BELOW inky's limit.
    // Under pure dot-gating inky could never re-release here.
    state.house.useGlobalCounter = true
    state.house.globalDotsEaten = 0
    parkPacAway(state)
    const dotsBefore = state.dotsEaten

    let reExited = false
    for (let f = 0; f < 4000; f++) {
      stepGame(state, { dir: 'none' })
      if (state.house.released.inky && !isReturningHome(state, 'inky')) {
        reExited = true
        break
      }
    }
    expect(reExited, 'the eaten ghost must be forced back out despite the frozen counter').toBe(true)
    expect(state.dotsEaten, 'no dots were eaten — the re-exit was NOT dot-gated').toBe(dotsBefore)
    // Control: clyde was never eaten, so its INITIAL release stays dot-gated.
    expect(state.house.released.clyde, 'a never-eaten housed ghost stays gated').toBe(false)
  })
})

// ─── game.ts: eyes are harmless to Pac-Man (guard) ───────────────────────────
describe('pm4-3: a returning ghost (eyes) does not cost Pac-Man a life', () => {
  it('costs no life when its eyes pass over Pac-Man, even when the timer is not frightened', () => {
    const state = createGameState(4204)
    eatGhost(state, 'blinky')
    expect(isReturningHome(state, 'blinky'), 'precondition: blinky is eyes').toBe(true)

    // Drop out of frightened so it is specifically the EYES state — not a blue
    // body — that must protect Pac-Man on contact.
    state.mode.frightenedTimer = 0
    const g = state.ghosts.blinky
    state.pac.actor.xPx = g.actor.xPx
    state.pac.actor.yPx = g.actor.yPx
    state.pac.actor.dir = 'none'
    state.ghostFrame.blinky = noMoveFrameIndex(50)
    const livesBefore = state.lives

    stepGame(state, { dir: 'none' })
    expect(state.lives, 'eyes must not kill Pac-Man').toBe(livesBefore)
    expect(state.events.some((e) => e.type === 'pac-died'), 'no pac-died from eyes contact').toBe(false)
  })
})
