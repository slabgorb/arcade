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
//     line + the enclosing declaration statement's attached leading comment block ONLY:
//     the shared file preamble (header) is excluded BY POSITION, so an unrelated same-file
//     constant's header cite cannot vouch for a bare literal (Reviewer round-2 R2-A — the
//     wave.ts:61 WICSPL-via-ICBWAV leak).
//     NOT the claim's `symbol` as free prose either: ROM symbols like TOP/MAX/MIN are
//     English words that collide with narrative prose (Reviewer round-1 R1), OR
//   • a value-matched claim's `symbol` EQUALS (normalized) the literal's ENCLOSING
//     declaration symbol — the name of the nearest `const`/`let` `VariableDeclaration`
//     (or `type` alias, R5-D) ancestor in the AST; crossing any function/method/arrow/
//     accessor boundary first yields NO enclosing symbol (a function-body literal is
//     executable code, not a named constant — Reviewer round-4 R4-C). This is the
//     WICSPL===WICSPL arm: a real `WICSPL` claim backs a `WICSPL` table entry that
//     carries no per-line inline cite. Equality only — a short ROM symbol must not
//     coincidentally match a longer enclosing name.
//
// A bare value collision (the retired `claimedValues.has(v)`), a bare-symbol prose
// coincidence, and an unrelated header cite are ALL non-coverage. The mc citation
// discipline already writes these structured anchors — inline rows carry
// `// … FILE.MAC:NNN`, and a table's entries share its enclosing symbol.
//
// Literal extraction PARSES the source (TypeScript compiler API) and visits real
// `NumericLiteral` nodes, so prose numbers (story ids like `mc5-3`, "6 cities") in
// comments or strings are never nodes and cannot leak in as fake literals (the mc
// citations-scanner-JSDoc-leak trap) — and the LOCAL comment/enclosing scope is read
// from syntax, not a line heuristic, so header/nesting/template edge shapes cannot leak.

import { type Claim } from './claims.js'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import * as ts from 'typescript'

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
 * only two positive anchors THIS function recognises. (Symbol matching is not banned
 * module-wide: `literalCovered` has a SEPARATE enclosing-symbol arm that matches
 * `claim.symbol` by exact equality against the literal's enclosing *declaration* —
 * never as free prose. See its doc below.)
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
 * Is a core numeric literal of `value`, whose LOCAL source context is `docText` (its own
 * line + the enclosing declaration statement's attached leading comment block — the file
 * preamble is EXCLUDED BY POSITION, Reviewer round-2 R2-A / round-5 R5-A) and whose
 * enclosing declaration symbol is `enclosingSymbol`, covered by a line-anchored citation —
 * NOT by bare global value-membership, a bare-symbol prose coincidence, or an unrelated
 * header cite?
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

/** One extracted core literal: its 1-based line, decoded (signed) value, the LOCAL source
 *  context a coverage decision reads (own line + the enclosing statement's attached leading
 *  comments, MINUS the file preamble), and the literal's enclosing declaration symbol. */
interface CoreLiteral {
  file: string
  line: number
  value: number
  docText: string
  enclosingSymbol: string
}

/** A function boundary — a literal inside one of these bodies is executable code, not a
 *  named constant, so the enclosing-symbol walk stops here (never inherits the enclosing
 *  function's name; Reviewer round-4 R4-C). */
const isFunctionBoundary = (n: ts.Node): boolean =>
  ts.isFunctionDeclaration(n) ||
  ts.isFunctionExpression(n) ||
  ts.isArrowFunction(n) ||
  ts.isMethodDeclaration(n) ||
  ts.isConstructorDeclaration(n) ||
  ts.isGetAccessorDeclaration(n) ||
  ts.isSetAccessorDeclaration(n)

/** The literal's enclosing declaration symbol: the name of the nearest ancestor
 *  `VariableDeclaration` (or `type` alias — Reviewer round-5 R5-D) whose body contains it —
 *  unless a function boundary is crossed first (then the literal is function-body code, with
 *  no enclosing constant). */
function enclosingSymbolOf(node: ts.Node): string {
  for (let n = node.parent; n && !ts.isSourceFile(n); n = n.parent) {
    if (isFunctionBoundary(n)) return ''
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name)) return n.name.text
    if (ts.isTypeAliasDeclaration(n)) return n.name.text
  }
  return ''
}

/** The literal's enclosing statement — where its LEADING comments are attached. */
function enclosingStatement(node: ts.Node): ts.Node {
  let n: ts.Node = node
  while (n.parent && !ts.isSourceFile(n.parent) && !ts.isStatement(n)) n = n.parent
  return n
}

/**
 * Extract every game-constant numeric literal from `src` by PARSING it (TypeScript
 * compiler API) instead of scanning lines — so the two syntactic questions a coverage
 * decision needs are answered from real syntax, never a line heuristic (Reviewer round-4:
 * the line-based lexer kept leaking on sibling shapes; user ruled this AST rewrite):
 *
 *   • the literal's LOCAL comment context is its own source line + the LEADING comments
 *     of its enclosing statement (`ts.getLeadingCommentRanges`), MINUS the file preamble —
 *     the top-anchored comment run of the first statement, excluded BY POSITION so the
 *     shared header cannot vouch even with NO blank line above the first declaration
 *     (round-5 R5-A). The header is never a leading comment of a LATER statement, and a
 *     trailing inline comment on a prior statement is that statement's trailing comment —
 *     so round-2 R2-A and round-4 R4-A are structurally impossible.
 *   • the literal's ENCLOSING declaration symbol comes from the AST parent-chain
 *     (`enclosingSymbolOf`), bounded exactly by syntax — a stale-carry across statements
 *     (round-3 R3-B), a bracket-depth desync from a multi-line template (round-4 R4-B),
 *     and a function-body literal inheriting the function name (round-4 R4-C) cannot occur.
 *
 * A BigInt literal (`100n`) is surfaced with its numeric part, and a unary-minus parent
 * signs the value, so neither a bigint nor a negative game constant escapes or is decided
 * against the wrong value (round-5 R5-B / R5-C). Numbers inside comments and strings are
 * not literal nodes, so prose numbers (JSDoc counts, story ids) never leak in.
 */
export function extractCoreLiterals(src: string, file: string): CoreLiteral[] {
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, /* setParentNodes */ true, ts.ScriptKind.TS)
  const fullText = sf.getFullText()
  const srcLines = src.split('\n')
  const out: CoreLiteral[] = []

  // The file preamble — the top-anchored leading-comment run of the FIRST statement, from
  // file position 0. It is the shared file header BY POSITION, so it is never a literal's
  // local context even when NO blank line separates it from the first declaration (Reviewer
  // round-5 R5-A: the header exclusion is STRUCTURAL, not a blank-line heuristic). The run
  // ends at the first blank-line gap: a comment past that gap sits against a declaration and
  // is local, not header.
  const preamblePositions = new Set<number>()
  const firstStmt = sf.statements[0]
  if (firstStmt) {
    const preambleRanges = ts.getLeadingCommentRanges(fullText, firstStmt.getFullStart()) ?? []
    let prevEnd = -1
    for (const r of preambleRanges) {
      if (prevEnd >= 0 && (fullText.slice(prevEnd, r.pos).match(/\n/g) ?? []).length >= 2) break
      preamblePositions.add(r.pos)
      prevEnd = r.end
    }
  }

  const visit = (node: ts.Node): void => {
    // A game constant is a NumericLiteral or a BigIntLiteral (`100n`); bigint is surfaced
    // with its numeric part so an un-cited BigInt constant cannot sail through the gate
    // invisibly (Reviewer round-5 R5-B). Its sign comes from a unary-minus PARENT — `-5000`
    // is `PrefixUnaryExpression(-, NumericLiteral)`, so the literal node alone reads unsigned
    // and coverage would decide against the wrong value (R5-C).
    const numericText = ts.isNumericLiteral(node)
      ? node.getText(sf)
      : ts.isBigIntLiteral(node)
        ? node.getText(sf).replace(/n$/i, '')
        : null
    if (numericText !== null) {
      const magnitude = Number(numericText.replace(/_/g, ''))
      const negated =
        ts.isPrefixUnaryExpression(node.parent) && node.parent.operator === ts.SyntaxKind.MinusToken
      const value = negated ? -magnitude : magnitude
      if (Number.isFinite(value) && !TRIVIAL.has(value)) {
        const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line
        const ownLine = srcLines[line] ?? ''
        const stmt = enclosingStatement(node)
        // Only the comment block IMMEDIATELY attached to the statement is local context.
        // Walk the leading comment ranges backward from the statement, stopping at either
        // the file preamble (the header, excluded BY POSITION — round-5 R5-A) or a blank
        // line (>=2 newlines) that DETACHES an earlier block from the literal.
        const ranges = ts.getLeadingCommentRanges(fullText, stmt.getFullStart()) ?? []
        const attached: string[] = []
        let boundary = stmt.getStart(sf)
        for (let idx = ranges.length - 1; idx >= 0; idx--) {
          const r = ranges[idx]
          if (preamblePositions.has(r.pos)) break
          if ((fullText.slice(r.end, boundary).match(/\n/g) ?? []).length >= 2) break
          attached.unshift(fullText.slice(r.pos, r.end))
          boundary = r.pos
        }
        const leading = attached.join('\n')
        // Own source line FIRST (the own-line self-documenting arm reads docText's first
        // line), then the statement's leading comments — the literal's LOCAL context.
        const docText = leading ? `${ownLine}\n${leading}` : ownLine
        out.push({ file, line: line + 1, value, docText, enclosingSymbol: enclosingSymbolOf(node) })
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
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
