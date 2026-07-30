// tools/audit/check-citations.mjs
//
// Story jt1-2 (GREEN, Julia) — the single-sided citation checker. Implements
// the contract in tools/audit/check-citations.d.mts, pinned by
// tests/audit/citations.test.ts.
//
// Ported from centipede/tools/audit/check-citations.mjs (cp1-2) with the three
// joust-shaped changes the contract spells out:
//
//  1. FLAT TREE. The Williams source vendors as one flat directory — all four
//     program revisions are sibling FILES (JOUSTRV1.SRC … JOUSTRV4.SRC), not
//     subdirectories. Centipede's REVISION_SUBDIRS search order ('' then
//     'revision.v4/') collapses to a single root lookup: a citation names the
//     revision by naming the file, so there is nothing to search.
//  2. EXTERNAL `.cpp` CITATIONS. The dossier cites the MAME williams driver as
//     a source in its own right for board-level facts the 1982 source never
//     states. MAME is a machine-local sparse clone that neither CI nor the
//     vendored tree contains, so a `.cpp` source is schema-validated exactly
//     like any other and then never resolved and never byte-opened.
//
//     Externality is decided by EXTENSION ALONE — there is deliberately no
//     per-claim opt-out flag. A flag can be forgotten on a new claim, and far
//     worse, can be ADDED to a .SRC claim to silence a real byte failure. The
//     suite defends this boundary in both directions: a .cpp claim must not be
//     reported missing from the tree, AND a .SRC claim with a bad verbatim must
//     still fail. Do not weaken this into a flag (SM ruling, jt1-2).
//  3. RADIX IS LOAD-BEARING. `verbatim` is COMPARED, never PARSED: trimEnd() on
//     both sides and nothing else. No radix evaluation, no numeric
//     normalisation, no whitespace collapsing, no case folding. `@377` is the
//     octal literal `@377` — never `255`, never `$FF`. The Motorola columns are
//     tab-separated, so leading whitespace and internal tabs are significant;
//     only trailing whitespace is forgiven.
//
// ─── WHAT THIS CHECKER DOES NOT CHECK ────────────────────────────────────────
// It verifies a claim's `source` — file, line, verbatim — and NEVER reads the
// `claim` prose. A claim may cite a real line with a byte-perfect verbatim while
// asserting something false ABOUT that line, and this gate will pass it, every
// time, forever. That is not a bug to fix here: validating prose against source
// is unfalsifiable in general. It is a limit to know about.
//
// This is not hypothetical. jt1-10 corrected the dossier's process-block layout
// — "51-byte block, 8 overhead" — which was wrong in two independent ways and
// had been cited by two green claims since the day they landed. Green citations
// certify that a quotation is real. They do not certify that the sentence around
// it is true; only a human, or a test that re-derives the figure from the
// source, can do that.

import { readFileSync, readdirSync, existsSync, realpathSync, lstatSync } from 'node:fs'
import { join, dirname, basename, isAbsolute, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/**
 * The MAME driver files the dossier cites. A PINNED SET, not an extension rule.
 *
 * jt1-9 replaced `endsWith('.cpp')` with this list because the extension rule
 * was exploitable BY ACCIDENT, not merely by forgery: a claim that mistyped
 * `JOUSTI.SRC` as `JOUSTI.cpp` silently stopped being byte-verified and reported
 * success forever. Tightening the same rule would have left the shape of the bug
 * in place, so the rule is gone. Anything not on this list byte-verifies against
 * the vendored tree, and a new MAME file is a deliberate one-line addition.
 *
 * Compared CASE-SENSITIVELY: `joustrv4.CPP` is not on the list and must not
 * become external by virtue of a filesystem that happens to fold case.
 */
const KNOWN_EXTERNAL = Object.freeze(['williams.cpp', 'williamsblitter.cpp', 'williams_v.cpp'])

/**
 * The rigid self-describing form every external verbatim must take:
 *
 *   (MAME williams driver FILE:LINESPEC — external secondary source: not in the
 *    vendored 1982 tree, schema-only, never byte-opened)
 *
 * An external source cannot be byte-opened, so a plausible-looking QUOTE there
 * is unfalsifiable — precisely what an unverifiable source invites. Requiring a
 * marker instead makes the absence of evidence explicit in the data.
 *
 * The marker embeds its OWN file:linespec, and `checkExternalMarker` requires
 * that to agree with the claim it sits on. That self-reference is what makes a
 * SHAPE rule sufficient here where a per-claim flag would not be: a marker
 * cannot be lifted onto a different claim without becoming visibly inconsistent.
 */
const EXTERNAL_MARKER =
  /^\(MAME williams driver ([\w./]+):([\d,\-]+) — external secondary source: not in the vendored 1982 tree, schema-only, never byte-opened\)$/

/** Is this citation one of the pinned external MAME sources? */
function isExternalSource(file) {
  return KNOWN_EXTERNAL.includes(basename(file))
}

/** Errors for an external claim's verbatim, if its marker is missing or lifted. */
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
    typeof o.verbatim === 'string' &&
    // Empty/whitespace-only verbatim is a SCHEMA error, rejected before the
    // byte comparison ever runs: on a BLANK anchor line trimEnd() makes
    // "" === "" and the checker certifies a citation that points at whitespace
    // and asserts nothing — the exact shape that concealed JT8-113 (jt1-2 R1
    // finding, closed by the jt1-9 review's rejection).
    o.verbatim.trim().length > 0
  )
}

/**
 * Schema-only validation of an optional `corroboration`: an object (with
 * optional `line` a positive int and optional `file`/`verbatim`/`note` as
 * strings) or a non-empty string. Never byte-opened.
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
 * Resolve a cited `file` to an absolute path in the FLAT vendored tree. A bare
 * filename is looked up directly at the root; a file carrying a path separator
 * (or already absolute) is treated as an exact path and then CONTAINED — it
 * must stay inside vendoredRoot after normalisation. A `..` that lands back
 * inside is fine; one that escapes is refused even if the target file is real
 * and the verbatim would have matched.
 */
function resolveInTree(vendoredRoot, file) {
  const p = isAbsolute(file) ? file : join(vendoredRoot, file)
  const resolvedRoot = resolve(vendoredRoot)
  const resolvedPath = resolve(p)
  const withinTree = resolvedPath === resolvedRoot || resolvedPath.startsWith(resolvedRoot + sep)
  if (!withinTree) return undefined
  if (!existsSync(resolvedPath)) return undefined

  // CASE SENSITIVITY. macOS folds case, so `ramdef.src` opens RAMDEF.SRC here
  // and fails on a case-sensitive CI runner — a green local check that reddens
  // only in CI. Compare the cited name against the directory listing instead of
  // trusting existsSync.
  const dir = dirname(resolvedPath)
  if (!readdirSync(dir).includes(basename(resolvedPath))) return undefined

  // SYMLINKS. Containment above is purely lexical, so a link planted inside the
  // tree points anywhere and readFileSync follows it. Resolve the real path and
  // require THAT to be inside the tree too.
  let real
  try {
    real = realpathSync(resolvedPath)
  } catch {
    return undefined
  }
  const realRoot = realpathSync(resolvedRoot)
  if (real !== realRoot && !real.startsWith(realRoot + sep)) return undefined
  if (lstatSync(resolvedPath).isSymbolicLink() && real !== resolvedPath) {
    // A link that stays inside the tree is still a redirection the citation does
    // not declare; refuse it rather than silently reading somewhere else.
    return undefined
  }
  return resolvedPath
}

/**
 * Validate a set of claims. Returns one error string per problem; an empty
 * array means every claim is well-formed and (when `vendoredRoot` is provided)
 * every non-external cited line re-opens byte-for-byte.
 *
 * Every problem is REPORTED, never thrown: a checker that bailed on the first
 * bad claim would turn the dossier conversion into a one-error-at-a-time grind.
 *
 * @param claims  array of single-sided claim objects
 * @param opts.vendoredRoot  absolute path to the vendored 1982 Williams source,
 *                           or null to skip byte-verification (schema-only —
 *                           the CI path, which lacks the orchestrator's
 *                           reference/ tree)
 * @returns array of error strings; empty means every claim is valid
 */
export function checkClaims(claims, { vendoredRoot }) {
  const errors = []
  const seen = new Set()

  for (const c of claims) {
    // A primitive element (a bare string, a number) is malformed DATA. The
    // module's own invariant is that every problem is REPORTED, never thrown,
    // and `'corroboration' in c` throws a TypeError on a primitive.
    if (c === null || typeof c !== 'object' || Array.isArray(c)) {
      errors.push(
        `a claims array element is ${c === null ? 'null' : typeof c}, not a claim object`,
      )
      continue
    }
    const id = c?.id || '(missing id)'

    if (!c?.id) errors.push('a claim has no id')
    else if (seen.has(c.id)) errors.push(`duplicate id: ${c.id}`)
    else seen.add(c.id)

    if (!c?.claim) errors.push(`${id}: missing claim`)

    if (!isCitation(c?.source)) {
      errors.push(
        `${id}: missing or malformed source citation (needs file, positive line, verbatim)`,
      )
    } else if (isExternalSource(c.source.file)) {
      // Schema-checked, never resolved, never byte-opened — but the verbatim
      // must be the marker, and the marker must describe THIS claim.
      errors.push(...checkExternalMarker(id, c.source))
    } else if (vendoredRoot) {
      // External sources fall through both branches: schema-checked above,
      // never resolved here.
      const path = resolveInTree(vendoredRoot, c.source.file)
      if (!path) {
        errors.push(`${id}: source file ${c.source.file} not found in the vendored tree`)
      } else {
        const actual = lineAt(path, c.source.line)
        if (actual === undefined) {
          errors.push(`${id}: source ${c.source.file}:${c.source.line} does not exist`)
        } else if (actual.trimEnd() !== String(c.source.verbatim).trimEnd()) {
          // Both sides are shown TWICE: raw, so the error reads like the source
          // and can be grepped against it, and JSON-escaped, so the difference
          // is still visible when it is pure whitespace. On tab-separated
          // Motorola columns a collapsed run of tabs is real drift (WS-4) and a
          // raw-only report would print two lines that look identical.
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

    if ('corroboration' in (c ?? {}) && c.corroboration !== undefined) {
      if (!isValidCorroboration(c.corroboration)) {
        errors.push(
          `${id}: malformed corroboration (must be a non-empty string, or an object with valid fields)`,
        )
      }
    }
  }

  return errors
}

// ─── CLI entry ────────────────────────────────────────────────────────────
// `node tools/audit/check-citations.mjs` — loads every claims/*.json, re-opens
// each against the vendored tree (or schema-only if absent), prints one line
// per error, and exits non-zero on any failure.
//
// Two environment overrides, both exercised by tests/audit/citations.test.ts:
//   JOUST_SOURCE_DIR  — vendored tree root, default ../../reference/williams-source/joust
//   JOUST_CLAIMS_DIR  — claims directory,   default docs/rom-study/claims
//
// JOUST_CLAIMS_DIR is what lets the suite prove the non-zero exit against a
// throwaway broken claims set without touching the committed ones. Without it
// the CLI's failure path is untestable — which is how "exits non-zero" stays a
// sentence in a story instead of becoming a property of the program.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
  const claimsDir = process.env.JOUST_CLAIMS_DIR ?? join(repoRoot, 'docs', 'rom-study', 'claims')
  const vendoredRoot =
    process.env.JOUST_SOURCE_DIR ?? join(repoRoot, '..', '..', 'reference', 'williams-source', 'joust')

  const claims = existsSync(claimsDir)
    ? readdirSync(claimsDir)
        .filter((f) => f.endsWith('.json'))
        .flatMap((f) => JSON.parse(readFileSync(join(claimsDir, f), 'utf8')))
        .flat()
    : []

  const root = existsSync(vendoredRoot) ? vendoredRoot : null

  // AN EMPTY CLAIMS SET IS NOT A PASS. Checking nothing and printing "all
  // claims verified" is the most dangerous output this tool can produce: a path
  // typo or a moved directory reads as success forever. There is no legitimate
  // state in which this repo has zero claims.
  if (claims.length === 0) {
    console.error(
      `no claims found in ${claimsDir} — refusing to report success over an empty set. ` +
        'Check JOUST_CLAIMS_DIR, or the directory has moved.',
    )
    process.exit(2)
  }

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
