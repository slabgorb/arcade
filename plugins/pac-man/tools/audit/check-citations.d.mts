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
 * A TEXT citation into the vendored disassembly. RE-OPENED byte-for-byte: `file`
 * resolves inside the source dir (root-first; the tree holds the single
 * `pacman.asm`), and `verbatim` must equal that physical line under trimEnd().
 */
export interface TextCitation {
  file: string
  line: number
  verbatim: string
}

/**
 * A BINARY citation into a vendored PROM (pm2-1). `file` resolves inside the
 * SOUND dir (`reference/sound/`), `offset` is a byte position, and `nibbles` is
 * the run of expected 4-bit values (0–15). RE-VERIFIED byte-for-byte: the LOW
 * nibble of each byte at `offset`+i must equal `nibbles[i]`, matching how MAME
 * reads the Namco WSG waveform PROM (`namco.cpp:241`).
 */
export interface BinaryCitation {
  file: string
  offset: number
  nibbles: number[]
}

/**
 * A full-BYTE citation into a vendored graphics ROM/PROM (pm3-1). `file`
 * resolves inside the GRAPHICS dir (`reference/graphics/`), `offset` is a byte
 * position, and `bytes` is the run of expected whole-byte values (0–255).
 * RE-VERIFIED byte-for-byte: unlike BinaryCitation's low-nibble compare (the
 * WSG waveform PROM), the tile/sprite ROMs and colour PROMs are decoded WHOLE
 * (MAME gfxlayout / resistor-DAC), so the full byte must match.
 */
export interface ByteCitation {
  file: string
  offset: number
  bytes: number[]
}

/**
 * A single-sided claim: one assertion about the machine, cited to either a
 * byte-exact line of the vendored `pacman.asm` (a TextCitation), a nibble range
 * of a vendored PROM (a BinaryCitation, pm2-1's WSG waveforms), or a full-byte
 * range of a vendored graphics ROM/PROM (a ByteCitation, pm3-1's tile/sprite
 * ROMs and colour PROMs).
 */
export interface Claim {
  /** Stable, unique id across the whole claims set (e.g. "SCORE-GHOST1"). */
  id: string
  /** The symbol / label this claim pins (e.g. "SCORE_DOT", "BLINKY", "WSG_WAVEFORM_0"). */
  symbol: string
  /**
   * The DECODED value — a number for a decodable constant (dot = 10, ghost 1 =
   * 200, after the BCD little-endian ×10 rule) or a descriptive string where the
   * datum is a name, a RAM slot, or a waveform shape. Re-derived from the
   * verbatim in tests/audit/citations.test.ts; this checker never parses it.
   */
  value: number | string
  /** One-line human meaning, decoded via the Pac-Man Dossier / MAME. */
  meaning: string
  /**
   * The hex ROM address (e.g. "2b17"), or for a PROM waveform its PROM byte
   * offset in hex (e.g. "0020"). The `pacman.asm:<addr>` vocabulary the
   * dossier-coverage sweep matches against. Schema-checked (hex) but not itself
   * re-opened — the byte gate is `source`.
   */
  addr: string
  /**
   * Primary-source citation — a text line of `pacman.asm`, a PROM nibble range,
   * or a graphics ROM/PROM full-byte range.
   */
  source: TextCitation | BinaryCitation | ByteCitation
  /**
   * Optional decode marker. `"bcd-x10-word"` tags a scoring-table entry whose
   * `value` must equal the BCD, little-endian, ×10 decode of the two data bytes
   * in `verbatim` — checked in citations.test.ts, never by this dumb checker.
   */
  decode?: 'bcd-x10-word'
  /** Waveform index 0–7 (WSG waveform claims only). */
  waveform?: number
  /** The 32 decoded signed samples `(nibble-8)` of a waveform (WSG claims only). */
  samples?: number[]
}

export interface CheckOpts {
  /**
   * Absolute path to the vendored source dir (the one holding pacman.asm), or
   * `null` to skip TEXT byte-verification and run those schema-only.
   */
  vendoredRoot: string | null
  /**
   * Absolute path to the vendored sound dir (the one holding the WSG PROM
   * `82s126.1m`), or `null`/absent to skip PROM byte-verification (binary claims
   * schema-validate; the nibble compare is skipped).
   */
  soundRoot?: string | null
  /**
   * Absolute path to the vendored graphics dir (the tile/sprite ROMs and the two
   * colour PROMs, pm3-1), or `null`/absent to skip full-byte verification (byte
   * claims schema-validate; the byte compare is skipped).
   */
  gfxRoot?: string | null
}

/**
 * Validate a set of claims. Returns one error string per problem; an empty array
 * means every claim is well-formed and (when `vendoredRoot` is provided) every
 * cited line re-opens byte-for-byte.
 */
export function checkClaims(claims: Claim[], opts: CheckOpts): string[]
