// tests/game-state.test.ts
//
// Story ml7-2 — the owning GameState the stepGame orchestrator threads through
// the pure subsystems. createGame seeds a deterministic starting world; this
// pins its shape and initial invariants (a later stepGame test drives it).

import { describe, it, expect } from 'vitest'
import { createGame } from '../src/core/game-state'
import { PLYFLD_SIZE } from '../src/core/conway'
import { PLAYER_V_MIN } from '../src/core/input'

describe('ml7-2 core/game-state — createGame', () => {
  it('starts in attract with an empty event stream', () => {
    const g = createGame(0x1982)
    expect(g.phase).toBe('attract')
    expect(g.events).toEqual([])
    expect(g.frame).toBe(0)
  })

  it('seeds a full-size mushroom field with some mushrooms on it', () => {
    const g = createGame(0x1982)
    expect(g.field).toBeInstanceOf(Uint8Array)
    expect(g.field.length).toBe(PLYFLD_SIZE)
    expect(g.field.some((b) => (b & 0x7f) !== 0)).toBe(true)
  })

  it('places a live player at the bottom of its zone and no active shot', () => {
    const g = createGame(0x1982)
    expect(g.player.alive).toBe(true)
    expect(g.player.v).toBe(PLAYER_V_MIN)
    expect(g.shot.active).toBe(false)
  })

  it('spawns a marching millipede and standard lives', () => {
    const g = createGame(0x1982)
    expect(g.segments.length).toBeGreaterThan(0)
    expect(g.lives).toBe(3)
    expect(g.wave).toBe(0)
  })

  it('is deterministic for a given seed', () => {
    const a = createGame(0x1982)
    const b = createGame(0x1982)
    expect([...a.field]).toEqual([...b.field])
    expect(a.segments).toEqual(b.segments)
  })

  it('a different seed yields a different field', () => {
    const a = createGame(0x1982)
    const b = createGame(0x2001)
    expect([...a.field]).not.toEqual([...b.field])
  })
})
