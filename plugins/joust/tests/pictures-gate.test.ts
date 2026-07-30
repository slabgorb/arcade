// tests/pictures-gate.test.ts
//
// Story jt1-3 — RED phase (O'Brien / TEA). THE BYTE GATE (AC-1, AC-4).
//
// No ROM binaries are vendored for Joust, so there is nothing to diff a build
// against. The only available ground truth is the 1982 assembler TEXT — which
// means the gate has to be a second, independent reading of that text.
//
// ─── DOUBLE ENTRY, AND THE TAUTOLOGY IT AVOIDS ───────────────────────────────
// The failure mode this suite is built to refuse: Dev writes a transcription
// tool, the test re-runs that tool, the two agree, everything is green, and the
// gate has proven nothing except that the tool is deterministic. Any misreading
// — a radix confusion, a dropped FDB block, a phantom label — survives intact
// and is then confirmed by its own author. That is the rb4/cp1 lesson exactly.
//
// So: TEA's reader (tests/helpers/joust-source.ts) is the second entry. Dev
// transcribes however they like. The gate is that the two derivations agree,
// and a test below enforces that they STAY independent — nothing under src/ or
// tools/ may import the reader, because the moment it does, the two entries
// collapse into one and the green stops meaning anything.
//
// ─── THREE-WAY PROVENANCE ────────────────────────────────────────────────────
// For at least one entity the suite goes further, cross-checking a third,
// wholly separate artefact: the artist file (OSTRICH.SRC), the merged link
// target (JOUSTI.SRC), and the ASSEMBLED S-Records (OSTRICH.PIC) must all carry
// the same 160 bytes. Verified this session before it was asserted.
//
// ─── DEGRADATION (AC-1) ──────────────────────────────────────────────────────
// CI clones only the joust subrepo and has no vendored tree, so the source
// re-derivation skips there and the committed fixture takes over. The fixture
// is not trusted on its own: whenever the tree IS present the gate verifies the
// fixture against the SOURCE too, so it can never drift into agreeing with a
// wrong module.
//
// Every vendored read lives inside an it() body (the tp1-8 collection trap).

import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  vendoredRoot,
  vendoredAvailable,
  sourceLines,
  parseStatement,
  isLabelOnly,
  bytesInRange,
  evalOperand,
  evalNumber,
  decodeSRecords,
  sRecordContains,
  PHANTOM_LABELS,
  unreferencedBareLabels,
  SYMBOLS,
} from './helpers/joust-source.js'
import { loadPictures, type PicturesFixture } from './helpers/pictures-contract.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const fixturePath = join(repoRoot, 'docs', 'rom-study', 'pictures.fixture.json')

const sha = (bytes: readonly number[]): string =>
  createHash('sha256').update(Buffer.from(bytes)).digest('hex')

function loadFixture(): PicturesFixture {
  if (!existsSync(fixturePath)) {
    throw new Error(
      'committed fixture missing — GREEN bakes docs/rom-study/pictures.fixture.json ' +
        '(per-block geometry + sha256) so CI can verify the module without the vendored tree',
    )
  }
  return JSON.parse(readFileSync(fixturePath, 'utf8')) as PicturesFixture
}

// ─────────────────────────────────────────────────────────────────────────────
// THE READER'S OWN TEETH. A gate built on a reader nobody checked is just a
// second guess. These run everywhere — they need no vendored tree.
// ─────────────────────────────────────────────────────────────────────────────
describe('independent reader — radix (the sigil decides, nothing is guessed)', () => {
  it('reads each radix by its sigil, and a bare number as DECIMAL', () => {
    expect(evalOperand('$0814')).toBe(0x0814)
    expect(evalOperand('@377')).toBe(255)
    expect(evalOperand('%00001110')).toBe(14)
    // The trap: no sigil means ten, not sixteen. `10+COFF` is 522, not 528.
    expect(evalOperand('10')).toBe(10)
    expect(evalOperand('10')).not.toBe(0x10)
  })

  it('evaluates + and !X exactly as the assembler does', () => {
    expect(evalOperand('7+COFF')).toBe(7 + 0x0200)
    expect(evalOperand('35+32+COFF')).toBe(35 + 32 + 0x0200)
    // DMAFIX pre-XORs the human-readable w/h; XOR is its own inverse.
    expect(evalOperand('$0814!XDMAFIX')).toBe(0x0814 ^ 0x0404)
    expect((evalOperand('$0814!XDMAFIX') as number) ^ SYMBOLS.DMAFIX).toBe(0x0814)
  })

  it('returns a symbol for an unresolved label reference rather than a wrong number', () => {
    // Label addresses need a full assembler pass we deliberately do not do.
    // Silently coercing them to 0 would fabricate data.
    expect(evalOperand('CSRC5')).toEqual({ symbol: 'CSRC5' })
    expect(() => evalNumber('CSRC5')).toThrow()
  })

  it('stops the operand field at the first whitespace (the COLOR1 two-column trap)', () => {
    // COLOR1 writes two operand columns; only the first is assembled, the
    // second is a dead alternate. They DIFFER on several rows, so a reader that
    // split on whitespace would produce a plausible but wrong palette.
    const st = parseStatement('COLOR1\tFCB\t@160\t@071\tCOLOR 2 - ', 908)
    expect(st).not.toBeNull()
    expect(st!.operands).toEqual(['@160'])
    expect(evalOperand(st!.operands[0])).toBe(0o160)
  })

  it('parses both FCB (bytes) and FDB (words), tab- or space-indented', () => {
    expect(parseStatement('\tFCB\t$00,$08,$F8', 1)?.op).toBe('FCB')
    // Several cliff sources are space-indented FDB rows; a reader that assumed
    // tabs, or assumed FCB, would drop them silently.
    expect(parseStatement(' FDB $AAAA,$AAAA', 1)?.op).toBe('FDB')
    expect(parseStatement(' FDB $AAAA,$AAAA', 1)?.operands).toEqual(['$AAAA', '$AAAA'])
  })

  it('ignores comment and blank lines', () => {
    expect(parseStatement('* PTERA1', 1)).toBeNull()
    expect(parseStatement('', 1)).toBeNull()
    expect(parseStatement('ORUN1R', 1)).toBeNull() // label-only, not a statement
    expect(isLabelOnly('ORUN1R')).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// THE PHANTOM-LABEL TRAP. Verified in the real source, not hypothesised.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('the source contains comment-wraps that look like labels', () => {
  it('JOUSTI.SRC:66 and :90 are wrapped comment text sitting in the label column', () => {
    const lines = sourceLines('JOUSTI.SRC')
    // :65 ends "…(INCLUDING " and :66 is the rest of that sentence.
    expect(lines[64]).toContain('INCLUDING')
    expect(lines[65].trim()).toBe('ZERO)')
    expect(isLabelOnly(lines[65]), 'it is indistinguishable from a label by shape').toBe(true)
    expect(lines[88]).toContain('OFF S')
    expect(lines[89].trim()).toBe('CREEN')
  })

  it('a phantom SPLITS the collision table it interrupts (this is a data bug, not cosmetic)', () => {
    // CCLF1L's mask runs :65-:73 — seven span rows plus the $8100 terminator.
    // A reader that honours `ZERO)` at :66 as a label truncates CCLF1L to ONE
    // row and hands the other seven to an invented symbol: a wrong collision
    // mask that is still perfectly well-formed, so nothing downstream notices.
    const words: number[] = []
    const lines = sourceLines('JOUSTI.SRC')
    for (let n = 65; n <= 73; n++) {
      const st = parseStatement(lines[n - 1], n)
      if (st?.op === 'FDB') words.push(...st.operands.map((t) => evalNumber(t)))
    }
    expect(words.length, 'CCLF1L is 8 rows of (left,right) pairs').toBe(16)
    expect(words.slice(-2), 'the last row is the $8100 end-of-table sentinel').toEqual([
      0x8100, 0x8100,
    ])
    expect(isLabelOnly(lines[65]), 'and row 2 sits behind the phantom').toBe(true)
  })

  it('the phantom set is exactly the two known cases (a transcription cannot grow it)', () => {
    // Identified semantically, not by shape: `CREEN` is a well-formed uppercase
    // identifier and no shape heuristic can tell it from a real label. What
    // separates them is that nothing in the file ever references it.
    const found = unreferencedBareLabels('JOUSTI.SRC')
    expect(
      found.map((f) => f.token).sort(),
      'a new comment-wrap appeared, or the reader changed — both need a human',
    ).toEqual([...PHANTOM_LABELS].sort())
    expect(found.map((f) => f.line).sort((a, b) => a - b)).toEqual([66, 90])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-4 — EVERY BYTE IS ANCHORED, AND EVERY ANCHOR RE-DERIVES IT.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-4 — no hand-authored pixels: every byte carries provenance', () => {
  it('every pixel block declares a source anchor', async () => {
    const pics = await loadPictures()
    const unanchored = pics.PIXEL_BLOCKS.filter(
      (b) => !b.anchor || !b.anchor.file || !(b.anchor.startLine > 0) || !(b.anchor.endLine >= b.anchor.startLine),
    ).map((b) => b.name)
    expect(unanchored, 'a block without a valid anchor is unprovable by construction').toEqual([])
  })

  it('every block\'s byte count equals width×height (no padding, no truncation)', async () => {
    const pics = await loadPictures()
    const wrong = pics.PIXEL_BLOCKS.filter((b) => b.bytes.length !== b.width * b.height).map(
      (b) => `${b.name}: ${b.bytes.length} bytes for ${b.width}×${b.height}`,
    )
    expect(wrong).toEqual([])
  })

  it('every byte is a byte (0-255, integer) — no sentinels, no NaN, no negatives', async () => {
    const pics = await loadPictures()
    const bad = pics.PIXEL_BLOCKS.filter((b) =>
      b.bytes.some((v) => !Number.isInteger(v) || v < 0 || v > 255),
    ).map((b) => b.name)
    expect(bad).toEqual([])
  })

  it.skipIf(!vendoredAvailable)(
    'every block re-derives byte-for-byte from its own cited lines (THE GATE)',
    async () => {
      const pics = await loadPictures()
      const mismatches: string[] = []
      for (const b of pics.PIXEL_BLOCKS) {
        let derived: number[]
        try {
          derived = bytesInRange(b.anchor.file, b.anchor.startLine, b.anchor.endLine)
        } catch (e) {
          mismatches.push(`${b.name}: anchor unreadable — ${(e as Error).message}`)
          continue
        }
        if (derived.length !== b.bytes.length) {
          mismatches.push(
            `${b.name}: ${b.anchor.file}:${b.anchor.startLine}-${b.anchor.endLine} yields ` +
              `${derived.length} bytes, module has ${b.bytes.length}`,
          )
          continue
        }
        const i = derived.findIndex((v, k) => v !== b.bytes[k])
        if (i >= 0) {
          mismatches.push(
            `${b.name}: byte ${i} differs — source $${derived[i].toString(16)} vs module $${b.bytes[i].toString(16)}`,
          )
        }
      }
      expect(mismatches, `${mismatches.length} block(s) do not match the vendored source`).toEqual([])
    },
  )

  it.skipIf(!vendoredAvailable)(
    'the w/h header agrees with the pixel geometry it describes (independent cross-check)',
    async () => {
      // The record header and the pixel rows are two SEPARATE statements in the
      // source. They must agree, and all 80 headered blocks do — verified this
      // session. A transcription error in either one breaks the agreement, so
      // this catches mistakes the anchor re-derivation alone would not.
      const pics = await loadPictures()
      const wrong: string[] = []
      for (const b of pics.PIXEL_BLOCKS) {
        if (!b.headerAnchor) continue
        const lines = sourceLines(b.headerAnchor.file)
        const st = parseStatement(lines[b.headerAnchor.startLine - 1], b.headerAnchor.startLine)
        if (!st || st.operands.length !== 1) {
          wrong.push(`${b.name}: header line is not a single-operand w/h`)
          continue
        }
        // The stored word is pre-XORed; XOR it back to the human-readable w/h.
        const stored = evalNumber(st.operands[0])
        const wh = stored ^ SYMBOLS.DMAFIX
        const w = (wh >> 8) & 0xff
        const h = wh & 0xff
        if (w !== b.width || h !== b.height) {
          wrong.push(`${b.name}: header says ${w}×${h}, block is ${b.width}×${b.height}`)
        }
      }
      expect(wrong).toEqual([])
    },
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — THREE-WAY PROVENANCE for at least one entity.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('AC-1 — artist file, link target and assembled S-Records agree', () => {
  // ORUN1R: OSTRICH.SRC:12-31 == JOUSTI.SRC:1369-1388, and those 160 bytes
  // appear verbatim inside the assembled OSTRICH.PIC. Verified before asserting.
  const ORUN1R_JOUSTI = { file: 'JOUSTI.SRC', startLine: 1369, endLine: 1388 }
  const ORUN1R_ARTIST = { file: 'OSTRICH.SRC', startLine: 12, endLine: 31 }

  it('the artist file and the merged link target carry identical bytes', () => {
    const merged = bytesInRange(ORUN1R_JOUSTI.file, ORUN1R_JOUSTI.startLine, ORUN1R_JOUSTI.endLine)
    const artist = bytesInRange(ORUN1R_ARTIST.file, ORUN1R_ARTIST.startLine, ORUN1R_ARTIST.endLine)
    expect(merged.length, 'ORUN1R is 8 bytes × 20 rows').toBe(160)
    expect(artist).toEqual(merged)
  })

  it('the assembled S-Records contain the same byte run (independent third artefact)', () => {
    const merged = bytesInRange(ORUN1R_JOUSTI.file, ORUN1R_JOUSTI.startLine, ORUN1R_JOUSTI.endLine)
    const pic = decodeSRecords(readFileSync(join(vendoredRoot, 'OSTRICH.PIC'), 'utf8'))
    expect(pic.size, 'OSTRICH.PIC must decode to a non-trivial image').toBeGreaterThan(1000)
    expect(
      sRecordContains(pic, merged),
      'ORUN1R\'s bytes must appear verbatim in the assembled artist artefact',
    ).toBe(true)
  })

  it('a corrupted byte run is NOT found in the S-Records (the check has teeth)', () => {
    const merged = bytesInRange(ORUN1R_JOUSTI.file, ORUN1R_JOUSTI.startLine, ORUN1R_JOUSTI.endLine)
    const pic = decodeSRecords(readFileSync(join(vendoredRoot, 'OSTRICH.PIC'), 'utf8'))
    const corrupted = [...merged]
    corrupted[40] = corrupted[40] ^ 0xff
    expect(sRecordContains(pic, corrupted)).toBe(false)
  })

  it('the module\'s ORUN1R matches all three', async () => {
    const pics = await loadPictures()
    const block = pics.PIXEL_BLOCKS.find((b) => b.name === 'ORUN1R')
    expect(block, 'the module must carry an ORUN1R block').toBeDefined()
    const merged = bytesInRange(ORUN1R_JOUSTI.file, ORUN1R_JOUSTI.startLine, ORUN1R_JOUSTI.endLine)
    expect(block!.bytes).toEqual(merged)
    expect([block!.width, block!.height]).toEqual([8, 20])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — DEGRADATION. The committed fixture carries CI; the source keeps the
// fixture honest.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 — committed fixture (the CI path)', () => {
  it('the fixture exists and covers every block', async () => {
    const pics = await loadPictures()
    const fx = loadFixture()
    expect(fx.blockCount, 'the fixture must pin the block COUNT, so a dropped block fails').toBe(
      pics.PIXEL_BLOCKS.length,
    )
    const missing = pics.PIXEL_BLOCKS.filter((b) => !fx.blocks[b.name]).map((b) => b.name)
    expect(missing).toEqual([])
  })

  it('every block matches its committed digest and geometry', async () => {
    const pics = await loadPictures()
    const fx = loadFixture()
    const wrong: string[] = []
    for (const b of pics.PIXEL_BLOCKS) {
      const rec = fx.blocks[b.name]
      if (!rec) continue
      if (rec.width !== b.width || rec.height !== b.height) {
        wrong.push(`${b.name}: fixture ${rec.width}×${rec.height} vs module ${b.width}×${b.height}`)
      } else if (rec.sha256 !== sha(b.bytes)) {
        wrong.push(`${b.name}: digest mismatch`)
      }
    }
    expect(wrong).toEqual([])
  })

  it.skipIf(!vendoredAvailable)(
    'the fixture itself re-derives from the source (it can never drift into agreeing with a wrong module)',
    async () => {
      // Without this, a fixture baked from a bad module would make CI green
      // forever. Whenever the tree is present, the fixture is checked against
      // the SOURCE, not against the module that produced it.
      const pics = await loadPictures()
      const fx = loadFixture()
      const wrong: string[] = []
      for (const b of pics.PIXEL_BLOCKS) {
        const rec = fx.blocks[b.name]
        if (!rec) continue
        const derived = bytesInRange(b.anchor.file, b.anchor.startLine, b.anchor.endLine)
        if (rec.sha256 !== sha(derived)) wrong.push(`${b.name}: fixture digest ≠ source digest`)
      }
      expect(wrong).toEqual([])
    },
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// THE INDEPENDENCE RULE. Without this, the whole gate is theatre.
// ─────────────────────────────────────────────────────────────────────────────
describe('the two derivations stay independent', () => {
  function sourceFilesUnder(dir: string): string[] {
    if (!existsSync(dir)) return []
    const out: string[] = []
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry)
      if (statSync(p).isDirectory()) out.push(...sourceFilesUnder(p))
      else if (['.ts', '.mts', '.mjs', '.js'].includes(extname(p))) out.push(p)
    }
    return out
  }

  it('nothing under src/ or tools/ imports the test-side reader', () => {
    // If Dev's transcription consumes TEA's reader, the two entries collapse
    // into one and the gate proves only that the reader agrees with itself —
    // while still showing green. This is the single assertion that keeps the
    // whole suite honest, so it runs everywhere and never skips.
    const offenders: string[] = []
    for (const f of [
      ...sourceFilesUnder(join(repoRoot, 'src')),
      ...sourceFilesUnder(join(repoRoot, 'tools')),
    ]) {
      const text = readFileSync(f, 'utf8')
      if (/joust-source|pictures-contract|from\s+['"].*\/tests\//.test(text)) {
        offenders.push(f.replace(repoRoot + '/', ''))
      }
    }
    expect(
      offenders,
      'production code must not import the test-side reader — that would make the byte gate tautological',
    ).toEqual([])
  })

  it('src/core/pictures.ts is pure data + a pure decoder (the purity guard still applies)', async () => {
    // Belt and braces alongside tests/purity.test.ts: pictures.ts is the largest
    // module core will ever carry and the likeliest place for a stray import.
    const p = join(repoRoot, 'src', 'core', 'pictures.ts')
    if (!existsSync(p)) throw new Error('GREEN creates src/core/pictures.ts')
    const text = readFileSync(p, 'utf8')
    expect(text).not.toMatch(/\bfrom\s+['"][^'"]*shell/)
    expect(text).not.toMatch(/\brequire\s*\(/)
    expect(text, 'pictures.ts must not read the filesystem at runtime — it IS the data').not.toMatch(
      /node:fs|readFileSync/,
    )
  })
})
