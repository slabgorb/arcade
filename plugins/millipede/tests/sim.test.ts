// tests/sim.test.ts
//
// Story ml7-2 — stepGame, the orchestrator. This pins the CORE playable loop and,
// crucially for ml6-2, that it EMITS the right events (a green audio test proves
// nothing if the sim never produces the event). Enemies/DDT/waves are wired in
// follow-up increments; this is the player↔millipede vertical + phase dispatch.

import { describe, it, expect } from 'vitest'
import { stepGame, type GameInput } from '../src/core/sim'
import { createGame, type GameState } from '../src/core/game-state'
import { HEAD_COLOR } from '../src/core/millipede'
import { ddtVacant, ddtExploding, DDT_STAMP } from '../src/core/ddt'
import type { GameEventKind } from '../src/core/events'

const idle: GameInput = { dh: 0, dv: 0, fire: false, start: false }
const kinds = (g: GameState): GameEventKind[] => g.events.map((e) => e.type)

describe('ml7-2 stepGame — phase dispatch', () => {
  it('attract is SILENT (no events) and holds until start', () => {
    const g = createGame(0x1982)
    const after = stepGame(g, idle)
    expect(after.phase).toBe('attract')
    expect(after.events).toEqual([])
  })

  it('start in attract transitions to play', () => {
    const g = createGame(0x1982)
    const after = stepGame(g, { ...idle, start: true })
    expect(after.phase).toBe('play')
  })
})

describe('ml7-2 stepGame — play loop emits audio events', () => {
  const play = (over?: Partial<GameState>): GameState => ({
    ...createGame(0x1982, { phase: 'play' }),
    ...over,
  })

  it('firing spawns a shot and emits shot-fired', () => {
    const g = play({ shot: { active: false, h: 0, v: 0 } })
    const after = stepGame(g, { ...idle, fire: true })
    expect(after.shot.active).toBe(true)
    expect(kinds(after)).toContain('shot-fired')
  })

  it('a shot reaching a segment kills it: segment-killed + score up', () => {
    const seg = { h: 0x80, v: 0x40, dh: 1, dv: 0, pic: 0, color: HEAD_COLOR }
    const g = play({
      segments: [seg],
      shot: { active: true, h: 0x80, v: 0x40 }, // already on the segment
    })
    const after = stepGame(g, idle)
    expect(kinds(after)).toContain('segment-killed')
    expect(after.score).toBeGreaterThan(g.score)
    expect(after.shot.active).toBe(false) // shot consumed
  })

  it('a segment on the player kills the player: player-died, lives--, phase death', () => {
    const onPlayer = { h: 0x80, v: 0x08, dh: 0, dv: 0, pic: 0, color: HEAD_COLOR }
    const g = play({ segments: [onPlayer] })
    // put the player exactly under the segment
    const g2 = { ...g, player: { ...g.player, h: 0x80, v: 0x08 } }
    const after = stepGame(g2, idle)
    expect(kinds(after)).toContain('player-died')
    expect(after.lives).toBe(g2.lives - 1)
    expect(after.phase).toBe('death')
  })

  const liveSpider = (h: number, v: number) => ({
    color: 0xb9,
    pic: 0x14,
    v,
    h,
    dv: 0,
    dh: 0,
    oldDh: 0,
    count2: 0,
    pts: 0,
  })

  it('shooting an enemy emits enemy-killed and scores', () => {
    const base = play()
    const g: GameState = {
      ...base,
      segments: [],
      roster: { ...base.roster, spiders: [liveSpider(0x80, 0x40)] },
      shot: { active: true, h: 0x80, v: 0x40 },
    }
    const after = stepGame(g, idle)
    expect(kinds(after)).toContain('enemy-killed')
    expect(after.score).toBeGreaterThan(g.score)
    expect(after.shot.active).toBe(false)
  })

  it('an enemy touching the player kills the player (phase → death)', () => {
    const base = play()
    const g: GameState = {
      ...base,
      segments: [],
      roster: { ...base.roster, spiders: [liveSpider(0x80, 0x08)] },
      player: { ...base.player, h: 0x80, v: 0x08 },
    }
    const after = stepGame(g, idle)
    expect(kinds(after)).toContain('player-died')
    expect(after.phase).toBe('death')
    expect(after.lives).toBe(g.lives - 1)
  })

  it('rebuilds the event stream every frame (no accumulation)', () => {
    const g = play({ shot: { active: false, h: 0, v: 0 } })
    const fired = stepGame(g, { ...idle, fire: true })
    expect(kinds(fired)).toContain('shot-fired')
    const next = stepGame(fired, idle) // no fire this frame
    expect(kinds(next)).not.toContain('shot-fired')
  })
})

describe('ml6-2 stepGame — DDT bombs are placed, shot, and animate', () => {
  const play = (over?: Partial<GameState>): GameState => ({
    ...createGame(0x1982, { phase: 'play' }),
    ...over,
  })

  it('createGame places the four DDT bombs and stamps them into the field', () => {
    const g = createGame(0x1982)
    expect(g.ddt).toHaveLength(4)
    // The four DDTST words are all live (only word 11 of the attract set is vacant).
    expect(g.ddt.every((e) => !ddtVacant(e))).toBe(true)
    // The bombs are stamped into the field (DDT_STAMP at each entry's base cell).
    const stamped = g.ddt.filter((e) => field7(g.field, e) === DDT_STAMP)
    expect(stamped.length).toBe(4)
  })

  // Bomb 0 (DDTST 0x10CD) sits at field offset 0xCD; SHOTH=0xC7, SHOTV=0x66
  // is the hand-derived shot that lands on it (tests/shot.test.ts).
  it('a shot on a bomb detonates it: ddt-exploded, +80, entry now exploding', () => {
    const g = play({ shot: { active: true, h: 0xc7, v: 0x66 } })
    const after = stepGame(g, idle)
    expect(kinds(after)).toContain('ddt-exploded')
    expect(after.score).toBe(g.score + 80)
    expect(after.shot.active).toBe(false)
    expect(ddtExploding(after.ddt[0])).toBe(true)
  })

  it('an exploding bomb animates its cloud on FRAME & 7 == 0', () => {
    // Detonate on frame 1 (1 & 7 != 0) so the explosion machine does NOT step on
    // the detonation frame itself — isolating the animation that follows.
    let g = play({ shot: { active: true, h: 0xc7, v: 0x66 }, frame: 1 })
    g = stepGame(g, idle) // frame 1→2, bomb now exploding, not yet stepped
    expect(ddtExploding(g.ddt[0])).toBe(true)
    const hiBefore = g.ddt[0].hi
    // Step across the next FRAME&7==0 boundary (frame 8); the machine advances.
    for (let i = 0; i < 8; i++) g = stepGame(g, idle)
    expect(g.ddt[0].hi).not.toBe(hiBefore) // the cloud state stepped
  })
})

/** DDT entry's base-cell stamp (low 7 bits), for asserting the field stamp. */
function field7(field: Uint8Array, e: { lo: number; hi: number }): number {
  const offset = ((e.hi & 3) << 8) | e.lo
  return field[offset] & 0x7f
}

describe('ml6-2 stepGame — the wave loop (clear → DELAY → next wave)', () => {
  const play = (over?: Partial<GameState>): GameState => ({
    ...createGame(0x1982, { phase: 'play' }),
    ...over,
  })
  const liveBeetle = { color: 0xb9, pic: 0x34, v: 0x40, h: 0x80, dv: 0, dh: 0, timer: 0 }

  it('clearing the millipede arms the inter-wave DELAY (MILLI.MAC:1912-1915)', () => {
    // No live segments and DELAY idle → the wave is won: arm 0x40, minus this
    // frame's own tick (CHKEND runs the same frame) → 0x3F.
    const g = play({ segments: [], delay: 0 })
    const after = stepGame(g, idle)
    expect(after.delay).toBe(0x3f)
  })

  it('does NOT re-arm while a DELAY is already counting (edge-only)', () => {
    const g = play({ segments: [], delay: 0x20 })
    const after = stepGame(g, idle)
    expect(after.delay).toBe(0x1f) // just ticked down, not re-armed to 0x40
  })

  it('when DELAY reaches 0 a fresh millipede marches in and the wave advances', () => {
    const g = play({ segments: [], delay: 1, wave: 0 })
    const after = stepGame(g, idle)
    expect(after.delay).toBe(0)
    expect(after.segments.some((s) => s.color !== 0)).toBe(true) // a new train
    expect(after.wave).toBe(1)
    expect(kinds(after)).toContain('march-start') // the audible wave transition
  })

  it('holds the countdown while beetles are still present (MLSUB.MAC:56)', () => {
    const base = play({ segments: [], delay: 5 })
    const g: GameState = { ...base, roster: { ...base.roster, beetles: [liveBeetle] } }
    const after = stepGame(g, idle)
    expect(after.delay).toBe(5) // held, no decrement
  })
})
