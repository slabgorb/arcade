// tests/demo-jt9-11-source.test.ts
//
// Story jt9-11 — RED phase (TEA, Mr. Praline). The SOURCE-RE-DERIVATION companion
// to tests/demo-jt9-11.test.ts. The behaviour suite drives the grip with the ROM's
// lava-troll constants as literals; this file RE-DERIVES each of them straight out
// of the vendored 1982 source with the INDEPENDENT reader (tests/helpers/
// joust-source.ts — the jt1-3 double-entry, which nothing under src/ may import),
// and pins the demo's transcription against it.
//
// ─── THE DOUBLE-ENTRY (the jt1-3 tautology trap) ─────────────────────────────
// Dev transcribes the hand-animation constants into src/core/demo.ts one way; this
// file reads them out of JOUSTRV4.SRC another way, and the gate is that the two
// agree. A derivation that re-bakes its own misreading cannot pass a reader it did
// not write.
//
// ─── DEGRADATION (the CI path) ───────────────────────────────────────────────
// CI has no vendored tree, so every source re-derivation SKIPS there
// (describe.skipIf(!vendoredAvailable)). Every vendored read lives INSIDE an it()
// body (the tp1-8 collection trap).
//
// Node env on purpose (dynamic import of demo.js). This header never spells the
// vitest env directive as a token.

import { describe, it, expect } from 'vitest'
import { vendoredAvailable, sourceLines, evalNumber } from './helpers/joust-source.js'

// ─── The independent raw-line reader (the troll-source.test.ts idiom) ─────────
function line(n: number): string {
  return sourceLines('JOUSTRV4.SRC')[n - 1] ?? ''
}
/** Pull the operand off a `<label?> <OP> #?<operand> …` instruction line. */
function operandOf(n: number, op: string): string {
  const m = line(n).match(new RegExp(`\\b${op}\\s+#?([^\\s;]+)`))
  if (!m) throw new Error(`no ${op} operand on JOUSTRV4.SRC:${n} — got: ${JSON.stringify(line(n))}`)
  return m[1]
}

// FLOOR EQU $00DF (JOUSTRV4.SRC:37) — needed to evaluate FLOOR-9 / FLOOR+7 operands.
const FLOOR = 0xdf

/**
 * jt9-11's new demo.ts constant exports, with a self-describing RED (local loader).
 * GREEN adds them to src/core/demo.ts as it wires the LT1HT hand animation.
 */
interface TrollWiringConsts {
  TROLL_HAND_START_Y: number
  TROLL_X_OFFSET: number
  TROLL_EXTENDED_FRAME: number
  TROLL_GRIP_Y_OFFSET: number
  TROLL_FRAME_STEP: number
}
const REQUIRED = [
  'TROLL_HAND_START_Y',
  'TROLL_X_OFFSET',
  'TROLL_EXTENDED_FRAME',
  'TROLL_GRIP_Y_OFFSET',
  'TROLL_FRAME_STEP',
] as const
async function loadWiringConsts(): Promise<TrollWiringConsts> {
  const mod = (await import(['..', '..', 'src', 'core', 'demo.js'].join('/'))) as Record<string, unknown>
  const missing = REQUIRED.filter((k) => typeof mod[k] !== 'number')
  if (missing.length) {
    throw new Error(
      `jt9-11 not built — demo.ts must export the LT1HT hand-animation constants ` +
        `${missing.join(', ')}. GREEN transcribes them from JOUSTRV4.SRC: the hand starts ` +
        `at FLOOR-9 (:6783), offset -2 in X from its victim (:6786), extends to frame 5*6 ` +
        `(:1614) in steps of 6 (:1623), and grabs at victim pixelY + (10-7) (:1629).`,
    )
  }
  return mod as unknown as TrollWiringConsts
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 source — the LT1HT hand-animation constants re-derive from the 1982 source
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('jt9-11 source — the LT1HT hand-tracking constants (JOUSTRV4.SRC)', () => {
  // The independent reader is the ROM LINE TEXT; the JS side computes the value
  // (5*6, 10-7). A re-vendoring that changed the expression would fail the regex,
  // and a wrong transcription would fail the module-agreement `toBe`.
  it('the extended grab frame is 5*6 = 30 (CMPA #5*6, :1614) and the frame steps by 6 (ADDA #6, :1623)', async () => {
    expect(line(1614), 'the extended-frame compare').toMatch(/CMPA\s+#5\*6\b/)
    expect(line(1623), 'the frame advance').toMatch(/ADDA\s+#6\b/)
    expect(evalNumber(operandOf(1623, 'ADDA')), 'one row is 6').toBe(6)
    const c = await loadWiringConsts()
    expect(c.TROLL_EXTENDED_FRAME, 'demo agrees the extended frame is 5*6 = 30').toBe(5 * 6)
    expect(c.TROLL_FRAME_STEP, 'demo agrees the frame step is 6').toBe(6)
  })

  it('the grip Y offset is 10-7 = 3 (ADDB #10-7, :1629) — victim pixelY + 3 is the grab point', async () => {
    expect(line(1629), 'proper hand-grip offset').toMatch(/ADDB\s+#10-7\b/)
    const c = await loadWiringConsts()
    expect(c.TROLL_GRIP_Y_OFFSET, 'demo agrees the grip offset is 10-7 = 3').toBe(10 - 7)
  })

  it('the LAVTIM frame timer reloads PJOYT each animation step (LDA LAVTIM / STA PJOYT,U, :1611-1612)', () => {
    // The cadence this story wires LAVTIM to: it is RE-LOADED into the frame timer
    // every time a frame advances. That is the read site ROW_DISPOSITION.LAVTIM cites.
    expect(line(1611), 'LAVTIM is loaded').toMatch(/LDA\s+LAVTIM/)
    expect(line(1612), 'into the per-frame timer PJOYT').toMatch(/STA\s+PJOYT,U/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 source — the LNDB7 spawn seeds: floor start, X offset, victim finger-print
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('jt9-11 source — the LNDB7 troll spawn seeds (JOUSTRV4.SRC:6781-6786)', () => {
  it('the hand starts on the floor (LDD #FLOOR-9, :6783) → pixel row 214', async () => {
    expect(line(6783), 'the starting Y').toMatch(/LDD\s+#FLOOR-9\b/)
    const c = await loadWiringConsts()
    expect(c.TROLL_HAND_START_Y, 'demo agrees the hand starts at FLOOR-9 = 214').toBe(FLOOR - 9)
  })

  it('the troll is offset -2 in X from its victim (ADDD #-2, :6786)', async () => {
    expect(line(6786), 'the X offset').toMatch(/ADDD\s+#-2/)
    expect(evalNumber(operandOf(6786, 'ADDD')), 'the lava-troll X offset').toBe(-2)
    const c = await loadWiringConsts()
    expect(c.TROLL_X_OFFSET, 'demo agrees the X offset is -2').toBe(-2)
  })

  it('the victim is finger-printed on the troll (STU PJOY,Y, :6781) — the PJOY binding this story adds', () => {
    expect(line(6781), 'STU PJOY,Y stamps the victim workspace').toMatch(/STU\s+PJOY,Y/)
    expect(line(6781), "and the comment names it the lava troll's finger-print").toContain('FINGER PRINT')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3/AC-4 source — the grab repoints gravity, seeds the grip, scores the escape
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('jt9-11 source — LT1GRP repoints gravity and PATCH1 seeds the grip', () => {
  it('the grab repoints the victim to ADDLAV (LDX #ADDLAV / STX PADGRA,U, :1651-1652)', () => {
    expect(line(1651), "the victim's gravity becomes ADDLAV").toMatch(/LDX\s+#ADDLAV/)
    expect(line(1652), 'stored into PADGRA (the gravity vector)').toMatch(/STX\s+PADGRA,U/)
  })

  it('the grab seeds the grip via PATCH1 (JSR PATCH1, :1664) — troll.beginGrip', () => {
    expect(line(1664), 'the grip is seeded by PATCH1').toMatch(/JSR\s+PATCH1/)
  })

  it('the lava death line is FLOOR+7 (CMPA #FLOOR+7, :6620) and the escape scores $50 (:6668)', () => {
    expect(line(6620), 'bird in the lava?').toMatch(/CMPA\s+#FLOOR\+7/)
    expect(evalNumber(operandOf(6620, 'CMPA').replace('FLOOR', String(FLOOR))), 'FLOOR+7 = 230').toBe(FLOOR + 7)
    expect(line(6668), '50 points for breaking free').toMatch(/LDA\s+#\$50/)
    // $50 is a BCD byte scored via SCRTEN (DAA) — the AWARDED value is decimal 50,
    // which troll.ESCAPE_SCORE already holds and demo-jt9-11.test.ts asserts.
    expect(evalNumber('$50'), 'the raw byte is 0x50').toBe(0x50)
  })
})
