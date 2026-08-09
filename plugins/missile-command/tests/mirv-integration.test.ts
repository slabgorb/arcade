// plugins/missile-command/tests/mirv-integration.test.ts
//
// Story mc5-1 — RED phase (Tyr One-Handed / TEA). AC3: the MIRV split WIRED into
// stepGame. Each frame, after enemy warheads fly, every eligible in-band ballistic
// ICBM forks into <=3 children — UNLESS >=12 explosions are live (the ROM's EXPLCT
// suppression, W3MAIN.MAC:1533-1537, decimal 12). This keeps the sneaky Dev honest:
// the pure reducer (mirv.test.ts) can be perfect and still be unwired.
//
// ISOLATION: each fixture pins `remaining: 0` so the spawner adds NO ICBMs — every
// change in `icbms.length` is therefore MIRV, not a spawn. The injected explosions
// are REAL `startExplosion(...)` records (not fabricated stand-ins) placed far from
// the band ICBM (low V) so they neither catch it nor its children.
//
// WHY RED: stepGame does not split yet — a band ICBM produces no children, and the
// suppression boundary does not exist.

import { describe, it, expect } from 'vitest'
import { createGame, stepGame, type GameState } from '../src/core/game.js'
import { NICBMS } from '../src/core/spawn.js'
import { launchIcbm } from '../src/core/icbm.js'
import { launchAbm } from '../src/core/abm.js'
import { startExplosion, type Explosion } from '../src/core/explosion.js'

// A ballistic ICBM parked mid-descent (V=150), squarely inside the MIRV band [128,160].
// `h` varies so several distinct in-band ICBMs can coexist in one fixture.
const bandIcbmAt = (h: number) => ({ ...launchIcbm({ h, v: 200 }, { h: 40, v: 16 }), pos: { h, v: 150 } })
const bandIcbm = () => bandIcbmAt(120)

// N genuine explosions, low on the field (V≈20) and to the left (H 8..) — far from
// the band ICBM at (120,150), so damage detection never touches the MIRV chain.
const liveBlasts = (n: number): Explosion[] => Array.from({ length: n }, (_, i) => startExplosion(8 + i, 20))

// A play-phase game with the band ICBM, no pending spawns, and `n` live explosions.
function fixture(n: number): GameState {
  return { ...createGame(11), icbms: [bandIcbm()], explosions: liveBlasts(n), remaining: 0 }
}

describe('mc5-1 AC3 — MIRV split wired into stepGame', () => {
  it('a lone band ICBM forks into EXACTLY 3 children on the first frame (1 parent + 3)', () => {
    // Exact, not >before: 1 band ICBM, openSlots = NICBMS(8) − 1 = 7 ≥ 3, so the split
    // emits its full MIRV_MAX_CHILDREN. A 1-child mutant would give 2 and survive a > check.
    expect(stepGame(fixture(0)).icbms.length).toBe(4)
  })

  it('splits with 11 live explosions (EXACTLY 4) but is SUPPRESSED at 12 (the EXPLCT boundary)', () => {
    expect(stepGame(fixture(11)).icbms.length).toBe(4) // 11 < 12 → parent + 3 children
    expect(stepGame(fixture(12)).icbms.length).toBe(1) // 12 >= 12 → suppressed, lone parent flies on
  })

  it('never lets the roster exceed the NICBMS on-screen ceiling, truncating the split into the open slots', () => {
    // mc5-6: MIRVER shares the 8-slot POTENT/ICOPEN loop, so children fill up to the
    // NICBMS(8) table, not MXICON(7). Six in-band ICBMs → openSlots = NICBMS(8) − 6 = 2,
    // so the ONE split this frame adds exactly two children (its third is sliced off):
    // the roster lands on NICBMS, not 9.
    // Removing the cap (.slice(0, openSlots)) makes this 9 — the guard the mutation proved missing.
    const six = { ...createGame(5), icbms: Array.from({ length: 6 }, (_, i) => bandIcbmAt(20 + i * 12)), remaining: 0 }
    let s = stepGame(six)
    expect(s.icbms.length).toBe(NICBMS) // === NICBMS(8)
    for (let i = 0; i < 6; i++) {
      s = stepGame(s)
      expect(s.icbms.length).toBeLessThanOrEqual(NICBMS) // never exceeds NICBMS across frames
    }
  })

  it('MIRVs at most ONE ICBM per frame even when several are simultaneously in-band', () => {
    // Two in-band ICBMs, openSlots = NICBMS(8) − 2 = 6. One-per-frame → exactly one splits
    // (+3 children) → 5 total. If BOTH split it would be 2 + 6 = 8 — so === 5
    // is the one-per-frame guard the tie-break mutation proved missing.
    const two = { ...createGame(5), icbms: [bandIcbmAt(60), bandIcbmAt(180)], remaining: 0 }
    expect(stepGame(two).icbms.length).toBe(5)
  })

  it('suppression reads the PRE-frame explosion count — a same-frame detonation does not flip 11→12', () => {
    // 11 live blasts + one ABM arriving THIS frame (its detonation would be a 12th, far from
    // everything). Suppression gates on state.explosions (11, pre-aging), NOT the post-frame
    // array, so the band ICBM still splits → 4. Guards against a future reordering that moved
    // the explosion-aging ahead of the MIRV gate.
    const arriving = { ...launchAbm({ h: 210, v: 16 }, { h: 210, v: 100 }), pos: { h: 210, v: 100 } }
    const s = { ...createGame(5), icbms: [bandIcbm()], abms: [arriving], explosions: liveBlasts(11), remaining: 0 }
    expect(stepGame(s).icbms.length).toBe(4)
  })
})
