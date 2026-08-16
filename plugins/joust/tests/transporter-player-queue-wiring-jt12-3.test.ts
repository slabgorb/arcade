// tests/transporter-player-queue-wiring-jt12-3.test.ts
//
// Story jt12-3 — WIRING the transporter's player-side service queue and the SELARE
// occupancy safety into the live sim. The pure transforms already exist, are byte-verified
// against JOUSTRV4.SRC and unit-tested; they simply had NO production callers.
//
// ─── THE STORY'S OCCUPANCY PREMISE IS REFUTED BY THE ROM IT CITES ─────────────
// jt12-3 was filed as "gate serveEnemy on spawnProceeds(scanAreas(occupantYs), tier) so a
// materialisation DEFERS into an already-crowded third." Reading the cited source
// (JOUSTRV4.SRC:5619-5715) says two different things:
//   1. The empty-third census (SELARE) + preference is on the PLAYER re-create path
//      (`CREPLY`), NOT the enemy. An enemy takes its VRAND-drawn pad via FREET with no
//      area census (`CREEM`→`CRELP`→`CREALL`→`FREET`, :5658-5680).
//   2. It NEVER defers on occupancy. `CREPLY` walks the on-screen objects, marks each
//      one's third (`SELARE`, :6413-6424), then PREFERS a pad in an EMPTY third — bottom
//      (TR4), then middle (TR2/TR3), then top (TR1), each only if that third is clear and
//      the pad free — and at `70$` FALLS THROUGH to `CREALL`/`GOTTR` and creates via the
//      default anyway (:5665-5709). The served knight lands AT that pad (`GOTTR: LDD
//      TPOSX,X → PPOSX`, :5710-5715). It is never starved.
// So the real mechanic is a re-entering knight materialising ONTO A TRANSPORTER PAD IN AN
// EMPTY THIRD (a safety, so it does not appear on a swarm) — which also retires jt4-5's
// re-materialise at the FIXED initial spawn (`LDX #100/#200`, :1023/:1039 — the FIRST-ever
// create only). This suite pins the ROM, not the story's "defers"/"serveEnemy" prose. See
// the session's Design Deviations.
//
// ─── THE TWO WIRES ───────────────────────────────────────────────────────────
//   • the player queue at `stepGame`: a re-entering knight draws NPSERV (`takePlayerNumber`)
//     and is served THROUGH the queue (`servePlayer`, only when the players-first
//     `nextServed` branch fires) — CREP1/CREP2 → LDA NPSERV … BRA CRELP (:5615-5676).
//   • the SELARE safety at the serve: the served knight lands on a pad in an EMPTY third
//     (`selectRespawnPad`), in the ROM's bottom→middle→top preference, never starved.

import { describe, it, expect } from 'vitest'
import { createGame, stepGame, GOVER_RUNNING, type GameState, type PlayerLedger } from '../src/core/game.js'
import { type EntityState } from '../src/core/enemy.js'
import { nextServed, PADS } from '../src/core/transporter.js'
import type { SimProcess } from '../src/core/sim.js'
import { withNoPendingEnemies, seatWaveInstantly } from './helpers/wave-entry.js'

const SEED = 0x1234
const NSHIP = 5

const padOf = (id: string) => {
  const p = PADS.find((q) => q.id === id)
  if (!p) throw new Error(`no pad ${id}`)
  return p
}
const TR1 = padOf('TR1') // top    (113, 80)
const TR4 = padOf('TR4') // bottom (127, 210)

// ─── staging helpers (game-jt4-5 vocabulary, replicated) ──────────────────────

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

/** A materialised ground enemy — an arena OCCUPANT (its Y feeds the SELARE census) that
 *  also holds the wave open (a `kind:'enemy'` counts as alive). Placed OFF every pad X so
 *  it is never "in use", and far from the knights so it joustles nobody mid-probe. */
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

/** Replace the wrapped sim's process list (a constructed arena), clearing events and the
 *  waiting room (a queued arrival left in would hold the wave open and materialise
 *  mid-probe). Preserves serviceQueue — the queue under test. */
function withProcesses(game: GameState, procs: SimProcess[]): GameState {
  return {
    ...game,
    sim: { ...withNoPendingEnemies(game.sim), sim: { ...game.sim.sim, processes: procs }, events: [] },
  }
}

/** Seat the wave's queued complement at once (a materialising hold-enemy on the board). */
const seated = (game: GameState): GameState => ({ ...game, sim: seatWaveInstantly(game.sim) })

const livePlayers = (game: GameState): number[] =>
  game.sim.sim.processes.filter((p) => p.kind === 'player').map((p) => p.id)

// ═════════════════════════════════════════════════════════════════════════════
// SELARE occupancy safety — a re-entering knight materialises ONTO A PAD in an
//   EMPTY third (CREPLY, JOUSTRV4.SRC:5627-5715). Never a fixed spawn, never starved.
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Stage a partner-kill in a controlled arena, run the respawn to completion, and return the
 * re-entering knight's landing (pixel x, pixel y). P1 (higher) survives and sits at `p1`;
 * `occupants` crowd chosen thirds (and hold the wave open). P2 (8px lower) dies and re-enters
 * — its landing is decided by `selectRespawnPad` over the census of P1 + `occupants`.
 */
function respawnLanding(p1: { x: number; y: number }, occupants: SimProcess[]): { x: number; y: number } {
  const base = withProcesses(createGame(SEED), [
    playerProc(1, p1.x, p1.y, 1, 'ostrich'),
    playerProc(2, p1.x + 4, p1.y + 8, -1, 'stork'),
    ...occupants,
  ])
  let game: GameState = {
    ...base,
    players: [
      { ...base.players[0], lives: NSHIP } as PlayerLedger,
      { ...base.players[1], lives: 3 } as PlayerLedger,
    ],
  }
  game = stepGame(game) // P1 kills P2 (the partner-joust)
  if (livePlayers(game).includes(2)) throw new Error('staging: P2 did not die to the partner-joust')
  for (let f = 0; f < 600; f++) {
    game = stepGame(game)
    const p2 = game.sim.sim.processes.find((p) => p.kind === 'player' && p.id === 2)
    if (p2?.entity) return { x: p2.entity.posX, y: p2.entity.posY >> 8 }
  }
  throw new Error('staging: P2 never re-entered within the window')
}

describe('jt12-3 SELARE safety — a re-entering knight lands on a pad in an EMPTY third', () => {
  it('materialises ON a transporter pad, NOT the fixed initial spawn (x=100/200)', () => {
    // P1 in the TOP third, one enemy in the TOP third: bottom+middle are empty, so the ROM
    // prefers the bottom pad TR4. The point here is the CLASS of the landing — a real pad,
    // not PLAYER2_SPAWN. RED before this story: respawn re-entered at the fixed x=200.
    const landing = respawnLanding({ x: 100, y: 0x20 }, [enemyProc(0x7001, 5, 0x20)])
    const onAPad = PADS.some((p) => p.x === landing.x && p.y === landing.y)
    expect(onAPad, `the re-entry must be on a transporter pad; landed at (${landing.x}, ${landing.y})`).toBe(true)
    expect(landing.x, 'and NOT the fixed initial-spawn X (PLAYER1_SPAWN=100 / PLAYER2_SPAWN=200)').not.toBe(200)
    expect(landing.x, 'nor P1 s initial spawn').not.toBe(100)
  })

  it('prefers an EMPTY third — top chosen when middle and bottom are both crowded', () => {
    // P1 sits in MIDDLE (0x80); an enemy crowds BOTTOM (0xE0). Only the TOP third is empty,
    // so selectRespawnPad must steer the knight to TR1 (top). Kills a mutant that ignores
    // occupancy (would land bottom-first on TR4) and one that reads the wrong third.
    const landing = respawnLanding({ x: 100, y: 0x80 }, [enemyProc(0x7001, 5, 0xe0)])
    expect(landing, 'middle+bottom crowded → the only empty third (TOP) is chosen: TR1').toEqual({
      x: TR1.x,
      y: TR1.y,
    })
  })

  it('honours the ROM preference ORDER — BOTTOM first when it is empty (TR4)', () => {
    // P1 and the hold-enemy both in the TOP third: bottom AND middle are empty, and the ROM
    // checks bottom (AREA3) FIRST (CREPLY :5641-5644). So the knight lands on TR4 (bottom),
    // not a middle or top pad. Kills a top-first / middle-first ordering mutant.
    const landing = respawnLanding({ x: 100, y: 0x20 }, [enemyProc(0x7001, 5, 0x20)])
    expect(landing, 'bottom empty and checked first → TR4').toEqual({ x: TR4.x, y: TR4.y })
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// The player-side service queue — a re-entering knight is routed through CRELP.
//   ROM: CREP1/CREP2 → LDA NPSERV … BRA CRELP (JOUSTRV4.SRC:5615-5618): the
//   re-created player TAKES A NUMBER and waits its turn in the SAME deli-counter as
//   the enemies, served ahead of them (the players-first branch).
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Stage the proven game-jt4-5 partner-kill (P1 kills P2, P2 keeps 2 lives → a CREP re-create
 * is due). A seated wave-1 enemy holds the wave open so it does not clear and re-seed (which
 * would reset the queue). Returns the game AFTER the killing step.
 */
function afterPartnerKill(): GameState {
  const base = seated(createGame(SEED))
  const holdEnemy = base.sim.sim.processes.find((p) => p.kind === 'enemy') as SimProcess
  const start: GameState = {
    ...withProcesses(base, [playerProc(1, 100, 100, 1, 'ostrich'), playerProc(2, 104, 108, -1, 'stork'), holdEnemy]),
    players: [
      { ...base.players[0], lives: NSHIP } as PlayerLedger,
      { ...base.players[1], lives: 3 } as PlayerLedger,
    ],
  }
  return stepGame(start)
}

describe('jt12-3 player queue — a re-entering knight is routed through takePlayerNumber', () => {
  it('a re-materialising knight draws a player service number (npserv advances past 0)', () => {
    const killed = afterPartnerKill()

    // STAGING VALIDITY (green — jt4-5 respawn shipped): P2 lost the partner-joust, keeps two
    // men, is NOT out, and the game is running — a rebirth is genuinely due.
    expect(livePlayers(killed).includes(2), 'P2 lost the partner-joust and was removed').toBe(false)
    expect(killed.players[1].lives, 'P2 spent one man but keeps two — a rebirth is due').toBe(2)
    expect(killed.players[1].out, 'P2 is not out — it must re-enter').toBe(false)
    expect(killed.gover, 'the game is running through the respawn').toBe(GOVER_RUNNING)

    // THE WIRE (red before this story): the re-entry draws NPSERV (`takePlayerNumber`), so
    // npserv climbs past 0. Before jt12-3 no player path ever touched the queue.
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
    // was served through CRELP arbitration, ahead of the enemies.
    const killed = afterPartnerKill()
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
    expect(sawPlayerNext, "nextServed reported 'player' during the re-entry (the now-live players-first branch)").toBe(
      true,
    )
  })
})
