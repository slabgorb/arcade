// tests/audit/dossier-sweep.ts
//
// Story ml1-1 (GREEN) — the dossier COVERAGE sweep for Millipede, ported from
// plugins/centipede/tests/audit/dossier-sweep.ts (cp6-1). It lives in ONE module
// so it has exactly one implementation and that implementation is what
// tests/audit/citations.test.ts exercises with inline fixtures.
//
// ─── WHY DOSSIER_FILES IS EMPTY HERE ─────────────────────────────────────────
// This is the gate-first story: the Millipede dossier (brief.md, glossary.md,
// subsystems.md, …) is built by ml1-2/ml1-3/ml1-4, AFTER this gate lands. So the
// enrolled list starts EMPTY. The real-dossier gate `uncoveredCitations(loadClaims())`
// is therefore green-on-empty today; the sweep's TEETH are proven by the inline
// fixtures in citations.test.ts (extract → detect-uncovered → covered →
// malformed-reported), which need no real dossier file. Each later story enrols its
// own doc into DOSSIER_FILES — the byte side of the gate (loadClaims globs the whole
// claims/ dir) already watches any *.json the moment it lands.
//
// GRAMMAR: backtick-wrapped `FILE:LINESPEC` where FILE ends .MAC/.DOC/.MAP/.LNK
// (millipede cites the .MAC sources, the 368X1.DOC sign-off ledger and the
// MILLI.LNK link map) and LINESPEC is a comma list of N or N-M. MAME
// (`milliped.cpp:*`) is secondary, external, never byte-opened, and by
// construction excluded (`.cpp` is not in the file class).

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isValidClaimSource } from '../../tools/audit/check-citations.mjs'
import type { Claim } from '../../tools/audit/check-citations.mjs'

// tests/audit/dossier-sweep.ts → the plugin root is two levels up.
export const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const romStudyDir = join(pluginRoot, 'docs', 'rom-study')
export const claimsDir = join(romStudyDir, 'claims')

/**
 * Every dossier file the coverage sweep scans. ml1-2 enrols brief.md (the first
 * dossier file); ml1-3 adds its files, … Each enrolled file's every backticked
 * prose citation must be pinned by a claim in claims/, or the real-dossier gate
 * reddens.
 */
export const DOSSIER_FILES: readonly string[] = ['brief.md', 'glossary.md', 'subsystems.md', 'open-questions.md', 'board-facts.md']

/** A primary-source line citation extracted from the dossier prose. */
export interface ProseCitation {
  /** Bare filename as written, e.g. "MLDEF.MAC". */
  file: string
  start: number
  end: number
  /** The citation as the prose spells it, e.g. "MLDEF.MAC:398". */
  raw: string
  /** Which dossier file it came from — so a failure names the doc to fix. */
  from: string
}

/** What one pass over a dossier file found: the citations, and the wreckage. */
export interface CitationScan {
  citations: ProseCitation[]
  /** Backtick-wrapped `FILE:LINESPEC` forms the linespec grammar cannot parse. */
  malformed: string[]
}

/**
 * Extract every backtick-wrapped primary-source citation `FILE:LINESPEC` from a
 * dossier file, where FILE ends .MAC/.DOC/.MAP/.LNK and LINESPEC is a comma list
 * of N or N-M.
 *
 * Excludes, by construction: MAME (`milliped.cpp:*` — secondary, external, never
 * byte-opened), bare file mentions with no `:line`, and globs (`ML*.MAC` — the
 * `*` fails the file class).
 *
 * THE TRAP THIS REGEX SETS: it only matches the BACKTICK-WRAPPED form. An
 * unbackticked `MLDEF.MAC:398` in the prose, or a bare-colon continuation `:398`,
 * is INVISIBLE here — a citation the sweep cannot see is a citation nothing
 * re-checks. Later dossier-specific suites assert the prose carries neither
 * spelling; this module's job is only to sweep the backticked form.
 */
export function scanProseCitations(md: string, from = ''): CitationScan {
  const citations: ProseCitation[] = []
  const malformed: string[] = []
  const re = /`([\w./]+\.(?:MAC|DOC|MAP|LNK)):([\d,\-]+)`/g
  for (const m of md.matchAll(re)) {
    const file = basename(m[1]) // normalise any path prefix away
    for (const part of m[2].split(',')) {
      const range = part.match(/^(\d+)-(\d+)$/)
      if (range && +range[1] <= +range[2]) {
        citations.push({ file, start: +range[1], end: +range[2], raw: `${m[1]}:${part}`, from })
      } else if (/^\d+$/.test(part)) {
        citations.push({ file, start: +part, end: +part, raw: `${m[1]}:${part}`, from })
      } else {
        // The OUTER regex accepts any run of digits, commas and dashes, but only
        // `N` and `N-M` mean anything. A part that matches neither (a reversed
        // range `398-2`, a triple-dash `398-2-4`) used to fall off the end of this
        // loop with no record — so a coverage sweep over the remainder went
        // vacuously green. Report it as malformed instead.
        malformed.push(`${m[1]}:${part}`)
      }
    }
  }
  return { citations, malformed }
}

/**
 * Every well-formed citation in `md`. The malformed ones are dropped HERE and
 * reported by {@link allMalformedCitations} — one scanner, two views, so the two
 * can never disagree about what "well-formed" means (lang-review #18: one concept
 * must not grow two helpers).
 */
export function extractProseCitations(md: string, from = ''): ProseCitation[] {
  return scanProseCitations(md, from).citations
}

/**
 * Read a dossier file, or return '' when it does not exist.
 *
 * Deliberately NOT a throw: in ml1-1 no dossier file exists yet, and a throw here
 * would abort the whole suite with a module-level ENOENT — a harness error, not a
 * feature-absent failure.
 */
export function readDossier(name: string): string {
  const p = join(romStudyDir, name)
  return existsSync(p) ? readFileSync(p, 'utf8') : ''
}

/** Every prose citation across `files` (defaults to the whole enrolled list). */
export function allProseCitations(files: readonly string[] = DOSSIER_FILES): ProseCitation[] {
  return files.flatMap((f) => extractProseCitations(readDossier(f), f))
}

/**
 * Every citation across `files` that LOOKS like one and cannot be parsed as one.
 * The gate asserts this is empty: without it a single mistyped dash removes a
 * citation from the coverage sweep silently.
 */
export function allMalformedCitations(files: readonly string[] = DOSSIER_FILES): string[] {
  return files.flatMap((f) => scanProseCitations(readDossier(f), f).malformed.map((raw) => `${raw} (in ${f})`))
}

/**
 * Read ONE claims JSON file, parse it, and runtime-validate every entry's source
 * before returning the real `Claim[]`. This is the single-file entry point the
 * claims-arm suites (ml5-6) load their own topic file through, so none of them
 * re-rolls `JSON.parse(readFileSync(…)) as Claim[]`; {@link loadClaims} maps its
 * whole directory through it, so the df1-6 hardening lives here ONCE.
 *
 * df1-6: a bare JSON.parse threw a raw SyntaxError naming no file, and the
 * `as Claim | Claim[]` cast let a well-formed-JSON-wrong-shape file through
 * unchecked. Wrap the parse and validate each entry's source with
 * isValidClaimSource — composed from the SAME guard functions
 * (isCitation/isByteCitation/…) that checkClaims dispatches on, so the two stay
 * aligned as long as those guards remain the single definition (isValidClaimSource
 * does not re-implement them). Both failures surface as a controlled error that
 * names the offending file. A single Claim OBJECT is normalised to a one-element
 * list, exactly as loadClaims did inline.
 */
export function loadClaimsFile(filePath: string): Claim[] {
  const label = basename(filePath)
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(filePath, 'utf8'))
  } catch (e) {
    throw new Error(`claims file ${label} is not valid JSON: ${e instanceof Error ? e.message : String(e)}`)
  }
  const entries: unknown[] = Array.isArray(parsed) ? parsed : [parsed]
  for (const entry of entries) {
    const source = entry == null ? undefined : (entry as { source?: unknown }).source
    if (!isValidClaimSource(source)) {
      throw new Error(`claims file ${label} has a malformed claim (each entry needs a source citation the checker accepts)`)
    }
  }
  return entries as Claim[]
}

/** Every claim in docs/rom-study/claims/*.json, flattened across files. Each file
 *  is parsed and shape-checked by {@link loadClaimsFile} (df1-6). */
export function loadClaims(dir: string = claimsDir): Claim[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => loadClaimsFile(join(dir, f)))
}

/** The TEXT-citation shape of a Claim's `source` (an assembler line, re-opened
 *  byte-for-byte), narrowed out of the {text | byte} union `Claim['source']`. */
export type TextClaim = Claim & { source: Extract<Claim['source'], { verbatim: string }> }

/** Narrow a Claim to its TEXT-citation shape (`{ file, line, verbatim }`); false for
 *  a BYTE citation (`{ file, offset, bytes }`). The claims-arm suites cite .MAC lines
 *  only, so they read `.line`/`.verbatim` off the real union through this guard
 *  instead of re-declaring a local text-only `Claim` interface (ml5-6). */
export function isTextClaim(c: Claim): c is TextClaim {
  // Guard `c.source` first — matches the sibling defensive convention in claimCovers
  // (`if (!src || !('line' in src))`), so a null source smuggled past validation
  // returns a controlled `false` rather than throwing on the `in` operator (ml5-6
  // review, lang-review #1).
  return c.source != null && 'verbatim' in c.source
}

/** Does this claim pin a line inside the cited range? A BYTE citation (ml2-1, the
 *  picture EPROMs) has no `line` and pins no prose line, so it never covers a prose
 *  `FILE:LINESPEC` citation — narrow it out. */
export function claimCovers(claim: Readonly<Claim>, c: Readonly<ProseCitation>): boolean {
  const src = claim.source
  if (!src || !('line' in src)) return false
  return basename(src.file) === c.file && src.line >= c.start && src.line <= c.end
}

/** Is any of `claims` covering this citation? */
export function coveredBy(claims: readonly Claim[], c: Readonly<ProseCitation>): boolean {
  return claims.some((cl) => claimCovers(cl, c))
}

/**
 * The sweep itself: which prose citations in `files` have NO covering claim.
 * Deduped by the citation as written, so the report reads like the fix list.
 * This is the single function the gate asserts is empty.
 */
export function uncoveredCitations(claims: readonly Claim[], files: readonly string[] = DOSSIER_FILES): string[] {
  return [...new Set(allProseCitations(files).filter((c) => !coveredBy(claims, c)).map((c) => c.raw))]
}
