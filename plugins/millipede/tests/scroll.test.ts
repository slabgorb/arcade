// tests/scroll.test.ts
//
// Story ml3-5 — RED phase (TEA). The SCROLLING PLAYFIELD — the subsystem with
// NO centipede analog: SCROLL (`MLSUB.MAC:1105`) dispatches on the signed
// pending-scroll counter SCROLC (`MLDEF.MAC:372` — "1+=UP, -1=DOWN"), SCROLD
// (`MLSUB.MAC:1149`) shifts every mushroom column down one row, SCROLU
// (`MLSUB.MAC:1309`) shifts them up. The core coordinate system is scroll-aware
// from the start: the field is the ml3-4 video-RAM shape (a Uint8Array indexed
// by offset = col*0x20 + row, col 0..29, row 0..31) and SCROLLING MOVES THE
// BYTES — positions stay absolute, content scrolls, exactly as the ROM does it.
// Every rule asserted below carries an SC-* claim in
// docs/rom-study/claims/12-scroll.json, byte-verified against
// reference/original-source/millipede/ by the ml1-1 citation gate.
//
// The story's own bar: pin OUTPUT COORDINATES, not routing (routing != geometry).
// The geometry tests below assert the exact post-scroll byte at explicit
// (col,row) offsets — a scroll that "was called" but shifted the wrong way, the
// wrong rows, or the wrong columns fails them.
//
// ─── WHAT GREEN (Dev) MUST SHIP ───────────────────────────────────────────────
//   src/core/scroll.ts — pure, deterministic, in-place over the field (the
//   conway convention: the ROM has no double buffer). Exports:
//
//     SCROLL_TOP_ROW = 0x1e          // MLSUB.MAC:1157 (SC-20) — down-shift entry row
//     SCROLL_BOTTOM_ROW = 0x02       // MLSUB.MAC:1317 (SC-37) — up-shift entry row
//     GREY_REENTRY_ROW = 0x06        // MLSUB.MAC:1197 (SC-28) — grey bit re-added here
//     GREY_EXIT_ROW = 0x07           // MLSUB.MAC:1350 (SC-43) — grey bit stripped here
//     CONTINUOUS_SCROLL_CENTIN = 4   // MLSUB.MAC:1134 (SC-11)
//     CONTINUOUS_SCROLL_MASK = 0x7f  // MLSUB.MAC:1137 (SC-12)
//     CONTINUOUS_SCROLL_PHASE = 0x1e // MLSUB.MAC:1138 (SC-13)
//
//     interface ScrollGate {
//       attract: boolean            // MODE bit 7 (:1113-1114, SC-5)
//       conwayActive: boolean       // CDONE != 0 (:1115-1116, SC-6)
//       ddtExploding: boolean       // any DDTADD in the explosion bank (:1117-1123, SC-7)
//       playerDead: boolean         // PLAYP != $0A or PEXPLD (:1124-1127, SC-8)
//       hitDdt: boolean             // HITDDT != 0 (:1128-1130, SC-9)
//       segmentsRemaining: number   // DEAD (MLDEF.MAC:295, SC-2/10)
//       centin: number              // CENTIN (MLDEF.MAC:299, SC-3/11)
//       frame: number               // FRAME (:1136)
//     }
//     scrollDispatch(scrolc: number, gate: ScrollGate):
//         { action: 'none' | 'up' | 'down'; scrolc: number }
//       One SCROLL call (:1113-1146). Gates in ROM order; if the
//       continuous-scroll arm fires (:1128-1140, SC-9..14) the returned scrolc
//       is the DECREMENTED counter, then the sign dispatches (SC-15/16/17).
//       Does NOT apply the SCROLD/SCROLU consume — that belongs to the reducers.
//     scrollDown(field: Uint8Array, scrolc: number, rng: Rng):
//         { scrolc: number; mush: number; mushTop: number }
//       One SCROLD call (:1152-1230), upright. Mutates `field` in place;
//       returns scrolc+1 (SC-18) and the MUSH/MUSH+2 count DELTAS (the counts
//       themselves are ml3-3 state). Samples nextInt(rng, 0x100) ONCE per
//       column, sweeping col 29 -> col 0 (:1153/:1224, SC-19/35); a sample with
//       (byte & 0x0f) === 0 plants picture $7F on the top row (SC-23/24/25).
//     scrollUp(field: Uint8Array, scrolc: number):
//         { scrolc: number; mush: number; mushTop: number }
//       One SCROLU call (:1312-1378), upright. No RNG — the incoming bottom
//       cell is always the grey blank $80 (:1329, SC-40). Returns scrolc-1
//       (SC-36) and the count deltas.
//
// ─── SCOPE (recorded in .session/ml3-5-session.md) ────────────────────────────
//   • Upright cabinet only: CKIND clear, like every millipede story so far
//     (cocktail is filed fleet-wide as ml8-3).
//   • The DDT-bomb table halves of SCROLD/SCROLU (:1231-1295 / :1379-1399,
//     SC-49/50) are DESCOPED — the DDTADD pointer table has no core owner yet;
//     routed via Delivery Finding to a filed DDT story.
//   • SCROL0 (:1296-1307, SC-48) — delete the obstacle scrolled onto the player
//     — needs OBSTAC, which ml3-3 owns; deferred there via Delivery Finding.
//
// ─── FIXTURE DERIVATION ──────────────────────────────────────────────────────
//   Geometry expectations were hand-derived from the cited 6502 lines this
//   session. The RNG fixtures use @shared/rng ITSELF to derive the expected
//   draw sequence in-test (the library is the spec of the draw stream, not a
//   reimplementation of the reducer); each fixture asserts its own hit pattern
//   first, so a change to @shared/rng fails loudly instead of silently
//   weakening the test (seed 22: no hits in 30 draws; seed 1: hits on draws
//   0, 1 and 21 — columns 29, 28, 8 under the ROM's right-to-left sweep).

import { describe, it, expect } from 'vitest'
import { createRng, nextInt, type Rng } from '@shared/rng'

// ─── Local type shims (canonical shapes live in Dev's src/core/scroll.ts) ────
interface ScrollGate {
  attract: boolean
  conwayActive: boolean
  ddtExploding: boolean
  playerDead: boolean
  hitDdt: boolean
  segmentsRemaining: number
  centin: number
  frame: number
}
type ScrollAction = 'none' | 'up' | 'down'
interface ScrollDispatch {
  action: ScrollAction
  scrolc: number
}
interface ScrollDelta {
  scrolc: number
  mush: number
  mushTop: number
}
interface ScrollModule {
  SCROLL_TOP_ROW: number
  SCROLL_BOTTOM_ROW: number
  GREY_REENTRY_ROW: number
  GREY_EXIT_ROW: number
  CONTINUOUS_SCROLL_CENTIN: number
  CONTINUOUS_SCROLL_MASK: number
  CONTINUOUS_SCROLL_PHASE: number
  scrollDispatch: (scrolc: number, gate: ScrollGate) => ScrollDispatch
  scrollDown: (field: Uint8Array, scrolc: number, rng: Rng) => ScrollDelta
  scrollUp: (field: Uint8Array, scrolc: number) => ScrollDelta
}

// COMPUTED specifier (the conway.test.ts pattern): tsc cannot resolve it, so
// the RED tree stays lint-clean while the module does not exist; vitest
// resolves it at runtime, relative to this file.
const SCROLL_SPECIFIER = ['..', 'src', 'core', 'scroll'].join('/')

/** Self-describing loader (the ml1-1 pattern): RED proves the feature absent. */
async function loadScroll(): Promise<ScrollModule> {
  try {
    const mod = (await import(/* @vite-ignore */ SCROLL_SPECIFIER)) as Partial<ScrollModule>
    if (typeof mod.scrollDispatch !== 'function') throw new Error('module has no scrollDispatch export')
    if (typeof mod.scrollDown !== 'function') throw new Error('module has no scrollDown export')
    if (typeof mod.scrollUp !== 'function') throw new Error('module has no scrollUp export')
    return mod as ScrollModule
  } catch (e) {
    throw new Error(
      'src/core/scroll.ts not built yet — GREEN (Dev) ports SCROLL + SCROLD + ' +
        'SCROLU (MLSUB.MAC:1105/1149/1309) as pure core reducers: ' +
        `${e instanceof Error ? e.message : String(e)}`,
    )
  }
}

// ─── field helpers (geometry per CW-11; no game logic reimplemented here) ────
const STRIDE = 0x20
const COLS = 30
const SIZE = COLS * STRIDE // $3c0
const idx = (col: number, row: number) => col * STRIDE + row
const emptyField = () => new Uint8Array(SIZE)

/** One column of the field as a plain array, for whole-column toEqual pins. */
const column = (field: Uint8Array, col: number): number[] =>
  Array.from(field.subarray(col * STRIDE, col * STRIDE + STRIDE))

/** The 30 draws scrollDown makes, derived from the same @shared/rng stream. */
function drawsFor(seed: number): number[] {
  const rng = createRng(seed)
  return Array.from({ length: COLS }, () => nextInt(rng, 0x100))
}

/** Columns that receive a top mushroom under the ROM's col 29 -> 0 sweep. */
const hitColumns = (draws: number[]): number[] =>
  draws.map((v, i) => ((v & 0x0f) === 0 ? COLS - 1 - i : -1)).filter((c) => c >= 0)

/** Seed 22: no draw hits — pure geometry, no random mushrooms. */
const QUIET_SEED = 22
/** Seed 1: draws 0, 1, 21 hit — columns 29, 28, 8 right-to-left. */
const NOISY_SEED = 1

/** A gate that lets scrolling happen but disarms the continuous-scroll arm. */
const openGate = (over: Partial<ScrollGate> = {}): ScrollGate => ({
  attract: false,
  conwayActive: false,
  ddtExploding: false,
  playerDead: false,
  hitDdt: false,
  segmentsRemaining: 8,
  centin: 0,
  frame: 0,
  ...over,
})

/** A gate with the continuous-scroll arm fully armed (SC-9..13). */
const armedGate = (over: Partial<ScrollGate> = {}): ScrollGate =>
  openGate({ centin: 4, frame: 0x1e, ...over })

// ─────────────────────────────────────────────────────────────────────────────
describe('cited constants (SC claims in docs/rom-study/claims/12-scroll.json)', () => {
  it('exports the cited scroll geometry and timer constants', async () => {
    const mod = await loadScroll()
    expect(mod.SCROLL_TOP_ROW).toBe(0x1e) // MLSUB.MAC:1157 (SC-20)
    expect(mod.SCROLL_BOTTOM_ROW).toBe(0x02) // MLSUB.MAC:1317 (SC-37)
    expect(mod.GREY_REENTRY_ROW).toBe(0x06) // MLSUB.MAC:1197 (SC-28)
    expect(mod.GREY_EXIT_ROW).toBe(0x07) // MLSUB.MAC:1350 (SC-43)
    expect(mod.CONTINUOUS_SCROLL_CENTIN).toBe(4) // MLSUB.MAC:1134 (SC-11)
    expect(mod.CONTINUOUS_SCROLL_MASK).toBe(0x7f) // MLSUB.MAC:1137 (SC-12)
    expect(mod.CONTINUOUS_SCROLL_PHASE).toBe(0x1e) // MLSUB.MAC:1138 (SC-13)
  })
})

describe('scrollDispatch — SCROLL (MLSUB.MAC:1113-1146)', () => {
  it('attract mode gates all scrolling, pending count preserved (SC-5)', async () => {
    const mod = await loadScroll()
    expect(mod.scrollDispatch(-2, openGate({ attract: true }))).toEqual({ action: 'none', scrolc: -2 })
  })

  it('an active CONWAY metamorphosis gates scrolling (SC-6)', async () => {
    const mod = await loadScroll()
    expect(mod.scrollDispatch(-1, openGate({ conwayActive: true }))).toEqual({ action: 'none', scrolc: -1 })
  })

  it('an exploding DDT gates scrolling (SC-7)', async () => {
    const mod = await loadScroll()
    expect(mod.scrollDispatch(1, openGate({ ddtExploding: true }))).toEqual({ action: 'none', scrolc: 1 })
  })

  it('a dead player gates scrolling (SC-8)', async () => {
    const mod = await loadScroll()
    expect(mod.scrollDispatch(1, openGate({ playerDead: true }))).toEqual({ action: 'none', scrolc: 1 })
  })

  it('SCROLC zero with the arm disarmed scrolls nothing (SC-15)', async () => {
    const mod = await loadScroll()
    expect(mod.scrollDispatch(0, openGate())).toEqual({ action: 'none', scrolc: 0 })
  })

  it('negative SCROLC dispatches down, positive up (SC-16/17, MLDEF.MAC:372 SC-1)', async () => {
    const mod = await loadScroll()
    expect(mod.scrollDispatch(-1, openGate())).toEqual({ action: 'down', scrolc: -1 })
    expect(mod.scrollDispatch(-3, openGate())).toEqual({ action: 'down', scrolc: -3 })
    expect(mod.scrollDispatch(2, openGate())).toEqual({ action: 'up', scrolc: 2 })
  })

  it('the continuous-scroll tick queues a DOWN scroll at frame phase $1E (SC-11..14)', async () => {
    const mod = await loadScroll()
    expect(mod.scrollDispatch(0, armedGate())).toEqual({ action: 'down', scrolc: -1 })
    // FRAME is masked with $7F: phase repeats every 128 frames (SC-12).
    expect(mod.scrollDispatch(0, armedGate({ frame: 0x80 + 0x1e }))).toEqual({ action: 'down', scrolc: -1 })
  })

  it('the continuous tick can swallow a pending up-scroll to zero (SC-14/15)', async () => {
    const mod = await loadScroll()
    expect(mod.scrollDispatch(1, armedGate())).toEqual({ action: 'none', scrolc: 0 })
  })

  it('a tick against a larger pending up-count still dispatches UP on the final sign (SC-14/17)', async () => {
    const mod = await loadScroll()
    // The tick decrements, but the counter is still positive — the action must
    // come from the post-tick sign, not from the tick having fired.
    expect(mod.scrollDispatch(2, armedGate())).toEqual({ action: 'up', scrolc: 1 })
  })

  it('the tick fires only at phase $1E (SC-13)', async () => {
    const mod = await loadScroll()
    expect(mod.scrollDispatch(0, armedGate({ frame: 0x1d }))).toEqual({ action: 'none', scrolc: 0 })
    expect(mod.scrollDispatch(0, armedGate({ frame: 0x1f }))).toEqual({ action: 'none', scrolc: 0 })
  })

  it('the tick needs CENTIN==4; other lengths still dispatch pending scrolls (SC-11)', async () => {
    const mod = await loadScroll()
    expect(mod.scrollDispatch(0, armedGate({ centin: 3 }))).toEqual({ action: 'none', scrolc: 0 })
    expect(mod.scrollDispatch(-1, armedGate({ centin: 3 }))).toEqual({ action: 'down', scrolc: -1 })
  })

  it('a hit DDT or a dead train skips the tick but not the dispatch (SC-9/10)', async () => {
    const mod = await loadScroll()
    expect(mod.scrollDispatch(0, armedGate({ hitDdt: true }))).toEqual({ action: 'none', scrolc: 0 })
    expect(mod.scrollDispatch(-1, armedGate({ hitDdt: true }))).toEqual({ action: 'down', scrolc: -1 })
    expect(mod.scrollDispatch(0, armedGate({ segmentsRemaining: 0 }))).toEqual({ action: 'none', scrolc: 0 })
    expect(mod.scrollDispatch(1, armedGate({ segmentsRemaining: 0 }))).toEqual({ action: 'up', scrolc: 1 })
  })
})

describe('scrollDown — SCROLD (MLSUB.MAC:1152-1230), upright', () => {
  it('the quiet fixture really is quiet (fixture guard)', () => {
    expect(hitColumns(drawsFor(QUIET_SEED))).toEqual([])
  })

  it('consumes one pending down-scroll: returns scrolc+1 (SC-18)', async () => {
    const mod = await loadScroll()
    const out = mod.scrollDown(emptyField(), -2, createRng(QUIET_SEED))
    expect(out.scrolc).toBe(-1)
    expect(out.mush).toBe(0)
    expect(out.mushTop).toBe(0)
  })

  it('shifts a full column down one row, grey bit re-added at row 6 (SC-26/27/28/29)', async () => {
    const mod = await loadScroll()
    const field = emptyField()
    for (let r = 0; r < STRIDE; r++) field[idx(10, r)] = 0x20 + r
    mod.scrollDown(field, -1, createRng(QUIET_SEED))
    const expected: number[] = []
    expected[0] = 0x20 // rows 0-1: below the shift window, untouched (SC-27)
    expected[1] = 0x21
    for (let r = 2; r <= 0x1d; r++) expected[r] = 0x20 + r + 1 // new[r] = old[r+1]
    expected[6] = (0x20 + 7) | 0x80 // the row entering the player area goes grey (SC-29)
    expected[0x1e] = 0 // top row: quiet seed plants nothing (SC-23)
    expected[0x1f] = 0x3f // row $1F: outside the playfield window, untouched
    expect(column(field, 10)).toEqual(expected)
  })

  it('scrolls every column — 0 and 29 included — as an in-place mutation (SC-19/35)', async () => {
    const mod = await loadScroll()
    const field = emptyField()
    field[idx(0, 0x10)] = 0x22
    field[idx(29, 0x10)] = 0x33
    mod.scrollDown(field, -1, createRng(QUIET_SEED))
    expect(field[idx(0, 0x0f)]).toBe(0x22)
    expect(field[idx(0, 0x10)]).toBe(0)
    expect(field[idx(29, 0x0f)]).toBe(0x33)
    expect(field[idx(29, 0x10)]).toBe(0)
  })

  it('on an empty field only the grey re-entry row changes: $80 in row 6 of every column', async () => {
    const mod = await loadScroll()
    const field = emptyField()
    mod.scrollDown(field, -1, createRng(QUIET_SEED))
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < STRIDE; r++) {
        expect(field[idx(c, r)]).toBe(r === 6 ? 0x80 : 0)
      }
    }
  })

  it('a poison mushroom scrolled into the player area becomes normal (SC-30)', async () => {
    const mod = await loadScroll()
    const field = emptyField()
    field[idx(3, 7)] = 0x79 // poison stage 1 -> row 6
    field[idx(4, 7)] = 0x71 // a death stage: NOT in the poison band, unconverted
    field[idx(5, 7)] = 0x7c // a normal: already past the band, unconverted
    field[idx(6, 7)] = 0x78 // POISON itself — the band's INCLUSIVE lower edge (SC-30)
    field[idx(7, 7)] = 0x77 // GROWTH+2 — one byte under the band, unconverted
    field[idx(8, 7)] = 0x7b // the last poison stage — still inside the band
    mod.scrollDown(field, -1, createRng(QUIET_SEED))
    expect(field[idx(3, 6)]).toBe(0xfd) // ($79 | $80 | $04) — poison -> grey normal
    expect(field[idx(4, 6)]).toBe(0xf1) // ($71 | $80) — grey bit only
    expect(field[idx(5, 6)]).toBe(0xfc) // ($7C | $80) — grey bit only
    expect(field[idx(6, 6)]).toBe(0xfc) // ($78 | $80 | $04) — CMP I,80+78 is inclusive
    expect(field[idx(7, 6)]).toBe(0xf7) // ($77 | $80) — under the band, grey bit only
    expect(field[idx(8, 6)]).toBe(0xff) // ($7B | $80 | $04) — last in-band value converts
  })

  it('a mushroom pushed off the bottom row decrements MUSH (SC-31/32)', async () => {
    const mod = await loadScroll()
    const field = emptyField()
    field[idx(2, 2)] = 0xfc // grey normal mushroom on the bottom shift row
    field[idx(9, 2)] = 0xfc
    field[idx(11, 2)] = 0x80 | 0x6e // grey DDT stamp: $6E < $70, NOT counted (SC-31)
    const out = mod.scrollDown(field, -1, createRng(QUIET_SEED))
    expect(out.mush).toBe(-2)
    expect(out.mushTop).toBe(0)
  })

  it('a mushroom crossing the region boundaries adjusts MUSH/MUSH+2 (SC-21/22/33/34)', async () => {
    const mod = await loadScroll()
    const field = emptyField()
    field[idx(7, 0x0c)] = 0x7c // -> row $0B: enters the bottom count region
    field[idx(20, 0x14)] = 0x7c // -> row $13: leaves the top count region
    const out = mod.scrollDown(field, -1, createRng(QUIET_SEED))
    expect(field[idx(7, 0x0b)]).toBe(0x7c)
    expect(field[idx(20, 0x13)]).toBe(0x7c)
    expect(out.mush).toBe(1)
    expect(out.mushTop).toBe(-1)
  })

  it('the $70 ROCK is exactly on the push-off count threshold; $6F is under it (SC-31, SC-51)', async () => {
    const mod = await loadScroll()
    const field = emptyField()
    field[idx(2, 2)] = 0xf0 // grey ROCK: ($F0 & $7F) === $70 — counted (MLDEF.MAC:204)
    field[idx(9, 2)] = 0xef // grey $6F (DDT+1): one byte under the threshold — not counted
    const out = mod.scrollDown(field, -1, createRng(QUIET_SEED))
    expect(out.mush).toBe(-1)
    expect(out.mushTop).toBe(0)
  })

  it('the ROCK threshold holds at the down-scroll region boundaries too (SC-33/34, SC-51)', async () => {
    const mod = await loadScroll()
    const field = emptyField()
    field[idx(7, 0x0c)] = 0x70 // ROCK -> row $0B: enters the bottom region, counted
    field[idx(8, 0x0c)] = 0x6f // $6F -> row $0B: under the threshold, not counted
    field[idx(20, 0x14)] = 0x70 // ROCK -> row $13: leaves the top region, counted
    field[idx(21, 0x14)] = 0x6f // $6F -> row $13: under the threshold, not counted
    const out = mod.scrollDown(field, -1, createRng(QUIET_SEED))
    expect(out.mush).toBe(1)
    expect(out.mushTop).toBe(-1)
  })

  it('the noisy fixture hits columns 29, 28, 8 (fixture guard)', () => {
    expect(hitColumns(drawsFor(NOISY_SEED))).toEqual([29, 28, 8])
  })

  it('plants $7F top-row mushrooms right-to-left, one draw per column (SC-19/23/24/25)', async () => {
    const mod = await loadScroll()
    const field = emptyField()
    const out = mod.scrollDown(field, -1, createRng(NOISY_SEED))
    const topRow = Array.from({ length: COLS }, (_, c) => field[idx(c, 0x1e)])
    const expected = Array.from({ length: COLS }, (_, c) => ([29, 28, 8].includes(c) ? 0x7f : 0))
    // Column order is load-bearing: a col 0 -> 29 sweep would plant 0, 1, 21.
    expect(topRow).toEqual(expected)
    expect(out.mushTop).toBe(3) // one MUSH+2 increment per planted mushroom (SC-24)
    expect(out.mush).toBe(0)
  })
})

describe('scrollUp — SCROLU (MLSUB.MAC:1312-1378), upright', () => {
  it('consumes one pending up-scroll: returns scrolc-1 (SC-36)', async () => {
    const mod = await loadScroll()
    const out = mod.scrollUp(emptyField(), 2)
    expect(out.scrolc).toBe(1)
    expect(out.mush).toBe(0)
    expect(out.mushTop).toBe(0)
  })

  it('shifts a full column up one row: grey blank in at row 2, grey stripped at row 7 (SC-37/40/41/43/44)', async () => {
    const mod = await loadScroll()
    const field = emptyField()
    for (let r = 0; r < STRIDE; r++) field[idx(10, r)] = 0x20 + r
    field[idx(10, 6)] = 0x80 | 0x26 // player-area cell carries the grey bit
    mod.scrollUp(field, 1)
    const expected: number[] = []
    expected[0] = 0x20 // rows 0-1: untouched
    expected[1] = 0x21
    expected[2] = 0x80 // the incoming grey blank (SC-40)
    for (let r = 3; r <= 0x1e; r++) expected[r] = 0x20 + r - 1 // new[r] = old[r-1]
    expected[7] = 0x26 // grey bit stripped leaving the player area (SC-44)
    expected[0x1f] = 0x3f // untouched; old row $1E pushed off (SC-42)
    expect(column(field, 10)).toEqual(expected)
  })

  it('on an empty field only the bottom entry row changes: $80 in row 2 of every column', async () => {
    const mod = await loadScroll()
    const field = emptyField()
    mod.scrollUp(field, 1)
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < STRIDE; r++) {
        expect(field[idx(c, r)]).toBe(r === 2 ? 0x80 : 0)
      }
    }
  })

  it('a mushroom pushed off the top row decrements MUSH+2 (SC-45)', async () => {
    const mod = await loadScroll()
    const field = emptyField()
    field[idx(14, 0x1e)] = 0x7c
    const out = mod.scrollUp(field, 1)
    expect(out.mushTop).toBe(-1)
    expect(out.mush).toBe(0)
  })

  it('a mushroom crossing the region boundaries adjusts MUSH/MUSH+2 (SC-38/39/46/47)', async () => {
    const mod = await loadScroll()
    const field = emptyField()
    field[idx(4, 0x0b)] = 0x7c // -> row $0C: leaves the bottom count region
    field[idx(25, 0x13)] = 0x7c // -> row $14: enters the top count region
    const out = mod.scrollUp(field, 1)
    expect(field[idx(4, 0x0c)]).toBe(0x7c)
    expect(field[idx(25, 0x14)]).toBe(0x7c)
    expect(out.mush).toBe(-1)
    expect(out.mushTop).toBe(1)
  })

  it('the $70 ROCK is exactly on the up-scroll count threshold; $6F is under it (SC-45, SC-51)', async () => {
    const mod = await loadScroll()
    const field = emptyField()
    field[idx(14, 0x1e)] = 0x70 // ROCK pushed off the top — counted (MLDEF.MAC:204)
    field[idx(15, 0x1e)] = 0x6f // $6F pushed off — under the threshold, not counted
    const out = mod.scrollUp(field, 1)
    expect(out.mushTop).toBe(-1)
    expect(out.mush).toBe(0)
  })

  it('the ROCK threshold holds at the up-scroll region boundaries too (SC-46/47, SC-51)', async () => {
    const mod = await loadScroll()
    const field = emptyField()
    field[idx(4, 0x0b)] = 0x70 // ROCK -> row $0C: leaves the bottom region, counted
    field[idx(5, 0x0b)] = 0x6f // $6F -> row $0C: under the threshold, not counted
    field[idx(25, 0x13)] = 0x70 // ROCK -> row $14: enters the top region, counted
    field[idx(26, 0x13)] = 0x6f // $6F -> row $14: under the threshold, not counted
    const out = mod.scrollUp(field, 1)
    expect(out.mush).toBe(-1)
    expect(out.mushTop).toBe(1)
  })
})
