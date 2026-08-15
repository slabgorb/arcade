// scripts/transcribe-charset.mjs
//
// Story df2-3 (GREEN, Yoda) — the charset transcribe tool. Reads the vendored
// Defender MESS0 charset (reference/original-source/defender/MESS0.SRC) and emits
// the GENERATED data module plugins/defender/src/core/charset-data.ts.
//
// This is Dev's OWN, independent reading of the RASM source — it deliberately does
// NOT import plugins/defender/tests/helpers/defender-source.ts. The charset byte
// gate (tests/charset-gate.test.ts) re-derives every byte with THAT separate reader
// and refuses any mismatch; if this tool consumed it, the gate would be tautological
// (the independence test enforces the separation).
//
// FORMAT (verified against MESS0.SRC): the CHARACTER DESCRIPTER TABLE `CHRTBL`
// (:441) is 4-byte records `FDB $WWHH,<ptr>` — big-endian, so WW is the width byte
// (high) and HH the height byte (low); a glyph's cell is WW×HH bytes at the pointer.
// `SPACE` is `SPACE EQU *` (:490) aliasing the oversized all-zero BLANK block, so the
// reader follows the alias and slices the first WW×HH bytes.
//
// Usage: node scripts/transcribe-charset.mjs   (writes the generated module)

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC_FILE = 'MESS0.SRC'
const srcPath = join(repoRoot, 'reference', 'original-source', 'defender', SRC_FILE)
const outPath = join(repoRoot, 'plugins', 'defender', 'src', 'core', 'charset-data.ts')

// ─── independent RASM reader ──────────────────────────────────────────────────
const lines = readFileSync(srcPath, 'utf8').split('\n')

/** Parse one RASM line → { label, op, operands } or null (comment/blank/label-only). */
function parse(raw) {
  if (raw.length === 0 || raw.startsWith('*')) return null
  const hasLabel = /^\S/.test(raw)
  const fields = raw.split(/\s+/).filter((f) => f.length > 0)
  if (fields.length === 0) return null
  let i = 0
  const label = hasLabel ? fields[i++] : null
  if (i >= fields.length) return null // label-only
  const op = fields[i++]
  const operands = i < fields.length && fields[i].length > 0 ? fields[i].split(',') : []
  return { label, op, operands }
}

/** Evaluate a RASM operand: $hex or BARE DECIMAL. Throws on a symbol (data is numeric). */
function evalNum(token) {
  const t = token.trim()
  if (t.startsWith('$')) return parseInt(t.slice(1), 16)
  if (/^[0-9]+$/.test(t)) return parseInt(t, 10)
  throw new Error(`non-numeric data operand: ${token}`)
}

/** FDB words → big-endian bytes (high byte first, 6809 order). */
function wordsToBytes(words) {
  const out = []
  for (const w of words) out.push((w >> 8) & 0xff, w & 0xff)
  return out
}

/** Read a glyph's data block by CHRTBL label, following an `EQU *` alias. */
function bytesForLabel(label) {
  const defIdx = lines.findIndex((l) => parse(l)?.label === label)
  if (defIdx < 0) throw new Error(`label not found: ${label}`)
  let start = defIdx
  if (parse(lines[defIdx])?.op !== 'FDB') {
    start = lines.findIndex((l, i) => i >= defIdx && parse(l)?.op === 'FDB')
    if (start < 0) throw new Error(`no FDB data after label: ${label}`)
  }
  const out = []
  for (let i = start; i < lines.length; i++) {
    const st = parse(lines[i])
    if (i > start && (st === null || st.op !== 'FDB' || st.label !== null)) break
    if (st && st.op === 'FDB') out.push(...wordsToBytes(st.operands.map(evalNum)))
  }
  return out
}

/** The effective cell: width×height bytes sliced from the (possibly larger) block.
 *  Throws if the block is SHORTER than the declared cell (a real transcription fault) —
 *  slice() would silently truncate, shipping a short-bytes glyph that renders blank. */
function cellBytes(label, width, height) {
  const block = bytesForLabel(label)
  const need = width * height
  if (block.length < need) {
    throw new Error(`${label}: block is ${block.length} bytes, cell needs ${need} (${width}x${height})`)
  }
  return block.slice(0, need)
}

// ─── CHRTBL descriptor table ──────────────────────────────────────────────────
function descriptorTable() {
  const startIdx = lines.findIndex((l) => parse(l)?.label === 'CHRTBL')
  const out = []
  for (let i = startIdx; i < lines.length; i++) {
    const st = parse(lines[i])
    if (st === null) {
      if (i > startIdx && (lines[i].startsWith('*') || lines[i].trim() === '')) break
      continue
    }
    if (st.op !== 'FDB' || st.operands.length !== 2) {
      if (i > startIdx) break
      continue
    }
    const wh = evalNum(st.operands[0])
    out.push({ width: (wh >> 8) & 0xff, height: wh & 0xff, ptr: st.operands[1] })
  }
  return out
}

// ─── ROM label → the ASCII character it renders (from the ROM's own names) ────
function charForLabel(label) {
  if (label === 'SPACE') return ' '
  if (label === 'EXCLPT') return '!'
  if (label === 'COMMA') return ','
  if (label === 'QUESMK') return '?'
  if (label === 'PERIOD') return '.'
  if (label === 'COLON') return ':'
  if (label === 'BLANK') return null // the alphabet's blank cell, not a character
  const num = /^NUMBR([0-9])$/.exec(label)
  if (num) return num[1]
  const alpha = /^LETTR([A-Z])$/.exec(label)
  if (alpha) return alpha[1]
  return null
}

// ─── build the deduplicated glyph list (one per distinct CHRTBL data label) ───
const seen = new Set()
const glyphs = []
for (const d of descriptorTable()) {
  if (seen.has(d.ptr)) continue
  seen.add(d.ptr)
  glyphs.push({
    name: d.ptr,
    char: charForLabel(d.ptr),
    width: d.width,
    height: d.height,
    encoding: 'raster',
    bytes: cellBytes(d.ptr, d.width, d.height),
    source: { file: SRC_FILE, label: d.ptr },
  })
}

// ─── emit the generated module ────────────────────────────────────────────────
const record = (g) =>
  `  { name: ${JSON.stringify(g.name)}, char: ${JSON.stringify(g.char)}, ` +
  `width: ${g.width}, height: ${g.height}, encoding: 'raster', ` +
  `bytes: [${g.bytes.join(', ')}], ` +
  `source: { file: ${JSON.stringify(g.source.file)}, label: ${JSON.stringify(g.source.label)} } },`

const body = `// src/core/charset-data.ts
//
// @generated by scripts/transcribe-charset.mjs from
// reference/original-source/defender/MESS0.SRC — DO NOT EDIT BY HAND.
// Re-run \`node scripts/transcribe-charset.mjs\` to regenerate.
//
// The Defender MESS0 character set (defender/MESS0.SRC:441-649): one record per
// distinct CHRTBL glyph. \`bytes\` is the effective WW×HH cell (big-endian, sliced
// from the source block; SPACE aliases the oversized BLANK). Every byte is
// re-derived and refused-on-mismatch by tests/charset-gate.test.ts. PURE data —
// no colour, no clock, no import; the shell decodes an index to RGBA, not this.

/** Block encoding discriminant. The charset is all 'raster' (ROM cell pixels); the
 *  union keeps blitGlyph's "refuse to raster a non-raster" guard REACHABLE for typed
 *  callers and lets df2-4's object-image blocks carry a non-raster kind (e.g. 'stream'). */
export type GlyphEncoding = 'raster' | 'stream'

/** One transcribed charset glyph: raster ROM cell pixels as 4-bit palette indices. */
export interface GlyphData {
  readonly name: string
  /** The ASCII character this glyph renders, or null (the alphabet blank). */
  readonly char: string | null
  readonly width: number
  readonly height: number
  /** Encoding discriminant — 'raster' cells are the only kind blitGlyph may draw. */
  readonly encoding: GlyphEncoding
  /** The effective cell: exactly width×height bytes, big-endian from the source. */
  readonly bytes: readonly number[]
  /** Provenance: the MESS0.SRC CHRTBL label this cell was transcribed from. */
  readonly source: { readonly file: string; readonly label: string }
}

export const CHARSET: readonly GlyphData[] = [
${glyphs.map(record).join('\n')}
]
`

writeFileSync(outPath, body)
console.log(`wrote ${glyphs.length} glyphs → ${outPath.replace(repoRoot + '/', '')}`)
