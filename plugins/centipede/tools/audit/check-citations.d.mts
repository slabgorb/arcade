// tools/audit/check-citations.d.mts
//
// Story cp1-2 — the TYPE CONTRACT for the single-sided citation checker. O'Brien
// (TEA) authors this declaration and the tests/audit/citations.test.ts suite that
// pins the behaviour; Julia (Dev, GREEN) implements the runtime module
// tools/audit/check-citations.mjs to satisfy it and converts the dossier into
// docs/rom-study/claims/*.json.
//
// It is the companion declaration for a plain-.mjs ESM module, so the strict TS
// project (no allowJs) can import the checker from a .ts test without TS7016 —
// the same convention tempest uses (tempest/tools/audit/check-citations.d.mts).
//
// SINGLE-SIDED SCHEMA (rom-source-study skill): a claim is an assertion ABOUT the
// 1981 machine, cited to primary source. There is no clone yet, so there is no
// `ours` side — the whole ours/theirs/class/recommendation machinery tempest
// carries is deliberately dropped. A claim is: { id, claim, source, corroboration? }.

/**
 * A single-sided claim: one assertion about the machine, cited to a byte-exact
 * line of the vendored 1981 Atari source.
 */
export interface Claim {
  /** Stable, unique id across the whole claims set (e.g. "TB-001"). */
  id: string
  /** The human-readable assertion this citation supports. */
  claim: string
  /**
   * Primary-source citation into the vendored tree
   * (arcade/reference/atari-source/centipede). This is RE-OPENED byte-for-byte.
   * `file` is resolved root-first, then revision.v4/ (the target revision), so a
   * bare rev-1 filename (CENDEF.MAC) and a bare rev-4 filename (CENTI4.MAC, which
   * lives only under revision.v4/) both resolve — AC-4. A file already carrying a
   * path separator is treated as an exact tree-relative path.
   */
  source: { file: string; line: number; verbatim: string }
  /**
   * Optional secondary corroboration — typically a MAME driver reference
   * (centiped.cpp), which lives OUTSIDE the vendored tree and is absent from CI.
   * Its SHAPE is schema-validated; it is never byte-opened.
   */
  corroboration?: unknown
}

export interface CheckOpts {
  /**
   * Absolute path to the vendored tree root
   * (arcade/reference/atari-source/centipede), or `null` to skip every
   * byte-verification and run schema-only. CI clones only the centipede subrepo
   * and therefore lacks the orchestrator's reference/ tree — it passes `null`
   * and stays green (AC-3).
   */
  vendoredRoot: string | null
}

/**
 * Validate a set of claims. Returns one error string per problem; an empty array
 * means every claim is well-formed and (when `vendoredRoot` is provided) every
 * cited line re-opens byte-for-byte.
 */
export function checkClaims(claims: Claim[], opts: CheckOpts): string[]
