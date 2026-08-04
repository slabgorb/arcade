// src/shell/render.ts
//
// Story cp1-6 (GREEN, Julia) — AC-1/2/3: the Canvas 2D renderer. Draws the
// seeded playfield's mushrooms, the gun, the live shot, and a ROM-tile
// score HUD from an INJECTED atlas (the canvas that BUILDS the atlas
// lives in ./atlas, source-read there — this module stays testable in node
// with a recording ctx + a fake atlas). Every colour comes from ./palette —
// no invented colours (AC-3) — and every glyph comes from ./layout's ROM-tile
// layoutText, never the shared-library font module (epic ruling).
//
// cp2-12 (GREEN, Julia) — the HUD moved onto the ROM's single reserved top
// row v=0x1F (screen row cellScreenY(PLYFLD_HEIGHT-1)), above the playable
// field: P1 score as six raw digits, no text label (UPSCRE, CL-13); P1 lives
// as GUN icons, never digits (DLIVES, CL-15); the high score as six raw
// digits (CL-14) — sourced from @shared/highscore by the shell entry
// and passed in as render()'s optional 4th parameter (persistence is a shell
// concern; the pure SimState is not widened). Every field is placed via
// cellScreenX(h) for its ROM h-range so it lands on the reserved row and
// stays consistent with the field's own reversed column orientation
// (CENTI4.MAC:742-751, upright); CHAR advances +0x20/glyph so each field is
// six consecutive columns (CL-16).

import { MAX_INITIALS, type SimState } from '../core/sim'
import { BONUS_INCREMENT } from '../core/bonus'
import type { Atlas } from './atlas'
import { PLAYFIELD_PENS, rgbCss } from './palette'
import { LOGICAL_W, LOGICAL_H, cellScreenX, cellScreenY, gunScreenX, gunScreenY, layoutText } from './layout'
import { isMushroom, PLYFLD_STRIDE, PLYFLD_WIDTH, PLYFLD_HEIGHT } from '../core/playfield'
import { SPRITE_W, SPRITE_H, TILE_W, TILE_H } from '../core/pictures'
import { DEAD_BIT, EXPLOSION_DONE } from '../core/centipede'
import {
  SPIDER_PIC_MIN,
  isSpiderWalking,
  SPIDER_PTS_300,
  SPIDER_PTS_600,
  SPIDER_PTS_900,
  SPIDER_OFF_PIC,
} from '../core/spider'
import { isFleaAlive, FLEA_PARK_PIC, FLEA_PARK_V } from '../core/flea'
import { isScorpion, SCORP_PIC_LOW } from '../core/scorpion'

/** SP-19/22: the PTS picture code -> the CENPIC points sprite it draws. */
const SPIDER_PTS_STAMPS: Readonly<Record<number, string>> = {
  [SPIDER_PTS_300]: 'THREE',
  [SPIDER_PTS_900]: 'NINE',
  [SPIDER_PTS_600]: 'SIX',
}

const MUSHROOM_STAMPS: Readonly<Record<number, string>> = {
  0x3f: 'MUSHROOM_FULL',
  0x3e: 'MUSHROOM_3_4',
  0x3d: 'MUSHROOM_1_2',
  0x3c: 'MUSHROOM_1_4',
  0x3b: 'POISON_MUSHROOM_FULL',
  0x3a: 'POISON_MUSHROOM_3_4',
  0x39: 'POISON_MUSHROOM_1_2',
  0x38: 'POISON_MUSHROOM_1_4',
}

/** cp1-3 STAMP name for a mushroom's current damage code (PM-15..19). Pure. */
export function mushroomStamp(cell: number): string {
  const stamp = MUSHROOM_STAMPS[cell]
  if (!stamp) throw new Error(`mushroomStamp: 0x${cell.toString(16)} is not a mushroom damage code`)
  return stamp
}

/** cp2-5: the HEAD0-F sprite pool is the ONE shared motion-object stamp set
 *  (pictures.ts header — head/body/explosion all draw from it, CT-44 "no new
 *  pixels"). A segment's stamp is its picture's low nibble. */
export function segmentStamp(pic: number): string {
  return `HEAD${(pic & 0x0f).toString(16).toUpperCase()}`
}

/** cp7-1 AC-6: the stamp for an EXPLODING motion object — the dedicated
 *  EXPLD0-5 sprites, not the HEAD0-F pool this used to borrow from.
 *
 *  CENIR4.MAC:349-353 is where the two part company. For a centipede slot the
 *  picture is masked `AND I,3F`, and then `CMP I,30 / BCS 33$` branches AWAY on
 *  >= 0x30 — so an explosion SKIPS the `AND I,0F` that folds live pictures into
 *  HEAD0-F and keeps 0x3A-0x3F, which address EXPLD0-5. Slots 12-15 skip the
 *  masking entirely (`CPX I,NCENT / BCS 33$` at :349-350) and hand over the raw
 *  0xFA-0xFF — the same six stamps, because bits 6-7 are flips rather than
 *  address, plus a 180-degree turn. Both routes land here.
 *  (The 180-degree turn the unmasked route also carries is NOT implemented — see
 *  the note below.) */
export function explosionStamp(pic: number): string {
  const index = (pic & 0x3f) - (EXPLOSION_DONE & 0x3f) - 1
  if (index < 0 || index > 5) throw new Error(`explosionStamp: 0x${pic.toString(16)} is not an explosion picture`)
  return `EXPLD${index}`
}

// NOT IMPLEMENTED, deliberately: slots 12/13 hand MOBJP to the hardware
// unmasked (CENIR4.MAC:349-350), so an explosion there reaches PICT with both
// flip bits still set and the cabinet draws it 180 degrees turned, where a
// centipede slot's `AND I,3F` strips them. That is a real divergence and it is
// recorded here rather than built: it is a refinement on top of the actual bug
// (the wrong SPRITES), it doubles the blit's flip surface to express, and no
// story asked for it. Fix it when something makes it matter.

/** cp3-1: the stamp for a spider's current picture. The eight walking faces
 *  0x14-0x1B are BUG0..BUG7 (CENPIC BUG0 sits at picture 0x14); the three PTS
 *  codes draw the points sprite the kill awarded, in the ROM's own sprite order
 *  THREE(0xB6)/NINE(0xB7)/SIX(0xB8) — 300/900/600, not ascending. */
export function spiderStamp(pic: number): string {
  if (isSpiderWalking(pic)) return `BUG${pic - SPIDER_PIC_MIN}`
  const points = SPIDER_PTS_STAMPS[pic]
  if (!points) throw new Error(`spiderStamp: 0x${pic.toString(16)} is not a drawable spider picture`)
  return points
}

/** cp3-4: the stamp for a flea's current picture. The live band is 0x1C-0x1F,
 *  and ANT0 sits at picture 0x1C exactly as BUG0 sits at 0x14 — the same
 *  offset-from-band-base relation spiderStamp uses.
 *
 *  Only ANT0 and ANT2 are ever reachable, and that is FAITHFUL, not a bug:
 *  ANTMV advances the picture by TWO (":84 INC ANTP" bumps the byte and
 *  ":85-87 LDA ANTP / CLC / ADC I,01" adds one again to the value read back),
 *  so from ANTPC's 0x1C the cycle is 0x1C -> 0x1E -> 0x1C. ANT1/ANT3 are dead
 *  art in the picture ROM. Recorded in docs/rom-study/open-questions.md item 9,
 *  and tests/flea-live.test.ts goes red if anyone "repairs" the cycle. The
 *  mapping still covers all four so the function is total over the band it
 *  documents rather than lying about its own domain. */
export function fleaStamp(pic: number): string {
  if (!isFleaAlive(pic)) throw new Error(`fleaStamp: 0x${pic.toString(16)} is not a flea picture`)
  return `ANT${pic - FLEA_PARK_PIC}`
}

/** cp3-3: the stamp for a scorpion's current picture. The live band is
 *  0x30-0x33, and SCORP0 sits at picture 0x30 exactly as ANT0 sits at 0x1C and
 *  BUG0 at 0x14 — the same offset-from-band-base relation. Unlike the flea, the
 *  scorpion's cycle is a genuine +1 (:2082), so all four SCORP0-3 are reachable.
 *  The sprites are baked from cp1-3's picture ROM (pictures.ts SCORP0-3). */
export function scorpionStamp(pic: number): string {
  if (!isScorpion(pic)) throw new Error(`scorpionStamp: 0x${pic.toString(16)} is not a scorpion picture`)
  return `SCORP${pic - SCORP_PIC_LOW}`
}

/** cp7-1 AC-8: does a motion object with this horizontal direction face the
 *  mirrored way? CENIR4.MAC:333-334 `LDY X,MOBJDH / BPL 35$ ;IF FACING LEFT` —
 *  the display routine tests the SIGN BIT of MOBJDH and mirrors only when it is
 *  set, so dh = 0 does NOT mirror (BPL is "branch if plus", and 0 is plus). The
 *  flip is then EOR'd into bit 7 of the picture at :368, the same hardware bit
 *  the PTS picture constants carry (flipsForPicture, src/core/pictures.ts).
 *
 *  This is ONE predicate over dh applied to every slot but the spider, exactly
 *  as the ROM states it — never a list of entity types. The flea and the shot
 *  decline to mirror on their own data (ANTDH is a hard 0, CENTI4.MAC:153-154;
 *  SHOTDH is written nowhere in the revision), which is the mechanism doing the
 *  work rather than a special case. */
export function mirroredForDh(dh: number): boolean {
  return dh < 0
}

/** cp7-1 AC-8: the screen-x a motion object blits at, carrying the ROM's
 *  one-pixel correction for a mirrored sprite — CENIR4.MAC:337-338
 *  `CLC / ADC I,01 ;FACE PICTURE BY CORRECTING HORIZONTAL`, applied to MOBJH
 *  before it reaches HPOS. The increment happens in the ROM's OWN horizontal
 *  space, so it must go through gunScreenX like every other position rather
 *  than being added to the screen coordinate. That distinction is visible:
 *  gunScreenX is mirrored (screen x FALLS as h rises, layout.ts:92-97), so the
 *  ROM's +1 lands one pixel LEFT on our screen, not right.
 *
 *  The `& 0xff` is load-bearing, not defensive. `CLC / ADC I,01` is an EIGHT-BIT
 *  add and WRAPS: at MOBJH = 0xFF the ROM stores HPOS = 0x00. A plain `h + 1`
 *  gives 0x100, which gunScreenX maps to x = -17 where the ROM lands on x = 239
 *  — a full screen width out. That state is REACHABLE, not theoretical: a
 *  scorpion enters at ANTH = 0x00 (SC-7, CENTI4.MAC:2046-2047 "LDA I,0 / STA
 *  ANTH ;START AT EDGE") and steps by dh of -1 or -2 through
 *  `(slot.h + slot.dh) & 0xff` (scorpion.ts:177), so one step off the edge going
 *  left puts it on exactly 0xFF while `mirrored` is true. Pinned below. */
function mobjScreenX(h: number, mirrored: boolean): number {
  return gunScreenX(mirrored ? (h + 1) & 0xff : h)
}

function blit(
  ctx: CanvasRenderingContext2D,
  atlas: Atlas,
  name: string,
  x: number,
  y: number,
  w: number,
  h: number,
  mirrored = false,
): void {
  const rect = atlas.rect(name)
  if (!mirrored) {
    ctx.drawImage(atlas.image, rect.sx, rect.sy, rect.sw, rect.sh, x, y, w, h)
    return
  }
  // cp7-1 AC-5: a HORIZONTAL mirror about the sprite's own box, and nothing
  // else. cp2-1's ban on canvas transforms in render.ts guarded against the
  // ROT270 being applied twice (bake AND render); a left-right mirror is not a
  // rotation and cannot double it, so the ban is kept for rotate/setTransform/
  // transform and narrowed to permit scale(-1, 1) alone — pinned in
  // tests/facing-flip.test.ts. save/restore keeps it off the following draws.
  ctx.save()
  ctx.translate(x + w, y)
  ctx.scale(-1, 1)
  ctx.drawImage(atlas.image, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, w, h)
  ctx.restore()
}

function drawText(ctx: CanvasRenderingContext2D, atlas: Atlas, text: string, x: number, y: number): void {
  for (const glyph of layoutText(text, x, y)) blit(ctx, atlas, glyph.stamp, glyph.x, glyph.y, TILE_W, TILE_H)
}

/** cp2-12: UPSCRE/the high-score routine each draw exactly six raw BCD
 *  digits (CL-13/CL-14) — zero-padded, never truncated to fewer glyphs. */
function sixDigits(value: number): string {
  return String(Math.max(0, Math.trunc(value))).padStart(6, '0').slice(-6)
}

// cp4-6: GETINT's own screen text (:1036, :1038), transcribed verbatim rather
// than invented. The three entry rows sit in mid-field, clear of the reserved
// v=0x1F HUD row at the top and of the gun's home row at the bottom.
const GREAT_SCORE = 'GREAT SCORE'
const ENTER_INITIALS = 'ENTER YOUR INITIALS'
const ENTRY_TITLE_V = 20
const ENTRY_PROMPT_V = 18
const ENTRY_SLOTS_V = 15

// cp4-7: ATTRT's front-of-house text, drawn only over the self-playing demo.
// The copyright is CPYRHT's ASCII string (CENTI4.MAC:12 ".ASCIN /1980 ATARI/",
// claims LOOP-20); the panel is BONUS's "BONUS LIFE EVERY" followed by the
// DIP-default increment (BONUSV[0] = 10000, :225-248, claims LOOP-21/22). The
// copyright sits at CPYRHT's own row (STARTING POSITION v=5, :171-172).
const COPYRIGHT = '1980 ATARI'
const BONUS_PANEL = `BONUS LIFE EVERY ${BONUS_INCREMENT}`
const COPYRIGHT_V = 5
const BONUS_PANEL_V = 8

/** Screen-x that centres ROM-tile text across the playfield's columns. Text
 *  advances +TILE_W per character from its anchor (layoutText), so the anchor
 *  is the LOW column of the centred span. */
function centreX(text: string): number {
  return cellScreenX(Math.max(0, Math.floor((PLYFLD_WIDTH - text.length) / 2)))
}

/** Draw one centred row of the entry screen, clearing its cells first.
 *
 *  The clear is not cosmetic padding — it is what the hardware does. The ROM's
 *  screen is a TILE map, so MESS writing a character into a cell REPLACES
 *  whatever occupied it; a message row cannot show a mushroom behind its text.
 *  Blitting glyphs straight over the field would instead let mushrooms bleed
 *  through the transparent pixels of each glyph, which is both unfaithful and
 *  genuinely hard to read (observed on the 5288 smoke test). */
function drawTextRow(ctx: CanvasRenderingContext2D, atlas: Atlas, text: string, v: number): void {
  const x = centreX(text)
  const y = cellScreenY(v)
  ctx.fillStyle = rgbCss(PLAYFIELD_PENS[0])
  ctx.fillRect(x, y, text.length * TILE_W, TILE_H)
  drawText(ctx, atlas, text, x, y)
}

/** AC-1/2/3: clear to the CLRCH background pen, blit every mushroom + the
 *  gun + the live shot from the injected atlas, and draw the HUD (score,
 *  lives, high score) from ROM tiles on the reserved v=0x1F row. `highScore`
 *  is OPTIONAL (cp2-12) so existing 3-arg call sites keep compiling; the
 *  shell entry sources it from @shared/highscore, never render.ts.
 *  imageSmoothingEnabled=false keeps every blit crisp (AC-2). */
export function render(ctx: CanvasRenderingContext2D, atlas: Atlas, state: SimState, highScore = 0): void {
  ctx.imageSmoothingEnabled = false

  ctx.fillStyle = rgbCss(PLAYFIELD_PENS[0])
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H)

  const { cells } = state.playfield
  for (let h = 0; h < PLYFLD_WIDTH; h++) {
    for (let v = 0; v < PLYFLD_HEIGHT; v++) {
      const cell = cells[h * PLYFLD_STRIDE + v]
      if (!isMushroom(cell)) continue
      blit(ctx, atlas, mushroomStamp(cell), cellScreenX(h), cellScreenY(v), TILE_W, TILE_H)
    }
  }

  // cp2-1: sprites are rotated to screen orientation at the atlas bake, so
  // their baked (and blitted) footprint is SPRITE_H wide x SPRITE_W tall —
  // the axis-swapped inverse of the decoded SPRITE_W x SPRITE_H geometry.
  // cp2-6: screen-y is gunScreenY (pixel-accurate), not the coarse OBSTAC
  // collision row — that cell is for mushroom lookups only (PS-16/17).
  blit(ctx, atlas, 'GUN', gunScreenX(state.player.h), gunScreenY(state.player.v), SPRITE_H, SPRITE_W)

  if (state.shot.live) {
    blit(ctx, atlas, 'SHOT', gunScreenX(state.shot.h), gunScreenY(state.shot.v), SPRITE_H, SPRITE_W)
  }

  // cp2-5: the train — every live segment (pic<0x80) or still-exploding one
  // (pic>=0xFA, CT-44); a rested/vacant slot (0xF9) is not drawn.
  for (const seg of state.segs) {
    const live = (seg.pic & DEAD_BIT) === 0
    const exploding = seg.pic > EXPLOSION_DONE
    if (!live && !exploding) continue
    // cp7-1 AC-8: slots 0-11 take the facing flip from MOBJDH's sign.
    // cp7-1 AC-6: an exploding segment draws EXPLD0-5, and its picture reaches
    // the mask (AND I,3F) with the flip bits stripped — so no 180-degree turn
    // here, only the facing mirror.
    const mirrored = mirroredForDh(seg.dh)
    const stamp = exploding ? explosionStamp(seg.pic) : segmentStamp(seg.pic)
    blit(ctx, atlas, stamp, mobjScreenX(seg.h, mirrored), gunScreenY(seg.v), SPRITE_H, SPRITE_W, mirrored)
  }

  // cp3-1: the spider (slot 13). It draws in exactly three states — one of the
  // eight walking faces, the shared explosion pool, or the points sprite its
  // kill awarded. The parked picture (0xF8) is the ROM's "no spider" code and
  // draws nothing, which is what keeps it off the field between appearances.
  // Two pictures draw NOTHING, exactly as for a segment: the parked code 0xF8
  // ("no motion object") and the explosion's rest picture 0xF9. The spider sits
  // on 0xF9 for exactly one frame — EXPLOD converts it to the points sprite on
  // the FOLLOWING frame's entry (:977-979) — so this is a real, reachable state
  // and not a defensive branch.
  const spider = state.spider
  if (spider.pic !== SPIDER_OFF_PIC && spider.pic !== EXPLOSION_DONE) {
    const stamp = spider.pic > EXPLOSION_DONE ? explosionStamp(spider.pic) : spiderStamp(spider.pic)
    blit(ctx, atlas, stamp, gunScreenX(spider.h), gunScreenY(spider.v), SPRITE_H, SPRITE_W)
  }

  // cp3-4: the flea (slot 12). cp3-2 shipped the whole creature — descent,
  // seeding, multi-hit kill, player death — with NOTHING drawing it, so it did
  // all of that invisibly. This is the missing half.
  //
  // Its "not on screen" state is a POSITION, not a picture, and that is the one
  // way it differs from the spider: a parked flea holds the perfectly live
  // picture 0x1C, where a parked spider holds the "no spider" code 0xF8. So the
  // gate is the ROM's own on-screen test — ":59-62 LDA ANTV / EOR CKF8 /
  // CMP I,0F8 / BCC 5$ ;IF ON SCREEN, KEEP MOVING", with ":125 40$: JSR ANTPC
  // ;REMOVE ANT FROM SCREEN" naming the parked state in the author's own words.
  // Drawing it anyway would paint a permanent flea across the HUD row.
  //
  // Above the live band the picture is either the shared explosion pool
  // (0xFF-0xFA, FL-19 — routed to segmentStamp exactly as the spider's is) or
  // EXPLOD's rest picture 0xF9, which draws nothing. cp3-3: the scorpion arrives
  // in this same slot on pictures 0x30-0x33 and takes the middle branch below.
  const flea = state.flea
  if (flea.v < FLEA_PARK_V) {
    // cp7-1 AC-8: slot 12 goes through the SAME predicate as the segments. A
    // flea declines to mirror on its own data (ANTDH is a hard 0,
    // CENTI4.MAC:153-154); a scorpion sharing the slot mirrors, because its
    // ANTDH is -2/+1/-1 (CENTI4.MAC:2038-2045). One rule, two outcomes.
    const mirrored = mirroredForDh(flea.dh)
    const x = mobjScreenX(flea.h, mirrored)
    if (isFleaAlive(flea.pic)) {
      blit(ctx, atlas, fleaStamp(flea.pic), x, gunScreenY(flea.v), SPRITE_H, SPRITE_W, mirrored)
    } else if (isScorpion(flea.pic)) {
      blit(ctx, atlas, scorpionStamp(flea.pic), x, gunScreenY(flea.v), SPRITE_H, SPRITE_W, mirrored)
    } else if (flea.pic > EXPLOSION_DONE) {
      // cp7-1 AC-6: the dedicated explosion sprites, not the HEAD pool.
      blit(ctx, atlas, explosionStamp(flea.pic), x, gunScreenY(flea.v), SPRITE_H, SPRITE_W, mirrored)
    }
  }

  // cp2-12: the HUD lives on the ROM's single reserved top row v=0x1F —
  // derived from the field's own geometry, never hardcoded 0.
  const hudY = cellScreenY(PLYFLD_HEIGHT - 1)

  // P1 score — six raw BCD digits at h0-5, MSD-first. No 'SCORE' text label:
  // UPSCRE emits digits only (CENTI4.MAC:2632-2645, CL-13); the rev-4 in-play
  // HUD carries no text label at all (CL-12).
  // cp2-14: anchored at the band's LOW column now that cellScreenX runs
  // left-to-right. The old cellScreenX(5) anchor was the mirror's special-casing
  // — text advances +TILE_W, so under the mirror it had to start at the far end
  // of its own band. AC-1 wanted exactly that special-casing gone.
  drawText(ctx, atlas, sixDigits(state.score), cellScreenX(0), hudY)

  // P1 lives — GUN icons (never digits), one per remaining life, capped at
  // 6 columns at h6-11 (DLIVES 0x04DF, TEMP1=6, CENTI4.MAC:920-932, CL-15).
  // The player's own gun draws in the field (gunScreenX/Y, never y=hudY), so
  // it is never counted here.
  const livesShown = Math.min(state.lives, 6)
  for (let i = 0; i < livesShown; i++) {
    blit(ctx, atlas, 'GUN', cellScreenX(6 + i), hudY, SPRITE_H, SPRITE_W)
  }

  // High score — six raw BCD digits at h12-17 (0x059F, CL-14), MSD-first.
  // cp2-14: band-low anchor, as above. This band happens to be centred (h12-17
  // mirrors onto itself in h0-29), so its pixels do not move — only the anchor
  // that names it does. That self-symmetry is also why no high-score assertion
  // could ever have caught the mirror.
  drawText(ctx, atlas, sixDigits(highScore), cellScreenX(12), hudY)

  // cp4-6: the initials screen. GETINT puts up two messages before it collects
  // anything — :1036 'JSR MESS ;DISPLAY "GREAT SCORE"' and :1038 'JSR MESS
  // ;DISPLAY "ENTER YOUR INITIALS"' — then displays the three initials via
  // INITAL (:1052, :1055, :1059). Drawn only for a run that actually earned a
  // place: a non-qualifying game-over gets no prompt, exactly as UPDATE's
  // verdict (:2574) decides. The ROM's cocktail-aware two-player panel is not
  // reproduced (one-player clone).
  const entry = state.entry
  // Withdrawn the moment the row lands: the ROM removes both messages as entry
  // completes (:1109-1112 "LDA I,88 / JSR MESS ;REMOVE \"GREAT SCORE\" / LDA
  // I,85 / JSR MESS ;REMOVE \"ENTER INITIALS\"") and clears the initial cells
  // (:1113-1116). Leaving the prompt up told a player who had just finished to
  // enter the initials they had already entered.
  if (state.phase === 'gameover' && entry !== null && entry.qualifies && !entry.confirmed) {
    // Pad to the full three slots with SPACES, never a placeholder glyph:
    // layoutText THROWS on any character without a stamp (layout.ts), and the
    // ROM tile set has letters and digits only — no underscore, no cursor.
    const slots = entry.initials.padEnd(MAX_INITIALS, ' ')
    drawTextRow(ctx, atlas, GREAT_SCORE, ENTRY_TITLE_V)
    drawTextRow(ctx, atlas, ENTER_INITIALS, ENTRY_PROMPT_V)
    drawTextRow(ctx, atlas, slots, ENTRY_SLOTS_V)
  }

  // cp4-7: ATTRT's copyright + "BONUS LIFE EVERY" panel, over the self-playing
  // demo only (JSR BONUS then the CPYRHT MESSAG, CENTI4.MAC:163-173). A live game
  // shows neither. claims LOOP-20/LOOP-21.
  if (state.phase === 'attract') {
    drawTextRow(ctx, atlas, COPYRIGHT, COPYRIGHT_V)
    drawTextRow(ctx, atlas, BONUS_PANEL, BONUS_PANEL_V)
  }
}
