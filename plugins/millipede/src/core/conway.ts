// src/core/conway.ts
//
// Story ml3-4 (GREEN) — the CONWAY Life field: Mark Cerny's Life algorithms for
// Millipede, ported line-by-line from `CONWAY.MAC` (July 1982). Between waves
// the game runs this process over the playfield: a Game-of-Life VARIANT grows
// and kills mushrooms in place. No sibling code exists (centipede has nothing
// like it) and no design-doc prose survives (MILLI.DOC absent, ml1 OQ-2) — the
// 6502 is the only spec. Every constant and rule below is cited to a CW-* claim
// in docs/rom-study/claims/08-conway.json, byte-verified against
// reference/original-source/millipede/ by the ml1-1 citation gate.
//
// ─── RADIX ──────────────────────────────────────────────────────────────────
// CONWAY.MAC sets `.RADIX 16` (line 4): every ROM literal quoted here is hex.
//
// ─── SHAPE OF THE PROCESS ───────────────────────────────────────────────────
// INICON arms the process (CW-3/4/5/6). Each MASTER call (CONWAY.MAC:25-114)
// sweeps a slice of the field — half a column (16 cells) in phase 0, a full
// column (32 cells) in later phases (CW-21/22) — and persists its pointer
// between calls (the ROM's CTEMP1/CTEMP2 page-3 registers are ConwayState).
// Phase 0 (STARTGR) computes one Life generation IN PLACE: there is no double
// buffer — the picture-code scheme itself preserves previous-generation
// semantics (a fresh birth is GROWTH, which never counts as a neighbour,
// CW-38, while conversions of existing mushrooms still count). Phases
// 1..MAXPH-1 (GROWDIE) animate the growth/death stages one step per sweep;
// a sweep that advances nothing ends the process early (CW-24); if the player
// keeps re-damaging the field for all MAXPH-1 sweeps, phase MAXPH (CLEANUP)
// converts unfinished growth and the process ends — "TIMER RAN OUT" (CW-25).
//
// ─── SCOPE (see .session/ml3-4-session.md, Delivery Findings) ───────────────
// Upright cabinet only: CKIND (cocktail) is modelled clear, so the player area
// is rows < 7 (CONWAY.MAC:46-48, CW-20). The MUSH count seam (MUSHE1 increment
// at birth / MUSHDC decrement at total death, MLSUB.MAC:742/707, CW-61/63) is
// deferred to the ml3-3 mushroom-field reducers.

// ─── geometry (MLDEF.MAC:103, CW-11) ────────────────────────────────────────
// PLYFLD = $1000, "30 WIDE BY 32 HIGH". A ROM address decomposes as
// row = addr & $1F (the low 5 bits) and col = (addr - PLYFLD) >> 5; this
// module's field drops the base and indexes by offset = col*PLYFLD_STRIDE+row.
export const PLYFLD_WIDTH = 30
export const PLYFLD_HEIGHT = 32
export const PLYFLD_STRIDE = 0x20
export const PLYFLD_SIZE = PLYFLD_WIDTH * PLYFLD_STRIDE // $3C0 — OBST end $13C0 (CW-23)

// ─── picture-code bands (MLDEF.MAC:203-208) ─────────────────────────────────
export const DDT = 0x6e // first of 2 stamps for the DDT bomb (CW-12)
export const DEATHS = 0x71 // dying mushroom pictures $71..$74 (CW-13)
export const GROWTH = 0x75 // growing mushroom pictures $75..$77 (CW-14)
export const POISON = 0x78 // poisoned mushroom pictures $78..$7B (CW-15)
export const NORMAL = 0x7c // normal mushroom pictures $7C..$7F (CW-16)

// ─── process constants (MLDEF.MAC:192-193) ──────────────────────────────────
export const MAXPH = 8 // maximum number of growth tries (CW-9)
export const EDGE = 2 // mushrooms assumed touching on a screen edge (CW-10)

// The player area under an upright CKIND: rows below 7 (CONWAY.MAC:46-48,
// CW-20). MSKORA is "0 OR 80" — the grey-background bit re-imposed on every
// rewritten cell (MLDEF.MAC:411, CW-17).
const PLAYER_AREA_ROWS = 0x07
const BACKGROUND_BIT = 0x80

// GRCODE (CONWAY.MAC:320-327, CW-34/35/64/65/66) — the 5x5 neighbourhood
// template, column-major, 5 entries per column, anchored 2 columns and 2 rows
// behind the swept cell (TEMP2 = OBST - $42, CW-6). "0 IS NORMAL CONWAY, 1 IS
// ALWAYS GROW, 2 IS IGNORE": the inner ring is the straight Conway count, the
// outer fairy ring (cardinal distance-2 cells) is the poison-forces-growth ring.
const GRCODE: readonly number[] = [
  2, 1, 1, 1, 2, // CONWAY.MAC:323 (CW-34)
  1, 0, 0, 0, 1, // :324 (CW-64)
  1, 0, 2, 0, 1, // :325 (CW-35)
  1, 0, 0, 0, 1, // :326 (CW-65)
  2, 1, 1, 1, 2, // :327 (CW-66)
]

export interface ConwayState {
  /** PHASE (MLDEF.MAC:404, CW-7): 0 setup, 1..MAXPH-1 execute, MAXPH end. */
  phase: number
  /** CDONE (MLDEF.MAC:407, CW-8): false idle, true active. */
  active: boolean
  /** OBST as a PLYFLD-relative offset, persisted between calls (CTEMP1, CW-6). */
  addr: number
  /**
   * NGROWN (CONWAY.MAC:146/158, CW-56/58): the last picture code an execute
   * sweep advanced — only ever TESTED FOR ZERO (:87-88). An activity marker,
   * not a count (MLDEF.MAC:408's comment overstates it; see CW-56/58).
   */
  ngrown: number
}

/** INICON (CONWAY.MAC:11-22, CW-3/4/5/6): arm the process at the field base. */
export function initConway(): ConwayState {
  return { phase: 0, active: true, addr: 0, ngrown: 0 }
}

/**
 * STARTGR (CONWAY.MAC:165-319) — phase 0's per-cell generation setup: count
 * the 5x5 template around `addr` and convert the cell to the picture that
 * encodes its fate.
 */
function startgr(field: Uint8Array, addr: number): void {
  const row = addr & 0x1f
  if (row >= PLYFLD_STRIDE - 2 || row < 2) return // :167-170 (CW-26/27)
  let colmax = 0xa0 // :172-173 — 5 template columns x $20 (CW-28)
  let mshttl = 0 // :174-175 — the adjoining-mushroom accumulator
  let x = 0
  let y = 0
  // :178-195 — left screen page (OBST high byte $10, i.e. addr < $400):
  if (addr < 0x20) {
    // column 0: two template columns fall off the edge (CW-29/30/67)
    x = 0x0a
    y = 0x40 // LDY #40 (CW-67)
    mshttl = EDGE
  } else if (addr < 0x40) {
    // column 1: one template column falls off (CW-31/68)
    x = 5
    y = 0x20 // LDY #20 (CW-68)
  }
  // :196-213 — right screen page (OBST high byte $13, addr >= $380):
  if (addr >= 0x3a0) {
    // column 29: scan stops after three template columns (CW-32)
    colmax = 0x60
    mshttl = EDGE // (CW-30)
  } else if (addr >= 0x380) {
    colmax = 0x80 // column 28: four template columns (CW-33)
  }
  const temp2 = addr - 0x42 // the template anchor (CW-6)
  // :214-264 — walk the template
  for (;;) {
    const code = GRCODE[x]
    if (code === 0) {
      const v = field[temp2 + y] & 0x7f
      if (v === DDT || v === DDT + 1) {
        mshttl |= 0x80 // :218-224 — a bomb stamp in the inner ring (CW-36)
      } else if (v >= POISON && v < NORMAL) {
        mshttl |= 0x20 // :226-232 — poison in the inner ring (CW-37)
      } else if (v >= DEATHS && v !== GROWTH) {
        // :234-238 — count it, UNLESS it is a fresh same-sweep birth (CW-38)
        mshttl = (mshttl + 1) & 0xff
      }
    } else if (code === 1) {
      const v = field[temp2 + y] & 0x7f
      if (v >= POISON && v < NORMAL) {
        mshttl |= 0x10 // :243-251 — fairy-ring poison forces growth (CW-39)
      }
    }
    x++
    y++
    if ((y & 0x1f) !== 5) continue // :253-258 — end of template row
    y += 0x1b // :259-262 — next template column
    if (y === colmax) break // :263-264 — end of template
  }
  // :265-319 — the fate of the swept cell
  const mskora = row < PLAYER_AREA_ROWS ? BACKGROUND_BIT : 0 // MASTER :38-51 (CW-20)
  const v = field[addr] & 0x7f
  let out: number
  if (v === 0) {
    const t = mshttl & 0x7f // :270-271 — a blank ignores the DDT flag
    if (t < 0x20 && (t === 3 || t >= 0x10)) {
      // :272-280 — "GROW ON 3 OR 10" unless the poison flag is set (CW-40/41);
      // planted via MUSHE1 (MLSUB.MAC:742), whose store ORs the EXISTING
      // background bit — not MSKORA (:770-771, CW-42/62). MUSHE1's own row
      // gates (rows 0, 1, $1F) are subsumed by startgr's gate above.
      field[addr] = GROWTH | (field[addr] & BACKGROUND_BIT)
      return
    }
    out = 0
  } else if (v < NORMAL) {
    out = v // :283-286 — letters, poison, stages in progress: left alone (CW-43)
  } else if (mshttl & 0x80) {
    out = POISON + 3 // :287-291 — a normal beside a DDT bomb is poisoned (CW-44)
  } else if (mshttl >= 0x20 || mshttl === 0 || (mshttl < 0x10 && mshttl >= 4)) {
    // :292-299 — die on poison adjacency, zero, or 4+; survival is 1..3
    // (CW-45/47/48). The dying normal maps to its equivalent death picture
    // (:309-312, CW-52).
    out = v - (NORMAL - DEATHS)
  } else if (v === NORMAL + 3) {
    out = v // :300-302 — completely grown stays (CW-49)
  } else {
    // :303-307 — a damaged normal regrows: SEC SBC #NORMAL-1 yields 1,2,3
    // with carry set; LSR; ADC #GROWTH -> GROWTH+1 or GROWTH+2 (CW-50/51).
    const d = v - (NORMAL - 1)
    out = (d >> 1) + GROWTH + (d & 1)
  }
  const stored = out | mskora // :313-314
  if (stored === POISON + 3 + BACKGROUND_BIT) return // :315-316 — "NO POISON MUSHROOM IN PLAYER AREA" (CW-53)
  field[addr] = stored // :317-318
}

/**
 * GROWDIE (CONWAY.MAC:131-162) — phases 1..MAXPH-1: advance one growth/death
 * stage per sweep. Returns the updated NGROWN.
 */
function growdie(field: Uint8Array, addr: number, ngrown: number): number {
  const row = addr & 0x1f
  const mskora = row < PLAYER_AREA_ROWS ? BACKGROUND_BIT : 0
  const v = field[addr] & 0x7f
  if (v < DEATHS || v >= POISON) return ngrown // :134-137 — stages only (CW-54)
  let out: number
  if (v >= GROWTH) {
    if (v === POISON - 1) {
      out = NORMAL + 3 // :140-142 — grown all the way, NGROWN untouched (CW-55)
    } else {
      out = v + 1 // :144-146 — still growing (CW-56)
      ngrown = out
    }
  } else if (v === DEATHS) {
    // :151-154 — died totally; MUSHDC (the count seam) deferred to ml3-3
    // (CW-57/63). NGROWN untouched.
    out = 0
  } else {
    out = v - 1 // :156-158 — still dying (CW-58)
    ngrown = out
  }
  field[addr] = out | mskora // :160-161
  return ngrown
}

/**
 * CLEANUP (CONWAY.MAC:117-128) — phase MAXPH, reached only when the player
 * prolongs the process (CW-59): unfinished growth stages become the
 * equivalent shot-away NORMAL stages (+7, CW-60). Death stages are not its
 * business — they freeze.
 */
function cleanup(field: Uint8Array, addr: number): void {
  const row = addr & 0x1f
  const mskora = row < PLAYER_AREA_ROWS ? BACKGROUND_BIT : 0
  const v = field[addr] & 0x7f
  if (v < GROWTH || v >= POISON) return // :120-123
  field[addr] = (v + (NORMAL - GROWTH)) | mskora // :124-127
}

/**
 * MASTER (CONWAY.MAC:25-114) — one call of the master control program: sweep
 * 16 cells (phase 0) or 32 cells (later phases), mutate `field` in place, and
 * return the next state. The input state is never mutated.
 */
export function masterStep(field: Uint8Array, state: ConwayState): ConwayState {
  if (!state.active) return { ...state } // idle: the mainline would not call MASTER
  let { phase, addr, ngrown } = state
  let active = true
  for (;;) {
    const row = addr & 0x1f
    // :32-37 — remove the score rows ($1E/$1F) and row 0 (CW-18/19)
    if (row < PLYFLD_STRIDE - 2 && row >= 1) {
      if (phase === 0) {
        startgr(field, addr) // :52-54
      } else if (phase === MAXPH) {
        cleanup(field, addr) // :56-58
      } else {
        ngrown = growdie(field, addr, ngrown) // :59-60
      }
    }
    addr += 1 // :63-70
    const mask = phase === 0 ? 0x0f : 0x1f // :71-77 (CW-21/22)
    if ((addr & mask) !== 0) continue // :78
    break
  }
  if (addr === PLYFLD_SIZE) {
    // :79-106 — we have finished the screen (OBST == $13C0, CW-23)
    if (phase !== 0 && ngrown === 0) phase = MAXPH // :85-91 — "MUSHROOMS ALL GROWN" (CW-24)
    phase += 1 // :93
    ngrown = 0 // :94-95
    addr = 0 // :96-98
    if (phase === MAXPH + 1) active = false // :99-104 — "TIMER RAN OUT, END CONWAY" (CW-25)
  }
  return { phase, addr, ngrown, active }
}
