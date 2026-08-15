// tests/death-respawn.test.ts
//
// Player death must RESET THE SCREEN before the next life, or the creature that
// killed the gun — frozen in place through the explosion hold — is still on top
// of the respawned gun and kills it again the instant play resumes, burning all
// three lives in consecutive frames straight to game-over.
//
// GROUND TRUTH: the ROM's CHKEND death branch (MLSUB.MAC:157-234) runs INIT1
// ("INITIALIZE PLAYER" — gun + shot back to spawn) then JMP CENTPC ("GET NEW
// CENTIPEDE" — re-lay the millipede from the entry row). The sibling centipede
// mirrors this: stepDeathFrame respawn re-creates the player, re-lays the
// centipede (CENTPC) and re-parks the spider/flea (BUGOFF/ANTPC). Millipede's
// stepDeath did neither — it only held and flipped `alive`.

import { describe, it, expect } from 'vitest'
import { createGame, type GameState } from '../src/core/game-state'
import { stepGame, type GameInput } from '../src/core/sim'
import { HEAD_PIC, HEAD_COLOR, checkPlayerCollision, VACANT_COLOR, NCENT } from '../src/core/millipede'
import { createPlayer } from '../src/core/input'

const NO_INPUT: GameInput = { dh: 0, dv: 0, fire: false, start: false }

const liveCount = (g: GameState): number => g.segments.filter((s) => s.color !== VACANT_COLOR).length

/** A play game whose ONLY millipede segment sits exactly on the gun — so the
 *  very first frame is a fatal collision, and a screen that never resets keeps
 *  that segment on the gun for every subsequent life. */
function gameWithSegmentOnGun(): GameState {
  const g = createGame(0x1982, { phase: 'play' })
  return {
    ...g,
    segments: [{ h: g.player.h, v: g.player.v, dh: 0, dv: 0, pic: HEAD_PIC, color: HEAD_COLOR }],
  }
}

/** Step until the phase leaves 'death' (respawn) or a frame budget runs out. */
function stepThroughDeathHold(state: GameState, budget = 400): GameState {
  let g = state
  for (let i = 0; i < budget && g.phase === 'death'; i++) g = stepGame(g, NO_INPUT)
  return g
}

describe('death respawn resets the screen (does not instantly re-kill)', () => {
  it('a fatal first frame drops one life and enters the death hold', () => {
    const g = stepGame(gameWithSegmentOnGun(), NO_INPUT)
    expect(g.phase).toBe('death')
    expect(g.lives).toBe(2) // 3 -> 2, exactly one life spent
  })

  it('respawns the gun at its spawn cell — INIT1, not wherever it died', () => {
    const dead = stepGame(gameWithSegmentOnGun(), NO_INPUT)
    const respawned = stepThroughDeathHold(dead)
    expect(respawned.phase).toBe('play')
    const spawn = createPlayer()
    expect([respawned.player.h, respawned.player.v]).toEqual([spawn.h, spawn.v])
    expect(respawned.player.alive).toBe(true)
  })

  it('re-lays the millipede clear of the gun — no live segment is on the gun at respawn', () => {
    const dead = stepGame(gameWithSegmentOnGun(), NO_INPUT)
    const respawned = stepThroughDeathHold(dead)
    const onGun = respawned.segments.some(
      (s) => s.color !== VACANT_COLOR && checkPlayerCollision(s, respawned.player),
    )
    expect(onGun, 'a live segment is still sitting on the respawned gun — the screen never reset').toBe(false)
  })

  it('does NOT burn every life in consecutive frames — the core regression', () => {
    // Die once, respawn, keep playing: lives must HOLD at 2, never cascade to
    // game-over as it did when the killer stayed frozen on the gun.
    let g = stepGame(gameWithSegmentOnGun(), NO_INPUT)
    g = stepThroughDeathHold(g)
    for (let i = 0; i < 30; i++) g = stepGame(g, NO_INPUT)
    expect(g.lives).toBe(2)
    expect(g.phase).not.toBe('game-over')
  })
})

// The ROM's CENTPC preserves CENTIN — the connected millipede length — across a
// death (MILLI.MAC:498-549: DEAD≠0 + CENTIS<3 skips the DEC, then `LDY X,CENTIN`
// re-lays from the preserved register). Splits are deferred here (ml3-2), so the
// train is always flat-connected and CENTIN == the live segment count; the death
// re-lay must reproduce that length, not reset to a full NCENT train.
describe('CENTIN register — the connected length, preserved across a death', () => {
  /** A play state whose lead segment sits on the gun (fatal), train length `n`. */
  function playWithTrainOnGun(n: number): GameState {
    const g = createGame(0x1982, { phase: 'play' })
    const seg = (h: number, v: number) => ({ h, v, dh: 0, dv: 0, pic: HEAD_PIC, color: HEAD_COLOR })
    const segments = Array.from({ length: n }, (_, i) =>
      i === 0 ? seg(g.player.h, g.player.v) : seg(0x40 + i * 8, 0x60),
    )
    return { ...g, centin: n, segments }
  }

  it('a fresh wave train reports the full connected length NCENT', () => {
    const g = createGame(0x1982, { phase: 'play' })
    expect(g.centin).toBe(NCENT)
    expect(liveCount(g)).toBe(NCENT)
  })

  it('the register follows the connected length as segments are removed', () => {
    let g = createGame(0x1982, { phase: 'play' })
    g = { ...g, segments: g.segments.slice(0, 4) } // whittled to four
    g = stepGame(g, NO_INPUT)
    expect(g.centin).toBe(4)
  })

  it('death re-lays a train of the PRESERVED length, not a fresh full train', () => {
    let g = stepGame(playWithTrainOnGun(3), NO_INPUT) // die with three segments
    expect(g.phase).toBe('death')
    expect(g.centin).toBe(3)
    g = stepThroughDeathHold(g)
    expect(g.phase).toBe('play')
    expect(g.centin, 'CENTIN survives the death hold').toBe(3)
    expect(liveCount(g), 're-laid at the preserved length, not NCENT').toBe(3)
  })

  it('dying with a full millipede re-lays a full train', () => {
    let g = stepGame(playWithTrainOnGun(NCENT), NO_INPUT)
    g = stepThroughDeathHold(g)
    expect(g.centin).toBe(NCENT)
    expect(liveCount(g)).toBe(NCENT)
  })
})
