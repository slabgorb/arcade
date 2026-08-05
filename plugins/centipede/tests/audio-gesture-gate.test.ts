// tests/audio-gesture-gate.test.ts
//
// Story cp5-2 — RED phase (Leeloo / TEA). AC4: "The gesture gate is respected:
// no AudioContext is constructed before the player's first interaction, and
// events that land before it are dropped without error."
//
// ─── THIS FILE DELIBERATELY DOES NOT MOCK THE AUDIO MODULE ───────────────────
// tests/audio-wiring.test.ts replaces `createAudio` with a recording fake, which
// is right for AC1/AC2 and useless here: a fake engine never builds an
// AudioContext, so the gate would look respected no matter what main.ts did.
// This file boots the REAL `createAudio` against a counting `AudioContext` on
// globalThis (helpers/boot-shell.ts installs it — the shared engine resolves its
// constructor as `globalThis.AudioContext ?? globalThis.webkitAudioContext`,
// src/shared/audio.ts:71-77). Separate file rather than separate describe:
// `vi.mock` is per-file and main.ts boots once per module registry.
//
// ─── THE VACUITY TRAP THIS FILE IS BUILT AROUND ──────────────────────────────
// "No AudioContext before a gesture" is TRUE TODAY, for the wrong reason:
// main.ts never calls createAudio at all, so no context is ever constructed,
// gesture or not. A file containing only that assertion would ship green,
// prove nothing, and go on being green if Dev never wired anything.
//
// So the negative is worthless alone and is paired here with the POSITIVE that
// only a real wiring can satisfy — after a gesture, a context IS built. The
// positive is the RED; the negative is what keeps the fix honest. Neither is
// committed without the other.

import { describe, it, expect, beforeAll } from 'vitest'
import {
  installShellDom,
  seedWasHonoured,
  snapshotPlayfield,
  ONE_STEP_MS,
  SEED,
} from './helpers/boot-shell'
import { createAudio } from '../src/shell/audio'
import { playEventSounds } from '../src/shell/audio-dispatch'
import { EVENT_KINDS, type GameEvent } from '../src/core/events'


const shell = installShellDom()

/** Contexts counted at each stage of the boot, captured before the next stage. */
const seen = {
  afterBoot: -1,
  afterSilentFrames: -1,
  afterGesture: -1,
}

/** The mushroom field the shell booted with, COPIED before a frame has run. */
let bootCells: Uint8Array

beforeAll(async () => {
  await import('../src/main')
  bootCells = snapshotPlayfield(shell.sim())
  seen.afterBoot = shell.audioContexts()

  // Run the attract screen for a while with NO input whatsoever. The core keeps
  // attract silent by design (core/events.ts:23-26 — `stepAttractDemo` runs a
  // full playing frame and CLEARS the stream before returning), so this is the
  // real pre-gesture state of the cabinet: rendering, stepping, emitting nothing.
  let t = 0
  for (let i = 0; i < 60; i++) {
    t += ONE_STEP_MS
    shell.frame(t)
  }
  seen.afterSilentFrames = shell.audioContexts()

  // The first interaction. Both a canvas click and a keypress are gestures the
  // browser accepts, and the precedents bind resume() to both (tempest:47-51
  // attaches `unlockAudio` to canvas 'click' AND window 'keydown').
  //
  // REWORK (Reviewer round 1, MEDIUM): the note here cited "main.ts:84-86,
  // :92-94" for the listeners main.ts "already owns". Those were the pre-wiring
  // line numbers, and this story's own diff grew the file past them — neither
  // span names a listener now. Both citations are re-taken against the wired
  // file, and they name where `unlockAudio` actually binds rather than which
  // listeners happened to exist first:
  //   • main.ts:121      — `window.addEventListener('keydown', unlockAudio)`
  //   • main.ts:123-126  — the canvas 'click' listener, which calls
  //                        `unlockAudio()` before `lock.request()`
  // (The third listener, the initials keydown at main.ts:132-134, is a separate
  // window keydown and is not a gesture binding.) These lines are pinned by
  // tests/audio-citations.test.ts so the next diff that moves them reds.
  shell.emit('canvas', 'click', {})
  shell.emit('window', 'keydown', { key: 'Enter' })
  for (let i = 0; i < 5; i++) {
    t += ONE_STEP_MS
    shell.frame(t)
  }
  seen.afterGesture = shell.audioContexts()
})

describe('cp5-2 AC4 — the gesture gate is respected', () => {
  it('the boot is SEEDED — this file observes a pinned world, not whatever the clock said', () => {
    // REWORK (Reviewer round 1, MEDIUM). Shared with the other two boot suites:
    // main.ts:203 seeded attract straight from `Date.now()`, so "the attract
    // screen ran 60 frames and stayed silent" was an observation about one
    // particular world. Attract silence is a core guarantee
    // (core/events.ts:23-26) and does not depend on the seed, but the run below
    // is only reproducible if the seed is. The shell-only `?seed=` override now
    // exists; see helpers/boot-shell.ts `seedWasHonoured`, which is what stops
    // it from silently stopping working.
    expect(
      seedWasHonoured(bootCells),
      `main.ts did not boot the world ?seed=${SEED} asks for — it is still seeding attract ` +
        'from Date.now(), so this run is not reproducible. Add the shell-only ?seed= ' +
        'override (the ?wave= shape, main.ts:40-49)',
    ).toBe(true)
  })

  it('constructs NO AudioContext at boot', () => {
    // Browsers refuse to start a context before a user gesture, and a context
    // built at module scope lands in 'suspended' and never recovers on some
    // engines. It also warns in the console on every load.
    expect(
      seen.afterBoot,
      'main.ts built an AudioContext while the module was still evaluating — before the ' +
        'player has touched anything',
    ).toBe(0)
  })

  it('constructs NO AudioContext while the attract screen runs untouched', () => {
    // NOTE: this assertion passes on the CURRENT tree for a reason that has
    // nothing to do with the gate — nothing calls createAudio yet, so nothing
    // could build a context. It is meaningful only in company with the test
    // below, which is the one that reds until the wiring lands.
    expect(
      seen.afterSilentFrames,
      'an AudioContext appeared during attract, with no interaction — the engine is being ' +
        'resumed off the frame loop rather than off a gesture',
    ).toBe(0)
  })

  it('DOES construct one once the player interacts — the gate opens', () => {
    // The positive half, and the RED. This cannot pass until main.ts both builds
    // the engine and calls resume() from a real gesture listener; it is what
    // stops the two assertions above from being satisfied by an unwired file.
    expect(
      seen.afterGesture,
      'no AudioContext was built even after a click and a keypress — the engine is never ' +
        'resumed, so the cabinet is permanently mute (main.ts calls neither createAudio ' +
        'nor audio.resume())',
    ).toBeGreaterThan(0)
  })

  it('builds at most one context however many gestures arrive', () => {
    // resume() is documented idempotent ("Safe to call repeatedly (e.g. on every
    // user gesture); only the first call does work", src/shared/audio.ts:31-33),
    // which is why the precedents leave both listeners attached forever instead
    // of removing them. A context per keystroke would exhaust the browser's
    // limit within a game.
    expect(
      seen.afterGesture,
      'more than one AudioContext was constructed — resume() is being bypassed, or a new ' +
        'engine is built per gesture',
    ).toBe(1)
  })
})

describe('cp5-2 AC4 — events landing before the gate are dropped without error', () => {
  // These run against the seam directly rather than through the boot: the claim
  // is about the ENGINE's pre-resume behaviour, and driving real gameplay before
  // a gesture is impossible by construction (leaving attract needs a keypress,
  // and a keypress is the gesture).

  it('dispatching a full frame of cues before resume() neither throws nor builds a context', () => {
    const before = shell.audioContexts()
    const audio = createAudio()
    const frame: GameEvent[] = EVENT_KINDS.map((type) => ({ type }) as GameEvent)
    expect(
      () => playEventSounds(audio, frame),
      'a cue dispatched before the first gesture threw — an exception on this path reaches ' +
        'the rAF callback and freezes the frame loop',
    ).not.toThrow()
    expect(
      shell.audioContexts(),
      'merely playing a cue built an AudioContext — play() must stay a silent no-op until ' +
        'resume() opens the gate',
    ).toBe(before)
  })

  it('every cue kind is safe to dispatch pre-gesture, one at a time', () => {
    // The sweep above dispatches them together, so an early throw would mask
    // every later kind. One at a time is what names the offender.
    const audio = createAudio()
    const offenders: string[] = []
    for (const type of EVENT_KINDS) {
      try {
        playEventSounds(audio, [{ type } as GameEvent])
      } catch {
        offenders.push(type)
      }
    }
    expect(offenders, 'these cue kinds threw when dispatched before the gesture gate').toEqual([])
  })
})
