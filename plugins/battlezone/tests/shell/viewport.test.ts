// tests/shell/viewport.test.ts
//
// Story bz2-1 — RED phase (Han Solo / TEA). The first live bz1 playtest flagged
// that the canvas stretches to fill the FULL browser width — main.ts `resize()`
// (lines 58-64) slams both the backing store (`canvas.width/height`) and the CSS
// box (`canvas.style.width/height`) to the whole window, so a wide monitor
// smears the 4:3 cabinet view into a distorted panorama and the camera's
// `aspect = w/h` (main.ts:114) wanders with the window. The fix pins the canvas
// to a fixed cabinet aspect ratio and letterboxes it — the largest 4:3 rectangle
// that fits, centered, with the black page showing through as bars.
//
// CONTRACT — a new pure-logic shell module `src/shell/viewport.ts`, mirroring
// this repo's split (core/shell math is pure; only the seam touches the DOM):
//
//   TARGET_ASPECT = 4 / 3   — the pinned cabinet ratio, WIDTH / HEIGHT (landscape).
//                             Pinning the literal is the point: the story's AC is a
//                             fixed cabinet ratio, not "some ratio". This constant
//                             is the tripwire if a later change drifts it.
//   MAX_DPR       = 2        — HiDPI backing-store cap (matches the old resize()).
//
//   computeLetterbox(windowW, windowH, rawDpr, aspect = TARGET_ASPECT): Letterbox
//     Pure. Returns { cssWidth, cssHeight, bufferWidth, bufferHeight }:
//       - cssWidth/cssHeight = the largest `aspect`-ratio box that FITS inside the
//         window (letterbox invariant), touching the constraining edge.
//           * window wider than aspect  → height-constrained (bars left/right)
//           * window taller than aspect → width-constrained  (bars top/bottom)
//       - bufferWidth/bufferHeight = css size × min(MAX_DPR, rawDpr || 1), floored
//         to integers (a canvas backing store must be whole pixels).
//
//   applyLetterbox(canvas, windowW, windowH, rawDpr, aspect?): Letterbox
//     The DOM seam. Computes the fit, writes the integer buffer size to
//     canvas.width/height and the `<n>px` CSS box to canvas.style, and returns the
//     Letterbox it applied. Duck-typed on { width, height, style:{width,height} }
//     so it is testable with a plain object under Vitest's `node` environment.
//
// WHY split compute/apply: the projection reads the buffer aspect every frame, so
// the fit math must be pure + exhaustively testable; the DOM write is a thin seam.
//
// OUT OF SCOPE for these unit tests (deferred to the bz2-6 live playtest + a TEA
// delivery finding): the index.html CSS that visually CENTERS the canvas so the
// black bars actually show, and the subjective "feels right" 4:3 confirmation.
// Those are layout/visual concerns that `node` cannot observe; here we pin the
// deterministic math, the HiDPI backing store, the DOM seam, and the wiring.
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

describe('bz2-1 — computeLetterbox pins the cabinet aspect ratio', () => {
  it('TARGET_ASPECT is the 4:3 cabinet ratio (width / height)', () => {
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

  it('letterboxes a tall (portrait) window — bars on the top/bottom', () => {
    // 600×1000 (taller than 4:3) → width is the constraint.
    const box = computeLetterbox(600, 1000, 1)
    expect(box.cssWidth).toBe(600) // full width used
    expect(box.cssHeight).toBe(450) // 600 ÷ 4/3, NOT the full 1000
    expect(box.cssHeight).toBeLessThan(1000) // leftover height = the top/bottom bars
    expect(box.cssWidth / box.cssHeight).toBeCloseTo(4 / 3, 5)
  })

  it('letterboxes a square window (width-constrained, bars top/bottom)', () => {
    const box = computeLetterbox(800, 800, 1)
    expect(box.cssWidth).toBe(800)
    expect(box.cssHeight).toBe(600)
    expect(box.cssHeight).toBeLessThan(800)
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

describe('bz2-1 — HiDPI backing store (device pixel ratio)', () => {
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

describe('bz2-1 — degenerate window dimensions do not produce NaN', () => {
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

describe('bz2-1 — applyLetterbox writes the fit onto the canvas element', () => {
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

  it('does NOT stretch a wide window to full width — the bz2-1 regression guard', () => {
    // The exact defect the story kills: a 2000×750 window must render a 1000px-wide
    // (750 × 4/3) canvas centered with side bars — NOT a full 2000px smear.
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

describe('bz2-1 — main.ts is actually wired to the letterbox fit (not orphaned)', () => {
  // main.ts is a DOM bootstrap that runs `document.getElementById('game')` at
  // module top level, so it cannot be imported under Vitest's `node` environment
  // to drive resize() directly. This source-level tripwire keeps the fix from
  // shipping a well-tested-but-unused module while resize() still full-width
  // stretches — the precise way this bug could survive a green suite.
  const mainSrc = readFileSync(fileURLToPath(new URL('../../src/main.ts', import.meta.url)), 'utf8')

  it('imports the letterbox seam from the viewport module', () => {
    expect(mainSrc).toContain('./shell/viewport')
    expect(mainSrc).toContain('applyLetterbox')
  })

  it('no longer hard-stretches the canvas CSS box to the full window width', () => {
    // The old resize() set `canvas.style.width = `${window.innerWidth}px``. After
    // the fix the CSS box comes from the fit, so that full-window px template is
    // gone from the source.
    expect(mainSrc).not.toContain('window.innerWidth}px')
  })
})
