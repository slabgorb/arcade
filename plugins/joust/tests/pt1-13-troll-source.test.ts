// tests/pt1-13-troll-source.test.ts
//
// Story pt1-13 — RED phase (Leeloo / TEA). The PROVENANCE + SOURCE-RE-DERIVATION
// companion to tests/pt1-13-troll-no-pull-through-platform.test.ts. That file encodes
// the LAVVIC range-gate BEHAVIOUR; this one RE-DERIVES its three release tests straight
// out of the vendored 1982 source with the INDEPENDENT reader (tests/helpers/
// joust-source.ts, which nothing under src/ may import — the jt1-3 double-entry) and
// pins the claim that must cover LAVVIC.
//
// ─── DEGRADATION (the CI path) ───────────────────────────────────────────────
// CI has no vendored tree, so every source re-derivation SKIPS there
// (describe.skipIf(!vendoredAvailable)); the claim-coverage check reads the committed
// claims/ and runs EVERYWHERE. Every vendored read lives INSIDE an it() body (the
// tp1-8 collection trap).
//
// ─── evalOperand's reach ─────────────────────────────────────────────────────
// The reader evaluates `+`, `$`, decimals and negative literals, but NOT infix `-`
// nor the `FLOOR` symbol. So `#240` and `#-2` are re-derived numerically, while the
// left bound `#54-14` and the reach line `#FLOOR+7-32` are pinned as verbatim operand
// TEXT plus an in-test arithmetic cross-check (54-14 = 40; $DF+7-32 = 198). The double
// entry still holds: the module transcribes the constants one way, this file reads the
// source another, and the boundary tests in the behaviour file gate that they agree.

import { describe, it, expect } from 'vitest'
import { vendoredAvailable, sourceLines, evalOperand } from './helpers/joust-source.js'
import { loadTroll } from './helpers/troll-contract.js'
import { loadClaims, claimCovers } from './helpers/claims.js'

const FLOOR = 0xdf // JOUSTRV4.SRC:37 FLOOR = $DF

function line(n: number): string {
  return sourceLines('JOUSTRV4.SRC')[n - 1] ?? ''
}
function operandOf(n: number, op: string): string {
  const m = line(n).match(new RegExp(`\\b${op}\\s+#?(\\S+)`))
  if (!m) throw new Error(`no ${op} operand on JOUSTRV4.SRC:${n} — got: ${JSON.stringify(line(n))}`)
  return m[1]
}

// ─────────────────────────────────────────────────────────────────────────────
// LAVVIC — the three release tests re-derive out of JOUSTRV4.SRC:1711-1731.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('pt1-13 source — LAVVIC re-derives (JOUSTRV4.SRC:1711-1731)', () => {
  it('is the range gate the grip caller runs every frame (LAVVFY → BNE LAVATF, :1702-1703)', () => {
    expect(line(1702), 'LAVVFY calls LAVVIC').toMatch(/LAVVFY\s+BSR\s+LAVVIC/)
    expect(line(1702)).toContain('WITHIN RANGE')
    expect(line(1703), 'out of range branches to the give-up LAVATF').toMatch(/BNE\s+LAVATF/)
    // ADDLAV re-runs the reach arm after every fall step (JOUSTRV4.SRC:6653).
    expect(line(6653), 'the per-frame reach re-check inside ADDLAV').toMatch(/JSR\s+LAVVI3/)
    expect(line(6654), 'out of reach breaks the grip free (ADLFRE)').toMatch(/BNE\s+ADLFRE/)
  })

  it('release test 1 — GROUNDED (PSTATE != 0) is out of range (:1716-1717)', () => {
    expect(line(1716), 'reads PSTATE — is the object still in the air?').toMatch(/LDA\s+PSTATE,Y/)
    expect(line(1716)).toContain('IN THE AIR')
    expect(line(1717), 'not airborne → out').toMatch(/BNE\s+LVVOUT/)
  })

  it('release test 2 — TOO HIGH: pixelY below FLOOR+7-32 = 198 is out of reach (:1718-1720)', () => {
    expect(line(1718), 'reads the whole-pixel Y').toMatch(/LDA\s+PPOSY\+1,Y/)
    expect(line(1718)).toContain('TOO HIGH')
    // evalOperand cannot fold `FLOOR+7-32`; pin the verbatim operand, cross-check the math.
    expect(operandOf(1719, 'CMPA'), 'the reach line is FLOOR+7-32, verbatim').toBe('FLOOR+7-32')
    expect(FLOOR + 7 - 32, '$DF + 7 - 32 = 198').toBe(198)
    expect(line(1720), 'strictly above (BLO) → out').toMatch(/BLO\s+LVVOUT/)
  })

  it('release test 3 — the CENTRAL band posX-2 in (40, 240) is out of range (CLIF5 BOUNDS, :1721-1726)', () => {
    expect(line(1721), 'reads PPOSX').toMatch(/LDD\s+PPOSX,Y/)
    expect(operandOf(1722, 'ADDD'), 'the -2 fudge for the exact x match').toBe('-2')
    expect(evalOperand('-2')).toBe(-2)
    // Left bound: `CMPD #54-14 / BLE LVVIN` — posX-2 <= 40 is IN (a left lava gap).
    expect(operandOf(1723, 'CMPD'), 'the left bound is 54-14, verbatim').toBe('54-14')
    expect(54 - 14, '54 - 14 = 40').toBe(40)
    expect(line(1724), 'BLE → in range on the left').toMatch(/BLE\s+LVVIN/)
    // Right bound: `CMPD #240 / BLT LVVOUT` — posX-2 < 240 is OUT (central platforms).
    expect(evalOperand(operandOf(1725, 'CMPD')), 'the right bound re-derives to 240').toBe(240)
    expect(line(1725), 'the 1982 comment names the central band').toContain('CLIF5 BOUNDS')
    expect(line(1726), 'BLT → out in the central band').toMatch(/BLT\s+LVVOUT/)
  })

  it('the module agrees at the re-derived bounds (double entry)', async () => {
    const t = await loadTroll()
    // Reach line 198 = FLOOR+7-32, shared with outOfTrollReach.
    expect(t.trollVictimInRange(20, 197, true), 'above 198 → out').toBe(false)
    expect(t.trollVictimInRange(20, 198, true), 'at 198 → in').toBe(true)
    // The central band the ROM's #240 / #54-14 fence off.
    expect(t.trollVictimInRange(148, 210, true), 'posX-2 = 146 ∈ (40,240) → out').toBe(false)
    expect(t.trollVictimInRange(242, 210, true), 'posX-2 = 240 → in (right lava gap)').toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// CLAIM COVERAGE — runs EVERYWHERE (reads the committed claims/, not the vendored
// tree). RED until Dev (GREEN) adds a claims/troll.json entry covering LAVVIC.
// ─────────────────────────────────────────────────────────────────────────────
describe('pt1-13 — the LAVVIC range gate is pinned by a claims/*.json entry', () => {
  it('loads a non-empty claims set (the guard must have teeth)', () => {
    expect(loadClaims().length).toBeGreaterThan(0)
  })

  it('a committed claim covers the LAVVIC routine JOUSTRV4.SRC:1711-1731', () => {
    expect(
      claimCovers(loadClaims(), 'JOUSTRV4.SRC', 1711, 1731),
      'no committed claim pins LAVVIC — add an entry citing JOUSTRV4.SRC:1711-1731 to ' +
        'docs/rom-study/claims/troll.json',
    ).toBe(true)
  })

  it('a committed claim covers the ADDLAV per-frame reach re-check JOUSTRV4.SRC:6653', () => {
    expect(
      claimCovers(loadClaims(), 'JOUSTRV4.SRC', 6653, 6654),
      'no committed claim pins the ADLX/LAVVI3 reach re-check at :6653',
    ).toBe(true)
  })
})
