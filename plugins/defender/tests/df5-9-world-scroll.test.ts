// tests/df5-9-world-scroll.test.ts
//
// Story df5-9 — RED phase (Leeloo / TEA). composeFrame (scene.ts) NEVER reads
// `state.camera` (BGL): the planet surface (blitTerrain) is drawn at fixed columns and
// every world-space entity (landers, humanoids, lasers) is blitted at its ABSOLUTE world
// column (`entity.x >> 8`). Only the starfield scrolls (its positions are pre-advanced by
// the camera delta in sim.ts stepStars). So the world is frozen under the ship, thrust/
// reverse don't visibly traverse it, and df5-10's world-spread ground population never
// appears where the player is looking. This suite pins the fix GREEN must add: thread
// `state.camera` into composeFrame and camera-offset BOTH the terrain AND the world-space
// entity blits, honouring the $10000 horizontal world-wrap (world.ts wrap16), while the
// SHIP stays at its fixed display column.
//
// COORDINATE MODEL (measured against the live renderer): a world-x is a 16-bit value whose
// HIGH BYTE is the screen column, so a world entity at world-x W currently renders at
// column `W >> 8` (0x4000 -> col 64), and the world is a 256-column cylinder (0x10000>>8).
// The correct on-screen column is `(wrap16(W - camera)) >> 8` — TODAY the `- camera` is
// missing, which is the whole bug. These tests assert the camera-relative RELATIONSHIP
// (and the seam wrap), not a hard-coded pixel scale, so they survive GREEN's exact formula.
//
// Test technique: to locate where an entity renders WITHOUT knowing its palette colour,
// diff a frame that contains the entity against the same frame without it (same camera);
// the differing columns ARE the entity's sprite. Terrain/stars/ship are identical in both
// and cancel out. For terrain scroll we digest the whole (entity-free) frame.

import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import { createSim, type SimState } from '../src/core/sim.js'
import { composeFrame } from '../src/core/scene.js'
import type { Framebuffer } from '../src/core/framebuffer.js'

const W = 292
const H = 240
const HROW = 200 // a humanoid on the terrain, comfortably on screen

function makeRand(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return (s >>> 16) & 0xff
  }
}

const digest = (fb: Framebuffer): string => createHash('sha256').update(fb.data).digest('hex').slice(0, 16)

/** Columns where two same-size frames differ in ANY row (sorted ascending). */
function diffCols(a: Framebuffer, b: Framebuffer): number[] {
  const cols: number[] = []
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      if (a.data[y * W + x] !== b.data[y * W + x]) {
        cols.push(x)
        break
      }
    }
  }
  return cols
}

describe('df5-9 world scroll — composeFrame camera-offsets the world (terrain + entities), ship stays put', () => {
  const base = createSim(makeRand(1))
  // A state with exactly ONE controlled humanoid at world-x `wx`, everything else cleared
  // so the humanoid is the only world-space entity. `camera` is what GREEN must honour.
  const withHumanoid = (wx: number, camera: number): SimState => ({
    ...base,
    camera,
    humanoids: [{ x: wx, y: HROW, facing: 'right', state: 'walking', alive: true }],
    landers: [],
    lasers: [],
    effects: [],
  })
  const noEntities = (camera: number): SimState => ({ ...base, camera, humanoids: [], landers: [], lasers: [], effects: [] })

  /** Leftmost screen column the humanoid at `wx` occupies under `camera` (-1 if not drawn). */
  const humanoidCol = (wx: number, camera: number): number => {
    const cols = diffCols(composeFrame(withHumanoid(wx, camera), W, H), composeFrame(noEntities(camera), W, H))
    return cols.length ? cols[0] : -1
  }

  it('moving the camera scrolls a world entity across the screen (today it is pinned to its absolute column)', () => {
    const wx = 0x4000
    const at0 = humanoidCol(wx, 0x0000)
    const atMoved = humanoidCol(wx, 0x1000)
    expect(at0, 'the humanoid must be drawn at camera 0').toBeGreaterThanOrEqual(0)
    expect(atMoved, 'the humanoid must be drawn at camera 0x1000').toBeGreaterThanOrEqual(0)
    expect(
      atMoved,
      'panning the camera must move a fixed world entity on screen — composeFrame is ignoring state.camera ' +
        '(the entity renders at the same absolute column regardless of where the camera looks)',
    ).not.toBe(at0)
  })

  it('moving the camera scrolls the planet surface (blitTerrain must be camera-offset, not fixed)', () => {
    const still = digest(composeFrame(noEntities(0x0000), W, H))
    const scrolled = digest(composeFrame(noEntities(0x1000), W, H))
    expect(
      scrolled,
      'the terrain-only frame is byte-identical at two different cameras — the planet surface is frozen ' +
        '(blitTerrain draws at fixed columns and never reads state.camera)',
    ).not.toBe(still)
  })

  it('only (world-x − camera) determines the on-screen column — shifting BOTH by the same delta leaves it fixed', () => {
    // worldX = onscreen + BGL  ⇒  onscreen = world-x − camera. So an entity at (W, cam=C)
    // must render at the SAME column as (W+Δ, cam=C+Δ). Today the column is W>>8 (camera
    // ignored), so the two differ by Δ>>8 — this is the core camera-relativity bug.
    const d = 0x1000
    expect(
      humanoidCol(0x4000 + d, 0x2000 + d),
      'entity col must depend only on (world-x − camera); GREEN is reading world-x alone',
    ).toBe(humanoidCol(0x4000, 0x2000))
  })

  it('the $10000 world-wrap seam is honoured — a camera past the seam positions entities by the wrapped difference', () => {
    // Camera near the top of the cylinder (0xFF00) looking at an entity just past the wrap
    // (world-x 0x0100): onscreen = wrap16(0x0100 − 0xFF00) = 0x0200. That must equal the
    // column the SAME entity gets at camera 0 for the wrapped world-x 0x0200 (no seam).
    const acrossSeam = humanoidCol(0x0100, 0xff00)
    const equivalentNoSeam = humanoidCol(0x0200, 0x0000)
    expect(acrossSeam, 'the entity must still be drawn when the camera straddles the $10000 seam').toBeGreaterThanOrEqual(0)
    expect(
      acrossSeam,
      'crossing the $10000 seam must wrap (wrap16), not clamp or vanish — the wrapped world-x−camera must ' +
        'match the no-seam equivalent',
    ).toBe(equivalentNoSeam)
  })

  it('the ship stays at its fixed display column while the world scrolls beneath it', () => {
    // Ship mask = columns that change when the ship is moved off-screen (at a fixed camera).
    const shipMask = (camera: number): number[] =>
      diffCols(
        composeFrame(noEntities(camera), W, H),
        composeFrame({ ...noEntities(camera), ship: { x: -80, y: base.ship.y, facing: 'right' } }, W, H),
      )
    expect(
      shipMask(0x1000),
      'the ship must NOT move with the camera — only the world scrolls under it (GREEN must camera-offset the ' +
        'world, never the ship)',
    ).toEqual(shipMask(0x0000))
    // …and meanwhile the world DID move (guards against a no-op "fix" that freezes everything):
    expect(
      digest(composeFrame(noEntities(0x1000), W, H)),
      'the world must actually scroll between the two cameras (else nothing was camera-offset)',
    ).not.toBe(digest(composeFrame(noEntities(0x0000), W, H)))
  })
})
