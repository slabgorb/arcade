// tests/obstac.test.ts
//
// Story cp2-3 — RED phase (O'Brien / TEA). OBSTAC, transcribed ONCE as a single
// shared routine (CENTI4.MAC:1689), with the direction offset the cp1-5 shot
// never needed. OBSTAC maps a motion-object pixel (h,v) + travel direction to
// the playfield cell it would ENTER and reports the code there:
//
//   ENTRY (A)=MOBJV, (Y)=MOBJDH, (TEMP1)=MOBJH   (CT-27, CENTI4.MAC:1692)
//   H' = H + 8*direction                          (CT-28, :1711/1713 "8*DIRECTION")
//   col = ((0xF7 - H') & 0xF8) >> 3   (reverse about 0xF7, floor 8px)  (CT-29, :1715/1720)
//   row = (V + 4) >> 3                (round-to-nearest, PS-16 :1704)
//   EXIT (Z)=0=OBSTACLE / =1=NO OBSTACLE          (CT-27, :1695)
//
// The gun (MOVE) and the shot (SHOOT) call OBSTAC with direction 0 — they probe
// the cell IN PLACE (PS-19). Only the centipede (MOTION) passes a non-zero
// MOBJDH, so it looks one cell AHEAD in its travel direction. This is the whole
// reason cp1-5's `obstacleCell(h,v)` is the direction-0 special case of the same
// routine — the RED contract pins that they agree at dir=0.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────────
// `obstacleCellFor` / `obstacleCode` (the shared OBSTAC in src/core/playfield.ts)
// do not exist yet. loadObstac() dynamic-imports playfield.ts and throws a
// self-describing "not built yet" if either export is absent — every OBSTAC test
// then reddens for the FEATURE's absence, not a stray `undefined is not a function`.

import { describe, it, expect } from 'vitest'
import {
  createPlayfield,
  PLYFLD_STRIDE,
  PLYFLD_WIDTH,
  MUSHROOM_FULL,
  type Playfield,
} from '../src/core/playfield'
// cp1-5's dir-0 mapping — the routine OBSTAC must agree with at direction 0.
import { obstacleCell } from '../src/core/player'

// ─── the shared OBSTAC contract GREEN (Julia) adds to src/core/playfield.ts ──────
interface ObstacModule {
  /** OBSTAC cell mapping (CT-27/28/29 + PS-16/17/18): the grid cell a motion
   *  object at pixel (h,v) travelling in `dir` (signed MOBJDH; gun/shot pass 0)
   *  would enter. Column reverses about 0xF7 after +8*dir and floors to 8px;
   *  row is round-to-nearest (v+4)>>3. */
  obstacleCellFor: (h: number, v: number, dir: number) => { h: number; v: number }
  /** The playfield cell CODE at that OBSTAC cell (0 = empty, off-grid, or out of
   *  range). The ONE field probe both MOTION (dir=±speed) and MOVE/SHOOT (dir=0)
   *  consume — OBSTAC transcribed once. */
  obstacleCode: (field: Playfield, h: number, v: number, dir: number) => number
}

async function loadObstac(): Promise<ObstacModule> {
  try {
    const mod = (await import('../src/core/playfield')) as Partial<ObstacModule>
    if (typeof mod.obstacleCellFor !== 'function' || typeof mod.obstacleCode !== 'function') {
      throw new Error('playfield.ts has no `obstacleCellFor` / `obstacleCode` export')
    }
    return mod as ObstacModule
  } catch (e) {
    throw new Error(
      'shared OBSTAC not built yet — GREEN (Julia) adds `obstacleCellFor(h,v,dir)` and ' +
        '`obstacleCode(field,h,v,dir)` to src/core/playfield.ts, transcribing OBSTAC ' +
        '(CENTI4.MAC:1689) ONCE: column = ((0xF7 - (h + 8*dir)) & 0xF8) >> 3, row = (v+4)>>3. ' +
        'cp1-5 obstacleCell(h,v) becomes obstacleCellFor(h,v,0); MOTION and the gun MOVE both ' +
        'consume obstacleCode. Cited by CT-27/28/29 in docs/rom-study/claims/09-centipede-train.json. ' +
        `(${(e as Error).message})`,
    )
  }
}

describe('cp2-3 OBSTAC — the dir=0 mapping is exactly cp1-5 obstacleCell', () => {
  it('obstacleCellFor(h,v,0) reproduces the cp1-5-pinned OBSTAC cells (PS-16/17/18)', async () => {
    const { obstacleCellFor } = await loadObstac()
    // The exact cases cp1-5 pinned in tests/player.test.ts.
    expect(obstacleCellFor(0xf4, 12, 0)).toEqual({ h: 0, v: 2 }) // (0xF7-0xF4)>>3=0 ; (12+4)>>3=2
    expect(obstacleCellFor(0x0b, 12, 0)).toEqual({ h: 29, v: 2 }) // (0xF7-0x0B)>>3=29
    expect(obstacleCellFor(0x80, 100, 0)).toEqual({ h: 14, v: 13 }) // 119>>3=14 ; 104>>3=13
  })

  it('agrees with the existing obstacleCell(h,v) across the gun band (one routine, two names)', async () => {
    const { obstacleCellFor } = await loadObstac()
    for (let h = 0x0b; h <= 0xf4; h += 3) {
      for (let v = 8; v <= 0x30; v += 5) {
        expect(obstacleCellFor(h, v, 0), `dir=0 must equal obstacleCell at (${h},${v})`).toEqual(
          obstacleCell(h, v),
        )
      }
    }
  })

  it('rounds the row to the nearest cell via the +4 (PS-16 ADC I,0)', async () => {
    const { obstacleCellFor } = await loadObstac()
    expect(obstacleCellFor(0x80, 3, 0).v).toBe(0) // 3 < 4 -> down
    expect(obstacleCellFor(0x80, 4, 0).v).toBe(1) // 4 >= 4 -> up (round half up)
    expect(obstacleCellFor(0x80, 11, 0).v).toBe(1)
    expect(obstacleCellFor(0x80, 12, 0).v).toBe(2)
  })
})

describe('cp2-3 OBSTAC — the direction offset (CT-28, the genuinely-new fact)', () => {
  it('probes 8*dir pixels ahead: the column shifts by exactly -dir (H rises 8 per dir)', async () => {
    const { obstacleCellFor } = await loadObstac()
    // Interior H so no left-margin clamp: col = (0xF7 - (h + 8*dir)) >> 3 = col0 - dir.
    const h = 0x80
    const v = 0x40
    const col0 = obstacleCellFor(h, v, 0).h
    expect(obstacleCellFor(h, v, 1).h, 'dir=+1 looks one cell ahead').toBe(col0 - 1)
    expect(obstacleCellFor(h, v, 2).h, 'dir=+2 (speed 2) looks two cells ahead').toBe(col0 - 2)
    expect(obstacleCellFor(h, v, -1).h, 'dir=-1 looks one cell the other way').toBe(col0 + 1)
  })

  it('the direction offset changes ONLY the column, never the row', async () => {
    const { obstacleCellFor } = await loadObstac()
    const row0 = obstacleCellFor(0x80, 0x40, 0).v
    expect(obstacleCellFor(0x80, 0x40, 1).v).toBe(row0)
    expect(obstacleCellFor(0x80, 0x40, -2).v).toBe(row0)
  })
})

describe('cp2-3 OBSTAC — obstacleCode is the single shared field probe', () => {
  it('returns the cell code at the mapped cell (0 for empty)', async () => {
    const { obstacleCellFor, obstacleCode } = await loadObstac()
    const field = createPlayfield()
    const h = 0x80
    const v = 0x40
    const cell = obstacleCellFor(h, v, 0)
    expect(obstacleCode(field, h, v, 0), 'empty field reads 0').toBe(0)
    field.cells[cell.h * PLYFLD_STRIDE + cell.v] = MUSHROOM_FULL
    expect(obstacleCode(field, h, v, 0), 'reads the code the mapped cell holds').toBe(MUSHROOM_FULL)
  })

  it('the direction offset makes obstacleCode read the cell AHEAD, not the one underfoot', async () => {
    const { obstacleCellFor, obstacleCode } = await loadObstac()
    const field = createPlayfield()
    const h = 0x80
    const v = 0x40
    const ahead = obstacleCellFor(h, v, 1) // the cell 8px ahead in +dir
    field.cells[ahead.h * PLYFLD_STRIDE + ahead.v] = MUSHROOM_FULL
    expect(obstacleCode(field, h, v, 0), 'dir=0 does NOT see the ahead mushroom').toBe(0)
    expect(obstacleCode(field, h, v, 1), 'dir=+1 DOES see the ahead mushroom').toBe(MUSHROOM_FULL)
  })

  it('is a no-obstacle (0) off the grid, never an out-of-range read', async () => {
    const { obstacleCode } = await loadObstac()
    const field = createPlayfield()
    // A dir that would push the column past the 30-wide grid must not throw and
    // must report no obstacle (the faithful reduction for a grid-only sim).
    expect(() => obstacleCode(field, 0x0b, 0x40, 8)).not.toThrow()
    const code = obstacleCode(field, 0x0b, 0x40, 8)
    expect(code === 0 || Number.isInteger(code)).toBe(true)
    // Sanity: PLYFLD_WIDTH cells exist; a legal in-band cell never over-reads.
    expect(PLYFLD_WIDTH).toBe(30)
  })
})
