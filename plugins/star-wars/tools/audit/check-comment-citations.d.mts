// Type declaration for the comment-citation checker, so
// `tests/audit/comment-citations.test.ts` can import it under strict `tsc --noEmit`
// (moduleResolution: bundler) without a TS7016 "no declaration file" error. The
// implementation is `check-comment-citations.mjs`; this only describes its public
// surface. See that file for behaviour and for the measured association rule.

/** One citation lifted out of a source comment. */
export interface Citation {
  /** The cited filename as written, or the inherited one for a bare `:N-M` span. */
  file: string
  /** First line of the span; `null` for a bare `<file>` reference with no line. */
  start: number | null
  /** Last line of the span. Equals `start` for a single-line citation. */
  end: number | null
  /** The immediately-adjacent quoted verbatim, or `null` when none is adjacent. */
  quote: string | null
  /** True when the span was written bare (`:2273-2290`) and the filename inherited. */
  bare: boolean
  /** True when the prose disowns this citation with a `RETIRED:` marker. */
  retired: boolean
  /** Offset of the citation within the unwrapped text. */
  index: number
  /** For a bare span, every ROM file named before it, most recent first — the checker
   *  re-picks from these by which one actually verifies the quote. Empty otherwise. */
  candidates: string[]
}

/** Options shared by the checking entry points. `repoRoot` defaults to `swRoot/../..`
 *  and is what lets `@shared/*` modules and root-level files resolve. */
export interface CheckOptions {
  swRoot: string
  romDir: string
  repoRoot?: string
  fromFile?: string
}

/** Pull every citation out of a block of source text. Handles all three forms:
 *  `<file>:<span>`, a bare `:<span>` inheriting the nearest preceding filename, and a
 *  bare `<file>` with no line. */
export function extractCitations(text: string): Citation[]

/** Re-open every citation in `text`; returns human-readable errors, empty when clean.
 *  A stale span is reported together with the line it moved to. */
export function checkCitations(text: string, opts: CheckOptions): string[]

/** Scan the plugin's sources, tests and design specs. */
export function checkTree(opts: CheckOptions & { roots?: readonly string[] }): string[]

/** Marker a file may carry to opt out of the scan entirely. */
export const IGNORE_PRAGMA: string

/** The checker's honest scope — what it does NOT catch, exported so a test can assert
 *  it rather than let a green run be read as "the citations are all true". */
export const UNCATCHABLE: string
