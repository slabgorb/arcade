// tests/audio.test.ts
//
// Story ml6-2 — the shell AUDIO ENGINE: maps every core event kind to one of the
// twelve CHAN sound slots and plays its ml6-1 sweep through @shared/synth. Two
// things are unit-checkable without a browser: (1) the EVENT_SOUND map is
// EXHAUSTIVE and its targets are real slots, and (2) the engine honours the
// no-throw degrade contract when WebAudio is absent (node env — the frame path
// must never throw). Audibility itself is the AC3 browser playtest.

import { describe, it, expect } from 'vitest'
import { createAudio, EVENT_SOUND, EFFECT_SLOTS, type EffectName } from '../src/shell/audio'
import { EVENT_KINDS } from '../src/core/events'
import { EFFECT_NAMES } from '../src/shell/sound-rom'

describe('ml6-2 shell/audio — engine + event→slot map', () => {
  it('EVENT_SOUND maps every EVENT_KINDS entry (exhaustive, no gaps)', () => {
    for (const kind of EVENT_KINDS) {
      expect(EVENT_SOUND[kind], `no sound mapped for "${kind}"`).toBeDefined()
    }
    expect(Object.keys(EVENT_SOUND).sort()).toEqual([...EVENT_KINDS].sort())
  })

  it('every mapped slot is a real ml6-1 CHAN effect name', () => {
    for (const slot of Object.values(EVENT_SOUND)) {
      expect(EFFECT_NAMES, `"${slot}" is not a CHAN slot`).toContain(slot)
    }
  })

  it('EFFECT_SLOTS is exactly the twelve driver slots, in order', () => {
    expect(EFFECT_SLOTS).toEqual(EFFECT_NAMES)
  })

  it('the -start/-stop pair for a voice drives the SAME slot', () => {
    expect(EVENT_SOUND['march-start']).toBe(EVENT_SOUND['march-stop'])
  })

  it('createAudio returns an engine with the full surface', () => {
    const audio = createAudio()
    for (const m of ['resume', 'play', 'startLoop', 'stopLoop', 'ready', 'tick'] as const) {
      expect(typeof audio[m]).toBe('function')
    }
  })

  it('degrades silently with no WebAudio — no method throws (frame path)', () => {
    const audio = createAudio()
    expect(() => {
      audio.resume()
      audio.tick()
      audio.play('shot')
      audio.startLoop('centipede')
      audio.stopLoop('centipede')
      audio.play('bonus-life')
    }).not.toThrow()
    expect(audio.ready()).toBe(false) // no context ⇒ never ready
  })

  it('a value typed EffectName is a real slot (compile + runtime agree)', () => {
    const slot: EffectName = 'explosion'
    expect(EFFECT_NAMES).toContain(slot)
  })
})
