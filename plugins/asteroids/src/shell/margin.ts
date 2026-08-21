// src/shell/margin.ts
//
// A2-1: the playfield fit scale. The core world is a fixed 4:3 rectangle
// (WORLD_W x WORLD_H); render() projects it at a uniform *fit* scale and centres
// it on the canvas. When the canvas aspect ratio is not 4:3 that fit leaves
// letterbox/pillarbox bars — the "non-playable margin".
//
// Those margin BARS are no longer computed or painted here: sa1-1 folded the
// non-game surround into the shared @shared/cabinet module (`chromeRegions` +
// `drawCabinetChrome`), which every game now frames identically. render() derives
// the fitted game rect from `fitScale` below and hands it to drawCabinetChrome, so
// the mask and the drawn world still come from ONE scale and can never drift.
// This module keeps only that one scale — a PURE function of the canvas size: no
// canvas, no state, no time.

import { letterbox } from '@shared/view'
import { WORLD_W, WORLD_H } from '../core/state'

// SH2-10: the centred aspect-fit is @shared/view's pure `letterbox` (folded from
// this module's old inline `Math.min(w/WORLD_W, h/WORLD_H)`). The 4:3 world aspect
// drives it; `fitScale` is asteroids' cabinet presentation of that shared fit.
const WORLD_ASPECT = WORLD_W / WORLD_H

/** The uniform fit scale mapping the 4:3 world into a w x h canvas: the largest
 *  scale at which the whole WORLD_W x WORLD_H world fits. Derived from the shared
 *  letterbox (box.width === WORLD_W × scale), so the mask and the drawn world use
 *  one scale. */
export function fitScale(w: number, h: number): number {
  return letterbox(w, h, WORLD_ASPECT).width / WORLD_W
}
