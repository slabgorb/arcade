// tests/helpers/game-contract.ts
//
// Story jt4-1 — the CONTRACT for src/core/game.ts, TEA-authored (Leeloo). Same
// seam the epic has used since jt1-2: TEA states the module shape and pins the
// behaviour; Dev (Korben) writes the module + its committed JT41-* claims. The
// behaviour lives in tests/game.test.ts; the source re-derivation (SCRHUN/SCRTEN
// out of the vendored 1982 tree) + the JT41 claim coverage in
// tests/game-source.test.ts.
//
// ─── WHAT jt4-1 ADDS: THE SESSION LAYER ABOVE THE SIM ────────────────────────
// jt2/jt3 built the deterministic SIM (demo.ts / stepDemo). Score VALUES are
// already emitted as events (joust.killScore, egg.eggScoreEvents,
// ptero.pteroScoreEvent) and then THROWN AWAY — demo.ts caps the event log and
// says so ("nothing drains it until the jt4 score display"). game.ts is that
// missing drain: ONE new module holding per-session state above the per-frame
// sim, and a stepGame that WRAPS stepDemo (no second stepping path — the jt2-1
// one-sim seam) and DRAINS its score events into per-player BCD registers.
//
//   • createGame(seed) → a GameState whose `sim` is a real createWaveDemo(seed)
//     DemoState, plus TWO independent player ledgers (the ROM co-op shape —
//     each player its OWN score; lives/gover are jt4-2 / jt4-4 and only carry
//     placeholder fields here).
//   • stepGame(game) delegates to stepDemo for the sim (bit-identical) and then
//     credits the frame's score events to the right ledger.
//
// ─── THE BCD LAW (JOUSTRV4.SRC:7340-7366) — SCRHUN vs SCRTEN, the BACKWARDS trap ─
// A kill's point value comes from the enemy's DVALUE decision block: a score
// ROUTINE (SCRHUN or SCRTEN) applied to a one-byte BCD DIGIT.
//   • SCRHUN ("INCREMENT SCORE BY THOUSANDS AND HUNDREDS", :7340-7342): the digit
//     packs THOUSANDS in the high nibble, HUNDREDS in the low — $15 = 1500,
//     $10 = 1000 (reads forwards).
//   • SCRTEN ("TENS & HUNDREDS BCD DIGIT (BACKWARDS)", :7353): the digit packs
//     TENS in the HIGH nibble (ANDA #$F0 "SCORE TENS", :7360) and HUNDREDS in the
//     LOW nibble (ANDB #$0F "& HUNDREDS", :7361) — the REVERSE of positional
//     order. $57 = 750 (NOT 570), $05 = 500. That is the whole trap: an emulator
//     writer who reads $57 as "570" ships every hunter 180 points light.
// The four ladder rungs (P4DEC..P7DEC, JOUSTRV4.SRC:5563-5577): bounder SCRTEN $05
// → 500, hunter SCRTEN $57 → 750, shadow lord SCRHUN $15 → 1500, pterodactyl
// SCRHUN $10 → 1000 (DERIVED — ruling C caveat rides in the claim). These agree
// with the already-gated joust.killScore / ptero.PTERO_SCORE by construction:
// jt4-1 pins them PASS-THROUGH, never re-derived into a fresh magic literal.
//
// The running total (DSCORE) is NORMAL BCD (the DAA-adjusted add, :7362-7366) —
// only the SCRTEN *input digit* is backwards. `scoreToBcd(value)` returns the
// 6-digit register as three BCD bytes MSB-first: [hundred-thousands|ten-thousands,
// thousands|hundreds, tens|ones]. A value crossing the tens/hundreds boundary
// (1250) lands as […, $12, $50], the ROM byte order.
//
// ─── UNITS / IDS ─────────────────────────────────────────────────────────────
//   • A player id is its process id: PLAYER1_ID = 1 (ledger 0), PLAYER2_ID = 2
//     (ledger 1). The demo's PLAYER1_SPAWN / PLAYER2_SPAWN carry these.
//   • A GameScoreEvent is the demo's DemoEvent score PLUS the scoring player.
//     The demo's own DemoEvent carries NO player (the drain GAP — see the source
//     suite's finding); stepGame must attribute from the joust winner.

import type { DemoState, PlayerInput } from './demo-contract.js'
import type { ResolvedWaveType, RawWaveType, PlayersAlive } from './wave-contract.js'

export type { DemoState, PlayerInput, ResolvedWaveType, RawWaveType, PlayersAlive }

/**
 * One player's session ledger. Only `score` (numeric total) and `scoreBcd` (the
 * DSCORE byte view) are jt4-1's behaviour; `lives` and `out` are jt4-2 / jt4-4
 * fields carried here so the ROM co-op shape is born in the first story (they
 * hold placeholder values — do NOT pin their semantics in this story).
 */
export interface PlayerLedger {
  /** Running numeric score total (integer) — the drained kill/egg/ptero values. */
  score: number
  /** The 6-digit BCD register as three bytes MSB-first (the DSCORE byte layout). */
  scoreBcd: readonly number[]
  /**
   * NSHIP lives. jt4-2 gives this its semantics: seeded to NSHIP (the kept
   * free-play CMOS default = 5, TB12REV3.SRC:135 / EQU.SRC:111) at game start; a
   * mount death decrements this player's OWN count; an extra-man award increments
   * it. (jt4-4 still owns the both-players-out → GOVER transition.)
   */
  lives: number
  /**
   * The score this player must reach for its NEXT extra man — the ROM's per-player
   * "LEVEL TO PASS" (SPLY1+8 / SPLY2+8, JOUSTRV4.SRC:927-928). Seeded to the REPLAY
   * threshold (20,000) and RE-ARMED +20,000 after each award (SCRLEV, :7382-7411).
   * Optional so jt4-1's pre-existing ledger literals still typecheck — absent means
   * "the default 20,000 threshold, un-awarded". jt4-2 owns the semantics.
   */
  extraManAt?: number
  /** Out of the game (jt4-4 owns the semantics; false here). */
  out: boolean
}

/**
 * The whole game session: the ledgers, the loop scalars, and the wrapped sim.
 * `sim` is a real DemoState — stepGame delegates every frame of stepping to it.
 */
export interface GameState {
  /** One ledger per player, index 0 = P1, index 1 = P2 (the co-op shape). */
  players: readonly PlayerLedger[]
  /** GOVER (jt4-4 owns the tri-state; a placeholder here). */
  gover: number
  /** 1-based wave, mirrored from the sim. */
  wave: number
  /** The wrapped deterministic sim (createWaveDemo / stepDemo). */
  sim: DemoState
  /**
   * jt4-3 — the two per-player partner-kill counters PLYG1/PLYG2 (the polarity
   * trap). Seeded to `{ plyg1: 0, plyg2: 0 }` at game start — the PATC11 "GAME START
   * GOOF" boot cleanup (`CLR PLYG1 / CLR PLYG2`, JOUSTRV4.SRC:6282-6284) — so a stale
   * gladiator −1 from a prior game never mis-awards a 3,000-point bounty. Optional so
   * jt4-1/jt4-2's GameState consumers still typecheck; jt4-3's createGame seeds it.
   */
  guards?: WaveGuards
}

/**
 * A score event ATTRIBUTED to a player — the demo's `{kind:'score',value,reason}`
 * plus `player`. The demo's own event has no player; game.ts adds it so the drain
 * can credit the right ledger.
 */
export interface GameScoreEvent {
  kind: 'score'
  value: number
  reason: 'kill' | 'egg'
  /** The scoring player's process id: 1 (→ ledger 0) or 2 (→ ledger 1). */
  player: number
}

export interface GameModule {
  /**
   * Decode a DVALUE (routine, digit) pair to its point value — the transcribed
   * SCRHUN/SCRTEN semantics (JOUSTRV4.SRC:7340-7366). SCRHUN: thousands = high
   * nibble, hundreds = low nibble. SCRTEN (BACKWARDS): tens = HIGH nibble,
   * hundreds = LOW nibble. Pure.
   */
  decodeDvalue(routine: 'SCRHUN' | 'SCRTEN', digit: number): number

  /**
   * Encode a numeric score into the DSCORE BCD register: three bytes MSB-first
   * ([hThou|tThou, thou|hund, tens|ones]). Normal BCD — the backwards packing is
   * ONLY in the SCRTEN input digit, never the running total. Pure.
   */
  scoreToBcd(value: number): number[]

  /**
   * Credit a frame's attributed score events to the ledgers — THE DRAIN. Player 1
   * → ledger 0, player 2 → ledger 1; each ledger's `score` and `scoreBcd` advance
   * by the summed values for its player. A P1 event never moves P2's ledger. Pure
   * — the argument ledgers are never mutated.
   */
  creditScoreEvents(players: readonly PlayerLedger[], events: readonly GameScoreEvent[]): PlayerLedger[]

  /**
   * A fresh game: `sim` = createWaveDemo(seed), `playerCount` ledgers (default 2)
   * at score 0. Deterministic — same seed, same GameState. Pure.
   */
  createGame(seed: number, playerCount?: number): GameState

  /**
   * One frame: delegate stepping to stepDemo (the produced `sim` is bit-identical
   * to a raw stepDemo — no second stepping path), then drain the frame's score
   * events into the ledgers. Pure — the argument is never mutated.
   *
   * jt4-2 EXTENSION: stepGame also BOOKS a mount death — a player process that was
   * live in the wrapped sim last frame and is gone this frame (collisionPass removes
   * a joust loser / ptero victim, and nothing respawns it) decrements THAT player's
   * `lives` and credits the 50-for-dying (see `bookDeath`). And the drain now awards
   * extra men as score accrues (see `creditScoreEvents`).
   */
  stepGame(game: GameState, inputs?: Record<number, PlayerInput>): GameState

  /**
   * jt4-2 — book a player's mount death (JOUSTRV4.SRC:4700-4732, SPDIE2). The dying
   * `player` (process id 1 → ledger 0, 2 → ledger 1) loses exactly one life AND is
   * credited the 50-for-dying — `LDA #$50 / JSR SCRTEN`, i.e. the SCRTEN-backwards
   * decode of $50 = 50 points (NOT the forwards 5000), accruing into that player's
   * jt4-1 register. Only the dying player's ledger moves. Pure — the argument
   * ledgers are never mutated.
   */
  bookDeath(players: readonly PlayerLedger[], player: number): PlayerLedger[]
}

/**
 * Load the not-yet-built game module with a self-describing failure — the
 * loadPtero / loadTroll pattern. The specifier is assembled at runtime so the
 * bundler cannot resolve it statically and redden the whole FILE at collection.
 *
 * RED today: src/core/game.ts does not exist, so this throws a clean "feature
 * absent" per test, never a module-resolution stack trace.
 */
export async function loadGame(): Promise<GameModule> {
  const specifier = ['..', '..', 'src', 'core', 'game.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Partial<GameModule>
    for (const fn of ['decodeDvalue', 'scoreToBcd', 'creditScoreEvents', 'createGame', 'stepGame'] as const) {
      if (typeof mod[fn] !== 'function') throw new Error(`module has no \`${fn}\` export`)
    }
    return mod as GameModule
  } catch (e) {
    throw new Error(
      'game module not built yet — GREEN (Korben) creates joust/src/core/game.ts ' +
        'satisfying tests/helpers/game-contract.ts: the SCRHUN/SCRTEN decodeDvalue ' +
        '(the BACKWARDS tens|hundreds packing), scoreToBcd (the DSCORE byte order), ' +
        'creditScoreEvents (the per-player drain — a P1 kill never moves P2), and ' +
        'createGame/stepGame (stepGame WRAPS stepDemo — no second stepping path). ' +
        `Also commit docs/rom-study/claims/game.json (JT41-*). (${(e as Error).message})`,
    )
  }
}

/**
 * jt4-2 loader — the extra-men extension. Same self-describing-failure seam as
 * loadGame, but it additionally requires the jt4-2 export `bookDeath`, so every
 * jt4-2 test reddens cleanly with one build instruction until Korben ships the
 * mechanic (rather than a raw "bookDeath is not a function" TypeError). The award
 * + re-arm and the NSHIP seed ride the EXISTING creditScoreEvents / createGame
 * exports (their behaviour changes, not their shape), so they are covered by the
 * behaviour suite once this loader resolves.
 *
 * RED today: src/core/game.ts (jt4-1) exports no `bookDeath`, so this throws.
 */
export async function loadGameExtra(): Promise<GameModule> {
  const base = await loadGame() // jt4-1 surface must already be present
  if (typeof (base as Partial<GameModule>).bookDeath !== 'function') {
    throw new Error(
      'jt4-2 extra-men not built yet — GREEN (Korben) extends joust/src/core/game.ts: ' +
        'seed each ledger `lives` to NSHIP (5, TB12REV3.SRC:135) in createGame; add ' +
        '`bookDeath(players, player)` (lives-1 + the 50-for-dying via SCRTEN $50, ' +
        'JOUSTRV4.SRC:4730-4732) and wire it into stepGame off the sim player-process ' +
        'removal; fold the REPLAY extra-man award into creditScoreEvents (award at ' +
        '20,000, re-armed +20,000 per award, SCRLEV JOUSTRV4.SRC:7382-7411). ' +
        'Also commit docs/rom-study/claims/game-extra.json (JT42-*).',
    )
  }
  return base
}

// ═════════════════════════════════════════════════════════════════════════════
// Story jt4-3 — EGG + GLADIATOR WAVE TYPES + THE 2P BOUNTIES + THE PLYG1/2 TRAP
// ═════════════════════════════════════════════════════════════════════════════
//
// jt2-5 landed the six-entry WJSRTB dispatch skeleton with the DEGRADE laws
// (co-op→survival solo, JOUSTRV4.SRC:2628-2631; gladiator no-ops solo,
// JOUSTRV4.SRC:2697-2700); jt3-4 made only the PTERO type LIVE (pteroWaveSpawnCount).
// jt4-3 lands the remaining TWO type behaviours and the three co-op bounties:
//
//   • the EGG wave spawns its wave AS EGGS (WAVEGG, JOUSTRV4.SRC:2737) — a status→
//     spawn predicate flowing THROUGH dispatchWaveType, the exact shape jt3-4's
//     `pteroWaveSpawnCount` uses (Dev wires it into demo.ts's spawn path as
//     `spawnWavePteros` wires the ptero count);
//   • the GLADIATOR wave ARMS PvP (WGLAD, JOUSTRV4.SRC:2697-2716) — the guards armed
//     to −1 when the wave dispatches to 'gladiator';
//   • the three BOUNTIES, each 3,000 via `LDA #$30 / JSR SCRHUN` = decodeDvalue('SCRHUN',
//     $30) = 3000 (a jt4-1 PASS-THROUGH, never a fresh literal): co-op 3,000 each VOIDED
//     by a partner-kill (WCOSCR, :2642-2661), survival 3,000 for a DEATHLESS wave
//     (WSUSCR, :2674-2693), gladiator 3,000 to the FIRST partner-killer (SPDGLA,
//     :4691-4698). Each accrues into jt4-1's per-player registers.
//
// ─── THE POLARITY TRAP (JOUSTRV4.SRC:2634-2635 vs 2703-2705) ─────────────────
// The SAME two bytes PLYG1/PLYG2 INVERT meaning between the two 2P wave types:
//   • CO-OP arms them to 0 (`CLR PLYG1/PLYG2`, "RESET PLAYER HIT PLAYER COUNTER(S)",
//     :2634-2635): a partner-kill INCrements them non-zero, and any non-zero VOIDS the
//     team bonus (`LDA PLYG1 / ORA PLYG2 / BEQ award`, :2642-2644).
//   • GLADIATOR arms them to −1 (`LDA #-1 / STA PLYG1/PLYG2`, "TO AWARD SCORE UPON 1ST
//     ENCOUNTER", :2703-2705): the FIRST partner-kill flips the winner's byte (INC −1→0,
//     `BEQ SPDGLA`, :4685-4687) and AWARDS the 3,000 bounty — the exact opposite polarity.
// So a reset-to-0 means "clean, award" in co-op but "not yet claimed" in gladiator
// (which starts at −1); a partner-kill VOIDS in co-op but AWARDS in gladiator. PATC11
// (`CLR PLYG1/PLYG2`, :6282-6284) clears the boot state so the game never opens armed.

/**
 * jt4-3 — the two per-player partner-kill counters (PLYG1 / PLYG2). The POLARITY TRAP:
 * armed to 0 for a co-op wave (a partner-kill makes them non-zero → VOID) and to −1 for
 * a gladiator wave (a partner-kill flips them → AWARD). Same bytes, inverted meaning.
 */
export interface WaveGuards {
  /** PLYG1 — player 1's counter. */
  plyg1: number
  /** PLYG2 — player 2's counter. */
  plyg2: number
}

/**
 * jt4-3 — the end-of-wave context a bounty award reads: which players are still alive
 * (SPLY1+6 / SPLY2+6), the PLYG1/2 guards at wave end (partner-kill tracking), and
 * whether each player DIED this wave (PLYD1 / PLYD2 — the survival gate, :2677-2688).
 * Both tuples are `[player1, player2]`.
 */
export interface WaveEndContext {
  alive: readonly [boolean, boolean]
  guards: WaveGuards
  died: readonly [boolean, boolean]
}

/**
 * jt4-3 — the behaviour each WJSRTB entry carries (AC-1: "all six types now carry a
 * behaviour or a cited no-op"). The six raw types + the degraded 'survival':
 *   nop→'noop' (WAVRTS RTS, :2593), intro→'message' (WINTRO, :2595), coop→'coopBonus'
 *   (WCOOP, :2628), gladiator→'gladiatorBounty' (WGLAD, :2697), egg→'spawnEggs' (WAVEGG,
 *   :2737), ptero→'spawnPteros' (WPTERO, :2606), survival→'survivalBonus' (WAVSUR, :2665).
 */
export type WaveBehaviour =
  | 'noop'
  | 'message'
  | 'coopBonus'
  | 'gladiatorBounty'
  | 'spawnEggs'
  | 'spawnPteros'
  | 'survivalBonus'

/**
 * The jt4-3 surface — the jt4-1/jt4-2 GameModule PLUS the egg/gladiator wave-type
 * behaviours, the three co-op bounties, and the PLYG1/2 polarity guards.
 */
export interface GameBountyModule extends GameModule {
  /**
   * Arm the PLYG1/PLYG2 guards for a wave type — THE POLARITY (JOUSTRV4.SRC:2634-2635
   * vs 2703-2705). 'coop' → `{ plyg1: 0, plyg2: 0 }` (CLR — reset the partner-hit
   * counters); 'gladiator' → `{ plyg1: -1, plyg2: -1 }` (LDA #-1 — arm the 1st-encounter
   * award); every other type → `{ plyg1: 0, plyg2: 0 }` (a cited no-op — only WCOOP/WGLAD
   * touch PLYG). Pure.
   */
  armWaveGuards(type: ResolvedWaveType): WaveGuards

  /**
   * Record a player-vs-player kill by `winner` (id 1 or 2) — SPDGLA `INC ,Y`
   * (JOUSTRV4.SRC:4685-4694). The winner's counter advances: from co-op's 0 it counts
   * up (non-zero → the team bonus is later VOIDED); from gladiator's −1 the FIRST kill
   * flips it to the claimed state and AWARDS. Subsequent gladiator kills do not re-award
   * ("ONLY 1 GLADIATOR IN THE WAVE"). Pure — the argument guards are never mutated.
   */
  recordPartnerKill(guards: WaveGuards, winner: number): WaveGuards

  /**
   * Award the END-OF-WAVE bounty into the ledgers (JOUSTRV4.SRC:2642-2728, 4691-4698) —
   * each 3,000 via `decodeDvalue('SCRHUN', $30)` (a jt4-1 pass-through, NOT a literal):
   *   • 'coop'      — 3,000 to each ALIVE player IFF no partner-kill (both guards 0);
   *                   any non-zero guard VOIDS the whole team bonus (COOP3, :2642-2646).
   *   • 'survival'  — 3,000 to each ALIVE player who did NOT die this wave (PLYD==0,
   *                   :2674-2693); a survivor who died gets nothing.
   *   • 'gladiator' — 3,000 to the FIRST partner-killer only (the guard the flip left
   *                   claimed, :4691-4698); nobody killed → no bounty (GLAD4, :2726).
   *   • any other   — no bounty.
   * Only the entitled ledgers move; the credit accrues into jt4-1's score/scoreBcd
   * registers. Pure — the argument ledgers are never mutated.
   */
  awardWaveBounty(
    players: readonly PlayerLedger[],
    type: ResolvedWaveType,
    ctx: WaveEndContext,
  ): PlayerLedger[]

  /**
   * The behaviour a resolved wave type carries (AC-1) — every WJSRTB entry routes to a
   * real behaviour or the cited RTS no-op. See `WaveBehaviour`. Pure.
   */
  waveTypeBehaviour(type: ResolvedWaveType): WaveBehaviour

  /**
   * Whether a wave spawns its complement AS EGGS — the egg-wave behaviour flowing
   * THROUGH jt2-5's `dispatchWaveType` (WAVEGG index 4, `FDB WAVEGG`, JOUSTRV4.SRC:2590;
   * WAVEGG :2737), true iff the wave dispatches to the 'egg' type. The exact shape of
   * jt3-4's `pteroWaveSpawnCount`. The egg type does NOT degrade by player-count. Pure.
   */
  eggWaveSpawnsEggs(status: number, players: PlayersAlive): boolean
}

/**
 * jt4-3 loader — the egg/gladiator + bounty extension. Same self-describing-failure
 * seam as loadGameExtra: it requires the jt4-3 exports so every jt4-3 test reddens
 * cleanly with one build instruction (rather than a raw "armWaveGuards is not a
 * function" TypeError) until Korben ships the mechanic. The jt4-1/jt4-2 surface must
 * already be present (loadGameExtra).
 *
 * RED today: src/core/game.ts (jt4-2) exports none of the jt4-3 functions, so this throws.
 */
export async function loadGameBounty(): Promise<GameBountyModule> {
  const base = (await loadGameExtra()) as Partial<GameBountyModule>
  for (const fn of [
    'armWaveGuards',
    'recordPartnerKill',
    'awardWaveBounty',
    'waveTypeBehaviour',
    'eggWaveSpawnsEggs',
  ] as const) {
    if (typeof base[fn] !== 'function') {
      throw new Error(
        'jt4-3 egg/gladiator waves + 2P bounties not built yet — GREEN (Korben) extends ' +
          'joust/src/core/game.ts: `armWaveGuards(type)` (the PLYG1/2 polarity — coop 0, ' +
          'gladiator −1, JOUSTRV4.SRC:2634-2635 vs 2703-2705); `recordPartnerKill(guards, ' +
          'winner)` (SPDGLA INC ,Y, :4685-4694); `awardWaveBounty(players, type, ctx)` (the ' +
          'three 3,000 bounties via decodeDvalue(SCRHUN,$30) — co-op voided by partner-kill ' +
          ':2642-2661, survival deathless :2674-2693, gladiator first-killer :4691-4698); ' +
          '`waveTypeBehaviour(type)` (all six carry a behaviour or the RTS no-op); ' +
          '`eggWaveSpawnsEggs(status, players)` (WAVEGG through dispatchWaveType, :2590/2737, ' +
          'wired into demo.ts like spawnWavePteros); seed GameState.guards to {plyg1:0,plyg2:0} ' +
          'in createGame (PATC11 boot cleanup, :6282-6284). Also commit ' +
          `docs/rom-study/claims/game-bounty.json (JT43-*). (module has no \`${fn}\` export)`,
      )
    }
  }
  return base as GameBountyModule
}

// ═════════════════════════════════════════════════════════════════════════════
// Story jt4-4 — GAME-OVER (the GOVER tri-state) + THE LOOP CONSOLIDATION + DBAIT
// ═════════════════════════════════════════════════════════════════════════════
//
// jt4-1 built the drain, jt4-2 the extra men, jt4-3 the bounties + the PLYG1/2
// polarity — but every one of those pure functions is still only PARTLY wired into
// the live loop. jt4-4 closes the session layer:
//
//   • GOVER goes TRI-STATE (JOUSTRV4.SRC:232-233,712,1015): 0 = OVER (ATTRCT
//     `CLR GOVER`, :712), NEGATIVE = running (the boot `DEC GOVER` "STATE OF GAME =
//     STARTING THE GAME (.NE.)", :1015), and the positive `$7F` = the attract /
//     game SIMULATION mode (GAMSIM `LDA #$7F / STA GOVER`, :232-233). Two knights =
//     two independent ledgers: a player at ZERO lives is OUT and WAITS; the game
//     reaches OVER only when EVERY player is out (the epic's co-op ruling).
//   • THE WAVE-TO-WAVE LOOP is consolidated under `stepGame` — score, lives and
//     gover all ride the ONE `stepDemo`-wrapping sim step (the jt2-1 one-sim seam,
//     no divergent second stepping path); a seeded multi-wave game replays
//     bit-for-bit.
//   • The jt4-3 arm/detect/award loop goes LIVE: `stepGame` arms the PLYG guards at
//     each wave start (armWaveGuards by the resolved wave type), records a live
//     partner-kill from demo.ts's new collisionPass event (recordPartnerKill), and
//     awards the wave bounty at wave end (awardWaveBounty) — all inside the single
//     step. DBAIT (baiter removal + the nbait settle) and the WAVEGG egg-hatch
//     spawn are demo.ts sim concerns pinned in tests/demo-jt4-4.test.ts.
//
// The GOVER surface is the only NEW game.ts EXPORT (`settleGameOver` + the three
// GOVER_* constants) — the arm/detect/award loop reuses jt4-3's exports, wired into
// the EXISTING stepGame, so its behaviour is pinned through stepGame, not a new fn.

/**
 * The jt4-4 surface — the jt4-1/2/3 module PLUS the GOVER tri-state game-over seam.
 * The loop-consolidation, the arm/detect/award wiring, DBAIT and the egg-hatch
 * spawn are BEHAVIOUR changes to existing exports (stepGame / stepDemo /
 * collisionPass / spawnWaveEnemies), not new functions.
 */
export interface GameLoopModule extends GameBountyModule {
  /**
   * `0` — GOVER OVER: the game is over (ATTRCT `CLR GOVER` "STATE OF GAME = OVER",
   * JOUSTRV4.SRC:712). settleGameOver returns this iff every player is out.
   */
  readonly GOVER_OVER: number
  /**
   * A NEGATIVE value — GOVER RUNNING: a game in progress (the boot `DEC GOVER`
   * "STATE OF GAME = STARTING THE GAME (.NE.)", JOUSTRV4.SRC:1015 — DEC from 0
   * makes it non-zero/negative $FF). createGame boots here.
   */
  readonly GOVER_RUNNING: number
  /**
   * `$7F` (127) — GOVER ATTRACT/SIMULATION: the attract-mode game simulation
   * (GAMSIM `LDA #$7F / STA GOVER` "GAME SIMULATION MODE", JOUSTRV4.SRC:232-233).
   * A real game NEVER boots into this; the tri-state's positive rung.
   */
  readonly GOVER_ATTRACT: number

  /**
   * Settle the per-player OUT flags and the game's GOVER from the ledgers' lives
   * (the co-op game-over law): each ledger is `out` iff its `lives <= 0`; the
   * returned `gover` is `GOVER_OVER` iff EVERY player is out, else `GOVER_RUNNING`
   * — a lone survivor keeps the game running while its dead partner waits. Pure —
   * the argument ledgers are never mutated.
   */
  settleGameOver(players: readonly PlayerLedger[]): { players: PlayerLedger[]; gover: number }
}

/**
 * jt4-4 loader — the game-over + loop-consolidation extension. Same
 * self-describing-failure seam as loadGameBounty: it requires the GOVER surface
 * (`settleGameOver` + the three GOVER_* constants) so every jt4-4 game.ts test
 * reddens cleanly with one build instruction until Korben ships the mechanic. The
 * jt4-1/2/3 surface must already be present (loadGameBounty).
 *
 * RED today: src/core/game.ts (jt4-3) exports no `settleGameOver` and no GOVER_*
 * constants, so this throws.
 */
export async function loadGameLoop(): Promise<GameLoopModule> {
  const base = (await loadGameBounty()) as Partial<GameLoopModule>
  const need =
    typeof base.settleGameOver !== 'function' ||
    base.GOVER_OVER === undefined ||
    base.GOVER_RUNNING === undefined ||
    base.GOVER_ATTRACT === undefined
  if (need) {
    throw new Error(
      'jt4-4 game-over (the GOVER tri-state) not built yet — GREEN (Korben) extends ' +
        'joust/src/core/game.ts: export the GOVER tri-state constants (GOVER_OVER = 0 ' +
        'per ATTRCT CLR GOVER :712, GOVER_RUNNING negative per the boot DEC GOVER :1015, ' +
        'GOVER_ATTRACT = $7F per GAMSIM :232-233) and `settleGameOver(players)` (mark each ' +
        'ledger out iff lives<=0; gover = GOVER_OVER iff ALL out, else GOVER_RUNNING). Wire ' +
        'settleGameOver into stepGame (recompute out/gover each frame from lives), consolidate ' +
        'the wave-to-wave loop under stepGame (arm PLYG guards at wave start, record the live ' +
        'partner-kill from collisionPass, award the wave bounty at wave end), and commit ' +
        'docs/rom-study/claims/game-loop.json (JT44-*). Also close the demo.ts DBAIT settle + ' +
        'the WAVEGG egg-hatch spawn (tests/demo-jt4-4.test.ts). ' +
        `(GOVER surface absent)`,
    )
  }
  return base as GameLoopModule
}

// ═════════════════════════════════════════════════════════════════════════════
// Story jt4-5 — THE FULL LOOP: RESPAWN + THE DEV-OVERLAY READOUT (the epic closer)
// ═════════════════════════════════════════════════════════════════════════════
//
// jt4-1..jt4-4 built the session layer; jt4-5 is the DEMO BAR — two knights playing
// a full loop (co-op spawn → waves → death → extra man → game-over) with a
// dev-overlay score/lives/wave readout. The last two behaviour gaps close here:
//
//   • RESPAWN — a mount death today is a SILENT process removal with NO re-entry
//     (jt4-4 Delivery Finding): a dead player never comes back, so lives never
//     reach 0 in natural play and the all-out game-over was pinned via a constructed
//     all-dead state. The ROM rebirth path (CREP1/CREP2, JOUSTRV4.SRC:5610-5618)
//     DECrements the man count (DECLIV, :5390-5400/:5613) and — `BEQ PLYDIE` (:5614)
//     — re-creates the player through the transporter unless the DEC hit 0 (PLYDIE,
//     :5605-5606 → JMP VSUCIDE: the man is gone). So a dead player WITH lives left
//     re-enters; a player at ZERO lives stays out. This is a BEHAVIOUR change to
//     `stepGame` (no new export) — pinned through stepGame's live process set.
//
//   • THE DEV-OVERLAY READOUT — `overlayReadout(game)` is the ONE new game.ts export:
//     a PURE projection of the session registers (each player's score + lives, and
//     the wave) straight off the GameState the shell steps. The shell draws its
//     output; because it TAKES the GameState by value it cannot drift from a
//     shell-side copy (routing≠geometry — the readout is pinned by OUTPUT, not by a
//     text match). The authentic MESSAGE.SRC display is jt5 — this is the dev bar.

/** One player's dev-overlay readout line — its id (1-based), score and lives. */
export interface OverlayPlayerReadout {
  /** 1-based player id (1 → ledger 0, 2 → ledger 1) — the P1/P2 label. */
  player: number
  /** The player's running score, read straight off its ledger. */
  score: number
  /** The player's remaining lives (NSHIP-seeded), read straight off its ledger. */
  lives: number
}

/** The whole dev-overlay readout: the wave number + one line per player. */
export interface OverlayReadout {
  /** The 1-based wave, read off the GameState (mirrored from the sim). */
  wave: number
  /** One readout line per ledger, in P1, P2 order. */
  players: OverlayPlayerReadout[]
}

/**
 * The jt4-5 surface — the jt4-4 module PLUS the dev-overlay readout. Respawn is a
 * BEHAVIOUR change to `stepGame` (no new export), so it is pinned through stepGame,
 * not a new function; `overlayReadout` is the only new export.
 */
export interface GameDemoModule extends GameLoopModule {
  /**
   * Project the dev-overlay readout from a GameState — a PURE selector reading each
   * ledger's score + lives and the wave STRAIGHT off the state (no copy, no clock).
   * `players` is in P1, P2 order with 1-based ids. Pure — the argument is untouched.
   */
  overlayReadout(game: GameState): OverlayReadout
}

/**
 * jt4-5 loader — the dev-overlay readout extension. Same self-describing-failure seam
 * as loadGameLoop: it requires the one new export (`overlayReadout`) so every jt4-5
 * overlay test reddens cleanly with one build instruction until Korben ships it. The
 * jt4-1..jt4-4 surface must already be present (loadGameLoop). Respawn tests use
 * loadGameLoop directly — respawn adds no export, only stepGame behaviour.
 *
 * RED today: src/core/game.ts exports no `overlayReadout`, so this throws.
 */
export async function loadGameFull(): Promise<GameDemoModule> {
  const base = (await loadGameLoop()) as Partial<GameDemoModule>
  if (typeof base.overlayReadout !== 'function') {
    throw new Error(
      'jt4-5 dev-overlay readout not built yet — GREEN (Korben) extends ' +
        'joust/src/core/game.ts: export a PURE `overlayReadout(game)` that projects each ' +
        'ledger`s { player, score, lives } (P1, P2 order, 1-based ids) plus `wave` STRAIGHT ' +
        'off the GameState (no shell-side copy). AND wire RESPAWN into stepGame: a player ' +
        'process removed by a mount death whose ledger still has lives (>0) RE-ENTERS via the ' +
        'transporter (the ROM CREP1/CREP2 rebirth, JOUSTRV4.SRC:5610-5618 — DECLIV :5613 then ' +
        'BEQ PLYDIE :5614); a player at ZERO lives stays OUT (PLYDIE :5605-5606). Wire the ' +
        'coop/survival wave-end team bonuses live into stepGame for a REAL (non-forced) wave ' +
        'clear without double-awarding through the jt4-4 strip-to-players advances, and wire ' +
        'the settled WAVEGG egg hatch→remount so an egg wave self-clears (tests/demo-jt4-5.ts). ' +
        'Point the shell (src/main.ts) at createGame/stepGame and draw overlayReadout. Also ' +
        `commit docs/rom-study/claims/game-jt4-5.json (JT45-*). (overlayReadout export absent)`,
    )
  }
  return base as GameDemoModule
}
