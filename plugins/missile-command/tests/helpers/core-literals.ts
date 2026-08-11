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
// This module hardens coverage to the literal's OWN citation. A core literal `v`
// is COVERED iff (mc10-6 round 3 — the "close the class" rule, user-ruled 2026-08-11):
//   • `v` ∈ TRIVIAL (indices/halving/sign), OR
//   • `v` ∈ STRUCTURAL — a documented cabinet/byte-space fact that names no ROM
//     line (value → reason), OR
//   • the literal's OWN line self-documents an inline `FILE.MAC:NNN` / bare `:NNN`
//     cite — this keeps the sound-table / city / base byte rows green without a
//     per-byte claim, OR
//   • a committed claim WHOSE VALUE EQUALS `v` is named by a STRUCTURED anchor in
//     the literal's LOCAL context — its distinctive claim `id` (MC-…/SOUND-…, matched
//     as a WHOLE TOKEN, R2-B) or its `FILE.MAC:NNN` source cite. LOCAL means the own
//     line + immediately-preceding comment block ONLY: the shared file header is NOT
//     searched, so an unrelated same-file constant's header cite cannot vouch for a
//     bare literal (Reviewer round-2 R2-A — the wave.ts:61 WICSPL-via-ICBWAV leak).
//     NOT the claim's `symbol` as free prose either: ROM symbols like TOP/MAX/MIN are
//     English words that collide with narrative prose (Reviewer round-1 R1), OR
//   • a value-matched claim's `symbol` EQUALS (normalized) the literal's ENCLOSING
//     declaration symbol (nearest preceding `(export )?const|let|function|type IDENT`).
//     This is the WICSPL===WICSPL arm: a real `WICSPL` claim backs a `WICSPL` table
//     entry that carries no per-line inline cite. Equality only — a short ROM symbol
//     must not coincidentally match a longer enclosing name.
//
// A bare value collision (the retired `claimedValues.has(v)`), a bare-symbol prose
// coincidence, and an unrelated header cite are ALL non-coverage. The mc citation
// discipline already writes these structured anchors — inline rows carry
// `// … FILE.MAC:NNN`, and a table's entries share its enclosing symbol.
//
// Literal extraction strips `//`, single- AND multi-line `/* */` / `/** */` blocks
// and string bodies, so prose numbers (story ids like `mc5-3`, "6 cities") in
// JSDoc do not leak in as fake literals (the mc citations-scanner-JSDoc-leak trap).

import { type Claim } from './claims.js'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/** Indices, halving, sign — not game constants. The sole definition (it replaced
 *  the former local copy in citations.test.ts, which now delegates here). */
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

/** Lowercase + strip every non-alphanumeric — so an enclosing TS declaration name
 *  (`MIRV_LO`) and a ROM claim symbol (`MIRVLO`) compare on their letters/digits only. */
const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '')

/** Escape a string for literal use inside a RegExp. */
const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

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

/**
 * Does `docText` name this specific claim by a STRUCTURED anchor — its distinctive
 * claim `id` (MC-…/SOUND-…), or its `FILE.MAC:NNN` source cite?
 *
 * It deliberately does NOT match the claim's `symbol`. ROM assembler symbols are
 * frequently ordinary English words (TOP/BOTTOM/MAX/MIN/STEP/COUNT…), so a bare
 * symbol substring over prose — especially the shared file header — admits
 * *coincidental* coverage: an un-cited literal "covered" only because a claim's
 * symbol happens to appear as an English word nearby. That is the exact bug class
 * this story retires (Reviewer round-1 R1). A claim id and a `FILE.MAC:NNN` cite
 * are structured tokens that cannot collide with narrative prose, so they are the
 * only two positive anchors.
 */
function referencesClaim(docText: string, c: Claim): boolean {
  const hay = docText.toLowerCase()
  // Distinctive claim id — never an English word. Matched as a WHOLE TOKEN, not a
  // bare substring: `MC-WICSPL-6` must NOT be satisfied by a doc naming only the
  // longer real id `MC-WICSPL-64` (Reviewer round-2 R2-B). The boundaries reject an
  // adjacent alphanumeric on either side (hyphens inside the id are literal).
  if (c.id) {
    const idRe = new RegExp(`(?<![a-z0-9])${escapeRe(c.id.toLowerCase())}(?![a-z0-9])`)
    if (idRe.test(hay)) return true
  }
  // The claim's own `FILE.MAC:NNN` cite (with or without the extension, as the mc
  // "SOURCE OF TRUTH" headers write it).
  const file = basename(c.source.file).toLowerCase()
  const line = c.source.line
  if (hay.includes(`${file}:${line}`)) return true
  const stem = file.replace(/\.[^.]+$/, '')
  return hay.includes(`${stem}:${line}`)
}

/**
 * Is a core numeric literal of `value`, whose surrounding source context is
 * `docText` (its own line + doc-block + file header), covered by a line-anchored
 * citation — NOT by bare global value-membership?
 */
export function literalCovered(
  claims: readonly Claim[],
  docText: string,
  value: number,
  enclosingSymbol = '',
): boolean {
  if (TRIVIAL.has(value) || STRUCTURAL.has(value)) return true
  const matching = claims.filter((c) => Number(c.value) === value)
  // LOCAL structured anchor: a value-matched claim named by its id / FILE.MAC:NNN cite
  // in `docText` (own line + preceding block ONLY — the file header is NOT in docText,
  // so an unrelated same-file constant's header cite cannot vouch, Reviewer round-2 R2-A).
  if (matching.some((c) => referencesClaim(docText, c))) return true
  // Enclosing-symbol arm: a value-matched claim whose `symbol` EQUALS (normalized) the
  // literal's enclosing declaration symbol. This is how a real `WICSPL` claim backs a
  // `WICSPL` table entry that carries no per-line inline cite — WICSPL===WICSPL. Equality
  // only (not substring): a short ROM symbol must not coincidentally match a longer name.
  const encl = norm(enclosingSymbol)
  if (encl && matching.some((c) => norm(c.symbol) === encl)) return true
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

/** One extracted core literal: its 1-based line, decoded value, the LOCAL source
 *  context a coverage decision reads (own line + immediately-preceding comment block —
 *  NOT the file header), and the literal's enclosing declaration symbol. */
interface CoreLiteral {
  file: string
  line: number
  value: number
  docText: string
  enclosingSymbol: string
}

/** The nearest preceding `(export )?const|let|function|type IDENT` on a raw line —
 *  the enclosing declaration symbol a literal on/after this line belongs to. */
const DECL_RE = /^\s*(?:export\s+)?(?:const|let|function|type)\s+([A-Za-z_$][\w$]*)/

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
  const out: CoreLiteral[] = []
  let inBlock = false
  let enclosingSymbol = ''
  for (let i = 0; i < lines.length; i++) {
    // Track the enclosing declaration BEFORE emitting this line's literals, so a value
    // on the declaration line itself (`const WICSPL = [0x10]`) sees `WICSPL`.
    const decl = DECL_RE.exec(lines[i])
    if (decl) enclosingSymbol = decl[1]
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
    // LOCAL context ONLY — own line + immediately-preceding comment block. The file
    // header is deliberately excluded: an unrelated same-file constant's header cite
    // must not vouch for a bare literal (Reviewer round-2 R2-A, the wave.ts:61 leak).
    const docText = [lines[i], precedingBlock(lines, i)].join('\n')
    for (const value of nums) out.push({ file, line: i + 1, value, docText, enclosingSymbol })
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
      if (!literalCovered(claims, lit.docText, lit.value, lit.enclosingSymbol)) {
        uncited.push(`${file}:${lit.line}=${lit.value}`)
      }
    }
  }
  return uncited
}
