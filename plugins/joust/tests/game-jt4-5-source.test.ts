// tests/game-jt4-5-source.test.ts
//
// Story jt4-5 — RED phase (Leeloo / TEA). The PROVENANCE companion to the jt4-5
// behaviour suites. The one genuinely NEW ROM law this story cites is the PLAYER
// REBIRTH path (respawn); everything else it leans on — GOVER (JT44), the co-op /
// survival / gladiator bounties (JT43), the egg laws (JT2x) — is already gated. So
// this file RE-DERIVES the rebirth path straight out of the vendored 1982 source
// with the INDEPENDENT reader (tests/helpers/joust-source.ts — the jt1-3 double
// entry; nothing under src/ may import it) and pins the JT45-* claims.
//
// ─── THE REBIRTH PATH, RE-DERIVED ────────────────────────────────────────────
//   • CREP1/CREP2 "BEING CREATED/RE-CREATED" (JOUSTRV4.SRC:5610-5611): the process a
//     dead player re-enters through.
//   • DECLIV "DECREMENT NBR OF LIVES" (:5613) → the man count drops (DECLIV body
//     `DECA` "1 LESS MAN LEFT" :5399 / `STA 5,X` "SAVE THIS AS NBR OF LIVES LEFT" :5400).
//   • `BEQ PLYDIE` (:5614): if the DEC hit ZERO, branch away — no re-create.
//   • PLYDIE (:5605) → EMYDIE `JMP VSUCIDE` (:5606): the man is GONE (stays out).
// So a dead player WITH lives re-enters; a player at ZERO lives stays out — exactly
// the respawn behaviour tests/game-jt4-5.test.ts pins through stepGame.
//
// ─── DEGRADATION (the CI path) ───────────────────────────────────────────────
// CI clones only the joust subrepo and has no vendored tree, so every source
// re-derivation SKIPS there (describe.skipIf(!vendoredAvailable)); the claim-coverage
// checks read the committed claims/ and run EVERYWHERE. Every vendored read lives
// INSIDE an it() body (the tp1-8 collection trap).
//
// ─── THE JT45 CLAIM NAMESPACE ────────────────────────────────────────────────
// jt4-1..jt4-4 own JT41..JT44; jt4-5 owns "JT45-NNN". "JT45-001".startsWith("JT4")
// is TRUE, so coverage here matches the FULL "JT45-" prefix — never a bare "JT4".

import { describe, it, expect } from 'vitest'
import { vendoredAvailable, sourceLines } from './helpers/joust-source.js'
// jt9-2 swept this suite's local pre-hardening claims plumbing onto the shared
// loader jt8-3 extracted. The local clone was named `covers` rather than
// `claimCovers` — same body, so the call sites below just take the shared name.
import { loadClaims, claimCovers, type Claim } from './helpers/claims.js'

// ─── Claims: the loader is `./helpers/claims.js` (jt9-2) ─────────────────────
// Only the JT45- id namespace filter is local to this file.
function jt45Claims(claims: Claim[]): Claim[] {
  return claims.filter((c) => (c.id ?? '').startsWith('JT45-'))
}
const line = (n: number): string => sourceLines('JOUSTRV4.SRC')[n - 1] ?? ''

// ─────────────────────────────────────────────────────────────────────────────
// THE REBIRTH PATH — re-derived from the four cited sites.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('rebirth source — CREP/DECLIV/PLYDIE (JOUSTRV4.SRC:5390-5400 / 5605-5618)', () => {
  it('CREP1/CREP2 is the "BEING CREATED/RE-CREATED" process a dead player re-enters through', () => {
    expect(line(5610), 'CREP1 creates player 1').toMatch(/CREP1\s+EQU/)
    expect(line(5610), 'the comment names creating player 1').toContain('CREATE PLAYER 1')
    expect(line(5611), 'CREP2 creates player 2').toMatch(/CREP2\s+EQU/)
  })

  it('the re-create DECrements the man count and branches away at zero (BEQ PLYDIE)', () => {
    expect(line(5613), 'the re-create calls DECLIV').toMatch(/JSR\s+DECLIV/)
    expect(line(5613), 'the comment names the lives decrement').toContain('DECREMENT NBR OF LIVES')
    expect(line(5614), 'and BEQ PLYDIE when the DEC hit zero (no re-create)').toMatch(/BEQ\s+PLYDIE/)
  })

  it('DECLIV drops the man count by one (DECA "1 LESS MAN LEFT" / STA "NBR OF LIVES LEFT")', () => {
    expect(line(5399), 'DECA takes one man off').toMatch(/DECA/)
    expect(line(5399), 'the comment: one less man').toContain('1 LESS MAN LEFT')
    expect(line(5400), 'stored back as the remaining lives').toMatch(/STA\s+5,X/)
    expect(line(5400), 'the comment names the lives store').toContain('NBR OF LIVES LEFT')
  })

  it('PLYDIE is the terminal — at zero lives the man is GONE (JMP VSUCIDE, stays out)', () => {
    expect(line(5605), 'PLYDIE is the death label the zero-lives branch targets').toMatch(/^PLYDIE/)
    expect(line(5606), 'EMYDIE shares it and the process suicides — no re-create').toMatch(/EMYDIE\s+JMP\s+VSUCIDE/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// JT45 claim coverage — runs EVERYWHERE (no vendored tree needed).
// ─────────────────────────────────────────────────────────────────────────────
describe('JT45 claim coverage — the jt4-5 rebirth-path citations are committed claims', () => {
  it('jt4-5 commits JT45-* claims covering the rebirth path (docs/rom-study/claims/game-jt4-5.json)', () => {
    const jt45 = jt45Claims(loadClaims())
    expect(jt45.length, 'jt4-5 commits JT45-* claims for the rebirth path').toBeGreaterThan(0)
    expect(claimCovers(jt45, 'JOUSTRV4.SRC', 5610, 5611), 'a JT45 claim cites CREP1/CREP2 (re-create)').toBe(true)
    expect(claimCovers(jt45, 'JOUSTRV4.SRC', 5613, 5614), 'a JT45 claim cites DECLIV + BEQ PLYDIE').toBe(true)
    expect(claimCovers(jt45, 'JOUSTRV4.SRC', 5390, 5400), 'a JT45 claim cites the DECLIV man-count decrement').toBe(true)
    expect(claimCovers(jt45, 'JOUSTRV4.SRC', 5605, 5606), 'a JT45 claim cites PLYDIE (zero lives → the man is gone)').toBe(true)
  })

  it('every JT45 id is well-formed and globally unique (no collision with JT4-*/JT41..JT44-*)', () => {
    const all = loadClaims()
    for (const c of jt45Claims(all)) expect(c.id, 'JT45 ids match JT45-NNN').toMatch(/^JT45-\d+$/)
    const ids = all.map((c) => c.id).filter(Boolean)
    expect(new Set(ids).size, 'all claim ids are globally unique').toBe(ids.length)
  })

  it.skipIf(!vendoredAvailable)('every JT45 claim verbatim actually appears at its cited source line (byte-gate)', () => {
    for (const c of jt45Claims(loadClaims())) {
      if (!c.source?.verbatim) continue
      const actual = sourceLines(c.source.file)[c.source.line - 1] ?? ''
      expect(actual, `${c.id}: verbatim must match ${c.source.file}:${c.source.line}`).toContain(
        c.source.verbatim.trim(),
      )
    }
  })
})
