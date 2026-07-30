// src/shell/viewport.ts
//
// SH2-10: the aspect-fit math + the DPR/backing-store DOM seam now live in
// @shared/view (pure `letterbox` + `resizeToDisplay`), which owns the fit
// and the `Math.min(2, devicePixelRatio||1)` cap+guard every cabinet hand-rolled.
// This module is battlezone's thin cabinet adapter over that shared verb: it keeps
// the game's own NUMBERS (TARGET_ASPECT = 4/3) and its Letterbox vocabulary
// (cssWidth/cssHeight + bufferWidth/bufferHeight) so main.ts and the per-frame
// projection are unchanged, while the shared module does the arithmetic. This is
// epic SH2's rule: share the mechanism, keep the numbers per-cabinet.
//
// (Story bz2-1 originally introduced this as a local pure module; SH2-10 folds its
// math into the cabinet-shared library without changing a single number — the
// bz2-1 unit suite still pins the exact behaviour.)
import {
  letterbox,
  resizeToDisplay,
  MAX_DPR as SHARED_MAX_DPR,
  type CanvasLike as SharedCanvasLike,
} from '@shared/view'

/** The pinned cabinet ratio, WIDTH / HEIGHT (landscape). Battlezone's cabinet is
 *  the standard Atari ~4:3 CRT; pinning it stabilises both the framing and the
 *  camera's per-frame aspect. */
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
  }
}
