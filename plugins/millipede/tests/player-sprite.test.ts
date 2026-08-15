// tests/player-sprite.test.ts
//
// Story ml7-6. THE PLAYER SHIP is this story's core deliverable. At the RED
// baseline this suite was written against, main.ts painted the gun as a
// placeholder blue 4x4 fillRect ("exact sprite decode is a follow-up"), while
// every other MOBJ — the millipede segments and the whole enemy cast — already
// routed through the decoded-sprite path (drawSprite -> drawStampAtPx). GREEN
// replaced the placeholder with the real ship sprite decoded from the gfx ROM
// (shell/gfx-rom.ts -> shell/stamp-data.ts STAMPS), blitted through the SAME
// ml7-3 CCW-rotated sprite path — which is what these tests now assert holds.
//
// WHY BEHAVIOURAL, NOT A SOURCE GREP (lang-review #15/#25): a grep for
// "drawSprite" over main.ts passes on a comment and cannot tell a real blit from
// a fill. These tests BOOT the real shell (helpers/boot-shell.ts), render one
// frame, and read the ACTUAL draw calls the renderer emitted onto the logical
// backbuffer — the pixels asserted are the ones that landed, never re-derived
// through the implementation's own rotation formula (lang-review #18/#26; the
// ml7-3 hand-typed-bitmap lesson). "routing != geometry" (render.ts:7,
// playbook §4): the exact ship SHAPE and rotation are the human visual playtest
// (AC3); these pin only that a real, visible, opaque sprite lands where the gun
// is and that the placeholder fill is gone.
//
// ─── WHAT GREEN (Dev) MUST SHIP ──────────────────────────────────────────────
//   src/main.ts — the player branch draws the gun as a decoded STAMPS sprite
//     (via drawSprite/drawStampAtPx) at its screen cell, NOT a solid fill. The
//     exact ship pic is Dev's ROM derivation, CONFIRMED at the playtest: the HUD
//     lives-ship is char $1F -> sheet tile $5F (core/hud.ts SHIP_STAMP; the
//     render.ts `charTile` map), a real 31-pixel ship already in STAMPS — a documented
//     starting point, not a mandate. The on-field gun is a MOBJ picture
//     (MLxxx.MAC MOBJ tables + the picture ROM 136013-106/107); derive it and
//     look at /millipede/.
//   AC2 (enemy/mushroom/segment pic FIDELITY) and AC3 (frame correct to the eye,
//     no full-screen flash) are the VISUAL PLAYTEST plus the existing
//     tests/accessibility.test.ts guard; AC4 (core/shell boundary) is
//     tests/purity.test.ts. See the session TEA Assessment for the checklist.

import { describe, it, expect, beforeAll } from 'vitest'
import { bootMillipedeShell, type DrawRecord, type DrawBlit, type ShellHarness } from './helpers/boot-shell'
import { PLAYER_V_MIN } from '../src/core/input'
import { createGame } from '../src/core/game-state'

// The ml7-3 MOBJ pixel -> logical screen mapping main.ts uses (main.ts:92). Used
// ONLY to LOCATE the gun's cell among the recorded draws — the pixel VALUES
// asserted below come from the real renderer, so re-stating the locate formula
// here shares no derivation with the pixels under test (lang-review #18).
const screenPx = (h: number, v: number): [number, number] => [(0xf7 - h) & 0xff, (0xf8 - v) & 0xff]

// The gun boots at h=0x80, v=PLAYER_V_MIN (core/input.ts createPlayer). Its
// screen cell x is 119 — NOT a multiple of 8 — so drawGridStamps (always col*8)
// can never blit there: any 8x8 sprite blit at this cell is the player's alone.
const [SHIP_X, SHIP_Y] = screenPx(0x80, PLAYER_V_MIN)

const FOOT_W = 16 // a MOBJ sprite is a 2-tile pair (drawSprite blits pic tiles 2p / 2p+1)
const FOOT_H = 8

/** Does a recorded rect overlap the gun's sprite footprint at (SHIP_X, SHIP_Y)? */
function inFootprint(x: number, y: number, w: number, h: number): boolean {
  return x < SHIP_X + FOOT_W && x + w > SHIP_X && y < SHIP_Y + FOOT_H && y + h > SHIP_Y
}

let frameDraws: readonly DrawRecord[]

beforeAll(async () => {
  const shell: ShellHarness = await bootMillipedeShell()
  // Frame 0 renders the booted world (the gun is alive at spawn — createPlayer
  // alive:true) even though the 0ms delta steps the sim zero times: render()
  // runs every rAF. Capturing frame 0 avoids any attract-demo drift of the gun.
  const before = shell.draws('logical').length
  shell.frame(0)
  frameDraws = shell.draws('logical').slice(before)
})

describe('ml7-6 — the player gun boots at a locatable, non-grid-aligned cell', () => {
  it('createGame spawns the gun at h=0x80, v=PLAYER_V_MIN (the pinned SHIP cell)', () => {
    const p = createGame(0x1982).player
    expect(p.alive).toBe(true)
    expect([p.h, p.v]).toEqual([0x80, PLAYER_V_MIN])
    // x=119 is not 8-aligned, so no grid stamp can collide with the gun's cell.
    expect(SHIP_X % 8).not.toBe(0)
  })

  it('render() actually painted frame 0 (the backbuffer is non-empty)', () => {
    expect(frameDraws.length).toBeGreaterThan(0)
  })
})

describe('ml7-6 AC1 — the player renders as a decoded sprite, not a placeholder fill', () => {
  it('blits a real, visible, opaque 8x8 sprite at the gun cell (RED: today it is a fill)', () => {
    const shipBlits = frameDraws.filter(
      (r): r is DrawBlit => r.kind === 'blit' && r.x === SHIP_X && r.y === SHIP_Y && r.w === 8 && r.h === 8,
    )
    expect(
      shipBlits.length,
      'no sprite blit at the gun cell — the gun is still the #4cf placeholder fill',
    ).toBeGreaterThanOrEqual(1)

    const ship = shipBlits[0]
    let opaque = 0
    let transparent = 0
    let nonBackground = 0
    for (let px = 0; px < 64; px++) {
      const off = px * 4
      const alpha = ship.data[off + 3]
      if (alpha === 255) opaque++
      else if (alpha === 0) transparent++
      if (ship.data[off] || ship.data[off + 1] || ship.data[off + 2]) nonBackground++
    }
    // The render fix: pen 0 is the transparent pen (background shows through),
    // ink pixels are fully opaque. No pixel is PARTIALLY translucent — a real
    // sprite tile, not a blend artefact. (Every pixel is either alpha 0 or 255.)
    expect(opaque + transparent, 'a ship pixel is partially translucent — not a clean sprite tile').toBe(64)
    // A real ship tile has visible, opaque ink; a blank/garbage tile would be
    // all transparent background. Exact SHAPE is the human playtest, not this unit.
    expect(opaque, 'the ship sprite decoded to an all-transparent (blank) tile — no opaque ink').toBeGreaterThan(0)
    expect(nonBackground, 'the ship sprite decoded to an all-background (blank) tile').toBeGreaterThan(0)
  })

  it('does NOT paint the gun as a small solid fillRect placeholder (RED: the #4cf 4x4 marker)', () => {
    // Exclude the full-frame clear (240x256) — only SMALL solid rects are markers.
    const markerFills = frameDraws.filter(
      (r) => r.kind === 'fillRect' && r.w <= FOOT_W && r.h <= FOOT_H && inFootprint(r.x, r.y, r.w, r.h),
    )
    expect(
      markerFills.length,
      `the gun is drawn as a solid-fill placeholder inside its sprite footprint: ${JSON.stringify(markerFills)}`,
    ).toBe(0)
  })
})
