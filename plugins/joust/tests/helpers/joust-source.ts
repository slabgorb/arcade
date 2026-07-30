// tests/helpers/joust-source.ts
//
// Story jt1-3 — TEA-authored INDEPENDENT reader for the vendored 1982 Williams
// assembler source. This is test infrastructure, not implementation.
//
// ─── WHY THIS EXISTS: THE TAUTOLOGY TRAP ─────────────────────────────────────
// AC-1 asks for "a test that re-derives pictures.ts from the vendored
// JOUSTI.SRC byte-for-byte". There is a way to satisfy that sentence while
// proving nothing at all: let Dev write a transcription tool, then have the
// test re-run that same tool and diff. The tool always agrees with itself, so
// the gate would only prove determinism — never correctness. That is precisely
// the rb4/cp1 failure the citation epic exists to prevent: a derivation that
// re-bakes its own misreadings and then confirms them.
//
// So the verification path must be INDEPENDENT of the generation path. This
// reader is the second entry in a double-entry system: TEA reads the source one
// way, Dev transcribes it another, and the gate is that the two agree. If they
// disagree, one of us is wrong and a human looks.
//
// THEREFORE — a rule the suite enforces mechanically (see pictures-gate.test.ts,
// "the two derivations stay independent"): nothing under src/ or tools/ may
// import this helper. The moment Dev's transcription consumes TEA's reader, the
// two entries collapse into one and the gate becomes decorative while still
// showing green.
//
// ─── WHAT THE SOURCE ACTUALLY LOOKS LIKE (verified, not assumed) ─────────────
// Motorola 6809 syntax, one statement per line:
//
//     LABEL<tab>OP<tab>OPERANDS<tab>COMMENT
//
//   • Radix: bare DECIMAL, `$` hex, `@` octal, `%` binary. Operators: `+`
//     (addition) and `!X` (XOR).
//   • The operand FIELD ENDS AT THE FIRST WHITESPACE. Everything after is a
//     comment — even when it looks like more operands. COLOR1 exploits this
//     with two operand columns (`FCB @160 @071`), where only the FIRST is
//     assembled and the second is a dead alternate. A parser that split on
//     whitespace would silently read the wrong palette.
//   • `*` in column 1 is a full-line comment.
//   • Pixel data appears as BOTH `FCB` (bytes) and `FDB` (words). Several cliff
//     and transporter sources are FDB-only, so a reader that assumes FCB drops
//     them entirely.
//   • Labels stack: several labels may share one address on consecutive lines
//     (CWNG1R/CWNG2R/CWNG3R all name one collision table).
//   • Indentation is mostly tabs but sometimes a single space.

import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

/** The vendored tree root — at the MONOREPO root, TWO levels above plugins/joust. */
export const vendoredRoot: string =
  process.env.JOUST_SOURCE_DIR ?? join(repoRoot, '..', '..', 'reference', 'williams-source', 'joust')
export const vendoredAvailable: boolean = existsSync(vendoredRoot)

/** Assembler symbols this reader resolves. Both are defined in JOUSTI.SRC. */
export const SYMBOLS: Readonly<Record<string, number>> = Object.freeze({
  COFF: 0x0200, // JOUSTI.SRC:7  — collision-span bias
  DMAFIX: 0x0404, // JOUSTI.SRC:8 — pre-XOR applied to every w/h word
})

/**
 * Labels that are NOT labels: the source carries comments that wrap onto the
 * following line WITHOUT a `*` continuation marker, leaving comment text
 * sitting in column 1 where a label goes.
 *
 *   JOUSTI.SRC:65  CCLF1L  FDB  10+COFF,35+32+COFF   CLIF1L STARTS -9 TO 33 PIXEL (INCLUDING
 *   JOUSTI.SRC:66  ZERO)
 *
 * `ZERO)` and `CREEN` (the tail of "OFF SCREEN" at :90) are the only two in
 * JOUSTI.SRC. They are not cosmetic: each one SPLITS the collision table it
 * interrupts, so a reader that honours them truncates CCLF1L's 8-row span table
 * to 1 row and silently attributes the other 7 to an invented symbol. The
 * pictures-gate suite pins this set so a transcription cannot quietly grow it.
 */
export const PHANTOM_LABELS: readonly string[] = Object.freeze(['ZERO)', 'CREEN'])

export interface Statement {
  label: string // '' when the line is unlabelled
  op: 'FCB' | 'FDB'
  operands: string[] // raw operand tokens, comment already stripped
  line: number // 1-based
}

/** Read a vendored file's lines. Throws if the tree is absent — call from inside a test. */
export function sourceLines(file: string): string[] {
  const p = join(vendoredRoot, file)
  if (!existsSync(p)) throw new Error(`vendored source ${file} not available at ${p}`)
  return readFileSync(p, 'utf8').split('\n')
}

/**
 * Parse one line into an FCB/FDB statement, or null for comments, blanks,
 * label-only lines, and every other opcode.
 *
 * The `(\S+)` operand capture is the whole point: it stops at the first
 * whitespace, which is exactly where the assembler's operand field ends.
 */
export function parseStatement(line: string | undefined, lineNo: number): Statement | null {
  if (line === undefined || line.startsWith('*') || line.trim() === '') return null
  const m = line.match(/^(\S*)\s+(FCB|FDB)\s+(\S+)/)
  if (!m) return null
  return { label: m[1], op: m[2] as 'FCB' | 'FDB', operands: m[3].split(','), line: lineNo }
}

/** Is this line a bare label (or a phantom comment-wrap masquerading as one)? */
export function isLabelOnly(line: string | undefined): boolean {
  return (
    line !== undefined &&
    !line.startsWith('*') &&
    line.trim() !== '' &&
    /^\S+$/.test(line) &&
    parseStatement(line, 0) === null
  )
}

/**
 * Evaluate one operand token to a number, or return its symbol name when the
 * token is an unresolved label reference (`CSRC5`, `CCLF1L` — real addresses
 * that need a full assembler pass we deliberately do not perform).
 *
 * RADIX IS NEVER GUESSED: the sigil decides. A bare token of digits is DECIMAL,
 * so `10` is ten — not sixteen. This is the trap that has bitten the project
 * before, and the reason `verbatim` in the claims gate is compared and never
 * parsed.
 */
export function evalOperand(token: string): number | { symbol: string } {
  const xor = token.split('!X')
  if (xor.length === 2) {
    const a = evalOperand(xor[0])
    const b = evalOperand(xor[1])
    if (typeof a !== 'number' || typeof b !== 'number') return { symbol: token }
    return (a ^ b) & 0xffff
  }
  if (token.includes('+')) {
    let sum = 0
    for (const part of token.split('+')) {
      const v = evalOperand(part)
      if (typeof v !== 'number') return { symbol: token }
      sum += v
    }
    return sum & 0xffff
  }
  if (token.startsWith('$')) return parseInt(token.slice(1), 16)
  if (token.startsWith('@')) return parseInt(token.slice(1), 8)
  if (token.startsWith('%')) return parseInt(token.slice(1), 2)
  if (/^\d+$/.test(token)) return parseInt(token, 10) // DECIMAL — no sigil means ten, not sixteen
  // NEGATIVE literals in any radix. `ELEFT EQU -10` (JOUSTRV4.SRC:38) and
  // `FDB -$0200` (the FLYX ladder, :7150) are both literals the assembler
  // accepts; without this the reader classifies them as unresolved symbols and
  // evalNumber throws, so neither the arena bounds nor the flight ladder could
  // be re-derived at all. Added in jt1-4 for decimal, widened in jt1-5 to
  // cover $/@/% after `-$0200` hit the same wall. A pure capability gap — no
  // existing token changes meaning, since nothing else starts with `-`.
  if (token.startsWith('-') && token.length > 1) {
    const magnitude = evalOperand(token.slice(1))
    if (typeof magnitude === 'number') return -magnitude
  }
  if (token in SYMBOLS) return SYMBOLS[token]
  return { symbol: token }
}

/** evalOperand, but the caller asserts the token must be numeric. */
export function evalNumber(token: string): number {
  const v = evalOperand(token)
  if (typeof v !== 'number') throw new Error(`operand ${token} is a symbol, not a number`)
  // A malformed literal (e.g. a bare `-$`) must throw, not flow: this reader is
  // the independent verification path for the source gates, and a silent NaN
  // here vacuously passes comparisons (jt1-5 review reversal, non-blocking tail).
  if (Number.isNaN(v)) throw new Error(`operand ${token} evaluated to NaN`)
  return v
}

/**
 * Flatten an inclusive line range into bytes. FCB contributes one byte per
 * operand, FDB two (big-endian, as the 6809 stores them). Comment and blank
 * lines inside the range are skipped; a non-numeric operand throws, because a
 * pixel row cannot legitimately contain a symbol.
 */
export function bytesInRange(file: string, startLine: number, endLine: number): number[] {
  const lines = sourceLines(file)
  const out: number[] = []
  for (let n = startLine; n <= endLine; n++) {
    const st = parseStatement(lines[n - 1], n)
    if (!st) continue
    for (const tok of st.operands) {
      const v = evalNumber(tok)
      if (st.op === 'FCB') out.push(v & 0xff)
      else out.push((v >> 8) & 0xff, v & 0xff)
    }
  }
  return out
}

/** Words (not bytes) in an inclusive range — for collision tables and records. */
export function wordsInRange(file: string, startLine: number, endLine: number): number[] {
  const lines = sourceLines(file)
  const out: number[] = []
  for (let n = startLine; n <= endLine; n++) {
    const st = parseStatement(lines[n - 1], n)
    if (!st || st.op !== 'FDB') continue
    for (const tok of st.operands) out.push(evalNumber(tok))
  }
  return out
}

/**
 * Find bare label-only tokens that nothing else in the file ever references.
 *
 * This is how a phantom is identified WITHOUT guessing from shape. The obvious
 * heuristic — "it doesn't look like a symbol" — catches `ZERO)` (the paren
 * gives it away) but misses `CREEN`, which is a perfectly well-formed
 * uppercase identifier. The distinguishing property is semantic instead: a real
 * label is pointed at from somewhere (a pointer table, a record, an
 * instruction), while comment debris is referenced by nothing. Across
 * JOUSTI.SRC's 27 bare label lines this isolates exactly the two phantoms.
 */
export function unreferencedBareLabels(file: string): Array<{ token: string; line: number }> {
  const lines = sourceLines(file)
  const bare: Array<{ token: string; line: number }> = []
  lines.forEach((l, i) => {
    if (isLabelOnly(l)) bare.push({ token: l.trim(), line: i + 1 })
  })
  return bare.filter((b) => {
    const esc = b.token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`(^|[\\s,])${esc}(?![A-Z0-9$_])`)
    // Skip the defining line itself, and comment lines (prose mentions a lot).
    return !lines.some((l, i) => i + 1 !== b.line && !l.startsWith('*') && re.test(l))
  })
}

/** Decode Motorola S-Records (the `*.PIC` artist artefacts) to an address→byte map. */
export function decodeSRecords(text: string): Map<number, number> {
  const mem = new Map<number, number>()
  for (const line of text.split('\n')) {
    if (!line.startsWith('S1')) continue
    const count = parseInt(line.slice(2, 4), 16)
    const addr = parseInt(line.slice(4, 8), 16)
    const data = line.slice(8, 8 + (count - 3) * 2)
    for (let i = 0; i < data.length; i += 2) mem.set(addr + i / 2, parseInt(data.slice(i, i + 2), 16))
  }
  return mem
}

/** Does `needle` appear as a contiguous byte run inside an S-Record image? */
export function sRecordContains(mem: Map<number, number>, needle: readonly number[]): boolean {
  const addrs = [...mem.keys()].sort((a, b) => a - b)
  const img = addrs.map((a) => mem.get(a)!)
  outer: for (let i = 0; i + needle.length <= img.length; i++) {
    for (let j = 0; j < needle.length; j++) if (img[i + j] !== needle[j]) continue outer
    return true
  }
  return false
}
