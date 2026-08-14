// src/core/enemies/roster.ts
//
// Story ml7-2 — the enemy ROSTER: one aggregate over the seven per-creature
// modules so stepGame (core/sim.ts) drives the whole cast with a single step and
// a single shot-resolve, instead of open-coding seven call sites. Pure; the
// per-creature modules do the work, this just threads them in a fixed order (so
// the shared view.rng stays deterministic).

import type { EnemyView } from './contract'
import { initSpiders, stepSpiders, shootSpiders } from './spider'
import { initBees, stepBees, shootBees } from './bee'
import { initBeetles, stepBeetles, shootBeetles } from './beetle'
import { initDragonflies, stepDragonflies, shootDragonflies } from './dragonfly'
import { initMosquitoes, stepMosquitoes, shootMosquitoes } from './mosquito'
import { initEarwigs, stepEarwigs, shootEarwigs } from './earwig'
import { initInchworms, stepInchworms, shootInchworms } from './inchworm'
import type { SpiderSlot } from '../spider'
import type { BeeSlot } from '../bee'
import type { BeetleSlot } from '../beetle'
import type { DragonflySlot } from '../dragonfly'
import type { MosquitoSlot } from '../mosquito'
import type { EarwigSlot } from '../earwig'
import type { InchwormSlot } from '../inchworm'

/** Every creature's slots. */
export interface Roster {
  spiders: SpiderSlot[]
  bees: BeeSlot[]
  beetles: BeetleSlot[]
  dragonflies: DragonflySlot[]
  mosquitoes: MosquitoSlot[]
  earwigs: EarwigSlot[]
  inchworms: InchwormSlot[]
}

export function initRoster(): Roster {
  return {
    spiders: initSpiders(),
    bees: initBees(),
    beetles: initBeetles(),
    dragonflies: initDragonflies(),
    mosquitoes: initMosquitoes(),
    earwigs: initEarwigs(),
    inchworms: initInchworms(),
  }
}

/** Step the whole cast one frame; playerHit is true if ANY creature touched the
 *  player. Fixed call order keeps the shared view.rng deterministic. */
export function stepRoster(r: Roster, view: EnemyView): { roster: Roster; playerHit: boolean } {
  const sp = stepSpiders(r.spiders, view)
  const be = stepBees(r.bees, view)
  const bt = stepBeetles(r.beetles, view)
  const dr = stepDragonflies(r.dragonflies, view)
  const mo = stepMosquitoes(r.mosquitoes, view)
  const ea = stepEarwigs(r.earwigs, view)
  const iw = stepInchworms(r.inchworms, view)
  return {
    roster: {
      spiders: sp.slots,
      bees: be.slots,
      beetles: bt.slots,
      dragonflies: dr.slots,
      mosquitoes: mo.slots,
      earwigs: ea.slots,
      inchworms: iw.slots,
    },
    playerHit:
      sp.playerHit ||
      be.playerHit ||
      bt.playerHit ||
      dr.playerHit ||
      mo.playerHit ||
      ea.playerHit ||
      iw.playerHit,
  }
}

/** Resolve a player shot against the whole cast — the first creature it hits is
 *  killed and consumes the shot. Returns the points earned and whether a kill
 *  happened (sim.ts emits 'enemy-killed' and consumes the shot on killed). */
export function shootRoster(
  r: Roster,
  shot: { h: number; v: number },
): { roster: Roster; scoreDelta: number; killed: boolean; scroll: number } {
  const sp = shootSpiders(r.spiders, shot)
  if (sp.killed) return { roster: { ...r, spiders: sp.slots }, scoreDelta: sp.scoreDelta, killed: true, scroll: sp.scroll ?? 0 }
  const be = shootBees(r.bees, shot)
  if (be.killed) return { roster: { ...r, bees: be.slots }, scoreDelta: be.scoreDelta, killed: true, scroll: be.scroll ?? 0 }
  const bt = shootBeetles(r.beetles, shot)
  if (bt.killed) return { roster: { ...r, beetles: bt.slots }, scoreDelta: bt.scoreDelta, killed: true, scroll: bt.scroll ?? 0 }
  const dr = shootDragonflies(r.dragonflies, shot)
  if (dr.killed) return { roster: { ...r, dragonflies: dr.slots }, scoreDelta: dr.scoreDelta, killed: true, scroll: dr.scroll ?? 0 }
  const mo = shootMosquitoes(r.mosquitoes, shot)
  if (mo.killed) return { roster: { ...r, mosquitoes: mo.slots }, scoreDelta: mo.scoreDelta, killed: true, scroll: mo.scroll ?? 0 }
  const ea = shootEarwigs(r.earwigs, shot)
  if (ea.killed) return { roster: { ...r, earwigs: ea.slots }, scoreDelta: ea.scoreDelta, killed: true, scroll: ea.scroll ?? 0 }
  const iw = shootInchworms(r.inchworms, shot)
  if (iw.killed) return { roster: { ...r, inchworms: iw.slots }, scoreDelta: iw.scoreDelta, killed: true, scroll: iw.scroll ?? 0 }
  return { roster: r, scoreDelta: 0, killed: false, scroll: 0 }
}
