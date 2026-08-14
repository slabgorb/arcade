// tests/shot.test.ts
//
// Story ml6-2 (grown runtime) — SHOOT1, the player shot vs the PLAYFIELD
// (MILLI.MAC:1988-2063). This is the shot half stepGame was missing: a climbing
// shot resolves against a field cell (mushrooms AND DDT bombs), not just against
// segments/enemies. Ported as a pure core module `src/core/shot.ts`.
//
// ─── THE CELL LOOKUP (MILLI.MAC:1988-1997) ───────────────────────────────────
// SHOOT1 seeds OBSTAC with TEMP1 = SHOTH, A = SHOTV + 2 (upright, :1990-1994
// "LDA I,2 / ADC SHOTV") and Y = 0 (":1996 GIVE NO DIRECTION"). With dir 0 the
// 8*D term of OBSTAC vanishes, so H' = SHOTH exactly; the rest is the same
// col8*4 + V/8 math ml3-6 already pinned (obstac.test.ts). So the shot's cell is
//     offset = ((0xF7 - SHOTH) & 0xF8)*4 + ((SHOTV+2)/8 rounded)
//
// ─── THE PICTURE-BAND CLASSIFIER (MILLI.MAC:1998-2063) ───────────────────────
//   0                     → no obstacle: the shot PASSES (climbs on)   [BEQ 11$]
//   0x01..0x2D (letter)   → the shot STOPS, nothing scored             [BCC 108$]
//   0x2E..0x6D (DDT cloud)→ the shot PASSES THROUGH                    [BCC 11$]
//   0x6E / 0x6F (a bomb)  → DDT detonation via ddtShoot: +80, STOP     [16$/18$→40$]
//   0x70 (ROCK)           → the shot STOPS, indestructible             [BCC 108$]
//   0x71..0x7F (mushroom) → chip one stage; destroy at a boundary +1   [107$/106$]
//
// Every expected offset is hand-derived from the cited 6502 and cross-checked
// against reference/original-source/millipede/{MILLI,MLSUB}.MAC.

import { describe, it, expect } from 'vitest'
import { resolveShot } from '../src/core/shot'
import { newDdtTable, ddtPlace, ddtRestore, ddtExploding, DDT_STAMP } from '../src/core/ddt'

const STRIDE = 0x20
const SIZE = 0x3c0
const idx = (col: number, row: number) => col * STRIDE + row
const empty = () => new Uint8Array(SIZE)

const FULL_MUSHROOM = 0x7f
const ROCK = 0x70
const CLOUD = 0x2e
const BG = 0x80

// Hand-derived fixture: SHOTH=0xC7, SHOTV=0x66 → V'=0x68, vpart=0x0D (13, no
// round), col8=(0xF7-0xC7)&0xF8=0x30 → offset = 0x30*4 + 13 = 0xCD = idx(6,13).
const SHOT = { h: 0xc7, v: 0x66 }
const CELL = idx(6, 13) // 0xCD

describe('ml6-2 SHOOT1 — the shot climbs empty space (MILLI.MAC:1998 BEQ 11$)', () => {
  it('an empty cell is no obstacle: the shot PASSES', () => {
    const out = resolveShot(newDdtTable(), empty(), SHOT.h, SHOT.v)
    expect(out.kind).toBe('pass')
    expect(out.points).toBe(0)
  })

  it('derives EXACTLY offset 0xCD — an obstacle one cell off is not seen', () => {
    const field = empty()
    field[CELL + 1] = FULL_MUSHROOM
    field[CELL - STRIDE] = FULL_MUSHROOM
    expect(resolveShot(newDdtTable(), field, SHOT.h, SHOT.v).kind).toBe('pass')
  })
})

describe('ml6-2 SHOOT1 — letters and rock STOP the shot (MILLI.MAC:1999-2011)', () => {
  it('a letter (0x01..0x2D) stops the shot with no score or field change', () => {
    const field = empty()
    field[CELL] = 0x10 // a score-text letter stamp
    const out = resolveShot(newDdtTable(), field, SHOT.h, SHOT.v)
    expect(out.kind).toBe('stop')
    expect(out.points).toBe(0)
    expect(field[CELL]).toBe(0x10) // untouched
  })

  it('a ROCK (0x70) stops the shot — indestructible, unchanged', () => {
    const field = empty()
    field[CELL] = ROCK
    const out = resolveShot(newDdtTable(), field, SHOT.h, SHOT.v)
    expect(out.kind).toBe('stop')
    expect(field[CELL]).toBe(ROCK)
  })
})

describe('ml6-2 SHOOT1 — DDT explosion clouds PASS THROUGH (MILLI.MAC:2002-2003)', () => {
  it('a cloud stamp (0x2E..0x6D) does not stop the shot', () => {
    const field = empty()
    field[CELL] = CLOUD // 0x2E, in [CLOUD, DDT)
    expect(resolveShot(newDdtTable(), field, SHOT.h, SHOT.v).kind).toBe('pass')
  })
})

describe('ml6-2 SHOOT1 — mushrooms chip one stage (MILLI.MAC:2015-2028, 107$)', () => {
  it('a full mushroom (0x7F) is chipped to 0x7E, keeps its background bit, scores 0', () => {
    const field = empty()
    field[CELL] = BG | FULL_MUSHROOM // 0xFF
    const out = resolveShot(newDdtTable(), field, SHOT.h, SHOT.v)
    if (out.kind !== 'mushroom') throw new Error(`expected mushroom, got ${out.kind}`)
    expect(out.destroyed).toBe(false)
    expect(out.points).toBe(0)
    expect(field[CELL]).toBe(BG | 0x7e) // one stage of damage, grey kept
  })

  it('the last stage (0x7C) is DESTROYED for 1 point, cell cleared to bare grey', () => {
    const field = empty()
    field[CELL] = BG | 0x7c // NORMAL: SBC 1 → 0x7B, an "END OF MUSHROOM" boundary
    const out = resolveShot(newDdtTable(), field, SHOT.h, SHOT.v)
    if (out.kind !== 'mushroom') throw new Error(`expected mushroom, got ${out.kind}`)
    expect(out.destroyed).toBe(true)
    expect(out.points).toBe(1)
    expect(field[CELL]).toBe(BG) // stamp cleared, grey background preserved
  })
})

describe('ml6-2 SHOOT1 — a DDT bomb DETONATES (MILLI.MAC:2029-2063, 16$→40$)', () => {
  // ddtPlace word 0 is 0x10CD → entry {lo:0xCD, hi:0x10}; ddtRestore stamps
  // DDT_STAMP at base 0xCD — exactly the SHOT cell above.
  const armed = () => {
    const table = newDdtTable()
    ddtPlace(table, false)
    const field = empty()
    ddtRestore(table, field)
    return { table, field }
  }

  it('shooting the placed bomb explodes it for 80 points and stops the shot', () => {
    const { table, field } = armed()
    expect(field[CELL]).toBe(DDT_STAMP) // the bomb is stamped here
    const out = resolveShot(table, field, SHOT.h, SHOT.v)
    expect(out.kind).toBe('ddt')
    expect(out.points).toBe(80)
    expect(ddtExploding(table[0])).toBe(true) // the entry is now exploding
  })

  it('a bomb stamp with NO matching bank entry passes (it is mid-explosion)', () => {
    const field = empty()
    field[CELL] = DDT_STAMP
    // newDdtTable() is all-vacant → no entry matches → :2057 BPL 11$ pass-through
    const out = resolveShot(newDdtTable(), field, SHOT.h, SHOT.v)
    expect(out.kind).toBe('pass')
  })
})
