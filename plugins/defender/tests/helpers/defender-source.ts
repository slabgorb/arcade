// tests/helpers/defender-source.ts
//
// Story df2-3 — RED phase (Han Solo / TEA). THE SECOND ENTRY of the charset
// byte gate. This is a self-contained, independent reader of the vendored 1981
// Defender assembler text (Williams RASM dialect), written so the charset gate
// (tests/charset-gate.test.ts) can re-derive every glyph's bytes from primary
// source and refuse any that do not match GREEN's generated module.
//
// ─── WHY A SECOND READER EXISTS (the rb4/cp1 tautology) ──────────────────────
// The failure this refuses: Dev writes a transcribe tool, the test re-runs that
// tool, the two agree, everything is green, and the gate has proven nothing but
// that the tool is deterministic. A radix confusion or a dropped FDB row would
// survive intact and be confirmed by its own author. So THIS reader is a wholly
// separate reading of the same text. The independence rule in charset-gate.test.ts
// forbids anything under src/ or scripts/ from importing this file — the moment
// production consumes it, the two entries collapse into one and the green stops
// meaning anything.
//
// SCOPE OF THE GUARANTEE (honest framing): this reader and GREEN's transcribe tool
// were authored in the same session and share the same parsing STRATEGY, so the gate
// catches a transcription typo (a flipped byte, a dropped row — proven by mutation)
// but NOT a systematic misreading of the RASM grammar reproduced identically in both.
// The independence is mechanical (no shared import), not a guarantee of independent
// reasoning. High-value tables still warrant an out-of-session spot check.
//
// ─── THE RASM DIALECT (guardrail 3 — re-derive the reader, do not lift joust's)─
// Defender's source is Williams RASM, NOT joust's MAC65. For the charset block
// (MESS0.SRC) the operands are: `$hhhh` hex and BARE DECIMAL — a number with no
// sigil is TEN, not sixteen. `FDB` stores 16-bit words BIG-ENDIAN (6809): `$0308`
// → bytes [0x03, 0x08]. That order is load-bearing: the descriptor word `$WWHH`
// gives the width byte FIRST (defender/MESS0.SRC:812, `ADDA ,Y` advances the
// cursor by that first byte). No octal (`@`), no binary (`%`), no local labels.
//
// Every vendored read is lazy / inside the caller's it() body (the collection trap).

import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
// plugins/defender/tests/helpers → repo root is four levels up.
const repoRoot = join(here, '..', '..', '..', '..')
export const vendoredRoot = join(repoRoot, 'reference', 'original-source', 'defender')
export const vendoredAvailable = existsSync(vendoredRoot)

/** Read a vendored `.SRC` file as an array of lines (1-based indexing via [n-1]). */
export function sourceLines(file: string): string[] {
  return readFileSync(join(vendoredRoot, file), 'utf8').split('\n')
}

export interface Statement {
  label: string | null
  op: string
  operands: string[]
  line: number
}

/**
 * Parse one RASM source line into a statement, or null for a comment, a blank,
 * or a label-only line (no opcode). RASM layout: a label, if present, starts in
 * column 0; the opcode and operand field are whitespace-indented. The operand
 * field is a single comma-separated token with NO internal spaces — everything
 * after the next run of whitespace is the comment (the two-column trap joust's
 * COLOR1 hit). A line beginning with `*` is a full-line comment.
 */
export function parseStatement(raw: string, line: number): Statement | null {
  if (raw.length === 0) return null
  if (raw.startsWith('*')) return null
  const hasLabel = /^\S/.test(raw)
  // Split on runs of whitespace (tabs or spaces). Leading empty field is dropped.
  const fields = raw.split(/\s+/).filter((f) => f.length > 0)
  if (fields.length === 0) return null
  let idx = 0
  const label = hasLabel ? fields[idx++] : null
  if (idx >= fields.length) return null // label-only line — not a statement
  const op = fields[idx++]
  const operandField = idx < fields.length ? fields[idx] : ''
  const operands = operandField.length > 0 ? operandField.split(',') : []
  return { label, op, operands, line }
}

/** True for a line that carries a bare label and no opcode (or is comment/blank). */
export function isLabelOnly(raw: string): boolean {
  if (raw.startsWith('*')) return false
  if (!/^\S/.test(raw)) return false
  const fields = raw.split(/\s+/).filter((f) => f.length > 0)
  return fields.length === 1
}

/**
 * Evaluate a RASM operand token to a number, or `{ symbol }` for an unresolved
 * label reference (resolving a label needs a full assembler pass we deliberately
 * do not do — coercing it to 0 would fabricate data). Supports `$hex`, bare
 * DECIMAL, and `A+B` addition of the same.
 */
export function evalOperand(token: string): number | { symbol: string } {
  const t = token.trim()
  if (t.includes('+')) {
    let sum = 0
    for (const part of t.split('+')) {
      const v = evalOperand(part)
      if (typeof v !== 'number') return v // an unresolved symbol taints the sum
      sum += v
    }
    return sum
  }
  if (t.startsWith('$')) {
    const n = parseInt(t.slice(1), 16)
    if (Number.isNaN(n)) throw new Error(`malformed hex operand: ${token}`) // never fabricate 0
    return n
  }
  if (/^[0-9]+$/.test(t)) return parseInt(t, 10) // BARE = DECIMAL (the RASM trap)
  return { symbol: t }
}

/** evalOperand, but throws on an unresolved symbol — for operands that MUST be data. */
export function evalNumber(token: string): number {
  const v = evalOperand(token)
  if (typeof v !== 'number') throw new Error(`unresolved symbol operand: ${token}`)
  return v
}

/** Expand FDB 16-bit words to bytes, BIG-ENDIAN (6809 order: high byte first). */
export function wordsToBytes(words: readonly number[]): number[] {
  const out: number[] = []
  for (const w of words) {
    out.push((w >> 8) & 0xff, w & 0xff)
  }
  return out
}

/**
 * Read a glyph's cell bytes by its data LABEL — the CHRTBL pointer, exactly as the
 * module records it. The label may be an FDB row (`LETTRA`, `EXCLPT`) OR an EQU
 * ALIAS: `SPACE EQU *` (defender/MESS0.SRC:490) names the current address, and the
 * FDB block that follows carries a DIFFERENT label (`BLANK`) — so the reader follows
 * the alias to the first FDB row at or after the definition, then reads consecutive
 * FDB rows until the next labelled glyph, comment, or non-FDB statement. Returns the
 * flat big-endian byte stream. An alias must be an actual `EQU`, not merely
 * "not an FDB row" — any other op at the definition is a transcription fault, not a
 * silent alias.
 */
export function bytesForLabel(file: string, label: string): number[] {
  const lines = sourceLines(file)
  const defIdx = lines.findIndex((l) => parseStatement(l, 0)?.label === label)
  if (defIdx < 0) throw new Error(`glyph label not found: ${label}`)
  // Resolve an EQU alias: the block begins at the first FDB row at/after the def.
  let startIdx = defIdx
  const defOp = parseStatement(lines[defIdx], defIdx + 1)?.op
  if (defOp !== 'FDB') {
    if (defOp !== 'EQU') throw new Error(`label ${label} is neither FDB data nor an EQU alias (op ${defOp})`)
    startIdx = lines.findIndex((l, i) => i >= defIdx && parseStatement(l, i + 1)?.op === 'FDB')
    if (startIdx < 0) throw new Error(`no FDB data follows EQU alias: ${label}`)
  }
  const out: number[] = []
  for (let i = startIdx; i < lines.length; i++) {
    const st = parseStatement(lines[i], i + 1)
    // The block's first row may carry a label (its own, e.g. BLANK); a LATER
    // labelled FDB row is the next glyph and ends this block.
    if (i > startIdx && (st === null || st.op !== 'FDB' || st.label !== null)) break
    if (st && st.op === 'FDB') out.push(...wordsToBytes(st.operands.map((o) => evalNumber(o))))
  }
  return out
}

/**
 * The EFFECTIVE cell bytes for a glyph: exactly `width × height` bytes taken from
 * the START of the pointed data block. Almost every glyph's block is exactly that
 * size, but SPACE aliases BLANK (`SPACE EQU *`, defender/MESS0.SRC:490-492), whose
 * block is two all-zero `FDB` rows totalling 24 bytes (the ROM's own comment annotates
 * them `BSZ 3*8`) that a width-1 SPACE over-reads safely — so the block can be LONGER
 * than the cell, and the cell is its prefix.
 * Throws if the block is SHORTER than width × height (a real transcription fault).
 */
export function cellBytes(file: string, ptr: string, width: number, height: number): number[] {
  const block = bytesForLabel(file, ptr)
  const need = width * height
  if (block.length < need) {
    throw new Error(`${ptr}: block is ${block.length} bytes, cell needs ${need} (${width}×${height})`)
  }
  return block.slice(0, need)
}

export interface Descriptor {
  /** The `$WWHH` word: width byte (high) and height byte (low). */
  width: number
  height: number
  /** The pixel-data label the entry points at (e.g. `LETTRA`, `SPACE`). */
  ptr: string
  line: number
}

/**
 * Parse the CHARACTER DESCRIPTER TABLE `CHRTBL` (defender/MESS0.SRC:441+): each
 * entry is a 4-byte record `FDB $WWHH,<ptr>` (two words), so the reader keys on
 * two-operand FDB rows from the `CHRTBL` label until the `* CHARACTERS` comment
 * ends the table. Interior labels (`N0`, `ALPHA0`) are table rows, not stops.
 * WW is the high byte of the word (the cursor-advance width), HH the low byte.
 */
export function descriptorTable(file: string): Descriptor[] {
  const lines = sourceLines(file)
  const startIdx = lines.findIndex((l) => parseStatement(l, 0)?.label === 'CHRTBL')
  if (startIdx < 0) throw new Error('CHRTBL descriptor table not found')
  const out: Descriptor[] = []
  for (let i = startIdx; i < lines.length; i++) {
    const st = parseStatement(lines[i], i + 1)
    if (st === null) {
      // A `*` comment or blank line after the table's start ends it.
      if (i > startIdx && (lines[i].startsWith('*') || lines[i].trim() === '')) break
      continue
    }
    if (st.op !== 'FDB' || st.operands.length !== 2) {
      if (i > startIdx) break
      continue
    }
    const wh = evalOperand(st.operands[0])
    if (typeof wh !== 'number') continue
    out.push({ width: (wh >> 8) & 0xff, height: wh & 0xff, ptr: st.operands[1], line: i + 1 })
  }
  return out
}

// ─── df2-4 (Han Solo / TEA): the DEFB6 OBJECT-IMAGE picture table ─────────────
// The charset above is one FDB block per glyph keyed by a CHRTBL descriptor. The
// object images (defender/DEFB6.SRC) have a DIFFERENT shape: a PICTURE DESCRIPTOR
// `LABEL FCB W,H` (W = bytes per row, H = rows — the blit-routine names encode the
// pair: UFOP1 6×4 → ON64/OFF64, defender/DEFB6.SRC:1954-1955) immediately followed
// by `FDB <data0>[,<data1>,<ON>,<OFF>]` naming the pixel-data label(s). The pixel
// data at those labels is a run of rows that may be FDB (16-bit words, big-endian —
// the UFO UFOD10, defender/DEFB6.SRC:2122) OR FCB (raw bytes — the smart bomb SBD10,
// defender/DEFB6.SRC:2183), so readImageBytes below accepts BOTH. As in the charset,
// a byte packs two 4-bit palette indices (high nibble the left pixel, low the right);
// one field is exactly W×H bytes. The exact nibble ORDER / screen rotation is df2-6's
// visual-playtest question — this reader owns only the BYTES.

export interface PictureDescriptor {
  /** The picture label, e.g. `UFOP1`. */
  label: string
  /** Bytes per row (FCB high operand); each byte is two horizontal pixels. */
  width: number
  /** Rows (FCB low operand). */
  height: number
  /** The FDB data operands: `[field0, field1?, onRoutine?, offRoutine?]`. */
  dataPtrs: string[]
  line: number
}

/**
 * Read a run of consecutive FCB/FDB pixel rows at `label` into one flat byte stream.
 * FCB operands are raw bytes; FDB operands are 16-bit words expanded BIG-ENDIAN
 * (6809 order, high byte first). Stops at the next LABELLED row, a non-FCB/FDB
 * statement, a comment or a blank — the block ends there. Throws on an unresolved
 * symbol operand: pixel data is always numeric, so a symbol means the reader has
 * walked off the block (never fabricate a byte from a label).
 */
export function readImageBytes(file: string, label: string): number[] {
  const lines = sourceLines(file)
  const defIdx = lines.findIndex((l) => parseStatement(l, 0)?.label === label)
  if (defIdx < 0) throw new Error(`image-data label not found: ${label}`)
  const out: number[] = []
  for (let i = defIdx; i < lines.length; i++) {
    const st = parseStatement(lines[i], i + 1)
    // A LATER labelled row is the next block; a non-FCB/FDB row (or comment/blank) ends it.
    if (i > defIdx && (st === null || (st.op !== 'FDB' && st.op !== 'FCB') || st.label !== null)) break
    if (st === null) continue
    if (st.op === 'FCB') for (const o of st.operands) out.push(evalNumber(o) & 0xff)
    else if (st.op === 'FDB') out.push(...wordsToBytes(st.operands.map((o) => evalNumber(o))))
  }
  return out
}

/**
 * Enumerate DEFB6's picture table: every `LABEL FCB W,H` (W,H > 0) whose next
 * statement is an `FDB` naming pixel-data LABELS (symbols, not numeric data). That
 * shape excludes the process code above and the raw FDB/FCB pixel rows below, so a
 * whole-file scan lands exactly on the object-image descriptors, in source order.
 */
export function pictureTable(file: string): PictureDescriptor[] {
  const lines = sourceLines(file)
  const out: PictureDescriptor[] = []
  for (let i = 0; i < lines.length; i++) {
    const st = parseStatement(lines[i], i + 1)
    if (st === null || st.label === null || st.op !== 'FCB' || st.operands.length !== 2) continue
    const w = evalOperand(st.operands[0])
    const h = evalOperand(st.operands[1])
    if (typeof w !== 'number' || typeof h !== 'number' || w <= 0 || h <= 0) continue
    // The next non-comment/blank statement must be an FDB of data-pointer SYMBOLS.
    let nxt: Statement | null = null
    for (let j = i + 1; j < lines.length; j++) {
      const s = parseStatement(lines[j], j + 1)
      if (s !== null) { nxt = s; break }
    }
    if (nxt === null || nxt.op !== 'FDB' || nxt.operands.length === 0) continue
    if (typeof evalOperand(nxt.operands[0]) === 'number') continue // numeric = pixel data, not a descriptor
    out.push({ label: st.label, width: w, height: h, dataPtrs: nxt.operands, line: i + 1 })
  }
  return out
}
