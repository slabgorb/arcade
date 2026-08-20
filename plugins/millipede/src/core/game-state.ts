// src/core/game-state.ts
//
// Story ml7-2 — the owning GameState. Millipede's sixteen pure subsystems each
// take an *Env bag + a *Slot and return a structured result; none of them owns
// the player, the shot, the score, the phase, or the RNG. This module is where
// all of that lives, so stepGame (core/sim.ts) can thread one state through them.
//
// PURE: seeded @shared/rng only (like core/attract.ts). The purity sweep covers
// this file automatically.

import { createRng, nextInt, type Rng } from '@shared/rng'
import { PLYFLD_SIZE, type ConwayState } from './conway'
import { musher, type MushCounts } from './mushroom'
import { createMillipede, CENTIS_FAST, NCENT, type Segment } from './millipede'
import { createPlayer, type PlayerState } from './input'
import { initRoster, type Roster } from './enemies/roster'
import { newDdtTable, ddtPlace, ddtRestore, type DdtTable } from './ddt'
import { initialBonusTarget } from './bonus'
import { DEFAULT_HIGH_SCORES, type MilliHighScore } from './highscore'
import type { GamePhase } from './phase'
import type { GameEvent } from './events'

/** The single player shot (millipede fires one at a time). */
export interface Shot {
  active: boolean
  h: number
  v: number
}

/** Everything the simulation owns for one game. */
export interface GameState {
  phase: GamePhase
  /** The seed the world was built from — a fresh game re-derives from it. */
  seed: number
  /** The interrupt/frame counter — drives subsystem cadences and audio masks. */
  frame: number
  rng: Rng
  /** The PLYFLD mushroom field (stamp bytes; bit 7 is the grey-background bit). */
  field: Uint8Array
  /** CONWAY growth/death process state — armed between waves, idle otherwise. */
  conway: ConwayState
  player: PlayerState
  shot: Shot
  segments: Segment[]
  /** CENTIN (MLDEF.MAC:299) — the millipede's WAVE-LENGTH register, 1..NCENT. In the
   *  ROM it is written ONLY by INIT (LDA I,12., MILLI.MAC:1168) and by the CENTPC walk
   *  (DEC/reload, :509-512) — NEVER decremented per segment-death — so it is the
   *  PRESERVED length CENTPC re-lays (LDY X,CENTIN, MILLI.MAC:546) and the value the wave-clear gates
   *  read to pick a CONWAY (==9) or BOMBS (∈BOMBSL) wave. pt1-2 wires the walk, so this
   *  now steps 12→11→…→1→(reload 0x0C) across waves rather than tracking live deaths;
   *  the live count drives the colour latch separately (see fieldColourIndex). */
  centin: number
  /** CENTIS (MLDEF.MAC:300) — the millipede SPEED register, the per-frame step
   *  magnitude of every segment (dv, |dh|). INIT boots it to 2, "FAST TO START WITH"
   *  (MILLI.MAC:1171, WP-1); each wave clear INCrements it ("FASTER", :1906, WP-2) and
   *  the CENTPC walk resets it to 1 (SLOW, below 20,000) or 2 (FAST) once it reaches 3
   *  (stepWaveCadence, MT-16). This is what makes the game escalate across waves. */
  centis: number
  /** NOCENT (MLDEF.MAC:391) — the bomb-mode budget: the count of dive-bombing critters
   *  still to enter this bomb wave. 0 = not in bomb mode. Armed at a wave clear whose
   *  CENTIN is in BOMBSL (bombModeStart, DD-97/98); the per-frame BOMBS dispatcher
   *  (MILLI.MAC:28) enters a critter and decrements it while it is non-zero. */
  nocent: number
  /** BOMBV (MLDEF.MAC:396) — the bomb-mode scoring flag, INCremented when a bomb wave
   *  arms (MILLI.MAC:1923, DD-100). Non-zero means SHOOT3 awards the escalating
   *  bomb-mode score; 0 outside a bomb wave. */
  bombv: number
  /** The CENTIN the playfield is currently COLOURED for — the latched colour row
   *  (row = fieldColourIndex-1, MLIRQ.MAC:255-256). Held separately from `centin`
   *  so the base band only recolours at an LCOLOR event, not every frame (ml11-1).
   *  Init NCENT — a fresh wave shows the full-millipede colour. */
  fieldColourIndex: number
  /** LCOLOR (MLIRQ.MAC:248) — the recolour-request flag. In this port it is armed
   *  and CONSUMED within the same `stepPlay` (sim.ts derives a local `armed` from a
   *  length change and passes it straight to recolourField, which always returns the
   *  flag cleared), so the stored field is written back `false` every frame and does
   *  not itself carry a signal across a frame boundary — it mirrors the ROM's LCOLOR
   *  memory cell and is the reducer's flag-clear contract. It becomes genuinely
   *  cross-frame only if a future length change (e.g. ml3-2 splits) arms it without
   *  an immediate same-frame consume. Clear at boot. */
  lcolor: boolean
  /** The enemy cast — spiders, bees, beetles, dragonflies, mosquitoes, earwigs, inchworms. */
  roster: Roster
  /** The four-entry DDTADD bomb bank (DDTS/DDTS2, ddt.ts). Stamped into `field`. */
  ddt: DdtTable
  score: number
  lives: number
  wave: number
  /** OPTNS1 — the DIP option-switch shadow the bonus/select logic reads. */
  optns1: number
  /** BONUSL/BONUSM — the next extra-life score threshold, BCD hundreds (bonus.ts). */
  bonusL: number
  bonusM: number
  /** SCROLC (MLDEF.MAC:372) — the signed pending-scroll counter: negative queues
   *  a DOWN-scroll, positive an UP-scroll, 0 is idle. Sources DEC/INC it (the
   *  continuous arm, beetle/mosquito kills, the CENTPC re-lay); SCROLL consumes it
   *  each frame (scroll.ts). */
  scrolc: number
  /** HITDDT (MLDEF.MAC:373, "NON-ZERO IF DDT HAS BEEN HIT") — a persistent flag
   *  set when a shot detonates a bomb (MILLI.MAC:2060) or the player dies from a
   *  collision (:1805, the PLAY routine), and cleared only at wave start
   *  (CENTPC :508). While set it suppresses the continuous-scroll arm (SC-9,
   *  scroll.ts) — holding the auto-scroll off from death through respawn until the
   *  wave restarts, which the frame-local player-dead gate (SC-8) cannot do. */
  hitDdt: boolean
  /** MUSH / MUSH+2 (MLDEF.MAC:342-343) — mushrooms counted in the lower and top
   *  row bands. The scatter seeds them, and every scroll/ddt delta adjusts them. */
  mushCounts: MushCounts
  /** DELAY (MLDEF.MAC:286) — the inter-wave pause; 0 is idle, armed to WAVE_DELAY
   *  when the millipede is cleared and counted down by CHKEND (waves.ts). */
  delay: number
  /** Frames remaining in the death-animation hold (0 outside it). */
  deathTimer: number
  /** SLOW (MLDEF.MAC) — the critter-freeze countdown set to 0xE0 on an inchworm
   *  kill (IW-34/37), decremented each frame; non-zero freezes critter animation
   *  (mosquito/dragonfly flap every tick). 0 = not slowed. */
  slow: number
  /** Rebuilt every frame, never appended across frames; attract clears it. */
  events: readonly GameEvent[]
  /** The live high-score ladder (ml10-2). Seeded from the ROM DEFAULT_HIGH_SCORES,
   *  replaced on boot by main.ts with the persisted board, and grown by a committed
   *  name entry. Held here (not in the shell) so sim can qualify a game-over score
   *  against it — the missile-command GameState.highScores shape. */
  highScores: readonly MilliHighScore[]
  /** The in-flight initials buffer, collected during the 'entry' phase (ml10-2). Empty
   *  except while a qualifying player is signing the board. */
  initials: string
}

/** Mushrooms scattered at boot — a starting field for the march to weave through
 *  (a dressing choice, like attract.ts; musher rejects the reserved rows). */
const START_MUSHROOM_TRIES = 96

/** Standard millipede lives. */
const START_LIVES = 3

/** The default DIP option shadow: bonus-index 0 → the 12,000-point extra-life
 *  increment (BONUS_INCREMENTS[0], the standard millipede first bonus). */
const DEFAULT_OPTNS1 = 0x00

export interface CreateGameOpts {
  /** Start phase (default 'attract'). */
  phase?: GamePhase
  /** Starting lives (default 3). */
  lives?: number
}

export function createGame(seed: number, opts?: CreateGameOpts): GameState {
  const rng = createRng(seed)
  const field = new Uint8Array(PLYFLD_SIZE)
  const counts: MushCounts = { lower: 0, top: 0 }
  for (let i = 0; i < START_MUSHROOM_TRIES; i++) {
    musher(field, nextInt(rng, PLYFLD_SIZE), counts)
  }
  // DDTS then DDTS2 (ddt.ts): place the four bombs and stamp them into the
  // field. Runs AFTER the mushroom scatter so the bombs win their cells
  // (ddtRestore overwrites a mushroom, as the ROM does — DD-24).
  const ddt = newDdtTable()
  ddtPlace(ddt, false)
  ddtRestore(ddt, field)
  const bonus = initialBonusTarget(DEFAULT_OPTNS1) // seed BONUSL/BONUSM (MLSUB.MAC:393-398)
  return {
    phase: opts?.phase ?? 'attract',
    seed,
    frame: 0,
    rng,
    field,
    // CONWAY idle at boot (CDONE clear); armed by stepGame at each wave clear.
    conway: { phase: 0, active: false, addr: 0, ngrown: 0 },
    player: createPlayer(),
    shot: { active: false, h: 0, v: 0 },
    segments: createMillipede({ headingSign: 1 }),
    centin: NCENT, // SET CENTIPEDE SIZE (MILLI.MAC:1170) — a full-length wave register
    centis: CENTIS_FAST, // FAST TO START WITH (MILLI.MAC:1171, WP-1)
    nocent: 0, // not in bomb mode at boot (MLDEF.MAC:391)
    bombv: 0, // no bomb-mode scoring at boot (MLDEF.MAC:396)
    fieldColourIndex: NCENT, // field coloured for the full millipede at wave start (ml11-1)
    lcolor: false, // LCOLOR clear at boot — nothing to recolour yet (MLIRQ.MAC:248)
    roster: initRoster(),
    ddt,
    score: 0,
    lives: opts?.lives ?? START_LIVES,
    wave: 0,
    optns1: DEFAULT_OPTNS1,
    bonusL: bonus.bonusL,
    bonusM: bonus.bonusM,
    scrolc: 0, // SCROLC idle — nothing pending at boot (MLDEF.MAC:372)
    hitDdt: false, // HITDDT clear at boot — no DDT hit yet (MLDEF.MAC:373)
    mushCounts: counts, // the scatter's MUSH/MUSH+2 tallies, previously discarded
    delay: 0,
    deathTimer: 0,
    slow: 0,
    events: [],
    highScores: DEFAULT_HIGH_SCORES, // main.ts replaces this with the persisted board on boot
    initials: '', // empty until a qualifying game-over opens name entry
  }
}
