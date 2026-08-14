// tests/audio-dispatch.test.ts
//
// Story ml6-2 — the core→shell audio ROUTER (shell/audio-dispatch.ts), the SH4-5
// standalone-dispatch convention: a pure function that turns a frame's event list
// into engine calls, narrowing the engine to a Pick slice, one effect per kind,
// degrading (never throwing) on the frame path. Tested with a recording fake.

import { describe, it, expect } from 'vitest'
import { playEventSounds } from '../src/shell/audio-dispatch'
import { EVENT_SOUND, type EffectName } from '../src/shell/audio'
import { EVENT_KINDS, event } from '../src/core/events'

type Call = { fn: 'play' | 'startLoop' | 'stopLoop' | 'tick'; name?: EffectName }

function recorder() {
  const calls: Call[] = []
  const surface = {
    tick: () => calls.push({ fn: 'tick' }),
    play: (name: EffectName) => calls.push({ fn: 'play', name }),
    startLoop: (name: EffectName) => calls.push({ fn: 'startLoop', name }),
    stopLoop: (name: EffectName) => calls.push({ fn: 'stopLoop', name }),
  }
  return { calls, surface }
}

describe('ml6-2 audio-dispatch — event list → engine calls', () => {
  it('ticks once, first, before any cue', () => {
    const { calls, surface } = recorder()
    playEventSounds(surface, [event('shot-fired')])
    expect(calls[0]).toEqual({ fn: 'tick' })
    expect(calls.filter((c) => c.fn === 'tick').length).toBe(1)
  })

  it('routes a one-shot to play() on its mapped slot', () => {
    const { calls, surface } = recorder()
    playEventSounds(surface, [event('shot-fired'), event('player-died')])
    expect(calls).toContainEqual({ fn: 'play', name: 'shot' })
    expect(calls).toContainEqual({ fn: 'play', name: 'player-explosion' })
  })

  it('routes -start to startLoop and -stop to stopLoop on the same slot', () => {
    const { calls, surface } = recorder()
    playEventSounds(surface, [event('march-start')])
    expect(calls).toContainEqual({ fn: 'startLoop', name: 'centipede' })
    const r2 = recorder()
    playEventSounds(r2.surface, [event('march-stop')])
    expect(r2.calls).toContainEqual({ fn: 'stopLoop', name: 'centipede' })
  })

  it('every EVENT_KINDS entry produces exactly one cue call (no gaps/dupes)', () => {
    for (const kind of EVENT_KINDS) {
      const { calls, surface } = recorder()
      playEventSounds(surface, [event(kind)])
      const cues = calls.filter((c) => c.fn !== 'tick')
      expect(cues.length, `"${kind}" produced ${cues.length} cues`).toBe(1)
      expect(cues[0].name).toBe(EVENT_SOUND[kind])
    }
  })

  it('degrades on the frame path — no throw on an empty list', () => {
    const { surface } = recorder()
    expect(() => playEventSounds(surface, [])).not.toThrow()
  })
})
