// plugins/missile-command/tests/input.test.ts
//
// Story mc1-3 — RED phase (Han Solo / TEA). AC2: the shell (`src/shell/input.ts`)
// maps mouse/trackball motion into the per-frame cursor delta and drives the
// crosshair through the core reducer, so on screen at /missile-command/ the
// crosshair moves and CANNOT leave the play area. Core owns the clamp arithmetic
// (core/cursor.ts, cursor.test.ts); this file proves the shell CONSUMES it and
// adapts screen space to cabinet space — it does not re-implement the clamp.
//
// ─── PIXELS ARE THE REVIEWER'S JOB; MAPPING + WIRING ARE OURS ─────────────────
// AC2's real acceptance artefact is a screenshot at /missile-command/ showing a
// trackball-driven crosshair that stops at the field edge — an owner/reviewer
// check no node test can make (and the vitest env here is `node`, not jsdom, so
// there is no live pointer surface to drive). What a node test CAN pin is the
// deterministic seam under the DOM listener: a pure `applyPointerMotion(cursor,
// movementX, movementY)` that (a) turns a screen-space pointer movement into a
// cabinet delta and (b) returns the next cursor via core's moveCursor. The DOM
// listener that calls it each pointermove and the crosshair glyph are main.ts /
// render.ts work the screenshot covers; the fire keys (Z/X/C) are mc1-4.
//
// ─── THE V-FLIP (the one adaptation this seam owns) ──────────────────────────
// The pointer is top-left origin: movementY > 0 means the pointer moved DOWN the
// screen. The cabinet cursor V is bottom-origin (render.ts flips V to paint it:
// `y = height - v/H*height`). For the crosshair to track the pointer, moving the
// pointer UP (movementY < 0) must move the cursor UP the field (v INCREASES). So
// input.ts feeds dv = -movementY (and dh = movementX) to the core reducer. Feeding
// dv = +movementY would invert the vertical axis — the exact bug this pins.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// Neither `src/shell/input.ts` nor `src/core/cursor.ts` exists yet. Both loaders
// dynamic-import their module and throw a self-describing "not built yet", so
// every test reddens for the FEATURE's absence rather than a raw module-resolution
// stack trace. Green arrives when Dev builds cursor.ts (GREEN) and input.ts wiring.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// ─── The contracts GREEN (Yoda / Dev) implements ─────────────────────────────

interface Cursor {
  readonly h: number
  readonly v: number
}

interface InputModule {
  /**
   * Map a screen-space pointer movement (movementX/Y, top-left origin) to the
   * next cursor: dh = movementX, dv = -movementY (the V-flip), fed through the
   * core clamp. Pure and deterministic.
   */
  applyPointerMotion: (cursor: Cursor, movementX: number, movementY: number) => Cursor
}

interface CursorModule {
  HMIN: number
  HMAX: number
  VMIN: number
  VMAX: number
  moveCursor: (cursor: Cursor, delta: { readonly dh: number; readonly dv: number }) => Cursor
}

// Variable specifiers + `/* @vite-ignore */` so `tsc --noEmit` (the release gate)
// stays green while the modules are still absent — the fleet RED-import idiom.
const INPUT_SPECIFIER = '../src/shell/input.js'
const CURSOR_SPECIFIER = '../src/core/cursor.js'

async function loadInput(): Promise<InputModule> {
  try {
    const mod = (await import(/* @vite-ignore */ INPUT_SPECIFIER)) as Partial<InputModule>
    if (typeof mod.applyPointerMotion !== 'function') {
      throw new Error('module has no `applyPointerMotion` export')
    }
    return mod as InputModule
  } catch (e) {
    throw new Error(
      'input shell module not built yet — Dev creates src/shell/input.ts exporting ' +
        'applyPointerMotion(cursor, movementX, movementY): it maps the screen-space pointer ' +
        'delta to a cabinet delta (dh = movementX, dv = -movementY — the V-flip, since the ' +
        'pointer is top-left origin and cabinet V is bottom-origin) and returns the next cursor ' +
        'via core/cursor.moveCursor, so the clamp is CONSUMED from core, not re-implemented. ' +
        `(${(e as Error).message})`,
    )
  }
}

async function loadCursor(): Promise<CursorModule> {
  try {
    const mod = (await import(/* @vite-ignore */ CURSOR_SPECIFIER)) as Partial<CursorModule>
    if (typeof mod.moveCursor !== 'function') throw new Error('module has no `moveCursor` export')
    return mod as CursorModule
  } catch (e) {
    throw new Error(`core/cursor.ts not built yet (see cursor.test.ts). (${(e as Error).message})`)
  }
}

describe('AC2 — the pointer moves the crosshair in the right direction', () => {
  it('moving the pointer RIGHT (movementX > 0) increases h', async () => {
    const { applyPointerMotion } = await loadInput()
    const from: Cursor = { h: 100, v: 100 }
    expect(applyPointerMotion(from, 10, 0).h).toBeGreaterThan(from.h)
  })

  it('moving the pointer LEFT (movementX < 0) decreases h', async () => {
    const { applyPointerMotion } = await loadInput()
    const from: Cursor = { h: 100, v: 100 }
    expect(applyPointerMotion(from, -10, 0).h).toBeLessThan(from.h)
  })

  it('moving the pointer UP (movementY < 0) moves the crosshair UP the field (v increases)', async () => {
    const { applyPointerMotion } = await loadInput()
    const from: Cursor = { h: 100, v: 100 }
    expect(applyPointerMotion(from, 0, -10).v, 'the V-flip: screen-up is cabinet-V-up').toBeGreaterThan(
      from.v,
    )
  })

  it('moving the pointer DOWN (movementY > 0) moves the crosshair DOWN the field (v decreases)', async () => {
    const { applyPointerMotion } = await loadInput()
    const from: Cursor = { h: 100, v: 100 }
    expect(applyPointerMotion(from, 0, 10).v).toBeLessThan(from.v)
  })
})

describe('AC2 — input.ts feeds motion AS the delta through the core reducer', () => {
  it('equals moveCursor(cursor, {dh: movementX, dv: -movementY}) for interior motion', async () => {
    // The literal reading of "feeds mouse/trackball motion as the delta": the
    // pointer movement IS the cabinet delta (V flipped), handed straight to the
    // core clamp. This ties the shell to core/cursor with no room for a private
    // clamp or a swapped/duplicated axis.
    const { applyPointerMotion } = await loadInput()
    const { moveCursor } = await loadCursor()
    const cases: Array<[Cursor, number, number]> = [
      [{ h: 100, v: 100 }, 7, -4],
      [{ h: 60, v: 150 }, -12, 9],
      [{ h: 130, v: 80 }, 0, 0],
    ]
    for (const [cur, mx, my] of cases) {
      expect(applyPointerMotion(cur, mx, my)).toEqual(moveCursor(cur, { dh: mx, dv: -my }))
    }
  })
})

describe('AC2 — the crosshair cannot leave the play area, however hard you push', () => {
  it('a huge pointer sweep in any direction stays within the core bounds', async () => {
    const { applyPointerMotion } = await loadInput()
    const { HMIN, HMAX, VMIN, VMAX } = await loadCursor()
    const sweeps: Array<[number, number]> = [
      [10000, 10000],
      [-10000, -10000],
      [10000, -10000],
      [-10000, 10000],
    ]
    for (const [mx, my] of sweeps) {
      const out = applyPointerMotion({ h: 128, v: 128 }, mx, my)
      expect(out.h, `h escaped at movement (${mx},${my})`).toBeGreaterThanOrEqual(HMIN)
      expect(out.h, `h escaped at movement (${mx},${my})`).toBeLessThanOrEqual(HMAX)
      expect(out.v, `v escaped at movement (${mx},${my})`).toBeGreaterThanOrEqual(VMIN)
      expect(out.v, `v escaped at movement (${mx},${my})`).toBeLessThanOrEqual(VMAX)
    }
  })

  it('pushing right/up past the corner pins to (HMAX, VMAX)', async () => {
    const { applyPointerMotion } = await loadInput()
    const { HMAX, VMAX } = await loadCursor()
    // movementX huge +right, movementY huge -up → both maxima.
    expect(applyPointerMotion({ h: 200, v: 150 }, 9999, -9999)).toEqual({ h: HMAX, v: VMAX })
  })
})

describe('AC2 — input.ts consumes the core reducer, it does not re-implement the clamp', () => {
  const inputSrc = (): string => readFileSync(join(root, 'src', 'shell', 'input.ts'), 'utf8')

  it('imports moveCursor from core/cursor', () => {
    const src = inputSrc()
    expect(
      src,
      'input.ts must import the reducer from core/cursor — the clamp is core arithmetic, not a shell literal',
    ).toMatch(/from\s+['"][^'"]*core\/cursor(\.js)?['"]/)
    expect(src).toMatch(/\bmoveCursor\b/)
  })
})
