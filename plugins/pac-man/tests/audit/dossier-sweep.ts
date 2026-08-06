// tests/audit/dossier-sweep.ts
//
// Story pm1-2 — the dossier COVERAGE sweep, lifted out of citations.test.ts so it
// has exactly ONE implementation (the centipede/cp6-1 pattern) that the coverage
// gate and any later mutation proof both call.
//
// ─── WHAT THE SWEEP GUARDS ───────────────────────────────────────────────────
// The BYTE half of the gate re-opens every claim in docs/rom-study/claims/*.json.
// The COVERAGE half — "every primary-source citation in the prose has a covering
// claim" — is what stops a number appearing in brief.md/glossary.md with nothing
// re-checking it. A citation the sweep cannot SEE is a citation nothing verifies,
// so the extractor and its floor are load-bearing.
//
// ─── THE pac-man CITATION VOCABULARY ─────────────────────────────────────────
// A primary-source citation is the backtick-wrapped `pacman.asm:<addr>`, where
// <addr> is the hex ROM address (`2b17`, `36bf`, `4e6f`). That is the vocabulary
// PROVENANCE.md fixes and every later task writes. A claim COVERS such a citation
// when its `addr` equals the cited address. (The byte-for-byte truth of that claim
// is the checker's job — this module only asks whether a claim exists at all.)

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Claim } from '../../tools/audit/check-citations.mjs'

// tests/audit/dossier-sweep.ts → the plugin root is two levels up.
export const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const romStudyDir = join(pluginRoot, 'docs', 'rom-study')
export const claimsDir = join(romStudyDir, 'claims')

/** Every dossier file the coverage sweep scans. */
export const DOSSIER_FILES = ['brief.md', 'glossary.md'] as const

/** A primary-source address citation extracted from the dossier prose. */
export interface ProseCitation {
  /** The hex ROM address as written, lower-cased, e.g. "2b17". */
  addr: string
  /** The citation as the prose spells it, e.g. "pacman.asm:2b17". */
  raw: string
  /** Which dossier file it came from — so a failure names the doc to fix. */
  from: string
}

/**
 * Extract every backtick-wrapped `pacman.asm:<addr>` citation from a dossier file.
 * <addr> is 1-4 hex digits. Deduped per file, address lower-cased.
 *
 * THE TRAP THIS REGEX SETS: it only matches the BACKTICK-WRAPPED form. An
 * unbackticked `pacman.asm:2b17` in prose is INVISIBLE here — a citation the sweep
 * cannot see is a citation nothing re-checks.
 */
export function extractProseCitations(md: string, from = ''): ProseCitation[] {
  const re = /`pacman\.asm:([0-9a-f]{1,4})`/gi
  const out: ProseCitation[] = []
  for (const m of md.matchAll(re)) {
    out.push({ addr: m[1].toLowerCase(), raw: `pacman.asm:${m[1].toLowerCase()}`, from })
  }
  return out
}

/**
 * Read a dossier file, or return '' when it does not exist. Deliberately NOT a
 * throw: an absent file is reported by the `dossier files exist` test in its own
 * words, not as a module-level ENOENT that aborts the whole suite.
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

/** Does this claim pin the cited ROM address? */
export function claimCovers(claim: Readonly<Claim>, c: Readonly<ProseCitation>): boolean {
  return typeof claim.addr === 'string' && claim.addr.toLowerCase() === c.addr
}

/** Is any of `claims` covering this citation? */
export function coveredBy(claims: readonly Claim[], c: Readonly<ProseCitation>): boolean {
  return claims.some((cl) => claimCovers(cl, c))
}

/**
 * The sweep itself: which prose citations in `files` have NO covering claim.
 * Deduped by the citation as written, so the report reads like the fix list.
 */
export function uncoveredCitations(claims: readonly Claim[], files: readonly string[] = DOSSIER_FILES): string[] {
  return [...new Set(allProseCitations(files).filter((c) => !coveredBy(claims, c)).map((c) => c.raw))]
}

// ─── THE ×10 BCD DECODER (the one PROVENANCE.md trap) ─────────────────────────
// The SCORING TABLE at 2b17 stores each value as a little-endian word of packed
// BCD with an implied trailing zero: the two data bytes shown after the address
// (`2b1b  2000` → bytes 0x20, 0x00) form the little-endian word 0x0020, read as
// the DECIMAL digits "0020" = 20, then ×10 = 200. This is re-derived from a
// claim's own verbatim so a correct byte quote under a wrong `value` still reddens.

/** The 4-hex-digit data word printed after the address on a `pacman.asm` line. */
export function dataWordOf(verbatim: string): string | null {
  const m = verbatim.match(/^[0-9a-f]{4}\s+([0-9a-f]{4})\b/i)
  return m ? m[1].toLowerCase() : null
}

/** Decode a scoring-table data word (bytes in memory order) to its ×10 BCD value. */
export function decodeBcdX10(dataWord: string): number {
  const b0 = dataWord.slice(0, 2)
  const b1 = dataWord.slice(2, 4)
  const littleEndian = b1 + b0 // memory order [b0,b1] → LE word, e.g. "01"+"60"="0160"
  return Number(littleEndian) * 10 // BCD digits read as decimal, ×10 (implied trailing zero)
}
