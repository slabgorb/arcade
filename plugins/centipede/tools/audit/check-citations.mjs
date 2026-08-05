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
// `corroboration` (object or non-empty string), never byte-opened; optional
// `counts` (cp6-5) — an array of {pattern, scope?, expected, note?} tallies
// RE-DERIVED against the tree so a number embedded in claim prose reddens on
// source drift (schema-checked always, re-run only with a vendoredRoot).
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

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
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
 * cp6-5 — resolve a count assertion's optional `scope` to an absolute path in
 * the vendored tree. Absent/empty ⇒ the whole tree (the bare
 * `grep -rn … reference/atari-source/centipede` recipe). A subpath is joined and
 * then CONTAINED: it must stay inside vendoredRoot after normalisation (same rule
 * as `resolveInTree`'s slash-branch — a `..` landing back inside is fine; one that
 * escapes is refused, never a silent zero). Returns undefined if it escapes or is
 * absent from the tree.
 */
function resolveScope(vendoredRoot, scope) {
  if (scope === undefined || scope === '') return vendoredRoot
  const p = isAbsolute(scope) ? scope : join(vendoredRoot, scope)
  const resolvedRoot = resolve(vendoredRoot)
  const resolvedPath = resolve(p)
  const withinTree = resolvedPath === resolvedRoot || resolvedPath.startsWith(resolvedRoot + sep)
  if (!withinTree) return undefined
  return existsSync(p) ? p : undefined
}

/**
 * cp6-5 — count LINES matching `re` under `root` (a file, or a directory walked
 * recursively). Line-oriented, mirroring `grep -n <pattern>` — not global matches
 * within a line. `re` must be flag-free (`new RegExp(pattern)`) so `.test` stays
 * stateless across the walk.
 */
function countMatchingLines(root, re) {
  if (statSync(root).isDirectory()) {
    let n = 0
    for (const e of readdirSync(root, { withFileTypes: true })) n += countMatchingLines(join(root, e.name), re)
    return n
  }
  let n = 0
  for (const line of readFileSync(root, 'utf8').split('\n')) if (re.test(line)) n++
  return n
}

/**
 * cp6-5 — schema-validate one count assertion, returning an error string or null.
 * `expected: 0` is VALID (a pattern that legitimately matches nothing) — the
 * non-negative-integer test admits it, so no `||`-style falsy coercion can drop it.
 */
function countSchemaError(id, ct) {
  if (typeof ct !== 'object' || ct === null || Array.isArray(ct)) {
    return `${id}: malformed count assertion (must be an object with a pattern and expected)`
  }
  if (typeof ct.pattern !== 'string' || ct.pattern.length === 0) {
    return `${id}: malformed count assertion (needs a non-empty string pattern)`
  }
  if (!(Number.isInteger(ct.expected) && ct.expected >= 0)) {
    return `${id}: malformed count assertion (expected must be a non-negative integer)`
  }
  if ('scope' in ct && ct.scope !== undefined && typeof ct.scope !== 'string') {
    return `${id}: malformed count assertion (scope must be a string)`
  }
  if ('note' in ct && ct.note !== undefined && typeof ct.note !== 'string') {
    return `${id}: malformed count assertion (note must be a string)`
  }
  return null
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

    // cp6-5 — COUNT assertions: schema always, re-derivation only with a tree.
    if ('counts' in (c ?? {}) && c.counts !== undefined) {
      if (!Array.isArray(c.counts)) {
        errors.push(`${id}: malformed counts (must be an array of count assertions)`)
      } else {
        for (const ct of c.counts) {
          const schemaErr = countSchemaError(id, ct)
          if (schemaErr) {
            errors.push(schemaErr)
            continue
          }
          if (!vendoredRoot) continue // schema-only (CI): the tree is absent, don't re-derive
          const scopeRoot = resolveScope(vendoredRoot, ct.scope)
          if (scopeRoot === undefined) {
            errors.push(`${id}: count scope ${JSON.stringify(ct.scope)} escapes or is absent from the vendored tree`)
            continue
          }
          let re
          try {
            re = new RegExp(ct.pattern)
          } catch (e) {
            errors.push(`${id}: count pattern ${JSON.stringify(ct.pattern)} is not a valid regex (${e.message})`)
            continue
          }
          const actual = countMatchingLines(scopeRoot, re)
          if (actual !== ct.expected) {
            const where = ct.scope ? `in ${ct.scope}` : 'over the whole tree'
            errors.push(
              `${id}: count ${JSON.stringify(ct.pattern)} ${where} expected ${ct.expected} but re-derived ${actual}`,
            )
          }
        }
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
