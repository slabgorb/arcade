// tests/mush-state-wiring.test.ts
//
// Story ml10-3 — thread the LIVE mushroom state into its two dead consumers.
// Both are the dead-feature-signature-unpopulated-input-field class: a consumer
// reads a field every producer hardcodes, while the real value already lives in
// GameState. These tests reach each gate/blocker through the REAL producer
// (stepGame), NOT a hand-built BeeEnv / blockers object — a data test built on a
// hand-made env stays green while the branch is dead, so it would prove nothing.
//
//   (a) BEE MUSH SPAWN GATE — mayStartBee (bee.ts) gates on
//       `mushroomsNeeded(score2) >= env.mush` (BE-8/9, MILLI.MAC:68-78). The
//       roster adapter (enemies/bee.ts:beeEnv) hardcodes `mush: 0`, so the gate
//       is `>= 0` — ALWAYS true, and the near-bottom mushroom tally never holds a
//       bee back. The live count already lives in state.mushCounts.lower; sim.ts
//       must carry it on EnemyView and populate beeEnv.mush from it.
//
//   (b) WAVE-END RESTORING BLOCKER — stepWaveDelay reads
//       blockers.mushroomsRestoring (MLSUB.MAC:54) to HOLD the inter-wave DELAY,
//       but sim.ts hardcodes it `false`, so a wave can end while the conway
//       mushroom-restoration process is still running. sim.ts must compute it
//       from the real conway state.

import { describe, it, expect } from 'vitest'
import { stepGame, type GameInput } from '../src/core/sim'
import { createGame, type GameState } from '../src/core/game-state'
import { BEE_COLOR } from '../src/core/bee'

const SEED = 0x1982
const idle: GameInput = { dh: 0, dv: 0, fire: false, start: false }

// ── (a) BEE MUSH SPAWN GATE (BE-8/9, MILLI.MAC:68-78) ───────────────────────
//
// With no live segments, DEAD == CENTIN == 0, so mayStartBee's direct-spawn path
// (dead==0 && beetles!=0 && centin>=10) is unreachable and the mushroom check
// alone governs the spawn. score2 0 → mushroomsNeeded == 5, so:
//   - lower 0  → gate `5 >= 0`  == true  → the bee CAN spawn (control)
//   - lower 48 → gate `5 >= 48` == false → the bee is HELD BACK (the wired law)
// Today beeEnv hardcodes mush 0, so BOTH cases spawn and the "held" case fails.
describe('ml10-3 (a) — state.mushCounts.lower gates the bee spawn through stepGame (BE-8/9)', () => {
  const play = (over?: Partial<GameState>): GameState => ({
    ...createGame(SEED, { phase: 'play' }),
    segments: [], // no train → mushroom check alone decides the spawn
    ...over,
  })

  /** Step up to `frames` frames; true if the single bee slot is ever occupied. */
  function beeEverSpawns(g0: GameState, frames: number): boolean {
    let g = g0
    for (let i = 0; i < frames; i++) {
      g = stepGame(g, idle)
      if (g.roster.bees[0].color !== 0) return true
    }
    return false
  }

  it('CONTROL: an EMPTY lower band (mush 0) leaves the gate open — a bee spawns', () => {
    const g = play({ mushCounts: { lower: 0, top: 0 }, score: 0 })
    expect(beeEverSpawns(g, 40), 'gate `mushroomsNeeded(0)=5 >= 0` → spawn').toBe(true)
  })

  it('a FULL lower band (mush ≫ mushroomsNeeded) HOLDS the bee back — no spawn', () => {
    // Proves the LIVE count reaches the gate: 0x30 (48) ≫ mushroomsNeeded(0)=5,
    // so `5 >= 48` is false. Reverting beeEnv.mush to the hardcoded 0 spawns a
    // bee here and fails this test.
    const g = play({ mushCounts: { lower: 0x30, top: 0 }, score: 0 })
    expect(beeEverSpawns(g, 40), 'a glutted lower band vetoes the spawn').toBe(false)
  })

  it('spawns exactly the BEE colour when the gate opens (not some other flier in the slot)', () => {
    const g = play({ mushCounts: { lower: 0, top: 0 }, score: 0 })
    let seen = false
    let cur = g
    for (let i = 0; i < 40 && !seen; i++) {
      cur = stepGame(cur, idle)
      if (cur.roster.bees[0].color !== 0) {
        expect(cur.roster.bees[0].color).toBe(BEE_COLOR)
        seen = true
      }
    }
    expect(seen, 'a bee did appear').toBe(true)
  })
})

// ── (b) WAVE-END RESTORING BLOCKER (MLSUB.MAC:54) ───────────────────────────
//
// A cleared wave arms DELAY; CHKEND (stepWaveDelay) HOLDS the countdown while
// mushrooms are restoring. sim.ts must feed that blocker the real conway state,
// not the literal false. With segments == [] and DELAY already armed (≠ 0), the
// clear-edge re-arm does NOT fire, so the provided conway is what MASTER steps
// and the blocker reads. A fresh (phase 0, addr 0) active conway needs many
// frames to finish, so it stays active across the single step under test.
describe('ml10-3 (b) — wave-end waits while conway mushrooms restore, through stepGame', () => {
  const play = (over?: Partial<GameState>): GameState => ({
    ...createGame(SEED, { phase: 'play' }),
    ...over,
  })
  const restoring = { phase: 0, active: true, addr: 0, ngrown: 0 }
  const idleConway = { phase: 0, active: false, addr: 0, ngrown: 0 }

  it('CONTROL: with conway idle, the armed DELAY ticks down one frame', () => {
    const g = play({ segments: [], delay: 5, conway: idleConway })
    expect(stepGame(g, idle).delay, 'no blocker set → DEC DELAY').toBe(4)
  })

  it('HOLDS the countdown while conway restoration is ACTIVE (MLSUB.MAC:54)', () => {
    // Reverting mushroomsRestoring to the hardcoded false ticks DELAY to 4 and
    // fails this test — the mutation guard for the wired blocker.
    const g = play({ segments: [], delay: 5, conway: restoring })
    expect(stepGame(g, idle).delay, 'mushrooms restoring → hold, no decrement').toBe(5)
  })

  it('does NOT advance the wave while restoration runs, even at DELAY 1', () => {
    // At DELAY 1 a clear frame would reach 0 and march the next wave; the live
    // blocker must keep the wave from ending mid-restoration.
    const g = play({ segments: [], delay: 1, wave: 3, conway: restoring })
    const after = stepGame(g, idle)
    expect(after.delay, 'held at 1, not counted to 0').toBe(1)
    expect(after.wave, 'wave does not advance while mushrooms restore').toBe(3)
    expect(after.segments.some((s) => s.color !== 0), 'no fresh train yet').toBe(false)
  })
})
