// scripts/transcribe-objects.mjs
//
// Story df2-4 (GREEN, Yoda) — the object-image transcribe tool. Reads the vendored
// Defender object graphics (reference/original-source/defender/DEFB6.SRC) and the
// explosion/appear engine (SAMEXAP7.SRC), and emits the GENERATED data module
// plugins/defender/src/core/objects-data.ts.
//
// This is Dev's OWN, independent reading of the RASM source — it deliberately does
// NOT import the test-side reader. The object byte gate (tests/objects-gate.test.ts)
// re-derives every byte with THAT separate reader and refuses any mismatch; if this
// tool consumed it, the gate would be tautological (the independence test enforces
// the separation).
//
// FORMAT (verified against DEFB6.SRC): a PICTURE DESCRIPTOR `LABEL FCB W,H` (W bytes
// per row — a byte is two 4-bit pixels — H rows) followed by `FDB <data0>[,<data1>,
// <ON>,<OFF>]` naming the pixel-data label(s). The pixel data at data0 is one field
// of exactly W×H bytes, encoded as FDB words (big-endian, e.g. the UFO UFOD10) OR as
// FCB raw bytes (the smart bomb SBD10) — this reader accepts both. SAMEXAP7.SRC is
// explosion/appear CODE (no pixel table); it is emitted as the single non-raster
// block the render seam refuses to raster.
//
// Usage: node scripts/transcribe-objects.mjs   (writes the generated module)

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const DEFB6 = 'DEFB6.SRC'
const SAMEXAP7 = 'SAMEXAP7.SRC'
const vendored = (f) => join(repoRoot, 'reference', 'original-source', 'defender', f)
const outPath = join(repoRoot, 'plugins', 'defender', 'src', 'core', 'objects-data.ts')

// ─── independent RASM reader ──────────────────────────────────────────────────
const linesOf = (f) => readFileSync(vendored(f), 'utf8').split('\n')

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

/** Is a token a resolvable number (vs a symbol / label reference)? */
function isNum(token) {
  const t = token.trim()
  return t.startsWith('$') || /^[0-9]+$/.test(t)
}

/**
 * Read a run of consecutive FCB/FDB pixel rows at `label` → a flat byte stream.
 * FCB operands are raw bytes; FDB operands are 16-bit words, BIG-ENDIAN (6809).
 * Stops at the next LABELLED row, a non-FCB/FDB statement, a comment or a blank.
 */
function imageBytes(lines, label) {
  const defIdx = lines.findIndex((l) => parse(l)?.label === label)
  if (defIdx < 0) throw new Error(`image-data label not found: ${label}`)
  const out = []
  for (let i = defIdx; i < lines.length; i++) {
    const st = parse(lines[i])
    if (i > defIdx && (st === null || (st.op !== 'FDB' && st.op !== 'FCB') || st.label !== null)) break
    if (st === null) continue
    if (st.op === 'FCB') for (const o of st.operands) out.push(evalNum(o) & 0xff)
    else if (st.op === 'FDB') for (const o of st.operands) { const w = evalNum(o); out.push((w >> 8) & 0xff, w & 0xff) }
  }
  return out
}

/** The effective cell: width×height bytes from the start of the field (throws if short). */
function cellBytes(lines, label, width, height) {
  const block = imageBytes(lines, label)
  const need = width * height
  if (block.length < need) {
    throw new Error(`${label}: field is ${block.length} bytes, cell needs ${need} (${width}x${height})`)
  }
  return block.slice(0, need)
}

/**
 * Enumerate DEFB6's picture table: every `LABEL FCB W,H` (W,H > 0) whose next
 * statement is an `FDB` naming pixel-data LABELS (symbols). Returns descriptors in
 * source order, with the 1-based line of the FCB descriptor.
 */
function pictureTable(lines) {
  const out = []
  for (let i = 0; i < lines.length; i++) {
    const st = parse(lines[i])
    if (st === null || st.label === null || st.op !== 'FCB' || st.operands.length !== 2) continue
    if (!isNum(st.operands[0]) || !isNum(st.operands[1])) continue
    const width = evalNum(st.operands[0])
    const height = evalNum(st.operands[1])
    if (width <= 0 || height <= 0) continue
    let nxt = null
    for (let j = i + 1; j < lines.length; j++) {
      const s = parse(lines[j])
      if (s !== null) { nxt = s; break }
    }
    if (nxt === null || nxt.op !== 'FDB' || nxt.operands.length === 0) continue
    if (isNum(nxt.operands[0])) continue // numeric = pixel data, not a descriptor
    out.push({ label: st.label, width, height, dataPtrs: nxt.operands, line: i + 1 })
  }
  return out
}

/** 1-based line of a defined label, or 0 if absent. */
function lineOf(lines, label) {
  const i = lines.findIndex((l) => parse(l)?.label === label)
  return i < 0 ? 0 : i + 1
}

// ─── build the object list ────────────────────────────────────────────────────
const defb6 = linesOf(DEFB6)
const objects = []
for (const p of pictureTable(defb6)) {
  objects.push({
    name: p.label,
    width: p.width,
    height: p.height,
    encoding: 'raster',
    bytes: cellBytes(defb6, p.dataPtrs[0], p.width, p.height),
    source: { file: DEFB6, label: p.label, line: p.line },
  })
}

// The non-raster block: SAMEXAP7 is the explosion/appear ENGINE (code), no pixels.
// It carries the encoding discriminant's reason to exist — the render seam refuses
// to raster it. `APST` (APPEAR START) is a real anchor label in that block.
const samexap7 = linesOf(SAMEXAP7)
objects.push({
  name: 'SAMEXAP7',
  width: 0,
  height: 0,
  encoding: 'stream',
  bytes: [],
  source: { file: SAMEXAP7, label: 'APST', line: lineOf(samexap7, 'APST') },
})

// ─── emit the generated module ────────────────────────────────────────────────
const record = (o) =>
  `  { name: ${JSON.stringify(o.name)}, width: ${o.width}, height: ${o.height}, ` +
  `encoding: '${o.encoding}', bytes: [${o.bytes.join(', ')}], ` +
  `source: { file: ${JSON.stringify(o.source.file)}, label: ${JSON.stringify(o.source.label)}, line: ${o.source.line} } },`

const body = `// src/core/objects-data.ts
//
// @generated by scripts/transcribe-objects.mjs from
// reference/original-source/defender/DEFB6.SRC (+ SAMEXAP7.SRC) — DO NOT EDIT BY HAND.
// Re-run \`node scripts/transcribe-objects.mjs\` to regenerate.
//
// Defender's object graphics (defender/DEFB6.SRC): one 'raster' record per picture
// descriptor \`LABEL FCB W,H\` — \`bytes\` is the first field's W×H cell (big-endian,
// FDB words or FCB bytes as the ROM stores them). SAMEXAP7 (defender/SAMEXAP7.SRC) is
// the explosion/appear CODE, not a pixel table, so it lands as the single 'stream'
// block the render seam REFUSES to raster (streams-are-not-rasters). Every byte is
// re-derived and refused-on-mismatch by tests/objects-gate.test.ts. PURE data — no
// colour, no clock, no import; a byte packs two 4-bit palette indices.

/** Block encoding discriminant — 'raster' cells are the only kind blitObject may draw. */
export type ObjectEncoding = 'raster' | 'stream'

/** One transcribed object image: raster ROM cell pixels as 4-bit palette indices,
 *  or a non-raster block (empty \`bytes\`) that the render seam refuses to raster. */
export interface ObjectImageData {
  readonly name: string
  /** Bytes per row (a byte is two horizontal pixels); 0 for a non-raster block. */
  readonly width: number
  /** Rows; 0 for a non-raster block. */
  readonly height: number
  readonly encoding: ObjectEncoding
  /** A raster's effective cell: exactly width×height bytes; empty for a non-raster. */
  readonly bytes: readonly number[]
  /** Provenance: the vendored file, the label transcribed, and its 1-based line. */
  readonly source: { readonly file: string; readonly label: string; readonly line: number }
}

export const OBJECTS: readonly ObjectImageData[] = [
${objects.map(record).join('\n')}
]
`

writeFileSync(outPath, body)
const rasters = objects.filter((o) => o.encoding === 'raster').length
console.log(`wrote ${rasters} rasters + ${objects.length - rasters} non-raster → ${outPath.replace(repoRoot + '/', '')}`)
