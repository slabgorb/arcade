// tests/joust-jt9-43.test.ts
//
// Story jt9-43 — RED phase (Mr. Praline / TEA). narrowPhase DROPS BPCOL's COLDX
// screen-X term, so the mask test is X-BLIND.
//
// ─── THE DEFECT ──────────────────────────────────────────────────────────────
// The ROM's span-mask test BPCOL (JOUSTRV4.SRC:7043) compares the two objects'
// collision columns in SCREEN space: at :7047/:7051/:7062 it `SUBD COLDX` — the
// screen-X separation of the two sprites (COLDX = the other object's PPOSX minus
// this object's, set at :4916-4917 `SUBD PPOSX,U / STD COLDX`). The port's
// narrowPhase (joust.ts) compares COFF-unbiased SPRITE-LOCAL columns with the
// two origins SUPERIMPOSED (COLDX = 0) and leans entirely on broadPhase (a coarse
// 16px AABB) to carry X. So two sprites up to 15px apart in X whose masks overlap
// when superimposed register a hit the ROM would REJECT once COLDX shifts the
// spans apart.
//
// ─── THE FIX (what these tests pin) ──────────────────────────────────────────
// Fold COLDX into narrowPhase's column compare: MaskRef gains a `left` (the
// entity's screen X, symmetric with the existing `top` = screen Y), and the
// column overlap is taken in SCREEN space — spanB is shifted by the screen-X
// delta COLDX = b.left − a.left before intervalsOverlap (BPCOL's `SUBD COLDX`).
// `left` is OPTIONAL and absent reads as 0, so every dx=0 fixture (COLDX=0) is
// INVARIANT — the existing narrowPhase suite in joust.test.ts stays green.
//
// RED today: narrowPhase ignores screen X entirely, so the dx≠0 rejections below
// all read as collisions.

import { describe, it, expect } from 'vitest'
import { loadJoust } from './helpers/joust-collision-contract.js'
import { loadPictures } from './helpers/pictures-contract.js'

const COFF = 0x0200
/** A synthetic COFF-biased mask row for the given [left,right] pixel span. */
const row = (l: number, r: number): [number, number] => [l + COFF, r + COFF]
const END: [number, number] = [0x8100, 0x8100]

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — narrowPhase is SCREEN-X AWARE: a screen-X delta separates masks that
//        overlap when superimposed.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt9-43 AC-1 — narrowPhase folds the screen-X separation (COLDX) into the column compare', () => {
  it('masks that overlap superimposed (dx=0) still collide — the COLDX=0 invariant', async () => {
    const j = await loadJoust()
    const masks = { A: [row(0, 3), END], B: [row(0, 3), END] }
    // The control: equal screen X → COLDX=0 → the historical behaviour. GREEN now
    // and after the fix. Anchors the AC-1 rejection below as non-vacuous.
    expect(
      j.narrowPhase({ name: 'A', top: 100, left: 0 }, { name: 'B', top: 100, left: 0 }, masks),
      'superimposed identical spans collide',
    ).toBe(true)
  })

  it('the SAME masks 10px apart in X do NOT collide — the COLDX shift pulls the spans apart', async () => {
    const j = await loadJoust()
    const masks = { A: [row(0, 3), END], B: [row(0, 3), END] }
    // THE HEADLINE. spanB [0,3] shifts by COLDX = b.left − a.left = 10 → [10,13],
    // which no longer overlaps [0,3]. RED today: the X-blind narrowPhase compares
    // the superimposed [0,3]×[0,3] and returns true. Kills the do-nothing mutant
    // (ignore `left` → still true).
    expect(
      j.narrowPhase({ name: 'A', top: 100, left: 0 }, { name: 'B', top: 100, left: 10 }, masks),
      '10px of screen-X separation clears masks only 3px wide',
    ).toBe(false)
  })

  it('a screen-X delta that brings disjoint local spans TOGETHER collides — proves the shift SIGN', async () => {
    const j = await loadJoust()
    // A's local span sits to the RIGHT of B's; superimposed they miss.
    const masks = { A: [row(5, 8), END], B: [row(0, 3), END] }
    // Superimposed control: [5,8] vs [0,3] → no overlap. GREEN now and after.
    expect(
      j.narrowPhase({ name: 'A', top: 100, left: 0 }, { name: 'B', top: 100, left: 0 }, masks),
      'disjoint local spans miss when superimposed',
    ).toBe(false)
    // With COLDX = b.left − a.left = +5, spanB shifts +5 → [5,8], landing exactly
    // on A's [5,8]. RED today (X-blind → false). This assertion is the SIGN pin:
    //  • the do-nothing mutant (ignore `left`) → false → reddens;
    //  • the WRONG-SIGN mutant (shift by −COLDX → [−5,−2]) → false → reddens.
    // Only the correct +COLDX shift makes it true.
    expect(
      j.narrowPhase({ name: 'A', top: 100, left: 0 }, { name: 'B', top: 100, left: 5 }, masks),
      'shifting spanB right by COLDX=+5 lands it on spanA',
    ).toBe(true)
  })

  it('a non-zero but EQUAL screen X behaves identically to the absent/zero case (COLDX still 0)', async () => {
    const j = await loadJoust()
    const masks = { A: [row(0, 3), END], B: [row(2, 5), END] }
    // COLDX = 50 − 50 = 0, so this must equal the superimposed result — a control
    // that a mutant keying off absolute `left` (rather than the DELTA) would break.
    const superimposed = j.narrowPhase({ name: 'A', top: 100 }, { name: 'B', top: 100 }, masks)
    const shiftedTogether = j.narrowPhase(
      { name: 'A', top: 100, left: 50 },
      { name: 'B', top: 100, left: 50 },
      masks,
    )
    expect(shiftedTogether, 'only the delta matters, not the absolute origin').toBe(superimposed)
    expect(superimposed, '[0,3] and [2,5] overlap at 2-3 when superimposed').toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — BPCOL byte-for-byte against a REAL transcribed pair (PT1RC × CWNG3R),
//        the exact ptero-lance geometry the third pass runs.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt9-43 AC-2 — real masks: the screen-X shift matches BPCOL on PT1RC × CWNG3R', () => {
  it('the airborne player (CWNG3R) and a ptero (PT1RC) at the dy=−9 lance row collide superimposed but NOT 10px apart', async () => {
    const j = await loadJoust()
    const pics = await loadPictures()
    const masks: Record<string, Array<[number, number]>> = Object.fromEntries(
      pics.COLLISION_TABLES.map((t) => [t.name, t.spans]),
    )
    // dy = pteroTop − playerTop = 101 − 110 = −9. Under j = a.top + i − b.top the
    // ONLY aligned pair is player row 0 [7,9] × PT1RC row 9 [8,15] — a real lance
    // kill at dx=0 (the jt9-14 window). COLDX=0 → overlap at 8-9. GREEN now/after.
    expect(
      j.narrowPhase(
        { name: 'CWNG3R', top: 110, left: 100 },
        { name: 'PT1RC', top: 101, left: 100 },
        masks,
      ),
      'superimposed at the lance row: [7,9] overlaps [8,15]',
    ).toBe(true)
    // Shift the ptero 10px right (still inside broadPhase's 16px box): COLDX=10 →
    // PT1RC row 9 [8,15] → [18,25], clear of the player's [7,9]. RED today
    // (X-blind → true), and BPCOL would reject it. This is the byte-for-byte pin.
    expect(
      j.narrowPhase(
        { name: 'CWNG3R', top: 110, left: 100 },
        { name: 'PT1RC', top: 101, left: 110 },
        masks,
      ),
      '10px of COLDX pulls PT1RC clear of the player mask',
    ).toBe(false)
  })
})
