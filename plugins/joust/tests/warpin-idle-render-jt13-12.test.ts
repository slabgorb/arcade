// tests/warpin-idle-render-jt13-12.test.ts
//
// Story jt13-12 — the TREFF phase-2 idle colour-cycle WIRED INTO THE PLAYABLE GAME.
// jt13-9 built the pure IdleCycleState and opened it in the sim, but nothing DREW it —
// the colour-cycle was invisible in play. This suite pins the render seam end-to-end
// through the REAL game pipeline (createGame → stepGame → drawList):
//
//   • while a re-materialising player's idle cycle is active, drawList emits a
//     `kind:'warpin'` op whose `colour` nibble CYCLES through the TREPL palette
//     (owner / white / grey) — that op is painted by render.paintWarpIn (which the
//     render test below pins reads the explicit nibble);
//   • a FLAP ends the cycle ('moved') and drawList immediately STOPS emitting the op,
//     so the cycling colour never ghosts onto the bird as it flies away.
//
// Driven through the real sim, not by hand-poking state — the wiring is the point.

import { describe, it, expect } from 'vitest'
import { createGame, stepGame, type GameState } from '../src/core/game.js'
import { drawList } from '../src/core/sim.js'
import { seatWaveInstantly } from './helpers/wave-entry.js'
import { loadRender } from './helpers/render-contract.js'
import { loadPictures } from './helpers/pictures-contract.js'

type PaintWarpIn = (
  context: { fillStyle: string; fillRect(x: number, y: number, w: number, h: number): void },
  op: { x: number; y: number; width?: number; height?: number; frame?: number; owner?: string; name?: string; colour?: number },
  colours: readonly { r: number; g: number; b: number; a: number }[],
) => void

// pt1-14 — the warp-in now draws the arriving bird's own sprite silhouette, so its op
// carries a resolvable mount frame name (P1 ostrich stand → source block ORUN4R).
const MOUNT = 'ORSTND'

function recordingContext() {
  const fills: Array<{ x: number; y: number; w: number; h: number; style: string }> = []
  const ctx = {
    fillStyle: '',
    fillRect(x: number, y: number, w: number, h: number): void {
      fills.push({ x, y, w, h, style: ctx.fillStyle })
    },
  }
  return { ctx, fills }
}

// TREPL colour PROM nibbles (JOUSTRV4.SRC:52/54/57/58, :5581-5583): P1 yellow $5, P2
// green $7, white $1, grey $D. A player's idle cycles owner/white/grey.
const WHITE = 0x1
const GREY = 0xd
const P1 = 0x5
const P2 = 0x7

/** The r,g,b channels of a fillStyle, alpha-agnostic — pt1-14 made the warp-in fill an
 *  rgba() shimmer, so this pins the COLOUR nibble without coupling to that alpha. */
const channels = (style: string): string => style.match(/[\d.]+/g)!.slice(0, 3).join(',')

const activeIdlePlayer = (g: GameState) =>
  g.sim.sim.processes.find((p) => p.kind === 'player' && p.idleCycle?.end === 'active')

/** Drive a seeded 2P game (so a knight dies and re-materialises) until a player's idle cycle is active. */
function driveToIdlePlayer(seed: number): { g: GameState; id: number } | null {
  let g: GameState = { ...createGame(seed, 2), sim: seatWaveInstantly(createGame(seed, 2).sim) }
  for (let f = 0; f < 8000; f++) {
    g = stepGame(g, {})
    const held = activeIdlePlayer(g)
    if (held) return { g, id: held.id }
  }
  return null
}

const warpinColours = (g: GameState): number[] =>
  drawList(g.sim)
    .filter((o) => o.kind === 'warpin')
    .map((o) => o.colour)
    .filter((c): c is number => typeof c === 'number')

describe('jt13-12 — a re-materialising player renders its idle colour-cycle', () => {
  it('drawList emits a warpin op whose colour cycles through the TREPL palette while idle', () => {
    const hit = driveToIdlePlayer(0xbeef)
    expect(hit, 'a player reaches an active idle cycle in ordinary play').not.toBeNull()

    // Collect the warpin colours drawn for this arrival over its wait.
    let g = hit!.g
    const seen = new Set<number>(warpinColours(g))
    for (let i = 0; i < 400 && activeIdlePlayer(g); i++) {
      g = stepGame(g, {})
      for (const c of warpinColours(g)) seen.add(c)
    }
    // The cycle visits owner (P1 $5 or P2 $7), white ($1) AND grey ($D) — not a single
    // static colour. A build that never wired the render draws NO warpin op here.
    expect(seen.size, 'the idle bird is drawn (a warpin op is emitted)').toBeGreaterThan(0)
    expect(seen.has(WHITE), 'the cycle flashes white ($1)').toBe(true)
    expect(seen.has(GREY), 'the cycle flashes grey ($D)').toBe(true)
    expect([...seen].some((c) => c === P1 || c === P2), 'the cycle shows the owner colour ($5/$7)').toBe(true)
    // Every colour drawn is a real TREPL nibble — no stray/invented colour.
    expect([...seen].every((c) => c === WHITE || c === GREY || c === P1 || c === P2), 'only TREPL nibbles').toBe(true)
  })

  it('a flap ends the cycle and stops the tint (no ghost on the flying bird)', () => {
    const hit = driveToIdlePlayer(0xbeef)
    expect(hit, 'a player reaches an active idle cycle').not.toBeNull()
    // Precondition: the idle bird IS drawn as a tinted warpin op right now.
    expect(warpinColours(hit!.g).length, 'the idle bird is tinted before the flap').toBeGreaterThan(0)

    const flapped = stepGame(hit!.g, { [hit!.id]: { dir: 0, flap: true, flapHeld: true } })
    const p = flapped.sim.sim.processes.find((q) => q.id === hit!.id)
    expect(p?.idleCycle?.end, 'the flap ends the wait ("moved")').toBe('moved')
    // With the idle ended, drawList stops emitting ANY warpin op — the released bird is
    // drawn as a normal mount+rider entity, never overlaid with the cycling tint.
    expect(
      drawList(flapped.sim).filter((o) => o.kind === 'warpin').length,
      'no cycling tint ghosts onto the bird once it flaps away',
    ).toBe(0)
    expect(
      drawList(flapped.sim).filter((o) => o.kind === 'entity').length,
      'the released bird is drawn as normal entity ops',
    ).toBeGreaterThan(0)
  })
})

describe('jt13-12 — paintWarpIn honours the explicit idle colour nibble', () => {
  it('an op carrying colour=$D (grey) paints grey, NOT the owner colour ($5 yellow)', async () => {
    const r = await loadRender()
    const pics = await loadPictures()
    const paint = (r as unknown as { paintWarpIn: PaintWarpIn }).paintWarpIn
    const colours = r.rgbaPalette(pics.PALETTES.COLOR1)
    const chan = (n: number) => `${colours[n].r},${colours[n].g},${colours[n].b}`

    // A full-height idle op for a P1 arrival, but on the GREY beat of the cycle.
    const rec = recordingContext()
    paint(rec.ctx, { x: 40, y: 100, width: 16, height: 20, frame: 29, owner: 'p1', name: MOUNT, colour: 0xd }, colours)
    expect(rec.fills.length, 'the idle bird paints at full height').toBeGreaterThan(0)
    expect(
      rec.fills.every((f) => channels(f.style) === chan(0xd)),
      'every rect is filled with the GREY nibble ($D) the op carries',
    ).toBe(true)
    expect(
      rec.fills.some((f) => channels(f.style) === chan(0x5)),
      'and NEVER the owner yellow ($5) — the explicit idle colour overrides the owner default',
    ).toBe(false)
  })

  it('with no explicit colour the op still paints the owner default ($5) — jt13-2 unchanged', async () => {
    const r = await loadRender()
    const pics = await loadPictures()
    const paint = (r as unknown as { paintWarpIn: PaintWarpIn }).paintWarpIn
    const colours = r.rgbaPalette(pics.PALETTES.COLOR1)
    const rec = recordingContext()
    paint(rec.ctx, { x: 40, y: 100, width: 16, height: 20, frame: 29, owner: 'p1', name: MOUNT }, colours)
    const yellow = `${colours[0x5].r},${colours[0x5].g},${colours[0x5].b}`
    expect(rec.fills.every((f) => channels(f.style) === yellow), 'owner P1 yellow ($5) when no colour override').toBe(true)
  })
})
