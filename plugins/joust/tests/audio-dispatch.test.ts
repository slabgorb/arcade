// tests/audio-dispatch.test.ts
//
// Story jt5-1 — RED phase (Mr. Praline / TEA). The event -> cue wiring as a
// PURE, importable function. Covers AC4: every event kind maps to a cue behind
// a `never` exhaustiveness guard, so adding a kind without a cue is a COMPILE
// error rather than a silently dropped sound.
//
// This is deliberately the tempest/battlezone extraction and NOT star-wars's
// inline-in-main.ts switch. battlezone's own header says why
// (plugins/battlezone/src/shell/audio-dispatch.ts:1-9): "so the map is
// unit-testable against a recording fake without booting a canvas." Every test
// below is exactly that — no DOM, no canvas, no AudioContext.
//
// ─── WHY THE EXHAUSTIVENESS CHECK IS A RUNTIME SWEEP, NOT A GREP ─────────────
// A test that greps the source for `never` matches a TOKEN, not the CLAIM: it
// stays green over a guard that was commented out, or weakened to a bare
// `default: break`. The real check here is a runtime sweep over `EVENT_KINDS`
// (the core's own tuple): every kind must produce exactly one effect naming a
// cue the manifest holds. Add a kind without a case and that sweep reds whether
// or not the `never` survived. The source assertion is kept too, as the weaker
// of the two, because AC4's literal words are about the compile error.
//
// ─── joust PLAYS NO LOOPS, AND THAT IS A ROM FACT ────────────────────────────
// The epic's house pattern says sustained cues are a startLoop/stopLoop pair
// "never repeated one-shots". joust has no sustained cue to pair: every one of
// the machine's 38 sound tables is a priority byte followed by bounded
// (code, duration) pairs, and the format header spells out the only three
// escapes — "SOUND !N$00 DOES NOT DISTURBE THE SOUND, BUT EXTENDS TIMER",
// "SOUND !N$FF TURNS OFF (KILLS) THE SOUND", "SOUND !N$xx (RANGE 01-3E) SENDS
// THE CORRESPONDING SOUND" (JOUSTRV4.SRC:8045-8049). A cue runs for its own
// duration and stops itself; there is no ring-until-told-otherwise voice. So
// every cue this story wires is a `play()`, and a `startLoop` here would be an
// invention. (The ROM's `!N$FF` KILL tables — SNPFAL, SNEFAL, SNPTREF — are the
// nearest thing to a stopLoop, and all three belong to the skid/fall chain this
// story defers. See the session's Delivery Findings.)

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dispatchPath = join(root, 'src', 'shell', 'audio-dispatch.ts')

// ─── the recording fake ──────────────────────────────────────────────────────

/** One observable playback effect, tagged by the engine method that produced
 *  it — so a one-shot `play` can be told apart from a sustained `startLoop`. */
type Effect =
  | { kind: 'play'; sound: string }
  | { kind: 'startLoop'; sound: string }
  | { kind: 'stopLoop'; sound: string }

interface SoundSurface {
  play(name: string): void
  startLoop(name: string): void
  stopLoop(name: string): void
  // jt5-5: the dispatch also carries the sound voice's frame clock, so the fake
  // has to answer it. Deliberately NOT recorded as an `Effect` — every sweep
  // below counts "one effect per event kind", and a per-frame tick is not an
  // effect OF an event. It is asserted separately, in audio-priority.test.ts.
  tick(): void
}

function recordingAudio(): SoundSurface & { calls: Effect[] } {
  const calls: Effect[] = []
  return {
    calls,
    play: (sound) => void calls.push({ kind: 'play', sound }),
    startLoop: (sound) => void calls.push({ kind: 'startLoop', sound }),
    stopLoop: (sound) => void calls.push({ kind: 'stopLoop', sound }),
    tick: () => {},
  }
}

type PlayEventSounds = (audio: SoundSurface, events: readonly { type: string }[]) => void

const load = async <T>(parts: string[]): Promise<Partial<T>> => {
  try {
    return (await import(/* @vite-ignore */ parts.join('/'))) as Partial<T>
  } catch {
    return {}
  }
}

async function dispatchFn(): Promise<PlayEventSounds> {
  const fn = (await load<{ playEventSounds: PlayEventSounds }>(['..', 'src', 'shell', 'audio-dispatch']))
    .playEventSounds
  if (typeof fn !== 'function') {
    throw new Error(
      'jt5-1 not implemented yet: src/shell/audio-dispatch.ts must exist and export ' +
        '`playEventSounds(audio, events)`.',
    )
  }
  return fn
}

async function eventKinds(): Promise<readonly string[]> {
  const kinds = (await load<{ EVENT_KINDS: readonly string[] }>(['..', 'src', 'core', 'events']))
    .EVENT_KINDS
  if (kinds === undefined) {
    throw new Error('jt5-1 not implemented yet: src/core/events.ts must export `EVENT_KINDS`.')
  }
  return kinds
}

async function sounds(): Promise<Readonly<Record<string, string>>> {
  const s = (await load<{ SOUNDS: Readonly<Record<string, string>> }>(['..', 'src', 'shell', 'audio']))
    .SOUNDS
  if (s === undefined) {
    throw new Error('jt5-1 not implemented yet: src/shell/audio.ts must export `SOUNDS`.')
  }
  return s
}

/** Dispatch one event and return what the engine was asked to do. */
async function effectsFor(kind: string): Promise<Effect[]> {
  const play = await dispatchFn()
  const audio = recordingAudio()
  play(audio, [{ type: kind }])
  return audio.calls
}

// ═════════════════════════════════════════════════════════════════════════════

describe('jt5-1 AC4 — the dispatch is an importable pure function', () => {
  it('src/shell/audio-dispatch.ts exists', () => {
    expect(existsSync(dispatchPath), 'jt5-1 must create src/shell/audio-dispatch.ts').toBe(true)
  })

  it('it needs no canvas, no DOM and no AudioContext — a recording fake is enough', async () => {
    const play = await dispatchFn()
    const audio = recordingAudio()
    expect(() => play(audio, [])).not.toThrow()
    expect(audio.calls, 'an empty frame asks the engine for nothing').toEqual([])
  })

  it('it holds no module-level state — the same event dispatches the same way twice', async () => {
    const first = await effectsFor('enemy-death')
    const second = await effectsFor('enemy-death')
    expect(first.length, 'precondition: the cue fires at all').toBeGreaterThan(0)
    expect(second).toEqual(first)
  })
})

describe('jt5-1 AC4 — every event kind maps to exactly one cue', () => {
  it('the sweep has teeth — EVENT_KINDS is non-empty', async () => {
    expect((await eventKinds()).length).toBeGreaterThan(0)
  })

  it('every kind produces exactly one effect', async () => {
    const kinds = await eventKinds()
    const misses: string[] = []
    for (const kind of kinds) {
      const effects = await effectsFor(kind)
      if (effects.length !== 1) misses.push(`${kind} -> ${effects.length} effects`)
    }
    expect(misses, 'every event kind must reach exactly one cue').toEqual([])
  })

  it('every cue a kind names exists in the manifest', async () => {
    const [kinds, manifest] = await Promise.all([eventKinds(), sounds()])
    const unknown: string[] = []
    for (const kind of kinds) {
      for (const effect of await effectsFor(kind)) {
        if (!(effect.sound in manifest)) unknown.push(`${kind} -> ${effect.sound}`)
      }
    }
    expect(unknown, 'a cue named by the dispatch but absent from SOUNDS can never play').toEqual([])
  })

  it('distinct kinds do not collapse onto one cue', async () => {
    // Eleven ROM tables, eleven cues. Two kinds sharing a sound would mean one
    // of the machine's distinct sounds was quietly dropped — the ROM gives
    // enemy-death $16/prio 40 and player-death $16/prio 80, the same CODE but
    // different tables and priorities, so even the closest pair stays distinct.
    const kinds = await eventKinds()
    const cues = new Map<string, string>()
    for (const kind of kinds) {
      for (const effect of await effectsFor(kind)) {
        const already = cues.get(effect.sound)
        expect(already, `'${kind}' and '${already}' both play '${effect.sound}'`).toBeUndefined()
        cues.set(effect.sound, kind)
      }
    }
    expect(cues.size, 'one distinct cue per kind').toBe(kinds.length)
  })
})

describe('jt5-1 AC4 — joust’s cues are ONE-SHOTS, as the machine’s tables are', () => {
  it('no kind starts or stops a loop', async () => {
    const kinds = await eventKinds()
    const loops: string[] = []
    for (const kind of kinds) {
      for (const effect of await effectsFor(kind)) {
        if (effect.kind !== 'play') loops.push(`${kind} -> ${effect.kind}('${effect.sound}')`)
      }
    }
    expect(
      loops,
      'every joust sound table is a bounded (code,duration) sequence that stops itself ' +
        '(JOUSTRV4.SRC:8045-8049) — a sustained loop here would be an invention',
    ).toEqual([])
  })
})

describe('jt5-1 AC4 — the never guard, and what it protects', () => {
  it('the source carries a `never` exhaustiveness guard', async () => {
    // The literal AC. Weaker than the sweep above (it matches a token), so it
    // is stated as well as, never instead of.
    expect(existsSync(dispatchPath), 'jt5-1 must create src/shell/audio-dispatch.ts').toBe(true)
    const src = readFileSync(dispatchPath, 'utf8')
    expect(
      src,
      'the default branch must assign the narrowed event to `never`, so a new kind ' +
        'without a case fails the build',
    ).toMatch(/:\s*never\s*=/)
  })

  it('an UNRECOGNISED kind is silent — it never falls through onto another cue', async () => {
    // What the `never` guard buys at runtime: the default branch does nothing.
    // A default that played some cue would make a typo'd or stale kind audible
    // as the wrong sound, which is worse than the silence it replaces.
    const effects = await effectsFor('no-such-moment-in-any-rom')
    expect(effects, 'an unknown kind must produce no effect at all').toEqual([])
  })
})

describe('jt5-1 AC4 — a frame’s events dispatch in order, one cue each', () => {
  it('two events in one frame produce two cues, in the order given', async () => {
    const play = await dispatchFn()
    const audio = recordingAudio()
    play(audio, [{ type: 'enemy-death' }, { type: 'egg-collected' }])
    expect(audio.calls, 'both cues fire').toHaveLength(2)

    const reversed = recordingAudio()
    play(reversed, [{ type: 'egg-collected' }, { type: 'enemy-death' }])
    expect(
      reversed.calls.map((c) => c.sound),
      'the dispatch must follow the core’s order, not a fixed one',
    ).toEqual(audio.calls.map((c) => c.sound).reverse())
  })

  it('a repeated event in one frame fires its cue twice — nothing is de-duplicated', async () => {
    // Two buzzards can die on one frame. Collapsing them would silence a kill,
    // and the engine's own voice-stealing is what keeps the pile-up bounded.
    const play = await dispatchFn()
    const audio = recordingAudio()
    play(audio, [{ type: 'enemy-death' }, { type: 'enemy-death' }])
    expect(audio.calls).toHaveLength(2)
  })
})
