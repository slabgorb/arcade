// tools/audit/check-citations.d.mts
//
// Story df1-1 — the TYPE CONTRACT for the single-sided Defender citation checker.
// TEA (O'Brien) authors the tests/audit/citations.test.ts suite that pins the
// behaviour; Dev (Julia, GREEN) implements the runtime module
// tools/audit/check-citations.mjs to satisfy it, and later df* stories convert the
// dossier into docs/rom-study/claims/*.json.
//
// It is the companion declaration for a plain-.mjs ESM module, so the strict TS
// project (no allowJs) can import the checker from a .ts test without TS7016 — the
// convention millipede/centipede/tempest use.
//
// SINGLE-SIDED SCHEMA (rom-source-study skill): a claim is an assertion ABOUT the
// 1981 machine, cited to primary source. There is no clone yet, so there is no
// `ours` side — the ours/theirs/class/recommendation machinery tempest carries is
// dropped. A claim is: { id, claim, source, corroboration? }. (The `counts`
// re-derivation machinery is not ported at df1-1 — no claim needs a tally yet; the
// first df* story that needs one re-adds `counts` + its `CountAssertion` type with
// a guarding test.)

/**
 * A single-sided claim: one assertion about the machine, cited to a byte-exact
 * line of the vendored 1981 Williams source.
 */
export interface Claim {
  /** Stable, unique id across the whole claims set (e.g. "TB-001"). */
  id: string
  /** The human-readable assertion this citation supports. */
  claim: string
  /**
   * Primary-source citation into the vendored tree
   * (arcade/reference/original-source/defender). This is RE-OPENED byte-for-byte.
   * Defender is a SINGLE revision (the RED/cocktail parent set), so `file` is a
   * bare filename resolved at the tree root. A file already carrying a path
   * separator is treated as an exact tree-relative path and contained inside the
   * vendored root.
   *
   * Two shapes (millipede's ml2-1 byte shape kept whole in the port; defender's
   * consumer arrives with df6's defend.snd):
   *  - TEXT `{ file, line, verbatim }` — an assembler-source line, re-opened and
   *    `.trimEnd()`-compared. A missing text file is an ERROR.
   *  - BYTE `{ file, offset, bytes }` — a run of whole bytes (0..255) in a
   *    licence-walled binary (vendored locally, never committed), so a byte
   *    citation whose file is ABSENT under the root is SKIPPED, not errored — the
   *    CI-green invariant. When present, every byte re-opens exactly.
   */
  source: { file: string; line: number; verbatim: string } | { file: string; offset: number; bytes: number[] }
  /**
   * Optional secondary corroboration — typically a MAME driver reference
   * (williams.cpp / williams_m.cpp), which lives OUTSIDE the vendored tree and is
   * absent from CI. Its SHAPE is schema-validated; it is never byte-opened (GPL —
   * cited in prose, never copied).
   */
  corroboration?: unknown
}

export interface CheckOpts {
  /**
   * Absolute path to the vendored tree root
   * (arcade/reference/original-source/defender), or `null` to skip every
   * byte-verification and run schema-only. CI lacks the orchestrator's reference/
   * tree — it passes `null` and stays green.
   */
  vendoredRoot: string | null
}

/**
 * Validate a set of claims. Returns one error string per problem; an empty array
 * means every claim is well-formed and (when `vendoredRoot` is provided) every
 * cited line re-opens byte-for-byte.
 */
export function checkClaims(claims: Claim[], opts: CheckOpts): string[]
