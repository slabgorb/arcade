// tests/df5-1-scanner.test.ts
//
// Story df5-1 — RED phase (O'Brien / TEA). The scanner (radar) core: a PURE port of
// the ROM's SCNR world→radar projection, reading the df3 world.ts model. Decision A
// (RULED, design spec §3): the scanner ports SCNR's projection — it is NOT a re-derived
// "world width / radar width" minimap. A tidier minimap silently misplaces the wrap
// seam and the off-camera attackers the player relies on the radar to see.
//
// ─── THE ROM, INSTRUCTION BY INSTRUCTION (all lines from tool output) ─────────────
// SCNR (reference/original-source/defender/AMODE1.SRC:1180, banner *SCANNER :1178).
// Scanner-left, XTEMP (:1197-1199):
//     MT1  LDD  BGL              ; the camera
//          SUBD #$8000-(150*32)  ; XTEMP = BGL − ($8000−150*32) = BGL − $6D40
//          STD  XTEMP
// The blip loop, once per live object, SCNR10 (:1260-1271):
//     SCNR10 LDD  OX16,X   ; D = object's ABSOLUTE 16-bit world X (OX16)
//            SUBD XTEMP    ; D = (OX16 − XTEMP), a 16-BIT subtract → wraps mod $10000
//     SCNR2  LSRA / LSRA   ; A (hi byte) >> 2  → blip COLUMN = (D >> 8) >> 2 = D >> 10 ∈ 0..63
//            LDB  OY16,X   ; B = object Y
//            LSRB×3        ; blip ROW = OY16 >> 3
//            ADDD #SCANER-1; combine into the scanner screen address (base = shell's)
//            LDD  OBJCOL,X ; the blip's colour — a PALETTE INDEX (never a hex literal)
// The 64-wide strip is pinned by CMPA #(SCANER!>8)+64 (:1223); the bezel is :1225.
//
// So the PURE projection this suite pins (screen base + column-major addressing are the
// shell's df7 concern — the core returns radar-space {x,y,colour}):
//     scannerLeft = wrap16(camera − 0x6D40)                        [XTEMP, :1198]
//     blip.x      = wrap16(worldX − scannerLeft) >> 10   ∈ [0,63]  [:1260-1263, :1223]
//     blip.y      = y >> 3                                          [:1264-1267]
//     blip.colour = the object's palette index, passed through      [OBJCOL, :1270]
// The `wrap16`/$10000 modulus is df3 world.ts's cylinder (already gated) — the scanner
// REUSES it (Decision A: one world model), it does not re-derive a second geometry.
//
// ─── RED/GREEN SPLIT ──────────────────────────────────────────────────────────────
// TEA (this file) authors the failing suite. src/core/scanner.ts is an EMPTY seam stub
// (`export {}`) so these imports resolve and every test fails on an ASSERTION, not a
// module-resolution collect crash. GREEN (Julia / Dev) ports SCNR into scanner.ts and
// writes the docs/rom-study/claims/*.json entries the AC3 block below demands. The
// src/core purity sweep (tests/purity.test.ts) auto-arms over scanner.ts the moment it
// lands — AC1's "no clock/canvas/fetch/Math.random" clause needs no test here.

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { wrap16 } from '../src/core/world.js'
import * as scannerNS from '../src/core/scanner.js'

// ─── The contract this RED pins. Dev implements it in scanner.ts (GREEN); the empty
// seam stub makes `scannerNS` a valid-but-empty namespace, so the cast compiles and the
// runtime calls below fail cleanly (undefined is not a function) until GREEN lands. ──
interface ScannerObject {
  /** OX16 — the object's ABSOLUTE 16-bit world X. */
  readonly worldX: number
  /** The object's world Y (YMIN..YMAX). */
  readonly y: number
  /** OBJCOL — a df2 palette INDEX (0..15), never a hex colour. */
  readonly colour: number
}
interface Blip {
  /** Radar column 0..63. */
  readonly x: number
  /** Radar row (y >> 3). */
  readonly y: number
  /** The object's palette index, passed straight through. */
  readonly colour: number
}
interface ScannerModule {
  projectScanner(objects: readonly ScannerObject[], camera: number): Blip[]
  readonly SCANNER_COLUMNS: number
  readonly WORLD_WRAP: number
  readonly SCANNER_LEFT_OFFSET: number
  readonly SCANNER_X_SHIFT: number
  readonly SCANNER_Y_SHIFT: number
}
const scanner = scannerNS as unknown as ScannerModule

// ─── ROM ground truth (hand-derived above, independent of any exported constant) ────
const OFFSET = 0x8000 - 150 * 32 // $6D40 = 27968 — XTEMP's scanner-left offset (:1198)
const obj = (worldX: number, y: number, colour = 2): ScannerObject => ({ worldX, y, colour })
/** The ROM projection expressed through df3 world.ts's `wrap16` — the AC4 reference. */
const romBlipX = (worldX: number, camera: number): number => wrap16(worldX - (camera - OFFSET)) >> 10
const romBlipY = (y: number): number => y >> 3

describe('df5-1 scanner — AC1: a PURE projection returning a blip list (position + palette index)', () => {
  it('returns exactly one blip per object, each carrying {x, y, colour}', () => {
    const blips = scanner.projectScanner([obj(0x0000, 80, 2), obj(0x2000, 120, 9)], 0)
    expect(blips).toHaveLength(2)
    for (const b of blips) {
      expect(typeof b.x, 'blip.x is a number').toBe('number')
      expect(typeof b.y, 'blip.y is a number').toBe('number')
      expect(typeof b.colour, 'blip.colour is a number').toBe('number')
    }
  })

  it('is a pure function of its inputs — the same snapshot projects identically twice', () => {
    const objects = [obj(0x1234, 96, 3), obj(0xabcd, 210, 5)]
    const a = scanner.projectScanner(objects, 0x4000)
    const b = scanner.projectScanner(objects, 0x4000)
    expect(a, 'no hidden shell state: identical input → identical output').toEqual(b)
  })

  it('projects a single object to its exact ROM radar coordinates (ground-truth literals)', () => {
    // camera=0 → scannerLeft = wrap16(0 − $6D40) = $92C0. worldX=0 → rel=$6D40 →
    // $6D40 >> 10 = 27. y=80 → 80 >> 3 = 10. Hand-verified, not formula-mirrored.
    const [b] = scanner.projectScanner([obj(0x0000, 80, 7)], 0)
    expect(b.x, 'worldX 0 at camera 0 → column 27').toBe(27)
    expect(b.y, 'y 80 → row 10').toBe(10)
    expect(b.colour, 'the palette index passes straight through (OBJCOL)').toBe(7)
  })

  it('every blip column lands on the 64-wide strip [0, 63], never off the end', () => {
    // A spread of world positions and cameras — no projection may escape the strip.
    const objects = [obj(0x0000, 60), obj(0x4000, 60), obj(0x8000, 60), obj(0xc000, 60), obj(0xffff, 60)]
    for (const camera of [0, 0x1000, 0x6d40, 0x8000, 0xffff]) {
      for (const b of scanner.projectScanner(objects, camera)) {
        expect(b.x, `column ${b.x} must be within [0,63] at camera ${camera}`).toBeGreaterThanOrEqual(0)
        expect(b.x).toBeLessThanOrEqual(63)
      }
    }
  })
})

describe('df5-1 scanner — AC2: the $10000 wrap seam, pinned by COORDINATES (not a boolean)', () => {
  it('an object just past the wrap plots on the correct SIDE of the strip, not off the end', () => {
    // camera = $6D40 → scannerLeft = 0, so blip.x = worldX >> 10 directly (clean seam).
    // Two objects straddling the seam: $0100 is just PAST it (column 0, left edge),
    // $FF00 is just BEFORE it (column 63, right edge). Both ON the strip — the minimap
    // failure would push one off the end.
    const camera = 0x6d40
    const [justPast] = scanner.projectScanner([obj(0x0100, 60)], camera)
    const [justBefore] = scanner.projectScanner([obj(0xff00, 60)], camera)
    expect(justPast.x, 'worldX $0100 (just past the seam) → left edge column 0').toBe(0)
    expect(justBefore.x, 'worldX $FF00 (just before the wrap) → right edge column 63').toBe(63)
  })

  it('the seam is continuous: worldX 0 and worldX $FFFF sit at opposite strip ends', () => {
    const camera = 0x6d40
    expect(scanner.projectScanner([obj(0x0000, 60)], camera)[0].x).toBe(0)
    expect(scanner.projectScanner([obj(0xffff, 60)], camera)[0].x).toBe(63)
  })

  it('an OFF-CAMERA object still appears on the scanner at its correct radar column', () => {
    // camera=$6D40 shows worldX ≈ [$6D40, $6E64] on screen. An attacker at $2000 is far
    // off-camera — the whole point of the radar is that it is still visible. $2000 >> 10
    // = 8. It must appear at column 8, not vanish and not clamp to an edge.
    const camera = 0x6d40
    const [b] = scanner.projectScanner([obj(0x2000, 100)], camera)
    expect(b.x, 'the off-camera attacker at $2000 shows at radar column 8').toBe(8)
    expect(b.x).toBeGreaterThanOrEqual(0)
    expect(b.x).toBeLessThanOrEqual(63)
  })

  it('the blip row is the ROM y>>3 compression (coordinate-pinned)', () => {
    const rows = scanner.projectScanner([obj(0x1000, 42), obj(0x1000, 80), obj(0x1000, 240)], 0)
    expect(rows[0].y, 'y 42 → row 5').toBe(5)
    expect(rows[1].y, 'y 80 → row 10').toBe(10)
    expect(rows[2].y, 'y 240 → row 30').toBe(30)
  })
})

describe('df5-1 scanner — AC4: the ROM SCNR projection (worldX / $10000 wrap), NOT a naive minimap', () => {
  it('is MODULAR in $10000 — worldX and worldX+$10000 are the same point on the cylinder', () => {
    const camera = 0x3000
    const a = scanner.projectScanner([obj(0x1500, 90)], camera)[0]
    const wrapped = scanner.projectScanner([obj(0x1500 + 0x10000, 90)], camera)[0]
    expect(wrapped, 'the $10000 world cylinder (df3 world.ts): +$10000 is a no-op').toEqual(a)
  })

  it('its seam MOVES with the camera — a fixed-seam width-ratio minimap cannot', () => {
    // The naive minimap `floor(worldX / worldWidth * columns)` is camera-INDEPENDENT:
    // a fixed object gives a fixed column no matter where the camera is. The ROM
    // projection is camera-relative, so the SAME object projects to DIFFERENT columns
    // as the camera moves. If a future refactor swaps in the minimap, this reddens.
    const fixed = obj(0x4000, 90)
    const near = scanner.projectScanner([fixed], 0x0000)[0].x
    const far = scanner.projectScanner([fixed], 0x8000)[0].x
    expect(near, 'a camera-relative projection moves the blip when the camera moves').not.toBe(far)
  })

  it('does NOT equal the naive width-ratio minimap at a non-trivial camera', () => {
    const camera = 0x2000
    const objects = [obj(0x0000, 60), obj(0x4000, 60), obj(0xc000, 60)]
    const naiveMinimap = (o: ScannerObject) => Math.floor((wrap16(o.worldX) / 0x10000) * 64)
    const blips = scanner.projectScanner(objects, camera)
    const differs = blips.some((b, i) => b.x !== naiveMinimap(objects[i]))
    expect(differs, 'the scanner is SCNR, not floor(worldX / $10000 * 64) — Decision A').toBe(true)
  })

  it('matches the ROM projection expressed through df3 world.ts `wrap16`', () => {
    // Cross-check against the world-model formula (the reference at the top of the file)
    // over a spread of cases — this is what "reads the df3 world.ts model" means.
    const cases: Array<[number, number, number]> = [
      [0x0000, 80, 0x0000],
      [0x2000, 100, 0x6d40],
      [0xff00, 60, 0x6d40],
      [0x1234, 210, 0x4000],
      [0xabcd, 42, 0x9000],
    ]
    for (const [worldX, y, camera] of cases) {
      const [b] = scanner.projectScanner([obj(worldX, y)], camera)
      expect(b.x, `column for worldX ${worldX.toString(16)} @ camera ${camera.toString(16)}`).toBe(romBlipX(worldX, camera))
      expect(b.y, `row for y ${y}`).toBe(romBlipY(y))
    }
  })
})

describe('df5-1 scanner — AC3: palette-INDEX colour + every constant byte-cited', () => {
  it('a blip colour is the object palette INDEX, passed through — never a hex literal', () => {
    for (const idx of [0, 1, 2, 9, 15]) {
      const [b] = scanner.projectScanner([obj(0x1000, 80, idx)], 0)
      expect(b.colour, 'the blip carries the object palette index verbatim').toBe(idx)
      expect(Number.isInteger(b.colour), 'a palette index is an integer').toBe(true)
      expect(typeof b.colour, 'a palette index is a number, never a "#rrggbb" string').toBe('number')
      expect(b.colour, 'a palette index is in [0,15] (the 16 CRAM registers)').toBeGreaterThanOrEqual(0)
      expect(b.colour).toBeLessThanOrEqual(15)
    }
  })

  it('the scanner does not invent colour — two objects keep their distinct indices', () => {
    const blips = scanner.projectScanner([obj(0x1000, 80, 2), obj(0x2000, 80, 9)], 0)
    expect(blips.map((b) => b.colour), 'colours pass through 1:1, uncombined').toEqual([2, 9])
  })

  it('exposes the ROM-derived constants at their exact values', () => {
    expect(scanner.SCANNER_COLUMNS, '64-wide strip (CMPA #(SCANER!>8)+64, :1223)').toBe(64)
    expect(scanner.SCANNER_LEFT_OFFSET, 'XTEMP offset $8000−150*32 = $6D40 (:1198)').toBe(0x8000 - 150 * 32)
    expect(scanner.SCANNER_X_SHIFT, 'column = D >> 10 (LSRA×2 on the hi byte, :1262-1263)').toBe(10)
    expect(scanner.SCANNER_Y_SHIFT, 'row = y >> 3 (LSRB×3, :1265-1267)').toBe(3)
    expect(scanner.WORLD_WRAP, 'the $10000 cylinder — df3 world.ts wrap16, reused not re-derived').toBe(0x10000)
  })

  it('the scanner-projection constants each have a byte-verified claims/*.json entry (df1-1 gate)', async () => {
    // AC3: "no un-cited src/core constant." The scanner INTRODUCES two projection
    // constants (df3 world.ts already gates the $10000 wrap): the scanner-left offset
    // and the 64-column strip width. Each must be cited to the ROM and byte-verify
    // against the vendored tree — the same gate every df* constant re-opens under.
    const here = dirname(fileURLToPath(import.meta.url))
    const pluginRoot = join(here, '..')
    const claimsDir = join(pluginRoot, 'docs', 'rom-study', 'claims')
    const vendoredRoot =
      process.env.DEFENDER_SOURCE_DIR ??
      join(pluginRoot, '..', '..', 'reference', 'original-source', 'defender')

    interface Claim {
      id: string
      claim: string
      source: { file: string; line: number; verbatim: string }
    }
    const claims: Claim[] = existsSync(claimsDir)
      ? readdirSync(claimsDir)
          .filter((f) => f.endsWith('.json'))
          .flatMap((f) => JSON.parse(readFileSync(join(claimsDir, f), 'utf8')) as Claim[])
      : []

    // Force the two scanner constants to be cited: match on the ROM token (robust to
    // line-number drift), then require the whole claim set to byte-verify.
    const cites = (token: string) =>
      claims.some((c) => c.source?.file === 'AMODE1.SRC' && (c.source?.verbatim ?? '').includes(token))
    expect(
      cites('$8000-(150*32)'),
      'need a claims/*.json entry citing the scanner-left offset $8000-(150*32) (AMODE1.SRC:1198)',
    ).toBe(true)
    expect(
      cites('+64'),
      'need a claims/*.json entry citing the 64-wide strip CMPA #(SCANER!>8)+64 (AMODE1.SRC:1223)',
    ).toBe(true)

    const { checkClaims } = (await import('../tools/audit/check-citations.mjs')) as {
      checkClaims: (claims: Claim[], opts: { vendoredRoot: string | null }) => string[]
    }
    const errors = checkClaims(claims, { vendoredRoot: existsSync(vendoredRoot) ? vendoredRoot : null })
    expect(errors, `the scanner citations must byte-verify against the vendored ROM:\n${errors.join('\n')}`).toEqual([])
  })
})
