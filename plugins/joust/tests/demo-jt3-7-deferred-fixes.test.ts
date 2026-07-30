// tests/demo-jt3-7-deferred-fixes.test.ts
//
// Story jt3-7 — RED phase (Leeloo / TEA). The TWO deferred fixes the prior stories
// carried forward "to fix when the resolver / grip goes LIVE" (jt3-4, jt3-3). This
// is that moment — the demo makes both reachable, so the edges must be pinned.
//
// ─── FIX 1: the degenerate `facingInto` equal-column edge (jt3-4) ────────────
// resolvePteroAttack computes facingInto as `player.facing === Math.sign(ptero.posX
// − player.posX)`. When the player and ptero share a column the delta is 0 and
// `Math.sign(0) === 0`, so facingInto is false for BOTH facings — the kill is
// refused. The ROM does NOT refuse it: COLDX = ptero.posX − player.posX, and the
// facing test is `LDD COLDX / ... / BPL` (branch on PLUS), and 0 IS plus — an
// equal-column contact with the other tests satisfied KILLS the ptero
// (JOUSTRV4.SRC:4994-5001). `Math.sign(0)=0` is the JS/6809 mismatch.
//
// ─── FIX 2: the troll lava-death off the top (jt3-3) ─────────────────────────
// stepGrip integrates posY with NO 16-bit wrap (troll.ts: "posY is NOT wrapped"),
// and isLavaDeath does `(posY >> 8) >= DEATH_Y` — a SIGNED JS shift. The ROM's
// ADDLAV does `ADDD PPOSY+1` (a 16-bit add that WRAPS) then `CMPA #FLOOR+7 / BHS`
// on the HIGH byte read UNSIGNED (JOUSTRV4.SRC:6508-6509 / arena.ts). So a victim
// driven off the TOP of the screen — posY going negative as a signed JS number —
// wraps to a 16-bit value whose unsigned high byte is ≥ DEATH_Y (0xE6 = 230) and
// registers a lava death. The signed shift misses it (a negative >> 8 is negative,
// never ≥ 230), so the victim floats off the top alive. The fix: wrap posY UNSIGNED
// to 16 bits before the compare.

import { describe, it, expect } from 'vitest'
import { loadPtero, type JoustEntity, type PteroEntity } from './helpers/ptero-contract.js'
import { loadTroll, type TrollGrip } from './helpers/troll-contract.js'

/** DEATH_Y = FLOOR+7 = 0xE6 = 230 (arena.ts, JOUSTRV4.SRC:6508). */
const DEATH_Y = 0xe6

function playerEntity(over: Partial<JoustEntity> = {}): JoustEntity {
  return {
    posX: 100,
    posY: 110 << 8,
    velY: 0,
    velX: 0,
    plantZ: 0,
    facing: 1,
    bumpX: 0,
    bumpY: 0,
    party: 'player',
    collision: null,
    groundState: null,
    ...over,
  }
}

function pteroEntity(over: Partial<PteroEntity> = {}): PteroEntity {
  return { posX: 100, posY: 100 << 8, facing: -1, attackFrame: false, ...over }
}

// ═════════════════════════════════════════════════════════════════════════════
// FIX 1 — the equal-column ptero kill (Math.sign(0) = 0, ROM COLDX=0 is BPL/kill).
// ═════════════════════════════════════════════════════════════════════════════
describe('jt3-4 deferred — resolvePteroAttack kills in the SAME column (COLDX=0 is BPL, RED)', () => {
  it('CONTROL — a normal offset-column kill resolves (all three tests pass, facing into)', async () => {
    const ptero = await loadPtero()
    // Player at x=100 faces right into a ptero 4px to its right; lance offset 10
    // (glide band 10±2); opposite facings. This is the already-working path.
    const out = ptero.resolvePteroAttack(
      playerEntity({ posX: 100, posY: 110 << 8, facing: 1 }),
      pteroEntity({ posX: 104, posY: 100 << 8, facing: -1 }),
    )
    expect(out.kind, 'the offset-column contact kills the ptero').toBe('kill')
  })

  it('a SAME-column contact with the same band + opposite facings must ALSO kill', async () => {
    const ptero = await loadPtero()
    // Identical to the control EXCEPT ptero.posX === player.posX. lanceOffset =
    // 0 + 110 − 100 = 10 (in band); opposite facings; and COLDX = 0, which the ROM
    // treats as "facing into" (BPL). Math.sign(0)=0 makes the current code refuse it.
    const out = ptero.resolvePteroAttack(
      playerEntity({ posX: 100, posY: 110 << 8, facing: 1 }),
      pteroEntity({ posX: 100, posY: 100 << 8, facing: -1 }),
    )
    expect(
      out.kind,
      'an equal-column lance-height hit kills the ptero — COLDX=0 is BPL, not a no-kill (Math.sign(0) bug)',
    ).toBe('kill')
  })

  it('the equal-column kill still requires the OTHER tests — a same-facing pair does not kill', async () => {
    // Guards against a lazy fix that just forces same-column → kill: same facings
    // must still fall through to pteroWins even in the same column.
    const ptero = await loadPtero()
    const out = ptero.resolvePteroAttack(
      playerEntity({ posX: 100, posY: 110 << 8, facing: 1 }),
      pteroEntity({ posX: 100, posY: 100 << 8, facing: 1 }), // SAME facing
    )
    expect(out.kind, 'same facings never kill, column notwithstanding').toBe('pteroWins')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// FIX 2 — the troll lava-death off the top (16-bit wrap + unsigned high-byte compare).
// ═════════════════════════════════════════════════════════════════════════════
describe('jt3-3 deferred — stepGrip registers a lava death for a victim driven off the top (RED)', () => {
  /** A grip whose only live field for stepGrip is `pull`. */
  const grip = (pull: number): TrollGrip => ({ pull, killTimer: 1 })

  it('CONTROL — a victim pulled DOWN past the lava line dies (the normal path still works)', async () => {
    const troll = await loadTroll()
    // posY at pixel 229 (just above the death line), a downward VY + pull crosses it.
    const out = troll.stepGrip(0x0100, 229 << 8, grip(0x0100), false)
    expect(out.escaped, 'not an escape').toBe(false)
    expect(out.inLava, 'crossing FLOOR+7 downward is a lava death').toBe(true)
  })

  it('a victim driven off the TOP (posY wraps to high-byte ≥ 230 unsigned) registers a lava death', async () => {
    const troll = await loadTroll()
    // velY = −684 up, pull 384: post-pull VY = −300 (NOT an escape: −300 !< −384),
    // so the position integrates: posY = 200 + (−300) = −100. As a SIGNED JS number
    // (−100 >> 8 = −1) the current code misses the death; the 16-bit-wrapped value
    // 0xFF9C has unsigned high byte 0xFF = 255 ≥ 230, which the ROM reads as lava.
    const out = troll.stepGrip(-684, 200, grip(0x0180), false)
    expect(out.escaped, 'the victim did NOT break free (VY −300 is above the −384 threshold)').toBe(false)
    expect(
      out.inLava,
      'the off-the-top wrap has unsigned high byte ≥ 230 — the ROM registers a lava death (CMPA/BHS)',
    ).toBe(true)
  })

  it('and the returned posY is wrapped UNSIGNED into the 16-bit range (never left negative)', async () => {
    const troll = await loadTroll()
    const out = troll.stepGrip(-684, 200, grip(0x0180), false)
    // The 6809 posY is a 16-bit UNSIGNED word (0..0xFFFF). int16 (signed) would keep
    // it negative and re-break the compare — the wrap must be `& 0xFFFF`.
    expect(out.posY, 'posY is a 16-bit unsigned value ≥ 0').toBeGreaterThanOrEqual(0)
    expect(out.posY, 'posY stays within the 16-bit word').toBeLessThanOrEqual(0xffff)
    expect(out.posY >> 8, 'and its unsigned high byte is the lava-death pixel (≥ 230)').toBeGreaterThanOrEqual(DEATH_Y)
  })
})
