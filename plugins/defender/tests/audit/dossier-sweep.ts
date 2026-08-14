// tests/audit/dossier-sweep.ts
//
// Story df1-1 (GREEN) — the dossier COVERAGE sweep for Defender, ported from
// plugins/millipede/tests/audit/dossier-sweep.ts (ml1-1, itself centipede's
// cp6-1). It lives in ONE module so it has exactly one implementation and that
// implementation is what tests/audit/citations.test.ts exercises with inline
// fixtures.
//
// ─── ENROLMENT MODEL ─────────────────────────────────────────────────────────
// df1-1 shipped this gate BEFORE any dossier existed (DOSSIER_FILES started
// empty, the real-dossier gate green-on-empty, the sweep's teeth proven by the
// inline fixtures in citations.test.ts — extract → detect-uncovered → covered →
// malformed-reported — which need no real file). df1-2 enrolled brief.md, the
// first dossier file, so `uncoveredCitations(loadClaims())` now bites for real:
// every backticked citation in an enrolled doc must have a covering claim. Each
// later story (df1-3 glossary/subsystems/open-questions, df1-4 board-facts)
// enrols its own doc; the byte side of the gate (loadClaims globs the whole
// claims/ dir) already watches any *.json the moment it lands.
//
// GRAMMAR: backtick-wrapped `FILE:LINESPEC` where FILE ends .SRC (defender's
// twelve shipped files are all .SRC — assembler and the prose INFO.SRC alike) and
// LINESPEC is a comma list of N or N-M. The epic fixes the citation vocabulary as
// defender/<FILE>.SRC:<line>, while a claim's source.file is the BARE filename
// the checker resolves at the tree root — the basename() normalisation below
// bridges the two, so a `defender/`-prefixed prose citation matches a bare claim.
// MAME (`williams.cpp:*` / `williams_m.cpp:*`) is secondary, external, never
// byte-opened, and by construction excluded (`.cpp` is not in the file class).

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Claim } from '../../tools/audit/check-citations.mjs'

// tests/audit/dossier-sweep.ts → the plugin root is two levels up.
export const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const romStudyDir = join(pluginRoot, 'docs', 'rom-study')
export const claimsDir = join(romStudyDir, 'claims')

/**
 * Every dossier file the coverage sweep scans. df1-2 enrolled brief.md (the first
 * dossier file); df1-3 enrolled glossary.md/subsystems.md/open-questions.md;
 * df1-4 adds board-facts.md. Each enrolled file's every backticked prose citation
 * must be pinned by a claim in claims/, or the real-dossier gate reddens.
 */
export const DOSSIER_FILES: readonly string[] = ['brief.md', 'glossary.md', 'subsystems.md', 'open-questions.md']

/** A primary-source line citation extracted from the dossier prose. */
export interface ProseCitation {
  /** Bare filename, path prefix normalised away, e.g. "PHR6.SRC". */
  file: string
  start: number
  end: number
  /** The citation as the prose spells it, e.g. "defender/PHR6.SRC:11". */
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
 * dossier file, where FILE ends .SRC and LINESPEC is a comma list of N or N-M.
 *
 * Excludes, by construction: MAME (`williams.cpp:*` — secondary, external, never
 * byte-opened), bare file mentions with no `:line`, and globs (`DEF*.SRC` — the
 * `*` fails the file class).
 *
 * THE TRAP THIS REGEX SETS: it only matches the BACKTICK-WRAPPED form. An
 * unbackticked `PHR6.SRC:11` in the prose, or a bare-colon continuation `:11`,
 * is INVISIBLE here — a citation the sweep cannot see is a citation nothing
 * re-checks. Later dossier-specific suites assert the prose carries neither
 * spelling; this module's job is only to sweep the backticked form.
 */
export function scanProseCitations(md: string, from = ''): CitationScan {
  const citations: ProseCitation[] = []
  const malformed: string[] = []
  const re = /`([\w./]+\.SRC):([\d,\-]+)`/g
  for (const m of md.matchAll(re)) {
    const file = basename(m[1]) // normalise the epic's defender/ prefix (or any path) away
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
 * Deliberately NOT a throw: in df1-1 no dossier file exists yet, and a throw here
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

/** Every claim in docs/rom-study/claims/*.json, flattened across files. */
export function loadClaims(): Claim[] {
  if (!existsSync(claimsDir)) return []
  return readdirSync(claimsDir)
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => JSON.parse(readFileSync(join(claimsDir, f), 'utf8')) as Claim | Claim[])
    .flat()
}

/** Does this claim pin a line inside the cited range? A BYTE citation (no `line`)
 *  pins no prose line, so it never covers a prose `FILE:LINESPEC` citation —
 *  narrow it out. */
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
