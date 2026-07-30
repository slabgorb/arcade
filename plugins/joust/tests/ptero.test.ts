// tests/ptero.test.ts
//
// Story jt3-4 — RED phase (Leeloo / TEA). The BEHAVIOUR of the pterodactyl: the
// gravity-EXEMPT flight that holds altitude where a mount falls (AC-1), the
// lance-height kill window with EVERY branch of its two-band predicate + the three
// failing conditions that each drop into the ptero-wins normal joust (AC-2), the
// ptero wave type spawning pteros from the wave-table nibble through jt2-5's
// dispatch (AC-3), and bit-for-bit determinism through a seeded kill and a seeded
// loss (AC-4). The source re-derivation + the SCRHUN→1000 derivation + claims live
// in the companion tests/ptero-source.test.ts; the demo call-site pin (the wave
// type going LIVE) in tests/demo-ptero.test.ts.
//
// ─── MUTATION-RESISTANCE (the jt1-4 lesson, applied) ─────────────────────────
// The kill window is pinned at its EXACT band edges, both bands, so a Dev who
// widens/narrows a tolerance or shifts a centre reddens:
//   • attacking frame (FLY3): kills at offset 5 and 11 (|off−8| == 3), NOT at 4/12;
//   • glide frame (FLY1/FLY2): kills at offset 8 and 12 (|off−10| == 2), NOT at 7/13.
// And each of the three tests (band / opposite-facings / facing-into) has a
// dedicated loss case with the OTHER two held, so dropping any single test from the
// AND is caught. The gravity exemption asserts the ptero's VY is EXACTLY unchanged
// (a stray `+ GRAV` mutant reddens), not merely "less than the mount".

import { describe, it, expect } from 'vitest'
import { loadPtero, type PteroEntity, type PteroModule } from './helpers/ptero-contract.js'
import { loadFlight } from './helpers/flight-contract.js'
import { loadWave } from './helpers/wave-contract.js'
import type { EntityState, PlayerInput, JoustEntity } from './helpers/ptero-contract.js'

const NO_INPUT: PlayerInput = { dir: 0, flap: false, flapHeld: false }
const BOTH_ALIVE = { p1: true, p2: true }

/** A mid-screen airborne entity, well above the ptero's floor clamp ($D3). */
function airborne(overrides: Partial<EntityState> = {}): EntityState {
  return {
    posX: 100,
    posY: 100 << 8,
    velXIndex: 0,
    velXFrac: 0,
    velY: 0,
    timeUp: 0,
    groundState: null,
    plantZ: 0,
    airborne: true,
    ...overrides,
  }
}

/** A player joust participant at pixel (x, y) facing `facing`. */
function player(x: number, y: number, facing: 1 | -1, plantZ = 0): JoustEntity {
  return {
    posX: x,
    posY: y << 8,
    velY: 0,
    velX: 0,
    plantZ,
    facing,
    bumpX: 0,
    bumpY: 0,
    party: 'player',
    collision: null,
    groundState: null,
  }
}

/** A ptero at pixel (x, y). */
function ptero(x: number, y: number, facing: 1 | -1, attackFrame: boolean): PteroEntity {
  return { posX: x, posY: y << 8, facing, attackFrame }
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — GRAVITY EXEMPTION. The ptero holds altitude with NO flap where a mount
// falls (FLYXP, "NO GRAVITY!", JOUSTRV4.SRC:1506,1587-1595; ADDGRX skips ADDB GRAV).
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 — the ptero is gravity-exempt: it holds altitude where a mount falls', () => {
  it('one frame: the mount gains gravity in VY, the ptero gains NOTHING', async () => {
    const p = await loadPtero()
    const f = await loadFlight()
    const base = airborne()

    const mount = f.stepFlight(base, NO_INPUT)
    const bird = p.stepPteroFlight(base, NO_INPUT)

    // The mount adds the wings-up gravity of the pair (GRAV+4) to VY every frame.
    expect(mount.velY, 'the mount falls: VY picks up gravity').toBe(f.GRAVITY_WINGS_UP)
    // The ptero enters at ADDGRX, one instruction PAST `ADDB GRAV` — VY is untouched.
    expect(bird.velY, 'the ptero: NO gravity — VY exactly unchanged').toBe(0)
  })

  it('a no-input drift: the ptero pixel-Y never moves; the mount sinks below it', async () => {
    const p = await loadPtero()
    const f = await loadFlight()
    const start = airborne()

    let mount = start
    let bird = start
    for (let i = 0; i < 40; i++) {
      mount = f.stepFlight(mount, NO_INPUT)
      bird = p.stepPteroFlight(bird, NO_INPUT)
    }

    const startPixel = start.posY >> 8
    expect(bird.posY, 'the ptero holds altitude — 8.8 Y bit-for-bit unchanged').toBe(start.posY)
    expect(bird.posY >> 8, 'ptero pixel-Y is exactly where it started').toBe(startPixel)
    expect(bird.velY, 'and VY never accumulated any gravity').toBe(0)
    expect(mount.posY >> 8, 'the mount, under the same no-input, has FALLEN below').toBeGreaterThan(startPixel)
    expect(mount.velY, 'the mount kept accumulating gravity').toBeGreaterThan(0)
  })

  it('wings DOWN (flapHeld) still adds no gravity to the ptero — a mount would still sink', async () => {
    const p = await loadPtero()
    const f = await loadFlight()
    const held: PlayerInput = { dir: 0, flap: false, flapHeld: true }
    const base = airborne()

    expect(f.stepFlight(base, held).velY, 'the mount sinks under wings-down gravity too').toBe(
      f.GRAVITY_WINGS_DOWN,
    )
    expect(p.stepPteroFlight(base, held).velY, 'the ptero: still no gravity, holds').toBe(0)
  })

  it('FLYXP is the WIDER ladder: ±$0300 endpoints, zero in the middle (vs the mount FLYX ±$0200)', async () => {
    const p = await loadPtero()
    expect(p.PTERO_FLYX.length, 'nine rungs, index −8..+8').toBe(9)
    expect(p.PTERO_FLYX[4], 'the zero rung sits in the MIDDLE (the FLYX house convention)').toBe(0)
    expect(p.PTERO_FLYX[0], 'index −8 rung is −$0300').toBe(-0x0300)
    expect(p.PTERO_FLYX[8], 'index +8 rung is +$0300').toBe(0x0300)
    expect(p.PTERO_FLYX_MAX, 'the ptero tops out at $0300 — wider than the mount $0200').toBe(0x0300)
    expect(p.PTERO_FLYX_MAX, 'sanity: $0300 is 768 decimal').toBe(768)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — THE LANCE-HEIGHT KILL WINDOW. All three tests must hold to kill the ptero
// (→1000); failing any single one drops into the normal joust, which the ptero wins.
// (JOUSTRV4.SRC:4971-5002)
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-2 — the lance-height kill window: kill only when band + opposite + facing-into', () => {
  // The lance offset B = player.plantZ + player.pixelY − ptero.pixelY. With the
  // player at pixel 100 and plantZ 0, offset == 100 − pteroPixelY, so a chosen
  // offset picks the ptero's pixel-Y as (100 − offset).
  const PX = 100

  /** A kill setup: ptero on the RIGHT (side +1), player facing +1 (into it), opposite facings. */
  function killSetup(offset: number, attackFrame: boolean): { pl: JoustEntity; pt: PteroEntity } {
    return { pl: player(PX, PX, 1), pt: ptero(PX + 20, PX - offset, -1, attackFrame) }
  }

  it('lanceOffset re-derives B = plantZ + playerPixel − pteroPixel (PLANTZ included)', async () => {
    const p = await loadPtero()
    // plantZ 0: offset is the pure pixel delta.
    expect(p.lanceOffset(player(100, 100, 1, 0), ptero(120, 92, -1, true))).toBe(8)
    // A skidding player (plantZ 2) LOWERS the lance — the offset grows by 2.
    expect(
      p.lanceOffset(player(100, 100, 1, 2), ptero(120, 92, -1, true)),
      'PLANTZ shifts the band — a skid (plantZ 2) adds 2 to the offset',
    ).toBe(10)
  })

  it('KILL: attacking frame, offset in the 8±3 band, opposite facings, player facing into → 1000', async () => {
    const p = await loadPtero()
    const { pl, pt } = killSetup(8, true) // dead centre of the attacking band
    const out = p.resolvePteroAttack(pl, pt)
    expect(out.kind, 'all three tests hold — the ptero dies').toBe('kill')
    if (out.kind === 'kill') expect(out.score, 'the kill is worth 1000 (SCRHUN chain)').toBe(1000)
  })

  it('KILL works with the ptero on the LEFT too (COLDX<0 branch): player faces left into it', async () => {
    const p = await loadPtero()
    // ptero to the LEFT (side −1); player faces −1 (into it); opposite facings (ptero +1).
    const pl = player(PX, PX, -1)
    const pt = ptero(PX - 20, PX - 8, 1, true)
    expect(p.resolvePteroAttack(pl, pt).kind, 'the left-side kill branch (:4996-4998) is reachable').toBe('kill')
  })

  it('LOSS #1 — BAND fail: offset outside the band (opposite + facing-into held) → pteroWins', async () => {
    const p = await loadPtero()
    const { pl, pt } = killSetup(12, true) // |12−8| = 4 > 3 → out of the attacking band
    expect(p.resolvePteroAttack(pl, pt).kind, 'the lance is too far — the ptero wins the joust').toBe(
      'pteroWins',
    )
  })

  it('LOSS #2 — SAME facings (band + facing-into held) → pteroWins', async () => {
    const p = await loadPtero()
    // Both facing right — NOT opposite (EORA PFACE / BPL, :4991-4993).
    const pl = player(PX, PX, 1)
    const pt = ptero(PX + 20, PX - 8, 1, true) // same facing as the player
    expect(p.resolvePteroAttack(pl, pt).kind, 'same facings cannot kill a ptero').toBe('pteroWins')
  })

  it('LOSS #3 — player facing AWAY (band + opposite held) → pteroWins', async () => {
    const p = await loadPtero()
    // ptero on the RIGHT (side +1) but the player faces LEFT (away); facings opposite.
    const pl = player(PX, PX, -1)
    const pt = ptero(PX + 20, PX - 8, 1, true)
    expect(p.resolvePteroAttack(pl, pt).kind, 'facing away from the ptero cannot kill it').toBe('pteroWins')
  })

  it('THE ATTACKING band (FLY3) is EXACTLY 8 ± 3 — mutation-resistant edges', async () => {
    const p = await loadPtero()
    expect(p.ATTACK_BAND_CENTER).toBe(8)
    expect(p.ATTACK_BAND_TOL).toBe(3)
    for (const [offset, expected] of [
      [5, 'kill'], // |5−8| == 3 → the low edge kills
      [8, 'kill'], // centre
      [11, 'kill'], // |11−8| == 3 → the high edge kills
      [4, 'pteroWins'], // |4−8| == 4 → just outside
      [12, 'pteroWins'], // |12−8| == 4 → just outside
    ] as const) {
      const { pl, pt } = killSetup(offset, true)
      expect(p.resolvePteroAttack(pl, pt).kind, `attacking-frame offset ${offset}`).toBe(expected)
    }
  })

  it('THE GLIDE band (FLY1/FLY2, wings up) is EXACTLY 10 ± 2 — mutation-resistant edges', async () => {
    const p = await loadPtero()
    expect(p.GLIDE_BAND_CENTER).toBe(10)
    expect(p.GLIDE_BAND_TOL).toBe(2)
    for (const [offset, expected] of [
      [8, 'kill'], // |8−10| == 2 → the low edge kills
      [10, 'kill'], // centre
      [12, 'kill'], // |12−10| == 2 → the high edge kills
      [7, 'pteroWins'], // |7−10| == 3 → just outside
      [13, 'pteroWins'], // |13−10| == 3 → just outside
    ] as const) {
      const { pl, pt } = killSetup(offset, false) // false → the glide band
      expect(p.resolvePteroAttack(pl, pt).kind, `glide-frame offset ${offset}`).toBe(expected)
    }
  })

  it('the two bands DIFFER — the frame flag really switches the predicate', async () => {
    const p = await loadPtero()
    const verdict = (offset: number, attackFrame: boolean): string => {
      const { pl, pt } = killSetup(offset, attackFrame)
      return p.resolvePteroAttack(pl, pt).kind
    }
    // Offset 5 kills in the attacking band (|5−8|=3) but LOSES in the glide band (|5−10|=5).
    expect(verdict(5, true), 'offset 5, attacking').toBe('kill')
    expect(verdict(5, false), 'offset 5, gliding').toBe('pteroWins')
    // Offset 12 loses in the attacking band (|12−8|=4) but kills in the glide band (|12−10|=2).
    expect(verdict(12, true), 'offset 12, attacking').toBe('pteroWins')
    expect(verdict(12, false), 'offset 12, gliding').toBe('kill')
  })

  it('a clean kill emits a 1000-point score EVENT (reason "kill", ruling C caveat in the claim)', async () => {
    const p = await loadPtero()
    expect(p.PTERO_SCORE).toBe(1000)
    expect(p.pteroScoreEvent()).toEqual({ kind: 'score', value: 1000, reason: 'kill' })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — THE PTERO WAVE TYPE, LIVE. The count comes from the wave table's ptero
// nibble (WPTEN) and flows THROUGH jt2-5's dispatchWaveType (WPTERO, index 5).
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-3 — the ptero wave type spawns pteros from the nibble, through the dispatch', () => {
  // A synthetic ptero-type status: waveTypeIndex = (status & $0E) >> 1 == 5 needs
  // (status & $0E) == $0A. 0x0a is the minimal ptero status; 0x7b is wave 8's.
  const PTERO_STATUS = 0x0a
  const WAVE8_STATUS = 0x7b // wave 8 in the committed table (1 ptero)

  it('a ptero-type wave spawns exactly the nibble count', async () => {
    const p = await loadPtero()
    expect(p.pteroWaveSpawnCount(PTERO_STATUS, 2, BOTH_ALIVE), 'ptero type, nibble 2 → 2').toBe(2)
    expect(p.pteroWaveSpawnCount(WAVE8_STATUS, 1, BOTH_ALIVE), "wave 8's status, nibble 1 → 1").toBe(1)
  })

  it('a NON-ptero wave spawns zero, even with a non-zero nibble (the dispatch gates it)', async () => {
    const p = await loadPtero()
    // 0x08 → egg type (index 4); 0x02 → intro; 0x00 → nop. None spawn pteros.
    expect(p.pteroWaveSpawnCount(0x08, 5, BOTH_ALIVE), 'egg-type wave, nibble 5 → 0').toBe(0)
    expect(p.pteroWaveSpawnCount(0x02, 3, BOTH_ALIVE), 'intro-type wave → 0').toBe(0)
    expect(p.pteroWaveSpawnCount(0x00, 4, BOTH_ALIVE), 'nop-type wave → 0').toBe(0)
  })

  it('the ptero type does NOT degrade by player-count — a player being out keeps the count', async () => {
    const p = await loadPtero()
    // coop/gladiator degrade; ptero does not. A ptero wave spawns its nibble regardless.
    expect(p.pteroWaveSpawnCount(PTERO_STATUS, 2, { p1: true, p2: false })).toBe(2)
    expect(p.pteroWaveSpawnCount(PTERO_STATUS, 2, { p1: false, p2: true })).toBe(2)
  })

  it('DATA CROSS-CHECK: for EVERY committed wave, the spawn count equals the ptero nibble', async () => {
    // The committed WAVE_TABLE (jt2-5) carries the invariant `pterodactyls > 0` ⟺
    // ptero-type wave (verified: 17 ptero waves, zero mismatch across all 90). So the
    // spawn count — which flows the nibble through the dispatch — must equal the
    // nibble for every row: nonzero exactly on the 17 ptero waves, 0 elsewhere.
    const p = await loadPtero()
    const w = await loadWave()
    let pteroWaves = 0
    for (let i = 0; i < w.WAVE_TABLE.length; i++) {
      const row = w.WAVE_TABLE[i]
      expect(
        p.pteroWaveSpawnCount(row.status, row.pterodactyls, BOTH_ALIVE),
        `wave ${i + 1}: spawn count must equal the ptero nibble (${row.pterodactyls})`,
      ).toBe(row.pterodactyls)
      if (row.pterodactyls > 0) pteroWaves++
    }
    expect(pteroWaves, 'the committed table has 17 ptero-bearing waves').toBe(17)
  })

  it('wave 8 is the FIRST ptero wave — exactly one ptero (the committed anchor)', async () => {
    const p = await loadPtero()
    const w = await loadWave()
    const wave8 = w.WAVE_TABLE[7] // 1-based wave 8
    expect(wave8.pterodactyls, 'wave 8 carries one ptero').toBe(1)
    expect(p.pteroWaveSpawnCount(wave8.status, wave8.pterodactyls, BOTH_ALIVE)).toBe(1)
    // No earlier wave spawns a ptero.
    for (let i = 0; i < 7; i++) {
      expect(
        p.pteroWaveSpawnCount(w.WAVE_TABLE[i].status, w.WAVE_TABLE[i].pterodactyls, BOTH_ALIVE),
        `wave ${i + 1} spawns no ptero`,
      ).toBe(0)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-4 — DETERMINISM + PURITY. A seeded ptero encounter (KILL and LOSS) replays
// bit-for-bit; the resolvers never mutate their arguments.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-4 — a seeded ptero encounter (kill and loss) replays bit-for-bit', () => {
  /** Fly the ptero N frames from a fixed start, returning the whole trajectory. */
  function drift(p: PteroModule, frames: number): EntityState[] {
    const out: EntityState[] = []
    let s = airborne({ velXIndex: 4, velY: -0x40 }) // a moving, rising ptero
    for (let i = 0; i < frames; i++) {
      s = p.stepPteroFlight(s, NO_INPUT)
      out.push(s)
    }
    return out
  }

  it('the gravity-exempt flight is deterministic — identical trajectory on replay', async () => {
    const p = await loadPtero()
    expect(drift(p, 60)).toEqual(drift(p, 60))
  })

  it('a seeded KILL encounter replays identically (same outcome, same 1000 event)', async () => {
    const p = await loadPtero()
    const pl = player(100, 100, 1)
    const pt = ptero(120, 92, -1, true) // offset 8, opposite, facing into → kill
    const a = p.resolvePteroAttack(pl, pt)
    const b = p.resolvePteroAttack(pl, pt)
    expect(a).toEqual(b)
    expect(a.kind).toBe('kill')
    expect(p.pteroScoreEvent().value, 'which credits 1000').toBe(1000)
  })

  it('a seeded LOSS encounter replays identically (pteroWins, no score)', async () => {
    const p = await loadPtero()
    const pl = player(100, 100, 1)
    const pt = ptero(120, 84, -1, true) // offset 16 — out of band → pteroWins
    const a = p.resolvePteroAttack(pl, pt)
    const b = p.resolvePteroAttack(pl, pt)
    expect(a).toEqual(b)
    expect(a.kind).toBe('pteroWins')
  })

  it('resolvePteroAttack and stepPteroFlight are PURE — no argument mutation', async () => {
    const p = await loadPtero()
    const pl = player(100, 100, 1)
    const pt = ptero(120, 92, -1, true)
    const plSnap = JSON.stringify(pl)
    const ptSnap = JSON.stringify(pt)
    p.resolvePteroAttack(pl, pt)
    expect(JSON.stringify(pl), 'resolvePteroAttack must not mutate the player').toBe(plSnap)
    expect(JSON.stringify(pt), 'resolvePteroAttack must not mutate the ptero').toBe(ptSnap)

    const s = airborne({ velY: -0x40 })
    const sSnap = JSON.stringify(s)
    p.stepPteroFlight(s, NO_INPUT)
    expect(JSON.stringify(s), 'stepPteroFlight must not mutate its state argument').toBe(sSnap)
  })
})
