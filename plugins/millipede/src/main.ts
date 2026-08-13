// src/main.ts
//
// Story ml7-3 — the page becomes the cabinet's ATTRACT SCREEN: the core demo
// (src/core/attract.ts) self-plays a marching train over a seeded mushroom
// field with the ROM's attract DDT bombs, and the ROM HUD (src/core/hud.ts)
// sits on the reserved top row — score, lives, high score. Core computes every
// placement; this file only steps the demo and routes placements through the
// shell blitter (routing != geometry — tests/hud-render.test.ts pins the
// wiring floor on comment-stripped source). The ml2-4 stamp-census page this
// replaces lives on in tests/playfield.test.ts's drawStampPlayfield.
//
// This page IS the visual playtest surface (playbook §4): a human looks at
// /millipede/ and confirms the HUD reads left-to-right score/lives/high-score
// on the TOP line, digits upright, mushrooms mushroom-shaped, DDTs on the
// field, and the train marching. SHELL only beyond the demo step: the one
// clock is requestAnimationFrame.

import { mountCanvas } from '@shared/host-helpers'
import { PLYFLD_STRIDE } from './core/conway'
import { createAttractDemo, stepAttractDemo } from './core/attract'
import { hudPlacements, ddtPlacements, type HudPlacement } from './core/hud'
import { DEFAULT_HIGH_SCORES } from './core/highscore'
import { BACKGROUND_BIT } from './core/mushroom'
import { drawGridStamps, drawStampAtPx } from './shell/render'

/** 30 cols x 32 rows of 8x8 stamps — the portrait logical resolution. */
const LOGICAL_W = 240
const LOGICAL_H = 256

/** Demo dressing: the ROM's attract cabinet holds LIVES=0 (six blanks), but a
 *  playtest that cannot SEE the ship icon cannot judge it — three ships shown
 *  deliberately (TEA flagged the choice; logged as a Dev deviation). */
const DEMO_LIVES = 3

const { canvas, ctx } = mountCanvas(document)

const logical = document.createElement('canvas')
logical.width = LOGICAL_W
logical.height = LOGICAL_H
const lctx = logical.getContext('2d')
if (!lctx) throw new Error('millipede: 2d context unavailable for the logical screen')

const demo = createAttractDemo(0x1982)

/** Every occupied field cell as a grid placement — the char stamp is the low
 *  7 bits; bit 7 is the grey-background colour bit, not a stamp index. */
function fieldPlacements(field: Uint8Array): HudPlacement[] {
  const placements: HudPlacement[] = []
  for (let off = 0; off < field.length; off++) {
    const byte = field[off]
    if (byte === 0) continue
    placements.push({
      col: Math.floor(off / PLYFLD_STRIDE),
      row: off % PLYFLD_STRIDE,
      stamp: byte & ~BACKGROUND_BIT,
    })
  }
  return placements
}

const frame = (): void => {
  stepAttractDemo(demo)

  lctx.fillStyle = '#000'
  lctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H)
  drawGridStamps(lctx, fieldPlacements(demo.field))
  drawGridStamps(lctx, ddtPlacements(demo.ddt))
  drawGridStamps(
    lctx,
    hudPlacements({ score: 0, lives: DEMO_LIVES, highScore: DEFAULT_HIGH_SCORES[0].score }),
  )
  // Motion objects draw at pixel precision, not grid cells. The screen map is
  // the family's (cp2-14): higher MOBJH is further LEFT (the OBSTAC 0xF7 fold,
  // mushroom.ts), higher MOBJV is further UP (ENTER_V 0xF8 = the top line).
  // A sprite picture p is the 8x16 tile pair 2p / 2p+1 at the base of the
  // sheet — chosen by eye at the playtest (renders as the legged train), NOT
  // cited to the ROM; what the $80+ half of the sheet holds is likewise
  // UNMEASURED (plausibly an alternate graphics bank — an inference, nothing
  // more; see the Reviewer's sprite-decode Delivery Finding). The whole-frame
  // rotation turns the vertical pair into a horizontal one, stored-top tile
  // on the LEFT (the CCW turn — see render.ts).
  for (const s of demo.segments) {
    const x = (0xf7 - s.h) & 0xff
    const y = (0xf8 - s.v) & 0xff
    drawStampAtPx(lctx, 2 * s.pic, x, y)
    drawStampAtPx(lctx, 2 * s.pic + 1, x + 8, y)
  }

  canvas.width = canvas.clientWidth
  canvas.height = canvas.clientHeight
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.imageSmoothingEnabled = false
  const scale = Math.max(1, Math.floor(Math.min(canvas.width / LOGICAL_W, canvas.height / LOGICAL_H)))
  const dx = Math.floor((canvas.width - LOGICAL_W * scale) / 2)
  const dy = Math.floor((canvas.height - LOGICAL_H * scale) / 2)
  ctx.drawImage(logical, dx, dy, LOGICAL_W * scale, LOGICAL_H * scale)
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
