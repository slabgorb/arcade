// tests/lava-render-jt11-18.test.ts
//
// Story jt11-18 — RED phase (Han Solo / TEA). DEFECT B of two: the lava itself is
// NOT DRAWN. The molten pool the bridges sit over, and the region a burned bridge
// column vacates, render as the frame-clear colour (palette index 0 = black), so
// the player falls into a hazard they cannot see.
//
// ─── THE GAP ─────────────────────────────────────────────────────────────────
// drawList (sim.ts) emits only BRIDGE/BRIDG2 plank fills, cliff
// BACKGROUND_RECORDS, crumbles and entities. There is NO draw op for the lava
// surface (the DrawOp.kind union in sim.ts is 'arena'|'entity'|'fill'|'crumble' —
// no 'lava'). After a column burns, drawList DROPS the plank fill (gated on
// bridgeBurned) — leaving the vacated span painted by nothing.
// Only the lava LEVEL scalar was ever ported (LAVA_START=$EA, in arena.ts),
// for game-logic rise, not for rendering.
//
// ROM: the lava is a dedicated bubbling process (VLAVA/LAVAB, :1050-1052, :2175)
// over the molten pool at SAFRAM level (:962-963). This suite pins the MINIMAL
// visible fix — a solid molten fill covering the burned span — and is deliberately
// KIND-AGNOSTIC (a fill-geometry op, whether Dev names it kind:'fill' or a new
// kind:'lava'), so it does not dictate the transcription choice.

import { describe, it, expect } from 'vitest'
import { loadSim, type SimState, type DrawOp } from './helpers/sim-contract.js'

const SEED = 0x1234

// The burned shore span (jt11-5's transcription): BRIDGE = 54×3 at (0,211),
// BRIDG2 = 60×3 at (240,211). After the burn these rows show black — the felt bug.
const PLANK_L = 20
const PLANK_R = 250
const SHORE_Y = 211 // the plank origin row (bandTop of CLIF5's band)

/** A fill-style op has a filled rectangle: width, height and a palette colour.
 *  Kind-agnostic on purpose — matches kind:'fill' AND a hypothetical kind:'lava'
 *  carrying the same geometry (either is a valid minimal transcription). */
function isFillGeometry(op: DrawOp): boolean {
  return op.width != null && op.height != null && op.colour != null
}

/** Does a fill-style op paint pixel (x,y)? */
function covers(op: DrawOp, x: number, y: number): boolean {
  return (
    isFillGeometry(op) &&
    x >= op.x &&
    x < op.x + (op.width ?? 0) &&
    y >= op.y &&
    y < op.y + (op.height ?? 0)
  )
}

/** Non-black fill ops that paint the burned shore band — the lava (planks are
 *  colour 8 and, once burned, are not emitted at all, so any fill covering the
 *  vacated span after the burn is the lava). */
function lavaFillsAt(ops: DrawOp[], x: number, y: number): DrawOp[] {
  return ops.filter((op) => covers(op, x, y) && (op.colour ?? 0) !== 0)
}

async function burnedDemo(): Promise<{ demo: Awaited<ReturnType<typeof loadSim>>; d: SimState }> {
  const demo = await loadSim()
  const fresh = demo.createWaveSim(SEED)
  const d: SimState = { ...fresh, arena: { ...fresh.arena, bridgeBurned: true } }
  return { demo, d }
}

describe('jt11-18 premise — the burn removes the plank fills (jt11-5), leaving the span uncovered', () => {
  it('a burned demo emits no BRIDGE/BRIDG2 plank fill', async () => {
    const { demo, d } = await burnedDemo()
    const planks = demo.drawList(d).filter((op) => op.name === 'BRIDGE' || op.name === 'BRIDG2')
    expect(planks, 'jt11-5: the burned bridge drops its planks').toHaveLength(0)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-B1 — drawList emits a lava fill op (RED today: no fill covers the molten span).
// ═════════════════════════════════════════════════════════════════════════════
describe('jt11-18 AC-B1 — the lava molten pool is emitted by drawList', () => {
  it('a burned demo emits at least one non-black fill over the burned shore', async () => {
    const { demo, d } = await burnedDemo()
    const ops = demo.drawList(d)
    const lava = [...lavaFillsAt(ops, PLANK_L, SHORE_Y), ...lavaFillsAt(ops, PLANK_R, SHORE_Y)]
    // RED today: after the burn there is no plank and no lava op, so the span is
    // painted by nothing (index-0 black). GREEN once a molten fill is emitted.
    expect(lava.length, 'a lava fill must cover the burned shore span — it is black today').toBeGreaterThan(0)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-B2 — the burned span shows lava, not black, at the exact vacated columns.
//         Control: on an intact arena those columns are footing (plank-covered).
// ═════════════════════════════════════════════════════════════════════════════
describe('jt11-18 AC-B2 — the burned-away span is filled with lava, not black', () => {
  it('control: on an intact arena the shore columns are covered (the planks)', async () => {
    const demo = await loadSim()
    const intact = demo.createWaveSim(SEED)
    const ops = demo.drawList(intact)
    for (const x of [PLANK_L, PLANK_R]) {
      const covered = ops.some((op) => covers(op, x, SHORE_Y) && (op.colour ?? 0) !== 0)
      expect(covered, `intact: column ${x} is covered by the plank fill`).toBe(true)
    }
  })

  it('after the burn the same columns are STILL covered — now by lava', async () => {
    const { demo, d } = await burnedDemo()
    const ops = demo.drawList(d)
    for (const x of [PLANK_L, PLANK_R]) {
      // RED today: the plank is gone and nothing replaces it → black.
      expect(
        lavaFillsAt(ops, x, SHORE_Y).length,
        `burned: column ${x} must show lava, not index-0 black`,
      ).toBeGreaterThan(0)
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-B3 — the lava is a BACKGROUND pool (drawn before entities) and persists on
//         later waves (it is not a one-frame artefact of the initial burn).
// ═════════════════════════════════════════════════════════════════════════════
describe('jt11-18 AC-B3 — the lava is a background pool that persists after the burn', () => {
  it('the lava op is emitted in the background layer, before any entity op', async () => {
    const { demo, d } = await burnedDemo()
    const ops = demo.drawList(d)
    const firstLava = ops.findIndex((op) => covers(op, PLANK_L, SHORE_Y) && (op.colour ?? 0) !== 0)
    const firstEntity = ops.findIndex((op) => op.kind === 'entity')
    expect(firstLava, 'a lava op exists').toBeGreaterThanOrEqual(0)
    // Background records paint before entities (isForegroundArena is the split);
    // the lava pool the bridges sit OVER must be behind them, like the planks were.
    if (firstEntity >= 0) {
      expect(firstLava, 'the lava pool is painted behind the entities').toBeLessThan(firstEntity)
    }
  })

  it('the lava fill is a real pool (spans more than a single scanline)', async () => {
    const { demo, d } = await burnedDemo()
    const ops = demo.drawList(d)
    const lava = lavaFillsAt(ops, PLANK_L, SHORE_Y)
    expect(lava.length, 'a lava fill covers the burned column').toBeGreaterThan(0)
    const tallest = Math.max(...lava.map((op) => op.height ?? 0))
    expect(tallest, 'the molten pool is drawn with real height, not a hairline').toBeGreaterThan(1)
  })

  it('the lava persists on a later burned wave, not only the burn frame', async () => {
    const demo = await loadSim()
    // Splice bridgeBurned onto a later wave — the pool must render whenever the
    // shore is burned, not just on the frame the burn latched.
    const later: SimState = {
      ...demo.createWaveSim(SEED),
      wave: 6,
      arena: { ...demo.createWaveSim(SEED).arena, bridgeBurned: true },
    }
    const lava = lavaFillsAt(demo.drawList(later), PLANK_R, SHORE_Y)
    expect(lava.length, 'the lava pool renders on any burned wave').toBeGreaterThan(0)
  })
})
