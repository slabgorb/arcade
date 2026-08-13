// tests/freepad-jt11-9.test.ts
//
// Story jt11-9 — RED phase (Han Solo / TEA). The pad-selection law: a customer
// keeps its VRAND preference when that pad is free, falls through TR1..TR4 to the
// first pad NOT in use when it is taken, and is TURNED AWAY (null) when every pad
// is busy. A pure unit — the ROM's `FREET`/GOTR1..GOTR4 selection isolated from
// the sim, exactly as the story context specifies (AC-4 is not reachable from
// ordinary play — four pads, one arrival per 61 frames — so it must be a unit
// test, not a fixture dressed up as gameplay).
//
// ─── WHAT THE MACHINE DOES (JOUSTRV4.SRC) ───────────────────────────────────
//     CREALL  JSR   FREET        ; pick a transporter that is NOT in use
//     GOTR1   … TR1 … BNE GOTR2  ; fall through TR1, TR2, TR3, TR4 in order
//     GOTR2   …                       (JOUSTRV4.SRC:5687-5709)
//     GOTTR   INC   [TCURUSE,X]  ; the chosen pad is now in use (JOUSTRV4.SRC:5710)
//             …
//             BNE   CRELP        ; all four busy → back to nap, ticket intact
//                                       (JOUSTRV4.SRC:5709)
//
// ─── RED today ──────────────────────────────────────────────────────────────
// `freePad` does not exist. `transporter.ts` exposes `enterViaPads` (the VRAND
// preference draw) but nothing that honours pad occupancy — the port takes the
// preference blind. Importing the missing selector is the RED.

import { describe, it, expect } from 'vitest'
import { freePad, type PadId } from '../src/core/transporter.js'

/** TR1ID..TR4ID — the fall-through order (JOUSTRV4.SRC:5587-5590,5687-5709). */
const FALLTHROUGH_ORDER: readonly PadId[] = ['TR1', 'TR2', 'TR3', 'TR4']

describe('jt11-9 — freePad keeps the preference when it is free (AC-3, AC-5)', () => {
  it('returns the preferred pad when NOTHING is in use — the VRAND draw is unchanged', () => {
    for (const pref of FALLTHROUGH_ORDER) {
      expect(freePad(pref, []), `${pref} is free, so ${pref} keeps it`).toBe(pref)
    }
  })

  it('returns the preferred pad when OTHER pads are busy but the preference itself is free', () => {
    expect(freePad('TR3', ['TR1', 'TR4'])).toBe('TR3')
  })
})

describe('jt11-9 — freePad falls through to the first free pad on contention (AC-3)', () => {
  it('picks the FIRST free pad in TR1..TR4 order, not merely any free pad', () => {
    // Preference TR3 is taken and TR1 is taken, so the first free pad in
    // TR1..TR4 order is TR2 — not TR4. An implementation that returns "the last
    // free pad" or "the pad after the preference" gets this wrong.
    expect(freePad('TR3', ['TR3', 'TR1'])).toBe('TR2')
  })

  it('never hands back a pad that is already in use', () => {
    const chosen = freePad('TR4', ['TR4', 'TR1', 'TR2'])
    expect(chosen).toBe('TR3')
    expect(['TR4', 'TR1', 'TR2'], 'the chosen pad must not be one of the occupied ones').not.toContain(chosen)
  })
})

describe('jt11-9 — freePad turns the customer away when every pad is busy (AC-4)', () => {
  it('returns null when all four pads are in use (BNE CRELP, JOUSTRV4.SRC:5709)', () => {
    expect(freePad('TR1', ['TR1', 'TR2', 'TR3', 'TR4'])).toBeNull()
    expect(freePad('TR4', ['TR4', 'TR3', 'TR2', 'TR1'])).toBeNull()
  })

  it('null means "all busy", not "always null" — freeing one pad makes it selectable again', () => {
    // The control the story context demands: without it, a `freePad` that always
    // returned null would pass the assertion above vacuously.
    expect(freePad('TR1', ['TR2', 'TR3', 'TR4'])).toBe('TR1')
    expect(freePad('TR1', ['TR1', 'TR3', 'TR4'])).toBe('TR2')
  })

  it('is pure and deterministic — same preference and same occupied set, same result', () => {
    expect(freePad('TR3', ['TR3'])).toBe(freePad('TR3', ['TR3']))
    expect(freePad('TR2', ['TR1', 'TR2'])).toBe(freePad('TR2', ['TR1', 'TR2']))
  })
})
