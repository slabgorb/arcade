// tests/charset-gate.test.ts
//
// Story df2-3 — RED phase (Han Solo / TEA). THE CHARSET BYTE GATE.
//
// MESS0 is Defender's charset/message block — banked block 2, `SELECT CHARS`
// (defender/DEFA7.SRC:2030). Its glyphs are inline FDB pixel tables
// (defender/MESS0.SRC:441-640): a CHARACTER DESCRIPTER TABLE `CHRTBL` of 4-byte
// records `FDB $WWHH,<ptr>` and, per glyph, `WW × HH` bytes of cell data. This
// story transcribes that charset into a GENERATED module and proves every byte
// against the vendored source with an INDEPENDENT reader that refuses any
// mismatch — the epic's "generated-data + independent-gate" pattern
// (scripts/transcribe-pictures.mjs + plugins/joust/tests/pictures-gate.test.ts),
// with the reader re-derived for the Williams RASM dialect (guardrail 3).
//
// ─── RED / GREEN SPLIT ────────────────────────────────────────────────────────
// TEA (this file + tests/helpers/defender-source.ts) authors the failing suite
// and the SECOND, independent reader. GREEN (Yoda / Dev) ships:
//   1. scripts/transcribe-charset.mjs — the transcribe tool (Dev's OWN reading of
//      MESS0.SRC; it must NOT import the test-side reader — see the independence
//      block below, or the byte gate is tautological).
//   2. plugins/defender/src/core/charset.ts — the GENERATED charset module: a
//      `CHARSET` of glyph records (name/char/width/height/encoding/bytes/source)
//      plus a pure `blitGlyph` and `writeText` (contract pinned in
//      tests/charset-blit.test.ts). Held to src/core purity.
//
// ─── WHY THIS IS RED, AND WHY THE READER'S TEETH ARE GREEN ────────────────────
// The module does not exist yet, so `loadCharset()` throws a self-describing
// "not built yet" and every module/gate test fails. The READER's own-teeth tests
// pass on arrival — they must, because a gate built on an unchecked reader is
// just a second guess (lang-review #18). Their fixtures are facts verified against
// the vendored tree THIS session, not values echoed back from the module.
//
// reference/original-source/defender/ is tracked in git, so the byte gate runs
// EVERYWHERE including CI (df1-1 settled this) — no committed fixture is needed,
// and there are no assembled .PIC artefacts to cross-check (unlike joust).
//
// Every vendored read lives inside an it() body (the collection trap).

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  vendoredAvailable,
  parseStatement,
  isLabelOnly,
  evalOperand,
  evalNumber,
  wordsToBytes,
  bytesForLabel,
  cellBytes,
  descriptorTable,
} from './helpers/defender-source.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

// ─── The module contract GREEN must satisfy (local shim; declared here so this
//     suite COMPILES against a not-yet-built module and vitest reports clean
//     per-test failures instead of a collect crash). charset.ts becomes canonical.
interface Glyph {
  /** A stable name (e.g. 'A', 'ZERO', 'SPACE', 'QUESTION'). */
  name: string
  /** The ASCII character this glyph renders, or null for non-printable/aliases. */
  char: string | null
  width: number
  height: number
  /** The encoding discriminant — MUST be 'raster' for a glyph blitGlyph may draw
   *  (streams-are-not-rasters: a non-raster block is refused, never rastered). */
  encoding: string
  /** The effective cell: exactly width×height bytes, big-endian from the source. */
  bytes: readonly number[]
  /** Provenance: the MESS0.SRC data label this cell was transcribed from. */
  source: { file: string; label: string }
}
interface CharsetModule {
  CHARSET: readonly Glyph[]
  glyphForChar(ch: string): Glyph | undefined
}

async function loadCharset(): Promise<CharsetModule> {
  // Runtime-assembled specifier so neither tsc nor the bundler resolves it
  // statically; a missing module reads as "not built yet", never a collect crash.
  const spec = ['..', 'src', 'core', 'charset.js'].join('/')
  try {
    return (await import(/* @vite-ignore */ spec)) as unknown as CharsetModule
  } catch (e) {
    throw new Error(
      'src/core/charset.ts not built yet (GREEN transcribes MESS0.SRC into the ' +
        `generated CHARSET module): ${(e as Error).message}`,
    )
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// THE READER'S OWN TEETH. A gate resting on an unchecked reader is a second
// guess (lang-review #18). Every fixture below was verified against the vendored
// tree this session; these run everywhere and never touch the module.
// ══════════════════════════════════════════════════════════════════════════════
describe('independent reader — RASM radix (the sigil decides, bare is DECIMAL)', () => {
  it('reads $hex, and a bare number as base TEN not sixteen', () => {
    expect(evalOperand('$0308')).toBe(0x0308)
    expect(evalOperand('$FF')).toBe(255)
    expect(evalOperand('0')).toBe(0)
    // The trap: no sigil means ten. `10` is 10, never 0x10.
    expect(evalOperand('10')).toBe(10)
    expect(evalOperand('10')).not.toBe(0x10)
  })

  it('sums an A+B operand and returns a symbol (never 0) for an unresolved label', () => {
    expect(evalOperand('7+8')).toBe(15)
    expect(evalOperand('LETTRA')).toEqual({ symbol: 'LETTRA' })
    expect(() => evalNumber('LETTRA')).toThrow()
  })

  it('expands FDB words BIG-ENDIAN — high byte first (the width byte leads $WWHH)', () => {
    expect(wordsToBytes([0x0308])).toEqual([0x03, 0x08])
    expect(wordsToBytes([0x0101, 0x0100])).toEqual([0x01, 0x01, 0x01, 0x00])
  })
})

describe('independent reader — RASM statement parsing', () => {
  it('splits label / op / comma-operands and drops the trailing comment', () => {
    const st = parseStatement('ALPHA0\tFDB\t$0308,LETTRA LETTER A', 460)
    expect(st).not.toBeNull()
    expect(st!.label).toBe('ALPHA0')
    expect(st!.op).toBe('FDB')
    expect(st!.operands).toEqual(['$0308', 'LETTRA'])
  })

  it('parses an unlabelled continuation FDB row (four words)', () => {
    const st = parseStatement('\tFDB\t$0101,$0101,$0101,$0100', 546)
    expect(st!.label).toBeNull()
    expect(st!.operands).toEqual(['$0101', '$0101', '$0101', '$0100'])
  })

  it('returns null for comments, blanks and label-only lines', () => {
    expect(parseStatement('* CHARACTERS', 487)).toBeNull()
    expect(parseStatement('', 1)).toBeNull()
    expect(isLabelOnly('ALPHA0')).toBe(true)
  })
})

describe.skipIf(!vendoredAvailable)('independent reader — real MESS0.SRC facts (this session)', () => {
  it('CHRTBL has 45 descriptor records with the sampled widths', () => {
    const d = descriptorTable('MESS0.SRC')
    expect(d.length).toBe(45)
    const byPtr = Object.fromEntries(d.map((e) => [e.ptr, e]))
    expect([byPtr.LETTRA.width, byPtr.LETTRA.height]).toEqual([3, 8])
    expect([byPtr.LETTRI.width, byPtr.LETTRI.height]).toEqual([2, 8]) // the narrow I
    expect([byPtr.LETTRM.width, byPtr.LETTRM.height]).toEqual([4, 8]) // the wide M
    expect([byPtr.EXCLPT.width, byPtr.EXCLPT.height]).toEqual([1, 8])
  })

  it('LETTRA is 24 big-endian bytes, exactly its 3×8 cell', () => {
    const a = bytesForLabel('MESS0.SRC', 'LETTRA')
    // prettier-ignore
    expect(a).toEqual([
      1, 1, 1, 1, 1, 1, 1, 0,
      17, 0, 0, 17, 0, 0, 0, 0,
      17, 17, 17, 17, 17, 17, 17, 0,
    ])
  })

  it('EXCLPT is the 8-byte 1×8 exclamation cell', () => {
    expect(bytesForLabel('MESS0.SRC', 'EXCLPT')).toEqual([1, 1, 1, 1, 1, 0, 1, 0])
  })

  it('SPACE aliases the oversized all-zero BLANK block; its cell is the 8-byte prefix', () => {
    // SPACE EQU * over BLANK's BSZ 3*8 (24 zero bytes); a width-1 SPACE reads 8.
    expect(bytesForLabel('MESS0.SRC', 'BLANK').length).toBe(24)
    expect(cellBytes('MESS0.SRC', 'SPACE', 1, 8)).toEqual([0, 0, 0, 0, 0, 0, 0, 0])
  })

  it('cellBytes throws if the source block is shorter than the declared cell', () => {
    expect(() => cellBytes('MESS0.SRC', 'EXCLPT', 3, 8)).toThrow() // needs 24, block is 8
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// THE MODULE CONTRACT — shape teeth that need no vendored tree.
// ══════════════════════════════════════════════════════════════════════════════
describe('generated CHARSET — module shape (AC: generated module)', () => {
  it('exists and is a non-empty list of glyph records', async () => {
    const { CHARSET } = await loadCharset()
    expect(Array.isArray(CHARSET)).toBe(true)
    expect(CHARSET.length).toBeGreaterThan(0)
  })

  it('every glyph declares encoding "raster" (streams-are-not-rasters discriminant)', async () => {
    const { CHARSET } = await loadCharset()
    const nonRaster = CHARSET.filter((g) => g.encoding !== 'raster').map((g) => g.name)
    expect(nonRaster, 'a non-raster block must not be sold as a charset glyph').toEqual([])
  })

  it("every glyph's byte count equals width×height — no padding, no truncation", async () => {
    const { CHARSET } = await loadCharset()
    const wrong = CHARSET.filter((g) => g.bytes.length !== g.width * g.height).map(
      (g) => `${g.name}: ${g.bytes.length} bytes for ${g.width}×${g.height}`,
    )
    expect(wrong).toEqual([])
  })

  it('every byte is an integer 0-255 — no NaN, no sentinels, no negatives', async () => {
    const { CHARSET } = await loadCharset()
    const bad = CHARSET.filter((g) =>
      g.bytes.some((v) => !Number.isInteger(v) || v < 0 || v > 255),
    ).map((g) => g.name)
    expect(bad).toEqual([])
  })

  it('covers the printable set a known string needs: A-Z, 0-9 and space', async () => {
    const { glyphForChar } = await loadCharset()
    const required = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '.split('')
    const missing = required.filter((ch) => glyphForChar(ch) === undefined)
    expect(missing, 'every character of a known message must resolve to a glyph').toEqual([])
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// THE GATE — every glyph re-derives byte-for-byte from its cited MESS0.SRC label,
// and its geometry agrees with the CHRTBL descriptor (two independent statements).
// ══════════════════════════════════════════════════════════════════════════════
describe.skipIf(!vendoredAvailable)('THE GATE — every glyph matches the vendored source', () => {
  it('every glyph carries a MESS0.SRC provenance label', async () => {
    const { CHARSET } = await loadCharset()
    const unanchored = CHARSET.filter(
      (g) => !g.source || g.source.file !== 'MESS0.SRC' || !g.source.label,
    ).map((g) => g.name)
    expect(unanchored, 'a glyph without a source label is unprovable by construction').toEqual([])
  })

  it("re-derives every glyph's cell bytes from its source label (refuses any mismatch)", async () => {
    const { CHARSET } = await loadCharset()
    const mismatches: string[] = []
    for (const g of CHARSET) {
      let derived: number[]
      try {
        derived = cellBytes(g.source.file, g.source.label, g.width, g.height)
      } catch (e) {
        mismatches.push(`${g.name}: ${(e as Error).message}`)
        continue
      }
      const i = derived.findIndex((v, k) => v !== g.bytes[k])
      if (derived.length !== g.bytes.length || i >= 0) {
        mismatches.push(
          `${g.name} (${g.source.label}): byte ${i} source $${derived[i]?.toString(16)} vs module $${g.bytes[i]?.toString(16)}`,
        )
      }
    }
    expect(mismatches, `${mismatches.length} glyph(s) do not match the vendored source`).toEqual([])
  })

  it("each glyph's width/height agree with its CHRTBL descriptor (independent statement)", async () => {
    const { CHARSET } = await loadCharset()
    const desc = descriptorTable('MESS0.SRC')
    const byPtr = Object.fromEntries(desc.map((e) => [e.ptr, e]))
    const wrong: string[] = []
    for (const g of CHARSET) {
      const d = byPtr[g.source.label]
      if (!d) {
        wrong.push(`${g.name}: label ${g.source.label} is not in CHRTBL`)
        continue
      }
      if (d.width !== g.width || d.height !== g.height) {
        wrong.push(`${g.name}: descriptor ${d.width}×${d.height} vs module ${g.width}×${g.height}`)
      }
    }
    expect(wrong).toEqual([])
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// THE INDEPENDENCE RULE. Without this the whole gate is theatre: if GREEN's
// transcribe tool consumes TEA's reader, the two entries collapse into one and
// the byte gate proves only that the reader agrees with itself — while green.
// Runs everywhere; never skips. (lang-review #25/#28 — a POSITIVE read-set.)
// ══════════════════════════════════════════════════════════════════════════════
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

  it('production code (defender src/tools + repo scripts) never imports the test-side reader', () => {
    const roots = [
      join(repoRoot, 'plugins', 'defender', 'src'),
      join(repoRoot, 'plugins', 'defender', 'tools'),
      join(repoRoot, 'scripts'),
    ]
    const scanned = roots.flatMap(sourceFilesUnder)
    // POSITIVE read-set floor: if the scan collapses to nothing, the guard is
    // vacuous. defender/src and repo scripts always carry files.
    expect(scanned.length, 'the independence scan must actually read production files').toBeGreaterThan(5)
    // Anchor to an actual IMPORT of the reader, not the bare token — a production
    // file may legitimately NAME the reader in a comment explaining that it does
    // not import it (the source-scan self-match trap, lang-review #15).
    const importsReader = /(?:from|import|require)\s*\(?\s*['"][^'"]*(?:defender-source|tests[/\\]helpers)/
    const offenders = scanned.filter((f) => importsReader.test(readFileSync(f, 'utf8')))
    expect(
      offenders.map((f) => f.replace(repoRoot + '/', '')),
      'production must not import the test-side reader — that makes the byte gate tautological',
    ).toEqual([])
  })
})
