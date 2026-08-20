// tests/pt1-24-scanner-banks.test.ts
//
// Story pt1-24 (O'Brien / TEA, RED). TWO BUGS in the scanner strip:
//
// (1) BLIPS: drawScanner (core/scene.ts) builds its blip list from `state.landers` ONLY, so the
// radar — the instrument the player flies by — is blind to every other attacker. The ROM's SCNR
// blip loop (SCNR10/SCNR3, AMODE1.SRC:1259-1274) walks the WHOLE live-object chain (`LDX ,X /
// BNE SCNR10` follows every linked OBJ record) and reads each object's OWN colour (`LDD OBJCOL,X`
// :1270) — mutants, baiters, bombers, pods, swarmers, bombs and the humanoids all blip, each in
// its own colour, whether or not the main view shows them (the projection reads the ABSOLUTE
// OX16, :1260, not the visible window). GREEN: drawScanner projects every live bank + humanoids
// through the same projectScanner, coloured by each sprite's own first non-zero nibble (the
// existing spriteColour seam the lander path already uses).
//
// (2) MTERR: the mini-terrain contour is transcribed (core/terrain-data.ts MTERR, BLK71.SRC:529)
// but drawn NOWHERE (the scanner.ts header marks it "still deferred df7 work"). THE ROM DRAW
// (MT1/MTLP, AMODE1.SRC:1197-1224), read instruction by instruction:
//     MT1  LDD  BGL / SUBD #$8000-(150*32) / STD XTEMP   ; XTEMP = scanner-left world-X (:1197-1199)
//          LSRA / LSRA                                    ; A = XTEMP's hi byte >> 2 = XTEMP >> 10
//                                                         ;   = the scanner-left STRIP COLUMN 0..63 (:1200-1201)
//          LDU #MTERR / LDB #3 / MUL / LEAU D,U           ; U = MTERR + 3*column — THREE bytes per column (:1202-1205)
//          LDA #SCANER!>8                                 ; A = the strip's first screen column-byte (:1209)
//     MTLP PULU B,X                                       ; B = triple byte0 (the screen ROW), X = bytes1-2 (:1213)
//          STD ,Y / STX [,Y++]                            ; write the TWO pattern bytes at screen (col,row),(col,row+1) (:1214-1215)
//          INCA … CMPA #(SCANER!>8)+64 / BNE MTLP         ; 64 strip columns (:1216-1224)
// So: MTERR is 128 triples [row, pat0, pat1] — 64 world columns DOUBLED (bytes 0-191 == 192-383,
// asserted below) so a 64-triple read starting at any column 0..63 never needs a wrap check. Per
// column: byte0 is the contour's screen ROW (values $1C-$26); pat0 draws at that row, pat1 at
// row+1 (Williams VRAM is column-major — consecutive addresses step DOWN the screen). The pattern
// bytes are only $70/$07/$77/$00: every non-zero nibble is 7, i.e. the contour is PALETTE INDEX 7,
// and pat0 is never $00, so the TOPMOST painted row of every column is exactly the triple's row
// byte. The camera ROTATES the table start (U = MTERR + 3*(XTEMP>>10)) — the same >>10 world
// compression the blips use, so the mini-terrain scrolls in register with them.
//
// WHAT THESE TESTS PIN vs LEAVE FREE: the strip geometry is our re-derived centred one (the
// df5-7/df7-5 originX + SCANNER_ORIGIN_Y band, per the scanner.ts header's re-derivation note), so
// the contour's ABSOLUTE row anchor is Dev's to place inside the band — the tests pin the
// ROM-determined parts: full 64-column coverage, palette index 7, the per-column row PROFILE
// (relative to column 0 — invariant under any row-anchor shift) and its camera ROTATION.
//
// METHOD: the pt1-23/pt1-18 diff-against-control idiom, restricted to the scanner band. A frame
// with one live member diffs against the same frame with every population emptied; everything
// shared cancels, so band diffs == that member's blip. The member sits at main-view row EY=100 —
// OUTSIDE the band rows — so its main-view sprite (pt1-23's blit) never contaminates the diff.
// The MTERR tests need no diff: on an all-banks-empty frame the band holds only the bezel (index
// 9), the player blip (index 9) and — after GREEN — the contour, the band's ONLY index-7 pixels
// (no bank sprite's first nibble is 7 either, asserted below, so a blip can never cancel against
// or masquerade as contour).

import { describe, it, expect } from 'vitest'
import { createSim, type SimState } from '../src/core/sim.js'
import { composeFrame } from '../src/core/scene.js'
import { OBJECTS } from '../src/core/objects.js'
import { TERRAIN } from '../src/core/terrain.js'
import { projectWorldX, wrap16 } from '../src/core/world.js'
import {
  projectScanner,
  SCANNER_COLUMNS,
  SCANNER_LEFT_OFFSET,
  SCANNER_X_SHIFT,
} from '../src/core/scanner.js'
import type { Framebuffer } from '../src/core/framebuffer.js'

const W = 292
const H = 240

/** The centred strip's left edge — the same `(fb.width - SCANNER_COLUMNS) >> 1` drawScanner,
 *  drawScannerBezel and drawPlayerBlip all derive (scene.ts). */
const ORIGIN_X = (W - SCANNER_COLUMNS) >> 1 // 114
/** The strip's top row — scene.ts SCANNER_ORIGIN_Y. */
const SCANNER_ORIGIN_Y = 2
/** Band rows scanned for blips/contour: generous, but well above the main-view fixtures (EY=100)
 *  and the planet surface (rows ~186+), so nothing else can land in it. */
const BAND_ROWS = 60

/** Members sit at main-view row 100 — inside the play band, OUTSIDE the scanner band. */
const EY = 100
/** On-main-window world-X (projectWorldX(WX, 0) = 121). Blip column: scannerLeft(0) =
 *  wrap16(0 − $6D40) = $92C0 = 37568; wrap16(4000 − 37568) >> 10 = 31. */
const WX = 4000
/** OFF-main-window world-X (projectWorldX = null at camera 0) — the radar MUST still show it
 *  (SCNR reads absolute OX16, AMODE1.SRC:1260). Blip column 46. */
const OFF_WX = 20000

/** Predict a blip's framebuffer pixel through the REAL df5-1 projection — the AC is "at the
 *  column projectScanner predicts", so the tests use it rather than re-deriving the shifts. */
function predictBlip(worldX: number, camera: number): { x: number; y: number } {
  const [b] = projectScanner([{ worldX, y: EY, colour: 0 }], camera)
  return { x: ORIGIN_X + b.x, y: SCANNER_ORIGIN_Y + b.y }
}
const BLIP = predictBlip(WX, 0) // (145, 14)
const OFF_BLIP = predictBlip(OFF_WX, 0) // (160, 14)

/** The blip colour the story mandates: the sprite's OWN first non-zero nibble — the exact
 *  algorithm of scene.ts's spriteColour (hi nibble first, then lo, byte by byte). */
function spriteFirstNibble(label: string): number {
  const obj = OBJECTS.find((o) => o.name === label)
  if (!obj) throw new Error(`test fixture: sprite ${label} is not in OBJECTS`)
  for (const byte of obj.bytes) {
    const hi = byte >> 4
    const lo = byte & 0x0f
    if (hi !== 0) return hi
    if (lo !== 0) return lo
  }
  throw new Error(`test fixture: sprite ${label} is all-transparent`)
}

function makeRand(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return (s >>> 16) & 0xff
  }
}

const base = createSim(makeRand(1))

/** The control state: `base` with EVERY population emptied (the pt1-23 `cleared` idiom), so a
 *  single placed member is the only thing a band diff can pick up. */
const cleared = (camera = 0): SimState => ({
  ...base,
  camera,
  stars: [],
  lasers: [],
  landers: [],
  humanoids: [],
  mutants: [],
  baiters: [],
  bombers: [],
  bombs: [],
  pods: [],
  swarmers: [],
  shots: [],
  effects: [],
})

interface BandPixel {
  readonly x: number
  readonly y: number
  /** The pixel's palette index in the FIRST (populated) frame. */
  readonly v: number
}

/** Pixels differing between two frames WITHIN the scanner band only (strip columns × band rows). */
function bandDiff(a: Framebuffer, b: Framebuffer): BandPixel[] {
  const out: BandPixel[] = []
  for (let x = ORIGIN_X; x < ORIGIN_X + SCANNER_COLUMNS; x++) {
    for (let y = 0; y < BAND_ROWS; y++) {
      const i = y * W + x
      if (a.data[i] !== b.data[i]) out.push({ x, y, v: a.data[i] })
    }
  }
  return out
}

/** The band diff a state produces against the all-empty control at the same camera. */
const blipDiff = (state: SimState, camera: number): BandPixel[] =>
  bandDiff(composeFrame(state, W, H), composeFrame(cleared(camera), W, H))

interface ScanCase {
  /** Public SimState field drawScanner must read. */
  readonly name: string
  /** The bank's ROM sprite — its first non-zero nibble is the mandated blip colour. */
  readonly sprite: string
  /** N LIVE members, one per world-x, on an otherwise-empty state. */
  readonly at: (wxs: readonly number[], camera: number) => SimState
  /** One DEAD member (null for bombs — a Bomb has `lifetime`, not `alive`). */
  readonly dead: ((wx: number) => SimState) | null
}

/** Every non-lander population the ROM's SCNR chain blips: the pt1-23 six banks + humanoids.
 *  (Enemy SHOTS are not OBJ-chain records — the ROM's shot system is separate — so they are
 *  deliberately absent.) */
const CASES: readonly ScanCase[] = [
  {
    name: 'humanoids',
    sprite: 'ASTP1',
    at: (wxs, c) => ({
      ...cleared(c),
      humanoids: wxs.map((x) => ({ x, y: EY, facing: 'right' as const, state: 'walking' as const, alive: true })),
    }),
    dead: (wx) => ({
      ...cleared(0),
      humanoids: [{ x: wx, y: EY, facing: 'right' as const, state: 'walking' as const, alive: false }],
    }),
  },
  {
    name: 'mutants',
    sprite: 'SCZP1',
    at: (wxs, c) => ({ ...cleared(c), mutants: wxs.map((x) => ({ x, y: EY, alive: true })) }),
    dead: (wx) => ({ ...cleared(0), mutants: [{ x: wx, y: EY, alive: false }] }),
  },
  {
    name: 'baiters',
    sprite: 'UFOP1',
    at: (wxs, c) => ({ ...cleared(c), baiters: wxs.map((x) => ({ x, y: EY, alive: true })) }),
    dead: (wx) => ({ ...cleared(0), baiters: [{ x: wx, y: EY, alive: false }] }),
  },
  {
    name: 'bombers',
    sprite: 'TIEP1',
    at: (wxs, c) => ({ ...cleared(c), bombers: wxs.map((x) => ({ x, y: EY, alive: true })) }),
    dead: (wx) => ({ ...cleared(0), bombers: [{ x: wx, y: EY, alive: false }] }),
  },
  {
    name: 'pods',
    sprite: 'PRBP1',
    at: (wxs, c) => ({ ...cleared(c), pods: wxs.map((x) => ({ x, y: EY, alive: true })) }),
    dead: (wx) => ({ ...cleared(0), pods: [{ x: wx, y: EY, alive: false }] }),
  },
  {
    name: 'swarmers',
    sprite: 'SWPIC1',
    at: (wxs, c) => ({ ...cleared(c), swarmers: wxs.map((x) => ({ x, y: EY, alive: true })) }),
    dead: (wx) => ({ ...cleared(0), swarmers: [{ x: wx, y: EY, alive: false }] }),
  },
  {
    // A Bomb carries `lifetime`, not `alive` (ties.ts): it exists while in the bank, so there is
    // no dead case. It IS an OBJ-chain record in the ROM (a drawn, collidable object), so it blips.
    name: 'bombs',
    sprite: 'BMBP1',
    at: (wxs, c) => ({ ...cleared(c), bombs: wxs.map((x) => ({ x, y: EY, lifetime: 30 })) }),
    dead: null,
  },
]

/** The landers, kept OUT of CASES: their blips work today — they are the regression guard. */
const landersAt = (wxs: readonly number[], camera: number): SimState => ({
  ...cleared(camera),
  landers: wxs.map((x) => ({ x, y: EY, alive: true, carrying: false, reachedTop: false })),
})

// ─── MTERR fixtures ────────────────────────────────────────────────────────────────
const MTERR = TERRAIN.find((t) => t.name === 'MTERR')
if (!MTERR) throw new Error('test fixture: MTERR is not in the transcribed TERRAIN data')
/** Triple `t`'s ROW byte — the contour's vertical position at world strip-column t (mod 64). */
const mtRow = (t: number): number => MTERR.bytes[3 * t]
/** The table start column the camera selects — the ROM's `LSRA/LSRA` on XTEMP's hi byte, i.e.
 *  scannerLeft >> 10 (AMODE1.SRC:1200-1205). The SAME shift the blips use. */
const mtStart = (camera: number): number => wrap16(camera - SCANNER_LEFT_OFFSET) >> SCANNER_X_SHIFT
/** The contour's palette index: every non-zero nibble in every MTERR pattern byte (asserted in
 *  the fixture-sanity test below). */
const CONTOUR_COLOUR = 7

/** Per strip column 0..63: the TOPMOST band row painted CONTOUR_COLOUR on an all-banks-empty
 *  frame, or null if none. Post-GREEN these pixels can only be the contour: the band otherwise
 *  holds only the bezel + player blip (both index 9), and no attacker exists to blip. */
function contourTops(camera: number): (number | null)[] {
  const fb = composeFrame(cleared(camera), W, H)
  const tops: (number | null)[] = []
  for (let c = 0; c < SCANNER_COLUMNS; c++) {
    let top: number | null = null
    for (let y = 0; y < BAND_ROWS; y++) {
      if (fb.data[y * W + ORIGIN_X + c] === CONTOUR_COLOUR) {
        top = y
        break
      }
    }
    tops.push(top)
  }
  return tops
}

describe('pt1-24 — fixture sanity (the premises every test below leans on)', () => {
  it('the world-x fixtures land where claimed: WX on the main window, OFF_WX off it, blips in-strip and clear of the player blip', () => {
    expect(projectWorldX(WX, 0), 'WX must be ON the main window').not.toBeNull()
    expect(projectWorldX(OFF_WX, 0), 'OFF_WX must be OFF the main window at camera 0').toBeNull()
    // Pinned so the projection-agreement assertions below are explicit numbers, not tautologies.
    expect(BLIP).toEqual({ x: 145, y: 14 })
    expect(OFF_BLIP).toEqual({ x: 160, y: 14 })
    // The df7-8 player blip (ship at plax16 $2000 → world-x 2048 → strip column 29, rows 17-19,
    // index 9) collides with neither fixture blip nor their rows.
    expect(predictBlip(2048, 0).x, 'player column must differ from both fixture columns').toBe(143)
  })

  it('MTERR is the doubled 64-column triple table the ROM walks, and its only pixel nibble is 7', () => {
    // 128 triples of [row, pat0, pat1] (MTLP PULU B,X — 3 bytes per strip column, AMODE1.SRC:1213)…
    expect(MTERR.bytes.length).toBe(384)
    // …doubled — bytes 0-191 == 192-383 — so a 64-triple read from any start 0..63 never wraps.
    expect(MTERR.bytes.slice(192)).toEqual(MTERR.bytes.slice(0, 192))
    const nibbles = new Set<number>()
    for (let t = 0; t < 128; t++) {
      for (const pat of [MTERR.bytes[3 * t + 1], MTERR.bytes[3 * t + 2]]) {
        for (const n of [pat >> 4, pat & 0x0f]) if (n !== 0) nibbles.add(n)
      }
      // pat0 is never $00 — so the TOPMOST painted row of a column is exactly its row byte,
      // which is what the profile assertions below measure.
      expect(MTERR.bytes[3 * t + 1], `triple ${t}: pat0 must be non-zero`).not.toBe(0)
    }
    expect([...nibbles], 'the contour paints palette index 7 and nothing else').toEqual([CONTOUR_COLOUR])
    // The camera→start-column relation used below, pinned as numbers.
    expect(mtStart(0)).toBe(36)
    expect(mtStart(1024)).toBe(37)
    // No bank sprite's blip colour is 7, so a blip can never masquerade as (or cancel against) contour.
    for (const { sprite } of CASES) expect(spriteFirstNibble(sprite)).not.toBe(CONTOUR_COLOUR)
  })
})

describe('pt1-24 — every live bank + humanoids blip on the scanner (today drawScanner reads only state.landers)', () => {
  it.each(CASES)('a live on-window $name member blips at its projected column in its own sprite colour ($sprite)', ({ name, sprite, at }) => {
    const diffs = blipDiff(at([WX], 0), 0)
    expect(
      diffs.length,
      `a live ${name} member paints NO scanner blip — drawScanner (core/scene.ts) builds its object list ` +
        `from state.landers only, but the ROM's SCNR chain walk (SCNR10/SCNR3, AMODE1.SRC:1259-1274) blips ` +
        `EVERY live object. GREEN: project state.${name} through the same projectScanner.`,
    ).toBeGreaterThan(0)
    // Position: exactly the column projectScanner predicts, at the lander path's band row; the ROM
    // blip is one column-byte wide × two rows ($OBJCOL STD, :1270-1271), so one extra row is allowed.
    expect(
      diffs.some((d) => d.x === BLIP.x && d.y === BLIP.y),
      `${name} blip must include the projected pixel (${BLIP.x}, ${BLIP.y}); band diffs: ${JSON.stringify(diffs)}`,
    ).toBe(true)
    expect(
      diffs.every((d) => d.x === BLIP.x && d.y >= BLIP.y && d.y <= BLIP.y + 1),
      `every ${name} blip pixel must sit at column ${BLIP.x}, rows ${BLIP.y}-${BLIP.y + 1}; got ${JSON.stringify(diffs)}`,
    ).toBe(true)
    // Colour: the sprite's OWN first non-zero nibble (the spriteColour seam), per object — the
    // ROM reads OBJCOL per record (:1270), not one shared attacker colour.
    const colour = spriteFirstNibble(sprite)
    expect(
      diffs.every((d) => d.v === colour),
      `${name} blip must be its own sprite colour ${colour} (${sprite}'s first non-zero nibble); got ${JSON.stringify(diffs)}`,
    ).toBe(true)
  })

  it.each(CASES)('an OFF-main-window $name member STILL blips — the radar shows what the main view culls', ({ name, at }) => {
    // SCNR projects the ABSOLUTE OX16 (AMODE1.SRC:1260); there is no visible-window cull on radar —
    // spotting off-screen attackers is the scanner's entire purpose.
    const diffs = blipDiff(at([OFF_WX], 0), 0)
    expect(
      diffs.length,
      `an off-main-window ${name} member must still blip (SCNR reads absolute OX16, AMODE1.SRC:1260) — ` +
        `the main view culls it (projectWorldX null) but the radar must not`,
    ).toBeGreaterThan(0)
    expect(
      diffs.some((d) => d.x === OFF_BLIP.x && d.y === OFF_BLIP.y),
      `${name} off-window blip must land at (${OFF_BLIP.x}, ${OFF_BLIP.y}); got ${JSON.stringify(diffs)}`,
    ).toBe(true)
  })

  it.each(CASES)('EVERY live $name member blips, not just the first', ({ name, at }) => {
    const diffs = blipDiff(at([WX, OFF_WX], 0), 0)
    expect(
      diffs.some((d) => d.x === BLIP.x),
      `${name}: the first member (column ${BLIP.x}) must blip`,
    ).toBe(true)
    expect(
      diffs.some((d) => d.x === OFF_BLIP.x),
      `${name}: the SECOND member (column ${OFF_BLIP.x}) must blip too — the loop must cover every live ` +
        `member (SCNR3's chain walk), not recs[0]`,
    ).toBe(true)
  })

  it('landers still blip (regression): both members, at their projected columns, in LNDP1 colour, no window cull', () => {
    const diffs = blipDiff(landersAt([WX, OFF_WX], 0), 0)
    const colour = spriteFirstNibble('LNDP1')
    expect(diffs.some((d) => d.x === BLIP.x && d.y === BLIP.y)).toBe(true)
    expect(diffs.some((d) => d.x === OFF_BLIP.x && d.y === OFF_BLIP.y)).toBe(true)
    expect(
      diffs.every((d) => d.v === colour),
      `lander blips must stay LNDP1's own colour ${colour}; got ${JSON.stringify(diffs)}`,
    ).toBe(true)
  })
})

describe('pt1-24 — dead members produce no blip (the SCNR chain holds only LIVE objects)', () => {
  const KILLABLE = CASES.filter((c): c is ScanCase & { dead: NonNullable<ScanCase['dead']> } => c.dead !== null)

  it.each(KILLABLE)('a dead $name member is absent from the scanner', ({ name, at, dead }) => {
    // Non-vacuity first (lang-review #15): the SAME member alive MUST blip — this is the arm that
    // fails today, so this test is RED for the same missing-projection reason as the suite.
    expect(
      blipDiff(at([WX], 0), 0).length,
      `${name} sanity: a live member must blip (fails today — drawScanner ignores state.${name})`,
    ).toBeGreaterThan(0)
    expect(
      blipDiff(dead(WX), 0).length,
      `a dead ${name} member must NOT blip — carry the lander path's alive filter into every bank`,
    ).toBe(0)
  })

  it('a dead lander is absent from the scanner (regression)', () => {
    const deadLander: SimState = {
      ...cleared(0),
      landers: [{ x: WX, y: EY, alive: false, carrying: false, reachedTop: false }],
    }
    expect(blipDiff(landersAt([WX], 0), 0).length, 'sanity: a live lander blips').toBeGreaterThan(0)
    expect(blipDiff(deadLander, 0).length).toBe(0)
  })
})

describe('pt1-24 — the MTERR mini-terrain contour is drawn on the strip (MT1/MTLP, AMODE1.SRC:1197-1224)', () => {
  it('the contour spans ALL 64 strip columns in palette index 7, with no attackers alive', () => {
    // MTLP runs INCA per triple until CMPA #(SCANER!>8)+64 (:1216-1224): every strip column gets a
    // triple, and every triple's pat0 is non-zero — the contour is FULL-WIDTH and blip-independent.
    const tops = contourTops(0)
    const missing = tops.flatMap((t, c) => (t === null ? [c] : []))
    expect(
      missing,
      `strip columns with NO index-7 contour pixel — the MTERR mini-terrain (transcribed at ` +
        `core/terrain-data.ts, BLK71.SRC:529) is drawn nowhere: the scanner.ts header still marks it ` +
        `"deferred". GREEN: walk 64 triples from MTERR + 3*(scannerLeft>>10) (AMODE1.SRC:1202-1205), ` +
        `painting each column's pattern nibbles (index 7) at its row byte (and row+1) in the strip band.`,
    ).toEqual([])
  })

  it('the contour follows the MTERR row profile, rotated to the camera start column (camera 0 → triple 36)', () => {
    const tops = contourTops(0)
    expect(
      tops.filter((t) => t !== null).length,
      'no contour drawn at all (see the coverage test) — cannot check its profile',
    ).toBe(SCANNER_COLUMNS)
    // The per-column row deltas are ROM data: column c's topmost row is triple (start+c)'s row
    // byte (pat0 ≠ 0, sanity-pinned above). Relative to column 0, the profile is invariant under
    // whatever band row-anchor the port chooses — only the SHAPE and the ROTATION are pinned.
    const start = mtStart(0) // 36
    const observed = tops.map((t) => (t as number) - (tops[0] as number))
    const expected = Array.from({ length: SCANNER_COLUMNS }, (_, c) => mtRow(start + c) - mtRow(start))
    expect(observed, 'per-column contour rows must follow MTERR row bytes from triple 36').toEqual(expected)
  })

  it('the contour ROTATES with the camera (camera 1024 → start triple 37) — not a static drawing', () => {
    const tops = contourTops(1024)
    expect(
      tops.filter((t) => t !== null).length,
      'no contour drawn at camera 1024 (see the coverage test)',
    ).toBe(SCANNER_COLUMNS)
    const start = mtStart(1024) // 37 — one column on from camera 0's 36
    const observed = tops.map((t) => (t as number) - (tops[0] as number))
    const expected = Array.from({ length: SCANNER_COLUMNS }, (_, c) => mtRow(start + c) - mtRow(start))
    expect(
      observed,
      'the table start must be scannerLeft>>10 (LSRA/LSRA on XTEMP, AMODE1.SRC:1200-1205) — the ' +
        'contour scrolls in register with the blips, one strip column per 1024 world-X',
    ).toEqual(expected)
  })
})
