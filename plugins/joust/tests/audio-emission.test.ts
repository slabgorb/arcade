// tests/audio-emission.test.ts
//
// Story jt5-1 — REVIEW phase (The Argument Professional / Reviewer). The six
// cue kinds whose EMITTERS nothing else pins, plus the one ROM rule the review
// found the implementation had widened.
//
// ─── WHY THIS FILE EXISTS: A MUTATION RESULT, NOT A HUNCH ────────────────────
// The jt5-1 suite proves the eleven kinds are declared, mapped and dispatched.
// It does NOT prove any of them is ever EMITTED — the manifest sweep, the
// dispatch sweep and the coverage check all read the same `EVENT_KINDS` tuple,
// so they agree with each other whether or not a single event ever fires.
//
// Measured by deleting one emitter at a time from the shipped implementation
// and re-running `npx vitest run --project joust` (1932 tests):
//
//   enemy-death / player-death   deleted -> 5 red      PINNED
//   egg-collected                deleted -> 2 red      PINNED
//   enemy-materialise            deleted -> 1 red      PINNED
//   player-materialise           deleted -> 1 red      PINNED
//   egg-hatched                  deleted -> 0 red      ← unpinned
//   ptero-death                  deleted -> 0 red      ← unpinned
//   ptero-arrives                deleted -> 0 red      ← unpinned
//   cliff-destroyed              deleted -> 0 red      ← unpinned
//   extra-man                    deleted -> 0 red      ← unpinned
//   wave-bounty                  deleted -> 0 red      ← unpinned
//
// Six of eleven cues could be silently dead with every AC still reporting
// green. That is exactly the "certifies its own shape" failure the AC2 guard in
// audio-events.test.ts was written against — but that guard forbids seven
// hard-coded DEFERRED names, so it cannot protect a kind that IS declared and
// whose emitter merely stops firing.
//
// The five pinned kinds all happen in ordinary seeded play, which is why TEA
// reached them with the shipped input script. The six here do not: they need a
// wave the script never survives to, a ledger near a threshold, or a two-entity
// geometry that does not arise on its own. Each is therefore STAGED, and each
// asserts the PRECONDITION (the moment really happened) before the cue — a cue
// test that does not first prove the moment can pass by firing on everything.

import { describe, it, expect } from 'vitest'
import { createWaveDemo, stepDemo, type DemoState, type DemoProcess } from '../src/core/demo.js'
import { createGame, stepGame, type GameState, type PlayerLedger } from '../src/core/game.js'
import { waveRowAt, dispatchWaveType } from '../src/core/wave.js'

const IDLE = { dir: 0 as const, flap: false, flapHeld: false }
const inputs = { 1: IDLE, 2: IDLE }

/** This frame's cue kinds, off the state the shell actually reads. */
const kindsOf = (g: GameState): string[] => g.events.map((e) => e.type)
const simKinds = (d: DemoState): string[] => d.cues.map((c) => c.type)

const count = (d: DemoState, kind: string): number =>
  d.sim.processes.filter((p) => p.kind === kind).length

/** Strip the sim to its players, so the next step finds the wave CLEARED. The
 *  jt4-4 forced-advance idiom (demo-troll.test.ts), reused rather than reinvented. */
const stripToPlayers = (d: DemoState): DemoState => ({
  ...d,
  sim: { ...d.sim, processes: d.sim.processes.filter((p) => p.kind === 'player') },
})

/**
 * Force the demo forward until `wave` is the wave about to END, collecting every
 * frame's cues on the way. Returns the state SITTING on that wave, so a caller
 * steps once more and observes the advance off it.
 */
function advanceToWave(seed: number, wave: number): { at: DemoState; seen: string[] } {
  let d = createWaveDemo(seed)
  const seen: string[] = []
  for (let guard = 0; guard < 200 && d.wave < wave; guard++) {
    d = stripToPlayers(d)
    d = stepDemo(d, {})
    seen.push(...simKinds(d))
  }
  expect(d.wave, `staging failed: never reached wave ${wave}`).toBe(wave)
  return { at: d, seen }
}

// ═════════════════════════════════════════════════════════════════════════════
// The sim's four unpinned emitters
// ═════════════════════════════════════════════════════════════════════════════

describe('jt5-1 — cliff-destroyed is EMITTED when a wave takes a cliff out', () => {
  it('the wave whose status nibble destroys a cliff sounds SNCLIF', () => {
    // Wave 6 is the first whose status grows `destroyedCliffs` (the bridge burns
    // at wave 3, which is a different thing and has no cue).
    const { at } = advanceToWave(0xbeef, 5)
    const stepped = stepDemo(stripToPlayers(at), {})

    expect(stepped.wave, 'precondition: the wave really advanced').toBe(6)
    const gained = stepped.arena.destroyedCliffs.filter(
      (c) => !at.arena.destroyedCliffs.includes(c),
    )
    expect(gained.length, 'precondition: a cliff really was destroyed').toBeGreaterThan(0)
    expect(simKinds(stepped).filter((k) => k === 'cliff-destroyed')).toHaveLength(gained.length)
  })

  it('a wave that destroys nothing new is SILENT', () => {
    // The control. Without it, an emitter that fired on every advance would pass
    // the test above. Wave 1 -> 2 destroys no cliff.
    const first = stepDemo(stripToPlayers(createWaveDemo(0xbeef)), {})
    expect(first.wave, 'precondition: this is a real advance').toBe(2)
    expect(
      first.arena.destroyedCliffs,
      'precondition: nothing is destroyed this early',
    ).toEqual([])
    expect(simKinds(first)).not.toContain('cliff-destroyed')
  })

  it('a REBUILT cliff is silent — destruction reflects the wave, it does not latch', () => {
    // `applyWaveDestruction` rebuilds a cliff whose status bit is now clear, so
    // `destroyedCliffs` SHRINKS on some advances. SNCLIF is the DESTROYER sound;
    // a rebuild must not sound it — which is also why the emitter compares cliff
    // NAMES rather than the array's length.
    //
    // Driven off the sim's own advances rather than a named wave on purpose: the
    // wave counter is BCD-PACKED (`nextWaveBcd` — the tenth wave is 0x10), and
    // whether it stays BCD or becomes an ordinal is td1-12's open question. A
    // test that hardcoded "wave 10" would be asserting against the side of that
    // question it happened to be written on.
    let d = createWaveDemo(0xbeef)
    let rebuilds = 0
    let gains = 0
    for (let n = 0; n < 60 && rebuilds === 0; n++) {
      const before = d.arena.destroyedCliffs
      d = stepDemo(stripToPlayers(d), {})
      const after = d.arena.destroyedCliffs
      const gained = after.filter((c) => !before.includes(c))
      const lost = before.filter((c) => !after.includes(c))
      const cued = simKinds(d).filter((k) => k === 'cliff-destroyed').length
      expect(cued, `an advance cued ${cued} times for ${gained.length} newly destroyed`).toBe(
        gained.length,
      )
      if (gained.length > 0) gains++
      if (lost.length > 0 && gained.length === 0) rebuilds++
    }
    expect(gains, 'precondition: some advance really destroyed a cliff').toBeGreaterThan(0)
    expect(
      rebuilds,
      'precondition: some advance really REBUILT one with nothing new destroyed — ' +
        'without it this test never exercised the case it is named for',
    ).toBeGreaterThan(0)
  })
})

describe('jt5-1 — ptero-arrives is EMITTED when a pterodactyl enters', () => {
  it('a ptero wave sounds SNPTEI once per bird', () => {
    const { at } = advanceToWave(0xbeef, 7)
    const stepped = stepDemo(stripToPlayers(at), {})

    expect(stepped.wave, 'precondition: the wave really advanced').toBe(8)
    expect(
      dispatchWaveType(waveRowAt(8).status, { p1: true, p2: true }),
      'precondition: wave 8 really is a ptero wave',
    ).toBe('ptero')
    const arrived = count(stepped, 'ptero')
    expect(arrived, 'precondition: pteros really entered').toBeGreaterThan(0)
    expect(simKinds(stepped).filter((k) => k === 'ptero-arrives')).toHaveLength(arrived)
  })
})

describe('jt5-1 — egg-hatched is EMITTED when a settled wave egg matures', () => {
  it('an egg wave sounds SNEGGH as its complement remounts', () => {
    // Wave 5 enters its complement AS EGGS (WAVEGG). Each settled egg matures
    // into a remount buzzard, which is the moment SNEGGH marks.
    const { at } = advanceToWave(0xbeef, 4)
    let d = stepDemo(stripToPlayers(at), {})
    expect(d.wave, 'precondition: the wave really advanced').toBe(5)
    expect(count(d, 'egg'), 'precondition: the egg wave really entered as eggs').toBeGreaterThan(0)

    // jt9-25 — SNEGGH marks the MATURING egg (jt9-9: "the maturing egg, not the
    // remount bird's flight in"), which now ENTERS the EGGMAN hatch cutscene rather
    // than becoming a buzzard on the same frame; the remount flies in ~112 frames
    // later. So the precondition on the cue frame is that eggs BEGAN hatching
    // (hatchRow set), not that an egg left and an enemy arrived.
    const hatchingCount = (s: DemoState): number =>
      s.sim.processes.filter((p) => p.kind === 'egg' && p.egg?.hatchRow !== undefined).length
    let hatches = 0
    let sawEggsBeginHatching = false
    for (let f = 0; f < 2000 && hatches === 0; f++) {
      const next = stepDemo(d, inputs)
      const n = simKinds(next).filter((k) => k === 'egg-hatched').length
      if (n > 0) {
        // The precondition, checked on the very frame the cue claims it: eggs began
        // hatching — one per egg-hatched cue.
        sawEggsBeginHatching = hatchingCount(next) - hatchingCount(d) === n
        hatches = n
      }
      d = next
    }
    // The whole settled complement matures on the SAME frame, so this is a
    // count of eggs, not a count of one.
    expect(
      hatches,
      'no egg matured in 2000 frames — the staging, not the cue, is stale',
    ).toBeGreaterThan(0)
    expect(sawEggsBeginHatching, 'precondition: an egg really began hatching, one per cue').toBe(true)
  })
})

describe('jt5-1 — ptero-death is EMITTED, and is not the player death next door', () => {
  /** Stage a knight and a ptero in the geometry that resolves one way or the
   *  other. `lanceOffset` = plantZ + (player.posY>>8) − (ptero.posY>>8), and the
   *  glide band is 10 ± 2, so the ptero sits ten pixels above the knight's lance
   *  for a kill and well outside the band for the fallback. */
  function stage(offset: number): DemoState {
    const d = stepDemo(createWaveDemo(0x1234), {})
    const knight = d.sim.processes.find((p) => p.kind === 'player')
    if (!knight?.entity) throw new Error('staging: no live knight')
    const e = knight.entity
    const facing = knight.facing ?? 1
    const ptero: DemoProcess = {
      id: 0x900,
      cls: 'secondary',
      nap: 1,
      period: 1,
      kind: 'ptero',
      facing: facing > 0 ? -1 : 1,
      collisionEnabled: true,
      entity: { ...e, posX: e.posX + (facing > 0 ? 4 : -4), posY: (e.plantZ + (e.posY >> 8) - offset) << 8 },
    }
    return { ...d, sim: { ...d.sim, processes: [knight, ptero] } }
  }

  it('a lance-height kill sounds SNPTED and leaves a dissolving body', () => {
    const stepped = stepDemo(stage(10), inputs)
    expect(
      count(stepped, 'dissolve'),
      'precondition: the ptero really died (a dissolve replaced it)',
    ).toBe(1)
    expect(count(stepped, 'ptero'), 'precondition: the live ptero is gone').toBe(0)
    expect(simKinds(stepped)).toContain('ptero-death')
    expect(simKinds(stepped), 'the knight survived — this is not a player death').not.toContain(
      'player-death',
    )
  })

  it('the SAME contact outside the band kills the KNIGHT and sounds SNPDIE instead', () => {
    // The control that makes the test above mean something. An earlier staging
    // of this pair produced `player-death` and looked like a pass, because a cue
    // did come out — it was the correct cue for the opposite outcome.
    //
    // Offset 14 is deliberate: still INSIDE the 16px collision box, so a contact
    // really is resolved, but outside the 10±2 glide band, so it resolves the
    // other way. Push it past the box (24+) and neither entity dies — the test
    // would then pass its `not.toContain` for the reason that nothing happened.
    const stepped = stepDemo(stage(14), inputs)
    expect(count(stepped, 'player'), 'precondition: the knight really died').toBe(0)
    expect(simKinds(stepped)).toContain('player-death')
    expect(simKinds(stepped)).not.toContain('ptero-death')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// The session layer's two unpinned emitters
// ═════════════════════════════════════════════════════════════════════════════

const withLedgers = (g: GameState, patch: Partial<PlayerLedger>): GameState => ({
  ...g,
  players: g.players.map((p) => ({ ...p, ...patch })),
})

describe('jt5-1 — extra-man is EMITTED when a REPLAY threshold is crossed', () => {
  it('a ledger crossing 20,000 sounds SNREPL, once per man', () => {
    // Parked just under the threshold; ordinary play then carries it across.
    // uf1-8 re-stage: seed 0xbeef's idle run now KILLS a knight on the same
    // frame its ledger first moves (a committed dive lands at frame 213), so
    // the `gained` precondition read 0 — the award refilled the life the same
    // frame took. Seed 0x2468's idle run scores first at frame 213 too
    // (+500, the buzzard dies under the idle knight's lance) with NO death in
    // the window (measured to 700 frames), and 19,990 parks every ledger one
    // gain short of the threshold, so the first score event IS the crossing.
    let g = withLedgers(createGame(0x2468), { score: 19_990, extraManAt: 20_000 })
    const livesBefore = g.players.map((p) => p.lives)

    let fired = 0
    let livesAfter = livesBefore
    for (let i = 0; i < 600 && fired === 0; i++) {
      g = stepGame(g, inputs)
      fired = kindsOf(g).filter((k) => k === 'extra-man').length
      livesAfter = g.players.map((p) => p.lives)
    }
    expect(fired, 'no extra man was awarded in 600 frames — staging is stale').toBeGreaterThan(0)
    const gained = livesAfter.reduce((n, l, i) => n + Math.max(0, l - livesBefore[i]), 0)
    expect(gained, 'precondition: a man was really awarded').toBeGreaterThan(0)
    expect(fired, 'one cue per man awarded').toBe(gained)
  })

  it('a game nowhere near the threshold is SILENT', () => {
    let g = createGame(0xbeef)
    for (let i = 0; i < 200; i++) {
      g = stepGame(g, inputs)
      expect(kindsOf(g)).not.toContain('extra-man')
    }
  })
})

describe('jt5-1 — wave-bounty is the GLADIATOR claim only, as the ROM has it', () => {
  // SNBOUN's ONLY call site in the ROM is :4711, inside SPDGLA ("ONLY 1
  // GLADIATOR IN THE WAVE", :4691). The co-op bonus (:2642-2658) and the
  // survival bonus (:2674-2693) award the same 3,000 through SCRHUN + WAVMSG
  // and play NOTHING — verified by reading both routines and WAVMSG itself for
  // a VSND. An earlier revision of this story sounded SNBOUN for all three,
  // which the citation gate could not catch: the quoted line is byte-perfect,
  // and it is the SCOPE of the claim that was wrong.

  /** A GameState sitting on `wave`, stripped to knights so the next step
   *  advances, with the PLYG guards set as given. */
  function endingWave(wave: number, guards: { plyg1: number; plyg2: number }): GameState {
    const g = createGame(0xbeef)
    return {
      ...g,
      guards,
      sim: {
        ...g.sim,
        wave,
        sim: { ...g.sim.sim, processes: g.sim.sim.processes.filter((p) => p.kind === 'player') },
      },
    }
  }

  it('a CLAIMED gladiator wave pays the claimer and sounds SNBOUN', () => {
    // $80 is SPDGLA's "INDICATE TRUE WINNING GLADIATOR" marker (:4693).
    const before = endingWave(4, { plyg1: 0x80, plyg2: 0 })
    expect(
      dispatchWaveType(waveRowAt(4).status, { p1: true, p2: true }),
      'precondition: wave 4 really is a gladiator wave',
    ).toBe('gladiator')

    const after = stepGame(before, inputs)
    expect(after.wave, 'precondition: the wave really ended').not.toBe(before.wave)
    expect(
      after.players[0].score,
      'precondition: the claimer really was paid',
    ).toBeGreaterThan(before.players[0].score)
    expect(kindsOf(after).filter((k) => k === 'wave-bounty')).toHaveLength(1)
  })

  it('an UNCLAIMED gladiator wave pays nobody and is silent', () => {
    const before = endingWave(4, { plyg1: 0, plyg2: 0 })
    const after = stepGame(before, inputs)
    expect(after.wave, 'precondition: the wave really ended').not.toBe(before.wave)
    expect(
      after.players.map((p) => p.score),
      'precondition: nobody claimed, so nobody was paid',
    ).toEqual(before.players.map((p) => p.score))
    expect(kindsOf(after)).not.toContain('wave-bounty')
  })

  it('the CO-OP team bonus pays 3,000 and sounds NOTHING — the machine is silent there', () => {
    // The rule this file was written to pin. A troll counts as a wave-holding
    // combatant (so the clear is FOUGHT and the bonus is really awarded) but is
    // neither enemy nor egg, so it does not hold the wave open — which is what
    // makes a co-op award observable in one step.
    const { at } = advanceToWave(0xbeef, 7)
    expect(
      dispatchWaveType(waveRowAt(7).status, { p1: true, p2: true }),
      'precondition: wave 7 really is a co-op wave',
    ).toBe('coop')
    expect(
      at.sim.processes.some((p) => p.kind === 'troll'),
      'precondition: a combatant is present, so the clear counts as FOUGHT',
    ).toBe(true)

    const g = createGame(0xbeef)
    const before: GameState = { ...g, guards: { plyg1: 0, plyg2: 0 }, sim: stripToPlayersKeepingTroll(at) }
    const after = stepGame(before, inputs)

    expect(after.wave, 'precondition: the wave really ended').not.toBe(before.wave)
    expect(
      after.players.reduce((n, p) => n + p.score, 0),
      'precondition: the co-op bonus really was paid',
    ).toBeGreaterThan(before.players.reduce((n, p) => n + p.score, 0))
    expect(
      kindsOf(after),
      'the co-op award has no sound in the ROM — SNBOUN is the gladiator claim',
    ).not.toContain('wave-bounty')
  })
})

/** Players + any troll: a fought clear that still clears in one step. */
function stripToPlayersKeepingTroll(d: DemoState): DemoState {
  return {
    ...d,
    sim: {
      ...d.sim,
      processes: d.sim.processes.filter((p) => p.kind === 'player' || p.kind === 'troll'),
    },
  }
}
