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
  /** An adjacent quote that was REJECTED as a non-fragment — a single bare token, almost
   *  always one of our own identifiers naming what the citation explains. `null` when
   *  nothing was adjacent at all. The two cases used to collapse into the same `null`,
   *  which is why the single-token blind spot reads as a limitation separate from the
   *  range-only class when it is a subset of it. */
  droppedQuote: string | null
  /** True when the span was written bare (RETIRED::2273-2290) and the filename inherited. */
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
 *  and is what lets `@shared/*` modules and root-level files resolve.
 *
 *  There is deliberately NO citing-file option. One was declared here and passed by
 *  every caller for the whole of sw8-18 without the implementation ever reading it, so
 *  a mutation test that varied it to "simulate the citation living in a different file"
 *  proved nothing. Measured before removing it: zero relative-path citations exist in
 *  the scanned tree, and the basename collisions that do exist (`input.ts`, `audio.ts`,
 *  `font.ts`, `glow.ts` — plugin versus `src/shared`) are already resolved by the
 *  path-qualified rule. Resolution is a function of the CITED name and the roots. */
export interface CheckOptions {
  swRoot: string
  romDir: string
  repoRoot?: string
}

/** Pull every citation out of a block of source text. Handles all three forms:
 *  `<file>:<span>`, a bare `:<span>` inheriting the nearest preceding filename, and a
 *  bare `<file>` with no line. */
export function extractCitations(text: string): Citation[]

/** Re-open every citation in `text`; returns human-readable errors, empty when clean.
 *  A stale span is reported together with the line it moved to. */
export function checkCitations(text: string, opts: CheckOptions): string[]

/** Scan the plugin's sources, tests, design specs and tooling. `onSkip` receives every
 *  file dropped by the opt-out pragma; it defaults to writing to stderr, because a file
 *  that silently leaves a completeness check looks exactly like one that passed it. */
export function checkTree(
  opts: CheckOptions & { roots?: readonly string[]; onSkip?: (file: string) => void },
): string[]

/** The directories scanned when `roots` is not given — `src`, `tests`, the design specs
 *  and `tools`. Exported so a test can assert the scanned surface, not assume it. */
export function defaultRoots(swRoot: string): string[]

/** File extensions the walk collects. Includes `.mts`: `extname` of a `.d.mts` file is
 *  `.mts`, so this tool's own type declarations are invisible without it. */
export const SCAN_EXT: readonly string[]

/** Marker a file may carry to opt out of the scan entirely. */
export const IGNORE_PRAGMA: string

/** True when `raw` opts itself out. The pragma must OPEN a leading comment — an
 *  unanchored substring test fired on any MENTION and silently dropped the whole file. */
export function hasPragma(raw: string): boolean

/** The checker's honest scope — what it does NOT catch, exported so a test can assert
 *  it rather than let a green run be read as "the citations are all true". */
export const UNCATCHABLE: string
