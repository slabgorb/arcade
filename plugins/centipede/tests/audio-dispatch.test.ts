// tests/audio-dispatch.test.ts
//
// Story cp5-1 — RED phase (Leeloo / TEA). The event -> cue wiring as a PURE,
// importable function. Covers AC3 (every kind maps to a cue, with a `never`
// exhaustiveness guard) and the cross-module half of AC4 (every cue the
// dispatch names exists in the manifest, and concurrent loops do not share a
// voice).
//
// This is deliberately the tempest/battlezone extraction and NOT star-wars's
// inline-in-main.ts switch. battlezone's own header says why
// (plugins/battlezone/src/shell/audio-dispatch.ts:1-9): "so the map is
// unit-testable against a recording fake without booting a canvas." Every test
// below is exactly that — no DOM, no canvas, no AudioContext.
//
// ─── WHY THE EXHAUSTIVENESS TEST IS A RUNTIME SWEEP, NOT A GREP ──────────────
// AC3 asks for a `never` guard "proven by a test or a deliberate compile
// failure". A test that greps the source for the word `never` matches a TOKEN,
// not the CLAIM — it stays green over a guard that was commented out or
// weakened to a `default: break`. So the real check here is a runtime sweep
// over `EVENT_KINDS` (the core's own list): every kind must produce exactly one
// effect, and the cue it names must exist in the manifest. Add a kind without a
// cue and that sweep goes red whether or not the `never` survived. The source
// assertion is kept as well, but as the weaker of the two.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const dispatchPath = join(repoRoot, 'src', 'shell', 'audio-dispatch.ts')

// ─── the three not-yet-existing modules ──────────────────────────────────────

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
}

function recordingAudio(): SoundSurface & { calls: Effect[] } {
  const calls: Effect[] = []
  return {
    calls,
    play: (sound) => void calls.push({ kind: 'play', sound }),
    startLoop: (sound) => void calls.push({ kind: 'startLoop', sound }),
    stopLoop: (sound) => void calls.push({ kind: 'stopLoop', sound }),
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
  const mod = await load<{ playEventSounds: PlayEventSounds }>(['..', 'src', 'shell', 'audio-dispatch'])
  const fn = mod.playEventSounds
  if (typeof fn !== 'function') {
    throw new Error(
      'cp5-1 not implemented yet: src/shell/audio-dispatch.ts must exist and export ' +
        '`playEventSounds(audio, events)`.',
    )
  }
  return fn
}

async function eventKinds(): Promise<readonly string[]> {
  const mod = await load<{ EVENT_KINDS: readonly string[] }>(['..', 'src', 'core', 'events'])
  const kinds = mod.EVENT_KINDS
  if (kinds === undefined) {
    throw new Error('cp5-1 not implemented yet: src/core/events.ts must export `EVENT_KINDS`.')
  }
  return kinds
}

async function manifest(): Promise<{
  SOUNDS: Readonly<Record<string, string>>
  CHANNELS: Readonly<Record<string, string>>
}> {
  const mod = await load<{
    SOUNDS: Readonly<Record<string, string>>
    CHANNELS: Readonly<Record<string, string>>
  }>(['..', 'src', 'shell', 'audio'])
  if (mod.SOUNDS === undefined || mod.CHANNELS === undefined) {
    throw new Error('cp5-1 not implemented yet: src/shell/audio.ts must export SOUNDS and CHANNELS.')
  }
  return { SOUNDS: mod.SOUNDS, CHANNELS: mod.CHANNELS }
}

/** Dispatch one event and return what the engine was asked to do. */
async function effectsFor(kind: string): Promise<Effect[]> {
  const play = await dispatchFn()
  const audio = recordingAudio()
  play(audio, [{ type: kind }])
  return audio.calls
}

/** A sustained cue is signalled by its kind name: `-start` opens a loop and
 *  `-stop` closes it. The pairing itself is pinned in audio-events.test.ts. */
const isLoopStart = (kind: string): boolean => kind.endsWith('-start')
const isLoopStop = (kind: string): boolean => kind.endsWith('-stop')

describe('cp5-1 AC3 — the dispatch is an importable pure function', () => {
  it('src/shell/audio-dispatch.ts exists', () => {
    expect(existsSync(dispatchPath), 'cp5-1 must create src/shell/audio-dispatch.ts').toBe(true)
  })

  it('exports playEventSounds with no DOM or canvas dependency', async () => {
    expect(typeof (await dispatchFn())).toBe('function')
  })

  it('plays nothing for an empty frame', async () => {
    const play = await dispatchFn()
    const audio = recordingAudio()
    play(audio, [])
    expect(audio.calls).toEqual([])
  })

  it('carries a `never` exhaustiveness guard in its source', async () => {
    // The WEAKER half of AC3, kept for the compile-time claim. The runtime
    // sweep below is what actually has teeth.
    expect(existsSync(dispatchPath), 'cp5-1 must create src/shell/audio-dispatch.ts').toBe(true)
    const src = readFileSync(dispatchPath, 'utf8')
    expect(src, 'a `never`-typed default arm makes a missing cue a compile error').toMatch(/never/)
  })
})

describe('cp5-1 AC3 — EVERY event kind maps to exactly one cue', () => {
  it('the sweep runs over a non-empty kind list', async () => {
    // Non-vacuity: `it.each` over an empty list silently runs zero tests, and
    // the whole exhaustiveness claim below would be made of nothing.
    expect((await eventKinds()).length).toBeGreaterThan(0)
  })

  it('every kind in EVENT_KINDS produces exactly one playback effect', async () => {
    const kinds = await eventKinds()
    const missing: string[] = []
    const overlapping: string[] = []
    for (const kind of kinds) {
      const calls = await effectsFor(kind)
      if (calls.length === 0) missing.push(kind)
      else if (calls.length > 1) overlapping.push(`${kind} (${calls.length})`)
    }
    expect(missing, `event kinds with NO cue: ${missing.join(', ')}`).toEqual([])
    expect(overlapping, `event kinds firing more than one effect: ${overlapping.join(', ')}`).toEqual(
      [],
    )
  })

  it('every cue the dispatch names exists in SOUNDS and CHANNELS', async () => {
    // The cross-module half of AC4: the dispatch and the manifest are written
    // separately and this is the only thing that makes them agree. A cue with
    // no manifest entry is a silent no-op in the shared engine — it degrades
    // quietly, so nothing else in the suite would ever notice.
    const kinds = await eventKinds()
    const { SOUNDS, CHANNELS } = await manifest()
    const unknown: string[] = []
    for (const kind of kinds) {
      for (const call of await effectsFor(kind)) {
        if (!(call.sound in SOUNDS)) unknown.push(`${kind} -> SOUNDS['${call.sound}']`)
        if (!(call.sound in CHANNELS)) unknown.push(`${kind} -> CHANNELS['${call.sound}']`)
      }
    }
    expect(unknown, `cues with no manifest entry: ${unknown.join(', ')}`).toEqual([])
  })
})

describe('cp5-1 AC4 — sustained cues are START/STOP, not repeated one-shots', () => {
  it('a `-start` kind opens a LOOP and a `-stop` kind closes one', async () => {
    const kinds = await eventKinds()
    const loopKinds = kinds.filter((k) => isLoopStart(k) || isLoopStop(k))
    expect(loopKinds.length, 'the union must carry sustained cues').toBeGreaterThan(0)

    for (const kind of loopKinds) {
      const [call] = await effectsFor(kind)
      const want = isLoopStart(kind) ? 'startLoop' : 'stopLoop'
      expect(call?.kind, `'${kind}' must dispatch ${want}, not ${call?.kind}`).toBe(want)
    }
  })

  it('a `-start`/`-stop` pair drives the SAME cue — otherwise the loop never stops', async () => {
    const kinds = await eventKinds()
    for (const start of kinds.filter(isLoopStart)) {
      const stop = `${start.slice(0, -'-start'.length)}-stop`
      if (!kinds.includes(stop)) continue // pairing itself is pinned in audio-events.test.ts
      const [started] = await effectsFor(start)
      const [stopped] = await effectsFor(stop)
      expect(
        stopped?.sound,
        `'${stop}' stops '${stopped?.sound}' but '${start}' started '${started?.sound}'`,
      ).toBe(started?.sound)
    }
  })

  it('one-shot kinds use play(), never a loop', async () => {
    const kinds = await eventKinds()
    const oneShots = kinds.filter((k) => !isLoopStart(k) && !isLoopStop(k))
    expect(oneShots.length, 'the union must carry one-shot cues too').toBeGreaterThan(0)
    for (const kind of oneShots) {
      const [call] = await effectsFor(kind)
      expect(call?.kind, `'${kind}' is a one-shot and must dispatch play()`).toBe('play')
    }
  })

  it('concurrent loops do not share a channel — a shared voice silences one of them', async () => {
    // The property the CHANNELS map exists to express. The marching tick and
    // the creatures are all sounding at once in ordinary play; the shared
    // engine steals the channel on every new cue, so two loops on one channel
    // means starting the second silently stops the first. This is the one
    // manifest defect that produces no error anywhere — just missing sound.
    const kinds = await eventKinds()
    const { CHANNELS } = await manifest()
    const byChannel = new Map<string, string[]>()
    for (const start of kinds.filter(isLoopStart)) {
      const [call] = await effectsFor(start)
      if (call === undefined) continue
      const channel = CHANNELS[call.sound]
      if (channel === undefined) continue // reported by the manifest-coverage test above
      byChannel.set(channel, [...(byChannel.get(channel) ?? []), call.sound])
    }
    const shared = [...byChannel.entries()].filter(([, cues]) => new Set(cues).size > 1)
    expect(
      shared.map(([ch, cues]) => `${ch}: ${[...new Set(cues)].join(' + ')}`),
      'sustained cues sharing one channel will cut each other off',
    ).toEqual([])
  })
})

describe('cp5-1 AC3 — a whole frame dispatches in core order', () => {
  it('one call per event, in the order the core emitted them', async () => {
    const kinds = await eventKinds()
    // Take three distinct one-shots so the ordering assertion is meaningful.
    const oneShots = kinds.filter((k) => !isLoopStart(k) && !isLoopStop(k)).slice(0, 3)
    expect(oneShots.length, 'need at least three one-shot kinds to test ordering').toBe(3)

    const play = await dispatchFn()
    const audio = recordingAudio()
    play(
      audio,
      oneShots.map((type) => ({ type })),
    )

    const expected: Effect[] = []
    for (const kind of oneShots) expected.push(...(await effectsFor(kind)))
    expect(audio.calls).toEqual(expected)
  })

  it('repeats a one-shot that appears twice in one frame', async () => {
    // Two segments can die to one frame. Deduplicating here would silently
    // swallow the second kill's cue.
    const kinds = await eventKinds()
    const oneShot = kinds.find((k) => !isLoopStart(k) && !isLoopStop(k))
    expect(oneShot, 'need a one-shot kind').toBeDefined()

    const play = await dispatchFn()
    const audio = recordingAudio()
    play(audio, [{ type: oneShot as string }, { type: oneShot as string }])
    expect(audio.calls.length).toBe(2)
  })
})
