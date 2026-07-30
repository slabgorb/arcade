// tools/pictures-bake/bake-contact-sheet.mjs
//
// Story cp1-3 (GREEN, Julia) — bakes a contact sheet (SVG) from the picture-ROM
// decode for human review (AC-3): every stamp named in src/core/pictures.ts's
// STAMPS table, rendered from its actual decoded pixels — never hand-drawn. This
// is build-time Node tooling (node:fs), kept out of the browser-pure core TS
// suite, mirroring tools/audit/check-citations.mjs's isMain-guarded CLI shape.
//
// decodeStampPlanar is intentionally independent of src/core/pictures.ts's
// decodeStamp: it takes plane arrays + offset + row count directly (rather than
// reading the module-level PLANE_LOWER/PLANE_UPPER), so the bake tool can render
// ROM-fresh bytes (bakeContactSheetFromRom) or the synthetic fixtures its own
// tests use, without needing a Stamp's module-bound geometry lookup.
//
// bakeContactSheet is pure and deterministic (no Date, no Math.random, no I/O) —
// same input always produces byte-identical SVG, which is what lets the
// "re-baked === committed" test in bake-contact-sheet.test.mjs prove the
// committed artifact is baked, not hand-drawn.

import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SPRITE_H, TILE_H, STAMPS } from '../../src/core/pictures.ts'

/**
 * Decode one stamp's planes into a `rows` x 8 grid of 2-bit colour indices:
 * colour = (upperBit << 1) | lowerBit, pixel x=0 is the MSB (0x80), row r is
 * `lower[offset+r]` / `upper[offset+r]`. The ruled 2bpp convention (cp1-3),
 * parameterised over caller-supplied plane arrays rather than the module's own.
 */
export function decodeStampPlanar(lower, upper, offset, rows) {
  const grid = []
  for (let r = 0; r < rows; r++) {
    const L = lower[offset + r] ?? 0
    const U = upper[offset + r] ?? 0
    const row = []
    for (let x = 0; x < 8; x++) {
      const mask = 0x80 >> x
      const lowerBit = L & mask ? 1 : 0
      const upperBit = U & mask ? 1 : 0
      row.push((upperBit << 1) | lowerBit)
    }
    grid.push(row)
  }
  return grid
}

// A stamp's name maps to its entity class by CENPIC naming convention — used to
// label each cell with the plain-English entity AC-3 requires on the sheet
// (mushroom/spider/flea/scorpion/centipede), independent of hand-authored prose.
function entityFor(name) {
  if (name.startsWith('HEAD')) return 'centipede head/body'
  if (name.startsWith('BUG')) return 'spider'
  if (name.startsWith('ANT')) return 'flea'
  if (name.startsWith('SCORP')) return 'scorpion'
  if (name.includes('POISON_MUSHROOM')) return 'poison mushroom'
  if (name.includes('MUSHROOM')) return 'mushroom'
  if (name === 'GUN') return 'player gun'
  if (name === 'SHOT') return 'shot'
  if (name.startsWith('CHAR_')) return 'character tile'
  if (name.startsWith('DIGIT_')) return 'digit tile'
  return ''
}

const SCALE = 6 // pixels per ROM pixel
const COLS = 10
const CELL_W = 8 * SCALE + 24
const CELL_H = SPRITE_H * SCALE + 40 // tallest stamp (sprite) + label + entity rows
const PALETTE = ['#111', '#3af', '#f93', '#3f6'] // colour index 0..3 (0 = near-black bg)

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Render a labelled SVG contact sheet from a set of stamps decoded against the
 * given planes. Pure + deterministic: identical input yields identical output.
 * `stamps` is `{ name, kind, offset }[]` (the pictures.ts STAMPS shape).
 */
export function bakeContactSheet({ lower, upper, stamps }) {
  const cells = stamps.map((stamp, i) => {
    const rows = stamp.kind === 'sprite' ? SPRITE_H : TILE_H
    const grid = decodeStampPlanar(lower, upper, stamp.offset, rows)
    const col = i % COLS
    const row = Math.floor(i / COLS)
    const ox = col * CELL_W
    const oy = row * CELL_H
    const pixels = grid
      .flatMap((rowPixels, py) =>
        rowPixels.map((colour, px) =>
          colour === 0
            ? ''
            : `<rect x="${ox + 12 + px * SCALE}" y="${oy + 20 + py * SCALE}" width="${SCALE}" height="${SCALE}" fill="${PALETTE[colour]}"/>`,
        ),
      )
      .filter(Boolean)
      .join('')
    const entity = entityFor(stamp.name)
    return (
      `<g>` +
      `<rect x="${ox + 4}" y="${oy + 4}" width="${CELL_W - 8}" height="${CELL_H - 8}" fill="none" stroke="#444"/>` +
      `<text x="${ox + 12}" y="${oy + 14}" font-family="monospace" font-size="10" fill="#eee">${esc(stamp.name)}</text>` +
      pixels +
      `<text x="${ox + 12}" y="${oy + CELL_H - 6}" font-family="monospace" font-size="8" fill="#999">${esc(entity)}</text>` +
      `</g>`
    )
  })
  const cols = Math.min(COLS, stamps.length || 1)
  const rows = Math.max(1, Math.ceil(stamps.length / COLS))
  const width = cols * CELL_W
  const height = rows * CELL_H
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<title>Centipede picture-ROM contact sheet (cp1-3)</title>` +
    `<rect x="0" y="0" width="${width}" height="${height}" fill="#000"/>` +
    cells.join('') +
    `</svg>`
  )
}

/**
 * Read the two picture-ROM chips from `romDir` (136001.201/202, binary, no
 * encoding) and bake the full contact sheet using pictures.ts's STAMPS naming
 * table — the ROM-to-SVG path that proves the committed sheet is baked, not
 * hand-drawn (bake-contact-sheet.test.mjs's re-bake-equals-committed test).
 */
export function bakeContactSheetFromRom(romDir) {
  const lower = Array.from(readFileSync(join(romDir, '136001.201')))
  const upper = Array.from(readFileSync(join(romDir, '136001.202')))
  return bakeContactSheet({ lower, upper, stamps: STAMPS })
}

// ─── CLI entry ────────────────────────────────────────────────────────────
// `node tools/pictures-bake/bake-contact-sheet.mjs` — bakes the committed sheet
// at docs/rom-study/pictures-contact-sheet.svg from the vendored ROM chips.
if (import.meta.url === `file://${process.argv[1]}`) {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
  // reference/ sits at the MONOREPO root — two levels above plugins/centipede.
  const vendoredRoot =
    process.env.CENTIPEDE_SOURCE_DIR ??
    join(repoRoot, '..', '..', 'reference', 'atari-source', 'centipede')
  const romDir = join(vendoredRoot, 'revision.v2')
  const outPath = join(repoRoot, 'docs', 'rom-study', 'pictures-contact-sheet.svg')

  const svg = bakeContactSheetFromRom(romDir)
  writeFileSync(outPath, svg)
  console.log(`baked ${outPath} (${svg.length} bytes, ${STAMPS.length} stamps)`)
}
