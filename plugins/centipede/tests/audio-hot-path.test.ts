// tests/audio-hot-path.test.ts
//
// Story cp5-2 — RED phase (Leeloo / TEA). AC3, at the level the AC's own
// rationale names: "because an uncaught throw inside requestAnimationFrame
// freezes the game."
//
// ─── WHY THIS IS NOT COVERED BY THE UNIT TEST ────────────────────────────────
// tests/audio-dispatch.test.ts pins the dispatch's behaviour in isolation:
// given an unmapped kind, does `playEventSounds` throw or degrade? That is the
// decision. THIS file pins its consequence, which is the thing the story is
// actually about — whether the game keeps running. They can come apart: a
// dispatch that degrades but leaves the frame half-drawn, or a main.ts that
// wraps the call so tightly it swallows the frame's remaining work, both satisfy
// the unit test and fail here.
//
// ─── THE USER RULING THIS FILE ENCODES ───────────────────────────────────────
// AC3 is an either/or, and it was ruled at setup (2026-08-01): **DEGRADE**. Not
// on taste — on precedent. The default arm of every one of the five games that
// walked this path first is a bare `const _exhaustive: never = event` with NO
// throw (tempest:111-118, asteroids:33-37, battlezone:74-80, red-baron:68-74,
// joust:70-78), and joust's comment states the reasoning in the ROM's own terms:
// "At runtime the branch stays SILENT — a stale or typo'd kind falling through
// onto some other cue would be audibly wrong, which is worse than quiet."
// centipede is the outlier in throwing, not in degrading.
//
// The compile-time guarantee is NOT what is being given up. It never lived in
// the throw: `EVENT_SOUND: Record<GameEventKind, SoundName>` (shell/audio.ts:113)
// makes a kind added without a cue a COMPILE error at the declaration, which
// cp5-1 established by mutation (TS2741 on the object literal) after discovering
// the runtime check it had credited was carrying nothing. Dropping the throw
// costs a check the type system already makes; keeping it costs the frame loop.

import { describe, it, expect, beforeAll, vi } from 'vitest'
import { installShellDom, ONE_STEP_MS } from './helpers/boot-shell'
import type { GameEvent } from '../src/core/events'

const POISON = 'cp5-2-unmapped-kind-probe'

const rec = vi.hoisted(() => ({
  /** Flipped on once the poisoned event has been injected into a step. */
  injected: false,
  /** Steps completed after the injection — proves the sim kept running. */
  stepsAfter: 0,
  /** Set when the harness wants the next event-bearing step poisoned. */
  arm: false,
  /**
   * Flipped on when the poisoned kind actually reached `playEventSounds`.
   *
   * WITHOUT THIS THE WHOLE FILE IS VACUOUS, and it was: on the unwired tree
   * main.ts never calls the dispatch, so the poison sails through a loop that
   * never looks at it, nothing throws, and every assertion below passes while
   * proving nothing at all. (Measured — this file went GREEN on its first run,
   * alone among the three cp5-2 suites.) The claim is not "a frame carrying an
   * unmapped kind is survivable" but "a frame whose cues were DISPATCHED while
   * carrying an unmapped kind is survivable", and only the tap can tell them
   * apart.
   */
  poisonDispatched: false,
}))

// The tap. Delegates to the real dispatch — this file is testing the real one's
// behaviour on the hot path, not replacing it.
vi.mock('../src/shell/audio-dispatch', async (importOriginal) => {
  const real = await importOriginal<typeof import('../src/shell/audio-dispatch')>()
  return {
    ...real,
    playEventSounds: (audio: never, events: readonly GameEvent[]): void => {
      if (events.some((e) => String(e.type) === POISON)) rec.poisonDispatched = true
      real.playEventSounds(audio, events)
    },
  }
})

// Inject an unmapped kind into a live frame's event stream. This models the
// exact failure the story names: a kind reaches `core/events.ts` (or a stale
// build, or a hand-rolled event) without a manifest entry, and the shell meets
// it for the first time inside the rAF callback.
vi.mock('../src/core/sim', async (importOriginal) => {
  const real = await importOriginal<typeof import('../src/core/sim')>()
  return {
    ...real,
    stepSim: (state: never, input: never): unknown => {
      const next = real.stepSim(state, input)
      if (rec.injected) rec.stepsAfter += 1
      if (rec.arm && !rec.injected && next.events.length > 0) {
        rec.injected = true
        return { ...next, events: [...next.events, { type: POISON } as unknown as GameEvent] }
      }
      return next
    },
  }
})

const shell = installShellDom()

const outcome = {
  threwOnPoisonedFrame: null as Error | null,
  stillScheduledAfter: false,
  framesRunAfter: 0,
}

beforeAll(async () => {
  await import('../src/main')

  let t = 0
  const step = (): void => {
    t += ONE_STEP_MS
    shell.frame(t)
  }
  step()

  shell.emit('keydown', { key: 'Enter' })
  for (let i = 0; i < 10; i++) step()
  shell.emit('keyup', { key: 'Enter' })
  shell.emit('keydown', { key: ' ' })

  // Play until a step emits something, then poison that step.
  rec.arm = true
  for (let i = 0; i < 400 && !rec.injected; i++) {
    try {
      step()
    } catch (e) {
      outcome.threwOnPoisonedFrame = e as Error
      break
    }
  }

  // Did the loop survive? A frame that threw never reached its trailing
  // `requestAnimationFrame(frame)`, so nothing is scheduled and the game is
  // frozen on screen — the exact symptom the story predicts.
  outcome.stillScheduledAfter = shell.scheduled()
  if (outcome.stillScheduledAfter) {
    for (let i = 0; i < 30; i++) {
      try {
        step()
        outcome.framesRunAfter += 1
      } catch {
        break
      }
    }
  }
})

describe('cp5-2 AC3 — an unmapped kind must not freeze the frame loop', () => {
  it('the probe actually reached a live frame — the harness is not testing nothing', () => {
    // Every assertion below is about what happened to the poisoned frame. If the
    // injection never fired, they would all pass by describing an event that did
    // not occur.
    expect(
      rec.injected,
      'no step ever emitted an event, so the unmapped kind was never injected and this ' +
        'file proves nothing',
    ).toBe(true)
  })

  it('and the unmapped kind actually reached the dispatch — the non-vacuity guard', () => {
    // THE ASSERTION THAT MAKES THE REST OF THIS FILE MEAN ANYTHING. See the
    // comment on `rec.poisonDispatched`: without a wired main.ts the poisoned
    // frame is never dispatched, so "it did not throw" is a statement about a
    // code path that never ran. This reds today and keeps every assertion below
    // honest afterwards.
    expect(
      rec.poisonDispatched,
      'the poisoned frame never reached playEventSounds — main.ts does not call the ' +
        'dispatch, so nothing below is exercising the hot path it claims to test',
    ).toBe(true)
  })

  it('the frame carrying it does not throw out of the rAF callback', () => {
    expect(
      outcome.threwOnPoisonedFrame,
      'the unmapped kind threw out of the frame callback. In the browser this exception ' +
        'escapes into requestAnimationFrame, the trailing requestAnimationFrame(frame) at ' +
        'main.ts:183 never runs, and the game freezes on the last drawn frame. Per the AC3 ' +
        'ruling the dispatch must DEGRADE — skip the cue it cannot name and keep going',
    ).toBeNull()
  })

  it('the loop is still scheduled afterwards', () => {
    expect(
      outcome.stillScheduledAfter,
      'no frame was scheduled after the poisoned one — the rAF chain is broken and the ' +
        'cabinet is frozen',
    ).toBe(true)
  })

  it('the game keeps stepping afterwards — it degraded, it did not limp', () => {
    // Distinguishes "survived" from "survived but stopped simulating". A main.ts
    // that caught the throw around the whole step/render body would keep the
    // chain alive while quietly freezing the world.
    expect(
      outcome.framesRunAfter,
      'the loop was scheduled but no further frame completed',
    ).toBeGreaterThan(0)
    expect(
      rec.stepsAfter,
      'the sim ran no further steps after the unmapped kind — the frame loop survived but ' +
        'the game did not',
    ).toBeGreaterThan(0)
  })
})
