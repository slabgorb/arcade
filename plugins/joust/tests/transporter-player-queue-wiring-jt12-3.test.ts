// tests/transporter-player-queue-wiring-jt12-3.test.ts
//
// Story jt12-3 — RED phase (Leeloo / TEA). WIRING the transporter's player-side
// service queue and the SELARE occupancy safety into the live sim. Both mechanics'
// pure transforms already exist, are byte-verified against JOUSTRV4.SRC and are
// unit-tested in transporter.test.ts — they simply have NO production callers today:
//
//   • `takePlayerNumber` / `servePlayer` / `nextServed` (core/transporter.ts:179-220,
//     the CREP→CRELP take-a-number path, JOUSTRV4.SRC:5615-5676) — grep confirms ZERO
//     callers outside their own definitions and the transporter unit test. So no player
//     ever draws NPSERV: `nextServed` can never return 'player' in play (npserv == lpserv
//     always), and serveEnemies' players-first guard (`enemyTurn`'s `npserv === lpserv`
//     clause) is DEAD — it never once blocks an enemy. The re-created knight in
//     game.ts (`respawnPlayerProcess`, sim.ts:644) is spliced straight into the arena,
//     bypassing the deli-counter the ROM sends it through (`CREP1/CREP2 → LDA NPSERV …
//     BRA CRELP`, JOUSTRV4.SRC:5615-5618).
//   • `spawnProceeds(scanAreas(occupantYs), tier)` (core/transporter.ts:139-151, SELARE,
//     JOUSTRV4.SRC:5641-5654) — the empty-third rule. serveEnemies serves an arrival onto
//     any FREE pad regardless of how crowded that pad's third already is, so a
//     materialisation never defers on occupancy.
//
// This suite drives both wires through the public seams that own them:
//   • the occupancy gate at `stepSim` (core/sim.ts serveEnemies) — a staged crowded
//     third must DEFER an otherwise-serveable arrival, an empty third must still SERVE it;
//   • the player queue at `stepGame` (core/game.ts respawn block) — a re-entering knight
//     must draw a player number (`npserv` advances) and be served THROUGH the queue
//     (`lpserv` advances, which only `servePlayer` does and only when the players-first
//     `nextServed` branch fires).
//
// ─── DUAL-ASSERTION DISCIPLINE (jt12-2 precedent) ────────────────────────────
// Every test first proves its STAGING is valid on TODAY's unwired code (the arrival is
// really serve-eligible; the knight really re-enters), so a RED failure is unambiguously
// the MISSING WIRE and never a mis-staged scenario. Then the wire assertion fails RED.

import { describe, it, expect } from 'vitest'
import {
  createWaveSim,
  stepSim,
  type SimState,
  type SimProcess,
  type PendingEnemy,
} from '../src/core/sim.js'
import { createGame, stepGame, GOVER_RUNNING, type GameState, type PlayerLedger } from '../src/core/game.js'
import { type EntityState } from '../src/core/enemy.js'
import { nextServed, type ServiceQueue } from '../src/core/transporter.js'
import { withNoPendingEnemies, seatWaveInstantly } from './helpers/wave-entry.js'

const SEED = 0x1234
const NSHIP = 5

// The TR2 pad — evaluated x=231, y=128, tier MIDDLE (JOUSTRV4.SRC:5588). The arrival
// below is drawn onto it, so its target third is MIDDLE and crowding MIDDLE must defer it.
const TR2_X = 231
const TR2_PIXEL_Y = 128

// ─── staging helpers (game-jt4-5 / jt12-2 vocabulary, replicated) ─────────────

function entity(over: Partial<EntityState> = {}): EntityState {
  return {
    posX: 50,
    posY: 100 << 8,
    velXIndex: 0,
    velXFrac: 0,
    velY: 0,
    timeUp: 1,
    groundState: null,
    plantZ: 0,
    airborne: true,
    animPhase: 0,
    ...over,
  }
}

/** A player process with collisions ON — the higher joust rider WINS (joust.ts). */
function playerProc(id: number, posX: number, pixelY: number, facing: -1 | 1, mount: 'ostrich' | 'stork'): SimProcess {
  return {
    id,
    cls: 'primary',
    nap: 1,
    period: 1,
    kind: 'player',
    facing,
    mount,
    collisionEnabled: true,
    entity: entity({ posX, posY: pixelY << 8 }),
  }
}

/** A materialised ground enemy at a chosen position — an arena OCCUPANT (its Y feeds
 *  scanAreas), NOT on a pad (posX off every pad, so it is never "in use"). */
function enemyProc(id: number, posX: number, pixelY: number): SimProcess {
  return {
    id,
    cls: 'secondary',
    nap: 1,
    period: 1,
    kind: 'enemy',
    enemyType: 'bounder',
    collisionEnabled: true,
    enemy: { entity: entity({ posX, posY: pixelY << 8 }), facing: 1, pchase: 0, brain: 'linet', decision: 'boundr' },
  } as unknown as SimProcess
}

/** A pending arrival drawn onto TR2 (middle third), first in line and off its nap, whose
 *  ticket is up — so on today's code serveEnemies serves it the moment a pad is free. */
function pendingOnTR2(id: number): PendingEnemy {
  return { arrival: enemyProc(id, TR2_X, TR2_PIXEL_Y), ticket: 0, nap: 0 }
}

/** A queue where an enemy holds the up ticket (`enemyTurn(q,0)` true: leserv 0, and
 *  npserv == lpserv so the players-first clause does not itself block it). */
const enemyIsUp: ServiceQueue = { npserv: 0, lpserv: 0, neserv: 1, leserv: 0 }

/** Stage an explicit arena + waiting room + queue onto a clean wave-1 sim. */
function stagedSim(processes: readonly SimProcess[], pending: readonly PendingEnemy[], queue: ServiceQueue): SimState {
  const base = withNoPendingEnemies(createWaveSim(SEED))
  return { ...base, sim: { ...base.sim, processes }, pendingEnemies: pending, serviceQueue: queue, events: [] }
}

const served = (d: SimState, id: number): boolean => d.sim.processes.some((p) => p.id === id)
const stillPending = (d: SimState, id: number): boolean => (d.pendingEnemies ?? []).some((pe) => pe.arrival.id === id)

// ═════════════════════════════════════════════════════════════════════════════
// SELARE occupancy safety — a materialisation DEFERS into an already-crowded third.
//   gate: serveEnemy on spawnProceeds(scanAreas(occupantYs), tier)
//   (JOUSTRV4.SRC:5641-5654). RED today: serveEnemies has no occupancy gate.
// ═════════════════════════════════════════════════════════════════════════════
describe('jt12-3 SELARE gate — an arrival into an already-crowded third DEFERS', () => {
  const ARRIVAL = 0xe001
  // A knight parked in the BOTTOM third (constant across both cases, never touches MIDDLE)
  // so the sim always has a live process and the ONLY variable is the crowd's third.
  const parkedKnight = playerProc(1, 3, 0xe0, 1, 'ostrich')

  it('a crowded MIDDLE third defers the TR2 arrival (the SELARE gate is wired)', () => {
    // Crowd MIDDLE with a materialised enemy at y=0x80. TR2's third is MIDDLE, so
    // spawnProceeds(scanAreas(occupantYs), 'middle') is false — the arrival must NOT serve.
    const crowd = enemyProc(0x7001, 5, 0x80)
    const before = stagedSim([parkedKnight, crowd], [pendingOnTR2(ARRIVAL)], enemyIsUp)

    const after = stepSim(before)

    // STAGING VALIDITY: on today's UNwired code the arrival IS served (proves it was
    // otherwise serve-eligible — its ticket was up and TR2 was free). This assertion is
    // what will FLIP: green now, and after the wire the arrival is deferred instead.
    // THE WIRE (red today): a crowded MIDDLE third defers the spawn — the arrival stays
    // in the waiting room and does NOT materialise.
    expect(served(after, ARRIVAL), 'a crowded third must DEFER the arrival — it does not materialise').toBe(false)
    expect(stillPending(after, ARRIVAL), 'the deferred arrival re-naps with its ticket intact').toBe(true)
  })

  it('an empty MIDDLE third still SERVES the TR2 arrival (control — the gate is occupancy-typed)', () => {
    // Same arrival, but the crowd sits in the TOP third instead, leaving MIDDLE empty.
    // spawnProceeds(...,'middle') is true → the arrival serves exactly as before. Green
    // today AND after the wire: kills an "always defer" mutant that would starve every
    // pad, and a mutant that reads the wrong third.
    const crowd = enemyProc(0x7001, 5, 0x20)
    const before = stagedSim([parkedKnight, crowd], [pendingOnTR2(ARRIVAL)], enemyIsUp)

    const after = stepSim(before)

    expect(served(after, ARRIVAL), 'an empty target third serves the arrival normally').toBe(true)
    expect(stillPending(after, ARRIVAL), 'a served arrival leaves the waiting room').toBe(false)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// The player-side service queue — a re-entering knight is routed through CRELP.
//   ROM: CREP1/CREP2 → LDA NPSERV … BRA CRELP (JOUSTRV4.SRC:5615-5618): the
//   re-created player TAKES A NUMBER and waits its turn in the SAME deli-counter as
//   the enemies, served ahead of them (the players-first branch).
// ═════════════════════════════════════════════════════════════════════════════

/** Replace the wrapped sim's process list (a constructed arena), clearing events and
 *  the waiting room (jt11-4: a queued arrival left in would hold the wave open and
 *  materialise mid-probe). Preserves serviceQueue — the queue under test. */
function withProcesses(game: GameState, procs: SimProcess[]): GameState {
  return {
    ...game,
    sim: { ...withNoPendingEnemies(game.sim), sim: { ...game.sim.sim, processes: procs }, events: [] },
  }
}

/** Seat the wave's queued complement at once (the pre-queue frame-0 arrangement) so a
 *  materialising hold-enemy is on the board to keep the wave open through the respawn. */
const seated = (game: GameState): GameState => ({ ...game, sim: seatWaveInstantly(game.sim) })

const livePlayers = (game: GameState): number[] =>
  game.sim.sim.processes.filter((p) => p.kind === 'player').map((p) => p.id)

/**
 * Stage the proven game-jt4-5 partner-kill: P1 (higher) wins, P2 (8px lower) dies with
 * lives left, so DECLIV falls THROUGH the zero-gate to a CREP re-create. A materialising
 * wave-1 enemy holds the wave open so a survivor-only wave does not clear and re-seed
 * (which would reset the queue). Returns the game AFTER the killing step (P2 removed,
 * lives left, a rebirth due) so each test drives the respawn from an identical state.
 */
function afterPartnerKill(g: {
  createGame: typeof createGame
  stepGame: typeof stepGame
}): GameState {
  const base = seated(g.createGame(SEED))
  const holdEnemy = base.sim.sim.processes.find((p) => p.kind === 'enemy') as SimProcess
  const p1 = playerProc(1, 100, 100, 1, 'ostrich')
  const p2 = playerProc(2, 104, 108, -1, 'stork')
  const start: GameState = {
    ...withProcesses(base, [p1, p2, holdEnemy]),
    players: [
      { ...base.players[0], lives: NSHIP } as PlayerLedger,
      { ...base.players[1], lives: 3 } as PlayerLedger,
    ],
  }
  const stepped = g.stepGame(start)
  return stepped
}

describe('jt12-3 player queue — a re-entering knight is routed through takePlayerNumber', () => {
  it('a re-materialising knight draws a player service number (npserv advances past 0)', () => {
    const g = { createGame, stepGame }
    const killed = afterPartnerKill(g)

    // STAGING VALIDITY (green today — jt4-5 respawn shipped): P2 lost the partner-joust,
    // keeps two men, is NOT out, and the game is running — a rebirth is genuinely due.
    expect(livePlayers(killed).includes(2), 'P2 lost the partner-joust and was removed').toBe(false)
    expect(killed.players[1].lives, 'P2 spent one man but keeps two — a rebirth is due').toBe(2)
    expect(killed.players[1].out, 'P2 is not out — it must re-enter').toBe(false)
    expect(killed.gover, 'the game is running through the respawn').toBe(GOVER_RUNNING)

    // Drive the respawn and watch the player counter. THE WIRE (red today): the re-entry
    // draws NPSERV (`takePlayerNumber`), so npserv climbs past 0. Today no player path
    // ever touches the queue, so npserv is pinned at 0 forever.
    let game = killed
    let reentered = false
    let maxNpserv = game.sim.serviceQueue?.npserv ?? 0
    for (let f = 1; f <= 600 && !reentered; f++) {
      game = stepGame(game)
      maxNpserv = Math.max(maxNpserv, game.sim.serviceQueue?.npserv ?? 0)
      if (livePlayers(game).includes(2)) reentered = true
    }
    expect(reentered, 'staging: P2 re-materialises within the window (jt4-5 respawn)').toBe(true)
    expect(maxNpserv, 'the re-entering knight drew a player service number (takePlayerNumber): npserv > 0').toBeGreaterThan(
      0,
    )
  })

  it('the re-entering knight is SERVED through the players-first branch (lpserv advances past 0)', () => {
    // `lpserv` is advanced ONLY by `servePlayer`, and a knight is served ONLY when
    // `nextServed(queue) === 'player'` — the players-first branch (JOUSTRV4.SRC:5672-5676).
    // So lpserv climbing past 0 is direct proof the now-live branch fired and the knight
    // was served through CRELP arbitration, ahead of the enemies. RED today: lpserv is
    // pinned at 0 because no player is ever served through the queue.
    const g = { createGame, stepGame }
    const killed = afterPartnerKill(g)
    expect(killed.players[1].out, 'staging: P2 has lives left — a rebirth is due').toBe(false)

    let game = killed
    let reentered = false
    let maxLpserv = game.sim.serviceQueue?.lpserv ?? 0
    let sawPlayerNext = false
    for (let f = 1; f <= 600 && !reentered; f++) {
      game = stepGame(game)
      const q = game.sim.serviceQueue
      if (q) {
        maxLpserv = Math.max(maxLpserv, q.lpserv)
        if (nextServed(q) === 'player') sawPlayerNext = true
      }
      if (livePlayers(game).includes(2)) reentered = true
    }
    expect(reentered, 'staging: P2 re-materialises within the window (jt4-5 respawn)').toBe(true)
    expect(
      maxLpserv,
      'the knight was served through the players-first branch (servePlayer via nextServed=player): lpserv > 0',
    ).toBeGreaterThan(0)
    // Corroborating the same branch from the other side: the queue reported the player
    // as next-to-serve at least once during the re-entry (the now-live 'players first'
    // arm of nextServed). Documented as ROM-faithful CRELP-wait — a knight waits its
    // turn like an enemy (CREP→LDA NPSERV→BRA CRELP).
    expect(sawPlayerNext, "nextServed reported 'player' during the re-entry (the now-live players-first branch)").toBe(
      true,
    )
  })
})
