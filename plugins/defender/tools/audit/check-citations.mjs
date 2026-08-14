// tools/audit/check-citations.mjs
//
// Story df1-1 — the single-sided citation checker for Defender, ported from
// plugins/millipede/tools/audit/check-citations.mjs (itself centipede's, itself
// tempest's with the `ours`/`class`/`recommendation`/`remediated_by`/
// `LINKED_MODULES` machinery dropped: a Defender claim is an assertion ABOUT the
// 1981 machine, cited to primary source; there is no clone yet, so there is no
// `ours` side).
//
// DEFENDER SHAPE: the source is a SINGLE vendored revision
// (historicalsource/defender @ 3fae9d3 — the RED/cocktail parent set, twelve
// Williams RASM .SRC files), so REVISION_SUBDIRS is [''] — the tree root, full
// stop. A cited `file` carrying a path separator is still treated as an exact
// tree-relative path AND contained inside the vendored root (a `..` escaping the
// tree is refused, even if the target file is real — the trusted-JSON traversal
// guard, carried forward from cp1-2/cp1-3 through the ml1-1 rework this story's
// title names: UNCONDITIONAL containment + the isFile gate, both preserved in
// resolveInTree below).
//
// Schema per claim: non-empty unique `id`; non-empty `claim`; `source` in ONE of
// two shapes; optional `corroboration` (object or non-empty string), never
// byte-opened. (The `counts` re-derivation machinery centipede carries is NOT here
// — ported-live-and-untested was an ml1-1 rework finding; the df* story that first
// needs a tally re-adds it with its own count-assertions test.)
//   • TEXT source {file: non-empty string, line: positive int, verbatim: string} —
//     an assembler-source line (df1).
//   • BYTE source {file: non-empty string, offset: >=0 int, bytes: [0..255], len>=1} —
//     a run of whole bytes in a licence-walled binary (millipede's ml2-1 shape,
//     kept whole in the port: df6 pins defend.snd bytes the same way).
//
// Verification (only when `vendoredRoot` is non-null; schema-only otherwise):
//   • TEXT — resolve `source.file` at the tree root, read the line, compare
//     `.trimEnd()` on both sides (tolerates trailing whitespace, preserves leading
//     spaces + internal tabs). A missing text file is an ERROR. Defender's twelve
//     files are all .SRC — including the prose INFO.SRC build notes/ROM ledger,
//     primary design intent like any other; existence in the tree is the gate.
//   • BYTE — resolve `source.file`, read the binary, compare the whole-byte run at
//     `offset`. A run past end-of-file ERRORS. But a byte source whose binary is
//     ABSENT under the root is SKIPPED, not errored: such binaries are
//     LICENCE-WALLED (vendored locally, never committed), so a CI clone has the
//     .SRC tree but not the ROM images, and must stay green. One error per bad claim.

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, dirname, isAbsolute, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

// The bare-filename search path. Defender is one revision, so this is the tree
// root only — unlike centipede's ['', 'revision.v4'].
const REVISION_SUBDIRS = ['']

/**
 * Is this a whole citation — something a reader could actually go and re-open?
 * A file to open, a line to find, and a quote to compare against.
 */
function isCitation(o) {
  return (
    typeof o === 'object' &&
    o !== null &&
    !Array.isArray(o) &&
    typeof o.file === 'string' &&
    o.file.length > 0 &&
    Number.isInteger(o.line) &&
    o.line > 0 &&
    typeof o.verbatim === 'string'
  )
}

/**
 * Schema-only validation of an optional `corroboration`: an object (with optional
 * `line` a positive int and optional `file`/`verbatim`/`note` as strings) or a
 * non-empty string. Never byte-opened — it typically points outside the vendored
 * tree (a MAME driver file, williams.cpp / williams_m.cpp — cited in prose, never
 * copied: GPL).
 */
function isValidCorroboration(c) {
  if (typeof c === 'string') return c.length > 0
  if (typeof c === 'object' && c !== null && !Array.isArray(c)) {
    if ('line' in c && !(Number.isInteger(c.line) && c.line > 0)) return false
    if ('file' in c && typeof c.file !== 'string') return false
    if ('verbatim' in c && typeof c.verbatim !== 'string') return false
    if ('note' in c && typeof c.note !== 'string') return false
    return true
  }
  return false
}

/**
 * A full-BYTE citation (millipede ml2-1's shape, kept whole in the port): a
 * binary file, a byte offset, and the run of whole bytes (0..255) expected there.
 * Defender's consumer arrives with df6 (the defend.snd sound ROM — a
 * licence-walled binary with no text `verbatim` to quote). Unlike a text
 * citation, a byte citation whose binary is ABSENT under the root is SKIPPED,
 * not errored (the CI-green invariant): the .SRC source is committed so the tree
 * root always exists, but ROM bytes are walled off a CI clone.
 */
function isByteCitation(o) {
  return (
    typeof o === 'object' &&
    o !== null &&
    !Array.isArray(o) &&
    typeof o.file === 'string' &&
    o.file.length > 0 &&
    Number.isInteger(o.offset) &&
    o.offset >= 0 &&
    Array.isArray(o.bytes) &&
    o.bytes.length > 0 &&
    o.bytes.every((b) => Number.isInteger(b) && b >= 0 && b <= 255)
  )
}

const lineCache = new Map()
function lineAt(path, n) {
  if (!lineCache.has(path)) {
    if (!existsSync(path)) return undefined
    lineCache.set(path, readFileSync(path, 'utf8').split('\n'))
  }
  return lineCache.get(path)[n - 1]
}

const byteCache = new Map()
/** The raw bytes of a binary source, cached per path. */
function bytesOf(path) {
  if (!byteCache.has(path)) byteCache.set(path, readFileSync(path))
  return byteCache.get(path)
}

/**
 * Resolve a cited `file` to an absolute path to a FILE inside the vendored tree,
 * or `undefined`. A bare filename resolves at the tree root (REVISION_SUBDIRS =
 * ['']); a file carrying a path separator (or already absolute) is an exact
 * tree-relative (or absolute) path. Every candidate — whichever branch built it —
 * passes ONE containment gate: after normalisation it must stay inside
 * vendoredRoot (a `..` that lands back inside is fine; one that escapes is
 * refused, even if the target is real and the verbatim would have matched) AND it
 * must be a regular file.
 *
 * The containment used to guard ONLY the `isAbsolute || includes('/')` branch, so
 * a bare `..` or `.` (no separator) fell through to the search loop, resolved to
 * `dirname(root)` / the root itself — a DIRECTORY outside or at the tree — and was
 * handed back for `readFileSync`, which threw an uncaught EISDIR and aborted the
 * whole audit (S1, cp1-2/cp1-3 traversal guard hardened in the ml1-1 rework).
 * Applying containment + the is-file check to every candidate closes both: an
 * escaping path and a directory citation (even one INSIDE the tree) are REFUSED
 * (returned as "not found"), never read.
 */
function resolveInTree(vendoredRoot, file) {
  const resolvedRoot = resolve(vendoredRoot)
  const resolveContainedFile = (p) => {
    const resolvedPath = resolve(p)
    const withinTree = resolvedPath === resolvedRoot || resolvedPath.startsWith(resolvedRoot + sep)
    if (!withinTree) return undefined
    return existsSync(p) && statSync(p).isFile() ? p : undefined
  }
  if (isAbsolute(file) || file.includes('/')) {
    return resolveContainedFile(isAbsolute(file) ? file : join(vendoredRoot, file))
  }
  for (const sub of REVISION_SUBDIRS) {
    const hit = resolveContainedFile(join(vendoredRoot, sub, file))
    if (hit) return hit
  }
  return undefined
}

/**
 * Validate a set of claims. Returns one error string per problem; an empty array
 * means every claim is well-formed and (when `vendoredRoot` is provided) every
 * cited line re-opens byte-for-byte.
 *
 * @param claims  array of single-sided claim objects
 * @param opts.vendoredRoot  absolute path to the vendored 1981 source, or null to
 *                           skip byte-verification (schema-only — the CI path,
 *                           which lacks the orchestrator's reference/ tree)
 * @returns array of error strings; empty means every claim is valid
 */
export function checkClaims(claims, { vendoredRoot }) {
  const errors = []
  const seen = new Set()

  for (const c of claims) {
    const id = c?.id || '(missing id)'

    if (!c?.id) errors.push('a claim has no id')
    else if (seen.has(c.id)) errors.push(`duplicate id: ${c.id}`)
    else seen.add(c.id)

    if (!c?.claim) errors.push(`${id}: missing claim`)

    if (isCitation(c?.source)) {
      if (vendoredRoot) {
        const path = resolveInTree(vendoredRoot, c.source.file)
        if (!path) {
          errors.push(`${id}: source file ${c.source.file} not found in the vendored tree`)
        } else {
          const actual = lineAt(path, c.source.line)
          if (actual === undefined) {
            errors.push(`${id}: source ${c.source.file}:${c.source.line} does not exist`)
          } else if (actual.trimEnd() !== String(c.source.verbatim).trimEnd()) {
            errors.push(
              `${id}: source ${c.source.file}:${c.source.line} does not match verbatim\n` +
                `  cited:  ${JSON.stringify(c.source.verbatim)}\n` +
                `  actual: ${JSON.stringify(actual)}`,
            )
          }
        }
      }
    } else if (isByteCitation(c?.source)) {
      // Byte teeth. A licence-walled binary that is ABSENT under the root is SKIPPED,
      // not errored (unlike the text path's "not found") — that is what keeps a CI
      // clone green with the ROM bytes walled off. When it IS present, every byte
      // in the run must re-open exactly, and a run past end-of-file reddens.
      if (vendoredRoot) {
        const file = c.source.file
        const path = resolveInTree(vendoredRoot, file)
        if (path) {
          const buf = bytesOf(path)
          const { offset, bytes } = c.source
          if (offset + bytes.length > buf.length) {
            errors.push(
              `${id}: binary ${file} offset ${offset}+${bytes.length} runs past end-of-file (length ${buf.length})`,
            )
          } else {
            const mism = []
            for (let i = 0; i < bytes.length; i++) {
              if (buf[offset + i] !== bytes[i]) mism.push(`[${i}] cited ${bytes[i]}, actual ${buf[offset + i]}`)
            }
            if (mism.length) {
              errors.push(
                `${id}: binary ${file}@${offset} byte mismatch: ` +
                  `${mism.slice(0, 4).join('; ')}${mism.length > 4 ? ` (+${mism.length - 4} more)` : ''}`,
              )
            }
          }
        } else if (isAbsolute(file) || file.includes('/') || file === '.' || file === '..') {
          // The licence-wall skip is ONLY for a BARE filename that is absent everywhere
          // (a CI clone without the walled-off binary). A PATHFUL or traversal-shaped byte
          // citation that did not resolve inside the tree is REFUSED loudly — the same
          // fail-loud containment the text path gives (cp1-2/cp1-3, ml1-1 S1). Without this
          // an escaping `../…` byte citation would be reported clean instead of refused.
          errors.push(`${id}: byte source ${file} does not resolve to a file inside the vendored tree (refused)`)
        }
        // else: a bare filename absent everywhere → the intentional licence-wall skip.
      }
    } else {
      errors.push(`${id}: missing or malformed source citation (needs a text {file,line,verbatim} or a byte {file,offset,bytes})`)
    }

    if ('corroboration' in (c ?? {}) && c.corroboration !== undefined) {
      if (!isValidCorroboration(c.corroboration)) {
        errors.push(`${id}: malformed corroboration (must be a non-empty string, or an object with valid fields)`)
      }
    }
  }

  return errors
}

// ─── CLI entry ────────────────────────────────────────────────────────────
// `node tools/audit/check-citations.mjs` — loads every docs/rom-study/claims/
// *.json, re-opens each against the vendored tree (or schema-only if absent),
// prints one line per error, and exits non-zero on any failure.
if (import.meta.url === `file://${process.argv[1]}`) {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
  const claimsDir = join(repoRoot, 'docs', 'rom-study', 'claims')
  // reference/ sits at the MONOREPO root — two levels above plugins/defender.
  const vendoredRoot =
    process.env.DEFENDER_SOURCE_DIR ??
    join(repoRoot, '..', '..', 'reference', 'original-source', 'defender')

  const claims = existsSync(claimsDir)
    ? readdirSync(claimsDir)
        .filter((f) => f.endsWith('.json'))
        .flatMap((f) => JSON.parse(readFileSync(join(claimsDir, f), 'utf8')))
    : []

  const root = existsSync(vendoredRoot) ? vendoredRoot : null
  const errors = checkClaims(claims, { vendoredRoot: root })

  if (!root) {
    console.log(`(vendored tree absent at ${vendoredRoot} — schema-only check)`)
  }
  console.log(`checked ${claims.length} claim(s)`)

  if (errors.length > 0) {
    console.error(`\n${errors.length} citation error(s):\n`)
    for (const e of errors) console.error(`  - ${e}`)
    process.exit(1)
  }
  console.log('all claims verified')
}

/**
 * True when `source` is one of the citation shapes this checker accepts (text or
 * byte). Exported so loadClaims can gate its load boundary with the SAME predicate
 * checkClaims uses, keeping the two from drifting (df1-6).
 */
export function isValidClaimSource(source) {
  return isCitation(source) || isByteCitation(source)
}
