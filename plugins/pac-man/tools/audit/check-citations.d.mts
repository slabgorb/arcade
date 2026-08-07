// tools/audit/check-citations.d.mts
//
// Story pm1-2 — the TYPE CONTRACT for pac-man's single-sided citation checker.
// It is the companion declaration for a plain-.mjs ESM module, so the strict TS
// project (no allowJs) can import the checker from a .ts test without TS7016 —
// the convention every sibling uses (missile-command/tools/audit/*.d.mts,
// centipede/tools/audit/check-citations.d.mts).
//
// SINGLE-SIDED SCHEMA (rom-source-study skill): a claim is an assertion ABOUT the
// 1980 arcade machine, cited to a byte-exact line of the vendored Z80 disassembly
// `pacman.asm`. There is no clone yet, so there is no `ours` side. The claim is
// the sibling `{id, source:{file,line,verbatim}}` shape EXTENDED with the decoded
// record: `symbol`, `value`, `meaning`, and `addr` (the hex ROM address that is
// the `pacman.asm:<addr>` citation vocabulary).

/**
 * A single-sided claim: one assertion about the machine, cited to a byte-exact
 * line of the vendored `pacman.asm`.
 */
export interface Claim {
  /** Stable, unique id across the whole claims set (e.g. "SCORE-GHOST1"). */
  id: string
  /** The symbol / label this claim pins (e.g. "SCORE_DOT", "BLINKY", "LIVES_PER_GAME"). */
  symbol: string
  /**
   * The DECODED value — a number for a decodable constant (dot = 10, ghost 1 =
   * 200, after the BCD little-endian ×10 rule) or a descriptive string where the
   * datum is a name or a RAM slot. Re-derived from the verbatim in
   * tests/audit/citations.test.ts; this checker never parses it.
   */
  value: number | string
  /** One-line human meaning, decoded via the Pac-Man Dossier. */
  meaning: string
  /**
   * The hex ROM address (e.g. "2b17"). This is the `pacman.asm:<addr>` vocabulary
   * every later task cites and the dossier-coverage sweep matches against. It is
   * schema-checked (hex) but not itself re-opened — the byte gate is `source`.
   */
  addr: string
  /**
   * Primary-source citation into the vendored tree. RE-OPENED byte-for-byte:
   * `file` resolves inside the source dir (root-first; the tree holds the single
   * `pacman.asm`), and `verbatim` must equal that physical line under trimEnd().
   */
  source: { file: string; line: number; verbatim: string }
  /**
   * Optional decode marker. `"bcd-x10-word"` tags a scoring-table entry whose
   * `value` must equal the BCD, little-endian, ×10 decode of the two data bytes
   * in `verbatim` — checked in citations.test.ts, never by this dumb checker.
   */
  decode?: 'bcd-x10-word'
}

export interface CheckOpts {
  /**
   * Absolute path to the vendored source dir (the one holding pacman.asm), or
   * `null` to skip every byte-verification and run schema-only.
   */
  vendoredRoot: string | null
}

/**
 * Validate a set of claims. Returns one error string per problem; an empty array
 * means every claim is well-formed and (when `vendoredRoot` is provided) every
 * cited line re-opens byte-for-byte.
 */
export function checkClaims(claims: Claim[], opts: CheckOpts): string[]
