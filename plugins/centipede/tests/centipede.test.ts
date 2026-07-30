// tests/centipede.test.ts
//
// Story cp2-3 — RED phase (O'Brien / TEA). The centipede train: CENTPC init
// (CENTI4.MAC:456) + MOTION per-frame stepping (CENTI4.MAC:1277), transcribed
// from rev-4 and pinned by CT-1..CT-26 in docs/rom-study/claims/09-centipede-train.json.
//
// ─── THE MODEL ───────────────────────────────────────────────────────────────────
// A segment is one motion-object slot (glossary: slots 0-11 = the 12 segments,
// NCENT=12. CENTI4.MAC/CENDE4.MAC:119). Positions are ROM pixel coords: V=0xF8 is
// the TOP of the screen and V=8 the bottom player row (V DECREASES downward, so a
// positive dv DESCENDS — CT-14, upright SBC MOBJDV). pic is the MOBJP byte:
//   bit 6 (0x40) clear = HEAD, set = body     (CT-2/15, CENDE4.MAC:132)
//   bit 5 (0x20) set   = POISONED head        (CT-2/18)
//   bit 7 (0x80) set   = vacant / exploding    (CT-2/12)
//
// ─── WHAT THE ACs PIN ────────────────────────────────────────────────────────────
// AC-2: createCentipede lays 12 segments across the TOP (CT-3..CT-9); MOTION
//       marches them horizontally (H += dh, CT-13) and, on a mushroom or field
//       edge, drops a row and reverses (CT-17/20/21) — deterministic, seed-free.
// AC-3: a poisoned mushroom (field code 0x38-0x3B, CT-17/18) sets the head poison
//       bit and the head DIVES to the bottom zone (CT-19), debug-seeded (no scorpion
//       until cp3).
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────────
// src/core/centipede.ts does not exist. loadCentipede() dynamic-imports it and
// throws a self-describing "not built yet" so every train test reddens for the
// FEATURE's absence, never a module-resolution stack trace. playfield.ts (cp1-4)
// exists and supplies the grid + mushroom codes.

import { describe, it, expect } from 'vitest'
import {
  createPlayfield,
  PLYFLD_STRIDE,
  MUSHROOM_FULL, // 0x3F — a full NORMAL mushroom (band 0x3C-0x3F, CT-17)
  type Playfield,
} from '../src/core/playfield'

// ─── the ROM constants this story transcribes (claims 09 — hand-mirrored so the
//     expectations are self-checking, not echoes of the module) ─────────────────
const NCENT = 12 // CT-1 (NCENT =12. decimal)
const CENT_HEAD_PIC = 0x03 // CT-3
const CENT_ENTER_V = 0xf8 // CT-4 (top of screen)
const CENT_ENTER_H = 0x80 // CT-5 (centre)
const CENT_SEG_SPACING = 8 // CT-7
const BODY_BIT = 0x40 // CT-2/15 (bit 6; clear = head)
const POISON_BIT = 0x20 // CT-2/18 (bit 5)
const DEAD_BIT = 0x80 // CT-2/12 (bit 7)

// A poisoned mushroom on the field is coded 0x38-0x3B (CT-17/18). A full poisoned
// mushroom is 0x3B (cp1-6 mushroomStamp: 0x3B -> POISON_MUSHROOM_FULL; cp1-4 poison
// band, POISON_DESTROY 0x37). NORMAL full is MUSHROOM_FULL=0x3F.
const POISON_FULL = 0x3b

// ─── the contract GREEN (Julia) implements (src/core/centipede.ts) ───────────────

/** One centipede segment = one motion-object slot. */
interface Segment {
  h: number // MOBJH pixel
  v: number // MOBJV pixel (0xF8 top -> 8 bottom)
  dh: number // MOBJDH signed horizontal step (H += dh each frame)
  dv: number // MOBJDV signed vertical step (>0 descends, applied on turns/dive)
  pic: number // MOBJP picture/flags byte
}

interface CentipedeModule {
  NCENT: number
  CENT_HEAD_PIC: number
  CENT_ENTER_V: number
  CENT_ENTER_H: number
  CENT_SEG_SPACING: number
  BODY_BIT: number
  POISON_BIT: number
  DEAD_BIT: number
  /** CENTPC (CENTI4.MAC:456): the wave-1 train — 12 segments across the top,
   *  head at (0x80,0xF8), bodies spaced 8px behind, all the same heading, all
   *  alive. Seed-free (RNGEN is only touched on the non-wave-1 extra-centipede
   *  path, skipped when the count is the full NCENT). */
  createCentipede: () => Segment[]
  /** MOTION (CENTI4.MAC:1277): step every live segment one frame — horizontal
   *  march, row-drop + reverse on a mushroom/edge, the poisoned-head dive, and
   *  body-follows-head. Returns a fresh array; reads the playfield via OBSTAC. */
  stepCentipede: (segs: Segment[], field: Playfield) => Segment[]
}

async function loadCentipede(): Promise<CentipedeModule> {
  try {
    const mod = (await import('../src/core/centipede')) as Partial<CentipedeModule>
    if (typeof mod.createCentipede !== 'function' || typeof mod.stepCentipede !== 'function') {
      throw new Error('module has no `createCentipede` / `stepCentipede` export')
    }
    return mod as CentipedeModule
  } catch (e) {
    throw new Error(
      'centipede train core not built yet — GREEN (Julia) creates src/core/centipede.ts ' +
        'exporting the constants above + createCentipede() (CENTPC init) and ' +
        'stepCentipede(segs, field) (MOTION one frame). Every constant is transcribed from ' +
        'rev-4 CENTI4.MAC and cited in docs/rom-study/claims/09-centipede-train.json (CT-*). ' +
        'MOTION consumes the shared OBSTAC (obstacleCode) from playfield.ts (CT-16/28). ' +
        `(${(e as Error).message})`,
    )
  }
}

// ─── helpers ─────────────────────────────────────────────────────────────────────
const isHead = (pic: number) => (pic & BODY_BIT) === 0 && (pic & DEAD_BIT) === 0
const isPoisoned = (pic: number) => (pic & POISON_BIT) !== 0

/** The OBSTAC grid cell for a pixel (h,v) at direction 0 (col=(0xF7-h)>>3, row=(v+4)>>3). */
const cellOf = (h: number, v: number) => ({ col: (0xf7 - h) >> 3, row: (v + 4) >> 3 })

/** Plant `code` at the two cells one and two columns AHEAD of a right-marching
 *  head at (h,v) — covers OBSTAC probing at dir=+1 or +2 (last-head speed-up), so
 *  the test does not depend on the exact centipede speed. */
function plantAhead(field: Playfield, h: number, v: number, code: number): void {
  const { col, row } = cellOf(h, v)
  for (const c of [col - 1, col - 2]) {
    if (c >= 0) field.cells[c * PLYFLD_STRIDE + row] = code
  }
}

/** Run stepCentipede `n` times, returning [finalSegs, minVPerSlot, everCells]. */
function run(
  mod: CentipedeModule,
  segs: Segment[],
  field: Playfield,
  n: number,
): { segs: Segment[]; minV: number[]; occupied: Set<string> } {
  const minV = segs.map((s) => s.v)
  const occupied = new Set<string>()
  let cur = segs
  for (let f = 0; f < n; f++) {
    cur = mod.stepCentipede(cur, field)
    cur.forEach((s, i) => {
      if (s.v < minV[i]) minV[i] = s.v
      const { col, row } = cellOf(s.h, s.v)
      occupied.add(`${col},${row}`)
    })
  }
  return { segs: cur, minV, occupied }
}

describe('cp2-3 CENTPC — the wave-1 train enters (AC-2)', () => {
  it('lays down exactly NCENT (12) segments', async () => {
    const { createCentipede, NCENT: n } = await loadCentipede()
    expect(n).toBe(NCENT)
    expect(createCentipede()).toHaveLength(NCENT)
  })

  it('exports the CENTPC constants exactly as transcribed (CT-1/3/4/5/7 + CT-2 bits)', async () => {
    const m = await loadCentipede()
    expect(m.CENT_HEAD_PIC).toBe(CENT_HEAD_PIC)
    expect(m.CENT_ENTER_V).toBe(CENT_ENTER_V)
    expect(m.CENT_ENTER_H).toBe(CENT_ENTER_H)
    expect(m.CENT_SEG_SPACING).toBe(CENT_SEG_SPACING)
    expect(m.BODY_BIT).toBe(BODY_BIT)
    expect(m.POISON_BIT).toBe(POISON_BIT)
    expect(m.DEAD_BIT).toBe(DEAD_BIT)
  })

  it('the head is slot 0 at (0x80, 0xF8), the only bit-6-clear segment', async () => {
    const { createCentipede } = await loadCentipede()
    const segs = createCentipede()
    expect(segs[0].h, 'head enters at HPOS 0x80 (CT-5)').toBe(CENT_ENTER_H)
    expect(segs[0].v, 'head enters at VPOS 0xF8 (CT-4)').toBe(CENT_ENTER_V)
    expect(isHead(segs[0].pic), 'slot 0 is a head (bit 6 clear, CT-2/15)').toBe(true)
    const heads = segs.filter((s) => isHead(s.pic))
    expect(heads.length, 'the wave-1 train has exactly one head — the rest are body').toBe(1)
  })

  it('all 12 segments enter along the top row (V=0xF8), spaced 8px apart, alive (CT-4/7/9)', async () => {
    const { createCentipede } = await loadCentipede()
    const segs = createCentipede()
    for (const s of segs) {
      expect(s.v, 'the whole train enters along the top row').toBe(CENT_ENTER_V)
      expect((s.pic & DEAD_BIT) === 0, 'every segment is alive at wave start (DEAD=NCENT, CT-9)').toBe(true)
    }
    // consecutive segments are one 8px cell apart, all the same direction (CT-7/8)
    for (let i = 1; i < segs.length; i++) {
      expect(Math.abs(segs[i].h - segs[i - 1].h), `slot ${i} is 8px from slot ${i - 1}`).toBe(CENT_SEG_SPACING)
    }
    const sign = Math.sign(segs[1].h - segs[0].h)
    for (let i = 1; i < segs.length; i++) {
      expect(Math.sign(segs[i].h - segs[i - 1].h), 'the train trails in one consistent direction').toBe(sign)
    }
    // bodies carry the head's heading (CT-8)
    for (const s of segs) expect(s.dh).toBe(segs[0].dh)
  })
})

describe('cp2-3 MOTION — horizontal march (CT-11/13)', () => {
  it('marches every segment by dh each frame with V unchanged (no descent on a clear field)', async () => {
    const mod = await loadCentipede()
    const segs = mod.createCentipede()
    const dh = segs[0].dh
    const start = segs.map((s) => ({ h: s.h, v: s.v }))
    const N = 20 // small enough that no segment reaches a field edge
    const { segs: after } = run(mod, segs, createPlayfield(), N)
    after.forEach((s, i) => {
      expect(s.v, `slot ${i} does not descend on a clear top-row march`).toBe(start[i].v)
      expect(s.h, `slot ${i} advanced by dh*N horizontally`).toBe(start[i].h + dh * N)
    })
  })
})

describe('cp2-3 MOTION — a mushroom / edge drops a row and reverses (AC-2, CT-16/17/20/21)', () => {
  it('a NORMAL mushroom ahead makes the head reverse and drop a row — without entering the cell', async () => {
    const mod = await loadCentipede()
    // A lone right-marching head at the top, a normal mushroom in its path.
    const head: Segment = { h: CENT_ENTER_H, v: CENT_ENTER_V, dh: 1, dv: 1, pic: CENT_HEAD_PIC }
    const field = createPlayfield()
    plantAhead(field, head.h, head.v, MUSHROOM_FULL)
    const planted = [cellOf(head.h - CENT_SEG_SPACING, head.v), cellOf(head.h - 2 * CENT_SEG_SPACING, head.v)].map(
      (c) => `${c.col},${c.row}`,
    )

    const { segs: after, minV, occupied } = run(mod, [head], field, 40)
    expect(Math.sign(after[0].dh), 'the head reversed horizontal direction (CT-20)').toBe(-Math.sign(head.dh))
    expect(minV[0], 'the head dropped at least one row (descended, CT-14)').toBeLessThan(CENT_ENTER_V)
    expect(isPoisoned(after[0].pic), 'a NORMAL mushroom does NOT poison the head').toBe(false)
    for (const cell of planted) {
      expect(occupied.has(cell), `the head turned BEFORE the mushroom cell ${cell} (OBSTAC looks ahead, CT-28)`).toBe(
        false,
      )
    }
  })

  it('the field EDGE also drops a row and reverses (CT-17 edge branch)', async () => {
    const mod = await loadCentipede()
    // Head marching toward the 0xF0 ("left") edge on an EMPTY field.
    const head: Segment = { h: 0xea, v: CENT_ENTER_V, dh: 1, dv: 1, pic: CENT_HEAD_PIC }
    const { segs: after, minV } = run(mod, [head], createPlayfield(), 40)
    expect(Math.sign(after[0].dh), 'reversed at the edge').toBe(-Math.sign(head.dh))
    expect(minV[0], 'descended a row at the edge').toBeLessThan(CENT_ENTER_V)
    expect(after[0].h, 'never marched off the 0xF0 edge').toBeLessThanOrEqual(0xf0 + CENT_SEG_SPACING)
  })
})

describe('cp2-3 MOTION — the poisoned-head DIVE (AC-3, CT-18/19), debug-seeded', () => {
  it('a POISON mushroom sets the head poison bit and it plunges to the bottom zone', async () => {
    const mod = await loadCentipede()
    // Mid-screen so the dive has a full plunge to observe.
    const head: Segment = { h: CENT_ENTER_H, v: 0x80, dh: 1, dv: 1, pic: CENT_HEAD_PIC }
    const field = createPlayfield()
    plantAhead(field, head.h, head.v, POISON_FULL) // 0x3B poison, NOT 0x3F normal

    // one step: the head reads the poison ahead and is marked poisoned (CT-18)
    const afterOne = mod.stepCentipede([head], field)
    expect(isPoisoned(afterOne[0].pic), 'stepping onto a poison mushroom sets the poison bit (0x20)').toBe(true)

    // subsequent steps: it dives to the bottom (CT-19) — min V reaches the bottom zone
    const { minV } = run(mod, [head], field, 200)
    expect(minV[0], 'the poisoned head plunges to the bottom zone (V near 8)').toBeLessThanOrEqual(0x10)
  })

  it('a NORMAL mushroom in the SAME spot does NOT dive — it only drops one row (the contrast)', async () => {
    const mod = await loadCentipede()
    const head: Segment = { h: CENT_ENTER_H, v: 0x80, dh: 1, dv: 1, pic: CENT_HEAD_PIC }
    const field = createPlayfield()
    plantAhead(field, head.h, head.v, MUSHROOM_FULL) // 0x3F normal

    const { segs: after, minV } = run(mod, [head], field, 200)
    expect(isPoisoned(after[0].pic), 'a normal mushroom never poisons').toBe(false)
    expect(minV[0], 'a normal mushroom head stays near the top — it does NOT dive').toBeGreaterThan(0x40)
  })
})

describe('cp2-3 MOTION — the body follows the head (CT-22)', () => {
  it('a body a full cell BEHIND its leader in V descends to follow', async () => {
    const mod = await loadCentipede()
    // slot 0 head one row down (V=0xF0); slot 1 body still at the top (V=0xF8) -> |dV|=8
    const segs: Segment[] = [
      { h: CENT_ENTER_H, v: 0xf0, dh: 1, dv: 1, pic: CENT_HEAD_PIC },
      { h: CENT_ENTER_H - CENT_SEG_SPACING, v: CENT_ENTER_V, dh: 1, dv: 1, pic: CENT_HEAD_PIC | BODY_BIT },
    ]
    const { segs: after } = run(mod, segs, createPlayfield(), 10)
    expect(after[1].v, 'the trailing body descends to follow the leader (|dV|>=8, CT-22)').toBeLessThan(CENT_ENTER_V)
  })

  it('a body LEVEL with its leader (|dV|=0) marches flat — it does not descend', async () => {
    const mod = await loadCentipede()
    const segs: Segment[] = [
      { h: CENT_ENTER_H, v: CENT_ENTER_V, dh: 1, dv: 1, pic: CENT_HEAD_PIC },
      { h: CENT_ENTER_H - CENT_SEG_SPACING, v: CENT_ENTER_V, dh: 1, dv: 1, pic: CENT_HEAD_PIC | BODY_BIT },
    ]
    const { segs: after } = run(mod, segs, createPlayfield(), 10)
    expect(after[1].v, 'a body level with its leader marches horizontally, no descent').toBe(CENT_ENTER_V)
  })
})

describe('cp2-3 MOTION — vacant segments & determinism (AC-2)', () => {
  it('a vacant/exploding segment (bit 7 set) is skipped, not stepped (CT-12)', async () => {
    const mod = await loadCentipede()
    const dead: Segment = { h: CENT_ENTER_H, v: CENT_ENTER_V, dh: 1, dv: 1, pic: DEAD_BIT }
    const live: Segment = { h: CENT_ENTER_H, v: CENT_ENTER_V, dh: 1, dv: 1, pic: CENT_HEAD_PIC }
    const after = mod.stepCentipede([dead, live], createPlayfield())
    expect(after[0].h, 'a vacant segment is not moved').toBe(dead.h)
    expect(after[0].v, 'a vacant segment is not moved').toBe(dead.v)
    expect(after[1].h, 'the live head still marches').not.toBe(live.h)
  })

  it('is deterministic: same init + same field + same step count → identical segments', async () => {
    const mod = await loadCentipede()
    const field = () => {
      const f = createPlayfield()
      // a couple of mushrooms so the run actually turns
      f.cells[10 * PLYFLD_STRIDE + 20] = MUSHROOM_FULL
      f.cells[18 * PLYFLD_STRIDE + 24] = MUSHROOM_FULL
      return f
    }
    const a = run(mod, mod.createCentipede(), field(), 120).segs
    const b = run(mod, mod.createCentipede(), field(), 120).segs
    expect(a).toEqual(b)
  })

  it('createCentipede is a pure function — two calls are identical (seed-free wave-1 path)', async () => {
    const mod = await loadCentipede()
    expect(mod.createCentipede()).toEqual(mod.createCentipede())
  })
})
