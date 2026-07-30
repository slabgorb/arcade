// tests/egg.test.ts
//
// Story jt2-4 — RED phase (O'Brien / TEA). The BEHAVIOURAL suite for the egg
// lifecycle core. Every test drives `loadEgg()`, which throws a clean "egg core
// not built yet" until Dev (Julia) writes src/core/egg.ts — so today's red reads
// as "the feature is absent", never a module-resolution trace or a type error.
// The ROM-law provenance lives in tests/egg-source.test.ts; the transcription
// claims in docs/rom-study/claims/egg.json.
//
// See tests/helpers/egg-contract.ts for the module shape and TWO deliberate
// pins the reviewer should read before "fixing" them:
//   1. the settle band is the SIGNED `velY >= -$20` (the ROM's `CMPD #-$0020 /
//      BLT`), not `abs(velY) <= $20` — boundary-exact at -$20 (settle) / -$21 (no);
//   2. the hatched buzzard enters from the FARTHER (opposite) edge — the ROM
//      correction to AC-3 / epic law #7's "nearer" prose (a jt2-3-class fix).

import { describe, it, expect } from 'vitest'
import {
  loadEgg,
  type EggState,
  type EggVictim,
  type IntelBudget,
} from './helpers/egg-contract.js'
import { loadArena } from './helpers/arena-contract.js'
import { loadEnemy } from './helpers/enemy-contract.js'

// ─── Fixtures ────────────────────────────────────────────────────────────────

/** A joust victim with sane defaults; override only what a test needs. */
function victim(over: Partial<EggVictim> = {}): EggVictim {
  return { posX: 100, posY: 100 << 8, velX: 0, velY: 0, eggsLeft: 4, ...over }
}

/** A landed-and-still egg with sane defaults; override only what a test needs. */
function egg(over: Partial<EggState> = {}): EggState {
  return {
    posX: 100,
    posY: 100 << 8,
    velX: 0,
    velY: 0,
    bumpX: 0,
    bumpY: 0,
    eggsLeft: 3,
    hitCount: 0,
    pfeet: 0,
    settled: false,
    ...over,
  }
}

const snapshot = <T>(v: T): T => structuredClone(v)

// ─── Contract sanity ─────────────────────────────────────────────────────────

describe('the egg core — contract', () => {
  it('exposes the egg-lifecycle API once built (RED until src/core/egg.ts exists)', async () => {
    const e = await loadEgg()
    for (const fn of [
      'spawnEgg',
      'bounceVelY',
      'decayVelX',
      'eggSettles',
      'bounceEgg',
      'wrapEggX',
      'bumpEggHits',
      'eggValue',
      'airCatchBonus',
      'eggScoreEvents',
      'willHatch',
      'remountEntryEdge',
      'remountBudgetDebit',
    ] as const) {
      expect(typeof e[fn], `${fn} must be a function`).toBe('function')
    }
  })
})

// ─── AC-1 — SPAWN carries the victim's velocities (JOUSTRV4.SRC:2991-3001) ────

describe('AC-1 — spawn: the egg inherits the victim (DEATH3)', () => {
  it('carries the victim BOTH velocities verbatim (SAME VELOCITIES)', async () => {
    const e = await loadEgg()
    const out = e.spawnEgg(victim({ velX: 6, velY: 0x0140 }))
    expect(out.velX, 'PVELX copied').toBe(6)
    expect(out.velY, 'PVELY copied').toBe(0x0140)
  })

  it('RESETS the bump registers to 0 (CLR PBUMPX / PBUMPY)', async () => {
    const e = await loadEgg()
    const out = e.spawnEgg(victim({ velX: 6, velY: 0x0140 }))
    expect(out.bumpX).toBe(0)
    expect(out.bumpY).toBe(0)
  })

  it('starts with PFEET=0 (air-catch bonus LIVE), hitCount 0, not settled', async () => {
    const e = await loadEgg()
    const out = e.spawnEgg(victim())
    expect(out.pfeet, 'PFEET 0 = not yet caught / not yet bounced').toBe(0)
    expect(out.hitCount).toBe(0)
    expect(out.settled).toBe(false)
  })

  it('DECrements the enemy eggs-left (a 4-egg enemy yields a 3-left egg)', async () => {
    const e = await loadEgg()
    expect(e.spawnEgg(victim({ eggsLeft: 4 })).eggsLeft, 'DEC PEGG at :3001').toBe(3)
    expect(e.spawnEgg(victim({ eggsLeft: 1 })).eggsLeft, 'a 1-left enemy yields a 0-left egg').toBe(0)
  })

  it('sits X+4 and 8 pixels ABOVE the dead enemy (ADDD #4 / SUBB #13-5)', async () => {
    const e = await loadEgg()
    const out = e.spawnEgg(victim({ posX: 100, posY: 100 << 8 }))
    expect(out.posX, 'egg X = victim X + 4').toBe(104)
    expect(out.posY >> 8, 'egg pixel-Y = victim pixel-Y − 8').toBe(92)
  })

  it('does not mutate the victim (purity)', async () => {
    const e = await loadEgg()
    const v = victim({ velX: 6, velY: 0x0140, eggsLeft: 4 })
    const before = snapshot(v)
    e.spawnEgg(v)
    expect(v).toEqual(before)
  })
})

// ─── AC-1 — BOUNCE: quarter-VY inverted, X index decays 2 (JOUSTRV4.SRC:3204-3218)

describe('AC-1 — bounce: quarter-VY inverted, X-index decays 2', () => {
  it('bounceVelY keeps a QUARTER of a downward velY, INVERTED: −(velY >> 2)', async () => {
    const e = await loadEgg()
    expect(e.bounceVelY(0x80), '128 → −(128>>2) = −32').toBe(-0x20)
    expect(e.bounceVelY(0x40), '64 → −16').toBe(-0x10)
    expect(e.bounceVelY(4), '4 → −1').toBe(-1)
  })

  it('bounceVelY uses an ARITHMETIC (flooring) >>2, not a divide-and-round', async () => {
    const e = await loadEgg()
    // 7 >> 2 = 1 (floored), negated = −1. A rounding /4 would give −2.
    expect(e.bounceVelY(7)).toBe(-1)
    expect(e.bounceVelY(0), '0 → 0').toBe(0)
  })

  it('decayVelX moves the FLYX index 2 TOWARD zero (both directions)', async () => {
    const e = await loadEgg()
    expect(e.decayVelX(6)).toBe(4)
    expect(e.decayVelX(2)).toBe(0)
    expect(e.decayVelX(-6)).toBe(-4)
    expect(e.decayVelX(-2)).toBe(0)
    expect(e.decayVelX(0), 'already 0 stays 0').toBe(0)
  })

  it('decayVelX subtracts a flat ±2 (an odd index overshoots zero — a faithful ROM quirk)', async () => {
    const e = await loadEgg()
    // ADDA #-2 / ADDA #2 are unconditional: +1 → −1, −1 → +1 (never reaching 0).
    expect(e.decayVelX(1)).toBe(-1)
    expect(e.decayVelX(-1)).toBe(1)
  })

  it('bounceEgg applies BOTH: X index decayed AND downward velY quarter-inverted', async () => {
    const e = await loadEgg()
    const out = e.bounceEgg(egg({ velX: 4, velY: 0x80 }))
    expect(out.velX, 'X index 4 → 2').toBe(2)
    expect(out.velY, 'velY 128 → −32').toBe(-0x20)
  })

  it('bounceEgg marks the egg landed (PFEET nonzero → the air-catch bonus is gone)', async () => {
    const e = await loadEgg()
    const out = e.bounceEgg(egg({ velX: 4, velY: 0x80, pfeet: 0 }))
    expect(out.pfeet, 'EGGBON STA PFEET — no more air bonus').not.toBe(0)
  })

  it('does not mutate its argument (purity)', async () => {
    const e = await loadEgg()
    const g = egg({ velX: 4, velY: 0x80 })
    const before = snapshot(g)
    e.bounceEgg(g)
    expect(g).toEqual(before)
  })
})

// ─── AC-1 — SETTLE: |VY| ≤ $20 AND X index === 0 — BOUNDARY-EXACT (:3219-3222) ─

describe('AC-1 — settle thresholds (exact $20 / $21, X index exact 0 / nonzero)', () => {
  it('settles at EXACTLY the $20 velY bound (the inclusive `CMPD #-$0020 / BLT` edge)', async () => {
    const e = await loadEgg()
    // A bounced velY of −$20 is NOT `< -$20`, so it settles (given X index 0).
    expect(e.eggSettles(-0x20, 0), 'velY −32, X 0 → settle').toBe(true)
  })

  it('does NOT settle one unit past — velY −$21 is still too fast to land', async () => {
    const e = await loadEgg()
    expect(e.eggSettles(-0x21, 0), 'velY −33 (`< -$20`) → keep bouncing').toBe(false)
  })

  it('does NOT settle while the X index is nonzero, even with velY in band', async () => {
    const e = await loadEgg()
    expect(e.eggSettles(-0x20, 2), 'X index 2 → keep bouncing').toBe(false)
    expect(e.eggSettles(0, 1), 'X index 1 → keep bouncing').toBe(false)
  })

  it('settles when both conditions hold — a slow, centred egg lands', async () => {
    const e = await loadEgg()
    expect(e.eggSettles(0, 0)).toBe(true)
    expect(e.eggSettles(-0x10, 0)).toBe(true)
  })

  it('the settle bound is SIGNED (`velY >= -$20`), NOT abs — a velY past +$20 still settles', async () => {
    const e = await loadEgg()
    // ROUND 2 (Reviewer) — the abs() discriminator. The ROM is `CMPD #-$0020 /
    // BLT`, a SIGNED lower bound. A velY of +$21 (33) has an ABSOLUTE value past
    // $20, yet it is still `>= -$20`, so it settles. An `abs(velY) <= $20` mutant
    // would REJECT it — the gap every velY ≤ 0 case misses (there signed = abs).
    expect(e.eggSettles(0x21, 0), 'signed law settles a +$21 velY; abs() would not').toBe(true)
  })

  it('bounceEgg reports settled iff the bounced velY and decayed X index qualify', async () => {
    const e = await loadEgg()
    // velX 2 → 0, velY 0x40 → −16 (in band) ⇒ settles.
    expect(e.bounceEgg(egg({ velX: 2, velY: 0x40 })).settled, 'X→0, velY −16 ⇒ settle').toBe(true)
    // velX 4 → 2 (nonzero) ⇒ does NOT settle even with a slow velY.
    expect(e.bounceEgg(egg({ velX: 4, velY: 0x40 })).settled, 'X index still 2 ⇒ no settle').toBe(false)
    // velX 2 → 0 but velY 0x100 → −64 (too fast) ⇒ does NOT settle.
    expect(e.bounceEgg(egg({ velX: 2, velY: 0x100 })).settled, 'velY −64 too fast ⇒ no settle').toBe(
      false,
    )
  })
})

// ─── AC-1 — the NARROW egg wrap [4,288] vs the entity band (:3141-3146) ────────

describe('AC-1 — the egg wraps in [4,288] — NARROWER than the entity band', () => {
  it('wraps at the RIGHT bound: 288 stays, 289 wraps to 5 (`CMPD #288 / BLE` edge)', async () => {
    const e = await loadEgg()
    expect(e.wrapEggX(288), '288 is in-band (BLE skips)').toBe(288)
    expect(e.wrapEggX(289), '289 → 289 − 284 = 5').toBe(5)
  })

  it('wraps at the LEFT bound: 4 stays, 3 wraps to 287 (`CMPD #4 / BGE` edge)', async () => {
    const e = await loadEgg()
    expect(e.wrapEggX(4), '4 is in-band (BGE skips)').toBe(4)
    expect(e.wrapEggX(3), '3 → 3 + 284 = 287').toBe(287)
  })

  it('leaves a mid-band X untouched', async () => {
    const e = await loadEgg()
    expect(e.wrapEggX(150)).toBe(150)
  })

  it('DIFFERS from the entity wrap exactly in the (288,292] and [−10,4) fringes', async () => {
    const e = await loadEgg()
    const arena = await loadArena()
    // 290 is legal for an ENTITY (≤ ERIGHT 292) but out-of-band for an EGG.
    expect(arena.wrapX(290), 'entity: 290 stays').toBe(290)
    expect(e.wrapEggX(290), 'egg: 290 → 6').toBe(6)
    // 2 is legal for an ENTITY (≥ ELEFT −10) but below the egg's left bound.
    expect(arena.wrapX(2), 'entity: 2 stays').toBe(2)
    expect(e.wrapEggX(2), 'egg: 2 → 286').toBe(286)
  })

  it('AGREES with the entity wrap on a value both leave alone (a non-vacuous control)', async () => {
    const e = await loadEgg()
    const arena = await loadArena()
    expect(e.wrapEggX(150)).toBe(arena.wrapX(150))
  })
})

// ─── AC-2 — value ladder (capped) + the +500 air catch (:3097-3104, :3065-3069)

describe('AC-2 — the value ladder caps at 1000; the mid-air catch pays 500', () => {
  it('the decoded ladder is [250, 500, 750, 1000] (DVALUE-decoded, not raw ×100)', async () => {
    const e = await loadEgg()
    expect([...e.EGG_VALUE_LADDER]).toEqual([250, 500, 750, 1000])
    expect(e.eggValue(1)).toBe(250)
    expect(e.eggValue(2)).toBe(500)
    expect(e.eggValue(3), '$57 via SCRTEN = 750, NOT 5700').toBe(750)
    expect(e.eggValue(4)).toBe(1000)
  })

  it('eggValue caps at 1000 by its OWN clamp — index 5 and 6 do not read past the table', async () => {
    const e = await loadEgg()
    // ROUND 2 (Reviewer) — prove eggValue's OWN cap, not just bumpEggHits's peg.
    // Without an internal clamp, EGG_VALUE_LADDER[4] / [5] is `undefined`.
    expect(e.eggValue(5)).toBe(1000)
    expect(e.eggValue(6)).toBe(1000)
  })

  it('the hit counter PEGS at 4 (`CMPB #4 / BHS`) — boundary-exact', async () => {
    const e = await loadEgg()
    expect(e.bumpEggHits(0), 'first hit → 1').toBe(1)
    expect(e.bumpEggHits(3), '3 → 4').toBe(4)
    expect(e.bumpEggHits(4), '4 → 4 (pegged)').toBe(4)
  })

  it('repeated catches escalate then CAP at 1000 — never read past the 4-entry table', async () => {
    const e = await loadEgg()
    const seen: number[] = []
    let count = 0
    for (let i = 0; i < 6; i++) {
      count = e.bumpEggHits(count)
      seen.push(e.eggValue(count))
    }
    expect(seen, 'the 5th and 6th catch stay 1000 (capped)').toEqual([250, 500, 750, 1000, 1000, 1000])
  })

  it('the air catch pays 500 iff the egg is still airborne (PFEET === 0)', async () => {
    const e = await loadEgg()
    expect(e.airCatchBonus(0), 'PFEET 0 = caught in the air → +500').toBe(500)
    expect(e.airCatchBonus(1), 'PFEET nonzero = already landed → 0').toBe(0)
    expect(e.airCatchBonus(8), 'a ledge egg (PFEET 8) pays no air bonus').toBe(0)
  })

  it('eggScoreEvents emits the ladder value THEN the air bonus (events, no accumulation)', async () => {
    const e = await loadEgg()
    // Caught mid-air (pfeet 0) on the first hit: [250, 500].
    expect(e.eggScoreEvents(egg({ hitCount: 0, pfeet: 0 }))).toEqual([250, 500])
    // Caught after landing (pfeet nonzero) on the second hit: [500] only.
    expect(e.eggScoreEvents(egg({ hitCount: 1, pfeet: 1 }))).toEqual([500])
  })
})

// ─── AC-3 — hatch remount (FARTHER edge, max speed) + PEGG permadeath ─────────

describe('AC-3 — hatch: remount from the FARTHER edge; the 4th egg is permadeath', () => {
  it('hatches while eggs remain; the last egg (eggsLeft 0) is PERMADEATH — boundary', async () => {
    const e = await loadEgg()
    expect(e.willHatch(egg({ eggsLeft: 1 })), '1 left → hatch').toBe(true)
    expect(e.willHatch(egg({ eggsLeft: 0 })), '0 left → permadeath, no hatch').toBe(false)
  })

  it('the full 4-egg chain: a fresh enemy yields four eggs, the FOURTH is permadeath', async () => {
    const e = await loadEgg()
    // Enemy starts PEGG=4. Each kill spawns an egg (DEC PEGG); a hatched buzzard
    // carries the same eggsLeft forward, killed again, etc.
    let eggsLeft = 4
    const hatched: boolean[] = []
    for (let kill = 0; kill < 4; kill++) {
      const spawned = e.spawnEgg(victim({ eggsLeft }))
      hatched.push(e.willHatch(spawned))
      eggsLeft = spawned.eggsLeft // the buzzard remounts carrying this
    }
    expect(hatched, 'eggs 1-3 hatch; egg 4 (PEGG→0) is permadeath').toEqual([true, true, true, false])
  })

  it('an egg in the RIGHT half enters from the LEFT edge flying RIGHT (the FARTHER edge)', async () => {
    const e = await loadEgg()
    const entry = e.remountEntryEdge(200) // 200 > 151
    expect(entry.posX, 'starts at ELEFT+1 = −9 (left edge)').toBe(e.REMOUNT_ENTRY_LEFT_X)
    expect(entry.posX).toBe(-9)
    expect(entry.velX, 'flies RIGHT at max speed +8').toBe(8)
    expect(entry.facing).toBe(1)
  })

  it('an egg in the LEFT half enters from the RIGHT edge flying LEFT (the FARTHER edge)', async () => {
    const e = await loadEgg()
    const entry = e.remountEntryEdge(100) // 100 ≤ 151
    expect(entry.posX, 'starts at ERIGHT-1 = 291 (right edge)').toBe(e.REMOUNT_ENTRY_RIGHT_X)
    expect(entry.posX).toBe(291)
    expect(entry.velX, 'flies LEFT at max speed −8').toBe(-8)
    expect(entry.facing).toBe(-1)
  })

  it('the side split is exact at the 151-px half-width (`BHI` boundary)', async () => {
    const e = await loadEgg()
    // 151 is NOT `> 151` (BHI not taken) → LEFT-half path → RIGHT edge.
    expect(e.remountEntryEdge(151).posX, '151 → left half → right edge').toBe(291)
    // 152 IS `> 151` → RIGHT-half path → LEFT edge.
    expect(e.remountEntryEdge(152).posX, '152 → right half → left edge').toBe(-9)
  })

  it('always enters at MAX FLYX speed 8 (LDA #8), whichever edge', async () => {
    const e = await loadEgg()
    expect(Math.abs(e.remountEntryEdge(200).velX)).toBe(e.REMOUNT_MAX_VELX)
    expect(Math.abs(e.remountEntryEdge(50).velX)).toBe(8)
  })

  it('the remount DEBITS the intelligence budget (MOUNRI INC NSMART) — like a promotion', async () => {
    const e = await loadEgg()
    const enemy = await loadEnemy()
    const budget: IntelBudget = { nsmart: 1, wsmart: 4 }
    const debited = e.remountBudgetDebit(budget)
    expect(debited.nsmart, 'INC NSMART').toBe(2)
    expect(debited.wsmart, 'WSMART untouched').toBe(4)
    // The seam is the SAME budget delta a LINET promotion applies (jt2-2).
    const promoted = enemy.promote(
      { entity: {} as never, facing: 1, pchase: 0, brain: 'linet', decision: 'boundr' },
      budget,
    )
    expect(debited.nsmart, 'the remount debit matches a LINET promotion').toBe(promoted.budget.nsmart)
  })

  it('remountBudgetDebit does not mutate the budget (purity)', async () => {
    const e = await loadEgg()
    const budget: IntelBudget = { nsmart: 1, wsmart: 4 }
    const before = snapshot(budget)
    e.remountBudgetDebit(budget)
    expect(budget).toEqual(before)
  })
})

// ─── AC-4 — determinism + the tagged-union ruling ─────────────────────────────

describe('AC-4 — a joust-kill → egg → hatch sequence replays bit-for-bit', () => {
  it('the whole pipeline is deterministic (RNG-free): two runs are byte-identical', async () => {
    const e = await loadEgg()
    const run = (): unknown[] => {
      const out: unknown[] = []
      let g = e.spawnEgg(victim({ posX: 200, velX: 4, velY: 0x80, eggsLeft: 4 }))
      out.push(g)
      // Script three land-contacts (each re-enters downward), then hatch + remount.
      for (let i = 0; i < 3; i++) {
        g = e.bounceEgg({ ...g, velY: 0x40 })
        out.push(g)
      }
      out.push(e.willHatch(g))
      out.push(e.remountEntryEdge(g.posX))
      return out
    }
    expect(run()).toEqual(run())
  })
})

describe('AC-4 — the egg fields ride the tagged union, NOT the shared struct', () => {
  it('an EggState is a DISTINCT variant — it is not a flight EntityState with extras', async () => {
    const e = await loadEgg()
    const g = e.spawnEgg(victim())
    // The shared flight EntityState fields must NOT appear on the egg variant —
    // the egg does not grow (or ride) the shared struct.
    for (const flightOnly of ['velXIndex', 'velXFrac', 'timeUp', 'airborne'] as const) {
      expect(flightOnly in g, `EggState must not carry the flight field \`${flightOnly}\``).toBe(false)
    }
  })

  it('the egg-specific fields live ON the egg variant', async () => {
    const e = await loadEgg()
    const g = e.spawnEgg(victim())
    for (const eggField of ['eggsLeft', 'hitCount', 'pfeet', 'settled'] as const) {
      expect(eggField in g, `EggState must carry \`${eggField}\``).toBe(true)
    }
  })
})
