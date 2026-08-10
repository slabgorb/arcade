// src/shell/viewport.ts
//
// mc10-5: pin the canvas to the fixed FIELD aspect ratio and letterbox it, instead
// of stretching the logical 256×222 field across the whole ~2:1 window (the old
// index.html `width:100%;height:100%` + main.ts per-frame `canvas.clientWidth`
// smear). The aspect-fit math + the DPR/backing-store DOM seam live in @shared/view
// (pure `letterbox` + `resizeToDisplay`), the same verbs battlezone (bz2-1) and
// asteroids (A2-1) already consume. This module is missile-command's thin cabinet
// adapter over them: it keeps the game's OWN number (TARGET_ASPECT = 256/222, the
// logical field ratio) and its Letterbox vocabulary so main.ts stays trivial, while
// the shared module does the arithmetic. Epic mc10's rule (SH2's before it): share
// the mechanism, keep the numbers per-cabinet.
import {
  letterbox,
  resizeToDisplay,
  MAX_DPR as SHARED_MAX_DPR,
  type CanvasLike as SharedCanvasLike,
} from '@shared/view'
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from '../core/cursor.js'

/** The pinned cabinet field ratio, WIDTH / HEIGHT. Single-sourced from the core's
 *  logical field dims (LOGICAL_WIDTH = 256, LOGICAL_HEIGHT = 222; TOPSCR=222.,
 *  W3COMN.MAC:107) so the framing can never drift from what project()/placeCursor()
 *  map against. ~1.153:1 — deliberately NOT the ~2:1 the browser window tends to be. */
export const TARGET_ASPECT = LOGICAL_WIDTH / LOGICAL_HEIGHT

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
