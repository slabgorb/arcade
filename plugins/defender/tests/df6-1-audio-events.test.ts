// tests/df6-1-audio-events.test.ts
//
// Story df6-1 (AC1) — the audio EVENT SEAM's core half: core/events.ts (the
// EVENT_KINDS tuple + the GameEvent discriminated union) and the `cues` DATA channel
// the integrated sim carries on the state it returns. This suite pins the three
// properties AC1 names:
//   1. EVENT_KINDS is a runtime VALUE — the 21 gameplay moments Defender's SOUND
//      TABLE gives a cue, no duplicates — and GameEvent is DERIVED from it (every
//      kind is a payload-free one-shot `{ type }`).
//   2. The cues cross the boundary as DATA on SimState.cues, never as a callback:
//      a fresh sim carries `[]`, and each tick REBUILDS the list (a new array, empty
//      when nothing happened) rather than carrying it forward.
//   3. The event channel adds no entropy and no ordering change, so a seeded replay
//      reproduces the cue stream BIT-FOR-BIT (two same-seed runs agree, and the
//      stream is pinned by a frozen fingerprint so a silent drift reddens).
//
// core/events.ts's PURITY is enforced by tests/purity.test.ts's per-file sweep (it
// reads every src/core/*.ts), so it is not re-scanned here — that would couple this
// suite to the scanner the purity suite already owns.

import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import { EVENT_KINDS, type GameEvent, type GameEventKind } from '../src/core/events.js'
import { createSim, stepSim, type Input, type SimState } from '../src/core/sim.js'

// The 21 moments this story wires — the EXACT set, so a kind added or dropped without
// updating this list (and the SOUND TABLE claim behind it) reddens.
const EXPECTED_KINDS = [
  'laser-fire',
  'lander-hit',
  'mutant-hit',
  'baiter-hit',
  'pod-hit',
  'bomber-hit',
  'swarmer-hit',
  'lander-shoot',
  'mutant-shoot',
  'baiter-shoot',
  'swarmer-shoot',
  'lander-pickup',
  'enemy-appear',
  'smart-bomb',
  'player-death',
  'extra-man',
  'wave-start',
  'astro-catch',
  'astro-land',
  'astro-hit',
  'astro-scream',
] as const

const NEUTRAL: Input = { thrust: false, reverse: false, up: false, down: false, fire: false }
const withInput = (over: Partial<Input>): Input => ({ ...NEUTRAL, ...over })

/** Deterministic byte source (LCG) — the df3-6/df5-8 shape; no ambient entropy. */
function makeRand(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return (s >>> 16) & 0xff
  }
}

/** The cue-kind stream over a scripted run — the observable the seam produces. */
function cueStream(seed: number, ticks: number): string[] {
  let s = createSim(makeRand(seed))
  const out: string[] = []
  for (let i = 0; i < ticks; i++) {
    // A varied but SEEDED input script — thrust/fire/up so the run reaches real cues
    // (wave-start, enemy-appear, laser-fire, lander-shoot …), never ambient entropy.
    s = stepSim(s, withInput({ thrust: i % 2 === 0, fire: i % 5 === 0, up: i % 7 === 0 }))
    for (const c of s.cues) out.push(c.type)
  }
  return out
}

describe('df6-1 AC1 — EVENT_KINDS is a runtime tuple, GameEvent derives from it', () => {
  it('EVENT_KINDS is exactly the 21 SOUND-TABLE moments, no duplicates', () => {
    expect([...EVENT_KINDS].sort(), 'the wired cue set drifted from the 21 expected moments').toEqual(
      [...EXPECTED_KINDS].sort(),
    )
    expect(new Set(EVENT_KINDS).size, 'EVENT_KINDS has a duplicate kind').toBe(EVENT_KINDS.length)
  })

  it('EVENT_KINDS is a VALUE the shell can sweep (a real array at runtime, not a type)', () => {
    expect(Array.isArray(EVENT_KINDS)).toBe(true)
    // Every entry is a non-empty string discriminant.
    for (const k of EVENT_KINDS) expect(typeof k === 'string' && k.length > 0).toBe(true)
  })

  it('every kind forms a valid payload-free GameEvent — a one-shot { type }', () => {
    // Build one event per kind from the tuple; each is assignable to GameEvent, and
    // its only field is `type` (a field nothing reads would be a promise the seam
    // does not keep — the jt5-1 rule).
    for (const kind of EVENT_KINDS) {
      const event: GameEvent = { type: kind }
      expect(event.type).toBe(kind)
      expect(Object.keys(event), `${kind} carries a payload — df6-1 cues are payload-free one-shots`).toEqual(['type'])
    }
  })

  it('GameEventKind is the tuple element type (a compile-anchored round-trip)', () => {
    // A value typed as GameEventKind must accept every EVENT_KINDS entry and nothing
    // else — the derivation, exercised at runtime.
    const kinds: GameEventKind[] = [...EVENT_KINDS]
    expect(kinds.length).toBe(EVENT_KINDS.length)
  })
})

describe('df6-1 AC1 — cues are DATA on SimState, rebuilt each tick (never a callback)', () => {
  it('a fresh sim carries an empty cues array', () => {
    const fresh: SimState = createSim(makeRand(1))
    expect(Array.isArray(fresh.cues)).toBe(true)
    expect(fresh.cues.length, 'a fresh sim has emitted nothing yet').toBe(0)
  })

  it('a NEUTRAL tick past the opening rebuilds cues fresh — empty when nothing happened', () => {
    // Tick 1 spawns wave 1 (wave-start + enemy-appear), so step past it, then a quiet
    // tick with nothing colliding/firing must carry an EMPTY, freshly-built list —
    // proving the channel is rebuilt, not accumulated.
    let s = createSim(makeRand(4))
    s = stepSim(s, NEUTRAL) // opening wave
    const openingCues = s.cues
    let quiet: SimState = s
    let sawEmpty = false
    for (let i = 0; i < 30; i++) {
      quiet = stepSim(quiet, NEUTRAL)
      if (quiet.cues.length === 0) {
        sawEmpty = true
        break
      }
    }
    expect(sawEmpty, 'no quiet tick ever produced an empty cue list — the channel is not being rebuilt').toBe(true)
    expect(quiet.cues, 'the rebuilt list is a DISTINCT array from the opening tick, not the same reference').not.toBe(
      openingCues,
    )
  })

  it('the opening tick emits the wave-start and enemy-appear cues as DATA', () => {
    const s = stepSim(createSim(makeRand(2)), NEUTRAL)
    const kinds = s.cues.map((c) => c.type)
    expect(kinds, 'the first field must announce itself (ST1SND)').toContain('wave-start')
    expect(kinds, 'each spawned lander materialises with APSND').toContain('enemy-appear')
  })
})

describe('df6-1 AC1 — the cue stream replays bit-for-bit (no entropy, no ordering drift)', () => {
  it('two same-seed runs emit an IDENTICAL cue stream', () => {
    const a = cueStream(42, 200)
    const b = cueStream(42, 200)
    expect(a.length, 'a 200-tick scripted run emits cues').toBeGreaterThan(0)
    expect(a, 'same seed + same inputs must replay the cue stream identically — any drift means the channel leaked entropy or reordered').toEqual(b)
  })

  it('different seeds diverge — the stream is a function of the seed, not a constant', () => {
    // The control: without it, a stream frozen to one constant would pass the replay
    // check above vacuously.
    const a = cueStream(42, 200)
    const c = cueStream(99, 200)
    expect(a, 'two different seeds produced identical streams — the cue channel is ignoring the seed').not.toEqual(c)
  })

  it('the seed-42 stream matches its frozen fingerprint (a silent drift reddens)', () => {
    const stream = cueStream(42, 200)
    const fingerprint = createHash('sha256').update(stream.join('\n')).digest('hex').slice(0, 16)
    // Frozen from the shipped sim: if the integrated cue order/content changes, this
    // reddens and the change must be re-baselined deliberately (the df3-6 digest idiom).
    expect(fingerprint, `the seed-42 cue stream drifted from its baseline (${stream.length} cues)`).toBe(
      'cbb7f493cd8d4b40',
    )
  })
})
