// tests/game-loop.test.ts
//
// Story jt4-4 — RED phase (Leeloo / TEA). The BEHAVIOUR suite for the FOURTH and
// final game.ts session-layer module of epic jt4: GAME-OVER (the GOVER tri-state),
// the WAVE-TO-WAVE LOOP consolidated under stepGame, and the jt4-3 arm/detect/award
// loop gone LIVE. (The demo.ts sim concerns — DBAIT baiter removal + the WAVEGG
// egg-hatch spawn + the collisionPass partner-kill EVENT — are pinned in the
// companion tests/demo-jt4-4.test.ts; the source re-derivation + JT44-* claim
// coverage in tests/game-loop-source.test.ts.)
//
//   1. AC-1 — GOVER is TRI-STATE per the ROM: 0 = OVER (ATTRCT `CLR GOVER`,
//      JOUSTRV4.SRC:712), NEGATIVE = running (the boot `DEC GOVER`, :1015), positive
//      `$7F` = the attract/game-SIMULATION mode (GAMSIM, :232-233). Two knights =
//      two independent ledgers: a player at ZERO lives is OUT and WAITS; the game
//      reaches OVER only when EVERY player is out. Proven at 1P and 2P.
//   2. AC-2 — the wave-to-wave loop runs under `stepGame` with score/lives/gover on
//      the SINGLE `stepDemo`-wrapping sim step (no second stepping path — the jt2-1
//      one-sim seam); a seeded game replays bit-for-bit and a forced wave advance
//      rides the ledgers on the one step.
//   3. Forward-carried from jt4-3 (all in scope this story): the live gladiator
//      arm/detect/award loop through stepGame; `recordPartnerKill` idempotence vs
//      the $80 claimed marker (the ROM DEC-keep-positive, :4688); and the
//      `ledger(19_000)`-style bounty-crossing extra-man re-check of `awardWaveBounty`.
//
// Every test loads the not-yet-built jt4-4 surface INSIDE its own it() via
// loadGameLoop (the tp1-8 collection trap) — it reddens cleanly ("jt4-4 game-over …
// not built yet") until Korben ships `settleGameOver` + the GOVER_* constants and
// wires the loop. Each test NAMES the mutant it kills (guard-must-be-mutation-tested).

import { describe, it, expect } from 'vitest'
import { loadGameLoop } from './helpers/game-contract.js'
import { loadDemo } from './helpers/demo-contract.js'
import type { GameState, PlayerLedger, PlayerInput } from './helpers/game-contract.js'
import type { DemoProcess, EntityState } from './helpers/demo-contract.js'

const SEED = 0x1234
const NSHIP = 5

const flap = (dir: -1 | 0 | 1): PlayerInput => ({ dir, flap: true, flapHeld: true })

/** A ledger literal at a chosen `lives` (NSHIP by default), un-awarded at 20,000. */
function ledger(over: Partial<PlayerLedger> = {}): PlayerLedger {
  return { score: 0, scoreBcd: [0, 0, 0], lives: NSHIP, extraManAt: 20_000, out: false, ...over }
}

function entity(over: Partial<EntityState> = {}): EntityState {
  return {
    posX: 50, posY: 100 << 8, velXIndex: 0, velXFrac: 0, velY: 0,
    timeUp: 1, groundState: null, plantZ: 0, airborne: true, animPhase: 0, ...over,
  }
}

/** Replace the wrapped sim's process list (a constructed sim state), clearing events. */
function withProcesses(game: GameState, procs: DemoProcess[]): GameState {
  return {
    ...game,
    sim: { ...game.sim, sim: { ...game.sim.sim, processes: procs }, events: [] },
  }
}

/** Live player process ids inside the wrapped sim (GameState.sim is a DemoState). */
const livePlayers = (game: GameState): number[] =>
  game.sim.sim.processes.filter((p) => p.kind === 'player').map((p) => p.id)

/** One forced wave advance: strip the sim to its players (a CLEARED wave) and step. */
function forceAdvance(g: Awaited<ReturnType<typeof loadGameLoop>>, game: GameState): GameState {
  const players = game.sim.sim.processes.filter((p) => p.kind === 'player')
  return g.stepGame(withProcesses(game, players))
}

/** Advance a game to a target 1-based wave via forced clears (deterministic). */
function advanceGameTo(g: Awaited<ReturnType<typeof loadGameLoop>>, game: GameState, target: number): GameState {
  let d = game
  let guard = 0
  while (d.wave < target) {
    d = forceAdvance(g, d)
    if (++guard > 60) throw new Error(`stuck advancing to wave ${target} at ${d.wave}`)
  }
  return d
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — the GOVER tri-state + per-player out + all-out game-over.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 GOVER — the tri-state constants (0 over / negative running / $7F attract)', () => {
  it('exports the three GOVER rungs — over 0, running negative, attract $7F — all distinct', async () => {
    const g = await loadGameLoop()
    // Kills "gover is a bare boolean / two-state": the ROM value is a signed byte
    // with THREE meanings (JOUSTRV4.SRC:712 CLR=over, :1015 DEC=running, :232-233 $7F).
    expect(g.GOVER_OVER, 'over is 0 (ATTRCT CLR GOVER)').toBe(0)
    expect(g.GOVER_RUNNING, 'running is negative (the boot DEC GOVER → non-zero .NE.)').toBeLessThan(0)
    expect(g.GOVER_ATTRACT, 'the attract/simulation rung is $7F (GAMSIM LDA #$7F)').toBe(0x7f)
    // The three rungs must be genuinely different values (kills "all aliased to 0").
    expect(new Set([g.GOVER_OVER, g.GOVER_RUNNING, g.GOVER_ATTRACT]).size, 'three distinct rungs').toBe(3)
  })

  it('a fresh game boots RUNNING — not over, not the attract simulation; no player is out', async () => {
    const g = await loadGameLoop()
    const game = g.createGame(SEED)
    // Kills "createGame boots gover=0 (instantly over)" and "boots into $7F attract".
    expect(game.gover, 'a real game boots at the running rung').toBe(g.GOVER_RUNNING)
    expect(game.gover, 'and is NOT over').not.toBe(g.GOVER_OVER)
    expect(game.gover, 'and is NOT the attract simulation').not.toBe(g.GOVER_ATTRACT)
    expect(game.players.every((p) => !p.out), 'both knights start in the game (not out)').toBe(true)
  })
})

describe('AC-1 game-over — settleGameOver: a player at 0 lives is OUT; over only when ALL are out', () => {
  it('a ledger at zero lives is OUT; a ledger with lives left is NOT out', async () => {
    const g = await loadGameLoop()
    const { players } = g.settleGameOver([ledger({ lives: 0 }), ledger({ lives: 3 })])
    // Kills "out is never set" and "out set for anyone who lost a life".
    expect(players.map((p) => p.out), 'lives 0 → out; lives 3 → still in').toEqual([true, false])
  })

  it('2P — the game is OVER only when BOTH players are out; a lone survivor keeps it RUNNING', async () => {
    const g = await loadGameLoop()
    // Both out → over.
    expect(g.settleGameOver([ledger({ lives: 0 }), ledger({ lives: 0 })]).gover, 'both out → GOVER_OVER').toBe(
      g.GOVER_OVER,
    )
    // One out, one alive → NOT over: the dead partner WAITS (kills "over when ANY player is out").
    const oneOut = g.settleGameOver([ledger({ lives: 0 }), ledger({ lives: 2 })])
    expect(oneOut.gover, 'a survivor keeps the game running').toBe(g.GOVER_RUNNING)
    expect(oneOut.players.map((p) => p.out), 'P1 out, P2 waiting-in').toEqual([true, false])
    // Both alive → running.
    expect(g.settleGameOver([ledger(), ledger()]).gover, 'both alive → running').toBe(g.GOVER_RUNNING)
  })

  it('1P — the solo game is over the instant its single ledger is out', async () => {
    const g = await loadGameLoop()
    expect(g.settleGameOver([ledger({ lives: 0 })]).gover, 'solo, 0 lives → over').toBe(g.GOVER_OVER)
    expect(g.settleGameOver([ledger({ lives: 1 })]).gover, 'solo, 1 life → still running').toBe(g.GOVER_RUNNING)
  })

  it('settleGameOver does not mutate its argument ledgers (pure)', async () => {
    const g = await loadGameLoop()
    const players = [ledger({ lives: 0 }), ledger({ lives: 0 })]
    const before = JSON.stringify(players)
    g.settleGameOver(players)
    expect(JSON.stringify(players), 'settleGameOver returns new ledgers, never mutates').toBe(before)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 INTEGRATION — game-over settled LIVE through stepGame off the sim's deaths.
//   Deterministic seam (SEED 0x1234): with the two knights driven APART, P1 loses a
//   partner-joust and its process is removed at frame 49 (the jt4-2 death seam) with
//   NO enemy involved. A lone survivor never dies in a unit window (no respawn), so
//   the ALL-OUT game-over is driven from a constructed all-dead state.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 integration — stepGame settles out/gover from the live sim', () => {
  it("a P1 death drops P1 to OUT but keeps the game RUNNING while P2 survives (the partner WAITS)", async () => {
    const g = await loadGameLoop()
    // Both knights on their LAST life so the one sim death makes P1 out.
    const base = g.createGame(SEED)
    let game: GameState = { ...base, players: [{ ...base.players[0], lives: 1 }, { ...base.players[1], lives: 1 }] }
    const input: Record<number, PlayerInput> = { 1: flap(-1), 2: flap(1) }
    let died = false
    for (let f = 1; f <= 120; f++) {
      const next = g.stepGame(game, input)
      if (livePlayers(game).includes(1) && !livePlayers(next).includes(1)) {
        game = next
        died = true
        break
      }
      game = next
    }
    expect(died, "P1 must actually lose its partner-joust in the window — the test is not dead").toBe(true)
    // The live settle (kills "stepGame carries gover forward, never recomputes out").
    expect(game.players[0].lives, 'P1 spent its last man').toBe(0)
    expect(game.players[0].out, 'P1 is now OUT').toBe(true)
    expect(game.players[1].out, 'P2 is still in the game — waiting is not out').toBe(false)
    // All-out gate: one survivor → the game is NOT over yet (kills "over when the first player is out").
    expect(game.gover, 'the game runs on while P2 survives').toBe(g.GOVER_RUNNING)
  })

  it('when EVERY player is out the stepped game reaches GOVER_OVER', async () => {
    const g = await loadGameLoop()
    // A constructed all-dead state (both ledgers at 0 lives, both player processes already
    // gone) — stepGame must RECOMPUTE gover from the lives each frame and reach over.
    const base = g.createGame(SEED)
    const dead: GameState = withProcesses(
      { ...base, players: base.players.map((p) => ({ ...p, lives: 0, out: false })) },
      [],
    )
    const stepped = g.stepGame(dead)
    expect(stepped.players.every((p) => p.out), 'both knights are out').toBe(true)
    expect(stepped.gover, 'all out → the game is OVER (kills "gover stuck at running")').toBe(g.GOVER_OVER)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — the wave-to-wave loop consolidated under stepGame (the one-sim seam).
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-2 the loop — score/lives/gover ride the SINGLE stepDemo-wrapping sim step', () => {
  it('stepGame delegates ALL stepping to stepDemo — the wrapped sim is bit-identical (no second path)', async () => {
    const g = await loadGameLoop()
    const d = await loadDemo()
    const input: Record<number, PlayerInput> = { 1: flap(-1), 2: flap(1) }
    let game = g.createGame(SEED)
    let sim = d.createWaveDemo(SEED)
    for (let i = 0; i < 30; i++) {
      game = g.stepGame(game, input)
      sim = d.stepDemo(sim, input)
    }
    // The jt2-1 one-sim seam: a forked/divergent stepping path in the consolidated loop
    // would make game.sim drift from a raw stepDemo. They must stay byte-identical.
    expect(game.sim, 'stepGame wraps stepDemo — no divergent second stepping path').toEqual(sim)
  })

  it('a seeded stepGame run replays bit-for-bit (score + lives + gover + sim)', async () => {
    const g = await loadGameLoop()
    const input: Record<number, PlayerInput> = { 1: flap(-1), 2: flap(1) }
    const run = (): GameState => {
      let game = g.createGame(SEED)
      for (let i = 0; i < 80; i++) game = g.stepGame(game, input)
      return game
    }
    const a = run()
    const b = run()
    // Non-vacuous: the window contains P1's frame-49 death, so a life was actually spent.
    // jt4-5 LOOSENING (Reviewer Ruling #2): the EXACT count (NSHIP-1 = exactly one death in 80f)
    // assumed the jt4-4 no-respawn model. A ROM-faithful timed re-materialise window (jt4-5) lets
    // the re-entered P1 die AGAIN under this continuous-flap input, so the one-death count is
    // entangled with the respawn fix. Loosened to the strongest surviving INTENT — a death WAS
    // booked (lives < NSHIP), non-vacuous either way. The bit-for-bit replay below is the real guard.
    expect(a.players[0].lives, 'the run is non-vacuous — at least one death was booked').toBeLessThan(NSHIP)
    expect(a.players, 'the ledgers replay bit-for-bit').toEqual(b.players)
    expect(a.gover, 'gover replays bit-for-bit').toBe(b.gover)
    expect(a.sim, 'and the wrapped sim is deterministic').toEqual(b.sim)
  })

  it('a CLEARED wave advances the wave AND carries the ledgers on the ONE step', async () => {
    const g = await loadGameLoop()
    const game = g.createGame(SEED)
    // Strip the sim to its players (a cleared wave) and step: the wave-to-wave advance
    // runs INSIDE the single stepGame — the wave increments and the ledgers ride along.
    const advanced = forceAdvance(g, game)
    expect(advanced.wave, 'a cleared wave advances to wave 2 under stepGame').toBe(2)
    expect(advanced.wave, 'the GameState wave mirrors the wrapped sim wave').toBe(advanced.sim.wave)
    // The ledgers survive the advance (kills "the loop drops the registers on a wave change").
    expect(advanced.players.length, 'both ledgers persist across the advance').toBe(2)
    expect(advanced.players.every((p) => p.lives === NSHIP), 'lives ride the advance').toBe(true)
    expect(advanced.gover, 'gover stays running across the advance').toBe(g.GOVER_RUNNING)
    // Deterministic across a re-run.
    expect(forceAdvance(g, game), 'the advance replays bit-for-bit').toEqual(advanced)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Forward-carried from jt4-3 — the arm/detect/award loop goes LIVE through stepGame.
//   Reaching a gladiator wave (wave 4, status $06) proves stepGame ARMS the guards at
//   wave start; injecting a partner-kill into that wave proves stepGame DETECTS it and
//   AWARDS the 3,000 bounty at wave end — the whole loop on the single sim step.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt4-3 carry — stepGame arms the PLYG guards at each wave start', () => {
  it('reaching the gladiator wave (wave 4) arms the guards to −1 (the 1st-encounter trigger)', async () => {
    const g = await loadGameLoop()
    const atWave4 = advanceGameTo(g, g.createGame(SEED), 4)
    expect(atWave4.wave, 'reached the gladiator wave').toBe(4)
    // stepGame must arm the guards for the RESOLVED wave type at wave start (2P gladiator
    // → −1). Kills "guards carried forward unchanged from boot {0,0}" (the jt4-3 deferral).
    expect(atWave4.guards, 'a gladiator wave arms PLYG1/2 to −1').toEqual(g.armWaveGuards('gladiator'))
    expect(atWave4.guards, 'and that is the armed −1, not the boot 0').toEqual({ plyg1: -1, plyg2: -1 })
  })
})

describe('jt4-3 carry — a LIVE gladiator partner-kill is detected + awarded through stepGame', () => {
  it('a partner-kill on the gladiator wave banks the winner 3,000 at wave end (arm→detect→award)', async () => {
    const g = await loadGameLoop()
    const atWave4 = advanceGameTo(g, g.createGame(SEED), 4)
    // Inject two knights positioned so P1 (higher on screen) wins the partner-joust and P2
    // dies; with no enemies the wave then CLEARS on the same step. The consolidated loop must
    // record the partner-kill (recordPartnerKill) BEFORE awarding the ending wave's bounty.
    const p1: DemoProcess = {
      id: 1, cls: 'primary', nap: 1, period: 1, kind: 'player', facing: 1, mount: 'ostrich',
      collisionEnabled: true, entity: entity({ posX: 100, posY: 100 << 8 }),
    }
    const p2: DemoProcess = {
      id: 2, cls: 'primary', nap: 1, period: 1, kind: 'player', facing: -1, mount: 'stork',
      collisionEnabled: true, entity: entity({ posX: 104, posY: 108 << 8 }),
    }
    const stepped = g.stepGame(withProcesses(atWave4, [p1, p2]))
    const bounty = g.decodeDvalue('SCRHUN', 0x30)
    expect(livePlayers(stepped).includes(2), 'P2 lost the partner-joust and was removed').toBe(false)
    expect(stepped.wave, 'the gladiator wave cleared and advanced').toBe(5)
    // The whole loop: P1 was armed at −1, its partner-kill flipped it to the claimed marker,
    // and the wave-end award paid P1 the 3,000. Kills "detection unwired" AND "award skipped".
    expect(stepped.players[0].score, 'the first partner-killer banks the gladiator 3,000').toBe(bounty)
    expect(bounty, 'the bounty is the SCRHUN $30 pass-through (3,000)').toBe(3000)
  })
})

describe('jt4-3 carry — recordPartnerKill is idempotent against a same-winner re-kill (ROM DEC-keep-positive)', () => {
  it('a second kill by the already-claimed winner KEEPS the claim — the bounty is not lost', async () => {
    const g = await loadGameLoop()
    const bounty = g.decodeDvalue('SCRHUN', 0x30)
    // P1 claims the gladiator on the 1st encounter (−1 → claimed). A gladiator loser who
    // respawns and is re-killed by P1 must NOT lose the claim: the ROM's `INC ,Y` then
    // `DEC ,Y (KEEP THE NBR POSITIVE)` (JOUSTRV4.SRC:4688) preserves the $80 marker. The
    // jt4-3 model booked $80 as +128, so a re-INC → 129 would DROP the claim (bounty lost).
    const once = g.recordPartnerKill(g.armWaveGuards('gladiator'), 1)
    const twice = g.recordPartnerKill(once, 1)
    const paidOnce = g.awardWaveBounty([ledger(), ledger()], 'gladiator', {
      alive: [true, true], guards: once, died: [false, false],
    })
    const paidTwice = g.awardWaveBounty([ledger(), ledger()], 'gladiator', {
      alive: [true, true], guards: twice, died: [false, false],
    })
    expect(paidOnce.map((p) => p.score), 'one kill pays P1 the 3,000').toEqual([bounty, 0])
    // Kills "a re-kill bumps the claimed marker past $80 and the award no longer recognises it".
    expect(paidTwice.map((p) => p.score), 'a same-winner re-kill still pays P1 exactly 3,000 (claim kept)').toEqual([
      bounty,
      0,
    ])
  })

  it('the OTHER player killing after P1 has claimed still wins P1 nothing extra (only 1 gladiator)', async () => {
    const g = await loadGameLoop()
    const bounty = g.decodeDvalue('SCRHUN', 0x30)
    let guards = g.recordPartnerKill(g.armWaveGuards('gladiator'), 1)
    guards = g.recordPartnerKill(guards, 2) // P2 kills after P1 already claimed
    const paid = g.awardWaveBounty([ledger(), ledger()], 'gladiator', {
      alive: [true, true], guards, died: [false, false],
    })
    expect(paid.map((p) => p.score), 'the FIRST killer (P1) keeps the bounty; P2 gets nothing').toEqual([bounty, 0])
  })
})

describe('jt4-3 carry — awardWaveBounty re-checks the extra-man threshold (the ledger(19_000) crossing)', () => {
  it('a bounty that crosses 20,000 awards an extra man AND re-arms the threshold', async () => {
    const g = await loadGameLoop()
    const bounty = g.decodeDvalue('SCRHUN', 0x30) // 3,000
    // A ledger sitting at 19,000: a clean co-op 3,000 bounty pushes it to 22,000, crossing the
    // REPLAY 20,000 threshold. awardWaveBounty must run the SCRLEV extra-man re-check (as every
    // score change does), so lives increments and extraManAt re-arms to 40,000. Kills "the
    // wave bounty credits score but skips the extra-man re-check" (mutation-confirmed jt4-3 gap).
    const [after] = g.awardWaveBounty([ledger({ score: 19_000, extraManAt: 20_000 })], 'coop', {
      alive: [true, true], guards: { plyg1: 0, plyg2: 0 }, died: [false, false],
    })
    expect(after.score, 'the bounty crosses 20,000').toBe(19_000 + bounty)
    expect(after.lives, 'crossing 20,000 awards an extra man').toBe(NSHIP + 1)
    expect(after.extraManAt, 'and the threshold re-arms to 40,000').toBe(40_000)
  })

  it('a bounty that does NOT reach the threshold awards no man (the guard is non-vacuous)', async () => {
    const g = await loadGameLoop()
    // 10,000 + 3,000 = 13,000 < 20,000 → no man. Proves the crossing test above is real.
    const [after] = g.awardWaveBounty([ledger({ score: 10_000, extraManAt: 20_000 })], 'coop', {
      alive: [true, true], guards: { plyg1: 0, plyg2: 0 }, died: [false, false],
    })
    expect(after.lives, 'a sub-threshold bounty awards no extra man').toBe(NSHIP)
    expect(after.extraManAt, 'and the threshold stays armed at 20,000').toBe(20_000)
  })
})
