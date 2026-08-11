// tools/audit/check-citations.d.mts
//
// Story ml1-1 — the TYPE CONTRACT for the single-sided Millipede citation checker.
// TEA (Leeloo) authors the tests/audit/citations.test.ts suite that pins the
// behaviour; Dev (Korben, GREEN) implements the runtime module
// tools/audit/check-citations.mjs to satisfy it, and later ml* stories convert the
// dossier into docs/rom-study/claims/*.json.
//
// It is the companion declaration for a plain-.mjs ESM module, so the strict TS
// project (no allowJs) can import the checker from a .ts test without TS7016 — the
// convention centipede/tempest use.
//
// SINGLE-SIDED SCHEMA (rom-source-study skill): a claim is an assertion ABOUT the
// 1982 machine, cited to primary source. There is no clone yet, so there is no
// `ours` side — the ours/theirs/class/recommendation machinery tempest carries is
// dropped. A claim is: { id, claim, source, corroboration?, counts? }.

/**
 * A single-sided claim: one assertion about the machine, cited to a byte-exact
 * line of the vendored 1982 Atari source.
 */
export interface Claim {
  /** Stable, unique id across the whole claims set (e.g. "TB-001"). */
  id: string
  /** The human-readable assertion this citation supports. */
  claim: string
  /**
   * Primary-source citation into the vendored tree
   * (arcade/reference/original-source/millipede). This is RE-OPENED byte-for-byte.
   * Millipede is a SINGLE revision, so `file` is a bare filename resolved at the
   * tree root. A file already carrying a path separator is treated as an exact
   * tree-relative path and contained inside the vendored root.
   */
  source: { file: string; line: number; verbatim: string }
  /**
   * Optional secondary corroboration — typically a MAME driver reference
   * (milliped.cpp), which lives OUTSIDE the vendored tree and is absent from CI.
   * Its SHAPE is schema-validated; it is never byte-opened.
   */
  corroboration?: unknown
  /**
   * Optional COUNT assertions. A claim's prose often embeds a reproducible tally
   * ("the PTS table is 16 entries"). The verbatim/line gate cannot see such a
   * number, so it rots silently when the source drifts. Each entry RE-DERIVES a
   * tally from the vendored tree and compares it to `expected` — shape-checked
   * always, re-run only when `vendoredRoot` is present (schema-only on CI, exactly
   * like the byte gate). Each mismatched entry is one error, so a claim with two
   * bad `counts` produces two errors (not one per claim).
   */
  counts?: CountAssertion[]
}

/**
 * A machine-checkable tally embedded in a claim's prose. The checker walks the
 * in-scope files, counts LINES matching `pattern` (line-oriented, mirroring
 * `grep -n <pattern>` — not global matches within a line), and compares the total
 * to `expected`.
 */
export interface CountAssertion {
  /**
   * Regex SOURCE (a string, fed to `new RegExp(pattern)`) tested against each
   * line. E.g. `"^PTS:"` counts lines that begin `PTS:`.
   */
  pattern: string
  /**
   * Optional tree-relative subpath scoping the scan — a directory (walked
   * recursively) or a single file. Absent ⇒ the WHOLE vendored tree, i.e. the
   * `grep -rn … reference/original-source/millipede` recipe. Must stay inside the
   * tree after normalisation (same containment rule as `source.file`).
   */
  scope?: string
  /** The tally the prose asserts. Re-derived and compared when `vendoredRoot` is non-null. */
  expected: number
  /** Optional human note — which prose figure this guards, or a derivation. */
  note?: string
}

export interface CheckOpts {
  /**
   * Absolute path to the vendored tree root
   * (arcade/reference/original-source/millipede), or `null` to skip every
   * byte-verification and run schema-only. CI lacks the orchestrator's reference/
   * tree — it passes `null` and stays green (AC-5).
   */
  vendoredRoot: string | null
}

/**
 * Validate a set of claims. Returns one error string per problem; an empty array
 * means every claim is well-formed and (when `vendoredRoot` is provided) every
 * cited line re-opens byte-for-byte.
 */
export function checkClaims(claims: Claim[], opts: CheckOpts): string[]
