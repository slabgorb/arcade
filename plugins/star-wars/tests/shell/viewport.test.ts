// tests/shell/viewport.test.ts
//
// Story pt1-4 — RED phase (Leeloo / TEA). The 2026-08-19 playtest flagged that
// star-wars, alone in the fleet, does NOT frame its play area like battlezone and
// asteroids: it fills the whole browser window instead of pinning a fixed cabinet
// aspect with side bars. The user's call: "I want the games to have a consistent
// look, with a window and an overlay on the sides. Battlezone/asteroids does this
// already."
//
// What is ALREADY done (do NOT re-open): sw10-1 made the lens aspect-independent
// (the scene draws in a centered min(w,h) SQUARE that never stretches), and pt1-3
// fixed the surface projection scale. The residual defect this story kills is the
// FRAMING: `plugins/star-wars/src/main.ts` resolves the viewport with
// `resizeToDisplay(canvas, window.innerWidth, window.innerHeight, …)` — a
// window-FILLING seam (`@shared/view`) — so the CSS box and the W/H handed to
// `render()` track the whole window. The HUD (WAVE/score at `w - margin`, banners
// at `w/2`) therefore spreads to the full window edges while the scene sits in the
// central square, and on an ultrawide monitor the HUD flings out to the far edges
// with no bound. The fix pins a fixed 4:3 cabinet box and letterboxes it, so HUD
// and scene share ONE frame and the black page shows through as the side overlay.
//
// CONTRACT — a new pure-logic shell module `src/shell/viewport.ts`, mirroring
// battlezone's bz2-1 split (the sibling 3D cockpit game already solved exactly
// this; share the mechanism, keep our own numbers):
//
//   TARGET_ASPECT = 4 / 3   — the pinned cabinet ratio, WIDTH / HEIGHT (landscape).
//                             The authentic Star Wars cabinet is a 4:3 colour
//                             vector monitor — the same ratio battlezone pins — so
//                             star-wars joins the fleet look. Pinning the literal
//                             is the point: the AC is a FIXED ratio, not "some
//                             ratio". This constant is the tripwire if it drifts.
//   MAX_DPR       = 2        — HiDPI backing-store cap (matches @shared/view).
//
//   computeLetterbox(windowW, windowH, rawDpr, aspect = TARGET_ASPECT): Letterbox
//     Pure. Returns { cssWidth, cssHeight, bufferWidth, bufferHeight }:
//       - cssWidth/cssHeight = the largest `aspect`-ratio box that FITS inside the
//         window (letterbox invariant), touching the constraining edge.
//           * window wider than aspect  → height-constrained (bars left/right)
//           * window taller than aspect → width-constrained  (bars top/bottom)
//       - bufferWidth/bufferHeight = css size × min(MAX_DPR, rawDpr || 1), floored
//         to whole pixels (a canvas backing store must be integers).
//
//   applyLetterbox(canvas, windowW, windowH, rawDpr, aspect?): Letterbox
//     The DOM seam. Computes the fit, writes the integer buffer size to
//     canvas.width/height and the `<n>px` CSS box to canvas.style, and returns the
//     Letterbox it applied. Duck-typed on { width, height, style:{width,height} }
//     so it is testable with a plain object under Vitest's `node` environment.
//
// OUT OF SCOPE for these unit tests (deferred to a live playtest + TEA delivery
// finding): the index.html flex-centering that visually shows the bars, and the
// subjective "feels consistent with battlezone" confirmation — `node` cannot
// observe layout. Here we pin the deterministic math, the HiDPI backing store, the
// DOM seam, and the main.ts wiring.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { computeLetterbox, applyLetterbox, TARGET_ASPECT, MAX_DPR } from '../../src/shell/viewport'

/** Structural stand-in for the HTMLCanvasElement surface applyLetterbox mutates. */
interface FakeCanvas {
  width: number
  height: number
  style: { width: string; height: string }
}
function fakeCanvas(): FakeCanvas {
  return { width: 0, height: 0, style: { width: '', height: '' } }
}

describe('pt1-4 — computeLetterbox pins the cabinet aspect ratio', () => {
  it('TARGET_ASPECT is the 4:3 cabinet ratio (width / height), matching the fleet', () => {
    // Story-decision tripwire, decoupled from the fit math below: if the pinned
    // ratio ever changes, exactly this assertion moves — the math tests do not.
    expect(TARGET_ASPECT).toBe(4 / 3)
  })

  it('letterboxes a wide (landscape) window — bars on the left/right', () => {
    // 1920×1080 (16:9, wider than 4:3) → height is the constraint.
    const box = computeLetterbox(1920, 1080, 1)
    expect(box.cssHeight).toBe(1080) // full height used
    expect(box.cssWidth).toBe(1440) // 1080 × 4/3, NOT the full 1920
    expect(box.cssWidth).toBeLessThan(1920) // leftover width = the side bars
    expect(box.cssWidth / box.cssHeight).toBeCloseTo(4 / 3, 5)
  })

  it('letterboxes an ultrawide window — the HUD-fling-out case — to a bounded 4:3 box', () => {
    // 2560×1080 (21:9). The pre-fix defect: main.ts fills the full 2560, so the
    // HUD's `w - margin` anchors fling to x≈2560 while the scene square is only
    // 1080 wide and centred — HUD and scene divorced. The fit bounds the whole
    // composition to a 1440×1080 box, centred, with wide side bars.
    const box = computeLetterbox(2560, 1080, 1)
    expect(box.cssHeight).toBe(1080)
    expect(box.cssWidth).toBe(1440) // 1080 × 4/3, NOT 2560
    expect(box.cssWidth).toBeLessThan(2560)
    expect(box.cssWidth / box.cssHeight).toBeCloseTo(4 / 3, 5)
  })

  it('letterboxes a tall (portrait) window — bars on the top/bottom', () => {
    // 600×1000 (taller than 4:3) → width is the constraint.
    const box = computeLetterbox(600, 1000, 1)
    expect(box.cssWidth).toBe(600) // full width used
    expect(box.cssHeight).toBe(450) // 600 ÷ 4/3, NOT the full 1000
    expect(box.cssHeight).toBeLessThan(1000) // leftover height = the top/bottom bars
    expect(box.cssWidth / box.cssHeight).toBeCloseTo(4 / 3, 5)
  })

  it('fills an exact-4:3 window completely with no bars', () => {
    // Boundary: windowAspect === TARGET_ASPECT. The canvas must exactly equal the
    // window (both edges touched, zero letterbox).
    const box = computeLetterbox(800, 600, 1)
    expect(box.cssWidth).toBe(800)
    expect(box.cssHeight).toBe(600)
  })

  it('the fitted box never exceeds the window and always touches a constraining edge', () => {
    // Letterbox invariant across a sweep: canvas ⊆ window (bars fill the leftover),
    // and it is the MAXIMAL such box (one dimension equals the window exactly).
    const sizes: Array<[number, number]> = [
      [1920, 1080],
      [1024, 768],
      [500, 1200],
      [1600, 500],
      [333, 777],
      [2560, 1440],
    ]
    for (const [w, h] of sizes) {
      const box = computeLetterbox(w, h, 1)
      expect(box.cssWidth).toBeLessThanOrEqual(w + 1e-9)
      expect(box.cssHeight).toBeLessThanOrEqual(h + 1e-9)
      const touchesWidth = Math.abs(box.cssWidth - w) < 1e-6
      const touchesHeight = Math.abs(box.cssHeight - h) < 1e-6
      expect(touchesWidth || touchesHeight).toBe(true)
    }
  })

  it('holds the pinned ratio across a sweep of window sizes (AC: regardless of window size)', () => {
    const sizes: Array<[number, number]> = [
      [1920, 1080],
      [1024, 768],
      [500, 1200],
      [1600, 500],
      [333, 777],
      [2560, 1440],
      [640, 640],
    ]
    for (const [w, h] of sizes) {
      const box = computeLetterbox(w, h, 1)
      expect(box.cssWidth / box.cssHeight).toBeCloseTo(4 / 3, 5)
    }
  })
})

describe('pt1-4 — HiDPI backing store (device pixel ratio)', () => {
  it('scales the backing store by the device pixel ratio', () => {
    // 1200×900 is already exactly 4:3, so css == window; dpr 2 doubles the buffer.
    const box = computeLetterbox(1200, 900, 2)
    expect(box.cssWidth).toBe(1200)
    expect(box.cssHeight).toBe(900)
    expect(box.bufferWidth).toBe(2400)
    expect(box.bufferHeight).toBe(1800)
  })

  it('clamps devicePixelRatio to MAX_DPR (2) to bound the backing store', () => {
    expect(MAX_DPR).toBe(2)
    // A 3× display must NOT produce a 3× (3600×2700) buffer — it is capped at 2×.
    const box = computeLetterbox(1200, 900, 3)
    expect(box.bufferWidth).toBe(2400)
    expect(box.bufferHeight).toBe(1800)
  })

  it('respects a fractional dpr below the cap', () => {
    const box = computeLetterbox(1200, 900, 1.5)
    expect(box.bufferWidth).toBe(1800) // floor(1200 × 1.5)
    expect(box.bufferHeight).toBe(1350) // floor(900 × 1.5)
  })

  it('falls back to dpr 1 when devicePixelRatio is 0 or falsy (TS lang-review #4)', () => {
    // `rawDpr || 1`: a 0 / undefined devicePixelRatio is invalid, not a real 0× —
    // it must degrade to 1×, not collapse the backing store to nothing.
    const box = computeLetterbox(1200, 900, 0)
    expect(box.bufferWidth).toBe(1200)
    expect(box.bufferHeight).toBe(900)
  })

  it('produces an integer backing store even when the fit is fractional', () => {
    // 850×1000 → width-constrained: cssHeight = 850 ÷ 4/3 = 637.5, which must floor
    // to a whole-pixel backing store (canvas.width silently truncates otherwise).
    const box = computeLetterbox(850, 1000, 1)
    expect(box.cssWidth).toBe(850)
    expect(box.cssHeight).toBeCloseTo(637.5, 5)
    expect(box.bufferWidth).toBe(850)
    expect(box.bufferHeight).toBe(637) // floor(637.5)
    expect(Number.isInteger(box.bufferWidth)).toBe(true)
    expect(Number.isInteger(box.bufferHeight)).toBe(true)
  })

  it('keeps the backing store at 4:3 too — no stretch in the buffer (AC: no distortion)', () => {
    const box = computeLetterbox(1920, 1080, 2)
    expect(box.bufferWidth / box.bufferHeight).toBeCloseTo(4 / 3, 2)
  })
})

describe('pt1-4 — degenerate window dimensions do not produce NaN', () => {
  it('a zero-height window yields a zero-size canvas, not NaN', () => {
    // Collapsed/minimized window: windowW/0 = Infinity must not leak NaN into the
    // canvas size (which would poison every subsequent projection).
    const box = computeLetterbox(1000, 0, 1)
    expect(Number.isNaN(box.cssWidth)).toBe(false)
    expect(Number.isNaN(box.cssHeight)).toBe(false)
    expect(box.cssWidth).toBe(0)
    expect(box.cssHeight).toBe(0)
    expect(box.bufferWidth).toBe(0)
    expect(box.bufferHeight).toBe(0)
  })

  it('a zero-width window yields a zero-size canvas, not NaN', () => {
    const box = computeLetterbox(0, 1000, 1)
    expect(Number.isNaN(box.cssWidth)).toBe(false)
    expect(Number.isNaN(box.cssHeight)).toBe(false)
    expect(box.cssWidth).toBe(0)
    expect(box.cssHeight).toBe(0)
  })
})

describe('pt1-4 — applyLetterbox writes the fit onto the canvas element', () => {
  it('writes the integer backing store to canvas.width / canvas.height', () => {
    const c = fakeCanvas()
    applyLetterbox(c, 1200, 900, 2)
    expect(c.width).toBe(2400)
    expect(c.height).toBe(1800)
  })

  it('writes the letterboxed CSS box (in px) to canvas.style', () => {
    // 1920×1080 → 1440×1080 CSS. The style box is the LETTERBOXED size (1440),
    // never the full window width.
    const c = fakeCanvas()
    applyLetterbox(c, 1920, 1080, 1)
    expect(c.style.width).toBe('1440px')
    expect(c.style.height).toBe('1080px')
  })

  it('does NOT stretch a wide window to full width — the pt1-4 regression guard', () => {
    // The exact defect the story kills: a 2000×750 window must render a 1000px-wide
    // (750 × 4/3) canvas centered with side bars — NOT a full 2000px smear that
    // flings the HUD to the window edges.
    const c = fakeCanvas()
    applyLetterbox(c, 2000, 750, 1)
    expect(c.style.width).not.toBe('2000px')
    expect(c.style.width).toBe('1000px')
    expect(c.style.height).toBe('750px')
  })

  it('returns the same Letterbox it applied to the canvas', () => {
    const c = fakeCanvas()
    const box = applyLetterbox(c, 1920, 1080, 1)
    expect(box.bufferWidth).toBe(c.width)
    expect(box.bufferHeight).toBe(c.height)
    expect(c.style.width).toBe(`${box.cssWidth}px`)
    expect(c.style.height).toBe(`${box.cssHeight}px`)
  })
})

describe('pt1-4 — main.ts is actually wired to the letterbox fit (not orphaned)', () => {
  // main.ts is a DOM bootstrap that mounts the canvas at module top level, so it
  // cannot be imported under Vitest's `node` environment to drive resize()
  // directly. This source-level tripwire keeps the fix from shipping a
  // well-tested-but-unused module while resize() still fills the whole window —
  // the precise way this bug could survive a green suite.
  const mainSrc = readFileSync(fileURLToPath(new URL('../../src/main.ts', import.meta.url)), 'utf8')

  it('imports the letterbox seam from the viewport module', () => {
    expect(mainSrc).toContain('./shell/viewport')
    expect(mainSrc).toContain('applyLetterbox')
  })

  it('no longer resolves the viewport with the window-filling resizeToDisplay seam', () => {
    // The old resize() called `resizeToDisplay(canvas, window.innerWidth,
    // window.innerHeight, …)`, which fills the whole window. After the fix the
    // canvas is sized from the 4:3 letterbox fit, so that full-window seam is gone
    // from main.ts entirely (applyLetterbox owns the DOM write now).
    expect(mainSrc).not.toContain('resizeToDisplay')
  })
})
