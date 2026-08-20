// tests/pt1-18-visible-window.test.ts
//
// Story pt1-18 — RED phase (Atia of the Julii / TEA). THE BUG: composeFrame blits every
// world entity with no visible-window cull, so all 256 columns of the world (0x10000>>8)
// are painted into the 292px raster — every attacker is always on screen and the camera
// scroll / scanner are cosmetic. df5-9 already threaded `state.camera` into composeFrame
// (the `- camera` offset), so the world IS camera-relative; what is still missing is the
// ROM's VISIBLE-WINDOW CULL and the wider world it implies.
//
// ROM GROUND TRUTH (reference/original-source/defender/DEFA7.SRC:2527-2530), the object
// on-screen test in the object-processing loop:
//     *CHECK ON SCREEN
//         LDD  OX16,X      ; object's absolute world X
//         SUBD BGL         ; screen-relative = worldX - camera (16-bit, wraps $10000)
//         CMPD #150*64     ; = 9600 = $2580
//         BHS  OPLP        ; OFF SCREEN -> skip the draw
// So an object is ON SCREEN iff (worldX - camera) & 0xffff < 150*64. The window is 150*64
// world-X units wide; the world is 0x10000 / (150*64) ≈ 6.8 screens, which the camera
// scrolls through. The terrain/explosion right-edge cull corroborates the window at $98
// (BLK71.SRC:638-645, SAMEXAP7.SRC:74). An off-camera attacker STILL projects onto the
// scanner — SCNR reads the absolute OX16, not the on-screen coordinate (scanner.ts /
// AMODE1.SRC:1260), which is the whole reason the radar exists.
//
// These tests pin the CULL, the SCANNER preservation and the SCROLL reveal BEHAVIOURALLY,
// via df5-9's diff-frame technique (locate an entity's columns without knowing its palette
// colour by diffing a frame containing it against the same frame without it). They assert
// PRESENCE/ABSENCE and the world-X window boundary — never a hard-coded pixel scale — so
// they survive whatever exact projection GREEN lands on (>>6 into a 150px window, scaled or
// letterboxed into the 292px raster). GREEN must reconcile the same window in the render AND
// the collision/laser hit-test paths (see the Delivery Finding on the session) — that
// consistency is verified live in the verify phase.

import { describe, it, expect } from 'vitest'
import { createSim, type SimState } from '../src/core/sim.js'
import { composeFrame } from '../src/core/scene.js'
import { projectScanner, SCANNER_COLUMNS } from '../src/core/scanner.js'
import { wrap16, projectWorldX, SCREEN_WIDTH } from '../src/core/world.js'
import { LOGICAL_WIDTH } from '../src/shell/render.js'
import type { Framebuffer } from '../src/core/framebuffer.js'

const W = 292
const H = 240
const HROW = 200 // a humanoid on the terrain, comfortably within the vertical band

// The ROM visible-window width in world-X units: CMPD #150*64 (DEFA7.SRC:2529). On-screen
// iff (worldX - camera) & 0xffff < 150*64; BHS makes exactly 150*64 the first OFF-screen unit.
const VISIBLE_WINDOW_X = 150 * 64 // 9600 = $2580

function makeRand(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return (s >>> 16) & 0xff
  }
}

const base = createSim(makeRand(1))

// A state with exactly ONE controlled humanoid at world-x `wx` and everything else cleared,
// so the humanoid is the only world-space entity in the frame (the df5-9 fixture shape).
const withHumanoid = (wx: number, camera: number): SimState => ({
  ...base,
  camera,
  humanoids: [{ x: wx, y: HROW, facing: 'right', state: 'walking', alive: true }],
  landers: [],
  lasers: [],
  effects: [],
})
const noEntities = (camera: number): SimState => ({
  ...base,
  camera,
  humanoids: [],
  landers: [],
  lasers: [],
  effects: [],
})

/** Columns where two same-size frames differ in ANY row. */
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

/** Leftmost main-view column the humanoid at `wx` occupies under `camera`, or -1 if not drawn. */
const humanoidCol = (wx: number, camera: number): number => {
  const cols = diffCols(composeFrame(withHumanoid(wx, camera), W, H), composeFrame(noEntities(camera), W, H))
  return cols.length ? cols[0] : -1
}

describe('pt1-18 — the main view is a 150*64 scrolling window onto a ~6.8-screen world, not the whole world at once', () => {
  it('an attacker OUTSIDE the visible window is culled from the main view (today the entire world is drawn)', () => {
    const wx = 20000 // camera-rel 20000 >= 9600 => OFF screen (renders at col 20000>>8=78 TODAY)
    expect(wrap16(wx), 'fixture sanity: this world-x is beyond the 150*64 window at camera 0').toBeGreaterThanOrEqual(
      VISIBLE_WINDOW_X,
    )
    expect(
      humanoidCol(wx, 0),
      'an attacker outside the 150*64 window must NOT be blitted into the main view — the world is a scrolling ' +
        'window, not a single screen showing every attacker at once (DEFA7.SRC:2527-2530, BHS OPLP OFF SCREEN)',
    ).toBe(-1)
  })

  it('an attacker INSIDE the window is still drawn (the cull must not blank the playfield)', () => {
    const wx = 4000 // camera-rel 4000 < 9600 => on screen
    expect(
      humanoidCol(wx, 0),
      'an on-window attacker must still be drawn — the cull removes only what is off-camera',
    ).toBeGreaterThanOrEqual(0)
  })

  it('the window is exactly 150*64 wide: camera-rel 9599 is drawn, 9600 is culled (the CMPD #150*64 / BHS boundary)', () => {
    expect(
      humanoidCol(VISIBLE_WINDOW_X - 1, 0),
      'camera-rel 9599 is the last on-screen unit (< 150*64)',
    ).toBeGreaterThanOrEqual(0)
    expect(
      humanoidCol(VISIBLE_WINDOW_X, 0),
      'camera-rel 9600 is the first OFF-screen unit — BHS OPLP fires at exactly CMPD #150*64 (mutate the constant ' +
        'and this reddens)',
    ).toBe(-1)
  })

  it('the world is wider than one screen: scrolling the camera reveals an off-window attacker', () => {
    const wx = 20000
    expect(humanoidCol(wx, 0), 'off-window at camera 0').toBe(-1)
    const camera = 15000 // wrap16(20000 - 15000) = 5000 < 9600 => now inside the window
    expect(wrap16(wx - camera), 'fixture sanity: the scroll brings it inside the window').toBeLessThan(VISIBLE_WINDOW_X)
    expect(
      humanoidCol(wx, camera),
      'scrolling the camera must bring an off-window attacker into view — proof the world spans more than one ' +
        'screen (a fixed single-screen world could never reveal it)',
    ).toBeGreaterThanOrEqual(0)
  })

  it('a culled attacker STILL projects onto the scanner — off-camera attackers on radar is the point of SCNR', () => {
    const wx = 20000
    expect(humanoidCol(wx, 0), 'the attacker is off the main view').toBe(-1)
    const [blip] = projectScanner([{ worldX: wx, y: HROW, colour: 5 }], 0)
    expect(
      blip.x,
      'SCNR reads the absolute OX16 (not the on-screen coord), so an off-screen attacker must still blip — a naive ' +
        'cull that removes it everywhere would blind the radar',
    ).toBeGreaterThanOrEqual(0)
    expect(blip.x, 'and lands within the 64-column radar strip').toBeLessThan(SCANNER_COLUMNS)
  })
})

describe('pt1-18 — the projection contract, pinned directly (not through the render clip)', () => {
  // The render-based cull tests above observe projectWorldX through composeFrame, where
  // blitObject's own bounds clip discards any pixel >= 292 — which masks the exact BHS boundary
  // and the load-bearingness of the null cull (reviewer test-analyzer). These assert the contract
  // on the function's return value directly, so a flip of `>=` to `>` or a deleted guard reddens.
  it('projectWorldX returns null AT the window boundary and a pixel just inside it (the BHS >= boundary)', () => {
    expect(projectWorldX(VISIBLE_WINDOW_X - 1, 0), 'camera-rel 9599 is inside the window → a real pixel').not.toBeNull()
    expect(projectWorldX(VISIBLE_WINDOW_X, 0), 'camera-rel 9600 is OFF the window → null (BHS OPLP fires at >= 150*64)').toBeNull()
  })

  it('projectWorldX culls every off-window offset (the null guard is load-bearing, not equivalent)', () => {
    for (const off of [VISIBLE_WINDOW_X, 0x4000, 0x8000, 0xff00]) {
      expect(projectWorldX(off, 0), `off-window offset ${off} must be culled`).toBeNull()
    }
    // …and an on-window pixel is always inside the raster [0, SCREEN_WIDTH).
    const px = projectWorldX(VISIBLE_WINDOW_X - 1, 0)
    expect(px).not.toBeNull()
    expect(px as number).toBeGreaterThanOrEqual(0)
    expect(px as number).toBeLessThan(SCREEN_WIDTH)
  })

  it('SCREEN_WIDTH (core, drives collision) equals LOGICAL_WIDTH (shell, drives render) — they must not drift', () => {
    // world.ts carries SCREEN_WIDTH so the sim's collision maps the visible window to the same
    // raster width the shell renders at. If the board width ever changes in render.ts, this reddens.
    expect(SCREEN_WIDTH, 'core SCREEN_WIDTH must equal shell LOGICAL_WIDTH or collision & render disagree').toBe(
      LOGICAL_WIDTH,
    )
  })
})
