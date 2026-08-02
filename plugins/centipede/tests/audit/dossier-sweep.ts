// tests/audit/dossier-sweep.ts
//
// Story cp6-1 — RED phase (Leeloo / TEA). The dossier COVERAGE sweep, lifted out
// of tests/audit/citations.test.ts so it has exactly ONE implementation and that
// implementation can be mutation-tested.
//
// ─── WHY THIS FILE EXISTS AT ALL ─────────────────────────────────────────────
// centipede's citation gate has two halves and only one of them watched a NEW
// doc. The BYTE half re-opens every claim in docs/rom-study/claims/*.json —
// loadClaims() globs the whole directory, so a new 16-sound.json is byte-verified
// the moment it lands. The COVERAGE half — "every primary-source citation in the
// prose has a covering claim" — was HARDCODED to brief.md + glossary.md, so a
// sound.md dropped beside them would have been swept by NOTHING and its prose
// citations would have rotted unwatched. That is not hypothetical: cp6-1's own
// story text shipped THREE wrong line ranges, one of which fenced an in-scope
// constant out of the baker's reach.
//
// joust already solved this by replacing the hardcoded pair with a DOSSIER_FILES
// list (plugins/joust/tests/audit/citations.test.ts:603). This follows that
// precedent — with one addition joust does not have: the sweep is now a MODULE
// rather than closures inside a test file, so cp6-1's AC-7 mutation proof can
// call the REAL sweep with one claim removed and require it to redden. A
// mutation proof that exercised a copy of the sweep would prove only that the
// copy has teeth.
//
// SCOPE FENCE (cp6-1 setup ruling): centipede also carries subsystems.md,
// pictures.md and open-questions.md that nothing sweeps. Enrolling THOSE is a
// separate story — filed as a Delivery Finding, not fixed here. This list gains
// cp6-1's own doc and stops.

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Claim } from '../../tools/audit/check-citations.mjs'

// tests/audit/dossier-sweep.ts → the plugin root is two levels up.
export const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const romStudyDir = join(pluginRoot, 'docs', 'rom-study')
export const claimsDir = join(romStudyDir, 'claims')

/**
 * Every dossier file the coverage sweep scans.
 *
 * `sound.md` is cp6-1's POKEY dossier. It is listed here BEFORE it exists, and
 * that is the RED: the sweep names a file that is not there, so the gate fails
 * loudly instead of quietly scanning two files and calling it coverage.
 */
export const DOSSIER_FILES = ['brief.md', 'glossary.md', 'sound.md'] as const

/** A primary-source line citation extracted from the dossier prose. */
export interface ProseCitation {
  /** Bare filename as written, e.g. "CENTI4.MAC". */
  file: string
  start: number
  end: number
  /** The citation as the prose spells it, e.g. "CENTI4.MAC:2455-2456". */
  raw: string
  /** Which dossier file it came from — so a failure names the doc to fix. */
  from: string
}

/**
 * Extract every backtick-wrapped primary-source citation `FILE:LINESPEC` from a
 * dossier file, where FILE ends .MAC/.DOC/.MAP and LINESPEC is a comma list of
 * N or N-M.
 *
 * Excludes, by construction: MAME (`centiped.cpp:*` — secondary, external, never
 * byte-opened), bare file mentions with no `:line`, and globs (`CENTI*.MAC` — the
 * `*` fails the file class).
 *
 * THE TRAP THIS REGEX SETS, WHICH cp6-1 GUARDS SEPARATELY: it only matches the
 * BACKTICK-WRAPPED form. An unbackticked `CENTI4.MAC:2455` in the prose, or the
 * bare-colon continuation form `:2455`, is INVISIBLE here — a citation the sweep
 * cannot see is a citation nothing re-checks. sound-dossier.test.ts asserts
 * sound.md carries neither spelling.
 */
export function extractProseCitations(md: string, from = ''): ProseCitation[] {
  const out: ProseCitation[] = []
  const re = /`([\w./]+\.(?:MAC|DOC|MAP)):([\d,\-]+)`/g
  for (const m of md.matchAll(re)) {
    const file = basename(m[1]) // normalise any revision.vN/ prefix away
    for (const part of m[2].split(',')) {
      const range = part.match(/^(\d+)-(\d+)$/)
      if (range) out.push({ file, start: +range[1], end: +range[2], raw: `${m[1]}:${part}`, from })
      else if (/^\d+$/.test(part)) out.push({ file, start: +part, end: +part, raw: `${m[1]}:${part}`, from })
    }
  }
  return out
}

/**
 * Read a dossier file, or return '' when it does not exist.
 *
 * Deliberately NOT a throw: in the RED state sound.md is absent, and a throw here
 * would abort the whole suite with a module-level ENOENT — a harness error, not a
 * feature-absent failure. The `dossier files exist` test reports the absence in
 * its own words instead.
 */
export function readDossier(name: string): string {
  const p = join(romStudyDir, name)
  return existsSync(p) ? readFileSync(p, 'utf8') : ''
}

/** Every prose citation across `files` (defaults to the whole enrolled list). */
export function allProseCitations(files: readonly string[] = DOSSIER_FILES): ProseCitation[] {
  return files.flatMap((f) => extractProseCitations(readDossier(f), f))
}

/** Every claim in docs/rom-study/claims/*.json, flattened across files. */
export function loadClaims(): Claim[] {
  if (!existsSync(claimsDir)) return []
  return readdirSync(claimsDir)
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => JSON.parse(readFileSync(join(claimsDir, f), 'utf8')) as Claim | Claim[])
    .flat()
}

/** Does this claim pin a line inside the cited range? */
export function claimCovers(claim: Claim, c: ProseCitation): boolean {
  return (
    !!claim.source &&
    basename(claim.source.file) === c.file &&
    claim.source.line >= c.start &&
    claim.source.line <= c.end
  )
}

/** Is any of `claims` covering this citation? */
export function coveredBy(claims: Claim[], c: ProseCitation): boolean {
  return claims.some((cl) => claimCovers(cl, c))
}

/**
 * The sweep itself: which prose citations in `files` have NO covering claim.
 * Deduped by the citation as written, so the report reads like the fix list.
 *
 * This is the single function the gate asserts is empty AND the one cp6-1's
 * mutation proof calls with a claim removed. One implementation, two callers —
 * which is the whole reason this module exists.
 */
export function uncoveredCitations(claims: Claim[], files: readonly string[] = DOSSIER_FILES): string[] {
  return [...new Set(allProseCitations(files).filter((c) => !coveredBy(claims, c)).map((c) => c.raw))]
}
