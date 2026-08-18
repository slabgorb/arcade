// tests/warpin-hold-jt13-14.test.ts
//
// Story jt13-14 — RED phase (Han Solo / TEA). THE PHYSICS HALF of jt13-12.
//
// jt13-9 built the pure TREFF phase-2 idle-cycle state (warpin.ts). jt13-12 rendered the
// accelerating owner/white/grey TREPL tint into the playable game (drawList/paintWarpIn) —
// but was DESCOPED to render-only. The re-materialising bird still spawns `airborne: true`
// (sim.ts `playerEntity`) and its flight/gravity step keeps running through the whole TREFF
// wait; only the colour cycles. `drawList`'s idle branch even claims the idle bird "STANDS on
// its pad (held by advanceWarpIn)" — that hold was never implemented. This story delivers it.
//
// THE ROM (JOUSTRV4.SRC TREFF, :5726-5890): GOTTR plants the arrival on its transporter pad
// (feet planted); the 30-frame grow-in draws it growing UP; then the phase-2 "wait for 1st
// move, or time out" loop stands it on the pad colour-cycling until the player flaps (CURJOY)
// or the phase times out. The bird runs NO flight physics during either phase — it is held by
// the TREFF logic, not by falling onto a floor.
//
// ─── WHAT THE CURRENT BUILD ACTUALLY DOES (measured against the live sim, jt13-14 RED) ───
// A re-materialising player is `airborne: true`, so during the grow-in its `stepFlight`
// integrates gravity: velY climbs 0→8→16→… for ~7 frames, THEN the bird LANDS on the pad
// (airborne flips false, velY resets) and stands there for the idle. On wave-1 pristine pads
// the pad IS a platform surface, so the pixel Y never visibly moves — the bird "works by
// accident", caught by a floor that happens to sit at the pad. The ROM holds it BY DESIGN.
// The observable defect this story removes is therefore the gravity INTEGRATION during the
// wait (and the reliance on an accidental floor-landing), not a multi-pixel on-screen drop —
// see the Delivery Finding in the session file, which also bears on the AC4 visual check.
//
// WHAT THESE TESTS PIN, through the REAL pipeline (createGame → stepGame → drawList / loadSim
// → createWaveSim → stepSim), never by hand-poking state:
//   1. AC1 — a re-materialising PLAYER with no input runs NO flight physics for the whole
//      warp-in wait: posX/posY stay exactly put and velY never accumulates, across grow-in
//      (phase 1, `warpIn` active) AND the idle wait (phase 2, `idleCycle` active). [RED — the
//      grow-in currently integrates gravity, so velY ≠ 0 within the first frames.]
//   2. AC1 release — the hold is releasable, not a permanent freeze: a flapping player leaves
//      the wait ('moved') and flies. [guard]
//   3. AC2 — the hold is player-only: a materialising ENEMY is never held frozen; its own
//      brain/gravity moves it. (See the Design Deviations for why enemies are not held; jt13-9
//      pins the enemy idle → timed-out.) [guard]
//   4. AC3 — photosensitive safety: the on-pad idle silhouette the colour-cycle flashes is a
//      SMALL bounded sprite, never a large-area luminance fill (memory: pacman-epilepsy-no-flash). [guard]

import { describe, it, expect } from 'vitest'
import { createGame, stepGame, type GameState } from '../src/core/game.js'
import { seatWaveInstantly } from './helpers/wave-entry.js'
import { loadSim, type SimState, type SimProcess } from './helpers/sim-contract.js'
import { loadRender } from './helpers/render-contract.js'
import { loadPictures } from './helpers/pictures-contract.js'

const PLAYER_SEED = 0xbeef // the jt13-12 seed proven to reach a re-materialising player in 2P play
const ENEMY_SEED = 0x1234 // the jt13-9 seed proven to reach a materialising enemy in the opening frames

type Warp = { frame: number; nap: number; done: boolean }
type Idle = { end: 'active' | 'moved' | 'timed-out' }

const warpOf = (p: SimProcess | undefined): Warp | undefined => p?.warpIn as Warp | undefined
const idleOf = (p: SimProcess | undefined): Idle | undefined => p?.idleCycle as Idle | undefined

/**
 * In the TREFF wait = the arrival still carries a `warpIn` and no TERMINAL idle end has replaced
 * it. This spans the whole wait CONTINUOUSLY: the grow-in, the one-frame seam where `warpIn.done`
 * has flipped but the idle field has not yet opened (advanceWarpIn opens it the next frame), and
 * the active idle colour-cycle — right up to the 'moved'/'timed-out' release. Matching the hold's
 * own predicate is deliberate: it is exactly the window in which the bird must stand on its pad.
 */
const inWarpInWait = (p: SimProcess | undefined): boolean => {
  if (warpOf(p) === undefined) return false
  const end = idleOf(p)?.end
  return end === undefined || end === 'active'
}

/** Fresh seated 2P game (so a knight can die and re-materialise), exactly as jt13-12 drives it. */
function seatedGame(seed: number): GameState {
  return { ...createGame(seed, 2), sim: seatWaveInstantly(createGame(seed, 2).sim) }
}

const playerById = (g: GameState, id: number): SimProcess | undefined =>
  g.sim.sim.processes.find((q) => q.id === id)

/** Drive until a PLAYER is re-materialising — the first frame it carries an unfinished grow-in. */
function driveToRematerialisingPlayer(seed: number): { g: GameState; id: number } | null {
  let g = seatedGame(seed)
  for (let f = 0; f < 8000; f++) {
    g = stepGame(g, {})
    const p = g.sim.sim.processes.find((q) => q.kind === 'player' && warpOf(q)?.done === false && q.entity)
    if (p) return { g, id: p.id }
  }
  return null
}

/** Drive until a PLAYER's idle cycle is active (past the grow-in) — the jt13-12 helper. */
function driveToIdlePlayer(seed: number): { g: GameState; id: number } | null {
  let g = seatedGame(seed)
  for (let f = 0; f < 8000; f++) {
    g = stepGame(g, {})
    const p = g.sim.sim.processes.find((q) => q.kind === 'player' && idleOf(q)?.end === 'active')
    if (p) return { g, id: p.id }
  }
  return null
}

describe('jt13-14 — a re-materialising player runs no flight physics during the TREFF wait', () => {
  it('holds stationary with velY pinned at 0 across grow-in (phase 1) AND the idle wait (phase 2)', () => {
    const hit = driveToRematerialisingPlayer(PLAYER_SEED)
    expect(hit, 'a player re-materialises in ordinary 2P play').not.toBeNull()

    let g = hit!.g
    const start = playerById(g, hit!.id)!
    const padPosX = start.entity!.posX
    const padPosY = start.entity!.posY // the transporter pad the ROM plants the arrival on (GOTTR TPOSY)

    let sawGrowIn = false
    let sawIdle = false

    // Walk the entire wait with NO input (so the cycle runs to its natural timeout, never a flap).
    for (let i = 0; i < 700; i++) {
      const p = playerById(g, hit!.id)
      if (!inWarpInWait(p)) break
      if (warpOf(p)?.done === false) sawGrowIn = true
      if (idleOf(p)?.end === 'active') sawIdle = true

      // The bird is HELD by the TREFF logic: its flight step is skipped, so it neither drifts
      // (posX/posY exactly put) nor accumulates gravity (velY stays 0). Today the grow-in
      // integrates gravity — velY climbs before the accidental floor-landing — so this reddens.
      expect(p!.entity!.velY, `no gravity is integrated while held (wait frame ${i})`).toBe(0)
      expect(p!.entity!.posY, `held at the pad Y — no vertical movement (wait frame ${i})`).toBe(padPosY)
      expect(p!.entity!.posX, `held at the pad X — no horizontal drift (wait frame ${i})`).toBe(padPosX)

      g = stepGame(g, {})
    }

    expect(sawGrowIn, 'the hold was observed during the grow-in (phase 1)').toBe(true)
    expect(sawIdle, 'the hold was observed during the idle colour-cycle (phase 2)').toBe(true)
  })

  it('the hold is releasable — a flap ends the wait ("moved") and the released bird flies (not frozen forever)', () => {
    const hit = driveToIdlePlayer(PLAYER_SEED)
    expect(hit, 'a player reaches an active idle cycle').not.toBeNull()

    const held = playerById(hit!.g, hit!.id)!
    const heldPosY = held.entity!.posY

    // A single flap is the first move — CURJOY ≠ 0 ends the wait ('moved'), releasing the hold
    // (the jt13-12 edge). This must keep working once the hold is added.
    let g = stepGame(hit!.g, { [hit!.id]: { dir: 0, flap: true, flapHeld: true } })
    const released = playerById(g, hit!.id)
    expect(idleOf(released)?.end, 'the flap ends the wait ("moved")').toBe('moved')
    expect(inWarpInWait(released), 'the released bird is out of the TREFF wait — the hold no longer applies').toBe(false)

    // With the hold released, normal flight resumes: the bird MOVES (the flap's lift). It is not
    // frozen forever on the pad.
    let moved = false
    for (let i = 0; i < 8 && released; i++) {
      g = stepGame(g, {})
      const p = playerById(g, hit!.id)
      if (p && p.entity!.posY !== heldPosY) {
        moved = true
        break
      }
      if (!p) break
    }
    expect(moved, 'the released bird flies — flight resumes once the wait ends').toBe(true)
  })
})

describe('jt13-14 — the hold is player-only: a materialising enemy is never frozen (AC2 guard)', () => {
  it("an enemy's own brain/gravity moves it during warp-in — it is not held stationary", async () => {
    const demo = await loadSim()
    let d: SimState = demo.createWaveSim(ENEMY_SEED, 1)

    // Find an enemy on its pad materialising (collisions off), exactly as jt13-9 does. Note an
    // enemy carries its flight state at `p.enemy.entity`, not `p.entity` (the player's home).
    let target: SimProcess | undefined
    for (let f = 0; f < 240 && !target; f++) {
      target = d.sim.processes.find((p) => p.kind === 'enemy' && p.collisionEnabled === false && p.enemy)
      if (!target) d = demo.stepSim(d, {})
    }
    expect(target, 'a materialising enemy appears in the opening frames').toBeDefined()

    const id = target!.id
    const startPosY = target!.enemy!.entity.posY
    const startPosX = target!.enemy!.entity.posX

    // Step its warp-in with no input. A held bird (like the player) would be pinned; an enemy is
    // NOT held — its brain and gravity move it. This guards against a fix that freezes enemies.
    let moved = false
    for (let i = 0; i < 60; i++) {
      d = demo.stepSim(d, {})
      const p = d.sim.processes.find((q) => q.id === id)
      if (!p) {
        moved = true // it flew/jousted out of the materialising set — decidedly not frozen
        break
      }
      if (p.enemy && (p.enemy.entity.posY !== startPosY || p.enemy.entity.posX !== startPosX)) {
        moved = true
        break
      }
    }
    expect(moved, 'a materialising enemy is moved by its AI/gravity, never held frozen on its pad').toBe(true)
  })
})

describe('jt13-14 — the on-pad idle silhouette stays small (photosensitive safety, AC3)', () => {
  it('the colour-cycling idle bird paints only a small sprite, never a large-area luminance fill', async () => {
    const r = await loadRender()
    const pics = await loadPictures()
    const paint = (r as unknown as {
      paintWarpIn: (
        ctx: { fillStyle: string; fillRect(x: number, y: number, w: number, h: number): void },
        op: { x: number; y: number; width?: number; height?: number; frame?: number; owner?: string; colour?: number },
        colours: readonly { r: number; g: number; b: number; a: number }[],
      ) => void
    }).paintWarpIn
    const colours = r.rgbaPalette(pics.PALETTES.COLOR1)

    // A full-height idle op EXACTLY as drawList emits it (sim.ts idle branch): no explicit
    // width/height, so paintWarpIn uses its real 16×16 silhouette defaults; the cycling colour
    // nibble (grey $D here) is what flashes. This is the biggest the idle bird ever draws.
    const fills: Array<{ w: number; h: number }> = []
    const ctx = {
      fillStyle: '',
      fillRect(_x: number, _y: number, w: number, h: number): void {
        fills.push({ w, h })
      },
    }
    paint(ctx, { x: 40, y: 120, frame: 29, owner: 'p1', colour: 0xd }, colours)

    const paintedArea = fills.reduce((sum, f) => sum + f.w * f.h, 0)
    const CANVAS_AREA = 292 * 240 // LOGICAL_WIDTH × LOGICAL_HEIGHT (render.ts)

    // Non-vacuous: the idle bird IS drawn (the story keeps it visible).
    expect(paintedArea, 'the idle silhouette is actually painted').toBeGreaterThan(0)
    // Small-area safety: a flashing sprite this size is far below any "large-area luminance
    // strobe" threshold. A regression that turned the cycle into a screen-wide flash blows this.
    expect(
      paintedArea,
      'the flashing idle silhouette stays a small on-pad sprite (< 5% of the screen), not a large-area strobe',
    ).toBeLessThan(CANVAS_AREA * 0.05)
  })
})
