// src/core/sim.ts
//
// Story cp1-6 (GREEN, Julia) — the sim ASSEMBLY: cp1-3's picture ROM (referenced
// only by the shell atlas), cp1-4's playfield/mushrooms, and cp1-5's player/shot
// become one stepped, deterministic, replayable SimState. The mainloop order is
// the ROM's own (CENTI4.MAC:26/28, tests/sim.test.ts ground truth): MOVE, THEN
// SHOOT — the shot launches from the POST-move gun, not the pre-move one.
//
// core/ is the pure deterministic simulation: no browser surface, no wall clock,
// no ambient randomness — tests/purity.test.ts sweeps this file. The seeded
// @shared/rng cursor carried in SimState is the ONLY entropy.
//
// That cursor now has THREE consumers, so the ordering between them is part of
// the replay contract: playfield seeding at boot (cp1-4), NEWHD's entry-side
// draw (cp2-10), and the spider's side/direction/respawn rolls (cp3-1). Adding
// or reordering a draw shifts every later one, which is why cloneState copies
// the seed word into a distinct object — an aliased rng reference silently
// couples a clone to its original (the arcade-shared cloneState lesson).

import { createRng, nextInt, type Rng } from '@shared/rng'
import { seedPlayfield, stepRestor, RESTOR_START, RESTOR_END, type Playfield } from './playfield'
import { createPlayer, createShot, movePlayer, stepShot, type InputCounts, type Player, type Shot } from './player'
import {
  createCentipede,
  stepCentipede,
  stepExplosions,
  resolveShotHit,
  checkPlayerContact,
  playerContactIndex,
  EXPLOSION_PIC,
  DEAD_BIT,
  CENT_BOTTOM_V,
  NEWD_ARM_PIC_MAX,
  NEWHD_HEAD_PIC,
  NEWHD_SPAWN_V,
  NEWHD_SPAWN_DV,
  NEWHD_SIDE_A_H,
  NEWHD_SIDE_A_DH,
  NEWHD_SIDE_B_H,
  NEWHD_SIDE_B_DH,
  NEWHD_COUNT_INIT,
  NEWHD_COUNT3_STEP,
  NEWHD_COUNT3_FLOOR,
  stepWaveCadence,
  CENTIS_INIT,
  type Segment,
} from './centipede'
import {
  createSpider,
  stepSpider,
  resolveSpiderShotHit,
  stepSpiderExplosion,
  stepSpiderKillTimer,
  SPIDER_EXPLODE_PIC,
  type Spider,
} from './spider'
import {
  createFlea,
  stepFlea,
  resolveFleaShotHit,
  stepFleaExplosion,
  FLEA_EXPLODE_PIC,
  CENTIN_INIT,
  type Flea,
} from './flea'
import { stepScorp, resolveScorpionShotHit } from './scorpion'
import { awardBonus, BONUS_INCREMENT } from './bonus'
import { qualifiesForHighScore, insertHighScore, type HighScoreTable } from '@shared/highscore'
import { stepNameEntry } from '@shared/name-entry'

// ─── Story cp2-5 (GREEN, Julia): the sim ASSEMBLY — death (PLAYEX), the
// RESTOR sweep, and the wave-1 loop, wired into the stepped SimState. Every
// constant below is cited in docs/rom-study/claims/09-centipede-train.json.
export const STARTING_LIVES = 3 // CT-67/68 (factory default *3; DIP range ((OPTNS>>2)&3)+2 ∈ [2,5])
export const DEATH_DELAY = 0x30 // CT-52 (:1802 "STA DELAY" — the death pause length)
export const WAVE_DELAY = 0x40 // CT-62 (:2319 "STA DELAY ;DELAY BEFORE NEXT WAVE")
export const PLAYER_EXPLODE_START = 0x20 // CT-53 (:1804 "STA PLAYP ;CHANGE PICTURE")
export const PLAYER_EXPLODE_ARM = 0x27 // CT-55 (:992 "CMP I,27" — arms RESTOR on this frame)
export const PLAYER_EXPLODE_DONE = 0x28 // CT-54 (:989 "CMP I,28" — the explosion is finished)

// ─── Story cp4-5 (GREEN, Julia): the outer game-loop state machine. The ROM
// runs the whole cabinet on ONE signed flag, MODE: negative == ATTRACT (INIT
// leaves it -1 at power-on; :627 "DEC MODE ;MODE=-1 FOR ATTRACT" drops back to
// it when the last life is spent), non-negative == a live game (:852 "INC MODE
// ;NOW IN PLAY MODE" when START1 begins one). The clone models that split, plus
// the persistent game-over screen the ROM shows for a beat (:624-627), as one
// explicit union — a string union, not a runtime enum (it never crosses a
// module boundary as a value). `gameOver` is kept as a maintained mirror of
// `phase === 'gameover'` so the pre-cp4-5 observable keeps working.
export type GamePhase = 'attract' | 'playing' | 'gameover'

// ─── Story cp4-6 (GREEN, Julia): the high-score WRITE path and its initials.
//
// The ROM ends a game with two routines. UPDATE (:2534 ".SBTTL UPDATE-UPDATE
// HIGH SCORE TABLE") walks the board three bytes per entry (:2567-2579) and
// takes the verdict — ":2574 BCC 30$ ;NEW HIGH SCORE" — then clears UPDINT
// (":2592 STA UPDINT ;STARTING WITH FIRST INITIAL") so GETINT runs. GETINT
// (:1001) collects exactly THREE initials: three INITAL calls (:1052, :1055,
// :1059) gated by ":1074 CMP I,03 / :1075 BCC 55$ ;IF WE ARE NOT DONE".
//
// RADIX: CENTI4.MAC inherits .RADIX 16 from CENDE4, so bare literals are HEX.
// "CMP I,03" is 3 either way, so MAX_INITIALS is radix-safe.
//
// THE ONE LEGIT DIVERGENCE (session Design Deviations): GETINT is a TRACKBALL
// picker in silicon — it scrolls one letter every 8th frame (:1130-1138) and
// commits with FIRE through a 5-frame debounce (:1060-1071). A keyboard clone
// types the letter directly, so this is a UX PORT, not a transcription. The
// buffer arithmetic itself is NOT bespoke: it is the cabinet-wide shared verb
// stepNameEntry (@shared/name-entry), already used by tempest,
// asteroids, star-wars and battlezone. Only the presentation is ours.
//
// The board and the buffer live HERE, in the pure core, because every shared
// helper they use is pure. Only makeHighScoreStorage touches localStorage — a
// purity-guard forbidden global — so it stays in the shell, which owns the
// load at boot and the save when the core hands back a new array.
export const MAX_INITIALS = 3 // GETINT :1074 "CMP I,03" (3 in either radix)

// ─── The entry TIMEOUT, DERIVED — do not read 0xF4 as a frame count ──────────
//
// The entry screen must have an exit: START is refused while the buffer is
// short (:1074), so without a timeout a qualifying player who does not type
// three letters can never leave. The ROM's exit is a countdown, and reading it
// correctly takes one indirection.
//
// FRAME is a 16-bit UP-counter incremented once per frame, and FRAME+1 is its
// HIGH byte — CENIR4.MAC:269-271 "INC FRAME ;UPDATE FRAME COUNTER / BNE 8$ ;IF
// NO OVERFLOW / INC FRAME+1". So FRAME+1 advances once per 256 frames. The
// entry SEEDS FRAME+1 and waits for it to reach zero (GETINT :1105-1106 "LDA
// FRAME+1 / BEQ 52$ ;TIME OUT - BACK TO ATTRACT"), so the wait is
// (0x100 - seed) * 256 frames — NOT `seed` frames.
//
// Two sites seed it, and each carries a comment that independently confirms the
// model (which is why this is a derivation and not a guess):
//
//   UPDATE :2625-2626  "LDA I,0F0 ;1 MINUTE AT 60HZ"    → (0x100-0xF0)*256 = 4096 ≈ 68.4 s
//   GETINT :1101-1102  "LDA I,0F4 ;ABOUT 50 SECONDS"    → (0x100-0xF4)*256 = 3072 ≈ 51.3 s
//
// (at the clone's 15750/263 Hz timebase). Reading 0xF4 as 244 FRAMES would give
// 4.1 s — twelve times too fast, and the player could never finish typing.
const FRAME_HIGH_BYTE_TICK = 0x100 // frames per FRAME+1 tick (CENIR4.MAC:269-271)

/** UPDATE :2625 — the countdown the entry opens with. */
export const ENTRY_TIMEOUT_OPEN_FRAMES = (0x100 - 0xf0) * FRAME_HIGH_BYTE_TICK // 4096

/** GETINT :1101 — the countdown each accepted letter reloads. */
export const ENTRY_TIMEOUT_LETTER_FRAMES = (0x100 - 0xf4) * FRAME_HIGH_BYTE_TICK // 3072

// ── ATTRT (CENTI4.MAC:158 "ATTRACT-MODE GAMEPLAY") — the self-playing demo ──────
// The demo steers the gun on a deterministic H+V sweep, reversing at fixed PLAYH/
// PLAYV compare points (radix 16 via CENDE4) and moving one pixel only on frames
// where FRAME bit 7 is clear. Transcribed from the ROM; cited in claims LOOP-11..19.
/** :189 "CMP I,1C" — reverse the horizontal sweep when PLAYH < 0x1C (LOOP-13). */
export const ATTRACT_H_LOW = 0x1c
/** :192 "CMP I,0E4" — reverse when PLAYH reaches 0xE4 (LOOP-14). */
export const ATTRACT_H_HIGH = 0xe4
/** :202 "CMP I,30" — reverse the vertical sweep when PLAYV reaches 0x30 (LOOP-16). */
export const ATTRACT_V_HIGH = 0x30
/** :205 "CMP I,9" — reverse when PLAYV < 9 (LOOP-17). */
export const ATTRACT_V_LOW = 0x09
/** :182 "AND I,80" — the demo moves only when FRAME bit 7 is clear (LOOP-12). */
export const ATTRACT_MOVE_FRAME_MASK = 0x80
/** LDY I,1 / LDY I,-1 (:188/:191/:201/:204) — one pixel per moving frame. */
export const ATTRACT_STEP = 1
/** PLAYDH/PLAYDV seed. The gun boots at (0x80, PLAYV_MIN): H sits between the two
 *  compare points so it keeps this until a bound; V is below 9 so it flips to +1
 *  on frame 1. +1 heads toward the high compare. */
export const ATTRACT_DIR_INIT = ATTRACT_STEP

/** The game-over initials sub-state — the ROM's UPDFLG/UPDINT pair (:2537-2540,
 *  :2592) collapsed into one object. Non-null ONLY in the `gameover` phase. */
export interface InitialsEntry {
  /** qualifiesForHighScore(board, score), settled ONCE on entry (UPDATE :2574).
   *  Re-deriving it per frame would let a save landing during the entry screen
   *  retroactively disqualify the very score being typed. */
  readonly qualifies: boolean
  readonly initials: string
  readonly confirmed: boolean
  /** Frames left before the entry gives up and drops back to attract
   *  (:1105-1106). Reloaded by every accepted letter (:1101). */
  readonly timeout: number
}

export interface SimState {
  readonly playfield: Playfield
  readonly player: Player
  readonly shot: Shot
  readonly rng: Rng
  readonly frame: number
  readonly score: number
  /** The wave's centipede train (CT-70's MOTION). */
  readonly segs: Segment[]
  readonly lives: number
  readonly wave: number
  /** CT-52/62: the death/wave-clear pause, in frames; 0 == normal play. */
  readonly delay: number
  /** The player-explosion picture (CT-53/54/55); 0 == not dying. */
  readonly playerExplode: number
  /** The RESTOR sweep cursor (a ROM address); RESTOR_END == disarmed. */
  readonly restorMem: number
  /** cp4-5: the game-loop machine state (the ROM's MODE flag + the persistent
   *  game-over screen). `gameOver` below mirrors `phase === 'gameover'`. */
  readonly phase: GamePhase
  readonly gameOver: boolean
  /** cp4-6: the high-score board. The shell loads it at boot and saves it back
   *  whenever the core replaces the array; the core only ever reads it for the
   *  qualify verdict and rebuilds it through the shared insertHighScore. It is
   *  threaded across every restart on purpose — the board outlives a run. */
  readonly highScoreTable: HighScoreTable<'wave'>
  /** cp4-6: the initials screen, open only while `phase === 'gameover'`. */
  readonly entry: InitialsEntry | null
  /** cp4-6: the previous frame's START level, so the button edge-triggers.
   *  InputCounts.start is a HELD boolean (shell/input.ts reports the key for as
   *  long as it is down), and game-over now carries TWO actions on that one
   *  button — confirm the initials, then restart. Without this, a single ~60Hz
   *  press would fire both on consecutive frames and the player would never see
   *  the entry commit. The ROM debounces the same button explicitly:
   *  :1067-1071 "ROL SDBNCE / LDA SDBNCE / AND I,1F / CMP I,18 / BNE 60$
   *  ;2 FRAMES OFF 3 FRAMES ON". */
  readonly startPrev: boolean
  /** CT-23/89/90: the factory-armed flag — set when a plain head reaches the
   *  bottom row, cleared on every CENTPC re-lay (death respawn or wave clear). */
  readonly newd: boolean
  /** CT-78/88: NEWHD's per-frame down-counter; a spawn is attempted at 0. */
  readonly count1: number
  /** CT-87/88: the ramping spawn interval (persists across lives/waves;
   *  only INIT reseeds it). */
  readonly count3: number
  /** cp3-1: the spider (motion-object slot 13). NON-nullable on purpose: INIT
   *  calls BUGOFF at :1199, so slot 13 always holds an object. "No spider on
   *  screen" is a PICTURE (SPIDER_OFF_PIC, :277-278), not an absent object —
   *  reusing `null` for it would invent a state the hardware does not have and
   *  push a dead guard into every consumer. */
  readonly spider: Spider
  /** cp3-2: the flea (motion-object slot 12). NON-nullable for the same reason
   *  the spider is: INIT calls ANTPC at :1200, so the slot always holds an
   *  object, and "no flea on screen" is a POSITION (parked at 0xF8), not an
   *  absent one. */
  readonly flea: Flea
  /** CENTIN (:1167-1169) — the wave's centipede length, and the gate on the
   *  flea's spawn (:63-66). cp3-4 wires CENTPC's per-wave decrement
   *  (:464-470), so this now genuinely falls to 11 on wave 2 and the flea
   *  becomes reachable in ordinary play. It does NOT yet shorten the train:
   *  createCentipede() still lays a full NCENT — see stepWaveCadence's scope
   *  fence, which cp4 closes. */
  readonly centin: number
  /** cp4-4: BONUSM:BONUSL (:855-859) — the next bonus-life threshold, in points.
   *  INIT seeds it from the same BONUS1 value it uses as the increment, so the
   *  first bonus lands AT the increment; every crossing advances it (:1975-1981),
   *  including one the six-life ceiling refuses. */
  readonly bonusLevel: number
  /** CENTIS (:1174-1176) — the wave's centipede SPEED, and the counter that
   *  paces CENTIN's decrement (CT-92..CT-95). SHOOT's wave-clear tail bumps it
   *  (:2317); the next CENTPC reads and resets it. Like `centin` it is not yet
   *  consumed as an actual train speed — cp4's story. */
  readonly centis: number
  /** cp4-7: the ATTRT demo gun's sweep direction (PLAYDH/PLAYDV, :196/:209). ±1,
   *  reversed at the ROM's PLAYH/PLAYV compare points. Meaningful only in attract;
   *  carried across every state so the sweep survives the demo's immortal loop. */
  readonly attractDirH: number
  readonly attractDirV: number
}

/** Seed the playfield (CENTI4.MAC:1220 "PUT UP OBSTACLES") through a fresh
 *  seeded rng, boot the gun at its rest position, glue the shot to it, and
 *  lay the wave-1 train (CENTPC) with full lives (CT-67/68). */
export function createSim(seed: number): SimState {
  const rng = createRng(seed)
  const playfield = seedPlayfield(rng)
  const player = createPlayer()
  const shot = createShot(player)
  return {
    playfield,
    player,
    shot,
    rng,
    frame: 0,
    score: 0,
    segs: createCentipede(CENTIS_INIT, 0), // CT-10: the boot train marches at CENTIS_INIT, frame 0
    lives: STARTING_LIVES,
    wave: 1,
    delay: 0,
    playerExplode: 0,
    restorMem: RESTOR_END,
    // A started game: MODE non-negative (:852 "INC MODE ;NOW IN PLAY MODE").
    // createSim is the STARTED-game constructor — createAttract enters attract.
    phase: 'playing',
    gameOver: false,
    // cp4-6: the core boots with NO board — the shell injects the loaded one
    // (it is the only side that may touch localStorage). A restart threads the
    // live board through explicitly; see stepSim.
    highScoreTable: [],
    entry: null,
    startPrev: false,
    newd: false, // CT-90: disarmed until a head reaches the bottom
    count1: NEWHD_COUNT_INIT, // CT-88
    count3: NEWHD_COUNT_INIT, // CT-88
    spider: createSpider(rng, 0), // INIT :1199 "JSR BUGOFF ;INITIALIZE BUG"
    flea: createFlea(rng, 0), // INIT :1200 "JSR ANTPC ;ANT" — BUGOFF then ANTPC
    // INIT :854-859 "JSR BONUS1 / STA BONUSL / … / LDA Y,BONUSV+1 ;SET INITIAL
    // BONUS VALUES" — the first threshold IS the increment.
    bonusLevel: BONUS_INCREMENT,
    centin: CENTIN_INIT, // INIT :1167-1169 "LDA I,12. / STA CENTIN" — DECIMAL
    centis: CENTIS_INIT, // INIT :1174-1176 "LDA I,02 ;FAST TO START WITH"
    attractDirH: ATTRACT_DIR_INIT, // cp4-7: PLAYDH/PLAYDV sweep seeds
    attractDirV: ATTRACT_DIR_INIT,
  }
}

/** The attract-mode boot: the SAME seeded world INIT lays at power-on (CENTPC /
 *  BUGOFF / ANTPC / the mushroom seed, :1194-1230), but with MODE still at its
 *  power-on -1 — the machine sits in `attract`, awaiting START1. The
 *  self-playing ATTRT demo (:158) and the "GAME OVER" banner are later stories
 *  (cp4-7); for now attract simply holds until a start reseeds a live game. */
export function createAttract(seed: number): SimState {
  return { ...createSim(seed), phase: 'attract' }
}

/**
 * NEWHD (CENTI4.MAC:1643-1687): while the factory is armed and the player is
 * not in the death/wave pause, count down COUNT1; at 0, attempt a spawn into
 * the first dead slot found scanning high->low (CT-79). A successful spawn
 * stamps the ROM coords (CT-80/81/82), picks one of two mirror entry sides
 * off a SINGLE seeded rng draw (CT-83/84/85), ramps COUNT3 (CT-87), and
 * reloads COUNT1 from it. No dead slot -> no spawn, no rng draw, COUNT1 left
 * at 0 to retry next frame.
 */
function stepNewhd(state: SimState): SimState {
  if (!state.newd) return state

  if (state.count1 > 0) {
    return { ...state, count1: state.count1 - 1 } // CT-78
  }

  let slot = -1
  for (let i = state.segs.length - 1; i >= 0; i--) {
    if ((state.segs[i].pic & DEAD_BIT) !== 0) {
      slot = i
      break
    }
  }
  if (slot === -1) return state // CT-79 cap: every slot live, no spawn

  const side = nextInt(state.rng, 2) // CT-84: the sole entropy this routine consumes
  const h = side === 0 ? NEWHD_SIDE_A_H : NEWHD_SIDE_B_H
  const dh = side === 0 ? NEWHD_SIDE_A_DH : NEWHD_SIDE_B_DH

  const segs = state.segs.map((seg, i) =>
    i === slot ? { h, v: NEWHD_SPAWN_V, dh, dv: NEWHD_SPAWN_DV, pic: NEWHD_HEAD_PIC } : seg,
  )
  const count3 = state.count3 >= NEWHD_COUNT3_FLOOR ? state.count3 - NEWHD_COUNT3_STEP : state.count3 // CT-87
  return { ...state, segs, count1: count3, count3 }
}

/** One normal video frame (CENTI4.MAC:30-39's order, CT-70): MOVE, SHOOT
 *  (only against a still-live shot — the mushroom took priority in stepShot
 *  itself), MOTION, EXPLOD, then PLAY's player-collision check and the
 *  wave-clear test. */
function stepPlayingFrame(state: SimState, input: InputCounts): SimState {
  const player = movePlayer(state.player, input, state.playfield)
  const stepped = stepShot(state.shot, player, state.playfield, input.fire)
  let shot = stepped.shot
  let score = state.score + stepped.scored

  // cp2-15: MOTION (:30) and EXPLOD (:31) run before every collision this
  // frame — SHOOT (:34) meets the segments where they just marched to, and a
  // slot killed this frame keeps its first explosion picture for a full frame.
  // The segment shot resolution itself now lives BELOW, at the tail of SHOOT's
  // descending scan (CT-32), after PLAY and after slots 13 and 12.
  let segs = stepCentipede(state.segs, state.playfield) // CT-48/65 ±1 probe fix

  // cp2-16: MOTION's own PLAY (:1449) fires per segment DURING the march —
  // before MOVE (:32) ever runs, so it reads the PRE-move gun. A hit reaches
  // PLAYEX, which stamps the killing slot's picture 0xFF (:1805-1806); EXPLOD
  // (:31) then counts it down the SAME frame, so a MOTION kill is the one
  // stamp that ends its frame at 0xFE. On a simultaneous double contact the
  // highest slot takes the stamp — MOTION walks NCENT-1 down to 0 (:1284).
  const motionKill = playerContactIndex(segs, state.player)
  if (motionKill !== -1) {
    segs = segs.map((s, i) => (i === motionKill ? { ...s, pic: EXPLOSION_PIC } : s))
  }

  segs = stepExplosions(segs)

  const frame = state.frame + 1

  // cp3-1: the spider takes its frame in the ROM's mainloop position — BUGMV
  // (:33) runs AFTER MOTION (:30), so OVRLAP reads this frame's segments, and
  // BEFORE SHOOT (:34), so the shot meets the spider where it just moved to.
  let spider = state.spider
  {
    // EXPLOD (:963 "LDX I,13.") walks slot 13 as well as the segments, and it
    // is what puts the points sprite up once the explosion finishes. It runs at
    // :31, BEFORE both BUGMV and SHOOT, so a spider killed this frame keeps its
    // first explosion picture for a full frame.
    spider = stepSpiderExplosion(spider, true)
    // The step's `ate` and `scored` are deliberately unused, not overlooked:
    // BUGMV calls MUSHDC, never SCORNG (:365-367), so eating awards nothing and
    // `scored` is provably always 0, while the eaten cell is already written
    // through the shared Playfield. If a later story gives either field meaning
    // — an audio cue on a crunch, or a fidelity correction that does score —
    // this is the call site that has to start reading them.
    // OVRLAP (:1749) scans slot 12 as well, so BUGMV is handed the flea. It is
    // the PREVIOUS frame's flea by construction: BUGMV is :33 and ANTMV :37, so
    // on real hardware the spider always reads the position ANTMV left last
    // frame — which is exactly `state.flea` here.
    //
    // cp2-17 (the death-frame ruling — FREEZE): BUGMV's entry gate (:289-291
    // "LDA PLAYP / AND I,0AF / BEQ 5$ ;BUG MOVE IF PLAYER IS ALIVE") RTSes
    // without moving the spider once the gun is dead. BUGMV is :33, so the only
    // kill that can precede it is MOTION's (:30) — freeze the move whenever
    // `motionKill` fired this frame. stepSpiderExplosion above is EXPLOD (:31,
    // before BUGMV) and stays ungated.
    if (motionKill === -1) {
      spider = stepSpider(spider, state.playfield, segs, {
        frame,
        score,
        rng: state.rng,
        flea: state.flea,
      }).spider
    }
  }

  // cp2-15/cp2-16: PLAY resolves per CALLER, at the caller's own mainloop
  // slot. MOTION's ran above (:30 — the 0xFE stamp); BUGMV's runs here (:33,
  // ":416-417 LDX I,13. / JSR PLAY" against the spider's POST-move position,
  // CT-103) — both before SHOOT (:34). Slot 12's does NOT: its PLAY lives
  // inside ANTMV (:37, AFTER SHOOT) and reads the flea's POST-move position,
  // below. The pre-cp2-16 code read `state.flea` here instead, mirroring
  // OVRLAP's genuinely pre-step view of slot 12 (BUGMV reading a neighbour
  // slot it hasn't stepped) — but ANTMV's own PLAY runs after ANTMV's own
  // move (:101-103, then :107-108), and the cp2-16 probe proved the two are
  // not equivalent: SHOOT resolves between the two moments, and that changes
  // who lives.
  //
  // On a hit, PLAYEX stamps the killer 0xFF (:1805-1806) and blanks the shot
  // (:1807-1808 "LDA I,28 / STA SHOTP"), so the SHOOT scan below no-ops
  // naturally and no points score on a death frame; a stamped slot is equally
  // skipped by the scan's own alive test (:2177-2178, CT-104). A dead gun
  // reaches no further PLAY — both remaining callers gate on PLAYP (:289-291,
  // :50-52) — hence the playerHit guards here and below. cp2-17 ruled the ROM's
  // stepper freezes IN (FREEZE, not #35's run-every-frame): BUGMV's move (the
  // spider, above) is gated on `motionKill === -1` and ANTMV's move (the flea,
  // below) on `!playerHit`, each matching its entry gate. SCORP's own move stays
  // ungated — its PLAYP gate is unverified and out of scope (Delivery Finding).
  let playerHit = motionKill !== -1
  if (!playerHit && checkPlayerContact([], player, spider)) {
    spider = { ...spider, pic: SPIDER_EXPLODE_PIC } // :1805-1806 with X=13
    playerHit = true
  }
  if (playerHit) shot = { ...shot, live: false } // :1807-1808

  // cp2-15: SHOOT (:34) is ONE scan of every motion-object slot, entered at
  // ":2171 11$: LDX I,13." and walked DOWN by ":2292-2294 16$: DEX / BMI 30$ /
  // JMP 115$" (CT-32). The first slot inside both windows is killed and the
  // scan exits, so the resolution order here IS the priority order: slot 13
  // (spider), then slot 12 (scorpion/flea), then the segments 11..0 — each
  // resolver consumes the shot on a hit and the next sees it spent.
  {
    if (shot.live) {
      const spiderHit = resolveSpiderShotHit(shot, spider, player)
      spider = spiderHit.spider
      shot = spiderHit.shot
      score += spiderHit.scored
    }
    // SHOOT's tail (:2304-2314) runs every frame regardless of the shot: it is
    // the ONLY thing that brings a killed spider back, because BUGMV freezes
    // while the points sprite is up and stops ticking COUNT2.
    spider = stepSpiderKillTimer(spider, state.rng, score)
  }

  // cp3-2/cp3-3: motion-object slot 12, shared by the flea AND the scorpion. Its
  // mainloop position is the OPPOSITE of the spider's — BUGMV is :33, BEFORE
  // SHOOT (:34), but SCORP is :36 and ANTMV :37, both AFTER it. So a shot meets
  // the spider where it just moved TO and slot 12 where it moved FROM, and the
  // shot resolutions must therefore run BEFORE stepScorp/stepFlea. Within the
  // slot the ROM order is SCORP (:36) then ANTMV (:37), so the scorpion steps
  // first; a scorpion it starts or moves freezes ANTMV (which returns for any
  // pic >= 0x20), and a parked flea it leaves alone falls through to ANTMV.
  let flea = state.flea
  {
    // EXPLOD (:31) runs before SHOOT, so a creature killed THIS frame keeps its
    // first explosion picture for a full frame — the same treatment cp3-1 gives
    // the spider. This call also carries SCORP's revival (:2072-2075), the only
    // path back from a spent explosion, for BOTH the flea and the scorpion.
    flea = stepFleaExplosion(flea, state.rng, score)
    // SHOOT (:34) — a scorpion (pic 0x30-0x33) scores 1000 in one hit, a flea
    // takes two; each resolver declines the other's band, and a spent shot the
    // second sees as already gone.
    if (shot.live) {
      const scorpHit = resolveScorpionShotHit(shot, flea)
      flea = scorpHit.slot
      shot = scorpHit.shot
      score += scorpHit.scored
    }
    if (shot.live) {
      const fleaHit = resolveFleaShotHit(shot, flea)
      flea = fleaHit.flea
      shot = fleaHit.shot
      score += fleaHit.scored
    }
    // cp2-15: the segments are the scan's TAIL (slots 11..0, :2211-2212 "CPX
    // I,12. / BCC 142$") — a shot the spider or slot 12 already took never
    // reaches them. Mushroom priority is unchanged: stepShot consumed the shot
    // on a mushroom before any of this ran.
    if (shot.live) {
      const hit = resolveShotHit(shot, segs, state.playfield)
      segs = hit.segs
      shot = hit.shot
      score += hit.scored
    }
    // SCORP (:36). Its `poisoned` flag is deliberately unused here: the poisoned
    // cell is already written through the shared Playfield, and poisoning awards
    // no score (:2087-2096 calls OBSTAC only). stepScorp draws NO rng unless it
    // reaches its spawn roll (parked slot, FRAME low byte 0, CENTIN < 11), so it
    // does not shift the replay cursor in ordinary play.
    flea = stepScorp(flea, state.playfield, {
      frame,
      score,
      rng: state.rng,
      centin: state.centin,
    }).slot
    // ANTMV (:37). The step's `seeded` flag is deliberately unused here: the
    // mushroom it reports is already written through the shared Playfield, and
    // seeding awards no score (:116-122 calls OBSTAC/MUSHER, never SCORNG). A
    // later story wanting an audio cue on the stamp reads it here.
    //
    // cp2-17 (the death-frame ruling — FREEZE): ANTMV's entry gate (:50-52 "LDA
    // PLAYP / AND I,0AF / BNE 2$ ;DON'T MOVE IF PLAYER IS DEAD") RTSes without
    // moving the flea once the gun is dead. ANTMV is :37 — after MOTION (:30)
    // and BUGMV (:33) — so freeze the move whenever the player has already died
    // this frame (`playerHit`). SCORP (:36) is a separate routine whose own gate
    // is unverified and out of scope (Delivery Finding); stepScorp is a no-op on
    // a live flea, so it stays ungated.
    if (!playerHit) {
      flea = stepFlea(flea, state.playfield, {
        frame,
        score,
        rng: state.rng,
        centin: state.centin,
      }).flea
    }
    // cp2-16: ANTMV's own PLAY (:107-108 "LDX I,12. / JSR PLAY") — the ONE
    // player check that runs AFTER SHOOT, against the flea's POST-move
    // position, and only for a still-live slot (:53-56 "CMP I,20 / BCC 4$" —
    // checkPlayerContact's flea leg carries that same picture gate): a flea
    // the scan just exploded never reaches it. A kill here stamps slot 12 —
    // X is still 12 when PLAYEX runs (:1805-1806) — so the flea that takes
    // the player dies WITH him, holding its full 0xFF to the frame's end
    // (EXPLOD already ran at :31).
    if (!playerHit && checkPlayerContact([], player, null, flea)) {
      flea = { ...flea, pic: FLEA_EXPLODE_PIC } // :1805-1806 with X=12
      playerHit = true
      shot = { ...shot, live: false } // :1807-1808
    }
  }

  // SCORNG's tail (:1967-1998) — the bonus-life test, run once on the frame's
  // FINAL score. The ROM runs it per scoring EVENT; a frame can hold several
  // (a segment and the spider can both die to one shot's frame), so this is a
  // deliberate funnel. It is behaviourally identical: the biggest frame the game
  // can score is far below the 10,000-point increment, so no frame can cross two
  // thresholds, and one test on the frame's total sees exactly the crossing the
  // per-event tests would. See the session's Design Deviations.
  const bonus = awardBonus({ score, lives: state.lives, bonusLevel: state.bonusLevel })

  // CT-23/89: a live plain head (pic < 0x10) reaching the bottom row arms
  // the factory for the rest of the wave. Mirrors MOTION, which runs this
  // arm check unconditionally on every playing frame regardless of what
  // PLAY/the wave-clear test decide afterward.
  const newd = state.newd || segs.some((seg) => seg.pic < NEWD_ARM_PIC_MAX && seg.v <= CENT_BOTTOM_V)

  // PLAY is ONE routine: every caller's box lives inside checkPlayerContact /
  // playerContactIndex, and every kill funnels to this single branch — the
  // stamps landed at each caller's own site above (MOTION, BUGMV, ANTMV), but
  // no death builds its transition by a copy of it. This branch only
  // constructs the PLAYEX state, at the same tail position the pre-reorder
  // frame built it.
  if (playerHit) {
    // PLAYEX (CT-52/53): arm the death pause + the player-explosion animation.
    return {
      ...state,
      player,
      shot,
      segs,
      spider,
      flea,
      frame,
      score,
      lives: bonus.lives,
      bonusLevel: bonus.bonusLevel,
      newd,
      delay: DEATH_DELAY,
      playerExplode: PLAYER_EXPLODE_START,
    }
  }

  if (segs.every((seg) => (seg.pic & DEAD_BIT) !== 0)) {
    // CT-62: DEAD==0 — every segment killed. Arm the between-wave pause
    // (the same DELAY/RESTOR machinery, distinguished from death by
    // playerExplode staying 0 through the pause). The wave-clear test runs
    // BEFORE the factory below (Delivery Finding #1) — otherwise a due spawn
    // would backfill the just-vacated slot and the wave could never close.
    //
    // cp3-4 / CT-96: this is SHOOT's 50$ (:2317-2319 "INC X,CENTIS-1 ;FASTER /
    // LDA I,40 / STA DELAY"), where the CENTIS bump and WAVE_DELAY are one
    // event — WAVE_DELAY is already cited from :2319, so the increment belongs
    // on exactly this return and nowhere else. The DECREMENT it eventually
    // causes is CENTPC's, and lands on the re-lay in stepDeathFrame.
    return {
      ...state,
      player,
      shot,
      segs,
      spider,
      flea,
      frame,
      score,
      lives: bonus.lives,
      bonusLevel: bonus.bonusLevel,
      newd,
      delay: WAVE_DELAY,
      centis: state.centis + 1,
    }
  }

  // A fully-normal frame (not a death frame, not the clearing frame): the
  // factory may spawn.
  const factory = stepNewhd({ ...state, segs, newd })
  return {
    ...state,
    player,
    shot,
    segs: factory.segs,
    spider,
    flea,
    frame,
    score,
    lives: bonus.lives,
    bonusLevel: bonus.bonusLevel,
    newd: factory.newd,
    count1: factory.count1,
    count3: factory.count3,
  }
}

/** One death/wave-clear-pause frame (delay>0): animate the player explosion
 *  every 4 frames (CT-54), arm+sweep RESTOR once it reaches its last frame
 *  (CT-55/56/58/59/60/61), and HOLD the DELAY countdown until the sweep
 *  disarms (CT-64) before respawning or re-entering the wave (CT-65/66). */
function stepDeathFrame(state: SimState): SimState {
  const frame = state.frame + 1

  let playerExplode = state.playerExplode
  let restorMem = state.restorMem
  if (playerExplode > 0 && playerExplode < PLAYER_EXPLODE_DONE && frame % 4 === 0) {
    playerExplode += 1 // CT-54
    if (playerExplode === PLAYER_EXPLODE_ARM) restorMem = RESTOR_START // CT-55
  }

  const restored = stepRestor(state.playfield, restorMem, frame)
  restorMem = restored.mem
  const score = state.score + restored.scored

  // The RESTOR sweep's repairs are SCORNG events too (:1850-1857 pays 5 a cell),
  // so the bonus test lives on the score funnel, not only in the play frame — a
  // long sweep can carry the player across a threshold mid-death.
  const bonus = awardBonus({ score, lives: state.lives, bonusLevel: state.bonusLevel })

  let delay = state.delay
  if (restorMem === RESTOR_END) delay -= 1 // CT-64: hold while the sweep is armed

  if (delay > 0) {
    return {
      ...state,
      frame,
      score,
      lives: bonus.lives,
      bonusLevel: bonus.bonusLevel,
      delay,
      playerExplode,
      restorMem,
    }
  }

  const dying = playerExplode > 0
  if (dying) {
    // CT-65 — the death spends one of the lives the bonus test just settled: a
    // sweep that bought a life back does so BEFORE this frame's death takes one.
    // cp4-7: the ATTRT demo is immortal — the ROM skips the life check in attract
    // (:615 "IF IN ATTRACT DO NOT CHECK LIVES", claims LOOP-6), so a demo death
    // spends no life and never games over; it respawns straight back into attract.
    const inAttract = state.phase === 'attract'
    const lives = inAttract ? state.lives : bonus.lives - 1
    if (!inAttract && lives <= 0) {
      // CT-66: game over — no respawn. The ROM's :624-627 "LDA LIVES / ORA
      // LIVES+1 / BNE ;IF GAME NOT OVER" fell through (both zero), so it drops
      // to attract via ":627 DEC MODE". The clone parks in a persistent
      // `gameover` phase that awaits a restart (cp4-6 saves the score here,
      // cp4-7 times it out to attract). `gameOver` stays the mirror.
      return {
        ...state,
        frame,
        score,
        delay: 0,
        playerExplode: 0,
        restorMem: RESTOR_END,
        lives,
        bonusLevel: bonus.bonusLevel,
        phase: 'gameover',
        gameOver: true,
        // cp4-6 — the clone's UPDATE (:2534) moment: take the verdict against
        // the board as it stands NOW and open the entry. An entry object is
        // opened either way so the screen can report the outcome; `qualifies`
        // false simply means there is nothing to type.
        entry: {
          qualifies: qualifiesForHighScore(state.highScoreTable, score),
          initials: '',
          confirmed: false,
          // UPDATE arms the timeout as it opens the entry (:2625-2626).
          timeout: ENTRY_TIMEOUT_OPEN_FRAMES,
        },
      }
    }
    const player = createPlayer()
    const shot = createShot(player)
    return {
      playfield: state.playfield,
      player,
      shot,
      rng: state.rng,
      frame,
      score,
      lives,
      bonusLevel: bonus.bonusLevel,
      wave: state.wave,
      delay: 0,
      playerExplode: 0,
      restorMem: RESTOR_END,
      // cp4-7: an attract death respawns back into attract (the demo loops); a
      // real death stays in play. `gameOver` stays false either way.
      phase: inAttract ? 'attract' : 'playing',
      gameOver: false,
      highScoreTable: state.highScoreTable, // cp4-6: the board is untouched by a death
      entry: null,
      startPrev: state.startPrev,
      newd: false, // CT-90: CENTPC clears NEWD on every re-lay
      count1: state.count1, // no reload on a single-player respawn (CT-91 is the 2-player/cocktail swap path)
      count3: state.count3,
      // :641/:732 — the death/respawn paths re-run BUGOFF, so the new life
      // starts with the spider parked off-screen rather than mid-walk.
      spider: createSpider(state.rng, score),
      // :733 — and ANTPC immediately after it, so a flea caught mid-fall when
      // the player died does not carry into the new life.
      flea: createFlea(state.rng, score),
      // CT-65 CENTPC — a death leaves CENTIS/CENTIN unchanged (:459-460 gates the
      // cadence on all-dead; a death re-lays with segments still alive). cp4-2:
      // once CENTIN < NCENT this draws loose-head entropy (:527-548), so `segs`
      // MUST sit BELOW `spider`/`flea` in this literal — JS evaluates in source
      // order, and the ROM's death flow is BUGOFF (:641/732) then ANTPC (:733)
      // then CENTPC. Reordering it above them would steal their RNGEN bytes.
      segs: createCentipede(state.centis, frame, state.centin, state.rng),
      centin: state.centin,
      centis: state.centis,
      attractDirH: state.attractDirH, // cp4-7: carry the demo sweep through respawn
      attractDirV: state.attractDirV,
    }
  }

  // A wave clear (not a death): the gun is untouched, only the wave advances.
  //
  // The spider is deliberately NOT re-parked here, and the ROM is explicit about
  // it. When DELAY expires, CHKEND tests the gun (:608-610 "LDA PLAYP / AND
  // I,0AF / BNE 50$"): a LIVE gun — the wave-clear case — falls through to
  // ":611 45$: JMP 90$", and 90$ (:734) is CENTPC alone. Only the death path
  // reaches ":732 85$: JSR BUGOFF" on its way there. So a spider mid-walk,
  // mid-explosion or mid-points-display carries straight into the next wave,
  // exactly as it does on the original hardware.
  // cp3-4: the wave-clear re-lay IS the all-dead CENTPC, so the CENTIN/CENTIS
  // cadence runs here — and only here. This is the link that finally lets the
  // flea into the game: CENTIN reaches 11 on wave 2 and ANTMV stops refusing.
  const cadence = stepWaveCadence(state.centin, state.centis, score) // CT-92..CT-95

  return {
    ...state,
    frame,
    score,
    lives: bonus.lives,
    bonusLevel: bonus.bonusLevel,
    // CT-62 re-lay — marches at the cadence CENTIS (CT-10). cp4-2: also lays the
    // fragmented train from the cadence CENTIN, drawing loose-head entropy from
    // state.rng (:527-548). This branch has no other rng consumer (spider/flea
    // carry over via ...state), so ordering is a non-issue here.
    segs: createCentipede(cadence.centis, frame, cadence.centin, state.rng),
    wave: state.wave + 1,
    delay: 0,
    playerExplode: 0,
    restorMem: RESTOR_END,
    newd: false, // CT-90: CENTPC clears NEWD on every re-lay
    centin: cadence.centin,
    centis: cadence.centis,
  }
}

/** One video frame. The game-loop machine gates it: attract and game-over both
 *  sit and wait for START1 (the ROM's CHKST reads it at :833-836 "LDA START1 /
 *  LSR / BCS ;IF 1 PLAYER GAME NOT STARTED"; a press does ":852 INC MODE ;NOW
 *  IN PLAY MODE" after INIT reseeds). A start reseeds a fresh live game; with no
 *  start the phase HOLDS. In `playing`, the death/wave pause takes over whenever
 *  delay>0 (CT-26 — MOTION and the rest of normal play freeze during it),
 *  otherwise the ordinary MOVE/SHOOT/MOTION/EXPLOD/PLAY frame runs. */
export function stepSim(state: SimState, input: InputCounts): SimState {
  // cp4-6: START edge-triggers. `input.start` is a HELD level (shell/input.ts
  // reports the key while it is down), and game-over hangs TWO actions off it —
  // confirm the initials, then restart — so acting on the level would run both
  // on consecutive frames. Only the rising edge counts; the ROM guards the same
  // button with SDBNCE (:1067-1071 ";2 FRAMES OFF 3 FRAMES ON").
  //
  // REWORK (Reviewer round 1, HIGH): the level is recorded HERE, for EVERY
  // phase, and not inside the attract/game-over branch. It used to be updated
  // only in that branch, which meant the `startPrev: true` stored by the press
  // that STARTS a game was never refreshed while the game ran — nothing in
  // `playing` touches it, and `stepDeathFrame` does not even receive `input`.
  // The flag stayed true for the whole run, so the first press at the NEXT
  // game-over computed `held && !startPrev` = false and was swallowed: the
  // initials did not commit and a non-qualifying run did not restart. Keeping
  // the invariant at one exit is what makes it hold for every branch below.
  const held = input.start === true
  const next = stepPhase(state, input, held && !state.startPrev)
  return next.startPrev === held ? next : { ...next, startPrev: held }
}

function stepPhase(state: SimState, input: InputCounts, pressed: boolean): SimState {
  if (state.phase === 'attract' || state.phase === 'gameover') {
    if (!pressed) {
      // cp4-7: attract self-plays the ATTRT demo; game-over counts down its entry.
      return state.phase === 'attract' ? stepAttractDemo(state) : stepEntryTimeout(state)
    }

    // A qualifying, unconfirmed entry OWNS the press: it commits the initials
    // (the clone's COPYHS, :1117) and holds the screen. Only a later press
    // restarts — so the player sees the row land instead of the board being
    // swept away by the same keystroke. An incomplete buffer just waits: the
    // ROM equally refuses to leave until all three slots are filled (:1074).
    const entry = state.entry
    if (entry !== null && entry.qualifies && !entry.confirmed) {
      if (entry.initials.length !== MAX_INITIALS) return state
      return {
        ...state,
        entry: { ...entry, confirmed: true },
        // The core builds the row WITHOUT a date: reading a wall clock here
        // would trip the purity guard, and `date` is optional by design.
        highScoreTable: insertHighScore(state.highScoreTable, {
          name: entry.initials,
          score: state.score,
          wave: state.wave,
        }),
      }
    }

    // START1 → INIT reseeds a fresh, deterministic game (INIT :1162). The seed
    // is drawn from the carried seeded rng, never a wall clock, so the reseed
    // stays pure and replayable (the ROM seeds mushrooms from the RNGEN POKEY,
    // :1223-1230 — hardware entropy we substitute deterministically here).
    // The BOARD is threaded across the reseed: it outlives every run, and
    // createSim deliberately builds an empty one.
    return {
      ...createSim(state.rng.seed),
      highScoreTable: state.highScoreTable,
    }
  }
  if (state.delay > 0) return stepDeathFrame(state)
  return stepPlayingFrame(state, input)
}

/** cp4-7 — one frame of the self-playing ATTRT demo (CENTI4.MAC:158). The gun
 *  sweeps deterministically in H and V, reversing at the ROM's compare points
 *  (:188-196 horizontal, :200-209 vertical) and stepping one pixel only on frames
 *  where FRAME bit 7 is clear (:182-183). It holds fire so RSHOT1 keeps a shot in
 *  the air (:212), then runs an ordinary sim frame with the gun already positioned
 *  (dh/dv = 0). A collision arms the normal death pause; because attract skips the
 *  life check (:615, LOOP-6) stepDeathFrame respawns it back into attract, so the
 *  demo never ends — it just loops. Pure: no rng or wall clock in the steering. */
function stepAttractDemo(state: SimState): SimState {
  // A death/wave pause animates like any other; stepDeathFrame keeps the phase.
  if (state.delay > 0) return stepDeathFrame(state)

  let h = state.player.h
  let v = state.player.v
  let dirH = state.attractDirH
  let dirV = state.attractDirV

  // :182-183 — the demo moves only when FRAME bit 7 is clear.
  if ((state.frame & ATTRACT_MOVE_FRAME_MASK) === 0) {
    // :188-196 — reverse H at the two compare points, else keep PLAYDH.
    if (h < ATTRACT_H_LOW) dirH = ATTRACT_STEP
    else if (h >= ATTRACT_H_HIGH) dirH = -ATTRACT_STEP
    // :200-209 — the same for the vertical sweep (PLAYDV).
    if (v < ATTRACT_V_LOW) dirV = ATTRACT_STEP
    else if (v >= ATTRACT_V_HIGH) dirV = -ATTRACT_STEP
    h += dirH
    v += dirV
  }

  const steered: SimState = {
    ...state,
    player: { ...state.player, h, v },
    attractDirH: dirH,
    attractDirV: dirV,
  }
  // Hold fire (RSHOT1, :212). dh/dv are 0 — the gun is already positioned above,
  // so movePlayer keeps it there and the shot launches from the swept spot.
  return stepPlayingFrame(steered, { dh: 0, dv: 0, fire: true })
}

/** cp4-6 — run the initials screen's countdown for one frame.
 *
 *  On expiry the entry ENDS and the machine drops back to attract, which is
 *  what the ROM's own comment says happens (:1106 ";TIME OUT - BACK TO
 *  ATTRACT"). The row is still COMMITTED with whatever was typed: UPDATE writes
 *  the score onto the board BEFORE any initial is collected (:2619-2624 "LDA
 *  X,SCORE2 / STA Y,HSCORE+2 / … ;MOVE HIGH SCORES IN") and only then arms the
 *  timeout, so running out of time costs the player their NAME, never their
 *  PLACE. Discarding the run here would invent a punishment the cabinet has not
 *  got. This is deliberately unlike the START path, which still refuses a short
 *  buffer (:1074) — they are different events, not the same one. */
function stepEntryTimeout(state: SimState): SimState {
  const entry = state.entry
  if (state.phase !== 'gameover' || entry === null || !entry.qualifies || entry.confirmed) return state
  const timeout = entry.timeout - 1
  if (timeout > 0) return { ...state, entry: { ...entry, timeout } }
  return {
    ...state,
    phase: 'attract',
    gameOver: false, // the mirror of `phase === 'gameover'` must stay honest
    entry: null,
    highScoreTable: insertHighScore(state.highScoreTable, {
      name: entry.initials,
      score: state.score,
      wave: state.wave,
    }),
  }
}

/** cp4-6 — one initials keydown on a qualifying game-over screen. A PURE core
 *  event the shell calls per keydown: initials are edge events, not per-frame
 *  held state, so they do not ride on InputCounts (which stays the trackball
 *  counts plus fire/start). The buffer arithmetic is the cabinet-wide shared
 *  verb (@shared/name-entry): A-Z appends uppercased up to MAX_INITIALS,
 *  Backspace deletes and never runs past empty, every other key is inert.
 *  Inert in every other phase, on a non-qualifying run, and once confirmed; a
 *  no-op returns the SAME state object so the shell can reference-compare. */
export function enterInitial(state: SimState, key: string): SimState {
  if (state.phase !== 'gameover') return state
  const entry = state.entry
  if (entry === null || !entry.qualifies || entry.confirmed) return state
  const initials = stepNameEntry(entry.initials, key, MAX_INITIALS)
  if (initials === entry.initials) return state
  // :1101-1102 reloads the timeout on every ACCEPTED letter — a player who is
  // still typing keeps buying time. An inert key returns above and buys none.
  return { ...state, entry: { ...entry, initials, timeout: ENTRY_TIMEOUT_LETTER_FRAMES } }
}

/** Deep-copy every mutable piece of state into distinct objects: a fresh
 *  playfield Uint8Array, a fresh rng object carrying the same seed word,
 *  fresh player/shot objects, and a fresh segs array — so mutating a clone
 *  never touches the original. */
export function cloneState(state: SimState): SimState {
  return {
    playfield: { cells: new Uint8Array(state.playfield.cells), mush: state.playfield.mush },
    player: { ...state.player },
    shot: { ...state.shot },
    rng: { seed: state.rng.seed },
    frame: state.frame,
    score: state.score,
    segs: state.segs.map((seg) => ({ ...seg })),
    lives: state.lives,
    bonusLevel: state.bonusLevel,
    wave: state.wave,
    delay: state.delay,
    playerExplode: state.playerExplode,
    restorMem: state.restorMem,
    phase: state.phase,
    gameOver: state.gameOver,
    // cp4-6: the board is a fresh ARRAY of the same rows — an aliased array
    // would let a clone write through to its original, the exact coupling this
    // function exists to prevent. The rows themselves are immutable value
    // objects rebuilt by insertHighScore, never mutated in place.
    highScoreTable: state.highScoreTable.map((row) => ({ ...row })),
    entry: state.entry === null ? null : { ...state.entry },
    startPrev: state.startPrev,
    newd: state.newd,
    count1: state.count1,
    count3: state.count3,
    spider: { ...state.spider },
    flea: { ...state.flea },
    centin: state.centin,
    centis: state.centis,
    attractDirH: state.attractDirH,
    attractDirV: state.attractDirV,
  }
}
