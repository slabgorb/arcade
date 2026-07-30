// tools/audit/check-citations.mjs
//
// Story cp1-2 — the single-sided citation checker. Ported from
// tempest/tools/audit/check-citations.mjs with the `ours`/`class`/
// `recommendation`/`remediated_by`/`LINKED_MODULES` machinery dropped: a
// centipede claim is an assertion ABOUT the 1981 machine, cited to primary
// source. There is no clone yet, so there is no `ours` side.
//
// Schema per claim: non-empty unique `id`; non-empty `claim`; `source` =
// {file: non-empty string, line: positive int, verbatim: string}; optional
// `corroboration` (object or non-empty string), never byte-opened.
//
// Byte verification (only when `vendoredRoot` is non-null): resolve
// `source.file` root-first, then revision.v4/ (a `file` already containing a
// path separator is treated as an exact tree-relative path); read the line;
// compare `.trimEnd()` on both sides (tolerates trailing whitespace,
// preserves leading spaces + internal tabs). One error per bad claim.
//
// Deliberately NOT ported: tempest's LINKED_MODULES / never-shipped gate.
// Centipede legitimately cites .DOC/.MAP files (Ed Logg's design doc, the ROM
// part ledger, the link map) as primary design intent — existence in the
// vendored tree is the gate here, not link-string membership.

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname, isAbsolute, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

// The target revision the dossier cites bare filenames against, after the
// tree root itself. revision.v2/ and revision.v3/ are deliberately NOT
// searched — out of scope for this story (cp1-3's quarry).
const REVISION_SUBDIRS = ['', 'revision.v4']

/**
 * Is this a whole citation — something a reader could actually go and
 * re-open? A file to open, a line to find, and a quote to compare against.
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
 * Schema-only validation of an optional `corroboration`: an object (with
 * optional `line` a positive int and optional `file`/`verbatim`/`note` as
 * strings) or a non-empty string. Never byte-opened — it typically points
 * outside the vendored tree (a MAME driver file).
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

const lineCache = new Map()
function lineAt(path, n) {
  if (!lineCache.has(path)) {
    if (!existsSync(path)) return undefined
    lineCache.set(path, readFileSync(path, 'utf8').split('\n'))
  }
  return lineCache.get(path)[n - 1]
}

/**
 * Resolve a cited `file` to an absolute path in the vendored tree: root-first,
 * then revision.v4/. A file already carrying a path separator (or already
 * absolute) is treated as an exact tree-relative (or absolute) path — this is
 * the mechanism a citation uses to reach revision.v2/ (e.g. the picture-ROM
 * story's `revision.v2/CENPIC.MAC`), which is deliberately NOT in
 * REVISION_SUBDIRS. That path is joined/resolved and then CONTAINED: it must
 * stay inside vendoredRoot after normalisation (a `..` that lands back inside
 * is fine; one that escapes is refused, even if the target file is real and
 * the verbatim would have matched — cp1-3 carry-forward from cp1-2 review).
 */
function resolveInTree(vendoredRoot, file) {
  if (isAbsolute(file) || file.includes('/')) {
    const p = isAbsolute(file) ? file : join(vendoredRoot, file)
    const resolvedRoot = resolve(vendoredRoot)
    const resolvedPath = resolve(p)
    const withinTree = resolvedPath === resolvedRoot || resolvedPath.startsWith(resolvedRoot + sep)
    if (!withinTree) return undefined
    return existsSync(p) ? p : undefined
  }
  for (const sub of REVISION_SUBDIRS) {
    const p = join(vendoredRoot, sub, file)
    if (existsSync(p)) return p
  }
  return undefined
}

/**
 * Validate a set of claims. Returns one error string per problem; an empty
 * array means every claim is well-formed and (when `vendoredRoot` is
 * provided) every cited line re-opens byte-for-byte.
 *
 * @param claims  array of single-sided claim objects
 * @param opts.vendoredRoot  absolute path to the vendored 1981 source, or
 *                           null to skip byte-verification (schema-only —
 *                           the CI path, which lacks the orchestrator's
 *                           reference/ tree)
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

    if (!isCitation(c?.source)) {
      errors.push(`${id}: missing or malformed source citation (needs file, positive line, verbatim)`)
    } else if (vendoredRoot) {
      const path = resolveInTree(vendoredRoot, c.source.file)
      if (!path) {
        errors.push(`${id}: source file ${c.source.file} not found in the vendored tree (root or revision.v4/)`)
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
  // reference/ sits at the MONOREPO root — two levels above plugins/centipede.
  const vendoredRoot =
    process.env.CENTIPEDE_SOURCE_DIR ??
    join(repoRoot, '..', '..', 'reference', 'atari-source', 'centipede')

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
