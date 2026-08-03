// tests/audio-events.test.ts
//
// Story jt5-1 — RED phase (Mr. Praline / TEA). The CORE half of the joust audio
// seam: a discriminated union of the gameplay moments the sim already computes,
// carried as DATA on the state the shell already steps, never as callbacks — so
// the core stays pure and a fixed seed replays an identical stream.
//
// Covers AC2 (the union exists, the sim emits it, purity survives) and AC3
// (jt2's seeded replays still reproduce bit-for-bit; the channel adds no RNG
// draw and no ordering change).
//
// ─── WHERE THE STREAM LIVES, AND WHY ─────────────────────────────────────────
// `stepGame(game, inputs): GameState` (src/core/game.ts:374) returns a BARE
// state — there is no step-result pair to hang events off, so the stream is a
// field on the returned state (the asteroids precedent, and the ruling in
// sprint/context/context-epic-jt5.md). It is pinned at `GameState.events`
// because that is the seam the shell actually reads: main.ts:184 steps
// `stepGame` and nothing else. Two of the eleven moments (extra-man, wave-
// bounty) are resolved by the SESSION layer in game.ts, not by `stepDemo` at
// all, so a stream homed on `DemoState` could not carry them. Whether Dev also
// grows a field on `DemoState` to carry the sim's own moments upward is Dev's
// choice; these tests do not look.
//
// ─── WHY THE events.ts IMPORT IS COMPUTED ────────────────────────────────────
// `src/core/events.ts` does not exist yet and the RED tree must stay
// `npm run lint` (tsc --noEmit) clean. A literal `import('../src/core/events')`
// — static OR dynamic — is TS2307 while the file is absent. So the specifier is
// assembled at runtime: tsc cannot resolve a non-literal, vitest can. game.ts
// and demo.ts DO exist, so those are imported normally and only the new
// `events` FIELD is reached through a widening type.
//
// ─── THE TWO TRAPS THIS FILE IS BUILT AROUND ─────────────────────────────────
//  1. An EMPTY stream satisfies every determinism and coverage assertion
//     perfectly — two empty runs compare equal forever. Every comparison below
//     is therefore PAIRED, in the same test, with a positive assertion that the
//     run emitted something, and something of more than one kind.
//  2. Replay determinism CANNOT SEE a missing per-frame clear. A stale event
//     carried forward from frame N is carried forward IDENTICALLY in both runs,
//     so both streams still match while every cue re-fires forever. The clear
//     needs its own, different test — `the stream is REBUILT each frame` below
//     — which steps past a triggering frame and demands the event be GONE.
//     This trap is not hypothetical here: joust's EXISTING `DemoState.events`
//     log is append-and-cap (`[...demo.events, ...collided.events]
//     .slice(-EVENT_LOG_CAP)`, demo.ts:1321, the cap declared 32 at demo.ts:311 —
//     this cited `:1173` and a literal `slice(-32)` from jt5-1 until jt5-4
//     re-anchored it), and `stepGame` only tells this frame's entries from last
//     frame's by a reference-set delta (game.ts:376-380). A cue channel built
//     on that log inherits exactly the defect determinism cannot see.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { violations } from './helpers/purity-scanner.js'
import { createGame, stepGame, type GameState } from '../src/core/game.js'
import type { PlayerInput } from '../src/core/flight.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const eventsPath = join(root, 'src', 'core', 'events.ts')

// ─── the not-yet-existing module ─────────────────────────────────────────────

/**
 * The runtime surface `src/core/events.ts` must expose. `EVENT_KINDS` is a
 * runtime VALUE on purpose: AC4 needs the manifest and the dispatch to cover
 * "every event kind", and a coverage check that reads a hand-maintained list in
 * the TEST is scenery — it agrees with itself forever while the union drifts
 * underneath it. Deriving the union FROM this tuple
 * (`type GameEventKind = (typeof EVENT_KINDS)[number]`) is what makes the
 * manifest and dispatch sweeps mechanically true rather than merely maintained.
 */
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
  const kinds = (await loadEvents()).EVENT_KINDS
  if (kinds === undefined) {
    throw new Error(
      'jt5-1 not implemented yet: src/core/events.ts must exist and export `EVENT_KINDS` — a ' +
        'readonly tuple of every event kind, with the GameEvent union derived from it.',
    )
  }
  return kinds
}

// ─── reaching the new field on an existing type ──────────────────────────────

interface GameEventLike {
  readonly type: string
}
/** GameState once jt5-1 has grown its stream. Until GREEN the read is
 *  `undefined`, which reds against an array with a legible message. */
type GameWithEvents = GameState & { readonly events: readonly GameEventLike[] }
const ext = (g: GameState): GameWithEvents => g as GameWithEvents

/** The frame's emitted stream, with a clear failure when the field is absent —
 *  so a missing seam reds as "no events field" and never as an opaque
 *  `undefined is not iterable` three assertions later. */
function streamOf(g: GameState): readonly GameEventLike[] {
  const events = ext(g).events
  expect(
    Array.isArray(events),
    'stepGame must return an `events` array on the state it returns',
  ).toBe(true)
  return events
}

const kindsOf = (g: GameState): string[] => streamOf(g).map((e) => e.type)

// ─── the input script (shared with the frozen fingerprint below) ─────────────

const IDLE: PlayerInput = { dir: 0, flap: false, flapHeld: false }

/**
 * A deterministic, NON-random input stream: the frame index alone decides the
 * input, so a replay is reproducible without touching the seeded rng (whose
 * determinism is jt2's business, not AC3's). This exact script is what the
 * reachability sweep in the session's TEA Assessment was measured with, so the
 * staged frame numbers below are real observations, not guesses.
 */
const DIRS: readonly (-1 | 0 | 1)[] = [-1, -1, 0, 1, 1]
const scripted = (frame: number): PlayerInput => {
  const flap = frame % 13 === 0
  return { dir: DIRS[frame % 5], flap, flapHeld: flap }
}

const inputsAt = (frame: number): Record<number, PlayerInput> => ({ 1: scripted(frame), 2: IDLE })

/** Run `frames` frames from `start`, collecting every frame's emitted stream. */
function runCollecting(start: GameState, frames: number): { end: GameState; perFrame: string[][] } {
  let g = start
  const perFrame: string[][] = []
  for (let i = 0; i < frames; i++) {
    g = stepGame(g, inputsAt(i))
    perFrame.push(kindsOf(g))
  }
  return { end: g, perFrame }
}

/** Step to `frame` (exclusive) and return the state, without reading `events` —
 *  usable as a staging helper BEFORE the field exists, so the preconditions
 *  below are green today and prove the staging is real. */
function advanceTo(seed: number, frame: number): GameState {
  let g = createGame(seed)
  for (let i = 0; i < frame; i++) g = stepGame(g, inputsAt(i))
  return g
}

const countOf = (g: GameState, kind: string): number =>
  g.sim.sim.processes.filter((p) => p.kind === kind).length

// ═════════════════════════════════════════════════════════════════════════════
// AC2 — the union exists, and it names moments the sim already computes
// ═════════════════════════════════════════════════════════════════════════════

// Eleven moments, each one a REAL Williams sound table with the machine's own
// comment on it, and each one reachable in this port. The ROM's whole sound set
// is 38 tables (JOUSTRV4.SRC:8051-8131, under the format header at :8045-8049);
// these are the entries whose moment `stepDemo`/`stepGame` actually resolves
// today. The ROM citations live in tests/audio-rom-citations.test.ts, which
// byte-opens every one of them.
//
// What is deliberately NOT here, and why — each is a Delivery Finding with its
// ROM lines, not an oversight:
//   • the FLAP (SNPLWD/SNPLWU, SNELWD/SNELWU) — a TWO-EDGE cue in the ROM
//     (GOFLAP→FLAST2 :6212-6218 on the press, GOFLIP :6182-6184 on the
//     RELEASE). Our core sees only the press edge (`input.flap`); the release
//     edge needs state nothing tracks. Half a two-edge cue is worse than none.
//     SUPERSEDED by jt5-3, which adds the release-edge detector and the four
//     wing kinds. The deferred guard below no longer names the flap family, and
//     tests/audio-flap.test.ts is what pins it. (The line extent above was also
//     wrong: `GOFLAP` is :6212 and `FLAST2` :6216, not :6207.)
//   • the THUDS (SNPTHD :5014, SNETHD :5019) — `collisionPass` COMPUTED the
//     bounce and threw it away (`if (contact.outcome.kind !== 'kill')
//     continue`), and `bounceTop`/`bounceBottom` had ZERO production callers. A
//     thud would have announced a collision the sim did not resolve.
//     SUPERSEDED by jt5-4, which APPLIES the bounce and then cues it — SNETHD
//     for an enemy-vs-enemy contact (:4961) and SNPTHD for any tie involving a
//     person (:5010, ":8124 AT LEAST 1 PERSON THUD'ED"). The deferred guard
//     below no longer names the thud family, and tests/audio-thud.test.ts is
//     what pins it.
//   • the LAVA TROLL grab (SNTROL, LT1GRP :1646-1647) — `troll.beginGrip` has
//     zero production callers too, and `ROW_DISPOSITION.LAVGRA` in difficulty.ts
//     already says so by name, owner `uf1-10`/`uf1-11`. (Named, not line-cited —
//     uf1-9 rewrote that table and the entry moved.)
const EXPECTED_KINDS: readonly string[] = [
  'enemy-death',
  'player-death',
  'egg-collected',
  'egg-hatched',
  'ptero-arrives',
  'ptero-death',
  'player-materialise',
  'enemy-materialise',
  'extra-man',
  'wave-bounty',
  'cliff-destroyed',
]

describe('jt5-1 AC2 — core/events.ts declares the event channel', () => {
  it('the module exists at src/core/events.ts', () => {
    expect(existsSync(eventsPath), 'jt5-1 must create src/core/events.ts').toBe(true)
  })

  it('exports EVENT_KINDS covering every moment this story wires', async () => {
    const kinds = await eventKinds()
    // Non-vacuity first: an empty tuple satisfies every `for` loop below.
    expect(kinds.length, 'EVENT_KINDS must not be empty').toBeGreaterThan(0)
    for (const kind of EXPECTED_KINDS) {
      expect(kinds, `EVENT_KINDS is missing '${kind}'`).toContain(kind)
    }
  })

  it('has no duplicate kinds — a repeated name silently collapses two cues into one', async () => {
    const kinds = await eventKinds()
    expect(new Set(kinds).size, `duplicate kind in EVENT_KINDS: ${kinds.join(', ')}`).toBe(
      kinds.length,
    )
  })

  it('names no kind this story deliberately deferred — an unreachable cue can never be proven', async () => {
    // The deferred families above. A kind declared here but never emitted would
    // sail through the manifest and dispatch sweeps (they read the same tuple)
    // and ship as a cue that cannot fire — exactly the "certifies its own shape"
    // failure. Each is owned by a Delivery Finding with its ROM lines.
    //
    // jt5-3 REMOVED 'player-flap', 'enemy-flap' and 'flap' from this list: it
    // builds the release-edge detector, so the flap family now has emitters and
    // forbidding it here would make this guard a lie.
    //
    // jt5-4 removed 'player-thud', 'enemy-thud' and 'thud' for the same reason
    // one story later: it applies the bounce `collisionPass` used to discard, so
    // both thuds now have emitters. ('thud' stays OUT of EVENT_KINDS all the
    // same — SNPTHD 020 and SNETHD 009 are two sounds, and a single collapsed
    // kind cannot be arbitrated; tests/audio-thud.test.ts pins that.)
    //
    // What remains is uf1-10/uf1-11's alone (the lava troll's grab). The list is
    // guarded in turn by tests/audio-flap.test.ts and tests/audio-thud.test.ts,
    // which read this array as source text and fail if a wired name comes back
    // OR if 'troll-grab' leaves.
    const deferred = ['troll-grab']
    const kinds = await eventKinds()
    for (const kind of deferred) {
      expect(
        kinds,
        `'${kind}' is deferred (see this file's header and the session's Delivery Findings) — ` +
          'it has no reachable moment in the sim today, so declaring it ships an unfirable cue',
      ).not.toContain(kind)
    }
  })
})

describe('jt5-1 AC2 — the core stays pure with events.ts in it', () => {
  it('src/core/events.ts trips no purity rule', () => {
    expect(existsSync(eventsPath), 'jt5-1 must create src/core/events.ts').toBe(true)
    expect(violations(readFileSync(eventsPath, 'utf8'))).toEqual([])
  })

  it('the whole of src/core is still clean — the sweep that guards the boundary', () => {
    // Re-run the boundary sweep here as well as in purity.test.ts: this story
    // adds a module to core AND edits the steppers, and a story that reddens the
    // boundary must fail in its OWN suite, not only in a neighbour's.
    const coreDir = join(root, 'src', 'core')
    const files = readdirSync(coreDir).filter((f) => f.endsWith('.ts'))
    expect(files.length, 'src/core must not be empty').toBeGreaterThan(0)
    const offenders = files.flatMap((f) =>
      violations(readFileSync(join(coreDir, f), 'utf8')).map((v) => `${f}: ${v}`),
    )
    expect(offenders).toEqual([])
  })

  it('events.ts imports nothing from shell/ — the channel is DATA, not a callback', () => {
    expect(existsSync(eventsPath), 'jt5-1 must create src/core/events.ts').toBe(true)
    const src = readFileSync(eventsPath, 'utf8')
    expect(src, 'core must never import shell code').not.toMatch(/from\s+['"][^'"]*shell\//)
    // A callback-shaped channel defeats the whole seam: the core would be
    // holding a function the shell handed it, and replay would depend on it.
    expect(
      src,
      'the event channel must be DATA — no injected play/startLoop/stopLoop sink',
    ).not.toMatch(/\b(play|startLoop|stopLoop)\s*[:(]/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC2 — the sim EMITS the channel (the seam is alive, not merely declared)
// ═════════════════════════════════════════════════════════════════════════════

describe('jt5-1 AC2 — stepGame carries the stream on the state it returns', () => {
  it('every stepped state carries an events array', () => {
    expect(Array.isArray(ext(stepGame(createGame(0x1234), inputsAt(0))).events)).toBe(true)
  })

  it('a fresh game starts with an EMPTY stream — nothing has happened yet', () => {
    expect(streamOf(createGame(0x1234))).toEqual([])
  })

  it('stepGame is still PURE — the argument state is not mutated', () => {
    const g = createGame(0x1234)
    const snapshot = JSON.stringify(g)
    stepGame(g, inputsAt(0))
    expect(JSON.stringify(g), 'stepGame must return a new state, never mutate its argument').toBe(
      snapshot,
    )
  })
})

// The staged frames below are OBSERVATIONS of the shipped sim under the
// `scripted` input above, not invented fixtures — each `it` asserts the
// precondition (which is green today) before the event (which is not). That
// pairing is what keeps a RED honest: if a later change moves the moment, the
// precondition fails first and says so, instead of the event assertion failing
// for a reason that has nothing to do with the seam.
describe('jt5-1 AC2 — the moments are emitted in ORDINARY PLAY, not only in fixtures', () => {
  it('a killed enemy emits enemy-death (seed 0xbeef, frame 199)', () => {
    // jt5-8 RE-BASELINE: 204 -> 199. The dumb brain's LNTUP/LNTOFP alternation
    // re-flies every UNpromoted buzzard from its first wake, so the joust that
    // kills this one lands five frames earlier. Re-found by sweeping 900 frames
    // of this seed for THIS test's own precondition (an enemy process leaves the
    // list) — 199 and 515 are the only two frames that satisfy it, and 199 is
    // the earlier. Same seed, same script, every assertion unchanged.
    const before = advanceTo(0xbeef, 199)
    const after = stepGame(before, inputsAt(199))
    expect(countOf(after, 'enemy'), 'precondition: an enemy really dies on this frame').toBe(
      countOf(before, 'enemy') - 1,
    )
    expect(kindsOf(after)).toContain('enemy-death')
  })

  it('a collected egg emits egg-collected (seed 0x2468, frame 230)', () => {
    // jt8-7 RE-BASELINE: 516 -> 523. Same seed, same script; the mask-gated catch
    // (the egg must now overlap CEGGUP's 7 scanlines, not just the 16px box) simply
    // delays which egg player 2 drifts into. Measured, not guessed.
    //
    // uf1-9 RE-BASELINE: seed 0xbeef -> 0x2468, frame 523 -> 230. The wing cadence
    // changes which enemies the knights reach and therefore where the eggs fall, and
    // the SEED had to move as well as the frame: swept 2500 frames of 0xbeef and
    // every `egg-collected` there now scores player ONE, so no frame can satisfy
    // this test's "player 2's score rises" precondition on that seed at all. 0x2468
    // is already this file's third seed (the AC3 fingerprint below uses it) and its
    // frames 230 and 612 both score player 2; 230 is the earliest. The script and
    // every assertion are unchanged.
    const before = advanceTo(0x2468, 230)
    const after = stepGame(before, inputsAt(230))
    expect(countOf(after, 'egg'), 'precondition: an egg really leaves on this frame').toBe(
      countOf(before, 'egg') - 1,
    )
    expect(
      after.players[1].score,
      'precondition: the egg is COLLECTED (it scores), not merely removed',
    ).toBeGreaterThan(before.players[1].score)
    expect(kindsOf(after)).toContain('egg-collected')
  })

  // ─── jt5-4 RE-STAGE (AC-7): these three moved from seed 0xbeef to 0xface ────
  // Applying the bounce (jt5-4) stranded seed 0xbeef's kill-egg where this
  // file's fixed 5-frame `scripted` walk never revisits, so 0xbeef stopped
  // producing wave advances or death/respawn pairs under this script (the full
  // history of that measurement, the not-a-soft-lock proof and the kill-egg
  // maturation gap live in this block's pre-uf1-8 version, d98d7a7^). 0xface
  // was chosen as the least invasive substitute: same script, only the seed
  // and frames changed.
  //
  // uf1-8 RE-MEASURE (2026-08-01): the range-gated brains re-fly every smart
  // buzzard, and the jt5-4 stall narrative is PARTLY retired with them — under
  // uf1-8 the buzzards' committed dives feed the idle player 2 a steady diet
  // of eggs and seed 0xbeef now clears wave 1 at frame 820 (see the
  // fingerprint below). 0xface stays the seed here — only its frames moved.
  //
  // jt8-7 RE-BASELINE (2026-08-01): the egg catch gained a NARROW phase, so a
  // player must now overlap the egg's transcribed mask (7 scanlines) rather
  // than the bare 16px box. That changes WHICH egg is collected WHEN, and the
  // whole seeded timeline shifts with it. Both seeds and the input script are
  // unchanged — only the frames moved, re-measured by scanning 3000 frames of
  // each seed for the same preconditions these tests already assert:
  //
  //     egg-collected      0xbeef  516  -> 523
  //     wave advance       0xface 1614  -> 1641
  //     player-death       0xface 1938  -> 1810
  //     player-materialise 0xface 1939  -> 1811   (still death + 1)
  //
  // These are frame COORDINATES, not thresholds: each test still asserts its
  // own precondition (an egg really leaves and really scores; a knight really
  // dies; the wave really advances), so a re-baseline cannot quietly turn one
  // of them vacuous — the precondition fails first if the moment is not there.
  it('a dying knight emits player-death (seed 0xface, frame 2578)', () => {
    // jt8-7 RE-BASELINE: 1938 -> 1810 (see the block comment above).
    //
    // jt5-8 RE-BASELINE: 1888 -> 2062.
    //
    // jt9-9 RE-BASELINE: 2062 -> 2578. Re-swept 2600 frames of this seed for
    // this test's OWN precondition (a player process leaves the list), never by
    // nudging: 621, 949, 1195, 2488 and 2578 satisfy it now. 2578 rather than
    // the earliest for the reason the jt5-8 note gives and which still holds —
    // the SIBLING test below stages `death + 1`, and that re-entry is coupled to
    // audio-transporter-split.test.ts, which needs knight TWO. Re-measured:
    // 622, 950, 1196 and 2489 all re-enter knight ONE, and 2579 is the only
    // knight-TWO re-entry in the window. Seed, script and every assertion
    // unchanged.
    //
    // WHY THIS SEED MOVED AT ALL, since it is not one of the three the story
    // named: an uncollected kill-egg now matures instead of sitting settled
    // forever, so this seed's arena empties differently from wave 1 on. It is
    // also the ONLY seed in the suite that moved — see the Dev Assessment.
    const before = advanceTo(0xface, 2578)
    const after = stepGame(before, inputsAt(2578))
    expect(countOf(after, 'player'), 'precondition: a knight really dies on this frame').toBe(
      countOf(before, 'player') - 1,
    )
    expect(kindsOf(after)).toContain('player-death')
  })

  it('the transporter re-entry emits player-materialise (seed 0xface, frame 2579)', () => {
    // The frame AFTER the death: `stepGame`'s respawn re-enters the spent knight
    // through the transporter (game.ts:425-441), which is the ROM's CREP
    // re-create — DSNCRE → the re-created player's own transporter table.
    //
    // CORRECTED 2026-08-02 (jt5-6 TEA). This comment used to name
    // SNPCR1 "PLAYER 1 RE-CREATED (TRANSPORTER)". Measured: the knight who
    // re-enters on this frame is player TWO, so the machine's table here is
    // SNPCR2 (:8119-8121), not SNPCR1 (:8116-8118). The attribution was
    // harmless while jt5-1's payload-free moment mapped both knights onto one
    // cue, and it is exactly the collapse jt5-6 removes — see
    // `the frame the suite already stages sounds SNPCR2` in
    // tests/audio-transporter-split.test.ts, which pins the id off the
    // processes rather than trusting either comment.
    //
    // jt5-8 RE-BASELINE: 1889 -> 2063, riding the death above (it is still
    // death + 1, which is the whole point of the staging). Still knight TWO, so
    // the SNPCR2 attribution corrected here in jt5-6 survives the move — the
    // sibling file re-asserts it off the process list at the new frame.
    //
    // jt9-9 RE-BASELINE: 2063 -> 2579, again riding the death above and again
    // still `death + 1`. Re-measured knight TWO off the process list (it is the
    // only knight-2 re-entry in a 2600-frame sweep of this seed), so the SNPCR2
    // attribution survives a second move for the same reason it survived the
    // first.
    const before = advanceTo(0xface, 2579)
    const after = stepGame(before, inputsAt(2579))
    expect(countOf(after, 'player'), 'precondition: the knight really re-enters here').toBe(
      countOf(before, 'player') + 1,
    )
    expect(kindsOf(after)).toContain('player-materialise')
  })

  it('a wave advance emits enemy-materialise, once per arriving buzzard (seed 0xface, frame 2246)', () => {
    // jt8-7 RE-BASELINE: 1614 -> 1641 (see the block comment above).
    //
    // jt5-8 RE-BASELINE: 1726 -> 1900.
    //
    // jt9-9 RE-BASELINE: 1900 -> 2246. Re-swept for this test's own precondition
    // (the wave counter advances AND the new complement is dealt) and frame 2246
    // is again the ONLY frame in 2600 that satisfies it — wave 1 -> 2, four
    // buzzards. It moved LATER, which is the expected direction: a kill-egg that
    // now matures puts a bird back on the board, and the wave cannot close while
    // it lives. Seed, script and every assertion unchanged.
    const before = advanceTo(0xface, 2246)
    const after = stepGame(before, inputsAt(2246))
    expect(after.wave, 'precondition: the wave really advances on this frame').not.toBe(before.wave)
    const arrived = countOf(after, 'enemy') - countOf(before, 'enemy')
    expect(arrived, 'precondition: the new wave really deals a complement').toBeGreaterThan(0)
    expect(kindsOf(after).filter((k) => k === 'enemy-materialise')).toHaveLength(arrived)
  })

  it('a CONTROL frame with nothing happening emits none of them', () => {
    // The mirror of every test above: without it, a channel that emitted all
    // eleven kinds unconditionally on every frame would pass all six.
    const quiet = stepGame(advanceTo(0xbeef, 100), inputsAt(100))
    for (const kind of ['enemy-death', 'player-death', 'egg-collected', 'player-materialise']) {
      expect(kindsOf(quiet), `frame 100 is quiet — it must not emit '${kind}'`).not.toContain(kind)
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC3 — determinism, and the per-frame clear determinism cannot see
// ═════════════════════════════════════════════════════════════════════════════

describe('jt5-1 AC3 — a fixed seed and input stream replay an identical stream', () => {
  it('two runs of the same seed and script emit identical per-frame streams', () => {
    const a = runCollecting(createGame(0x2468), 300)
    const b = runCollecting(createGame(0x2468), 300)

    // NON-VACUITY, asserted BEFORE the comparison: two empty runs match
    // trivially, and that is the failure mode this whole AC invites.
    const total = a.perFrame.reduce((n, f) => n + f.length, 0)
    expect(
      total,
      'the replay emitted NOTHING — the comparison below would be vacuous',
    ).toBeGreaterThan(0)
    expect(
      new Set(a.perFrame.flat()).size,
      'the run must exercise more than one kind',
    ).toBeGreaterThan(1)

    expect(b.perFrame).toEqual(a.perFrame)
  })

  it('a DIFFERENT seed diverges — the stream is not a constant', () => {
    // The control for the test above: if `events` were hard-coded (or always
    // empty), "identical" would hold for every seed and prove nothing.
    const a = runCollecting(createGame(0x2468), 300)
    const b = runCollecting(createGame(0xbeef), 300)
    expect(b.perFrame).not.toEqual(a.perFrame)
  })

  it('re-stepping the SAME state object twice gives the same stream', () => {
    // jt5-8 RE-BASELINE: 204 -> 199, tracking the kill above. Staying on 204
    // would not have FAILED — it would have gone quiet, and two empty streams
    // compare equal forever. That is the failure mode this file's header calls
    // trap 1, so the frame moves with the kill it was chosen for.
    const start = advanceTo(0xbeef, 199)
    const twice = kindsOf(stepGame(start, inputsAt(199)))
    expect(twice, 'a quiet frame would make this comparison vacuous').not.toEqual([])
    expect(twice).toEqual(kindsOf(stepGame(start, inputsAt(199))))
  })
})

describe('jt5-1 AC3 — the stream is REBUILT each frame, never carried forward', () => {
  it('an event present on one frame is GONE on the next when nothing re-triggers it', () => {
    // THE test replay determinism cannot make. A stale carry-forward is carried
    // identically in BOTH runs, so the comparison above still passes with the
    // bug in. This one steps past the triggering frame and demands it be gone.
    const fired = stepGame(advanceTo(0xbeef, 199), inputsAt(199))
    expect(kindsOf(fired), 'precondition: frame 199 must emit the kill').toContain('enemy-death')

    const next = stepGame(fired, inputsAt(200))
    expect(
      kindsOf(next),
      "'enemy-death' survived into a frame with no kill — the stream is appended to, not rebuilt",
    ).not.toContain('enemy-death')
  })

  it('a quiet frame emits EXACTLY nothing — not merely fewer things', () => {
    // The crisp form of the rule, and the one that bites. A `toBeLessThan(11)`
    // bound looks like a leak detector and is not one: an appended stream that
    // has only gathered four events in a quiet window is still under any
    // generous bound, so the mutation passes. `=== 0` is the actual property.
    // Frame 200 is the frame after the kill at 199, and it is silent. (Under
    // jt5-8's re-baseline that sentence is finally true of the frame this test
    // actually steps: it said "frame 205 … the kill at 204" while stepping 200.)
    const g = stepGame(advanceTo(0xbeef, 200), inputsAt(200))
    expect(streamOf(g), 'frame 200 is a quiet frame — the stream must be empty').toEqual([])
  })

  it('and a long quiet run stays empty rather than accumulating', () => {
    // The unbounded-growth shape of the same bug: an appended array grows
    // forever and the shell replays the whole wave every frame.
    let g = stepGame(advanceTo(0xbeef, 199), inputsAt(199))
    expect(kindsOf(g), 'precondition: frame 199 emits the kill').toContain('enemy-death')
    for (let i = 200; i < 213; i++) g = stepGame(g, inputsAt(i))
    expect(
      streamOf(g),
      'the stream never drained — events are accumulating across frames',
    ).toEqual([])
  })

  it('the stream is NOT joust’s capped DemoState.events log wearing a new name', () => {
    // `demo.ts:1321` keeps the last EVENT_LOG_CAP (32) entries of an append-only log and nothing
    // clears it per frame. If the cue channel were that log — or derived from it
    // by the reference-set delta game.ts:376 uses — a quiet frame would still
    // report the last kill. Compare the two ON THE SAME QUIET FRAME: the sim log
    // is still carrying its history while the cue stream must be empty.
    const g = stepGame(advanceTo(0xbeef, 200), inputsAt(200))
    expect(
      g.sim.events.length,
      'precondition: the capped sim log really is still carrying older entries',
    ).toBeGreaterThan(0)
    expect(
      streamOf(g),
      'the cue stream is carrying the capped log forward — it must be rebuilt per frame',
    ).toEqual([])
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC3 — "no RNG draw and no ordering change": the FROZEN pre-story fingerprint
// ═════════════════════════════════════════════════════════════════════════════
//
// These four numbers were MEASURED against the tree as it stood before jt5-1
// (commit b0a1abf), with the exact `scripted` input above. They are the whole
// content of "the event channel adds no RNG draw and no ordering change": an
// extra `draw()` moves `rng`, and re-ordering the process list to emit events
// moves `procs`. Both are invisible to a replay-identity test, which compares a
// run to ITSELF.
//
// jt5-4 RE-BASELINE (AC-7, TEA-authorised — the session's determinism ruling):
// all three are downstream of a non-killing contact (0xbeef's first at frame
// 147, 0x2468's and 0x1a2b3c4d's at frame 189), so applying the bounce moves
// them. `rng` is UNCHANGED on all three — the bounce draws no randomness, the
// same law `audio-thud.test.ts`'s "it draws no randomness" pins directly — and
// that is what still makes this group a regression guard rather than a feature
// pin: an extra draw or a re-order would move `rng`/`procs` again, on top of
// the one-time jt5-4 shift recorded here.
//
// This group is GREEN ON ARRIVAL by construction — it is a regression guard,
// not a feature pin, and its non-vacuity comes from mutation (recorded in the
// session's TEA Assessment), never from the assertion reading plausible.
describe('jt5-1 AC3 — the sim fingerprint is unchanged by the event channel', () => {
  const fingerprint = (seed: number, frames: number) => {
    let g = createGame(seed)
    for (let i = 0; i < frames; i++) g = stepGame(g, inputsAt(i))
    return {
      frame: g.sim.sim.frame,
      rng: g.sim.sim.rng,
      wave: g.wave,
      procs: g.sim.sim.processes.map((p) => `${p.kind}#${p.id}`).join(','),
      scores: g.players.map((p) => p.score),
      lives: g.players.map((p) => p.lives),
    }
  }

  it('seed 0x1a2b3c4d, 240 frames — rng cursor UNMOVED; wave/procs/ledgers uf1-8 re-baselined', () => {
    // MEASURED post-jt5-4, re-measured post-uf1-8 (the range-gated brains
    // re-fly every smart buzzard — audio-thud.test.ts AC7 carries the ruling):
    // `rng` is bit-identical through BOTH re-baselines (neither the bounce nor
    // the brains draw randomness — the law this group exists to pin).
    // `procs`/`scores` moved again: a committed uf1-8 dive puts enemy#257
    // under the idle knight's lance before frame 240 (+1250 to P2).
    expect(fingerprint(0x1a2b_3c4d, 240)).toEqual({
      frame: 240,
      rng: 1_928_172_029,
      wave: 1,
      procs: 'player#1,player#2,enemy#256,enemy#258',
      scores: [0, 1250],
      lives: [5, 5],
    })
  })

  it('seed 0xbeef, 2400 frames — rng UNMOVED through four re-baselines; jt5-8 holds wave 1 open', () => {
    // MEASURED post-jt5-4, when this seed's stranded kill-egg held wave 1 open
    // forever under this script (the full dead-end measurement lives in this
    // test's pre-uf1-8 version, d98d7a7^). RE-MEASURED post-uf1-8: the
    // committed dives drop the kill-eggs by the idle knight instead, wave 1
    // CLEARS at frame 820, and wave 2's harder-diving complement then grinds
    // the cabinet down — by frame 2400 player 2 is OUT (lives 0, its process
    // gone) and player 1 is on its last man with wave 2's three buzzards
    // still up. `rng` is bit-identical through both re-baselines — the law
    // this group pins.
    //
    // RE-MEASURED post-uf1-9, and the headline is the field that did NOT move:
    // `rng` is STILL 2_006_456_271 and `wave` still 2. The wing cadence changes
    // how the birds fly, not how many numbers the sim draws, which is exactly
    // the invariant this group exists to pin. The play-dependent fields moved a
    // long way — with the buzzards flapping on the ROM's cadence the knights
    // survive far better: both are still alive on 3 lives at frame 2400 (was
    // 1 and 0, with player 2 out) and the arena holds an egg rather than three
    // grown buzzards.
    //
    // RE-MEASURED post-jt5-8, and the headline is again the field that did NOT
    // move: `rng` is STILL 2_006_456_271, through four consecutive re-baselines
    // of everything around it. That is the whole claim of this group, and the
    // DUMB brain's alternation is the widest change yet made to how the birds
    // fly — every unpromoted buzzard in the game, from its first wake — so a
    // draw added anywhere in it would have shown here. `wave` went the other way
    // this time: 2 -> 1. The dumb birds now beat their wings instead of holding
    // them down, which keeps them airborne and alive, so this seed no longer
    // clears wave 1 inside 2400 frames at all and player 2 is out (lives 0).
    expect(fingerprint(0xbeef, 2400)).toEqual({
      frame: 2400,
      rng: 2_006_456_271,
      wave: 1,
      procs: 'enemy#256,player#1',
      scores: [850, 1500],
      lives: [3, 0],
    })
  })

  it('seed 0x2468, 900 frames — uf1-8 re-baselined: rng UNMOVED', () => {
    // MEASURED post-jt5-4, re-measured post-uf1-8 (this seed's first contact
    // moved from frame 189 out to the frame-611 player thud and its respawn).
    // RE-MEASURED post-uf1-9: `rng` is again bit-identical — the law this group
    // pins — while the play moved on. This seed now CLEARS wave 1 inside 900
    // frames (it did not before) and is part-way through wave 2's complement.
    //
    // RE-MEASURED post-jt5-8: `rng` bit-identical AGAIN (3_436_766_652), and so
    // is `wave` — this seed still clears wave 1 in this window and is still
    // part-way through wave 2's four. What moved is play-dependent and only
    // that: the process ORDER (both knights have been through the transporter in
    // a different order), P1's score by one 100-point bird, and P1's lives.
    expect(fingerprint(0x2468, 900)).toEqual({
      frame: 900,
      rng: 3_436_766_652,
      wave: 2,
      procs: 'enemy#512,enemy#513,enemy#514,enemy#515,player#2,player#1',
      scores: [1400, 2600],
      lives: [2, 3],
    })
  })

  it('the fingerprint is DISCRIMINATING — a different seed gives different numbers', () => {
    // Without this, three `toEqual`s against hard-coded objects could all be
    // passing because `fingerprint` returns something constant.
    expect(fingerprint(0x2468, 900)).not.toEqual(fingerprint(0xbeef, 900))
  })
})
