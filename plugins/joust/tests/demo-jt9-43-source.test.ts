// tests/demo-jt9-43-source.test.ts
//
// Story jt9-43 — RED phase (Mr. Praline / TEA). The PROVENANCE companion: the
// behaviour suites (joust-jt9-43 / demo-jt9-43) encode that narrowPhase now folds
// a screen-X term; THIS file proves that term is the ROM's — BPCOL takes its
// column overlap in SCREEN space by subtracting COLDX, the screen-X separation of
// the two sprites. Without this pin the "fold COLDX" rationale is unguarded prose
// (the sidecar's "a false primary-source sentence ships green").
//
// The vendored tree is gitignored, so each byte-read SKIPS where it is absent (the
// jt1-3 degradation pattern).

import { describe, it, expect } from 'vitest'
import { vendoredAvailable, sourceLines } from './helpers/joust-source.js'

const ROM = 'JOUSTRV4.SRC'

// ─────────────────────────────────────────────────────────────────────────────
// COLDX IS DEFINED AS THE SCREEN-X SEPARATION — the OTHER object's PPOSX minus
// this one's, computed in HITEM's X-intersection test:
//
//   HITEM   ...
//           SUBD  PPOSX,U      D = X-object.PPOSX − U-object.PPOSX   (:4916)
//           STD   COLDX         remember this difference             (:4917)
//
// So COLDX is a signed screen-X delta, exactly `b.posX − a.posX` in the port.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt9-43 — COLDX is the screen-X separation of the two sprites (:4916-4917)', () => {
  it.skipIf(!vendoredAvailable)('HITEM computes COLDX = other.PPOSX − this.PPOSX and stores it', () => {
    const lines = sourceLines(ROM)
    expect(lines[4916 - 1], ':4916 subtracts this object PPOSX to form the X delta').toMatch(/SUBD\s+PPOSX,U/)
    expect(lines[4917 - 1], ':4917 stores that delta as COLDX').toMatch(/STD\s+COLDX/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// BPCOL SUBTRACTS COLDX FROM EVERY COLUMN COMPARISON — the span overlap is taken
// in SCREEN space, not sprite-local space:
//
//   BPCOL   LDD   2,X          this object's right column           (:7043)
//           ...
//           SUBD  COLDX         ...vs the other's left, in SCREEN X  (:7047)
//           BLT   BPYX4          no collision (Y is left of X)
//           LDD   ,X           this object's left column
//           SUBD  2,Y
//           SUBD  COLDX         ...vs the other's right, in SCREEN X (:7051)
//           BGT   BPXY4          no collision (X is left of Y)
//           COMA                COLLISION
//
// The COLDX subtraction recurs at each column-pair the walk visits (:7062 in the
// Y-on-left continuation). These are the lines the port's narrowPhase dropped.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt9-43 — BPCOL folds COLDX into its column overlap (:7043/:7047/:7051/:7062)', () => {
  it.skipIf(!vendoredAvailable)('BPCOL loads a column word at :7043 then subtracts COLDX at :7047 and :7051', () => {
    const lines = sourceLines(ROM)
    expect(lines[7043 - 1], ':7043 is the BPCOL entry loading a column word').toContain('BPCOL')
    expect(lines[7043 - 1], ':7043 loads the object right column (2,X)').toMatch(/LDD\s+2,X/)
    expect(lines[7047 - 1], ':7047 subtracts COLDX from the first column compare').toMatch(/SUBD\s+COLDX/)
    expect(lines[7051 - 1], ':7051 subtracts COLDX from the second column compare').toMatch(/SUBD\s+COLDX/)
  })

  it.skipIf(!vendoredAvailable)('the COLDX subtraction recurs in the Y-on-left continuation at :7062', () => {
    const lines = sourceLines(ROM)
    expect(lines[7062 - 1], ':7062 subtracts COLDX again in the continuation').toMatch(/SUBD\s+COLDX/)
  })
})
