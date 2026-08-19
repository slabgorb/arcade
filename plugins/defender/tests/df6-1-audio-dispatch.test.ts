// tests/df6-1-audio-dispatch.test.ts
//
// Story df6-1 (AC3) — the event -> cue wiring in shell/audio-dispatch.ts, tested
// against a RECORDING fake (no canvas, no AudioContext). This suite pins:
//   1. EVERY EVENT_KINDS discriminant maps to a cue — playEventSounds plays exactly
//      one sound per event, and the mapped name is a real SoundName (a key of SOUNDS).
//   2. The order is preserved and nothing is de-duplicated (two of a kind → two plays).
//   3. An empty event list plays nothing.
//   4. It DEGRADES: a stale/typo'd kind (cast past the compile guard) plays nothing
//      and does not throw — the frame-path rule (a wrong sound is worse than none).
//
// The exhaustiveness `never` guard itself — that a kind added to core/events.ts
// without a case here is a COMPILE error — is pinned mechanically fleet-wide by
// tests/audio-dispatch-convention.test.mjs (AC-3), so it is not re-derived here.

import { describe, it, expect } from 'vitest'
import { EVENT_KINDS, type GameEvent } from '../src/core/events.js'
import { playEventSounds } from '../src/shell/audio-dispatch.js'
import { SOUNDS, type SoundName, type AudioEngine } from '../src/shell/audio.js'

/** A recording fake: the slice playEventSounds needs, capturing what it plays. */
function recorder(): { engine: Pick<AudioEngine, 'play'>; played: SoundName[] } {
  const played: SoundName[] = []
  return { engine: { play: (name: SoundName) => void played.push(name) }, played }
}

const oneOf = (kind: GameEvent['type']): GameEvent => ({ type: kind })

describe('df6-1 AC3 — every kind maps to exactly one real cue', () => {
  it('each EVENT_KINDS discriminant plays one sound, and the name is a real SoundName', () => {
    for (const kind of EVENT_KINDS) {
      const { engine, played } = recorder()
      playEventSounds(engine, [oneOf(kind)])
      expect(played.length, `${kind} did not map to exactly one cue`).toBe(1)
      expect(SOUNDS[played[0]], `${kind} mapped to ${played[0]}, which is not a SOUNDS key`).toBeDefined()
    }
  })

  it('the 21 kinds map to 21 DISTINCT cues (no two moments collapse onto one sound)', () => {
    const { engine, played } = recorder()
    playEventSounds(engine, EVENT_KINDS.map(oneOf))
    expect(played.length).toBe(EVENT_KINDS.length)
    expect(new Set(played).size, 'two kinds mapped to the same cue name').toBe(EVENT_KINDS.length)
  })
})

describe('df6-1 AC3 — order preserved, nothing de-duplicated, empty is silent', () => {
  it('plays one cue per event, in the order given', () => {
    const { engine, played } = recorder()
    const script: GameEvent[] = [oneOf('laser-fire'), oneOf('lander-hit'), oneOf('smart-bomb')]
    playEventSounds(engine, script)
    expect(played).toEqual(['laserFire', 'landerHit', 'smartBomb'])
  })

  it('does NOT de-duplicate — two landers dying on one tick play twice', () => {
    const { engine, played } = recorder()
    playEventSounds(engine, [oneOf('lander-hit'), oneOf('lander-hit')])
    expect(played, 'the dispatch collapsed two simultaneous cues into one').toEqual(['landerHit', 'landerHit'])
  })

  it('an empty event list plays nothing', () => {
    const { engine, played } = recorder()
    playEventSounds(engine, [])
    expect(played).toEqual([])
  })
})

describe('df6-1 AC3 — degrades on the frame path (a wrong kind is silent, never a throw)', () => {
  it('an unknown/stale kind (cast past the compile guard) plays nothing and does not throw', () => {
    const { engine, played } = recorder()
    // Simulate a stale kind reaching the runtime — the `never` default returns null,
    // so this is a silent no-op rather than a wrong sound or a frame-freezing throw.
    const bogus = { type: 'terrain-blow' } as unknown as GameEvent
    expect(() => playEventSounds(engine, [bogus])).not.toThrow()
    expect(played, 'an unknown kind must be dropped, not routed onto some other cue').toEqual([])
  })

  it('drops the unknown kind but still plays the valid ones around it', () => {
    const { engine, played } = recorder()
    const bogus = { type: 'coin' } as unknown as GameEvent
    playEventSounds(engine, [oneOf('laser-fire'), bogus, oneOf('player-death')])
    expect(played).toEqual(['laserFire', 'playerDeath'])
  })
})
