// tools/audit/check-citations.mjs
//
// Story mc2-1 (GREEN, Yoda) — the single-sided citation checker for
// missile-command. Ported from plugins/joust/tools/audit/check-citations.mjs
// (itself from centipede) with three localisations and nothing else:
//
//  1. VENDORED ROOT is INSIDE the plugin: reference/source/ (the REV-01 .MAC),
//     not an orchestrator-root tree. Default resolves there; MC_SOURCE_DIR overrides.
//  2. CLAIMS DIR default is docs/rom-study/claims; MC_CLAIMS_DIR overrides — this
//     is what lets the suite prove the non-zero exit against a throwaway broken
//     set without touching the committed claims.
//  3. EXTERNAL SOURCE is MAME's missile.cpp (the brief cites it for board-level
//     facts the 1982 source never states — e.g. the O-2 timebase). Schema-checked,
//     never byte-opened; its verbatim must be the self-describing marker.
//
// RADIX IS LOAD-BEARING. `verbatim` is COMPARED, never PARSED: trimEnd() on both
// sides and nothing else. `0B4` is the hex literal `0B4`, never `180`. The decoded
// value a claim also carries is re-derived from source in citations-source.test.ts;
// this checker stays dumb on purpose (the sibling invariant).
//
// WHAT THIS DOES NOT CHECK: it verifies a claim's `source` — file, line,
// verbatim — and never reads the `claim`/`meaning` prose. A byte-perfect verbatim
// on a real line can still sit under a false sentence; only a human, or a test
// that re-derives the figure, can catch that.

import { readFileSync, readdirSync, existsSync, realpathSync, lstatSync } from 'node:fs'
import { join, dirname, basename, isAbsolute, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/** MAME driver files the dossier cites — a PINNED SET, not an extension rule. */
const KNOWN_EXTERNAL = Object.freeze(['missile.cpp'])

/** The rigid self-describing form every external verbatim must take. */
const EXTERNAL_MARKER =
  /^\(MAME missile driver ([\w./]+):([\d,\-]+) — external secondary source: not in the vendored REV-01 tree, schema-only, never byte-opened\)$/

function isExternalSource(file) {
  return KNOWN_EXTERNAL.includes(basename(file))
}

function checkExternalMarker(id, source) {
  const m = EXTERNAL_MARKER.exec(String(source.verbatim).trim())
  if (!m) {
    return [
      `${id}: external source ${source.file} must carry the self-describing marker verbatim, ` +
        'not a quotation — an external citation is never byte-opened, so a plausible-looking ' +
        'quote there can never be falsified',
    ]
  }
  const [, markerFile, markerSpec] = m
  const errors = []
  if (basename(markerFile) !== basename(source.file)) {
    errors.push(`${id}: the marker names ${markerFile} but the claim cites ${source.file}`)
  }
  if (Number(String(markerSpec).split(/[,-]/)[0]) !== source.line) {
    errors.push(
      `${id}: the marker names line ${markerSpec} but the claim cites ${source.line} — ` +
        'a marker lifted from another claim',
    )
  }
  return errors
}

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
 * every claim is well-formed and (when `vendoredRoot` is given) every
 * non-external cited line re-opens byte-for-byte. Every problem is REPORTED,
 * never thrown.
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

    if (!isCitation(c?.source)) {
      errors.push(`${id}: missing or malformed source citation (needs file, positive line, verbatim)`)
    } else if (isExternalSource(c.source.file)) {
      errors.push(...checkExternalMarker(id, c.source))
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
// each against the vendored tree (or schema-only if absent), prints one line per
// error, exits non-zero on any failure.
//   MC_SOURCE_DIR  — vendored tree root, default ../../reference/source
//   MC_CLAIMS_DIR  — claims directory,   default docs/rom-study/claims
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
  const claimsDir = process.env.MC_CLAIMS_DIR ?? join(repoRoot, 'docs', 'rom-study', 'claims')
  const vendoredRoot = process.env.MC_SOURCE_DIR ?? join(repoRoot, 'reference', 'source')

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
        'Check MC_CLAIMS_DIR, or the directory has moved.',
    )
    process.exit(2)
  }

  const errors = checkClaims(claims, { vendoredRoot: root })

  if (!root) console.log(`(vendored tree absent at ${vendoredRoot} — schema-only check)`)
  console.log(`checked ${claims.length} claim(s)`)

  if (errors.length > 0) {
    console.error(`\n${errors.length} citation error(s):\n`)
    for (const e of errors) console.error(`  - ${e}`)
    process.exit(1)
  }
  console.log('all claims verified')
}
