// plugins/missile-command/tests/place-cursor.test.ts
//
// Story mc10-1 — RED phase (O'Brien / TEA). ABSOLUTE-AIM cursor.
//
// The mc1-3 crosshair integrates RELATIVE pointer motion (movementX/movementY)
// through core/cursor.moveCursor. With no pointer lock and 1 screen px = 1 cabinet
// unit across a ~2000px canvas, the aim is twitchy and never tracks the mouse.
// mc10-1 replaces that with ABSOLUTE placement: map the mouse's canvas position to
// a cabinet coordinate — the exact INVERSE of the render projection — and clamp.
//
// ─── THE MAPPING TO INVERT (shell/render.ts:50 `project`) ────────────────────
// project maps a cabinet FieldPos -> canvas pixels over a LOGICAL field that is
// LOGICAL_WIDTH = 0x100 = 256 columns wide and LOGICAL_HEIGHT = 222 rows tall
// (TOPSCR=222., W3COMN.MAC:107). It FLIPS V (cabinet V is bottom-origin):
//     x = (h / 256) * width
//     y = height - (v / 222) * height
// The new pure core `placeCursor(x, y, width, height)` is its inverse — same
// signature shape as project, mirrored — mapping a canvas pixel back to a cabinet
// cursor, KEEPING the V-flip, then clamping to the cabinet play area:
//     h = (x / width) * 256                     clamped to [HMIN=8,  HMAX=247]
//     v = 222 - (y / height) * 222   (V-flip)   clamped to [VMIN=45, VMAX=206]
// The four clamp bounds are core/cursor.ts's existing HMIN/HMAX/VMIN/VMAX (the
// UPDCUR/DOCURS clamp, W3MAIN:587; W3COMN.MAC:113/115/117/119, TOPSCR :107).
//
// It is ABSOLUTE: the result is a function of (x, y, width, height) ALONE — the
// prior cursor is irrelevant (that is the whole fix), so placeCursor takes no
// cursor argument, unlike moveCursor.
//
// ─── WHY THESE NUMBERS ARE DISCRIMINATING ────────────────────────────────────
// Two canvas sizes yield the SAME interior cursor {h:100, v:122}: a 256x222
// "unit" canvas (1px=1unit) and a 512x666 (2x by 3x) canvas. An implementation
// that forgets to divide by width/height reddens the 512x666 case; one that drops
// the V-flip reddens every case where y is off-centre (top->high v, bottom->low
// v). The clamp/off-canvas cases pin all four edges in both directions.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// core/cursor.ts EXISTS (moveCursor) but has no `placeCursor` export yet.
// loadPlaceCursor() imports the module and throws a self-describing "not built
// yet" if the export is missing, so every mapping test reddens for the FEATURE's
// absence — not a module-resolution stack trace. Purity of the new function is
// guarded automatically by the src/core sweep in purity.test.ts (no re-assert
// here). GREEN (Dev) adds placeCursor to core/cursor.ts and rewires main.ts.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/** The crosshair position in cabinet coordinates (V origin at the BOTTOM). */
interface Cursor {
  readonly h: number
  readonly v: number
}

interface PlaceCursorModule {
  /** Map a canvas pixel (x, y) over a (width, height) canvas to the clamped
   *  cabinet cursor — the inverse of render.project, keeping the V-flip. Pure. */
  placeCursor: (x: number, y: number, width: number, height: number) => Cursor
  /** mc1-3's relative reducer — must survive (regression guard). */
  moveCursor: (cursor: Cursor, delta: { dh: number; dv: number }) => Cursor
}

// Variable specifier + `/* @vite-ignore */` so `tsc --noEmit` (the release gate)
// stays green while placeCursor is still absent — the fleet RED-import idiom.
const CURSOR_SPECIFIER = '../src/core/cursor.js'

async function loadPlaceCursor(): Promise<PlaceCursorModule> {
  try {
    const mod = (await import(/* @vite-ignore */ CURSOR_SPECIFIER)) as Partial<PlaceCursorModule>
    if (typeof mod.placeCursor !== 'function') {
      throw new Error('module has no `placeCursor` export')
    }
    return mod as PlaceCursorModule
  } catch (e) {
    throw new Error(
      'placeCursor not built yet — GREEN (Dev) adds a PURE `placeCursor(x, y, width, height)` to ' +
        'src/core/cursor.ts: the inverse of shell/render.project. h = (x/width)*256 clamped to ' +
        '[HMIN=8, HMAX=247]; v = 222 - (y/height)*222 (the V-flip) clamped to [VMIN=45, VMAX=206]. ' +
        'LOGICAL_WIDTH=256 (0x100), LOGICAL_HEIGHT=222 (TOPSCR, W3COMN.MAC:107). Absolute — takes ' +
        `no prior cursor. No DOM/window (purity.test.ts sweeps src/core). (${(e as Error).message})`,
    )
  }
}

// ─── AC1 — the interior mapping: scale + V-flip, pinned across two canvas sizes ─

describe('AC1 — placeCursor inverts render.project (scale + V-flip) in the interior', () => {
  it('unit canvas (256x222, 1px=1unit): (100,100) -> {h:100, v:122}', async () => {
    const { placeCursor } = await loadPlaceCursor()
    // h = 100/256*256 = 100 ; v = 222 - 100/222*222 = 122. Both strictly interior,
    // so this pins the raw mapping, not a clamp. v != y (122 != 100) proves the flip.
    expect(placeCursor(100, 100, 256, 222)).toEqual({ h: 100, v: 122 })
  })

  it('scaled canvas (512x666, 2x by 3x): (200,300) -> {h:100, v:122}', async () => {
    const { placeCursor } = await loadPlaceCursor()
    // h = 200/512*256 = 100 ; v = 222 - 300/666*222 = 222 - 100 = 122. Same cursor
    // as the unit canvas — an impl that ignores width/height cannot produce this.
    expect(placeCursor(200, 300, 512, 666)).toEqual({ h: 100, v: 122 })
  })

  it('the V-flip is real: a higher canvas y yields a LOWER cabinet v', async () => {
    const { placeCursor } = await loadPlaceCursor()
    // Two interior y's on the unit canvas; x fixed. Canvas y grows DOWNWARD, cabinet
    // v grows UPWARD, so nearer-the-top (smaller y) must give the larger v.
    const near = placeCursor(128, 60, 256, 222) // higher on screen
    const far = placeCursor(128, 160, 256, 222) // lower on screen
    expect(near.v).toBe(222 - 60) // 162
    expect(far.v).toBe(222 - 160) // 62
    expect(near.v).toBeGreaterThan(far.v)
  })
})

// ─── AC1 — the clamp: all four edges land exactly on the play-area bounds ──────

describe('AC1 — placeCursor clamps the mapped coord to the cabinet play area', () => {
  it('canvas left edge (x=0) clamps h to HMIN (8)', async () => {
    const { placeCursor } = await loadPlaceCursor()
    // raw h = 0 < HMIN -> 8. y=111 is interior so v is unclamped here.
    expect(placeCursor(0, 111, 256, 222).h).toBe(8)
  })

  it('canvas right edge (x=width) clamps h to HMAX (247)', async () => {
    const { placeCursor } = await loadPlaceCursor()
    // raw h = 256 > HMAX -> 247.
    expect(placeCursor(256, 111, 256, 222).h).toBe(247)
  })

  it('canvas TOP (y=0) clamps v to VMAX (206) — flip sends the top to max v', async () => {
    const { placeCursor } = await loadPlaceCursor()
    // raw v = 222 - 0 = 222 > VMAX -> 206. If the flip were dropped, y=0 -> v=0 -> 45.
    expect(placeCursor(128, 0, 256, 222).v).toBe(206)
  })

  it('canvas BOTTOM (y=height) clamps v to VMIN (45) — flip sends the bottom to min v', async () => {
    const { placeCursor } = await loadPlaceCursor()
    // raw v = 222 - 222 = 0 < VMIN -> 45. Drop the flip and this would be 206.
    expect(placeCursor(128, 222, 256, 222).v).toBe(45)
  })
})

// ─── AC1 — off-canvas pointers clamp in BOTH directions on BOTH axes ──────────

describe('AC1 — placeCursor clamps off-canvas pointers to the nearest edge', () => {
  it('negative x and beyond-width x both clamp h to [8, 247]', async () => {
    const { placeCursor } = await loadPlaceCursor()
    expect(placeCursor(-50, 111, 256, 222).h).toBe(8) // left of the canvas
    expect(placeCursor(500, 111, 256, 222).h).toBe(247) // right of the canvas
  })

  it('negative y and beyond-height y both clamp v to [45, 206]', async () => {
    const { placeCursor } = await loadPlaceCursor()
    // y < 0 -> raw v > 222 -> VMAX 206 (above the canvas, flip keeps it high).
    expect(placeCursor(128, -50, 256, 222).v).toBe(206)
    // y > height -> raw v < 0 -> VMIN 45 (below the canvas).
    expect(placeCursor(128, 300, 256, 222).v).toBe(45)
  })
})

// ─── AC1 — placeCursor is ABSOLUTE and pure (no prior-cursor dependence) ──────

describe('AC1 — placeCursor is absolute and referentially transparent', () => {
  it('the same (x,y,width,height) always yields the same cursor', async () => {
    const { placeCursor } = await loadPlaceCursor()
    const a = placeCursor(77, 133, 256, 222)
    const b = placeCursor(77, 133, 256, 222)
    expect(a).toEqual(b)
    // and it is a FRESH object, never a shared/mutated singleton
    expect(a).not.toBe(b)
  })
})

// ─── AC1 — a degenerate canvas size never yields a NaN cursor ─────────────────
// main.ts feeds placeCursor rect.width/rect.height from getBoundingClientRect(),
// which is legitimately 0 for a hidden or not-yet-laid-out canvas. 0/0 = NaN, and
// clamp lets NaN pass both comparisons — so an unguarded map would write {h: NaN}
// into game state, breaking Cursor's documented [HMIN,HMAX]x[VMIN,VMAX] invariant.
// (Reviewer mc10-1: rule 21 / edge + silent-failure.)

describe('AC1 — placeCursor stays finite and in-range for a degenerate canvas', () => {
  it('zero width/height (0/0 → NaN path) clamps to a valid in-range cursor', async () => {
    const { placeCursor } = await loadPlaceCursor()
    for (const c of [placeCursor(0, 0, 0, 0), placeCursor(50, 50, 0, 0), placeCursor(0, 0, 0, 222)]) {
      expect(Number.isFinite(c.h), `h must be finite, got ${c.h}`).toBe(true)
      expect(Number.isFinite(c.v), `v must be finite, got ${c.v}`).toBe(true)
      expect(c.h).toBeGreaterThanOrEqual(8)
      expect(c.h).toBeLessThanOrEqual(247)
      expect(c.v).toBeGreaterThanOrEqual(45)
      expect(c.v).toBeLessThanOrEqual(206)
    }
  })
})

// ─── AC4 — mc1-3's relative reducer is not removed by the new export ──────────

describe('AC4 — moveCursor survives alongside placeCursor', () => {
  it('core/cursor.ts still exports the mc1-3 moveCursor reducer', async () => {
    const { moveCursor } = await loadPlaceCursor()
    expect(typeof moveCursor).toBe('function')
    // still clamps: pushing well past HMAX lands on 247, past VMIN lands on 45.
    expect(moveCursor({ h: 240, v: 50 }, { dh: 100, dv: -100 })).toEqual({ h: 247, v: 45 })
  })

  it('applyPointerMotion remains defined in shell/input.ts (AC4 keeps it)', () => {
    // AC4 in the session mislabels the file as cursor.ts; applyPointerMotion has
    // always lived in shell/input.ts. mc10-1 kept it as dead-but-defined; mc12-3
    // re-wires main.ts back onto it for the trackball live aim. Either way it must
    // not be deleted — pin that it survives.
    const input = readFileSync(join(root, 'src', 'shell', 'input.ts'), 'utf8')
    expect(input).toMatch(/export function applyPointerMotion\b/)
  })
})

// ─── AC2 (mc10-1) — SUPERSEDED by mc12-3 ─────────────────────────────────────
//
// mc10-1's AC2 pinned main.ts's *wiring* to ABSOLUTE placement: main.ts must read
// no movementX/movementY, must assign `cursor: placeCursor(...)`, must map
// clientX/clientY through the canvas rect, and must import placeCursor. mc12-3
// (pointer-lock TRACKBALL aim, made the default) DELIBERATELY reverses exactly that
// main.ts wiring — completing mc10-1's own explicit deferral of "trackball
// (relative + pointer-lock, scaled) as an optional later mode," NOT a silent
// reversal of its twitch fix (logged as a Design Deviation / ADR-delta in the
// mc12-3 session). main.ts now reads locked movementX/movementY, drives the pure
// applyPointerMotion (→ core moveCursor) scaled by TRACKBALL_SCALE, and no longer
// uses placeCursor for live aim. The four source-text pins that asserted the
// superseded absolute wiring are therefore RETIRED here; the main.ts aim wiring is
// now owned by tests/pointer-lock.test.ts (source-read pins + a boot-harness proof
// that a canvas click actually reaches requestPointerLock).
//
// What is NOT retired: the AC1 tests above still pin the pure core `placeCursor`
// FUNCTION (interior scale/V-flip mapping + clamp) — that function is unchanged and
// still exported from core/cursor.ts; mc12-3 only stops main.ts from calling it for
// live aim.

// ─── Anti-drift anchor: the projection basis placeCursor inverts is real ──────
// Green now (reads shell/render.ts as data). If a later edit changes the render
// projection's logical basis (256 / 222 / the V-flip), placeCursor's fixed
// expectations above would silently disagree with the renderer; this reddens HERE
// so the divergence is caught at its source, not blamed on a human's aim.

describe('source ground truth — placeCursor inverts render.project as written', () => {
  it('render.ts still projects over a 256-wide, 222-tall field with a V-flip', () => {
    const render = readFileSync(join(root, 'src', 'shell', 'render.ts'), 'utf8')
    expect(existsSync(join(root, 'src', 'shell', 'render.ts'))).toBe(true)
    expect(render).toMatch(/LOGICAL_WIDTH\s*=\s*0x100/) // 256
    expect(render).toMatch(/LOGICAL_HEIGHT\s*=\s*222/) // TOPSCR
    // the V-flip in project(): y = height - (v / LOGICAL_HEIGHT) * height
    expect(render).toMatch(/height\s*-\s*\(pos\.v\s*\/\s*LOGICAL_HEIGHT\)\s*\*\s*height/)
  })
})
