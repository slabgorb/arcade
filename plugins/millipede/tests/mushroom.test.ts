// tests/mushroom.test.ts
//
// Story ml3-3 — RED phase (Leeloo / TEA). The MUSHROOM-FIELD REDUCERS: the count
// seam CONWAY (ml3-4) deferred, plus RESTOR and the OBSTAC probe. These operate
// on the SAME field CONWAY owns — a Uint8Array of PLYFLD_SIZE (0x3C0) stamp
// bytes indexed offset = col*0x20 + row (src/core/conway.ts, CW-11). Cell low 7
// bits are the picture code; bit 7 is the grey-background bit MSKORA re-imposes
// (MLDEF.MAC:411). Every expected value below is hand-derived from the cited 6502
// this session and cross-checked against reference/original-source/millipede/.
//
// ─── SCOPE — upright cabinet only (matches conway.ts) ────────────────────────
// CKIND (cocktail, player 2 up) is modelled CLEAR, so MUSHDC/MUSHER take their
// `BPL 5$` "NOT TIME FOR COCKTAIL" branch (MLSUB.MAC:715). Single player: the
// MUSH register pair is { lower: MUSH[0], top: MUSH[2] } (MLDEF.MAC:342-343).
//
// ─── WHAT GREEN (Dev / Korben) MUST SHIP ─────────────────────────────────────
//   src/core/mushroom.ts — a PURE core reducer (the ml1-1 purity sweep will
//   auto-scan it: no clock, no entropy, no browser surface). Reuse conway.ts's
//   field geometry and picture-band constants; do NOT fork a second field model.
//   Exports:
//     ROCK = 0x70              // MLDEF.MAC:204  "ROCK =70 ;INDESTRUCTIBLE FEATURE"
//     FULL_MUSHROOM = 0x7f     // MLSUB.MAC:741  "LDY I,7F ;FULL MUSHROOM"
//     BACKGROUND_BIT = 0x80    // MLDEF.MAC:411 (MSKORA grey-bg bit, CW-17)
//     POISON = 0x78            // MLDEF.MAC:207  (aligned with conway.ts)
//     NORMAL = 0x7c            // MLDEF.MAC:208  (aligned with conway.ts)
//     LOWER_MAX = 0x0c         // MLSUB.MAC:718/722  "CMP I,0C"
//     TOP_MIN   = 0x14         // MLSUB.MAC:716/724  "CMP I,14"
//     MUSH_COLOR_IDX = 6       // MLDEF.MAC:142  "6 INSIDE OF MUSHROOM"
//     POISON_COLOR_IDX = 7     // MLDEF.MAC:143  "7 INSIDE OF POISON MUSHROOM"
//     interface MushCounts { lower: number; top: number }   // the MUSH pair
//     musher(field, addr, counts): boolean
//         MUSHER (MLSUB.MAC:732-772). Add a full mushroom at `addr` iff the cell
//         is empty (low 7 bits == 0, :739 "AND I,7F / BNE 20$") AND the row is
//         not excluded. Upright exclusions: row 0 (:744-745 "AND I,1F / BEQ 20$"),
//         row 0x1F (:746-747 "CMP I,1F / BEQ 20$"), player row 1 (:759-760 "CMP I,01 /
//         BEQ 20$"). On add: stamp cell = FULL | (cell & BACKGROUND_BIT) (:770
//         "ORA NY,OBST ;LEAVE GREY BACKGROUND IF ANY", CW-62) and INC the count
//         register for the row band (:767 "INC X,MUSH"): lower if row<LOWER_MAX,
//         top if row>=TOP_MIN, NEITHER in the middle band [0x0C,0x14) (which is
//         still stamped — the INC is skipped by BCC 10$, the store is not).
//         MUTATES `field` and `counts` in place; returns whether a mushroom was
//         added.
//     mushdc(addr, counts): void
//         MUSHDC (MLSUB.MAC:707-729). Decrement the count register for `addr`'s
//         row band — lower if row<LOWER_MAX (:722), top if row>=TOP_MIN (INX INX
//         :726-727), NEITHER in the middle band (:725 "BCC 10$"). Does NOT touch
//         the field. MUTATES `counts` in place. row = addr & 0x1F (:712).
//     restor(field, addr, gate): boolean
//         RESTOR (MLSUB.MAC:919-949). gate = { frame, pexpld, cdone }. Acts only
//         when (frame & 0x03) === 0 (:924, comment says "16 FRAMES" but the mask
//         is 03 — the mask is the mechanism, see Design Deviations) AND
//         pexpld === 0 (:926) AND cdone === 0 (:928). Restores one DAMAGED cell:
//         iff ROCK <= (cell & 0x7f) < 0x7f (:942 "CMP I,ROCK / BCC" .. :944
//         "CMP I,7F / BCS"), set cell = (cell & 0x80) | 0x7f (:946-949). MUTATES
//         `field`; returns whether it restored. (The MEM-pointer walk, the 5-pt
//         score and the explosion trigger are shell/other-story surface.)
//     obstacleAt(field, addr): number
//         The OBSTAC probe (MLSUB.MAC:887-889 "LDA NY,OBST / AND I,7F / RTS").
//         Returns the cell's low 7 bits: 0 == NO obstacle (ROM Z=1), nonzero ==
//         OBSTACLE (ROM Z=0). NB the ROM sense is Z-flag; the story's AC-5 stated
//         it backwards — see Design Deviations.
//     isPoison(stamp): boolean
//         POISON <= (stamp & 0x7f) < NORMAL — the [0x78,0x7C) band (MLDEF.MAC:207,
//         matches conway.ts:133/141). Poison is a VALUE RANGE, not a single bit
//         (AC-6 said "bit" — see Design Deviations).
//
// ─── DEFERRED (see session Delivery Findings) ────────────────────────────────
//   The full OBSTAC mover-address derivation (V/8 + half-row round; H' = H +
//   8*dir; the (0xF7-H')&0xF8 column fold; the right-edge wrap) is NOT pinned
//   here. Its exit comment computes an address based at 0x800 (MLSUB.MAC ~:886)
//   while conway's committed field model is 0x400-based (0x400..0x7BF) — a base
//   reconciliation that must be resolved against primary source before a byte
//   fixture is trustworthy. This RED pins the probe SEMANTICS (obstacleAt); the
//   coordinate→address math is filed as a Delivery Finding for Architect/Dev.

import { describe, it, expect } from 'vitest'

interface MushCounts {
  lower: number
  top: number
}

interface MushroomModule {
  ROCK: number
  FULL_MUSHROOM: number
  BACKGROUND_BIT: number
  POISON: number
  NORMAL: number
  LOWER_MAX: number
  TOP_MIN: number
  MUSH_COLOR_IDX: number
  POISON_COLOR_IDX: number
  musher: (field: Uint8Array, addr: number, counts: MushCounts) => boolean
  mushdc: (addr: number, counts: MushCounts) => void
  restor: (
    field: Uint8Array,
    addr: number,
    gate: { frame: number; pexpld: number; cdone: number },
  ) => boolean
  obstacleAt: (field: Uint8Array, addr: number) => number
  isPoison: (stamp: number) => boolean
}

// COMPUTED specifier (the conway.test.ts / centipede bonus-lives pattern): tsc
// cannot resolve it, so the RED tree stays lint-clean while the module does not
// exist; vitest resolves it at runtime, relative to this file.
const MUSHROOM_SPECIFIER = ['..', 'src', 'core', 'mushroom'].join('/')

/** Self-describing loader (the ml1-1 pattern): RED proves the feature absent. */
async function loadMushroom(): Promise<MushroomModule> {
  try {
    const mod = (await import(/* @vite-ignore */ MUSHROOM_SPECIFIER)) as Partial<MushroomModule>
    if (typeof mod.musher !== 'function') throw new Error('module has no musher export')
    if (typeof mod.mushdc !== 'function') throw new Error('module has no mushdc export')
    if (typeof mod.restor !== 'function') throw new Error('module has no restor export')
    if (typeof mod.obstacleAt !== 'function') throw new Error('module has no obstacleAt export')
    return mod as MushroomModule
  } catch (e) {
    throw new Error(
      'src/core/mushroom.ts not built yet — GREEN (Dev) ports MUSHER/MUSHDC ' +
        '(MLSUB.MAC:707-772), RESTOR (:919-949) and the OBSTAC probe (:887-889) ' +
        `as pure core reducers over conway.ts's field: ${e instanceof Error ? e.message : String(e)}`,
    )
  }
}

// ─── field geometry (per CW-11; no game logic reimplemented here) ────────────
const STRIDE = 0x20
const SIZE = 0x3c0
const idx = (col: number, row: number) => col * STRIDE + row
const emptyField = () => new Uint8Array(SIZE)
const freshCounts = (): MushCounts => ({ lower: 0, top: 0 })

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 — MUSHER adds a full mushroom to an empty cell and counts it by band.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml3-3 AC-1 — MUSHER adds to an empty cell (MLSUB.MAC:732-772)', () => {
  it('exports the cited constants', async () => {
    const m = await loadMushroom()
    expect(m.ROCK).toBe(0x70) // MLDEF.MAC:204
    expect(m.FULL_MUSHROOM).toBe(0x7f) // MLSUB.MAC:741
    expect(m.BACKGROUND_BIT).toBe(0x80) // MLDEF.MAC:411 (MSKORA)
    expect(m.POISON).toBe(0x78) // MLDEF.MAC:207
    expect(m.NORMAL).toBe(0x7c) // MLDEF.MAC:208
    expect(m.LOWER_MAX).toBe(0x0c) // MLSUB.MAC:718/722
    expect(m.TOP_MIN).toBe(0x14) // MLSUB.MAC:716/724
  })

  it('stamps a FULL mushroom (0x7F) and returns true on an empty lower cell', async () => {
    const m = await loadMushroom()
    const field = emptyField()
    const addr = idx(5, 0x05) // row 5 < LOWER_MAX → lower band
    const added = m.musher(field, addr, freshCounts())
    expect(added).toBe(true)
    expect(field[addr]).toBe(0x7f) // :770 stamp = 0x7F | (empty cell)
  })

  it('increments the LOWER count for a row below LOWER_MAX (0x0C)', async () => {
    const m = await loadMushroom()
    const counts = freshCounts()
    m.musher(emptyField(), idx(3, 0x0b), counts) // row 0x0B is the last lower row
    expect(counts.lower).toBe(1) // :767 INC X,MUSH  (X = PLAYR → MUSH[0])
    expect(counts.top).toBe(0)
  })

  it('increments the TOP count for a row at/above TOP_MIN (0x14)', async () => {
    const m = await loadMushroom()
    const counts = freshCounts()
    m.musher(emptyField(), idx(3, 0x14), counts) // row 0x14 = first top row
    expect(counts.top).toBe(1) // :765-767 INX / INX (6$) / INC X,MUSH → MUSH[2]
    expect(counts.lower).toBe(0)
  })

  it('stamps but does NOT count a mushroom in the middle band [0x0C,0x14)', async () => {
    // :761-762 CMP I,0C / BCC 7$ (row<0x0C) taken only below 0x0C; :763-764 CMP I,14 / BCC 10$
    // routes 0x0C..0x13 to the store (10$) with the INC skipped.
    const m = await loadMushroom()
    const field = emptyField()
    const counts = freshCounts()
    const addr = idx(4, 0x10) // 0x0C <= 0x10 < 0x14 → middle band
    const added = m.musher(field, addr, counts)
    expect(added).toBe(true)
    expect(field[addr]).toBe(0x7f) // still stamped
    expect(counts.lower).toBe(0) // but neither register advanced
    expect(counts.top).toBe(0)
  })

  it('preserves the grey-background bit 7 when it stamps (ORA, :770)', async () => {
    const m = await loadMushroom()
    const field = emptyField()
    const addr = idx(6, 0x06)
    field[addr] = 0x80 // grey background present, no picture (low 7 bits == 0 → empty)
    const added = m.musher(field, addr, freshCounts())
    expect(added).toBe(true)
    expect(field[addr]).toBe(0xff) // 0x7F | 0x80 — bg kept, mushroom stamped
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-2 — MUSHER refuses duplicates and the upright row exclusions.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml3-3 AC-2 — MUSHER does not add over a mushroom or an excluded row', () => {
  it('returns false and changes nothing when a mushroom already occupies the cell', async () => {
    // :739 AND I,7F / BNE 20$ — any non-zero low 7 bits means "already there".
    const m = await loadMushroom()
    const field = emptyField()
    const counts = freshCounts()
    const addr = idx(7, 0x08)
    field[addr] = 0x7c // an existing NORMAL mushroom (low 7 bits != 0)
    const added = m.musher(field, addr, counts)
    expect(added).toBe(false)
    expect(field[addr]).toBe(0x7c) // untouched
    expect(counts.lower).toBe(0) // no double count
    expect(counts.top).toBe(0)
  })

  it('treats even a DAMAGED (partial) mushroom as already present', async () => {
    const m = await loadMushroom()
    const field = emptyField()
    const addr = idx(2, 0x07)
    field[addr] = 0x73 // a DEATHS-stage partial: low 7 bits still != 0
    const added = m.musher(field, addr, freshCounts())
    expect(added).toBe(false)
    expect(field[addr]).toBe(0x73)
  })

  it('refuses row 0 (:744-745 AND I,1F / BEQ 20$)', async () => {
    const m = await loadMushroom()
    const field = emptyField()
    const counts = freshCounts()
    const addr = idx(9, 0x00) // row 0
    const added = m.musher(field, addr, counts)
    expect(added).toBe(false)
    expect(field[addr]).toBe(0x00) // nothing stamped
    expect(counts.lower).toBe(0)
  })

  it('refuses the player row 1 (:759-760 CMP I,01 / BEQ 20$)', async () => {
    const m = await loadMushroom()
    const field = emptyField()
    const counts = freshCounts()
    const addr = idx(9, 0x01) // row 1 = player row (upright)
    const added = m.musher(field, addr, counts)
    expect(added).toBe(false)
    expect(field[addr]).toBe(0x00)
    expect(counts.lower).toBe(0)
  })

  it('refuses the top row 0x1F (:746-747 CMP I,1F / BEQ 20$)', async () => {
    // Round-1 review gap (mutation-proven): deleting musher's row-0x1F exclusion
    // left the whole suite green. Row 0x1F is >= TOP_MIN, so a missed exclusion
    // would wrongly stamp + increment counts.top — this pins that it does not.
    const m = await loadMushroom()
    const field = emptyField()
    const counts = freshCounts()
    const addr = idx(9, 0x1f) // row 0x1F = the top row
    const added = m.musher(field, addr, counts)
    expect(added).toBe(false)
    expect(field[addr]).toBe(0x00) // nothing stamped
    expect(counts.top).toBe(0) // and no count on the top register
    expect(counts.lower).toBe(0)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-3 — MUSHDC decrements the count register by screen band (upright).
// ═════════════════════════════════════════════════════════════════════════════
describe('ml3-3 AC-3 — MUSHDC decrements the count by band (MLSUB.MAC:707-729)', () => {
  it('decrements the LOWER register for a row below 0x0C (:722 BCC 7$)', async () => {
    const m = await loadMushroom()
    const counts: MushCounts = { lower: 3, top: 3 }
    m.mushdc(idx(4, 0x0b), counts) // row 0x0B < 0x0C
    expect(counts.lower).toBe(2)
    expect(counts.top).toBe(3) // untouched
  })

  it('decrements the TOP register for a row at/above 0x14 (:726 INX INX)', async () => {
    const m = await loadMushroom()
    const counts: MushCounts = { lower: 3, top: 3 }
    m.mushdc(idx(4, 0x14), counts) // row 0x14 >= 0x14
    expect(counts.top).toBe(2)
    expect(counts.lower).toBe(3) // untouched
  })

  it('decrements NEITHER register in the middle band [0x0C,0x14) (:725 BCC 10$)', async () => {
    const m = await loadMushroom()
    const counts: MushCounts = { lower: 3, top: 3 }
    m.mushdc(idx(4, 0x0c), counts) // row 0x0C = first middle row
    m.mushdc(idx(4, 0x13), counts) // row 0x13 = last middle row
    expect(counts.lower).toBe(3)
    expect(counts.top).toBe(3)
  })

  it('reads the row from the low 5 bits of the address (:712 AND I,1F)', async () => {
    // Two different columns, same row → same band. Proves the column bits above
    // bit 4 do not leak into the row decision.
    const m = await loadMushroom()
    const a = { lower: 5, top: 5 }
    m.mushdc(idx(0, 0x05), a) // col 0, row 5
    const b = { lower: 5, top: 5 }
    m.mushdc(idx(29, 0x05), b) // col 29, row 5 — far column, same low-5 row
    expect(a.lower).toBe(4)
    expect(b.lower).toBe(4) // identical: only row (addr & 0x1F) decided
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-4 — RESTOR restores damaged mushrooms, gated on frame/PEXPLD/CDONE.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml3-3 AC-4 — RESTOR restores damaged mushrooms (MLSUB.MAC:919-949)', () => {
  const openGate = { frame: 0, pexpld: 0, cdone: 0 }

  it('restores a damaged mushroom to full 0x7F and returns true', async () => {
    const m = await loadMushroom()
    const field = emptyField()
    const addr = idx(3, 0x08)
    field[addr] = 0x73 // ROCK <= 0x73 < 0x7F: a damaged stage
    const restored = m.restor(field, addr, openGate)
    expect(restored).toBe(true)
    expect(field[addr]).toBe(0x7f) // :948-949 ORA I,7F → full
  })

  it('preserves the background bit when restoring (:946-949 AND I,80 / ORA I,7F)', async () => {
    const m = await loadMushroom()
    const field = emptyField()
    const addr = idx(3, 0x09)
    field[addr] = 0x80 | 0x74 // grey bg + a damaged stage
    m.restor(field, addr, openGate)
    expect(field[addr]).toBe(0xff) // 0x80 | 0x7F
  })

  it('restores the ROCK boundary 0x70 but NOT 0x6F just below it (:942 CMP I,ROCK / BCC)', async () => {
    // BCC skips only when strictly BELOW ROCK, so 0x70 itself is restored.
    const m = await loadMushroom()
    const field = emptyField()
    const rockAddr = idx(1, 0x0a)
    const belowAddr = idx(2, 0x0a)
    field[rockAddr] = 0x70 // == ROCK
    field[belowAddr] = 0x6f // one below ROCK
    expect(m.restor(field, rockAddr, openGate)).toBe(true)
    expect(field[rockAddr]).toBe(0x7f)
    expect(m.restor(field, belowAddr, openGate)).toBe(false)
    expect(field[belowAddr]).toBe(0x6f) // untouched — not a mushroom/rock
  })

  it('does NOT touch a full mushroom 0x7F (:944 CMP I,7F / BCS)', async () => {
    const m = await loadMushroom()
    const field = emptyField()
    const addr = idx(4, 0x0a)
    field[addr] = 0x7f
    expect(m.restor(field, addr, openGate)).toBe(false)
    expect(field[addr]).toBe(0x7f)
  })

  it('does NOT act on a frame where FRAME & 0x03 != 0 (:924 AND I,03 / BNE)', async () => {
    const m = await loadMushroom()
    const field = emptyField()
    const addr = idx(5, 0x0a)
    field[addr] = 0x73
    // 1,2,3 all fail the mask; 4 passes again (mask is 0x03, not "16 frames").
    for (const frame of [1, 2, 3]) {
      expect(m.restor(field, addr, { frame, pexpld: 0, cdone: 0 })).toBe(false)
      expect(field[addr]).toBe(0x73) // unchanged on a gated-out frame
    }
    expect(m.restor(field, addr, { frame: 4, pexpld: 0, cdone: 0 })).toBe(true)
    expect(field[addr]).toBe(0x7f)
  })

  it('waits while a player explosion is active (:926 LDA PEXPLD / BNE)', async () => {
    const m = await loadMushroom()
    const field = emptyField()
    const addr = idx(6, 0x0a)
    field[addr] = 0x73
    expect(m.restor(field, addr, { frame: 0, pexpld: 1, cdone: 0 })).toBe(false)
    expect(field[addr]).toBe(0x73)
  })

  it('waits while CONWAY growth/death is running (:928 LDA CDONE / BNE)', async () => {
    const m = await loadMushroom()
    const field = emptyField()
    const addr = idx(7, 0x0a)
    field[addr] = 0x73
    expect(m.restor(field, addr, { frame: 0, pexpld: 0, cdone: 1 })).toBe(false)
    expect(field[addr]).toBe(0x73)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-5 — the OBSTAC probe: nonzero stamp == obstacle (Z-flag semantics).
// ═════════════════════════════════════════════════════════════════════════════
describe('ml3-3 AC-5 — obstacleAt probe (MLSUB.MAC:887-889)', () => {
  it('returns 0 (NO obstacle) for an empty cell', async () => {
    const m = await loadMushroom()
    const field = emptyField()
    expect(m.obstacleAt(field, idx(8, 0x0a))).toBe(0) // ROM Z=1 → no obstacle
  })

  it('returns the low-7-bits stamp (nonzero == OBSTACLE) for a mushroom', async () => {
    const m = await loadMushroom()
    const field = emptyField()
    const addr = idx(8, 0x0a)
    field[addr] = 0x7f
    expect(m.obstacleAt(field, addr)).toBe(0x7f) // ROM Z=0 → obstacle
    expect(m.obstacleAt(field, addr)).not.toBe(0)
  })

  it('sees a ROCK (0x70) as an obstacle', async () => {
    const m = await loadMushroom()
    const field = emptyField()
    const addr = idx(9, 0x0a)
    field[addr] = 0x70
    expect(m.obstacleAt(field, addr)).toBe(0x70)
  })

  it('MASKS the background bit — a bare grey cell (0x80, no picture) is NOT an obstacle', async () => {
    // :888 AND I,7F strips bit 7, so a grey-only cell reads clear.
    const m = await loadMushroom()
    const field = emptyField()
    const addr = idx(9, 0x0b)
    field[addr] = 0x80 // background bit only, low 7 bits == 0
    expect(m.obstacleAt(field, addr)).toBe(0) // NOT an obstacle
  })

  it('reports a background-plus-mushroom cell (0xFF) as an obstacle without the bg bit', async () => {
    const m = await loadMushroom()
    const field = emptyField()
    const addr = idx(9, 0x0c)
    field[addr] = 0xff // grey bg + full mushroom
    expect(m.obstacleAt(field, addr)).toBe(0x7f) // bg masked off; still an obstacle
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-6 — poison mushrooms are the [0x78,0x7C) band, coloured index 7.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml3-3 AC-6 — poison mushroom state (MLDEF.MAC:143/207)', () => {
  it('exports distinct inside colours for mushroom (6) and poison (7)', async () => {
    const m = await loadMushroom()
    expect(m.MUSH_COLOR_IDX).toBe(6) // MLDEF.MAC:142
    expect(m.POISON_COLOR_IDX).toBe(7) // MLDEF.MAC:143
    expect(m.POISON_COLOR_IDX).not.toBe(m.MUSH_COLOR_IDX)
  })

  it('classifies the whole POISON band 0x78..0x7B as poison', async () => {
    const m = await loadMushroom()
    for (const v of [0x78, 0x79, 0x7a, 0x7b]) {
      expect(m.isPoison(v)).toBe(true)
    }
  })

  it('classifies normal mushroom stamps 0x7C..0x7F as NOT poison', async () => {
    // The boundary: 0x7C = NORMAL is the first non-poison value (band ENDS at NORMAL).
    const m = await loadMushroom()
    for (const v of [0x7c, 0x7d, 0x7e, 0x7f]) {
      expect(m.isPoison(v)).toBe(false)
    }
  })

  it('does NOT misclassify the value 0x77 just below the poison band', async () => {
    const m = await loadMushroom()
    expect(m.isPoison(0x77)).toBe(false) // 0x77 is GROWTH territory, not poison
  })

  it('ignores the background bit when classifying (0x80 | poison is still poison)', async () => {
    const m = await loadMushroom()
    expect(m.isPoison(0x80 | 0x79)).toBe(true) // low 7 bits decide, per conway.ts:133
  })
})
