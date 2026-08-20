// tests/pt1-13-troll-no-pull-through-platform.test.ts
//
// Story pt1-13 — "joust: the troll should not be able to pull the player through a
// platform." RED authored by Leeloo (TEA).
//
// ─── THE PLAYTEST OBSERVATION, RESOLVED TO ONE MISSING ROM CHECK ──────────────
// Playtest 2026-08-19: a lava-troll grip drags the victim DOWN THROUGH solid
// platform geometry into the lava. The Architect traced it to two seams:
//
//   A1 — the grip integration has no ground resolve. `stepTrolls`' grip branch
//        writes `stepGrip`'s integrated posY unconditionally; frame.ts early-returns
//        for any `grippedBy` process, so the landing resolve and the FLOOR+7 backstop
//        never run for a gripped bird. Its Y sweeps monotonically to DEATH_Y through
//        every platform band.
//
//   A2 — that state should be UNREACHABLE, because the ROM re-verifies RANGE every
//        frame and we never ported the check. `LAVVIC` (JOUSTRV4.SRC:1711-1731) runs
//        at reach-start (:1702 LAVVFY), inside the grip loop (:1667) and after every
//        ADDLAV fall step (:6653 `JSR LAVVI3 / BNE ADLFRE`); it RELEASES the grip the
//        instant the victim leaves range. Its three release tests, all missing:
//          1. victim GROUNDED (PSTATE != 0) ⇒ release            (:1716-1717)
//          2. victim TOO HIGH — pixelY < FLOOR+7-32 = 198 ⇒ release (:1718-1720)
//          3. victim posX-2 in the CENTRAL band (40, 240) ⇒ release (:1721-1726) —
//             in range ONLY at the screen-edge lava gaps, the columns with NO platform
//             above. The central band is "(CLIF5 BOUNDS)" in the 1982 comment.
//
// The through-platform factory is the once-per-wave pick at `TROLL_CLIF5_X = 148`
// (sim.ts) — mask 0x32, ON the CLIF5 platform, a column the ROM troll (test 3) can
// never hold. 148-2 = 146 ∈ (40,240), so LAVVIC releases it; our port grips and pulls.
//
// ─── THE FIX (Dev / Julia) ───────────────────────────────────────────────────
// Port LAVVIC as a pure `trollVictimInRange(posX, pixelY, airborne)` in troll.ts —
// plain numbers, the file's established idiom (cf. `outOfTrollReach(pixelY)`). Call it
// at the top of every `stepTrolls` grip iteration (release the moment it fails) and
// gate `pickTrollVictim` on it; retire the bogus 148 grab column. That alone makes the
// through-platform pull unreachable. The source re-derivation + the claim live in the
// companion tests/pt1-13-troll-source.test.ts.
//
// node env (dynamic import of the modules off disk). This header never spells the
// vitest env directive as a token.

import { describe, it, expect } from 'vitest'
import { loadTroll } from './helpers/troll-contract.js'
import { loadSim, type SimState, type SimProcess, type EntityState } from './helpers/sim-contract.js'
import { withNoPendingEnemies } from './helpers/wave-entry.js'

// ─── ROM scalars (JOUSTRV4.SRC:37 FLOOR = $DF) ───────────────────────────────
const FLOOR = 0xdf
const DEATH_Y = FLOOR + 7 // 230 — the ADGFLR lava kill plane (posY>>8 >= this drowns)
const REACH_Y = DEATH_Y - 32 // 198 — LAVVIC test 2: pixelY ABOVE this is out of reach
const BASE_PULL = 0x08 // a grace-window LAVGRA pull (escapable by a flap; here NEUTRAL → drowns)
const GRACE_FRAMES = 30 * 60 // LAVKLL: pull frozen during the grace, so the fall is steady
const SEED = 0x1234

// The through-platform grab point the once-per-wave picker uses (sim.ts
// `TROLL_CLIF5_X = 148`) — a CENTRAL column (146 ∈ (40,240)) with the CLIF5 platform
// above it. This is the column LAVVIC test 3 forbids and the port wrongly holds.
const CLIF5_X = 148
// A screen-edge lava gap (18 <= 40): LAVVIC test 3 keeps this IN range — the control.
const EDGE_X = 20

// ═════════════════════════════════════════════════════════════════════════════
// AC1 — the pure LAVVIC predicate `trollVictimInRange(posX, pixelY, airborne)`.
// True iff the victim is still WITHIN the troll's reach (held). Each release test
// pinned at its exact boundary, the way BREAK_FREE_VY / outOfTrollReach are, so a
// one-unit drift reddens rather than passing the whole suite.
// RED today: troll.ts exports no `trollVictimInRange` — loadTroll throws per test.
// ═════════════════════════════════════════════════════════════════════════════
describe('pt1-13 AC1 — trollVictimInRange ports the LAVVIC three-test range gate', () => {
  it('release test 1 — a GROUNDED victim is OUT of range even at an in-range x/y (PSTATE != 0)', async () => {
    const t = await loadTroll()
    // EDGE_X + a valid reach Y would be IN range if airborne; grounded flips it out.
    expect(t.trollVictimInRange(EDGE_X, DEATH_Y - 1, true), 'airborne at the edge: held').toBe(true)
    expect(t.trollVictimInRange(EDGE_X, DEATH_Y - 1, false), 'grounded: released (JOUSTRV4.SRC:1716-1717)').toBe(false)
  })

  it('release test 2 — a victim ABOVE FLOOR+7-32 = 198 is OUT of reach (BLO — strictly above)', async () => {
    const t = await loadTroll()
    expect(REACH_Y, 'the reach line is FLOOR+7-32 = 198').toBe(198)
    // At/below the line (>= 198) is IN reach; above it (< 198) has climbed clear.
    expect(t.trollVictimInRange(EDGE_X, 197, true), '197 is above the reach line — released').toBe(false)
    expect(t.trollVictimInRange(EDGE_X, 198, true), 'AT 198 is still in reach — held (BLO is strict)').toBe(true)
    expect(t.trollVictimInRange(EDGE_X, 230, true), 'at the kill plane is in reach — the drown owns it').toBe(true)
  })

  it('release test 3 — the CENTRAL band posX-2 in (40, 240) is OUT of range (CLIF5 BOUNDS)', async () => {
    const t = await loadTroll()
    // The columns with a platform above the lava: a bird here cannot be pulled DOWN
    // into the lava, so the ROM never holds it. This is the through-platform guard.
    for (const x of [CLIF5_X, 100, 128, 200, 148]) {
      expect(t.trollVictimInRange(x, DEATH_Y - 1, true), `x=${x} (posX-2=${x - 2}) is central — released`).toBe(false)
    }
  })

  it('release test 3 — the SCREEN-EDGE lava gaps (posX-2 <= 40 or >= 240) are IN range', async () => {
    const t = await loadTroll()
    for (const x of [EDGE_X, 0, 300, 319]) {
      expect(t.trollVictimInRange(x, DEATH_Y - 1, true), `x=${x} (posX-2=${x - 2}) is a lava gap — held`).toBe(true)
    }
  })

  it('release test 3 — the exact x boundaries (CMPD #54-14 / BLE, CMPD #240 / BLT)', async () => {
    const t = await loadTroll()
    // Left edge: posX-2 <= 40 IN (BLE), > 40 OUT.  40 = 54-14.
    expect(t.trollVictimInRange(42, DEATH_Y - 1, true), 'posX-2 = 40: BLE → IN').toBe(true)
    expect(t.trollVictimInRange(43, DEATH_Y - 1, true), 'posX-2 = 41: > 40 and < 240 → OUT').toBe(false)
    // Right edge: posX-2 < 240 OUT (BLT), >= 240 IN.
    expect(t.trollVictimInRange(241, DEATH_Y - 1, true), 'posX-2 = 239: BLT → OUT').toBe(false)
    expect(t.trollVictimInRange(242, DEATH_Y - 1, true), 'posX-2 = 240: not < 240 → IN').toBe(true)
  })

  it('non-vacuity — a fully in-range victim (edge x, in reach, airborne) is HELD', async () => {
    // Proves the predicate is not vacuously always-false: at least one input is true,
    // so the release tests above are discriminating, not a constant.
    const t = await loadTroll()
    expect(t.trollVictimInRange(EDGE_X, DEATH_Y - 4, true)).toBe(true)
  })

  it('purity — same inputs, same output, and no argument surface to mutate', async () => {
    const t = await loadTroll()
    const a = t.trollVictimInRange(CLIF5_X, 210, true)
    const b = t.trollVictimInRange(CLIF5_X, 210, true)
    expect(a).toBe(b)
    expect(a, 'the CLIF5 column is out of range').toBe(false)
  })
})

// ─── Integration fixtures (the pt1-16 / lava-troll-enemy-grip-drown idiom) ────

function entityAt(posX: number, pixelY: number, over: Partial<EntityState> = {}): EntityState {
  return {
    posX,
    posY: pixelY << 8,
    velXIndex: 0,
    velXFrac: 0,
    velY: 0,
    timeUp: 0,
    groundState: null,
    plantZ: 0,
    airborne: true,
    ...over,
  }
}

const stander = (posX: number): EntityState =>
  entityAt(posX, 210, { airborne: false, groundState: 'stand', posY: 210 << 8 })

const ISLAND = 40 // a keep-alive island buzzard so the wave never advances mid-test

function enemyAt(id: number, posX: number, entity: EntityState, over: Partial<SimProcess> = {}): SimProcess {
  return {
    id,
    cls: 'secondary',
    nap: 1,
    period: 1,
    kind: 'enemy',
    enemy: { entity, facing: 1, pchase: 1, brain: 'boundr', decision: 'boundr', plavt: 1 },
    enemyType: 'bounder',
    collisionEnabled: false,
    ...over,
  } as SimProcess
}

function playerAt(id: number, posX: number, pixelY: number): SimProcess {
  return {
    id,
    cls: 'primary',
    nap: 1,
    period: 1,
    kind: 'player',
    facing: 1,
    mount: 'ostrich',
    entity: entityAt(posX, pixelY),
  } as SimProcess
}

/** A troll ALREADY committed to a grip on `victimId`, with an explicit pull + grace. */
function trollGripping(victimId: number, posX: number, pixelY: number, pull: number, killTimer: number): SimProcess {
  return {
    id: 0x15_0000 + victimId,
    cls: 'secondary',
    nap: 1,
    period: 1,
    kind: 'troll',
    facing: 1,
    collisionEnabled: true,
    victimId,
    grip: { pull, killTimer },
    entity: entityAt(posX, pixelY),
  } as SimProcess
}

const playerIn = (d: SimState, id: number): SimProcess | undefined =>
  d.sim.processes.find((p) => p.kind === 'player' && p.id === id)
const grippedByOf = (p: SimProcess | undefined): number | undefined =>
  (p as { grippedBy?: number } | undefined)?.grippedBy
const pixelYOf = (p: SimProcess | undefined): number | undefined => {
  const e = p?.entity as EntityState | undefined
  return e ? e.posY >> 8 : undefined
}

/** A wave-4 sim (the troll is active once the bridge has burned) carrying the given
 *  cast plus a keep-alive island buzzard so the wave never advances mid-test. */
async function trollSim(cast: SimProcess[]): Promise<SimState> {
  const smod = await loadSim()
  const base = smod.createWaveSim(SEED, 1)
  return withNoPendingEnemies({
    ...base,
    wave: 4,
    sim: { ...base.sim, processes: [...cast, enemyAt(0x201, ISLAND, stander(ISLAND))] },
    arena: { ...base.arena, bridgeBurned: true },
  })
}

/** Drive `stepSim` with NEUTRAL input, watching a gripped player for a drown or a
 *  clean release above the lava. Mirrors the pt1-16 measurement loop. */
async function driveGrippedPlayer(
  x: number,
  frames: number,
): Promise<{ drowned: boolean; released: boolean }> {
  const smod = await loadSim()
  const PID = 1
  const trollId = 0x15_0000 + PID
  const victim = { ...playerAt(PID, x, 200), grippedBy: trollId } as SimProcess
  // Grip staged in the grace window so the pull is steady (no escalation), at a reach
  // Y in [198, 230): held on develop, released-if-central after the fix.
  let d = await trollSim([victim, trollGripping(PID, x - 2, 200 - 3, BASE_PULL, GRACE_FRAMES)])

  // Non-vacuity: the fixture really does start with the troll gripping the player.
  expect(grippedByOf(playerIn(d, PID)), `x=${x}: the fixture stages a committed grip`).toBe(trollId)

  let drowned = false
  let released = false
  for (let i = 0; i < frames && !drowned && !released; i++) {
    d = smod.stepSim(d)
    for (const c of d.cues) if (c.type === 'player-lava-death') drowned = true
    const pl = playerIn(d, PID)
    const y = pixelYOf(pl)
    // A genuine release: still alive, no longer gripped, and ABOVE the lava plane
    // (not the transient ungrip the drown itself performs at FLOOR+7).
    if (!drowned && pl && grippedByOf(pl) === undefined && y !== undefined && y < DEATH_Y) released = true
  }
  return { drowned, released }
}

// ═════════════════════════════════════════════════════════════════════════════
// AC2 — the through-platform pull is unreachable: a committed grip on a bird over a
// CLIF5 platform column RELEASES rather than dragging it down through the platform
// into the lava.
//
// RED on develop: `stepTrolls`' grip branch has no LAVVIC re-check, so the central
// victim's Y sweeps monotonically to DEATH_Y and it drowns (pulled through). GREEN:
// `trollVictimInRange` releases it on the first grip frame, normal physics resumes,
// and it lands on the platform.
// ═════════════════════════════════════════════════════════════════════════════
describe('pt1-13 AC2 — a grip over a platform column releases, it does not pull through', () => {
  it('the CLIF5-column (x=148) victim is RELEASED and never dragged into the lava', async () => {
    const { drowned, released } = await driveGrippedPlayer(CLIF5_X, 120)
    expect(drowned, 'a bird over the CLIF5 platform must NOT be pulled down through it into the lava').toBe(false)
    expect(released, 'LAVVIC releases the grip because posX-2 = 146 is in the (40,240) central band').toBe(true)
  })

  it('ANCHOR — a screen-edge lava-gap grip (x=20) is legitimately HELD and drowns', async () => {
    // The control, GREEN on develop AND after the fix: at a screen-edge column (no
    // platform above the lava) LAVVIC keeps the victim in range, so a NEUTRAL bird is
    // pulled under. Proves the fixture can drown and the AC2 release discriminates by
    // x — it is not a blanket "always release" that would also break real grips.
    const { drowned, released } = await driveGrippedPlayer(EDGE_X, 120)
    expect(drowned, 'over exposed edge lava the grip holds and the bird drowns').toBe(true)
    expect(released, 'an in-range victim is not released by the range gate').toBe(false)
  })
})
