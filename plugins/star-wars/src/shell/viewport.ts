// src/shell/viewport.ts
//
// pt1-4: pin the canvas to a fixed 4:3 cabinet aspect and letterbox it, instead of
// filling the whole browser window. star-wars was the fleet outlier — main.ts sized
// the canvas with @shared/view's window-filling resizeToDisplay, so the HUD (drawn
// at the full-window edges) spread away from the scene (drawn in sw10-1's centered
// min(w,h) square) and flung out on ultrawide monitors. Mirroring battlezone's bz2-1
// split (the sibling 3D cockpit game already solved exactly this), the fit math + the
// HiDPI cap live in @shared/view; this module is star-wars' thin cabinet adapter that
// keeps the game's own NUMBERS (TARGET_ASPECT = 4/3) and Letterbox vocabulary
// (cssWidth/cssHeight + bufferWidth/bufferHeight). Share the mechanism, keep the
// numbers per-cabinet.
//
// Handing render() the letterboxed box (not the whole window) is what reunites the
// HUD and the scene into ONE frame: the central square lens is the view "window" and
// the HUD flanks it, with the black page showing through as the side overlay — the
// consistent look battlezone and asteroids already wear.
import {
  letterbox,
  resizeToDisplay,
  MAX_DPR as SHARED_MAX_DPR,
  type CanvasLike as SharedCanvasLike,
} from '@shared/view'

/** The pinned cabinet ratio, WIDTH / HEIGHT (landscape). The authentic Star Wars
 *  cabinet is a 4:3 colour vector monitor — the same ratio battlezone pins — so
 *  star-wars joins the fleet framing. Pinning the literal is the point: the AC is a
 *  FIXED cabinet ratio, not "some ratio". */
export const TARGET_ASPECT = 4 / 3

/** HiDPI backing-store cap. The shared view's MAX_DPR (2) — a 3×/4× display would
 *  otherwise blow the backing store up 9×/16×; 2× is the crispness/cost sweet spot. */
export const MAX_DPR = SHARED_MAX_DPR

/** A computed fit: the letterboxed CSS box plus its device-pixel backing store. */
export interface Letterbox {
  /** CSS-pixel width of the visible canvas (≤ window; the leftover is the bars). */
  cssWidth: number
  /** CSS-pixel height of the visible canvas. */
  cssHeight: number
  /** Backing-store width in device pixels (whole pixels). */
  bufferWidth: number
  /** Backing-store height in device pixels (whole pixels). */
  bufferHeight: number
  /** The resolved (capped + guarded) device pixel ratio actually applied,
   *  `Math.min(MAX_DPR, rawDpr || 1)`. Exposed directly so a caller that scales its
   *  context by the DPR (star-wars' `ctx.scale(dpr, dpr)`) reads the exact value the
   *  fit used, rather than reconstructing it by dividing the floor-rounded buffer by
   *  the css size. Always ≥ 1 — a real ratio, so no divide-by-zero guard is needed. */
  dpr: number
}

/** The minimal HTMLCanvasElement surface `applyLetterbox` mutates — duck-typed so
 *  the seam is testable with a plain object outside a DOM. (Re-exported from the
 *  shared view's CanvasLike so the contract stays single-sourced.) */
export type CanvasLike = SharedCanvasLike

/**
 * Compute the largest `aspect`-ratio box that fits inside the window, plus its
 * HiDPI backing store. Delegates the fit to the shared `letterbox` and resolves the
 * DPR the same way `resizeToDisplay` does (`Math.min(MAX_DPR, rawDpr || 1)`).
 */
export function computeLetterbox(
  windowW: number,
  windowH: number,
  rawDpr: number,
  aspect: number = TARGET_ASPECT,
): Letterbox {
  const box = letterbox(windowW, windowH, aspect)
  // A 0 / NaN / undefined devicePixelRatio is invalid, not a real "0× display" —
  // `|| 1` degrades it to 1× rather than collapsing the backing store.
  const dpr = Math.min(MAX_DPR, rawDpr || 1)
  return {
    cssWidth: box.width,
    cssHeight: box.height,
    bufferWidth: Math.floor(box.width * dpr),
    bufferHeight: Math.floor(box.height * dpr),
    dpr,
  }
}

/**
 * Apply the letterbox fit to a canvas via the shared DOM seam: size the CSS box to
 * the fitted rect and the backing store to its HiDPI buffer, returning the fit.
 */
export function applyLetterbox(
  canvas: CanvasLike,
  windowW: number,
  windowH: number,
  rawDpr: number,
  aspect: number = TARGET_ASPECT,
): Letterbox {
  const box = letterbox(windowW, windowH, aspect)
  const vp = resizeToDisplay(canvas, box.width, box.height, rawDpr)
  return {
    cssWidth: box.width,
    cssHeight: box.height,
    bufferWidth: vp.deviceWidth,
    bufferHeight: vp.deviceHeight,
    dpr: vp.dpr,
  }
}
