// plugins/defender/tests/pt1-26-ship-facing-flip.test.ts
//
// Story pt1-26 — RED phase (Leeloo / TEA). Owner playtest bug (2026-08-19), confirmed in
// the 2026-08-20 render audit: reversing the ship does not flip its SPRITE — it always
// faces right.
//
// ─── WHERE THE BUG LIVES ──────────────────────────────────────────────────────────────
// The facing is fully TRACKED: sim.ts steps `state.ship.facing` between 'right'/'left'
// (ship.ts stepReverse, REV debounce DEFA7.SRC:3155-3171). The RENDER ignores it:
// scene.ts blits SHIP_OBJECT (PLAPIC) at `state.ship.x/y` with a bare
// `blitObject(fb, PLAPIC, x, y)` and no facing branch, and PLAPIC (objects-data.ts,
// DEFB6.SRC:1961) is a lone RIGHT-facing 8×6 cell with no mirrored variant. So a
// left-facing ship draws byte-for-byte identical to a right-facing one.
//
// The in-file idiom GREEN should mirror: drawLaserStreak (scene.ts) ALREADY threads
// `facing` at render — the laser respects facing while the ship sprite does not.
//
// ─── APPROACH: BLACK-BOX over composeFrame, ORACLE from the real blitObject ────────────
// The df7-8 / df5-7 precedent: pin BEHAVIOUR through composeFrame, never an internal
// export name or the exact flip API. GREEN is free to add a flip flag to blitObject or a
// mirrored sprite — either satisfies these.
//
// The ORACLE is the already-correct right-facing PLAPIC pixel map, produced by the
// existing (tested) blitObject into a clean framebuffer — NOT a hand-decoded literal
// (avoids reimplementing the column-major nibble decode, lang-review TS #18/#26). The one
// thing computed in-test is the horizontal MIRROR (local px → W-1-px), which is the whole
// fix. Because PLAPIC is asymmetric (a ship, not a blob), the mirror is a real transform —
// asserted below as a precondition so AC2/AC3 cannot pass vacuously.
//
// Reads are restricted to the ship's FOREGROUND pixels. The ship is blitted AFTER stars
// and terrain and nothing overdraws its play-field box (landers:[], no lasers, the HUD is
// top-band / far-left) — so a foreground read is the ship's own index, never a star behind
// a transparent nibble. The two frames differ ONLY in `ship.facing`; composeFrame is a pure
// function of state and reads facing nowhere today, so the frames are identical now → RED.

import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import { createFramebuffer, type Framebuffer } from '../src/core/framebuffer.js'
import { blitObject, OBJECTS, type ObjectImage } from '../src/core/objects.js'
import { composeFrame } from '../src/core/scene.js'
import { createSim, type SimState } from '../src/core/sim.js'
import type { Facing } from '../src/core/world.js'

const LOGICAL_WIDTH = 292 // src/shell/render.ts LOGICAL_WIDTH — core takes it as an arg (df5-7/df7-5 precedent)
const LOGICAL_HEIGHT = 240

// A clear play-field slot for the ship box, chosen away from every other draw: below the
// top scanner band (~40 rows), above the terrain (~row 186+), and fully within the raster.
const SHIP_X = 140
const SHIP_Y = 110

const PLAPIC: ObjectImage = (() => {
  const o = OBJECTS.find((r) => r.name === 'PLAPIC' && r.encoding === 'raster')
  if (!o) throw new Error('PLAPIC not found in OBJECTS — fixture precondition failed')
  return o
})()

const SHIP_W = PLAPIC.width * 2 // two 4-bit pixels per cell byte → 16 px wide
const SHIP_H = PLAPIC.height // 6 px tall

/** Deterministic byte source (LCG) — the df7-8 shape, no ambient entropy. */
function makeRand(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return (s >>> 16) & 0xff
  }
}

/** A play state with NO live attacker, the ship parked at a fixed clear slot facing `f`. */
function shipState(seed: number, f: Facing): SimState {
  const base = createSim(makeRand(seed))
  return { ...base, landers: [], ship: { ...base.ship, x: SHIP_X, y: SHIP_Y, facing: f } }
}

const digest = (fb: Framebuffer): string => createHash('sha256').update(fb.data).digest('hex').slice(0, 16)

/** The right-facing PLAPIC FOREGROUND map, rendered by the real blitObject: local
 *  "px,py" → palette index, for every non-transparent pixel. This is the oracle. */
function shipForegroundMap(): Map<string, number> {
  const ref = createFramebuffer(SHIP_W, SHIP_H) // zero-filled → unwritten cells are 0 (transparent)
  blitObject(ref, PLAPIC, 0, 0)
  const map = new Map<string, number>()
  for (let py = 0; py < SHIP_H; py++) {
    for (let px = 0; px < SHIP_W; px++) {
      const v = ref.data[py * ref.width + px]
      if (v !== 0) map.set(`${px},${py}`, v)
    }
  }
  return map
}

/** Read one framebuffer cell (row-major palette index). */
const at = (fb: Framebuffer, x: number, y: number): number => fb.data[y * fb.width + x]

const REF = shipForegroundMap()

// ─── Precondition — the sprite is ASYMMETRIC, so a mirror is a real transform ──────────
describe('pt1-26 precondition — PLAPIC is not horizontally symmetric', () => {
  it('the mirror of the PLAPIC foreground differs from the foreground itself', () => {
    // If PLAPIC mirrored equalled PLAPIC, a no-op GREEN would satisfy AC2/AC3 vacuously.
    // This anchors their non-vacuity to the real sprite data (OBJECTS), not a test literal.
    expect(REF.size, 'PLAPIC has no foreground pixels — fixture broken').toBeGreaterThan(0)
    const mirrored = new Map<string, number>()
    for (const [key, v] of REF) {
      const [px, py] = key.split(',').map(Number)
      mirrored.set(`${SHIP_W - 1 - px},${py}`, v)
    }
    let differs = false
    for (const [key, v] of REF) if (mirrored.get(key) !== v) differs = true
    expect(differs, 'PLAPIC is horizontally symmetric — the mirror assertions would be vacuous').toBe(true)
  })
})

// ─── AC1 (control) — a RIGHT-facing ship keeps the canonical, UN-mirrored PLAPIC ───────
describe('pt1-26 AC1 — facing right draws PLAPIC in its canonical orientation', () => {
  it('every PLAPIC foreground pixel appears UN-mirrored at the ship position', () => {
    // Green on arrival: guards the inverse regression — a GREEN that mirrors unconditionally,
    // or inverts the facing test, would flip the RIGHT-facing ship and redden this.
    const fb = composeFrame(shipState(3, 'right'), LOGICAL_WIDTH, LOGICAL_HEIGHT)
    for (const [key, v] of REF) {
      const [px, py] = key.split(',').map(Number)
      expect(
        at(fb, SHIP_X + px, SHIP_Y + py),
        `right-facing ship pixel wrong at local (${px},${py})`,
      ).toBe(v)
    }
  })
})

// ─── AC2 (RED — the fix) — a LEFT-facing ship draws the horizontal MIRROR of PLAPIC ────
describe('pt1-26 AC2 — facing left horizontally mirrors the ship sprite', () => {
  it('every PLAPIC foreground pixel appears MIRRORED (local px → W-1-px) at the ship position', () => {
    // RED today: render ignores facing, so the left frame is byte-identical to the right and
    // the ship still faces right — the mirrored column carries the wrong index. GREEN mirrors
    // PLAPIC on facing === 'left'. Pinning the exact mirror column (W-1-px, not W-px) also
    // rejects an off-by-one flip that would clip the sprite one pixel.
    const fb = composeFrame(shipState(5, 'left'), LOGICAL_WIDTH, LOGICAL_HEIGHT)
    for (const [key, v] of REF) {
      const [px, py] = key.split(',').map(Number)
      expect(
        at(fb, SHIP_X + (SHIP_W - 1 - px), SHIP_Y + py),
        `left-facing ship not mirrored at local (${px},${py}) → expected index ${v} at mirror column`,
      ).toBe(v)
    }
  })
})

// ─── AC3 (RED — the owner report, coarse) — flipping the ship flips the sprite ─────────
describe('pt1-26 AC3 — reversing the ship changes what is drawn', () => {
  it('the left-facing and right-facing frames DIFFER inside the ship box', () => {
    // The owner report verbatim: "flipping the ship around does not flip the sprite." Two
    // states identical but for facing must produce a visibly different ship. RED today —
    // facing is read nowhere, so the frames are identical and no pixel differs.
    const right = composeFrame(shipState(7, 'right'), LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const left = composeFrame(shipState(7, 'left'), LOGICAL_WIDTH, LOGICAL_HEIGHT)
    let differing = 0
    for (let py = 0; py < SHIP_H; py++) {
      for (let px = 0; px < SHIP_W; px++) {
        if (at(right, SHIP_X + px, SHIP_Y + py) !== at(left, SHIP_X + px, SHIP_Y + py)) differing++
      }
    }
    expect(differing, 'the ship sprite is identical for left and right facing — the reverse is invisible').toBeGreaterThan(0)
  })
})

// ─── AC4 — the flip is deterministic (no clock/entropy, no strobe hazard) ──────────────
describe('pt1-26 AC4 — the left-facing render is deterministic', () => {
  it('the same left-facing state renders identically (composeFrame is pure of state)', () => {
    // A flip that read a clock or minted entropy would break this — and would also fail the
    // src/core purity sweep (tests/purity.test.ts scans core/scene.ts). Same state → same frame.
    const s = shipState(9, 'left')
    expect(digest(composeFrame(s, LOGICAL_WIDTH, LOGICAL_HEIGHT))).toBe(
      digest(composeFrame(s, LOGICAL_WIDTH, LOGICAL_HEIGHT)),
    )
  })
})
