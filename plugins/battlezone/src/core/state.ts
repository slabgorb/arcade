// src/core/state.ts
//
// Story bz1-10 — the complete game state and the deterministic boot. What the
// per-system stories (bz1-4 movement, bz1-5 firing, bz1-7/8/9 the roster)
// carried as separate main.ts locals now lives in ONE GameState, so
// stepGame(state, input, dt) is a pure function of its arguments and the run
// lifecycle (attract → playing → gameover → attract) can be simulated —
// and tested — without a browser. Follows the star-wars/tempest state.ts
// convention.
//
// PURE data. No DOM, no time, no randomness — all randomness lives in the
// carried seed words; all time enters as dt.

import type { TankPose } from './camera'
import type { Shell } from './firing'
import { initEnemies, type EnemyState } from './enemies'
import { initSaucer, type SaucerState } from './saucer'
import { initRadarState, type RadarState, type LitBlip } from './radar'
import { initVolcano, VOLCANO_SEED_SALT, type VolcanoState } from './volcano'
// SH-6: the entry type now comes from @shared/highscore (the module the
// lobby reads with). battlezone records no domain field — the run is the unit —
// so its board is the domain-agnostic base entry, not HighScoreTable<'level'|'wave'>.
import type { HighScoreEntryBase } from '@shared/highscore'
import type { GameEvent } from './events'

/** battlezone's high-score board: descending rows, domain-agnostic (no
 *  level/wave field — the run is the unit). The shared HighScoreEntryBase is the
 *  exact row shape the lobby's getTopScore reads. */
export type HighScoreTable = readonly HighScoreEntryBase[]

/**
 * The run lifecycle (sibling convention). The cabinet idles on a SELF-PLAYING
 * attract demo, plays a run, shows game-over, and cycles back to attract by
 * itself. Starting a run is a plain `start` input from attract — the epic's
 * coin-op descope: nothing quarter-shaped anywhere in the loop.
 *
 * SH2-13 adds 'entry': a QUALIFYING score earns the typed initials-entry
 * screen between the game-over card and attract (replacing bz1-10's silent
 * 'AAA' auto-tag). It still auto-cycles — the whole loop stays input-free.
 */
export type Mode = 'attract' | 'playing' | 'gameover' | 'entry'

/**
 * Tanks a fresh run starts with — DSW0 factory default ("Game starts with 3
 * tanks", arcade-museum.com DIP sheet; findings §9 for the TT band: value + 2
 * → 2..5). Same pin pattern as MISSILE_INTRO_THRESHOLD: the ROM stores the
 * option band, the cabinet manual names the default.
 */
export const STARTING_TANKS = 3

/** Where a tank (fresh run or respawn) enters the plain — the bz1-4 origin. */
export const SPAWN_POSE: TankPose = { x: 0, z: 0, heading: 0 }

/** Everything stepGame needs — the whole battlefield plus the run framing. */
export interface GameState {
  readonly mode: Mode
  /** The player tank (the render camera IS this pose). */
  readonly player: TankPose
  /** The player's one shell in flight (ROM: exactly one out at a time). */
  readonly playerShell: Shell | null
  /** The enemy side: the one hostile, its shell, its rng, the missile counter. */
  readonly enemies: EnemyState
  /** The bonus visitor's side, with its own independent rng stream. */
  readonly saucer: SaucerState
  /**
   * bz3-7: the radar sweep's own state (arm angle + per-contact afterglow).
   * Ticked at the ROM's 15.625 Hz game-frame rate by `sim.ts`'s
   * `advanceRadar` — decoupled from the shell's 60 Hz physics sub-step, so
   * the sweep rate stays 1489 ms/rev regardless of the loop's own cadence.
   */
  readonly radar: RadarState
  /** The radar HUD's current lit blips — the last `stepRadar` output, held
   *  between game-frame ticks so every render frame has something to draw. */
  readonly radarBlips: readonly LitBlip[]
  /** Seconds carried toward the next radar game-frame tick (the remainder an
   *   1/60 s sub-step leaves behind when it doesn't fill a full 64 ms frame). */
  readonly radarClock: number
  /**
   * bz4-2: the volcano's VOLCNO rock ejecta — a SEEDED-STOCHASTIC 5-rock
   * emitter (`volcano.ts`) whose rocks respawn independently on their own
   * ~1-in-8 timer, each drawing a random YSPD=(rng&7)+5, ticked at the ROM
   * game-frame rate by sim.ts's `advanceVolcano`. Seeded from the run seed so
   * the eruption replays. Optional so the many pre-bz3-6 GameState fixtures
   * across the test suite still typecheck — read via
   * `?? initVolcano((seed ^ VOLCANO_SEED_SALT))`, the `missilesLaunched`/`reload` idiom.
   */
  readonly volcano?: VolcanoState
  /**
   * bz3-6: TOTAL seconds the volcano has been running — a free-running total
   * (never reset, unlike `radarClock`'s per-tick remainder), compared against
   * its own prior value each call via a floor-diff against `GAME_FRAME_HZ`
   * (the `enemies.ts:804` idiom) to know how many whole game frames to step
   * this call. Optional for the same pre-bz3-6 fixture reason as `volcano`.
   */
  readonly volcanoAge?: number
  /** The player's score this run. */
  readonly score: number
  /** The ENEMY's score — +1000 per player death; the ratchet reads score − enemyScore (findings §5). */
  readonly enemyScore: number
  /** Tanks remaining, extra-tank awards included. */
  readonly lives: number
  /** The high-score board, descending — persisted by the shell at run end. */
  readonly highScores: HighScoreTable
  /** The initials-entry buffer (SH2-13) — non-null only while mode === 'entry'.
   *  Holds exactly what the player has typed (0–3 uppercase A–Z chars); the
   *  commit records it VERBATIM, never an auto-tagged constant. */
  readonly entry: { readonly initials: string } | null
  /** Seconds spent in the current mode — the demo script clock and the game-over hold. */
  readonly modeAge: number
  /** The boot seed word — attract re-entry replays the demo from exactly this. */
  readonly seed: number
  /**
   * bz3-10 (U-010): whether a translate intent was BLOCKED last step — the
   * ROM's OBJCOL latch (BZONE.MAC:2677-2680). `stepBattle` compares this
   * against the current frame's predicate so BOING fires once on the 0→1
   * entry, never every frame the tank stays jammed against an obstacle.
   */
  readonly motionBlockedLatch: boolean
  /**
   * bz3-10 (U-008): whether a hostile was gunsight-aligned and in range last
   * step — the ROM's EIRNGE latch (BZONE.MAC:4050-4054). Same rising-edge
   * role as `motionBlockedLatch`, for WARNG.
   */
  readonly enemyInRangeLatch: boolean
  /**
   * bz3-9 / bz4-1 (M-009/H-007): the ROM's live BOUNCE magnitude
   * (BZONE.MAC:275 "COLLISION BOUNCE VIEW AMT"), a FULL BYTE 0-255 (0x00-0xFF).
   * `sim.ts`'s `stepBattle` writes it in the ROM's three places:
   *   - the obstacle-ram OBJCOL rising edge that fires BOING → 0x3F (63)
   *     (BZONE.MAC:2681-2682, `motionBlockedLatch`'s edge) — first contact
   *     only; a tank still jammed next step does not re-trigger it, like BOING;
   *   - bz4-1: a lethal hit → 0xFF (255), the widened register. The player-
   *     death / windshield-crack path writes it BEFORE `DEC LIVES`
   *     (BZONE.MAC:2337-2339, `LDA I,-1 / STA BOUNCE`), so EVERY life lost —
   *     game-over included — jolts, and the mutual-kill branch (:3363-3364)
   *     writes the same 0xFF even as the player banks the enemy's points.
   * `sim.ts`'s `advanceRadar` game-frame loop halves it once per tick (BOUND,
   * BZONE.MAC:2132-2134) until it reaches 0. Free-running like `frameCount`
   * BETWEEN writes — but the death write DOES overwrite a still-decaying jolt
   * (correcting bz3-9's stale "never reset on death" rationale). Never clamped:
   * the register holds the full 0xFF and decays 255→127→…→0. Drives BOTH the Z
   * view jolt (`camera.ts`'s `tankView`) and the mountain + horizon-line
   * vertical bob (`horizon.ts`'s `panoramaToNdc` / `skylineSegments`) from this
   * ONE value.
   */
  readonly bounce: number
  /**
   * bz5-1: the ROM's CRACKED WINDSHIELD COUNTER (`CRACK: .BLKB 1`,
   * BZONE.MAC:256) — the sibling of `bounce` bz4-1 shipped without. 0 = a clean
   * windshield; non-zero = the shattered-glass overlay is drawn (the ROM gates
   * the whole windshield on it: `LDA CRACK / BEQ 31$ / JMP WNSHLD`, :506-508).
   * `sim.ts`'s `stepBattle` SETS it to 2 on the player-death / windshield-crack
   * path (`LDA I,2 / STA CRACK`, :2335-2336) — every life lost, right beside the
   * BOUNCE=0xFF write — and `advanceRadar` advances it +2 per 15.625 Hz game
   * frame (INC CRACK ×2, :697-698), resetting to 0 at the ROM's 16×2 cap
   * (:660-661), a BOUNDED death-sequence window that clears on its own. Advanced
   * on the game frame (NOT the ~60 Hz render sub-step, the C-001 trap `bounce`
   * and `frameCount` also avoid). Pure core; the shell only READS `game.crack`.
   */
  readonly crack: number
  /**
   * The gameplay moments of THIS step, fresh every step, never accumulated
   * (bz1-11, star-wars pattern). Pure data for the shell's sound dispatch —
   * one-way: the core writes, the shell reads, nothing flows back.
   */
  readonly events: readonly GameEvent[]
  /**
   * bz3-11 (C-004/C-005): a free-running ROM FRAME analog — incremented once
   * per 15.625 Hz GAME frame by sim.ts's `advanceRadar` (the same loop that
   * already IS that boundary), never by the ~60 Hz render sub-step (the C-001
   * trap). Feeds `alerts.ts`'s `alertFlashOn` bit-1 flash gate for the enemy
   * alerts. Free-running: never reset on respawn/mode change, so the blink
   * phase never jumps — attract/playing/gameover/entry all carry it forward
   * via the `{...state}` spreads.
   */
  readonly frameCount: number
}

/**
 * Boot the cabinet: attract mode, a deterministic demo battlefield derived
 * entirely from `seed`. Re-entering attract after a run rebuilds from this
 * same function, so the demo trajectory is a function of the seed alone —
 * never of run leftovers (story AC: identical replay).
 */
export function initGame(seed: number): GameState {
  return {
    mode: 'attract',
    player: SPAWN_POSE,
    playerShell: null,
    enemies: initEnemies(seed >>> 0, SPAWN_POSE),
    // The saucer's own stream — independent lifecycles (bz1-9 convention).
    saucer: initSaucer((seed ^ 0x5a0c3e) >>> 0),
    radar: initRadarState(),
    radarBlips: [],
    radarClock: 0,
    // The volcano's own stream — independent of the enemy/saucer lifecycles,
    // seeded from the run seed so the eruption replays (bz4-2).
    volcano: initVolcano((seed ^ VOLCANO_SEED_SALT) >>> 0),
    volcanoAge: 0,
    score: 0,
    enemyScore: 0,
    lives: STARTING_TANKS,
    highScores: [],
    entry: null,
    modeAge: 0,
    seed: seed >>> 0,
    motionBlockedLatch: false,
    enemyInRangeLatch: false,
    events: [],
    frameCount: 0,
    bounce: 0,
    crack: 0,
  }
}
