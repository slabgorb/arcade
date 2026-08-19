// plugins/defender/tests/df7-8-player-blip.test.ts
//
// Story df7-8 — RED phase (Leeloo / TEA). The scanner PLAYER BLIP: the last un-drawn
// scanner element, deferred to df7 by df5-7 (the attacker blips + score/men HUD) and df7-5
// (the bezel + wave). scene.ts's header records it as still df7's: "the scanner
// SCREEN-ADDRESS/player-blip (:1242-1257)".
//
// ─── WHAT THE ROM DOES (reference/original-source/defender/AMODE1.SRC:1242-1258) ───────
// *PLAYER BLIP OUTPUT keeps the player marker on a SEPARATE path from the SCNR world-attacker
// loop, because the player sits at a fixed screen position:
//     LDD  PLAXC           ; the player's fixed SCREEN position — NOT a world X  (:1242)
//     LSRA×4 / LSRB×3      ; its two bytes → the marker's radar column and row    (:1243-1249)
//     ADDD #$4B00+SCANH-1  ; PLAYER BASE                                          (:1250)
//     LDD  #$9099          ; the marker VALUE — palette index 9 (WHITE) hi-nibble (:1253)
//     STD ,X / STA 2,X / STA -$FF,X  ; a small marker, a handful of cells         (:1254-1257)
// The decisive difference from an attacker blip (SCNR10 :1260, which does `SUBD XTEMP` against
// the camera) is that the PLAYER path never subtracts the camera: the marker is CAMERA-INVARIANT.
// As the world scrolls under the fixed ship, an attacker blip drifts across the strip; the player
// marker holds its column. That is the property AC1 pins below.
//
// This suite is BLACK-BOX over composeFrame (the df5-7/df7-5 digest/top-band technique): it pins
// BEHAVIOUR (a WHITE marker appears inside the bezel, its row tracks the ship Y, its column does
// NOT drift with the camera, it is small and deterministic), never an internal constant, export
// name or the exact column formula — GREEN re-derives the layout to our strip geometry (the df5-7
// / df7-5 precedent: we frame OUR centred strip, not the Williams bitmap addresses).
//
// Isolation: with NO live attacker, drawScanner early-returns, so the strip band holds only the
// df7-5 bezel (index-9 rails at the two END columns) plus the future df7-8 player marker (index-9,
// an INTERIOR column). Stars walk the $11/$77 index cycle → indices 1..7 only (stars.ts), NEVER 9,
// and the score/men/wave HUD sits at x=2, far left of the centred strip. So an index-9 cell in the
// strip INTERIOR can ONLY be the player marker — which also makes "a WHITE (9) interior cell exists"
// double as the palette-index pin: a marker drawn in the wrong index leaves the interior empty and
// these assertions stay RED.

import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import type { Framebuffer } from '../src/core/framebuffer.js'
import { composeFrame } from '../src/core/scene.js'
import { createSim, type SimState } from '../src/core/sim.js'
import { SCANNER_COLUMNS, SCANNER_Y_SHIFT } from '../src/core/scanner.js'
import { wrap16 } from '../src/core/world.js'

const LOGICAL_WIDTH = 292 // src/shell/render.ts LOGICAL_WIDTH — core takes it as an arg (df5-7/df7-5 precedent)
const LOGICAL_HEIGHT = 240
const WHITE = 9 // palette index 9 — the $9099 marker (AMODE1.SRC:1253), same index-9 white as the df7-5 bezel
const WORLD = 0x10000
/** The top rows that hold the compressed radar strip (objY>>3), above the play field (df5-7). */
const SCANNER_BAND_ROWS = 40

/** Deterministic byte source (LCG) — the df3-6/df5-7/df7-5 shape, no ambient entropy. */
function makeRand(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return (s >>> 16) & 0xff
  }
}

const digest = (fb: Framebuffer): string => createHash('sha256').update(fb.data).digest('hex').slice(0, 16)

/** A play state with NO live attacker — isolates the bezel + player marker from attacker blips. */
function unpopulatedPlayState(seed: number): SimState {
  return { ...createSim(makeRand(seed)), landers: [] }
}

interface StripWhite {
  readonly left: number
  readonly right: number
  readonly leftRail: boolean
  readonly rightRail: boolean
  /** Index-9 cells strictly BETWEEN the bezel rails — the player marker (nothing else is 9 here). */
  readonly interior: readonly { x: number; y: number }[]
}

/** Scan the centred 64-column strip band for index-9 (WHITE) cells, split into bezel rails
 *  (the two END columns) and the interior (everything between — the player marker). */
function scanStripWhite(fb: Framebuffer): StripWhite {
  const originX = (fb.width - SCANNER_COLUMNS) >> 1
  const left = originX
  const right = originX + SCANNER_COLUMNS - 1
  const interior: { x: number; y: number }[] = []
  let leftRail = false
  let rightRail = false
  for (let y = 0; y < SCANNER_BAND_ROWS && y < fb.height; y++) {
    for (let x = left; x <= right; x++) {
      if (fb.data[y * fb.width + x] !== WHITE) continue
      if (x === left) leftRail = true
      else if (x === right) rightRail = true
      else interior.push({ x, y })
    }
  }
  return { left, right, leftRail, rightRail, interior }
}

const columnsOf = (cells: readonly { x: number }[]): number[] =>
  [...new Set(cells.map((c) => c.x))].sort((a, b) => a - b)
const topRow = (cells: readonly { y: number }[]): number => Math.min(...cells.map((c) => c.y))

// ─── AC1 — a WHITE player marker is drawn inside the scanner strip ─────────────────────
describe('df7-8 AC1 — the player marker is drawn inside the scanner strip (AMODE1.SRC:1242-1257)', () => {
  it('a live play frame draws a WHITE (index 9) player marker between the bezel rails', () => {
    // Today drawScannerBezel draws only the two END rails and drawScanner early-returns with no
    // attacker, so the strip interior is empty → RED. GREEN adds the player marker ($9099 = index
    // 9, :1253) at an interior column. Because stars are indices 1..7 and the HUD is off-strip, an
    // interior index-9 cell can only be this marker — so this also pins the WHITE colour.
    const fb = composeFrame(unpopulatedPlayState(3), LOGICAL_WIDTH, LOGICAL_HEIGHT)
    expect(
      scanStripWhite(fb).interior.length,
      'no WHITE (index 9) player marker between the bezel rails — the scanner player blip is un-drawn',
    ).toBeGreaterThan(0)
  })

  it('the player marker sits INSIDE the df7-5 bezel — framed by both rails (AC2)', () => {
    // AC2: the marker is drawn inside the df7-5 bezel bounds. The two rails must still frame the
    // strip (df7-5, green) and the marker must land STRICTLY between them, never on/outside a rail.
    const fb = composeFrame(unpopulatedPlayState(7), LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const s = scanStripWhite(fb)
    expect(s.leftRail && s.rightRail, 'the df7-5 bezel rails are missing — cannot frame the marker').toBe(true)
    expect(s.interior.length, 'no player marker inside the bezel').toBeGreaterThan(0)
    for (const c of s.interior) {
      expect(c.x, 'a player-marker cell landed ON/LEFT-OF the left bezel rail').toBeGreaterThan(s.left)
      expect(c.x, 'a player-marker cell landed ON/RIGHT-OF the right bezel rail').toBeLessThan(s.right)
    }
  })

  it('the marker ROW tracks the ship Y (row = Y>>3, AMODE1.SRC:1247-1249)', () => {
    // The ROM derives the marker's row from the player position >> 3 (LSRB×3). Two states identical
    // but for ship.y must move the marker vertically by exactly (y2>>3 − y1>>3) rows. Uses a RELATIVE
    // delta so it pins the Y>>3 shift without hardcoding the strip's top origin. RED now — both
    // frames have no marker, so topRow is +Infinity and the delta assertion fails.
    const y1 = 64
    const y2 = 160
    const base = unpopulatedPlayState(11)
    const f1 = composeFrame({ ...base, ship: { ...base.ship, y: y1 } }, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const f2 = composeFrame({ ...base, ship: { ...base.ship, y: y2 } }, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const c1 = scanStripWhite(f1).interior
    const c2 = scanStripWhite(f2).interior
    expect(c1.length, 'no player marker at ship.y=64').toBeGreaterThan(0)
    expect(c2.length, 'no player marker at ship.y=160').toBeGreaterThan(0)
    expect(
      topRow(c2) - topRow(c1),
      'the player marker row does not track the ship Y as Y>>3 (SCANNER_Y_SHIFT)',
    ).toBe((y2 >> SCANNER_Y_SHIFT) - (y1 >> SCANNER_Y_SHIFT))
  })

  it('the marker COLUMN is camera-INVARIANT — the PLAYER path uses PLAXC, not the camera (AMODE1.SRC:1242)', () => {
    // The ROM's player path (LDD PLAXC, :1242) never subtracts XTEMP/the camera, unlike an attacker
    // blip (SUBD XTEMP, :1261). So as the world scrolls under the fixed ship, the marker holds its
    // column — it does NOT drift like an attacker. Two states identical but for `camera` must yield
    // the SAME marker columns. RED now (both empty). This is the property that proves GREEN drew the
    // PLAYER marker (PLAXC / screen position), not a second attacker blip.
    const a = unpopulatedPlayState(13)
    const b: SimState = { ...a, camera: wrap16(a.camera + WORLD / 2) }
    const ca = scanStripWhite(composeFrame(a, LOGICAL_WIDTH, LOGICAL_HEIGHT)).interior
    const cb = scanStripWhite(composeFrame(b, LOGICAL_WIDTH, LOGICAL_HEIGHT)).interior
    expect(ca.length, 'no player marker (camera A)').toBeGreaterThan(0)
    expect(cb.length, 'no player marker (camera B)').toBeGreaterThan(0)
    expect(
      columnsOf(cb),
      'the player marker DRIFTED with the camera — it must be derived from PLAXC (screen), not the camera-relative world→radar projection',
    ).toEqual(columnsOf(ca))
  })
})

// ─── AC4 — ADR-0005: a small, deterministic overlay, never on the end screen ──────────
describe('df7-8 AC4 — the player marker is a small deterministic overlay (ADR-0005)', () => {
  it('the marker is a SMALL overlay, never a large-area flood', () => {
    // Decision B / ADR-0005: no large-area luminance event. The ROM writes $9099 + STA 2,X +
    // STA -$FF,X — a handful of cells, a marker, not a bar. A flood of the strip would be an
    // ADR-0005 hazard for the photosensitive owner. `> 0` also keeps this RED until the marker
    // exists (a bound alone would pass vacuously on the empty strip).
    const fb = composeFrame(unpopulatedPlayState(17), LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const n = scanStripWhite(fb).interior.length
    expect(n, 'no player marker drawn').toBeGreaterThan(0)
    expect(n, 'the player marker floods the strip interior — an ADR-0005 large-area hazard, not a marker').toBeLessThanOrEqual(8)
  })

  it('the marker is deterministic — the same state renders identically (no flicker)', () => {
    // composeFrame is a pure function of state: same state in → same indices out. A marker that
    // read a clock or minted entropy (a strobe hazard) would break this — and would also fail the
    // src/core purity sweep (tests/purity.test.ts scans core/scene.ts).
    const s = unpopulatedPlayState(19)
    expect(digest(composeFrame(s, LOGICAL_WIDTH, LOGICAL_HEIGHT))).toBe(
      digest(composeFrame(s, LOGICAL_WIDTH, LOGICAL_HEIGHT)),
    )
  })

  it('no player marker leaks onto the GAME OVER screen', () => {
    // composeFrame returns the end screen BEFORE the scanner overlay when state.gameOver (df5-6).
    // The player marker must be drawn with the scanner strip (after that early-return), never
    // unconditionally — a marker on the GAME OVER screen would be a placement bug. The GAME OVER
    // text/score sit well below the strip band, so a clean end screen has no index-9 interior cell.
    const over: SimState = { ...createSim(makeRand(23)), landers: [], gameOver: true }
    expect(
      scanStripWhite(composeFrame(over, LOGICAL_WIDTH, LOGICAL_HEIGHT)).interior.length,
      'a player marker leaked onto the GAME OVER screen — drawn before the gameOver early-return?',
    ).toBe(0)
  })
})
