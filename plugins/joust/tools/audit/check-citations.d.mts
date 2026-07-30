// tools/audit/check-citations.d.mts
//
// Story jt1-2 — the TYPE CONTRACT for the single-sided citation checker.
// O'Brien (TEA) authors this declaration and the tests/audit/citations.test.ts
// suite that pins the behaviour; Julia (Dev, GREEN) implements the runtime
// module tools/audit/check-citations.mjs to satisfy it and converts the dossier
// into docs/rom-study/claims/*.json.
//
// It is the companion declaration for a plain-.mjs ESM module, so the strict TS
// project (no allowJs) can import the checker from a .ts test without TS7016 —
// the convention tempest and centipede both use.
//
// SINGLE-SIDED SCHEMA (rom-source-study skill): a claim is an assertion ABOUT
// the 1982 machine, cited to primary source. There is no clone yet, so there is
// no `ours` side — the ours/theirs/class/recommendation machinery tempest
// carries is deliberately dropped. A claim is: { id, claim, source,
// corroboration? }.
//
// ─── WHAT JOUST CHANGES vs THE CENTIPEDE PORT ────────────────────────────────
//  1. FLAT TREE. The Williams source vendors as one flat directory — all four
//     program revisions are sibling FILES (JOUSTRV1.SRC … JOUSTRV4.SRC), not
//     subdirectories. So centipede's REVISION_SUBDIRS search order ('' then
//     'revision.v4/') collapses to a single root lookup. A citation names the
//     revision by naming the file.
//  2. EXTERNAL CITATIONS ARE FIRST-CLASS. Centipede put MAME in the optional
//     `corroboration` field; joust's dossier cites the MAME williams driver
//     directly as a *source* for board-level facts the 1982 source never states
//     (raster geometry, the shipped label sets). MAME is a machine-local sparse
//     clone that neither CI nor the vendored tree contains, so those claims are
//     schema-validated and never byte-opened.
//  3. RADIX IS LOAD-BEARING. Motorola syntax: bare DECIMAL, `$` hex, `@` OCTAL
//     (every palette byte and image row), `%` binary, and the `!X` operator
//     (`$1107!XDMAFIX`). `verbatim` is COMPARED, never PARSED — see below.

/**
 * A single-sided claim: one assertion about the machine, cited to a byte-exact
 * line of the vendored 1982 Williams source (or, for `.cpp` sources, to the
 * MAME driver — schema-checked only).
 */
export interface Claim {
  /** Stable, unique id across the whole claims set (e.g. "TB-001"). */
  id: string
  /** The human-readable assertion this citation supports. */
  claim: string
  /**
   * Primary-source citation into the vendored tree
   * (arcade/reference/williams-source/joust). RE-OPENED byte-for-byte.
   *
   * `file` is a bare filename resolved directly against the tree root (the
   * Williams tree is flat). A `file` carrying a path separator is treated as an
   * exact tree-relative path and must stay INSIDE the tree after normalisation.
   *
   * A `file` ending `.cpp` is an EXTERNAL secondary citation (the MAME williams
   * driver, machine-local). Its shape is validated exactly like any other
   * source, but it is never resolved and never byte-opened — so it must not be
   * reported as "missing from the vendored tree".
   *
   * `verbatim` is matched against the cited line with `trimEnd()` on both sides
   * and NOTHING ELSE. No radix evaluation, no numeric normalisation, no
   * whitespace collapsing, no case folding. `@000` stays the three-digit octal
   * literal `@000`; it never becomes `0`, `@0`, or `255`. Leading whitespace and
   * internal tabs are significant; only trailing whitespace is forgiven.
   */
  source: { file: string; line: number; verbatim: string }
  /**
   * Optional secondary corroboration. Its SHAPE is schema-validated; it is
   * never byte-opened.
   */
  corroboration?: unknown
}

export interface CheckOpts {
  /**
   * Absolute path to the vendored tree root
   * (arcade/reference/williams-source/joust), or `null` to skip every
   * byte-verification and run schema-only. CI clones only the joust subrepo and
   * therefore lacks the orchestrator's reference/ tree — it passes `null` and
   * stays green (AC-3).
   */
  vendoredRoot: string | null
}

/**
 * Validate a set of claims. Returns one error string per problem; an empty
 * array means every claim is well-formed and (when `vendoredRoot` is provided)
 * every non-external cited line re-opens byte-for-byte.
 *
 * Every problem is REPORTED, never thrown: a checker that bailed on the first
 * bad claim would turn the dossier conversion into a one-error-at-a-time grind.
 */
export function checkClaims(claims: Claim[], opts: CheckOpts): string[]

// ─── CLI CONTRACT ────────────────────────────────────────────────────────────
// `node tools/audit/check-citations.mjs` loads every docs/rom-study/claims/
// *.json, checks them, prints one line per error, and exits non-zero if any
// failed (AC-1). With the vendored tree absent it says so and runs schema-only,
// exiting 0 on well-formed claims (AC-3).
//
// Two environment overrides, both exercised by tests/audit/citations.test.ts:
//   JOUST_SOURCE_DIR  — vendored tree root, default ../../reference/williams-source/joust
//   JOUST_CLAIMS_DIR  — claims directory,   default docs/rom-study/claims
//
// JOUST_CLAIMS_DIR is what lets the suite prove the non-zero exit against a
// throwaway broken claims set without touching the committed ones. Without it
// the CLI's failure path is untestable — which is how "exits non-zero" stays a
// sentence in a story instead of becoming a property of the program.
