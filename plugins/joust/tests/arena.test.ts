// tests/arena.test.ts
//
// Story jt1-4 — RED phase (O'Brien / TEA). The arena's BEHAVIOUR: landing
// (AC-2), wrap / ceiling / floor (AC-3), lava and the bridge hook.
//
// The transcription gate — do the constants come from the source — is the
// companion suite, tests/arena-source.test.ts. This one asks whether the sim
// obeys the ROM's laws, and it runs everywhere: no vendored tree needed, so CI
// exercises all of it.
//
// ─── EVERY EXPECTED VALUE HERE WAS DERIVED FROM THE ROM THIS SESSION ─────────
// The story's anchors were checked line by line before any test was written,
// and several turned out to be wrong or incomplete. Where the story and the
// source disagreed the source won and a finding was filed. Specifically:
//
//   • The wrap is NOT `mod 303`. WRAPX does ONE conditional subtract then ONE
//     conditional add; on large deltas that produces a DIFFERENT answer from a
//     modulus, and legally leaves x outside the range. Pinned as branches.
//   • The ceiling CLAMPS position to CEILING<<8; it does not mirror the
//     overshoot. Velocity is negated exactly, and only when moving upward.
//   • CLIF5's landing mask is $A0, not $20 — which is why CKGND tests it with
//     BITA rather than equality. A pure-bit assumption mis-dispatches it.
//   • There is a SEVENTH outcome, LNDB7 (lava troll), that the story omits.
//
// ─── THE FIXTURE RULE (tempest's wave/tube trap, in spirit) ──────────────────
// A fixture that invents a convenient arena tests nothing about Joust. Every
// landing test below drives the REAL platform table out of the module and the
// REAL band geometry read from LNDYTB — never a hand-made platform at a
// made-up Y.

import { describe, it, expect } from 'vitest'
import { loadArena, type Platform } from './helpers/arena-contract.js'

/** 256 sub-pixel units per pixel — the ADDGRX position model. */
const px = (whole: number, frac = 0): number => (whole << 8) | frac
const whole = (pos: number): number => pos >> 8

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — X WRAP. The ROM's arithmetic, branch for branch.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-3 — X wrap is the ROM\'s [-10,292] correction', () => {
  it('exposes the bounds and span the source declares', async () => {
    const a = await loadArena()
    expect(a.ELEFT, 'ELEFT EQU -10').toBe(-10)
    expect(a.ERIGHT, 'ERIGHT EQU 292').toBe(292)
    expect(a.WRAP_SPAN, 'ERIGHT-ELEFT+1').toBe(303)
  })

  it('an entity at 293 emerges at -10 (the AC\'s own example)', async () => {
    const a = await loadArena()
    expect(a.wrapX(293)).toBe(-10)
  })

  it('the bounds themselves do NOT wrap (the comparisons are inclusive)', async () => {
    // WRAPX uses BLE against ERIGHT and BGE against ELEFT, so both endpoints
    // are legal positions. Off-by-one here silently teleports an entity that is
    // merely standing at the edge.
    const a = await loadArena()
    expect(a.wrapX(292), '292 is in range').toBe(292)
    expect(a.wrapX(-10), '-10 is in range').toBe(-10)
    expect(a.wrapX(-11), 'one past the left edge').toBe(292)
  })

  it('wraps by a single correction, NOT a modulus (they differ on large deltas)', async () => {
    // The distinction that matters: `((x - ELEFT) mod 303) + ELEFT` agrees with
    // the ROM for every velocity the game can produce, and disagrees outside
    // that. Encoding the modulus would be encoding a law Joust does not have.
    const a = await loadArena()
    const modulus = (x: number): number => {
      let r = (x - -10) % 303
      if (r < 0) r += 303
      return r + -10
    }
    // Small deltas: the two agree, and the ROM is in range.
    for (const x of [-11, -10, 0, 150, 292, 293, 300]) {
      expect(a.wrapX(x), `x=${x} is inside the single-correction regime`).toBe(modulus(x))
    }
    // Large deltas: ONE subtract is applied, so the result can stay out of range.
    expect(a.wrapX(600), '600-303 = 297, and no second correction happens').toBe(297)
    expect(a.wrapX(600), 'a modulus would say -6').not.toBe(modulus(600))
    expect(a.wrapX(-400), '-400+303 = -97, not corrected again').toBe(-97)
    expect(a.wrapX(-400)).not.toBe(modulus(-400))
  })

  it('is a pure function of x', async () => {
    const a = await loadArena()
    for (const x of [-11, 0, 292, 293]) expect(a.wrapX(x)).toBe(a.wrapX(x))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — CEILING. Exact negation, and a clamp rather than a mirror.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-3 — the ceiling is elastic in velocity and clamping in position', () => {
  it('CEILING is $20 and nothing happens below it', async () => {
    const a = await loadArena()
    expect(a.CEILING).toBe(0x20)
    const r = a.applyCeiling(px(0x40), -0x0300)
    expect(r.posY, 'well below the ceiling, position is untouched').toBe(px(0x40))
    expect(r.velY, 'and so is velocity').toBe(-0x0300)
    expect(r.bumped).toBe(false)
  })

  it('reflects velocity EXACTLY on contact (16-bit two\'s-complement negation)', async () => {
    // `COMA / NEGB / SBCA #-1` is exact negation of D, not an approximation and
    // not a damped bounce. Elastic means elastic.
    const a = await loadArena()
    for (const v of [-0x0100, -0x0345, -0x1000, -1]) {
      const r = a.applyCeiling(px(0x20), v)
      expect(r.velY, `velocity ${v} must invertexactly`).toBe(-v)
      expect(r.bumped).toBe(true)
    }
  })

  it('CLAMPS position to CEILING<<8 — it does not mirror the overshoot', async () => {
    // ADGDWN loads `#CEILNG*256` unconditionally: the entity is placed exactly
    // at the ceiling with a ZERO fraction, however far past it the step went. A
    // mirroring implementation would put it below the ceiling by the overshoot
    // and drift out of sync with the ROM within a frame.
    const a = await loadArena()
    for (const start of [px(0x20), px(0x1f), px(0x10), px(0x00, 0x80)]) {
      const r = a.applyCeiling(start, -0x0800)
      expect(r.posY, 'clamped to exactly CEILING<<8, fraction zeroed').toBe(px(0x20))
    }
  })

  it('does NOT flip velocity for an entity already moving down', async () => {
    // `BPL ADGDWN` — an entity descending through the ceiling band keeps its
    // velocity. Negating it would fling it upward and trap it there.
    const a = await loadArena()
    const r = a.applyCeiling(px(0x18), +0x0400)
    expect(r.velY, 'downward velocity survives the ceiling untouched').toBe(+0x0400)
    expect(r.posY, 'but position is still clamped').toBe(px(0x20))
  })

  it('compares WHOLE pixels, not the 16-bit position', async () => {
    // `CMPA #CEILNG` looks at the high byte only. A module comparing the full
    // position would trigger up to a pixel early or late at every boundary.
    const a = await loadArena()
    expect(a.applyCeiling(px(0x21, 0x00), -0x0100).bumped, 'pixel 0x21 is above the ceiling').toBe(
      false,
    )
    expect(a.applyCeiling(px(0x21, 0xff), -0x0100).bumped, 'fraction must not tip it over').toBe(
      false,
    )
    expect(a.applyCeiling(px(0x20, 0xff), -0x0100).bumped, 'pixel 0x20 IS the ceiling').toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — THE LAVA FLOOR.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-3 — crossing FLOOR+7 kills', () => {
  it('FLOOR is $DF and death begins at FLOOR+7', async () => {
    const a = await loadArena()
    expect(a.FLOOR).toBe(0xdf)
    expect(a.DEATH_Y, 'ADGCEI compares against FLOOR+7').toBe(0xdf + 7)
    expect(a.DEATH_Y).toBe(230)
  })

  it('the threshold is at-or-below, on whole pixels', async () => {
    // `CMPA #FLOOR+7 / BHS` — branch if higher-or-same, unsigned, high byte.
    const a = await loadArena()
    expect(a.isLavaDeath(px(229, 0xff)), 'one pixel short, however deep the fraction').toBe(false)
    expect(a.isLavaDeath(px(230, 0x00)), 'exactly FLOOR+7 is death').toBe(true)
    expect(a.isLavaDeath(px(231)), 'and below').toBe(true)
  })

  it('the floor sits below every landing surface', async () => {
    // A snap Y at or past the death line would kill an entity for standing on a
    // platform — a sanity property that catches a mis-transcribed table fast.
    const a = await loadArena()
    for (const p of a.PLATFORMS) {
      expect(p.snapY, `${p.cliffs.join('/')} must be above the lava`).toBeLessThan(a.DEATH_Y)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — LANDING. The bitmask dispatch and the snap.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-2 — the six landing surfaces', () => {
  /** bit → snapY, read off LNDB0..LNDB5 (`LDB #$xxxx-1`, JOUSTRV4.SRC:6729-6759). */
  const SNAP: ReadonlyArray<readonly [number, number]> = [
    [0x01, 68], // $0045-1 — CLIF1L & CLIF1R
    [0x02, 80], // $0051-1 — CLIF2
    [0x04, 128], // $0081-1 — CLIF3U  (the source comment says CLIF3R; see the finding)
    [0x08, 137], // $008A-1 — CLIF3L & CLIF3R
    [0x10, 162], // $00A3-1 — CLIF4
    [0x20, 210], // $00D3-1 — CLIF5
  ]

  /** LNDYTB bands, read from the table this session. All are 4 scanlines. */
  const BAND_TOP: ReadonlyArray<readonly [number, number]> = [
    [0x01, 69],
    [0x02, 81],
    [0x04, 129],
    [0x08, 138],
    [0x10, 163],
    [0x20, 211],
  ]

  it('there are exactly six', async () => {
    const a = await loadArena()
    expect(a.PLATFORMS.length).toBe(6)
    expect(a.PLATFORMS.map((p) => p.bit).sort((x, y) => x - y)).toEqual([
      0x01, 0x02, 0x04, 0x08, 0x10, 0x20,
    ])
  })

  it('each carries the transcribed snap Y', async () => {
    const a = await loadArena()
    for (const [bit, snapY] of SNAP) {
      const p = a.PLATFORMS.find((q) => q.bit === bit)
      expect(p, `platform for bit $${bit.toString(16)}`).toBeDefined()
      expect(p!.snapY, `bit $${bit.toString(16)}`).toBe(snapY)
    }
  })

  it('every snap Y is exactly one pixel ABOVE its band (the entity stands on the surface)', async () => {
    // Verified across all six this session — a structural relationship, not a
    // coincidence, and the cheapest possible check that a snap Y was mistyped.
    const a = await loadArena()
    for (const [bit, top] of BAND_TOP) {
      const p = a.PLATFORMS.find((q) => q.bit === bit)!
      expect(p.bandTop, `bit $${bit.toString(16)} band top`).toBe(top)
      expect(p.snapY, `bit $${bit.toString(16)}: snapY must be bandTop-1`).toBe(p.bandTop - 1)
    }
  })

  it('band heights match LNDYTB: five 4-scanline ledges and CLIF5\'s 17-scanline island', async () => {
    // Corrected in GREEN against the table itself (see Design Deviations). The
    // five thin ledges are 4 scanlines each, but CLIF5 is the bottom ISLAND and
    // its $A0 band runs 211..227 — SEVENTEEN scanlines. That is the same extent
    // this file's own finding records ("CLIF5's band (Y 211..227)"), so the
    // original blanket `toBe(4)` contradicted it and would have forced a false
    // geometry into the module.
    const a = await loadArena()
    const EXPECTED: Record<number, number> = { 0x01: 4, 0x02: 4, 0x04: 4, 0x08: 4, 0x10: 4, 0x20: 17 }
    for (const p of a.PLATFORMS) {
      expect(p.bandHeight, `bit $${p.bit.toString(16)}`).toBe(EXPECTED[p.bit])
      // And the declared height is exactly what LNDYTB carries — no more, no less.
      for (let y = p.bandTop; y < p.bandTop + p.bandHeight; y++) {
        expect(a.LND_Y_TABLE[y] & p.bit, `LNDYTB[${y}]`).not.toBe(0)
      }
      expect(
        a.LND_Y_TABLE[p.bandTop + p.bandHeight] & p.bit,
        `LNDYTB[${p.bandTop + p.bandHeight}] is past the band and must NOT carry the bit`,
      ).toBe(0)
    }
  })

  it('the LNDYTB rows actually carry each platform\'s bit across its band', async () => {
    const a = await loadArena()
    expect(a.LND_Y_TABLE.length, 'one mask byte per scanline').toBe(240)
    for (const p of a.PLATFORMS) {
      for (let y = p.bandTop; y < p.bandTop + p.bandHeight; y++) {
        expect(
          a.LND_Y_TABLE[y] & p.bit,
          `LNDYTB[${y}] must carry bit $${p.bit.toString(16)}`,
        ).not.toBe(0)
      }
      expect(
        a.LND_Y_TABLE[p.bandTop - 1] & p.bit,
        `LNDYTB[${p.bandTop - 1}] is above the band and must NOT carry the bit`,
      ).toBe(0)
    }
  })
})

describe('AC-2 — CKGND\'s dispatch, branch for branch', () => {
  // Derived by hand from the branch structure at JOUSTRV4.SRC:6712-6728:
  //   A == 0            -> airborne
  //   A  < 8 : A==2 -> bit2 ; A>2 -> bit4 ; else(A==1) -> bit1
  //   A == 8            -> bit8
  //   A  > 8 : A<$20 -> bit$10 ; A&$20 -> bit$20 ; else -> troll
  const CASES: ReadonlyArray<readonly [number, string]> = [
    [0x00, 'airborne'],
    [0x01, 'p1'],
    [0x02, 'p2'],
    [0x04, 'p4'],
    [0x08, 'p8'],
    [0x10, 'p10'],
    [0xa0, 'p20'], // CLIF5's real mask — $80|$20, matched by BITA not equality
    [0x80, 'troll'],
    [0x40, 'troll'],
  ]

  it('maps every mask value the tables can produce', async () => {
    const a = await loadArena()
    for (const [mask, want] of CASES) {
      const got = a.groundOutcome(mask)
      if (want === 'airborne') {
        expect(got.kind, `mask $${mask.toString(16)}`).toBe('airborne')
      } else if (want === 'troll') {
        expect(got.kind, `mask $${mask.toString(16)} is the lava troll's grip`).toBe('troll')
      } else {
        const bit = parseInt(want.slice(1), 16)
        expect(got.kind, `mask $${mask.toString(16)}`).toBe('platform')
        expect(
          (got as { platform: Platform }).platform.bit,
          `mask $${mask.toString(16)} must select bit $${bit.toString(16)}`,
        ).toBe(bit)
      }
    }
  })

  it('CLIF5 is selected by $A0, because CKGND tests it with BITA not equality', async () => {
    // LNDYTB never contains a bare $20: CLIF5's band is $A0 (bit7 | bit5). A
    // dispatch written as a bit-per-platform equality misses it entirely and
    // drops the entity through the bottom island.
    const a = await loadArena()
    const got = a.groundOutcome(0xa0)
    expect(got.kind).toBe('platform')
    expect((got as { platform: Platform }).platform.snapY).toBe(210)
  })

  it('bit 7 WITHOUT bit 5 is the troll, not a platform', async () => {
    const a = await loadArena()
    expect(a.groundOutcome(0x80).kind).toBe('troll')
  })
})

describe('AC-2 — landing is a SNAP, not a resolve', () => {
  it('lands AT the surface Y no matter how deep into the band the step went', async () => {
    // The AC's core claim. LNDBn does `LDB #$xx-1 / STB PPOSY+1,U / CLRA`:
    // the whole-pixel Y is ASSIGNED and the fraction is cleared. Nothing about
    // the entry position or velocity survives.
    const a = await loadArena()
    for (const p of a.PLATFORMS) {
      const r = a.land(p)
      expect(whole(r.posY), `${p.cliffs.join('/')} snap`).toBe(p.snapY)
      expect(r.posY & 0xff, 'the fraction is cleared — no sub-pixel rest').toBe(0)
    }
  })

  it('never penetrates: the landed Y is above the band for every surface', async () => {
    const a = await loadArena()
    for (const p of a.PLATFORMS) {
      expect(whole(a.land(p).posY)).toBeLessThan(p.bandTop)
    }
  })

  it('zeroes vertical velocity', async () => {
    const a = await loadArena()
    for (const p of a.PLATFORMS) expect(a.land(p).velY, `${p.cliffs.join('/')}`).toBe(0)
  })

  it('is idempotent — landing twice changes nothing', async () => {
    // A resolve-style implementation that nudged the entity out of the band
    // would drift on repeated frames; a snap cannot.
    const a = await loadArena()
    for (const p of a.PLATFORMS) {
      const once = a.land(p)
      const twice = a.land(p)
      expect(twice).toEqual(once)
    }
  })

  it('walking off the edge enters flight with ZERO vertical velocity', async () => {
    // AC-2's closing clause. Leaving a platform sideways is not a fall that has
    // been accelerating — the entity simply stops being supported.
    const a = await loadArena()
    const p = a.PLATFORMS[0]
    const standing = a.land(p)
    expect(a.groundOutcome(0x00).kind, 'no mask bits = airborne').toBe('airborne')
    expect(standing.velY, 'and it carries no downward velocity into the fall').toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// LAVA LEVEL + BRIDGE HOOK.
// ─────────────────────────────────────────────────────────────────────────────
describe('lava level rises per wave and then stops', () => {
  it('starts at $EA and steps by 5 down to $E0', async () => {
    // `LDA #$EA / STA SAFRAM` (:962), then per wave
    // `CMPA #$E0 / BLS / SUBA #$5` (:1929-1933). Rising lava means DEcreasing Y.
    const a = await loadArena()
    expect(a.LAVA_START).toBe(0xea)
    expect(a.LAVA_MIN).toBe(0xe0)
    expect(a.LAVA_STEP).toBe(5)
  })

  it('produces exactly three distinct levels and then holds', async () => {
    const a = await loadArena()
    expect(a.lavaLevelForWave(1)).toBe(0xea)
    expect(a.lavaLevelForWave(2)).toBe(0xe5)
    expect(a.lavaLevelForWave(3)).toBe(0xe0)
    for (const w of [4, 5, 12, 99]) {
      expect(a.lavaLevelForWave(w), `wave ${w} stays at the top level`).toBe(0xe0)
    }
  })

  it('never rises past $E0 (the BLS guard, not an unbounded subtract)', async () => {
    const a = await loadArena()
    for (let w = 1; w <= 50; w++) {
      expect(a.lavaLevelForWave(w)).toBeGreaterThanOrEqual(a.LAVA_MIN)
      expect(a.lavaLevelForWave(w)).toBeLessThanOrEqual(a.LAVA_START)
    }
  })

  it('is monotonic — the lava never falls back', async () => {
    const a = await loadArena()
    for (let w = 2; w <= 20; w++) {
      expect(a.lavaLevelForWave(w)).toBeLessThanOrEqual(a.lavaLevelForWave(w - 1))
    }
  })
})

describe('the bridge hook (destruction animation belongs to jt3)', () => {
  it('TBRIDGE is wave 3 and TTROLL follows one wave later', async () => {
    const a = await loadArena()
    expect(a.BRIDGE_WAVE, 'LDA #3 / STA TBRIDGE — JOUSTRV4.SRC:954-955').toBe(3)
    expect(a.TROLL_DELAY, 'LDA #1 / STA TTROLL — :956-957').toBe(1)
  })

  it('fires on wave 3 and STAYS fired after (TBRIDGE is a countdown, not an equality)', async () => {
    // The HOOK is this story's scope; what the destruction looks like is jt3's.
    const a = await loadArena()
    expect(a.bridgeDestroyedOnWave(1)).toBe(false)
    expect(a.bridgeDestroyedOnWave(2)).toBe(false)
    expect(a.bridgeDestroyedOnWave(3)).toBe(true)
    // The wave-4 case closes a confirmed silent-regression channel: the jt1-4
    // review mutated `>=` to `===` and EVERY test still passed. TBRIDGE is
    // decremented per wave and stops at zero (JOUSTRV4.SRC:1934-1936) — once
    // the bridge burns it stays burned, so equality is the wrong shape.
    expect(a.bridgeDestroyedOnWave(4), 'the bridge does not come back').toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// DETERMINISM + PURITY.
// ─────────────────────────────────────────────────────────────────────────────
describe('the arena is deterministic and pure', () => {
  it('identical inputs give identical results across repeated calls', async () => {
    const a = await loadArena()
    const run = (): unknown[] => [
      a.wrapX(293),
      a.wrapX(-11),
      a.applyCeiling(px(0x10), -0x0345),
      a.isLavaDeath(px(230)),
      a.groundOutcome(0xa0).kind,
      a.lavaLevelForWave(2),
      ...a.PLATFORMS.map((p) => a.land(p)),
    ]
    expect(run()).toEqual(run())
    expect(run()).toEqual(run())
  })

  it('does not mutate the platform records it is handed', async () => {
    const a = await loadArena()
    const before = JSON.stringify(a.PLATFORMS)
    for (const p of a.PLATFORMS) a.land(p)
    expect(JSON.stringify(a.PLATFORMS), 'land() must not write through to the table').toBe(before)
  })

  it('exposes the Y tables as full 240-entry maps', async () => {
    const a = await loadArena()
    expect(a.LND_Y_TABLE.length).toBe(240)
    expect(a.BCK_Y_TABLE.length, 'the background map is a SEPARATE table').toBe(240)
    expect(
      a.LND_Y_TABLE,
      'landing and background collision are different mechanisms with different bit meanings',
    ).not.toEqual(a.BCK_Y_TABLE)
  })
})
