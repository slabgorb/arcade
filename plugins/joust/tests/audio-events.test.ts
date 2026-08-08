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
// `stepGame(game, inputs): GameState` (src/core/game.ts) returns a BARE
// state — there is no step-result pair to hang events off, so the stream is a
// field on the returned state (the asteroids precedent, and the ruling in
// sprint/context/context-epic-jt5.md). It is pinned at `GameState.events`
// because that is the seam the shell actually reads: main.ts steps
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
//     .slice(-EVENT_LOG_CAP)`, demo.ts, the cap declared 32 at demo.ts —
//     this cited `:1173` and a literal `slice(-32)` from jt5-1 until jt5-4
//     re-anchored it), and `stepGame` only tells this frame's entries from last
//     frame's by a reference-set delta (game.ts). A cue channel built
//     on that log inherits exactly the defect determinism cannot see.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { violations } from './helpers/purity-scanner.js'
import { createGame, stepGame, type GameState } from '../src/core/game.js'
import { load } from './helpers/dynamic-load'
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

const EVENTS_PARTS = ['..', 'src', 'core', 'events']
let cached: Partial<EventsModule> | undefined

async function loadEvents(): Promise<Partial<EventsModule>> {
  if (cached) return cached
  cached = await load<EventsModule>(import.meta.url, EVENTS_PARTS)
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
  it('a killed enemy emits enemy-death (seed 0xbeef, frame 215)', () => {
    // jt5-8 RE-BASELINE: 204 -> 199. The dumb brain's LNTUP/LNTOFP alternation
    // re-flies every UNpromoted buzzard from its first wake, so the joust that
    // kills this one lands five frames earlier. Re-found by sweeping 900 frames
    // of this seed for THIS test's own precondition (an enemy process leaves the
    // list) — 199 and 515 are the only two frames that satisfy it, and 199 is
    // the earlier. Same seed, same script, every assertion unchanged.
    //
    // jt9-8 RE-BASELINE: 199 -> 213. A PLAYER's wing transition now RE-INITs its
    // flap-lift budget (`CLR PTIMUP,U`), so the scripted knight climbs on the
    // ROM's cadence and reaches this buzzard later. Re-swept the same 900 frames
    // of the same seed under the same script for THIS test's own precondition (an
    // enemy process leaves the list): 213, 331 and 869 are the only frames that
    // satisfy it, and 213 is the earliest. Seed, script and every assertion
    // unchanged. (Enemy flight is untouched by jt9-8 — enemy.ts is not modified;
    // what moved is where the knight's lance is.)
    //
    // jt9-43 RE-BASELINE: 213 -> 215. Folding BPCOL's COLDX makes the lance compare
    // screen-precise, nudging which frame this joust resolves. Re-swept the same 900
    // frames for the same precondition (an enemy leaves the list): 215, 331, 871 —
    // 215 the earliest. Seed, script and every assertion unchanged.
    const before = advanceTo(0xbeef, 215)
    const after = stepGame(before, inputsAt(215))
    expect(countOf(after, 'enemy'), 'precondition: an enemy really dies on this frame').toBe(
      countOf(before, 'enemy') - 1,
    )
    expect(kindsOf(after)).toContain('enemy-death')
  })

  it('a collected egg emits egg-collected (seed 0x1234, frame 273)', () => {
    // jt8-7 RE-BASELINE: 516 -> 523. Same seed, same script; the mask-gated catch
    // (the egg must now overlap CEGGUP's 7 scanlines, not just the 16px box) simply
    // delays which egg a knight drifts into. Measured, not guessed.
    //
    // jt9-43 RE-BASELINE: seed 0x2468 -> 0x1234, and the SCORING knight is now player
    // ONE. Folding BPCOL's COLDX makes the catch screen-precise, and on 0x2468 the
    // idle player 2 (and player 1) no longer drift into ANY egg within the window — a
    // 1500-frame sweep found no catch there at all. Swept this file's seeds for a real
    // catch (egg-collected fires AND a player scores): 0x1234 frame 273 is the earliest
    // clean one, where the scripted knight (player 1) collects and banks 750. The
    // script and the assertion's INTENT (an egg COLLECTED, not merely removed) are
    // unchanged; only the seed and the scoring ledger moved to the one ordinary play
    // still feeds under screen-precise collision.
    const before = advanceTo(0x1234, 273)
    const after = stepGame(before, inputsAt(273))
    expect(countOf(after, 'egg'), 'precondition: an egg really leaves on this frame').toBe(
      countOf(before, 'egg') - 1,
    )
    expect(
      after.players[0].score,
      'precondition: the egg is COLLECTED (it scores), not merely removed',
    ).toBeGreaterThan(before.players[0].score)
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
  it('a dying knight emits player-death (seed 0xface, frame 1402)', () => {
    // jt8-7 RE-BASELINE: 1938 -> 1810 (see the block comment above).
    //
    // jt5-8 RE-BASELINE: 1888 -> 2062.
    //
    // jt9-9 RE-BASELINE: 2062 -> 2578.
    //
    // jt9-25 RE-BASELINE: 2578 -> 1893. The EGGMAN hatch is now a ~112-frame
    // cutscene before the remount, and a COMMITTED-hatching egg is no longer
    // collectible (a player could otherwise cancel a committed remount mid-crack),
    // so this seed's arena empties differently again. Re-swept 3000 frames of this
    // seed for this test's OWN precondition (a player process leaves the list),
    // never by nudging: 621, 949, 1390, 1893 and 1921 satisfy it now. 1893 rather
    // than the earliest for the reason the jt5-8 note gives and which still holds —
    // the SIBLING test stages `death + 1`, coupled to audio-transporter-split.test.ts,
    // which needs knight TWO. Re-measured: 622, 950, 1391 and 1922 re-enter knight
    // ONE, and 1894 is the only knight-TWO re-entry in the window. Seed, script and
    // every assertion unchanged.
    //
    // jt9-8 RE-BASELINE: 1893 -> 1402. The player's flap-lift budget now RE-INITs
    // on every wing transition, so the scripted knight flies the ROM's cadence and
    // this seed's whole knight timeline moves. Re-swept 3000 frames of this seed
    // under the same script for THIS test's OWN precondition (a player process
    // leaves the list): 251, 821, 1402 and 2996 satisfy it. 1402 rather than the
    // earliest for the reason every prior note gives and which still holds — the
    // SIBLING test stages `death + 1` and is coupled to
    // audio-transporter-split.test.ts, which needs knight TWO. Re-measured off the
    // process list: 252, 822 and 2997 re-enter knight ONE, and 1403 is the only
    // knight-TWO re-entry in the 3000-frame window. Seed, script and every
    // assertion unchanged.
    //
    // jt9-43 RE-BASELINE: 1402 -> 2369. Screen-precise collision (COLDX folded) moves
    // this seed's knight timeline again. Re-swept 4000 frames for THIS test's own
    // precondition (a player process leaves): deaths at 258, 2369 and 3782. 2369 rather
    // than the earliest 258, for the coupling every prior note names — the SIBLING
    // stages `death + 1` and audio-transporter-split.test.ts needs knight TWO: 258 is a
    // knight-ONE death, while 2369 is a knight-TWO death whose 2370 re-entry is a
    // knight-TWO re-entry. Seed, script and every assertion unchanged.
    const before = advanceTo(0xface, 2369)
    const after = stepGame(before, inputsAt(2369))
    expect(countOf(after, 'player'), 'precondition: a knight really dies on this frame').toBe(
      countOf(before, 'player') - 1,
    )
    expect(kindsOf(after)).toContain('player-death')
  })

  it('the transporter re-entry emits player-materialise (seed 0xface, frame 2370)', () => {
    // The frame AFTER the death: `stepGame`'s respawn re-enters the spent knight
    // through the transporter (game.ts), which is the ROM's CREP
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
    // still `death + 1`.
    //
    // jt9-25 RE-BASELINE: 2579 -> 1894, riding the death above (still death + 1).
    // Re-measured knight TWO off the process list (it is the only knight-2 re-entry
    // in a 3000-frame sweep of this seed), so the SNPCR2 attribution survives a
    // third move for the same reason it survived the first two.
    //
    // jt9-8 RE-BASELINE: 1894 -> 1403, riding the death above (still death + 1).
    // Re-measured knight TWO off the process list — it is the only knight-2
    // re-entry in a 3000-frame sweep of this seed — so the SNPCR2 attribution
    // survives a fourth move for the same reason it survived the first three.
    //
    // jt9-43 RE-BASELINE: 1403 -> 2370, riding the death above (still death + 1). 2370
    // is the knight-TWO re-entry on this seed (measured off the process list), so the
    // SNPCR2 attribution survives a fifth move for the same reason it survived the rest.
    const before = advanceTo(0xface, 2370)
    const after = stepGame(before, inputsAt(2370))
    expect(countOf(after, 'player'), 'precondition: the knight really re-enters here').toBe(
      countOf(before, 'player') + 1,
    )
    expect(kindsOf(after)).toContain('player-materialise')
  })

  it('a wave advance emits enemy-materialise, once per arriving buzzard (seed 0xface, frame 4654)', () => {
    // jt8-7 RE-BASELINE: 1614 -> 1641 (see the block comment above).
    //
    // jt5-8 RE-BASELINE: 1726 -> 1900.
    //
    // jt9-9 RE-BASELINE: 1900 -> 2246.
    //
    // jt9-25 RE-BASELINE: 2246 -> 1731. Re-swept for this test's own precondition
    // (the wave counter advances AND the new complement is dealt) and frame 1731 is
    // again the ONLY frame in 3000 that satisfies it — wave 1 -> 2, four buzzards.
    // The hatch cutscene (and the committed-egg no-catch fix) reshapes the whole
    // seed timeline from the first hatch on. Seed, script and every assertion
    // unchanged.
    //
    // jt9-8 RE-BASELINE: 1731 -> 3947, and the SWEEP WINDOW had to grow with it.
    // The ROM-cadence flap budget slows this seed's clear-out badly: sweeping the
    // customary 3000 frames found NO frame satisfying this test's precondition
    // (the wave counter advances) at all, which is what the seed changes at jt5-4
    // and uf1-9 were for. Before reaching for a fourth seed the window was widened
    // to 6000, and 0xface DOES still clear — frame 3947, wave 1 -> 2, dealing four
    // buzzards, and it is the only such frame in 6000. So the seed STAYS: the old
    // "no frame satisfies it" reading was an artefact of the 3000-frame window,
    // not a barren seed. Script and every assertion unchanged.
    //
    // jt9-43 RE-BASELINE: 3947 -> 4654. Screen-precise collision (COLDX folded) slows
    // this seed's clear-out further; re-swept 6000 frames for the precondition (the
    // wave counter advances AND a complement is dealt) — 4654 (wave 1 -> 2) is the
    // earliest. Seed, script and every assertion unchanged.
    //
    // jt9-17 RE-BASELINE: 4654 -> 4370. The OSTLR horizontal shove/turn reshapes
    // this seed's trajectories, clearing wave 1 sooner; re-swept the same 6000
    // frames for the same precondition — 4370 (wave 1 -> 2, four buzzards dealt)
    // is now the earliest. Seed, script and every assertion unchanged.
    //
    // jt9-18 RE-BASELINE: 4370 -> 4714. The BOLEV2 forced glide halves a level
    // flyer's flap rate, so buzzards climb slower and wave 1 clears LATER; re-swept
    // the same 6000 frames for the same precondition (wave 1 -> 2 AND a complement
    // dealt) — 4714 (four buzzards) is now the earliest. Seed, script and every
    // assertion unchanged.
    //
    // jt9-49 RE-BASELINE: 4714 -> 4182. Scoping the horizontal-homing throttle to
    // a live level interval (it no longer ticks off-level) reshapes this seed's
    // buzzard trajectories and wave 1 clears SOONER; re-swept the same 6000 frames
    // for the same precondition (wave 1 -> 2 AND a complement dealt) — 4182 (four
    // buzzards) is now the earliest. Seed, script and every assertion unchanged.
    //
    // jt9-50 RE-BASELINE: 4182 -> 4047. The bounder BOUP cliff-above divert (a bounder
    // flies plain BOLEV level instead of climbing into a ledge) reshapes this seed's
    // buzzard trajectories and wave 1 clears SOONER again; re-swept the same 6000 frames
    // for the same precondition (wave 1 -> 2 AND a complement dealt) — 4047 (four
    // buzzards) is now the earliest. Seed, script and every assertion unchanged.
    const before = advanceTo(0xface, 4047)
    const after = stepGame(before, inputsAt(4047))
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
    //
    // jt9-8 RE-BASELINE: 199 -> 213, tracking the kill above for exactly the same
    // reason — 199 is now silent, and two empty streams compare equal forever.
    //
    // jt9-43 RE-BASELINE: 213 -> 215, tracking the enemy-death re-anchor above.
    const start = advanceTo(0xbeef, 215)
    const twice = kindsOf(stepGame(start, inputsAt(215)))
    expect(twice, 'a quiet frame would make this comparison vacuous').not.toEqual([])
    expect(twice).toEqual(kindsOf(stepGame(start, inputsAt(215))))
  })
})

describe('jt5-1 AC3 — the stream is REBUILT each frame, never carried forward', () => {
  it('an event present on one frame is GONE on the next when nothing re-triggers it', () => {
    // THE test replay determinism cannot make. A stale carry-forward is carried
    // identically in BOTH runs, so the comparison above still passes with the
    // bug in. This one steps past the triggering frame and demands it be gone.
    //
    // jt9-8 RE-BASELINE: 199 -> 213 (and the following frame 200 -> 214), tracking
    // the kill above. Frame 214 is not silent — it collects an egg — but that is
    // beside this test's point: what it demands is that 'enemy-death' does not
    // survive into a frame that did not kill anything.
    // jt9-43 RE-BASELINE: 213/214 -> 215/216, tracking the enemy-death re-anchor.
    const fired = stepGame(advanceTo(0xbeef, 215), inputsAt(215))
    expect(kindsOf(fired), 'precondition: frame 215 must emit the kill').toContain('enemy-death')

    const next = stepGame(fired, inputsAt(216))
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
    //
    // jt9-8: the kill moved 199 -> 213, so frame 200 is no longer "the frame after
    // the kill" — but it is still SILENT (re-measured under the corrected sim), and
    // silence is the whole of what this test needs. The frame therefore stays and
    // only the claim about WHY it is quiet is withdrawn. The frame-after-a-kill
    // property is pinned by the sibling test above, which did move to 214.
    const g = stepGame(advanceTo(0xbeef, 200), inputsAt(200))
    expect(streamOf(g), 'frame 200 is a quiet frame — the stream must be empty').toEqual([])
  })

  it('and a long quiet run stays empty rather than accumulating', () => {
    // The unbounded-growth shape of the same bug: an appended array grows
    // forever and the shell replays the whole wave every frame.
    //
    // jt9-8 RE-BASELINE: the kill moves 199 -> 213, so the trailing run moves with
    // it — 214..226, the same thirteen frames, and frame 226 is silent.
    // jt9-43 RE-BASELINE: 213 -> 215, the trailing run moves with it (216..228).
    let g = stepGame(advanceTo(0xbeef, 215), inputsAt(215))
    expect(kindsOf(g), 'precondition: frame 215 emits the kill').toContain('enemy-death')
    for (let i = 216; i < 229; i++) g = stepGame(g, inputsAt(i))
    expect(
      streamOf(g),
      'the stream never drained — events are accumulating across frames',
    ).toEqual([])
  })

  it('the stream is NOT joust’s capped DemoState.events log wearing a new name', () => {
    // `demo.ts` keeps the last EVENT_LOG_CAP (32) entries of an append-only log and nothing
    // clears it per frame. If the cue channel were that log — or derived from it
    // by the reference-set delta game.ts uses — a quiet frame would still
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
    //
    // jt9-24 RE-BASELINE (the decoded SELPLY nearest-of-two metric re-routes
    // enemy targeting), and the headline is again the field that did NOT move:
    // `rng` is STILL 1_928_172_029 — the metric draws no randomness, the law this
    // group pins. What moved is play-dependent only: enemy#256 is now killed
    // (leaving egg#65792) instead of surviving, and the re-routed contact scores
    // P1 +500.
    //
    // jt9-8 RE-BASELINE (the player's flap-lift budget RE-INITs on a wing
    // transition — `CLR PTIMUP,U`), and for the fourth time the headline is the
    // field that did NOT move: `rng` is STILL 1_928_172_029. A budget reset draws
    // no randomness, which is the law this group exists to pin, and it is a change
    // to how the KNIGHT climbs on every wing edge — the widest input-side change
    // yet — so a draw added anywhere in it would have shown here. What moved is
    // play-dependent only: on the ROM cadence the knight no longer reaches
    // enemy#256 inside 240 frames, so that buzzard survives (no egg#65792) and P1's
    // 500 for it is not scored.
    // jt9-43 RE-BASELINE, and for the fifth time the headline is the field that did
    // NOT move: `rng` is STILL 1_928_172_029 — folding BPCOL's COLDX draws no
    // randomness, the law this group pins. What moved is play-dependent only: the
    // screen-precise mask keeps enemy#256 alive and lays egg#65793, and P2's kill
    // credit drops from 1250 to 500.
    expect(fingerprint(0x1a2b_3c4d, 240)).toEqual({
      frame: 240,
      rng: 1_928_172_029,
      wave: 1,
      procs: 'player#1,player#2,enemy#256,enemy#258,egg#65793',
      scores: [0, 500],
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
    //
    // jt9-24 RE-BASELINE (decoded SELPLY metric), and once more the field that
    // did NOT move is the point: `rng` is STILL 2_006_456_271 — no draw added.
    // The play moved a long way: the re-routed targeting now clears wave 1 and
    // grinds into wave 2, player 1 racks up 7150, and both knights are alive at
    // frame 2400 (lives 2 and 4) rather than player 2 being out.
    //
    // jt9-8 RE-BASELINE (the flap-budget re-init on a wing edge), and once more the
    // field that did NOT move is the point: `rng` is STILL 2_006_456_271, through
    // five consecutive re-baselines of everything around it. The play moved a long
    // way in the OTHER direction this time — a knight that climbs on the ROM's
    // cadence survives and scores far better, so this seed now reaches WAVE 3 by
    // frame 2400 (was 2), both knights are alive on 3 and 4 lives, and the scores
    // roughly double (8350 / 10800) with two fresh wave-3 buzzards and two eggs up.
    // jt9-43 RE-BASELINE (BPCOL's COLDX folded into narrowPhase): `rng` is STILL
    // 2_006_456_271, through six consecutive re-baselines — screen-precise collision
    // draws no randomness, the law this group pins. The play moved the OTHER way this
    // time: rejecting X-blind over-reaches means far fewer kills, so this seed is back
    // to WAVE 1 at frame 2400 (was 3), both knights alive on 5/4 lives, scores 1250/1550.
    // jt9-18 RE-BASELINE (BOLEV2 forced glide + PPVELX snapshot): `rng` is STILL
    // 2_006_456_271, through SEVEN consecutive re-baselines — the forced glide changes
    // how the birds fly, not the numbers the sim draws, which is exactly this group's
    // law. Play moved: still WAVE 1 at frame 2400, both knights alive on 5/4 lives, but
    // the arena now holds TWO grown buzzards rather than one buzzard and an egg, and
    // player 2 scores 500 less (1550 -> 1050) — the slower level flap-rate reshapes the
    // clear-out and the process population.
    // jt9-50 RE-BASELINE (the bounder BOUP cliff-above divert to BOLEV): `rng` is STILL
    // 2_006_456_271, through EIGHT consecutive re-baselines — a bounder that flies plain
    // level instead of climbing into a ledge changes how the birds fly, not the numbers
    // the sim draws, which is exactly this group's law. `wave` still 1. Play moved: the
    // reshaped bounder paths change which enemy survives and the kill credit — P1 now
    // scores 0 (was 1250) and P2 1850 (was 1050), P2 is down to 3 lives (was 4), and the
    // process population holds enemy#256 in place of enemy#4260097.
    expect(fingerprint(0xbeef, 2400)).toEqual({
      frame: 2400,
      rng: 2_006_456_271,
      wave: 1,
      procs: 'player#1,enemy#256,enemy#4260098,player#2',
      scores: [0, 1850],
      lives: [5, 3],
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
    //
    // jt9-24 RE-BASELINE (decoded SELPLY metric): `rng` bit-identical AGAIN
    // (3_436_766_652) — the law this group pins. The re-routed targeting keeps
    // this seed slower through wave 1 in this window (wave 1, not 2, at frame
    // 900) with both knights untouched (lives 5/5), one enemy killed to an egg.
    //
    // jt9-8 RE-BASELINE (the flap-budget re-init on a wing edge): `rng` bit-
    // identical AGAIN (3_436_766_652) — the law this group pins. `wave` is
    // unchanged at 1 as well. What moved is play-dependent only: enemy#256 now
    // survives (so P1's 500 and the egg it left are both gone), player 2 has been
    // jousted down to 3 lives while banking an extra 100, and both knights sit
    // either side of the two surviving buzzards in the process order.
    // jt9-43 RE-BASELINE (BPCOL's COLDX folded): `rng` bit-identical AGAIN
    // (3_436_766_652) and `wave` still 1 — the law this group pins. What moved is
    // play-dependent only: the screen-precise mask leaves an uncollected egg#65794 in
    // the arena and P2 banks 600 rather than 1350; lives unchanged at 5/3.
    expect(fingerprint(0x2468, 900)).toEqual({
      frame: 900,
      rng: 3_436_766_652,
      wave: 1,
      procs: 'player#1,enemy#256,enemy#257,egg#65794,player#2',
      scores: [0, 600],
      lives: [5, 3],
    })
  })

  it('the fingerprint is DISCRIMINATING — a different seed gives different numbers', () => {
    // Without this, three `toEqual`s against hard-coded objects could all be
    // passing because `fingerprint` returns something constant.
    expect(fingerprint(0x2468, 900)).not.toEqual(fingerprint(0xbeef, 900))
  })
})
