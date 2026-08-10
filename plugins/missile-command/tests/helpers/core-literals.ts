// tests/helpers/core-literals.ts
//
// Story mc10-6 (GREEN, Loki) — the LINE-ANCHORED core-literal coverage predicate.
//
// Section 4 of citations.test.ts historically accepted a src/core numeric literal
// whenever ANY committed claim shared its value (`claimedValues.has(v)`). That is
// bare GLOBAL value-membership: an un-cited literal rode in on an unrelated claim's
// number — e.g. `cursor.ts` `LOGICAL_WIDTH = 0x100 // 256` passed only because an
// ICBM-speed-scale claim also decodes to 256, with nothing tying 256 to cursor.ts.
//
// This module hardens coverage to the literal's OWN citation. A literal `v` is
// COVERED iff:
//   • `v` ∈ TRIVIAL (indices/halving/sign), OR
//   • `v` ∈ STRUCTURAL — a documented cabinet/byte-space fact that names no ROM
//     line (value → reason), OR
//   • a committed claim WHOSE VALUE EQUALS `v` is *referenced* in the literal's own
//     context — its `symbol`, its claim `id`, or its `FILE.MAC:NNN` / bare `:NNN`
//     source cite appears in the literal's line + doc-block + the file header.
//
// The third arm is the anchor: it demands the claim be named where the literal
// lives, so a coincidental value collision from an unrelated claim (whose symbol
// appears nowhere near the literal) no longer counts. The mc citation discipline
// already writes exactly these anchors — the file "SOURCE OF TRUTH" header lists
// each constant as `SYMBOL = VALUE  FILE.MAC:NNN  claim MC-XXX`, and inline table
// rows carry `// SYMBOL :NNN` — so genuinely-cited literals stay green while the
// value-collision loophole closes.
//
// Literal extraction strips `//`, single- AND multi-line `/* */` / `/** */` blocks
// and string bodies, so prose numbers (story ids like `mc5-3`, "6 cities") in
// JSDoc do not leak in as fake literals (the mc citations-scanner-JSDoc-leak trap).

import { type Claim, claimCovers } from './claims.js'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/** Indices, halving, sign — not game constants. Mirrors citations.test.ts. */
export const TRIVIAL: ReadonlySet<number> = new Set([0, 1, 2, -1])

/**
 * Cabinet / byte-space facts that legitimately name NO ROM line, so no committed
 * claim can (or should) back them. Each carries a human reason — an exemption is
 * a documented decision, never a silent allowlist. Keep this SMALL: the default
 * answer for a game constant is a citation + claim, not an entry here.
 */
export const STRUCTURAL: ReadonlyMap<number, string> = new Map<number, string>([
  [
    256,
    '0x100 — cursor.ts LOGICAL_WIDTH: the logical field width is the 2^8 byte-space ' +
      'size (every H constant lives in 0x00..0xFF). STRUCTURAL, not a ROM table entry — ' +
      'unlike LOGICAL_HEIGHT it names no W3COMN line because none exists.',
  ],
  [
    255,
    '0xff — the 8-bit byte mask (`& 0xff`): modsnd.ts wraps a POKEY register value ' +
      'to a single byte. Byte-space arithmetic, not a ROM table entry.',
  ],
])

const basename = (p: string): string => p.split('/').pop() ?? p

/** A source citation anchor as it appears in prose: `FILE.MAC:NNN` (opt. `.MAC`,
 *  opt. `-M` range) or a bare `:NNN` line ref (the field.ts `// SYM :123` form). */
const ANCHOR_RE = /([A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z0-9]+)?):(\d+)(?:-(\d+))?|(?<![\w])(?::(\d+)\b)/g

interface Anchor {
  file: string | null
  start: number
  end: number
}

/** Parse every citation anchor out of a chunk of comment text. */
export function parseAnchors(text: string): Anchor[] {
  const out: Anchor[] = []
  for (const m of text.matchAll(ANCHOR_RE)) {
    if (m[1]) {
      const file = m[1].includes('.') ? m[1] : `${m[1]}.MAC`
      out.push({ file, start: Number(m[2]), end: Number(m[3] ?? m[2]) })
    } else if (m[4]) {
      out.push({ file: null, start: Number(m[4]), end: Number(m[4]) })
    }
  }
  return out
}

/** Does `docText` reference this specific claim — by symbol, id, or source cite? */
function referencesClaim(docText: string, c: Claim): boolean {
  const hay = docText.toLowerCase()
  if (c.symbol && hay.includes(c.symbol.toLowerCase())) return true
  if (c.id && hay.includes(c.id.toLowerCase())) return true
  const file = basename(c.source.file)
  const line = c.source.line
  // full `FILE.MAC:NNN` cite, or the extensionless `FILE:NNN` the headers also use
  if (hay.includes(`${file.toLowerCase()}:${line}`)) return true
  const stem = file.replace(/\.[^.]+$/, '').toLowerCase()
  if (hay.includes(`${stem}:${line}`)) return true
  // a bare `:NNN` line ref that a claim at that physical line covers
  return parseAnchors(docText).some((a) => a.file === null && claimCovers([c], file, a.start, a.end))
}

/**
 * Is a core numeric literal of `value`, whose surrounding source context is
 * `docText` (its own line + doc-block + file header), covered by a line-anchored
 * citation — NOT by bare global value-membership?
 */
export function literalCovered(claims: readonly Claim[], docText: string, value: number): boolean {
  if (TRIVIAL.has(value) || STRUCTURAL.has(value)) return true
  const matching = claims.filter((c) => Number(c.value) === value)
  if (matching.some((c) => referencesClaim(docText, c))) return true
  // Self-documenting: the literal's OWN line (the first line of docText) carries a
  // source citation — `FILE.MAC:NNN` or a bare `:NNN` line ref. This is the narrow
  // ruling's "carries a real inline citation counts as anchored": the sound-table
  // byte rows (`[…], // EX2 W3SOUN:159`) name their own ROM line even though W3SOUN
  // carries no per-byte claim. Scoped to the OWN line ONLY — a citation in the
  // preceding block or the file header must NOT vouch for a bare magic number
  // (that is exactly the `LOGICAL_WIDTH = 0x100` collision this story kills).
  const ownLine = docText.split('\n', 1)[0]
  return parseAnchors(ownLine).length > 0
}

/** One extracted core literal: its 1-based line, decoded value, and the source
 *  context a coverage decision reads (own line + preceding comment block + header). */
interface CoreLiteral {
  file: string
  line: number
  value: number
  docText: string
}

/** The file's leading contiguous comment block (the "SOURCE OF TRUTH" header). */
function headerBlock(lines: readonly string[]): string {
  const head: string[] = []
  let inBlock = false
  for (const raw of lines) {
    const t = raw.trim()
    if (inBlock) {
      head.push(raw)
      if (t.includes('*/')) inBlock = false
      continue
    }
    if (t === '') {
      head.push(raw)
      continue
    }
    if (t.startsWith('//')) {
      head.push(raw)
      continue
    }
    if (t.startsWith('/*')) {
      head.push(raw)
      if (!t.includes('*/')) inBlock = true
      continue
    }
    break
  }
  return head.join('\n')
}

/** The contiguous comment/blank block immediately preceding line index `i`. */
function precedingBlock(lines: readonly string[], i: number): string {
  const block: string[] = []
  for (let k = i - 1; k >= 0; k--) {
    const t = lines[k].trim()
    if (t === '' || t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.endsWith('*/')) {
      block.unshift(lines[k])
      // stop at a blank line ONLY if we have not yet reached a comment (keep the
      // JSDoc block attached across its own internal lines)
      if (t === '' && block.length > 1) break
      continue
    }
    break
  }
  return block.join('\n')
}

/**
 * Extract every game-constant numeric literal from `src`, stripping `//`, block
 * `/* *​/` and `/** *​/` comments and string bodies so prose numbers never leak in.
 * Each literal carries the `docText` a coverage decision reads.
 */
export function extractCoreLiterals(src: string, file: string): CoreLiteral[] {
  const lines = src.split('\n')
  const header = headerBlock(lines)
  const out: CoreLiteral[] = []
  let inBlock = false
  for (let i = 0; i < lines.length; i++) {
    let s = lines[i]
    if (inBlock) {
      const end = s.indexOf('*/')
      if (end === -1) continue
      s = s.slice(end + 2)
      inBlock = false
    }
    let code = ''
    for (let k = 0; k < s.length; k++) {
      if (s.startsWith('//', k)) break
      if (s.startsWith('/*', k)) {
        const end = s.indexOf('*/', k + 2)
        if (end === -1) {
          inBlock = true
          break
        }
        k = end + 1
        continue
      }
      const ch = s[k]
      if (ch === '"' || ch === "'" || ch === '`') {
        k++
        while (k < s.length && s[k] !== ch) {
          if (s[k] === '\\') k++
          k++
        }
        continue
      }
      code += ch
    }
    const nums = [...code.matchAll(/(?<![\w.])(0x[0-9a-fA-F]+|\d+(?:\.\d+)?)/g)]
      .map((m) => Number(m[1]))
      .filter((v) => Number.isFinite(v) && !TRIVIAL.has(v))
    if (nums.length === 0) continue
    const docText = [lines[i], precedingBlock(lines, i), header].join('\n')
    for (const value of nums) out.push({ file, line: i + 1, value, docText })
  }
  return out
}

/**
 * The AC3 real-tree gate: every un-cited value-collision literal in `coreDir`, as
 * `file:line=value`. Empty means every core literal is line-anchored or exempt.
 */
export function uncitedCoreLiterals(claims: readonly Claim[], coreDir: string): string[] {
  if (!existsSync(coreDir)) return []
  const files = readdirSync(coreDir).filter((f) => f.endsWith('.ts'))
  const uncited: string[] = []
  for (const file of files) {
    const src = readFileSync(join(coreDir, file), 'utf8')
    for (const lit of extractCoreLiterals(src, file)) {
      if (!literalCovered(claims, lit.docText, lit.value)) {
        uncited.push(`${file}:${lit.line}=${lit.value}`)
      }
    }
  }
  return uncited
}
