// tools/transcribe-pictures.mjs
//
// Story jt1-3 (GREEN, Julia) — the transcription path: vendored 1982 Williams
// assembler → src/core/pictures.ts + docs/rom-study/pictures.fixture.json.
//
// ─── INDEPENDENCE ────────────────────────────────────────────────────────────
// This reader is written from the SOURCE FORMAT, and deliberately shares no
// code with the TEA-authored reader under tests/helpers/. It must never import
// it: that reader is the second entry of a double-entry gate, and a
// transcription that consumed it would collapse both entries into one while the
// suite stayed green. The gate suite enforces this by scanning these files for
// any such import, which is why the module is not named here either.
//
// ─── RADIX (Motorola 6809, as the 1982 assembler reads it) ───────────────────
// `$` hex · `@` octal · `%` binary · BARE = DECIMAL. `+`/`*` arithmetic, and
// `!X` is XOR — `$1107!XDMAFIX` stores the w/h word pre-XORed with DMAFIX.
// Nothing here evaluates a literal into a different radix: the text is
// authoritative (the jt1-2 gate's whole premise).
//
// ─── THE TWO TRAPS THIS READER IS BUILT TO SURVIVE ───────────────────────────
//  1. PHANTOM LABELS. JOUSTI.SRC:65 and :89 carry comments that wrap onto the
//     next line with no `*` continuation, leaving `ZERO)` at :66 and `CREEN` at
//     :90 sitting in the label column. Both are shaped exactly like labels
//     (`CREEN` is a valid uppercase identifier), and honouring them SPLITS the
//     collision table each interrupts — CCLF1L's 8-row mask becomes 1 row plus
//     7 attributed to an invented symbol, a wrong mask that is still perfectly
//     well-formed. They are separated semantically: a real label is referenced
//     somewhere in the file; comment debris is referenced by nothing.
//  2. FDB-vs-FCB AND SPACE INDENTS. Pixel data appears as both FCB (bytes) and
//     FDB (words), and some rows are space-indented rather than tab-indented.
//     All ten cliff sources and TRASRC are FDB-only — an FCB-only or tab-only
//     reader drops exactly those blocks and silently loses 11 of 93.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const TREE = process.env.JOUST_SOURCE_DIR ?? join(repoRoot, '..', '..', 'reference', 'williams-source', 'joust')

const SYMBOLS = { COFF: 0x0200, DMAFIX: 0x0404 }

const cache = new Map()
function lines(file) {
  if (!cache.has(file)) cache.set(file, readFileSync(join(TREE, file), 'utf8').split('\n'))
  return cache.get(file)
}

// ─── Statement parsing ────────────────────────────────────────────────────
// A line is: [LABEL] <ws> OP <ws> OPERANDS <ws> COMMENT. The operand field
// ends at the first whitespace AFTER it starts — which is what makes COLOR1's
// second operand column a dead alternate rather than more data.

const OPS = new Set(['FCB', 'FDB', 'EQU', 'ORG', 'RMB', 'MACRO', 'ENDM', 'END', 'FCC', 'SET'])

function parseStatement(line) {
  if (line === undefined) return null
  if (line.startsWith('*') || line.trim() === '') return null
  const m = line.match(/^([A-Z][A-Z0-9$_]*)?[ \t]+([A-Z]+)(?:[ \t]+(\S+))?/)
  if (!m) return null
  const [, label, op, operandField] = m
  if (!OPS.has(op)) return null
  return {
    label: label ?? null,
    op,
    operands: operandField ? operandField.split(',') : [],
  }
}

/** A line carrying nothing but a bare label (or comment-wrap debris). */
function labelOnlyToken(line) {
  if (line === undefined) return null
  const m = line.match(/^([A-Z][A-Z0-9$_)]*)\s*$/)
  return m ? m[1] : null
}

/**
 * TRAP 1. Bare label-only tokens that NOTHING in the file ever references are
 * comment-wrap debris, not labels. Shape cannot distinguish them; reference
 * can. Selects exactly `ZERO)` (:66) and `CREEN` (:90) in JOUSTI.SRC.
 */
function phantomLabels(file) {
  const src = lines(file)
  const bare = []
  src.forEach((line, i) => {
    const tok = labelOnlyToken(line)
    if (tok) bare.push({ token: tok, line: i + 1 })
  })
  const referenced = new Set()
  for (const line of src) {
    const st = parseStatement(line)
    if (!st) continue
    for (const operand of st.operands) {
      for (const sym of operand.match(/[A-Z][A-Z0-9$_]*/g) ?? []) referenced.add(sym)
    }
  }
  return bare.filter((b) => !referenced.has(b.token))
}

// ─── Operand evaluation ───────────────────────────────────────────────────

function evalTerm(tok) {
  const t = tok.trim()
  if (t === '') return null
  if (t.startsWith('$')) return parseInt(t.slice(1), 16)
  if (t.startsWith('@')) return parseInt(t.slice(1), 8)
  if (t.startsWith('%')) return parseInt(t.slice(1), 2)
  if (/^\d+$/.test(t)) return parseInt(t, 10) // BARE = DECIMAL, never hex
  if (t === '*') return null
  if (Object.prototype.hasOwnProperty.call(SYMBOLS, t)) return SYMBOLS[t]
  return null // an unresolved label reference — NOT silently zero
}

/** Evaluate `A+B`, `A*B` and `X!Y` (XOR). Returns null if any term is a label. */
function evalOperand(tok) {
  const xor = tok.split('!X')
  if (xor.length === 2) {
    const a = evalOperand(xor[0])
    const b = evalOperand(xor[1])
    return a === null || b === null ? null : a ^ b
  }
  let total = 0
  for (const addend of tok.split('+')) {
    let product = 1
    for (const factor of addend.split('*')) {
      const v = evalTerm(factor)
      if (v === null) return null
      product *= v
    }
    total += product
  }
  return total
}

const isSymbolRef = (tok) => evalOperand(tok) === null

/** Bytes contributed by one statement: FCB = one byte each, FDB = two (big-endian). */
function statementBytes(st) {
  if (!st || (st.op !== 'FCB' && st.op !== 'FDB')) return null
  const out = []
  for (const tok of st.operands) {
    const v = evalOperand(tok)
    if (v === null) return null // a symbol reference: this is a record, not pixels
    if (st.op === 'FCB') out.push(v & 0xff)
    else out.push((v >> 8) & 0xff, v & 0xff)
  }
  return out
}

// ─── Walk JOUSTI.SRC ──────────────────────────────────────────────────────

const FILE = 'JOUSTI.SRC'
const src = lines(FILE)
const phantoms = new Set(phantomLabels(FILE).map((p) => p.token))

const pixelBlocks = []
const entityRecords = []
const backgroundRecords = []
const subRecords = []
const collisionTables = []
let comcl5 = null
const deferred = []

/** Collect consecutive pure-data rows starting at `n` (1-based). */
function collectData(n, { allowComments = false } = {}) {
  const rows = []
  let i = n
  let pending = 0
  while (i <= src.length) {
    const line = src[i - 1]
    if (line === undefined) break
    if (line.startsWith('*') || line.trim() === '') {
      // ASH1R/L separate their frames with bare `* PTERA1` comments. A comment
      // only ENDS a block when no more unlabelled data follows it.
      if (!allowComments) break
      pending++
      if (pending > 3) break
      i++
      continue
    }
    pending = 0
    if (labelOnlyToken(line) && !phantoms.has(labelOnlyToken(line))) break
    if (phantoms.has(labelOnlyToken(line) ?? '')) {
      i++ // TRAP 1: step over comment debris without ending the block
      continue
    }
    const st = parseStatement(line)
    if (!st) break
    if (st.label) break // a new labelled statement ends this block
    const bytes = statementBytes(st)
    if (bytes === null) break
    rows.push({ line: i, bytes })
    i++
  }
  return { rows, next: i }
}

/** Collect FDB span rows for a collision table (symbols never appear here). */
function collectSpans(n) {
  const words = []
  let i = n
  let last = n - 1
  while (i <= src.length) {
    const line = src[i - 1]
    if (line === undefined) break
    if (line.startsWith('*') || line.trim() === '') break
    const tok = labelOnlyToken(line)
    if (tok && phantoms.has(tok)) {
      i++ // TRAP 1 again: `ZERO)` sits inside CCLF1L's mask
      continue
    }
    if (tok) break
    const st = parseStatement(line)
    if (!st || st.op !== 'FDB' || st.label) break
    const vals = st.operands.map(evalOperand)
    if (vals.some((v) => v === null)) break
    words.push(...vals)
    last = i
    i++
  }
  return { words, last, next: i }
}

const isFramedHeader = (st) => st.op === 'FDB' && st.operands.length === 1 && /!X/.test(st.operands[0])
const isSpanRow = (st) =>
  st.op === 'FDB' &&
  st.operands.length === 2 &&
  st.operands.every((t) => !isSymbolRef(t)) &&
  st.operands.some((t) => /COFF/.test(t) || /^\$8[01]00$/.test(t))

for (let n = 1; n <= src.length; n++) {
  const line = src[n - 1]
  const bare = labelOnlyToken(line)

  // A bare label introduces a raw pixel source (the cliff sources, TRASRC), a
  // bare collision table (the CEGG* masks), or the ASH RLE stream.
  if (bare && !phantoms.has(bare)) {
    // Consecutive bare labels are ALIASES at one address (ASH1R / ASH1L).
    const names = [bare]
    let m = n + 1
    while (m <= src.length) {
      const t = labelOnlyToken(src[m - 1])
      if (t && !phantoms.has(t)) {
        names.push(t)
        m++
      } else break
    }
    const nextSt = parseStatement(src[m - 1])
    if (nextSt && !nextSt.label && isSpanRow(nextSt)) {
      // A bare label over span rows is a COLLISION table, not pixels.
      const { words, last } = collectSpans(m)
      const spans = []
      for (let i = 0; i + 1 < words.length; i += 2) spans.push([words[i], words[i + 1]])
      collisionTables.push({
        name: names[0],
        aliases: names.slice(1),
        spans,
        anchor: { file: FILE, startLine: m, endLine: last },
      })
      n = last
      continue
    }
    const { rows } = collectData(m, { allowComments: true })
    if (rows.length > 0) {
      pixelBlocks.push({
        name: names[0],
        aliases: names.slice(1),
        rows,
        anchor: { file: FILE, startLine: rows[0].line, endLine: rows[rows.length - 1].line },
        headerAnchor: null,
      })
      n = rows[rows.length - 1].line
    }
    continue
  }

  const st = parseStatement(line)
  if (!st || !st.label) continue

  // Framed pixel block: `LABEL FDB $WWHH!XDMAFIX` then its pixel rows.
  if (isFramedHeader(st)) {
    const wh = evalOperand(st.operands[0]) ^ SYMBOLS.DMAFIX
    const { rows } = collectData(n + 1)
    if (rows.length === 0) continue
    // Aliases: consecutive label-only lines immediately ABOVE the header share
    // its address (ASH1R/ASH1L).
    const aliases = []
    for (let k = n - 1; k >= 1; k--) {
      const t = labelOnlyToken(src[k - 1])
      if (t && !phantoms.has(t)) aliases.push(t)
      else break
    }
    pixelBlocks.push({
      name: st.label,
      aliases,
      width: (wh >> 8) & 0xff,
      height: wh & 0xff,
      rows,
      anchor: { file: FILE, startLine: rows[0].line, endLine: rows[rows.length - 1].line },
      headerAnchor: { file: FILE, startLine: n, endLine: n },
    })
    continue
  }

  // 4-word background record: collision/control, source, dest, w/h!XDMAFIX.
  if (st.op === 'FDB' && st.operands.length === 4 && /!X/.test(st.operands[3])) {
    const collisionTok = st.operands[0]
    backgroundRecords.push({
      name: st.label,
      collision: isSymbolRef(collisionTok) ? collisionTok : evalOperand(collisionTok),
      source: st.operands[1],
      dest: evalOperand(st.operands[2]),
      wh: evalOperand(st.operands[3]) ^ SYMBOLS.DMAFIX,
      anchor: { file: FILE, startLine: n, endLine: n },
    })
    // Continuation sub-records (unlabelled, 3 words: source, dest, w/h) name
    // further pixel sources — CLIF5's CSRC5L and CSRC5R only appear here, so a
    // reader that stopped at the labelled line cannot size them.
    for (let k = n + 1; k <= src.length; k++) {
      const c = parseStatement(src[k - 1])
      if (!c || c.label || c.op !== 'FDB' || c.operands.length !== 3) break
      if (!/!X/.test(c.operands[2])) break
      subRecords.push({
        parent: st.label,
        source: c.operands[0],
        dest: evalOperand(c.operands[1]),
        wh: evalOperand(c.operands[2]) ^ SYMBOLS.DMAFIX,
        line: k,
      })
    }
    continue
  }

  // 3-word entity record (the POSOFF macro): collision, position, source.
  if (st.op === 'FDB' && st.operands.length === 3 && isSymbolRef(st.operands[2])) {
    const collisionTok = st.operands[0]
    entityRecords.push({
      name: st.label,
      collision: isSymbolRef(collisionTok) ? collisionTok : null,
      position: evalOperand(st.operands[1]),
      source: st.operands[2],
      anchor: { file: FILE, startLine: n, endLine: n },
    })
    continue
  }

  // A labelled pure-data statement starts a block (COMCL5 at :594 is a
  // labelled FCB of %-binary, not a bare label like the cliff sources).
  if ((st.op === 'FCB' || st.op === 'FDB') && !isSpanRow(st) && statementBytes(st) !== null) {
    const head = statementBytes(st)
    const { rows } = collectData(n + 1)
    const allRows = [{ line: n, bytes: head }, ...rows]
    pixelBlocks.push({
      name: st.label,
      aliases: [],
      rows: allRows,
      anchor: { file: FILE, startLine: n, endLine: allRows[allRows.length - 1].line },
      headerAnchor: null,
    })
    n = allRows[allRows.length - 1].line
    continue
  }

  // Collision table: a labelled span row, then its continuation rows.
  if (isSpanRow(st)) {
    const head = st.operands.map(evalOperand)
    const { words, last } = collectSpans(n + 1)
    const all = [...head, ...words]
    const spans = []
    for (let i = 0; i + 1 < all.length; i += 2) spans.push([all[i], all[i + 1]])
    collisionTables.push({
      name: st.label,
      aliases: [],
      spans,
      anchor: { file: FILE, startLine: n, endLine: Math.max(n, last) },
    })
    continue
  }
}

// ─── COMCL5 — the compacted CLIFF5 %-binary stream ────────────────────────
{
  const idx = pixelBlocks.findIndex((b) => b.name === 'COMCL5')
  if (idx >= 0) {
    const b = pixelBlocks[idx]
    comcl5 = { bytes: b.rows.flatMap((r) => r.bytes), anchor: b.anchor }
  }
}

// ─── Palettes ─────────────────────────────────────────────────────────────
function readPalette(file, from, to) {
  const L = lines(file)
  const bytes = []
  for (let n = from; n <= to; n++) {
    const st = parseStatement(L[n - 1])
    // FIRST operand column only — the second is a dead alternate that DIFFERS
    // on five rows, so splitting on whitespace yields a plausible wrong palette.
    if (st?.op === 'FCB') bytes.push(evalOperand(st.operands[0]) & 0xff)
  }
  return { bytes, anchor: { file, startLine: from, endLine: to } }
}

export { parseStatement, evalOperand, statementBytes, phantomLabels, lines }

// ─── Emit ─────────────────────────────────────────────────────────────────
const sha = (bytes) => createHash('sha256').update(Buffer.from(bytes)).digest('hex')

// ─── Module emitter ───────────────────────────────────────────────────────
// Emits src/core/pictures.ts (pure data + the transcribed decoder) and
// docs/rom-study/pictures.fixture.json (per-block geometry + digests, the CI
// path when the vendored tree is absent).

const STREAM_BLOCKS = new Set(['COMCL5', 'ASH1R'])

export function emit() {
  const whBySource = new Map()
  for (const r of backgroundRecords) if (!whBySource.has(r.source)) whBySource.set(r.source, r.wh)
  for (const r of subRecords) if (!whBySource.has(r.source)) whBySource.set(r.source, r.wh)

  const blocks = []
  for (const b of pixelBlocks) {
    const bytes = b.rows.flatMap((r) => r.bytes)
    let { width, height } = b
    if (width === undefined) {
      const wh = whBySource.get(b.name)
      if (wh !== undefined) {
        width = (wh >> 8) & 0xff
        height = wh & 0xff
      }
    }
    if (width !== undefined && width > 0 && width * height !== bytes.length && bytes.length % width === 0) {
      height = bytes.length / width
    }
    if (width === undefined || width * height !== bytes.length) {
      width = bytes.length
      height = 1
    }
    blocks.push({ ...b, width, height, bytes })
  }

  const palettes = {
    COLOR1: readPalette('SYSTEM.SRC', 908, 923),
    HICOLR: readPalette('JOUSTRV4.SRC', 754, 769),
    NULL: readPalette('JOUSTRV4.SRC', 762, 777),
  }

  const anchor = (a) => `{ file: '${a.file}', startLine: ${a.startLine}, endLine: ${a.endLine} }`
  const byteList = (bytes) => {
    const out = []
    for (let i = 0; i < bytes.length; i += 24) {
      out.push('    ' + bytes.slice(i, i + 24).map((v) => v.toString()).join(', '))
    }
    return out.join(',\n')
  }
  const q = (s) => `'${s}'`

  const parts = []
  parts.push(HEADER)
  parts.push(`export const DMAFIX = 0x0404\nexport const COFF = 0x0200\n`)

  parts.push('export const PIXEL_BLOCKS: PixelBlock[] = [')
  for (const b of blocks) {
    parts.push(`  {
    name: ${q(b.name)},
    aliases: [${b.aliases.map(q).join(', ')}],
    width: ${b.width},
    height: ${b.height},
    anchor: ${anchor(b.anchor)},
    headerAnchor: ${b.headerAnchor ? anchor(b.headerAnchor) : 'null'},
    encoding: '${STREAM_BLOCKS.has(b.name) ? 'stream' : 'raster'}',
    bytes: [
${byteList(b.bytes)},
    ],
  },`)
  }
  parts.push(']\n')

  parts.push('export const ENTITY_RECORDS: EntityRecord[] = [')
  for (const r of entityRecords) {
    parts.push(
      `  { name: ${q(r.name)}, collision: ${r.collision ? q(r.collision) : 'null'}, position: ${r.position}, source: ${q(r.source)}, anchor: ${anchor(r.anchor)} },`,
    )
  }
  parts.push(']\n')

  parts.push('export const BACKGROUND_RECORDS: BackgroundRecord[] = [')
  for (const r of backgroundRecords) {
    const coll = typeof r.collision === 'string' ? q(r.collision) : `0x${r.collision.toString(16).padStart(4, '0')}`
    parts.push(
      `  { name: ${q(r.name)}, collision: ${coll}, source: ${q(r.source)}, dest: 0x${r.dest.toString(16).padStart(4, '0')}, wh: 0x${r.wh.toString(16).padStart(4, '0')}, anchor: ${anchor(r.anchor)} },`,
    )
  }
  for (const r of subRecords) {
    parts.push(
      `  { name: ${q(`${r.parent}_${r.source}`)}, collision: ${q(r.parent)}, source: ${q(r.source)}, dest: 0x${r.dest.toString(16).padStart(4, '0')}, wh: 0x${r.wh.toString(16).padStart(4, '0')}, anchor: ${anchor({ file: FILE, startLine: r.line, endLine: r.line })} },`,
    )
  }
  parts.push(']\n')

  parts.push('export const COLLISION_TABLES: CollisionTable[] = [')
  for (const t of collisionTables) {
    const spans = t.spans.map(([l, r]) => `[${l}, ${r}]`).join(', ')
    parts.push(
      `  { name: ${q(t.name)}, aliases: [${t.aliases.map(q).join(', ')}], anchor: ${anchor(t.anchor)},\n    spans: [${spans}] },`,
    )
  }
  parts.push(']\n')

  parts.push('export const PALETTES: Record<string, Palette> = {')
  for (const [name, p] of Object.entries(palettes)) {
    parts.push(
      `  ${name}: { name: ${q(name)}, anchor: ${anchor(p.anchor)},\n    bytes: [${p.bytes.join(', ')}] },`,
    )
  }
  parts.push('}\n')

  const c5 = blocks.find((b) => b.name === 'COMCL5')
  parts.push(`// The named export is a VIEW of the gated PIXEL_BLOCKS entry — one byte array,
// so the AC-1/AC-4 byte gate on PIXEL_BLOCKS covers every consumer of COMCL5.
// (jt1-3 review R1: a second literal here was 871 ungated bytes.)
const comcl5Block = PIXEL_BLOCKS.find((b) => b.name === 'COMCL5')
if (!comcl5Block) throw new Error('COMCL5 block missing from PIXEL_BLOCKS')
export const COMCL5: { bytes: number[]; anchor: SourceAnchor } = {
  anchor: comcl5Block.anchor,
  bytes: comcl5Block.bytes,
}\n`)

  parts.push('export const DEFERRED: DeferredBlock[] = []\n')
  parts.push(DECODER)

  mkdirSync(join(repoRoot, 'src', 'core'), { recursive: true })
  writeFileSync(join(repoRoot, 'src', 'core', 'pictures.ts'), parts.join('\n') + '\n')

  // ─── Fixture ───────────────────────────────────────────────────────────
  const expanded = expandComcl5Ref(c5.bytes)
  const fixture = {
    blockCount: blocks.length,
    blocks: Object.fromEntries(
      blocks.map((b) => [b.name, { width: b.width, height: b.height, sha256: sha(b.bytes) }]),
    ),
    comcl5: {
      byteLength: c5.bytes.length,
      sha256: sha(c5.bytes),
      expandedSha256: sha(expanded.pixels),
    },
    palettes: Object.fromEntries(Object.entries(palettes).map(([n, p]) => [n, sha(p.bytes)])),
  }
  mkdirSync(join(repoRoot, 'docs', 'rom-study'), { recursive: true })
  writeFileSync(
    join(repoRoot, 'docs', 'rom-study', 'pictures.fixture.json'),
    JSON.stringify(fixture, null, 2) + '\n',
  )

  return { blocks, entityRecords, backgroundRecords, collisionTables, palettes, expanded, comcl5: c5 }
}

const HEADER = `// src/core/pictures.ts
//
// Story jt1-3 (GREEN, Julia) — GENERATED by tools/transcribe-pictures.mjs from
// the vendored 1982 Williams source. DO NOT HAND-EDIT: every byte below is
// transcribed, and every record carries the file + line range it came from, so
// tests/pictures-gate.test.ts can re-derive it with an INDEPENDENT reader and
// refuse any byte that does not match. Hand-authoring a pixel here is not a
// rule someone has to remember — it is structurally impossible (AC-4).
//
// Radix, as the 1982 assembler reads it: \\\`$\\\` hex, \\\`@\\\` octal, \\\`%\\\` binary,
// BARE = DECIMAL, and \\\`!X\\\` is XOR. Pixel rows are hex; collision spans are
// decimal biased by COFF; COMCL5 is a binary bit stream; octal appears only in
// the palettes. Nothing is re-radixed on the way in — the text is authoritative.
//
// Two source traps are handled by the transcriber and worth knowing about when
// reading JOUSTI.SRC by hand:
//   - JOUSTI.SRC:66 (\\\`ZERO)\\\`) and :90 (\\\`CREEN\\\`) are comment-wrap debris sitting
//     in the label column. Honouring them splits CCLF1L's 8-row collision mask
//     into 1 row + 7 orphans — a wrong mask that is still well-formed.
//   - Pixel data is both FCB (bytes) and FDB (words), sometimes space-indented.
//     All ten cliff sources and TRASRC are FDB-only.
//
// This module is CORE: pure data and one pure decoder. No clock, no entropy, no
// browser surface, no shell import, and it never touches the filesystem — it IS
// the data.

/** Where a datum came from: an inclusive line range in a vendored file. */
export interface SourceAnchor {
  file: string
  startLine: number
  endLine: number
}

/** One block of pixel data — a labelled run of FCB/FDB rows. */
export interface PixelBlock {
  name: string
  aliases: string[]
  /** Bytes per row. Pixel width is 2x this (4bpp, 2 pixels/byte). */
  width: number
  height: number
  bytes: number[]
  anchor: SourceAnchor
  /** The \\\`$WWHH!XDMAFIX\\\` header line, or null for raw pointed-at sources. */
  headerAnchor: SourceAnchor | null
  /**
   * How the bytes are laid out. 'raster' is width x height 4bpp pixel data the
   * shell can blit directly; 'stream' is a COMPRESSED byte stream (COMCL5's
   * Elias-gamma bits, ASH1R/L's run-length pairs) stored 1-D. Blitting a stream
   * as a raster produces convincing noise, so the discriminant is explicit
   * rather than inferred from height === 1.
   */
  encoding: 'raster' | 'stream'
}

/** A 3-word entity frame record (the POSOFF macro, JOUSTI.SRC:12-13). */
export interface EntityRecord {
  name: string
  collision: string | null
  position: number
  source: string
  anchor: SourceAnchor
}

/** A 4-word background/cliff record — a partial DMA block. */
export interface BackgroundRecord {
  name: string
  /** Collision label, or the literal DMA control word (transporters: 0x0A00). */
  collision: string | number
  source: string
  dest: number
  /** w/h as WRITTEN in the source, already un-XORed back through DMAFIX. */
  wh: number
  anchor: SourceAnchor
}

/** A per-scanline collision mask: (left,right) span pairs, COFF-biased. */
export interface CollisionTable {
  name: string
  aliases: string[]
  spans: Array<[number, number]>
  anchor: SourceAnchor
}

export interface Palette {
  name: string
  /** 16 bytes, BBGGGRRR. */
  bytes: number[]
  anchor: SourceAnchor
}

/** Something deliberately not transcribed — recorded, never silently omitted. */
export interface DeferredBlock {
  name: string
  aliases: string[]
  anchor: SourceAnchor
  reason: string
  consumer: SourceAnchor
}

export interface ExpandedImage {
  width: number
  height: number
  /** One palette-index nibble per pixel WRITTEN, in draw order. */
  pixels: number[]
  /**
   * Length of each written row, in draw order. Row boundaries are NOT
   * recoverable from width x height — only the first rows are full width, so a
   * consumer indexing pixels[y*width+x] shears the image (jt1-6 render hotfix:
   * reshapeRagged must consume these).
   */
  rowLengths: number[]
}
`

const DECODER = `/**
 * The COMCL5 un-compactor, transcribed from UNCOM/REST (SYSTEM.SRC:937-1023),
 * entered from NEWCL5 (:927-929) at pixel origin (0x1B*2, 0xD3) = (54, 211).
 *
 * It is an Elias-gamma BIT stream, not the value/run byte pairs a first reading
 * suggests. Per token:
 *   - a unary prefix counts bits up to and including the first 1 (UNCLP :939-947)
 *   - REST (:1012-1023) reads that many more bits onto an implicit leading 1
 *   - run length = that value minus 2 (\\\`SUBA #2\\\`, :949)
 *   - three more bits give a colour code; 0 stays nibble 0, 1..7 map to 8..14
 *     (\\\`ANDA #\\\$07 / BEQ / ADDA #8-1\\\`, :964-966) — which is why the expansion can
 *     only ever emit {0} u {8..14}
 *   - run length 0 means end of LINE, or end of IMAGE when the colour bits are
 *     also 0 (:955-957)
 *
 * Pure and total: same input, same output, input never mutated.
 */
export function expandComcl5(bytes: readonly number[]): ExpandedImage {
  let u = 0 // REG.U — index of the next compressed byte
  let b = 0 // REG.B — bit shift register, left-aligned with a trailing sentinel

  /** ASLB: shift the next bit out, reloading when the sentinel falls out. */
  const nextBit = (): number => {
    const shifted = (b << 1) & 0xff
    const carry = (b >> 7) & 1
    if (shifted === 0) {
      // The sentinel reached bit 7 and fell out: LDB ,U+ / ASLB / INCB.
      const x = bytes[u++] ?? 0
      b = ((x << 1) & 0xff) | 1
      return (x >> 7) & 1
    }
    b = shifted
    return carry
  }

  /** REST: read \\\`count\\\` bits onto an implicit leading 1. */
  const rest = (count: number): number => {
    let a = 1
    for (let i = 0; i < count; i++) a = ((a << 1) | nextBit()) & 0xff
    return a
  }

  const pixels: number[] = []
  const rowLengths: number[] = []
  let x = 0
  let maxX = 0
  let lines = 0

  for (;;) {
    let n = 0
    for (;;) {
      n++
      if (nextBit()) break
      if (n > 16) return { width: maxX, height: lines, pixels, rowLengths } // malformed stream
    }
    const run = (rest(n) - 2) & 0xff
    let colour = rest(3) & 0x07

    if (run === 0) {
      if (colour === 0) break // end of image
      // End of line: X reloads to the line start, Y advances one scanline. A
      // line only counts once it has pixels, so a trailing end-of-line
      // immediately before end-of-image does not invent a blank row.
      if (x > 0) {
        lines++
        rowLengths.push(x)
      }
      if (x > maxX) maxX = x
      x = 0
      continue
    }

    if (colour !== 0) colour += 8 - 1
    for (let i = 0; i < run; i++) {
      pixels.push(colour)
      x++
    }
  }

  if (x > 0) {
    lines++
    rowLengths.push(x)
  }
  if (x > maxX) maxX = x
  return { width: maxX, height: lines, pixels, rowLengths }
}
`

/** Reference copy of the decoder, used to bake the fixture digest. */
function expandComcl5Ref(bytes) {
  let u = 0
  let b = 0
  const nextBit = () => {
    const shifted = (b << 1) & 0xff
    const carry = (b >> 7) & 1
    if (shifted === 0) {
      const x = bytes[u++] ?? 0
      b = ((x << 1) & 0xff) | 1
      return (x >> 7) & 1
    }
    b = shifted
    return carry
  }
  const rest = (count) => {
    let a = 1
    for (let i = 0; i < count; i++) a = ((a << 1) | nextBit()) & 0xff
    return a
  }
  const pixels = []
  const rowLengths = []
  let x = 0
  let maxX = 0
  let lines = 0
  for (;;) {
    let n = 0
    for (;;) {
      n++
      if (nextBit()) break
      if (n > 16) return { width: maxX, height: lines, pixels }
    }
    const run = (rest(n) - 2) & 0xff
    let colour = rest(3) & 0x07
    if (run === 0) {
      if (colour === 0) break
      if (x > 0) {
        lines++
        rowLengths.push(x)
      }
      if (x > maxX) maxX = x
      x = 0
      continue
    }
    if (colour !== 0) colour += 8 - 1
    for (let i = 0; i < run; i++) {
      pixels.push(colour)
      x++
    }
  }
  if (x > 0) {
    lines++
    rowLengths.push(x)
  }
  if (x > maxX) maxX = x
  return { width: maxX, height: lines, pixels, rowLengths }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  // Widths for raw cliff/transporter sources come from the record that points
  // at them — they carry no header of their own.
  const whBySource = new Map()
  for (const r of backgroundRecords) if (!whBySource.has(r.source)) whBySource.set(r.source, r.wh)
  for (const r of subRecords) if (!whBySource.has(r.source)) whBySource.set(r.source, r.wh)

  const blocks = []
  for (const b of pixelBlocks) {
    const bytes = b.rows.flatMap((r) => r.bytes)
    let { width, height } = b
    if (width === undefined) {
      const wh = whBySource.get(b.name)
      if (wh !== undefined) {
        width = (wh >> 8) & 0xff
        height = wh & 0xff
      }
    }
    if (width !== undefined && width > 0 && width * height !== bytes.length && bytes.length % width === 0) {
      // The record's DMA height and the data's row count can legitimately
      // disagree: CSRC5L holds 14 rows of 8 while CLIF5's sub-record draws 13.
      // Truncating to the record would DROP source bytes ("no padding, no
      // truncation"), so the block keeps every byte and takes its height from
      // the data. Recorded as a Delivery Finding.
      height = bytes.length / width
    }
    if (width === undefined || width * height !== bytes.length) {
      // COMCL5 and ASH1R/L are 1-D compressed streams, not rasters.
      width = bytes.length
      height = 1
    }
    blocks.push({ ...b, width, height, bytes })
  }

  console.log(`blocks: ${blocks.length}`)
  console.log(`  framed (headered): ${blocks.filter((b) => b.headerAnchor).length}`)
  console.log(`  raw sources:       ${blocks.filter((b) => !b.headerAnchor).length}`)
  console.log(`entity records:      ${entityRecords.length}`)
  console.log(`background records:  ${backgroundRecords.length}`)
  console.log(`collision tables:    ${collisionTables.length}`)
  console.log(`COMCL5 bytes:        ${comcl5?.bytes.length}`)
  console.log(`phantoms skipped:    ${[...phantoms].join(', ')}`)
  const bad = blocks.filter((b) => b.width * b.height !== b.bytes.length)
  console.log(`geometry mismatches: ${bad.length}`, bad.map((b) => `${b.name} ${b.width}x${b.height}!=${b.bytes.length}`).join(' | '))
  writeFileSync('/tmp/transcribe-dump.json', JSON.stringify({ blocks, entityRecords, backgroundRecords, collisionTables, comcl5 }, null, 1))
  const out = emit()
  console.log(`COMCL5 expansion:    ${out.expanded.pixels.length} px, ${out.expanded.width}x${out.expanded.height}`)
  console.log('wrote src/core/pictures.ts + docs/rom-study/pictures.fixture.json')
}
