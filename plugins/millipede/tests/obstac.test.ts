// tests/obstac.test.ts
//
// Story ml3-6 — RED phase (O'Brien / TEA). The FULL OBSTAC mover→playfield
// address derivation (the ml3-3 follow-up), plus wiring it into stepMillipede's
// MOTION collision. ml3-3 shipped only the OBSTAC *probe* (`obstacleAt`, a bare
// field[addr]&7F); the coordinate→address MATH was deferred on an unresolved
// "0x400 vs 0x800" base question (ml3-3 Delivery Findings). This session resolves
// that from primary source and pins the derivation with hand-derived fixtures.
//
// ─── THE BASE RECONCILIATION (resolved against primary source) ───────────────
// The story frames it as "0x400 (conway field base) vs 0x800 (MLSUB.MAC:886 exit
// comment)". BOTH are red herrings; the authoritative base is a THIRD value:
//
//     PLYFLD = 0x1000    (MLDEF.MAC:103  "PLYFLD =1000 ;30 WIDE BY 32 HIGH")
//
// and conway.ts:36 already commits to exactly that ("PLYFLD = $1000"). OBSTAC's
// own construction agrees: it loads PLYFLD/0x400 = 4 (:858 "LDA I,PLYFLD/400")
// into the high byte, then shifts the {high:low} pair left twice (×4, :873-876),
// so the base lands at 0x400×4 = 0x1000 — NOT 0x800. The ":886" exit comment
// "800+V/8+((F7-H')^F8)*4" is STALE (an earlier PLYFLD=0x800 build); the "(400-7BF)"
// in MLDEF.MAC:103 is the SCREEN-RAM mirror, not the logical field. conway.ts and
// OBSTAC share ONE base (0x1000) and ONE zero-based index: offset = col*0x20 + row.
//
// Because our field is a zero-based Uint8Array (base dropped, CW-11), `obstac`
// returns obstacleAt(field, absAddr - 0x1000) — equivalently the raw offset
//     offset = ((0xF7 - H') & 0xF8)*4 + V/8round      (before the wraps)
// Every expected offset below is therefore BASE-INDEPENDENT: it is exactly
// col*0x20 + row, and a fixture that plants an obstacle at that offset and reads
// it back through `obstac` fails loudly if GREEN subtracts 0x800 or 0x400 instead.
//
// ─── THE DERIVATION (MLSUB.MAC OBSTA0 :834-840, OBSTAC :853-889) ──────────────
//   dir  = MOBJDH < 0 ? -1 : +1           (:836-839 BMI → Y=-1 else Y=+1)
//   vpart= (V >> 3) + ((V & 4) ? 1 : 0)   V/8 with the "half way to next row"
//                                         ADC-carry round (:853-856 LSR×3 / ADC I,0)
//   H'   = (H + 8*dir) & 0xFF             (:860-866 TYA/ASL×3 = 8*dir, ADC TEMP1)
//   diff = 0xF7 - H'                      (:867-869 LDA I,0F7 / SEC / SBC TEMP1)
//   col8 = diff < 0 ? 0 : (diff & 0xF8)   left-margin clamp on borrow (:870-872
//                                         BCS → keep, else LDA I,0 "USE LEFT MARGIN")
//   abs  = 0x1000 + col8*4 + vpart        (:873-877 ×4 into {OBST+1:A}, ORA OBST)
//   RIGHT-EDGE WRAP (:879-884): if abs >= PLYFLD+0x3C0 (= 0x13C0, i.e. high byte
//     0x13 AND low >= 0xC0) then low = (low & 0x1F) | 0xA0 (folds off-field col 30
//     back onto col 29, same row).
//   offset = abs - 0x1000 ; return field[offset] & 0x7F   (:887-888)
//
// Every expected value is hand-derived from the cited 6502 this session and
// cross-checked against reference/original-source/millipede/MLSUB.MAC.
//
// ─── WHAT GREEN (Dev) MUST SHIP ──────────────────────────────────────────────
//   1. src/core/mushroom.ts — a new PURE export (the ml1-1 purity sweep scans it):
//        obstac(field: Uint8Array, mover: { h: number; v: number; dh: number }): number
//      Derives the playfield offset per the ROM above and returns
//      obstacleAt(field, offset) — the low-7-bit picture code, 0 == no obstacle.
//      Reuse conway.ts's geometry (offset = col*0x20 + row); do NOT fork a base.
//   2. src/core/millipede.ts — wire it into stepMillipede's MOTION head turn
//      (MILLI.MAC:1527 "12$: JSR OBSTA0 / BEQ 13$"). A live HEAD whose cell-ahead
//      obstac is an obstacle reacts per the ROM band table (:1528-1539):
//        0                     → no obstacle: coast (BEQ 13$)
//        0x01..0x2D            → TURN (< CLOUD, :1529-1530)
//        0x2E..0x6D  [CLOUD..DDT) → PASS THROUGH: coast (:1531-1532 "GO THRU DDT CLOUDS")
//        0x6E..0x77            → TURN (:1533-1534)
//        0x78..0x7B  (poison)  → SET HEAD POISONED (color = POISON_COLOR 0x1B) and TURN
//                                (:1535-1539 "LDA I,1B / STA MOBJC")
//        0x7C..0x7F            → TURN (:1535-1536 BCS)
//      "TURN" == the same descend-a-row seam an edge turn already routes to
//      (15$ is the shared target of both the edge path and the obstacle path).
//      stepMillipede gains an OPTIONAL 3rd `field` arg so the six existing
//      free-space callers (ml3-1) keep compiling and behaving as before.
//
// ─── SCOPE / DEFERRED (see session Delivery Findings) ────────────────────────
//   • MOTION only. EXPLOD (MILLI.MAC:763-838) has NO OBSTAC call — the story
//     title's "MOTION/EXPLOD" is loose; the field-removing OBSTAC (:2447 "REMOVE
//     OBSTACLE") is SHOOT2's, a shooting-story seam, not EXPLOD.
//   • The obstacle turn is wired at the HEAD seam (mirroring the head-only edge
//     turn in the current model); body segments still follow via BODY_FOLLOW_GAP.
//   • The bestiary movers (bee/dragonfly/mosquito/spider/beetle/earwig/inchworm)
//     have their own already-stubbed OBSTAC seams — separate stories.

import { describe, it, expect } from 'vitest'

// ─── mushroom module (obstac lives here, beside the ml3-3 obstacleAt probe) ──
interface MushroomModule {
  obstac: (field: Uint8Array, mover: { h: number; v: number; dh: number }) => number
  obstacleAt: (field: Uint8Array, addr: number) => number
}

// COMPUTED specifier (the conway.test.ts / mushroom.test.ts pattern): tsc cannot
// resolve it, so the RED tree stays lint-clean even though `obstac` does not exist
// yet; vitest resolves it at runtime relative to this file.
const MUSHROOM_SPECIFIER = ['..', 'src', 'core', 'mushroom'].join('/')

async function loadObstac(): Promise<MushroomModule> {
  try {
    const mod = (await import(/* @vite-ignore */ MUSHROOM_SPECIFIER)) as Partial<MushroomModule>
    if (typeof mod.obstac !== 'function') throw new Error('module has no obstac export')
    if (typeof mod.obstacleAt !== 'function') throw new Error('module has no obstacleAt export')
    return mod as MushroomModule
  } catch (e) {
    throw new Error(
      'src/core/mushroom.ts has no obstac() yet — GREEN (Dev) ports the full OBSTAC ' +
        'mover→address derivation (MLSUB.MAC OBSTA0 :834-840, OBSTAC :853-889) over ' +
        `conway.ts's 0x1000-based, zero-indexed field: ${e instanceof Error ? e.message : String(e)}`,
    )
  }
}

// ─── millipede module (stepMillipede gains the optional field arg) ───────────
interface Segment {
  h: number
  v: number
  dh: number
  dv: number
  pic: number
  color: number
}
interface MillipedeModule {
  // NOTE: the new OPTIONAL 3rd arg. The real source is still (segs, frame) — this
  // interface pins the target signature so lint passes; runtime RED is that the
  // real stepMillipede ignores arg 3 (heads never turn on a mushroom).
  stepMillipede: (segs: Segment[], frame: number, field?: Uint8Array) => Segment[]
  HEAD_PIC: number
  HEAD_COLOR: number
  POISON_COLOR: number
}
const MILLIPEDE_SPECIFIER = ['..', 'src', 'core', 'millipede'].join('/')
async function loadMillipede(): Promise<MillipedeModule> {
  const mod = (await import(/* @vite-ignore */ MILLIPEDE_SPECIFIER)) as Partial<MillipedeModule>
  if (typeof mod.stepMillipede !== 'function') throw new Error('millipede.ts has no stepMillipede')
  return mod as MillipedeModule
}

// ─── field geometry (per CW-11; no game logic reimplemented here) ────────────
const STRIDE = 0x20
const SIZE = 0x3c0
const idx = (col: number, row: number) => col * STRIDE + row
const emptyField = () => new Uint8Array(SIZE)

const FULL_MUSHROOM = 0x7f // MLSUB.MAC:741
const ROCK = 0x70 // MLDEF.MAC:204
const POISON = 0x78 // MLDEF.MAC:207
const BG = 0x80 // MLDEF.MAC:411 grey-background bit

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 — the NON-WRAPPING fixture. A mid-field mover, dir +1, no rounding.
//   {h:0x77, v:0x50, dh:+1} : dir +1, H'=0x7F, diff=0x78, col8=0x78 (col 15),
//   vpart = 0x50>>3 = 10 (0x50&4 == 0, no round). offset = 0x78*4 + 10 = idx(15,10).
// ═════════════════════════════════════════════════════════════════════════════
describe('ml3-6 AC-1 — OBSTAC non-wrapping derivation (MLSUB.MAC:853-877)', () => {
  const mover = { h: 0x77, v: 0x50, dh: 1 }
  const OFFSET = idx(15, 10) // 0x1EA

  it('reads the obstacle at the derived cell (col 15, row 10 = offset 0x1EA)', async () => {
    const m = await loadObstac()
    const field = emptyField()
    field[OFFSET] = FULL_MUSHROOM
    expect(m.obstac(field, mover)).toBe(FULL_MUSHROOM) // 0x7F — obstacle present
  })

  it('returns 0 when that derived cell is empty (ROM Z=1, no obstacle)', async () => {
    const m = await loadObstac()
    expect(m.obstac(emptyField(), mover)).toBe(0)
  })

  it('derives EXACTLY offset 0x1EA — an obstacle one cell away is NOT seen', async () => {
    const m = await loadObstac()
    const field = emptyField()
    field[OFFSET + 1] = FULL_MUSHROOM // col 15, row 11 — the wrong cell
    field[OFFSET - STRIDE] = FULL_MUSHROOM // col 14, row 10 — the wrong cell
    expect(m.obstac(field, mover), 'derivation must hit 0x1EA, not a neighbour').toBe(0)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-2 — the LEFT-MARGIN fixture (:870-872). H' > 0xF7 borrows → "USE LEFT MARGIN"
//   (col8 forced to 0), so the mover reads column 0.
//   {h:0xF0, v:0x28, dh:+1} : H' = 0xF0+8 = 0xF8, diff = 0xF7-0xF8 → borrow →
//   col8 = 0. vpart = 0x28>>3 = 5. offset = idx(0,5) = 5.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml3-6 AC-2 — OBSTAC left-margin wrap (MLSUB.MAC:870-872 "USE LEFT MARGIN")', () => {
  const mover = { h: 0xf0, v: 0x28, dh: 1 }
  const OFFSET = idx(0, 5) // 0x05

  it('clamps to column 0, row 5 (offset 0x05) when H+8 overshoots 0xF7', async () => {
    const m = await loadObstac()
    const field = emptyField()
    field[OFFSET] = ROCK
    expect(m.obstac(field, mover)).toBe(ROCK) // 0x70
  })

  it('does NOT read some high column (the borrow must fold to the left margin)', async () => {
    const m = await loadObstac()
    const field = emptyField()
    // If GREEN forgets the borrow clamp, (0xF7-0xF8)&0xF8 = 0xFF&0xF8 = 0xF8 → a
    // huge col. Plant a full field EXCEPT the left margin; only the clamp reads 0.
    field.fill(FULL_MUSHROOM)
    field[OFFSET] = 0
    expect(m.obstac(field, mover), 'the left-margin cell is empty → 0').toBe(0)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-3 — the RIGHT-EDGE wrap fixture (:879-884). col8 = 0xF0 is column 30, one
//   past the 30-wide field (cols 0..29). The ROM folds it: low = (low&0x1F)|0xA0,
//   remapping col 30 → col 29 at the same row.
//   {h:0xF8, v:0x18, dh:+1} : H' = (0xF8+8)&0xFF = 0x00, diff = 0xF7, col8 = 0xF0.
//   vpart = 0x18>>3 = 3. abs = 0x1000+0xF0*4+3 = 0x13C3 (high 0x13, low 0xC3>=0xC0)
//   → wrap → low = 0xA3 → abs 0x13A3 → offset 0x3A3 = idx(29,3).
// ═════════════════════════════════════════════════════════════════════════════
describe('ml3-6 AC-3 — OBSTAC right-edge wrap (MLSUB.MAC:879-884, PLYFLD+3C0)', () => {
  const mover = { h: 0xf8, v: 0x18, dh: 1 }
  const OFFSET = idx(29, 3) // 0x3A3

  it('folds off-field column 30 back onto column 29, same row (offset 0x3A3)', async () => {
    const m = await loadObstac()
    const field = emptyField()
    field[OFFSET] = FULL_MUSHROOM
    expect(m.obstac(field, mover)).toBe(FULL_MUSHROOM)
  })

  it('the folded offset (0x3A3) is inside the field bound (< 0x3C0)', async () => {
    const m = await loadObstac()
    const field = emptyField()
    field[OFFSET] = ROCK
    // A dev who skips the wrap computes offset 0x3C3 (out of bounds → typed-array
    // read is 0). The wrap is what puts a real obstacle under the mover.
    expect(m.obstac(field, mover), 'without the wrap this reads OOB → 0').toBe(ROCK)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-4 — DIRECTION sign (:836-839, :860-866). H' = H + 8*dir; dir is the SIGN of
//   MOBJDH. A left-mover (dh < 0) looks 8px the OTHER way.
//   {h:0x80, v:0x50, dh:-1} : dir -1, H' = 0x80-8 = 0x78, diff = 0x7F, col8 = 0x78
//   (col 15). Same cell as AC-1's right-mover — but reached from the opposite side.
//   A dev who ignores the sign computes H'=0x88 → col 13 → the WRONG cell.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml3-6 AC-4 — OBSTAC honours the MOBJDH sign (MLSUB.MAC:836-839)', () => {
  it('a left-mover (dh<0) looks 8px LEFT: {0x80,0x50,-1} → col 15, row 10', async () => {
    const m = await loadObstac()
    const field = emptyField()
    field[idx(15, 10)] = FULL_MUSHROOM
    expect(m.obstac(field, { h: 0x80, v: 0x50, dh: -1 })).toBe(FULL_MUSHROOM)
  })

  it('the sign discriminates: the same H with dh>0 reads a DIFFERENT cell (col 13)', async () => {
    const m = await loadObstac()
    const field = emptyField()
    field[idx(15, 10)] = FULL_MUSHROOM // only the left-mover's cell is planted
    // dh>0 → H'=0x88 → col 13 → offset idx(13,10), which is empty → 0.
    expect(m.obstac(field, { h: 0x80, v: 0x50, dh: 1 })).toBe(0)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-5 — the "half way to next row" ADC-carry round (:853-856). Three LSRs leave
//   bit 2 of V in carry; ADC I,0 rounds the row UP when (V & 4) is set.
//   {h:0x77, v:0x54, dh:+1} : V=0x54, V>>3 = 10, (V & 4) set → vpart = 11.
//   col8 = 0x78 (col 15, same as AC-1). offset = idx(15,11) — one row past AC-1.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml3-6 AC-5 — OBSTAC V/8 half-row round (MLSUB.MAC:853-856 "ADD ONE IF HALF WAY")', () => {
  it('rounds the row up when bit 2 of V is set: {0x77,0x54,+1} → row 11', async () => {
    const m = await loadObstac()
    const field = emptyField()
    field[idx(15, 11)] = FULL_MUSHROOM
    expect(m.obstac(field, { h: 0x77, v: 0x54, dh: 1 })).toBe(FULL_MUSHROOM)
  })

  it('without the carry round it would read row 10 — assert it does NOT', async () => {
    const m = await loadObstac()
    const field = emptyField()
    field[idx(15, 10)] = FULL_MUSHROOM // the un-rounded row
    expect(m.obstac(field, { h: 0x77, v: 0x54, dh: 1 }), 'V=0x54 rounds to row 11, not 10').toBe(0)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-6 — the probe tail masks the grey-background bit (:887-888 "AND I,7F"). obstac
//   returns the low 7 bits; a bare grey cell (0x80) is NOT an obstacle.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml3-6 AC-6 — OBSTAC masks the background bit (MLSUB.MAC:887-888)', () => {
  const mover = { h: 0x77, v: 0x50, dh: 1 } // AC-1 cell, offset 0x1EA

  it('a bare grey-background cell (0x80) reads as NO obstacle (0)', async () => {
    const m = await loadObstac()
    const field = emptyField()
    field[idx(15, 10)] = BG
    expect(m.obstac(field, mover)).toBe(0)
  })

  it('a full mushroom over grey background (0xFF) reads 0x7F, not 0xFF', async () => {
    const m = await loadObstac()
    const field = emptyField()
    field[idx(15, 10)] = BG | FULL_MUSHROOM // 0xFF
    expect(m.obstac(field, mover)).toBe(FULL_MUSHROOM)
  })

  it('a rock (0x70) reads back as 0x70 (obstacle)', async () => {
    const m = await loadObstac()
    const field = emptyField()
    field[idx(15, 10)] = ROCK
    expect(m.obstac(field, mover)).toBe(ROCK)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-7 — WIRING: stepMillipede's MOTION head turn consults the field (MILLI.MAC
//   :1527 "12$: JSR OBSTA0 / BEQ 13$"). The head below coasts LEVEL in free space
//   (mid-screen, on an 8px boundary): v stays 0x50. A mushroom in its cell-ahead
//   makes it TURN — descend a row (v drops) — instead of passing straight through.
//
//   head {h:0x80, v:0x50, dh:1} : sole live head ⇒ last-head speed-up sets dv=2, so
//   a coast leaves v=0x50 and a turn descends to v=0x4E. The cell-ahead obstac for
//   sign(dh)=+1 is H'=0x88 → col 13, row 10 = idx(13,10).
// ═════════════════════════════════════════════════════════════════════════════
describe('ml3-6 AC-7 — stepMillipede MOTION obstacle turn (MILLI.MAC:1527-1539)', () => {
  const head = (): Segment => ({ h: 0x80, v: 0x50, dh: 1, dv: 1, pic: 3, color: 0x39 })
  const AHEAD = idx(13, 10)
  const FRAME = 1 // odd frame: no leg-picture churn to confound v/dh assertions

  it('control: with an EMPTY field the head coasts LEVEL (v unchanged at 0x50)', async () => {
    const m = await loadMillipede()
    const out = m.stepMillipede([head()], FRAME, emptyField())
    expect(out[0].v, 'free space: no descend').toBe(0x50)
  })

  it('a mushroom in the cell ahead makes the head TURN — it descends below 0x50', async () => {
    const m = await loadMillipede()
    const field = emptyField()
    field[AHEAD] = FULL_MUSHROOM
    const out = m.stepMillipede([head()], FRAME, field)
    // dv sped up to 2 (sole live head), so a turn descends exactly one step: 0x50 - 2.
    expect(out[0].v, 'obstacle ahead ⇒ drop a row (15$) to 0x4E, not coast at 0x50').toBe(0x4e)
  })

  it('the turn is CAUSED by the field: same head, same frame, differs from the control', async () => {
    const m = await loadMillipede()
    const field = emptyField()
    field[AHEAD] = FULL_MUSHROOM
    const control = m.stepMillipede([head()], FRAME, emptyField())
    const hit = m.stepMillipede([head()], FRAME, field)
    expect(hit[0].v, 'the descend is the observable effect of obstac wiring').toBeLessThan(control[0].v)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-8 — WIRING band table (MILLI.MAC:1528-1539). Not every nonzero cell turns the
//   head: DDT explosion clouds [0x2E,0x6E) are passed THROUGH, and a poison mushroom
//   [0x78,0x7C) both turns the head AND poisons it (color → POISON_COLOR 0x1B).
// ═════════════════════════════════════════════════════════════════════════════
describe('ml3-6 AC-8 — stepMillipede obstacle band table (MILLI.MAC:1528-1539)', () => {
  const head = (): Segment => ({ h: 0x80, v: 0x50, dh: 1, dv: 1, pic: 3, color: 0x39 })
  const AHEAD = idx(13, 10)
  const FRAME = 1

  it('a DDT explosion cloud (0x40, in [CLOUD,DDT)) is passed through — no turn', async () => {
    const m = await loadMillipede()
    const field = emptyField()
    field[AHEAD] = 0x40 // CLOUD(0x2E) <= 0x40 < DDT(0x6E) → :1532 "GO THRU DDT CLOUDS"
    const out = m.stepMillipede([head()], FRAME, field)
    expect(out[0].v, 'a cloud does not turn the head').toBe(0x50)
  })

  it('a poison mushroom (0x78) turns the head AND sets it poisoned (color 0x1B)', async () => {
    const m = await loadMillipede()
    const field = emptyField()
    field[AHEAD] = POISON // 0x78, in [0x78,0x7C) → :1537-1539 LDA I,1B / STA MOBJC / turn
    const out = m.stepMillipede([head()], FRAME, field)
    expect(out[0].color, 'poison mushroom poisons the head (MOBJC = 0x1B)').toBe(m.POISON_COLOR)
    expect(out[0].v, 'a poison mushroom also turns the head (descends to 0x4E)').toBe(0x4e)
  })

  it('a full mushroom (0x7F, >= 0x7C) turns the head WITHOUT poisoning it', async () => {
    const m = await loadMillipede()
    const field = emptyField()
    field[AHEAD] = FULL_MUSHROOM
    const out = m.stepMillipede([head()], FRAME, field)
    expect(out[0].color, 'a plain mushroom does not poison').toBe(0x39) // HEAD_COLOR
    expect(out[0].v, 'a plain mushroom turns the head (descends to 0x4E)').toBe(0x4e)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-9 — BACKWARD COMPAT. The new field arg is OPTIONAL: the six ml3-1 free-space
//   callers of stepMillipede(segs, frame) must keep compiling and coasting.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml3-6 AC-9 — stepMillipede field arg is optional (ml3-1 regression)', () => {
  it('called with no field, a mid-screen head still coasts level (free space)', async () => {
    const m = await loadMillipede()
    const out = m.stepMillipede([{ h: 0x80, v: 0x50, dh: 1, dv: 1, pic: 3, color: 0x39 }], 1)
    expect(out[0].v, 'no field ⇒ pure free-space MOTION, unchanged from ml3-1').toBe(0x50)
  })
})
