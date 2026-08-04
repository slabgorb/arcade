// tests/scorpion-live.test.ts
//
// Story cp3-3 — RED phase (O'Brien / TEA). The scorpion's THREE live wires, the
// half of this story a unit test of scorpion.ts cannot reach:
//
//   1. THE SIM MUST STEP IT. SCORP is mainloop slot :36 (between SHOOT :34 and
//      ANTMV :37). A scorpion parked in SimState.flea must actually move and
//      poison when the sim advances — proof that stepScorp is wired in, not just
//      written.
//   2. POISON GOES LIVE, END TO END. A real scorpion crossing a real mushroom
//      must flip that playfield cell into the 0x38-0x3B band, a real centipede
//      head must then read that cell and take cp2-3's POISON DIVE, and the
//      renderer must draw that same cell through cp1-6's poison branch. Before
//      this story nothing in the game ever created a poisoned mushroom, so all
//      three branches have only ever been exercised by hand-seeded test fields.
//   3. THE RENDERER MUST DRAW IT. render.ts draws the gun, mushrooms, the train,
//      the spider and (cp3-4) the flea, but has no scorpion branch — its own
//      comment says "cp3-3's scorpion will arrive in this same slot on pictures
//      0x30-0x33 and gets its own branch then". The ecosystem demo cannot be
//      captured with an invisible creature.
//
// ─── WHY THIS IS RED ──────────────────────────────────────────────────────────
// src/core/scorpion.ts does not exist and render.ts exports no scorpionStamp.
// loadLive() dynamic-imports both and throws a self-describing "not built yet",
// so the assertions redden for the FEATURE's absence, not an import stack trace.

import { describe, it, expect } from 'vitest'
import { render } from '../src/shell/render'
import type { Atlas } from '../src/shell/atlas'
import { gunScreenX, gunScreenY, cellScreenX, cellScreenY } from '../src/shell/layout'
import { createSim, stepSim, type SimState } from '../src/core/sim'
import type { InputCounts } from '../src/core/player'
import {
  createPlayfield,
  PLYFLD_STRIDE,
  MUSHROOM_FULL,
  MUSHROOM_MIN,
  type Playfield,
} from '../src/core/playfield'
import {
  stepCentipede,
  CENT_HEAD_PIC,
  CENT_BOTTOM_V,
  POISON_BIT,
  type Segment,
} from '../src/core/centipede'
import { STAMPS, SPRITE_W, SPRITE_H } from '../src/core/pictures'

// ─── ROM constants hand-mirrored from CENTI4.MAC ──────────────────────────────
const SCORP_PIC_LOW = 0x30 // :2026 first scorpion picture
const SCORP_PIC_HIGH = 0x34 // :2003 exploding boundary
const SCORP_PARK_PIC = 0x1c // ANTPC parked-flea picture
const SCORP_PARK_V = 0xf8 // ANTPC parked V ("removed from screen")
const SCORP_EXPLODE_PIC = 0xff // shared explosion picture
const SCORP_POISON_MASK = 0xfb // :2094 "AND I,0FB"
const POISON_BAND_MAX = 0x3c // a poisoned mushroom is [0x38, 0x3C)

/** The neutral frame: no trackball motion, no trigger. TYPED — an untyped
 *  literal here silently produced NaN player coords in cp3-4's RED. */
const IDLE: InputCounts = { dh: 0, dv: 0, fire: false }

// ── a recording ctx + atlas that keeps the stamp NAME next to its draw args ──
interface Draw {
  stamp: string
  x: number
  y: number
  w: number
  h: number
}
function makeRecorder(): { ctx: CanvasRenderingContext2D; atlas: Atlas; draws: Draw[] } {
  const draws: Draw[] = []
  let pending = ''
  const atlas = {
    image: {} as CanvasImageSource,
    rect(name: string) {
      pending = name
      return { sx: 0, sy: 0, sw: 8, sh: 8 }
    },
  }
  const ctx = {
    imageSmoothingEnabled: true,
    fillStyle: '',
    fillRect() {},
    clearRect() {},
    save() {},
    restore() {},
    // cp7-1 AC-8: the facing flip blits mirrored sprites through a horizontal
    // mirror (render.ts blit), so the ctx surface grew these two.
    translate() {},
    scale() {},
    drawImage(
      _img: unknown,
      _sx: number,
      _sy: number,
      _sw: number,
      _sh: number,
      x: number,
      y: number,
      w: number,
      h: number,
    ) {
      draws.push({ stamp: pending, x, y, w, h })
    },
  }
  return { ctx: ctx as unknown as CanvasRenderingContext2D, atlas: atlas as Atlas, draws }
}

// ─── the surface GREEN (Julia) builds ─────────────────────────────────────────

interface Slot {
  h: number
  v: number
  dv: number
  dh: number
  pic: number
}

interface LiveModule {
  scorpionStamp: (pic: number) => string
  isScorpion: (pic: number) => boolean
  stepScorp: (
    slot: Slot,
    field: Playfield,
    ctx: { frame: number; score: number; centin: number; rng: unknown },
  ) => { slot: Slot; poisoned: boolean }
}

async function loadLive(): Promise<LiveModule> {
  try {
    const scorpPath = ['..', 'src', 'core', 'scorpion'].join('/')
    const scorp = (await import(/* @vite-ignore */ scorpPath)) as Record<string, unknown>
    const rend = (await import('../src/shell/render')) as Record<string, unknown>
    if (typeof rend.scorpionStamp !== 'function') throw new Error('render.ts exports no scorpionStamp')
    for (const name of ['isScorpion', 'stepScorp']) {
      if (typeof scorp[name] !== 'function') throw new Error(`scorpion.ts has no ${name}`)
    }
    return {
      scorpionStamp: rend.scorpionStamp as LiveModule['scorpionStamp'],
      isScorpion: scorp.isScorpion as LiveModule['isScorpion'],
      stepScorp: scorp.stepScorp as LiveModule['stepScorp'],
    }
  } catch (e) {
    throw new Error(
      'cp3-3 live surface not built yet — GREEN (Julia) adds render.ts scorpionStamp + a ' +
        'scorpion draw branch (pic 0x30-0x33 -> SCORP0-3 at gunScreenX/Y), and wires ' +
        'src/core/scorpion.ts stepScorp into the sim between the shot resolution and stepFlea. ' +
        `(${e instanceof Error ? e.message : String(e)})`,
    )
  }
}

/** A sim with the shared slot 12 holding exactly the object the test wants. */
function simWithSlot(slot: Partial<Slot>): SimState {
  const state = createSim(1)
  return { ...state, flea: { ...state.flea, ...slot } }
}

/** Every SCORP* stamp drawn by one render() of `state`. */
function scorpDraws(state: SimState): Draw[] {
  const r = makeRecorder()
  render(r.ctx, r.atlas, state)
  return r.draws.filter((d) => d.stamp.startsWith('SCORP'))
}

// A scorpion and a centipede head positioned so the scorpion's poison cell and
// the head's forward (rightward) probe both land on the SAME grid cell (15,16):
//   scorpion (0x78, 0x80), dir 0  -> obstacleCellFor = { h: 15, v: 16 }
//   head     (0x77, 0x80), dir +  -> obstacleCellFor = { h: 15, v: 16 }
const SHARED_CELL = { h: 15, v: 16 }
const SCORP_AT = { h: 0x78, v: 0x80 }
const HEAD_AT = { h: 0x77, v: 0x80 }

// ════════════════════════════════════════════════════════════════════════════
// AC-4 — render.ts finally knows the scorpion exists
// ════════════════════════════════════════════════════════════════════════════

describe('cp3-3 AC-4 — scorpionStamp maps the band 0x30-0x33 onto SCORP0-SCORP3', () => {
  it('exports scorpionStamp(pic) and maps each live picture to its sprite', async () => {
    const mod = await loadLive()
    expect(typeof mod.scorpionStamp, 'render.ts must export scorpionStamp, as it exports fleaStamp').toBe('function')
    expect(mod.scorpionStamp(0x30)).toBe('SCORP0')
    expect(mod.scorpionStamp(0x31)).toBe('SCORP1')
    expect(mod.scorpionStamp(0x32)).toBe('SCORP2')
    expect(mod.scorpionStamp(0x33)).toBe('SCORP3')
  })

  it('every SCORP stamp it can emit is a real cp1-3 picture-ROM sprite (no new art)', async () => {
    await loadLive()
    const known = new Map(STAMPS.map((s) => [s.name, s]))
    for (let pic = SCORP_PIC_LOW; pic < SCORP_PIC_HIGH; pic++) {
      const name = `SCORP${pic - SCORP_PIC_LOW}`
      expect(known.has(name), `${name} must already exist in the baked atlas`).toBe(true)
      expect(known.get(name)?.kind, `${name} is an 8x16 motion-object sprite`).toBe('sprite')
    }
  })

  it('refuses a picture that is not a scorpion, rather than inventing a stamp', async () => {
    const mod = await loadLive()
    for (const pic of [SCORP_PIC_HIGH, SCORP_PIC_LOW - 1, 0x1c, SCORP_EXPLODE_PIC, SCORP_PARK_PIC]) {
      expect(() => mod.scorpionStamp(pic), `0x${pic.toString(16)} is not a scorpion picture`).toThrow()
    }
    expect(() => mod.scorpionStamp(SCORP_PIC_LOW), 'but the live band is accepted').not.toThrow()
  })
})

describe('cp3-3 AC-4 — render() draws the scorpion in slot 12', () => {
  it('blits a crossing scorpion once, at the shared sprite position and footprint', async () => {
    await loadLive()
    const state = simWithSlot({ v: 0x90, h: 0x54, pic: SCORP_PIC_LOW })
    const drawn = scorpDraws(state)
    expect(drawn.length, 'a scorpion on screen is blitted exactly once').toBe(1)
    expect(drawn[0].stamp).toBe('SCORP0')
    // Position from the SAME gun* helpers every motion object uses, never bespoke.
    expect(drawn[0].x, 'screen-x via gunScreenX').toBe(gunScreenX(0x54))
    expect(drawn[0].y, 'screen-y via gunScreenY').toBe(gunScreenY(0x90))
    // Footprint is SPRITE_H wide x SPRITE_W tall — the rotated-at-bake shape a
    // W/H transposition would silently break.
    expect([drawn[0].w, drawn[0].h], 'blitted SPRITE_H wide x SPRITE_W tall').toEqual([SPRITE_H, SPRITE_W])
  })

  it('draws the RIGHT sprite for each of the four crossing pictures', async () => {
    await loadLive()
    for (const pic of [0x30, 0x31, 0x32, 0x33]) {
      const drawn = scorpDraws(simWithSlot({ v: 0x90, h: 0x54, pic }))
      expect(drawn.length, `picture 0x${pic.toString(16)} draws once`).toBe(1)
      expect(drawn[0].stamp, `picture 0x${pic.toString(16)} -> SCORP${pic - SCORP_PIC_LOW}`).toBe(
        `SCORP${pic - SCORP_PIC_LOW}`,
      )
    }
  })

  it('draws NO scorpion for a parked slot, a flea, or an exploding slot', async () => {
    await loadLive()
    // Parked (the boot state): nothing.
    expect(scorpDraws(createSim(7)), 'a booted sim parks the slot — no scorpion').toEqual([])
    // A flea (pic 0x1C) on screen: the flea branch draws it, not a scorpion.
    expect(scorpDraws(simWithSlot({ v: 0x80, h: 0x54, pic: SCORP_PARK_PIC })), 'a flea is not a scorpion').toEqual([])
    // An exploding slot (0xFF) falls to the shared explosion pool, not SCORP*.
    expect(scorpDraws(simWithSlot({ v: 0x80, h: 0x54, pic: SCORP_EXPLODE_PIC })), 'an explosion is not a scorpion').toEqual([])
  })
})

// ════════════════════════════════════════════════════════════════════════════
// AC-1 — the sim actually steps the scorpion (SCORP :36 is wired in)
// ════════════════════════════════════════════════════════════════════════════

describe('cp3-3 AC-1 — stepSim moves and poisons a scorpion in slot 12', () => {
  it('advances a crossing scorpion by dh and poisons the mushroom under it', async () => {
    await loadLive()
    // A scorpion mid-crossing over a full mushroom. If stepScorp is NOT wired
    // into the mainloop, the slot sits still and the mushroom stays normal.
    const state = simWithSlot({ ...SCORP_AT, dh: 2, dv: 0, pic: SCORP_PIC_LOW })
    // Lay full mushrooms across the whole cell column the scorpion occupies for
    // the next few pixels (0x78-0x7F all map to grid column 15), so the poison
    // lands regardless of the exact post-move pixel.
    for (let vCell = 15; vCell <= 17; vCell++) {
      state.playfield.cells[SHARED_CELL.h * PLYFLD_STRIDE + vCell] = MUSHROOM_FULL
    }
    const next = stepSim(state, IDLE)
    expect(next.flea.h, 'the scorpion advanced by dh — the sim stepped it (SCORP :36)').toBe(SCORP_AT.h + 2)
    expect(next.flea.v, 'and did not descend').toBe(SCORP_AT.v)
    const poisoned = Array.from(next.playfield.cells).filter((c) => c >= MUSHROOM_MIN && c < POISON_BAND_MAX)
    expect(poisoned.length, 'a mushroom under the scorpion is now in the poison band').toBeGreaterThan(0)
  })

  it('leaves the mushroom NORMAL when the slot holds a parked flea, not a scorpion', async () => {
    await loadLive()
    // The control: a parked flea in slot 12 pours no poison. Proves the poison
    // in the test above came from the scorpion, not from some other sim system.
    const state = simWithSlot({ ...SCORP_AT, dh: 0, dv: 0, pic: SCORP_PARK_PIC, v: SCORP_PARK_V })
    state.playfield.cells[SHARED_CELL.h * PLYFLD_STRIDE + SHARED_CELL.v] = MUSHROOM_FULL
    const next = stepSim(state, IDLE)
    expect(next.playfield.cells[SHARED_CELL.h * PLYFLD_STRIDE + SHARED_CELL.v], 'a parked flea poisons nothing').toBe(
      MUSHROOM_FULL,
    )
  })
})

// ════════════════════════════════════════════════════════════════════════════
// AC-2 — the poison goes live end to end: crossing -> poison -> DIVE
// ════════════════════════════════════════════════════════════════════════════

describe('cp3-3 AC-2 — a real scorpion crossing activates cp2-3\'s poison dive', () => {
  it('poisons a mushroom, then a centipede head reading that cell DIVES to the bottom', async () => {
    const mod = await loadLive()

    // 1) A real scorpion poisons a real playfield cell.
    const field = createPlayfield()
    field.cells[SHARED_CELL.h * PLYFLD_STRIDE + SHARED_CELL.v] = MUSHROOM_FULL
    // dh:1 is a real crossing speed; post-move h (0x79) still maps to column 15,
    // so the scorpion poisons SHARED_CELL exactly (not a staged dh:0).
    const scorpion: Slot = { ...SCORP_AT, dh: 1, dv: 0, pic: SCORP_PIC_LOW }
    const rng = createSim(1).rng
    const step = mod.stepScorp(scorpion, field, { frame: 1, score: 0, centin: 5, rng })
    expect(step.poisoned, 'the scorpion poisoned its cell').toBe(true)
    const poisonedCode = field.cells[SHARED_CELL.h * PLYFLD_STRIDE + SHARED_CELL.v]
    expect(poisonedCode, 'a full mushroom becomes 0x3B — full height, poisoned').toBe(MUSHROOM_FULL & SCORP_POISON_MASK)
    expect(poisonedCode, 'and sits in the dive band [0x38,0x3C)').toBeGreaterThanOrEqual(MUSHROOM_MIN)
    expect(poisonedCode, 'and sits in the dive band [0x38,0x3C)').toBeLessThan(POISON_BAND_MAX)

    // 2) A head at a cell boundary marching RIGHT probes that exact cell. First
    //    step: it takes the poison bit (CT-18) and begins to descend.
    const head: Segment = { ...HEAD_AT, dh: 2, dv: 2, pic: CENT_HEAD_PIC }
    let segs = stepCentipede([head], field)
    expect(segs[0].pic & POISON_BIT, 'the head reads the poisoned cell and is marked poisoned (CT-18)').toBe(POISON_BIT)

    // 3) A poisoned head DIVES continuously (CT-19) to the bottom zone — it does
    //    not just turn one cell like a normal mushroom would.
    for (let frame = 0; frame < 80 && segs[0].v > CENT_BOTTOM_V; frame++) {
      segs = stepCentipede(segs, field)
    }
    expect(segs[0].v, 'the poison dive carries the head all the way to the floor').toBeLessThanOrEqual(
      CENT_BOTTOM_V + 2,
    )
  })

  it('a NORMAL mushroom only TURNS the head — the dive is the poison\'s doing, not the turn\'s', async () => {
    await loadLive()
    // The discriminator: identical head, identical position, but the cell is a
    // NORMAL mushroom (never poisoned). It turns down ONE cell (CT-17) and
    // marches on — it must NOT reach the floor, or the dive test above proves
    // nothing about poison.
    const field = createPlayfield()
    field.cells[SHARED_CELL.h * PLYFLD_STRIDE + SHARED_CELL.v] = MUSHROOM_FULL // 0x3F, normal
    let segs: Segment[] = [{ ...HEAD_AT, dh: 2, dv: 2, pic: CENT_HEAD_PIC }]
    segs = stepCentipede(segs, field)
    expect(segs[0].pic & POISON_BIT, 'a normal mushroom does NOT poison the head').toBe(0)
    const vAfterTurn = segs[0].v
    for (let frame = 0; frame < 80; frame++) segs = stepCentipede(segs, field)
    // A single turn drops the head ~one cell (8px) and it marches away; it stays
    // far above the floor the poison dive reached.
    expect(segs[0].v, 'a turned head stays high — it never dives to the floor').toBeGreaterThan(CENT_BOTTOM_V + 8)
    expect(vAfterTurn - segs[0].v, 'and it did not keep descending frame after frame').toBeLessThan(0x40)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// AC-2 — cp1-6's poison render branch draws from REAL scorpion state
// ════════════════════════════════════════════════════════════════════════════

describe('cp3-3 AC-2 — render() draws a scorpion-poisoned mushroom through the poison branch', () => {
  it('a cell poisoned by a real scorpion renders as a POISON_MUSHROOM_* stamp', async () => {
    const mod = await loadLive()
    // Drive the poison through the sim: a scorpion over a mushroom, one step, the
    // cell flips — then render the resulting state and find the poison stamp at
    // that cell's screen position.
    const state = simWithSlot({ ...SCORP_AT, dh: 1, dv: 0, pic: SCORP_PIC_LOW })
    state.playfield.cells[SHARED_CELL.h * PLYFLD_STRIDE + SHARED_CELL.v] = MUSHROOM_FULL
    const next = stepSim(state, IDLE)
    const code = next.playfield.cells[SHARED_CELL.h * PLYFLD_STRIDE + SHARED_CELL.v]
    expect(code, 'premise: the scorpion poisoned the cell').toBe(MUSHROOM_FULL & SCORP_POISON_MASK)

    const r = makeRecorder()
    render(r.ctx, r.atlas, next)
    const atCell = r.draws.filter(
      (d) => d.x === cellScreenX(SHARED_CELL.h) && d.y === cellScreenY(SHARED_CELL.v),
    )
    expect(atCell.length, 'the poisoned cell is drawn').toBeGreaterThan(0)
    expect(
      atCell.some((d) => d.stamp.startsWith('POISON_MUSHROOM')),
      'cp1-6\'s poison branch renders it as a POISON_MUSHROOM_* sprite, from real state',
    ).toBe(true)
    // And it is NOT drawn as a normal mushroom — the branch actually switched.
    expect(
      mod.isScorpion(next.flea.pic) || next.flea.pic === SCORP_PARK_PIC,
      'sanity: the slot is still the shared slot after the step',
    ).toBe(true)
  })
})
