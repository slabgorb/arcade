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
import { createSim, stepSim, spawnLander, spawnHumanoid, type SimState, type Input } from '../src/core/sim.js'
import { composeFrame } from '../src/core/scene.js'
import { wrap16 } from '../src/core/world.js'
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

  // df5-9-R3: lasers are ON-SCREEN quantities (laser.x = ship's onscreen X + offset), NOT
  // world-space — so, like the ship, they must NOT scroll with the camera. A laser at a fixed
  // laser.x renders at the SAME column whichever way the camera looks; a world entity does not.
  it('lasers do NOT scroll with the camera (they are on-screen, not world-space)', () => {
    const withLaser = (camera: number): SimState => ({
      ...base,
      camera,
      humanoids: [],
      landers: [],
      lasers: [{ x: 0x2600, facing: 'right', alive: true }],
      effects: [],
    })
    const laserCol = (camera: number): number => {
      const cols = diffCols(composeFrame(withLaser(camera), W, H), composeFrame(noEntities(camera), W, H))
      return cols.length ? cols[0] : -1
    }
    expect(laserCol(0x0000), 'the laser must be drawn at camera 0').toBeGreaterThanOrEqual(0)
    expect(
      laserCol(0x4000),
      'the laser moved when the camera panned — it is being camera-offset like a world entity, but laser.x is ' +
        'on-screen (ship-relative), so it must render at the same column regardless of camera (df5-9-R3)',
    ).toBe(laserCol(0x0000))
    // Contrast: a world entity at the same fixed coord DOES move (guards against a no-op that freezes all).
    expect(humanoidCol(0x2600, 0x4000)).not.toBe(humanoidCol(0x2600, 0x0000))
  })

  // df5-9-R4: once the world scrolls, COLIDE must agree with the RENDER — you must be able to shoot
  // the enemy you SEE. The discriminator is coordinate-space, not a fragile staging: raw-world collision
  // (the pre-R4 code) only ever kills a lander whose WORLD column lands in the ship beam's on-screen
  // reach [~32, 152], and such a lander DRAWS at `worldcol − cameraCol`, i.e. no further right than
  // `152 − cameraCol` on screen. So a kill DRAWN beyond that — high in the beam band — is impossible
  // under raw collision and can ONLY come from on-screen-consistent collision (the R4 fix). We settle a
  // stable nonzero camera, hold fire, and require exactly such a kill (the deterministic wave field
  // supplies landers drawn across the beam). At camera 0 this test is vacuously satisfiable, so the
  // nonzero-camera assertion above it is load-bearing.
  it('you can shoot the enemy you SEE at a scrolled camera (COLIDE agrees with the camera-offset render)', () => {
    const THRUST: Input = { thrust: true, reverse: false, up: false, down: false, fire: false }
    const NEUTRAL: Input = { thrust: false, reverse: false, up: false, down: false, fire: false }
    const FIRE: Input = { thrust: false, reverse: false, up: false, down: false, fire: true }
    // Settle a stable, nonzero camera: thrust briefly, then coast until the ship-leads slide stops.
    let s = createSim(makeRand(7))
    for (let i = 0; i < 80; i++) s = stepSim(s, THRUST)
    for (let i = 0; i < 600; i++) s = stepSim(s, NEUTRAL)
    const camera = s.camera
    expect(camera, 'the camera must have scrolled to a nonzero column for this test to mean anything').not.toBe(0)

    const cameraCol = camera >> 8
    const BEAM_REACH = 152 // the laser's on-screen death edge column (RIGHT_EDGE 0x9800 >> 8, laser.ts)
    const rawMaxDrawn = BEAM_REACH - cameraCol // a pre-R4 (raw-world) kill can draw no further right than this
    const drawnCol = (worldX: number): number => wrap16(worldX - camera) >> 8

    // Plant a lander DRAWN in the ship's firing lane (screen col 100), with a lure humanoid on the beam
    // row far enough that it lingers there under fire instead of grabbing (the df5-10-R1 technique) — but
    // NEARER than any auto-seeded ground humanoid, so it targets the lure. Its WORLD column is a whole
    // camera to the right (col ~159), OUTSIDE the beam's raw reach — so only on-screen-consistent collision
    // can ever hit it.
    const DRAWN_START = 100
    s = spawnHumanoid(s, wrap16(camera + (DRAWN_START << 8) + 2400), 120) // lure on the beam row
    s = spawnLander(s, wrap16(camera + (DRAWN_START << 8)))

    let onscreenOnlyKill = false
    for (let i = 0; i < 4000 && !onscreenOnlyKill; i++) {
      s = stepSim(s, FIRE)
      onscreenOnlyKill = s.effects.some(
        (e) =>
          e.kind === 'explode' &&
          drawnCol(e.x) > rawMaxDrawn + 5 && // safely beyond anything raw-world collision could hit
          drawnCol(e.x) <= BEAM_REACH &&
          Math.abs(e.y - 120) <= 30, // near the ship's beam row, not a top-of-screen carry kill
      )
    }
    expect(
      onscreenOnlyKill,
      `a lander DRAWN in the far beam band (screen col ${rawMaxDrawn + 5}..${BEAM_REACH}, beyond any raw-world ` +
        'collision reach) was never killed at a scrolled camera — COLIDE is still testing the raw world ' +
        'position, not the on-screen position the player sees (df5-9-R4: you cannot shoot what you see once ' +
        'the world scrolls)',
    ).toBe(true)
  })
})
