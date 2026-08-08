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
import { launchIcbm } from '../src/core/icbm.js'
import { startExplosion, type Explosion } from '../src/core/explosion.js'

// One ballistic ICBM parked mid-descent, squarely inside the MIRV band [128,160].
const bandIcbm = () => ({ ...launchIcbm({ h: 120, v: 200 }, { h: 40, v: 16 }), pos: { h: 120, v: 150 } })

// N genuine explosions, low on the field (V≈20) and to the left (H 8..) — far from
// the band ICBM at (120,150), so damage detection never touches the MIRV chain.
const liveBlasts = (n: number): Explosion[] => Array.from({ length: n }, (_, i) => startExplosion(8 + i, 20))

// A play-phase game with the band ICBM, no pending spawns, and `n` live explosions.
function fixture(n: number): GameState {
  return { ...createGame(11), icbms: [bandIcbm()], explosions: liveBlasts(n), remaining: 0 }
}

describe('mc5-1 AC3 — MIRV split wired into stepGame', () => {
  it('a band ICBM forks into extra warheads (no explosions live)', () => {
    let s = fixture(0)
    const before = s.icbms.length // 1
    let maxSeen = before
    for (let i = 0; i < 3; i++) {
      s = stepGame(s)
      maxSeen = Math.max(maxSeen, s.icbms.length)
    }
    expect(maxSeen).toBeGreaterThan(before) // children appeared within a few frames
  })

  it('splits with 11 live explosions but is SUPPRESSED at 12 (the EXPLCT boundary)', () => {
    // 11 < 12 → the split is allowed: parent + up to 3 children.
    const at11 = stepGame(fixture(11))
    expect(at11.icbms.length).toBeGreaterThan(1)

    // 12 >= 12 → suppressed: the lone parent flies on, no children this frame.
    const at12 = stepGame(fixture(12))
    expect(at12.icbms.length).toBe(1)
  })
})
