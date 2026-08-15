// plugins/defender/tests/ship.test.ts
//
// Story df3-3 — RED phase (Leeloo / TEA). The player SHIP: 24-bit horizontal
// velocity (damping + thrust), REV reverse-facing with a debounce, and vertical
// motion (freeze-at-edge / accelerate / clamp / integrate). Ported line-for-line
// from the ROM at reference/original-source/defender/DEFA7.SRC + PHR6.SRC
// (ROM-always-wins). The ship is a scheduler process (df3-1) driven by a pure
// input snapshot — the shell owns the PIA read; src/core stays clock-free.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────────
// src/core/ship.ts does not exist yet. loadShip() throws a self-describing
// "not built yet" per test (the world.test.ts / scheduler.test.ts precedent), so a
// RED failure proves the FEATURE is absent — never a cryptic module-resolution trace.
//
// ─── ROUTING != GEOMETRY (the reason these pins are numeric) ──────────────────────
// A test that only asks "did the ship speed up when I thrust?" or "did it flip when I
// reversed?" passes while the friction slope, the sub-pixel byte, the debounce, or a
// freeze threshold is subtly wrong. Every assertion below pins a COORDINATE — an exact
// 24-bit velocity, an exact PLAYV, an exact resting Y — not a direction (lang-review
// #29: magnitude, not ordering). Expect a Reviewer mutation battery over this math.
//
// ─── THE ROM MODEL THIS SUITE PINS ───────────────────────────────────────────────
// HORIZONTAL VELOCITY is the 24-bit PLAXV (PLAXV RMB 3, defender/PHR6.SRC:332) — a
// three-byte accumulator whose LOW byte (PLAXV+2) is a SUB-PIXEL fraction. The value
// world.slide() consumes is its TOP 16 bits (PLAXV>>8); the sub-pixel byte is this
// module's concern. Each PLAYER frame updates it in two steps:
//   • X DAMPING (defender/DEFA7.SRC:2342-2359): PLAXV -= 4·(PLAXV>>8) — a friction
//     term proportional to the integer velocity, pulling it toward 0. Operates on the
//     FULL 24-bit value (LDD PLAXV / NEGD / ×4 / ADDD PLAXV+1 with carry into PLAXV) —
//     truncating to 16 bits loses the sub-pixel byte and changes the result.
//   • THRUST/ACCEL (defender/DEFA7.SRC:2360-2371): when the accel button is held
//     (PIA21 bit $02, :2360-2362), PLAXV += PLADIR (24-bit signed add, ITEMP sign-
//     extends). PLADIR is the "THRUST+DIRECTION" vector, init $0300 facing right
//     (LDD #$0300 / STD PLADIR, defender/DEFA7.SRC:1249-1250); facing left is its
//     two's-complement negation (−$0300).
// REV reverse-facing (defender/DEFA7.SRC:3155-3171) two's-complement-negates PLADIR,
// gated by REVFLG (REV SWITCH DEBOUNCE, defender/PHR6.SRC:295): `LDA REVFLG / BNE REVX`
// makes a held button flip the facing EXACTLY ONCE — the latch clears only after the
// button is released (:3166-3170). One press = one flip.
// VERTICAL MOTION (defender/DEFA7.SRC:2441-2476) is a CLAMPED STRIP, not a cylinder:
//   • FREEZE at the edges (a pre-move gate, RTS): up freezes when Yint ≤ YMIN+1 = 43
//     (CMPB #YMIN+1 / BLS PLAYX, :2450-2451); down freezes when Yint ≥ 238
//     (CMPB #238 / BHS PLAYX, :2461-2462). Yint is the HIGH byte of the 16-bit PLAY16.
//   • otherwise: kickstart ±$100 when reversing/starting (PLAUP1/PLADN1, :2459,2470),
//     accelerate ±8 while already moving that way (:2454,2465), clamp speed to ±$200
//     (:2455-2457,2466-2468), then INTEGRATE PLAY16 += PLAYV with NO post-add clamp
//     (:2472-2474) — so a max step can OVERSHOOT to Yint=42 (=YMIN) below the 43 line.
//   • neutral (no up/down): PLAYV := 0 immediately (LDD #0, :2448) — vertical has no
//     inertia; releasing the stick stops the ship the same frame. Up is checked before
//     down (PIA31 LSRA/BCS PLAUP, :2443-2445), so up wins when both are held.
//
// ─── CONTRACT (what GREEN/Dev must build) ────────────────────────────────────────
//   export const PLADIR_MAG: 0x0300   // DEFA7.SRC:1249
//   export const VY_STEP: 8           // DEFA7.SRC:2454,2465
//   export const VY_MAX: 0x0200       // DEFA7.SRC:2455,2466
//   export const VY_KICK: 0x0100      // DEFA7.SRC:2459,2470
//   export const Y_TOP_FREEZE: 43     // YMIN+1, DEFA7.SRC:2450
//   export const Y_BOTTOM_FREEZE: 238 // DEFA7.SRC:2461
//   export type Facing = 'right' | 'left'
//   export function pladir(facing: Facing): number                 // +$300 / −$300
//   export function dampX(plaxv24: number): number                 // v − 4·(v>>8), 24-bit
//   export function accelX(plaxv24: number, dir: number): number   // v + dir, 24-bit
//   export function stepVelocityX(
//     plaxv24: number, io: { accel: boolean; facing: Facing }): number  // damp THEN accel
//   export interface RevState { facing: Facing; revflg: boolean }
//   export function stepReverse(state: RevState, reverseHeld: boolean): RevState
//   export interface VState { y16: number; playv: number }
//   export function stepVerticalY(state: VState, io: { up: boolean; down: boolean }): VState
//
// AC-CITATIONS (every new constant backed by a claims/*.json entry, byte-verified by
// tests/audit/citations.test.ts) and AC-PURITY (tests/purity.test.ts scans src/core)
// are enforced by the EXISTING armed gates the moment ship.ts + its claim entries land
// — NOT duplicated here (the world.test.ts / scheduler.test.ts precedent). GREEN must
// ENROLL the new constants ($0300, ±$100, ±$200, 8 hex/decimal; PLADIR/PLAXV/PLAYV/
// PLAY16/REVFLG) in claims/*.json, or citations.test.ts reddens.

import { describe, it, expect } from 'vitest'

type Facing = 'right' | 'left'

interface RevState {
  readonly facing: Facing
  readonly revflg: boolean
}

interface VState {
  readonly y16: number
  readonly playv: number
}

interface ShipModule {
  PLADIR_MAG: number
  VY_STEP: number
  VY_MAX: number
  VY_KICK: number
  Y_TOP_FREEZE: number
  Y_BOTTOM_FREEZE: number
  pladir: (facing: Facing) => number
  dampX: (plaxv24: number) => number
  accelX: (plaxv24: number, dir: number) => number
  stepVelocityX: (plaxv24: number, io: { accel: boolean; facing: Facing }) => number
  stepReverse: (state: RevState, reverseHeld: boolean) => RevState
  stepVerticalY: (state: VState, io: { up: boolean; down: boolean }) => VState
}

async function loadShip(): Promise<ShipModule> {
  try {
    const mod = (await import('../src/core/ship.js')) as Partial<ShipModule>
    for (const name of [
      'pladir',
      'dampX',
      'accelX',
      'stepVelocityX',
      'stepReverse',
      'stepVerticalY',
    ] as const) {
      if (typeof mod[name] !== 'function') throw new Error(`no \`${name}\` export`)
    }
    for (const name of [
      'PLADIR_MAG',
      'VY_STEP',
      'VY_MAX',
      'VY_KICK',
      'Y_TOP_FREEZE',
      'Y_BOTTOM_FREEZE',
    ] as const) {
      if (typeof mod[name] !== 'number') throw new Error(`no numeric \`${name}\` export`)
    }
    return mod as ShipModule
  } catch (e) {
    throw new Error(
      'src/core/ship.ts not built yet — GREEN (Dev) creates the pure player-ship model ' +
        'ported from defender/DEFA7.SRC:1249-1250,2342-2476,3155-3171 + defender/PHR6.SRC:295,332: ' +
        'the 24-bit PLAXV velocity (dampX v−4·(v>>8) friction + accelX +PLADIR thrust, ' +
        'sub-pixel byte retained), pladir(facing) (+$300/−$300), stepReverse (REVFLG-' +
        'debounced facing flip: one press = one flip), and stepVerticalY (freeze at ' +
        'Yint≤43 / ≥238, kick ±$100, accel ±8, clamp ±$200, integrate with no post-add ' +
        'clamp). Pure — no clock, no Date, no surface (purity.test.ts scans src/core). ' +
        'Enroll every new constant in claims/*.json (citations.test.ts byte-verifies). ' +
        `(${(e as Error).message})`,
    )
  }
}

// ── CONSTANTS — radix pins (guardrail: RASM $hex vs bare decimal) ──────────────────
describe('constants — the ROM magnitudes, at the right radix', () => {
  it('PLADIR_MAG === 0x0300 (768): the "THRUST+DIRECTION" init, DEFA7.SRC:1249', async () => {
    // A decimal misread of "$0300" as 300 would fail here; so would a 0x300 vs 0x30 typo.
    const { PLADIR_MAG } = await loadShip()
    expect(PLADIR_MAG).toBe(0x0300)
  })

  it('VY_STEP === 8 DECIMAL: the per-frame vertical accel, ADDD #8/#-8 (DEFA7.SRC:2454,2465)', async () => {
    // "8" is a bare decimal operand ($8 == 8 here, but 0x08 vs 0x80 is the real trap).
    const { VY_STEP } = await loadShip()
    expect(VY_STEP).toBe(8)
  })

  it('VY_MAX === 0x0200 (512): the vertical speed clamp, CMPD #$200 (DEFA7.SRC:2455,2466)', async () => {
    const { VY_MAX } = await loadShip()
    expect(VY_MAX).toBe(0x0200)
  })

  it('VY_KICK === 0x0100 (256): the reversing/starting kick, LDD #$100 (DEFA7.SRC:2459,2470)', async () => {
    const { VY_KICK } = await loadShip()
    expect(VY_KICK).toBe(0x0100)
  })

  it('Y_TOP_FREEZE === 43 (= YMIN+1) and Y_BOTTOM_FREEZE === 238, both DECIMAL', async () => {
    // lang-review #14: the two vertical edges are pinned OUTSIDE the branches that use
    // them — a $43/$238 re-radix (67 / out-of-range) or an off-by-one would fail here.
    const { Y_TOP_FREEZE, Y_BOTTOM_FREEZE } = await loadShip()
    expect(Y_TOP_FREEZE).toBe(43)
    expect(Y_BOTTOM_FREEZE).toBe(238)
  })
})

// ── PLADIR — the thrust+direction vector's sign ───────────────────────────────────
describe('pladir(facing) — +$300 right, −$300 left (DEFA7.SRC:1249-1250,2364-2366)', () => {
  it('facing right is +0x300; facing left is its two’s-complement negation −0x300', async () => {
    const { pladir } = await loadShip()
    expect(pladir('right')).toBe(0x0300)
    expect(pladir('left')).toBe(-0x0300)
  })
})

// ── X DAMPING — the 24-bit friction slope (DEFA7.SRC:2342-2359) ────────────────────
describe('dampX — friction is v − 4·(v>>8) on the FULL 24-bit PLAXV', () => {
  it('dampX(0x010000) === 0x00FC00: 4·(0x0100) = 0x400 removed — a 17-bit input a 16-bit truncation would zero', async () => {
    // The single most important non-truncation pin: 0x010000 exceeds 16 bits. A dev who
    // models velocity as its 16-bit integer part (v>>8) receives 0x0000 and returns 0;
    // the faithful 24-bit damp returns 0x010000 − 4·0x100 = 0x00FC00.
    const { dampX } = await loadShip()
    expect(dampX(0x010000)).toBe(0x00fc00)
  })

  it('dampX(0x0005F4) === 0x0005E0: friction preserves the sub-pixel byte (0xF4→0xE0), carry-correct', async () => {
    // v=0x05F4 (integer vel 5, sub-pixel 0xF4). 4·5 = 20 = 0x14 removed → 0x05E0.
    // Pins the byte-level result, not just the integer part (0x05).
    const { dampX } = await loadShip()
    expect(dampX(0x0005f4)).toBe(0x0005e0)
  })

  it('dampX(0) === 0: a resting ship has no friction to apply (degenerate input, #21)', async () => {
    const { dampX } = await loadShip()
    expect(dampX(0)).toBe(0)
  })
})

// ── THRUST — the 24-bit accumulate (DEFA7.SRC:2360-2371) ───────────────────────────
describe('accelX — thrust adds PLADIR into the 24-bit accumulator, sub-pixel retained', () => {
  it('accelX(0x0005F4, 0x0300) === 0x0008F4: the low (sub-pixel) byte 0xF4 survives the add', async () => {
    const { accelX } = await loadShip()
    expect(accelX(0x0005f4, 0x0300)).toBe(0x0008f4)
  })

  it('accelX with a −$300 (left) dir subtracts: accelX(0x0300, -0x0300) === 0', async () => {
    const { accelX } = await loadShip()
    expect(accelX(0x0300, -0x0300)).toBe(0)
  })
})

// ── stepVelocityX — DAMP first, THEN thrust; the two compose (DEFA7.SRC:2342-2371) ──
describe('stepVelocityX — one PLAYER frame of horizontal velocity: damp then (accel? +pladir)', () => {
  it('no accel is pure friction: stepVelocityX(0x010000, {accel:false}) === 0x00FC00', async () => {
    const { stepVelocityX } = await loadShip()
    expect(stepVelocityX(0x010000, { accel: false, facing: 'right' })).toBe(0x00fc00)
  })

  it('accel from rest is exactly +PLADIR: stepVelocityX(0, {accel:true,right}) === 0x0300', async () => {
    const { stepVelocityX } = await loadShip()
    expect(stepVelocityX(0, { accel: true, facing: 'right' })).toBe(0x0300)
  })

  it('ORDER is damp-then-accel: three accel frames from rest reach 0x08E0, not the naive 0x0900', async () => {
    // f1: damp(0)=0, +0x300 → 0x300.  f2: damp(0x300)=0x2F4, +0x300 → 0x5F4.
    // f3: damp(0x5F4)=0x5E0, +0x300 → 0x8E0.  A no-friction model reaches 3·0x300 = 0x900.
    // Also pins 24-bit retention: sub-pixel byte 0xE0 ≠ 0 while integer velocity is only 8.
    const { stepVelocityX } = await loadShip()
    let v = 0
    for (let i = 0; i < 3; i++) v = stepVelocityX(v, { accel: true, facing: 'right' })
    expect(v).toBe(0x08e0)
    expect(v & 0xff).toBe(0xe0) // sub-pixel fraction retained
    expect(v >> 8).toBe(8) // integer velocity world.slide() would consume
  })

  it('facing left accelerates NEGATIVE: stepVelocityX(0, {accel:true,left}) === -0x0300', async () => {
    const { stepVelocityX } = await loadShip()
    expect(stepVelocityX(0, { accel: true, facing: 'left' })).toBe(-0x0300)
  })
})

// ── REV — the REVFLG debounce: one press = one flip (DEFA7.SRC:3155-3171) ──────────
describe('stepReverse — a held reverse button flips the facing EXACTLY once', () => {
  it('a fresh press flips facing and latches REVFLG: right → left, revflg true', async () => {
    const { stepReverse } = await loadShip()
    expect(stepReverse({ facing: 'right', revflg: false }, true)).toEqual({
      facing: 'left',
      revflg: true,
    })
  })

  it('holding across five frames flips ONCE, not five times (the debounce, #29)', async () => {
    // The trap: a per-frame flip would oscillate right→left→right→left→right→left.
    const { stepReverse } = await loadShip()
    let s: RevState = { facing: 'right', revflg: false }
    for (let i = 0; i < 5; i++) s = stepReverse(s, true)
    expect(s).toEqual({ facing: 'left', revflg: true })
  })

  it('releasing the button re-arms the latch without changing facing', async () => {
    const { stepReverse } = await loadShip()
    expect(stepReverse({ facing: 'left', revflg: true }, false)).toEqual({
      facing: 'left',
      revflg: false,
    })
  })

  it('release-then-press flips back: left → (release) → (press) → right', async () => {
    const { stepReverse } = await loadShip()
    const released = stepReverse({ facing: 'left', revflg: true }, false)
    expect(stepReverse(released, true)).toEqual({ facing: 'right', revflg: true })
  })

  it('no button held leaves an armed, unflipped ship untouched', async () => {
    const { stepReverse } = await loadShip()
    expect(stepReverse({ facing: 'right', revflg: false }, false)).toEqual({
      facing: 'right',
      revflg: false,
    })
  })
})

// ── VERTICAL MOTION — freeze / kick / accel / clamp / integrate (DEFA7.SRC:2441-2476)
describe('stepVerticalY — freeze at the edges, kick/accel/clamp between, no post-add clamp', () => {
  it('up from rest kicks −$100 and integrates: {0x6400,0} → {0x6300,−0x100}', async () => {
    // Yint=100 (0x64), well inside; PLAYV≥0 → PLAUP1 kick −$100; PLAY16 += −$100.
    const { stepVerticalY } = await loadShip()
    expect(stepVerticalY({ y16: 0x6400, playv: 0 }, { up: true, down: false })).toEqual({
      y16: 0x6300,
      playv: -0x0100,
    })
  })

  it('up while already rising accelerates by −8: {0x6300,−0x100} → playv −0x108', async () => {
    const { stepVerticalY } = await loadShip()
    const r = stepVerticalY({ y16: 0x6300, playv: -0x0100 }, { up: true, down: false })
    expect(r.playv).toBe(-0x0108)
    expect(r.y16).toBe(0x6300 - 0x0108)
  })

  it('up speed clamps at −$200: playv −0x1FC steps to −0x200, not −0x204', async () => {
    const { stepVerticalY } = await loadShip()
    expect(stepVerticalY({ y16: 0x6400, playv: -0x01fc }, { up: true, down: false }).playv).toBe(
      -0x0200,
    )
  })

  it('down from rest kicks +$100 and integrates: {0x6400,0} → {0x6500,+0x100}', async () => {
    const { stepVerticalY } = await loadShip()
    expect(stepVerticalY({ y16: 0x6400, playv: 0 }, { up: false, down: true })).toEqual({
      y16: 0x6500,
      playv: 0x0100,
    })
  })

  it('down speed clamps at +$200: playv +0x1FC steps to +0x200, not +0x204', async () => {
    const { stepVerticalY } = await loadShip()
    expect(stepVerticalY({ y16: 0x6400, playv: 0x01fc }, { up: false, down: true }).playv).toBe(
      0x0200,
    )
  })

  it('FREEZE up: at Yint==43 (the boundary, BLS) an up press moves nothing (#14/#21)', async () => {
    // CMPB #YMIN+1 / BLS PLAYX — the boundary is INCLUSIVE; Yint=43 freezes, PLAYV untouched.
    const { stepVerticalY } = await loadShip()
    expect(stepVerticalY({ y16: 43 * 256, playv: 0 }, { up: true, down: false })).toEqual({
      y16: 43 * 256,
      playv: 0,
    })
  })

  it('FREEZE down: at Yint==238 (the boundary, BHS) a down press moves nothing (#14/#21)', async () => {
    const { stepVerticalY } = await loadShip()
    expect(stepVerticalY({ y16: 238 * 256, playv: 0 }, { up: false, down: true })).toEqual({
      y16: 238 * 256,
      playv: 0,
    })
  })

  it('NO post-add clamp: a −$200 step from Yint==44 OVERSHOOTS to Yint==42 (=YMIN, below 43)', async () => {
    // The two-rules-on-one-axis subtlety: the freeze is a PRE-move gate, not a post-move
    // clamp. From 0x2C00 (Yint 44) at max up speed −$200 → 0x2A00 (Yint 42). A dev who
    // clamps the result to [43,238] would land on 43 and fail this pin.
    const { stepVerticalY, Y_TOP_FREEZE } = await loadShip()
    const r = stepVerticalY({ y16: 0x2c00, playv: -0x0200 }, { up: true, down: false })
    expect(r.y16 >> 8).toBe(42)
    expect(r.y16 >> 8).toBeLessThan(Y_TOP_FREEZE)
  })

  it('neutral stick zeroes PLAYV the same frame (no vertical inertia) and holds Y', async () => {
    // LDD #0 → PLAYV := 0, PLAY16 += 0. Releasing up/down stops the ship immediately.
    const { stepVerticalY } = await loadShip()
    expect(stepVerticalY({ y16: 0x6400, playv: -0x0180 }, { up: false, down: false })).toEqual({
      y16: 0x6400,
      playv: 0,
    })
  })

  it('UP wins when both up and down are held (PIA31 checked first, :2443-2445)', async () => {
    const { stepVerticalY } = await loadShip()
    const both = stepVerticalY({ y16: 0x6400, playv: 0 }, { up: true, down: true })
    const upOnly = stepVerticalY({ y16: 0x6400, playv: 0 }, { up: true, down: false })
    expect(both).toEqual(upOnly)
  })
})
