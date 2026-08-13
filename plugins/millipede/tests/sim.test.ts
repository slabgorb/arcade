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
