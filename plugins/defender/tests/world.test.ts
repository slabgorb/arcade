// plugins/defender/tests/world.test.ts
//
// Story df3-2 — RED phase (Leeloo / TEA). The world-wrap coordinate model + camera
// slide: Defender's scrolling, wrapping world and the ship-leads-scroll camera —
// the epic's self-declared RISKIEST seam. Ported line-for-line from the ROM at
// reference/original-source/defender/DEFA7.SRC + PHR6.SRC (ROM-always-wins), NOT a
// tidier world-absolute re-derivation whose slide math can't be cited.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────────
// src/core/world.ts does not exist yet. loadWorld() throws a self-describing
// "not built yet" per test (the scheduler.test.ts / purity.test.ts pattern), so a
// RED failure proves the FEATURE is absent — never a cryptic module-resolution trace.
//
// ─── ROUTING != GEOMETRY (guardrail 1 — the reason this file exists) ──────────────
// A test that only asks "did the world scroll when I thrust?" passes while the
// ship-leads offset or the slide clamp is subtly wrong. Every assertion below pins a
// COORDINATE — an exact BGL, an exact target column, an exact BGDELT — not a
// direction. Expect a Reviewer mutation battery over the slide math; these are the
// mutants it will throw, pinned in advance.
//
// ─── THE ROM MODEL THIS SUITE PINS ───────────────────────────────────────────────
// BGL "TERRAIN LEFT POINTER" (defender/PHR6.SRC:215) is the CAMERA — the world-X of the
// screen's left edge. BGLX "OLD TERRAIN LEFT" (defender/PHR6.SRC:216) is last frame's camera.
// The world is a 16-BIT HORIZONTAL CYLINDER: BGL and every world-X wrap at $10000,
// no clamp. Absolute world X is DERIVED, not stored: worldX = onscreen + BGL, a pure
// helper (PLABX, defender/PHR6.SRC:335; defender/DEFA7.SRC:2432-2440).
//
// THE SHIP LEADS THE SCROLL — PLAY1 (defender/DEFA7.SRC:2373-2431):
//   • It maps velocity to a TARGET screen column: base $20 facing-right
//     (defender/DEFA7.SRC:2385), base $70 facing-left (defender/DEFA7.SRC:2389), plus a velocity
//     column that only applies when facing AGREES with the velocity sign (the
//     TSTB / BMI PV1A / BMI PV2 gate, defender/DEFA7.SRC:2386-2393) — otherwise it is cleared
//     (CLR PCX, :2392-2393) and the target is the bare base.
//   • It slides BGL toward that target by BGDELT (defender/DEFA7.SRC:2397-2415):
//       diff = target − plax16 (PV2A SUBD PLAX16, :2397)
//       diff  >  $100     → BGDELT = +$40, plax16 += $100   (:2400-2406)
//       diff  ≤ −$100     → BGDELT = −$40, plax16 −= $100   (:2407-2413)
//       −$100 < diff ≤ $100 → BGDELT = 0   (in range)       (:2401,2408,2414)
//     NOTE THE ASYMMETRY, a deliberate ROM boundary: `CMPD #$100 / BLS PV9` makes
//     diff == +$100 land IN range (no slide), while `CMPD #-$100 / BGT PV9` makes
//     diff == −$100 land OUT of range (it DOES slide). +$100 = no slide, −$100 = slide.
//   • It saves BGLX = old BGL (:2419-2420), CLAMPS plaxv to [−$100,+$100]
//     (:2421-2428), then integrates: BGL = BGL + plaxv_clamped − BGDELT (:2429-2431),
//     16-bit-wrapped.
//
// VERTICAL is a CLAMPED STRIP, not a cylinder — TWO rules on one axis (guardrail 2):
//   • Player Y CLAMPS to [YMIN+1, 238]: PLAUP `CMPB #YMIN+1 / BLS PLAYX` freezes
//     upward motion at YMIN+1 (defender/DEFA7.SRC:2450); PLADN `CMPB #238 / BHS PLAYX` freezes
//     downward motion at 238 (defender/DEFA7.SRC:2461).
//   • Object Y WRAPS on [YMIN, YMAX]: VELO `CMPA #YMIN / …LDA #YMAX` and
//     `CMPA #YMAX / …LDA #YMIN` (defender/DEFA7.SRC:2490-2496).
//   YMIN=42 / YMAX=240 are DECIMAL (defender/PHR6.SRC:20-21; guardrail 7 — a re-radixed $42/$240
//   is silent drift). A single shared "wrap Y" helper on both axes is a fidelity bug.
//
// ─── CONTRACT (what GREEN/Dev must build) ────────────────────────────────────────
//   export type Facing = 'right' | 'left'                    // PLADIR sign (BMI=left)
//   export const YMIN: 42; export const YMAX: 240            // decimal
//   export function wrap16(x: number): number                // ((x % 0x10000)+…) & 0xFFFF
//   export function worldX(onscreenX: number, bgl: number): number   // (onscreen+bgl) wrap16
//   export function targetColumn(plaxv: number, facing: Facing): number  // PCX, 16-bit
//   export function clampPlayerY(y: number): number          // → [YMIN+1, 238]
//   export function wrapObjectY(y: number): number           // wrap on [YMIN, YMAX]
//   export interface SlideResult {
//     bgl: number; bglx: number; plax16: number; bgdelt: number; plaxv: number }
//   export function slide(input: {
//     bgl: number; plax16: number; plaxv: number; facing: Facing }): SlideResult
//
// AC6 (every constant backed by a claims/*.json entry, byte-verified by
// tests/audit/citations.test.ts) and AC7 (purity.test.ts) are enforced by the EXISTING
// armed gates the moment world.ts + its claim entries land — they are NOT duplicated
// here (the scheduler.test.ts / framebuffer.test.ts precedent). GREEN must ENROLL the
// new constants ($20/$70/$40/$100 hex; YMIN/YMAX decimal; BGL/BGLX/PLABX) — none is in
// claims/ today except YMAX (incidentally, in 02-dialect.json) — or citations reddens.

import { describe, it, expect } from 'vitest'

type Facing = 'right' | 'left'

interface SlideResult {
  readonly bgl: number
  readonly bglx: number
  readonly plax16: number
  readonly bgdelt: number
  readonly plaxv: number
}

interface WorldModule {
  YMIN: number
  YMAX: number
  wrap16: (x: number) => number
  worldX: (onscreenX: number, bgl: number) => number
  targetColumn: (plaxv: number, facing: Facing) => number
  clampPlayerY: (y: number) => number
  wrapObjectY: (y: number) => number
  slide: (input: { bgl: number; plax16: number; plaxv: number; facing: Facing }) => SlideResult
}

async function loadWorld(): Promise<WorldModule> {
  try {
    const mod = (await import('../src/core/world.js')) as Partial<WorldModule>
    for (const name of [
      'wrap16',
      'worldX',
      'targetColumn',
      'clampPlayerY',
      'wrapObjectY',
      'slide',
    ] as const) {
      if (typeof mod[name] !== 'function') throw new Error(`no \`${name}\` export`)
    }
    if (typeof mod.YMIN !== 'number' || typeof mod.YMAX !== 'number') {
      throw new Error('no numeric YMIN/YMAX exports')
    }
    return mod as WorldModule
  } catch (e) {
    throw new Error(
      'src/core/world.ts not built yet — GREEN (Dev) creates the pure world/camera ' +
        'model ported from defender/DEFA7.SRC:2373-2496 + defender/PHR6.SRC:20-21,215-216,335: ' +
        'wrap16 (16-bit cylinder), worldX(onscreen,bgl)=onscreen+bgl (PLABX), ' +
        'targetColumn(plaxv,facing) (PLAY1 base $20/$70 + sign-gated velocity column), ' +
        'clampPlayerY→[YMIN+1,238], wrapObjectY on [YMIN,YMAX], and slide() ' +
        '(BGDELT ±$40 / ±$100 window, BGL=BGL+plaxv_clamped−BGDELT, BGLX=old BGL). ' +
        'Pure — no clock, no Date, no surface (purity.test.ts scans src/core). ' +
        'Enroll every new constant in claims/*.json (citations.test.ts byte-verifies). ' +
        `(${(e as Error).message})`,
    )
  }
}

describe('constants — YMIN/YMAX are DECIMAL (defender/PHR6.SRC:20-21; guardrail 7)', () => {
  it('YMIN === 42 and YMAX === 240 — a re-radixed $42/$240 would fail here', async () => {
    const { YMIN, YMAX } = await loadWorld()
    // $42 == 66 and $240 is out of byte range; only the decimal reading passes both.
    expect(YMIN).toBe(42)
    expect(YMAX).toBe(240)
  })
})

describe('wrap16 — the world is a 16-bit horizontal cylinder (wrap at $10000, no clamp)', () => {
  it('$10000 re-enters at 0, and $1FFFF at $FFFF (past the top edge, no clamp)', async () => {
    const { wrap16 } = await loadWorld()
    expect(wrap16(0x10000)).toBe(0x0000)
    expect(wrap16(0x1ffff)).toBe(0xffff)
    expect(wrap16(0x2abcd)).toBe(0xabcd)
  })

  it('a value below 0 re-enters at the HIGH end — −1 → $FFFF (a clamp-to-0 mutant fails)', async () => {
    const { wrap16 } = await loadWorld()
    // BGL − BGDELT can cross below 0; the cylinder wraps it up to $FFFF, never clamps to 0.
    expect(wrap16(-1)).toBe(0xffff)
    expect(wrap16(-0x100)).toBe(0xff00)
  })

  it('leaves an in-range value untouched (not a blanket mod that mangles the identity case)', async () => {
    const { wrap16 } = await loadWorld()
    expect(wrap16(0x0000)).toBe(0x0000)
    expect(wrap16(0x8000)).toBe(0x8000)
    expect(wrap16(0xffff)).toBe(0xffff)
  })
})

describe('worldX — absolute X is DERIVED not stored: onscreen + BGL, wrapped (PLABX)', () => {
  it('adds the camera to the onscreen X: worldX($1000,$2000) === $3000', async () => {
    const { worldX } = await loadWorld()
    expect(worldX(0x1000, 0x2000)).toBe(0x3000)
  })

  it('wraps the SUM at $10000 — worldX($F000,$2000) === $1000, worldX($0001,$FFFF) === 0', async () => {
    const { worldX } = await loadWorld()
    // The sum, not either operand, is the 16-bit cylinder coordinate.
    expect(worldX(0xf000, 0x2000)).toBe(0x1000)
    expect(worldX(0x0001, 0xffff)).toBe(0x0000)
  })
})

describe('targetColumn (PLAY1) — the ship-leads base column, pinned as a COORDINATE', () => {
  // At plaxv == 0 the velocity column is 0, so the target is the BARE base — exact,
  // with zero dependence on the PCX bit-twiddle. This is AC3's base-column pin.
  it('at rest the target is the base column: $2000 facing-right, $7000 facing-left', async () => {
    const { targetColumn } = await loadWorld()
    // base $20 (defender/DEFA7.SRC:2385) / $70 (defender/DEFA7.SRC:2389), in the high byte (column:fraction).
    expect(targetColumn(0x0000, 'right')).toBe(0x2000)
    expect(targetColumn(0x0000, 'left')).toBe(0x7000)
  })

  // The velocity column applies ONLY when facing agrees with the velocity sign
  // (TSTB / BMI PV1A / BMI PV2, defender/DEFA7.SRC:2386-2393). When they DISAGREE the column is
  // CLEARED and the target is the bare base — an exact coordinate, no bit-twiddle.
  it('facing-left with RIGHTWARD (+) velocity clears the column → bare base $7000', async () => {
    const { targetColumn } = await loadWorld()
    expect(targetColumn(0x0100, 'left')).toBe(0x7000)
  })

  it('facing-right with LEFTWARD (−) velocity clears the column → bare base $2000', async () => {
    const { targetColumn } = await loadWorld()
    expect(targetColumn(-0x0100, 'right')).toBe(0x2000)
  })

  // When facing AGREES with velocity, the column leads the ship forward. Derivation of
  // the max-velocity ($0100) column, from defender/DEFA7.SRC:2373-2396:
  //   LDD PLAXV=$0100 → ASRA/RORB ×2 (÷4) = $0040 → CLRA → B=$40
  //   ASRB: $40>>1 = $20 (this byte is the velocity column) → ADDA base
  //   facing-right: $20 + $20 = $40 → target $4000
  //   facing-left : $70 − $20 = $50 → target $5000  (−$0100: $FF00 ÷4 = $FFC0,
  //                                                  B=$C0, ASRB=$E0=−$20, $70+$E0=$50)
  it('facing-right at max forward velocity leads to $4000 (base $20 + column $20)', async () => {
    const { targetColumn } = await loadWorld()
    expect(targetColumn(0x0100, 'right')).toBe(0x4000)
  })

  it('facing-left at max leftward velocity leads to $5000 (base $70 − column $20)', async () => {
    const { targetColumn } = await loadWorld()
    expect(targetColumn(-0x0100, 'left')).toBe(0x5000)
  })
})

describe('slide (PLAY1) — BGLX save + velocity clamp + camera integration, pinned exactly', () => {
  it('BGLX always captures the OLD BGL, even when no slide occurs', async () => {
    const { slide } = await loadWorld()
    // plaxv 0, ship at its base target → diff 0 → no slide; BGL still advances by 0,
    // and BGLX must be the pre-tick camera regardless.
    const r = slide({ bgl: 0x1234, plax16: 0x2000, plaxv: 0x0000, facing: 'right' })
    expect(r.bglx).toBe(0x1234)
  })

  it('exact BGL after N ticks of a known thrust (AC3): +$40/tick settled, BGL $1000 → $1100 over 4', async () => {
    const { slide } = await loadWorld()
    // A small in-range velocity ($40) whose target column is $2800 (right). Seed the ship
    // AT that column so diff stays 0 (BGDELT 0) and BGL advances by exactly plaxv each tick.
    let bgl = 0x1000
    let plax16 = 0x2800
    for (let i = 0; i < 4; i++) {
      const r = slide({ bgl, plax16, plaxv: 0x0040, facing: 'right' })
      expect(r.bgdelt).toBe(0) // stays in range: pure integration, no slide
      bgl = r.bgl
      plax16 = r.plax16
    }
    // BGL = $1000 + 4×$40 = $1100. A per-tick-off-by-one or a dropped `+ plaxv` fails here.
    expect(bgl).toBe(0x1100)
  })

  it('clamps plaxv to +$100: input $200 advances BGL by $100/tick AND reports plaxv $100', async () => {
    const { slide } = await loadWorld()
    // $0200's velocity column overflows to a negative test byte, so the target is the bare
    // base $2000 (CLR PCX branch); seed plax16 there so diff 0 and only the clamp is exercised.
    const r = slide({ bgl: 0x0000, plax16: 0x2000, plaxv: 0x0200, facing: 'right' })
    expect(r.plaxv).toBe(0x0100) // PV11 clamp: STD PLAXV with the clamped value (:2422-2428)
    expect(r.bgl).toBe(0x0100) // BGL = 0 + $100 − 0
  })

  it('clamps plaxv to −$100: input −$200 reports plaxv −$100 and moves BGL by −$100 (cylinder-wrapped)', async () => {
    const { slide } = await loadWorld()
    // −$200's velocity column comes out NEGATIVE after the ASRA/RORB shifts, so facing-right
    // CLEARS it (CLR PCX branch) → target is the bare base $2000; seed plax16 there so diff 0
    // and only the clamp is exercised. (An input like −$300 would NOT isolate the clamp: its
    // column byte is positive, so target = $4000, a slide — see the Dev deviation for df3-2.)
    const r = slide({ bgl: 0x0100, plax16: 0x2000, plaxv: -0x0200, facing: 'right' })
    expect(r.plaxv).toBe(-0x0100)
    expect(r.bgl).toBe(0x0000) // $0100 + (−$100) − 0
  })
})

describe('slide — the BGDELT ±$40 / ±$100 window, boundary-exact (AC4; the mutation battery)', () => {
  // plaxv 0 → target is the bare base $2000 (right); vary plax16 to set diff = $2000 − plax16.
  it('diff exactly +$100 is IN range — no slide (BGDELT 0); plax16 SNAPS to the target $2000 (BLS boundary)', async () => {
    const { slide } = await loadWorld()
    const r = slide({ bgl: 0x8000, plax16: 0x1f00, plaxv: 0x0000, facing: 'right' })
    // diff = $2000 − $1F00 = +$100; `CMPD #$100 / BLS PV9` → in range → BGDELT 0.
    // In range, PV9 does `LDD PCX / STD PLAX16` (:2414,2416-2417): plax16 becomes the
    // TARGET column ($2000), NOT the input — a mutant that leaves plax16 at $1F00 fails.
    expect(r.bgdelt).toBe(0)
    expect(r.plax16).toBe(0x2000)
    // BGL = $8000 + 0 − 0 = $8000 (no slide, no thrust).
    expect(r.bgl).toBe(0x8000)
  })

  it('diff +$101 (one past the boundary) slides +$40 and steps plax16 by +$100', async () => {
    const { slide } = await loadWorld()
    const r = slide({ bgl: 0x8000, plax16: 0x1eff, plaxv: 0x0000, facing: 'right' })
    // diff = $2000 − $1EFF = +$101 > $100 → BGDELT +$40, plax16 += $100 (:2402-2406).
    expect(r.bgdelt).toBe(0x40)
    expect(r.plax16).toBe(0x1fff)
    // BGL = $8000 + 0 − $40 = $7FC0.
    expect(r.bgl).toBe(0x7fc0)
  })

  it('diff exactly −$100 is OUT of range — DOES slide −$40 (BGT asymmetry vs the + side)', async () => {
    const { slide } = await loadWorld()
    const r = slide({ bgl: 0x8000, plax16: 0x2100, plaxv: 0x0000, facing: 'right' })
    // diff = $2000 − $2100 = −$100; `CMPD #-$100 / BGT PV9` is FALSE at −$100 → slide.
    expect(r.bgdelt).toBe(-0x40)
    expect(r.plax16).toBe(0x2000) // plax16 −= $100 (:2411-2412)
    // BGL = $8000 + 0 − (−$40) = $8040.
    expect(r.bgl).toBe(0x8040)
  })

  it('diff −$FF (one inside the boundary) is IN range — no slide (BGDELT 0)', async () => {
    const { slide } = await loadWorld()
    const r = slide({ bgl: 0x8000, plax16: 0x20ff, plaxv: 0x0000, facing: 'right' })
    // diff = $2000 − $20FF = −$FF > −$100 → in range.
    expect(r.bgdelt).toBe(0)
  })
})

describe('vertical — TWO rules on one axis (guardrail 2), never one shared helper', () => {
  it('player Y CLAMPS to [YMIN+1, 238]: 42→43, 43→43, 238→238, 239→238, interior untouched', async () => {
    const { clampPlayerY } = await loadWorld()
    // PLAUP freezes at YMIN+1 (43) upward (defender/DEFA7.SRC:2450); PLADN freezes at 238 downward (:2461).
    expect(clampPlayerY(42)).toBe(43) // below the floor → floor
    expect(clampPlayerY(43)).toBe(43) // exactly the floor
    expect(clampPlayerY(238)).toBe(238) // exactly the ceiling
    expect(clampPlayerY(239)).toBe(238) // above the ceiling → ceiling
    expect(clampPlayerY(250)).toBe(238)
    expect(clampPlayerY(100)).toBe(100) // interior unchanged
  })

  it('object Y WRAPS on [YMIN, YMAX]: 41→240, 42→42, 240→240, 241→42, interior untouched', async () => {
    const { wrapObjectY } = await loadWorld()
    // VELO: below YMIN → YMAX; above YMAX → YMIN (defender/DEFA7.SRC:2490-2496).
    expect(wrapObjectY(41)).toBe(240) // below floor → wraps to ceiling
    expect(wrapObjectY(42)).toBe(42) // exactly the floor stays
    expect(wrapObjectY(240)).toBe(240) // exactly the ceiling stays
    expect(wrapObjectY(241)).toBe(42) // above ceiling → wraps to floor
    expect(wrapObjectY(100)).toBe(100) // interior unchanged
  })

  it('the two rules DIFFER at the same input — a shared "wrap Y" on both is a fidelity bug', async () => {
    const { clampPlayerY, wrapObjectY } = await loadWorld()
    // Below the floor: the player clamps UP to 43, the object wraps to the CEILING 240.
    expect(clampPlayerY(41)).toBe(43)
    expect(wrapObjectY(41)).toBe(240)
    // Above the ceiling: the player clamps DOWN to 238, the object wraps to the FLOOR 42.
    expect(clampPlayerY(250)).toBe(238)
    expect(wrapObjectY(250)).toBe(42)
  })
})
