// tests/secondary-inputs.test.ts
//
// Story ml7-8 (AC2) — the secondary ROM-input threading. ml6-2 built each
// creature's adapter (src/core/enemies/*.ts) with the reducer's side inputs
// HARDCODED to 0 — every `: 0, // TODO(ml7-2 fidelity)` — so the reducers'
// SCORE1 / DEAD / SLOW / MUSH+2 / BEETLS gates are dead. Those inputs must ride
// on EnemyView (contract.ts) and be READ by the adapters, so the gates the pure
// reducers already implement (proven byte-for-byte in ../<creature>.test.ts)
// actually fire.
//
// These are BLACK-BOX seam tests: they set a field on the view and assert the
// reducer's cited behaviour changes. They do NOT name any GameState internals —
// only the EnemyView contract and observable slot/spawn outcomes. Each fails
// today because the adapter ignores the view field and feeds the reducer 0.

import { describe, it, expect } from 'vitest'
import { createRng } from '@shared/rng'
import type { EnemyView } from '../src/core/enemies/contract'

import type { MosquitoSlot } from '../src/core/mosquito'
import { stepMosquitoes } from '../src/core/enemies/mosquito'
import type { DragonflySlot } from '../src/core/dragonfly'
import { initDragonflies, stepDragonflies } from '../src/core/enemies/dragonfly'
import { initInchworms, stepInchworms } from '../src/core/enemies/inchworm'

/**
 * A full EnemyView, INCLUDING the secondary inputs ml7-8 adds to the contract.
 * (Until the contract carries score1/dead/slow/mushTop/beetles this fixture does
 * not type-check — the compile-time half of AC2.) Empty field, live player,
 * seed 1, so every scenario is deterministic.
 */
function view(over: Partial<EnemyView> = {}): EnemyView {
  return {
    frame: 0,
    score2: 0,
    player: { h: 0x40, v: 0x4f, alive: true },
    centin: 0,
    hard: false,
    rng: createRng(1),
    field: new Uint8Array(0x3c0),
    // ── ml7-8 secondary inputs ──
    score1: 0,
    dead: 0,
    slow: 0,
    mushTop: 0,
    beetles: 0,
    ...over,
  }
}

describe('ml7-8 AC2 — EnemyView carries the secondary ROM inputs', () => {
  it('exposes score1, dead, slow, mushTop and beetles as numbers', () => {
    const v = view({ score1: 0x50, dead: 3, slow: 0xe0, mushTop: 0x40, beetles: 2 })
    expect(v.score1).toBe(0x50)
    expect(v.dead).toBe(3)
    expect(v.slow).toBe(0xe0)
    expect(v.mushTop).toBe(0x40)
    expect(v.beetles).toBe(2)
  })
})

// ── SLOW: the critter-freeze flap (MQ-11 / DF-13/14/15) ─────────────────────
// moveMosquito / moveDragonfly flap the wing (pic ^= 1) "every tick in slow
// mode, else only on odd frames": `if (env.slow !== 0 || (frame & 1)) pic ^= 1`.
// On an EVEN frame the odd-frame term is 0, so SLOW alone decides the toggle —
// isolating that view.slow reaches the reducer.

describe('ml7-8 AC2 — SLOW threads to the mosquito flap (MQ-11)', () => {
  /** A live mid-screen mosquito (colour on, picture 0x0e, ±2 diagonal). */
  const bug = (over: Partial<MosquitoSlot> = {}): MosquitoSlot => ({
    color: 0x79, pic: 0x0e, v: 0x50, h: 0x40, dv: 2, dh: 2, pts: 0, ...over,
  })

  it('does NOT flap on an even frame when SLOW is 0 (control)', () => {
    const r = stepMosquitoes([bug()], view({ frame: 0x50, slow: 0 }))
    expect(r.slots[0].color, 'still live').toBe(0x79)
    expect(r.slots[0].pic, 'even frame + no SLOW → no wing flap').toBe(0x0e)
  })

  it('DOES flap on an even frame when SLOW is set (view.slow reaches the reducer)', () => {
    const r = stepMosquitoes([bug()], view({ frame: 0x50, slow: 0xe0 }))
    expect(r.slots[0].color, 'still live').toBe(0x79)
    expect(r.slots[0].pic, 'SLOW forces the every-tick flap → pic ^ 1').toBe(0x0f)
  })
})

describe('ml7-8 AC2 — SLOW threads to the dragonfly flap (DF-13/14/15)', () => {
  /** A live mid-screen dragonfly clear of the player (colour on, picture 0x1e). */
  const fly = (over: Partial<DragonflySlot> = {}): DragonflySlot => ({
    color: 0x79, pic: 0x1e, v: 0x50, h: 0x40, dv: 1, dh: 0, hl: 0, pts: 0, ...over,
  })
  const far = { player: { h: 0x00, v: 0x00, alive: true }, centin: 1 }

  it('does NOT flap on an even frame when SLOW is 0 (control)', () => {
    const r = stepDragonflies([fly()], view({ frame: 0x50, slow: 0, ...far }))
    expect(r.slots[0].color, 'still live').toBe(0x79)
    expect(r.slots[0].pic, 'even frame + no SLOW → no wing flap').toBe(0x1e)
  })

  it('DOES flap on an even frame when SLOW is set (view.slow reaches the reducer)', () => {
    const r = stepDragonflies([fly()], view({ frame: 0x50, slow: 0xe0, ...far }))
    expect(r.slots[0].color, 'still live').toBe(0x79)
    expect(r.slots[0].pic, 'SLOW forces the every-tick flap → pic ^ 1').toBe(0x1f)
  })
})

// ── DEAD / BEETLS / MUSH+2: the dragonfly mushroom-glut spawn veto ───────────
// mayStartDragonfly (DF-5..8): mushChecked = DEAD≠0 || BEETLS==0; when checked,
// spawn is vetoed if flySpawnThreshold(score2) < MUSH+2. seed 1 spawns a
// dragonfly with an empty screen (proven in enemies/dragonfly.test.ts); ml7-8
// must let a mushroom glut VETO that spawn.

describe('ml7-8 AC2 — DEAD/BEETLS/MUSH+2 thread to the dragonfly spawn veto (DF-5..8)', () => {
  it('VETOES the spawn when the top is mushroom-glutted and no beetle blocks the check', () => {
    // dead=0, beetles=0 → mushChecked; mushTop 0xFF ≫ flySpawnThreshold(0) → veto.
    const slots = initDragonflies()
    const r = stepDragonflies(slots, view({ centin: 0, dead: 0, beetles: 0, mushTop: 0xff }))
    expect(r.slots[0].color, 'glut veto (DF-8) blocks the spawn').toBe(0)
  })

  it('ALLOWS the same spawn when a beetle is present (BEETLS≠0 skips the mush check, DF-6)', () => {
    // beetles=1 → mushChecked false → the glut is ignored → the spawn proceeds.
    const slots = initDragonflies()
    const r = stepDragonflies(slots, view({ centin: 0, dead: 0, beetles: 1, mushTop: 0xff }))
    expect(r.slots[0].color, 'no veto → dragonfly spawns (colour 0x79)').toBe(0x79)
  })
})

// ── DEAD: the exact inchworm entry gate (IW-8), replacing the CENTIN proxy ────
// mayStartInchworm requires DEAD≠0. ml6-2 proxied DEAD off CENTIN
// (dead = centin!==0 ? 1 : 0), which is wrong BOTH ways. The spawn tick is
// frame-low 0x13 with (frameHi & 3)==0; CENTIN<11 must also hold.

describe('ml7-8 AC2 — the real DEAD byte threads to the inchworm entry gate (IW-8)', () => {
  it('does NOT enter when DEAD is 0 even though CENTIN>0 (proxy would wrongly admit it)', () => {
    // Old proxy: centin 5 ≠ 0 → dead 1 → admits. Real DEAD 0 → IW-8 refuses.
    const r = stepInchworms(initInchworms(), view({ frame: 0x13, centin: 5, dead: 0 }))
    expect(r.slots[0].color, 'IW-8: no entry while DEAD is 0').toBe(0)
  })

  it('DOES enter when DEAD≠0 even though CENTIN is 0 (proxy would wrongly refuse it)', () => {
    // Old proxy: centin 0 → dead 0 → refuses. Real DEAD 1 with CENTIN 0 (<11) → admits.
    const r = stepInchworms(initInchworms(), view({ frame: 0x13, centin: 0, dead: 1 }))
    expect(r.slots[0].color, 'IW-8: DEAD≠0 and CENTIN<11 → the worm enters').not.toBe(0)
  })
})
