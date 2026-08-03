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
  PLAYER_EXPLODE_START,
  type SimState,
} from '../src/core/sim'
import { CENT_BODY_PIC, DEAD_BIT, type Segment } from '../src/core/centipede'
import { BONUS_INCREMENT } from '../src/core/bonus'
import { SPIDER_OFF_PIC, SPIDER_PIC_MIN } from '../src/core/spider'
import { FLEA_PARK_V } from '../src/core/flea'
import { isScorpion } from '../src/core/scorpion'
import { MUSHROOM_FULL, PLYFLD_STRIDE, SCORE_RESTORE } from '../src/core/playfield'

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

  it('a bonus awarded by the RESTOR sweep emits it too — the OTHER award path', () => {
    // REWORK (Reviewer round 1, MEDIUM). `awardBonus` runs on two funnels, not
    // one: the play frame's, and the death pause's, because RESTOR pays 5 a cell
    // as it repairs (:1850-1857) and a long sweep can cross the threshold
    // mid-death. Only the first was wired, so the ROM's :1994-1995 cue was
    // reachable from half its causes. bonus-lives.test.ts:314 exists precisely
    // because this path can cross, so the fixture is its, deliberately.
    //
    // Control vs treatment, because a death also SPENDS a life: the only
    // difference between the two runs is the starting score.
    const drive = (startScore: number): { end: SimState; seen: string[] } => {
      let s: SimState = { ...createSim(0x2222), score: startScore } as SimState
      for (const [h, v] of [
        [5, 6],
        [8, 7],
        [12, 3],
        [20, 9],
      ] as Array<[number, number]>) {
        s.playfield.cells[h * PLYFLD_STRIDE + v] = MUSHROOM_FULL - 1
      }
      s = { ...s, segs: [{ h: s.player.h, v: s.player.v, dh: 2, dv: 2, pic: 0x03 }] } as SimState
      const seen: string[] = []
      let armed = false
      // Exit on `delay`, never on `lives` — the treatment run ends where it
      // started and a "stepped down yet?" loop would run into a SECOND death.
      for (let i = 0; i < 4000; i++) {
        s = stepSim(s, IDLE)
        seen.push(...kindsOf(s))
        if (!armed && s.delay > 0) armed = true
        else if (armed && s.delay === 0) return { end: s, seen }
      }
      throw new Error('test setup failed: the death pause never ended within the frame budget')
    }

    const control = drive(0)
    expect(
      control.end.score,
      'fixture sanity: the sweep must actually score, or this test proves nothing',
    ).toBeGreaterThan(0)
    expect(control.seen, 'the control crosses no threshold').not.toContain('bonus-life')

    const treatment = drive(BONUS_INCREMENT - control.end.score)
    expect(
      treatment.end.lives,
      'the death costs a life and the sweep buys one back — so `lives` alone cannot see this',
    ).toBe(control.end.lives + 1)
    expect(
      treatment.seen,
      'the sweep awarded a life mid-death and the cue the ROM writes at :1994-1995 never fired',
    ).toContain('bonus-life')
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

  it('a DEATH-PAUSE frame does not repeat the cue that armed it', () => {
    // The rebuild has TWO halves and the test above only exercises one.
    // `stepPlayingFrame` allocates a fresh array on entry, so a playing frame
    // cannot carry anything forward however the clear is written — the clear is
    // only load-bearing on the paths that return `{ ...state }`, and the death
    // pause is the long one. Found by mutation: carrying the stale array forward
    // in stepSim left all 955 tests green, because nothing looked HERE.
    const s = createSim(0x1234)
    const onGun: Segment = { h: s.player.h, v: s.player.v, dh: 2, dv: 2, pic: CENT_BODY_PIC }
    const death = stepSim({ ...s, segs: [onGun] } as SimState, IDLE)
    expect(kindsOf(death), 'precondition: the gun must die').toContain('player-died')
    expect(death.delay, 'precondition: the pause must be armed').toBe(DEATH_DELAY)

    const paused = stepSim(death, IDLE)
    expect(paused.delay, 'precondition: still inside the pause').toBeGreaterThan(0)
    expect(
      kindsOf(paused),
      'the pause replayed the death frame\'s cues — 0x30 frames of "the gun exploded" in a row',
    ).toEqual([])
  })

  it('a long idle run drains to an empty stream instead of accumulating', () => {
    // The unbounded-growth shape of the same bug: if the array is appended to,
    // it grows forever and the shell replays the whole game every frame.
    //
    // REWORK (Reviewer round 1, MEDIUM): this bound was `< EXPECTED_KINDS.length`
    // (< 18) while the measured value is 0. A regression leaking a small constant
    // per frame — which is EXACTLY the shape of the dropped loop-stop this round
    // fixed — sails through `< 18` forever. Pinned to the real number.
    let s: SimState = stepSim(createSim(0x1234), FIRE)
    for (let i = 0; i < 120; i++) s = stepSim(s, IDLE)
    expect(
      streamOf(s).length,
      'the stream never drained — events are accumulating across frames',
    ).toBe(0)
  })

  it('a fresh game reseeded through START emits the march and nothing else', () => {
    // stepPhase's restart (sim.ts:866) rebuilds from createSim; a stream that
    // survived the reseed would replay the last life's cues over the new one.
    //
    // REWORK (Reviewer round 1, MEDIUM): `< 18` again, where the measured stream
    // is exactly one event. It is not empty and must not be: the reseeded game
    // has a live train at delay 0, so the march becomes audible on this very
    // frame and its `-start` is due. Pinning the CONTENT rather than a loose
    // bound is what makes this test able to see a stale attract cue.
    let s: SimState = stepSim(createAttract(0x1234), { ...FIRE, start: true })
    expect(kindsOf(s), 'the START frame carries the march edge and no carried-in cue').toEqual([
      'march-start',
    ])
    s = stepSim(s, IDLE)
    expect(Array.isArray(ext(s).events)).toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC4 — a loop that opens must CLOSE, observed in play
//
// REWORK (Reviewer round 1, HIGH). The suite this file shipped with proved that
// the dispatch turns a `-start` into `startLoop`, and that the union carries a
// `-stop` for every `-start`. Neither of those is the property AC4 is about,
// which is that the STREAM the sim produces closes what it opens. The seam
// shipped green over a real leak: the spider's `-stop` was computed inside
// `stepPlayingFrame`, so the reset that happens on the death pause's exit — not
// a playing frame — dropped it, and the spider's loop rang over an empty screen
// for 192 frames of a 6000-frame run.
//
// The tests below observe the loops IN PLAY, which is the only place that bug
// exists. Nothing here hand-builds an event.
// ═════════════════════════════════════════════════════════════════════════════

/** What a shell driven by this stream believes is ringing, after `events`. */
function applyEdges(open: Set<string>, kinds: readonly string[]): Set<string> {
  const next = new Set(open)
  for (const kind of kinds) {
    if (kind.endsWith('-start')) next.add(kind.slice(0, -'-start'.length))
    else if (kind.endsWith('-stop')) next.delete(kind.slice(0, -'-stop'.length))
  }
  return next
}

/** What is ACTUALLY sounding in this state, read from the sim, not the stream.
 *  Deliberately a second, independent expression of the same predicates
 *  `sim.ts` uses — if it were imported from there the comparison below would be
 *  the code agreeing with itself. */
function trulyAudible(s: SimState): Set<string> {
  const live = new Set<string>()
  if (s.phase !== 'playing') return live
  // cp6-3 — PLAYEX's death-instant clear, stated here in the ROM's terms rather
  // than copied from the fix: ":1813 35$: LDA I,0 ;NO OTHER SOUNDS" through
  // ":1818 STA CHAN6" zeroes CHAN0, CHAN1, CHAN2, CHAN3 and CHAN6 on the frame
  // the gun dies, which is every sustained voice at once. A spider is still ON
  // SCREEN through the explosion — it is not RINGING, and this function answers
  // the second question. `playerExplode` and not `delay`, because the wave-clear
  // pause sets `delay` too and the ROM clears nothing there (":2319 STA DELAY"
  // is the whole of it).
  if (s.playerExplode > 0) return live
  if (s.delay === 0 && s.segs.some((seg) => (seg.pic & DEAD_BIT) === 0)) live.add('march')
  if (s.spider.pic !== SPIDER_OFF_PIC) live.add('spider')
  if (s.flea.v < FLEA_PARK_V && !isScorpion(s.flea.pic)) live.add('flea')
  if (isScorpion(s.flea.pic)) live.add('scorpion')
  return live
}

describe('cp5-1 AC4 — every sustained loop the stream opens, the stream closes', () => {
  it('a spider on screen when the gun dies is told to STOP', () => {
    // The reviewer's reproduction, staged rather than hunted: the spider is
    // reset by stepDeathFrame's BUGOFF re-run (sim.ts, the respawn branch), on a
    // frame stepPlayingFrame never sees. An edge computed in the playing frame
    // cannot be there to notice.
    const s = createSim(0x1234)
    const onGun: Segment = { h: s.player.h, v: s.player.v, dh: 2, dv: 2, pic: CENT_BODY_PIC }
    const staged = {
      ...s,
      segs: [onGun],
      spider: { ...s.spider, pic: SPIDER_PIC_MIN, h: 0x40, v: 0x40 },
    } as SimState

    let cur = stepSim(staged, IDLE)
    expect(cur.delay, 'precondition: the staged contact must kill the gun').toBe(DEATH_DELAY)
    expect(kindsOf(cur)).toContain('player-died')
    expect(
      trulyAudible(staged).has('spider'),
      'precondition: the spider must be on screen when the gun dies',
    ).toBe(true)

    // Run the pause out to the respawn, collecting every frame's stream.
    const seen: string[] = [...kindsOf(cur)]
    for (let i = 0; i < DEATH_DELAY * 8 && cur.delay > 0; i++) {
      cur = stepSim(cur, IDLE)
      seen.push(...kindsOf(cur))
    }
    expect(cur.delay, 'the pause must actually end within the budget').toBe(0)
    expect(
      trulyAudible(cur).has('spider'),
      'precondition: the respawn must have re-parked the spider',
    ).toBe(false)
    expect(
      seen,
      'the spider went off screen across the death pause and its loop was never stopped — ' +
        'startLoop rings until stopLoop, so the shell skitters over an empty screen',
    ).toContain('spider-stop')
  })

  it('over a long played run, no loop is ever left open over a silent screen', () => {
    // The general form, and the one that would have caught this without anyone
    // guessing the death pause was the culprit: replay a real seeded run and
    // hold the shell's belief (derived from the events ALONE) against the sim's
    // actual state, every frame.
    //
    // The run starts in ATTRACT and presses START, which is how a game is
    // actually entered. That is not incidental: an edge-driven loop only ever
    // learns about a TRANSITION, so a shell handed a `createSim` state that is
    // already marching would never be told to start it — there is no edge to
    // emit. Attract is silent, so the press IS the edge, and the belief and the
    // screen agree from the first frame.
    let s: SimState = createAttract(0x2468)
    let open = new Set<string>()
    const disagreements: string[] = []
    const moved = new Set<string>()

    for (let i = 0; i < 6000; i++) {
      const prev = trulyAudible(s)
      s = stepSim(s, i === 0 ? { ...IDLE, start: true } : scriptedInput(i))
      open = applyEdges(open, kindsOf(s))
      const actual = trulyAudible(s)
      for (const voice of prev) if (!actual.has(voice)) moved.add(voice)
      for (const voice of actual) if (!prev.has(voice)) moved.add(voice)
      for (const voice of new Set([...open, ...actual])) {
        if (open.has(voice) !== actual.has(voice)) {
          const believed = open.has(voice) ? 'ringing' : 'silent'
          disagreements.push(
            `frame ${i}: ${voice} ${believed} in the stream, ${actual.has(voice) ? 'on' : 'off'} screen`,
          )
        }
      }
    }

    // NON-VACUITY: a run in which no loop ever opened would agree perfectly, so
    // count the DISTINCT voices that actually moved, not raw transitions — a
    // single voice flickering would run the counter up while leaving the other
    // three unexercised. Measured across six seeds, ordinary play works the
    // march, the spider and the flea; the scorpion needs waves this run does not
    // reach, and is covered by its own staged tests.
    expect(
      [...moved].sort(),
      'fewer than two sustained voices changed state — the sweep proves almost nothing',
    ).toEqual(['flea', 'march', 'spider'])
    expect(
      disagreements.slice(0, 5),
      `${disagreements.length} frames where the loop the stream opened is not the loop on screen`,
    ).toEqual([])
  })

  it('a game ENDING stops every loop it left ringing', () => {
    // The other exit stepPlayingFrame cannot see: the last life is spent inside
    // stepDeathFrame, which returns phase `gameover`. A spider still skittering
    // over the high-score screen is the same defect wearing a different hat.
    //
    // The spider is staged deliberately, and the assertion below leans on it:
    // this run's centipede is DEAD by the time the game ends, so the march would
    // have gone quiet on the death frame no matter what the phase said. The
    // spider is the only voice here whose `-stop` the phase gate alone produces
    // — without it this test passes over a gate that does nothing.
    const s = createSim(0x1234)
    const onGun: Segment = { h: s.player.h, v: s.player.v, dh: 2, dv: 2, pic: CENT_BODY_PIC }
    const staged = {
      ...s,
      segs: [onGun],
      lives: 1,
      spider: { ...s.spider, pic: SPIDER_PIC_MIN, h: 0x40, v: 0x40 },
    } as SimState
    let cur = stepSim(staged, IDLE)
    expect(kindsOf(cur), 'precondition: the gun must die').toContain('player-died')

    const seen: string[] = [...kindsOf(cur)]
    for (let i = 0; i < DEATH_DELAY * 8 && cur.phase === 'playing'; i++) {
      cur = stepSim(cur, IDLE)
      seen.push(...kindsOf(cur))
    }
    expect(cur.phase, 'precondition: the last life must end the game').toBe('gameover')
    expect(
      cur.spider.pic,
      'precondition: the spider is STILL on the board at game over — the ROM never re-parks it ' +
        'on this path, so only the end of the run can silence it',
    ).not.toBe(SPIDER_OFF_PIC)

    // Seeded with what was ACTUALLY sounding when observation began, not with
    // an empty set: the spider and the march were both already ringing, and
    // `delete` on a voice the set never held is a no-op — so an empty seed would
    // make a MISSING `-stop` indistinguishable from a delivered one. (Written
    // empty first, and it passed over a deliberately weakened phase gate.)
    const stillOpen = applyEdges(trulyAudible(staged), seen)
    expect(
      [...stillOpen],
      'the run is over and these loops were never told to stop — they ring over the high-score screen',
    ).toEqual([])
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

  it('and it stays silent through a demo DEATH, where the sweep can award a life', () => {
    // The demo's second exit. `stepAttractDemo` hands a pause frame straight to
    // `stepDeathFrame`, which — since this round wired the sweep's award (see
    // the RESTOR test above) — now EMITS. The 300-frame sweep in the test above
    // cannot see this: it never crosses a bonus threshold, so it stayed green
    // over a hole in the silence. Staged directly at the branch.
    const s = createAttract(0x2024)
    for (const [h, v] of [
      [5, 6],
      [8, 7],
      [12, 3],
      [20, 9],
    ] as Array<[number, number]>) {
      s.playfield.cells[h * PLYFLD_STRIDE + v] = MUSHROOM_FULL - 1
    }
    let cur: SimState = {
      ...s,
      score: BONUS_INCREMENT - SCORE_RESTORE,
      delay: DEATH_DELAY,
      playerExplode: PLAYER_EXPLODE_START,
    } as SimState

    const seen: string[] = []
    let awarded = false
    for (let i = 0; i < DEATH_DELAY * 8 && cur.delay > 0; i++) {
      const before = cur.lives
      cur = stepSim(cur, IDLE)
      if (cur.lives > before) awarded = true
      seen.push(...kindsOf(cur))
    }
    expect(cur.phase, 'precondition: the demo never leaves attract').toBe('attract')
    expect(
      awarded,
      'precondition: the sweep must actually award a life, or there is no cue to leak',
    ).toBe(true)
    expect(seen, 'the attract demo must stay silent on this exit too').toEqual([])
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
