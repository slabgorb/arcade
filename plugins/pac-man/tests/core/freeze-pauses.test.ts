// tests/core/freeze-pauses.test.ts
//
// Story pm4-7 (RED, TEA / Leeloo) — WIRING the two freeze transitions the pure
// pm4-5 phase machine (`advancePhase`, tests/core/phase.test.ts) left unhooked,
// into `stepGame`. Written BEFORE game.ts is wired, so these fail now.
//
//   playing --(all dots eaten)-------> level-clear --(clear timer)--> ready(level+1)
//   playing --(pac-died, lives>0)----> dying       --(death timer)--> ready(respawn)
//
// SCOPE FENCE (from the epic design, docs/superpowers/specs/2026-08-09-…):
// pm4-7 owns ONLY these two edges + their freeze windows + the deferred
// advanceLevel / respawn side effects. pm4-6 already owns attract/ready/playing;
// pm4-8 the attract auto-player; pm4-10 the game-over->attract timeout. The
// lives=0 -> game-over path is UNCHANGED by this story (no dying freeze) and is
// pinned green below so GREEN cannot regress it.
//
// WHY THIS REPLACES "INSTANT": today game.ts respawns (game.ts:679
// `respawnAfterDeath`) and advances the level (game.ts:686-689 `advanceLevel`)
// on the SAME frame the trigger fires — no freeze, no pause. The boss reported
// the level-clear as an epilepsy hazard; pm4-1 already deleted the shell strobe
// (tests/shell/overlays.test.ts guards its ABSENCE — pm4-7 is core-only and must
// not touch overlays.ts), and pm4-7 makes the FREEZE real in the sim.
//
// CADENCE POSTURE (design §2/§5, confirmed against the quarry at RED): there is
// NO isolable ROM duration literal for the death-anim window or the level-clear
// freeze — the glossary carries none and docs/rom-study/claims/*.json cite no
// timing constant. The freeze HOLD LENGTHS are therefore honest-uncited
// shell-timing choices, exactly like the existing READY_HOLD_FRAMES (256, derived
// from the §Music intro length) and FRUIT_VISIBLE_FRAMES (9*60). So these tests
// MEASURE the freeze and the eventual transition rather than pinning a frame
// count Dev has not chosen — no ROM line is fabricated here (cf. the "sm-setup
// fabricates ROM citations" gotcha). Any constant Dev DOES cite is gated by
// tests/audit/citations.test.ts independently of this file.

import { describe, it, expect } from 'vitest'
import {
  createGameState,
  stepGame,
  DEFAULT_LIVES,
  type GameState,
} from '../../src/core/game'
import { DOT_COUNT } from '../../src/core/maze'
import { speedPattern } from '../../src/core/actor'
import { levelRow } from '../../src/core/level'

const SEED = 12345
// 20s @ 60Hz — a generous ceiling far above any real freeze (READY_HOLD is 256
// ≈ 4.2s); a death/clear window that never expires within this is a real bug.
const MAX_FREEZE = 1200

/** Force a phase without narrowing `s.phase` to a single literal at the call
 *  site — a bare `s.phase = 'dying'` makes TS treat a later `.toBe('ready')` as
 *  an impossible comparison (TS2367), reddening `npm run lint` FOREVER, not just
 *  until Dev wires the machine (see the pm4-6 lifecycle.test.ts precedent and the
 *  "phase-literal assignment narrows tsc" note). Routing through this keeps
 *  `s.phase` typed as the full `GamePhase` union. */
function forcePhase(s: GameState, phase: GameState['phase']): void {
  s.phase = phase
}

/** A board already in `playing` — the precondition every sim-level test shares
 *  (mirrors game.test.ts's own `playingGame`). */
function playingGame(seed: number): GameState {
  const state = createGameState(seed)
  forcePhase(state, 'playing')
  return state
}

/** The mutable positions + counters the sim would change if it were running.
 *  A freeze must leave every one of these untouched. */
function worldPose(s: GameState) {
  return {
    pac: { x: s.pac.actor.xPx, y: s.pac.actor.yPx },
    blinky: { x: s.ghosts.blinky.actor.xPx, y: s.ghosts.blinky.actor.yPx },
    dots: s.dotsEaten,
    score: s.score,
    level: s.level,
  }
}

/** The spawn pixel of a fresh cabinet — used to prove a post-`dying` respawn put
 *  Pac back at the start tile without needing game.ts's private PACMAN_SPAWN. */
function spawnPixel() {
  const fresh = createGameState(SEED)
  return { x: fresh.pac.actor.xPx, y: fresh.pac.actor.yPx }
}

/** The first `speedPattern(pct)` index that says "hold still" — freezes a ghost
 *  on the overlap tile for exactly one deterministic collision frame (a moving
 *  ghost could step off it, making the death fixture flaky). Borrowed verbatim
 *  from game.test.ts's contact tests. */
function noMoveFrameIndex(pct: number): number {
  const idx = speedPattern(pct).indexOf(false)
  expect(idx, `speedPattern(${pct}) has no held frame to freeze on`).toBeGreaterThanOrEqual(0)
  return idx
}

/** Arrange a lethal (non-frightened) Blinky-on-Pac collision for the NEXT step:
 *  overlap the tiles and freeze Blinky so it stays put through the resolve.
 *  Blinky is released from frame 0 (house.ts) and the fresh board starts in
 *  scatter (not frightened), so the contact costs a life — exactly game.test.ts's
 *  "ghost contact — not frightened costs a life" setup. */
function arrangeDeath(state: GameState): void {
  state.ghosts.blinky.actor.xPx = state.pac.actor.xPx
  state.ghosts.blinky.actor.yPx = state.pac.actor.yPx
  state.ghostFrame.blinky = noMoveFrameIndex(levelRow(state.level).ghostSpeedPct)
}

// ───────────────────────────────────────────────────────────────────────────────
// AC3 — DYING: a death with lives left FREEZES (death-anim window), does NOT
// instantly respawn, then respawns Pac and hands off to ready.
// ───────────────────────────────────────────────────────────────────────────────
describe('pm4-7 AC3: pac-died with lives>0 enters `dying` (freeze), not an instant respawn', () => {
  it('a lethal contact with lives left moves playing -> dying (was: straight back to playing)', () => {
    const state = playingGame(4)
    expect(state.lives, 'fixture sanity: more than one life so this is a dying, not a game-over').toBeGreaterThan(1)
    arrangeDeath(state)
    stepGame(state, { dir: 'none' })
    expect(state.phase, 'a death with lives left freezes into the dying phase').toBe('dying')
    expect(state.lives, 'the life is still spent on the death frame').toBe(DEFAULT_LIVES - 1)
    expect(state.events.some((e) => e.type === 'pac-died'), 'the pac-died event still fires').toBe(true)
  })

  it('the sim is frozen for the whole death window — nothing moves while dying', () => {
    const state = playingGame(4)
    forcePhase(state, 'dying')
    const frozen = worldPose(state)
    let frames = 0
    while (state.phase === 'dying' && frames < MAX_FREEZE) {
      stepGame(state, { dir: 'right' }) // Pac/ghosts would move every frame if the sim were live
      frames++
      if (state.phase === 'dying') {
        expect(worldPose(state), 'the death animation holds the sim — Pac, Blinky, dots and score are frozen').toEqual(frozen)
      }
    }
    expect(frames, 'a real death window of at least one frame runs before respawn').toBeGreaterThanOrEqual(1)
    expect(state.phase, 'the death window expires out of dying within the ceiling').not.toBe('dying')
  })

  it('the death window expires into ready with Pac respawned at the start tile', () => {
    const state = playingGame(4)
    const spawn = spawnPixel()
    // Move Pac off the spawn tile so a respawn is observable, then freeze into dying.
    for (let i = 0; i < 6; i++) stepGame(state, { dir: 'right' })
    expect(state.pac.actor.xPx, 'fixture sanity: Pac has left the spawn tile').not.toBe(spawn.x)
    forcePhase(state, 'dying')
    let frames = 0
    while (state.phase === 'dying' && frames < MAX_FREEZE) {
      stepGame(state, { dir: 'none' })
      frames++
    }
    expect(state.phase, 'dying hands off to ready (the post-death READY hold), never straight to playing').toBe('ready')
    expect(state.pac.actor.xPx, 'respawn returns Pac to the spawn tile').toBe(spawn.x)
    expect(state.pac.actor.yPx).toBe(spawn.y)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// AC2 — LEVEL-CLEAR: all dots eaten FREEZES + DEFERS the advance, then advances
// the level and hands off to ready.
// ───────────────────────────────────────────────────────────────────────────────
describe('pm4-7 AC2: all dots eaten enters `level-clear` (freeze) and DEFERS advanceLevel', () => {
  it('crossing DOT_COUNT moves playing -> level-clear WITHOUT advancing the level yet', () => {
    const state = playingGame(3)
    state.dotsEaten = DOT_COUNT // "every dot eaten", via the real counter (game.test.ts idiom)
    stepGame(state, { dir: 'none' })
    expect(state.phase, 'the board clear freezes into the level-clear phase').toBe('level-clear')
    expect(state.level, 'the advance is DEFERRED behind the freeze — still level 1 on the clear frame').toBe(1)
    expect(state.dotsEaten, 'the dot count is NOT reset yet (advanceLevel has not run)').toBe(DOT_COUNT)
    expect(
      state.events.some((e) => e.type === 'level-cleared' && e.level === 1),
      'the level-cleared event still fires on entry',
    ).toBe(true)
  })

  it('the sim is frozen for the whole clear window — nothing moves and the level holds', () => {
    const state = playingGame(3)
    forcePhase(state, 'level-clear')
    const frozen = worldPose(state)
    let frames = 0
    while (state.phase === 'level-clear' && frames < MAX_FREEZE) {
      stepGame(state, { dir: 'right' })
      frames++
      if (state.phase === 'level-clear') {
        expect(worldPose(state), 'the static-frame hold freezes the sim AND the level number').toEqual(frozen)
      }
    }
    expect(frames, 'a real clear window of at least one frame runs before the advance').toBeGreaterThanOrEqual(1)
    expect(state.phase, 'the clear window expires out of level-clear within the ceiling').not.toBe('level-clear')
  })

  it('the clear window expires into ready on the NEXT level with a fresh board', () => {
    const state = playingGame(3)
    state.dotsEaten = DOT_COUNT
    let frames = 0
    // one step enters level-clear; keep stepping to run the freeze down
    while (state.level === 1 && frames < MAX_FREEZE) {
      stepGame(state, { dir: 'none' })
      frames++
    }
    expect(state.level, 'the deferred advanceLevel eventually runs — level 2').toBe(2)
    expect(state.dotsEaten, 'the new level starts with a fresh (near-empty) dot count').toBeLessThan(DOT_COUNT)
    expect(state.phase, 'level-clear hands off to ready before the next round plays').toBe('ready')
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// #14 (lang-review typescript) — the two new EDGES are taken at the single exit
// where BOTH triggers are visible, so a same-frame death+clear resolves ONCE and
// correctly. phase.ts's own docstring fixes the precedence: a death outranks a
// level clear on the same frame (the collision resolves before the all-dots
// check). A death must therefore win, and the level-clear branch must NOT also
// fire — the classic "edge computed in one branch leaks on another path" bug.
// ───────────────────────────────────────────────────────────────────────────────
describe('pm4-7 #14: a same-frame death and level-clear resolve to dying ONLY (death wins)', () => {
  it('death takes precedence over the board clear — dying, and the level does not advance', () => {
    const state = playingGame(5)
    expect(state.lives, 'fixture sanity: lives left so the death is a dying, not a game-over').toBeGreaterThan(1)
    state.dotsEaten = DOT_COUNT // the board is also clear on this exact frame
    arrangeDeath(state)
    stepGame(state, { dir: 'none' })
    expect(state.phase, 'the death wins the frame — level-clear must not also fire').toBe('dying')
    expect(state.level, 'no advance happened: the level-clear branch is gated out once dying is entered').toBe(1)
    expect(
      state.events.some((e) => e.type === 'level-cleared'),
      'the level-cleared event must NOT fire on a frame the death claimed',
    ).toBe(false)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// GREEN GUARDS — the lives=0 -> game-over path is OUTSIDE pm4-7's scope and must
// stay exactly as pm4-6 left it (no dying freeze). These PASS today and must STAY
// green so the freeze wiring cannot smuggle a dying phase in front of game-over.
// ───────────────────────────────────────────────────────────────────────────────
describe('pm4-7 guard: the last-life death still goes straight to game-over (no dying freeze)', () => {
  it('lives=1 contact ends the game immediately — never routes through dying', () => {
    const state = playingGame(6)
    state.lives = 1
    arrangeDeath(state)
    stepGame(state, { dir: 'none' })
    expect(state.lives, 'the last life is spent').toBe(0)
    expect(state.phase, 'zero lives is game-over on the same frame, not a dying freeze').toBe('game-over')
    expect(state.events.some((e) => e.type === 'game-over'), 'the game-over event fires').toBe(true)
  })
})
