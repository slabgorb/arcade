// tests/audio-channel-role.test.ts
//
// Story jt9-7 — RED phase (O'Brien / TEA). The story asked the workflow to
// DECIDE: delete joust's `CHANNELS` and let the engine default, or keep it and
// make the test assert what it actually guarantees.
//
// ═══ THE DECISION: KEEP THE MAP. ═════════════════════════════════════════════
// Measured against `main` at 5cc5bc2, three legs, each re-measured here rather
// than inherited from the filing:
//
//  1. DELETION IS NOT A JOUST CHANGE. `src/shared/audio.ts` declares
//     `channels: Record<N, string>` REQUIRED — no `?`, no default. Deleting the
//     `channels:` line from joust's `createAudioEngine` is not type-legal:
//         plugins/joust/src/shell/audio.ts(168,45): error TS2345
//     (re-measured at review; the GREEN commit's six added prose lines moved
//     this from the `(162,45)` the RED phase recorded — the column is the
//     manifest literal's `{` on the `createSharedAudioEngine` call, so grep for
//     that call rather than trusting either number)
//     So the branch begins with making the field optional in code all five
//     manifest-building cabinets import (asteroids, centipede, joust,
//     star-wars, tempest — 6 production `channels:` sites, 24 more manifest
//     literals in `src/shared/tests/`) and designing a default from scratch.
//     CLAUDE.md's standing rule is to change shared only once a SECOND consumer
//     proves the need. No second consumer wants an optional `channels`.
//
//  2. THE OPPOSITE OF A SECOND CONSUMER — a second cabinet already relies on
//     exactly the fallback this map provides. The filing (and the shared
//     docblock at `src/shared/audio.ts`, which says so in prose) has joust
//     as the only cabinet passing `priorities`. It is not:
//     `plugins/centipede/src/shell/audio.ts` passes one too, built by a
//     FILTER over voice 0, and its own docblock at :204-211 names three cues —
//     `mushroom`, `headBottom`, `waveClear` — deliberately left OUTSIDE
//     arbitration under a user ruling of 2026-08-03, where they "keep plain
//     per-channel stealing". A cabinet with `priorities` AND unarbitrated cues
//     routed by `channels` is not a hypothetical; it shipped.
//
//     joust's own `PRIORITIES` (`src/shell/audio.ts`, `const
//     PRIORITIES`) is DERIVED by the
//     same shape of filter — `if (source.kind === 'rom')` — and `CueSource` has
//     an `invention` arm that jt9-5 made first-class with a REQUIRED `frames`
//     field. "All 20 cues carry a priority" is therefore a fact about today's
//     cue list, not a property the design enforces. `describes what deletion
//     would cost` below measures where the first invention would land.
//
//  3. THE TEST THE STORY COMPLAINS ABOUT WAS REDUNDANT WITH `tsc`, which is why
//     feeding the map felt like a tax. Deleting `extraMan: 'prio-100'` from
//     `CHANNELS` fails `npm run lint`:
//         error TS2741: Property 'extraMan' is missing in type ... but required
//         in type 'Readonly<Record<SoundName, string>>'
//     CI runs `npm run lint` BEFORE the vitest project, so the three stories
//     that fed this map were fed by the TYPE. `CHANNELS gives every SOUNDS entry
//     a voice` asserted only what the compiler already refuses.
//
// ═══ AND THE HOLE THAT WAS ACTUALLY OPEN ═════════════════════════════════════
// Two mutations of `CHANNELS` survive all 2533 joust tests AND `tsc`:
//     enemyWingUp: 'prio-6'  ->  'prio-6b'    (SPLITS one ROM priority in two)
//     enemyWingDown/Up: 'prio-6' -> 'prio-99' (names a priority the ROM has not)
// The old suite checked one direction only (cues on one channel share a
// priority) and skipped any channel holding fewer than two cues, so splitting a
// class hid in the skip. The header prose has claimed the strong form since
// jt5-5 — "cues on one channel are exactly the cues at one ROM priority" —
// and nothing pinned it. That is what this file pins.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { CHANNELS, CUE_SOURCES, SOUNDS, createAudioEngine } from '../src/shell/audio.js'
import { FRAME_DURATIONS, type SoundName } from '../src/shell/audio-manifest.js'
import { createAudioEngine as createSharedAudioEngine } from '@shared/audio'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const NAMES = Object.keys(SOUNDS) as SoundName[]

/** The ROM priority `PRIORITIES` derives for a cue, or `undefined` where the
 *  derivation gives none — which is every non-`rom` arm. Read from the same
 *  place `const PRIORITIES` (`src/shell/audio.ts`) reads it, so the
 *  VALUE cannot drift from it. The line number can and did — this story's own
 *  GREEN commit moved it six lines — so the symbol is the anchor, not `:157`. */
function romPriority(name: SoundName): number | undefined {
  const source = CUE_SOURCES[name]
  return source.kind === 'rom' ? source.priority : undefined
}

// ═════════════════════════════════════════════════════════════════════════════
// AC1 — what the map IS: exactly the ROM's priority partition, named for it
// ═════════════════════════════════════════════════════════════════════════════

describe('jt9-7 AC1 — CHANNELS is the ROM priority partition, in BOTH directions', () => {
  it('cues share a channel if and only if they share a ROM priority', () => {
    // The "if" half is what the old suite checked. The "only if" half is the
    // one that was open: a channel holding a single cue was `continue`d past, so
    // splitting one ROM priority across two channels asserted nothing at all.
    // Stated as a full pairwise sweep so neither direction can hide in a skip.
    const offenders: string[] = []
    for (const a of NAMES) {
      for (const b of NAMES) {
        if (a >= b) continue
        const sameChannel = CHANNELS[a] === CHANNELS[b]
        const samePriority = romPriority(a) === romPriority(b)
        if (sameChannel !== samePriority) {
          offenders.push(
            `${a} (${CHANNELS[a]}, prio ${romPriority(a)}) vs ` +
              `${b} (${CHANNELS[b]}, prio ${romPriority(b)}): ` +
              `${sameChannel ? 'one channel, two priorities' : 'one priority, two channels'}`,
          )
        }
      }
    }
    expect(NAMES.length, 'precondition: the sweep has cues to compare').toBeGreaterThan(1)
    expect(
      offenders,
      'the header claims cues on one channel are EXACTLY the cues at one ROM priority; ' +
        'each line below breaks that claim in one direction or the other',
    ).toEqual([])
  })

  it('there are exactly as many channels as the ROM has distinct priorities', () => {
    // The counting form of the same fact, and the replacement for the old
    // `toBeGreaterThan(1)` — which one channel per cue, or two channels for
    // eighteen cues, would both have satisfied. Both sides are MEASURED; neither
    // is a literal, so this cannot go stale the way the comment it replaces did.
    const channels = new Set(Object.values(CHANNELS))
    const priorities = new Set(NAMES.map(romPriority))
    expect(channels.size, 'precondition: the map is not empty').toBeGreaterThan(0)
    expect(
      channels.size,
      `${NAMES.length} cues carry ${priorities.size} distinct ROM priorities, so the map ` +
        `must have ${priorities.size} channels — it has ${channels.size}`,
    ).toBe(priorities.size)
  })

  it('each channel is NAMED for the ROM priority it stands for', () => {
    // Independent of the partition above, and deliberately so: a consistent
    // rename (every `prio-6` -> `prio-99`) leaves the partition perfect and the
    // name a lie. The docblock says the channel is "named for the ROM priority
    // that decides it"; this is that sentence, executable.
    for (const name of NAMES) {
      const priority = romPriority(name)
      if (priority === undefined) continue
      expect(
        CHANNELS[name],
        `${name} cites ROM priority ${priority}, so its channel must say so`,
      ).toBe(`prio-${priority}`)
    }
    // Non-vacuity: the loop above `continue`s past every cue with no ROM
    // priority, so it would pass over a manifest of nothing but inventions.
    expect(
      NAMES.filter((n) => romPriority(n) !== undefined).length,
      'nothing is proven if no cue reached the assertion',
    ).toBe(NAMES.length)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC2 — what the map DOES: the residual routing power, measured on the engine
// ═════════════════════════════════════════════════════════════════════════════
//
// The `CHANNELS` docblock claims "a shared channel can no longer buy or deny a
// cue anything". Measured, that is FALSE — true of the arbitration window, false
// once the window is released. The three tests below are the measurement, and
// the prose guard at the bottom is what makes the file say what they found.
//
// Reachability, stated honestly rather than overclaimed: the window is a count
// of `tick()`s driven from the sim's fixed step, while the sample's length is
// wall-clock. They are sized to match (the bake takes each `.wav`'s length from
// the same frame count), so this is the state reached whenever the sim runs
// ahead of the audio clock — `pumpFrames` catch-up in `src/main.ts` is bounded
// at MAX_CATCHUP_SECONDS and does exactly that. The engine already treats
// "window held, `live` empty" as a normal state (`src/shared/audio.ts`,
// jt9-6); this is that state pointing the other way.

class FakeSource {
  buffer: unknown = null
  loop = false
  started = false
  stopped = false
  onended: (() => void) | null = null
  connect(): void {}
  disconnect(): void {}
  start(): void {
    this.started = true
  }
  stop(): void {
    this.stopped = true
  }
}
class FakeGain {
  gain = { value: 0 }
  connect(): void {}
}
class FakeCtx {
  state = 'running'
  destination = {}
  sources: FakeSource[] = []
  createGain(): FakeGain {
    return new FakeGain()
  }
  createBufferSource(): FakeSource {
    const s = new FakeSource()
    this.sources.push(s)
    return s
  }
  resume(): Promise<void> {
    return Promise.resolve()
  }
  decodeAudioData(d: { __url?: string }): Promise<unknown> {
    return Promise.resolve({ __buffer: d && d.__url })
  }
}

let saved: Record<string, unknown> = {}
let contexts: FakeCtx[] = []

beforeEach(() => {
  const g = globalThis as Record<string, unknown>
  saved = { AC: g.AudioContext, WK: g.webkitAudioContext, FETCH: g.fetch }
  contexts = []
  g.AudioContext = class extends FakeCtx {
    constructor() {
      super()
      contexts.push(this)
    }
  }
  g.webkitAudioContext = undefined
  g.fetch = (url: string) => Promise.resolve({ arrayBuffer: () => Promise.resolve({ __url: url }) })
})
afterEach(() => {
  const g = globalThis as Record<string, unknown>
  g.AudioContext = saved.AC
  g.webkitAudioContext = saved.WK
  g.fetch = saved.FETCH
})

/** Drain the fetch -> arrayBuffer -> decode -> store microtask chain. */
async function flush(): Promise<void> {
  for (let i = 0; i < 16; i++) await Promise.resolve()
}

/** joust's OWN engine, samples decoded. Nothing is stubbed between `CHANNELS`
 *  and the behaviour below, so these also prove the map is wired at all. */
async function joustEngine() {
  const engine = createAudioEngine('https://sfx.invalid/joust/')
  engine.resume()
  await flush()
  return engine
}

// A same-priority pair (both `prio-10`, 90-frame windows) and a cue on another
// channel. Chosen from the shipped map rather than invented, so a change to the
// map that made these unrepresentative reddens the assertions above first.
const A: SoundName = 'playerWingUp'
const B_SAME_CHANNEL: SoundName = 'playerWingDown'
const C_OTHER_CHANNEL: SoundName = 'playerThud'

describe('jt9-7 AC2 — what a shared channel still decides, and what it does not', () => {
  it('the fixture is the shape these tests claim it is', () => {
    expect(CHANNELS[A], 'A and B must share a channel').toBe(CHANNELS[B_SAME_CHANNEL])
    expect(CHANNELS[A], 'C must be on another channel').not.toBe(CHANNELS[C_OTHER_CHANNEL])
    expect(romPriority(C_OTHER_CHANNEL) ?? 0).toBeGreaterThanOrEqual(romPriority(A) ?? 0)
    expect(FRAME_DURATIONS[A], 'A holds the voice for a window this test can outlast').toBe(90)
  })

  it('WHILE the window is held, the channel decides nothing — the voice reaches across it', async () => {
    const engine = await joustEngine()
    engine.play(A)
    const first = contexts[0]!.sources[0]!
    expect(first.started, 'precondition: A actually sounded').toBe(true)
    engine.tick() // 1 of 90 — the window is still open
    engine.play(C_OTHER_CHANNEL)
    expect(
      first.stopped,
      'an accepted arbitrated cue takes the ONE voice, so it stops whatever holds it ' +
        'even on another channel — this is the half of the story that IS true',
    ).toBe(true)
  })

  it('ONCE the window is released, a SHARED channel still cuts a ringing cue off', async () => {
    const engine = await joustEngine()
    engine.play(A)
    const first = contexts[0]!.sources[0]!
    for (let i = 0; i < FRAME_DURATIONS[A]; i++) engine.tick() // window released
    engine.play(B_SAME_CHANNEL)
    expect(
      first.stopped,
      '`stopChannel(channel)` runs on every start regardless of arbitration, so a cue ' +
        'sharing the channel silences the tail — the map is not inert here',
    ).toBe(true)
  })

  it('...and a DIFFERENT channel does not — which is the control that gives the last test meaning', async () => {
    const engine = await joustEngine()
    engine.play(A)
    const first = contexts[0]!.sources[0]!
    for (let i = 0; i < FRAME_DURATIONS[A]; i++) engine.tick() // window released
    engine.play(C_OTHER_CHANNEL)
    expect(
      first.stopped,
      'the voice is released, so there is no cross-channel steal — the ONLY difference ' +
        'from the previous test is the channel, which is what makes the map load-bearing',
    ).toBe(false)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC3 — what deleting the map would cost, measured rather than argued
// ═════════════════════════════════════════════════════════════════════════════

describe('jt9-7 AC3 — CHANNELS is the route for any cue outside arbitration', () => {
  it('every cue is routed, and the routing is total where the arbitration is partial', () => {
    // The invariant that survives, stated as the asymmetry it is: `channels` is
    // `Record<N, string>` (total, a compile error to omit), `priorities` is
    // `Partial<Record<N, number>>` (a filter's output). So `priorities` may only
    // ever be a SUBSET of the routed names. Non-vacuous even at full coverage,
    // and it is the clause the whole decision rests on.
    const routed = new Set(Object.keys(CHANNELS))
    const arbitrated = NAMES.filter((n) => romPriority(n) !== undefined)
    expect(Object.keys(SOUNDS).every((n) => routed.has(n)), 'every cue has a channel').toBe(true)
    expect(
      arbitrated.filter((n) => !routed.has(n)),
      'a cue may be arbitrated only if it is also routed',
    ).toEqual([])
  })

  it('an unarbitrated cue falls back to plain per-channel stealing — the map is what catches it', async () => {
    // joust has no such cue TODAY, so the fallback is exercised against joust's
    // real maps with one name withheld from `priorities` — the exact shape a
    // `kind: 'invention'` entry would produce, since `PRIORITIES` is built by
    // `if (source.kind === 'rom')`. centipede ships three of these for real.
    const priorities = Object.fromEntries(
      NAMES.map((n) => [n, romPriority(n)]).filter(([n]) => n !== C_OTHER_CHANNEL),
    ) as Partial<Record<SoundName, number>>
    expect(priorities[C_OTHER_CHANNEL], 'precondition: the cue is outside arbitration').toBe(
      undefined,
    )
    const engine = createSharedAudioEngine<SoundName>({
      baseUrl: 'https://sfx.invalid/joust/',
      sounds: SOUNDS,
      channels: CHANNELS,
      priorities,
      frameDurations: FRAME_DURATIONS,
    })
    engine.resume()
    await flush()
    // Two cues on ONE channel: the unarbitrated one still steals, by channel.
    engine.play(A)
    const first = contexts[0]!.sources[0]!
    engine.play(B_SAME_CHANNEL)
    expect(first.stopped, 'a shared channel still steals for a cue no priority governs').toBe(true)
  })

  it('there is no engine default to fall back to — an absent channels map THROWS', async () => {
    // The story's own framing is "delete joust's map and let the engine
    // DEFAULT". Measured, there is no default to let happen: `startSource`
    // reads `manifest.channels[name]` at `src/shared/audio.ts`, above and
    // outside the try/catch at `:269` that makes every other failure here a
    // silent degrade. So an absent map is not a degrade path, it is an
    // unguarded property access — `TypeError: Cannot read properties of
    // undefined`, on the first cue of the first game. Designing that default is
    // the work the deletion branch begins with, and this is its size.
    const manifest = {
      baseUrl: 'https://sfx.invalid/joust/',
      sounds: SOUNDS,
      priorities: {} as Partial<Record<SoundName, number>>,
      // Deliberately illegal: `channels` is REQUIRED (`src/shared/audio.ts`).
      // The cast IS the finding — it is what the deletion branch would have to
      // make legal for real, across all five manifest-building cabinets.
    } as unknown as Parameters<typeof createSharedAudioEngine<SoundName>>[0]
    const engine = createSharedAudioEngine<SoundName>(manifest)
    engine.resume()
    await flush()
    expect(
      () => engine.play(A),
      'if this ever stops throwing, the shared engine has grown a default and the ' +
        'deletion branch is worth re-costing — until then "let the engine default" ' +
        'names behaviour that does not exist',
    ).toThrow(TypeError)
  })

  it('a cue MISSING from a present map shares one phantom channel — jt9-6, re-verified and priced', () => {
    // jt9-6's Reviewer routed a constraint here: a cue absent from a game's
    // `channels` map yields `channel === undefined`, so `voiceChannel` becomes
    // `undefined` rather than `null`, measured harmless because `voiceChannel
    // === null` implies a fully-released voice (`sprint/archive/jt9-6-session.md`
    // `:537-543`, `:651`). RE-OPENED rather than inherited, and the harmless
    // half HOLDS: nothing crashes and nothing matches spuriously.
    //
    // What that finding does not say is what the map's completeness is worth,
    // so this prices it. Two cues missing from the map key `live` on the SAME
    // `undefined`, so they steal from each other though the ROM gives them
    // different priorities — and a cue still IN the map is untouched, which is
    // the control that stops this passing for the wrong reason. Today
    // `Readonly<Record<SoundName, string>>` makes that state a COMPILE error;
    // deleting the map spends exactly this guarantee.
    const holed = { ...CHANNELS } as Record<string, string>
    delete holed[A]
    delete holed.extraMan
    const engine = createSharedAudioEngine<SoundName>({
      baseUrl: 'https://sfx.invalid/joust/',
      sounds: SOUNDS,
      channels: holed as Record<SoundName, string>,
      priorities: {},
      frameDurations: FRAME_DURATIONS,
    })
    engine.resume()
    return flush().then(() => {
      engine.play(A) // ROM priority 10, now channel `undefined`
      const first = contexts[0]!.sources[0]!
      expect(first.started, 'precondition: the holed cue still sounds').toBe(true)
      engine.play(C_OTHER_CHANNEL) // still IN the map — the control
      expect(first.stopped, 'a routed cue must not reach across into the phantom').toBe(false)
      engine.play('extraMan') // ROM priority 100, also holed
      expect(
        first.stopped,
        'both holed names key the same `undefined` channel, so a cue the ROM gives its ' +
          'own priority steals one it never shared a voice with',
      ).toBe(true)
    })
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC4 — the prose the maps are read through must not contradict the maps
// ═════════════════════════════════════════════════════════════════════════════
//
// Every guard below compares against a MEASURED value, never a literal, and each
// carries a positive precondition so that deleting the sentence cannot pass it.

/** Comment text with its `//` / ` * ` scaffolding and its backticks removed and
 *  its whitespace collapsed, so a claim is matched as a SENTENCE and re-wrapping
 *  a line can neither break a guard nor hide a defect from one. */
function flatten(source: string): string {
  return source
    .replace(/^\s*(\/\/|\*|\/\*\*?)/gm, ' ')
    .replace(/`/g, '')
    .replace(/\s+/g, ' ')
}

/** The `/** ... *\/` docblock immediately above a declaration — the PROXIMITY
 *  half of every guard below, so a true sentence parked in the file header
 *  cannot satisfy a claim made about the map. */
function docblockAbove(source: string, declaration: string): string {
  const at = source.indexOf(declaration)
  expect(at, `precondition: ${declaration} must exist`).toBeGreaterThan(-1)
  const before = source.slice(0, at)
  const open = before.lastIndexOf('/**')
  const close = before.lastIndexOf('*/')
  expect(open, `precondition: ${declaration} must carry a docblock`).toBeGreaterThan(-1)
  expect(close, 'the docblock must be the one directly above the declaration').toBeGreaterThan(open)
  return flatten(before.slice(open, close))
}

describe('jt9-7 AC4 — the prose does not claim the channel decides nothing', () => {
  it('no sentence claims the channel stopped mattering ENTIRELY', () => {
    // The measured falsehood, banned by SHAPE rather than by spelling: a
    // sentence saying the channel/fence "no longer" does something, qualified by
    // an absolute ("anything", "nothing", "at all"). At RED two sentences
    // matched and `AC2` above proved both wrong — `:51` "the fence no longer
    // decides anything for these seventeen cues" and `:93` "a shared channel can
    // no longer buy or deny a cue anything". The GREEN commit removed both, so
    // the matching set is EMPTY today and this guard is a ratchet, not a
    // measurement. The two that must SURVIVE are the ones that are true and are
    // not absolute — "The channel no longer decides which cue wins" (it does
    // not; the priority does) and "just no longer the arbitration", now `:94`
    // and `:101-102`. A guard on the literal wording would let a reworded
    // absolute straight through; this bans by shape instead.
    //
    // KNOWN GAP, reviewed and filed as jt9-37: the shape is `/no longer/` AND an
    // absolute word, so a false absolute phrased WITHOUT "no longer" — measured
    // at review with "A shared channel buys and denies a cue nothing at all." —
    // passes all 2548 tests. Widen the first clause when jt9-37 is picked up.
    const source = readFileSync(join(root, 'src', 'shell', 'audio.ts'), 'utf8')
    const sentences = flatten(source).split(/(?<=\.)\s+/)
    // Detection extracted to `channelDecidesNothing` (foot of file) so the
    // jt9-28 AC7(a) meta-test drives the SAME predicate this live guard runs —
    // neither can drift from the other. jt9-37's hole is repaired there.
    const absolutes = sentences.filter(channelDecidesNothing)
    expect(
      sentences.some((s) => /no longer/i.test(s)),
      'precondition: the file still discusses what changed at jt5-5',
    ).toBe(true)
    expect(
      absolutes.map((s) => s.trim()),
      'the channel still decides who is cut off once the arbitrated window is released ' +
        '(see the AC2 tests above), so no sentence here may say it decides nothing',
    ).toEqual([])
  })

  it('the CHANNELS docblock names the case where the channel still decides', () => {
    // PROXIMITY: the claim has to sit on the map, not somewhere in the 60-line
    // file header, because the docblock is what a reader of `CHANNELS` reads.
    // Non-vacuous AT RED by measurement: none of `window`, `release`, `expire`,
    // `tick` appeared in that docblock at all. They do now — that was the fix —
    // so what keeps this honest going forward is the mutant, not the wordlist:
    // deleting the release sentence reddens this test (measured by Dev at GREEN
    // and again at review).
    //
    // KNOWN GAP, reviewed and filed as jt9-37: this matches on KEYWORD
    // CO-OCCURRENCE, not on the claim. Measured at review, the INVERTED sentence
    // "Once that window is released the channel is released with it, so a shared
    // channel decides nothing about whose tail gets cut" satisfies it — it
    // carries `channel` and `released`, and `AC2` above proves it false. The
    // executable claim is the AC2 trio; this guard only makes the docblock
    // MENTION the case.
    const source = readFileSync(join(root, 'src', 'shell', 'audio.ts'), 'utf8')
    const doc = docblockAbove(source, 'export const CHANNELS')
    const qualified = doc
      .split(/(?<=\.)\s+/)
      .filter((s) => /\bchannel\b/i.test(s) && /\b(window|released?|expires?|expired|tick)\b/i.test(s))
    expect(
      qualified,
      'this is a MENTION check only — it forces the docblock to NAME the released-window ' +
        'case, but it matches on keyword co-occurrence, so an inverted sentence carries the ' +
        'same words; the executable claim lives in the AC2 trio above, never here',
    ).not.toEqual([])
  })
})

// ─── AC7(a) — R1: the absolute-ban guard, repaired for a tense-less absolute ──
//
// jt9-37 measured the hole: R1 requires BOTH `/no longer/` and an absolute word,
// so "A shared channel buys and denies a cue nothing at all." (no tense marker)
// passed all tests. `channelDecidesNothing` is the detector the live R1 guard
// (`no sentence claims the channel stopped mattering ENTIRELY`, above) now shares
// with this meta-test. Dev repairs the BODY to catch the tense-less absolute
// WITHOUT flagging the two TRUE sentences that live in audio.ts — the control
// half of this test, and the reason the fix is not "just drop /no longer/".

/** Does a sentence claim a shared channel/fence decides NOTHING, absolutely and
 *  UNCONDITIONALLY? jt9-28 repairs jt9-7's `/no longer/ && absolute` shape, which
 *  jt9-37 measured a tense-less absolute slipping through. Two shapes are banned
 *  now, and the tense marker is no longer required for either:
 *    1. the old one — `no longer` + an absolute (`anything|nothing|at all`);
 *    2. a claim ABOUT a channel/fence carrying a BARE absolute and no tense word.
 *  A SCOPED absolute is TRUE and must survive — `nothing BEYOND X`, `while the
 *  window holds`, `once released` — so a scoping qualifier vetoes the match. That
 *  is what keeps audio.ts ("the fence settles nothing beyond …") green, and
 *  :94 ("no longer decides WHICH cue wins" — no absolute) never matched at all. */
function channelDecidesNothing(sentence: string): boolean {
  const absolute = /\b(anything|nothing|at all)\b/i.test(sentence)
  if (!absolute) return false
  // A scoped absolute is a true statement, not the falsehood.
  const scoped = /\b(beyond|except|while|once|until|during|before|released?|window)\b/i.test(sentence)
  if (scoped) return false
  // Shape 1: the tense-marked absolute jt9-7 already caught.
  if (/no longer/i.test(sentence)) return true
  // Shape 2: an unqualified absolute made ABOUT a shared channel/fence — the
  // jt9-37 hole. Requiring channel/fence keeps it off unrelated absolutes
  // elsewhere in the header (`no comparison at all`, `nothing in this manifest`).
  return /\b(channel|fence)\b/i.test(sentence)
}

describe('jt9-28 AC7(a) — R1 catches an unqualified channel-absolute, tense marker or not', () => {
  it('the detector flags the jt9-37 falsehood and spares the two true sentences in audio.ts', () => {
    // POSITIVE — the measured falsehood, reworded without "no longer".
    expect(
      channelDecidesNothing('A shared channel buys and denies a cue nothing at all.'),
      'a tense-less absolute is still the falsehood AC2 refuted',
    ).toBe(true)
    // CONTROLS that MUST stay false — both are TRUE and live in audio.ts, so a
    // repair that flags either reddens the live R1 guard on the green tree:
    //  · audio.ts — a SCOPED absolute ("settles nothing BEYOND ..."), true.
    expect(
      channelDecidesNothing(
        'While that arbitrated window holds the voice, the fence settles nothing beyond what the priority already decided.',
      ),
      'a scoped "nothing beyond X" is true, not the absolute',
    ).toBe(false)
    //  · audio.ts — a BOUNDED claim ("no longer decides WHICH cue wins"), true.
    expect(
      channelDecidesNothing('The channel no longer decides which cue wins.'),
      'a bounded "no longer decides which" is true',
    ).toBe(false)
  })
})

// ─── AC7(b) — R2: honest about being a MENTION check ─────────────────────────
//
// jt9-37 measured R2's hole: it matches KEYWORD CO-OCCURRENCE (`channel` +
// `window|released|...`), so the exact INVERSION of the claim satisfies it. That
// is not repairable by a better regex — the executable claim is the AC2 trio.
// The fix (story's own words) is to make R2 SAY it only forces a MENTION. This
// pins that acknowledgement in R2's own guard message.

describe('jt9-28 AC7(b) — R2 declares itself a mention check, deferring the claim to AC2', () => {
  it('the docblock guard’s expect MESSAGE admits it can only force a MENTION', () => {
    const selfSource = readFileSync(fileURLToPath(import.meta.url), 'utf8')
    // Anchor on R2's live it() TITLE (stable, unique, kept across a reword), then
    // capture ONLY the expect message — between `expect(qualified,` and
    // `.not.toEqual`. The block comment above it already says "mention"/"AC2
    // trio", so a body-wide check would pass vacuously; the MESSAGE the guard
    // PRINTS on failure is the artifact a tripped reader actually sees.
    const start = selfSource.indexOf('names the case where the channel still decides')
    expect(start, 'precondition: the R2 guard is still here').toBeGreaterThan(-1)
    // Window must clear R2's long comment (~1.4k chars) AND the message after it.
    const region = selfSource.slice(start, start + 2800)
    const captured = region.match(/expect\(\s*qualified,([\s\S]*?)\)\s*\.not\.toEqual/)
    const message = captured?.[1] ?? ''
    expect(
      /mention/i.test(message) && /\bAC2\b/.test(message),
      'R2 must state in its guard MESSAGE that it only forces a MENTION and that the AC2 ' +
        'trio carries the executable claim — otherwise it reads as a claim guard it is not',
    ).toBe(true)
  })
})
