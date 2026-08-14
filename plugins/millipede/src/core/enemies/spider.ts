// src/core/enemies/spider.ts
//
// Story ml7-2 — the SPIDER's plug into the uniform enemy seam (contract.ts).
// The subsystem itself — the line-by-line SPDMV port — lives in
// ../spider.ts (story ml4-1/ml4-5). This module is the thin, PURE wiring the
// stepGame orchestrator (core/sim.ts) calls: it owns the per-frame slot scan
// (spawn into vacant slots, move live ones, run the OBSTAC seam), the player
// contact test, and the player-shot resolution — everything the subsystem
// left to "the caller" (the OBSTAC lookup, PLAY overlap, kill scoring hookup).
//
// PURE (tests/purity.test.ts scans this file): reads the view, may MUTATE
// view.field in place (the spider eats mushrooms, as the ROM does), and draws
// its randomness only from view.rng via nextInt. No clock, no DOM, no shell.

import type { EnemyView, EnemyStepResult, EnemyShootResult } from './contract'
import { nextInt } from '@shared/rng'
import {
  type SpiderSlot,
  type SpiderEnv,
  SPIDER_SLOT_FIRST,
  SPIDER_SLOT_END,
  SPIDER_OFF_DELAY,
  isSpider,
  trySpawnSpider,
  moveSpider,
  spiderObstacle,
  spiderOff,
  spiderKill,
} from '../spider'
import { checkPlayerCollision } from '../millipede'

export type { SpiderSlot } from '../spider'

/**
 * The spider band of the motion-object table (MILLI.MAC:2303/2314, SD-7/8):
 * one slot per index 6..13, all VACANT as SPDOFF leaves them — colour 0
 * (free), the spawn delay armed. sim.ts holds this array across frames.
 */
export function initSpiders(): SpiderSlot[] {
  const count = SPIDER_SLOT_END - SPIDER_SLOT_FIRST
  return Array.from({ length: count }, () => ({
    color: 0,
    pic: 0,
    v: 0,
    h: 0,
    dv: 0,
    dh: 0,
    oldDh: 0,
    count2: SPIDER_OFF_DELAY,
    pts: 0,
  }))
}

/**
 * The OBSTAC cell a spider at (h,v) occupies (MLSUB.MAC OBSTAC :853-884),
 * derived like mushroom.ts `obstac` but WITHOUT the ±8 travel-direction
 * lookahead — "the cell at the new position" (the ml7-2 wiring brief). Returns
 * the ZERO-BASED field index (PLYFLD 0x1000 already subtracted, as conway.ts
 * and mushroom.ts commit to), or -1 when the derivation lands off the field.
 *
 * TODO(ml7-2 fidelity): the exact OBSTAC one-cell-ahead direction (the spider
 * SUBTRACTS dh, so its travel sign is inverted vs the mushroom mover) and the
 * :879-884 right-edge column wrap are deferred; the position cell is the
 * first-pass approximation.
 */
function spiderObstacleAddr(slot: Readonly<SpiderSlot>): number {
  const vpart = (slot.v >> 3) + (slot.v & 0x04 ? 1 : 0) // :853-856 V/8 half-row round
  const diff = 0xf7 - slot.h // :867-869
  const col8 = diff < 0 ? 0 : diff & 0xf8 // :870-872 left-margin clamp
  return col8 * 4 + vpart // :873-877 (col*0x20 + row), base already zero
}

/**
 * One frame of the whole spider band (the SPDMV scan, MILLI.MAC:2295-2532).
 * For each slot: a vacant one runs its spawn countdown (trySpawnSpider → the
 * SD-11..25 gates, which call startSpider on success); a live one takes one
 * SPDMV step (moveSpider — h==0 there is offscreen → SPDOFF), then the OBSTAC
 * reaction (a DDT cloud kills it, ROCK-and-up is eaten out of the field), then
 * the PLAY contact test against the player. playerHit turns into the player
 * death sequence in sim.ts.
 */
export function stepSpiders(slots: SpiderSlot[], view: EnemyView): EnemyStepResult<SpiderSlot[]> {
  const env: SpiderEnv = {
    frame: view.frame,
    // ml7-8: SCORE1 threaded — the HARD 5,000 early-fast gate (SD-18) is exact.
    score1: view.score1,
    score2: view.score2,
    centin: view.centin,
    // ml7-8: DEAD (remaining segments) threaded — the first-wave extra spiders
    // (centipede-entry slots 6..11, SD-52..61) open on a live centipede.
    dead: view.dead,
    playerAlive: view.player.alive,
    hard: view.hard,
    rnd0: nextInt(view.rng, 256), // the POKEY RND0 byte for this frame
  }

  let playerHit = false
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i]
    const index = SPIDER_SLOT_FIRST + i
    if (slot.color === 0) {
      // A vacant slot only counts down / spawns; the fresh spider (SPDH=0, not
      // yet on screen) does not also move or contact the player this frame.
      trySpawnSpider(slot, index, env)
      continue
    }
    const { offscreen } = moveSpider(slot, env)
    if (offscreen) {
      spiderOff(slot) // idempotent — moveSpider already ran SPDOFF at h==0
      continue
    }
    // OBSTAC seam (the spider's reaction, SD-34..37): eat writes the field.
    const addr = spiderObstacleAddr(slot)
    if (addr >= 0 && addr < view.field.length) {
      const react = spiderObstacle(view.field[addr])
      if (react.kind === 'die') spiderOff(slot)
      else if (react.kind === 'eat') view.field[addr] = react.cell
    }
    // PLAY contact (the spider box, isSpider=true): a killed/off slot no longer
    // qualifies, so the isSpider gate also drops a spider the OBSTAC just killed.
    if (isSpider(slot) && checkPlayerCollision(slot, view.player, true)) playerHit = true
  }

  return { slots, playerHit }
}

/**
 * Resolve one player shot against the band. The first LIVE spider whose box
 * the shot overlaps (PLAY, the non-spider box) is killed: spiderKill scores it
 * by proximity (SD-46..51) and the slot is vacated (SPDOFF). One hit per call.
 */
export function shootSpiders(
  slots: SpiderSlot[],
  shot: { h: number; v: number },
): EnemyShootResult<SpiderSlot[]> {
  for (const slot of slots) {
    if (!isSpider(slot)) continue
    if (checkPlayerCollision(slot, shot)) {
      const { points } = spiderKill(slot.v, /*playV*/ 0, /*byDdt*/ false)
      spiderOff(slot)
      return { slots, scoreDelta: points, killed: true }
    }
  }
  return { slots, scoreDelta: 0, killed: false }
}
