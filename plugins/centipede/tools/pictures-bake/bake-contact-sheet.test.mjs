// tools/pictures-bake/bake-contact-sheet.test.mjs
//
// Story cp1-3 — RED phase (O'Brien / TEA). AC-3: a contact sheet, BAKED (not
// hand-drawn) from the picture-ROM decode and COMMITTED for human review, with
// every listed entity present + identified. This lives WITH the tool, as `.mjs`,
// on purpose — the bake is build-time Node tooling (node:fs), kept out of the
// browser-pure TS suite (the check-citations tool + tempest's pokey-bake do the
// same). Vitest's default `**/*.test.mjs` discovery still picks it up.
//
// The tool does not exist yet, so it is pulled in through a DYNAMIC loader (the
// citations suite's loadChecker idiom): a missing module reddens every test with a
// self-describing "bake tool not built yet", never a cryptic collect-time crash.
// GREEN must guard the CLI behind an isMain check so importing the module is inert.
//
// Exports GREEN must deliver (see the RED tests for the exact contract):
//   • decodeStampPlanar(lower, upper, offset, rows) -> number[][]  (the 2bpp decode)
//   • bakeContactSheet({ lower, upper, stamps }) -> string          (pure SVG render)
//   • bakeContactSheetFromRom(romDir) -> string                     (reads .201/.202)
// and it must write docs/rom-study/pictures-contact-sheet.svg when run as a CLI.

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

async function loadBake() {
  try {
    return await import('./bake-contact-sheet.mjs')
  } catch (e) {
    throw new Error(
      'bake tool not built yet — GREEN (Julia) creates ' +
        'centipede/tools/pictures-bake/bake-contact-sheet.mjs exporting bakeContactSheet, ' +
        'decodeStampPlanar, and bakeContactSheetFromRom (isMain-guarded CLI writes the SVG). ' +
        `(${e.message})`,
    )
  }
}

// tools/pictures-bake/ -> the plugin root is two levels up.
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const sheetPath = join(repoRoot, 'docs', 'rom-study', 'pictures-contact-sheet.svg')

// reference/ sits at the MONOREPO root — two levels above plugins/centipede.
// MIGRATION: a stale `..` here silently flips vendoredAvailable to false.
const vendoredRoot =
  process.env.CENTIPEDE_SOURCE_DIR ??
  join(repoRoot, '..', '..', 'reference', 'atari-source', 'centipede')
const romDir = join(vendoredRoot, 'revision.v2')
const vendoredAvailable = existsSync(join(romDir, '136001.201')) && existsSync(join(romDir, '136001.202'))

// Every entity AC-3 requires, by the name that must appear on the sheet.
const REQUIRED_LABELS = [
  ...Array.from({ length: 16 }, (_, i) => `HEAD${i.toString(16).toUpperCase()}`), // centipede head/body
  ...Array.from({ length: 8 }, (_, i) => `BUG${i}`), // spider
  ...Array.from({ length: 4 }, (_, i) => `ANT${i}`), // flea
  ...Array.from({ length: 4 }, (_, i) => `SCORP${i}`), // scorpion
  'GUN', // player gun
  'SHOT', // shot
]

describe('bake tool — the module exports the bake contract (cp1-3 AC-3)', () => {
  it('exports bakeContactSheet, decodeStampPlanar, and bakeContactSheetFromRom', async () => {
    const bake = await loadBake()
    expect(
      typeof bake.bakeContactSheet,
      'GREEN creates tools/pictures-bake/bake-contact-sheet.mjs exporting bakeContactSheet({lower,upper,stamps})',
    ).toBe('function')
    expect(typeof bake.decodeStampPlanar, 'and decodeStampPlanar(lower,upper,offset,rows)').toBe('function')
    expect(typeof bake.bakeContactSheetFromRom, 'and bakeContactSheetFromRom(romDir)').toBe('function')
  })
})

describe('bake tool — decodeStampPlanar obeys the ruled 2bpp convention', () => {
  it('colour = (upperBit << 1) | lowerBit, pixel x=0 is the MSB, one byte per row', async () => {
    const bake = await loadBake()
    if (typeof bake.decodeStampPlanar !== 'function') {
      throw new Error('decodeStampPlanar missing — GREEN implements the shared 2bpp decode')
    }
    // A synthetic 2-row stamp exercising all four colours, independent of the ROM:
    //   row0: lower 0x80 (x0), upper 0x40 (x1)      -> [1,2,0,0,0,0,0,0]
    //   row1: lower 0xC0 (x0,x1), upper 0x80 (x0)   -> [3,1,0,0,0,0,0,0]
    const lower = [0x80, 0xc0]
    const upper = [0x40, 0x80]
    const grid = bake.decodeStampPlanar(lower, upper, 0, 2)
    expect(grid).toEqual([
      [1, 2, 0, 0, 0, 0, 0, 0],
      [3, 1, 0, 0, 0, 0, 0, 0],
    ])
  })
})

describe('bake tool — bakeContactSheet is a pure, deterministic, labelled renderer', () => {
  const synthetic = {
    lower: [0x18, 0x3c, 0x7e, 0xff, 0xff, 0x7e, 0x3c, 0x18],
    upper: [0x00, 0x18, 0x3c, 0x7e, 0x7e, 0x3c, 0x18, 0x00],
    stamps: [{ name: 'DEMO_TILE', kind: 'tile', offset: 0 }],
  }

  it('same input -> byte-identical output (no clock, no randomness)', async () => {
    const bake = await loadBake()
    if (typeof bake.bakeContactSheet !== 'function') {
      throw new Error('bakeContactSheet missing — GREEN implements the pure SVG renderer')
    }
    const a = bake.bakeContactSheet(synthetic)
    const b = bake.bakeContactSheet(synthetic)
    expect(a).toBe(b)
    expect(typeof a).toBe('string')
  })

  it('labels every stamp it renders', async () => {
    const bake = await loadBake()
    if (typeof bake.bakeContactSheet !== 'function') {
      throw new Error('bakeContactSheet missing')
    }
    expect(bake.bakeContactSheet(synthetic)).toContain('DEMO_TILE')
  })
})

describe('bake tool — the committed contact sheet exists + identifies every entity (AC-3)', () => {
  it('docs/rom-study/pictures-contact-sheet.svg is committed', () => {
    expect(existsSync(sheetPath), 'the baked contact sheet must be committed for human review').toBe(true)
  })

  it('every required entity is present + identified on the committed sheet', () => {
    expect(existsSync(sheetPath)).toBe(true)
    const svg = readFileSync(sheetPath, 'utf8')
    const missing = REQUIRED_LABELS.filter((l) => !svg.includes(l))
    expect(missing, 'these entities are absent from the committed contact sheet').toEqual([])
    // the entity CLASSES named in AC-3 must be legible on the sheet too
    for (const word of ['mushroom', 'spider', 'flea', 'scorpion', 'centipede']) {
      expect(svg.toLowerCase(), `the sheet must identify the ${word}`).toContain(word)
    }
  })

  it('the character + digit tiles are on the sheet (CHAR_A..Z, DIGIT_0..9)', () => {
    expect(existsSync(sheetPath)).toBe(true)
    const svg = readFileSync(sheetPath, 'utf8')
    const missingChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter((c) => !svg.includes(`CHAR_${c}`))
    const missingDigits = '0123456789'.split('').filter((d) => !svg.includes(`DIGIT_${d}`))
    expect(missingChars, 'character tiles missing from the sheet').toEqual([])
    expect(missingDigits, 'digit tiles missing from the sheet').toEqual([])
  })
})

describe.skipIf(!vendoredAvailable)('bake tool — the committed sheet is BAKED from the ROM (AC-3)', () => {
  it('re-baking from the vendored chips reproduces the committed sheet byte-for-byte', async () => {
    const bake = await loadBake()
    if (typeof bake.bakeContactSheetFromRom !== 'function') {
      throw new Error('bakeContactSheetFromRom missing — GREEN implements the ROM->sheet bake')
    }
    expect(existsSync(sheetPath), 'commit the baked sheet first').toBe(true)
    const rebaked = bake.bakeContactSheetFromRom(romDir)
    const committed = readFileSync(sheetPath, 'utf8')
    expect(
      rebaked,
      'the committed sheet must equal a fresh bake of the ROM — proof it is baked, not hand-drawn',
    ).toBe(committed)
  })
})
