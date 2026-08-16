// plugins/missile-command/tests/mc10-5-letterbox-aspect.test.ts
//
// Story mc10-5 — RED phase (Tyr One-Handed / TEA). Preserve the FIELD aspect
// ratio. Today `index.html` sets `canvas { width:100%; height:100% }` and
// `main.ts` (lines 92-93) slams the backing store to `canvas.clientWidth/
// clientHeight` EVERY FRAME, so the logical 256×222 (~1.15:1) field is stretched
// across the whole ~2:1 window: a horizontally smeared field with a huge empty
// middle. The fix pins the canvas to the fixed 256:222 field ratio and
// letterboxes it — the largest 256:222 rectangle that fits, centered, with the
// black page showing through as the bars.
//
// This is the fleet letterbox verb the sibling cabinets already ship: battlezone
// (bz2-1 `shell/viewport.ts` → `plugins/battlezone/tests/shell/viewport.test.ts`)
// delegates to @shared/view's `letterbox` + `resizeToDisplay`, and asteroids (A2-1)
// consumes `letterbox` in `shell/margin.ts` (with `resizeToDisplay` in its `main.ts`).
// mc10-5 ports the SAME mechanism to
// missile-command, keeping MC's OWN number (aspect = 256/222, not 4/3). Epic
// mc10's rule, and SH2's before it: share the mechanism, keep the numbers
// per-cabinet.
//
// CONTRACT — a new thin cabinet-adapter shell module `src/shell/viewport.ts`,
// mirroring battlezone's, over the shared `letterbox`/`resizeToDisplay`:
//
//   TARGET_ASPECT = 256 / 222   — the pinned FIELD ratio, WIDTH / HEIGHT. This is
//     LOGICAL_WIDTH / LOGICAL_HEIGHT (core/cursor.ts:61,63; render.ts:45-46);
//     deriving it from those exported core constants keeps it single-sourced.
//     Pinning the literal is the point: the AC is a fixed field ratio, not "some
//     ratio". This constant is the tripwire if the field dims ever drift.
//   MAX_DPR       = 2           — HiDPI backing-store cap (the shared view's).
//
//   fit(windowW, windowH, rawDpr, aspect = TARGET_ASPECT): Letterbox
//     Pure. { cssWidth, cssHeight, bufferWidth, bufferHeight }:
//       - cssWidth/cssHeight = the largest `aspect`-ratio box that FITS inside the
//         window, touching the constraining edge.
//           * window wider than 256:222  → height-constrained (bars left/right)
//           * window taller than 256:222 → width-constrained  (bars top/bottom)
//       - bufferWidth/bufferHeight = css size × min(MAX_DPR, rawDpr || 1), floored
//         to whole pixels (a canvas backing store must be integral).
//
//   applyLetterbox(canvas, windowW, windowH, rawDpr, aspect?): Letterbox
//     The DOM seam. Writes the integer buffer to canvas.width/height and the
//     `<n>px` CSS box to canvas.style, and returns the fit. Duck-typed on
//     { width, height, style:{width,height} } so it runs under Vitest's `node`.
//
// OUT OF SCOPE for node (deferred to the reviewer screenshot at
// /missile-command/): the index.html CSS that visually CENTERS the smaller canvas
// so the black bars actually show. `node` has no layout engine; here we pin the
// deterministic fit math, the HiDPI backing store, the DOM seam, and the wiring.
//
// WHY THIS IS RED: `src/shell/viewport.ts` does not exist, so both the module
// import and the `main.ts` wiring scan redden until Dev builds the adapter and
// rewires main.ts's resize path onto it.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { applyLetterbox, TARGET_ASPECT, MAX_DPR, type Letterbox } from '../src/shell/viewport.js'
import { placeCursor, HMIN, HMAX, VMIN, VMAX } from '../src/core/cursor.js'

/** The logical field ratio the story pins — LOGICAL_WIDTH / LOGICAL_HEIGHT. */
const FIELD_ASPECT = 256 / 222

/** Structural stand-in for the HTMLCanvasElement surface applyLetterbox mutates. */
interface FakeCanvas {
  width: number
  height: number
  style: { width: string; height: string }
}
function fakeCanvas(): FakeCanvas {
  return { width: 0, height: 0, style: { width: '', height: '' } }
}

// mc11-4 retired `computeLetterbox` — the DOM-free twin of `applyLetterbox`. The
// pure fit these tests assert (the { css*, buffer* } Letterbox) is EXACTLY what
// `applyLetterbox` returns, so drive it through the live seam over a throwaway
// canvas. `applyLetterbox` and the deleted `computeLetterbox` both resolve the box
// via the shared `letterbox()` and the same `min(MAX_DPR, rawDpr || 1)` DPR math,
// so the returned dims are identical.
function fit(windowW: number, windowH: number, rawDpr: number): Letterbox {
  return applyLetterbox(fakeCanvas(), windowW, windowH, rawDpr)
}

// Strip line and block comments so a source-wiring scan asserts on CODE, not on a
// dev's prose (a comment that merely names canvas.clientWidth must not satisfy — or
// defeat — a wiring assertion).
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
}

describe('mc10-5 — the letterbox fit pins the 256:222 field aspect', () => {
  it('TARGET_ASPECT is the 256:222 field ratio (LOGICAL_WIDTH / LOGICAL_HEIGHT)', () => {
    // Story-decision tripwire, decoupled from the fit math below: if the pinned
    // field ratio ever drifts, exactly this assertion moves — the math tests do not.
    expect(TARGET_ASPECT).toBeCloseTo(FIELD_ASPECT, 10)
  })

  it('letterboxes a wide ~2:1 window — bars on the left/right (the story defect)', () => {
    // 2000×1000 (2:1, wider than 256:222) → height is the constraint. The old
    // 100%×100% stretch would smear the field to 2000px wide; the fit is ~1153px.
    const box = fit(2000, 1000, 1)
    expect(box.cssHeight).toBe(1000) // full height used
    expect(box.cssWidth).toBeCloseTo((1000 * 256) / 222, 3) // 1153.15…, NOT 2000
    expect(box.cssWidth).toBeLessThan(2000) // leftover width = the side bars
    expect(box.cssWidth / box.cssHeight).toBeCloseTo(FIELD_ASPECT, 5)
  })

  it('letterboxes a tall window — bars on the top/bottom', () => {
    // 600×1000 (0.6, taller/narrower than 256:222) → width is the constraint.
    const box = fit(600, 1000, 1)
    expect(box.cssWidth).toBe(600) // full width used
    expect(box.cssHeight).toBeCloseTo((600 * 222) / 256, 3) // 520.31…, NOT 1000
    expect(box.cssHeight).toBeLessThan(1000) // leftover height = top/bottom bars
    expect(box.cssWidth / box.cssHeight).toBeCloseTo(FIELD_ASPECT, 5)
  })

  it('fills an exact-256:222 window completely with no bars', () => {
    // Boundary: windowAspect === TARGET_ASPECT (2560×2220 = 256×10 by 222×10).
    const box = fit(2560, 2220, 1)
    expect(box.cssWidth).toBe(2560)
    expect(box.cssHeight).toBe(2220)
  })

  it('the fitted box never exceeds the window and always touches a constraining edge', () => {
    // Letterbox invariant across a sweep: canvas ⊆ window (bars fill the leftover),
    // and it is the MAXIMAL such box (one dimension equals the window exactly).
    const sizes: Array<[number, number]> = [
      [2000, 1000],
      [1920, 1080],
      [1024, 768],
      [500, 1200],
      [1600, 500],
      [333, 777],
    ]
    for (const [w, h] of sizes) {
      const box = fit(w, h, 1)
      expect(box.cssWidth).toBeLessThanOrEqual(w + 1e-9)
      expect(box.cssHeight).toBeLessThanOrEqual(h + 1e-9)
      const touchesWidth = Math.abs(box.cssWidth - w) < 1e-6
      const touchesHeight = Math.abs(box.cssHeight - h) < 1e-6
      expect(touchesWidth || touchesHeight).toBe(true)
    }
  })

  it('holds the 256:222 ratio across a sweep of window sizes (AC: regardless of window size)', () => {
    const sizes: Array<[number, number]> = [
      [2000, 1000],
      [1920, 1080],
      [1024, 768],
      [500, 1200],
      [1600, 500],
      [333, 777],
      [640, 640],
    ]
    for (const [w, h] of sizes) {
      const box = fit(w, h, 1)
      expect(box.cssWidth / box.cssHeight).toBeCloseTo(FIELD_ASPECT, 5)
    }
  })
})

describe('mc10-5 — HiDPI backing store (device pixel ratio)', () => {
  it('scales the backing store by the device pixel ratio', () => {
    // 2560×2220 is already exactly 256:222, so css == window; dpr 2 doubles buffer.
    const box = fit(2560, 2220, 2)
    expect(box.cssWidth).toBe(2560)
    expect(box.cssHeight).toBe(2220)
    expect(box.bufferWidth).toBe(5120)
    expect(box.bufferHeight).toBe(4440)
  })

  it('clamps devicePixelRatio to MAX_DPR (2) to bound the backing store', () => {
    expect(MAX_DPR).toBe(2)
    // A 3× display must NOT produce a 3× buffer — it is capped at 2×.
    const box = fit(2560, 2220, 3)
    expect(box.bufferWidth).toBe(5120)
    expect(box.bufferHeight).toBe(4440)
  })

  it('respects a fractional dpr below the cap', () => {
    const box = fit(2560, 2220, 1.5)
    expect(box.bufferWidth).toBe(3840) // floor(2560 × 1.5)
    expect(box.bufferHeight).toBe(3330) // floor(2220 × 1.5)
  })

  it('falls back to dpr 1 when devicePixelRatio is 0 or falsy (TS lang-review #4)', () => {
    // `rawDpr || 1`: a 0 / undefined devicePixelRatio is invalid, not a real 0× —
    // it must degrade to 1×, not collapse the backing store to nothing.
    const box = fit(2560, 2220, 0)
    expect(box.bufferWidth).toBe(2560)
    expect(box.bufferHeight).toBe(2220)
  })

  it('produces an integer backing store even when the fit is fractional', () => {
    // 600×1000 → width-constrained: cssHeight = 600 × 222/256 = 520.3125, which must
    // floor to a whole-pixel backing store (canvas.width silently truncates else).
    const box = fit(600, 1000, 1)
    expect(box.cssWidth).toBe(600)
    expect(box.cssHeight).toBeCloseTo(520.3125, 5)
    expect(box.bufferWidth).toBe(600)
    expect(box.bufferHeight).toBe(520) // floor(520.3125)
    expect(Number.isInteger(box.bufferWidth)).toBe(true)
    expect(Number.isInteger(box.bufferHeight)).toBe(true)
  })

  it('keeps the backing store at 256:222 too — no stretch in the buffer that the cursor maps against (AC4)', () => {
    // AC4 hinges on this: render reads the BUFFER (canvas.width/height) and input
    // maps against the CSS box; both must carry the field ratio, or a mapped click
    // drifts. project()/placeCursor() are scale-invariant, so equal ASPECT on both
    // surfaces is exactly what keeps the crosshair on the mouse after letterboxing.
    const box = fit(2000, 1000, 2)
    expect(box.bufferWidth / box.bufferHeight).toBeCloseTo(FIELD_ASPECT, 2)
  })
})

describe('mc10-5 — degenerate window dimensions do not produce NaN', () => {
  it('a zero-height window yields a zero-size canvas, not NaN', () => {
    // Collapsed/minimized window: windowW/0 = Infinity must not leak NaN into the
    // canvas size (which would poison every subsequent projection and cursor map).
    const box = fit(1000, 0, 1)
    expect(Number.isNaN(box.cssWidth)).toBe(false)
    expect(Number.isNaN(box.cssHeight)).toBe(false)
    expect(box.cssWidth).toBe(0)
    expect(box.cssHeight).toBe(0)
    expect(box.bufferWidth).toBe(0)
    expect(box.bufferHeight).toBe(0)
  })

  it('a zero-width window yields a zero-size canvas, not NaN', () => {
    const box = fit(0, 1000, 1)
    expect(Number.isNaN(box.cssWidth)).toBe(false)
    expect(Number.isNaN(box.cssHeight)).toBe(false)
    expect(box.cssWidth).toBe(0)
    expect(box.cssHeight).toBe(0)
  })
})

describe('mc10-5 — applyLetterbox writes the fit onto the canvas element', () => {
  it('writes the integer backing store to canvas.width / canvas.height', () => {
    const c = fakeCanvas()
    applyLetterbox(c, 2560, 2220, 2)
    expect(c.width).toBe(5120)
    expect(c.height).toBe(4440)
  })

  it('writes the letterboxed CSS box (in px) to canvas.style', () => {
    // 2560×2220 already exact-ratio → the CSS box is the fitted size, in px.
    const c = fakeCanvas()
    applyLetterbox(c, 2560, 2220, 1)
    expect(c.style.width).toBe('2560px')
    expect(c.style.height).toBe('2220px')
  })

  it('does NOT stretch a wide window to full width — the mc10-5 regression guard', () => {
    // The exact defect the story kills: a 2000×1000 window must render a ~1153px-wide
    // (1000 × 256/222) canvas centered with side bars — NOT a full 2000px smear.
    const c = fakeCanvas()
    applyLetterbox(c, 2000, 1000, 1)
    expect(c.style.width).not.toBe('2000px')
    expect(c.style.height).toBe('1000px')
    expect(parseFloat(c.style.width)).toBeCloseTo((1000 * 256) / 222, 3)
  })

  it('returns the same Letterbox it applied to the canvas', () => {
    const c = fakeCanvas()
    const box = applyLetterbox(c, 2000, 1000, 1)
    expect(box.bufferWidth).toBe(c.width)
    expect(box.bufferHeight).toBe(c.height)
    expect(c.style.width).toBe(`${box.cssWidth}px`)
    expect(c.style.height).toBe(`${box.cssHeight}px`)
  })
})

describe('mc10-5 AC4 — the cursor maps through the LETTERBOX box, not the stretched window', () => {
  // Round 1 review (F2): the buffer-aspect corollary did NOT actually exercise the
  // cursor path. This composes the real seam: main.ts sizes the canvas ELEMENT to the
  // letterbox box (applyLetterbox writes canvas.style — pinned above), so pointermove's
  // `getBoundingClientRect()` returns cssWidth×cssHeight and it feeds
  // `placeCursor(clientX-left, clientY-top, rect.width, rect.height)`. These tests drive
  // that exact composition — the letterbox fit → placeCursor(box dims) — with a wide ~2:1
  // window, and prove the mapping follows the letterboxed field, not the full window.
  // (The DOM step itself — getBoundingClientRect returning the centered rect — is node-
  // unobservable and remains the reviewer's screenshot.)
  const W = 2000
  const H = 1000
  const box = fit(W, H, 1) // cssWidth ≈ 1153.15 (bars L/R), cssHeight = 1000
  // The canvas is centered (index.html flexbox), so its left bar offset is:
  const left = (W - box.cssWidth) / 2 // ≈ 423.42

  it('a click at the center of the letterboxed canvas maps to the field center', () => {
    const c = placeCursor(box.cssWidth / 2, box.cssHeight / 2, box.cssWidth, box.cssHeight)
    expect(c.h).toBeCloseTo(128, 5) // LOGICAL_WIDTH / 2
    expect(c.v).toBeCloseTo(111, 5) // LOGICAL_HEIGHT / 2
  })

  it('an off-center click follows the letterbox box, NOT the full-window stretch', () => {
    // A click ¾ across the FIELD. Through the letterbox box it is h = 0.75×256 = 192.
    // If the code wrongly fed the full WINDOW width (the pre-letterbox smear), the same
    // canvas-space x would read h ≈ 110.7 — a different, wrong cabinet column.
    const canvasX = 0.75 * box.cssWidth
    const correct = placeCursor(canvasX, box.cssHeight / 2, box.cssWidth, box.cssHeight)
    const stretchBug = placeCursor(canvasX, box.cssHeight / 2, W, H)
    expect(correct.h).toBeCloseTo(192, 5)
    expect(stretchBug.h).toBeCloseTo((canvasX / W) * 256, 5) // ≈ 110.7
    expect(correct.h).not.toBeCloseTo(stretchBug.h, 1) // the two interpretations DIFFER
  })

  it('the field edges map to the clamped cabinet bounds through the box', () => {
    // Right/bottom corner of the canvas → field right/bottom, clamped to HMAX/VMIN.
    const br = placeCursor(box.cssWidth, box.cssHeight, box.cssWidth, box.cssHeight)
    expect(br.h).toBe(HMAX) // 247 — right edge (256 clamps to HMAX)
    expect(br.v).toBe(VMIN) // 45  — bottom edge (V-flip: y=height → v=0 clamps to VMIN)
    // Top-left corner → field left/top, clamped to HMIN/VMAX.
    const tl = placeCursor(0, 0, box.cssWidth, box.cssHeight)
    expect(tl.h).toBe(HMIN) // 8
    expect(tl.v).toBe(VMAX) // 206 — top (V-flip: y=0 → v=222 clamps to VMAX)
  })

  it('a click in the LEFT/RIGHT bar of a wide window clamps to the field H-edge (does not wrap)', () => {
    // A window click at x=100 is LEFT of the centered canvas (left ≈ 423), so its
    // canvas-relative x is negative → the crosshair parks at the field's left edge,
    // never leaking to a mid-field column. This is why the bars are dead zones.
    const canvasRelX = 100 - left // negative
    const c = placeCursor(canvasRelX, H / 2, box.cssWidth, box.cssHeight)
    expect(canvasRelX).toBeLessThan(0)
    expect(c.h).toBe(HMIN) // clamped to the left edge, not wrapped
  })

  it('a click in the TOP/BOTTOM bar of a tall window clamps to the field V-edge (does not wrap)', () => {
    // The mirror case on the other axis: a PORTRAIT window (600×1000) is width-
    // constrained, so the bars are top/bottom and the vertical centering offset is
    // real (top ≈ 239.8, not 0). A window click at y=50 sits ABOVE the canvas, so its
    // canvas-relative y is negative → with the V-flip that maps to the field's TOP,
    // clamped to VMAX. Proves the vertical bar is a dead zone too.
    const tallBox = fit(600, 1000, 1) // cssWidth 600, cssHeight ≈ 520.31
    const topOffset = (1000 - tallBox.cssHeight) / 2 // ≈ 239.84 (> 0 — the top bar)
    expect(topOffset).toBeGreaterThan(0)
    const canvasRelY = 50 - topOffset // negative — above the canvas
    const c = placeCursor(tallBox.cssWidth / 2, canvasRelY, tallBox.cssWidth, tallBox.cssHeight)
    expect(canvasRelY).toBeLessThan(0)
    expect(c.v).toBe(VMAX) // clamped to the top edge (V-flip), not wrapped
  })
})

describe('mc10-5 — main.ts is actually wired to the letterbox fit (not orphaned)', () => {
  // main.ts is a DOM bootstrap that runs `document.querySelector('#game')` at module
  // top level, so it cannot be imported under Vitest's `node` environment to drive
  // resize() directly. These source-level tripwires keep the fix from shipping a
  // well-tested-but-unused module while the paint path still full-window stretches —
  // the precise way this bug could survive a green suite. Comments are stripped so a
  // wiring claim in prose can neither satisfy nor defeat the scan.
  const mainSrc = stripComments(
    readFileSync(fileURLToPath(new URL('../src/main.ts', import.meta.url)), 'utf8'),
  )

  it('imports the letterbox seam from the viewport module', () => {
    expect(mainSrc).toContain('./shell/viewport')
    expect(mainSrc).toContain('applyLetterbox')
  })

  it('no longer resets the backing store to the full client size every frame', () => {
    // main.ts:92-93 does `canvas.width = canvas.clientWidth` / `= canvas.clientHeight`
    // once PER FRAME. Left in place it would clobber the letterboxed backing store
    // back to the full-window stretch on the very next frame — so the fix must remove
    // this per-frame full-size reset from the paint loop, not just add a resize().
    expect(mainSrc).not.toContain('canvas.clientWidth')
    expect(mainSrc).not.toContain('canvas.clientHeight')
  })
})
