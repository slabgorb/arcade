// tests/orientation-flip.test.ts
//
// Story cp2-14 — RED phase (O'Brien / TEA). The GLOBAL orientation flip: the
// clone renders the playfield as the HORIZONTAL MIRROR of the real upright
// cabinet. Surfaced by the cp2-12 Reviewer (2026-07-19) once the asymmetric HUD
// made it visible; USER-RULED the same day that cp2-12 keeps its mirror (the HUD
// was at least consistent with the field) and that THIS story flips everything
// together.
//
// ─── THE PROOF, RE-OPENED AGAINST PRIMARY SOURCE THIS SESSION ─────────────────
// The story's derivation runs through MAME. It does not need to: the 1981 Atari
// source labels the horizontal edges itself, in MOVE's own clamp comments
// (CENTI4.MAC:1505-1512, revision 4 — the clone's target revision):
//
//     CMP I,0F4
//     BCC 3$        ;IF NOT AT LEFT EDGE     <- PLAYH 0xF4 is the LEFT edge
//     LDA I,0F4     ;KEEP AT EDGE
//   3$: CMP I,0B
//     BCS 10$       ;IF NOT AT RIGHT EDGE    <- PLAYH 0x0B is the RIGHT edge
//     LDA I,0B      ;KEEP AT EDGE
//
// So in the real cabinet a HIGHER pixel-H is further LEFT. Those two bytes are
// already transcribed in the clone, with Atari's labels intact
// (src/core/player.ts:38-39 — PLAYH_MIN "right edge", PLAYH_MAX "left edge"),
// and the renderer contradicts them: it draws gunScreenX(0x0B) at x=-5 (the LEFT
// edge) and gunScreenX(0xF4) at x=228 (the RIGHT edge). The clone's own constants
// convict its own renderer — no external emulator required.
//
// The MAME chain corroborates and fixes the FIELD's h-axis the same way: the
// rev-4 driver is ROT270 (centiped.cpp:2377) over a TILEMAP_SCAN_ROWS 32x32
// tilemap (centiped_v.cpp:93) whose tile_index IS the videoram offset
// (centiped_v.cpp:19-23), drawn with no tilemap flip (centiped_v.cpp:414-419).
// With the ROM's addr decode h=(addr-0x400)>>5, v=addr&0x1F, SCAN_ROWS makes ROM
// h the tilemap ROW and ROM v the COLUMN; ROT270 (swap-xy then flip-y) then sends
// display_x <- ROM h and display_y <- reversed ROM v. Hence ROM h=0 at display
// LEFT (the classic layout: P1 score left, high score centre) and ROM v=0 at
// display BOTTOM — the SAME transform independently re-derives the clone's
// already-correct vertical axis, which is why only the h-axis moves here.
//
// ─── WHY EVERY EXISTING SUITE IS BLIND TO THIS ────────────────────────────────
// Measured this session, not assumed. Three separate mirror-invariances:
//   1. The gun's REST position is a fixed point: createPlayer() sits at h=0x80
//      and gunScreenX(0x80) = 112 under BOTH orientations. sign-chain.test.ts
//      stages only the rest position and asserts only a RELATIVE direction, so
//      it cannot see the mirror. (Fixed below by pinning the h-half too.)
//   2. The high-score HUD band is a fixed point: columns h12-17 mirror onto
//      themselves within h0-29 (29-17=12, 29-12=17), so its anchor is x=96 under
//      BOTH orientations. A high-score pin can NEVER catch this bug.
//   3. cp2-12's HUD pins are order-agnostic sorted multisets read out of bands
//      that are themselves derived from cellScreenX — so the band moves WITH the
//      mirror and the sort discards the reading order. render.test.ts:244-247
//      says so out loud: "these pins are order- and edge-agnostic ... so a
//      correct layout passes however Dev resolves the reversal." That was the
//      cp2-12 Reviewer's LOW finding, and it is AC-3's whole point.
// Every pin in this file is therefore ABSOLUTE — a literal screen coordinate or
// a left/right relation between two ABSOLUTE coordinates, never a band derived
// from the function under test.
//
// ─── A TRAP FOR GREEN ─────────────────────────────────────────────────────────
// The cheap "fix" is a canvas-level mirror (ctx.translate(LOGICAL_W,0);
// ctx.scale(-1,1)). It flips the field and the HUD in one line AND MIRROR-WRITES
// EVERY GLYPH — the score would read backwards. The flip must be a coordinate
// change, so this file pins that no horizontal mirror transform is ever applied
// and that digits still read MSD-first left-to-right.

import { describe, it, expect } from 'vitest'
import { cellScreenX, cellScreenY, gunScreenX, LOGICAL_W } from '../src/shell/layout'
import { TILE_W, SPRITE_H } from '../src/core/pictures'
import { PLYFLD_WIDTH, PLYFLD_HEIGHT, PLYFLD_STRIDE, MUSHROOM_FULL, obstacleCellFor } from '../src/core/playfield'
import { PLAYH_MIN, PLAYH_MAX, createPlayer, movePlayer } from '../src/core/player'
import { createMouseAdapter, createKeyboardAdapter } from '../src/shell/input'
import { render } from '../src/shell/render'
import { createSim, type SimState } from '../src/core/sim'
import type { Atlas } from '../src/shell/atlas'

// ── a position-recording canvas ──────────────────────────────────────────────
// blit() calls atlas.rect(name) immediately before ctx.drawImage(...x,y...), so
// the pending name pairs with the very next drawImage. Also records every
// transform-shaped call so the canvas-mirror trap above is machine-checked.
interface Blit {
  name: string
  /** Effective LEFT edge on the canvas, after any active transform (cp7-1). */
  x: number
  y: number
  /** cp7-1: true when this sprite was painted through the facing mirror. */
  mirrored: boolean
}
function makeRecorder() {
  const blits: Blit[] = []
  const transforms: { fn: string; args: number[] }[] = []
  let pending: string | null = null
  const atlas = {
    image: {} as CanvasImageSource,
    rect(name: string) {
      pending = name
      return { sx: 0, sy: 0, sw: 8, sh: 8 }
    },
  }
  // cp7-1: a mirror can now legitimately be in effect for ONE sprite at a time
  // (the facing flip). The recorder therefore models the 2D transform rather
  // than recording raw drawImage args — a mirrored sprite is drawn at (0,0)
  // under a translate, so the RAW x would be a lie and every position
  // assertion in this file reads `x`.
  let m = { a: 1, d: 1, e: 0, f: 0 }
  const scopes: Array<typeof m> = []
  const ctx = {
    imageSmoothingEnabled: true,
    fillStyle: '' as string,
    fillRect() {},
    drawImage(_i: unknown, _sx: number, _sy: number, _sw: number, _sh: number, x: number, y: number, w = 0) {
      const x0 = m.a * x + m.e
      const x1 = m.a * (x + w) + m.e
      blits.push({
        name: pending ?? '<none>',
        x: w === 0 || m.a > 0 ? m.a * x + m.e : Math.min(x0, x1),
        y: m.d * y + m.f,
        mirrored: m.a < 0,
      })
      pending = null
    },
    scale(...args: number[]) {
      transforms.push({ fn: 'scale', args })
      m = { ...m, a: m.a * args[0], d: m.d * args[1] }
    },
    translate(...args: number[]) {
      transforms.push({ fn: 'translate', args })
      m = { ...m, e: m.e + m.a * args[0], f: m.f + m.d * args[1] }
    },
    transform(...args: number[]) {
      transforms.push({ fn: 'transform', args })
    },
    setTransform(...args: number[]) {
      transforms.push({ fn: 'setTransform', args })
    },
    rotate(...args: number[]) {
      transforms.push({ fn: 'rotate', args })
    },
    clearRect() {},
    save() {
      scopes.push({ ...m })
    },
    restore() {
      const p = scopes.pop()
      if (p) m = p
    },
  }
  return {
    ctx: ctx as unknown as CanvasRenderingContext2D,
    atlas: atlas as unknown as Atlas,
    blits,
    transforms,
    /** Truthy at end of frame means a mirror leaked past its save/restore. */
    leakedMirror: () => (m.a < 0 ? 1 : 0),
  }
}

/** A sim with an EMPTY playfield, so a staged mushroom is the only field blit. */
function bareSim(over: Partial<SimState> = {}): SimState {
  const s = createSim(2)
  return {
    ...s,
    playfield: { ...s.playfield, cells: new Uint8Array(s.playfield.cells.length), mush: 0 },
    ...over,
  }
}

/** Stage exactly one full mushroom at grid (h,v). */
function withMushroomAt(state: SimState, h: number, v: number): SimState {
  const cells = new Uint8Array(state.playfield.cells)
  cells[h * PLYFLD_STRIDE + v] = MUSHROOM_FULL
  return { ...state, playfield: { ...state.playfield, cells } }
}

// A duck-typed event bus (mirrors sign-chain.test.ts — no DOM in node).
interface Bus {
  addEventListener(t: string, cb: (e: Record<string, unknown>) => void): void
  removeEventListener(t: string, cb: (e: Record<string, unknown>) => void): void
  fire(t: string, e: Record<string, unknown>): void
}
function makeBus(): Bus {
  const map = new Map<string, Set<(e: Record<string, unknown>) => void>>()
  return {
    addEventListener(t, cb) {
      if (!map.has(t)) map.set(t, new Set())
      map.get(t)!.add(cb)
    },
    removeEventListener(t, cb) {
      map.get(t)?.delete(cb)
    },
    fire(t, e) {
      for (const cb of map.get(t) ?? []) cb(e)
    },
  }
}

const SCREEN_MID = LOGICAL_W / 2

// ═══ AC-1 — cellScreenX maps ROM h=0 to screen LEFT ═════════════════════════
describe('cp2-14 AC-1 — the grid h-axis matches the upright cabinet (ROM h=0 at display LEFT)', () => {
  it('places grid column 0 at the LEFT edge and the last column at the RIGHT edge', () => {
    // Absolute literals, not a relation to LOGICAL_W - something.
    expect(cellScreenX(0), 'ROM h=0 draws at the LEFT edge (x=0)').toBe(0)
    expect(cellScreenX(PLYFLD_WIDTH - 1), 'the last ROM column draws at the RIGHT edge').toBe(LOGICAL_W - TILE_W)
  })

  it('makes screen-x RISE with the ROM column across the whole playfield', () => {
    for (let col = 1; col < PLYFLD_WIDTH; col++) {
      expect(cellScreenX(col), `column ${col} must sit right of column ${col - 1}`).toBeGreaterThan(
        cellScreenX(col - 1),
      )
    }
    // and it is exactly one tile per column — no gaps, no double-step
    expect(cellScreenX(1) - cellScreenX(0)).toBe(TILE_W)
  })

  // The AC-3 absolute FIELD pin: a real mushroom, through the public render().
  it('renders a mushroom at ROM h=0 on the LEFT half of the screen and one at h=29 on the RIGHT half', () => {
    const left = makeRecorder()
    render(left.ctx, left.atlas, withMushroomAt(bareSim(), 0, 10))
    const leftMush = left.blits.filter((b) => /^MUSHROOM/.test(b.name))
    expect(leftMush, 'exactly one mushroom staged at h=0').toHaveLength(1)
    expect(leftMush[0].x, 'the h=0 mushroom is drawn at the LEFT edge, x=0').toBe(0)

    const right = makeRecorder()
    render(right.ctx, right.atlas, withMushroomAt(bareSim(), PLYFLD_WIDTH - 1, 10))
    const rightMush = right.blits.filter((b) => /^MUSHROOM/.test(b.name))
    expect(rightMush, 'exactly one mushroom staged at h=29').toHaveLength(1)
    expect(rightMush[0].x, 'the h=29 mushroom is drawn at the RIGHT edge').toBe(LOGICAL_W - TILE_W)
  })
})

// ═══ AC-1 — the HUD lands on the cabinet's true sides, no special-casing ════
describe('cp2-14 AC-1 — the cp2-12 HUD lands on the true cabinet sides (absolute, order-sensitive)', () => {
  const SCORE = 123456
  const HIGH = 987654

  // No `as unknown as` cast here: cp2-12 shipped the optional 4th highScore
  // parameter, so render's real signature already accepts it. (render.test.ts
  // still carries that cast — it was written while the param was hypothetical.)
  const digitsLeftToRight = (blits: readonly Blit[], y: number): { d: string; x: number }[] =>
    blits
      .filter((b) => b.y === y && /^DIGIT_\d$/.test(b.name))
      .map((b) => ({ d: /^DIGIT_(\d)$/.exec(b.name)![1], x: b.x }))
      .sort((a, b) => a.x - b.x)

  // The HUD's reserved ROM row, v=0x1F. Derived through cellScreenY — the
  // VERTICAL axis, which this story does not touch and cp2-12 proved correct —
  // never through cellScreenX, the function under change. (Deriving it as
  // "the topmost blit" is wrong: a centipede segment high on the field can be
  // blitted above the HUD row, and then the row lookup finds no HUD glyphs.)
  const HUD_ROW_Y = cellScreenY(PLYFLD_HEIGHT - 1)

  function hud() {
    const r = makeRecorder()
    render(r.ctx, r.atlas, { ...bareSim(), score: SCORE, lives: 3 }, HIGH)
    return { r, y: HUD_ROW_Y }
  }

  it('draws the P1 score at the LEFT edge of the screen (h0-5), starting at x=0', () => {
    const { r, y } = hud()
    const scoreDigits = digitsLeftToRight(r.blits, y).filter((g) => g.x < SCREEN_MID / 2)
    expect(scoreDigits.length, 'six P1-score digits sit in the leftmost quarter').toBe(6)
    expect(scoreDigits[0].x, 'the P1 score begins at the very LEFT edge, x=0').toBe(0)
  })

  it('reads the P1 score MSD-first LEFT-to-RIGHT (not mirror-written)', () => {
    const { r, y } = hud()
    const reading = digitsLeftToRight(r.blits, y)
      .filter((g) => g.x < SCREEN_MID / 2)
      .map((g) => g.d)
      .join('')
    // ORDERED, not a sorted multiset — this is what cp2-12's pins could not do.
    expect(reading, 'score 123456 must read "123456" left-to-right on screen').toBe('123456')
  })

  it('orders the HUD score LEFT of lives LEFT of high score, in ABSOLUTE screen-x', () => {
    const { r, y } = hud()
    const row = r.blits.filter((b) => b.y === y)
    const scoreMax = Math.max(...row.filter((b) => /^DIGIT_/.test(b.name) && b.x < SCREEN_MID / 2).map((b) => b.x))
    const livesXs = row.filter((b) => b.name === 'GUN').map((b) => b.x)
    const highXs = row.filter((b) => /^DIGIT_/.test(b.name) && b.x >= SCREEN_MID / 2).map((b) => b.x)

    expect(livesXs.length, 'three lives draw three HUD gun icons').toBe(3)
    expect(highXs.length, 'six high-score digits').toBe(6)
    expect(scoreMax, 'the whole score sits left of every life icon').toBeLessThan(Math.min(...livesXs))
    expect(Math.max(...livesXs), 'every life icon sits left of the high score').toBeLessThan(Math.min(...highXs))
  })

  it('anchors the lives icons at ROM columns h6-11 — absolutely, at x=48 upward', () => {
    const r = makeRecorder()
    render(r.ctx, r.atlas, { ...bareSim(), lives: 1 }, HIGH)
    const guns = r.blits.filter((b) => b.y === HUD_ROW_Y && b.name === 'GUN')
    expect(guns, 'lives=1 draws exactly one HUD gun icon').toHaveLength(1)
    // h6 on the corrected axis = 6 * TILE_W = 48. Under the mirror it is 184.
    expect(guns[0].x, 'the first life icon sits at ROM column h6 = x 48').toBe(6 * TILE_W)
  })

  // cp7-1 AC-5 — this pin is NARROWED, deliberately, and here is the reasoning.
  //
  // As written it banned every scale(-1,1) anywhere in the frame. Its own failure
  // message says what it was actually protecting: "a canvas mirror would flip the
  // field AND mirror-write every glyph" — i.e. the hazard is implementing the
  // cabinet's horizontal orientation by mirroring the WHOLE CANVAS instead of
  // fixing the coordinate mapping, which is exactly the bug cp2-14 fixed.
  //
  // cp7-1's facing flip (AC-8) is not that. It is a per-sprite mirror opened and
  // closed around ONE motion object by save/restore, and the ROM applies it the
  // same way (CENIR4.MAC:368 EORs the flip into that slot's picture, not into the
  // display). A blanket ban would have forbidden a faithful behaviour on the
  // strength of a mechanism it shares with an unfaithful one.
  //
  // So the guarantee is re-stated as what cp2-14 meant rather than dropped: the
  // field mapping is still a coordinate change, no HUD glyph is ever mirror-
  // written, and no mirror may outlive its own sprite. The whole-canvas mirror is
  // still impossible — it would trip every one of these.
  it('never mirror-writes a HUD glyph, and never leaks a mirror past its sprite', () => {
    const { r, y } = hud()
    // Named, not merely "everything on the HUD row" — a mirrored motion object
    // that happened to sit on that row would otherwise be misread as a glyph.
    const hudGlyphs = r.blits.filter((b) => b.y === y && (/^DIGIT_/.test(b.name) || b.name === 'GUN'))
    expect(hudGlyphs.length, 'the HUD must have drawn for this to mean anything').toBeGreaterThan(0)
    expect(
      hudGlyphs.filter((b) => b.mirrored),
      'a mirrored HUD glyph means the mirror escaped the sprite that opened it',
    ).toEqual([])
    expect(r.leakedMirror(), 'every mirror must be closed by its own restore()').toBe(0)
  })

  it('still sets no transform MATRIX and never rotates — the cp2-14 ban that is unchanged', () => {
    const { r } = hud()
    const banned = r.transforms.filter((t) => t.fn === 'setTransform' || t.fn === 'transform' || t.fn === 'rotate')
    expect(banned, 'the field mapping must stay a coordinate change, not a matrix').toEqual([])
  })

  it('the only scale() the renderer ever performs is the horizontal mirror scale(-1, 1)', () => {
    // Narrowed, not opened: scale(1,-1) is a vertical flip and scale(-1,-1) is
    // the 180-degree cocktail turn. Neither is sanctioned, and a bare "scale is
    // allowed now" would have let both through.
    const { r } = hud()
    for (const t of r.transforms.filter((x) => x.fn === 'scale')) {
      expect(t.args.join(','), `renderer called scale(${t.args.join(', ')})`).toBe('-1,1')
    }
  })
})

// ═══ AC-2 — the input sign chain still delivers device-right => screen-right ══
describe('cp2-14 AC-2 — device-right still moves the gun screen-RIGHT after the flip', () => {
  // Each test asserts BOTH halves together so neither can pass alone:
  //   (a) the ROM half  — device-right must drive PLAYH toward 0x0B, the ROM's
  //       RIGHT edge (CENTI4.MAC:1510-1512). This is RED today.
  //   (b) the feel half — the gun's SCREEN x must still increase. Green today,
  //       and it must STAY green; that is the whole point of AC-2.
  const rest = createPlayer()

  it('keyboard: ArrowRight drives PLAYH toward the ROM right edge AND moves the gun screen-right', () => {
    const busR = makeBus()
    const right = createKeyboardAdapter(busR)
    busR.fire('keydown', { key: 'ArrowRight' })
    const movedR = movePlayer(rest, right.sample())

    expect(movedR.h, 'device-right moves PLAYH toward 0x0B, the ROM RIGHT edge').toBeLessThan(rest.h)
    expect(gunScreenX(movedR.h), 'and the gun still travels RIGHT on screen').toBeGreaterThan(gunScreenX(rest.h))

    const busL = makeBus()
    const leftAd = createKeyboardAdapter(busL)
    busL.fire('keydown', { key: 'ArrowLeft' })
    const movedL = movePlayer(rest, leftAd.sample())

    expect(movedL.h, 'device-left moves PLAYH toward 0xF4, the ROM LEFT edge').toBeGreaterThan(rest.h)
    expect(gunScreenX(movedL.h), 'and the gun still travels LEFT on screen').toBeLessThan(gunScreenX(rest.h))
  })

  it('pointer/trackball: +movementX drives PLAYH toward the ROM right edge AND moves the gun screen-right', () => {
    const busR = makeBus()
    const mouseR = createMouseAdapter(busR)
    busR.fire('mousemove', { movementX: 12, movementY: 0 })
    const movedR = movePlayer(rest, mouseR.sample())

    expect(movedR.h, '+movementX moves PLAYH toward 0x0B, the ROM RIGHT edge').toBeLessThan(rest.h)
    expect(gunScreenX(movedR.h), 'and the gun still travels RIGHT on screen').toBeGreaterThan(gunScreenX(rest.h))

    const busL = makeBus()
    const mouseL = createMouseAdapter(busL)
    busL.fire('mousemove', { movementX: -12, movementY: 0 })
    const movedL = movePlayer(rest, mouseL.sample())

    expect(movedL.h, '-movementX moves PLAYH toward 0xF4, the ROM LEFT edge').toBeGreaterThan(rest.h)
    expect(gunScreenX(movedL.h), 'and the gun still travels LEFT on screen').toBeLessThan(gunScreenX(rest.h))
  })
})

// ═══ AC-1/AC-2 — gunScreenX itself, pinned absolutely at the ROM's own edges ══
describe('cp2-14 — gunScreenX honours the ROM edge labels it already carries', () => {
  it('draws PLAYH_MIN (0x0B, the ROM RIGHT edge) on the RIGHT half of the screen', () => {
    // player.ts:38 calls 0x0B "right edge"; CENTI4.MAC:1510-1512 is where that
    // label comes from. Today the renderer puts it at x = -5.
    expect(gunScreenX(PLAYH_MIN), 'PLAYH_MIN is the cabinet RIGHT edge').toBeGreaterThan(SCREEN_MID)
  })

  it('draws PLAYH_MAX (0xF4, the ROM LEFT edge) on the LEFT half of the screen', () => {
    expect(gunScreenX(PLAYH_MAX), 'PLAYH_MAX is the cabinet LEFT edge').toBeLessThan(SCREEN_MID)
  })

  it('slides smoothly the other way — exactly -1 px of screen-x per +1 pixel-H', () => {
    let prev = gunScreenX(PLAYH_MIN)
    for (let h = PLAYH_MIN + 1; h <= PLAYH_MAX; h++) {
      const cur = gunScreenX(h)
      expect(cur - prev, `gunScreenX must fall by exactly 1 px from h=0x${(h - 1).toString(16)} to 0x${h.toString(16)}`).toBe(-1)
      prev = cur
    }
  })

  // cp2-7's invariant, restated for the flipped axis: it must SURVIVE the flip.
  // This is the pin that rejects a naive `LOGICAL_W - h` mirror, which lands the
  // sprite centre one pixel into the NEXT tile for 1 in every 8 values of h.
  it('keeps the cp2-7 hitbox contract: the sprite CENTRE stays inside its own OBSTAC collision column', () => {
    for (let h = PLAYH_MIN; h <= PLAYH_MAX; h++) {
      const centre = gunScreenX(h) + SPRITE_H / 2
      const col = obstacleCellFor(h, 0x10, 0).h
      const tileLeft = cellScreenX(col)
      expect(centre, `h=0x${h.toString(16)}: sprite centre must sit inside collision column ${col}`).toBeGreaterThanOrEqual(tileLeft)
      expect(centre, `h=0x${h.toString(16)}: sprite centre must sit inside collision column ${col}`).toBeLessThan(tileLeft + TILE_W)
    }
  })
})
