// tests/voice0-contention.test.ts
//
// Story cp6-3 — POKEY voice 0 is contended, and the player explosion wins.
//
// THE MECHANISM, AND WHY IT IS CONTROL FLOW RATHER THAN ADJACENCY. In the
// cabinet's `SOUNDS` routine, the CHAN0 kill-cue path is label `52$`
// (`CENTI4.MAC:2418`) — the block that decrements CHAN0 and writes `AUDF0` /
// `AUDC0`. That label has EXACTLY ONE reference in the whole routine: the
// `BEQ 52$` at `CENTI4.MAC:2437`, taken only when `CHAN5` (the player
// explosion) is zero. `:2416`'s `BNE 50$ ;ALWAYS` stops any fall-through into
// it. So while the player is exploding, the kill path is not merely lower
// priority — it is UNREACHABLE, and CHAN0 is neither decremented nor sounded.
//
// THE DIRECTION IS THE WHOLE STORY, AND IT IS EASY TO GET BACKWARDS. Our shared
// engine's plain per-channel stealing runs FORWARD: a new sound on an occupied
// channel stops what was ringing. Putting the death and the kills on one
// channel would therefore let a LATER kill silence a ringing death — the exact
// opposite of the machine. The engine's `priorities` arbitration (jt5-5) runs
// the other way: a strictly-lower-priority cue is REFUSED while the window
// holds. That is the cabinet's shape, and it is what these tests pin.
//
// AND IT ARBITRATES ACROSS CHANNELS (`src/shared/audio.ts` — an accepted
// arbitrated sound stops what is sounding on a DIFFERENT channel). So the
// CHANNELS map does NOT move, and cp6-1's AC-5 guard in
// tests/audit/sound-dossier.test.ts stays green. A fix that needs to merge
// buckets is modelling this the wrong way round.
//
// REACHABILITY, MEASURED AT SETUP — READ THIS BEFORE ADDING A SWEEP. Seeded
// free-runs (fire held, 30k frames, seven seeds) say the two directions are NOT
// equally reachable in real play:
//
//   * kill arriving DURING a ringing death — NOT reachable. Our 48-frame death
//     pause emits no one-shots at all (only `stepPlayingFrame` builds events),
//     and the next kill cue after a death landed at +183, +286, +186 and +322
//     frames across five seeds. Never inside the ROM's 76-frame window. A
//     "no kill sounds during a death" seeded sweep is therefore VACUOUS, and is
//     deliberately NOT written here — it is pinned at the engine seam instead,
//     where the window is controllable.
//   * death arriving during a ringing kill — REACHABLE: 3 of 22 deaths across
//     seven seeds had a kill cue less than 19 frames earlier (gaps 5, 7 and 16).
//     That is the audible defect today, and it is the positive control that
//     keeps the zero-assertions below honest.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import * as audioModule from '../src/shell/audio'
// Aliased: this file has its own `windowFrames`, which re-derives the window
// from the fixture and THROWS on a missing length. Keeping both under one name
// would hide which of the two an assertion is about.
import { CHANNELS, createAudio, windowFrames as shellWindowFrames } from '../src/shell/audio'
import { playEventSounds } from '../src/shell/audio-dispatch'
import { createSim, stepSim, WAVE_DELAY, type SimState } from '../src/core/sim'
import { CENT_BODY_PIC, DEAD_BIT, type Segment } from '../src/core/centipede'
import { SPIDER_PIC_MIN } from '../src/core/spider'
import { FLEA_PARK_V, FLEA_PARK_PIC } from '../src/core/flea'
import { SCORP_PIC_LOW } from '../src/core/scorpion'
import type { GameEvent } from '../src/core/events'

// ─── the dossier is the source of every number below ────────────────────────
// cp6-1 ruled which POKEY voice each cue rides and how long it holds it. These
// tests read that ruling rather than re-typing it, so a dossier correction and
// the shipped manifest cannot silently disagree (AC-3).

const here = dirname(fileURLToPath(import.meta.url))
const fixturePath = join(here, '..', 'docs', 'rom-study', 'sound.fixture.json')

interface CueRuling {
  origin: string
  pokeyVoice: number | null
  lengthFrames: number | null
  frameGate: number | null
}
interface SoundFixture {
  cues: Record<string, CueRuling>
  voiceArbitration?: { contenders?: string[]; cites?: string[] }
  voice0Arbitration?: { contenders?: string[]; winner?: string; note?: string; cites?: string[] }
}

const loadFixture = (): SoundFixture => {
  if (!existsSync(fixturePath)) throw new Error(`cp6-1's dossier is missing: ${fixturePath}`)
  return JSON.parse(readFileSync(fixturePath, 'utf8')) as SoundFixture
}

/** Every cue the ROM puts on POKEY voice 0 — the contended set, from the ruling. */
function voice0Cues(): string[] {
  const { cues } = loadFixture()
  return Object.entries(cues)
    .filter(([, c]) => c.pokeyVoice === 0)
    .map(([name]) => name)
    .sort()
}

/** How many VIDEO frames a cue holds its voice: the countdown seed times the
 *  FRAME mask it advances on. The player explosion's `frameGate` of 4 is why it
 *  is 76 frames and not 19 — it decrements on one frame in four. */
function windowFrames(name: string): number {
  const c = loadFixture().cues[name]
  if (c.lengthFrames === null || c.frameGate === null) {
    throw new Error(`cue ${name} has no length in the dossier`)
  }
  return c.lengthFrames * c.frameGate
}

// ─── a fake WebAudio, so the real engine can be driven deterministically ─────
// The engine is `src/shared/audio.ts` unmodified; only the browser globals are
// stubbed. `started` / `stopped` record the sources it actually creates, which
// is the only way to tell a REFUSED cue (no node at all) from a muted one.

interface Recorder {
  started: string[]
  stopped: string[]
}
let rec: Recorder
let naming = '?'

class FakeSource {
  loop = false
  buffer: unknown = null
  onended: (() => void) | null = null
  readonly name: string
  constructor() {
    this.name = naming
  }
  connect(): void {}
  disconnect(): void {}
  start(): void {
    rec.started.push(this.name)
  }
  stop(): void {
    rec.stopped.push(this.name)
  }
}

const g = globalThis as unknown as Record<string, unknown>
let saved: { AC: unknown; WK: unknown; FETCH: unknown }

beforeEach(() => {
  rec = { started: [], stopped: [] }
  saved = { AC: g.AudioContext, WK: g.webkitAudioContext, FETCH: g.fetch }
  g.AudioContext = class {
    state = 'running'
    destination = {}
    createGain(): unknown {
      return { gain: {}, connect: () => {} }
    }
    createBufferSource(): FakeSource {
      return new FakeSource()
    }
    decodeAudioData(d: unknown): Promise<unknown> {
      return Promise.resolve(d)
    }
    resume(): void {}
  }
  g.webkitAudioContext = undefined
  g.fetch = async (url: string) => ({ arrayBuffer: async () => ({ url }) })
})

afterEach(() => {
  g.AudioContext = saved.AC
  g.webkitAudioContext = saved.WK
  g.fetch = saved.FETCH
})

/** A live engine with every sample decoded. */
async function readyEngine(): Promise<ReturnType<typeof createAudio>> {
  const engine = createAudio('https://test.invalid/')
  engine.resume()
  // let the stubbed fetch/decode chain settle
  for (let i = 0; i < 8; i++) await Promise.resolve()
  await new Promise((r) => setTimeout(r, 0))
  return engine
}

/** Play a cue, tagging the node it creates so the recorder can name it. */
function playAs(engine: ReturnType<typeof createAudio>, name: string): void {
  naming = name
  ;(engine.play as (n: string) => void)(name)
}

/** Advance the engine's frame clock. */
function tickN(engine: ReturnType<typeof createAudio>, n: number): void {
  const t = (engine as { tick?: () => void }).tick
  if (typeof t !== 'function') throw new Error('engine.tick() is missing')
  for (let i = 0; i < n; i++) t.call(engine)
}

// ═══════════════════════════════════════════════════════════════════════════
// AC-1 / AC-5 — the arbitration SET is exactly the dossier's voice-0 cues
// ═══════════════════════════════════════════════════════════════════════════

describe('cp6-3 AC-1/AC-5 — the arbitrated set is DERIVED from the ruling, not hand-listed', () => {
  it('the dossier puts exactly five cues on POKEY voice 0 — the explosion and the four kills', () => {
    // A precondition, not the deliverable: if this list ever changes, every
    // expectation below changes with it, and the failure should say so here.
    expect(voice0Cues()).toEqual([
      'fleaKill',
      'playerDeath',
      'scorpionKill',
      'segmentKill',
      'spiderKill',
    ])
  })

  it('the shell declares a PRIORITIES map covering exactly the voice-0 cues', () => {
    const priorities = (audioModule as Record<string, unknown>).PRIORITIES as
      | Record<string, number>
      | undefined
    expect(
      priorities,
      'src/shell/audio.ts must export PRIORITIES — the arbitration set, derived from the ' +
        "dossier's pokeyVoice field rather than typed out a second time",
    ).toBeDefined()
    expect(Object.keys(priorities ?? {}).sort()).toEqual(voice0Cues())
  })

  it('the three INVENTIONS are absent from PRIORITIES — the cabinet never sounds them (user ruling)', () => {
    const priorities = (audioModule as Record<string, unknown>).PRIORITIES as
      | Record<string, number>
      | undefined
    // WITHOUT this guard the loop below passes vacuously while PRIORITIES does
    // not exist — `{}` has no property called anything. Caught in RED by
    // checking which assertions were green before the feature was written.
    expect(priorities, 'PRIORITIES must exist before "absent from it" means anything').toBeDefined()

    const inventions = Object.entries(loadFixture().cues)
      .filter(([, c]) => c.origin === 'invention')
      .map(([n]) => n)
    expect(inventions.sort()).toEqual(['headBottom', 'mushroom', 'waveClear'])
    // The control: each invention really does share a bucket with an arbitrated
    // cue, so excluding it is a decision rather than an accident of it living
    // somewhere else. `mushroom` rides 'impact' with the four kills.
    const arbitratedChannels = new Set(voice0Cues().map((n) => CHANNELS[n as keyof typeof CHANNELS]))
    expect(
      inventions.filter((n) => arbitratedChannels.has(CHANNELS[n as keyof typeof CHANNELS])).sort(),
      'all three inventions sit on a bucket an arbitrated cue also uses',
    ).toEqual(['headBottom', 'mushroom', 'waveClear'])
    for (const n of inventions) {
      expect(priorities ?? {}, `${n} has no ROM source, so arbitrating it would INVENT behaviour`)
        .not.toHaveProperty(n)
    }
  })

  it('the player explosion outranks every kill cue — it wins outright, and never the reverse', () => {
    const priorities = ((audioModule as Record<string, unknown>).PRIORITIES ?? {}) as Record<
      string,
      number
    >
    const death = priorities.playerDeath
    expect(death, 'playerDeath must carry a priority').toBeDefined()
    for (const kill of voice0Cues().filter((n) => n !== 'playerDeath')) {
      expect(priorities[kill], `${kill} must be arbitrated`).toBeDefined()
      expect(
        death > priorities[kill],
        `playerDeath (${death}) must STRICTLY outrank ${kill} (${priorities[kill]}): the engine ` +
          'refuses strictly-lower only, so an equal rank would let the kill interrupt the death',
      ).toBe(true)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// AC-3 — the windows are the dossier's arithmetic, not chosen numbers
// ═══════════════════════════════════════════════════════════════════════════

describe('cp6-3 AC-3 — every window is lengthFrames x frameGate from the ruling', () => {
  it('the dossier makes the explosion 76 frames and each kill 19 — the 4-frame gate is the difference', () => {
    // Pinned explicitly because the 4x gate is the single easiest thing to drop:
    // both cues seed 0x13, and only the FRAME mask makes them different lengths.
    expect(windowFrames('playerDeath')).toBe(76)
    for (const kill of voice0Cues().filter((n) => n !== 'playerDeath')) {
      expect(windowFrames(kill), `${kill} advances every pass, so 19 x 1`).toBe(19)
    }
  })

  it('the shell derives a window by MULTIPLYING, and degrades a lengthless cue to zero', () => {
    // Review round 1: the shell's own `windowFrames` carries a four-line comment
    // about what happens to a cue the dossier gives no length, and mutating its
    // `0` to `999` left 1153/1153 green — today's fixture puts no lengthless cue
    // on voice 0, so nothing ran the branch. It is reachable in principle:
    // `fleaLoop` already has `lengthFrames: null`, and lands here the day a loop
    // is ruled onto voice 0. So it is pinned at the function, the only seam it
    // has. The mutants this kills, each string verbatim as run (AC-8):
    //   `? 0 : cue.lengthFrames * cue.frameGate`
    //     -> `? 999 : cue.lengthFrames * cue.frameGate`   the degrade; review's own survivor
    //   `cue.lengthFrames * cue.frameGate`
    //     -> `cue.lengthFrames + cue.frameGate`            the arithmetic (reddens 4)
    //
    // And ONE mutant this deliberately does NOT kill, named so the next reader
    // does not mistake it for a hole (round-2 review, N7):
    //   `cue.lengthFrames === null || cue.frameGate === null ? 0 :`
    //     -> `cue.lengthFrames === null ? 0 :`             SURVIVES — equivalent
    // It survives because `19 * null === 0`: with a numeric length, dropping the
    // gate test changes nothing. Enumerated over {null,0,1,4,19,-3,255} squared, the two
    // programs differ in one cell only (`-3, null` gives `-0` instead of `0`).
    // The last assertion below is therefore a CONTRACT pin — "a missing gate is
    // worth no frames" — not a discriminating one, and it is written down that
    // way rather than left to look like coverage it does not provide.
    const cue = (lengthFrames: number | null, frameGate: number | null) => ({
      pokeyVoice: 0,
      lengthFrames,
      frameGate,
      channel: 'CHAN0',
    })
    expect(shellWindowFrames(cue(19, 4)), 'the explosion: 19 x 4').toBe(76)
    expect(shellWindowFrames(cue(19, 1)), 'a kill: 19 x 1').toBe(19)
    expect(
      shellWindowFrames(cue(null, 1)),
      'no length in the dossier must be ZERO frames — "it sounds, and refuses nothing" — never a ' +
        'guessed window',
    ).toBe(0)
    expect(
      shellWindowFrames(cue(19, null)),
      'a missing gate must also be worth no frames. This pins the CONTRACT and does not ' +
        'discriminate the `frameGate === null` clause — see the equivalent-mutant note above',
    ).toBe(0)
  })

  it('the shell declares FRAME_DURATIONS matching the ruling for every arbitrated cue', () => {
    const durations = (audioModule as Record<string, unknown>).FRAME_DURATIONS as
      | Record<string, number>
      | undefined
    expect(
      durations,
      'src/shell/audio.ts must export FRAME_DURATIONS — how many ticks each cue holds voice 0',
    ).toBeDefined()
    for (const name of voice0Cues()) {
      expect(durations?.[name], `${name}'s window must come from the dossier`).toBe(
        windowFrames(name),
      )
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// AC-1 / AC-2 — the BEHAVIOUR, through the real engine, both directions
// ═══════════════════════════════════════════════════════════════════════════

describe('cp6-3 AC-1 — a ringing player explosion REFUSES the kill cues', () => {
  it('a kill arriving during the explosion creates NO source node at all', async () => {
    const engine = await readyEngine()
    playAs(engine, 'playerDeath')
    expect(rec.started, 'precondition: the explosion must actually sound').toEqual(['playerDeath'])

    playAs(engine, 'segmentKill')
    expect(
      rec.started,
      'the kill must be REFUSED, not merely quiet: CENTI4.MAC:2437 branches past the CHAN0 ' +
        'block entirely, so nothing reaches AUDF0/AUDC0',
    ).toEqual(['playerDeath'])
  })

  it('refuses EVERY kill cue, not just the first, for the whole 76-frame window', async () => {
    const engine = await readyEngine()
    playAs(engine, 'playerDeath')
    // one frame short of the window: still refusing
    tickN(engine, windowFrames('playerDeath') - 1)
    for (const kill of voice0Cues().filter((n) => n !== 'playerDeath')) playAs(engine, kill)
    expect(rec.started, 'the window holds until its LAST frame').toEqual(['playerDeath'])
  })

  it('releases voice 0 on the frame the window expires — the refusal is bounded', async () => {
    const engine = await readyEngine()
    playAs(engine, 'playerDeath')

    // BOTH halves, in one test, on purpose. Asserting only the release would
    // pass TODAY for the wrong reason — with no arbitration at all, the kill
    // sounds, which is exactly what "released" looks like. The refusal one
    // frame earlier is what makes the release mean something.
    tickN(engine, windowFrames('playerDeath') - 1)
    playAs(engine, 'segmentKill')
    expect(rec.started, 'still inside the window on its last frame').toEqual(['playerDeath'])

    tickN(engine, 1)
    playAs(engine, 'segmentKill')
    expect(
      rec.started,
      'a refusal that never lifts would silence every kill for the rest of the run',
    ).toEqual(['playerDeath', 'segmentKill'])
  })

  it('THE REACHABLE DIRECTION: an explosion during a ringing kill INTERRUPTS it', async () => {
    // Measured at setup: 3 of 22 seeded deaths had a kill cue less than 19
    // frames earlier (gaps 5, 7, 16). This is the case a player actually hears.
    const engine = await readyEngine()
    playAs(engine, 'segmentKill')
    expect(rec.started).toEqual(['segmentKill'])

    tickN(engine, 5) // the smallest gap the seeded sweep produced
    playAs(engine, 'playerDeath')

    expect(rec.started, 'the explosion outranks the kill, so it sounds').toEqual([
      'segmentKill',
      'playerDeath',
    ])
    expect(
      rec.stopped,
      'and the kill is SILENCED — on the cabinet the explosion has voice 0 to itself',
    ).toContain('segmentKill')
  })
})

describe('cp6-3 AC-2 — arbitration WITHOUT merging the CHANNELS map', () => {
  it('the explosion and the kills still sit on DIFFERENT buckets, and still arbitrate', async () => {
    // This is the assertion that distinguishes the right fix from the wrong one.
    // Merging the buckets also "makes them interact" — backwards. Keeping them
    // apart AND still refusing is only possible via cross-channel arbitration.
    expect(
      CHANNELS.playerDeath,
      'merging the buckets would make a LATER kill steal the explosion — the inverse of :2437',
    ).not.toBe(CHANNELS.segmentKill)

    const engine = await readyEngine()
    playAs(engine, 'playerDeath')
    playAs(engine, 'segmentKill')
    expect(rec.started, 'refused across channels').toEqual(['playerDeath'])
  })

  it('the four kill cues still share one bucket, and each sustained voice still owns its own', () => {
    // cp5-1's economy, unchanged. If a "fix" moved these, the dossier guard
    // would red too — this says the same thing from the story's own side.
    const kills = ['segmentKill', 'spiderKill', 'fleaKill', 'scorpionKill'] as const
    expect(new Set(kills.map((k) => CHANNELS[k])).size, 'one voice-stealing bucket for the kills')
      .toBe(1)
    const sustained = ['march', 'spiderLoop', 'fleaLoop', 'scorpionLoop'] as const
    expect(
      new Set(sustained.map((s) => CHANNELS[s])).size,
      'sustained voices sharing a channel would cut each other off',
    ).toBe(sustained.length)
  })
})

describe('cp6-3 AC-5 — the inventions ring THROUGH an explosion (user ruling)', () => {
  it('the mushroom sounds during a death window in which a kill is refused', async () => {
    const engine = await readyEngine()
    playAs(engine, 'playerDeath')

    playAs(engine, 'segmentKill')
    expect(rec.started, 'the ROM cue is refused…').toEqual(['playerDeath'])

    playAs(engine, 'mushroom')
    expect(
      rec.started,
      '…and the INVENTION is not, because the cabinet has no opinion about a sound it ' +
        'never makes. Arbitrating it would invent behaviour rather than transcribe it.',
    ).toEqual(['playerDeath', 'mushroom'])
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// AC-4 — the frame clock is driven, or the window never expires
// ═══════════════════════════════════════════════════════════════════════════

describe('cp6-3 AC-4 — playEventSounds carries the voice clock', () => {
  interface Call {
    kind: string
    sound?: string
  }
  const recordingAudio = () => {
    const calls: Call[] = []
    return {
      calls,
      play: (sound: string) => void calls.push({ kind: 'play', sound }),
      startLoop: (sound: string) => void calls.push({ kind: 'startLoop', sound }),
      stopLoop: (sound: string) => void calls.push({ kind: 'stopLoop', sound }),
      tick: () => void calls.push({ kind: 'tick' }),
    }
  }
  type Dispatch = (a: unknown, e: readonly { type: string }[]) => void

  it('ticks exactly once per call, BEFORE any cue', () => {
    const audio = recordingAudio()
    ;(playEventSounds as unknown as Dispatch)(audio, [
      { type: 'segment-killed' },
      { type: 'shot-fired' },
    ])
    expect(
      audio.calls.map((c) => c.kind),
      'the machine decrements its timer at the top of the frame and only then queues a ' +
        'sound; ticking afterwards would give every cue an extra frame of window',
    ).toEqual(['tick', 'play', 'play'])
  })

  it('ticks on a SILENT frame too — a quiet stretch must still expire the window', () => {
    const audio = recordingAudio()
    ;(playEventSounds as unknown as Dispatch)(audio, [])
    expect(
      audio.calls.map((c) => c.kind),
      'skipping the tick when nothing sounds would freeze the voice for the whole quiet ' +
        'stretch, and the first death would refuse every kill for the rest of the run',
    ).toEqual(['tick'])
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// AC-6 — the death-instant channel clear (user ruling: folded in)
// ═══════════════════════════════════════════════════════════════════════════

const IDLE = { dh: 0, dv: 0, fire: false }
const kindsOf = (s: SimState): string[] => (s.events as readonly GameEvent[]).map((e) => e.type)

/**
 * Free-run until the stream OPENS a spider voice, and return the frame it did.
 *
 * The sim has to spawn it: a spider written straight into the input state is
 * already audible on the way in, so `loopEdges` sees `was === now` and emits
 * nothing. Only a voice the stream actually opened can be observed to close.
 */
function runToSpiderRinging(seed: number): { state: SimState; opened: boolean } {
  let cur = createSim(seed)
  for (let f = 0; f < 20000; f++) {
    cur = stepSim(cur, IDLE)
    if (kindsOf(cur).includes('player-died')) return { state: cur, opened: false }
    if (kindsOf(cur).includes('spider-start')) return { state: cur, opened: true }
  }
  return { state: cur, opened: false }
}

/** Stage a segment on the gun, so the very next step kills the player. */
function stagedDeath(seed: number, withSpider: boolean): SimState {
  const s = createSim(seed)
  const onGun: Segment = { h: s.player.h, v: s.player.v, dh: 2, dv: 2, pic: CENT_BODY_PIC }
  return {
    ...s,
    segs: [onGun],
    ...(withSpider ? { spider: { ...s.spider, pic: SPIDER_PIC_MIN, h: 0x40, v: 0x40 } } : {}),
  } as SimState
}

describe('cp6-3 AC-6 — the loops stop ON the death frame, not at the end of the pause', () => {
  it('a spider on screen is silenced by the death ITSELF (CENTI4.MAC:1813-1818)', () => {
    const staged = stagedDeath(0x1234, true)
    const died = stepSim(staged, IDLE)
    const kinds = kindsOf(died)

    expect(kinds, 'precondition: the staged contact must kill the gun').toContain('player-died')
    expect(
      kinds,
      "the ROM zeroes CHAN3 on the death frame, so the spider's voice must close on the SAME " +
        'frame the explosion opens — today it survives to the end of the ~48-frame pause',
    ).toContain('spider-stop')
  })

  it('the march still stops on the death frame — the half that was already right', () => {
    // marchAudible already carries `s.delay === 0`, and `player-died+march-stop`
    // is a recorded composition in audio-wiring.test.ts. This guards against a
    // fix that moves the creature loops by breaking the march.
    const staged = stagedDeath(0x1234, false)
    const died = stepSim(staged, IDLE)
    expect(kindsOf(died)).toContain('player-died')
    expect(kindsOf(died), 'the march must not regress').toContain('march-stop')
  })

  // ─── the other two thirds of the clear, added in GREEN ─────────────────────
  // AC-6 names the spider, the flea AND the scorpion, and the ROM clears CHAN1
  // and CHAN6 alongside CHAN3. The RED above pinned only the spider, and the
  // mutation battery proved that gap was real: deleting `!dying(s)` from
  // `fleaAudible` — and, separately, from `scorpionAudible` — left the whole
  // 1150-test project GREEN. Two thirds of the fix were unobserved.
  //
  // Both slots are STAGED rather than free-run, and that is sound for a `-stop`
  // in a way it would not be for a `-start`: `loopEdges` takes its edge by
  // comparing the state handed IN against the state handed BACK, so a voice
  // already audible on the way in is exactly the precondition a closing edge
  // needs. (The trap is the opposite direction — see the positive control below.)
  // Each is paired with a no-death CONTROL, because "a `-stop` appeared" would
  // otherwise be satisfiable by staging that is simply invalid.

  /** Slot 12 carrying a live flea: below the parked row, on the picture the sim
   *  itself seeds. `FLEA_PARK_PIC` and not a hand-written byte — `fleaAudible`
   *  only asks `!isScorpion(pic)`, so any low number is green here, and a fixture
   *  whose picture the machine cannot produce (0x1c-0x1f is the whole band) would
   *  pass for a reason that evaporates the day the predicate checks the range. */
  const withFlea = (s: SimState): SimState => ({
    ...s,
    flea: { ...s.flea, pic: FLEA_PARK_PIC, v: FLEA_PARK_V - 0x40 },
  })

  /** The same slot carrying a scorpion instead — 0x30..0x33 is the live band. */
  const withScorpion = (s: SimState): SimState => ({
    ...s,
    flea: { ...s.flea, pic: SCORP_PIC_LOW, v: FLEA_PARK_V - 0x40 },
  })

  it('a flea on screen is silenced by the death ITSELF (CHAN1, CENTI4.MAC:1813-1818)', () => {
    const control = stepSim(withFlea(createSim(0x1234)), IDLE)
    expect(kindsOf(control), 'control: an ordinary frame must NOT close the flea').not.toContain(
      'flea-stop',
    )

    const died = stepSim(withFlea(stagedDeath(0x1234, false)), IDLE)
    expect(kindsOf(died), 'precondition: the staged contact must kill the gun').toContain(
      'player-died',
    )
    expect(
      kindsOf(died),
      "the flea rides CHAN1's computed AUDF1 path, which PLAYEX zeroes on the death frame",
    ).toContain('flea-stop')
  })

  it('a scorpion crossing is silenced by the death ITSELF (CHAN6, CENTI4.MAC:1818)', () => {
    const control = stepSim(withScorpion(createSim(0x1234)), IDLE)
    expect(
      kindsOf(control),
      'control: an ordinary frame must NOT close the scorpion',
    ).not.toContain('scorpion-stop')

    const died = stepSim(withScorpion(stagedDeath(0x1234, false)), IDLE)
    expect(kindsOf(died), 'precondition: the staged contact must kill the gun').toContain(
      'player-died',
    )
    expect(kindsOf(died), 'CHAN6 is the scorpion, and :1818 is the line that zeroes it').toContain(
      'scorpion-stop',
    )
  })

  it('a WAVE clear does NOT silence them — the ROM clears no channel there', () => {
    // The discriminator, and the third mutant the RED could not see: keying the
    // clear on `delay > 0` instead of `playerExplode > 0` also left the project
    // GREEN. Both pauses set `delay`; only the death clears channels. Clearing a
    // wave is ":2319 STA DELAY" and nothing else, and sim.ts's own comment says
    // the spider is deliberately NOT re-parked here — a spider mid-walk carries
    // straight into the next wave, on the cabinet and here.
    const s = createSim(0x1234)
    const staged = {
      ...s,
      segs: [{ h: 0x40, v: 0x40, dh: 2, dv: 2, pic: CENT_BODY_PIC | DEAD_BIT }] as Segment[],
      spider: { ...s.spider, pic: SPIDER_PIC_MIN, h: 0x40, v: 0x40 },
    } as SimState

    const cleared = stepSim(staged, IDLE)
    expect(kindsOf(cleared), 'precondition: every segment is dead, so the wave clears').toContain(
      'wave-cleared',
    )
    expect(cleared.delay, 'precondition: the wave pause is armed').toBe(WAVE_DELAY)
    expect(
      cleared.playerExplode,
      'precondition: the wave pause is distinguished from a death by playerExplode staying 0',
    ).toBe(0)
    expect(
      kindsOf(cleared),
      'a wave clear must leave the creature voices alone — CENTI4.MAC:2319 sets DELAY and writes ' +
        'no channel. Keying the clear on `delay` rather than `playerExplode` silences them here too.',
    ).not.toContain('spider-stop')
  })

  it('POSITIVE CONTROL — a spider voice really is opened by the stream, and stays open', () => {
    // Without this, the sweep below proves nothing. Note WHY a staged spider is
    // not enough: `loopEdges` takes the edge by comparing the state handed IN
    // against the state handed BACK, so a spider already audible on the way in
    // produces `was === now` and NO `spider-start` at all. An edge counter then
    // starts at zero, stays at zero, and "nothing was left ringing" is true of a
    // voice that was never heard. The spider has to be spawned by the sim.
    const { state, opened } = runToSpiderRinging(0x1234)
    expect(opened, 'the sim must actually spawn a spider within the budget').toBe(true)
    expect(state.phase, 'and it must still be a playing frame').toBe('playing')
  })

  it('no creature voice is left ringing anywhere inside the death pause', () => {
    const { state, opened } = runToSpiderRinging(0x1234)
    expect(opened, 'precondition: a spider voice is ringing before the death').toBe(true)
    let open = 1

    const onGun: Segment = {
      h: state.player.h,
      v: state.player.v,
      dh: 2,
      dv: 2,
      pic: CENT_BODY_PIC,
    }
    let cur = stepSim({ ...state, segs: [onGun] } as SimState, IDLE)
    expect(kindsOf(cur), 'precondition: the contact kills the gun').toContain('player-died')
    for (const k of kindsOf(cur)) {
      if (k === 'spider-start') open++
      if (k === 'spider-stop') open--
    }
    expect(
      open,
      'the voice must be closed by the death frame ITSELF (CENTI4.MAC:1813-1818), not by the ' +
        'pause ending ~48 frames later',
    ).toBe(0)

    for (let i = 0; i < 200 && cur.delay > 0; i++) {
      cur = stepSim(cur, IDLE)
      for (const k of kindsOf(cur)) {
        if (k === 'spider-start') open++
        if (k === 'spider-stop') open--
      }
      expect(open, `a creature voice was ringing ${i + 1} frames into the death pause`).toBe(0)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// AC-7 — the dossier gains the rule it does not currently carry
// ═══════════════════════════════════════════════════════════════════════════

describe('cp6-3 AC-7 — voice 0s contention is RECORDED, where voice 1s already is', () => {
  it('the fixture carries a voice-0 arbitration record', () => {
    const fx = loadFixture()
    expect(
      fx.voice0Arbitration,
      "cp6-1 recorded POKEY voice 1's four-way contention and nothing recorded voice 0's. A " +
        'term scan of the fixture scores zero for 2437, AUDF0, AUDC0 and the 52$ label, so the ' +
        'rule this story models is written down nowhere.',
    ).toBeDefined()
  })

  it('it names the contenders the cue map already agrees on, and says which one wins', () => {
    const arb = loadFixture().voice0Arbitration
    expect([...(arb?.contenders ?? [])].sort(), 'the record must agree with the cue map').toEqual(
      voice0Cues(),
    )
    expect(arb?.winner, 'the explosion wins outright — that is the whole ruling').toBe('playerDeath')
  })

  it('it cites the branch that IS the mechanism', () => {
    const cites = loadFixture().voice0Arbitration?.cites ?? []
    expect(
      cites.some((c) => c.includes('2437')),
      'CENTI4.MAC:2437 is the sole reference to the CHAN0 block — the citation without which ' +
        'the ruling is an assertion',
    ).toBe(true)
    expect(
      cites.some((c) => c.includes('1813') || c.includes('1818')),
      'and the death-frame channel clear at CENTI4.MAC:1813-1818',
    ).toBe(true)
  })

  it('the voice-1 record is left exactly as cp6-1 wrote it', () => {
    // AC-7 says add, not edit. cp6-1's ruling stands on its own citations.
    const arb = loadFixture().voiceArbitration
    expect([...(arb?.contenders ?? [])].sort()).toEqual([
      'bonusLife',
      'fleaLoop',
      'march',
      'scorpionLoop',
    ])
    expect(arb?.cites?.length, "cp6-1's fourteen citations must survive").toBe(14)
  })
})
