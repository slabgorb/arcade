// tests/core/horizon-mtns.test.ts
//
// Story bz3-8 — RED phase (O'Brien / TEA). Cluster C8: findings H-002 + H-003.
//
// WHAT THIS STORY FIXES
//   The clone's mountain ridge is a PROCEDURAL two-sine curve (horizon.ts:53-60)
//   and its moon is an INDEPENDENTLY-AUTHORED crescent (horizon.ts:75-89), both
//   built on the false premise (horizon.ts:6-8) that "the disassembly quarry
//   holds no horizon picture data". It does: the hand-authored ridge is
//   MTNS / MTN0..MTN7 (BZMTNS.MAC:19-183, .RADIX 16), drawn by MOUNTS
//   (BZONE.MAC:1240), with the MOON embedded inside MTN0 (brite tiers 7/2/5).
//
// PREMISE CORRECTION (audit finding H-001, CONFIRMED):
//   BATBL — which an earlier audit draft called "the mountain-scape table" — is
//   actually the 'BATTLE' TITLE-LOGO object 0x17: it sits in the OBJPNT 3D-object
//   dispatch table (BZMTNS.MAC:485-490 `.WORD ...,BATBL`) and in LOGOBJ
//   (BZMTNS.MAC:846 `.BYTE 17,80,1E,80,1F,80` = objects BAT/TLE/ZON). Do NOT port
//   BATBL as the mountains. The real ridge is MTN0..MTN7 at BZMTNS.MAC:19-183.
//
// CONTRACT for the GREEN phase (Dev): src/core/horizon.ts must expose the ROM's
// hand-authored ridge as byte-exact vector data, REPLACING the procedural
// two-sine ridge and the separately-authored crescent moon:
//
//   /** One hex-decoded VCTR stroke from BZMTNS.MAC: [dx, dy, brite].
//    *  Relative deltas in vector-generator units; brite 0 = pen-up MOVE,
//    *  brite > 0 = visible DRAW at that intensity tier. */
//   export type MtnStroke = readonly [number, number, number]
//
//   /** MTN0..MTN7 — the ROM's hand-authored ridge, a byte-exact HEX decode of
//    *  BZMTNS.MAC:19-183 (.RADIX 16). Eight segments (MTNS JSRLs MTN0..MTN7);
//    *  the moon is embedded inside MTN0 (segment index 0). */
//   export const MTN_SEGMENTS: readonly (readonly MtnStroke[])[]
//
//   The rendered backdrop (PANORAMA / skylineSegments) must be DERIVED from this
//   data — the two-sine mountains and the crescent moon must be GONE.
//
// WHY BYTE-EXACT DATA HERE (and not just structure, unlike horizon.test.ts):
//   horizon.test.ts pins structural invariants because bz1-3 believed no ROM
//   picture data existed. H-002/H-003 refuted that. The ROM DOES ship the ridge,
//   so this story ports the real bytes and the tests pin them exactly — a
//   structural-only test would pass against the two-sine and never go RED. The
//   fixture below is a byte-exact hex decode of the .MAC source (VCTR args read
//   base-16: `-0C` = -12, `0A0` = 160, `0C0` = 192, `0E0` = 224), verified by
//   parsing BZMTNS.MAC directly. Every block cites its BZMTNS.MAC line range.
//   Values are the ROM's RELATIVE deltas (the actual bytes); accumulating them
//   into absolute screen positions is a render-mapping concern for GREEN, not a
//   data-fidelity concern pinned here.
//
// DEFENSIVE LOAD: horizon.ts already exists (the two-sine version), so the import
// succeeds and MTN_SEGMENTS is simply `undefined` until GREEN — need() then
// throws a clear RED message instead of a vacuous pass.

import { describe, it, expect, beforeAll } from 'vitest'

type Stroke = readonly [number, number, number]

interface PanoramaPolyline {
  readonly name: string
  readonly points: readonly (readonly [number, number])[]
}

interface HorizonModule {
  MTN_SEGMENTS?: readonly (readonly Stroke[])[]
  PANORAMA?: readonly PanoramaPolyline[]
}

let horizon: HorizonModule = {}

beforeAll(async () => {
  try {
    horizon = (await import('../../src/core/horizon')) as HorizonModule
  } catch {
    horizon = {}
  }
})

function need<T>(value: T | undefined, name: string): T {
  if (value === undefined) {
    throw new Error(`src/core/horizon.ts must export ${name} (bz3-8 RED contract)`)
  }
  return value
}

// --- Byte-exact hex decode of MTNS / MTN0..MTN7 (BZMTNS.MAC:19-183) ---------
// Parsed directly from ~/Projects/battlezone-source-text/BZMTNS.MAC (.RADIX 16).
// Each row is one `VCTR dx,dy,brite` stroke → [dx, dy, brite] in decimal.

// MTN0 — BZMTNS.MAC:19-68 (50 strokes). Ridge chunk 0 with the MOON embedded
// at strokes 17-48 (BZMTNS.MAC:36-67).
const MTN0: Stroke[] = [
  [0, 64, 0], [32, -32, 3], [-16, -8, 0], [80, 40, 3], [32, 0, 3], [32, -32, 3],
  [-64, 32, 3], [0, -64, 0], [128, 64, 3], [64, -64, 3], [32, 0, 0], [-64, 32, 3],
  [-32, 32, 0], [64, -32, 3], [64, -16, 3], [96, -16, 3], [48, 160, 0],
  // MOON PART A — bright disc outline, brite 7 (BZMTNS.MAC:36-49, ;MOON):
  [5, -12, 7], [0, -12, 7], [-8, -12, 7], [-12, -12, 7], [-12, -3, 7], [-12, 3, 7],
  [12, -9, 7], [12, -3, 7], [12, 3, 7], [12, 9, 7], [6, 12, 7], [0, 12, 7],
  [-4, 12, 7], [-11, 12, 7],
  // MOON PART B — terminator, brite 2 (BZMTNS.MAC:50-55):
  [-13, 3, 2], [-15, -4, 2], [-10, -8, 2], [-5, -11, 2], [-2, -13, 2], [6, -15, 2],
  // MOON inner detail — brite 5, with brite-0 positioning moves, closes brite 2
  // (BZMTNS.MAC:56-67, ;END OF MOON):
  [27, 3, 0], [0, -4, 5], [6, -1, 5], [6, 11, 5], [-4, -1, 5], [-1, 2, 5],
  [18, 20, 0], [-3, -3, 5], [1, 3, 5], [-3, 1, 5], [0, 6, 5], [1, 1, 2],
  [7, -150, 0], // BZMTNS.MAC:68 — move back off the moon
]

// MTN1 — BZMTNS.MAC:70-83 (14 strokes).
const MTN1: Stroke[] = [
  [32, 0, 0], [64, 48, 3], [32, -48, 3], [-32, 48, 0], [32, -16, 3], [64, 32, 3],
  [160, -64, 3], [-128, 32, 3], [-32, 32, 3], [-64, -32, 0], [96, -32, 3],
  [128, 0, 0], [160, 32, 3], [0, -32, 0],
]

// MTN2 — BZMTNS.MAC:85-115 (31 strokes).
const MTN2: Stroke[] = [
  [0, 32, 0], [64, 0, 3], [0, -32, 0], [-64, 32, 3], [64, 0, 0], [64, 32, 3],
  [-64, -32, 0], [96, -32, 3], [32, 32, 3], [-64, 32, 3], [32, 0, 3], [32, -32, 3],
  [32, 16, 3], [32, -16, 3], [-96, -32, 3], [96, 32, 0], [64, 32, 3], [64, -32, 3],
  [-96, 16, 0], [32, -16, 3], [32, 16, 3], [0, -48, 0], [96, 8, 3], [-64, 24, 3],
  [32, 16, 3], [64, -16, 3], [-32, -24, 3], [-32, 40, 3], [64, -16, 0], [32, 0, 3],
  [0, -32, 0],
]

// MTN3 — BZMTNS.MAC:117-132 (16 strokes).
const MTN3: Stroke[] = [
  [0, 32, 0], [64, -32, 3], [-64, 32, 0], [128, -32, 3], [160, 0, 0], [96, 32, 3],
  [32, -32, 3], [-32, 32, 0], [32, 32, 3], [32, -64, 3], [32, 0, 0], [-64, 64, 3],
  [32, -32, 0], [32, 32, 3], [32, -32, 3], [0, -32, 0],
]

// MTN4 — BZMTNS.MAC:134-144 (11 strokes).
const MTN4: Stroke[] = [
  [0, 32, 0], [64, 32, 3], [32, -64, 3], [32, 0, 0], [-64, 64, 3], [32, -32, 0],
  [32, 16, 3], [96, -48, 3], [128, 0, 0], [160, 32, 3], [0, -32, 0],
]

// MTN5 — BZMTNS.MAC:146-160 (15 strokes).
const MTN5: Stroke[] = [
  [0, 32, 0], [64, 0, 3], [224, -32, 3], [-32, 48, 3], [-64, -32, 3], [96, -16, 0],
  [96, 64, 3], [64, -40, 3], [-16, -24, 0], [64, 96, 3], [3, -7, 3], [5, 5, 3],
  [3, -6, 3], [5, 8, 3], [0, -96, 0],
]

// MTN6 — BZMTNS.MAC:162-175 (14 strokes).
const MTN6: Stroke[] = [
  [0, 96, 0], [64, -96, 3], [96, 64, 3], [64, -64, 3], [64, 0, 0], [-128, 64, 3],
  [64, -32, 0], [64, 32, 3], [128, -64, 3], [-64, 32, 0], [64, 16, 3], [32, -48, 3],
  [-32, 48, 0], [96, -48, 3],
]

// MTN7 — BZMTNS.MAC:177-182 (6 strokes).
const MTN7: Stroke[] = [
  [192, 0, 0], [224, 32, 3], [64, -32, 3], [-32, 16, 0], [64, 48, 3], [0, -64, 0],
]

const EXPECTED_SEGMENTS: readonly (readonly Stroke[])[] = [
  MTN0, MTN1, MTN2, MTN3, MTN4, MTN5, MTN6, MTN7,
]
const EXPECTED_COUNTS = [50, 14, 31, 16, 11, 15, 14, 6]
const EXPECTED_TOTAL = 157 // Σ counts — the ridge "vertex count"

// The moon occupies MTN0 strokes 17..48 (BZMTNS.MAC:36-67).
const MOON_START = 17
const MOON_END = 49 // exclusive
const MOON_A_BRITE = 7 // disc outline
const MOON_B_BRITE = 2 // terminator
const MOON_INNER_BRITE = 5 // inner detail

function toStroke(v: unknown): Stroke | null {
  if (!Array.isArray(v) || v.length !== 3) return null
  const [a, b, c] = v as unknown[]
  if (typeof a !== 'number' || typeof b !== 'number' || typeof c !== 'number') return null
  return [a, b, c]
}

describe('bz3-8 — MTN0..MTN7 ridge data is the byte-exact ROM decode (H-002)', () => {
  it('exports MTN_SEGMENTS with exactly 8 segments (MTNS JSRLs MTN0..MTN7)', () => {
    const segs = need(horizon.MTN_SEGMENTS, 'MTN_SEGMENTS')
    expect(Array.isArray(segs)).toBe(true)
    expect(segs.length).toBe(8)
  })

  it('each stroke is an integer [dx, dy, brite] triple in vector-generator units', () => {
    const segs = need(horizon.MTN_SEGMENTS, 'MTN_SEGMENTS')
    for (const seg of segs) {
      expect(seg.length).toBeGreaterThan(0)
      for (const raw of seg) {
        const s = toStroke(raw)
        expect(s, `stroke ${JSON.stringify(raw)} must be a [dx,dy,brite] number triple`).not.toBeNull()
        if (s) for (const n of s) expect(Number.isInteger(n)).toBe(true)
      }
    }
  })

  it('per-segment stroke counts match the ROM [50,14,31,16,11,15,14,6]', () => {
    const segs = need(horizon.MTN_SEGMENTS, 'MTN_SEGMENTS')
    expect(segs.map((s) => s.length)).toEqual(EXPECTED_COUNTS)
  })

  it('the ridge has the ROM vertex count: 157 strokes across all segments', () => {
    const segs = need(horizon.MTN_SEGMENTS, 'MTN_SEGMENTS')
    expect(segs.reduce((n, s) => n + s.length, 0)).toBe(EXPECTED_TOTAL)
  })

  it('every segment is a byte-exact hex decode of its BZMTNS.MAC lines', () => {
    const segs = need(horizon.MTN_SEGMENTS, 'MTN_SEGMENTS')
    for (let i = 0; i < EXPECTED_SEGMENTS.length; i++) {
      // Normalise to plain arrays so readonly-tuple vs array shapes deep-equal.
      const actual = (segs[i] ?? []).map((s) => [...(s as readonly number[])])
      const expected = EXPECTED_SEGMENTS[i].map((s) => [...s])
      expect(actual, `MTN${i} must byte-match BZMTNS.MAC (segment ${i})`).toEqual(expected)
    }
  })

  it('the whole ridge uses exactly the ROM brightness tiers {0,2,3,5,7}', () => {
    const segs = need(horizon.MTN_SEGMENTS, 'MTN_SEGMENTS')
    const tiers = new Set<number>()
    for (const seg of segs) for (const s of seg) {
      const st = toStroke(s)
      if (st) tiers.add(st[2])
    }
    expect([...tiers].sort((a, b) => a - b)).toEqual([0, 2, 3, 5, 7])
  })

  it('non-moon ridge strokes are only moves (brite 0) or draws (brite 3)', () => {
    // Tiers 7/2/5 are the moon's; the plain ridge is brite 0 (pen-up) + 3 (draw).
    const segs = need(horizon.MTN_SEGMENTS, 'MTN_SEGMENTS')
    for (let i = 0; i < segs.length; i++) {
      const strokes = [...segs[i]]
      // In MTN0 the moon (17..48) is exempt — every other stroke is {0,3}.
      strokes.forEach((raw, j) => {
        if (i === 0 && j >= MOON_START && j < MOON_END) return
        const s = toStroke(raw)
        expect(s).not.toBeNull()
        if (s) expect([0, 3]).toContain(s[2])
      })
    }
  })
})

describe('bz3-8 — the MOON is embedded in MTN0 with three brite tiers 7/2/5 (H-003)', () => {
  it('the moon lives inside MTN0 (segment 0), not authored as its own segment', () => {
    const segs = need(horizon.MTN_SEGMENTS, 'MTN_SEGMENTS')
    const mtn0 = [...(segs[0] ?? [])].map(toStroke)
    // The disc-outline tier (7), terminator tier (2), and inner tier (5) all
    // appear ONLY within MTN0 — proof the moon rides on the first ridge chunk.
    const specialTiers = new Set([MOON_A_BRITE, MOON_B_BRITE, MOON_INNER_BRITE])
    for (let i = 1; i < segs.length; i++) {
      for (const raw of segs[i]) {
        const s = toStroke(raw)
        if (s) expect(specialTiers.has(s[2]), `MTN${i} must not carry a moon-tier stroke`).toBe(false)
      }
    }
    expect(mtn0.some((s) => s !== null && s[2] === MOON_A_BRITE)).toBe(true)
  })

  it('MOON PART A is 14 consecutive brite-7 strokes; the first is [5,-12,7] (BZMTNS.MAC:36)', () => {
    const segs = need(horizon.MTN_SEGMENTS, 'MTN_SEGMENTS')
    const partA = [...(segs[0] ?? [])].slice(MOON_START, MOON_START + 14).map(toStroke)
    expect(partA.length).toBe(14)
    expect(partA.every((s) => s !== null && s[2] === MOON_A_BRITE)).toBe(true)
    expect(partA[0]).toEqual([5, -12, MOON_A_BRITE]) // VCTR 5,-0C,7 ;MOON
  })

  it('MOON PART B is 6 consecutive brite-2 terminator strokes (BZMTNS.MAC:50-55)', () => {
    const segs = need(horizon.MTN_SEGMENTS, 'MTN_SEGMENTS')
    const partB = [...(segs[0] ?? [])].slice(MOON_START + 14, MOON_START + 20).map(toStroke)
    expect(partB.length).toBe(6)
    expect(partB.every((s) => s !== null && s[2] === MOON_B_BRITE)).toBe(true)
    expect(partB[0]).toEqual([-13, 3, MOON_B_BRITE]) // VCTR -0D,3,2
  })

  it('the moon carries a brite-5 inner-detail run (BZMTNS.MAC:56-67)', () => {
    const segs = need(horizon.MTN_SEGMENTS, 'MTN_SEGMENTS')
    const moon = [...(segs[0] ?? [])].slice(MOON_START, MOON_END).map(toStroke)
    const brite5 = moon.filter((s) => s !== null && s[2] === MOON_INNER_BRITE)
    expect(brite5.length).toBe(9) // 9 brite-5 strokes among the inner detail
  })

  it('the moon grades across all three tiers {2,5,7} (not a flat outline)', () => {
    const segs = need(horizon.MTN_SEGMENTS, 'MTN_SEGMENTS')
    const moon = [...(segs[0] ?? [])].slice(MOON_START, MOON_END).map(toStroke)
    const visibleTiers = new Set(moon.filter((s): s is Stroke => s !== null && s[2] > 0).map((s) => s[2]))
    expect([...visibleTiers].sort((a, b) => a - b)).toEqual([2, 5, 7])
  })
})

describe('bz3-8 — the procedural two-sine ridge and separate crescent moon are GONE', () => {
  // Behavioural guards that survive the phase: reconstruct the OLD authored data
  // exactly (same float expressions as horizon.ts:53-89 today) and require that
  // NO PANORAMA polyline reproduces it. RED now (the two-sine IS present), GREEN
  // once the ridge/moon are ported from the ROM.
  const TAU = 2 * Math.PI

  const oldTwoSineRidge = Array.from({ length: 49 }, (_, k) => {
    const az = (k % 48) * (TAU / 48)
    const el = Math.max(0, 0.055 + 0.045 * Math.sin((k % 48) * 2.9) + 0.03 * Math.sin((k % 48) * 1.35 + 2))
    return [az, el] as const
  })

  const oldCrescentMoon = [
    ...Array.from({ length: 9 }, (_, i) => {
      const t = -2.2 + (i * 4.4) / 8
      return [5.5 + 0.045 * Math.sin(t), 0.24 + 0.045 * Math.cos(t)] as const
    }),
    ...Array.from({ length: 7 }, (_, i) => {
      const t = 2.0 - (i * 4.0) / 6
      return [5.514 + 0.034 * Math.sin(t), 0.243 + 0.034 * Math.cos(t)] as const
    }),
  ]

  const samePoints = (a: readonly (readonly [number, number])[], b: readonly (readonly [number, number])[]): boolean =>
    a.length === b.length && a.every((p, i) => Math.abs(p[0] - b[i][0]) < 1e-9 && Math.abs(p[1] - b[i][1]) < 1e-9)

  it('no PANORAMA polyline is the old 49-sample two-sine ridge (H-002 replaced)', () => {
    const panorama = need(horizon.PANORAMA, 'PANORAMA')
    expect(panorama.length).toBeGreaterThan(0) // guard against a vacuous pass
    expect(panorama.some((p) => samePoints(p.points, oldTwoSineRidge))).toBe(false)
  })

  it('no PANORAMA polyline is the old independently-authored crescent moon (H-003 replaced)', () => {
    const panorama = need(horizon.PANORAMA, 'PANORAMA')
    expect(panorama.length).toBeGreaterThan(0)
    expect(panorama.some((p) => samePoints(p.points, oldCrescentMoon))).toBe(false)
  })
})
