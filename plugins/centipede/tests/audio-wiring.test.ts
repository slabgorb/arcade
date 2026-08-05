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
// all REAL. Four seams are wrapped, and every wrapper DELEGATES to the genuine
// implementation rather than replacing it:
//   • shell/audio      — `createAudio` returns a recording engine (AC2's fake).
//   • shell/audio-dispatch — `playEventSounds` records its arguments, then calls
//     the real dispatch, so the recording engine sees real cues.
//   • core/sim         — `stepSim` records the events each step produced.
//   • shell/timebase   — `pumpFrame` counts its own callback invocations. That
//     counter is the PUMP INDEX, and the AC1 comparison below is built on it;
//     see the REWORK note there for why a bare array-for-array compare was not
//     enough.
// Wrapping rather than replacing is what makes the AC1 comparison meaningful:
// both sides of it are the production code's own values.

import { describe, it, expect, beforeAll, vi } from 'vitest'
import {
  installShellDom,
  seedWasHonoured,
  snapshotPlayfield,
  BURST_MS,
  ONE_STEP_MS,
  SEED,
} from './helpers/boot-shell'
import type { GameEvent } from '../src/core/events'
import type { SimState } from '../src/core/sim'
// SOUNDS is read from the REAL module (the mock below spreads `...real`, so the
// manifest is the genuine one) rather than re-listed here — a hand-kept copy of
// a name list agrees with itself forever while the manifest drifts underneath.
import { SOUNDS, type AudioEngine, type SoundName } from '../src/shell/audio'

/** One recorded event array, tagged with the pump callback it belongs to. */
interface Pumped {
  pump: number
  events: GameEvent[]
}

/**
 * Every multi-event step composition the `?seed=SEED` run produces — measured,
 * not remembered. Sorted, deduplicated, one string per distinct shape.
 *
 * REWORK (Reviewer rounds 1 and 2, MEDIUM, twice). Round 1's note offered a
 * death frame (sim.ts:693) AND a wave clear (sim.ts:723) as the causes. The
 * wave clear did not fire in that run at all, so half the explanation was
 * corroboration for something that never happened. Round 2's replacement was
 * wrong differently: it called `player-died+march-stop` "the death
 * concatenation" and the other two "two subsystems each emitting into the same
 * stream", and both halves of THAT are also wrong.
 *
 * The mechanism, resolved against the source rather than guessed at. Every
 * frame's stream is the join `[...produced, ...edges]` (sim.ts:977-982):
 * `produced` is what the frame pushed, and `edges` are the sustained voices
 * whose audibility CHANGED, taken by comparing the state handed in against the
 * state handed back (`LOOP_VOICES.flatMap`, sim.ts:978 — the file's only
 * edge-producing site). A `*-start`/`*-stop` kind can be produced nowhere else:
 * `loopEdges` builds those names by template literal (sim.ts:390-393), and no
 * producing site spells them out — the only literal spellings in core are the
 * kind registry itself (`EVENT_KINDS`, core/events.ts:67-77), which is data,
 * not a push site.
 *
 * A composition arises two ways. Most carry a loop edge — a `-start`/`-stop`
 * from one of the four loop voices (march/spider/flea/scorpion, the `LOOP_VOICES`
 * table) — landing in a frame that already had a one-shot event pushed into it.
 * The death triple is the clearest example:
 *
 *   player-died+march-stop+spider-stop
 *                             `player-died` from the death concatenation; the
 *                             two `-stop`s from the sweep. The death line
 *                             supplies one third, not the triple.
 *
 * But some entries carry NO loop edge at all — `shot-fired+mushroom-destroyed`,
 * `shot-fired+segment-killed` and `shot-fired+spider-killed` are each two
 * one-shot pushed events (the `shot-fired` push plus the kill/eat pushes)
 * colliding in the same frame. Under cp7-5's EASY default the run survives long
 * enough to REACH these later events, so wave-clear compositions now occur —
 * see the re-measurement note below.
 *
 * cp6-3 MOVED THIS LIST, and the move is the story's own behaviour change —
 * re-measured from the run, never hand-edited. Before it, the spider's `-stop`
 * was taken when the death PAUSE ended and the respawn re-parked it, which is
 * also the frame the march resumes: hence a `march-start+spider-stop` pair, ~48
 * frames after the gun died. cp6-3 models PLAYEX's death-instant channel clear
 * (CENTI4.MAC:1813-1818), so the spider's voice closes on the death frame
 * itself, where `player-died` and `march-stop` already are. The pair became a
 * triple and the old pair vanished — the respawn frame now emits `march-start`
 * ALONE, which is a singleton and so is not a composition at all.
 *
 * Measured, not inferred, and RE-MEASURED for cp7-5. This seeded run still ends
 * three lives, each a `player-died+march-stop+spider-stop` triple. What changed
 * is everything BETWEEN the deaths: cp7-5 models the OPTNS difficulty DIP and
 * defaults it to EASY, so the spider is the gentler cabinet — it arrives at full
 * speed five times later (5,100 vs 1,100 points) and turns more often. The run
 * therefore survives long enough to shoot segments, kill a spider, stop a flea
 * and clear a wave, and those are the richer compositions below. Per this
 * block's own rule the list is pinned, not narrated: volatile per-death pump
 * indices are deliberately no longer quoted here, since a sim change (like this
 * one) rots them — the constant is the artifact, re-measured from the run.
 */
const MEASURED_PAIR_COMPOSITIONS: string[] = [
  'mushroom-destroyed+spider-start',
  'player-died+march-stop+spider-stop',
  'segment-killed+wave-cleared+march-stop',
  'shot-fired+flea-stop',
  'shot-fired+mushroom-destroyed',
  'shot-fired+segment-killed',
  'shot-fired+segment-killed+wave-cleared+march-stop',
  'shot-fired+spider-killed',
]

// ─── recorders ───────────────────────────────────────────────────────────────
// `vi.mock` factories are hoisted above every import, so the arrays they close
// over must be hoisted too — a plain module-scope `const` is in the temporal
// dead zone when the factory runs.
const rec = vi.hoisted(() => ({
  /** One entry per `createAudio()` call — AC1 says main.ts constructs the engine. */
  engines: [] as unknown[],
  /**
   * How many `pumpFrame` callbacks have STARTED. See the AC1 test: this is the
   * clock the shift defect is measured against, and it ticks at the callback
   * BOUNDARY — which is exactly why it can see a shift that a step counter
   * (ticking mid-callback) cannot.
   */
  pumps: 0,
  /** The events array handed to each `playEventSounds` call, pump-tagged. */
  dispatched: [] as { pump: number; events: GameEvent[] }[],
  /** The engine object each call was given — proves it is the one main.ts built. */
  dispatchedTo: [] as unknown[],
  /** The events each `stepSim` produced, pump-tagged. */
  stepped: [] as { pump: number; events: GameEvent[] }[],
  /** Every cue that reached the engine: `play`/`startLoop`/`stopLoop` + name. */
  cues: [] as { method: string; name: string }[],
}))

vi.mock('../src/shell/audio', async (importOriginal) => {
  const real = await importOriginal<typeof import('../src/shell/audio')>()
  return {
    ...real,
    // Forward every parameter the real factory takes (`baseUrl`) rather than
    // declaring none: a signature that swallows an argument makes the mock
    // quietly stop modelling the thing it stands in for. House rule #8.
    createAudio: (...args: Parameters<typeof real.createAudio>): AudioEngine => {
      const engine: AudioEngine = {
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
        // jt5-5 added `tick` to the shared engine for joust's single-voice
        // priority arbitration. centipede declares no `priorities`, so its engine
        // never arbitrates and the tick is inert — but the stub still has to
        // implement the full interface, and recording the call would put a
        // per-frame event into `rec.cues`, which every sweep here reads as cues.
        tick: (): void => {},
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
    playEventSounds: (...args: Parameters<typeof real.playEventSounds>): void => {
      const [audio, events] = args
      rec.dispatchedTo.push(audio)
      rec.dispatched.push({ pump: rec.pumps, events: [...events] })
      real.playEventSounds(...args)
    },
  }
})

vi.mock('../src/core/sim', async (importOriginal) => {
  const real = await importOriginal<typeof import('../src/core/sim')>()
  return {
    ...real,
    stepSim: (...args: Parameters<typeof real.stepSim>): SimState => {
      const next = real.stepSim(...args)
      rec.stepped.push({ pump: rec.pumps, events: [...next.events] })
      return next
    },
  }
})

// The pump clock. `pumpFrame` calls its `step` callback once per SIM step
// (shell/timebase.ts — `advanceFixedSteps(..., () => step(sampleStep()))`), so
// incrementing on entry stamps every observation inside that callback with the
// same index, whatever order the callback does its work in.
vi.mock('../src/shell/timebase', async (importOriginal) => {
  const real = await importOriginal<typeof import('../src/shell/timebase')>()
  return {
    ...real,
    pumpFrame: (...args: Parameters<typeof real.pumpFrame>): number => {
      const [acc, elapsed, sampleStep, step] = args
      return real.pumpFrame(acc, elapsed, sampleStep, (input) => {
        rec.pumps += 1
        step(input)
      })
    },
  }
})

const shell = installShellDom()

/** Non-empty event arrays only — an empty frame is a no-op on both sides. */
const nonEmpty = (records: readonly Pumped[]): Pumped[] => records.filter((r) => r.events.length > 0)

/** The mushroom field the shell booted with, COPIED before a frame has run. */
let bootCells: Uint8Array
/** How many rAF frames the run drove — the denominator of the burst check. */
let rafFrames = 0

beforeAll(async () => {
  await import('../src/main')
  bootCells = snapshotPlayfield(shell.sim())

  let t = 0
  const run = (frames: number, ms: number): void => {
    for (let i = 0; i < frames; i++) {
      t += ms
      rafFrames += 1
      shell.frame(t)
    }
  }

  run(1, 0) // the baseline frame — main.ts only stamps `last`, no sub-steps

  // START1: leave attract for a live game. The core keeps attract silent by
  // design (core/events.ts:23-26 — stepAttractDemo clears the stream), so no
  // cue can be observed until this lands.
  shell.emit('window', 'keydown', { key: 'Enter' })
  run(10, ONE_STEP_MS)
  shell.emit('window', 'keyup', { key: 'Enter' })

  // Hold the gun down and play. BURST_MS frames run a catch-up burst of sim
  // steps each (measured: 14), which is both the fast way to accumulate a long
  // run and the exact shape that separates a per-STEP call from a per-rAF one.
  shell.emit('window', 'keydown', { key: ' ' })
  run(1500, BURST_MS)
})

// ═════════════════════════════════════════════════════════════════════════════
// The precondition every emergent assertion in this file rests on
// ═════════════════════════════════════════════════════════════════════════════

describe('cp5-2 — the boot is SEEDED, so what this run happens to produce is not luck', () => {
  it('main.ts honoured the ?seed= override instead of seeding attract from the clock', () => {
    // REWORK (Reviewer round 1, MEDIUM). main.ts:203 used to seed attract with
    // `createAttract(Date.now())`, and the assertions below this line are about
    // EMERGENT play: that the gun cue fires, that a spider loop opens and
    // closes, that some step emitted two events. Against a wall-clock seed
    // those are observations about one particular afternoon — they were green
    // eight runs running, which is evidence and not proof, and every other
    // centipede suite pins a literal seed for exactly this reason.
    //
    // The fix was a shell-only `?seed=` debug override in the shape of the
    // `?wave=` one main.ts already parses (main.ts:40-49) — parsed in the SHELL
    // and never passed into createSim, so the pure core stays debug-free.
    // `Date.now()` survives as the fallback when no `?seed=` is given, which is
    // every real page load. This assertion is what keeps the override honest.
    expect(
      seedWasHonoured(bootCells),
      `main.ts did not boot the world ?seed=${SEED} asks for — it is still seeding attract ` +
        'from Date.now(), so every emergent assertion in this file is a statement about ' +
        'whatever the clock said. Add the shell-only ?seed= override (the ?wave= shape).',
    ).toBe(true)
  })
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
      'main.ts must build the audio engine with createAudio() — exactly one engine, at boot',
    ).toBe(1)
  })
})

describe('cp5-2 AC1 — the dispatch runs once per STEPPED frame, not once per rAF frame', () => {
  it('every stepped frame that emitted events handed that whole array to the dispatch, in the SAME pump callback', () => {
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
    //
    // ─── REWORK (Reviewer round 1, MEDIUM [TEST]): THE PUMP INDEX ────────────
    // The first cut compared the two arrays of arrays directly, after filtering
    // each side to its non-empty entries INDEPENDENTLY. That is blind to a
    // one-step SHIFT, and the Reviewer proved it by mutation: hoisting
    // `playEventSounds` ABOVE `sim = stepSim(...)` — so every frame dispatches
    // the PREVIOUS step's cues, one step stale forever — left all 1012 tests
    // green. Filtering both sides for emptiness deletes exactly the entries
    // that would have exposed the offset, and what is left is two identical
    // subsequences.
    //
    // A step counter cannot fix it either: it increments in the MIDDLE of the
    // callback, so a shifted dispatch reads the neighbouring value and pairs up
    // just as convincingly. The clock has to tick at the callback BOUNDARY.
    // `rec.pumps` does — the timebase mock bumps it on entry to each pump
    // callback — so a dispatch that runs before its step is stamped with the
    // pump index of the step AFTER the one whose events it is carrying, and
    // every single pair mismatches. Mutation-checked both ways: the hoist reds
    // this test, and `if (sim.events.length > 0) playEventSounds(...)` — an
    // equivalent refactor the Reviewer identified and required to stay green —
    // still passes, because a skipped empty dispatch is a record the non-empty
    // filter removes from the other side too.
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
      'the dispatch was never called — main.ts does not call playEventSounds',
    ).toBeGreaterThan(0)

    expect(
      seen,
      'the cues the shell dispatched do not match the events the core emitted, step for ' +
        'step and within the same pump callback. A per-rAF-frame call drops every step but ' +
        'the last of a burst; a call sited BEFORE the step dispatches the previous step\'s ' +
        'cues forever. Both show up here as a pump-index mismatch',
    ).toEqual(emitted)
  })

  it('the pump clock actually ticked more than once per rAF frame — the burst is real', () => {
    // The pump index is only a discriminator if the run contains bursts: if
    // every rAF frame ran exactly one step, "same pump callback" and "same rAF
    // frame" would be the same claim and the test above would be back to being
    // shift-blind. 1500 BURST_MS frames each run the @shared/loop clamp's worth
    // of steps, so this is a check that the harness did what it says.
    expect(rafFrames, 'the run drove no frames').toBeGreaterThan(0)
    expect(
      rec.pumps / rafFrames,
      'the pump callback averaged at most two steps per rAF frame — no catch-up burst ' +
        'happened, so the per-step vs per-frame distinction above is not being exercised',
    ).toBeGreaterThan(2)
  })

  it('at least one step emitted TWO events, so "not per event" is actually discriminated', () => {
    // Guards the test above from passing for the wrong reason. If every array in
    // the comparison were a singleton, a per-EVENT dispatch would satisfy it
    // exactly as a per-STEP one does, and AC1's "not per event" would be
    // untested.
    //
    // REWORK (Reviewer round 1, MEDIUM): the note here used to offer a death
    // frame (sim.ts:693) AND a wave clear (sim.ts:723) as the causes, and cited
    // a count ("6 of 212") taken from an unseeded run. The composition is now
    // measured on the seeded run and pinned by the test below, rather than
    // described here from memory.
    const emitted = nonEmpty(rec.stepped)
    expect(
      emitted.some((r) => r.events.length >= 2),
      'no step in this run emitted more than one event, so the per-step vs per-event ' +
        'distinction is not exercised — lengthen the run',
    ).toBe(true)
  })

  it('the multi-event steps have exactly the compositions this seeded run was measured to produce', () => {
    // The composition, pinned rather than described — see
    // MEASURED_PAIR_COMPOSITIONS. This is what stops the prose above from
    // drifting: change the sim, or the seed, and this reds with the new list in
    // the diff, so the explanation gets re-measured instead of quietly becoming
    // a story about a run nobody has done since.
    const pairs = nonEmpty(rec.stepped).filter((r) => r.events.length >= 2)
    const kinds = [...new Set(pairs.map((r) => r.events.map((e) => e.type).join('+')))].sort()
    expect(kinds, 'the multi-event step compositions this run produces').toEqual(
      MEASURED_PAIR_COMPOSITIONS,
    )
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
