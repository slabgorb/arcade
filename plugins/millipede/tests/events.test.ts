// tests/events.test.ts
//
// Story ml6-2 — the core→shell EVENT vocabulary that the sound wiring rides on.
// The pure data seam: discrete audio-relevant moments the simulation emits, each
// mapping (in shell/audio.ts) to one of the twelve CHAN sound slots
// (shell/sound-rom.ts EFFECT_NAMES). Mirrors centipede's core/events.ts.

import { describe, it, expect } from 'vitest'
import {
  EVENT_KINDS,
  event,
  isLoopStart,
  isLoopStop,
  loopVoiceOf,
  type GameEventKind,
} from '../src/core/events'

describe('ml6-2 core/events — the audio event vocabulary', () => {
  it('EVENT_KINDS is a non-empty readonly tuple of distinct kinds', () => {
    expect(Array.isArray(EVENT_KINDS)).toBe(true)
    expect(EVENT_KINDS.length).toBeGreaterThan(0)
    expect(new Set(EVENT_KINDS).size).toBe(EVENT_KINDS.length)
  })

  it('covers the discrete one-shot moments the game scores on', () => {
    for (const kind of [
      'shot-fired',
      'segment-killed',
      'enemy-killed',
      'ddt-exploded',
      'player-died',
      'bonus-life',
    ] as const) {
      expect(EVENT_KINDS).toContain(kind)
    }
  })

  it('models the sustained march voice as a balanced start/stop pair', () => {
    expect(EVENT_KINDS).toContain('march-start')
    expect(EVENT_KINDS).toContain('march-stop')
    const starts = EVENT_KINDS.filter((k) => k.endsWith('-start'))
    const stops = EVENT_KINDS.filter((k) => k.endsWith('-stop'))
    expect(starts.length).toBe(stops.length)
    // every -start has a matching -stop on the same voice, and vice-versa
    for (const s of starts) expect(EVENT_KINDS).toContain(s.replace(/-start$/, '-stop'))
    for (const s of stops) expect(EVENT_KINDS).toContain(s.replace(/-stop$/, '-start'))
  })

  it('event(kind) builds a payload-free tagged record', () => {
    const e = event('shot-fired')
    expect(e).toEqual({ type: 'shot-fired' })
  })

  it('isLoopStart / isLoopStop / loopVoiceOf classify the suffix pairs', () => {
    expect(isLoopStart('march-start')).toBe(true)
    expect(isLoopStart('march-stop')).toBe(false)
    expect(isLoopStart('shot-fired')).toBe(false)
    expect(isLoopStop('march-stop')).toBe(true)
    expect(isLoopStop('march-start')).toBe(false)
    expect(loopVoiceOf('march-start')).toBe('march')
    expect(loopVoiceOf('march-stop')).toBe('march')
    expect(loopVoiceOf('shot-fired')).toBe(null)
  })

  it('GameEventKind is exactly the tuple members (compile + runtime agree)', () => {
    // A value typed as GameEventKind must be a member of the runtime tuple.
    const k: GameEventKind = 'bonus-life'
    expect(EVENT_KINDS).toContain(k)
  })
})
