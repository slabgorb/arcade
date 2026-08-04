// src/core/game.ts
//
// Story jt4-1 (GREEN, Korben / Dev) — the SESSION LAYER above the sim: the first
// module of epic jt4 (the game loop). jt2/jt3 built the deterministic sim
// (demo.ts / stepDemo); it emits score VALUES as events (joust.killScore,
// egg.eggScoreEvents, ptero.pteroScoreEvent) and then throws them away (demo.ts
// caps the event log: "nothing drains it until the jt4 score display"). This
// module is that missing drain — one new module holding per-session state above
// the per-frame sim, and a `stepGame` that WRAPS `stepDemo` (no second stepping
// path — the jt2-1 one-sim seam) and DRAINS each frame's score events into
// per-player BCD registers.
//
// CORE: pure functions over plain data — no clock, no ambient entropy, no browser
// surface, no shell import (the jt1-7 purity scanner sweeps this file the moment
// it lands). Every function is a pure transform of the state handed in.
//
// ─── THE BCD SCORE LAW (JOUSTRV4.SRC:7340-7366) — SCRHUN vs SCRTEN ────────────
// A kill's point value comes from the enemy's DVALUE decision block: a score
// ROUTINE applied to a one-byte BCD DIGIT.
//   • SCRHUN "INCREMENT SCORE BY THOUSANDS AND HUNDREDS" (JOUSTRV4.SRC:7340,7346):
//     the digit packs THOUSANDS in the high nibble, HUNDREDS in the low —
//     $15 = 1500, $10 = 1000 (forwards).
//   • SCRTEN "TENS & HUNDREDS BCD DIGIT (BACKWARDS)" (JOUSTRV4.SRC:7353,7357):
//     the digit packs TENS in the HIGH nibble (`ANDA #$F0` "SCORE TENS",
//     JOUSTRV4.SRC:7360) and HUNDREDS in the LOW nibble (`ANDB #$0F`,
//     JOUSTRV4.SRC:7361) — the REVERSE of positional order. $57 = 750 (NOT 570),
//     $05 = 500.
// The four ladder rungs (P4DEC..P7DEC, JOUSTRV4.SRC:5563-5577): bounder SCRTEN
// $05 -> 500, hunter SCRTEN $57 -> 750, shadow lord SCRHUN $15 -> 1500, ptero
// SCRHUN $10 -> 1000 (DERIVED — verify-in-emulation caveat, ruling C). These are
// PASS-THROUGH of the already-gated joust.killScore / ptero.PTERO_SCORE (jt2-3 /
// jt3-4), never re-derived here into a fresh literal.
//
// The running total (DSCORE) is NORMAL BCD (the DAA-adjusted add,
// JOUSTRV4.SRC:7362-7366) — only the SCRTEN *input digit* is backwards.

import {
  createWaveDemo,
  stepDemo,
  respawnPlayerProcess,
  type DemoState,
  type DemoEvent,
} from './demo.js'
import { dispatchWaveType, waveRowAt, type ResolvedWaveType, type PlayersAlive } from './wave.js'
import type { PlayerInput } from './flight.js'
import type { GameEvent } from './events.js'

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * One player's session ledger. Only `score` / `scoreBcd` are jt4-1's behaviour;
 * `lives` and `out` are placeholder fields carried here so the ROM co-op shape is
 * born in the first story — jt4-2 (NSHIP) owns `lives`, jt4-4 (GOVER) owns `out`.
 */
export interface PlayerLedger {
  /** Running numeric score total (integer) — the drained kill/egg/ptero values. */
  score: number
  /** The 6-digit BCD register as three bytes MSB-first (the DSCORE byte layout). */
  scoreBcd: readonly number[]
  /**
   * NSHIP lives (jt4-2): seeded to NSHIP (5) at game start; a mount death decrements
   * this player's OWN count; an extra-man award increments it. (jt4-4 owns both-out → GOVER.)
   */
  lives: number
  /**
   * The score this player must reach for its NEXT extra man — the ROM's per-player "LEVEL
   * TO PASS" (SPLY1+8 / SPLY2+8, JOUSTRV4.SRC:927-928). Seeded to REPLAY_INTERVAL and
   * RE-ARMED +REPLAY_INTERVAL per award. Optional: absent means "the default 20,000, un-awarded".
   */
  extraManAt?: number
  /** Out of the game — jt4-4 owns the semantics (false here). */
  out: boolean
}

/** The whole game session: the ledgers, the loop scalars, and the wrapped sim. */
export interface GameState {
  /** One ledger per player, index 0 = P1, index 1 = P2 (the co-op shape). */
  players: readonly PlayerLedger[]
  /** GOVER — jt4-4 owns the tri-state (running placeholder here). */
  gover: number
  /** 1-based wave, mirrored from the sim. */
  wave: number
  /** The wrapped deterministic sim (createWaveDemo / stepDemo). */
  sim: DemoState
  /**
   * jt5-1 — THIS FRAME's audio cues: the sim's own stream (`sim.cues`) followed
   * by the moments only the SESSION layer resolves (the extra man, the wave
   * bounty, the transporter re-entry). REBUILT every frame, so the shell can
   * dispatch the whole list unconditionally and a quiet frame plays nothing.
   *
   * This is the seam the shell reads. It is DATA — the core never calls back
   * into an audio engine, which is what keeps a seeded replay identical.
   */
  events: readonly GameEvent[]
  /**
   * jt4-3 — the two per-player partner-kill counters PLYG1 / PLYG2 (the polarity
   * trap). Seeded to `{ plyg1: 0, plyg2: 0 }` at game start — the PATC11 "GAME START
   * GOOF" boot cleanup (`CLR PLYG1 / CLR PLYG2`, JOUSTRV4.SRC:6282-6284) — so a stale
   * gladiator −1 from a prior game never mis-awards a 3,000-point bounty. Optional so
   * jt4-1/jt4-2 GameState consumers still typecheck; createGame seeds it.
   */
  guards?: WaveGuards
}

/**
 * jt4-3 — the two per-player partner-kill counters (PLYG1 / PLYG2). THE POLARITY
 * TRAP: armed to 0 for a co-op wave (a partner-kill makes them non-zero → VOID) and
 * to −1 for a gladiator wave (a partner-kill flips them → AWARD). Same bytes,
 * inverted meaning (JOUSTRV4.SRC:2634-2635 vs 2703-2705).
 */
export interface WaveGuards {
  /** PLYG1 — player 1's counter. */
  plyg1: number
  /** PLYG2 — player 2's counter. */
  plyg2: number
}

/**
 * jt4-3 — the end-of-wave context a bounty award reads: which players are still
 * alive (SPLY1+6 / SPLY2+6), the PLYG1/2 guards at wave end (partner-kill tracking),
 * and whether each player DIED this wave (PLYD1 / PLYD2 — the survival gate,
 * JOUSTRV4.SRC:2677-2688). Both tuples are `[player1, player2]`.
 */
export interface WaveEndContext {
  alive: readonly [boolean, boolean]
  guards: WaveGuards
  died: readonly [boolean, boolean]
}

/**
 * jt4-3 — the behaviour each WJSRTB entry carries (AC-1: "all six types now carry a
 * behaviour or a cited no-op"). The six raw types + the degraded 'survival':
 *   nop→'noop' (WAVRTS RTS, :2586/2593), intro→'message' (WINTRO, :2587),
 *   coop→'coopBonus' (WCOOP, :2628), gladiator→'gladiatorBounty' (WGLAD, :2697),
 *   egg→'spawnEggs' (WAVEGG, :2737), ptero→'spawnPteros' (WPTERO, :2591),
 *   survival→'survivalBonus' (WAVSUR/WSUSCR, :2665,2674).
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
 * A score event ATTRIBUTED to a player — the sim's `{kind:'score',value,reason}`
 * plus the scoring player's process id (1 -> ledger 0, 2 -> ledger 1).
 */
export interface GameScoreEvent {
  kind: 'score'
  value: number
  reason: 'kill' | 'egg' | 'escape'
  player: number
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Player process ids (mirroring demo.ts PLAYER1_ID / PLAYER2_ID). */
const PLAYER1_ID = 1
/** Default co-op: two knights, two ledgers. */
const DEFAULT_PLAYER_COUNT = 2
/**
 * The wave-HOLDING combatant kinds. A "fought clear" is a wave advance with one of these
 * present in the PRE-STEP sim (a real enemy/egg/ptero/troll was there) — STRUCTURALLY distinct
 * from the jt4-4 strip-to-BARE-players `forceAdvance` (players only, no combatant). The
 * co-op/survival team bonus fires only on a fought clear, so a forced advance banks nothing and
 * the frozen jt4-4 gladiator pin (which force-clears through the coop wave) stays green.
 */
const COMBATANT_KINDS: ReadonlySet<string> = new Set(['enemy', 'egg', 'ptero', 'troll'])
/**
 * GOVER — the tri-state game-over byte (JOUSTRV4.SRC:232-233,712,1015). A SIGNED byte with
 * THREE meanings, not a boolean: over / running / attract-simulation.
 *
 *   • GOVER_OVER = 0 — the game is over (ATTRCT `CLR GOVER` "STATE OF GAME = OVER", :712).
 *     settleGameOver returns this iff EVERY player is out.
 *   • GOVER_RUNNING = −1 — a game in progress (the boot `DEC GOVER` from 0 → non-zero
 *     "STATE OF GAME = STARTING THE GAME (.NE.)", :1015). createGame boots here.
 *   • GOVER_ATTRACT = $7F — the attract / game-SIMULATION mode (GAMSIM `LDA #$7F / STA GOVER`
 *     "GAME SIMULATION MODE", :232-233); a real game NEVER boots into the positive rung.
 */
export const GOVER_OVER = 0
export const GOVER_RUNNING = -1
export const GOVER_ATTRACT = 0x7f
/**
 * NSHIP — the kept free-play CMOS default of 5 men per player (DEFALT's NMEN entry
 * `FCB $05`, TB12REV3.SRC:135; the symbol is NSHIP "# OF SHIPS/1 CREDIT GAME",
 * EQU.SRC:111). jt4-2 seeds each ledger here.
 */
const NSHIP = 5
/**
 * The REPLAY extra-man interval: 20,000 points. The CMOS REPLAY nibble ($20 = BCD 20,
 * TB12REV3.SRC:134 "REPLAY @20,000") is JUSTIFIED ×16 — four `ASLB`/`ROLA` pairs — into
 * LEVPAS / SPLY1+8 / SPLY2+8 (JOUSTRV4.SRC:915-928); BCD 20 × 1000 = 20,000. An extra man
 * lands at each multiple, re-armed +20,000 per award (SCRLEV, JOUSTRV4.SRC:7382-7411).
 */
const REPLAY_INTERVAL = 20_000
/**
 * The 50-for-dying BCD digit: the death path does `LDA #$50 / JSR SCRTEN`
 * (JOUSTRV4.SRC:4730-4732). Decoded through the SAME jt4-1 SCRTEN routine, $50 (backwards)
 * = 5 tens = 50 — never a fresh literal, so the caveat cannot be misread as the forwards 5000.
 */
const DEATH_DIGIT = 0x50
/**
 * jt4-3 — the co-op / survival / gladiator wave bonus DIGIT. All three do `LDA #$30 /
 * JSR SCRHUN` = 3,000 (co-op :2651, survival :2680/2689, gladiator :4697). Decoded
 * through the SAME jt4-1 SCRHUN routine — a pass-through, never a fresh 3000 literal.
 */
const BOUNTY_DIGIT = 0x30
/**
 * jt4-3 — the gladiator PLYG arm value: `LDA #-1` "SET-UP PLAYER KILLING PLAYER
 * VARIABLES … TO AWARD SCORE UPON 1ST ENCOUNTER" (JOUSTRV4.SRC:2703-2705). Co-op arms
 * to 0 instead (`CLR`, :2634-2635) — the polarity inversion.
 */
const GLADIATOR_ARM = -1
/**
 * jt4-3 — SPDGLA's claimed marker: `LDA #$80 / STA ,Y` "INDICATE TRUE WINNING
 * GLADIATOR" (JOUSTRV4.SRC:4693-4694), stamped on the FIRST partner-killer's byte after
 * the −1→0 flip. awardWaveBounty pays whichever guard carries it.
 */
const GLADIATOR_CLAIMED = 0x80

// ─── The SCRHUN / SCRTEN decode + the BCD register ──────────────────────────

/**
 * Decode a DVALUE (routine, digit) pair to its point value (JOUSTRV4.SRC:7340-7366).
 * SCRHUN: thousands = high nibble, hundreds = low nibble (forwards). SCRTEN
 * (BACKWARDS): tens = HIGH nibble (`ANDA #$F0`), hundreds = LOW nibble
 * (`ANDB #$0F`). Pure.
 */
export function decodeDvalue(routine: 'SCRHUN' | 'SCRTEN', digit: number): number {
  const hi = (digit >> 4) & 0xf
  const lo = digit & 0xf
  return routine === 'SCRHUN' ? hi * 1000 + lo * 100 : hi * 10 + lo * 100
}

/**
 * Encode a numeric score into the DSCORE BCD register: three bytes MSB-first
 * ([hThou|tThou, thou|hund, tens|ones]). Normal BCD — the backwards packing is
 * ONLY in the SCRTEN input digit, never the running total. Six digits (the ROM's
 * score area) — values above 999,999 saturate. Pure.
 */
export function scoreToBcd(value: number): number[] {
  const v = Math.max(0, Math.min(Math.trunc(value), 999_999))
  const d = v.toString().padStart(6, '0')
  return [
    (Number(d[0]) << 4) | Number(d[1]),
    (Number(d[2]) << 4) | Number(d[3]),
    (Number(d[4]) << 4) | Number(d[5]),
  ]
}

// ─── The drain ──────────────────────────────────────────────────────────────

/** Which ledger a player id credits: player 1 -> 0, player 2 -> 1 (clamped). */
function ledgerIndex(player: number, count: number): number {
  return Math.min(Math.max(player - 1, 0), count - 1)
}

/**
 * Award any extra men the ledger's score has passed — the REPLAY threshold check that runs
 * AS score accrues (SCRLEV, JOUSTRV4.SRC:7382-7411). Each award grants a man and RE-ARMS the
 * threshold +REPLAY_INTERVAL; the ROM re-checks (`BRA SCRLEV`, "RE-CHECK FOR LEVEL PASS (LOW
 * LEVELS)"), so a single jump can pass several levels at once — hence a while-loop, not one
 * test. An absent `extraManAt` (jt4-1 ledgers carry none) defaults to the first interval. Pure.
 */
function awardExtraMen(ledger: PlayerLedger): PlayerLedger {
  let lives = ledger.lives
  let extraManAt = ledger.extraManAt ?? REPLAY_INTERVAL
  while (ledger.score >= extraManAt) {
    lives += 1
    extraManAt += REPLAY_INTERVAL
  }
  return { ...ledger, lives, extraManAt }
}

/**
 * Credit a frame's attributed score events to the ledgers — THE DRAIN. Each ledger's
 * `score` (and its `scoreBcd` view) advances by the summed values for its own player; a P1
 * event never moves P2's ledger (the co-op independence). Every credited ledger then
 * re-checks its REPLAY extra-man threshold (jt4-2's `awardExtraMen`). Pure — the argument
 * ledgers are never mutated.
 */
export function creditScoreEvents(
  players: readonly PlayerLedger[],
  events: readonly GameScoreEvent[],
): PlayerLedger[] {
  const scores = players.map((p) => p.score)
  for (const e of events) scores[ledgerIndex(e.player, players.length)] += e.value
  return players.map((p, i) => awardExtraMen({ ...p, score: scores[i], scoreBcd: scoreToBcd(scores[i]) }))
}

/**
 * Book a player's mount death (SPDIE2, JOUSTRV4.SRC:4700-4732): the dying `player` (id 1 ->
 * ledger 0, 2 -> ledger 1) loses exactly one life AND is credited the 50-for-dying —
 * `decodeDvalue('SCRTEN', $50)` = 50, accruing into its OWN register (and re-checking the
 * extra-man threshold, since the ROM's SCRLEV runs on every score change). Only the dying
 * player's ledger moves. Pure — the argument ledgers are never mutated.
 */
export function bookDeath(players: readonly PlayerLedger[], player: number): PlayerLedger[] {
  const idx = ledgerIndex(player, players.length)
  const credit = decodeDvalue('SCRTEN', DEATH_DIGIT)
  return players.map((p, i) => {
    if (i !== idx) return { ...p }
    const score = p.score + credit
    return awardExtraMen({ ...p, score, scoreBcd: scoreToBcd(score), lives: p.lives - 1 })
  })
}

// ─── The session layer ──────────────────────────────────────────────────────

/**
 * A fresh game: the sim is a real `createWaveDemo(seed)`, `playerCount` ledgers
 * (default 2) at score 0. Deterministic — same seed, same GameState. Pure.
 */
export function createGame(seed: number, playerCount: number = DEFAULT_PLAYER_COUNT): GameState {
  const sim = createWaveDemo(seed)
  const players: PlayerLedger[] = Array.from({ length: playerCount }, () => ({
    score: 0,
    scoreBcd: scoreToBcd(0),
    lives: NSHIP,
    extraManAt: REPLAY_INTERVAL,
    out: false,
  }))
  // PATC11 "GAME START GOOF" boot cleanup (JOUSTRV4.SRC:6282-6284): a fresh game opens with
  // PLYG1/2 CLEARed ("RESET 3,000 POINT TRIGGER"), so a stale gladiator −1 from a prior game
  // never mis-awards a 3,000-point bounty on the first partner-kill of a non-gladiator wave.
  //     PATC11  CLR PLYG1 / CLR PLYG2   ← the LIVE patch (the two lines we transcribe)
  //     ******** JMP EMSGS              ← the DISPLACED pre-patch instruction ("ERASE ANY END
  //                                        OF WAVE MESSAGES(OLD INSTRUCTION)", :6284), kept
  //                                        behind a ******** comment (RV4 convention). It is
  //                                        the message-erase seam, not a boot-state concern,
  //                                        so createGame transcribes the CLRs only.
  return { players, gover: GOVER_RUNNING, wave: sim.wave, sim, events: [], guards: { plyg1: 0, plyg2: 0 } }
}

/**
 * jt5-1 — how many extra men a ledger was awarded across one step. `awardExtraMen`
 * re-arms `extraManAt` by exactly one REPLAY_INTERVAL per award (SCRLEV's
 * re-check loop, JOUSTRV4.SRC:7382-7411), so the threshold's own movement counts
 * them — including the several-at-once case a single big jump can produce. Read
 * off the threshold rather than `lives`, because a death decrements lives on the
 * same frame an award could increment it and the two would cancel. Pure.
 */
function extraMenAwarded(before: PlayerLedger, after: PlayerLedger): number {
  const from = before.extraManAt ?? REPLAY_INTERVAL
  const to = after.extraManAt ?? REPLAY_INTERVAL
  return Math.max(0, Math.round((to - from) / REPLAY_INTERVAL))
}

/**
 * Settle the per-player OUT flags and the game's GOVER from the ledgers' lives — the co-op
 * game-over law (JOUSTRV4.SRC:712,1015). Each ledger is `out` iff its `lives <= 0`; the
 * returned `gover` is GOVER_OVER iff EVERY player is out (all knights spent — ATTRCT
 * `CLR GOVER`), else GOVER_RUNNING — a lone survivor keeps the game running while its dead
 * partner WAITS. Pure — the argument ledgers are never mutated.
 */
export function settleGameOver(players: readonly PlayerLedger[]): { players: PlayerLedger[]; gover: number } {
  const settled = players.map((p) => ({ ...p, out: p.lives <= 0 }))
  const gover = settled.length > 0 && settled.every((p) => p.out) ? GOVER_OVER : GOVER_RUNNING
  return { players: settled, gover }
}

/** Which players are still IN the game (SPLY1+6 / SPLY2+6) — a ledger with lives left. */
function playersAlive(players: readonly PlayerLedger[]): PlayersAlive {
  return { p1: players.length > 0 && players[0].lives > 0, p2: players.length > 1 && players[1].lives > 0 }
}

/** The resolved wave type for a (sim-BCD) wave number under the live players — the same
 * dispatchWaveType the sim spawns from (co-op/gladiator degrade solo). */
function resolveWaveType(waveNumber: number, players: readonly PlayerLedger[]): ResolvedWaveType {
  return dispatchWaveType(waveRowAt(waveNumber).status, playersAlive(players))
}

/** `playersAlive` as the WaveEndContext's `[p1, p2]` tuple. */
function playersAliveTuple(players: readonly PlayerLedger[]): [boolean, boolean] {
  const a = playersAlive(players)
  return [a.p1, a.p2]
}

/**
 * One frame: delegate stepping to `stepDemo` (the produced sim is bit-identical to a raw
 * stepDemo — NO second stepping path, the jt2-1 one-sim seam), then run the SESSION layer
 * over the single step — score, lives, GOVER, and the gladiator arm/detect/award loop all
 * ride the ONE sim step. Pure — the argument is never mutated. In order:
 *
 *   1. DRAIN the frame's fresh score events into the ledgers (jt4-1) — a P1 kill never
 *      moves P2. Fresh = the reference-set delta the previous (capped) log did not carry.
 *   2. BOOK a mount death (jt4-2): a player id live last frame and gone now is exactly one
 *      death (collisionPass removes a joust loser / ptero victim with no respawn).
 *   3. DETECT partner-kills (jt4-4): record each fresh collisionPass `partnerKill` event
 *      into the PLYG guards (recordPartnerKill / SPDGLA INC ,Y).
 *   4. On a WAVE ADVANCE (the advance runs inside stepDemo): AWARD the ending gladiator
 *      wave's 3,000 to the first partner-killer from the recorded guards, then ARM the new
 *      wave's PLYG guards for its resolved type (armWaveGuards — the polarity at wave start).
 *   5. SETTLE out/GOVER from the lives every frame (recompute, never carry gover forward).
 */
export function stepGame(game: GameState, inputs?: Record<number, PlayerInput>): GameState {
  const sim = stepDemo(game.sim, inputs)
  // jt5-1 — the SESSION layer's own cues. The sim's stream (`sim.cues`) is
  // prepended at the end; these are the three moments `stepDemo` cannot see,
  // because the ledgers and the respawn live up here.
  const cues: GameEvent[] = []
  const prior = new Set<DemoEvent>(game.sim.events)
  // A type-predicate filter narrows to the score variant without a cast, so a future
  // DemoEvent-shape drift is a compile error rather than a silent runtime assumption.
  const isFreshScore = (e: DemoEvent): e is Extract<DemoEvent, { kind: 'score' }> =>
    !prior.has(e) && e.kind === 'score'
  const scoreEvents: GameScoreEvent[] = sim.events
    .filter(isFreshScore)
    .map((s) => ({ kind: 'score', value: s.value, reason: s.reason, player: s.player ?? PLAYER1_ID }))
  let players = creditScoreEvents(game.players, scoreEvents)

  // Book any mount death THIS frame (jt4-2): a player id live in the previous sim and gone
  // from the stepped sim is exactly one mount death — the process-set analogue of the drain.
  const priorLive = livePlayerIds(game.sim)
  const survivingIds = livePlayerIds(sim)
  for (const id of priorLive) if (!survivingIds.has(id)) players = bookDeath(players, id)

  // The FOUGHT-CLEAR signal (jt4-5): a wave-holding combatant present in the PRE-STEP sim marks
  // a REAL clear, distinct from the jt4-4 strip-to-bare-players forced advance (players only).
  const foughtClear = game.sim.sim.processes.some((p) => COMBATANT_KINDS.has(p.kind))

  // jt4-4 — the arm / detect / award loop, LIVE on the single sim step.
  // DETECT: fold each fresh partner-kill event from collisionPass into the guards (SPDGLA).
  let guards: WaveGuards = game.guards ?? { plyg1: 0, plyg2: 0 }
  const isFreshPartnerKill = (e: DemoEvent): e is Extract<DemoEvent, { kind: 'partnerKill' }> =>
    !prior.has(e) && e.kind === 'partnerKill'
  for (const pk of sim.events.filter(isFreshPartnerKill)) guards = recordPartnerKill(guards, pk.winner)

  // A wave that advanced this frame ENDED the prior wave and STARTED the next. AWARD the
  // ending wave's team bounty from the recorded guards, then ARM the new wave's PLYG guards.
  //   • GLADIATOR — 3,000 to the first partner-killer (SPDGLA :4691-4698); fires on ANY
  //     advance (the jt4-4 gladiator pin banks it through a bare forced advance).
  //   • CO-OP / SURVIVAL (jt4-5) — 3,000 each on a REAL FOUGHT clear only (a combatant was
  //     present pre-step); a bare forced advance banks nothing, so wiring these live never
  //     DOUBLE-awards through the jt4-4 strip-to-players advances (TEA's architectural gate).
  if (sim.wave !== game.sim.wave) {
    const endingType = resolveWaveType(game.sim.wave, players)
    const alive = playersAliveTuple(players)
    const beforeBounty = players
    if (endingType === 'gladiator') {
      players = awardWaveBounty(players, 'gladiator', { alive, guards, died: [false, false] })
      // SNBOUN "COLLECT BOUNTY" (:8096) sounds for the GLADIATOR claim and for
      // nothing else. :4711, inside SPDGLA ("ONLY 1 GLADIATOR IN THE WAVE",
      // :4691), is its ONLY call site in the whole ROM; the co-op (:2642-2658)
      // and survival (:2674-2693) awards hand out the same 3,000 through
      // SCRHUN + WAVMSG and play NOTHING. The silence in the branch below is
      // therefore the machine, not a gap to fill later.
      //
      // ONE cue, and only when the claim actually PAID — a gladiator wave
      // nobody claimed awards no one. Detected by a score MOVING rather than by
      // ledger identity, because `awardWaveBounty` returns fresh objects either
      // way, so identity would fire on every gladiator wave ever fought.
      if (players.some((p, i) => p.score !== beforeBounty[i].score)) cues.push({ type: 'wave-bounty' })
    } else if (foughtClear && (endingType === 'coop' || endingType === 'survival')) {
      // Points, no cue — see above. The machine is silent here.
      players = awardWaveBounty(players, endingType, { alive, guards, died: [false, false] })
    }
    guards = armWaveGuards(resolveWaveType(sim.wave, players))
  }

  // SETTLE out/GOVER from the lives each frame (the co-op game-over law) — recompute, never
  // carry gover forward: out iff lives<=0, over iff ALL out (a survivor keeps it running).
  const settled = settleGameOver(players)

  // RESPAWN (jt4-5) — the ROM CREP re-create → transporter-served re-materialise
  // (JOUSTRV4.SRC:5610-5620): a spent player whose ledger still has lives (DECLIV fell THROUGH
  // the BEQ PLYDIE zero-gate, :5613-5614) RE-ENTERS via the transporter inside a TIMED PLYINT
  // window (respawnPlayerProcess's `mat`); a player at ZERO lives stays OUT (PLYDIE :5605-5606 →
  // JMP VSUCIDE, the man is gone). The re-entry lands a frame AFTER the death — the man is absent
  // from BOTH the prior and the stepped sim (`!priorLive` rules out the frame it just died on, so
  // that frame still shows the removal). bookDeath already owns the life-decrement, so respawn
  // owns only the re-entry (no double-decrement). The re-materialise window then ENDS and
  // re-enables collisions (jt2-6), so the re-entered knight is vulnerable again and lives
  // naturally reach 0 through real play — the loop CLOSES (Reviewer Ruling #1).
  let processes = sim.sim.processes
  settled.players.forEach((p, i) => {
    const id = i + 1
    if (p.lives > 0 && !p.out && !survivingIds.has(id) && !priorLive.has(id)) {
      processes = [...processes, respawnPlayerProcess(id)]
      // The CREP re-create this block IS. Each knight has its OWN table —
      // SNPCR1 "PLAYER 1 RE-CREATED (TRANSPORTER)" (:8116-8118, bound at P1DEC
      // :5552) and SNPCR2 "PLAYER 2 RE-CREATED (TRANSPORTER)" (:8119-8121,
      // bound at P2DEC :5556) — so the moment carries WHICH knight and the
      // shell's dispatch picks the table. `id` is this loop's 1-based ledger
      // index; a constant here would re-collapse the two cues jt5-6 split.
      //
      // Narrowed explicitly rather than cast. `id` is `number` — `createGame`
      // takes an unclamped `playerCount`, so nothing in the TYPE stops a third
      // ledger existing and `id as PlayerId` would have asserted a range the
      // signature does not guarantee. The machine has exactly two knight tables
      // (SNPCR1/SNPCR2, bound at P1DEC/P2DEC), so anything that is not knight 2
      // sounds knight 1's — the same fallback the dispatch documents, stated
      // where it is decided instead of hidden behind an `as`.
      cues.push({ type: 'player-materialise', player: id === 2 ? 2 : 1 })
    }
  })
  const finalSim: DemoState =
    processes === sim.sim.processes ? sim : { ...sim, sim: { ...sim.sim, processes } }

  // SNREPL "EXTRA MAN" (:8089) — one cue per man awarded, counted off the ledger
  // thresholds across the WHOLE frame, so an award from a kill, an egg, the
  // 50-for-dying and the wave bounty all land here rather than at four sites.
  for (const [i, p] of settled.players.entries()) {
    for (let n = extraMenAwarded(game.players[i], p); n > 0; n--) cues.push({ type: 'extra-man' })
  }

  return {
    players: settled.players,
    gover: settled.gover,
    wave: sim.wave,
    sim: finalSim,
    // The sim's moments first, then the session's — the order the frame resolved
    // them in. The shell dispatches the list as given (jt5-1 AC4).
    events: [...finalSim.cues, ...cues],
    guards,
  }
}

/** The set of live player process ids in a sim frame (GameState.sim is a DemoState). */
function livePlayerIds(state: DemoState): Set<number> {
  return new Set(state.sim.processes.filter((p) => p.kind === 'player').map((p) => p.id))
}

// ═════════════════════════════════════════════════════════════════════════════
// jt4-3 — EGG + GLADIATOR WAVE TYPES, THE 2P BOUNTIES, AND THE PLYG1/2 POLARITY
// ═════════════════════════════════════════════════════════════════════════════
//
// jt2-5 landed the six-entry WJSRTB dispatch (WJSRTB, JOUSTRV4.SRC:2586-2591) with the
// DEGRADE laws (co-op→survival solo :2628-2631; gladiator no-ops solo :2697-2700);
// jt3-4 made only the PTERO type LIVE (pteroWaveSpawnCount). jt4-3 lands the remaining
// two type behaviours and the three co-op bounties, all accruing into jt4-1's registers.
//
// ─── THE POLARITY TRAP (JOUSTRV4.SRC:2634-2635 vs 2703-2705) ─────────────────
// The SAME two bytes PLYG1/PLYG2 INVERT meaning between the two 2P wave types:
//   • CO-OP arms them to 0 (`CLR`, "RESET PLAYER HIT PLAYER COUNTER(S)", :2634-2635):
//     a partner-kill INCrements one non-zero, and any non-zero VOIDS the team bonus
//     (`LDA PLYG1 / ORA PLYG2 / BEQ award`, :2642-2646).
//   • GLADIATOR arms them to −1 (`LDA #-1 / STA`, "TO AWARD SCORE UPON 1ST ENCOUNTER",
//     :2703-2705): the FIRST partner-kill flips the winner's byte (INC −1→0, `BEQ SPDGLA`,
//     :4685-4687), clears both ("ONLY 1 GLADIATOR IN THE WAVE", :4691-4692) and stamps the
//     winner $80 ("INDICATE TRUE WINNING GLADIATOR", :4693) — the exact opposite polarity.

/** The behaviour every resolved WJSRTB type routes to (AC-1). */
const WAVE_BEHAVIOUR: Readonly<Record<ResolvedWaveType, WaveBehaviour>> = Object.freeze({
  nop: 'noop',
  intro: 'message',
  coop: 'coopBonus',
  gladiator: 'gladiatorBounty',
  egg: 'spawnEggs',
  ptero: 'spawnPteros',
  survival: 'survivalBonus',
})

/**
 * The behaviour a resolved wave type carries (AC-1) — every WJSRTB entry routes to a
 * real behaviour or the cited RTS no-op (WAVRTS, JOUSTRV4.SRC:2586/2593). Pure.
 */
export function waveTypeBehaviour(type: ResolvedWaveType): WaveBehaviour {
  return WAVE_BEHAVIOUR[type]
}

/**
 * Whether a wave spawns its complement AS EGGS — the egg-wave behaviour flowing THROUGH
 * jt2-5's `dispatchWaveType` (WAVEGG, `FDB WAVEGG`, JOUSTRV4.SRC:2590; WAVEGG `LDX #EGG1`,
 * :2737), true iff the wave dispatches to the 'egg' type. The exact shape of jt3-4's
 * `pteroWaveSpawnCount`. Egg does NOT degrade by player-count (only coop/gladiator do), so
 * an egg wave stays an egg wave solo. Pure.
 */
export function eggWaveSpawnsEggs(status: number, players: PlayersAlive): boolean {
  return dispatchWaveType(status, players) === 'egg'
}

/**
 * Arm the PLYG1/PLYG2 guards for a wave type — THE POLARITY (JOUSTRV4.SRC:2634-2635 vs
 * 2703-2705). 'gladiator' → `{ plyg1: -1, plyg2: -1 }` (`LDA #-1` — arm the 1st-encounter
 * award); every other type → `{ plyg1: 0, plyg2: 0 }` ('coop' `CLR`s them; the rest touch
 * no PLYG byte — a cited no-op). Pure.
 */
export function armWaveGuards(type: ResolvedWaveType): WaveGuards {
  if (type === 'gladiator') return { plyg1: GLADIATOR_ARM, plyg2: GLADIATOR_ARM }
  return { plyg1: 0, plyg2: 0 }
}

/**
 * Record a player-vs-player kill by `winner` (id 1 → PLYG1, 2 → PLYG2) — SPDGLA's
 * `INC ,Y` (JOUSTRV4.SRC:4685-4694). The winner's byte increments:
 *   • from co-op's 0 → 1 (`BGT SPDIE2`): a non-zero counter that later VOIDS the team bonus;
 *   • from gladiator's −1 → 0 (`BEQ SPDGLA`): the FIRST kill CLEARs BOTH bytes ("ONLY 1
 *     GLADIATOR IN THE WAVE") and stamps the winner $80 ("INDICATE TRUE WINNING GLADIATOR").
 * A later gladiator kill by the OTHER player only bumps its (already-cleared 0) byte to a
 * non-award positive — the first killer keeps its $80. Pure — the argument is never mutated.
 */
export function recordPartnerKill(guards: WaveGuards, winner: number): WaveGuards {
  const claimKey: keyof WaveGuards = winner === 2 ? 'plyg2' : 'plyg1'
  // SPDGLA `INC ,Y` then `DEC ,Y "(KEEP THE NBR POSITIVE)"` (JOUSTRV4.SRC:4685-4688): a
  // re-kill by the ALREADY-CLAIMED winner nets NO change — the INC past the $80 marker is
  // DECremented straight back, so the "TRUE WINNING GLADIATOR" claim (and its 3,000 bounty)
  // is never lost (the jt4-4 idempotence carry — a naive $80→129 would drop the claim).
  if (guards[claimKey] === GLADIATOR_CLAIMED) return { ...guards }
  const incd = guards[claimKey] + 1
  if (incd === 0) {
    // Gladiator's 1st encounter (was −1): SPDGLA CLRs both bytes ("ONLY 1 GLADIATOR IN THE
    // WAVE") and stamps the winner $80 ("INDICATE TRUE WINNING GLADIATOR", :4691-4694).
    return { plyg1: 0, plyg2: 0, [claimKey]: GLADIATOR_CLAIMED }
  }
  // `BGT SPDIE2`: a co-op counter counts up (non-zero → the team bonus is VOIDED); no award.
  return { ...guards, [claimKey]: incd }
}

/**
 * Award the END-OF-WAVE bounty into the ledgers (JOUSTRV4.SRC:2642-2728, 4691-4698) — each
 * 3,000 via `decodeDvalue('SCRHUN', $30)` (a jt4-1 pass-through, NOT a literal):
 *   • 'coop'      — 3,000 to each ALIVE player IFF no partner-kill (both guards 0); any
 *                   non-zero guard VOIDS the whole team bonus (COOP3, :2642-2646).
 *   • 'survival'  — 3,000 to each ALIVE player who did NOT die this wave (PLYD==0,
 *                   :2674-2693); a survivor who died gets nothing.
 *   • 'gladiator' — 3,000 to the FIRST partner-killer only — the guard the flip left
 *                   claimed ($80, :4691-4698); nobody killed → no bounty (GLAD4, :2726).
 *   • any other   — no bounty.
 * Only the entitled ledgers move; the credit accrues into jt4-1's score/scoreBcd registers
 * (and re-checks the extra-man threshold, as the ROM's SCRLEV runs on every score change).
 * Pure — the argument ledgers are never mutated.
 */
export function awardWaveBounty(
  players: readonly PlayerLedger[],
  type: ResolvedWaveType,
  ctx: WaveEndContext,
): PlayerLedger[] {
  const bonus = decodeDvalue('SCRHUN', BOUNTY_DIGIT)
  const paid = new Set<number>()
  if (type === 'coop') {
    // COOP3 (`LDA PLYG1 / ORA PLYG2 / BEQ`): any non-zero guard voids the WHOLE team bonus.
    const clean = ctx.guards.plyg1 === 0 && ctx.guards.plyg2 === 0
    if (clean) ctx.alive.forEach((alive, i) => alive && paid.add(i))
  } else if (type === 'survival') {
    // WSUSCR: alive AND deathless this wave (the PLYD gate, `LDA PLYD1 / BNE ENDTS`).
    ctx.alive.forEach((alive, i) => alive && !ctx.died[i] && paid.add(i))
  } else if (type === 'gladiator') {
    // SPDGLA: the byte the −1→$80 flip left claimed marks the FIRST partner-killer.
    if (ctx.guards.plyg1 === GLADIATOR_CLAIMED) paid.add(0)
    if (ctx.guards.plyg2 === GLADIATOR_CLAIMED) paid.add(1)
  }
  return players.map((p, i) => {
    if (!paid.has(i)) return { ...p }
    const score = p.score + bonus
    return awardExtraMen({ ...p, score, scoreBcd: scoreToBcd(score) })
  })
}

// ═════════════════════════════════════════════════════════════════════════════
// jt4-5 — THE DEV-OVERLAY READOUT (the epic closer's dev bar)
// ═════════════════════════════════════════════════════════════════════════════
//
// The shell draws a dev-overlay of each player's score + lives and the wave. It reads the
// core registers STRAIGHT off the GameState the shell steps — a PURE projection that cannot
// drift from a shell-side copy (routing≠geometry: pinned by OUTPUT in tests/game-jt4-5.test.ts,
// mutation-checked, not by a routing text-match). The authentic MESSAGE.SRC score display is
// jt5 — this is the dev bar only.

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
 * Project the dev-overlay readout from a GameState — a PURE selector reading each ledger's
 * score + lives and the wave STRAIGHT off the state (no copy, no clock). `players` is in
 * P1, P2 order with 1-based ids. Pure — the argument is untouched.
 */
export function overlayReadout(game: GameState): OverlayReadout {
  return {
    wave: game.wave,
    players: game.players.map((p, i) => ({ player: i + 1, score: p.score, lives: p.lives })),
  }
}
