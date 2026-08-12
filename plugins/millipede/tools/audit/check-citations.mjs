// tools/audit/check-citations.mjs
//
// Story ml1-1 — the single-sided citation checker for Millipede, ported from
// plugins/centipede/tools/audit/check-citations.mjs (itself tempest with the
// `ours`/`class`/`recommendation`/`remediated_by`/`LINKED_MODULES` machinery
// dropped: a Millipede claim is an assertion ABOUT the 1982 machine, cited to
// primary source; there is no clone yet, so there is no `ours` side).
//
// MILLIPEDE DIFFERENCE FROM CENTIPEDE: the source is a SINGLE vendored revision
// (historicalsource/millipede @ 29f3e05), so REVISION_SUBDIRS is [''] — the tree
// root, full stop. Centipede's revision.v4 (program target) and revision.v2
// (picture data) layers do not exist here. A cited `file` carrying a path
// separator is still treated as an exact tree-relative path AND contained inside
// the vendored root (a `..` escaping the tree is refused, even if the target file
// is real — the trusted-JSON traversal guard, carried forward from cp1-2/cp1-3).
//
// Schema per claim: non-empty unique `id`; non-empty `claim`; `source` =
// {file: non-empty string, line: positive int, verbatim: string}; optional
// `corroboration` (object or non-empty string), never byte-opened. (The `counts`
// re-derivation machinery centipede carries is NOT ported here — no ml1-1 claim
// uses a tally, and porting it live-and-untested was an ml1-1 rework finding; ml1-2
// re-adds `counts` with its own count-assertions test the first time it needs one.)
//
// Byte verification (only when `vendoredRoot` is non-null): resolve `source.file`
// at the tree root; read the line; compare `.trimEnd()` on both sides (tolerates
// trailing whitespace, preserves leading spaces + internal tabs). One error per
// bad claim. Millipede legitimately cites .DOC/.LNK files (the 368X1.DOC ROM
// sign-off ledger, the MILLI.LNK link map) as primary design intent — existence
// in the vendored tree is the gate, not a link-string membership.

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, dirname, isAbsolute, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

// The bare-filename search path. Millipede is one revision, so this is the tree
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
 * tree (a MAME driver file, milliped.cpp).
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
 * A full-BYTE citation (ml2-1): a picture-ROM file, a byte offset, and the run of
 * whole bytes (0..255) expected there. Used for the two Millipede picture EPROMs
 * (136013-106.p5 / -107.r5), which are LICENCE-WALLED binaries — vendored locally,
 * never committed — so they carry no text `verbatim` to quote. Ported in spirit from
 * pac-man's graphics-ROM teeth (plugins/pac-man/tools/audit/check-citations.mjs).
 * Unlike a text citation, a byte citation whose binary is ABSENT under the root is
 * SKIPPED, not errored (the CI-green invariant): the .MAC source is committed so the
 * tree root always exists, but the picture bytes are walled off a CI clone.
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
/** The raw bytes of a binary source (a picture EPROM), cached per path. */
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
 * whole audit (S1, cp1-2/cp1-3 traversal guard hardened in ml1-1 rework). Applying
 * containment + the is-file check to every candidate closes both: an escaping path
 * and a directory citation are now REFUSED (returned as "not found"), never read.
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
 * @param opts.vendoredRoot  absolute path to the vendored 1982 source, or null to
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
      // clone green with the picture bytes walled off. When it IS present, every byte
      // in the run must re-open exactly, and a run past end-of-file reddens.
      if (vendoredRoot) {
        const path = resolveInTree(vendoredRoot, c.source.file)
        if (path) {
          const buf = bytesOf(path)
          const { offset, bytes } = c.source
          if (offset + bytes.length > buf.length) {
            errors.push(
              `${id}: picture ROM ${c.source.file} offset ${offset}+${bytes.length} runs past end-of-file (length ${buf.length})`,
            )
          } else {
            const mism = []
            for (let i = 0; i < bytes.length; i++) {
              if (buf[offset + i] !== bytes[i]) mism.push(`[${i}] cited ${bytes[i]}, actual ${buf[offset + i]}`)
            }
            if (mism.length) {
              errors.push(
                `${id}: picture ROM ${c.source.file}@${offset} byte mismatch: ` +
                  `${mism.slice(0, 4).join('; ')}${mism.length > 4 ? ` (+${mism.length - 4} more)` : ''}`,
              )
            }
          }
        }
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
  // reference/ sits at the MONOREPO root — two levels above plugins/millipede.
  const vendoredRoot =
    process.env.MILLIPEDE_SOURCE_DIR ??
    join(repoRoot, '..', '..', 'reference', 'original-source', 'millipede')

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
