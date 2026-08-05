// tests/ptimup-reset-source.test.ts
//
// Story jt9-8 — RED phase (Leeloo / TEA). The PROVENANCE companion to
// ptimup-reset.test.ts. The behaviour suite says WHAT the port must do with the
// flap-lift budget; this file proves the 1982 source really clears PTIMUP at
// BOTH wing transitions — and, crucially, that the per-frame INCREMENT precedes
// the edge CLEAR and the press impulse PRECEDES its clear. Those two orderings
// are exactly what the behaviour suite's `=== 0` and "reads the spent budget"
// assertions depend on, so if the source ever disagreed the port would be
// faithful to nothing.
//
// The vendored tree is gitignored, so each byte-read SKIPS where it is absent
// (the jt1-3 degradation pattern).
//
// ─── THE PTIMUP RE-INIT CONTRACT (JOUSTRV4.SRC) ──────────────────────────────
//   Per frame, BEFORE the button is even tested:
//     :6167  FLAPLP  JSR  AIROVR      (held loop) — runs AIRTIM…
//     :6194  FLIPLP  JSR  AIROVR      (released loop) — …which is:
//     :6476  AIRTIM  INC  PTIMUP,U    NBR OF TICKS IN THE AIR  (the per-frame ++)
//
//   THEN the button edge is tested and, on a transition, PTIMUP is cleared:
//     :6168          TSTB                 FLAP BUTTON STILL PRESSED?
//     :6169          BEQ  GOFLIP          released → the RELEASE edge
//     :6185  GOFLIP  CLR  PTIMUP,U        RE-INIT BUTTON PRESSES   (release clear)
//
//     :6195          TSTB                 FLAP BUTTON STILL RELEASED?
//     :6196          BNE  GOFLAP          pressed → the PRESS edge
//     :6212  GOFLAP  JSR  ADDFLP          ADD IN NEW X & Y VELOCITIES (reads PTIMUP)
//     :6219          CLR  PTIMUP,U        (press clear — AFTER the impulse)

import { describe, it, expect } from 'vitest'
import { vendoredAvailable, sourceLines } from './helpers/joust-source.js'

const ROM = 'JOUSTRV4.SRC'
const at = (line: number): string | undefined => sourceLines(ROM)[line - 1]

describe('jt9-8 — PTIMUP is cleared on BOTH wing transitions', () => {
  it.skipIf(!vendoredAvailable)('the RELEASE edge clears it: GOFLIP CLR PTIMUP,U — "RE-INIT BUTTON PRESSES" (:6185)', () => {
    const l = at(6185)
    // Match the CLAIM, not a bare token: it is a CLR of PTIMUP, and its own
    // comment says it re-inits the button-press budget.
    expect(l, ':6185 clears PTIMUP').toMatch(/CLR\s+PTIMUP,U/)
    expect(l, ':6185 says it RE-INITs button presses').toMatch(/RE-INIT BUTTON PRESSES/)
    expect(at(6182), ':6182 is the GOFLIP label the release branch targets').toMatch(/^GOFLIP\b/)
  })

  it.skipIf(!vendoredAvailable)('the PRESS edge clears it too: GOFLAP … CLR PTIMUP,U (:6219)', () => {
    expect(at(6212), ':6212 is the GOFLAP label the press branch targets').toMatch(/^GOFLAP\b/)
    expect(at(6219), ':6219 clears PTIMUP on the press path').toMatch(/CLR\s+PTIMUP,U/)
  })
})

describe('jt9-8 — the orderings the port depends on', () => {
  it.skipIf(!vendoredAvailable)('the press impulse ADDFLP (:6212) runs BEFORE the press clear (:6219)', () => {
    // This is why the behaviour suite asserts the press impulse still reads the
    // SPENT budget: ADD IN velocities first, clear only after.
    expect(at(6212), ':6212 adds the new X & Y velocities (the flap impulse)').toMatch(/JSR\s+ADDFLP/)
    expect(6212, 'ADDFLP precedes the press CLR PTIMUP').toBeLessThan(6219)
  })

  it.skipIf(!vendoredAvailable)('AIROVR (:6167) — which INCREMENTS PTIMUP (AIRTIM, :6476) — runs BEFORE the edge clear', () => {
    // Increment-then-clear is why an edge frame ends at 0, not 1.
    expect(at(6167), ':6167 calls AIROVR at the top of the held loop').toMatch(/JSR\s+AIROVR/)
    expect(at(6194), ':6194 calls AIROVR at the top of the released loop').toMatch(/JSR\s+AIROVR/)
    expect(at(6476), ':6476 AIRTIM increments PTIMUP each frame').toMatch(/INC\s+PTIMUP,U/)
    expect(at(6169), ':6169 branches to the release edge only AFTER AIROVR').toMatch(/BEQ\s+GOFLIP/)
    expect(6167, 'AIROVR (the increment) precedes the release edge clear at :6185').toBeLessThan(6185)
  })
})

describe('jt9-8 — the two transitions are detected from the live button, not invented', () => {
  it.skipIf(!vendoredAvailable)('the held loop leaves on RELEASE (TSTB / BEQ GOFLIP, :6168-6169)', () => {
    expect(at(6168), ':6168 tests the flap button in the held loop').toMatch(/^\s*TSTB/)
    expect(at(6169), ':6169 branches to GOFLIP when the button is now released').toMatch(/BEQ\s+GOFLIP/)
  })

  it.skipIf(!vendoredAvailable)('the released loop leaves on PRESS (TSTB / BNE GOFLAP, :6195-6196)', () => {
    expect(at(6195), ':6195 tests the flap button in the released loop').toMatch(/^\s*TSTB/)
    expect(at(6196), ':6196 branches to GOFLAP when the button is now pressed').toMatch(/BNE\s+GOFLAP/)
  })
})
