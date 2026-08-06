// tests/demo-jt8-4.test.ts
//
// Story jt8-4 — RED phase (Han Solo / TEA). EGG COLLECTION: the player-vs-egg
// catch pass (PLYEGG :3009 / EGGSCR :3030-3095).
//
// RED today: `collisionPass` (demo.ts) filters its participants to
// `p.kind === 'player' || p.kind === 'enemy'` (demo.ts) — an egg process
// is not eligible for ANY collision, so a player can stand inside an egg forever.
// Nothing emits a `reason:'egg'` score event; the variant exists in the DemoEvent
// union (demo.ts) with no producer.
//
// ─── REUSE-FIRST, AND THE ONE PLACE IT BITES ─────────────────────────────────
// The story is explicit that the scoring ladder and the air bonus already exist
// and are tested in egg.ts (jt2-4): EGG_VALUE_LADDER 250/500/750/1000,
// `bumpEggHits` pegged at 4, `airCatchBonus` gated on PFEET, `eggScoreEvents`
// composing the two. This suite REUSES those exports as its own oracle — every
// expected value below is read out of egg.ts, never re-hardcoded — so a
// re-implementation of the ladder inside the catch pass cannot pass by agreeing
// with a literal I typed here.
//
// But the ROM puts the COUNTER somewhere our port does not, and that is this
// story's real work. In EGGSCR the hit count is reached through the PLAYER:
//
//     LDY  PDECSN,U     ; U = "THE PLAYER'S (VICTOR) WORKSPACE THAT HIT THE EGG"
//     LDY  DEGGS,Y      ; DEGGS = "EGG KILLED COUNTER", a DECISION BLOCK field
//     LDB  ,Y           ; read
//     ...  CMPB #4 / BHS / INCB
//     STB  ,Y           ; WRITTEN BACK — it carries across successive eggs
//                                        (JOUSTRV4.SRC:3033-3053, :101-113)
//
// (jt8-6 note: "carries across eggs" is the whole of it — within one life of one
// wave. The counter is cleared at a new game (:907/:912), at EVERY wave start
// (WNRM :1979-1980) and on the player's own death (DEATH1/DEATH2 :4669/:4675).)
//
// `DEGGS RMB 2  EGG KILLED COUNTER` is declared inside the `* DECISION BLOCK *`
// at `ORG $0` (:101-113) — per-PLAYER state, indirected, and never reset by
// EGGSCR. Our port stores `hitCount` on the EGG instead (egg.ts), where BOTH
// producers hard-code it to 0 (`spawnEgg` egg.ts, `settledWaveEgg`
// demo.ts) and nothing ever writes it back. So `eggScoreEvents` today can
// only ever compute `eggValue(bumpEggHits(0))` = 250: the 500/750/1000 rungs are
// unreachable in the running game, and AC-2's "the ladder value follows the hit
// count" is unsatisfiable through the egg's own field no matter how the catch
// pass is wired.
//
// Hence the ladder-climb pins below are stated as OBSERVABLES over successive
// catches, deliberately seam-AGNOSTIC about where Dev homes the counter (a field
// on the player process, a per-player record beside `budget`/`targets` on
// DemoSim — jt8-1's precedent). What they forbid is the counter living on a
// per-egg field that resets with every egg.
//
// ─── WHAT EACH PIN KILLS ─────────────────────────────────────────────────────
// Every assertion is annotated with the mutant it kills. The epic has lost
// rounds to mutation survivors, and jt8-2's RED was rejected for a contract that
// could not be satisfied at all — so this suite was probed against a throwaway
// implementation before handoff (see the TEA Assessment's mutation table).

import { describe, it, expect } from 'vitest'
import {
  loadDemo,
  type DemoState,
  type DemoProcess,
  type EggState,
} from './helpers/demo-contract.js'
import { loadEgg } from './helpers/egg-contract.js'
import { loadGame } from './helpers/game-contract.js'
import { loadFlight, type PlayerInput } from './helpers/flight-contract.js'
import { loadArena } from './helpers/arena-contract.js'
import { loadDifficulty } from './helpers/difficulty-contract.js'

const SEED = 0x1234_5678

const PLAYER1_ID = 1
const PLAYER2_ID = 2

// ─── Staging ─────────────────────────────────────────────────────────────────

/** A player process at an exact pixel position — the catcher. */
function playerAt(id: number, posX: number, pixelY: number): DemoProcess {
  return {
    id,
    cls: 'primary',
    nap: 1,
    period: 1,
    kind: 'player',
    facing: 1,
    mount: id === PLAYER1_ID ? 'ostrich' : 'stork',
    entity: {
      posX,
      posY: pixelY << 8,
      velXIndex: 0,
      velXFrac: 0,
      velY: 0,
      timeUp: 1,
      groundState: null,
      plantZ: 0,
      airborne: true,
      animPhase: 0,
    },
  }
}

/** An egg with test-neutral defaults (mirrors demo.test.ts's local factory). */
function eggOf(over: Partial<EggState>): EggState {
  return {
    posX: 100,
    posY: 40 << 8,
    velX: 0,
    velY: 0,
    bumpX: 0,
    bumpY: 0,
    eggsLeft: 4,
    hitCount: 0,
    pfeet: 0,
    settled: false,
    ...over,
  }
}

/** An egg PROCESS in the kill-egg id namespace (`$1_0000+`, demo.ts). */
function eggProcAt(id: number, over: Partial<EggState>): DemoProcess {
  return { id, cls: 'secondary', nap: 1, period: 1, kind: 'egg', egg: eggOf(over) }
}

/**
 * An inert wave-HOLDER. `enemiesLeft` (demo.ts) only asks whether some
 * process has `kind:'enemy'`, while both the frame stepper (frame.ts,
 * `&& p.enemy`) and `toJoustEntity` (demo.ts) require an `enemy` payload —
 * so a payload-less enemy process holds the wave open, is never stepped, and can
 * never joust the catcher. Without it a caught last egg CLEARS the wave
 * (demo.ts) and the advance spawns a fresh complement mid-test — and
 * wave 5 is the EGG wave, which would deal new eggs into the middle of the
 * ladder walk.
 */
function waveHolder(): DemoProcess {
  return { id: 0x7000, cls: 'secondary', nap: 1, period: 1, kind: 'enemy' }
}

const withProcesses = (d: DemoState, procs: readonly DemoProcess[]): DemoState => ({
  ...d,
  sim: { ...d.sim, processes: procs },
})

const eggs = (d: DemoState): DemoProcess[] => d.sim.processes.filter((p) => p.kind === 'egg')
const enemies = (d: DemoState): DemoProcess[] => d.sim.processes.filter((p) => p.kind === 'enemy')

/** The `reason:'egg'` score VALUES the frame that produced `after` emitted. */
function eggValuesOf(before: DemoState, after: DemoState): number[] {
  const prior = new Set(before.events)
  return after.events
    .filter((e) => !prior.has(e))
    .filter((e): e is Extract<typeof e, { kind: 'score' }> => e.kind === 'score')
    .filter((e) => e.reason === 'egg')
    .map((e) => e.value)
}

/** The `reason:'egg'` events (values + attribution) the frame emitted. */
function eggEventsOf(
  before: DemoState,
  after: DemoState,
): { value: number; player?: number }[] {
  const prior = new Set(before.events)
  return after.events
    .filter((e) => !prior.has(e))
    .filter((e): e is Extract<typeof e, { kind: 'score' }> => e.kind === 'score')
    .filter((e) => e.reason === 'egg')
    .map((e) => ({ value: e.value, player: e.player }))
}

const sum = (ns: readonly number[]): number => ns.reduce((a, b) => a + b, 0)

/** A column that stays airborne through the staging band — no ledge underfoot, so
 *  `stepEgg` cannot bounce the egg (and clear PFEET) before the catch is tested. */
async function findAir(): Promise<{ x: number; y: number }> {
  const flight = await loadFlight()
  const arena = await loadArena()
  for (let x = 8; x <= 284; x++) {
    let clear = true
    for (let y = 24; y <= 72; y++) {
      if (arena.groundOutcome(flight.groundMaskAt(x, y)).kind !== 'airborne') {
        clear = false
        break
      }
    }
    if (clear) return { x, y: 36 }
  }
  throw new Error('no open-air column found')
}

/** The first (x,y) that is air with a ledge directly below — a settle site. */
async function findLedge(): Promise<{ x: number; y: number }> {
  const flight = await loadFlight()
  const arena = await loadArena()
  for (let x = 8; x <= 284; x++) {
    for (let y = 24; y <= 200; y++) {
      const below = arena.groundOutcome(flight.groundMaskAt(x, y + 1))
      const here = arena.groundOutcome(flight.groundMaskAt(x, y))
      if (below.kind === 'platform' && here.kind === 'airborne') return { x, y }
    }
  }
  throw new Error('no ledge found in the arena')
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — THE CATCH PASS EXISTS: score the egg, remove the egg.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt8-4 AC-1 — collisionPass gains a player-vs-egg pass (PLYEGG :3009)', () => {
  it('a player overlapping an egg scores it and the egg LEAVES the process list', async () => {
    // Kills the do-nothing mutant (today's code: eggs are not collision-eligible)
    // and the "score but leave the egg" mutant — the ROM stops the egg colliding
    // in the same breath as it scores (EGGWAK ANDA #$7F, :3092-3094).
    const dmod = await loadDemo()
    const { x, y } = await findAir()
    const demo = withProcesses(dmod.createWaveDemo(SEED), [
      playerAt(PLAYER1_ID, x, y),
      eggProcAt(0x1_0001, { posX: x, posY: y << 8 }),
      waveHolder(),
    ])
    expect(eggs(demo).length, 'staged with exactly one egg').toBe(1)

    const after = dmod.stepDemo(demo)

    expect(eggValuesOf(demo, after).length, 'the catch emitted at least one egg score').toBeGreaterThan(0)
    expect(eggs(after).length, 'the caught egg is gone').toBe(0)
  })

  it('a player NOWHERE NEAR an egg does not collect it — the pass is positional', async () => {
    // Kills the "eat every egg on the board each frame" mutant, which would pass
    // every other test in this file.
    const dmod = await loadDemo()
    const { x, y } = await findAir()
    const demo = withProcesses(dmod.createWaveDemo(SEED), [
      playerAt(PLAYER1_ID, x, y),
      // Two full box-widths away horizontally (ENTITY_BOX_W = 16, demo.ts).
      eggProcAt(0x1_0002, { posX: x + 64, posY: y << 8, settled: true, pfeet: 1 }),
      waveHolder(),
    ])

    const after = dmod.stepDemo(demo)

    expect(eggValuesOf(demo, after), 'a distant egg is not scored').toEqual([])
    expect(eggs(after).length, 'a distant egg survives').toBe(1)
  })

  it('the catch is scored ONCE, not once per frame while the player sits there', async () => {
    // Kills the "flag it non-colliding but keep the process" mutant: the egg would
    // be re-scored (or the wave held open) on every subsequent frame.
    const dmod = await loadDemo()
    const { x, y } = await findAir()
    const demo = withProcesses(dmod.createWaveDemo(SEED), [
      playerAt(PLAYER1_ID, x, y),
      eggProcAt(0x1_0003, { posX: x, posY: y << 8 }),
      waveHolder(),
    ])

    const first = dmod.stepDemo(demo)
    const firstValues = eggValuesOf(demo, first)
    expect(firstValues.length, 'the first frame scored the egg').toBeGreaterThan(0)

    const second = dmod.stepDemo(first)
    expect(eggValuesOf(first, second), 'no second helping from the same egg').toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — MID-AIR vs SETTLED, AND THE LADDER THAT MUST ACTUALLY CLIMB.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt8-4 AC-2 — the EGGVAL ladder and the PFEET air bonus (:3063-3069, :3097-3104)', () => {
  it('a MID-AIR catch (PFEET=0) scores the ladder PLUS the cited 500', async () => {
    // Oracle is egg.ts, not a literal: AIR_CATCH_BONUS + eggValue(bumpEggHits(0)).
    const dmod = await loadDemo()
    const egg = await loadEgg()
    const { x, y } = await findAir()
    const demo = withProcesses(dmod.createWaveDemo(SEED), [
      playerAt(PLAYER1_ID, x, y),
      eggProcAt(0x1_0004, { posX: x, posY: y << 8, pfeet: 0, settled: false }),
      waveHolder(),
    ])

    const after = dmod.stepDemo(demo)
    const values = eggValuesOf(demo, after)

    const firstRung = egg.eggValue(egg.bumpEggHits(0))
    expect(sum(values), 'ladder + the mid-air bonus').toBe(firstRung + egg.AIR_CATCH_BONUS)
    expect(values, 'the 500 is present as its own cited award').toContain(egg.AIR_CATCH_BONUS)
  })

  it('a SETTLED catch (PFEET nonzero) scores the ladder ONLY — no 500', async () => {
    // Kills the "always add 500" mutant and the "never add 500" mutant together
    // with the test above.
    const dmod = await loadDemo()
    const egg = await loadEgg()
    const { x, y } = await findLedge()
    const demo = withProcesses(dmod.createWaveDemo(SEED), [
      playerAt(PLAYER1_ID, x, y),
      eggProcAt(0x1_0005, { posX: x, posY: y << 8, pfeet: 1, settled: true }),
      waveHolder(),
    ])

    const after = dmod.stepDemo(demo)
    const values = eggValuesOf(demo, after)

    expect(sum(values), 'the bounced egg pays the ladder alone').toBe(egg.eggValue(egg.bumpEggHits(0)))
    expect(values, 'no air bonus for a landed egg').not.toContain(egg.AIR_CATCH_BONUS)
  })

  it('the ladder CLIMBS across successive catches by the same player, then PEGS at the cap', async () => {
    // THE STORY'S CENTRE. Today every egg carries hitCount 0 (spawnEgg egg.ts,
    // settledWaveEgg demo.ts) and nothing writes it back, so a per-egg counter
    // pays the first rung forever. This kills that mutant — and it also kills a
    // counter that climbs but never pegs (the CMPB #4 / BHS cap, :3043).
    //
    // Settled eggs throughout, so the air bonus cannot mask a rung.
    const dmod = await loadDemo()
    const egg = await loadEgg()
    const { x, y } = await findLedge()

    let state = withProcesses(dmod.createWaveDemo(SEED), [playerAt(PLAYER1_ID, x, y), waveHolder()])
    const collected: number[] = []

    for (let n = 0; n < 5; n++) {
      const staged = withProcesses(state, [
        ...state.sim.processes.filter((p) => p.kind !== 'egg'),
        eggProcAt(0x1_0100 + n, { posX: x, posY: y << 8, pfeet: 1, settled: true }),
      ])
      const stepped = dmod.stepDemo(staged)
      collected.push(sum(eggValuesOf(staged, stepped)))
      state = stepped
    }

    // eggValue(bumpEggHits(k)) for k = 0..4 — the ROM ladder read out of egg.ts,
    // pegged by its own cap on the fifth catch.
    const expected = [0, 1, 2, 3, 4].map((k) => egg.eggValue(egg.bumpEggHits(k)))
    expect(collected, 'five catches walk the EGGVAL ladder and peg').toEqual(expected)

    // Independently: the walk is strictly increasing until it pegs, and it pegs
    // at the cited cap. Fails loudly if `expected` itself ever degenerates.
    expect(collected[0], 'the first catch is the FIRST rung').toBe(egg.EGG_VALUE_LADDER[0])
    expect(collected[3], 'the fourth catch reaches the cap').toBe(egg.EGG_VALUE_CAP)
    expect(collected[4], 'the fifth catch stays pegged, never past the table').toBe(egg.EGG_VALUE_CAP)
    expect(new Set(collected).size, 'the rungs are genuinely distinct (not four copies of 250)').toBe(4)
  })

  it("one player's ladder does not advance the OTHER player's — DEGGS is per-decision-block", async () => {
    // The DEGGS counter hangs off PDECSN,U (:3033) — the CATCHING player's own
    // decision block. Kills the "one global egg counter" mutant, which climbs
    // correctly for a solo pilot and silently steals P2's first rung in co-op.
    const dmod = await loadDemo()
    const egg = await loadEgg()
    const { x, y } = await findLedge()

    // P1 and P2 staged far apart; each catches its own egg on its own frame.
    const p2x = x + 96
    let state = withProcesses(dmod.createWaveDemo(SEED), [
      playerAt(PLAYER1_ID, x, y),
      playerAt(PLAYER2_ID, p2x, y),
      waveHolder(),
    ])

    // P1 takes two eggs.
    const p1Values: number[] = []
    for (let n = 0; n < 2; n++) {
      const staged = withProcesses(state, [
        ...state.sim.processes.filter((p) => p.kind !== 'egg'),
        eggProcAt(0x1_0200 + n, { posX: x, posY: y << 8, pfeet: 1, settled: true }),
      ])
      const stepped = dmod.stepDemo(staged)
      p1Values.push(sum(eggValuesOf(staged, stepped)))
      state = stepped
    }
    expect(p1Values, 'P1 walked two rungs').toEqual([
      egg.eggValue(egg.bumpEggHits(0)),
      egg.eggValue(egg.bumpEggHits(1)),
    ])

    // Now P2's FIRST egg — it must pay the FIRST rung, not P1's third.
    const staged = withProcesses(state, [
      ...state.sim.processes.filter((p) => p.kind !== 'egg'),
      eggProcAt(0x1_02ff, { posX: p2x, posY: y << 8, pfeet: 1, settled: true }),
    ])
    const stepped = dmod.stepDemo(staged)
    const p2Events = eggEventsOf(staged, stepped)

    expect(sum(p2Events.map((e) => e.value)), "P2's first catch is P2's FIRST rung").toBe(
      egg.eggValue(egg.bumpEggHits(0)),
    )
    expect(
      p2Events.every((e) => e.player === PLAYER2_ID),
      'and it is attributed to P2',
    ).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — LEDGER ATTRIBUTION, AND THE REMOUNT THAT MUST NOT ARRIVE.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt8-4 AC-3 — the catching player is credited; the remount is cancelled', () => {
  it("P2's catch credits P2's ledger and leaves P1's alone (through the jt4-1 drain)", async () => {
    // The existing game.ts drain already routes `reason:'egg'` by `player`
    // (game.ts) — this proves the catch pass SETS `player`, which is the
    // only new thing. Kills the "emit with no player" mutant, which would silently
    // default to PLAYER1_ID (game.ts's `?? PLAYER1_ID`) and pay the wrong pilot.
    const gmod = await loadGame()
    const { x, y } = await findLedge()

    const base = gmod.createGame(SEED)
    const staged = {
      ...base,
      sim: withProcesses(base.sim, [
        playerAt(PLAYER1_ID, x, y),
        playerAt(PLAYER2_ID, x + 96, y),
        eggProcAt(0x1_0300, { posX: x + 96, posY: y << 8, pfeet: 1, settled: true }),
        waveHolder(),
      ]),
    }
    const p1Before = staged.players[0].score
    const p2Before = staged.players[1].score

    const after = gmod.stepGame(staged)

    expect(after.players[1].score, "P2's ledger took the egg").toBeGreaterThan(p2Before)
    expect(after.players[0].score, "P1's ledger did not move").toBe(p1Before)
  })

  it('a caught wave egg does NOT also mature into a remount buzzard (the AUTOFF branch)', async () => {
    // EGGSCR's `LDY PDIST,X` / `LDD #AUTOFF / STD PJOY,Y` (:3078-3087) sends the
    // inbound bird away when its rider is collected. Our port has no in-transit
    // riderless bird — a SETTLED wave egg matures straight into a remount enemy in
    // the same stepDemo (demo.ts) — so the reachable analogue is this: an
    // egg caught this frame must not ALSO hatch this frame.
    //
    // This is the ordering pin. collisionPass (demo.ts) already runs before the
    // hatch flatMap (:988), so a catch that REMOVES the egg is safe; a catch that
    // merely marks the egg non-colliding leaves it visible to the flatMap and the
    // player gets both the score and a fresh enemy. That mutant dies here.
    const dmod = await loadDemo()
    const { x, y } = await findLedge()

    const demo = withProcesses(dmod.createWaveDemo(SEED), [
      playerAt(PLAYER1_ID, x, y),
      {
        ...eggProcAt(0x1_0400, { posX: x, posY: y << 8, pfeet: 1, settled: true, eggsLeft: 3 }),
        waveEgg: true,
      },
      waveHolder(),
    ])
    const enemiesBefore = enemies(demo).length

    const after = dmod.stepDemo(demo)

    expect(eggValuesOf(demo, after).length, 'the wave egg was in fact caught').toBeGreaterThan(0)
    expect(eggs(after).length, 'and it is gone').toBe(0)
    expect(
      enemies(after).length,
      'no remount buzzard flew in for a rider that was already collected',
    ).toBe(enemiesBefore)
  })

  it('an UNCAUGHT settled wave egg still hatches — the cancel is scoped to the catch', async () => {
    // The re-seat guard: the jt4-5 self-clear must survive this story. Without
    // this, "cancel the remount" could be implemented as "never hatch", which
    // would re-lock every egg wave and pass the test above.
    //
    // jt9-9 RE-BASELINE — one frame is no longer enough, and the guard's claim
    // is unchanged. A settled egg now serves the EGGWT2 wait before it matures
    // (EGGLND `LDA EGGWT` / `PCNAP 12` / `DEC PJOYT,U`, JOUSTRV4.SRC:3224-3237),
    // so this runs the wait out and then asserts exactly what it always did.
    // The wait is READ from the row rather than typed as a literal, so it
    // follows the difficulty walk instead of pinning wave 1 forever.
    const dmod = await loadDemo()
    const diff = await loadDifficulty()
    const { x, y } = await findLedge()

    const demo = withProcesses(dmod.createWaveDemo(SEED), [
      // The player is far away — nothing is caught.
      playerAt(PLAYER1_ID, x + 96, y),
      {
        ...eggProcAt(0x1_0500, { posX: x, posY: y << 8, pfeet: 1, settled: true, eggsLeft: 3 }),
        waveEgg: true,
      },
    ])

    // jt9-25 RE-BASELINE — the wait is no longer enough on its own: a matured egg
    // now walks the EGGMAN cutscene (EGGTBL, JOUSTRV4.SRC:3290-3544) for
    // EGG_HATCH_ANIM_FRAMES before the remount buzzard flies in. Run the wait AND the
    // cutscene out; the guard's claim (an uncaught egg still matures) is unchanged.
    const waitFrames =
      diff.waveValue('EGGWT2', 1) * dmod.EGG_WAIT_NAP_FRAMES + dmod.EGG_HATCH_ANIM_FRAMES
    let after = demo
    for (let f = 0; f < waitFrames; f++) after = dmod.stepDemo(after)

    expect(eggValuesOf(demo, after), 'nothing was caught').toEqual([])
    expect(enemies(after).length, 'the untouched wave egg still matures into its remount').toBe(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-1/AC-2/AC-3 END-TO-END — a REAL kill, a REAL egg, real player input.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt8-4 integration — the egg you take straight off your own kill', () => {
  it('P2 kills a bounder and collects its egg mid-air on the next frame, banking DVALUE + ladder + 500', async () => {
    // Every pin above stages processes by hand. This one drives the shipped sim with
    // nothing but a seed and a held input, so it also proves the catch is REACHABLE
    // in play — a staged-only suite can pass with a pass that real geometry never
    // triggers.
    //
    // Frames probed under this exact seed/input (the jt4-2 deterministic-frame
    // discipline): f146 the kill credits the bounder DVALUE, f147 the egg credits the
    // first ladder rung + the mid-air 500. The egg spawns at the victim's position
    // (spawnEgg: victim X+4, Y−8px) with PFEET=0, and P2 is still there — which is
    // exactly the play the +500 bonus (:3063-3069) exists to reward.
    // jt9-43 re-anchor 145→146: the COLDX (screen-X) fold shifted the seeded
    // trajectory one frame later; the kill→catch pair is intact, now at f146/f147.
    const gmod = await loadGame()
    const egg = await loadEgg()
    const SEED_1234 = 0x1234
    const input: Record<number, PlayerInput> = { 2: { dir: -1, flap: true, flapHeld: true } }

    let game = gmod.createGame(SEED_1234)
    let killValue = 0
    for (let f = 1; f <= 146; f++) game = gmod.stepGame(game, input)

    const killEvent = game.sim.events.find((e) => e.kind === 'score')
    expect(killEvent, 'the seeded kill really fired — the test is not dead').toBeDefined()
    killValue = (killEvent as { value: number }).value
    expect(game.players[1].score, 'at the kill frame P2 has banked the DVALUE alone').toBe(killValue)

    const afterEgg = gmod.stepGame(game, input)

    const expectedEgg = egg.eggValue(egg.bumpEggHits(0)) + egg.AIR_CATCH_BONUS
    expect(
      afterEgg.players[1].score,
      'the next frame adds the first ladder rung PLUS the mid-air bonus',
    ).toBe(killValue + expectedEgg)
    expect(afterEgg.players[0].score, 'and P1, idle and far away, banks nothing').toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-4 — DETERMINISM. A seeded catch replays bit-for-bit.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt8-4 AC-4 — a seeded catch run replays its score events exactly', () => {
  it('two identical seeded runs emit an IDENTICAL, non-empty egg-score sequence', async () => {
    // A seeded PRNG makes "it is deterministic" cheap, so this asserts the
    // sequence against the egg.ts ladder as well as against itself — a frozen sim
    // that catches nothing would satisfy self-equality alone.
    const dmod = await loadDemo()
    const egg = await loadEgg()
    const { x, y } = await findLedge()

    const run = (): number[] => {
      let state = withProcesses(dmod.createWaveDemo(SEED), [
        playerAt(PLAYER1_ID, x, y),
        waveHolder(),
      ])
      const values: number[] = []
      for (let n = 0; n < 3; n++) {
        const staged = withProcesses(state, [
          ...state.sim.processes.filter((p) => p.kind !== 'egg'),
          eggProcAt(0x1_0600 + n, { posX: x, posY: y << 8, pfeet: 1, settled: true }),
        ])
        const stepped = dmod.stepDemo(staged)
        values.push(...eggValuesOf(staged, stepped))
        state = stepped
      }
      return values
    }

    const a = run()
    const b = run()

    expect(a, 'the replay is bit-for-bit identical').toEqual(b)
    expect(a, 'and it is the real ladder, not an empty run agreeing with itself').toEqual(
      [0, 1, 2].map((k) => egg.eggValue(egg.bumpEggHits(k))),
    )
  })
})
