// tests/helpers/dossier-sweep.ts
//
// Story mc2-6 — RED phase (Han Solo / TEA). The dossier prose-citation COVERAGE
// sweep, ported from plugins/centipede/tests/audit/dossier-sweep.ts (the module
// form, so mc2-6's mutation proof can call the REAL sweep — a proof that
// exercised a copy would prove only that the copy has teeth) with joust's
// two-bucket primary/external reporting. REUSE-FIRST (epic mc2): coverage is
// decided by claims.ts `claimCovers`, imported, never reimplemented
// (lang-review #218: one concept must not grow two helpers).
//
// ─── WHY THIS FILE EXISTS ────────────────────────────────────────────────────
// mc's citation gate has two halves and only one is built. The BYTE half
// (tools/audit/check-citations.mjs, mc2-1) re-opens every committed claim
// against the vendored REV-01 source. The COVERAGE half — "every line-citation
// in the dossier PROSE is pinned by a claim" — does not exist: nothing sweeps
// brief.md / subsystems.md / glossary.md, so a wrong line ref in prose rots
// unwatched. Not hypothetical: mc2-2 shipped FRAME refs (`W3DSUP.MAC:19`,
// `W3MAIN:2039`) that brief.md:63 now records as "logical/approximate" — this
// sweep would have flagged both, because no byte-verified claim can cover them.
//
// ─── MC'S CITATION GRAMMAR — WHAT THE SWEEP SEES, AND WHAT IT KNOWS IT DOESN'T
// The enrolled docs spell citations these ways (RED-state census 2026-08-06;
// the mc2-6 GREEN then normalised the deprecated spellings to zero, and the
// gates below keep them there):
//
//   CANONICAL  `W3COMN.MAC:39`   file + extension; the line is PHYSICAL, which
//                                is the convention mc2-1 RESOLVED: every
//                                committed claim cites the physical line where
//                                its byte-verified verbatim sits.
//   LEGACY     `W3MAIN:475`      bare module, no extension. 43 of these stood
//                                at RED; GREEN measured every one and appended
//                                `.MAC` — 41 were ALREADY physical .SBTTL
//                                anchor lines (subsystems.md was written under
//                                the physical convention, merely extensionless)
//                                and 2 brief.md stragglers were genuinely
//                                logical and were re-cited/reworded. 0 remain;
//                                the legacy gate reddens on any return.
//
// WHY the legacy spelling is BANNED rather than interpreted: nothing in the
// bare form says which basis it uses. W3MAIN.MAC is double-spaced, so a
// LOGICAL (non-blank) ordinal ≈ physical/2 — brief.md's old `W3DSUP:792`
// colour-cycling cite really meant the write at physical 1641 (logical 792;
// physical 792 is a blank line) — and the logical→physical mapping is
// ambiguous by measurement (ceil(physical/2) vs true non-blank count drift
// ~6 lines deep in the file; mc1-4 review record). Claims cite PHYSICAL
// lines, so coverage against an ambiguous ordinal is unfalsifiable. The jt1-8
// precedent: make the spelling visible, gate it to zero, resolve each by
// human judgement — the coverage gate then corroborates every rewrite,
// because only a claim byte-verified at that physical line can cover it.
//
// External secondary source: MAME's `missile.cpp` (the O-2 timebase facts the
// 1982 tree never states). Cited with lines in brief.md; never byte-opened —
// covered by schema-only claims carrying the self-describing external marker
// (see check-citations.mjs). Reported in its own bucket, joust-style, so Dev
// sees two work items, not one undifferentiated list.
//
// THE TRAP THIS GRAMMAR SETS, GUARDED BELOW: only well-formed ASCII linespecs
// (N, N-M, comma lists) parse. At RED the enrolled docs carried SIX ranges
// using the EN-DASH (U+2013) — `missile.cpp:454–462` and three siblings, one
// with a trailing token (`617–625 get_bit3_addr`), all in brief.md, plus one
// PRIMARY range in glossary.md (`W3COMN.MAC:123–145`) that this sweep's first
// run surfaced after an ASCII grep at story setup had counted only the
// brief.md five. GREEN normalised all six to ASCII; the malformed gate
// reddens on any return. A part that looks like a linespec and does not parse
// as one lands in the `malformed` bucket (centipede round-2, Reviewer M3: an
// unparseable part must never fall off the end of the loop with no record).
//
// ─── KNOWN-INVISIBLE SPELLINGS — WHAT THIS SWEEP CANNOT SEE (disclosed) ─────
// Two spellings inside the enrolled set escape BOTH regexes by construction,
// and a reader of this module must not believe the sweep sees everything:
//
//   • The bare-colon continuation form `` `:238 MAINLINE` `` (module named in
//     an adjacent table cell, no file inside the backticks). brief.md's
//     "Subsystem map" and "Cited constants" tables (brief.md:76-109) cite this
//     way, by the deliberate LOGICAL convention subsystems.md:17-19 documents
//     — and for the same routine those tables and subsystems.md now disagree
//     (`:238` vs the byte-verified `W3MAIN.MAC:475` for MAINLINE). Closing
//     this form — the jt1-8 analogue: rewrite the tables canonical and teach
//     the malformed gate to flag backticked bare-`:N` — is the filed
//     follow-up story (mc2-6 Delivery Findings), NOT silently in scope here.
//   • A bare NON-W3 module cite (`COIN65:100`, `COND65:100`) — the legacy
//     regex is W3-anchored because only W3 modules were ever cited bare; a
//     bare COIN65/COND65 cite would land in NO bucket. The canonical form
//     (`COIN65.MAC:100`) IS seen. If those modules ever enter the dossier,
//     widen the legacy regex with them.

import { existsSync, readFileSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { claimCovers, type Claim } from './claims.js'

// tests/helpers/dossier-sweep.ts → the plugin root is two levels up.
export const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const romStudyDir = join(pluginRoot, 'docs', 'rom-study')

/**
 * Every dossier file the coverage sweep scans. mc's standing rom-study docs —
 * the per-subsystem index and per-symbol dictionary mc2-2 built, plus the
 * brief they expand. timebase.md and starting-cities.md are NOT enrolled:
 * that is mc2-6's scope fence (filed as a Delivery Finding, not fixed here).
 */
export const DOSSIER_FILES = ['brief.md', 'subsystems.md', 'glossary.md'] as const

/** A line citation extracted from the dossier prose, canonical spelling. */
export interface ProseCitation {
  /** Bare filename as written, e.g. "W3COMN.MAC" or "missile.cpp". */
  file: string
  start: number
  end: number
  /** The citation as the prose spells it, e.g. "W3COMN.MAC:39". */
  raw: string
  /** Which dossier file it came from — so a failure names the doc to fix. */
  from: string
  /** True for MAME `missile.cpp` — schema-only claims, never byte-opened. */
  external: boolean
}

/** What one pass over a dossier file found: citations, and the two wreckage buckets. */
export interface CitationScan {
  citations: ProseCitation[]
  /** Bare-module logical-line spellings (`W3MAIN:475`) awaiting normalisation. */
  legacy: string[]
  /** Cite-lookalikes whose linespec the grammar cannot parse (en-dash, reversed, junk). */
  malformed: string[]
}

/** Strictly parse one comma-part of a linespec: N or N-M (ASCII, ordered). */
function parsePart(part: string): { start: number; end: number } | undefined {
  const range = part.match(/^(\d+)-(\d+)$/)
  if (range && +range[1] <= +range[2]) return { start: +range[1], end: +range[2] }
  if (/^\d+$/.test(part)) return { start: +part, end: +part }
  return undefined
}

/**
 * Extract every backtick-wrapped citation from a dossier file's markdown.
 *
 * Two spellings are matched (both must be VISIBLE — lang-review #377: a sweep
 * that sees only one spelling is defeated by the other):
 *   canonical `FILE.MAC:SPEC` / `missile.cpp:SPEC` → citations (or malformed)
 *   legacy    `W3MODULE:SPEC` (no extension)       → legacy    (or malformed)
 * Excludes, by construction: bare file mentions with no `:spec`, and prose
 * that never wears backticks (the docs carry no code fences — measured).
 */
export function scanProseCitations(md: string, from = ''): CitationScan {
  const citations: ProseCitation[] = []
  const legacy: string[] = []
  const malformed: string[] = []

  const canonical = /`([\w./]+\.(?:MAC|cpp)):([^`]+)`/g
  for (const m of md.matchAll(canonical)) {
    const file = basename(m[1]) // normalise any dir prefix away
    const external = file.endsWith('.cpp')
    for (const part of m[2].split(',')) {
      const span = parsePart(part)
      if (span) citations.push({ file, ...span, raw: `${m[1]}:${part}`, from, external })
      else malformed.push(`${m[1]}:${part}`)
    }
  }

  // Bare module, no dot — the backtick anchor keeps this from re-matching the
  // tail of a canonical cite (`W3MAIN.MAC:781` fails at the `.`).
  const bare = /`(W3[A-Z0-9]+):([^`]+)`/g
  for (const m of md.matchAll(bare)) {
    for (const part of m[2].split(',')) {
      if (parsePart(part)) legacy.push(`${m[1]}:${part}`)
      else malformed.push(`${m[1]}:${part}`)
    }
  }

  return { citations, legacy, malformed }
}

/** Every well-formed canonical citation in `md` — one scanner, several views. */
export function extractProseCitations(md: string, from = ''): ProseCitation[] {
  return scanProseCitations(md, from).citations
}

/** Read a dossier file, or '' when absent — the existence test reports absence in its own words. */
export function readDossier(name: string): string {
  const p = join(romStudyDir, name)
  return existsSync(p) ? readFileSync(p, 'utf8') : ''
}

/** Every canonical citation across `files` (defaults to the whole enrolled list). */
export function allProseCitations(files: readonly string[] = DOSSIER_FILES): ProseCitation[] {
  return files.flatMap((f) => extractProseCitations(readDossier(f), f))
}

/** Every legacy bare-module spelling across `files` — the gate requires this EMPTY. */
export function allLegacyCitations(files: readonly string[] = DOSSIER_FILES): string[] {
  return files.flatMap((f) => scanProseCitations(readDossier(f), f).legacy.map((raw) => `${raw} (in ${f})`))
}

/** Every cite-lookalike across `files` that cannot be parsed — the gate requires this EMPTY. */
export function allMalformedCitations(files: readonly string[] = DOSSIER_FILES): string[] {
  return files.flatMap((f) => scanProseCitations(readDossier(f), f).malformed.map((raw) => `${raw} (in ${f})`))
}

/** Is any committed claim pinning a line inside this cited range? (claims.ts decides.) */
export function coveredBy(claims: readonly Claim[], c: Readonly<ProseCitation>): boolean {
  return claimCovers(claims, c.file, c.start, c.end)
}

/**
 * The sweep itself: which of `citations` have NO covering claim. Deduped by the
 * citation as written, so the report reads like the fix list.
 *
 * Deliberately PURE (claims and citations in, raws out): the disk gate calls it
 * with `allProseCitations()`, and the mc2-6 mutation proof calls the SAME
 * function with a synthetic dossier and a claim removed — one implementation,
 * two callers, which is the whole reason this module exists (lang-review #142:
 * every guard must be mutation-tested; a copy with teeth proves nothing).
 */
export function uncoveredCitations(claims: readonly Claim[], citations: readonly ProseCitation[]): string[] {
  return [...new Set(citations.filter((c) => !coveredBy(claims, c)).map((c) => c.raw))]
}
