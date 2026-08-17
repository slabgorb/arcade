// tests/warpin-wiring-jt13-2.test.ts
//
// Story jt13-2 — RED phase (Tyr / TEA). THE WIRING. The core state machine
// (warpin-jt13-2.test.ts) is inert until something carries and surfaces it; this
// suite pins two boundaries the report is really about:
//
//   • BOTH spawn paths animate. The materialisation WINDOW already exists on the
//     entity process (jt2-6: SimProcess.mat, collisionEnabled). This story hangs a
//     WarpInState on that same process for a player AND an enemy, and surfaces it
//     through the public drawList as a kind:'warpin' op. Today the entity branch of
//     drawList (in sim.ts, :3073-3102) reads only kind/position/facing — never
//     p.mat, and there is no warp-in state to read — so a spawning knight pops in
//     fully opaque.
//
//   • THE PLAYER ASYMMETRY (the sharpest RED). enemyProcess is served onto its pad
//     with nap:STAND_FRAMES (a 30-frame window), but respawnPlayerProcess inherits
//     nap:1 (in sim.ts, :636 and :655-663) — the re-materialising PLAYER has NO
//     window to animate over at all. jt13-2 gives the player the same warp-in.
//
// The player half is deterministic (respawnPlayerProcess + PADS are exported); the
// enemy half drives the real wave (its complement is seated on the pads at frame 0
// — the jt11-4 fact the audio suites rest on).

import { describe, it, expect } from 'vitest'
import { loadSim, type SimState, type SimProcess } from './helpers/sim-contract.js'
import { loadWarpIn } from './helpers/warpin-contract.js'
import { respawnPlayerProcess } from '../src/core/sim.js'
import { PADS } from '../src/core/transporter.js'

const SEED = 0x1234

/** A process's warp-in state, if the module has been built to carry it. */
type Warpish = { warpIn?: { frame: number; nap: number; done: boolean } }
/** drawList ops, read loosely so the not-yet-added kind:'warpin' compiles. */
type LooseOp = { kind: string; frame?: number; owner?: string; name?: string }

const warpOps = (ops: readonly unknown[]): LooseOp[] =>
  (ops as LooseOp[]).filter((o) => o.kind === 'warpin')
const materialisingEnemies = (procs: readonly SimProcess[]): SimProcess[] =>
  procs.filter((p) => p.kind === 'enemy' && p.collisionEnabled === false)

/**
 * Drive a seeded 1P game until at least one enemy is on its pad materialising
 * (collisions off), the way transporter-occupancy-jt11-9 tracks the first enemy.
 * The wave complement enters as PendingEnemy records and is SERVED onto pads over
 * the opening frames — it is NOT collidable at frame 0 — so we step to find it.
 */
async function driveToMaterialisingEnemy(
  demo: Awaited<ReturnType<typeof loadSim>>,
  maxFrames = 240,
): Promise<{ d: SimState; enemies: SimProcess[] } | null> {
  let d: SimState = demo.createWaveSim(SEED, 1)
  for (let f = 0; f < maxFrames; f++) {
    const enemies = materialisingEnemies(d.sim.processes)
    if (enemies.length > 0) return { d, enemies }
    d = demo.stepSim(d, {})
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// THE PLAYER ASYMMETRY — a re-materialising player carries a warp-in window.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt13-2 — the player spawn path gets a warp-in (was window-less)', () => {
  it('respawnPlayerProcess carries a WarpInState opened on frame 0', async () => {
    const w = await loadWarpIn()
    const proc = respawnPlayerProcess(1, PADS[0]) as unknown as Warpish
    expect(
      proc.warpIn,
      'a re-materialising player must carry warp-in state — today it inherits nap:1 and has ' +
        'NO window to animate over (respawnPlayerProcess in sim.ts, :636 and :655-663), so the ' +
        'player never warps in.',
    ).toBeDefined()
    expect(proc.warpIn?.frame, 'the warp-in opens on frame 0').toBe(0)
    expect(proc.warpIn?.done, 'and is not already finished').toBe(false)
    // Its length is the ROM's 30-frame TREFF window.
    expect(w.WARPIN_FRAME_COUNT, 'the warp-in runs the STAND_FRAMES=30 window').toBe(30)
  })

  it('both P1 and P2 respawns carry the warp-in (neither pops in opaque)', () => {
    const p1 = respawnPlayerProcess(1, PADS[0]) as unknown as Warpish
    const p2 = respawnPlayerProcess(2, PADS[1]) as unknown as Warpish
    expect(p1.warpIn, 'P1 warps in').toBeDefined()
    expect(p2.warpIn, 'P2 warps in').toBeDefined()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// THE ENEMY SURFACING — a materialising enemy surfaces a warp-in through drawList.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt13-2 — a materialising enemy surfaces a warp-in overlay', () => {
  it('a wave enemy is served onto its pad materialising (premise, collisions off)', async () => {
    const demo = await loadSim()
    const hit = await driveToMaterialisingEnemy(demo)
    expect(
      hit,
      'the wave complement is served onto the pads with collisions off within the opening frames',
    ).not.toBeNull()
    expect(hit!.enemies.length, 'at least one materialising enemy to check').toBeGreaterThan(0)
  })

  it('each materialising enemy process carries a WarpInState', async () => {
    const demo = await loadSim()
    const hit = await driveToMaterialisingEnemy(demo)
    expect(hit, 'a materialising enemy was found').not.toBeNull()
    for (const e of hit!.enemies) {
      expect(
        (e as unknown as Warpish).warpIn,
        'a materialising enemy carries warp-in state — the spawn animation the report wants',
      ).toBeDefined()
    }
  })

  it('drawList emits a kind:warpin op while an enemy materialises', async () => {
    const demo = await loadSim()
    const hit = await driveToMaterialisingEnemy(demo)
    expect(hit, 'a materialising enemy was found').not.toBeNull()
    const ops = warpOps(demo.drawList(hit!.d))
    expect(
      ops.length,
      "drawList must surface a kind:'warpin' overlay for materialising arrivals — today the " +
        'entity branch ignores p.mat and paints them fully opaque.',
    ).toBeGreaterThan(0)
    expect(
      ops.every((o) => typeof o.frame === 'number'),
      'every warp-in op carries a numeric TREFF frame',
    ).toBe(true)
  })
})
