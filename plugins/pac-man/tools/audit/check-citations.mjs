// tools/audit/check-citations.mjs
//
// Story pm1-2 (the fidelity harness) — the single-sided citation checker for
// pac-man. Ported from plugins/missile-command/tools/audit/check-citations.mjs
// (itself from joust/centipede) with these localisations and nothing else:
//
//  1. VENDORED ROOT is INSIDE the plugin: reference/source/ — the directory that
//     holds the ONE source of record, the vendored Z80 disassembly `pacman.asm`
//     (0000-3fff, the 1980 arcade program ROM). centipede points at a directory
//     TREE of many .MAC; pac-man's tree happens to hold a single .asm file, so the
//     dir-based resolver below needs no structural change — a claim cites
//     `file: "pacman.asm"` and it resolves root-first exactly as a .MAC did.
//     Default resolves there; PACMAN_SOURCE_DIR overrides.
//  2. CLAIMS DIR default is docs/rom-study/claims; PACMAN_CLAIMS_DIR overrides —
//     that is what lets the suite prove the non-zero exit against a throwaway
//     broken set without touching the committed claims.
//  3. THE CLAIM SHAPE carries the decoded record the rom-source-study skill asks
//     for: top-level `symbol`, `value`, `meaning`, `addr` (the hex ROM address —
//     the `pacman.asm:<addr>` vocabulary every later task cites), PLUS the sibling
//     `source:{file,line,verbatim}` triple that THIS checker byte-verifies. No
//     MAME/`ours`/`class` machinery is ported — MAME is a prose-only tiebreaker
//     here, never a claim citation.
//
// RADIX IS LOAD-BEARING. `verbatim` is COMPARED, never PARSED: trimEnd() on both
// sides and nothing else. The scoring-table word `2b1b  2000` is the literal
// bytes 0x20 0x00, never the decimal 8192 and never the decoded 200. The decoded
// value a claim also carries (BCD, little-endian, displayed ×10) is re-derived
// from the verbatim in tests/audit/citations.test.ts; this checker stays dumb on
// purpose (the sibling invariant — a byte-perfect verbatim can still sit under a
// wrong `value`, and only the re-derivation catches that).
//
// WHAT THIS DOES NOT CHECK: it verifies a claim's `source` — file, line,
// verbatim — and never reads the `meaning` prose. A byte-perfect verbatim on a
// real line can still support a false sentence; only a human, or a test that
// re-derives the figure, can catch that.

import { readFileSync, readdirSync, existsSync, realpathSync, lstatSync } from 'node:fs'
import { join, dirname, basename, isAbsolute, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/** A whole citation: a file to open, a line to find, a non-empty quote to compare. */
function isCitation(o) {
  return (
    typeof o === 'object' &&
    o !== null &&
    !Array.isArray(o) &&
    typeof o.file === 'string' &&
    o.file.length > 0 &&
    Number.isInteger(o.line) &&
    o.line > 0 &&
    typeof o.verbatim === 'string' &&
    o.verbatim.trim().length > 0
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

/** Resolve a cited `file` to an absolute path inside the vendored tree, safely. */
function resolveInTree(vendoredRoot, file) {
  const p = isAbsolute(file) ? file : join(vendoredRoot, file)
  const resolvedRoot = resolve(vendoredRoot)
  const resolvedPath = resolve(p)
  const withinTree = resolvedPath === resolvedRoot || resolvedPath.startsWith(resolvedRoot + sep)
  if (!withinTree) return undefined
  if (!existsSync(resolvedPath)) return undefined

  // macOS folds case; compare against the directory listing so a case-only
  // mismatch fails here instead of only on a case-sensitive CI runner.
  const dir = dirname(resolvedPath)
  if (!readdirSync(dir).includes(basename(resolvedPath))) return undefined

  let real
  try {
    real = realpathSync(resolvedPath)
  } catch {
    return undefined
  }
  const realRoot = realpathSync(resolvedRoot)
  if (real !== realRoot && !real.startsWith(realRoot + sep)) return undefined
  if (lstatSync(resolvedPath).isSymbolicLink() && real !== resolvedPath) return undefined
  return resolvedPath
}

/**
 * Validate a set of claims. Returns one error string per problem; empty means
 * every claim is well-formed and (when `vendoredRoot` is given) every cited line
 * re-opens byte-for-byte. Every problem is REPORTED, never thrown.
 *
 * @param claims  array of single-sided claim objects
 * @param opts.vendoredRoot  absolute path to the vendored source dir (the one
 *   holding pacman.asm), or null to skip byte-verification (schema-only — the CI
 *   path, if the reference/ tree is ever absent).
 */
export function checkClaims(claims, { vendoredRoot }) {
  const errors = []
  const seen = new Set()

  for (const c of claims) {
    if (c === null || typeof c !== 'object' || Array.isArray(c)) {
      errors.push(`a claims array element is ${c === null ? 'null' : typeof c}, not a claim object`)
      continue
    }
    const id = c?.id || '(missing id)'

    if (!c?.id) errors.push('a claim has no id')
    else if (seen.has(c.id)) errors.push(`duplicate id: ${c.id}`)
    else seen.add(c.id)

    if (typeof c?.symbol !== 'string' || c.symbol.length === 0) errors.push(`${id}: missing symbol`)
    if (typeof c?.value !== 'number' && typeof c?.value !== 'string') {
      errors.push(`${id}: value must be a number or string (the decoded record)`)
    }
    if (typeof c?.meaning !== 'string' || c.meaning.length === 0) errors.push(`${id}: missing meaning`)
    // `addr` is the hex ROM address — the `pacman.asm:<addr>` vocabulary. It is
    // schema-checked (non-empty run of hex digits) but not itself re-opened; the
    // byte gate is the `source` triple below, and the coverage sweep ties `addr`
    // to the dossier prose.
    if (typeof c?.addr !== 'string' || !/^[0-9a-f]+$/i.test(c.addr)) {
      errors.push(`${id}: addr must be a hex string (e.g. "2b17")`)
    }

    if (!isCitation(c?.source)) {
      errors.push(`${id}: missing or malformed source citation (needs file, positive line, verbatim)`)
    } else if (vendoredRoot) {
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
              `  cited:  ${String(c.source.verbatim).trimEnd()}\n` +
              `  actual: ${actual.trimEnd()}\n` +
              `  cited  (escaped): ${JSON.stringify(String(c.source.verbatim).trimEnd())}\n` +
              `  actual (escaped): ${JSON.stringify(actual.trimEnd())}`,
          )
        }
      }
    }
  }

  return errors
}

// ─── CLI entry ────────────────────────────────────────────────────────────
// `node tools/audit/check-citations.mjs` — loads every claims/*.json, re-opens
// each against the vendored source (or schema-only if absent), prints one line
// per error, exits non-zero on any failure.
//   PACMAN_SOURCE_DIR  — vendored source dir, default ../../reference/source
//   PACMAN_CLAIMS_DIR  — claims directory,    default docs/rom-study/claims
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
  const claimsDir = process.env.PACMAN_CLAIMS_DIR ?? join(repoRoot, 'docs', 'rom-study', 'claims')
  const vendoredRoot = process.env.PACMAN_SOURCE_DIR ?? join(repoRoot, 'reference', 'source')

  // A malformed claims file is REPORTED (naming the file), never thrown as a raw
  // stack trace — the same "every problem is reported" invariant checkClaims holds.
  const parseClaimsFile = (f) => {
    try {
      return JSON.parse(readFileSync(join(claimsDir, f), 'utf8'))
    } catch (e) {
      console.error(`cannot parse claims/${f}: ${e.message}`)
      process.exit(2)
    }
  }
  const claims = existsSync(claimsDir)
    ? readdirSync(claimsDir)
        .filter((f) => f.endsWith('.json'))
        .flatMap(parseClaimsFile)
        .flat()
    : []

  const root = existsSync(vendoredRoot) ? vendoredRoot : null

  // AN EMPTY CLAIMS SET IS NOT A PASS — a path typo or moved directory would
  // otherwise read as success forever. This repo has no legitimate zero-claim state.
  if (claims.length === 0) {
    console.error(
      `no claims found in ${claimsDir} — refusing to report success over an empty set. ` +
        'Check PACMAN_CLAIMS_DIR, or the directory has moved.',
    )
    process.exit(2)
  }

  const errors = checkClaims(claims, { vendoredRoot: root })

  if (!root) console.log(`(vendored source absent at ${vendoredRoot} — schema-only check)`)
  console.log(`checked ${claims.length} claim(s)`)

  if (errors.length > 0) {
    console.error(`\n${errors.length} citation error(s):\n`)
    for (const e of errors) console.error(`  - ${e}`)
    process.exit(1)
  }
  console.log('all claims verified')
}
