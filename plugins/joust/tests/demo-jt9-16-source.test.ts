// tests/demo-jt9-16-source.test.ts
//
// Story jt9-16 — RED phase (Leeloo / TEA). The PROVENANCE companion to
// demo-jt9-16.test.ts (the jt1-10/jt2-1 double-entry pattern). The behaviour
// suite encodes what the scan DOES with the two cues; this file proves the two
// thud continuations really return OPPOSITE carry in the 1982 source — so that
// aborting on SNPTHD and continuing on SNETHD is FAITHFUL to the machine rather
// than an invented asymmetry. The story's own instruction is "VERIFY THE PORT
// DIRECTION BEFORE IMPLEMENTING"; this is that verification, pinned.
//
// The vendored tree is gitignored, so each byte-read SKIPS where it is absent
// (the jt1-3 degradation pattern).
//
// ─── THE CARRY CONTRACT (JOUSTRV4.SRC) ───────────────────────────────────────
//   Driver, per pair:                         carry decides the next step
//     :4874  25$  LDU  PLINK,U   ← the OUTER walk: a FRESH U each restart
//     :4885       BSR  HITEM
//     :4886       BCS  20$       ← carry SET  → back to 20$/25$ = advance OUTER U
//     :4897  45$  LDX  PLINK,X   ← carry CLEAR falls here = CONTINUE the INNER X
//     :4902       BCC  40$       ← (2nd site) carry CLEAR → 40$ = keep the inner scan
//     :4903       BRA  20$       ← (2nd site) carry SET  → 20$ = abandon this U
//
//   SNETHD path (enemies): OSTH11 JMP HITEM2 → HITEM1 ANDCC #$FE  → carry CLEAR
//     :5028  OSTH11  JSR  OSTBMP
//     :5029          JMP  HITEM2
//     :4947  HITEM1  ANDCC #$FE
//
//   SNPTHD path (persons): OSTXTT JSR OSTXTP BRA OSTX12 → ORCC #$01 → carry SET
//     :5053  OSTXTT  JSR  OSTXTP
//     :5054          BRA  OSTX12
//     :5059  OSTX12  ORCC #$01

import { describe, it, expect } from 'vitest'
import { vendoredAvailable, sourceLines } from './helpers/joust-source.js'

const ROM = 'JOUSTRV4.SRC'

// ─────────────────────────────────────────────────────────────────────────────
// THE DRIVER READS THE CARRY — SET restarts the outer walk, CLEAR continues.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt9-16 — the scan driver branches on HITEM\'s carry', () => {
  it.skipIf(!vendoredAvailable)('the OUTER walk is a fresh LDU PLINK,U (:4874)', () => {
    const l = sourceLines(ROM)[4874 - 1]
    expect(l, ':4874 reloads U from the process link — the outer walk').toMatch(/LDU\s+PLINK,U/)
  })

  it.skipIf(!vendoredAvailable)('carry SET returns to the outer walk: BCS 20$ (:4886)', () => {
    const l = sourceLines(ROM)[4886 - 1]
    expect(l, ':4886 branches to 20$ (the outer restart) when HITEM set carry').toMatch(/BCS\s+20\$/)
  })

  it.skipIf(!vendoredAvailable)('carry CLEAR continues the INNER walk: 45$ LDX PLINK,X (:4897)', () => {
    // The instruction the driver falls through to when :4886 BCS is NOT taken —
    // the next inner partner. This is the "continue" the port already does.
    const l = sourceLines(ROM)[4897 - 1]
    expect(l, ':4897 advances X to the next inner partner').toMatch(/LDX\s+PLINK,X/)
  })

  it.skipIf(!vendoredAvailable)('the second HITEM site splits the SAME way: BCC 40$ (:4902) / BRA 20$ (:4903)', () => {
    const lines = sourceLines(ROM)
    expect(lines[4902 - 1], ':4902 carry CLEAR keeps the inner scan (40$)').toMatch(/BCC\s+40\$/)
    expect(lines[4903 - 1], ':4903 carry SET abandons this object (20$)').toMatch(/BRA\s+20\$/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SNETHD (enemy thud) CLEARS carry → the scan CONTINUES.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt9-16 — SNETHD ends by CLEARING carry (continue)', () => {
  it.skipIf(!vendoredAvailable)('OSTH11 bumps then JMP HITEM2 (:5028-5029)', () => {
    const lines = sourceLines(ROM)
    expect(lines[5028 - 1], ':5028 is the OSTH11 no-death bump').toContain('OSTH11')
    expect(lines[5029 - 1], ':5029 jumps into the carry-clearing tail HITEM2').toMatch(/JMP\s+HITEM2/)
  })

  it.skipIf(!vendoredAvailable)('HITEM1 clears carry with ANDCC #$FE (:4947)', () => {
    const l = sourceLines(ROM)[4947 - 1]
    expect(l, ':4947 masks the carry bit off — carry CLEAR').toContain('HITEM1')
    expect(l, ':4947 is ANDCC #$FE').toMatch(/ANDCC\s+#\$FE/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SNPTHD (person tie) SETS carry → the scan ABORTS this object.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt9-16 — SNPTHD ends by SETTING carry (abort)', () => {
  it.skipIf(!vendoredAvailable)('OSTXTT restores the pair then BRA OSTX12 (:5053-5054)', () => {
    const lines = sourceLines(ROM)
    expect(lines[5053 - 1], ':5053 is the OSTXTT tie tail').toContain('OSTXTT')
    expect(lines[5054 - 1], ':5054 branches to the carry-setting OSTX12').toMatch(/BRA\s+OSTX12/)
  })

  it.skipIf(!vendoredAvailable)('OSTX12 sets carry with ORCC #$01 (:5059)', () => {
    const l = sourceLines(ROM)[5059 - 1]
    expect(l, ':5059 is the OSTX12 label').toContain('OSTX12')
    expect(l, ':5059 ORs the carry bit on — carry SET').toMatch(/ORCC\s+#\$01/)
    expect(l, ':5059 carries the "GET NEXT REG.U GUY" comment — advance the outer walk').toContain('REG.U GUY IS DEAD')
  })
})
