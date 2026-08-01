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
// cue and that sweep goes red whether or not the `never` survived.
//
// The first cut of this file kept a source assertion "as the weaker of the two"
// and it was worse than weak — it was scenery, and the Reviewer proved it by
// deleting the guard and watching the test pass. It is now anchored to the
// annotation that mutation shows is doing the work (`EVENT_SOUND:
// Record<GameEventKind, SoundName>` in shell/audio.ts), not to a word that also
// occurs in prose.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
// Static, because these modules now exist. The computed specifiers below stay
// as they are: they are what the coverage sweeps load, and they are also how a
// deleted module reds as "cp5-1 not implemented yet" rather than as a resolve
// error at import time.
import type { AudioEngine, SoundName } from '../src/shell/audio'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const dispatchPath = join(repoRoot, 'src', 'shell', 'audio-dispatch.ts')
const audioPath = join(repoRoot, 'src', 'shell', 'audio.ts')

// ─── the three modules (not-yet-existing when this file was written) ─────────

/** One observable playback effect, tagged by the engine method that produced
 *  it — so a one-shot `play` can be told apart from a sustained `startLoop`. */
type Effect =
  | { kind: 'play'; sound: SoundName }
  | { kind: 'startLoop'; sound: SoundName }
  | { kind: 'stopLoop'; sound: SoundName }

/**
 * The fake engine's shape, DERIVED from the real one.
 *
 * REWORK (Reviewer round 1, MEDIUM): this was hand-rolled as
 * `play(name: string)` while the real surface takes the narrow `SoundName`
 * union — justified during RED, when the module did not exist, but once it does
 * a hand-rolled type lets the fake drift from the thing it stands in for.
 * `Pick` from the real `AudioEngine` instead, which is exactly what the
 * dispatch itself accepts.
 *
 * WHAT THIS DOES AND DOES NOT CATCH, measured rather than assumed — renaming
 * `startLoop` on the shared engine now reds this file (TS2344 on the `Pick`);
 * ADDING a parameter to it does not, because TypeScript assigns a function of
 * fewer parameters to one of more, and `recordingAudio` below declares one. The
 * cue-NAME type is the half that is fully coupled: `Effect.sound` is
 * `SoundName`, so widening or narrowing the union lands here.
 */
type SoundSurface = Pick<AudioEngine, 'play' | 'startLoop' | 'stopLoop'>

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

/**
 * Remove TypeScript comments, so a source anchor cannot be satisfied by PROSE.
 *
 * This is lang-review #15's whole lesson, and this story is where it was
 * learned: round 1's `expect(src).toMatch(/never/)` was green over a deleted
 * guard because the word also occurred in two comments in the file under test.
 * An anchor that reads raw source cannot tell a declaration from a sentence
 * describing one — and this file's comments quote its own code repeatedly, so
 * that is not a hypothetical here.
 *
 * Deliberately crude: it does not understand strings or regex literals. The
 * `(^|[^:])` guard keeps a `https://` inside a string from being eaten, and
 * `stripComments` has a positive control of its own below — nothing may assert
 * against stripped source until the stripper is shown to have removed
 * something.
 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

/** The `default:` block's BODY, or `null` if the switch has no default arm. */
function defaultArmBody(code: string): string | null {
  return code.match(/default\s*:\s*\{([\s\S]*?)\n\s*\}/)?.[1] ?? null
}

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

  it('the compile-time half of AC3 is anchored where it actually fires', () => {
    // REWORK (Reviewer round 1, HIGH). This assertion used to read the dispatch
    // source for the bare word `never` — and `never` also appears in two of that
    // file's COMMENTS, so deleting the whole guard left the test green. A token,
    // not the claim.
    //
    // Two mutations established where the guarantee really is:
    //   add a kind to EVENT_KINDS with no cue -> TS2741 at shell/audio.ts's
    //     EVENT_SOUND literal.                                     <- the mechanism
    //   delete the dispatch's `never` line    -> 0 tsc errors.     <- was scenery
    //
    // So this is pinned to the ANNOTATION that produces the error: drop it, or
    // widen it to `Record<string, SoundName>`, and this test reds. The runtime
    // sweep below covers the same claim from the other side.
    expect(existsSync(audioPath), 'cp5-1 must create src/shell/audio.ts').toBe(true)
    const src = readFileSync(audioPath, 'utf8')
    expect(
      src,
      'EVENT_SOUND must be annotated Record<GameEventKind, SoundName> — that annotation, and ' +
        'nothing else in this story, makes a kind with no cue a COMPILE error',
    ).toMatch(/EVENT_SOUND\s*:\s*Record<\s*GameEventKind\s*,\s*SoundName\s*>/)
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
    // NON-VACUITY (Reviewer round 1, MEDIUM): both `continue`s above can skip
    // every iteration, and an empty map yields an empty `shared` that satisfies
    // the assertion below while nothing whatever was compared. Counted over the
    // COLLECTED cues, not over `byChannel.size` — the map's size is exactly what
    // shrinks when cues share a channel, so guarding on it would fire in place
    // of the real assertion and hide the finding it is protecting.
    const collected = [...byChannel.values()].flat()
    expect(
      collected.length,
      'no sustained cue reached the channel map — the check below is vacuous',
    ).toBe(kinds.filter(isLoopStart).length)
    const shared = [...byChannel.entries()].filter(([, cues]) => new Set(cues).size > 1)
    expect(
      shared.map(([ch, cues]) => `${ch}: ${[...new Set(cues)].join(' + ')}`),
      'sustained cues sharing one channel will cut each other off',
    ).toEqual([])
  })
})

describe('cp5-1 AC3 — the EFFECT union carries its own exhaustiveness guard', () => {
  // ─── WHY THIS BLOCK EXISTS (Reviewer round 2, MEDIUM — M1-r2) ──────────────
  // There are TWO exhaustiveness claims in this story and they guard DIFFERENT
  // unions. The test above pins the first: `EVENT_SOUND: Record<GameEventKind,
  // SoundName>` in shell/audio.ts, which makes an event KIND with no cue a
  // compile error. This block pins the second: the dispatch switch's `default`
  // arm, which makes a new cue EFFECT with no arm a compile error.
  //
  // The second guard was added later, as round 1's L2 fix, and was given no
  // assertion of its own — so it was deleted from the working tree and `tsc`,
  // 956 centipede tests and all 10,476 repo tests stayed green over the hole.
  // That is exactly lang-review #15's closing rule ("every guard must be
  // mutation-tested") going unmet for the newest guard in the diff, in the
  // story that WROTE #15.
  //
  // ─── WHY A SOURCE ANCHOR, WHEN THIS FILE'S HEADER ARGUES AGAINST ONE ───────
  // The header above prefers a runtime sweep to a grep, and it is right about
  // the kind union — that claim is observable, so the sweep can watch it. This
  // claim is not. `effectFor` returns a closed three-member union, so no input
  // can produce a fourth effect at runtime; and the two shapes differ only in
  // what the COMPILER rejects, never in what the engine is asked to do. A
  // recording fake cannot tell them apart. Compile-time-only claims can only be
  // pinned in source text, so the discipline moves into HOW the anchor is
  // written: anchored to the declaration, stripped of comments, and counted.
  //
  // Every assertion below was mutation-proven (see the TEA Assessment): each
  // one reds under the mutation it names, and the whole block goes green on the
  // committed file and red on the working tree as handed over.

  const dispatchSource = (): string => readFileSync(dispatchPath, 'utf8')

  it('the comment stripper actually strips — the control for every anchor below', () => {
    // Without this, a `stripComments` that silently returned its input would
    // make every "not in prose" claim in this block vacuous, and the block
    // would reproduce the exact defect it exists to prevent.
    const raw = dispatchSource()
    const code = stripComments(raw)
    expect(
      code.length,
      'stripComments removed nothing — the anchors below cannot tell code from prose',
    ).toBeLessThan(raw.length)
    expect(code, 'stripComments left a line comment behind').not.toMatch(/\/\/ /)
  })

  it('every effect has its OWN case arm, so `default` is genuinely unreachable', () => {
    // A `default` that does real work is not an exhaustiveness check
    // (lang-review TS-3). The working tree's mutation deleted `case 'play'` and
    // let the default absorb it — which compiles clean forever, and silently
    // routes a future fade/duck/pitch-bend to a one-shot `play()`.
    const code = stripComments(dispatchSource())
    for (const effect of ['startLoop', 'stopLoop', 'play']) {
      expect(
        code,
        `the switch must handle '${effect}' in its own case arm — a default that ` +
          'dispatches is not an exhaustiveness guard',
      ).toMatch(new RegExp(`case\\s+'${effect}'\\s*:`))
    }
  })

  it('`default` binds the discriminant to `never`, with NO cast', () => {
    // The cast is the difference between a guard and scenery, and round 1
    // shipped the scenery version (`event.type as never`, logged as L1): a cast
    // makes the assignment compile whatever the discriminant's type is, so the
    // arm proves nothing. An UNCAST binding is the mechanism — it compiles only
    // while the union is fully consumed by the arms above.
    const body = defaultArmBody(stripComments(dispatchSource()))
    expect(body, 'the switch must carry a `default:` block — AC3 names it').not.toBeNull()
    expect(
      body,
      'the default arm must bind the narrowed discriminant to a `never` const with no ' +
        '`as` cast — a cast silences the compiler instead of consulting it',
    ).toMatch(/const\s+unreachable\s*:\s*never\s*=\s*effect\s*;?\s*$/m)
  })

  it('`default` is a GUARD, not a dispatch arm — it must not touch the engine', () => {
    // The direct negation of the working tree's mutation, and the assertion
    // that reds on it most loudly.
    const body = defaultArmBody(stripComments(dispatchSource()))
    expect(
      body,
      'the default arm calls the audio engine — it is dispatching, not guarding, so ' +
        'a new effect kind becomes a wrong sound instead of a compile error',
    ).not.toMatch(/audio\s*\./)
  })

  it('the guard is anchored to CODE — exactly one declaration survives comment-stripping', () => {
    // The count is taken over STRIPPED source on purpose. Raw source is not
    // asserted: this file legitimately quotes its own code in prose, and a
    // future comment doing so must not red this test. What must never happen is
    // the reverse — the declaration existing ONLY in prose, which is precisely
    // how round 1's `/never/` stayed green over a deleted guard.
    const declarations = stripComments(dispatchSource()).match(
      /const\s+unreachable\s*:\s*never\s*=\s*effect/g,
    )
    expect(
      declarations?.length ?? 0,
      'expected exactly one `never` guard declaration in code (0 means it survives only ' +
        'in a comment, or not at all)',
    ).toBe(1)
  })
})

describe('cp5-1 AC3 — an unmapped kind is a LOUD failure, not a silent no-op', () => {
  // The dispatch's OTHER guard, and the only one reachable at runtime: the
  // `sound === undefined` throw. It had no test either — the same gap as
  // M1-r2, in the same function, found while writing M1-r2's fix.
  //
  // It matters beyond this story. cp5-2 (wire the seam into main.ts) records
  // this throw as a latent hazard: once `playEventSounds` is on the hot path,
  // an uncaught throw inside requestAnimationFrame kills the frame loop and
  // freezes the game. cp5-2 has to decide throw-vs-degrade, and it cannot make
  // that decision against untested behaviour. This pins what the behaviour is
  // TODAY so that the change reds when cp5-2 makes it deliberately.

  it('throws, naming the kind that has no cue', async () => {
    const play = await dispatchFn()
    const audio = recordingAudio()
    expect(() => play(audio, [{ type: 'no-such-event-kind' }])).toThrow(/no-such-event-kind/)
    expect(
      audio.calls,
      'a kind with no cue must reach the engine as nothing at all — a partial ' +
        'dispatch followed by a throw is worse than either',
    ).toEqual([])
  })

  it('a kind WITH a cue does not throw — the control', async () => {
    // Without this, a `playEventSounds` that threw on absolutely everything
    // would satisfy the test above, and the suite would be pinning a dead
    // function as if it were a guard.
    const kinds = await eventKinds()
    const first = kinds[0]
    expect(first, 'need at least one real kind for the control').toBeDefined()
    const play = await dispatchFn()
    expect(() => play(recordingAudio(), [{ type: first as string }])).not.toThrow()
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
