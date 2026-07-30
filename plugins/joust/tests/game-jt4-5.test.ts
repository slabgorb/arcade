// tests/game-jt4-5.test.ts
//
// Story jt4-5 — RED phase (Leeloo / TEA). THE EPIC CLOSER: two knights playing a
// FULL loop under the identical `stepGame` — co-op spawn → waves → death → extra
// man → game-over — plus the dev-overlay readout. This file pins the SESSION-LAYER
// behaviour of the five jt4-4 forward-carries; the sim half (egg self-clear) is in
// tests/demo-jt4-5.test.ts, the shell ?raw wiring in tests/render-jt4-5.test.ts,
// and the ROM rebirth-path re-derivation + JT45 claims in tests/game-jt4-5-source.ts.
//
//   1. RESPAWN (carry #1) — a mount death is a SILENT process removal today with NO
//      re-entry, so lives never reach 0 in natural play. The ROM rebirth path
//      (CREP1/CREP2 → DECLIV → BEQ PLYDIE, JOUSTRV4.SRC:5610-5618) re-creates a dead
//      player WHILE it has lives left, and lets a player at ZERO lives stay OUT. RED.
//   2. NATURAL FULL-PLAY TO GAME-OVER (carries #1 + #4) — all-out → GOVER_OVER
//      reached through REAL deaths booked in stepGame, NOT a constructed all-dead
//      state (the jt4-4 [MEDIUM][TEST] hardening); and the game keeps RUNNING while a
//      spent player still has a life to re-enter (which requires respawn — RED).
//   3. COOP/SURVIVAL LIVE AWARD (carry #2) — a REAL (non-forced) wave clear awards
//      coop 3,000-each / survival 3,000-deathless through the consolidated loop,
//      WITHOUT double-awarding through the jt4-4 strip-to-players advances. RED.
//   4. DETERMINISM (the jt4-4 replay, hardened to compare guards) — a seeded stepGame
//      loop replays bit-for-bit; overlayReadout is a pure projection.
//   5. THE DEV-OVERLAY READOUT — `overlayReadout(game)` reads each ledger's
//      score + lives and the wave STRAIGHT off the GameState (routing≠geometry:
//      pinned by OUTPUT, mutation-checked so it cannot be a stale copy). RED.
//
// ─── THE "FOUGHT CLEAR" SIGNAL (why coop can be tested at all) ────────────────
// A deterministic NATURAL wave clear is unreachable in a unit window (jt4-4's
// finding: a killed enemy leaves a blocking egg; a settled egg never clears). But a
// PTERODACTYL is not counted for wave-clear (only `kind:'enemy'`/eggs hold a wave
// open) and leaves no egg, so a coop wave whose only combatant is a ptero ADVANCES
// on the single step — a REAL, non-forced clear (a combatant was present pre-step),
// STRUCTURALLY distinct from jt4-4's strip-to-BARE-players `forceAdvance`. The award
// must fire on the fought clear and NOT on the bare forced clear — which is exactly
// what keeps the double-award trap shut and the jt4-4 gladiator pin green. Every
// scenario below was probed against the live sim before assertion, so each red is a
// MISSING-behaviour red, not a geometry miss.

import { describe, it, expect } from 'vitest'
import { loadGameLoop, loadGameFull } from './helpers/game-contract.js'
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

function playerProc(id: number, posX: number, pixelY: number, facing: -1 | 1, mount: 'ostrich' | 'stork'): DemoProcess {
  return { id, cls: 'primary', nap: 1, period: 1, kind: 'player', facing, mount, collisionEnabled: true, entity: entity({ posX, posY: pixelY << 8 }) }
}

/** A materialised (collision-ON) ground enemy at a chosen position — a real killer. */
function enemyProc(id: number, posX: number, pixelY: number): DemoProcess {
  return {
    id, cls: 'secondary', nap: 1, period: 1, kind: 'enemy', enemyType: 'bounder', collisionEnabled: true,
    // The enemy carries a mind riding the flight core (the shape enemyProcess builds).
    enemy: { entity: entity({ posX, posY: pixelY << 8 }), facing: 1, pchase: 0, brain: 'linet', decision: 'boundr' },
  } as unknown as DemoProcess
}

/** A stationary pterodactyl (velX index 0 — holds its X) as a wave's lone combatant. */
function pteroProc(id: number, posX: number, pixelY: number): DemoProcess {
  return { id, cls: 'secondary', nap: 1, period: 1, kind: 'ptero', facing: 1, collisionEnabled: true, entity: entity({ posX, posY: pixelY << 8 }) }
}

/** Replace the wrapped sim's process list (a constructed sim state), clearing events. */
function withProcesses(game: GameState, procs: DemoProcess[]): GameState {
  return { ...game, sim: { ...game.sim, sim: { ...game.sim.sim, processes: procs }, events: [] } }
}

/** Put the wrapped sim (and the mirrored GameState) on a chosen BCD wave. */
function atWave(game: GameState, wave: number): GameState {
  return { ...game, wave, sim: { ...game.sim, wave } }
}

/** Live player-process ids inside the wrapped sim. */
const livePlayers = (game: GameState): number[] =>
  game.sim.sim.processes.filter((p) => p.kind === 'player').map((p) => p.id)
const playerCount = (game: GameState): number => livePlayers(game).length

// ═════════════════════════════════════════════════════════════════════════════
// 1. RESPAWN — a dead player with lives re-enters; a player at 0 lives stays out.
//    ROM: CREP1/CREP2 (JOUSTRV4.SRC:5610) → DECLIV (:5613) → BEQ PLYDIE (:5614);
//    PLYDIE (:5605-5606) = JMP VSUCIDE (the man is gone at zero lives).
// ═════════════════════════════════════════════════════════════════════════════
describe('jt4-5 RESPAWN — a mount death with lives left re-enters (ROM CREP/DECLIV/PLYDIE)', () => {
  it('a partner-killed player that still has lives RE-ENTERS the sim (respawn)', async () => {
    const g = await loadGameLoop()
    // P1 (higher) wins the partner-joust; P2 (8px lower) dies — the jt4-4 partner-kill
    // seam. P2 keeps 2 lives after the death, so the ROM DECLIV→BEQ falls THROUGH to a
    // re-create. A materialising enemy (collisions OFF) holds the wave open so a
    // survivor-only wave does not clear and churn.
    const base = g.createGame(SEED)
    const p1 = playerProc(1, 100, 100, 1, 'ostrich')
    const p2 = playerProc(2, 104, 108, -1, 'stork')
    const holdEnemy = base.sim.sim.processes.find((p) => p.kind === 'enemy')
    expect(holdEnemy, 'wave 1 supplies a materialising enemy to hold the wave open').toBeTruthy()
    let game: GameState = {
      ...withProcesses(base, [p1, p2, holdEnemy as DemoProcess]),
      players: [{ ...base.players[0], lives: NSHIP }, { ...base.players[1], lives: 3 }],
    }
    // First step: P1 kills P2 (real death) — P2 drops to 1 process, lives 3→2, still IN.
    game = g.stepGame(game)
    expect(livePlayers(game).includes(2), 'P2 lost the partner-joust and was removed').toBe(false)
    expect(game.players[1].lives, 'P2 spent one man but keeps two — a rebirth is due').toBe(2)
    expect(game.players[1].out, 'P2 is NOT out — it has lives left, so it must re-enter').toBe(false)
    // Now let the sim run: with lives left, P2 must RE-ENTER (the ROM CREP re-create).
    // RED today: nothing respawns, so P2 never comes back (jt4-4 silent-removal gap).
    let rejoined = false
    for (let f = 1; f <= 600 && !rejoined; f++) {
      game = g.stepGame(game)
      if (livePlayers(game).includes(2)) rejoined = true
    }
    expect(rejoined, 'a player with lives remaining re-enters within the window (respawn)').toBe(true)
  })

  it('a player whose LAST man dies stays OUT — no re-entry at zero lives (BEQ PLYDIE)', async () => {
    const g = await loadGameLoop()
    // P2 on its LAST life (1) loses the partner-joust: DECLIV takes it to 0 → BEQ PLYDIE
    // → the man is GONE. It must NEVER re-enter. (Negative control: green in the RED
    // phase because nothing respawns yet; it BITES if respawn ever ignores the 0 gate.)
    const base = g.createGame(SEED)
    const p1 = playerProc(1, 100, 100, 1, 'ostrich')
    const p2 = playerProc(2, 104, 108, -1, 'stork')
    const holdEnemy = base.sim.sim.processes.find((p) => p.kind === 'enemy') as DemoProcess
    let game: GameState = {
      ...withProcesses(base, [p1, p2, holdEnemy]),
      players: [{ ...base.players[0], lives: NSHIP }, { ...base.players[1], lives: 1 }],
    }
    game = g.stepGame(game)
    expect(livePlayers(game).includes(2), 'P2 lost its last man and was removed').toBe(false)
    expect(game.players[1].lives, 'P2 is out of lives').toBe(0)
    expect(game.players[1].out, 'P2 at zero lives is OUT').toBe(true)
    let reentered = false
    for (let f = 1; f <= 200; f++) {
      game = g.stepGame(game)
      if (livePlayers(game).includes(2)) { reentered = true; break }
    }
    expect(reentered, 'a player at ZERO lives must NEVER re-enter (BEQ PLYDIE — the man is gone)').toBe(false)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// 2. NATURAL FULL-PLAY TO GAME-OVER — real deaths, not a constructed all-dead state
//    (the jt4-4 [MEDIUM][TEST] hardening) + the respawn linkage.
// ═════════════════════════════════════════════════════════════════════════════
describe('jt4-5 game-over — reached through REAL played deaths (hardening: not a constructed all-dead state)', () => {
  it('two knights on their last man are killed by enemies through stepGame and the game reaches GOVER_OVER', async () => {
    const g = await loadGameLoop()
    // Both knights on their LAST life, each positioned just BELOW a materialised enemy
    // (the higher entity wins the joust, joust.ts:211) — so the sim itself KILLS them.
    // Unlike jt4-4's constructed all-dead step (lives preset to 0, processes emptied),
    // the game STARTS live and both deaths are booked by stepGame's collision pass.
    const base = g.createGame(SEED)
    let game: GameState = {
      ...withProcesses(base, [
        playerProc(1, 100, 120, 1, 'ostrich'),
        playerProc(2, 200, 120, -1, 'stork'),
        enemyProc(0x901, 100, 108),
        enemyProc(0x902, 200, 108),
      ]),
      players: [{ ...base.players[0], lives: 1 }, { ...base.players[1], lives: 1 }],
    }
    // The start is a LIVE game — both knights present, in the game, RUNNING (kills
    // "this is just the constructed all-dead state renamed").
    expect(playerCount(game), 'both knights are on the board at the start').toBe(2)
    expect(game.players.every((p) => !p.out), 'neither knight is out at the start').toBe(true)
    expect(game.gover, 'the game is RUNNING before anyone dies').toBe(g.GOVER_RUNNING)
    // Play it out: the enemies kill both knights (real deaths booked in stepGame).
    let reachedOver = false
    for (let f = 1; f <= 60 && !reachedOver; f++) {
      game = g.stepGame(game)
      if (game.gover === g.GOVER_OVER) reachedOver = true
    }
    expect(game.players.map((p) => p.lives), 'both knights spent their last man to REAL deaths').toEqual([0, 0])
    expect(game.players.every((p) => p.out), 'both knights are OUT').toBe(true)
    expect(reachedOver, 'all-out through real played deaths → GOVER_OVER (no constructed state)').toBe(true)
    expect(game.gover, 'the settled game is OVER').toBe(g.GOVER_OVER)
  })

  it('while a spent player still has a life to re-enter, the game keeps RUNNING (respawn gates game-over)', async () => {
    const g = await loadGameLoop()
    // P1 on its last man, P2 with TWO. Both die to enemies on the first step: P1 → out,
    // P2 → 1 life, removed. The game must NOT be over — P2 still has a man to send in.
    const base = g.createGame(SEED)
    let game: GameState = {
      ...withProcesses(base, [
        playerProc(1, 100, 120, 1, 'ostrich'),
        playerProc(2, 200, 120, -1, 'stork'),
        enemyProc(0x901, 100, 108),
        enemyProc(0x902, 200, 108),
      ]),
      players: [{ ...base.players[0], lives: 1 }, { ...base.players[1], lives: 2 }],
    }
    game = g.stepGame(game)
    expect(game.players[0].out, 'P1 spent its last man → out').toBe(true)
    expect(game.players[1].lives, 'P2 lost one man but keeps one').toBe(1)
    expect(game.players[1].out, 'P2 is NOT out — a man is still due').toBe(false)
    expect(game.gover, 'the game is NOT over while a player has a man to send in').toBe(g.GOVER_RUNNING)
    // That remaining man must RE-ENTER (respawn) — the game cannot progress to all-out
    // otherwise. RED today: P2 is gone for good, so the game hangs RUNNING forever.
    let p2Returned = false
    for (let f = 1; f <= 600 && !p2Returned; f++) {
      game = g.stepGame(game)
      if (livePlayers(game).includes(2)) p2Returned = true
    }
    expect(p2Returned, "P2's remaining man re-enters so the loop can run on to game-over (respawn)").toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// 2b. ROUND-2 REWORK (Reviewer Ruling #1) — GAME-OVER *THROUGH A RESPAWN CYCLE*.
//     Round-1 reached game-over only from a CONSTRUCTED last-life state, and the
//     Reviewer's mutation proved that test STILL PASSED with respawn disabled — it
//     never exercised a re-death. These pin the CLOSED loop the epic demo bar needs:
//     a knight dies, RE-MATERIALISES, becomes VULNERABLE AGAIN, and dies AGAIN,
//     driving all-out through play — plus that the re-materialise window ENDS.
//
//   ─── THE ROM RE-MATERIALISE IS TIMED, NOT A PERMANENT SHIELD ──────────────────
//   The rebirth CONTINUES past the DECLIV/BEQ zero-gate: CREP1/CREP2 fall through to
//   `LDA NPSERV … BRA CRELP` (JOUSTRV4.SRC:5615-5618) → CRELP/CREPLY, the
//   transporter-served re-materialise, whose PLYINT window RE-ENABLES collisions on
//   exit (jt2-6 `stepMaterialise`: it TIMES OUT after its nap, or a control input
//   ABORTS it early — transporter.ts:220-231, `collisionsEnabled:true` on both exits).
//   So the ROM knight becomes vulnerable again shortly after re-entry and CAN lose all
//   its lives. Round-1's re-entry returns `collisionEnabled:false` with NO `mat` window
//   (demo.ts:297-299) — a PERMANENT shield that never re-enables, so a re-entered knight
//   is an immortal ghost and all-out is unreachable. RED until Dev gives the re-entry a
//   re-enabling window.
//
//   ─── DETERMINISTIC WITHOUT ASSUMING DEV'S WINDOW LENGTH ───────────────────────
//   A SHADOW-KILLER — an enemy re-positioned ~10px directly above each LIVE knight EVERY
//   frame — guarantees that the instant a re-entered knight's window ends (ANY length),
//   the joust it loses removes it again. Probed green against a simulated re-enabling
//   window for W ∈ {1,15,45,120}; RED against the current permanent shield.
// ═════════════════════════════════════════════════════════════════════════════
describe('jt4-5 round-2 — game-over reached THROUGH a respawn cycle (Reviewer Ruling #1)', () => {
  it('a knight dies, re-materialises, becomes vulnerable AGAIN and dies AGAIN → all-out GOVER_OVER', async () => {
    const g = await loadGameLoop()
    // P1 on its LAST man (dies once → out); P2 with TWO men — it must die, RE-ENTER, and die
    // AGAIN to go out, so all-out is ONLY reachable through a full respawn cycle. Both knights
    // start on the board, RUNNING.
    const base = g.createGame(SEED)
    let game: GameState = {
      ...withProcesses(base, [
        playerProc(1, 100, 90, 1, 'ostrich'),
        playerProc(2, 200, 90, -1, 'stork'),
        enemyProc(0x901, 100, 80),
        enemyProc(0x902, 200, 80),
      ]),
      players: [{ ...base.players[0], lives: 1 }, { ...base.players[1], lives: 2 }],
    }
    expect(game.gover, 'the game is RUNNING before anyone dies').toBe(g.GOVER_RUNNING)
    // Track P2's FULL respawn cycle: live → removed → live AGAIN → removed AGAIN.
    let p2Removed = false
    let p2Returned = false
    let p2ReDied = false
    let p2WasLive = livePlayers(game).includes(2)
    let reachedOver = false
    for (let f = 1; f <= 600 && !reachedOver; f++) {
      game = g.stepGame(game)
      const p2Live = livePlayers(game).includes(2)
      if (p2WasLive && !p2Live) {
        if (!p2Removed) p2Removed = true
        else if (p2Returned) p2ReDied = true
      }
      if (p2Removed && p2Live) p2Returned = true
      p2WasLive = p2Live
      // Sustained lethal pressure (Dev-window-agnostic): keep a killer ~10px above every LIVE
      // knight, so whenever a re-entered knight's window ends it immediately loses a joust.
      let procs = game.sim.sim.processes
      for (const pid of [1, 2]) {
        const pl = procs.find((p) => p.kind === 'player' && p.id === pid)
        const killerId = pid === 1 ? 0x901 : 0x902
        procs = procs.filter((p) => !(p.kind === 'enemy' && p.id === killerId))
        if (pl?.entity) procs = [...procs, enemyProc(killerId, pl.entity.posX, (pl.entity.posY >> 8) - 10)]
      }
      game = { ...game, sim: { ...game.sim, sim: { ...game.sim.sim, processes: procs } } }
      if (game.gover === g.GOVER_OVER) reachedOver = true
    }
    // The closed loop: P2 spent a man, RE-ENTERED, was vulnerable enough to lose ANOTHER joust,
    // and only THEN went out — with P1 already out, that is all-out reached THROUGH play.
    // RED today (Ruling #1): the permanent shield makes the re-entered P2 an immortal ghost, so it
    // never re-dies and GOVER_OVER is never reached.
    expect(p2Returned, 'P2 re-materialised after its first death (respawn)').toBe(true)
    expect(p2ReDied, 'the re-materialised P2 became VULNERABLE again and died a SECOND time (kills the permanent shield)').toBe(true)
    expect(game.players.every((p) => p.out), 'both knights are OUT — all-out through a respawn cycle').toBe(true)
    expect(reachedOver, 'all-out reached THROUGH a respawn cycle → GOVER_OVER').toBe(true)
    expect(game.gover, 'the settled game is OVER').toBe(g.GOVER_OVER)
  })

  it('the re-materialise window ENDS — a re-entered knight regains collisions (not a permanent shield)', async () => {
    const g = await loadGameLoop()
    // P1 (higher) wins the partner-joust; P2 (8px lower) dies with lives left and RE-ENTERS at
    // PLAYER2_SPAWN (x=200), far from P1 — so nothing re-kills it and we can watch its window
    // CLOSE. A materialising wave-1 enemy holds the wave open (it does not reach the spawn).
    const base = g.createGame(SEED)
    const holdEnemy = base.sim.sim.processes.find((p) => p.kind === 'enemy') as DemoProcess
    expect(holdEnemy, 'wave 1 supplies a materialising enemy to hold the wave open').toBeTruthy()
    let game: GameState = {
      ...withProcesses(base, [
        playerProc(1, 100, 100, 1, 'ostrich'),
        playerProc(2, 104, 108, -1, 'stork'),
        holdEnemy,
      ]),
      players: [{ ...base.players[0], lives: NSHIP }, { ...base.players[1], lives: 3 }],
    }
    game = g.stepGame(game) // P1 kills P2; P2 removed with lives left → a rebirth is due
    expect(livePlayers(game).includes(2), 'P2 lost the partner-joust and was removed').toBe(false)
    expect(game.players[1].out, 'P2 has lives left — it is not out').toBe(false)
    // Run on with NEUTRAL input: a ROM-faithful `mat` window TIMES OUT (no control input aborts it)
    // and re-enables collisions (PLYINT, transporter.ts:230 `collisionsEnabled:true` on time-out).
    // RED today: the permanent shield keeps collisionEnabled:false FOREVER, so the re-entered
    // knight is never vulnerable again — the window never ends.
    let reentered = false
    let regainedCollisions = false
    for (let f = 1; f <= 300; f++) {
      game = g.stepGame(game)
      const p2 = game.sim.sim.processes.find((p) => p.kind === 'player' && p.id === 2)
      if (p2) {
        reentered = true
        if (p2.collisionEnabled !== false) {
          regainedCollisions = true
          break
        }
      }
    }
    expect(reentered, 'P2 re-materialised (respawn)').toBe(true)
    expect(
      regainedCollisions,
      'the re-materialise window ENDED — P2 regained collisions (ROM PLYINT re-enable), not an immortal shield',
    ).toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// 3. COOP / SURVIVAL LIVE AWARD — a REAL (non-forced) wave clear awards the team
//    bonus through the consolidated loop, without double-awarding.
// ═════════════════════════════════════════════════════════════════════════════
describe('jt4-5 coop LIVE award — a fought coop-wave clear banks 3,000 to each alive player', () => {
  it('a coop wave (2) cleared with a combatant present advances AND awards coop 3,000 each', async () => {
    const g = await loadGameLoop()
    const bounty = g.decodeDvalue('SCRHUN', 0x30)
    // Wave 2 is a coop wave (status $04). Its only combatant is a stationary ptero far
    // from both players — a REAL, fought clear (pteros are not counted for wave-clear
    // and leave no egg), STRUCTURALLY distinct from a strip-to-bare-players forceAdvance.
    const base = atWave(g.createGame(SEED), 2)
    const game = withProcesses(base, [
      playerProc(1, 100, 100, 1, 'ostrich'),
      playerProc(2, 250, 100, -1, 'stork'),
      pteroProc(0x280, 30, 200),
    ])
    const stepped = g.stepGame(game)
    expect(stepped.wave, 'the coop wave cleared and advanced to wave 3').toBe(3)
    // The consolidated loop must award the ENDING coop wave's team bonus live. RED today:
    // stepGame wires only the gladiator bounty (jt4-4 Dev deviation), so scores stay 0.
    expect(stepped.players[0].score, 'P1 banks the coop 3,000 on the fought clear').toBe(bounty)
    expect(stepped.players[1].score, 'P2 banks the coop 3,000 too (both alive)').toBe(bounty)
    expect(bounty, 'the bounty is the SCRHUN $30 pass-through (3,000)').toBe(3000)
  })

  it('a coop bounty is awarded ONCE — a further step banks no second 3,000 (no double-award)', async () => {
    const g = await loadGameLoop()
    const bounty = g.decodeDvalue('SCRHUN', 0x30)
    const base = atWave(g.createGame(SEED), 2)
    let game = withProcesses(base, [
      playerProc(1, 100, 100, 1, 'ostrich'),
      playerProc(2, 250, 100, -1, 'stork'),
      pteroProc(0x280, 30, 200),
    ])
    game = g.stepGame(game) // the fought coop clear → award once, now on wave 3
    const afterAward = game.players.map((p) => p.score)
    for (let f = 1; f <= 5; f++) game = g.stepGame(game) // wave 3 does not clear (6 enemies)
    expect(game.players.map((p) => p.score), 'the coop 3,000 is banked exactly once, not per frame').toEqual(afterAward)
    expect(afterAward, 'and that once was the coop 3,000 each').toEqual([bounty, bounty])
  })

  it('a STRIP-TO-BARE-PLAYERS forced advance banks NO coop bounty (the jt4-4 double-award trap stays shut)', async () => {
    const g = await loadGameLoop()
    // The jt4-4 forceAdvance idiom: strip the sim to bare players (no combatant ever
    // present) and step. This is NOT a fought clear — it must award nothing, or every
    // advanceGameTo through the coop wave 2 would double-award and break jt4-4's
    // gladiator pin. (Green today; the guard that keeps the trap shut once coop is wired.)
    const base = atWave(g.createGame(SEED), 2)
    const game = withProcesses(base, [playerProc(1, 100, 100, 1, 'ostrich'), playerProc(2, 250, 100, -1, 'stork')])
    const stepped = g.stepGame(game)
    expect(stepped.wave, 'the bare wave advances to wave 3').toBe(3)
    expect(stepped.players.map((p) => p.score), 'a forced (unfought) clear awards no coop bounty').toEqual([0, 0])
  })

  it('SURVIVAL — a fought clear of a coop wave gone solo awards the lone survivor 3,000', async () => {
    const g = await loadGameLoop()
    const bounty = g.decodeDvalue('SCRHUN', 0x30)
    // With P2 OUT (0 lives) the coop wave DEGRADES to survival (dispatchWaveType
    // :2628-2631). A fought clear awards the deathless survivor P1 the survival 3,000;
    // the out player gets nothing. RED today: survival is unwired into the loop.
    const base = { ...atWave(g.createGame(SEED), 2), players: [ledger(), ledger({ lives: 0, out: true })] }
    const game = withProcesses(base, [playerProc(1, 100, 100, 1, 'ostrich'), pteroProc(0x280, 30, 200)])
    const stepped = g.stepGame(game)
    expect(stepped.wave, 'the survival (degraded coop) wave cleared and advanced').toBe(3)
    expect(stepped.players[0].score, 'the lone survivor banks the survival 3,000').toBe(bounty)
    expect(stepped.players[1].score, 'the out player gets no survival bonus').toBe(0)
  })
})

// The award SEMANTICS themselves (exact totals, void-on-partner-kill, deathless gate)
// are jt4-3's pure `awardWaveBounty`; re-pinned sharply here as the guard the LIVE
// wiring above must honour (a non-zero PLYG guard VOIDS the whole coop team bonus).
describe('jt4-5 coop/survival award semantics — exact totals + void-on-partner-kill (the guard)', () => {
  it('coop pays exactly 3,000 to each alive player when clean, and NOTHING when a guard is dirty', async () => {
    const g = await loadGameLoop()
    const bounty = g.decodeDvalue('SCRHUN', 0x30)
    const clean = g.awardWaveBounty([ledger(), ledger()], 'coop', {
      alive: [true, true], guards: { plyg1: 0, plyg2: 0 }, died: [false, false],
    })
    expect(clean.map((p) => p.score), 'clean coop → 3,000 each').toEqual([bounty, bounty])
    const voided = g.awardWaveBounty([ledger(), ledger()], 'coop', {
      alive: [true, true], guards: { plyg1: 1, plyg2: 0 }, died: [false, false],
    })
    expect(voided.map((p) => p.score), 'a partner-kill (non-zero guard) VOIDS the whole coop team bonus').toEqual([0, 0])
  })

  it('survival pays 3,000 only to an alive player who did NOT die this wave', async () => {
    const g = await loadGameLoop()
    const bounty = g.decodeDvalue('SCRHUN', 0x30)
    const paid = g.awardWaveBounty([ledger(), ledger()], 'survival', {
      alive: [true, true], guards: { plyg1: 0, plyg2: 0 }, died: [false, true],
    })
    expect(paid.map((p) => p.score), 'the deathless survivor is paid; the one who died gets nothing').toEqual([bounty, 0])
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// 4. DETERMINISM — the seeded loop replays bit-for-bit (hardened to compare guards).
// ═════════════════════════════════════════════════════════════════════════════
describe('jt4-5 determinism — the full seeded stepGame loop replays bit-for-bit', () => {
  it('two runs of a seeded 2P game are identical in ledgers, gover, wave, guards AND sim', async () => {
    const g = await loadGameLoop()
    const input: Record<number, PlayerInput> = { 1: flap(-1), 2: flap(1) }
    const run = (): GameState => {
      let game = g.createGame(SEED)
      for (let i = 0; i < 120; i++) game = g.stepGame(game, input)
      return game
    }
    const a = run()
    const b = run()
    // Non-vacuous: the window contains P1's frame-49 death, so a man was actually spent.
    expect(a.players[0].lives, 'the run is non-vacuous — a death was booked').toBeLessThan(NSHIP)
    expect(a.players, 'the ledgers replay bit-for-bit').toEqual(b.players)
    expect(a.gover, 'gover replays bit-for-bit').toBe(b.gover)
    expect(a.wave, 'the wave replays bit-for-bit').toBe(b.wave)
    // The jt4-4 replay did NOT compare guards (Reviewer [LOW][TEST]); harden it here.
    expect(a.guards, 'the PLYG guards replay bit-for-bit too').toEqual(b.guards)
    expect(a.sim, 'and the wrapped sim is deterministic').toEqual(b.sim)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// 5. THE DEV-OVERLAY READOUT — reads the core registers STRAIGHT off the GameState.
//    routing≠geometry: pinned by OUTPUT and mutation-checked so it cannot be a copy.
// ═════════════════════════════════════════════════════════════════════════════
describe('jt4-5 dev-overlay — overlayReadout projects score/lives/wave from the GameState', () => {
  it('reads each player`s score + lives and the wave EXACTLY off the state (not a stale copy)', async () => {
    const g = await loadGameFull()
    // Distinct, non-symmetric values so a swap (score↔lives), a wrong player, or a
    // hard-coded copy all redden. The readout must reflect THESE numbers.
    const state: GameState = {
      ...g.createGame(SEED),
      wave: 7,
      players: [ledger({ score: 12_345, lives: 3 }), ledger({ score: 6_789, lives: 5 })],
    }
    const readout = g.overlayReadout(state)
    expect(readout.wave, 'the overlay shows the GameState wave').toBe(7)
    expect(readout.players, 'one line per player, P1 then P2, with 1-based ids and exact registers').toEqual([
      { player: 1, score: 12_345, lives: 3 },
      { player: 2, score: 6_789, lives: 5 },
    ])
  })

  it('tracks a live game — the readout of a stepped state matches its ledgers exactly', async () => {
    const g = await loadGameFull()
    let game = g.createGame(SEED)
    for (let i = 0; i < 120; i++) game = g.stepGame(game, { 1: flap(-1), 2: flap(1) })
    const readout = g.overlayReadout(game)
    // The readout must be the SAME registers stepGame just wrote (the co-op independence
    // survives into the overlay) — kills "the overlay keeps its own drifting counters".
    expect(readout.wave, 'wave mirrors the stepped state').toBe(game.wave)
    expect(
      readout.players.map((p) => ({ score: p.score, lives: p.lives })),
      'each line mirrors its ledger after real play',
    ).toEqual(game.players.map((p) => ({ score: p.score, lives: p.lives })))
    expect(game.players[0].lives, 'non-vacuous — P1 actually lost a man in the window').toBeLessThan(NSHIP)
  })

  it('projects a solo (1P) game as a single line, and does not mutate the state (pure)', async () => {
    const g = await loadGameFull()
    const solo: GameState = { ...g.createGame(SEED, 1), wave: 3, players: [ledger({ score: 999, lives: 2 })] }
    const before = JSON.stringify(solo)
    const readout = g.overlayReadout(solo)
    expect(readout.players, 'a 1P game shows exactly one overlay line').toEqual([{ player: 1, score: 999, lives: 2 }])
    expect(JSON.stringify(solo), 'overlayReadout is pure — it never mutates the GameState').toBe(before)
  })
})

// A structural sanity check on the loader wiring (mirrors the jt4-4 loadDemo usage).
describe('jt4-5 — the demo drives the identical sim (the one-sim seam holds through the closer)', () => {
  it('stepGame still delegates ALL stepping to stepDemo — no divergent second path', async () => {
    const g = await loadGameLoop()
    const d = await loadDemo()
    const input: Record<number, PlayerInput> = { 1: flap(-1), 2: flap(1) }
    let game = g.createGame(SEED)
    let sim = d.createWaveDemo(SEED)
    for (let i = 0; i < 30; i++) {
      game = g.stepGame(game, input)
      sim = d.stepDemo(sim, input)
    }
    expect(game.sim, 'the wrapped sim stays bit-identical to a raw stepDemo').toEqual(sim)
  })
})
