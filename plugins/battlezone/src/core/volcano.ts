// src/core/volcano.ts
//
// Story bz4-2 — GREEN phase (Julia / Dev). The SEEDED-STOCHASTIC volcano
// emitter: NOROCK=5 rocks, each respawning INDEPENDENTLY on its own ~1-in-8
// staggered timer and drawing its OWN random launch velocity from a seeded,
// deterministic PRNG. This replaces bz3-6's fixed-velocity synchronised
// relaunch-on-retire volley (sim.ts's old `advanceVolcano` loop) with the ROM's
// per-rock independent respawn + per-rock random YSPD.
//
// PURE core (epic non-negotiable): no DOM, no wall clock, no ambient
// randomness — every draw comes from the carried `rng` seed word, so a
// snapshot replays byte-identically. Reuses the SHARED seeded PRNG
// (`@shared/rng`, mulberry32) that saucer.ts / enemies.ts already
// thread; there is no second generator.
//
// ROM FIDELITY (VOLCNO, verified against
// /Users/slabgorb/Projects/battlezone-source-text/BZONE.MAC:1390-1417):
//   VOLCNO: LDX I,NOROCK-1   ;5 ROCKS                  (:1390 — NOROCK=5, :319)
//   10$:    LDA X,OBJTIM     ;THIS ROCK ACTIVE?        (:1391 — per-rock timer)
//           BNE 30$          ;YES → just fly it
//           LDA PRAND        ;NOT ACTIVE, START ONE?   (:1393)
//           AND I,7          ;(THIS # MAY CHANGE)      (:1394)  1-in-8 gate:
//           BNE 50$          ;DON'T START THIS TIME    (:1395)  relaunch ONLY
//                                                              when (PRAND&7)==0
//           LDA I,1F         ;ROCK ACTIVE TIME         (:1396 — OBJTIM=0x1F=31)
//           STA X,OBJTIM
//           LDA PRAND        ;                         (:1405)
//           AND I,7          ;                         (:1406)
//           ADC I,5          ;SOME RANDOM VERT VELOCITY(:1407 — YSPD=(PRAND&7)+5)
//           STA X,YSPD                                          ∈ [5,12]
//   30$:    DEC X,OBJTIM
//           DEC X,YSPD       ;GRAVITY TAMES HOLD       (:1417 — gravity -1/frame)
//
// The `LDX I,NOROCK-1 … DEX` loop rolls EACH of the 5 rocks independently every
// game frame off the SAME hardware LFSR (PRAND), which advances on every read —
// so the rocks stagger. The launch YSPD is the raw draw on the launch frame;
// gravity only begins taming it the following frame (the 30$ branch is not
// taken on the launch frame — the launch falls through to the next rock).

import { createRng, nextInt } from '@shared/rng'

/** NOROCK — the ROM's rock count (BZONE.MAC:319, :1390). */
export const NOROCK = 5

/** OBJTIM — a rock's active lifetime in 15.625 Hz game frames (0x1F, :1396). */
export const VOLCANO_LIFETIME = 0x1f

/** `DEC X,YSPD ;GRAVITY TAMES HOLD` — velocity decays 1/frame while airborne (:1417). */
const VOLCANO_GRAVITY = 1

/** `YPOS += YSPD` is a plain add — heightScale 1 (contrast the object explosion's <<2). */
const HEIGHT_SCALE = 1

/** `ADC I,5` — the launch-velocity floor; the draw is (PRAND&7)+5 ∈ [5,12] (:1407). */
const VELOCITY_BASE = 5

/**
 * `AND I,7` — the shared modulo for BOTH the 1-in-8 respawn gate (relaunch iff
 * the roll is 0) and the 8-wide velocity band (:1394 / :1406). Reading from the
 * shared stream advances the LFSR, so the 5 rocks decorrelate and stagger.
 */
const RESPAWN_MODULO = 8

/**
 * Derive the volcano's own PRNG stream from the run seed — distinct from the
 * enemy (raw seed) and saucer (seed ^ 0x5a0c3e) streams so all three erupt
 * independently yet every one replays from initGame(seed). Consumed by
 * state.ts's initGame and sim.ts's advanceVolcano fallback.
 */
export const VOLCANO_SEED_SALT = 0x1caf0e

/** One rock's pure state. Tests read `velocity` + `active`; `height`/`objtim`
 *  carry the render (YPOS) and the OBJTIM countdown the shell dims by. */
export interface VolcanoRock {
  /** YSPD: the [5,12] launch draw on the (re)launch frame, then gravity-decayed. */
  readonly velocity: number
  /** Airborne? (ROM OBJTIM > 0). false = retired, waiting on its 1-in-8 roll. */
  readonly active: boolean
  /** YPOS integrated for render; 0 at (re)launch. */
  readonly height: number
  /** OBJTIM countdown in game frames; 0 = retired. */
  readonly objtim: number
}

/** The whole volcano side of the sim: the 5 rocks and the carried seed word. */
export interface VolcanoState {
  readonly rocks: readonly VolcanoRock[]
  /** The carried PRNG seed — part of the snapshot, so replays reproduce the sequence. */
  readonly rng: number
}

/** A retired rock: grounded, waiting on its own respawn roll. */
const IDLE_ROCK: VolcanoRock = { velocity: 0, active: false, height: 0, objtim: 0 }

/** Seed the volcano: NOROCK idle rocks, deterministic from `seed`. */
export function initVolcano(seed: number): VolcanoState {
  const rng = createRng(seed)
  const rocks: VolcanoRock[] = Array.from({ length: NOROCK }, () => IDLE_ROCK)
  return { rocks, rng: rng.seed }
}

/**
 * Advance EXACTLY ONE 15.625 Hz game frame (the dt→frames accumulation stays in
 * sim.ts's advanceVolcano). Each ACTIVE rock ages/falls and retires at OBJTIM 0;
 * each IDLE rock rolls its own 1-in-8, and a hit (re)launches it with a fresh
 * YSPD=(rng&7)+5. Pure function of `state` alone (all randomness from `state.rng`).
 */
export function stepVolcano(state: VolcanoState): VolcanoState {
  const rng = createRng(state.rng)
  const rocks: VolcanoRock[] = state.rocks.slice()
  // VOLCNO loops rocks NOROCK-1..0 off the shared PRAND (advances per read); the
  // descending order matches `LDX I,NOROCK-1 … DEX`. Any fixed order is a valid
  // deterministic serialization of the per-rock rolls.
  for (let i = rocks.length - 1; i >= 0; i--) {
    const rock = rocks[i]
    if (rock.active) {
      // 30$: fly it — integrate YPOS, then gravity tames YSPD; retire at OBJTIM 0.
      const objtim = rock.objtim - 1
      rocks[i] = {
        velocity: rock.velocity - VOLCANO_GRAVITY,
        active: objtim > 0,
        height: rock.height + rock.velocity * HEIGHT_SCALE,
        objtim,
      }
      continue
    }
    // Idle: this rock's own 1-in-8 respawn gate — relaunch only when (PRAND&7)==0.
    if (nextInt(rng, RESPAWN_MODULO) !== 0) continue
    // Relaunch: OBJTIM=0x1F and a fresh random vertical velocity (PRAND&7)+5.
    // The raw draw is the velocity THIS frame; gravity begins taming it next frame.
    const velocity = nextInt(rng, RESPAWN_MODULO) + VELOCITY_BASE
    rocks[i] = { velocity, active: true, height: 0, objtim: VOLCANO_LIFETIME }
  }
  return { rocks, rng: rng.seed }
}
