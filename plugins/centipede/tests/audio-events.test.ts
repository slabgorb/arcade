// tests/audio-events.test.ts
//
// Story cp5-1 — RED phase (Leeloo / TEA). The CORE half of the audio seam: a
// discriminated union of the gameplay moments the sim already computes, emitted
// as DATA on the state and never as callbacks, so the core stays pure and a
// fixed seed replays an identical event stream.
//
// Covers AC1 (the union exists, the sim emits it, purity survives) and AC2 (a
// fixed seed and input stream replay an identical stream).
//
// ─── WHY THE IMPORTS ARE COMPUTED ────────────────────────────────────────────
// `src/core/events.ts` does not exist yet and the RED tree must stay
// `npm run lint` (tsc --noEmit) clean. A literal `import('../src/core/events')`
// — static OR dynamic — is TS2307 while the file is absent. So the specifier is
// assembled at runtime: tsc cannot resolve a non-literal, vitest can. This is
// the same idiom `tests/bonus-lives.test.ts:133-159` used for cp4-4, kept
// deliberately identical so there is one shape to learn.
//
// ─── THE TRAP THIS FILE IS BUILT AROUND ──────────────────────────────────────
// AC2 asks for replay determinism, and "the same seed gives the same stream" is
// the single easiest vacuous test in this repo to write:
//
//   1. If `events` is always EMPTY, two empty streams compare equal and the
//      assertion can never fail. Every determinism test below is therefore
//      PAIRED, in the same test, with a positive assertion that the stream
//      actually contains something.
//   2. Replay determinism CANNOT see a missing per-frame clear. A stale event
//      carried forward from frame N is carried forward identically in both
//      runs, so both streams still match. The clear needs its own, different
//      test — `the stream is REBUILT each frame` below — which steps past a
//      triggering frame and demands the event be GONE.
//
// The asteroids precedent seeds `events: []` at every phase entry with the
// comment "no gameplay-audio events in attract; never carry a stale frame's
// forward" (plugins/asteroids/src/core/sim.ts:179,194,212). Both halves of that
// comment are pinned here.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { violations as scan } from './helpers/purity-scanner.js'
import {
  createSim,
  createAttract,
  stepSim,
  WAVE_DELAY,
  DEATH_DELAY,
  type SimState,
} from '../src/core/sim'
import { CENT_BODY_PIC, DEAD_BIT, type Segment } from '../src/core/centipede'
import { BONUS_INCREMENT } from '../src/core/bonus'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const eventsPath = join(repoRoot, 'src', 'core', 'events.ts')

// ─── the not-yet-existing module ─────────────────────────────────────────────

/** The runtime surface `src/core/events.ts` must expose. The KIND LIST is a
 *  runtime value on purpose: AC4 requires the manifest and channel map to cover
 *  "every event kind", and a coverage check that reads a hand-maintained list
 *  in the TEST is scenery — it agrees with itself forever while the union drifts
 *  underneath it. Deriving the union FROM this tuple
 *  (`type GameEventKind = (typeof EVENT_KINDS)[number]`) is what makes the
 *  manifest tests in audio-manifest.test.ts mechanically true instead of
 *  merely maintained. */
interface EventsModule {
  EVENT_KINDS: readonly string[]
}

const EVENTS_SPECIFIER = ['..', 'src', 'core', 'events'].join('/')
let cached: Partial<EventsModule> | undefined

async function loadEvents(): Promise<Partial<EventsModule>> {
  if (cached) return cached
  try {
    cached = (await import(/* @vite-ignore */ EVENTS_SPECIFIER)) as Partial<EventsModule>
  } catch {
    cached = {}
  }
  return cached
}

async function eventKinds(): Promise<readonly string[]> {
  const mod = await loadEvents()
  const kinds = mod.EVENT_KINDS
  if (kinds === undefined) {
    throw new Error(
      'cp5-1 not implemented yet: src/core/events.ts must exist and export `EVENT_KINDS` ' +
        '(a readonly tuple of every event kind, with the GameEvent union derived from it).',
    )
  }
  return kinds
}

// The sim grows an `events` field; until GREEN adds it every read below is
// `undefined`, which reddens against an array.
interface GameEventLike {
  readonly type: string
}
type SimWithEvents = SimState & { readonly events: readonly GameEventLike[] }
const ext = (s: SimState): SimWithEvents => s as SimWithEvents

/** The emitted stream for a state, with a clear failure when the field is
 *  absent — so a missing seam reds as "no events field" and never as an opaque
 *  `undefined is not iterable` three assertions later. */
function streamOf(s: SimState): readonly GameEventLike[] {
  const events = ext(s).events
  expect(Array.isArray(events), 'stepSim must return an `events` array on the state').toBe(true)
  return events
}

const kindsOf = (s: SimState): string[] => streamOf(s).map((e) => e.type)

const IDLE = { dh: 0, dv: 0, fire: false }
const FIRE = { dh: 0, dv: 0, fire: true }

/** A deterministic, NON-random input stream: the frame index alone decides the
 *  input, so a replay is reproducible without touching the seeded rng (whose
 *  determinism is not what AC2 is about). */
const scriptedInput = (frame: number) => ({
  dh: (frame % 7) - 3,
  dv: (frame % 5) - 2,
  fire: frame % 3 === 0,
})

/** Run `frames` frames from `start`, collecting every frame's emitted stream. */
function runCollecting(
  start: SimState,
  frames: number,
  input: (frame: number) => { dh: number; dv: number; fire: boolean },
): { states: SimState[]; perFrame: string[][] } {
  let s = start
  const states: SimState[] = []
  const perFrame: string[][] = []
  for (let i = 0; i < frames; i++) {
    s = stepSim(s, input(i))
    states.push(s)
    perFrame.push(kindsOf(s))
  }
  return { states, perFrame }
}

/** Stage a live shot one step below a body segment in the gun's column on a
 *  cleared field — `tests/bonus-lives.test.ts:171-185`'s `armedBodyKill`. One
 *  step kills the segment and scores SCORE_BODY. */
function armedBodyKill(seed: number, over: Partial<SimState> = {}): SimState {
  const s = createSim(seed)
  s.playfield.cells.fill(0) // no mushroom to intercept the shot
  const body: Segment = { h: s.player.h, v: 0x47, dh: 2, dv: 2, pic: CENT_BODY_PIC }
  return {
    ...s,
    shot: { h: s.player.h, v: 0x40, live: true },
    segs: [body],
    ...over,
  } as SimState
}

// ═════════════════════════════════════════════════════════════════════════════
// AC1 — the union exists, and it names the moments the sim already computes
// ═════════════════════════════════════════════════════════════════════════════

// Every moment `stepPlayingFrame` already resolves, and nothing it does not.
// One-shots first, then the sustained pairs. Grounded in sim.ts as it stands:
//   shot-fired            stepShot's launch          (sim.ts:360)
//   mushroom-destroyed    stepShot consumed a mushroom
//   segment-killed        resolveShotHit             (sim.ts:506)
//   spider-killed         resolveSpiderShotHit       (sim.ts:460)
//   flea-killed           resolveFleaShotHit         (sim.ts:496)
//   scorpion-killed       resolveScorpionShotHit     (sim.ts:490)
//   head-reached-bottom   the NEWD arm               (sim.ts:570)
//   player-died           the PLAYEX branch          (sim.ts:578)
//   wave-cleared          the DEAD==0 branch         (sim.ts:597)
//   bonus-life            awardBonus awarded         (sim.ts:564)
// The sustained pairs are the cabinet's continuous voices: the centipede's
// marching tick, and each creature's presence while it is on screen.
const EXPECTED_ONE_SHOTS = [
  'shot-fired',
  'mushroom-destroyed',
  'segment-killed',
  'spider-killed',
  'flea-killed',
  'scorpion-killed',
  'head-reached-bottom',
  'player-died',
  'wave-cleared',
  'bonus-life',
] as const

const EXPECTED_LOOP_PAIRS = [
  ['march-start', 'march-stop'],
  ['spider-start', 'spider-stop'],
  ['flea-start', 'flea-stop'],
  ['scorpion-start', 'scorpion-stop'],
] as const

const EXPECTED_KINDS: readonly string[] = [
  ...EXPECTED_ONE_SHOTS,
  ...EXPECTED_LOOP_PAIRS.flat(),
]

describe('cp5-1 AC1 — core/events.ts declares the event channel', () => {
  it('the module exists at src/core/events.ts', () => {
    expect(existsSync(eventsPath), 'cp5-1 must create src/core/events.ts').toBe(true)
  })

  it('exports EVENT_KINDS covering every moment the sim already computes', async () => {
    const kinds = await eventKinds()
    // Non-vacuity first: an empty tuple would satisfy every `for` loop below.
    expect(kinds.length, 'EVENT_KINDS must not be empty').toBeGreaterThan(0)
    for (const kind of EXPECTED_KINDS) {
      expect(kinds, `EVENT_KINDS is missing '${kind}'`).toContain(kind)
    }
  })

  it('declares each sustained cue as a START/STOP PAIR, not a repeated one-shot', async () => {
    const kinds = await eventKinds()
    // AC4's "start and stop rather than repeated one-shots" is a property of the
    // UNION before it is a property of the manifest: a channel map cannot express
    // a loop the event channel never signals the end of.
    for (const [start, stop] of EXPECTED_LOOP_PAIRS) {
      expect(kinds, `EVENT_KINDS is missing the loop start '${start}'`).toContain(start)
      expect(kinds, `'${start}' has no matching '${stop}' — a loop that never ends`).toContain(stop)
    }
  })

  it('has no duplicate kinds — a repeated name silently collapses two cues onto one', async () => {
    const kinds = await eventKinds()
    expect(new Set(kinds).size, `duplicate kind in EVENT_KINDS: ${kinds.join(', ')}`).toBe(
      kinds.length,
    )
  })
})

describe('cp5-1 AC1 — the core stays pure with events.ts in it', () => {
  it('src/core/events.ts trips no purity rule', () => {
    expect(existsSync(eventsPath), 'cp5-1 must create src/core/events.ts').toBe(true)
    expect(scan(readFileSync(eventsPath, 'utf8'))).toEqual([])
  })

  it('the whole of src/core is still clean — the sweep that guards the boundary', () => {
    // Re-run the boundary sweep here as well as in purity.test.ts: this story
    // adds a module to core AND changes sim.ts, and a story that reddens the
    // boundary must fail in its OWN suite, not only in a neighbour's.
    const coreDir = join(repoRoot, 'src', 'core')
    const files = readdirSync(coreDir).filter((f) => f.endsWith('.ts'))
    expect(files.length, 'src/core must not be empty').toBeGreaterThan(0)
    const offenders = files.flatMap((f) => {
      const found = scan(readFileSync(join(coreDir, f), 'utf8'))
      return found.map((v) => `${f}: ${v}`)
    })
    expect(offenders).toEqual([])
  })

  it('events.ts imports nothing from shell/ — the channel is DATA, not a callback', () => {
    expect(existsSync(eventsPath), 'cp5-1 must create src/core/events.ts').toBe(true)
    const src = readFileSync(eventsPath, 'utf8')

    // The IMPORT rule scans the raw text on purpose: an import specifier IS a
    // string, so stripping strings would blind it (the cp1-1 scanner lesson).
    expect(src, 'core must never import shell code').not.toMatch(/from\s+['"][^'"]*shell\//)

    // A callback-shaped channel defeats the whole seam: the core would be
    // holding a function the shell handed it, and replay would depend on it.
    //
    // COMMENTS ARE STRIPPED FIRST, and that is not a softening — the first cut
    // of this assertion matched raw text and flagged the module's own prose
    // header ("the seam between the pure core and the shell's audio: the sim
    // appends…" — `audio:`) as a live callback. That is precisely the
    // false-positive the centipede purity scanner was rewritten to avoid
    // (tests/purity-scanner.test.ts). Comments come off BEFORE anything else:
    // an apostrophe inside one ("shell's") would otherwise open a phantom
    // string and swallow real code.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ')
    expect(code, 'the event channel must be data, not an injected sink').not.toMatch(
      /\b(play|startLoop|stopLoop)\s*[:(]/i,
    )
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC1 — the sim EMITS the channel (the seam is alive, not merely declared)
// ═════════════════════════════════════════════════════════════════════════════

describe('cp5-1 AC1 — stepSim emits the stream as state', () => {
  it('every stepped state carries an events array', () => {
    const after = stepSim(createSim(0x1234), IDLE)
    expect(Array.isArray(ext(after).events), 'stepSim must return `events` on the state').toBe(true)
  })

  it('createSim starts with an EMPTY stream — nothing has happened yet', () => {
    expect(streamOf(createSim(0x1234))).toEqual([])
  })

  it('firing the gun emits shot-fired — the channel carries an ordinary input', () => {
    // The "observed in play" guard: a seam proven only by hand-built fixtures
    // certifies its own shape, not that anything in the game reaches it. This
    // is ordinary input on a fresh sim.
    const s = createSim(0x1234)
    expect(kindsOf(stepSim(s, FIRE)), 'pressing fire must reach the event channel').toContain(
      'shot-fired',
    )
  })

  it('a CONTROL frame with no input emits no shot-fired', () => {
    // The mirror of the test above — without it, a channel that emitted
    // 'shot-fired' unconditionally every frame would pass.
    const s = createSim(0x1234)
    expect(kindsOf(stepSim(s, IDLE))).not.toContain('shot-fired')
  })

  it('killing a segment emits segment-killed', () => {
    const after = stepSim(armedBodyKill(0x1234), IDLE)
    expect(kindsOf(after)).toContain('segment-killed')
  })

  it('clearing the wave emits wave-cleared, on the frame the pause is armed', () => {
    // The DEAD==0 branch (sim.ts:597) — the staged kill empties the train.
    const after = stepSim(armedBodyKill(0x1234), IDLE)
    expect(after.delay, 'the staged kill must actually clear the wave').toBe(WAVE_DELAY)
    expect(kindsOf(after)).toContain('wave-cleared')
  })

  it('crossing the bonus threshold emits bonus-life — the cue bonus.ts held a place for', () => {
    // AC5's other half: cp4-4 wired the award and deliberately left the sound
    // out (src/core/bonus.ts:30-35). This is that deferral being closed.
    const before = armedBodyKill(0x1234, { score: BONUS_INCREMENT - 10, lives: 3 })
    const after = stepSim(before, IDLE)
    expect(after.lives, 'the staged score must actually cross the threshold').toBe(4)
    expect(kindsOf(after)).toContain('bonus-life')
  })

  it('a scoring frame that does NOT cross the threshold emits no bonus-life', () => {
    const before = armedBodyKill(0x1234, { score: 0, lives: 3 })
    const after = stepSim(before, IDLE)
    expect(after.lives).toBe(3)
    expect(kindsOf(after)).not.toContain('bonus-life')
  })

  it('the player dying emits player-died', () => {
    // Stage a body segment ON the gun: MOTION's PLAY (sim.ts:377) kills it.
    const s = createSim(0x1234)
    const onGun: Segment = { h: s.player.h, v: s.player.v, dh: 2, dv: 2, pic: CENT_BODY_PIC }
    const after = stepSim({ ...s, segs: [onGun] } as SimState, IDLE)
    expect(after.delay, 'the staged contact must actually kill the gun').toBe(DEATH_DELAY)
    expect(kindsOf(after)).toContain('player-died')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC2 — determinism, and the per-frame clear determinism cannot see
// ═════════════════════════════════════════════════════════════════════════════

describe('cp5-1 AC2 — a fixed seed and input stream replay an identical stream', () => {
  it('two runs of the same seed and script emit identical per-frame streams', () => {
    const a = runCollecting(createSim(0x2468), 400, scriptedInput)
    const b = runCollecting(createSim(0x2468), 400, scriptedInput)

    // NON-VACUITY, asserted before the comparison: two empty runs match
    // trivially, and that is the failure mode this whole AC invites.
    const total = a.perFrame.reduce((n, f) => n + f.length, 0)
    expect(total, 'the replay emitted NOTHING — the comparison below would be vacuous').toBeGreaterThan(0)
    expect(new Set(a.perFrame.flat()).size, 'the run must exercise more than one kind').toBeGreaterThan(1)

    expect(b.perFrame).toEqual(a.perFrame)
  })

  it('a DIFFERENT seed diverges — the streams are not a constant', () => {
    // The control for the test above: if `events` were hard-coded (or always
    // empty), "identical" would pass for every seed and prove nothing.
    const a = runCollecting(createSim(0x2468), 400, scriptedInput)
    const b = runCollecting(createSim(0x1357), 400, scriptedInput)
    expect(b.perFrame).not.toEqual(a.perFrame)
  })

  it('emits no wall-clock or rng-ambient variation across a re-run of the SAME state object', () => {
    // cloneState exists so a replay cannot silently diverge; the event channel
    // must not be the thing that breaks it.
    const start = createSim(0x99)
    expect(kindsOf(stepSim(start, FIRE))).toEqual(kindsOf(stepSim(start, FIRE)))
  })
})

describe('cp5-1 AC2 — the stream is REBUILT each frame, never carried forward', () => {
  it('an event present on one frame is GONE on the next when nothing re-triggers it', () => {
    // THE test replay determinism cannot make. A stale carry-forward is
    // carried identically in both runs, so the comparison above still passes
    // with the bug in. This one steps past the triggering frame and demands
    // the event be gone.
    const fired = stepSim(createSim(0x1234), FIRE)
    expect(kindsOf(fired), 'precondition: the fire frame must emit').toContain('shot-fired')

    const next = stepSim(fired, IDLE)
    expect(
      kindsOf(next),
      "'shot-fired' survived into a frame that did not fire — the stream is appended to, not rebuilt",
    ).not.toContain('shot-fired')
  })

  it('a long idle run drains to an empty stream instead of accumulating', () => {
    // The unbounded-growth shape of the same bug: if the array is appended to,
    // it grows forever and the shell replays the whole game every frame.
    let s: SimState = stepSim(createSim(0x1234), FIRE)
    for (let i = 0; i < 120; i++) s = stepSim(s, IDLE)
    expect(
      streamOf(s).length,
      'the stream never drained — events are accumulating across frames',
    ).toBeLessThan(EXPECTED_KINDS.length)
  })

  it('a fresh game reseeded through START starts from an empty stream', () => {
    // stepPhase's restart (sim.ts:866) rebuilds from createSim; a stream that
    // survived the reseed would replay the last life's cues over the new one.
    let s: SimState = stepSim(createAttract(0x1234), { ...FIRE, start: true })
    // The press that starts the game must not carry the attract demo's cues in.
    expect(streamOf(s).length).toBeLessThan(EXPECTED_KINDS.length)
    s = stepSim(s, IDLE)
    expect(Array.isArray(ext(s).events)).toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// Scope note — attract is SILENT (beyond the ACs; see the session's deviations)
// ═════════════════════════════════════════════════════════════════════════════

describe('cp5-1 — the attract demo emits no gameplay cues', () => {
  it('a self-playing attract run emits nothing, though it runs a full playing frame', () => {
    // NOT named by an AC. It is pinned because `stepAttractDemo` (sim.ts:883)
    // holds fire and calls `stepPlayingFrame` outright, so the demo genuinely
    // shoots, kills and dies — the seam would make the lobby's attract screen
    // play the whole game aloud the moment cp5's later stories bake real files.
    // The asteroids precedent seeds `events: []` in attract for exactly this
    // reason (plugins/asteroids/src/core/sim.ts:179 "no gameplay-audio events
    // in attract"). Recorded as a Design Deviation.
    const { perFrame } = runCollecting(createAttract(0x2024), 300, () => IDLE)
    expect(perFrame.flat(), 'the attract demo must stay silent').toEqual([])
  })

  it('but a STARTED game is not silent — the control that keeps the test above honest', () => {
    // Without this, "attract is silent" would also pass on a seam that emits
    // nothing anywhere, which is precisely the RED state this file starts in.
    const { perFrame } = runCollecting(createSim(0x2024), 300, scriptedInput)
    expect(perFrame.flat().length, 'a played game must emit cues').toBeGreaterThan(0)
  })
})

// A guard on the dead code the story explicitly refuses to ship: the DEAD_BIT
// import above is load-bearing for the wave-clear fixture's meaning, and this
// keeps it honest rather than letting an unused import rot.
describe('cp5-1 — fixture sanity', () => {
  it('the staged wave-clear really does leave every segment dead', () => {
    const after = stepSim(armedBodyKill(0x1234), IDLE)
    expect(after.segs.every((s) => (s.pic & DEAD_BIT) !== 0)).toBe(true)
  })
})
