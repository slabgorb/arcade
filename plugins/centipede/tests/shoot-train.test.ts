// tests/shoot-train.test.ts
//
// Story cp2-4 — RED phase (O'Brien / TEA). Shooting the train: the shot-vs-
// segment collision, the EXPLOD animation, the mushroom left in the killed cell,
// the NEWHD split (the segment behind the kill becomes a second head), and
// head/body segment scoring — all transcribed from rev-4 CENTI4.MAC and pinned
// by CT-32..CT-48 in docs/rom-study/claims/09-centipede-train.json.
//
// ─── QUARRY CORRECTION (Delivery Findings) ───────────────────────────────────────
// The shot-vs-segment collision is the SHOOT loop (CENTI4.MAC:2171-2303), NOT
// OVRLAP (CENTI4.MAC:1746 — the inter-segment overlap check called only from
// CENTPC:411 and MOTION:1371). The train SPLIT (slot X+1 promoted to a head,
// AND I,0BF / STA X,MOBJP+1 ;NEW HEAD at :2282-2283) is DISTINCT from the NEWHD
// routine (:1647), which spawns brand-new heads entering from the top edge.
//
// ─── THE MODEL (as cp2-3 built it) ───────────────────────────────────────────────
// A Segment is one motion-object slot. pic is the MOBJP byte: bit 6 (0x40) clear
// = HEAD (set = body), bit 5 (0x20) = poisoned head, bit 7 (0x80) = vacant /
// exploding. Positions are ROM pixel coords (V=0xF8 top, V=8 bottom). Slot order
// runs head (slot 0) -> tail (slot 11); slot i+1 trails slot i.
//
// ─── WHAT THE ACs PIN ────────────────────────────────────────────────────────────
// AC-1: every transcribed constant is radix-cited + has a claims entry; the
//       citation gate (tests/audit/citations.test.ts) stays green with CT-32..48.
// AC-2: killing a MID-train segment yields TWO independent trains — the segment
//       behind the gap (slot X+1) becomes a new head (CT-39/40); head kills score
//       100, body kills 10 (CT-35/36, rev-4 == CENTIP.DOC rev-1, open question 4);
//       overlaps resolve high-slot-first, deterministically (CT-32).
// AC-3: the killed cell gets a mushroom exactly where the ROM places one — the
//       OBSTAC cell one 8px step ahead in the travel direction (CALLS dir=+/-1,
//       CT-45/48) — full 0x3F, guarded against overwrite + reserved rows (CT-46),
//       bumping the lower-screen court count for row < 0x0C (CT-47); the one-shot
//       economy holds — only a LIVE shot hits and the hit CONSUMES it (CT-42).
// AC-4: the collision fires under MOTION from BOTH approach directions (shot
//       climbing into a segment marching left AND right) — never only stationary.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────────
// src/core/centipede.ts exists (cp2-3) but exports no combat surface. loadCombat()
// dynamic-imports it and throws a self-describing "not built yet" when the new
// exports (resolveShotHit / stepExplosions + the constants) are absent — so every
// combat test reddens for the FEATURE's absence, never a module-resolution trace.
// The dynamic import keeps this file tsc-clean at RED (no static import of a
// not-yet-existing named export — the cp2-7 build-break lesson).

import { describe, it, expect } from 'vitest'
import {
  createPlayfield,
  obstacleCellFor,
  PLYFLD_STRIDE,
  MUSHROOM_FULL, // 0x3F — a full mushroom (== the drop code, CT-46)
  MUSH_LOWER_BOUND, // 0x0C — the court-count boundary (CT-47)
  type Playfield,
} from '../src/core/playfield'
import { SHOT_SPEED } from '../src/core/player' // 7 px/frame (PS-14) — for the moving-shot sim

// ─── the ROM constants this story transcribes (claims 09, CT-32..48 — mirrored so
//     the expectations are self-checking, not echoes of the module) ───────────────
const SEG_HIT_H_WINDOW = 6 // CT-34 (CPY I,6, :2266) — hit needs |MOBJH-SHOTH| < 6
const SEG_HIT_V_WINDOW = 5 // CT-33 (CPY I,5, :2202) — hit needs |MOBJV-SHOTV| < 5
const SCORE_BODY = 10 // CT-35 (LDY I,10 BCD ;BODY=10 POINT, :2270)
const SCORE_HEAD = 100 // CT-36 (LDY I,0 + INC TEMP1 -> 0x0100 BCD, :2274-2275)
const EXPLOSION_PIC = 0xff // CT-41 (LDA I,0FF / STA MOBJP ;EXPLOSION PICTURE, :2301-2302)
const EXPLOSION_DONE = 0xf9 // CT-44 (finished exploding, < 0xFA, :967-968)
const BODY_BIT = 0x40 // CT-2/15 (bit 6; clear = head)
const POISON_BIT = 0x20 // CT-2/18 (bit 5)
const DEAD_BIT = 0x80 // CT-2/12 (bit 7; set = vacant/exploding)

// ─── the contract GREEN (Julia) implements (src/core/centipede.ts, cp2-4) ─────────

/** One centipede segment = one motion-object slot (cp2-3 shape). */
interface Segment {
  h: number
  v: number
  dh: number
  dv: number
  pic: number
  turning?: boolean
}

/** The single slot-14 shot (cp1-5 player.ts shape). */
interface Shot {
  h: number
  v: number
  live: boolean
}

/** resolveShotHit's result: a fresh segment array (killed slot -> 0xFF, the split
 *  promotion applied), the (consumed-on-hit) shot, the score, and which slot was
 *  killed (-1 on a miss). The field is mutated in place for the mushroom drop
 *  (cp1-5's mutate-the-field convention). */
interface ShotHit {
  segs: Segment[]
  shot: Shot
  scored: number
  hitIndex: number
}

interface CombatModule {
  SEG_HIT_H_WINDOW: number
  SEG_HIT_V_WINDOW: number
  SCORE_BODY: number
  SCORE_HEAD: number
  EXPLOSION_PIC: number
  EXPLOSION_DONE: number
  createCentipede: () => Segment[]
  /** SHOOT's shot-vs-segment collision (CENTI4.MAC:2171-2303): a LIVE shot within
   *  |dH|<6 and |dV|<5 of a live segment kills the HIGHEST such slot, scores it
   *  (head 100 / body 10), promotes the trailing slot to a new head (the split),
   *  drops a mushroom in its cell, sets the killed slot to 0xFF, and consumes the
   *  shot (live=false). A resting/miss shot and vacant/exploding segments are
   *  no-ops. */
  resolveShotHit: (shot: Shot, segs: Segment[], field: Playfield) => ShotHit
  /** EXPLOD (CENTI4.MAC:963-970): advance every exploding segment (pic >= 0xFA)
   *  one animation frame (pic-1), stopping at EXPLOSION_DONE (0xF9). Live segments
   *  and positions are untouched. */
  stepExplosions: (segs: Segment[]) => Segment[]
}

async function loadCombat(): Promise<CombatModule> {
  try {
    const mod = (await import('../src/core/centipede')) as Partial<CombatModule>
    if (typeof mod.resolveShotHit !== 'function' || typeof mod.stepExplosions !== 'function') {
      throw new Error('module has no `resolveShotHit` / `stepExplosions` export')
    }
    return mod as CombatModule
  } catch (e) {
    throw new Error(
      'shot-vs-train combat not built yet — GREEN (Julia) extends src/core/centipede.ts with ' +
        'resolveShotHit(shot, segs, field) (SHOOT collision, CENTI4.MAC:2171-2303: |dH|<6 & |dV|<5 ' +
        'windows, head=100/body=10 scoring, the slot-X+1 NEWHD split, the OBSTAC-cell mushroom drop, ' +
        'and 0xFF-on-kill) and stepExplosions(segs) (EXPLOD :963, 0xFF->0xF9), plus the constants ' +
        'SEG_HIT_H_WINDOW/SEG_HIT_V_WINDOW/SCORE_BODY/SCORE_HEAD/EXPLOSION_PIC/EXPLOSION_DONE. ' +
        'Every constant is cited in docs/rom-study/claims/09-centipede-train.json (CT-32..CT-48). ' +
        `(${(e as Error).message})`,
    )
  }
}

// ─── helpers ─────────────────────────────────────────────────────────────────────
const isHead = (pic: number) => (pic & BODY_BIT) === 0 && (pic & DEAD_BIT) === 0
const isExploding = (pic: number) => pic >= EXPLOSION_PIC - 5 // 0xFA..0xFF are exploding frames

/** The exact cell the ROM drops a killed segment's mushroom into: OBSTAC one 8px
 *  cell ahead in the segment's travel direction (CALLS normalizes MOBJDH to
 *  +/-1, CT-45/48). obstacleCellFor is playfield.ts's shared routine. */
const dropCell = (seg: Segment) => obstacleCellFor(seg.h, seg.v, seg.dh >= 0 ? 1 : -1)
const offsetOf = (c: { h: number; v: number }) => c.h * PLYFLD_STRIDE + c.v

// cp2-5: createCentipede()'s wave-1 train enters at V=0xF8, which the story's
// new SHOT_TOP_SKIP guard (CT-69) now makes off-limits to SHOOT. These
// scoring/split fixtures aren't testing the entry row — re-seat the whole
// train below it (shape/h/dh/pic all preserved) so the collision logic under
// test is actually reached.
const belowTop = (segs: Segment[]): Segment[] => segs.map((s) => ({ ...s, v: s.v - 0x20 }))

describe('cp2-4 AC-1 — the transcribed combat constants (CT-32..48)', () => {
  it('exports the collision windows and scoring/explosion constants exactly', async () => {
    const m = await loadCombat()
    expect(m.SEG_HIT_H_WINDOW, 'H window |dH|<6 (CT-34)').toBe(SEG_HIT_H_WINDOW)
    expect(m.SEG_HIT_V_WINDOW, 'V window |dV|<5 (CT-33)').toBe(SEG_HIT_V_WINDOW)
    expect(m.SCORE_BODY, 'body = 10 (CT-35)').toBe(SCORE_BODY)
    expect(m.SCORE_HEAD, 'head = 100 (CT-36)').toBe(SCORE_HEAD)
    expect(m.EXPLOSION_PIC, 'kill picture 0xFF (CT-41)').toBe(EXPLOSION_PIC)
    expect(m.EXPLOSION_DONE, 'finished exploding 0xF9 (CT-44)').toBe(EXPLOSION_DONE)
  })

  it('the mushroom the kill drops is a FULL mushroom (0x3F == MUSHROOM_FULL, CT-46)', () => {
    expect(MUSHROOM_FULL).toBe(0x3f)
  })
})

describe('cp2-4 AC-2 — killing a mid-train segment splits it into TWO trains (CT-39/40)', () => {
  it('the segment BEHIND the gap becomes a new head; the front head survives', async () => {
    const m = await loadCombat()
    const segs = belowTop(m.createCentipede()) // 12-seg wave-1 train, head slot 0, re-seated below CT-69's top guard
    expect(segs.filter((s) => isHead(s.pic)).length, 'the wave-1 train starts with ONE head').toBe(1)

    const kill = 5 // a mid-train BODY slot
    expect(isHead(segs[kill].pic), 'slot 5 is a body, not a head').toBe(false)
    const trailingPicBefore = segs[kill + 1].pic
    const shot: Shot = { h: segs[kill].h, v: segs[kill].v, live: true }

    const res = m.resolveShotHit(shot, segs, createPlayfield())
    expect(res.hitIndex, 'the shot killed slot 5 (only slot in the H window)').toBe(kill)
    expect(res.segs[kill].pic, 'the killed segment becomes the 0xFF explosion picture (CT-41)').toBe(EXPLOSION_PIC)
    expect(isHead(res.segs[kill + 1].pic), 'the segment behind the gap is promoted to a HEAD (CT-39)').toBe(true)
    expect(res.segs[kill + 1].pic, 'promotion clears ONLY bit 6, keeping the low picture bits (AND 0xBF)').toBe(
      trailingPicBefore & ~BODY_BIT,
    )
    expect(isHead(res.segs[0].pic), 'the ORIGINAL head (slot 0) still leads the front train').toBe(true)
    const heads = res.segs.filter((s) => isHead(s.pic)).length
    expect(heads, 'one train became two — now exactly two heads').toBe(2)
  })

  it('killing the LAST slot promotes nothing (no segment behind it, CT-40)', async () => {
    const m = await loadCombat()
    const segs = belowTop(m.createCentipede())
    const last = segs.length - 1 // slot 11 (NCENT-1)
    const shot: Shot = { h: segs[last].h, v: segs[last].v, live: true }
    const res = m.resolveShotHit(shot, segs, createPlayfield())
    expect(res.hitIndex, 'the tail slot is killed').toBe(last)
    expect(res.segs[last].pic, 'killed -> 0xFF').toBe(EXPLOSION_PIC)
    // every surviving slot 0..last-1 keeps its original head/body role (no new head)
    const headsBefore = segs.slice(0, last).filter((s) => isHead(s.pic)).length
    const headsAfter = res.segs.slice(0, last).filter((s) => isHead(s.pic)).length
    expect(headsAfter, 'killing the tail spawns NO new head — still one train').toBe(headsBefore)
  })

  it('killing a segment whose trailing neighbour is already dead promotes nothing (CT-40)', async () => {
    const m = await loadCombat()
    // slot0 head, slot1 body (target), slot2 already vacant (bit 7 set)
    const segs: Segment[] = [
      { h: 0x60, v: 0x80, dh: 2, dv: 2, pic: 0x03 },
      { h: 0x58, v: 0x80, dh: 2, dv: 2, pic: 0x42 },
      { h: 0x50, v: 0x80, dh: 2, dv: 2, pic: DEAD_BIT }, // already dead
    ]
    const shot: Shot = { h: 0x58, v: 0x80, live: true }
    const res = m.resolveShotHit(shot, segs, createPlayfield())
    expect(res.hitIndex).toBe(1)
    expect(res.segs[2].pic, 'a dead trailing slot is NOT resurrected as a head').toBe(DEAD_BIT)
  })
})

describe('cp2-4 AC-2 — head vs body scoring, rev-4 code (== CENTIP.DOC rev-1, open Q4)', () => {
  it('a BODY kill scores 10 (CT-35)', async () => {
    const m = await loadCombat()
    const segs = belowTop(m.createCentipede())
    const kill = 5 // body
    const res = m.resolveShotHit({ h: segs[kill].h, v: segs[kill].v, live: true }, segs, createPlayfield())
    expect(res.hitIndex).toBe(kill)
    expect(res.scored, 'body segment = 10 points').toBe(SCORE_BODY)
  })

  it('a HEAD kill scores 100 (CT-36)', async () => {
    const m = await loadCombat()
    const segs = belowTop(m.createCentipede())
    const res = m.resolveShotHit({ h: segs[0].h, v: segs[0].v, live: true }, segs, createPlayfield())
    expect(res.hitIndex, 'slot 0 (the head) is killed').toBe(0)
    expect(res.scored, 'head segment = 100 points').toBe(SCORE_HEAD)
  })
})

describe('cp2-4 AC-2 — overlapping segments resolve deterministically (CT-32)', () => {
  it('among segments in the same window the HIGHEST slot index is killed (high->low scan)', async () => {
    const m = await loadCombat()
    // slots 1 and 2 stacked at the same pixel — the ROM scans 13..0 and kills the
    // first (highest-index) match, so slot 2 dies and slot 1 survives.
    const segs: Segment[] = [
      { h: 0x60, v: 0x80, dh: 2, dv: 2, pic: 0x03 },
      { h: 0x50, v: 0x80, dh: 2, dv: 2, pic: 0x42 },
      { h: 0x50, v: 0x80, dh: 2, dv: 2, pic: 0x47 },
    ]
    const res = m.resolveShotHit({ h: 0x50, v: 0x80, live: true }, segs, createPlayfield())
    expect(res.hitIndex, 'the higher slot (2) is killed, not slot 1').toBe(2)
    expect(res.segs[2].pic, 'slot 2 exploded').toBe(EXPLOSION_PIC)
    expect(res.segs[1].pic, 'slot 1 is untouched').toBe(0x42)
  })

  it('the kill is a pure function of (shot, segs, field) — repeatable', async () => {
    const m = await loadCombat()
    const build = (): Segment[] => m.createCentipede()
    const a = m.resolveShotHit({ h: build()[5].h, v: build()[5].v, live: true }, build(), createPlayfield())
    const b = m.resolveShotHit({ h: build()[5].h, v: build()[5].v, live: true }, build(), createPlayfield())
    expect(a.segs).toEqual(b.segs)
    expect(a.scored).toBe(b.scored)
    expect(a.hitIndex).toBe(b.hitIndex)
  })
})

describe('cp2-4 AC-3 — the killed cell gets a mushroom where the ROM places one (CT-45/46/47)', () => {
  it('drops a full 0x3F at the OBSTAC cell one step ahead in the travel direction', async () => {
    const m = await loadCombat()
    // a lone mid-screen right-marching body (row 0x10 -> upper screen, no court bump)
    const seg: Segment = { h: 0x60, v: 0x80, dh: 2, dv: 2, pic: 0x42 }
    const field = createPlayfield()
    const cell = dropCell(seg)
    const res = m.resolveShotHit({ h: seg.h, v: seg.v, live: true }, [seg], field)
    expect(res.hitIndex).toBe(0)
    expect(field.cells[offsetOf(cell)], 'a full mushroom lands in the killed cell (CT-46)').toBe(MUSHROOM_FULL)
    // nothing else on the board changed
    const nonzero = [...field.cells].filter((c) => c !== 0).length
    expect(nonzero, 'exactly one cell was written').toBe(1)
  })

  it('a drop on the LOWER screen (row < 0x0C) bumps the mushroom court count (CT-47)', async () => {
    const m = await loadCombat()
    const seg: Segment = { h: 0x60, v: 0x20, dh: 2, dv: 2, pic: 0x42 } // low V -> low row
    const field = createPlayfield()
    const cell = dropCell(seg)
    expect(cell.v, 'test precondition: the drop row is on the lower screen').toBeLessThan(MUSH_LOWER_BOUND)
    m.resolveShotHit({ h: seg.h, v: seg.v, live: true }, [seg], field)
    expect(field.cells[offsetOf(cell)]).toBe(MUSHROOM_FULL)
    expect(field.mush, 'the lower-screen court count rose by one').toBe(1)
  })

  it('does NOT overwrite a mushroom already in the killed cell (CT-46 guard)', async () => {
    const m = await loadCombat()
    const seg: Segment = { h: 0x60, v: 0x80, dh: 2, dv: 2, pic: 0x42 }
    const field = createPlayfield()
    const cell = dropCell(seg)
    field.cells[offsetOf(cell)] = 0x3c // a PARTIAL mushroom already there
    const mushBefore = field.mush
    m.resolveShotHit({ h: seg.h, v: seg.v, live: true }, [seg], field)
    expect(field.cells[offsetOf(cell)], 'the existing mushroom is left untouched, not bumped to 0x3F').toBe(0x3c)
    expect(field.mush, 'no double-count of the court').toBe(mushBefore)
  })

  it('refuses to drop on a reserved row (top row 0x1F, CT-46 guard)', async () => {
    const m = await loadCombat()
    // a segment at the very top (V=0xF8) -> OBSTAC row 0x1F (the score row): no drop.
    const seg: Segment = { h: 0x60, v: 0xf8, dh: 2, dv: 2, pic: 0x42 }
    const field = createPlayfield()
    const cell = dropCell(seg)
    expect(cell.v, 'test precondition: the drop lands on the reserved top row').toBe(0x1f)
    m.resolveShotHit({ h: seg.h, v: seg.v, live: true }, [seg], field)
    expect([...field.cells].every((c) => c === 0), 'the reserved-row drop is refused — board stays empty').toBe(true)
  })
})

describe('cp2-4 AC-3 — the one-shot economy holds (CT-42)', () => {
  it('a RESTING (dead) shot never hits a segment sitting on top of it', async () => {
    const m = await loadCombat()
    const segs = m.createCentipede()
    const rest: Shot = { h: segs[5].h, v: segs[5].v, live: false }
    const field = createPlayfield()
    const res = m.resolveShotHit(rest, segs, field)
    expect(res.hitIndex, 'a dead shot cannot kill').toBe(-1)
    expect(res.scored).toBe(0)
    expect(res.segs, 'the train is untouched').toEqual(segs)
    expect([...field.cells].every((c) => c === 0), 'no mushroom dropped').toBe(true)
  })

  it('a hit CONSUMES the shot (live -> false) — the player must re-arm before firing again', async () => {
    const m = await loadCombat()
    const segs = belowTop(m.createCentipede())
    const res = m.resolveShotHit({ h: segs[0].h, v: segs[0].v, live: true }, segs, createPlayfield())
    expect(res.hitIndex).toBe(0)
    expect(res.shot.live, 'the single shot is spent by the kill (RSHOT re-arm, CT-42)').toBe(false)
  })

  it('a LIVE shot that misses everything keeps flying and changes nothing', async () => {
    const m = await loadCombat()
    const segs = m.createCentipede()
    const far: Shot = { h: 0x08, v: 0x10, live: true } // nowhere near the V=0xF8 train
    const field = createPlayfield()
    const res = m.resolveShotHit(far, segs, field)
    expect(res.hitIndex).toBe(-1)
    expect(res.shot.live, 'a miss leaves the shot live').toBe(true)
    expect(res.segs).toEqual(segs)
  })

  it('an exploding / vacant segment (bit 7 set) is not a target — the shot passes over it', async () => {
    const m = await loadCombat()
    const segs: Segment[] = [
      { h: 0x60, v: 0x80, dh: 2, dv: 2, pic: EXPLOSION_PIC }, // already exploding
      { h: 0x50, v: 0x80, dh: 2, dv: 2, pic: DEAD_BIT }, // vacant
    ]
    const res = m.resolveShotHit({ h: 0x60, v: 0x80, live: true }, segs, createPlayfield())
    expect(res.hitIndex, 'neither a dead nor an exploding segment can be re-killed').toBe(-1)
  })
})

describe('cp2-4 AC-4 — the collision fires under MOTION, both approach directions', () => {
  // The shot climbs +7/frame up a fixed column; the segment marches +/-2/frame at a
  // fixed row. We cross them and assert a hit lands (the asteroids lesson: never
  // only stationary projectiles).
  const crossing = async (dh: number) => {
    const m = await loadCombat()
    const SHOT_COL = 0x60
    const SEG_ROW = 0x40
    // start the segment 16px on the approach side so it reaches SHOT_COL as the
    // shot climbs into SEG_ROW (~frame 8), and the shot starts well below.
    const seg: Segment = { h: SHOT_COL - Math.sign(dh) * 16, v: SEG_ROW, dh, dv: 2, pic: 0x42 }
    let shot: Shot = { h: SHOT_COL, v: 0x08, live: true }
    let cur = [seg]
    let hitFrame = -1
    for (let f = 0; f < 24 && shot.live; f++) {
      const res = m.resolveShotHit(shot, cur, createPlayfield())
      if (res.hitIndex >= 0) {
        hitFrame = f
        cur = res.segs
        shot = res.shot
        break
      }
      // advance both: shot up its column, segment along its row
      shot = { ...shot, v: shot.v + SHOT_SPEED }
      cur = [{ ...cur[0], h: cur[0].h + cur[0].dh }]
    }
    return { hitFrame, seg: cur[0] }
  }

  it('a segment marching RIGHT is hit by the climbing shot (dh > 0)', async () => {
    const { hitFrame, seg } = await crossing(+2)
    expect(hitFrame, 'the moving shot connected with the right-marching segment').toBeGreaterThanOrEqual(0)
    expect(seg.pic, 'the hit segment exploded').toBe(EXPLOSION_PIC)
  })

  it('a segment marching LEFT is hit by the climbing shot (dh < 0)', async () => {
    const { hitFrame, seg } = await crossing(-2)
    expect(hitFrame, 'the moving shot connected with the left-marching segment').toBeGreaterThanOrEqual(0)
    expect(seg.pic, 'the hit segment exploded').toBe(EXPLOSION_PIC)
  })

  it('the shot cannot tunnel a segment vertically: SHOT_SPEED < 2*V_WINDOW-1', async () => {
    const m = await loadCombat()
    // 7 < 2*5-1 = 9 — consecutive frames' V windows overlap, so a segment on the
    // shot's column is caught on at least one frame (the anti-tunnel invariant).
    expect(SHOT_SPEED).toBeLessThan(2 * m.SEG_HIT_V_WINDOW - 1)
  })
})

describe('cp2-4 — EXPLOD segment explosion animation (CT-43/44)', () => {
  it('a killed segment (0xFF) counts down one picture per frame, resting at 0xF9', async () => {
    const m = await loadCombat()
    let segs: Segment[] = [{ h: 0x60, v: 0x80, dh: 2, dv: 2, pic: EXPLOSION_PIC }]
    const seen: number[] = []
    for (let f = 0; f < 7; f++) {
      segs = m.stepExplosions(segs)
      seen.push(segs[0].pic)
    }
    // 0xFF -> FE,FD,FC,FB,FA,F9 (6 frames), then rests at F9 (finished, CT-44)
    expect(seen).toEqual([0xfe, 0xfd, 0xfc, 0xfb, 0xfa, EXPLOSION_DONE, EXPLOSION_DONE])
    expect(segs[0].h, 'the explosion does not move the segment').toBe(0x60)
    expect(segs[0].v).toBe(0x80)
  })

  it('a live segment (pic < 0xFA) is not touched by stepExplosions', async () => {
    const m = await loadCombat()
    const live: Segment[] = [
      { h: 0x60, v: 0x80, dh: 2, dv: 2, pic: 0x03 }, // head
      { h: 0x58, v: 0x80, dh: 2, dv: 2, pic: 0x42 }, // body
      { h: 0x50, v: 0x80, dh: 2, dv: 2, pic: 0x42 | POISON_BIT }, // poisoned-ish body
    ]
    const after = m.stepExplosions(live)
    expect(after.map((s) => s.pic), 'live pictures are unchanged').toEqual([0x03, 0x42, 0x42 | POISON_BIT])
  })

  it('EXPLOSION_PIC and EXPLOSION_DONE bracket exactly the 6 exploding frames', async () => {
    const m = await loadCombat()
    expect(isExploding(m.EXPLOSION_PIC), '0xFF is an exploding frame').toBe(true)
    expect(m.EXPLOSION_PIC - m.EXPLOSION_DONE, '0xFF down to 0xFA is 6 frames, resting at 0xF9').toBe(6)
  })
})
