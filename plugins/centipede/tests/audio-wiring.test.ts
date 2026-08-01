// tests/audio-wiring.test.ts
//
// Story cp5-2 — RED phase (Leeloo / TEA). AC1 and AC2: main.ts actually calls
// the seam cp5-1 built, once per STEPPED frame, and a fake engine injected at
// that seam records real cues for ordinary played frames.
//
// ─── AC2 FORBIDS THE IDIOM THIS REPO WOULD OTHERWISE REACH FOR ───────────────
// "A test proves the wiring is LIVE, not merely present: a fake engine injected
// at the seam records a cue for an ordinary played frame. A grep for the import
// is not the test."
//
// centipede has never had a behavioural pin on main.ts — tests/main-loop.test.ts
// and tests/highscore-entry.test.ts both read `../src/main.ts?raw` and match
// source text. Those tests cannot tell a call from a mention: `playEventSounds`
// appearing anywhere in the file, including inside a string or a disabled block,
// satisfies them. So this file BOOTS main.ts instead (helpers/boot-shell.ts) and
// observes what it does.
//
// ─── WHAT IS AND IS NOT FAKED ────────────────────────────────────────────────
// The core sim, the atlas, the renderer, the timebase and the input adapters are
// all REAL. Three seams are wrapped, and every wrapper DELEGATES to the genuine
// implementation rather than replacing it:
//   • shell/audio      — `createAudio` returns a recording engine (AC2's fake).
//   • shell/audio-dispatch — `playEventSounds` records its arguments, then calls
//     the real dispatch, so the recording engine sees real cues.
//   • core/sim         — `stepSim` records the events each step produced.
// Wrapping rather than replacing is what makes the AC1 comparison meaningful:
// both sides of it are the production code's own values.
//
// EVERY ASSERTION HERE IS RED TODAY, and for one reason: main.ts contains no
// reference to `createAudio` or `playEventSounds` at all (0 occurrences, all 185
// lines). The mock factories are lazy, so while nothing imports them the
// recorders simply stay empty. That makes vacuity the hazard to design against —
// "every dispatched array is correct" is TRUE of no arrays at all. Each
// universally-quantified assertion below is therefore paired, in the same test,
// with a positive existence assertion that cannot pass on an empty recording.

import { describe, it, expect, beforeAll, vi } from 'vitest'
import { installShellDom, BURST_MS, ONE_STEP_MS } from './helpers/boot-shell'
import type { GameEvent } from '../src/core/events'
// SOUNDS is read from the REAL module (the mock below spreads `...real`, so the
// manifest is the genuine one) rather than re-listed here — a hand-kept copy of
// a name list agrees with itself forever while the manifest drifts underneath.
import { SOUNDS, type SoundName } from '../src/shell/audio'

// ─── recorders ───────────────────────────────────────────────────────────────
// `vi.mock` factories are hoisted above every import, so the arrays they close
// over must be hoisted too — a plain module-scope `const` is in the temporal
// dead zone when the factory runs.
const rec = vi.hoisted(() => ({
  /** One entry per `createAudio()` call — AC1 says main.ts constructs the engine. */
  engines: [] as unknown[],
  /** The events array handed to each `playEventSounds` call, in call order. */
  dispatched: [] as GameEvent[][],
  /** The engine object each call was given — proves it is the one main.ts built. */
  dispatchedTo: [] as unknown[],
  /** The events each `stepSim` produced, in step order. */
  stepped: [] as GameEvent[][],
  /** Every cue that reached the engine: `play`/`startLoop`/`stopLoop` + name. */
  cues: [] as { method: string; name: string }[],
}))

vi.mock('../src/shell/audio', async (importOriginal) => {
  const real = await importOriginal<typeof import('../src/shell/audio')>()
  return {
    ...real,
    createAudio: (): unknown => {
      const engine = {
        resume: (): void => {},
        play: (name: SoundName): void => {
          rec.cues.push({ method: 'play', name })
        },
        startLoop: (name: SoundName): void => {
          rec.cues.push({ method: 'startLoop', name })
        },
        stopLoop: (name: SoundName): void => {
          rec.cues.push({ method: 'stopLoop', name })
        },
        ready: (): boolean => false,
      }
      rec.engines.push(engine)
      return engine
    },
  }
})

vi.mock('../src/shell/audio-dispatch', async (importOriginal) => {
  const real = await importOriginal<typeof import('../src/shell/audio-dispatch')>()
  return {
    ...real,
    playEventSounds: (audio: never, events: readonly GameEvent[]): void => {
      rec.dispatchedTo.push(audio)
      rec.dispatched.push([...events])
      real.playEventSounds(audio, events)
    },
  }
})

vi.mock('../src/core/sim', async (importOriginal) => {
  const real = await importOriginal<typeof import('../src/core/sim')>()
  return {
    ...real,
    stepSim: (state: never, input: never): unknown => {
      const next = real.stepSim(state, input)
      rec.stepped.push([...next.events])
      return next
    },
  }
})

const shell = installShellDom()

/** Non-empty event arrays only — an empty frame is a no-op on both sides. */
const nonEmpty = (arrays: readonly GameEvent[][]): GameEvent[][] =>
  arrays.filter((a) => a.length > 0)

beforeAll(async () => {
  await import('../src/main')

  let t = 0
  const run = (frames: number, ms: number): void => {
    for (let i = 0; i < frames; i++) {
      t += ms
      shell.frame(t)
    }
  }

  run(1, 0) // the baseline frame — main.ts only stamps `last`, no sub-steps

  // START1: leave attract for a live game. The core keeps attract silent by
  // design (core/events.ts:23-26 — stepAttractDemo clears the stream), so no
  // cue can be observed until this lands.
  shell.emit('keydown', { key: 'Enter' })
  run(10, ONE_STEP_MS)
  shell.emit('keyup', { key: 'Enter' })

  // Hold the gun down and play. BURST_MS frames run a catch-up burst of sim
  // steps each (measured: 14), which is both the fast way to accumulate a long
  // run and the exact shape that separates a per-STEP call from a per-rAF one.
  shell.emit('keydown', { key: ' ' })
  run(1500, BURST_MS)
})

// ═════════════════════════════════════════════════════════════════════════════
// AC1 — main.ts constructs the engine and drives the dispatch per stepped frame
// ═════════════════════════════════════════════════════════════════════════════

describe('cp5-2 AC1 — main.ts constructs the engine via createAudio()', () => {
  it('calls createAudio exactly once, at boot', () => {
    // Once: the engine owns an AudioContext and a channel map. Building a second
    // one per frame would leak contexts and give every cue a fresh, empty
    // channel map, so voice-stealing (the whole point of CHANNELS) would stop
    // working — silently, since the shared engine never throws.
    expect(
      rec.engines.length,
      'main.ts must build the audio engine with createAudio() — it currently references neither ' +
        'createAudio nor playEventSounds (0 occurrences in all 185 lines)',
    ).toBe(1)
  })
})

describe('cp5-2 AC1 — the dispatch runs once per STEPPED frame, not once per rAF frame', () => {
  it('every stepped frame that emitted events handed that whole array to the dispatch', () => {
    // THE CLAIM, and why it is shaped as an array-of-arrays rather than a count.
    //
    // `SimState.events` is REBUILT every step (core/events.ts:12-21) and main.ts
    // keeps only the newest state, so a call sited once per rAF frame — outside
    // the pumpFrame callback — can only ever see the LAST step's events. On an
    // ordinary 60 Hz frame that is invisible: one step per frame, so per-step and
    // per-frame agree exactly. It only separates during a CATCH-UP burst, where
    // one rAF frame runs up to 14 steps and 13 frames' worth of cues would be
    // dropped in silence. That is why the run above is driven in bursts.
    //
    // Comparing the ARRAYS, not their concatenation, also excludes AC1's other
    // named error ("not per event"): a loop calling the dispatch once per event
    // would produce singletons where the core produced a pair.
    const emitted = nonEmpty(rec.stepped)
    const seen = nonEmpty(rec.dispatched)

    // Non-vacuity FIRST: with no wiring at all `seen` is [], and "every array
    // matches" is trivially true of nothing.
    expect(
      emitted.length,
      'the run produced no events at all — the harness is not reaching live play, ' +
        'so this test could not fail even once main.ts is wired',
    ).toBeGreaterThan(0)
    expect(
      seen.length,
      'the dispatch was never called — main.ts does not call playEventSounds yet',
    ).toBeGreaterThan(0)

    expect(
      seen,
      'the cues the shell dispatched do not match, array for array, the events the core ' +
        'emitted per step — a per-rAF-frame call drops every step but the last of a burst',
    ).toEqual(emitted)
  })

  it('at least one step emitted TWO events, so "not per event" is actually discriminated', () => {
    // Guards the test above from passing for the wrong reason. If every array in
    // the comparison were a singleton, a per-EVENT dispatch would satisfy it
    // exactly as a per-STEP one does, and AC1's "not per event" would be
    // untested. Measured over 20,000 steps: 6 of 212 event-bearing steps carry
    // two (a death frame concatenates, sim.ts:693; so does a wave clear, :723).
    const emitted = nonEmpty(rec.stepped)
    expect(
      emitted.some((a) => a.length >= 2),
      'no step in this run emitted more than one event, so the per-step vs per-event ' +
        'distinction is not exercised — lengthen the run',
    ).toBe(true)
  })

  it('hands the dispatch the SAME engine main.ts constructed', () => {
    // Cheap, and it closes a real hole: a main.ts that built the engine and then
    // dispatched into a different object (a stale local, a second createAudio())
    // would satisfy every count assertion above while making no sound.
    expect(rec.dispatchedTo.length, 'the dispatch was never called').toBeGreaterThan(0)
    const engine = rec.engines[0]
    expect(
      rec.dispatchedTo.every((a) => a === engine),
      'the dispatch was handed an object that is not the engine createAudio() returned',
    ).toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC2 — the wiring is LIVE: a fake engine records cues for ordinary play
// ═════════════════════════════════════════════════════════════════════════════

describe('cp5-2 AC2 — a fake engine at the seam records cues for an ordinary played frame', () => {
  it('records at least one cue', () => {
    expect(
      rec.cues.length,
      'no cue reached the engine during ordinary play — the seam is not wired into main.ts',
    ).toBeGreaterThan(0)
  })

  it('plays the gun cue when the player actually shoots', () => {
    // The most ordinary moment the game has, and it is reached here by HOLDING
    // THE SPACE BAR through the real keyboard adapter into the real sim — not by
    // handing the dispatch a fabricated `shot-fired`. That is the difference AC2
    // is drawing when it says "an ordinary played frame".
    expect(
      rec.cues.some((c) => c.method === 'play' && c.name === 'fire'),
      "the 'fire' cue never played, though the run holds the gun down through live play",
    ).toBe(true)
  })

  it('drives a sustained voice as a start/stop PAIR, not repeated one-shots', () => {
    // The spider comes and goes during an ordinary run (measured), and its cue is
    // a loop: `spider-start` opens it and `spider-stop` closes it, both naming
    // `spiderLoop` (shell/audio.ts:127-128). Seeing the pair through the boot
    // path proves the loop edges survive the wiring — a shell that dropped the
    // stop edge would leave the spider audible for the rest of the game.
    const loops = rec.cues.filter((c) => c.name === 'spiderLoop')
    expect(
      loops.some((c) => c.method === 'startLoop'),
      'no spider loop was ever started during the run',
    ).toBe(true)
    expect(
      loops.some((c) => c.method === 'stopLoop'),
      'the spider loop was started but never stopped — the voice would ring forever',
    ).toBe(true)
    expect(
      loops.every((c) => c.method !== 'play'),
      'a sustained voice was triggered as a one-shot play() instead of a loop',
    ).toBe(true)
  })

  it('every cue it recorded names a real entry in the manifest', () => {
    // A cue naming something SOUNDS does not carry resolves to no file, and the
    // shared engine swallows that in silence — the epic's standing hazard. This
    // is the sweep that would catch a hand-written cue name in main.ts.
    expect(rec.cues.length, 'no cues recorded').toBeGreaterThan(0)
    const manifest = new Set<string>(Object.keys(SOUNDS))
    const strays = rec.cues.filter((c) => !manifest.has(c.name)).map((c) => c.name)
    expect(strays, 'these cue names are not in the SOUNDS manifest').toEqual([])
  })
})
